"""
ECDAT Recommendations API Router — Phase 5
===========================================
Endpoints:
  GET  /api/workspaces/{workspace_id}/recommendations           → List all recommendations for workspace
  POST /api/workspaces/{workspace_id}/recommendations/generate  → Generate/refresh recommendations for workspace
  GET  /api/assets/{asset_id}/recommendation                    → Recommendation for specific asset
  POST /api/assets/{asset_id}/recommendation/generate           → Generate recommendation for specific asset
"""

import uuid
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.services.auth import get_current_user_id, verify_workspace_access
from app.models.asset import CryptoAsset
from app.models.recommendation import Recommendation
from app.services.recommendation_engine import (
    generate_recommendation,
    generate_workspace_recommendations,
)

# ─── Workspace-scoped router ─────────────────────────────────────────────────
workspace_router = APIRouter(
    prefix="/workspaces/{workspace_id}/recommendations",
    tags=["recommendations"],
)

# ─── Asset-scoped router ─────────────────────────────────────────────────────
asset_router = APIRouter(
    prefix="/assets/{asset_id}/recommendation",
    tags=["recommendations"],
)

# ─── Auth helper ─────────────────────────────────────────────────────────────



def serialize_recommendation(rec: Recommendation) -> Dict[str, Any]:
    return {
        "id": str(rec.id),
        "asset_id": str(rec.asset_id),
        "workspace_id": str(rec.workspace_id),
        "current_algo": rec.current_algo,
        "recommended_algo": rec.recommended_algo,
        "candidate_algo": rec.candidate_algo,
        "hybrid_path": rec.hybrid_path,
        "reasoning": rec.reasoning,
        "confidence": rec.confidence,
        "nist_standard": rec.nist_standard,
        "migration_complexity": rec.migration_complexity,
        "generated_at": rec.generated_at.isoformat() if rec.generated_at else None,
        "algorithm_family": rec.asset.algorithm_family if rec.asset else None,
        "function": rec.asset.function if rec.asset else None,
    }


# ─── Workspace Endpoints ─────────────────────────────────────────────────────

@workspace_router.get("", response_model=List[Dict[str, Any]])
async def get_workspace_recommendations(
    workspace_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all PQC and cryptographic upgrade recommendations for a workspace.
    """
    await verify_workspace_access(workspace_id, user_id, db)

    query = (
        select(Recommendation)
        .options(selectinload(Recommendation.asset))
        .where(Recommendation.workspace_id == workspace_id)
    )
    result = await db.execute(query)
    recs = result.scalars().all()

    return [serialize_recommendation(r) for r in recs]


@workspace_router.post("/generate", response_model=List[Dict[str, Any]])
async def trigger_workspace_recommendations(
    workspace_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Explicitly trigger recommendation generation for all assets in the workspace.
    """
    await verify_workspace_access(workspace_id, user_id, db)

    recs = await generate_workspace_recommendations(db, workspace_id)
    return [serialize_recommendation(r) for r in recs]


# ─── Asset Endpoints ─────────────────────────────────────────────────────────

@asset_router.get("", response_model=Dict[str, Any])
async def get_asset_recommendation(
    asset_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the recommendation for a specific asset.
    """
    # Fetch asset to verify ownership
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

    query = (
        select(Recommendation)
        .options(selectinload(Recommendation.asset))
        .where(Recommendation.asset_id == asset_id)
    )
    result = await db.execute(query)
    rec = result.scalar_one_or_none()

    if not rec:
        raise HTTPException(
            status_code=404,
            detail="No recommendation found for this asset. It may already be quantum-safe and classically secure."
        )

    return serialize_recommendation(rec)


@asset_router.post("/generate", response_model=Dict[str, Any])
async def trigger_asset_recommendation(
    asset_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate or refresh recommendation for a single asset.
    """
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

    rec = await generate_recommendation(db, asset)
    if not rec:
        return {
            "status": "safe",
            "message": f"{asset.algorithm_canonical} is already quantum-safe and classically secure. No replacement needed."
        }

    return serialize_recommendation(rec)
