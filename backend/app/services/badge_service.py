"""
뱃지 자동 지급 서비스 — 운동/수면 완료 후 호출
"""
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.user import User
from app.models.workout import WorkoutSession, SessionStatus
from app.models.sleep import SleepRecord
from app.models.badge import Badge, UserBadge, BadgeConditionType
from app.services.fcm_service import fcm_service


async def check_and_award_badges(user: User, db: AsyncSession) -> list[Badge]:
    """유저 상태를 확인해 미획득 뱃지를 지급. 새로 획득된 뱃지 목록 반환."""
    awarded: list[Badge] = []

    # 현재 보유 뱃지 ID 목록
    owned = await db.execute(
        select(UserBadge.badge_id).where(UserBadge.user_id == user.id)
    )
    owned_ids = {row[0] for row in owned.all()}

    # 획득 가능한 전체 뱃지
    all_badges = await db.execute(select(Badge).where(Badge.is_active == True))

    # 조건별 현재 수치 캐싱
    stats: dict[BadgeConditionType, int | float] = {}

    for badge in all_badges.scalars().all():
        if badge.id in owned_ids:
            continue

        current = await _get_stat(badge.condition_type, user.id, db, stats)
        if current >= badge.condition_value:
            user_badge = UserBadge(
                user_id=user.id,
                badge_id=badge.id,
                earned_at=datetime.now(timezone.utc),
            )
            db.add(user_badge)
            user.character_xp += badge.xp_reward
            awarded.append(badge)

    if awarded:
        user.character_level = 1 + user.character_xp // 500
        db.add(user)

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

    elif condition_type == BadgeConditionType.SLEEP_DAYS:
        result = await db.execute(
            select(func.count(SleepRecord.id)).where(SleepRecord.user_id == user_id)
        )
        value = result.scalar() or 0

    elif condition_type == BadgeConditionType.TOTAL_VOLUME:
        result = await db.execute(
            select(func.sum(WorkoutSession.total_volume_kg)).where(
                WorkoutSession.user_id == user_id,
                WorkoutSession.status == SessionStatus.COMPLETED,
            )
        )
        value = result.scalar() or 0.0

    cache[condition_type] = value
    return value
