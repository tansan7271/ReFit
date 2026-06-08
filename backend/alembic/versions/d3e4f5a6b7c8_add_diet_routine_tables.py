"""add diet and routine tables

Revision ID: d3e4f5a6b7c8
Revises: c2b3d4e5f6a7
Create Date: 2026-06-08

"""
from alembic import op
import sqlalchemy as sa

revision = 'd3e4f5a6b7c8'
down_revision = 'c2b3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── diet_records ─────────────────────────────────────────────────────────
    op.create_table(
        'diet_records',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('meal_type', sa.Enum('breakfast', 'lunch', 'dinner', 'snack', name='mealtype'), nullable=False),
        sa.Column('total_calories', sa.Float(), nullable=False, server_default='0'),
        sa.Column('protein_g', sa.Float(), nullable=True),
        sa.Column('carbs_g', sa.Float(), nullable=True),
        sa.Column('fat_g', sa.Float(), nullable=True),
        sa.Column('memo', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_diet_records_user_id', 'diet_records', ['user_id'])
    op.create_index('ix_diet_records_date', 'diet_records', ['date'])

    # ── diet_foods ───────────────────────────────────────────────────────────
    op.create_table(
        'diet_foods',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('record_id', sa.Integer(), sa.ForeignKey('diet_records.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('quantity_g', sa.Float(), nullable=False, server_default='100'),
        sa.Column('calories', sa.Float(), nullable=False),
        sa.Column('protein_g', sa.Float(), nullable=True),
        sa.Column('carbs_g', sa.Float(), nullable=True),
        sa.Column('fat_g', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_diet_foods_record_id', 'diet_foods', ['record_id'])

    # ── routine_items ────────────────────────────────────────────────────────
    op.create_table(
        'routine_items',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(100), nullable=False),
        sa.Column('emoji', sa.String(10), nullable=False, server_default='✅'),
        sa.Column('category', sa.Enum(
            'health', 'fitness', 'mental', 'diet', 'sleep', 'other',
            name='routinecategory'
        ), nullable=False, server_default='other'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_routine_items_user_id', 'routine_items', ['user_id'])

    # ── routine_logs ─────────────────────────────────────────────────────────
    op.create_table(
        'routine_logs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('routine_item_id', sa.Integer(), sa.ForeignKey('routine_items.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('is_completed', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('routine_item_id', 'date', name='uq_routine_log_item_date'),
    )
    op.create_index('ix_routine_logs_routine_item_id', 'routine_logs', ['routine_item_id'])
    op.create_index('ix_routine_logs_user_id', 'routine_logs', ['user_id'])
    op.create_index('ix_routine_logs_date', 'routine_logs', ['date'])


def downgrade() -> None:
    op.drop_table('routine_logs')
    op.drop_table('routine_items')
    op.drop_table('diet_foods')
    op.drop_table('diet_records')
    op.execute("DROP TYPE IF EXISTS routinecategory")
    op.execute("DROP TYPE IF EXISTS mealtype")
