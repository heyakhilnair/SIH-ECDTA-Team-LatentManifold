import uuid
from sqlalchemy import Column, String, Boolean, ForeignKey, Integer, DateTime, Text, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base

class EvidenceAsset(Base):
    __tablename__ = "evidence_assets"
    
    evidence_id = Column(UUID(as_uuid=True), ForeignKey("evidence.id", ondelete="CASCADE"), primary_key=True)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("crypto_assets.id", ondelete="CASCADE"), primary_key=True)

class CryptoAsset(Base):
    __tablename__ = "crypto_assets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    
    algorithm_canonical = Column(String(100), nullable=False)
    algorithm_family = Column(String(50), nullable=False)
    algorithm_name = Column(String(100), nullable=False)
    
    key_size = Column(Integer, nullable=True)
    function = Column(String(50), nullable=True)
    standard = Column(String(100), nullable=True)
    oid = Column(String(100), nullable=True)
    
    quantum_vulnerable = Column(Boolean, default=False)
    classical_vulnerable = Column(Boolean, default=False)
    vulnerability_notes = Column(Text, nullable=True)
    
    # server_default=func.now() — NOT default=datetime.datetime.utcnow. Real bug
    # found 2026-09-04: datetime.utcnow() returns a *naive* datetime (no tzinfo)
    # whose value happens to be UTC, but asyncpg has no way to know that — when
    # SQLAlchemy hands it a naive datetime for a `timestamptz` column, asyncpg
    # interprets it using the app server's LOCAL system timezone (IST on this
    # machine, UTC+5:30) before converting to true UTC for storage. Every
    # timestamp written this way ended up 5.5 hours off — reproduced directly:
    # inserting a row with the old default and reading it back showed a value
    # exactly 5h30m behind the database's own `now()` at the same instant.
    # server_default=func.now() asks Postgres for its own clock at INSERT time
    # instead, which is immune to this (see job.py/source.py/workspace.py,
    # which never had this bug because they already used this pattern).
    first_seen = Column(DateTime(timezone=True), server_default=func.now())
    last_seen = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Phase 11.1 — real migration tracking, replacing the Migration Planner's
    # old `assetStates` (a bare useState in migration/page.tsx that reset on
    # every reload and was never shared across a browser, let alone a team).
    # ASSESSED | PLANNED | IN_DEV | TESTING | MIGRATED — matches
    # MIGRATION_COLUMNS' ids in migration/page.tsx exactly.
    migration_status = Column(String(20), nullable=False, server_default="ASSESSED")
    migration_status_updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    # Set only by the Phase 12 verification engine (a real rescan confirming
    # the old algorithm is gone) — never by the user clicking "Advance"
    # directly, so "Migrated" can't silently mean "the user believes it is".
    migration_verified_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    workspace = relationship("Workspace", backref="assets")
    evidence = relationship("EvidenceModel", secondary="evidence_assets", backref="assets")
