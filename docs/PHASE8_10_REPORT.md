# Phase 8 (AI Analyst) + Phase 10 (Enterprise Hardening, partial) — Report

**Date:** 2026-09-03
**Trigger:** user asked to move on to Phase 8/9/10, referencing `docs/IMPLEMENTATION_PLAN.md` and
all 22 phase PDFs. Phase 9 was explicitly skipped (no Neo4j instance — user decision). Phase 8's
scope was explicitly cut down to an MVP mid-session (user: *"can we just insert gemini api key to
just do ai recommendation for now, just for mvp"*), after infrastructure checks showed no
LLM key or Neo4j instance existed and the user was asked how to proceed.

## Research basis

Read in full: `IMPLEMENTATION_PLAN.md` §8 (RAG System Design / LLM Prompt Design / Output
Validation), Phase 8 PDF ("AI-Powered Cryptographic Code Analysis & Semantic Discovery" — all 84
sections), Phase 14 PDF ("AI Intelligence & Explainable Reasoning" §1-56), Phase 19 PDF §74-78
(Row-Level Security, Audit Logging, SIEM Integration).

**Key finding that changed the architecture**: Phase 8 PDF describes a much bigger vision
("AI-Powered Cryptographic Code Analysis" — AI augmenting the *scanner itself* with call-graph
tracing, wrapper resolution, code property graphs) than what `IMPLEMENTATION_PLAN.md`'s actual
Phase 8 spec builds (a scoped RAG chat assistant over already-discovered evidence). Built to the
`IMPLEMENTATION_PLAN.md`/`TRACKER.md` spec — the PDF's semantic-code-analysis vision is a
different, much larger feature that was never in TRACKER's checklist.

**Second finding, from Phase 14 PDF §38-39 ("Tool-Calling Architecture" / "Why Tool Calling Is
Better")**: for *structured* data like crypto assets/risk/evidence, the PDF itself argues
retrieving via targeted, filtered queries beats naive embedding-similarity search — "This reduces
Token Cost, Latency, Context Noise, Hallucination." Evidence and risk data in this app is highly
structured (rows in Postgres, not free-text documents), which is exactly the case the PDF says
embeddings are the wrong tool for (RAG's real strength, per §26-30, is a *knowledge base* of
static reference material — standards, policies — which ECDAT doesn't have yet).

## Phase 8 — AI Analyst (MVP)

**Decision: pgvector/embeddings skipped, replaced with a real, ranked, filtered database query**
(`build_context()` in `app/services/ai_analyst.py`) that assembles the top-15 assets by composite
risk priority — each with real risk levels, real recommendation text, and real evidence locations
(file/line/detector/confidence, never the matched source text itself). This is a deliberate
architecture call, not a shortcut: it satisfies the *intent* of `IMPLEMENTATION_PLAN.md` §8.1
("evidence-grounded retrieval") through a mechanism the deeper PDF research argues is actually
better for this specific data shape, while avoiding standing up pgvector + an embedding model for
a feature that, per the user's own framing, is explicitly an MVP.

**LLM provider: Gemini** (`google-genai` SDK, `gemini-2.0-flash`), per user's explicit choice —
not the Anthropic/OpenAI split originally scoped before the interruption. Structured output is
enforced via the SDK's native `response_schema` (a Pydantic model), not prompt-engineered JSON.

### Architecture (Phase 8 PDF §21 "Evidence-First AI" / §82 summary)

```
DETERMINISTIC DB DATA -> build_context() -> SYSTEM PROMPT + QUESTION -> Gemini
    -> structured AnalystResponse -> verify_citations() (real DB check) -> API response
```
Not `Question -> LLM -> Trust Everything` (the PDF's own explicit anti-pattern, §83).

### Mandatory-rule compliance, verified not just claimed

- **"AI never invents cryptographic assets"** — `verify_citations()` checks every
  `evidence_citations`/`asset_citations` id against the real DB, scoped to the asking workspace,
  after the model responds. A hallucinated id and a real id from a *different* tenant are
  rejected identically — tested (`test_verify_citations_rejects_cross_tenant_id`).
- **"LLM must never receive raw source code"** — `build_context()` sends `raw_match`/
  `context_lines` (the actual matched source text) *nowhere*. Tested directly:
  `test_build_context_never_leaks_raw_source` seeds evidence containing a fake secret and
  "surrounding source code" marker text and asserts neither string appears anywhere in the
  context sent to the model.
- **No fake AI responses** — `is_configured()` gates the real call; with no key, the endpoint
  returns an honest "AI Analyst isn't configured yet" message (verified live in the browser,
  screenshot-equivalent: the actual `/prototype/analyst` page shows this exact state right now).

### What's real vs. what's blocked

| Component | Status |
|---|---|
| Context builder (real DB, no raw source) | ✅ Real, tested |
| Citation verification (hallucination + cross-tenant guard) | ✅ Real, tested (and a real bug in it was found and fixed by its own test — see below) |
| `/prototype/analyst` chat UI | ✅ Real, live-verified (shows honest "not configured" state) |
| `GET /analyst/status`, `POST /analyst/query` endpoints | ✅ Real, auth-checked, live-verified |
| Actual Gemini generative call | ⏸️ Code is real and complete; needs `GEMINI_API_KEY` in `ecdat-backend/.env` + a backend restart to actually run |

**A real bug found by this phase's own tests**: `verify_citations()`'s first draft parsed all
citation UUIDs in one list comprehension — a single malformed id (or a plain hallucinated
non-UUID string) raised `ValueError` and silently discarded *every* citation in the batch, valid
ones included. `test_verify_citations_keeps_real_ids_drops_fake_ones` caught this immediately.
Fixed to parse each id independently so one bad citation doesn't nuke the good ones.

**Also found while testing**: `pytest-asyncio`'s default per-test event loop breaks this app's
process-global async SQLAlchemy engine (`RuntimeError: Event loop is closed` / "attached to a
different loop") the moment more than one async test runs. Fixed with
`ecdat-backend/pytest.ini` (`asyncio_default_test_loop_scope = session`) — a real, previously
latent test-infrastructure gap (no async pytest tests existed in this repo before this phase).

### Setup to actually use it

1. Add to `ecdat-backend/.env`: `GEMINI_API_KEY=<your key>`
2. Restart the backend (`uvicorn --reload` did *not* reliably pick up changes during this session
   — see `docs/BACKEND_AUDIT_PHASE0-6.md`-style lesson from Phase 7; a clean restart is the
   reliable path).
3. Open `/prototype/analyst` — the "not configured" banner disappears and the chat becomes live.

## Phase 10 — Enterprise Hardening (partial)

### Audit logging — real, built, live-verified

New append-only `audit_log` table (migration `e3f7a2c9d1b5`, run against the real DB), following
the event taxonomy in Phase 19 PDF §75-76 (`event`, `actor`, `resource_type`/`resource_id`,
`details`, `created_at`). `app/services/audit.py` exposes exactly one function — `log_event()` —
no update/delete path exists, by design, matching the append-only discipline this project already
enforces on the `evidence` table (verified by `test_log_event_is_append_only_no_mutation_helpers`,
which inspects the module and fails if anything besides `log_event` is defined there).

Wired into: workspace creation (`WORKSPACE_CREATED`), threat-horizon policy changes
(`POLICY_UPDATED`, with before/after values), source registration (`SOURCE_ADDED`), scan
start/cancel (`SCAN_STARTED`/`SCAN_CANCELLED`), CBOM generation (`CBOM_GENERATED`), and AI Analyst
questions (`AI_ACTION` — explicitly named in the PDF's own event list). Per-view logging ("Asset
View", "Evidence Access" from the PDF's list) was deliberately *not* instrumented — it would fire
on every page load and drown out the events that actually matter; noted as a `# ponytail:` comment
with the upgrade path if that coverage becomes a real requirement.

`GET /api/workspaces/{id}/activity` replaces the `/prototype/activity` placeholder page (which,
until this phase, was one of the honest "not built yet" pages added in Phase 7). **Live-verified**:
triggered a real CBOM generation from the actual UI, then confirmed the Activity page showed the
real event (`CBOM generated`, real actor id, `{"component_count":4}`, real timestamp) — not a
canned example.

### Row-level security — deliberately not implemented as classic Postgres RLS

TRACKER's own checklist item is "Multi-tenancy row-level security." The textbook version of that
(policies keyed off `auth.uid()` / a JWT claim available inside the Postgres session itself, the
pattern Supabase's own RLS docs assume) doesn't fit this app's actual architecture: FastAPI
connects to Postgres with one shared service-role `DATABASE_URL`, not a per-end-user Postgres
session. Making real RLS work here would mean running `SET LOCAL app.workspace_id = '...'` (or
similar) as the *first* statement of every request's transaction, which means threading the
authenticated workspace_id into `get_db()`'s dependency *before* any route logic runs — a genuine
architectural change to how sessions are created, not a policy-only addition, and one much of the
audit/query code in this codebase doesn't currently expect.

Given that risk, and given app-layer isolation was already built and empirically verified (every
route requires `verify_workspace_access`, confirmed in `docs/BACKEND_AUDIT_PHASE0-6.md` to
actually reject cross-tenant access rather than just claim to), the call here was: don't retrofit
a structurally different data-access pattern under time pressure for defense-in-depth on top of a
control that's already real and tested. This is a genuine gap relative to the literal TRACKER
bullet, documented rather than quietly skipped — the correct fix (session-variable RLS) is
described above as the concrete upgrade path if/when it's prioritized.

### Not attempted

- **Full RBAC with Clerk Organizations** — needs the user to actually enable Organizations in
  their Clerk dashboard first; nothing to build against without that.
- Migration workspace, CI/CD hooks, drift detection, Enterprise SSO, compliance reporting — all
  explicitly `V3/Future` in TRACKER, untouched.

## Full test count

116 backend tests pass (`pytest ecdat-backend/tests/`), up from 107 at the end of Phase 7 —
6 new for AI Analyst (`test_ai_analyst.py`), 3 new for audit logging (`test_audit.py`).
`test_phase6_audit.py`'s existing standalone suite (13 checks, run separately per this project's
convention) still passes unaffected. `google-genai`, `anthropic` (later removed), and `fastembed`
(removed) were all installed and vetted for dependency conflicts (`httpx` moved 0.27.2 → 0.28.1
as a side effect — re-verified the existing Clerk JWKS fetch code still works against the new
version) before landing on the final `google-genai`-only dependency set.
