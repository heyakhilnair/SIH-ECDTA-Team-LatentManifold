"""
ECDAT AI Analyst API Router — Phase 8, sessions added Phase 15
================================================================
Endpoints:
  GET  /api/workspaces/{workspace_id}/analyst/status          → whether AI Analyst is configured
  POST /api/workspaces/{workspace_id}/analyst/query            → ask a question, evidence-grounded answer
  GET  /api/workspaces/{workspace_id}/analyst/sessions         → list past sessions (history)
  GET  /api/workspaces/{workspace_id}/analyst/sessions/{id}    → one session's full message history
"""
import uuid
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.services.auth import get_current_user_id, verify_workspace_access
from app.services.audit import log_event
from app.services.ai_analyst import ask_analyst, is_configured, resolve_citation_details, resolve_scope_label
from app.models.ai_session import AiSession, AiMessage

router = APIRouter(prefix="/workspaces/{workspace_id}/analyst", tags=["analyst"])


class AnalystQuery(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    source_id: Optional[uuid.UUID] = None  # scope the question to one project/source
    session_id: Optional[uuid.UUID] = None  # continue an existing session; omit to start a new one


def _serialize_message(m: AiMessage) -> Dict[str, Any]:
    return {
        "role": m.role,
        "text": m.text,
        "confidence": m.confidence,
        "evidence_citations": m.evidence_citations or [],
        "asset_citations": m.asset_citations or [],
        "citation_details": m.citation_details or [],
        "unknowns": m.unknowns or [],
        "scope": m.scope,
        "is_error": m.is_error,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


@router.get("/status", response_model=Dict[str, Any])
async def get_analyst_status(
    workspace_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(workspace_id, user_id, db)
    return {"configured": is_configured()}


@router.post("/query", response_model=Dict[str, Any])
async def query_analyst(
    workspace_id: uuid.UUID,
    body: AnalystQuery,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(workspace_id, user_id, db)

    # Real persistence (Phase 15): every query implicitly creates-or-continues
    # a session — no separate "new chat" click needed. A session started
    # under one project scope stays that scope; switching projects on the
    # frontend already clears `messages` and starts a fresh session, so this
    # never silently mixes two projects' answers in one thread.
    session: Optional[AiSession] = None
    if body.session_id:
        session_result = await db.execute(select(AiSession).where(AiSession.id == body.session_id, AiSession.workspace_id == workspace_id))
        session = session_result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
    if not session:
        session = AiSession(workspace_id=workspace_id, source_id=body.source_id, title=body.question[:200])
        db.add(session)
        await db.flush()

    db.add(AiMessage(session_id=session.id, role="user", text=body.question))

    response = await ask_analyst(db, workspace_id, body.question, source_id=body.source_id)
    await log_event(
        db, workspace_id, user_id, "AI_ACTION", "workspace", workspace_id,
        details={"question": body.question, "confidence": response.confidence},
    )
    # citation_details/scope are display-only enrichment resolved after the
    # fact — the LLM's own structured-output contract (AnalystResponse)
    # stays exactly what it was, this just adds "which file, which project"
    # for each already-verified citation so the frontend can show it.
    citation_details = await resolve_citation_details(db, workspace_id, response.evidence_citations)
    scope = await resolve_scope_label(db, workspace_id, body.source_id)

    db.add(AiMessage(
        session_id=session.id, role="assistant", text=response.answer, confidence=response.confidence,
        evidence_citations=response.evidence_citations, asset_citations=response.asset_citations,
        citation_details=citation_details, unknowns=response.unknowns, scope=scope,
    ))
    await db.commit()

    return {**response.model_dump(), "citation_details": citation_details, "scope": scope, "session_id": str(session.id)}


@router.get("/sessions", response_model=List[Dict[str, Any]])
async def list_sessions(
    workspace_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(workspace_id, user_id, db)

    result = await db.execute(
        select(AiSession, func.count(AiMessage.id))
        .outerjoin(AiMessage, AiMessage.session_id == AiSession.id)
        .where(AiSession.workspace_id == workspace_id)
        .group_by(AiSession.id)
        .order_by(AiSession.updated_at.desc())
        .limit(100)
    )
    return [
        {
            "id": str(s.id),
            "title": s.title,
            "source_id": str(s.source_id) if s.source_id else None,
            "message_count": count,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        }
        for s, count in result.all()
    ]


@router.get("/sessions/{session_id}", response_model=Dict[str, Any])
async def get_session(
    workspace_id: uuid.UUID,
    session_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(workspace_id, user_id, db)

    result = await db.execute(
        select(AiSession).options(selectinload(AiSession.messages)).where(AiSession.id == session_id, AiSession.workspace_id == workspace_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "id": str(session.id),
        "title": session.title,
        "source_id": str(session.source_id) if session.source_id else None,
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "messages": [_serialize_message(m) for m in session.messages],
    }
