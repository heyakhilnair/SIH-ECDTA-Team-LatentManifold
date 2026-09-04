# ECDAT — AGENT CONTEXT FILE
**READ THIS FIRST before writing any code or making any changes.**  
**Updated:** 2026-09-03 (Phases 0-8 complete, live, and verified via the real Claude Browser session. Phase 8 AI Analyst has real `GEMINI_API_KEY`/`GROQ_API_KEY` in `ecdat-backend/.env` (Gemini primary, Groq automatic fallback) plus per-source `ai_excluded` data-access control. Project/source scoping (`?source_id=`) added across assets/risk/recommendations/cbom/analyst, with a shared `ProjectFilter` dropdown on the frontend. See `docs/TRACKER.md`'s bottom "Next agent" note for a dev-server gotcha (Bash-backgrounded `uvicorn --reload` can leave a stale duplicate process bound to :8000 — manage it via the PowerShell tool instead). Phase 9 explicitly skipped, no Neo4j. Phase 10: real audit logging live; RLS deliberately deferred with reasoning documented.)

---

## WHAT IS THIS PROJECT?

**ECDAT** (Enterprise Cryptographic Discovery & Analysis Tool) is a Smart India Hackathon 2026 project (Problem: SIH26164, Ministry: NTRO, Team: LatentManifold, ID: SIH2026-143).

It is a cryptographic intelligence platform that:
1. **Discovers** cryptographic assets in source code, dependencies, certificates
2. **Normalizes** findings into a canonical Cryptographic Bill of Materials (CBOM)
3. **Assesses** quantum and classical risk (Mosca inequality)
4. **Recommends** NIST-standardized PQC replacements
5. **Plans** migration with topological dependency ordering
6. **Verifies** post-migration cryptographic posture

---

## MANDATORY RULES

1. **NO FAKE DATA.** All data shown in the UI must come from real scans. Label synthetic data explicitly.
2. **AI is evidence-first.** AI never invents cryptographic assets. It only explains real evidence.
3. **Read AGENTS.md** before writing any Next.js code — this is Next.js 16.3.3 (breaking changes from training data).
4. **Clerk is mandatory** for authentication. No route that processes real data may be accessed without a valid Clerk session.
5. **Workspace isolation** — every DB query must include `WHERE workspace_id = $user_workspace_id`.
6. **No raw secrets in code** — everything via environment variables.
7. **Temp scan directories** (`/tmp/ecdat-scans/{job_id}`) must ALWAYS be deleted after scan completes, succeeds, or fails.

---

## CURRENT TECH STACK

| Layer | Technology | Version | Location |
|-------|-----------|---------|----------|
| Frontend | Next.js (App Router) | 16.3.3 | `src/` |
| UI Library | React | 19.2.8 | `src/` |
| Styling | CSS Modules | — | `*.module.css` |
| Auth | Clerk | `@clerk/nextjs` | To be installed |
| Backend | FastAPI (Python) | 0.115.x | `ecdat-backend/` (to be created) |
| Database | PostgreSQL | 16 | Docker Compose |
| Job Queue | In-process FastAPI `BackgroundTasks` | — | `ecdat-backend/app/services/scanner/orchestrator.py`. Celery+Redis was in the original plan but was never wired (no real infra ever existed); deliberately dropped — see `docs/BACKEND_AUDIT_PHASE0-6.md` #9. |
| Scanner | Tree-sitter + Semgrep | Latest | Python backend |
| Fonts | Inter, Outfit, JetBrains Mono | Google Fonts | `layout.tsx` |

---

## REPOSITORY STRUCTURE

```
SIH-ECDTA-Team-LatentManifold/
├── src/                          ← Next.js frontend (EXISTS)
│   ├── app/
│   │   ├── layout.tsx            ← Root layout (EXISTS — wrap with ClerkProvider)
│   │   ├── page.tsx              ← Homepage (EXISTS — 1850 lines)
│   │   ├── globals.css           ← Global styles (EXISTS)
│   │   ├── Home.module.css       ← Homepage styles (EXISTS)
│   │   ├── prototype/            ← Prototype dashboard (EXISTS — needs rewiring)
│   │   │   ├── page.tsx          ← Dashboard (EXISTS — 1489 lines, HARDCODED DATA)
│   │   │   └── Prototype.module.css
│   │   ├── evidence/             ← Evidence room (EXISTS — static)
│   │   ├── presentation/         ← SIH slides (EXISTS — static)
│   │   └── sign-in/              ← TO CREATE (Phase 1)
│   └── components/
│       ├── Navbar.tsx            ← (EXISTS)
│       ├── Footer.tsx            ← (EXISTS)
│       ├── Quby.tsx              ← (EXISTS — AI chat simulation)
│       └── CommandPalette.tsx    ← (EXISTS)
├── docs/
│   ├── PRODUCT_REFERENCE.md      ← ★ START HERE: Complete reference from all 22 PDFs
│   ├── IMPLEMENTATION_PLAN.md    ← Full code spec for every phase task
│   ├── TRACKER.md                ← Living task tracker (update as you go)
│   ├── AGENT_CONTEXT.md          ← This file
│   ├── master_analysis_prompt.md ← Master analysis directive
│   └── Phase 1.pdf ... Phase 22.pdf ← Research documents (22 PDFs — text extracted)
├── ECDTA.md                      ← Master PRD (EXISTS)
├── AGENTS.md                     ← MANDATORY Next.js version rules (EXISTS)
├── package.json                  ← Next.js deps (EXISTS)
├── ecdat-backend/                ← FastAPI Backend (EXISTS)
└── docker-compose.yml            ← Docker Compose (EXISTS)
```

---

## CURRENT STATE (AS OF 2026-09-02)

| Component | Status | Notes |
|-----------|--------|-------|
| Marketing website (`/`) | ✅ COMPLETE | Static, no backend needed |
| Evidence room (`/evidence`) | ✅ COMPLETE | Static page, expand content later |
| Presentation mode (`/presentation`) | ✅ COMPLETE | Static SIH slides |
| Prototype dashboard (`/prototype`) | ⚠️ SYNTHETIC | All data hardcoded — Phase 6 rewires this |
| Clerk authentication | ✅ COMPLETE | Phase 1 done |
| FastAPI backend | ✅ COMPLETE | Phase 0 done |
| PostgreSQL schema | ✅ COMPLETE | Phase 0 done |
| Job lifecycle API + Celery | ✅ COMPLETE | Phase 2.1 done |
| Source code scanner (Tree-sitter + Semgrep) | ✅ COMPLETE | Phase 2.2–2.3 done |
| Dependency + Certificate scanners | ✅ COMPLETE | Phase 2.4–2.5 done |
| Scanner orchestrator + Git cloner | ✅ COMPLETE | Phase 2.6–2.7 done |
| Normalization engine + CBOM | ✅ COMPLETE | Phase 3 done |
| Quantum Risk Engine | ✅ COMPLETE | Phase 4 done — Mosca + 4 risk endpoints |
| PQC recommendations | ✅ COMPLETE | Phase 5 done — FIPS 203/204/205 candidates |
| Enterprise sidebar + UI shell | ✅ COMPLETE | Phase 6.1–6.2 done |
| Dashboard wiring (real API data) | ✅ COMPLETE | Phase 6.3–6.6 done and verified working end-to-end against the real backend/DB |
| AI Analyst (real) | ✅ COMPLETE | Phase 8 done — Gemini+Groq fallback, evidence-grounded, `ai_excluded` data-access control |
| Project/source scoping | ✅ COMPLETE | `evidence.source_id` + `?source_id=` filtering across assets/risk/recommendations/cbom/analyst |
| Knowledge Graph | ❌ NOT DONE | Phase 9 (post-SIH) |

---

## DESIGN SYSTEM

**Color palette (DO NOT change these):**
```css
--color-graphite:  #181917;   /* Primary text */
--color-copper:    #B95532;   /* Accent, CTA, active state */
--color-sage:      #687563;   /* Success, safe, verified */
--color-ivory:     #F3F0E8;   /* Sign-in left panel */
--color-surface:   #F9FAFB;   /* Card backgrounds */
--color-border:    #E5E7EB;   /* Borders */
```

**Risk badge colors:**
```css
CRITICAL → background: #FEE2E2; color: #B91C1C;
HIGH     → background: #FFEDD5; color: #C2410C;
MEDIUM   → background: #FEF9C3; color: #854D0E;
LOW      → background: #DCFCE7; color: #15803D;
```

**Typography:** Inter (body), Outfit (display), JetBrains Mono (code/IDs)

**Design aesthetic:** Enterprise white UI, inspired by Lyzr.ai. NO dark mode, NO neon, NO cyberpunk. Clean, data-dense, professional.

---

## KEY DATA MODELS

### Canonical Algorithm Format
`{FAMILY}:{KEY_SIZE}` — e.g., `RSA:2048`, `AES:256`, `ECDSA:P256`  
For algorithms without key sizes: `SHA-256`, `SHA-1`, `MD5`, `DES3`, `ML-KEM-768`

### Evidence Object
```python
{
  "id": "uuid",
  "job_id": "uuid",
  "workspace_id": "uuid",
  "source_type": "source_code" | "dependency" | "certificate",
  "file_path": "src/auth/token.go",
  "line_number": 42,
  "raw_match": 'rsa.GenerateKey(rand.Reader, 2048)',
  "context_lines": "  // preceding line\n  rsa.GenerateKey(rand.Reader, 2048)\n  // following line",
  "detector": "treesitter_import" | "treesitter_call" | "semgrep" | "x509" | "manifest",
  "confidence": 0.95,
  "raw_metadata": {}
}
```

### Canonical Asset
```python
{
  "id": "uuid",
  "workspace_id": "uuid",
  "algorithm_canonical": "RSA:2048",
  "algorithm_family": "RSA",
  "algorithm_name": "RSA",
  "key_size": 2048,
  "function": "KEY_EXCHANGE" | "SIGNATURE" | "HASH" | "ENCRYPTION" | "POST_QUANTUM_KEM",
  "quantum_vulnerable": true,
  "classical_vulnerable": false,
  "risk_score": {...},
  "recommendation": {...}
}
```

---

## PHASE DEPENDENCY ORDER

```
Phase 0 → Phase 1 (can run in parallel with 2)
Phase 0 → Phase 2 → Phase 3 → Phase 4 → Phase 5
Phase 1 + Phase 5 → Phase 6 → Phase 7
```

---

## HOW TO PICK UP A TASK

1. **Read this file** (you're doing it now ✓)
2. **Read `docs/PRODUCT_REFERENCE.md`** — understand the full product picture from 22 PDFs
3. **Read `docs/TRACKER.md`** — find the next `[ ]` task in the current phase
3.5. **Read `docs/BACKEND_AUDIT_PHASE0-6.md`** if touching anything in `ecdat-backend/` — TRACKER's `[x]` marks are not all trustworthy for Phases 0–6; the audit lists which ones are actually stubs or broken, with file:line.
4. **Read the relevant section** of `docs/IMPLEMENTATION_PLAN.md` for full code spec and DoD
5. **Do the work**
6. **Update `docs/TRACKER.md`**: `[ ]` → `[x]` when done, `[/]` while in progress
7. **Update the date** in TRACKER.md header `Last updated by:`

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

**Backend `ecdat-backend/.env`:**
```env
DATABASE_URL=postgresql+asyncpg://ecdat:password@localhost:5432/ecdat_db
REDIS_URL=redis://localhost:6379/0
CLERK_SECRET_KEY=sk_test_REPLACE_WITH_REAL_KEY
ENVIRONMENT=development
```

**To get Clerk keys:** Sign up at https://clerk.com, create an application, copy keys from dashboard.

---

## CRITICAL THINGS TO NEVER DO

- ❌ Commit `.env` or `.env.local` files
- ❌ Hard-code user IDs, workspace IDs, or auth tokens
- ❌ Trust client-supplied workspace IDs without server-side validation
- ❌ Use `UPDATE` or `DELETE` on the `evidence` table (it's append-only)
- ❌ Leave temp scan directories (`/tmp/ecdat-scans/`) after scan ends
- ❌ Let AI generate or modify risk scores
- ❌ Show synthetic data in the dashboard without explicit `[DEMONSTRATION DATA]` label
- ❌ Write any Next.js code without reading AGENTS.md first
- ❌ Use `&&` in PowerShell commands (use `;` instead)

---

## CONTACTS & RESOURCES

- **Team:** LatentManifold / SIH2026-143
- **Problem:** SIH26164 (NTRO)
- **Website:** https://ecdta.vercel.app
- **Master PRD:** `ECDTA.md`
- **Research:** `docs/Phase 1.pdf` through `docs/Phase 22.pdf`
- **Analysis:** `docs/master_analysis_prompt.md` + artifact `ecdat_master_analysis.md`
- **NIST PQC Standards:** FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), FIPS 205 (SLH-DSA)
- **Mosca Inequality:** X (Data Lifetime) + Y (Migration Time) > Z (Threat Horizon) → CRITICAL risk
