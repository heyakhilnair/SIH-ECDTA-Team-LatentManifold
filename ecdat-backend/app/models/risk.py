import uuid
import datetime
from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base

class RiskScore(Base):
    __tablename__ = "risk_scores"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("crypto_assets.id", ondelete="CASCADE"), nullable=False, unique=True)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    
    # Inputs to the risk model
    data_lifetime_years = Column(Integer, nullable=False, default=10)
    migration_time_years = Column(Float, nullable=False, default=2.0)
    business_criticality = Column(String(20), nullable=False, default="HIGH")  # CRITICAL, HIGH, MEDIUM, LOW
    exposure = Column(String(20), nullable=False, default="INTERNAL")          # PUBLIC, INTERNAL, ISOLATED
    
    # Mosca scores
    mosca_threshold_exceeded = Column(Boolean, nullable=False, default=False)
    
    # Computed Risk
    quantum_risk_level = Column(String(20), nullable=False)    # CRITICAL, HIGH, MEDIUM, LOW, SAFE
    classical_risk_level = Column(String(20), nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW, SAFE
    composite_risk_level = Column(String(20), nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW, SAFE
    
    # Explanations
    quantum_reason = Column(Text, nullable=True)
    classical_reason = Column(Text, nullable=True)
    risk_explanation = Column(JSONB, nullable=True)  # Structured multi-dimensional explanation
    
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # Relationships
    asset = relationship("CryptoAsset", backref="risk_score", uselist=False)
    workspace = relationship("Workspace", backref="risk_scores")
