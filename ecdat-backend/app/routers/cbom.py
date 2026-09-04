import uuid
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.services.auth import get_current_user_id, verify_workspace_access
from app.services.audit import log_event
from app.models.cbom import CbomSnapshot
from app.models.asset import CryptoAsset, EvidenceAsset
from app.models.evidence import EvidenceModel
from app.services.cbom_generator import generate_cyclonedx_cbom, to_cyclonedx_xml

router = APIRouter(
    prefix="/workspaces/{workspace_id}/cbom",
    tags=["cbom"]
)

# A top-level (not workspace-prefixed) router for fetching one historical
# snapshot by its own id — matches PRODUCT_REFERENCE.md §5's
# `GET /api/cbom/{id}` shape. Ownership is still checked (via the snapshot's
# own workspace relationship), same workspace-isolation guarantee as every
# other endpoint, just addressed by snapshot id instead of workspace id.
snapshot_router = APIRouter(prefix="/cbom", tags=["cbom"])


def _filter_by_source(content: dict, allowed_refs: set) -> dict:
    return {**content, "components": [c for c in content.get("components", []) if c.get("bom-ref") in allowed_refs]}


def _render(content: dict, format: str) -> Any:
    if format == "xml":
        return Response(content=to_cyclonedx_xml(content), media_type="application/xml")
    return content


@router.get("")
async def get_latest_cbom(
    workspace_id: uuid.UUID,
    source_id: Optional[uuid.UUID] = None,
    format: str = Query("json", pattern="^(json|xml)$"),
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
        content = _filter_by_source(content, allowed_refs)

    return _render(content, format)


@router.get("/history", response_model=List[Dict[str, Any]])
async def list_cbom_history(
    workspace_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=200),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Phase 15 — every past snapshot, newest first, for a history picker."""
    await verify_workspace_access(workspace_id, user_id, db)

    result = await db.execute(
        select(CbomSnapshot)
        .where(CbomSnapshot.workspace_id == workspace_id)
        .order_by(CbomSnapshot.created_at.desc())
        .limit(limit)
    )
    return [
        {
            "id": str(s.id),
            "job_id": str(s.job_id) if s.job_id else None,
            "version": s.version,
            "asset_count": s.asset_count,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in result.scalars().all()
    ]


@snapshot_router.get("/{snapshot_id}")
async def get_cbom_snapshot(
    snapshot_id: uuid.UUID,
    format: str = Query("json", pattern="^(json|xml)$"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Phase 15 — one historical CBOM snapshot by id, in JSON or XML."""
    result = await db.execute(
        select(CbomSnapshot).options(selectinload(CbomSnapshot.workspace)).where(CbomSnapshot.id == snapshot_id)
    )
    snapshot = result.scalar_one_or_none()
    if not snapshot or not snapshot.workspace or snapshot.workspace.clerk_user_id != user_id:
        raise HTTPException(status_code=404, detail="CBOM snapshot not found")

    return _render(snapshot.content, format)

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
