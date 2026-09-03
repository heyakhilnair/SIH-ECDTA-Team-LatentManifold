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
from app.services.risk_engine import compute_asset_risk
from app.services.ai_analyst import (
    AnalystResponse,
    build_context,
    verify_citations,
    is_configured,
    ask_analyst,
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


def test_is_configured_reflects_env():
    from app.config import settings
    assert is_configured() == bool(settings.gemini_api_key)


@pytest.mark.asyncio
async def test_ask_analyst_is_honest_when_unconfigured(monkeypatch, workspace_with_findings):
    """No fake AI response when there's no key — an honest 'not configured'
    message instead, per the project's own no-fake-data rule."""
    from app.config import settings
    monkeypatch.setattr(settings, "gemini_api_key", "")

    ws_id, _asset_id, _ev_id = workspace_with_findings
    async with AsyncSessionLocal() as session:
        response = await ask_analyst(session, ws_id, "What should I fix first?")

    assert not is_configured()
    assert "not configured" in response.answer.lower() or "isn't configured" in response.answer.lower()
    assert response.evidence_citations == []
