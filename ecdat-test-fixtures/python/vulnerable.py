"""
ECDAT ground truth fixture — deliberately vulnerable Python cryptography.

Every construct below is a REAL, working call into a real crypto library —
not a comment or a string mentioning an algorithm name (those are covered
separately by negative_cases.py). See ../EXPECTED_FINDINGS.json for what
ECDAT is expected to detect here.
"""
import hashlib
import Crypto.PublicKey.RSA
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

# RSA:2048 — classically fine at this size, but quantum vulnerable (Shor's algorithm)
rsa_key = Crypto.PublicKey.RSA.generate(2048)

# SHA-1 — cryptographically broken (Shattered 2017, SHAmbles 2020)
password_hash = hashlib.sha1(b"user-password").hexdigest()

# MD5 — cryptographically broken, collisions in seconds on modern hardware
checksum = hashlib.md5(b"some-data").hexdigest()

# DES — 56-bit key, brute-forceable in hours
des_cipher = Cipher(algorithms.DES(b"8bytekey"), modes.ECB())
