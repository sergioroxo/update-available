"""Models and constants for profile-based research annotations.

Research annotations are optional analytical passes over already-ingested
sogiceDocument records. The envelope is intentionally strict, while result_json
stays flexible so profile schemas can evolve during early research use.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


ResearchProfile = Literal[
    "archive_core",
    "visual_network",
    "search_discovery",
    "shame_article",
    "documentary_analysis",
    "podcast_analysis",
    "testimony_analysis",
    "anti_gender_network",
    "public_website_table",
]

AnnotationProfile = Literal[
    "visual_network",
    "search_discovery",
    "shame_article",
    "documentary_analysis",
    "podcast_analysis",
    "testimony_analysis",
    "anti_gender_network",
    "public_website_table",
]

SourceStance = Literal[
    "pro_sogice",
    "anti_sogice",
    "media_coverage",
    "mixed",
    "ambiguous",
]

AnnotationStatus = Literal[
    "model_generated",
    "researcher_reviewed",
    "corrected",
    "rejected",
]

PublicVisibility = Literal[
    "private",
    "internal_research",
    "public_metadata_only",
    "public_table_candidate",
    "published",
]

ProfileStatusValue = Literal[
    "candidate",
    "active",
    "excluded",
    "reviewed",
    "published",
]

PROFILE_VERSION = "research-profiles-v1.0"
SCHEMA_VERSION = "research-annotation-v1.0"

RESEARCH_PROFILES: tuple[str, ...] = (
    "archive_core",
    "visual_network",
    "search_discovery",
    "shame_article",
    "documentary_analysis",
    "podcast_analysis",
    "testimony_analysis",
    "anti_gender_network",
    "public_website_table",
)

ANNOTATION_PROFILES: tuple[str, ...] = tuple(
    p for p in RESEARCH_PROFILES if p != "archive_core"
)

REVIEWED_STATUSES = {"researcher_reviewed", "corrected"}


class ProfileStatus(BaseModel):
    profile: ResearchProfile
    active: bool = True
    status: ProfileStatusValue = "active"
    reason: str = ""
    reviewer_note: str = Field(default="", alias="reviewerNote")

    model_config = ConfigDict(populate_by_name=True)


class ResearchAnnotation(BaseModel):
    doc_id: str
    profile: AnnotationProfile
    profile_version: str = Field(default=PROFILE_VERSION, alias="profileVersion")
    annotation_status: AnnotationStatus = Field(
        default="model_generated", alias="annotationStatus"
    )
    model_provider: str = Field(default="", alias="modelProvider")
    model_name: str = Field(default="", alias="modelName")
    resolved_model_name: str = Field(default="", alias="resolvedModelName")
    prompt_version: str = Field(default="", alias="promptVersion")
    schema_version: str = Field(default=SCHEMA_VERSION, alias="schemaVersion")
    input_text_hash: str = Field(alias="inputTextHash")
    input_analysis_hash: str = Field(default="", alias="inputAnalysisHash")
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), alias="generatedAt"
    )
    reviewed_at: datetime | None = Field(default=None, alias="reviewedAt")
    reviewer_notes: str = Field(default="", alias="reviewerNotes")
    source_stance: SourceStance = Field(alias="sourceStance")
    result_json: dict = Field(default_factory=dict, alias="resultJson")
    public_visibility: PublicVisibility = Field(
        default="private", alias="publicVisibility"
    )

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("doc_id")
    @classmethod
    def doc_id_is_not_sanity_prefixed(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("doc_id is required")
        return value

    @field_validator("model_provider", "model_name", "prompt_version")
    @classmethod
    def required_metadata(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("model metadata and prompt_version are required")
        return value

    @field_validator("input_text_hash")
    @classmethod
    def validate_sha256(cls, value: str) -> str:
        value = value.strip()
        if len(value) != 64 or any(c not in "0123456789abcdef" for c in value):
            raise ValueError("input_text_hash must be a lowercase SHA-256 hex digest")
        return value

    @model_validator(mode="after")
    def result_stance_matches_envelope(self) -> "ResearchAnnotation":
        embedded = self.result_json.get("sourceStance")
        if embedded and embedded != self.source_stance:
            raise ValueError("resultJson.sourceStance must match sourceStance")
        if "sourceStance" not in self.result_json:
            self.result_json["sourceStance"] = self.source_stance
        return self


def validate_profile(profile: str) -> ResearchProfile:
    if profile not in RESEARCH_PROFILES:
        raise ValueError(
            f"Unknown research profile {profile!r}. Expected one of: "
            + ", ".join(RESEARCH_PROFILES)
        )
    return profile  # type: ignore[return-value]


def validate_annotation_profile(profile: str) -> AnnotationProfile:
    validate_profile(profile)
    if profile == "archive_core":
        raise ValueError("archive_core is metadata-only and has no LLM annotation pass")
    return profile  # type: ignore[return-value]
