from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User, UserInBody
from app.models.health import DailyHealthMetrics
from app.models.sleep import SleepRecord
from app.models.workout import (
    Exercise, WorkoutPlan, WorkoutPlanExercise,
    WorkoutSession, WorkoutSet, SessionStatus,
)
from app.schemas.workout import (
    ExerciseResponse,
    WorkoutPlanCreate, WorkoutPlanUpdate, WorkoutPlanResponse,
    SessionStartRequest, SessionCompleteRequest, SessionUpdatePartsRequest,
    WorkoutSessionResponse, WorkoutSessionSummary,
    PreWorkoutMessageResponse, CareMessageResponse,
)
from app.services.gemini_service import gemini_service
from app.services.weather_service import weather_service
from app.services.badge_service import check_and_award_badges

router = APIRouter(prefix="/workouts", tags=["Workouts"])


# ── Exercise Master ────────────────────────────────────────────────────────────

@router.get("/exercises", response_model=list[ExerciseResponse])
async def list_exercises(
    muscle_group: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = select(Exercise).where(Exercise.is_active == True)
    if muscle_group:
        query = query.where(Exercise.muscle_group == muscle_group)
    result = await db.execute(query.order_by(Exercise.name))
    return result.scalars().all()


# ── Weekly Plan ────────────────────────────────────────────────────────────────

@router.get("/plans", response_model=list[WorkoutPlanResponse])
async def get_my_plans(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WorkoutPlan)
        .where(WorkoutPlan.user_id == current_user.id)
        .options(
            selectinload(WorkoutPlan.plan_exercises).selectinload(WorkoutPlanExercise.exercise)
        )
        .order_by(WorkoutPlan.day_of_week)
    )
    return result.scalars().all()


@router.post("/plans", response_model=WorkoutPlanResponse, status_code=201)
async def create_plan(
    body: WorkoutPlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = WorkoutPlan(
        user_id=current_user.id,
        day_of_week=body.day_of_week,
        name=body.name,
        is_rest_day=body.is_rest_day,
        planned_time=body.planned_time,
    )
    db.add(plan)
    await db.flush()

    for ex in body.exercises:
        db.add(WorkoutPlanExercise(plan_id=plan.id, **ex.model_dump()))

    await db.commit()
    await db.refresh(plan)
    await db.refresh(plan, attribute_names=["plan_exercises"])
    return plan


@router.patch("/plans/{plan_id}", response_model=WorkoutPlanResponse)
async def update_plan(
    plan_id: int,
    body: WorkoutPlanUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WorkoutPlan)
        .where(WorkoutPlan.id == plan_id, WorkoutPlan.user_id == current_user.id)
        .options(selectinload(WorkoutPlan.plan_exercises))
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="운동 플랜을 찾을 수 없어요")

    if body.name is not None:
        plan.name = body.name
    if body.is_rest_day is not None:
        plan.is_rest_day = body.is_rest_day
    if "planned_time" in body.model_fields_set:
        plan.planned_time = body.planned_time

    if body.exercises is not None:
        # 기존 운동 목록 교체
        for pe in plan.plan_exercises:
            await db.delete(pe)
        await db.flush()
        for ex in body.exercises:
            db.add(WorkoutPlanExercise(plan_id=plan.id, **ex.model_dump()))

    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    await db.refresh(plan, attribute_names=["plan_exercises"])
    return plan


@router.delete("/plans/{plan_id}", status_code=204)
async def delete_plan(
    plan_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WorkoutPlan).where(WorkoutPlan.id == plan_id, WorkoutPlan.user_id == current_user.id)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="운동 플랜을 찾을 수 없어요")
    await db.delete(plan)


# ── Session ────────────────────────────────────────────────────────────────────

@router.post("/sessions/start", response_model=WorkoutSessionResponse, status_code=201)
async def start_session(
    body: SessionStartRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = WorkoutSession(
        user_id=current_user.id,
        plan_id=body.plan_id,
        started_at=body.started_at or datetime.now(),
        status=SessionStatus.IN_PROGRESS,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    await db.refresh(session, attribute_names=["sets"])
    return session


@router.post("/sessions/{session_id}/complete", response_model=WorkoutSessionResponse)
async def complete_session(
    session_id: int,
    body: SessionCompleteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WorkoutSession)
        .where(
            WorkoutSession.id == session_id,
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.status == SessionStatus.IN_PROGRESS,
        )
        .options(selectinload(WorkoutSession.sets).selectinload(WorkoutSet.exercise))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="진행 중인 운동 세션이 없어요")

    now = datetime.now()
    session.ended_at = now
    session.status = SessionStatus.COMPLETED
    session.total_duration_sec = int((now - session.started_at).total_seconds())
    session.voice_memo = body.voice_memo
    session.calories_burned = body.calories_burned

    total_volume = 0.0
    for s in body.sets:
        ws = WorkoutSet(
            session_id=session.id,
            exercise_id=s.exercise_id,
            set_number=s.set_number,
            reps=s.reps,
            weight_kg=s.weight_kg,
            duration_sec=s.duration_sec,
            is_completed=s.is_completed,
            completed_at=now if s.is_completed else None,
        )
        db.add(ws)
        if s.reps and s.weight_kg:
            total_volume += s.reps * s.weight_kg

    session.total_volume_kg = total_volume or None
    session.completed_parts = ",".join(body.completed_parts) if body.completed_parts else None

    # XP: 완료 세트 × 10 + 완료 부위 × 10 + 기본 50
    completed_sets = sum(1 for s in body.sets if s.is_completed)
    xp = 50 + completed_sets * 10 + len(body.completed_parts) * 10
    session.xp_earned = xp
    current_user.character_xp += xp
    current_user.character_level = 1 + current_user.character_xp // 500

    duration_min = (session.total_duration_sec or 0) // 60

    inbody_result = await db.execute(
        select(UserInBody)
        .where(UserInBody.user_id == current_user.id)
        .order_by(UserInBody.measured_at.desc())
        .limit(1)
    )
    inbody = inbody_result.scalar_one_or_none()

    session.ai_feedback = await gemini_service.post_workout_message(
        nickname=current_user.nickname,
        character_emoji=current_user.character_emoji,
        duration_min=duration_min,
        total_volume_kg=session.total_volume_kg,
        xp_earned=xp,
        completed_sets=completed_sets,
        completed_parts=body.completed_parts or None,
        muscle_mass_kg=inbody.muscle_mass_kg if inbody else None,
    )

    db.add(session)
    db.add(current_user)
    await db.flush()

    # 뱃지 달성 조건 판별 (XP 업데이트 후)
    await check_and_award_badges(current_user, db)

    await db.refresh(session, ["sets"])
    return session


@router.get("/sessions", response_model=list[WorkoutSessionSummary])
async def get_session_history(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WorkoutSession)
        .where(WorkoutSession.user_id == current_user.id)
        .order_by(desc(WorkoutSession.started_at))
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/sessions/{session_id}", response_model=WorkoutSessionResponse)
async def get_session_detail(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WorkoutSession)
        .where(WorkoutSession.id == session_id, WorkoutSession.user_id == current_user.id)
        .options(selectinload(WorkoutSession.sets).selectinload(WorkoutSet.exercise))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="운동 세션을 찾을 수 없어요")
    return session


@router.patch("/sessions/{session_id}/parts", response_model=WorkoutSessionResponse)
async def update_session_parts(
    session_id: int,
    body: SessionUpdatePartsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """운동 완료 수정 — 부위 변경분만큼 XP 조정 (기본 XP 추가 없음)."""
    result = await db.execute(
        select(WorkoutSession)
        .where(
            WorkoutSession.id == session_id,
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.status == SessionStatus.COMPLETED,
        )
        .options(selectinload(WorkoutSession.sets))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="운동 세션을 찾을 수 없어요")

    old_parts = set(session.completed_parts.split(",")) if session.completed_parts else set()
    new_parts = set(body.completed_parts)
    added = new_parts - old_parts
    removed = old_parts - new_parts
    xp_delta = len(added) * 10 - len(removed) * 10

    session.completed_parts = ",".join(body.completed_parts) if body.completed_parts else None
    session.xp_earned = max(0, session.xp_earned + xp_delta)
    current_user.character_xp = max(0, current_user.character_xp + xp_delta)
    current_user.character_level = 1 + current_user.character_xp // 500

    if body.completed_parts:
        inbody_result = await db.execute(
            select(UserInBody)
            .where(UserInBody.user_id == current_user.id)
            .order_by(UserInBody.measured_at.desc())
            .limit(1)
        )
        inbody = inbody_result.scalar_one_or_none()
        duration_min = (session.total_duration_sec or 0) // 60
        completed_sets = sum(1 for s in session.sets if s.is_completed)
        session.ai_feedback = await gemini_service.post_workout_message(
            nickname=current_user.nickname,
            character_emoji=current_user.character_emoji,
            duration_min=duration_min,
            total_volume_kg=session.total_volume_kg,
            xp_earned=session.xp_earned,
            completed_sets=completed_sets,
            completed_parts=body.completed_parts,
            muscle_mass_kg=inbody.muscle_mass_kg if inbody else None,
        )

    db.add(session)
    db.add(current_user)
    await db.commit()
    await db.refresh(session, ["sets"])
    return session


# ── AI Pre-Workout Message ─────────────────────────────────────────────────────

@router.get("/pre-message", response_model=PreWorkoutMessageResponse)
async def get_pre_workout_message(
    lat: float | None = None,
    lon: float | None = None,
    city: str | None = None,
    dow: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """홈 화면 컨디션 스냅샷 — 날씨 + 오늘 루틴명만 반환. Gemini 호출 없음."""
    today = date.today()
    today_dow = dow if dow is not None else today.weekday()  # 클라이언트 로컬 요일 우선

    # 오늘 루틴 조회
    plan_result = await db.execute(
        select(WorkoutPlan)
        .where(WorkoutPlan.user_id == current_user.id, WorkoutPlan.day_of_week == today_dow)
    )
    plan = plan_result.scalar_one_or_none()
    plan_name = plan.name if plan else None

    # 날씨
    weather_info = await weather_service.get_weather(city=city, lat=lat, lon=lon)

    return PreWorkoutMessageResponse(
        plan_name=plan_name,
        weather_main=(
            f"{weather_info.city} {weather_info.temp_c}°C (체감 {weather_info.feels_like_c}°C)"
            if weather_info else None
        ),
        weather_sub=(
            f"{weather_info.description} · 습도 {weather_info.humidity}%"
            if weather_info else None
        ),
        is_outdoor_ok=weather_info.is_outdoor_ok if weather_info else None,
    )


@router.get("/care-message", response_model=CareMessageResponse)
async def get_care_message(
    dow: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """운동 탭 on-demand Gemini 케어 메시지. FCM 캐시 없을 때 앱에서 직접 호출."""
    now = datetime.now()
    today = now.date()
    today_dow = dow if dow is not None else now.weekday()
    today_start = datetime.combine(today, datetime.min.time())
    yesterday_start = today_start - timedelta(days=1)

    plan_result = await db.execute(
        select(WorkoutPlan).where(
            WorkoutPlan.user_id == current_user.id,
            WorkoutPlan.day_of_week == today_dow,
        )
    )
    plan = plan_result.scalar_one_or_none()

    sleep_result = await db.execute(
        select(func.sum(SleepRecord.duration_minutes)).where(
            SleepRecord.user_id == current_user.id,
            SleepRecord.sleep_start >= yesterday_start,
            SleepRecord.sleep_start < today_start,
        )
    )
    sleep_minutes = sleep_result.scalar()
    sleep_hours = round(sleep_minutes / 60, 1) if sleep_minutes else None

    health_result = await db.execute(
        select(DailyHealthMetrics)
        .where(DailyHealthMetrics.user_id == current_user.id, DailyHealthMetrics.date == today)
        .order_by(DailyHealthMetrics.id.desc())
        .limit(1)
    )
    health = health_result.scalar_one_or_none()

    inbody_result = await db.execute(
        select(UserInBody)
        .where(UserInBody.user_id == current_user.id)
        .order_by(UserInBody.measured_at.desc())
        .limit(1)
    )
    inbody = inbody_result.scalar_one_or_none()

    is_rest_day = bool(plan and plan.is_rest_day)
    message = await gemini_service.pre_workout_message(
        nickname=current_user.nickname,
        character_emoji=current_user.character_emoji,
        fitness_level=current_user.fitness_level.value,
        is_rest_day=is_rest_day,
        plan_name=plan.name if plan and not is_rest_day else None,
        sleep_hours=sleep_hours,
        steps=health.steps if health else None,
        resting_hr=health.resting_heart_rate_bpm if health else None,
        weather_desc=None,
        body_fat_percent=inbody.body_fat_percent if inbody else None,
        muscle_mass_kg=inbody.muscle_mass_kg if inbody else None,
    )
    return CareMessageResponse(message=message)
