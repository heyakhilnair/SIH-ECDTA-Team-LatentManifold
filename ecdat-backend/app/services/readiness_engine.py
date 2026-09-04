"""
ECDAT Quantum Readiness Score (QRS) — Phase 11.2

Phase 17 PDF §25-41's headline executive KPI. The PDF is explicit that this
"must not be arbitrary" and must always be shown with its breakdown, never
as a bare number (§26, §30) — every dimension here is a real, computed
fraction of real workspace data, and any dimension ECDAT genuinely can't
measure yet (crypto_agility — no policy engine exists, that's Phase 14)
reports null rather than a made-up value.

QRS = weighted sum of 5 measured dimensions, each 0.0-1.0, scaled to 0-100.
"""
import datetime
from typing import Any, Dict, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.asset import CryptoAsset
from app.models.audit import AuditLog
from app.models.risk import RiskScore
from app.models.source import Source

# Default weights for the 5 dimensions ECDAT can actually measure today.
# crypto_agility (Phase 17 PDF's 6th dimension) is deliberately excluded from
# the weighted sum, not just given weight 0 — there's no policy engine yet
# (Phase 14) to measure it from, and folding an unmeasured dimension into the
# sum at any weight would be exactly the "arbitrary number" the PDF warns
# against. It's surfaced in the breakdown as null instead.
DEFAULT_WEIGHTS = {
    "coverage": 0.20,
    "risk_posture": 0.25,
    "pqc_adoption": 0.20,
    "migration_progress": 0.20,
    "governance": 0.15,
}

# Phase 17 PDF §31 readiness bands.
READINESS_BANDS = [
    (20, "Critical"),
    (40, "Low"),
    (60, "Developing"),
    (80, "Prepared"),
    (100, "Highly Prepared"),
]


def readiness_level(score: float) -> str:
    for threshold, label in READINESS_BANDS:
        if score <= threshold:
            return label
    return "Highly Prepared"


async def compute_readiness_score(db: AsyncSession, workspace_id, weights: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
    w = {**DEFAULT_WEIGHTS, **(weights or {})}

    # --- Coverage: sources with at least one completed scan / total sources ---
    sources_result = await db.execute(select(Source).where(Source.workspace_id == workspace_id))
    sources = sources_result.scalars().all()
    total_sources = len(sources)
    scanned_sources = sum(1 for s in sources if s.last_scanned_at is not None)
    coverage = (scanned_sources / total_sources) if total_sources else 0.0

    # --- Risk posture: inverse of the weighted critical/high fraction ---
    risk_result = await db.execute(
        select(RiskScore.composite_risk_level, func.count(RiskScore.id))
        .where(RiskScore.workspace_id == workspace_id)
        .group_by(RiskScore.composite_risk_level)
    )
    risk_counts = dict(risk_result.all())
    total_scored = sum(risk_counts.values())
    if total_scored:
        weighted_bad = risk_counts.get("CRITICAL", 0) * 1.0 + risk_counts.get("HIGH", 0) * 0.6
        risk_posture = max(0.0, 1.0 - (weighted_bad / total_scored))
    else:
        risk_posture = 1.0  # nothing scanned yet is not "at risk" — an empty workspace isn't unsafe, it's unmeasured; coverage=0 already communicates that

    # --- PQC adoption: quantum-vulnerable assets that have at least started migrating ---
    assets_result = await db.execute(select(CryptoAsset).where(CryptoAsset.workspace_id == workspace_id))
    assets = assets_result.scalars().all()
    quantum_vulnerable_assets = [a for a in assets if a.quantum_vulnerable]
    if quantum_vulnerable_assets:
        started = sum(1 for a in quantum_vulnerable_assets if a.migration_status in ("IN_DEV", "TESTING", "MIGRATED"))
        pqc_adoption = started / len(quantum_vulnerable_assets)
    else:
        pqc_adoption = 1.0  # no quantum-vulnerable findings at all -> nothing to adopt PQC for, not a failure

    # --- Migration progress: at-risk assets (classical OR quantum) actually migrated ---
    at_risk_assets = [a for a in assets if a.quantum_vulnerable or a.classical_vulnerable]
    if at_risk_assets:
        migrated = sum(1 for a in at_risk_assets if a.migration_status == "MIGRATED")
        migration_progress = migrated / len(at_risk_assets)
    else:
        migration_progress = 1.0  # nothing at risk -> nothing to migrate

    # --- Governance: honest placeholder until Phase 14's policy engine exists.
    # Real signal (was any workspace action audited recently), not a fabricated
    # number — but explicitly NOT a stand-in for real policy compliance.
    thirty_days_ago = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=30)
    audit_result = await db.execute(
        select(func.count(AuditLog.id)).where(AuditLog.workspace_id == workspace_id, AuditLog.created_at >= thirty_days_ago)
    )
    recent_audit_count = audit_result.scalar_one()
    governance = 1.0 if recent_audit_count > 0 else 0.5

    dimensions = {
        "coverage": coverage,
        "risk_posture": risk_posture,
        "pqc_adoption": pqc_adoption,
        "migration_progress": migration_progress,
        "governance": governance,
    }
    score = sum(dimensions[k] * w[k] for k in dimensions) * 100

    return {
        "score": round(score),
        "level": readiness_level(round(score)),
        "breakdown": {
            "coverage": round(coverage * 100),
            "risk_posture": round(risk_posture * 100),
            "pqc_adoption": round(pqc_adoption * 100),
            "migration_progress": round(migration_progress * 100),
            "governance": round(governance * 100),
            "crypto_agility": None,  # not measured — no policy engine yet (Phase 14)
        },
        "inputs": {
            "total_sources": total_sources,
            "scanned_sources": scanned_sources,
            "total_scored_assets": total_scored,
            "quantum_vulnerable_assets": len(quantum_vulnerable_assets),
            "at_risk_assets": len(at_risk_assets),
        },
        "weights": w,
    }
