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

## ⚑ THE RULES EVERY INTAKE OBEYS — corrected 2026-08-06

**First, a correction to this file, because it caused four prompts to be written wrong.**
The schema's `_doc` is dated **2026-07-22**. The co-creation norm (CLAUDE.md line 100) is dated
**2026-07-24**. ⚑ **The schema is two days older than the norm and encodes the rule the norm
retired** — and I read the schema, believed it, and told four research agents to emit blank labels.
Exactly the stale-pointer class this repo has been bitten by twice before. The schema's `_doc` is now
corrected in place so nobody re-derives it.

Sérgio, 2026-08-06: *"I will do the review of the project, so no need to not do the work because I
need to author — this is an old conversation we had."*

**The rule that was bundled has to be split, because only half of it was retired:**

1. **⚑ ETHICS — STANDS.** A label is **never copied from a source's `text`**, because those texts name
   real people and legal cases. And a node names an **organisation, instrument, event, document,
   scholarly work or mechanism — never a person**, however public. *No survivor names, no real
   individuals: sources and structures only.*
2. **⚑ AUTHORSHIP — RETIRED.** Labels are **drafted**, marked `PLACEHOLDER-draft`, and Sérgio reviews
   and rewrites; his edit wins. Emitting `label: ""` and waiting is the old behaviour and it produces
   exactly what the norm was written to prevent: a blank that cannot be flow-tested.

**Practical effect on the four passes now in flight:** they were told to emit `label: ""` with wording
in `_labelSuggestion`. **No rework is needed** — the drafting already happened, it is just parked in a
side field. At intake, `_labelSuggestion` is promoted to `label` and marked as a draft.

**Status vocabulary** is the dossier law's: `documentary | contested | speculative | unrated`.
`verified: false` wherever a claim rests on a single source.

---

## The pipeline
```
web research  →  docs/research/*.md  →  candidate nodes, labels DRAFTED
                                     →  Sérgio's review (he rewrites; his edit wins)
                                     →  data/strings/close_network.json  →  the Close
```

**Step 3 is the one that has never run.** It needs the schema migration first
(`REINTERP_CLOSE_CONSTELLATION_BRIEF_2026-07-24.md` §4 names the prerequisite: tag existing sources
by era, do not invent relationships).

---

## Register — what is in flight and what it will anchor

| pass | file | anchors | status |
|---|---|---|---|
| **The European export** | `E4_SOURCES_export_2026-08-06.md` | ✅ **LANDED.** 14 nodes. Claim substantially holds; ⚑ **broke the era's thesis** — they operate where there is no ban rather than fleeing one. Also: "30+ countries" is 28, and the apparent second sources are the same reporter | ✅ 2026-08-06 |
| **AI & automation** | `E4_SOURCES_ai_2026-08-06.md` | ✅ **LANDED.** 12 nodes. L's form → `documentary`; ⚑ but the apparatus is an **adopter, not a developer** — no conversion org found building AI. ⚑ **The photo editor STAYS `speculative`** — no such tool exists anywhere in the record. Best single item: GLAAD 2026 on Llama 4 | ✅ 2026-08-06 |
| **The legal counter-current** | `E4_SOURCES_law_2026-08-06.md` | ✅ **LANDED.** ~10 firmly-sourced national bans — ⚑ **which corrected my own over-correction** (I had written "Malta is close to alone"). Scope matters more than count: Spain regulatory not criminal, Germany minors-only, consent-as-defence varies. ⚑ Greece and Iceland **unresolved source conflicts, flagged not guessed**; Netherlands passed both chambers but is **not yet law** | ✅ 2026-08-06 |
| **Ballroom provenance** | `BALLROOM_PROVENANCE_2026-08-06.md` | ✅ **LANDED.** 13 nodes + a draft attribution. ⚑ **Our reading was a simplification** — realness re-performs imposed categories rather than escaping them; what was seized back is the judging. Names three traps, incl. *Paris Is Burning* without bell hooks, and crediting the culture in the abstract instead of its lineage | ✅ 2026-08-06 |

### Already sourced this week, awaiting intake
- **detrans.ai** — Sept 2025, open-weight model, ~2,700 scraped r/detrans posters, Rewire News Group
  investigation 15 Jul 2026. `REINTERP_E4_SOURCE_PASS_2026-08-06.md` §1.
- **The LGB-split lobbying campaign** — the phrase's documented origin and purpose, GPAHE's
  classification. Same file, §2. ⚑ Carries the lobbying-vs-clinical-debate distinction as a law.

### ⚑ FOUR THINGS THE LAW PASS SAYS THE PIECE MUST NOT DO
1. **Do not use the Switzerland-as-haven claim.** Its original source was unreachable (403) and it
   could not be verified at all. It is asserted in secondary sources only.
2. **Do not lean the ending on more than the CBC Marketplace case can carry.** That undercover
   investigation — a US life coach offering online coaching to a Canadian despite Canada's ban — is
   **the sturdiest single piece of cross-border evidence in the file.** The broader "bans just push it
   elsewhere" claim is assertion.
3. **Do not state Greece's or Iceland's scope.** Sources conflict — Greece on whether gender identity
   is covered at all, Iceland on whether it took force 1 Jan 2024 or 1 Jul 2025. Flagged, not guessed.
4. **Do not call the Netherlands a ban.** Passed both chambers; still awaiting royal assent.
   ⚑ *And do not say "adopted" when the fact is "in force," or vice versa — this project has been
   bitten by that distinction before.*

### Sérgio-run passes (not constellation material — design provocation)
- **`RESEARCH_ARENA_E4_BRIEF_2026-08-06.md`** — the Era-4 brief for ArenaAI. ⚑ Deliberately withholds
  every decision we have made (L, the headset, the home environment, the memories beat, the failed
  turn, `NO CATEGORY FOUND`) so the models are not handing our own answers back. Gives the situation,
  the ethical rails, and Sérgio's two fixed points: TRANSCENDANCE and the checkpoints.
  ⚑ **Outputs are provocation, never material** — same rule as Strand B's layouts. Nothing enters
  `data/` without Sérgio choosing it deliberately.

### Still owed, not yet dispatched
- **The E1/E2 sources** have never been through a pass of this kind; the constellation's 24 labels
  are the only record and they are unrated.
- **`[VERIFY SOURCE]` markers repo-wide** are accumulating rather than being retired. Nothing counts
  them. ⚑ That is the *"Dossier's evidential health"* audit named in
  `REINTERP_THE_AUDIT_SYSTEM_2026-08-04.md` — **the one the article will actually be judged on**, and
  still unbuilt.

---

## ⚑ What would make this stick
A **C9 check**: fail the build when a `docs/research/*.md` file has no corresponding entry in the
register above, and when a node's `label` is byte-identical to any source `text` in the repo — which
is the ethics rule, machine-enforced, and the only half of the old rule worth checking.
⚑ **Note what C9 must NOT do:** an earlier draft of this file proposed failing on a *non-empty* label.
That would have enforced the retired authorship rule in CI, permanently. Cheap otherwise, and the same
ratchet pattern that took the palette from 157 to 33. **Not built — proposed here so it is not
forgotten.**
