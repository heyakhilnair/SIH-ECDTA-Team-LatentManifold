import uuid
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.services.auth import get_current_user_id, verify_workspace_access
from app.services.audit import log_event
from app.models.cbom import CbomSnapshot
from app.models.asset import CryptoAsset
from app.services.cbom_generator import generate_cyclonedx_cbom

router = APIRouter(
    prefix="/workspaces/{workspace_id}/cbom",
    tags=["cbom"]
)


@router.get("", response_model=Dict[str, Any])
async def get_latest_cbom(
    workspace_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    await verify_workspace_access(workspace_id, user_id, db)
    
    query = select(CbomSnapshot).where(
        CbomSnapshot.workspace_id == workspace_id
    ).order_by(CbomSnapshot.created_at.desc()).limit(1)
    
    result = await db.execute(query)
    snapshot = result.scalar_one_or_none()
    
    if not snapshot:
        raise HTTPException(status_code=404, detail="No CBOM found for this workspace. Run a discovery job first.")
        
    return snapshot.content

@router.post("/generate", response_model=Dict[str, Any])
async def trigger_cbom_generation(
    workspace_id: uuid.UUID,
    job_id: uuid.UUID = None,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    await verify_workspace_access(workspace_id, user_id, db)
    
    # Fetch all assets
    query = select(CryptoAsset).where(CryptoAsset.workspace_id == workspace_id)
    result = await db.execute(query)
    assets = list(result.scalars().all())
    
    if not assets:
        raise HTTPException(status_code=404, detail="No cryptographic assets found in this workspace. Run a discovery job first.")
        
    cbom = await generate_cyclonedx_cbom(db, assets, workspace_id, job_id)
    await log_event(db, workspace_id, user_id, "CBOM_GENERATED", "workspace", workspace_id, details={"component_count": len(assets)})
    return cbom
