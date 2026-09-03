// ECDAT ground truth fixture — TLS certificate generation with cipher suites.
//
// KNOWN SCANNER GAP (found while building this fixture, not fixed here —
// separate from Phase 7's scope, tracked as backlog): CRYPTO_PATTERNS in
// app/services/scanner/source_scanner.py has no entry for "crypto/tls" or
// tls.Config/tls.CipherSuite* constants at all, so the tls.Config block below
// is invisible to ECDAT today. Only the ECDSA P-256 key generation for the
// certificate is detected (both tree-sitter's "elliptic.P256" call pattern
// and semgrep's ecdat-ecdsa-p256 rule fire on that line). EXPECTED_FINDINGS.json
// only claims what's actually detectable right now — see its "known_gaps".
package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
)

func generateCert() {
	// ECDSA P-256 — quantum vulnerable (Shor's algorithm breaks ECDLP)
	priv, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	_ = priv
}

func tlsConfig() *tls.Config {
	// Not detected today (see gap note above) — real code, real cipher suites.
	return &tls.Config{
		MinVersion: tls.VersionTLS12,
		CipherSuites: []uint16{
			tls.TLS_RSA_WITH_AES_128_CBC_SHA, // weak: static RSA key exchange, no forward secrecy
		},
	}
}
