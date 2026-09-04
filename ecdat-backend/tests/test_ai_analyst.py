"""
Phase 8 (AI Analyst) tests.

Split deliberately: everything that doesn't require an actual Gemini call is
tested for real, against the real DB — context building (make sure no raw
source text leaks into it) and citation verification (the hallucination
guard). The one thing that genuinely needs GEMINI_API_KEY (ask_analyst's
actual model call) is exercised by app/services/ai_analyst.py's own
is_configured() honesty check instead of being mocked into a fake pass.
"""
import uuid

import pytest
import pytest_asyncio

from app.database import AsyncSessionLocal
from app.models.workspace import Workspace
from app.models.job import DiscoveryJob
from app.models.asset import CryptoAsset
from app.models.evidence import EvidenceModel
from app.models.source import Source
from app.services.risk_engine import compute_asset_risk
from app.services.ai_analyst import (
    AnalystResponse,
    build_context,
    verify_citations,
    is_configured,
    ask_analyst,
    resolve_citation_details,
    resolve_scope_label,
)


@pytest_asyncio.fixture
async def workspace_with_findings():
    """A real workspace with a real asset, real risk score, and real evidence
    (including some deliberately raw-looking match text, to prove it never
    reaches build_context's output)."""
    async with AsyncSessionLocal() as session:
        ws = Workspace(clerk_user_id="test_analyst_user", name="Analyst Test Workspace")
        session.add(ws)
        await session.flush()

        asset = CryptoAsset(
            workspace_id=ws.id, algorithm_canonical="RSA:2048", algorithm_family="RSA",
            algorithm_name="RSA", key_size=2048, quantum_vulnerable=True,
        )
        session.add(asset)

        job = DiscoveryJob(workspace_id=ws.id, status="completed")
        session.add(job)
        await session.flush()

        ev = EvidenceModel(
            job_id=job.id, workspace_id=ws.id, source_type="source_code",
            file_path="auth/token.go", line_number=42,
            raw_match="rsa.GenerateKey(rand.Reader, 2048)  // SECRET_KEY=sk_live_should_never_leak",
            context_lines="some surrounding source code that must never reach the LLM",
            detector="treesitter_call", confidence=0.9, raw_metadata={},
        )
        session.add(ev)
        await session.flush()

        from app.models.asset import EvidenceAsset
        session.add(EvidenceAsset(evidence_id=ev.id, asset_id=asset.id))
        await session.commit()

        await compute_asset_risk(session, asset)

        yield ws.id, asset.id, ev.id

    async with AsyncSessionLocal() as session:
        from sqlalchemy import text
        await session.execute(text("DELETE FROM risk_scores WHERE workspace_id = :wid"), {"wid": ws.id})
        await session.execute(text("DELETE FROM evidence_assets WHERE asset_id = :aid"), {"aid": asset.id})
        await session.execute(text("DELETE FROM evidence WHERE workspace_id = :wid"), {"wid": ws.id})
        await session.execute(text("DELETE FROM crypto_assets WHERE workspace_id = :wid"), {"wid": ws.id})
        await session.execute(text("DELETE FROM discovery_jobs WHERE workspace_id = :wid"), {"wid": ws.id})
        await session.execute(text("DELETE FROM workspaces WHERE id = :wid"), {"wid": ws.id})
        await session.commit()


@pytest.mark.asyncio
async def test_build_context_never_leaks_raw_source(workspace_with_findings):
    """The mandatory rule (docs/AGENT_CONTEXT.md): 'LLM must never receive raw
    source code — only canonical asset name + evidence summary + risk score.'"""
    ws_id, asset_id, ev_id = workspace_with_findings
    async with AsyncSessionLocal() as session:
        context = await build_context(session, ws_id)

    dumped = str(context)
    assert "SECRET_KEY" not in dumped, "raw_match text leaked into AI context"
    assert "sk_live_should_never_leak" not in dumped
    assert "surrounding source code" not in dumped, "context_lines text leaked into AI context"

    # But the real, safe stuff should be there.
    assert context["total_assets"] == 1
    asset_payload = context["assets"][0]
    assert asset_payload["algorithm_canonical"] == "RSA:2048"
    # RSA:2048 at default inputs (7y data lifetime, HIGH criticality, 12y
    # workspace threat horizon): Mosca margin=2 -> HIGH, not CRITICAL (that
    # needs X+Y to actually exceed Z) — see test_risk_engine.py's boundary
    # tests for why.
    assert asset_payload["risk"]["composite_risk_level"] == "HIGH"
    assert asset_payload["evidence"][0]["evidence_id"] == str(ev_id)
    assert asset_payload["evidence"][0]["file_path"] == "auth/token.go"
    assert asset_payload["evidence"][0]["line_number"] == 42
    # location metadata is fine; the matched text itself must not be a key at all
    assert "raw_match" not in asset_payload["evidence"][0]
    assert "context_lines" not in asset_payload["evidence"][0]


@pytest.mark.asyncio
async def test_build_context_empty_workspace():
    async with AsyncSessionLocal() as session:
        ws = Workspace(clerk_user_id="test_analyst_empty", name="Empty")
        session.add(ws)
        await session.commit()
        ws_id = ws.id

    async with AsyncSessionLocal() as session:
        context = await build_context(session, ws_id)
    assert context["total_assets"] == 0
    assert context["assets"] == []

    async with AsyncSessionLocal() as session:
        from sqlalchemy import text
        await session.execute(text("DELETE FROM workspaces WHERE id = :wid"), {"wid": ws_id})
        await session.commit()


@pytest.mark.asyncio
async def test_verify_citations_keeps_real_ids_drops_fake_ones(workspace_with_findings):
    ws_id, asset_id, ev_id = workspace_with_findings
    fake_id = str(uuid.uuid4())

    response = AnalystResponse(
        answer="RSA:2048 is your most urgent finding.",
        evidence_citations=[str(ev_id), fake_id, "not-even-a-uuid"],
        asset_citations=[str(asset_id), fake_id],
        confidence=0.9,
    )

    async with AsyncSessionLocal() as session:
        verified = await verify_citations(session, ws_id, response)

    assert verified.evidence_citations == [str(ev_id)]
    assert verified.asset_citations == [str(asset_id)]


@pytest.mark.asyncio
async def test_verify_citations_rejects_cross_tenant_id(workspace_with_findings):
    """A real evidence_id that exists, but belongs to a DIFFERENT workspace,
    must be dropped just as hard as a pure hallucination — otherwise a
    prompt-injected or confused model could leak citations across tenants."""
    ws_id, asset_id, ev_id = workspace_with_findings

    async with AsyncSessionLocal() as session:
        other_ws = Workspace(clerk_user_id="test_analyst_other_tenant", name="Other Tenant")
        session.add(other_ws)
        await session.commit()
        other_ws_id = other_ws.id

    response = AnalystResponse(
        answer="...", evidence_citations=[str(ev_id)], confidence=0.5,
    )
    async with AsyncSessionLocal() as session:
        verified = await verify_citations(session, other_ws_id, response)
    assert verified.evidence_citations == [], "citation from a different workspace was not rejected"

    async with AsyncSessionLocal() as session:
        from sqlalchemy import text
        await session.execute(text("DELETE FROM workspaces WHERE id = :wid"), {"wid": other_ws_id})
        await session.commit()


@pytest.mark.asyncio
async def test_build_context_names_the_project_per_evidence_and_scope(workspace_with_findings):
    """The user explicitly asked: the AI Analyst should be concrete about
    *which project* a finding came from, not just 'somewhere in the
    workspace'. build_context() must attach a real project name to each
    evidence item and a top-level scope label."""
    ws_id, asset_id, ev_id = workspace_with_findings

    async with AsyncSessionLocal() as session:
        src = Source(workspace_id=ws_id, name="Payments Service", source_type="git")
        session.add(src)
        await session.flush()
        await session.execute(
            EvidenceModel.__table__.update().where(EvidenceModel.id == ev_id).values(source_id=src.id)
        )
        await session.commit()
        src_id = src.id

    async with AsyncSessionLocal() as session:
        unscoped = await build_context(session, ws_id)
    assert unscoped["scope"] == "all projects"
    assert unscoped["assets"][0]["evidence"][0]["project"] == "Payments Service"

    async with AsyncSessionLocal() as session:
        scoped = await build_context(session, ws_id, source_id=src_id)
    assert scoped["scope"] == "Payments Service"

    async with AsyncSessionLocal() as session:
        details = await resolve_citation_details(session, ws_id, [str(ev_id)])
        scope_label = await resolve_scope_label(session, ws_id, src_id)
    assert details == [{
        "evidence_id": str(ev_id), "file_path": "auth/token.go", "line_number": 42, "project_name": "Payments Service",
    }]
    assert scope_label == "Payments Service"

    async with AsyncSessionLocal() as session:
        no_scope_label = await resolve_scope_label(session, ws_id, None)
    assert no_scope_label == "All projects"

    async with AsyncSessionLocal() as session:
        from sqlalchemy import text
        await session.execute(text("DELETE FROM sources WHERE id = :sid"), {"sid": src_id})
        await session.commit()


@pytest.mark.asyncio
async def test_build_context_scoped_evidence_never_leaks_another_project(workspace_with_findings):
    """A CryptoAsset is shared/deduplicated across projects — the same
    algorithm found in two repos is ONE asset with evidence from both. A
    question scoped to project A must only ever sample project A's evidence
    for that asset, never cite a file from project B just because they
    happen to share the asset. Caught live: a 'Test'-scoped answer cited a
    file from the unrelated 'Crypto test 2' project."""
    ws_id, asset_id, ev_id = workspace_with_findings
    from sqlalchemy import select
    from app.models.asset import EvidenceAsset

    async with AsyncSessionLocal() as session:
        src_a = Source(workspace_id=ws_id, name="Project A", source_type="git")
        src_b = Source(workspace_id=ws_id, name="Project B", source_type="git")
        session.add_all([src_a, src_b])
        await session.flush()
        # ev_id (the fixture's only evidence row) belongs to Project A.
        await session.execute(
            EvidenceModel.__table__.update().where(EvidenceModel.id == ev_id).values(source_id=src_a.id)
        )
        # A second evidence row on the SAME asset, from Project B.
        job_result = await session.execute(select(EvidenceModel.job_id).where(EvidenceModel.id == ev_id))
        job_id = job_result.scalar_one()
        ev_b = EvidenceModel(
            job_id=job_id, workspace_id=ws_id, source_id=src_b.id, source_type="source_code",
            file_path="other/repo.go", line_number=7, raw_match="irrelevant", context_lines="irrelevant",
            detector="treesitter_call", confidence=0.9, raw_metadata={},
        )
        session.add(ev_b)
        await session.flush()
        session.add(EvidenceAsset(evidence_id=ev_b.id, asset_id=asset_id))
        await session.commit()
        a_id, b_id = src_a.id, src_b.id

    async with AsyncSessionLocal() as session:
        scoped_a = await build_context(session, ws_id, source_id=a_id)
    ev_files = {e["file_path"] for e in scoped_a["assets"][0]["evidence"]}
    assert ev_files == {"auth/token.go"}, "Project A scope must never include Project B's evidence"

    async with AsyncSessionLocal() as session:
        scoped_b = await build_context(session, ws_id, source_id=b_id)
    ev_files = {e["file_path"] for e in scoped_b["assets"][0]["evidence"]}
    assert ev_files == {"other/repo.go"}, "Project B scope must never include Project A's evidence"

    async with AsyncSessionLocal() as session:
        unscoped = await build_context(session, ws_id)
    ev_files = {e["file_path"] for e in unscoped["assets"][0]["evidence"]}
    assert ev_files == {"auth/token.go", "other/repo.go"}, "unscoped should see both"

    async with AsyncSessionLocal() as session:
        from sqlalchemy import text
        await session.execute(text("DELETE FROM evidence_assets WHERE evidence_id = :eid"), {"eid": ev_b.id})
        await session.execute(text("DELETE FROM evidence WHERE id = :eid"), {"eid": ev_b.id})
        await session.execute(text("DELETE FROM sources WHERE id IN (:a, :b)"), {"a": a_id, "b": b_id})
        await session.commit()


@pytest.mark.asyncio
async def test_build_context_excludes_ai_excluded_sources(workspace_with_findings):
    """Phase 8 PDF sec 56-59 data-access control: an asset whose only evidence
    comes from a Source flagged ai_excluded must never reach the AI's context,
    even though it's still a perfectly real asset for every other page."""
    ws_id, asset_id, ev_id = workspace_with_findings

    async with AsyncSessionLocal() as session:
        src = Source(workspace_id=ws_id, name="Sensitive Repo", source_type="git", ai_excluded=True)
        session.add(src)
        await session.flush()
        await session.execute(
            EvidenceModel.__table__.update().where(EvidenceModel.id == ev_id).values(source_id=src.id)
        )
        await session.commit()
        src_id = src.id

    async with AsyncSessionLocal() as session:
        context = await build_context(session, ws_id)
    assert context["total_assets"] == 0, "asset from an ai_excluded source leaked into AI context"
    assert "private" in (context["note"] or "").lower()

    # Sanity: a source_id-scoped query for that same excluded project also
    # comes back empty rather than bypassing the exclusion.
    async with AsyncSessionLocal() as session:
        scoped = await build_context(session, ws_id, source_id=src_id)
    assert scoped["total_assets"] == 0

    async with AsyncSessionLocal() as session:
        from sqlalchemy import text
        await session.execute(text("DELETE FROM sources WHERE id = :sid"), {"sid": src_id})
        await session.commit()


def test_is_configured_reflects_env():
    from app.config import settings
    assert is_configured() == bool(settings.gemini_api_key or settings.groq_api_key)


@pytest.mark.asyncio
async def test_ask_analyst_is_honest_when_unconfigured(monkeypatch, workspace_with_findings):
    """No fake AI response when there's no key — an honest 'not configured'
    message instead, per the project's own no-fake-data rule."""
    from app.config import settings
    monkeypatch.setattr(settings, "gemini_api_key", "")
    monkeypatch.setattr(settings, "groq_api_key", "")

    ws_id, _asset_id, _ev_id = workspace_with_findings
    async with AsyncSessionLocal() as session:
        response = await ask_analyst(session, ws_id, "What should I fix first?")

    assert not is_configured()
    assert "not configured" in response.answer.lower() or "isn't configured" in response.answer.lower()
    assert response.evidence_citations == []
