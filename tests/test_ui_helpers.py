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
