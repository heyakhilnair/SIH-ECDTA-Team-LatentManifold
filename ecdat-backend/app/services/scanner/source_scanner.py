import tree_sitter_python
import tree_sitter_go
import tree_sitter_javascript
from tree_sitter import Language, Parser
from tree_sitter_language_pack import get_language as get_packed_language
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
    "clojure": {
        # Clojure is Lisp — every form (`(:require ...)`, a function call, a
        # namespace-qualified interop reference) parses as the same node
        # type (list_lit), so there's no real import/call distinction to
        # make structurally. Everything lives in "imports" here and gets
        # matched the same way scan_file() already matches imports for the
        # other languages; api_calls stays empty for this language.
        "imports": [
            # Java interop — the common path for real crypto in Clojure
            "javax.crypto", "java.security.MessageDigest", "java.security.KeyPairGenerator",
            "java.security.KeyPair", "java.security.SecureRandom", "java.security.Signature",
            "javax.crypto.spec", "javax.crypto.Cipher", "javax.crypto.Mac",
            "MessageDigest/getInstance", "Cipher/getInstance", "KeyPairGenerator/getInstance",
            "KeyGenerator/getInstance", "Signature/getInstance", "Mac/getInstance",
            "SecretKeySpec.", "IvParameterSpec.",
            # Popular Clojure crypto libraries (Clojars)
            "buddy.core.hash", "buddy.core.crypto", "buddy.core.keys", "buddy.core.dsa",
            "buddy.sign.jwt", "buddy.sign.crypto", "buddy.hashers",
            "caesium.crypto", "crypto-random", "crypto-password", "crypto-equality",
            # Quoted algorithm/transformation strings, as passed to the interop calls above
            '"AES/', '"DES/', '"RSA/', '"MD5"', '"SHA1"', '"SHA-1"', '"SHA-256"', '"SHA256"', '"SHA-512"',
        ],
        "api_calls": [],
    },
    "c": {
        "imports": [
            # OpenSSL
            "openssl/aes.h", "openssl/des.h", "openssl/sha.h", "openssl/sha256.h",
            "openssl/md5.h", "openssl/md2.h", "openssl/rsa.h", "openssl/dsa.h",
            "openssl/ec.h", "openssl/evp.h", "openssl/hmac.h", "openssl/rand.h",
            "openssl/blowfish.h", "openssl/rc4.h",
            # mbedTLS
            "mbedtls/aes.h", "mbedtls/des.h", "mbedtls/sha1.h", "mbedtls/sha256.h",
            "mbedtls/md5.h", "mbedtls/rsa.h", "mbedtls/ecdsa.h",
            # libsodium / platform crypto
            "sodium.h", "sodium/crypto_", "wincrypt.h",
            # Local headers named after the algorithm — covers self-contained
            # (no external library) implementations like bradconte/crypto-algorithms
            '"aes.h"', '"des.h"', '"sha1.h"', '"sha256.h"', '"md5.h"', '"md2.h"',
            '"blowfish.h"', '"arcfour.h"',
        ],
        "api_calls": [
            # OpenSSL's actual symbol names double as the naming convention a
            # lot of standalone/educational C crypto code copies (lowercase
            # variants below), so one pattern list covers both.
            "AES_encrypt", "AES_decrypt", "AES_set_encrypt_key", "AES_set_decrypt_key",
            "aes_encrypt", "aes_decrypt", "aes_key_setup",
            "DES_set_key", "DES_ecb_encrypt", "DES_encrypt", "des_key_setup", "des_crypt",
            "SHA1_Init", "SHA1_Update", "SHA1_Final", "sha1_init", "sha1_update", "sha1_final",
            "SHA256_Init", "SHA256_Update", "SHA256_Final", "sha256_init", "sha256_update", "sha256_final",
            "MD5_Init", "MD5_Update", "MD5_Final", "md5_init", "md5_update", "md5_final",
            "MD2_Init", "md2_init",
            "RSA_new", "RSA_generate_key", "RSA_public_encrypt", "RSA_private_decrypt",
            "EVP_EncryptInit", "EVP_DecryptInit", "EVP_CipherInit",
            "HMAC_Init", "HMAC_Update",
            "BF_set_key", "BF_encrypt", "blowfish_key_setup", "blowfish_encrypt",
            "crypto_secretbox_easy", "crypto_box_easy", "crypto_sign", "crypto_generichash",
        ],
    },
}

LANGUAGES = {
    "python": Language(tree_sitter_python.language()),
    "go": Language(tree_sitter_go.language()),
    "javascript": Language(tree_sitter_javascript.language()),
    "clojure": get_packed_language("clojure"),
    "c": get_packed_language("c"),
    # Plain tree-sitter-javascript can't parse TypeScript-only syntax (type
    # casts, generics, "as"/"satisfies", ...) — hitting it forces the parser
    # into error recovery, which can misattribute huge, unrelated chunks of
    # the file into a single bogus node (found live: a `const x = {...huge
    # object...}` got parsed as part of a giant fake "call_expression",
    # which then matched crypto patterns purely because the object's *values*
    # happened to contain algorithm names as demo/mock strings, in a repo
    # file that isn't calling any crypto API at all). Real TS/TSX grammars
    # fix this at the source.
    "typescript": get_packed_language("typescript"),
    "tsx": get_packed_language("tsx"),
}

# typescript/tsx are parsed with their own grammars but share the exact same
# node shapes (call_expression, import_statement, ...) and API surface as
# javascript, so they reuse its CRYPTO_PATTERNS and its "javascript"-keyed
# branches in extract_imports/extract_function_calls below.
PATTERN_LANGUAGE_ALIAS = {"typescript": "javascript", "tsx": "javascript"}

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
    elif ext in [".js", ".jsx"]:
        return "javascript"
    elif ext == ".ts":
        return "typescript"
    elif ext == ".tsx":
        return "tsx"
    elif ext in [".clj", ".cljs", ".cljc"]:
        return "clojure"
    elif ext in [".c", ".h"]:
        return "c"
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
        elif language in ("javascript", "typescript", "tsx") and node.type in ["import_statement", "call_expression"]:
            text = node.text.decode('utf8')
            # Check the CALLEE only ("require"), not the whole call text — a
            # call like `log(["...require('crypto')...")` would otherwise
            # match just because that substring appears inside a string
            # argument, not because it's an actual require() call. Same class
            # of bug fixed below in extract_function_calls.
            callee = node.children[0].text.decode('utf8') if node.type == "call_expression" and node.children else ""
            if node.type == "import_statement" or (node.type == "call_expression" and callee == "require"):
                imports.append({
                    "name": text,
                    "line": node.start_point[0] + 1,
                    "text": text
                })
        elif language == "c" and node.type == "preproc_include":
            text = node.text.decode('utf8')
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
            # Match against the callee (e.g. "crypto.createHash") plus only
            # its DIRECT string-literal arguments (e.g. 'md5' in
            # createHash('md5')) — not the full call text, which for a call
            # with a complex argument (an array, an arrow function, ...) can
            # contain arbitrarily nested string literals having nothing to do
            # with what's actually being called. Matching the whole text
            # meant a call whose arguments merely *mentioned* a crypto
            # keyword several levels deep got flagged as if it were a real
            # crypto call. Found live: this project's own marketing page has
            # a fake "simulated scan log" array —
            # `setAstLogs(prev => [..., "crypto.createHash('md5')", ...])`
            # for a UI animation — and the outer call (setAstLogs) matched
            # because that substring appeared two levels down inside an
            # arrow-function argument, not because setAstLogs has anything to
            # do with cryptography. A direct argument like createHash('md5')
            # is still caught since 'md5' sits immediately inside the
            # arguments list, not nested inside another expression.
            callee = node.children[0].text.decode('utf8') if node.children else node.text.decode('utf8')
            args_node = next((c for c in node.children if c.type in ("arguments", "argument_list")), None)
            direct_string_args = [
                c.text.decode('utf8') for c in (args_node.children if args_node else [])
                if c.type in ("string", "template_string", "interpreted_string_literal", "raw_string_literal")
            ]
            # Rebuilt as "callee(arg1, arg2)" — matches how existing
            # CRYPTO_PATTERNS entries are written (e.g. "createHash('md5')").
            match_text = f"{callee}({', '.join(direct_string_args)})"
            calls.append({
                "name": match_text,
                "line": node.start_point[0] + 1,
                "text": node.text.decode('utf8'),
                "args": []
            })
        elif language == "c" and node.type == "function_definition":
            # A self-contained crypto implementation (no external library —
            # e.g. bradconte/crypto-algorithms) never *calls* AES/SHA1/etc.,
            # it *defines* aes_encrypt/sha1_init/... — that definition itself
            # is the finding. function_declarator's first identifier child
            # is the function name; only check that, not the whole body
            # (which would re-match every call inside it too).
            declarator = next((c for c in node.children if c.type == "function_declarator"), None)
            name_node = next((c for c in (declarator.children if declarator else []) if c.type == "identifier"), None)
            if name_node:
                calls.append({
                    "name": name_node.text.decode('utf8'),
                    "line": node.start_point[0] + 1,
                    "text": f"{name_node.text.decode('utf8')}(...) {{ ... }}",  # signature only, never the function body
                    "args": []
                })
        for child in node.children:
            walk(child)

    walk(tree.root_node)
    return calls

def _extract_clojure_matches(tree, patterns: list[str]) -> list[dict]:
    """
    Clojure is Lisp — every form is the same node type (list_lit), so a real
    crypto call like `(MessageDigest/getInstance "SHA1")` sits inside
    `(defn ...)`, which sits inside whatever encloses that. Every one of
    those ancestor forms' `.text` also contains the matching substring, so a
    naive walk would report the same usage once per enclosing form. Walking
    children first and only keeping a match when nothing below it already
    matched keeps just the innermost (most specific) node per real usage.
    """
    matches = []

    def walk(node) -> bool:
        matched_below = False
        for child in node.children:
            if walk(child):
                matched_below = True
        if node.type == "list_lit" and not matched_below:
            text = node.text.decode('utf8')
            if any(p in text for p in patterns):
                matches.append({"name": text, "line": node.start_point[0] + 1, "text": text})
                return True
        return matched_below

    walk(tree.root_node)
    return matches

def is_crypto_import(imp_str: str, language: str) -> bool:
    patterns = CRYPTO_PATTERNS.get(PATTERN_LANGUAGE_ALIAS.get(language, language), {}).get("imports", [])
    for p in patterns:
        if p in imp_str:
            return True
    return False

def is_crypto_call(call_str: str, language: str) -> bool:
    patterns = CRYPTO_PATTERNS.get(PATTERN_LANGUAGE_ALIAS.get(language, language), {}).get("api_calls", [])
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

    if language == "clojure":
        # Lisp has no import/call distinction to make structurally (see
        # _extract_clojure_matches) — handled entirely separately from the
        # shared extract_imports/extract_function_calls walkers below, which
        # are written around python/go/js's very different node shapes.
        patterns = CRYPTO_PATTERNS.get("clojure", {}).get("imports", [])
        for m in _extract_clojure_matches(tree, patterns):
            findings.append(Evidence(
                source_type='source_code',
                file_path=file_path,
                line_number=m['line'],
                raw_match=m['text'],
                context_lines=get_context(content, m['line']),
                detector='treesitter_call',
                confidence=0.90,
                raw_metadata={'language': language, 'node_type': 'call', 'function_name': m['name']}
            ))
        return findings

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
