import uuid
from sqlalchemy import Column, String, Integer, Float, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy import DateTime
from app.database import Base

class EvidenceModel(Base):
    __tablename__ = "evidence"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("discovery_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    # Which registered Source this evidence came from — a job can scan
    # multiple sources at once, so job_id alone can't answer "which project
    # is this finding from". Nullable + ON DELETE SET NULL (not CASCADE):
    # evidence is append-only, so deleting a source must never delete
    # evidence rows, just orphan this pointer.
    source_id = Column(UUID(as_uuid=True), ForeignKey("sources.id", ondelete="SET NULL"), nullable=True, index=True)
    source_type = Column(String(50), nullable=False)
    file_path = Column(Text, nullable=True)
    line_number = Column(Integer, nullable=True)
    raw_match = Column(Text, nullable=False)
    context_lines = Column(Text, nullable=True)
    detector = Column(String(100), nullable=False)
    confidence = Column(Float, nullable=False, default=1.0)
    raw_metadata = Column(JSONB, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
