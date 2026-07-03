from __future__ import annotations

from pathlib import Path

from runner.pipeline import tag_registry


def test_load_tag_registry_uses_env_vocab_dir(tmp_path, monkeypatch):
    vocab_dir = tmp_path / "vocab"
    vocab_dir.mkdir()
    (vocab_dir / tag_registry.VOCAB_CSV_NAME).write_text(
        "Category,Tag,Definition,Concept Cluster,Connections from Archive,Occurrences,Custom\n"
        "Tactic,Religious Freedom Shield,Religious exemption framing,SSA-Rhetoric,,7,\n"
        "Ignored,Not Searchable,Nope,,,,\n",
        encoding="utf-8",
    )
    monkeypatch.setenv("SOGICE_LEGACY_VOCAB_DIR", str(vocab_dir))

    rows = tag_registry.load_tag_registry()

    assert [row["tag"] for row in rows] == ["Religious Freedom Shield"]
    assert rows[0]["category"] == "Tactic"
    assert rows[0]["occurrences"] == 7


def test_legacy_vocab_dir_expands_env_path(tmp_path, monkeypatch):
    monkeypatch.setenv("SOGICE_LEGACY_VOCAB_DIR", str(tmp_path))

    assert tag_registry.legacy_vocab_dir() == tmp_path


def test_load_tag_registry_returns_empty_for_missing_path(tmp_path):
    assert tag_registry.load_tag_registry(tmp_path / "missing") == []


def test_custom_tag_rows_load_without_legacy_csv(tmp_path, monkeypatch):
    overrides_path = tmp_path / "tag_registry_overrides.json"
    monkeypatch.setattr(tag_registry, "OVERRIDES_PATH", overrides_path)

    key = tag_registry.save_custom_tag(
        "Tactic",
        "Longform Religious Framing",
        {
            "definition": "A model-proposed longform candidate.",
            "occurrences": 3,
            "connections": "section-a: quote",
        },
    )

    rows = tag_registry.load_tag_registry(tmp_path / "missing")

    assert key == "Tactic:longform-religious-framing"
    assert len(rows) == 1
    assert rows[0]["key"] == key
    assert rows[0]["category"] == "Tactic"
    assert rows[0]["tag"] == "Longform Religious Framing"
    assert rows[0]["definition"] == "A model-proposed longform candidate."
    assert rows[0]["occurrences"] == 3
    assert rows[0]["custom"] == "longform"


def test_registry_status_reports_missing_csv(tmp_path, monkeypatch):
    monkeypatch.delenv("SOGICE_LEGACY_VOCAB_DIR", raising=False)

    status = tag_registry.registry_status(tmp_path)

    assert status["available"] is False
    assert status["vocab_dir"] == str(tmp_path)
    assert status["csv_name"] == tag_registry.VOCAB_CSV_NAME
    assert status["csv_path"] == str(tmp_path / tag_registry.VOCAB_CSV_NAME)
    assert status["dir_exists"] is True
    assert status["csv_exists"] is False
    assert status["row_count"] == 0


def test_registry_status_counts_custom_rows_without_csv(tmp_path, monkeypatch):
    overrides_path = tmp_path / "tag_registry_overrides.json"
    monkeypatch.setattr(tag_registry, "OVERRIDES_PATH", overrides_path)
    tag_registry.save_custom_tag("Actor", "Longform Actor", {"definition": "Candidate actor"})

    status = tag_registry.registry_status(tmp_path)

    assert status["available"] is True
    assert status["csv_exists"] is False
    assert status["row_count"] == 1


def test_registry_status_reports_available_rows(tmp_path, monkeypatch):
    vocab_dir = tmp_path / "vocab"
    vocab_dir.mkdir()
    (vocab_dir / tag_registry.VOCAB_CSV_NAME).write_text(
        "Category,Tag,Definition,Concept Cluster,Connections from Archive,Occurrences,Custom\n"
        "Tactic,Religious Freedom Shield,Religious exemption framing,SSA-Rhetoric,,7,\n",
        encoding="utf-8",
    )
    monkeypatch.setenv("SOGICE_LEGACY_VOCAB_DIR", str(vocab_dir))

    status = tag_registry.registry_status()

    assert status["available"] is True
    assert status["env_value"] == str(vocab_dir)
    assert status["using_default"] is False
    assert status["csv_exists"] is True
    assert status["row_count"] == 1
    assert "Tactic" in status["searchable_categories"]


def test_load_tag_registry_returns_empty_when_cloud_path_errors(monkeypatch):
    original_exists = Path.exists

    def raising_exists(self: Path) -> bool:
        if self.name == tag_registry.VOCAB_CSV_NAME:
            raise OSError("cloud provider timed out")
        return original_exists(self)

    monkeypatch.setattr(Path, "exists", raising_exists)

    assert tag_registry.load_tag_registry(Path("/cloud-backed-folder")) == []


def test_detect_tag_matches_uses_env_registry(tmp_path, monkeypatch):
    vocab_dir = tmp_path / "vocab"
    vocab_dir.mkdir()
    (vocab_dir / tag_registry.VOCAB_CSV_NAME).write_text(
        "Category,Tag,Definition,Concept Cluster,Connections from Archive,Occurrences,Custom\n"
        "Practice,Conversion Therapy,Attempted orientation change,Clinical,,11,\n",
        encoding="utf-8",
    )
    monkeypatch.setenv("SOGICE_LEGACY_VOCAB_DIR", str(vocab_dir))

    matches = tag_registry.detect_tag_matches("The article discusses conversion therapy bans.")

    assert [(match["category"], match["tag"]) for match in matches] == [
        ("Practice", "Conversion Therapy")
    ]
