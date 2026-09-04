import uuid
import re
import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.evidence import EvidenceModel
from app.models.asset import CryptoAsset, EvidenceAsset
from app.services.normalizer.alias_registry import normalize_algorithm, get_algorithm_family
from app.services.normalizer.vulnerability_registry import is_quantum_vulnerable, is_classically_vulnerable, get_vulnerability_notes

def extract_key_size(raw_match: str, context: str) -> int:
    """
    Attempts to extract the key size, from the matched expression itself.

    Only `raw_match` is searched, not `context`. It used to search both
    concatenated together, which meant a key size mentioned in an unrelated
    *nearby* statement (e.g. a comment or the next line's RSA call) got
    silently attributed to *this* evidence — found via Phase 7 ground truth
    testing: a `crypto.createCipheriv('des-ede3-cbc', ...)` call two lines
    above an unrelated `// RSA:2048 key pair generation` comment came out as
    "DES:2048". Real vulnerable code always puts the key size directly in the
    call's own arguments (`rsa.GenerateKey(rand.Reader, 2048)`,
    `RSA.generate(2048)`, ...), so raw_match alone is both sufficient and
    actually correct; `context` is kept in the signature so callers don't
    need to change, but is intentionally unused now.
    """
    text = raw_match.lower()

    matches = re.findall(r'\b(4096|3072|2048|1024|512|521|384|256|128)\b', text)
    if matches:
        return int(matches[0])

    # Infer from curve names
    if 'p521' in text or 'p-521' in text: return 521
    if 'p384' in text or 'p-384' in text or 'secp384r1' in text: return 384
    if 'p256' in text or 'p-256' in text or 'secp256r1' in text: return 256

    return None

async def resolve_evidence_to_asset(db: AsyncSession, evidence: EvidenceModel):
    """
    Takes a raw evidence row, extracts algorithm properties, normalizes them,
    and either finds or creates the corresponding canonical CryptoAsset.
    Then links the Evidence to the CryptoAsset.

    Returns None (no asset created) when normalize_algorithm can't identify a
    specific algorithm — e.g. a bare `import "crypto/elliptic"` line. The
    evidence row itself was already persisted by the orchestrator regardless;
    we just don't fabricate a canonical asset out of a raw string we can't
    actually name (see alias_registry.normalize_algorithm's docstring — this
    used to synthesize junk assets like `"CRYPTO/ELLIPTIC"`).
    """
    # 1. Extract and normalize properties.
    #
    # Dependency evidence is handled separately: a package name like
    # "jsonwebtoken" isn't a cryptographic algorithm and never normalizes to
    # one (jsonwebtoken can sign with HS256, RS256, ES256, ... — the manifest
    # alone doesn't say which). The old code ran it through
    # normalize_algorithm() anyway, which fell through to its raw-uppercase
    # fallback and created a fake-looking "algorithm" named e.g.
    # "JSONWEBTOKEN" with real quantum/classical vulnerability flags computed
    # against a lookup table it was never in (always False — silently
    # confident, not honestly "unknown"). We don't have enough information to
    # name a specific algorithm here, so say that instead of guessing.
    if evidence.source_type == 'dependency':
        package = evidence.raw_metadata.get('package') or evidence.raw_match
        canonical_name = package
        family = "DEPENDENCY"
        key_size = None
        canonical_str = package.upper()
        q_vuln = False
        c_vuln = False
        purpose = evidence.raw_metadata.get('purpose', 'cryptographic functionality')
        vuln_notes = (
            f"Dependency '{package}' provides {purpose}. ECDAT does not yet infer which "
            f"specific algorithm(s) it's configured to use from the manifest alone — "
            f"review its usage manually."
        )
    else:
        raw_algo = evidence.raw_metadata.get('algorithm') or evidence.raw_match
        canonical_name = normalize_algorithm(raw_algo)
        if canonical_name is None:
            return None
        family = get_algorithm_family(canonical_name)
        key_size = extract_key_size(evidence.raw_match, evidence.context_lines)

        # Formulate canonical string (e.g., "RSA:2048" or "SHA-256")
        canonical_str = canonical_name
        if key_size:
            canonical_str = f"{canonical_name}:{key_size}"

        # 2. Check vulnerability status
        q_vuln = is_quantum_vulnerable(canonical_name, key_size)
        c_vuln = is_classically_vulnerable(canonical_name, key_size)
        vuln_notes = get_vulnerability_notes(canonical_name, key_size)
    
    # 3. Find or Create CryptoAsset
    query = select(CryptoAsset).where(
        CryptoAsset.workspace_id == evidence.workspace_id,
        CryptoAsset.algorithm_canonical == canonical_str
    )
    result = await db.execute(query)
    asset = result.scalar_one_or_none()
    
    if not asset:
        asset = CryptoAsset(
            workspace_id=evidence.workspace_id,
            algorithm_canonical=canonical_str,
            algorithm_family=family,
            algorithm_name=canonical_name,
            key_size=key_size,
            quantum_vulnerable=q_vuln,
            classical_vulnerable=c_vuln,
            vulnerability_notes=vuln_notes,
        )
        db.add(asset)
        await db.commit()
        await db.refresh(asset)
    else:
        # Re-evaluate vulnerability status every time, not just at creation —
        # otherwise an asset's classification is frozen to whatever
        # vulnerability_registry.py knew on the day it was first seen. Found
        # live: Blowfish was added to CLASSICALLY_VULNERABLE, but every
        # already-scanned Blowfish asset kept showing LOW/no-recommendation
        # until a fresh scan, because only brand-new assets ever got these
        # fields computed.
        asset.last_seen = datetime.datetime.utcnow()
        asset.algorithm_family = family
        asset.quantum_vulnerable = q_vuln
        asset.classical_vulnerable = c_vuln
        asset.vulnerability_notes = vuln_notes
        await db.commit()


    # 4. Link Evidence to Asset
    # Check if link already exists
    link_query = select(EvidenceAsset).where(
        EvidenceAsset.evidence_id == evidence.id,
        EvidenceAsset.asset_id == asset.id
    )
    link_result = await db.execute(link_query)
    existing_link = link_result.scalar_one_or_none()
    
    if not existing_link:
        new_link = EvidenceAsset(
            evidence_id=evidence.id,
            asset_id=asset.id
        )
        db.add(new_link)
        await db.commit()
        
    return asset
