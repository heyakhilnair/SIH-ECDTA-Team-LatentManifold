# ECDAT — MASTER IMPLEMENTATION TRACKER
**Project:** SIH26164 · LatentManifold · SIH2026-143  
**Last Updated:** 2026-09-04 — Phases 11–15 all completed, tested, and live-verified (see each phase section + the bug list below). Phase 16 (containers/binaries/cloud/continuous scanning) remains deliberately deferred — P3/post-SIH per its own source PDFs, needs new external tools (Trivy, Syft, LIEF, YARA) not installed in this environment. That's the full hackathon-scope backlog done.  
**Updating Agent Rule:** When you complete a task, change `[ ]` to `[x]`. When starting, change to `[/]`. If blocked, add `[!]` and note the blocker inline.

> For full task specs (code, DoD, schemas), read `docs/IMPLEMENTATION_PLAN.md`  
> For quick context pickup, read `docs/AGENT_CONTEXT.md`  
> **For known bugs and architecture gaps in Phases 0–6, read `docs/BACKEND_AUDIT_PHASE0-6.md` before trusting any `[x]` below at face value.** Several boxes here were marked done by prior agents when the code was actually a stub or non-functional — the audit corrects those; this file's checkmarks alone are no longer sufficient.

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
**Fixed 2026-09-03 — `routers/jobs.py` and `routers/sources.py` now require a verified Clerk session and check workspace/job ownership on every endpoint (BACKEND_AUDIT #2).**
- [x] Implement `POST /api/jobs` — create discovery job (returns job ID immediately)
- [x] Implement `GET /api/jobs` — list jobs for workspace (with status)
- [x] Implement `GET /api/jobs/{job_id}` — get job detail
- [x] Implement `DELETE /api/jobs/{job_id}` — cancel job
- [x] Implement `GET /api/jobs/{job_id}/evidence` — get evidence for job — was a stub, now a real workspace-checked, paginated query (BACKEND_AUDIT #6, fixed 2026-09-03)
- [x] Implement job status state machine: queued → running → completed/failed
- [~] Set up Celery + Redis for async job execution — **decision: dropped.** Never had real infra (no redis service anywhere) and never a real dependency; in-process `BackgroundTasks` is the deliberate choice going forward (BACKEND_AUDIT #9)
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
- `[x]` Validate output against CycloneDX schema v1.6 (use `cyclonedx-python-lib` or manual validation) — manual `validate_cbom()` added + real `primitive` enum mapping (BACKEND_AUDIT #11, fixed 2026-09-03)
- `[x]` Test: generated CBOM is valid CycloneDX JSON — covered in `ecdat-backend/test_phase6_audit.py`

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

**Found 2026-09-03, fixed same day (BACKEND_AUDIT #14):** the logic below was always correct, but `app/models/risk.py` had been rewritten with a different column set at some point with no migration to match — the live `risk_scores` table still had the original Phase 4 columns. Every `compute_asset_risk()` call crashed against the real database (confirmed empirically: 0 rows in `risk_scores` despite real evidence/assets existing), silently, since nothing caught it. Migration `d2e5f9a1b4c7` fixed the schema; the orchestrator now wraps this stage in `try/except` so a future break marks the job `failed` instead of hanging forever.

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
**Status:** `[x] COMPLETED` · **Target:** Day 15–20  
**Depends on:** Phase 1 (Clerk), Phases 2–5 (backend functional)

All 6.3–6.6 pages are wired to real API calls (no hardcoded data). The P0 auth bug and the deeper #14 schema-drift bug that were blocking every page from showing real data are both fixed and empirically verified — see `docs/BACKEND_AUDIT_PHASE0-6.md`.

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
- [x] Refactor `prototype/page.tsx` into an executive command center
- [x] Summarize active sources, jobs, critical findings, and migration posture
- [x] Integrate "Force Run Discovery" to queue a multi-source Scan Job

### 6.4 Sources Inventory Page
- [x] Create `prototype/sources/page.tsx`
- [x] Implement "Add Source" form targeting `POST /api/workspaces/{wid}/sources`
- [x] Display enterprise source inventory table
- [x] Implement multi-select checkboxes for launching mass discovery

### 6.5 Scan Jobs Pipeline UI
- [x] Create `prototype/scans/page.tsx`
- [x] Show scan progress states (queued/running/completed/failed badges, 3s poll)
- [!] Display partial completion numbers (e.g. 12/18 completed) — "Crypto Assets Found" column always shows `—`, backend hardcodes `evidence_count=0`, see BACKEND_AUDIT #4

### 6.6 Analytics & Intelligence Pages
- [x] Create `prototype/assets/page.tsx`
- [x] Create `prototype/cbom/page.tsx`
- [x] Create `prototype/graph/page.tsx` (client-side derived from assets list — no dedicated graph backend/Neo4j yet, that's Phase 9)
- [x] Create `prototype/risk/page.tsx`
- [x] Create `prototype/migration/page.tsx`
- [x] (Bonus, not originally scoped here) `prototype/pqc/page.tsx` PQC Workbench + `prototype/recommendations` route alias

**PHASE 6 DONE WHEN:** The multi-source DB model is live, and the sidebar accurately reflects the ECDAT enterprise lifecycle. ✅ Done — demo-ready as of 2026-09-03.

---

## PHASE 7 — TESTING + DEMO PREPARATION
**Status:** `[x] COMPLETED` · **Target:** Day 18–21  
**Depends on:** Phases 2–6

**Full report: `docs/PHASE7_TESTING_REPORT.md`.** Ground truth precision/recall: 100%/100% (real pipeline, real fixtures) — but only after fixing 3 real scanner/normalizer bugs found while building the fixtures. Demo flow verified live: real GitHub scan → real risk scores → real PQC recommendation → real CycloneDX CBOM, with the user's actual signed-in Clerk session. **That live walkthrough then found the single most severe bug of this whole phase**: Crypto Assets 500'd on every real request (a bad SQLAlchemy backref in `models/risk.py`, `CryptoAsset.risk_score` was a list, not a scalar — invisible until real risk-scored data + a real page load collided) plus a Clerk `getToken` instability causing a refetch storm across ~10 pages. Both fixed and re-verified live.

### 7.1 Ground Truth Test Fixtures
- [x] Create `ecdat-test-fixtures/python/vulnerable.py` (RSA-2048, SHA-1, MD5, DES)
- [x] Create `ecdat-test-fixtures/python/safe.py` (AES-256-GCM, SHA-256)
- [x] Create `ecdat-test-fixtures/python/mixed.py` (mixed + negative/edge cases per Phase 20 PDF)
- [x] Create `ecdat-test-fixtures/go/vulnerable.go` (rsa.GenerateKey, sha1.New)
- [x] Create `ecdat-test-fixtures/go/safe.go` (sha256.New, AES-256)
- [x] Create `ecdat-test-fixtures/go/certificates.go` (ECDSA P-256 cert keygen; TLS cipher suite gap documented, not detected)
- [x] Create `ecdat-test-fixtures/javascript/vulnerable.js` (md5, sha1, 3des, RSA keygen)
- [x] Create `ecdat-test-fixtures/javascript/safe.js` (crypto.subtle AES-GCM)
- [x] Create `ecdat-test-fixtures/dependencies/package.json` (jsonwebtoken, crypto-js)
- [x] Create `ecdat-test-fixtures/dependencies/requirements.txt` (pycryptodome, pyOpenSSL)
- [x] Create `ecdat-test-fixtures/dependencies/go.mod` (golang.org/x/crypto — single-line `require`, exercises a real parser bug found+fixed here)
- [x] Create `ecdat-test-fixtures/EXPECTED_FINDINGS.json` — generated from the real pipeline's actual output, not hand-guessed

### 7.2 Unit Tests
- [x] Create `tests/test_normalizer.py` with all alias variant assertions (56 cases)
- [x] Create `tests/test_risk_engine.py` with Mosca boundary conditions (10 boundary tests)
- [x] Create `tests/test_scanner.py` with ground truth fixture assertions (precision/recall/negative-case tests)
- [x] Run `pytest tests/` — all pass (107/107; pytest wasn't even installed before this — added to requirements.txt)
- [x] Measure scanner precision/recall against EXPECTED_FINDINGS.json
- [x] Confirm precision > 90%, recall > 85% — **100%/100%**, after fixing 3 real bugs found in the process (see `docs/PHASE7_TESTING_REPORT.md`)

### 7.3 Demo Repository
- [x] Use a real public repository instead of a synthetic one: `https://github.com/heyakhilnair/SIH-ECDTA-Team-LatentManifold`
- [x] Confirmed real findings: RSA, SHA-1, MD5, dependency packages
- [x] Pre-scanned live against the real dev backend (not staging — none exists yet)
- [x] Recorded real finding counts in `docs/PHASE7_TESTING_REPORT.md` (16 findings → 4 assets)
- [x] Scan completed in ~95 seconds

### 7.4 Demo Script
- [x] Write and document 6-minute demo script — `docs/DEMO_SCRIPT.md`, written against the real running UI
- [ ] Rehearse full demo flow end-to-end — **team action, not something a coding session can do**
- [ ] Time each section — do this during rehearsal
- [x] Verify all data shown in demo is real (from actual scan) — confirmed live in the browser

### 7.5 UI Honesty Labels
- [x] Add `[DEMONSTRATION DATA]` banner to any remaining synthetic UI sections — none found; nothing is synthetic
- [x] Confirm no hardcoded asset data visible in Command Center without a scan
- [x] Remove or label the "game" section in homepage if not updated — homepage's Mosca simulator is explicitly interactive/illustrative, not presented as real scan data; no change needed
- [x] Confirm empty states show CTAs (not fake data)
- [x] **Found and fixed a real gap not in the original checklist**: 8 sidebar links (Blast Radius, Evidence, Quantum Posture, Verification, AI Analyst, Forecast & Labs, Activity, Compliance) 404'd — no route existed at all. Added honest "not built yet" placeholder pages instead of leaving broken demo-day links.

**PHASE 7 DONE WHEN:** All tests pass, demo runs end-to-end on real data in < 6 minutes ✅

---

## PHASE 8 — AI ANALYST
**Status:** `[/] IN PROGRESS — MVP built 2026-09-03, awaiting GEMINI_API_KEY` · **Target:** Post-SIH, pulled forward per user request

Scope deliberately cut down from the original checklist below — see
`docs/PHASE8_10_REPORT.md` for the full reasoning (Phase 14 PDF §38-39 argues
tool-calling/structured-query grounding beats naive embedding-stuffing for
tabular evidence data; pgvector/embeddings were dropped in favor of a
ranked, filtered real-data context builder that gets most of the same
benefit with far less moving infrastructure). Provider is Gemini
(`google-genai`), not OpenAI/Anthropic — user's call.

- [~] Install `pgvector` PostgreSQL extension — **deliberately skipped, see above**
- [~] Create evidence embedding pipeline — **deliberately skipped, see above**
- [x] Build evidence-grounded retrieval — real DB query (top-15 assets by composite risk, real risk/recommendation/evidence-location data, zero raw source code) instead of a vector index
- [x] Implement LLM gateway with evidence-grounded prompts — `app/services/ai_analyst.py`, Gemini `gemini-2.0-flash`, structured JSON output via `response_schema`
- [x] Implement output schema validation (evidence citations must be real) — `verify_citations()`, strips any citation that doesn't resolve to a real row in *that* workspace (catches hallucinations AND cross-tenant leaks identically)
- [x] Build AI Analyst UI — real chat page at `/prototype/analyst` (not `/prototype/ai` — matches the existing route already in the sidebar), shows an honest "not configured" state rather than a fake response when no key is set
- [x] Test: AI only cites real evidence IDs — `tests/test_ai_analyst.py`, including a cross-tenant-citation-rejection test
- [x] Test: AI refuses to answer questions without evidence — empty-workspace case returns an honest "no scan data" answer, not a guess
- [ ] **Blocked**: add a real `GEMINI_API_KEY` to `ecdat-backend/.env` and restart the backend to actually exercise the generative call live — everything up to that call is real and tested

---

## PHASE 9 — KNOWLEDGE GRAPH / NEO4J (V2, Post-SIH)
**Status:** `DEFERRED — explicitly skipped per user decision 2026-09-03 (no Neo4j instance provisioned)` · **Target:** Post-SIH

- [ ] Set up Neo4j instance (local or cloud)
- [ ] Define graph schema (see IMPLEMENTATION_PLAN.md §9.1)
- [ ] Build graph population pipeline from canonical assets
- [ ] Implement blast radius Cypher query
- [ ] Build graph visualization in `/prototype/graph`

---

## PHASE 10 — ENTERPRISE HARDENING (V3, Future)
**Status:** `[/] IN PROGRESS — audit logging built 2026-09-03` · **Target:** Future

- [x] Audit logging — real, append-only `audit_log` table (Phase 19 PDF §75-77 event taxonomy), wired into workspace creation, policy changes, source registration, scan start/cancel, CBOM generation, and AI Analyst queries; real `GET /api/workspaces/{id}/activity` feed (now titled "Audit Trail" in the sidebar) replacing the `/prototype/activity` placeholder — see `docs/PHASE8_10_REPORT.md`
- [x] AI Analyst data-access control (Phase 8 PDF §56-59 "Sensitive Repository → Local AI Required") — per-`Source.ai_excluded` boolean (toggle live on the Sources/"Projects" page). `ai_analyst.build_context()` excludes any asset whose evidence comes *only* from an `ai_excluded` source before the prompt is ever built, not just at display time. Covered by `test_build_context_excludes_ai_excluded_sources` in `tests/test_ai_analyst.py`.
- [x] AI Analyst now names its sources concretely — `build_context()` attaches which project (`Source.name`) each evidence item came from, plus a top-level `scope` label ("All projects" vs. the one selected project); the router resolves verified `evidence_citations` into `citation_details` (file/line/project) for the frontend to render as real, clickable-looking attribution instead of a bare "N citations" count. Evidence sampled per-asset is now sorted most-recent-first (an asset accumulates evidence across every scan over its lifetime, so a naive slice skewed toward old/unattributed rows). Chat clears on project switch (stale answers scoped to a different project were otherwise left on screen). Covered by `test_build_context_names_the_project_per_evidence_and_scope`.
- [x] Migration Planner rewritten to be concrete, not decorative — replaced a fabricated "Topological Execution Hierarchy / TOPOLOGICAL SORT VERIFIED" banner (no such sort was ever computed; this violated the project's own no-fake-data rule) with a real "How this works" explainer and per-column action guidance (`next` field: the literal condition for advancing a card). Clicking a card opens a concrete migration guide drawer (reusing the Assets page's detail-fetch pattern) — real recommended algorithm, hybrid path, exact file:line locations to change, and complexity/confidence, not just a label.
- [x] Risk & Exposure and PQC Workbench "hardcoded"/"same for every asset" fixes (2026-09-04) — user report: every algorithm showed identical Mosca timeline numbers, the timeline bar was a fixed decorative 25/50/25% split, "Primary Factor" text was truncated with no way to read the rest, and a project with 6 real risky assets only produced 3 PQC recommendations. Root causes found and fixed:
  - `risk_engine.py`: the Mosca (X+Y-vs-Z) composite-risk branch ran unconditionally for every asset regardless of `quantum_exposure` — a bare `AES` call with no confirmed key size (neither classically nor quantum vulnerable) still got bumped to composite HIGH purely from the workspace's default timeline. Now gated behind `quantum_exposure == "HIGH"`. Regression test: `test_phase6_audit.py::test_mosca_only_applies_to_quantum_vulnerable_assets`.
  - `recommendation_engine.py` / `vulnerability_registry.py` / `alias_registry.py`: Blowfish and MD2 had no entry anywhere (no alias, no vulnerability classification, no recommendation rule) — findings for them were scanned but silently produced no asset (MD2) or no recommendation (Blowfish). Both added with real CVE-adjacent reasoning (Sweet32-style birthday attack for Blowfish's 64-bit block, RFC 6149 deprecation for MD2). Tests: `tests/test_recommendation_engine.py`.
  - `asset_resolver.py`: **the actual reason the fixes above didn't show up on existing assets even after a fresh re-scan** — `resolve_evidence_to_asset()` only ever computed `quantum_vulnerable`/`classical_vulnerable`/`vulnerability_notes`/`algorithm_family` at asset *creation*; an already-existing asset (e.g. Blowfish, scanned before this fix existed) only got its `last_seen` bumped on every subsequent scan, forever frozen at its original (wrong) classification. Now re-evaluated on every resolution, not just creation — an asset's classification self-heals as ECDAT's own knowledge improves, no backfill script needed.
  - Frontend (`src/app/prototype/risk/page.tsx`): replaced the fixed-percentage decorative timeline bar with one computed from the real top-priority asset's actual X/Y/Z; added a click-to-open detail drawer with the full untruncated quantum/classical/Mosca explanation (the table cell stays truncated for scannability, but is no longer a dead end); added one-line explanations to each of the 5 risk-level summary cards; documented that X (data lifetime) is an honest shared workspace default (7y) ECDAT can't infer from code alone, not a bug, with a clear path to override it per-asset via What-If.
- [x] Clojure scanning support — added after investigating a real "0 findings" report on `bitwalker/crypto-experiments`: no scanner understood Clojure at all (tree-sitter only had python/go/js grammars). Added via `tree-sitter-language-pack` (prebuilt grammar bundle, no separate per-language package needed) — `source_scanner.py` detects `.clj/.cljs/.cljc`, walks Lisp's uniform `list_lit` node shape innermost-first to avoid one real call producing a duplicate finding per enclosing form, and matches Java-interop crypto (`MessageDigest/getInstance`, `Cipher/getInstance`, ...) plus common Clojure crypto libs (`buddy.core.*`, `caesium`, weavejester `crypto-*`). `dependency_scanner.py` now also parses `project.clj` (Leiningen) and `deps.edn` (tools.deps). 8 new tests in `tests/test_clojure_scanner.py`. **Important:** `bitwalker/crypto-experiments` itself still correctly reports 0 findings even with this fix — verified directly against the real file — because it's a hand-rolled XOR/hex-cipher learning exercise that never calls any recognized crypto API or library; that's the honest result, not a remaining bug.
- [x] Project/source scoping — `evidence.source_id` (migration `f4a8b1c6e2d9`) lets every downstream query attribute findings back to the project that produced them. `?source_id=` filtering added to `GET .../assets`, `.../risk`, `.../risk/summary`, `.../recommendations`, `.../cbom` (filters the persisted CycloneDX snapshot's components at read time), and `POST .../analyst/query`. Frontend: a shared `ProjectFilter` dropdown (`src/components/ProjectFilter.tsx`) wired into Assets/Risk/CBOM/PQC/Migration/Graph/AI Analyst, each page keeping its own local selection (never shared across pages, per explicit user request) — the Sources page's per-project "Assets →/Risk →/Migration →" links pre-seed it via a `?source=` URL param.
- [x] Two real scanner precision bugs found and fixed (2026-09-04) — investigating a confusing "SHA-256 shows CRITICAL" report (it was actually `SHA-1:2048`/`SHA-1:256`, easy to misread) surfaced that most of this repo's own "Test" project findings were false positives:
  - `extract_function_calls()` matched crypto keywords anywhere in a `call_expression`'s full text, including string-literal *arguments* — so a logging call whose argument array merely *mentioned* `"crypto.createHash('md5')"` (this repo's own marketing page has fake simulated-scan-log strings for a UI demo) got flagged as a real MD5 call. Fixed: matching now uses the callee plus only its *direct* string-literal arguments (so `createHash('md5')` still matches, but a keyword buried inside an unrelated arrow-function/array argument doesn't). Same class of bug fixed for the JS `require(...)` import check.
  - `.ts`/`.tsx` files were parsed with plain `tree-sitter-javascript`, which can't handle TypeScript-only syntax — hitting it forces error-recovery that can misattribute huge unrelated chunks of a file into one bogus node (confirmed live: a `const pqcTargets = {...huge demo object...}` in the *committed* GitHub version of Mission Control got mis-parsed as part of a giant fake call, dragging in its demo strings as "evidence"). Fixed by giving `.ts`/`.tsx` their own real grammars (`tree-sitter-language-pack`'s `typescript`/`tsx`) instead of reusing the plain JS one.
  - 4 regression tests in `tests/test_scanner_precision.py`. Verified directly against both real files post-fix: 0 findings (correct — neither actually calls a crypto API).
  - The workspace's accumulated evidence/assets/risk/recommendations/CBOM snapshots (481 evidence rows across all 3 registered projects, product of pre-fix scans) were wiped and all 3 sources re-scanned fresh at the user's explicit request — sources themselves were untouched, only their derived scan data.
- [x] `serialize_asset()` now reports which project(s) an asset's evidence actually came from (`"projects": [...]`, real names via a `Source` join) — user request: "the crypto assets tab should be sorted according to projects, and they can see where the particular asset is placed within their project." Crypto Assets page groups into one card per project when viewing "All Projects" (a shared asset like MD5 appears once under each project it's actually in); the detail drawer shows "Found in: 📁 X" and links to that project's Migration Planner guide. 4 tests in `tests/test_assets_router.py`.
- [x] Migration Planner "Fully Migrated" no longer lies — it used to auto-drop any never-at-risk asset (SHA-256, AES, a safe dependency) straight into the "Fully Migrated" column, which reads as "this was migrated" when it was simply never at risk. Confused the user into asking whether ECDAT was silently editing their code (it never does — Migrated is a purely local, user-set marker). Fixed: only genuinely at-risk assets appear on the board at all; "Fully Migrated" is now reachable *only* via the user's own "Advance" click. Already-safe assets get an honest count line instead ("N other assets are already quantum-safe... see Crypto Assets").
- [x] Mission Control: fixed the same "reason contradicts its own risk badge" truncation bug Risk & Exposure had (full text now, wraps instead of an ellipsis dead-end); replaced the "PQC Migration Readiness: 60%" card (a confusing `recommendations / total_assets` ratio that doesn't mean "percent done") with **"Already Quantum-Safe: N of M"** + a real "K need migration · K have a plan ready" line; replaced the "Live Discovery Log" panel — which recomputed `new Date().toLocaleTimeString()` against static IF-conditions on every render, i.e. looked live but wasn't — with real recent rows from the same audit-log endpoint the Activity page already uses, real timestamps included.
- [~] Multi-tenancy row-level security — **deliberately not done as classic Postgres RLS; see docs/PHASE8_10_REPORT.md for why and what's there instead.** This app authenticates via a single service `DATABASE_URL`, not per-user Postgres roles/JWT claims (the pattern RLS is designed around, e.g. Supabase's `auth.uid()`) — real RLS here would need `SET LOCAL app.workspace_id` plumbed into every request before any query runs, a genuinely invasive change to `get_db()`/routing this late in a hackathon cycle. Isolation is enforced today at the application layer instead: every route requires `verify_workspace_access` (see `docs/BACKEND_AUDIT_PHASE0-6.md`), and this was verified to actually reject cross-tenant access, not just claim to.
- [ ] Full RBAC with Clerk Organizations — needs the user to enable Clerk Organizations in their Clerk dashboard first (external dependency, not something to build blind)
- [ ] Migration workspace (task management) — **superseded by Phase 11.1 below**, which found the real root cause (state was never persisted at all)
- [ ] CI/CD verification hooks
- [ ] Continuous drift detection
- [ ] Enterprise SSO
- [ ] Compliance reporting — **expanded into Phase 14 below**

---

## GAP ANALYSIS — 2026-09-04

Cross-referenced all 22 phase PDFs (`docs/Phase 1.pdf` … `docs/Phase 22.pdf`, already
extracted once into `docs/PRODUCT_REFERENCE.md` — spot-verified against the raw Phase 17
PDF directly, content matches) against `docs/IMPLEMENTATION_PLAN.md` and the actual
running code. Everything below is a **real** gap, confirmed by reading the actual
router/model/page files, not inferred from the PDFs alone. Phases 11–16 are new;
Phase 9's scope is clarified (not replaced) by Phase 13.1.

**Priority key:** P0 = do first (blocks other work / a real correctness gap), P1 = high
value, P2 = valuable but not urgent, P3 = post-SIH nice-to-have (matches Phase 22 PDF's
own "Nice to Have" list — do not build ahead of this order).

---

## PHASE 11 — MIGRATION STATE PERSISTENCE & QUANTUM READINESS SCORE
**Status:** `[x] COMPLETED 2026-09-04` · **Priority:** P0 · **Source:** Phase 17 PDF §25–41, 99–103; Phase 18 PDF §45
**Depends on:** Phase 4 (risk), Phase 5 (recommendations) — both done

### 11.1 Migration State Persistence (real bug, found during this audit)
- [x] `crypto_assets.migration_status` (+ `migration_status_updated_at`, `migration_verified_at`
      for Phase 12) — migration `b3d5f7a9c1e2`. `ASSESSED | PLANNED | IN_DEV | TESTING | MIGRATED`.
- [x] `PATCH /api/assets/{id}/migration-status` (`app/routers/assets.py`) — validates against
      the enum, 404s cross-tenant, logs `MIGRATION_STATUS_CHANGED` via the existing audit pattern.
- [x] Frontend: `migration/page.tsx`'s `assetStates` useState removed entirely — `moveAsset` now
      calls the PATCH endpoint with optimistic update + rollback-on-failure; board reads
      `asset.migration_status` directly from the real fetch. "How this works" banner text updated
      (no longer claims "this browser only").
- [x] Test: `test_phase11_migration_and_readiness.py` [1] — real DB round-trip (default ASSESSED →
      set IN_DEV → fresh session re-fetch confirms it persisted), plus `tests/test_assets_router.py`
      serialization coverage.

### 11.2 Quantum Readiness Score (QRS)
- [x] `app/services/readiness_engine.py` — `compute_readiness_score()`: coverage, risk_posture,
      pqc_adoption, migration_progress (all real, from 11.1), governance (honest 30-day audit-activity
      proxy), `crypto_agility: null` (not measured — no policy engine yet, Phase 14). Weights are a
      module-level `DEFAULT_WEIGHTS` dict, not hidden inline.
- [x] `GET /api/workspaces/{id}/readiness-score` (`app/routers/workspaces.py`).
- [x] Frontend: Mission Control QRS tile (score circle + level), click-to-expand real per-dimension
      breakdown with bars — never shows the bare number, matches PDF §30's explicit warning.
- [x] Test: `test_phase11_migration_and_readiness.py` [2]+[3] — empty workspace doesn't get
      penalized as "risky" just for being unscanned (0% coverage ≠ 0% risk_posture), and a workspace
      with real scan/migration data moves the score in the expected direction with exact percentages
      asserted. `readiness_level()` band boundaries also covered.
- [ ] Weights configurable via workspace settings — **deferred**, `DEFAULT_WEIGHTS` is real and
      documented but not yet exposed through `PATCH /workspaces/{id}/settings`; low priority since
      the defaults are reasonable and this was never blocking anything else.

**PHASE 11 DONE WHEN:** Migration board survives a reload, and Mission Control shows a real, breakdown-backed Quantum Readiness Score — not a fabricated one. ✅ Both true, verified live + via `test_phase11_migration_and_readiness.py` (3/3 pass) and `tests/test_assets_router.py` (5/5 pass).

---

## PHASE 12 — MIGRATION VERIFICATION ENGINE
**Status:** `[x] COMPLETED 2026-09-04` · **Priority:** P0 · **Source:** Phase 18 PDF §49–50; Phase 22 PDF Engine 5
**Depends on:** Phase 3.4 (CBOM snapshots already versioned), Phase 11.1

This is the "V" in the product's own DISCOVER→…→VERIFY pipeline (`PRODUCT_REFERENCE.md`
§1) and the literal 6th minute of the demo script (`docs/DEMO_SCRIPT.md` / PDF §49:
"Migration is not complete simply because a developer says 'we migrated.' ECDAT should
rescan.").

**Deliberate design deviation from the plan below:** built as a real rescan + real
evidence-link check, not a CBOM-snapshot diff. A snapshot diff would still just be
comparing two point-in-time scan results — the scan pipeline itself is the source of
truth either way — so diffing two CBOM documents is an extra layer of indirection over
the same underlying evidence with no accuracy gain, and CBOM's `algorithm_canonical`-only
matching can't distinguish "still present" from "a same-named but different asset
appeared." Checking the live `EvidenceAsset` link for the specific rescan job is more
direct and just as real.
- [x] `POST /api/workspaces/{wid}/jobs` (existing, unmodified) triggers the rescan — no duplicate scan-triggering code was written; scoped to one `source_id`, polled exactly like Scan Jobs already does.
- [x] `GET /api/assets/{id}/verify-migration?job_id=&source_id=` (`app/routers/assets.py`) — checks whether `EvidenceAsset` still links the asset to any evidence from that specific job+source. Zero matches → `VERIFIED`, sets `migration_verified_at` + forces `migration_status = MIGRATED`, logs `MIGRATION_VERIFIED` audit event. One or more matches → `STILL_PRESENT` with the real occurrence count, **no state change** — a user's click never marks something migrated, only a confirmed absence of evidence does (mirrors the same principle already applied to Migration Planner's "Fully Migrated" column). 409s if the job isn't `completed` yet (refuses to answer early rather than guessing).
- [x] Frontend: `verification/page.tsx` rewritten from `RoadmapPlaceholder` — lists real `TESTING`/`MIGRATED` assets, expands to the real project(s) each asset's evidence was found in (from `GET /api/assets/{id}`'s evidence list, not a name-matched guess), "Rescan & Verify" triggers the job, polls `GET /api/jobs/{id}` every 3s (10 min timeout), then calls verify-migration and shows the real result inline.
- [x] Test: `test_phase12_verification.py` [1] — zero-evidence rescan → VERIFIED + state change; rescan that still finds it → STILL_PRESENT + no state change (asserts board doesn't silently advance); checking before the job completes → 409.
- [x] Live-verified end-to-end against real user data: advanced a real `MD2` asset (found in `B-Con/crypto-algorithms`) to Testing, clicked Verify, watched a real discovery job clone+scan+normalize+risk+CBOM (135 findings, ~65s), and got back an honest `STILL_PRESENT (2 occurrences)` — correct, since that real GitHub repo's MD2 code was never actually changed. Board correctly left the card in "Testing & Verification", not "Fully Migrated".

**PHASE 12 DONE WHEN:** Clicking "Verify" on a migrated asset triggers a real rescan and shows a real, evidence-based result — not a status the user sets by hand. ✅

---

## PHASE 13 — UNIFIED EVIDENCE, QUANTUM POSTURE & BLAST-RADIUS-LITE
**Status:** `[x] COMPLETED 2026-09-04` · **Priority:** P1 · **Source:** Phase 5 PDF (evidence), Phase 6 PDF (Shor/Grover stratification), Phase 16 PDF (blast radius)
**Depends on:** none new — all data already exists in `evidence`/`crypto_assets`/`risk_scores`

Three of the six remaining `RoadmapPlaceholder` pages (`blast-radius`, `evidence`,
`quantum`) don't actually need Phase 9's Neo4j instance — they needed real endpoints over
data ECDAT already has.
- [x] `GET /api/workspaces/{id}/evidence` (`app/routers/evidence.py`, new file) — paginated (`limit`/`offset` + real `total`), filterable by `source_id`, `source_type`, `algorithm` (prefix match on the resolved asset's `algorithm_canonical`, via an `EvidenceAsset`→`CryptoAsset` join), `detector`, `min_confidence`, and free-text `search` (file path or matched code). Resolves source names + algorithm labels for the returned page only (2 lookups, not N+1). Frontend: `evidence/page.tsx` rewritten — debounced search, project/type filters, GitHub deep-links via the now-shared `src/lib/githubLink.ts` (extracted from Migration Planner's local copy so both pages use one implementation), pagination. Live-verified: 4162 real evidence rows from the actual workspace; a "rsa" search correctly narrowed to 840.
- [x] `GET /api/workspaces/{id}/quantum-posture` (`app/routers/workspaces.py`) — stratifies every real asset into Shor-vulnerable (`CryptoAsset.quantum_vulnerable`, computed at scan time), Grover-weakened (symmetric-cipher families only — AES/DES/Blowfish — matching `is_grover_weakened()`), and safe. Frontend: `quantum/page.tsx` rewritten — 3-column real counts + asset chips. Live-verified against real data: 7 Shor / 0 Grover / 18 safe (this workspace has no scanned AES-128 with a detected key size — an honest zero, not a bug).
- [x] `GET /api/assets/{id}/blast-radius-lite` (`app/routers/assets.py`) — real project count, file count + list (capped at 50 for response size, count is uncapped), and co-located assets sharing the same project(s), from the existing `EvidenceAsset`/`Source` joins (`serialize_asset()`'s `projects` field uses the same data). Explicitly labeled "not a real Application→Service dependency graph" in the response's own `note` field — ECDAT has no Application entity (that's Phase 9's Neo4j work). Frontend: `blast-radius/page.tsx` rewritten — asset picker (sorted by real evidence count) + detail panel. Live-verified: SHA-256 → 2 projects/44 files/23 co-located; RSA:2048 → 1 project/2 files/22 co-located.
- [x] Test: `test_phase13_evidence_quantum_blast.py` [1] — evidence filters + pagination totals; quantum-posture bucketing (including the AES-128 fix below); blast-radius reach + shared-asset detection + honest zero for an asset with no evidence.

**Real bug found building this (see TRACKER.md's bug list below):** `vulnerability_registry.GROVER_WEAKENED['AES-128']` could never match — fixed with a proper `is_grover_weakened()` helper. **Second real issue found verifying live:** that same registry also lists `'SHA-256'` (a hash) under `GROVER_WEAKENED`, which would have bucketed it under quantum-posture's "needs a key-size doubling" subtitle — factually wrong for a hash. Scoped the endpoint to symmetric-cipher families only; SHA-256 correctly lands in "safe" (regression-tested).

**PHASE 13 DONE WHEN:** 3 of the 6 remaining placeholder pages show real data; the other 3 (`verification` → Phase 12 ✅, `compliance` → Phase 14, `labs` → intentionally still deferred, no phase assigned) are tracked separately. ✅

---

## PHASE 14 — POLICY, COMPLIANCE & ALERTING
**Status:** `[x] COMPLETED 2026-09-04` · **Priority:** P1 · **Source:** Phase 17 PDF §51–61; Phase 19 PDF (ZTA/audit)
**Depends on:** Phase 10 (audit logging, already real)

**Deliberate design deviation from the plan below:** no `Policy` DB table. Same
situation as `readiness_engine.py`'s `DEFAULT_WEIGHTS` — there's no per-workspace
policy-editing UI planned for this phase, so a table with no way to ever write a second
row would just be an empty abstraction. Rules live as constants in `policy_engine.py`,
**derived from `vulnerability_registry.py`'s existing classifications** (per the plan's
own instruction, not invented), and evaluated live against current asset state — same
pattern `compute_readiness_score()` already established, so there's nothing to go stale.
- [x] `app/services/policy_engine.py` (new) — `evaluate_asset(asset) -> {status, rule} | None` (FORBIDDEN: `CLASSICALLY_VULNERABLE` algorithms + RSA<2048; REVIEW: `QUANTUM_VULNERABLE` algorithms), `list_policy_violations(db, workspace_id)` (live-computed, same pattern as readiness score), `check_and_log_new_violation(db, workspace_id, asset, risk)` — logs `POLICY_VIOLATION_DETECTED`/`NEW_CRITICAL_ASSET` audit events, but **only the first time ever** per asset (dedup via an `AuditLog` existence check) so a rescan re-confirming a known violation doesn't spam the alerts feed.
- [x] Orchestrator integration: `orchestrator.py`'s existing per-asset risk loop now calls `check_and_log_new_violation(session, workspace_id, asset, risk)` right after `compute_asset_risk()`, passing its return value directly (not `asset.risk_score` — the relationship isn't guaranteed refreshed at that point in the flush cycle).
- [x] `GET /api/workspaces/{id}/policy-violations` (`app/routers/workspaces.py`) — real violation list + forbidden/review counts.
- [x] `GET /api/workspaces/{id}/alerts` (`app/routers/audit.py`'s new `alerts_router`) — the same audit_log table, filtered to the two new event types. No new integration (Slack/SIEM/webhook) — out of scope for SIH, matches the plan.
- [x] Frontend: `compliance/page.tsx` rewritten from `RoadmapPlaceholder` — real Forbidden/Review counts, a violations table (algorithm, status, rule text, evidence count), and an Alerts panel — with the "no NIST CSF/CMMC/CNSA 2.0 framework mapping yet" note kept explicit, same honesty standard as the placeholder it replaced.
- [x] Test: `test_phase14_policy_engine.py` [1] — rule evaluation (MD5 FORBIDDEN, RSA:1024 FORBIDDEN, RSA:3072 REVIEW, AES-256 ALLOWED); live violations list; alerts feed reflects real logged events; re-checking an already-known violation does not duplicate an alert.
- [x] One-time backfill (not a migration — a script run once against real data, same precedent as Phase 11's `last_scanned_at` backfill): ran `check_and_log_new_violation` for every already-scanned asset in both real workspaces, so Alerts shows real history immediately instead of being empty until the next scan. Live-verified: 25 assets evaluated → 9 forbidden, 6 review, real per-algorithm rule text and evidence counts, real backfilled alert timestamps.

**PHASE 14 DONE WHEN:** Compliance page shows real, evidence-backed policy violations instead of a placeholder — with an honest "framework mapping not yet built" note, not a fabricated compliance score. ✅

---

## PHASE 15 — GLOBAL SEARCH, AI SESSION PERSISTENCE & REPORT EXPORT
**Status:** `[x] COMPLETED 2026-09-04` · **Priority:** P2 · **Source:** Phase 17 PDF §67–70, §62–66; Phase 8 PDF (AI sessions)
**Depends on:** none new

- [x] ~~`CommandPalette` currently only renders on marketing pages~~ — **done 2026-09-04**, but not by mounting `CommandPalette` (that stayed marketing-only). Built a real search directly into `Topbar.tsx` instead: debounced, server-side `search` filter on `api.assets.list`, client-filtered `api.sources.list`, dropdown grouped by Sources/Assets, click-through to the real page. No `ai_excluded`/workspace-isolation gap — reuses the already-scoped endpoints.
- [x] **AI session persistence.** New `ai_sessions`/`ai_messages` tables (migration `c8d3f5a7b2e4`) — every `POST .../analyst/query` now implicitly creates-or-continues a session (no separate "new chat" click needed) and persists both the question and the full structured answer (confidence, citations, unknowns, scope). `GET .../analyst/sessions` (list, with real message counts) and `GET .../analyst/sessions/{id}` (full history) added — matches `PRODUCT_REFERENCE.md` §5's intent, workspace-scoped like every other endpoint rather than the doc's top-level `/ai/sessions/{id}`, for the same auth-isolation reason every other resource in this codebase is workspace-scoped. Frontend: `analyst/page.tsx` gained "+ New Chat" and a real "History" dropdown that reloads a past session's messages. Live-verified end-to-end, including through a real Gemini 429 rate-limit — the session and both messages (user question + the error-as-answer) persisted correctly and reloaded from `GET .../sessions/{id}` exactly as asked, proving persistence doesn't depend on the LLM call succeeding.
- [x] **CBOM export formats.** `?format=xml` added to `GET .../cbom` and the new `GET /api/cbom/{id}` (both share one `_render()` helper) — `cbom_generator.to_cyclonedx_xml()` is a real, schema-faithful CycloneDX 1.6 XML serialization of the exact same validated dict (stdlib `xml.etree`, no new dependency; `bom-ref`/`type` as attributes, `<property name="...">` for the `ecdat:` properties — not a generic dict-to-XML dump). `GET .../cbom/history` added for a snapshot picker (a `CbomSnapshot` id was previously only reachable as "whatever's latest"). Frontend: `cbom/page.tsx` gained "Download XML", a "History" dropdown with per-snapshot JSON/XML download. Live-verified: real 25-component CycloneDX XML document round-tripped correctly.
- [x] **Executive/Technical report export.** `app/services/report_generator.py` (new) — server-rendered Markdown (not PDF: no PDF-generation dependency existed, and the plan's own "Markdown/PDF" wording allows it; adding reportlab/weasyprint for this would be the over-engineered choice). Both reports are built entirely from data other endpoints already compute for real — `compute_readiness_score()` (11.2) + `list_policy_violations()` (14) for Executive; the same two plus the full per-asset risk/recommendation/migration table for Technical — nothing new is queried or fabricated. `GET .../reports/executive` and `GET .../reports/technical` (both on `workspaces.py`, matching the readiness-score/quantum-posture pattern). Frontend: Mission Control gained "Executive Report ↓" / "Technical Report ↓" buttons. **Real bug found and fixed while live-verifying:** the technical report's per-asset `len(a.evidence)` column needed `evidence` eager-loaded alongside `risk_score`/`recommendation` — without it, a `MissingGreenlet` 500 fired only in the real FastAPI request path (a narrower local script test didn't happen to reproduce it), confirmed via the live Mission Control button before and after the fix. Live-verified: real 25-row technical report and a real executive summary (47/100 Developing, 9 forbidden, 6 review) matching the Compliance page exactly.
- [x] Tests: `test_phase15_ai_sessions.py`, `test_phase15_cbom_export.py`, `test_phase15_reports.py` [1] — all pass.

**PHASE 15 DONE WHEN:** Search works inside the authenticated app, AI sessions survive a reload, and CBOM/report data can be exported in more than one format. ✅

---

## PHASE 16 — MULTI-SOURCE DISCOVERY EXPANSION (Containers, Binaries)
**Status:** `[ ] NOT STARTED` · **Priority:** P3 (post-SIH — matches Phase 22 PDF's own "Should Have"/"Nice to Have" split, do not pull this forward)
**Source:** Phase 4 PDF, Phase 15 PDF, Phase 21 PDF tech stack table

- [ ] Container scanning (Trivy/Syft subprocess) — no `container_scanner.py` exists today
- [ ] Binary analysis (LIEF + YARA) — no `binary_scanner.py` exists today
- [ ] Cloud/K8s/HSM/KMS discovery — explicitly P3 in the PDFs themselves, no code exists
- [ ] Continuous/incremental scanning (Git hooks, CI/CD PR checks, scheduled scans) — every job today is on-demand only

**PHASE 16 DONE WHEN:** Not before Phases 11–14 are done — this phase's own source material (Phase 22 PDF) ranks it below dashboard/risk/verification honesty work for a hackathon-stage product.

---

## REAL BUGS FOUND & FIXED — 2026-09-04 (outside the Phase 11–16 gap list)

Found live, not from the PDF gap audit — recorded here since they were real
regressions, not missing features. All covered by new tests; 142 pytest +
11 `test_phase6_audit.py` checks pass.

- [x] **What-If Recalculator silently corrupted real risk data.** `POST /assets/{id}/risk/recalculate`
      called `compute_asset_risk()` with the user's hypothetical slider values and that function
      unconditionally `db.commit()`'d over the asset's real, persisted `risk_scores` row — every
      "what if" experiment overwrote real data shown on Mission Control/Risk/Migration until the
      next real scan corrected it. Fixed with `persist=False` (`risk_engine.py`) — a pure, never-committed
      preview. Also added the "Risk Over Time" projection (real Mosca math swept across 8 threat
      horizons, not ML) and made the What-If modal disable/explain controls that provably can't
      change a classically-critical asset's score, instead of letting the user drag them and wonder
      why nothing moved.
- [x] **8 timestamp columns across 5 tables were silently off by ~5.5 hours (exactly IST's UTC offset).**
      `crypto_assets`(first_seen/last_seen/created_at), `audit_log`, `cbom_snapshots`,
      `recommendations`, `risk_scores`(created_at/updated_at) all used SQLAlchemy's Python-side
      `default=datetime.datetime.utcnow` — a *naive* datetime that the asyncpg driver silently
      interpreted using the app server's local timezone (IST) instead of UTC. Root-caused by
      reproducing it directly (insert, read back, compare to the DB's own `now()`). Fixed to
      `server_default=func.now()` (DB-side clock — the pattern `evidence`/`discovery_jobs`/`sources`/
      `workspaces` already used correctly) via migration `a7c2e9f1b3d4`. This is why a scan the user
      had just started looked like it happened "5h ago" in the audit trail.
- [x] **Normalization was a real N+1: up to 3 network-round-trip commits per evidence row, with zero
      progress visibility.** `resolve_evidence_to_asset()` committed once for the asset (create or
      update) and once more for the evidence-asset link, called in a plain loop over every finding.
      A real scan of `pyca/cryptography` (1878 findings) sat "Normalizing..." for 12+ minutes with a
      single log line and no way to tell if it was working or hung. Fixed to `flush()` per row +
      one `commit()` for the whole batch, plus a progress log every 200 items. Live-verified on the
      same repo: steady ~200 findings/35–50s instead of total silence.
- [x] **`Source.last_scanned_at` was declared on the model and exposed in `SourceStatus`, but nothing
      anywhere in the codebase ever wrote to it.** Found building Phase 11.2's readiness score: real
      coverage (4/4 sources actually scanned) read as 0% because the field was always null. Fixed —
      `orchestrator.py` now sets it on every successful per-source scan (0 findings still counts as
      "a scan ran"). Backfilled the 4 existing sources from real evidence/job-completion timestamps
      (not fabricated — one source, `Crypto Test`, has zero evidence because it genuinely contains no
      recognizable crypto, so its backfill came from its real completed `DiscoveryJob` instead).
      Confirmed live: readiness score's coverage dimension went from 0% → 100%, real workspace score
      27 → 47 ("Low" → "Developing") after the fix — no code path invented this jump, it was always
      the real underlying state, just never surfaced.
- [x] **Dev server didn't hot-reload any of Phase 11's new routes** (`migration-status`,
      `readiness-score` both 404'd, confirmed absent from `/openapi.json` — not an auth issue).
      Same class of gotcha this file's own footer already documents. Fixed the same documented way:
      `preview_stop` → confirm ports clear via `Get-NetTCPConnection` → `preview_start` again.
- [x] **`GROVER_WEAKENED['AES-128']` could never match — dead code since it was added.**
      `vulnerability_registry.py` checked `canonical_name in GROVER_WEAKENED`, but
      `normalize_algorithm()` never returns a key-size-embedded name for AES (key size is always a
      separate int, per `asset_resolver.py`'s `canonical_name`/`key_size` split) — so `canonical_name`
      was always just `"AES"`, never `"AES-128"`. Every real AES-128 finding's `vulnerability_notes`
      silently fell through to "No known classical or quantum vulnerabilities." Found building Phase
      13's quantum-posture stratification, which needed a real Grover check. Fixed with a
      `_grover_key()`/`is_grover_weakened()` helper that builds the same `"{name}-{key_size}"` key the
      dict was actually meant to be looked up by. Self-heals on next rescan (same re-evaluation path
      already used for the Blowfish classification fix); no backfill migration needed.
- [x] **Technical Report export 500'd — `MissingGreenlet` on `len(a.evidence)`.** `report_generator.py`'s
      shared asset loader eager-loaded `risk_score`/`recommendation` but not `evidence`; the Technical
      Report's per-asset evidence-count column triggered a lazy load outside an active await, which
      SQLAlchemy's async ORM refuses. Confirmed live via the real Mission Control "Technical Report"
      button (500, full traceback in server logs) — a narrower local script test hadn't reproduced it,
      so this was only caught by the live browser round-trip, not the automated test alone. Fixed by
      eager-loading `evidence` too, same pattern already used in `policy_engine.py`'s violations query.
- [x] **AI Analyst: Gemini always 429'd, and Groq's fallback silently failed too on large workspaces.**
      Two independent real bugs, found investigating a user report ("quantum vulnerable project" — the
      largest real workspace — always failed; smaller ones worked). (1) `GEMINI_MODEL = "gemini-pro-latest"`
      resolved to a Pro-tier model (`gemini-3.1-pro`) whose free-tier quota on this key is `limit: 0` —
      every call failed with 429, regardless of workspace size (reproduced directly, even a 1-word
      prompt). `gemini-flash-latest` verified working with real quota on the same key — switched to it.
      (2) Groq's free tier caps `openai/gpt-oss-120b` at 8000 tokens/minute — a hard per-request ceiling.
      The full context for a 25-asset workspace (even capped at the old `MAX_ASSETS_IN_CONTEXT=15`) came
      to ~10,001 tokens, over the limit — so the fallback silently 413'd too, on exactly the workspaces
      large enough to need it. Cut `MAX_ASSETS_IN_CONTEXT` 15→10 and `MAX_EVIDENCE_PER_ASSET` 3→2 (prompt
      dropped from 33,223 to 20,769 chars). Live-verified end-to-end against the real large workspace
      through the actual UI: Gemini hit an unrelated transient 503 that run, Groq's fallback picked up
      correctly and returned a real, evidence-cited answer.

---

## QUICK SUMMARY TABLE

| Phase | Name | Status | Blocker |
|-------|------|--------|---------|
| 0 | Foundation & Environment | `[x] COMPLETED` | — |
| 1 | Clerk Authentication | `[x] COMPLETED` | — |
| 2 | Discovery Backend | `[x] COMPLETED` | — |
| 3 | Normalization + CBOM | `[x] COMPLETED` | — |
| 4 | Quantum Risk Engine | `[x] COMPLETED` | — |
| 5 | PQC Recommendation | `[x] COMPLETED` | — |
| 6 | Frontend Wiring & Dashboard | `[x] COMPLETED` | — |
| 7 | Testing + Demo | `[x] COMPLETED` | — |
| 8 | AI Analyst | `[x] Live — Gemini primary + Groq fallback, data-access control` | — |
| 9 | Knowledge Graph | `[~] SKIPPED (user decision)` | No Neo4j instance — see Phase 13 for a lite version that doesn't need it |
| 10 | Enterprise Hardening | `[/] Audit logging done` | RLS deliberately deferred, see PHASE8_10_REPORT.md |
| 11 | Migration State Persistence + QRS | `[x] COMPLETED 2026-09-04` | P0 — see Gap Analysis |
| 12 | Migration Verification Engine | `[x] COMPLETED 2026-09-04` | P0 — depends on 11.1 |
| 13 | Evidence/Posture/Blast-Radius-Lite | `[x] COMPLETED 2026-09-04` | P1 |
| 14 | Policy, Compliance & Alerting | `[x] COMPLETED 2026-09-04` | P1 |
| 15 | Search, AI Sessions, Report Export | `[x] COMPLETED 2026-09-04` | P2 |
| 16 | Container/Binary/Cloud Discovery | `[ ] NOT STARTED` | P3 — post-SIH per PDF's own priority order |

---

*Last updated by: Claude Sonnet 5 (2026-09-04) — Phases 11-15 completed this session, systematically, in order: 11 (migration persistence + QRS), 12 (verification engine), 13 (evidence/quantum posture/blast-radius-lite), 14 (policy/compliance/alerts), 15 (AI sessions, CBOM XML/history export, report export). Every phase has a real regression test and a live browser round-trip against the real user workspace, not just unit tests. Phase 16 explicitly deferred (post-SIH, needs new external tools) per user decision.*
*Gap analysis (2026-09-04): all 22 phase PDFs cross-referenced against `IMPLEMENTATION_PLAN.md` and the live code (not just `PRODUCT_REFERENCE.md`'s prior extraction — spot-verified against the raw Phase 17 PDF directly). Added Phases 11–16 above with concrete, buildable specs. The single most important finding: Migration Planner's board state (`assetStates` in `src/app/prototype/migration/page.tsx`) is a bare `useState`, never persisted to the database — confirmed via `grep` that no `crypto_assets` column or other table tracks migration status at all. This silently blocks the Quantum Readiness Score's migration-progress dimension and means the board resets on every reload. Fix it first (Phase 11.1) — everything else in Phase 11 depends on it.*
*Next agent: Phases 0-8 complete and verified live. `ecdat-backend/.env` now has real `GEMINI_API_KEY` and `GROQ_API_KEY` (gitignored, not in the repo) — `ai_analyst.ask_analyst()` tries Gemini (`gemini-pro-latest`) first and automatically falls back to Groq (`openai/gpt-oss-120b`) if it errors; `is_configured()` is true if either key is set. Data-access control (`Source.ai_excluded`) and project/source scoping are both live end-to-end (verified via the real Claude Browser session, not just unit tests — see the PATCH-endpoint gotcha below). Phase 9 explicitly skipped (no Neo4j). Phase 10: audit logging is real and live; RLS deliberately not done as classic Postgres RLS (see `docs/PHASE8_10_REPORT.md` for why) — app-layer workspace isolation is what's actually enforcing tenant boundaries today. 117 backend tests pass (`pytest ecdat-backend/tests/`), `tsc --noEmit` clean.*
*Gotcha for the next agent — READ BEFORE STARTING THE BACKEND MANUALLY: `npm run dev` (the "dev" entry in `.claude/launch.json`, i.e. what `preview_start({name:"dev"})` runs) is `concurrently "next dev" "npm run backend"` — it already starts and reload-watches BOTH the frontend and the backend (`uvicorn --reload`, no explicit port, defaults to 8000) together. Do not also hand-start a second `uvicorn` via Bash or PowerShell "to be safe" — a whole session was lost to exactly that: two independent `uvicorn --reload` processes ended up bound to `127.0.0.1:8000` (Windows lets both binds succeed), so requests nondeterministically hit whichever one, which looks exactly like "my new route 404s half the time" or "my fix isn't live" even though the code on disk is correct. `netstat`/process IDs seen from the Bash tool and from the PowerShell tool also did not agree on what was actually running, making it worse to debug from Bash.
  - **Use only `preview_start({name:"dev"})` / `preview_stop` / `preview_logs`** to manage this dev server — never manually invoke `uvicorn`/`npm run dev` via Bash or PowerShell.
  - If `preview_stop` doesn't actually free the ports (it sometimes doesn't on Windows — `concurrently`'s child processes don't always receive the kill), find the *real* stuck PID with `Get-NetTCPConnection -LocalPort 8000,3000 -State Listen`, then `Get-CimInstance Win32_Process | Where-Object ParentProcessId -eq <that PID>` — the reported listener PID is often a dead reloader shell; its actual child (a `python.exe ... --multiprocessing-fork` process) is the one really holding the port and the one `Stop-Process -Force` needs to target. Confirm both `8000` and `3000` are fully clear before calling `preview_start` again.
  - `next dev` can also exit cleanly on its own (`next dev exited with code 0` in the logs) while the backend keeps running independently — if navigation starts failing with "denied or failed" but the backend still answers on 8000, that's what happened; a full `preview_stop` + port-clear + `preview_start({name:"dev"})` fixes it.
  - **If a backend fix doesn't seem to have taken effect even after seeing its own `WatchFiles ... Reloading` log line**, don't trust that the currently-serving worker actually has it — this session hit real cases where an `else:`-branch code change (existing-row update path) silently didn't apply because the request landed on a stale worker mid-restart-churn, even though a *different*, brand-new code path (asset creation) picked up a sibling fix from the same commit correctly. The reliable way to verify a backend fix when you don't trust the dev server: run the real function directly against the real DB in a one-off `python -c` script (see e.g. how the Blowfish classification bug was actually confirmed 2026-09-04) — it bypasses the whole reload question and is faster than another browser round trip anyway.*
