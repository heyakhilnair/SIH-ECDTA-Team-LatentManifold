"""
Runnable check for Phase 11 (Migration State Persistence + Quantum Readiness
Score). Matches this project's existing test_phaseN.py style (plain asserts,
run directly, real DB) — see test_phase6_audit.py's own docstring for why.

Run: .venv/Scripts/python.exe test_phase11_migration_and_readiness.py
"""
import asyncio
import datetime
import os
import sys
import uuid

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

import app.main  # noqa: F401 - triggers the same model import graph as the real app
from sqlalchemy import select, text

from app.database import AsyncSessionLocal
from app.models.workspace import Workspace
from app.models.source import Source
from app.models.asset import CryptoAsset
from app.models.audit import AuditLog
from app.services.risk_engine import compute_asset_risk
from app.services.readiness_engine import compute_readiness_score, readiness_level


async def _cleanup(ws_id):
    async with AsyncSessionLocal() as db:
        await db.execute(text("DELETE FROM audit_log WHERE workspace_id = :w"), {"w": ws_id})
        await db.execute(text("DELETE FROM risk_scores WHERE workspace_id = :w"), {"w": ws_id})
        await db.execute(text("DELETE FROM crypto_assets WHERE workspace_id = :w"), {"w": ws_id})
        await db.execute(text("DELETE FROM sources WHERE workspace_id = :w"), {"w": ws_id})
        await db.execute(text("DELETE FROM workspaces WHERE id = :w"), {"w": ws_id})
        await db.commit()


async def test_migration_status_defaults_and_persists():
    print("\n[1] CryptoAsset.migration_status defaults to ASSESSED and persists a real change...")
    async with AsyncSessionLocal() as db:
        ws = Workspace(clerk_user_id="test_p11_user_1", name="Phase11 Migration Test")
        db.add(ws)
        await db.flush()
        asset = CryptoAsset(
            workspace_id=ws.id, algorithm_canonical="SHA-1", algorithm_family="HASH",
            algorithm_name="SHA-1", classical_vulnerable=True,
        )
        db.add(asset)
        await db.commit()
        await db.refresh(asset)
        assert asset.migration_status == "ASSESSED", f"expected default ASSESSED, got {asset.migration_status!r}"

        asset.migration_status = "IN_DEV"
        await db.commit()
        ws_id, asset_id = ws.id, asset.id

    # Fresh session — real durability check, not just the same object in memory.
    async with AsyncSessionLocal() as db:
        refetched = await db.get(CryptoAsset, asset_id)
        assert refetched.migration_status == "IN_DEV", f"expected IN_DEV to persist, got {refetched.migration_status!r}"
        assert refetched.migration_status_updated_at is not None
        print(f"    OK — default ASSESSED, then IN_DEV persisted for real (updated_at={refetched.migration_status_updated_at})")

    await _cleanup(ws_id)


async def test_readiness_score_empty_workspace_is_not_penalized_as_unsafe():
    """
    An empty (freshly created, nothing scanned) workspace should show 0%
    coverage (honestly — nothing has been discovered yet) but must NOT show
    a low risk_posture/pqc_adoption/migration_progress just because there's
    no data — "nothing scanned" and "everything is broken" are different
    facts, and conflating them would be exactly the kind of fabricated
    number the Phase 17 PDF warns against.
    """
    print("\n[2] Readiness score for an empty workspace: 0% coverage, not fabricated risk...")
    async with AsyncSessionLocal() as db:
        ws = Workspace(clerk_user_id="test_p11_user_2", name="Phase11 Empty Readiness Test")
        db.add(ws)
        await db.commit()
        await db.refresh(ws)
        ws_id = ws.id

        result = await compute_readiness_score(db, ws_id)
        assert result["breakdown"]["coverage"] == 0, result["breakdown"]
        assert result["breakdown"]["risk_posture"] == 100, "no scored assets should not read as risky"
        assert result["breakdown"]["pqc_adoption"] == 100, "no quantum-vulnerable assets should not read as unadopted"
        assert result["breakdown"]["migration_progress"] == 100, "nothing at risk should not read as un-migrated"
        assert result["breakdown"]["crypto_agility"] is None, "must be null, never a guessed number"
        print(f"    OK — score={result['score']} level={result['level']!r} breakdown={result['breakdown']}")

    await _cleanup(ws_id)


async def test_readiness_score_reflects_real_scan_and_migration_data():
    print("\n[3] Readiness score moves with real coverage/risk/migration data...")
    async with AsyncSessionLocal() as db:
        ws = Workspace(clerk_user_id="test_p11_user_3", name="Phase11 Real Readiness Test", threat_horizon_years=12.0)
        db.add(ws)
        await db.flush()

        scanned_source = Source(workspace_id=ws.id, name="Scanned Repo", source_type="git", configuration={"url": "https://github.com/x/y"}, last_scanned_at=datetime.datetime.now(datetime.timezone.utc))
        unscanned_source = Source(workspace_id=ws.id, name="Never Scanned Repo", source_type="git", configuration={"url": "https://github.com/x/z"})
        db.add_all([scanned_source, unscanned_source])

        # One quantum-vulnerable asset, already migrated; one classically-critical, not started.
        rsa = CryptoAsset(workspace_id=ws.id, algorithm_canonical="RSA:2048", algorithm_family="RSA", algorithm_name="RSA", key_size=2048, quantum_vulnerable=True, migration_status="MIGRATED")
        md5 = CryptoAsset(workspace_id=ws.id, algorithm_canonical="MD5", algorithm_family="HASH", algorithm_name="MD5", classical_vulnerable=True, migration_status="ASSESSED")
        db.add_all([rsa, md5])
        await db.commit()
        await db.refresh(rsa)
        await db.refresh(md5)

        await compute_asset_risk(db, rsa)
        await compute_asset_risk(db, md5)

        # Real audit activity, so governance isn't just the honest 0.5 floor.
        db.add(AuditLog(workspace_id=ws.id, actor_clerk_user_id="test_p11_user_3", event="SOURCE_ADDED", resource_type="source", resource_id=scanned_source.id))
        await db.commit()
        ws_id = ws.id

        result = await compute_readiness_score(db, ws_id)
        b = result["breakdown"]
        assert b["coverage"] == 50, f"1 of 2 sources scanned -> expected 50%, got {b['coverage']}"
        assert b["pqc_adoption"] == 100, f"the only quantum-vulnerable asset (RSA) is MIGRATED -> expected 100%, got {b['pqc_adoption']}"
        assert b["migration_progress"] == 50, f"1 of 2 at-risk assets (RSA) MIGRATED -> expected 50%, got {b['migration_progress']}"
        assert b["governance"] == 100, "recent audit activity should give the full governance signal"
        assert 0 < result["score"] < 100
        print(f"    OK — score={result['score']} level={result['level']!r} breakdown={b}")

        assert readiness_level(0) == "Critical" and readiness_level(100) == "Highly Prepared" and readiness_level(50) == "Developing"
        print("    OK — readiness_level() bands match Phase 17 PDF §31")

    await _cleanup(ws_id)


async def main():
    await test_migration_status_defaults_and_persists()
    await test_readiness_score_empty_workspace_is_not_penalized_as_unsafe()
    await test_readiness_score_reflects_real_scan_and_migration_data()
    print("\nAll Phase 11 (migration persistence + readiness score) checks passed.")


if __name__ == "__main__":
    asyncio.run(main())
