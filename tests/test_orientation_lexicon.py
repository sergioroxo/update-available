"""Tests for the Stage 3b analysis orientation lexicon.

Covers:
- fetch_analysis_orientation_terms() GROQ filter (validated + flagged-draft only)
- Deterministic ordering in the GROQ query (status desc, term asc)
- Orientation cache is separate from the full active-lexicon cache
- analyze._fetch_active_lexicon_terms() calls fetch_analysis_orientation_terms, not
  fetch_active_lexicon_terms
- enrich._fetch_lexicon_entries() still calls fetch_active_lexicon_terms (unchanged)
- write_lexicon_draft_from_proposal() sets includeInAnalysisLexicon=False on new entries
- clear_lexicon_cache() clears both caches; clear_orientation_cache() clears only the
  orientation cache

No network calls are made — httpx.get and _mutate are monkeypatched throughout.
"""
from __future__ import annotations

from dataclasses import dataclass

import pytest

from runner.pipeline import sanity_reads


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

@dataclass
class _Config:
    sanity_project_id: str = "project"
    sanity_dataset: str = "dataset"
    sanity_read_token: str = ""


class _FakeResponse:
    def __init__(self, result: list):
        self._result = result

    def raise_for_status(self):
        pass

    def json(self):
        return {"result": self._result}


def _fake_get_factory(result: list):
    """Return a fake httpx.get that captures the query string and returns result."""
    captured: list[dict] = []

    def fake_get(url, params, headers, timeout):
        captured.append({"url": url, "params": params, "headers": headers})
        return _FakeResponse(result)

    return fake_get, captured


# ---------------------------------------------------------------------------
# 1. GROQ query contents
# ---------------------------------------------------------------------------

class TestOrientationQueryContents:
    """The GROQ query must select validated + flagged-draft only, not all drafts."""

    def setup_method(self):
        sanity_reads.clear_lexicon_cache()

    def test_query_requires_validated_status(self, monkeypatch):
        fake_get, captured = _fake_get_factory([])
        import httpx
        monkeypatch.setattr(httpx, "get", fake_get)

        sanity_reads.fetch_analysis_orientation_terms(_Config())

        query = captured[0]["params"]["query"]
        assert 'status == "validated"' in query

    def test_query_requires_draft_plus_flag(self, monkeypatch):
        """Draft terms are included only when includeInAnalysisLexicon == true."""
        fake_get, captured = _fake_get_factory([])
        import httpx
        monkeypatch.setattr(httpx, "get", fake_get)

        sanity_reads.fetch_analysis_orientation_terms(_Config())

        query = captured[0]["params"]["query"]
        assert 'status == "draft"' in query
        assert "includeInAnalysisLexicon == true" in query

    def test_query_does_not_use_status_in_list(self, monkeypatch):
        """The orientation query must NOT be the broad 'status in ["draft","validated"]'
        form — that would include all unreviewed drafts."""
        fake_get, captured = _fake_get_factory([])
        import httpx
        monkeypatch.setattr(httpx, "get", fake_get)

        sanity_reads.fetch_analysis_orientation_terms(_Config())

        query = captured[0]["params"]["query"]
        assert 'status in ["draft","validated"]' not in query
        assert 'status in ["validated","draft"]' not in query

    def test_query_excludes_candidate_status(self, monkeypatch):
        """No path through the query selects 'candidate' entries."""
        fake_get, captured = _fake_get_factory([])
        import httpx
        monkeypatch.setattr(httpx, "get", fake_get)

        sanity_reads.fetch_analysis_orientation_terms(_Config())

        query = captured[0]["params"]["query"]
        assert 'status == "candidate"' not in query

    def test_query_excludes_rejected_status(self, monkeypatch):
        fake_get, captured = _fake_get_factory([])
        import httpx
        monkeypatch.setattr(httpx, "get", fake_get)

        sanity_reads.fetch_analysis_orientation_terms(_Config())

        query = captured[0]["params"]["query"]
        assert 'status == "rejected"' not in query

    def test_query_targets_lexicon_entry_type(self, monkeypatch):
        fake_get, captured = _fake_get_factory([])
        import httpx
        monkeypatch.setattr(httpx, "get", fake_get)

        sanity_reads.fetch_analysis_orientation_terms(_Config())

        query = captured[0]["params"]["query"]
        assert '_type == "lexiconEntry"' in query

    def test_projection_includes_expected_fields(self, monkeypatch):
        fake_get, captured = _fake_get_factory([])
        import httpx
        monkeypatch.setattr(httpx, "get", fake_get)

        sanity_reads.fetch_analysis_orientation_terms(_Config())

        query = captured[0]["params"]["query"]
        assert "term" in query
        assert "proposedCluster" in query
        assert "function" in query
        assert "multilingualVariants" in query


# ---------------------------------------------------------------------------
# 2. Deterministic ordering
# ---------------------------------------------------------------------------

class TestOrientationQueryOrdering:
    """Results must be ordered so validated terms come before draft terms, then
    alphabetically within each group — so the 200-term cap is deterministic."""

    def setup_method(self):
        sanity_reads.clear_lexicon_cache()

    def test_query_has_order_operator(self, monkeypatch):
        fake_get, captured = _fake_get_factory([])
        import httpx
        monkeypatch.setattr(httpx, "get", fake_get)

        sanity_reads.fetch_analysis_orientation_terms(_Config())

        query = captured[0]["params"]["query"]
        assert "| order(" in query

    def test_query_orders_status_desc(self, monkeypatch):
        """'status desc' places 'validated' (v) before 'draft' (d)."""
        fake_get, captured = _fake_get_factory([])
        import httpx
        monkeypatch.setattr(httpx, "get", fake_get)

        sanity_reads.fetch_analysis_orientation_terms(_Config())

        query = captured[0]["params"]["query"]
        assert "status desc" in query

    def test_query_orders_term_asc_for_tie_breaking(self, monkeypatch):
        """Alphabetical term ordering within each status group."""
        fake_get, captured = _fake_get_factory([])
        import httpx
        monkeypatch.setattr(httpx, "get", fake_get)

        sanity_reads.fetch_analysis_orientation_terms(_Config())

        query = captured[0]["params"]["query"]
        assert "term asc" in query

    def test_results_returned_in_sanity_order(self, monkeypatch):
        """Whatever order Sanity returns is preserved — we do not re-sort in Python."""
        items = [
            {"term": "validated-term", "proposedCluster": "SSA-Rhetoric", "function": "Slur"},
            {"term": "alpha-draft", "proposedCluster": "Pastoral-Coercion", "function": "Euphemism"},
        ]
        fake_get, _ = _fake_get_factory(items)
        import httpx
        monkeypatch.setattr(httpx, "get", fake_get)

        result = sanity_reads.fetch_analysis_orientation_terms(_Config())

        assert result == items


# ---------------------------------------------------------------------------
# 3. Cache isolation
# ---------------------------------------------------------------------------

class TestCacheIsolation:
    """The orientation cache must be separate from the full active-lexicon cache."""

    def setup_method(self):
        sanity_reads.clear_lexicon_cache()

    def test_orientation_cache_is_different_object_from_lexicon_cache(self):
        assert sanity_reads._ORIENTATION_CACHE is not sanity_reads._LEXICON_CACHE

    def test_orientation_fetch_uses_orientation_cache(self, monkeypatch):
        """A successful orientation fetch populates _ORIENTATION_CACHE, not _LEXICON_CACHE."""
        fake_get, _ = _fake_get_factory([{"term": "test-term"}])
        import httpx
        monkeypatch.setattr(httpx, "get", fake_get)

        sanity_reads.fetch_analysis_orientation_terms(_Config())

        assert len(sanity_reads._ORIENTATION_CACHE) == 1
        assert len(sanity_reads._LEXICON_CACHE) == 0

    def test_active_fetch_uses_lexicon_cache(self, monkeypatch):
        """A successful active-lexicon fetch populates _LEXICON_CACHE, not _ORIENTATION_CACHE."""
        fake_get, _ = _fake_get_factory([{"term": "test-term"}])
        import httpx
        monkeypatch.setattr(httpx, "get", fake_get)

        sanity_reads.fetch_active_lexicon_terms(_Config())

        assert len(sanity_reads._LEXICON_CACHE) == 1
        assert len(sanity_reads._ORIENTATION_CACHE) == 0

    def test_orientation_cache_serves_second_call(self, monkeypatch):
        """Second call returns cached result without a second HTTP request."""
        fake_get, captured = _fake_get_factory([{"term": "cached-term"}])
        import httpx
        monkeypatch.setattr(httpx, "get", fake_get)

        first = sanity_reads.fetch_analysis_orientation_terms(_Config())
        second = sanity_reads.fetch_analysis_orientation_terms(_Config())

        assert first == second == [{"term": "cached-term"}]
        assert len(captured) == 1  # only one HTTP call

    def test_clear_lexicon_cache_clears_both(self, monkeypatch):
        """clear_lexicon_cache() must flush both caches."""
        fake_get, _ = _fake_get_factory([{"term": "t"}])
        import httpx
        monkeypatch.setattr(httpx, "get", fake_get)

        sanity_reads.fetch_active_lexicon_terms(_Config())
        sanity_reads.fetch_analysis_orientation_terms(_Config())

        assert len(sanity_reads._LEXICON_CACHE) == 1
        assert len(sanity_reads._ORIENTATION_CACHE) == 1

        sanity_reads.clear_lexicon_cache()

        assert len(sanity_reads._LEXICON_CACHE) == 0
        assert len(sanity_reads._ORIENTATION_CACHE) == 0

    def test_clear_orientation_cache_clears_only_orientation_cache(self, monkeypatch):
        """clear_orientation_cache() must leave _LEXICON_CACHE intact."""
        fake_get, _ = _fake_get_factory([{"term": "t"}])
        import httpx
        monkeypatch.setattr(httpx, "get", fake_get)

        sanity_reads.fetch_active_lexicon_terms(_Config())
        sanity_reads.fetch_analysis_orientation_terms(_Config())

        sanity_reads.clear_orientation_cache()

        assert len(sanity_reads._LEXICON_CACHE) == 1
        assert len(sanity_reads._ORIENTATION_CACHE) == 0


# ---------------------------------------------------------------------------
# 4. Analysis wiring
# ---------------------------------------------------------------------------

class TestAnalysisWiring:
    """analyze._fetch_active_lexicon_terms must delegate to fetch_analysis_orientation_terms,
    not to fetch_active_lexicon_terms — so analysis gets the curated orientation set."""

    def test_analysis_fetch_calls_orientation_function(self, monkeypatch):
        from runner.pipeline import analyze

        orientation_calls: list = []

        def fake_orientation(config):
            orientation_calls.append(config)
            return [{"term": "test-term"}]

        monkeypatch.setattr(analyze, "fetch_analysis_orientation_terms", fake_orientation)

        result = analyze._fetch_active_lexicon_terms(object())

        assert len(orientation_calls) == 1
        assert result == [{"term": "test-term"}]

    def test_analysis_fetch_does_not_call_active_function(self, monkeypatch):
        """fetch_active_lexicon_terms (the enrichment function) must not be called by analysis."""
        from runner.pipeline import analyze

        active_calls: list = []

        monkeypatch.setattr(
            analyze,
            "fetch_analysis_orientation_terms",
            lambda c: [],
        )
        # If fetch_active_lexicon_terms were somehow still wired in, this would catch it
        monkeypatch.setattr(
            sanity_reads,
            "fetch_active_lexicon_terms",
            lambda c: active_calls.append(c) or [],
        )

        analyze._fetch_active_lexicon_terms(object())

        assert active_calls == [], (
            "analyze._fetch_active_lexicon_terms must not call fetch_active_lexicon_terms"
        )


# ---------------------------------------------------------------------------
# 5. Enrichment wiring (must remain unchanged)
# ---------------------------------------------------------------------------

class TestEnrichmentWiring:
    """enrich._fetch_lexicon_entries must still call fetch_active_lexicon_terms,
    not fetch_analysis_orientation_terms — enrichment needs full draft+validated coverage."""

    def test_enrichment_fetch_calls_active_function(self, monkeypatch):
        from runner.pipeline import enrich

        active_calls: list = []

        def fake_active(config):
            active_calls.append(config)
            return [{"term": "enrichment-term"}]

        monkeypatch.setattr(enrich, "fetch_active_lexicon_terms", fake_active)

        result = enrich._fetch_lexicon_entries(object())

        assert len(active_calls) == 1
        assert result == [{"term": "enrichment-term"}]

    def test_enrichment_fetch_does_not_call_orientation_function(self, monkeypatch):
        """fetch_analysis_orientation_terms must not be called by enrichment."""
        from runner.pipeline import enrich

        orientation_calls: list = []

        # Provide a working active stub so the call succeeds
        monkeypatch.setattr(enrich, "fetch_active_lexicon_terms", lambda c: [])

        # Orientation should never be called from enrich
        monkeypatch.setattr(
            sanity_reads,
            "fetch_analysis_orientation_terms",
            lambda c: orientation_calls.append(c) or [],
        )

        enrich._fetch_lexicon_entries(object())

        assert orientation_calls == [], (
            "enrich._fetch_lexicon_entries must not call fetch_analysis_orientation_terms"
        )


# ---------------------------------------------------------------------------
# 6. New draft entries default to includeInAnalysisLexicon=False
# ---------------------------------------------------------------------------

class TestNewDraftFlag:
    """write_lexicon_draft_from_proposal must write includeInAnalysisLexicon=False
    so newly approved enrichment proposals don't automatically enter the analysis
    orientation lexicon."""

    def _make_proposal(self) -> dict:
        return {
            "term": "pastoral care",
            "action": "add_new",
            "proposed_cluster": "Pastoral-Coercion",
            "function": "Pastoral Rhetoric",
            "definition_as_used": "Religious framing of sexuality change.",
            "accessible_definition": "A church-based approach to changing sexual orientation.",
            "language": "en",
            "source_quote": "...",
            "variants": [],
        }

    def test_new_draft_has_include_flag_false(self, monkeypatch):
        from runner.clients import sanity as sanity_client

        captured_mutations: list[list] = []

        def fake_mutate(mutations, config):
            captured_mutations.append(mutations)
            return {"results": [{"id": "lexicon-pastoral-care"}]}

        monkeypatch.setattr(sanity_client, "_mutate", fake_mutate)
        monkeypatch.setattr(sanity_client, "_fetch_document_by_id", lambda *a, **k: None)

        sanity_client.write_lexicon_draft_from_proposal(
            self._make_proposal(), "doc-abc123", object()
        )

        assert len(captured_mutations) == 1
        mutation = captured_mutations[0][0]
        doc = mutation["createIfNotExists"]
        assert "includeInAnalysisLexicon" in doc, (
            "includeInAnalysisLexicon must be explicitly set on new lexicon entries"
        )
        assert doc["includeInAnalysisLexicon"] is False, (
            "New enrichment-proposed entries must default to False "
            "(excluded from analysis orientation lexicon until researcher curates)"
        )

    def test_new_draft_status_is_still_draft(self, monkeypatch):
        """Sanity check: status remains 'draft' — the flag is additive."""
        from runner.clients import sanity as sanity_client

        captured: list = []
        monkeypatch.setattr(
            sanity_client,
            "_mutate",
            lambda m, c: captured.append(m) or {"results": [{"id": "x"}]},
        )
        monkeypatch.setattr(sanity_client, "_fetch_document_by_id", lambda *a, **k: None)

        sanity_client.write_lexicon_draft_from_proposal(
            self._make_proposal(), "doc-abc123", object()
        )

        doc = captured[0][0]["createIfNotExists"]
        assert doc["status"] == "draft"
        assert doc["includeInAnalysisLexicon"] is False

    def test_flag_is_boolean_false_not_string(self, monkeypatch):
        """Guard against accidentally writing the string 'false' or 0."""
        from runner.clients import sanity as sanity_client

        captured: list = []
        monkeypatch.setattr(
            sanity_client,
            "_mutate",
            lambda m, c: captured.append(m) or {"results": [{"id": "x"}]},
        )
        monkeypatch.setattr(sanity_client, "_fetch_document_by_id", lambda *a, **k: None)

        sanity_client.write_lexicon_draft_from_proposal(
            self._make_proposal(), "doc-abc123", object()
        )

        doc = captured[0][0]["createIfNotExists"]
        flag = doc["includeInAnalysisLexicon"]
        assert flag is False and isinstance(flag, bool), (
            f"Expected Python False (bool), got {flag!r} ({type(flag).__name__})"
        )


# ---------------------------------------------------------------------------
# 7. Audit counts reflect orientation set (regression guard)
# ---------------------------------------------------------------------------

class TestAuditCountsReflectOrientationSet:
    """lexicon_terms_available in the analysis audit records the orientation set size,
    not the full draft+validated count.  Since _fetch_active_lexicon_terms now calls
    fetch_analysis_orientation_terms, the existing monkeypatch pattern in
    test_lexicon_audit_fields.py still works — but we add an explicit check here to
    guard against the counts accidentally reverting to the broader query."""

    def test_audit_available_reflects_orientation_not_full_active(self, monkeypatch):
        from runner.pipeline import analyze
        from runner.pipeline.analyze import _build_system_prompt_with_lexicon

        # The orientation set has 3 terms; the full active set would have more —
        # but since _fetch_active_lexicon_terms is patched to the orientation result,
        # the audit must report 3.
        orientation_terms = [
            {"term": f"orientation-{i}", "proposedCluster": "SSA-Rhetoric", "function": "Slur"}
            for i in range(3)
        ]
        monkeypatch.setattr(analyze, "_fetch_active_lexicon_terms", lambda _: orientation_terms)

        audit: dict = {}
        _build_system_prompt_with_lexicon(object(), _audit=audit)

        assert audit["lexicon_terms_available"] == 3
        assert audit["lexicon_terms_injected"] == 3

    def test_audit_available_capped_at_200_from_orientation_set(self, monkeypatch):
        from runner.pipeline import analyze
        from runner.pipeline.analyze import _build_system_prompt_with_lexicon

        orientation_terms = [
            {"term": f"t-{i}", "proposedCluster": "SSA-Rhetoric", "function": "Slur"}
            for i in range(250)
        ]
        monkeypatch.setattr(analyze, "_fetch_active_lexicon_terms", lambda _: orientation_terms)

        audit: dict = {}
        _build_system_prompt_with_lexicon(object(), _audit=audit)

        assert audit["lexicon_terms_available"] == 250  # pre-cap count from orientation
        assert audit["lexicon_terms_injected"] == 200   # capped
        assert audit["lexicon_injection_cap"] == 200
