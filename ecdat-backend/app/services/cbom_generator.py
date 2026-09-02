import uuid
from datetime import datetime, timezone
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.asset import CryptoAsset
from app.models.cbom import CbomSnapshot

async def generate_cyclonedx_cbom(db: AsyncSession, assets: List[CryptoAsset], workspace_id: uuid.UUID, job_id: uuid.UUID = None) -> dict:
    """
    Generates a CycloneDX v1.6 compliant Cryptographic Bill of Materials (CBOM)
    from the list of canonical CryptoAssets.
    Persists it to the database.
    """
    components = []
    
    for asset in assets:
        component = {
            "type": "cryptographic-asset",
            "bom-ref": f"urn:uuid:{asset.id}",
            "name": asset.algorithm_name,
            "cryptoProperties": {
                "assetType": "algorithm",
                "algorithmProperties": {
                    "primitive": "public-key" if asset.algorithm_family in ['RSA', 'ECC', 'PQC'] else ("symmetric" if asset.algorithm_family in ['AES', 'DES'] else "hash"),
                    "executionEnvironment": "software-plain-ram"
                }
            },
            "properties": [
                {
                    "name": "ecdat:algorithm_family",
                    "value": asset.algorithm_family
                },
                {
                    "name": "ecdat:algorithm_canonical",
                    "value": asset.algorithm_canonical
                },
                {
                    "name": "ecdat:quantum_vulnerable",
                    "value": str(asset.quantum_vulnerable).lower()
                },
                {
                    "name": "ecdat:classical_vulnerable",
                    "value": str(asset.classical_vulnerable).lower()
                }
            ]
        }
        
        if asset.key_size:
            component["cryptoProperties"]["algorithmProperties"]["parameterSetIdentifier"] = str(asset.key_size)
            
        components.append(component)
        
    cbom = {
        "bomFormat": "CycloneDX",
        "specVersion": "1.6",
        "serialNumber": f"urn:uuid:{uuid.uuid4()}",
        "version": 1,
        "metadata": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "tools": {
                "components": [
                    {
                        "type": "application",
                        "author": "LatentManifold",
                        "name": "ECDAT",
                        "version": "0.1.0"
                    }
                ]
            }
        },
        "components": components
    }
    
    # Persist the snapshot
    snapshot = CbomSnapshot(
        workspace_id=workspace_id,
        job_id=job_id,
        version="1.0.0",
        format="cyclonedx-json",
        content=cbom,
        asset_count=len(assets)
    )
    db.add(snapshot)
    await db.commit()
    await db.refresh(snapshot)
    
    return cbom
