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

def convert_semgrep_to_evidence(semgrep_output: Dict[str, Any]) -> List[Evidence]:
    """
    Converts raw Semgrep JSON output into ECDAT Evidence objects.
    """
    evidence_list = []
    
    for result in semgrep_output.get("results", []):
        rule_id = result.get("check_id", "unknown")
        path = result.get("path", "")
        start_line = result.get("start", {}).get("line", 0)
        
        extra = result.get("extra", {})
        lines = extra.get("lines", "").strip()
        message = extra.get("message", "")
        metadata = extra.get("metadata", {})
        
        evidence = Evidence(
            source_type="semgrep",
            file_path=path,
            line_number=start_line,
            raw_match=lines,
            context_lines=message, # Storing the semgrep message here for context
            detector=rule_id,
            confidence=0.95, # Semgrep rules are deterministic pattern matches
            raw_metadata=metadata
        )
        evidence_list.append(evidence)
        
    return evidence_list
