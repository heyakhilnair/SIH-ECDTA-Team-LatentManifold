"""
Runnable check for Phase 15's CBOM export formats (XML + historical
snapshot-by-id). Matches this project's existing test_phaseN.py style.

Run: .venv/Scripts/python.exe test_phase15_cbom_export.py
"""
import asyncio
import os
import sys
import uuid
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

import app.main  # noqa: F401
from sqlalchemy import text
from fastapi import HTTPException

from app.database import AsyncSessionLocal
from app.models.workspace import Workspace
from app.models.asset import CryptoAsset
from app.models.cbom import CbomSnapshot
from app.services.cbom_generator import generate_cyclonedx_cbom, to_cyclonedx_xml
from app.routers.cbom import list_cbom_history, get_cbom_snapshot

USER = "test_p15_cbom_user"


def test_xml_is_well_formed_and_faithful():
    print("\n[1] to_cyclonedx_xml() produces well-formed, faithful CycloneDX XML...")
    cbom = {
        "bomFormat": "CycloneDX",
        "specVersion": "1.6",
        "serialNumber": "urn:uuid:abc-123",
        "version": 1,
        "metadata": {"timestamp": "2026-09-04T00:00:00Z", "tools": {"components": [{"type": "application", "author": "LatentManifold", "name": "ECDAT", "version": "0.1.0"}]}},
        "components": [
            {
                "type": "cryptographic-asset",
                "bom-ref": "urn:uuid:xyz-789",
                "name": "RSA",
                "cryptoProperties": {"assetType": "algorithm", "algorithmProperties": {"primitive": "pke", "executionEnvironment": "software-plain-ram", "parameterSetIdentifier": "2048"}},
                "properties": [{"name": "ecdat:algorithm_family", "value": "RSA"}, {"name": "ecdat:quantum_vulnerable", "value": "true"}],
            }
        ],
    }
    xml_str = to_cyclonedx_xml(cbom)
    root = ET.fromstring(xml_str)  # raises if not well-formed
    assert root.tag.endswith("bom"), root.tag
    assert root.get("serialNumber") == "urn:uuid:abc-123"

    ns = {"c": "http://cyclonedx.org/schema/bom/1.6"}
    # Direct child only (./) — .// would also match <metadata><tools><components><component>
    # (the tool descriptor), which is a real, separate "component" element in CycloneDX's own schema.
    components = root.findall("./c:components/c:component", ns)
    assert len(components) == 1, ET.tostring(root, encoding="unicode")
    comp = components[0]
    assert comp.get("bom-ref") == "urn:uuid:xyz-789"
    assert comp.get("type") == "cryptographic-asset"
    assert comp.find("c:name", ns).text == "RSA"
    primitive = comp.find(".//c:algorithmProperties/c:primitive", ns)
    assert primitive.text == "pke", ET.tostring(root, encoding="unicode")
    props = comp.findall(".//c:properties/c:property", ns)
    prop_map = {p.get("name"): p.text for p in props}
    assert prop_map["ecdat:algorithm_family"] == "RSA"
    assert prop_map["ecdat:quantum_vulnerable"] == "true"
    print("    OK — well-formed XML with real component/property data intact")


async def _cleanup(ws_id):
    async with AsyncSessionLocal() as db:
        await db.execute(text("DELETE FROM cbom_snapshots WHERE workspace_id = :w"), {"w": ws_id})
        await db.execute(text("DELETE FROM crypto_assets WHERE workspace_id = :w"), {"w": ws_id})
        await db.execute(text("DELETE FROM workspaces WHERE id = :w"), {"w": ws_id})
        await db.commit()


async def test_history_and_snapshot_by_id():
    print("\n[2] GET .../cbom/history + GET /cbom/{id} — real historical snapshots, cross-tenant safe...")
    db = AsyncSessionLocal()
    ws = Workspace(clerk_user_id=USER, name="Phase15 CBOM Test")
    db.add(ws)
    await db.flush()
    asset = CryptoAsset(workspace_id=ws.id, algorithm_canonical="RSA:2048", algorithm_family="RSA", algorithm_name="RSA", key_size=2048, quantum_vulnerable=True)
    db.add(asset)
    await db.commit()
    await db.refresh(asset)

    try:
        cbom1 = await generate_cyclonedx_cbom(db, [asset], ws.id)
        cbom2 = await generate_cyclonedx_cbom(db, [asset], ws.id)  # a second snapshot, real history

        history = await list_cbom_history(workspace_id=ws.id, limit=50, user_id=USER, db=db)
        assert len(history) == 2, history
        assert history[0]["created_at"] >= history[1]["created_at"], "expected newest first"
        print(f"    OK — history shows {len(history)} real snapshots, newest first")

        older_id = uuid.UUID(history[1]["id"])
        result = await get_cbom_snapshot(snapshot_id=older_id, format="json", user_id=USER, db=db)
        assert result["components"][0]["name"] == "RSA", result
        print("    OK — GET /cbom/{id} fetches the correct historical (not just latest) snapshot")

        xml_result = await get_cbom_snapshot(snapshot_id=older_id, format="xml", user_id=USER, db=db)
        assert b"RSA" in xml_result.body, xml_result.body
        assert xml_result.media_type == "application/xml"
        print("    OK — GET /cbom/{id}?format=xml returns real XML content")

        raised = False
        try:
            await get_cbom_snapshot(snapshot_id=older_id, format="json", user_id="someone_else", db=db)
        except HTTPException as e:
            raised = True
            assert e.status_code == 404
        assert raised, "expected 404 for a different user's workspace"
        print("    OK — a different user cannot fetch this snapshot (404, not leaked)")
    finally:
        await db.close()
        await _cleanup(ws.id)


async def main():
    test_xml_is_well_formed_and_faithful()
    await test_history_and_snapshot_by_id()
    print("\nAll Phase 15 (CBOM export) checks passed.")


if __name__ == "__main__":
    asyncio.run(main())
