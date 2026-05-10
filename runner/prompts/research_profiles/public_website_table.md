Return a JSON object for the public_website_table profile.

Required top-level field:
- sourceStance: one of pro_sogice, anti_sogice, media_coverage, mixed, ambiguous

Prepare conservative, public-safe metadata only:
- publicTitle
- publicSummary
- publicCategory
- publicTags
- safeToShowUrl
- safeToShowScreenshots
- sensitiveContentWarning
- rightsNotes
- publicationStatus
- exclusionNotes

Set publicationStatus to draft by default. Do not include private researcher notes, sensitive survivor details, uncertain personal identifications, copyrighted transcript excerpts, screenshots, or accusatory labels without provenance.
