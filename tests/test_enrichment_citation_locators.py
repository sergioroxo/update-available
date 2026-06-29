from __future__ import annotations

import json
import types
from pathlib import Path

from runner.models.enrichment import EnrichmentResult
from runner.pipeline.citation_units import (
    CITATION_UNITS_FILENAME,
    build_citation_units,
    quote_hash,
)
from runner.pipeline import enrich


def _config(tmp_path: Path) -> object:
    return types.SimpleNamespace(corpus_dir=tmp_path)


def _write_citation_sidecar(doc_dir: Path, text: str, doc_id: str = "doc-1") -> None:
    doc_dir.mkdir(parents=True, exist_ok=True)
    (doc_dir / CITATION_UNITS_FILENAME).write_text(
        json.dumps(build_citation_units(text, doc_id=doc_id), indent=2),
        encoding="utf-8",
    )


def _result(doc_id: str = "doc-1") -> EnrichmentResult:
    return EnrichmentResult.model_validate({
        "doc_id": doc_id,
        "lexicon_proposals": [{
            "action": "add_new",
            "term": "Life Choices",
            "exact_quote": "They call this a life choices framework.",
            "proposed_cluster": "SSA-Rhetoric",
            "function": "Identity-Policing",
            "relationships": [{
                "existing_term": "Born This Way",
                "relationship": "contrasts_with",
                "evidence": "The article contrasts life choices with born this way language.",
            }],
        }],
        "entity_proposals": [{
            "action": "add_new",
            "entity_type": "organization",
            "name": "Example Ministry",
            "evidence_quote": "Example Ministry published the guide.",
            "network_connections": [{
                "entity_name": "Partner Group",
                "connection_type": "partner",
                "evidence_quote": "Example Ministry partnered with Partner Group.",
            }],
            "key_individuals": [{
                "name": "Jane Example",
                "role": "director",
                "quote": "Jane Example directed the campaign.",
            }],
        }],
        "tactic_proposals": [{
            "tactic": "Identity-Policing via Life Choices",
            "definition": "Frames identity as voluntary.",
            "evidence_quote": "They call this a life choices framework.",
        }],
        "practice_descriptions": [{
            "practice_id": "Practice: Pastoral Coaching",
            "exact_description": "The guide describes weekly pastoral coaching.",
            "harm_quote": "Participants were told harm was spiritual growth.",
            "harm_stance": "reframed",
        }],
        "statistical_claims": [{
            "claim": "The report claims 80 percent changed.",
            "verifiable": False,
        }],
        "corpus_connections": [{
            "doc_id": "doc-2",
            "connection_type": "same_term",
            "shared_element": "Life Choices",
            "evidence": "Both documents use life choices language.",
            "is_retrieval_grounded": True,
        }],
    })


def test_enrich_save_attaches_citation_locators_to_proposal_quotes(tmp_path):
    doc_dir = tmp_path / "doc-1"
    _write_citation_sidecar(
        doc_dir,
        "\n\n".join([
            "They call this a life choices framework.",
            "Example Ministry published the guide. Example Ministry partnered with Partner Group.",
            "Jane Example directed the campaign.",
            "Participants were told harm was spiritual growth.",
            "The report claims 80 percent changed.",
            "Both documents use life choices language.",
            "The article contrasts life choices with born this way language.",
        ]),
    )

    out = enrich.save("doc-1", _result(), _config(tmp_path))
    data = json.loads(out.read_text(encoding="utf-8"))

    lexicon = data["lexicon_proposals"][0]
    assert lexicon["evidence_locator"]["status"] == "located"
    assert lexicon["evidence_locator"]["unit_id"].startswith("p0001-")
    assert lexicon["evidence_quote_hash"] == quote_hash("They call this a life choices framework.")
    assert lexicon["relationships"][0]["evidence_locator"]["status"] == "located"

    entity = data["entity_proposals"][0]
    assert entity["evidence_locator"]["status"] == "located"
    assert entity["network_connections"][0]["evidence_locator"]["status"] == "located"
    assert entity["key_individuals"][0]["evidence_locator"]["status"] == "located"

    assert data["tactic_proposals"][0]["evidence_locator"]["status"] == "located"
    assert data["practice_descriptions"][0]["evidence_locator"]["status"] == "located"
    assert data["statistical_claims"][0]["evidence_locator"]["status"] == "located"
    assert data["corpus_connections"][0]["evidence_locator"]["status"] == "located"


def test_enrich_save_degrades_when_citation_sidecar_is_missing(tmp_path):
    out = enrich.save("doc-1", _result(), _config(tmp_path))
    data = json.loads(out.read_text(encoding="utf-8"))

    lexicon = data["lexicon_proposals"][0]
    assert lexicon["evidence_locator"]["status"] == "not_found"
    assert lexicon["evidence_locator"]["unit_id"] == ""
    assert lexicon["evidence_quote_hash"] == quote_hash("They call this a life choices framework.")


def test_enrichment_json_for_save_is_used_by_source_worker_path(tmp_path):
    doc_dir = tmp_path / "doc-1"
    _write_citation_sidecar(doc_dir, "They call this a life choices framework.")

    text = enrich.enrichment_json_for_save(_result(), doc_dir, trailing_newline=True)
    assert text.endswith("\n")
    data = json.loads(text)
    assert data["lexicon_proposals"][0]["evidence_locator"]["status"] == "located"


def test_enrich_save_alt_attaches_locators_without_touching_main_file(tmp_path):
    doc_dir = tmp_path / "doc-1"
    _write_citation_sidecar(doc_dir, "They call this a life choices framework.")

    out = enrich.save_alt("doc-1", _result(), _config(tmp_path), label="review")
    data = json.loads(out.read_text(encoding="utf-8"))

    assert out.name.startswith("enrichment_review_")
    assert data["run_type"] == "alt"
    assert data["lexicon_proposals"][0]["evidence_locator"]["status"] == "located"
    assert not (doc_dir / "enrichment.json").exists()
