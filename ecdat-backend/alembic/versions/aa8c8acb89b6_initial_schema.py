"""initial schema

Revision ID: aa8c8acb89b6
Revises: 
Create Date: 2026-09-01 23:08:17.290005

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'aa8c8acb89b6'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
    CREATE TABLE workspaces (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      clerk_user_id VARCHAR(255) NOT NULL,
      name         VARCHAR(255) NOT NULL,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW()
    );
    """)
    op.execute("CREATE INDEX idx_workspaces_clerk_user ON workspaces(clerk_user_id);")

    op.execute("""
    CREATE TABLE discovery_jobs (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      source_type  VARCHAR(50) NOT NULL,
      source_url   TEXT,
      status       VARCHAR(20) NOT NULL DEFAULT 'queued',
      started_at   TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      error_msg    TEXT,
      metadata     JSONB DEFAULT '{}',
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
    """)
    op.execute("CREATE INDEX idx_jobs_workspace ON discovery_jobs(workspace_id);")
    op.execute("CREATE INDEX idx_jobs_status ON discovery_jobs(status);")

    op.execute("""
    CREATE TABLE evidence (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id       UUID NOT NULL REFERENCES discovery_jobs(id) ON DELETE CASCADE,
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      source_type  VARCHAR(50) NOT NULL,
      file_path    TEXT,
      line_number  INTEGER,
      raw_match    TEXT NOT NULL,
      context_lines TEXT,
      detector     VARCHAR(100) NOT NULL,
      confidence   FLOAT NOT NULL DEFAULT 1.0,
      raw_metadata JSONB DEFAULT '{}',
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
    """)
    op.execute("CREATE INDEX idx_evidence_job ON evidence(job_id);")
    op.execute("CREATE INDEX idx_evidence_workspace ON evidence(workspace_id);")

    op.execute("""
    CREATE TABLE crypto_assets (
      id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id         UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      algorithm_canonical  VARCHAR(100) NOT NULL,
      algorithm_family     VARCHAR(50) NOT NULL,
      algorithm_name       VARCHAR(100) NOT NULL,
      key_size             INTEGER,
      function             VARCHAR(50),
      standard             VARCHAR(100),
      oid                  VARCHAR(100),
      quantum_vulnerable   BOOLEAN DEFAULT FALSE,
      classical_vulnerable BOOLEAN DEFAULT FALSE,
      vulnerability_notes  TEXT,
      first_seen           TIMESTAMPTZ DEFAULT NOW(),
      last_seen            TIMESTAMPTZ DEFAULT NOW(),
      created_at           TIMESTAMPTZ DEFAULT NOW()
    );
    """)
    op.execute("CREATE UNIQUE INDEX idx_asset_canonical_workspace ON crypto_assets(workspace_id, algorithm_canonical);")
    op.execute("CREATE INDEX idx_asset_workspace ON crypto_assets(workspace_id);")

    op.execute("""
    CREATE TABLE evidence_assets (
      evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
      asset_id    UUID NOT NULL REFERENCES crypto_assets(id) ON DELETE CASCADE,
      PRIMARY KEY (evidence_id, asset_id)
    );
    """)

    op.execute("""
    CREATE TABLE risk_scores (
      id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      asset_id               UUID NOT NULL REFERENCES crypto_assets(id) ON DELETE CASCADE,
      workspace_id           UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      quantum_exposure       VARCHAR(20),
      classical_risk         VARCHAR(20),
      mosca_result           VARCHAR(20),
      data_lifetime_years    FLOAT,
      migration_time_years   FLOAT,
      threat_horizon_years   FLOAT,
      composite_priority     VARCHAR(20),
      risk_explanation       JSONB,
      computed_at            TIMESTAMPTZ DEFAULT NOW()
    );
    """)
    op.execute("CREATE UNIQUE INDEX idx_risk_asset ON risk_scores(asset_id);")

    op.execute("""
    CREATE TABLE recommendations (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      asset_id         UUID NOT NULL REFERENCES crypto_assets(id) ON DELETE CASCADE,
      workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      current_algo     VARCHAR(100) NOT NULL,
      recommended_algo VARCHAR(100) NOT NULL,
      candidate_algo   VARCHAR(100),
      hybrid_path      TEXT,
      reasoning        JSONB,
      confidence       FLOAT,
      nist_standard    VARCHAR(50),
      migration_complexity VARCHAR(20),
      generated_at     TIMESTAMPTZ DEFAULT NOW()
    );
    """)

    op.execute("""
    CREATE TABLE cbom_snapshots (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      job_id       UUID REFERENCES discovery_jobs(id),
      version      VARCHAR(20) NOT NULL DEFAULT '1.0.0',
      format       VARCHAR(20) NOT NULL DEFAULT 'cyclonedx-json',
      content      JSONB NOT NULL,
      asset_count  INTEGER NOT NULL DEFAULT 0,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
    """)
    op.execute("CREATE INDEX idx_cbom_workspace ON cbom_snapshots(workspace_id);")

def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS cbom_snapshots CASCADE;")
    op.execute("DROP TABLE IF EXISTS recommendations CASCADE;")
    op.execute("DROP TABLE IF EXISTS risk_scores CASCADE;")
    op.execute("DROP TABLE IF EXISTS evidence_assets CASCADE;")
    op.execute("DROP TABLE IF EXISTS crypto_assets CASCADE;")
    op.execute("DROP TABLE IF EXISTS evidence CASCADE;")
    op.execute("DROP TABLE IF EXISTS discovery_jobs CASCADE;")
    op.execute("DROP TABLE IF EXISTS workspaces CASCADE;")
