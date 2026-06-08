"""
시연용 디버그 엔드포인트

스케줄러 없이 Gemini 알림을 즉시 트리거하고,
메시지 생성에 사용된 컨텍스트 데이터를 함께 반환한다.
"""
from datetime import datetime, timedelta
from typing import Any, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.health import DailyHealthMetrics
from app.models.notification import PushToken
from app.models.sleep import SleepRecord
from app.models.user import User, UserInBody
from app.models.workout import SessionStatus, WorkoutPlan, WorkoutSession
from app.services.fcm_service import fcm_service
from app.services.gemini_service import gemini_service

router = APIRouter(prefix="/debug", tags=["Debug"])


class TriggerRequest(BaseModel):
    type: Literal["pre", "post", "morning"]


class TriggerResponse(BaseModel):
    type: str
    gemini_message: str
    context: dict[str, Any]
    fcm_sent: bool
    fcm_token_count: int


@router.post("/notifications/trigger", response_model=TriggerResponse)
async def trigger_debug_notification(
    body: TriggerRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gemini 알림을 즉시 생성·발송하고 사용된 컨텍스트를 반환한다."""
    now = datetime.now()
    today = now.date()
    today_dow = now.weekday()
    today_start = datetime.combine(today, datetime.min.time())
    yesterday_start = today_start - timedelta(days=1)

    # 수면
    sleep_result = await db.execute(
        select(func.sum(SleepRecord.duration_minutes)).where(
            SleepRecord.user_id == current_user.id,
            SleepRecord.sleep_start >= yesterday_start,
            SleepRecord.sleep_start < today_start,
        )
    )
    sleep_minutes = sleep_result.scalar()
    sleep_hours = round(sleep_minutes / 60, 1) if sleep_minutes else None

    # 헬스 지표
    health_result = await db.execute(
        select(DailyHealthMetrics)
        .where(DailyHealthMetrics.user_id == current_user.id, DailyHealthMetrics.date == today)
        .order_by(DailyHealthMetrics.id.desc())
        .limit(1)
    )
    health = health_result.scalar_one_or_none()

    # 인바디
    inbody_result = await db.execute(
        select(UserInBody)
        .where(UserInBody.user_id == current_user.id)
        .order_by(UserInBody.measured_at.desc())
        .limit(1)
    )
    inbody = inbody_result.scalar_one_or_none()

    # 오늘 루틴
    plan_result = await db.execute(
        select(WorkoutPlan)
        .where(WorkoutPlan.user_id == current_user.id, WorkoutPlan.day_of_week == today_dow)
    )
    plan = plan_result.scalar_one_or_none()

    # 최근 완료 세션 (post용)
    last_session_result = await db.execute(
        select(WorkoutSession)
        .where(
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.status == SessionStatus.COMPLETED,
        )
        .order_by(WorkoutSession.ended_at.desc())
        .limit(1)
    )
    last_session = last_session_result.scalar_one_or_none()

    is_rest_day = bool(plan and plan.is_rest_day)

    # 공통 컨텍스트
    context: dict[str, Any] = {
        "닉네임": current_user.nickname,
        "운동수준": current_user.fitness_level.value,
        "휴식일": is_rest_day,
        "수면": f"{sleep_hours}시간" if sleep_hours is not None else "데이터 없음",
        "걸음수": f"{health.steps:,}보" if health and health.steps else "데이터 없음",
        "안정_심박수": f"{health.resting_heart_rate_bpm:.0f}bpm" if health and health.resting_heart_rate_bpm else "데이터 없음",
        "체지방률": f"{inbody.body_fat_percent:.1f}%" if inbody and inbody.body_fat_percent else "데이터 없음",
        "근육량": f"{inbody.muscle_mass_kg:.1f}kg" if inbody and inbody.muscle_mass_kg else "데이터 없음",
        "오늘_루틴": plan.name if plan and not is_rest_day else ("휴식일" if is_rest_day else "없음"),
    }

    # 타입별 Gemini 호출
    if body.type == "morning":
        message = await gemini_service.morning_care_message(
            nickname=current_user.nickname,
            character_emoji=current_user.character_emoji,
            sleep_hours=sleep_hours,
        )
        title = f"좋은 아침이에요 {current_user.character_emoji}"
        fcm_type = "morning_care"

    elif body.type == "pre":
        message = await gemini_service.pre_workout_message(
            nickname=current_user.nickname,
            character_emoji=current_user.character_emoji,
            fitness_level=current_user.fitness_level.value,
            is_rest_day=is_rest_day,
            plan_name=plan.name if plan and not is_rest_day else None,
            sleep_hours=sleep_hours,
            steps=health.steps if health else None,
            resting_hr=health.resting_heart_rate_bpm if health else None,
            body_fat_percent=inbody.body_fat_percent if inbody else None,
            muscle_mass_kg=inbody.muscle_mass_kg if inbody else None,
        )
        title = f"곧 운동 시간이에요! {current_user.character_emoji}"
        fcm_type = "preworkout_care"

    else:  # post
        duration_min = (last_session.total_duration_sec or 0) // 60 if last_session else 0
        completed_parts = (
            last_session.completed_parts.split(",")
            if last_session and last_session.completed_parts
            else None
        )
        message = await gemini_service.post_workout_message(
            nickname=current_user.nickname,
            character_emoji=current_user.character_emoji,
            duration_min=duration_min,
            total_volume_kg=last_session.total_volume_kg if last_session else None,
            xp_earned=last_session.xp_earned if last_session else 0,
            completed_sets=0,
            completed_parts=completed_parts,
            muscle_mass_kg=inbody.muscle_mass_kg if inbody else None,
        )
        title = "회복도 운동이에요 💆"
        fcm_type = "aftercare_reminder"
        if last_session:
            context["마지막_운동_시간"] = f"{duration_min}분"
            context["마지막_볼륨"] = (
                f"{last_session.total_volume_kg:.1f}kg"
                if last_session.total_volume_kg
                else "없음"
            )
            context["완료_부위"] = ", ".join(completed_parts) if completed_parts else "없음"

    # FCM 발송
    token_result = await db.execute(
        select(PushToken).where(
            PushToken.user_id == current_user.id, PushToken.is_active == True
        )
    )
    tokens = token_result.scalars().all()

    fcm_sent = False
    for token in tokens:
        try:
            await fcm_service.send(
                token=token.token, title=title, body=message, data={"type": fcm_type}
            )
            fcm_sent = True
        except Exception:
            pass

    return TriggerResponse(
        type=body.type,
        gemini_message=message,
        context=context,
        fcm_sent=fcm_sent,
        fcm_token_count=len(tokens),
    )
