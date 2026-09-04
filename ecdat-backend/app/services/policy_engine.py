"""
Policy Engine — Phase 14.

Deliberate design deviation from IMPLEMENTATION_PLAN.md's original spec (a
`Policy` DB table): there's no per-workspace policy-editing UI planned for
this phase — same "not user-customizable yet" situation as
readiness_engine.py's DEFAULT_WEIGHTS, which is a plain module constant, not
a table with one seeded row. A `Policy` table with no way to ever write a
second row would just be an empty abstraction. Rules live here as constants
instead, and evaluation is always computed live against current asset state
(same pattern as compute_readiness_score) — so there's nothing to go stale.

Rules are DERIVED from vulnerability_registry.py's existing classifications,
not invented — per Phase 17 PDF §51's own "RSA<2048 forbidden, SHA-1
forbidden" example, which is exactly what CLASSICALLY_VULNERABLE already
encodes.

Real persistence still exists where it matters: mark_new_violations() below
logs one audit event the *first* time an asset crosses into FORBIDDEN or a
risk score first reaches CRITICAL — that's what the alerts feed (GET
/api/workspaces/{id}/alerts) reads. A live-computed table doesn't need
persistence; a "new since last time" alert does.
"""
from typing import Any, Dict, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.asset import CryptoAsset
from app.models.audit import AuditLog
from app.services.audit import log_event
from app.services.normalizer.vulnerability_registry import CLASSICALLY_VULNERABLE, QUANTUM_VULNERABLE

FORBIDDEN_ALGORITHMS = set(CLASSICALLY_VULNERABLE.keys())  # MD5, SHA-1, DES, 3DES, RC4, Blowfish, MD2
REVIEW_ALGORITHMS = set(QUANTUM_VULNERABLE)  # RSA, ECDSA, ECDH, DSA, P-256/384/521, X25519, Ed25519
MIN_RSA_KEY_SIZE = 2048

POLICY_VIOLATION_EVENT = "POLICY_VIOLATION_DETECTED"
NEW_CRITICAL_ASSET_EVENT = "NEW_CRITICAL_ASSET"


def evaluate_asset(asset: CryptoAsset) -> Optional[Dict[str, str]]:
    """
    Returns {status: 'FORBIDDEN' | 'REVIEW', rule: str} or None if ALLOWED.
    FORBIDDEN takes precedence over REVIEW — one verdict per asset.
    """
    name = asset.algorithm_name
    if name == "RSA" and asset.key_size and asset.key_size < MIN_RSA_KEY_SIZE:
        return {"status": "FORBIDDEN", "rule": f"RSA key size below {MIN_RSA_KEY_SIZE} bits (Phase 17 PDF §51)"}
    if name in FORBIDDEN_ALGORITHMS:
        return {"status": "FORBIDDEN", "rule": f"{name} is classically broken — {CLASSICALLY_VULNERABLE[name]}"}
    if name in REVIEW_ALGORITHMS:
        return {"status": "REVIEW", "rule": f"{name} is vulnerable to Shor's algorithm on a cryptographically relevant quantum computer"}
    return None


async def list_policy_violations(db: AsyncSession, workspace_id) -> Dict[str, Any]:
    result = await db.execute(
        select(CryptoAsset).options(selectinload(CryptoAsset.evidence)).where(CryptoAsset.workspace_id == workspace_id)
    )
    assets = result.scalars().all()

    violations = []
    for a in assets:
        v = evaluate_asset(a)
        if v:
            violations.append({
                "asset_id": str(a.id),
                "algorithm_canonical": a.algorithm_canonical,
                "status": v["status"],
                "rule": v["rule"],
                "evidence_count": len(a.evidence) if a.evidence is not None else None,
            })

    forbidden = [v for v in violations if v["status"] == "FORBIDDEN"]
    review = [v for v in violations if v["status"] == "REVIEW"]
    return {
        "total_assets": len(assets),
        "total_violations": len(violations),
        "forbidden_count": len(forbidden),
        "review_count": len(review),
        "violations": sorted(violations, key=lambda v: (v["status"] != "FORBIDDEN", v["algorithm_canonical"])),
    }


async def _already_logged(db: AsyncSession, workspace_id, event: str, resource_id) -> bool:
    result = await db.execute(
        select(func.count(AuditLog.id)).where(
            AuditLog.workspace_id == workspace_id, AuditLog.event == event, AuditLog.resource_id == resource_id
        )
    )
    return result.scalar_one() > 0


async def check_and_log_new_violation(db: AsyncSession, workspace_id, asset: CryptoAsset, risk=None) -> None:
    """
    Called from the orchestrator right after `compute_asset_risk()` for each
    newly touched asset, passing that same call's return value as `risk`
    (not `asset.risk_score` — the relationship isn't guaranteed refreshed at
    this point in the flush/commit cycle, the return value always is). Logs
    at most one POLICY_VIOLATION_DETECTED and one NEW_CRITICAL_ASSET event
    per asset, ever — a rescan that re-confirms an already-known violation is
    not "new" and must not spam the alerts feed. Actor is "system": these are
    automated findings from a background scan, not a click any user made,
    and the orchestrator has no user_id in scope.
    """
    v = evaluate_asset(asset)
    if v and not await _already_logged(db, workspace_id, POLICY_VIOLATION_EVENT, asset.id):
        await log_event(
            db, workspace_id, "system", POLICY_VIOLATION_EVENT, "asset", asset.id,
            details={"algorithm": asset.algorithm_canonical, "status": v["status"], "rule": v["rule"]},
        )

    if risk and risk.composite_risk_level == "CRITICAL" and not await _already_logged(db, workspace_id, NEW_CRITICAL_ASSET_EVENT, asset.id):
        await log_event(
            db, workspace_id, "system", NEW_CRITICAL_ASSET_EVENT, "asset", asset.id,
            details={"algorithm": asset.algorithm_canonical, "composite_risk_level": risk.composite_risk_level},
        )
