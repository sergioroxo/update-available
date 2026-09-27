/**
 * Era-1 room builder — flat-shaded low-poly blockout (SCRIPT_UPDATE v0.7 §2,
 * ERA1_LOGIC v1 §4). Every prop is a colored box read from
 * data/room/era1.json so Sérgio can rearrange the room by editing numbers.
 * Aesthetic law: flat color faces, no textures; pixel art lives on screens.
 *
 * Session 11: the builder now returns ROOM HANDLES (props/lights maps +
 * spawnProp) — the shipped build's EraMorph grammar, ported so the reinterp
 * cluster can morph the SPACE as data deltas over this base (the same
 * deterministic fold the shipped era transitions use).
 */
import * as pc from 'playcanvas';
import layout from '../../data/room/era1.json';
import { hasModel, spawnModel, modelFace } from './assets';
import { attachCalendarPage, attachPrintToBox, type PageEra } from './calendarPage';
import type { PrintId } from './printArt';

/**
 * ⚑ S168 / R3-07 — paint a spawned model in horizontal bands (the rainbow duck:
 * Sérgio, twice — "the duck is still at the top, not pride colours"). The GLB
 * ships one flat material and no colour stream, so the mesh is read back once
 * (positions, normals, indices), given a vertex colour per band of its own
 * height, and swapped in; the cloned material reads the colours. One draw, no
 * new entity. ⚠ never batch a prop whose material something writes to — this
 * writes once at spawn, before any batch is built.
 */
function bandModel(root: pc.Entity, bands: string[]): void {
  root.forEach((node) => {
    const ent = node as pc.Entity;
    if (!ent.render) return;
    // ⚑ a NEW MeshInstance per mesh, not `mi.mesh = …`: the engine reads the
    //   vertex format's `hasColor` into `_shaderDefs` ONLY in the MeshInstance
    //   constructor (playcanvas.mjs, SHADERDEF_VCOLOR), so a mesh swapped in
    //   later renders without its colours, whatever the material says.
    const rebuilt: pc.MeshInstance[] = [];
    for (const mi of ent.render.meshInstances) {
      const src = mi.mesh;
      const pos: number[] = [], nrm: number[] = [], idx: number[] = [];
      src.getPositions(pos);
      src.getNormals(nrm);
      src.getIndices(idx);
      if (pos.length === 0) continue;
      let y0 = Infinity, y1 = -Infinity;
      for (let i = 1; i < pos.length; i += 3) { y0 = Math.min(y0, pos[i]); y1 = Math.max(y1, pos[i]); }
      const span = Math.max(1e-6, y1 - y0);
      const rgb = bands.map((h) => hex(h));
      /**
       * ⚑ S175 — CRISP STRIPES, WHATEVER THE TESSELLATION. Colouring each VERTEX by
       * its band only works on a dense mesh (the duck); a mug's side has vertices at
       * its rim and its foot only, so each face blended violet→red into one mauve
       * gradient and the flag was invisible (Sérgio's 2003 mug). So every triangle
       * is CLIPPED into the band slabs it crosses — a two-plane clip per band, fanned
       * back into triangles, positions and normals interpolated at the cuts — and
       * each piece is flat-coloured by its band. Built once, at spawn.
       */
      const tri = idx.length ? idx : Array.from({ length: pos.length / 3 }, (_, i) => i);
      const hasN = nrm.length === pos.length;
      type V = { p: number[]; n: number[] };
      const outP: number[] = [], outN: number[] = [], outC: number[] = [];
      const lerpV = (a: V, b: V, t: number): V => {
        const n = a.n.map((v, j) => v + (b.n[j] - v) * t);
        const len = Math.hypot(n[0], n[1], n[2]) || 1;
        return { p: a.p.map((v, j) => v + (b.p[j] - v) * t), n: n.map((v) => v / len) };
      };
      /** keep the part of a polygon on one side of the plane y = h */
      const clip = (poly: V[], h: number, keepAbove: boolean): V[] => {
        const out: V[] = [];
        for (let i = 0; i < poly.length; i++) {
          const a = poly[i], b = poly[(i + 1) % poly.length];
          const ina = keepAbove ? a.p[1] >= h : a.p[1] <= h;
          const inb = keepAbove ? b.p[1] >= h : b.p[1] <= h;
          if (ina) out.push(a);
          if (ina !== inb) out.push(lerpV(a, b, (h - a.p[1]) / (b.p[1] - a.p[1])));
        }
        return out;
      };
      const vert = (i: number): V => ({
        p: [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]],
        n: hasN ? [nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]] : [0, 1, 0]
      });
      for (let t = 0; t + 2 < tri.length; t += 3) {
        const face = [vert(tri[t]), vert(tri[t + 1]), vert(tri[t + 2])];
        const ys = face.map((v) => v.p[1]);
        const kLo = Math.max(0, Math.floor(((Math.min(...ys) - y0) / span) * bands.length));
        const kHi = Math.min(bands.length - 1, Math.floor(((Math.max(...ys) - y0) / span) * bands.length));
        for (let k = kLo; k <= kHi; k++) {
          let poly = face;
          if (k > 0) poly = clip(poly, y0 + (span * k) / bands.length, true);
          if (k < bands.length - 1) poly = clip(poly, y0 + (span * (k + 1)) / bands.length, false);
          if (poly.length < 3) continue;
          const c = rgb[k];
          for (let j = 1; j + 1 < poly.length; j++) {
            for (const v of [poly[0], poly[j], poly[j + 1]]) {
              outP.push(v.p[0], v.p[1], v.p[2]);
              outN.push(v.n[0], v.n[1], v.n[2]);
              outC.push(c.r, c.g, c.b, 1);
            }
          }
        }
      }
      const mesh = new pc.Mesh(src.device);
      mesh.setPositions(outP);
      if (hasN) mesh.setNormals(outN);
      mesh.setColors(outC);
      mesh.update(pc.PRIMITIVE_TRIANGLES);
      const m = new pc.StandardMaterial();
      m.diffuse = new pc.Color(1, 1, 1);
      m.diffuseVertexColor = true;
      m.update();
      rebuilt.push(new pc.MeshInstance(mesh, m, ent));
    }
    if (rebuilt.length) ent.render.meshInstances = rebuilt;
  });
}

export interface PropDef {
  id: string;
  pos: [number, number, number] | number[];
  size: [number, number, number] | number[];
  color: string;
  emissive?: boolean;
  /** y-rotation in degrees. Side rooms are rectilinear in their own frame,
   *  rotated whole to their facing (90/270); the base E1 room stays axis-aligned. */
  yaw?: number;
  /** OPTIONAL: a real low-poly model key (assets pipeline, docs/ASSET_PIPELINE.md).
   *  If the model is loaded, this prop spawns the MESH (recolored to `color`);
   *  otherwise it falls back to the box defined by `size`. */
  model?: string;
  /** ⚑ S168 / R3-07 — horizontal colour BANDS painted onto a model, bottom to top
   *  (the rainbow duck's six: D33 permitted the duck its canon colours). The
   *  mesh is rebuilt once with vertex colours; the material reads them. */
  bands?: string[];
  /** ⚑ S177 / R4-29 (his D2) — a flat colour per model PART, keyed by the GLB's
   *  material name (`python3 tools/glb_import.py bounds` lists them): the lamp's
   *  Black / LightMetal / White each get their own era colour instead of all
   *  being pulled toward `color`. Parts not named still tint toward `color`. */
  partColors?: Record<string, string>;
  /** ⚑ S179 — model parts (by material name) that glow in their own colour: a lamp's bulb */
  partGlow?: string[];
  /** ⚑ S177 / R4-27 — a calendar page on a model with a printed `face` (models.json):
   *  which era's month hangs on it (src/room/calendarArt.ts draws the four). */
  page?: PageEra;
  /** ⚑ S179 / R5-02 — a pixel-art print on a BOX prop's front face (a poster, a sign, a flyer):
   *  which one (src/room/printArt.ts). Reinterp only. */
  print?: PrintId;
  /** OPTIONAL per-prop mesh scale, overriding data/room/models.json's per-KEY
   *  scale. Present because one model key furnishes three rooms at different
   *  measured sizes — see spawnModel's note. Set it only from a MEASUREMENT
   *  (the in-engine solver in the Session 66 log), never by eye. */
  modelScale?: number | [number, number, number] | number[];
  /**
   * OPTIONAL: a multi-box assembly under ONE id/entity — a "real model" built
   * from primitives (the CRT/lamp/shelf precedent) rather than a GLB, but as
   * ONE toggleable unit instead of N separate room props. Session 74 (the E4
   * room pass): needed for the phone, whose resting-box id is toggled by
   * `app.ts`'s held-read (`h.entity.enabled = held !== name`, keyed to the
   * literal id `w_phoneDevice`) — extra top-level sibling props would NOT
   * hide when the phone is picked up, so the extra detail has to live INSIDE
   * this prop's own entity instead. Each part's `pos`/`size` is a LOCAL
   * offset from this prop's own `pos`, in the prop's own pre-yaw frame (the
   * wrapper carries `yaw` and rotates every part together, exactly like a
   * `model` wrapper does). This prop's own `size`/`color`/`emissive` above
   * still describe its OVERALL bounding box — room-audit.mjs's box fallback
   * and the OVERLAP/BOUNDS/SURFACE checks read only `pos`/`size`, so they see
   * a composite exactly as they would a plain box, no tool changes needed.
   * Colour does NOT travel through clusterMorph's fold once spawned (same
   * limitation a `model` prop already has, for the same reason: the wrapper's
   * children carry their own fixed materials) — harmless for a prop that is
   * only ever added once and never re-coloured by a later era override.
   */
  parts?: { pos: [number, number, number]; size: [number, number, number]; color: string; emissive?: boolean }[];
}

interface LightDef {
  id: string;
  type: 'omni' | 'directional';
  pos?: [number, number, number];
  rot?: [number, number, number];
  color: string;
  intensity: number;
  range?: number;
}

export interface PropHandle {
  entity: pc.Entity;
  material: pc.StandardMaterial;
  emissive: boolean;
  /**
   * EVERY material this prop actually renders with.
   *
   * For a box prop that is exactly `[material]`. For a MODEL prop it is the
   * model's own per-instance materials (assets.ts `tintModel` clones one per
   * mesh instance, so writing to them touches this prop and nothing else) —
   * and `material` is then an ORPHAN that nothing renders.
   *
   * Session 49 (finding 2): that orphan was a real trap. Anything that lit a
   * prop by writing to `handle.material` — the guide's `emphasis` prop-lift is
   * the live case — worked on boxes and silently did nothing on models, with
   * no error and no visible difference. Read this array instead; it is correct
   * for both kinds.
   */
  materials: pc.StandardMaterial[];
  /** set when this prop is a real model (wrapper entity) — the morph must NOT
   *  drive its pos/scale/color (the model self-places); only its presence. */
  model?: string;
  /** set when this prop is a `parts` composite (wrapper entity, no render of
   *  its own) — same morph restriction as `model`: only presence/position. */
  composite?: boolean;
}

/** the model's real, already-cloned materials (assets.ts tints a clone per
 *  mesh instance, so these are this prop's alone — safe to write to) */
function modelMaterials(wrapper: pc.Entity): pc.StandardMaterial[] {
  const out: pc.StandardMaterial[] = [];
  wrapper.forEach((node) => {
    const ent = node as pc.Entity;
    if (!ent.render) return;
    for (const mi of ent.render.meshInstances) {
      const m = mi.material as pc.StandardMaterial | undefined;
      if (m && !out.includes(m)) out.push(m);
    }
  });
  return out;
}

export interface RoomHandles {
  root: pc.Entity;
  props: Map<string, PropHandle>;
  lights: Map<string, pc.Entity>;
  reinterp: boolean;
}

export function hex(c: string): pc.Color {
  const n = parseInt(c.slice(1), 16);
  return new pc.Color(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/**
 * The §1-rule-2 material split (REINTERP_3D_STYLE_DIRECTION §2-E1): the system's
 * instruments stay crisp & color-true and slightly self-defined; personal props
 * go soft — desaturated, darkened, warm-nudged, so their edges don't fully
 * resolve. Vertex-color/flat only, no textures — the "softness" is colour, not
 * geometry (literal larger bevels = V2 prop dressing). Classification by id.
 */
type StyleTier = 'hero' | 'system' | 'personal' | 'fog' | 'set';

/**
 * ⚑ SESSION 66 — THE ROOM PREFIX, and why Rooms 2 and 3 never looked lived in.
 *
 * This function matched BARE id prefixes (`bed`, `book`, `rug`…), and the side
 * rooms prefix every prop with their own letter: `w_bed`, `w_bookcase`,
 * `e_rug`, `w1doorFront`. So all 83 props in Rooms 2 and 3 fell through to
 * `set` and were rendered colour-true and crisp — **the entire §2-E1 material
 * law has only ever applied to Room 1.** That is most of why Room 2 reads as
 * furniture rather than a life (nothing is soft, so nothing is personal), and
 * all of why its near-black monitor shell renders as an unlit block: `set`
 * leaves the authored near-black diffuse exactly as dark as it was written, in a room whose
 * only light until last session was an invisible ceiling omni.
 *
 * Stripping the prefix is the whole fix; the tier lists below then do the work
 * they were always meant to do in every room at once.
 */
/** `w_bed` → `bed`, `w1doorFront` → `doorFront`, `bed` → `bed` */
const bare = (id: string): string => id.replace(/^[we](_|1)/, '');

function classifyProp(rawId: string): StyleTier {
  const id = bare(rawId);
  const is = (...pre: string[]): boolean =>
    pre.some(p => id.toLowerCase().startsWith(p.toLowerCase()));
  // Session 74 — the headset is Room 3's own device, same budget line as the
  // CRT and the E1 kit (≤3 hero per scene: Room 3 has exactly two, the CRT +
  // the headset — see the session log for the count).
  if (is('crt', 'kit', 'headset')) return 'hero';       // monitor + starter kit + headset (≤3 hero)
  // the apparatus's gear — Room 2's flat panel is the same tier as Room 1's
  // tower: the system's instruments are the most defined objects in the room.
  // S181 — the institution's corner (`inst_*`) is the apparatus's own furniture: crisp, true
  if (is('tower', 'keyboard', 'mouse', 'modem', 'flatPanel', 'inst_',
         'tabletDevice', 'phoneDevice')) return 'system';
  if (is('sodaCan', 'homeworkPile', 'plant_', 'sign',
         // Session 74 — Maya's own small clutter (see data/room/reinterp_deltas.json):
         // minor incidental objects recede exactly like homeworkPile/sodaCan do.
         'earbuds', 'clock', 'cable', 'keys', 'tin')) return 'fog';
  if (is('bed', 'mattress', 'blanket', 'pillow', 'poster', 'boombox',
         'mixtape', 'book', 'cdStack', 'curtain', 'rug',
         // Session 66 — Vera's own things (see data/room/reinterp_deltas.json)
         'mug', 'cardigan', 'slippers', 'papers', 'calendar', 'frame',
         'radio', 'laundry', 'throw', 'notepad', 'lamp2', 'glass',
         // Session 74 — Maya's own things: hers, not Vera's re-coloured (see
         // the E4 room-pass session log for the contract this answers).
         'sketchbook', 'hoodie', 'backpack', 'sneaker', 'cushion',
         'speaker', 'waterBottle', 'glasses')) return 'personal';
  return 'set';                                        // desk/shelf/door/chair/lamp/shell — left true
}

/** a colour back to `#rrggbb` (for handing a muted colour to the model tinter) */
function toHex(c: pc.Color): string {
  const h = (v: number): string => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0');
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
}

/** desaturate → warm-nudge → darken; `amt` scales how far the edge recedes */
function muteColor(c: pc.Color, amt: number): pc.Color {
  const lum = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
  const d = amt * 0.7;
  let r = c.r + (lum - c.r) * d;
  const g = c.g + (lum - c.g) * d;
  let b = c.b + (lum - c.b) * d;
  r = r + 0.05 * amt; b = b - 0.035 * amt;             // personal props live in warm light
  const dark = 1 - amt * 0.16;
  return new pc.Color(clamp01(r * dark), clamp01(g * dark), clamp01(b * dark));
}

/** apply the split to a non-emissive prop material (reinterp only) */
function styleMaterial(material: pc.StandardMaterial, id: string): void {
  switch (classifyProp(id)) {
    case 'personal': material.diffuse = muteColor(material.diffuse, 0.32); break;
    case 'fog':      material.diffuse = muteColor(material.diffuse, 0.50); break;
    case 'hero':     // stays crisp/true; a faint self-emissive keeps it the most-defined thing
      material.emissive = new pc.Color(material.diffuse.r * 0.10, material.diffuse.g * 0.10, material.diffuse.b * 0.10);
      break;
    case 'system':
      // ⚑ Session 66. `system` used to be a no-op ("left color-true"), which is
      // right for a mid-tone instrument and catastrophic for a dark one: Room
      // 2's flat panel is authored near-black, and such a diffuse under a
      // dim rig is not a crisp object, it is a HOLE — Sérgio's "block symbol"
      // on the bed→chair jump, which he reasonably read as a missing glyph.
      // A small ABSOLUTE emissive floor (not a fraction of the diffuse, which
      // would give a black prop nothing) keeps the apparatus's gear readable as
      // an object in any light, and reads as what it physically is: a device
      // that is switched on. Definition still follows the cold light.
      material.emissive = new pc.Color(
        Math.max(material.diffuse.r, 0.16) * 0.34,
        Math.max(material.diffuse.g, 0.16) * 0.34,
        Math.max(material.diffuse.b, 0.20) * 0.34
      );
      break;
    // 'set': left color-true (crisp)
  }
}

/** build one prop + its handle (the morph system spawns through this too). A
 *  prop with a loaded `model` becomes a real low-poly MESH; otherwise a box. */
export function spawnProp(room: RoomHandles, p: PropDef): PropHandle {
  const material = new pc.StandardMaterial();
  if (p.emissive) {
    material.useLighting = false;
    material.diffuse = new pc.Color(0, 0, 0);
    material.emissive = hex(p.color);
  } else {
    material.diffuse = hex(p.color);
    if (room.reinterp) styleMaterial(material, p.id); // §2-E1 soft/crisp split
  }
  material.update();

  // real-model path (asset pipeline, reinterp only) — the model self-places
  // (scaled + centered on pos); otherwise fall back to the box from `size`.
  let e: pc.Entity | null = null;
  let isModel = false;
  let isComposite = false;
  if (room.reinterp && p.model && hasModel(p.model)) {
    const ms = p.modelScale;
    // ⚑ S179 / R5-01 — the muting reaches the MODELS too (his: "I love that detail of the
    //   personal stuff to be muted"). `styleMaterial` only ever styled the box material, so a
    //   modelled bed, mug or notebook kept its full colour while its box-built neighbours
    //   receded. Personal and fog models are handed muted colours (their parts too).
    const tier = classifyProp(p.id);
    const amt = tier === 'personal' ? 0.32 : tier === 'fog' ? 0.5 : 0;
    const mute = (h: string): string => (amt ? toHex(muteColor(hex(h), amt)) : h);
    const parts = p.partColors
      ? Object.fromEntries(Object.entries(p.partColors).map(([k, v]) => [k, mute(v)])) : undefined;
    e = spawnModel(p.model, p.pos as number[], p.yaw ?? 0, mute(p.color),
      Array.isArray(ms) ? [ms[0], ms[1], ms[2]] : ms, parts, p.partGlow);
    if (e) {
      e.name = p.id; isModel = true;
      if (p.bands?.length) bandModel(e, p.bands);
      const face = p.page ? modelFace(p.model) : undefined;
      if (p.page && face) attachCalendarPage(e, face, p.page);
    }
  }
  // the `parts` composite path (see PropDef.parts) — a wrapper with NO render
  // of its own (so batching.ts's existing `!h.entity.render` guard already
  // excludes it, no batching change needed) and one child box per part.
  if (!e && p.parts?.length) {
    e = new pc.Entity(p.id);
    p.parts.forEach((part, i) => {
      const pe = new pc.Entity(`${p.id}-part${i}`);
      pe.addComponent('render', { type: 'box' });
      const pm = new pc.StandardMaterial();
      if (part.emissive) {
        pm.useLighting = false;
        pm.diffuse = new pc.Color(0, 0, 0);
        pm.emissive = hex(part.color);
      } else {
        pm.diffuse = hex(part.color);
        if (room.reinterp) styleMaterial(pm, p.id);
      }
      pm.update();
      if (pe.render) pe.render.material = pm;
      pe.setLocalPosition(part.pos[0], part.pos[1], part.pos[2]);
      pe.setLocalScale(part.size[0], part.size[1], part.size[2]);
      e!.addChild(pe);
    });
    isComposite = true;
  }
  if (!e) {
    e = new pc.Entity(p.id);
    e.addComponent('render', { type: 'box' });
    if (e.render) e.render.material = material;
    if (room.reinterp && p.print) attachPrintToBox(e, p.print);
  }
  if (!isModel) {
    e.setLocalPosition(p.pos[0], p.pos[1], p.pos[2]);
    if (!isComposite) e.setLocalScale(p.size[0], p.size[1], p.size[2]);
    if (p.yaw) e.setLocalEulerAngles(0, p.yaw, 0);
  }
  room.root.addChild(e);
  const h: PropHandle = {
    entity: e,
    material,
    emissive: !!p.emissive,
    // a box renders with `material`; a model or composite renders with its
    // own (tinted/per-part) materials and leaves `material` an orphan (see
    // PropHandle.materials)
    materials: isModel || isComposite ? modelMaterials(e) : [material]
  };
  if (isModel) h.model = p.model;
  if (isComposite) h.composite = true;
  room.props.set(p.id, h);
  return h;
}

export function buildEra1Room(app: pc.Application, reinterp = false): RoomHandles {
  const root = new pc.Entity('era1-room');
  const room: RoomHandles = { root, props: new Map(), lights: new Map(), reinterp };

  for (const p of layout.props as PropDef[]) spawnProp(room, p);

  for (const l of layout.lights as LightDef[]) {
    const e = new pc.Entity(`light-${l.id}`);
    e.addComponent('light', {
      type: l.type,
      color: hex(l.color),
      intensity: l.intensity,
      range: l.range ?? 10,
      castShadows: false
    });
    if (l.pos) e.setLocalPosition(l.pos[0], l.pos[1], l.pos[2]);
    if (l.rot) e.setLocalEulerAngles(l.rot[0], l.rot[1], l.rot[2]);
    root.addChild(e);
    room.lights.set(l.id, e);
  }

  app.root.addChild(root);
  return room;
}
