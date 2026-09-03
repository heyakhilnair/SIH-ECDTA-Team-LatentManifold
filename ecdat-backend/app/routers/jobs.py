import uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm import selectinload
from typing import List
from uuid import UUID

from app.database import get_db
from app.models.job import DiscoveryJob
from app.models.evidence import EvidenceModel
from app.models.asset import EvidenceAsset
from app.schemas.job import JobCreate, JobStatus
from app.services.scanner.orchestrator import run_discovery_job
from app.services.auth import get_current_user_id, verify_workspace_access
from app.services.audit import log_event

router = APIRouter(prefix="/api", tags=["Jobs"])


async def _job_counts(db: AsyncSession, job_ids: List[uuid.UUID]) -> dict:
    """Real evidence/asset counts per job, batched to avoid N+1 queries."""
    if not job_ids:
        return {}

    evidence_result = await db.execute(
        select(EvidenceModel.job_id, func.count(EvidenceModel.id))
        .where(EvidenceModel.job_id.in_(job_ids))
        .group_by(EvidenceModel.job_id)
    )
    evidence_counts = dict(evidence_result.all())

    asset_result = await db.execute(
        select(EvidenceModel.job_id, func.count(func.distinct(EvidenceAsset.asset_id)))
        .join(EvidenceAsset, EvidenceAsset.evidence_id == EvidenceModel.id)
        .where(EvidenceModel.job_id.in_(job_ids))
        .group_by(EvidenceModel.job_id)
    )
    asset_counts = dict(asset_result.all())

    return {
        jid: {
            "evidence_count": evidence_counts.get(jid, 0),
            "asset_count": asset_counts.get(jid, 0),
        }
        for jid in job_ids
    }


async def _get_owned_job(job_id: UUID, user_id: str, db: AsyncSession) -> DiscoveryJob:
    """Fetch a job and confirm the caller's workspace owns it. 404s either way — never
    reveals whether the job exists to someone who doesn't own it."""
    result = await db.execute(
        select(DiscoveryJob).options(selectinload(DiscoveryJob.workspace)).where(DiscoveryJob.id == job_id)
    )
    job = result.scalars().first()
    if not job or not job.workspace or job.workspace.clerk_user_id != user_id:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/workspaces/{wid}/jobs", response_model=JobStatus)
async def create_job(
    wid: UUID,
    job_in: JobCreate,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(wid, user_id, db)

    # 1. Create job in DB
    job = DiscoveryJob(
        workspace_id=wid,
        status="queued"
    )
    db.add(job)
    await db.flush()  # get job.id without committing yet

    # 2. Create job_sources links
    from app.models.source import JobSource, Source

    for sid in job_in.source_ids:
        js = JobSource(job_id=job.id, source_id=sid, status="queued")
        db.add(js)

    await db.commit()
    await db.refresh(job)

    # 3. Trigger background task with real source URLs (only sources this workspace owns)
    sources_result = await db.execute(
        select(Source).where(Source.id.in_(job_in.source_ids), Source.workspace_id == wid)
    )
    sources = sources_result.scalars().all()
    source_urls = [s.configuration.get("url") for s in sources if s.configuration and s.configuration.get("url")]

    background_tasks.add_task(run_discovery_job, str(job.id), str(wid), source_urls)
    await log_event(db, wid, user_id, "SCAN_STARTED", "discovery_job", job.id, details={"source_count": len(source_urls)})

    return JobStatus(
        id=job.id,
        status=job.status,
        started_at=job.started_at,
        completed_at=job.completed_at,
        evidence_count=0,
        asset_count=0,
        error_msg=job.error_msg
    )


@router.get("/workspaces/{wid}/jobs", response_model=List[JobStatus])
async def list_jobs(
    wid: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await verify_workspace_access(wid, user_id, db)

    result = await db.execute(
        select(DiscoveryJob).where(DiscoveryJob.workspace_id == wid).order_by(DiscoveryJob.created_at.desc())
    )
    jobs = result.scalars().all()
    counts = await _job_counts(db, [j.id for j in jobs])

    return [
        JobStatus(
            id=job.id,
            status=job.status,
            started_at=job.started_at,
            completed_at=job.completed_at,
            evidence_count=counts.get(job.id, {}).get("evidence_count", 0),
            asset_count=counts.get(job.id, {}).get("asset_count", 0),
            error_msg=job.error_msg
        ) for job in jobs
    ]


@router.get("/jobs/{job_id}", response_model=JobStatus)
async def get_job(
    job_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    job = await _get_owned_job(job_id, user_id, db)
    counts = (await _job_counts(db, [job.id])).get(job.id, {"evidence_count": 0, "asset_count": 0})

    return JobStatus(
        id=job.id,
        status=job.status,
        started_at=job.started_at,
        completed_at=job.completed_at,
        evidence_count=counts["evidence_count"],
        asset_count=counts["asset_count"],
        error_msg=job.error_msg
    )


@router.delete("/jobs/{job_id}", status_code=204)
async def cancel_job(
    job_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    job = await _get_owned_job(job_id, user_id, db)

    if job.status in ["completed", "failed", "cancelled"]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel a job in '{job.status}' state")

    job.status = "cancelled"
    await db.commit()
    await log_event(db, job.workspace_id, user_id, "SCAN_CANCELLED", "discovery_job", job.id)
    # The orchestrator checks job status between sources and will stop (without
    # overwriting this) rather than force-killing the in-flight scan — see
    # services/scanner/orchestrator.py.
    return None


@router.get("/jobs/{job_id}/evidence")
async def get_job_evidence(
    job_id: UUID,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    job = await _get_owned_job(job_id, user_id, db)

    total_result = await db.execute(
        select(func.count(EvidenceModel.id)).where(EvidenceModel.job_id == job.id)
    )
    total = total_result.scalar_one()

    result = await db.execute(
        select(EvidenceModel)
        .where(EvidenceModel.job_id == job.id)
        .order_by(EvidenceModel.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = result.scalars().all()

    return {
        "total": total,
        "items": [
            {
                "id": str(ev.id),
                "source_type": ev.source_type,
                "file_path": ev.file_path,
                "line_number": ev.line_number,
                "raw_match": ev.raw_match,
                "context_lines": ev.context_lines,
                "detector": ev.detector,
                "confidence": ev.confidence,
                "created_at": ev.created_at.isoformat() if ev.created_at else None,
            }
            for ev in rows
        ],
    }


@router.get("/jobs/{job_id}/logs")
async def get_job_logs(
    job_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Real log trail appended by the orchestrator as it actually executes each
    pipeline step (clone, tree-sitter, semgrep, dependency/cert scan, normalize,
    risk, recommend, CBOM) — stored in DiscoveryJob.metadata_["logs"]. Previously
    this endpoint fabricated step names from the status enum; see
    docs/BACKEND_AUDIT_PHASE0-6.md #5.
    """
    job = await _get_owned_job(job_id, user_id, db)
    logs = (job.metadata_ or {}).get("logs", [])
    return {"job_id": str(job_id), "logs": logs}
