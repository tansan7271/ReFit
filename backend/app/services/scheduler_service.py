"""
APScheduler 기반 스마트 알림 스케줄러

시간 기반 (매분):
  - workout_reminder_time(HH:MM UTC)과 현재 시각이 일치하는 유저에게 운동 알림 FCM 발송
  - sleep_reminder_time(HH:MM UTC)과 현재 시각이 일치하는 유저에게 수면 준비 알림 발송

조건 기반 (매일 09:00 UTC):
  - 최근 3일 운동 기록 없는 유저에게 동기부여 알림 발송 (workout_reminder=True 인 유저만)
"""
import logging
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.models.notification import NotificationSetting, PushToken
from app.models.workout import WorkoutSession, SessionStatus
from app.services.fcm_service import fcm_service

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


async def _send_workout_reminders() -> None:
    """매분 실행 — workout_reminder_time이 현재 UTC 시각(HH:MM)인 유저에게 FCM 발송.
    직전 24시간 이내 고강도 운동(피로도 >= 5.0)이 있으면 회복 알림으로 대체."""
    now = datetime.now(timezone.utc)
    current_hhmm = now.strftime("%H:%M")
    yesterday = now - timedelta(hours=24)

    # (token_str, is_high_fatigue) 목록 구성
    reminders: list[tuple[str, bool]] = []

    async with _get_session_factory()() as db:
        result = await db.execute(
            select(NotificationSetting, PushToken)
            .join(PushToken, PushToken.user_id == NotificationSetting.user_id)
            .where(
                NotificationSetting.workout_reminder == True,
                NotificationSetting.workout_reminder_time == current_hhmm,
                PushToken.is_active == True,
            )
        )
        rows = result.all()

        for setting, token in rows:
            last_result = await db.execute(
                select(WorkoutSession)
                .where(
                    WorkoutSession.user_id == setting.user_id,
                    WorkoutSession.status == SessionStatus.COMPLETED,
                    WorkoutSession.ended_at >= yesterday,
                )
                .order_by(WorkoutSession.ended_at.desc())
                .limit(1)
            )
            last_session = last_result.scalar_one_or_none()
            is_high_fatigue = (
                _calculate_fatigue(last_session) >= 5.0 if last_session else False
            )
            reminders.append((token.token, is_high_fatigue))

    for token_str, is_high_fatigue in reminders:
        if is_high_fatigue:
            await fcm_service.send(
                token=token_str,
                title="오늘은 가볍게 회복하는 날이에요 💆",
                body="어제 열심히 운동했어요! 오늘은 스트레칭이나 가벼운 유산소로 근육을 풀어주세요.",
                data={"type": "recovery_reminder"},
            )
        else:
            await fcm_service.send(
                token=token_str,
                title="운동할 시간이에요! 💪",
                body="오늘 루틴을 시작해볼까요? 지금 바로 시작하면 캐릭터가 성장해요.",
                data={"type": "workout_reminder"},
            )
    if reminders:
        high = sum(1 for _, f in reminders if f)
        logger.info("[Scheduler] workout_reminder 발송: %d건 (회복 %d건)", len(reminders), high)


async def _send_sleep_reminders() -> None:
    """매분 실행 — sleep_reminder_time이 현재 UTC 시각(HH:MM)인 유저에게 FCM 발송."""
    current_hhmm = datetime.now(timezone.utc).strftime("%H:%M")
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
    """매일 09:00 UTC 실행 — 3일 이상 운동 미기록 유저에게 동기부여 알림."""
    three_days_ago = datetime.now(timezone.utc) - timedelta(days=3)
    async with _get_session_factory()() as db:
        active_users_subq = (
            select(WorkoutSession.user_id)
            .where(WorkoutSession.started_at >= three_days_ago)
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


async def _send_aftercare_fcm(token: str) -> None:
    """운동 완료 N시간 후 회복 케어 알림."""
    await fcm_service.send(
        token=token,
        title="회복도 운동이에요 💆",
        body="물 충분히 마시고, 단백질 섭취와 스트레칭으로 근육 회복을 도와주세요!",
        data={"type": "aftercare_reminder"},
    )


def schedule_aftercare_notification(user_id: int, tokens: list[str], delay_hours: int = 8) -> None:
    """운동 완료 후 delay_hours 시간 뒤 회복 알림 예약."""
    if not _scheduler or not _scheduler.running:
        return
    run_at = datetime.now(timezone.utc) + timedelta(hours=delay_hours)
    for token in tokens:
        job_id = f"aftercare_{user_id}_{token[:8]}_{int(run_at.timestamp())}"
        _scheduler.add_job(
            _send_aftercare_fcm,
            "date",
            run_date=run_at,
            args=[token],
            id=job_id,
            replace_existing=True,
        )
    logger.info("[Scheduler] aftercare 예약: user_id=%d, %d건, %dh 후", user_id, len(tokens), delay_hours)


def start_scheduler() -> AsyncIOScheduler:
    global _scheduler
    _scheduler = AsyncIOScheduler(timezone="UTC")
    _scheduler.add_job(_send_workout_reminders, "cron", minute="*", id="workout_reminder")
    _scheduler.add_job(_send_sleep_reminders, "cron", minute="*", id="sleep_reminder")
    _scheduler.add_job(_send_inactivity_reminders, "cron", hour=9, minute=0, id="inactivity_reminder")
    _scheduler.start()
    logger.info("[Scheduler] APScheduler 시작됨 (운동·수면 매분, 비활성 09:00 UTC)")
    return _scheduler


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[Scheduler] APScheduler 종료됨")
