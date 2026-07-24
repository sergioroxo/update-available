# WebXR performance notes (Quest 3 target)
STATUS: live

*2026-07-06. Distilled from the resources Sérgio sent, mapped to THIS project.
Not switching engines (we stay PlayCanvas + WebXR); these inform the batching /
asset work. Sources at the bottom.*

## The budget we're aiming at

| Metric | Target (standalone Quest) | Where we are |
|---|---|---|
| Draw calls | **~50–100 / frame** | ~150+ (all-box rooms) — **over** |
| Triangles | ~100k (mobile VR) | low (boxes are 12 tris each) — fine |
| Frame time | ~13 ms @ 72 Hz (headroom is less) | n/a until headset test |
| Framerate | 72 Hz floor (90 Hz better) | project law: 72 Hz floor |

**The one number that bites us is draw calls**, not polygons. Every separate box
(each wall, book, desk leg) is ~1 draw call. The fix is *merging*, not *fewer
details*.

## Techniques that apply to us (ranked)

1. **Batch/merge meshes that share a material** — the biggest win. One
   reference scene went 638 → 53 meshes by joining same-material objects. For us:
   `pc.BatchManager` on the static furniture (see `docs/ASSET_PIPELINE.md` for the
   morph caveat — animated props during transitions can't be in a static batch).
2. **Share materials** — every prop of the same palette color should reuse ONE
   material instance so they can batch. (Today we `new StandardMaterial()` per
   prop — a cheap refactor that unlocks batching.)
3. **Delete invisible geometry** — faces/objects the player can never see
   (undersides, backs against walls). Minor for us, but free.
4. **Backface culling** — skip polygons facing away from the camera; helps if
   fill-rate limited (large flat walls up close in VR).
5. **Fixed Foveated Rendering + Multiview** (Quest-specific, Meta docs) — render
   the periphery at lower res / both eyes in one pass. Engine-level; enable when
   we do the headset validation pass.
6. **Draco compression + right-sized textures** — matters once we ship GLB
   models; keep our "no textures, flat color" law and models stay tiny anyway.

## What does NOT apply

- The Meta **AI tooling / AI solutions** links are for building AI *features* into
  Horizon apps — irrelevant here, and our hard law is **no runtime AI / no
  network after load**. Skip.
- WebGPU (webgpufundamentals / the Google codelab) is interesting but a **different
  renderer**; we're on WebGL via PlayCanvas + WebXR. Not switching. Useful only as
  background reading on how draw calls / GPU work.

## Next action

The **static-batch pass** (technique 1–2) is the concrete Quest fix. It's a
focused session, gated by the morph caveat. Independent of the visual model swap.

## Sources (Sérgio, 2026-07-06)
- toji.dev — WebXR scene optimization / reducing draw calls: https://toji.dev/webxr-scene-optimization/#reducing-draw-calls
- Meta Quest WebXR performance: https://developers.meta.com/horizon/documentation/web/webxr-perf/
- Meta WebXR overview: https://developers.meta.com/horizon/documentation/web/webxr-overview/
- WebGPU fundamentals (background): https://webgpufundamentals.org/
- seeles.ai WebXR browser-games guide 2026 (different system; general context): https://www.seeles.ai/resources/blogs/vr-browser-games-webxr-guide-2026
