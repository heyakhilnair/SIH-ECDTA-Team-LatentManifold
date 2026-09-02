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
        "PyJWT": "JSON Web Token implementation",
        "bcrypt": "Password hashing",
        "passlib": "Password hashing"
    },
    "go": {
        "golang.org/x/crypto": "Go supplementary cryptography libraries",
        "github.com/golang-jwt/jwt": "JWT implementation",
        "crypto/rsa": "RSA cryptography",
        "crypto/ecdsa": "ECDSA cryptography"
    }
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
    findings = []
    lines = content.split('\n')
    for i, line in enumerate(lines):
        line_clean = line.strip()
        if not line_clean or line_clean.startswith('//') or line_clean.startswith('module ') or line_clean.startswith('go '): 
            continue
            
        parts = line_clean.split()
        if len(parts) >= 2 and parts[0] != "require":
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

def find_and_scan_manifests(repo_dir: str) -> list[Evidence]:
    findings = []
    for root, dirs, files in os.walk(repo_dir):
        if 'node_modules' in dirs: dirs.remove('node_modules')
        if 'venv' in dirs: dirs.remove('venv')
        if '.git' in dirs: dirs.remove('.git')
        
        for file in files:
            if file not in ['package.json', 'requirements.txt', 'go.mod']:
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
            except Exception as e:
                print(f"[DependencyScanner] Could not read {path}: {e}")
    return findings
