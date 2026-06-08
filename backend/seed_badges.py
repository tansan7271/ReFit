"""
배지 마스터 데이터 시드 스크립트

실행 방법 (backend/ 디렉토리에서):
  python seed_badges.py

이미 존재하는 항목은 건너뛰므로 여러 번 실행해도 안전합니다.
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.config import settings
from app.models.badge import Badge, BadgeCategory, BadgeConditionType

BADGES: list[dict] = [
    # 운동 횟수
    {
        "name": "첫 운동",
        "description": "운동을 처음으로 완료했어요.",
        "emoji": "🏋️",
        "category": BadgeCategory.WORKOUT,
        "condition_type": BadgeConditionType.WORKOUT_COUNT,
        "condition_value": 1,
        "xp_reward": 50,
    },
    {
        "name": "운동 10회",
        "description": "운동을 10회 완료했어요.",
        "emoji": "💪",
        "category": BadgeCategory.WORKOUT,
        "condition_type": BadgeConditionType.WORKOUT_COUNT,
        "condition_value": 10,
        "xp_reward": 100,
    },
    {
        "name": "운동 30회",
        "description": "운동을 30회 완료했어요.",
        "emoji": "🔥",
        "category": BadgeCategory.WORKOUT,
        "condition_type": BadgeConditionType.WORKOUT_COUNT,
        "condition_value": 30,
        "xp_reward": 200,
    },
    # 연속 운동
    {
        "name": "3일 연속",
        "description": "3일 연속으로 운동했어요.",
        "emoji": "📅",
        "category": BadgeCategory.STREAK,
        "condition_type": BadgeConditionType.WORKOUT_STREAK,
        "condition_value": 3,
        "xp_reward": 100,
    },
    {
        "name": "7일 연속",
        "description": "7일 연속으로 운동했어요.",
        "emoji": "🗓️",
        "category": BadgeCategory.STREAK,
        "condition_type": BadgeConditionType.WORKOUT_STREAK,
        "condition_value": 7,
        "xp_reward": 200,
    },
    # 수면
    {
        "name": "첫 수면 기록",
        "description": "처음으로 수면 데이터를 동기화했어요.",
        "emoji": "🌙",
        "category": BadgeCategory.SLEEP,
        "condition_type": BadgeConditionType.SLEEP_DAYS,
        "condition_value": 1,
        "xp_reward": 50,
    },
    {
        "name": "7일 연속 수면",
        "description": "7일 연속으로 수면을 기록했어요.",
        "emoji": "😴",
        "category": BadgeCategory.SLEEP,
        "condition_type": BadgeConditionType.SLEEP_STREAK,
        "condition_value": 7,
        "xp_reward": 150,
    },
    # 소셜
    {
        "name": "첫 친구",
        "description": "첫 번째 친구를 추가했어요.",
        "emoji": "👥",
        "category": BadgeCategory.SOCIAL,
        "condition_type": BadgeConditionType.FRIEND_COUNT,
        "condition_value": 1,
        "xp_reward": 100,
    },
    {
        "name": "첫 콕 찌르기",
        "description": "처음으로 친구를 콕 찔렀어요.",
        "emoji": "👉",
        "category": BadgeCategory.SOCIAL,
        "condition_type": BadgeConditionType.POKE_SENT,
        "condition_value": 1,
        "xp_reward": 50,
    },
    {
        "name": "콕 찌르기 달인",
        "description": "콕 찌르기를 10회 보냈어요.",
        "emoji": "👊",
        "category": BadgeCategory.SOCIAL,
        "condition_type": BadgeConditionType.POKE_SENT,
        "condition_value": 10,
        "xp_reward": 100,
    },
]


async def seed(db_url: str) -> None:
    engine = create_async_engine(db_url, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        result = await session.execute(select(Badge.name))
        existing_names: set[str] = {row[0] for row in result.all()}

        to_insert = [
            Badge(**b)
            for b in BADGES
            if b["name"] not in existing_names
        ]

        if not to_insert:
            print("배지 마스터 데이터가 이미 모두 존재합니다. 건너뜁니다.")
        else:
            session.add_all(to_insert)
            await session.commit()
            skipped = len(BADGES) - len(to_insert)
            print(f"{len(to_insert)}개 배지 삽입 완료 (건너뜀: {skipped}개)")

        count_result = await session.execute(select(Badge))
        total = len(count_result.scalars().all())
        print(f"현재 DB 배지 총 {total}개")

    await engine.dispose()


if __name__ == "__main__":
    db_url = settings.DATABASE_URL
    print(f"DB: {db_url.split('@')[-1]}")
    asyncio.run(seed(db_url))
