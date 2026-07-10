# Asset licenses

Every 3D model / asset shipped in `assets/` is listed here with its source and
license. **CC0** needs no attribution; **CC-BY** (and anything with an
attribution clause) MUST be credited in the in-piece colophon. No asset lands in
the build without a row here (see `docs/ASSET_PIPELINE.md`).

Aesthetic law still binds imported models: **no textures** — models are recolored
flat to the era palette in code. Pick ONE low-poly family and stick to it (don't
mix art styles between rooms).

| Model key | File | Source | License | Attribution needed | Notes |
|---|---|---|---|---|---|
| bed | bedSingle.glb | Kenney Furniture Kit | CC0 | no | recolored flat per room |
| desk | desk.glb | Kenney Furniture Kit | CC0 | no | |
| chair | chairDesk.glb | Kenney Furniture Kit | CC0 | no | |
| bookcase | bookcaseOpen.glb | Kenney Furniture Kit | CC0 | no | |
| rug | rugRectangle.glb | Kenney Furniture Kit | CC0 | no | |
| nightstand | sideTable.glb | Kenney Furniture Kit | CC0 | no | |
| opening_corkboard | wallCorkboardCreativeTrio.glb | Poly Pizza — "Wall Corkboard" by CreativeTrio | CC0 1.0 | no | geometry only; material overridden flat in code |
| plant | pottedPlant.glb | Kenney Furniture Kit | CC0 | no | Room 1 (C1), new r1-only dressing (windowsill corner) |
| _(staged)_ | lampSquareTable.glb | Kenney Furniture Kit | CC0 | no | copied, not yet wired |

Kit: **Kenney Furniture Kit** (https://kenney.nl/assets/furniture-kit), CC0 — no
attribution required. Authored at ~half real-world scale (pipeline applies ×1.9);
models auto-center on their prop position. Used in the reinterp side rooms
(Room 2 & Room 3) and now Room 1 (C1: desk/chair/bed/bookcase/rug/plant, all
reinterp-only via r1 — era1.json itself stays byte-identical to the shipped
baseline; see `data/room/reinterp_deltas.json`'s r1 block and its C1 comment
in `tools/gen_rooms.mjs`).

## C1 asset-library review (2026-07-10, Sérgio's curated
`/Users/sergiogalvaoroxo/Pc_Simulation/Assests` folder, catalogued in
`docs/reinterp/ASSET_RESISTANCE_DASHBOARD_2026-07-09.md`)

Reviewed for Room 1 (Era 1) furnishing. Only the Kenney `plant` above was
brought in — everything else was declined this session, logged here per the
brief's "side-room consistency wins, log the conflict" instruction:

- **"Computer 90s" / Monitor** — declined twice over: (a) CC-BY (Charlie /
  TheFlyingPotato via Poly Pizza — would need a colophon credit, and Session
  29 already set the house policy of preferring CC0 until that policy is
  explicitly accepted); (b) the CRT is `hero` tier (`era1room.ts`
  `classifyProp`) and the Kenney-model treatment is deliberately reserved for
  `set`/`personal` furniture — side rooms never modeled their own CRT either,
  it stays a crisp raw box by design ("the system's instruments are the most
  defined objects").
- **Desk Lamp** (Household Props 001, CreativeTrio) — declined: the lamp is
  `set` tier and side rooms never modeled theirs (it rides raw-box between
  rooms at E4 in `reinterp_deltas.json` r4). Modeling Room 1's lamp alone
  would break tier-discipline parity with the side rooms.
- **Radio.glb** (Quaternius, confirmed CC0) — considered as a `boombox`
  replacement (same `personal` tier as the modeled bed/rug). Declined: it
  would mix a second low-poly art family into a room whose other models are
  all Kenney Furniture Kit, against this file's own "pick ONE low-poly
  family" law, and no side room has ever modeled an electronics prop (only
  furniture). Logged for a future dedicated electronics-kit pass if Sérgio
  wants it.
- **Books.glb, "Small Stack of Paper", Debris Papers/Paper.glb** — declined
  for Room 1 this session: `book1-3` are `personal` tier but Books.glb's
  Poly Pizza license page wasn't independently re-confirmed as CC0 this
  session (CreativeTrio, unlike the corkboard, whose CC0 1.0 status was
  separately verified in Session 28) — left `[VERIFY SOURCE]`-style
  unresolved rather than guess; `homeworkPile` is deliberately `fog` tier
  (least-defined) and modeling it would work against, not for, that law.
- **Cassette tape variants** — both local copies are CC-BY (Poly by Google);
  declined, mixtape stays a raw box.

Net effect: Room 1's `hero` (CRT, kit) and `set` (lamp) tiers are unchanged
from the shipped baseline in every mode; only `personal`/`set` FURNITURE
(desk/chair/bed/bookcase/rug) plus one new `personal`-tier dressing item
(plant) carry Kenney meshes, matching the side rooms exactly.

## Candidate kits (researched — Sérgio's call)

- **Kenney Furniture Kit** — https://kenney.nl/assets/furniture-kit — **CC0** —
  flat solid-color materials, no textures (fits our law), recolorable in code.
  The recommended default: hero furniture (bed, desk, chair, wardrobe, shelf).
- **Quaternius Ultimate House Interior** — https://quaternius.com/packs/ultimatehomeinterior.html
  — **CC0** — 120+ interior fills; convert to GLB.
- Era-2 PC (Sérgio liked): 410prod "Retro Monitor & PC Tower" (PSX-style) —
  **CC-BY** (needs colophon credit).
