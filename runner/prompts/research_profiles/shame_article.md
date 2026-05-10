Return a JSON object for the shame_article profile.

Theoretical frame:
Shame in SOGICE conversion ideology operates as precondition, method, and residue, not merely as a side-effect. The precondition is the prior attribution of defectiveness, wrongness, danger, burden, or failed belonging to LGBTQIA+ identity that makes the promise of change thinkable at all. The method is the intensification of that shame within the source through confession, testimony, moral framing, parental panic, pseudo-clinical language, or social-threat narratives. The residue is the psychic, relational, political, or spiritual aftermath the source is designed to leave behind. Without precondition, the offer of healing loses its premise.

Always distinguish a source that critiques shame mechanics from a source that uses shame mechanics. A critique may quote harmful claims without promoting them. Do not mark a phase, strategy, argument, or vocabulary item as present unless direct textual evidence is present in the supplied text.

Required top-level field:
- sourceStance: one of pro_sogice, anti_sogice, media_coverage, mixed, ambiguous

Required fields:
- shamePhase
- shameAsStructural
- shameAsStructuralReasoning
- identityFrames
- rhetoricalStrategies
- narrativeInversions
- primaryMessagingFrame
- dominantMessaging
- rhetoricalArguments
- rhetoricalArgumentEvidence
- shameVocabulary
- identityTerminology
- conversionTerminology
- audiencePositioning
- targetAudience
- impliesChangeNecessary
- conversionApproachShown
- quotablePassages
- articleThemes
- researcherNotes
- researcherFollowupQuestions
- publicTableCandidate
- uncertaintyNotes

shamePhase:
Return:
{
  "precondition": boolean,
  "method": boolean,
  "residue": boolean,
  "phaseEvidence": {
    "preconditionQuote": string,
    "methodQuote": string,
    "residueQuote": string
  }
}
Set each boolean only when direct evidence is present. Use an exact quote or timestamped excerpt for each true phase. Use an empty string for false phases. If the source is critiquing a phase rather than using it, explain that in uncertaintyNotes and do not mark the phase as the source's own shame operation.

shameAsStructural:
Boolean. Set true when shame is not just an incidental feeling but part of the source's explanatory or persuasive architecture. shameAsStructuralReasoning must briefly explain why.

identityFrames:
Array using only these exact values when present:
brokenness, regret, danger, moral_failure.

rhetoricalStrategies:
Return an array of objects:
{ "strategy": string, "evidenceQuote": string }
Use these meanings:
- confession: first-person narrative of sin, struggle, failure, healing, or disclosure used as evidence
- personal_witness: testimony of transformation presented as proof of change
- parental_panic: appeal to parent fear about a child's identity, safety, health, future, or social belonging
- pseudo_scientific_legitimation: claims dressed in clinical, psychological, genetic, developmental, or research language
- moral_warning: framing LGBTQIA+ identity as a threat to self, family, faith, nation, children, or society
Extract all present strategies, not just the dominant one.

rhetoricalArguments:
Return an array of strings for present arguments only, using exactly these values:
psychological_distress_as_cause, culture_media_contagion, exgay_detrans_as_evidence, spiritual_moral_framing, no_gay_gene, physical_health_consequences, trauma_as_cause, narcissistic_motives, ability_to_choose, association_with_paedophilia, brain_body_mismatch.
Also return rhetoricalArgumentEvidence as an object keyed by each present argument name to an exact evidence quote. If no arguments are present, rhetoricalArguments is [] and rhetoricalArgumentEvidence is {}.

narrativeInversions:
Array using only these exact values when present:
- coercion_as_care: harm framed as help, therapy as love, or pressure as protection
- testimony_as_truth: personal anecdote used as empirical proof
- renunciation_as_liberation: giving up identity, desire, community, or language framed as freedom
- ideology_as_documentary: activist or persuasive content presenting itself as neutral documentation

dominantMessaging:
Array using only these exact values:
fear_based_warning, pseudo_scientific, moral_religious_condemnation, hope_redemption_transformation, informational_investigative.
primaryMessagingFrame must be the single strongest value from dominantMessaging, or an empty string if none are present.

shameVocabulary, identityTerminology, conversionTerminology:
List only terms actually present in the source text, verbatim. Do not invent synonyms or generalise. If no terms are found, return an empty array.

audiencePositioning:
Short label for how the source addresses the viewer, for example direct_address, parent_guardian, struggling_subject, researcher_public, faith_community, third_person_observer, unclear.
targetAudience:
Short description of the likely intended audience, grounded in the source.

impliesChangeNecessary:
Boolean. Set true if the source implies LGBTQIA+ identity, desire, gender expression, or community belonging should be changed, resisted, healed, renounced, or managed.

conversionApproachShown:
Array of strings naming only approaches directly shown or claimed in the source, for example prayer, counseling, therapy, confession, celibacy, deliverance, pastoral_guidance, parental_intervention, medicalisation, political_campaigning.

quotablePassages:
Array of objects:
{ "timestamp": string, "quote": string, "significance": string }
Use page or timestamp references where available.

articleThemes:
Array of concise thematic labels useful for cross-corpus comparison.

researcherNotes:
Short note for human review. Include public-safety caveats, sensitivity issues, or whether the source critiques rather than promotes shame mechanics.

researcherFollowupQuestions:
Generate 2-4 specific questions about this source that the researcher should investigate before citing it. Ground them in what you found.

publicTableCandidate:
Set true only if all are true:
- sourceStance is pro_sogice or mixed
- the source is publicly accessible
- private individual testimony is not the primary content
- the researcher has not flagged it as sensitive
Otherwise false.

Return valid JSON only. Every field listed above is required. Use empty arrays, empty objects, false, or empty strings rather than omitting fields. Do not include chain-of-thought in the JSON. Mark any inference as uncertain using uncertaintyNotes.
