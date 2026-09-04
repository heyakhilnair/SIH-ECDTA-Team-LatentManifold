import uuid
from sqlalchemy import Column, String, Text, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class AiSession(Base):
    """
    Phase 15 — real AI Analyst chat history. Every reload used to start a
    blank chat (frontend `messages` was a plain useState) with no way to look
    back at a previous session's answers — this is what backs a real history
    list. `source_id` records what project the session was scoped to when
    started, since that changes what the AI could even see.
    """
    __tablename__ = "ai_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id = Column(UUID(as_uuid=True), ForeignKey("sources.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(200), nullable=True)  # set once, from the first question — never edited
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    messages = relationship("AiMessage", backref="session", order_by="AiMessage.created_at", cascade="all, delete-orphan")


class AiMessage(Base):
    __tablename__ = "ai_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("ai_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # 'user' | 'assistant'
    text = Column(Text, nullable=False)
    confidence = Column(Float, nullable=True)
    evidence_citations = Column(JSONB, nullable=True)
    asset_citations = Column(JSONB, nullable=True)
    citation_details = Column(JSONB, nullable=True)
    unknowns = Column(JSONB, nullable=True)
    scope = Column(String(200), nullable=True)
    is_error = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
