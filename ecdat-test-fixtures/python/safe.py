"""
ECDAT ground truth fixture — quantum-safe / classically-safe Python cryptography.

Negative-case intent: ECDAT must NOT flag these as vulnerable, and must NOT
false-positive on the AES-256 call as "weak" the way it would AES-128.

Note: IMPLEMENTATION_PLAN.md's fixture spec also asks for an ML-KEM example
here. There isn't one — CRYPTO_PATTERNS (app/services/scanner/source_scanner.py)
has no import/call signature for any PQC library, so a real ML-KEM call
wouldn't be detected either way. Writing one anyway would just be dead code
pretending to test something the scanner can't see yet. Tracked as a real
scanner gap in docs/BACKEND_AUDIT_PHASE0-6.md rather than faked here.
"""
import hashlib
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

# AES-256-GCM — 128-bit post-Grover security margin, the recommended symmetric cipher
key = b"0" * 32  # 256-bit key
cipher = Cipher(algorithms.AES(key), modes.GCM(b"0" * 12))

# SHA-256 — 128-bit classical and quantum collision resistance, current standard
digest = hashlib.sha256(b"some-data").hexdigest()
