from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.notification import PushToken, NotificationSetting
from app.schemas.notification import (
    PushTokenRegister, NotificationSettingUpdate, NotificationSettingResponse,
)
from app.services.fcm_service import fcm_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.post("/token", status_code=201)
async def register_push_token(
    body: PushTokenRegister,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(PushToken).where(PushToken.token == body.token))
    token = result.scalar_one_or_none()

    if token:
        token.user_id = current_user.id
        token.platform = body.platform
        token.is_active = True
    else:
        token = PushToken(
            user_id=current_user.id,
            token=body.token,
            platform=body.platform,
        )
    db.add(token)
    return {"message": "Token registered"}


@router.delete("/token/{token}", status_code=204)
async def deregister_push_token(
    token: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PushToken).where(PushToken.token == token, PushToken.user_id == current_user.id)
    )
    push_token = result.scalar_one_or_none()
    if not push_token:
        raise HTTPException(status_code=404, detail="Token not found")
    push_token.is_active = False
    db.add(push_token)


@router.get("/settings", response_model=NotificationSettingResponse)
async def get_notification_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(NotificationSetting).where(NotificationSetting.user_id == current_user.id)
    )
    setting = result.scalar_one_or_none()
    if not setting:
        setting = NotificationSetting(user_id=current_user.id)
        db.add(setting)
        await db.flush()
    return setting


@router.patch("/settings", response_model=NotificationSettingResponse)
async def update_notification_settings(
    body: NotificationSettingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(NotificationSetting).where(NotificationSetting.user_id == current_user.id)
    )
    setting = result.scalar_one_or_none()
    if not setting:
        setting = NotificationSetting(user_id=current_user.id)
        db.add(setting)

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(setting, field, value)

    db.add(setting)
    return setting


@router.post("/send/workout-reminder")
async def send_workout_reminder(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """운동 알림 발송 — 인증된 본인에게만 발송 (IDOR 방지)."""
    result = await db.execute(
        select(PushToken).where(
            PushToken.user_id == current_user.id, PushToken.is_active == True
        )
    )
    tokens = result.scalars().all()
    if not tokens:
        raise HTTPException(status_code=404, detail="No active push tokens")

    for token in tokens:
        await fcm_service.send(
            token=token.token,
            title="운동할 시간이에요! 💪",
            body="오늘 루틴을 시작해볼까요? 캐릭터가 기다리고 있어요.",
            data={"type": "workout_reminder"},
        )

    return {"sent": len(tokens)}
