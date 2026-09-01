from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models.workspace import Workspace
from app.schemas.workspace import WorkspaceCreate, WorkspaceResponse
from app.services.auth import get_current_user_id

router = APIRouter(prefix="/api/workspaces", tags=["Workspaces"])

@router.get("/me", response_model=WorkspaceResponse)
async def get_my_workspace(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Workspace).where(Workspace.clerk_user_id == user_id))
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace

@router.post("", response_model=WorkspaceResponse)
async def create_workspace(
    workspace_in: WorkspaceCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    # Ensure they don't already have one
    existing = await db.execute(select(Workspace).where(Workspace.clerk_user_id == user_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Workspace already exists for this user")
    
    # Force the clerk_user_id to be the authenticated user
    new_workspace = Workspace(
        clerk_user_id=user_id,
        name=workspace_in.name
    )
    db.add(new_workspace)
    await db.commit()
    await db.refresh(new_workspace)
    return new_workspace
