"""Add evidence.source_id (project scoping) and sources.ai_excluded (AI privacy control)

Revision ID: f4a8b1c6e2d9
Revises: e3f7a2c9d1b5
Create Date: 2026-09-03 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'f4a8b1c6e2d9'
down_revision: Union[str, None] = 'e3f7a2c9d1b5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='evidence' AND column_name='source_id') THEN
                ALTER TABLE evidence ADD COLUMN source_id UUID REFERENCES sources(id) ON DELETE SET NULL;
                CREATE INDEX idx_evidence_source_id ON evidence(source_id);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sources' AND column_name='ai_excluded') THEN
                ALTER TABLE sources ADD COLUMN ai_excluded BOOLEAN NOT NULL DEFAULT FALSE;
            END IF;
        END;
        $$;
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE evidence DROP COLUMN IF EXISTS source_id;
        ALTER TABLE sources DROP COLUMN IF EXISTS ai_excluded;
    """)
