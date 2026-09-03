import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.scanner.semgrep_scanner import run_semgrep, convert_semgrep_to_evidence

def main():
    test_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".tmp_semgrep_test"))
    os.makedirs(test_dir, exist_ok=True)
    
    with open(os.path.join(test_dir, "vulnerable.go"), "w") as f:
        f.write('''package main
import "crypto/rsa"
import "crypto/rand"
import "crypto/sha1"

func main() {
    key, _ := rsa.GenerateKey(rand.Reader, 2048)
    hash := sha1.New()
}
''')

    with open(os.path.join(test_dir, "vulnerable.py"), "w") as f:
        f.write('''import hashlib
from Crypto.PublicKey import RSA

def run():
    key = RSA.generate(2048)
    h = hashlib.md5(b"test")
''')

    print("Running semgrep...")
    raw_output = run_semgrep(test_dir)
    print("Raw Output Keys:", raw_output.keys())
    print("Results length:", len(raw_output.get("results", [])))

    evidence = convert_semgrep_to_evidence(raw_output, target_dir=test_dir)

    print(f"Found {len(evidence)} pieces of evidence:")
    for e in evidence:
        print(f"- {e.detector} in {e.file_path}:{e.line_number} -> {e.raw_match!r}")

    # Real assertions, not just prints — this used to be purely observational,
    # which is exactly how the "crypto.sha1.New()" dead rule and the
    # "requires login" raw_match bug both went unnoticed.
    detectors = {e.detector.split(".")[-1] for e in evidence}
    assert "ecdat-rsa-keygen-weak" in detectors, f"Go RSA rule didn't fire: {detectors}"
    assert "ecdat-sha1-usage" in detectors, f"Go SHA-1 rule didn't fire: {detectors}"
    assert "ecdat-rsa-python" in detectors, f"Python RSA rule didn't fire: {detectors}"
    assert "ecdat-md5-hash" in detectors, f"Python MD5 rule didn't fire: {detectors}"
    for e in evidence:
        assert e.raw_match and e.raw_match != "requires login", f"raw_match broken: {e.raw_match!r}"
        assert not e.file_path.startswith(test_dir), f"file_path not relativized: {e.file_path}"
    print("\nAll assertions passed.")

if __name__ == "__main__":
    main()
