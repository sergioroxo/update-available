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
    _check_artifact_completeness,
    _collect_provenance_warnings,
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
# _collect_provenance_warnings
# ---------------------------------------------------------------------------

class TestCollectProvenanceWarnings:

    # ── languages ────────────────────────────────────────────────────────

    def test_no_warning_when_languages_present(self, tmp_path):
        doc_dir = _make_doc_dir(tmp_path, languages=["en"])
        assert not any("Languages" in w for w in _collect_provenance_warnings(doc_dir))

    def test_warning_when_languages_empty_list(self, tmp_path):
        doc_dir = _make_doc_dir(tmp_path, languages=[])
        assert any("Languages" in w for w in _collect_provenance_warnings(doc_dir))

    def test_warning_when_languages_field_absent(self, tmp_path):
        doc_dir = tmp_path / "nodoc"
        doc_dir.mkdir()
        _write_json(doc_dir / "analysis.json", {"document_date": {"year": 2024}})
        assert any("Languages" in w for w in _collect_provenance_warnings(doc_dir))

    # ── document date ─────────────────────────────────────────────────────

    def test_no_date_warning_when_document_date_has_year(self, tmp_path):
        doc_dir = _make_doc_dir(tmp_path, document_date={"year": 2023, "month": 3})
        assert not any("Date unknown" in w for w in _collect_provenance_warnings(doc_dir))

    def test_no_date_warning_when_preprocess_date_present(self, tmp_path):
        doc_dir = _make_doc_dir(
            tmp_path,
            document_date={"year": 0, "month": 0, "day": 0},
            preprocess_date="2023-05-01",
        )
        assert not any("Date unknown" in w for w in _collect_provenance_warnings(doc_dir))

    def test_date_warning_when_both_absent(self, tmp_path):
        doc_dir = _make_doc_dir(
            tmp_path,
            document_date={"year": 0},
            preprocess_date="",
        )
        assert any("Date unknown" in w for w in _collect_provenance_warnings(doc_dir))

    def test_date_warning_when_no_preprocess_file(self, tmp_path):
        doc_dir = tmp_path / "nopreprocess"
        doc_dir.mkdir()
        _write_json(doc_dir / "analysis.json", {
            "languages": ["en"],
            "document_date": {"year": 0},
        })
        # No preprocess.json → effectively no preprocess_date
        assert any("Date unknown" in w for w in _collect_provenance_warnings(doc_dir))

    # ── enrich_existing missing entity_id ─────────────────────────────────

    def test_warning_when_enrich_existing_missing_id(self, tmp_path):
        proposals = [
            {"action": "enrich_existing", "name": "SEGM", "existing_entity_id": None}
        ]
        doc_dir = _make_doc_dir(tmp_path, entity_proposals=proposals)
        warnings = _collect_provenance_warnings(doc_dir)
        assert any("existing_entity_id" in w for w in warnings)
        assert any("SEGM" in w for w in warnings)

    def test_no_warning_when_enrich_existing_has_id(self, tmp_path):
        proposals = [
            {"action": "enrich_existing", "name": "SEGM", "existing_entity_id": "seg-001"}
        ]
        doc_dir = _make_doc_dir(tmp_path, entity_proposals=proposals)
        assert not any(
            "existing_entity_id" in w
            for w in _collect_provenance_warnings(doc_dir)
        )

    def test_no_warning_for_add_new_without_id(self, tmp_path):
        # add_new proposals don't need existing_entity_id — absence is expected
        proposals = [
            {"action": "add_new", "name": "NewOrg", "existing_entity_id": None}
        ]
        doc_dir = _make_doc_dir(tmp_path, entity_proposals=proposals)
        assert not any(
            "existing_entity_id" in w
            for w in _collect_provenance_warnings(doc_dir)
        )

    def test_warning_names_multiple_missing_entities(self, tmp_path):
        proposals = [
            {"action": "enrich_existing", "name": "SEGM",     "existing_entity_id": None},
            {"action": "enrich_existing", "name": "Genspect", "existing_entity_id": None},
        ]
        doc_dir = _make_doc_dir(tmp_path, entity_proposals=proposals)
        entity_warn = next(
            w for w in _collect_provenance_warnings(doc_dir)
            if "existing_entity_id" in w
        )
        assert "SEGM" in entity_warn
        assert "Genspect" in entity_warn

    def test_no_enrichment_file_no_entity_warning(self, tmp_path):
        doc_dir = _make_doc_dir(tmp_path)  # no entity_proposals kwarg → no enrichment.json
        assert not any(
            "existing_entity_id" in w
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
        assert any("source_type mismatch" in w for w in warnings)
        assert any("video" in w for w in warnings)
        assert any("url" in w for w in warnings)

    def test_no_mismatch_warning_when_types_agree(self, tmp_path):
        doc_dir, cfg = self._setup_queue_env(
            tmp_path, "qmok", intake_st="url", queue_st="url", queue_dth="unknown"
        )
        warnings = _collect_provenance_warnings(doc_dir, config=cfg)
        assert not any("source_type mismatch" in w for w in warnings)

    def test_no_mismatch_warning_when_config_is_none(self, tmp_path):
        doc_dir = _make_doc_dir(tmp_path)
        # config=None → queue check skipped entirely
        warnings = _collect_provenance_warnings(doc_dir, config=None)
        assert not any("mismatch" in w for w in warnings)

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
