"""Add risk_explanation JSONB column to risk_scores

Revision ID: b7c3e12f9a01
Revises: 43895d98469f
Create Date: 2026-09-02 22:58:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b7c3e12f9a01'
down_revision: Union[str, None] = '43895d98469f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add risk_explanation JSONB column for structured multi-dimensional risk explanation
    # Using raw SQL with DO block to be idempotent (column may already exist from partial runs)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='risk_scores' AND column_name='risk_explanation'
            ) THEN
                ALTER TABLE risk_scores ADD COLUMN risk_explanation JSONB;
            END IF;
        END;
        $$;
    """)


def downgrade() -> None:
    op.drop_column('risk_scores', 'risk_explanation')
