"""
ECDAT AI Analyst API Router — Phase 8
=======================================
Endpoints:
  GET  /api/workspaces/{workspace_id}/analyst/status  → whether AI Analyst is configured
  POST /api/workspaces/{workspace_id}/analyst/query   → ask a question, evidence-grounded answer
"""
import uuid
from typing import Dict, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.auth import get_current_user_id, verify_workspace_access
from app.services.audit import log_event
from app.services.ai_analyst import ask_analyst, is_configured

router = APIRouter(prefix="/workspaces/{workspace_id}/analyst", tags=["analyst"])


class AnalystQuery(BaseModel):
    question: str = Field(min_length=1, max_length=2000)


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
    response = await ask_analyst(db, workspace_id, body.question)
    await log_event(
        db, workspace_id, user_id, "AI_ACTION", "workspace", workspace_id,
        details={"question": body.question, "confidence": response.confidence},
    )
    return response.model_dump()
