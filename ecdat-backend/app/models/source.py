from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid

class Source(Base):
    __tablename__ = "sources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    source_type = Column(String(50), nullable=False) # 'git', 'container', 'certificate'
    configuration = Column(JSONB, default=dict)
    health_status = Column(String(50), default="unknown")
    last_scanned_at = Column(DateTime(timezone=True), nullable=True)
    # AI Analyst data-access control (Phase 8 PDF sec 58-59: "Sensitive
    # Repository -> Local AI Required" / data-classification-driven AI
    # routing). When True, no asset whose evidence comes *only* from this
    # source is ever included in the AI Analyst's context — see
    # services/ai_analyst.py's build_context(). Default False so existing
    # sources keep working; turn it on per-project for anything sensitive.
    ai_excluded = Column(Boolean, nullable=False, server_default="false")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class JobSource(Base):
    __tablename__ = "job_sources"

    job_id = Column(UUID(as_uuid=True), ForeignKey("discovery_jobs.id", ondelete="CASCADE"), primary_key=True)
    source_id = Column(UUID(as_uuid=True), ForeignKey("sources.id", ondelete="CASCADE"), primary_key=True)
    status = Column(String(20), default="queued") # 'queued', 'running', 'completed', 'failed'
