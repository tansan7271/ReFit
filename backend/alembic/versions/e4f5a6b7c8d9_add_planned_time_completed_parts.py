"""add planned_time and completed_parts

Revision ID: e4f5a6b7c8d9
Revises: f5a6b7c8d9e0
Create Date: 2026-06-08 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e4f5a6b7c8d9"
down_revision: Union[str, None] = "f5a6b7c8d9e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("workout_plans", sa.Column("planned_time", sa.String(5), nullable=True))
    op.add_column("workout_sessions", sa.Column("completed_parts", sa.String(200), nullable=True))


def downgrade() -> None:
    op.drop_column("workout_plans", "planned_time")
    op.drop_column("workout_sessions", "completed_parts")
