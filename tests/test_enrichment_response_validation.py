import pytest

from runner.pipeline.enrich import _validate_response


def test_enrichment_validate_response_accepts_common_model_enum_drift():
    raw = """
    Here is the JSON:
    {
      "lexicon_proposals": [
        {
          "action": "create",
          "term": "developmental disorder",
          "language": "en",
          "proposed_cluster": "Pseudo-Science",
          "function": "Moral-Purity-Frame",
          "exact_quote": "homosexuality as a developmental disorder",
          "definition_as_used": "Pathologizing phrase.",
          "register": "medicalized",
          "relationships": [
            {
              "existing_term": "Homosexual Disorder",
              "relationship": "related_to",
              "evidence": "Both pathologize homosexuality."
            }
          ],
          "co_occurring_terms": "genetic degeneration"
        }
      ],
      "practice_descriptions": [
        {
          "practice_id": "Practice: Pathologization",
          "exact_description": "Homosexuality is framed as disorder.",
          "harm_stance": "unclear"
        }
      ]
    }
    Extra prose after JSON with {braces} should not break parsing.
    """

    result = _validate_response("doc-1", raw, "litelm")

    proposal = result.lexicon_proposals[0]
    assert proposal.action == "add_new"
    assert proposal.function == "Moral-Purity Frame"
    assert proposal.usage_register == "neutral"
    assert proposal.relationships[0].relationship == "co_occurs_with"
    assert proposal.co_occurring_terms == ["genetic degeneration"]
    assert result.practice_descriptions[0].harm_stance == "not_mentioned"


def test_enrichment_validate_response_repairs_out_of_range_confidence():
    raw = """
    {
      "lexicon_proposals": [
        {
          "action": "add_new",
          "term": "developmental disorder",
          "exact_quote": "homosexuality as disorder",
          "model_confidence": 1.4
        }
      ]
    }
    """

    result = _validate_response("doc-1", raw, "litelm")

    assert result.lexicon_proposals[0].model_confidence == 1.0


def test_enrichment_validate_response_reports_unrepairable_validation_details():
    raw = """
    {
      "lexicon_proposals": [
        {
          "action": "add_new",
          "term": "developmental disorder",
          "exact_quote": "homosexuality as disorder",
          "variants": [{"variant_term": "x", "language": "en", "attestation_tier": "bad-tier"}]
        }
      ]
    }
    """

    with pytest.raises(ValueError) as excinfo:
        _validate_response("doc-1", raw, "litelm")

    message = str(excinfo.value)
    assert "Validation details" in message
    assert "attestation_tier" in message


def test_enrichment_validate_response_accepts_null_entity_text_fields():
    raw = """
    {
      "entity_proposals": [
        {
          "action": "add_new",
          "entity_type": "organization",
          "name": "Political Network for Values",
          "self_description": null,
          "evidence_quote": null,
          "role_in_sogice": null,
          "activities_stated": ["Organizing Transatlantic Summits"],
          "geographic_scope": ["Europe"],
          "network_connections": [
            {
              "entity_name": "Alliance Defending Freedom",
              "connection_type": "partner",
              "evidence_quote": "ADF appeared at the summit."
            }
          ]
        }
      ]
    }
    """

    result = _validate_response("doc-1", raw, "litelm")

    entity = result.entity_proposals[0]
    assert entity.self_description == ""
    assert entity.evidence_quote == ""
    assert entity.role_in_sogice == ""


def test_enrichment_validate_response_preserves_invalid_connection_guidance():
    raw = """
    {
      "entity_proposals": [
        {
          "action": "add_new",
          "entity_type": "organization",
          "name": "Test Org",
          "network_connections": [
            {
              "entity_name": "Jane Person",
              "connection_type": "founder",
              "evidence_quote": "Jane founded the organization."
            }
          ]
        }
      ]
    }
    """

    result = _validate_response("doc-1", raw, "litelm")

    connection = result.entity_proposals[0].network_connections[0]
    assert connection.connection_type == "affiliate"
    assert connection.invalid_connection_type == "founder"
    assert connection.connection_repair_status == "needs_review"
    assert "key_individuals" in connection.repair_note


def test_enrichment_validate_response_marks_podcast_as_media_source_not_entity():
    raw = """
    {
      "entity_proposals": [
        {
          "action": "add_new",
          "entity_type": "organization",
          "name": "Gender: A Wider Lens",
          "self_description": "anti-transgender podcast",
          "role_in_sogice": "Media dissemination of anti-trans narratives.",
          "evidence_quote": "Genspect supports projects like the podcast Gender: A Wider Lens."
        }
      ]
    }
    """

    result = _validate_response("doc-1", raw, "litelm")

    entity = result.entity_proposals[0]
    assert entity.registry_fit == "media_or_source"
    assert "media/source/project" in entity.registry_fit_rationale


def test_enrichment_validate_response_leaves_person_as_registry_entity():
    raw = """
    {
      "entity_proposals": [
        {
          "action": "add_new",
          "entity_type": "person",
          "name": "Avi Ring",
          "self_description": "Norwegian academic",
          "role_in_sogice": "Promoted ROGD theory.",
          "evidence_quote": "Ring was listed as a team member."
        }
      ]
    }
    """

    result = _validate_response("doc-1", raw, "litelm")

    assert result.entity_proposals[0].registry_fit == "registry_entity"


def test_enrichment_validate_response_invalid_registry_fit_needs_review():
    raw = """
    {
      "entity_proposals": [
        {
          "action": "add_new",
          "entity_type": "organization",
          "name": "Example Org",
          "registry_fit": "definitely-not-valid"
        }
      ]
    }
    """

    result = _validate_response("doc-1", raw, "litelm")

    assert result.entity_proposals[0].registry_fit == "needs_review"
