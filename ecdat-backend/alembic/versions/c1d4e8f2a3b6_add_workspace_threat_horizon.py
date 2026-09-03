"""Add threat_horizon_years to workspaces (Z in Mosca's inequality, workspace-configurable)

Revision ID: c1d4e8f2a3b6
Revises: 43895d98469f
Create Date: 2026-09-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1d4e8f2a3b6'
down_revision: Union[str, None] = 'b7c3e12f9a01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='workspaces' AND column_name='threat_horizon_years'
            ) THEN
                ALTER TABLE workspaces ADD COLUMN threat_horizon_years DOUBLE PRECISION NOT NULL DEFAULT 12.0;
            END IF;
        END;
        $$;
    """)


def downgrade() -> None:
    op.drop_column('workspaces', 'threat_horizon_years')
