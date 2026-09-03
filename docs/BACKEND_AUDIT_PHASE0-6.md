# ECDAT Backend Architecture Audit — Phases 0–6
**Date:** 2026-09-03
**Scope:** `ecdat-backend/app/**` (models, routers, services) for build Phases 0–6, cross-referenced against all 22 `docs/Phase *.pdf` research documents, `docs/IMPLEMENTATION_PLAN.md`, and `docs/AGENT_CONTEXT.md`/`AGENT_HANDOFF.md`'s own mandatory rules.
**Method:** Read every backend source file end to end (not a sample). Extracted text from all 22 PDFs and grepped/read the sections backing each claim below. Verified the top findings empirically by booting the FastAPI app and firing real HTTP requests, not just by reading code.

## Verdict

Phases 3–5 (normalization, risk, recommendations) are genuinely well-built and match the PDF spec closely. Phases 0–2 and the auth layer threaded through Phase 6 are **not enterprise-grade and contain demo-breaking bugs**, some already confirmed by request, not just by inspection.

---

## P0 — Demo-breaking (fix before showing this to anyone)

### 1. Every Phase 4/5/6 dashboard page 401s on every real request
`assets.py`, `risk.py`, `recommendations.py`, `cbom.py` all read the caller's identity from a raw `X-Clerk-User-Id` header:
```python
async def verify_workspace_access(workspace_id, x_clerk_user_id: str, db):
    if not x_clerk_user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
```
But the frontend never sends that header — [`src/lib/api.ts`](../src/lib/api.ts)'s `fetchWithAuth` sends `Authorization: Bearer <clerk-jwt>` only. I confirmed this empirically: booted the backend and called `/api/workspaces/{id}/risk/summary` with a Bearer header and no `X-Clerk-User-Id` — **got a 401**, every time. This means the Risk Dashboard, PQC/Recommendations, CBOM Inventory, and Assets pages I just wired to "real API data" are structurally correct but **will show nothing but an error on every load**, scan or no scan.
- Files: [`ecdat-backend/app/routers/assets.py:44`](../ecdat-backend/app/routers/assets.py#L44), `risk.py:48`, `recommendations.py:46`, `cbom.py:19`

### 2. `jobs.py` and `sources.py` have no authentication at all
Confirmed empirically — `curl http://localhost:8000/api/workspaces/<any-uuid>/jobs` with **zero auth headers** returned `200 []`. Neither router imports `get_current_user_id` or checks any header. Anyone who knows (or guesses/enumerates) a workspace UUID can create discovery jobs, register sources, list jobs, or cancel someone else's job — no session, no token, nothing.
- Files: [`ecdat-backend/app/routers/jobs.py`](../ecdat-backend/app/routers/jobs.py) (comment on line 15 admits this: *"We simulate the auth dependency for now"*), [`sources.py`](../ecdat-backend/app/routers/sources.py)
- This is a direct violation of a requirement stated explicitly in **Phase 19 PDF, §15 "Object-Level Authorization"**: *"Never rely only on `GET /applications/123` being authenticated. ECDAT must check: Does this user have permission to view Application 123?"* — here there isn't even authentication, let alone that check.

### 3. The Clerk JWT is never signature-verified
```python
# app/services/auth.py
unverified_claims = jwt.get_unverified_claims(token)
user_id = unverified_claims.get("sub")
```
`get_unverified_claims` does exactly what it says — no signature check against Clerk's JWKS, no expiry check. `settings.clerk_secret_key` is loaded in `config.py` but never referenced anywhere. Since the frontend calls FastAPI directly with the raw session token (not through a Next.js BFF that pre-validates it), **the backend will accept any JWT-shaped token with an arbitrary `sub` claim** as proof of identity for whichever workspace that `sub` owns.
- File: [`ecdat-backend/app/services/auth.py:19`](../ecdat-backend/app/services/auth.py#L19)
- Phase 19 PDF's closing line on this exact topic: *"ECDAT must be harder to compromise than the systems it is designed to analyze."* Right now the auth layer is closer to decorative than enforced.

---

## P1 — Functional bugs (wrong data shown to a real user, not a security hole)

### 4. Evidence/asset counts are hardcoded to 0 in the jobs API
`create_job`, `list_jobs`, and `get_job` in `jobs.py` all return `evidence_count=0, asset_count=0` with the comment *"In a real app we'd aggregate counts from evidence table, for now return 0."* [`scans/page.tsx`](../src/app/prototype/scans/page.tsx) renders exactly this field as "Crypto Assets Found" — so even after a scan finds real evidence, the Scan Jobs Pipeline will always show `—`.

### 5. `get_job_logs` returns fabricated log lines
```python
logs = [f"Job {job.status}"]
if job.status == "running":
    logs.append("Cloning repository...")
    logs.append("Running tree-sitter scan...")
```
These strings aren't read from anywhere real — they're guessed from the status enum. This is a direct instance of the project's own mandatory rule #1: *"NO FAKE DATA. All data shown in the UI must come from real scans."*
- File: [`jobs.py:121-139`](../ecdat-backend/app/routers/jobs.py#L121)

### 6. `GET /api/jobs/{id}/evidence` is a stub
Returns `{"items": [], "total": 0}` unconditionally — the comment says *"Placeholder for Phase 2.7."* TRACKER.md marks this endpoint `[x]` complete under Phase 2.1; it isn't.
- File: [`jobs.py:116-119`](../ecdat-backend/app/routers/jobs.py#L116)

### 7. `CryptoAsset.last_seen` is never updated
```python
else:
    # Update last seen
    pass
```
The comment describes the intended behavior; the code is a no-op. Every asset's `last_seen` freezes at first discovery, even after a dozen re-scans.
- File: [`ecdat-backend/app/services/normalizer/asset_resolver.py:80-82`](../ecdat-backend/app/services/normalizer/asset_resolver.py#L80)

### 8. Cancelling a job doesn't actually stop it
`DELETE /api/jobs/{id}` sets `status="cancelled"` in the DB, but the in-flight `run_discovery_job` background task has no cancellation check and will unconditionally overwrite the status back to `completed`/`failed` when it finishes.
- Files: `jobs.py:100-114`, `services/scanner/orchestrator.py:179`

---

## P2 — Architecture deviates from the spec, not obviously broken but worth a deliberate decision

### 9. Celery + Redis is specified, installed, and unused
`AGENT_CONTEXT.md`'s own stack table and TRACKER 2.1 ("Set up Celery + Redis for async job execution" — marked `[x]`) both claim Celery. **Phase 21 PDF confirms this is the intended architecture** ("Queue → Redis with Celery... Architecture: API → Queue → Worker"). The actual orchestrator runs everything through plain FastAPI `BackgroundTasks` in-process — no worker, no retry, and jobs silently vanish if the process restarts or `--reload` fires mid-scan. `redis_url` is a live config field that's never read by anything.
- File: [`ecdat-backend/app/services/scanner/orchestrator.py`](../ecdat-backend/app/services/scanner/orchestrator.py)

### 10. Z (threat horizon) isn't actually a configurable workspace setting
Both `AGENT_HANDOFF.md` and the PQC Workbench spec in `IMPLEMENTATION_PLAN.md` (*"Interface to manipulate the global variable Z (Threat Horizon) spanning across all Mosca inequalities"*) require this. `risk_engine.py` itself says *"IMPORTANT: Z is a configurable workspace setting. Never hardcode it permanently"* — then hardcodes `DEFAULT_THREAT_HORIZON_YEARS = 12.0` as a module constant. The `Workspace` model has no `threat_horizon_years` column, and there's no settings router to persist one. The only way to change Z per-asset is the stateless `/risk/recalculate` "what-if" endpoint, which doesn't save anything.
- Files: [`models/workspace.py`](../ecdat-backend/app/models/workspace.py), [`services/risk_engine.py:15-31`](../ecdat-backend/app/services/risk_engine.py#L15)

### 11. Generated CBOM won't pass real CycloneDX 1.6 validation
```python
"primitive": "public-key" if ... else ("symmetric" if ... else "hash")
```
CycloneDX 1.6's `cryptoProperties.algorithmProperties.primitive` enum is `drbg | mac | block-cipher | stream-cipher | signature | hash | pke | kdf | key-agree | kem | ae | combined-cipher | other | unknown` — `"public-key"` and `"symmetric"` aren't valid values. TRACKER 3.4 marks *"Validate output against CycloneDX schema v1.6"* as `[x]`, but there's no validation call anywhere in `cbom_generator.py` — nothing would have caught this.
- File: [`ecdat-backend/app/services/cbom_generator.py:24`](../ecdat-backend/app/services/cbom_generator.py#L24)

### 12. CORS is wide open
```python
allow_origins=["*"], allow_credentials=True
```
with a `# TODO: restrict in production` left in place. Combined with finding #3 (unverified JWT) this is a meaningfully worse combination than either alone.
- File: [`ecdat-backend/app/main.py:10`](../ecdat-backend/app/main.py#L10)

### 13. Auth-check logic is copy-pasted four times, and inconsistent with a fifth pattern
`assets.py`, `risk.py`, `recommendations.py`, and `cbom.py` each define an identical `verify_workspace_access()` function rather than sharing one dependency. `workspaces.py` uses a completely different pattern (`Depends(get_current_user_id)` off the Bearer JWT). `jobs.py`/`sources.py` use neither. Three different auth strategies exist in one backend, only one of which (`get_current_user_id`) is ever fed by what the frontend actually sends — and even that one doesn't verify the token (#3).

---

## What's actually solid — don't rewrite this

- **Mosca calculator** (`risk_engine.py`): correct `X + Y > Z` inequality, margin-tiered CRITICAL(exceeded)/HIGH(≤2y)/MEDIUM(≤6y)/LOW, matches Phase 6 PDF's model precisely.
- **Recommendation engine** (`recommendation_engine.py`): rule table's byte sizes match the PQC Workbench spec exactly (ML-KEM-768: 1184B pubkey/1088B ciphertext; ML-DSA-65: 1952B pubkey/3309B signature), includes hard/soft constraints and rejected alternatives with real rationale — this is the most thorough part of the backend.
- **Scanner integration**: tree-sitter (Python/Go/JS), a real Semgrep subprocess against real custom rules (`rules/crypto_rules.yaml`), manifest and certificate scanners are all real and wired through the orchestrator with per-file and per-source error isolation (one bad file/repo doesn't kill the job).
- **Pipeline chaining**: evidence → normalize → risk → recommend → CBOM genuinely runs end-to-end inside one orchestrator pass — this part of Phase 3–5 integration is real, not aspirational.
- **Temp workspace cleanup**: the one "NEVER" rule in `AGENT_CONTEXT.md` that's correctly enforced everywhere — always runs in a `finally` block.
- **Evidence table**: genuinely append-only; no UPDATE/DELETE found anywhere against it.

---

## Suggested fix order

1. **Pick one auth pattern and apply it everywhere** — verify the Clerk JWT signature (Clerk publishes JWKS; `python-jose` can verify against it) in `get_current_user_id`, delete `verify_workspace_access`'s header-trusting duplicates, and route `jobs.py`/`sources.py`/everything else through the same dependency. This single change fixes #1, #2, #3, and #13 together and is what's actually blocking the dashboard from showing anything at all.
2. Stop hardcoding `evidence_count`/`asset_count`/log lines in `jobs.py` — these are visibly wrong in the UI right now (#4, #5, #6).
3. Fix `last_seen` no-op (#7) and make cancel actually stop the task or at least protect its terminal state (#8) — small, contained changes.
4. Decide and document: keep `BackgroundTasks` for the hackathon (fine, but say so in `AGENT_CONTEXT.md` instead of claiming Celery) or actually wire the already-installed Celery+Redis (#9).
5. Add `threat_horizon_years` to `Workspace` + a minimal settings endpoint (#10) — several docs already assume this exists.
6. Fix the CBOM `primitive` enum values (#11) — cheap, and matters if anyone actually validates the "CycloneDX-compliant, NTRO-ready" claim.
