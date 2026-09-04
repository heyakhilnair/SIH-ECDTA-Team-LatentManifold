import re

ALGORITHM_ALIASES = {
    # Hash Algorithms
    'sha1': 'SHA-1',
    'sha-1': 'SHA-1',
    'md5': 'MD5',
    'md2': 'MD2',
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

def normalize_algorithm(raw: str) -> str | None:
    """
    Returns the canonical algorithm name, or None if nothing in
    ALGORITHM_ALIASES actually matched.

    Found via Phase 7 ground truth testing: plain `in` substring search (the
    old implementation) means any text containing another word that happens
    to contain an alias as a substring gets misclassified — e.g. `from
    cryptography... import modes` was detected as DES, because "des" is a
    substring of "mo-DES". Same risk for "co-DES", "no-DES", etc. Word-boundary
    regex search fixes this while still matching hyphenated aliases like
    "sha-1" or "3des" correctly (\\b only requires a non-word char or
    string edge on either side, not that every internal character is a
    word character).

    The old fallback ("return raw.upper()" for anything unmatched) is also
    gone: a bare `import "crypto/elliptic"` or `require('crypto')` doesn't
    tell us which specific algorithm is used, so synthesizing an "asset"
    named `"CRYPTO/ELLIPTIC"` out of it is exactly the kind of guess the
    project's own "no fake data" rule prohibits. Evidence is still recorded
    either way (see asset_resolver.py) — we just don't fabricate a canonical
    asset for evidence we can't actually name.
    """
    if not raw:
        return None

    raw_lower = raw.lower().strip()

    if raw_lower in ALGORITHM_ALIASES:
        return ALGORITHM_ALIASES[raw_lower]

    # camelCase-aware for the substring search below: OID-derived names like
    # "rsaEncryption" or "sha256WithRSAEncryption" (real x509 signature
    # algorithm names from the `cryptography` library) glue algorithm
    # abbreviations directly onto other words with no separator except a
    # case change. Insert a boundary at each lower->UPPER transition before
    # lowercasing, so \b below can tell "rsa" in "rsa|Encryption" apart from
    # "des" wrongly appearing inside the ordinary word "modes" (which has no
    # case transition at all, so this doesn't affect it).
    raw_lower = re.sub(r'(?<=[a-z0-9])(?=[A-Z])', ' ', raw).lower().strip()

    for alias, canonical in ALGORITHM_ALIASES.items():
        if re.search(_alias_pattern(alias), raw_lower):
            return canonical

    return None


def _alias_pattern(alias: str) -> str:
    # \b only fires at a word<->non-word transition, so it can't be placed
    # next to a trailing non-word char (e.g. the '+' in "sphincs+") without
    # the pattern becoming unmatchable. Only require a boundary on sides that
    # are actually alphanumeric.
    left = r'\b' if alias[0].isalnum() else ''
    right = r'\b' if alias[-1].isalnum() else ''
    return left + re.escape(alias) + right

def get_algorithm_family(canonical: str) -> str:
    canonical = canonical.upper()
    if 'RSA' in canonical: return 'RSA'
    if 'EC' in canonical or canonical in ['P-256', 'P-384', 'P-521', 'X25519', 'ED25519']: return 'ECC'
    if 'AES' in canonical: return 'AES'
    if 'SHA' in canonical or 'MD5' in canonical or 'MD2' in canonical: return 'HASH'
    if 'DES' in canonical: return 'DES'
    if canonical in ['ML-KEM', 'ML-DSA', 'SLH-DSA', 'FALCON']: return 'PQC'
    if canonical == 'BLOWFISH': return 'BLOWFISH'
    return 'OTHER'
