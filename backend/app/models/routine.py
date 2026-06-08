"""
루틴/습관 추적 DB 모델
- RoutineItem: 유저가 정의한 습관 항목
- RoutineLog: 날짜별 습관 수행 기록
"""
from datetime import date, datetime
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean, Date, DateTime, Enum, ForeignKey, Integer, String,
    UniqueConstraint, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class RoutineCategory(str, PyEnum):
    HEALTH = "health"         # 건강 (수분 섭취, 비타민 복용 등)
    FITNESS = "fitness"       # 피트니스 (스트레칭, 운동 준비 등)
    MENTAL = "mental"         # 정신 건강 (명상, 일기 등)
    DIET = "diet"             # 식단 (채소 먹기, 야식 금지 등)
    SLEEP = "sleep"           # 수면 (취침 루틴)
    OTHER = "other"           # 기타


class RoutineItem(Base):
    """유저가 정의한 습관/루틴 항목"""
    __tablename__ = "routine_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    title: Mapped[str] = mapped_column(String(100), nullable=False)
    emoji: Mapped[str] = mapped_column(String(10), default="✅", nullable=False)
    category: Mapped[RoutineCategory] = mapped_column(
        Enum(RoutineCategory), default=RoutineCategory.OTHER, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="routine_items")  # type: ignore[name-defined]
    logs: Mapped[list["RoutineLog"]] = relationship(
        back_populates="item", cascade="all, delete-orphan"
    )


class RoutineLog(Base):
    """날짜별 루틴 수행 기록 — 항목당 하루 하나"""
    __tablename__ = "routine_logs"
    __table_args__ = (
        UniqueConstraint("routine_item_id", "date", name="uq_routine_log_item_date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    routine_item_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("routine_items.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    item: Mapped["RoutineItem"] = relationship(back_populates="logs")
