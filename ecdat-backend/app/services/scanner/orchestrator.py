import os
import asyncio
import time
from celery import Celery
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import update
from app.models.job import DiscoveryJob
from app.services.scanner.source_scanner import scan_file
from app.config import settings

redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "ecdat_scanner",
    broker=redis_url,
    backend=redis_url
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# Setup async DB engine for celery tasks to update status
engine = create_async_engine(
    settings.database_url,
    connect_args={"statement_cache_size": 0, "prepared_statement_cache_size": 0},
    pool_pre_ping=True
)
AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

async def _update_db(job_id: str, status: str):
    async with AsyncSessionLocal() as session:
        await session.execute(
            update(DiscoveryJob).where(DiscoveryJob.id == job_id).values(status=status)
        )
        await session.commit()

def update_job_status_sync(job_id: str, status: str):
    print(f"[Orchestrator] Job {job_id} -> {status}")
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    loop.run_until_complete(_update_db(job_id, status))

@celery_app.task(name="run_discovery_job")
def run_discovery_job(job_id: str, workspace_id: str, source_ids: list):
    """
    Main Celery task — orchestrates all scanners.
    """
    update_job_status_sync(job_id, "running")
    
    # Mocking the git clone with a hardcoded Go file that has crypto
    mock_go_code = '''
    package main
    import "crypto/rsa"
    func main() {
        key, _ := rsa.GenerateKey(rand.Reader, 2048)
    }
    '''
    findings = scan_file("mock.go", mock_go_code, "go")
    print(f"[Scanner] Found {len(findings)} crypto calls: {findings}")
    
    time.sleep(3) # Simulate git clone and deep parsing network latency
    
    update_job_status_sync(job_id, "completed")
    return {"job_id": job_id, "status": "completed", "evidence_count": len(findings)}
