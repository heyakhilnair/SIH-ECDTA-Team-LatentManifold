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
  - NIST SP 800-175B: Guideline for Using Cryptographic Standards
  - NSA Commercial National Security Algorithm Suite 2.0 (CNSA 2.0)
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
        "hard_constraints": {
            "hsm_compatibility": "Requires PKCS#11 v3.2 or vendor PQC firmware upgrade; legacy HSMs lack native ML-KEM support.",
            "regulatory_compliance": "FIPS 203 finalized Aug 2024. Meets CNSA 2.0 requirements for quantum-resistant key establishment.",
            "client_interoperability": "Pure PQC requires client-side ML-KEM support; hybrid mode required for legacy TLS 1.3 clients."
        },
        "soft_constraints": {
            "key_size_bytes": 1184,       # Public key
            "ciphertext_size_bytes": 1088, # Ciphertext
            "bandwidth_overhead": "+2.27 KB per TLS handshake exchange",
            "performance_budget": "Encapsulation/decapsulation CPU cost is lower than RSA-2048 exponentiation."
        },
        "alternatives": [
            {
                "algorithm": "ML-KEM-768",
                "status": "PRIMARY",
                "security_category": "NIST Security Category 3 (AES-192 equivalent)",
                "rationale": "Recommended default for general enterprise data and TLS session establishment."
            },
            {
                "algorithm": "ML-KEM-768 + X25519",
                "status": "ALTERNATIVE",
                "security_category": "Hybrid Classical + Post-Quantum",
                "rationale": "Recommended transition mechanism protecting against immediate quantum harvest while preserving classical compliance."
            },
            {
                "algorithm": "ML-KEM-512",
                "status": "ALTERNATIVE",
                "security_category": "NIST Security Category 1 (AES-128 equivalent)",
                "rationale": "Suitable for severely bandwidth-constrained IoT / embedded devices."
            },
            {
                "algorithm": "Classic McEliece",
                "status": "REJECTED",
                "security_category": "Code-based KEM",
                "rationale": "Public key size exceeds 255 KB, causing prohibitive network transmission latency in TLS handshakes."
            },
            {
                "algorithm": "FrodoKEM",
                "status": "REJECTED",
                "security_category": "Unstructured Lattice KEM",
                "rationale": "Conservative fallback but matrix operations and 9.6 KB public keys incur 8x bandwidth overhead over ML-KEM."
            }
        ]
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
        "protocol_notes": "Verify signature verification performance in high-throughput services and certificate chains.",
        "hard_constraints": {
            "hsm_compatibility": "Requires firmware supporting FIPS 204. Code-signing pipelines may need HSM hardware refresh.",
            "regulatory_compliance": "FIPS 204 compliant. Standardized for federal systems and CNSA 2.0 digital signatures.",
            "client_interoperability": "X.509 certificates and PKI tooling require parser updates for ML-DSA OIDs."
        },
        "soft_constraints": {
            "public_key_bytes": 1952,
            "signature_size_bytes": 3309,
            "bandwidth_overhead": "Signatures are ~3.3 KB (vs 256 bytes for RSA-2048), increasing certificate chain size.",
            "performance_budget": "Fast verification speed; signing is faster than RSA-2048 key generation."
        },
        "alternatives": [
            {
                "algorithm": "ML-DSA-65",
                "status": "PRIMARY",
                "security_category": "NIST Security Category 3",
                "rationale": "Optimal balance of signature length (3.3 KB) and high-speed verification."
            },
            {
                "algorithm": "ML-DSA-65 + ECDSA-P256",
                "status": "ALTERNATIVE",
                "security_category": "Hybrid Dual Signature",
                "rationale": "Validates under both classical PKI and post-quantum verifiers during transition."
            },
            {
                "algorithm": "SLH-DSA-128s",
                "status": "ALTERNATIVE",
                "security_category": "Stateless Hash-Based (NIST FIPS 205)",
                "rationale": "Conservative hash-based backup when zero lattice dependency is required."
            },
            {
                "algorithm": "Falcon-512",
                "status": "REJECTED",
                "security_category": "Lattice (NTRU)",
                "rationale": "Pending separate NIST standard; complex floating-point implementation poses side-channel risks."
            }
        ]
    },
    ("ECDSA", "SIGNATURE"): {
        "primary": "ML-DSA-65",
        "hybrid": "ML-DSA-65 + ECDSA-P256",
        "fallback": "SLH-DSA-128f",
        "nist_standard": "FIPS 204",
        "reasoning": "ECDSA is broken by Shor's algorithm. Replace with ML-DSA-65 for NIST Level 3 security.",
        "migration_complexity": "MEDIUM",
        "protocol_notes": "ML-DSA-65 public keys and signatures are larger than ECDSA-P256 (3.3 KB vs 64 bytes).",
        "hard_constraints": {
            "hsm_compatibility": "HSM firmware update required for ML-DSA generation.",
            "regulatory_compliance": "FIPS 204 compliant."
        },
        "soft_constraints": {
            "signature_size_bytes": 3309,
            "bandwidth_overhead": "Signature expands from 64 B to 3.3 KB."
        },
        "alternatives": [
            {
                "algorithm": "ML-DSA-65",
                "status": "PRIMARY",
                "security_category": "NIST Category 3",
                "rationale": "Standard NIST signature replacement."
            },
            {
                "algorithm": "ML-DSA-65 + ECDSA-P256",
                "status": "ALTERNATIVE",
                "security_category": "Hybrid Dual Signature",
                "rationale": "Ensures backward compatibility with clients that do not parse ML-DSA."
            },
            {
                "algorithm": "SLH-DSA-128f",
                "status": "ALTERNATIVE",
                "security_category": "Stateless Hash-Based (FIPS 205)",
                "rationale": "Fast signing variant of SPHINCS+; signature size is 17 KB."
            }
        ]
    },
    ("ECDH", "KEY_EXCHANGE"): {
        "primary": "ML-KEM-768",
        "hybrid": "ML-KEM-768 + X25519",
        "fallback": "ML-KEM-512",
        "nist_standard": "FIPS 203",
        "reasoning": "ECDH key agreement is broken by Shor's algorithm. ML-KEM provides equivalent KEM functionality.",
        "migration_complexity": "MEDIUM",
        "protocol_notes": "Use hybrid key exchange in TLS 1.3 to maintain backward compatibility.",
        "hard_constraints": {
            "regulatory_compliance": "FIPS 203 compliant; CNSA 2.0 approved."
        },
        "soft_constraints": {
            "ciphertext_size_bytes": 1088,
            "bandwidth_overhead": "+2.27 KB per key agreement exchange."
        },
        "alternatives": [
            {
                "algorithm": "ML-KEM-768",
                "status": "PRIMARY",
                "security_category": "NIST Category 3",
                "rationale": "Standard replacement for ECDH key agreement."
            },
            {
                "algorithm": "ML-KEM-768 + X25519",
                "status": "ALTERNATIVE",
                "security_category": "Hybrid Classical + Post-Quantum",
                "rationale": "Standard hybrid key exchange deployed in modern browsers and TLS 1.3."
            }
        ]
    },
    ("DH", "KEY_EXCHANGE"): {
        "primary": "ML-KEM-768",
        "hybrid": "ML-KEM-768 + X25519",
        "fallback": "ML-KEM-512",
        "nist_standard": "FIPS 203",
        "reasoning": "Diffie-Hellman key exchange is vulnerable to Shor's algorithm. Replace with ML-KEM-768.",
        "migration_complexity": "MEDIUM",
        "protocol_notes": "Transition protocols from traditional DH exchange to KEM encapsulation.",
        "hard_constraints": {
            "regulatory_compliance": "FIPS 203 compliant."
        },
        "soft_constraints": {
            "ciphertext_size_bytes": 1088
        },
        "alternatives": [
            {
                "algorithm": "ML-KEM-768",
                "status": "PRIMARY",
                "security_category": "NIST Category 3",
                "rationale": "Direct post-quantum replacement for finite-field DH."
            }
        ]
    },
    ("DSA", "SIGNATURE"): {
        "primary": "ML-DSA-65",
        "hybrid": "ML-DSA-65 + Ed25519",
        "fallback": "SLH-DSA-128f",
        "nist_standard": "FIPS 204",
        "reasoning": "DSA is deprecated classically and completely broken by quantum algorithms. Migrate to ML-DSA-65.",
        "migration_complexity": "MEDIUM",
        "hard_constraints": {
            "regulatory_compliance": "NIST SP 800-131A deprecated DSA; FIPS 204 is the modern standard."
        },
        "soft_constraints": {
            "signature_size_bytes": 3309
        },
        "alternatives": [
            {
                "algorithm": "ML-DSA-65",
                "status": "PRIMARY",
                "security_category": "NIST Category 3",
                "rationale": "Primary NIST digital signature algorithm."
            }
        ]
    },
    ("SHA-1", "HASH"): {
        "primary": "SHA-256",
        "hybrid": None,
        "fallback": "SHA3-256",
        "nist_standard": "FIPS 180-4",
        "reasoning": "SHA-1 is collision-vulnerable (Shattered 2017). SHA-256 is the standard replacement.",
        "migration_complexity": "LOW",
        "protocol_notes": "Direct digest replacement; check database digest column lengths (256 bits / 32 bytes).",
        "hard_constraints": {
            "regulatory_compliance": "NIST prohibited SHA-1 for digital signatures in 2011 and deprecates all uses."
        },
        "soft_constraints": {
            "digest_size_bytes": 32,
            "performance_overhead": "Negligible on hardware with SHA extensions."
        },
        "alternatives": [
            {
                "algorithm": "SHA-256",
                "status": "PRIMARY",
                "security_category": "FIPS 180-4 Standard",
                "rationale": "Universal industry standard; 128-bit classical and quantum collision resistance."
            },
            {
                "algorithm": "SHA3-256",
                "status": "ALTERNATIVE",
                "security_category": "FIPS 202 Keccak Sponge",
                "rationale": "Independent mathematical construction offering defense in depth against Merkle-Damgard weaknesses."
            }
        ]
    },
    ("MD5", "HASH"): {
        "primary": "SHA-256",
        "hybrid": None,
        "fallback": "SHA3-256",
        "nist_standard": "FIPS 180-4",
        "reasoning": "MD5 is cryptographically broken with practical collision attacks. Replace with SHA-256 immediately.",
        "migration_complexity": "LOW",
        "protocol_notes": "Audit all usages to determine if used for checksum or security hashing.",
        "hard_constraints": {
            "regulatory_compliance": "Prohibited by NIST and RFC 6151 for security use."
        },
        "soft_constraints": {
            "digest_size_bytes": 32
        },
        "alternatives": [
            {
                "algorithm": "SHA-256",
                "status": "PRIMARY",
                "security_category": "FIPS 180-4 Standard",
                "rationale": "Direct drop-in replacement for secure digest computation."
            }
        ]
    },
    ("DES", "ENCRYPTION"): {
        "primary": "AES-256-GCM",
        "hybrid": None,
        "fallback": "ChaCha20-Poly1305",
        "nist_standard": "FIPS 197",
        "reasoning": "DES has a 56-bit key susceptible to practical brute-force. AES-256-GCM provides authenticated encryption.",
        "migration_complexity": "MEDIUM",
        "protocol_notes": "Ensure 96-bit nonce/IV uniqueness for GCM mode.",
        "hard_constraints": {
            "regulatory_compliance": "NIST withdrawn; FIPS 197 is required."
        },
        "soft_constraints": {
            "block_size_bytes": 16,
            "key_size_bits": 256
        },
        "alternatives": [
            {
                "algorithm": "AES-256-GCM",
                "status": "PRIMARY",
                "security_category": "FIPS 197 / SP 800-38D",
                "rationale": "Standard authenticated symmetric encryption with 128-bit post-Grover security."
            },
            {
                "algorithm": "ChaCha20-Poly1305",
                "status": "ALTERNATIVE",
                "security_category": "RFC 8439",
                "rationale": "High-performance software alternative where AES hardware acceleration is absent."
            }
        ]
    },
    ("DES3", "ENCRYPTION"): {
        "primary": "AES-256-GCM",
        "hybrid": None,
        "fallback": "ChaCha20-Poly1305",
        "nist_standard": "FIPS 197",
        "reasoning": "3DES is officially deprecated by NIST SP 800-131A Rev. 2. Migrate to AES-256-GCM.",
        "migration_complexity": "MEDIUM",
        "protocol_notes": "Ensure 96-bit nonce/IV uniqueness for GCM mode.",
        "hard_constraints": {
            "regulatory_compliance": "NIST SP 800-131A Rev. 2 disallowed after 2023."
        },
        "soft_constraints": {
            "key_size_bits": 256
        },
        "alternatives": [
            {
                "algorithm": "AES-256-GCM",
                "status": "PRIMARY",
                "security_category": "FIPS 197 / SP 800-38D",
                "rationale": "Standard authenticated encryption replacing 64-bit block ciphers vulnerable to Sweet32."
            }
        ]
    },
    ("RC4", "ENCRYPTION"): {
        "primary": "ChaCha20-Poly1305",
        "hybrid": None,
        "fallback": "AES-256-GCM",
        "nist_standard": "NIST SP 800-175B",
        "reasoning": "RC4 is a stream cipher with known statistical keystream biases (RFC 7465). ChaCha20-Poly1305 is the modern stream-like authenticated cipher replacement, or AES-256-GCM.",
        "migration_complexity": "LOW",
        "hard_constraints": {
            "regulatory_compliance": "RFC 7465 prohibits RC4 in TLS; NIST SP 800-175B prohibits legacy stream ciphers."
        },
        "soft_constraints": {
            "key_size_bits": 256
        },
        "alternatives": [
            {
                "algorithm": "ChaCha20-Poly1305",
                "status": "PRIMARY",
                "security_category": "RFC 8439 Authenticated Stream Cipher",
                "rationale": "Optimal replacement for stream cipher workloads with built-in Poly1305 authentication."
            },
            {
                "algorithm": "AES-256-GCM",
                "status": "ALTERNATIVE",
                "security_category": "FIPS 197 Block Cipher",
                "rationale": "Standard enterprise block cipher alternative."
            }
        ]
    },
    ("MD2", "HASH"): {
        "primary": "SHA-256",
        "hybrid": None,
        "fallback": "SHA3-256",
        "nist_standard": "FIPS 180-4",
        "reasoning": "MD2 is cryptographically broken — practical collision and preimage attacks exist. Replace with SHA-256.",
        "migration_complexity": "LOW",
        "hard_constraints": {
            "regulatory_compliance": "Deprecated since 2011 (RFC 6149); prohibited for any security-relevant use."
        },
        "soft_constraints": {
            "digest_size_bytes": 32
        },
        "alternatives": [
            {
                "algorithm": "SHA-256",
                "status": "PRIMARY",
                "security_category": "FIPS 180-4 Standard",
                "rationale": "Direct drop-in replacement for secure digest computation."
            }
        ]
    },
    ("BLOWFISH", "ENCRYPTION"): {
        "primary": "AES-256-GCM",
        "hybrid": None,
        "fallback": "ChaCha20-Poly1305",
        "nist_standard": "FIPS 197",
        "reasoning": "Blowfish's 64-bit block size is vulnerable to Sweet32-style birthday-bound attacks after ~4GB encrypted under one key. AES-256-GCM provides authenticated encryption with a 128-bit block size.",
        "migration_complexity": "MEDIUM",
        "protocol_notes": "Ensure 96-bit nonce/IV uniqueness for GCM mode.",
        "hard_constraints": {
            "regulatory_compliance": "Not FIPS-approved; FIPS 197 is required for federal/CNSA 2.0 compliance."
        },
        "soft_constraints": {
            "block_size_bytes": 16,
            "key_size_bits": 256
        },
        "alternatives": [
            {
                "algorithm": "AES-256-GCM",
                "status": "PRIMARY",
                "security_category": "FIPS 197 / SP 800-38D",
                "rationale": "Standard authenticated symmetric encryption; 128-bit block size avoids Blowfish's birthday-bound weakness."
            },
            {
                "algorithm": "ChaCha20-Poly1305",
                "status": "ALTERNATIVE",
                "security_category": "RFC 8439",
                "rationale": "High-performance software alternative where AES hardware acceleration is absent."
            }
        ]
    },
    ("AES", "ENCRYPTION"): {  # AES-128 specifically
        "primary": "AES-256-GCM",
        "hybrid": None,
        "fallback": "ChaCha20-Poly1305",
        "nist_standard": "FIPS 197",
        "reasoning": "AES-128 has effective 64-bit security against Grover's quantum search. Upgrade to AES-256 for post-quantum security.",
        "migration_complexity": "LOW",
        "condition": lambda asset: asset.key_size and asset.key_size < 256,
        "protocol_notes": "Key size upgrade from 128-bit to 256-bit; cipher mode should be authenticated (GCM).",
        "hard_constraints": {
            "regulatory_compliance": "CNSA 2.0 mandates AES-256 for symmetric encryption."
        },
        "soft_constraints": {
            "key_size_bits": 256,
            "performance_overhead": "Minimal (<10% performance differential on modern AES-NI CPUs)."
        },
        "alternatives": [
            {
                "algorithm": "AES-256-GCM",
                "status": "PRIMARY",
                "security_category": "FIPS 197 / SP 800-38D",
                "rationale": "256-bit key provides 128-bit quantum security margin against Grover search."
            }
        ]
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

    if family in ("SHA-1", "SHA1", "MD5", "MD2", "HASH") or "HASH" in canonical or "SHA" in canonical:
        return "HASH"
    if family in ("AES", "DES", "DES3", "3DES", "RC4", "BLOWFISH") or "CIPHER" in canonical or "ENCRYPT" in canonical:
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
        elif "MD2" in canonical:
            rule = RECOMMENDATION_TABLE.get(("MD2", "HASH"))
        elif "3DES" in canonical or "DES3" in canonical:
            rule = RECOMMENDATION_TABLE.get(("DES3", "ENCRYPTION"))
        elif "DES" in canonical:
            rule = RECOMMENDATION_TABLE.get(("DES", "ENCRYPTION"))
        elif "RC4" in canonical:
            rule = RECOMMENDATION_TABLE.get(("RC4", "ENCRYPTION"))
        elif "BLOWFISH" in canonical:
            rule = RECOMMENDATION_TABLE.get(("BLOWFISH", "ENCRYPTION"))
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
        "hard_constraints": rule.get("hard_constraints", {}),
        "soft_constraints": rule.get("soft_constraints", {}),
        "alternatives": rule.get("alternatives", []),
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
        existing.confidence = 0.95
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
            confidence=0.95,
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
