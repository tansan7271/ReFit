"""
뱃지(업적) 관련 DB 모델
- Badge: 뱃지 종류 마스터
- UserBadge: 유저가 획득한 뱃지
"""
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class BadgeCategory(str, PyEnum):
    WORKOUT = "workout"         # 운동 달성
    SLEEP = "sleep"             # 수면 달성
    STREAK = "streak"           # 연속 달성
    SOCIAL = "social"           # 소셜/친구
    SPECIAL = "special"         # 특별 뱃지


class BadgeConditionType(str, PyEnum):
    WORKOUT_COUNT = "workout_count"         # 운동 N회
    WORKOUT_STREAK = "workout_streak"       # 연속 N일 운동
    TOTAL_VOLUME = "total_volume"           # 총 볼륨 N kg
    SLEEP_DAYS = "sleep_days"               # 수면 기록 N일
    SLEEP_STREAK = "sleep_streak"           # 연속 N일 수면 기록
    FRIEND_COUNT = "friend_count"           # 친구 N명
    POKE_SENT = "poke_sent"                 # 콕찌르기 N회


class Badge(Base):
    __tablename__ = "badges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    emoji: Mapped[str] = mapped_column(String(10), nullable=False)
    category: Mapped[BadgeCategory] = mapped_column(Enum(BadgeCategory), nullable=False, index=True)
    condition_type: Mapped[BadgeConditionType] = mapped_column(
        Enum(BadgeConditionType), nullable=False
    )
    condition_value: Mapped[int] = mapped_column(Integer, nullable=False)  # 조건 달성 수치
    xp_reward: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    user_badges: Mapped[list["UserBadge"]] = relationship(back_populates="badge")


class UserBadge(Base):
    __tablename__ = "user_badges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    badge_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("badges.id"), nullable=False
    )
    is_equipped: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    earned_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="user_badges")  # type: ignore[name-defined]
    badge: Mapped["Badge"] = relationship(back_populates="user_badges")
