# The Fluid Trans Room — Geometry Design (first pass)
STATUS: superseded-by docs/REINTERP_MASTER_PLAN_v2_2026-07-12.md

**Status:** DESIGN PROPOSAL ONLY (doc-first, paper only).
**Date:** 2026-07-03
**Scope:** the spatial/geometric shape of the fluid trans-identity room/cluster — the room that
"shapes and flows" between trans-woman / trans-man / non-binary configurations and sometimes holds
all three at once (master plan §R12-3, confirmed + sharpened §R14-2). Three coupled problems:
1. the seated, gaze-only geometry of a room whose *content is fluid* (no locomotion — CLAUDE.md);
2. facet-switching expressed as **data** (per-era weighting + pull triggers, nothing hardcoded);
3. how the fluid room sits inside the radial cluster once the witness is overhead (resolving C3 with
   R8-3) — and where the "three facets" idea has to be simplified to hit the Quest 3 budget.

**Grounds this builds FROM (do not re-litigate):** §R14-2 (E1 near-dark/structural · E2 trans-fem
lean · E3 all-three + the Lesbian/Trans-masc dilemma beat · E4 trans-fem-led with an optional
trans-masc "phone"); the era-vision doc §3 switching mechanism (default weighting, pull by
cross-cluster send or sustained gaze, convergence reserved for E3); R8-3 (ceiling witness) + C3
(radial cluster geometry); the aesthetic laws (selective fidelity, register laws, no score/frame,
Quest budget).

---

## 0. Grounding — what is true today (cited)

- **The room is seated and front-facing.** `EYE = { x:0, y:1.16, z:0.7 }` (`app.ts:28`); the lead
  machine is one CRT at `SCREEN = { w:0.4, h:0.3, x:0, y:1.08, z:0 }` (`app.ts:24`); the witness wall
  today sits *behind* the player at `WITNESS = { …, z:3.4 }` (`app.ts:26`). The only bodily ask is the
  turn/glance (FLIP; `FLIP_SECONDS = 0.9`, `app.ts:22`). **No locomotion, ever** (CLAUDE.md).
- **The witness is moving to the ceiling.** R8-3 (ADOPTED as leaning design): the watcher occupies
  heaven's position, **glance-only presence, never reading**, and this **frees the full 360° horizontal
  band for the lead room + alcoves** — it is the thing that resolves the C3 collision (archive
  §R8-3:553–567). The readable *record* migrates to the assistants + flat-mode surfaces (F1); the
  ceiling carries presence (light, the eye-motif lineage, a hum), not text.
- **C3's candidate arc layout (a sketch, not a decision):** front = the lead machine (unchanged);
  rear 180° = witness (now *up*, per R8-3); alcoves on the lateral arcs (~±70°, ±110°) so approaching
  the witness hemisphere reads colder (master plan §1.2 C3:67–74).
- **The cluster count leans 3, with the trans room as the fluid one** (§R12-3): not a fixed
  pink/blue/white tinted split — a room that shapes and flows and "sometimes holds all three at once."
- **The lead identity shifts per era** (R8-1 flow model, archive §R8-1:504–527): E1 teen → E2 Daniel →
  E3 Vera (lesbian) → E4 Maya (trans-feminine). So the trans room is an **alcove** in E1–E3 and
  effectively the **front/lead room** in E4 (Maya's own room already *is* the trans-feminine facet —
  era-vision §2 E4).
- **Config-as-geometry is already an accepted pattern.** `CANVAS_BY_ERA` (ERA3_ROOM_AND_SCREEN_DESIGN
  §1.3) established that a typed per-era spec const is *geometry/config, not display text*, so it does
  not violate the data-JSON law. The morph grammar (`EraMorph`) already lerps pos/scale/color per prop
  with a glitch window and **reuses existing entities rather than reallocating** — the discipline this
  doc inherits for facet-swapping.
- **The budget is hard.** ≤75k tris, ≤60 draw calls, 72 Hz floor, **≤3 hero objects per scene on
  Quest**, no realtime shadows, render-texture uploads on dirty only (CLAUDE.md aesthetic laws).
- **Selective fidelity + register laws.** `hero | set | fog`; the *system's instruments* are the most
  defined objects, the person is soft; `felt` scenes render bare (no assistant, no satire, no
  mechanics); the frame never plays (no quest popups/scores). The witness side is the sharp side.

The through-line problem: **the piece has never had to build a room whose *content* is a variable.**
Every room to date is a fixed dressing that morphs once per era. The fluid trans room asks for a room
whose foregrounded meaning changes *within* an era, driven by data and gaze — without adding
locomotion, without multiplying azimuths, and without blowing the hero budget on three simultaneous
objects.

---

## 1. The spatial shape — one niche, three facet-STATES (not three sub-rooms)

### 1.1 The load-bearing call: facets are states of one volume, not places you go

A seated, gaze-only player cannot walk a three-part room. The tempting literal reading of "holds all
three" — three sub-alcoves the player physically approaches — is wrong on three counts: it needs three
distinct azimuths (three turns = neck cost, brushing the locomotion line), it triples the geometry, and
it re-freezes into exactly the fixed split §R12-3 rejected.

**Proposal: the fluid trans room is a single alcove footprint whose *state* is which facet is
foregrounded.** The player turns **once** to face the trans niche; the facet resolves *in place* — via
light, one hero object, and a set-dressing skin — and recedes as they look away. This is the ◆2
spotlight law (gaze/turn/click, never locomotion) applied to *meaning* instead of to *position*. One
niche, one azimuth, N states. "All three at once" is then not three places but one **state** of the
niche (§1.4).

### 1.2 The niche, geometrically

A shallow niche on a lateral arc (azimuth decided in §3), sized to be read in a single gaze cone from
`EYE` without a head-sweep. Internally, three **facet stations** share one shallow shelf/plinth line
within ~±15° of the niche's center azimuth — close enough that any one, foregrounded alone, sits dead
ahead of the gaze, and all three, lit together (E3 only), read as a shallow **triptych** in one cone.

Each facet station is, by default, a **fog-tier silhouette** — a shared low-poly "unresolved" shell,
deliberately underdefined (the apparatus hasn't resolved this person yet; the softness is the content,
per E1's whole logic). Foregrounding a facet promotes exactly one station to **hero tier**: its single
hero object lights, its skin (era-palette tokens only, never invented) resolves, its debrief/dossier
arms. This is selective fidelity doing thematic work: **the hero object is always one of the
apparatus's sorting instruments, never the person** — the person stays soft/absent, which is precisely
the E3 "addressed-around, never as subject" beat rendered as geometry.

### 1.3 The per-era default state (from §R14-2, confirmed)

| Era | Default niche state | The one hero object (the apparatus's instrument) | Other facets |
|---|---|---|---|
| **E1 · 1997** | **near-dark, structural-only** | the *same-assigned-sex-mentor rule* as a **locked-door / mentor-assignment placard** (the one legible thing; not identity-specific) | all facets fog; no facet foregrounded — the darkness *is* the content |
| **E2 · 2003** | **leans trans-feminine** | the *"homosexual continuum" counselling diagram* (dossier-only imagery) | trans-masc = fog silhouette (erasure); non-binary = absent (not yet legible to the apparatus) |
| **E3 · 2016** | **all three at once (earned)** | trans-fem: the *HOPE-2016 audio page* (voices ABOUT her while she is absent — `felt`); trans-masc: the *"first naming, still wrong" parent/family resource stack*; non-binary: the *sorting "buckets"* (male/female/**transgender**/parents — its own bucket for the first time) | + the **Lesbian/Trans-masc dilemma** cross-send from Vera's lead room (§2 pull) |
| **E4 · present** | **trans-fem-LED = Maya's front room IS the facet** (no separate trans-fem niche) | in the niche: non-binary: *still-segregated "males"/"women" on-demand courses* (the binary outlasting its own audience) | trans-masc: the **optional "phone"** — a dim side prop, interactable only if sought; trans-fem content lives in Maya's front room, not here |

Two of these states cost almost nothing (E1 near-dark = zero hero objects; E2/E4 = one). Only **E3
spends the whole hero budget** — which §4 shows is affordable *only* as a spotlight beat.

### 1.4 The "all three at once" state (E3), and why it is earned here

E3 is the one era the niche promotes all three stations to hero tier simultaneously: the triptych
lights as one. Dramaturgically this is earned, not permitted — 2016 is when the apparatus's own
categories multiply (the Sides A/B/X/Y chart debuts *complete* the same year, inside Vera's lead room;
the ministry "buckets" give "transgender" its own box for the first time). The niche's facets
multiplying in the same year the chart multiplies should **visibly rhyme** — the same sorting instinct
staged twice, once as Vera's chart, once as the niche's architecture (era-vision §2 E3). Reserve the
three-at-once state for this beat; everywhere else the niche shows one facet (or, E1, none).

**The Lesbian/Trans-masc dilemma (§R14-2, now well-grounded via R14-3's butch/FTM "borderland"):** this
is a *connective* beat, not a fourth station. Geometrically it is best expressed as a **shared edge**
between Vera's lead room (front) and the trans-masc station in the niche — a sightline or a single
object that belongs to both (a mis-filed folder / wrong-category placement, the borderland literature's
recurring motif). It is triggered as a cross-cluster send (§2), and it renders `felt` — bare, no
mechanics. Copy PLACEHOLDER until Sérgio's voice pass, like every facet.

---

## 2. Facet-switching as DATA (per-era weighting + pull triggers)

### 2.1 The data shape (proposed)

Nothing about which facet leads is hardcoded. Each era carries a facet table. **Recommendation: it
lives in the era's room JSON** (`data/room/eraN.json`), beside the props it governs, since "prefer
editing data over code" (CLAUDE.md) and the facet objects are already room props. (Alternative: a
typed `TRANS_FACETS_BY_ERA` const, the `CANVAS_BY_ERA` precedent — cleaner typing, but splits facet
state from the props it drives. I lean JSON; flag for Fable.) **All display copy stays in
`data/strings/`; the facet objects' geometry stays in room props; this table is only weights +
trigger config.**

```jsonc
// inside data/room/era3.json (illustrative — ids/values owned by later content briefs)
"transRoom": {
  "_doc": "Fluid trans niche facet table. Weights select the foregrounded facet; pulls perturb them; convergence lights all three.",
  "default": "all",                 // transfem | transmasc | nonbinary | none | all
  "convergence": { "allowed": true },// true ONLY where the beat is earned (E3)
  "facets": {
    "transfem":  { "weight": 1.0, "hero": "hope2016AudioPage", "tier": "hero", "register": "felt" },
    "transmasc": { "weight": 1.0, "hero": "namingStackWrong",  "tier": "hero", "register": "operable" },
    "nonbinary": { "weight": 1.0, "hero": "sortingBuckets",    "tier": "hero", "register": "operable" }
  },
  "pull": {
    "gaze":  { "dwellMs": 2500, "delta": 0.4, "decay": true, "latched": false },
    "sends": ["vera.lesbian_transmasc_dilemma"]   // named beats from a lead room (F1)
  }
}
```

Resolution each dirty frame (not per-frame — state changes are discrete): `foreground = argmax(weight)`
after pulls are applied; if `convergence.allowed` and the top facets are within a tie band, light the
triptych instead. E1's table is `default: "none"` with all `tier: "fog"` and `convergence.allowed:
false`; E2 is `default: "transfem"`, trans-masc `tier: "fog"`, non-binary omitted; E4 omits `transfem`
(Maya's front room carries it) and carries `transmasc` behind the phone.

### 2.2 The three pull triggers (era-vision §3)

1. **Era default weighting** — the documentary lean per year (§1.3). The baseline; always present.
2. **Cross-cluster send (F1)** — a *named* beat from the era's lead room sets a facet's weight to max
   for its duration: E2 Daniel's accountability web brushing the trans-masc near-emptiness; **E3 Vera's
   lesbian room sending into the trans-masc station for the dilemma beat.** This is scripted, legible,
   and authored in `paths.json`-style beat ids — it is how the story, not the player, foregrounds a
   facet.
3. **Sustained gaze/dwell (◆2)** — looking at a fog-tier station raises its weight; look away and it
   **decays** back (never latched, never counted). This is the player-agency lever, and it is the one
   that needs the most care (§2.3).

### 2.3 Ethics/register constraints on the data (non-negotiable)

- **Gaze-pull must never read as a score, streak, collectible, or progress.** It is ambient and
  reversible: the facet resolves *while* you look and recedes when you don't; nothing accrues, nothing
  is displayed as a count, nothing "completes." (`latched:false, decay:true` above is the mechanical
  expression of that law — the frame never plays.)
- **`felt` facets render bare.** The E3 trans-fem "addressed-around" beat is `felt` — when it
  foregrounds, the assistant is absent, no satire, no mechanic; just the room full of voices about a
  person who was never invited into it.
- **All facets build alike; all copy is PLACEHOLDER until Sérgio's voice pass** — the trans-masc station
  is built with the same fidelity as the others (Round 15/16: the consult-gating is retired; Sérgio's
  own pass is the gate, same as every other line in the piece).
- **Traceability (Ethics #10).** Which facet the player dwelt on is a legitimate witness input — but it
  lives in the readable record layer (assistants / flat surfaces), never overhead, and only ever
  reflects what the player actually did.

---

## 3. How the fluid room sits in the radial cluster (C3 + R8-3)

### 3.1 The witness overhead frees the band — the niche gets a lateral arc

With R8-3's ceiling witness, the horizontal 360° is free for the lead machine (front) + the identity
alcoves on the lateral arcs. The fluid trans niche is **one arc position**, not three (§1.1). Candidate
azimuth: **±110° (the colder rear-lateral)** rather than ±70°, because in E1–E3 the trans facet is
mostly absence-/surveillance-shaped — turning toward it *should* read colder, and the approach toward
the (now overhead-anchored) witness presence reinforces that. This matches C3's own candidate
("approaching the witness hemisphere reads colder").

### 3.2 The one real positional move: E4 flips the trans room to the front

In E1–E3 the trans niche is a lateral alcove; in **E4 it is effectively the front room** (Maya leads).
That is a bigger move than a facet swap — it is the **lead-room reassignment** the cluster does every
era (E1 teen → E2 Daniel → E3 Vera → E4 Maya), and it should be **owned by the cluster-morph spec (R9),
not by this room.** This doc's contract with R9: the fluid trans room must be buildable *either* as a
front lead room *or* as a lateral niche from the same facet table — i.e. its facet logic is
position-independent; only its azimuth + hero-budget allowance change with role. When it is the lead
room (E4), the trans-fem facet is carried by Maya's full room and the niche-level table only governs
the *secondary* presences (the non-binary object + the optional trans-masc phone).

### 3.3 The convergence beat borrows the ring

At E3 convergence the niche holds three hero objects — the entire scene hero budget (§4). The rest of
the ring (lead room, other alcoves) must therefore **drop to set/fog tier for that beat.** This is not a
compromise; it *is* the dramaturgy — the whole room's attention gathers onto the three-at-once, the
Sides chart and the buckets rhyming, and everything else dims to let it. The cluster-morph spec should
expose a "spotlight the trans niche" state that dims the ring, reusing the ◆2 spotlight privilege at
cluster scale.

---

## 4. Quest 3 budget — where "three facets" must be simplified (don't assume it fits)

**It does not fit as a steady state. It fits as a spotlight beat.** The hard limit is **≤3 hero objects
per scene** (CLAUDE.md). A cluster scene already wants the lead-room hero + the ceiling presence + alcove
definition. The three-facet niche cannot hold three hero objects *and* leave budget for the lead room.
Consequences, and the simplifications they force:

1. **Default eras spend ≤1 hero object on the niche.** E1 = zero (near-dark). E2/E4 = one (the
   foregrounded facet). The other facet stations are **fog-tier shared silhouettes** — one low-poly
   "unresolved" shell, instanced, re-skinned per station, not three bespoke meshes. Cheap by
   construction and on-thesis (the apparatus hasn't resolved them).
2. **E3 convergence is the only three-hero moment, and it borrows the ring** (§3.3). Budget it as a
   transient state: the ring dims to set/fog, the niche gets all three hero slots, then it releases.
   Never a persistent three-hero scene.
3. **Facet-swap is a material/light change, not a spawn.** Foregrounding a facet toggles a light and
   swaps an emissive/texture region on the *shared* station mesh — it does **not** instantiate geometry
   (the EraMorph discipline: lerp/reuse existing entities, never reallocate on the hot path). This keeps
   **draw calls** flat: the three stations share **one material per era palette** (era theme tokens,
   an atlas region per facet), not three materials. Fog silhouettes share a second material. Two
   materials for the whole niche, not six.
4. **Tris:** fog-tier stations are impostor/very-low-poly shells; only the foregrounded (or, E3, the
   three convergence) objects carry hero geometry. The niche's steady-state tri cost is ~one hero
   object + two impostors — trivial. The convergence spike is bounded because the ring gave up its
   budget for the beat.
5. **Uploads on dirty only.** Facet state changes are **discrete, gaze-/send-driven events**, not a
   per-frame animation — the render-texture upload (any hero object with a screen face) fires on the
   state change, not continuously. No 72 Hz cost between switches.
6. **The E4 trans-masc "phone" is one small prop with a render-texture face**, reusing the existing
   smartphone grammar (R6-1's gay-man "private-group join page" precedent). "Interactable if sought" =
   a hit target that only arms on gaze-intent — **no new locomotion, no new input model.**

**Net budget claim:** the fluid room is affordable **because** it is one niche of states, not three
rooms — *provided* three-at-once is a transient spotlight that borrows the ring, and facet-swaps are
material/light toggles on shared meshes. If any of those three simplifications is dropped, it stops
fitting. That is the honest boundary, not an assumption that it all fits.

---

## 5. Open questions I cannot resolve on paper (for Fable / Sérgio / the consult)

1. **Convergence readability (in-headset).** Can the E3 triptych be read in one gaze cone at the niche
   azimuth, or does it force a head-sweep (neck cost)? The ±15° station spread is a paper guess. **Joins
   the A11 in-headset gate** — cannot be settled here.
2. **Niche azimuth: ±110° vs ±70°.** I lean ±110° (colder, on-thesis for absence/surveillance). But if
   playtest shows ±110° is uncomfortable to turn to repeatedly, ±70° may win on ergonomics at a thematic
   cost. Real trade-off; needs the headset.
3. **Gaze-pull without gamification.** `latched:false, decay:true` is the intended safeguard, but the
   *dwell threshold* and whether an ambient-resolve reads as "discovery" vs "a thing I'm scoring" is a
   feel question. Playtest + Sérgio's read. If it can't be made to feel un-gamified, fall back to
   **send-only** foregrounding (drop trigger #3), which is safer and still fluid.
4. *(Resolved Round 16: all three facets build at full fidelity; the old two-lit-plus-greybox question
   is moot — Sérgio's voice pass gates copy, same as everywhere else.)*
5. **Non-binary thinness in E1/E2.** The NB facet has strong objects at E3 (buckets) and E4 (segregated
   courses) but is genuinely absent earlier (era-vision: NB emerges legibly at E3). Confirm that NB
   *should* be absent in E1/E2 (a deliberate "the apparatus couldn't yet see it" beat) rather than a gap
   to fill. I read it as deliberate; Sérgio to confirm.
6. **Table home: room JSON vs typed const.** §2.1 leans room JSON (data-first, co-located with props);
   the `CANVAS_BY_ERA` precedent argues for a typed const. Low-stakes, but pick one before R9 builds.
7. **Does the niche persist state across eras, or re-instantiate per era?** I propose re-instantiate
   from each era's table (facet weights don't carry over — the apparatus's *categories* reset and
   sharpen per decade, which is the whole arc). Flag for confirmation; it affects whether the
   cluster-morph re-arms the table or lerps it.

---

## 6. What this unblocks

- **R9 (the radial-cluster shell) gains its trans-room contract:** a single niche of facet-states on a
  lateral arc (E1–E3) that the cluster-morph can also instantiate as the front lead room (E4), driven by
  a per-era facet table — position-independent facet logic, azimuth + hero-budget owned by R9.
- **The R6-1 → 12-cell content briefs can be reshaped into the facet table** (§R12-5 item): each era's
  trans anchors become one `facets` block, with the G1 stations flagged `gated` and shipping greybox —
  the content work can proceed on the non-gated (trans-fem, non-binary) facets now, the trans-masc
  facet stays paper until the consult.
- **The moodboard pass (R13-5) has a geometry to dress:** one niche, per-era skins from era palette
  tokens, fog-tier "unresolved" shells, the convergence triptych — concrete surfaces to compose.
- **The budget question is answered honestly enough to build against:** three-facets fits *as a
  spotlight beat that borrows the ring*, not as a steady state — so no one builds toward a
  three-persistent-hero scene that would fail the Quest budget in-headset.

Nothing here is final. It is the first geometry a fluid room could be built from — offered for reaction,
correction, and the four open questions above that only the headset, the consult, or Sérgio can close.
```
