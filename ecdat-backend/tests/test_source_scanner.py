import pytest
from app.services.scanner.source_scanner import scan_file

def test_treesitter_finds_rsa_python():
    code = '''
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend

key = rsa.generate_private_key(65537, 2048, default_backend())
'''
    findings = scan_file('vulnerable.py', code, 'python')
    # Findings should include the import and the api call
    assert any('rsa' in f.raw_match.lower() for f in findings)
    assert any(f.detector == 'treesitter_call' for f in findings)
    assert any(f.detector == 'treesitter_import' for f in findings)

def test_treesitter_finds_sha1_go():
    code = '''
package main
import (
    "crypto/sha1"
    "fmt"
)
func main() {
    h := sha1.New()
}
'''
    findings = scan_file('vulnerable.go', code, 'go')
    assert any('sha1' in f.raw_match.lower() for f in findings)
    assert any(f.detector == 'treesitter_import' for f in findings)
    assert any(f.detector == 'treesitter_call' for f in findings)

def test_treesitter_safe_python():
    code = '''
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
# Using AES-256-GCM
cipher = Cipher(algorithms.AES(key), modes.GCM(iv))
'''
    findings = scan_file('safe.py', code, 'python')
    # Should only find the AES API call if it matches exactly, AES is currently tracked in patterns
    # Wait, the pattern for AES is algorithms.AES, which IS in the list. So it WILL find it.
    # We just need to check it doesn't find RSA or SHA1.
    assert not any('rsa' in f.raw_match.lower() for f in findings)
    assert not any('sha1' in f.raw_match.lower() for f in findings)
    assert any('algorithms.AES' in f.raw_match for f in findings)
