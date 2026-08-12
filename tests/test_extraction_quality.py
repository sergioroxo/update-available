import hashlib
import json

import pytest
from pydantic import ValidationError

from runner.pipeline.extraction_quality import (
    ArtifactDispositionPlan,
    ArtifactDispositionRequest,
    ExtractionManifestV2,
    ExtractionQualityV1,
    ModelInputSliceReceiptV1,
    assess_extraction_text,
    build_extraction_manifest,
    build_model_input_slice,
    load_model_input_text,
    plan_artifact_disposition,
    persist_preprocess_text_artifacts,
    read_canonical_text,
    render_model_input_slice,
    sha256_text,
    validate_extraction_manifest,
    validate_model_input_slice,
    write_canonical_text,
)


def test_complete_canonical_text_over_100k_round_trips_exactly(tmp_path):
    canonical = "  Første\r\n\r\n" + ("αβγ🙂 \r\n" * 15_000) + "  slutt\r\n"
    assert len(canonical) > 100_000
    path = tmp_path / "extracted.txt"

    write_canonical_text(path, canonical)

    assert path.read_bytes() == canonical.encode("utf-8")
    assert read_canonical_text(path) == canonical
    assert hashlib.sha256(path.read_bytes()).hexdigest() == sha256_text(canonical)
    manifest = build_extraction_manifest(
        doc_id="synthetic-long-1",
        canonical_text=canonical,
        extraction_tool="synthetic-copy",
        source_artifact_path="fixtures/long.txt",
    )
    assert manifest.quality.status == "passed"
    validate_extraction_manifest(manifest, canonical)


def test_model_input_slice_is_separate_hash_bound_and_reconstructable(tmp_path):
    canonical = "HEAD" + ("ø" * 100_000) + "TAIL"
    emitted, receipt = build_model_input_slice(
        canonical, limit_chars=24_000, head_chars=16_000, tail_chars=6_000,
    )

    assert receipt.sliced is True
    assert receipt.canonical_text_sha256 == sha256_text(canonical)
    assert receipt.canonical_char_count == len(canonical)
    assert receipt.omitted_char_count == len(canonical) - 22_000
    assert receipt.emitted_char_count == len(emitted)
    assert "[TRUNCATED MIDDLE" in emitted
    assert "[TRUNCATED MIDDLE" not in canonical
    validate_model_input_slice(receipt, canonical_text=canonical, emitted_text=emitted)

    write_canonical_text(tmp_path / "extracted.txt", canonical)
    (tmp_path / "model_input_slice_receipt.json").write_text(
        receipt.model_dump_json(), encoding="utf-8",
    )
    loaded_canonical, loaded_model, loaded_receipt = load_model_input_text(tmp_path)
    assert loaded_canonical == canonical
    assert loaded_model == emitted
    assert loaded_receipt == receipt


def test_model_input_receipt_rejects_tampered_contract():
    canonical = "x" * 30_000
    emitted, receipt = build_model_input_slice(
        canonical, limit_chars=10_000, head_chars=7_000, tail_chars=2_000,
    )
    payload = receipt.model_dump(mode="json")
    payload["omitted_char_count"] += 1
    with pytest.raises(ValidationError):
        ModelInputSliceReceiptV1.model_validate_json(json.dumps(payload))
    with pytest.raises(ValueError, match="emitted hash mismatch"):
        validate_model_input_slice(
            receipt, canonical_text=canonical, emitted_text=emitted + "tamper",
        )


def _validate_receipt_payload(payload):
    return ModelInputSliceReceiptV1.model_validate_json(json.dumps(payload))


@pytest.mark.parametrize(
    "tamper",
    [
        pytest.param(lambda row: row.update(limit_chars=1), id="limit-one-selects-22000"),
        pytest.param(
            lambda row: row["selected_segments"][0].update(char_end=15_999),
            id="wrong-head-range",
        ),
        pytest.param(
            lambda row: row["selected_segments"][-1].update(
                char_start=row["selected_segments"][-1]["char_start"] + 1
            ),
            id="wrong-tail-range",
        ),
        pytest.param(lambda row: row.update(limit_chars=21_999), id="selected-over-limit"),
        pytest.param(
            lambda row: row["selected_segments"][0].update(
                char_start=1, char_end=16_001,
            ),
            id="internal-range",
        ),
        pytest.param(lambda row: row.update(separator_sha256="0" * 64), id="separator-hash"),
        pytest.param(
            lambda row: row.update(separator_char_count=row["separator_char_count"] + 1),
            id="separator-count",
        ),
        pytest.param(
            lambda row: row.update(omitted_char_count=row["omitted_char_count"] + 1),
            id="omitted-count",
        ),
        pytest.param(
            lambda row: row.update(emitted_char_count=row["emitted_char_count"] + 1),
            id="emitted-count",
        ),
    ],
)
def test_sliced_receipt_rejects_policy_and_count_contradictions(tamper):
    canonical = "x" * 30_008
    _, receipt = build_model_input_slice(
        canonical, limit_chars=24_000, head_chars=16_000, tail_chars=6_000,
    )
    assert sum(
        segment.char_end - segment.char_start
        for segment in receipt.selected_segments
    ) == 22_000
    payload = receipt.model_dump(mode="json")
    tamper(payload)

    with pytest.raises(ValidationError):
        _validate_receipt_payload(payload)


@pytest.mark.parametrize(
    ("canonical", "limit", "head", "tail", "expected_sliced"),
    [
        ("", 100, 60, 20, False),
        ("  Unicode 🙂\r\ntext  ", 100, 60, 20, False),
        ("α" * 200, 50, 50, 0, True),
        ("β" * 200, 50, 0, 50, True),
        ("γ\r\n" * 100, 80, 50, 20, True),
    ],
)
def test_valid_receipt_policies_round_trip_exactly(
    canonical, limit, head, tail, expected_sliced,
):
    emitted, receipt = build_model_input_slice(
        canonical, limit_chars=limit, head_chars=head, tail_chars=tail,
    )

    assert receipt.sliced is expected_sliced
    assert sum(
        segment.char_end - segment.char_start
        for segment in receipt.selected_segments
    ) <= limit
    assert render_model_input_slice(receipt, canonical_text=canonical) == emitted
    validate_model_input_slice(
        receipt, canonical_text=canonical, emitted_text=emitted,
    )


def test_receipt_rejects_canonical_and_model_hash_disagreement():
    canonical = "canonical " * 4_000
    emitted, receipt = build_model_input_slice(
        canonical, limit_chars=10_000, head_chars=7_000, tail_chars=2_000,
    )
    with pytest.raises(ValueError, match="canonical hash mismatch"):
        validate_model_input_slice(
            receipt, canonical_text=canonical + "tamper", emitted_text=emitted,
        )
    with pytest.raises(ValueError, match="emitted hash mismatch"):
        validate_model_input_slice(
            receipt, canonical_text=canonical, emitted_text=emitted + "tamper",
        )


def test_receipt_without_canonical_fails_before_text_artifact_writes(tmp_path):
    canonical = "complete " * 5_000
    emitted, receipt = build_model_input_slice(
        canonical, limit_chars=10_000, head_chars=7_000, tail_chars=2_000,
    )
    protected = {
        "extracted.txt": b"existing-canonical",
        "model_input.txt": b"existing-model-input",
        "model_input_slice_receipt.json": b"existing-receipt",
    }
    for name, value in protected.items():
        (tmp_path / name).write_bytes(value)

    with pytest.raises(ValueError, match="requires complete canonical_text"):
        persist_preprocess_text_artifacts(
            tmp_path,
            canonical_text=None,
            model_text=emitted,
            model_input_receipt=receipt.model_dump(mode="json"),
        )

    assert {name: (tmp_path / name).read_bytes() for name in protected} == protected


def test_legacy_text_without_receipt_remains_canonical_fallback(tmp_path):
    legacy_text = "  legacy 🙂\r\nextracted text  "
    canonical, receipt = persist_preprocess_text_artifacts(
        tmp_path,
        canonical_text=None,
        model_text=legacy_text,
        model_input_receipt=None,
    )

    assert canonical == legacy_text
    assert receipt is None
    assert (tmp_path / "extracted.txt").read_bytes() == legacy_text.encode("utf-8")
    assert not (tmp_path / "model_input.txt").exists()
    assert not (tmp_path / "model_input_slice_receipt.json").exists()


def test_distinct_text_without_receipt_rejects_fresh_path_without_creation(tmp_path):
    fresh = tmp_path / "fresh-document"

    with pytest.raises(
        ValueError, match="distinct model input requires model_input_receipt",
    ):
        persist_preprocess_text_artifacts(
            fresh,
            canonical_text="complete canonical text",
            model_text="bounded model text",
            model_input_receipt=None,
        )

    assert not fresh.exists()


def test_distinct_text_without_receipt_leaves_existing_directory_unchanged(tmp_path):
    directory = tmp_path / "existing-document"
    directory.mkdir()
    (directory / "extracted.txt").write_bytes(b"existing canonical")
    (directory / "unrelated.json").write_bytes(b'{"keep":true}\n')
    before = {
        path.relative_to(directory).as_posix(): path.read_bytes()
        for path in sorted(directory.rglob("*"))
        if path.is_file()
    }

    with pytest.raises(
        ValueError, match="distinct model input requires model_input_receipt",
    ):
        persist_preprocess_text_artifacts(
            directory,
            canonical_text="new complete canonical",
            model_text="different bounded model text",
            model_input_receipt={},
        )

    after = {
        path.relative_to(directory).as_posix(): path.read_bytes()
        for path in sorted(directory.rglob("*"))
        if path.is_file()
    }
    assert after == before


def test_identical_text_without_receipt_is_safe_and_exact(tmp_path):
    shared = "  Identical α🙂\r\n\r\ntext with trailing space  "

    canonical, receipt = persist_preprocess_text_artifacts(
        tmp_path,
        canonical_text=shared,
        model_text=shared,
        model_input_receipt=None,
    )

    assert canonical == shared
    assert receipt is None
    assert (tmp_path / "extracted.txt").read_bytes() == shared.encode("utf-8")
    assert not (tmp_path / "model_input.txt").exists()
    assert not (tmp_path / "model_input_slice_receipt.json").exists()
    assert load_model_input_text(tmp_path) == (shared, shared, None)


@pytest.mark.parametrize(
    "sidecars",
    [
        ("model_input.txt",),
        ("model_input_slice_receipt.json",),
        ("model_input.txt", "model_input_slice_receipt.json"),
    ],
    ids=("model-only", "receipt-only", "both"),
)
def test_no_receipt_save_rejects_existing_model_input_sidecars(tmp_path, sidecars):
    directory = tmp_path / "stale-sidecars"
    directory.mkdir()
    (directory / "extracted.txt").write_bytes(b"protected canonical")
    for name in sidecars:
        (directory / name).write_bytes(("protected " + name).encode("utf-8"))
    before = {
        path.name: path.read_bytes()
        for path in sorted(directory.iterdir())
        if path.is_file()
    }

    with pytest.raises(
        ValueError, match="no-receipt save blocked by existing model-input sidecars",
    ):
        persist_preprocess_text_artifacts(
            directory,
            canonical_text="identical new text",
            model_text="identical new text",
            model_input_receipt=None,
        )

    assert {
        path.name: path.read_bytes()
        for path in sorted(directory.iterdir())
        if path.is_file()
    } == before


def test_truncation_marker_and_source_truncation_are_held():
    marker = assess_extraction_text("before [TRUNCATED MIDDLE — 10 chars omitted] after")
    source = assess_extraction_text("complete-looking text", source_truncated=True)

    assert marker.status == "held"
    assert marker.reasons == ("historical_truncation_marker",)
    assert source.status == "held"
    assert source.reasons == ("source_truncated",)


@pytest.mark.parametrize(
    "mutate",
    [
        lambda row: row.update(status="passed"),
        lambda row: row.update(reasons=()),
        lambda row: row.update(canonical_char_count=0),
        lambda row: row.update(canonical_utf8_bytes=0),
        lambda row: row.update(unknown_field="forbidden"),
    ],
)
def test_quality_contract_rejects_contradictory_or_unknown_fields(mutate):
    quality = assess_extraction_text("sound evidence")
    payload = quality.model_dump(mode="json")
    if payload["status"] == "passed":
        payload["source_truncated"] = True
        payload["status"] = "held"
        payload["reasons"] = ["source_truncated"]
    mutate(payload)
    with pytest.raises(ValidationError):
        ExtractionQualityV1.model_validate_json(json.dumps(payload))


def test_manifest_rejects_unsafe_paths_unknown_fields_and_mismatches():
    manifest = build_extraction_manifest(
        doc_id="doc-safe",
        canonical_text="canonical",
        extraction_tool="synthetic-copy",
    )
    payload = manifest.model_dump(mode="json")
    payload["canonical_artifact_path"] = "../outside.txt"
    with pytest.raises(ValidationError):
        ExtractionManifestV2.model_validate_json(json.dumps(payload))

    payload = manifest.model_dump(mode="json")
    payload["canonical_char_count"] += 1
    with pytest.raises(ValidationError):
        ExtractionManifestV2.model_validate_json(json.dumps(payload))

    payload = manifest.model_dump(mode="json")
    payload["surprise"] = True
    with pytest.raises(ValidationError):
        ExtractionManifestV2.model_validate_json(json.dumps(payload))

    with pytest.raises(ValueError, match="does not match canonical text"):
        validate_extraction_manifest(manifest, "tampered")


def test_report_only_disposition_covers_all_outcomes_and_is_deterministic():
    requests = [
        ArtifactDispositionRequest(doc_id="reuse", canonical_text="complete"),
        ArtifactDispositionRequest(
            doc_id="extract", canonical_text=None, preserved_source_available=True,
        ),
        ArtifactDispositionRequest(doc_id="repair", canonical_text=None),
    ]

    first = plan_artifact_disposition(requests)
    second = plan_artifact_disposition(list(reversed(requests)))

    assert first == second
    assert [row.classification for row in first.decisions] == [
        "re_extract", "hold_repair", "reuse_complete",
    ]
    assert first.counts == {
        "reuse_complete": 1, "re_extract": 1, "hold_repair": 1,
    }


def test_disposition_rejects_conflicting_duplicates_and_forged_aggregate():
    with pytest.raises(ValueError, match="conflicting duplicate doc_id"):
        plan_artifact_disposition([
            ArtifactDispositionRequest(doc_id="same", canonical_text="one"),
            ArtifactDispositionRequest(doc_id="same", canonical_text="two"),
        ])

    plan = plan_artifact_disposition([
        ArtifactDispositionRequest(doc_id="one", canonical_text="complete"),
    ])
    payload = plan.model_dump(mode="json")
    payload["counts"]["reuse_complete"] = 0
    with pytest.raises(ValidationError):
        ArtifactDispositionPlan.model_validate_json(json.dumps(payload))


def test_quality_missing_empty_unreadable_and_integrity_mismatch_reasons():
    assert assess_extraction_text(None).reasons == ("missing_text",)
    assert assess_extraction_text("").reasons == ("empty_text",)
    assert assess_extraction_text("x", text_readable=False).reasons == ("unreadable_text",)
    assert assess_extraction_text("x", integrity_valid=False).reasons == ("integrity_mismatch",)


def test_pure_planning_and_builders_leave_protected_synthetic_roots_unchanged(
    tmp_path, monkeypatch,
):
    protected = [tmp_path / name for name in ("corpus", "queue", "ledger", "syncthing")]
    for index, root in enumerate(protected):
        root.mkdir()
        (root / "sentinel.bin").write_bytes(bytes([index, 0, 255]))

    def snapshot():
        return {
            str(path.relative_to(tmp_path)): sha256_text(path.read_bytes().hex())
            for root in protected
            for path in sorted(root.rglob("*"))
            if path.is_file()
        }

    before = snapshot()

    def forbid_network(*args, **kwargs):
        raise AssertionError("network/model access is forbidden in model-free builders")

    monkeypatch.setattr("socket.create_connection", forbid_network)
    plan_artifact_disposition([
        ArtifactDispositionRequest(doc_id="synthetic", canonical_text="local only"),
    ])
    build_extraction_manifest(
        doc_id="synthetic",
        canonical_text="local only",
        extraction_tool="synthetic-copy",
    )

    assert snapshot() == before
