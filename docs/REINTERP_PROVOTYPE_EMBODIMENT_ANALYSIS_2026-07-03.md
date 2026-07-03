# PROVOTYPE EMBODIMENT ANALYSIS — why the pillow doesn't land, and what the grammar needs

*2026-07-03 · Fable 5, routed from Sérgio's Round 12 report ("didn't understand the logic and aesthetics
of it, misses the connection with real-world logic and narrative storytelling immersive benefits").
Grounded in a direct read of the shipped code: `data/provotypes/pillow.json`,
`src/desktop/apps/provotype.ts` (worktree, commit `fcaca92`). This is a diagnosis + revision-direction
brief, not a rewrite — copy and final creative calls stay Sérgio's; this names what's structural (affects
every future provotype built on the R1 framework) vs. pillow-specific.*

## 1. What's actually on screen right now

The pillow plays entirely inside one 440×336 modal window, floating on the Era-2 desktop, using the exact
same chrome (`ui.windowFrame`) as every ordinary app icon. Phase by phase:

- **Invitation/frame:** two short text blocks, a button.
- **Vignette:** a prompt sentence → click a labeled button (`Lift` / `Exhale` / `Strike`) → a flat grey
  system-response sentence → an optional one-line `felt` string in dim 10pt grey, easy to skim past → a
  restrained 74×92px stick-figure pose (deliberately inert: no rhythm, no impact lines, no screen shake —
  by design, per R2-2, to avoid swing-satisfaction). Repeat ×3 escalating cycles, text-only escalation
  (`"Surface tension registered"` → `"Incomplete emergence"` → `"Resistance pattern unchanged"`).
- **Debrief:** a dossier-card text dump — 4 sourced citations with `status`/`confidence` labels, museum
  wall-text register.

Nothing outside that window changes. Daniel's room, the rest of the desktop, the reason "Dad" matters, why
this is happening today, what Restorify's larger apparatus looks or feels like — none of it is visible
from inside the vignette. The player experiences: read → click a clinical verb → read a clinical
non-answer → repeat → read a bibliography.

## 2. Diagnosis: this is a structural problem, not a wording problem

**The grammar currently over-indexes on "expose the technique through unwinnable UI mechanics + a
dossier-grade debrief" and under-indexes on embodiment, environment, and narrative stakes.** Four concrete
gaps, each traceable to a real design choice made for good reasons that may have swung too far:

1. **No room. No environment. No world.** The vignette is architecturally identical to every other desktop
   app window — same frame, same font sizes, same button chrome. There is nothing in the presentation that
   says "this is happening in Daniel's bedroom, on his body, to someone he's supposed to trust." The
   restrained-animation law (R2-2, correctly protecting against swing-satisfaction/kinaesthetic mimicry)
   removed the only embodied element almost entirely — an inert 74px stick figure is the sole visual tether
   to a physical act, and it reads as diagram, not scene.
2. **Daniel is nearly absent.** Three `felt` lines total, across the whole vignette, in the smallest,
   dimmest text on screen (10pt grey, R2-2's "bare, unstyled, never juiced" law). That law was written to
   avoid empathy-machine perspective-taking (Round 2's proxy-framing correction) — but the result is that
   the one human voice in the scene is typographically the least important thing on screen. The proxy
   framing ("you authorise/advance, you don't become Daniel") is a sound dramaturgical call; making his
   voice nearly invisible was not required by that call, and may be an overcorrection.
3. **No stakes are legible inside the scene.** "Real-world logic" — who is "Dad," why is this a recurring
   session, what does Restorify want, what happens if the player refuses, why should this specific
   Tuesday matter — lives nowhere the player can see while playing. It would need to be inferred from
   context outside the vignette (the desktop, the era, prior scenes) that the modal doesn't reference at
   all.
4. **The debrief is positioned as the payoff, and it's the least narrative thing in the piece.** Four
   citations with confidence labels is exactly right for a *dossier card* — CLAUDE.md and the master plan
   are correct that this belongs in the piece. But right now it's also the *entire* second half of the
   only beat the player gets, so the vignette's ending lands as "here is a bibliography" rather than a
   felt close.

None of this is a copy problem. Better placeholder sentences would not fix any of the four items above —
they're about what's rendered, where, at what size, and what surrounds the interaction, which is
`provotype.ts`'s job, not `pillow.json`'s.

## 3. Why this matters beyond the pillow

`src/desktop/apps/provotype.ts` is the **one reusable grammar** every future provotype (R4 Origin Story
Intake, R5 femininity homework, R6 Care Planner) inherits verbatim. If the structural gaps above aren't
addressed at the framework level, every subsequent provotype ships with the same disconnect, at greater
volume — and Sérgio's north star (master plan §F7, storytelling-analysis-first: build emotional connection
before anything else) is exactly the axis this currently underserves. **This is why the provotype content
pipeline should pause on new candidates (R4/R5/R6) until the revision direction below is set and proven on
the pillow** — building three more instances of the same shape multiplies the problem before it's fixed.

## 4. Revision directions (design principles, not final creative calls)

These are proposals for the next build round to work from — Sérgio's voice/creative judgment still
finalizes shape and copy.

- **Break the modal out of ordinary app chrome.** A provotype is not a Restorify settings screen; it
  should not look like one. Candidate: render the vignette *in the room* — Daniel's actual environment
  visible behind/around the interaction (even a static, low-poly establishing view), with the UI as an
  overlay rather than the entire visible world. This doesn't require the radial/spatial engine work
  (Stage C) — it's a rendering change inside the existing flat-desktop pipeline, scoped to
  `provotype.ts`'s vignette phase.
- **Give Daniel's voice room to land.** Not bigger or "juiced" (the anti-empathy-machine caution from
  R2-2 stands) — but positioned so a player can't miss it: its own beat/pause rather than a dim line
  competing with the system's paragraph above it. Consider a brief silent moment where only the `felt`
  line is on screen — the system's voice absent for one breath — before the next prompt.
  **Constraint carried forward:** this must not become full identification/perspective-taking-as-therapy;
  the proxy framing (player authorizes, doesn't become Daniel) stays. The ask is *legibility*, not
  *possession*.
  **Constraint on WHY it currently doesn't land:** review whether the dim/small treatment was itself
  overcorrecting past "bare, unstyled" into "nearly invisible" — those are not the same thing.
- **Let the "why" surface inside the scene, briefly.** Not exposition — a single grounding detail (who
  "Dad" is to Daniel, why today) that a documentary vignette can carry in one sentence without becoming a
  narrative digression. This is the connective tissue "real-world logic" is asking for.
- **Separate the debrief's documentary function from the vignette's narrative close.** Consider a short,
  wordless or near-wordless narrative beat *between* the vignette's end and the sourced dossier card — the
  emotional landing — so the debrief can stay exactly as rigorous as it is without also being asked to
  double as the scene's ending.
- **Reconsider pacing.** All three cycles currently take the same three taps with only text deltas between
  them. If the point is "nothing changes no matter how hard you try," the player needs to *feel* time pass,
  not just read three similar paragraphs in quick succession — consider whether a beat of enforced dwell,
  or a visual/environmental change on repeat (not reward — erosion, staleness, sameness made visible) would
  make the silence-as-argument land faster than text alone.

## 5. This is bigger than the pillow (routes to the still-owed specs)

Sérgio's report also asks for "much more necessary storytelling elements to explore" — broader than one
scene. That request is exactly what the **Opening & Flow spec** and a **narrative-immersion audit across
everything currently designed** (not just built) are for. Recommendation: run this pillow revision as the
proof case first (cheap, one existing scene, no new spatial system), then apply whatever it teaches to the
Opening & Flow spec before any more provotypes are drafted. Do not let this become an open-ended research
tangent — one revised pillow, felt and confirmed, is the fastest way to know if the direction in §4 is
right.

## 6. What this doesn't touch

- The proxy framing (◆4/R2-2) stays — the player authorizes/advances, never becomes Daniel.
- The density law (R2-1, ≤1 provotype/era) stays.
- The two-failure-shapes taxonomy (◆5) stays; the pillow is still `silence`.
- G6 (documentary-not-instructional framing) and G9 (the Brothers Road reference photo, never traced)
  bind unchanged.
- No new sources, no new claims — this is a presentation/embodiment revision, not a content revision.
