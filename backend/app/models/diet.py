"""
식단 기록 DB 모델
- DietRecord: 끼니별 식사 기록 (하루 여러 개 가능)
- DietFood: 식사 기록 내 개별 음식 항목
"""
from datetime import date, datetime
from enum import Enum as PyEnum

from sqlalchemy import Date, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class MealType(str, PyEnum):
    BREAKFAST = "breakfast"   # 아침
    LUNCH = "lunch"           # 점심
    DINNER = "dinner"         # 저녁
    SNACK = "snack"           # 간식


class DietRecord(Base):
    """끼니 단위 식사 기록"""
    __tablename__ = "diet_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    meal_type: Mapped[MealType] = mapped_column(Enum(MealType), nullable=False)

    # 영양 합계 (foods 합산이 기본이지만, 빠른 입력용 직접 입력도 허용)
    total_calories: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    protein_g: Mapped[float | None] = mapped_column(Float, nullable=True)
    carbs_g: Mapped[float | None] = mapped_column(Float, nullable=True)
    fat_g: Mapped[float | None] = mapped_column(Float, nullable=True)

    memo: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, onupdate=datetime.now, nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="diet_records")  # type: ignore[name-defined]
    foods: Mapped[list["DietFood"]] = relationship(
        back_populates="record", cascade="all, delete-orphan"
    )


class DietFood(Base):
    """식사 기록 내 개별 음식 항목"""
    __tablename__ = "diet_foods"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    record_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("diet_records.id", ondelete="CASCADE"), nullable=False, index=True
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    quantity_g: Mapped[float] = mapped_column(Float, nullable=False, default=100.0)  # 섭취량(g)
    calories: Mapped[float] = mapped_column(Float, nullable=False)
    protein_g: Mapped[float | None] = mapped_column(Float, nullable=True)
    carbs_g: Mapped[float | None] = mapped_column(Float, nullable=True)
    fat_g: Mapped[float | None] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)

    record: Mapped["DietRecord"] = relationship(back_populates="foods")
