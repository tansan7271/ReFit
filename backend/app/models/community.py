"""
커뮤니티/소셜 관련 DB 모델
- Friendship: 친구 관계
- Poke: 콕 찌르기 (운동 독려)
"""
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class FriendshipStatus(str, PyEnum):
    PENDING = "pending"     # 요청 중
    ACCEPTED = "accepted"   # 수락됨
    BLOCKED = "blocked"     # 차단됨


class Friendship(Base):
    __tablename__ = "friendships"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    requester_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    addressee_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[FriendshipStatus] = mapped_column(
        Enum(FriendshipStatus), default=FriendshipStatus.PENDING, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, onupdate=datetime.now, nullable=False
    )

    requester: Mapped["User"] = relationship(foreign_keys=[requester_id])  # type: ignore[name-defined]
    addressee: Mapped["User"] = relationship(foreign_keys=[addressee_id])  # type: ignore[name-defined]


class Poke(Base):
    """콕 찌르기 — 친구 운동 독려 메시지"""
    __tablename__ = "pokes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sender_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    receiver_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    message: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)

    sender: Mapped["User"] = relationship(foreign_keys=[sender_id])  # type: ignore[name-defined]
    receiver: Mapped["User"] = relationship(foreign_keys=[receiver_id])  # type: ignore[name-defined]
