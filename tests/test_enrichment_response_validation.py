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


def test_enrichment_validate_response_reports_validation_details():
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

    with pytest.raises(ValueError) as excinfo:
        _validate_response("doc-1", raw, "litelm")

    message = str(excinfo.value)
    assert "Validation details" in message
    assert "model_confidence" in message
