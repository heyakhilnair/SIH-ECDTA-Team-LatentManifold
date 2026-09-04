from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID

class WorkspaceBase(BaseModel):
    name: str

class WorkspaceCreate(WorkspaceBase):
    # Real bug found live 2026-09-05: this used to require the client to
    # supply clerk_user_id in the request body. create_workspace() (routers/
    # workspaces.py) was already correctly ignoring it and deriving the real
    # owner from the verified JWT instead ("Force the clerk_user_id to be
    # the authenticated user") — a real, deliberate P0 auth-bypass fix. But
    # this schema was never updated to match, so it kept demanding a field
    # the (correctly secure) frontend never sends, which meant every single
    # brand-new user hit a 422 and could never create their first workspace
    # at all — only pre-existing workspaces kept working, since those load
    # via a GET, not this POST. Removed entirely rather than just made
    # optional: it was never read anywhere in the handler, so keeping it
    # around unused would just be misleading about what this endpoint
    # actually needs from the client.
    pass

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
