import os
import asyncio
import uuid
import datetime
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import update, select
from app.models.job import DiscoveryJob
from app.models.evidence import EvidenceModel
from app.config import settings

# Scanners
from app.services.scanner.source_scanner import scan_file, detect_language
from app.services.scanner.semgrep_scanner import run_semgrep, convert_semgrep_to_evidence
from app.services.scanner.dependency_scanner import find_and_scan_manifests
from app.services.scanner.certificate_scanner import find_and_scan_certificates
from app.services.scanner.git_cloner import clone_repo, create_scan_workspace, cleanup_scan_workspace

from app.database import AsyncSessionLocal

async def _update_job_status(job_id: str, status: str, evidence_count: int = None, error_msg: str = None):
    async with AsyncSessionLocal() as session:
        update_data = {"status": status}
        if status == "running":
            update_data["started_at"] = datetime.datetime.now(datetime.timezone.utc)
        elif status in ["completed", "failed"]:
            update_data["completed_at"] = datetime.datetime.now(datetime.timezone.utc)
        
        if error_msg is not None:
            update_data["error_msg"] = error_msg
            
        await session.execute(update(DiscoveryJob).where(DiscoveryJob.id == job_id).values(**update_data))
        await session.commit()

async def _persist_evidence(job_id: str, workspace_id: str, findings: list):
    if not findings: return
    async with AsyncSessionLocal() as session:
        for finding in findings:
            ev = EvidenceModel(
                job_id=job_id,
                workspace_id=workspace_id,
                source_type=finding.source_type,
                file_path=finding.file_path,
                line_number=finding.line_number,
                raw_match=finding.raw_match,
                context_lines=finding.context_lines,
                detector=finding.detector,
                confidence=finding.confidence,
                raw_metadata=finding.raw_metadata
            )
            session.add(ev)
        await session.commit()

def sync_scan_repo(url: str, workspace_dir: str):
    """
    Synchronous wrapper for all blocking IO/CPU-bound scanning operations.
    Runs completely in a threadpool so it doesn't block the async event loop.
    """
    repo_findings = []
    
    # Clone Repo
    clone_repo(url, workspace_dir)
    
    # 1. Tree-sitter Source Scanning
    for root, _, files in os.walk(workspace_dir):
        if '.git' in root or 'node_modules' in root or 'venv' in root:
            continue
        for file in files:
            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, workspace_dir)
            lang = detect_language(file_path)
            if lang:
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    src_findings = scan_file(rel_path, content, lang)
                    repo_findings.extend(src_findings)
                except Exception as e:
                    print(f"[Orchestrator] Tree-sitter failed on {file_path}: {e}")
                    
    # 2. Semgrep Scanning
    try:
        semgrep_out = run_semgrep(workspace_dir)
        semgrep_findings = convert_semgrep_to_evidence(semgrep_out)
        repo_findings.extend(semgrep_findings)
    except Exception as e:
        print(f"[Orchestrator] Semgrep failed: {e}")
        
    # 3. Dependency Scanning
    try:
        dep_findings = find_and_scan_manifests(workspace_dir)
        repo_findings.extend(dep_findings)
    except Exception as e:
        print(f"[Orchestrator] Dependency Scan failed: {e}")
    
    # 4. Certificate Scanning
    try:
        cert_findings = find_and_scan_certificates(workspace_dir)
        repo_findings.extend(cert_findings)
    except Exception as e:
        print(f"[Orchestrator] Cert Scan failed: {e}")
        
    return repo_findings

async def run_discovery_job(job_id: str, workspace_id: str, source_urls: list):
    """
    Main Orchestrator — executes natively via FastAPI BackgroundTasks.
    """
    from app.services.normalizer.asset_resolver import resolve_evidence_to_asset
    from app.services.cbom_generator import generate_cyclonedx_cbom
    from app.models.evidence import EvidenceModel
    from app.models.asset import CryptoAsset
    
    print(f"[Orchestrator] Starting background job {job_id} for workspace {workspace_id}")
    await _update_job_status(job_id, "running")
    
    total_findings = 0
    all_errors = []
    
    for url in source_urls:
        workspace_dir = None
        try:
            print(f"[Orchestrator] Processing source: {url}")
            workspace_dir = create_scan_workspace()
            
            # Push the blocking scans to a background thread
            repo_findings = await asyncio.to_thread(sync_scan_repo, url, workspace_dir)
            
            print(f"[Orchestrator] Persisting {len(repo_findings)} findings for {url}")
            await _persist_evidence(job_id, workspace_id, repo_findings)
            total_findings += len(repo_findings)
            
        except Exception as e:
            err_msg = f"Failed to process {url}: {e}"
            print(f"[Orchestrator] {err_msg}")
            all_errors.append(err_msg)
        finally:
            if workspace_dir:
                cleanup_scan_workspace(workspace_dir)
                
    if total_findings > 0:
        print(f"[Orchestrator] Normalizing {total_findings} findings into canonical CryptoAssets...")
        async with AsyncSessionLocal() as session:
            # 1. Fetch all newly created evidence for this job
            evidence_query = select(EvidenceModel).where(EvidenceModel.job_id == job_id)
            evidence_result = await session.execute(evidence_query)
            evidence_rows = evidence_result.scalars().all()
            
            # 2. Normalize and resolve each to CryptoAssets
            assets_to_risk = set()
            for evidence in evidence_rows:
                asset = await resolve_evidence_to_asset(session, evidence)
                assets_to_risk.add(asset)
                
            # 3. Compute Risk for all discovered assets
            print(f"[Orchestrator] Computing risk for {len(assets_to_risk)} assets...")
            from app.services.risk_engine import compute_asset_risk
            for asset in assets_to_risk:
                await compute_asset_risk(session, asset)
                
            # 4. Generate CBOM for the entire workspace
            print(f"[Orchestrator] Generating CBOM for workspace...")
            assets_query = select(CryptoAsset).where(CryptoAsset.workspace_id == workspace_id)
            assets_result = await session.execute(assets_query)
            assets = list(assets_result.scalars().all())
            
            if assets:
                await generate_cyclonedx_cbom(session, assets, uuid.UUID(workspace_id), uuid.UUID(job_id))
                
    if all_errors and total_findings == 0:
        await _update_job_status(job_id, "failed", error_msg="; ".join(all_errors))
        return {"job_id": job_id, "status": "failed", "errors": all_errors}
    else:
        await _update_job_status(job_id, "completed", error_msg="; ".join(all_errors) if all_errors else None)
        return {"job_id": job_id, "status": "completed", "evidence_count": total_findings}
