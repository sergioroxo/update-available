import copy
import json

import pytest
from pydantic import ValidationError

from runner.pipeline.atomic_io import atomic_write_json
from runner.pipeline.citation_units_v2 import (
    CITATION_UNITS_V2_FILENAME,
    V2_READY_FILENAME,
    CitationUnitsV2,
    SectionsV2,
    artifact_sha256,
    build_citation_units_v2,
    build_sections_v2,
    canonical_artifact_bytes,
    inspect_v2_artifact_set,
    publish_v2_artifact_set,
)
from runner.pipeline.extraction_quality import sha256_text


def _assert_complete_partition(artifact, canonical):
    assert artifact.spans[0].char_start == 0
    assert artifact.spans[-1].char_end == len(canonical)
    assert "".join(span.text for span in artifact.spans) == canonical
    assert sum(span.char_count for span in artifact.spans) == len(canonical)
    assert artifact.canonical_text_sha256 == sha256_text(canonical)
    for left, right in zip(artifact.spans, artifact.spans[1:]):
        assert left.char_end == right.char_start


def test_sections_and_units_exactly_reconstruct_unicode_whitespace_and_crlf():
    canonical = "  Første 🙂\r\n\r\nAndre linje.\r\n\tTredje\n\nশেষ  "
    sections = build_sections_v2(canonical, doc_id="unicode-doc", target_chars=20, hard_max_chars=30)
    units = build_citation_units_v2(canonical, doc_id="unicode-doc", target_chars=12, hard_max_chars=18)

    _assert_complete_partition(sections, canonical)
    _assert_complete_partition(units, canonical)
    assert sections.spans[0].text.startswith("  ")
    assert sections.spans[-1].text.endswith("  ")
    assert "\r\n" in "".join(span.text for span in units.spans)


def test_blank_line_free_60k_text_is_bounded_and_p95_below_2000():
    canonical = "x" * 60_000
    units = build_citation_units_v2(canonical, doc_id="solid-doc")

    _assert_complete_partition(units, canonical)
    assert len(units.spans) > 1
    assert units.size_distribution.maximum <= 1_900
    assert units.size_distribution.p95 < 2_000


def test_same_input_and_policy_produce_byte_identical_artifacts():
    canonical = ("Paragraph one.\n\nParagraph two!\n" * 400) + "tail"
    first = build_citation_units_v2(canonical, doc_id="stable-doc")
    second = build_citation_units_v2(canonical, doc_id="stable-doc")

    assert canonical_artifact_bytes(first) == canonical_artifact_bytes(second)
    assert artifact_sha256(first) == artifact_sha256(second)


@pytest.mark.parametrize(
    "tamper",
    [
        lambda row: row["spans"][0].update(text="tampered"),
        lambda row: row["spans"][0].update(text_sha256="0" * 64),
        lambda row: row["spans"][0].update(char_end=row["spans"][0]["char_end"] + 1),
        lambda row: row["spans"][1].update(char_start=row["spans"][1]["char_start"] - 1),
        lambda row: row["spans"].append(copy.deepcopy(row["spans"][0])),
        lambda row: row.update(canonical_text_sha256="0" * 64),
        lambda row: row.update(extra="forbidden"),
        lambda row: row.update(source_artifact="../unsafe.txt"),
    ],
)
def test_tampered_units_are_rejected(tamper):
    artifact = build_citation_units_v2("one two three four five", doc_id="tamper-doc", target_chars=8, hard_max_chars=10)
    payload = artifact.model_dump(mode="json")
    tamper(payload)
    with pytest.raises(ValidationError):
        CitationUnitsV2.model_validate_json(json.dumps(payload, ensure_ascii=False))


def test_empty_text_stale_hash_gaps_and_unknown_section_fields_fail():
    with pytest.raises(ValueError, match="cannot be empty"):
        build_sections_v2("", doc_id="empty-doc")

    artifact = build_sections_v2("a" * 100, doc_id="section-doc", target_chars=20, hard_max_chars=30)
    payload = artifact.model_dump(mode="json")
    payload["spans"][1]["char_start"] += 1
    with pytest.raises(ValidationError):
        SectionsV2.model_validate_json(json.dumps(payload))

    payload = artifact.model_dump(mode="json")
    payload["spans"][0]["unknown"] = 1
    with pytest.raises(ValidationError):
        SectionsV2.model_validate_json(json.dumps(payload))


def test_atomic_publication_failure_never_exposes_ready_set(tmp_path):
    canonical = "Evidence. " * 1_000
    sections = build_sections_v2(canonical, doc_id="publish-doc")
    units = build_citation_units_v2(canonical, doc_id="publish-doc")
    calls = 0

    def fail_second(path, payload, **kwargs):
        nonlocal calls
        calls += 1
        if calls == 2:
            raise OSError("synthetic publication failure")
        return atomic_write_json(path, payload, **kwargs)

    with pytest.raises(OSError, match="synthetic publication failure"):
        publish_v2_artifact_set(
            tmp_path, sections=sections, units=units, write_json=fail_second,
        )

    assert (tmp_path / CITATION_UNITS_V2_FILENAME).exists() is False
    assert (tmp_path / V2_READY_FILENAME).exists() is False
    assert inspect_v2_artifact_set(tmp_path) == ("held", "readiness_marker_missing")

    publish_v2_artifact_set(tmp_path, sections=sections, units=units)
    assert inspect_v2_artifact_set(tmp_path) == ("ready", "verified_complete_pair")


def test_ready_set_detects_post_publication_tampering(tmp_path):
    canonical = "Evidence. " * 500
    sections = build_sections_v2(canonical, doc_id="publish-doc")
    units = build_citation_units_v2(canonical, doc_id="publish-doc")
    publish_v2_artifact_set(tmp_path, sections=sections, units=units)

    unit_path = tmp_path / CITATION_UNITS_V2_FILENAME
    unit_path.write_bytes(unit_path.read_bytes().replace(b"Evidence", b"Tampered", 1))
    status, reason = inspect_v2_artifact_set(tmp_path)
    assert status == "held"
    assert reason in {"artifact_set_invalid", "units_hash_mismatch"}
