"""Add append-only audit_log table (Phase 10, per Phase 19 PDF sec 75-77)

Revision ID: e3f7a2c9d1b5
Revises: d2e5f9a1b4c7
Create Date: 2026-09-03 00:20:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'e3f7a2c9d1b5'
down_revision: Union[str, None] = 'd2e5f9a1b4c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='audit_log') THEN
                CREATE TABLE audit_log (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                    actor_clerk_user_id VARCHAR(255) NOT NULL,
                    event VARCHAR(100) NOT NULL,
                    resource_type VARCHAR(50),
                    resource_id UUID,
                    details JSONB,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                CREATE INDEX idx_audit_log_workspace_created ON audit_log(workspace_id, created_at DESC);
            END IF;
        END;
        $$;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS audit_log;")
