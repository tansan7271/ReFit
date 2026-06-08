from datetime import datetime

from pydantic import BaseModel, Field

from app.models.workout import ExerciseCategory, MuscleGroup, SessionStatus


# ── Exercise Master ────────────────────────────────────────────────────────────

class ExerciseResponse(BaseModel):
    id: int
    name: str
    name_en: str | None
    muscle_group: MuscleGroup
    category: ExerciseCategory
    description: str | None
    emoji: str

    model_config = {"from_attributes": True}


# ── Workout Plan ───────────────────────────────────────────────────────────────

class PlanExerciseCreate(BaseModel):
    exercise_id: int
    order: int = 0
    target_sets: int = Field(default=3, ge=1, le=20)
    target_reps: int | None = Field(None, ge=1, le=200)
    target_weight_kg: float | None = Field(None, ge=0, le=500)
    target_duration_sec: int | None = Field(None, ge=1)


class PlanExerciseResponse(BaseModel):
    id: int
    exercise_id: int
    exercise: ExerciseResponse
    order: int
    target_sets: int
    target_reps: int | None
    target_weight_kg: float | None
    target_duration_sec: int | None

    model_config = {"from_attributes": True}


class WorkoutPlanCreate(BaseModel):
    day_of_week: int = Field(ge=0, le=6)  # 0=월 ~ 6=일
    name: str | None = Field(None, max_length=100)
    is_rest_day: bool = False
    planned_time: str | None = Field(None, pattern=r"^\d{2}:\d{2}$")  # "HH:MM" KST
    exercises: list[PlanExerciseCreate] = []


class WorkoutPlanUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    is_rest_day: bool | None = None
    planned_time: str | None = Field(None, pattern=r"^\d{2}:\d{2}$")  # "HH:MM" KST
    exercises: list[PlanExerciseCreate] | None = None


class WorkoutPlanResponse(BaseModel):
    id: int
    day_of_week: int
    name: str | None
    is_rest_day: bool
    planned_time: str | None
    plan_exercises: list[PlanExerciseResponse]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Workout Session ────────────────────────────────────────────────────────────

class WorkoutSetCreate(BaseModel):
    exercise_id: int
    set_number: int = Field(ge=1)
    reps: int | None = Field(None, ge=0)
    weight_kg: float | None = Field(None, ge=0)
    duration_sec: int | None = Field(None, ge=0)
    is_completed: bool = True


class WorkoutSetResponse(BaseModel):
    id: int
    exercise_id: int
    exercise: ExerciseResponse
    set_number: int
    reps: int | None
    weight_kg: float | None
    duration_sec: int | None
    is_completed: bool
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class SessionStartRequest(BaseModel):
    plan_id: int | None = None
    started_at: datetime | None = None


class SessionCompleteRequest(BaseModel):
    sets: list[WorkoutSetCreate] = []
    voice_memo: str | None = Field(None, max_length=2000)
    calories_burned: int | None = Field(None, ge=0)
    completed_parts: list[str] = []  # 완료한 운동 부위 키: ["chest", "back"]


class SessionUpdatePartsRequest(BaseModel):
    completed_parts: list[str] = []


class WorkoutSessionResponse(BaseModel):
    id: int
    user_id: int
    plan_id: int | None
    status: SessionStatus
    started_at: datetime
    ended_at: datetime | None
    total_duration_sec: int | None
    total_volume_kg: float | None
    calories_burned: int | None
    ai_feedback: str | None
    completed_parts: str | None
    voice_memo: str | None
    xp_earned: int
    sets: list[WorkoutSetResponse]
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkoutSessionSummary(BaseModel):
    id: int
    plan_id: int | None
    status: SessionStatus
    started_at: datetime
    ended_at: datetime | None
    total_duration_sec: int | None
    total_volume_kg: float | None
    calories_burned: int | None
    ai_feedback: str | None
    xp_earned: int
    completed_parts: str | None

    model_config = {"from_attributes": True}


class PreWorkoutMessageResponse(BaseModel):
    plan_name: str | None = None
    weather_main: str | None = None   # "{city} {temp}°C (체감 {feels_like}°C)"
    weather_sub: str | None = None    # "{description} · 습도 {humidity}%"
    is_outdoor_ok: bool | None = None


class CareMessageResponse(BaseModel):
    message: str
