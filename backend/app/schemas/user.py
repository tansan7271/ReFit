from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, model_validator

from app.models.user import FitnessLevel, Gender


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)
    nickname: str = Field(min_length=1, max_length=50)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse | None = None


class RefreshRequest(BaseModel):
    refresh_token: str


# ── User Profile ───────────────────────────────────────────────────────────────

class OnboardingRequest(BaseModel):
    age: int = Field(ge=10, le=100)
    gender: Gender
    height_cm: float = Field(ge=100, le=250)
    weight_kg: float = Field(ge=20, le=300)
    fitness_level: FitnessLevel
    goal: str = Field(max_length=100)
    character_emoji: str = Field(min_length=1, max_length=10)


class UserProfileUpdate(BaseModel):
    nickname: str | None = Field(None, min_length=1, max_length=50)
    age: int | None = Field(None, ge=10, le=100)
    gender: Gender | None = None
    height_cm: float | None = Field(None, ge=100, le=250)
    weight_kg: float | None = Field(None, ge=20, le=300)
    fitness_level: FitnessLevel | None = None
    goal: str | None = Field(None, max_length=100)
    character_emoji: str | None = Field(None, max_length=10)


class UserResponse(BaseModel):
    id: int
    email: str
    nickname: str
    age: int | None
    gender: Gender | None
    height_cm: float | None
    weight_kg: float | None
    fitness_level: FitnessLevel
    goal: str | None
    character_emoji: str
    character_level: int
    character_xp: int
    is_onboarding_complete: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── InBody ─────────────────────────────────────────────────────────────────────

class InBodyCreate(BaseModel):
    weight_kg: float | None = Field(None, ge=20, le=300)
    body_fat_percent: float | None = Field(None, ge=0, le=70)
    muscle_mass_kg: float | None = Field(None, ge=10, le=100)
    body_water_percent: float | None = Field(None, ge=0, le=80)
    bmi: float | None = Field(None, ge=10, le=60)
    visceral_fat_level: int | None = Field(None, ge=1, le=30)
    memo: str | None = Field(None, max_length=500)
    measured_at: datetime

    @model_validator(mode="after")
    def at_least_one_metric(self):
        metrics = [
            self.weight_kg, self.body_fat_percent, self.muscle_mass_kg,
            self.body_water_percent, self.bmi,
        ]
        if not any(m is not None for m in metrics):
            raise ValueError("At least one body metric is required")
        return self


class InBodyResponse(BaseModel):
    id: int
    weight_kg: float | None
    body_fat_percent: float | None
    muscle_mass_kg: float | None
    body_water_percent: float | None
    bmi: float | None
    visceral_fat_level: int | None
    memo: str | None
    measured_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


TokenResponse.model_rebuild()
