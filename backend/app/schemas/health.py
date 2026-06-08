from datetime import date

from pydantic import BaseModel, Field


class DailyMetricsSyncItem(BaseModel):
    """헬스 앱에서 받은 하루치 집계 데이터."""
    date: date
    steps: int | None = Field(None, ge=0)
    active_calories_kcal: float | None = Field(None, ge=0)
    resting_heart_rate_bpm: float | None = Field(None, ge=20, le=250)
    avg_heart_rate_bpm: float | None = Field(None, ge=20, le=250)
    # 2=apple_health(HealthKit), 3=galaxy_health(Health Connect)
    source: int = Field(ge=2, le=3)


class DailyMetricsSyncRequest(BaseModel):
    metrics: list[DailyMetricsSyncItem] = Field(min_length=1, max_length=90)


class DailyMetricsSyncResponse(BaseModel):
    upserted: int
    total: int


class TodayHealthStatsResponse(BaseModel):
    date: date
    steps: int | None
    active_calories_kcal: float | None
    resting_heart_rate_bpm: float | None
    avg_heart_rate_bpm: float | None
