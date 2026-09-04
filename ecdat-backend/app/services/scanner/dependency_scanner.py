import os
import json
import re
from app.schemas.evidence import Evidence

CRYPTO_PACKAGES = {
    "npm": {
        "jsonwebtoken": "JWT processing",
        "crypto-js": "Cryptographic operations",
        "bcrypt": "Password hashing",
        "jose": "JSON Object Signing and Encryption",
        "node-forge": "Cryptographic tools"
    },
    "pip": {
        "cryptography": "Cryptographic primitives",
        "pycryptodome": "Cryptographic library",
        "pyOpenSSL": "OpenSSL bindings (TLS/X.509)",
        "PyJWT": "JSON Web Token implementation",
        "bcrypt": "Password hashing",
        "passlib": "Password hashing"
    },
    "go": {
        "golang.org/x/crypto": "Go supplementary cryptography libraries",
        "github.com/golang-jwt/jwt": "JWT implementation",
        "crypto/rsa": "RSA cryptography",
        "crypto/ecdsa": "ECDSA cryptography"
    },
    "clojure": {
        "buddy/buddy-core": "Cryptographic primitives",
        "buddy/buddy-sign": "JWT/message signing",
        "buddy/buddy-hashers": "Password hashing",
        "caesium/caesium": "libsodium bindings",
        "weavejester/crypto-random": "Cryptographically secure random generation",
        "weavejester/crypto-password": "Password hashing",
        "weavejester/crypto-equality": "Constant-time comparison",
    },
}

def parse_npm_manifest(file_path: str, content: str) -> list[Evidence]:
    findings = []
    try:
        data = json.loads(content)
        deps = {**data.get('dependencies', {}), **data.get('devDependencies', {})}
        for pkg, version in deps.items():
            if pkg in CRYPTO_PACKAGES["npm"]:
                findings.append(Evidence(
                    source_type='dependency',
                    file_path=file_path,
                    line_number=0,
                    raw_match=f"{pkg}@{version}",
                    context_lines=f"Dependency in package.json: {pkg} {version}",
                    detector='npm_manifest',
                    confidence=1.0,
                    raw_metadata={'package': pkg, 'version': version, 'purpose': CRYPTO_PACKAGES["npm"][pkg]}
                ))
    except Exception as e:
        print(f"[DependencyScanner] Error parsing npm manifest {file_path}: {e}")
    return findings

def parse_pip_manifest(file_path: str, content: str) -> list[Evidence]:
    findings = []
    lines = content.split('\n')
    for i, line in enumerate(lines):
        line_clean = line.strip()
        if not line_clean or line_clean.startswith('#'): continue
        
        match = re.split(r'[=><!~]+', line_clean)
        pkg = match[0].strip()
        
        if pkg in CRYPTO_PACKAGES["pip"]:
            findings.append(Evidence(
                source_type='dependency',
                file_path=file_path,
                line_number=i + 1,
                raw_match=line_clean,
                context_lines=line_clean,
                detector='pip_manifest',
                confidence=1.0,
                raw_metadata={'package': pkg, 'purpose': CRYPTO_PACKAGES["pip"][pkg]}
            ))
    return findings

def parse_go_manifest(file_path: str, content: str) -> list[Evidence]:
    """
    go.mod dependencies appear in two forms:
        require golang.org/x/crypto v0.17.0          (single-line)
        require (
            golang.org/x/crypto v0.17.0              (block form, no leading "require")
        )
    The old `parts[0] != "require"` check only handled the block form — it
    silently skipped every single-line `require`, which is the common case for
    a go.mod with one or two dependencies. Found while building Phase 7 ground
    truth fixtures (a go.mod fixture with a single `require` line produced a
    false negative). Now strips a leading "require " token instead of
    rejecting the whole line.
    """
    findings = []
    lines = content.split('\n')
    for i, line in enumerate(lines):
        line_clean = line.strip()
        if not line_clean or line_clean.startswith('//') or line_clean.startswith('module ') or line_clean.startswith('go '):
            continue
        if line_clean in ('require (', ')'):
            continue
        if line_clean.startswith('require '):
            line_clean = line_clean[len('require '):].strip()

        parts = line_clean.split()
        if len(parts) >= 2:
            pkg = parts[0]
            if pkg in CRYPTO_PACKAGES["go"]:
                findings.append(Evidence(
                    source_type='dependency',
                    file_path=file_path,
                    line_number=i + 1,
                    raw_match=line_clean,
                    context_lines=line_clean,
                    detector='go_manifest',
                    confidence=1.0,
                    raw_metadata={'package': pkg, 'purpose': CRYPTO_PACKAGES["go"][pkg]}
                ))
    return findings

def parse_clj_manifest(file_path: str, content: str) -> list[Evidence]:
    """
    Leiningen `project.clj` dependency vectors: `[group/artifact "version"]`,
    normally inside a `:dependencies [...]` form. Regex over the whole file
    rather than line-by-line since a dependency vector is sometimes written
    across a line boundary; the `[sym "ver"]` shape itself is specific
    enough not to false-positive elsewhere in a typical project.clj.
    """
    findings = []
    for m in re.finditer(r'\[([a-zA-Z0-9_.\-]+(?:/[a-zA-Z0-9_.\-]+)?)\s+"([^"]+)"\]', content):
        pkg, version = m.group(1), m.group(2)
        if pkg in CRYPTO_PACKAGES["clojure"]:
            line_number = content.count('\n', 0, m.start()) + 1
            findings.append(Evidence(
                source_type='dependency',
                file_path=file_path,
                line_number=line_number,
                raw_match=m.group(0),
                context_lines=f"Dependency in project.clj: {pkg} {version}",
                detector='clj_manifest',
                confidence=1.0,
                raw_metadata={'package': pkg, 'version': version, 'purpose': CRYPTO_PACKAGES["clojure"][pkg]}
            ))
    return findings

def parse_deps_edn(file_path: str, content: str) -> list[Evidence]:
    """deps.edn (Clojure CLI/tools.deps): `group/artifact {:mvn/version "1.0.0"}`."""
    findings = []
    for m in re.finditer(r'([a-zA-Z0-9_.\-]+/[a-zA-Z0-9_.\-]+)\s*\{\s*:mvn/version\s*"([^"]+)"', content):
        pkg, version = m.group(1), m.group(2)
        if pkg in CRYPTO_PACKAGES["clojure"]:
            line_number = content.count('\n', 0, m.start()) + 1
            findings.append(Evidence(
                source_type='dependency',
                file_path=file_path,
                line_number=line_number,
                raw_match=m.group(0),
                context_lines=f"Dependency in deps.edn: {pkg} {version}",
                detector='deps_edn',
                confidence=1.0,
                raw_metadata={'package': pkg, 'version': version, 'purpose': CRYPTO_PACKAGES["clojure"][pkg]}
            ))
    return findings

def find_and_scan_manifests(repo_dir: str) -> list[Evidence]:
    findings = []
    for root, dirs, files in os.walk(repo_dir):
        if 'node_modules' in dirs: dirs.remove('node_modules')
        if 'venv' in dirs: dirs.remove('venv')
        if '.git' in dirs: dirs.remove('.git')
        
        for file in files:
            if file not in ['package.json', 'requirements.txt', 'go.mod', 'project.clj', 'deps.edn']:
                continue

            path = os.path.join(root, file)
            rel_path = os.path.relpath(path, repo_dir)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()

                if file == 'package.json':
                    findings.extend(parse_npm_manifest(rel_path, content))
                elif file == 'requirements.txt':
                    findings.extend(parse_pip_manifest(rel_path, content))
                elif file == 'go.mod':
                    findings.extend(parse_go_manifest(rel_path, content))
                elif file == 'project.clj':
                    findings.extend(parse_clj_manifest(rel_path, content))
                elif file == 'deps.edn':
                    findings.extend(parse_deps_edn(rel_path, content))
            except Exception as e:
                print(f"[DependencyScanner] Could not read {path}: {e}")
    return findings
