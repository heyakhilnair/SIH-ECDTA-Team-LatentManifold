from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from typing import List
from uuid import UUID
import uuid

from app.database import get_db
from app.models.job import DiscoveryJob, JobStatusEnum
from app.models.workspace import Workspace
from app.schemas.job import JobCreate, JobStatus
from app.services.scanner.orchestrator import run_discovery_job

# We simulate the auth dependency for now. In Phase 1, `get_current_user_id` was mentioned.
# We'll expect a header or just assume `wid` from path is trusted if auth middleware is handled globally.
# For now, we fetch workspace from the path.

router = APIRouter(prefix="/api", tags=["Jobs"])

@router.post("/workspaces/{wid}/jobs", response_model=JobStatus)
async def create_job(wid: UUID, job_in: JobCreate, db: AsyncSession = Depends(get_db)):
    # 1. Verify workspace exists
    result = await db.execute(select(Workspace).where(Workspace.id == wid))
    workspace = result.scalars().first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # 2. Create job in DB
    job = DiscoveryJob(
        workspace_id=wid,
        status="queued"
    )
    db.add(job)
    await db.flush() # get job.id without committing yet

    # 3. Create job_sources links
    from app.models.source import JobSource
    for sid in job_in.source_ids:
        js = JobSource(job_id=job.id, source_id=sid, status="queued")
        db.add(js)

    await db.commit()
    await db.refresh(job)

    # 4. Trigger Celery Task
    # Assuming Celery task now takes (job_id, workspace_id, [source_ids])
    run_discovery_job.delay(str(job.id), str(wid), [str(sid) for sid in job_in.source_ids])

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
async def list_jobs(wid: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DiscoveryJob).where(DiscoveryJob.workspace_id == wid).order_by(DiscoveryJob.created_at.desc()))
    jobs = result.scalars().all()
    
    # In a real app we'd aggregate counts from evidence table, for now return 0
    return [
        JobStatus(
            id=job.id,
            status=job.status,
            started_at=job.started_at,
            completed_at=job.completed_at,
            evidence_count=0,
            asset_count=0,
            error_msg=job.error_msg
        ) for job in jobs
    ]

@router.get("/jobs/{job_id}", response_model=JobStatus)
async def get_job(job_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DiscoveryJob).where(DiscoveryJob.id == job_id))
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    return JobStatus(
        id=job.id,
        status=job.status,
        started_at=job.started_at,
        completed_at=job.completed_at,
        evidence_count=0,
        asset_count=0,
        error_msg=job.error_msg
    )

@router.delete("/jobs/{job_id}", status_code=204)
async def cancel_job(job_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DiscoveryJob).where(DiscoveryJob.id == job_id))
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    if job.status in ["completed", "failed"]:
        raise HTTPException(status_code=400, detail="Cannot cancel a finished job")
        
    job.status = "cancelled"
    await db.commit()
    # Note: Actually revoking a celery task requires celery.control.revoke(task_id, terminate=True)
    # We would need to store the celery task_id on the job model to do that.
    return None

@router.get("/jobs/{job_id}/evidence")
async def get_job_evidence(job_id: UUID, db: AsyncSession = Depends(get_db)):
    # Placeholder for Phase 2.7
    return {"items": [], "total": 0}

@router.get("/jobs/{job_id}/logs")
async def get_job_logs(job_id: UUID, db: AsyncSession = Depends(get_db)):
    # Standard JSON polling for MVP
    result = await db.execute(select(DiscoveryJob).where(DiscoveryJob.id == job_id))
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    # Mocking some logs based on status
    logs = [f"Job {job.status}"]
    if job.status == "queued":
        logs.append("Waiting for available celery worker...")
    elif job.status == "running":
        logs.append("Cloning repository...")
        logs.append("Running tree-sitter scan...")
    elif job.status == "completed":
        logs.append("Scan completed successfully. Evidence extracted.")
        
    return {"job_id": job_id, "logs": logs}
