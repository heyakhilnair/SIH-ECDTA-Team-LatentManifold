import asyncio
import os
import sys

# Ensure app is in path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.asset import CryptoAsset
from app.models.risk import RiskScore
from app.services.risk_engine import compute_asset_risk

async def main():
    async with AsyncSessionLocal() as session:
        # Fetch existing assets from the DB
        print("Fetching assets from DB...")
        result = await session.execute(select(CryptoAsset).limit(10))
        assets = result.scalars().all()
        print(f"Found {len(assets)} assets.")
        
        if not assets:
            print("No assets found. Need to run discovery first.")
            return
            
        print("Computing Risk Scores...")
        for asset in assets:
            risk = await compute_asset_risk(session, asset)
            print(f"[{asset.algorithm_canonical}] Composite: {risk.composite_risk_level} (Quantum: {risk.quantum_risk_level}, Classical: {risk.classical_risk_level})")
            print(f"  -> Q-Reason: {risk.quantum_reason}")
            print(f"  -> C-Reason: {risk.classical_reason}")
            
        # Try fetching summary via the actual DB query to verify it works
        from sqlalchemy import func
        summary_query = select(RiskScore.composite_risk_level, func.count(RiskScore.id)).where(
            RiskScore.workspace_id == assets[0].workspace_id
        ).group_by(RiskScore.composite_risk_level)
        summary_result = await session.execute(summary_query)
        counts = dict(summary_result.all())
        print(f"\nRisk Summary: {counts}")

if __name__ == "__main__":
    asyncio.run(main())
