"""add daily_health_metrics

Revision ID: f5a6b7c8d9e0
Revises: d3e4f5a6b7c8
Create Date: 2026-06-08 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f5a6b7c8d9e0'
down_revision: Union[str, None] = 'd3e4f5a6b7c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'daily_health_metrics',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('steps', sa.Integer(), nullable=True),
        sa.Column('active_calories_kcal', sa.Float(), nullable=True),
        sa.Column('resting_heart_rate_bpm', sa.Float(), nullable=True),
        sa.Column('avg_heart_rate_bpm', sa.Float(), nullable=True),
        sa.Column('source', sa.SmallInteger(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'date', 'source', name='uq_user_date_source'),
    )
    op.create_index('ix_daily_health_metrics_user_id', 'daily_health_metrics', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_daily_health_metrics_user_id', table_name='daily_health_metrics')
    op.drop_table('daily_health_metrics')
