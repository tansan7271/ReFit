from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User, UserInBody
from app.models.notification import PushToken
from app.models.workout import WorkoutPlan
from app.schemas.user import (
    UserResponse, UserProfileUpdate, InBodyCreate, InBodyResponse, OnboardingRequest,
    SleepGoalUpdate, SleepGoalResponse, WEEKDAY_TO_DOW,
)
from app.services.fcm_service import fcm_service

router = APIRouter(prefix="/users", tags=["Users"])

WELCOME_XP = 100


def _sleep_goal_minutes(bedtime: str, wakeup: str) -> int:
    """목표 취침/기상 시각("HH:MM")으로 목표 수면 시간(분)을 계산. 자정을 넘기는 경우 처리.

    취침/기상 시각이 동일하면 수면 시간을 판단할 수 없으므로 400 에러를 발생시킨다.
    """
    bh, bm = (int(x) for x in bedtime.split(":"))
    wh, wm = (int(x) for x in wakeup.split(":"))
    minutes = (wh * 60 + wm) - (bh * 60 + bm)
    if minutes == 0:
        raise HTTPException(status_code=400, detail="취침 시각과 기상 시각이 동일합니다")
    if minutes < 0:  # 취침이 자정 이전, 기상이 다음 날인 일반적 케이스
        minutes += 24 * 60
    return minutes


@router.post("/me/onboard", response_model=UserResponse)
async def complete_onboarding(
    body: OnboardingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.is_onboarding_complete:
        raise HTTPException(status_code=409, detail="이미 온보딩을 완료했어요")

    current_user.age = body.age
    current_user.gender = body.gender
    current_user.height_cm = body.height_cm
    current_user.weight_kg = body.weight_kg
    current_user.fitness_level = body.fitness_level
    current_user.goal = body.goal
    current_user.character_emoji = body.character_emoji
    current_user.character_xp = WELCOME_XP
    current_user.is_onboarding_complete = True

    # 수면 목표 (온보딩 수면 설정 단계) — 둘 다 전달된 경우에만 저장
    if body.sleep_goal_bedtime and body.sleep_goal_wakeup:
        current_user.sleep_goal_bedtime = body.sleep_goal_bedtime
        current_user.sleep_goal_wakeup = body.sleep_goal_wakeup
        current_user.sleep_goal_minutes = _sleep_goal_minutes(
            body.sleep_goal_bedtime, body.sleep_goal_wakeup
        )

    db.add(current_user)
    await db.flush()

    # 운동 루틴 생성 (body parts → WorkoutPlan.name 에 콤마 구분으로 저장)
    # 중복 요일 제거 (마지막 값 우선) — workout_plans 에 (user_id, day_of_week)
    # 유니크 제약이 없어, 프론트가 같은 요일을 중복 전송하면 행이 두 개 생성됨
    seen_days: set[int] = set()
    for routine in reversed(body.routines):
        parts = [p for p in routine.bodyParts if p]  # 빈 값 제거
        if not parts:
            continue  # 빈 날은 플랜 생성 안 함 (휴식일)
        dow = WEEKDAY_TO_DOW[routine.day]
        if dow in seen_days:
            continue  # 이미 처리한 요일 — 마지막(역순 기준 첫) 항목만 유지
        seen_days.add(dow)
        db.add(WorkoutPlan(
            user_id=current_user.id,
            day_of_week=dow,
            name=",".join(parts),
            is_rest_day=False,
            planned_time=routine.planned_time,
        ))

    # FCM 웰컴 알림 (토큰이 없거나 실패해도 무시)
    try:
        result = await db.execute(
            select(PushToken).where(
                PushToken.user_id == current_user.id,
                PushToken.is_active == True,
            )
        )
        tokens = result.scalars().all()
        for token in tokens:
            await fcm_service.send(
                token=token.token,
                title=f"{body.character_emoji} 캐릭터가 탄생했어요!",
                body="온보딩 완료 보너스로 XP 100을 드렸어요. 오늘부터 함께 운동해봐요!",
                data={"type": "onboarding_complete"},
            )
    except Exception:
        pass

    return current_user


@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_my_profile(
    body: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    db.add(current_user)
    return current_user


# ── Sleep Goal ─────────────────────────────────────────────────────────────────

@router.get("/me/sleep-goal", response_model=SleepGoalResponse)
async def get_sleep_goal(current_user: User = Depends(get_current_user)):
    """현재 설정된 수면 목표 조회. 미설정 시 모든 필드가 null."""
    return current_user


@router.put("/me/sleep-goal", response_model=SleepGoalResponse)
async def update_sleep_goal(
    body: SleepGoalUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """수면 목표 취침/기상 시각 설정 (온보딩 이후 마이페이지에서 수정 시에도 사용)."""
    current_user.sleep_goal_bedtime = body.sleep_goal_bedtime
    current_user.sleep_goal_wakeup = body.sleep_goal_wakeup
    current_user.sleep_goal_minutes = _sleep_goal_minutes(
        body.sleep_goal_bedtime, body.sleep_goal_wakeup
    )
    db.add(current_user)
    return current_user


# ── InBody ─────────────────────────────────────────────────────────────────────

@router.post("/me/inbody", response_model=InBodyResponse, status_code=201)
async def add_inbody(
    body: InBodyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = UserInBody(
        user_id=current_user.id,
        measured_at=body.measured_at,
        weight_kg=body.weight_kg,
        body_fat_percent=body.body_fat_percent,
        muscle_mass_kg=body.muscle_mass_kg,
        body_water_percent=body.body_water_percent,
        bmi=body.bmi,
        visceral_fat_level=body.visceral_fat_level,
        memo=body.memo,
    )
    if body.weight_kg:
        current_user.weight_kg = body.weight_kg
        db.add(current_user)

    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


@router.get("/me/inbody", response_model=list[InBodyResponse])
async def get_inbody_history(
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserInBody)
        .where(UserInBody.user_id == current_user.id)
        .order_by(desc(UserInBody.measured_at))
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/{user_id}", response_model=UserResponse)
async def get_user_public(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없어요")
    return user
