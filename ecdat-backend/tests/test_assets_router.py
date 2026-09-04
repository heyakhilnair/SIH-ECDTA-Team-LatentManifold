"""
Crypto Assets project attribution — user request: "the crypto assets tab
should be sorted according to projects, and they can see where the
particular asset is placed within their project." serialize_asset() now
reports which project(s) an asset's evidence actually came from.
"""
import uuid

from app.models.asset import CryptoAsset
from app.models.evidence import EvidenceModel
from app.routers.assets import serialize_asset


def _evidence(source_id=None):
    return EvidenceModel(
        id=uuid.uuid4(), job_id=uuid.uuid4(), workspace_id=uuid.uuid4(), source_id=source_id,
        source_type="source_code", file_path="x.py", line_number=1,
        raw_match="x", context_lines="x", detector="treesitter_call", confidence=0.9, raw_metadata={},
    )


def test_serialize_asset_reports_the_projects_it_came_from():
    src_a, src_b = uuid.uuid4(), uuid.uuid4()
    asset = CryptoAsset(
        id=uuid.uuid4(), workspace_id=uuid.uuid4(), algorithm_canonical="MD5",
        algorithm_family="HASH", algorithm_name="MD5",
    )
    asset.evidence = [_evidence(src_a), _evidence(src_b), _evidence(src_a)]

    data = serialize_asset(asset, source_names={str(src_a): "Payments", str(src_b): "Billing"})
    assert data["projects"] == ["Billing", "Payments"]


def test_serialize_asset_shared_across_projects_lists_both_once():
    src_a = uuid.uuid4()
    asset = CryptoAsset(
        id=uuid.uuid4(), workspace_id=uuid.uuid4(), algorithm_canonical="SHA-1",
        algorithm_family="HASH", algorithm_name="SHA-1",
    )
    asset.evidence = [_evidence(src_a), _evidence(src_a)]
    data = serialize_asset(asset, source_names={str(src_a): "Payments"})
    assert data["projects"] == ["Payments"]


def test_serialize_asset_unattributed_when_no_source_id():
    asset = CryptoAsset(
        id=uuid.uuid4(), workspace_id=uuid.uuid4(), algorithm_canonical="DES",
        algorithm_family="DES", algorithm_name="DES",
    )
    asset.evidence = [_evidence(None)]
    data = serialize_asset(asset, source_names={})
    assert data["projects"] == ["Unattributed"]


def test_serialize_asset_no_evidence_has_no_projects():
    asset = CryptoAsset(
        id=uuid.uuid4(), workspace_id=uuid.uuid4(), algorithm_canonical="AES",
        algorithm_family="AES", algorithm_name="AES",
    )
    asset.evidence = []
    data = serialize_asset(asset, source_names={})
    assert data["projects"] == []


def test_serialize_asset_reports_real_migration_status():
    """
    Phase 11.1 — serialize_asset() must surface the real, persisted
    migration_status/migration_status_updated_at/migration_verified_at
    columns, not a value the frontend has to invent (that invented-default
    logic used to live in migration/page.tsx's useState — a real bug, since
    it reset on every reload).
    """
    asset = CryptoAsset(
        id=uuid.uuid4(), workspace_id=uuid.uuid4(), algorithm_canonical="SHA-1",
        algorithm_family="HASH", algorithm_name="SHA-1",
        migration_status="IN_DEV",
    )
    asset.evidence = []
    data = serialize_asset(asset, source_names={})
    assert data["migration_status"] == "IN_DEV"
    assert data["migration_verified_at"] is None  # only Phase 12's verification engine sets this


if __name__ == "__main__":
    test_serialize_asset_reports_the_projects_it_came_from()
    test_serialize_asset_shared_across_projects_lists_both_once()
    test_serialize_asset_unattributed_when_no_source_id()
    test_serialize_asset_no_evidence_has_no_projects()
    test_serialize_asset_reports_real_migration_status()
    print("All asset project-attribution checks passed.")
