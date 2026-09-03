# ECDAT Backend Architecture Audit — Phases 0–6
**Date:** 2026-09-03 · **Fixes applied:** 2026-09-03 (same day)
**Scope:** `ecdat-backend/app/**` (models, routers, services) for build Phases 0–6, cross-referenced against all 22 `docs/Phase *.pdf` research documents, `docs/IMPLEMENTATION_PLAN.md`, and `docs/AGENT_CONTEXT.md`/`AGENT_HANDOFF.md`'s own mandatory rules.
**Method:** Read every backend source file end to end (not a sample). Extracted text from all 22 PDFs and grepped/read the sections backing each claim below. Verified the top findings empirically by booting the FastAPI app and firing real HTTP requests, not just by reading code.

## Status: all 14 findings fixed and re-verified

Every finding below (#1–#14) has been fixed and re-verified against the **real** Supabase database and a **real** Clerk JWKS fetch — not mocked. The runnable check is [`ecdat-backend/test_phase6_audit.py`](../ecdat-backend/test_phase6_audit.py) (run it with `.venv/Scripts/python.exe test_phase6_audit.py`); it exercises: a forged JWT being rejected, a real JWKS fetch succeeding, job logs round-tripping through the real DB, Z (threat horizon) actually being read per-workspace, and every CBOM primitive mapping being a real CycloneDX 1.6 enum value. It was also verified live over HTTP (booted the server, replicated the exact original bug-report curl commands, confirmed the new behavior).

**Explicit scope decision (per user):** Celery/Redis (#9) is intentionally *not* wired — it was never actually installed as a dependency and never had infrastructure (no redis service in `docker-compose.yml` or `render.yaml`), so removing the vestigial `redis_url` config field and correcting the docs was the fix, not adding Celery. In-process `BackgroundTasks` is the deliberate choice going forward.

## Verdict (original, before fixes — kept for the record)

Phases 3–5 (normalization, risk, recommendations) are genuinely well-built and match the PDF spec closely. Phases 0–2 and the auth layer threaded through Phase 6 are **not enterprise-grade and contain demo-breaking bugs**, some already confirmed by request, not just by inspection. *(Update: turned out even Phase 4 had never successfully written to the real database — see #14, found while fixing this audit.)*

---

## P0 — Demo-breaking (fix before showing this to anyone)

### 1. ✅ FIXED — Every Phase 4/5/6 dashboard page 401s on every real request
`assets.py`, `risk.py`, `recommendations.py`, `cbom.py` all read the caller's identity from a raw `X-Clerk-User-Id` header:
```python
async def verify_workspace_access(workspace_id, x_clerk_user_id: str, db):
    if not x_clerk_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
```
But the frontend never sends that header — [`src/lib/api.ts`](../src/lib/api.ts)'s `fetchWithAuth` sends `Authorization: Bearer <clerk-jwt>` only. I confirmed this empirically: booted the backend and called `/api/workspaces/{id}/risk/summary` with a Bearer header and no `X-Clerk-User-Id` — **got a 401**, every time. This means the Risk Dashboard, PQC/Recommendations, CBOM Inventory, and Assets pages I just wired to "real API data" are structurally correct but **will show nothing but an error on every load**, scan or no scan.
- Files: [`ecdat-backend/app/routers/assets.py:44`](../ecdat-backend/app/routers/assets.py#L44), `risk.py:48`, `recommendations.py:46`, `cbom.py:19`
- **Fix:** all four routers now use the shared `Depends(get_current_user_id)` (see #3, #13) instead of trusting a header the frontend never sends. Verified live: `curl -H "Authorization: Bearer <forged>" .../risk/summary` now returns `401 Unknown signing key` instead of the old `401 Unauthorized` (same status code, completely different — and correct — reason).

### 2. ✅ FIXED — `jobs.py` and `sources.py` have no authentication at all
Confirmed empirically — `curl http://localhost:8000/api/workspaces/<any-uuid>/jobs` with **zero auth headers** returned `200 []`. Neither router imports `get_current_user_id` or checks any header. Anyone who knows (or guesses/enumerates) a workspace UUID can create discovery jobs, register sources, list jobs, or cancel someone else's job — no session, no token, nothing.
- Files: [`ecdat-backend/app/routers/jobs.py`](../ecdat-backend/app/routers/jobs.py) (comment on line 15 admits this: *"We simulate the auth dependency for now"*), [`sources.py`](../ecdat-backend/app/routers/sources.py)
- This is a direct violation of a requirement stated explicitly in **Phase 19 PDF, §15 "Object-Level Authorization"**: *"Never rely only on `GET /applications/123` being authenticated. ECDAT must check: Does this user have permission to view Application 123?"* — here there isn't even authentication, let alone that check.
- **Fix:** every endpoint in both routers now requires `Depends(get_current_user_id)` and checks workspace/job ownership (`_get_owned_job` in `jobs.py`, `verify_workspace_access` in `sources.py`). Verified live: `curl` with zero auth headers against `/api/workspaces/{id}/jobs` now returns `403 Not authenticated` instead of `200 []`. Also hardened `create_job` to only resolve `source_ids` that belong to the caller's workspace (previously any workspace's source UUID would resolve).

### 3. ✅ FIXED — The Clerk JWT is never signature-verified
```python
# app/services/auth.py
unverified_claims = jwt.get_unverified_claims(token)
user_id = unverified_claims.get("sub")
```
`get_unverified_claims` does exactly what it says — no signature check against Clerk's JWKS, no expiry check. `settings.clerk_secret_key` is loaded in `config.py` but never referenced anywhere. Since the frontend calls FastAPI directly with the raw session token (not through a Next.js BFF that pre-validates it), **the backend will accept any JWT-shaped token with an arbitrary `sub` claim** as proof of identity for whichever workspace that `sub` owns.
- File: [`ecdat-backend/app/services/auth.py:19`](../ecdat-backend/app/services/auth.py#L19)
- Phase 19 PDF's closing line on this exact topic: *"ECDAT must be harder to compromise than the systems it is designed to analyze."* Right now the auth layer is closer to decorative than enforced.
- **Fix:** `get_current_user_id` now fetches Clerk's real JWKS (`https://api.clerk.com/v1/jwks`, authenticated with `CLERK_SECRET_KEY`, cached 1h) and verifies the token's RS256 signature (+ standard `exp`/`nbf`) via `python-jose` before trusting `sub`. Verified against **real** Clerk infrastructure, not a mock: fetched real signing keys, and confirmed a token signed with a wrong key is rejected with `401 Unknown signing key`.

---

## P1 — Functional bugs (wrong data shown to a real user, not a security hole)

### 4. ✅ FIXED — Evidence/asset counts are hardcoded to 0 in the jobs API
`create_job`, `list_jobs`, and `get_job` in `jobs.py` all return `evidence_count=0, asset_count=0` with the comment *"In a real app we'd aggregate counts from evidence table, for now return 0."* [`scans/page.tsx`](../src/app/prototype/scans/page.tsx) renders exactly this field as "Crypto Assets Found" — so even after a scan finds real evidence, the Scan Jobs Pipeline will always show `—`.
- **Fix:** added `_job_counts()` — one batched `GROUP BY` query for evidence counts and one join query (`evidence_assets`) for distinct asset counts per job, applied to `list_jobs` and `get_job` (no N+1).

### 5. ✅ FIXED — `get_job_logs` returns fabricated log lines
```python
logs = [f"Job {job.status}"]
if job.status == "running":
    logs.append("Cloning repository...")
    logs.append("Running tree-sitter scan...")
```
These strings aren't read from anywhere real — they're guessed from the status enum. This is a direct instance of the project's own mandatory rule #1: *"NO FAKE DATA. All data shown in the UI must come from real scans."*
- File: [`jobs.py:121-139`](../ecdat-backend/app/routers/jobs.py#L121)
- **Fix:** the orchestrator now appends a real, timestamped entry to `DiscoveryJob.metadata_["logs"]` at every actual pipeline transition (clone+scan per source, normalize, risk, recommend, CBOM, completion/failure/cancellation) via `_append_job_log()`. `get_job_logs` just reads that back — no more guessing from the status enum. Verified: round-tripped real log entries through the live DB in `test_phase6_audit.py`.

### 6. ✅ FIXED — `GET /api/jobs/{id}/evidence` is a stub
Returns `{"items": [], "total": 0}` unconditionally — the comment says *"Placeholder for Phase 2.7."* TRACKER.md marks this endpoint `[x]` complete under Phase 2.1; it isn't.
- File: [`jobs.py:116-119`](../ecdat-backend/app/routers/jobs.py#L116)
- **Fix:** now runs a real, workspace-ownership-checked, paginated query against the `evidence` table, same shape as the assets router's evidence endpoint.

### 7. ✅ FIXED — `CryptoAsset.last_seen` is never updated
```python
else:
    # Update last seen
    pass
```
The comment describes the intended behavior; the code is a no-op. Every asset's `last_seen` freezes at first discovery, even after a dozen re-scans.
- File: [`ecdat-backend/app/services/normalizer/asset_resolver.py:80-82`](../ecdat-backend/app/services/normalizer/asset_resolver.py#L80)
- **Fix:** `asset.last_seen = datetime.utcnow()` + commit, replacing the `pass`.

### 8. ✅ FIXED — Cancelling a job doesn't actually stop it
`DELETE /api/jobs/{id}` sets `status="cancelled"` in the DB, but the in-flight `run_discovery_job` background task has no cancellation check and will unconditionally overwrite the status back to `completed`/`failed` when it finishes.
- Files: `jobs.py:100-114`, `services/scanner/orchestrator.py:179`
- **Fix:** the orchestrator now checks the job's live DB status between sources and before the normalize/risk/CBOM stage; if `cancelled`, it stops and returns without touching the status again. `# ponytail:` comment marks the honest ceiling — it won't interrupt a clone/scan already in flight for the *current* source, only between sources; killing an in-flight subprocess would need a process handle, noted as the upgrade path if that's ever a real problem.

---

## P2 — Architecture deviates from the spec, not obviously broken but worth a deliberate decision

### 9. Celery + Redis — decision: dropped, not wired
`AGENT_CONTEXT.md`'s own stack table and TRACKER 2.1 ("Set up Celery + Redis for async job execution" — marked `[x]`) both claim Celery. **Phase 21 PDF confirms this is the intended architecture** ("Queue → Redis with Celery... Architecture: API → Queue → Worker"). The actual orchestrator runs everything through plain FastAPI `BackgroundTasks` in-process — no worker, no retry, and jobs silently vanish if the process restarts or `--reload` fires mid-scan. `redis_url` is a live config field that's never read by anything.
- File: [`ecdat-backend/app/services/scanner/orchestrator.py`](../ecdat-backend/app/services/scanner/orchestrator.py)
- **Decision (per user):** not worth it for this product — `celery` was never even in `requirements.txt` and no `redis` service ever existed in `docker-compose.yml`/`render.yaml`, so there was no real infrastructure to wire in the first place, just a doc claim. Removed the vestigial `redis_url` config field instead. `BackgroundTasks` stays the deliberate choice; the "jobs vanish on restart" trade-off is accepted, not hidden — `AGENT_CONTEXT.md`'s stack table no longer claims Celery.

### 10. ✅ FIXED — Z (threat horizon) isn't actually a configurable workspace setting
Both `AGENT_HANDOFF.md` and the PQC Workbench spec in `IMPLEMENTATION_PLAN.md` (*"Interface to manipulate the global variable Z (Threat Horizon) spanning across all Mosca inequalities"*) require this. `risk_engine.py` itself says *"IMPORTANT: Z is a configurable workspace setting. Never hardcode it permanently"* — then hardcodes `DEFAULT_THREAT_HORIZON_YEARS = 12.0` as a module constant. The `Workspace` model has no `threat_horizon_years` column, and there's no settings router to persist one. The only way to change Z per-asset is the stateless `/risk/recalculate` "what-if" endpoint, which doesn't save anything.
- Files: [`models/workspace.py`](../ecdat-backend/app/models/workspace.py), [`services/risk_engine.py:15-31`](../ecdat-backend/app/services/risk_engine.py#L15)
- **Fix:** added `Workspace.threat_horizon_years` (migration `c1d4e8f2a3b6`, run against the real DB), `PATCH /api/workspaces/me/settings` to change it, and `compute_asset_risk(..., threat_horizon_years=None)` now reads the caller's workspace value when not explicitly overridden (the `/risk/recalculate` what-if endpoint still accepts an explicit override). Changing Z now **recomputes risk for every asset in the workspace immediately** (matches the PDF spec's "instantly recalculating the Risk Matrix" requirement), not just on the next scan. Wired a real (not mock) control into Settings → Risk Policies. Verified: workspace with Z=3.0y correctly computed an RSA-2048 asset as CRITICAL using that value, not the old hardcoded 12.0.

### 11. ✅ FIXED — Generated CBOM won't pass real CycloneDX 1.6 validation
```python
"primitive": "public-key" if ... else ("symmetric" if ... else "hash")
```
CycloneDX 1.6's `cryptoProperties.algorithmProperties.primitive` enum is `drbg | mac | block-cipher | stream-cipher | signature | hash | pke | kdf | key-agree | kem | ae | combined-cipher | other | unknown` — `"public-key"` and `"symmetric"` aren't valid values. TRACKER 3.4 marks *"Validate output against CycloneDX schema v1.6"* as `[x]`, but there's no validation call anywhere in `cbom_generator.py` — nothing would have caught this.
- File: [`ecdat-backend/app/services/cbom_generator.py:24`](../ecdat-backend/app/services/cbom_generator.py#L24)
- **Fix:** added `_cyclonedx_primitive()` mapping every asset to a real enum value (`hash`, `block-cipher`/`stream-cipher`, `signature`, `kem`/`key-agree`/`pke`, `mac`), reusing `recommendation_engine.infer_function()` for the underlying HASH/ENCRYPTION/SIGNATURE/KEY_EXCHANGE classification (one source of truth, not two). Added `validate_cbom()` — the "manual validation" `IMPLEMENTATION_PLAN.md` §3.4 called for — checked against every generated CBOM (logs loudly if it ever fails again). Verified it correctly flags the *old* `"public-key"` value as invalid, and correctly accepts all 7 real asset-type mappings.

### 12. ✅ FIXED — CORS is wide open
```python
allow_origins=["*"], allow_credentials=True
```
with a `# TODO: restrict in production` left in place. Combined with finding #3 (unverified JWT) this is a meaningfully worse combination than either alone.
- File: [`ecdat-backend/app/main.py:10`](../ecdat-backend/app/main.py#L10)
- **Fix:** `CORSMiddleware` now reads `settings.cors_origins_list` (env-configurable `CORS_ORIGINS`, defaults to `http://localhost:3000,https://ecdta.vercel.app`) instead of `["*"]`. `allow_credentials=True` with a wildcard origin isn't even valid per the CORS spec (browsers reject it) — this was a real, not just theoretical, bug too.

### 13. ✅ FIXED — Auth-check logic was copy-pasted four times, and inconsistent with a fifth pattern
`assets.py`, `risk.py`, `recommendations.py`, and `cbom.py` each defined an identical `verify_workspace_access()` function rather than sharing one dependency. `workspaces.py` used a completely different pattern (`Depends(get_current_user_id)` off the Bearer JWT). `jobs.py`/`sources.py` used neither. Three different auth strategies existed in one backend, only one of which (`get_current_user_id`) was ever fed by what the frontend actually sends — and even that one didn't verify the token (#3).
- **Fix:** one implementation now, in `app/services/auth.py` — `get_current_user_id` (verifies the JWT) and `verify_workspace_access` (checks ownership) — imported by every router (`workspaces.py`, `assets.py`, `risk.py`, `recommendations.py`, `cbom.py`, `jobs.py`, `sources.py`). Asset/job-scoped endpoints that can't use the workspace-prefixed helper directly (e.g. `GET /assets/{id}`) now consistently return `404` (not `403`) on an ownership mismatch, so a non-owner can't distinguish "doesn't exist" from "not yours".

### 14. ✅ FIXED — `risk_scores` table schema drift: the risk engine has never written to the real database
**Found while fixing #1–#13, not in the original pass — this is the most severe finding in the whole audit.** `app/models/risk.py` declares columns like `business_criticality`, `exposure`, `quantum_risk_level`, `classical_risk_level`, `composite_risk_level`, `created_at`/`updated_at`. The **live** Supabase `risk_scores` table — confirmed by querying `information_schema.columns` directly — still had the *original* Phase 4 column set from `aa8c8acb89b6_initial_schema.py` (`quantum_exposure`, `classical_risk`, `mosca_result`, `composite_priority`, `computed_at`). The model was rewritten at some point after that migration; no migration ever followed to match it. Every call to `compute_asset_risk()`'s upsert check (`SELECT * FROM risk_scores WHERE asset_id = ...`) has been throwing `UndefinedColumnError` against production — confirmed empirically: `risk_scores` had **0 rows** despite `crypto_assets` having 2 and `evidence` having 16, i.e. scans were producing real findings and real assets, but risk (and therefore recommendations, which run right after in the same unguarded block) never once completed. There was also no `try/except` around this stage in the orchestrator, so the failure was completely silent — the background task just died and the job stayed `running` forever.
- **Fix:** migration `d2e5f9a1b4c7` adds the correct columns (with safe defaults for the NOT NULL ones) and drops the five obsolete columns nothing in the codebase reads any more (grepped first). Also wrapped the whole normalize/risk/recommend/CBOM stage in the orchestrator in `try/except`, so if anything like this happens again the job is marked `failed` with a real error message instead of hanging in `running` forever. Verified end-to-end against the real DB: an asset now gets a real risk score with all fields populated, `risk_scores`/`recommendations` round-trip correctly.

---

## What's actually solid (logic was always good — #14 was a DB-schema problem, not a logic problem)

- **Mosca calculator** (`risk_engine.py`): correct `X + Y > Z` inequality, margin-tiered CRITICAL(exceeded)/HIGH(≤2y)/MEDIUM(≤6y)/LOW, matches Phase 6 PDF's model precisely. Now also genuinely workspace-configurable on Z (#10) and genuinely persists (#14).
- **Recommendation engine** (`recommendation_engine.py`): rule table's byte sizes match the PQC Workbench spec exactly (ML-KEM-768: 1184B pubkey/1088B ciphertext; ML-DSA-65: 1952B pubkey/3309B signature), includes hard/soft constraints and rejected alternatives with real rationale — this is the most thorough part of the backend, and now it actually runs (#14 was blocking it too, since recommendations happen right after risk in the same unguarded block).
- **Scanner integration**: tree-sitter (Python/Go/JS), a real Semgrep subprocess against real custom rules (`rules/crypto_rules.yaml`), manifest and certificate scanners are all real and wired through the orchestrator with per-file and per-source error isolation (one bad file/repo doesn't kill the job).
- **Pipeline chaining**: evidence → normalize → risk → recommend → CBOM now genuinely runs end-to-end, and is now guarded by a `try/except` that marks the job `failed` instead of hanging forever if any stage breaks again.
- **Temp workspace cleanup**: the one "NEVER" rule in `AGENT_CONTEXT.md` that's correctly enforced everywhere — always runs in a `finally` block.
- **Evidence table**: genuinely append-only; no UPDATE/DELETE found anywhere against it.

---

## What changed, file by file

| File | Change |
|---|---|
| `services/auth.py` | Rewritten: real Clerk JWKS fetch + RS256 signature verification (`get_current_user_id`); shared `verify_workspace_access` |
| `routers/jobs.py` | Full auth on every endpoint; real `evidence_count`/`asset_count`; real evidence + logs endpoints; cancellation respected |
| `routers/sources.py` | Auth added |
| `routers/assets.py`, `risk.py`, `recommendations.py`, `cbom.py` | Switched to shared auth dependency, dropped duplicated `verify_workspace_access` |
| `routers/workspaces.py` | New `PATCH /me/settings` (threat horizon), triggers a full workspace risk recompute |
| `models/job.py` | Added the `workspace` relationship (was a dead comment) |
| `models/workspace.py` | Added `threat_horizon_years` |
| `schemas/workspace.py` | Added `WorkspaceSettingsUpdate`, exposed `threat_horizon_years` in the response |
| `services/risk_engine.py` | `threat_horizon_years` now resolves from the workspace when not explicitly passed |
| `services/cbom_generator.py` | Real CycloneDX 1.6 `primitive` mapping + `validate_cbom()` |
| `services/normalizer/asset_resolver.py` | `last_seen` actually updates |
| `services/scanner/orchestrator.py` | Real per-step job logs, cooperative cancellation, `try/except` around normalize/risk/recommend/CBOM |
| `config.py` | Removed unused `redis_url`, added `cors_origins` |
| `main.py` | CORS reads config instead of `["*"]` |
| `alembic/versions/c1d4e8f2a3b6_*.py` | Adds `threat_horizon_years` |
| `alembic/versions/d2e5f9a1b4c7_*.py` | Fixes the `risk_scores` schema drift (#14) — **run against the real DB, not just committed** |
| `test_phase6_audit.py` | New runnable check (see Status section above) |
| `src/lib/api.ts` | Added `api.workspace.updateSettings` |
| `src/app/prototype/settings/page.tsx` | Real (not mock) Risk Policies → Threat Horizon control |

All migrations were run against the live database (`alembic upgrade head`), not just written.
