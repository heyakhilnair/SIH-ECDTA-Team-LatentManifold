"""
Runnable check for the BACKEND_AUDIT_PHASE0-6.md fixes. Not a pytest suite —
matches this project's existing test_phaseN.py style (plain asserts, run
directly). Exercises real infra (real DB, real Clerk JWKS fetch) rather than
mocking, since the whole point of the audit was "does this actually work".

Run: .venv/Scripts/python.exe test_phase6_audit.py
"""
import asyncio
import os
import sys
import uuid

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from jose import jwt as jose_jwt

import app.main  # noqa: F401 - triggers the same model import graph as the real app (see test below)
from sqlalchemy import select
from sqlalchemy.orm import selectinload, configure_mappers

from app.database import AsyncSessionLocal
from app.models.workspace import Workspace
from app.models.job import DiscoveryJob
from app.models.asset import CryptoAsset
from app.models.risk import RiskScore
from app.services.auth import get_current_user_id, _fetch_jwks
from app.services.scanner.orchestrator import _append_job_log, _job_status
from app.services.risk_engine import compute_asset_risk
from app.services.cbom_generator import _cyclonedx_primitive, validate_cbom, generate_cyclonedx_cbom
from fastapi.security import HTTPAuthorizationCredentials
from fastapi import HTTPException


async def test_forged_jwt_is_rejected():
    print("\n[1] Forged/unsigned JWT must be rejected by get_current_user_id...")
    forged = jose_jwt.encode({"sub": "user_attacker_impersonating_someone"}, "not-clerks-key", algorithm="HS256")
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=forged)
    try:
        await get_current_user_id(creds)
        raise AssertionError("SECURITY REGRESSION: forged token was accepted!")
    except HTTPException as e:
        assert e.status_code == 401, f"expected 401, got {e.status_code}"
        print(f"    OK — rejected with 401: {e.detail}")


async def test_real_jwks_fetch_works():
    print("\n[2] Real Clerk JWKS fetch (proves CLERK_SECRET_KEY + network path work)...")
    jwks = await _fetch_jwks(force=True)
    keys = jwks.get("keys", [])
    assert len(keys) > 0, "JWKS returned no keys — CLERK_SECRET_KEY misconfigured or Clerk API unreachable"
    print(f"    OK — fetched {len(keys)} signing key(s) from Clerk")


async def test_job_logs_are_real_and_roundtrip():
    print("\n[3] Job log trail persists and reads back (no more fabricated logs)...")
    async with AsyncSessionLocal() as session:
        ws = Workspace(clerk_user_id="test_audit_user", name="Audit Test Workspace")
        session.add(ws)
        await session.flush()
        job = DiscoveryJob(workspace_id=ws.id, status="queued")
        session.add(job)
        await session.commit()
        job_id, ws_id = str(job.id), str(ws.id)

    await _append_job_log(job_id, "step one")
    await _append_job_log(job_id, "step two")

    async with AsyncSessionLocal() as session:
        refreshed = await session.get(DiscoveryJob, uuid.UUID(job_id))
        logs = (refreshed.metadata_ or {}).get("logs", [])
        assert len(logs) == 2, f"expected 2 log entries, got {len(logs)}"
        assert logs[0]["message"] == "step one" and logs[1]["message"] == "step two"
        print(f"    OK — {len(logs)} real log entries round-tripped: {[l['message'] for l in logs]}")

    status = await _job_status(job_id)
    assert status == "queued"
    print(f"    OK — _job_status reads real DB state: {status}")

    # cleanup via raw SQL (children first) — see note in test 4 on why raw SQL
    # instead of ORM session.delete() here
    from sqlalchemy import text
    async with AsyncSessionLocal() as session:
        await session.execute(text("DELETE FROM discovery_jobs WHERE id = :jid"), {"jid": job_id})
        await session.execute(text("DELETE FROM workspaces WHERE id = :wid"), {"wid": ws_id})
        await session.commit()
    return ws_id


async def test_threat_horizon_is_workspace_configurable():
    print("\n[4] Z (threat horizon) is read from the workspace, not hardcoded...")
    async with AsyncSessionLocal() as session:
        ws = Workspace(clerk_user_id="test_audit_user_2", name="Audit Z Test", threat_horizon_years=3.0)
        session.add(ws)
        await session.flush()
        # RSA-2048, 7y data lifetime, migration ~3y -> X+Y=10 > Z=3 => CRITICAL
        asset = CryptoAsset(
            workspace_id=ws.id,
            algorithm_canonical="RSA:2048",
            algorithm_family="RSA",
            algorithm_name="RSA",
            key_size=2048,
            quantum_vulnerable=True,
            classical_vulnerable=False,
        )
        session.add(asset)
        await session.commit()
        ws_id, asset_id = ws.id, asset.id

        risk = await compute_asset_risk(session, asset)  # threat_horizon_years=None -> must read ws.threat_horizon_years=3.0
        assert risk.risk_explanation["mosca"]["z_threat_horizon"] == 3.0, risk.risk_explanation["mosca"]
        assert risk.composite_risk_level == "CRITICAL", risk.composite_risk_level
        print(f"    OK — with workspace Z=3.0y, RSA-2048 computed CRITICAL using Z={risk.risk_explanation['mosca']['z_threat_horizon']}")

    # cleanup via raw SQL (children first) — avoids ORM cascade-vs-DB-cascade
    # conflicts when the RiskScore is still session-tracked from the call above
    from sqlalchemy import text
    async with AsyncSessionLocal() as session:
        await session.execute(text("DELETE FROM risk_scores WHERE workspace_id = :wid"), {"wid": ws_id})
        await session.execute(text("DELETE FROM crypto_assets WHERE workspace_id = :wid"), {"wid": ws_id})
        await session.execute(text("DELETE FROM workspaces WHERE id = :wid"), {"wid": ws_id})
        await session.commit()


async def test_crypto_asset_risk_score_backref_is_scalar():
    """
    Regression test for a real production 500: models/risk.py declared
    `relationship("CryptoAsset", backref="risk_score", uselist=False)` — the
    plain-string `backref=` form only applies `uselist=False` to THIS side
    (RiskScore.asset); the reverse attribute SQLAlchemy creates on
    CryptoAsset (CryptoAsset.risk_score) stayed a list. Every real GET
    /api/workspaces/{id}/assets request 500'd once an asset actually had a
    risk score, surfaced by the browser as a misleading CORS error (the
    crashed response has no CORS headers). Only found via a live scan
    through the real UI — no unit test exercised this exact selectinload +
    attribute-access shape until now.
    """
    print("\n[6] CryptoAsset.risk_score backref is scalar (not a list)...")
    configure_mappers()  # backrefs aren't attached to the class until mappers configure

    async with AsyncSessionLocal() as session:
        ws = Workspace(clerk_user_id="test_audit_user_3", name="Audit Backref Test")
        session.add(ws)
        await session.flush()
        asset = CryptoAsset(
            workspace_id=ws.id, algorithm_canonical="SHA-1", algorithm_family="SHA-1",
            algorithm_name="SHA-1", classical_vulnerable=True,
        )
        session.add(asset)
        await session.commit()
        await compute_asset_risk(session, asset)  # persists a real RiskScore row

        # Exactly the query shape app/routers/assets.py's list_workspace_assets uses.
        result = await session.execute(
            select(CryptoAsset)
            .options(selectinload(CryptoAsset.risk_score))
            .where(CryptoAsset.id == asset.id)
        )
        fetched = result.scalar_one()
        assert isinstance(fetched.risk_score, RiskScore), (
            f"CryptoAsset.risk_score should be a single RiskScore, got "
            f"{type(fetched.risk_score).__name__} — the backref cardinality bug is back"
        )
        composite = fetched.risk_score.composite_risk_level  # this line is what actually crashed in prod
        print(f"    OK — risk_score is scalar, composite_risk_level={composite!r}")

        from sqlalchemy import text
        await session.execute(text("DELETE FROM risk_scores WHERE workspace_id = :wid"), {"wid": ws.id})
        await session.execute(text("DELETE FROM crypto_assets WHERE workspace_id = :wid"), {"wid": ws.id})
        await session.execute(text("DELETE FROM workspaces WHERE id = :wid"), {"wid": ws.id})
        await session.commit()


async def test_mosca_only_applies_to_quantum_vulnerable_assets():
    """
    Regression test for a real scoring bug found investigating why every
    algorithm in a project (including ones that were neither classically nor
    quantum vulnerable) showed inflated HIGH composite risk: the Mosca
    (X+Y-vs-Z harvest-now-decrypt-later) branch of compute_asset_risk's
    composite calculation ran unconditionally for every asset, regardless of
    whether that asset is actually broken by a quantum computer. A bare AES
    call with no confirmed weak key size — quantum_vulnerable=False,
    classical_vulnerable=False — still got bumped to composite=HIGH purely
    from the workspace's default 7y/1y/12y timeline math, a signal that
    doesn't even apply to it. Fixed by gating the Mosca branch behind
    quantum_exposure == "HIGH".
    """
    print("\n[7] Mosca composite escalation only applies to quantum-vulnerable assets...")
    async with AsyncSessionLocal() as session:
        ws = Workspace(clerk_user_id="test_audit_user_4", name="Audit Mosca Gating Test")
        session.add(ws)
        await session.flush()
        # Neither classically nor quantum vulnerable — X(7)+Y(1)=8 still < Z(12)
        # here, but even bumping Y up wouldn't matter post-fix since Mosca is
        # gated off entirely for a non-quantum-vulnerable asset.
        safe_asset = CryptoAsset(
            workspace_id=ws.id, algorithm_canonical="AES", algorithm_family="AES",
            algorithm_name="AES", quantum_vulnerable=False, classical_vulnerable=False,
        )
        session.add(safe_asset)
        await session.commit()
        ws_id, asset_id = ws.id, safe_asset.id

        risk = await compute_asset_risk(session, safe_asset)
        assert risk.composite_risk_level == "LOW", (
            f"expected LOW for a non-quantum-vulnerable, non-classically-vulnerable asset, "
            f"got {risk.composite_risk_level} — Mosca is being applied where it shouldn't be"
        )
        assert risk.quantum_risk_level == "SAFE", risk.quantum_risk_level
        print(f"    OK — quantum-irrelevant AES call computed composite={risk.composite_risk_level} (not Mosca-inflated)")

    from sqlalchemy import text
    async with AsyncSessionLocal() as session:
        await session.execute(text("DELETE FROM risk_scores WHERE workspace_id = :wid"), {"wid": ws_id})
        await session.execute(text("DELETE FROM crypto_assets WHERE workspace_id = :wid"), {"wid": ws_id})
        await session.execute(text("DELETE FROM workspaces WHERE id = :wid"), {"wid": ws_id})
        await session.commit()


def test_cbom_primitive_mapping():
    print("\n[5] CBOM primitive values are real CycloneDX 1.6 enum members...")
    cases = [
        ("RSA", "SHA-256", "HASH", "hash"),
        ("AES", "AES:128", "ENCRYPTION", "block-cipher"),
        ("RC4", "RC4", "ENCRYPTION", "stream-cipher"),
        ("ECDSA", "ECDSA:P256", "SIGNATURE", "signature"),
        ("ECDH", "ECDH:P256", "KEY_EXCHANGE", "key-agree"),
        ("RSA", "RSA:2048", "KEY_EXCHANGE", "pke"),
        ("ML-KEM", "ML-KEM-768", "KEY_EXCHANGE", "kem"),
    ]
    for family, canonical, function, expected in cases:
        asset = CryptoAsset(algorithm_family=family, algorithm_canonical=canonical, algorithm_name=canonical, function=function)
        primitive = _cyclonedx_primitive(asset)
        assert primitive == expected, f"{canonical}: expected {expected}, got {primitive}"
        print(f"    OK — {canonical} ({function}) -> '{primitive}'")

    fake_cbom = {
        "bomFormat": "CycloneDX", "specVersion": "1.6", "serialNumber": "urn:uuid:x", "version": 1,
        "components": [{"type": "cryptographic-asset", "cryptoProperties": {"algorithmProperties": {"primitive": "public-key"}}}],
    }
    violations = validate_cbom(fake_cbom)
    assert violations, "validator should have caught the old invalid 'public-key' primitive"
    print(f"    OK — validator correctly flags the OLD invalid value: {violations}")


async def main():
    await test_forged_jwt_is_rejected()
    await test_real_jwks_fetch_works()
    await test_job_logs_are_real_and_roundtrip()
    await test_threat_horizon_is_workspace_configurable()
    await test_crypto_asset_risk_score_backref_is_scalar()
    await test_mosca_only_applies_to_quantum_vulnerable_assets()
    test_cbom_primitive_mapping()
    print("\nAll Phase 0-6 audit-fix checks passed.")


if __name__ == "__main__":
    asyncio.run(main())
