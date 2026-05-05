"""
Stage 0 — Seed import from static markdown files.

Parsers:
  parse_lexicon_md()              → list of term dicts from SOGICE_Lexicon_v2.1.md
  parse_multilingual_variants_md() → list of variant dicts (Section 11 table + notes)
  parse_entity_registry_md()      → dict with keys: orgs, persons, laws, events

Writers:
  seed_lexicon()          → iterated write to Sanity via sanity.write_seed_lexicon_entry()
  seed_lexicon_variants() → appends multilingualVariants to parent entries
  seed_entities()         → iterated write to Sanity via per-type writers
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
# Section 11 — multilingual variants
# ---------------------------------------------------------------------------

# Section 11 table column order → ISO 639-1 codes
_TABLE_LANG_COLS = ["en", "no", "it", "fr", "de", "es", "pl", "fi", "sv", "hu", "el", "mt"]

# Section 11 language note prefixes → ISO code
_LANG_NOTE_MAP = {
    "Norwegian":   "no",
    "Italian":     "it",
    "Portuguese":  "pt",
    "Spanish":     "es",
    "German":      "de",
    "Polish":      "pl",
    "Hungarian":   "hu",
    "Romanian":    "ro",
    "Greek":       "el",
    "Maltese":     "mt",
    "French":      "fr",
    "Russian":     "ru",
    "Finnish":     "fi",
    "Swedish":     "sv",
}

# Tier markers in variant cells
_TIER_RE = re.compile(r"\(T([123])\)")


def parse_multilingual_variants_md(path: Path | None = None) -> list[dict]:
    """Parse Section 11 of SOGICE_Lexicon_v2.1.md and return variant dicts.

    Each dict: canonical_term, canonical_id, variant_term, language,
    attestation_tier, source_note.
    Covers both the translation table and the language-specific notes paragraphs.
    """
    raw = (path or _LEXICON_FILE).read_text(encoding="utf-8")
    lines = raw.splitlines()
    variants: list[dict] = []

    in_section_11 = False
    in_table = False
    table_english_col: list[str] = []  # English cell per row → canonical term

    for line in lines:
        if "## SECTION 11" in line:
            in_section_11 = True
            continue
        if in_section_11 and line.startswith("## "):
            # Left Section 11
            in_section_11 = False
            continue
        if not in_section_11:
            continue

        # Table rows start with |
        if line.startswith("|"):
            cells = [c.strip() for c in line.split("|")[1:-1]]
            if not cells:
                continue
            # Header row: "English | Norwegian | ..."
            if cells[0].lower() == "english":
                in_table = True
                continue
            # Separator row: ---|---|...
            if re.match(r"^-+$", cells[0].replace(" ", "")):
                continue
            if in_table and len(cells) >= 2:
                english_term = cells[0].strip()
                if not english_term or english_term == "—":
                    continue
                canonical_id = f"lexicon-{_slugify(english_term)}"
                for col_idx, lang in enumerate(_TABLE_LANG_COLS):
                    if col_idx == 0 or col_idx >= len(cells):
                        continue
                    cell = cells[col_idx].strip()
                    if not cell or cell == "—":
                        continue
                    # May have "(T1)" or "(T2)" tier marker
                    tier_match = _TIER_RE.search(cell)
                    tier = "tier-1-legal" if (tier_match and tier_match.group(1) == "1") else "tier-2-ngo-academic"
                    variant_term = _TIER_RE.sub("", cell).strip().strip("()")
                    if not variant_term or variant_term == "—":
                        continue
                    variants.append({
                        "canonical_term": english_term,
                        "canonical_id": canonical_id,
                        "variant_term": variant_term,
                        "language": lang,
                        "attestation_tier": tier,
                        "source_note": "SOGICE_Lexicon_v2.1 Section 11 table",
                    })
            continue

        # Language-specific note lines: "**Norwegian:** term1 (T2, note) · term2 · ..."
        lang_note_match = re.match(r"^\*\*([A-Za-z]+):\*\*\s+(.+)$", line)
        if lang_note_match:
            lang_name = lang_note_match.group(1)
            lang_code = _LANG_NOTE_MAP.get(lang_name)
            if not lang_code:
                continue
            rest = lang_note_match.group(2)
            # Terms are separated by " · "
            for token in rest.split("·"):
                token = token.strip()
                if not token:
                    continue
                # "Cristoterapia — 'Christ therapy,' Italian Catholic SOGICE rebranding (C2)"
                # "kjønnsideologi (T2, policy debates)"
                # Extract term (before " — " or "(")
                term_part = re.split(r"\s*[—–(]", token)[0].strip()
                if not term_part:
                    continue
                tier_m = _TIER_RE.search(token)
                tier = "tier-1-legal" if (tier_m and tier_m.group(1) == "1") else "tier-2-ngo-academic"
                # Source note: the part in parens
                note_match = re.search(r"\(([^)]+)\)", token)
                source_note = note_match.group(1) if note_match else ""
                # Remove tier info from note
                source_note = _TIER_RE.sub("", source_note).strip().strip(",").strip()
                # Best-guess canonical: try to find a matching English parent
                canonical_id, canonical_term = _guess_canonical(term_part, lang_code)
                variants.append({
                    "canonical_term": canonical_term,
                    "canonical_id": canonical_id,
                    "variant_term": term_part,
                    "language": lang_code,
                    "attestation_tier": tier,
                    "source_note": f"SOGICE_Lexicon_v2.1 Section 11 {lang_name} notes"
                        + (f" — {source_note}" if source_note else ""),
                })

    return variants


def parse_tactics(path: Path | None = None) -> list[dict]:
    """Parse tactic definitions from SOGICE_Ontology_v3.0.md (Part III)
    and supplementary definitions from Claude_Ingestion_Prompt.md.

    Returns list of dicts with: tactic, primary_cluster, secondary_cluster,
    definition, boundaries, source_note.
    """
    _ONTOLOGY_FILE = Path(__file__).parents[2] / "00_infrastructure" / "SOGICE_Ontology_v3.0.md"
    _PROMPT_FILE   = Path(__file__).parents[2] / "02_working_tools" / "Claude_Ingestion_Prompt.md"

    # ── Prompt: tactic vocabulary line (pipe-separated) ──────────────────────
    prompt_raw = (_PROMPT_FILE).read_text(encoding="utf-8") if _PROMPT_FILE.exists() else ""
    tactic_vocab: list[str] = []
    for line in prompt_raw.splitlines():
        if line.startswith("TACTIC") and "|" in line:
            # "TACTIC (one or more ...) \nIdentity-Erasure | Rebranding-SOGICE | ..."
            # Sometimes the list is on the next line
            continue
        if tactic_vocab:
            break
        # The vocabulary list line follows immediately
        if "Identity-Erasure" in line and "|" in line:
            tactic_vocab = [t.strip() for t in line.split("|") if t.strip()]

    # Also parse inline definitions from the prompt (lines "- TacticName: definition")
    prompt_defs: dict[str, str] = {}
    for line in prompt_raw.splitlines():
        m = re.match(r"^- ([A-Za-z][A-Za-z0-9_\-]+):\s+(.+)$", line)
        if m and m.group(1) in tactic_vocab:
            prompt_defs[m.group(1)] = m.group(2).strip()

    # ── Ontology: Part III table + extended entries ───────────────────────────
    ontology_raw = _ONTOLOGY_FILE.read_text(encoding="utf-8") if _ONTOLOGY_FILE.exists() else ""
    cluster_map: dict[str, dict] = {}  # tactic → {primary, secondary}

    in_part3 = False
    for line in ontology_raw.splitlines():
        if "## PART III" in line:
            in_part3 = True
            continue
        if in_part3 and line.startswith("## "):
            in_part3 = False
            continue
        if not in_part3:
            continue
        # Table row: | Tactic | Primary Cluster | Secondary Cluster |
        if line.startswith("|") and "|" in line[1:]:
            cells = [c.strip() for c in line.split("|")[1:-1]]
            if len(cells) >= 2 and cells[0] and cells[0] not in ("Tactic", "---", "---"):
                tname = cells[0].strip()
                pcluster = cells[1].strip() if len(cells) > 1 else ""
                scluster = cells[2].strip() if len(cells) > 2 else ""
                if tname and not tname.startswith("-"):
                    cluster_map[tname] = {
                        "primary": pcluster if pcluster != "—" else "",
                        "secondary": scluster if scluster != "—" else "",
                    }

    # Extended entries with bold headings + bullets
    ontology_defs: dict[str, dict] = {}
    current_tactic: str | None = None
    for line in ontology_raw.splitlines():
        # Match **`TacticName`** bold-backtick headings
        m = re.match(r"^\*\*`([^`]+)`\*\*$", line.strip())
        if m:
            current_tactic = m.group(1).strip()
            ontology_defs[current_tactic] = {}
            continue
        if current_tactic and line.startswith("- "):
            text = line[2:].strip()
            if text.startswith("Primary:"):
                rest = text[len("Primary:"):].strip()
                parts = rest.split("·")
                primary = parts[0].strip()
                secondary = parts[1].strip() if len(parts) > 1 else ""
                # Strip "Secondary: " prefix if present
                secondary = re.sub(r"^Secondary:\s*", "", secondary)
                cluster_map[current_tactic] = {"primary": primary, "secondary": secondary}
            elif text.startswith("Source:") or text.startswith("Key documents:"):
                ontology_defs[current_tactic]["source_note"] = text.split(":", 1)[1].strip()
            elif not any(text.startswith(p) for p in ("Primary:", "Secondary:", "Boundary:")):
                # First non-prefixed bullet = definition
                if "definition" not in ontology_defs[current_tactic]:
                    ontology_defs[current_tactic]["definition"] = text
            elif text.startswith("Boundary:"):
                ontology_defs[current_tactic]["boundaries"] = text[len("Boundary:"):].strip()
        elif current_tactic and not line.strip():
            current_tactic = None

    # Cluster assignments for v3.2/v3.3 tactics not in the ontology table
    _EXTRA_CLUSTERS: dict[str, dict] = {
        "Fitra-Frame":                 {"primary": "Pastoral-Coercion",  "secondary": "SSA-Rhetoric"},
        "Causal-Theory-Frame":         {"primary": "Pseudo-Science",      "secondary": "Pastoral-Coercion"},
        "Platform-Evasion":            {"primary": "Policy-Resistance",   "secondary": "SSA-Rhetoric"},
        "Religious-Freedom-Shield":    {"primary": "Policy-Resistance",   "secondary": ""},
        "Conscience-Carve-Out":        {"primary": "Policy-Resistance",   "secondary": "Pastoral-Coercion"},
        "Child-Safeguarding-Inversion":{"primary": "Anti-Trans/ROGD",     "secondary": "Anti-Gender"},
        "Therapeutic-Autonomy-Frame":  {"primary": "Policy-Resistance",   "secondary": ""},
        "Academic-Credentialing":      {"primary": "Pseudo-Science",      "secondary": "Policy-Resistance"},
        "Interfaith-Coalition-Building":{"primary": "Policy-Resistance",  "secondary": "Anti-Gender"},
        "Network-Laundering":          {"primary": "Policy-Resistance",   "secondary": ""},
        "Ecumenical-Consensus-Claim":  {"primary": "Policy-Resistance",   "secondary": "Anti-Gender"},
        "Soft-Referral-Pipeline":      {"primary": "Pastoral-Coercion",   "secondary": "Policy-Resistance"},
        "Presuppositional-Framing":    {"primary": "Pastoral-Coercion",   "secondary": ""},
    }
    for k, v in _EXTRA_CLUSTERS.items():
        cluster_map.setdefault(k, v)

    # ── Definitions for qualified sub-variants from ontology table ───────────
    _QUALIFIED_DEFS: dict[str, str] = {
        "Rebranding-SOGICE (language)":    "Replacing explicit conversion terminology with euphemistic language in pastoral, clinical, and testimonial registers — SSA, SGA, 'identity exploration,' 'congruence therapy' — to preserve the change goal while evading scrutiny.",
        "Rebranding-SOGICE (legislative)": "Deploying wellness, coaching, and therapeutic-neutrality language specifically in legislative and regulatory contexts to argue SOGICE falls outside ban definitions — 'it's not conversion therapy, it's identity exploration.'",
        "Gender-Essentialism (religious)": "Theological claims that sex is divinely ordained, binary, and immutable — 'male and female he created them,' 'eternal gender,' 'Imago Dei integrity' — deployed to frame gender transition as a spiritual error.",
        "Gender-Essentialism (secular)":   "Secular biological essentialism — 'sex is binary and immutable,' 'you cannot change sex' — deployed by gender-critical and scientific-authority actors to deny trans legitimacy without religious framing.",
    }
    for k, v in _QUALIFIED_DEFS.items():
        prompt_defs.setdefault(k, v)

    # ── Static definitions for the 14 core tactics (from tagger vocabulary) ──
    # These don't have standalone definition paragraphs in the ontology —
    # their meaning is embedded in cluster descriptions. Definitions here are
    # concise one-liners from the tagger vocabulary, sufficient for draft status.
    _STATIC_DEFS: dict[str, str] = {
        "Identity-Erasure":        "Minimizing or denying LGBTQ+ identity — 'labels don't define you,' 'you experience SSA not BE gay' — to keep conversion intact without appearing to attack the person.",
        "Rebranding-SOGICE":       "Replacing explicit conversion therapy language with softer terms (SSA/SGA, congruence therapy, identity exploration, life coaching) to evade bans, platform filters, and public scrutiny.",
        "Gender-Essentialism":     "Rigid biological or theological claims about sex: 'true sex,' 'born male/female,' 'restoring masculinity/femininity' — used to delegitimize trans identity or justify change-oriented practice.",
        "False-Scientific-Authority": "Misusing scientific register — pseudo-diagnostics (ROGD), fringe journals, neuroplasticity claims — to give SOGICE the appearance of evidence-based clinical legitimacy.",
        "Social-Contagion-Myth":   "Claiming LGBTQ+ identities spread like trends, contagion, or peer influence, implying they are not genuine and can be reversed by removing the social influence.",
        "ROGD-Frame":              "Using Rapid Onset Gender Dysphoria theory — and social contagion logic applied specifically to trans identity — to argue trans youth require watchful waiting rather than affirmation.",
        "Detrans-Propaganda":      "Weaponizing detransition stories to restrict gender-affirming care, delegitimize trans identity broadly, or argue that affirmation causes irreversible harm.",
        "Sex-Rejection-Frame":     "Framing gender transition as a rejection of one's 'true' biological sex — positioning trans identity as self-harm or denial of biological reality.",
        "Anti-Trans-Rhetoric":     "Delegitimizing trans identity and attacking gender-affirming care through a range of strategies — from ontological denial to medical opposition to legal restriction.",
        "Policy-Resistance-Frame": "Opposing conversion therapy bans by framing SOGICE as freedom, therapeutic choice, or civil rights — recasting regulation as government overreach or attack on conscience.",
        "Anti-Gender-Narrative":   "Framing LGBTQ+ rights as the ideological takeover of 'natural' gender by a coordinated political movement ('gender ideology'), positioning resistance as defense of biological and social order.",
        "Anti-LGBT-Conspiracy":    "Claims of global plots, institutional indoctrination, and grooming — 'they're coming for our children' — portraying LGBTQ+ existence as organized predation or civilizational threat.",
        "Groomer-Panic":           "Claiming LGBTQ+ people, educators, or institutions groom or harm children — translating Anti-LGBT-Conspiracy into specific behavioral accusations targeting individuals and schools.",
        "Dehumanizing-Language":   "Slurs, descriptions of LGBTQ+ identities as unnatural, degenerate, or evil — the rhetorical floor of Anti-Gender and Anti-Trans discourse.",
    }
    for k, v in _STATIC_DEFS.items():
        prompt_defs.setdefault(k, v)

    # ── Deduplicate: normalise space→hyphen variants ──────────────────────────
    # "Anti-Trans Rhetoric" and "Anti-Trans-Rhetoric" are the same tactic
    def _norm(s: str) -> str:
        return re.sub(r"\s+", "-", s.strip())

    seen_normed: dict[str, str] = {}  # normalised → canonical (hyphenated) name
    for name in tactic_vocab:
        seen_normed[_norm(name)] = name

    # ── Merge: structural tactics → unified dicts ─────────────────────────────
    all_names: list[str] = list(dict.fromkeys(
        tactic_vocab
        + list(cluster_map.keys())
        + list(ontology_defs.keys())
    ))

    entries: list[dict] = []
    emitted: set[str] = set()
    for name in all_names:
        if not name or "|" in name:
            continue
        normed = _norm(name)
        canonical = seen_normed.get(normed, name)
        if canonical in emitted:
            continue
        emitted.add(canonical)

        clusters = cluster_map.get(canonical) or cluster_map.get(name) or {}
        odef = ontology_defs.get(canonical) or ontology_defs.get(name) or {}
        definition = (
            odef.get("definition")
            or prompt_defs.get(canonical)
            or prompt_defs.get(name)
            or ""
        )
        # tacticLevel: campaign for Operation-Gideon; sub-tactic for qualified variants
        is_sub = "(" in canonical and ")" in canonical
        is_campaign = canonical in ("Operation-Gideon",)
        tactic_level = "campaign" if is_campaign else ("sub-tactic" if is_sub else "structural")
        parent_id = None
        if is_sub:
            parent_name = re.sub(r"\s*\([^)]*\)", "", canonical).strip()
            parent_id = f"tactic-{_slugify(parent_name)}"

        entries.append({
            "tactic": canonical,
            "primary_cluster": clusters.get("primary", ""),
            "secondary_cluster": clusters.get("secondary", ""),
            "definition": definition,
            "boundaries": odef.get("boundaries", ""),
            "source_note": odef.get("source_note", ""),
            "tactic_level": tactic_level,
            "parent_tactic_id": parent_id,
        })

    # ── Sub-tactics: context-specific variants not in the ontology table ──────
    _SUB_TACTICS: list[dict] = [
        # Anti-Trans Rhetoric sub-tactics
        {
            "tactic": "Anti-Trans-Rhetoric (identity-denial)",
            "primary_cluster": "Anti-Trans/ROGD",
            "secondary_cluster": "Anti-Gender",
            "definition": "Ontological denial of trans identity — 'there is no such thing as a trans person,' 'you cannot change sex.' Targets the legitimacy of trans existence as such, prior to any clinical question.",
            "boundaries": "Distinct from Anti-Trans-Rhetoric (care-opposition) which targets medical intervention rather than trans identity itself.",
            "tactic_level": "sub-tactic",
            "parent_tactic_id": "tactic-anti-trans-rhetoric",
        },
        {
            "tactic": "Anti-Trans-Rhetoric (care-opposition)",
            "primary_cluster": "Anti-Trans/ROGD",
            "secondary_cluster": "Policy-Resistance",
            "definition": "Opposing gender-affirming medical care — puberty blockers, hormones, surgery — through safety, regret, and detransition arguments. Operates primarily in clinical and regulatory registers.",
            "boundaries": "Distinct from Anti-Trans-Rhetoric (identity-denial) which disputes trans existence; this variant accepts trans people exist but contests their access to care.",
            "tactic_level": "sub-tactic",
            "parent_tactic_id": "tactic-anti-trans-rhetoric",
        },
        # Groomer-Panic sub-tactics
        {
            "tactic": "Groomer-Panic (educator)",
            "primary_cluster": "Anti-Gender",
            "secondary_cluster": "Anti-Trans/ROGD",
            "definition": "Claiming LGBTQ+ educators, curricula, or school programs groom children — targeting institutional and educational contexts. Key vector for school exclusion campaigns and curriculum bans.",
            "boundaries": "Distinct from Groomer-Panic (predator-claim) which makes direct criminal accusations against individuals rather than institutional criticism.",
            "tactic_level": "sub-tactic",
            "parent_tactic_id": "tactic-groomer-panic",
        },
        {
            "tactic": "Groomer-Panic (predator-claim)",
            "primary_cluster": "Anti-Gender",
            "secondary_cluster": "Anti-LGBT-Conspiracy",
            "definition": "Direct accusations that LGBTQ+ individuals are sexual predators targeting children. Moves from institutional critique to individual criminal accusation. Associated with doxxing and harassment campaigns.",
            "boundaries": "More severe than Groomer-Panic (educator) — individual criminal accusation vs. institutional policy criticism.",
            "tactic_level": "sub-tactic",
            "parent_tactic_id": "tactic-groomer-panic",
        },
        # Policy-Resistance-Frame sub-tactics
        {
            "tactic": "Policy-Resistance-Frame (rights-language)",
            "primary_cluster": "Policy-Resistance",
            "secondary_cluster": "",
            "definition": "Invoking European human rights frameworks — ECHR Articles 8 (private life) and 9 (conscience/religion) — to argue conversion therapy bans violate fundamental rights. More legally sophisticated than ban-overreach framing.",
            "boundaries": "Distinct from Policy-Resistance-Frame (ban-overreach) which uses populist 'criminalising prayer' language; this variant operates in legal/constitutional registers before courts and treaty bodies.",
            "tactic_level": "sub-tactic",
            "parent_tactic_id": "tactic-policy-resistance-frame",
        },
        {
            "tactic": "Policy-Resistance-Frame (ban-overreach)",
            "primary_cluster": "Policy-Resistance",
            "secondary_cluster": "Pastoral-Coercion",
            "definition": "Populist framing of conversion therapy bans as criminalising prayer, pastoral conversation, or parental discipline. Targets lay audiences rather than legal bodies. Key phrases: 'criminalising Christianity,' 'banning pastoral support.'",
            "boundaries": "Distinct from Policy-Resistance-Frame (rights-language) which uses technical rights framing; this variant uses pastoral/populist language aimed at congregation-level mobilization.",
            "tactic_level": "sub-tactic",
            "parent_tactic_id": "tactic-policy-resistance-frame",
        },
        # Identity-Erasure sub-tactics
        {
            "tactic": "Identity-Erasure (pastoral)",
            "primary_cluster": "Pastoral-Coercion",
            "secondary_cluster": "SSA-Rhetoric",
            "definition": "Pastoral register erasure: 'labels don't define you,' 'you are more than your attractions,' 'your identity is in Christ.' Separates the person from the identity without appearing confrontational.",
            "boundaries": "Distinct from Identity-Erasure (clinical) which uses pseudo-medical language. Pastoral erasure operates through belonging and spiritual formation rather than diagnosis.",
            "tactic_level": "sub-tactic",
            "parent_tactic_id": "tactic-identity-erasure",
        },
        {
            "tactic": "Identity-Erasure (clinical)",
            "primary_cluster": "Pseudo-Science",
            "secondary_cluster": "SSA-Rhetoric",
            "definition": "Clinical register erasure: 'you experience same-sex attraction, you are not gay,' 'SSA is a symptom not an identity,' 'orientation is fluid.' Uses diagnostic framing to separate the person from their identity.",
            "boundaries": "Distinct from Identity-Erasure (pastoral) which uses spiritual/belonging framing. Clinical erasure uses pseudo-medical language to position identity as a changeable symptom.",
            "tactic_level": "sub-tactic",
            "parent_tactic_id": "tactic-identity-erasure",
        },
    ]
    entries.extend(_SUB_TACTICS)

    return entries


def seed_tactics(
    config: Config,
    dry_run: bool = False,
    force: bool = False,
) -> dict:
    """Parse tactic definitions and write tacticEntry records to Sanity.

    Returns summary dict: {attempted, created, skipped, errors}.
    """
    from ..clients import sanity as sanity_client

    entries = parse_tactics()
    summary = {"attempted": len(entries), "created": 0, "skipped": 0, "errors": []}

    existing_ids: set[str] = set()
    if not force and not dry_run:
        try:
            existing = sanity_client.fetch_tactic_entries(config)
            existing_ids = {e.get("_id", "") for e in existing}
        except Exception:
            existing_ids = set()

    for entry in entries:
        sanity_id = f"tactic-{_slugify(entry['tactic'])}"
        if not force and sanity_id in existing_ids:
            summary["skipped"] += 1
            continue
        if dry_run:
            summary["created"] += 1
            continue
        try:
            sanity_client.write_seed_tactic_entry(entry, config)
            summary["created"] += 1
        except Exception as exc:
            summary["errors"].append(f"{entry['tactic']}: {exc}")

    return summary


def seed_lexicon_variants(
    config: Config,
    dry_run: bool = False,
    path: Path | None = None,
) -> dict:
    """Parse Section 11 variants and append them as multilingualVariants on parent entries.

    Parents that don't yet exist in Sanity are created as minimal stub entries
    so the variant patch has a target document.
    Returns summary dict: {attempted, appended, stub_created, errors}.
    """
    from ..clients import sanity as sanity_client

    variants = parse_multilingual_variants_md(path)
    summary = {"attempted": len(variants), "appended": 0, "stub_created": 0, "errors": []}

    # Collect unique parent IDs that need to exist
    parent_ids_needed: dict[str, str] = {}  # canonical_id → canonical_term
    for v in variants:
        parent_ids_needed[v["canonical_id"]] = v["canonical_term"]

    if not dry_run:
        # Ensure all parent entries exist (create stubs for missing ones)
        try:
            existing = sanity_client.fetch_lexicon_terms(config)
            existing_ids = {e.get("_id", "") for e in existing}
        except Exception:
            existing_ids = set()

        for cid, cterm in parent_ids_needed.items():
            if cid not in existing_ids:
                try:
                    sanity_client.write_seed_lexicon_entry(
                        {
                            "sanity_id": cid,
                            "term": cterm,
                            "language": "en",
                            "proposed_cluster": "Unknown",
                            "function": "Unknown",
                            "definition": "",
                            "recommended_status": "draft",
                        },
                        config,
                    )
                    summary["stub_created"] += 1
                except Exception as exc:
                    summary["errors"].append(f"stub {cterm}: {exc}")

    for v in variants:
        if dry_run:
            summary["appended"] += 1
            continue
        try:
            sanity_client.write_seed_lexicon_variant(v, config)
            summary["appended"] += 1
        except Exception as exc:
            summary["errors"].append(f"{v['variant_term']} ({v['language']}): {exc}")

    return summary


def _guess_canonical(variant_term: str, lang_code: str) -> tuple[str, str]:
    """Best-effort map of a non-English variant back to its English canonical term.

    Falls back to the variant itself slugified (will create a new entry keyed on
    the foreign term — acceptable for isolated terms with no English parent).
    """
    # Known mappings: foreign term patterns → English canonical
    _KNOWN = {
        # Norwegian
        "kjønnsideologi":          ("lexicon-gender-ideology",       "Gender Ideology"),
        "reparativ terapi":        ("lexicon-reparative-therapy",    "Reparative Therapy"),
        "konverteringsterapi":     ("lexicon-congruence-therapy",    "Congruence Therapy"),
        "konverteringspraksis":    ("lexicon-conversion-practices",  "Conversion Practices"),
        "sjelesorg":               ("lexicon-sjelesorg",             "Sjelesorg"),
        "avventende observasjon":  ("lexicon-watch-and-wait-policy", "Watch and Wait Policy"),
        # Italian
        "cristoterapia":           ("lexicon-congruence-therapy",    "Congruence Therapy"),
        "accompagnamento":         ("lexicon-accompagnamento",       "Accompagnamento"),
        "libertà terapeutica":     ("lexicon-libert-terapeutica",    "Libertà-Terapeutica"),
        "disordine interiore":     ("lexicon-disordine-interiore",   "Disordine-Interiore"),
        "ferita antropologica":    ("lexicon-ferita-antropologica",  "Ferita-Antropologica"),
        "terapia consensuale":     ("lexicon-einvernehmliche-therapie", "Einvernehmliche-Therapie"),
        # German
        "beratungsfreiheit":       ("lexicon-beratungsfreiheit",     "Beratungsfreiheit"),
        "einvernehmliche therapie":("lexicon-einvernehmliche-therapie", "Einvernehmliche-Therapie"),
        "konversionstherapieverbot":("lexicon-policy-resistance",    "Policy-Resistance"),
        "konversionsbehandlung":   ("lexicon-congruence-therapy",    "Congruence Therapy"),
        "seelsorge":               ("lexicon-sjelesorg",             "Sjelesorg"),
        # Polish
        "troska duszpasterska":    ("lexicon-troska-duszpasterska",  "Troska-Duszpasterska"),
        "suwerenność rodzicielska":("lexicon-suwerenno-rodzicielska","Suwerenność-Rodzicielska"),
        # Hungarian
        "terápiás szabadság":      ("lexicon-ter-pi-s-szabads-g",   "Terápiás-Szabadság"),
        "lelkipásztori gondozás":  ("lexicon-sjelesorg",             "Sjelesorg"),
        # Romanian
        "patimă":                  ("lexicon-patim",                 "Patimă"),
        "terapie de conversie":    ("lexicon-congruence-therapy",    "Congruence Therapy"),
        # Portuguese
        "terapia do amor":         ("lexicon-congruence-therapy",    "Congruence Therapy"),
    }
    key = variant_term.lower().strip()
    if key in _KNOWN:
        return _KNOWN[key]
    # Fall back to variant's own slug as canonical
    slug = _slugify(variant_term)
    return f"lexicon-{slug}", variant_term


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
