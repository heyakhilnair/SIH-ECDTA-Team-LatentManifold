import uuid
from datetime import datetime, timezone
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.asset import CryptoAsset
from app.models.cbom import CbomSnapshot
from app.services.recommendation_engine import infer_function

# CycloneDX 1.6 cryptoProperties.algorithmProperties.primitive is a closed
# enum: drbg | mac | block-cipher | stream-cipher | signature | hash | pke |
# kdf | key-agree | kem | ae | combined-cipher | other | unknown.
# "public-key" / "symmetric" (the old values here) aren't in that enum, so
# every generated CBOM failed real schema validation — see
# docs/BACKEND_AUDIT_PHASE0-6.md #11.
_STREAM_CIPHER_FAMILIES = {"RC4", "CHACHA20"}
_KEM_FAMILIES = {"ML-KEM"}
_KEY_AGREE_FAMILIES = {"ECDH", "DH", "X25519"}
_MAC_MARKERS = ("HMAC",)


def _cyclonedx_primitive(asset: CryptoAsset) -> str:
    family = (asset.algorithm_family or "").upper()
    canonical = (asset.algorithm_canonical or "").upper()

    if any(m in canonical or m in family for m in _MAC_MARKERS):
        return "mac"

    function = infer_function(asset)  # reuses the same HASH/ENCRYPTION/SIGNATURE/KEY_EXCHANGE inference as recommendations

    if function == "HASH":
        return "hash"
    if function == "ENCRYPTION":
        return "stream-cipher" if family in _STREAM_CIPHER_FAMILIES else "block-cipher"
    if function == "SIGNATURE":
        return "signature"
    if function == "KEY_EXCHANGE":
        if family in _KEM_FAMILIES or "KEM" in family:
            return "kem"
        if family in _KEY_AGREE_FAMILIES:
            return "key-agree"
        return "pke"  # RSA key transport
    return "unknown"


_VALID_PRIMITIVES = {
    "drbg", "mac", "block-cipher", "stream-cipher", "signature", "hash",
    "pke", "kdf", "key-agree", "kem", "ae", "combined-cipher", "other", "unknown",
}


def validate_cbom(cbom: dict) -> List[str]:
    """
    Manual CycloneDX 1.6 conformance check (no external validator dependency —
    see IMPLEMENTATION_PLAN.md §3.4 "cyclonedx-python-lib or manual
    validation"). Returns a list of violations; empty means it passed.
    """
    violations = []
    for field in ("bomFormat", "specVersion", "serialNumber", "version", "components"):
        if field not in cbom:
            violations.append(f"missing required top-level field: {field}")

    if cbom.get("bomFormat") != "CycloneDX":
        violations.append(f"bomFormat must be 'CycloneDX', got {cbom.get('bomFormat')!r}")
    if cbom.get("specVersion") != "1.6":
        violations.append(f"specVersion must be '1.6', got {cbom.get('specVersion')!r}")

    for i, component in enumerate(cbom.get("components", [])):
        if component.get("type") != "cryptographic-asset":
            violations.append(f"components[{i}].type must be 'cryptographic-asset'")
        primitive = component.get("cryptoProperties", {}).get("algorithmProperties", {}).get("primitive")
        if primitive not in _VALID_PRIMITIVES:
            violations.append(f"components[{i}] has invalid primitive: {primitive!r}")

    return violations


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
                    "primitive": _cyclonedx_primitive(asset),
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

    violations = validate_cbom(cbom)
    if violations:
        # Don't fail the whole discovery job over a schema nuance, but this
        # should never actually fire post-fix — surface it loudly if it does.
        print(f"[CBOM] WARNING: generated CBOM failed schema validation: {violations}")

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
