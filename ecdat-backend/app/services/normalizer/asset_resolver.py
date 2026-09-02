import uuid
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.evidence import EvidenceModel
from app.models.asset import CryptoAsset, EvidenceAsset
from app.services.normalizer.alias_registry import normalize_algorithm, get_algorithm_family
from app.services.normalizer.vulnerability_registry import is_quantum_vulnerable, is_classically_vulnerable, get_vulnerability_notes

def extract_key_size(raw_match: str, context: str) -> int:
    """
    Attempts to extract the key size from the raw match or context lines.
    """
    text = (raw_match + " " + (context or "")).lower()
    
    # Common key sizes
    sizes = [4096, 3072, 2048, 1024, 512, 521, 384, 256, 128]
    
    # Try to find explicit numbers
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
    """
    # 1. Extract and normalize properties
    raw_algo = evidence.raw_metadata.get('algorithm') or evidence.raw_match
    
    # If the evidence is a dependency, use the package name as a hint
    if evidence.source_type == 'dependency':
        raw_algo = evidence.raw_metadata.get('package', raw_algo)
        
    canonical_name = normalize_algorithm(raw_algo)
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
        # Update last seen
        pass
        
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
