from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID

class WorkspaceBase(BaseModel):
    name: str

class WorkspaceCreate(WorkspaceBase):
    clerk_user_id: str

class WorkspaceResponse(WorkspaceBase):
    id: UUID
    clerk_user_id: str
    threat_horizon_years: float
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class WorkspaceSettingsUpdate(BaseModel):
    # Z in Mosca's inequality — years until a cryptographically relevant
    # quantum computer is expected. Must stay positive and within a sane
    # planning horizon.
    threat_horizon_years: float
