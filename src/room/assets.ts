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
interface ModelEntry { key: string; file: string; scale?: Scale; yaw?: number; cx?: number; cz?: number; baseY?: number }

const containers = new Map<string, pc.Asset>();
const meta = new Map<string, { scale: Scale; yaw: number; cx: number; cz: number; baseY: number }>();

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
        cx: entry.cx ?? 0, cz: entry.cz ?? 0, baseY: entry.baseY ?? 0 });
      resolve(true);
    });
    asset.once('error', () => resolve(false)); // missing/invalid → retry, then box fallback
    app.assets.add(asset);
    app.assets.load(asset);
  });
}

export function hasModel(key: string): boolean { return containers.has(key); }

/**
 * Spawn a loaded model at world `pos`, facing `propYaw` (+ the model's own yaw
 * correction). Kenney furniture is authored ~half real-world scale and off its
 * pivot, so the manifest carries `scale` + the native center (`cx`,`cz`,`baseY`)
 * measured from the GLB. We put the model inside a WRAPPER: the model child is
 * shifted so its centre sits at the wrapper origin and its base at the floor;
 * the wrapper is then placed + rotated. Native materials are KEPT (Kenney's own
 * subtle low-poly tones — Sérgio: "only if very subtle" multi-tone). The wrapper
 * is what the room/morph transforms — its scale is 1, so the morph can't distort
 * the mesh. Returns null if the model isn't loaded (caller falls back to a box).
 */
export function spawnModel(key: string, pos: number[], propYaw: number): pc.Entity | null {
  const asset = containers.get(key);
  const res = asset?.resource as { instantiateRenderEntity?: () => pc.Entity } | undefined;
  if (!res?.instantiateRenderEntity) return null;
  const model = res.instantiateRenderEntity();
  const m = meta.get(key) ?? { scale: 1, yaw: 0, cx: 0, cz: 0, baseY: 0 };

  // scale may be uniform (number) or per-axis [sx,sy,sz] — the latter lets a
  // piece (e.g. the desk) get wider/deeper without getting taller.
  const s = m.scale;
  const [sx, sy, sz] = Array.isArray(s) ? s : [s, s, s];
  model.setLocalScale(sx, sy, sz);
  model.setLocalPosition(-m.cx * sx, -m.baseY * sy, -m.cz * sz);

  const wrap = new pc.Entity(`model-${key}`);
  wrap.addChild(model);
  wrap.setLocalEulerAngles(0, propYaw + m.yaw, 0);
  wrap.setLocalPosition(pos[0], pos[1], pos[2]);
  return wrap;
}
