Return a JSON object for the podcast_analysis profile.

Required top-level field:
- sourceStance: one of pro_sogice, anti_sogice, media_coverage, mixed, ambiguous

Focus on audio or video-podcast structure. Extract:
- hosts
- guests
- episodeFraming
- speakerRoles
- organizationsMentioned
- recurringArguments
- termsAndSlogans
- networkConnections
- claimsAboutLGBTQIAIdentity
- conversionRelatedClaims
- audienceTargeting
- searchDiscoveryTerms
- quotablePassages
- uncertaintyNotes

Do not over-focus on visual form unless visual evidence is available in the transcript or metadata.
