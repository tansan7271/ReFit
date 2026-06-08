"""
뱃지 자동 지급 서비스 — 운동/수면 완료 후 호출
"""
from datetime import date, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.models.user import User
from app.models.workout import WorkoutSession, SessionStatus
from app.models.sleep import SleepRecord
from app.models.badge import Badge, UserBadge, BadgeConditionType
from app.models.community import Friendship, FriendshipStatus, Poke
from app.models.notification import NotificationSetting, PushToken
from app.services.fcm_service import fcm_service


def _calc_streak(sorted_dates_desc: list) -> int:
    """날짜 내림차순 리스트에서 현재 연속 일수를 반환."""
    if not sorted_dates_desc:
        return 0
    today = date.today()
    streak = 0
    expected = today
    for d in sorted_dates_desc:
        if hasattr(d, "date"):
            d = d.date()
        if d == expected:
            streak += 1
            expected -= timedelta(days=1)
        elif streak == 0 and d == today - timedelta(days=1):
            streak = 1
            expected = d - timedelta(days=1)
        else:
            break
    return streak


async def check_and_award_badges(user: User, db: AsyncSession) -> list[Badge]:
    """유저 상태를 확인해 미획득 뱃지를 지급. 새로 획득된 뱃지 목록 반환."""
    awarded: list[Badge] = []

    owned = await db.execute(
        select(UserBadge.badge_id).where(UserBadge.user_id == user.id)
    )
    owned_ids = {row[0] for row in owned.all()}

    all_badges = await db.execute(select(Badge).where(Badge.is_active == True))

    stats: dict[BadgeConditionType, int | float] = {}

    for badge in all_badges.scalars().all():
        if badge.id in owned_ids:
            continue

        current = await _get_stat(badge.condition_type, user.id, db, stats)
        if current >= badge.condition_value:
            user_badge = UserBadge(
                user_id=user.id,
                badge_id=badge.id,
                earned_at=datetime.now(),
            )
            db.add(user_badge)
            user.character_xp += badge.xp_reward
            awarded.append(badge)

    if awarded:
        user.character_level = 1 + user.character_xp // 500
        db.add(user)

        # FCM — achievement 알림이 켜진 유저에게 발송
        setting_result = await db.execute(
            select(NotificationSetting).where(NotificationSetting.user_id == user.id)
        )
        setting = setting_result.scalar_one_or_none()
        if setting and setting.achievement:
            token_result = await db.execute(
                select(PushToken).where(
                    PushToken.user_id == user.id, PushToken.is_active == True
                )
            )
            tokens = token_result.scalars().all()
            for badge in awarded:
                for token in tokens:
                    await fcm_service.send(
                        token=token.token,
                        title=f"새 뱃지 획득! {badge.emoji}",
                        body=f"'{badge.name}' 달성! +{badge.xp_reward} XP",
                        data={"type": "badge_earned", "badge_id": str(badge.id)},
                    )

    return awarded


async def _get_stat(
    condition_type: BadgeConditionType,
    user_id: int,
    db: AsyncSession,
    cache: dict,
) -> int | float:
    if condition_type in cache:
        return cache[condition_type]

    value: int | float = 0

    if condition_type == BadgeConditionType.WORKOUT_COUNT:
        result = await db.execute(
            select(func.count(WorkoutSession.id)).where(
                WorkoutSession.user_id == user_id,
                WorkoutSession.status == SessionStatus.COMPLETED,
            )
        )
        value = result.scalar() or 0

    elif condition_type == BadgeConditionType.WORKOUT_STREAK:
        result = await db.execute(
            select(WorkoutSession.started_at)
            .where(
                WorkoutSession.user_id == user_id,
                WorkoutSession.status == SessionStatus.COMPLETED,
            )
            .order_by(WorkoutSession.started_at.desc())
        )
        timestamps = [row[0] for row in result.all()]
        kst_dates = sorted({ts.date() for ts in timestamps}, reverse=True)
        value = _calc_streak(kst_dates)

    elif condition_type == BadgeConditionType.TOTAL_VOLUME:
        result = await db.execute(
            select(func.sum(WorkoutSession.total_volume_kg)).where(
                WorkoutSession.user_id == user_id,
                WorkoutSession.status == SessionStatus.COMPLETED,
            )
        )
        value = result.scalar() or 0.0

    elif condition_type == BadgeConditionType.SLEEP_DAYS:
        result = await db.execute(
            select(func.count(SleepRecord.id)).where(SleepRecord.user_id == user_id)
        )
        value = result.scalar() or 0

    elif condition_type == BadgeConditionType.SLEEP_STREAK:
        result = await db.execute(
            select(SleepRecord.sleep_start)
            .where(SleepRecord.user_id == user_id)
            .order_by(SleepRecord.sleep_start.desc())
        )
        timestamps = [row[0] for row in result.all()]
        kst_dates = sorted({ts.date() for ts in timestamps}, reverse=True)
        value = _calc_streak(kst_dates)

    elif condition_type == BadgeConditionType.FRIEND_COUNT:
        result = await db.execute(
            select(func.count(Friendship.id)).where(
                or_(
                    Friendship.requester_id == user_id,
                    Friendship.addressee_id == user_id,
                ),
                Friendship.status == FriendshipStatus.ACCEPTED,
            )
        )
        value = result.scalar() or 0

    elif condition_type == BadgeConditionType.POKE_SENT:
        result = await db.execute(
            select(func.count(Poke.id)).where(Poke.sender_id == user_id)
        )
        value = result.scalar() or 0

    cache[condition_type] = value
    return value
