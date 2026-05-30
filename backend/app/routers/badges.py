from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.badge import Badge, UserBadge
from app.schemas.badge import BadgeResponse, UserBadgeResponse, BadgeEquipRequest, BadgeCheckResponse
from app.services.badge_service import check_and_award_badges

router = APIRouter(prefix="/badges", tags=["Badges"])


@router.get("", response_model=list[BadgeResponse])
async def list_all_badges(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Badge).where(Badge.is_active == True).order_by(Badge.category, Badge.id)
    )
    return result.scalars().all()


@router.get("/me", response_model=list[UserBadgeResponse])
async def get_my_badges(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserBadge)
        .where(UserBadge.user_id == current_user.id)
        .options(selectinload(UserBadge.badge))
        .order_by(UserBadge.earned_at.desc())
    )
    return result.scalars().all()


@router.post("/check", response_model=BadgeCheckResponse)
async def check_my_badges(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """현재 유저의 뱃지 달성 조건 전체 판별. 새로 획득된 뱃지 자동 지급 및 FCM 발송."""
    newly_earned = await check_and_award_badges(current_user, db)
    return BadgeCheckResponse(
        newly_earned=[BadgeResponse.model_validate(b) for b in newly_earned],
        earned_count=len(newly_earned),
    )


@router.post("/me/equip", response_model=UserBadgeResponse)
async def equip_badge(
    body: BadgeEquipRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserBadge)
        .where(UserBadge.user_id == current_user.id, UserBadge.badge_id == body.badge_id)
        .options(selectinload(UserBadge.badge))
    )
    user_badge = result.scalar_one_or_none()
    if not user_badge:
        raise HTTPException(status_code=404, detail="Badge not earned yet")

    # 기존 장착 해제
    all_badges = await db.execute(
        select(UserBadge).where(UserBadge.user_id == current_user.id, UserBadge.is_equipped == True)
    )
    for b in all_badges.scalars().all():
        b.is_equipped = False
        db.add(b)

    user_badge.is_equipped = True
    db.add(user_badge)
    await db.flush()
    return user_badge
