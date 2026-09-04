"""Fix 8 timestamp columns' DEFAULT to use the DB clock, not a naive Python datetime

Revision ID: a7c2e9f1b3d4
Revises: f4a8b1c6e2d9
Create Date: 2026-09-04 05:50:00.000000

Real bug, found and reproduced 2026-09-04: these columns used SQLAlchemy's
Python-side `default=datetime.datetime.utcnow`. datetime.utcnow() returns a
*naive* datetime (no tzinfo) whose value happens to be UTC — but with no
tzinfo attached, asyncpg has no way to know that, and interpreted it using
the app server's LOCAL system timezone (IST, UTC+5:30 on the dev machine)
before converting to true UTC for storage in the `timestamptz` column. Every
timestamp written through the ORM default this way ended up 5.5 hours
behind reality. Reproduced directly: inserted a row with the old default,
read it back, and compared it to the database's own `now()` at the same
instant — a consistent ~5h30m gap.

`evidence`, `discovery_jobs`, `sources`, and `workspaces` never had this bug
— they already used `server_default=func.now()` (the database's own clock,
immune to this class of issue), which is what this migration brings the
other 5 tables in line with. New rows are already correct on the
application side (see the matching app/models/*.py changes) — this
migration makes it correct at the schema level too (SET DEFAULT), which
Alembic needs a real DDL statement for; it doesn't retroactively rewrite
any existing (already-skewed) row.
"""
from typing import Sequence, Union

from alembic import op


revision: str = 'a7c2e9f1b3d4'
down_revision: Union[str, None] = 'f4a8b1c6e2d9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


COLUMNS = [
    ("crypto_assets", "first_seen"),
    ("crypto_assets", "last_seen"),
    ("crypto_assets", "created_at"),
    ("audit_log", "created_at"),
    ("cbom_snapshots", "created_at"),
    ("recommendations", "generated_at"),
    ("risk_scores", "created_at"),
    ("risk_scores", "updated_at"),
]


def upgrade() -> None:
    for table, column in COLUMNS:
        op.execute(f"ALTER TABLE {table} ALTER COLUMN {column} SET DEFAULT now();")


def downgrade() -> None:
    # Not restoring the old Python-side default on downgrade — that default
    # was the bug. Downgrading just removes the DB-side default; SQLAlchemy's
    # (reverted) default=datetime.datetime.utcnow would take over again once
    # the corresponding model change is reverted too.
    for table, column in COLUMNS:
        op.execute(f"ALTER TABLE {table} ALTER COLUMN {column} DROP DEFAULT;")
