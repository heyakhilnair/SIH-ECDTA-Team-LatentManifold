"""
ECDAT Risk API Router — Phase 4
================================
Endpoints:
  GET  /api/workspaces/{workspace_id}/risk           → All assets with risk, sorted by composite priority
  GET  /api/workspaces/{workspace_id}/risk/summary   → Counts: critical, high, medium, low, safe
  GET  /api/assets/{asset_id}/risk                   → Full risk detail for one asset
  POST /api/assets/{asset_id}/risk/recalculate       → Recalculate with custom parameters
"""

import uuid
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.asset import CryptoAsset, EvidenceAsset
from app.models.evidence import EvidenceModel
from app.models.risk import RiskScore
from app.services.risk_engine import compute_asset_risk
from app.services.auth import get_current_user_id, verify_workspace_access

# ─── Priority sort order ─────────────────────────────────────────────────────
PRIORITY_ORDER = {"CRITICAL": 1, "HIGH": 2, "MEDIUM": 3, "LOW": 4, "SAFE": 5}

# ─── Workspace-scoped router ─────────────────────────────────────────────────
workspace_router = APIRouter(
    prefix="/workspaces/{workspace_id}/risk",
    tags=["risk"],
)

# ─── Asset-scoped router (no workspace prefix) ───────────────────────────────
asset_router = APIRouter(
    prefix="/assets/{asset_id}/risk",
    tags=["risk"],
)


def serialize_risk(r: RiskScore) -> Dict[str, Any]:
    """Convert a RiskScore ORM object to a dict suitable for API response."""
    return {
        "id": str(r.id) if r.id else None,  # None for a persist=False what-if preview, which never gets a real row/id
        "asset_id": str(r.asset_id),
        "workspace_id": str(r.workspace_id),
        "algorithm_canonical": r.asset.algorithm_canonical if r.asset else None,
        "algorithm_family": r.asset.algorithm_family if r.asset else None,
        "quantum_vulnerable": r.asset.quantum_vulnerable if r.asset else None,
        "classical_vulnerable": r.asset.classical_vulnerable if r.asset else None,
        # Risk levels
        "composite_risk_level": r.composite_risk_level,
        "quantum_risk_level": r.quantum_risk_level,
        "classical_risk_level": r.classical_risk_level,
        # Inputs
        "business_criticality": r.business_criticality,
        "data_lifetime_years": r.data_lifetime_years,
        "migration_time_years": r.migration_time_years,
        "mosca_threshold_exceeded": r.mosca_threshold_exceeded,
        # Explanations
        "quantum_reason": r.quantum_reason,
        "classical_reason": r.classical_reason,
        "risk_explanation": r.risk_explanation,
    }


# ─── Workspace-scoped endpoints ──────────────────────────────────────────────

@workspace_router.get("", response_model=List[Dict[str, Any]])
async def get_workspace_risks(
    workspace_id: uuid.UUID,
    source_id: Optional[uuid.UUID] = None,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Return all assets with their risk scores for a workspace, sorted by composite priority.
    Critical findings first. Optionally scoped to one project/source.
    """
    await verify_workspace_access(workspace_id, user_id, db)

    query = (
        select(RiskScore)
        .options(selectinload(RiskScore.asset))
        .where(RiskScore.workspace_id == workspace_id)
    )
    if source_id:
        matching_asset_ids = (
            select(EvidenceAsset.asset_id)
            .join(EvidenceModel, EvidenceModel.id == EvidenceAsset.evidence_id)
            .where(EvidenceModel.source_id == source_id)
        )
        query = query.where(RiskScore.asset_id.in_(matching_asset_ids))
    result = await db.execute(query)
    risks = result.scalars().all()

    output = [serialize_risk(r) for r in risks]
    output.sort(key=lambda x: PRIORITY_ORDER.get(x.get("composite_risk_level", ""), 99))
    return output


@workspace_router.get("/summary", response_model=Dict[str, Any])
async def get_risk_summary(
    workspace_id: uuid.UUID,
    source_id: Optional[uuid.UUID] = None,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Return counts of assets per risk level for a workspace.
    Also returns total and the percentage breakdown.
    """
    await verify_workspace_access(workspace_id, user_id, db)

    query = (
        select(RiskScore.composite_risk_level, func.count(RiskScore.id))
        .where(RiskScore.workspace_id == workspace_id)
        .group_by(RiskScore.composite_risk_level)
    )
    if source_id:
        matching_asset_ids = (
            select(EvidenceAsset.asset_id)
            .join(EvidenceModel, EvidenceModel.id == EvidenceAsset.evidence_id)
            .where(EvidenceModel.source_id == source_id)
        )
        query = query.where(RiskScore.asset_id.in_(matching_asset_ids))
    result = await db.execute(query)
    counts = dict(result.all())

    critical = counts.get("CRITICAL", 0)
    high = counts.get("HIGH", 0)
    medium = counts.get("MEDIUM", 0)
    low = counts.get("LOW", 0)
    safe = counts.get("SAFE", 0)
    total = critical + high + medium + low + safe

    return {
        "CRITICAL": critical,
        "HIGH": high,
        "MEDIUM": medium,
        "LOW": low,
        "SAFE": safe,
        "total": total,
        "breakdown_pct": {
            "CRITICAL": round(critical / total * 100, 1) if total else 0,
            "HIGH": round(high / total * 100, 1) if total else 0,
            "MEDIUM": round(medium / total * 100, 1) if total else 0,
            "LOW": round(low / total * 100, 1) if total else 0,
            "SAFE": round(safe / total * 100, 1) if total else 0,
        }
    }


# ─── Asset-scoped endpoints ──────────────────────────────────────────────────

class RecalculateRequest(BaseModel):
    data_lifetime_years: float = 7.0
    business_criticality: str = "HIGH"
    exposure: str = "INTERNAL"
    # None = use the workspace's configured threat horizon (Settings > Risk
    # Policies); only set this to override it for a one-off what-if.
    threat_horizon_years: Optional[float] = None


@asset_router.get("", response_model=Dict[str, Any])
async def get_asset_risk(
    asset_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Return the full risk detail for a single asset.
    Includes the complete structured risk_explanation JSON.
    """
    # Fetch asset + verify ownership via workspace
    asset_query = (
        select(CryptoAsset)
        .options(selectinload(CryptoAsset.workspace))
        .where(CryptoAsset.id == asset_id)
    )
    asset_result = await db.execute(asset_query)
    asset = asset_result.scalar_one_or_none()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Validate workspace ownership
    if not asset.workspace or asset.workspace.clerk_user_id != user_id:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Fetch risk score
    risk_query = (
        select(RiskScore)
        .options(selectinload(RiskScore.asset))
        .where(RiskScore.asset_id == asset_id)
    )
    risk_result = await db.execute(risk_query)
    risk = risk_result.scalar_one_or_none()

    if not risk:
        raise HTTPException(
            status_code=404,
            detail="No risk score computed for this asset. Run a discovery job first."
        )

    return serialize_risk(risk)


@asset_router.post("/recalculate", response_model=Dict[str, Any])
async def recalculate_asset_risk(
    asset_id: uuid.UUID,
    body: RecalculateRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Recalculate the risk score for an asset with custom parameters.
    Useful for 'what-if' scenarios (e.g. change data lifetime or threat horizon).
    """
    # Fetch asset + verify ownership
    asset_query = (
        select(CryptoAsset)
        .options(selectinload(CryptoAsset.workspace))
        .where(CryptoAsset.id == asset_id)
    )
    asset_result = await db.execute(asset_query)
    asset = asset_result.scalar_one_or_none()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if not asset.workspace or asset.workspace.clerk_user_id != user_id:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Validate criticality
    valid_criticality = {"CRITICAL", "HIGH", "MEDIUM", "LOW"}
    if body.business_criticality.upper() not in valid_criticality:
        raise HTTPException(
            status_code=422,
            detail=f"business_criticality must be one of: {', '.join(sorted(valid_criticality))}"
        )

    # persist=False — this is a hypothetical "what if" preview, not a real
    # scan result. Real bug fixed 2026-09-04: this used to persist=True,
    # so every slider experiment silently overwrote the asset's actual risk
    # score everywhere else in the product (Mission Control, Risk table,
    # Migration Planner) until the next real scan corrected it.
    risk = await compute_asset_risk(
        db=db,
        asset=asset,
        data_lifetime_years=body.data_lifetime_years,
        business_criticality=body.business_criticality.upper(),
        exposure=body.exposure.upper(),
        threat_horizon_years=body.threat_horizon_years,
        persist=False,
    )

    # Built directly from `asset` + the transient preview, not serialize_risk()
    # — a persist=False RiskScore has no `.asset` relationship wired (see the
    # comment in risk_engine.py on why), so `serialize_risk`'s `r.asset.*`
    # lookups would just raise here.
    return {
        "id": None,  # this is a preview, never a real persisted risk_scores row
        "asset_id": str(asset.id),
        "workspace_id": str(asset.workspace_id),
        "algorithm_canonical": asset.algorithm_canonical,
        "algorithm_family": asset.algorithm_family,
        "quantum_vulnerable": asset.quantum_vulnerable,
        "classical_vulnerable": asset.classical_vulnerable,
        "composite_risk_level": risk.composite_risk_level,
        "quantum_risk_level": risk.quantum_risk_level,
        "classical_risk_level": risk.classical_risk_level,
        "business_criticality": risk.business_criticality,
        "data_lifetime_years": risk.data_lifetime_years,
        "migration_time_years": risk.migration_time_years,
        "mosca_threshold_exceeded": risk.mosca_threshold_exceeded,
        "quantum_reason": risk.quantum_reason,
        "classical_reason": risk.classical_reason,
        "risk_explanation": risk.risk_explanation,
    }
