"""
Pydantic models that mirror the ingestion-v3.3 output schema exactly.
AnalysisResult validates Claude's or Ollama's JSON response.
IntakeResult and PreprocessResult carry pipeline state between stages.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator


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


class CandidateTerm(BaseModel):
    term: str
    language: str = "unknown"
    proposed_category: str = ""
    promotional_use: bool = True
    draft_definition: str = ""
    context_quote: str = ""


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
    "Academic-Paper", "NGO-Report", "Government-Report", "Court-Judgment",
    "Legislative-Submission", "Parliamentary-Debate", "Press-Release",
    "Book", "Book-Chapter", "Pamphlet", "Newsletter", "Email",
    "Manual", "Course-Material", "Event-Program", "Other",
]

NarrativeRegister = Literal[
    "Pastoral-Healing", "Scientific-Clinical", "Legal-Policy", "Testimonial-Personal",
    "Conspiratorial", "Activist-Advocacy", "Journalistic", "Academic-Analytical", "Mixed",
]

Scope = Literal["Core", "Contextual", "Reference"]

RhetoricalIntensity = Literal["hook", "pathologizing", "active-conduct"]

FramingBalance = Literal["pro-dominant", "anti-dominant", "genuinely-mixed", "unclear"]


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

        # 3. Remap nested confidence fields:
        #    .overall / .overall_score  → confidence.overall_score
        #    .field_scores / .field-level → field_confidence (top-level)
        conf = data.get("confidence")
        if isinstance(conf, dict):
            if "overall" in conf and "overall_score" not in conf:
                conf["overall_score"] = conf.pop("overall")
                warnings.append("Mapped confidence.overall to confidence.overall_score.")
            for _fs_key in ("field_scores", "field-level", "field_level"):
                if _fs_key in conf and "field_confidence" not in data:
                    data["field_confidence"] = conf.pop(_fs_key)
                    warnings.append(
                        f"Moved confidence.{_fs_key} to top-level field_confidence."
                    )
                    break

        # 4. Unwrap single-element lists for Literal scalar fields
        for key in (
            "type", "primary_type", "secondary_type", "format", "scope",
            "narrative_register", "rhetorical_intensity", "framing_balance",
        ):
            val = data.get(key)
            if isinstance(val, list) and len(val) == 1:
                data[key] = val[0]
                warnings.append(f"Unwrapped single-item list for scalar field '{key}'.")

        # 5. Wrap scalar strings into lists for list[str] fields
        #    e.g. "country": "UK" → "country": ["UK"]
        for key in (
            "country", "tactic", "actor", "network", "practice", "term",
            "harm", "migration", "function", "landmark", "flags", "evidence",
        ):
            val = data.get(key)
            if isinstance(val, str):
                data[key] = [val] if val else []
                warnings.append(f"Wrapped scalar string into list for field '{key}'.")

        data["normalisation_warnings"] = warnings

        return data

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

    # CMS taxonomy
    tags: list[str] = field(default_factory=list)
    categories: list[str] = field(default_factory=list)
    keywords: list[str] = field(default_factory=list)

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
    source_url: str = ""                  # provenance URL for local files, if known
    original_filename: str = ""           # original local file name before doc_id storage
    local_copy_path: str = ""             # corpus copy of local file, preserving original name
    source_html_sha256: str = ""          # hash of captured source.html for URL ingests
    testimony_consent: str = ""           # confirmed | pending | refused for testimony-flagged docs
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
    source_html_path: str = ""
    source_html_sha256: str = ""


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
