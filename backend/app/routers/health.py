from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.dialects.mysql import insert as mysql_insert

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.health import DailyHealthMetrics
from app.schemas.health import (
    DailyMetricsSyncRequest,
    DailyMetricsSyncResponse,
    TodayHealthStatsResponse,
)

router = APIRouter(prefix="/health", tags=["Health"])


@router.post("/sync", response_model=DailyMetricsSyncResponse)
async def sync_daily_metrics(
    body: DailyMetricsSyncRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """HealthKit / Health Connect 일별 집계 데이터 동기화.

    같은 (user_id, date, source) 조합이 이미 있으면 최신 값으로 덮어쓴다 (upsert).
    최대 90일치를 한 번에 전송할 수 있다.
    """
    rows = [
        {
            "user_id": current_user.id,
            "date": item.date,
            "steps": item.steps,
            "active_calories_kcal": item.active_calories_kcal,
            "resting_heart_rate_bpm": item.resting_heart_rate_bpm,
            "avg_heart_rate_bpm": item.avg_heart_rate_bpm,
            "source": item.source,
        }
        for item in body.metrics
    ]

    stmt = mysql_insert(DailyHealthMetrics).values(rows)
    stmt = stmt.on_duplicate_key_update(
        steps=stmt.inserted.steps,
        active_calories_kcal=stmt.inserted.active_calories_kcal,
        resting_heart_rate_bpm=stmt.inserted.resting_heart_rate_bpm,
        avg_heart_rate_bpm=stmt.inserted.avg_heart_rate_bpm,
    )
    await db.execute(stmt)
    await db.flush()

    return DailyMetricsSyncResponse(upserted=len(rows), total=len(rows))


@router.get("/stats/today", response_model=TodayHealthStatsResponse)
async def get_today_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """오늘 날짜의 헬스 지표 조회. 소스가 여러 개면 가장 최근 동기화 기준."""
    today = date.today()
    result = await db.execute(
        select(DailyHealthMetrics)
        .where(
            DailyHealthMetrics.user_id == current_user.id,
            DailyHealthMetrics.date == today,
        )
        .order_by(DailyHealthMetrics.id.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()

    if row is None:
        return TodayHealthStatsResponse(
            date=today,
            steps=None,
            active_calories_kcal=None,
            resting_heart_rate_bpm=None,
            avg_heart_rate_bpm=None,
        )

    return TodayHealthStatsResponse(
        date=row.date,
        steps=row.steps,
        active_calories_kcal=row.active_calories_kcal,
        resting_heart_rate_bpm=row.resting_heart_rate_bpm,
        avg_heart_rate_bpm=row.avg_heart_rate_bpm,
    )
