from dataclasses import dataclass
import json

from runner.models.enrichment import EnrichmentResult, EntityProposal, LexiconProposal
from runner.pipeline import enrich


@dataclass
class _Config:
    corpus_dir: object


def test_enrichment_save_archives_existing_with_microsecond_timestamp(tmp_path):
    config = _Config(corpus_dir=tmp_path)
    doc_dir = tmp_path / "doc-1"
    doc_dir.mkdir()
    (doc_dir / "enrichment.json").write_text(
        EnrichmentResult(doc_id="doc-1", enrichment_model="first").model_dump_json(),
        encoding="utf-8",
    )

    enrich.save("doc-1", EnrichmentResult(doc_id="doc-1", enrichment_model="second"), config)

    archives = list(doc_dir.glob("enrichment_*.json"))
    assert len(archives) == 1
    assert archives[0].name.count("_") >= 3
    current = json.loads((doc_dir / "enrichment.json").read_text())
    assert current["run_type"] == "main"
    assert current["enrichment_model"] == "second"


def test_enrichment_save_merges_existing_proposals_instead_of_replacing(tmp_path):
    config = _Config(corpus_dir=tmp_path)
    doc_dir = tmp_path / "doc-1"
    doc_dir.mkdir()
    existing = EnrichmentResult(
        doc_id="doc-1",
        enrichment_model="first",
        entity_proposals=[
            EntityProposal(
                action="enrich_existing",
                entity_type="organization",
                name="SEGM",
                existing_entity_id="organization-segm",
                evidence_quote="SEGM appears in the source.",
                approved=True,
            )
        ],
    )
    (doc_dir / "enrichment.json").write_text(existing.model_dump_json(), encoding="utf-8")

    fresh = EnrichmentResult(
        doc_id="doc-1",
        enrichment_model="second",
        entity_proposals=[
            EntityProposal(
                action="add_new",
                entity_type="organization",
                name="Genspect",
                evidence_quote="Genspect appears in the source.",
            )
        ],
        lexicon_proposals=[
            LexiconProposal(
                action="add_new",
                term="Rapid Onset Gender Dysphoria",
                exact_quote="Rapid Onset Gender Dysphoria is named.",
            )
        ],
    )

    enrich.save("doc-1", fresh, config)

    current = EnrichmentResult.model_validate_json((doc_dir / "enrichment.json").read_text())
    # P3 merge: Genspect (new proposal) comes first; SEGM (appended from old run) second.
    assert {p.name for p in current.entity_proposals} == {"SEGM", "Genspect"}
    segm = next(p for p in current.entity_proposals if p.name == "SEGM")
    assert segm.existing_entity_id == "organization-segm"
    assert segm.approved is True
    assert current.lexicon_proposals[0].term == "Rapid Onset Gender Dysphoria"


def test_enrichment_save_keeps_existing_review_state_for_duplicate_proposal(tmp_path):
    config = _Config(corpus_dir=tmp_path)
    doc_dir = tmp_path / "doc-1"
    doc_dir.mkdir()
    existing = EnrichmentResult(
        doc_id="doc-1",
        enrichment_model="first",
        entity_proposals=[
            EntityProposal(
                action="enrich_existing",
                entity_type="organization",
                name="SEGM",
                existing_entity_id="organization-segm",
                evidence_quote="SEGM appears in the source.",
                researcher_note="checked in Sanity",
            )
        ],
    )
    (doc_dir / "enrichment.json").write_text(existing.model_dump_json(), encoding="utf-8")
    fresh = EnrichmentResult(
        doc_id="doc-1",
        enrichment_model="second",
        entity_proposals=[
            EntityProposal(
                action="enrich_existing",
                entity_type="organization",
                name="SEGM",
                evidence_quote="SEGM appears in the source.",
                existing_entity_id=None,
            )
        ],
    )

    enrich.save("doc-1", fresh, config)

    current = EnrichmentResult.model_validate_json((doc_dir / "enrichment.json").read_text())
    assert len(current.entity_proposals) == 1
    assert current.entity_proposals[0].existing_entity_id == "organization-segm"
    assert current.entity_proposals[0].researcher_note == "checked in Sanity"


def test_enrichment_save_preserves_existing_researcher_notes(tmp_path):
    config = _Config(corpus_dir=tmp_path)
    doc_dir = tmp_path / "doc-1"
    doc_dir.mkdir()
    existing = EnrichmentResult(
        doc_id="doc-1",
        enrichment_model="first",
        researcher_notes="SEGM ID checked manually.",
    )
    (doc_dir / "enrichment.json").write_text(existing.model_dump_json(), encoding="utf-8")
    fresh = EnrichmentResult(
        doc_id="doc-1",
        enrichment_model="second",
        researcher_notes="Second pass found Genspect.",
    )

    enrich.save("doc-1", fresh, config)

    current = EnrichmentResult.model_validate_json((doc_dir / "enrichment.json").read_text())
    assert current.researcher_notes == "SEGM ID checked manually.\n\nSecond pass found Genspect."


def test_enrichment_save_alt_never_touches_main_file_and_marks_run_type(tmp_path):
    config = _Config(corpus_dir=tmp_path)
    doc_dir = tmp_path / "doc-1"
    doc_dir.mkdir()
    (doc_dir / "enrichment.json").write_text('{"doc_id": "doc-1", "run_type": "main"}', encoding="utf-8")

    alt_path = enrich.save_alt(
        "doc-1",
        EnrichmentResult(doc_id="doc-1", enrichment_model="core-gemma"),
        config,
        label="core-gemma",
    )

    assert json.loads((doc_dir / "enrichment.json").read_text())["run_type"] == "main"
    alt = json.loads(alt_path.read_text())
    assert alt["run_type"] == "alt"
    assert alt["enrichment_model"] == "core-gemma"
    history = enrich.list_history("doc-1", config)
    assert history[0]["run_type"] == "alt"


def test_enrichment_save_alt_persists_content_free_paired_audit(tmp_path):
    config = _Config(corpus_dir=tmp_path)
    audit = {
        "llm_flag": "litelm",
        "model": "core-gemma",
        "input_receipt": {
            "schema_version": "resolved-model-input-v1",
            "exact": True,
            "request_sha256": "a" * 64,
            "extracted_text_sha256": "b" * 64,
        },
        "errors": ["sensitive testimony must not leak"],
        "chunks": [{"index": 0, "char_count": 20, "succeeded": False, "error": "raw source text"}],
    }
    alt_path = enrich.save_alt(
        "doc-1",
        EnrichmentResult(doc_id="doc-1", enrichment_model="core-gemma"),
        config,
        label="core-gemma",
        _audit=audit,
    )

    audit_path = alt_path.with_name(f"audit_{alt_path.name}")
    payload = json.loads(audit_path.read_text(encoding="utf-8"))
    assert payload["artifact_file"] == alt_path.name
    assert len(payload["artifact_sha256"]) == 64
    assert payload["input_receipt"]["exact"] is True
    serialized = audit_path.read_text(encoding="utf-8")
    assert "sensitive testimony" not in serialized
    assert "raw source text" not in serialized
    assert len(enrich.list_history("doc-1", config)) == 1
