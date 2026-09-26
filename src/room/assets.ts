/**
 * Asset pipeline — REAL low-poly models (Round 24; Sérgio: "I want only real
 * low-poly models… add asset pipeline"). Hero furniture becomes CC0 GLB meshes
 * instead of raw boxes, recolored FLAT to the era palette (our no-textures law).
 *
 * Contract: a prop in the room data may carry a `model` key (e.g. "bed_single").
 * At startup we preload every model named in data/room/models.json from
 * public/assets/models/<file> (served at /assets/models/). If the file loads,
 * props with that key spawn the MESH;
 * if the manifest is empty or a file is missing/broken, those props fall back to
 * a colored box — so the build NEVER breaks on a missing asset, and the room
 * looks exactly as it does today until the GLBs are dropped in.
 *
 * Loading happens once, during asset-load (before app.start) — it does NOT
 * violate the no-runtime-network law (that bans calls AFTER load; assets are
 * fine, same as any texture). See docs/ASSET_PIPELINE.md for how to add a kit
 * and the batching step that brings the Quest draw-call budget into range.
 */
import * as pc from 'playcanvas';
import modelManifest from '../../data/room/models.json';

type Scale = number | [number, number, number];
interface ModelEntry {
  key: string; file: string; scale?: Scale; yaw?: number; cx?: number; cz?: number; baseY?: number;
  /** [pitch(x), yaw(y), roll(z)] in degrees — a fixed correction for a model
   *  authored lying in an orientation the prop's own placement `yaw` (Y-axis
   *  only) can never reach on its own. A single axis can only ever swap TWO
   *  of the model's three native extents between world axes (S54's boombox:
   *  pitch/roll alone could put its face toward the seat OR keep its long
   *  axis horizontal, never both — reaching a landscape orientation with the
   *  face still toward the player needed a genuine compound rotation, this
   *  tilt-yaw plus roll). Applied about the model's own recentered pivot,
   *  before the prop's own placement `yaw`. 90°-steps only, per the
   *  aesthetic law — each axis is still a 90°-multiple, just composed. */
  tilt?: [number, number, number];
  /** manual re-seat after `tilt` — rotating a shape around its pivot can
   *  leave that pivot at the shape's new side/edge rather than its base, so
   *  this nudges the tilted shape back onto the shelf/floor. [dx, dy] in the
   *  model's own scaled units; measured live against the real mesh (no 3D
   *  viewer in this pipeline — same method every prior model entry used). */
  tiltOffset?: [number, number];
  /** ⚑ S177 — a printed face on the model (the calendar's page): [x0, y0, x1, y1, z]
   *  in native units, where calendarPage.ts hangs a pixel-art page. */
  face?: [number, number, number, number, number];
}

const containers = new Map<string, pc.Asset>();
const meta = new Map<string, { scale: Scale; yaw: number; cx: number; cz: number; baseY: number; tilt?: [number, number, number]; tiltOffset?: [number, number]; face?: [number, number, number, number, number] }>();

/** preload the manifest's models. Empty manifest → instant no-op (boxes stay). */
export async function preloadModels(app: pc.Application): Promise<void> {
  const entries = (modelManifest.models ?? []) as ModelEntry[];
  // SEQUENTIAL, not Promise.all: the vite dev server occasionally returns
  // index.html for a public file when many land at once (a dev-only race);
  // one-at-a-time + a single retry loads them reliably. Static prod is unaffected.
  for (const e of entries) {
    if (!(await loadOne(app, e))) await loadOne(app, e); // retry once on failure
  }
  // dev aid (?debug=1): which models actually loaded, for the panel/console
  (window as { __modelsLoaded?: string[] }).__modelsLoaded = [...containers.keys()];
}

function loadOne(app: pc.Application, entry: ModelEntry): Promise<boolean> {
  return new Promise((resolve) => {
    const asset = new pc.Asset(`model-${entry.key}-${Date.now()}`, 'container', { url: `assets/models/${entry.file}` });
    asset.once('load', () => {
      containers.set(entry.key, asset);
      meta.set(entry.key, { scale: entry.scale ?? 1, yaw: entry.yaw ?? 0,
        cx: entry.cx ?? 0, cz: entry.cz ?? 0, baseY: entry.baseY ?? 0,
        tilt: entry.tilt, tiltOffset: entry.tiltOffset, face: entry.face });
      resolve(true);
    });
    asset.once('error', () => resolve(false)); // missing/invalid → retry, then box fallback
    app.assets.add(asset);
    app.assets.load(asset);
  });
}

export function hasModel(key: string): boolean { return containers.has(key); }
/** the model's printed face, if it has one (models.json `face`) */
export function modelFace(key: string): [number, number, number, number, number] | undefined { return meta.get(key)?.face; }

function hexToColor(hex: string): pc.Color {
  const n = parseInt(hex.slice(1), 16);
  return new pc.Color(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** how far a model's native diffuse is pulled toward the authored prop colour.
 *  Not a flat override (that would lose the kit's own subtle multi-tone
 *  shading between parts) — a strong blend so a too-light native material
 *  (Sérgio: "the bookcase colour is too light") reads as the intended,
 *  clearly-darker-than-the-wall tone while keeping some native shading. */
const TINT_STRENGTH = 0.8;

/**
 * Recolour a spawned model's OWN materials toward `colorHex` (bug: model props
 * previously ignored their data `color` entirely — native GLB materials were
 * kept verbatim, so e.g. the bookcase read pale/washed-out instead of the
 * authored warm brown). Every mesh instance gets a freshly CLONED material —
 * never mutate the shared/canonical container material, which every other
 * instance of the same model key (e.g. every bookcase in the room) still
 * references (same clone-before-mutate rule as room/batching.ts's
 * clearSettledBatch). */
function tintModel(root: pc.Entity, colorHex: string, partColors?: Record<string, string>): void {
  const tint = hexToColor(colorHex);
  root.forEach((node) => {
    const ent = node as pc.Entity;
    if (!ent.render) return;
    for (const mi of ent.render.meshInstances) {
      const src = mi.material as pc.StandardMaterial | undefined;
      if (!src) continue;
      const clone = src.clone() as pc.StandardMaterial;
      const d = clone.diffuse;
      // ⚑ S177 / R4-29 (his D2, 2026-09-26: "yes do the separate colors") — a
      // part the prop names by its GLB material gets its OWN flat colour, not
      // the 80% pull toward the one prop colour (the lamp read as one brown).
      const part = partColors?.[src.name];
      clone.diffuse = part ? hexToColor(part) : new pc.Color(
        lerp(d.r, tint.r, TINT_STRENGTH),
        lerp(d.g, tint.g, TINT_STRENGTH),
        lerp(d.b, tint.b, TINT_STRENGTH)
      );
      // no-textures law (CLAUDE.md aesthetic laws): every model this pipeline
      // has carried so far ships flat/vertex-color materials already, so this
      // never fired — but an imported GLB is not guaranteed to, and a tinted
      // diffuseMap would just multiply the tint OVER the texture rather than
      // replacing it. Strip it so `tint` always lands as a flat color.
      clone.diffuseMap = null;
      clone.update();
      mi.material = clone;
    }
  });
}

/**
 * Spawn a loaded model at world `pos`, facing `propYaw` (+ the model's own yaw
 * correction). Kenney furniture is authored ~half real-world scale and off its
 * pivot, so the manifest carries `scale` + the native center (`cx`,`cz`,`baseY`)
 * measured from the GLB. We put the model inside a WRAPPER: the model child is
 * shifted so its centre sits at the wrapper origin and its base at the floor;
 * the wrapper is then placed + rotated. Native materials are KEPT AS THE BASE
 * (Kenney's own subtle low-poly tones — Sérgio: "only if very subtle"
 * multi-tone) and, when the prop carries a `colorHex`, TINTED toward it
 * (`tintModel`) rather than replaced outright. The wrapper is what the
 * room/morph transforms — its scale is 1, so the morph can't distort the mesh.
 * Returns null if the model isn't loaded (caller falls back to a box).
 */
export function spawnModel(key: string, pos: number[], propYaw: number, colorHex?: string, scaleOverride?: Scale, partColors?: Record<string, string>): pc.Entity | null {
  const asset = containers.get(key);
  const res = asset?.resource as { instantiateRenderEntity?: () => pc.Entity } | undefined;
  if (!res?.instantiateRenderEntity) return null;
  const model = res.instantiateRenderEntity();
  const m = meta.get(key) ?? { scale: 1, yaw: 0, cx: 0, cz: 0, baseY: 0 };

  // scale may be uniform (number) or per-axis [sx,sy,sz] — the latter lets a
  // piece (e.g. the desk) get wider/deeper without getting taller.
  //
  // ⚑ `scaleOverride` (Session 66) is a PER-PROP scale, and it exists because
  // the manifest scale is per-MODEL-KEY while the same key furnishes three
  // different rooms. Room 2's desk/bookcase/rug were measured this session at
  // 50–99% larger than the box their placement was authored against — which is
  // what put the bookcase through the wall and the bed inside the desk. Room 1
  // carries the identical debt, but Room 1 is the benchmark that currently
  // reads correctly, and silently resizing its furniture to fix Room 2 would
  // trade a known-good room for an unmeasured one. So the correction is
  // applied where it was measured. See the session log for Room 1's inherited
  // debt; ROLLBACK is deleting the four `modelScale` fields in
  // data/room/reinterp_deltas.json.
  const s = scaleOverride ?? m.scale;
  const [sx, sy, sz] = Array.isArray(s) ? s : [s, s, s];
  model.setLocalScale(sx, sy, sz);
  model.setLocalPosition(-m.cx * sx, -m.baseY * sy, -m.cz * sz);
  if (colorHex) tintModel(model, colorHex, partColors);

  // `tilt` rotates the already-recentered model around its own pivot (fixed
  // at this entity's origin) — a correction `yaw` alone can't express, since
  // yaw only ever turns the prop around the vertical axis. See ModelEntry's
  // doc for why `tiltOffset` is then needed too.
  let inner: pc.Entity = model;
  if (m.tilt) {
    const tiltWrap = new pc.Entity(`model-${key}-tilt`);
    tiltWrap.addChild(model);
    tiltWrap.setLocalEulerAngles(m.tilt[0], m.tilt[1], m.tilt[2]);
    const [dx, dy] = m.tiltOffset ?? [0, 0];
    tiltWrap.setLocalPosition(dx, dy, 0);
    inner = tiltWrap;
  }

  const wrap = new pc.Entity(`model-${key}`);
  wrap.addChild(inner);
  wrap.setLocalEulerAngles(0, propYaw + m.yaw, 0);
  wrap.setLocalPosition(pos[0], pos[1], pos[2]);
  return wrap;
}
