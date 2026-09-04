"""
Runnable check for Phase 15's AI session persistence. Matches this project's
existing test_phaseN.py style. Deliberately does NOT call query_analyst()
end-to-end (that needs a live LLM API key/network call, no different from
this project's other tests not invoking real git clones) — instead persists
a session + messages exactly the way query_analyst() does, then verifies
list_sessions()/get_session() (the parts this phase actually added) return
real, correct data.

Run: .venv/Scripts/python.exe test_phase15_ai_sessions.py
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

import app.main  # noqa: F401
from sqlalchemy import text
from fastapi import HTTPException

from app.database import AsyncSessionLocal
from app.models.workspace import Workspace
from app.models.ai_session import AiSession, AiMessage
from app.routers.analyst import list_sessions, get_session

USER = "test_p15_user"


async def _cleanup(ws_id):
    async with AsyncSessionLocal() as db:
        await db.execute(text("DELETE FROM ai_messages WHERE session_id IN (SELECT id FROM ai_sessions WHERE workspace_id = :w)"), {"w": ws_id})
        await db.execute(text("DELETE FROM ai_sessions WHERE workspace_id = :w"), {"w": ws_id})
        await db.execute(text("DELETE FROM workspaces WHERE id = :w"), {"w": ws_id})
        await db.commit()


async def test_sessions_list_and_detail_are_real():
    print("\n[1] AiSession/AiMessage persist for real and list_sessions()/get_session() read them back...")
    db = AsyncSessionLocal()
    ws = Workspace(clerk_user_id=USER, name="Phase15 AI Session Test")
    db.add(ws)
    await db.flush()

    s1 = AiSession(workspace_id=ws.id, title="What should I fix first?")
    db.add(s1)
    await db.flush()
    db.add(AiMessage(session_id=s1.id, role="user", text="What should I fix first?"))
    db.add(AiMessage(
        session_id=s1.id, role="assistant", text="Start with your CRITICAL RSA findings.",
        confidence=0.9, evidence_citations=["ev1"], asset_citations=["asset1"], scope="All Projects",
    ))
    await db.commit()
    ws_id, s1_id = ws.id, s1.id

    try:
        sessions = await list_sessions(workspace_id=ws_id, user_id=USER, db=db)
        assert len(sessions) == 1, sessions
        assert sessions[0]["title"] == "What should I fix first?", sessions
        assert sessions[0]["message_count"] == 2, sessions
        print(f"    OK — list_sessions() shows 1 real session with {sessions[0]['message_count']} messages")

        detail = await get_session(workspace_id=ws_id, session_id=s1_id, user_id=USER, db=db)
        assert len(detail["messages"]) == 2, detail
        assert detail["messages"][0]["role"] == "user"
        assert detail["messages"][1]["role"] == "assistant" and detail["messages"][1]["confidence"] == 0.9
        print("    OK — get_session() returns real messages in order with real fields intact")

        # Cross-tenant / wrong workspace must 404, not leak another workspace's session
        raised = False
        try:
            await get_session(workspace_id=uuid_random(), session_id=s1_id, user_id=USER, db=db)
        except HTTPException as e:
            raised = True
            assert e.status_code == 404
        assert raised, "expected 404 for a session id under the wrong workspace"
        print("    OK — session lookup under the wrong workspace_id correctly 404s")
    finally:
        await db.close()
        await _cleanup(ws_id)


def uuid_random():
    import uuid
    return uuid.uuid4()


async def main():
    await test_sessions_list_and_detail_are_real()
    print("\nAll Phase 15 (AI session persistence) checks passed.")


if __name__ == "__main__":
    asyncio.run(main())
