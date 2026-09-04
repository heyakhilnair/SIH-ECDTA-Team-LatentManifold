import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base

class CbomSnapshot(Base):
    __tablename__ = "cbom_snapshots"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(UUID(as_uuid=True), ForeignKey("discovery_jobs.id"), nullable=True)
    
    version = Column(String(20), nullable=False, default="1.0.0")
    format = Column(String(20), nullable=False, default="cyclonedx-json")
    content = Column(JSONB, nullable=False)
    asset_count = Column(Integer, nullable=False, default=0)
    
    # server_default=func.now() — see models/audit.py's comment for why the old
    # Python-side default=datetime.datetime.utcnow was a real, reproduced bug.
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    workspace = relationship("Workspace", backref="cbom_snapshots")
    job = relationship("DiscoveryJob", backref="cbom_snapshots")
