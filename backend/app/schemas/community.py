from datetime import datetime

from pydantic import BaseModel, Field

from app.models.community import FriendshipStatus


class FriendRequest(BaseModel):
    addressee_id: int


class FriendshipResponse(BaseModel):
    id: int
    requester_id: int
    addressee_id: int
    status: FriendshipStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class FriendInfo(BaseModel):
    user_id: int
    nickname: str
    character_emoji: str
    character_level: int
    friendship_id: int
    status: FriendshipStatus


class PokeCreate(BaseModel):
    receiver_id: int
    message: str | None = Field(None, max_length=200)


class PokeResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class FriendActivityResponse(BaseModel):
    user_id: int
    nickname: str
    character_emoji: str
    character_level: int
    workout_count_this_week: int
    last_worked_out_at: datetime | None
    worked_out_today: bool


class CoopCelebrateResponse(BaseModel):
    both_worked_out_today: bool
    message: str
