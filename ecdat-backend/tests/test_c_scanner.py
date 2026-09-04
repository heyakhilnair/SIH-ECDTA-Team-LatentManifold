"""
C language support — added after investigating why scanning
github.com/B-Con/crypto-algorithms (real, textbook AES/DES/SHA1/SHA256/MD5
implementations in pure C) found zero evidence: C was never in
detect_language()'s list at all (only python/go/js, then clojure).
"""
from app.services.scanner.source_scanner import scan_file, detect_language


def test_detect_language_recognizes_c_extensions():
    assert detect_language("aes.c") == "c"
    assert detect_language("aes.h") == "c"


def test_scan_file_finds_openssl_include_and_calls():
    code = '''
#include <openssl/aes.h>
#include <openssl/sha.h>

void run(unsigned char *key) {
    AES_encrypt(in, out, &aes_key);
    SHA1_Init(&ctx);
}
'''
    findings = scan_file("main.c", code, "c")
    matched = {f.raw_match for f in findings}
    assert any("openssl/aes.h" in m for m in matched)
    assert any("openssl/sha.h" in m for m in matched)
    assert any("AES_encrypt" in m for m in matched)
    assert any("SHA1_Init" in m for m in matched)


def test_scan_file_finds_selfcontained_crypto_impl_by_function_naming():
    """The actual B-Con/crypto-algorithms convention: no external library,
    just algorithm-named functions (aes_encrypt, sha1_init, ...)."""
    code = '''
#include "aes.h"

void aes_key_setup(const BYTE key[], WORD w[], int keysize) {
    // real key schedule implementation
}

void aes_encrypt(const BYTE in[], BYTE out[], const WORD key[], int keysize) {
    // real AES rounds
}
'''
    findings = scan_file("aes.c", code, "c")
    matched = {f.raw_match for f in findings}
    assert any('"aes.h"' in m for m in matched)
    assert any("aes_key_setup" in m for m in matched)
    assert any("aes_encrypt" in m for m in matched)


def test_scan_file_ignores_non_crypto_c():
    code = '''
#include <stdio.h>
int add(int a, int b) {
    return a + b;
}
'''
    assert scan_file("math.c", code, "c") == []


if __name__ == "__main__":
    test_detect_language_recognizes_c_extensions()
    test_scan_file_finds_openssl_include_and_calls()
    test_scan_file_finds_selfcontained_crypto_impl_by_function_naming()
    test_scan_file_ignores_non_crypto_c()
    print("All C scanner checks passed.")
