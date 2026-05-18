from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from app.models.sleep import SleepQuality


class SleepRecordCreate(BaseModel):
    sleep_start: datetime
    sleep_end: datetime
    quality: SleepQuality | None = None
    deep_sleep_minutes: int | None = Field(None, ge=0)
    rem_sleep_minutes: int | None = Field(None, ge=0)
    light_sleep_minutes: int | None = Field(None, ge=0)
    awake_minutes: int | None = Field(None, ge=0)
    heart_rate_avg: float | None = Field(None, ge=30, le=200)
    hrv_ms: float | None = Field(None, ge=0)
    memo: str | None = Field(None, max_length=500)
    source: int | None = Field(None, ge=1, le=3)  # 1=manual, 2=apple, 3=galaxy

    @model_validator(mode="after")
    def end_after_start(self):
        if self.sleep_end <= self.sleep_start:
            raise ValueError("sleep_end must be after sleep_start")
        return self

    @property
    def duration_minutes(self) -> int:
        delta = self.sleep_end - self.sleep_start
        return int(delta.total_seconds() / 60)


class SleepRecordResponse(BaseModel):
    id: int
    sleep_start: datetime
    sleep_end: datetime
    duration_minutes: int
    quality: SleepQuality | None
    quality_score: float | None
    deep_sleep_minutes: int | None
    rem_sleep_minutes: int | None
    light_sleep_minutes: int | None
    awake_minutes: int | None
    heart_rate_avg: float | None
    hrv_ms: float | None
    memo: str | None
    source: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class SleepStatResponse(BaseModel):
    avg_duration_minutes: float
    avg_quality_score: float | None
    total_records: int
    period_days: int
