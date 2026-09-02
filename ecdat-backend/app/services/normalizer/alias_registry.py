import re

ALGORITHM_ALIASES = {
    # Hash Algorithms
    'sha1': 'SHA-1',
    'sha-1': 'SHA-1',
    'md5': 'MD5',
    'sha256': 'SHA-256',
    'sha-256': 'SHA-256',
    'sha384': 'SHA-384',
    'sha-384': 'SHA-384',
    'sha512': 'SHA-512',
    'sha-512': 'SHA-512',
    
    # Public Key Algorithms
    'rsa': 'RSA',
    'rsa-pss': 'RSA-PSS',
    'rsa-oaep': 'RSA-OAEP',
    'ecdsa': 'ECDSA',
    'ecdh': 'ECDH',
    'dsa': 'DSA',
    
    # Elliptic Curves
    'secp256r1': 'P-256',
    'p256': 'P-256',
    'p-256': 'P-256',
    'secp384r1': 'P-384',
    'p384': 'P-384',
    'p-384': 'P-384',
    'secp521r1': 'P-521',
    'p521': 'P-521',
    'p-521': 'P-521',
    'x25519': 'X25519',
    'ed25519': 'Ed25519',
    
    # Symmetric Algorithms
    'aes': 'AES',
    'aes-gcm': 'AES-GCM',
    'aes-cbc': 'AES-CBC',
    'des': 'DES',
    'tripledes': '3DES',
    '3des': '3DES',
    'blowfish': 'Blowfish',
    'chacha20': 'ChaCha20',
    
    # PQC Algorithms
    'ml-kem': 'ML-KEM',
    'kyber': 'ML-KEM',
    'ml-dsa': 'ML-DSA',
    'dilithium': 'ML-DSA',
    'slh-dsa': 'SLH-DSA',
    'sphincs+': 'SLH-DSA',
    'falcon': 'Falcon',
}

# Add some regex patterns to extract canonical names from complex strings
def normalize_algorithm(raw: str) -> str:
    if not raw:
        return "UNKNOWN"
        
    raw_lower = raw.lower().strip()
    
    # Direct match
    if raw_lower in ALGORITHM_ALIASES:
        return ALGORITHM_ALIASES[raw_lower]
        
    # Search for known substrings
    for alias, canonical in ALGORITHM_ALIASES.items():
        if alias in raw_lower:
            return canonical
            
    # Fallback: Just return the raw value, upper-cased
    return raw.upper()

def get_algorithm_family(canonical: str) -> str:
    canonical = canonical.upper()
    if 'RSA' in canonical: return 'RSA'
    if 'EC' in canonical or canonical in ['P-256', 'P-384', 'P-521', 'X25519', 'ED25519']: return 'ECC'
    if 'AES' in canonical: return 'AES'
    if 'SHA' in canonical or 'MD5' in canonical: return 'HASH'
    if 'DES' in canonical: return 'DES'
    if canonical in ['ML-KEM', 'ML-DSA', 'SLH-DSA', 'FALCON']: return 'PQC'
    return 'OTHER'
