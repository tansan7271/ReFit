from pydantic import BaseModel, Field

from app.models.notification import DevicePlatform


class PushTokenRegister(BaseModel):
    token: str = Field(min_length=10, max_length=512)
    platform: DevicePlatform


class NotificationSettingUpdate(BaseModel):
    workout_reminder: bool | None = None
    workout_reminder_time: str | None = Field(None, pattern=r"^\d{2}:\d{2}$")
    sleep_reminder: bool | None = None
    sleep_reminder_time: str | None = Field(None, pattern=r"^\d{2}:\d{2}$")
    friend_poke: bool | None = None
    achievement: bool | None = None
    ai_coaching: bool | None = None


class NotificationSettingResponse(BaseModel):
    workout_reminder: bool
    workout_reminder_time: str | None
    sleep_reminder: bool
    sleep_reminder_time: str | None
    friend_poke: bool
    achievement: bool
    ai_coaching: bool

    model_config = {"from_attributes": True}


class PushSendRequest(BaseModel):
    """직접 발송용 (내부 테스트/관리자 용도)"""
    user_id: int
    title: str = Field(max_length=100)
    body: str = Field(max_length=500)
    data: dict | None = None
