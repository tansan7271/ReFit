from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.sleep import SleepRecord, SleepQuality
from app.schemas.sleep import (
    SleepRecordCreate, SleepRecordResponse, SleepStatResponse,
    SleepSyncRequest, SleepSyncResponse, SleepAnalysisResponse,
)
from app.services.gemini_service import gemini_service

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


@router.post("/sync", response_model=SleepSyncResponse, status_code=200)
async def sync_sleep_records(
    body: SleepSyncRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """헬스 앱(HealthKit / Health Connect) 수면 데이터 벌크 동기화.

    모바일 클라이언트가 동일 데이터를 재동기화해도 안전하도록 멱등 처리한다.
    중복 판정 기준: (user_id, sleep_start, source) — 같은 세션을 다시 보내면 건너뛴다.
    """
    # 이미 저장된 (sleep_start, source) 조합을 한 번에 조회해 중복 판정
    existing_result = await db.execute(
        select(SleepRecord.sleep_start, SleepRecord.source).where(
            SleepRecord.user_id == current_user.id,
            SleepRecord.sleep_start.in_([item.sleep_start for item in body.records]),
        )
    )
    existing_keys = {(row[0], row[1]) for row in existing_result.all()}

    created = 0
    seen_in_batch: set[tuple] = set()
    for item in body.records:
        key = (item.sleep_start, item.source)
        # DB에 이미 있거나 같은 요청 안에서 중복된 경우 건너뜀
        if key in existing_keys or key in seen_in_batch:
            continue
        seen_in_batch.add(key)

        db.add(SleepRecord(
            user_id=current_user.id,
            sleep_start=item.sleep_start,
            sleep_end=item.sleep_end,
            duration_minutes=item.duration_minutes,
            deep_sleep_minutes=item.deep_sleep_minutes,
            rem_sleep_minutes=item.rem_sleep_minutes,
            light_sleep_minutes=item.light_sleep_minutes,
            awake_minutes=item.awake_minutes,
            heart_rate_avg=item.heart_rate_avg,
            hrv_ms=item.hrv_ms,
            source=item.source,
        ))
        created += 1

    await db.flush()
    total = len(body.records)
    return SleepSyncResponse(created=created, skipped=total - created, total=total)


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


@router.get("/analysis", response_model=SleepAnalysisResponse)
async def get_sleep_analysis(
    days: int = 7,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """최근 수면 통계 기반 Gemini AI 분석 메시지."""
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
    avg_dur = avg_dur or 0.0
    goal_hours = (current_user.sleep_goal_minutes / 60) if current_user.sleep_goal_minutes else None

    ai_message = await gemini_service.sleep_analysis_message(
        nickname=current_user.nickname,
        avg_duration_hours=avg_dur / 60,
        avg_quality_score=avg_score,
        goal_hours=goal_hours,
    )
    return SleepAnalysisResponse(
        ai_message=ai_message,
        avg_duration_minutes=round(avg_dur, 1),
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
        raise HTTPException(status_code=404, detail="수면 기록을 찾을 수 없어요")
    await db.delete(record)
