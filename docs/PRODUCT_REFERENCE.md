# ECDAT — COMPLETE PRODUCT REFERENCE DOCUMENT
**Version:** 2.0 — Built from actual 22-phase PDF content  
**Team:** LatentManifold / SIH2026-143 / SIH26164 / NTRO  
**Updated:** 2026-09-01

> This document is built from actual text extracted from all 22 phase PDFs.  
> Every section tagged `[Ph.N]` = sourced from Phase N document.  
> This is the authoritative reference for all agents and team members.

---

## TABLE OF CONTENTS
1. [What ECDAT Is](#1-what-ecdat-is)
2. [The 22 Phases — Complete Summary](#2-the-22-phases--complete-summary)
3. [Complete Technology Stack](#3-complete-technology-stack)
4. [Full Data Model](#4-full-data-model)
5. [Complete API Surface](#5-complete-api-surface)
6. [UI Screen Inventory & Interaction Flows](#6-ui-screen-inventory--interaction-flows)
7. [User Flows — Every Button Documented](#7-user-flows--every-button-documented)
8. [Dashboard Architecture (from Phase 17)](#8-dashboard-architecture-from-phase-17)
9. [Five Core Engines (from Phase 22)](#9-five-core-engines-from-phase-22)
10. [SIH Demo Strategy (from Phase 22)](#10-sih-demo-strategy-from-phase-22)
11. [Security Architecture](#11-security-architecture)
12. [What To Build vs What Not To Build](#12-what-to-build-vs-what-not-to-build)

---

## 1. WHAT ECDAT IS

### One Sentence Definition `[Ph.22]`
> "ECDAT discovers cryptography across enterprise software and infrastructure, converts it into a cryptographic bill of materials, maps its business dependencies, calculates quantum migration risk, recommends suitable PQC or hybrid alternatives, and verifies remediation through rescanning."

### Core Insight `[Ph.22]`
> "Cryptographic migration is an inventory and dependency problem before it is an algorithm-selection problem."

You cannot simply say `RSA → PQC` because you first need to know:
- Where is RSA?
- Why is it there?
- Who depends on it?
- What data does it protect?
- What library implements it?
- What hardware supports it?
- What applications depend on it?
- What breaks if it changes?

### The Core Workflow `[Ph.22]`
```
DISCOVER → IDENTIFY → NORMALIZE → INVENTORY → MAP → ASSESS → RECOMMEND → MIGRATE → VERIFY
```

### Five Core Engines `[Ph.22]`
```
1. CRYPTOGRAPHIC DISCOVERY ENGINE
        ↓
2. CBOM + KNOWLEDGE GRAPH ENGINE
        ↓
3. QUANTUM RISK ENGINE
        ↓
4. PQC RECOMMENDATION ENGINE
        ↓
5. MIGRATION VERIFICATION ENGINE
        
[AI ANALYST sits across all five as an analyst interface]
```

---

## 2. THE 22 PHASES — COMPLETE SUMMARY

### Phase 1 — Foundations of Cryptography `[Ph.1]`
**What it covers:**
- Cryptography taxonomy: symmetric, asymmetric, hash functions, MACs, digital signatures
- Key algorithms: AES (128/192/256), DES (insecure), 3DES (deprecated), ChaCha20, RSA, ECC (P-256, P-384, Curve25519), SHA-1 (broken), SHA-256, SHA-3, MD5 (broken)
- Key management lifecycle: Generate → Store → Distribute → Use → Rotate → Archive → Destroy
- PKI: Root CA, Intermediate CA, End-Entity Certificates, CRLs, OCSP
- Cryptographic libraries: OpenSSL, BoringSSL, LibreSSL, libsodium, Bouncy Castle, JCA, Microsoft CNG
- Cryptography locations in enterprise: source code, configs, CI/CD, Docker, K8s, APIs, DBs, backups, HSM, KMS, VPN, firmware, mobile

**What ECDAT must do from this phase:**
- Maintain a complete algorithm taxonomy (the canonical algorithm registry)
- Know which libraries contain cryptographic implementations
- Know all the places in an enterprise where crypto can hide

**Critical ECDAT requirement from this phase:**
- ECDAT must identify: expired certificates, weak signature algorithms, short key lengths, unsupported algorithms

---

### Phase 2 — Quantum Computing & The Quantum Threat `[Ph.2]`
**What it covers:**
- Shor's algorithm: breaks RSA (integer factorization), DH (discrete log), ECC/ECDSA/ECDH (ECDLP)
- Grover's algorithm: quadratic speedup on search → AES-128 effective ~64-bit, AES-256 effective ~128-bit
- Harvest Now, Decrypt Later (HNDL): attackers capture ciphertext today, decrypt when CRQC exists
- Mosca's Inequality: `X + Y > Z` where X = Data Lifetime, Y = Migration Time, Z = Threat Horizon
- CRQC ≠ today's quantum computers: huge engineering gap remains

**Key table from Phase 2 `[Ph.2]`:**
| Algorithm | Classical Threat | Quantum Threat |
|-----------|-----------------|----------------|
| RSA | Factorization | **CRITICAL (Shor)** |
| DH | Discrete log | **CRITICAL (Shor)** |
| ECC/ECDSA | ECDLP | **CRITICAL (Shor)** |
| AES-128 | Brute force | Reduced margin (Grover) |
| AES-256 | Brute force | Stronger margin (Grover) |
| SHA-256 | Classical attacks | Quantum security considerations |
| SHA-3 | Classical attacks | Quantum security considerations |

**Critical ECDAT requirement from this phase:**
- Threat horizon (Z) must be a **configurable parameter**, not a hardcoded year
- Support scenarios: Optimistic / Moderate / Aggressive
- ECDAT must NOT claim "Quantum computers can currently break RSA" — incorrect framing
- Risk depends on: Algorithm + Data Lifetime + Migration Time + Business Criticality

---

### Phase 3 — Post-Quantum Cryptography `[Ph.3]`
**What it covers:**
- PQC runs on **conventional computers** — no quantum hardware needed
- PQC ≠ QKD (Quantum Key Distribution) — ECDAT deals with PQC, not QKD
- NIST PQC standardization: multi-year process, public submissions, multiple rounds

**Three NIST PQC Standards `[Ph.3]`:**
| Standard | Algorithm | Type | Security Levels | Notes |
|----------|-----------|------|-----------------|-------|
| FIPS 203 | ML-KEM (Kyber) | Key Encapsulation Mechanism | 1, 3, 5 | Primary KEM replacement for RSA/ECDH |
| FIPS 204 | ML-DSA (Dilithium) | Digital Signature | 2, 3, 5 | Primary signature replacement for RSA/ECDSA |
| FIPS 205 | SLH-DSA (SPHINCS+) | Hash-based Signature | 1, 3, 5 | Fallback signature if lattices compromised |

**Algorithm sizes (from Phase 3):**
- ML-KEM-768: Public key 1184B, ciphertext 1088B, shared secret 32B
- ML-DSA-65: Public key 1952B, signature 3309B
- SLH-DSA-128f: Signature 17088B (large — limits use in headers)

**Hybrid migration approach `[Ph.3]`:**
- ML-KEM-768 + X25519 (dual KEM for TLS during transition)
- ML-DSA-65 + ECDSA-P256 (dual signature during transition)
- Hybrid provides classical safety during PQC adoption

**ECDAT requirements from Phase 3:**
- Recommendation engine must consider: latency, key/signature size, protocol compatibility, HSM support, compliance, client interoperability
- Crypto-agility: applications should be designed to swap algorithms without full rewrite

---

### Phase 4 — Enterprise Cryptographic Ecosystem `[Ph.4]`
**What it covers (the complete discovery surface):**
- Source code repositories (Git, SVN, Mercurial)
- Compiled binaries (ELF/PE/Mach-O)
- Container images (Docker layers, OCI images)
- Kubernetes Secrets, ConfigMaps, Ingress TLS
- Cloud KMS (AWS KMS, Azure Key Vault, GCP KMS)
- HSM (Hardware Security Modules)
- TLS termination proxies (nginx, HAProxy, Envoy)
- VPN gateways (IPSec, OpenVPN, WireGuard)
- API gateways (JWT signing, mutual TLS)
- Databases (encrypted columns, connection TLS)
- Identity providers (SAML, OAuth, OIDC)
- CI/CD pipelines (signing keys, artifact verification)
- Firmware and embedded systems

**ECDAT MVP scope from Phase 4:**
- Source code (Tree-sitter + Semgrep) → P0
- Dependencies (manifest parsers) → P0
- Certificates (x509) → P1
- Containers → P2
- Cloud/K8s/HSM/KMS → P3

---

### Phase 5 — Cryptographic Discovery, CBOM & Asset Inventory `[Ph.5]`
**Discovery methods `[Ph.5]`:**
- Regex-based detection (basic pattern matching)
- AST-based detection (Tree-sitter — language-aware, accurate)
- Semantic code analysis (understanding context, not just pattern)
- Dependency analysis (manifest parsers → transitive deps)
- Binary analysis (LIEF, YARA — symbol table, entropy)
- String analysis (hardcoded algorithm names/OIDs)
- Library fingerprinting (known crypto library signatures)
- Certificate parsing (x509 fields)
- TLS discovery (handshake inspection)

**CBOM = Cryptographic Bill of Materials `[Ph.5]`:**
- Inspired by SBOM (Software Bill of Materials)
- CycloneDX format (ECDAT uses CycloneDX v1.6)
- SPDX format (alternative, supported as export)

**What ECDAT must discover `[Ph.5]`:**
```
Algorithms:    RSA, ECDSA, ECDH, DH, AES, 3DES, SHA-1, SHA-2, SHA-3, ChaCha20, ML-KEM, ML-DSA, SLH-DSA
Keys:          Public keys, private key references, symmetric key references, key IDs, key stores, HSM keys
Certificates:  X.509, TLS certs, device certs, code-signing certs, CA certs
Protocols:     TLS, SSH, IPSec, S/MIME, DNSSEC
Libraries:     OpenSSL, BoringSSL, libsodium, Bouncy Castle, JCA, Microsoft CNG
APIs:          Crypto API calls, key management API calls
Configurations: Cipher suite configs, TLS versions, algorithm restrictions
Dependencies:  package.json, requirements.txt, go.mod, pom.xml, Gemfile, Cargo.toml
```

**Evidence vs Asset distinction `[Ph.5]`:**
- Evidence: Raw observation (file, line, match, detector, confidence) — IMMUTABLE
- Asset: Canonical, deduplicated, normalized cryptographic component — derived from evidence
- These must remain separate entities. Never collapse evidence into asset.

**False positives `[Ph.5]`:**
- Must have confidence scoring (0.0 to 1.0)
- AST-based detection has lower FP rate than regex
- Context analysis improves accuracy (test files, commented code)

**Detection confidence levels `[Ph.5]`:**
| Detector | Confidence | Reason |
|----------|------------|--------|
| Tree-sitter import | 0.95 | Language-aware, exact match |
| Tree-sitter API call | 0.90 | Language-aware, context |
| Semgrep rule | 0.85–0.95 | Rule-specific quality |
| Manifest parser | 0.95 | Deterministic parsing |
| x509 parser | 0.99 | Deterministic certificate |
| Regex | 0.60–0.75 | Pattern match, may FP |

**CBOM Generation Pipeline `[Ph.5]`:**
```
Raw Source → Scanner → Evidence → Normalizer → Canonical Asset → CBOM Generator → CycloneDX JSON/XML
```

**Continuous discovery `[Ph.5]`:**
- Incremental scanning (only changed files since last scan)
- Git integration (hook on commits)
- Scheduled scans
- CI/CD pipeline hooks (PR checks)

---

### Phase 6 — Quantum Risk Assessment & Mosca's Method `[Ph.6]`
**Mosca's Inequality `[Ph.2, Ph.6]`:**
```
X + Y > Z
where:
  X = Security Lifetime of Data (years)
  Y = Migration Time (years)  
  Z = Estimated Time Until CRQC (years, configurable)
```

**Risk decision logic:**
```python
if (X + Y) > Z:
    return CRITICAL  # HNDL window is OPEN NOW
elif (Z - (X+Y)) <= 2:
    return HIGH      # Begin migration immediately
elif (Z - (X+Y)) <= 6:
    return MEDIUM    # Active planning required
else:
    return LOW       # Monitor timeline
```

**Risk dimensions (multi-dimensional, not single number) `[Ph.6, Ph.12]`:**
1. Quantum Exposure (Shor/Grover applicability)
2. Classical Security Risk (CVEs, deprecated algorithms)
3. Business Criticality (application tier, data classification)
4. Data Lifetime (X — how long does this data need to stay secret?)
5. Migration Complexity (blast radius, dependency count, protocol constraints)
6. Dependency Centrality (how many applications depend on this algorithm?)
7. Exposure Level (internal-only vs internet-facing)

**Important `[Ph.6]`:** Risk engine must not apply "divide hash security by 2" universally. Hash security under Grover depends on the specific property (preimage vs collision) and must use algorithm-specific knowledge.

---

### Phase 7 — PQC Recommendation Engine `[Ph.7]`
**Recommendation must be constraint-aware `[Ph.7, Ph.13]`:**
- Cannot just say "RSA → ML-DSA"
- Must consider: protocol constraints, performance budget, HSM support, client interoperability, compliance requirements, key/signature sizes

**Algorithm function mapping `[Ph.7]`:**
| Current Function | Replacement Category | Primary Candidate |
|-----------------|---------------------|-------------------|
| Key Encapsulation | ML-KEM (FIPS 203) | ML-KEM-768 |
| Digital Signature | ML-DSA (FIPS 204) | ML-DSA-65 |
| Stateless Backup Signature | SLH-DSA (FIPS 205) | SLH-DSA-128f |
| Hashing (SHA-1/MD5) | SHA-2 or SHA-3 | SHA-256 or SHA3-256 |
| Symmetric (DES/3DES) | AES-GCM | AES-256-GCM |
| Symmetric weak key (AES-128) | Stronger AES | AES-256-GCM |

---

### Phase 8 — AI-Powered Cryptographic Code Analysis `[Ph.8]`
**Evidence-First Principle `[Ph.8]`:**
- AI is NOT the source of cryptographic facts
- AI comes AFTER deterministic scanning
- AI interprets and explains what was already found

**AI roles `[Ph.8]`:**
- Explain why an asset is high priority
- Summarize blast radius in natural language
- Draft migration plan rationale
- Answer analyst questions referencing actual evidence
- Identify patterns across multiple assets
- Generate risk summaries for executive reports

**AI must NOT `[Ph.8]`:**
- Invent cryptographic assets not in the evidence store
- Override risk scores
- Fabricate confidence values
- Access data outside the authorized workspace

**AI architecture required `[Ph.8]`:**
```
Evidence Store → Context Builder → LLM Prompt → Output Validator → Analyst Response
```
Every AI response must include `evidence_citations: [evidence_id]`

---

### Phase 9 — Cryptographic Knowledge Graph `[Ph.9]`
**Graph node types `[Ph.9]`:**
```
Algorithm    — RSA-2048, SHA-1, ML-KEM-768
Library      — OpenSSL 1.1.1, pycryptodome 3.9.8
Application  — Payment Gateway, Identity Service
Container    — docker.io/library/node:18
Service      — API Gateway, Auth Service
Certificate  — CN=example.com (SHA256withRSA)
DataAsset    — Customer PII, Payment Records
Key          — RSA private key reference, HSM key ID
```

**Graph edge types `[Ph.9]`:**
```
(:Application)-[:USES]->(:Library)
(:Library)-[:IMPLEMENTS]->(:Algorithm)
(:Algorithm)-[:PROTECTS]->(:DataAsset)
(:Application)-[:DEPLOYED_AS]->(:Container)
(:Certificate)-[:USES_ALGORITHM]->(:Algorithm)
(:Application)-[:DEPENDS_ON]->(:Application)
(:Key)-[:USES_ALGORITHM]->(:Algorithm)
```

**Blast radius query `[Ph.9]`:**
- "What is affected if RSA is deprecated?"
- Traverse: Algorithm → Libraries using it → Applications using those libraries → Services
- Result: list of affected applications + their business criticality

---

### Phase 10 — Enterprise Scanning & Discovery Fabric `[Ph.10]`
**Scanner Orchestration `[Ph.10]`:**
- Scanner registry: all available scanners
- Job queue: prioritized, distributed
- Source connectors: Git, filesystem, container registry, network endpoint, cloud API
- Scanner plugins: each scanner is an independent, swappable module
- Evidence aggregation: merge results from multiple scanners per job

**Discovery job states `[Ph.10]`:**
```
QUEUED → RUNNING → COMPLETED
              ↓
            FAILED
QUEUED → CANCELLED
RUNNING → CANCELLED
```

---

### Phase 11 — CBOM Data Model & Normalization `[Ph.11]`
**Normalization principles `[Ph.11]`:**
- All algorithm names → canonical form (SHA256 = sha256 = SHA-256 = OID 2.16.840.1.101.3.4.2.1 → `SHA-256`)
- OID registry (ISO/IEC 9834)
- Algorithm family classification
- Evidence preservation (raw text never modified)
- Deduplication (same algorithm in same workspace = one canonical asset)
- Schema version on CBOM exports

**Critical design rule `[Ph.11]`:**
- Evidence and Asset are separate entities — never collapse
- Evidence is immutable (append-only table — no UPDATE or DELETE)

---

### Phase 12 — Quantum Risk Engine `[Ph.12]`
**Risk is multi-dimensional `[Ph.12]`:**
- Explainable risk preferred over opaque scores
- Every risk dimension must have a traceable source
- Composite priority derived from all dimensions
- Risk explanation must be structured JSON (not a prose paragraph)

**Risk score fields (what ECDAT stores per asset) `[Ph.12]`:**
```json
{
  "asset_id": "uuid",
  "quantum_exposure": "HIGH",
  "classical_risk": "CRITICAL",
  "mosca_result": "CRITICAL",
  "data_lifetime_years": 7.0,
  "migration_time_years": 3.0,
  "threat_horizon_years": 12.0,
  "composite_priority": "CRITICAL",
  "risk_explanation": {
    "quantum": {"level": "HIGH", "reason": "RSA depends on integer factorization; vulnerable to Shor"},
    "classical": {"level": "LOW", "reason": "RSA-2048 acceptable in classical context"},
    "mosca": {"level": "CRITICAL", "x": 7, "y": 3, "z": 12, "margin": 2, "explanation": "..."},
    "composite": "CRITICAL"
  }
}
```

---

### Phase 13 — PQC Recommendation Engine & Crypto-Agility `[Ph.13]`
**Crypto-agility design principle `[Ph.13]`:**
- Applications should never hardcode a specific algorithm
- Abstract over algorithm selection at the application level
- ECDAT should flag hardcoded algorithm names as a finding

**Constraint inputs for recommendation `[Ph.13]`:**
- Performance budget (latency, CPU)
- Protocol compatibility (TLS, SSH, code signing)
- HSM support (not all HSMs support PQC yet)
- Client interoperability (what algorithms can clients handle?)
- Compliance requirements (FIPS, CNSA, CSA)
- Key/signature size budget (bandwidth constraints)

---

### Phase 14 — AI Intelligence & Explainable Reasoning `[Ph.14]`
**AI observability schema `[Ph.14]`:**
```json
{
  "run_id": "uuid",
  "agent_id": "analyst-v1",
  "model": "model-name",
  "evidence_ids_used": ["ev-001", "ev-002"],
  "output_schema_valid": true,
  "confidence": 0.87,
  "latency_ms": 1240,
  "hallucination_check": "passed"
}
```

**AI analyst questions it must be able to answer `[Ph.22]`:**
- "What are my five highest quantum risks?" → ranked list with evidence
- "Why is the Payment Gateway critical?" → evidence-backed explanation
- "What should we migrate first?" → ranked by quantum vulnerability + data lifetime + dependencies
- "What does this certificate chain look like?" → certificate graph
- "Show me all SHA-1 usages" → filtered evidence list

---

### Phase 15 — Multi-Source Discovery Engine `[Ph.15]`
**Scanner tools by source type `[Ph.15]`:**
| Source | Primary Tool | Fallback | Priority |
|--------|-------------|----------|----------|
| Source code (AST) | Tree-sitter | — | P0 |
| Source code (patterns) | Semgrep | Custom regex | P0 |
| Dependencies | Manifest parsers | Syft | P0 |
| Certificates (file) | python-cryptography | OpenSSL | P1 |
| Certificates (TLS) | ssl + socket | — | P1 |
| Binaries | LIEF | YARA | P2 |
| Containers | Trivy + layer analysis | Syft | P2 |
| Infrastructure | Trivy | — | P3 |
| Cloud/K8s | Cloud APIs | — | P3 |

---

### Phase 16 — Knowledge Graph, Dependencies & Blast Radius `[Ph.16]`
**Blast radius definition `[Ph.16]`:**
- "What is affected if this algorithm must be replaced?"
- Traversal: start at Algorithm node → follow IMPLEMENTS/USES edges → collect all Application/Service nodes
- Centrality scoring: algorithms used by many applications = highest priority

**Why blast radius matters (from Phase 22) `[Ph.22]`:**
> "A flat list tells you RSA exists. The graph tells you: changing RSA may affect 47 applications, 3 libraries, 2 HSMs and 12 business processes. That is much more useful."

---

### Phase 17 — ECDAT Command Center & Risk Dashboard `[Ph.17]`
**The dashboard is a decision interface, not a chart page `[Ph.17]`:**
Four questions the main screen must answer immediately:
1. WHAT DO WE HAVE? (Cryptographic Inventory)
2. HOW EXPOSED ARE WE? (Quantum Risk)
3. WHAT SHOULD WE DO? (Migration Priorities)
4. HOW FAR HAVE WE COME? (Quantum Readiness)

**Navigation structure from Phase 17 `[Ph.17]`:**
```
Dashboard → Inventory → Applications → Algorithms → Certificates → Libraries
→ Containers → Infrastructure → Risk → Knowledge Graph → Migration
→ Recommendations → Policies → Reports → Scans → AI Assistant → Settings
```

**User roles `[Ph.17]`:**
| Role | What They See |
|------|--------------|
| Executive | Quantum Readiness Score, Coverage %, Migration progress, Critical blockers |
| Security Analyst | Asset detail, Algorithm, Evidence, Risk, Dependencies, AI Analysis |
| Developer | Their applications, findings, affected files, recommended changes |
| Infrastructure Engineer | Hosts, containers, K8s, certificates, TLS, HSM, KMS |
| Compliance Officer | Policy violations, unsupported algorithms, certificate issues, audit evidence |

**Quantum Readiness Score (from Phase 22) `[Ph.22]`:**
```
Score = weighted sum of:
  Algorithm posture:       25%
  Inventory completeness:  20%
  Migration readiness:     20%
  Dependency readiness:    15%
  Certificate posture:     10%
  Policy compliance:       10%
```

**Information hierarchy (drill-down) `[Ph.17]`:**
```
Enterprise → Business Unit → Application → Cryptographic Asset → Evidence
```

---

### Phase 18 — Migration Planning & Operational Intelligence `[Ph.18]`
**Migration planning outputs `[Ph.18]`:**
- Prioritized migration queue (by composite risk)
- Dependency-ordered execution sequence (topological sort)
- Task assignment per team/developer
- Rollback planning
- CI/CD verification hooks
- Migration state tracking (Not Started / In Progress / Completed / Verified)

---

### Phase 19 — Security Architecture & Zero Trust `[Ph.19]`
**ECDAT security requirements for itself `[Ph.19]`:**
- ZTA principles: least privilege, verify every request
- Isolated scan workspaces (scanned code never persists)
- Auto-delete scan workspace after 24h
- Credential management (no raw secrets in scan context)
- RBAC: scoped by workspace, organization
- Audit logging: all reads, writes, queries logged with actor + timestamp
- AI data boundary: AI must never receive raw source code or secrets
- Tenant isolation: workspace_id enforced on every DB query

---

### Phase 20 — Testing, Validation & Benchmarking `[Ph.20]`
**Ground truth methodology `[Ph.20]`:**
- Maintain test repository with known cryptographic patterns
- Expected output: exact algorithm at exact file + line
- Measure: precision, recall, false positive rate
- Target: > 90% precision, > 85% recall

**AI evaluation metrics `[Ph.20]`:**
- Groundedness: % of AI claims traceable to stored evidence
- Schema validity: structured output conforms to schema
- Hallucination rate: claims about assets not in evidence store

---

### Phase 21 — Complete System Architecture `[Ph.21]`
**Recommended architecture `[Ph.21]`:**
```
Web Frontend (React/Next.js)
         ↓
   API Gateway (FastAPI)
         ↓
  ┌──────────────────────┐
  │        │             │
Scan   Risk Engine   Graph Service
Orchestrator         
  │
Message Queue (Redis/Celery)
  │
  Worker
```

**Full recommended tech stack from Phase 21 `[Ph.21]`:**

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React + TypeScript + Next.js | App Router |
| Frontend styling | Tailwind CSS | Phase 21 spec |
| Frontend data | React Query (or SWR) | Server state management |
| Frontend charts | ECharts or Recharts | Risk visualization |
| Frontend graph | React Flow | Dependency graph visualization |
| Backend | Python + FastAPI + Pydantic | Primary backend |
| ORM | SQLAlchemy | Async |
| DB migrations | Alembic | |
| Primary DB | PostgreSQL | All relational data |
| Graph DB | Neo4j | Dependency/blast radius graph |
| Graph fallback | PostgreSQL + graph extensions | For simplified deployment |
| Object storage | MinIO (local), S3 (cloud) | Scan artifacts, CBOM exports |
| Job queue | Redis + Celery | Async scan execution |
| Cache | Redis | Job status, rate limiting |
| Scanner: AST | Tree-sitter | Source code parsing |
| Scanner: rules | Semgrep-style rules | Pattern detection |
| Scanner: binary | YARA + LIEF | Binary analysis |
| Scanner: TLS | OpenSSL tooling | Certificate/TLS inspection |
| Scanner: containers | Trivy + Syft | Container image scanning |
| Authentication | Clerk (required by project) | User identity |
| AI gateway | Custom abstraction | Cloud LLM + local LLM switchable |

---

### Phase 22 — Final Productization & SIH Strategy `[Ph.22]`
**Priority list for SIH prototype `[Ph.22]`:**

MUST HAVE:
- ✓ Source scanning
- ✓ Dependency scanning
- ✓ Certificate scanning
- ✓ Crypto detection
- ✓ CBOM
- ✓ Risk scoring
- ✓ Knowledge graph
- ✓ Dashboard
- ✓ AI analyst
- ✓ PQC recommendation
- ✓ Migration plan
- ✓ Rescan verification

SHOULD HAVE:
- ✓ Container scanning
- ✓ Binary metadata analysis
- ✓ Policy engine
- ✓ Report generation
- ✓ Audit trail

NICE TO HAVE (post-SIH):
- ○ Advanced dynamic analysis
- ○ HSM integration
- ○ Cloud-native discovery
- ○ Runtime instrumentation
- ○ Air-gapped AI

**Golden rule `[Ph.22]`:** One excellent scanner covering 4 languages > 10 shallow scanners that produce unreliable findings. **Build depth, not breadth.**

**Demo enterprise concept `[Ph.22]`:**
- Create controlled fictional enterprise: "Astra Financial Technologies"
- Business units: Payments, Identity, Banking, Analytics, Infrastructure, Customer Platform
- Inject realistic technical debt: RSA-2048, ECDSA, SHA-1, TLS 1.2, legacy OpenSSL, old certificates
- Also include PQC-ready applications (ML-KEM, hybrid) — shows maturity spectrum

---

## 3. COMPLETE TECHNOLOGY STACK

### Frontend `[Ph.21]` + Current codebase `[CODE]`

| Component | Technology | Version | Status |
|-----------|-----------|---------|--------|
| Framework | Next.js (App Router) | 16.3.3 | ✅ EXISTS |
| UI Library | React | 19.2.8 | ✅ EXISTS |
| Language | TypeScript | ^5 | ✅ EXISTS |
| Styling | CSS Modules | — | ✅ EXISTS |
| CSS Framework | TailwindCSS v4 | ^4 | Installed, minimal use |
| Data fetching | SWR | To install | ❌ NEEDED |
| Charts | ECharts or Recharts | To install | ❌ NEEDED (risk viz) |
| Graph viz | React Flow | To install | ❌ NEEDED (knowledge graph) |
| Auth | @clerk/nextjs | To install | ❌ NEEDED (Phase 1) |
| Fonts | Inter + Outfit + JetBrains Mono | Google Fonts | ✅ EXISTS |

**Note:** Phase 21 spec says Tailwind CSS. Current project has it installed. Use CSS Modules for custom components, Tailwind utilities for layout helpers only.

### Backend (to be built) `[Ph.21]`

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | FastAPI | 0.115.x |
| Language | Python | 3.11+ |
| Validation | Pydantic | 2.9.x |
| ORM | SQLAlchemy (async) | 2.0.x |
| Migrations | Alembic | 1.13.x |
| ASGI server | Uvicorn | 0.30.x |
| Job queue | Celery | 5.4.x |
| Message broker | Redis | 7.x |
| DB driver | asyncpg | 0.29.x |
| HTTP client | httpx | 0.27.x |

### Databases `[Ph.21]`

| Database | Purpose | When |
|----------|---------|------|
| PostgreSQL 16 | All relational data (workspaces, evidence, assets, CBOM, risk, recommendations) | Phase 0 |
| Redis 7 | Job queue + cache + job status | Phase 0 |
| Neo4j | Knowledge graph + blast radius | Phase 9 / V2 |
| MinIO | Object storage for CBOM exports, scan artifacts | Phase 6 / optional |

### Scanners `[Ph.15, Ph.21]`

| Scanner | Tool | Languages | Priority |
|---------|------|-----------|----------|
| AST source scanner | tree-sitter | Python, Go, JS/TS, Java, C/C++ | P0 |
| Pattern rule engine | Semgrep (subprocess) | All | P0 |
| Dependency scanner | Custom parsers | package.json, requirements.txt, go.mod, pom.xml, Cargo.toml | P0 |
| Certificate (file) | python-cryptography | .pem, .crt, .cer, .der | P1 |
| Certificate (TLS) | ssl + socket | https:// URLs | P1 |
| Binary analysis | LIEF + YARA | ELF, PE, Mach-O | P2 |
| Container | Trivy + Syft (subprocess) | Docker, OCI | P2 |
| Cloud/K8s | Cloud APIs | AWS, GCP, Azure, K8s | P3 |

### Infrastructure (Docker Compose for local dev)

```yaml
services:
  postgres:    image: postgres:16,    port: 5432
  redis:       image: redis:7-alpine, port: 6379
  neo4j:       image: neo4j:5,        port: 7474/7687  # Phase 9+
  minio:       image: minio/minio,    port: 9000       # Optional
```

---

## 4. FULL DATA MODEL

### Core Domain Objects `[Ph.21]`
```
Organization → Projects → Applications → Repositories → Scans → Findings
                                                    ↓
                                               Crypto Assets ← Evidence
                                                    ↓
                                               Risk Scores
                                                    ↓
                                            Recommendations
                                                    ↓
                                            Migration Plans
```

### Database Tables (all required)

| Table | Purpose | Notes |
|-------|---------|-------|
| `workspaces` | User/org workspace | Tied to Clerk user_id |
| `discovery_jobs` | Scan jobs | Status state machine |
| `evidence` | Raw findings | IMMUTABLE — append only |
| `crypto_assets` | Canonical assets | Deduplicated per workspace |
| `evidence_assets` | Evidence → Asset mapping | Many-to-many |
| `risk_scores` | Per-asset risk | Multi-dimensional |
| `recommendations` | PQC recommendation | Per asset |
| `cbom_snapshots` | CycloneDX exports | Versioned |
| `applications` | Application context | P1 (for graph) |
| `asset_usage` | Asset in application context | P1 |

### Canonical Algorithm Format
```
{FAMILY}:{KEY_SIZE}
RSA:2048, RSA:4096
AES:128, AES:256
ECDSA:P256, ECDSA:P384
ML-KEM:768

Without key sizes:
SHA-256, SHA-1, MD5, DES3, SLH-DSA-128f, ML-DSA-65
```

---

## 5. COMPLETE API SURFACE

### Authentication
All authenticated endpoints require `Authorization: Bearer {clerk_token}` header.
Backend validates token and extracts `user_id` for workspace scoping.

### Endpoints

```
# Workspace
POST   /api/workspaces                    → Create workspace
GET    /api/workspaces/me                 → Get current user workspace
GET    /api/workspaces/{id}               → Get workspace by ID
DELETE /api/workspaces/{id}               → Delete workspace + all data

# Discovery Jobs
POST   /api/workspaces/{wid}/jobs         → Create job (source_type, source_url)
GET    /api/workspaces/{wid}/jobs         → List jobs (with status, counts)
GET    /api/jobs/{job_id}                 → Get job detail + progress
DELETE /api/jobs/{job_id}                 → Cancel job
GET    /api/jobs/{job_id}/evidence        → Evidence for a job (paginated)
GET    /api/jobs/{job_id}/logs            → Real-time scan logs (SSE or polling)

# Evidence
GET    /api/workspaces/{wid}/evidence     → All evidence (paginated, filterable)
GET    /api/evidence/{id}                 → Single evidence item (with context lines)

# Cryptographic Assets
GET    /api/workspaces/{wid}/assets       → All canonical assets (filterable)
GET    /api/assets/{id}                   → Asset detail (evidence, risk, recommendation)
GET    /api/assets/{id}/evidence          → Evidence for this asset

# Risk
GET    /api/workspaces/{wid}/risk         → All assets with risk, sorted by priority
GET    /api/workspaces/{wid}/risk/summary → {critical, high, medium, low, safe} counts
GET    /api/assets/{id}/risk              → Risk detail for one asset
POST   /api/assets/{id}/risk/recalculate  → Recalculate (custom parameters)

# Recommendations
GET    /api/workspaces/{wid}/recommendations → All recommendations
GET    /api/assets/{id}/recommendation       → Recommendation for specific asset

# CBOM
POST   /api/workspaces/{wid}/cbom/generate  → Generate CBOM snapshot
GET    /api/workspaces/{wid}/cbom            → Latest CBOM (JSON)
GET    /api/workspaces/{wid}/cbom?format=xml → Latest CBOM (XML)
GET    /api/cbom/{id}                        → Historical CBOM snapshot

# Knowledge Graph
GET    /api/workspaces/{wid}/graph           → Full graph data
GET    /api/graph/blast-radius/{asset_id}   → Blast radius for algorithm
GET    /api/graph/shortest-path             → Path between two nodes

# Dashboard
GET    /api/workspaces/{wid}/dashboard      → All dashboard metrics in one call
GET    /api/workspaces/{wid}/readiness-score → Quantum Readiness Score + breakdown

# AI Analyst
POST   /api/workspaces/{wid}/ai/query       → Analyst question (returns structured response)
GET    /api/ai/sessions/{id}                → AI session history

# Settings
GET    /api/workspaces/{wid}/settings       → Workspace settings
PUT    /api/workspaces/{wid}/settings       → Update settings (threat_horizon_years, etc.)
```

---

## 6. UI SCREEN INVENTORY & INTERACTION FLOWS

### Public (No Auth Required)
| Screen | Route | Purpose |
|--------|-------|---------|
| Homepage | `/` | Product story, interactive demos, SIH identity |
| Evidence Room | `/evidence` | 22-phase research showcase |
| Presentation | `/presentation` | SIH judge presentation mode |
| Sign In | `/sign-in` | Clerk auth (split panel design) |
| Sign Up | `/sign-up` | Clerk registration |

### Authenticated (Clerk Required)
| Screen | Route | Primary Question |
|--------|-------|-----------------|
| Command Center | `/prototype` | "What is my current posture?" |
| Discovery | `/prototype/discovery` | "What is being found right now?" |
| Cryptographic Inventory | `/prototype/assets` | "What assets do I have?" |
| Asset Detail | `/prototype/assets/{id}` | "What exactly is this asset?" |
| Dependency Graph | `/prototype/graph` | "What depends on this?" |
| Risk Dashboard | `/prototype/risk` | "What should I worry about first?" |
| Recommendations | `/prototype/recommendations` | "What should replace each asset?" |
| Migration Workspace | `/prototype/migration` | "How do I change it safely?" |
| Verification | `/prototype/verification` | "Did the migration work?" |
| AI Analyst | `/prototype/ai` | "Why does this matter?" |
| Settings | `/prototype/settings` | Workspace config (threat horizon, etc.) |

---

## 7. USER FLOWS — EVERY BUTTON DOCUMENTED

### Flow 1: First Login (No Data)
```
User lands on /prototype (authenticated via Clerk)
        ↓
System checks: does this user have a workspace?
        ↓ NO
POST /api/workspaces → workspace created
        ↓
Render: Empty Command Center with onboarding panel
        ↓
Panel shows:
  "Welcome to ECDAT, {name}. Let's build your cryptographic inventory."
  [GitHub Repository URL input]
  [Or choose a demo: Go App | Python API | Node.js]
  [START DISCOVERY →] button (copper, full-width)
        ↓
User pastes URL or clicks demo
```

### Flow 2: Starting a Discovery Job
```
User enters GitHub URL in onboarding OR top-bar "New Discovery Job" button
        ↓
Click [START DISCOVERY →] or [+ New Discovery Job]
        ↓
Modal opens: "New Discovery Job"
  - Source type: [Git Repository ▼] (dropdown: Git, Upload, Certificate URL)
  - URL field: prefilled if from onboarding
  - [Cancel] [Start Discovery →]
        ↓
On submit: POST /api/workspaces/{id}/jobs → returns job_id immediately
        ↓
Modal closes
        ↓
Discovery Jobs table updates: new row appears with status badge "QUEUED" (gray)
        ↓
After 1-2 seconds: badge changes to "RUNNING" (amber, pulsing dot)
        ↓
Poll GET /api/jobs/{id} every 3s while status = 'running'
        ↓
Progress bar shows: "Scanning source code... 42%"
(Based on job.metadata.progress returned by backend)
        ↓
Job completes: badge becomes "COMPLETED" (green)
        ↓
Command Center metrics update:
  Assets Discovered: [new count]
  Quantum Vulnerable: [computed count]
  Critical Priority: [computed count]
  Open Recommendations: [computed count]
        ↓
Toast notification: "Discovery completed. 23 cryptographic assets found."
```

### Flow 3: Viewing Job Status (Running Job)
```
Click job row OR click [View] button in discovery jobs table
        ↓
Job Detail drawer/page slides in from right
        ↓
Shows:
  - Job ID (monospace)
  - Status badge
  - Source URL (clickable)
  - Started at timestamp
  - Real-time log stream (polling every 2s)
    Example:
    [ECDAT-CLONE] Cloning repository (shallow)...
    [ECDAT-SCAN]  Scanning src/auth/token.go (Go)...
    [ECDAT-FOUND] RSA-2048 import at line 42
    [ECDAT-SCAN]  Scanning package.json (dependencies)...
    [ECDAT-FOUND] jsonwebtoken (crypto-capable library)
    [ECDAT-NORM]  Normalizing 8 raw findings...
    [ECDAT-CBOM]  Generating CycloneDX CBOM...
    [ECDAT-RISK]  Computing risk for 6 canonical assets...
    [ECDAT-DONE]  Job completed. 6 assets, 2 critical.
  - [Cancel] button (visible only if RUNNING or QUEUED)
        ↓
On completion: Show summary:
  - Evidence collected: N items
  - Canonical assets: N
  - CBOM generated: Yes [Download JSON]
```

### Flow 4: Viewing an Asset
```
Click any row in Cryptographic Inventory OR asset in Risk Priority Queue
        ↓
Navigate to /prototype/assets/{id}
        ↓
Asset Detail page shows:

TOP SECTION:
  - Algorithm name (large): "RSA:2048"
  - Family badge: "ASYMMETRIC KEY EXCHANGE"
  - Quantum status badge: "QUANTUM VULNERABLE" (copper/red)
  - Classical status badge: "CLASSICALLY ACCEPTABLE" (sage)
  - Composite risk badge: "CRITICAL" (red)
  - Key size: 2048 bits
  - Standard: NIST SP 800-186 (deprecated)

TABS: [Evidence] [Risk] [Recommendation] [Dependencies]

  TAB: Evidence
    List of all evidence items for this asset:
    ┌────────────────────────────────────────────────────────┐
    │  src/auth/token.go    Line 42    TREE-SITTER    0.95   │
    │  ──────────────────────────────────────────────────    │
    │  40: // Establish session                              │
    │  41: key, _ := rsa.GenerateKey(rand.Reader, 2048)      │ ← amber highlight
    │  42:                                                   │
    │  Detector: treesitter_import                           │
    └────────────────────────────────────────────────────────┘
    [+ 3 more findings]

  TAB: Risk
    Multi-dimensional breakdown:
    ┌──────────────────────────────────────────────────────┐
    │ QUANTUM EXPOSURE         HIGH                        │
    │ Reason: RSA relies on integer factorization. Shor's  │
    │ algorithm on a CRQC can solve this efficiently.      │
    │                                                      │
    │ CLASSICAL RISK           LOW                         │
    │ Reason: RSA-2048 is acceptable for current threats.  │
    │                                                      │
    │ MOSCA INEQUALITY         CRITICAL                    │
    │ X (7y) + Y (3y) = 10y exceeds Z (12y) by 2y.        │
    │ HNDL window is open. Migrate immediately.            │
    │                                                      │
    │ COMPOSITE PRIORITY       CRITICAL                    │
    └──────────────────────────────────────────────────────┘
    [Customize Parameters →] (opens Mosca calculator with real values)

  TAB: Recommendation
    ┌──────────────────────────────────────────────────────┐
    │ PRIMARY                                              │
    │ ML-KEM-768 (FIPS 203)                               │
    │ Module Lattice-based Key Encapsulation Mechanism     │
    │                                                      │
    │ HYBRID PATH (Recommended for transition)             │
    │ ML-KEM-768 + X25519                                  │
    │                                                      │
    │ FALLBACK                                             │
    │ ML-KEM-512 (if bandwidth constrained)               │
    │                                                      │
    │ MIGRATION COMPLEXITY: HIGH                           │
    │ PROTOCOL NOTE: TLS 1.3 supports hybrid KEM via      │
    │ draft-ietf-tls-hybrid-design.                       │
    │                                                      │
    │ [Copy Recommendation] [View Migration Steps →]       │
    └──────────────────────────────────────────────────────┘

  TAB: Dependencies
    "If RSA:2048 is replaced, these will be affected:"
    ┌──────────────────────────────────────────────────────┐
    │ → Payment Gateway (via OpenSSL 1.1.1)               │
    │ → Identity Service (direct usage)                    │
    │ → API Gateway (TLS termination)                      │
    └──────────────────────────────────────────────────────┘
    [View Full Graph →]
```

### Flow 5: Risk Dashboard
```
Click "Risk" in sidebar
        ↓
/prototype/risk loads

Shows:
  TOP ROW — summary counts:
  [CRITICAL: 23] [HIGH: 89] [MEDIUM: 45] [LOW: 90] [SAFE: N]

  RISK MATRIX (heatmap):
    Axes: Quantum Exposure (x) vs Business Impact (y)
    Cells filled with colored dots representing assets
    Click any cell → filters the list below

  RISK PRIORITY QUEUE (table, sorted by composite_priority):
  Algorithm          | Risk      | Source File          | Function
  RSA:2048           | CRITICAL  | src/auth/token.go    | KEY_EXCHANGE
  SHA-1              | HIGH      | src/utils/hash.go    | HASH
  ECDH:P256          | HIGH      | src/api/gateway.go   | KEY_AGREEMENT
  ...

  Filters: [All ▼] [CRITICAL] [HIGH] [MEDIUM] [LOW]
  Sort: [Risk Level ▼] [Algorithm] [First Found]

Click any row → navigate to /prototype/assets/{id}
```

### Flow 6: Exporting CBOM
```
Click [Export CBOM] button (in Command Center top-right, or in Inventory tab)
        ↓
Dropdown appears:
  [CycloneDX JSON ↓]
  [CycloneDX XML ↓]
        ↓
Click JSON:
  GET /api/workspaces/{id}/cbom
        ↓
Browser downloads: ecdat-cbom-2026-09-01T22:00:00Z.json
        ↓
Toast: "CBOM exported. 6 cryptographic components."
```

### Flow 7: AI Analyst
```
Click "AI Analyst" in sidebar
        ↓
/prototype/ai loads

Interface:
  - Left panel: conversation history (Clerk user avatar + AI avatar)
  - Right panel: evidence citations panel (auto-updates when AI responds)

Input bar at bottom:
  [Ask the cryptographic analyst...                    ] [Send →]

User types: "What are my highest priority risks?"
        ↓
POST /api/workspaces/{id}/ai/query → {question, workspace_id}
        ↓
Loading state: "Analyst is reviewing your evidence..."
        ↓
Response appears:
  "Based on your ECDAT scan data, your three highest priority risks are:
   
   1. RSA:2048 — Payment Gateway (src/auth/token.go:42)
      Quantum exposure: HIGH | Data lifetime: 7 years | Margin: 2 years
      Evidence: ev-001, ev-003 (see right panel)
   
   2. SHA-1 — Hash utility (src/utils/hash.go:7)
      Classical vulnerability: collision attacks demonstrated
      Evidence: ev-007 (see right panel)
   ..."

Right panel updates:
  EVIDENCE CITED:
  ev-001: src/auth/token.go:42 → "rsa.GenerateKey(rand.Reader, 2048)"
  ev-007: src/utils/hash.go:7  → "sha1.New()"
```

### Flow 8: Settings / Threat Horizon Config
```
Click Settings in sidebar
        ↓
/prototype/settings

Sections:
  RISK PARAMETERS
  ┌─────────────────────────────────────────────────────┐
  │ Quantum Threat Horizon (Z)                          │
  │ [12 years ▼]  (10 / 12 / 15 / 20 / Custom)         │
  │                                                     │
  │ Default Data Lifetime (X)                           │
  │ [7 years] [slider]                                  │
  │                                                     │
  │ Organization Name                                   │
  │ [Astra Financial Technologies        ]              │
  └─────────────────────────────────────────────────────┘
  [Save Changes]  → PUT /api/workspaces/{id}/settings
  
  SCAN SETTINGS
  ┌─────────────────────────────────────────────────────┐
  │ Auto-delete scan workspace after: [24 hours ▼]      │
  │ Max concurrent jobs: [3 ▼]                          │
  └─────────────────────────────────────────────────────┘

  WORKSPACE
  ┌─────────────────────────────────────────────────────┐
  │ Workspace ID: a1b2-c3d4-... (monospace, copy btn)   │
  │ Owner: Akhil Nair (via Clerk)                       │
  │ [Delete All Data]  (danger, requires confirmation)  │
  └─────────────────────────────────────────────────────┘
```

### Flow 9: Returning User (Data Exists)
```
User signs in via Clerk
        ↓
Redirect to /prototype
        ↓
GET /api/workspaces/me → returns workspace
GET /api/workspaces/{id}/dashboard → all metrics
        ↓
Command Center renders immediately with real data:

  HEADER ROW:
  "Cryptographic Command Center"
  "Last scan: 2 hours ago · Astra Financial Technologies"  [+ New Discovery Job]

  METRICS:
  [247 Assets · LIVE]  [89 Quantum Vulnerable]  [23 Critical]  [34 Recommendations]

  DISCOVERY JOBS:
  github.com/demo/payment-api   COMPLETED   2h ago    [View]
  github.com/demo/identity-svc  COMPLETED   1d ago    [View]
  github.com/demo/mobile-app    FAILED      3h ago    [Retry]

  RISK PRIORITY QUEUE:
  RSA:2048        CRITICAL    src/auth/token.go:42
  SHA-1           HIGH        src/utils/hash.go:7
  ECDH:P256       HIGH        src/api/gateway.go:18
  AES:128         MEDIUM      config/crypto.yaml:12
```

---

## 8. DASHBOARD ARCHITECTURE (from Phase 17)

### Four Questions Every Screen Must Answer `[Ph.17]`
Every screen in the dashboard has ONE primary question. When designing any screen, write the question at the top of the brief and everything else must serve it.

### Information Hierarchy `[Ph.17]`
```
Enterprise Level   → "How is the whole organization doing?"
Business Unit      → "How is this team doing?"
Application        → "How is this app doing?"
Cryptographic Asset → "What exactly is this algorithm?"
Evidence           → "What proved this algorithm exists here?"
```

### Dashboard States to Design
Every screen needs ALL three states documented:

| State | Description | Design Pattern |
|-------|-------------|----------------|
| Empty | No data yet | Onboarding CTA, never show zeros that look like real data |
| Loading | Data being fetched | Skeleton loaders, not spinners (for layout stability) |
| Error | API failure | Error boundary + retry button + error message |
| Real | Real data from backend | Actual numbers, evidence, links |
| Demo | Synthetic data | Must show [DEMONSTRATION DATA] banner |

---

## 9. FIVE CORE ENGINES (from Phase 22)

### Engine 1: Cryptographic Discovery
Input: Repository URL or file upload  
Output: Raw evidence (file, line, match, confidence, detector)  
Tools: Tree-sitter, Semgrep, manifest parsers, x509, LIEF, Trivy  

### Engine 2: CBOM + Knowledge Graph
Input: Raw evidence  
Output: Canonical CBOM (CycloneDX) + Graph nodes/edges  
Tools: Normalization engine, alias registry, Neo4j  

### Engine 3: Quantum Risk Engine
Input: Canonical assets  
Output: Multi-dimensional risk scores per asset  
Model: Mosca inequality + classical vulnerability + business criticality  

### Engine 4: PQC Recommendation Engine
Input: Risk scores + algorithm function + constraints  
Output: Ranked PQC candidates with hybrid migration path  
Source: NIST FIPS 203/204/205 + constraint rules  

### Engine 5: Migration Verification
Input: Migration tasks  
Output: Rescan comparison (before vs after)  
Mechanism: Rescan after migration → diff CBOM → confirm algorithm replacement  

---

## 10. SIH DEMO STRATEGY (from Phase 22)

### The Demo Enterprise: "Astra Financial Technologies"
**DO NOT rely on random GitHub repos during the live demo.** Build a controlled dataset.

```
Astra Financial Technologies
  Business Units:
    - Payments (High criticality)
    - Identity (High criticality)
    - Banking (Medium criticality)
    - Analytics (Low criticality)
    - Infrastructure (Cross-cutting)
  
  Applications:
    - Payment Gateway    ← RSA-2048, ECDSA, TLS 1.2
    - Identity Service   ← ECDSA P-256, SHA-1 hash
    - Customer Portal    ← Mixed (some PQC-ready)
    - Mobile Backend     ← jsonwebtoken, node-forge
    - API Gateway        ← Certificate-based mTLS (RSA)
    
  Crypto Technical Debt:
    - RSA-2048 for TLS and signing (10 occurrences)
    - ECDSA P-256 (8 occurrences)
    - SHA-1 for password hashing (3 occurrences)
    - TLS 1.2 cipher suites (4 endpoints)
    - Legacy OpenSSL 1.1.1 (2 containers)
    - Old certificates expiring < 6 months
    
  PQC-Ready Applications (show maturity spectrum):
    - Internal Tools: ML-KEM-768 already implemented
    - Analytics API: hybrid ECDH + ML-KEM
```

### 6-Minute SIH Demo Script `[Ph.22]`

```
00:00 — 00:30
  Landing page visible
  "ECDAT discovers cryptography, normalizes it into a CBOM,
   assesses quantum risk, and guides migration."

00:30 — 01:00
  Sign in → Command Center (empty or pre-populated)
  "This is the ECDAT Command Center. 
   The first screen answers: What is our cryptographic posture?"

01:00 — 01:45
  Connect Astra Financial Technologies repository
  "Let me connect the Payment Gateway repository"
  [START DISCOVERY →] → job starts
  Show real-time scan logs streaming in

01:45 — 02:30
  Job completes
  Metrics update: 18 assets, 11 quantum vulnerable, 4 critical
  "ECDAT found 18 cryptographic assets. 11 are quantum vulnerable."

02:30 — 03:15
  Navigate to Risk Dashboard
  Click RSA:2048 → Asset Detail
  Show Evidence tab: "Here is the proof — file, line, raw code"
  Show Risk tab: "Mosca says: 7 years data + 3 years migration > 12 year horizon. CRITICAL."

03:15 — 04:00
  Show Recommendation tab
  "Replace RSA-2048 with ML-KEM-768. FIPS 203 compliant."
  "Hybrid path: ML-KEM-768 + X25519 during transition."

04:00 — 04:30
  Show Knowledge Graph
  Click RSA node → blast radius shows 5 dependent services
  "If we change RSA, these 5 services are affected. We sequence migration accordingly."

04:30 — 05:00
  Show AI Analyst
  Question: "What should we migrate first?"
  AI answer cites real evidence IDs
  "Every statement the AI makes references real scan evidence."

05:00 — 05:30
  Export CBOM → download JSON → open
  "This is the CycloneDX Cryptographic Bill of Materials.
   Machine-readable. Enterprise-ready. NTRO-compliant."

05:30 — 06:00
  Quantum Readiness Score: 38/100 → "Moderate Risk"
  "Before ECDAT: blind. After ECDAT: 38/100 readiness score.
   We know exactly what to fix and in what order."
  Questions.
```

### Scoring for SIH Judges `[Ph.22]`

| Judging Dimension | How ECDAT Addresses It |
|-------------------|------------------------|
| Innovation | Only platform combining CBOM + Knowledge Graph + Mosca risk + PQC recommendation in one workflow |
| Technical Depth | 22-phase research + real AST scanner + CycloneDX + multi-dimensional risk |
| Completeness | End-to-end: scan → CBOM → risk → recommend → migrate → verify |
| Scalability | Modular architecture, async job queue, PostgreSQL + Neo4j |
| Real-world applicability | Exact NTRO problem statement addressed: enterprise cryptographic inventory |
| Evidence Quality | Every finding has file + line + raw match + confidence + detector |

---

## 11. SECURITY ARCHITECTURE

### For the Scanner (ECDAT itself handles sensitive code)

| Concern | Requirement | Implementation |
|---------|-------------|----------------|
| Source code privacy | Scanned code never persists | Auto-delete /tmp/ecdat-scans/{job_id} after scan |
| Secrets in code | Source code secrets must not reach LLM | Strip secret-pattern matches before AI context |
| Tenant isolation | Workspace_id enforced on every query | WHERE workspace_id = $user_workspace_id |
| Auth bypass | No route accessible without valid Clerk session | Clerk middleware on all protected routes |
| Evidence integrity | Evidence must be immutable | Append-only table (no UPDATE/DELETE on evidence) |
| LLM data boundary | LLM must not receive raw source code | LLM context = canonical asset name + evidence summary + risk score |
| IDOR protection | Asset IDs validated against workspace ownership | Server-side: verify asset belongs to requesting user's workspace |

### Authentication Flow
```
User → Clerk → JWT token
           ↓
Next.js API route: verify token → extract userId
           ↓
Backend: X-Clerk-User-Id header → validate → workspace lookup
           ↓
All queries: WHERE workspace_id = user's_workspace_id
```

---

## 12. WHAT TO BUILD VS WHAT NOT TO BUILD

### Build for MVP (SIH Day)
✓ Source code scanner (Tree-sitter + Semgrep, Python/Go/JS)  
✓ Dependency scanner (package.json, requirements.txt, go.mod)  
✓ Certificate scanner (file + URL)  
✓ Evidence persistence  
✓ Normalization engine + alias registry  
✓ CycloneDX CBOM generator  
✓ Mosca risk engine per asset  
✓ PQC recommendation table  
✓ Clerk auth  
✓ Dashboard (Command Center, Inventory, Risk, Recommendations)  
✓ Evidence viewer  
✓ CBOM export  
✓ Demo enterprise dataset (Astra Financial Technologies)  

### Build After SIH (V2)
○ Neo4j knowledge graph + blast radius  
○ AI analyst (RAG + LLM)  
○ Container scanning (Trivy)  
○ Binary analysis (LIEF + YARA)  
○ Migration workspace (task management)  
○ Quantum Readiness Score dashboard  

### Never Build (Wrong Direction)
✗ Autonomous code rewriting (too risky)  
✗ Custom LLM training  
✗ 25-microservice architecture for MVP  
✗ Cloud/K8s/HSM discovery before source scanning works  
✗ Predictive quantum timeline (scientifically uncertain)  
✗ Custom vector database (use pgvector)  

---

*Document built from extracted text of all 22 Phase PDFs + ECDTA.md (master PRD) + source code analysis*  
*All phase citations `[Ph.N]` reference actual PDF content extracted 2026-09-01*  
*Team: LatentManifold / SIH2026-143 / ECDAT*
