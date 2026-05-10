Return a JSON object for the visual_network profile.

Required top-level field:
- sourceStance: one of pro_sogice, anti_sogice, media_coverage, mixed, ambiguous

Extract only evidence-grounded items:
- peopleVisibleOrNamed
- organizationsVisibleOrNamed
- logos
- platforms
- settings
- visualFrames
- thumbnailText
- screenText
- sceneSuggestions
- speakerRoles
- sourceToSourceNetworkClues
- uncertaintyNotes

Each analytical item should include evidence when possible using:
{ "quote": "", "pageOrTimestamp": "", "significance": "", "evidenceStrength": "explicit|inferred|unclear", "notes": "" }
