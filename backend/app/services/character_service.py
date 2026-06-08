"""
캐릭터 상태 계산 서비스

GET /character 응답에 필요한 네 기둥 점수(sleep, exercise, diet, routine)와
실시간 상태(workout_status, is_sleeping)를 계산한다.
"""
from datetime import date, datetime, timedelta

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, FitnessLevel, Gender
from app.models.workout import WorkoutPlan, WorkoutSession, SessionStatus
from app.models.sleep import SleepRecord
from app.models.diet import DietRecord
from app.models.badge import UserBadge, Badge



# ── TDEE 추정 (Harris-Benedict) ──────────────────────────────────────────────

def _estimate_tdee(user: User) -> float:
    if not user.weight_kg or not user.height_cm or not user.age:
        return 2000.0
    if user.gender == Gender.MALE:
        bmr = 10 * user.weight_kg + 6.25 * user.height_cm - 5 * user.age + 5
    else:
        bmr = 10 * user.weight_kg + 6.25 * user.height_cm - 5 * user.age - 161
    multiplier = {
        FitnessLevel.BEGINNER: 1.375,
        FitnessLevel.INTERMEDIATE: 1.55,
        FitnessLevel.ADVANCED: 1.725,
        FitnessLevel.ATHLETE: 1.9,
    }.get(user.fitness_level, 1.55)
    return bmr * multiplier


# ── 수면 점수 (0~100) ────────────────────────────────────────────────────────

async def _calc_sleep_score(user: User, db: AsyncSession) -> float:
    day_start = datetime.combine(date.today(), datetime.min.time())
    day_end = day_start + timedelta(days=1)
    result = await db.execute(
        select(SleepRecord)
        .where(
            SleepRecord.user_id == user.id,
            SleepRecord.sleep_end >= day_start,
            SleepRecord.sleep_end < day_end,
        )
        .order_by(SleepRecord.sleep_end.desc())
        .limit(1)
    )
    record = result.scalar_one_or_none()
    if not record:
        return 0.0

    goal_minutes = user.sleep_goal_minutes or 450  # 기본 7.5h
    time_score = min(100.0, record.duration_minutes / goal_minutes * 100)

    # 각성 시간 페널티 (최대 20점)
    awake_penalty = min(20.0, (record.awake_minutes or 0) / 60 * 20)

    if record.quality_score is not None:
        score = 0.6 * (time_score - awake_penalty) + 0.4 * record.quality_score
    else:
        score = time_score - awake_penalty

    return round(max(0.0, min(100.0, score)), 1)


# ── 운동 점수 (0~100) ────────────────────────────────────────────────────────

async def _calc_exercise_score(user: User, db: AsyncSession) -> float:
    now = datetime.now()
    today_start = datetime.combine(date.today(), datetime.min.time())

    # 오늘 진행 중인 세션
    active_result = await db.execute(
        select(WorkoutSession).where(
            WorkoutSession.user_id == user.id,
            WorkoutSession.status == SessionStatus.IN_PROGRESS,
        ).limit(1)
    )
    if active_result.scalar_one_or_none():
        return 70.0  # 운동 중 — 진행 기여분 인정

    # 오늘 완료한 세션
    completed_result = await db.execute(
        select(WorkoutSession).where(
            WorkoutSession.user_id == user.id,
            WorkoutSession.status == SessionStatus.COMPLETED,
            WorkoutSession.ended_at >= today_start,
        ).order_by(WorkoutSession.ended_at.desc()).limit(1)
    )
    session = completed_result.scalar_one_or_none()
    if session and session.total_duration_sec:
        goal_sec = 3600  # 60분 목표
        return round(min(100.0, session.total_duration_sec / goal_sec * 100), 1)

    # 오늘 운동 없음 → 마지막 운동일 기준 감쇠
    last_result = await db.execute(
        select(WorkoutSession).where(
            WorkoutSession.user_id == user.id,
            WorkoutSession.status == SessionStatus.COMPLETED,
        ).order_by(WorkoutSession.ended_at.desc()).limit(1)
    )
    last = last_result.scalar_one_or_none()
    if not last or not last.ended_at:
        return 0.0

    days_since = (now - last.ended_at).days

    if days_since <= 1:
        return 45.0  # 어제 운동 — 휴식일
    if days_since <= 3:
        return 25.0
    return max(0.0, 15.0 - (days_since - 3) * 5)


# ── 식단 점수 (0~100) ────────────────────────────────────────────────────────

async def _calc_diet_score(user: User, db: AsyncSession) -> float:
    today = date.today()
    result = await db.execute(
        select(func.sum(DietRecord.total_calories)).where(
            DietRecord.user_id == user.id,
            DietRecord.date == today,
        )
    )
    total_cal = result.scalar() or None

    if total_cal is None:
        return 50.0  # 기록 없음 → 중립

    target = _estimate_tdee(user)
    ratio = total_cal / target

    if 0.8 <= ratio <= 1.2:
        # 목표 ±20% 이내 → 만점
        cal_score = 100.0
    elif ratio < 0.8:
        # 결식 페널티
        cal_score = ratio / 0.8 * 100
    else:
        # 과식 페널티
        cal_score = max(0.0, 100.0 - (ratio - 1.2) * 250)

    # 매크로 균형 보너스 (+10점 최대, 단백질 기준)
    macro_result = await db.execute(
        select(
            func.sum(DietRecord.protein_g),
            func.sum(DietRecord.carbs_g),
            func.sum(DietRecord.fat_g),
        ).where(
            DietRecord.user_id == user.id,
            DietRecord.date == today,
        )
    )
    protein, carbs, fat = macro_result.one()
    if protein and carbs and fat:
        total_macro_cal = protein * 4 + carbs * 4 + fat * 9
        if total_macro_cal > 0:
            protein_ratio = protein * 4 / total_macro_cal
            bonus = min(10.0, protein_ratio * 30)  # 단백질 비율 클수록 보너스
            cal_score = min(100.0, cal_score + bonus)

    return round(max(0.0, cal_score), 1)


# ── 루틴 점수 (0~100) ────────────────────────────────────────────────────────
# WorkoutPlan(요일별 운동 계획) 준수율로 계산.
# 최근 7일 중 운동 계획이 있는 날(비휴식일)만 집계.
# 계획한 날에 세션을 완료했으면 준수, 아니면 미준수.
# 계획 자체가 없거나 7일 모두 휴식이면 중립(50).

async def _calc_routine_score(user: User, db: AsyncSession) -> float:
    plans_result = await db.execute(
        select(WorkoutPlan).where(WorkoutPlan.user_id == user.id)
    )
    plans = {p.day_of_week: p for p in plans_result.scalars().all()}

    if not plans:
        return 50.0

    today = date.today()
    planned_days = 0
    followed_days = 0

    for i in range(7):
        check_date = today - timedelta(days=i)
        dow = check_date.weekday()  # 0=Mon ~ 6=Sun (백엔드와 동일)
        plan = plans.get(dow)
        if plan is None or plan.is_rest_day:
            continue

        planned_days += 1
        day_start = datetime.combine(check_date, datetime.min.time())
        day_end   = day_start + timedelta(days=1)
        sess = await db.execute(
            select(WorkoutSession).where(
                WorkoutSession.user_id == user.id,
                WorkoutSession.status == SessionStatus.COMPLETED,
                WorkoutSession.ended_at >= day_start,
                WorkoutSession.ended_at < day_end,
            ).limit(1)
        )
        if sess.scalar_one_or_none():
            followed_days += 1

    if planned_days == 0:
        return 50.0

    return round(followed_days / planned_days * 100, 1)


# ── workout_status ───────────────────────────────────────────────────────────

async def _get_workout_status(user_id: int, db: AsyncSession) -> str:
    active_result = await db.execute(
        select(WorkoutSession).where(
            WorkoutSession.user_id == user_id,
            WorkoutSession.status == SessionStatus.IN_PROGRESS,
        ).limit(1)
    )
    if active_result.scalar_one_or_none():
        return "active"

    thirty_min_ago = datetime.now() - timedelta(minutes=30)
    completed_result = await db.execute(
        select(WorkoutSession).where(
            WorkoutSession.user_id == user_id,
            WorkoutSession.status == SessionStatus.COMPLETED,
            WorkoutSession.ended_at >= thirty_min_ago,
        ).order_by(WorkoutSession.ended_at.desc()).limit(1)
    )
    if completed_result.scalar_one_or_none():
        return "completed"

    return "none"


# ── is_sleeping ──────────────────────────────────────────────────────────────

def _get_is_sleeping(user: User) -> bool:
    if not user.sleep_goal_bedtime or not user.sleep_goal_wakeup:
        return False
    try:
        bh, bm = map(int, user.sleep_goal_bedtime.split(":"))
        wh, wm = map(int, user.sleep_goal_wakeup.split(":"))
    except Exception:
        return False

    now = datetime.now()  # TZ=Asia/Seoul → KST. bedtime/wakeup도 KST로 저장됨
    current_minutes = now.hour * 60 + now.minute
    bed_minutes = bh * 60 + bm
    wake_minutes = wh * 60 + wm

    if bed_minutes > wake_minutes:
        # 자정을 넘는 경우 (예: 23:00 ~ 07:00)
        return current_minutes >= bed_minutes or current_minutes <= wake_minutes
    else:
        return bed_minutes <= current_minutes <= wake_minutes


# ── workout_part ─────────────────────────────────────────────────────────────
# WorkoutSet은 기록되지 않으므로 completed_parts 문자열에서 첫 번째 부위를 사용.
# 프론트 BodyPart 타입이 단수형(shoulder/arm/leg)이므로 minidis 복수형으로 정규화.

_PART_NORMALIZE = {"shoulder": "shoulders", "arm": "arms", "leg": "legs"}

async def _get_workout_part(user_id: int, db: AsyncSession) -> str | None:
    today_start = datetime.combine(date.today(), datetime.min.time())
    session_result = await db.execute(
        select(WorkoutSession).where(
            WorkoutSession.user_id == user_id,
            WorkoutSession.status == SessionStatus.COMPLETED,
            WorkoutSession.ended_at >= today_start,
        ).order_by(WorkoutSession.ended_at.desc()).limit(1)
    )
    session = session_result.scalar_one_or_none()
    if not session or not session.completed_parts:
        return None
    first = session.completed_parts.split(",")[0].strip()
    if not first or first == "cardio":
        return None
    return _PART_NORMALIZE.get(first, first)


# ── equipped_badge_emoji ─────────────────────────────────────────────────────

async def _get_equipped_badge_emoji(user_id: int, db: AsyncSession) -> str | None:
    result = await db.execute(
        select(Badge.emoji)
        .join(UserBadge, UserBadge.badge_id == Badge.id)
        .where(
            UserBadge.user_id == user_id,
            UserBadge.is_equipped == True,  # noqa: E712
        )
        .limit(1)
    )
    return result.scalar_one_or_none()


# ── 메인 집계 함수 ────────────────────────────────────────────────────────────

async def get_character_data(user: User, db: AsyncSession) -> dict:
    sleep, exercise, diet, routine, workout_status, workout_part, badge_emoji = (
        await _calc_sleep_score(user, db),
        await _calc_exercise_score(user, db),
        await _calc_diet_score(user, db),
        await _calc_routine_score(user, db),
        await _get_workout_status(user.id, db),
        await _get_workout_part(user.id, db),
        await _get_equipped_badge_emoji(user.id, db),
    )
    return {
        "stats": {
            "sleep": sleep,
            "exercise": exercise,
            "diet": diet,
            "routine": routine,
        },
        "workout_status": workout_status,
        "is_sleeping": _get_is_sleeping(user),
        "character_level": user.character_level,
        "character_xp": user.character_xp,
        "workout_part": workout_part,
        "equipped_badge_emoji": badge_emoji,
    }
