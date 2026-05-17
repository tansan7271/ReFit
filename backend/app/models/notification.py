"""
푸시 알림 관련 DB 모델
- PushToken: FCM 디바이스 토큰 (기기별 저장)
- NotificationSetting: 유저별 알림 수신 설정
"""
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DevicePlatform(str, PyEnum):
    IOS = "ios"
    ANDROID = "android"


class PushToken(Base):
    __tablename__ = "push_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token: Mapped[str] = mapped_column(String(512), nullable=False, unique=True)
    platform: Mapped[DevicePlatform] = mapped_column(Enum(DevicePlatform), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="push_tokens")  # type: ignore[name-defined]


class NotificationSetting(Base):
    """유저별 푸시 알림 수신 설정"""
    __tablename__ = "notification_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )

    # 운동 알림
    workout_reminder: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    workout_reminder_time: Mapped[str | None] = mapped_column(
        String(5), nullable=True
    )  # "HH:MM" 형식

    # 수면 알림
    sleep_reminder: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sleep_reminder_time: Mapped[str | None] = mapped_column(String(5), nullable=True)

    # 소셜 알림
    friend_poke: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    achievement: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # AI 코칭 알림
    ai_coaching: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="notification_setting")  # type: ignore[name-defined]
