"""Local tag registry helpers for broad vocabulary signals.

The legacy tagger vocabulary contains more than lexicon terms: actors, networks,
practices, tactics, harms, evidence types, countries, and document formats. This
module keeps those signals visible to the app and available to enrichment.
"""
from __future__ import annotations

import csv
import json
import os
import re
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_LEGACY_VOCAB_DIR = Path(
    "/Users/sergiogalvaoroxo/Library/CloudStorage/OneDrive-UniversityofBergen/"
    "SurvivingSOGICE/SurvivingSOGICE_Tagger/Old_Artifact_Bakcup"
)
OVERRIDES_PATH = _PROJECT_ROOT / "runner" / "data" / "tag_registry_overrides.json"
VOCAB_CSV_NAME = "sogice_vocabulary_2026-04-03.csv"

SEARCHABLE_CATEGORIES = {
    "Actor",
    "Country",
    "Evidence",
    "Format",
    "Function",
    "Harm",
    "Migration",
    "Network",
    "Practice",
    "Tactic",
    "Term",
    "Term (discovered)",
    "Type",
}


def legacy_vocab_dir() -> Path:
    """Return the configured legacy vocabulary directory.

    The default lives in a cloud-synced university folder on the original
    research machine. Letting the path come from the environment keeps local,
    Mac Studio, and future cloned setups from blocking on that exact mount.
    """
    raw = os.getenv("SOGICE_LEGACY_VOCAB_DIR")
    return Path(raw).expanduser() if raw else DEFAULT_LEGACY_VOCAB_DIR


def registry_status(vocab_dir: Path | None = None) -> dict:
    """Return diagnostic status for the legacy vocabulary backing the registry."""
    configured_dir = vocab_dir or legacy_vocab_dir()
    csv_path = configured_dir / VOCAB_CSV_NAME
    env_value = os.getenv("SOGICE_LEGACY_VOCAB_DIR", "")
    error = ""
    dir_exists = False
    csv_exists = False
    try:
        dir_exists = configured_dir.exists()
        csv_exists = csv_path.exists()
    except OSError as exc:
        error = str(exc)
    rows = load_tag_registry(configured_dir) if not error else []
    return {
        "available": bool(rows),
        "env_var": "SOGICE_LEGACY_VOCAB_DIR",
        "env_value": env_value,
        "using_default": not bool(env_value),
        "vocab_dir": str(configured_dir),
        "csv_name": VOCAB_CSV_NAME,
        "csv_path": str(csv_path),
        "dir_exists": dir_exists,
        "csv_exists": csv_exists,
        "row_count": len(rows),
        "searchable_categories": sorted(SEARCHABLE_CATEGORIES),
        "error": error,
    }


def load_tag_registry(vocab_dir: Path | None = None) -> list[dict]:
    """Load legacy CSV rows plus local researcher overrides."""
    csv_path = (vocab_dir or legacy_vocab_dir()) / VOCAB_CSV_NAME
    rows: list[dict] = []
    try:
        exists = csv_path.exists()
    except OSError:
        exists = False

    if exists:
        try:
            with csv_path.open(encoding="utf-8-sig", newline="") as handle:
                for raw in csv.DictReader(handle):
                    category = (raw.get("Category") or "").strip()
                    tag = (raw.get("Tag") or "").strip()
                    if category not in SEARCHABLE_CATEGORIES or not tag:
                        continue
                    normalized = _normalize_tag_label(tag)
                    if not normalized:
                        continue
                    rows.append({
                        "key": _tag_key(category, normalized),
                        "category": category,
                        "tag": normalized,
                        "definition": raw.get("Definition", ""),
                        "concept_cluster": raw.get("Concept Cluster", ""),
                        "connections": raw.get("Connections from Archive", ""),
                        "occurrences": _safe_int(raw.get("Occurrences")),
                        "custom": raw.get("Custom", ""),
                        "active": True,
                        "researcher_note": "",
                    })
        except OSError:
            rows = []

    overrides = _load_overrides()
    seen_keys: set[str] = set()
    for row in rows:
        seen_keys.add(row["key"])
        if row["key"] in overrides:
            row.update(overrides[row["key"]])
    for key, override in sorted(overrides.items()):
        if key in seen_keys or not isinstance(override, dict):
            continue
        category = str(override.get("category") or "").strip()
        tag = _normalize_tag_label(str(override.get("tag") or "").strip())
        if category not in SEARCHABLE_CATEGORIES or not tag:
            continue
        rows.append({
            "key": key,
            "category": category,
            "tag": tag,
            "definition": override.get("definition", ""),
            "concept_cluster": override.get("concept_cluster", ""),
            "connections": override.get("connections", ""),
            "occurrences": _safe_int(str(override.get("occurrences", 0))),
            "custom": override.get("custom", "local"),
            "active": bool(override.get("active", True)),
            "researcher_note": override.get("researcher_note", ""),
        })
    return rows


def save_tag_override(key: str, updates: dict) -> None:
    overrides = _load_overrides()
    overrides[key] = {**overrides.get(key, {}), **updates}
    OVERRIDES_PATH.parent.mkdir(parents=True, exist_ok=True)
    OVERRIDES_PATH.write_text(json.dumps(overrides, indent=2), encoding="utf-8")


def save_custom_tag(category: str, tag: str, updates: dict | None = None) -> str:
    """Create/update a local-only registry row.

    Custom tags are stored in the overrides file so they survive app reloads and
    participate in enrichment hint matching. They remain local evidence signals;
    this does not create a Sanity record or schema entry.
    """
    category = category.strip()
    tag = _normalize_tag_label(tag)
    if category not in SEARCHABLE_CATEGORIES:
        raise ValueError(f"Unsupported tag category: {category}")
    if not tag:
        raise ValueError("Tag label is required")
    key = _tag_key(category, tag)
    payload = {
        "category": category,
        "tag": tag,
        "active": True,
        "custom": "longform",
    }
    if updates:
        payload.update(updates)
    save_tag_override(key, payload)
    return key


def detect_tag_matches(text: str, max_per_category: int = 20) -> list[dict]:
    """Return tag registry labels that appear in the document text."""
    haystack = f" {text.lower()} "
    matches: list[dict] = []
    counts: dict[str, int] = {}
    seen_labels: set[str] = set()
    for row in load_tag_registry():
        if not row.get("active", True):
            continue
        tag = row["tag"]
        if len(tag) < 3:
            continue
        category = row["category"]
        label_key = re.sub(r"[^a-z0-9]+", " ", tag.lower()).strip()
        if label_key in seen_labels:
            continue
        if counts.get(category, 0) >= max_per_category:
            continue
        if _tag_in_text(tag, haystack):
            seen_labels.add(label_key)
            matches.append({
                "category": category,
                "tag": tag,
                "definition": row.get("definition", ""),
                "concept_cluster": row.get("concept_cluster", ""),
                "occurrences": row.get("occurrences", 0),
            })
            counts[category] = counts.get(category, 0) + 1
    return matches


def format_matches_for_prompt(matches: list[dict], max_total: int = 80) -> str:
    if not matches:
        return ""
    lines = []
    for match in matches[:max_total]:
        definition = match.get("definition", "")
        definition = f" — {definition[:180]}" if definition else ""
        cluster = f" [{match.get('concept_cluster')}]" if match.get("concept_cluster") else ""
        lines.append(f"- {match['category']}: {match['tag']}{cluster}{definition}")
    return "\n".join(lines)


def _load_overrides() -> dict:
    try:
        exists = OVERRIDES_PATH.exists()
    except OSError:
        return {}
    if not exists:
        return {}
    try:
        return json.loads(OVERRIDES_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _normalize_tag_label(tag: str) -> str:
    tag = tag.strip()
    tag = re.sub(r"^(Type|Format|Term|Tactic|Practice|Network|Actor|Country|Evidence|Function|Harm|Migration):\s*", "", tag)
    return tag.strip()


def _tag_key(category: str, tag: str) -> str:
    return f"{category}:{re.sub(r'[^a-z0-9]+', '-', tag.lower()).strip('-')}"


def _safe_int(value: str | None) -> int:
    try:
        return int(value or 0)
    except ValueError:
        return 0


def _tag_in_text(tag: str, haystack: str) -> bool:
    needle = tag.lower()
    if len(needle) < 8:
        return re.search(rf"(?<!\w){re.escape(needle)}(?!\w)", haystack) is not None
    return needle in haystack
