"""Add real migration status tracking to crypto_assets (Phase 11.1)

Revision ID: b3d5f7a9c1e2
Revises: a7c2e9f1b3d4
Create Date: 2026-09-04 06:10:00.000000

The Migration Planner's board state (which of the 5 columns a card sits in)
was only ever a browser-local `useState` in migration/page.tsx — never
persisted, so it reset on every reload and could never be shared across a
team looking at the same workspace. This adds real, durable columns so the
board (and, downstream, the Quantum Readiness Score's migration-progress
dimension and the Phase 12 verification engine) have something real to read.

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'b3d5f7a9c1e2'
down_revision: Union[str, None] = 'a7c2e9f1b3d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crypto_assets' AND column_name='migration_status') THEN
                ALTER TABLE crypto_assets ADD COLUMN migration_status VARCHAR(20) NOT NULL DEFAULT 'ASSESSED';
                ALTER TABLE crypto_assets ADD COLUMN migration_status_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
                ALTER TABLE crypto_assets ADD COLUMN migration_verified_at TIMESTAMP WITH TIME ZONE;
                CREATE INDEX idx_crypto_assets_migration_status ON crypto_assets(migration_status);
            END IF;
        END;
        $$;
    """)


def downgrade() -> None:
    op.execute("""
        DROP INDEX IF EXISTS idx_crypto_assets_migration_status;
        ALTER TABLE crypto_assets DROP COLUMN IF EXISTS migration_status;
        ALTER TABLE crypto_assets DROP COLUMN IF EXISTS migration_status_updated_at;
        ALTER TABLE crypto_assets DROP COLUMN IF EXISTS migration_verified_at;
    """)
