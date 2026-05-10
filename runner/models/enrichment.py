"""
Enrichment models — Stage 3c output schema.

The enrichment pass runs after the main analysis (Stage 3b) using a focused
extraction prompt on the lexicon-llm model. It produces proposals for:
  - New or updated lexicon entries (terms, variants, definitions, evidence)
  - New or updated entity registry records (organizations, persons)
  - Documents queued for ingestion (linked PDFs, cited URLs)
  - Cross-corpus connections to already-ingested documents
  - Practice descriptions with harm stance
  - Statistical claims for fact-checking

All proposals are stored locally as enrichment.json and shown at Checkpoint 3.5.
The researcher approves/rejects each one; approved items are written to Sanity.

Sanity targets:
  lexicon_proposals    → lexiconEntry (create or patch evidenceDossier,
                         multilingualVariants, relatedTerms, draftDefinition)
  entity_proposals     → organization / person (create or patch)
  tactic_proposals     → tacticEntry (create or patch)
  ingestion_queue      → feeds the next ingest batch
  corpus_connections   → referencedUrls on the sogiceDocument record
  practice_descriptions → practiceEntry + extractableAssets on the sogiceDocument record
  statistical_claims    → extractableAssets (statistical_claim type)
"""
from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


def _to_title_case(s: str) -> str:
    """Title-case a term while preserving existing uppercase (acronyms, proper nouns).

    'unwanted same-sex attraction' → 'Unwanted Same-Sex Attraction'
    'anti-LGBT conspiracy'         → 'Anti-LGBT Conspiracy'
    'Pastoral-Coercion'            → 'Pastoral-Coercion'
    """
    def _cap_word(word: str) -> str:
        if any(c.isupper() for c in word):
            return word
        return word.capitalize()

    def _cap_token(token: str) -> str:
        if "-" in token:
            return "-".join(_cap_word(part) for part in token.split("-"))
        return _cap_word(token)

    return " ".join(_cap_token(t) for t in s.split())


class ProposalConfidenceMixin(BaseModel):
    model_config = ConfigDict(extra="ignore")

    model_confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    confidence_rationale: str = ""
    researcher_confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)


# ---------------------------------------------------------------------------
# Lexicon proposals
# ---------------------------------------------------------------------------

class TermVariant(BaseModel):
    """A cross-language or stylistic variant of a lexicon term found in the document."""
    variant_term: str
    language: str                          # ISO 639-1
    attestation_tier: Literal[
        "tier-1-legal",
        "tier-2-ngo-academic",
        "tier-3-inferred",
    ] = "tier-3-inferred"
    source_note: str = ""                  # brief note on where/how it appears


class TermRelationship(BaseModel):
    existing_term: str                     # the term it relates to (exact string match)
    relationship: Literal[
        "synonym_of",
        "successor_to",
        "euphemism_for",
        "derived_from",
        "translates_to",
        "co_occurs_with",
        "contrasts_with",
    ]
    evidence: str = ""                     # quote or rationale


class LexiconProposal(ProposalConfidenceMixin):
    """Proposal to create a new lexicon entry or enrich an existing one."""
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    action: Literal["add_new", "add_variant", "add_evidence", "add_definition", "merge_into"]

    # The term itself
    term: str                              # canonical form (auto title-cased on ingest)
    language: str = "en"                  # ISO 639-1

    @field_validator("term", mode="before")
    @classmethod
    def title_case_term(cls, v: str) -> str:
        return _to_title_case(v.strip()) if isinstance(v, str) else v
    proposed_cluster: Literal[
        "SSA-Rhetoric",
        "Pastoral-Coercion",
        "Pseudo-Science",
        "Policy-Resistance",
        "Anti-Trans/ROGD",
        "Anti-Gender",
        "Pro-Trans-SOGICE",
        "Non-SOGICE",
        "Unknown",
    ] = "Unknown"
    function: Literal[
        "Slur",
        "Euphemism",
        "Conspiracy",
        "Pseudo-Diagnostic",
        "Identity-Policing",
        "Moral-Purity Frame",
        "Political Slogan",
        "Recruitment Frame",
        "Pastoral Rhetoric",
        "Disinformation Narrative",
        "Promotional Recruitment",
        "Testimonial Marketing",
        "Unknown",
    ] = "Unknown"

    # Evidence from this document
    exact_quote: str                       # the sentence(s) where the term appears
    definition_as_used: str = ""           # how the document defines or uses it
    usage_register: Literal[
        "promotional",      # they actively advocate for this term/practice
        "defensive",        # justifying or defending it against criticism
        "euphemistic",      # rebranding something harmful with neutral language
        "clinical",         # pseudo-medical framing
        "legal",            # statutory or policy framing
        "conspiratorial",   # framing opponents as a coordinated threat
        "testimonial",      # personal narrative used to legitimise the term
        "neutral",          # descriptive, no clear stance
    ] = Field(default="promotional", alias="register")

    # Cross-language variants found in this document
    variants: list[TermVariant] = Field(default_factory=list)

    # Terms this one relates to (within or outside existing lexicon)
    relationships: list[TermRelationship] = Field(default_factory=list)

    # Terms that appear together with this one in the document
    co_occurring_terms: list[str] = Field(default_factory=list)

    # Link to existing lexicon entry if this is an update
    existing_entry_id: Optional[str] = None    # Sanity _id of existing lexiconEntry
    existing_entry_term: Optional[str] = None  # term string of existing entry

    # For merge_into: which entry should absorb this term
    merge_target_id: Optional[str] = None

    # Researcher decision (set at Checkpoint 3.5)
    approved: bool = False
    rejected: bool = False
    pushed_to_sanity: bool = False
    sanity_id: Optional[str] = None
    researcher_note: str = ""


# ---------------------------------------------------------------------------
# Entity proposals
# ---------------------------------------------------------------------------

class NetworkConnection(BaseModel):
    """An explicit connection between two entities stated in the document."""
    entity_name: str                       # the other entity's name
    connection_type: Literal[
        "partner",
        "funds",
        "funded_by",
        "affiliate",
        "parent_org",
        "child_org",
        "legal_defense",
        "training_provider",
        "media_outlet",
        "co-signatory",
        "opposes",
    ]
    evidence_quote: str = ""


class KeyIndividual(BaseModel):
    """A named person appearing in the document in connection with an entity."""
    name: str
    role: str                              # their stated role (author, director, spokesperson…)
    quote: str = ""                        # most informative direct quote


class EntityProposal(ProposalConfidenceMixin):
    """Proposal to create or enrich an organization or person record."""
    model_config = ConfigDict(extra="ignore")

    action: Literal["add_new", "enrich_existing"]
    entity_type: Literal["organization", "person"]
    name: str                              # full name as appears in document

    # Link to existing entity if enriching
    existing_entity_id: Optional[str] = None   # Sanity _id

    # What the document says about this entity
    self_description: str = ""            # how the entity describes itself
    activities_stated: list[str] = Field(default_factory=list)
    geographic_scope: list[str] = Field(default_factory=list)  # ISO 3166-1 or region names
    legal_entities_mentioned: list[str] = Field(default_factory=list)
    claims_made: list[str] = Field(default_factory=list)       # notable claims they make
    evidence_quote: str = ""              # most informative 2-3 sentence passage

    # For organizations
    network_connections: list[NetworkConnection] = Field(default_factory=list)
    key_individuals: list[KeyIndividual] = Field(default_factory=list)

    # For persons
    affiliated_orgs: list[str] = Field(default_factory=list)
    role_in_sogice: str = ""              # their stated role in SOGICE ecosystem

    # Researcher decision
    approved: bool = False
    rejected: bool = False
    pushed_to_sanity: bool = False
    sanity_id: Optional[str] = None
    researcher_note: str = ""


# ---------------------------------------------------------------------------
# Tactic proposals
# ---------------------------------------------------------------------------

class TacticProposal(ProposalConfidenceMixin):
    """Proposal to create or enrich a tactic registry record."""
    model_config = ConfigDict(extra="ignore")

    action: Literal["add_new", "enrich_existing"] = "add_new"
    tactic: str
    definition: str = ""
    evidence_quote: str = ""
    primary_cluster: str = ""
    secondary_cluster: str = ""
    tactic_level: Literal["structural", "sub-tactic", "campaign"] = "structural"
    existing_tactic_id: Optional[str] = None

    # Researcher decision
    approved: bool = False
    rejected: bool = False
    pushed_to_sanity: bool = False
    sanity_id: Optional[str] = None
    researcher_note: str = ""


# ---------------------------------------------------------------------------
# Ingestion queue
# ---------------------------------------------------------------------------

class IngestionCandidate(BaseModel):
    """A document found in this source that should be ingested next."""
    url: str
    title: str = ""                       # as described in the source
    source_type: Literal["pdf", "url", "video", "audio", "unknown"] = "unknown"
    anchor_text: str = ""                 # the link text in the source document
    relevance: str = ""                   # why this should be ingested
    priority: Literal["high", "medium", "low"] = "medium"
    already_in_corpus: bool = False       # set during GROQ lookup
    existing_doc_id: Optional[str] = None # if already ingested


# ---------------------------------------------------------------------------
# Corpus connections
# ---------------------------------------------------------------------------

class CorpusConnection(BaseModel):
    """A connection between this document and one already in the corpus."""
    doc_id: str
    connection_type: Literal[
        "same_organization",
        "same_event",
        "same_individual",
        "cites",
        "cited_by",
        "same_tactic",
        "same_term",
        "contradicts",
        "sequel_to",
        "precedes",
    ]
    shared_element: str                   # what they share (org name, event, term…)
    evidence: str = ""                    # brief justification


# ---------------------------------------------------------------------------
# Practice descriptions
# ---------------------------------------------------------------------------

class PracticeDescription(ProposalConfidenceMixin):
    """How this document specifically describes a SOGICE practice."""
    model_config = ConfigDict(extra="ignore")

    practice_id: str                      # e.g. "Practice: Pastoral-Care"
    exact_description: str                # verbatim or near-verbatim description from doc
    harm_stance: Literal[
        "denied",       # document claims no harm exists
        "minimized",    # acknowledges concern but frames as exaggerated
        "reframed",     # reframes harm as spiritual benefit
        "acknowledged", # admits harm occurs
        "not_mentioned",
    ] = "not_mentioned"
    harm_quote: str = ""                  # the quote demonstrating the stance

    # Researcher decision
    approved: bool = False
    rejected: bool = False
    pushed_to_sanity: bool = False
    sanity_id: Optional[str] = None
    researcher_note: str = ""


# ---------------------------------------------------------------------------
# Statistical claims
# ---------------------------------------------------------------------------

class StatisticalClaim(ProposalConfidenceMixin):
    """A quantitative or empirical claim made in the document."""
    model_config = ConfigDict(extra="ignore")

    claim: str                            # the exact claim
    source_cited: str = ""               # what source the document gives
    verifiable: bool = False              # does it cite a traceable source?
    context: str = ""                     # why it matters for research

    # Researcher decision
    approved: bool = False
    rejected: bool = False
    pushed_to_sanity: bool = False
    sanity_id: Optional[str] = None
    researcher_note: str = ""


# ---------------------------------------------------------------------------
# Top-level enrichment result
# ---------------------------------------------------------------------------

class EnrichmentResult(BaseModel):
    """Complete output of Stage 3c enrichment pass. Stored as enrichment.json."""
    model_config = ConfigDict(extra="ignore")

    doc_id: str
    enrichment_model: str = ""           # which model ran this pass
    enrichment_prompt_version: str = "enrichment-v1.1"
    run_type: Literal["main", "alt"] = "main"

    lexicon_proposals: list[LexiconProposal] = Field(default_factory=list)
    entity_proposals: list[EntityProposal] = Field(default_factory=list)
    tactic_proposals: list[TacticProposal] = Field(default_factory=list)
    ingestion_queue: list[IngestionCandidate] = Field(default_factory=list)
    corpus_connections: list[CorpusConnection] = Field(default_factory=list)
    practice_descriptions: list[PracticeDescription] = Field(default_factory=list)
    statistical_claims: list[StatisticalClaim] = Field(default_factory=list)

    # Researcher notes added at Checkpoint 3.5
    researcher_notes: str = ""
