STATUS: live

# STYLE PROPOSAL — the ideas kept behind, and one direction (2026-09-27)
*Sérgio, 2026-09-26, after the calendar pages: "there are a lot of old ideas of design that were kept behind
and never fully realized in the styling of the rooms. We should consider giving style to the project." And
2026-09-27: "Perfect, would love those mock ups." The mock-ups are runtime sketches (the running room changed
in the browser, photographed before/after — nothing in the build changed): `out/style/m1…m4` (git-ignored; regenerate with the sketch script described below).*

## What was promised and never built
The July style direction (`docs/REINTERP_3D_STYLE_DIRECTION_2026-07-04.md`) had one governing idea — **two
lights fight for one room; the warm light is life, the cold light is the system; across the eras the room
inherits the interface's palette** — and three working rules. What the rooms actually got:

| the idea (July) | built? | what is there now |
|---|---|---|
| E1 · the lamp owns the room, the moon-blue window, the monitor a cold rectangle | **yes** (S-series E1 rig) | the one era that looks designed |
| E2 · "managed" fluorescent daylight, green-white, shadows short; **Restorify's glow tints the desk** | no | 2003 is lit like 1997 with a whiter shade |
| E3 · "platform pastel", the flattering light of a lifestyle brand; light from many small screens | no | 2016 is the same warm orange as 1997 |
| E4 · interface-lit: silhouettes around screens, one warm pocket | partly (grey ambient) | reads as a dim room, not a screen-lit one |
| **Definition = attention**: the system's instruments crisp and colour-true, personal things soft, bevelled, muted | no | every prop has the same flat treatment |
| Poster patches, prop dressing (V2) | no | posters are coloured cards |
| (2026-09-26, D1) **Printed surfaces as pixel art** | calendars only | the posters, book spines, the rug, the sign could all carry it |

## The direction I propose — one sentence
**"The room is drawn in the era's own interface."** Each era's room takes its light from its OS (1997 the lamp;
2003 fluorescent Restorify; 2016 the platform's pastel; 2026 the screens), and every printed thing in it is
pixel art in that era's palette — so a visitor can tell the year from a corner of the room, and can watch the
interface slowly paint the room over thirty years.

## The mock-ups (runtime sketches)
- **M1 · printed surfaces are pixel art** — 1997: Daniel's poster becomes a SUGARWIRE gig poster beside the
  calendar (`m1-before-posters` → `m1-after-posters`). One poster only: the other is merged into the room's
  batch and would not take a texture at runtime; a real pass does it properly.
- **M2 · 2003 inherits Restorify** — managed green-white daylight, the lamp one pool among many, Restorify's
  blue on the desk (`m2-before` → `m2-after-2003-light`). The room feels administered — which is the era.
- **M3 · 2016 platform pastel** — the pink-neutral light of a lifestyle brand (`m3-before` → `m3-after`).
- **M4 · 2026 interface-lit** — the sketch barely moved: the era's rig re-lights the room every frame, so it
  needs doing in the rig itself, not at runtime. Not shown.

## If he says yes — the passes, in order (each walked, each photographed)
1. **The light pass** — the E2/E3/E4 rigs from the July document, in `data/room/cluster.json` (data, not code):
   the mock-ups' values are the starting point.
2. **The printed-surfaces pass** — a pixel-art texture per printed thing, drawn like the calendar pages
   (`src/room/calendarArt.ts`'s method): Daniel's two posters (a band, a film), book spines on the shelf, the rug's
   pattern, Vera's sign and her flag (greyscale, by his 2026-09-05 ruling), Maya's poster wall.
3. **The definition pass** — the system's objects (screens, towers, the phone, the headset) crisp and true;
   personal objects (bed, chair, clothes, mug) softened: bevelled edges, muted fills.
4. Stills of every era, same four places, for his review — before the exhibition set is re-shot.

**His call:** the one-sentence direction (yes / change it), and which pass first.
