"""
Pydantic models that mirror the ingestion-v3.3 output schema exactly.
AnalysisResult validates Claude's or Ollama's JSON response.
IntakeResult and PreprocessResult carry pipeline state between stages.
"""
from __future__ import annotations
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal, Optional, get_args
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


# ---------------------------------------------------------------------------
# ingestion-v3.3 output schema
# ---------------------------------------------------------------------------

class DocumentDate(BaseModel):
    year: int = 0
    month: int = 0
    day: int = 0
    confidence: Literal["exact", "approximate", "unknown"] = "unknown"


class Priority(BaseModel):
    artistic: int = Field(default=1, ge=1, le=5)
    network: int = Field(default=1, ge=1, le=5)
    lexicon: int = Field(default=1, ge=1, le=5)
    testimony: int = Field(default=1, ge=1, le=5)
    historical: int = Field(default=1, ge=1, le=5)


class ConfidenceSignals(BaseModel):
    text_quality: Literal["clean", "noisy"] = "clean"
    language_clarity: Literal["clear", "mixed", "unclear"] = "clear"
    content_structure: Literal["well-structured", "ambiguous"] = "well-structured"


class Confidence(BaseModel):
    overall_score: float = Field(default=0.0, ge=0.0, le=1.0)
    status: Literal["high", "medium", "low"] = "low"
    reasons: list[str] = Field(default_factory=list)
    signals: ConfidenceSignals = Field(default_factory=ConfidenceSignals)

    @model_validator(mode="after")
    def derive_score_from_status(self) -> "Confidence":
        _defaults = {"high": 0.90, "medium": 0.75, "low": 0.50}
        if self.overall_score == 0.0:
            self.overall_score = _defaults[self.status]
        return self


class LowConfidenceReason(BaseModel):
    field: str
    issue: str
    severity: Literal["low", "medium", "high"] = "low"


class FieldConfidence(BaseModel):
    type: float = Field(default=1.0, ge=0.0, le=1.0)
    format: float = Field(default=1.0, ge=0.0, le=1.0)
    tactic: float = Field(default=1.0, ge=0.0, le=1.0)
    term: float = Field(default=1.0, ge=0.0, le=1.0)
    actor: float = Field(default=1.0, ge=0.0, le=1.0)
    scope: float = Field(default=1.0, ge=0.0, le=1.0)
    low_confidence_reasons: list[LowConfidenceReason] = Field(default_factory=list)


def _to_title_case(s: str) -> str:
    """Title-case preserving existing uppercase (acronyms, proper nouns).
    'unwanted same-sex attraction' → 'Unwanted Same-Sex Attraction'
    'anti-LGBT conspiracy'         → 'Anti-LGBT Conspiracy'
    'Religious-Freedom-Shield'     → 'Religious-Freedom-Shield'
    """
    def _cap_word(word: str) -> str:
        # Preserve words that already contain uppercase (acronyms, proper nouns)
        if any(c.isupper() for c in word):
            return word
        return word.capitalize()

    def _cap_token(token: str) -> str:
        # Handle hyphenated tokens part-by-part so "anti-LGBT" → "Anti-LGBT"
        if "-" in token:
            return "-".join(_cap_word(part) for part in token.split("-"))
        return _cap_word(token)

    return " ".join(_cap_token(t) for t in s.split())


# ---------------------------------------------------------------------------
# DS-3: ISO 639-1 and country normalization tables
# ---------------------------------------------------------------------------

# Maps any recognisable language name/code → canonical ISO 639-1 lowercase code.
# All keys MUST be lowercase (lookup does key.lower() before dict hit).
# Values are ISO 639-1 two-letter codes.
_LANGUAGE_ALIASES: dict[str, str] = {
    # English
    "english": "en", "eng": "en",
    # German
    "german": "de", "deutsch": "de", "deu": "de", "ger": "de",
    # French
    "french": "fr", "français": "fr", "francais": "fr", "fra": "fr", "fre": "fr",
    # Spanish
    "spanish": "es", "español": "es", "espanol": "es", "spa": "es",
    # Portuguese
    "portuguese": "pt", "português": "pt", "portugues": "pt", "por": "pt",
    # Italian
    "italian": "it", "italiano": "it", "ita": "it",
    # Dutch
    "dutch": "nl", "nederlands": "nl", "nld": "nl", "dut": "nl",
    # Polish
    "polish": "pl", "polski": "pl", "pol": "pl",
    # Swedish
    "swedish": "sv", "svenska": "sv", "swe": "sv",
    # Danish
    "danish": "da", "dansk": "da", "dan": "da",
    # Norwegian — nb, nn, and "Norwegian" all normalise to "no"
    "norwegian": "no", "norsk": "no", "nor": "no",
    "norwegian bokmål": "no", "norwegian nynorsk": "no",
    "bokmål": "no", "bokmal": "no", "nynorsk": "no",
    # Finnish
    "finnish": "fi", "suomi": "fi", "fin": "fi",
    # Hungarian
    "hungarian": "hu", "magyar": "hu", "hun": "hu",
    # Czech
    "czech": "cs", "čeština": "cs", "cestina": "cs", "ces": "cs", "cze": "cs",
    # Slovak
    "slovak": "sk", "slovenčina": "sk", "slovencina": "sk", "slk": "sk", "slo": "sk",
    # Romanian
    "romanian": "ro", "română": "ro", "romana": "ro", "ron": "ro", "rum": "ro",
    # Croatian
    "croatian": "hr", "hrvatski": "hr", "hrv": "hr",
    # Serbian
    "serbian": "sr", "srpski": "sr", "srp": "sr",
    # Bulgarian
    "bulgarian": "bg", "bul": "bg",
    # Greek
    "greek": "el", "ell": "el", "gre": "el",
    # Ukrainian
    "ukrainian": "uk", "ukr": "uk",
    # Russian
    "russian": "ru", "rus": "ru",
    # Turkish
    "turkish": "tr", "türkçe": "tr", "turkce": "tr", "tur": "tr",
    # Arabic
    "arabic": "ar", "ara": "ar",
    # Hebrew
    "hebrew": "he", "heb": "he",
    # Latvian
    "latvian": "lv", "latviešu": "lv", "lav": "lv",
    # Lithuanian
    "lithuanian": "lt", "lietuvių": "lt", "lit": "lt",
    # Estonian
    "estonian": "et", "eesti": "et", "est": "et",
    # Slovenian
    "slovenian": "sl", "slovene": "sl", "slovenščina": "sl", "slv": "sl",
    # Albanian
    "albanian": "sq", "shqip": "sq", "alb": "sq", "sqi": "sq",
    # Macedonian
    "macedonian": "mk", "mkd": "mk", "mac": "mk",
    # Welsh
    "welsh": "cy", "cymraeg": "cy", "wel": "cy",
    # Irish
    "irish": "ga", "gaeilge": "ga",
    # Catalan
    "catalan": "ca", "català": "ca", "cat": "ca",
    # Basque
    "basque": "eu", "euskara": "eu", "baq": "eu", "eus": "eu",
}

# Complete set of valid ISO 639-1 two-letter codes (184 codes).
# Used so that codes already in canonical form don't trigger iso-warn.
_VALID_ISO_639_1: frozenset[str] = frozenset({
    "aa", "ab", "ae", "af", "ak", "am", "an", "ar", "as", "av", "ay", "az",
    "ba", "be", "bg", "bh", "bi", "bm", "bn", "bo", "br", "bs",
    "ca", "ce", "ch", "co", "cr", "cs", "cu", "cv", "cy",
    "da", "de", "dv", "dz",
    "ee", "el", "en", "eo", "es", "et", "eu",
    "fa", "ff", "fi", "fj", "fo", "fr", "fy",
    "ga", "gd", "gl", "gn", "gu", "gv",
    "ha", "he", "hi", "ho", "hr", "ht", "hu", "hy",
    "hz",
    "ia", "id", "ie", "ig", "ii", "ik", "io", "is", "it", "iu",
    "ja", "jv",
    "ka", "kg", "ki", "kj", "kk", "kl", "km", "kn", "ko", "kr",
    "ks", "ku", "kv", "kw", "ky",
    "la", "lb", "lg", "li", "ln", "lo", "lt", "lu", "lv",
    "mg", "mh", "mi", "mk", "ml", "mn", "mr", "ms", "mt", "my",
    "na", "nb", "nd", "ne", "ng", "nl", "nn", "no", "nr", "nv", "ny",
    "oc", "oj", "om", "or", "os",
    "pa", "pi", "pl", "ps", "pt",
    "qu",
    "rm", "rn", "ro", "ru", "rw",
    "sa", "sc", "sd", "se", "sg", "si", "sk", "sl", "sm", "sn",
    "so", "sq", "sr", "ss", "st", "su", "sv", "sw",
    "ta", "te", "tg", "th", "ti", "tk", "tl", "tn", "to", "tr",
    "ts", "tt", "tw", "ty",
    "ug", "uk", "ur", "uz",
    "va", "ve", "vi", "vo",
    "wa", "wo",
    "xh",
    "yi", "yo",
    "za", "zh", "zu",
})

# Maps ISO-2 codes and common abbreviations → canonical full country name.
# Used for pipeline-layer normalization (separate from the display alias table
# in app.py, which serves the same purpose for the Streamlit UI).
_COUNTRY_ALIASES_MODEL: dict[str, str] = {
    "UK": "United Kingdom",
    "GB": "United Kingdom",
    "Great Britain": "United Kingdom",
    "England": "United Kingdom",
    "US": "United States",
    "USA": "United States",
    "United States of America": "United States",
    "DE": "Germany",
    "NO": "Norway",
    "SE": "Sweden",
    "FI": "Finland",
    "DK": "Denmark",
    "IS": "Iceland",
    "NL": "Netherlands",
    "The Netherlands": "Netherlands",
    "Holland": "Netherlands",
    "FR": "France",
    "ES": "Spain",
    "IT": "Italy",
    "PL": "Poland",
    "AT": "Austria",
    "CH": "Switzerland",
    "BE": "Belgium",
    "PT": "Portugal",
    "IE": "Ireland",
    "HU": "Hungary",
    "CZ": "Czech Republic",
    "SK": "Slovakia",
    "RO": "Romania",
    "HR": "Croatia",
    "RS": "Serbia",
    "BA": "Bosnia and Herzegovina",
    "GR": "Greece",
    "BG": "Bulgaria",
    "UA": "Ukraine",
    "RU": "Russia",
    "TR": "Turkey",
    "EU": "European Union",
    "CA": "Canada",
    "AU": "Australia",
    "NZ": "New Zealand",
    "ZA": "South Africa",
    "BR": "Brazil",
    "LV": "Latvia",
    "LT": "Lithuania",
    "EE": "Estonia",
    "SI": "Slovenia",
    "LU": "Luxembourg",
    "MT": "Malta",
    "CY": "Cyprus",
    "AL": "Albania",
    "MK": "North Macedonia",
    "ME": "Montenegro",
    "XK": "Kosovo",
    "MD": "Moldova",
    "BY": "Belarus",
}


def language_country_from_locale(locale: str) -> tuple[str, str]:
    """Deterministically derive ``(iso_639_1_language, canonical_country)`` from a
    BCP-47 / OpenGraph locale string such as ``en_US``, ``pt-BR`` or ``en``.

    Returns ``("", "")`` for empty / unrecognised input. The language is mapped
    via the same alias tables used for analysis normalisation; the country is the
    region subtag mapped through ``_COUNTRY_ALIASES_MODEL`` (so ``US`` →
    ``United States``). A region subtag that isn't in the table yields no country
    rather than a guess. Pure — no network, no model.
    """
    if not locale or not isinstance(locale, str):
        return "", ""
    parts = re.split(r"[_\-]", locale.strip())
    lang_raw = parts[0].strip().lower() if parts else ""
    region_raw = parts[1].strip().upper() if len(parts) > 1 else ""

    language = ""
    if lang_raw in _LANGUAGE_ALIASES:
        language = _LANGUAGE_ALIASES[lang_raw]
    elif lang_raw in _VALID_ISO_639_1:
        language = lang_raw

    country = _COUNTRY_ALIASES_MODEL.get(region_raw, "") if region_raw else ""
    return language, country


class CandidateTerm(BaseModel):
    term: str
    language: str = "unknown"
    proposed_category: str = ""
    promotional_use: bool = True
    draft_definition: str = ""
    context_quote: str = ""

    @field_validator("term", mode="before")
    @classmethod
    def title_case_term(cls, v: str) -> str:
        return _to_title_case(v.strip()) if isinstance(v, str) else v


class TermUseContext(BaseModel):
    """Records a lexicon term that appears in the document non-promotionally."""
    term: str
    use: Literal["promotional", "definitional", "critical", "reported"] = "reported"
    quote: str = ""


class LegalStatus(BaseModel):
    jurisdiction: str = ""
    status: Literal["banned", "regulated", "contested", "permitted", "unknown"] = "unknown"
    instrument: Optional[str] = None


class SuggestedActor(BaseModel):
    name: str
    type: Literal["person", "organization"] = "organization"
    country: str = ""
    role: str = ""
    evidence_quote: str = ""


class SuggestedNetwork(BaseModel):
    name: str
    description: str = ""
    evidence_quote: str = ""


class ExtractableAsset(BaseModel):
    asset_type: Literal[
        "prayer_script", "testimony_excerpt", "conversion_script",
        "course_structure", "statistical_claim", "network_connection",
        "terminology_coinage", "visual_asset", "legislative_quote", "counter_sermon",
    ] = "statistical_claim"
    content: str = ""
    target_module: str = ""
    extracted_by: str = "llm_primary"


DocumentType = Literal[
    "Pro-SOGICE", "Anti-SOGICE", "Neutral-Academic", "Legal-Instrument",
    "Testimony", "Media-Coverage", "Internal-Org-Document", "Mixed",
    "Training-Certification-Material", "Liturgical-Devotional-Material",
    "Clinical-Therapeutic-Protocol", "Survivor-Network-Material",
    "Regulatory-Policy-Document",
]

DocumentFormat = Literal[
    "Website-Page", "Blog-Post", "Social-Media-Post", "Video", "Podcast",
    "News-Article", "Academic-Paper", "NGO-Report", "Government-Report",
    "Court-Judgment", "Legislative-Submission", "Parliamentary-Debate",
    "Press-Release", "Book", "Book-Chapter", "Pamphlet", "Newsletter",
    "Email", "Manual", "Course-Material", "Event-Program", "Other",
]

NarrativeRegister = Literal[
    "Pastoral-Healing", "Scientific-Clinical", "Legal-Policy", "Testimonial-Personal",
    "Conspiratorial", "Activist-Advocacy", "Journalistic", "Academic-Analytical", "Mixed",
]

Scope = Literal["Core", "Contextual", "Reference"]

RhetoricalIntensity = Literal["hook", "pathologizing", "active-conduct"]

FramingBalance = Literal["pro-dominant", "anti-dominant", "genuinely-mixed", "unclear"]

_DOCUMENT_TYPES = frozenset(get_args(DocumentType))
_DOCUMENT_FORMATS = frozenset(get_args(DocumentFormat))
_NARRATIVE_REGISTERS = frozenset(get_args(NarrativeRegister))

_DOCUMENT_TYPE_ALIASES = {
    "unclassified": "Mixed",
    "unknown": "Mixed",
    "unclear": "Mixed",
    "not_applicable": "Mixed",
    "not-applicable": "Mixed",
    "n/a": "Mixed",
}

_DOCUMENT_FORMAT_ALIASES = {
    "unknown": "Other",
    "unclassified": "Other",
    "unclear": "Other",
    "article": "Other",
    "webpage": "Website-Page",
    "web-page": "Website-Page",
    "web page": "Website-Page",
}

_NARRATIVE_REGISTER_ALIASES = {
    "unclassified": "Mixed",
    "unknown": "Mixed",
    "unclear": "Mixed",
    "not_applicable": "Mixed",
    "not-applicable": "Mixed",
    "n/a": "Mixed",
}


class AnalysisResult(BaseModel):
    """Exact mirror of the ingestion-v3.3 JSON output schema."""
    model_config = ConfigDict(extra="ignore")

    type: DocumentType
    primary_type: Optional[DocumentType] = None
    secondary_type: Optional[DocumentType] = None
    format: DocumentFormat
    evidence: list[str]
    scope: Scope

    @model_validator(mode="before")
    @classmethod
    def normalise_llm_output(cls, data: dict) -> dict:
        """Normalise quirks from local models before Pydantic field mapping.

        Local models (qwen3.5:9b etc.) diverge from the schema in several ways:
        1. Uppercase keys with spaces: "NARRATIVE REGISTER" → "narrative_register"
        2. Alternative field names: "research_summary" → "summary" etc.
        3. Single-element lists for scalar fields: ["Anti-SOGICE"] → "Anti-SOGICE"
        """
        if not isinstance(data, dict):
            return data

        data = dict(data)
        warnings = list(data.get("normalisation_warnings") or [])

        # 1. Lowercase all top-level keys and replace spaces with underscores
        #    "NARRATIVE REGISTER" → "narrative_register", "TYPE" → "type"
        normalised_data = {}
        for key, value in data.items():
            normalised_key = key.lower().replace(" ", "_")
            if normalised_key != key:
                warnings.append(f"Normalised top-level key '{key}' to '{normalised_key}'.")
            normalised_data[normalised_key] = value
        data = normalised_data

        # 2. Remap alternative field names the model commonly uses
        _key_aliases = {
            "research_summary": "summary",
            "landmark_events": "landmark",
            "priority_score": "priority",
            "confidence_model": "confidence",
            "confidence_scores": "confidence",
        }
        for old, new in _key_aliases.items():
            if old in data and new not in data:
                data[new] = data.pop(old)
                warnings.append(f"Mapped model field '{old}' to schema field '{new}'.")

        # 2b. Some models put document format values in secondary_type.
        #     Keep type fields inside DocumentType and preserve the format label.
        secondary = data.get("secondary_type")
        if isinstance(secondary, str) and secondary in _DOCUMENT_FORMATS and secondary not in _DOCUMENT_TYPES:
            if not data.get("format") or data.get("format") == "Other":
                data["format"] = secondary
                warnings.append(f"Moved format-like secondary_type '{secondary}' into format.")
            data["secondary_type"] = data.get("primary_type") or data.get("type")
            warnings.append(f"Replaced invalid secondary_type '{secondary}' with primary/type value.")

        # 3. Remap nested confidence fields:
        #    .overall / .overall_score  → confidence.overall_score
        #    .field_scores / .field-level → field_confidence (top-level)
        #    .reasons scalar → list
        conf = data.get("confidence")
        if isinstance(conf, dict):
            if "overall" in conf and "overall_score" not in conf:
                conf["overall_score"] = conf.pop("overall")
                warnings.append("Mapped confidence.overall to confidence.overall_score.")
            for _fs_key in ("field_scores", "field-level", "field_level", "field_level_scores"):
                if _fs_key in conf and "field_confidence" not in data:
                    data["field_confidence"] = conf.pop(_fs_key)
                    warnings.append(
                        f"Moved confidence.{_fs_key} to top-level field_confidence."
                    )
                    break
            # reasons: null or scalar string → list
            reasons = conf.get("reasons")
            if reasons is None:
                conf["reasons"] = []
            elif isinstance(reasons, str):
                conf["reasons"] = [reasons] if reasons else []
                warnings.append("Wrapped confidence.reasons scalar into list.")

        # 4. Unwrap single-element lists for Literal scalar fields
        for key in (
            "type", "primary_type", "secondary_type", "format", "scope",
            "narrative_register", "rhetorical_intensity", "framing_balance",
        ):
            val = data.get(key)
            if isinstance(val, list) and len(val) == 1:
                data[key] = val[0]
                warnings.append(f"Unwrapped single-item list for scalar field '{key}'.")

        # 4b. Repair common placeholder labels from local models. Blocked/empty
        #     pages often produce "Unclassified"/"Unknown"; keep the record
        #     reviewable instead of failing the whole batch.
        for key in ("type", "primary_type", "secondary_type"):
            val = data.get(key)
            if isinstance(val, str) and val not in _DOCUMENT_TYPES:
                alias = _DOCUMENT_TYPE_ALIASES.get(val.strip().lower())
                if alias:
                    data[key] = alias
                    warnings.append(
                        f"Mapped invalid document type '{val}' in '{key}' to '{alias}' for review."
                    )
        val = data.get("format")
        if isinstance(val, str) and val not in _DOCUMENT_FORMATS:
            alias = _DOCUMENT_FORMAT_ALIASES.get(val.strip().lower())
            if alias:
                data["format"] = alias
                warnings.append(f"Mapped invalid format '{val}' to '{alias}' for review.")
        val = data.get("narrative_register")
        if isinstance(val, str) and val not in _NARRATIVE_REGISTERS:
            alias = _NARRATIVE_REGISTER_ALIASES.get(val.strip().lower())
            if alias:
                data["narrative_register"] = alias
                warnings.append(
                    f"Mapped invalid narrative_register '{val}' to '{alias}' for review."
                )

        # 5. Coerce list[str] fields: null→[], scalar string→[value].
        for key in (
            "languages", "country", "tactic", "actor", "network", "practice", "term",
            "harm", "migration", "function", "landmark", "flags", "evidence",
        ):
            if key not in data:
                continue
            val = data.get(key)
            if val is None:
                data[key] = []
                warnings.append(f"Replaced null with [] for list field '{key}'.")
            elif isinstance(val, str):
                data[key] = [val] if val else []
                warnings.append(f"Wrapped scalar string into list for field '{key}'.")

        # 6. Coerce list-of-objects fields where model returns list-of-strings
        #    candidate_terms: ["term a", "term b"] → [{"term": "term a"}, ...]
        #    suggested_actors / suggested_networks: same pattern
        for key, term_key in (
            ("candidate_terms", "term"),
            ("suggested_actors", "name"),
            ("suggested_networks", "name"),
        ):
            val = data.get(key)
            if isinstance(val, list):
                coerced = []
                changed = False
                for item in val:
                    if isinstance(item, str):
                        coerced.append({term_key: item})
                        changed = True
                    else:
                        coerced.append(item)
                if changed:
                    data[key] = coerced
                    warnings.append(f"Coerced string items in '{key}' to {{{term_key}: ...}} dicts.")

        # 7. term_use_context requires objects, but models often return a list
        #    of term strings. Preserve those as reported term mentions.
        tuc = data.get("term_use_context")
        if isinstance(tuc, list):
            coerced_tuc = []
            changed = False
            for item in tuc:
                if isinstance(item, str):
                    coerced_tuc.append({"term": item, "use": "reported", "quote": ""})
                    changed = True
                else:
                    coerced_tuc.append(item)
            if changed:
                data["term_use_context"] = coerced_tuc
                warnings.append("Coerced string items in 'term_use_context' to term context dicts.")

        data["normalisation_warnings"] = warnings

        return data

    languages: list[str] = Field(default_factory=list)
    country: list[str] = Field(default_factory=list)
    tactic: list[str] = Field(default_factory=list)
    actor: list[str] = Field(default_factory=list)
    network: list[str] = Field(default_factory=list)
    practice: list[str] = Field(default_factory=list)
    term: list[str] = Field(default_factory=list)
    harm: list[str] = Field(default_factory=list)
    migration: list[str] = Field(default_factory=list)
    function: list[str] = Field(default_factory=list)
    landmark: list[str] = Field(default_factory=list)
    flags: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def normalise_vocab_codes(self) -> "AnalysisResult":
        """Normalize languages → ISO 639-1 codes; country → canonical full names.

        Language lookup order (all key comparisons use key.lower()):
          1. key.lower() in _LANGUAGE_ALIASES → use mapped code          (no warning)
          2. key.lower() in _VALID_ISO_639_1  → already canonical code   (no warning)
          3. otherwise                         → pass through, emit iso-warn

        This ensures that already-normalized output (e.g. from analysis.json)
        re-validates identically without accumulating warnings — idempotent.

        Country: exact-match against _COUNTRY_ALIASES_MODEL; unknown values
        pass through silently (the set of valid countries is open-ended).
        """
        normalized_langs: list[str] = []
        for lang in self.languages:
            key = lang.strip()
            key_lower = key.lower()
            if key_lower in _LANGUAGE_ALIASES:
                normalized_langs.append(_LANGUAGE_ALIASES[key_lower])
            elif key_lower in _VALID_ISO_639_1:
                # Already a valid code — normalise case to lowercase ("EN" → "en")
                normalized_langs.append(key_lower)
            else:
                normalized_langs.append(key)
                self.normalisation_warnings = list(self.normalisation_warnings) + [
                    f"iso-warn: 'languages' value '{key}' not in ISO 639-1 alias table — kept as-is"
                ]
        self.languages = normalized_langs

        self.country = [
            _COUNTRY_ALIASES_MODEL.get(c.strip(), c.strip())
            for c in self.country
            if isinstance(c, str)
        ]
        return self

    @model_validator(mode="after")
    def warn_unknown_vocab(self) -> "AnalysisResult":
        """Append warnings for values that don't match expected vocab prefixes.
        Does not reject — ingestion must not break on evolving or extended terms.
        """
        _PREFIX_RULES: dict[str, str] = {
            "practice":  "Practice:",
            "harm":      "Harm:",
            "migration": "Migration:",
            "function":  "Function:",
            "flags":     "Flag:",
            "tactic":    "Tactic:",
            "landmark":  "Event:",
        }
        extra: list[str] = []
        for field_name, prefix in _PREFIX_RULES.items():
            values: list[str] = getattr(self, field_name, [])
            bad = [v for v in values if v and not v.startswith(prefix)]
            if bad:
                extra.append(
                    f"vocab-warn: '{field_name}' contains values without expected "
                    f"'{prefix}' prefix: {bad}"
                )
        if extra:
            self.normalisation_warnings = list(self.normalisation_warnings) + extra
        return self

    @model_validator(mode="after")
    def warn_term_in_non_promotional_doc(self) -> "AnalysisResult":
        """Warn when term[] is populated for non-promotional document types.

        Per ABSOLUTE RULE 1: term[] is only for promotional use of SOGICE terminology.
        Anti-SOGICE, Neutral-Academic, and Media-Coverage documents almost never
        promote SOGICE terms, so populated term[] is likely an annotation error.
        """
        _NON_PROMOTIONAL_TYPES = {"Anti-SOGICE", "Neutral-Academic", "Media-Coverage"}
        if self.type in _NON_PROMOTIONAL_TYPES and self.term:
            self.normalisation_warnings = list(self.normalisation_warnings) + [
                f"vocab-warn: 'term' is populated ({self.term}) for type '{self.type}' "
                "which is a non-promotional document type. Per ABSOLUTE RULE 1, term[] "
                "is only for promotional use of SOGICE terminology. Verify this is intentional."
            ]
        return self

    @model_validator(mode="after")
    def warn_term_use_context_cross_check(self) -> "AnalysisResult":
        """Warn when term_use_context contains non-promotional uses that contradict term[].

        If a term appears in term[] (implying promotional use) but also appears in
        term_use_context with use != 'promotional', the two fields are in contradiction.
        """
        if not self.term or not self.term_use_context:
            return self
        term_set = {t.lower() for t in self.term}
        contradictions = [
            tuc.term for tuc in self.term_use_context
            if tuc.term.lower() in term_set and tuc.use != "promotional"
        ]
        if contradictions:
            self.normalisation_warnings = list(self.normalisation_warnings) + [
                f"vocab-warn: terms {contradictions} appear in both term[] and "
                f"term_use_context with non-promotional use. Resolve the contradiction."
            ]
        return self

    @model_validator(mode="after")
    def enforce_needs_review_on_low_confidence(self) -> "AnalysisResult":
        """Deterministically set needs_review = True when confidence score is below 0.70.

        This is a pipeline rule, not a suggestion — it cannot be overridden by the LLM.
        """
        if self.confidence.overall_score < 0.70 and not self.needs_review:
            self.needs_review = True
            self.normalisation_warnings = list(self.normalisation_warnings) + [
                f"needs_review forced True: overall_score={self.confidence.overall_score:.3f} < 0.70"
            ]
        return self

    @model_validator(mode="after")
    def reconcile_testimony_flag(self) -> "AnalysisResult":
        """Keep ``flags`` and ``testimony_flag`` from disagreeing — fail-safe.

        If a testimony-extraction flag is present but ``testimony_flag`` is False,
        raise the boolean to True (never silently drop the flag). Erring toward
        review protects against hiding a real testimony signal; the researcher can
        clear it at the review gate.
        """
        _TESTIMONY_FLAG = "flag: testimony-extraction-required"
        has_testimony_flag = any(
            isinstance(f, str) and f.strip().lower() == _TESTIMONY_FLAG
            for f in self.flags
        )
        if has_testimony_flag and not self.testimony_flag:
            self.testimony_flag = True
            self.normalisation_warnings = list(self.normalisation_warnings) + [
                "testimony_flag forced True: 'Flag: Testimony-Extraction-Required' "
                "present in flags but testimony_flag was False (fail-safe — flag preserved)"
            ]
        return self
    narrative_register: NarrativeRegister
    document_date: DocumentDate = Field(default_factory=DocumentDate)
    summary: str
    priority: Priority = Field(default_factory=Priority)
    testimony_flag: bool = False
    needs_review: bool = False
    rhetorical_intensity: Optional[RhetoricalIntensity] = None
    framing_balance: Optional[FramingBalance] = None
    legal_status: Optional[LegalStatus] = None
    confidence: Confidence = Field(default_factory=Confidence)
    field_confidence: FieldConfidence = Field(default_factory=FieldConfidence)
    term_use_context: list[TermUseContext] = Field(default_factory=list)
    candidate_terms: list[CandidateTerm] = Field(default_factory=list)
    suggested_actors: list[SuggestedActor] = Field(default_factory=list)
    suggested_networks: list[SuggestedNetwork] = Field(default_factory=list)
    extractable_assets: list[ExtractableAsset] = Field(default_factory=list)
    normalisation_warnings: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Pipeline state models (passed between pipeline stages)
# ---------------------------------------------------------------------------

@dataclass
class PageIntelligence:
    """Rich web-page intelligence extracted at preprocessing time.
    All fields are optional — populated only when the source is a URL."""

    # Canonical / deduplication
    canonical_url: str = ""

    # Open Graph / social card metadata (often richer than page content)
    og_title: str = ""
    og_description: str = ""
    og_image: str = ""
    og_type: str = ""                       # article | website | video | ...
    og_locale: str = ""                     # e.g. en_US, pt_BR
    html_lang: str = ""                     # <html lang="..."> fallback, e.g. en, pt-BR

    # CMS taxonomy
    tags: list[str] = field(default_factory=list)
    categories: list[str] = field(default_factory=list)
    keywords: list[str] = field(default_factory=list)

    # Publication metadata from HTML / Schema.org / meta tags
    date_published: str = ""
    date_modified: str = ""
    publisher: str = ""

    # Author enrichment
    author_url: str = ""                    # link to author profile page

    # Social media profiles found on the page (header/footer/share buttons)
    social_profiles: list[dict] = field(default_factory=list)
    # [{platform: "twitter", url: "https://twitter.com/CConcern", handle: "CConcern"}]

    # Document/file links — future ingestion queue
    document_links: list[dict] = field(default_factory=list)
    # [{url, file_type: "pdf"|"docx"|"pptx"..., anchor_text, domain}]

    # Embedded media — future ingestion queue
    media_embeds: list[dict] = field(default_factory=list)
    # [{platform: "youtube"|"vimeo"|"rumble", id, url, title?}]

    # Contact / org identity signals
    emails: list[str] = field(default_factory=list)

    # JSON-LD structured data (Schema.org) — raw parsed objects
    json_ld: list[dict] = field(default_factory=list)

    # Internal links (same domain) — topical signature of the organisation
    internal_links: list[dict] = field(default_factory=list)
    # [{url, anchor_text}] — top 30

    # Outbound links (external domains)
    outbound_links: list[dict] = field(default_factory=list)
    # [{url, anchor_text, domain}] — top 80


@dataclass
class IntakeResult:
    doc_id: str
    source: str                            # original URL or file path string
    source_type: Literal["url", "pdf", "html", "video", "audio", "epub", "srt"]
    declared_type: str                     # user-supplied or auto-detected document type
    tier: int                              # 1 | 2 | 3
    batch_id: str
    language: Optional[str]               # ISO 639-1, None if unknown at intake
    archive_url: Optional[str] = None     # Wayback Machine URL once archived
    wayback_status: str = ""              # existing | saved | unavailable | failed | skipped
    wayback_checked_at: str = ""
    wayback_error: str = ""
    ingested_at: str = ""                 # stable first-ingest timestamp
    source_url: str = ""                  # provenance URL for local files, if known
    original_filename: str = ""           # original local file name before doc_id storage
    local_copy_path: str = ""             # corpus copy of local file, preserving original name
    source_html_sha256: str = ""          # hash of captured source.html for URL ingests
    testimony_consent: Literal["", "unclear", "pending", "confirmed", "refused", "withdrawn"] = ""
    local_dir: Optional[Path] = None      # ~/survivingsogice/corpus/{doc_id}/


@dataclass
class PreprocessResult:
    doc_id: str
    tool_used: str                         # "docling" | "unstructured" | "trafilatura" | "whisper" | "manual"
    quality: Literal["high", "medium", "low", "blocked"]
    text: str                              # clean extracted text (primary context for LLM)
    markdown: Optional[str] = None        # structure-preserving markdown (Docling output)
    ocr_images: list[dict] = field(default_factory=list)
    char_count: int = 0
    truncated: bool = False
    language_detected: Optional[str] = None
    # Rich provenance metadata (populated by trafilatura / docling)
    title: str = ""
    author: str = ""
    date_published: str = ""
    sitename: str = ""                     # publisher / organisation name as found on the page
    description: str = ""                  # meta description or lede
    hostname: str = ""                     # bare domain, e.g. christianconcern.com
    outbound_links: list[dict] = field(default_factory=list)   # [{url, anchor_text, domain}]
    page_intel: Optional["PageIntelligence"] = None
    # URL/HTML acquisition provenance (fetch tool, http status/headers,
    # challenge classification) — populated by the acquisition layer.
    acquisition: dict = field(default_factory=dict)
    source_html_path: str = ""
    source_html_sha256: str = ""
    media_metadata: dict = field(default_factory=dict)
    transcript_chunks: list[dict] = field(default_factory=list)
    transcript_versions: list[dict] = field(default_factory=list)
    transcript_comparison: dict = field(default_factory=dict)
    media_comments: list[dict] = field(default_factory=list)
    duplicate_candidates: list[dict] = field(default_factory=list)
    discovery_seed_queue: list[dict] = field(default_factory=list)
    # Researcher-declared intake context — passed to the analysis prompt as
    # non-authoritative hints so the model can weight its classification accordingly.
    intake_declared_type: Optional[str] = None   # declared_type from IntakeResult
    intake_batch_id: Optional[str] = None        # batch_id from IntakeResult
    intake_source_url: Optional[str] = None      # source_url (canonical URL) from IntakeResult


@dataclass
class DocumentPackage:
    """Everything assembled after all pipeline stages complete."""
    intake: IntakeResult
    preprocess: PreprocessResult
    analysis: AnalysisResult
    embedding: list[float]
    embedding_model: str
    llm_used: str                          # "claude" | "gemma4:e4b" | "both"
    local_dir: Path
