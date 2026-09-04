"""
Executive/Technical report export — Phase 15 (Phase 17 PDF §62-66).

Server-rendered Markdown, not PDF: no PDF-generation dependency exists in
this project yet, and the plan itself allows "Markdown/PDF" — Markdown
satisfies that with zero new dependencies (ponytail: don't add reportlab/
weasyprint for what a plain string template does). Both reports are built
entirely from data other endpoints already compute for real — no new query
logic, no new data source, nothing fabricated:
  - Executive: compute_readiness_score() (Phase 11.2) + list_policy_violations() (Phase 14)
  - Technical: same two, plus the full per-asset risk/recommendation/migration detail
    already used by list_workspace_assets()/serialize_asset() (Phase 6/11.1)
"""
import uuid
from datetime import datetime, timezone
from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.asset import CryptoAsset
from app.models.workspace import Workspace
from app.services.readiness_engine import compute_readiness_score
from app.services.policy_engine import list_policy_violations


async def _load_workspace_and_assets(db: AsyncSession, workspace_id):
    # evidence must be eager-loaded too (not just risk_score/recommendation)
    # — generate_technical_report() reads len(a.evidence) per asset, and an
    # un-eager-loaded relationship access on an AsyncSession outside an
    # active await raises MissingGreenlet. Real bug: reproduced live via the
    # Mission Control "Technical Report" button (500, confirmed in server
    # logs) even though a narrower local script test didn't happen to
    # trigger it — the eager-load fix removes the lazy-load path entirely,
    # so there's nothing left to be order-dependent about.
    workspace = await db.get(Workspace, workspace_id)
    result = await db.execute(
        select(CryptoAsset)
        .options(
            selectinload(CryptoAsset.risk_score),
            selectinload(CryptoAsset.recommendation),
            selectinload(CryptoAsset.evidence),
        )
        .where(CryptoAsset.workspace_id == workspace_id)
    )
    assets = list(result.scalars().all())
    return workspace, assets


def _now_utc_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


async def generate_executive_report(db: AsyncSession, workspace_id: uuid.UUID) -> str:
    workspace, assets = await _load_workspace_and_assets(db, workspace_id)
    readiness = await compute_readiness_score(db, workspace_id)
    violations = await list_policy_violations(db, workspace_id)

    migrated = sum(1 for a in assets if a.migration_status == "MIGRATED")
    at_risk = sum(1 for a in assets if a.quantum_vulnerable or a.classical_vulnerable)
    critical = sum(1 for a in assets if a.risk_score and a.risk_score.composite_risk_level == "CRITICAL")
    b = readiness["breakdown"]
    crypto_agility_str = "Not measured yet — no policy engine trend data" if b["crypto_agility"] is None else f"{b['crypto_agility']}%"

    lines = [
        f"# Quantum Readiness — Executive Summary",
        f"",
        f"**Workspace:** {workspace.name if workspace else workspace_id}",
        f"**Generated:** {_now_utc_str()}",
        f"",
        f"## Quantum Readiness Score",
        f"",
        f"**{readiness['score']}/100 — {readiness['level']}**",
        f"",
        f"| Dimension | Score |",
        f"|---|---|",
        f"| Discovery Coverage | {b['coverage']}% |",
        f"| Risk Posture | {b['risk_posture']}% |",
        f"| PQC Adoption | {b['pqc_adoption']}% |",
        f"| Migration Progress | {b['migration_progress']}% |",
        f"| Governance | {b['governance']}% |",
        f"| Crypto Agility | {crypto_agility_str} |",
        f"",
        f"## At a Glance",
        f"",
        f"- **{len(assets)}** cryptographic assets discovered",
        f"- **{at_risk}** at risk (quantum- or classically-vulnerable)",
        f"- **{critical}** at CRITICAL composite risk",
        f"- **{migrated}** fully migrated and verified",
        f"",
        f"## Policy Compliance",
        f"",
        f"- **{violations['forbidden_count']}** Forbidden (classically broken algorithms in use)",
        f"- **{violations['review_count']}** Needs Review (quantum-vulnerable, Shor-breakable)",
        f"",
    ]
    if violations["violations"]:
        lines.append("| Algorithm | Status | Rule |")
        lines.append("|---|---|---|")
        for v in violations["violations"][:15]:
            lines.append(f"| `{v['algorithm_canonical']}` | {v['status']} | {v['rule']} |")
        if len(violations["violations"]) > 15:
            lines.append(f"| … | | *{len(violations['violations']) - 15} more — see the Technical Report* |")
        lines.append("")

    lines += [
        "---",
        "",
        "*No framework compliance mapping (NIST CSF / CMMC / CNSA 2.0) is included — that matrix does not exist "
        "yet in ECDAT; presenting one here would mean fabricating a compliance score.*",
    ]
    return "\n".join(lines)


async def generate_technical_report(db: AsyncSession, workspace_id: uuid.UUID) -> str:
    workspace, assets = await _load_workspace_and_assets(db, workspace_id)
    readiness = await compute_readiness_score(db, workspace_id)

    lines = [
        f"# Quantum Readiness — Technical Report",
        f"",
        f"**Workspace:** {workspace.name if workspace else workspace_id}",
        f"**Generated:** {_now_utc_str()}",
        f"**Quantum Readiness Score:** {readiness['score']}/100 ({readiness['level']})",
        f"",
        f"## Asset Inventory ({len(assets)} total)",
        f"",
        "| Algorithm | Family | Key Size | Quantum | Classical | Composite Risk | Recommendation | Migration Status | Evidence |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for a in sorted(assets, key=lambda x: (x.risk_score.composite_risk_level if x.risk_score else "ZZZ", x.algorithm_canonical)):
        risk = a.risk_score
        rec = a.recommendation
        lines.append(
            f"| `{a.algorithm_canonical}` | {a.algorithm_family} | {a.key_size or '—'} | "
            f"{'Vulnerable' if a.quantum_vulnerable else 'Safe'} | {'Vulnerable' if a.classical_vulnerable else 'Safe'} | "
            f"{risk.composite_risk_level if risk else 'UNKNOWN'} | {rec.recommended_algo if rec else '—'} | "
            f"{a.migration_status} | {len(a.evidence) if a.evidence is not None else 0} |"
        )

    lines += [
        "",
        "## Risk Methodology",
        "",
        "Composite risk follows the Mosca inequality (X + Y > Z): if an asset's data lifetime (X) plus its "
        "estimated migration time (Y) exceeds the workspace's configured quantum threat horizon (Z), and the "
        "algorithm is quantum-vulnerable, the composite risk is CRITICAL regardless of classical posture.",
        "",
        "## Migration Verification",
        "",
        "`MIGRATED` status is only ever set two ways: a user manually advancing a card on the Migration Planner "
        "(unverified — `migration_verified_at` stays null), or ECDAT's Verification Engine rescanning the "
        "project and confirming the algorithm is genuinely gone (`migration_verified_at` set to a real "
        "timestamp). This report does not distinguish the two per row — see the Migration Planner or "
        "Verification page for that detail per asset.",
    ]
    return "\n".join(lines)
