"""
ECDAT AI Analyst — Phase 8 (MVP cut, per user direction 2026-09-03)

Architecture follows the "Evidence-First AI" principle from Phase 8 PDF §21 and
the hallucination-control pipeline from Phase 14 PDF §49-54:

    DETERMINISTIC DATA (real DB) -> CONTEXT -> LLM -> STRUCTURED OUTPUT -> VERIFICATION -> RESPONSE

Not:
    Question -> LLM -> Trust Everything

Mandatory-rule compliance (docs/AGENT_CONTEXT.md, docs/AGENT_HANDOFF.md):
  - "AI is evidence-first. AI never invents cryptographic assets." -> every
    citation is verified against the real DB after the model responds
    (verify_citations below), matching Phase 8 PDF §33 "AI Verification" and
    Phase 14 PDF §52 "Hallucination Control".
  - "LLM must never receive raw source code — only canonical asset name +
    evidence summary + risk score." -> build_context() below sends algorithm
    names, risk levels, recommendation text and evidence *locations*
    (file/line/detector/confidence), never raw_match/context_lines (the
    actual matched source text).

MVP scope (per user direction): single-shot Q&A, no tool-calling loop, no
embeddings/RAG index. Phase 14 PDF §38-39 argues tool-calling beats naive
context-stuffing for structured data — the compromise here is that
build_context() already *is* a structured, filtered, ranked query (top-N by
composite risk) rather than a dump of the whole workspace, which gets most of
that benefit without the added complexity of a full tool-use loop. If the
workspace grows large enough that top-N-by-risk stops being sufficient
context, that tool-calling loop is the upgrade path.
"""
import uuid
from typing import List, Optional

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.asset import CryptoAsset
from app.models.evidence import EvidenceModel

MAX_ASSETS_IN_CONTEXT = 15
MAX_EVIDENCE_PER_ASSET = 3

PRIORITY_ORDER = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "SAFE": 4, "UNKNOWN": 5}


class AnalystResponse(BaseModel):
    """Structured output schema — enforced by Gemini's response_schema (Phase 8 PDF
    §29 "Structured AI Output", Phase 14 PDF §50) and re-validated server-side."""
    answer: str = Field(description="Plain-English answer to the user's question.")
    evidence_citations: List[str] = Field(
        default_factory=list,
        description="evidence_id UUIDs (from WORKSPACE DATA) that support specific claims in the answer.",
    )
    asset_citations: List[str] = Field(
        default_factory=list,
        description="asset_id UUIDs (from WORKSPACE DATA) referenced by the answer.",
    )
    confidence: float = Field(ge=0.0, le=1.0, description="0-1: how directly the WORKSPACE DATA supports this answer.")
    unknowns: List[str] = Field(
        default_factory=list,
        description="Things the question asked about that WORKSPACE DATA does not cover.",
    )


def is_configured() -> bool:
    return bool(settings.gemini_api_key)


async def build_context(db: AsyncSession, workspace_id: uuid.UUID) -> dict:
    """
    Real data only. No raw_match/context_lines (the actual matched source
    text) ever leaves this function — see module docstring.
    """
    query = (
        select(CryptoAsset)
        .options(
            selectinload(CryptoAsset.risk_score),
            selectinload(CryptoAsset.recommendation),
            selectinload(CryptoAsset.evidence),
        )
        .where(CryptoAsset.workspace_id == workspace_id)
    )
    result = await db.execute(query)
    assets = list(result.scalars().all())
    assets.sort(key=lambda a: PRIORITY_ORDER.get(
        a.risk_score.composite_risk_level if a.risk_score else "UNKNOWN", 5
    ))

    asset_payloads = []
    for asset in assets[:MAX_ASSETS_IN_CONTEXT]:
        risk = asset.risk_score
        rec = getattr(asset, "recommendation", None)
        evidence_list = list(asset.evidence or [])[:MAX_EVIDENCE_PER_ASSET]

        asset_payloads.append({
            "asset_id": str(asset.id),
            "algorithm_canonical": asset.algorithm_canonical,
            "algorithm_family": asset.algorithm_family,
            "key_size": asset.key_size,
            "quantum_vulnerable": asset.quantum_vulnerable,
            "classical_vulnerable": asset.classical_vulnerable,
            "vulnerability_notes": asset.vulnerability_notes,
            "risk": {
                "composite_risk_level": risk.composite_risk_level,
                "quantum_risk_level": risk.quantum_risk_level,
                "classical_risk_level": risk.classical_risk_level,
                "quantum_reason": risk.quantum_reason,
                "classical_reason": risk.classical_reason,
                "mosca_threshold_exceeded": risk.mosca_threshold_exceeded,
                "data_lifetime_years": risk.data_lifetime_years,
                "migration_time_years": risk.migration_time_years,
            } if risk else None,
            "recommendation": {
                "recommended_algo": rec.recommended_algo,
                "hybrid_path": rec.hybrid_path,
                "nist_standard": rec.nist_standard,
                "migration_complexity": rec.migration_complexity,
                "explanation": (rec.reasoning or {}).get("explanation") if rec.reasoning else None,
            } if rec else None,
            "evidence": [
                {
                    "evidence_id": str(ev.id),
                    "file_path": ev.file_path,
                    "line_number": ev.line_number,
                    "detector": ev.detector,
                    "confidence": ev.confidence,
                }
                for ev in evidence_list
            ],
            "evidence_count_total": len(asset.evidence or []),
        })

    return {
        "workspace_id": str(workspace_id),
        "total_assets": len(assets),
        "assets": asset_payloads,
        "note": f"Showing top {min(len(assets), MAX_ASSETS_IN_CONTEXT)} of {len(assets)} assets by composite risk priority." if len(assets) > MAX_ASSETS_IN_CONTEXT else None,
    }


SYSTEM_PROMPT_TEMPLATE = """You are ECDAT's cryptographic analyst — you help engineers understand real cryptographic findings from an automated scan of their codebase.

RULES — never violate these (this is a security tool; a wrong answer is worse than no answer):
1. Answer ONLY using the WORKSPACE DATA below. Never invent an algorithm, asset, file, or risk level that isn't in it.
2. Every specific claim about an asset must be traceable to that asset's asset_id or evidence_id in WORKSPACE DATA — list those ids in evidence_citations / asset_citations.
3. If the question asks about something WORKSPACE DATA doesn't cover (e.g. an algorithm never found, or a question needing source code you don't have), say so plainly in `answer` and list it in `unknowns`. Do not guess to fill the gap.
4. You do not have access to raw source code — only canonical algorithm names, risk scores, and evidence locations (file/line). Never imply otherwise.
5. Set `confidence` honestly: 1.0 only when the answer is a direct, unambiguous read of WORKSPACE DATA; lower it when you're synthesizing/prioritizing across multiple findings.
6. Recommendations in WORKSPACE DATA are ECDAT's own deterministic engine output (not yours) — you may explain and contextualize them, but do not override or contradict their risk levels or NIST citations.

WORKSPACE DATA:
{context_json}
"""


async def verify_citations(db: AsyncSession, workspace_id: uuid.UUID, response: AnalystResponse) -> AnalystResponse:
    """
    Phase 8 PDF §33 "AI Verification" / Phase 14 PDF §52 "Hallucination Control":
    a citation is only trustworthy once checked against the real database, not
    just because the model formatted it correctly. Strips any citation that
    doesn't resolve to a real row in *this* workspace (typos, hallucinated
    ids, or a cross-tenant id are all handled identically — none should ever
    be trusted).
    """
    def _parse_uuids(raw: List[str]) -> List[uuid.UUID]:
        # One malformed id must not poison the whole batch — a single-item
        # try/except, not one around the whole list comprehension (that bug
        # dropped every valid citation whenever the model included even one
        # unparsable one, caught by this module's own tests).
        parsed = []
        for c in raw:
            try:
                parsed.append(uuid.UUID(c))
            except (ValueError, AttributeError, TypeError):
                continue
        return parsed

    valid_evidence_ids: set[str] = set()
    ids = _parse_uuids(response.evidence_citations)
    if ids:
        result = await db.execute(
            select(EvidenceModel.id).where(
                EvidenceModel.id.in_(ids), EvidenceModel.workspace_id == workspace_id
            )
        )
        valid_evidence_ids = {str(r) for r in result.scalars().all()}

    valid_asset_ids: set[str] = set()
    ids = _parse_uuids(response.asset_citations)
    if ids:
        result = await db.execute(
            select(CryptoAsset.id).where(
                CryptoAsset.id.in_(ids), CryptoAsset.workspace_id == workspace_id
            )
        )
        valid_asset_ids = {str(r) for r in result.scalars().all()}

    dropped = (
        [c for c in response.evidence_citations if c not in valid_evidence_ids]
        + [c for c in response.asset_citations if c not in valid_asset_ids]
    )
    if dropped:
        print(f"[AIAnalyst] Dropped {len(dropped)} unverifiable citation(s) for workspace {workspace_id}: {dropped}")

    response.evidence_citations = [c for c in response.evidence_citations if c in valid_evidence_ids]
    response.asset_citations = [c for c in response.asset_citations if c in valid_asset_ids]
    return response


async def ask_analyst(db: AsyncSession, workspace_id: uuid.UUID, question: str) -> AnalystResponse:
    if not is_configured():
        return AnalystResponse(
            answer="AI Analyst isn't configured yet — no GEMINI_API_KEY is set on the backend. Ask your admin to add one to ecdat-backend/.env.",
            confidence=1.0,
            unknowns=["AI Analyst configuration"],
        )

    import json
    from google import genai
    from google.genai import types

    context = await build_context(db, workspace_id)

    if context["total_assets"] == 0:
        return AnalystResponse(
            answer="I don't have any evidence for this workspace yet — no discovery scan has completed. Connect a source and run a scan first, then ask again.",
            confidence=1.0,
            unknowns=["no scan data"],
        )

    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(context_json=json.dumps(context, indent=2))

    client = genai.Client(api_key=settings.gemini_api_key)
    try:
        result = await client.aio.models.generate_content(
            model="gemini-2.0-flash",
            contents=question,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                response_schema=AnalystResponse,
                temperature=0.2,  # low: this is an analysis tool, not a creative one
            ),
        )
    except Exception as e:
        return AnalystResponse(
            answer=f"AI Analyst request failed: {e}",
            confidence=0.0,
            unknowns=["AI request failed"],
        )

    try:
        response = AnalystResponse.model_validate_json(result.text)
    except Exception as e:
        return AnalystResponse(
            answer=f"AI Analyst returned a response that didn't match the expected schema and was rejected rather than shown as-is: {e}",
            confidence=0.0,
            unknowns=["malformed AI response"],
        )

    return await verify_citations(db, workspace_id, response)
