"""Add ai_sessions and ai_messages tables (Phase 15)

Revision ID: c8d3f5a7b2e4
Revises: b3d5f7a9c1e2
Create Date: 2026-09-04 18:00:00.000000

AI Analyst's chat history used to live only in the frontend's `messages`
useState — gone on every reload, and with no way to look back at a previous
session's answers. This adds real, durable storage for it.

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'c8d3f5a7b2e4'
down_revision: Union[str, None] = 'b3d5f7a9c1e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # asyncpg's prepared-statement protocol refuses to execute more than one
    # top-level command per op.execute() call (unlike psycopg2) — everything
    # has to be one statement from its point of view, hence the single DO $$
    # block wrapping all 4 DDL statements, same pattern e3f7a2c9d1b5 and
    # b3d5f7a9c1e2 already use.
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='ai_sessions') THEN
                CREATE TABLE ai_sessions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                    source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
                    title VARCHAR(200),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
                );
                CREATE INDEX idx_ai_sessions_workspace_id ON ai_sessions(workspace_id);

                CREATE TABLE ai_messages (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    session_id UUID NOT NULL REFERENCES ai_sessions(id) ON DELETE CASCADE,
                    role VARCHAR(20) NOT NULL,
                    text TEXT NOT NULL,
                    confidence FLOAT,
                    evidence_citations JSONB,
                    asset_citations JSONB,
                    citation_details JSONB,
                    unknowns JSONB,
                    scope VARCHAR(200),
                    is_error BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
                );
                CREATE INDEX idx_ai_messages_session_id ON ai_messages(session_id);
            END IF;
        END;
        $$;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS ai_messages;")
    op.execute("DROP TABLE IF EXISTS ai_sessions;")
