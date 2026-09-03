import uuid
import datetime
from sqlalchemy import Column, String, ForeignKey, DateTime
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
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow, index=True)
