"""
Stage 0 — Seed import from static markdown files.

Parsers:
  parse_lexicon_md()       → list of term dicts from SOGICE_Lexicon_v2.1.md
  parse_entity_registry_md() → dict with keys: orgs, persons, laws, events

Writers:
  seed_lexicon()   → iterated write to Sanity via sanity.write_seed_lexicon_entry()
  seed_entities()  → iterated write to Sanity via per-type writers
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Literal

from ..config import Config

_LEXICON_FILE = (
    Path(__file__).parents[2] / "00_infrastructure" / "SOGICE_Lexicon_v2.1.md"
)
_ENTITY_FILE = (
    Path(__file__).parents[2] / "00_infrastructure" / "Entity_Registry_v1.1.md"
)

# Cluster section headers → proposedCluster values
_SECTION_CLUSTER_MAP = {
    "SECTION 1":  "SSA-Rhetoric",
    "SECTION 2":  "Pastoral-Coercion",
    "SECTION 3":  "Pseudo-Science",
    "SECTION 4":  "Policy-Resistance",
    "SECTION 5":  "Anti-Trans/ROGD",
    "SECTION 6":  "Anti-Gender",
    "SECTION 7":  "Pro-Trans-SOGICE",
    "SECTION 8":  "Non-SOGICE",
    "SECTION 9":  "Non-SOGICE",    # historical/archaic
    "SECTION 10": "Non-SOGICE",   # migration/asylum
    "SECTION 11": "Unknown",      # multilingual table — parsed separately
    "SECTION 12": "Unknown",      # terms requiring documentation
}

# Language codes for multilingual terms in term names like "(IT)", "(DE)"
_LANG_RE = re.compile(r"\(([A-Z]{2,3})\)$")
# Matches term headings: **Term** or **Term** (expansion)
_TERM_LINE_RE = re.compile(r"^\*\*(.+?)\*\*\s*(\([^)]*\))?\s*$")

# Valid cluster and function values matching Sanity schema
_VALID_CLUSTERS = {
    "SSA-Rhetoric", "Pastoral-Coercion", "Pseudo-Science", "Policy-Resistance",
    "Anti-Trans/ROGD", "Anti-Gender", "Pro-Trans-SOGICE", "Non-SOGICE", "Unknown",
}
_VALID_FUNCTIONS = {
    "Slur", "Euphemism", "Conspiracy", "Pseudo-Diagnostic", "Identity-Policing",
    "Moral-Purity Frame", "Political Slogan", "Recruitment Frame", "Pastoral Rhetoric",
    "Disinformation Narrative", "Promotional Recruitment", "Testimonial Marketing",
    "Unknown",
}


def parse_lexicon_md(path: Path | None = None) -> list[dict]:
    """Parse SOGICE_Lexicon_v2.1.md and return list of term entry dicts.

    Each dict contains: term, expansion, language, proposed_cluster, function,
    definition, related, links_to_actors, links_to_legal, promotional_use_rule,
    source_note, languages_seen.
    """
    raw = (path or _LEXICON_FILE).read_text(encoding="utf-8")
    entries: list[dict] = []
    current_cluster = "Unknown"

    lines = raw.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]

        # Track section header for cluster
        if line.startswith("## SECTION"):
            for key, cluster in _SECTION_CLUSTER_MAP.items():
                if key in line:
                    current_cluster = cluster
                    break
            i += 1
            continue

        # Inline format: **Term** — ... (with or without Cluster | Function)
        inline_match = re.match(r"^\*\*(.+?)\*\*(?:\s*\([^)]*\))?\s+[—–-](.+)$", line)
        if inline_match and " | " in inline_match.group(2):
            term_raw = inline_match.group(1).strip().rstrip("†")
            rest = inline_match.group(2).strip()
            # Parse "Anti-Gender (Dehumanizing-Language) | Slur. Definition text."
            cluster_part, _, rest2 = rest.partition("|")
            func_def = rest2.strip()
            # Function is first word before "." then definition follows
            func_part, _, definition = func_def.partition(".")
            entry = {
                "term": term_raw,
                "expansion": "",
                "language": "en",
                "proposed_cluster": _parse_cluster(cluster_part.split("(")[0].strip()),
                "function": _parse_function(func_part.strip()),
                "definition": definition.strip(),
                "related": [],
                "links_to_actors": [],
                "links_to_legal": [],
                "promotional_use_rule": "",
                "source_note": "",
                "languages_seen": ["en"],
            }
            entries.append(entry)
            i += 1
            continue

        # Section 9 one-liner: **Term** — description (no cluster | function)
        elif inline_match and " | " not in inline_match.group(2):
            term_raw = inline_match.group(1).strip().rstrip("†")
            if "·" not in term_raw and len(term_raw) <= 80:
                entry = {
                    "term": term_raw,
                    "expansion": "",
                    "language": "en",
                    "proposed_cluster": current_cluster,
                    "function": "Unknown",
                    "definition": inline_match.group(2).strip(),
                    "related": [],
                    "links_to_actors": [],
                    "links_to_legal": [],
                    "promotional_use_rule": "",
                    "source_note": "",
                    "languages_seen": ["en"],
                }
                entries.append(entry)
            i += 1
            continue

        # Term entry: **Term** or **Term** (expansion) at line start
        term_match = _TERM_LINE_RE.match(line)
        if term_match:
            term_raw = term_match.group(1).strip()
            expansion = (term_match.group(2) or "").strip().strip("()")

            # Skip non-term bold lines: headers with special chars, table markers, etc.
            if "·" in term_raw or "|" in term_raw or term_raw.startswith("*"):
                i += 1
                continue
            # Skip section/intro bold headings (these tend to be long prose or have colons)
            if len(term_raw) > 80:
                i += 1
                continue

            term_name = term_raw

            # Strip footnote markers
            term_name = term_name.rstrip("†*")

            # Detect language code in term name, e.g. "Accompagnamento (IT)"
            lang = "en"
            lang_match = _LANG_RE.search(expansion)
            if lang_match:
                lang = lang_match.group(1).lower()
                expansion = expansion[: lang_match.start()].strip()
            # Some terms embed language in name: e.g. "Troska-Duszpasterska (PL)"
            lang_in_name = _LANG_RE.search(term_raw)
            if lang_in_name:
                lang = lang_in_name.group(1).lower()
                term_name = term_raw[: lang_in_name.start()].rstrip(" -†*")

            # Collect bullet fields following the term line
            entry: dict = {
                "term": term_name,
                "expansion": expansion,
                "language": lang,
                "proposed_cluster": current_cluster,
                "function": "Unknown",
                "definition": "",
                "related": [],
                "links_to_actors": [],
                "links_to_legal": [],
                "promotional_use_rule": "",
                "source_note": "",
                "languages_seen": [lang] if lang != "en" else ["en"],
            }

            i += 1
            while i < len(lines):
                bullet = lines[i].strip()
                if not bullet.startswith("- ") and not bullet.startswith("* "):
                    break
                text = bullet[2:].strip()

                if text.startswith("Cluster:"):
                    cluster_raw = text[len("Cluster:"):].strip()
                    # May be "SSA-Rhetoric | Function: Euphemism" on same line
                    if "|" in cluster_raw:
                        parts = cluster_raw.split("|")
                        cluster_part = parts[0].strip()
                        for rest_part in parts[1:]:
                            rest_part = rest_part.strip()
                            if rest_part.startswith("Function:"):
                                func_raw = rest_part[len("Function:"):].strip()
                                entry["function"] = _parse_function(func_raw)
                        entry["proposed_cluster"] = _parse_cluster(cluster_part)
                    else:
                        entry["proposed_cluster"] = _parse_cluster(cluster_raw)

                elif text.startswith("Function:"):
                    func_raw = text[len("Function:"):].strip()
                    entry["function"] = _parse_function(func_raw)

                elif text.startswith("Definition:"):
                    entry["definition"] = text[len("Definition:"):].strip()

                elif text.startswith("Promotional use rule:"):
                    entry["promotional_use_rule"] = text[len("Promotional use rule:"):].strip()

                elif text.startswith("Related:"):
                    related_raw = text[len("Related:"):].strip()
                    entry["related"] = _parse_related(related_raw)

                elif text.startswith("Links to actors:"):
                    actors_raw = text[len("Links to actors:"):].strip()
                    entry["links_to_actors"] = [a.strip() for a in actors_raw.split(",") if a.strip()]

                elif text.startswith("Links to legal:"):
                    legal_raw = text[len("Links to legal:"):].strip()
                    entry["links_to_legal"] = [a.strip() for a in legal_raw.split(",") if a.strip()]

                elif text.startswith("Note:") or text.startswith("Source:"):
                    entry["source_note"] = text.split(":", 1)[1].strip()

                i += 1

            # Skip table rows (| ... |) and very short synthetic terms
            if "|" in term_name or len(term_name) < 2:
                continue

            entries.append(entry)
            continue

        i += 1

    return entries


def parse_entity_registry_md(path: Path | None = None) -> dict[str, list[dict]]:
    """Parse Entity_Registry_v1.1.md.

    Returns dict with keys: orgs, persons, laws, events.
    Each entry is a dict of fields ready for seed writing.
    """
    raw = (path or _ENTITY_FILE).read_text(encoding="utf-8")
    result: dict[str, list[dict]] = {"orgs": [], "persons": [], "laws": [], "events": []}
    current_section: str | None = None
    lines = raw.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]

        if "## PART 1" in line:
            current_section = "orgs"
            i += 1
            continue
        elif "## PART 2" in line:
            current_section = "persons"
            i += 1
            continue
        elif "## PART 3" in line:
            current_section = "laws"
            i += 1
            continue
        elif "## PART 4" in line:
            current_section = "events"
            i += 1
            continue

        # Entity entry: **Name** or **Name** (expansion) at line start
        entity_match = _TERM_LINE_RE.match(line)
        if current_section and entity_match:
            name_raw = entity_match.group(1).strip()
            expansion = (entity_match.group(2) or "").strip().strip("()")

            if not name_raw or "|" in name_raw or "·" in name_raw:
                i += 1
                continue

            name = name_raw.rstrip("†")

            entry: dict = {
                "name": name,
                "expansion": expansion,
                "status": "seeded",
            }

            i += 1
            while i < len(lines):
                bullet = lines[i].strip()
                if not bullet.startswith("- ") and not bullet.startswith("* "):
                    break
                text = bullet[2:].strip()

                def _kv(prefix: str) -> str | None:
                    if text.startswith(prefix + ":"):
                        return text[len(prefix) + 1:].strip()
                    return None

                for key, prefix in [
                    ("type", "Type"), ("country", "Country"), ("founded", "Founded"),
                    ("dissolved", "Dissolved"), ("description", "Description"),
                    ("note", "Note"), ("source", "Source"), ("status", "Status"),
                    ("former_names_raw", "Former names"), ("parent_raw", "Parent organization"),
                    ("applies_to", "Applies to"), ("historical_significance", "Historical significance"),
                    ("year", "Year"),
                    # Persons
                    ("role", "Role"), ("affiliated_orgs_raw", "Affiliated organizations"),
                    ("public_profile", "Public profile"), ("contested_figure", "Contested figure"),
                    ("contested_figure_note", "Contested figure note"),
                    # Events
                    ("date", "Date"), ("actors_raw", "Actors"),
                ]:
                    val = _kv(prefix)
                    if val is not None:
                        entry[key] = val
                        break

                i += 1

            result[current_section].append(entry)
            continue

        i += 1

    return result


# ---------------------------------------------------------------------------
# Seed writers
# ---------------------------------------------------------------------------

def seed_lexicon(
    config: Config,
    dry_run: bool = False,
    force: bool = False,
    path: Path | None = None,
) -> dict:
    """Parse the seed lexicon and write entries to Sanity.

    Returns summary dict: {attempted, created, skipped, errors}.
    When dry_run=True, parses but does not write.
    When force=False, checks if the entry already exists before writing.
    """
    from ..clients import sanity as sanity_client

    entries = parse_lexicon_md(path)
    summary = {"attempted": len(entries), "created": 0, "skipped": 0, "errors": []}

    existing_ids: set[str] = set()
    if not force and not dry_run:
        try:
            existing = sanity_client.fetch_lexicon_terms(config)
            existing_ids = {e.get("_id", "") for e in existing}
        except Exception:
            existing_ids = set()

    for entry in entries:
        term = entry["term"]
        sanity_id = f"lexicon-{_slugify(term)}"

        if not force and sanity_id in existing_ids:
            summary["skipped"] += 1
            continue

        if dry_run:
            summary["created"] += 1
            continue

        try:
            sanity_client.write_seed_lexicon_entry(
                {
                    "term": term,
                    "expansion": entry.get("expansion", ""),
                    "language": entry.get("language", "en"),
                    "proposed_cluster": entry.get("proposed_cluster", "Unknown"),
                    "function": entry.get("function", "Unknown"),
                    "definition": entry.get("definition", ""),
                    "draft_definition": entry.get("definition", ""),
                    "related": ", ".join(entry.get("related", [])),
                    "source_note": entry.get("source_note", ""),
                    "languages_seen": entry.get("languages_seen", []),
                    "recommended_status": "draft",
                    "sanity_id": sanity_id,
                },
                config,
            )
            summary["created"] += 1
        except Exception as exc:
            summary["errors"].append(f"{term}: {exc}")

    return summary


def seed_entities(
    config: Config,
    dry_run: bool = False,
    entity_type: Literal["org", "person", "law", "event", "all"] = "all",
    path: Path | None = None,
) -> dict:
    """Parse the entity registry and write records to Sanity.

    Returns summary dict: {attempted, created, skipped, errors}.
    """
    from ..clients import sanity as sanity_client

    registry = parse_entity_registry_md(path)
    summary = {"attempted": 0, "created": 0, "skipped": 0, "errors": []}

    sections: list[tuple[str, list[dict]]] = []
    if entity_type in ("org", "all"):
        sections.append(("org", registry["orgs"]))
    if entity_type in ("person", "all"):
        sections.append(("person", registry["persons"]))
    if entity_type in ("law", "all"):
        sections.append(("law", registry["laws"]))
    if entity_type in ("event", "all"):
        sections.append(("event", registry["events"]))

    for section_type, entities in sections:
        summary["attempted"] += len(entities)
        for entry in entities:
            name = entry.get("name", "").strip()
            if not name:
                summary["skipped"] += 1
                continue

            if dry_run:
                summary["created"] += 1
                continue

            try:
                if section_type == "org":
                    sanity_client.write_seed_organization(entry, config)
                elif section_type == "person":
                    sanity_client.write_seed_person(entry, config)
                elif section_type == "law":
                    sanity_client.write_seed_law(entry, config)
                elif section_type == "event":
                    sanity_client.write_seed_event(entry, config)
                summary["created"] += 1
            except Exception as exc:
                summary["errors"].append(f"{name}: {exc}")

    return summary


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _slugify(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")[:80]


def _parse_cluster(raw: str) -> str:
    # May be "SSA-Rhetoric / Pseudo-Science" — take first
    first = raw.split("/")[0].strip()
    return first if first in _VALID_CLUSTERS else "Unknown"


def _parse_function(raw: str) -> str:
    # May be "Euphemism / Identity label" — take first valid
    for part in re.split(r"[/,]", raw):
        part = part.strip()
        if part in _VALID_FUNCTIONS:
            return part
        # Normalize "Identity label" → "Identity-Policing" etc.
        normed = _normalize_function(part)
        if normed in _VALID_FUNCTIONS:
            return normed
    return "Unknown"


def _normalize_function(raw: str) -> str:
    mapping = {
        "identity label": "Identity-Policing",
        "identity policing": "Identity-Policing",
        "moral purity frame": "Moral-Purity Frame",
        "political slogan": "Political Slogan",
        "recruitment frame": "Recruitment Frame",
        "pastoral rhetoric": "Pastoral Rhetoric",
        "disinformation narrative": "Disinformation Narrative",
        "promotional recruitment": "Promotional Recruitment",
        "testimonial marketing": "Testimonial Marketing",
        "pseudo diagnostic": "Pseudo-Diagnostic",
        "pseudo-diagnostic (historical)": "Pseudo-Diagnostic",
    }
    return mapping.get(raw.lower(), raw)


def _parse_related(raw: str) -> list[str]:
    # "→ SSA, → USSA, → SGA" or "→ SSA" or "SSA, USSA"
    terms = re.split(r"[,;]", raw)
    result = []
    for t in terms:
        t = t.strip().lstrip("→").strip()
        if t:
            result.append(t)
    return result
