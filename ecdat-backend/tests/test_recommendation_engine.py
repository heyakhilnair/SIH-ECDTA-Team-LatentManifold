"""
Recommendation engine gap fixes — found while investigating why the PQC
Workbench showed only 3 recommendations for a project with 6 real risky
assets (AES, DES, MD5, SHA-1, SHA-256, Blowfish): Blowfish and MD2 had no
RECOMMENDATION_TABLE entry at all, so find_rule() silently returned None for
them and no Recommendation row was ever created — not a bug in "did the scan
run", but in "does the recommendation table cover what the scanner finds".
"""
import uuid

from app.models.asset import CryptoAsset
from app.services.recommendation_engine import find_rule, is_safe_asset


def _asset(canonical: str, family: str, classical_vulnerable: bool = False, quantum_vulnerable: bool = False, key_size=None) -> CryptoAsset:
    return CryptoAsset(
        id=uuid.uuid4(), workspace_id=uuid.uuid4(),
        algorithm_canonical=canonical, algorithm_family=family, algorithm_name=canonical,
        key_size=key_size, classical_vulnerable=classical_vulnerable, quantum_vulnerable=quantum_vulnerable,
    )


def test_blowfish_gets_a_real_recommendation():
    asset = _asset("Blowfish", "BLOWFISH", classical_vulnerable=True)
    assert is_safe_asset(asset) is False
    rule = find_rule(asset)
    assert rule is not None
    assert rule["primary"] == "AES-256-GCM"


def test_md2_gets_a_real_recommendation():
    asset = _asset("MD2", "HASH", classical_vulnerable=True)
    assert is_safe_asset(asset) is False
    rule = find_rule(asset)
    assert rule is not None
    assert rule["primary"] == "SHA-256"


def test_des_still_works_unaffected_by_new_rules():
    asset = _asset("DES", "DES", classical_vulnerable=True)
    rule = find_rule(asset)
    assert rule is not None
    assert rule["primary"] == "AES-256-GCM"


if __name__ == "__main__":
    test_blowfish_gets_a_real_recommendation()
    test_md2_gets_a_real_recommendation()
    test_des_still_works_unaffected_by_new_rules()
    print("All recommendation engine gap-fix checks passed.")
