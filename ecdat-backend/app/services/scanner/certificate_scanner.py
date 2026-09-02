import ssl
import socket
from cryptography import x509
from cryptography.hazmat.backends import default_backend
from app.schemas.evidence import Evidence
import os

def parse_x509_certificate(cert_data: bytes, source: str, is_file: bool = False) -> list[Evidence]:
    findings = []
    try:
        cert = x509.load_pem_x509_certificate(cert_data, default_backend())
        
        signature_hash_algorithm = cert.signature_hash_algorithm.name if cert.signature_hash_algorithm else "unknown"
        public_key = cert.public_key()
        
        key_type = public_key.__class__.__name__
        key_size = public_key.key_size if hasattr(public_key, 'key_size') else 0
        
        # Check for utc property (cryptography 42+) vs naive datetime (older)
        not_before = getattr(cert, 'not_valid_before_utc', cert.not_valid_before).isoformat()
        not_after = getattr(cert, 'not_valid_after_utc', cert.not_valid_after).isoformat()
        
        findings.append(Evidence(
            source_type='certificate',
            file_path=source,
            line_number=0,
            raw_match=f"{key_type}-{key_size} signed with {signature_hash_algorithm}",
            context_lines=f"Subject: {cert.subject.rfc4514_string()}\nIssuer: {cert.issuer.rfc4514_string()}",
            detector='x509_cert',
            confidence=1.0,
            raw_metadata={
                'signature_algorithm': signature_hash_algorithm,
                'key_type': key_type,
                'key_size': key_size,
                'subject': cert.subject.rfc4514_string(),
                'issuer': cert.issuer.rfc4514_string(),
                'not_valid_before': not_before,
                'not_valid_after': not_after,
            }
        ))
    except Exception as e:
        print(f"[CertificateScanner] Error parsing certificate from {source}: {e}")
    return findings

def scan_certificate_url(url: str) -> list[Evidence]:
    import urllib.parse
    parsed = urllib.parse.urlparse(url)
    hostname = parsed.hostname
    port = parsed.port or 443
    
    if not hostname:
        return []
        
    try:
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        
        with socket.create_connection((hostname, port), timeout=5) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                der_cert = ssock.getpeercert(binary_form=True)
                pem_cert = ssl.DER_cert_to_PEM_cert(der_cert)
                return parse_x509_certificate(pem_cert.encode('utf-8'), url, is_file=False)
    except Exception as e:
        print(f"[CertificateScanner] Error connecting to {url}: {e}")
        return []

def scan_cert_file(file_path: str, content: bytes) -> list[Evidence]:
    return parse_x509_certificate(content, file_path, is_file=True)

def find_and_scan_certificates(repo_dir: str) -> list[Evidence]:
    findings = []
    for root, _, files in os.walk(repo_dir):
        for file in files:
            if file.endswith('.pem') or file.endswith('.crt') or file.endswith('.cer'):
                path = os.path.join(root, file)
                rel_path = os.path.relpath(path, repo_dir)
                try:
                    with open(path, 'rb') as f:
                        content = f.read()
                    findings.extend(scan_cert_file(rel_path, content))
                except Exception as e:
                    print(f"[CertificateScanner] Could not read {path}: {e}")
    return findings
