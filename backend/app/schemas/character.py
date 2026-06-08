from pydantic import BaseModel


class CharacterStats(BaseModel):
    sleep: float     # 0~100
    exercise: float  # 0~100
    diet: float      # 0~100
    routine: float   # 0~100


class CharacterResponse(BaseModel):
    stats: CharacterStats
    workout_status: str          # "none" | "active" | "completed"
    is_sleeping: bool
    character_level: int         # 1~5
    character_xp: int
    workout_part: str | None     # "chest"|"back"|"legs"|"shoulders"|"arms"|"core"|None
    equipped_badge_emoji: str | None
