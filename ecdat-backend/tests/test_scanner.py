"""
Phase 7 ground truth precision/recall test.

Runs the REAL scanning pipeline (tree-sitter + semgrep + dependency scanner)
and the REAL normalizer against ecdat-test-fixtures/, then checks the result
against EXPECTED_FINDINGS.json — not a mock, the actual detectors used by the
orchestrator (app/services/scanner/orchestrator.py's sync_scan_repo, minus
the git clone step since these are local fixture files already).
"""
import json
import os

import pytest

from app.services.scanner.source_scanner import scan_file, detect_language
from app.services.scanner.semgrep_scanner import run_semgrep, convert_semgrep_to_evidence
from app.services.scanner.dependency_scanner import find_and_scan_manifests
from app.services.normalizer.alias_registry import normalize_algorithm
from app.services.normalizer.asset_resolver import extract_key_size

FIXTURES_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "ecdat-test-fixtures")
)


def _scan_fixtures():
    """Runs every detector against the fixture corpus and normalizes the results
    into (canonical_string -> [file_path, ...]) exactly the way
    asset_resolver.resolve_evidence_to_asset does, without touching the DB."""
    findings = []
    for root, _dirs, files in os.walk(FIXTURES_DIR):
        for fn in files:
            path = os.path.join(root, fn)
            lang = detect_language(path)
            if lang:
                with open(path, encoding="utf-8") as f:
                    content = f.read()
                findings.extend(scan_file(os.path.relpath(path, FIXTURES_DIR), content, lang))

    semgrep_out = run_semgrep(FIXTURES_DIR)
    findings.extend(convert_semgrep_to_evidence(semgrep_out, target_dir=FIXTURES_DIR))
    findings.extend(find_and_scan_manifests(FIXTURES_DIR))

    assets: dict[str, set[str]] = {}
    for ev in findings:
        if ev.source_type == "dependency":
            pkg = ev.raw_metadata.get("package") or ev.raw_match
            assets.setdefault(pkg.upper(), set()).add(ev.file_path.replace("\\", "/"))
            continue
        raw_algo = ev.raw_metadata.get("algorithm") or ev.raw_match
        canonical_name = normalize_algorithm(raw_algo)
        if canonical_name is None:
            continue
        key_size = extract_key_size(ev.raw_match, ev.context_lines)
        canonical_str = f"{canonical_name}:{key_size}" if key_size else canonical_name
        assets.setdefault(canonical_str, set()).add(ev.file_path.replace("\\", "/"))

    return findings, assets


@pytest.fixture(scope="module")
def expected():
    with open(os.path.join(FIXTURES_DIR, "EXPECTED_FINDINGS.json"), encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture(scope="module")
def scan_result():
    return _scan_fixtures()


def test_recall_every_expected_algorithm_is_found(expected, scan_result):
    _findings, assets = scan_result
    missing = [e["canonical"] for e in expected["expected_assets"] if e["canonical"] not in assets]
    assert not missing, f"Ground truth algorithms not detected (recall failure): {missing}"


def test_recall_every_expected_dependency_is_found(expected, scan_result):
    _findings, assets = scan_result
    missing = [d for d in expected["expected_deps"] if d not in assets]
    assert not missing, f"Ground truth dependencies not detected: {missing}"


def test_negative_cases_produce_no_false_positives(expected, scan_result):
    """
    Checks that each negative case's own FILE isn't among the evidence files
    for the algorithm it must not trigger — not just "does that canonical
    asset exist anywhere in the corpus" (vulnerable.py legitimately produces
    real RSA/MD5 assets; a same-named false positive from mixed.py's
    docstring would hide inside that real asset's evidence-file set instead
    of creating a separately-named one).
    """
    _findings, assets = scan_result
    violations = []
    for case in expected["negative_cases"]:
        case_file = case["file"]
        for bad_canonical in case["must_not_appear_as"]:
            files_for_asset = assets.get(bad_canonical, set())
            if case_file in files_for_asset:
                violations.append(
                    f"{case['description']!r} in {case_file} incorrectly contributed evidence to asset {bad_canonical!r}"
                )
    assert not violations, "False positives on negative/edge cases:\n" + "\n".join(violations)


def test_precision_recall_meet_thresholds(expected, scan_result):
    """
    TP = expected assets that were found. FP = detected assets that aren't in
    expected_assets/expected_deps at all (i.e. genuinely unexplained noise).
    FN = expected assets that were missed.
    """
    _findings, assets = scan_result
    expected_canonicals = {e["canonical"] for e in expected["expected_assets"]}
    expected_dep_canonicals = set(expected["expected_deps"])
    known = expected_canonicals | expected_dep_canonicals

    detected = set(assets.keys())
    tp = detected & known
    fp = detected - known
    fn = known - detected

    precision = len(tp) / (len(tp) + len(fp)) if (tp or fp) else 1.0
    recall = len(tp) / (len(tp) + len(fn)) if (tp or fn) else 1.0

    print(f"\nGround truth: TP={len(tp)} FP={len(fp)} FN={len(fn)} "
          f"precision={precision:.1%} recall={recall:.1%}")
    if fp:
        print(f"  Unexplained assets (FP): {sorted(fp)}")
    if fn:
        print(f"  Missed assets (FN): {sorted(fn)}")

    assert precision >= expected["min_precision"], f"Precision {precision:.1%} below {expected['min_precision']:.0%}"
    assert recall >= expected["min_recall"], f"Recall {recall:.1%} below {expected['min_recall']:.0%}"


def test_known_gaps_are_still_gaps(expected, scan_result):
    """
    Sanity check on the ground truth file itself: if the tls.Config gap ever
    gets closed by a future scanner change, this test starts failing loudly
    instead of the known_gaps note silently going stale.
    """
    _findings, assets = scan_result
    # The tls.Config cipher suite in go/certificates.go should still be invisible.
    tls_related = {k for k in assets if "TLS" in k.upper()}
    assert not tls_related, (
        f"crypto/tls detection now works ({tls_related}) — update "
        f"EXPECTED_FINDINGS.json's known_gaps and add a real assertion for it."
    )
