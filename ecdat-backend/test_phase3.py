import asyncio
import os
import sys

# Ensure app is in path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.evidence import EvidenceModel
from app.models.asset import CryptoAsset
from app.services.normalizer.asset_resolver import resolve_evidence_to_asset
from app.services.cbom_generator import generate_cyclonedx_cbom

async def main():
    async with AsyncSessionLocal() as session:
        # Fetch some existing evidence from the DB
        print("Fetching evidence from DB...")
        result = await session.execute(select(EvidenceModel).limit(10))
        evidences = result.scalars().all()
        print(f"Found {len(evidences)} evidence records.")
        
        if not evidences:
            print("No evidence to normalize. The table is empty.")
            return
            
        workspace_id = evidences[0].workspace_id
        
        print("Normalizing evidence into CryptoAssets...")
        for ev in evidences:
            asset = await resolve_evidence_to_asset(session, ev)
            print(f"  -> Normalized to: {asset.algorithm_canonical} (Quantum Vuln: {asset.quantum_vulnerable})")
            
        print("Generating CBOM...")
        assets_result = await session.execute(select(CryptoAsset).where(CryptoAsset.workspace_id == workspace_id))
        assets = list(assets_result.scalars().all())
        
        cbom = await generate_cyclonedx_cbom(session, assets, workspace_id)
        print(f"CBOM generated with {len(cbom['components'])} components.")
        print(f"Spec Version: {cbom['specVersion']}")

if __name__ == "__main__":
    asyncio.run(main())
