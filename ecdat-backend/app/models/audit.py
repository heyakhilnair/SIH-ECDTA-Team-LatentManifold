import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base


class AuditLog(Base):
    """
    Append-only audit ledger — Phase 10 (Enterprise Hardening), per Phase 19
    PDF §75-77 ("ECDAT should log: Login, Scan, Asset View, Evidence Access,
    Policy Change, ... Audit logs should ideally be: Append-only,
    Integrity-protected, Centralized"). Same append-only discipline this
    project already applies to the `evidence` table: nothing in
    app/services/audit.py issues an UPDATE or DELETE against this table.
    """
    __tablename__ = "audit_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_clerk_user_id = Column(String(255), nullable=False)
    event = Column(String(100), nullable=False)  # e.g. SCAN_STARTED, SOURCE_ADDED, POLICY_UPDATED
    resource_type = Column(String(50), nullable=True)  # 'source', 'discovery_job', 'workspace', 'asset', ...
    resource_id = Column(UUID(as_uuid=True), nullable=True)
    details = Column(JSONB, nullable=True)  # e.g. {"before": ..., "after": ...} for policy changes
    # server_default=func.now(), not a Python-side default=datetime.datetime.utcnow
    # — real bug found 2026-09-04: a naive Python datetime (utcnow() carries no
    # tzinfo) inserted into a timestamptz column gets interpreted by asyncpg
    # using the app server's LOCAL timezone (IST here), silently storing every
    # audit event 5.5 hours off. This is literally why a scan the user had just
    # started looked like it happened "5h ago" in the audit trail. Reproduced
    # directly (insert with the old default, read back, compare to the DB's own
    # now() at the same instant) before fixing.
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
