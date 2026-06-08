"""
유저 관련 DB 모델
- User: 계정 정보, 프로필, 캐릭터 상태
- UserInBody: 체성분 측정 이력 (인바디 데이터)
"""
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean, DateTime, Enum, Float, Integer, String, Text,
    ForeignKey, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Gender(str, PyEnum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class FitnessLevel(str, PyEnum):
    BEGINNER = "beginner"       # 초보자
    INTERMEDIATE = "intermediate"  # 중급자
    ADVANCED = "advanced"       # 상급자
    ATHLETE = "athlete"         # 운동선수급


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    nickname: Mapped[str] = mapped_column(String(50), nullable=False)

    # 기본 신체 정보
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gender: Mapped[Gender | None] = mapped_column(Enum(Gender), nullable=True)
    height_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)

    # 피트니스 설정
    fitness_level: Mapped[FitnessLevel] = mapped_column(
        Enum(FitnessLevel), default=FitnessLevel.BEGINNER, nullable=False
    )
    goal: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )  # 목표: 체중감량, 근육증가, 체력향상 등

    # 수면 목표 — 온보딩에서 설정하는 목표 취침/기상 시각 ("HH:MM", 로컬 기준)
    sleep_goal_bedtime: Mapped[str | None] = mapped_column(String(5), nullable=True)
    sleep_goal_wakeup: Mapped[str | None] = mapped_column(String(5), nullable=True)
    sleep_goal_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 목표 수면 시간(분)

    # 캐릭터 정보 (게임화 요소)
    character_emoji: Mapped[str] = mapped_column(String(10), default="🐣", nullable=False)
    character_level: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    character_xp: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    is_onboarding_complete: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    inbody_records: Mapped[list["UserInBody"]] = relationship(
        back_populates="user", order_by="desc(UserInBody.measured_at)"
    )
    workout_plans: Mapped[list["WorkoutPlan"]] = relationship(back_populates="user")  # type: ignore[name-defined]
    workout_sessions: Mapped[list["WorkoutSession"]] = relationship(back_populates="user")  # type: ignore[name-defined]
    sleep_records: Mapped[list["SleepRecord"]] = relationship(back_populates="user")  # type: ignore[name-defined]
    user_badges: Mapped[list["UserBadge"]] = relationship(back_populates="user")  # type: ignore[name-defined]
    push_tokens: Mapped[list["PushToken"]] = relationship(back_populates="user")  # type: ignore[name-defined]
    notification_setting: Mapped["NotificationSetting"] = relationship(back_populates="user", uselist=False)  # type: ignore[name-defined]
    diet_records: Mapped[list["DietRecord"]] = relationship(back_populates="user")  # type: ignore[name-defined]
    routine_items: Mapped[list["RoutineItem"]] = relationship(back_populates="user")  # type: ignore[name-defined]
    daily_health_metrics: Mapped[list["DailyHealthMetrics"]] = relationship(back_populates="user")  # type: ignore[name-defined]


class UserInBody(Base):
    """체성분 측정 이력 — 날짜별로 스냅샷 저장"""
    __tablename__ = "user_inbody"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    body_fat_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    muscle_mass_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    body_water_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    bmi: Mapped[float | None] = mapped_column(Float, nullable=True)
    visceral_fat_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    memo: Mapped[str | None] = mapped_column(Text, nullable=True)

    measured_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="inbody_records")
