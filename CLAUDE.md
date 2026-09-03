@AGENTS.md

# ECDAT project workflow

Before writing or changing any code in this repo, read in order:
1. `docs/AGENT_CONTEXT.md` — mandatory rules (no fake data, workspace isolation, evidence is append-only, temp scan dirs always cleaned up) + current state
2. `docs/TRACKER.md` — find the next task, but don't trust its `[x]` marks at face value for `ecdat-backend/` — see next line
3. `docs/BACKEND_AUDIT_PHASE0-6.md` — real state of the Phase 0–6 backend (auth is broken: `jobs.py`/`sources.py` have no auth, other routers expect a header the frontend never sends, the Clerk JWT is never signature-verified). Several TRACKER checkmarks describe stubs, not working code — this file corrects them with file:line citations. Update it (not just TRACKER) when you fix or confirm any of its findings.
4. `docs/IMPLEMENTATION_PLAN.md` — code spec for whatever task you picked

Update `TRACKER.md` and the two `AGENT_*.md` handoff files as you go, the same way this project already does.
