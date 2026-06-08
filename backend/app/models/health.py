"""
일별 헬스 지표 DB 모델
- DailyHealthMetrics: HealthKit / Health Connect 에서 동기화된 날짜별 집계 데이터
  (걸음수, 활동 칼로리, 심박수)
"""
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, SmallInteger, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DailyHealthMetrics(Base):
    __tablename__ = "daily_health_metrics"
    __table_args__ = (
        # 같은 날짜·소스의 재동기화는 upsert 처리 — 중복 방지
        UniqueConstraint("user_id", "date", "source", name="uq_user_date_source"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    date: Mapped[date] = mapped_column(Date, nullable=False)

    # 활동량
    steps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    active_calories_kcal: Mapped[float | None] = mapped_column(Float, nullable=True)

    # 심박수
    resting_heart_rate_bpm: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_heart_rate_bpm: Mapped[float | None] = mapped_column(Float, nullable=True)

    # 2=apple_health(HealthKit), 3=galaxy_health(Health Connect)
    source: Mapped[int] = mapped_column(SmallInteger, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="daily_health_metrics")  # type: ignore[name-defined]
