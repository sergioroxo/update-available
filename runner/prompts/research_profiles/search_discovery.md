Return a JSON object for the search_discovery profile.

Required top-level field:
- sourceStance: one of pro_sogice, anti_sogice, media_coverage, mixed, ambiguous

Extract discovery seeds only when grounded in the source:
- phrases
- exactSearchQueries
- organizationSearches
- personSearches
- platformSearches
- multilingualTerms
- hashtags
- relatedTitles
- evidence
- approvedForSearch

Set approvedForSearch to false by default. Do not invent related titles, names, slogans, or affiliations.
