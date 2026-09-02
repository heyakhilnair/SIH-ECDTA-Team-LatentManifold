# ECDAT — AGENT HANDOFF PROMPT
**Project:** SIH26164 · NTRO · Team LatentManifold · SIH2026-143  
**Repo:** `c:\Users\AI-Lab\Desktop\Projects\SIH-ECDTA-Team-LatentManifold`

---

## YOUR FIRST 3 ACTIONS (DO THESE BEFORE ANYTHING ELSE)

1. Read `docs/AGENT_CONTEXT.md` — mandatory quick reference
2. Read `docs/PRODUCT_REFERENCE.md` — complete product picture built from all 22 phase PDFs
3. Read `docs/TRACKER.md` — find your first task

**Then begin Phase 6.**

---

## WHAT THIS PROJECT IS

ECDAT is a cryptographic discovery and quantum-readiness platform built for **Smart India Hackathon 2026** (Problem SIH26164, Ministry NTRO). It:

1. **Discovers** cryptographic assets in source code, dependencies, and certificates using Tree-sitter + Semgrep + manifest parsers + x509 parsers
2. **Normalizes** findings into a canonical Cryptographic Bill of Materials (CycloneDX v1.6 CBOM)
3. **Assesses** quantum and classical risk using Mosca's Inequality (`X + Y > Z`)
4. **Recommends** NIST-standardized PQC replacements (FIPS 203 ML-KEM, FIPS 204 ML-DSA, FIPS 205 SLH-DSA)
5. **Plans** migration with dependency-ordered execution from the Knowledge Graph
6. **Verifies** post-migration cryptographic posture via rescan

The one-sentence pitch (from Phase 22 PDF): _"ECDAT discovers cryptography across enterprise software and infrastructure, converts it into a cryptographic bill of materials, maps its business dependencies, calculates quantum migration risk, recommends suitable PQC or hybrid alternatives, and verifies remediation through rescanning."_

---

## CURRENT STATE OF THE CODEBASE

**Frontend (Next.js 16.3.3, React 19) — EXISTS at `src/`:**
- `src/app/page.tsx` — homepage with interactive Mosca simulator (real logic, 1850 lines)
- `src/app/prototype/page.tsx` — dashboard prototype (1489 lines, ALL DATA HARDCODED — needs rewiring in Phase 6)
- `src/app/layout.tsx` — root layout (needs ClerkProvider wrap in Phase 1)
- `src/components/` — Navbar, Footer, Quby (AI sim), CommandPalette
- `src/app/evidence/` — static 22-phase research showcase
- `src/app/presentation/` — SIH judge presentation mode

**Recently Built:**
- FastAPI backend scaffold (Phase 0.1)
- PostgreSQL schema (Phase 0.2)
- Clerk Auth (Phase 1)
- Job Lifecycle API & Celery Scaffold (Phase 2.1)
- Tree-sitter + Semgrep + Dependency + Certificate Scanners (Phase 2.2–2.5)
- Scanner Orchestrator + Git Cloner (Phase 2.6–2.7)
- Normalization Engine + CBOM Generator (Phase 3)
- Quantum Risk Engine — Mosca calculator, multi-dimensional risk, 4 risk API endpoints (Phase 4)
- PQC Recommendation Engine — NIST FIPS 203/204/205 recommendation rule table, safe asset detection, pipeline trigger & endpoints (Phase 5)
- Frontend Enterprise Route Migration & Advanced UI specs (Phase 6)
- Enterprise Product Shell (Phase 6.3) — includes Topbar, Sidebar, PageHeader, CommandPalette search, and Settings UI

**Not yet built:**
- Frontend wiring with real API data (Phase 6.3–6.6)
- Testing + Demo preparation (Phase 7)

---

## MANDATORY RULES (NEVER VIOLATE THESE)

1. **Read `AGENTS.md` at project root** before writing ANY Next.js code — this is Next.js 16.3.3 with breaking changes from training data
2. **No fake data in dashboard** — all UI data must come from real scans OR be labeled `[DEMONSTRATION DATA]`
3. **Evidence table is APPEND-ONLY** — never UPDATE or DELETE from it
4. **Workspace isolation** — every DB query must include `WHERE workspace_id = $user_workspace_id`
5. **Temp scan directories** (`/tmp/ecdat-scans/{job_id}`) must ALWAYS be deleted after scan (success or failure)
6. **Clerk is mandatory** — no route that processes real data may be accessed without a valid Clerk session
7. **LLM must never receive raw source code** — only canonical asset name + evidence summary + risk score
8. **No secrets in code** — all secrets via environment variables only
9. **PowerShell uses `;` not `&&`** to chain commands

---

## THE COMPLETE 10-PHASE BUILD PLAN

### Phase 0 — Foundation & Environment (START HERE)
**Goal:** Backend scaffold + DB schema + Docker local dev  
**Tasks (check `docs/TRACKER.md` for details):**
- Create `ecdat-backend/` FastAPI project with full directory structure
- Create PostgreSQL schema (9 tables: workspaces, discovery_jobs, evidence, crypto_assets, evidence_assets, risk_scores, recommendations, cbom_snapshots)
- Set up `docker-compose.yml` (PostgreSQL 16 + Redis 7)
- Create `.env.local` for Next.js and `.env` for backend
- `GET /health` endpoint returning `{"status": "ok"}`

### Phase 1 — Clerk Authentication
**Goal:** Auth protecting all `/prototype/*` routes  
**Tasks:** Install @clerk/nextjs, create middleware.ts, custom split-panel sign-in page (ivory left, white right, copper primary color #B95532), workspace creation on first login

### Phase 2 — Discovery Backend: Core Scanners
**Goal:** Real evidence from real source code  
**Tasks:** Job lifecycle API (POST/GET/DELETE), Tree-sitter scanner (Python/Go/JS), Semgrep rules (6+ crypto rules), Dependency scanner (package.json, requirements.txt, go.mod), Certificate scanner (x509), Git cloner, Celery orchestrator

### Phase 3 — Normalization Engine + CBOM
**Goal:** Raw evidence → canonical assets → CycloneDX CBOM  
**Tasks:** Algorithm alias registry (100+ variants → canonical form), Quantum vulnerability registry, Asset resolver (upsert deduplication), CycloneDX v1.6 CBOM generator

### Phase 4 — Quantum Risk Engine
**Goal:** Every asset gets a multi-dimensional risk score  
**Tasks:** Mosca calculator (X + Y > Z), composite risk from: quantum exposure + classical risk + business criticality + data lifetime + migration complexity, `/risk/summary` endpoint

### Phase 5 — PQC Recommendation Engine
**Goal:** Every vulnerable asset gets a ranked PQC recommendation  
**Tasks:** Recommendation rule table (RSA→ML-KEM-768, SHA-1→SHA-256, etc.), constraint-aware ranking, NIST standards citations (FIPS 203/204/205), safe-asset detection (no recommendation for AES-256)

### Phase 6 — Frontend Wiring & UI/UX Upgrade
**Goal:** Replace hardcoded state with API data & build Enterprise Command Center  
**Tasks:** API client layer, authenticated sidebar layout, Command Center with SWR hooks, Evidence Viewer, CBOM export, Asset Detail, job polling, Enterprise UI/UX upgrade (3D topology, technical pipeline visualization, storytelling flow)

### Phase 7 — Testing + Demo Preparation
**Goal:** Verified correctness + stable demo  
**Tasks:** Ground truth test fixtures, unit tests (normalizer, risk, scanner), demo repository ("Astra Financial Technologies"), 6-minute demo script, synthetic data labeling

### Phase 8+ — Post-SIH (AI Analyst, Knowledge Graph, Enterprise)
- Phase 8: RAG + LLM analyst (evidence-first, citations required)
- Phase 9: Neo4j knowledge graph + blast radius
- Phase 10: Enterprise hardening, RBAC, audit logs

---

## KEY ARCHITECTURE DECISIONS (FROM 22 PHASE PDFs)

### Tech Stack (from Phase 21 PDF)
| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16.3.3 + React 19 + TypeScript |
| Styling | CSS Modules (primary) + TailwindCSS v4 (utilities) |
| Data fetching | SWR |
| Charts | ECharts or Recharts |
| Graph viz | React Flow (for knowledge graph) |
| Auth | @clerk/nextjs (mandatory) |
| Backend | Python + FastAPI 0.115.x + Pydantic v2 |
| ORM | SQLAlchemy 2.0 async + Alembic |
| Primary DB | PostgreSQL 16 |
| Job queue | Celery 5 + Redis 7 |
| AST scanner | tree-sitter (Python, Go, JS, Java, C) |
| Rules engine | Semgrep (subprocess call) |
| Graph DB | Neo4j (V2/post-SIH) |
| Object storage | MinIO (optional, for CBOM exports) |

### Design System
```
Primary text:     #181917 (graphite)
Accent/CTA:       #B95532 (copper) — active states, buttons, left border
Success/safe:     #687563 (sage)
Sign-in panel bg: #F3F0E8 (warm ivory)
Card surfaces:    #F9FAFB
Borders:          #E5E7EB
Risk CRITICAL:    background #FEE2E2 text #B91C1C
Risk HIGH:        background #FFEDD5 text #C2410C
Risk MEDIUM:      background #FEF9C3 text #854D0E
Risk LOW:         background #DCFCE7 text #15803D

Fonts: Inter (body), Outfit (display), JetBrains Mono (code/IDs)
Design inspiration: Lyzr.ai (clean enterprise white, grouped sidebar, no dark mode)
```

### Data Model Principles (from Phase 5 and 11 PDFs)
- **Evidence is immutable** — append-only, never UPDATE or DELETE
- **Evidence ≠ Asset** — these are separate entities, never collapse them
- Canonical algorithm format: `{FAMILY}:{KEY_SIZE}` → `RSA:2048`, `AES:256`, `SHA-256`
- Deduplication at asset level (same canonical algo in same workspace = one asset)
- OIDs map to canonical names (2.16.840.1.101.3.4.2.1 → SHA-256)

### Risk Model (from Phase 6 PDF)
Risk is multi-dimensional. NEVER a single opaque number. Every dimension must have a traceable reason:
1. Quantum Exposure (Shor/Grover applicability to algorithm)
2. Classical Security Risk (CVEs, deprecated status)
3. Mosca Result (X + Y vs Z)
4. Business Criticality (asset context, data classification)
5. Data Lifetime (how long must this data remain secure?)
6. Migration Complexity (blast radius, protocol constraints)
7. Dependency Centrality (how many apps use this algorithm?)

Z (threat horizon) is a **configurable workspace setting**, not a hardcoded year.

### Migration Architecture (from Phase 18 PDF)
Migration states per asset:
`UNKNOWN → NOT_STARTED → ASSESSED → PLANNED → READY → IN_DEVELOPMENT → TESTING → PILOT → ROLLOUT → VERIFICATION → MIGRATED → RETIRED`
Also: `BLOCKED`, `EXCEPTION`

Migration order is topological (from dependency graph):
HSM → Crypto Provider → PKI → Application → Client

### AI Analyst Rules (from Phase 8 and 14 PDFs)
- AI is evidence-FIRST, never evidence-replacing
- Every AI claim must cite `evidence_id` from the database
- AI never modifies risk scores or invents assets
- AI context = canonical asset name + evidence summary only (NEVER raw source code)
- Must validate all AI output against Pydantic schema before returning to user
- Hallucination check: any asset name in AI response must exist in `crypto_assets` table

---

## DEMO STRATEGY (from Phase 22 PDF — CRITICAL FOR SIH)

**Build a controlled demo enterprise — "Astra Financial Technologies"**
DO NOT rely on random GitHub repos during the live demo.

**Inject realistic technical debt:**
- Payment Gateway: RSA-2048 signing + ECDSA + TLS 1.2
- Identity Service: ECDSA P-256 + SHA-1 password hashing  
- API Gateway: RSA certificate-based mTLS
- Mobile Backend: jsonwebtoken (RS256), node-forge

**Also include PQC-ready apps** (shows maturity spectrum):
- Internal Tools: ML-KEM-768 already used
- Analytics API: hybrid ECDH + ML-KEM

**Demo numbers must come from ACTUAL SCANS** — never fabricate metrics.

**6-minute demo script:**
- 00:00 Landing page
- 00:30 Sign in
- 01:00 Command Center (empty) → Connect source
- 01:45 Job completes → metrics update
- 02:30 Risk Dashboard → Click RSA:2048 → Evidence viewer
- 03:15 Recommendation tab → ML-KEM-768 + hybrid path
- 04:00 Knowledge Graph → blast radius
- 04:30 AI Analyst → question + evidence citations
- 05:00 Export CBOM JSON
- 05:30 Quantum Readiness Score: 38/100
- 06:00 Questions

---

## ENVIRONMENT VARIABLES NEEDED

**Next.js `.env.local`:**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_REPLACE_WITH_REAL_KEY
CLERK_SECRET_KEY=sk_test_REPLACE_WITH_REAL_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/prototype
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/prototype
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Clerk keys:** Sign up at https://clerk.com → create application → copy keys.

**Backend `ecdat-backend/.env`:**
```env
DATABASE_URL=postgresql+asyncpg://ecdat:password@localhost:5432/ecdat_db
REDIS_URL=redis://localhost:6379/0
CLERK_SECRET_KEY=sk_test_REPLACE_WITH_REAL_KEY
ENVIRONMENT=development
```

---

## DOCUMENTATION IN `docs/`

| File | Size | Purpose |
|------|------|---------|
| `PRODUCT_REFERENCE.md` | 54KB | ★ Complete product picture from all 22 PDFs. Read second. |
| `IMPLEMENTATION_PLAN.md` | 65KB | Full code spec, schemas, DoD for every task. Read for task detail. |
| `TRACKER.md` | 20KB | Living task board — update as you go. |
| `AGENT_CONTEXT.md` | 9KB | Quick reference. Read first. |
| `master_analysis_prompt.md` | 38KB | Original analysis directive. |
| `Phase 1-22.pdf` | 22 files | Original research (text extracted to scratch dir). |

---

## HOW TO WORK

1. Check `docs/TRACKER.md` for `[ ]` tasks in current phase
2. Read the spec in `docs/IMPLEMENTATION_PLAN.md` for that task
3. Build it
4. Mark `[x]` in TRACKER.md
5. Move to next task
6. If you encounter something ambiguous, check `docs/PRODUCT_REFERENCE.md` — it has the authoritative answer from the phase PDFs

**Update `docs/TRACKER.md` header `Last updated by:` with your agent ID and timestamp when you finish.**
