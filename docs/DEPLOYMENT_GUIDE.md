# ECDAT Deployment Guide — Vercel (frontend) + Render (backend)

This is grounded directly in the actual code: `ecdat-backend/app/config.py` (what env vars the backend genuinely reads), `src/lib/api.ts` (what the frontend reads), the `render.yaml` already sitting in the repo (now updated — see Section 3), and Clerk's own current production-deployment documentation (checked directly, not from memory, since Clerk's exact recommended flow matters and changes over time).

---

## 1. The split

- **Vercel** hosts the Next.js frontend (repo root — `package.json`, `src/`). Root Directory should stay `.` (the repo root) — do not point it at `ecdat-backend/`.
- **Render** hosts the FastAPI backend (`ecdat-backend/`). Root Directory must be set to `ecdat-backend`.
- **Database**: both point at the same Supabase-hosted Postgres instance you already use locally — Render does not need its own Postgres add-on. One real thing does need to change about the connection string itself for Render specifically — see Section 2.
- **Clerk, Gemini, Groq**: external SaaS APIs. Gemini/Groq keys work identically in prod as in dev. Clerk is more nuanced — see Section 6, the earlier "just add the URL to an allowlist" answer undersold what Clerk actually recommends.

---

## 2. Supabase — the IPv4 pooler gotcha

This is a real, well-documented issue, not something visible from ECDAT's own code: Render's build/runtime network does not reliably reach Supabase's default **direct** connection, which is IPv6-only on newer Supabase projects. If you point `DATABASE_URL` at the direct connection string, the backend will fail to connect on Render even though it connects fine from your own machine.

**Fix**: use Supabase's **Session Pooler** connection string instead, which is IPv4-reachable.

1. Supabase Dashboard → your project → **Settings → Database**.
2. Under **Connection string**, enable **"Use connection pooling"**.
3. Set the mode to **Session**.
4. Copy the URI — it looks like `postgresql://postgres.<project-ref>:[PASSWORD]@aws-0-<region>.pooler.supabase.com:6543/postgres`.
5. **Change the prefix** from `postgresql://` to `postgresql+asyncpg://` — the backend's database layer is built on SQLAlchemy's async engine over the `asyncpg` driver (see `app/database.py` / `app/config.py`'s default value, which already uses this exact prefix), so a plain `postgresql://` string will fail immediately on startup.

This is the connection string you put in Render's `DATABASE_URL` (Section 3). Locally you can keep using whichever connection string already works for you.

---

## 3. Render — `render.yaml`, already updated in the repo

`ecdat-backend/render.yaml` has been updated to close the two real gaps found earlier (missing AI keys, missing CORS config) and to automate migrations:

```yaml
services:
  - type: web
    name: ecdat-backend
    env: python
    region: ohio
    buildCommand: "pip install -r requirements.txt && alembic upgrade head"
    startCommand: "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.6
      - key: ENVIRONMENT
        value: production
      - key: DATABASE_URL
        sync: false
      - key: CLERK_SECRET_KEY
        sync: false
      - key: GEMINI_API_KEY
        sync: false
      - key: GROQ_API_KEY
        sync: false
      - key: CORS_ORIGINS
        sync: false
      - key: SUPABASE_PROJECT_URL
        sync: false
      - key: SUPABASE_ACCESS_TOKEN
        sync: false
```

What changed and why:

- **`buildCommand` now runs `alembic upgrade head` after installing dependencies.** `alembic upgrade head` is idempotent — a migration that's already applied is a safe no-op — so running it on every single deploy keeps the deployed schema in sync automatically, instead of needing a manual step every time a new migration is added. This is a genuine improvement over just installing dependencies alone.
- **`GEMINI_API_KEY` / `GROQ_API_KEY` added.** Without these, the AI Analyst reports itself as "not configured" in production even though it works locally — `render.yaml` had no way to prompt for them before.
- **`CORS_ORIGINS` added.** This is the one most likely to bite you if skipped. The backend's code has a hardcoded fallback (`http://localhost:3000,https://ecdta.vercel.app`) for when this env var isn't set at all. Unless your real Vercel URL happens to be exactly that placeholder, your deployed frontend will get silently blocked from talking to your deployed backend — it looks exactly like a broken backend, but it's actually the browser refusing the response because the origin isn't recognized. Set this to your real deployed frontend URL(s), comma-separated if you have more than one (e.g. `https://your-app.vercel.app,https://your-custom-domain.com`). No wildcard, per the code's own comment.
- **`PYTHON_VERSION` bumped to `3.11.6`.** Pinning this matters for a real reason beyond just matching your local version: if Render ever defaults to a bleeding-edge Python (3.13/3.14) that doesn't yet have prebuilt wheels for this project's compiled dependencies (`cryptography`, `pydantic-core`), the build falls back to compiling from source with the Rust toolchain (`maturin`), which commonly fails on Render's build image. Pinning a stable, well-supported 3.11.x avoids this entirely.
- **`SUPABASE_PROJECT_URL` / `SUPABASE_ACCESS_TOKEN` kept, but genuinely optional.** They're declared in `app/config.py` but never actually read anywhere in the codebase (confirmed by searching) — kept only for parity with your local `.env`. Fine to leave blank in Render.

**`sync: false` on every secret-bearing var is deliberate** — it tells Render "this app needs a value for this," without ever storing the actual secret inside `render.yaml` itself (which is committed to git). Render will prompt you to type each value in directly through its dashboard the first time you deploy, or whenever you open the service's Environment tab.

### Other Render service settings (not in the YAML)

- **Root Directory**: `ecdat-backend` — without this, Render tries to run the build command from the repo root, where no `requirements.txt` exists.
- **Start Command** already binds to `$PORT`, not a hardcoded port — Render assigns its own port at runtime and injects it via this variable; never hardcode `--port 8000` in production.
- **Semgrep**: nothing to configure. Locally, `semgrep` ships a large compiled binary for your OS (Windows) — this was actually the exact file that blocked your last git push, since `.venv` was tracked. Render runs Linux, so a fresh `pip install` there pulls the correct Linux build automatically; this isn't something you need to prepare for.

---

## 4. Vercel — exact environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (Production, and Preview too if you want preview deployments to work):

| Variable | Local value (from `.env.local`) | What to set in Vercel |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | your Clerk publishable key | Same value if reusing your dev instance (see Section 6); a `pk_live_...` key if you create a real production instance |
| `CLERK_SECRET_KEY` | your Clerk secret key | Same value if reusing your dev instance; a `sk_live_...` key for a real production instance |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` | Keep as-is |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` | Keep as-is |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/prototype` | Keep as-is |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/prototype` | Keep as-is |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL` | whatever you have locally | Keep as-is — don't blindly overwrite with a value from a different guide; use what's already working for you locally |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL` | whatever you have locally | Keep as-is |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | whatever you have locally | Keep as-is |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | whatever you have locally | Keep as-is |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | **Must change** → your real Render backend URL, e.g. `https://ecdat-backend.onrender.com` (no trailing slash) |

**Skip these** (present in `.env.local` but not read anywhere in `src/`, confirmed by search): `SUPABASE_PROJECT_URL`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_ANON_KEY`, `SUPABASE_DB_PASSWORD`.

**Framework/build settings**: Vercel auto-detects Next.js — Framework Preset `Next.js`, Root Directory `./`, Build Command `npm run build`. Nothing to change from Vercel's defaults.

---

## 5. Is "deploy Render first, then Vercel" the right order? Yes.

You need the real Render URL before you can set `NEXT_PUBLIC_API_URL` on Vercel, so deploying the backend first is correct. The one addition to this sequencing: since `CORS_ORIGINS` also needs the *frontend's* real URL, and you won't have that until Vercel's first deploy finishes, the practical order is: deploy Render with a placeholder `CORS_ORIGINS` → deploy Vercel with the real Render URL → go back to Render and update `CORS_ORIGINS` to the real Vercel URL (Section 8 below has this as an explicit checklist).

---

## 6. Clerk — what actually needs to change (verified against Clerk's own current docs)

The earlier version of this guide said "just add your URL to an allowed-origins list." That undersold it. Checked directly against Clerk's current production-deployment documentation, there are genuinely two different paths here, and the right one depends on what this deployment is *for*.

### If this is a hackathon/demo deployment (most likely, for judging)

You can deploy using your **existing development-instance keys as-is** — no change required in Clerk at all. Clerk's development instances are explicitly designed to work on any hosting domain, including a default `*.vercel.app` one, with no DNS setup and no domain ownership required. The tradeoff, and it's a real one: Clerk shows a "development mode" notice (you may have already seen this exact console warning locally: *"Clerk has been loaded with development keys. Development instances have strict usage limits and should not be used when deploying your application to production."*) and enforces development-tier usage limits. For a judged demo with a handful of real logins, this is very unlikely to matter.

### If you want a genuine production setup (custom domain, no dev banner, higher limits)

This is a real, separate flow in Clerk, not a checkbox — per Clerk's own documentation:

1. **Own a domain** and be able to add DNS records to it — required, not optional.
2. In the **Clerk Dashboard**, use the environment switcher at the top (labeled "Development") and select **Create production instance**. You'll be offered the choice to clone your development instance's settings or start fresh.
3. **Important, stated explicitly by Clerk**: SSO connections, Integrations, and **Paths** (your sign-in/sign-up/redirect URL settings) do **not** carry over automatically to the new production instance — you'll need to re-enter them there even if you clone other settings.
4. Get your **new** production API keys — `pk_live_...` and `sk_live_...` — these are genuinely different values from your `pk_test_.../sk_test_...` keys, not a renamed version of the same ones.
5. Set those new `pk_live_.../sk_live_...` values as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`/`CLERK_SECRET_KEY` on **both** Vercel and Render (recall both platforms need `CLERK_SECRET_KEY` — the backend uses it to fetch Clerk's JWKS and verify every login).
6. Add the **DNS records** Clerk's Domains page shows you for your production instance — these are what let Clerk manage session cookies and verified emails under your real domain. Clerk states this can take up to 48 hours to propagate, so this isn't a same-day step if you're on a deadline.
7. If you use any social/OAuth sign-in providers, production instances require **your own OAuth credentials** per provider — Clerk's shared development credentials are explicitly not considered secure for production use.
8. Redeploy both Vercel and Render after changing the keys — env var changes alone don't take effect on an already-running instance.

**Practical recommendation given this is a hackathon submission on a deadline**: use your existing development-instance keys for the deployment judges will actually see, exactly as they already work locally — do not start the full production-instance/DNS process unless you specifically need a custom domain or plan to run this past the hackathon with real users. The 48-hour DNS propagation window alone makes the full production flow risky to start close to a deadline.

---

## 7. Troubleshooting checklist

- **"Network is unreachable" during the Render build/at runtime**: you're using Supabase's direct IPv6 connection string instead of the Session Pooler string. Switch to the pooler (Section 2).
- **A Rust/`maturin` build failure, or "read-only file system" during the Render build**: Render picked a very new Python version with no prebuilt wheels available yet for this project's compiled dependencies, forcing a from-source build. Confirm `PYTHON_VERSION=3.11.6` is actually set in Render's Environment tab, not just in `render.yaml` (the yaml only takes effect the first time a service is created from it; an existing service's env vars are managed in the dashboard from then on).
- **"Failed to create workspace" on first login**: the database tables don't exist yet — either the build's `alembic upgrade head` step failed (check Render's build logs) or `DATABASE_URL` on Render points at a different, unmigrated database than the one you've been testing against locally.
- **`{"detail":"Not Found"}` when visiting the bare Render URL**: expected, not a bug — confirmed directly in the code, there is no `/` route defined, only `/health` and the real API routes under `/api/...`. Visit `/health` to confirm the backend is actually up; it returns `{"status": "ok", "version": "0.1.0"}`.
- **Frontend loads but every API call fails, browser console shows a CORS error**: `CORS_ORIGINS` on Render doesn't include your real Vercel URL yet (Section 3) — this is the single most common thing to forget, since it's the one env var that exists in neither local `.env` file.
- **AI Analyst says "not configured" in production but works locally**: `GEMINI_API_KEY`/`GROQ_API_KEY` weren't set in Render's dashboard — `render.yaml` declaring them with `sync: false` only means Render will *prompt* for them; it doesn't fill them in for you.

---

## 8. Final checklist, in the order that actually works

1. Get the real `DATABASE_URL` sorted first — Supabase Session Pooler string, `postgresql+asyncpg://` prefix (Section 2).
2. Deploy the backend to Render: Root Directory `ecdat-backend`, all env vars from Section 3 filled in (including `GEMINI_API_KEY`/`GROQ_API_KEY`), `CORS_ORIGINS` set to a placeholder for now (e.g. `http://localhost:3000`) since you don't have the Vercel URL yet.
3. Confirm the backend actually boots: check Render's logs for `Application startup complete`, then hit `https://<your-render-url>/health` — should return `{"status": "ok", ...}`.
4. Deploy the frontend to Vercel, setting `NEXT_PUBLIC_API_URL` to that real Render URL.
5. Once Vercel gives you the real frontend URL, go back to Render and update `CORS_ORIGINS` to that real URL.
6. Decide which Clerk path applies (Section 6) — for a hackathon deadline, most likely: do nothing further in Clerk, your existing dev-instance keys already work on the new Vercel domain.
7. Load the real deployed site, sign in, and run one real scan end to end — that single action exercises the database connection, Clerk verification, and (if you ask it something) both AI keys all at once.
