import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest

from runner.pipeline.atomic_io import atomic_write_json, atomic_write_text
from runner.pipeline.compilation_manifest import (
    begin_compilation_attempt,
    load_latest_completed,
    publish_completed_compilation,
    rebuild_compilation_index,
    repair_latest_completed,
    compilation_batch_key,
)


def _artifacts(root: Path, version: str):
    derived = root / "derived" / version
    memory = derived / "memory.json"
    tags = derived / "tags.json"
    outcome = derived / "outcome.json"
    atomic_write_json(memory, {"schema_version": "memory-v1", "value": version})
    atomic_write_json(tags, {"schema_version": "tags-v1", "value": version})
    atomic_write_json(outcome, {"schema_version": "outcome-v1", "value": version})
    return [("provisional_memory", memory), ("tag_projection", tags), ("batch_outcome", outcome)]


def test_attempt_marker_precedes_child_artifacts(tmp_path):
    begun = begin_compilation_attempt(tmp_path, "batch", source="test")
    state = json.loads(begun["attempt_path"].read_text())
    assert state["status"] == "staging"
    assert not (tmp_path / "derived").exists()


@pytest.mark.parametrize(
    "boundary",
    [
        "after_stage_provisional_memory",
        "after_stage_tag_projection",
        "after_stage_batch_outcome",
        "after_validation",
        "after_completed_manifest",
    ],
)
def test_failure_before_publish_preserves_previous_completed(tmp_path, boundary):
    first = publish_completed_compilation(tmp_path, "batch", _artifacts(tmp_path, "one"), source="test")
    old = first["manifest"]["manifest_fingerprint"]

    def fail(name):
        if name == boundary:
            raise RuntimeError("injected")

    with pytest.raises(RuntimeError, match="injected"):
        publish_completed_compilation(
            tmp_path, "batch", _artifacts(tmp_path, "two"), source="test",
            previous_manifest=first["manifest"], failure_injector=fail,
        )
    assert load_latest_completed(tmp_path, "batch")["manifest_fingerprint"] == old
    states = [json.loads(path.read_text())["status"] for path in (tmp_path / "compilations" / "batch" / "attempts").glob("*/attempt.json")]
    assert "abandoned" in states


def test_failure_after_atomic_publish_exposes_complete_new_manifest(tmp_path):
    first = publish_completed_compilation(tmp_path, "batch", _artifacts(tmp_path, "one"), source="test")

    def fail(name):
        if name == "after_publish":
            raise RuntimeError("injected")

    with pytest.raises(RuntimeError):
        publish_completed_compilation(
            tmp_path, "batch", _artifacts(tmp_path, "two"), source="test",
            previous_manifest=first["manifest"], failure_injector=fail,
        )
    latest = load_latest_completed(tmp_path, "batch")
    assert latest["manifest_fingerprint"] != first["manifest"]["manifest_fingerprint"]
    selected = next(ref for ref in latest["artifacts"] if ref["kind"] == "batch_outcome")
    assert json.loads(Path(selected["path"]).read_text())["value"] == "two"


def test_changed_staged_bytes_are_refused_without_replacing_latest(tmp_path):
    first = publish_completed_compilation(tmp_path, "batch", _artifacts(tmp_path, "one"), source="test")
    artifacts = _artifacts(tmp_path, "two")

    def mutate(name):
        if name == "after_stage_batch_outcome":
            atomic_write_text(artifacts[1][1], "changed")

    with pytest.raises(ValueError, match="changed after staging"):
        publish_completed_compilation(
            tmp_path, "batch", artifacts, source="test",
            previous_manifest=first["manifest"], failure_injector=mutate,
        )
    assert load_latest_completed(tmp_path, "batch")["manifest_fingerprint"] == first["manifest"]["manifest_fingerprint"]


def test_symlink_and_outside_exports_are_refused(tmp_path):
    artifacts = _artifacts(tmp_path, "one")
    outside = tmp_path.parent / "outside-phase12.json"
    atomic_write_json(outside, {"schema_version": "x"})
    with pytest.raises(ValueError, match="outside the exports root"):
        publish_completed_compilation(tmp_path, "batch", [*artifacts[:2], ("batch_outcome", outside)], source="test")
    link = tmp_path / "derived" / "link.json"
    link.symlink_to(artifacts[2][1])
    with pytest.raises(ValueError, match="symlinked path component|safe regular file"):
        publish_completed_compilation(tmp_path, "batch2", [*artifacts[:2], ("batch_outcome", link)], source="test")


def test_symlinked_compilation_parent_cannot_escape_exports(tmp_path):
    outside = tmp_path.parent / "outside-compilations"
    outside.mkdir(exist_ok=True)
    (tmp_path / "compilations").symlink_to(outside, target_is_directory=True)
    with pytest.raises(ValueError, match="component is unsafe"):
        begin_compilation_attempt(tmp_path, "batch", source="test")
    assert not list(outside.glob("**/attempt.json"))


def test_unsafe_batch_ids_have_collision_resistant_keys():
    assert compilation_batch_key("a/b") != compilation_batch_key("a-b")
    assert "/" not in compilation_batch_key("a/b")


@pytest.mark.parametrize("attempt_id", [".", "..", "x" * 101])
def test_caller_supplied_unsafe_attempt_id_is_refused(tmp_path, attempt_id):
    with pytest.raises(ValueError, match="attempt ID is unsafe"):
        publish_completed_compilation(
            tmp_path, "batch", _artifacts(tmp_path, "one"), source="test",
            attempt_id=attempt_id,
        )
    assert compilation_batch_key("..") not in {".", ".."}


def test_concurrent_publish_has_one_winner_and_never_half_manifest(tmp_path):
    artifacts_a = _artifacts(tmp_path, "a")
    artifacts_b = _artifacts(tmp_path, "b")

    def publish(artifacts):
        try:
            return publish_completed_compilation(tmp_path, "batch", artifacts, source="concurrent")
        except RuntimeError:
            return None

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(publish, [artifacts_a, artifacts_b]))
    assert sum(result is not None for result in results) == 1
    latest = load_latest_completed(tmp_path, "batch")
    assert len(latest["artifacts"]) == 3


def test_repair_and_reindex_are_additive_and_do_not_delete_attempts(tmp_path):
    first = publish_completed_compilation(tmp_path, "batch", _artifacts(tmp_path, "one"), source="test")
    second = publish_completed_compilation(
        tmp_path, "batch", _artifacts(tmp_path, "two"), source="test",
        previous_manifest=first["manifest"],
    )
    latest = second["latest_path"]
    atomic_write_text(latest, "corrupt")
    before = set((tmp_path / "compilations" / "batch" / "attempts").glob("**/*"))
    repaired = repair_latest_completed(tmp_path, "batch")
    assert repaired["manifest"]["manifest_fingerprint"] == second["manifest"]["manifest_fingerprint"]
    indexed = rebuild_compilation_index(tmp_path)
    assert len(indexed["index"]["completed_compilations"]) == 2
    assert before <= set((tmp_path / "compilations" / "batch" / "attempts").glob("**/*"))


def test_repair_ignores_valid_manifest_for_a_different_batch(tmp_path):
    source = publish_completed_compilation(tmp_path, "other", _artifacts(tmp_path, "one"), source="test")
    wrong_dir = tmp_path / "compilations" / "batch" / "attempts" / "misplaced"
    wrong_dir.mkdir(parents=True)
    atomic_write_json(wrong_dir / "completed_manifest.json", source["manifest"])
    with pytest.raises(ValueError, match="No valid completed compilation"):
        repair_latest_completed(tmp_path, "batch")


def test_historical_ui_suppresses_unsafe_batch_id_with_phase12_attempt(tmp_path):
    from runner.workflow_outputs_ui import _historical_outcomes, _historical_review_packs

    outcome_path = tmp_path / "batch_outcomes" / "a-b" / "latest_batch_outcome.json"
    atomic_write_json(outcome_path, {
        "schema_version": "historical", "batch_id": "a/b", "workflow_binding": None,
    })
    pack_path = tmp_path / "review_packs" / "a-b" / "latest_review_pack.json"
    atomic_write_json(pack_path, {
        "schema_version": "historical", "label": "a/b", "workflow_binding": None,
        "batch_outcome_binding": {"batch_id": "a/b"},
    })
    begin_compilation_attempt(tmp_path, "a/b", source="test")
    assert _historical_outcomes(tmp_path) == []
    assert _historical_review_packs(tmp_path) == []
