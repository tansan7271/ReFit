from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User, UserInBody
from app.models.notification import PushToken
from app.schemas.user import (
    UserResponse, UserProfileUpdate, InBodyCreate, InBodyResponse, OnboardingRequest,
)
from app.services.fcm_service import fcm_service

router = APIRouter(prefix="/users", tags=["Users"])

WELCOME_XP = 100


@router.post("/me/onboard", response_model=UserResponse)
async def complete_onboarding(
    body: OnboardingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.is_onboarding_complete:
        raise HTTPException(status_code=409, detail="Onboarding already completed")

    current_user.age = body.age
    current_user.gender = body.gender
    current_user.height_cm = body.height_cm
    current_user.weight_kg = body.weight_kg
    current_user.fitness_level = body.fitness_level
    current_user.goal = body.goal
    current_user.character_emoji = body.character_emoji
    current_user.character_xp = WELCOME_XP
    current_user.is_onboarding_complete = True
    db.add(current_user)
    await db.flush()

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
    await db.flush()
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
        raise HTTPException(status_code=404, detail="User not found")
    return user
