# 3D ENVIRONMENT — STYLE & CREATIVE DIRECTION v1
STATUS: live

*2026-07-04 · Fable 5 (design author). The art-direction doc for the reinterp 3D world — the creative
argument first, then era-by-era execution, then what builds when. Inherits and never bends: Soft Lo-Fi
doctrine (cozy low-poly, underdefined edges, NOT horror-dark), selective fidelity (hero/set/fog, ≤3 hero
objects), era palettes from `src/desktop/theme/` only, Quest budgets. This doc makes those laws into a
LOOK. Sérgio reacts; v2 follows.*

## 1. The governing idea: TWO LIGHTS FIGHT FOR ONE ROOM

Every room in the piece is lit by two competing temperatures, and the whole visual story is which one is
winning:

- **The warm light is life.** The desk lamp (canon's one constant object — already over-throwing at O2),
  window light, bedding, posters, the mixtape. Warm light falls on soft, underdefined, beveled things.
- **The cool light is the system.** The monitor's glow, the niche's teal, the ceiling witness's eventual
  pale wash. Cool light falls on crisp, defined, saturated things — the system's instruments are the most
  defined objects in the room (existing law, now a LIGHTING law too: *definition follows the cold light*).

**The era arc is the cold light slowly winning.** In E1 the lamp owns the room and the monitor is one
glowing rectangle in a warm world. By E4 the room is lit almost entirely by interface light — the
physical world reduced to silhouettes around screens. This spatializes the digital-vs-physical core canon
(F5: paper → software → platform → ambient AI) without a single line of text: **the room gradually
inherits the interface's palette.** Each era's 3D lighting derives from its OS theme — the world becoming
the screen.

Three working rules that fall out of this:
1. **Light is the narrator.** No UI in the room, ever. Every state change reads as light: lights-on, lamp
   over-throw, facet foregrounding, the witness wake, the graying task's desaturation.
2. **Definition = attention = danger.** The sharper and more color-true an object renders, the more it
   belongs to the apparatus. Personal objects stay soft — slightly oversized bevels, muted fills, edges
   that don't quite resolve. (A visitor should be able to squint and know what's the system's.)
3. **Cozy survives.** Even in E4 the warmth never fully dies — the respite law's visual form. There is
   always one warm pocket the cold hasn't taken (E1: the whole desk; E4: maybe only a mug by the
   keyboard). Finding it should feel like the mixtape resisting the gray.

## 2. Era by era

### E1 · 1997 — the lamp's room (night, warm-dominant)
- **Light rig:** moon-blue window wash (cool, soft, low) + the lamp's amber pool over-throwing wider than
  real + the monitor's pale flicker as the only true cold source. Ratio ~70% warm / 30% cool.
- **Materials:** flat vertex-color low-poly, no textures; bevels large and soft on personal props (bed,
  posters, tape deck); the PC/monitor/kit crisp with tighter bevels.
- **Hero (≤3):** the monitor · the starter kit · the diary. Set: desk, bed, shelf, door. Fog: wall
  clutter, floor items.
- **The niche:** the one cold teal sliver in a warm room — correct as built; it should read as *draft
  coming under a door*, not a feature. Near-dark E1 state stands.
- **Palette anchors:** ERA1 theme tokens; walls take the moon-wash of the theme's blue-greys; the lamp
  pool uses the theme's warmest amber, never a new orange.

### E2 · 2003 — the office-grade daylight (the system institutionalizes)
- **Light rig:** flat, even, slightly green-white "daylight" (the era of fluorescent self-improvement) —
  the lamp still present but now ONE pool among several cool sources. Ratio ~50/50. The room should feel
  *managed*: shadows shorter, corners more visible, less mystery.
- **The tell:** Restorify's screen glow tints nearby objects — the first time interface light colors the
  physical world (paper on the desk catches XP-blue).
- **Hero:** the monitor · the pillow+racket pair · the webcam. The webcam is tiny and the crispest object
  in the room.

### E3 · 2016 — platform pastel (the system becomes pleasant)
- **Light rig:** soft, diffuse, pinkish-neutral ambient — the flattering light of a lifestyle brand.
  Almost shadowless. The lamp's pool now reads *old-fashioned* against it, a leftover.
- **The tell:** light arrives from many small screens (phone, laptop, monitor) rather than one — the cold
  source has multiplied and softened; it doesn't glare anymore, it *moisturizes*.
- **The niche's E3 convergence beat:** the triptych's three facet-lights are the era's most saturated
  moment — the sorting machine literally the brightest thing on screen. The Lesbian/Trans-masc shared-edge
  object sits on the sightline between Vera's room and the niche, lit by BOTH temperatures at once (the
  one object in the piece belonging to two light worlds — that's the dilemma, drawn).
- **Hero:** the polish bench screen · the Sides chart · the niche triptych (borrowing the ring's budget,
  per the geometry doc).

### E4 · present — interface-lit (the cold light has won, almost)
- **Light rig:** ambient near-dark; the room exists as silhouettes and screen-bloom. Every visible surface
  is lit by SOMETHING that computes. Walls barely resolve — the physical world at fog tier.
- **The warm pocket:** one small persistent warm source survives (candidate: the same desk lamp, older,
  moved, still on — nobody turned it off in 30 years). It lights Maya's one un-instrumented corner.
- **The trans-masc phone:** its dark screen catches and reflects the room's cold light — present, quiet,
  interactable if sought (per the geometry doc); when it wakes it adds the room's only *hand-held* pool
  of light.
- **The Close inverts the grammar:** the point-cloud's warm constellation is the lamp's temperature
  finally at cosmic scale — the piece's last image is the warm light winning after all.

## 3. The niche + the ceiling witness (cross-era constants)
- The niche is always the coldest value in its era's palette (teal family), always slightly *behind* the
  era's light logic — a place the room's lighting rules don't fully reach.
- The ceiling witness, when it wakes (O7 first-filing), is a pale, sourceless wash from above — light with
  no lamp, the only light in the piece that casts no shadows. Presence, never reading (R8-3 stands).

## 4. Silhouette & prop language
- Everything reads at silhouette distance: chunky, slightly toy-proportioned, era-recognizable in one
  glance (a CRT is deep; a 2016 laptop is a wedge; the phone is a sliver).
- 90°-step rotations for placement (pixel discipline in 3D); integer-ish spacing; no diagonal clutter.
- No texture maps in the base style: vertex colors + light do all the work. (One sanctioned exception:
  render-texture screens — which conveniently makes *screens the only "detailed" surfaces in the world*,
  the doctrine enforcing itself technically.)

## 5. Build order (each a session; visual passes are cheap to redo, so iterate)
1. **V1 (Opus): the E1 room style pass** — apply §2-E1 to the existing room: the two-temperature rig,
   material/bevel split (soft personal vs crisp system), hero/set/fog assignment, niche as cold sliver.
   The room already has the O2 lamp over-throw; this pass makes the whole room obey it.
2. **V2 (Sonnet, after Sérgio reacts to V1): prop dressing** — the fog-tier clutter set, poster patches,
   bed softening; data-driven placement.
3. **V3+ (per era, later):** E2/E3/E4 rigs when those rooms exist; the niche's per-era relight ships with
   each.

## 6. What needs Sérgio
1. React to §1's governing idea (two lights; the room inherits the interface) — it will steer every pass.
2. Reference images, if any exist in his files, for E1's warmth (films/games whose night-bedroom feel is
   right) — words are enough if not.
3. The E4 warm-pocket candidate (the surviving lamp) — approve or propose different.
