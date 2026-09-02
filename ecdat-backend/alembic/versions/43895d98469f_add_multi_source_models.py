"""Add Multi-Source Models

Revision ID: 43895d98469f
Revises: aa8c8acb89b6
Create Date: 2026-09-02 19:52:30.375194

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '43895d98469f'
down_revision: Union[str, None] = 'aa8c8acb89b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create sources table
    op.create_table(
        'sources',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', sa.UUID(as_uuid=True), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('source_type', sa.String(length=50), nullable=False),
        sa.Column('configuration', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=True),
        sa.Column('health_status', sa.String(length=50), server_default='unknown', nullable=True),
        sa.Column('last_scanned_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    )
    op.create_index(op.f('ix_sources_workspace_id'), 'sources', ['workspace_id'], unique=False)

    # 2. Create job_sources table
    op.create_table(
        'job_sources',
        sa.Column('job_id', sa.UUID(as_uuid=True), sa.ForeignKey('discovery_jobs.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('source_id', sa.UUID(as_uuid=True), sa.ForeignKey('sources.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('status', sa.String(length=20), server_default='queued', nullable=True),
    )

    # 3. Modify discovery_jobs table
    op.drop_column('discovery_jobs', 'source_type')
    op.drop_column('discovery_jobs', 'source_url')


def downgrade() -> None:
    # 1. Revert discovery_jobs table
    op.add_column('discovery_jobs', sa.Column('source_type', sa.String(length=50), server_default='git', nullable=False))
    op.add_column('discovery_jobs', sa.Column('source_url', sa.Text(), nullable=True))
    
    # 2. Drop job_sources table
    op.drop_table('job_sources')

    # 3. Drop sources table
    op.drop_index(op.f('ix_sources_workspace_id'), table_name='sources')
    op.drop_table('sources')
