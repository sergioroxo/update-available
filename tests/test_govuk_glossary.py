from __future__ import annotations

import json
import inspect
from pathlib import Path
from types import SimpleNamespace

import pytest

from runner.app import _parse_seed_lexicon, _render_seed_entry_editor, _render_seed_lexicon_import
from runner.pipeline.enrichment_lexicon import canonical_key
from runner.pipeline.govuk_glossary import (
    load_manifest,
    manifest_fingerprint,
    sanity_authority_rows,
    seed_memory_terms,
    select_definition_memory,
    validate_manifest,
)
from runner.pipeline.seed import parse_lexicon_md


OFFICIAL_TERMS = {
    "Asexual", "Bisexual", "Cisgender", "Conversion therapy", "Ex-gay",
    "Ex-gay ministry", "Ex-gay movement", "Gay", "Gender dysphoria",
    "Gender expression", "Gender identity", "Gender identity change efforts",
    "Gender incongruence", "Gender reassignment", "Heterosexual", "Homosexual",
    "Intersex", "Lesbian", "LGBT", "Minority gender identity",
    "Minority sexual orientation", "Non-binary", "Pansexual", "Queer",
    "Reparative therapy", "Sex", "Sexual fluidity", "Sexual identity",
    "Sexual orientation", "Sexual orientation change efforts", "Straight",
    "Transgender or Trans", "Transsexualism", "Unwanted same-sex attraction",
    "Variations in sex characteristics",
}


def test_manifest_contains_exact_official_term_set_and_provenance():
    payload = load_manifest()
    assert {row["source_term"] for row in payload["terms"]} == OFFICIAL_TERMS
    assert payload["source"]["publication_date"] == "2021-10-29"
    assert payload["source"]["licence"] == "Open Government Licence v3.0"
    assert len({row["source_id"] for row in payload["terms"]}) == 35
    assert not ({"Aromantic", "Detransition", "Gender Variance", "LGBTQ+"} & OFFICIAL_TERMS)


def test_manifest_fingerprint_is_deterministic_and_sensitive():
    payload = load_manifest()
    same = json.loads(json.dumps(payload, sort_keys=False))
    assert manifest_fingerprint(payload) == manifest_fingerprint(same)
    same["terms"][0]["source_definition"] += " changed"
    assert manifest_fingerprint(payload) != manifest_fingerprint(same)


def test_invalid_manifest_fails_closed():
    payload = load_manifest()
    payload["terms"].pop()
    with pytest.raises(ValueError, match="exactly 35"):
        validate_manifest(payload)

    payload = load_manifest()
    payload["terms"][0]["source_term"] = "Aromantic"
    with pytest.raises(ValueError, match="exact official term set"):
        validate_manifest(payload)

    payload = load_manifest()
    payload["source"]["url"] = "https://attacker.invalid/glossary"
    with pytest.raises(ValueError, match="authority manifest contract"):
        validate_manifest(payload)


def test_superseded_markdown_section_is_excluded_from_both_parsers():
    pipeline_rows = parse_lexicon_md()
    app_rows = _parse_seed_lexicon(Path("00_infrastructure/SOGICE_Lexicon_v2.1.md"))
    false_source_terms = {"Aromantic", "Detransition", "Gender Variance", "LGBTQ+"}
    assert not (false_source_terms & {row["term"] for row in pipeline_rows})
    assert not (false_source_terms & {row["term"] for row in app_rows})
    pipeline_ids = [canonical_key(row["term"]) for row in pipeline_rows]
    app_ids = [canonical_key(row["term"]) for row in app_rows]
    assert len(pipeline_ids) == len(set(pipeline_ids))
    assert len(app_ids) == len(set(app_ids))


def test_seed_import_surfaces_are_draft_only():
    detail_source = inspect.getsource(_render_seed_entry_editor)
    import_source = inspect.getsource(_render_seed_lexicon_import)
    assert '["draft", "validated"]' not in detail_source
    assert 'options=["draft", "validated"]' not in import_source
    assert "Canonical validation is a separate researcher action" in detail_source


def test_source_memory_is_draft_untrusted_and_dedupes_variants():
    rows = seed_memory_terms()
    # Heterosexual/Straight and Intersex/Variations collapse within this source;
    # LGBT maps to the archive's LGBTQ+ and Transgender-or-Trans maps to the
    # archive's Transgender concept, neither of which has another source heading.
    assert len(rows) == 33
    assert all(row["status"] == "seed_draft" for row in rows)
    assert all(row["includeInAnalysisLexicon"] is False for row in rows)
    by_term = {row["term"]: row for row in rows}
    assert any(v["variantTerm"] == "Straight" for v in by_term["Heterosexual"]["multilingualVariants"])
    assert any(v["variantTerm"] == "LGBT" for v in by_term["LGBTQ+"]["multilingualVariants"])


def test_definition_memory_is_relevant_bounded_and_source_scoped():
    memory = select_definition_memory(
        "The report compares straight and heterosexual identities with sexual fluidity."
    )
    receipt = memory["receipt"]
    assert receipt["selected_canonical_terms"] == ["Heterosexual", "Sexual Fluidity"]
    assert receipt["injected_count"] == 2
    assert receipt["character_count"] <= 4000
    assert "in the GOV.UK 2021 report" in memory["block"]
    assert memory["block"].startswith("<govuk_glossary_reference_data>")
    assert select_definition_memory("Unrelated archival material.")["block"] == ""


def test_definition_matching_uses_term_boundaries():
    memory = select_definition_memory("Sexual histories are discussed without the standalone category.")
    assert "Sex" not in memory["receipt"]["selected_canonical_terms"]


def test_sanity_authority_rows_are_draft_and_keep_all_source_attestations():
    rows = sanity_authority_rows()
    assert len(rows) == 33
    assert sum(len(row["sourceAttestations"]) for row in rows) == 35
    assert all(row["status"] == "draft" for row in rows)
    assert all(row["includeInAnalysisLexicon"] is False for row in rows)
    assert all(row["sourceAttestations"] for row in rows)


def test_authority_sync_is_non_destructive_and_idempotent(monkeypatch):
    from runner.clients import sanity

    row = sanity_authority_rows()[0]
    source_id = row["sourceAttestations"][0]["sourceId"]

    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {"result": [{
                "_id": row["sanity_id"],
                "_rev": "rev-1",
                "term": row["term"],
                "status": "validated",
                "draftDefinition": "Researcher-controlled existing definition",
                "sourceAttestations": [dict(row["sourceAttestations"][0])],
            }]}

    mutations = []
    monkeypatch.setattr(sanity.httpx, "get", lambda *a, **k: Response())
    monkeypatch.setattr(sanity, "_mutate", lambda batch, config: mutations.extend(batch) or {"results": []})
    config = SimpleNamespace(
        sanity_project_id="project", sanity_dataset="production", sanity_write_token="token",
    )

    result = sanity.sync_authority_lexicon_rows([row], config)

    assert result["unchanged"] == 1
    assert result["canonical_validation_changed"] is False
    assert result["analysis_trust_changed"] is False
    encoded = json.dumps(mutations)
    assert "createOrReplace" not in encoded
    assert "Researcher-controlled existing definition" not in encoded
    assert source_id not in json.dumps([
        mutation.get("patch", {}).get("insert") for mutation in mutations
    ])


def test_add_new_lexicon_writer_never_uses_create_or_replace(monkeypatch):
    from runner.clients import sanity

    captured = []
    monkeypatch.setattr(
        sanity,
        "_mutate",
        lambda mutations, config: captured.extend(mutations) or {"results": [{"id": "lexicon-term"}]},
    )
    monkeypatch.setattr(sanity, "_fetch_document_by_id", lambda *a, **k: None)
    config = SimpleNamespace()
    sanity.write_lexicon_draft_from_proposal(
        {
            "action": "add_new",
            "term": "Existing authority term",
            "exact_quote": "Evidence in another document.",
            "language": "en",
        },
        "doc-1",
        config,
    )
    assert captured and "createIfNotExists" in captured[0]
    assert all("createOrReplace" not in mutation for mutation in captured)


def test_add_new_collision_attaches_evidence_without_overwriting_canonical(monkeypatch):
    from runner.clients import sanity

    captured = []
    monkeypatch.setattr(
        sanity,
        "_fetch_document_by_id",
        lambda *a, **k: {
            "_id": "lexicon-existing-authority-term",
            "_rev": "rev-live",
            "evidenceDossier": [{"_key": "evidence-other-doc-existing-authority-term"}],
            "multilingualVariants": [],
        },
    )
    monkeypatch.setattr(
        sanity,
        "_mutate",
        lambda mutations, config: captured.extend(mutations)
        or {"results": [{"id": "lexicon-existing-authority-term"}]},
    )

    result = sanity.write_lexicon_draft_from_proposal(
        {
            "action": "add_new",
            "term": "Existing authority term",
            "exact_quote": "Evidence in another document.",
            "definition_as_used": "Document-specific usage, not a canonical replacement.",
            "language": "en",
            "variants": [{"variant_term": "Existing authority wording", "language": "en"}],
        },
        "doc-1",
        SimpleNamespace(),
    )

    assert result == "lexicon-existing-authority-term"
    assert len(captured) == 1
    patch = captured[0]["patch"]
    assert patch["ifRevisionID"] == "rev-live"
    assert patch["insert"]["items"][0]["_key"] == "evidence-doc-1-existing-authority-term"
    encoded = json.dumps(patch)
    assert "draftDefinition" not in encoded
    assert "sourceAttestations" not in encoded
    assert "createOrReplace" not in encoded


def test_add_new_collision_retry_is_idempotent(monkeypatch):
    from runner.clients import sanity

    evidence_key = "evidence-doc-1-existing-authority-term"
    monkeypatch.setattr(
        sanity,
        "_fetch_document_by_id",
        lambda *a, **k: {
            "_id": "lexicon-existing-authority-term",
            "_rev": "rev-live",
            "evidenceDossier": [{"_key": evidence_key}],
            "multilingualVariants": [],
        },
    )
    monkeypatch.setattr(
        sanity, "_mutate", lambda *a, **k: (_ for _ in ()).throw(AssertionError("no retry write")),
    )
    result = sanity.write_lexicon_draft_from_proposal(
        {"action": "add_new", "term": "Existing authority term", "exact_quote": "Evidence."},
        "doc-1",
        SimpleNamespace(),
    )
    assert result == "lexicon-existing-authority-term"


def test_authority_sync_refreshes_changed_source_but_preserves_review_state(monkeypatch):
    from runner.clients import sanity

    row = sanity_authority_rows()[0]
    incoming = row["sourceAttestations"][0]

    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {"result": [{
                "_id": row["sanity_id"],
                "_rev": "rev-2",
                "term": row["term"],
                "status": "validated",
                "draftDefinition": "Researcher definition",
                "sourceAttestations": [{
                    "_key": incoming["_key"],
                    "sourceId": incoming["sourceId"],
                    "sourceDefinitionSummary": "Old summary",
                    "attestationFingerprint": "old-fingerprint",
                    "reviewState": "researcher_confirmed_source",
                }],
            }]}

    mutations = []
    monkeypatch.setattr(sanity.httpx, "get", lambda *a, **k: Response())
    monkeypatch.setattr(
        sanity, "_mutate", lambda batch, config: mutations.extend(batch) or {"results": []},
    )
    config = SimpleNamespace(
        sanity_project_id="project", sanity_dataset="production", sanity_write_token="token",
    )
    result = sanity.sync_authority_lexicon_rows([row], config)

    assert result["updated"] == 1
    patch = mutations[0]["patch"]
    assert patch["ifRevisionID"] == "rev-2"
    assert any(key.endswith(".sourceDefinitionSummary") for key in patch["set"])
    assert not any(key.endswith(".reviewState") for key in patch["set"])
