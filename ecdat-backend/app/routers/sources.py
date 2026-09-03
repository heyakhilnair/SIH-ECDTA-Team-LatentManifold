from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from uuid import UUID

from app.database import get_db
from app.models.source import Source
from app.services.auth import get_current_user_id, verify_workspace_access
from app.services.audit import log_event
from pydantic import BaseModel, ConfigDict
from typing import Optional, Literal
from datetime import datetime

router = APIRouter(prefix="/api", tags=["Sources"])

class SourceCreate(BaseModel):
    name: str
    source_type: Literal['git', 'container', 'certificate']
    configuration: dict = {}

class SourceStatus(BaseModel):
    id: UUID
    name: str
    source_type: str
    health_status: str
    last_scanned_at: Optional[datetime] = None
    configuration: dict
    
    model_config = ConfigDict(from_attributes=True)

@router.post("/workspaces/{wid}/sources", response_model=SourceStatus)
async def create_source(
    wid: UUID,
    source_in: SourceCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(wid, user_id, db)

    new_source = Source(
        workspace_id=wid,
        name=source_in.name,
        source_type=source_in.source_type,
        configuration=source_in.configuration,
        health_status="unknown"
    )
    db.add(new_source)
    await db.commit()
    await db.refresh(new_source)
    await log_event(db, wid, user_id, "SOURCE_ADDED", "source", new_source.id, details={"name": new_source.name, "source_type": new_source.source_type})
    return new_source

@router.get("/workspaces/{wid}/sources", response_model=List[SourceStatus])
async def list_sources(
    wid: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(wid, user_id, db)

    result = await db.execute(
        select(Source)
        .where(Source.workspace_id == wid)
        .order_by(Source.created_at.desc())
    )
    sources = result.scalars().all()
    return sources
