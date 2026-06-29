from runner.pipeline.citation_units import (
    SCHEMA_VERSION,
    build_citation_units,
    locate_quote,
    quote_hash,
)


def test_build_citation_units_records_paragraph_offsets_and_hashes():
    text = "First paragraph.\nStill first.\n\nSecond paragraph cites ADF."

    sidecar = build_citation_units(text, doc_id="doc-1")

    assert sidecar["schema_version"] == SCHEMA_VERSION
    assert sidecar["doc_id"] == "doc-1"
    assert sidecar["source_artifact"] == "extracted.txt"
    assert sidecar["unit_count"] == 2
    assert sidecar["units"][0]["unit_id"].startswith("p0001-")
    assert sidecar["units"][0]["char_start"] == 0
    assert sidecar["units"][0]["char_end"] == len("First paragraph.\nStill first.")
    assert sidecar["units"][1]["text"] == "Second paragraph cites ADF."


def test_locate_quote_returns_global_offsets_for_exact_quote():
    text = "Intro paragraph.\n\nSecond paragraph cites ADF and Focus."
    sidecar = build_citation_units(text, doc_id="doc-1")

    locator = locate_quote(sidecar, "ADF and Focus")

    assert locator["status"] == "located"
    assert locator["match_kind"] == "exact"
    assert locator["unit_id"].startswith("p0002-")
    assert text[locator["char_start"]:locator["char_end"]] == "ADF and Focus"
    assert locator["quote_hash"] == quote_hash("ADF and Focus")


def test_locate_quote_degrades_cleanly_when_missing():
    sidecar = build_citation_units("Only one paragraph.", doc_id="doc-1")

    assert locate_quote(sidecar, "")["status"] == "missing_quote"
    missing = locate_quote(sidecar, "not in text")
    assert missing["status"] == "not_found"
    assert missing["unit_id"] == ""
