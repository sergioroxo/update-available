STATUS: live

# RESEARCH → THE CLOSE'S CLUSTER — the intake path
*Sérgio, 2026-08-06: "don't forget to keep track for the cluster at the close." This is that
tracking. Everything under `docs/research/` exists to end up as a star in the Close, not as prose.*

---

## Why this file exists
The Close is canonically **"the network of knowledge the piece itself is built from"** — the sources
are the constellation. So a research pass that ends in a document has only done half its job: the
finding has to become a **node**, with a status, or it never reaches the player.

**And the piece's honesty depends on it.** Node status is meant to drive **brightness**:
`documentary` burns bright, `contested` dimmer, `speculative` faintest. *The last image of the work
is an admission of what it does not know.* That only means anything if the ratings are real.

## ⚑ The current state, plainly
| | |
|---|---|
| `data/strings/close_network.json` | **24 hand-typed labels, flat.** No nodes, no edges, no statuses |
| `data/strings/_close_network.schema.json` | the target shape — **PROPOSED, nothing migrated** |
| `sergioPass` | **false.** While false, `unrated` nodes are reported; the moment it flips, an unrated node is a hard CI failure |
| the rendered mesh | ⚑ **topology is decorative** — positions are seeded-random and links join spatial neighbours. The graph is not yet a graph |

**So nothing below can land until the migration happens.** The intake exists so that when it does,
the material is already in the right shape and nothing has to be re-derived.

---

## ⚑ THE TWO RULES EVERY INTAKE OBEYS
These come from the schema's own `_doc` and they are not negotiable:

1. **`label` is ALWAYS authored by Sérgio. Never auto-filled from a source's text.** Research passes
   emit `label: ""` and put their wording in `_labelSuggestion`. The reason is ethical, not stylistic:
   source texts name real people and legal cases, and this surface's standing rule is *no survivor
   names, no real individuals — sources and structures only.*
2. **Nodes are sources and structures. Never people.** An organisation, an event, an instrument, a
   document, a mechanism, a scholarly work — yes. A person — no, however public.

**Status vocabulary** is the dossier law's: `documentary | contested | speculative | unrated`.
`verified: false` wherever a claim rests on a single source.

---

## The pipeline
```
web research  →  docs/research/*.md  →  candidate nodes (JSON, label:"")
                                     →  Sérgio's wording + ethics pass
                                     →  data/strings/close_network.json  →  the Close
```

**Step 3 is the one that has never run.** It needs the schema migration first
(`REINTERP_CLOSE_CONSTELLATION_BRIEF_2026-07-24.md` §4 names the prerequisite: tag existing sources
by era, do not invent relationships).

---

## Register — what is in flight and what it will anchor

| pass | file | anchors | status |
|---|---|---|---|
| **The European export** | `E4_SOURCES_export_2026-08-06.md` | E3's Malta payoff → E4's premise: the law arrived and the apparatus moved. ⚑ Currently **single-source** (Byline Times, 14 Aug 2024) | ⏳ dispatched 2026-08-06 |
| **AI & automation** | `E4_SOURCES_ai_2026-08-06.md` | ⚑ **L's own standing.** detrans.ai moves the *form* from speculative to documentary; also tests whether the AI photo-editor claim (currently `speculative [DO NOT CITE YET]`) has any documented instance yet | ⏳ dispatched 2026-08-06 |
| **The legal counter-current** | `E4_SOURCES_law_2026-08-06.md` | Malta as E3's break, and the Close's *"the bans that DID pass, beside the survivors."* ⚑ Must include the failures — a list of only victories would be a false picture | ⏳ dispatched 2026-08-06 |
| **Ballroom provenance** | `BALLROOM_PROVENANCE_2026-08-06.md` | the citation for TRANSCENDANCE's influence — credit rather than silent borrowing. ⚑ Also stress-tests the design's own "self-chosen categories vs imposed categorisation" reading | ⏳ dispatched 2026-08-06 |

### Already sourced this week, awaiting intake
- **detrans.ai** — Sept 2025, open-weight model, ~2,700 scraped r/detrans posters, Rewire News Group
  investigation 15 Jul 2026. `REINTERP_E4_SOURCE_PASS_2026-08-06.md` §1.
- **The LGB-split lobbying campaign** — the phrase's documented origin and purpose, GPAHE's
  classification. Same file, §2. ⚑ Carries the lobbying-vs-clinical-debate distinction as a law.

### Still owed, not yet dispatched
- **The E1/E2 sources** have never been through a pass of this kind; the constellation's 24 labels
  are the only record and they are unrated.
- **`[VERIFY SOURCE]` markers repo-wide** are accumulating rather than being retired. Nothing counts
  them. ⚑ That is the *"Dossier's evidential health"* audit named in
  `REINTERP_THE_AUDIT_SYSTEM_2026-08-04.md` — **the one the article will actually be judged on**, and
  still unbuilt.

---

## ⚑ What would make this stick
A **C9 check**: fail the build when a `docs/research/*.md` file has no corresponding entry here, or
when a candidate node carries a non-empty `label` (the ethics rule, machine-enforced). Cheap, and it
is the same ratchet pattern that took the palette from 157 to 33 and stopped stale prompts being
dispatched. **Not built — proposed here so it is not forgotten.**
