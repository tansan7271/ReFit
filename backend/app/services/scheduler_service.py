"""
APScheduler 기반 스마트 알림 스케줄러

시간 기반 (매분):
  - sleep_goal_wakeup + 30분 = 현재 KST인 유저에게 아침 케어 팁 FCM 발송
  - WorkoutPlan.planned_time - 30분 = 현재 KST인 유저에게 운동 전 케어 팁 FCM 발송
  - sleep_reminder_time(HH:MM KST)과 현재 시각이 일치하는 유저에게 수면 준비 알림 발송

조건 기반 (매일 09:00 KST):
  - 최근 3일 운동 기록 없는 유저에게 동기부여 알림 발송 (workout_reminder=True 인 유저만)
"""
import logging
from datetime import date, datetime, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.models.notification import NotificationSetting, PushToken
from app.models.workout import WorkoutSession, WorkoutSet, SessionStatus, WorkoutPlan
from app.models.sleep import SleepRecord
from app.models.health import DailyHealthMetrics
from app.models.user import User, UserInBody
from app.services.fcm_service import fcm_service
from app.services.gemini_service import gemini_service

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None
_session_factory: async_sessionmaker | None = None


def _get_session_factory() -> async_sessionmaker:
    global _session_factory
    if _session_factory is None:
        from app.core.config import settings
        engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_pre_ping=True)
        _session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    return _session_factory


def _calculate_fatigue(session: WorkoutSession) -> float:
    """피로도 점수 계산. 5.0 이상이면 고강도로 판정."""
    volume_score = (session.total_volume_kg or 0) / 50
    duration_score = ((session.total_duration_sec or 0) / 60) / 20
    return volume_score + duration_score


async def _send_morning_care() -> None:
    """매분 실행 — sleep_goal_wakeup + 30분 = 현재 UTC인 유저에게 아침 케어 팁 FCM 발송.

    수면 데이터를 기반으로 Gemini가 가벼운 아침 컨디션 메시지를 생성한다.
    """
    now = datetime.now()
    # 기상 시각 = 지금 - 30분 → sleep_goal_wakeup과 비교 (KST)
    wakeup_hhmm = (now - timedelta(minutes=30)).strftime("%H:%M")
    today_start = datetime.combine(now.date(), datetime.min.time())
    yesterday_start = today_start - timedelta(days=1)

    work_items: list[tuple[str, User, float | None]] = []

    async with _get_session_factory()() as db:
        result = await db.execute(
            select(PushToken, User)
            .join(User, User.id == PushToken.user_id)
            .join(NotificationSetting, NotificationSetting.user_id == User.id)
            .where(
                NotificationSetting.workout_reminder == True,
                User.sleep_goal_wakeup == wakeup_hhmm,
                PushToken.is_active == True,
            )
        )
        rows = result.all()

        for token, user in rows:
            sleep_result = await db.execute(
                select(func.sum(SleepRecord.duration_minutes)).where(
                    SleepRecord.user_id == user.id,
                    SleepRecord.sleep_start >= yesterday_start,
                    SleepRecord.sleep_start < today_start,
                )
            )
            sleep_minutes = sleep_result.scalar()
            sleep_hours = round(sleep_minutes / 60, 1) if sleep_minutes else None
            work_items.append((token.token, user, sleep_hours))

    for token_str, user, sleep_hours in work_items:
        body = await gemini_service.morning_care_message(
            nickname=user.nickname,
            character_emoji=user.character_emoji,
            sleep_hours=sleep_hours,
        )
        await fcm_service.send(
            token=token_str,
            title=f"좋은 아침이에요 {user.character_emoji}",
            body=body,
            data={"type": "morning_care"},
        )

    if work_items:
        logger.info("[Scheduler] morning_care 발송: %d건", len(work_items))


async def _send_preworkout_care() -> None:
    """매분 실행 — WorkoutPlan.planned_time - 30분 = 현재 UTC인 유저에게 운동 전 케어 팁 발송.

    오늘 날짜 요일과 일치하는 플랜의 planned_time - 30분이 현재 시각인 유저를 찾아
    헬스 데이터(걸음수·심박수) + 수면 데이터 기반 Gemini 운동 강도 추천 메시지를 발송.
    고강도 운동 직후(24h 내)면 회복 알림으로 대체.
    """
    now = datetime.now()
    # 운동 예정 시각 = 지금 + 30분 → planned_time과 비교 (KST, DB 저장값과 동일)
    planned_hhmm = (now + timedelta(minutes=30)).strftime("%H:%M")
    today_dow = now.weekday()  # KST 기준 요일
    yesterday_dt = now - timedelta(hours=24)
    today = now.date()
    today_start = datetime.combine(today, datetime.min.time())
    yesterday_start = today_start - timedelta(days=1)

    work_items: list[tuple[str, User, bool, dict | None]] = []

    async with _get_session_factory()() as db:
        result = await db.execute(
            select(PushToken, User, WorkoutPlan)
            .join(User, User.id == PushToken.user_id)
            .join(NotificationSetting, NotificationSetting.user_id == User.id)
            .join(WorkoutPlan, (WorkoutPlan.user_id == User.id) & (WorkoutPlan.day_of_week == today_dow))
            .where(
                NotificationSetting.workout_reminder == True,
                WorkoutPlan.planned_time == planned_hhmm,
                WorkoutPlan.is_rest_day == False,
                PushToken.is_active == True,
            )
        )
        rows = result.all()

        for token, user, plan in rows:
            # 고강도 운동 여부
            last_result = await db.execute(
                select(WorkoutSession)
                .where(
                    WorkoutSession.user_id == user.id,
                    WorkoutSession.status == SessionStatus.COMPLETED,
                    WorkoutSession.ended_at >= yesterday_dt,
                )
                .order_by(WorkoutSession.ended_at.desc())
                .limit(1)
            )
            last_session = last_result.scalar_one_or_none()
            if last_session and _calculate_fatigue(last_session) >= 5.0:
                work_items.append((token.token, user, True, None))
                continue

            # 수면
            sleep_result = await db.execute(
                select(func.sum(SleepRecord.duration_minutes)).where(
                    SleepRecord.user_id == user.id,
                    SleepRecord.sleep_start >= yesterday_start,
                    SleepRecord.sleep_start < today_start,
                )
            )
            sleep_minutes = sleep_result.scalar()
            sleep_hours = round(sleep_minutes / 60, 1) if sleep_minutes else None

            # 헬스 지표
            health_result = await db.execute(
                select(DailyHealthMetrics)
                .where(DailyHealthMetrics.user_id == user.id, DailyHealthMetrics.date == today)
                .order_by(DailyHealthMetrics.id.desc())
                .limit(1)
            )
            health = health_result.scalar_one_or_none()

            # 최신 인바디 체성분
            inbody_result = await db.execute(
                select(UserInBody)
                .where(UserInBody.user_id == user.id)
                .order_by(UserInBody.measured_at.desc())
                .limit(1)
            )
            inbody = inbody_result.scalar_one_or_none()

            work_items.append((token.token, user, False, {
                "plan_name": plan.name,
                "sleep_hours": sleep_hours,
                "steps": health.steps if health else None,
                "resting_hr": health.resting_heart_rate_bpm if health else None,
                "body_fat_percent": inbody.body_fat_percent if inbody else None,
                "muscle_mass_kg": inbody.muscle_mass_kg if inbody else None,
            }))

    for token_str, user, is_recovery, ai_ctx in work_items:
        if is_recovery:
            await fcm_service.send(
                token=token_str,
                title="오늘은 가볍게 회복하는 날이에요 💆",
                body="어제 열심히 운동했어요! 오늘은 스트레칭이나 가벼운 유산소로 근육을 풀어주세요.",
                data={"type": "recovery_reminder"},
            )
        else:
            body = await gemini_service.pre_workout_message(
                nickname=user.nickname,
                character_emoji=user.character_emoji,
                fitness_level=user.fitness_level.value,
                weather_desc=None,
                **ai_ctx,
            )
            await fcm_service.send(
                token=token_str,
                title=f"곧 운동 시간이에요! {user.character_emoji}",
                body=body,
                data={"type": "preworkout_care"},
            )

    if work_items:
        logger.info("[Scheduler] preworkout_care 발송: %d건", len(work_items))


async def _send_sleep_reminders() -> None:
    """매분 실행 — sleep_reminder_time이 현재 KST 시각(HH:MM)인 유저에게 FCM 발송."""
    current_hhmm = datetime.now().strftime("%H:%M")
    async with _get_session_factory()() as db:
        result = await db.execute(
            select(NotificationSetting, PushToken)
            .join(PushToken, PushToken.user_id == NotificationSetting.user_id)
            .where(
                NotificationSetting.sleep_reminder == True,
                NotificationSetting.sleep_reminder_time == current_hhmm,
                PushToken.is_active == True,
            )
        )
        rows = result.all()

    for _setting, token in rows:
        await fcm_service.send(
            token=token.token,
            title="잠자리에 들 시간이에요 😴",
            body="충분한 수면이 근성장과 회복에 도움이 돼요. 오늘도 건강한 하루 마무리해요!",
            data={"type": "sleep_reminder"},
        )
    if rows:
        logger.info("[Scheduler] sleep_reminder 발송: %d건", len(rows))


async def _send_inactivity_reminders() -> None:
    """매일 09:00 KST 실행 — 3일 이상 운동 미기록 유저에게 동기부여 알림."""
    three_days_ago = datetime.now() - timedelta(days=3)
    async with _get_session_factory()() as db:
        active_users_subq = (
            select(WorkoutSession.user_id)
            .where(
                WorkoutSession.started_at >= three_days_ago,
                WorkoutSession.status == SessionStatus.COMPLETED,
            )
            .distinct()
        )
        result = await db.execute(
            select(PushToken)
            .join(NotificationSetting, NotificationSetting.user_id == PushToken.user_id)
            .where(
                PushToken.is_active == True,
                NotificationSetting.workout_reminder == True,
                ~PushToken.user_id.in_(active_users_subq),
            )
        )
        tokens = result.scalars().all()

    for token in tokens:
        await fcm_service.send(
            token=token.token,
            title="3일째 쉬고 있어요 🥺",
            body="오늘 딱 한 세트만 해볼까요? 작은 시작이 큰 변화를 만들어요!",
            data={"type": "inactivity_reminder"},
        )
    if tokens:
        logger.info("[Scheduler] inactivity_reminder 발송: %d건", len(tokens))


def start_scheduler() -> AsyncIOScheduler:
    global _scheduler
    _scheduler = AsyncIOScheduler(timezone="Asia/Seoul")
    _scheduler.add_job(_send_morning_care, "cron", minute="*", id="morning_care", max_instances=1, coalesce=True)
    _scheduler.add_job(_send_preworkout_care, "cron", minute="*", id="preworkout_care", max_instances=1, coalesce=True)
    _scheduler.add_job(_send_sleep_reminders, "cron", minute="*", id="sleep_reminder", max_instances=1, coalesce=True)
    _scheduler.add_job(_send_inactivity_reminders, "cron", hour=9, minute=0, id="inactivity_reminder", max_instances=1, coalesce=True)
    _scheduler.start()
    logger.info("[Scheduler] APScheduler 시작됨 (아침케어·운동전케어·수면 매분, 비활성 09:00 KST)")
    return _scheduler


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[Scheduler] APScheduler 종료됨")
