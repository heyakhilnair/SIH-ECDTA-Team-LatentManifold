"""
ECDAT Activity / Audit Log API Router — Phase 10
===================================================
Endpoints:
  GET /api/workspaces/{workspace_id}/activity → paginated real audit events
"""
import uuid
from typing import Dict, Any, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.services.auth import get_current_user_id, verify_workspace_access
from app.models.audit import AuditLog

router = APIRouter(prefix="/workspaces/{workspace_id}/activity", tags=["audit"])


@router.get("", response_model=Dict[str, Any])
async def list_activity(
    workspace_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(workspace_id, user_id, db)

    total_result = await db.execute(select(func.count(AuditLog.id)).where(AuditLog.workspace_id == workspace_id))
    total = total_result.scalar_one()

    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.workspace_id == workspace_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = result.scalars().all()

    return {
        "total": total,
        "items": [
            {
                "id": str(r.id),
                "actor": r.actor_clerk_user_id,
                "event": r.event,
                "resource_type": r.resource_type,
                "resource_id": str(r.resource_id) if r.resource_id else None,
                "details": r.details,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
    }
