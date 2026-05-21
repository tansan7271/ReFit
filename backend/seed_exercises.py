"""
운동 마스터 데이터 시드 스크립트

실행 방법 (backend/ 디렉토리에서):
  python seed_exercises.py

이미 존재하는 항목은 건너뛰므로 여러 번 실행해도 안전합니다.
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.config import settings
from app.models.workout import Exercise, MuscleGroup, ExerciseCategory

EXERCISES: list[dict] = [
    # 가슴 (Chest)
    {"name": "벤치프레스", "name_en": "Bench Press", "muscle_group": MuscleGroup.CHEST, "category": ExerciseCategory.WEIGHT, "emoji": "🏋️", "description": "바벨을 이용한 대흉근 기본 운동. 가슴 중앙 부위를 집중 자극."},
    {"name": "인클라인 벤치프레스", "name_en": "Incline Bench Press", "muscle_group": MuscleGroup.CHEST, "category": ExerciseCategory.WEIGHT, "emoji": "🏋️", "description": "30~45도 경사 벤치에서 수행. 대흉근 상부 발달에 효과적."},
    {"name": "덤벨 플라이", "name_en": "Dumbbell Fly", "muscle_group": MuscleGroup.CHEST, "category": ExerciseCategory.WEIGHT, "emoji": "💪", "description": "덤벨을 양옆으로 벌려 대흉근을 스트레칭. 가슴 너비 발달에 도움."},
    {"name": "푸시업", "name_en": "Push-up", "muscle_group": MuscleGroup.CHEST, "category": ExerciseCategory.BODYWEIGHT, "emoji": "🤸", "description": "맨몸으로 가슴·삼두·어깨를 동시에 자극하는 기본 운동."},
    {"name": "케이블 크로스오버", "name_en": "Cable Crossover", "muscle_group": MuscleGroup.CHEST, "category": ExerciseCategory.WEIGHT, "emoji": "💪", "description": "케이블 머신으로 가슴 안쪽 라인을 강조하는 고립 운동."},
    # 등 (Back)
    {"name": "데드리프트", "name_en": "Deadlift", "muscle_group": MuscleGroup.BACK, "category": ExerciseCategory.WEIGHT, "emoji": "🏋️", "description": "전신 근력을 동원하는 복합 운동. 척추기립근·광배근·햄스트링 동시 자극."},
    {"name": "바벨 로우", "name_en": "Barbell Row", "muscle_group": MuscleGroup.BACK, "category": ExerciseCategory.WEIGHT, "emoji": "🏋️", "description": "상체를 숙인 채 바벨을 당겨 광배근·승모근 중부를 강화."},
    {"name": "풀업", "name_en": "Pull-up", "muscle_group": MuscleGroup.BACK, "category": ExerciseCategory.BODYWEIGHT, "emoji": "🤸", "description": "턱걸이. 광배근과 이두근을 동시에 강화하는 상체 맨몸 운동."},
    {"name": "랫 풀다운", "name_en": "Lat Pulldown", "muscle_group": MuscleGroup.BACK, "category": ExerciseCategory.WEIGHT, "emoji": "💪", "description": "케이블 머신으로 광배근 발달. 풀업이 어려운 초보자에게 적합."},
    {"name": "시티드 케이블 로우", "name_en": "Seated Cable Row", "muscle_group": MuscleGroup.BACK, "category": ExerciseCategory.WEIGHT, "emoji": "💪", "description": "앉은 자세로 케이블을 당겨 등 두께를 만드는 운동."},
    {"name": "원암 덤벨 로우", "name_en": "One-arm Dumbbell Row", "muscle_group": MuscleGroup.BACK, "category": ExerciseCategory.WEIGHT, "emoji": "💪", "description": "한 팔씩 수행해 좌우 균형을 맞추고 광배근을 집중 자극."},
    # 어깨 (Shoulders)
    {"name": "오버헤드 프레스", "name_en": "Overhead Press", "muscle_group": MuscleGroup.SHOULDERS, "category": ExerciseCategory.WEIGHT, "emoji": "🏋️", "description": "바벨 또는 덤벨을 머리 위로 밀어 삼각근 전반을 강화."},
    {"name": "덤벨 레터럴 레이즈", "name_en": "Dumbbell Lateral Raise", "muscle_group": MuscleGroup.SHOULDERS, "category": ExerciseCategory.WEIGHT, "emoji": "💪", "description": "덤벨을 옆으로 들어올려 삼각근 측면을 고립 자극."},
    {"name": "프론트 레이즈", "name_en": "Front Raise", "muscle_group": MuscleGroup.SHOULDERS, "category": ExerciseCategory.WEIGHT, "emoji": "💪", "description": "덤벨을 앞으로 들어 삼각근 전면부를 강화."},
    {"name": "리어 델트 플라이", "name_en": "Rear Delt Fly", "muscle_group": MuscleGroup.SHOULDERS, "category": ExerciseCategory.WEIGHT, "emoji": "💪", "description": "후면 삼각근을 집중 자극. 어깨 라운딩 교정에 도움."},
    {"name": "페이스 풀", "name_en": "Face Pull", "muscle_group": MuscleGroup.SHOULDERS, "category": ExerciseCategory.WEIGHT, "emoji": "💪", "description": "케이블을 얼굴 방향으로 당겨 후면 삼각근과 회전근개 강화."},
    # 이두 (Biceps)
    {"name": "바벨 컬", "name_en": "Barbell Curl", "muscle_group": MuscleGroup.BICEPS, "category": ExerciseCategory.WEIGHT, "emoji": "💪", "description": "바벨을 이용한 이두근 기본 운동."},
    {"name": "덤벨 해머 컬", "name_en": "Hammer Curl", "muscle_group": MuscleGroup.BICEPS, "category": ExerciseCategory.WEIGHT, "emoji": "💪", "description": "중립 그립으로 이두근과 상완근을 동시 자극."},
    {"name": "인클라인 덤벨 컬", "name_en": "Incline Dumbbell Curl", "muscle_group": MuscleGroup.BICEPS, "category": ExerciseCategory.WEIGHT, "emoji": "💪", "description": "경사 벤치에 기대어 이두근 하부까지 완전 스트레칭."},
    {"name": "케이블 컬", "name_en": "Cable Curl", "muscle_group": MuscleGroup.BICEPS, "category": ExerciseCategory.WEIGHT, "emoji": "💪", "description": "케이블로 이두근에 지속적인 장력을 제공."},
    {"name": "컨센트레이션 컬", "name_en": "Concentration Curl", "muscle_group": MuscleGroup.BICEPS, "category": ExerciseCategory.WEIGHT, "emoji": "💪", "description": "팔꿈치를 허벅지에 고정해 이두근 피크를 강조."},
    # 삼두 (Triceps)
    {"name": "트라이셉스 딥스", "name_en": "Triceps Dips", "muscle_group": MuscleGroup.TRICEPS, "category": ExerciseCategory.BODYWEIGHT, "emoji": "🤸", "description": "평행봉에서 몸을 내려 삼두근 전체를 강화."},
    {"name": "스컬크러셔", "name_en": "Skull Crusher", "muscle_group": MuscleGroup.TRICEPS, "category": ExerciseCategory.WEIGHT, "emoji": "🏋️", "description": "바벨을 이마 방향으로 내려 삼두 장두를 집중 자극."},
    {"name": "케이블 푸시다운", "name_en": "Cable Pushdown", "muscle_group": MuscleGroup.TRICEPS, "category": ExerciseCategory.WEIGHT, "emoji": "💪", "description": "케이블 머신으로 삼두근 외측두를 강화."},
    {"name": "오버헤드 트라이셉스 익스텐션", "name_en": "Overhead Triceps Extension", "muscle_group": MuscleGroup.TRICEPS, "category": ExerciseCategory.WEIGHT, "emoji": "💪", "description": "머리 위로 덤벨을 들어 삼두 장두를 최대로 스트레칭."},
    {"name": "다이아몬드 푸시업", "name_en": "Diamond Push-up", "muscle_group": MuscleGroup.TRICEPS, "category": ExerciseCategory.BODYWEIGHT, "emoji": "🤸", "description": "손을 다이아몬드 모양으로 붙여 삼두근을 집중 자극."},
    # 전완 (Forearms)
    {"name": "리스트 컬", "name_en": "Wrist Curl", "muscle_group": MuscleGroup.FOREARMS, "category": ExerciseCategory.WEIGHT, "emoji": "💪", "description": "손목을 구부려 전완 굴근을 강화."},
    {"name": "리버스 리스트 컬", "name_en": "Reverse Wrist Curl", "muscle_group": MuscleGroup.FOREARMS, "category": ExerciseCategory.WEIGHT, "emoji": "💪", "description": "손목을 펴서 전완 신근을 강화."},
    {"name": "핸드 그립", "name_en": "Hand Grip", "muscle_group": MuscleGroup.FOREARMS, "category": ExerciseCategory.BODYWEIGHT, "emoji": "✊", "description": "그립 강화기를 쥐어 악력과 전완 전반을 강화."},
    # 코어 (Core)
    {"name": "플랭크", "name_en": "Plank", "muscle_group": MuscleGroup.CORE, "category": ExerciseCategory.BODYWEIGHT, "emoji": "🤸", "description": "코어 안정성을 키우는 정적 운동."},
    {"name": "크런치", "name_en": "Crunch", "muscle_group": MuscleGroup.CORE, "category": ExerciseCategory.BODYWEIGHT, "emoji": "🤸", "description": "복직근 상부를 집중 자극하는 기본 복근 운동."},
    {"name": "레그 레이즈", "name_en": "Leg Raise", "muscle_group": MuscleGroup.CORE, "category": ExerciseCategory.BODYWEIGHT, "emoji": "🤸", "description": "누운 상태에서 다리를 들어 복직근 하부와 장요근을 강화."},
    {"name": "러시안 트위스트", "name_en": "Russian Twist", "muscle_group": MuscleGroup.CORE, "category": ExerciseCategory.BODYWEIGHT, "emoji": "🔄", "description": "상체를 좌우로 비틀어 복사근을 강화."},
    {"name": "행잉 레그 레이즈", "name_en": "Hanging Leg Raise", "muscle_group": MuscleGroup.CORE, "category": ExerciseCategory.BODYWEIGHT, "emoji": "🤸", "description": "철봉에 매달려 다리를 들어 복근과 장요근을 강화."},
    {"name": "사이드 플랭크", "name_en": "Side Plank", "muscle_group": MuscleGroup.CORE, "category": ExerciseCategory.BODYWEIGHT, "emoji": "🤸", "description": "측면으로 지탱해 복사근과 중둔근을 강화."},
    # 둔근 (Glutes)
    {"name": "스쿼트", "name_en": "Squat", "muscle_group": MuscleGroup.GLUTES, "category": ExerciseCategory.WEIGHT, "emoji": "🏋️", "description": "하체 운동의 왕. 둔근·대퇴사두·햄스트링을 동시에 강화."},
    {"name": "힙 쓰러스트", "name_en": "Hip Thrust", "muscle_group": MuscleGroup.GLUTES, "category": ExerciseCategory.WEIGHT, "emoji": "🏋️", "description": "벤치에 등을 기대고 바벨로 엉덩이를 밀어올려 둔근을 집중 강화."},
    {"name": "글루트 브릿지", "name_en": "Glute Bridge", "muscle_group": MuscleGroup.GLUTES, "category": ExerciseCategory.BODYWEIGHT, "emoji": "🤸", "description": "누운 상태에서 엉덩이를 들어올려 둔근을 자극."},
    {"name": "불가리안 스플릿 스쿼트", "name_en": "Bulgarian Split Squat", "muscle_group": MuscleGroup.GLUTES, "category": ExerciseCategory.WEIGHT, "emoji": "🏋️", "description": "뒷발을 벤치에 올려 대둔근과 대퇴사두를 단독으로 강화."},
    {"name": "케이블 킥백", "name_en": "Cable Kickback", "muscle_group": MuscleGroup.GLUTES, "category": ExerciseCategory.WEIGHT, "emoji": "💪", "description": "케이블로 다리를 뒤로 차올려 대둔근을 고립 자극."},
    # 대퇴사두 (Quads)
    {"name": "레그 프레스", "name_en": "Leg Press", "muscle_group": MuscleGroup.QUADS, "category": ExerciseCategory.WEIGHT, "emoji": "🏋️", "description": "머신으로 대퇴사두를 집중 강화."},
    {"name": "레그 익스텐션", "name_en": "Leg Extension", "muscle_group": MuscleGroup.QUADS, "category": ExerciseCategory.WEIGHT, "emoji": "💪", "description": "머신에서 무릎을 펴 대퇴사두를 고립 자극."},
    {"name": "런지", "name_en": "Lunge", "muscle_group": MuscleGroup.QUADS, "category": ExerciseCategory.BODYWEIGHT, "emoji": "🤸", "description": "한 발을 앞으로 내딛어 대퇴사두와 둔근을 강화."},
    {"name": "핵 스쿼트", "name_en": "Hack Squat", "muscle_group": MuscleGroup.QUADS, "category": ExerciseCategory.WEIGHT, "emoji": "🏋️", "description": "머신 스쿼트로 대퇴사두 하부와 외측을 집중 자극."},
    {"name": "월 싯", "name_en": "Wall Sit", "muscle_group": MuscleGroup.QUADS, "category": ExerciseCategory.BODYWEIGHT, "emoji": "🤸", "description": "벽에 등을 기대고 앉는 정적 운동. 대퇴사두 지구력 향상."},
    # 햄스트링 (Hamstrings)
    {"name": "루마니안 데드리프트", "name_en": "Romanian Deadlift", "muscle_group": MuscleGroup.HAMSTRINGS, "category": ExerciseCategory.WEIGHT, "emoji": "🏋️", "description": "무릎을 살짝 구부린 채 바벨을 내려 햄스트링을 스트레칭·강화."},
    {"name": "레그 컬", "name_en": "Leg Curl", "muscle_group": MuscleGroup.HAMSTRINGS, "category": ExerciseCategory.WEIGHT, "emoji": "💪", "description": "머신에서 무릎을 구부려 햄스트링을 고립 자극."},
    {"name": "굿모닝", "name_en": "Good Morning", "muscle_group": MuscleGroup.HAMSTRINGS, "category": ExerciseCategory.WEIGHT, "emoji": "🏋️", "description": "바벨을 어깨에 지고 상체를 숙여 햄스트링과 척추기립근을 강화."},
    {"name": "노르딕 컬", "name_en": "Nordic Curl", "muscle_group": MuscleGroup.HAMSTRINGS, "category": ExerciseCategory.BODYWEIGHT, "emoji": "🤸", "description": "발목을 고정하고 상체를 앞으로 쓰러뜨려 햄스트링 편심 수축."},
    # 종아리 (Calves)
    {"name": "스탠딩 카프 레이즈", "name_en": "Standing Calf Raise", "muscle_group": MuscleGroup.CALVES, "category": ExerciseCategory.WEIGHT, "emoji": "💪", "description": "서서 발꿈치를 들어올려 비복근을 강화."},
    {"name": "시티드 카프 레이즈", "name_en": "Seated Calf Raise", "muscle_group": MuscleGroup.CALVES, "category": ExerciseCategory.WEIGHT, "emoji": "💪", "description": "앉아서 수행해 가자미근을 집중 자극."},
    {"name": "점프 로프", "name_en": "Jump Rope", "muscle_group": MuscleGroup.CALVES, "category": ExerciseCategory.CARDIO, "emoji": "⏰", "description": "줄넘기. 종아리 근지구력과 심폐 기능을 동시에 향상."},
    # 전신 (Full Body)
    {"name": "버피", "name_en": "Burpee", "muscle_group": MuscleGroup.FULL_BODY, "category": ExerciseCategory.BODYWEIGHT, "emoji": "🔥", "description": "전신을 사용하는 고강도 유산소 운동."},
    {"name": "케틀벨 스윙", "name_en": "Kettlebell Swing", "muscle_group": MuscleGroup.FULL_BODY, "category": ExerciseCategory.WEIGHT, "emoji": "🏋️", "description": "케틀벨을 앞뒤로 스윙해 둔근·햄스트링·코어·심폐를 동시에 자극."},
    {"name": "러닝", "name_en": "Running", "muscle_group": MuscleGroup.FULL_BODY, "category": ExerciseCategory.CARDIO, "emoji": "🏃", "description": "가장 기본적인 유산소 운동. 심폐 기능 강화와 체지방 감소에 효과적."},
    {"name": "사이클", "name_en": "Cycling", "muscle_group": MuscleGroup.FULL_BODY, "category": ExerciseCategory.CARDIO, "emoji": "🚴", "description": "실내 자전거 또는 야외 사이클링. 무릎 부담 없이 심폐 기능 강화."},
    {"name": "로잉 머신", "name_en": "Rowing Machine", "muscle_group": MuscleGroup.FULL_BODY, "category": ExerciseCategory.CARDIO, "emoji": "🚣", "description": "전신을 사용하는 유산소 운동. 등·어깨·코어까지 동시에 자극."},
    {"name": "점프 스쿼트", "name_en": "Jump Squat", "muscle_group": MuscleGroup.FULL_BODY, "category": ExerciseCategory.BODYWEIGHT, "emoji": "🤸", "description": "스쿼트 후 점프해 하체 폭발력과 심폐 기능을 동시에 강화."},
]


async def seed(db_url: str) -> None:
    engine = create_async_engine(db_url, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        result = await session.execute(select(Exercise.name))
        existing_names: set[str] = {row[0] for row in result.all()}

        to_insert = [
            Exercise(**ex)
            for ex in EXERCISES
            if ex["name"] not in existing_names
        ]

        if not to_insert:
            print("운동 마스터 데이터가 이미 모두 존재합니다. 건너뜁니다.")
        else:
            session.add_all(to_insert)
            await session.commit()
            skipped = len(EXERCISES) - len(to_insert)
            print(f"{len(to_insert)}개 운동 종목 삽입 완료 (건너뜀: {skipped}개)")

        count_result = await session.execute(select(Exercise))
        total = len(count_result.scalars().all())
        print(f"현재 DB 운동 종목 총 {total}개")

    await engine.dispose()


if __name__ == "__main__":
    db_url = settings.DATABASE_URL
    print(f"DB: {db_url.split('@')[-1]}")
    asyncio.run(seed(db_url))
