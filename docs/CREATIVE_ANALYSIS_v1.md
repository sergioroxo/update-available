# PC Simulator — Creative Analysis & Potentials v1.0

*Status: **PROPOSAL / ANALYSIS** (2026-06-10). Requested by Sérgio: a creative
overview, an honest review of the ArenaAI trial, new ideas argued **for and
against** the existing canon, the playfulness question, and realistic
application. Pairs with [PRODUCTION_SCRIPT_v0.3.md](PRODUCTION_SCRIPT_v0.3.md),
which implements what this document argues. Nothing outside this folder was
modified.*

---

## 1. Where the project actually stands (the honest snapshot)

You now have **three generations of the same idea** in this folder tree:

1. **The parked satirical OS-game** (Parking Lot; `Random 2`/`Random 5` era) —
   campy, funny, mechanically inventive, ethically risky.
2. **The grounded canon** (NDD v1.0 → NARRATIVE_SCRIPT_v0.1 → v0.2) — Witness
   Mode, five stages, "darkness earned," ethically watertight, dramaturgically
   strong — and, in its current written form, **light on play**.
3. **The ArenaAI trial** (`ArenaAI Trial, before Claude/`) — which is, and this
   matters, **the parked vision resurrected**: the prompt that produced it (see
   `ArenaIbefore.rtf`, first lines) is the pre-NDD framing — "AI Jesus,
   satirical layers, mini arcade games." ArenaAI never saw the canon.

That third fact is not a problem; it is **useful data**. The parked direction
keeps coming back because it is the *playable* one — and the trial accidentally
ran the experiment the project needed: *what does this piece look like when
play leads?* The answer below is: the canon keeps the soul, the trial donates
organs.

---

## 2. The ArenaAI trial, reviewed module by module (the harvest map)

What the trial got **right** is mostly *mechanism*; what it got **wrong** is
mostly *voice* (it satirizes on the victim's side, names a cartoon villain org
("Alliance of Therapeutic Order"), and gamifies the frame with quest popups —
all things the canon deliberately rejected). The harvest rule:
**keep the verbs, rewrite the voice.**

| Trial module | Verdict | Why |
|---|---|---|
| `name-entry.js` | **HARVEST nearly as-is** | Already canon-compliant: warm dialog, name in memory only, the line *"Your name will only be used to personalize your experience"* is exactly the right quiet lie-that-isn't-a-lie. Matches ArenaAI experiment #1. |
| `witness-mode.js` | **HARVEST the mechanism, re-skin** | The flip with dead controls, the swallowed clicks, the not-allowed cursor — built and working. Its best idea is one v0.2 didn't have: **the INTAKE RECORD fields are computed live from your actual play** ("Search Queries Logged: 3 → Risk: ELEVATED"). See §5, New Idea 3. The "Alliance of Therapeutic Order" branding and the cartoon fields ("prayer warrior") go. |
| `clippy.js` | **HARVEST the body, replace the soul** | A fully animated companion with expressions, speech queue, dismissal-and-return, and a **suspicion system** that escalates its register. The dialogue is parked-tone ("It looks like you're having gay thoughts") — unusable on the victim side. But the *infrastructure* is the single most valuable thing in the trial. See §4, New Idea 1. |
| `narrative.js` | **HARVEST the engine, drop the gamification** | A working era system (theming, unlocks, per-era app availability) = the scene-graph runner v0.2 specified. But "Quest Complete!" popups and a visible progress % are the wrong frame voice — *achievements belong inside Stage 3's wellness app as satire, never in the frame UI.* |
| `google-simulator.js` | **PARK → sibling module** | A full 1000-line search engine with autocomplete, "did you mean," knowledge panels, escalation. The canon boundary ([GOOGLE_SIMULATOR.md](../GOOGLE_SIMULATOR.md)) says the Search Simulator is a *separate* module; the PC Simulator keeps only the lighter autocomplete trap (Element #3). This code is a head start **for the sibling project** — file it there, resist pulling it in here. |
| `sogicefy-player.js` | **HARVEST mechanic, re-aim** | The canon already wants SOGICEfy/NapsterFY as a seam object. The trial's mechanic — the player "converts" *metadata and lyrics*, erasure rendered as a progress bar — is strong procedural rhetoric. The joke titles ("Lady Grace") drift campy; era-accurate sanitization ("explicit" flags, quiet removals from playlists) is colder and truer. |
| `therapeutic-room.js` | **MOSTLY PARK** | Microsoft-BOB rooms are deep-cut funny but the wrong register for the victim side and too cartoonish even for the perpetrator side. Harvest one variable: `complianceLevel` feeding the witness panel. |
| `history-reference.js` | **HARVEST the *form*** | The trial independently invented the Dossier — as a **desktop app** ("History Reference: what's real vs. fictional, with sources"). That diegetic form (the dossier as an in-world application you open, not an overlay that breaks the world) is better than v0.2's browser-overlay solution. Merge: one Dossier, presented as an in-OS app in browser, the clipboard in VR. Its sample citations (APA 2009, WHO ICD-11, "26+ US states") are plausible but unverified — `[VERIFY SOURCE]` before any of that text ships; the European grounding in RESEARCH_BASE should lead anyway. |
| `ARCHITECTURE.md` (tiered immersion) | **TAKE SERIOUSLY, then decline — and steal one insight** | See §6. |
| CRT boot, Win95 chrome CSS, splash | **REFERENCE** | Nice confirmations of look; rebuild in the real pipeline (the trial is Canvas-2D DOM, not the engine). |

**Overall:** the trial is the best argument yet that the build is *achievable*
— a sandboxed AI with no context produced working versions of half the
mechanics in one session. It is also the best argument for the canon's
guardrails: read `clippy.js`'s gaslight lines aloud and you can hear exactly
why the satirical voice was parked.

---

## 3. The core creative tension, named precisely

The grounded canon and the satirical impulse are usually framed as a settled
question (satire lives only in perpetrator self-presentation, and collapses).
The trial exposes the unresolved remainder:

> **The victim side, as currently scripted, is dramaturgically rich but
> interactively thin.** Open a letter. Read a forum. Fill three blanks. Watch.
> The Witness flip is profound *once*; "darkness earned" risks becoming
> *a walking simulator of sadness* across 35 minutes — especially for the
> younger/festival audience this is partly for.

And the satirical OS keeps resurfacing (Random 5, the trial) because it solves
exactly this: it makes the *interface itself* the antagonist you are constantly
*operating*. Bogost's procedural rhetoric — the argument is in what the system
makes you *do*, not what it shows you (Persuasive Games; cf. *Papers, Please*,
*Harmony Square* — already in ARTIFACT_DESIGN's lineage).

**The synthesis this analysis proposes:** the canon's tonal law survives
untouched, but we acknowledge that **the interface IS perpetrator
self-presentation.** The OS, the assistant, the apps, the funnels — these are
the system presenting itself as helpful. Therefore the interface may be
*playable, charming, even funny* — because its charm is the propaganda, and the
canon already requires propaganda's charm to curdle. The victim's *interiority*
(the script, the fear, the crush on MSN) stays grounded and unsatirized; the
victim's *tools* may glitter. That is not a new rule — it's the existing rule,
finally applied to the UI layer itself. It unlocks everything worth keeping
from the trial.

---

## 4. NEW IDEA 1 — The Assistant (the companion that rebrands)

*The user's request — "a Clippy/Cortana/AI agent of the game can accompany you
and guide you" — is, on inspection, the missing keystone. Developed here;
scripted in v0.3 Part II.*

### The concept

One companion character lives in the corner of the desktop across all four
eras, and **rebrands exactly like the harm does** — because in the real
history of computing, it did:

| Stage | The Assistant's form (invented marks, no real likenesses) | Real-world rhyme |
|---|---|---|
| 1 (~1995–99) | **HELPY.EXE** — a pixel desk-helper (paperclip-*adjacent* invented shape: a bookmark ribbon / origami bird), eager, naive | Office assistants of the era |
| 2 (~2005–12) | **Aski** — a glossy search-buddy mascot with a sniffing animation | Search-era mascots |
| 3 (~2015–20) | **Sol** — a soft pastel orb, breathing animation, wellness voice | Voice-assistant era |
| 4 (~2023+) | **Ami™** — "your agent," text-first, no body at all, just presence | The AI-agent era — and here it converges with **Pastor.AI**: in Stage 4 the user realizes the 3am counsellor and the assistant share a typing cadence. The helpful paperclip grew up to be the recruiter. |

The thesis, restated in the UI layer: **assistance rebrands as agency; the
demand underneath never changes.** The Assistant always wants the same thing —
*your attention, your data, your trust* — and only the costume changes. The
final dossier card annotates the Assistant itself.

### Why it's better than the no-companion canon (the case for)

1. **It solves wayfinding honestly.** Desktop sims have a real UX problem:
   players don't know what to click. v0.2 had no answer except level design.
   The Assistant guides — *"You have new mail"* — and every nudge is
   **diegetic targeting**: the funnel personified. The tutorial *is* the
   grooming. No other solution makes the UX crutch mean something.
2. **It solves pacing and shorter versions** (Sérgio's P1 answer). The
   Assistant can *diegetically skip*: "Let me take you ahead" — a hand on your
   shoulder that is also exactly what recruitment does (it accelerates you
   past reflection). Sequence control becomes a story beat instead of a menu.
   (See v0.3 Part III, the Paths system.)
3. **It gives the suspicion system a home.** The trial's best invention —
   behavior-reactive escalation — was wasted on camp lines. Re-voiced: the
   Assistant's *helpfulness drifts* (the Pastor.AI register: never wrong, never
   slurs, always curving one way), and in **Witness Mode you read its reports**
   — the warm bubble on your side, the cold log on the other
   (*"Subject engaged. Vulnerability window: 03:00–04:00. Recommend contact."*).
   The comedy and the horror are the **gap between the two registers** — which
   is the project's whole method (associative/montage logic) in one character.
4. **It carries the emotional arc a desktop can't.** Era 1's Assistant is
   genuinely endearing — and that matters, because the Close needs something to
   grieve. The last time it asks *"Can I help?"*, the dossier annotates it
   mid-sentence. The collapse rule, honored.
5. **Festival operations.** A character who can say "we have a few minutes —
   shall I take you somewhere important?" is softer than a countdown timer and
   absorbs the timing problems hosts otherwise handle.

### Why the older (assistant-less) design may be better (the case against)

1. **The desktop's silence is part of "darkness earned."** Stage 1's loneliness
   — a kid, a CRT, a dial-up screech — is the emotional bedrock. A bouncing
   companion in the corner risks cuting-up the exact scenes that must stay bare.
2. **Annoyance is the genre memory.** Clippy is remembered as an irritant;
   importing that energy risks the player dismissing (literally) the project's
   narrator.
3. **Camp gravity.** Every line written for a mascot pulls toward the parked
   tone. The trial proves how fast that slope is.
4. **Scope.** A persistent reactive character is a real system (state, timing,
   interruption rules) layered on everything else.

### The reconciliation (what v0.3 actually does)

- **Stage 1 has no Assistant.** Period-true (DOS/early-95 had none) and
  preserves the bare loneliness. HELPY.EXE arrives **with the Stage-2 era
  switch** — assistance arrives exactly when the system industrializes. Its
  *absence first* makes its arrival legible as an event.
- **Strict line budget.** The Assistant speaks at most N times per stage
  (v0.3 sets N=4–6), never during the victim's intimate beats (MSN crush,
  the contested clinic), and **never jokes at the victim**. Its humor is only
  ever its own corporate sincerity.
- **Dismissible, and the dismissal is data.** Click it away and it goes —
  and the witness panel logs *"Subject dismissed assistance × 3. Flag:
  resistant."* (The trial's return-after-dismissal mechanic, given meaning.)
- **It is the connective tissue, not the voice of the piece.** The Dossier
  (survivor primacy) remains the authoritative voice; the Assistant is part of
  the machinery the Dossier unmasks. They must never blur: Dossier text is
  never delivered by the Assistant — the speaking-place ethic, kept structural.

---

## 5. NEW IDEAS 2–4 (smaller, each responding to a decision)

### New Idea 2 — One room, two cameras (resolves P5)

Sérgio's P5 worry: VR-only spectacle (the convergence cards leaving the
monitor) splits the two versions; and "the 2D version can also rotate around
the room." Adopt exactly that:

> **The browser version is not a flat build. It is a camera in the same 3D
> room**, framed on the monitor by default. The flip = the camera swings 180°.
> The convergence = the camera pulls back as cards leave the screen into the
> dark. Drag (or arrow keys) to look around at any time.

One scene graph, one staging, two cameras — the only difference between
versions is *who turns the head*. This deletes the entire class of
"VR-version-vs-2D-version divergence" problems P5 worried about, costs little
(the room is already built for VR), and quietly improves the browser version:
the player discovering they can *look behind the monitor* in a "2D" piece is a
small gasp that teaches the flip.

*The case for the older idea (pure 2D canvas in browser):* sharper pixel
purity, runs on potatoes (school Chromebooks), zero GPU dependency. *Answer:*
keep a `?flat=1` fallback rendering the canvas alone — it costs nothing since
the canvas is already the single UI surface. Classrooms get the flat build;
everyone else gets the room. (This also absorbs the trial's Tier-1/Tier-2
insight — see §6.)

### New Idea 3 — The computed INTAKE RECORD (harvested from the trial)

v0.2's witness side was authored dioramas + a static record. The trial's
witness panel **computes its fields from actual play**: searches counted,
sessions logged, risk level derived. Merge them:

> The back-of-house keeps its human dioramas (the neighbour, the counsellor,
> the printer), **and** the era's filing artifact (index card → database row →
> CRM → moderation queue) displays *live ledger data*: what you actually
> typed, opened, dismissed, lingered on. Risk fields derive from real behavior
> (`dismissed assistant ×3 → "resistant"`, `opened affirming email → flag`).

Why better: it converts the victim-blaming risk *mitigation* (ETHICS: "make the
mechanism legible") into the central spectacle — you watch your own actual
session being interpreted by a hostile bureaucracy. Nothing is more
"mechanism over metaphor" than that. Why the old way still matters: computed
fields alone are cold; the dioramas keep the human hands visible (the
neighbour *believes* she is kind). Keep both — data in the foreground,
humans in the mid-ground.

### New Idea 4 — Paths instead of Cuts (resolves P1)

The Festival Cut as a *build* is deprioritized (P1). Replace with **Paths**:
runtime routes through one scene graph (already supported by `cuts.json` —
rename `paths.json`):

- **Full Path** (~35–40 min) — everything, default in browser.
- **Short Path** (~15 min) — Stage 0 → Stage 1 (mIRC + flip) → bridge →
  Stage 4 (feed + flip + convergence) → Offer → Close. Not a separate cut:
  the Assistant *performs* the skips diegetically.
- **Open Desk** (loop) — for unattended/gallery contexts later; attract screen
  → Short Path → reset. Build last, only when a venue asks.

This is cheaper than the v0.2 cuts (no compiled variants, one graph), and the
shorter version is no longer a lesser version — it is the same piece with the
Assistant's hand more visible, which is thematically *more* pointed, not less.

---

## 6. The architecture argument the trial makes — taken seriously

The trial's `ARCHITECTURE.md` argues browser-first tiered immersion: Canvas 2D
is the piece; a headset browser showing the page full-FOV "IS already VR"
("the metaphor IS the screen — you need to feel trapped BY it, not be INSIDE
it"); full 3D is an opt-in garnish. That is a *good argument* and deserves a
real answer, not dismissal:

- **Where it's right:** development speed (5 mini-apps in the time of one VR
  interaction); accessibility; and the thematic point is genuinely strong *for
  the victim side* — being at a screen is the fiction.
- **Where it breaks:** the **flip**. The project's load-bearing mechanic is
  *physically turning your back on your own desktop* — Witness Mode as a bodily
  act. A full-FOV webpage cannot do that; it makes the flip a button in VR too,
  which deletes the reason VR is in the project at all. The canon's
  WebXR-native decision was made for exactly this and stands.
- **What to steal anyway:** (1) the insight that the canvas is the piece — so
  protect the `?flat=1` canvas-only fallback forever (it is the universal
  format: any browser, any school, any archive context, 2040-proof); (2) the
  honest cost ranking — schedule all 2D app work *before* polishing any VR
  interaction beyond the flip itself.

**Confirmed stack remains:** PlayCanvas-as-npm + Vite + TS, one scene, two
cameras, canvas-as-texture (BUILDING_GUIDE unchanged). The trial's code is
reference, not scaffold — same status as `Random 2`, with better ideas inside.

---

## 7. Playfulness — an in-depth position

The question under everything above: **how much fun is this allowed to be?**

A position, in four theses:

1. **Play is the method, not a concession.** The project's own lineage list
   (Molleindustria, *Papers, Please*, *Harmony Square*, the FT Uber Game) is a
   list of *games* — pieces whose argument is delivered by making you operate a
   system until you understand it from inside. The PC Simulator's subject —
   interfaces that recruit — is *uniquely* suited to this: the player should
   catch themselves *enjoying* the wellness app's streak, *wanting* the
   autocomplete's suggestion, *liking* the Assistant — and the dossier should
   then hand them that enjoyment as evidence. The piece's deepest beat is not
   "look what they do" but "**feel how well it works on you**."
2. **Interactivity belongs to the system's surfaces; gravity belongs to the
   person.** Everything operable may glitter (that's the propaganda's job);
   everything *felt* stays grounded. The MSN crush is not a mini-game; the
   music player is. This line is already implicit in canon — v0.3 makes it an
   explicit per-scene flag (`register: operable | felt`).
3. **The frame never plays.** No quest popups, no score, no "Era Unlocked!"
   in the piece's own voice (the trial's one big register error). The only
   gamification visible is *diegetic* gamification — the wellness app's badges,
   the Assistant's "helpfulness," the Conformity-style scores **on the witness
   side as the system's own KPIs.** The system gamifies you; the piece never
   gamifies the system.
4. **Humor discipline:** the player may laugh at the machine's sincerity,
   never at the person's pain. Test in playtesting: note *where* people laugh.
   Laughs on the victim's intimate beats = a register bug to fix, same severity
   as a crash.

---

## 8. Potentials & realistic application

### What this can be (the honest ceiling)

- **As research artifact (the PhD):** the contribution is crisp and nameable —
  *Witness Mode* (non-interactive perpetrator-side perspective-taking, VRPT
  with the agency inverted) + *the rebranding interface* (procedural rhetoric
  where the UI's own history performs the argument). Both are publishable
  design moves; the kappa can hang on them.
- **As education:** the strongest realistic channel. The flat fallback runs on
  anything a school owns; the no-storage architecture means zero paperwork;
  the dossier-as-app gives teachers a built-in lesson structure
  ([FESTIVAL_AND_EDUCATION.md](FESTIVAL_AND_EDUCATION.md) stands, minus the
  cut-build assumptions — Paths replace them).
- **As festival piece:** real but second priority now (P1). The piece's
  festival identity is the *chair-turn* — one body, turning from its own
  desktop to face the system. That image is the poster.
- **As public web artifact:** the under-discussed potential. A URL is the
  most viral possible format for this subject — one share away from the exact
  teenager the piece is about. The Short Path at a stable public URL, with the
  debrief microsite, may quietly become the project's widest-reaching output.

### What it realistically isn't

Not a AAA experience, not a moderated-multiplayer anything, not a
documentary, and not finishable at full scope before it is needed — which is
why the sequencing matters: **vertical slice → Short Path → Full Path**, each
shippable. The trial demonstrated one more realistic constraint worth
recording: AI assistants will *always* drift toward camp and gamification when
unsupervised — the canon docs + `CLAUDE.md` standing orders are not
bureaucracy, they are the only thing standing between the build and
`Clippy.SOG`.

### Source hygiene note (per the working rules)

The trial's `history-reference.js` ships US-frame claims ("26+ states," APA
2009, WHO 2019) — plausible, unverified here, and the wrong lead frame for a
European-grounded piece: `[VERIFY SOURCE]` before reuse, and prefer
RESEARCH_BASE §10's verified European set (8 EU bans; PACE Jan 2026; ECI 1.1M+
signatures → non-binding outcome). The dossier should cite the KB's verified
set only.

---

## 9. Recommendations (decision-ready)

1. **Adopt the Assistant** (§4) with the four guardrails (absent in Stage 1;
   line budget; dismissal-is-data; never the Dossier's voice). → v0.3 Part II.
2. **Adopt one-room-two-cameras** + permanent `?flat=1` fallback (§5.2, §6).
3. **Adopt the computed INTAKE RECORD** over live ledger data (§5.3).
4. **Replace Cuts with Paths**; Short Path is the Assistant's showcase (§5.4).
5. **Harvest the trial** per the §2 table; file `google-simulator.js` with the
   sibling module; treat all trial code as reference-only.
6. **Codify the playfulness law** (§7): `operable | felt` register flag per
   scene; "the frame never plays"; laughter-location as a playtest metric.
7. The Offer's refusal design (P2) is developed in v0.3 Part IV — short
   version: *the Offer cannot be declined on its own side of the screen; the
   only true "no" is the flip.* Agency stays where OQ7 put it.
