from pydantic import BaseModel, ConfigDict
from typing import Optional, Literal
from uuid import UUID
from datetime import datetime

from typing import List

class JobCreate(BaseModel):
    source_ids: List[UUID]

class JobStatus(BaseModel):
    id: UUID
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    evidence_count: int = 0
    asset_count: int = 0
    error_msg: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)
