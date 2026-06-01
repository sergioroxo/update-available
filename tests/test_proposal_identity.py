"""
Tests for proposal identity (P1), lifecycle status (P2), and merge-aware
re-enrichment (P3).

Covers:
  - _generate_proposal_id: determinism, domain separation, prefix format
  - _normalize_enrichment_payload: ID/timestamp assignment, existing-ID
    preservation, proposal_status derivation
  - _derive_proposal_status: all four states, precedence rules
  - _merge_researcher_state: approval/rejection/push/note/created_at
    preservation, appending dropped proposals, backward-compat, entity IDs
  - save(): integration test via tmp_path
  - NetworkConnection repair_note: set on invalid type, absent on valid type
  - _proposal_id_candidates: triple-fallback ordering and deduplication
  - _merge_existing_proposal_with_fresh: old-as-base semantics
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pytest

from runner.pipeline.enrich import (
    _apply_researcher_fields,
    _build_old_proposal_index,
    _derive_proposal_status,
    _generate_proposal_id,
    _generate_legacy_proposal_id,
    _merge_existing_proposal_with_fresh,
    _merge_researcher_state,
    _normalize_enrichment_payload,
    _proposal_id_candidates,
    _proposal_semantic_key,
    save as enrich_save,
)
from runner.models.enrichment import (
    EnrichmentResult,
    EntityProposal,
    LexiconProposal,
    StatisticalClaim,
    TacticProposal,
)


# ---------------------------------------------------------------------------
# Helpers shared across test classes
# ---------------------------------------------------------------------------

def _minimal_payload(**overrides) -> dict:
    """Return a minimal valid payload dict for _normalize_enrichment_payload."""
    base = {
        "lexicon_proposals": [],
        "entity_proposals": [],
        "tactic_proposals": [],
        "ingestion_queue": [],
        "corpus_connections": [],
        "practice_descriptions": [],
        "statistical_claims": [],
    }
    base.update(overrides)
    return base


def _lex_item(term: str = "Test Term", action: str = "add_new", **kw) -> dict:
    return {"action": action, "term": term, "exact_quote": "some quote", **kw}


def _entity_item(name: str = "Test Org", etype: str = "organization", **kw) -> dict:
    return {"action": "add_new", "entity_type": etype, "name": name, **kw}


def _pid_for_lex(doc_id: str, term: str, action: str = "add_new") -> str:
    return _generate_proposal_id("lexicon", doc_id, {"action": action, "term": term.lower()})


def _pid_for_entity(
    doc_id: str,
    name: str,
    etype: str = "organization",
    action: str = "add_new",
) -> str:
    return _generate_proposal_id(
        "entity",
        doc_id,
        {"action": action, "entity_type": etype, "name": name.lower()},
    )


# ---------------------------------------------------------------------------
# P1: Stable proposal identity
# ---------------------------------------------------------------------------

class TestGenerateProposalId:
    def test_deterministic_same_inputs_lexicon(self):
        item = {"action": "add_new", "term": "reparative therapy"}
        assert (
            _generate_proposal_id("lexicon", "doc-abc", item)
            == _generate_proposal_id("lexicon", "doc-abc", item)
        )

    def test_deterministic_same_inputs_entity(self):
        item = {"entity_type": "organization", "name": "segm"}
        assert (
            _generate_proposal_id("entity", "doc-abc", item)
            == _generate_proposal_id("entity", "doc-abc", item)
        )

    def test_prefix_and_length(self):
        pid = _generate_proposal_id("lexicon", "doc-abc", {"action": "add_new", "term": "test"})
        assert pid.startswith("prop-")
        assert len(pid) == len("prop-") + 16

    def test_varies_by_doc_id(self):
        item = {"action": "add_new", "term": "reparative therapy"}
        assert (
            _generate_proposal_id("lexicon", "doc-abc", item)
            != _generate_proposal_id("lexicon", "doc-xyz", item)
        )

    def test_varies_by_family(self):
        item = {
            "action": "add_new",
            "term": "test",
            "entity_type": "organization",
            "name": "test",
            "tactic": "test",
            "practice_id": "test",
            "claim": "test",
        }
        ids = {
            _generate_proposal_id(f, "doc-abc", item)
            for f in ["lexicon", "entity", "tactic", "practice", "claim"]
        }
        assert len(ids) == 5, "Each family must produce a distinct ID"

    def test_case_insensitive_term(self):
        """Semantic key normalises to lower-case so case variants match."""
        id_title = _generate_proposal_id("lexicon", "doc-abc", {"action": "add_new", "term": "Reparative Therapy"})
        id_lower = _generate_proposal_id("lexicon", "doc-abc", {"action": "add_new", "term": "reparative therapy"})
        assert id_title == id_lower

    def test_entity_name_case_insensitive(self):
        id1 = _generate_proposal_id("entity", "doc-x", {"action": "add_new", "entity_type": "organization", "name": "SEGM"})
        id2 = _generate_proposal_id("entity", "doc-x", {"action": "add_new", "entity_type": "organization", "name": "segm"})
        assert id1 == id2

    def test_lexicon_language_affects_identity(self):
        id_en = _generate_proposal_id("lexicon", "doc-x", {"action": "add_new", "term": "conversion", "language": "en"})
        id_no = _generate_proposal_id("lexicon", "doc-x", {"action": "add_new", "term": "conversion", "language": "no"})
        assert id_en != id_no

    def test_entity_action_affects_identity(self):
        id_new = _generate_proposal_id("entity", "doc-x", {"action": "add_new", "entity_type": "organization", "name": "SEGM"})
        id_existing = _generate_proposal_id("entity", "doc-x", {"action": "enrich_existing", "entity_type": "organization", "name": "SEGM"})
        assert id_new != id_existing


class TestNormalizePayloadIdentity:
    """_normalize_enrichment_payload assigns proposal_id and timestamps."""

    def test_proposal_id_assigned_to_lexicon(self):
        data, _ = _normalize_enrichment_payload(
            _minimal_payload(lexicon_proposals=[_lex_item()]),
            doc_id="doc-1",
        )
        pid = data["lexicon_proposals"][0]["proposal_id"]
        assert pid and pid.startswith("prop-")

    def test_proposal_id_assigned_to_entity(self):
        data, _ = _normalize_enrichment_payload(
            _minimal_payload(entity_proposals=[_entity_item()]),
            doc_id="doc-1",
        )
        pid = data["entity_proposals"][0]["proposal_id"]
        assert pid and pid.startswith("prop-")

    def test_proposal_created_at_is_valid_iso(self):
        data, _ = _normalize_enrichment_payload(
            _minimal_payload(lexicon_proposals=[_lex_item()]),
            doc_id="doc-1",
        )
        ts = data["lexicon_proposals"][0]["proposal_created_at"]
        assert ts is not None
        datetime.fromisoformat(ts)  # raises if not valid ISO

    def test_proposal_updated_at_is_valid_iso(self):
        data, _ = _normalize_enrichment_payload(
            _minimal_payload(lexicon_proposals=[_lex_item()]),
            doc_id="doc-1",
        )
        ts = data["lexicon_proposals"][0]["proposal_updated_at"]
        assert ts is not None
        datetime.fromisoformat(ts)

    def test_existing_proposal_id_preserved(self):
        """A proposal that already carries a proposal_id must keep it."""
        item = _lex_item()
        item["proposal_id"] = "prop-existing-00000000"
        data, _ = _normalize_enrichment_payload(
            _minimal_payload(lexicon_proposals=[item]),
            doc_id="doc-1",
        )
        assert data["lexicon_proposals"][0]["proposal_id"] == "prop-existing-00000000"

    def test_existing_created_at_preserved(self):
        """proposal_created_at from a prior run must never be overwritten."""
        original = "2024-01-15T12:00:00+00:00"
        item = _lex_item()
        item["proposal_created_at"] = original
        data, _ = _normalize_enrichment_payload(
            _minimal_payload(lexicon_proposals=[item]),
            doc_id="doc-1",
        )
        assert data["lexicon_proposals"][0]["proposal_created_at"] == original


# ---------------------------------------------------------------------------
# P2: Lifecycle status
# ---------------------------------------------------------------------------

class TestDeriveProposalStatus:
    def test_pending_when_all_defaults(self):
        assert _derive_proposal_status({}) == "pending"

    def test_approved(self):
        assert _derive_proposal_status({"approved": True}) == "approved"

    def test_rejected(self):
        assert _derive_proposal_status({"rejected": True}) == "rejected"

    def test_pushed_wins_over_approved(self):
        assert _derive_proposal_status({"approved": True, "pushed_to_sanity": True}) == "pushed"

    def test_pushed_wins_over_rejected(self):
        # Defensive: pushed_to_sanity always wins regardless of rejected flag
        assert _derive_proposal_status({"rejected": True, "pushed_to_sanity": True}) == "pushed"


class TestNormalizePayloadStatus:
    def test_new_proposal_status_is_pending(self):
        data, _ = _normalize_enrichment_payload(
            _minimal_payload(entity_proposals=[_entity_item()]),
            doc_id="doc-1",
        )
        assert data["entity_proposals"][0]["proposal_status"] == "pending"

    def test_pre_approved_proposal_status_is_approved(self):
        item = _entity_item()
        item["approved"] = True
        data, _ = _normalize_enrichment_payload(
            _minimal_payload(entity_proposals=[item]),
            doc_id="doc-1",
        )
        assert data["entity_proposals"][0]["proposal_status"] == "approved"

    def test_pre_pushed_proposal_status_is_pushed(self):
        item = _lex_item()
        item["pushed_to_sanity"] = True
        data, _ = _normalize_enrichment_payload(
            _minimal_payload(lexicon_proposals=[item]),
            doc_id="doc-1",
        )
        assert data["lexicon_proposals"][0]["proposal_status"] == "pushed"


# ---------------------------------------------------------------------------
# P3: Merge-aware re-enrichment
# ---------------------------------------------------------------------------

class TestBuildOldProposalIndex:
    def test_indexes_by_proposal_id(self):
        old = [{"proposal_id": "prop-aabbccdd00112233", "term": "X", "action": "add_new"}]
        idx = _build_old_proposal_index(old, "lexicon", "doc-1")
        assert "prop-aabbccdd00112233" in idx

    def test_generates_id_for_proposals_without_one(self):
        """Backward compat: old proposals without proposal_id still get indexed."""
        old = [{"action": "add_new", "term": "Historical Term"}]
        idx = _build_old_proposal_index(old, "lexicon", "doc-1")
        assert idx
        assert all(pid.startswith("prop-") for pid in idx)
        assert set(map(id, idx.values())) == {id(old[0])}

    def test_skips_non_dict_entries(self):
        old = [None, "string", {"proposal_id": "prop-valid0000000001", "name": "Org"}]
        idx = _build_old_proposal_index(old, "entity", "doc-1")
        assert idx
        assert set(map(id, idx.values())) == {id(old[2])}

    def test_reviewed_alias_wins_over_unreviewed_duplicate(self):
        """When old identity aliases collide, keep the reviewed local proposal."""
        old = [
            {
                "action": "enrich_existing",
                "entity_type": "person",
                "name": "Avi Ring",
                "proposal_id": _generate_proposal_id(
                    "entity",
                    "doc-1",
                    {"action": "enrich_existing", "entity_type": "person", "name": "Avi Ring"},
                ),
            },
            {
                "action": "add_new",
                "entity_type": "person",
                "name": "Avi Ring",
                "approved": True,
            },
        ]
        idx = _build_old_proposal_index(old, "entity", "doc-1")
        legacy = _generate_legacy_proposal_id("entity", "doc-1", old[0])
        assert idx[legacy]["action"] == "add_new"
        assert idx[legacy]["approved"] is True


class TestApplyResearcherFields:
    def test_carries_approved(self):
        new = {"approved": False, "rejected": False, "pushed_to_sanity": False}
        old = {"approved": True}
        result = _apply_researcher_fields(new.copy(), old, frozenset())
        assert result["approved"] is True

    def test_carries_researcher_note_even_when_empty(self):
        new = {"researcher_note": "new default"}
        old = {"researcher_note": ""}
        result = _apply_researcher_fields(new.copy(), old, frozenset({"researcher_note"}))
        # Empty string from old should overwrite non-empty default in new
        # (researcher deliberately cleared the note)
        assert result["researcher_note"] == ""

    def test_always_carries_proposal_created_at(self):
        new = {"proposal_created_at": "2025-06-01T00:00:00+00:00"}
        old = {"proposal_created_at": "2024-01-01T00:00:00+00:00"}
        result = _apply_researcher_fields(new.copy(), old, frozenset())
        assert result["proposal_created_at"] == "2024-01-01T00:00:00+00:00"

    def test_carries_extra_field_existing_entity_id(self):
        new = {}
        old = {"existing_entity_id": "organization-segm"}
        result = _apply_researcher_fields(new.copy(), old, frozenset({"existing_entity_id"}))
        assert result["existing_entity_id"] == "organization-segm"

    def test_rederives_proposal_status(self):
        new = {"approved": False, "rejected": False, "pushed_to_sanity": False}
        old = {"approved": True}
        result = _apply_researcher_fields(new.copy(), old, frozenset())
        assert result["proposal_status"] == "approved"


class TestMergeResearcherState:
    """End-to-end merge logic via _merge_researcher_state."""

    def _old_data(self, doc_id: str, proposals: list[dict]) -> dict:
        return {
            "doc_id": doc_id,
            "lexicon_proposals": proposals,
            "entity_proposals": [],
            "tactic_proposals": [],
            "ingestion_queue": [],
            "corpus_connections": [],
            "practice_descriptions": [],
            "statistical_claims": [],
        }

    def _new_result(self, doc_id: str, proposals: list[LexiconProposal]) -> EnrichmentResult:
        return EnrichmentResult(doc_id=doc_id, lexicon_proposals=proposals)

    def _lex_proposal(self, doc_id: str, term: str, **kw) -> LexiconProposal:
        pid = _pid_for_lex(doc_id, term)
        return LexiconProposal(
            action="add_new",
            term=term,
            exact_quote="fresh quote from new run",
            proposal_id=pid,
            **kw,
        )

    # --- approval ---

    def test_preserves_approval(self):
        doc_id = "doc-p3a"
        term = "Reparative Therapy"
        pid = _pid_for_lex(doc_id, term)
        new_result = self._new_result(doc_id, [self._lex_proposal(doc_id, term)])
        old_data = self._old_data(doc_id, [
            {"action": "add_new", "term": term, "proposal_id": pid,
             "approved": True, "researcher_note": "confirmed by researcher"},
        ])
        merged, summary = _merge_researcher_state(new_result, old_data, doc_id)
        assert merged.lexicon_proposals[0].approved is True
        assert merged.lexicon_proposals[0].researcher_note == "confirmed by researcher"
        assert summary["carried_forward"] == 1
        assert summary["new_proposals"] == 0

    def test_preserves_rejection(self):
        doc_id = "doc-p3b"
        term = "Ex-Gay"
        pid = _pid_for_lex(doc_id, term)
        new_result = self._new_result(doc_id, [self._lex_proposal(doc_id, term)])
        old_data = self._old_data(doc_id, [
            {"action": "add_new", "term": term, "proposal_id": pid, "rejected": True},
        ])
        merged, _ = _merge_researcher_state(new_result, old_data, doc_id)
        assert merged.lexicon_proposals[0].rejected is True
        assert merged.lexicon_proposals[0].proposal_status == "rejected"

    def test_preserves_pushed_state_and_sanity_id(self):
        doc_id = "doc-p3c"
        term = "Unwanted SSA"
        pid = _pid_for_lex(doc_id, term)
        new_result = self._new_result(doc_id, [self._lex_proposal(doc_id, term)])
        old_data = self._old_data(doc_id, [
            {"action": "add_new", "term": term, "proposal_id": pid,
             "pushed_to_sanity": True, "sanity_id": "lexicon-unwanted-ssa"},
        ])
        merged, _ = _merge_researcher_state(new_result, old_data, doc_id)
        assert merged.lexicon_proposals[0].pushed_to_sanity is True
        assert merged.lexicon_proposals[0].sanity_id == "lexicon-unwanted-ssa"
        assert merged.lexicon_proposals[0].proposal_status == "pushed"

    def test_preserves_proposal_created_at(self):
        doc_id = "doc-p3d"
        term = "Orientation Change"
        pid = _pid_for_lex(doc_id, term)
        original_ts = "2024-01-01T00:00:00+00:00"
        new_result = self._new_result(doc_id, [self._lex_proposal(doc_id, term)])
        old_data = self._old_data(doc_id, [
            {"action": "add_new", "term": term, "proposal_id": pid,
             "proposal_created_at": original_ts},
        ])
        merged, _ = _merge_researcher_state(new_result, old_data, doc_id)
        assert merged.lexicon_proposals[0].proposal_created_at == original_ts

    def test_existing_model_output_wins_when_not_blank(self):
        """Existing reviewed fields stay authoritative across re-enrichment."""
        doc_id = "doc-p3e"
        term = "Side B"
        pid = _pid_for_lex(doc_id, term)
        new_result = self._new_result(doc_id, [self._lex_proposal(doc_id, term)])
        old_data = self._old_data(doc_id, [
            {"action": "add_new", "term": term, "proposal_id": pid,
             "exact_quote": "old stale quote", "approved": True},
        ])
        merged, _ = _merge_researcher_state(new_result, old_data, doc_id)
        assert merged.lexicon_proposals[0].exact_quote == "old stale quote"
        assert merged.lexicon_proposals[0].approved is True

    def test_fresh_model_output_fills_blank_existing_field(self):
        doc_id = "doc-p3e2"
        term = "Side B"
        pid = _pid_for_lex(doc_id, term)
        new_result = self._new_result(doc_id, [self._lex_proposal(doc_id, term)])
        old_data = self._old_data(doc_id, [
            {"action": "add_new", "term": term, "proposal_id": pid,
             "exact_quote": "", "approved": True},
        ])
        merged, _ = _merge_researcher_state(new_result, old_data, doc_id)
        assert merged.lexicon_proposals[0].exact_quote == "fresh quote from new run"

    # --- new proposals ---

    def test_new_proposals_start_pending(self):
        doc_id = "doc-p3f"
        term = "Brand New Term"
        new_result = self._new_result(doc_id, [self._lex_proposal(doc_id, term)])
        old_data = self._old_data(doc_id, [])  # no prior proposals
        merged, summary = _merge_researcher_state(new_result, old_data, doc_id)
        assert merged.lexicon_proposals[0].approved is False
        assert merged.lexicon_proposals[0].rejected is False
        assert summary["new_proposals"] == 1
        assert summary["carried_forward"] == 0

    # --- append dropped proposals ---

    def test_appends_old_proposals_not_in_new_run(self):
        doc_id = "doc-p3g"
        old_term = "Term Dropped By Model"
        pid = _pid_for_lex(doc_id, old_term)
        new_result = self._new_result(doc_id, [])  # model produced nothing
        old_data = self._old_data(doc_id, [
            {"action": "add_new", "term": old_term, "exact_quote": "q",
             "proposal_id": pid, "approved": True},
        ])
        merged, summary = _merge_researcher_state(new_result, old_data, doc_id)
        assert len(merged.lexicon_proposals) == 1
        assert merged.lexicon_proposals[0].term == old_term
        assert merged.lexicon_proposals[0].approved is True
        assert merged.lexicon_proposals[0].proposal_id
        assert merged.lexicon_proposals[0].proposal_status == "approved"
        assert summary["appended_from_prior"] == 1

    # --- backward compat ---

    def test_backward_compat_no_proposal_id_in_old_file(self):
        """Files without proposal_id are still matched via content-derived ID."""
        doc_id = "doc-p3h"
        term = "Historical Term"
        # New result HAS proposal_id (from P1)
        new_result = self._new_result(doc_id, [self._lex_proposal(doc_id, term)])
        # Old data has NO proposal_id — pre-P1 file
        old_data = self._old_data(doc_id, [
            {"action": "add_new", "term": term, "exact_quote": "old",
             "approved": True, "researcher_note": "historically verified"},
        ])
        merged, summary = _merge_researcher_state(new_result, old_data, doc_id)
        assert merged.lexicon_proposals[0].approved is True
        assert merged.lexicon_proposals[0].researcher_note == "historically verified"
        assert summary["carried_forward"] == 1

    # --- entity ID preservation ---

    def test_preserves_existing_entity_id(self):
        """existing_entity_id set by the entity ID resolver survives re-enrichment."""
        doc_id = "doc-p3i"
        entity_name = "SEGM"
        sanity_id = "organization-segm"
        pid = _pid_for_entity(doc_id, entity_name, action="enrich_existing")

        new_result = EnrichmentResult(
            doc_id=doc_id,
            entity_proposals=[
                EntityProposal(
                    action="enrich_existing",
                    entity_type="organization",
                    name=entity_name,
                    proposal_id=pid,
                )
            ],
        )
        old_data = {
            "lexicon_proposals": [],
            "entity_proposals": [{
                "action": "enrich_existing",
                "entity_type": "organization",
                "name": entity_name,
                "proposal_id": pid,
                "existing_entity_id": sanity_id,
                "approved": True,
            }],
            "tactic_proposals": [],
            "ingestion_queue": [],
            "corpus_connections": [],
            "practice_descriptions": [],
            "statistical_claims": [],
        }
        merged, summary = _merge_researcher_state(new_result, old_data, doc_id)
        assert merged.entity_proposals[0].existing_entity_id == sanity_id
        assert merged.entity_proposals[0].approved is True
        assert summary["carried_forward"] == 1

    def test_preserves_entity_registry_fit_decision(self):
        """Media/source decisions survive complement enrichment."""
        doc_id = "doc-p3-fit"
        entity_name = "Gender: A Wider Lens"
        pid = _pid_for_entity(doc_id, entity_name, action="add_new")

        new_result = EnrichmentResult(
            doc_id=doc_id,
            entity_proposals=[
                EntityProposal(
                    action="add_new",
                    entity_type="organization",
                    name=entity_name,
                    proposal_id=pid,
                    registry_fit="registry_entity",
                )
            ],
        )
        old_data = {
            "lexicon_proposals": [],
            "entity_proposals": [{
                "action": "add_new",
                "entity_type": "organization",
                "name": entity_name,
                "proposal_id": pid,
                "registry_fit": "media_or_source",
                "registry_fit_rationale": "Podcast/source, not a registry org.",
                "rejected": True,
            }],
            "tactic_proposals": [],
            "ingestion_queue": [],
            "corpus_connections": [],
            "practice_descriptions": [],
            "statistical_claims": [],
        }

        merged, summary = _merge_researcher_state(new_result, old_data, doc_id)

        proposal = merged.entity_proposals[0]
        assert proposal.registry_fit == "media_or_source"
        assert proposal.registry_fit_rationale == "Podcast/source, not a registry org."
        assert proposal.rejected is True
        assert summary["carried_forward"] == 1

    def test_entity_action_flip_matches_legacy_identity_without_duplicate(self):
        """Entity add_new/enrich_existing flips should not create duplicate entities."""
        doc_id = "doc-p3j"
        entity_name = "Avi Ring"
        new_result = EnrichmentResult(
            doc_id=doc_id,
            entity_proposals=[
                EntityProposal(
                    action="enrich_existing",
                    entity_type="person",
                    name=entity_name,
                    proposal_id=_generate_proposal_id(
                        "entity",
                        doc_id,
                        {
                            "action": "enrich_existing",
                            "entity_type": "person",
                            "name": entity_name,
                        },
                    ),
                )
            ],
        )
        old_data = {
            "lexicon_proposals": [],
            "entity_proposals": [
                {
                    "action": "add_new",
                    "entity_type": "person",
                    "name": entity_name,
                    "approved": True,
                    "evidence_quote": "older reviewed evidence",
                }
            ],
            "tactic_proposals": [],
            "ingestion_queue": [],
            "corpus_connections": [],
            "practice_descriptions": [],
            "statistical_claims": [],
        }
        merged, summary = _merge_researcher_state(new_result, old_data, doc_id)
        assert len(merged.entity_proposals) == 1
        assert merged.entity_proposals[0].approved is True
        assert merged.entity_proposals[0].action == "add_new"
        assert summary["carried_forward"] == 1
        assert summary["appended_from_prior"] == 0

    def test_entity_action_flip_prefers_reviewed_legacy_over_unreviewed_stored_id(self):
        """When stored and legacy IDs both match, reviewed local state wins."""
        doc_id = "doc-p3k"
        entity_name = "Avi Ring"
        fresh = {
            "action": "enrich_existing",
            "entity_type": "person",
            "name": entity_name,
        }
        fresh["proposal_id"] = _generate_proposal_id("entity", doc_id, fresh)
        new_result = EnrichmentResult(
            doc_id=doc_id,
            entity_proposals=[EntityProposal(**fresh)],
        )
        old_data = {
            "lexicon_proposals": [],
            "entity_proposals": [
                {
                    **fresh,
                    "approved": False,
                    "evidence_quote": "unreviewed duplicate",
                },
                {
                    "action": "add_new",
                    "entity_type": "person",
                    "name": entity_name,
                    "approved": True,
                    "evidence_quote": "reviewed local proposal",
                },
            ],
            "tactic_proposals": [],
            "ingestion_queue": [],
            "corpus_connections": [],
            "practice_descriptions": [],
            "statistical_claims": [],
        }
        merged, summary = _merge_researcher_state(new_result, old_data, doc_id)
        assert len(merged.entity_proposals) == 1
        assert merged.entity_proposals[0].approved is True
        assert merged.entity_proposals[0].action == "add_new"
        assert merged.entity_proposals[0].evidence_quote == "reviewed local proposal"
        assert summary["carried_forward"] == 1
        assert summary["appended_from_prior"] == 0


# ---------------------------------------------------------------------------
# P3: save() integration (uses tmp_path)
# ---------------------------------------------------------------------------

class TestSaveMergeIntegration:
    """Integration tests that call save() with a real filesystem."""

    class _FakeConfig:
        def __init__(self, corpus_dir: Path):
            self.corpus_dir = corpus_dir

    def test_save_preserves_approval_across_rerun(self, tmp_path):
        doc_id = "testdoc-save1"
        doc_dir = tmp_path / doc_id
        doc_dir.mkdir()
        pid = _pid_for_lex(doc_id, "Test Term")

        # Write initial enrichment.json with researcher approval
        initial = {
            "doc_id": doc_id,
            "enrichment_model": "test-model",
            "lexicon_proposals": [{
                "action": "add_new",
                "term": "Test Term",
                "exact_quote": "original quote",
                "proposal_id": pid,
                "approved": True,
                "researcher_note": "verified",
                "proposal_created_at": "2024-01-01T00:00:00+00:00",
            }],
            "entity_proposals": [], "tactic_proposals": [], "ingestion_queue": [],
            "corpus_connections": [], "practice_descriptions": [], "statistical_claims": [],
        }
        (doc_dir / "enrichment.json").write_text(json.dumps(initial))

        # New result: same proposal, no approval (LLM output is always unapproved)
        new_result = EnrichmentResult(
            doc_id=doc_id,
            lexicon_proposals=[
                LexiconProposal(
                    action="add_new",
                    term="Test Term",
                    exact_quote="refreshed quote from second run",
                    proposal_id=pid,
                )
            ],
        )
        config = self._FakeConfig(tmp_path)
        enrich_save(doc_id, new_result, config)

        saved = json.loads((doc_dir / "enrichment.json").read_text())
        lex = saved["lexicon_proposals"]
        assert len(lex) == 1
        assert lex[0]["approved"] is True
        assert lex[0]["researcher_note"] == "verified"
        assert lex[0]["proposal_created_at"] == "2024-01-01T00:00:00+00:00"
        # Existing reviewed proposal remains authoritative
        assert lex[0]["exact_quote"] == "original quote"
        # Archive was created
        archives = list((doc_dir).glob("enrichment_*.json"))
        assert len(archives) == 1

    def test_save_appends_proposals_dropped_by_new_run(self, tmp_path):
        doc_id = "testdoc-save2"
        doc_dir = tmp_path / doc_id
        doc_dir.mkdir()
        old_pid = _pid_for_lex(doc_id, "Old Term")

        initial = {
            "doc_id": doc_id,
            "enrichment_model": "test-model",
            "lexicon_proposals": [{
                "action": "add_new",
                "term": "Old Term",
                "exact_quote": "q",
                "proposal_id": old_pid,
                "rejected": True,
            }],
            "entity_proposals": [], "tactic_proposals": [], "ingestion_queue": [],
            "corpus_connections": [], "practice_descriptions": [], "statistical_claims": [],
        }
        (doc_dir / "enrichment.json").write_text(json.dumps(initial))

        new_result = EnrichmentResult(
            doc_id=doc_id,
            lexicon_proposals=[
                LexiconProposal(
                    action="add_new",
                    term="New Term",
                    exact_quote="new quote",
                    proposal_id=_pid_for_lex(doc_id, "New Term"),
                )
            ],
        )
        config = self._FakeConfig(tmp_path)
        enrich_save(doc_id, new_result, config)

        saved = json.loads((doc_dir / "enrichment.json").read_text())
        terms = {p["term"] for p in saved["lexicon_proposals"]}
        assert "New Term" in terms
        assert "Old Term" in terms   # rejected proposals must not be silently lost
        assert len(saved["lexicon_proposals"]) == 2


# ---------------------------------------------------------------------------
# Network connection repair note
# ---------------------------------------------------------------------------

class TestNetworkConnectionRepairNote:
    def _entity_payload(self, connection_type: str) -> dict:
        return _minimal_payload(
            entity_proposals=[{
                "action": "add_new",
                "entity_type": "organization",
                "name": "Test Org",
                "network_connections": [{
                    "entity_name": "Partner Org",
                    "connection_type": connection_type,
                    "evidence_quote": "they work together",
                }],
            }]
        )

    def test_repair_note_set_on_invalid_type(self):
        data, repairs = _normalize_enrichment_payload(
            self._entity_payload("collaborates_with"),
            doc_id="doc-repair",
        )
        conn = data["entity_proposals"][0]["network_connections"][0]
        assert conn["connection_type"] == "partner"   # normalized to default
        assert "repair_note" in conn
        assert "collaborates_with" in conn["repair_note"]
        assert conn["invalid_connection_type"] == "collaborates_with"
        assert conn["connection_repair_status"] == "needs_review"
        assert repairs >= 1

    def test_no_repair_note_on_valid_type(self):
        data, _ = _normalize_enrichment_payload(
            self._entity_payload("funds"),
            doc_id="doc-repair",
        )
        conn = data["entity_proposals"][0]["network_connections"][0]
        assert conn["connection_type"] == "funds"
        assert not conn.get("repair_note")
        assert conn["connection_repair_status"] == "valid"

    def test_role_like_invalid_type_maps_to_affiliate_with_guidance(self):
        data, _ = _normalize_enrichment_payload(
            self._entity_payload("founder"),
            doc_id="doc-repair",
        )
        conn = data["entity_proposals"][0]["network_connections"][0]
        assert conn["connection_type"] == "affiliate"
        assert "founder" in conn["repair_note"]
        assert "key_individuals" in conn["repair_note"]


# ---------------------------------------------------------------------------
# _proposal_id_candidates: triple-fallback and deduplication
# ---------------------------------------------------------------------------

class TestProposalIdCandidates:
    """_proposal_id_candidates returns IDs in priority order with no duplicates."""

    def _lex_dict(self, doc_id: str, term: str, action: str = "add_new", **kw) -> dict:
        return {"action": action, "term": term, "exact_quote": "q", **kw}

    def test_stored_id_is_first_when_present(self):
        doc_id = "doc-cand"
        item = self._lex_dict(doc_id, "test term", proposal_id="prop-stored01234567")
        candidates = _proposal_id_candidates("lexicon", doc_id, item)
        assert candidates[0] == "prop-stored01234567"

    def test_generated_id_included_when_no_stored_id(self):
        doc_id = "doc-cand2"
        item = self._lex_dict(doc_id, "test term")
        candidates = _proposal_id_candidates("lexicon", doc_id, item)
        expected = _generate_proposal_id("lexicon", doc_id, item)
        assert expected in candidates

    def test_legacy_id_included_for_backward_compat(self):
        doc_id = "doc-cand3"
        item = self._lex_dict(doc_id, "test term")
        candidates = _proposal_id_candidates("lexicon", doc_id, item)
        legacy = _generate_legacy_proposal_id("lexicon", doc_id, item)
        assert legacy in candidates

    def test_no_duplicates_when_new_and_legacy_ids_match(self):
        """If new and legacy semantic keys are the same, only one ID is emitted."""
        doc_id = "doc-cand4"
        # Use a claim whose new and legacy keys are identical (claim key hasn't changed)
        item = {"claim": "42% of participants improved"}
        candidates = _proposal_id_candidates("claim", doc_id, item)
        assert len(candidates) == len(set(candidates))

    def test_none_not_in_output(self):
        """proposal_id=None must not appear in the candidate list."""
        doc_id = "doc-cand5"
        item = self._lex_dict(doc_id, "orphan term", proposal_id=None)
        candidates = _proposal_id_candidates("lexicon", doc_id, item)
        assert None not in candidates
        assert all(isinstance(pid, str) and pid.startswith("prop-") for pid in candidates)


# ---------------------------------------------------------------------------
# _merge_existing_proposal_with_fresh: old-as-base semantics
# ---------------------------------------------------------------------------

class TestMergeExistingProposalWithFresh:
    """The old (reviewed) proposal is the base; fresh model output fills
    only fields that were blank in the old proposal."""

    def _old_lex(self, **kw) -> dict:
        base = {
            "action": "add_new",
            "term": "Test Term",
            "exact_quote": "old quote",
            "proposal_id": "prop-old1234567890ab",
            "proposal_created_at": "2024-01-01T00:00:00+00:00",
            "approved": False,
            "rejected": False,
        }
        base.update(kw)
        return base

    def _new_lex(self, **kw) -> dict:
        base = {
            "action": "add_new",
            "term": "Test Term",
            "exact_quote": "fresh quote",
            "proposal_id": "prop-old1234567890ab",
            "proposal_updated_at": "2026-01-01T00:00:00+00:00",
        }
        base.update(kw)
        return base

    def test_old_nonempty_field_not_overwritten_by_fresh(self):
        """existing exact_quote must survive re-enrichment."""
        old = self._old_lex(exact_quote="old quote")
        new = self._new_lex(exact_quote="fresh quote")
        merged = _merge_existing_proposal_with_fresh(old, new, frozenset())
        assert merged["exact_quote"] == "old quote"

    def test_blank_old_field_filled_from_fresh(self):
        """blank definition_as_used in old proposal is filled from new run."""
        old = self._old_lex(definition_as_used="")
        new = self._new_lex(definition_as_used="new definition from model")
        merged = _merge_existing_proposal_with_fresh(old, new, frozenset())
        assert merged["definition_as_used"] == "new definition from model"

    def test_proposal_updated_at_always_takes_fresh_value(self):
        """proposal_updated_at must reflect the new run's timestamp."""
        old = self._old_lex(proposal_updated_at="2024-06-01T00:00:00+00:00")
        new = self._new_lex(proposal_updated_at="2026-06-01T00:00:00+00:00")
        merged = _merge_existing_proposal_with_fresh(old, new, frozenset())
        assert merged["proposal_updated_at"] == "2026-06-01T00:00:00+00:00"

    def test_approved_state_preserved_from_old(self):
        """approval set by researcher must survive."""
        old = self._old_lex(approved=True, rejected=False)
        new = self._new_lex()
        merged = _merge_existing_proposal_with_fresh(old, new, frozenset())
        assert merged["approved"] is True
        assert merged["proposal_status"] == "approved"

    def test_extra_link_field_preserved_from_old(self):
        """existing_entity_id set by entity resolver must survive."""
        old = self._old_lex(existing_entity_id="organization-segm")
        new = self._new_lex()
        merged = _merge_existing_proposal_with_fresh(
            old, new, frozenset({"existing_entity_id"})
        )
        assert merged["existing_entity_id"] == "organization-segm"

    def test_proposal_created_at_comes_from_old_when_present(self):
        """original first-seen timestamp must be preserved."""
        old = self._old_lex(proposal_created_at="2024-01-01T00:00:00+00:00")
        new = self._new_lex(proposal_created_at="2026-01-01T00:00:00+00:00")
        merged = _merge_existing_proposal_with_fresh(old, new, frozenset())
        assert merged["proposal_created_at"] == "2024-01-01T00:00:00+00:00"
