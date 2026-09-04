"""
Runnable check for Phase 12 (Migration Verification Engine). Matches this
project's existing test_phaseN.py style (plain asserts, run directly, real
DB, calls the router function directly — Depends() defaults are just plain
Python default values, so passing db/user_id explicitly bypasses FastAPI's
DI cleanly, same trick as calling any other router function in these files).

Run: .venv/Scripts/python.exe test_phase12_verification.py
"""
import asyncio
import os
import sys
import uuid

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

import app.main  # noqa: F401 - triggers the same model import graph as the real app
from sqlalchemy import text
from fastapi import HTTPException

from app.database import AsyncSessionLocal
from app.models.workspace import Workspace
from app.models.source import Source
from app.models.asset import CryptoAsset, EvidenceAsset
from app.models.job import DiscoveryJob
from app.models.evidence import EvidenceModel
from app.routers.assets import verify_migration

USER = "test_p12_user"


async def _cleanup(ws_id):
    async with AsyncSessionLocal() as db:
        await db.execute(text("DELETE FROM audit_log WHERE workspace_id = :w"), {"w": ws_id})
        await db.execute(text("DELETE FROM evidence_assets WHERE asset_id IN (SELECT id FROM crypto_assets WHERE workspace_id = :w)"), {"w": ws_id})
        await db.execute(text("DELETE FROM evidence WHERE workspace_id = :w"), {"w": ws_id})
        await db.execute(text("DELETE FROM crypto_assets WHERE workspace_id = :w"), {"w": ws_id})
        await db.execute(text("DELETE FROM discovery_jobs WHERE workspace_id = :w"), {"w": ws_id})
        await db.execute(text("DELETE FROM sources WHERE workspace_id = :w"), {"w": ws_id})
        await db.execute(text("DELETE FROM workspaces WHERE id = :w"), {"w": ws_id})
        await db.commit()


async def _setup(job_status: str):
    # Deliberately NOT `async with AsyncSessionLocal() as db:` — returning
    # from inside that block runs __aexit__ (closes the session, expunging
    # every object) before the caller ever gets `db` back, so the objects
    # returned here would be silently detached from the session the test
    # thinks it's still using. Caller is responsible for `await db.close()`.
    db = AsyncSessionLocal()
    ws = Workspace(clerk_user_id=USER, name="Phase12 Verification Test")
    db.add(ws)
    await db.flush()

    source = Source(workspace_id=ws.id, name="Verify Repo", source_type="git", configuration={"url": "https://github.com/x/verify"})
    db.add(source)
    await db.flush()

    job = DiscoveryJob(workspace_id=ws.id, status=job_status)
    db.add(job)
    await db.flush()

    asset = CryptoAsset(
        workspace_id=ws.id, algorithm_canonical="MD5", algorithm_family="HASH",
        algorithm_name="MD5", classical_vulnerable=True, migration_status="TESTING",
    )
    db.add(asset)
    await db.flush()

    await db.commit()
    await db.refresh(ws)
    await db.refresh(source)
    await db.refresh(job)
    await db.refresh(asset)
    return db, ws, source, job, asset


async def test_verified_when_rescan_found_nothing():
    print("\n[1] Rescan with zero matching evidence -> VERIFIED, asset moved to MIGRATED...")
    db, ws, source, job, asset = await _setup("completed")
    try:
        result = await verify_migration(asset_id=asset.id, job_id=job.id, source_id=source.id, user_id=USER, db=db)
        assert result["status"] == "VERIFIED", result
        assert result["migration_verified_at"] is not None
        await db.refresh(asset)
        assert asset.migration_status == "MIGRATED", asset.migration_status
        assert asset.migration_verified_at is not None
        print(f"    OK — {result['message']}")
    finally:
        await db.close()
        await _cleanup(ws.id)


async def test_still_present_when_rescan_finds_it_again():
    print("\n[2] Rescan that still finds the algorithm -> STILL_PRESENT, no state change...")
    db, ws, source, job, asset = await _setup("completed")
    try:
        ev = EvidenceModel(
            job_id=job.id, workspace_id=ws.id, source_id=source.id, source_type="source_code",
            file_path="src/hash.py", line_number=10, raw_match="hashlib.md5(...)", detector="tree-sitter",
        )
        db.add(ev)
        await db.flush()
        db.add(EvidenceAsset(evidence_id=ev.id, asset_id=asset.id))
        await db.commit()

        result = await verify_migration(asset_id=asset.id, job_id=job.id, source_id=source.id, user_id=USER, db=db)
        assert result["status"] == "STILL_PRESENT", result
        assert result["occurrences"] == 1, result
        await db.refresh(asset)
        assert asset.migration_status == "TESTING", "must not silently advance the board on a failed verification"
        assert asset.migration_verified_at is None
        print(f"    OK — {result['message']}")
    finally:
        await db.close()
        await _cleanup(ws.id)


async def test_rejects_check_before_rescan_completes():
    print("\n[3] Checking before the rescan job is completed -> 409, not a false result...")
    db, ws, source, job, asset = await _setup("running")
    try:
        raised = False
        try:
            await verify_migration(asset_id=asset.id, job_id=job.id, source_id=source.id, user_id=USER, db=db)
        except HTTPException as e:
            raised = True
            assert e.status_code == 409, e.status_code
        assert raised, "expected HTTPException(409) for a non-completed job"
        print("    OK — refused to check a still-running job")
    finally:
        await db.close()
        await _cleanup(ws.id)


async def main():
    await test_verified_when_rescan_found_nothing()
    await test_still_present_when_rescan_finds_it_again()
    await test_rejects_check_before_rescan_completes()
    print("\nAll Phase 12 (migration verification) checks passed.")


if __name__ == "__main__":
    asyncio.run(main())
