# ECDAT — MASTER IMPLEMENTATION TRACKER
**Project:** SIH26164 · LatentManifold · SIH2026-143  
**Last Updated:** 2026-09-01  
**Updating Agent Rule:** When you complete a task, change `[ ]` to `[x]`. When starting, change to `[/]`. If blocked, add `[!]` and note the blocker inline.

> For full task specs (code, DoD, schemas), read `docs/IMPLEMENTATION_PLAN.md`  
> For quick context pickup, read `docs/AGENT_CONTEXT.md`

---

## LEGEND
- `[ ]` — Not started
- `[/]` — In progress
- `[x]` — Complete (DoD met)
- `[!]` — Blocked (see inline note)
- `[~]` — Skipped / deferred

---

## ENTERPRISE PRODUCT SHELL (PHASE 6.3)
**Status:** `[x] COMPLETED`
- [x] Audit current application shell
- [x] Implement organization context
- [x] Implement workspace context
- [x] Upgrade enterprise sidebar
- [x] Implement global top bar
- [x] Implement organization switcher
- [x] Implement workspace switcher
- [x] Implement global search
- [x] Implement command palette
- [x] Implement global New actions
- [x] Implement notifications
- [x] Implement active scan indicator
- [x] Implement user menu
- [x] Implement breadcrumbs
- [x] Implement page header system
- [x] Establish Settings architecture
- [x] Integrate enterprise authorization
- [x] Integrate shell with existing ECDAT pages
- [x] Validate multi-source context
- [x] Update documentation

---

## PHASE 0 — FOUNDATION & ENVIRONMENT
**Status:** `[x] COMPLETED` · **Target:** Day 1–3

### 0.1 Backend Project Scaffold
- [x] Create `ecdat-backend/` directory with full structure (see IMPLEMENTATION_PLAN.md §0.1)
- [x] Create `requirements.txt` with all dependencies
- [x] Run `pip install -r requirements.txt` — confirm no errors
- [x] Create `app/main.py` — FastAPI app with CORS config
- [x] Create `app/config.py` — Pydantic Settings reading from `.env`
- [x] Create `app/database.py` — SQLAlchemy async engine + session factory
- [x] Implement `GET /health` → returns `{"status": "ok", "version": "0.1.0"}`
- [x] Verify: `uvicorn app.main:app --reload` starts without errors
- [x] Verify: `GET /health` returns 200

### 0.2 PostgreSQL Database Schema
- [x] Install `alembic` and initialize with `alembic init alembic/`
- [x] Create migration: `workspaces` table (combined into initial_schema)
- [x] Create migration: `discovery_jobs` table
- [x] Create migration: `evidence` table (append-only)
- [x] Create migration: `crypto_assets` table
- [x] Create migration: `evidence_assets` join table
- [x] Create migration: `risk_scores` table
- [x] Create migration: `recommendations` table
- [x] Create migration: `cbom_snapshots` table
- [x] Run `alembic upgrade head` — confirm all tables created
- [x] Verify rollback: `alembic downgrade -1` works
- [x] Verify all foreign key constraints are correct

### 0.3 Environment Configuration
- [x] Create `ecdat-backend/.env.example` with all required variables
- [x] Create `ecdat-backend/.env` (DO NOT COMMIT)
- [x] Create `c:\Users\AI-Lab\Desktop\Projects\SIH-ECDTA-Team-LatentManifold\.env.local` (DO NOT COMMIT)
- [x] Add `.env`, `.env.local` to `.gitignore`
- [x] Create `docker-compose.yml` with PostgreSQL + Redis services
- [x] Connect to remote Supabase DB (instead of local Docker)
- [x] Confirm backend connects to DB on startup
- [x] Confirm `NEXT_PUBLIC_API_URL` is set and accessible

**PHASE 0 DONE WHEN:** Backend starts, `/health` returns 200, all DB tables exist

---

## PHASE 1 — CLERK AUTHENTICATION
**Status:** `[x] COMPLETED` · **Target:** Day 3–5  
**Depends on:** Phase 0.3 (env vars ready)

### 1.1 Install Clerk
- [x] Run `npm install @clerk/nextjs` in Next.js project
- [x] Read `node_modules/next/dist/docs/` for Next.js version-specific notes (AGENTS.md requirement)
- [x] Read `node_modules/@clerk/nextjs/` README for compatibility

### 1.2 Root Layout
- [x] Wrap `src/app/layout.tsx` with `<ClerkProvider>` (preserve existing fonts, Quby, CommandPalette)

### 1.3 Middleware
- [x] Create `src/middleware.ts` with `clerkMiddleware` protecting all operational routes
- [x] Verify: unauthenticated `/prototype` → redirects to `/sign-in`
- [x] Verify: `/` (public) accessible without auth

### 1.4 Sign-In Page
- [x] Create `src/app/sign-in/[[...sign-in]]/page.tsx`
- [x] Create `src/app/sign-in/[[...sign-in]]/SignIn.module.css`
- [x] Implement split-panel layout: 55% ivory left / 45% white right
- [x] Customize Clerk appearance API: copper primary color `#B95532`
- [x] Left panel: ECDAT logo, tagline headline, pipeline pills, SIH badge
- [x] Verify: page renders correctly
- [x] Verify: mobile layout stacks correctly

### 1.5 Sign-Up Page
- [x] Create `src/app/sign-up/[[...sign-up]]/page.tsx`
- [x] Implement matching split-panel layout

### 1.6 Workspace Creation on First Login
- [x] Create `src/app/api/workspace/route.ts` — GET workspace for current user
- [x] Backend: `POST /api/workspaces` — creates workspace tied to Clerk user ID
- [x] Backend: `GET /api/workspaces/me` — returns workspace for authenticated user
- [x] Frontend: detect no workspace on `/prototype` → show onboarding
- [x] Frontend: workspace creation flow functional

### 1.7 API Route Auth Pattern
- [x] Create helper: `src/lib/auth.ts` — `getAuthToken()` for server components
- [x] Verify: all Next.js API routes validate Clerk token before calling backend
- [x] Verify: backend rejects requests without valid `X-Clerk-User-Id` header
- [x] Phase 1 Completion Sign-off

**PHASE 1 DONE WHEN:** Sign-in works, `/prototype` requires auth, workspace auto-created on first login

---

## PHASE 2 — DISCOVERY BACKEND: CORE SCANNERS
**Status:** `[/] IN PROGRESS` · **Target:** Day 4–10  
**Depends on:** Phase 0.1 (FastAPI), Phase 0.2 (DB schema)

### 2.1 Job Lifecycle Endpoints
- [x] Implement `POST /api/jobs` — create discovery job (returns job ID immediately)
- [x] Implement `GET /api/jobs` — list jobs for workspace (with status)
- [x] Implement `GET /api/jobs/{job_id}` — get job detail
- [x] Implement `DELETE /api/jobs/{job_id}` — cancel job
- [x] Implement `GET /api/jobs/{job_id}/evidence` — get evidence for job
- [x] Implement job status state machine: queued → running → completed/failed
- [x] Set up Celery + Redis for async job execution
- [x] Test: create job via API → appears in list with `queued` status

### 2.2 Tree-sitter Scanner
- [x] Install `tree-sitter` + `tree-sitter-python`, `tree-sitter-go`, `tree-sitter-javascript`
- [x] Create `app/services/scanner/source_scanner.py`
- [x] Implement language detection by file extension
- [x] Implement `extract_imports()` AST walker for each language
- [x] Implement `extract_function_calls()` AST walker for each language
- [x] Define crypto import patterns for Python (see IMPLEMENTATION_PLAN.md §2.2)
- [x] Define crypto import patterns for Go
- [x] Define crypto import patterns for JavaScript/TypeScript
- [x] Define crypto API call patterns for all three languages
- [x] Implement `scan_file()` function → returns list of Evidence objects
- [x] Test: `scan_file('vulnerable.py', ...)` finds RSA and SHA-1
- [x] Test: `scan_file('safe.py', ...)` returns no findings for AES-256

### 2.3 Semgrep Rules Engine
- [x] Create `app/services/scanner/rules/crypto_rules.yaml`
- [x] Write rule: `ecdat-rsa-keygen-weak` (Go — RSA key < 3072)
- [x] Write rule: `ecdat-sha1-usage` (Go)
- [x] Write rule: `ecdat-md5-hash` (Python)
- [x] Write rule: `ecdat-rsa-python` (Python — RSA.generate)
- [x] Write rule: `ecdat-des-usage` (Go)
- [x] Write rule: `ecdat-ecdsa-p256` (Go — elliptic.P256)
- [x] Write 5+ additional rules for JavaScript crypto patterns
- [x] Implement `run_semgrep()` — calls semgrep binary, parses JSON output
- [x] Implement `convert_semgrep_to_evidence()` — maps Semgrep result → Evidence object
- [x] Test: Semgrep fires on `go/vulnerable.go` fixture

### 2.4 Dependency Scanner
- [x] Create `app/services/scanner/dependency_scanner.py`
- [x] Implement `parse_npm_manifest()` — reads `package.json`
- [x] Implement `parse_pip_manifest()` — reads `requirements.txt`
- [x] Implement `parse_go_manifest()` — reads `go.mod`
- [x] Define `CRYPTO_PACKAGES` registry (see IMPLEMENTATION_PLAN.md §2.4)
- [x] Implement manifest discovery (`find_manifests()`)
- [x] Test: `parse_npm_manifest()` on `package.json` with `jsonwebtoken` returns crypto finding
- [x] Test: `parse_pip_manifest()` on `requirements.txt` with `pycryptodome` returns finding

### 2.5 Certificate Scanner
- [x] Create `app/services/scanner/certificate_scanner.py`
- [x] Implement `scan_certificate_url()` — SSL connect, extract x509
- [x] Implement `scan_cert_file()` — parse `.pem`/`.crt` files
- [x] Extract: subject, issuer, signature algorithm, key type, key size, expiry, SAN domains
- [x] Implement `is_quantum_vulnerable_cert()` — checks algorithm type
- [x] Test: scan `https://example.com` → returns certificate with RSA key size

### 2.6 Git Repository Cloner
- [x] Install `gitpython`
- [x] Create `app/services/scanner/git_cloner.py`
- [x] Implement `clone_and_scan()` — shallow clone to temp dir
- [x] Implement URL validation (https:// only for MVP)
- [x] Implement `cleanup_scan_workspace()` — always deletes temp dir
- [x] Test: clone real public repo → temp dir contains expected files

### 2.7 Scanner Orchestrator
- [x] Create `app/services/scanner/orchestrator.py`
- [x] Implement `run_discovery_job` Celery task
- [x] Integrate: clone → scan files → run semgrep → scan deps → scan certs
- [x] Implement batch evidence persistence
- [x] Implement error handling: per-file errors don't abort whole job
- [x] Implement final status update on completion or failure
- [x] Test: full scan of demo repo → evidence in database

**PHASE 2 DONE WHEN:** Real scan of a GitHub repo produces real evidence in the `evidence` table

---

## PHASE 3 — NORMALIZATION ENGINE + CBOM
**Status:** `[x] COMPLETED` · **Target:** Day 8–12  
**Depends on:** Phase 2 (evidence in database)

### 3.1 Algorithm Alias Registry
- `[x]` Create `app/services/normalizer/alias_registry.py`
- `[x]` Populate `ALGORITHM_ALIASES` with all known variants (see IMPLEMENTATION_PLAN.md §3.1)
- `[x]` Include OID-to-name mappings for major algorithms
- `[x]` Implement `normalize_algorithm(raw: str) -> str`
- `[x]` Test: all alias variants in §3.1 resolve to correct canonical form
- `[x]` Test: unknown strings pass through as-is (no crash)

### 3.2 Quantum Vulnerability Lookup
- `[x]` Create `app/services/normalizer/vulnerability_registry.py`
- `[x]` Populate `QUANTUM_VULNERABLE` set
- `[x]` Populate `CLASSICALLY_VULNERABLE` dict with CVE/attack notes
- `[x]` Populate `GROVER_WEAKENED` dict
- `[x]` Implement `is_quantum_vulnerable(canonical, key_size) -> bool`
- `[x]` Implement `is_classically_vulnerable(canonical, key_size) -> bool`
- `[x]` Test: RSA, ECDSA, ECDH → quantum vulnerable = True
- `[x]` Test: SHA-1, MD5 → classical vulnerable = True
- `[x]` Test: AES-256 → both = False
- `[x]` Test: ML-KEM-768 → both = False

### 3.3 Asset Resolver
- `[x]` Create `app/services/normalizer/asset_resolver.py`
- `[x]` Implement `extract_algorithm_from_evidence(evidence) -> str`
- `[x]` Implement `extract_key_size(evidence) -> Optional[int]`
- `[x]` Implement `resolve_evidence_to_asset(evidence, workspace_id) -> CryptoAsset`
- `[x]` Implement upsert logic (find or create canonical asset)
- `[x]` Implement evidence → asset linking
- `[x]` Test: two pieces of evidence for the same RSA-2048 → one canonical asset
- `[x]` Test: SHA256 + SHA-256 + sha256 → one canonical asset `SHA-256`

### 3.4 CycloneDX CBOM Generator
- `[x]` Create `app/services/cbom_generator.py`
- `[x]` Implement `generate_cyclonedx_cbom(assets, workspace, job) -> dict`
- `[x]` Include all required CycloneDX v1.6 fields (see IMPLEMENTATION_PLAN.md §3.4)
- `[x]` Include evidence occurrences (file + line) per component
- `[x]` Include ECDAT-specific properties (`ecdat:quantumVulnerable`, etc.)
- `[x]` Implement `POST /api/workspaces/{id}/cbom/generate` → trigger CBOM generation
- `[x]` Implement `GET /api/workspaces/{id}/cbom` → return latest CBOM JSON
- `[x]` Validate output against CycloneDX schema v1.6 (use `cyclonedx-python-lib` or manual validation)
- `[x]` Test: generated CBOM is valid CycloneDX JSON

### 3.5 Normalization Pipeline Integration
- `[x]` Add normalization step to scanner orchestrator (after evidence persistence)
- `[x]` Run `resolve_evidence_to_asset()` on all evidence after each scan
- `[x]` Trigger CBOM generation after normalization completes
- `[x]` Test: end-to-end: scan → evidence → normalize → assets → CBOM

**PHASE 3 DONE WHEN:** Scan produces canonical assets with correct normalization, CBOM passes schema validation

---

## PHASE 4 — QUANTUM RISK ENGINE
**Status:** `[x] COMPLETED` · **Target:** Day 11–14  
**Depends on:** Phase 3 (canonical assets exist)

### 4.1 Mosca Risk Calculator
- [x] Create `app/services/risk_engine.py`
- [x] Implement `calculate_mosca_risk(data_lifetime, migration_time, threat_horizon) -> dict`
- [x] Implement `DEFAULT_MIGRATION_TIME` lookup per algorithm family
- [x] Implement `is_weak_key_size(family, key_size) -> bool`
- [x] Implement `compute_asset_risk(asset) -> RiskScore`
- [x] Implement multi-dimensional risk: quantum exposure, classical risk, Mosca, composite
- [x] Implement `get_quantum_reason(asset) -> str`
- [x] Implement `get_classical_reason(asset) -> str`
- [x] Persist risk score to `risk_scores` table

### 4.2 Risk API Endpoints
- [x] `GET /api/workspaces/{id}/risk` — all assets with risk, sorted by composite priority
- [x] `GET /api/workspaces/{id}/risk/summary` — counts by level {critical, high, medium, low, safe}
- [x] `GET /api/assets/{id}/risk` — risk detail for one asset (full explanation JSON)
- [x] `POST /api/assets/{id}/risk/recalculate` — recalculate with custom parameters

### 4.3 Risk Trigger
- [x] Add risk computation step to pipeline (after normalization)
- [x] Compute risk for all assets in workspace after each scan

**PHASE 4 DONE WHEN:** Every asset has a risk score, RSA-2048 = HIGH/CRITICAL, SHA-1 = CRITICAL, AES-256 = LOW

---

## PHASE 5 — PQC RECOMMENDATION ENGINE
**Status:** `[x] COMPLETED` · **Target:** Day 14–17  
**Depends on:** Phase 4 (risk scores computed)

### 5.1 Recommendation Rule Table
- [x] Create `app/services/recommendation_engine.py`
- [x] Implement `RECOMMENDATION_TABLE` with all algorithm→function mappings (see IMPLEMENTATION_PLAN.md §5.1)
- [x] Cover: RSA/KEY_EXCHANGE, RSA/SIGNATURE, ECDSA/SIGNATURE, ECDH/KEY_EXCHANGE
- [x] Cover: SHA-1/HASH, MD5/HASH, DES/ENCRYPTION, DES3/ENCRYPTION, AES-128/ENCRYPTION
- [x] Implement `generate_recommendation(asset) -> Optional[Recommendation]`
- [x] Implement safe-asset detection (return None for safe algorithms)

### 5.2 Recommendation Persistence + API
- [x] Persist recommendations to `recommendations` table
- [x] `GET /api/workspaces/{id}/recommendations` — all recommendations for workspace
- [x] `GET /api/assets/{id}/recommendation` — recommendation for specific asset
- [x] Trigger recommendation generation after risk computation

**PHASE 5 DONE WHEN:** RSA-2048 → ML-KEM-768 recommendation, AES-256 → no recommendation

---

## PHASE 6 — ENTERPRISE NAVIGATION & MULTI-SOURCE DISCOVERY
**Status:** `[/] IN PROGRESS` · **Target:** Day 15–20  
**Depends on:** Phase 1 (Clerk), Phases 2–5 (backend functional)

### 6.1 Backend DB Refactoring (Multi-Source Support)
- [x] Create `Source` and `JobSource` SQLAlchemy models
- [x] Remove `source_url`/`source_type` from `DiscoveryJob`
- [x] Generate and run Alembic migration for schema changes
- [x] Update job creation API to accept multiple `source_ids`

### 6.2 Frontend Route Migration & Enterprise Sidebar
- [x] Move `/prototype` route to `/dashboard` (Reverted back to `/prototype` per user request)
- [x] Update `middleware.ts` for `/dashboard(.*)` (Reverted and fixed to avoid TypeError)
- [x] Create `src/app/prototype/layout.tsx` (Enterprise Sidebar)
- [x] Implement Sidebar Information Architecture: COMMAND CENTER, DISCOVERY, INTELLIGENCE, QUANTUM TRANSITION, ANALYST, SYSTEM
- [x] Implement collapsible sidebar, active states, and ECDAT styling (no purple gradients)

### 6.3 Mission Control (Dashboard Home)
- [ ] Refactor `dashboard/page.tsx` into an executive command center
- [ ] Summarize active sources, jobs, critical findings, and migration posture
- [ ] Integrate "Force Run Discovery" to queue a multi-source Scan Job

### 6.4 Sources Inventory Page
- [ ] Create `dashboard/sources/page.tsx`
- [ ] Implement "Add Source" form targeting `POST /api/workspaces/{wid}/sources`
- [ ] Display enterprise source inventory table
- [ ] Implement multi-select checkboxes for launching mass discovery

### 6.5 Scan Jobs Pipeline UI
- [ ] Create `dashboard/scans/page.tsx`
- [ ] Show scan progress states (Queued → Discovering → Analyzing → Normalizing → CBOM → Completed)
- [ ] Display partial completion numbers (e.g. 12/18 completed)

### 6.6 Analytics & Intelligence Pages (Placeholders)
- [ ] Create `dashboard/assets/page.tsx`
- [ ] Create `dashboard/cbom/page.tsx`
- [ ] Create `dashboard/graph/page.tsx`
- [ ] Create `dashboard/risk/page.tsx`
- [ ] Create `dashboard/migration/page.tsx`

**PHASE 6 DONE WHEN:** The multi-source DB model is live, and the sidebar accurately reflects the ECDAT enterprise lifecycle.

---

## PHASE 7 — TESTING + DEMO PREPARATION
**Status:** `NOT STARTED` · **Target:** Day 18–21  
**Depends on:** Phases 2–6

### 7.1 Ground Truth Test Fixtures
- [ ] Create `ecdat-test-fixtures/python/vulnerable.py` (RSA-2048, SHA-1, MD5, DES)
- [ ] Create `ecdat-test-fixtures/python/safe.py` (AES-256-GCM, SHA-256)
- [ ] Create `ecdat-test-fixtures/go/vulnerable.go` (rsa.GenerateKey, sha1.New)
- [ ] Create `ecdat-test-fixtures/go/safe.go` (sha256.New, AES-256)
- [ ] Create `ecdat-test-fixtures/javascript/vulnerable.js` (md5, DES)
- [ ] Create `ecdat-test-fixtures/dependencies/package.json` (jsonwebtoken)
- [ ] Create `ecdat-test-fixtures/dependencies/requirements.txt` (pycryptodome)
- [ ] Create `ecdat-test-fixtures/EXPECTED_FINDINGS.json`

### 7.2 Unit Tests
- [ ] Create `tests/test_normalizer.py` with all alias variant assertions
- [ ] Create `tests/test_risk_engine.py` with Mosca boundary conditions
- [ ] Create `tests/test_scanner.py` with ground truth fixture assertions
- [ ] Run `pytest tests/` — all pass
- [ ] Measure scanner precision/recall against EXPECTED_FINDINGS.json
- [ ] Confirm precision > 90%, recall > 85%

### 7.3 Demo Repository
- [ ] Create `ecdat-demo-app/` or equivalent public repository
- [ ] Include: Go auth service (RSA-2048 + SHA-1), Python API (MD5), npm (jsonwebtoken)
- [ ] Pre-scan demo repository against production/staging backend
- [ ] Record expected finding counts (DO NOT use fabricated numbers in demo)
- [ ] Confirm scan completes in < 3 minutes

### 7.4 Demo Script
- [ ] Write and document 6-minute demo script (see IMPLEMENTATION_PLAN.md §7.4)
- [ ] Rehearse full demo flow end-to-end
- [ ] Time each section
- [ ] Verify all data shown in demo is real (from actual scan)

### 7.5 UI Honesty Labels
- [ ] Add `[DEMONSTRATION DATA]` banner to any remaining synthetic UI sections
- [ ] Confirm no hardcoded asset data visible in Command Center without a scan
- [ ] Remove or label the "game" section in homepage if not updated
- [ ] Confirm empty states show CTAs (not fake data)

**PHASE 7 DONE WHEN:** All tests pass, demo runs end-to-end on real data in < 6 minutes

---

## PHASE 8 — AI ANALYST (V2, Post-SIH)
**Status:** `DEFERRED` · **Target:** Post-SIH

- [ ] Install `pgvector` PostgreSQL extension
- [ ] Create evidence embedding pipeline
- [ ] Build RAG retrieval system
- [ ] Implement LLM gateway with evidence-grounded prompts
- [ ] Implement output schema validation (evidence citations must be real)
- [ ] Build AI Analyst UI in `/prototype/ai`
- [ ] Test: AI only cites real evidence IDs
- [ ] Test: AI refuses to answer questions without evidence

---

## PHASE 9 — KNOWLEDGE GRAPH / NEO4J (V2, Post-SIH)
**Status:** `DEFERRED` · **Target:** Post-SIH

- [ ] Set up Neo4j instance (local or cloud)
- [ ] Define graph schema (see IMPLEMENTATION_PLAN.md §9.1)
- [ ] Build graph population pipeline from canonical assets
- [ ] Implement blast radius Cypher query
- [ ] Build graph visualization in `/prototype/graph`

---

## PHASE 10 — ENTERPRISE HARDENING (V3, Future)
**Status:** `DEFERRED` · **Target:** Future

- [ ] Multi-tenancy row-level security
- [ ] Full RBAC with Clerk Organizations
- [ ] Migration workspace (task management)
- [ ] CI/CD verification hooks
- [ ] Continuous drift detection
- [ ] Enterprise SSO
- [ ] Audit logging
- [ ] Compliance reporting

---

## QUICK SUMMARY TABLE

| Phase | Name | Status | Blocker |
|-------|------|--------|---------|
| 0 | Foundation & Environment | `[ ] NOT STARTED` | — |
| 1 | Clerk Authentication | `[ ] NOT STARTED` | Phase 0.3 |
| 2 | Discovery Backend | `[ ] NOT STARTED` | Phase 0.1, 0.2 |
| 3 | Normalization + CBOM | `[ ] NOT STARTED` | Phase 2 |
| 4 | Quantum Risk Engine | `[x] COMPLETED` | — |
| 5 | PQC Recommendation | `[x] COMPLETED` | — |
| 6 | Frontend Wiring | `[ ] NOT STARTED` | Phase 1, 2-5 |
| 7 | Testing + Demo | `[ ] NOT STARTED` | Phase 2-6 |
| 8 | AI Analyst | `[~] DEFERRED` | Phase 6 |
| 9 | Knowledge Graph | `[~] DEFERRED` | Phase 6 |
| 10 | Enterprise | `[~] DEFERRED` | Phase 6 |

---

*Last updated by: Antigravity (2026-09-02T23:17)*  
*Next agent: Pick up Phase 6 — Frontend Wiring & Multi-Source Dashboard.*
