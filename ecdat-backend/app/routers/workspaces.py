from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models.workspace import Workspace
from app.schemas.workspace import WorkspaceCreate, WorkspaceResponse, WorkspaceSettingsUpdate
from app.services.auth import get_current_user_id
from app.services.audit import log_event

router = APIRouter(prefix="/api/workspaces", tags=["Workspaces"])

# Sane bounds for Z (threat horizon). Below 1y or beyond a century isn't a
# planning input, it's a typo.
MIN_THREAT_HORIZON_YEARS = 1.0
MAX_THREAT_HORIZON_YEARS = 100.0

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
    try:
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
        await log_event(db, new_workspace.id, user_id, "WORKSPACE_CREATED", "workspace", new_workspace.id)
        return new_workspace
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/me/settings", response_model=WorkspaceResponse)
async def update_my_workspace_settings(
    settings_in: WorkspaceSettingsUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates workspace-level risk settings — currently just the Mosca threat
    horizon (Z). This is what makes Z an actual configurable setting instead
    of a hardcoded constant; see docs/BACKEND_AUDIT_PHASE0-6.md #10.
    """
    if not (MIN_THREAT_HORIZON_YEARS <= settings_in.threat_horizon_years <= MAX_THREAT_HORIZON_YEARS):
        raise HTTPException(
            status_code=422,
            detail=f"threat_horizon_years must be between {MIN_THREAT_HORIZON_YEARS} and {MAX_THREAT_HORIZON_YEARS}",
        )

    result = await db.execute(select(Workspace).where(Workspace.clerk_user_id == user_id))
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    before = workspace.threat_horizon_years
    workspace.threat_horizon_years = settings_in.threat_horizon_years
    await db.commit()
    await db.refresh(workspace)
    await log_event(
        db, workspace.id, user_id, "POLICY_UPDATED", "workspace", workspace.id,
        details={"field": "threat_horizon_years", "before": before, "after": settings_in.threat_horizon_years},
    )

    # Recompute every asset's risk under the new Z so the dashboard reflects it
    # immediately, not just on the next scan — matches the "instantly
    # recalculating the Risk Matrix for the entire enterprise" spec.
    from app.models.asset import CryptoAsset
    from app.services.risk_engine import compute_asset_risk

    assets_result = await db.execute(select(CryptoAsset).where(CryptoAsset.workspace_id == workspace.id))
    for asset in assets_result.scalars().all():
        await compute_asset_risk(db, asset)  # threat_horizon_years=None -> reads the new workspace value

    return workspace
