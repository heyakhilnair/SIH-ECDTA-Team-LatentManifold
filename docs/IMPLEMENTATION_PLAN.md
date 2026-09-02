# ECDAT — COMPLETE IMPLEMENTATION PLAN
**Version:** 1.0 · **Created:** 2026-09-01 · **Team:** LatentManifold / SIH2026-143

> This is the engineering bible. Every phase, every task, every dependency, every definition of done.  
> Agents picking up any task MUST read `docs/AGENT_CONTEXT.md` first.  
> Track progress in `docs/TRACKER.md`.

---

## OVERVIEW

| Phase | Name | Duration | Priority | Status |
|-------|------|----------|----------|--------|
| 0 | Foundation & Environment | Day 1–3 | P0 | `[ ]` |
| 1 | Clerk Authentication | Day 3–5 | P0 | `[ ]` |
| 2 | Discovery Backend — Core Scanners | Day 4–10 | P0 | `[ ]` |
| 3 | Normalization Engine + CBOM | Day 8–12 | P0 | `[ ]` |
| 4 | Quantum Risk Engine | Day 11–14 | P0 | `[ ]` |
| 5 | PQC Recommendation Engine | Day 14–17 | P1 | `[ ]` |
| 6 | Frontend Wiring — Dashboard | Day 15–20 | P1 | `[ ]` |
| 7 | Testing + Demo Preparation | Day 18–21 | P1 | `[ ]` |
| 8 | AI Analyst (V2) | Post-SIH | P2 | `[ ]` |
| 9 | Knowledge Graph — Neo4j (V2) | Post-SIH | P2 | `[ ]` |
| 10 | Enterprise Hardening (V3) | Future | P3 | `[ ]` |

---

# Enterprise Product Shell

## Global Shell
- Top Bar, Sidebar, Breadcrumbs, Page Header
- Global Search, Command Palette, Notifications, User Menu

## Organization Model
Organization -> Workspace -> Sources -> Scan Jobs

> **Note on Dynamic Management (Phase 6.4):**
> Currently, the UI uses static placeholders for the Organization name and the other available workspaces (e.g., "Staging", "Security Research") in the Topbar dropdown. In the upcoming phases, the Organization and Workspace switcher must be made fully dynamic. This involves:
> 1. Activating Clerk's native Organization feature and mapping it to the backend, OR creating a native `organizations` table in PostgreSQL.
> 2. Building a backend endpoint (e.g., `GET /api/workspaces`) to fetch all workspaces the user has access to, and populating the Topbar dropdown with this real data instead of static placeholders.

## Organization Features
- members, teams, roles, permissions, workspaces, integrations, policies, audit

## Global Search
- assets, repositories, sources, scan jobs, algorithms, findings, migration tasks

## Global Operations
- Add Source, Run Discovery, Create Migration Plan, Export CBOM

## Enterprise Requirements
- tenant/workspace isolation, RBAC, secure auth, server-side auth, auditability, performance, accessibility

---

## PHASE 0 — FOUNDATION & ENVIRONMENT
**Duration:** Day 1–3  
**Goal:** Project scaffolding, database schema, environment configuration  
**Owner:** Backend engineer + Team Lead  
**Blocked by:** Nothing  

### 0.1 — Backend Project Scaffold

**Task:** Create the FastAPI Python backend project structure

```
ecdat-backend/
├── app/
│   ├── __init__.py
│   ├── main.py              ← FastAPI app entrypoint
│   ├── config.py            ← Settings / env variables
│   ├── database.py          ← SQLAlchemy engine + session
│   ├── models/              ← SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── job.py
│   │   ├── evidence.py
│   │   ├── asset.py
│   │   ├── cbom.py
│   │   └── workspace.py
│   ├── routers/             ← FastAPI routers
│   │   ├── __init__.py
│   │   ├── jobs.py
│   │   ├── evidence.py
│   │   ├── assets.py
│   │   ├── cbom.py
│   │   └── risk.py
│   ├── services/            ← Business logic
│   │   ├── scanner/
│   │   │   ├── __init__.py
│   │   │   ├── orchestrator.py
│   │   │   ├── source_scanner.py
│   │   │   ├── dependency_scanner.py
│   │   │   └── certificate_scanner.py
│   │   ├── normalizer.py
│   │   ├── cbom_generator.py
│   │   └── risk_engine.py
│   └── schemas/             ← Pydantic schemas
│       ├── __init__.py
│       ├── job.py
│       ├── evidence.py
│       ├── asset.py
│       └── risk.py
├── tests/
│   ├── test_scanner.py
│   ├── test_normalizer.py
│   └── test_risk.py
├── requirements.txt
├── .env.example
├── alembic.ini              ← DB migrations
└── Dockerfile
```

**Requirements:**
```txt
fastapi==0.115.0
uvicorn[standard]==0.30.6
sqlalchemy==2.0.35
alembic==1.13.3
asyncpg==0.29.0
psycopg2-binary==2.9.9
pydantic==2.9.2
pydantic-settings==2.5.2
python-dotenv==1.0.1
tree-sitter==0.23.2
tree-sitter-python==0.23.2
tree-sitter-javascript==0.23.1
tree-sitter-go==0.23.0
cryptography==43.0.1
httpx==0.27.2
python-jose==3.3.0
celery==5.4.0
redis==5.1.1
```

**DoD:**
- [ ] `uvicorn app.main:app --reload` starts without errors
- [ ] `GET /health` returns `{"status": "ok", "version": "0.1.0"}`
- [ ] Project structure matches spec above

### 0.2 — PostgreSQL Database Schema

**Task:** Design and create all database tables via Alembic migrations

```sql
-- 001_initial_schema.sql

-- Workspaces (tied to Clerk user/org)
CREATE TABLE workspaces (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id VARCHAR(255) NOT NULL,
  name         VARCHAR(255) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_workspaces_clerk_user ON workspaces(clerk_user_id);

-- Discovery Jobs
CREATE TABLE discovery_jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_type  VARCHAR(50) NOT NULL,  -- 'git', 'upload', 'certificate'
  source_url   TEXT,
  status       VARCHAR(20) NOT NULL DEFAULT 'queued',
  -- queued | running | completed | failed | cancelled
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_msg    TEXT,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_jobs_workspace ON discovery_jobs(workspace_id);
CREATE INDEX idx_jobs_status ON discovery_jobs(status);

-- Raw Evidence (immutable — append only, no UPDATE/DELETE)
CREATE TABLE evidence (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID NOT NULL REFERENCES discovery_jobs(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_type  VARCHAR(50) NOT NULL,  -- 'source_code', 'dependency', 'certificate'
  file_path    TEXT,
  line_number  INTEGER,
  raw_match    TEXT NOT NULL,
  context_lines TEXT,  -- surrounding code lines for context
  detector     VARCHAR(100) NOT NULL,  -- 'treesitter', 'semgrep', 'x509', 'manifest'
  confidence   FLOAT NOT NULL DEFAULT 1.0,  -- 0.0 to 1.0
  raw_metadata JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_evidence_job ON evidence(job_id);
CREATE INDEX idx_evidence_workspace ON evidence(workspace_id);

-- Canonical Cryptographic Assets
CREATE TABLE crypto_assets (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  algorithm_canonical  VARCHAR(100) NOT NULL,  -- e.g., 'RSA:2048'
  algorithm_family     VARCHAR(50) NOT NULL,   -- 'RSA', 'EC', 'AES', 'SHA', 'HYBRID'
  algorithm_name       VARCHAR(100) NOT NULL,  -- e.g., 'RSA'
  key_size             INTEGER,                -- e.g., 2048
  function             VARCHAR(50),            -- 'KEY_EXCHANGE', 'SIGNATURE', 'HASH', 'ENCRYPTION'
  standard             VARCHAR(100),           -- 'FIPS 140-3', 'NIST SP 800-186'
  oid                  VARCHAR(100),           -- OID string if applicable
  quantum_vulnerable   BOOLEAN DEFAULT FALSE,
  classical_vulnerable BOOLEAN DEFAULT FALSE,
  vulnerability_notes  TEXT,
  first_seen           TIMESTAMPTZ DEFAULT NOW(),
  last_seen            TIMESTAMPTZ DEFAULT NOW(),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_asset_canonical_workspace ON crypto_assets(workspace_id, algorithm_canonical);
CREATE INDEX idx_asset_workspace ON crypto_assets(workspace_id);

-- Evidence → Asset mapping (many-to-many)
CREATE TABLE evidence_assets (
  evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
  asset_id    UUID NOT NULL REFERENCES crypto_assets(id) ON DELETE CASCADE,
  PRIMARY KEY (evidence_id, asset_id)
);

-- Risk Scores (per asset, computed)
CREATE TABLE risk_scores (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id               UUID NOT NULL REFERENCES crypto_assets(id) ON DELETE CASCADE,
  workspace_id           UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  quantum_exposure       VARCHAR(20),   -- 'NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  classical_risk         VARCHAR(20),
  mosca_result           VARCHAR(20),   -- result of X+Y>Z calculation
  data_lifetime_years    FLOAT,
  migration_time_years   FLOAT,
  threat_horizon_years   FLOAT,
  composite_priority     VARCHAR(20),   -- final: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  risk_explanation       JSONB,         -- structured explanation object
  computed_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_risk_asset ON risk_scores(asset_id);

-- PQC Recommendations (per asset)
CREATE TABLE recommendations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id         UUID NOT NULL REFERENCES crypto_assets(id) ON DELETE CASCADE,
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  current_algo     VARCHAR(100) NOT NULL,
  recommended_algo VARCHAR(100) NOT NULL,
  candidate_algo   VARCHAR(100),   -- runner-up
  hybrid_path      TEXT,           -- description of hybrid migration path
  reasoning        JSONB,          -- structured reasoning object
  confidence       FLOAT,
  nist_standard    VARCHAR(50),    -- 'FIPS 203', 'FIPS 204', 'FIPS 205'
  migration_complexity VARCHAR(20), -- 'LOW', 'MEDIUM', 'HIGH'
  generated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- CBOM Snapshots (versioned exports)
CREATE TABLE cbom_snapshots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  job_id       UUID REFERENCES discovery_jobs(id),
  version      VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  format       VARCHAR(20) NOT NULL DEFAULT 'cyclonedx-json',  -- 'cyclonedx-json', 'cyclonedx-xml'
  content      JSONB NOT NULL,
  asset_count  INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_cbom_workspace ON cbom_snapshots(workspace_id);
```

**DoD:**
- [ ] All migrations run cleanly with `alembic upgrade head`
- [ ] Schema verified against PostgreSQL with `\d` commands
- [ ] Rollback migration works (`alembic downgrade -1`)
- [ ] No foreign key violations possible for intended operations

### 0.3 — Environment Configuration

**Files needed in Next.js project:**

`.env.local` (create, add to .gitignore):
```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_REPLACE_ME
CLERK_SECRET_KEY=sk_test_REPLACE_ME
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/prototype
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/prototype

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Backend `.env` (ecdat-backend/):**
```env
DATABASE_URL=postgresql+asyncpg://ecdat:password@localhost:5432/ecdat_db
REDIS_URL=redis://localhost:6379/0
CLERK_SECRET_KEY=sk_test_REPLACE_ME
ENVIRONMENT=development
```

**Docker Compose (local dev):**
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: ecdat_db
      POSTGRES_USER: ecdat
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

**DoD:**
- [ ] `.env.local` exists, `.gitignore` excludes it
- [ ] `docker-compose up -d` starts PostgreSQL and Redis
- [ ] Backend connects to database on startup
- [ ] Environment variables documented in `.env.example`

---

## PHASE 1 — CLERK AUTHENTICATION
**Duration:** Day 3–5  
**Goal:** Working authentication protecting all operational routes  
**Owner:** Frontend engineer  
**Blocked by:** Phase 0.3 (env vars)

### 1.1 — Install and Configure Clerk

```bash
npm install @clerk/nextjs
```

**Read the Next.js 16.x Clerk docs** before writing any code:
- Check `node_modules/next/dist/docs/` for Next.js version-specific notes (required by AGENTS.md)
- Check `node_modules/@clerk/nextjs/` for Clerk version compatibility

### 1.2 — ClerkProvider in Root Layout

**File:** `src/app/layout.tsx`

Wrap the entire app with `<ClerkProvider>`. Preserve existing font variables and Quby/CommandPalette components.

```typescript
import { ClerkProvider } from '@clerk/nextjs'
// ... existing imports

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`...fonts...`}>
        <body>
          {children}
          <Quby />
          <CommandPalette />
        </body>
      </html>
    </ClerkProvider>
  )
}
```

### 1.3 — Middleware for Route Protection

**File:** `src/middleware.ts` (new file, project root level)

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/prototype(.*)',
  '/dashboard(.*)',
  '/discovery(.*)',
  '/assets(.*)',
  '/cbom(.*)',
  '/graph(.*)',
  '/risk(.*)',
  '/recommendations(.*)',
  '/migration(.*)',
  '/verification(.*)',
  '/ai(.*)',
  '/governance(.*)',
  '/settings(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

### 1.4 — Custom Sign-In Page

**File:** `src/app/sign-in/[[...sign-in]]/page.tsx`  
**File:** `src/app/sign-in/[[...sign-in]]/SignIn.module.css`

Design spec:
- Split panel: 55% ivory left (product story) / 45% white right (Clerk form)
- Left: ECDAT logo, tagline, pipeline flow pills
- Right: Clerk `<SignIn>` component with `appearance` API overrides to match copper color system
- Mobile: stack vertically, left panel becomes compact header

Key Clerk appearance overrides:
```typescript
appearance={{
  variables: {
    colorPrimary: '#B95532',
    colorBackground: '#FFFFFF',
    colorText: '#181917',
    colorInputBackground: '#FFFFFF',
    borderRadius: '6px',
    fontFamily: 'Inter, sans-serif',
  },
  elements: {
    formButtonPrimary: 'bg-copper hover:bg-copper-dark text-white',
    card: 'shadow-none border-0',
    headerTitle: 'text-graphite font-display',
    socialButtonsBlockButton: 'border border-stone',
  }
}}
```

### 1.5 — Custom Sign-Up Page (invite-only for MVP)

**File:** `src/app/sign-up/[[...sign-up]]/page.tsx`

For MVP, sign-up is identical in layout to sign-in but shows the Clerk `<SignUp>` component.  
Add note: "Sign up is available for SIH evaluation. Enterprise access is invitation-only."

### 1.6 — Workspace Creation on First Login

**File:** `src/app/prototype/page.tsx` — add first-login detection

On authenticated load, check if the user has a workspace via the backend API:
```typescript
const workspace = await fetch('/api/workspace', {
  headers: { Authorization: `Bearer ${await getToken()}` }
})
if (!workspace.ok) {
  // Show onboarding: "Connect your first source"
}
```

**Backend endpoint:** `POST /api/workspaces` — creates workspace tied to `clerk_user_id`

### 1.7 — Protected API Routes (Next.js API layer)

**File:** `src/app/api/workspace/route.ts`

All Next.js API routes that call the FastAPI backend must:
1. Verify Clerk session token
2. Extract `userId` from the token
3. Pass `userId` to FastAPI as a header
4. Never trust client-supplied user IDs

```typescript
import { auth } from '@clerk/nextjs/server'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  
  const res = await fetch(`${process.env.API_URL}/workspaces/${userId}`, {
    headers: { 'X-Clerk-User-Id': userId }
  })
  return Response.json(await res.json())
}
```

### 1.8 — Clerk Webhook Sync (optional for MVP)

Register Clerk webhook at `POST /api/webhooks/clerk`:
- Event: `user.created` → create workspace record in PostgreSQL
- Event: `user.deleted` → cleanup workspace + all data

**DoD (Phase 1):**
- [ ] `npm run dev` — unauthenticated visit to `/prototype` redirects to `/sign-in`
- [ ] Sign-in with email/password creates session and redirects to `/prototype`
- [ ] Sign-out clears session, `/prototype` becomes inaccessible again
- [ ] Custom sign-in page renders correctly (split panel, copper button)
- [ ] Mobile layout works
- [ ] Backend `/workspaces` endpoint validates Clerk token header

---

## PHASE 2 — DISCOVERY BACKEND: CORE SCANNERS
**Duration:** Day 4–10  
**Goal:** Real cryptographic evidence from real source code  
**Owner:** Backend engineer (Python)  
**Blocked by:** Phase 0.1 (FastAPI scaffold), Phase 0.2 (DB schema)

### 2.1 — Job Lifecycle Endpoints

**Endpoints to implement:**

```
POST   /api/jobs                  → Create discovery job (queue it)
GET    /api/jobs                  → List jobs for workspace
GET    /api/jobs/{job_id}         → Get job status
DELETE /api/jobs/{job_id}         → Cancel job
GET    /api/jobs/{job_id}/evidence → Get evidence for a job
```

**Job status state machine:**
```
queued → running → completed
                → failed
queued → cancelled
running → cancelled
```

**Pydantic schemas:**
```python
class JobCreate(BaseModel):
    source_type: Literal['git', 'upload', 'certificate']
    source_url: Optional[str]  # For git
    source_content: Optional[str]  # For direct upload (base64)

class JobStatus(BaseModel):
    id: UUID
    status: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    evidence_count: int
    asset_count: int
    error_msg: Optional[str]
```

**Implementation note:** Use Celery + Redis for async job execution. The API creates the job record and returns immediately. Celery worker picks it up and runs the scanner.

### 2.2 — Tree-sitter Source Code Scanner

**File:** `app/services/scanner/source_scanner.py`

**Languages to support (in priority order):**
1. Python (`.py`)
2. Go (`.go`)
3. JavaScript/TypeScript (`.js`, `.ts`, `.tsx`)
4. Java (`.java`) — P1
5. C/C++ (`.c`, `.cpp`, `.h`) — P1

**Crypto patterns to detect:**

```python
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
```

**Tree-sitter scanning algorithm:**
```python
async def scan_file(file_path: str, content: str, language: str) -> list[Evidence]:
    """
    1. Parse file with tree-sitter to get AST
    2. Walk import declarations → extract crypto library imports
    3. Walk function call expressions → extract crypto API calls
    4. For each match, capture: file, line, column, surrounding context
    5. Return list of Evidence objects
    """
    parser = get_parser(language)
    tree = parser.parse(bytes(content, 'utf8'))
    
    findings = []
    
    # Walk imports
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
    
    # Walk API calls
    calls = extract_function_calls(tree)
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
```

### 2.3 — Semgrep Rules Engine

**File:** `app/services/scanner/rules/crypto_rules.yaml`

```yaml
rules:
  - id: ecdat-rsa-keygen-weak
    patterns:
      - pattern: rsa.GenerateKey($RAND, $SIZE)
      - metavariable-comparison:
          metavariable: $SIZE
          comparison: $SIZE < 3072
    message: "RSA key size $SIZE is quantum-vulnerable. Recommend ML-KEM-768 or hybrid."
    severity: ERROR
    languages: [go]
    metadata:
      algorithm: RSA
      vulnerability: quantum
      cwe: CWE-326

  - id: ecdat-sha1-usage
    pattern: sha1.New()
    message: "SHA-1 is cryptographically broken. Recommend SHA-256 or SHA-3-256."
    severity: WARNING
    languages: [go]
    metadata:
      algorithm: SHA-1
      vulnerability: classical

  - id: ecdat-md5-hash
    patterns:
      - pattern: hashlib.md5(...)
      - pattern: hashlib.new('md5', ...)
    message: "MD5 is collision-vulnerable. Recommend SHA-256."
    severity: ERROR
    languages: [python]
    metadata:
      algorithm: MD5
      vulnerability: classical

  - id: ecdat-rsa-python
    pattern: RSA.generate($SIZE)
    message: "RSA key generation detected. Assess key size and quantum risk."
    severity: INFO
    languages: [python]
    metadata:
      algorithm: RSA
      vulnerability: quantum

  - id: ecdat-des-usage
    patterns:
      - pattern: des.NewCipher(...)
      - pattern: des.NewTripleDESCipher(...)
    message: "DES/3DES is deprecated. Recommend AES-256-GCM."
    severity: ERROR
    languages: [go]
    metadata:
      algorithm: DES
      vulnerability: classical

  - id: ecdat-ecdsa-p256
    pattern: elliptic.P256()
    message: "ECDSA P-256 is quantum-vulnerable to Shor's algorithm."
    severity: WARNING
    languages: [go]
    metadata:
      algorithm: ECDSA-P256
      vulnerability: quantum
```

**Run Semgrep programmatically:**
```python
import subprocess, json

async def run_semgrep(repo_path: str) -> list[dict]:
    result = subprocess.run(
        ['semgrep', '--config', 'rules/crypto_rules.yaml',
         '--json', '--quiet', repo_path],
        capture_output=True, text=True
    )
    data = json.loads(result.stdout)
    return data.get('results', [])
```

### 2.4 — Dependency Scanner

**File:** `app/services/scanner/dependency_scanner.py`

**Manifest parsers to implement:**

```python
MANIFEST_PARSERS = {
    'package.json': parse_npm_manifest,
    'requirements.txt': parse_pip_manifest,
    'go.mod': parse_go_manifest,
    'pom.xml': parse_maven_manifest,
    'Cargo.toml': parse_cargo_manifest,
    'pyproject.toml': parse_pyproject_manifest,
    'Gemfile': parse_gemfile_manifest,
}

CRYPTO_PACKAGES = {
    # npm packages
    'jsonwebtoken': {'algo': 'JWT/RSA/HMAC', 'notes': 'Algorithm confusion possible'},
    'bcrypt': {'algo': 'bcrypt', 'notes': 'Password hashing, not quantum-vulnerable'},
    'node-forge': {'algo': 'RSA/AES/SHA', 'notes': 'Multiple crypto primitives'},
    'jose': {'algo': 'JWE/JWS', 'notes': 'Modern JWT library'},
    'crypto-js': {'algo': 'AES/SHA/MD5', 'notes': 'Client-side crypto — audit usage'},
    
    # Python packages
    'cryptography': {'algo': 'RSA/EC/AES/SHA', 'notes': 'Primary Python crypto library'},
    'pycryptodome': {'algo': 'RSA/AES/DES/SHA/MD5', 'notes': 'Multiple primitives'},
    'pycrypto': {'algo': 'RSA/AES/DES', 'notes': 'DEPRECATED — use cryptography instead'},
    'pyOpenSSL': {'algo': 'RSA/EC via OpenSSL', 'notes': 'OpenSSL bindings'},
    'paramiko': {'algo': 'RSA/ECDSA/SSH', 'notes': 'SSH implementation'},
    'pyca/cryptography': {'algo': 'RSA/EC/AES', 'notes': 'Modern Python crypto'},
    
    # Go packages
    'golang.org/x/crypto': {'algo': 'Various', 'notes': 'Extended Go crypto library'},
    'github.com/dgrijalva/jwt-go': {'algo': 'RSA/HMAC', 'notes': 'DEPRECATED JWT library'},
    'github.com/golang-jwt/jwt': {'algo': 'RSA/EC/HMAC', 'notes': 'Current JWT library'},
}
```

**Parser output format:**
```python
@dataclass
class DependencyFinding:
    manifest_file: str
    package_name: str
    version: str
    crypto_relevant: bool
    crypto_capabilities: list[str]
    dependency_path: list[str]  # transitive chain
    notes: str
    confidence: float
```

### 2.5 — Certificate Scanner

**File:** `app/services/scanner/certificate_scanner.py`

**Scan types:**
1. **URL scan:** Connect to HTTPS endpoint, extract certificate chain
2. **File scan:** Parse `.pem`, `.crt`, `.cer`, `.der` files found in the repository
3. **Manifest scan:** Extract certificate URLs from nginx/apache configs

```python
from cryptography import x509
from cryptography.hazmat.backends import default_backend
import ssl, socket

async def scan_certificate_url(hostname: str, port: int = 443) -> CertificateEvidence:
    context = ssl.create_default_context()
    with socket.create_connection((hostname, port), timeout=10) as sock:
        with context.wrap_socket(sock, server_hostname=hostname) as ssock:
            cert_der = ssock.getpeercert(binary_form=True)
    
    cert = x509.load_der_x509_certificate(cert_der, default_backend())
    
    return CertificateEvidence(
        subject=cert.subject.rfc4514_string(),
        issuer=cert.issuer.rfc4514_string(),
        serial_number=str(cert.serial_number),
        not_valid_before=cert.not_valid_before,
        not_valid_after=cert.not_valid_after,
        signature_algorithm=cert.signature_algorithm_oid._name,
        public_key_type=cert.public_key().__class__.__name__,
        key_size=get_key_size(cert.public_key()),
        quantum_vulnerable=is_quantum_vulnerable_cert(cert),
        fingerprint_sha256=cert.fingerprint(hashes.SHA256()).hex(),
        san_domains=extract_san(cert),
    )
```

### 2.6 — Git Repository Cloner

**File:** `app/services/scanner/git_cloner.py`

```python
import git, tempfile, shutil, os

async def clone_and_scan(git_url: str, job_id: str) -> str:
    """
    1. Validate git_url (must be https://, no auth tokens in URL)
    2. Clone to temp directory /tmp/ecdat-scans/{job_id}/
    3. Return temp_path for scanner use
    4. Cleanup temp_path after scan completes
    """
    temp_dir = f"/tmp/ecdat-scans/{job_id}"
    os.makedirs(temp_dir, exist_ok=True)
    
    # Security: only allow public https:// URLs for MVP
    if not git_url.startswith('https://'):
        raise ValueError("Only public HTTPS repositories are supported")
    
    try:
        repo = git.Repo.clone_from(git_url, temp_dir, depth=1)  # shallow clone
        return temp_dir
    except Exception as e:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise

async def cleanup_scan_workspace(job_id: str):
    """Always call this after scan completes, succeeds, or fails."""
    shutil.rmtree(f"/tmp/ecdat-scans/{job_id}", ignore_errors=True)
```

### 2.7 — Scanner Orchestrator

**File:** `app/services/scanner/orchestrator.py`

```python
@celery.task
async def run_discovery_job(job_id: str, workspace_id: str, source_url: str):
    """Main Celery task — orchestrates all scanners."""
    
    await update_job_status(job_id, 'running')
    temp_dir = None
    
    try:
        # 1. Clone repository
        temp_dir = await clone_and_scan(source_url, job_id)
        
        # 2. Find all source files
        files = list_source_files(temp_dir)
        
        # 3. Run source code scanner on each file
        all_evidence = []
        for file_path in files:
            lang = detect_language(file_path)
            if lang:
                content = read_file(file_path)
                evidence = await scan_file(file_path, content, lang)
                all_evidence.extend(evidence)
        
        # 4. Run Semgrep rules engine on repo root
        semgrep_results = await run_semgrep(temp_dir)
        semgrep_evidence = convert_semgrep_to_evidence(semgrep_results)
        all_evidence.extend(semgrep_evidence)
        
        # 5. Run dependency scanner
        manifests = find_manifests(temp_dir)
        for manifest in manifests:
            dep_evidence = await scan_manifest(manifest)
            all_evidence.extend(dep_evidence)
        
        # 6. Run certificate scanner on found cert files
        cert_files = find_cert_files(temp_dir)
        for cert_file in cert_files:
            cert_ev = await scan_cert_file(cert_file)
            all_evidence.extend([cert_ev])
        
        # 7. Persist all evidence to database
        await persist_evidence_batch(all_evidence, job_id, workspace_id)
        
        # 8. Update job status
        await update_job_status(job_id, 'completed', evidence_count=len(all_evidence))
        
    except Exception as e:
        await update_job_status(job_id, 'failed', error_msg=str(e))
        raise
    finally:
        if temp_dir:
            await cleanup_scan_workspace(job_id)
```

**DoD (Phase 2):**
- [ ] `POST /api/jobs` with a real GitHub URL creates and queues a job
- [ ] Job transitions: queued → running → completed (observable via `GET /api/jobs/{id}`)
- [ ] Tree-sitter scanner detects RSA, SHA-1, AES, ECDH in Python/Go/JS test files
- [ ] Semgrep rules fire correctly on known vulnerable code patterns
- [ ] Dependency scanner extracts crypto libraries from package.json, requirements.txt, go.mod
- [ ] Certificate scanner extracts algorithm and key size from a real certificate URL
- [ ] All evidence persisted to `evidence` table with correct metadata
- [ ] Temp directories cleaned up after job completion or failure

---

## PHASE 3 — NORMALIZATION ENGINE + CBOM
**Duration:** Day 8–12  
**Goal:** Raw evidence → canonical assets → CycloneDX CBOM  
**Owner:** Backend engineer  
**Blocked by:** Phase 2 (evidence in database)

### 3.1 — Algorithm Alias Registry

**File:** `app/services/normalizer/alias_registry.py`

The registry maps every known variant of an algorithm name to its canonical form.

```python
ALGORITHM_ALIASES = {
    # RSA variants → canonical: RSA:{key_size}
    'rsa': 'RSA',
    'rsaEncryption': 'RSA',
    'rsassa-pkcs1-v1_5': 'RSA',
    'sha256WithRSAEncryption': 'RSA',
    'sha1WithRSAEncryption': 'RSA',
    '1.2.840.113549.1.1.1': 'RSA',  # OID
    
    # EC variants → canonical: EC:{curve}
    'ecdsa': 'ECDSA',
    'ecPublicKey': 'ECDSA',
    '1.2.840.10045.2.1': 'ECDSA',  # OID
    'p-256': 'ECDSA-P256',
    'prime256v1': 'ECDSA-P256',
    'secp256r1': 'ECDSA-P256',
    
    # SHA variants
    'sha1': 'SHA-1',
    'sha-1': 'SHA-1',
    'SHA1': 'SHA-1',
    '1.3.14.3.2.26': 'SHA-1',  # OID
    'sha256': 'SHA-256',
    'sha-256': 'SHA-256',
    'SHA256': 'SHA-256',
    '2.16.840.1.101.3.4.2.1': 'SHA-256',  # OID
    'sha384': 'SHA-384',
    'sha512': 'SHA-512',
    'sha3_256': 'SHA3-256',
    
    # MD5
    'md5': 'MD5',
    'MD5': 'MD5',
    '1.2.840.113549.2.5': 'MD5',  # OID
    
    # AES variants
    'aes': 'AES',
    'aes-128': 'AES-128',
    'aes-256': 'AES-256',
    'aes_256_gcm': 'AES-256-GCM',
    'AES256': 'AES-256',
    
    # DES
    'des': 'DES',
    '3des': 'DES3',
    'triple-des': 'DES3',
    'tripledes': 'DES3',
    'des-ede3': 'DES3',
    
    # PQC (already canonical)
    'ml-kem': 'ML-KEM',
    'mlkem': 'ML-KEM',
    'kyber': 'ML-KEM',
    'ml-dsa': 'ML-DSA',
    'mldsa': 'ML-DSA',
    'dilithium': 'ML-DSA',
    'slh-dsa': 'SLH-DSA',
    'sphincs+': 'SLH-DSA',
    'sphincsplus': 'SLH-DSA',
}

def normalize_algorithm(raw: str) -> str:
    """Normalize raw algorithm string to canonical form."""
    cleaned = raw.strip().lower().replace(' ', '-').replace('_', '-')
    return ALGORITHM_ALIASES.get(cleaned, ALGORITHM_ALIASES.get(raw, raw.upper()))
```

### 3.2 — Quantum Vulnerability Lookup

**File:** `app/services/normalizer/vulnerability_registry.py`

```python
QUANTUM_VULNERABLE = {
    'RSA',       # Shor's algorithm breaks factorization
    'ECDSA',     # Shor's algorithm breaks discrete log
    'ECDH',      # Shor's algorithm
    'ECDSA-P256',
    'ECDSA-P384',
    'DH',        # Discrete log problem
    'DSA',       # Discrete log problem
    'ElGamal',   # Discrete log problem
}

CLASSICALLY_VULNERABLE = {
    'SHA-1':  'Collision attacks demonstrated (Shattered, 2017)',
    'MD5':    'Collision attacks trivial (FLAME malware used MD5 collisions)',
    'MD4':    'Completely broken',
    'DES':    'Key size 56-bit — exhausted by brute force',
    'DES3':   'Theoretical attacks, deprecated by NIST 2023',
    'RC4':    'Multiple biases, prohibited in TLS (RFC 7465)',
    'RC2':    'Weak, deprecated',
    'RSA-512': 'Factored in hours on modern hardware',
    'RSA-1024': 'Factored with sufficient compute, NIST deprecated 2015',
}

GROVER_WEAKENED = {
    # Grover's algorithm halves effective security
    'AES-128': 'Grover reduces to ~64-bit security — upgrade to AES-256',
    'SHA-256': 'Grover reduces to ~128-bit — still acceptable per NIST',
    'SHA-384': 'Grover reduces to ~192-bit — acceptable',
    'HMAC-SHA256': 'See SHA-256',
}

def is_quantum_vulnerable(canonical_algo: str, key_size: int = None) -> bool:
    if canonical_algo in QUANTUM_VULNERABLE:
        return True
    if canonical_algo == 'RSA' and key_size and key_size < 3072:
        return True
    return False

def is_classically_vulnerable(canonical_algo: str, key_size: int = None) -> bool:
    if canonical_algo in CLASSICALLY_VULNERABLE:
        return True
    if canonical_algo == 'RSA' and key_size and key_size < 2048:
        return True
    return False
```

### 3.3 — Asset Resolver

**File:** `app/services/normalizer/asset_resolver.py`

Takes raw evidence → produces canonical asset → deduplicates against existing workspace assets.

```python
async def resolve_evidence_to_asset(evidence: Evidence, workspace_id: str) -> CryptoAsset:
    """
    1. Extract algorithm name from evidence raw_match + metadata
    2. Normalize algorithm name via alias registry
    3. Extract key size if present
    4. Check quantum/classical vulnerability
    5. Look up OID if applicable
    6. Find or create canonical asset in database
    """
    raw_algo = extract_algorithm_from_evidence(evidence)
    canonical = normalize_algorithm(raw_algo)
    key_size = extract_key_size(evidence)
    family = get_algorithm_family(canonical)
    
    # Canonical ID includes workspace scope
    canonical_id = f"{canonical}:{key_size}" if key_size else canonical
    
    # Upsert (find or create)
    asset = await db.execute(
        """
        INSERT INTO crypto_assets 
            (workspace_id, algorithm_canonical, algorithm_family, 
             algorithm_name, key_size, quantum_vulnerable, classical_vulnerable)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (workspace_id, algorithm_canonical) 
        DO UPDATE SET last_seen = NOW()
        RETURNING *
        """,
        workspace_id, canonical_id, family, canonical, key_size,
        is_quantum_vulnerable(canonical, key_size),
        is_classically_vulnerable(canonical, key_size),
    )
    
    # Link evidence → asset
    await db.execute(
        "INSERT INTO evidence_assets (evidence_id, asset_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        evidence.id, asset.id
    )
    
    return asset
```

### 3.4 — CycloneDX CBOM Generator

**File:** `app/services/cbom_generator.py`

Produces a valid CycloneDX v1.6 CBOM in JSON format from canonical assets.

```python
import uuid
from datetime import datetime

def generate_cyclonedx_cbom(assets: list[CryptoAsset], workspace: Workspace, job: DiscoveryJob) -> dict:
    """Generate CycloneDX v1.6 CBOM JSON."""
    return {
        "bomFormat": "CycloneDX",
        "specVersion": "1.6",
        "serialNumber": f"urn:uuid:{uuid.uuid4()}",
        "version": 1,
        "metadata": {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "tools": [{
                "vendor": "LatentManifold",
                "name": "ECDAT",
                "version": "0.1.0",
            }],
            "component": {
                "type": "application",
                "name": workspace.name,
                "version": "scanned"
            }
        },
        "components": [
            {
                "type": "cryptographic-asset",
                "bom-ref": str(asset.id),
                "name": asset.algorithm_canonical,
                "cryptoProperties": {
                    "assetType": map_function_to_cdx_type(asset.function),
                    "algorithmProperties": {
                        "primitive": map_family_to_cdx_primitive(asset.algorithm_family),
                        "executionEnvironment": "unknown",
                        "implementationPlatform": "unknown",
                        "certificationLevel": [],
                        "cryptoFunctions": [map_function_to_cdx_function(asset.function)],
                        "classicalSecurityLevel": get_classical_security_bits(asset),
                        "nistQuantumSecurityLevel": get_pqc_security_level(asset),
                    },
                    "oid": asset.oid or "",
                },
                "evidence": {
                    "occurrences": [
                        {
                            "bom-ref": str(ev.id),
                            "location": ev.file_path or "",
                            "line": ev.line_number,
                            "offset": 0,
                            "symbol": ev.raw_match,
                            "additionalContext": ev.context_lines or ""
                        }
                        for ev in asset.evidence_list
                    ]
                },
                "properties": [
                    {"name": "ecdat:quantumVulnerable", "value": str(asset.quantum_vulnerable).lower()},
                    {"name": "ecdat:classicalVulnerable", "value": str(asset.classical_vulnerable).lower()},
                    {"name": "ecdat:keySize", "value": str(asset.key_size) if asset.key_size else "unknown"},
                    {"name": "ecdat:compositeRisk", "value": asset.risk_score.composite_priority if asset.risk_score else "unknown"},
                ]
            }
            for asset in assets
        ]
    }
```

**DoD (Phase 3):**
- [ ] `SHA256`, `sha256`, `sha-256`, `SHA-256`, OID `2.16.840.1.101.3.4.2.1` all normalize to `SHA-256`
- [ ] `RSA-2048`, `RSA/2048`, `rsaEncryption` all normalize to `RSA:2048`
- [ ] Duplicate assets in same workspace are deduplicated (upsert works)
- [ ] CycloneDX CBOM JSON validates against CycloneDX schema v1.6
- [ ] `GET /api/workspaces/{id}/cbom` returns valid CBOM JSON
- [ ] CBOM includes evidence references (file + line per asset occurrence)

---

## PHASE 4 — QUANTUM RISK ENGINE
**Duration:** Day 11–14  
**Goal:** Every canonical asset gets a computed, explainable risk score  
**Owner:** Backend engineer  
**Blocked by:** Phase 3 (canonical assets exist)

### 4.1 — Mosca Risk Calculator Per Asset

**Risk is multi-dimensional (Phase 6 PDF — 7 dimensions, NOT a single number):**
1. **Quantum Exposure** — Shor/Grover applicability to this specific algorithm
2. **Classical Security Risk** — CVEs, deprecated status, weak key size
3. **Mosca Result** — X + Y vs Z calculation
4. **Business Criticality** — asset context, data classification (Public/Internal/Confidential/Sensitive/Strategic)
5. **Data Lifetime (X)** — how long must this data remain secure? (configurable per workspace)
6. **Migration Complexity** — blast radius, protocol constraints, HSM dependencies
7. **Dependency Centrality** — how many applications depend on this algorithm?

**Important from Phase 6 PDF:** `Z` (quantum threat horizon) must be a **configurable workspace setting** (optimistic/expected/conservative scenarios). Never hardcode it.

**File:** `app/services/risk_engine.py`

```python
QUANTUM_THREAT_HORIZON_DEFAULT = 12  # years (conservative estimate)
DEFAULT_MIGRATION_TIME = {
    'RSA': 3.0, 'ECDSA': 2.5, 'ECDH': 2.5,
    'SHA-1': 0.5, 'MD5': 0.5, 'DES': 0.5, 'DES3': 1.0,
    'AES-128': 1.0,
}

def calculate_mosca_risk(
    data_lifetime_years: float,
    migration_time_years: float,
    threat_horizon_years: float = QUANTUM_THREAT_HORIZON_DEFAULT,
) -> dict:
    total = data_lifetime_years + migration_time_years
    difference = threat_horizon_years - total
    
    if total > threat_horizon_years:
        level = 'CRITICAL'
        explanation = (
            f"X ({data_lifetime_years}y) + Y ({migration_time_years}y) = {total}y "
            f"exceeds Z ({threat_horizon_years}y). "
            f"Harvest-Now-Decrypt-Later window is OPEN NOW."
        )
    elif difference <= 2:
        level = 'HIGH'
        explanation = f"Only {difference:.1f}y margin. Begin migration immediately."
    elif difference <= 6:
        level = 'MEDIUM'
        explanation = f"{difference:.1f}y margin. Active planning required."
    else:
        level = 'LOW'
        explanation = f"{difference:.1f}y margin. Monitor quantum timeline."
    
    return {
        'level': level,
        'x_data_lifetime': data_lifetime_years,
        'y_migration_time': migration_time_years,
        'z_threat_horizon': threat_horizon_years,
        'total_xy': total,
        'margin': difference,
        'explanation': explanation,
    }

async def compute_asset_risk(asset: CryptoAsset) -> RiskScore:
    """Compute multi-dimensional risk for a canonical asset."""
    
    # 1. Quantum exposure
    quantum_exposure = 'HIGH' if asset.quantum_vulnerable else 'NONE'
    
    # 2. Classical security risk
    if asset.classical_vulnerable:
        classical_risk = 'CRITICAL'
    elif asset.key_size and is_weak_key_size(asset.algorithm_family, asset.key_size):
        classical_risk = 'HIGH'
    else:
        classical_risk = 'LOW'
    
    # 3. Mosca calculation with defaults (user can override)
    migration_time = DEFAULT_MIGRATION_TIME.get(asset.algorithm_name, 2.0)
    mosca = calculate_mosca_risk(
        data_lifetime_years=7.0,  # default — overridable per workspace
        migration_time_years=migration_time,
    )
    
    # 4. Composite priority
    if classical_risk == 'CRITICAL' or mosca['level'] == 'CRITICAL':
        composite = 'CRITICAL'
    elif classical_risk == 'HIGH' or mosca['level'] == 'HIGH' or quantum_exposure == 'HIGH':
        composite = 'HIGH'
    elif mosca['level'] == 'MEDIUM':
        composite = 'MEDIUM'
    else:
        composite = 'LOW'
    
    return RiskScore(
        asset_id=asset.id,
        workspace_id=asset.workspace_id,
        quantum_exposure=quantum_exposure,
        classical_risk=classical_risk,
        mosca_result=mosca['level'],
        data_lifetime_years=mosca['x_data_lifetime'],
        migration_time_years=mosca['y_migration_time'],
        threat_horizon_years=mosca['z_threat_horizon'],
        composite_priority=composite,
        risk_explanation={
            'quantum': {'level': quantum_exposure, 'reason': get_quantum_reason(asset)},
            'classical': {'level': classical_risk, 'reason': get_classical_reason(asset)},
            'mosca': mosca,
            'composite': composite,
        },
    )
```

### 4.2 — Risk API Endpoints

```
GET  /api/workspaces/{id}/risk           → All assets with risk scores, sorted by priority
GET  /api/workspaces/{id}/risk/summary   → Counts: critical, high, medium, low
GET  /api/assets/{id}/risk               → Risk detail for one asset
POST /api/assets/{id}/risk/recalculate   → Recalculate with custom parameters
```

**DoD (Phase 4):**
- [ ] Every canonical asset has a computed risk score after normalization
- [ ] RSA-2048 → CRITICAL or HIGH quantum exposure
- [ ] SHA-1 → CRITICAL classical risk
- [ ] AES-256 → LOW (no significant vulnerability)
- [ ] ML-KEM-768 → LOW (PQC-safe)
- [ ] Risk explanation is a structured JSON object (every field has a reason)
- [ ] `/risk/summary` returns correct counts matching the asset table
- [ ] Risk recalculation with custom data_lifetime works correctly

---

## PHASE 5 — PQC RECOMMENDATION ENGINE
**Duration:** Day 14–17  
**Goal:** Every vulnerable asset gets a ranked, constrained PQC recommendation  
**Owner:** Backend engineer  
**Blocked by:** Phase 4 (risk scores computed)

### 5.1 — Recommendation Rule Table

**From Phase 7 PDF:** Recommendation engine must account for hard and soft constraints:
- **Hard constraints:** HSM compatibility, regulatory compliance (FIPS/CNSA), client interoperability
- **Soft constraints:** Performance budget, key/signature size, bandwidth
- Recommendation must distinguish: `PRIMARY` (best fit), `ALTERNATIVE` (if constraints block primary), `REJECTED` (why not)
- Output includes: `recommendation_explanation` (why this algo, why not others)

**File:** `app/services/recommendation_engine.py`

```python
# Recommendation lookup: (algorithm_family, function) → candidates
RECOMMENDATION_TABLE = {
    ('RSA', 'KEY_EXCHANGE'): {
        'primary': 'ML-KEM-768',
        'hybrid': 'ML-KEM-768 + X25519',
        'fallback': 'ML-KEM-512',
        'nist_standard': 'FIPS 203',
        'reasoning': (
            'ML-KEM (CRYSTALS-Kyber) is the NIST-standardized KEM for key exchange. '
            'The hybrid path (ML-KEM-768 + X25519) provides classical safety during transition. '
            'Avoid direct RSA key transport — replace with KEM encapsulation.'
        ),
        'migration_complexity': 'HIGH',
        'protocol_notes': 'TLS 1.3 supports ML-KEM in hybrid mode via draft-ietf-tls-hybrid-design.',
    },
    ('RSA', 'SIGNATURE'): {
        'primary': 'ML-DSA-65',
        'hybrid': 'ML-DSA-65 + ECDSA-P256',
        'fallback': 'SLH-DSA-128s',
        'nist_standard': 'FIPS 204',
        'reasoning': (
            'ML-DSA (CRYSTALS-Dilithium) is the primary NIST-standardized digital signature. '
            'ML-DSA-65 offers NIST security level 3. '
            'SLH-DSA (SPHINCS+) is available as a hash-based fallback if lattice assumptions are questioned.'
        ),
        'migration_complexity': 'MEDIUM',
    },
    ('ECDSA', 'SIGNATURE'): {
        'primary': 'ML-DSA-65',
        'hybrid': 'ML-DSA-65 + ECDSA-P256',
        'fallback': 'SLH-DSA-128f',
        'nist_standard': 'FIPS 204',
        'reasoning': 'ECDSA is broken by Shor\'s algorithm. Replace with ML-DSA-65.',
        'migration_complexity': 'MEDIUM',
    },
    ('ECDH', 'KEY_EXCHANGE'): {
        'primary': 'ML-KEM-768',
        'hybrid': 'ML-KEM-768 + X25519',
        'fallback': 'ML-KEM-512',
        'nist_standard': 'FIPS 203',
        'reasoning': 'ECDH key agreement is broken by Shor. ML-KEM provides equivalent KEM functionality.',
        'migration_complexity': 'MEDIUM',
    },
    ('SHA-1', 'HASH'): {
        'primary': 'SHA-256',
        'hybrid': None,  # Direct replacement, no hybrid needed
        'fallback': 'SHA3-256',
        'nist_standard': 'FIPS 180-4',
        'reasoning': 'SHA-1 is collision-vulnerable (Shattered 2017). SHA-256 is the standard replacement.',
        'migration_complexity': 'LOW',
    },
    ('MD5', 'HASH'): {
        'primary': 'SHA-256',
        'hybrid': None,
        'fallback': 'SHA3-256',
        'nist_standard': 'FIPS 180-4',
        'reasoning': 'MD5 is cryptographically broken. Replace with SHA-256 immediately.',
        'migration_complexity': 'LOW',
    },
    ('DES', 'ENCRYPTION'): {
        'primary': 'AES-256-GCM',
        'hybrid': None,
        'fallback': 'ChaCha20-Poly1305',
        'nist_standard': 'FIPS 197',
        'reasoning': 'DES and 3DES are deprecated by NIST. AES-256-GCM provides authenticated encryption.',
        'migration_complexity': 'MEDIUM',
    },
    ('DES3', 'ENCRYPTION'): {
        'primary': 'AES-256-GCM',
        'hybrid': None,
        'fallback': 'ChaCha20-Poly1305',
        'nist_standard': 'FIPS 197',
        'reasoning': '3DES deprecated by NIST SP 800-131A Rev. 2. AES-256-GCM is the standard replacement.',
        'migration_complexity': 'MEDIUM',
    },
    ('AES', 'ENCRYPTION'): {  # AES-128 specifically
        'primary': 'AES-256-GCM',
        'hybrid': None,
        'fallback': 'ChaCha20-Poly1305',
        'nist_standard': 'FIPS 197',
        'reasoning': 'AES-128 has effective 64-bit security against Grover\'s algorithm. Upgrade to AES-256.',
        'migration_complexity': 'LOW',
        'condition': lambda asset: asset.key_size and asset.key_size < 256,
    },
}

async def generate_recommendation(asset: CryptoAsset) -> Recommendation:
    key = (asset.algorithm_family, asset.function or 'UNKNOWN')
    rule = RECOMMENDATION_TABLE.get(key)
    
    if not rule:
        # No recommendation for this asset type (e.g., AES-256 — already safe)
        return None
    
    # Check condition if present
    if 'condition' in rule and not rule['condition'](asset):
        return None  # Asset meets condition for safe classification
    
    return Recommendation(
        asset_id=asset.id,
        workspace_id=asset.workspace_id,
        current_algo=asset.algorithm_canonical,
        recommended_algo=rule['primary'],
        candidate_algo=rule.get('hybrid') or rule.get('fallback'),
        hybrid_path=rule.get('hybrid'),
        reasoning={
            'primary_recommendation': rule['primary'],
            'hybrid_path': rule.get('hybrid'),
            'fallback': rule.get('fallback'),
            'nist_standard': rule.get('nist_standard'),
            'explanation': rule['reasoning'],
            'migration_complexity': rule.get('migration_complexity', 'MEDIUM'),
            'protocol_notes': rule.get('protocol_notes', ''),
        },
        nist_standard=rule.get('nist_standard'),
        migration_complexity=rule.get('migration_complexity', 'MEDIUM'),
        confidence=0.90,
    )
```

**DoD (Phase 5):**
- [ ] RSA (signature) → ML-DSA-65 recommendation with hybrid path
- [ ] RSA (key exchange) → ML-KEM-768 recommendation
- [ ] SHA-1 → SHA-256 recommendation (no hybrid needed)
- [ ] AES-256 → no recommendation generated (already safe)
- [ ] ML-KEM-768 → no recommendation generated (PQC-safe)
- [ ] Every recommendation includes: primary, hybrid path, fallback, NIST standard, reasoning, complexity
- [ ] `GET /api/workspaces/{id}/recommendations` returns all asset recommendations

---

## PHASE 6 — FRONTEND WIRING: DASHBOARD
**Duration:** Day 15–20  
**Goal:** Replace all hardcoded frontend state with real API data  
**Owner:** Frontend engineer  
**Blocked by:** Phases 2–5 (backend pipeline functional), Phase 1 (Clerk auth)

**From Phase 18 PDF — Migration states to track per asset in UI:**
```
UNKNOWN → NOT_STARTED → ASSESSED → PLANNED → READY 
→ IN_DEVELOPMENT → TESTING → PILOT → ROLLOUT 
→ VERIFICATION → MIGRATED → RETIRED
Also: BLOCKED, EXCEPTION
```

**From Phase 18 PDF — Migration order is topological:**
HSM → Crypto Provider → PKI → Application → Client  
(ECDAT should derive this order from the Knowledge Graph)

### 6.1 — API Client Layer

**File:** `src/lib/api.ts`

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token: string,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `API error ${res.status}`)
  }
  return res.json()
}

// Typed API functions
export const api = {
  workspace: {
    get: (token: string) => apiRequest('/workspaces/me', {}, token),
    create: (name: string, token: string) =>
      apiRequest('/workspaces', { method: 'POST', body: JSON.stringify({ name }) }, token),
  },
  jobs: {
    list: (workspaceId: string, token: string) =>
      apiRequest(`/workspaces/${workspaceId}/jobs`, {}, token),
    create: (workspaceId: string, sourceUrl: string, token: string) =>
      apiRequest(`/workspaces/${workspaceId}/jobs`, {
        method: 'POST',
        body: JSON.stringify({ source_type: 'git', source_url: sourceUrl }),
      }, token),
    get: (jobId: string, token: string) =>
      apiRequest(`/jobs/${jobId}`, {}, token),
  },
  assets: {
    list: (workspaceId: string, token: string) =>
      apiRequest(`/workspaces/${workspaceId}/assets`, {}, token),
    get: (assetId: string, token: string) =>
      apiRequest(`/assets/${assetId}`, {}, token),
  },
  risk: {
    summary: (workspaceId: string, token: string) =>
      apiRequest(`/workspaces/${workspaceId}/risk/summary`, {}, token),
    queue: (workspaceId: string, token: string) =>
      apiRequest(`/workspaces/${workspaceId}/risk?sort=priority&limit=10`, {}, token),
  },
  cbom: {
    export: (workspaceId: string, token: string) =>
      apiRequest(`/workspaces/${workspaceId}/cbom`, {}, token),
  },
}
```

### 6.2 — Authenticated Layout with Sidebar

**File:** `src/app/prototype/layout.tsx` (new file)

Persistent sidebar layout for all authenticated pages. Uses Clerk `useUser()` for identity at sidebar bottom.

```typescript
'use client'
import { useUser } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import styles from './PrototypeLayout.module.css'

const NAV_ITEMS = [
  { section: 'WORKSPACE', items: [
    { href: '/prototype', label: 'Command Center', icon: '⊞' },
    { href: '/prototype/discovery', label: 'Discovery', icon: '◎' },
  ]},
  { section: 'ANALYZE', items: [
    { href: '/prototype/assets', label: 'Cryptographic Inventory', icon: '≋' },
    { href: '/prototype/graph', label: 'Dependency Graph', icon: '⌥' },
    { href: '/prototype/risk', label: 'Risk', icon: '△' },
  ]},
  { section: 'DECIDE', items: [
    { href: '/prototype/recommendations', label: 'Recommendations', icon: '↗' },
    { href: '/prototype/migration', label: 'Migration', icon: '⊡' },
  ]},
  { section: 'VERIFY', items: [
    { href: '/prototype/verification', label: 'Verification', icon: '✓' },
  ]},
  { section: 'AI', items: [
    { href: '/prototype/ai', label: 'AI Analyst', icon: '◈' },
  ]},
]
```

### 6.3 — Command Center with Real Data

**Replace** `src/app/prototype/page.tsx` hardcoded state with API calls:

```typescript
// Replace hardcoded assets array with:
const { data: riskSummary } = useSWR(
  workspace ? `/risk/summary/${workspace.id}` : null,
  () => api.risk.summary(workspace.id, token)
)

const { data: jobs } = useSWR(
  workspace ? `/jobs/${workspace.id}` : null,
  () => api.jobs.list(workspace.id, token),
  { refreshInterval: 5000 }  // Poll every 5s for running jobs
)
```

**Empty state component:**
```typescript
function EmptyCommandCenter({ onConnectSource }) {
  return (
    <div className={styles.emptyState}>
      <h2>Your cryptographic inventory is empty.</h2>
      <p>Connect a repository to begin building your cryptographic posture.</p>
      <input
        type="url"
        placeholder="https://github.com/org/repository"
        className={styles.sourceInput}
      />
      <button onClick={onConnectSource}>START DISCOVERY →</button>
      <p className={styles.demoNote}>
        Or try a demo scan with a pre-configured test repository.
      </p>
    </div>
  )
}
```

### 6.4 — Evidence Viewer Component

**File:** `src/components/EvidenceViewer.tsx`

Shows: file path, line number, surrounding code context, detector, confidence badge.

```typescript
interface EvidenceViewerProps {
  evidence: Evidence[]
  assetName: string
}

// Evidence card shows:
// - File path (monospace, clickable if GitHub URL known)
// - Line number badge
// - Code context (3 lines, syntax highlighted, vulnerable line highlighted in amber)
// - Detector badge (TREE-SITTER / SEMGREP / X509 / MANIFEST)
// - Confidence percentage
```

### 6.5 — Job Status Polling

**File:** `src/components/JobStatus.tsx`

For running jobs, poll every 3 seconds until completed/failed:
```typescript
useEffect(() => {
  if (job.status === 'running') {
    const interval = setInterval(async () => {
      const updated = await api.jobs.get(job.id, token)
      if (updated.status !== 'running') {
        clearInterval(interval)
        mutate() // Refresh SWR cache
      }
    }, 3000)
    return () => clearInterval(interval)
  }
}, [job.status])
```

**DoD (Phase 6):**
- [ ] Dashboard shows real metrics from API (not hardcoded numbers)
- [ ] Empty state appears when no workspace/no jobs exist
- [ ] "Connect source" form creates a real discovery job
- [ ] Job status updates in real-time (polling visible)
- [ ] Asset list populates from real database after job completes
- [ ] Risk priority queue shows real risk scores from database
- [ ] Evidence viewer shows file + line + context for each finding
- [ ] CBOM export downloads real CycloneDX JSON file
- [ ] Sidebar navigation works for all routes

---

## PHASE 7 — TESTING + DEMO PREPARATION
**Duration:** Day 18–21  
**Goal:** Verified correctness + stable demo environment  
**Owner:** Entire team  
**Blocked by:** Phases 2–6

### 7.1 — Ground Truth Test Repository

Create a test repository: `ecdat-test-fixtures/`

```
ecdat-test-fixtures/
├── python/
│   ├── vulnerable.py         ← RSA-2048, SHA-1, MD5, DES
│   ├── safe.py               ← AES-256-GCM, SHA-256, ML-KEM
│   └── mixed.py              ← Mix of safe and vulnerable
├── go/
│   ├── vulnerable.go         ← rsa.GenerateKey(2048), sha1.New()
│   ├── safe.go               ← sha256.New(), aes.NewCipher (256-bit)
│   └── certificates.go       ← TLS config with cipher suites
├── javascript/
│   ├── vulnerable.js         ← crypto.createHash('md5'), des-ede3-cbc
│   └── safe.js               ← crypto.subtle, AES-GCM
├── dependencies/
│   ├── package.json          ← jsonwebtoken, crypto-js
│   ├── requirements.txt      ← pycryptodome, pyOpenSSL
│   └── go.mod                ← golang.org/x/crypto
└── EXPECTED_FINDINGS.json    ← Ground truth for test assertions
```

**`EXPECTED_FINDINGS.json`:**
```json
{
  "expected_assets": [
    {"canonical": "RSA:2048", "quantum_vulnerable": true, "files": ["python/vulnerable.py", "go/vulnerable.go"]},
    {"canonical": "SHA-1", "classical_vulnerable": true, "files": ["python/vulnerable.py", "go/vulnerable.go"]},
    {"canonical": "MD5", "classical_vulnerable": true, "files": ["python/vulnerable.py", "javascript/vulnerable.js"]},
    {"canonical": "AES-256", "quantum_vulnerable": false, "files": ["python/safe.py"]},
    {"canonical": "SHA-256", "quantum_vulnerable": false, "files": ["go/safe.go"]}
  ],
  "expected_deps": ["jsonwebtoken", "pycryptodome"],
  "min_precision": 0.90,
  "min_recall": 0.85
}
```

### 7.2 — Unit Tests

**`tests/test_normalizer.py`:**
```python
@pytest.mark.parametrize("raw,expected", [
    ("SHA256", "SHA-256"),
    ("sha-256", "SHA-256"),
    ("sha256", "SHA-256"),
    ("2.16.840.1.101.3.4.2.1", "SHA-256"),
    ("SHA1", "SHA-1"),
    ("sha1", "SHA-1"),
    ("RSA-2048", "RSA:2048"),
    ("rsaEncryption", "RSA"),
    ("ml-kem", "ML-KEM"),
    ("kyber", "ML-KEM"),
    ("dilithium", "ML-DSA"),
])
def test_normalize_algorithm(raw, expected):
    assert normalize_algorithm(raw) == expected
```

**`tests/test_risk_engine.py`:**
```python
def test_mosca_critical():
    result = calculate_mosca_risk(data_lifetime=10, migration_time=5, threat_horizon=12)
    assert result['level'] == 'CRITICAL'

def test_mosca_low():
    result = calculate_mosca_risk(data_lifetime=2, migration_time=1, threat_horizon=12)
    assert result['level'] == 'LOW'

def test_rsa_quantum_vulnerable():
    assert is_quantum_vulnerable('RSA', key_size=2048) == True

def test_aes256_not_quantum_vulnerable():
    assert is_quantum_vulnerable('AES-256', key_size=256) == False
```

**`tests/test_scanner.py`:**
```python
def test_treesitter_finds_rsa_python():
    code = 'from cryptography.hazmat.primitives.asymmetric import rsa\nkey = rsa.generate_private_key(65537, 2048, backend())'
    findings = scan_file('test.py', code, 'python')
    assert any('rsa' in f.raw_match.lower() for f in findings)

def test_semgrep_finds_sha1_go():
    # Uses test fixture file
    results = run_semgrep_sync('tests/fixtures/go/vulnerable.go')
    assert any(r['check_id'] == 'ecdat-sha1-usage' for r in results)
```

### 7.3 — Demo Scan Target

Pre-scan a real public repository before the SIH demo. Recommended targets:
- `https://github.com/nicowillis/crypto-vulnerabilities` (small, known crypto vulns)
- `https://github.com/ECDAT-Demo/demo-app` (create a purpose-built demo repo)

**Demo repository setup:**
```
ecdat-demo-app/
├── README.md       ← "Demo application for ECDAT scanning"
├── auth/
│   ├── token.go    ← RSA-2048 signing, ECDH key exchange
│   └── hash.go     ← SHA-1 password hashing
├── api/
│   └── gateway.py  ← RSA signing, MD5 request signing
├── deps/
│   ├── package.json ← jsonwebtoken (RS256)
│   └── go.mod       ← crypto/rsa, crypto/sha1
```

### 7.4 — Demo Script (6 minutes)

```
00:00 — Open ECDAT website → show public landing
00:30 — "Let's sign in and run a real scan"
00:45 — Sign in with Clerk
01:00 — Command Center (empty state with "Connect Source")
01:15 — Paste demo repo GitHub URL → Start Discovery
01:30 — Job queued → running (show real-time log polling)
02:30 — Job completes → "8 cryptographic assets discovered"
02:45 — Walk through asset list: RSA-2048 (CRITICAL), SHA-1 (HIGH)...
03:00 — Click RSA-2048 → Asset Detail → Evidence viewer → file + line
03:30 — Risk tab → explain Mosca inequality with real asset values
04:00 — Recommendation: RSA-2048 → ML-KEM-768 (hybrid path)
04:30 — Download CBOM JSON → show CycloneDX format
05:00 — "This is ECDAT: real evidence, real risk, real recommendations"
05:30 — Questions
```

**DoD (Phase 7):**
- [ ] Scanner test suite passes with > 90% precision on ground truth fixtures
- [ ] Normalization unit tests: all 50+ alias variants pass
- [ ] Risk calculation unit tests: boundary conditions correct
- [ ] Demo repository pre-scanned, results stable and reproducible
- [ ] Demo script rehearsed and timed
- [ ] All synthetic data in existing UI labeled `[DEMONSTRATION DATA]`
- [ ] Empty states show correct CTAs
- [ ] Backend handles GitHub rate limit gracefully (error + retry UI)

---

## PHASE 8 — AI ANALYST (V2, Post-SIH)
**Duration:** 2–3 weeks post-SIH  
**Goal:** Evidence-grounded AI analyst accessible in the authenticated workspace  
**Owner:** AI/Backend engineer  
**Blocked by:** Phases 2–6

### 8.1 — RAG System Design
- Store evidence + asset summaries in PostgreSQL with `pgvector` extension
- Build evidence embeddings using `text-embedding-3-small` (OpenAI) or local model
- Analyst query → embed query → retrieve top-K evidence items → LLM prompt

### 8.2 — LLM Prompt Design
```
SYSTEM: You are ECDAT's cryptographic analyst. Answer only based on the provided evidence. 
        Never invent cryptographic assets or risk scores. 
        Always cite evidence_id in your response.
        If you cannot answer from evidence, say "I don't have evidence for this."

CONTEXT: {retrieved_evidence_json}

USER: {analyst_query}

RESPONSE FORMAT: {schema with evidence_citations: [evidence_id], confidence: float, explanation: str}
```

### 8.3 — Output Validation
- All AI responses validated against Pydantic schema
- `evidence_citations` field must contain only real evidence IDs from the database
- Responses with hallucinated asset names are rejected and retried

---

## PHASE 9 — KNOWLEDGE GRAPH / NEO4J (V2, Post-SIH)
**Duration:** 2–3 weeks post-SIH  
**Goal:** Blast radius analysis via real graph traversal  
**Owner:** Backend engineer  
**Blocked by:** Phase 6 (frontend wired to real backend)

### 9.1 — Graph Schema
```cypher
(:Application {name, repo, tier})-[:USES]->(:Library {name, version})
(:Library)-[:IMPLEMENTS]->(:Algorithm {canonical, quantum_vulnerable})
(:Algorithm)-[:PROTECTS]->(:DataAsset {classification})
(:Certificate {domain, expiry})-[:USES_ALGORITHM]->(:Algorithm)
```

### 9.2 — Blast Radius Query
```cypher
MATCH path = (:Algorithm {canonical: $algo})<-[:IMPLEMENTS|USES*1..4]-(n)
RETURN path, n ORDER BY n.tier
```

---

## PHASE 10 — ENTERPRISE HARDENING (V3, Future)
- Multi-tenancy isolation (row-level security in PostgreSQL)
- Full RBAC with Clerk Organizations + custom ECDAT permission layer
- Migration workspace (task management, assignment, completion tracking)
- CI/CD verification hooks
- Continuous drift detection
- Enterprise SSO (SAML/OIDC via Clerk Enterprise)
- Compliance reporting (NIST CSF, CMMC, etc.)
- Audit logs (all reads/writes/queries logged with actor + timestamp)
- Data residency controls
- Evidence integrity signatures

---

## MISSION CONTROL ENTERPRISE UI/UX UPGRADE

### Enterprise Command Center
Mission Control must present ECDAT as an enterprise cryptographic security command center rather than a generic dashboard.

### Cryptographic Posture Storytelling
Dashboard must communicate:
Discover → Understand → Assess → Recommend → Migrate → Verify

### Technical Pipeline Visualization
Represent:
Source Injection → Discovery Engine → Crypto Detection → Evidence / Normalization → CBOM → Knowledge Graph → Quantum Risk Engine → PQC Engine → AI Analyst → Migration Planner → Verification

### Enterprise Visual Language
Use the existing ECDAT brand/color system.
No generic AI gradients or cyberpunk color schemes.

### 3D Infrastructure Visualization
Introduce purposeful 3D/spatial visualizations for cryptographic infrastructure and dependency topology where technically justified.

### Motion System
Introduce restrained enterprise-grade motion for:
scanning, pipeline execution, risk changes, graph traversal, migration progress, verification

### Mission Control Interaction
Force Run Discovery should visually represent the actual discovery pipeline and update dashboard state.

### Asset Intelligence
Provide drill-down from high-level posture → asset → evidence → dependency → risk → recommendation → migration → verification.

### Enterprise Security
Preserve authentication, authorization, tenant isolation, secure data handling and backend enforcement.

### Performance
3D, animations and visualization must not compromise application performance.

### Accessibility
Support keyboard navigation, readable contrast, reduced motion and accessible interaction states.

---

## CROSS-CUTTING CONCERNS

### Security Requirements (applies to all phases)

1. **No raw secrets in code** — all secrets via environment variables
2. **Clerk token validation** — every API route validates the Clerk JWT
3. **Workspace isolation** — every database query includes `WHERE workspace_id = $user_workspace`
4. **Scan workspace cleanup** — temp directories always deleted after scan (success or failure)
5. **No raw source code to LLM** — strip secrets before any AI context (Phase 8+)
6. **IDOR protection** — asset IDs validated against workspace ownership before serving
7. **Rate limiting** — discovery jobs limited to N per workspace per hour

### Performance Requirements

1. **Discovery job timeout** — max 5 minutes for MVP (shallow clone + scan)
2. **API response time** — dashboard endpoints < 500ms
3. **Job polling** — client polls every 3-5 seconds (not continuous SSE for MVP)
4. **Database indices** — all foreign keys and frequently queried columns indexed
5. **Lazy loading** — large evidence lists paginated (50 per page)

### Error Handling Requirements (all phases)

1. **Job failures** — error message stored in DB, surfaced in UI with retry button
2. **Scanner errors** — per-file errors don't abort whole job (log error, continue)
3. **API errors** — structured error responses: `{detail, code, timestamp}`
4. **Network failures** — frontend shows retry option, not silent failure
5. **Auth errors** — 401 returns `WWW-Authenticate: Bearer` header, frontend redirects to sign-in

---

## Enterprise Discovery & Navigation Architecture

This section documents the architectural and navigational model for ECDAT's enterprise scale. 

**Conceptual Data Flow**
`Organization ↓ Workspace ↓ Sources ↓ Scan Jobs ↓ Crypto Assets ↓ CBOM ↓ Knowledge Graph ↓ Risk ↓ PQC ↓ Migration ↓ Verification`

**Supported Enterprise Capabilities:**
- Single repository scans
- Multi-repository scans (Mass-selection via checkboxes)
- Organization-level discovery
- Multiple source types (Git, Container, Binary, Certificate, TLS, Cloud/KMS)
- Asynchronous Scan Jobs (Celery/Redis processing in the background)
- Partial results viewing
- Scan history and Job retention
- Source health and continuous re-scanning

**Target Product Information Architecture (Sidebar)**
- **Mission Control** (`/dashboard`)
- **DISCOVERY**
  - Sources
  - Scan Jobs
  - Crypto Assets
  - CBOM Inventory
- **INTELLIGENCE**
  - Dependency Graph
  - Blast Radius
  - Evidence
  - Risk & Exposure
- **QUANTUM TRANSITION**
  - Quantum Posture
  - PQC Workbench
  - Migration Planner
  - Verification
- **ANALYST**
  - AI Analyst
  - Forecast & Labs
- **SYSTEM**
  - Activity
  - Compliance
  - Settings

---

*Read `docs/TRACKER.md` for current task completion status.*  
*Read `docs/AGENT_CONTEXT.md` before beginning any task.*

---

## ADVANCED INTELLIGENCE & QUANTUM TABS IMPLEMENTATION (MATH & MODELS)

To achieve the required enterprise accuracy, the upcoming UI tabs must directly reflect the mathematical models and graph algorithms established in the 22-phase product architecture. 

### INTELLIGENCE TABS

#### 1. Dependency Graph (`/prototype/graph`)
**Mathematical Model / Graph Theory**: Directed Acyclic Graph (DAG) Traversal via Neo4j
- **Backend Cypher Model**: `(:Application)-[:USES]->(:Library)-[:IMPLEMENTS]->(:Algorithm)-[:PROTECTS]->(:DataAsset)`
- **Algorithmic Execution**: The UI renders a topological sort of the graph. When a user queries a vulnerable algorithm (e.g., `RSA:2048`), the backend executes a recursive depth-first traversal `(:Algorithm {canonical: $algo})<-[:IMPLEMENTS|USES*1..4]-(n)` to map all transitive dependencies. 

#### 2. Blast Radius (`/prototype/blast-radius`)
**Mathematical Model**: Centrality Scoring & Impact Propagation
- **Algorithmic Execution**: The UI displays the computed "Blast Radius Score". 
- **Math**: $R_{blast} = \sum_{i=1}^{N} (w_i \times C_i)$ where $N$ is the number of dependent applications, $w_i$ is the weight of the dependency (direct vs transitive), and $C_i$ is the business criticality of application $i$.
- **UI Element**: An impact-analysis table that recalculates the blast radius score in real-time as the user filters by business unit.

#### 3. Evidence (`/prototype/evidence`)
**Mathematical Model**: Abstract Syntax Tree (AST) Confidence Scoring
- **Algorithmic Execution**: Findings are not just regex matches; they are scored by an AST processor.
- **Math**: $C_{match} \in [0, 1]$. Tree-sitter import match = $0.95$. Tree-sitter API call = $0.90$. Regex fallback = $0.60$.
- **UI Element**: Code split-pane highlighting the exact AST node (line and column) responsible for the finding, alongside the confidence metric $C_{match}$.

#### 4. Risk & Exposure (`/prototype/risk`)
**Mathematical Model**: Mosca's Theorem (Inequality)
- **Math**: The core engine evaluates $X + Y > Z$.
  - $X$: Security Lifetime of Data (years) — How long the data must remain confidential.
  - $Y$: Migration Time (years) — Time to fully transition the cryptographic infrastructure.
  - $Z$: Estimated Time Until CRQC (years) — The Quantum Threat Horizon.
- **Algorithmic Execution**: If $X + Y > Z$, the asset is marked `CRITICAL` (Harvest-Now-Decrypt-Later window is OPEN). If $(Z - (X+Y)) \le 2$, marked `HIGH`.
- **UI Element**: A dynamic Mosca calculator where the user can adjust $Z$ via a slider, instantly recalculating the Risk Matrix for the entire enterprise.

---

### QUANTUM TRANSITION TABS

#### 5. Quantum Posture (`/prototype/quantum`)
**Mathematical Model**: Shor's and Grover's Algorithmic Degradation Models
- **Math (Shor's Algorithm)**: Solves integer factorization and ECDLP in polynomial time $\mathcal{O}((\log N)^3)$. This completely breaks RSA, DH, and ECDSA.
- **Math (Grover's Algorithm)**: Provides quadratic speedup $\mathcal{O}(\sqrt{N})$ for unstructured search. This reduces AES-128 effective security to ~64 bits and AES-256 to ~128 bits.
- **UI Element**: An enterprise dashboard that stratifies assets into `Shor-Vulnerable` (requires asymmetric replacement) and `Grover-Weakened` (requires symmetric key size doubling).

#### 6. PQC Workbench (`/prototype/pqc`)
**Mathematical Model**: NIST PQC Standard Bandwidth & Latency Benchmarks
- **Algorithmic Execution**: Maps legacy algorithms to NIST replacements based on function constraints.
- **Math / Constraints applied in UI**:
  - **FIPS 203 (ML-KEM-768)**: Key Encapsulation. Public key = 1184B, Ciphertext = 1088B.
  - **FIPS 204 (ML-DSA-65)**: Digital Signature. Public key = 1952B, Signature = 3309B.
  - **FIPS 205 (SLH-DSA-128f)**: Hash-based Signature. Signature = 17088B.
- **UI Element**: An interactive tradeoff calculator. If a user tries to map ECDSA directly to SLH-DSA for IoT devices, the UI calculates the packet fragmentation penalty ($> 17$ KB signature) and restricts the recommendation to ML-DSA.

#### 7. Migration Planner (`/prototype/migration`)
**Mathematical Model**: Topological Dependency Sort
- **Algorithmic Execution**: You cannot migrate an application before its underlying library supports PQC. The system applies a topological sort (Kahn's algorithm) to the Knowledge Graph to output a strict migration sequence.
- **UI Element**: An automated Gantt chart enforcing the topological order: `HSM → Crypto Provider → PKI → Application → Client`.

#### 8. Verification (`/prototype/verification`)
**Mathematical Model**: Set Theory (CBOM Drift Detection)
- **Math**: Evaluates the intersection of CBOM snapshots at $t_1$ and $t_2$. $\Delta_{resolved} = CBOM(t_1) \setminus CBOM(t_2)$.
- **UI Element**: A cryptographic drift diff-viewer proving mathematical eradication of vulnerable assets.

---

### DISCOVERY & SYSTEM TABS

#### 9. Crypto Assets (`/prototype/assets`)
**Mathematical Model**: OID to Canonical Set Mapping
- **Math**: Let $A_{raw}$ be the set of discovered strings `{"SHA256", "sha-256", "2.16.840.1.101.3.4.2.1"}`. The normalizer applies a bijection $f: A_{raw} \to A_{canonical}$ to deduplicate into a single entity `SHA-256`.
- **UI Element**: A data-dense asset grid grouped strictly by $A_{canonical}$.

#### 10. CBOM Inventory (`/prototype/cbom`)
**Mathematical Model**: CycloneDX v1.6 Standard Schema Validation
- **UI Element**: A tree-view mapping the enterprise software composition to the CycloneDX schema, exporting the exact NTRO-compliant JSON/XML formats.

#### 11. Activity (`/prototype/activity`)
**Mathematical Model**: Event Sourcing (Append-only Ledger)
- **UI Element**: Infinite-scrolling audit ledger of all state mutations in the cryptographic baseline.

#### 12. Compliance (`/prototype/compliance`)
**Mathematical Model**: Regulatory Mapping Matrix
- **Math**: Computes compliance scores $S_{CSF}$, $S_{CNSA}$ based on the boolean satisfiability of discovered assets against framework constraints (e.g., CNSA 2.0 requires AES-256, rejects AES-128).
- **UI Element**: Pass/fail radial charts for auditors.

#### 13. Settings (`/prototype/settings`)
**Mathematical Model**: RBAC & Global Variables
- **UI Element**: Interface to manipulate the global variable $Z$ (Threat Horizon) spanning across all Mosca inequalites computed in the system.
