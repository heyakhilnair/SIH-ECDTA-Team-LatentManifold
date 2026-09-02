"""
Test script for Phase 5 PQC Recommendation Engine
"""
import uuid
from app.models.asset import CryptoAsset
from app.services.recommendation_engine import (
    find_rule,
    is_safe_asset,
    infer_function,
    RECOMMENDATION_TABLE,
)

def test_recommendation_rules():
    print("Testing Phase 5 Recommendation Engine Rules...")

    # 1. RSA Key Exchange
    rsa_ke = CryptoAsset(
        id=uuid.uuid4(),
        workspace_id=uuid.uuid4(),
        algorithm_canonical="RSA:2048",
        algorithm_family="RSA",
        algorithm_name="RSA",
        key_size=2048,
        function="KEY_EXCHANGE",
        quantum_vulnerable=True,
    )
    rule_rsa_ke = find_rule(rsa_ke)
    assert rule_rsa_ke is not None, "RSA KEY_EXCHANGE should have recommendation"
    assert rule_rsa_ke["primary"] == "ML-KEM-768", f"Expected ML-KEM-768, got {rule_rsa_ke['primary']}"
    assert "ML-KEM-768 + X25519" in rule_rsa_ke["hybrid"], "Expected hybrid ML-KEM-768 + X25519"
    assert rule_rsa_ke["nist_standard"] == "FIPS 203", "Expected FIPS 203"
    print("[OK] RSA:2048 (KEY_EXCHANGE) -> ML-KEM-768 (FIPS 203, hybrid ML-KEM-768 + X25519)")

    # 2. RSA Signature
    rsa_sig = CryptoAsset(
        id=uuid.uuid4(),
        workspace_id=uuid.uuid4(),
        algorithm_canonical="RSA-PSS:3072",
        algorithm_family="RSA",
        algorithm_name="RSA",
        key_size=3072,
        function="SIGNATURE",
        quantum_vulnerable=True,
    )
    rule_rsa_sig = find_rule(rsa_sig)
    assert rule_rsa_sig is not None, "RSA SIGNATURE should have recommendation"
    assert rule_rsa_sig["primary"] == "ML-DSA-65", f"Expected ML-DSA-65, got {rule_rsa_sig['primary']}"
    assert "ECDSA-P256" in rule_rsa_sig["hybrid"], "Expected ECDSA-P256 in hybrid"
    assert rule_rsa_sig["nist_standard"] == "FIPS 204", "Expected FIPS 204"
    print("[OK] RSA-PSS (SIGNATURE) -> ML-DSA-65 (FIPS 204, hybrid ML-DSA-65 + ECDSA-P256)")

    # 3. ECDSA Signature
    ecdsa = CryptoAsset(
        id=uuid.uuid4(),
        workspace_id=uuid.uuid4(),
        algorithm_canonical="ECDSA:P256",
        algorithm_family="ECDSA",
        algorithm_name="ECDSA",
        key_size=256,
        function="SIGNATURE",
        quantum_vulnerable=True,
    )
    rule_ecdsa = find_rule(ecdsa)
    assert rule_ecdsa is not None
    assert rule_ecdsa["primary"] == "ML-DSA-65"
    assert rule_ecdsa["nist_standard"] == "FIPS 204"
    print("[OK] ECDSA:P256 (SIGNATURE) -> ML-DSA-65 (FIPS 204)")

    # 4. SHA-1 Hash
    sha1 = CryptoAsset(
        id=uuid.uuid4(),
        workspace_id=uuid.uuid4(),
        algorithm_canonical="SHA-1",
        algorithm_family="SHA-1",
        algorithm_name="SHA-1",
        classical_vulnerable=True,
    )
    rule_sha1 = find_rule(sha1)
    assert rule_sha1 is not None
    assert rule_sha1["primary"] == "SHA-256"
    assert rule_sha1["hybrid"] is None, "Direct replacement, no hybrid"
    assert rule_sha1["nist_standard"] == "FIPS 180-4"
    print("[OK] SHA-1 (HASH) -> SHA-256 (FIPS 180-4, no hybrid)")

    # 5. MD5 Hash
    md5 = CryptoAsset(
        id=uuid.uuid4(),
        workspace_id=uuid.uuid4(),
        algorithm_canonical="MD5",
        algorithm_family="MD5",
        algorithm_name="MD5",
        classical_vulnerable=True,
    )
    rule_md5 = find_rule(md5)
    assert rule_md5 is not None
    assert rule_md5["primary"] == "SHA-256"
    print("[OK] MD5 (HASH) -> SHA-256 (FIPS 180-4)")

    # 6. DES / 3DES
    des = CryptoAsset(
        id=uuid.uuid4(),
        workspace_id=uuid.uuid4(),
        algorithm_canonical="DES3",
        algorithm_family="DES3",
        algorithm_name="DES3",
        classical_vulnerable=True,
    )
    rule_des = find_rule(des)
    assert rule_des is not None
    assert rule_des["primary"] == "AES-256-GCM"
    assert rule_des["nist_standard"] == "FIPS 197"
    print("[OK] DES3 (ENCRYPTION) -> AES-256-GCM (FIPS 197)")

    # 7. AES-128 (weak key size against Grover)
    aes128 = CryptoAsset(
        id=uuid.uuid4(),
        workspace_id=uuid.uuid4(),
        algorithm_canonical="AES:128",
        algorithm_family="AES",
        algorithm_name="AES",
        key_size=128,
        function="ENCRYPTION",
    )
    rule_aes128 = find_rule(aes128)
    assert rule_aes128 is not None
    assert rule_aes128["primary"] == "AES-256-GCM"
    print("[OK] AES:128 -> AES-256-GCM")

    # 7b. RC4 (insecure stream cipher)
    rc4 = CryptoAsset(
        id=uuid.uuid4(),
        workspace_id=uuid.uuid4(),
        algorithm_canonical="RC4",
        algorithm_family="RC4",
        algorithm_name="RC4",
        classical_vulnerable=True,
    )
    rule_rc4 = find_rule(rc4)
    assert rule_rc4 is not None
    assert rule_rc4["primary"] == "ChaCha20-Poly1305"
    assert rule_rc4["nist_standard"] == "NIST SP 800-175B"
    print("[OK] RC4 -> ChaCha20-Poly1305 (NIST SP 800-175B)")

    # 8. AES-256 (Safe - no recommendation)
    aes256 = CryptoAsset(
        id=uuid.uuid4(),
        workspace_id=uuid.uuid4(),
        algorithm_canonical="AES:256",
        algorithm_family="AES",
        algorithm_name="AES",
        key_size=256,
        function="ENCRYPTION",
        quantum_vulnerable=False,
        classical_vulnerable=False,
    )
    rule_aes256 = find_rule(aes256)
    assert rule_aes256 is None, f"Expected None for safe AES-256, got {rule_aes256}"
    print("[OK] AES:256 -> No recommendation (already safe)")

    # 9. ML-KEM-768 (PQC-safe - no recommendation)
    pqc_kem = CryptoAsset(
        id=uuid.uuid4(),
        workspace_id=uuid.uuid4(),
        algorithm_canonical="ML-KEM-768",
        algorithm_family="ML-KEM",
        algorithm_name="ML-KEM-768",
        quantum_vulnerable=False,
        classical_vulnerable=False,
    )
    rule_pqc_kem = find_rule(pqc_kem)
    assert rule_pqc_kem is None, f"Expected None for PQC ML-KEM, got {rule_pqc_kem}"
    print("[OK] ML-KEM-768 -> No recommendation (PQC-safe)")

    # 10. SHA-256 (Acceptable classical/quantum hash - no recommendation)
    sha256 = CryptoAsset(
        id=uuid.uuid4(),
        workspace_id=uuid.uuid4(),
        algorithm_canonical="SHA-256",
        algorithm_family="SHA-256",
        algorithm_name="SHA-256",
        quantum_vulnerable=False,
        classical_vulnerable=False,
    )
    rule_sha256 = find_rule(sha256)
    assert rule_sha256 is None, f"Expected None for SHA-256, got {rule_sha256}"
    print("[OK] SHA-256 -> No recommendation (acceptable standard)")

    print("\nAll 10 Phase 5 recommendation engine rules passed successfully!")

if __name__ == "__main__":
    test_recommendation_rules()
