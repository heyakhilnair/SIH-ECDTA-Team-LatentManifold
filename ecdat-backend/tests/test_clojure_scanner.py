"""
Clojure support (source + dependency scanning) — added after investigating
why scanning github.com/bitwalker/crypto-experiments found zero evidence:
the repo is Clojure, which no scanner understood at all (tree-sitter only
covered python/go/js). See docs/BACKEND_AUDIT_PHASE0-6.md-style honesty:
real detection for real code, and an honest zero for code that genuinely
doesn't call any recognized crypto API.
"""
from app.services.scanner.source_scanner import scan_file, detect_language
from app.services.scanner.dependency_scanner import parse_clj_manifest, parse_deps_edn


def test_detect_language_recognizes_clojure_extensions():
    assert detect_language("core.clj") == "clojure"
    assert detect_language("core.cljs") == "clojure"
    assert detect_language("core.cljc") == "clojure"


def test_scan_file_finds_java_interop_crypto_calls():
    code = '''
(ns myapp.core)

(defn hash-password [pw]
  (.digest (java.security.MessageDigest/getInstance "SHA-256") (.getBytes pw)))

(defn encrypt [data]
  (javax.crypto.Cipher/getInstance "AES/CBC/PKCS5Padding"))
'''
    findings = scan_file("core.clj", code, "clojure")
    matched = {f.raw_match for f in findings}
    assert any("MessageDigest/getInstance" in m for m in matched)
    assert any("Cipher/getInstance" in m for m in matched)
    for f in findings:
        assert f.source_type == "source_code"
        assert f.confidence == 0.90


def test_scan_file_finds_buddy_core_usage():
    code = '(ns myapp.core (:require [buddy.core.hash :as hash])) (defn h [s] (hash/sha256 s))'
    findings = scan_file("core.clj", code, "clojure")
    assert any("buddy.core.hash" in f.raw_match for f in findings)


def test_scan_file_does_not_duplicate_nested_forms():
    """A crypto call three levels deep (ns -> defn -> let -> call) must
    produce exactly one finding, not one per enclosing form."""
    code = '''
(ns myapp.core)
(defn f [pw]
  (let [x 1]
    (java.security.MessageDigest/getInstance "MD5")))
'''
    findings = scan_file("core.clj", code, "clojure")
    assert len(findings) == 1


def test_scan_file_is_honest_about_non_crypto_clojure():
    """The real bitwalker/crypto-experiments repo: hand-rolled XOR/hex/base64
    with no call into any recognized crypto library. Must find nothing —
    inventing a finding here would violate the project's no-fake-data rule."""
    code = '''
(ns crypto-experiments.core)
(defn apply-xor-bytes [a b]
  (map bit-xor a b))
(defn decode-hex [s]
  (apply str s))
'''
    findings = scan_file("core.clj", code, "clojure")
    assert findings == []


def test_parse_clj_manifest_finds_known_crypto_libs():
    content = '''
(defproject myapp "0.1.0"
  :dependencies [[org.clojure/clojure "1.11.1"]
                 [buddy/buddy-core "1.11.423"]
                 [buddy/buddy-sign "3.5.351"]])
'''
    findings = parse_clj_manifest("project.clj", content)
    pkgs = {f.raw_metadata["package"] for f in findings}
    assert pkgs == {"buddy/buddy-core", "buddy/buddy-sign"}


def test_parse_clj_manifest_ignores_non_crypto_deps():
    """The actual crypto-experiments project.clj: clojure core + data.codec
    + data.priority-map — none are crypto libraries."""
    content = '''
(defproject crypto-experiments "0.1.0-SNAPSHOT"
  :dependencies [[org.clojure/clojure "1.5.1"]
                 [org.clojure/data.codec "0.1.0"]
                 [org.clojure/data.priority-map "0.0.4"]])
'''
    assert parse_clj_manifest("project.clj", content) == []


def test_parse_deps_edn_finds_known_crypto_libs():
    content = '{:deps {org.clojure/clojure {:mvn/version "1.11.1"} caesium/caesium {:mvn/version "0.19.0"}}}'
    findings = parse_deps_edn("deps.edn", content)
    assert len(findings) == 1
    assert findings[0].raw_metadata["package"] == "caesium/caesium"


if __name__ == "__main__":
    # ponytail: runnable self-check without pytest, per the project's own convention
    test_detect_language_recognizes_clojure_extensions()
    test_scan_file_finds_java_interop_crypto_calls()
    test_scan_file_finds_buddy_core_usage()
    test_scan_file_does_not_duplicate_nested_forms()
    test_scan_file_is_honest_about_non_crypto_clojure()
    test_parse_clj_manifest_finds_known_crypto_libs()
    test_parse_clj_manifest_ignores_non_crypto_deps()
    test_parse_deps_edn_finds_known_crypto_libs()
    print("All Clojure scanner checks passed.")
