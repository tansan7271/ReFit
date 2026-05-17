"""
수면 기록 DB 모델
- SleepRecord: 취침~기상 시간, 수면 품질 등 일별 수면 데이터
"""
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, SmallInteger, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SleepQuality(str, PyEnum):
    VERY_BAD = "very_bad"       # 매우 나쁨
    BAD = "bad"                 # 나쁨
    NORMAL = "normal"           # 보통
    GOOD = "good"               # 좋음
    VERY_GOOD = "very_good"     # 매우 좋음


class SleepRecord(Base):
    __tablename__ = "sleep_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    sleep_start: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    sleep_end: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)

    # 수면 품질 지표
    quality: Mapped[SleepQuality | None] = mapped_column(Enum(SleepQuality), nullable=True)
    quality_score: Mapped[float | None] = mapped_column(Float, nullable=True)  # 0~100

    # 수면 단계 (헬스킷/갤럭시헬스 연동 시 활용)
    deep_sleep_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rem_sleep_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    light_sleep_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    awake_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # 컨텍스트 (운동 전날 수면 → AI 추천에 활용)
    heart_rate_avg: Mapped[float | None] = mapped_column(Float, nullable=True)
    hrv_ms: Mapped[float | None] = mapped_column(Float, nullable=True)  # 심박변이도

    memo: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str | None] = mapped_column(
        SmallInteger, nullable=True
    )  # 1=manual, 2=apple_health, 3=galaxy_health

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="sleep_records")  # type: ignore[name-defined]
