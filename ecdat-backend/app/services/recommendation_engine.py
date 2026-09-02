"""
ECDAT PQC Recommendation Engine — Phase 5
==========================================
Generates ranked, constraint-aware post-quantum cryptography (PQC)
and classical security replacement recommendations for cryptographic assets.

Key standards:
  - NIST FIPS 203: ML-KEM (Module-Lattice-Based Key-Encapsulation Mechanism)
  - NIST FIPS 204: ML-DSA (Module-Lattice-Based Digital Signature Algorithm)
  - NIST FIPS 205: SLH-DSA (Stateless Hash-Based Digital Signature Algorithm)
  - NIST FIPS 197 / SP 800-38D: AES / AES-GCM
  - NIST FIPS 180-4: Secure Hash Standard (SHA-256, SHA-384, SHA-512)
"""

import uuid
import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.asset import CryptoAsset
from app.models.recommendation import Recommendation

# ---------------------------------------------------------------------------
# Recommendation Rule Table
# ---------------------------------------------------------------------------
# Key: (algorithm_family, function) -> candidate specifications
RECOMMENDATION_TABLE: Dict[tuple, Dict[str, Any]] = {
    ("RSA", "KEY_EXCHANGE"): {
        "primary": "ML-KEM-768",
        "hybrid": "ML-KEM-768 + X25519",
        "fallback": "ML-KEM-512",
        "nist_standard": "FIPS 203",
        "reasoning": (
            "ML-KEM (CRYSTALS-Kyber) is the primary NIST-standardized KEM for key exchange. "
            "The hybrid path (ML-KEM-768 + X25519) provides classical safety during transition. "
            "Avoid direct RSA key transport — replace with KEM encapsulation."
        ),
        "migration_complexity": "HIGH",
        "protocol_notes": "TLS 1.3 supports ML-KEM in hybrid mode via draft-ietf-tls-hybrid-design.",
    },
    ("RSA", "SIGNATURE"): {
        "primary": "ML-DSA-65",
        "hybrid": "ML-DSA-65 + ECDSA-P256",
        "fallback": "SLH-DSA-128s",
        "nist_standard": "FIPS 204",
        "reasoning": (
            "ML-DSA (CRYSTALS-Dilithium) is the primary NIST-standardized digital signature. "
            "ML-DSA-65 offers NIST security level 3. "
            "SLH-DSA (SPHINCS+) is available as a hash-based fallback if lattice assumptions are questioned."
        ),
        "migration_complexity": "MEDIUM",
        "protocol_notes": "Verify signature verification performance in high-throughput services.",
    },
    ("ECDSA", "SIGNATURE"): {
        "primary": "ML-DSA-65",
        "hybrid": "ML-DSA-65 + ECDSA-P256",
        "fallback": "SLH-DSA-128f",
        "nist_standard": "FIPS 204",
        "reasoning": "ECDSA is broken by Shor's algorithm. Replace with ML-DSA-65 for NIST Level 3 security.",
        "migration_complexity": "MEDIUM",
        "protocol_notes": "ML-DSA-65 public keys and signatures are larger than ECDSA-P256.",
    },
    ("ECDH", "KEY_EXCHANGE"): {
        "primary": "ML-KEM-768",
        "hybrid": "ML-KEM-768 + X25519",
        "fallback": "ML-KEM-512",
        "nist_standard": "FIPS 203",
        "reasoning": "ECDH key agreement is broken by Shor's algorithm. ML-KEM provides equivalent KEM functionality.",
        "migration_complexity": "MEDIUM",
        "protocol_notes": "Use hybrid key exchange in TLS 1.3 to maintain backward compatibility.",
    },
    ("DH", "KEY_EXCHANGE"): {
        "primary": "ML-KEM-768",
        "hybrid": "ML-KEM-768 + X25519",
        "fallback": "ML-KEM-512",
        "nist_standard": "FIPS 203",
        "reasoning": "Diffie-Hellman key exchange is vulnerable to Shor's algorithm. Replace with ML-KEM-768.",
        "migration_complexity": "MEDIUM",
        "protocol_notes": "Transition protocols from traditional DH exchange to KEM encapsulation.",
    },
    ("DSA", "SIGNATURE"): {
        "primary": "ML-DSA-65",
        "hybrid": "ML-DSA-65 + ECDSA-P256",
        "fallback": "SLH-DSA-128f",
        "nist_standard": "FIPS 204",
        "reasoning": "DSA is deprecated classically and completely broken by quantum algorithms. Migrate to ML-DSA-65.",
        "migration_complexity": "MEDIUM",
    },
    ("SHA-1", "HASH"): {
        "primary": "SHA-256",
        "hybrid": None,
        "fallback": "SHA3-256",
        "nist_standard": "FIPS 180-4",
        "reasoning": "SHA-1 is collision-vulnerable (Shattered 2017). SHA-256 is the standard replacement.",
        "migration_complexity": "LOW",
        "protocol_notes": "Direct digest replacement; check database digest column lengths (256 bits / 32 bytes).",
    },
    ("MD5", "HASH"): {
        "primary": "SHA-256",
        "hybrid": None,
        "fallback": "SHA3-256",
        "nist_standard": "FIPS 180-4",
        "reasoning": "MD5 is cryptographically broken with practical collision attacks. Replace with SHA-256 immediately.",
        "migration_complexity": "LOW",
        "protocol_notes": "Audit all usages to determine if used for checksum or security hashing.",
    },
    ("DES", "ENCRYPTION"): {
        "primary": "AES-256-GCM",
        "hybrid": None,
        "fallback": "ChaCha20-Poly1305",
        "nist_standard": "FIPS 197",
        "reasoning": "DES has a 56-bit key susceptible to practical brute-force. AES-256-GCM provides authenticated encryption.",
        "migration_complexity": "MEDIUM",
        "protocol_notes": "Ensure nonce/IV uniqueness for GCM mode.",
    },
    ("DES3", "ENCRYPTION"): {
        "primary": "AES-256-GCM",
        "hybrid": None,
        "fallback": "ChaCha20-Poly1305",
        "nist_standard": "FIPS 197",
        "reasoning": "3DES is officially deprecated by NIST SP 800-131A Rev. 2. Migrate to AES-256-GCM.",
        "migration_complexity": "MEDIUM",
        "protocol_notes": "Ensure nonce/IV uniqueness for GCM mode.",
    },
    ("RC4", "ENCRYPTION"): {
        "primary": "AES-256-GCM",
        "hybrid": None,
        "fallback": "ChaCha20-Poly1305",
        "nist_standard": "FIPS 197",
        "reasoning": "RC4 has severe statistical keystream biases and is prohibited in modern protocols (RFC 7465).",
        "migration_complexity": "LOW",
    },
    ("AES", "ENCRYPTION"): {
        "primary": "AES-256-GCM",
        "hybrid": None,
        "fallback": "ChaCha20-Poly1305",
        "nist_standard": "FIPS 197",
        "reasoning": "AES-128 has effective 64-bit security against Grover's quantum search. Upgrade to AES-256 for post-quantum security.",
        "migration_complexity": "LOW",
        "condition": lambda asset: asset.key_size and asset.key_size < 256,
        "protocol_notes": "Key size upgrade from 128-bit to 256-bit; cipher mode should be authenticated (GCM).",
    },
}

# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------

SAFE_ALGORITHM_PREFIXES = (
    "ML-KEM",
    "ML-DSA",
    "SLH-DSA",
    "SHA3-",
    "CHACHA20",
)

def is_safe_asset(asset: CryptoAsset) -> bool:
    """
    Returns True if the asset is already quantum-safe and classically secure,
    meaning no recommendation should be generated.
    """
    canonical_upper = (asset.algorithm_canonical or "").upper()
    family_upper = (asset.algorithm_family or "").upper()

    # Post-quantum algorithms
    for prefix in SAFE_ALGORITHM_PREFIXES:
        if canonical_upper.startswith(prefix) or family_upper.startswith(prefix):
            return True

    # AES-256 is safe
    if family_upper == "AES" or "AES" in canonical_upper:
        if asset.key_size and asset.key_size >= 256:
            return True
        if "256" in canonical_upper:
            return True

    # SHA-256 / SHA-384 / SHA-512 are acceptable
    if canonical_upper in ("SHA-256", "SHA-384", "SHA-512", "SHA256", "SHA384", "SHA512"):
        return True

    # Neither quantum nor classically vulnerable
    if not asset.quantum_vulnerable and not asset.classical_vulnerable:
        # Extra check: AES with weak key size is flagged separately
        if family_upper == "AES" and asset.key_size and asset.key_size < 256:
            return False
        return True

    return False


def infer_function(asset: CryptoAsset) -> str:
    """
    Infer function (KEY_EXCHANGE, SIGNATURE, HASH, ENCRYPTION) if not set.
    """
    if asset.function and asset.function.upper() not in ("UNKNOWN", "NONE", ""):
        return asset.function.upper()

    family = (asset.algorithm_family or "").upper()
    canonical = (asset.algorithm_canonical or "").upper()

    if family in ("SHA-1", "SHA1", "MD5", "HASH") or "HASH" in canonical or "SHA" in canonical:
        return "HASH"
    if family in ("AES", "DES", "DES3", "3DES", "RC4") or "CIPHER" in canonical or "ENCRYPT" in canonical:
        return "ENCRYPTION"
    if family in ("ECDSA", "DSA") or "SIGN" in canonical or "DSA" in canonical:
        return "SIGNATURE"
    if family in ("ECDH", "DH") or "AGREE" in canonical:
        return "KEY_EXCHANGE"
    if family == "RSA":
        if "SIGN" in canonical or "PSS" in canonical:
            return "SIGNATURE"
        return "KEY_EXCHANGE"  # Default RSA assumption if unspecified

    return "UNKNOWN"


def find_rule(asset: CryptoAsset) -> Optional[Dict[str, Any]]:
    """
    Lookup matching recommendation rule from RECOMMENDATION_TABLE.
    """
    if is_safe_asset(asset):
        return None

    family = (asset.algorithm_family or "").upper()
    canonical = (asset.algorithm_canonical or "").upper()
    func = infer_function(asset)

    # Normalize family name for lookup
    if family in ("SHA1", "SHA-1"):
        family_key = "SHA-1"
    elif family in ("3DES", "DES3"):
        family_key = "DES3"
    elif family in ("ECC", "ECDSA"):
        family_key = "ECDSA" if func == "SIGNATURE" else "ECDH"
    else:
        family_key = family

    # 1. Direct lookup with (family_key, func)
    rule = RECOMMENDATION_TABLE.get((family_key, func))

    # 2. Try with canonical algorithm name if family lookup failed
    if not rule:
        if "SHA-1" in canonical or "SHA1" in canonical:
            rule = RECOMMENDATION_TABLE.get(("SHA-1", "HASH"))
        elif "MD5" in canonical:
            rule = RECOMMENDATION_TABLE.get(("MD5", "HASH"))
        elif "3DES" in canonical or "DES3" in canonical:
            rule = RECOMMENDATION_TABLE.get(("DES3", "ENCRYPTION"))
        elif "DES" in canonical:
            rule = RECOMMENDATION_TABLE.get(("DES", "ENCRYPTION"))
        elif "RC4" in canonical:
            rule = RECOMMENDATION_TABLE.get(("RC4", "ENCRYPTION"))
        elif "AES" in canonical:
            rule = RECOMMENDATION_TABLE.get(("AES", "ENCRYPTION"))
        elif "ECDSA" in canonical:
            rule = RECOMMENDATION_TABLE.get(("ECDSA", "SIGNATURE"))
        elif "ECDH" in canonical:
            rule = RECOMMENDATION_TABLE.get(("ECDH", "KEY_EXCHANGE"))
        elif "RSA" in canonical:
            rule = RECOMMENDATION_TABLE.get(("RSA", func if func in ("SIGNATURE", "KEY_EXCHANGE") else "KEY_EXCHANGE"))

    if not rule:
        return None

    # Check rule condition if present (e.g. key_size < 256 for AES)
    if "condition" in rule and not rule["condition"](asset):
        return None

    return rule


# ---------------------------------------------------------------------------
# Recommendation Generator & Persister
# ---------------------------------------------------------------------------

async def generate_recommendation(
    db: AsyncSession,
    asset: CryptoAsset
) -> Optional[Recommendation]:
    """
    Generates and persists a Recommendation for a single CryptoAsset.
    Returns None if the asset is already safe or has no recommendation.
    """
    rule = find_rule(asset)
    if not rule:
        return None

    primary = rule["primary"]
    hybrid = rule.get("hybrid")
    fallback = rule.get("fallback")
    nist_standard = rule.get("nist_standard")
    migration_complexity = rule.get("migration_complexity", "MEDIUM")

    reasoning = {
        "primary_recommendation": primary,
        "hybrid_path": hybrid,
        "fallback": fallback,
        "nist_standard": nist_standard,
        "explanation": rule["reasoning"],
        "migration_complexity": migration_complexity,
        "protocol_notes": rule.get("protocol_notes", ""),
    }

    # Upsert logic: check if recommendation already exists for this asset
    query = select(Recommendation).where(Recommendation.asset_id == asset.id)
    result = await db.execute(query)
    existing = result.scalar_one_or_none()

    if existing:
        existing.current_algo = asset.algorithm_canonical
        existing.recommended_algo = primary
        existing.candidate_algo = hybrid or fallback
        existing.hybrid_path = hybrid
        existing.reasoning = reasoning
        existing.confidence = 0.90
        existing.nist_standard = nist_standard
        existing.migration_complexity = migration_complexity
        existing.generated_at = datetime.datetime.now(datetime.timezone.utc)
        rec = existing
    else:
        rec = Recommendation(
            asset_id=asset.id,
            workspace_id=asset.workspace_id,
            current_algo=asset.algorithm_canonical,
            recommended_algo=primary,
            candidate_algo=hybrid or fallback,
            hybrid_path=hybrid,
            reasoning=reasoning,
            confidence=0.90,
            nist_standard=nist_standard,
            migration_complexity=migration_complexity,
            generated_at=datetime.datetime.now(datetime.timezone.utc)
        )
        db.add(rec)

    await db.commit()
    await db.refresh(rec)
    return rec


async def generate_workspace_recommendations(
    db: AsyncSession,
    workspace_id: uuid.UUID
) -> List[Recommendation]:
    """
    Generates recommendations for all eligible assets in a workspace.
    """
    query = select(CryptoAsset).where(CryptoAsset.workspace_id == workspace_id)
    result = await db.execute(query)
    assets = result.scalars().all()

    recs = []
    for asset in assets:
        rec = await generate_recommendation(db, asset)
        if rec:
            recs.append(rec)

    return recs
