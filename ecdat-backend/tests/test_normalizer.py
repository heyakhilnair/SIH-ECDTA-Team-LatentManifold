"""
Phase 7 unit tests: algorithm normalization (Phase 3.1) and vulnerability
classification (Phase 3.2).
"""
import pytest

from app.services.normalizer.alias_registry import normalize_algorithm, get_algorithm_family
from app.services.normalizer.vulnerability_registry import (
    is_quantum_vulnerable,
    is_classically_vulnerable,
)


# 50+ alias variants, one canonical form per algorithm family, covering every
# entry in ALGORITHM_ALIASES plus the OID and mixed-case/hyphenation cases
# IMPLEMENTATION_PLAN.md §7.2 calls out.
@pytest.mark.parametrize("raw,expected", [
    # Hashes
    ("SHA256", "SHA-256"), ("sha-256", "SHA-256"), ("sha256", "SHA-256"), ("Sha256", "SHA-256"),
    ("SHA1", "SHA-1"), ("sha1", "SHA-1"), ("SHA-1", "SHA-1"),
    ("MD5", "MD5"), ("md5", "MD5"), ("hashlib.md5(data)", "MD5"),
    ("SHA384", "SHA-384"), ("sha-384", "SHA-384"),
    ("SHA512", "SHA-512"), ("sha-512", "SHA-512"),
    # RSA family
    ("RSA-2048", "RSA"), ("rsaEncryption", "RSA"), ("Crypto.PublicKey.RSA.generate(2048)", "RSA"),
    ("RSA-PSS", "RSA-PSS"), ("rsa-pss", "RSA-PSS"),
    ("RSA-OAEP", "RSA-OAEP"), ("rsa-oaep", "RSA-OAEP"),
    # ECC
    ("ECDSA", "ECDSA"), ("ecdsa.GenerateKey(...)", "ECDSA"),
    ("ECDH", "ECDH"), ("DSA", "DSA"),
    ("secp256r1", "P-256"), ("P256", "P-256"), ("p-256", "P-256"), ("elliptic.P256()", "P-256"),
    ("secp384r1", "P-384"), ("P384", "P-384"), ("p-384", "P-384"),
    ("secp521r1", "P-521"), ("P521", "P-521"), ("p-521", "P-521"),
    ("X25519", "X25519"), ("Ed25519", "Ed25519"),
    # Symmetric
    ("AES", "AES"), ("algorithms.AES(key)", "AES"),
    ("AES-GCM", "AES-GCM"), ("aes-gcm", "AES-GCM"),
    ("AES-CBC", "AES-CBC"),
    ("DES", "DES"), ("des.NewCipher(key)", "DES"),
    ("3DES", "3DES"), ("TripleDES", "3DES"), ("tripledes", "3DES"),
    ("Blowfish", "Blowfish"),
    ("ChaCha20", "ChaCha20"), ("chacha20", "ChaCha20"),
    # PQC
    ("ml-kem", "ML-KEM"), ("kyber", "ML-KEM"), ("ML-KEM-768", "ML-KEM"),
    ("ml-dsa", "ML-DSA"), ("dilithium", "ML-DSA"),
    ("slh-dsa", "SLH-DSA"), ("sphincs+", "SLH-DSA"), ("SPHINCS+ signature", "SLH-DSA"),
    ("falcon", "Falcon"),
])
def test_normalize_algorithm(raw, expected):
    assert normalize_algorithm(raw) == expected


def test_normalize_unknown_returns_none():
    # Regression: normalize_algorithm used to fall back to raw.upper(),
    # fabricating a fake "algorithm" out of any unrecognized string. It's
    # None now — see alias_registry.py's docstring and
    # docs/BACKEND_AUDIT_PHASE0-6.md-style Phase 7 findings.
    assert normalize_algorithm('import "crypto/elliptic"') is None
    assert normalize_algorithm("require('crypto')") is None
    assert normalize_algorithm("") is None
    assert normalize_algorithm(None) is None


def test_normalize_word_boundary_false_positive_regression():
    """
    Regression test for the specific bug found while building Phase 7 ground
    truth fixtures: naive substring search classified any import of the
    `modes` submodule (used for AES-GCM/AES-CBC) as DES, because "des" is a
    substring of "moDES". Same risk class for "coDES", "noDES", etc.
    """
    assert normalize_algorithm("from cryptography.hazmat.primitives.ciphers import modes") is None
    assert normalize_algorithm("import nodes") is None
    assert normalize_algorithm("describe the algorithm") is None
    # But real DES usage — surrounded by non-word characters, not embedded in
    # another word — must still be detected.
    assert normalize_algorithm("algorithms.DES(key)") == "DES"
    assert normalize_algorithm("des.NewCipher(key)") == "DES"


@pytest.mark.parametrize("family,expected_family", [
    ("RSA:2048", "RSA"),
    ("P-256", "ECC"),
    ("Ed25519", "ECC"),
    ("AES:256", "AES"),
    ("SHA-256", "HASH"),
    ("MD5", "HASH"),
    ("DES", "DES"),
    ("ML-KEM", "PQC"),
])
def test_get_algorithm_family(family, expected_family):
    assert get_algorithm_family(family) == expected_family


# Quantum / classical vulnerability classification (Phase 3.2)
def test_rsa_quantum_vulnerable():
    assert is_quantum_vulnerable("RSA", key_size=2048) is True


def test_ecdsa_quantum_vulnerable():
    assert is_quantum_vulnerable("ECDSA", key_size=256) is True


def test_aes256_not_quantum_vulnerable():
    assert is_quantum_vulnerable("AES-256", key_size=256) is False


def test_ml_kem_not_quantum_vulnerable():
    assert is_quantum_vulnerable("ML-KEM", key_size=None) is False


def test_sha1_classically_vulnerable():
    assert is_classically_vulnerable("SHA-1") is True


def test_md5_classically_vulnerable():
    assert is_classically_vulnerable("MD5") is True


def test_weak_rsa_key_classically_vulnerable():
    assert is_classically_vulnerable("RSA", key_size=1024) is True


def test_strong_rsa_key_not_classically_vulnerable():
    assert is_classically_vulnerable("RSA", key_size=3072) is False


def test_aes256_not_classically_vulnerable():
    assert is_classically_vulnerable("AES-256", key_size=256) is False
