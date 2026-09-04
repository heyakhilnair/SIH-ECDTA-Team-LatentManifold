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
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.asset import CryptoAsset, EvidenceAsset
from app.models.risk import RiskScore
from app.models.recommendation import Recommendation
from app.models.evidence import EvidenceModel
from app.models.source import Source
from app.models.job import DiscoveryJob
from app.services.auth import get_current_user_id, verify_workspace_access
from app.services.audit import log_event

# Phase 11.1 — matches MIGRATION_COLUMNS' ids in migration/page.tsx exactly.
MIGRATION_STATUSES = {"ASSESSED", "PLANNED", "IN_DEV", "TESTING", "MIGRATED"}

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
        # Phase 11.1 — real, persisted migration board state (see migration_status_updated_at
        # comment in models/asset.py for why this replaced a browser-local useState).
        "migration_status": asset.migration_status,
        "migration_status_updated_at": asset.migration_status_updated_at.isoformat() if asset.migration_status_updated_at else None,
        "migration_verified_at": asset.migration_verified_at.isoformat() if asset.migration_verified_at else None,
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


class MigrationStatusUpdate(BaseModel):
    status: str


@asset_router.patch("/migration-status", response_model=Dict[str, Any])
async def update_migration_status(
    asset_id: uuid.UUID,
    body: MigrationStatusUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Phase 11.1 — the real persistence layer behind the Migration Planner
    board. A card's column used to live only in migration/page.tsx's
    `useState` (browser-local, lost on reload, never shared). This is the
    single source of truth now.

    MIGRATED is accepted here (a user can drag a card there themselves —
    Migration Planner's column 5 description is explicit that ECDAT never
    edits code or verifies this on its own), but `migration_verified_at`
    stays null until Phase 12's verification engine actually rescans and
    confirms the old algorithm is gone — the two are deliberately different
    signals: "the user says they're done" vs. "ECDAT confirmed it".
    """
    status = body.status.upper()
    if status not in MIGRATION_STATUSES:
        raise HTTPException(status_code=422, detail=f"status must be one of: {', '.join(sorted(MIGRATION_STATUSES))}")

    query = select(CryptoAsset).options(selectinload(CryptoAsset.workspace)).where(CryptoAsset.id == asset_id)
    result = await db.execute(query)
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    if not asset.workspace or asset.workspace.clerk_user_id != user_id:
        raise HTTPException(status_code=404, detail="Asset not found")

    before = asset.migration_status
    asset.migration_status = status
    await db.commit()
    await db.refresh(asset)

    await log_event(
        db, asset.workspace_id, user_id, "MIGRATION_STATUS_CHANGED", "asset", asset.id,
        details={"algorithm": asset.algorithm_canonical, "before": before, "after": status},
    )

    return {
        "id": str(asset.id),
        "migration_status": asset.migration_status,
        "migration_status_updated_at": asset.migration_status_updated_at.isoformat() if asset.migration_status_updated_at else None,
    }


@asset_router.get("/verify-migration", response_model=Dict[str, Any])
async def verify_migration(
    asset_id: uuid.UUID,
    job_id: uuid.UUID = Query(..., description="A completed job that just rescanned source_id"),
    source_id: uuid.UUID = Query(...),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Phase 12 — real migration verification. Deliberately not a synthetic
    "diff two CBOM snapshots" comparison: this checks the one thing that
    actually answers "did the migration work" — does a REAL rescan of the
    same project still find this algorithm? No new scanning code needed;
    the caller triggers the rescan through the existing
    POST /api/workspaces/{wid}/jobs (scoped to just source_id) and polls it
    exactly like the Scan Jobs page already does, then calls this once it's
    completed. Per the project's own "migration is not complete just because
    a developer says so" principle (Phase 18 PDF §49) — Migrated is only
    ever set here from a real, confirmed absence of evidence, not a click.
    """
    asset_query = select(CryptoAsset).options(selectinload(CryptoAsset.workspace)).where(CryptoAsset.id == asset_id)
    asset_result = await db.execute(asset_query)
    asset = asset_result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    if not asset.workspace or asset.workspace.clerk_user_id != user_id:
        raise HTTPException(status_code=404, detail="Asset not found")

    job_query = select(DiscoveryJob).where(DiscoveryJob.id == job_id, DiscoveryJob.workspace_id == asset.workspace_id)
    job_result = await db.execute(job_query)
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Verification job not found in this workspace")
    if job.status != "completed":
        raise HTTPException(status_code=409, detail=f"Job is {job.status}, not completed yet — wait for the rescan to finish before checking")

    source_result = await db.execute(select(Source).where(Source.id == source_id, Source.workspace_id == asset.workspace_id))
    source = source_result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found in this workspace")

    # The real check: did the rescan (this specific job, this specific
    # source) find any evidence that still resolves to this asset?
    still_found_query = (
        select(func.count(EvidenceAsset.evidence_id))
        .join(EvidenceModel, EvidenceModel.id == EvidenceAsset.evidence_id)
        .where(EvidenceAsset.asset_id == asset_id, EvidenceModel.job_id == job_id, EvidenceModel.source_id == source_id)
    )
    still_found_result = await db.execute(still_found_query)
    still_found_count = still_found_result.scalar_one()

    if still_found_count == 0:
        asset.migration_verified_at = func.now()
        asset.migration_status = "MIGRATED"
        await db.commit()
        await db.refresh(asset)
        await log_event(
            db, asset.workspace_id, user_id, "MIGRATION_VERIFIED", "asset", asset.id,
            details={"algorithm": asset.algorithm_canonical, "source": source.name, "job_id": str(job_id)},
        )
        return {
            "status": "VERIFIED",
            "message": f"Rescanned {source.name} — {asset.algorithm_canonical} was not found. Migration confirmed.",
            "migration_verified_at": asset.migration_verified_at.isoformat() if asset.migration_verified_at else None,
        }
    else:
        return {
            "status": "STILL_PRESENT",
            "message": f"Rescanned {source.name} — {asset.algorithm_canonical} was found again ({still_found_count} occurrence(s)). Migration not complete for this project.",
            "occurrences": still_found_count,
        }


@asset_router.get("/blast-radius-lite", response_model=Dict[str, Any])
async def get_blast_radius_lite(
    asset_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Phase 13 — honest "blast-radius-lite": real reach computed from the same
    EvidenceAsset/Source joins serialize_asset()'s `projects` field already
    uses. Deliberately NOT a real Application→Service dependency graph —
    ECDAT has no Application entity, that's Phase 9's Neo4j work — so this is
    labeled as file/project reach, not "N applications affected".
    """
    asset_query = (
        select(CryptoAsset)
        .options(selectinload(CryptoAsset.workspace), selectinload(CryptoAsset.evidence))
        .where(CryptoAsset.id == asset_id)
    )
    asset_result = await db.execute(asset_query)
    asset = asset_result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    if not asset.workspace or asset.workspace.clerk_user_id != user_id:
        raise HTTPException(status_code=404, detail="Asset not found")

    evidence_list = list(asset.evidence or [])
    source_ids = {ev.source_id for ev in evidence_list if ev.source_id}
    file_paths = sorted({ev.file_path for ev in evidence_list if ev.file_path})

    sources: List[Source] = []
    if source_ids:
        sources_result = await db.execute(select(Source).where(Source.id.in_(source_ids)))
        sources = list(sources_result.scalars().all())

    # Other assets sharing at least one of the same projects — "if you touch
    # this algorithm's library, what else in these same projects might also
    # be affected."
    shared_assets: List[Dict[str, Any]] = []
    if source_ids:
        other_ids_result = await db.execute(
            select(EvidenceAsset.asset_id)
            .join(EvidenceModel, EvidenceModel.id == EvidenceAsset.evidence_id)
            .where(EvidenceModel.source_id.in_(source_ids), EvidenceAsset.asset_id != asset_id)
            .distinct()
        )
        other_ids = [row[0] for row in other_ids_result.all()]
        if other_ids:
            other_assets_result = await db.execute(select(CryptoAsset).where(CryptoAsset.id.in_(other_ids)))
            shared_assets = [
                {
                    "id": str(a.id),
                    "algorithm_canonical": a.algorithm_canonical,
                    "quantum_vulnerable": a.quantum_vulnerable,
                    "classical_vulnerable": a.classical_vulnerable,
                }
                for a in other_assets_result.scalars().all()
            ]

    return {
        "asset_id": str(asset.id),
        "algorithm_canonical": asset.algorithm_canonical,
        "project_count": len(sources),
        "projects": [{"id": str(s.id), "name": s.name} for s in sources],
        "file_count": len(file_paths),
        "files": file_paths[:50],  # capped for response size — file_count above is the real, uncapped total
        "shared_asset_count": len(shared_assets),
        "shared_assets": shared_assets,
        "note": "File/project reach computed from real scan evidence — not a full Application→Service dependency graph (see docs/TRACKER.md Phase 9).",
    }
