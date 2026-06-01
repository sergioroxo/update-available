from dataclasses import dataclass
from datetime import datetime, timezone

from runner.clients import sanity
from runner.models.research_annotation import ResearchAnnotation


@dataclass
class _Config:
    sanity_api_base: str = "https://example.invalid/mutate"
    sanity_write_token: str = "token"
    sanity_project_id: str = "project"
    sanity_dataset: str = "production"


def _annotation() -> ResearchAnnotation:
    return ResearchAnnotation(
        doc_id="doc-1",
        profile="visual_network",
        modelProvider="litelm",
        modelName="lexicon-llm",
        resolvedModelName="qwen3.6:35b-a3b",
        promptVersion="research-profile-visual_network-v1.0",
        inputTextHash="a" * 64,
        sourceStance="pro_sogice",
        resultJson={
            "sourceStance": "pro_sogice",
            "peopleVisibleOrNamed": [{"name": "Named speaker"}],
        },
    )


def test_build_research_annotation_document_adds_keys_and_reference():
    doc = sanity._build_research_annotation_document(_annotation())

    assert doc["_id"] == "researchAnnotation-1-visual-network"
    assert doc["_type"] == "researchAnnotation"
    assert doc["sourceDocument"]["_ref"] == "doc-1"
    assert doc["resolvedModelName"] == "qwen3.6:35b-a3b"
    assert doc["resultJson"]["peopleVisibleOrNamed"][0]["_key"]
    assert doc["publicVisibility"] == "private"


def test_write_media_metadata_update_adds_array_keys(monkeypatch):
    calls = []

    def fake_mutate(mutations, config):
        calls.append(mutations)
        return {"results": [{"id": "doc-1"}]}

    monkeypatch.setattr(sanity, "_mutate", fake_mutate)

    sanity.write_media_metadata_update(
        "doc-1",
        {
            "activeResearchProfiles": ["archive_core", "search_discovery"],
            "profileStatus": [{"profile": "search_discovery", "active": True}],
        },
        _Config(),
    )

    set_fields = calls[0][0]["patch"]["set"]
    assert set_fields["mediaMetadata.profileStatus"][0]["_key"]
    assert set_fields["mediaMetadata.activeResearchProfiles"] == [
        "archive_core",
        "search_discovery",
    ]


def test_write_document_date_update_patches_document_and_source_dates(monkeypatch):
    calls = []

    def fake_mutate(mutations, config):
        calls.append(mutations)
        return {"results": [{"id": "doc-1"}]}

    monkeypatch.setattr(sanity, "_mutate", fake_mutate)

    sanity.write_document_date_update(
        "doc-1",
        {"year": 2021, "month": 3, "day": 8, "confidence": "exact"},
        "2021-03-08",
        _Config(),
    )

    patch = calls[0][0]["patch"]
    assert patch["id"] == "doc-1"
    assert patch["set"]["documentDate"] == {
        "year": 2021,
        "month": 3,
        "day": 8,
        "dateConfidence": "exact",
    }
    assert "meta.datePublished" not in patch["set"]
    assert "provenance.sourceDatePublished" not in patch["set"]
    assert patch["set"]["mediaMetadata.general.publicationDate"] == "2021-03-08"


def test_write_reviewed_public_candidate_patches_source_document(monkeypatch):
    calls = []

    def fake_mutate(mutations, config):
        calls.append(mutations)
        return {"results": [{"id": "researchAnnotation-1-shame-article"}]}

    monkeypatch.setattr(sanity, "_mutate", fake_mutate)
    monkeypatch.setattr(sanity, "_fetch_document_by_id", lambda *args, **kwargs: None)

    annotation = ResearchAnnotation(
        doc_id="doc-1",
        profile="shame_article",
        annotationStatus="researcher_reviewed",
        reviewedAt=datetime(2024, 1, 2, tzinfo=timezone.utc),
        modelProvider="litelm",
        modelName="core-qwen",
        promptVersion="research-profile-shame_article-v1.0",
        inputTextHash="a" * 64,
        sourceStance="pro_sogice",
        resultJson={"sourceStance": "pro_sogice", "publicTableCandidate": True},
    )

    sanity.write_research_annotation(annotation, _Config(), force_reviewed=True)

    assert calls[0][1]["patch"]["id"] == "doc-1"
    assert calls[0][1]["patch"]["set"]["mediaMetadata.classificationProvenance.publicTableCandidate"] is True
    assert calls[0][1]["patch"]["set"]["mediaMetadata.classificationProvenance.publicTableCandidateSource"] == "shame_article"


def test_lexicon_write_preserves_full_evidence_dossier(monkeypatch):
    calls = []

    def fake_mutate(mutations, config):
        calls.append(mutations)
        return {"results": [{"id": "lexicon-pastoral-care"}]}

    monkeypatch.setattr(sanity, "_mutate", fake_mutate)

    sanity.write_lexicon_draft_from_proposal(
        {
            "action": "add_new",
            "term": "Pastoral Care",
            "language": "en",
            "exact_quote": "This is pastoral care, not conversion therapy.",
            "definition_as_used": "A euphemistic frame for SOGICE.",
            "register": "euphemistic",
            "co_occurring_terms": ["religious freedom"],
            "relationships": [
                {"existing_term": "Conversion Therapy", "relationship": "euphemism_for", "evidence": "same practice reframed"}
            ],
            "model_confidence": 0.81,
            "confidence_rationale": "Direct quote and clear euphemistic usage.",
            "researcher_confidence": 0.9,
            "researcher_note": "Important UK framing.",
        },
        "doc-1",
        _Config(),
    )

    evidence = calls[0][0]["createOrReplace"]["evidenceDossier"][0]
    assert evidence["exactQuote"] == "This is pastoral care, not conversion therapy."
    assert evidence["definitionAsUsed"] == "A euphemistic frame for SOGICE."
    assert evidence["usageRegister"] == "euphemistic"
    assert evidence["coOccurringTerms"] == ["religious freedom"]
    assert "euphemism_for" in evidence["relationshipNotes"]
    assert evidence["modelConfidence"] == 0.81
    assert evidence["researcherConfidence"] == 0.9
    assert evidence["confirmed"] is False


def test_lexicon_patch_treats_bare_term_existing_id_as_slug_id(monkeypatch):
    calls = []

    def fake_mutate(mutations, config):
        calls.append(mutations)
        return {"results": [{"id": "lexicon-rogd"}]}

    monkeypatch.setattr(sanity, "_mutate", fake_mutate)

    sanity.write_lexicon_draft_from_proposal(
        {
            "action": "add_evidence",
            "term": "ROGD",
            "existing_entry_id": "ROGD",
            "language": "en",
            "exact_quote": "ROGD appears in the source.",
        },
        "doc-1",
        _Config(),
    )

    assert calls[0][0]["patch"]["id"] == "lexicon-rogd"
    assert calls[0][1]["patch"]["id"] == "lexicon-rogd"


def test_confirm_lexicon_context_patches_one_evidence_item(monkeypatch):
    calls = []

    def fake_mutate(mutations, config):
        calls.append(mutations)
        return {"results": [{"id": "lexicon-pastoral-care"}]}

    monkeypatch.setattr(sanity, "_mutate", fake_mutate)

    sanity.confirm_lexicon_context(
        "lexicon-pastoral-care",
        "evidence-doc-1-pastoral-care",
        _Config(),
        note="Checked against source text.",
    )

    patch = calls[0][0]["patch"]
    assert patch["id"] == "lexicon-pastoral-care"
    assert patch["set"]['evidenceDossier[_key=="evidence-doc-1-pastoral-care"].confirmed'] is True
    assert patch["set"]['evidenceDossier[_key=="evidence-doc-1-pastoral-care"].confirmedNote'] == "Checked against source text."


def test_summarize_registry_status_counts_all_registry_types():
    overview = sanity.summarize_registry_status(
        [
            {
                "_id": "lexicon-a",
                "_type": "lexiconEntry",
                "label": "A",
                "status": "validated",
                "evidenceTotal": 2,
                "evidenceConfirmed": 1,
                "evidenceDossier": [
                    {"docRef": "doc-one", "confirmed": True},
                    {"docRef": "doc-two", "confirmed": False},
                ],
            },
            {
                "_id": "lexicon-b",
                "_type": "lexiconEntry",
                "label": "B",
                "status": "draft",
                "evidenceTotal": 1,
                "evidenceConfirmed": 0,
                "evidenceDossier": [{"docRef": "doc-three", "confirmed": False}],
            },
            {
                "_id": "organization-c",
                "_type": "organization",
                "label": "C",
                "registryStatus": "under_investigation",
                "sourceDocuments": [{"docRef": "doc-four"}],
            },
            {
                "_id": "person-d",
                "_type": "person",
                "label": "D",
                "registryStatus": "confirmed",
            },
            {
                "_id": "tactic-e",
                "_type": "tacticEntry",
                "label": "E",
                "status": "draft",
                "registryStatus": "confirmed",
                "approvedDocRef": "doc-five",
            },
            {
                "_id": "practice-f",
                "_type": "practiceEntry",
                "label": "F",
                "status": "validated",
                "registryStatus": "confirmed",
            },
            {
                "_id": "tag-g",
                "_type": "tagRegistry",
                "label": "G",
                "status": "candidate",
            },
        ]
    )

    assert overview["total"] == 7
    assert overview["validated"] == 3
    assert overview["needs_review"] == 4
    assert overview["evidence_total"] == 3
    assert overview["evidence_confirmed"] == 1
    assert overview["evidence_pending"] == 2
    assert overview["lexicon_evidence_total"] == 3
    assert overview["lexicon_evidence_confirmed"] == 1
    assert overview["lexicon_evidence_pending"] == 2
    assert overview["records_with_document_evidence"] == 4
    assert overview["by_type"]["lexiconEntry"]["states"] == {
        "validated": 1,
        "needs_review": 1,
    }
    assert overview["by_type"]["organization"]["rows"][0]["documentRefs"] == ["four"]
    assert {row["_id"] for row in overview["review_rows"]} == {
        "lexicon-b",
        "organization-c",
        "tactic-e",
        "tag-g",
    }


def test_patch_registry_validation_uses_schema_specific_fields(monkeypatch):
    calls = []

    def fake_mutate(mutations, config):
        calls.append(mutations)
        return {"results": [{"id": mutations[0]["patch"]["id"]}]}

    monkeypatch.setattr(sanity, "_mutate", fake_mutate)

    sanity.patch_registry_validation("lexicon-a", "lexiconEntry", _Config())
    sanity.patch_registry_validation("organization-b", "organization", _Config())
    sanity.patch_registry_validation("tactic-c", "tacticEntry", _Config())
    sanity.patch_registry_validation("practice-d", "practiceEntry", _Config())
    sanity.patch_registry_validation("tag-e", "tagRegistry", _Config())

    lexicon_set = calls[0][0]["patch"]["set"]
    org_set = calls[1][0]["patch"]["set"]
    tactic_set = calls[2][0]["patch"]["set"]
    practice_set = calls[3][0]["patch"]["set"]
    tag_set = calls[4][0]["patch"]["set"]

    assert lexicon_set["status"] == "validated"
    assert lexicon_set["approvedBy"] == "researcher"
    assert org_set == {"registryStatus": "confirmed"}
    assert tactic_set["status"] == "validated"
    assert tactic_set["registryStatus"] == "confirmed"
    assert practice_set["status"] == "validated"
    assert practice_set["registryStatus"] == "confirmed"
    assert tag_set == {"status": "active"}


def test_patch_registry_validation_rejects_unknown_schema_type(monkeypatch):
    monkeypatch.setattr(sanity, "_mutate", lambda *args, **kwargs: None)

    try:
        sanity.patch_registry_validation("x", "unknownType", _Config())
    except ValueError as exc:
        assert "unsupported registry type" in str(exc)
    else:
        raise AssertionError("Expected ValueError for unsupported registry type")


def test_approved_network_suggestion_writes_organization(monkeypatch):
    calls = []

    def fake_mutate(mutations, config):
        calls.append(mutations)
        return {"results": [{"id": "organization-example-network"}]}

    monkeypatch.setattr(sanity, "_mutate", fake_mutate)

    sanity.write_network_from_suggestion(
        {"name": "Example Network", "description": "A coalition", "evidenceQuote": "Example Network coordinated the campaign."},
        "doc-1",
        _Config(),
    )

    doc = calls[0][0]["createOrReplace"]
    assert doc["_type"] == "organization"
    assert doc["type"] == "network_node"
    assert doc["sourceDocuments"][0]["_ref"] == "doc-1"
