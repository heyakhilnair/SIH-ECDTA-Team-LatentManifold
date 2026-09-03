"""
Phase 10 (Enterprise Hardening) tests: audit logging.
"""
import uuid

import pytest
import pytest_asyncio
from sqlalchemy import select, text

from app.database import AsyncSessionLocal
from app.models.workspace import Workspace
from app.models.audit import AuditLog
from app.services.audit import log_event


@pytest_asyncio.fixture
async def workspace():
    async with AsyncSessionLocal() as session:
        ws = Workspace(clerk_user_id="test_audit_log_user", name="Audit Log Test Workspace")
        session.add(ws)
        await session.commit()
        yield ws.id
    async with AsyncSessionLocal() as session:
        await session.execute(text("DELETE FROM audit_log WHERE workspace_id = :wid"), {"wid": ws.id})
        await session.execute(text("DELETE FROM workspaces WHERE id = :wid"), {"wid": ws.id})
        await session.commit()


@pytest.mark.asyncio
async def test_log_event_persists_real_row(workspace):
    async with AsyncSessionLocal() as session:
        entry = await log_event(
            session, workspace, "user_123", "SOURCE_ADDED",
            resource_type="source", resource_id=uuid.uuid4(),
            details={"name": "my-repo"},
        )
        assert entry.id is not None

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(AuditLog).where(AuditLog.workspace_id == workspace))
        rows = result.scalars().all()
        assert len(rows) == 1
        assert rows[0].event == "SOURCE_ADDED"
        assert rows[0].actor_clerk_user_id == "user_123"
        assert rows[0].details == {"name": "my-repo"}


def test_log_event_is_append_only_no_mutation_helpers():
    """There should be no update_event/delete_event/etc. exposed — audit logs
    are append-only by design, same discipline as the `evidence` table."""
    import inspect
    import app.services.audit as audit_module
    module_level_functions = [
        name for name, obj in vars(audit_module).items()
        if inspect.isfunction(obj) and obj.__module__ == audit_module.__name__
    ]
    assert module_level_functions == ["log_event"], f"audit module defines more than just log_event: {module_level_functions}"


@pytest.mark.asyncio
async def test_multiple_events_ordered_newest_first_by_default_query(workspace):
    async with AsyncSessionLocal() as session:
        await log_event(session, workspace, "user_123", "SOURCE_ADDED")
        await log_event(session, workspace, "user_123", "SCAN_STARTED")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(AuditLog).where(AuditLog.workspace_id == workspace).order_by(AuditLog.created_at.desc())
        )
        rows = result.scalars().all()
        assert [r.event for r in rows] == ["SCAN_STARTED", "SOURCE_ADDED"]
