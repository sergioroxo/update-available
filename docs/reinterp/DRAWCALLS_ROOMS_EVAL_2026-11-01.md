STATUS: live

# Draw calls and the open rooms: evaluation (2026-11-01)

Question (Sérgio): "we may need to no longer have the rooms open ... so it doesn't block out the draw calls?"

**Short answer: closing the walls would not lower the draw count at all (measured). The main cause is 84 hidden props that are still drawn, and after that the batches.**

Everything here was measured in this worktree (branch reset to `reinterp` 2edbf5de; the worktree had been created on old `main`, which has no rooms). Probe scripts are `out/probes/dc-*.mjs` (git-ignored). Desktop headless Chrome (SwiftShader), `__drawCalls` read 900 ms after each `__camFree`, seat read from `__camPose()`, URL `?reinterp=1&kiosk=0&era=N&debug=1&descent=0&home=0`. One eye only. The headset's 408 includes both eyes plus extras, so only the RATIOS carry over.

## 1. Cause (three layers, biggest first)

**Layer 1 - hidden props that are still drawn: 84 of the 144 draws at Era 4, Maya's seat, looking west.**
`clusterMorph.ts` removes a box prop in a later era with `setLocalScale(0,0,0)` (lines ~293-294, ~325, ~392). `batching.ts bakeBatch()` rightly leaves those out of the batch (`hasDrawableScale`), but they stay enabled and `mi.visible`. A zero-scale mesh has a one-point bounding box; if the point is in view the culler keeps it and the engine issues a draw call for a triangle of zero area. I read the engine's own per-camera culled list (`layer.getCulledInstances(camera)`): 144 entries = 144 draws. 52 are batches and 92 are single meshes. Of the 92, 84 have world scale 0 (78 in Room 1: the 1997 CRT, keyboard, modem, kit floppy and brochure, lamp, filing cabinet, posters, all "removed" by r2-r4; 3 each in Rooms 2 and 3). Only 8 are real unbatched meshes (plants, desk nodes, stars, status LED).
Looking east from Maya's seat gives ~40 only because Room 1 is behind you, not because anything is blocked.
(Why switching off whole root groups did nothing: the batch meshes hang from `app.root`, not from the era1-room group - see the S270 note in `src/frame/xrComfort.ts` ~185 - so the 52 batches are not in the group you disable.)

**Layer 2 - batches are per material, not per room: 52 of 84 batches drawn at that pose.**
`bakeBatch()` puts every room's props into ONE group (`room-batch`, maxAabbSize 100). PlayCanvas merges by identical material, so "wall cream" in all three rooms is one batch with bounds x -5.7..+5.7 (11 of the 84 batches have half-width >= 4.5 m; 13 of 118 at Era 3). The culler tests a batch as one box, so if ANY part is in view the whole batch is drawn. Also 58 of the 84 batches hold only ONE mesh (50 plain-coloured, 8 textured prints/calendars): beds, desks, headsets, laptops each carry their own tinted material (`assets.ts tintModel` clones one per mesh), so nothing merges. Batching turns 164 mesh instances into 84 batches, not into the ~15 it could.

**Layer 3 - the open walls.** `wallWest` (removed at r3) and `wallEast` (r4) are themselves zero-scale props (2 of the 84 in layer 1). PlayCanvas has NO occlusion culling, so a standing wall does not stop what is behind it from being drawn. Measured (option A): identical counts with the walls kept.

## 2. Options, measured (worst case = max of 16 poses: 8 yaws x pitch 0 and 30)

| Option | E1 | E2 | E3 | E4 | E4 wide view (yaw 90) | E3 wide view (yaw 270) |
|---|---|---|---|---|---|---|
| Baseline (as shipped) | 31 | 42 | 172 | 144 | 144 | 172 |
| **Z** hide absent (zero-scale) props | 28 | 32 | 111 | 66 | 66 | 111 |
| Z + **A** keep the side walls | - | - | 111 | 66 | 66 | 111 |
| **B** batch per room, alone | - | - | 193 | 164 | 164 | 193 |
| Z + **B** | 29 | 34 | 132 | 86 | 86 | 132 |
| Z + **D** one vertex-colour material for plain props (HACK, colours wrong, proves count) | 13 | 18 | 46 | 25 | 25 | 46 |
| Z + **C** rooms you are not in switched off entirely | - | - | 32 | 37 | 17 | 20 |
| Z + **C2** far rooms keep walls/floor/ceiling/windows, lose furniture | - | - | 32 | 38 | 23 | 27 |

Batches alive: Era 4 84 (D: 16), Era 3 118 (D: 27), Era 1 55 (D: 10), Era 2 54 (D: 18); B makes it 112 / 148.

## 3. Reading the numbers

- **Z is free and safe**: Era 4 144 -> 66, Era 3 172 -> 111, Era 2 42 -> 32. No look change, no narrative cost, about 20 lines.
- **A (keep the walls) changes nothing.** Closing the rooms would cost the narrative and break the relocation flights (they pass through the opened walls: `opensWalls` in cluster.ts, the travel-wall fade at cluster.ts ~545-600) and buy zero draw calls. Do NOT do it for performance. A wall only helps if you also stop drawing what is behind it (option C).
- **B makes the worst case WORSE** (E4 66 -> 86, E3 111 -> 132): a material used in three rooms becomes three batches. It helps narrow views (E4 pitch 30 yaw 0: 16 -> 10; E3 yaw 0: 21 -> 10) but the budget is the wide view. Not recommended.
- **D is the big structural win**: Era 4 25, Era 3 46 with Z. The numbers are a hack (every plain material swapped for one grey) to prove the count; real colours need per-mesh vertex colours (section 5).
- **C / C2** (switch off rooms you are not in) gives E4 37-38, E3 32, but it contradicts "rooms you have left keep their SHAPE and one low light" (`_docE4RoomsHeldNotDark`, cluster.json:290) unless the shell stays; C2 keeps the shell and drops the furniture ("the shape rather than the objects" is that doc's own phrase). This is Sérgio's call. It would have to be driven by seat/era and ALL rooms must be on during a relocation flight.

## 4. Recommendation

1. **Ship Z now** (already applied in this worktree; diff below). Biggest gain per line, no narrative cost, no look change.
2. **Then D (vertex-colour batching)** if 66 / 111 is still over budget in the headset. About 25 / 46 with no narrative cost, but real work (section 5) and needs a visual check.
3. **Keep the walls open. Do not use A.** Use C2 only if Sérgio accepts furniture-less held rooms.
4. Do not ship B.

Expected headset effect (ratio only, not a promise): Era 4 wide view 408 -> about 190 with Z (66/144), about 70 with Z+D.

### The exact diff for Z (applied in this worktree)

`src/room/batching.ts`
- line 77-78: module-level `const hiddenAbsent = new Set<pc.MeshInstance>();` under `const GROUP`.
- `BatchHandle` (~line 120): new field `idSet: ReadonlySet<string>`; `bakeBatch` returns `idSet: new Set(ids)`.
- `bakeBatch` (~line 182): before building the group, `for (const mi of hiddenAbsent) mi.visible = true; hiddenAbsent.clear();`
- foot of file (~line 282): new exported `cullAbsentProps(room, joined)`. For each non-model, non-composite prop not in the batch: `mi.visible = false` while `!hasDrawableScale(entity)`, `true` again when the scale returns.

`src/room/cluster.ts`
- line 24: import `cullAbsentProps`.
- line ~82: `const CULL_ABSENT = new URLSearchParams(location.search).get('cullabsent') !== '0';` (A/B switch; delete when happy).
- line ~1136, in `update(dt)` right after the settled-rebatch block: `if (batch && CULL_ABSENT) cullAbsentProps(room, roomBatch?.idSet ?? null);`

Cost: one pass over about 400 props per frame, a scale compare each, a flag flip only on change. It touches no render component, layer or batch. Rollback: delete the function and its call.

### Eval-only switches left in the worktree (do not ship)
- `batching.ts`: `?roomsplit=1` (option B; `BatchHandle.groupIds` and the multi-group `clearBatch` are harmless and correct if kept).
- `clusterMorph.ts` line ~27: `?keepwalls=1` (option A).
- `?cullabsent=0` switches Z off for A/B.
Options C and D were measured by in-page scripts (`out/probes/dc-c.mjs`, `dc-d.mjs`), not by code in `src/`.

## 5. What option D would take (not built)
The batcher splits by material AND vertex format (`batch-manager.js` ~342-353). So: for each plain, lit, opaque, non-textured, non-emissive material, give the mesh instance a copy of its mesh with a COLOR stream equal to that material's diffuse, and set ALL of them to one canonical white material with `diffuseVertexColor = true` (keyed by the rest of `materialKey`, so emissive/blend/lit stay separate). Restore the original mesh and material in `clearBatch`. To verify: (a) gamma - vertex colour and `material.diffuse` must land in the same space; compare before/after screenshots of beds and walls; (b) three vertex formats exist at Era 4 (models with extra streams vs boxes), the copies should share one; (c) belongings glow and emphasis lift write to `h.materials`, but those ids are already `neverBatch`, and the morph's colour lerp runs after `clearBatch`; (d) the 8 textured prints and 5 emissive items stay separate. Floor: about 16 batches at Era 4.

## 6. Risks
- **Flights:** Z does not touch walls or positions. `updateTravelClearance` reads the wall AABB and `present = scale > 1e-5`; Z only flips `mi.visible` on zero-scale props, so the fading wall is unaffected.
- **The Close:** its root shutdown and its own entities (`close-ceiling-stars`, `room-specks`) are not room props or are skipped (batched/model/composite props are skipped).
- **Dollhouse (`xrLayer.ts` ~184, ~276):** copies `_batchList` meshes only and rebuilds if a batch mesh disappears. Z adds and removes no batches. D would be handled the same way; B would change the list per bake, also handled.
- **`xrComfort.ts` ~190-219:** rebakes `moved` groups by `render.batchGroupId`, works for any number of groups. Z unaffected.
- **Grow-in during a cascade:** the sweep runs every frame after `morph.update`, so a prop leaving scale 0 is visible that frame. Tested in-page (`out/probes/dc-grow.mjs`): scale 0 hidden, 0.4 visible, 0 hidden again.
- No realtime shadows in this build, so a hidden mesh instance costs nothing else.
- `npm test` and `tsc --noEmit` pass with the edits. I did not walk the piece or look at screenshots; counts only.

## 7. How to verify in the headset
1. Build with Z. Open `?reinterp=1&era=4&debug=1` on the Quest (debug plate shows draw calls and `batches N/N`). From Maya's seat turn west toward the other rooms, then east. Compare against the same build with `&cullabsent=0` (A/B).
2. Repeat at Era 3 from Vera's seat, looking east across the house (172 -> 111 on desktop).
3. Run the E2 -> E3 and E3 -> E4 relocation flights and watch for props popping in or out. They should not.
4. If a prop that should be visible is missing, load with `&cullabsent=0` to confirm Z is the cause.
5. Frame rate: 48 fps at 408 draws; target 72.

## 8. Full measurements (draw calls, desktop, one eye)
Columns are camera yaw in degrees. Rows: option, pitch. `batches` = batch meshes alive after load.

### Era 1 (seat x=0, batches in baseline 55)
| Option | pitch | yaw 0 | yaw 45 | yaw 90 | yaw 135 | yaw 180 | yaw 225 | yaw 270 | yaw 315 | batches |
|---|---|---|---|---|---|---|---|---|---|---|
| base | 0 | 28 | 20 | 17 | 21 | 19 | 16 | 31 | 26 | 55 |
| base | 30 | 21 | 15 | 12 | 10 | 10 | 11 | 14 | 22 |  |
| Z | 0 | 28 | 20 | 17 | 17 | 13 | 11 | 26 | 26 | 55 |
| Z | 30 | 21 | 15 | 12 | 10 | 10 | 11 | 13 | 22 |  |
| ZB | 0 | 29 | 21 | 18 | 19 | 15 | 13 | 27 | 27 | 57 |
| ZB | 30 | 22 | 16 | 13 | 12 | 12 | 13 | 14 | 23 |  |
| ZD | 0 | 11 | 7 | 7 | 9 | 4 | 4 | 13 | 10 | 10 |
| ZD | 30 | 10 | 8 | 6 | 7 | 6 | 5 | 6 | 10 |  |

### Era 2 (seat x=0, batches in baseline 54)
| Option | pitch | yaw 0 | yaw 45 | yaw 90 | yaw 135 | yaw 180 | yaw 225 | yaw 270 | yaw 315 | batches |
|---|---|---|---|---|---|---|---|---|---|---|
| base | 0 | 34 | 21 | 15 | 34 | 42 | 15 | 24 | 31 | 54 |
| base | 30 | 22 | 15 | 12 | 13 | 10 | 10 | 13 | 24 |  |
| Z | 0 | 29 | 19 | 15 | 30 | 32 | 10 | 19 | 27 | 54 |
| Z | 30 | 22 | 14 | 12 | 13 | 10 | 10 | 12 | 23 |  |
| ZB | 0 | 30 | 20 | 16 | 32 | 34 | 12 | 20 | 28 | 56 |
| ZB | 30 | 23 | 15 | 13 | 15 | 12 | 12 | 13 | 24 |  |
| ZD | 0 | 15 | 9 | 5 | 16 | 18 | 3 | 11 | 14 | 18 |
| ZD | 30 | 11 | 8 | 5 | 9 | 6 | 4 | 5 | 12 |  |

### Era 3 (seat x=-4.4, batches in baseline 118)
| Option | pitch | yaw 0 | yaw 45 | yaw 90 | yaw 135 | yaw 180 | yaw 225 | yaw 270 | yaw 315 | batches |
|---|---|---|---|---|---|---|---|---|---|---|
| base | 0 | 21 | 29 | 39 | 30 | 20 | 79 | 172 | 49 | 118 |
| base | 30 | 21 | 28 | 31 | 24 | 17 | 22 | 33 | 30 |  |
| Z | 0 | 21 | 29 | 39 | 30 | 20 | 56 | 111 | 45 | 118 |
| Z | 30 | 21 | 28 | 31 | 24 | 17 | 22 | 32 | 29 |  |
| ZA | 0 | 21 | 29 | 39 | 30 | 20 | 56 | 111 | 45 | 118 |
| ZA | 30 | 21 | 28 | 31 | 24 | 17 | 22 | 32 | 29 |  |
| B | 0 | 10 | 20 | 32 | 22 | 14 | 79 | 193 | 50 | 148 |
| B | 30 | 10 | 21 | 26 | 15 | 10 | 16 | 30 | 23 |  |
| ZB | 0 | 10 | 20 | 32 | 22 | 14 | 56 | 132 | 46 | 148 |
| ZB | 30 | 10 | 21 | 26 | 15 | 10 | 16 | 29 | 22 |  |
| ZD | 0 | 4 | 7 | 11 | 9 | 4 | 21 | 46 | 15 | 27 |
| ZD | 30 | 4 | 8 | 10 | 7 | 4 | 5 | 6 | 7 |  |
| C | 0 | 10 | 20 | 32 | 22 | 13 | 17 | 20 | 14 | 57 |
| C | 30 | 10 | 21 | 26 | 15 | 8 | 7 | 11 | 9 |  |
| C2 | 0 | 12 | 21 | 32 | 23 | 15 | 20 | 27 | 19 | 62 |
| C2 | 30 | 12 | 22 | 26 | 16 | 10 | 10 | 16 | 14 |  |

### Era 4 (seat x=4.4, batches in baseline 84)
| Option | pitch | yaw 0 | yaw 45 | yaw 90 | yaw 135 | yaw 180 | yaw 225 | yaw 270 | yaw 315 | batches |
|---|---|---|---|---|---|---|---|---|---|---|
| base | 0 | 18 | 40 | 144 | 79 | 20 | 33 | 40 | 29 | 84 |
| base | 30 | 16 | 25 | 28 | 25 | 16 | 24 | 26 | 19 |  |
| Z | 0 | 18 | 36 | 66 | 48 | 20 | 33 | 40 | 29 | 84 |
| Z | 30 | 16 | 25 | 28 | 25 | 16 | 24 | 26 | 19 |  |
| ZA | 0 | 18 | 36 | 66 | 48 | 20 | 33 | 40 | 29 | 84 |
| ZA | 30 | 16 | 25 | 28 | 25 | 16 | 24 | 26 | 19 |  |
| B | 0 | 13 | 40 | 164 | 81 | 14 | 28 | 37 | 25 | 112 |
| B | 30 | 10 | 21 | 26 | 21 | 10 | 18 | 21 | 13 |  |
| ZB | 0 | 13 | 36 | 86 | 50 | 14 | 28 | 37 | 25 | 112 |
| ZB | 30 | 10 | 21 | 26 | 21 | 10 | 18 | 21 | 13 |  |
| ZD | 0 | 7 | 10 | 25 | 19 | 5 | 10 | 11 | 8 | 16 |
| ZD | 30 | 7 | 8 | 8 | 7 | 5 | 7 | 9 | 7 |  |
| C | 0 | 13 | 12 | 17 | 16 | 12 | 28 | 37 | 25 | 50 |
| C | 30 | 10 | 7 | 10 | 9 | 8 | 18 | 21 | 13 |  |
| C2 | 0 | 14 | 17 | 23 | 20 | 15 | 31 | 38 | 26 | 54 |
| C2 | 30 | 11 | 12 | 15 | 13 | 11 | 21 | 22 | 14 |  |
