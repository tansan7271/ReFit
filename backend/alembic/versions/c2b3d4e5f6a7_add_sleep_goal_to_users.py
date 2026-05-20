"""add sleep goal columns to users

Revision ID: c2b3d4e5f6a7
Revises: b1a2c3d4e5f6
Create Date: 2026-05-19 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c2b3d4e5f6a7'
down_revision: Union[str, None] = 'b1a2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('sleep_goal_bedtime', sa.String(length=5), nullable=True),
    )
    op.add_column(
        'users',
        sa.Column('sleep_goal_wakeup', sa.String(length=5), nullable=True),
    )
    op.add_column(
        'users',
        sa.Column('sleep_goal_minutes', sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('users', 'sleep_goal_minutes')
    op.drop_column('users', 'sleep_goal_wakeup')
    op.drop_column('users', 'sleep_goal_bedtime')
