import uuid
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.services.auth import get_current_user_id, verify_workspace_access
from app.services.audit import log_event
from app.models.cbom import CbomSnapshot
from app.models.asset import CryptoAsset, EvidenceAsset
from app.models.evidence import EvidenceModel
from app.services.cbom_generator import generate_cyclonedx_cbom

router = APIRouter(
    prefix="/workspaces/{workspace_id}/cbom",
    tags=["cbom"]
)


@router.get("", response_model=Dict[str, Any])
async def get_latest_cbom(
    workspace_id: uuid.UUID,
    source_id: Optional[uuid.UUID] = None,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    The CBOM snapshot is generated for the whole workspace (CycloneDX has no
    native "project" grouping), so a source_id scope filters the persisted
    snapshot's components down to that project's assets at read time rather
    than requiring a separate snapshot per source.
    """
    await verify_workspace_access(workspace_id, user_id, db)

    query = select(CbomSnapshot).where(
        CbomSnapshot.workspace_id == workspace_id
    ).order_by(CbomSnapshot.created_at.desc()).limit(1)

    result = await db.execute(query)
    snapshot = result.scalar_one_or_none()

    if not snapshot:
        raise HTTPException(status_code=404, detail="No CBOM found for this workspace. Run a discovery job first.")

    content = snapshot.content
    if source_id:
        asset_ids_result = await db.execute(
            select(EvidenceAsset.asset_id)
            .join(EvidenceModel, EvidenceModel.id == EvidenceAsset.evidence_id)
            .where(EvidenceModel.source_id == source_id)
        )
        allowed_refs = {f"urn:uuid:{aid}" for aid in asset_ids_result.scalars().all()}
        content = {
            **content,
            "components": [c for c in content.get("components", []) if c.get("bom-ref") in allowed_refs],
        }

    return content

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
