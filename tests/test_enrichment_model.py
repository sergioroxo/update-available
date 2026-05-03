from runner.models.enrichment import LexiconProposal


def _proposal_payload(**overrides):
    payload = {
        "action": "add_new",
        "term": "pastoral care",
        "exact_quote": "Pastoral care is described as the preferred framing.",
    }
    payload.update(overrides)
    return payload


def test_lexicon_proposal_accepts_register_alias_without_warning_field_name():
    proposal = LexiconProposal.model_validate(
        _proposal_payload(register="defensive")
    )

    assert proposal.usage_register == "defensive"
    assert proposal.model_dump(by_alias=True)["register"] == "defensive"


def test_lexicon_proposal_accepts_internal_usage_register_name():
    proposal = LexiconProposal.model_validate(
        _proposal_payload(usage_register="clinical")
    )

    assert proposal.usage_register == "clinical"
    assert proposal.model_dump(by_alias=True)["register"] == "clinical"
