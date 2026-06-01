"""
Tests for the Provenance / Audit helper functions in runner/app_provenance.py.

All helpers are pure functions (no st.* calls), so no Streamlit stub is needed.
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import pytest

from runner.app_provenance import (
    ALLOWED_NETWORK_CONNECTION_TYPES,
    ProvenanceWarning,
    _check_artifact_completeness,
    _collect_provenance_warnings,
    _detect_commit_mismatch,
    _generate_researcher_checklist,
    _load_analysis_audit,
    _load_enrichment_audit,
    _load_preservation_status_dict,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data), encoding="utf-8")


def _make_doc_dir(tmp_path: Path, **kwargs) -> Path:
    """Create a minimal doc_dir with analysis.json and optional other files.

    Keyword args:
        languages         — list, default ["en"]
        document_date     — dict, default {"year": 2024, "month": 1, "day": 1}
        preprocess_date   — str; if provided writes preprocess.json
        entity_proposals  — list; if provided writes enrichment.json
    """
    doc_dir = tmp_path / "abc12345"
    doc_dir.mkdir(exist_ok=True)

    analysis = {
        "languages": kwargs.get("languages", ["en"]),
        "document_date": kwargs.get(
            "document_date", {"year": 2024, "month": 1, "day": 1}
        ),
    }
    _write_json(doc_dir / "analysis.json", analysis)

    if "preprocess_date" in kwargs:
        _write_json(
            doc_dir / "preprocess.json",
            {"date_published": kwargs["preprocess_date"]},
        )

    if "entity_proposals" in kwargs:
        _write_json(
            doc_dir / "enrichment.json",
            {"entity_proposals": kwargs["entity_proposals"]},
        )

    return doc_dir


# ---------------------------------------------------------------------------
# ProvenanceWarning dataclass
# ---------------------------------------------------------------------------

class TestProvenanceWarning:
    def test_fields_accessible(self):
        w = ProvenanceWarning(
            severity="action_needed",
            title="Languages missing",
            explanation="empty list",
            suggested_action="add a code",
        )
        assert w.severity == "action_needed"
        assert w.title == "Languages missing"
        assert w.explanation == "empty list"
        assert w.suggested_action == "add a code"
        assert w.source_fields == []

    def test_source_fields_populated(self):
        w = ProvenanceWarning(
            severity="pre_push_blocker",
            title="Missing existing_entity_id",
            explanation="no id",
            suggested_action="look it up",
            source_fields=["enrichment.json → entity_proposals"],
        )
        assert w.source_fields == ["enrichment.json → entity_proposals"]

    def test_severity_values_are_strings(self):
        for sev in ("action_needed", "pre_push_blocker", "provenance_note"):
            w = ProvenanceWarning(severity=sev, title="t", explanation="e", suggested_action="a")
            assert isinstance(w.severity, str)


# ---------------------------------------------------------------------------
# _load_analysis_audit
# ---------------------------------------------------------------------------

class TestLoadAnalysisAudit:
    def test_returns_dict_when_file_exists(self, tmp_path):
        data = {"schema_version": "3", "model": "core-qwen"}
        _write_json(tmp_path / "analysis_audit.json", data)
        assert _load_analysis_audit(tmp_path)["model"] == "core-qwen"

    def test_returns_empty_dict_when_missing(self, tmp_path):
        assert _load_analysis_audit(tmp_path) == {}

    def test_returns_empty_dict_on_corrupt_json(self, tmp_path):
        (tmp_path / "analysis_audit.json").write_text("not json", encoding="utf-8")
        assert _load_analysis_audit(tmp_path) == {}


# ---------------------------------------------------------------------------
# _load_enrichment_audit
# ---------------------------------------------------------------------------

class TestLoadEnrichmentAudit:
    def test_returns_dict_when_file_exists(self, tmp_path):
        data = {"model": "core-gemma", "chunked": False}
        _write_json(tmp_path / "enrichment_audit.json", data)
        assert _load_enrichment_audit(tmp_path)["model"] == "core-gemma"

    def test_returns_empty_dict_when_missing(self, tmp_path):
        assert _load_enrichment_audit(tmp_path) == {}

    def test_returns_empty_dict_on_corrupt_json(self, tmp_path):
        (tmp_path / "enrichment_audit.json").write_text("{bad", encoding="utf-8")
        assert _load_enrichment_audit(tmp_path) == {}


# ---------------------------------------------------------------------------
# _load_preservation_status_dict
# ---------------------------------------------------------------------------

class TestLoadPreservationStatusDict:
    def test_returns_dict_when_file_exists(self, tmp_path):
        data = {"preservation_status": "captured_html", "capture_needed": False}
        _write_json(tmp_path / "preservation_status.json", data)
        result = _load_preservation_status_dict(tmp_path)
        assert result["preservation_status"] == "captured_html"

    def test_returns_empty_dict_when_missing(self, tmp_path):
        assert _load_preservation_status_dict(tmp_path) == {}

    def test_returns_empty_dict_when_json_is_list(self, tmp_path):
        # Valid JSON but not a dict → treated as absent
        (tmp_path / "preservation_status.json").write_text("[]", encoding="utf-8")
        assert _load_preservation_status_dict(tmp_path) == {}

    def test_returns_empty_dict_on_corrupt_json(self, tmp_path):
        (tmp_path / "preservation_status.json").write_text("oops", encoding="utf-8")
        assert _load_preservation_status_dict(tmp_path) == {}


# ---------------------------------------------------------------------------
# _check_artifact_completeness
# ---------------------------------------------------------------------------

class TestCheckArtifactCompleteness:
    def test_all_absent_returns_all_false(self, tmp_path):
        result = _check_artifact_completeness(tmp_path)
        assert all(v is False for v in result.values())

    def test_ten_artifacts_tracked(self, tmp_path):
        assert len(_check_artifact_completeness(tmp_path)) == 10

    def test_intake_present(self, tmp_path):
        (tmp_path / "intake.json").write_text("{}", encoding="utf-8")
        result = _check_artifact_completeness(tmp_path)
        assert result["intake.json"] is True
        assert result["analysis.json"] is False

    def test_extracted_txt_counts_as_extracted_text(self, tmp_path):
        (tmp_path / "extracted.txt").write_text("hello", encoding="utf-8")
        assert _check_artifact_completeness(tmp_path)["extracted text"] is True

    def test_extracted_md_counts_as_extracted_text(self, tmp_path):
        (tmp_path / "extracted.md").write_text("# hello", encoding="utf-8")
        assert _check_artifact_completeness(tmp_path)["extracted text"] is True

    def test_all_present(self, tmp_path):
        for fname in [
            "intake.json", "preprocess.json", "extracted.txt",
            "analysis.json", "analysis_audit.json", "embedding.json",
            "sanity_record.json", "enrichment.json", "enrichment_audit.json",
            "preservation_status.json",
        ]:
            (tmp_path / fname).write_text("{}", encoding="utf-8")
        assert all(_check_artifact_completeness(tmp_path).values())


# ---------------------------------------------------------------------------
# _detect_commit_mismatch
# ---------------------------------------------------------------------------

class TestDetectCommitMismatch:
    def test_returns_none_when_commits_match(self, tmp_path):
        _write_json(tmp_path / "analysis_audit.json",  {"git_commit": "abc123"})
        _write_json(tmp_path / "enrichment_audit.json", {"git_commit": "abc123"})
        assert _detect_commit_mismatch(tmp_path) is None

    def test_returns_provenance_note_when_commits_differ(self, tmp_path):
        _write_json(tmp_path / "analysis_audit.json",  {"git_commit": "abc123def456"})
        _write_json(tmp_path / "enrichment_audit.json", {"git_commit": "999aaabbbccc"})
        result = _detect_commit_mismatch(tmp_path)
        assert result is not None
        assert isinstance(result, ProvenanceWarning)
        assert result.severity == "provenance_note"
        assert "abc123" in result.explanation
        assert "999aaa" in result.explanation

    def test_returns_none_when_analysis_audit_missing(self, tmp_path):
        _write_json(tmp_path / "enrichment_audit.json", {"git_commit": "abc123"})
        assert _detect_commit_mismatch(tmp_path) is None

    def test_returns_none_when_enrichment_audit_missing(self, tmp_path):
        _write_json(tmp_path / "analysis_audit.json", {"git_commit": "abc123"})
        assert _detect_commit_mismatch(tmp_path) is None

    def test_returns_none_when_either_commit_empty(self, tmp_path):
        _write_json(tmp_path / "analysis_audit.json",  {"git_commit": ""})
        _write_json(tmp_path / "enrichment_audit.json", {"git_commit": "abc123"})
        assert _detect_commit_mismatch(tmp_path) is None

    def test_title_mentions_mismatch(self, tmp_path):
        _write_json(tmp_path / "analysis_audit.json",  {"git_commit": "aaaa1111bbbb"})
        _write_json(tmp_path / "enrichment_audit.json", {"git_commit": "cccc2222dddd"})
        result = _detect_commit_mismatch(tmp_path)
        assert result is not None
        assert "mismatch" in result.title.lower()

    def test_source_fields_reference_both_audits(self, tmp_path):
        _write_json(tmp_path / "analysis_audit.json",  {"git_commit": "a1"})
        _write_json(tmp_path / "enrichment_audit.json", {"git_commit": "b2"})
        result = _detect_commit_mismatch(tmp_path)
        assert result is not None
        joined = " ".join(result.source_fields)
        assert "analysis_audit" in joined
        assert "enrichment_audit" in joined


# ---------------------------------------------------------------------------
# _generate_researcher_checklist
# ---------------------------------------------------------------------------

class TestGenerateResearcherChecklist:
    def test_empty_for_no_warnings(self):
        assert _generate_researcher_checklist([]) == []

    def test_includes_action_needed(self):
        w = ProvenanceWarning(
            severity="action_needed", title="Languages missing",
            explanation="...", suggested_action="...",
        )
        items = _generate_researcher_checklist([w])
        assert items == ["Languages missing"]

    def test_includes_pre_push_blocker(self):
        w = ProvenanceWarning(
            severity="pre_push_blocker", title="Missing existing_entity_id",
            explanation="...", suggested_action="...",
        )
        items = _generate_researcher_checklist([w])
        assert "Missing existing_entity_id" in items

    def test_excludes_provenance_note(self):
        w = ProvenanceWarning(
            severity="provenance_note", title="Commit mismatch",
            explanation="...", suggested_action="...",
        )
        assert _generate_researcher_checklist([w]) == []

    def test_mixed_severities_filtered(self):
        warnings = [
            ProvenanceWarning(severity="action_needed", title="Languages missing",
                              explanation="", suggested_action=""),
            ProvenanceWarning(severity="provenance_note", title="Source mismatch",
                              explanation="", suggested_action=""),
            ProvenanceWarning(severity="pre_push_blocker", title="Missing entity ID",
                              explanation="", suggested_action=""),
        ]
        items = _generate_researcher_checklist(warnings)
        assert len(items) == 2
        assert "Languages missing" in items
        assert "Missing entity ID" in items
        assert "Source mismatch" not in items


# ---------------------------------------------------------------------------
# _collect_provenance_warnings — structured output
# ---------------------------------------------------------------------------

class TestCollectProvenanceWarnings:

    # ── languages ────────────────────────────────────────────────────────

    def test_no_warning_when_languages_present(self, tmp_path):
        doc_dir = _make_doc_dir(tmp_path, languages=["en"])
        assert not any(
            w.title == "Languages missing"
            for w in _collect_provenance_warnings(doc_dir)
        )

    def test_warning_when_languages_empty_list(self, tmp_path):
        doc_dir = _make_doc_dir(tmp_path, languages=[])
        warnings = _collect_provenance_warnings(doc_dir)
        assert any(w.title == "Languages missing" for w in warnings)

    def test_languages_warning_has_action_needed_severity(self, tmp_path):
        doc_dir = _make_doc_dir(tmp_path, languages=[])
        warnings = _collect_provenance_warnings(doc_dir)
        lang_warn = next(w for w in warnings if w.title == "Languages missing")
        assert lang_warn.severity == "action_needed"

    def test_warning_when_languages_field_absent(self, tmp_path):
        doc_dir = tmp_path / "nodoc"
        doc_dir.mkdir()
        _write_json(doc_dir / "analysis.json", {"document_date": {"year": 2024}})
        assert any(
            w.title == "Languages missing"
            for w in _collect_provenance_warnings(doc_dir)
        )

    # ── document date ─────────────────────────────────────────────────────

    def test_no_date_warning_when_document_date_has_year(self, tmp_path):
        doc_dir = _make_doc_dir(tmp_path, document_date={"year": 2023, "month": 3})
        assert not any(
            w.title == "Date unknown"
            for w in _collect_provenance_warnings(doc_dir)
        )

    def test_no_date_warning_when_preprocess_date_present(self, tmp_path):
        doc_dir = _make_doc_dir(
            tmp_path,
            document_date={"year": 0, "month": 0, "day": 0},
            preprocess_date="2023-05-01",
        )
        assert not any(w.title == "Date unknown" for w in _collect_provenance_warnings(doc_dir))

    def test_date_warning_when_both_absent(self, tmp_path):
        doc_dir = _make_doc_dir(
            tmp_path,
            document_date={"year": 0},
            preprocess_date="",
        )
        assert any(w.title == "Date unknown" for w in _collect_provenance_warnings(doc_dir))

    def test_date_warning_has_action_needed_severity(self, tmp_path):
        doc_dir = _make_doc_dir(tmp_path, document_date={"year": 0}, preprocess_date="")
        warnings = _collect_provenance_warnings(doc_dir)
        date_warn = next(w for w in warnings if w.title == "Date unknown")
        assert date_warn.severity == "action_needed"

    def test_date_warning_when_no_preprocess_file(self, tmp_path):
        doc_dir = tmp_path / "nopreprocess"
        doc_dir.mkdir()
        _write_json(doc_dir / "analysis.json", {
            "languages": ["en"],
            "document_date": {"year": 0},
        })
        assert any(w.title == "Date unknown" for w in _collect_provenance_warnings(doc_dir))

    # ── enrich_existing missing entity_id ─────────────────────────────────

    def test_warning_when_enrich_existing_missing_id(self, tmp_path):
        proposals = [
            {"action": "enrich_existing", "name": "SEGM", "existing_entity_id": None}
        ]
        doc_dir = _make_doc_dir(tmp_path, entity_proposals=proposals)
        warnings = _collect_provenance_warnings(doc_dir)
        assert any(w.title == "Missing existing_entity_id" for w in warnings)

    def test_entity_id_warning_has_pre_push_blocker_severity(self, tmp_path):
        proposals = [
            {"action": "enrich_existing", "name": "SEGM", "existing_entity_id": None}
        ]
        doc_dir = _make_doc_dir(tmp_path, entity_proposals=proposals)
        warnings = _collect_provenance_warnings(doc_dir)
        w = next(x for x in warnings if x.title == "Missing existing_entity_id")
        assert w.severity == "pre_push_blocker"

    def test_entity_id_warning_names_the_entity(self, tmp_path):
        proposals = [
            {"action": "enrich_existing", "name": "SEGM", "existing_entity_id": None}
        ]
        doc_dir = _make_doc_dir(tmp_path, entity_proposals=proposals)
        warnings = _collect_provenance_warnings(doc_dir)
        w = next(x for x in warnings if x.title == "Missing existing_entity_id")
        assert "SEGM" in w.explanation

    def test_no_warning_when_enrich_existing_has_id(self, tmp_path):
        proposals = [
            {"action": "enrich_existing", "name": "SEGM", "existing_entity_id": "seg-001"}
        ]
        doc_dir = _make_doc_dir(tmp_path, entity_proposals=proposals)
        assert not any(
            w.title == "Missing existing_entity_id"
            for w in _collect_provenance_warnings(doc_dir)
        )

    def test_no_warning_for_add_new_without_id(self, tmp_path):
        # add_new proposals don't need existing_entity_id — absence is expected
        proposals = [
            {"action": "add_new", "name": "NewOrg", "existing_entity_id": None}
        ]
        doc_dir = _make_doc_dir(tmp_path, entity_proposals=proposals)
        assert not any(
            w.title == "Missing existing_entity_id"
            for w in _collect_provenance_warnings(doc_dir)
        )

    # ── invalid network connection types ─────────────────────────────────

    def test_invalid_network_connection_warning_emitted(self, tmp_path):
        proposals = [{
            "action": "add_new",
            "name": "Org",
            "network_connections": [{
                "entity_name": "Person",
                "connection_type": "affiliate",
                "invalid_connection_type": "founder",
                "connection_repair_status": "needs_review",
                "repair_note": (
                    "Invalid connection type: founder. Choose an allowed type "
                    "or move this relation to key_individuals / affiliated_orgs."
                ),
            }],
        }]
        doc_dir = _make_doc_dir(tmp_path, entity_proposals=proposals)
        warnings = _collect_provenance_warnings(doc_dir)
        assert any(w.title == "Invalid network connection type" for w in warnings)

    def test_invalid_network_connection_warning_has_pre_push_severity(self, tmp_path):
        proposals = [{
            "action": "add_new",
            "name": "Org",
            "network_connections": [{
                "entity_name": "Person",
                "connection_type": "affiliate",
                "invalid_connection_type": "team_member",
                "connection_repair_status": "needs_review",
            }],
        }]
        doc_dir = _make_doc_dir(tmp_path, entity_proposals=proposals)
        warning = next(
            w for w in _collect_provenance_warnings(doc_dir)
            if w.title == "Invalid network connection type"
        )
        assert warning.severity == "pre_push_blocker"

    def test_invalid_network_connection_warning_lists_allowed_values(self, tmp_path):
        proposals = [{
            "action": "add_new",
            "name": "Org",
            "network_connections": [{
                "entity_name": "Person",
                "connection_type": "affiliate",
                "invalid_connection_type": "founder",
                "connection_repair_status": "needs_review",
            }],
        }]
        doc_dir = _make_doc_dir(tmp_path, entity_proposals=proposals)
        warning = next(
            w for w in _collect_provenance_warnings(doc_dir)
            if w.title == "Invalid network connection type"
        )
        assert "founder" in warning.explanation
        assert "key_individuals" in warning.suggested_action
        assert "partner" in warning.suggested_action
        assert "opposes" in ALLOWED_NETWORK_CONNECTION_TYPES

    def test_no_invalid_network_warning_for_valid_connection(self, tmp_path):
        proposals = [{
            "action": "add_new",
            "name": "Org",
            "network_connections": [{
                "entity_name": "Partner",
                "connection_type": "partner",
            }],
        }]
        doc_dir = _make_doc_dir(tmp_path, entity_proposals=proposals)
        assert not any(
            w.title == "Invalid network connection type"
            for w in _collect_provenance_warnings(doc_dir)
        )

    def test_warning_names_multiple_missing_entities(self, tmp_path):
        proposals = [
            {"action": "enrich_existing", "name": "SEGM",     "existing_entity_id": None},
            {"action": "enrich_existing", "name": "Genspect", "existing_entity_id": None},
        ]
        doc_dir = _make_doc_dir(tmp_path, entity_proposals=proposals)
        warnings = _collect_provenance_warnings(doc_dir)
        w = next(x for x in warnings if x.title == "Missing existing_entity_id")
        assert "SEGM" in w.explanation
        assert "Genspect" in w.explanation

    def test_no_enrichment_file_no_entity_warning(self, tmp_path):
        doc_dir = _make_doc_dir(tmp_path)  # no entity_proposals kwarg → no enrichment.json
        assert not any(
            w.title == "Missing existing_entity_id"
            for w in _collect_provenance_warnings(doc_dir)
        )

    # ── queue source_type mismatch ────────────────────────────────────────
    #
    # queue_db_path(corpus_dir) returns corpus_dir.parent / "source_queue.db"
    # so in tests we set corpus_dir = tmp_path / "corpus" and write the DB
    # at tmp_path / "source_queue.db".

    def _setup_queue_env(
        self,
        tmp_path: Path,
        doc_name: str,
        intake_st: str,
        queue_st: str,
        queue_dth: str,
    ):
        """Return (doc_dir, _Cfg) with a minimal corpus layout and queue DB."""
        corpus_dir = tmp_path / "corpus"
        corpus_dir.mkdir(exist_ok=True)

        doc_dir = corpus_dir / doc_name
        doc_dir.mkdir(exist_ok=True)
        _write_json(doc_dir / "analysis.json", {
            "languages": ["en"], "document_date": {"year": 2024}
        })
        _write_json(doc_dir / "intake.json", {"source_type": intake_st})

        # DB lives at corpus_dir.parent / "source_queue.db" = tmp_path / "source_queue.db"
        db_path = tmp_path / "source_queue.db"
        conn = sqlite3.connect(str(db_path))
        conn.execute(
            "CREATE TABLE IF NOT EXISTS source_queue "
            "(id TEXT, url TEXT, url_hash TEXT, source_type TEXT, "
            "doc_type_hint TEXT, corpus_doc_id TEXT)"
        )
        conn.execute(
            "INSERT INTO source_queue VALUES (?,?,?,?,?,?)",
            ("row1", "https://example.org/page", "abc", queue_st, queue_dth, doc_name),
        )
        conn.commit()
        conn.close()

        class _Cfg:
            pass
        _Cfg.corpus_dir = corpus_dir
        return doc_dir, _Cfg()

    def test_mismatch_warning_emitted(self, tmp_path):
        doc_dir, cfg = self._setup_queue_env(
            tmp_path, "qmtest", intake_st="url", queue_st="video", queue_dth="media"
        )
        warnings = _collect_provenance_warnings(doc_dir, config=cfg)
        assert any(w.title == "Triage source_type mismatch" for w in warnings)

    def test_mismatch_warning_has_provenance_note_severity(self, tmp_path):
        doc_dir, cfg = self._setup_queue_env(
            tmp_path, "qmsev", intake_st="url", queue_st="video", queue_dth="media"
        )
        warnings = _collect_provenance_warnings(doc_dir, config=cfg)
        w = next(x for x in warnings if x.title == "Triage source_type mismatch")
        assert w.severity == "provenance_note"

    def test_mismatch_warning_names_both_types(self, tmp_path):
        doc_dir, cfg = self._setup_queue_env(
            tmp_path, "qmnames", intake_st="url", queue_st="video", queue_dth="media"
        )
        warnings = _collect_provenance_warnings(doc_dir, config=cfg)
        w = next(x for x in warnings if x.title == "Triage source_type mismatch")
        assert "video" in w.explanation
        assert "url" in w.explanation

    def test_no_mismatch_warning_when_types_agree(self, tmp_path):
        doc_dir, cfg = self._setup_queue_env(
            tmp_path, "qmok", intake_st="url", queue_st="url", queue_dth="unknown"
        )
        warnings = _collect_provenance_warnings(doc_dir, config=cfg)
        assert not any(w.title == "Triage source_type mismatch" for w in warnings)

    def test_no_mismatch_warning_when_config_is_none(self, tmp_path):
        doc_dir = _make_doc_dir(tmp_path)
        # config=None → queue check skipped entirely
        warnings = _collect_provenance_warnings(doc_dir, config=None)
        assert not any("mismatch" in w.title.lower() for w in warnings)

    # ── commit mismatch (via _collect_provenance_warnings) ────────────────

    def test_commit_mismatch_appears_as_provenance_note(self, tmp_path):
        doc_dir = _make_doc_dir(tmp_path)
        _write_json(doc_dir / "analysis_audit.json",   {"git_commit": "aaaa1111bbbb"})
        _write_json(doc_dir / "enrichment_audit.json",  {"git_commit": "cccc2222dddd"})
        warnings = _collect_provenance_warnings(doc_dir, config=None)
        assert any(w.severity == "provenance_note" and "mismatch" in w.title.lower()
                   for w in warnings)

    def test_no_commit_mismatch_when_same_commit(self, tmp_path):
        doc_dir = _make_doc_dir(tmp_path)
        _write_json(doc_dir / "analysis_audit.json",   {"git_commit": "abc123"})
        _write_json(doc_dir / "enrichment_audit.json",  {"git_commit": "abc123"})
        warnings = _collect_provenance_warnings(doc_dir, config=None)
        assert not any("mismatch" in w.title.lower() for w in warnings)

    # ── clean document — zero warnings ────────────────────────────────────

    def test_no_warnings_for_clean_doc(self, tmp_path):
        doc_dir = tmp_path / "clean"
        doc_dir.mkdir()
        _write_json(doc_dir / "analysis.json", {
            "languages": ["en"],
            "document_date": {"year": 2024, "month": 5, "day": 1, "confidence": "known"},
        })
        _write_json(doc_dir / "enrichment.json", {"entity_proposals": []})
        assert _collect_provenance_warnings(doc_dir, config=None) == []


# ---------------------------------------------------------------------------
# Date warning text — app path and Wayback clarification
# ---------------------------------------------------------------------------

class TestDateWarningText:
    """The date warning must include the app path and must not treat Wayback
    capture date as publication date."""

    def _make_date_unknown_dir(self, tmp_path, **kwargs) -> "Path":
        """Create a doc_dir with no known date, optionally with intake.json."""
        doc_dir = tmp_path / "nodatedoc"
        doc_dir.mkdir(exist_ok=True)
        _write_json(doc_dir / "analysis.json", {
            "languages": ["en"],
            "document_date": {"year": 0},
        })
        if "ingested_at" in kwargs:
            _write_json(doc_dir / "intake.json", {
                "ingested_at": kwargs["ingested_at"],
            })
        if "archive_url" in kwargs:
            data = {"archive_url": kwargs["archive_url"]}
            if "ingested_at" in kwargs:
                data["ingested_at"] = kwargs["ingested_at"]
            _write_json(doc_dir / "intake.json", data)
        return doc_dir

    def test_suggested_action_includes_app_path(self, tmp_path):
        doc_dir = self._make_date_unknown_dir(tmp_path)
        warnings = _collect_provenance_warnings(doc_dir, config=None)
        w = next((x for x in warnings if x.title == "Date unknown"), None)
        assert w is not None
        assert "Document List" in w.suggested_action

    def test_suggested_action_includes_edit_dates_path(self, tmp_path):
        doc_dir = self._make_date_unknown_dir(tmp_path)
        warnings = _collect_provenance_warnings(doc_dir, config=None)
        w = next(x for x in warnings if x.title == "Date unknown")
        # Should mention the specific UI path
        assert "Edit dates and publication metadata" in w.suggested_action

    def test_wayback_capture_date_not_treated_as_publication_date(self, tmp_path):
        """Explanation must clarify that Wayback capture date ≠ publication date."""
        doc_dir = self._make_date_unknown_dir(
            tmp_path,
            archive_url="https://web.archive.org/web/20220101/https://example.com",
        )
        warnings = _collect_provenance_warnings(doc_dir, config=None)
        w = next(x for x in warnings if x.title == "Date unknown")
        # The explanation must mention that the Wayback/capture date is not the publication date
        text_to_check = (w.explanation + " " + w.suggested_action).lower()
        assert "not" in text_to_check
        assert any(
            phrase in text_to_check
            for phrase in ["not the publication date", "not when it was", "archived", "wayback"]
        )

    def test_ingested_at_surfaced_in_explanation_when_present(self, tmp_path):
        doc_dir = self._make_date_unknown_dir(
            tmp_path,
            ingested_at="2024-03-15T10:00:00Z",
        )
        warnings = _collect_provenance_warnings(doc_dir, config=None)
        w = next(x for x in warnings if x.title == "Date unknown")
        # The ingested_at date should appear as context in explanation
        assert "2024-03-15" in w.explanation

    def test_ingested_at_clarified_as_capture_not_publication(self, tmp_path):
        doc_dir = self._make_date_unknown_dir(
            tmp_path,
            ingested_at="2024-03-15T10:00:00Z",
        )
        warnings = _collect_provenance_warnings(doc_dir, config=None)
        w = next(x for x in warnings if x.title == "Date unknown")
        # Must explicitly say it is not the publication date
        assert "not" in w.explanation.lower()
        # And should be in source_fields as context label
        source_field_text = " ".join(w.source_fields)
        assert "ingested_at" in source_field_text
        assert "capture" in source_field_text.lower() or "not publication" in source_field_text.lower()

    def test_no_date_warning_when_ingested_at_present_but_year_known(self, tmp_path):
        """Having an ingested_at does not suppress the warning if year is still 0."""
        doc_dir = self._make_date_unknown_dir(
            tmp_path,
            ingested_at="2024-01-01T00:00:00Z",
        )
        # ingested_at alone should NOT fill the year — warning still fires
        warnings = _collect_provenance_warnings(doc_dir, config=None)
        assert any(w.title == "Date unknown" for w in warnings)

    def test_suggested_action_mentions_not_inventing_date(self, tmp_path):
        doc_dir = self._make_date_unknown_dir(tmp_path)
        warnings = _collect_provenance_warnings(doc_dir, config=None)
        w = next(x for x in warnings if x.title == "Date unknown")
        # Should caution against inventing a date
        assert "do not invent" in w.suggested_action.lower() or "genuinely unknown" in w.suggested_action.lower()

    def test_languages_warning_suggests_app_path(self, tmp_path):
        """Languages warning should also include an app path for resolution."""
        doc_dir = tmp_path / "nolang"
        doc_dir.mkdir()
        _write_json(doc_dir / "analysis.json", {
            "languages": [],
            "document_date": {"year": 2024},
        })
        warnings = _collect_provenance_warnings(doc_dir, config=None)
        w = next(x for x in warnings if x.title == "Languages missing")
        assert "Document List" in w.suggested_action
