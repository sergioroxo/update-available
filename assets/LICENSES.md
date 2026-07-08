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
| _(staged)_ | lampSquareTable.glb, pottedPlant.glb | Kenney Furniture Kit | CC0 | no | copied, not yet wired |

Kit: **Kenney Furniture Kit** (https://kenney.nl/assets/furniture-kit), CC0 — no
attribution required. Authored at ~half real-world scale (pipeline applies ×1.9);
models auto-center on their prop position. Used in the reinterp side rooms
(Room 2 & Room 3); Room 1 + more pieces are the next pass.

## Candidate kits (researched — Sérgio's call)

- **Kenney Furniture Kit** — https://kenney.nl/assets/furniture-kit — **CC0** —
  flat solid-color materials, no textures (fits our law), recolorable in code.
  The recommended default: hero furniture (bed, desk, chair, wardrobe, shelf).
- **Quaternius Ultimate House Interior** — https://quaternius.com/packs/ultimatehomeinterior.html
  — **CC0** — 120+ interior fills; convert to GLB.
- Era-2 PC (Sérgio liked): 410prod "Retro Monitor & PC Tower" (PSX-style) —
  **CC-BY** (needs colophon credit).
