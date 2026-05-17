from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User, UserInBody
from app.schemas.user import UserResponse, UserProfileUpdate, InBodyCreate, InBodyResponse

router = APIRouter(prefix="/users", tags=["Users"])


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
    # 최근 체중이 있으면 유저 기본 체중도 갱신
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
