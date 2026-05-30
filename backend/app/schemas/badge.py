from datetime import datetime

from pydantic import BaseModel

from app.models.badge import BadgeCategory, BadgeConditionType


class BadgeResponse(BaseModel):
    id: int
    name: str
    description: str
    emoji: str
    category: BadgeCategory
    condition_type: BadgeConditionType
    condition_value: int
    xp_reward: int

    model_config = {"from_attributes": True}


class UserBadgeResponse(BaseModel):
    id: int
    badge: BadgeResponse
    is_equipped: bool
    earned_at: datetime

    model_config = {"from_attributes": True}


class BadgeEquipRequest(BaseModel):
    badge_id: int


class BadgeCheckResponse(BaseModel):
    newly_earned: list[BadgeResponse]
    earned_count: int
