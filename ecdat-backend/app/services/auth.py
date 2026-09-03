"""
ECDAT Auth — verifies the Clerk session JWT and enforces workspace ownership.

Every route that touches real data must go through get_current_user_id (verifies
the token's signature against Clerk's JWKS, not just its claims) and
verify_workspace_access (confirms the resolved user actually owns the
workspace_id in the URL). Nothing else in this codebase should re-implement
either of these — see docs/BACKEND_AUDIT_PHASE0-6.md #1-#3, #13.
"""
import time
import uuid

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
from jose.exceptions import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings

security = HTTPBearer()

# ponytail: process-local JWKS cache (single dict, no lock) — fine for one
# uvicorn worker; if this ever runs multi-worker, move to a shared cache.
_jwks_cache: dict = {"keys": None, "fetched_at": 0.0}
_JWKS_TTL_SECONDS = 3600


async def _fetch_jwks(force: bool = False) -> dict:
    now = time.time()
    if not force and _jwks_cache["keys"] and (now - _jwks_cache["fetched_at"]) < _JWKS_TTL_SECONDS:
        return _jwks_cache["keys"]

    if not settings.clerk_secret_key:
        raise HTTPException(status_code=500, detail="Server misconfigured: CLERK_SECRET_KEY not set")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.clerk.com/v1/jwks",
            headers={"Authorization": f"Bearer {settings.clerk_secret_key}"},
            timeout=5.0,
        )
        resp.raise_for_status()
        jwks = resp.json()

    _jwks_cache["keys"] = jwks
    _jwks_cache["fetched_at"] = now
    return jwks


async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    Verifies the Clerk session JWT's signature against Clerk's published JWKS
    (fetched via the backend API using CLERK_SECRET_KEY, cached for an hour) and
    returns the verified `sub` claim (Clerk user id).

    This replaces the old get_unverified_claims() call, which accepted any
    JWT-shaped string with an arbitrary `sub` — see BACKEND_AUDIT_PHASE0-6.md #3.
    """
    token = credentials.credentials
    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Malformed token: {e}", headers={"WWW-Authenticate": "Bearer"})

    kid = unverified_header.get("kid")

    jwks = await _fetch_jwks()
    key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
    if key is None:
        # Key rotation: refresh once before giving up.
        jwks = await _fetch_jwks(force=True)
        key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
    if key is None:
        raise HTTPException(status_code=401, detail="Unknown signing key", headers={"WWW-Authenticate": "Bearer"})

    try:
        # Clerk session tokens don't set a fixed `aud`; we're verifying signature
        # + standard exp/nbf/iat here, not audience.
        claims = jwt.decode(token, key, algorithms=["RS256"], options={"verify_aud": False})
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}", headers={"WWW-Authenticate": "Bearer"})

    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token: missing sub claim", headers={"WWW-Authenticate": "Bearer"})
    return user_id


async def verify_workspace_access(workspace_id: uuid.UUID, user_id: str, db: AsyncSession):
    """
    Confirms `user_id` (from get_current_user_id) owns `workspace_id`. Raises 404
    rather than 403 on mismatch so we don't confirm the workspace's existence to
    someone who doesn't own it.
    """
    from app.models.workspace import Workspace  # local import: avoid module cycle

    result = await db.execute(
        select(Workspace).where(Workspace.id == workspace_id, Workspace.clerk_user_id == user_id)
    )
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found or access denied")
    return workspace
