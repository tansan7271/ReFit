from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.sleep import SleepRecord, SleepQuality
from app.schemas.sleep import SleepRecordCreate, SleepRecordResponse, SleepStatResponse

router = APIRouter(prefix="/sleep", tags=["Sleep"])

_QUALITY_SCORE_MAP = {
    SleepQuality.VERY_BAD: 20.0,
    SleepQuality.BAD: 40.0,
    SleepQuality.NORMAL: 60.0,
    SleepQuality.GOOD: 80.0,
    SleepQuality.VERY_GOOD: 100.0,
}


@router.post("", response_model=SleepRecordResponse, status_code=201)
async def create_sleep_record(
    body: SleepRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = SleepRecord(
        user_id=current_user.id,
        sleep_start=body.sleep_start,
        sleep_end=body.sleep_end,
        duration_minutes=body.duration_minutes,
        quality=body.quality,
        quality_score=_QUALITY_SCORE_MAP.get(body.quality) if body.quality else None,
        deep_sleep_minutes=body.deep_sleep_minutes,
        rem_sleep_minutes=body.rem_sleep_minutes,
        light_sleep_minutes=body.light_sleep_minutes,
        awake_minutes=body.awake_minutes,
        heart_rate_avg=body.heart_rate_avg,
        hrv_ms=body.hrv_ms,
        memo=body.memo,
        source=body.source,
    )
    db.add(record)
    await db.flush()
    return record


@router.get("", response_model=list[SleepRecordResponse])
async def get_sleep_history(
    limit: int = 14,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SleepRecord)
        .where(SleepRecord.user_id == current_user.id)
        .order_by(desc(SleepRecord.sleep_start))
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/stats", response_model=SleepStatResponse)
async def get_sleep_stats(
    days: int = 7,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import datetime, timedelta, timezone
    since = datetime.now(timezone.utc) - timedelta(days=days)

    result = await db.execute(
        select(
            func.count(SleepRecord.id),
            func.avg(SleepRecord.duration_minutes),
            func.avg(SleepRecord.quality_score),
        ).where(
            SleepRecord.user_id == current_user.id,
            SleepRecord.sleep_start >= since,
        )
    )
    count, avg_dur, avg_score = result.one()

    return SleepStatResponse(
        total_records=count or 0,
        avg_duration_minutes=round(avg_dur or 0, 1),
        avg_quality_score=round(avg_score, 1) if avg_score else None,
        period_days=days,
    )


@router.delete("/{record_id}", status_code=204)
async def delete_sleep_record(
    record_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SleepRecord).where(
            SleepRecord.id == record_id,
            SleepRecord.user_id == current_user.id,
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Sleep record not found")
    await db.delete(record)
