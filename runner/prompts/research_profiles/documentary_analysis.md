Return a JSON object for the documentary_analysis profile.

Required top-level field:
- sourceStance: one of pro_sogice, anti_sogice, media_coverage, mixed, ambiguous

Only analyze documentary form if the source supports it. Extract:
- narrativeStructure
- openingFraming
- speakerTestimonyStructure
- visualRhetoric
- organizationalPresence
- productionBackgroundCues
- emotionalArc
- beforeAfterTransformationLogic
- authorityFigures
- changeHealingCorrectionClaims
- sceneScreenshotSuggestions
- quotablePassages
- networkRelevantActors
- searchTerms
- uncertaintyNotes

Ground claims in evidence and mark weak inferences as unclear.
