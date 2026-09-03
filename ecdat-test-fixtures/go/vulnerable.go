// ECDAT ground truth fixture — deliberately vulnerable Go cryptography.
// Idiomatic Go: crypto/sha1 etc. are referenced by their package name
// (sha1, md5, ...), never as "crypto.sha1" — matches how semgrep's rules in
// rules/crypto_rules.yaml are actually written. See ../EXPECTED_FINDINGS.json.
package main

import (
	"crypto/des"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha1"
)

func main() {
	// RSA:2048 — classically fine, quantum vulnerable (Shor's algorithm)
	key, _ := rsa.GenerateKey(rand.Reader, 2048)
	_ = key

	// SHA-1 — cryptographically broken (Shattered 2017)
	hash := sha1.New()
	_ = hash

	// DES — 56-bit key, brute-forceable
	block, _ := des.NewCipher([]byte("8bytekey"))
	_ = block
}
