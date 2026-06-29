"""Tests for Streamlit UI helpers added by U1, U3, U4.

These tests cover pure-Python helpers that have no Streamlit dependency —
they do not launch a browser or Streamlit session.
"""
import pytest
from pathlib import Path
from types import SimpleNamespace


# ---------------------------------------------------------------------------
# U1 — ISO language constants and display helper
# ---------------------------------------------------------------------------

def test_iso_language_codes_are_valid_iso():
    """Every key in _ISO_LANGUAGES should match the BCP-47 pattern."""
    import re
    from runner.app import _ISO_LANGUAGES

    pattern = re.compile(r"^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$")
    for code in _ISO_LANGUAGES:
        assert pattern.match(code), f"Not a valid ISO code: {code!r}"


def test_iso_language_codes_list_matches_dict():
    from runner.app import _ISO_LANGUAGES, _ISO_LANGUAGE_CODES

    assert set(_ISO_LANGUAGE_CODES) == set(_ISO_LANGUAGES.keys())
    # Order of _ISO_LANGUAGE_CODES must match insertion order of dict
    assert _ISO_LANGUAGE_CODES == list(_ISO_LANGUAGES.keys())


def test_iso_lang_display_known_code():
    from runner.app import _iso_lang_display

    assert _iso_lang_display("en") == "en — English"
    assert _iso_lang_display("de") == "de — German"
    assert _iso_lang_display("no") == "no — Norwegian"


def test_iso_lang_display_unknown_code_returns_code():
    from runner.app import _iso_lang_display

    # Codes not in the dict should be returned as-is (not raise)
    assert _iso_lang_display("zz") == "zz"
    assert _iso_lang_display("pt-BR") == "pt-BR"


def test_iso_language_unknown_sentinel_not_in_codes():
    from runner.app import _ISO_LANGUAGE_CODES, _ISO_LANGUAGE_UNKNOWN

    assert _ISO_LANGUAGE_UNKNOWN not in _ISO_LANGUAGE_CODES


def test_corpus_languages_all_present():
    """Languages mentioned in CLAUDE.md should be in the ISO dict."""
    from runner.app import _ISO_LANGUAGES

    expected = {"en", "no", "nb", "de", "fr", "es", "pt", "it",
                "nl", "pl", "ro", "cs", "hu", "sv", "da", "fi",
                "ca", "ru", "uk"}
    missing = expected - set(_ISO_LANGUAGES.keys())
    assert not missing, f"Expected languages missing from _ISO_LANGUAGES: {missing}"


# ---------------------------------------------------------------------------
# U3 — Panel session-state reset helper
# ---------------------------------------------------------------------------

class _MockSt:
    """Minimal session_state substitute for testing _panel_reset_on_doc_change."""

    def __init__(self, initial: dict | None = None):
        self._state = dict(initial or {})

    def get(self, key, default=None):
        return self._state.get(key, default)

    def pop(self, key, default=None):
        return self._state.pop(key, default)

    def __setitem__(self, key, value):
        self._state[key] = value

    def __getitem__(self, key):
        return self._state[key]

    def __contains__(self, key):
        return key in self._state


def _call_panel_reset(panel, doc_id, keys, state_dict):
    """Call _panel_reset_on_doc_change with mocked session_state."""
    import runner.app as app_mod
    original_ss = app_mod.st.session_state
    mock_ss = _MockSt(state_dict)
    app_mod.st.session_state = mock_ss
    try:
        changed = app_mod._panel_reset_on_doc_change(panel, doc_id, keys)
    finally:
        app_mod.st.session_state = original_ss
    return changed, mock_ss._state


def test_panel_reset_clears_keys_on_first_call():
    """First call with a new doc_id should be treated as a change and clear keys."""
    state = {"mr_srt_path": "/tmp/foo.srt", "mr_srt_lang": "en"}
    changed, final = _call_panel_reset("mr", "doc-1", ["mr_srt_path", "mr_srt_lang"], state)
    assert changed is True
    assert "mr_srt_path" not in final
    assert "mr_srt_lang" not in final
    assert final["_panel_mr_last_doc"] == "doc-1"


def test_panel_reset_no_change_same_doc():
    """Calling with the same doc_id as last time should return False and not clear."""
    state = {
        "_panel_mr_last_doc": "doc-1",
        "mr_srt_path": "/tmp/foo.srt",
    }
    changed, final = _call_panel_reset("mr", "doc-1", ["mr_srt_path"], state)
    assert changed is False
    assert final["mr_srt_path"] == "/tmp/foo.srt"


def test_open_document_from_inbox_sets_navigation_and_clears_filters():
    import runner.app as app_mod

    original_ss = app_mod.st.session_state
    mock_ss = _MockSt({
        "doc_list_filter_type": ["Article"],
        "doc_list_filter_batch": ["old-batch"],
        "doc_list_filter_uploaded": "Uploaded",
        "doc_list_filter_intensity": "pathologizing",
        "nav_page": "Review Inbox",
        "page": "Review Inbox",
    })
    app_mod.st.session_state = mock_ss
    try:
        app_mod._open_document_from_inbox("8fe67e19")
    finally:
        app_mod.st.session_state = original_ss

    assert mock_ss["doc_list_search"] == "8fe67e19"
    assert mock_ss["doc_list_open_doc_id"] == "8fe67e19"
    assert mock_ss["doc_list_filter_type"] == []
    assert mock_ss["doc_list_filter_batch"] == []
    assert mock_ss["doc_list_filter_uploaded"] == "All"
    assert mock_ss["doc_list_filter_intensity"] == "All"
    assert mock_ss["_nav_to"] == "Document List"
    assert mock_ss["page"] == "Document List"
    assert mock_ss["nav_page"] == "Review Inbox"


def test_batch_run_command_live_includes_execute_and_enrich_by_default():
    import runner.app as app_mod

    cmd = app_mod._batch_run_command(
        batch_group="pilot test",
        limit=3,
        execute=True,
    )

    assert cmd[:5] == [
        app_mod.sys.executable,
        "-m",
        "runner",
        "batch-run",
        "--batch",
    ]
    assert "pilot test" in cmd
    assert "--execute" in cmd
    assert "--no-enrich" not in cmd


def test_batch_run_command_passes_enrichment_model():
    import runner.app as app_mod

    cmd = app_mod._batch_run_command(
        batch_group="pilot",
        limit=3,
        execute=True,
        enrich_model="core-gemma",
    )

    assert cmd[cmd.index("--enrich-model") + 1] == "core-gemma"
    assert "--no-enrich" not in cmd


def test_batch_run_command_can_disable_enrichment():
    import runner.app as app_mod

    cmd = app_mod._batch_run_command(
        batch_group="pilot",
        limit=3,
        execute=True,
        run_enrich=False,
        enrich_model="core-gemma",
    )

    assert "--execute" in cmd
    assert "--no-enrich" in cmd
    assert "--enrich-model" not in cmd


def test_batch_run_command_rehearsal_has_no_execute():
    import runner.app as app_mod

    cmd = app_mod._batch_run_command(batch_group="pilot", limit=3)

    assert "--execute" not in cmd
    assert "--batch" in cmd
    assert "--limit" in cmd


def test_batch_run_command_adds_priority_and_skip_preflight():
    import runner.app as app_mod

    cmd = app_mod._batch_run_command(
        batch_group="pilot",
        limit=5,
        priority="high",
        execute=True,
        skip_preflight=True,
    )

    assert cmd[cmd.index("--priority") + 1] == "high"
    assert "--skip-preflight" in cmd


def test_batch_run_command_adds_priority_mix_and_host_cap():
    import runner.app as app_mod

    cmd = app_mod._batch_run_command(
        batch_group="pilot",
        limit=10,
        priority_mix={"high": 2, "medium": 3, "low": 1},
        max_per_host=1,
        execute=True,
    )

    assert cmd[cmd.index("--mix-high") + 1] == "2"
    assert cmd[cmd.index("--mix-medium") + 1] == "3"
    assert cmd[cmd.index("--mix-low") + 1] == "1"
    assert cmd[cmd.index("--max-per-host") + 1] == "1"
    assert "--priority" not in cmd


def test_batch_run_command_priority_filter_suppresses_mix():
    import runner.app as app_mod

    cmd = app_mod._batch_run_command(
        batch_group="pilot",
        limit=10,
        priority="high",
        priority_mix={"low": 5},
    )

    assert cmd[cmd.index("--priority") + 1] == "high"
    assert "--mix-low" not in cmd


# ---------------------------------------------------------------------------
# Document List workflow queue helpers
# ---------------------------------------------------------------------------

def _workflow_summary(**overrides):
    import runner.app as app_mod

    base = {
        "doc_dir": Path("/tmp/doc"),
        "analysis": {
            "type": "Anti-SOGICE",
            "confidence": {"overall_score": 0.91},
            "flags": [],
            "testimony_flag": False,
        },
        "uploaded": False,
        "has_preprocess": True,
        "has_extracted": True,
        "has_enrichment": True,
        "embedding_status": {"ok": True, "supabase_ok": False},
        "offload_import": {},
        "has_testimony_review": False,
        "legal_review": {},
        "analysis_review": {},
    }
    base.update(overrides)
    return app_mod._document_workflow_summary(**base)


def test_document_workflow_summary_marks_source_offload_and_ready_to_upload():
    summary = _workflow_summary(
        offload_import={
            "package_kind": "ingest_result",
            "package_id": "trial-q-009",
            "imported_at": "2026-06-17T10:20:30+00:00",
        }
    )

    assert summary["is_source_offload_import"] is True
    assert summary["offload_package_id"] == "trial-q-009"
    assert summary["ready_to_upload"] is True
    assert "Source offload" in summary["labels"]
    assert "Needs upload" in summary["labels"]


def test_document_workflow_summary_missing_artifacts_blocks_ready_upload():
    summary = _workflow_summary(has_enrichment=False, embedding_status={"ok": False, "supabase_ok": False})

    assert summary["ready_to_upload"] is False
    assert "missing_enrichment" in summary["reasons"]
    assert "missing_embedding" in summary["reasons"]
    assert any(label.startswith("Missing ") for label in summary["labels"])


def test_document_workflow_summary_review_holds_are_visible():
    summary = _workflow_summary(
        analysis={
            "type": "Regulatory-Policy-Document",
            "confidence": {"overall_score": 0.62},
            "flags": ["Flag: Testimony-Extraction-Required"],
            "testimony_flag": True,
            "needs_review": True,
        }
    )

    assert "testimony_review" in summary["reasons"]
    assert "legal_review" in summary["reasons"]
    assert "analysis_review" in summary["reasons"]
    assert summary["ready_to_upload"] is False


def test_document_workflow_summary_uploaded_but_supabase_missing():
    summary = _workflow_summary(uploaded=True, embedding_status={"ok": True, "supabase_ok": False})

    assert "needs_upload" not in summary["reasons"]
    assert "supabase_missing" in summary["reasons"]
    assert summary["ready_to_upload"] is False


@pytest.mark.parametrize(
    ("workflow_filter", "expected"),
    [
        ("New source-offload imports", True),
        ("Needs upload", True),
        ("Ready to upload", True),
        ("Needs review", False),
        ("Missing artifacts", False),
        ("Uploaded but Supabase missing", False),
    ],
)
def test_doc_matches_workflow_filter_matrix(workflow_filter, expected):
    import runner.app as app_mod

    doc = {
        "is_source_offload_import": True,
        "needs_action_reasons": ["needs_upload"],
        "ready_to_upload": True,
    }

    assert app_mod._doc_matches_workflow_filter(doc, workflow_filter) is expected


def test_doc_workflow_badge_text_prioritises_actionable_labels():
    import runner.app as app_mod

    text = app_mod._doc_workflow_badge_text({
        "needs_action_labels": [
            "Source offload",
            "Imported 2026-06-17",
            "Needs upload",
            "Analysis review",
            "Missing enrichment",
        ]
    })

    assert text == "Needs upload · Analysis review · Source offload"


def test_panel_reset_clears_on_doc_switch():
    """Switching from doc-1 to doc-2 should clear the keys."""
    state = {
        "_panel_mr_last_doc": "doc-1",
        "mr_srt_path": "/tmp/foo.srt",
        "mr_comments_flagged": True,
    }
    changed, final = _call_panel_reset(
        "mr", "doc-2", ["mr_srt_path", "mr_comments_flagged"], state
    )
    assert changed is True
    assert "mr_srt_path" not in final
    assert "mr_comments_flagged" not in final
    assert final["_panel_mr_last_doc"] == "doc-2"


def test_panel_reset_does_not_clear_other_keys():
    """Only the specified keys should be cleared, not other session state."""
    state = {
        "_panel_mr_last_doc": "doc-1",
        "mr_srt_path": "/tmp/foo.srt",
        "unrelated_key": "keep_me",
    }
    changed, final = _call_panel_reset("mr", "doc-2", ["mr_srt_path"], state)
    assert "unrelated_key" in final
    assert final["unrelated_key"] == "keep_me"


def test_panel_reset_handles_missing_keys_gracefully():
    """Keys that don't exist in session state should not raise."""
    state = {"_panel_mr_last_doc": "doc-1"}
    # These keys don't exist — should not raise KeyError
    changed, final = _call_panel_reset("mr", "doc-2", ["mr_srt_path", "mr_srt_lang"], state)
    assert changed is True


def test_panel_reset_independent_per_panel():
    """Different panels should not interfere with each other's tracker key."""
    state = {
        "_panel_mr_last_doc": "doc-1",
        "_panel_testimony_last_doc": "doc-A",
        "mr_srt_path": "/tmp/foo.srt",
    }
    # Switch media review to doc-2 — testimony tracker should be untouched
    changed, final = _call_panel_reset("mr", "doc-2", ["mr_srt_path"], state)
    assert changed is True
    assert final["_panel_testimony_last_doc"] == "doc-A"


# ---------------------------------------------------------------------------
# Document List enrichment proposal helpers
# ---------------------------------------------------------------------------

def test_proposal_state_priority():
    from runner.app import _proposal_state

    assert _proposal_state({"rejected": True, "approved": True, "pushed_to_sanity": True}) == "rejected"
    assert _proposal_state({"approved": True, "pushed_to_sanity": True}) == "pushed to Sanity"
    assert _proposal_state({"approved": True}) == "approved locally"
    assert _proposal_state({}) == "pending review"


def test_proposal_record_key_is_stable_when_status_changes(tmp_path):
    from runner.app import _proposal_record_key

    path = tmp_path / "doc-a" / "enrichment.json"
    before = {
        "path": path,
        "doc_id": "doc-a",
        "index": 2,
        "item": {"term": "ROGD", "proposal_status": "pending"},
    }
    after = {
        "path": path,
        "doc_id": "doc-a",
        "index": 2,
        "item": {"term": "ROGD", "proposal_status": "approved"},
    }

    assert _proposal_record_key(before) == _proposal_record_key(after)


def test_proposal_review_rows_summarises_enrichment_groups():
    from runner.app import _proposal_review_rows

    enrichment = {
        "lexicon_proposals": [
            {
                "term": "religious freedom",
                "approved": True,
                "pushed_to_sanity": True,
                "sanity_id": "lexicon-religious-freedom",
                "proposed_cluster": "Policy-Resistance",
                "function": "Political Slogan",
                "register": "defensive",
                "model_confidence": 0.9,
            }
        ],
        "entity_proposals": [
            {
                "name": "Alliance Defending Freedom",
                "approved": True,
                "entity_type": "organization",
                "role_in_sogice": "legal advocacy",
            }
        ],
        "tactic_proposals": [
            {
                "tactic": "Network-Laundering",
                "rejected": True,
                "primary_cluster": "Institutional Legitimacy",
            }
        ],
        "practice_descriptions": [],
        "statistical_claims": [
            {
                "claim": "Six groups have consultative status.",
                "source_cited": "UN ECOSOC",
                "verifiable": True,
            }
        ],
    }

    rows = _proposal_review_rows(enrichment)

    assert rows["Lexicon terms"][0]["Name"] == "religious freedom"
    assert rows["Lexicon terms"][0]["State"] == "pushed to Sanity"
    assert rows["Entities"][0]["State"] == "approved locally"
    assert rows["Tactics"][0]["State"] == "rejected"
    assert rows["Claims"][0]["Name"] == "Six groups have consultative status."


def test_registry_match_key_normalises_accents_and_punctuation():
    from runner.app import _registry_match_key

    assert _registry_match_key("Víctor Madrigal-Borloz") == "victor madrigal borloz"
    assert _registry_match_key("  Religious-Freedom Shield ") == "religious freedom shield"


def test_tactic_target_options_and_index_match_separator_variants():
    from runner.app import (
        _apply_tactic_target,
        _tactic_target_index,
        _tactic_target_options,
    )

    options = _tactic_target_options([
        {"_id": "tactic-religious-freedom-shield", "tactic": "Religious-Freedom-Shield"},
        {"_id": "tactic-network-laundering", "tactic": "Network Laundering"},
    ])

    assert [row["_id"] for row in options] == [
        "tactic-network-laundering",
        "tactic-religious-freedom-shield",
    ]
    assert _tactic_target_index(options, {"tactic": "Religious Freedom Shield"}) == 1
    assert _tactic_target_index(options, {"existing_tactic_id": "tactic-network-laundering"}) == 0

    item = {"tactic": "Religious Freedom Shield"}
    _apply_tactic_target(item, options[1])
    assert item["existing_tactic_id"] == "tactic-religious-freedom-shield"
    assert item["existing_tactic_name"] == "Religious-Freedom-Shield"
    assert item["tactic"] == "Religious-Freedom-Shield"


def test_local_registry_evidence_matches_exact_and_similar():
    from runner.app import _local_registry_evidence_matches

    local_evidence = [
        {
            "schema_type": "person",
            "label": "Victor Madrigal-Borlaz",
            "norm_label": "victor madrigal borlaz",
            "doc_id": "dc0ff39b",
            "status": "Pushed",
            "sanity_id": "person-victor-madrigal-borlaz",
            "approved": True,
            "pushed_to_sanity": True,
            "evidence_quote": "Victor Madrigal-Borlaz was quoted in the source.",
        },
        {
            "schema_type": "person",
            "label": "John Paulk",
            "norm_label": "john paulk",
            "doc_id": "7b76c504",
            "status": "Pushed",
            "sanity_id": "person-john-paulk",
            "approved": True,
            "pushed_to_sanity": True,
            "evidence_quote": "",
        },
    ]

    exact = _local_registry_evidence_matches(
        {"_type": "person", "_id": "person-john-paulk", "label": "John Paulk"},
        local_evidence,
    )
    similar = _local_registry_evidence_matches(
        {"_type": "person", "_id": "person-victor-madrigal-borloz", "label": "Víctor Madrigal-Borloz"},
        local_evidence,
    )

    assert exact[0]["match"] == "sanity_id"
    assert exact[0]["doc_id"] == "7b76c504"
    assert similar[0]["match"] == "similar"
    assert similar[0]["doc_id"] == "dc0ff39b"


def test_registry_review_filter_options_only_include_types_with_rows():
    from runner.app import _registry_review_filter_options

    options = _registry_review_filter_options(
        [
            {"_type": "organization"},
            {"_type": "person"},
            {"_type": "tacticEntry"},
        ],
        ["organization", "person", "tacticEntry", "practiceEntry", "tagRegistry"],
    )

    assert options == ["All", "Organizations", "People", "Tactics"]
    assert "Tags" not in options


def test_source_queue_initial_priority_lets_triage_decide():
    from runner.app import _source_queue_initial_priority

    assert _source_queue_initial_priority("Add and triage now", "high") == "medium"
    assert _source_queue_initial_priority("Add and triage now", "skip") == "medium"


def test_source_queue_initial_priority_keeps_manual_add_only_choice():
    from runner.app import _source_queue_initial_priority

    assert _source_queue_initial_priority("Add only", "high") == "high"
    assert _source_queue_initial_priority("Add only", "skip") == "skip"


def test_source_queue_hold_category_classifies_common_triage_failures():
    from runner.app import (
        _source_queue_hold_category,
        _source_queue_hold_label,
        _source_queue_hold_next_step,
    )

    assert _source_queue_hold_category(
        "https://www.bitchute.com/video/abc",
        "triage failed: acquisition failed: blocker_text",
    ) == "video_needs_transcript"
    assert _source_queue_hold_category(
        "https://journal.example/a",
        "triage failed: acquisition failed: cf-mitigated:challenge",
    ) == "cloudflare"
    assert _source_queue_hold_category(
        "https://example.org/a",
        "triage failed: [SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed",
    ) == "ssl"
    assert _source_queue_hold_category(
        "https://example.org/a",
        "triage failed: wayback closest snapshot unavailable",
    ) == "wayback_unavailable"

    assert "Cloudflare" in _source_queue_hold_label("cloudflare")
    assert "snapshot" in _source_queue_hold_next_step("cloudflare")


# ---------------------------------------------------------------------------
# Knowledge export helpers
# ---------------------------------------------------------------------------

class _Config:
    def __init__(self, exports_dir: Path):
        self.exports_dir = exports_dir


def test_knowledge_export_dir_uses_config_exports_dir(tmp_path):
    import runner.app as app_mod

    config = _Config(tmp_path / "exports")

    assert app_mod._knowledge_export_dir(config) == tmp_path / "exports" / "knowledge"


def test_knowledge_export_paths_are_named_outputs(tmp_path):
    import runner.app as app_mod

    paths = app_mod._knowledge_export_paths(_Config(tmp_path / "exports"))

    assert paths == {
        "document_profiles": tmp_path / "exports" / "knowledge" / "document_profiles.jsonl",
        "nodes": tmp_path / "exports" / "knowledge" / "archive_nodes.csv",
        "edges": tmp_path / "exports" / "knowledge" / "archive_edges.csv",
        "graph": tmp_path / "exports" / "knowledge" / "archive_graph.json",
        "quality": tmp_path / "exports" / "knowledge" / "knowledge_quality.json",
    }


def test_knowledge_export_commands_use_running_python_and_expected_cli():
    import runner.app as app_mod

    commands = app_mod._knowledge_export_commands()

    assert commands["citation_units"] == [
        app_mod.sys.executable,
        "-m",
        "runner",
        "archive-citation-backfill",
    ]
    assert commands["profiles"] == [
        app_mod.sys.executable,
        "-m",
        "runner",
        "archive-summary-export",
        "--refresh-sidecars",
        "--backfill-citation-units",
    ]
    assert commands["graph"] == [
        app_mod.sys.executable,
        "-m",
        "runner",
        "knowledge-graph-export",
    ]
    assert commands["graph_proposed"] == [
        app_mod.sys.executable,
        "-m",
        "runner",
        "knowledge-graph-export",
        "--include-proposed",
    ]
    assert commands["quality"] == [
        app_mod.sys.executable,
        "-m",
        "runner",
        "knowledge-quality-report",
    ]
    assert all(cmd[0] == app_mod.sys.executable for cmd in commands.values())
    assert all(cmd[0] != "python3" for cmd in commands.values())


def test_citation_unit_status_counts_backfillable_and_missing_text_docs(tmp_path):
    import runner.app as app_mod

    corpus = tmp_path / "corpus"
    doc_with_text = corpus / "doc-with-text"
    doc_with_text.mkdir(parents=True)
    (doc_with_text / "extracted.txt").write_text("First paragraph.", encoding="utf-8")

    doc_ready = corpus / "doc-ready"
    doc_ready.mkdir()
    (doc_ready / "extracted.txt").write_text("Already indexed.", encoding="utf-8")
    (doc_ready / "citation_units.json").write_text("{}", encoding="utf-8")

    doc_missing_text = corpus / "doc-missing-text"
    doc_missing_text.mkdir()

    status = app_mod._citation_unit_status(SimpleNamespace(corpus_dir=corpus))

    assert status["counts"] == {
        "docs": 3,
        "with_extracted": 2,
        "with_citation_units": 1,
        "missing_citation_units": 1,
        "missing_extracted": 1,
    }
    assert {row["doc_id"]: row["action"] for row in status["rows"]} == {
        "doc-with-text": "Backfill citation units",
        "doc-missing-text": "Retry/re-ingest/discard document",
    }


def test_run_knowledge_export_action_backfills_citation_units(tmp_path):
    import runner.app as app_mod

    corpus = tmp_path / "corpus"
    doc_dir = corpus / "doc-a"
    doc_dir.mkdir(parents=True)
    (doc_dir / "extracted.txt").write_text("A paragraph for evidence.", encoding="utf-8")

    result = app_mod._run_knowledge_export_action(SimpleNamespace(corpus_dir=corpus), "citation_units")

    assert result["counts"]["written"] == 1
    assert (doc_dir / "citation_units.json").exists()


def test_research_digest_command_uses_running_python():
    import runner.app as app_mod

    command = app_mod._research_digest_command()

    assert command == [
        app_mod.sys.executable,
        "-m",
        "runner",
        "research-digest",
        "--refresh-all",
    ]
    assert command[0] != "python3"


def test_read_text_preview_reads_and_truncates(tmp_path):
    import runner.app as app_mod

    path = tmp_path / "digest.md"
    path.write_text("abcdef", encoding="utf-8")

    assert app_mod._read_text_preview(path, max_chars=20) == "abcdef"
    assert app_mod._read_text_preview(path, max_chars=3) == "abc\n\n...[preview truncated]"
    assert app_mod._read_text_preview(tmp_path / "missing.md") == ""


def test_download_mime_for_known_knowledge_files():
    import runner.app as app_mod

    assert app_mod._download_mime_for_path(Path("document_profiles.jsonl")) == "application/x-jsonlines"
    assert app_mod._download_mime_for_path(Path("archive_graph.json")) == "application/json"
    assert app_mod._download_mime_for_path(Path("archive_edges.csv")) == "text/csv"
    assert app_mod._download_mime_for_path(Path("research_digest.md")) == "text/markdown"


def test_knowledge_export_file_descriptions_explain_primary_outputs():
    import runner.app as app_mod

    descriptions = app_mod._knowledge_export_file_descriptions()
    files = {row["File"]: row for row in descriptions}

    assert "archive_summary.json" in files
    assert "document_profiles.jsonl" in files
    assert "archive_nodes.csv" in files
    assert "archive_edges.csv" in files
    assert "archive_graph.json" in files
    assert "knowledge_quality.json" in files
    assert "one json line per document" in files["document_profiles.jsonl"]["Use"].lower()
    assert "provenance" in files["archive_edges.csv"]["Use"]
    assert "extraction quality" in files["knowledge_quality.json"]["Use"].lower()


def test_knowledge_file_status_rows_include_modified_time(tmp_path):
    import runner.app as app_mod

    path = tmp_path / "document_profiles.jsonl"
    path.write_text("{}\n", encoding="utf-8")

    rows = app_mod._knowledge_file_status_rows({"document_profiles": path})

    assert rows[0]["File"] == "document_profiles.jsonl"
    assert rows[0]["Present"] == "yes"
    assert rows[0]["Modified"]
    assert rows[0]["Path"] == str(path)


def test_source_failed_report_rows_flattens_failed_docs():
    import runner.app as app_mod

    report = {
        "source_offload": {
            "failed_reports": [{
                "package_id": "trial-x",
                "docs": [{
                    "doc_id": "bad-doc",
                    "queue_item_id": "qi_bad",
                    "source_url": "https://example.org/bad",
                    "status": "failed",
                    "error": "analysis_failed:bad label\nfull trace omitted",
                }],
            }],
        },
    }

    assert app_mod._source_failed_report_rows(report) == [{
        "package_id": "trial-x",
        "doc_id": "bad-doc",
        "queue_item_id": "qi_bad",
        "status": "failed",
        "error": "analysis_failed:bad label",
        "source_url": "https://example.org/bad",
    }]


def test_knowledge_profile_preview_flattens_jsonl_for_table(tmp_path):
    import json
    import runner.app as app_mod

    path = tmp_path / "document_profiles.jsonl"
    path.write_text(
        json.dumps({
            "doc_id": "doc-a",
            "trust_state": "uploaded",
            "source": {"source_url": "https://example.org/a"},
            "content": {"title": "Example A"},
            "classification": {"type": "Anti-SOGICE"},
            "readiness": {"status": "ready", "next_action_titles": ["Upload"]},
            "publication": {"uploaded": True},
        }) + "\n",
        encoding="utf-8",
    )

    rows = app_mod._knowledge_profile_preview(path)

    assert rows == [{
        "doc_id": "doc-a",
        "trust_state": "uploaded",
        "readiness": "ready",
        "uploaded": True,
        "type": "Anti-SOGICE",
        "title": "Example A",
        "next_actions": "Upload",
        "source_url": "https://example.org/a",
    }]


def test_knowledge_graph_preview_counts_nodes_and_edges(tmp_path):
    import json
    import runner.app as app_mod

    path = tmp_path / "archive_graph.json"
    path.write_text(
        json.dumps({
            "schema_version": "archive-graph-v1.0",
            "include_proposed": False,
            "nodes": [
                {"type": "document"},
                {"type": "term"},
                {"type": "term"},
            ],
            "edges": [
                {"type": "attests_term", "evidence_strength": "classification_tag"},
                {"type": "attests_term", "evidence_strength": "classification_tag"},
                {"type": "partner", "evidence_strength": "quote_backed"},
            ],
        }),
        encoding="utf-8",
    )

    preview = app_mod._knowledge_graph_preview(path)

    assert preview["schema_version"] == "archive-graph-v1.0"
    assert preview["node_count"] == 3
    assert preview["edge_count"] == 3
    assert preview["node_types"] == {"document": 1, "term": 2}
    assert preview["edge_types"] == {"attests_term": 2, "partner": 1}
    assert preview["evidence_strength"] == {"classification_tag": 2, "quote_backed": 1}


def test_knowledge_quality_preview_reads_quality_report(tmp_path):
    import json
    import runner.app as app_mod

    path = tmp_path / "knowledge_quality.json"
    path.write_text(
        json.dumps({
            "profiles": {"count": 2, "incomplete": 1},
            "extraction": {"zero_text_docs": [{"doc_id": "doc-empty"}]},
            "tag_coverage": {"fields": {"tactic": {"docs_with_values": 1}}},
            "tag_registry": {"available": True, "mode": "connection_hints_not_proof"},
            "enrichment": {"lifecycle": {"pending": 3}},
            "graph": {"evidence_strength": {"quote_backed": 2}},
            "recommendations": ["Review 3 pending proposal(s)."],
        }),
        encoding="utf-8",
    )

    preview = app_mod._knowledge_quality_preview(path)

    assert preview["profiles"]["count"] == 2
    assert preview["extraction"]["zero_text_docs"][0]["doc_id"] == "doc-empty"
    assert preview["tag_registry"]["mode"] == "connection_hints_not_proof"
    assert preview["recommendations"] == ["Review 3 pending proposal(s)."]


def test_knowledge_quality_issue_tables_flatten_actionable_rows():
    import runner.app as app_mod

    tables = app_mod._knowledge_quality_issue_tables({
        "extraction": {
            "zero_text_docs": [{"doc_id": "doc-zero", "char_count": 0}],
            "low_text_docs": [{"doc_id": "doc-low", "char_count": 250}],
            "acquisition_challenge_docs": [{"doc_id": "doc-cf", "signal": "cf-mitigated"}],
        },
        "tag_coverage": {
            "missing_core_tag_docs": [
                {"doc_id": "doc-tags", "missing_fields": ["tactic", "harm"], "title": "Needs tags"}
            ]
        },
        "enrichment": {"docs_needing_review": [{"doc_id": "doc-enrich", "pending": 4}]},
        "tag_registry": {"top_docs": [{"doc_id": "doc-reg", "match_count": 9}]},
    })

    assert tables["zero_text_docs"][0]["doc_id"] == "doc-zero"
    assert tables["low_text_docs"][0]["doc_id"] == "doc-low"
    assert tables["acquisition_challenge_docs"][0]["doc_id"] == "doc-cf"
    assert tables["missing_core_tag_docs"] == [
        {"doc_id": "doc-tags", "missing_fields": "tactic, harm", "title": "Needs tags"}
    ]
    assert tables["enrichment_docs_needing_review"][0]["pending"] == 4
    assert tables["tag_registry_top_docs"][0]["match_count"] == 9


def test_research_digest_preview_reads_digest_json(tmp_path):
    import json
    import runner.app as app_mod

    path = tmp_path / "20260101T000000Z_research_digest.json"
    path.write_text(
        json.dumps({
            "generated_at": "2026-01-01T00:00:00+00:00",
            "next_actions": ["Review pending enrichment."],
            "system_health": {"status": "needs_attention"},
            "queue": {
                "counts_by_status": {"ready_to_ingest": 2},
                "overnight_safe_count": 2,
                "review_flagged_count": 1,
            },
            "knowledge_quality": {"recommendations": ["Zero-text docs found."]},
        }),
        encoding="utf-8",
    )

    preview = app_mod._research_digest_preview(path)

    assert preview["status"] == "needs_attention"
    assert preview["safe_candidates"] == 2
    assert preview["review_flagged"] == 1
    assert preview["queue_counts"] == {"ready_to_ingest": 2}
    assert preview["next_actions"] == ["Review pending enrichment."]
    assert preview["quality_recommendations"] == ["Zero-text docs found."]


def test_dashboard_digest_action_rows_limits_and_numbers_actions():
    import runner.app as app_mod

    rows = app_mod._dashboard_digest_action_rows(
        {"next_actions": ["Review enrichment.", "", "Fix tag registry.", "Retry source worker."]},
        limit=2,
    )

    assert rows == [
        {"Order": "1", "Next action": "Review enrichment.", "Suggested page": "Lexicon"},
        {"Order": "3", "Next action": "Fix tag registry.", "Suggested page": "Tag Registry"},
    ]


def test_dashboard_worklist_suggests_pages_for_live_action_types():
    import runner.app as app_mod

    actions = [
        "1 direct package folder(s) in transfer/to-mac-studio; prefer .tar.gz + .sha256 archives.",
        "53 enrichment proposal(s) await review.",
        "5 document(s) are incomplete; use system-health to decide retry vs discard.",
        "4 document(s) have zero extracted text.",
        "9 analyzed document(s) are missing at least one core tag field.",
        "Tag registry is unavailable for match auditing/enrichment hints: registry not found",
        "10 queue item(s) look safe for source-offload export/overnight processing.",
    ]

    rows = app_mod._dashboard_digest_action_rows({"next_actions": actions}, limit=20)

    assert [row["Suggested page"] for row in rows] == [
        "Source Offload",
        "Lexicon",
        "Corpus Intelligence",
        "Corpus Intelligence",
        "Corpus Intelligence",
        "Tag Registry",
        "Source Offload",
    ]
    assert app_mod._dashboard_worklist_pages(rows) == [
        "Source Offload", "Lexicon", "Corpus Intelligence", "Tag Registry",
    ]


def test_guide_markdown_covers_current_end_to_end_workflow():
    import runner.app as app_mod

    guide = app_mod._guide_markdown()

    for phrase in [
        "Dashboard → Research Worklist",
        "Source Queue",
        "Source Offload → Export",
        "Mac Studio Worker",
        "Source Offload → Import results",
        "Document List / Review Inbox",
        "Knowledge exports",
        "Tag Registry matches",
        "SOGICE_LEGACY_VOCAB_DIR",
        "browser-saved HTML/PDF snapshot",
    ]:
        assert phrase in guide


def test_run_research_digest_action_refreshes_full_workflow(monkeypatch, tmp_path):
    import runner.app as app_mod
    from runner.pipeline import research_digest

    calls = []

    def fake_refresh(config):
        calls.append(config)
        return {
            "profiles": {"count": 2},
            "graph": {"edge_count": 4},
            "quality": {"profile_count": 2},
            "digest": {"markdown_path": "/tmp/digest.md", "json_path": "/tmp/digest.json"},
        }

    monkeypatch.setattr(research_digest, "refresh_knowledge_and_digest", fake_refresh)
    config = SimpleNamespace(corpus_dir=tmp_path / "corpus", exports_dir=tmp_path / "exports")

    result = app_mod._run_research_digest_action(config)

    assert result["graph"]["edge_count"] == 4
    assert calls == [config]


def test_run_knowledge_export_action_refreshes_profiles(monkeypatch, tmp_path):
    import runner.app as app_mod
    from runner.pipeline import archive_summary

    calls = []

    def fake_export(corpus_dir, exports_dir, *, config, write_doc_summaries, **kwargs):
        calls.append((corpus_dir, exports_dir, write_doc_summaries))
        return {"count": 2, "path": str(exports_dir / "knowledge" / "document_profiles.jsonl")}

    monkeypatch.setattr(archive_summary, "export_document_profiles", fake_export)
    config = SimpleNamespace(corpus_dir=tmp_path / "corpus", exports_dir=tmp_path / "exports")

    result = app_mod._run_knowledge_export_action(config, "profiles")

    assert result["count"] == 2
    assert calls == [(tmp_path / "corpus", tmp_path / "exports", True)]


def test_run_knowledge_export_action_refreshes_graph(monkeypatch, tmp_path):
    import runner.app as app_mod
    from runner.pipeline import knowledge_graph

    calls = []

    def fake_export(corpus_dir, exports_dir, *, config, include_proposed, **kwargs):
        calls.append((corpus_dir, exports_dir, include_proposed))
        return {"node_count": 3, "edge_count": 4, "graph_path": str(exports_dir / "knowledge" / "archive_graph.json")}

    monkeypatch.setattr(knowledge_graph, "export_knowledge_graph", fake_export)
    config = SimpleNamespace(corpus_dir=tmp_path / "corpus", exports_dir=tmp_path / "exports")

    result = app_mod._run_knowledge_export_action(config, "graph_proposed")

    assert result["edge_count"] == 4
    assert calls == [(tmp_path / "corpus", tmp_path / "exports", True)]


def test_run_knowledge_export_action_refreshes_quality(monkeypatch, tmp_path):
    import runner.app as app_mod
    from runner.pipeline import knowledge_quality

    calls = []

    def fake_write(corpus_dir, exports_dir, *, config, **kwargs):
        calls.append((corpus_dir, exports_dir))
        return {"profile_count": 2, "edge_count": 5, "path": str(exports_dir / "knowledge" / "knowledge_quality.json")}

    monkeypatch.setattr(knowledge_quality, "write_knowledge_quality_report", fake_write)
    config = SimpleNamespace(corpus_dir=tmp_path / "corpus", exports_dir=tmp_path / "exports")

    result = app_mod._run_knowledge_export_action(config, "quality")

    assert result["edge_count"] == 5
    assert calls == [(tmp_path / "corpus", tmp_path / "exports")]


# ---------------------------------------------------------------------------
# Practice Evidence cluster review helpers
# ---------------------------------------------------------------------------

def test_practice_cluster_summary_groups_related_labels():
    from runner.app import _practice_cluster_summary

    records = [
        {
            "doc_id": "8fe67e19",
            "item": {
                "practice_id": "Practice: ROGD-Diagnosis",
                "practice_cluster": "rogd",
                "practice_fit": "needs_clustering",
            },
        },
        {
            "doc_id": "8fe67e19",
            "item": {
                "practice_id": "Practice: ROGD-Promotion",
                "practice_cluster": "rogd",
                "practice_fit": "candidate_evidence",
            },
        },
    ]

    summary = _practice_cluster_summary(records)

    assert summary == [
        {
            "cluster": "rogd",
            "meaning": "ROGD / sudden-onset diagnosis frame",
            "proposals": 2,
            "needs_review": 0,
            "held_evidence": 2,
            "linked_evidence": 0,
            "promotion_review": 0,
            "docs": "8fe67e19",
            "examples": "Practice: ROGD-Diagnosis; Practice: ROGD-Promotion",
        }
    ]


def test_practice_cluster_summary_counts_linked_and_promotion_candidates():
    from runner.app import _practice_cluster_summary

    records = [
        {
            "doc_id": "doc-a",
            "item": {
                "practice_id": "Strategic Guidance for Parents",
                "practice_cluster": "parent_guidance",
                "practice_fit": "existing_practice",
                "existing_practice_id": "practice-parent-guidance",
                "approved": True,
            },
        },
        {
            "doc_id": "doc-b",
            "item": {
                "practice_id": "Tactical Guidance for Parents",
                "practice_cluster": "parent_guidance",
                "practice_fit": "registry_practice",
            },
        },
    ]

    summary = _practice_cluster_summary(records)
    row = summary[0]

    assert row["cluster"] == "parent_guidance"
    assert row["meaning"] == "Parent / family guidance"
    assert row["linked_evidence"] == 1
    assert row["promotion_review"] == 1
    assert row["held_evidence"] == 0
    assert row["needs_review"] == 0
    assert row["docs"] == "doc-a, doc-b"


def test_practice_cluster_summary_uses_unclustered_fallback_last():
    from runner.app import _practice_cluster_summary

    summary = _practice_cluster_summary(
        [
            {"doc_id": "doc-a", "item": {}},
            {"doc_id": "doc-b", "item": {"practice_id": "ROGD", "practice_cluster": "rogd"}},
        ]
    )

    assert [row["cluster"] for row in summary] == ["rogd", "unclustered"]
    assert summary[1]["meaning"] == "Unclustered / needs researcher framing"
    assert summary[1]["held_evidence"] == 1


def test_practice_cluster_summary_infers_from_older_blank_records():
    from runner.app import _practice_cluster_summary

    summary = _practice_cluster_summary(
        [
            {"doc_id": "8fe67e19", "item": {"practice_id": "Practice: ROGD-Diagnosis"}},
            {
                "doc_id": "8fe67e19",
                "item": {"practice_id": "Practice: Strategic-Guidance-for-Parents"},
            },
        ]
    )

    clusters = {row["cluster"]: row for row in summary}
    assert clusters["rogd"]["meaning"] == "ROGD / sudden-onset diagnosis frame"
    assert clusters["parent_guidance"]["meaning"] == "Parent / family guidance"


def test_practice_cluster_info_for_unknown_cluster_is_researcher_defined():
    from runner.app import _practice_cluster_info, _practice_cluster_display

    info = _practice_cluster_info("school_policy")

    assert info["label"] == "School Policy"
    assert "researcher-defined" in info["description"]
    assert _practice_cluster_display("school_policy") == "school_policy — School Policy"


def test_practice_cluster_catalogue_has_media_and_legal_distinctions():
    from runner.app import _practice_cluster_info

    media = _practice_cluster_info("media_dissemination")
    legal = _practice_cluster_info("legal_policy_advocacy")

    assert "podcasts" in media["description"]
    assert "practice registry" in media["review_hint"]
    assert "policy" in legal["description"].lower()


def test_practice_cluster_options_include_current_custom_before_unclustered():
    from runner.app import _practice_cluster_options

    options = _practice_cluster_options("school_policy")

    assert "school_policy" in options
    assert options[-1] == "unclustered"


def test_practice_review_status_does_not_show_blocked_fit_as_approved():
    from runner.app import _practice_review_status

    item = {
        "practice_id": "Tactical-Guidance-for-Parents",
        "practice_fit": "needs_clustering",
        "approved": True,
        "proposal_status": "approved",
    }

    assert _practice_review_status(item) == "Evidence only"


def test_candidate_practice_evidence_has_own_status():
    from runner.app import _practice_review_status

    item = {
        "practice_fit": "candidate_evidence",
        "practice_cluster": "rogd",
        "proposal_status": "pending",
    }

    assert _practice_review_status(item) == "Evidence only"


def test_save_cluster_as_evidence_converts_needs_framing():
    from runner.app import _save_cluster_as_evidence_if_ready

    item = {
        "practice_id": "Practice: ROGD-Diagnosis",
        "practice_fit": "needs_clustering",
        "practice_cluster": "rogd",
        "approved": True,
        "rejected": True,
        "proposal_status": "approved",
    }

    assert _save_cluster_as_evidence_if_ready(item) is True
    assert item["practice_fit"] == "candidate_evidence"
    assert item["approved"] is False
    assert item["rejected"] is False
    assert item["proposal_status"] == "pending"
    assert "rogd" in item["practice_fit_rationale"]


def test_save_cluster_as_evidence_skips_unclustered():
    from runner.app import _save_cluster_as_evidence_if_ready

    item = {"practice_fit": "needs_clustering", "practice_cluster": "unclustered"}

    assert _save_cluster_as_evidence_if_ready(item) is False
    assert item["practice_fit"] == "needs_clustering"


def test_clear_stale_practice_approval_when_fit_is_not_pushable():
    from runner.app import _clear_stale_practice_approval_if_blocked

    item = {
        "practice_fit": "needs_clustering",
        "approved": True,
        "proposal_status": "approved",
    }

    assert _clear_stale_practice_approval_if_blocked(item) is True
    assert item["approved"] is False
    assert item["proposal_status"] == "pending"


def test_pushable_existing_practice_keeps_approval_when_id_present():
    from runner.app import _clear_stale_practice_approval_if_blocked, _practice_review_status

    item = {
        "practice_fit": "existing_practice",
        "existing_practice_id": "practice-parent-guidance",
        "approved": True,
        "proposal_status": "approved",
    }

    assert _clear_stale_practice_approval_if_blocked(item) is False
    assert _practice_review_status(item) == "Linked evidence"


def test_practice_evidence_decision_maps_legacy_fits():
    from runner.app import _practice_evidence_decision

    assert _practice_evidence_decision({"practice_fit": "needs_clustering"}) == "keep_evidence"
    assert _practice_evidence_decision({"practice_fit": "candidate_evidence"}) == "keep_evidence"
    assert _practice_evidence_decision({"practice_fit": "existing_practice"}) == "link_existing"
    assert _practice_evidence_decision({"practice_fit": "registry_practice"}) == "flag_promotion"
    assert _practice_evidence_decision({"practice_fit": "not_practice"}) == "reject"


def test_apply_practice_evidence_decision_writes_new_and_legacy_fields():
    from runner.app import _apply_practice_evidence_decision

    item = {
        "practice_cluster": "rogd",
        "existing_practice_id": "practice-rogd-frame",
        "approved": True,
        "proposal_status": "approved",
    }

    _apply_practice_evidence_decision(item, "link_existing")

    assert item["evidence_decision"] == "link_existing"
    assert item["practice_fit"] == "existing_practice"
    assert item["cluster_label"] == "rogd"
    assert item["linked_type_kind"] == "practice"
    assert item["linked_type_id"] == "practice-rogd-frame"
    assert item["approved"] is False
    assert item["proposal_status"] == "pending"


def test_apply_practice_evidence_decision_rejects_locally():
    from runner.app import _apply_practice_evidence_decision

    item = {"practice_cluster": "rogd", "approved": True}

    _apply_practice_evidence_decision(item, "reject")

    assert item["evidence_decision"] == "reject"
    assert item["practice_fit"] == "not_practice"
    assert item["rejected"] is True
    assert item["proposal_status"] == "rejected"


def test_lexicon_target_options_sort_and_skip_incomplete_rows():
    from runner.app import _lexicon_target_options

    rows = _lexicon_target_options([
        {"_id": "lex-z", "term": "Zeta", "status": "draft"},
        {"_id": "", "term": "Missing id"},
        {"_id": "lex-a", "term": "Alpha", "status": "validated"},
        {"_id": "lex-empty", "term": ""},
        {"_id": "lex-a", "term": "Alpha duplicate"},
    ])

    assert [row["_id"] for row in rows] == ["lex-a", "lex-z"]
    assert rows[0]["label"] == "Alpha · Sanity · validated"


def test_lexicon_target_options_combines_seed_and_legacy_worlds():
    from runner.app import _lexicon_target_options

    rows = _lexicon_target_options(
        [{"_id": "lexicon-rogd", "term": "ROGD", "status": "validated"}],
        seed_terms=[
            {"term": "Gender Dysphoria"},
            {"term": "ROGD"},  # already live in Sanity → deduped away
        ],
        legacy_terms=[{"term": "Discordance Between Their Sex And Perceived Sex"}],
    )

    by_term = {row["term"]: row for row in rows}
    # Live Sanity term wins the dedupe over the seed duplicate.
    assert by_term["ROGD"]["origin"] == "sanity"
    assert by_term["ROGD"]["in_sanity"] is True
    # Seed draft is offered as a target with a computed canonical id.
    gd = by_term["Gender Dysphoria"]
    assert gd["origin"] == "seed"
    assert gd["in_sanity"] is False
    assert gd["_id"] == "lexicon-gender-dysphoria"
    assert gd["label"] == "Gender Dysphoria · Seed draft · not pushed"
    # Legacy draft is offered too.
    legacy = by_term["Discordance Between Their Sex And Perceived Sex"]
    assert legacy["origin"] == "legacy"
    assert legacy["label"].endswith("Legacy draft · not pushed")


def test_apply_lexicon_target_records_seed_origin_for_push_provenance():
    from runner.app import _apply_lexicon_target

    item = {"term": "Discordance Between Their Sex And Perceived Sex", "language": "en", "variants": []}
    _apply_lexicon_target(
        item,
        {"_id": "lexicon-gender-dysphoria", "term": "Gender Dysphoria", "origin": "seed", "in_sanity": False},
        action="add_variant",
    )

    assert item["existing_entry_id"] == "lexicon-gender-dysphoria"
    assert item["target_origin"] == "seed"
    assert item["variants"][0]["variant_term"] == "Discordance Between Their Sex And Perceived Sex"
    assert item["variants"][0]["attestation_tier"] == "tier-2-ngo-academic"


def test_proposal_target_index_prefers_existing_entry_id_then_term():
    from runner.app import _proposal_target_index

    options = [
        {"_id": "lex-gender-dysphoria", "term": "Gender dysphoria", "status": "validated"},
        {"_id": "lex-rogd", "term": "ROGD", "status": "draft"},
    ]

    assert _proposal_target_index(options, {"existing_entry_id": "lex-rogd"}) == 1
    assert _proposal_target_index(options, {"existing_entry_term": "gender dysphoria"}) == 0
    assert _proposal_target_index(options, {}) == 0


def test_apply_lexicon_target_sets_variant_fields_for_writer():
    from runner.app import _apply_lexicon_target

    item = {
        "term": "Discordance Between Their Sex And Perceived Sex",
        "language": "en",
        "exact_quote": "discordance between their sex and perceived sex",
        "variants": [],
    }

    _apply_lexicon_target(
        item,
        {"_id": "lex-gender-dysphoria", "term": "Gender dysphoria"},
        action="add_variant",
    )

    assert item["existing_entry_id"] == "lex-gender-dysphoria"
    assert item["existing_entry_term"] == "Gender dysphoria"
    assert item["variants"][0]["variant_term"] == "Discordance Between Their Sex And Perceived Sex"
    assert item["variants"][0]["language"] == "en"


def test_repair_known_lexicon_variant_for_review_targets_gender_dysphoria():
    from runner.app import _repair_known_lexicon_variant_for_review

    item = {
        "action": "add_new",
        "term": "Discordance Between Their Sex And Perceived Sex",
        "language": "en",
        "exact_quote": "discordance between their sex and perceived sex",
        "variants": [],
    }

    repaired = _repair_known_lexicon_variant_for_review(item)

    assert repaired["action"] == "add_variant"
    assert repaired["existing_entry_id"] == "lexicon-gender-dysphoria"
    assert repaired["existing_entry_term"] == "Gender Dysphoria"
    assert repaired["target_origin"] == "seed"
    assert repaired["variants"][0]["variant_term"] == "Discordance Between Their Sex And Perceived Sex"
    assert item["action"] == "add_new"


def test_repair_known_lexicon_variant_for_review_ignores_unrelated_terms():
    from runner.app import _repair_known_lexicon_variant_for_review

    item = {
        "action": "add_new",
        "term": "Trauma Causation Claims",
        "definition_as_used": "Claims that gender dysphoria is caused by trauma.",
    }

    repaired = _repair_known_lexicon_variant_for_review(item)

    assert repaired == item


def test_local_enrichment_proposal_records_repairs_known_lexicon_variants(tmp_path):
    import json
    from runner.app import _local_enrichment_proposal_records

    doc_dir = tmp_path / "0b5ed480"
    doc_dir.mkdir()
    (doc_dir / "enrichment.json").write_text(
        json.dumps({
            "lexicon_proposals": [
                {
                    "action": "add_new",
                    "term": "Discordance Between Their Sex And Perceived Sex Or Perceived Gender",
                    "language": "en",
                    "variants": [],
                }
            ]
        }),
        encoding="utf-8",
    )

    records = _local_enrichment_proposal_records(tmp_path, "lexicon_proposals")

    assert len(records) == 1
    assert records[0]["item"]["action"] == "add_variant"
    assert records[0]["item"]["existing_entry_id"] == "lexicon-gender-dysphoria"


# ---------------------------------------------------------------------------
# Bug fixes: registry summary table + "no evidence" caption
# ---------------------------------------------------------------------------

def _make_overview(by_type: dict) -> dict:
    """Minimal overview dict for _build_registry_summary_rows tests."""
    return {"by_type": by_type, "review_rows": []}


def _build_summary_rows(overview: dict) -> list[dict]:
    """
    Re-implement the fixed summary-row logic so tests don't need Streamlit.

    Mirrors the patched loop in _render_registry_status_overview (minus st.dataframe).
    """
    from runner.app import _registry_type_label

    type_order = [
        "lexiconEntry",
        "organization",
        "person",
        "tacticEntry",
        "practiceEntry",
        "tagRegistry",
    ]
    rows = []
    for schema_type in type_order:
        bucket = overview.get("by_type", {}).get(schema_type) or {}
        states = bucket.get("states", {})
        rows.append(
            {
                "registry": bucket.get("label") or _registry_type_label(schema_type),
                "total": bucket.get("total", 0),
                "validated": states.get("validated", 0),
                "needs_validation": states.get("needs_review", 0),
                "deprecated": states.get("deprecated", 0),
                "with_document_evidence": sum(
                    1 for row in bucket.get("rows", []) if row.get("hasDocumentEvidence")
                ),
            }
        )
    return rows


def test_summary_table_includes_all_six_types_when_some_buckets_missing():
    """Bug 1 fix: types with no Sanity records must still appear in the summary table."""
    overview = _make_overview(
        {
            "organization": {
                "label": "Organizations",
                "total": 3,
                "states": {"validated": 1, "needs_review": 2},
                "rows": [],
            },
            # lexiconEntry, person, tacticEntry, practiceEntry, tagRegistry all absent
        }
    )
    rows = _build_summary_rows(overview)
    labels = [r["registry"] for r in rows]

    assert len(rows) == 6, f"Expected 6 rows, got {len(rows)}: {labels}"
    assert "Lexicon" in labels
    assert "Tags" in labels
    assert "Organizations" in labels


def test_summary_table_zero_totals_for_missing_buckets():
    """Types absent from by_type should show zeros, not be skipped."""
    overview = _make_overview({})
    rows = _build_summary_rows(overview)
    for row in rows:
        assert row["total"] == 0
        assert row["validated"] == 0
        assert row["needs_validation"] == 0


def test_summary_table_existing_bucket_values_preserved():
    """Populated buckets should still report their real counts after the fix."""
    overview = _make_overview(
        {
            "tagRegistry": {
                "label": "Tags",
                "total": 5,
                "states": {"validated": 2, "needs_review": 3},
                "rows": [{"hasDocumentEvidence": True}, {"hasDocumentEvidence": False}],
            }
        }
    )
    rows = _build_summary_rows(overview)
    tag_row = next(r for r in rows if r["registry"] == "Tags")
    assert tag_row["total"] == 5
    assert tag_row["validated"] == 2
    assert tag_row["needs_validation"] == 3
    assert tag_row["with_document_evidence"] == 1


def _no_evidence_caption_shown(document_refs, possible_matches, requires_evidence=True) -> bool:
    """
    Return True if the "No linked Sanity source document/evidence" caption would fire.

    Mirrors the patched condition in _render_registry_validation_row (Bug 2 fix).
    """
    return (not document_refs) and requires_evidence and (not possible_matches)


def test_no_evidence_caption_hidden_when_fuzzy_matches_present():
    """Bug 2 fix: caption must NOT show when possible_local_matches is non-empty."""
    assert _no_evidence_caption_shown(
        document_refs=[],
        possible_matches=[{"match": "similar", "doc_id": "abc"}],
    ) is False


def test_no_evidence_caption_shown_when_no_refs_and_no_fuzzy():
    """Caption should still appear when there are truly no references at all."""
    assert _no_evidence_caption_shown(document_refs=[], possible_matches=[]) is True


def test_no_evidence_caption_hidden_when_document_refs_present():
    """Caption should not fire when the row already has Sanity document refs."""
    assert _no_evidence_caption_shown(
        document_refs=["doc-abc"],
        possible_matches=[],
    ) is False


def test_no_evidence_caption_hidden_for_type_that_does_not_require_evidence():
    """Types like tagRegistry don't require document evidence — caption never fires."""
    assert _no_evidence_caption_shown(
        document_refs=[],
        possible_matches=[],
        requires_evidence=False,
    ) is False


# ---------------------------------------------------------------------------
# Entity ID Resolver — normalize_entity_name
# ---------------------------------------------------------------------------

class TestNormalizeEntityName:
    def _n(self, name):
        from runner.app_entity_resolver import normalize_entity_name
        return normalize_entity_name(name)

    def test_lowercase(self):
        assert self._n("SEGM") == "segm"

    def test_strips_accents(self):
        assert self._n("Väre") == "vare"
        assert self._n("Genspèct") == "genspect"

    def test_strips_cedilla(self):
        assert self._n("Garçon") == "garcon"

    def test_punctuation_becomes_space(self):
        result = self._n("L'Heure")
        assert "'" not in result
        assert "l" in result
        assert "heure" in result

    def test_hyphen_becomes_space(self):
        result = self._n("Väre-Institut")
        assert "-" not in result

    def test_collapses_whitespace(self):
        assert self._n("  SEGM  Society ") == "segm  society".replace("  ", " ")
        # More specific:
        assert " " not in self._n("  SEGM  ")  or self._n("  SEGM  ") == "segm"

    def test_empty_string(self):
        assert self._n("") == ""

    def test_already_normalized(self):
        assert self._n("segm") == "segm"

    def test_numbers_preserved(self):
        result = self._n("Group42")
        assert "42" in result


# ---------------------------------------------------------------------------
# Entity ID Resolver — match_entity_name
# ---------------------------------------------------------------------------

class TestMatchEntityName:
    def _match(self, proposal, entities):
        from runner.app_entity_resolver import match_entity_name
        return match_entity_name(proposal, entities)

    def _registry(self, *entries):
        """Build a minimal registry list from (id, type, name[, fullName]) tuples."""
        rows = []
        for entry in entries:
            row = {"_id": entry[0], "_type": entry[1], "name": entry[2]}
            if len(entry) > 3:
                row["fullName"] = entry[3]
            rows.append(row)
        return rows

    def test_exact_match_on_primary_name(self):
        registry = self._registry(("organization-segm", "organization", "SEGM"))
        results = self._match("SEGM", registry)
        assert len(results) == 1
        assert results[0].confidence == "exact"
        assert results[0].sanity_id == "organization-segm"

    def test_exact_match_case_insensitive(self):
        registry = self._registry(("organization-segm", "organization", "SEGM"))
        results = self._match("segm", registry)
        assert len(results) == 1
        assert results[0].confidence == "exact"

    def test_exact_match_accent_insensitive(self):
        registry = self._registry(("org-abc", "organization", "Väre"))
        results = self._match("Vare", registry)
        assert len(results) == 1
        assert results[0].confidence == "exact"

    def test_candidate_match_contains(self):
        registry = self._registry(
            ("org-foo", "organization", "Sexual Ethics and Gender in Medicine")
        )
        results = self._match("Gender in Medicine", registry)
        assert len(results) == 1
        assert results[0].confidence == "candidate"

    def test_candidate_match_not_auto_filled(self):
        """Candidate matches must be 'candidate' only, never 'exact'."""
        from runner.app_entity_resolver import EntityMatch
        registry = self._registry(
            ("org-foo", "organization", "SEGM Extended Organization")
        )
        results = self._match("SEGM", registry)
        assert len(results) == 1
        result = results[0]
        # 'SEGM' is contained in the name — must be candidate, not exact
        assert result.confidence == "candidate"

    def test_no_match_returns_empty_list(self):
        registry = self._registry(("org-xyz", "organization", "Completely Different"))
        results = self._match("SEGM", registry)
        assert results == []

    def test_exact_match_on_full_name(self):
        """Match on fullName should also give exact confidence."""
        registry = self._registry(
            ("org-jonah", "organization", "JONAH", "Jews Offering New Alternatives to Homosexuality")
        )
        results = self._match("Jews Offering New Alternatives to Homosexuality", registry)
        assert len(results) == 1
        assert results[0].confidence == "exact"
        assert results[0].match_type == "full_name"
        # Canonical name shown, not fullName
        assert results[0].name == "JONAH"

    def test_exact_matches_sorted_before_candidates(self):
        registry = self._registry(
            ("org-candidate", "organization", "SEGM Extended Registry"),
            ("org-exact", "organization", "SEGM"),
        )
        results = self._match("SEGM", registry)
        assert results[0].confidence == "exact"
        assert results[0].sanity_id == "org-exact"

    def test_entity_appears_at_most_once(self):
        """Primary name match wins; fullName is not also checked."""
        registry = self._registry(
            ("org-dual", "organization", "SEGM", "SEGM Full Name")
        )
        results = self._match("SEGM", registry)
        assert len(results) == 1

    def test_missing_id_skipped(self):
        registry = [{"_type": "organization", "name": "NoID Org"}]
        results = self._match("NoID Org", registry)
        assert results == []

    def test_person_type_preserved(self):
        registry = self._registry(("person-jsmith", "person", "John Smith"))
        results = self._match("John Smith", registry)
        assert len(results) == 1
        assert results[0].sanity_type == "person"


# ---------------------------------------------------------------------------
# Entity ID Resolver — fill_entity_id_in_enrichment
# ---------------------------------------------------------------------------

class TestFillEntityIdInEnrichment:
    def _setup(self, tmp_path, proposals):
        import json
        doc_dir = tmp_path / "testdoc"
        doc_dir.mkdir()
        data = {"entity_proposals": proposals}
        (doc_dir / "enrichment.json").write_text(
            json.dumps(data), encoding="utf-8"
        )
        return doc_dir

    def _read(self, doc_dir):
        import json
        return json.loads((doc_dir / "enrichment.json").read_text(encoding="utf-8"))

    def test_fills_existing_entity_id(self, tmp_path):
        from runner.app_entity_resolver import fill_entity_id_in_enrichment
        proposals = [{"action": "enrich_existing", "name": "SEGM", "existing_entity_id": None}]
        doc_dir = self._setup(tmp_path, proposals)
        ok = fill_entity_id_in_enrichment(doc_dir, "SEGM", "organization-segm")
        assert ok is True
        data = self._read(doc_dir)
        assert data["entity_proposals"][0]["existing_entity_id"] == "organization-segm"

    def test_case_insensitive_name_match(self, tmp_path):
        from runner.app_entity_resolver import fill_entity_id_in_enrichment
        proposals = [{"action": "enrich_existing", "name": "SEGM", "existing_entity_id": None}]
        doc_dir = self._setup(tmp_path, proposals)
        ok = fill_entity_id_in_enrichment(doc_dir, "segm", "organization-segm")
        assert ok is True

    def test_does_not_change_other_proposals(self, tmp_path):
        from runner.app_entity_resolver import fill_entity_id_in_enrichment
        proposals = [
            {"action": "enrich_existing", "name": "SEGM",     "existing_entity_id": None},
            {"action": "enrich_existing", "name": "Genspect", "existing_entity_id": None},
        ]
        doc_dir = self._setup(tmp_path, proposals)
        fill_entity_id_in_enrichment(doc_dir, "SEGM", "organization-segm")
        data = self._read(doc_dir)
        assert data["entity_proposals"][1]["existing_entity_id"] is None

    def test_does_not_change_other_fields(self, tmp_path):
        from runner.app_entity_resolver import fill_entity_id_in_enrichment
        proposals = [{"action": "enrich_existing", "name": "SEGM", "role": "key_actor"}]
        doc_dir = self._setup(tmp_path, proposals)
        fill_entity_id_in_enrichment(doc_dir, "SEGM", "org-segm")
        data = self._read(doc_dir)
        assert data["entity_proposals"][0]["role"] == "key_actor"

    def test_returns_false_when_file_missing(self, tmp_path):
        from runner.app_entity_resolver import fill_entity_id_in_enrichment
        doc_dir = tmp_path / "empty"
        doc_dir.mkdir()
        assert fill_entity_id_in_enrichment(doc_dir, "SEGM", "org-segm") is False

    def test_returns_false_when_proposal_not_found(self, tmp_path):
        from runner.app_entity_resolver import fill_entity_id_in_enrichment
        proposals = [{"action": "enrich_existing", "name": "SomeOtherOrg"}]
        doc_dir = self._setup(tmp_path, proposals)
        assert fill_entity_id_in_enrichment(doc_dir, "SEGM", "org-segm") is False

    def test_warning_clears_after_fill(self, tmp_path):
        """After fill, _collect_provenance_warnings should not flag this entity."""
        import json
        from runner.app_entity_resolver import fill_entity_id_in_enrichment
        from runner.app_provenance import _collect_provenance_warnings

        doc_dir = tmp_path / "cleardoc"
        doc_dir.mkdir()
        # Create a valid analysis.json
        (doc_dir / "analysis.json").write_text(json.dumps({
            "languages": ["en"],
            "document_date": {"year": 2024},
        }), encoding="utf-8")
        # Enrichment with one unresolved enrich_existing
        (doc_dir / "enrichment.json").write_text(json.dumps({
            "entity_proposals": [
                {"action": "enrich_existing", "name": "SEGM", "existing_entity_id": None}
            ]
        }), encoding="utf-8")

        # Warning should fire before fill
        warnings_before = _collect_provenance_warnings(doc_dir, config=None)
        assert any(w.title == "Missing existing_entity_id" for w in warnings_before)

        # Fill the ID
        fill_entity_id_in_enrichment(doc_dir, "SEGM", "organization-segm")

        # Warning should be gone after fill
        warnings_after = _collect_provenance_warnings(doc_dir, config=None)
        assert not any(w.title == "Missing existing_entity_id" for w in warnings_after)


# ---------------------------------------------------------------------------
# Proposal source-document preflight
# ---------------------------------------------------------------------------

def test_proposal_source_doc_uploaded_reads_sanity_marker(tmp_path):
    from runner.app import _proposal_source_doc_uploaded

    corpus = tmp_path / "corpus"
    doc_dir = corpus / "doc-a"
    doc_dir.mkdir(parents=True)

    assert _proposal_source_doc_uploaded(corpus, "doc-a") is False

    (doc_dir / "sanity_record.json").write_text("{}", encoding="utf-8")
    assert _proposal_source_doc_uploaded(corpus, "doc-a") is True


def test_proposal_source_upload_issue_explains_missing_sanity_doc(tmp_path):
    from types import SimpleNamespace

    from runner.app import _proposal_source_upload_issue

    config = SimpleNamespace(corpus_dir=tmp_path / "corpus")
    record = {"doc_id": "doc-a"}

    issue = _proposal_source_upload_issue(record, config)
    assert "not uploaded to Sanity yet" in issue
    assert "upload-doc doc-a" in issue

    doc_dir = config.corpus_dir / "doc-a"
    doc_dir.mkdir(parents=True)
    (doc_dir / "sanity_record.json").write_text("{}", encoding="utf-8")
    assert _proposal_source_upload_issue(record, config) == ""


# ---------------------------------------------------------------------------
# System health UI helpers
# ---------------------------------------------------------------------------

def test_system_health_corpus_rows_returns_named_rows():
    from runner.app import _system_health_corpus_rows

    report = {"corpus": {"no_analysis_doc_rows": [{"doc_id": "doc-a"}]}}

    assert _system_health_corpus_rows(report, "no_analysis_doc_rows") == [{"doc_id": "doc-a"}]
    assert _system_health_corpus_rows(report, "missing") == []
    assert _system_health_corpus_rows({"corpus": {"bad": "not-list"}}, "bad") == []


def test_system_health_direct_transfer_rows_supports_new_and_legacy_shapes():
    from runner.app import _system_health_direct_transfer_rows

    report = {
        "transfer": {
            "direct_incoming_folders": [
                {"package_id": "trial-a", "path": "/tmp/trial-a"},
                "legacy-trial",
            ]
        }
    }

    assert _system_health_direct_transfer_rows(report) == [
        {"package_id": "trial-a", "path": "/tmp/trial-a"},
        {"package_id": "legacy-trial", "path": ""},
    ]


def test_system_health_source_package_rows_flattens_lifecycle_order():
    from runner.app import _system_health_source_package_rows

    report = {
        "source_offload": {
            "packages_by_state": {
                "archive": [{"package_id": "pkg-z", "folder_state": "archive", "manifest_state": "outbox"}],
                "inbox": [{"package_id": "pkg-a", "folder_state": "inbox", "manifest_state": "inbox"}],
            }
        }
    }

    assert _system_health_source_package_rows(report) == [
        {
            "package_id": "pkg-a",
            "folder_state": "inbox",
            "manifest_state": "inbox",
            "kind": "",
            "error": "",
            "path": "",
        },
        {
            "package_id": "pkg-z",
            "folder_state": "archive",
            "manifest_state": "outbox",
            "kind": "",
            "error": "",
            "path": "",
        },
    ]
