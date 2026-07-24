# Asset pipeline — real low-poly models
STATUS: live

*2026-07-06 (Round 24). Sérgio: "I want only real low-poly models… add asset
pipeline." This is the plumbing that swaps box-furniture for real CC0 low-poly
GLB meshes, without breaking the palette law or the current build.*

## How it works

- **Schema.** Any prop (in `data/room/era1.json` or `data/room/reinterp_deltas.json`)
  may carry a `"model": "<key>"`. If that model is loaded, the prop spawns the
  **mesh**; otherwise it falls back to the colored box from its `size`. So a
  missing asset never breaks the room — it just stays a box.
- **Manifest.** `data/room/models.json` maps each `key` → a GLB file in
  `public/assets/models/`. It is **empty right now**, so every prop is a box (today's
  look). Add entries to turn models on.
- **Loader.** `src/room/assets.ts` preloads the manifest's GLBs at startup
  (`preloadModels`, awaited in `startApp` before the room builds — this is
  asset-load, not a runtime network call, so it respects the no-network law).
  `instantiateModel` clones a model and **recolors it flat** to the prop's
  palette hex (no textures — our aesthetic law).

## Adding a kit (e.g. Kenney Furniture Kit, CC0)

1. Download the kit; export/convert the pieces you want to **GLB** (one mesh per
   file, e.g. `bed_single.glb`, `desk.glb`, `chair.glb`, `wardrobe.glb`).
2. Drop the `.glb` files into `public/assets/models/`.
3. List them in `data/room/models.json`:
   ```json
   { "models": [ { "key": "bed_single", "file": "bed_single.glb" } ] }
   ```
4. Add the `model` key to the matching props. Because rooms are generated, do
   this in `tools/gen_rooms.mjs` (e.g. the bed template prop gains
   `model: 'bed_single'`) and run `npm run rooms`.
5. Record the source + license in `assets/LICENSES.md` (CC-BY → colophon credit).
6. Tune `size` so the mesh reads at the right scale (the model is scaled by the
   prop's `size`, same as a box).

**Pick one low-poly family** and recolor per room — do not mix art styles.

## Draw-call budget (why this matters on Quest) — see WEBXR_PERFORMANCE_NOTES.md

Real models don't reduce draw calls by themselves; **batching** does. The Quest
target is ~50–100 draw calls; our all-box rooms are ~150+. The plan:

1. Ship the models (this pipeline).
2. Add a **static batch** pass: merge all non-animated props that share a
   material into one draw call via `pc.BatchManager` (PlayCanvas). Caveat: the
   `ClusterMorph` cascade animates props during era **transitions**, so batch
   only the settled/static set and rebuild the batch after a morph completes
   (or exclude morph-touched props). This is the next perf session — it needs
   care, not a one-liner, which is why it isn't wired yet.

## Status

- ✅ schema + loader + box fallback + manifest + license file (this session).
- ⛔ actual GLBs not in the repo yet — drop them in per the steps above (or ask
  Claude to fetch a CC0 kit in a follow-up with network access).
- ⛔ batching pass (the Quest draw-call fix) — next perf session.
