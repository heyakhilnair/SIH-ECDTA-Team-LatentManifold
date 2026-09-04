"""
Runnable check for Phase 13 (Unified Evidence feed, Quantum Posture,
Blast-Radius-Lite). Matches this project's existing test_phaseN.py style —
plain asserts, run directly, real DB, router functions called directly
(Depends() defaults are just plain Python defaults, so passing db/user_id
explicitly bypasses FastAPI's DI, same trick as test_phase12).

Run: .venv/Scripts/python.exe test_phase13_evidence_quantum_blast.py
"""
import asyncio
import os
import sys
import uuid

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

import app.main  # noqa: F401 - triggers the same model import graph as the real app
from sqlalchemy import text

from app.database import AsyncSessionLocal
from app.models.workspace import Workspace
from app.models.source import Source
from app.models.asset import CryptoAsset, EvidenceAsset
from app.models.job import DiscoveryJob
from app.models.evidence import EvidenceModel
from app.routers.evidence import list_evidence
from app.routers.workspaces import get_quantum_posture
from app.routers.assets import get_blast_radius_lite
from app.services.normalizer.vulnerability_registry import is_grover_weakened, get_vulnerability_notes

USER = "test_p13_user"


async def _setup():
    # Deliberately not `async with AsyncSessionLocal() as db:` — see
    # test_phase12_verification.py's `_setup()` comment for why that detaches
    # every returned object from the session.
    db = AsyncSessionLocal()
    ws = Workspace(clerk_user_id=USER, name="Phase13 Test")
    db.add(ws)
    await db.flush()

    src_a = Source(workspace_id=ws.id, name="Repo A", source_type="git", configuration={"url": "https://github.com/x/a"})
    src_b = Source(workspace_id=ws.id, name="Repo B", source_type="git", configuration={"url": "https://github.com/x/b"})
    db.add_all([src_a, src_b])
    await db.flush()

    job = DiscoveryJob(workspace_id=ws.id, status="completed")
    db.add(job)
    await db.flush()

    # Repo A: RSA (Shor) + AES-128 (Grover) + MD5 (classically broken, neither
    # Shor nor Grover — must land in "safe" for the quantum-only stratification).
    rsa = CryptoAsset(workspace_id=ws.id, algorithm_canonical="RSA:2048", algorithm_family="RSA", algorithm_name="RSA", key_size=2048, quantum_vulnerable=True)
    aes128 = CryptoAsset(workspace_id=ws.id, algorithm_canonical="AES:128", algorithm_family="AES", algorithm_name="AES", key_size=128, quantum_vulnerable=False)
    md5 = CryptoAsset(workspace_id=ws.id, algorithm_canonical="MD5", algorithm_family="HASH", algorithm_name="MD5", classical_vulnerable=True)
    aes256 = CryptoAsset(workspace_id=ws.id, algorithm_canonical="AES:256", algorithm_family="AES", algorithm_name="AES", key_size=256, quantum_vulnerable=False)
    db.add_all([rsa, aes128, md5, aes256])
    await db.flush()

    ev_rsa = EvidenceModel(job_id=job.id, workspace_id=ws.id, source_id=src_a.id, source_type="source_code", file_path="a/rsa.py", line_number=1, raw_match="RSA.generate(2048)", detector="treesitter_call", confidence=0.9)
    ev_aes = EvidenceModel(job_id=job.id, workspace_id=ws.id, source_id=src_a.id, source_type="source_code", file_path="a/aes.py", line_number=2, raw_match="AES.new(key, ...)", detector="treesitter_call", confidence=0.9)
    ev_md5 = EvidenceModel(job_id=job.id, workspace_id=ws.id, source_id=src_b.id, source_type="dependency", file_path="b/reqs.txt", line_number=None, raw_match="md5", detector="pip_manifest", confidence=0.7)
    db.add_all([ev_rsa, ev_aes, ev_md5])
    await db.flush()

    db.add_all([
        EvidenceAsset(evidence_id=ev_rsa.id, asset_id=rsa.id),
        EvidenceAsset(evidence_id=ev_aes.id, asset_id=aes128.id),
        EvidenceAsset(evidence_id=ev_md5.id, asset_id=md5.id),
    ])
    await db.commit()
    for obj in (ws, src_a, src_b, rsa, aes128, md5, aes256):
        await db.refresh(obj)
    return db, ws, src_a, src_b, rsa, aes128, md5, aes256


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


def test_grover_bug_fix():
    print("\n[1] is_grover_weakened() actually matches AES-128 now (real bug, see TRACKER.md)...")
    assert is_grover_weakened("AES", 128) is True
    assert is_grover_weakened("AES", 256) is False
    assert is_grover_weakened("AES", None) is False
    notes = get_vulnerability_notes("AES", 128)
    assert "Grover" in notes, notes
    print(f"    OK — AES-128 notes: {notes!r}")


async def test_evidence_feed_filters_and_paginates():
    print("\n[2] GET /workspaces/{id}/evidence — filters + real total count...")
    db, ws, src_a, src_b, rsa, aes128, md5, aes256 = await _setup()
    try:
        all_res = await list_evidence(workspace_id=ws.id, source_id=None, algorithm=None, source_type=None, detector=None, min_confidence=None, search=None, limit=50, offset=0, user_id=USER, db=db)
        assert all_res["total"] == 3, all_res
        algos = {i["algorithm_canonical"] for i in all_res["items"]}
        assert algos == {"RSA:2048", "AES:128", "MD5"}, algos

        scoped = await list_evidence(workspace_id=ws.id, source_id=src_a.id, algorithm=None, source_type=None, detector=None, min_confidence=None, search=None, limit=50, offset=0, user_id=USER, db=db)
        assert scoped["total"] == 2, scoped
        assert all(i["source_name"] == "Repo A" for i in scoped["items"])

        by_algo = await list_evidence(workspace_id=ws.id, source_id=None, algorithm="RSA", source_type=None, detector=None, min_confidence=None, search=None, limit=50, offset=0, user_id=USER, db=db)
        assert by_algo["total"] == 1 and by_algo["items"][0]["file_path"] == "a/rsa.py", by_algo

        page1 = await list_evidence(workspace_id=ws.id, source_id=None, algorithm=None, source_type=None, detector=None, min_confidence=None, search=None, limit=2, offset=0, user_id=USER, db=db)
        assert page1["total"] == 3 and len(page1["items"]) == 2, page1
        print(f"    OK — total=3, source-scoped=2, algorithm-filtered=1, paginated page of 2/3")
    finally:
        await db.close()
        await _cleanup(ws.id)


async def test_quantum_posture_buckets_correctly():
    print("\n[3] GET /workspaces/{id}/quantum-posture — real 3-way stratification...")
    db, ws, src_a, src_b, rsa, aes128, md5, aes256 = await _setup()
    try:
        result = await get_quantum_posture(workspace_id=ws.id, user_id=USER, db=db)
        assert result["total_assets"] == 4, result
        shor_names = {a["algorithm_canonical"] for a in result["shor_vulnerable"]["assets"]}
        grover_names = {a["algorithm_canonical"] for a in result["grover_weakened"]["assets"]}
        safe_names = {a["algorithm_canonical"] for a in result["safe"]["assets"]}
        assert shor_names == {"RSA:2048"}, shor_names
        assert grover_names == {"AES:128"}, grover_names  # the real bug fix in action
        assert safe_names == {"MD5", "AES:256"}, safe_names  # MD5 is classically broken, not quantum-relevant here
        print(f"    OK — shor={shor_names} grover={grover_names} safe={safe_names}")
    finally:
        await db.close()
        await _cleanup(ws.id)


async def test_quantum_posture_excludes_hashes_from_grover_bucket():
    """
    SHA-256 lives in the same GROVER_WEAKENED registry dict as AES-128 (a
    pre-existing, deliberate choice in vulnerability_registry.py — not
    something this phase added), but bucketing a hash under a page whose own
    subtitle says "needs a key-size doubling" would be a real, misleading
    mismatch. The endpoint must exclude non-symmetric-cipher families even
    though is_grover_weakened('SHA-256') is True.
    """
    print("\n[3b] SHA-256 (a hash, not a symmetric cipher) must land in 'safe', not 'grover_weakened'...")
    assert is_grover_weakened("SHA-256", None) is True  # confirms the registry entry itself still exists
    db = AsyncSessionLocal()
    ws = Workspace(clerk_user_id=USER, name="Phase13 SHA-256 Test")
    db.add(ws)
    await db.flush()
    sha = CryptoAsset(workspace_id=ws.id, algorithm_canonical="SHA-256", algorithm_family="HASH", algorithm_name="SHA-256")
    db.add(sha)
    await db.commit()
    try:
        result = await get_quantum_posture(workspace_id=ws.id, user_id=USER, db=db)
        grover_names = {a["algorithm_canonical"] for a in result["grover_weakened"]["assets"]}
        safe_names = {a["algorithm_canonical"] for a in result["safe"]["assets"]}
        assert "SHA-256" not in grover_names, grover_names
        assert "SHA-256" in safe_names, safe_names
        print("    OK — SHA-256 correctly excluded from grover_weakened, lands in safe")
    finally:
        await db.close()
        await _cleanup(ws.id)


async def test_blast_radius_lite_reach_and_shared_assets():
    print("\n[4] GET /assets/{id}/blast-radius-lite — real project/file reach + co-located assets...")
    db, ws, src_a, src_b, rsa, aes128, md5, aes256 = await _setup()
    try:
        result = await get_blast_radius_lite(asset_id=rsa.id, user_id=USER, db=db)
        assert result["project_count"] == 1, result
        assert result["projects"][0]["name"] == "Repo A", result
        assert result["file_count"] == 1 and result["files"] == ["a/rsa.py"], result
        # AES-128 shares Repo A with RSA -> should show up as a co-located asset
        shared_names = {a["algorithm_canonical"] for a in result["shared_assets"]}
        assert shared_names == {"AES:128"}, shared_names
        assert "Application" in result["note"] or "not" in result["note"].lower()
        print(f"    OK — {result['project_count']} project(s), {result['file_count']} file(s), shared={shared_names}")

        # An asset with no evidence at all (aes256, never linked) -> zero reach, not an error
        empty = await get_blast_radius_lite(asset_id=aes256.id, user_id=USER, db=db)
        assert empty["project_count"] == 0 and empty["file_count"] == 0 and empty["shared_assets"] == [], empty
        print("    OK — an asset with zero evidence returns honest zero reach, not a crash")
    finally:
        await db.close()
        await _cleanup(ws.id)


async def main():
    test_grover_bug_fix()
    await test_evidence_feed_filters_and_paginates()
    await test_quantum_posture_buckets_correctly()
    await test_quantum_posture_excludes_hashes_from_grover_bucket()
    await test_blast_radius_lite_reach_and_shared_assets()
    print("\nAll Phase 13 (evidence feed + quantum posture + blast-radius-lite) checks passed.")


if __name__ == "__main__":
    asyncio.run(main())
