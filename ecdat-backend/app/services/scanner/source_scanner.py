import tree_sitter_python
import tree_sitter_go
import tree_sitter_javascript
from tree_sitter import Language, Parser
from app.schemas.evidence import Evidence
import os

CRYPTO_PATTERNS = {
    "python": {
        "imports": [
            "from cryptography", "import cryptography",
            "from Crypto", "import Crypto", 
            "import hashlib", "from hashlib",
            "import ssl", "from ssl",
            "import rsa", "from rsa",
            "import hmac", "from hmac",
        ],
        "api_calls": [
            "rsa.generate_private_key", "rsa.encrypt", "rsa.decrypt",
            "ec.generate_private_key", "ec.SECP256R1", "ec.SECP384R1",
            "hashes.SHA1", "hashes.SHA256", "hashes.MD5",
            "hashlib.sha1", "hashlib.md5", "hashlib.sha256",
            "padding.PKCS1v15", "padding.OAEP",
            "algorithms.AES", "algorithms.TripleDES", "algorithms.DES",
            "ssl.SSLContext", "ssl.PROTOCOL_TLS",
            "RSA.generate", "DSA.generate", "ECC.generate",
        ],
    },
    "go": {
        "imports": [
            '"crypto/rsa"', '"crypto/ecdsa"', '"crypto/elliptic"',
            '"crypto/sha1"', '"crypto/sha256"', '"crypto/md5"',
            '"crypto/aes"', '"crypto/des"', '"crypto/hmac"',
            '"golang.org/x/crypto"',
        ],
        "api_calls": [
            "rsa.GenerateKey", "rsa.EncryptPKCS1v15", "rsa.SignPKCS1v15",
            "ecdsa.GenerateKey", "elliptic.P256", "elliptic.P384",
            "sha1.New", "sha256.New", "md5.New",
            "aes.NewCipher", "des.NewCipher",
        ],
    },
    "javascript": {
        "imports": [
            "require('crypto')", "require(\"crypto\")",
            "from 'crypto'", 'from "crypto"',
            "jose", "jsonwebtoken", "bcrypt", "node-forge",
        ],
        "api_calls": [
            "createHash('md5')", 'createHash("md5")',
            "createHash('sha1')", "createCipheriv('des",
            "crypto.subtle.generateKey", "crypto.subtle.importKey",
            "RSA-OAEP", "RSA-PSS", "ECDSA", "ECDH",
        ],
    },
}

LANGUAGES = {
    "python": Language(tree_sitter_python.language()),
    "go": Language(tree_sitter_go.language()),
    "javascript": Language(tree_sitter_javascript.language()),
}

def get_parser(language: str) -> Parser:
    parser = Parser()
    parser.language = LANGUAGES[language]
    return parser

def detect_language(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".py":
        return "python"
    elif ext == ".go":
        return "go"
    elif ext in [".js", ".ts", ".tsx", ".jsx"]:
        return "javascript"
    return None

def extract_imports(tree, language: str) -> list[dict]:
    imports = []
    
    def walk(node):
        if language == "python" and node.type in ["import_statement", "import_from_statement"]:
            text = node.text.decode('utf8')
            imports.append({
                "name": text,
                "line": node.start_point[0] + 1,
                "text": text
            })
        elif language == "go" and node.type == "import_spec":
            text = node.text.decode('utf8')
            imports.append({
                "name": text,
                "line": node.start_point[0] + 1,
                "text": text
            })
        elif language == "javascript" and node.type in ["import_statement", "call_expression"]:
            text = node.text.decode('utf8')
            if node.type == "import_statement" or (node.type == "call_expression" and "require" in text):
                imports.append({
                    "name": text,
                    "line": node.start_point[0] + 1,
                    "text": text
                })
        for child in node.children:
            walk(child)
            
    walk(tree.root_node)
    return imports

def extract_function_calls(tree, language: str) -> list[dict]:
    calls = []
    
    def walk(node):
        if node.type in ["call_expression", "call"]:
            calls.append({
                "name": node.text.decode('utf8'),
                "line": node.start_point[0] + 1,
                "text": node.text.decode('utf8'),
                "args": []
            })
        for child in node.children:
            walk(child)
            
    walk(tree.root_node)
    return calls

def is_crypto_import(imp_str: str, language: str) -> bool:
    patterns = CRYPTO_PATTERNS.get(language, {}).get("imports", [])
    for p in patterns:
        if p in imp_str:
            return True
    return False

def is_crypto_call(call_str: str, language: str) -> bool:
    patterns = CRYPTO_PATTERNS.get(language, {}).get("api_calls", [])
    for p in patterns:
        if p in call_str:
            return True
    return False

def get_context(content: str, line_num: int, context_lines=2) -> str:
    lines = content.split('\n')
    start = max(0, line_num - 1 - context_lines)
    end = min(len(lines), line_num + context_lines)
    return '\n'.join(lines[start:end])

def scan_file(file_path: str, content: str, language: str) -> list[Evidence]:
    parser = get_parser(language)
    tree = parser.parse(bytes(content, 'utf8'))
    
    findings = []
    
    imports = extract_imports(tree, language)
    for imp in imports:
        if is_crypto_import(imp['name'], language):
            findings.append(Evidence(
                source_type='source_code',
                file_path=file_path,
                line_number=imp['line'],
                raw_match=imp['text'],
                context_lines=get_context(content, imp['line']),
                detector='treesitter_import',
                confidence=0.95,
                raw_metadata={
                    'language': language,
                    'node_type': 'import',
                    'import_name': imp['name'],
                }
            ))
    
    calls = extract_function_calls(tree, language)
    for call in calls:
        if is_crypto_call(call['name'], language):
            findings.append(Evidence(
                source_type='source_code',
                file_path=file_path,
                line_number=call['line'],
                raw_match=call['text'],
                context_lines=get_context(content, call['line']),
                detector='treesitter_call',
                confidence=0.90,
                raw_metadata={
                    'language': language,
                    'node_type': 'call',
                    'function_name': call['name'],
                    'arguments': call.get('args', []),
                }
            ))
    
    return findings
