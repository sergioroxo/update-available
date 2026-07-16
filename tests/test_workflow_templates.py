import json

import pytest

from runner.pipeline.workflow_templates import BUILTIN_TEMPLATES, load_templates, save_template


def test_builtins_are_available_without_user_file(tmp_path):
    rows = load_templates(tmp_path / "missing.json")
    assert len(rows) == len(BUILTIN_TEMPLATES)
    assert all(row["builtin"] for row in rows)


def test_researcher_template_round_trips_and_updates_by_name(tmp_path):
    path = tmp_path / "templates.json"
    first = save_template(path, {
        "name": "Country comparison",
        "research_purpose": "Compare policy change.",
        "research_questions": ["What changed?", "Who advocated for it?"],
        "disclosure_mode": "internal_research",
    })
    save_template(path, {
        **first,
        "research_purpose": "Compare policy and advocacy change.",
    })

    users = [row for row in load_templates(path) if not row["builtin"]]
    assert len(users) == 1
    assert users[0]["research_purpose"] == "Compare policy and advocacy change."
    payload = json.loads(path.read_text())
    assert payload["schema_version"] == "workflow-policy-templates-v1.0"


def test_builtin_template_cannot_be_overwritten(tmp_path):
    with pytest.raises(ValueError, match="built-in"):
        save_template(tmp_path / "templates.json", BUILTIN_TEMPLATES[0])


def test_template_name_is_bounded(tmp_path):
    with pytest.raises(ValueError, match="100"):
        save_template(tmp_path / "templates.json", {"name": "x" * 101})


def test_malformed_row_is_not_allowed_to_destroy_valid_templates(tmp_path):
    path = tmp_path / "templates.json"
    payload = {
        "schema_version": "workflow-policy-templates-v1.0",
        "templates": [
            {"name": "Valid", "research_questions": ["A question?"]},
            {"name": "Broken", "research_questions": 42},
        ],
    }
    path.write_text(json.dumps(payload))
    original = path.read_bytes()

    visible = [row for row in load_templates(path) if not row["builtin"]]
    assert [row["name"] for row in visible] == ["Valid"]
    with pytest.raises((TypeError, ValueError)):
        save_template(path, {"name": "New"})
    assert path.read_bytes() == original


def test_malformed_store_is_never_overwritten_by_save(tmp_path):
    path = tmp_path / "templates.json"
    path.write_text("{not json")
    original = path.read_bytes()

    with pytest.raises(Exception):
        save_template(path, {"name": "New"})

    assert path.read_bytes() == original


@pytest.mark.parametrize("field,value", [
    ("model_policy", "invented"),
    ("disclosure_mode", "public_everything"),
    ("remote_write_policy", "private_upload"),
])
def test_template_policy_allowlists_fail_closed(tmp_path, field, value):
    with pytest.raises(ValueError):
        save_template(tmp_path / "templates.json", {"name": "Unsafe", field: value})
