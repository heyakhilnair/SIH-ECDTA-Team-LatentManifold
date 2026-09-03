"""Fix risk_scores schema drift: the model (app/models/risk.py) was rewritten
with a different column set at some point but no migration ever followed, so
the live table still had the ORIGINAL Phase 4 columns (quantum_exposure,
classical_risk, mosca_result, composite_priority, computed_at). Every call to
compute_asset_risk() has been crashing with UndefinedColumnError against the
real database since — confirmed empirically (risk_scores had 0 rows despite
scans producing real evidence/assets). See docs/BACKEND_AUDIT_PHASE0-6.md.

Revision ID: d2e5f9a1b4c7
Revises: c1d4e8f2a3b6
Create Date: 2026-09-03 00:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd2e5f9a1b4c7'
down_revision: Union[str, None] = 'c1d4e8f2a3b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='risk_scores' AND column_name='business_criticality') THEN
                ALTER TABLE risk_scores ADD COLUMN business_criticality VARCHAR(20) NOT NULL DEFAULT 'HIGH';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='risk_scores' AND column_name='exposure') THEN
                ALTER TABLE risk_scores ADD COLUMN exposure VARCHAR(20) NOT NULL DEFAULT 'INTERNAL';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='risk_scores' AND column_name='mosca_threshold_exceeded') THEN
                ALTER TABLE risk_scores ADD COLUMN mosca_threshold_exceeded BOOLEAN NOT NULL DEFAULT FALSE;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='risk_scores' AND column_name='quantum_risk_level') THEN
                ALTER TABLE risk_scores ADD COLUMN quantum_risk_level VARCHAR(20) NOT NULL DEFAULT 'SAFE';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='risk_scores' AND column_name='classical_risk_level') THEN
                ALTER TABLE risk_scores ADD COLUMN classical_risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='risk_scores' AND column_name='composite_risk_level') THEN
                ALTER TABLE risk_scores ADD COLUMN composite_risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW';
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='risk_scores' AND column_name='quantum_reason') THEN
                ALTER TABLE risk_scores ADD COLUMN quantum_reason TEXT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='risk_scores' AND column_name='classical_reason') THEN
                ALTER TABLE risk_scores ADD COLUMN classical_reason TEXT;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='risk_scores' AND column_name='created_at') THEN
                ALTER TABLE risk_scores ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='risk_scores' AND column_name='updated_at') THEN
                ALTER TABLE risk_scores ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
            END IF;

            -- Old Phase 4 columns superseded by the ones above; nothing in the
            -- codebase reads them any more (grepped before writing this).
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='risk_scores' AND column_name='quantum_exposure') THEN
                ALTER TABLE risk_scores DROP COLUMN quantum_exposure;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='risk_scores' AND column_name='classical_risk') THEN
                ALTER TABLE risk_scores DROP COLUMN classical_risk;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='risk_scores' AND column_name='mosca_result') THEN
                ALTER TABLE risk_scores DROP COLUMN mosca_result;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='risk_scores' AND column_name='composite_priority') THEN
                ALTER TABLE risk_scores DROP COLUMN composite_priority;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='risk_scores' AND column_name='computed_at') THEN
                ALTER TABLE risk_scores DROP COLUMN computed_at;
            END IF;
        END;
        $$;
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE risk_scores
            DROP COLUMN IF EXISTS business_criticality,
            DROP COLUMN IF EXISTS exposure,
            DROP COLUMN IF EXISTS mosca_threshold_exceeded,
            DROP COLUMN IF EXISTS quantum_risk_level,
            DROP COLUMN IF EXISTS classical_risk_level,
            DROP COLUMN IF EXISTS composite_risk_level,
            DROP COLUMN IF EXISTS quantum_reason,
            DROP COLUMN IF EXISTS classical_reason,
            DROP COLUMN IF EXISTS created_at,
            DROP COLUMN IF EXISTS updated_at,
            ADD COLUMN quantum_exposure VARCHAR(20),
            ADD COLUMN classical_risk VARCHAR(20),
            ADD COLUMN mosca_result VARCHAR(20),
            ADD COLUMN composite_priority VARCHAR(20),
            ADD COLUMN computed_at TIMESTAMPTZ DEFAULT NOW();
    """)
