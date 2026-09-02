import uuid
import datetime
from sqlalchemy import Column, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship, backref
from app.database import Base

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("crypto_assets.id", ondelete="CASCADE"), nullable=False)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)

    current_algo = Column(String(100), nullable=False)
    recommended_algo = Column(String(100), nullable=False)
    candidate_algo = Column(String(100), nullable=True)
    hybrid_path = Column(Text, nullable=True)
    reasoning = Column(JSONB, nullable=True)
    confidence = Column(Float, default=0.90)
    nist_standard = Column(String(50), nullable=True)
    migration_complexity = Column(String(20), nullable=True)

    generated_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    asset = relationship("CryptoAsset", backref=backref("recommendation", uselist=False))
    workspace = relationship("Workspace", backref="recommendations")
