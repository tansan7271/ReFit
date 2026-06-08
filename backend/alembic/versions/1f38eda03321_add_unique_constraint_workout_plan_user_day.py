"""add unique constraint workout_plan_user_day

WorkoutPlan 에 (user_id, day_of_week) 유니크 제약(uq_user_plan_day)을 추가한다.
같은 유저가 한 요일에 두 개 이상의 플랜을 가질 수 없도록 DB 레벨에서 강제.

Revision ID: 1f38eda03321
Revises: e4f5a6b7c8d9
Create Date: 2026-06-09 04:12:16.064307

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "1f38eda03321"
down_revision: Union[str, None] = "e4f5a6b7c8d9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_user_plan_day", "workout_plans", ["user_id", "day_of_week"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_user_plan_day", "workout_plans", type_="unique")
