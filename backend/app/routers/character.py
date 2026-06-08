from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.character import CharacterResponse, CharacterStats
from app.services.character_service import get_character_data

router = APIRouter(prefix="/character", tags=["Character"])


@router.get("", response_model=CharacterResponse)
async def get_character(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """캐릭터 상태 데이터 반환. 프론트엔드가 이 응답을 기반으로 픽셀 캐릭터를 렌더링한다."""
    data = await get_character_data(current_user, db)
    return CharacterResponse(
        stats=CharacterStats(**data["stats"]),
        workout_status=data["workout_status"],
        is_sleeping=data["is_sleeping"],
        character_level=data["character_level"],
        character_xp=data["character_xp"],
        workout_part=data["workout_part"],
        equipped_badge_emoji=data["equipped_badge_emoji"],
    )
