from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, desc

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.community import Friendship, FriendshipStatus, Poke
from app.schemas.community import (
    FriendRequest, FriendshipResponse, FriendInfo, PokeCreate, PokeResponse,
)

router = APIRouter(prefix="/community", tags=["Community"])


# ── Friends ────────────────────────────────────────────────────────────────────

@router.post("/friends/request", response_model=FriendshipResponse, status_code=201)
async def send_friend_request(
    body: FriendRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.addressee_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot friend yourself")

    existing = await db.execute(
        select(Friendship).where(
            or_(
                and_(Friendship.requester_id == current_user.id, Friendship.addressee_id == body.addressee_id),
                and_(Friendship.requester_id == body.addressee_id, Friendship.addressee_id == current_user.id),
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Friendship already exists")

    friendship = Friendship(requester_id=current_user.id, addressee_id=body.addressee_id)
    db.add(friendship)
    await db.flush()
    return friendship


@router.post("/friends/{friendship_id}/accept", response_model=FriendshipResponse)
async def accept_friend_request(
    friendship_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Friendship).where(
            Friendship.id == friendship_id,
            Friendship.addressee_id == current_user.id,
            Friendship.status == FriendshipStatus.PENDING,
        )
    )
    friendship = result.scalar_one_or_none()
    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found")

    friendship.status = FriendshipStatus.ACCEPTED
    db.add(friendship)
    return friendship


@router.get("/friends", response_model=list[FriendInfo])
async def get_my_friends(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Friendship).where(
            or_(
                Friendship.requester_id == current_user.id,
                Friendship.addressee_id == current_user.id,
            ),
            Friendship.status == FriendshipStatus.ACCEPTED,
        )
    )
    friendships = result.scalars().all()

    friend_ids = [
        f.addressee_id if f.requester_id == current_user.id else f.requester_id
        for f in friendships
    ]
    if not friend_ids:
        return []

    users_result = await db.execute(
        select(User).where(User.id.in_(friend_ids), User.is_active == True)
    )
    users_map = {u.id: u for u in users_result.scalars().all()}
    fs_map = {
        (f.addressee_id if f.requester_id == current_user.id else f.requester_id): f
        for f in friendships
    }

    return [
        FriendInfo(
            user_id=uid,
            nickname=users_map[uid].nickname,
            character_emoji=users_map[uid].character_emoji,
            character_level=users_map[uid].character_level,
            friendship_id=fs_map[uid].id,
            status=fs_map[uid].status,
        )
        for uid in friend_ids
        if uid in users_map
    ]


@router.delete("/friends/{friendship_id}", status_code=204)
async def remove_friend(
    friendship_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Friendship).where(
            Friendship.id == friendship_id,
            or_(
                Friendship.requester_id == current_user.id,
                Friendship.addressee_id == current_user.id,
            ),
        )
    )
    friendship = result.scalar_one_or_none()
    if not friendship:
        raise HTTPException(status_code=404, detail="Friendship not found")
    await db.delete(friendship)


# ── Poke ───────────────────────────────────────────────────────────────────────

@router.post("/pokes", response_model=PokeResponse, status_code=201)
async def send_poke(
    body: PokeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.receiver_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot poke yourself")

    poke = Poke(sender_id=current_user.id, receiver_id=body.receiver_id, message=body.message)
    db.add(poke)
    await db.flush()
    return poke


@router.get("/pokes/received", response_model=list[PokeResponse])
async def get_received_pokes(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Poke)
        .where(Poke.receiver_id == current_user.id)
        .order_by(desc(Poke.created_at))
        .limit(limit)
    )
    return result.scalars().all()
