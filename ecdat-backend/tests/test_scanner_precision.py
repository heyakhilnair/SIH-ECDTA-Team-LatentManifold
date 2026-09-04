"""
Scanner precision regression — found by scanning this project's own repo (as
the "Test" source) and getting CRITICAL SHA-1/MD5/DES findings out of its
marketing landing page (src/app/page.tsx), which merely contains *string
literals* describing what a finding looks like for a UI demo — no real crypto
call. Root cause: extract_function_calls() matched crypto keywords anywhere
in a call_expression's full text, including inside string-literal arguments,
so any function whose *arguments* mention a crypto keyword (a log message, a
demo array, a test fixture, a code comment shown as a string) got flagged as
if the call itself were a crypto API call.
"""
from app.services.scanner.source_scanner import scan_file


def test_string_argument_mentioning_crypto_is_not_a_finding():
    """The exact real-world case: a call whose only relationship to crypto is
    a string literal it happens to pass around (e.g. UI copy for a demo)."""
    code = '''
function showDemoLog() {
  setAstLogs(prev => [
    ...prev,
    "crypto.createHash('md5') - MD5 is weak and forbidden in FIPS mode.",
    "sha1.New() was flagged as legacy vulnerable",
  ]);
}
'''
    findings = scan_file("demo.tsx", code, "javascript")
    assert findings == [], f"string-literal mentions of crypto keywords must not be findings, got {findings}"


def test_real_crypto_call_is_still_found():
    """The fix must not blind the scanner to genuine calls — only to
    keyword mentions buried in unrelated arguments."""
    code = "const hash = crypto.createHash('md5');"
    findings = scan_file("real.ts", code, "javascript")
    assert len(findings) == 1
    assert "createHash" in findings[0].raw_match


def test_require_string_mention_is_not_a_finding():
    code = 'log(["call require(\'crypto\') to import the module"]);'
    findings = scan_file("demo2.ts", code, "javascript")
    assert findings == []


def test_real_require_import_is_still_found():
    code = "const crypto = require('crypto');"
    findings = scan_file("real2.js", code, "javascript")
    assert len(findings) == 1


if __name__ == "__main__":
    test_string_argument_mentioning_crypto_is_not_a_finding()
    test_real_crypto_call_is_still_found()
    test_require_string_mention_is_not_a_finding()
    test_real_require_import_is_still_found()
    print("All scanner precision checks passed.")
