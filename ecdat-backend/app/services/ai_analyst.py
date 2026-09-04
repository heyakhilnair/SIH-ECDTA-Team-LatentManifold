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

Data-access control (Phase 8 PDF §56-59 "Sensitive Code" / "Data Classification
-> AI Routing Policy"): any Source flagged ai_excluded=True is fully excluded
from build_context() — an asset is only visible to the model if at least one
of its evidence rows comes from a non-excluded source. This is the "restrict
what the AI can see" control, per-project, not a blanket on/off switch.

Provider: Gemini primary, Groq automatic fallback (both via the user's own
keys). Either alone is enough to enable the feature; if Gemini errors
(rate limit, outage, ...) the same context/prompt is retried on Groq before
giving up.

MVP scope (per user direction): single-shot Q&A, no tool-calling loop, no
embeddings/RAG index. Phase 14 PDF §38-39 argues tool-calling beats naive
context-stuffing for structured data — the compromise here is that
build_context() already *is* a structured, filtered, ranked query (top-N by
composite risk) rather than a dump of the whole workspace, which gets most of
that benefit without the added complexity of a full tool-use loop. If the
workspace grows large enough that top-N-by-risk stops being sufficient
context, that tool-calling loop is the upgrade path.
"""
import json
import uuid
from typing import List, Optional

from pydantic import BaseModel, Field
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.asset import CryptoAsset, EvidenceAsset
from app.models.evidence import EvidenceModel
from app.models.source import Source

MAX_ASSETS_IN_CONTEXT = 15
MAX_EVIDENCE_PER_ASSET = 3

PRIORITY_ORDER = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "SAFE": 4, "UNKNOWN": 5}

GEMINI_MODEL = "gemini-pro-latest"  # Google's rolling alias for its current best general-purpose model
GROQ_MODEL = "openai/gpt-oss-120b"  # strongest general-purpose text model on Groq at time of writing


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
    return bool(settings.gemini_api_key or settings.groq_api_key)


async def _ai_excluded_asset_filter(db: AsyncSession, workspace_id: uuid.UUID) -> Optional[set]:
    """
    Returns the set of asset ids that ARE allowed into AI context, or None if
    no source in this workspace is ai_excluded (i.e. no filtering needed — the
    common case, kept cheap). An asset is allowed if at least one of its
    evidence rows comes from a source that is NOT ai_excluded (or has no
    source_id at all — legacy/unattributed evidence isn't opted out of
    anything, exclusion is opt-in per source).
    """
    excluded_result = await db.execute(
        select(Source.id).where(Source.workspace_id == workspace_id, Source.ai_excluded.is_(True))
    )
    excluded_ids = set(excluded_result.scalars().all())
    if not excluded_ids:
        return None

    allowed_result = await db.execute(
        select(EvidenceAsset.asset_id)
        .join(EvidenceModel, EvidenceModel.id == EvidenceAsset.evidence_id)
        .where(
            EvidenceModel.workspace_id == workspace_id,
            or_(EvidenceModel.source_id.is_(None), EvidenceModel.source_id.notin_(excluded_ids)),
        )
        .distinct()
    )
    return set(allowed_result.scalars().all())


async def build_context(db: AsyncSession, workspace_id: uuid.UUID, source_id: Optional[uuid.UUID] = None) -> dict:
    """
    Real data only. No raw_match/context_lines (the actual matched source
    text) ever leaves this function — see module docstring. Respects
    per-source ai_excluded flags and optional project (source_id) scoping.
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
    if source_id:
        matching_asset_ids = (
            select(EvidenceAsset.asset_id)
            .join(EvidenceModel, EvidenceModel.id == EvidenceAsset.evidence_id)
            .where(EvidenceModel.source_id == source_id)
        )
        query = query.where(CryptoAsset.id.in_(matching_asset_ids))

    result = await db.execute(query)
    assets = list(result.scalars().all())

    # Small id->name lookup, once, so every evidence item below can say which
    # project it came from — the user explicitly asked the AI Analyst to be
    # concrete about *which project* a finding is from, not just "somewhere
    # in the workspace".
    sources_result = await db.execute(select(Source.id, Source.name).where(Source.workspace_id == workspace_id))
    source_names = {str(sid): name for sid, name in sources_result.all()}
    scope_label = (
        source_names.get(str(source_id), "an unrecognized project") if source_id else "all projects"
    )

    allowed_ids = await _ai_excluded_asset_filter(db, workspace_id)
    excluded_count = 0
    if allowed_ids is not None:
        before = len(assets)
        assets = [a for a in assets if a.id in allowed_ids]
        excluded_count = before - len(assets)

    assets.sort(key=lambda a: PRIORITY_ORDER.get(
        a.risk_score.composite_risk_level if a.risk_score else "UNKNOWN", 5
    ))

    asset_payloads = []
    for asset in assets[:MAX_ASSETS_IN_CONTEXT]:
        risk = asset.risk_score
        rec = getattr(asset, "recommendation", None)
        # An asset is shared/deduplicated across projects (the same
        # algorithm found in two repos is one CryptoAsset with evidence from
        # both) — when the question is scoped to one project, only that
        # project's evidence should ever be sampled, or a "Test"-scoped
        # answer can end up citing a file from a completely different
        # project just because it shares this asset. Unscoped, fall back to
        # most-recent-first: an asset accumulates evidence across every scan
        # over its lifetime (append-only, never pruned), so the join table's
        # own order skews toward the oldest rows otherwise.
        asset_evidence = list(asset.evidence or [])
        if source_id:
            asset_evidence = [ev for ev in asset_evidence if ev.source_id == source_id]
        evidence_list = sorted(asset_evidence, key=lambda ev: ev.created_at, reverse=True)[:MAX_EVIDENCE_PER_ASSET]

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
                    "project": source_names.get(str(ev.source_id), "an unattributed project"),
                }
                for ev in evidence_list
            ],
            "evidence_count_total": len(asset.evidence or []),
        })

    notes = []
    if len(assets) > MAX_ASSETS_IN_CONTEXT:
        notes.append(f"Showing top {MAX_ASSETS_IN_CONTEXT} of {len(assets)} assets by composite risk priority.")
    if excluded_count:
        notes.append(f"{excluded_count} asset(s) omitted — they only appear in project(s) marked private from AI Analyst.")

    return {
        "workspace_id": str(workspace_id),
        "scope": scope_label,
        "total_assets": len(assets),
        "assets": asset_payloads,
        "note": " ".join(notes) or None,
    }


SYSTEM_PROMPT_TEMPLATE = """You are ECDAT's cryptographic analyst — you help engineers understand real cryptographic findings from an automated scan of their codebase.

RULES — never violate these (this is a security tool; a wrong answer is worse than no answer):
1. Answer ONLY using the WORKSPACE DATA below. Never invent an algorithm, asset, file, or risk level that isn't in it.
2. Every specific claim about an asset must be traceable to that asset's asset_id or evidence_id in WORKSPACE DATA — list those ids in evidence_citations / asset_citations.
3. If the question asks about something WORKSPACE DATA doesn't cover (e.g. an algorithm never found, or a question needing source code you don't have), say so plainly in `answer` and list it in `unknowns`. Do not guess to fill the gap.
4. You do not have access to raw source code — only canonical algorithm names, risk scores, and evidence locations (file/line). Never imply otherwise.
5. Set `confidence` honestly: 1.0 only when the answer is a direct, unambiguous read of WORKSPACE DATA; lower it when you're synthesizing/prioritizing across multiple findings.
6. Recommendations in WORKSPACE DATA are ECDAT's own deterministic engine output (not yours) — you may explain and contextualize them, but do not override or contradict their risk levels or NIST citations.
7. If WORKSPACE DATA's `note` field mentions assets were omitted for privacy, do not speculate about what they might be.
8. WORKSPACE DATA's top-level `scope` field tells you whether you're looking at one specific project or the whole workspace ("all projects") — say so plainly at the start of your answer (e.g. "Across all your projects, ..." or "In your <name> project, ..."). Each evidence item's `project` field names which project it came from — when an answer spans multiple projects, name them individually rather than saying "your codebase" generically.

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


async def resolve_citation_details(db: AsyncSession, workspace_id: uuid.UUID, evidence_ids: List[str]) -> List[dict]:
    """
    Small denormalized lookup purely for frontend display — which file and
    which project does each already-verified evidence citation point to.
    `evidence_ids` must already be verify_citations()-checked; this doesn't
    re-check trust, it just adds display detail the router hands back.
    """
    if not evidence_ids:
        return []
    ids = []
    for c in evidence_ids:
        try:
            ids.append(uuid.UUID(c))
        except (ValueError, AttributeError, TypeError):
            continue
    if not ids:
        return []

    result = await db.execute(
        select(EvidenceModel.id, EvidenceModel.file_path, EvidenceModel.line_number, Source.name)
        .outerjoin(Source, Source.id == EvidenceModel.source_id)
        .where(EvidenceModel.id.in_(ids), EvidenceModel.workspace_id == workspace_id)
    )
    return [
        {
            "evidence_id": str(eid),
            "file_path": file_path,
            "line_number": line_number,
            "project_name": project_name or "Unattributed",
        }
        for eid, file_path, line_number, project_name in result.all()
    ]


async def resolve_scope_label(db: AsyncSession, workspace_id: uuid.UUID, source_id: Optional[uuid.UUID]) -> str:
    """The same label build_context() computes internally, exposed for the
    router to attach to the API response so the frontend can show it without
    a second round trip."""
    if not source_id:
        return "All projects"
    result = await db.execute(select(Source.name).where(Source.id == source_id, Source.workspace_id == workspace_id))
    return result.scalar_one_or_none() or "Unknown project"


async def _call_gemini(system_prompt: str, question: str) -> str:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.gemini_api_key)
    result = await client.aio.models.generate_content(
        model=GEMINI_MODEL,
        contents=question,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            response_mime_type="application/json",
            response_schema=AnalystResponse,
            temperature=0.2,  # low: this is an analysis tool, not a creative one
        ),
    )
    return result.text


async def _call_groq(system_prompt: str, question: str) -> str:
    from groq import AsyncGroq

    client = AsyncGroq(api_key=settings.groq_api_key)
    schema_hint = json.dumps(AnalystResponse.model_json_schema())
    result = await client.chat.completions.create(
        model=GROQ_MODEL,
        temperature=0.2,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt + f"\n\nRespond with ONLY a JSON object matching this schema, no other text:\n{schema_hint}"},
            {"role": "user", "content": question},
        ],
    )
    return result.choices[0].message.content


async def ask_analyst(db: AsyncSession, workspace_id: uuid.UUID, question: str, source_id: Optional[uuid.UUID] = None) -> AnalystResponse:
    if not is_configured():
        return AnalystResponse(
            answer="AI Analyst isn't configured yet — no GEMINI_API_KEY or GROQ_API_KEY is set on the backend. Ask your admin to add one to ecdat-backend/.env.",
            confidence=1.0,
            unknowns=["AI Analyst configuration"],
        )

    context = await build_context(db, workspace_id, source_id=source_id)

    if context["total_assets"] == 0:
        return AnalystResponse(
            answer="I don't have any evidence for this workspace yet — no discovery scan has completed. Connect a source and run a scan first, then ask again.",
            confidence=1.0,
            unknowns=["no scan data"],
        )

    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(context_json=json.dumps(context, indent=2))

    raw_text = None
    errors = []
    for provider, call in (("Gemini", _call_gemini), ("Groq", _call_groq)):
        key = settings.gemini_api_key if provider == "Gemini" else settings.groq_api_key
        if not key:
            continue
        try:
            raw_text = await call(system_prompt, question)
            break
        except Exception as e:
            errors.append(f"{provider}: {e}")
            print(f"[AIAnalyst] {provider} call failed, {'trying fallback' if provider == 'Gemini' else 'no more providers'}: {e}")

    if raw_text is None:
        return AnalystResponse(
            answer=f"AI Analyst request failed on every configured provider: {'; '.join(errors)}",
            confidence=0.0,
            unknowns=["AI request failed"],
        )

    try:
        response = AnalystResponse.model_validate_json(raw_text)
    except Exception as e:
        return AnalystResponse(
            answer=f"AI Analyst returned a response that didn't match the expected schema and was rejected rather than shown as-is: {e}",
            confidence=0.0,
            unknowns=["malformed AI response"],
        )

    return await verify_citations(db, workspace_id, response)
