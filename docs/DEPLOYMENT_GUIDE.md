# ECDAT Deployment Guide (Render & Vercel)

This is the master reference for deploying the full ECDAT stack (FastAPI Backend + Next.js Frontend) from scratch.

## Architecture Overview
- **Database:** Supabase (PostgreSQL) using the IPv4 Connection Pooler
- **Backend:** Render (Python/FastAPI)
- **Frontend:** Vercel (Next.js/React)
- **Authentication:** Clerk

---

## 1. Supabase Database Configuration
Because modern Supabase defaults to IPv6, which many CI/CD tools (like Render) do not support natively, you **must** use the Supabase Connection Pooler to get an IPv4 address.

1. Go to your Supabase Project Dashboard → **Settings** → **Database**.
2. Scroll to **Connection String**.
3. Check the box for **"Use connection pooling"**.
4. Set the mode to **Session**.
5. Copy the URI. It should look like this:
   `postgresql://postgres.your_project:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`
6. **CRITICAL:** Change the `postgresql://` prefix to `postgresql+asyncpg://` for the FastAPI backend.

---

## 2. Deploying the Backend (Render)

The backend MUST be deployed first so you have a live API URL to give to the frontend.

1. Go to **Render.com** → Click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure the settings:
   - **Name:** `ecdat-backend`
   - **Language/Environment:** `Python`
   - **Root Directory:** `ecdat-backend`
   - **Build Command:** `pip install -r requirements.txt && alembic upgrade head` *(The `alembic` command is vital—it creates your database tables automatically).*
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

4. Add these exact **Environment Variables**:
   - `PYTHON_VERSION`: `3.11.6` *(Forces Render to use a stable Python version with pre-compiled wheels, avoiding build failures).*
   - `DATABASE_URL`: Your Supabase Pooler string from step 1 (starting with `postgresql+asyncpg://`).
   - `CLERK_SECRET_KEY`: Your Clerk secret key.
   - `ENVIRONMENT`: `production`

5. Click **Deploy Web Service**.
6. Once Live, copy the Render URL (e.g., `https://ecdat-backend-abc.onrender.com`).

---

## 3. Deploying the Frontend (Vercel)

1. Go to **Vercel.com** → Click **Add New** → **Project**.
2. Import your GitHub repository.
3. Vercel will auto-detect Next.js. Leave these settings as default:
   - **Framework Preset:** `Next.js`
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`

4. Add these **Environment Variables** (or upload your `.env.local` file):
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: From Clerk
   - `CLERK_SECRET_KEY`: From Clerk
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL`: `/sign-in`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_URL`: `/sign-up`
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`: `/prototype`
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`: `/prototype`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`: `/`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`: `/`
   - `NEXT_PUBLIC_API_URL`: **Your Live Render URL** (e.g., `https://ecdat-backend-abc.onrender.com`) - *Ensure there is no trailing slash!*

5. Click **Deploy**.

## Troubleshooting Checklists

**"Network is unreachable" during Render build:**
- You are using the IPv6 direct connection string instead of the IPv4 Connection Pooler string. Switch to the pooler.

**"Maturin failed" or "Read-only file system" during Render build:**
- Render is using a bleeding-edge Python version (like 3.14). Add `PYTHON_VERSION=3.11.6` to your environment variables.

**"Failed to create workspace" on frontend login:**
- The database tables don't exist yet. Make sure your Render build command includes `&& alembic upgrade head` to run the migrations.

**"detail":"Not Found" when visiting Render URL:**
- This is expected! FastAPI doesn't have a root `/` route defined. Visit `/health` or `/docs` to verify the backend is running.
