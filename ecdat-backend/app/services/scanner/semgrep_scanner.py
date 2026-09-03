import subprocess
import json
import os
from typing import List, Dict, Any
from app.schemas.evidence import Evidence

import sys

def run_semgrep(target_dir: str) -> Dict[str, Any]:
    """
    Executes semgrep against the target directory using ECDAT's custom crypto rules.
    """
    rules_path = os.path.join(os.path.dirname(__file__), "rules", "crypto_rules.yaml")

    # Get the directory of the current python executable (which is .venv/Scripts on Windows)
    venv_scripts_dir = os.path.dirname(sys.executable)
    semgrep_bin = os.path.join(venv_scripts_dir, "semgrep")

    cmd = [
        semgrep_bin,
        "scan",
        "--config", rules_path,
        "--json",
        "--quiet",
        "--no-git-ignore",
        target_dir
    ]

    try:
        # Note: Semgrep may return a non-zero exit code if it finds vulnerabilities,
        # so we don't set check=True.
        result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")

        if result.returncode != 0 and result.returncode != 1:
            print(f"[Semgrep] Failed with code {result.returncode}. Stderr: {result.stderr}")

        stdout_text = result.stdout.strip()
        if not stdout_text:
            print(f"[Semgrep] No stdout. Stderr: {result.stderr}")
            return {"results": []}

        start_idx = stdout_text.find('{')
        if start_idx != -1:
            json_str = stdout_text[start_idx:]
            return json.loads(json_str)
        else:
            print(f"[Semgrep] No JSON found in output: {stdout_text[:200]}")
            return {"results": []}

    except json.JSONDecodeError as e:
        print(f"[Semgrep] JSON Decode Error: {e} - stdout was: {result.stdout[:200]}")
        return {"results": []}
    except Exception as e:
        print(f"[Semgrep] Execution failed: {e}")
        return {"results": []}


def _read_lines(abs_path: str, start_line: int, end_line: int, context: int = 2):
    """
    Reads the actual matched source (start_line..end_line) plus `context` lines
    of surrounding code, directly from disk.

    Needed because semgrep's own `extra.lines` field returns the literal string
    "requires login" when the CLI isn't authenticated against Semgrep's cloud
    platform (confirmed empirically — see docs/BACKEND_AUDIT_PHASE0-6.md-style
    finding in Phase 7 ground truth testing) — every semgrep-sourced Evidence
    row had raw_match="requires login" instead of real code. Reading the file
    ourselves has no dependency on that gate.
    """
    try:
        with open(abs_path, "r", encoding="utf-8", errors="replace") as f:
            file_lines = f.read().split("\n")
    except Exception:
        return "", ""

    s = max(1, start_line)
    e = max(s, end_line)
    matched = "\n".join(file_lines[s - 1:e])

    ctx_start = max(0, s - 1 - context)
    ctx_end = min(len(file_lines), e + context)
    context_block = "\n".join(file_lines[ctx_start:ctx_end])

    return matched, context_block


def convert_semgrep_to_evidence(semgrep_output: Dict[str, Any], target_dir: str = None) -> List[Evidence]:
    """
    Converts raw Semgrep JSON output into ECDAT Evidence objects.

    `target_dir`: if given, file_path is made relative to it (matching the
    tree-sitter scanner's convention in source_scanner.py — otherwise semgrep
    results carried the full scan-workspace temp path, e.g.
    "C:\\...\\ecdat_scan_xxxx\\auth\\token.go" instead of "auth/token.go",
    which is both ugly in the UI and inconsistent with every other detector).
    """
    evidence_list = []

    for result in semgrep_output.get("results", []):
        rule_id = result.get("check_id", "unknown")
        path = result.get("path", "")
        start_line = result.get("start", {}).get("line", 0)
        end_line = result.get("end", {}).get("line", start_line)

        extra = result.get("extra", {})
        message = extra.get("message", "")
        metadata = dict(extra.get("metadata", {}))
        metadata["semgrep_message"] = message

        raw_match, context_block = _read_lines(path, start_line, end_line)
        if not raw_match:
            # Fall back to whatever semgrep gave us (e.g. "requires login" on
            # an unauthenticated CLI, or a genuinely unreadable file) rather
            # than persisting an empty match.
            raw_match = extra.get("lines", "") or message

        rel_path = path
        if target_dir:
            try:
                rel_path = os.path.relpath(path, target_dir)
            except ValueError:
                pass  # different drive on Windows, etc. — keep the original path

        evidence = Evidence(
            source_type="semgrep",
            file_path=rel_path,
            line_number=start_line,
            raw_match=raw_match,
            context_lines=context_block,
            detector=rule_id,
            confidence=0.95, # Semgrep rules are deterministic pattern matches
            raw_metadata=metadata
        )
        evidence_list.append(evidence)

    return evidence_list
