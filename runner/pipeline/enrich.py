"""
Stage 3c — Enrichment pass.

Runs after the main analysis (Stage 3b). Calls the 'lexicon-llm' LiteLLM alias
(currently gemma4:31b-mlx on Mac Studio) with the full enrichment prompt, injecting:
  - Current lexicon terms from Sanity
  - Current entity registry from Sanity
  - Main analysis result summary

Output: EnrichmentResult stored as enrichment.json in the corpus dir.

LLM routing:
  --llm litelm*   → 'lexicon-llm' on Mac Studio (preferred)
  --llm claude    → Claude API
  --llm local*    → local qwen3.5:9b via Ollama
  fallback        → tries litelm then local
"""
from __future__ import annotations
from datetime import datetime, timezone
import hashlib
import json
import re
import shutil
import time
from pathlib import Path

try:
    from runner.config import Config
    from runner.models.document import AnalysisResult, PreprocessResult
    from runner.models.enrichment import (
        EnrichmentResult,
        ENTITY_REGISTRY_FIT_VALUES,
        LexiconProposal,
        EntityProposal,
        PRACTICE_FIT_VALUES,
        TacticProposal,
        PracticeDescription,
        StatisticalClaim,
        infer_entity_registry_fit,
        infer_practice_cluster,
        infer_practice_fit,
    )
    from runner.pipeline.audit import current_git_commit, sha256_text, write_enrichment_audit
    from runner.pipeline.citation_units import (
        CITATION_UNITS_FILENAME,
        attach_locators_to_enrichment_payload,
    )
    from runner.pipeline.enrichment_lexicon import merge_enrichment_lexicon
    from runner.pipeline.http_retry import call_with_http_retries
    from runner.pipeline.sanity_reads import fetch_active_lexicon_terms, sanity_read_headers
except ImportError:
    from ..config import Config  # type: ignore[no-redef]
    from ..models.document import AnalysisResult, PreprocessResult  # type: ignore[no-redef]
    from ..models.enrichment import (  # type: ignore[no-redef]
        EnrichmentResult,
        ENTITY_REGISTRY_FIT_VALUES,
        LexiconProposal,
        EntityProposal,
        PRACTICE_FIT_VALUES,
        TacticProposal,
        PracticeDescription,
        StatisticalClaim,
        infer_entity_registry_fit,
        infer_practice_cluster,
        infer_practice_fit,
    )
    from .audit import current_git_commit, sha256_text, write_enrichment_audit  # type: ignore[no-redef]
    from .citation_units import (  # type: ignore[no-redef]
        CITATION_UNITS_FILENAME,
        attach_locators_to_enrichment_payload,
    )
    from .enrichment_lexicon import merge_enrichment_lexicon  # type: ignore[no-redef]
    from .http_retry import call_with_http_retries  # type: ignore[no-redef]
    from .sanity_reads import fetch_active_lexicon_terms, sanity_read_headers  # type: ignore[no-redef]

PROMPT_VERSION = "enrichment-v1.1"

_PROMPT_FILE = (
    Path(__file__).parents[2]
    / "02_working_tools"
    / "ENRICHMENT_PROMPT_v1.0.md"
)

_SYSTEM_PROMPT: str | None = None

_LEXICON_ACTIONS = {"add_new", "add_variant", "add_evidence", "add_definition", "merge_into"}
_GENDER_DYSPHORIA_CANONICAL_ID = "lexicon-gender-dysphoria"
_GENDER_DYSPHORIA_CANONICAL_TERM = "Gender Dysphoria"
_LEXICON_CLUSTERS = {
    "SSA-Rhetoric",
    "Pastoral-Coercion",
    "Pseudo-Science",
    "Policy-Resistance",
    "Anti-Trans/ROGD",
    "Anti-Gender",
    "Pro-Trans-SOGICE",
    "Non-SOGICE",
    "Unknown",
}
_LEXICON_FUNCTIONS = {
    "Slur",
    "Euphemism",
    "Conspiracy",
    "Pseudo-Diagnostic",
    "Identity-Policing",
    "Moral-Purity Frame",
    "Political Slogan",
    "Recruitment Frame",
    "Pastoral Rhetoric",
    "Disinformation Narrative",
    "Promotional Recruitment",
    "Testimonial Marketing",
    "Unknown",
}
_LEXICON_FUNCTION_ALIASES = {
    value.replace(" ", "-"): value
    for value in _LEXICON_FUNCTIONS
    if " " in value
}
_USAGE_REGISTERS = {
    "promotional",
    "defensive",
    "euphemistic",
    "clinical",
    "legal",
    "conspiratorial",
    "testimonial",
    "neutral",
}
_TERM_RELATIONSHIPS = {
    "synonym_of",
    "successor_to",
    "euphemism_for",
    "derived_from",
    "translates_to",
    "co_occurs_with",
    "contrasts_with",
}
_ENTITY_ACTIONS = {"add_new", "enrich_existing"}
_ENTITY_TYPES = {"organization", "person"}
_ENTITY_REGISTRY_FITS = ENTITY_REGISTRY_FIT_VALUES
_NETWORK_CONNECTIONS = {
    "partner",
    "funds",
    "funded_by",
    "affiliate",
    "parent_org",
    "child_org",
    "legal_defense",
    "training_provider",
    "media_outlet",
    "co-signatory",
    "opposes",
}
_PERSON_ROLE_CONNECTION_HINTS = {
    "founder",
    "co-founder",
    "cofounder",
    "team_member",
    "team member",
    "board_member",
    "board member",
    "staff",
    "employee",
    "director",
    "leader",
    "president",
    "chair",
    "trustee",
    "advisor",
    "adviser",
}
_TACTIC_LEVELS = {"structural", "sub-tactic", "campaign"}
_INGESTION_SOURCE_TYPES = {"pdf", "url", "video", "audio", "unknown"}
_PRIORITIES = {"high", "medium", "low"}
_CORPUS_CONNECTION_TYPES = {
    "same_organization",
    "same_event",
    "same_individual",
    "cites",
    "cited_by",
    "same_tactic",
    "same_term",
    "contradicts",
    "sequel_to",
    "precedes",
}
_HARM_STANCES = {"denied", "minimized", "reframed", "acknowledged", "not_mentioned"}
_PRACTICE_FITS = PRACTICE_FIT_VALUES
_VERIFICATION_STATUSES = {"unverified", "verified", "disputed", "debunked", "unverifiable"}

# Mapping from enrichment.json family key → short name used in proposal IDs.
_FAMILY_NAME: dict[str, str] = {
    "lexicon_proposals":     "lexicon",
    "entity_proposals":      "entity",
    "tactic_proposals":      "tactic",
    "practice_descriptions": "practice",
    "statistical_claims":    "claim",
}

# Pydantic model class for each proposal family.
_FAMILY_MODEL: dict[str, type] = {
    "lexicon_proposals":     LexiconProposal,
    "entity_proposals":      EntityProposal,
    "tactic_proposals":      TacticProposal,
    "practice_descriptions": PracticeDescription,
    "statistical_claims":    StatisticalClaim,
}

# Researcher-controlled fields preserved across re-enrichment (P3 merge).
_RESEARCHER_FIELDS: frozenset[str] = frozenset({
    "approved",
    "rejected",
    "pushed_to_sanity",
    "sanity_id",
    "researcher_note",
    "registry_fit",
    "registry_fit_rationale",
    "practice_fit",
    "practice_cluster",
    "practice_fit_rationale",
    "proposal_created_at",   # always preserve original first-seen timestamp
    "proposal_status",       # carry forward so status is not reset to pending
})

# Per-family link fields the researcher fills in (e.g. entity ID resolver).
_LINK_FIELDS: dict[str, frozenset[str]] = {
    "lexicon_proposals":     frozenset({"existing_entry_id", "existing_entry_term", "merge_target_id"}),
    "entity_proposals":      frozenset({"existing_entity_id"}),
    "tactic_proposals":      frozenset({"existing_tactic_id"}),
    "practice_descriptions": frozenset({"existing_practice_id"}),
    "statistical_claims":    frozenset({"verification_status", "verifiable"}),
}


# ---------------------------------------------------------------------------
# Proposal identity helpers (P1)
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    """Return the current UTC time as an ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat()


def _normalized_tactic_key(value: str) -> str:
    """Return a separator-insensitive key for tactic identity.

    The model and the registry often alternate between display labels and
    machine labels, e.g. ``Religious Freedom Shield`` and
    ``Religious-Freedom-Shield``. Treat those as one concept for proposal
    identity/merge purposes while preserving the human-facing label.
    """
    text = str(value or "").strip().lower()
    text = re.sub(r"^tactic:\s*", "", text)
    text = re.sub(r"[^a-z0-9]+", " ", text).strip()
    return re.sub(r"\s+", " ", text)


def _proposal_semantic_key(family: str, item: dict) -> str:
    """Return the stable content component of a proposal's deterministic ID.

    Uses only the fields that are most stable across model re-runs — the
    primary name/identifier field rather than exact quotes or descriptions,
    which can vary between runs.

    P4 design note: a future cross-document canonical identity architecture
    should extend this to accent-insensitive entity names, canonical term
    forms, and cross-family deduplication. See NEXT_SESSION.md for the P4
    design task.
    """
    if family == "lexicon":
        action = (item.get("action") or "").strip()
        term = (item.get("term") or "").lower().strip()
        language = (item.get("language") or "en").lower().strip()
        return f"{action}\x00{term}\x00{language}"
    if family == "entity":
        action = (item.get("action") or "").strip()
        etype = (item.get("entity_type") or "organization").strip()
        name = (item.get("name") or "").lower().strip()
        return f"{action}\x00{etype}\x00{name}"
    if family == "tactic":
        action = (item.get("action") or "").strip()
        tactic = _normalized_tactic_key(item.get("tactic") or "")
        return f"{action}\x00{tactic}"
    if family == "practice":
        practice_id = (item.get("practice_id") or "").lower().strip()
        description = re.sub(r"\s+", " ", (item.get("exact_description") or "").lower()).strip()
        description_hash = hashlib.sha256(description[:240].encode()).hexdigest()[:12]
        return f"{practice_id}\x00{description_hash}"
    if family == "claim":
        return (item.get("claim") or "")[:120].lower().strip()
    if family == "ingestion":
        return (item.get("url") or "").lower().strip()
    return ""


def _legacy_proposal_semantic_key(family: str, item: dict) -> str:
    """Return the previous P1/P2/P3 semantic key for backward compatibility."""
    if family == "lexicon":
        action = (item.get("action") or "").strip()
        term = (item.get("term") or "").lower().strip()
        return f"{action}\x00{term}"
    if family == "entity":
        etype = (item.get("entity_type") or "organization").strip()
        name = (item.get("name") or "").lower().strip()
        return f"{etype}\x00{name}"
    if family == "tactic":
        return _normalized_tactic_key(item.get("tactic") or "")
    if family == "practice":
        return (item.get("practice_id") or "").lower().strip()
    if family == "claim":
        return (item.get("claim") or "")[:120].lower().strip()
    if family == "ingestion":
        return (item.get("url") or "").lower().strip()
    return ""


def _generate_proposal_id(family: str, doc_id: str, item: dict) -> str:
    """Generate a deterministic 16-char hex proposal ID.

    The ID is stable across re-enrichment runs: the same doc_id + family +
    content key always produces the same value, enabling merge-by-identity
    in save().  doc_id is included so the same entity proposed from two
    documents gets two separate IDs (two separate evidence contributions).
    """
    semantic_key = _proposal_semantic_key(family, item)
    raw = f"{family}\x00{doc_id}\x00{semantic_key}"
    return "prop-" + hashlib.sha256(raw.encode()).hexdigest()[:16]


def _generate_legacy_proposal_id(family: str, doc_id: str, item: dict) -> str:
    """Generate the prior proposal ID shape so old local files still match."""
    semantic_key = _legacy_proposal_semantic_key(family, item)
    raw = f"{family}\x00{doc_id}\x00{semantic_key}"
    return "prop-" + hashlib.sha256(raw.encode()).hexdigest()[:16]


def _proposal_id_candidates(family: str, doc_id: str, item: dict) -> list[str]:
    """Return all IDs that may identify a proposal across identity revisions."""
    candidates = [
        item.get("proposal_id"),
        _generate_proposal_id(family, doc_id, item),
        _generate_legacy_proposal_id(family, doc_id, item),
    ]
    seen: set[str] = set()
    return [pid for pid in candidates if pid and not (pid in seen or seen.add(pid))]


def _derive_proposal_status(item: dict) -> str:
    """Derive proposal_status from booleans conservatively.

    pushed_to_sanity is checked first so a pushed proposal is never
    silently re-labelled 'approved' even if both flags happen to be True.
    """
    if item.get("pushed_to_sanity"):
        return "pushed"
    if item.get("rejected"):
        return "rejected"
    if item.get("approved"):
        return "approved"
    return "pending"


# ---------------------------------------------------------------------------
# Proposal merge helpers (P3)
# ---------------------------------------------------------------------------

def _build_old_proposal_index(
    old_proposals: list,
    family: str,
    doc_id: str,
) -> dict[str, dict]:
    """Build a proposal_id → dict index from prior enrichment.json proposals.

    Proposals without a proposal_id (files pre-dating P1) get one generated
    from their content, so backward-compatible matching still works.
    """
    index: dict[str, dict] = {}
    for p in old_proposals:
        if not isinstance(p, dict):
            continue
        for pid in _proposal_id_candidates(family, doc_id, p):
            if not pid:
                continue
            if pid not in index or _proposal_review_weight(p) > _proposal_review_weight(index[pid]):
                index[pid] = p
    return index


def _proposal_review_weight(item: dict) -> int:
    """Rank old proposal candidates so reviewed local state wins alias collisions."""
    if item.get("pushed_to_sanity") or item.get("sanity_id"):
        return 4
    if item.get("approved") or item.get("rejected"):
        return 3
    if any(
        item.get(field)
        for field in (
            "existing_entity_id",
            "existing_entry_id",
            "existing_tactic_id",
            "merge_target_id",
            "researcher_note",
        )
    ):
        return 2
    return 1


def _is_blank_for_merge(value) -> bool:
    return value is None or value == "" or value == [] or value == {}


def _merge_existing_proposal_with_fresh(
    old_dict: dict,
    new_dict: dict,
    extra_fields: frozenset[str],
) -> dict:
    """Keep the existing reviewed proposal as base, filling blanks from a new run."""
    merged = dict(old_dict)
    for field, new_val in new_dict.items():
        if field == "proposal_updated_at" and new_val:
            merged[field] = new_val
            continue
        if field == "proposal_status":
            continue
        if field not in merged or _is_blank_for_merge(merged.get(field)):
            merged[field] = new_val

    for field in _RESEARCHER_FIELDS | extra_fields:
        if field in old_dict:
            merged[field] = old_dict.get(field)

    merged.setdefault("proposal_created_at", new_dict.get("proposal_created_at"))
    merged["proposal_status"] = _derive_proposal_status(merged)
    return merged


def _apply_researcher_fields(
    new_dict: dict,
    old_dict: dict,
    extra_fields: frozenset[str],
) -> dict:
    """Copy researcher decisions from an old proposal dict into a new one.

    Only truthy values are carried forward (True, non-empty strings).
    proposal_created_at is an exception: always carried when present to
    preserve the original first-seen timestamp.
    researcher_note is always carried (even empty) so a deliberate clear
    by the researcher is preserved.

    Model-generated fields (quote, description, confidence values) are
    intentionally NOT merged — the new LLM run provides fresher output.
    """
    carry_fields = _RESEARCHER_FIELDS | extra_fields
    for field in carry_fields:
        old_val = old_dict.get(field)
        if field == "proposal_created_at":
            if old_val:
                new_dict[field] = old_val
        elif field == "researcher_note":
            if "researcher_note" in old_dict:
                new_dict["researcher_note"] = old_dict.get("researcher_note", "")
        elif old_val:
            new_dict[field] = old_val
    # Re-derive proposal_status after merging booleans
    new_dict["proposal_status"] = _derive_proposal_status(new_dict)
    return new_dict


def _merge_researcher_state(
    result: EnrichmentResult,
    old_data: dict,
    doc_id: str,
) -> tuple[EnrichmentResult, dict]:
    """Merge researcher decisions from a prior enrichment.json into a new result.

    Rules:
    - Proposals matching by proposal_id: keep the existing reviewed proposal
      as the base and fill only blank fields from the fresh model proposal.
    - Old proposals not in the new result: appended (never silently lost).
    - New proposals not in the old result: kept as pending.
    - Old proposals without a proposal_id: matched via content-derived ID
      (backward compat for files that pre-date P1).

    Returns (merged_result, merge_summary) where merge_summary keys are:
      carried_forward, appended_from_prior, new_proposals
    """
    summary: dict[str, int] = {
        "carried_forward": 0,
        "appended_from_prior": 0,
        "new_proposals": 0,
    }

    for family_key, model_class in _FAMILY_MODEL.items():
        family_name = _FAMILY_NAME[family_key]
        extra_fields = _LINK_FIELDS.get(family_key, frozenset())

        old_proposals: list = old_data.get(family_key) or []
        new_proposals: list = list(getattr(result, family_key, []))

        old_index = _build_old_proposal_index(old_proposals, family_name, doc_id)
        matched_old_ids: set[str] = set()

        merged: list = []
        for new_p in new_proposals:
            new_dict_for_id = new_p.model_dump()
            new_candidate_ids = _proposal_id_candidates(family_name, doc_id, new_dict_for_id)
            matching_old = [
                old_index[pid]
                for pid in new_candidate_ids
                if pid in old_index
            ]
            old_p = max(matching_old, key=_proposal_review_weight) if matching_old else None
            matched_pid = (
                _proposal_id_candidates(family_name, doc_id, old_p)[0]
                if old_p
                else ""
            )
            if matched_pid:
                new_dict = _merge_existing_proposal_with_fresh(
                    old_p,
                    new_dict_for_id,
                    extra_fields,
                )
                try:
                    new_p = model_class.model_validate(new_dict)
                except Exception:
                    pass  # Non-fatal: keep unmerged proposal
                matched_old_ids.update(_proposal_id_candidates(family_name, doc_id, old_p))
                summary["carried_forward"] += 1
            else:
                summary["new_proposals"] += 1
            merged.append(new_p)

        # Append old proposals not in the new run — never silently discard.
        for old_p in old_proposals:
            if not isinstance(old_p, dict):
                continue
            old_candidate_ids = _proposal_id_candidates(family_name, doc_id, old_p)
            if any(pid in matched_old_ids for pid in old_candidate_ids):
                continue
            try:
                old_p = dict(old_p)
                if not old_p.get("proposal_id"):
                    old_p["proposal_id"] = _generate_proposal_id(family_name, doc_id, old_p)
                if not old_p.get("proposal_status"):
                    old_p["proposal_status"] = _derive_proposal_status(old_p)
                if not old_p.get("proposal_created_at"):
                    old_p["proposal_created_at"] = _now_iso()
                if not old_p.get("proposal_updated_at"):
                    old_p["proposal_updated_at"] = _now_iso()
                appended = model_class.model_validate(old_p)
                merged.append(appended)
                matched_old_ids.update(old_candidate_ids)
                summary["appended_from_prior"] += 1
            except Exception:
                pass  # Non-fatal: skip malformed old proposals

        setattr(result, family_key, merged)

    # Merge top-level researcher_notes: concatenate old + new when both are
    # non-empty and distinct, so manual notes from prior runs are preserved.
    old_notes = str(old_data.get("researcher_notes") or "").strip()
    new_notes = str(getattr(result, "researcher_notes", "") or "").strip()
    if old_notes and new_notes and old_notes != new_notes:
        result.researcher_notes = f"{old_notes}\n\n{new_notes}"
    elif old_notes and not new_notes:
        result.researcher_notes = old_notes
    # else: keep result.researcher_notes (new_notes or empty)

    return result, summary


def _load_system_prompt() -> str:
    global _SYSTEM_PROMPT
    if _SYSTEM_PROMPT is None:
        raw = _PROMPT_FILE.read_text(encoding="utf-8")
        match = re.search(r"## SYSTEM PROMPT\s*\n```\n(.*?)```", raw, re.DOTALL)
        if not match:
            raise RuntimeError(f"Cannot parse system prompt from {_PROMPT_FILE}")
        _SYSTEM_PROMPT = match.group(1).strip()
    return _SYSTEM_PROMPT


def run(
    doc_id: str,
    preprocess: PreprocessResult,
    analysis: AnalysisResult,
    config: Config,
    llm: str = "litelm",
    model: str | None = None,
    retrieval_grounded: bool = False,
    *,
    _audit: dict | None = None,
) -> EnrichmentResult:
    """Run Stage 3c enrichment and return an EnrichmentResult."""
    _started = time.perf_counter()
    if _audit is not None:
        _audit["llm_flag"] = llm
        _audit["input_char_count"] = len(preprocess.text)
        _audit.setdefault("errors", [])
        _audit["chunked"] = False
        _audit["chunk_count"] = None
        _audit["chunks"] = None
        _audit["git_commit"] = current_git_commit()
        _audit["corpus_connections_suppressed"] = not retrieval_grounded
        _audit["corpus_connections_suppression_reason"] = (
            "retrieval_not_wired" if not retrieval_grounded else ""
        )

    system_prompt = _build_system_prompt_for_run(config, analysis, retrieval_grounded, _audit)
    user_message  = _build_user_message(doc_id, preprocess)
    if _audit is not None:
        _audit["prompt_sha256"] = sha256_text(system_prompt)
        _audit["prompt_template_sha256"] = sha256_text(_load_system_prompt())

    try:
        raw = _call_enrichment_model(llm, system_prompt, user_message, config, model, _audit=_audit)

        # Use a separate dict for the whole-document validation attempt.  If it
        # fails and we fall through to the chunked fallback, we do NOT want the
        # main _audit left with validation_path="failed" when the run ultimately
        # succeeds.  On success the relevant fields are copied into _audit below.
        _whole_doc_audit: dict = {}
        try:
            result = _validate_response_for_run(
                doc_id,
                raw,
                llm,
                _whole_doc_audit,
                retrieval_grounded,
            )
            if _audit is not None:
                _audit["validation_path"] = _whole_doc_audit.get("validation_path", "")
                _audit["validation_attempts"] = _whole_doc_audit.get("validation_attempts", 0)
                _audit["normalization_repairs"] = _whole_doc_audit.get("normalization_repairs", 0)
            return result
        except ValueError as exc:
            if len(preprocess.text) < 8_000:
                # No chunked fallback for short docs — propagate the failure state.
                if _audit is not None:
                    _audit["validation_path"] = _whole_doc_audit.get("validation_path", "failed")
                    _audit["validation_attempts"] = _whole_doc_audit.get("validation_attempts", 0)
                    _audit.setdefault("errors", []).extend(
                        _whole_doc_audit.get("errors", [])
                    )
                raise
            return _run_chunked_enrichment(
                doc_id=doc_id,
                preprocess=preprocess,
                analysis=analysis,
                config=config,
                llm=llm,
                model=model,
                first_error=exc,
                retrieval_grounded=retrieval_grounded,
                _audit=_audit,
            )
    finally:
        if _audit is not None:
            _audit["duration_ms"] = int((time.perf_counter() - _started) * 1000)


def enrichment_payload_for_save(result: EnrichmentResult, doc_dir: Path) -> dict:
    """Return enrichment JSON with best-effort quote locators attached.

    Locator fields are derived from ``citation_units.json`` when available and
    degrade to explicit ``not_found`` / ``missing_quote`` states for older docs.
    They are attached at serialization time so the Pydantic model contract stays
    stable while downstream graph/Wikia/chat layers get inspectable evidence.
    """
    payload = result.model_dump(by_alias=True)
    citation_sidecar: dict = {}
    sidecar_path = Path(doc_dir) / CITATION_UNITS_FILENAME
    if sidecar_path.exists():
        try:
            loaded = json.loads(sidecar_path.read_text(encoding="utf-8"))
            if isinstance(loaded, dict):
                citation_sidecar = loaded
        except Exception:
            citation_sidecar = {}
    return attach_locators_to_enrichment_payload(payload, citation_sidecar)


def enrichment_json_for_save(
    result: EnrichmentResult,
    doc_dir: Path,
    *,
    trailing_newline: bool = False,
) -> str:
    text = json.dumps(
        enrichment_payload_for_save(result, doc_dir),
        indent=2,
        ensure_ascii=False,
    )
    return text + ("\n" if trailing_newline else "")


def save(doc_id: str, result: EnrichmentResult, config: Config, *, _audit: dict | None = None) -> Path:
    """Write enrichment.json to the document's corpus directory.

    P3 merge: if a prior enrichment.json exists, researcher decisions
    (approved, rejected, pushed flags, notes, link IDs) are merged into
    the new result before writing.  Old proposals not present in the new
    run are appended so nothing is ever silently discarded.  The pre-merge
    file is archived as enrichment_<timestamp>.json for full auditability.

    Merge is keyed on proposal_id (a deterministic SHA-256 hash of family +
    doc_id + primary content key).  Files predating P1 are matched by
    generating the same hash from their content.
    """
    doc_dir = config.corpus_dir / doc_id
    doc_dir.mkdir(parents=True, exist_ok=True)
    out = doc_dir / "enrichment.json"

    # P3: Merge researcher state from the prior run before writing. The archive
    # captures the previous active enrichment.json; the active file always
    # reflects the merged researcher-inclusive state.
    if out.exists():
        try:
            old_data = json.loads(out.read_text(encoding="utf-8"))
            result, merge_summary = _merge_researcher_state(result, old_data, doc_id)
            if _audit is not None:
                _audit["merge_summary"] = merge_summary
        except Exception as exc:
            if _audit is not None:
                _audit.setdefault("errors", []).append(
                    f"P3 merge skipped (non-fatal): {exc}"
                )
        archive = doc_dir / f"enrichment_{_timestamp()}.json"
        shutil.copy2(out, archive)

    result.run_type = "main"
    out.write_text(enrichment_json_for_save(result, doc_dir), encoding="utf-8")
    if _audit is not None:
        write_enrichment_audit(doc_dir, _audit, result)
    return out


def save_alt(doc_id: str, result: EnrichmentResult, config: Config, label: str = "alt") -> Path:
    """Write a comparison enrichment result without touching enrichment.json."""
    doc_dir = config.corpus_dir / doc_id
    doc_dir.mkdir(parents=True, exist_ok=True)
    result.run_type = "alt"
    out = doc_dir / f"enrichment_{label}_{_timestamp()}.json"
    out.write_text(enrichment_json_for_save(result, doc_dir), encoding="utf-8")
    return out


def list_history(doc_id: str, config: Config) -> list[dict]:
    """Return archived main runs and second opinions with their inferred file type."""
    doc_dir = config.corpus_dir / doc_id
    history: list[dict] = []
    for path in sorted(doc_dir.glob("enrichment_*.json")):
        if path.name == "enrichment.json":
            continue
        run_type = "alt" if path.name.startswith("enrichment_alt_") else "main_archive"
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            run_type = data.get("run_type") or run_type
            model = data.get("enrichment_model", "")
        except Exception:
            model = ""
        history.append({"path": path, "filename": path.name, "run_type": run_type, "model": model})
    return history


def push_approved_to_sanity(doc_id: str, config: Config) -> dict:
    """Push all approved (not yet pushed) enrichment proposals to Sanity.

    Marks each pushed item with pushed_to_sanity=True and its sanity_id, then
    saves enrichment.json back so the state persists across sessions.

    Returns pushed counts by proposal family plus any errors.
    """
    try:
        from runner.clients.sanity import (
            append_extractable_asset_from_proposal,
            write_entity_from_proposal,
            write_lexicon_draft_from_proposal,
            write_practice_from_proposal,
            write_tactic_from_proposal,
        )
    except ImportError:
        from ..clients.sanity import (
            append_extractable_asset_from_proposal,
            write_entity_from_proposal,
            write_lexicon_draft_from_proposal,
            write_practice_from_proposal,
            write_tactic_from_proposal,
        )

    result = load(doc_id, config)
    if result is None:
        raise FileNotFoundError(f"No enrichment.json found for {doc_id}")

    pushed_lexicon = 0
    pushed_entities = 0
    pushed_tactics = 0
    pushed_practices = 0
    pushed_claims = 0
    errors: list[str] = []

    for prop in result.lexicon_proposals:
        if not prop.approved or prop.rejected or prop.pushed_to_sanity:
            continue
        try:
            sanity_id = write_lexicon_draft_from_proposal(prop.model_dump(by_alias=True), doc_id, config)
            prop.pushed_to_sanity = True
            prop.sanity_id = sanity_id
            prop.proposal_status = "pushed"
            pushed_lexicon += 1
        except Exception as exc:
            errors.append(f"lexicon/{prop.term}: {exc}")

    for prop in result.entity_proposals:
        if not prop.approved or prop.rejected or prop.pushed_to_sanity:
            continue
        try:
            sanity_id = write_entity_from_proposal(prop.model_dump(), doc_id, config)
            prop.pushed_to_sanity = True
            prop.sanity_id = sanity_id
            prop.proposal_status = "pushed"
            pushed_entities += 1
        except Exception as exc:
            errors.append(f"entity/{prop.name}: {exc}")

    for prop in result.tactic_proposals:
        if not prop.approved or prop.rejected or prop.pushed_to_sanity:
            continue
        try:
            sanity_id = write_tactic_from_proposal(prop.model_dump(), doc_id, config)
            prop.pushed_to_sanity = True
            prop.sanity_id = sanity_id
            prop.proposal_status = "pushed"
            pushed_tactics += 1
        except Exception as exc:
            errors.append(f"tactic/{prop.tactic}: {exc}")

    for prop in result.practice_descriptions:
        if not prop.approved or prop.rejected or prop.pushed_to_sanity:
            continue
        try:
            sanity_id = write_practice_from_proposal(prop.model_dump(), doc_id, config)
            append_extractable_asset_from_proposal(
                prop.model_dump(),
                doc_id,
                config,
                asset_type="practice_description",
                content=prop.exact_description,
                target_module="practice_registry",
            )
            prop.pushed_to_sanity = True
            prop.sanity_id = sanity_id
            prop.proposal_status = "pushed"
            pushed_practices += 1
        except Exception as exc:
            errors.append(f"practice/{prop.practice_id}: {exc}")

    for prop in result.statistical_claims:
        if not prop.approved or prop.rejected or prop.pushed_to_sanity:
            continue
        try:
            sanity_id = append_extractable_asset_from_proposal(
                prop.model_dump(),
                doc_id,
                config,
                asset_type="statistical_claim",
                content=prop.claim,
                target_module="fact_checking",
            )
            prop.pushed_to_sanity = True
            prop.sanity_id = sanity_id
            prop.proposal_status = "pushed"
            pushed_claims += 1
        except Exception as exc:
            errors.append(f"statistical_claim/{prop.claim[:80]}: {exc}")

    # Persist updated state
    doc_dir = config.corpus_dir / doc_id
    out = doc_dir / "enrichment.json"
    out.write_text(enrichment_json_for_save(result, doc_dir), encoding="utf-8")

    return {
        "lexicon": pushed_lexicon,
        "entities": pushed_entities,
        "tactics": pushed_tactics,
        "practices": pushed_practices,
        "statistical_claims": pushed_claims,
        "errors": errors,
    }


def pending_push_counts(doc_id: str, config: Config) -> dict:
    """Return counts of approved-not-pushed proposals without modifying anything."""
    result = load(doc_id, config)
    if result is None:
        return {"lexicon": 0, "entities": 0, "tactics": 0, "practices": 0, "statistical_claims": 0, "queue": 0}
    return {
        "lexicon": sum(1 for p in result.lexicon_proposals if p.approved and not p.rejected and not p.pushed_to_sanity),
        "entities": sum(1 for p in result.entity_proposals if p.approved and not p.rejected and not p.pushed_to_sanity),
        "tactics": sum(1 for p in result.tactic_proposals if p.approved and not p.rejected and not p.pushed_to_sanity),
        "practices": sum(1 for p in result.practice_descriptions if p.approved and not p.rejected and not p.pushed_to_sanity),
        "statistical_claims": sum(1 for p in result.statistical_claims if p.approved and not p.rejected and not p.pushed_to_sanity),
        "queue": len(result.ingestion_queue),
    }


def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S_%f")


def load(doc_id: str, config: Config) -> EnrichmentResult | None:
    """Load a previously saved enrichment.json, or None if not found."""
    path = config.corpus_dir / doc_id / "enrichment.json"
    if not path.exists():
        return None
    return EnrichmentResult.model_validate(json.loads(path.read_text()))


# ---------------------------------------------------------------------------
# Chunked fallback
# ---------------------------------------------------------------------------

def _call_enrichment_model(
    llm: str,
    system_prompt: str,
    user_message: str,
    config: Config,
    model: str | None = None,
    *,
    _audit: dict | None = None,
) -> str:
    raw: str | None = None

    if llm == "claude":
        if _audit is not None:
            _audit["model"] = config.claude_model
            _audit["model_parameters"] = {"max_tokens": config.local_output_tokens}
        return _call_claude(system_prompt, user_message, config)
    if llm.startswith("local"):
        if _audit is not None:
            _audit["model"] = config.local_analysis_model
            _audit["model_parameters"] = {
                "temperature": 0.1,
                "num_ctx": config.local_context_tokens,
                "num_predict": config.local_output_tokens,
                "format": "json",
                "think": False,
            }
        return _call_ollama(system_prompt, user_message, config, config.local_analysis_model)

    # litelm* or default: try lexicon-llm on Mac Studio
    resolved = model or config.litelm_enrichment_model
    if config.litelm_base_url:
        try:
            if _audit is not None:
                _audit["model"] = resolved
                _audit["model_parameters"] = {
                    "temperature": 0.1,
                    "max_tokens": config.local_output_tokens,
                }
            return _call_litelm(system_prompt, user_message, config, resolved)
        except Exception:
            if llm.startswith("litelm"):
                raise  # user explicitly asked for litelm — don't hide the error
            # fallback path: try local
    if raw is None:
        if _audit is not None:
            _audit["model"] = config.local_analysis_model
            _audit["model_parameters"] = {
                "temperature": 0.1,
                "num_ctx": config.local_context_tokens,
                "num_predict": config.local_output_tokens,
                "format": "json",
                "think": False,
            }
        return _call_ollama(system_prompt, user_message, config, config.local_analysis_model)
    return raw


def _run_chunked_enrichment(
    doc_id: str,
    preprocess: PreprocessResult,
    analysis: AnalysisResult,
    config: Config,
    llm: str,
    model: str | None,
    first_error: ValueError,
    retrieval_grounded: bool = False,
    *,
    _audit: dict | None = None,
) -> EnrichmentResult:
    system_prompt = _build_system_prompt_for_run(config, analysis, retrieval_grounded, _audit)
    chunks = _chunk_text(preprocess.text)
    results: list[EnrichmentResult] = []
    errors: list[str] = []

    if _audit is not None:
        _audit["chunked"] = True
        _audit["chunk_count"] = len(chunks)
        _audit["chunks"] = []
        # Preserve the whole-doc failure as context, but keep it out of errors
        # so the final audit is truthful about whether the run succeeded.
        _audit["whole_doc_fallback_reason"] = str(first_error)[:500]

    for index, chunk in enumerate(chunks, start=1):
        user_message = _build_user_message(
            doc_id,
            preprocess,
            text_override=chunk,
            chunk_label=f"section {index} of {len(chunks)}",
        )
        chunk_entry: dict | None = None
        _chunk_audit: dict | None = {} if _audit is not None else None
        if _chunk_audit is not None:
            _chunk_audit["prompt_sha256"] = _audit.get("prompt_sha256", "")
            _chunk_audit["prompt_template_sha256"] = _audit.get("prompt_template_sha256", "")
        if _audit is not None:
            chunk_entry = {
                "index": index,
                "char_count": len(chunk),
                "succeeded": False,
                "model": None,
                "validation_path": None,
                "validation_attempts": None,
                "normalization_repairs": None,
                "error": None,
            }
        try:
            raw = _call_enrichment_model(
                llm, system_prompt, user_message, config, model, _audit=_chunk_audit
            )
            results.append(_validate_response_for_run(
                doc_id,
                raw,
                llm,
                _chunk_audit,
                retrieval_grounded,
            ))
            if chunk_entry is not None and _chunk_audit is not None:
                chunk_entry["succeeded"] = True
                chunk_entry["model"] = _chunk_audit.get("model")
                chunk_entry["validation_path"] = _chunk_audit.get("validation_path")
                chunk_entry["validation_attempts"] = _chunk_audit.get("validation_attempts")
                chunk_entry["normalization_repairs"] = _chunk_audit.get("normalization_repairs", 0)
        except Exception as exc:
            errors.append(f"chunk {index}/{len(chunks)}: {exc}")
            if chunk_entry is not None:
                chunk_entry["error"] = str(exc)
                if _chunk_audit is not None:
                    chunk_entry["model"] = _chunk_audit.get("model")
                    chunk_entry["validation_path"] = _chunk_audit.get("validation_path")
                    chunk_entry["validation_attempts"] = _chunk_audit.get("validation_attempts")
        if _audit is not None and chunk_entry is not None:
            _audit["chunks"].append(chunk_entry)

    if not results:
        detail = "\n".join(errors[:5])
        if _audit is not None:
            _audit["validation_path"] = "failed"
            _audit["validation_attempts"] = 0
            _audit.setdefault("errors", []).append(
                f"All {len(chunks)} chunks failed enrichment"
            )
        raise ValueError(
            f"Whole-document enrichment failed, and chunked enrichment also failed.\n"
            f"Original error: {first_error}\n"
            f"Chunk errors:\n{detail}"
        )

    # Chunked run succeeded — write a truthful top-level audit state.
    if _audit is not None:
        _audit["validation_path"] = "chunked_fallback"
        _audit["validation_attempts"] = 0   # chunk-level attempts are in chunks[]
        _audit["normalization_repairs"] = sum(
            (c.get("normalization_repairs") or 0)
            for c in _audit["chunks"]
            if c.get("succeeded")
        )

    merged = _merge_enrichment_results(doc_id, llm, results)
    note = (
        f"Chunked enrichment fallback used after whole-document validation failed. "
        f"Successful chunks: {len(results)}/{len(chunks)}."
    )
    if errors:
        note += " Failed chunks: " + " | ".join(errors[:3])
    merged.researcher_notes = (merged.researcher_notes + "\n" + note).strip()
    return merged


def _chunk_text(text: str, max_chars: int = 10_000, overlap: int = 600) -> list[str]:
    if len(text) <= max_chars:
        return [text]
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(len(text), start + max_chars)
        if end < len(text):
            boundary = max(
                text.rfind("\n\n", start, end),
                text.rfind(". ", start, end),
            )
            if boundary > start + int(max_chars * 0.55):
                end = boundary + 1
        chunks.append(text[start:end].strip())
        if end >= len(text):
            break
        start = max(0, end - overlap)
    return [chunk for chunk in chunks if chunk]


def _merge_enrichment_results(
    doc_id: str,
    llm: str,
    results: list[EnrichmentResult],
) -> EnrichmentResult:
    merged = EnrichmentResult(
        doc_id=doc_id,
        enrichment_model=llm,
        enrichment_prompt_version=PROMPT_VERSION,
    )
    merged.lexicon_proposals = _dedupe(
        [item for result in results for item in result.lexicon_proposals],
        lambda item: (item.action, item.term.lower(), item.exact_quote[:120]),
    )
    merged.entity_proposals = _dedupe(
        [item for result in results for item in result.entity_proposals],
        lambda item: (item.entity_type, item.name.lower(), item.evidence_quote[:120]),
    )
    merged.tactic_proposals = _dedupe(
        [item for result in results for item in result.tactic_proposals],
        lambda item: (_normalized_tactic_key(item.tactic), item.evidence_quote[:120]),
    )
    merged.ingestion_queue = _dedupe(
        [item for result in results for item in result.ingestion_queue],
        lambda item: item.url,
    )
    merged.corpus_connections = _dedupe(
        [item for result in results for item in result.corpus_connections],
        lambda item: (item.doc_id, item.connection_type, item.shared_element.lower()),
    )
    merged.practice_descriptions = _dedupe(
        [item for result in results for item in result.practice_descriptions],
        lambda item: (item.practice_id.lower(), item.exact_description[:160]),
    )
    merged.statistical_claims = _dedupe(
        [item for result in results for item in result.statistical_claims],
        lambda item: item.claim.lower(),
    )
    merged.researcher_notes = "\n\n".join(
        _dedupe(
            [result.researcher_notes.strip() for result in results if result.researcher_notes.strip()],
            lambda item: item,
        )
    )
    return merged


def _dedupe(items: list, key_fn) -> list:
    seen: set[str] = set()
    deduped = []
    for item in items:
        key = json.dumps(key_fn(item), sort_keys=True, default=str)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped


# ---------------------------------------------------------------------------
# Prompt construction
# ---------------------------------------------------------------------------

def _build_system_prompt_for_run(
    config: Config,
    analysis: AnalysisResult,
    retrieval_grounded: bool,
    _audit: dict | None = None,
) -> str:
    """Build the enrichment prompt while tolerating older test doubles."""
    try:
        return _build_system_prompt(
            config,
            analysis,
            retrieval_grounded=retrieval_grounded,
            _audit=_audit,
        )
    except TypeError:
        try:
            return _build_system_prompt(
                config,
                analysis,
                retrieval_grounded=retrieval_grounded,
            )
        except TypeError:
            return _build_system_prompt(config, analysis)


def _build_system_prompt(
    config: Config,
    analysis: AnalysisResult,
    *,
    retrieval_grounded: bool = False,
    _audit: dict | None = None,
) -> str:
    base = _load_system_prompt()

    lexicon_block = "(not available — Sanity query failed)"
    entity_block  = "(not available — Sanity query failed)"

    # Stage 3c research memory: live Sanity draft+validated terms merged with
    # curated seed-draft and legacy-draft memory so the model can MATCH against
    # previous-system vocabulary even before it is pushed to Sanity. Seed/legacy
    # terms are labelled by source and are draft memory only — never validated by
    # being visible here. Sanity failure must NOT drop seed/legacy memory.
    sanity_terms: list[dict] = []
    try:
        sanity_terms = _fetch_lexicon_entries(config)
    except Exception:
        sanity_terms = []
    try:
        terms, _lex_counts = merge_enrichment_lexicon(sanity_terms)
        if _audit is not None:
            _audit["lexicon_terms_sanity"] = _lex_counts.get("sanity", 0)
            _audit["lexicon_terms_seed"] = _lex_counts.get("seed", 0)
            _audit["lexicon_terms_legacy"] = _lex_counts.get("legacy", 0)
            _audit["lexicon_terms_injected"] = _lex_counts.get("injected", 0)
        lexicon_block = (
            "\n".join(
                _format_lexicon_prompt_line(t)
                for t in terms
            ) or "(none yet)"
        )
    except Exception:
        pass

    try:
        entities = _fetch_entity_registry(config)
        entity_block = (
            "\n".join(
                f"- [{e.get('_type','?')}] {e.get('name','?')}"
                for e in entities
            ) or "(none yet)"
        )
    except Exception:
        pass

    related_docs_block = "(vector similarity deferred — not yet available)"
    if not retrieval_grounded:
        related_docs_block += (
            "\nIMPORTANT: No related corpus documents are available for this run. "
            "Return corpus_connections as an empty array []. Do not invent doc_ids."
        )

    injection = (
        f"\n\nCURRENT LEXICON MEMORY — match new wording against these known concepts. "
        f"Each line is tagged by source: [Sanity validated] and [Sanity draft] are live "
        f"registry entries; [seed draft] and [legacy draft] are curated previous-system "
        f"vocabulary not yet in Sanity. For any concept already listed here (any source), "
        f"prefer add_variant or add_evidence linking to it over proposing it again as add_new:\n"
        f"{lexicon_block}\n\n"
        f"CURRENT ENTITY REGISTRY (do not re-propose — use enrich_existing if found):\n"
        f"{entity_block}\n\n"
        f"RELATED CORPUS DOCUMENTS:\n{related_docs_block}\n\n"
        f"MAIN ANALYSIS RESULT:\n{_summarise_analysis(analysis)}"
    )
    return base + injection


def _build_user_message(
    doc_id: str,
    preprocess: PreprocessResult,
    text_override: str | None = None,
    chunk_label: str | None = None,
) -> str:
    lines = [f"DOCUMENT ID: {doc_id}"]
    if chunk_label:
        lines.append(f"DOCUMENT SECTION: {chunk_label}")
        lines.append(
            "IMPORTANT: Extract only proposals evidenced in this section. "
            "Do not infer proposals from sections you cannot see."
        )
    if preprocess.title:
        lines.append(f"TITLE: {preprocess.title}")
    if preprocess.author:
        lines.append(f"AUTHOR: {preprocess.author}")
    if preprocess.date_published:
        lines.append(f"DATE: {preprocess.date_published}")
    if preprocess.hostname:
        lines.append(f"SOURCE: {preprocess.hostname}")

    text = preprocess.text if text_override is None else text_override
    tag_block = ""
    try:
        from runner.pipeline.tag_registry import detect_tag_matches, format_matches_for_prompt
    except ImportError:
        from .tag_registry import detect_tag_matches, format_matches_for_prompt
    try:
        tag_block = format_matches_for_prompt(detect_tag_matches(text))
    except Exception:
        tag_block = ""

    tag_section = (
        "\n\nTAG REGISTRY MATCHES FOUND IN TEXT (use as connection hints, not proof):\n"
        + tag_block
        if tag_block else ""
    )

    return (
        "\n".join(lines)
        + tag_section
        + "\n\n---\n\nDOCUMENT TEXT:\n"
        + text
        + "\n\n---\n\n"
        "Output ONLY a valid JSON object. Start with { and end with }. "
        "No explanation, no prose, no markdown fences."
    )


def _summarise_analysis(analysis: AnalysisResult) -> str:
    lines = [
        f"type={analysis.type}",
        f"format={analysis.format}",
        f"confidence={analysis.confidence.status} ({analysis.confidence.overall_score:.2f})",
    ]
    if analysis.candidate_terms:
        terms_str = ", ".join(
            t.term for t in analysis.candidate_terms[:10]
        )
        lines.append(f"candidate_terms=[{terms_str}]")
    if analysis.suggested_actors:
        actors_str = ", ".join(
            a.name for a in analysis.suggested_actors[:5]
        )
        lines.append(f"suggested_actors=[{actors_str}]")
    if analysis.tactic:
        lines.append(f"tactics={analysis.tactic}")
    if analysis.summary:
        lines.append(f"summary={analysis.summary[:300]}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# LLM backends
# ---------------------------------------------------------------------------

def _call_litelm(system_prompt: str, user_message: str, config: Config, model: str) -> str:
    import httpx
    response = call_with_http_retries(lambda: httpx.post(
        f"{config.litelm_base_url}/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {config.litelm_api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_message},
            ],
            "temperature": 0.1,
            "max_tokens": config.local_output_tokens,
        },
        timeout=600,
    ))
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]


def _call_claude(system_prompt: str, user_message: str, config: Config) -> str:
    import anthropic
    client = anthropic.Anthropic(api_key=config.anthropic_api_key)
    response = client.messages.create(
        model=config.claude_model,
        max_tokens=config.local_output_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    return response.content[0].text


def _call_ollama(
    system_prompt: str, user_message: str, config: Config, model: str
) -> str:
    import httpx
    response = call_with_http_retries(lambda: httpx.post(
        f"{config.ollama_base_url}/api/chat",
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_message},
            ],
            "stream": False,
            "keep_alive": 0,
            "format": "json",
            "think": False,
            "options": {
                "temperature": 0.1,
                "num_ctx": config.local_context_tokens,
                "num_predict": config.local_output_tokens,
            },
        },
        timeout=600,
    ))
    response.raise_for_status()
    msg = response.json()["message"]
    raw = msg.get("content", "").strip() or msg.get("thinking", "")
    if not raw:
        raise ValueError(
            f"Ollama returned empty response for enrichment. "
            f"Message keys: {list(msg.keys())}"
        )
    return raw


# ---------------------------------------------------------------------------
# Sanity queries
# ---------------------------------------------------------------------------

def _fetch_lexicon_entries(config: Config) -> list[dict]:
    return fetch_active_lexicon_terms(config)


def _lexicon_source_label(term: dict) -> str:
    """Human-readable source/status tag for a memory term in the prompt."""
    source = (term.get("source") or "sanity").lower()
    if source == "seed":
        return "seed draft"
    if source == "legacy":
        return "legacy draft"
    status = term.get("status") or "draft"
    return f"Sanity {status}"


def _format_lexicon_prompt_line(term: dict) -> str:
    variants = term.get("multilingualVariants") or []
    variant_text = ", ".join(
        f"{v.get('variantTerm')}[{v.get('language', 'unknown')}]"
        for v in variants[:12]
        if v.get("variantTerm")
    )
    suffix = f"; variants: {variant_text}" if variant_text else ""
    return (
        f"- [{_lexicon_source_label(term)}] {term['term']} "
        f"(cluster={term.get('proposedCluster','?')}, "
        f"function={term.get('function','?')}{suffix})"
    )


def _fetch_entity_registry(config: Config) -> list[dict]:
    import httpx
    query = '*[_type in ["organization","person"]]{ _type, name }'
    url = (
        f"https://{config.sanity_project_id}.api.sanity.io"
        f"/v2024-01-01/data/query/{config.sanity_dataset}"
    )
    r = httpx.get(
        url,
        params={"query": query},
        headers=sanity_read_headers(config),
        timeout=10,
    )
    r.raise_for_status()
    return r.json().get("result", [])


# ---------------------------------------------------------------------------
# Response validation
# ---------------------------------------------------------------------------

def _validate_response_for_run(
    doc_id: str,
    raw: str,
    llm: str,
    audit: dict | None,
    retrieval_grounded: bool,
) -> EnrichmentResult:
    """Validate enrichment output while tolerating older test doubles."""
    try:
        return _validate_response(
            doc_id,
            raw,
            llm,
            retrieval_grounded=retrieval_grounded,
            _audit=audit,
        )
    except TypeError:
        return _validate_response(doc_id, raw, llm, _audit=audit)

def _first_json_object(text: str) -> dict | None:
    """Return the first complete JSON object in text.

    A regex like ``{.*}`` is brittle with LLM output because it greedily grabs
    explanatory text after the object, or braces inside prose. The decoder can
    stop at the exact end of the first complete object.
    """
    cleaned = re.sub(r"^```(?:json)?\s*", "", text.strip())
    cleaned = re.sub(r"\s*```$", "", cleaned.strip())
    decoder = json.JSONDecoder()
    for match in re.finditer(r"\{", cleaned):
        try:
            data, _end = decoder.raw_decode(cleaned[match.start():])
        except json.JSONDecodeError:
            continue
        if isinstance(data, dict):
            return data
    return None


def _as_string(value, default: str = "") -> str:
    if value is None:
        return default
    if isinstance(value, str):
        return value
    return str(value)


def _as_string_list(value) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [_as_string(item).strip() for item in value if _as_string(item).strip()]
    text = _as_string(value).strip()
    return [text] if text else []


def _as_object_list(value) -> list[dict]:
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, dict)]


def _enum(value, allowed: set[str], default: str, aliases: dict[str, str] | None = None) -> str:
    text = _as_string(value, default).strip()
    if aliases and text in aliases:
        text = aliases[text]
    return text if text in allowed else default


def _normalize_enrichment_payload(
    data: dict,
    *,
    doc_id: str = "",
    retrieval_grounded: bool = False,
) -> tuple[dict, int]:
    """Make common LLM schema drift reviewable instead of fatal.

    Returns (normalized_data, repair_count) where repair_count is the number
    of enum values that fell back to a default because the model's value was
    not in the allowed set. Enrichment proposals are not final facts; they are
    queued for researcher review.

    doc_id is stamped onto each NetworkConnection as attested_in_doc so that
    edges carry provenance even after being extracted from their parent proposal.
    """
    _repairs = 0

    def _renum(value, allowed: set[str], default: str, aliases: dict[str, str] | None = None) -> str:
        nonlocal _repairs
        text = _as_string(value, default).strip()
        if aliases and text in aliases:
            text = aliases[text]
        if text not in allowed:
            _repairs += 1
            return default
        return text

    def _repair_confidence_fields(item: dict) -> None:
        nonlocal _repairs
        for key in ("model_confidence", "researcher_confidence"):
            if key not in item:
                continue
            value = item.get(key)
            if value in (None, ""):
                item[key] = None
                continue
            try:
                score = float(value)
            except (TypeError, ValueError):
                item[key] = None
                _repairs += 1
                continue
            bounded = max(0.0, min(1.0, score))
            if bounded != score or not isinstance(value, (int, float)):
                _repairs += 1
            item[key] = bounded
        if "confidence_rationale" in item:
            item["confidence_rationale"] = _as_string(item.get("confidence_rationale"))

    def _repair_known_lexicon_variant(item: dict) -> None:
        """Route narrow, known previous-system variants to their canonical target."""
        nonlocal _repairs
        if item.get("action") != "add_new":
            return
        term = _as_string(item.get("term")).casefold()
        if (
            "discordance between" not in term
            or "sex" not in term
            or ("perceived sex" not in term and "perceived gender" not in term)
        ):
            return
        item["action"] = "add_variant"
        item["existing_entry_id"] = _GENDER_DYSPHORIA_CANONICAL_ID
        item["existing_entry_term"] = _GENDER_DYSPHORIA_CANONICAL_TERM
        item["target_origin"] = item.get("target_origin") or "seed"
        variant_term = _as_string(item.get("term"))
        variants = _as_object_list(item.get("variants"))
        seen_variants = {
            _as_string(row.get("variant_term")).casefold()
            for row in variants
        }
        if variant_term and variant_term.casefold() not in seen_variants:
            variants.insert(0, {
                "variant_term": variant_term,
                "language": _as_string(item.get("language"), "en") or "en",
                "attestation_tier": "tier-3-inferred",
                "source_note": _as_string(item.get("exact_quote")),
            })
            item["variants"] = variants
        _repairs += 1

    _now_str = _now_iso()   # single timestamp for the whole normalization pass

    normalized = dict(data)
    for key in (
        "lexicon_proposals",
        "entity_proposals",
        "tactic_proposals",
        "ingestion_queue",
        "corpus_connections",
        "practice_descriptions",
        "statistical_claims",
    ):
        normalized[key] = _as_object_list(normalized.get(key, []))

    for item in normalized["lexicon_proposals"]:
        _repair_confidence_fields(item)
        item["action"] = _renum(item.get("action"), _LEXICON_ACTIONS, "add_new")
        item["term"] = _as_string(item.get("term"))
        item["language"] = _as_string(item.get("language"), "en") or "en"
        item["proposed_cluster"] = _renum(item.get("proposed_cluster"), _LEXICON_CLUSTERS, "Unknown")
        item["function"] = _renum(
            item.get("function"),
            _LEXICON_FUNCTIONS,
            "Unknown",
            aliases=_LEXICON_FUNCTION_ALIASES,
        )
        register_value = item.get("usage_register", item.get("register"))
        item["register"] = _renum(register_value, _USAGE_REGISTERS, "neutral")
        item["exact_quote"] = _as_string(item.get("exact_quote"))
        item["definition_as_used"] = _as_string(item.get("definition_as_used"))
        item["variants"] = _as_object_list(item.get("variants"))
        _repair_known_lexicon_variant(item)
        item["co_occurring_terms"] = _as_string_list(item.get("co_occurring_terms"))
        relationships = []
        for relationship in _as_object_list(item.get("relationships")):
            relationship["existing_term"] = _as_string(relationship.get("existing_term"))
            relationship["relationship"] = _renum(
                relationship.get("relationship"),
                _TERM_RELATIONSHIPS,
                "co_occurs_with",
            )
            relationship["evidence"] = _as_string(relationship.get("evidence"))
            relationships.append(relationship)
        item["relationships"] = relationships

    for item in normalized["entity_proposals"]:
        _repair_confidence_fields(item)
        item["action"] = _renum(item.get("action"), _ENTITY_ACTIONS, "add_new")
        item["entity_type"] = _renum(item.get("entity_type"), _ENTITY_TYPES, "organization")
        item["name"] = _as_string(item.get("name"))
        item["self_description"] = _as_string(item.get("self_description"))
        item["evidence_quote"] = _as_string(item.get("evidence_quote"))
        item["role_in_sogice"] = _as_string(item.get("role_in_sogice"))
        inferred_registry_fit = infer_entity_registry_fit(item)
        item["registry_fit"] = _renum(
            item.get("registry_fit") or inferred_registry_fit,
            _ENTITY_REGISTRY_FITS,
            inferred_registry_fit,
        )
        item["registry_fit_rationale"] = _as_string(item.get("registry_fit_rationale"))
        if item["registry_fit"] == "media_or_source" and not item["registry_fit_rationale"]:
            item["registry_fit_rationale"] = (
                "Looks like a media/source/project rather than an "
                "organization/person registry record."
            )
        for key in (
            "activities_stated",
            "geographic_scope",
            "legal_entities_mentioned",
            "claims_made",
            "affiliated_orgs",
        ):
            item[key] = _as_string_list(item.get(key))
        item["network_connections"] = _as_object_list(item.get("network_connections"))
        for connection in item["network_connections"]:
            connection["entity_name"] = _as_string(connection.get("entity_name"))
            # Capture original value before normalization to detect repairs.
            _ct_raw = _as_string(connection.get("connection_type")).strip()
            if _ct_raw and _ct_raw not in _NETWORK_CONNECTIONS:
                _repairs += 1
                raw_key = _ct_raw.lower().replace("-", "_").replace(" ", "_")
                role_keys = {
                    value.lower().replace("-", "_").replace(" ", "_")
                    for value in _PERSON_ROLE_CONNECTION_HINTS
                }
                repair_target = "affiliate" if raw_key in role_keys else "partner"
                connection["connection_type"] = repair_target
                connection["invalid_connection_type"] = _ct_raw
                connection["connection_repair_status"] = "needs_review"
                connection["repair_note"] = (
                    f"Invalid connection type: {_ct_raw}. "
                    f"Current local type: {repair_target}. "
                    "Choose an allowed type or move this relation to "
                    "key_individuals / affiliated_orgs."
                )
            else:
                connection["connection_type"] = _renum(
                    connection.get("connection_type"),
                    _NETWORK_CONNECTIONS,
                    "partner",
                )
                connection["invalid_connection_type"] = _as_string(
                    connection.get("invalid_connection_type")
                )
                connection["connection_repair_status"] = (
                    "needs_review"
                    if connection.get("repair_note") or connection.get("invalid_connection_type")
                    else "valid"
                )
            connection["evidence_quote"] = _as_string(connection.get("evidence_quote"))
            # Stamp provenance: preserve existing value (e.g. from merged runs);
            # always ensure the key is present so downstream dicts are consistent.
            if not connection.get("attested_in_doc"):
                connection["attested_in_doc"] = doc_id
        item["key_individuals"] = _as_object_list(item.get("key_individuals"))
        for person in item["key_individuals"]:
            person["name"] = _as_string(person.get("name"))
            person["role"] = _as_string(person.get("role"))
            person["quote"] = _as_string(person.get("quote"))

    for item in normalized["tactic_proposals"]:
        _repair_confidence_fields(item)
        item["action"] = _renum(item.get("action"), _ENTITY_ACTIONS, "add_new")
        item["tactic"] = _as_string(item.get("tactic"))
        item["tactic_level"] = _renum(item.get("tactic_level"), _TACTIC_LEVELS, "structural")

    normalized["ingestion_queue"] = [
        item
        for item in normalized["ingestion_queue"]
        if _as_string(item.get("url")).strip()
    ]
    for item in normalized["ingestion_queue"]:
        item["url"] = _as_string(item.get("url"))
        item["source_type"] = _renum(item.get("source_type"), _INGESTION_SOURCE_TYPES, "unknown")
        item["priority"] = _renum(item.get("priority"), _PRIORITIES, "medium")

    if not retrieval_grounded:
        normalized["corpus_connections"] = []
    else:
        normalized["corpus_connections"] = [
            item
            for item in normalized["corpus_connections"]
            if _as_string(item.get("doc_id")).strip() and _as_string(item.get("shared_element")).strip()
        ]
        for item in normalized["corpus_connections"]:
            item["doc_id"] = _as_string(item.get("doc_id"))
            item["connection_type"] = _renum(
                item.get("connection_type"),
                _CORPUS_CONNECTION_TYPES,
                "same_term",
            )
            item["shared_element"] = _as_string(item.get("shared_element"))
            item["evidence"] = _as_string(item.get("evidence"))
            item["is_retrieval_grounded"] = True

    normalized["practice_descriptions"] = [
        item
        for item in normalized["practice_descriptions"]
        if _as_string(item.get("practice_id")).strip() and _as_string(item.get("exact_description")).strip()
    ]
    for item in normalized["practice_descriptions"]:
        _repair_confidence_fields(item)
        item["practice_id"] = _as_string(item.get("practice_id"))
        item["exact_description"] = _as_string(item.get("exact_description"))
        item["existing_practice_id"] = _as_string(item.get("existing_practice_id"))
        item["practice_cluster"] = _as_string(
            item.get("practice_cluster") or infer_practice_cluster(item)
        )
        inferred_practice_fit = infer_practice_fit(item)
        item["practice_fit"] = _renum(
            item.get("practice_fit") or inferred_practice_fit,
            _PRACTICE_FITS,
            inferred_practice_fit,
        )
        item["practice_fit_rationale"] = _as_string(item.get("practice_fit_rationale"))
        if item["practice_fit"] == "needs_clustering" and not item["practice_fit_rationale"]:
            item["practice_fit_rationale"] = (
                "Model-created practice label held as evidence until it is "
                "clustered, linked to an existing practice, or promoted."
            )
        item["harm_stance"] = _renum(item.get("harm_stance"), _HARM_STANCES, "not_mentioned")

    normalized["statistical_claims"] = [
        item
        for item in normalized["statistical_claims"]
        if _as_string(item.get("claim")).strip()
    ]
    for item in normalized["statistical_claims"]:
        _repair_confidence_fields(item)
        item["claim"] = _as_string(item.get("claim"))
        item["source_cited"] = _as_string(item.get("source_cited"))
        item["context"] = _as_string(item.get("context"))
        item["verification_status"] = _renum(
            item.get("verification_status"), _VERIFICATION_STATUSES, "unverified"
        )

    # P1/P2: Assign stable proposal identities and lifecycle status.
    # Done as a second pass after normalization so IDs are keyed on clean
    # field values (e.g. title-cased term, normalised action).
    # Existing proposal_id values are preserved (never overwritten).
    for item in normalized["lexicon_proposals"]:
        if not item.get("proposal_id"):
            item["proposal_id"] = _generate_proposal_id("lexicon", doc_id, item)
        if not item.get("proposal_created_at"):
            item["proposal_created_at"] = _now_str
        item["proposal_updated_at"] = _now_str
        item["proposal_status"] = _derive_proposal_status(item)

    for item in normalized["entity_proposals"]:
        if not item.get("proposal_id"):
            item["proposal_id"] = _generate_proposal_id("entity", doc_id, item)
        if not item.get("proposal_created_at"):
            item["proposal_created_at"] = _now_str
        item["proposal_updated_at"] = _now_str
        item["proposal_status"] = _derive_proposal_status(item)

    for item in normalized["tactic_proposals"]:
        if not item.get("proposal_id"):
            item["proposal_id"] = _generate_proposal_id("tactic", doc_id, item)
        if not item.get("proposal_created_at"):
            item["proposal_created_at"] = _now_str
        item["proposal_updated_at"] = _now_str
        item["proposal_status"] = _derive_proposal_status(item)

    for item in normalized["practice_descriptions"]:
        if not item.get("proposal_id"):
            item["proposal_id"] = _generate_proposal_id("practice", doc_id, item)
        if not item.get("proposal_created_at"):
            item["proposal_created_at"] = _now_str
        item["proposal_updated_at"] = _now_str
        item["proposal_status"] = _derive_proposal_status(item)

    for item in normalized["statistical_claims"]:
        if not item.get("proposal_id"):
            item["proposal_id"] = _generate_proposal_id("claim", doc_id, item)
        if not item.get("proposal_created_at"):
            item["proposal_created_at"] = _now_str
        item["proposal_updated_at"] = _now_str
        item["proposal_status"] = _derive_proposal_status(item)

    return normalized, _repairs


def _validate_response(
    doc_id: str,
    raw: str,
    llm: str,
    *,
    retrieval_grounded: bool = False,
    _audit: dict | None = None,
) -> EnrichmentResult:
    original = raw.strip()
    validation_errors: list[str] = []
    _attempts = 0
    _repairs = 0

    def _try(text: str) -> EnrichmentResult | None:
        nonlocal _repairs
        data = _first_json_object(text)
        if data is None:
            return None
        try:
            data["doc_id"] = doc_id
            data["enrichment_model"] = llm
            data["enrichment_prompt_version"] = PROMPT_VERSION
            data, repairs = _normalize_enrichment_payload(
                data,
                doc_id=doc_id,
                retrieval_grounded=retrieval_grounded,
            )
            _repairs += repairs
            return EnrichmentResult.model_validate(data)
        except Exception as exc:
            validation_errors.append(str(exc))
            return None

    # Try outside think tags first
    _attempts += 1
    outside = re.sub(r"<think>.*?</think>", "", original, flags=re.DOTALL).strip()
    result = _try(outside)
    if result:
        if _audit is not None:
            _audit["validation_path"] = "outside_think_tags"
            _audit["validation_attempts"] = _attempts
            _audit["normalization_repairs"] = _audit.get("normalization_repairs", 0) + _repairs
        return result

    # Try inside think tags (model embedded JSON in reasoning)
    for block in re.findall(r"<think>(.*?)</think>", original, re.DOTALL):
        _attempts += 1
        result = _try(block)
        if result:
            if _audit is not None:
                _audit["validation_path"] = "inside_think_tags"
                _audit["validation_attempts"] = _attempts
                _audit["normalization_repairs"] = _audit.get("normalization_repairs", 0) + _repairs
            return result

    # Try raw
    _attempts += 1
    result = _try(original)
    if result:
        if _audit is not None:
            _audit["validation_path"] = "raw"
            _audit["validation_attempts"] = _attempts
            _audit["normalization_repairs"] = _audit.get("normalization_repairs", 0) + _repairs
        return result

    detail = ""
    if validation_errors:
        detail = "\nValidation details:\n" + "\n---\n".join(validation_errors[-3:])

    if _audit is not None:
        _audit["validation_path"] = "failed"
        _audit["validation_attempts"] = _attempts
        _audit.setdefault("errors", []).append(
            f"Could not extract valid EnrichmentResult JSON after {_attempts} attempt(s)"
        )

    raise ValueError(
        f"Could not extract valid EnrichmentResult JSON.\n"
        f"{detail}\n"
        f"Raw response (first 2 000 chars): {original[:2000]}"
    )
