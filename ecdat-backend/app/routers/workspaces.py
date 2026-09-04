import uuid
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.workspace import Workspace
from app.schemas.workspace import WorkspaceCreate, WorkspaceResponse, WorkspaceSettingsUpdate
from app.services.auth import get_current_user_id, verify_workspace_access
from app.services.audit import log_event
from app.services.readiness_engine import compute_readiness_score

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


@router.get("/{workspace_id}/readiness-score", response_model=Dict[str, Any])
async def get_readiness_score(
    workspace_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Phase 11.2 — Quantum Readiness Score. Real, computed dimensions only;
    see readiness_engine.py's module docstring for why crypto_agility is
    reported as null instead of guessed.
    """
    await verify_workspace_access(workspace_id, user_id, db)
    return await compute_readiness_score(db, workspace_id)


@router.get("/{workspace_id}/quantum-posture", response_model=Dict[str, Any])
async def get_quantum_posture(
    workspace_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Phase 13 — real Shor-vs-Grover-vs-safe stratification across every asset
    in the workspace. Shor bucket reads CryptoAsset.quantum_vulnerable
    (computed at scan time by asset_resolver.py); Grover bucket uses
    vulnerability_registry.is_grover_weakened() — the real AES-128 bug found
    while building this (see docs/TRACKER.md's bug list) is what made this
    endpoint return zero Grover-weakened assets until it was fixed.

    Deliberately restricted to symmetric-cipher families (AES/DES/Blowfish),
    NOT is_grover_weakened()'s full registry as-is: that registry also lists
    'SHA-256' (a hash, not a symmetric cipher) with its own note explicitly
    saying it's "still considered acceptable" — bucketing it here under a
    page whose own subtitle says "needs a key-size doubling" would be a real,
    misleading mismatch (a hash has no key size to double). Hash-specific
    Grover notes stay exactly where they already are: per-asset
    vulnerability_notes on the asset detail view.
    """
    await verify_workspace_access(workspace_id, user_id, db)

    from app.models.asset import CryptoAsset
    from app.services.normalizer.vulnerability_registry import is_grover_weakened

    SYMMETRIC_CIPHER_FAMILIES = {"AES", "DES", "BLOWFISH"}

    result = await db.execute(select(CryptoAsset).where(CryptoAsset.workspace_id == workspace_id))
    assets = result.scalars().all()

    def entry(a):
        return {
            "id": str(a.id),
            "algorithm_canonical": a.algorithm_canonical,
            "algorithm_family": a.algorithm_family,
            "key_size": a.key_size,
        }

    shor, grover, safe = [], [], []
    for a in assets:
        if a.quantum_vulnerable:
            shor.append(entry(a))
        elif a.algorithm_family in SYMMETRIC_CIPHER_FAMILIES and is_grover_weakened(a.algorithm_name, a.key_size):
            grover.append(entry(a))
        else:
            safe.append(entry(a))

    return {
        "total_assets": len(assets),
        "shor_vulnerable": {"count": len(shor), "assets": shor},
        "grover_weakened": {"count": len(grover), "assets": grover},
        "safe": {"count": len(safe), "assets": safe},
    }


@router.get("/{workspace_id}/policy-violations", response_model=Dict[str, Any])
async def get_policy_violations(
    workspace_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Phase 14 — real, evidence-backed policy violations. See
    policy_engine.py's module docstring for why there's no Policy DB table
    yet (no per-workspace policy-editing UI exists to justify one).
    """
    await verify_workspace_access(workspace_id, user_id, db)

    from app.services.policy_engine import list_policy_violations

    return await list_policy_violations(db, workspace_id)


@router.get("/{workspace_id}/reports/executive")
async def get_executive_report(
    workspace_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Phase 15 — server-rendered Markdown, built entirely from data other real endpoints already compute."""
    await verify_workspace_access(workspace_id, user_id, db)
    from app.services.report_generator import generate_executive_report

    md = await generate_executive_report(db, workspace_id)
    return Response(content=md, media_type="text/markdown")


@router.get("/{workspace_id}/reports/technical")
async def get_technical_report(
    workspace_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(workspace_id, user_id, db)
    from app.services.report_generator import generate_technical_report

    md = await generate_technical_report(db, workspace_id)
    return Response(content=md, media_type="text/markdown")
