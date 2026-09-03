"""
ECDAT Audit Logging — Phase 10 (Enterprise Hardening)

Event taxonomy follows Phase 19 PDF §75-76 ("ECDAT should log: Login, Scan,
Asset View, Evidence Access, Policy Change, ... Admin Action, AI Action").
Not every one of those is wired yet (e.g. "Asset View"/"Evidence Access"
would fire on every single page load — deliberately not instrumented at
that granularity for an MVP, see the # ponytail note below); the ones that
are wired cover the actions that actually change workspace state.

This module ONLY ever INSERTs — no update_event/delete_event function
exists, by design, matching the append-only discipline this project already
applies to the `evidence` table (see docs/AGENT_CONTEXT.md's mandatory rules).
"""
import uuid
from typing import Optional, Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog

# ponytail: per-view logging (Asset View, Evidence Access from the PDF's list)
# would fire on every GET request and drown out the events that actually
# matter (scans, policy changes). Add a sampled/throttled variant if audit
# coverage of read access specifically becomes a real requirement later.


async def log_event(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    actor: str,
    event: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[uuid.UUID] = None,
    details: Optional[dict[str, Any]] = None,
) -> AuditLog:
    entry = AuditLog(
        workspace_id=workspace_id,
        actor_clerk_user_id=actor,
        event=event,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry
