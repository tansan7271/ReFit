"""
운동 관련 DB 모델
- Exercise: 운동 종목 마스터 데이터
- WorkoutPlan: 유저별 요일 루틴 설정
- WorkoutPlanExercise: 루틴 안의 세부 운동 목록
- WorkoutSession: 실제 운동 세션 (시작~종료 기록)
- WorkoutSet: 세션 내 세트별 수행 기록
"""
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean, DateTime, Enum, Float, Integer, SmallInteger,
    String, Text, ForeignKey, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class MuscleGroup(str, PyEnum):
    CHEST = "chest"             # 가슴
    BACK = "back"               # 등
    SHOULDERS = "shoulders"     # 어깨
    BICEPS = "biceps"           # 이두
    TRICEPS = "triceps"         # 삼두
    FOREARMS = "forearms"       # 전완
    CORE = "core"               # 코어/복근
    GLUTES = "glutes"           # 둔근
    QUADS = "quads"             # 대퇴사두
    HAMSTRINGS = "hamstrings"   # 햄스트링
    CALVES = "calves"           # 종아리
    FULL_BODY = "full_body"     # 전신


class ExerciseCategory(str, PyEnum):
    WEIGHT = "weight"           # 웨이트 트레이닝
    CARDIO = "cardio"           # 유산소
    STRETCHING = "stretching"   # 스트레칭
    BODYWEIGHT = "bodyweight"   # 맨몸 운동


class SessionStatus(str, PyEnum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Exercise(Base):
    """운동 종목 마스터 테이블"""
    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    name_en: Mapped[str | None] = mapped_column(String(100), nullable=True)
    muscle_group: Mapped[MuscleGroup] = mapped_column(Enum(MuscleGroup), nullable=False, index=True)
    category: Mapped[ExerciseCategory] = mapped_column(Enum(ExerciseCategory), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    emoji: Mapped[str] = mapped_column(String(10), default="💪", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)

    plan_exercises: Mapped[list["WorkoutPlanExercise"]] = relationship(back_populates="exercise")
    workout_sets: Mapped[list["WorkoutSet"]] = relationship(back_populates="exercise")


class WorkoutPlan(Base):
    """유저 주간 루틴 — 요일(0=월 ~ 6=일)별 계획"""
    __tablename__ = "workout_plans"
    __table_args__ = (
        UniqueConstraint("user_id", "day_of_week", name="uq_user_plan_day"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    day_of_week: Mapped[int] = mapped_column(SmallInteger, nullable=False)  # 0=Mon ~ 6=Sun
    name: Mapped[str | None] = mapped_column(String(100), nullable=True)    # 예: "등·이두 데이"
    is_rest_day: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    planned_time: Mapped[str | None] = mapped_column(String(5), nullable=True)  # "HH:MM" UTC
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, onupdate=datetime.now, nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="workout_plans")  # type: ignore[name-defined]
    plan_exercises: Mapped[list["WorkoutPlanExercise"]] = relationship(
        back_populates="plan", cascade="all, delete-orphan", order_by="WorkoutPlanExercise.order"
    )
    sessions: Mapped[list["WorkoutSession"]] = relationship(back_populates="plan")


class WorkoutPlanExercise(Base):
    """루틴 안의 세부 운동 항목"""
    __tablename__ = "workout_plan_exercises"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    plan_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("workout_plans.id", ondelete="CASCADE"), nullable=False, index=True
    )
    exercise_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("exercises.id"), nullable=False
    )
    order: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)
    target_sets: Mapped[int] = mapped_column(SmallInteger, default=3, nullable=False)
    target_reps: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    target_weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    target_duration_sec: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 유산소용

    plan: Mapped["WorkoutPlan"] = relationship(back_populates="plan_exercises")
    exercise: Mapped["Exercise"] = relationship(back_populates="plan_exercises")


class WorkoutSession(Base):
    """실제 운동 세션 기록"""
    __tablename__ = "workout_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    plan_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("workout_plans.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[SessionStatus] = mapped_column(
        Enum(SessionStatus), default=SessionStatus.IN_PROGRESS, nullable=False
    )

    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    total_duration_sec: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_volume_kg: Mapped[float | None] = mapped_column(Float, nullable=True)  # 총 볼륨(kg)
    calories_burned: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ai_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    completed_parts: Mapped[str | None] = mapped_column(String(200), nullable=True)  # 쉼표 구분: "chest,back"
    voice_memo: Mapped[str | None] = mapped_column(Text, nullable=True)
    xp_earned: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)

    user: Mapped["User"] = relationship(back_populates="workout_sessions")  # type: ignore[name-defined]
    plan: Mapped["WorkoutPlan | None"] = relationship(back_populates="sessions")
    sets: Mapped[list["WorkoutSet"]] = relationship(
        back_populates="session", cascade="all, delete-orphan", order_by="WorkoutSet.id"
    )


class WorkoutSet(Base):
    """세션 내 세트별 수행 기록"""
    __tablename__ = "workout_sets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("workout_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    exercise_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("exercises.id"), nullable=False
    )
    set_number: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    reps: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    duration_sec: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 유산소/타임기반
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    session: Mapped["WorkoutSession"] = relationship(back_populates="sets")
    exercise: Mapped["Exercise"] = relationship(back_populates="workout_sets")
