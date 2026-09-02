import uuid
import datetime
from sqlalchemy import Column, String, Boolean, ForeignKey, Integer, DateTime, Text
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
    
    first_seen = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    last_seen = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    
    # Relationships
    workspace = relationship("Workspace", backref="assets")
    evidence = relationship("EvidenceModel", secondary="evidence_assets", backref="assets")
