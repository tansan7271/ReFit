"""
운동 종목 마스터 데이터 초기 시드 스크립트
실행: python seed_exercises.py
"""
import asyncio
from app.core.database import AsyncSessionLocal
from app.models.workout import Exercise, MuscleGroup, ExerciseCategory
from app.models.badge import Badge, BadgeCategory, BadgeConditionType


EXERCISES = [
    # 가슴
    {"name": "벤치프레스", "name_en": "Bench Press", "muscle_group": MuscleGroup.CHEST, "category": ExerciseCategory.WEIGHT, "emoji": "🏋️"},
    {"name": "인클라인 벤치프레스", "name_en": "Incline Bench Press", "muscle_group": MuscleGroup.CHEST, "category": ExerciseCategory.WEIGHT, "emoji": "🏋️"},
    {"name": "덤벨 플라이", "name_en": "Dumbbell Fly", "muscle_group": MuscleGroup.CHEST, "category": ExerciseCategory.WEIGHT, "emoji": "💪"},
    {"name": "푸시업", "name_en": "Push Up", "muscle_group": MuscleGroup.CHEST, "category": ExerciseCategory.BODYWEIGHT, "emoji": "🤸"},
    # 등
    {"name": "데드리프트", "name_en": "Deadlift", "muscle_group": MuscleGroup.BACK, "category": ExerciseCategory.WEIGHT, "emoji": "🏋️"},
    {"name": "풀업", "name_en": "Pull Up", "muscle_group": MuscleGroup.BACK, "category": ExerciseCategory.BODYWEIGHT, "emoji": "🤸"},
    {"name": "렛 풀다운", "name_en": "Lat Pulldown", "muscle_group": MuscleGroup.BACK, "category": ExerciseCategory.WEIGHT, "emoji": "💪"},
    {"name": "바벨 로우", "name_en": "Barbell Row", "muscle_group": MuscleGroup.BACK, "category": ExerciseCategory.WEIGHT, "emoji": "🏋️"},
    # 어깨
    {"name": "숄더 프레스", "name_en": "Shoulder Press", "muscle_group": MuscleGroup.SHOULDERS, "category": ExerciseCategory.WEIGHT, "emoji": "💪"},
    {"name": "사이드 래터럴 레이즈", "name_en": "Lateral Raise", "muscle_group": MuscleGroup.SHOULDERS, "category": ExerciseCategory.WEIGHT, "emoji": "💪"},
    # 하체
    {"name": "스쿼트", "name_en": "Squat", "muscle_group": MuscleGroup.QUADS, "category": ExerciseCategory.WEIGHT, "emoji": "🏋️"},
    {"name": "레그프레스", "name_en": "Leg Press", "muscle_group": MuscleGroup.QUADS, "category": ExerciseCategory.WEIGHT, "emoji": "🦵"},
    {"name": "런지", "name_en": "Lunge", "muscle_group": MuscleGroup.QUADS, "category": ExerciseCategory.BODYWEIGHT, "emoji": "🤸"},
    {"name": "레그 컬", "name_en": "Leg Curl", "muscle_group": MuscleGroup.HAMSTRINGS, "category": ExerciseCategory.WEIGHT, "emoji": "🦵"},
    {"name": "힙 스러스트", "name_en": "Hip Thrust", "muscle_group": MuscleGroup.GLUTES, "category": ExerciseCategory.WEIGHT, "emoji": "🏋️"},
    {"name": "카프 레이즈", "name_en": "Calf Raise", "muscle_group": MuscleGroup.CALVES, "category": ExerciseCategory.WEIGHT, "emoji": "🦵"},
    # 이두/삼두
    {"name": "바벨 컬", "name_en": "Barbell Curl", "muscle_group": MuscleGroup.BICEPS, "category": ExerciseCategory.WEIGHT, "emoji": "💪"},
    {"name": "트라이셉스 푸시다운", "name_en": "Triceps Pushdown", "muscle_group": MuscleGroup.TRICEPS, "category": ExerciseCategory.WEIGHT, "emoji": "💪"},
    # 코어
    {"name": "플랭크", "name_en": "Plank", "muscle_group": MuscleGroup.CORE, "category": ExerciseCategory.BODYWEIGHT, "emoji": "🤸"},
    {"name": "크런치", "name_en": "Crunch", "muscle_group": MuscleGroup.CORE, "category": ExerciseCategory.BODYWEIGHT, "emoji": "🤸"},
    # 유산소
    {"name": "러닝머신", "name_en": "Treadmill", "muscle_group": MuscleGroup.FULL_BODY, "category": ExerciseCategory.CARDIO, "emoji": "🏃"},
    {"name": "사이클", "name_en": "Cycling", "muscle_group": MuscleGroup.FULL_BODY, "category": ExerciseCategory.CARDIO, "emoji": "🚴"},
    {"name": "줄넘기", "name_en": "Jump Rope", "muscle_group": MuscleGroup.FULL_BODY, "category": ExerciseCategory.CARDIO, "emoji": "⚡"},
]

BADGES = [
    # 운동 횟수
    {"name": "첫 발걸음", "description": "첫 번째 운동 완료!", "emoji": "🐣", "category": BadgeCategory.WORKOUT, "condition_type": BadgeConditionType.WORKOUT_COUNT, "condition_value": 1, "xp_reward": 100},
    {"name": "3일 챌린저", "description": "운동 3회 달성", "emoji": "🌱", "category": BadgeCategory.WORKOUT, "condition_type": BadgeConditionType.WORKOUT_COUNT, "condition_value": 3, "xp_reward": 150},
    {"name": "10회 클럽", "description": "운동 10회 달성", "emoji": "💪", "category": BadgeCategory.WORKOUT, "condition_type": BadgeConditionType.WORKOUT_COUNT, "condition_value": 10, "xp_reward": 300},
    {"name": "30회 파이터", "description": "운동 30회 달성", "emoji": "🔥", "category": BadgeCategory.WORKOUT, "condition_type": BadgeConditionType.WORKOUT_COUNT, "condition_value": 30, "xp_reward": 500},
    {"name": "100회 레전드", "description": "운동 100회 달성", "emoji": "🏆", "category": BadgeCategory.WORKOUT, "condition_type": BadgeConditionType.WORKOUT_COUNT, "condition_value": 100, "xp_reward": 1000},
    # 총 볼륨
    {"name": "1톤 돌파", "description": "총 운동 볼륨 1,000kg 달성", "emoji": "⚡", "category": BadgeCategory.WORKOUT, "condition_type": BadgeConditionType.TOTAL_VOLUME, "condition_value": 1000, "xp_reward": 200},
    {"name": "10톤 초인", "description": "총 운동 볼륨 10,000kg 달성", "emoji": "🦾", "category": BadgeCategory.WORKOUT, "condition_type": BadgeConditionType.TOTAL_VOLUME, "condition_value": 10000, "xp_reward": 800},
    # 수면
    {"name": "숙면 입문", "description": "수면 기록 7일 달성", "emoji": "🌙", "category": BadgeCategory.SLEEP, "condition_type": BadgeConditionType.SLEEP_DAYS, "condition_value": 7, "xp_reward": 150},
    {"name": "수면 마스터", "description": "수면 기록 30일 달성", "emoji": "⭐", "category": BadgeCategory.SLEEP, "condition_type": BadgeConditionType.SLEEP_DAYS, "condition_value": 30, "xp_reward": 400},
]


async def seed():
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        # 운동 종목
        for ex_data in EXERCISES:
            existing = await session.execute(select(Exercise).where(Exercise.name == ex_data["name"]))
            if not existing.scalar_one_or_none():
                session.add(Exercise(**ex_data))

        # 뱃지
        for badge_data in BADGES:
            existing = await session.execute(select(Badge).where(Badge.name == badge_data["name"]))
            if not existing.scalar_one_or_none():
                session.add(Badge(**badge_data))

        await session.commit()
        print(f"Seeded {len(EXERCISES)} exercises and {len(BADGES)} badges.")


if __name__ == "__main__":
    asyncio.run(seed())
