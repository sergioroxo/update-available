"""Stage 3c enrichment research-memory provider tests.

Proves enrichment can SEE curated seed-draft and legacy-draft vocabulary — and
their multilingual variants — before any live Sanity import, labelled by source,
deduped with Sanity winning. Pure Python: no network, no Sanity/Supabase writes.

The researcher's litmus test: "Gender Dysphoria" (a seed draft) and its variants
must be visible to enrichment even when Sanity has nothing.
"""
from __future__ import annotations

import types

from runner.models.document import AnalysisResult
from runner.pipeline import enrich
from runner.pipeline import enrichment_lexicon as elx


# ---------------------------------------------------------------------------
# Pure provider
# ---------------------------------------------------------------------------

def test_canonical_key_matches_sanity_slug():
    from runner.clients.sanity import _slugify

    assert elx.canonical_key("Gender Dysphoria") == f"lexicon-{_slugify('Gender Dysphoria')}"
    assert elx.canonical_key("") == "lexicon-untitled"


def test_seed_memory_surfaces_gender_dysphoria_with_variants():
    terms = elx.seed_lexicon_terms()
    gd = [t for t in terms if t["term"].lower() == "gender dysphoria"]
    assert gd, "Gender Dysphoria must be present as seed-draft memory"
    entry = gd[0]
    assert entry["source"] == "seed"
    assert entry["status"] == "seed_draft"
    variant_terms = {v["variantTerm"] for v in entry["multilingualVariants"]}
    # A few of the §11 multilingual equivalents must ride along as memory.
    assert "disforia di genere" in variant_terms
    assert "Geschlechtsdysphorie" in variant_terms


def test_legacy_memory_surfaces_terms():
    terms = elx.legacy_lexicon_terms()
    assert terms, "Legacy glossary should yield draft memory terms"
    assert all(t["source"] == "legacy" and t["status"] == "legacy_draft" for t in terms)


def test_legacy_gender_dysphoria_rows_collapse_to_canonical_with_variants():
    terms = elx.legacy_lexicon_terms()
    gd = [t for t in terms if t["term"] == "Gender Dysphoria"]

    assert len(gd) == 1
    variants = {v["variantTerm"] for v in gd[0]["multilingualVariants"]}
    assert "GD – disforia di genere" in variants
    assert "GD – Geschlechtsdysphorie" in variants
    assert "DG – dysphorie de genre" in variants
    assert "ГД – гендерна дисфорія" in variants
    assert "Trauma Causation Claims" not in variants
    assert "vrangforestillinger om å være født i feil kropp" not in variants


def test_merge_sanity_wins_dedupe_over_seed():
    sanity = [{
        "term": "Gender Dysphoria",
        "status": "validated",
        "proposedCluster": "Anti-Trans/ROGD",
        "function": "Pseudo-Diagnostic",
        "multilingualVariants": [],
    }]
    merged, counts = elx.merge_enrichment_lexicon(sanity)
    gd = [t for t in merged if t["term"].lower() == "gender dysphoria"]
    assert len(gd) == 1
    assert gd[0]["source"] == "sanity"
    assert gd[0]["status"] == "validated"
    assert counts["sanity"] == 1
    # Lower-priority seed variants still enrich the winning Sanity concept.
    variant_terms = {v["variantTerm"] for v in gd[0]["multilingualVariants"]}
    assert "disforia di genere" in variant_terms


def test_merge_seed_wins_over_legacy():
    seed_fn = lambda: [{
        "term": "Shared Concept",
        "source": "seed",
        "status": "seed_draft",
        "multilingualVariants": [{"variantTerm": "Seed Form", "language": "en"}],
    }]
    legacy_fn = lambda: [{
        "term": "shared concept",
        "source": "legacy",
        "status": "legacy_draft",
        "multilingualVariants": [{"variantTerm": "Legacy Form", "language": "en"}],
    }]
    merged, counts = elx.merge_enrichment_lexicon(
        [], seed_terms_fn=seed_fn, legacy_terms_fn=legacy_fn
    )
    shared = [t for t in merged if t["term"].lower() == "shared concept"]
    assert len(shared) == 1
    assert shared[0]["source"] == "seed"
    assert {v["variantTerm"] for v in shared[0]["multilingualVariants"]} == {
        "Seed Form",
        "Legacy Form",
    }
    assert counts["seed"] == 1
    assert counts["legacy"] == 0


def test_merge_counts_and_injected_total():
    sanity = [{"term": "Alpha", "status": "draft"}]
    seed_fn = lambda: [{"term": "Beta"}, {"term": "Alpha"}]      # Alpha deduped vs Sanity
    legacy_fn = lambda: [{"term": "Gamma"}, {"term": "Beta"}]    # Beta deduped vs seed
    merged, counts = elx.merge_enrichment_lexicon(
        sanity, seed_terms_fn=seed_fn, legacy_terms_fn=legacy_fn
    )
    assert counts == {"sanity": 1, "seed": 1, "legacy": 1, "injected": 3}
    assert {t["term"] for t in merged} == {"Alpha", "Beta", "Gamma"}


def test_merge_graceful_when_seed_legacy_raise():
    def boom():
        raise RuntimeError("parse failure")

    sanity = [{"term": "Alpha", "status": "validated"}]
    merged, counts = elx.merge_enrichment_lexicon(
        sanity, seed_terms_fn=boom, legacy_terms_fn=boom
    )
    assert [t["term"] for t in merged] == ["Alpha"]
    assert counts == {"sanity": 1, "seed": 0, "legacy": 0, "injected": 1}


def test_include_flags_disable_layers():
    seed_fn = lambda: [{"term": "Beta"}]
    legacy_fn = lambda: [{"term": "Gamma"}]
    merged, counts = elx.merge_enrichment_lexicon(
        [], include_seed=False, include_legacy=False,
        seed_terms_fn=seed_fn, legacy_terms_fn=legacy_fn,
    )
    assert merged == []
    assert counts["injected"] == 0


# ---------------------------------------------------------------------------
# enrich.py integration
# ---------------------------------------------------------------------------

def test_format_lexicon_line_labels_by_source():
    assert enrich._format_lexicon_prompt_line(
        {"term": "X", "source": "seed", "status": "seed_draft"}
    ).startswith("- [seed draft] X")
    assert enrich._format_lexicon_prompt_line(
        {"term": "Y", "source": "legacy", "status": "legacy_draft"}
    ).startswith("- [legacy draft] Y")
    assert enrich._format_lexicon_prompt_line(
        {"term": "Z", "source": "sanity", "status": "validated"}
    ).startswith("- [Sanity validated] Z")


def _analysis() -> AnalysisResult:
    return AnalysisResult.model_validate({
        "type": "Anti-SOGICE",
        "format": "Blog-Post",
        "evidence": ["A clear statement."],
        "scope": "Core",
        "narrative_register": "Legal-Policy",
        "summary": "Short summary.",
    })


def _config():
    return types.SimpleNamespace(
        sanity_project_id="proj",
        sanity_dataset="production",
        sanity_read_token="",
        sanity_write_token="tok",
    )


def test_build_system_prompt_injects_seed_memory_even_when_sanity_fails(monkeypatch):
    """Sanity failure must NOT drop seed/legacy memory — the whole point."""
    def _sanity_down(_config):
        raise RuntimeError("Sanity unreachable")

    monkeypatch.setattr(enrich, "_fetch_lexicon_entries", _sanity_down)
    monkeypatch.setattr(enrich, "_fetch_entity_registry", lambda c: [])

    prompt = enrich._build_system_prompt(_config(), _analysis(), retrieval_grounded=False)

    assert "[seed draft] Gender Dysphoria" in prompt
    assert "CURRENT LEXICON MEMORY" in prompt


def test_build_system_prompt_populates_audit_lexicon_counts(monkeypatch):
    monkeypatch.setattr(enrich, "_fetch_lexicon_entries", lambda c: [])
    monkeypatch.setattr(enrich, "_fetch_entity_registry", lambda c: [])
    monkeypatch.setattr(
        enrich,
        "merge_enrichment_lexicon",
        lambda terms: (
            [{"term": "T", "source": "seed", "status": "seed_draft"}],
            {"sanity": 2, "seed": 3, "legacy": 1, "injected": 6},
        ),
    )

    audit: dict = {}
    enrich._build_system_prompt(_config(), _analysis(), retrieval_grounded=False, _audit=audit)

    assert audit["lexicon_terms_sanity"] == 2
    assert audit["lexicon_terms_seed"] == 3
    assert audit["lexicon_terms_legacy"] == 1
    assert audit["lexicon_terms_injected"] == 6


def test_lexicon_counts_persist_in_enrichment_audit_json(tmp_path):
    """The new memory-source counts survive into enrichment_audit.json (schema v4)."""
    import json

    from runner.models.enrichment import EnrichmentResult
    from runner.pipeline.audit import write_enrichment_audit

    audit = {
        "llm_flag": "litelm",
        "lexicon_terms_sanity": 5,
        "lexicon_terms_seed": 140,
        "lexicon_terms_legacy": 180,
        "lexicon_terms_injected": 300,
    }
    write_enrichment_audit(tmp_path, audit, EnrichmentResult(doc_id="doc-1"))

    payload = json.loads((tmp_path / "enrichment_audit.json").read_text())
    assert payload["schema_version"] == "4"
    assert payload["lexicon_terms_sanity"] == 5
    assert payload["lexicon_terms_seed"] == 140
    assert payload["lexicon_terms_legacy"] == 180
    assert payload["lexicon_terms_injected"] == 300
