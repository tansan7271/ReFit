from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.workout import (
    Exercise, WorkoutPlan, WorkoutPlanExercise,
    WorkoutSession, WorkoutSet, SessionStatus,
)
from app.schemas.workout import (
    ExerciseResponse,
    WorkoutPlanCreate, WorkoutPlanUpdate, WorkoutPlanResponse,
    SessionStartRequest, SessionCompleteRequest,
    WorkoutSessionResponse, WorkoutSessionSummary,
)

router = APIRouter(prefix="/workouts", tags=["Workouts"])


# ── Exercise Master ────────────────────────────────────────────────────────────

@router.get("/exercises", response_model=list[ExerciseResponse])
async def list_exercises(
    muscle_group: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = select(Exercise).where(Exercise.is_active == True)
    if muscle_group:
        query = query.where(Exercise.muscle_group == muscle_group)
    result = await db.execute(query.order_by(Exercise.name))
    return result.scalars().all()


# ── Weekly Plan ────────────────────────────────────────────────────────────────

@router.get("/plans", response_model=list[WorkoutPlanResponse])
async def get_my_plans(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WorkoutPlan)
        .where(WorkoutPlan.user_id == current_user.id)
        .options(
            selectinload(WorkoutPlan.plan_exercises).selectinload(WorkoutPlanExercise.exercise)
        )
        .order_by(WorkoutPlan.day_of_week)
    )
    return result.scalars().all()


@router.post("/plans", response_model=WorkoutPlanResponse, status_code=201)
async def create_plan(
    body: WorkoutPlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = WorkoutPlan(
        user_id=current_user.id,
        day_of_week=body.day_of_week,
        name=body.name,
        is_rest_day=body.is_rest_day,
    )
    db.add(plan)
    await db.flush()

    for ex in body.exercises:
        db.add(WorkoutPlanExercise(plan_id=plan.id, **ex.model_dump()))

    await db.flush()
    await db.refresh(plan, ["plan_exercises"])
    return plan


@router.patch("/plans/{plan_id}", response_model=WorkoutPlanResponse)
async def update_plan(
    plan_id: int,
    body: WorkoutPlanUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WorkoutPlan)
        .where(WorkoutPlan.id == plan_id, WorkoutPlan.user_id == current_user.id)
        .options(selectinload(WorkoutPlan.plan_exercises))
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    if body.name is not None:
        plan.name = body.name
    if body.is_rest_day is not None:
        plan.is_rest_day = body.is_rest_day

    if body.exercises is not None:
        # 기존 운동 목록 교체
        for pe in plan.plan_exercises:
            await db.delete(pe)
        await db.flush()
        for ex in body.exercises:
            db.add(WorkoutPlanExercise(plan_id=plan.id, **ex.model_dump()))

    db.add(plan)
    await db.flush()
    await db.refresh(plan, ["plan_exercises"])
    return plan


@router.delete("/plans/{plan_id}", status_code=204)
async def delete_plan(
    plan_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WorkoutPlan).where(WorkoutPlan.id == plan_id, WorkoutPlan.user_id == current_user.id)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    await db.delete(plan)


# ── Session ────────────────────────────────────────────────────────────────────

@router.post("/sessions/start", response_model=WorkoutSessionResponse, status_code=201)
async def start_session(
    body: SessionStartRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = WorkoutSession(
        user_id=current_user.id,
        plan_id=body.plan_id,
        started_at=body.started_at or datetime.now(timezone.utc),
        status=SessionStatus.IN_PROGRESS,
    )
    db.add(session)
    await db.flush()
    await db.refresh(session, ["sets"])
    return session


@router.post("/sessions/{session_id}/complete", response_model=WorkoutSessionResponse)
async def complete_session(
    session_id: int,
    body: SessionCompleteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WorkoutSession)
        .where(
            WorkoutSession.id == session_id,
            WorkoutSession.user_id == current_user.id,
            WorkoutSession.status == SessionStatus.IN_PROGRESS,
        )
        .options(selectinload(WorkoutSession.sets).selectinload(WorkoutSet.exercise))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Active session not found")

    now = datetime.now(timezone.utc)
    session.ended_at = now
    session.status = SessionStatus.COMPLETED
    session.total_duration_sec = int((now - session.started_at.replace(tzinfo=timezone.utc)).total_seconds())
    session.voice_memo = body.voice_memo
    session.calories_burned = body.calories_burned

    total_volume = 0.0
    for s in body.sets:
        ws = WorkoutSet(
            session_id=session.id,
            exercise_id=s.exercise_id,
            set_number=s.set_number,
            reps=s.reps,
            weight_kg=s.weight_kg,
            duration_sec=s.duration_sec,
            is_completed=s.is_completed,
            completed_at=now if s.is_completed else None,
        )
        db.add(ws)
        if s.reps and s.weight_kg:
            total_volume += s.reps * s.weight_kg

    session.total_volume_kg = total_volume or None
    # XP: 완료 세트 × 10 + 기본 50
    xp = 50 + sum(1 for s in body.sets if s.is_completed) * 10
    session.xp_earned = xp
    current_user.character_xp += xp
    current_user.character_level = 1 + current_user.character_xp // 500

    db.add(session)
    db.add(current_user)
    await db.flush()
    await db.refresh(session, ["sets"])
    return session


@router.get("/sessions", response_model=list[WorkoutSessionSummary])
async def get_session_history(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WorkoutSession)
        .where(WorkoutSession.user_id == current_user.id)
        .order_by(desc(WorkoutSession.started_at))
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/sessions/{session_id}", response_model=WorkoutSessionResponse)
async def get_session_detail(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WorkoutSession)
        .where(WorkoutSession.id == session_id, WorkoutSession.user_id == current_user.id)
        .options(selectinload(WorkoutSession.sets).selectinload(WorkoutSet.exercise))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session
