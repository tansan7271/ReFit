from datetime import datetime, timezone

from pydantic import BaseModel, Field, model_validator


def _to_utc_naive(dt: datetime) -> datetime:
    """타임존 있는 datetime을 UTC naive로 변환. 이미 naive면 그대로 반환."""
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt.replace(microsecond=0)  # 초 단위로 자름 — DB 비교 일관성 확보

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


# ── Health App Sync (HealthKit / Health Connect) ───────────────────────────────

class SleepSyncItem(BaseModel):
    """헬스 앱에서 받은 단일 수면 세션."""
    sleep_start: datetime
    sleep_end: datetime
    deep_sleep_minutes: int | None = Field(None, ge=0)
    rem_sleep_minutes: int | None = Field(None, ge=0)
    light_sleep_minutes: int | None = Field(None, ge=0)
    awake_minutes: int | None = Field(None, ge=0)
    heart_rate_avg: float | None = Field(None, ge=30, le=200)
    hrv_ms: float | None = Field(None, ge=0)
    # 2=apple_health(HealthKit), 3=galaxy_health(Health Connect)
    source: int = Field(ge=2, le=3)

    @model_validator(mode="after")
    def normalise_and_validate(self):
        # 타임존 제거 + 초 단위 정규화 → DB 중복 판정이 정확해짐
        self.sleep_start = _to_utc_naive(self.sleep_start)
        self.sleep_end = _to_utc_naive(self.sleep_end)
        if self.sleep_end <= self.sleep_start:
            raise ValueError("sleep_end must be after sleep_start")
        return self

    @property
    def duration_minutes(self) -> int:
        return int((self.sleep_end - self.sleep_start).total_seconds() / 60)


class SleepSyncRequest(BaseModel):
    """헬스 앱 초기 동기화/재동기화용 벌크 페이로드."""
    records: list[SleepSyncItem] = Field(min_length=1, max_length=200)


class SleepSyncResponse(BaseModel):
    created: int   # 신규 저장된 레코드 수
    skipped: int   # 이미 존재해서 건너뛴 레코드 수 (멱등 처리)
    total: int     # 요청에 포함된 전체 레코드 수


class SleepAnalysisResponse(BaseModel):
    ai_message: str
    avg_duration_minutes: float
    avg_quality_score: float | None
    period_days: int
