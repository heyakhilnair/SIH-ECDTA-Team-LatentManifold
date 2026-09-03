from sqlalchemy import Column, String, DateTime, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base
import uuid

class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clerk_user_id = Column(String(255), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    # Z in Mosca's inequality (X + Y > Z) — years until a cryptographically
    # relevant quantum computer is expected. A workspace-level setting, not a
    # hardcoded constant — see docs/BACKEND_AUDIT_PHASE0-6.md #10.
    threat_horizon_years = Column(Float, nullable=False, server_default="12.0")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
