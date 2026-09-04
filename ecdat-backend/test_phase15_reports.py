"""
Runnable check for Phase 15's Executive/Technical report export. Matches
this project's existing test_phaseN.py style.

Run: .venv/Scripts/python.exe test_phase15_reports.py
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
from app.services.report_generator import generate_executive_report, generate_technical_report

USER = "test_p15_report_user"


async def _cleanup(ws_id):
    async with AsyncSessionLocal() as db:
        await db.execute(text("DELETE FROM audit_log WHERE workspace_id = :w"), {"w": ws_id})
        await db.execute(text("DELETE FROM risk_scores WHERE workspace_id = :w"), {"w": ws_id})
        await db.execute(text("DELETE FROM crypto_assets WHERE workspace_id = :w"), {"w": ws_id})
        await db.execute(text("DELETE FROM workspaces WHERE id = :w"), {"w": ws_id})
        await db.commit()


async def test_reports_reflect_real_data_not_fabricated():
    print("\n[1] Executive + Technical reports reflect real asset/risk/policy data...")
    db = AsyncSessionLocal()
    ws = Workspace(clerk_user_id=USER, name="Phase15 Report Test")
    db.add(ws)
    await db.flush()
    rsa = CryptoAsset(workspace_id=ws.id, algorithm_canonical="RSA:1024", algorithm_family="RSA", algorithm_name="RSA", key_size=1024, quantum_vulnerable=True, migration_status="ASSESSED")
    aes = CryptoAsset(workspace_id=ws.id, algorithm_canonical="AES:256", algorithm_family="AES", algorithm_name="AES", key_size=256, migration_status="MIGRATED")
    db.add_all([rsa, aes])
    await db.commit()
    await db.refresh(rsa)
    await db.refresh(aes)
    await compute_asset_risk(db, rsa, business_criticality="CRITICAL", exposure="EXTERNAL")
    await compute_asset_risk(db, aes)

    try:
        exec_report = await generate_executive_report(db, ws.id)
        assert "Quantum Readiness Score" in exec_report
        assert "RSA:1024" in exec_report, "the real forbidden/review violation should be listed"
        assert "Not measured yet" in exec_report, "crypto_agility must stay honest, never a guessed number"
        assert "fabricating a compliance score" in exec_report
        print("    OK — executive report includes real QRS, real violation, honest crypto_agility note")

        tech_report = await generate_technical_report(db, ws.id)
        assert "RSA:1024" in tech_report and "AES:256" in tech_report
        assert "ASSESSED" in tech_report and "MIGRATED" in tech_report
        assert "Mosca inequality" in tech_report
        print("    OK — technical report lists every real asset with real risk/migration status")
    finally:
        await db.close()
        await _cleanup(ws.id)


async def main():
    await test_reports_reflect_real_data_not_fabricated()
    print("\nAll Phase 15 (report export) checks passed.")


if __name__ == "__main__":
    asyncio.run(main())
