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
    ai_excluded: bool = False

    model_config = ConfigDict(from_attributes=True)


class SourceUpdate(BaseModel):
    # Only the fields a user should be able to flip after creation. Both
    # optional so PATCH can change just one without re-sending the other.
    name: Optional[str] = None
    ai_excluded: Optional[bool] = None

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


@router.patch("/workspaces/{wid}/sources/{sid}", response_model=SourceStatus)
async def update_source(
    wid: UUID,
    sid: UUID,
    body: SourceUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Used for the AI Analyst data-access control toggle (Phase 8 PDF sec 58-59)
    and renaming a source. 404s (not 403) for a source outside this workspace —
    never reveals whether it exists to someone who doesn't own it.
    """
    await verify_workspace_access(wid, user_id, db)

    result = await db.execute(select(Source).where(Source.id == sid, Source.workspace_id == wid))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    changes = body.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(source, field, value)

    await db.commit()
    await db.refresh(source)
    if "ai_excluded" in changes:
        await log_event(
            db, wid, user_id, "SOURCE_AI_ACCESS_CHANGED", "source", source.id,
            details={"ai_excluded": source.ai_excluded},
        )
    return source
