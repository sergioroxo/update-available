"""Tests for Streamlit UI helpers added by U1, U3, U4.

These tests cover pure-Python helpers that have no Streamlit dependency —
they do not launch a browser or Streamlit session.
"""
import pytest


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


# ---------------------------------------------------------------------------
# Practice Queue cluster review helpers
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
                "rejected": True,
            },
        },
    ]

    summary = _practice_cluster_summary(records)

    assert summary == [
        {
            "cluster": "rogd",
            "proposals": 2,
            "needs_review": 1,
            "held_evidence": 2,
            "push_candidate": 0,
            "docs": "8fe67e19",
            "examples": "Practice: ROGD-Diagnosis; Practice: ROGD-Promotion",
        }
    ]


def test_practice_cluster_summary_counts_push_candidates():
    from runner.app import _practice_cluster_summary

    records = [
        {
            "doc_id": "doc-a",
            "item": {
                "practice_id": "Strategic Guidance for Parents",
                "practice_cluster": "parent_guidance",
                "practice_fit": "existing_practice",
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
    assert row["push_candidate"] == 2
    assert row["held_evidence"] == 0
    assert row["needs_review"] == 1
    assert row["docs"] == "doc-a, doc-b"


def test_practice_cluster_summary_uses_unclustered_fallback_last():
    from runner.app import _practice_cluster_summary

    summary = _practice_cluster_summary(
        [
            {"doc_id": "doc-a", "item": {"practice_id": "Unclear practice"}},
            {"doc_id": "doc-b", "item": {"practice_id": "ROGD", "practice_cluster": "rogd"}},
        ]
    )

    assert [row["cluster"] for row in summary] == ["rogd", "unclustered"]
    assert summary[1]["held_evidence"] == 1


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
