"""
ECDAT ground truth fixture — mixed safe/vulnerable + negative & edge cases.

Per Phase 20 PDF ("Ground Truth" / "Negative Cases" / "Edge Cases"): a scanner
that just keyword-matches "RSA" everywhere produces false positives on
comments, docstrings, and dead code. This file exercises that distinction —
ECDAT should detect the two REAL calls below and nothing else in this file.

Negative case: this docstring says "our system uses RSA-like key rotation"
and "legacy MD5 checksums were removed in v2" — neither should be detected,
they're prose, not code.
"""
import hashlib

# Edge case: commented-out code is not a live import or call.
# import Crypto.PublicKey.RSA
# rsa_key = Crypto.PublicKey.RSA.generate(1024)

DEPRECATED_ALGO_NAME = "MD5"  # edge case: a string literal naming an algorithm, not a call

# Real, active usage — SHA-256 (safe)
digest = hashlib.sha256(b"payload").hexdigest()

# Real, active usage — SHA-1 (classically vulnerable)
legacy_signature = hashlib.sha1(b"legacy-payload").hexdigest()
