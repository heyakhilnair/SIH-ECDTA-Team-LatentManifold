"""
ECDAT Unified Evidence Feed API Router — Phase 13
===================================================
Endpoints:
  GET /api/workspaces/{workspace_id}/evidence → paginated, filterable workspace-wide evidence feed

Evidence itself was already real and viewable (GET /api/assets/{id}/evidence)
— this is the same underlying `evidence` table, just workspace-wide with
filters, so a user isn't stuck hunting asset-by-asset. Mirrors audit.py's
list_activity pagination pattern.
"""
import uuid
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.database import get_db
from app.services.auth import get_current_user_id, verify_workspace_access
from app.models.evidence import EvidenceModel
from app.models.asset import EvidenceAsset, CryptoAsset
from app.models.source import Source

router = APIRouter(prefix="/workspaces/{workspace_id}/evidence", tags=["evidence"])


@router.get("", response_model=Dict[str, Any])
async def list_evidence(
    workspace_id: uuid.UUID,
    source_id: Optional[uuid.UUID] = None,
    algorithm: Optional[str] = Query(None, description="Prefix match on the resolved asset's algorithm_canonical, e.g. 'RSA' or 'RSA:2048'"),
    source_type: Optional[str] = Query(None, description="'source_code' | 'dependency' | 'certificate' | 'semgrep'"),
    detector: Optional[str] = None,
    min_confidence: Optional[float] = Query(None, ge=0.0, le=1.0),
    search: Optional[str] = Query(None, description="Substring match on file_path or raw_match"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(workspace_id, user_id, db)

    conditions = [EvidenceModel.workspace_id == workspace_id]
    if source_id:
        conditions.append(EvidenceModel.source_id == source_id)
    if source_type:
        conditions.append(EvidenceModel.source_type == source_type)
    if detector:
        conditions.append(EvidenceModel.detector == detector)
    if min_confidence is not None:
        conditions.append(EvidenceModel.confidence >= min_confidence)
    if search:
        like = f"%{search}%"
        conditions.append(or_(EvidenceModel.file_path.ilike(like), EvidenceModel.raw_match.ilike(like)))

    base_query = select(EvidenceModel).where(*conditions)
    if algorithm:
        # Evidence rows don't carry an algorithm name themselves — only their
        # resolved CryptoAsset does (dependency evidence may resolve to none
        # at all). Filtering by algorithm means "evidence whose resolved
        # asset's canonical name starts with this".
        base_query = (
            base_query.join(EvidenceAsset, EvidenceAsset.evidence_id == EvidenceModel.id)
            .join(CryptoAsset, CryptoAsset.id == EvidenceAsset.asset_id)
            .where(CryptoAsset.algorithm_canonical.ilike(f"{algorithm}%"))
        )

    total_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total = total_result.scalar_one()

    page_result = await db.execute(base_query.order_by(EvidenceModel.created_at.desc()).limit(limit).offset(offset))
    rows = page_result.scalars().all()

    # Resolve source names + algorithm labels for just this page (not the
    # whole table) — two small lookups, not a per-row query.
    source_ids = {r.source_id for r in rows if r.source_id}
    source_names: Dict[str, str] = {}
    if source_ids:
        sources_result = await db.execute(select(Source).where(Source.id.in_(source_ids)))
        source_names = {str(s.id): s.name for s in sources_result.scalars().all()}

    evidence_ids = [r.id for r in rows]
    algo_map: Dict[str, str] = {}
    if evidence_ids:
        algo_result = await db.execute(
            select(EvidenceAsset.evidence_id, CryptoAsset.algorithm_canonical)
            .join(CryptoAsset, CryptoAsset.id == EvidenceAsset.asset_id)
            .where(EvidenceAsset.evidence_id.in_(evidence_ids))
        )
        algo_map = {str(eid): algo for eid, algo in algo_result.all()}

    return {
        "total": total,
        "items": [
            {
                "id": str(r.id),
                "job_id": str(r.job_id),
                "source_id": str(r.source_id) if r.source_id else None,
                "source_name": source_names.get(str(r.source_id)) if r.source_id else None,
                "source_type": r.source_type,
                "file_path": r.file_path,
                "line_number": r.line_number,
                "raw_match": r.raw_match,
                "context_lines": r.context_lines,
                "detector": r.detector,
                "confidence": r.confidence,
                "algorithm_canonical": algo_map.get(str(r.id)),
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
    }
