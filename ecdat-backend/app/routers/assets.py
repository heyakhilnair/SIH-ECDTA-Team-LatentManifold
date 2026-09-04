"""
ECDAT Cryptographic Assets API Router — Phase 6
================================================
Endpoints:
  GET  /api/workspaces/{workspace_id}/assets     → List all canonical assets (filterable)
  GET  /api/assets/{asset_id}                    → Detailed asset with risk & recommendation
  GET  /api/assets/{asset_id}/evidence           → List raw evidence for asset
"""

import uuid
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.asset import CryptoAsset, EvidenceAsset
from app.models.risk import RiskScore
from app.models.recommendation import Recommendation
from app.models.evidence import EvidenceModel
from app.models.source import Source
from app.services.auth import get_current_user_id, verify_workspace_access

# ─── Workspace-scoped router ─────────────────────────────────────────────────
workspace_router = APIRouter(
    prefix="/workspaces/{workspace_id}/assets",
    tags=["assets"],
)

# ─── Asset-scoped router ─────────────────────────────────────────────────────
asset_router = APIRouter(
    prefix="/assets/{asset_id}",
    tags=["assets"],
)


def serialize_asset(asset: CryptoAsset, include_evidence: bool = False, source_names: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    risk = asset.risk_score
    rec = getattr(asset, "recommendation", None)
    source_names = source_names or {}

    # Which project(s) this asset's evidence actually comes from — an asset
    # can be shared across projects (same algorithm, multiple repos), so this
    # is a list, not a single value. Evidence with no source_id (legacy, from
    # before project attribution existed) is silently skipped unless it's
    # literally the only evidence this asset has.
    evidence_list = list(asset.evidence or [])
    project_names = sorted({source_names[str(ev.source_id)] for ev in evidence_list if ev.source_id and str(ev.source_id) in source_names})
    if not project_names and evidence_list:
        project_names = ["Unattributed"]

    data = {
        "id": str(asset.id),
        "workspace_id": str(asset.workspace_id),
        "algorithm_canonical": asset.algorithm_canonical,
        "algorithm_family": asset.algorithm_family,
        "algorithm_name": asset.algorithm_name,
        "key_size": asset.key_size,
        "function": asset.function,
        "standard": asset.standard,
        "oid": asset.oid,
        "quantum_vulnerable": asset.quantum_vulnerable,
        "classical_vulnerable": asset.classical_vulnerable,
        "vulnerability_notes": asset.vulnerability_notes,
        "first_seen": asset.first_seen.isoformat() if asset.first_seen else None,
        "last_seen": asset.last_seen.isoformat() if asset.last_seen else None,
        "created_at": asset.created_at.isoformat() if asset.created_at else None,
        # Risk summary
        "risk": {
            "composite_risk_level": risk.composite_risk_level if risk else "UNKNOWN",
            "quantum_risk_level": risk.quantum_risk_level if risk else "UNKNOWN",
            "classical_risk_level": risk.classical_risk_level if risk else "UNKNOWN",
            "quantum_reason": risk.quantum_reason if risk else None,
            "classical_reason": risk.classical_reason if risk else None,
            "mosca_threshold_exceeded": risk.mosca_threshold_exceeded if risk else False,
            "data_lifetime_years": risk.data_lifetime_years if risk else 7.0,
            "migration_time_years": risk.migration_time_years if risk else 2.0,
            "risk_explanation": risk.risk_explanation if risk else None,
        } if risk else None,
        # Recommendation summary
        "recommendation": {
            "recommended_algo": rec.recommended_algo,
            "candidate_algo": rec.candidate_algo,
            "hybrid_path": rec.hybrid_path,
            "nist_standard": rec.nist_standard,
            "migration_complexity": rec.migration_complexity,
            "confidence": rec.confidence,
            "reasoning": rec.reasoning,
        } if rec else None,
        # Evidence count
        "evidence_count": len(asset.evidence) if asset.evidence is not None else 0,
        # Project(s) this asset was found in — see comment above.
        "projects": project_names,
    }

    if include_evidence and asset.evidence:
        data["evidence"] = [
            {
                "id": str(ev.id),
                "source_type": ev.source_type,
                "source_id": str(ev.source_id) if ev.source_id else None,
                "file_path": ev.file_path,
                "line_number": ev.line_number,
                "raw_match": ev.raw_match,
                "context_lines": ev.context_lines,
                "detector": ev.detector,
                "confidence": ev.confidence,
                "created_at": ev.created_at.isoformat() if ev.created_at else None,
            }
            for ev in asset.evidence
        ]

    return data


# ─── Workspace Endpoints ─────────────────────────────────────────────────────

@workspace_router.get("", response_model=List[Dict[str, Any]])
async def list_workspace_assets(
    workspace_id: uuid.UUID,
    family: Optional[str] = None,
    quantum_vulnerable: Optional[bool] = None,
    classical_vulnerable: Optional[bool] = None,
    search: Optional[str] = None,
    source_id: Optional[uuid.UUID] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns list of canonical cryptographic assets for a workspace with joined risk and recommendations.
    Supports filtering by family, vulnerability status, search query, and source/project
    (source_id) — an asset is included if ANY of its evidence came from that source,
    since the same canonical algorithm can be shared across projects.
    """
    await verify_workspace_access(workspace_id, user_id, db)

    query = (
        select(CryptoAsset)
        .options(
            selectinload(CryptoAsset.risk_score),
            selectinload(CryptoAsset.recommendation),
            selectinload(CryptoAsset.evidence),
        )
        .where(CryptoAsset.workspace_id == workspace_id)
    )

    if source_id:
        matching_asset_ids = (
            select(EvidenceAsset.asset_id)
            .join(EvidenceModel, EvidenceModel.id == EvidenceAsset.evidence_id)
            .where(EvidenceModel.source_id == source_id)
        )
        query = query.where(CryptoAsset.id.in_(matching_asset_ids))

    if family:
        query = query.where(CryptoAsset.algorithm_family.ilike(f"%{family}%"))
    if quantum_vulnerable is not None:
        query = query.where(CryptoAsset.quantum_vulnerable == quantum_vulnerable)
    if classical_vulnerable is not None:
        query = query.where(CryptoAsset.classical_vulnerable == classical_vulnerable)
    if search:
        query = query.where(
            or_(
                CryptoAsset.algorithm_canonical.ilike(f"%{search}%"),
                CryptoAsset.algorithm_name.ilike(f"%{search}%"),
                CryptoAsset.algorithm_family.ilike(f"%{search}%"),
            )
        )

    query = query.order_by(CryptoAsset.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    assets = result.scalars().all()

    sources_result = await db.execute(select(Source.id, Source.name).where(Source.workspace_id == workspace_id))
    source_names = {str(sid): name for sid, name in sources_result.all()}

    return [serialize_asset(a, source_names=source_names) for a in assets]


# ─── Asset Endpoints ─────────────────────────────────────────────────────────

@asset_router.get("", response_model=Dict[str, Any])
async def get_asset_detail(
    asset_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns full details for a single cryptographic asset, including its risk score,
    recommendation, and full list of supporting evidence occurrences.
    """
    query = (
        select(CryptoAsset)
        .options(
            selectinload(CryptoAsset.workspace),
            selectinload(CryptoAsset.risk_score),
            selectinload(CryptoAsset.recommendation),
            selectinload(CryptoAsset.evidence),
        )
        .where(CryptoAsset.id == asset_id)
    )
    result = await db.execute(query)
    asset = result.scalar_one_or_none()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if not asset.workspace or asset.workspace.clerk_user_id != user_id:
        raise HTTPException(status_code=404, detail="Asset not found")

    sources_result = await db.execute(select(Source.id, Source.name).where(Source.workspace_id == asset.workspace_id))
    source_names = {str(sid): name for sid, name in sources_result.all()}

    return serialize_asset(asset, include_evidence=True, source_names=source_names)


@asset_router.get("/evidence", response_model=List[Dict[str, Any]])
async def get_asset_evidence(
    asset_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all immutable evidence records supporting this cryptographic asset.
    """
    query = (
        select(CryptoAsset)
        .options(
            selectinload(CryptoAsset.workspace),
            selectinload(CryptoAsset.evidence),
        )
        .where(CryptoAsset.id == asset_id)
    )
    result = await db.execute(query)
    asset = result.scalar_one_or_none()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if not asset.workspace or asset.workspace.clerk_user_id != user_id:
        raise HTTPException(status_code=404, detail="Asset not found")

    return [
        {
            "id": str(ev.id),
            "job_id": str(ev.job_id),
            "source_type": ev.source_type,
            "source_id": str(ev.source_id) if ev.source_id else None,
            "file_path": ev.file_path,
            "line_number": ev.line_number,
            "raw_match": ev.raw_match,
            "context_lines": ev.context_lines,
            "detector": ev.detector,
            "confidence": ev.confidence,
            "raw_metadata": ev.raw_metadata,
            "created_at": ev.created_at.isoformat() if ev.created_at else None,
        }
        for ev in (asset.evidence or [])
    ]
