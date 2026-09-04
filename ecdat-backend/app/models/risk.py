import uuid
from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Text, Boolean, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship, backref
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
    
    # server_default=func.now() — see models/audit.py's comment for why the old
    # Python-side default=datetime.datetime.utcnow was a real, reproduced bug.
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    #
    # `backref="risk_score", uselist=False` here only makes THIS side
    # (RiskScore.asset) scalar - the reverse side SQLAlchemy creates on
    # CryptoAsset (CryptoAsset.risk_score) still defaulted to a list, despite
    # asset_id being unique=True. Found live: `app/routers/assets.py` does
    # `asset.risk_score.composite_risk_level`, which 500'd with
    # `AttributeError: 'InstrumentedList' object has no attribute
    # 'composite_risk_level'` on every real request once an asset actually
    # had a risk score - a real GitHub scan through the real UI, not a unit
    # test, is what surfaced this. models/recommendation.py already has the
    # correct pattern (`backref=backref("recommendation", uselist=False)`,
    # using the backref() helper so uselist applies to both sides) - matching
    # it here.
    asset = relationship("CryptoAsset", backref=backref("risk_score", uselist=False))
    workspace = relationship("Workspace", backref="risk_scores")
