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


async def _job_status(job_id: str) -> str | None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(DiscoveryJob.status).where(DiscoveryJob.id == job_id))
        return result.scalar_one_or_none()


async def _append_job_log(job_id: str, message: str):
    """
    Appends one real, timestamped step to the job's log trail (stored in
    DiscoveryJob.metadata_["logs"]). This is what GET /jobs/{id}/logs now
    reads — it used to fabricate step names from the status enum; see
    docs/BACKEND_AUDIT_PHASE0-6.md #5. Single writer per job (this
    orchestrator task), so a plain read-modify-write is safe.
    """
    print(f"[Orchestrator] {message}")
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(DiscoveryJob.metadata_).where(DiscoveryJob.id == job_id))
        current = result.scalar_one_or_none() or {}
        logs = list(current.get("logs", []))
        logs.append({
            "ts": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "message": message,
        })
        await session.execute(
            update(DiscoveryJob).where(DiscoveryJob.id == job_id).values(metadata_={**current, "logs": logs})
        )
        await session.commit()

async def _persist_evidence(job_id: str, workspace_id: str, findings: list, source_id: str = None):
    if not findings: return
    async with AsyncSessionLocal() as session:
        for finding in findings:
            ev = EvidenceModel(
                job_id=job_id,
                workspace_id=workspace_id,
                source_id=source_id,
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
        if '.git' in root or 'node_modules' in root or 'venv' in root or 'target' in root:
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
        semgrep_findings = convert_semgrep_to_evidence(semgrep_out, target_dir=workspace_dir)
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

async def run_discovery_job(job_id: str, workspace_id: str, scan_targets: list):
    """
    Main Orchestrator — executes natively via FastAPI BackgroundTasks.

    scan_targets: list of {"source_id": str, "url": str} — the source_id is
    what lets evidence.source_id attribute each finding back to the project
    it came from (a job can scan several sources in one run; job_id alone
    can't answer "which project is this finding from").
    """
    from app.services.normalizer.asset_resolver import resolve_evidence_to_asset
    from app.services.cbom_generator import generate_cyclonedx_cbom
    from app.models.evidence import EvidenceModel
    from app.models.asset import CryptoAsset

    await _append_job_log(job_id, f"Job started for {len(scan_targets)} source(s)")
    await _update_job_status(job_id, "running")

    total_findings = 0
    all_errors = []

    for target in scan_targets:
        url, source_id = target["url"], target["source_id"]
        # ponytail: cooperative cancellation only checked between sources, not
        # mid-clone/mid-scan of a single repo — killing an in-flight git clone
        # or semgrep subprocess needs a process handle + terminate(), add if a
        # single-source scan taking minutes to cancel becomes a real problem.
        if await _job_status(job_id) == "cancelled":
            await _append_job_log(job_id, "Job was cancelled — stopping before next source")
            return {"job_id": job_id, "status": "cancelled"}

        workspace_dir = None
        try:
            await _append_job_log(job_id, f"Cloning and scanning {url} (tree-sitter, semgrep, dependency, certificate scanners)")
            workspace_dir = create_scan_workspace()

            # Push the blocking scans to a background thread
            repo_findings = await asyncio.to_thread(sync_scan_repo, url, workspace_dir)

            await _append_job_log(job_id, f"Found {len(repo_findings)} findings in {url}, persisting evidence")
            await _persist_evidence(job_id, workspace_id, repo_findings, source_id=source_id)
            total_findings += len(repo_findings)

        except Exception as e:
            err_msg = f"Failed to process {url}: {e}"
            await _append_job_log(job_id, f"ERROR: {err_msg}")
            all_errors.append(err_msg)
        finally:
            if workspace_dir:
                cleanup_scan_workspace(workspace_dir)

    if await _job_status(job_id) == "cancelled":
        await _append_job_log(job_id, "Job was cancelled — skipping normalization/risk/recommendations/CBOM")
        return {"job_id": job_id, "status": "cancelled"}

    pipeline_stage_failed = False
    if total_findings > 0:
        # This whole stage used to run with no try/except: a schema mismatch
        # or any other exception here silently killed the background task —
        # the job just stayed "running" forever with no error surfaced. That's
        # exactly how the risk_scores schema drift (BACKEND_AUDIT_PHASE0-6.md)
        # went unnoticed: it crashed here on every single job, every time.
        try:
            await _append_job_log(job_id, f"Normalizing {total_findings} findings into canonical crypto assets")
            async with AsyncSessionLocal() as session:
                # 1. Fetch all newly created evidence for this job
                evidence_query = select(EvidenceModel).where(EvidenceModel.job_id == job_id)
                evidence_result = await session.execute(evidence_query)
                evidence_rows = evidence_result.scalars().all()

                # 2. Normalize and resolve each to CryptoAssets
                assets_to_risk = set()
                for evidence in evidence_rows:
                    asset = await resolve_evidence_to_asset(session, evidence)
                    if asset is not None:  # None = couldn't identify a specific algorithm, no asset created
                        assets_to_risk.add(asset)

                # 3. Compute Risk for all discovered assets
                await _append_job_log(job_id, f"Computing Mosca risk scores for {len(assets_to_risk)} assets")
                from app.services.risk_engine import compute_asset_risk
                for asset in assets_to_risk:
                    await compute_asset_risk(session, asset)

                # 4. Generate PQC recommendations for discovered assets
                await _append_job_log(job_id, f"Generating PQC recommendations for {len(assets_to_risk)} assets")
                from app.services.recommendation_engine import generate_recommendation
                for asset in assets_to_risk:
                    await generate_recommendation(session, asset)

                # 5. Generate CBOM for the entire workspace
                await _append_job_log(job_id, "Generating CycloneDX CBOM for workspace")
                assets_query = select(CryptoAsset).where(CryptoAsset.workspace_id == workspace_id)
                assets_result = await session.execute(assets_query)
                assets = list(assets_result.scalars().all())

                if assets:
                    await generate_cyclonedx_cbom(session, assets, uuid.UUID(workspace_id), uuid.UUID(job_id))
        except Exception as e:
            err_msg = f"Normalization/risk/recommendation/CBOM stage failed: {e}"
            await _append_job_log(job_id, f"ERROR: {err_msg}")
            all_errors.append(err_msg)
            pipeline_stage_failed = True

    # total_findings == 0 with errors: every source failed to scan.
    # pipeline_stage_failed: evidence was found but never became assets/risk/CBOM.
    # Either way the job produced no usable output — mark it failed, not completed.
    if pipeline_stage_failed or (all_errors and total_findings == 0):
        await _append_job_log(job_id, f"Job failed: {'; '.join(all_errors)}")
        await _update_job_status(job_id, "failed", error_msg="; ".join(all_errors))
        return {"job_id": job_id, "status": "failed", "errors": all_errors}
    else:
        await _append_job_log(job_id, f"Job completed: {total_findings} findings" + (f" (with {len(all_errors)} source error(s))" if all_errors else ""))
        await _update_job_status(job_id, "completed", error_msg="; ".join(all_errors) if all_errors else None)
        return {"job_id": job_id, "status": "completed", "evidence_count": total_findings}
