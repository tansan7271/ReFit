from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, desc, func

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.community import Friendship, FriendshipStatus, Poke
from app.models.workout import WorkoutSession, SessionStatus
from app.models.notification import PushToken, NotificationSetting
from app.schemas.community import (
    FriendRequest, FriendshipResponse, FriendInfo, PokeCreate, PokeResponse,
    FriendActivityResponse, CoopCelebrateResponse,
)
from app.services.fcm_service import fcm_service

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


# ── Friend Activity & Co-op ────────────────────────────────────────────────────

@router.get("/friends/{friend_id}/activity", response_model=FriendActivityResponse)
async def get_friend_activity(
    friend_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """친구의 최근 운동 활동 요약 조회 (친구 관계 확인 후 반환)."""
    friendship = await db.execute(
        select(Friendship).where(
            or_(
                and_(Friendship.requester_id == current_user.id, Friendship.addressee_id == friend_id),
                and_(Friendship.requester_id == friend_id, Friendship.addressee_id == current_user.id),
            ),
            Friendship.status == FriendshipStatus.ACCEPTED,
        )
    )
    if not friendship.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a friend")

    friend_result = await db.execute(
        select(User).where(User.id == friend_id, User.is_active == True)
    )
    friend = friend_result.scalar_one_or_none()
    if not friend:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    week_result = await db.execute(
        select(func.count(WorkoutSession.id)).where(
            WorkoutSession.user_id == friend_id,
            WorkoutSession.status == SessionStatus.COMPLETED,
            WorkoutSession.started_at >= week_ago,
        )
    )
    workout_count = week_result.scalar() or 0

    last_result = await db.execute(
        select(WorkoutSession.ended_at).where(
            WorkoutSession.user_id == friend_id,
            WorkoutSession.status == SessionStatus.COMPLETED,
        ).order_by(desc(WorkoutSession.ended_at)).limit(1)
    )
    last_ended_at = last_result.scalar_one_or_none()

    today_result = await db.execute(
        select(func.count(WorkoutSession.id)).where(
            WorkoutSession.user_id == friend_id,
            WorkoutSession.status == SessionStatus.COMPLETED,
            WorkoutSession.started_at >= today_start,
        )
    )
    worked_out_today = (today_result.scalar() or 0) > 0

    return FriendActivityResponse(
        user_id=friend.id,
        nickname=friend.nickname,
        character_emoji=friend.character_emoji,
        character_level=friend.character_level,
        workout_count_this_week=workout_count,
        last_worked_out_at=last_ended_at,
        worked_out_today=worked_out_today,
    )


@router.post("/coop/celebrate/{friend_id}", response_model=CoopCelebrateResponse)
async def coop_celebrate(
    friend_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """오늘 나와 친구가 모두 운동을 완료했으면 서로에게 Co-op 축하 FCM 발송."""
    if friend_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot co-op with yourself")

    friendship = await db.execute(
        select(Friendship).where(
            or_(
                and_(Friendship.requester_id == current_user.id, Friendship.addressee_id == friend_id),
                and_(Friendship.requester_id == friend_id, Friendship.addressee_id == current_user.id),
            ),
            Friendship.status == FriendshipStatus.ACCEPTED,
        )
    )
    if not friendship.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a friend")

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    async def _worked_out_today(uid: int) -> bool:
        r = await db.execute(
            select(func.count(WorkoutSession.id)).where(
                WorkoutSession.user_id == uid,
                WorkoutSession.status == SessionStatus.COMPLETED,
                WorkoutSession.started_at >= today_start,
            )
        )
        return (r.scalar() or 0) > 0

    me_done = await _worked_out_today(current_user.id)
    friend_done = await _worked_out_today(friend_id)

    if not (me_done and friend_done):
        return CoopCelebrateResponse(
            both_worked_out_today=False,
            message="아직 둘 다 운동을 완료하지 않았어요. 함께 완료하면 Co-op 달성!",
        )

    # 친구 닉네임 조회
    friend_result = await db.execute(select(User).where(User.id == friend_id))
    friend = friend_result.scalar_one_or_none()
    friend_nickname = friend.nickname if friend else "친구"

    # 두 유저 모두에게 FCM 발송
    for uid, other_nickname in [(current_user.id, friend_nickname), (friend_id, current_user.nickname)]:
        setting_result = await db.execute(
            select(NotificationSetting).where(NotificationSetting.user_id == uid)
        )
        setting = setting_result.scalar_one_or_none()
        if setting and setting.friend_poke:
            token_result = await db.execute(
                select(PushToken).where(PushToken.user_id == uid, PushToken.is_active == True)
            )
            for token in token_result.scalars().all():
                await fcm_service.send(
                    token=token.token,
                    title="Co-op 달성! 🎉",
                    body=f"{other_nickname}와 오늘 함께 운동을 완료했어요! 최고의 팀!",
                    data={"type": "coop_celebrate", "friend_id": str(friend_id)},
                )

    return CoopCelebrateResponse(
        both_worked_out_today=True,
        message=f"{friend_nickname}와 Co-op 달성! 서로에게 축하 알림을 보냈어요 🎉",
    )
