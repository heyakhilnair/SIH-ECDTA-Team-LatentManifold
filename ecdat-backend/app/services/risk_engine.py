"""
ECDAT Quantum Risk Engine — Phase 4
=====================================
Computes multi-dimensional risk scores per canonical CryptoAsset.

Risk dimensions (from Phase 6 PDF):
  1. Quantum Exposure     — Shor/Grover applicability
  2. Classical Risk       — CVEs, deprecated status, weak key size
  3. Mosca Result         — X + Y > Z calculation with margin levels
  4. Business Criticality — asset context, data classification
  5. Data Lifetime (X)    — how long must this data remain secure?
  6. Migration Complexity — blast radius, protocol constraints
  7. Composite Priority   — final priority label

IMPORTANT: Z (threat horizon) is a configurable workspace setting.
Never hardcode it permanently — use DEFAULT_THREAT_HORIZON as fallback only.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.asset import CryptoAsset
from app.models.risk import RiskScore
from app.models.workspace import Workspace

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Default threat horizon Z in years (conservative/expected estimate for CRQC).
# This should ideally come from a workspace setting.
DEFAULT_THREAT_HORIZON_YEARS: float = 12.0

# Estimated migration time Y in years, by algorithm family.
# Public-key infrastructure is the hardest to migrate.
DEFAULT_MIGRATION_TIME: dict[str, float] = {
    "RSA":    3.0,
    "ECDSA":  2.5,
    "ECDH":   2.5,
    "ECC":    2.5,
    "DSA":    2.5,
    "SHA-1":  0.5,
    "SHA1":   0.5,
    "MD5":    0.5,
    "DES":    0.5,
    "DES3":   1.0,
    "RC4":    0.5,
    "AES":    1.0,
    "HASH":   0.5,
    "BLOWFISH": 1.0,
}

# Weak key size thresholds per family (classical security concern)
WEAK_KEY_THRESHOLDS: dict[str, int] = {
    "RSA":   2048,   # < 2048-bit RSA is classically weak (NIST deprecated 2015)
    "ECDSA": 224,    # < 224-bit ECDSA is weak
    "ECDH":  224,
    "DSA":   2048,
    "DH":    2048,
}

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def is_weak_key_size(family: str, key_size: int | None) -> bool:
    """Return True if the key size is below the classical security threshold."""
    if key_size is None:
        return False
    threshold = WEAK_KEY_THRESHOLDS.get(family.upper() if family else "", 0)
    return threshold > 0 and key_size < threshold


def get_quantum_reason(asset: CryptoAsset) -> str:
    """Return a human-readable explanation for the quantum risk level."""
    if not asset.quantum_vulnerable:
        if asset.algorithm_family and asset.algorithm_family.startswith("ML-"):
            return (
                f"{asset.algorithm_canonical} is a NIST-standardized post-quantum algorithm. "
                f"It is designed to resist attacks from both classical and quantum computers."
            )
        return (
            f"{asset.algorithm_canonical} is not known to be broken by Shor's or Grover's "
            f"algorithm at the current key size. Considered quantum-safe for now."
        )

    family = asset.algorithm_family or ""
    key_info = f" ({asset.key_size}-bit)" if asset.key_size else ""

    if family.upper() in ("RSA", "ECDSA", "ECDH", "ECC", "DSA", "DH"):
        return (
            f"{asset.algorithm_canonical}{key_info} relies on the discrete logarithm or "
            f"integer factorization problem. Shor's algorithm solves both in polynomial time "
            f"on a Cryptographically Relevant Quantum Computer (CRQC), rendering this algorithm "
            f"completely broken. Immediate migration planning is required."
        )

    # Grover-weakened symmetric / hash algorithms
    if family.upper() in ("AES", "SHA", "HASH", "HMAC"):
        return (
            f"{asset.algorithm_canonical}{key_info} is weakened by Grover's algorithm, which "
            f"halves the effective security level. A 128-bit key provides only ~64-bit "
            f"post-quantum security. Upgrade to a larger key size."
        )

    return (
        f"{asset.algorithm_canonical} has been flagged as quantum-vulnerable. "
        f"Review NIST PQC migration guidance."
    )


def get_classical_reason(asset: CryptoAsset) -> str:
    """Return a human-readable explanation for the classical risk level."""
    if asset.vulnerability_notes:
        return asset.vulnerability_notes

    family = (asset.algorithm_family or "").upper()
    canonical = asset.algorithm_canonical or ""

    # SHA-1
    if "SHA-1" in canonical or "SHA1" in canonical:
        return (
            "SHA-1 is cryptographically broken (Shattered 2017, SHAmbles 2020). "
            "Collision attacks are practical. Prohibited in TLS, code signing, and certificates "
            "(NIST deprecated 2011, prohibited 2015)."
        )

    # MD5
    if "MD5" in canonical:
        return (
            "MD5 is cryptographically broken. Collision attacks take seconds on modern hardware. "
            "Prohibited for any security-relevant use (NIST SP 800-131A, RFC 6151)."
        )

    # DES
    if canonical in ("DES", "DES3", "3DES"):
        return (
            "DES/3DES is deprecated by NIST (SP 800-131A Rev. 2, 2019). "
            "DES has a 56-bit key, brute-forceable in hours. 3DES has Sweet32 birthday attack "
            "vulnerability in TLS. Replace with AES-256-GCM immediately."
        )

    # RC4
    if "RC4" in canonical:
        return (
            "RC4 has multiple statistical biases and is completely prohibited in TLS (RFC 7465). "
            "Multiple practical attacks exist."
        )

    # Weak RSA
    if family == "RSA" and asset.key_size and asset.key_size < 2048:
        return (
            f"RSA-{asset.key_size} is classically weak. NIST deprecated RSA < 2048-bit in 2015 "
            f"(SP 800-131A). Keys below 1024-bit can be factored with modern hardware."
        )

    # Weak ECDSA
    if family in ("ECDSA", "ECDH") and asset.key_size and asset.key_size < 224:
        return (
            f"{canonical} with {asset.key_size}-bit key is below the NIST minimum "
            f"security threshold (NIST SP 800-57 Part 1)."
        )

    if asset.classical_vulnerable:
        return f"{canonical} has known classical vulnerabilities. Refer to NIST SP 800-131A."

    return f"No significant classical vulnerabilities detected for {canonical}."


# ---------------------------------------------------------------------------
# Mosca Risk Calculator
# ---------------------------------------------------------------------------

def calculate_mosca_risk(
    data_lifetime_years: float,
    migration_time_years: float,
    threat_horizon_years: float = DEFAULT_THREAT_HORIZON_YEARS,
) -> dict:
    """
    Mosca's Theorem:
        If X + Y > Z → the organization is at risk NOW (harvest-now-decrypt-later).

    X = data_lifetime_years  (how long must this data stay secret?)
    Y = migration_time_years (how long will migration take?)
    Z = threat_horizon_years (when will a CRQC arrive?)

    Returns a structured dict with level + explanation.
    """
    total_xy = data_lifetime_years + migration_time_years
    margin = threat_horizon_years - total_xy

    if total_xy > threat_horizon_years:
        level = "CRITICAL"
        explanation = (
            f"X ({data_lifetime_years}y) + Y ({migration_time_years}y) = {total_xy}y "
            f"exceeds Z ({threat_horizon_years}y). "
            f"The Harvest-Now-Decrypt-Later window is OPEN. "
            f"Adversaries can intercept encrypted data today and decrypt it once a CRQC is available."
        )
    elif margin <= 2:
        level = "HIGH"
        explanation = (
            f"Only {margin:.1f}y margin before Mosca threshold. "
            f"Migration must begin immediately — there is no safety buffer."
        )
    elif margin <= 6:
        level = "MEDIUM"
        explanation = (
            f"{margin:.1f}y margin before Mosca threshold. "
            f"Active planning and roadmap definition required. "
            f"Do not delay migration beyond the next planning cycle."
        )
    else:
        level = "LOW"
        explanation = (
            f"{margin:.1f}y margin before Mosca threshold. "
            f"Monitor the quantum timeline and revisit annually. "
            f"Begin discovery and roadmap planning."
        )

    return {
        "level": level,
        "x_data_lifetime": data_lifetime_years,
        "y_migration_time": migration_time_years,
        "z_threat_horizon": threat_horizon_years,
        "total_xy": total_xy,
        "margin": margin,
        "explanation": explanation,
    }


# ---------------------------------------------------------------------------
# Main Risk Computation
# ---------------------------------------------------------------------------

async def compute_asset_risk(
    db: AsyncSession,
    asset: CryptoAsset,
    data_lifetime_years: float = 7.0,
    business_criticality: str = "HIGH",
    exposure: str = "INTERNAL",
    threat_horizon_years: float | None = None,
    persist: bool = True,
) -> RiskScore:
    """
    Compute a multi-dimensional risk score for a canonical CryptoAsset.

    threat_horizon_years (Z): if not explicitly passed (e.g. a what-if
    /risk/recalculate call), this is read from the asset's own workspace
    setting. Only if the workspace has none does it fall back to
    DEFAULT_THREAT_HORIZON_YEARS. This is what makes Z an actual configurable
    workspace setting instead of a hardcoded constant — see
    docs/BACKEND_AUDIT_PHASE0-6.md #10.

    persist=False (real bug fixed 2026-09-04): the What-If Recalculator was
    calling this with hypothetical slider values and this function
    unconditionally committed the result over the asset's REAL, persisted
    risk_scores row — so every "what if" experiment silently corrupted the
    actual risk data shown everywhere else (Mission Control, Risk table,
    Migration Planner) until the asset's next real scan overwrote it again.
    persist=False returns a transient, never-committed RiskScore for preview
    only. The real scan pipeline (risk.py's trigger after normalization)
    always uses the default persist=True.

    Returns a RiskScore ORM object — persisted when persist=True, transient
    (never added to the session) when persist=False.
    """
    if threat_horizon_years is None:
        workspace = await db.get(Workspace, asset.workspace_id)
        threat_horizon_years = (
            workspace.threat_horizon_years
            if workspace and workspace.threat_horizon_years
            else DEFAULT_THREAT_HORIZON_YEARS
        )

    family = (asset.algorithm_family or "").upper()

    # --- Dimension 1: Quantum Exposure ---
    if asset.quantum_vulnerable:
        quantum_exposure = "HIGH"
    else:
        quantum_exposure = "NONE"

    # --- Dimension 2: Classical Security Risk ---
    if asset.classical_vulnerable:
        classical_risk = "CRITICAL"
    elif is_weak_key_size(family, asset.key_size):
        classical_risk = "HIGH"
    else:
        classical_risk = "LOW"

    # --- Dimension 3: Mosca Calculation ---
    migration_time = DEFAULT_MIGRATION_TIME.get(family, 2.0)
    # Also check by canonical name for hash-family variants
    if migration_time == 2.0:
        canonical_upper = (asset.algorithm_canonical or "").upper()
        for key, val in DEFAULT_MIGRATION_TIME.items():
            if canonical_upper.startswith(key.upper()):
                migration_time = val
                break

    mosca = calculate_mosca_risk(
        data_lifetime_years=data_lifetime_years,
        migration_time_years=migration_time,
        threat_horizon_years=threat_horizon_years,
    )

    # --- Dimension 4: Composite Priority ---
    # Classical vulnerabilities = active threats (trump quantum)
    if classical_risk == "CRITICAL":
        composite = "CRITICAL"
    elif classical_risk == "HIGH":
        composite = "CRITICAL" if business_criticality in ("CRITICAL",) else "HIGH"
    # Mosca (harvest-now-decrypt-later) only applies to an asset a quantum
    # computer can actually break — gating it behind quantum_exposure fixes a
    # real bug: previously the Mosca X+Y-vs-Z timeline was computed and
    # applied to every asset unconditionally, so something neither classically
    # nor quantum vulnerable (e.g. a bare AES call with no confirmed weak key
    # size) still got bumped to HIGH/MEDIUM composite risk purely from the
    # workspace's default timeline — a false signal unrelated to that asset.
    elif quantum_exposure == "HIGH":
        if mosca["level"] == "CRITICAL":
            composite = "CRITICAL"
        elif mosca["level"] == "HIGH":
            composite = "HIGH" if business_criticality in ("CRITICAL", "HIGH") else "MEDIUM"
        elif mosca["level"] == "MEDIUM":
            composite = "HIGH" if business_criticality in ("CRITICAL", "HIGH") else "MEDIUM"
        else:
            composite = "LOW"
    else:
        composite = "LOW"

    # Map to the model's field names (quantum_risk_level / classical_risk_level)
    # quantum_risk_level derives from quantum_exposure + mosca
    if quantum_exposure == "HIGH":
        quantum_risk_level = mosca["level"]  # CRITICAL/HIGH/MEDIUM/LOW based on Mosca
    else:
        quantum_risk_level = "SAFE"

    classical_risk_level = classical_risk

    # --- Build structured risk explanation ---
    risk_explanation = {
        "quantum": {
            "level": quantum_risk_level,
            "exposure": quantum_exposure,
            "reason": get_quantum_reason(asset),
        },
        "classical": {
            "level": classical_risk_level,
            "reason": get_classical_reason(asset),
        },
        "mosca": mosca,
        "business_criticality": business_criticality,
        "exposure": exposure,
        "composite": composite,
        "migration_complexity": DEFAULT_MIGRATION_TIME.get(family, 2.0),
    }

    if not persist:
        # What-if preview — built entirely in memory, never added to the
        # session (no db.add, no db.commit) so the real persisted row for
        # this asset is completely untouched.
        #
        # Deliberately NOT setting `preview.asset = asset` here: RiskScore.asset
        # is one side of a uselist=False one-to-one backref, and `asset` already
        # has a live `risk_score` back-pointer to its REAL persisted row in this
        # same session. Assigning the relationship reassigns that backref,
        # which — as a real bug during testing confirmed — nulls out the real
        # row's asset_id on the next autoflush (an "an asset has at most one
        # risk_score" invariant the ORM enforces by detaching the old one).
        # The router builds the response dict itself from `asset` (already in
        # scope there) instead of routing this through serialize_risk()'s
        # `r.asset.*` lookups, so no relationship needs to be wired here at all.
        preview = RiskScore(
            asset_id=asset.id,
            workspace_id=asset.workspace_id,
            data_lifetime_years=data_lifetime_years,
            migration_time_years=migration_time,
            business_criticality=business_criticality,
            exposure=exposure,
            mosca_threshold_exceeded=mosca["total_xy"] > mosca["z_threat_horizon"],
            quantum_risk_level=quantum_risk_level,
            classical_risk_level=classical_risk_level,
            composite_risk_level=composite,
            quantum_reason=get_quantum_reason(asset),
            classical_reason=get_classical_reason(asset),
            risk_explanation=risk_explanation,
        )
        return preview

    # --- Persist (upsert) ---
    query = select(RiskScore).where(RiskScore.asset_id == asset.id)
    result = await db.execute(query)
    existing = result.scalar_one_or_none()

    if existing:
        existing.data_lifetime_years = data_lifetime_years
        existing.migration_time_years = migration_time
        existing.business_criticality = business_criticality
        existing.exposure = exposure
        existing.mosca_threshold_exceeded = mosca["total_xy"] > mosca["z_threat_horizon"]
        existing.quantum_risk_level = quantum_risk_level
        existing.classical_risk_level = classical_risk_level
        existing.composite_risk_level = composite
        existing.quantum_reason = get_quantum_reason(asset)
        existing.classical_reason = get_classical_reason(asset)
        existing.risk_explanation = risk_explanation
        risk = existing
    else:
        risk = RiskScore(
            asset_id=asset.id,
            workspace_id=asset.workspace_id,
            data_lifetime_years=data_lifetime_years,
            migration_time_years=migration_time,
            business_criticality=business_criticality,
            exposure=exposure,
            mosca_threshold_exceeded=mosca["total_xy"] > mosca["z_threat_horizon"],
            quantum_risk_level=quantum_risk_level,
            classical_risk_level=classical_risk_level,
            composite_risk_level=composite,
            quantum_reason=get_quantum_reason(asset),
            classical_reason=get_classical_reason(asset),
            risk_explanation=risk_explanation,
        )
        db.add(risk)

    await db.commit()
    await db.refresh(risk)
    return risk
