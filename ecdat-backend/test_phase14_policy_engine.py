"""
Runnable check for Phase 14 (Policy Engine + Alerts). Matches this project's
existing test_phaseN.py style — plain asserts, run directly, real DB, router
functions called directly (see test_phase12/13's `_setup()` comment for why
NOT `async with AsyncSessionLocal() as db:` when the session is returned).

Run: .venv/Scripts/python.exe test_phase14_policy_engine.py
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

import app.main  # noqa: F401
from sqlalchemy import text

from app.database import AsyncSessionLocal
from app.models.workspace import Workspace
from app.models.asset import CryptoAsset
from app.services.risk_engine import compute_asset_risk
from app.services.policy_engine import (
    evaluate_asset,
    list_policy_violations,
    check_and_log_new_violation,
    POLICY_VIOLATION_EVENT,
    NEW_CRITICAL_ASSET_EVENT,
)
from app.routers.audit import list_alerts

USER = "test_p14_user"


async def _cleanup(ws_id):
    async with AsyncSessionLocal() as db:
        await db.execute(text("DELETE FROM audit_log WHERE workspace_id = :w"), {"w": ws_id})
        await db.execute(text("DELETE FROM risk_scores WHERE workspace_id = :w"), {"w": ws_id})
        await db.execute(text("DELETE FROM crypto_assets WHERE workspace_id = :w"), {"w": ws_id})
        await db.execute(text("DELETE FROM workspaces WHERE id = :w"), {"w": ws_id})
        await db.commit()


def test_evaluate_asset_rules():
    print("\n[1] evaluate_asset() — rules sourced from vulnerability_registry.py...")
    class A:
        algorithm_name = "MD5"
        key_size = None
    assert evaluate_asset(A())["status"] == "FORBIDDEN"

    class B:
        algorithm_name = "RSA"
        key_size = 1024
    assert evaluate_asset(B())["status"] == "FORBIDDEN"

    class C:
        algorithm_name = "RSA"
        key_size = 3072
    assert evaluate_asset(C())["status"] == "REVIEW"  # still Shor-vulnerable regardless of key size

    class D:
        algorithm_name = "AES"
        key_size = 256
    assert evaluate_asset(D()) is None
    print("    OK — MD5 FORBIDDEN, RSA:1024 FORBIDDEN, RSA:3072 REVIEW, AES-256 ALLOWED")


async def test_violations_list_and_alerts_are_real_and_deduped():
    print("\n[2] list_policy_violations() + check_and_log_new_violation() dedup + alerts feed...")
    db = AsyncSessionLocal()
    ws = Workspace(clerk_user_id=USER, name="Phase14 Test")
    db.add(ws)
    await db.flush()

    md5 = CryptoAsset(workspace_id=ws.id, algorithm_canonical="MD5", algorithm_family="HASH", algorithm_name="MD5", classical_vulnerable=True)
    aes256 = CryptoAsset(workspace_id=ws.id, algorithm_canonical="AES:256", algorithm_family="AES", algorithm_name="AES", key_size=256)
    db.add_all([md5, aes256])
    await db.commit()
    await db.refresh(md5)
    await db.refresh(aes256)

    try:
        result = await list_policy_violations(db, ws.id)
        assert result["total_assets"] == 2, result
        assert result["forbidden_count"] == 1 and result["review_count"] == 0, result
        assert result["violations"][0]["algorithm_canonical"] == "MD5", result
        print(f"    OK — live violations list: {result['forbidden_count']} forbidden, {result['review_count']} review")

        # Simulate what the orchestrator does after a scan
        risk_md5 = await compute_asset_risk(db, md5, business_criticality="CRITICAL", exposure="EXTERNAL")
        await check_and_log_new_violation(db, ws.id, md5, risk_md5)
        risk_aes = await compute_asset_risk(db, aes256)
        await check_and_log_new_violation(db, ws.id, aes256, risk_aes)

        alerts = await list_alerts(workspace_id=ws.id, limit=50, offset=0, user_id=USER, db=db)
        events = {a["event"] for a in alerts["items"]}
        assert POLICY_VIOLATION_EVENT in events, alerts
        # AES-256 is neither a violation nor (typically) CRITICAL -> should not appear
        aes_alerts = [a for a in alerts["items"] if a["resource_id"] == str(aes256.id)]
        assert aes_alerts == [], aes_alerts
        first_total = alerts["total"]
        print(f"    OK — alerts feed shows {first_total} real event(s): {events}")

        # Re-running the same check (simulating a rescan) must NOT duplicate the alert
        await check_and_log_new_violation(db, ws.id, md5, risk_md5)
        alerts_again = await list_alerts(workspace_id=ws.id, limit=50, offset=0, user_id=USER, db=db)
        assert alerts_again["total"] == first_total, (alerts_again["total"], first_total)
        print("    OK — re-checking an already-known violation does not spam a duplicate alert")
    finally:
        await db.close()
        await _cleanup(ws.id)


async def main():
    test_evaluate_asset_rules()
    await test_violations_list_and_alerts_are_real_and_deduped()
    print("\nAll Phase 14 (policy engine + alerts) checks passed.")


if __name__ == "__main__":
    asyncio.run(main())
