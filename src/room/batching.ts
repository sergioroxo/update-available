/**
 * Static batching for the Quest draw-call budget (docs/WEBXR_PERFORMANCE_NOTES:
 * budget ~50–100 calls; the all-box rooms were ~150+).
 *
 * ⚑ S108 — REBUILT 2026-09-05, AND THE OLD SCHEME WAS COSTING MORE THAN IT SAVED.
 *
 * What was here: TWO batch groups. `room-static` took the props that are
 * identical across every space state (`clusterMorph.constantPropIds()`), baked
 * once and never touched; `room-settled` took the variable box props, was torn
 * down before each cascade and rebaked once the state settled. Models were
 * excluded from both, because `assets.ts tintModel` clones a material per mesh
 * instance so they have nothing to share.
 *
 * MEASURED at Era 4, from Room 3's seat and from the turn that faces the whole
 * building — the two poses the review named:
 *
 * | | batches | seat | turned |
 * |---|---|---|---|
 * | two groups, models excluded (what was here) | 137 | 77 | **201** |
 * | one group, rebuilt cleanly, no sharing | 225 | 50 | 165 |
 * | one group + shared materials, models excluded | 108 | 54 | 123 |
 * | **one group + shared materials + models** | 138 | 55 | **102** |
 *
 * ⚑ THE FIRST ROW HAD 61 DUPLICATE BATCHES. Not near-duplicates — pairs holding
 * *the same mesh instance objects*, identical in every field `BatchManager.
 * prepare()` tests (material, layer, vertex format, shader defs, stencil, scale
 * sign, cast-shadow, parameters). Only 67 distinct material signatures existed
 * across 364 batched mesh instances, and the engine had built 137 batches out of
 * them. Every one of those duplicates was a wasted draw call, and 36 of the 201
 * were nothing but that.
 *
 * ⚑ AND `app.batcher.generate()` WITH NO ARGUMENTS MAKES IT WORSE, which is how
 * this was finally cornered: 137 batches → 213 and 201 draw calls → 250, from a
 * call that is supposed to REBUILD. The engine's own `generate()` defaults
 * `groupIds` to `Object.keys(this._batchGroups)` — **strings** — and then decides
 * what to destroy with `groupIds.indexOf(batch.batchGroupId)`, where
 * `batchGroupId` is a **number** (`create()` sets it through `parseInt`). The
 * comparison never matches, nothing is destroyed, and every regeneration appends
 * a fresh copy of every batch on top of the old one. So: **never call
 * `generate()` bare — always `generate([id])` with the numeric id**, and get the
 * batch state to one group so there is only ever one id to pass.
 *
 * WHAT THIS DOES NOW. One group. Materials shared across everything in it by
 * exact signature — which is what lets the MODELS in: three beds, three desks,
 * three chairs, one per room, each carrying its own cloned copy of the same
 * colour, collapse into one batch instead of thirty draw calls. Torn down before
 * a cascade and rebuilt when the state settles, exactly as the settled group
 * was, and every prop gets its material back as a private clone on the way out
 * so the morph can animate freely.
 *
 * ⚑ WHAT MUST NEVER JOIN IT, and why this list is load-bearing. A shared
 * material is shared: writing to it writes to every prop that carries it. Three
 * things in this build write to a prop's material at runtime — the belongings
 * "kept" warm lift, the guide's `emphasis` prop-lift (`app.ts setPropEmphasis`,
 * which writes `emissive` on `h.materials`), and the morph's own colour lerp
 * during a cascade. The morph is handled by the tear-down; the other two are
 * handled by NOT batching those props at all. The caller passes them in
 * `neverBatch`, and the cost is a handful of draw calls in exchange for
 * guaranteed-independent materials — the same trade R28-2c made for belongings
 * alone, now extended to the props the emphasis lift can reach. ⚑ Before this
 * they WERE batched and WERE sharing, so lifting one lit every prop of the same
 * colour in the batch; nobody had reported it because the lift is subtle and the
 * rooms are dim, but it was there.
 *
 * Enabled toggles stay safe: the engine's render component removes/inserts a
 * batched entity on disable/enable and marks the group dirty (regenerated next
 * frame) — so the kit-floppy pickup, ?layout=x's hidden spine, and the Close's
 * whole-root shutdown all keep working, each at the cost of one cheap rebatch.
 *
 * Reinterp-gated by the caller (cluster.ts); the shipped baseline is untouched.
 * ?nobatch=1 disables it for A/B comparison in a headset.
 */
import * as pc from 'playcanvas';
import type { RoomHandles } from './era1room';

const GROUP = 'room-batch';
/** mesh instances hidden because their prop's scale is 0 — see cullAbsentProps at the foot */
const hiddenAbsent = new Set<pc.MeshInstance>();

/**
 * ⚑ THE ENGINE'S OWN ONE-SHOT IS THE THING THAT WAS DOUBLING THE BATCHES.
 *
 * `Application` registers `this.once('prerender', this._firstBatch, this)` in
 * its constructor, and `_firstBatch()` calls `this.batcher.generate()` — the
 * BARE form, whose `groupIds` defaults to `Object.keys(this._batchGroups)`,
 * i.e. **strings**, and which then decides what to destroy with
 * `groupIds.indexOf(batch.batchGroupId)` against a **number**. The comparison
 * never matches, nothing is destroyed, and the call appends a second copy of
 * every batch that already exists.
 *
 * Traced live, in order: our own `generate([0])` → 49 batches · `generate([1])`
 * → 40 · `generate([2])` → 109 · then **`generate()` with no arguments: 109 →
 * 218**. Every one of those extra 109 was a wasted draw call.
 *
 * That one-shot is redundant here in any case: this module generates its own
 * group explicitly, and the engine's `updateAll()` regenerates dirty groups on
 * every frame regardless. So the listener comes off. It is removed through the
 * public event API rather than by patching `generate`, because the bug is in a
 * DEFAULTED ARGUMENT and every other caller in the engine passes ids correctly.
 *
 * ROLLBACK: delete this function and its one call, and expect the batch count —
 * and the draw calls with it — to roughly double.
 */
let engineFirstBatchDisabled = false;
function disableEngineFirstBatch(app: pc.Application): void {
  if (engineFirstBatchDisabled) return;
  engineFirstBatchDisabled = true;
  const a = app as unknown as { _firstBatch?: () => void };
  if (typeof a._firstBatch === 'function') app.off('prerender', a._firstBatch, app);
}

export interface BatchHandle {
  groupId: number;
  /** S398: the group's name (the room's one group, or a cascade's band) */
  group: string;
  /** how many props joined — published as `window.__batchedProps` by cluster.ts */
  joined: number;
  /** every prop in the batch, so the tear-down can give each its material back */
  ids: string[];
  /** the same ids as a Set, for the per-frame cullAbsentProps skip */
  idSet: ReadonlySet<string>;
}

/**
 * Every material a prop actually renders with, box or model alike.
 *
 * A box prop is one render component on the prop's own entity; a MODEL prop is a
 * wrapper whose children carry the render components, and `era1room.ts`'s
 * `PropHandle.material` is then an orphan nothing draws (its own doc says so, and
 * says that reading it instead of `materials` is a real trap). Walking the
 * subtree is the one description that is true of both.
 */
function renderComponents(entity: pc.Entity): pc.RenderComponent[] {
  const out: pc.RenderComponent[] = [];
  entity.forEach((node) => {
    const ent = node as pc.Entity;
    if (ent.render?.enabled) out.push(ent.render);
  });
  return out;
}

/** materials are shared only within this group, so a colour signature is enough */
/** materials that may share one canonical instance in the batch. ⚑ S177: a TEXTURED
 *  material is its own key — the calendar pages (calendarPage.ts) are white-diffuse
 *  with a map, and keyed by colour alone Vera's page was swapped for the plain white
 *  of the paper beside it: the room showed a blank calendar with its rings. */
const mapIds = new WeakMap<pc.Texture, number>();
let nextMapId = 1;
function materialKey(m: pc.StandardMaterial): string {
  const c = m.diffuse; const e = m.emissive;
  const maps = [m.diffuseMap, m.emissiveMap, m.opacityMap, m.normalMap, m.metalnessMap, m.glossMap, m.aoMap, m.lightMap];
  const signature = maps.map(map => {
    if (map && !mapIds.has(map)) mapIds.set(map, nextMapId++);
    return map ? mapIds.get(map) : 0;
  }).join(':');
  return [
    signature, m.opacityMapChannel, m.emissiveMapChannel, m.diffuseVertexColor, m.emissiveVertexColor,
    m.useLighting ? 1 : 0,
    m.blendType,
    m.opacity.toFixed(4),
    c.r.toFixed(5), c.g.toFixed(5), c.b.toFixed(5),
    e.r.toFixed(5), e.g.toFixed(5), e.b.toFixed(5)
  ].join('|');
}

function hasDrawableScale(e: pc.Entity): boolean {
  const s = e.getLocalScale();
  return Math.abs(s.x) > 0.0001 && Math.abs(s.y) > 0.0001 && Math.abs(s.z) > 0.0001;
}

/**
 * ⚑ S396 (UiB job 28 B4) — ONE DRAW FOR EVERY PLAIN BOX, THE COLOUR CARRIED BY THE VERTICES.
 *
 * The batch shares materials by exact signature, and in this building nearly every box prop has a colour of its own:
 * measured at Vera's worst look back toward the hall (2016, the seated headset mock), after the seat's cull
 * (seatCull.ts), 58 of the 90 draws left were batches and 33 of those held a single prop — a poster's board, the modem,
 * the lamp's shade, a book, the institution's rack, the window pane — each a draw call because its colour is unique.
 * With this, that look draws 63 (tools/s396-drawcalls-probe.mjs; every headset look from every seat is under 75).
 *
 * So a box prop whose material is plain (no map, opaque, nothing but a colour on the defaults era1room.ts `spawnProp`
 * gives it) bakes with a copy of the box mesh whose vertices carry that colour — LINEAR, float32, exactly the value
 * the engine itself would upload as `material_diffuse` (Color.linear) — and with ONE shared material per kind: a lit
 * one (diffuse white × the vertex colour) and an unlit one (emissive white × the vertex colour: the panes, the
 * shades, the LEDs). A box with an emissive tint as well as a diffuse (the apparatus's faint self-light) cannot carry
 * both in one colour stream and keeps its own material, as before. The shader's albedo is `material_diffuse ×
 * vVertexColor` = 1 × the same float: the same picture (the probe renders one frame both ways and counts the pixels
 * that differ — tools/s396-drawcalls-probe.mjs).
 *
 * The conversion lives only while the batch does: `clearBatch` gives every prop its own box mesh and its colour
 * material back BEFORE it clones the private copies the morph animates, and the handle's `material(s)` keep pointing at
 * the colour material throughout, so anything that reads a prop's colour while it is batched reads the true one.
 * Writing to a batched prop's material was already wrong (a shared write — see the header); now it is simply unseen
 * until the next bake. ROLLBACK: `?novcbatch=1`, or delete this block and its two calls.
 */
let vertexColourMerge = true;
/** turn the vertex-colour merge on or off; takes effect at the next bake (cluster `rebake()`) */
export function setVertexColourMerge(on: boolean): void { vertexColourMerge = on; }
export function vertexColourMergeOn(): boolean { return vertexColourMerge; }
/** each converted mesh instance → its own box mesh and its (canonical) colour material, and the group it was baked
 *  into (S398: a cascade bakes the room into several groups at once — see bakeBatch's `opts` — and tearing one down
 *  gives back only its own instances) */
const vcOriginal = new Map<pc.MeshInstance, { mesh: pc.Mesh; material: pc.StandardMaterial; defs: number; group: string }>();
/** the engine computes a mesh instance's shader defines (which vertex streams it has) once, in its constructor; a swapped
 *  mesh must say it carries colours, or the shader ignores them (measured: every merged box came out white) */
type Defs = { _shaderDefs: number };
/** the coloured copies, per source mesh and colour (kept for the life of the app: one reference held here) */
const vcMeshes = new Map<pc.Mesh, Map<string, pc.Mesh>>();
const vcMaterials = new Map<string, pc.StandardMaterial>();
const MATERIAL_DEFAULTS = new pc.StandardMaterial();
const black = (c: pc.Color): boolean => c.r === 0 && c.g === 0 && c.b === 0;
const sameColor = (a: pc.Color, b: pc.Color): boolean => a.r === b.r && a.g === b.g && a.b === b.b;
/** 'lit' (colour = diffuse, no emissive) | 'unlit' (colour = emissive, black diffuse) | null (keeps its own material) */
function vcKind(rc: pc.RenderComponent, m: pc.StandardMaterial): 'lit' | 'unlit' | null {
  if (rc.type !== 'box') return null;
  if (m.diffuseMap || m.emissiveMap || m.opacityMap || m.normalMap || m.aoMap || m.lightMap || m.specularMap || m.glossMap) return null;
  if (m.diffuseVertexColor || m.emissiveVertexColor || m.blendType !== pc.BLEND_NONE || m.opacity !== 1 || m.alphaTest !== 0) return null;
  const D = MATERIAL_DEFAULTS;
  if (m.emissiveIntensity !== D.emissiveIntensity || !sameColor(m.specular, D.specular) || m.gloss !== D.gloss || m.metalness !== D.metalness ||
      m.useMetalness !== D.useMetalness || m.cull !== D.cull || m.depthTest !== D.depthTest || m.depthWrite !== D.depthWrite ||
      m.twoSidedLighting !== D.twoSidedLighting || m.useFog !== D.useFog || m.useSkybox !== D.useSkybox || m.useTonemap !== D.useTonemap) return null;
  if (m.useLighting && black(m.emissive)) return 'lit';
  if (!m.useLighting && black(m.diffuse)) return 'unlit';
  return null;
}
function vcMaterial(kind: 'lit' | 'unlit', from: pc.StandardMaterial): pc.StandardMaterial {
  let v = vcMaterials.get(kind);
  if (v) return v;
  v = from.clone();
  v.name = `room-batch-vc-${kind}`;
  if (kind === 'lit') { v.diffuse = new pc.Color(1, 1, 1); v.diffuseVertexColor = true; v.diffuseVertexColorChannel = 'rgb'; }
  else { v.emissive = new pc.Color(1, 1, 1); v.emissiveVertexColor = true; v.emissiveVertexColorChannel = 'rgb'; }
  v.update();
  vcMaterials.set(kind, v);
  return v;
}
/** a copy of `src` with every stream it has, plus the colour (linear, as the engine uploads a material colour) */
function vcMesh(app: pc.Application, src: pc.Mesh, colour: pc.Color): pc.Mesh {
  const lin = new pc.Color().linear(colour);
  const key = `${lin.r}|${lin.g}|${lin.b}`;
  let per = vcMeshes.get(src);
  if (!per) { per = new Map(); vcMeshes.set(src, per); }
  let mesh = per.get(key);
  if (mesh) return mesh;
  mesh = new pc.Mesh(app.graphicsDevice);
  const n = src.vertexBuffer.getNumVertices();
  for (const el of src.vertexBuffer.format.elements) {
    if (el.name === pc.SEMANTIC_COLOR) continue;
    const data = new Float32Array(n * el.numComponents);
    src.getVertexStream(el.name, data);
    mesh.setVertexStream(el.name, data, el.numComponents, n, pc.TYPE_FLOAT32, false);
  }
  const colours = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) colours.set([lin.r, lin.g, lin.b, 1], i * 4);
  mesh.setColors(colours, 4, n);
  const idx: number[] = [];
  src.getIndices(idx);
  if (idx.length) mesh.setIndices(idx);
  mesh.update(pc.PRIMITIVE_TRIANGLES, true);
  mesh.incRefCount();   // the cache's own reference: a destroyed prop can never take the shared copy with it
  per.set(key, mesh);
  return mesh;
}
/**
 * ⚑ THE MERGED BATCH DRAWS ITS BOXES IN THE ORDER THEIR OWN BATCHES WERE DRAWN. Two boxes that touch (a wall's end
 * against the next wall, a poster's edge flush on the wall) can have exactly the same depth at a pixel, and the depth
 * test then keeps whichever was drawn LAST. The engine draws opaque batches by material id, highest first
 * (`sortMaterialMesh`); inside one batch, primitives go in the order its mesh instances were gathered. Merged as
 * gathered, three such pixels changed winner across the nine photographed headset poses (traced: `poster2` against
 * `wallNorth` in 1997, the two corners of `wallNorth` in 2003). So the merged list is put back in the old order — by
 * each box's own colour material id, highest first, gathering order kept within one colour — on every (re)generation
 * of the group, which the engine also runs by itself when a batched prop is switched on or off.
 */
let prepareOrdered = false;
function orderMergedLikeTheirBatches(app: pc.Application): void {
  if (prepareOrdered || !app.batcher) return;
  prepareOrdered = true;
  type Prepare = (mis: pc.MeshInstance[], dynamic: boolean, maxAabbSize?: number, translucent?: boolean) => pc.MeshInstance[][];
  const b = app.batcher as unknown as { prepare: Prepare };
  const prepare = b.prepare;
  b.prepare = function (this: unknown, ...args: Parameters<Prepare>): pc.MeshInstance[][] {
    const lists = prepare.apply(this, args);
    for (const list of lists) {
      if (list.length < 2 || !vcOriginal.has(list[0])) continue;
      const at = new Map(list.map((mi, i) => [mi, i]));
      const id = (mi: pc.MeshInstance): number => (vcOriginal.get(mi)?.material as unknown as { id: number } | undefined)?.id ?? 0;
      list.sort((x, y) => id(y) - id(x) || at.get(x)! - at.get(y)!);
    }
    return lists;
  };
}
/** every converted instance of one group (S398) back to its box and its colour material */
function restoreVertexColours(group: string): void {
  for (const [mi, o] of vcOriginal) {
    if (o.group !== group) continue;
    vcOriginal.delete(mi);
    if (!mi.mesh) continue;   // destroyed with its prop (the morph re-spawns a box as a model only after a tear-down)
    mi.mesh = o.mesh; (mi as unknown as Defs)._shaderDefs = o.defs; mi.material = o.material;
  }
}

/**
 * Bake the current settled state into ONE batch group. Call only after the morph
 * and layout have resolved; absent props are represented by zero scale and are
 * skipped until a later era brings them back.
 */
export function bakeBatch(
  app: pc.Application, room: RoomHandles, neverBatch: Set<string>,
  /** ⚑ S398 (job 29 A1) — a cascade keeps the room in several groups: the props that hold still in the room's own
   *  group, and the props the cascade animates in BANDS along its sweep (cluster.ts), each batched while it waits and
   *  again once it is done. `name` is the group (default: the room's one group); `only`, when given, the props it may
   *  take. Without them this is exactly the old bake. */
  opts: { name?: string; only?: ReadonlySet<string> } = {}
): BatchHandle | null {
  const batcher = app.batcher;
  if (!batcher) return null;
  const NAME = opts.name ?? GROUP;
  disableEngineFirstBatch(app);
  orderMergedLikeTheirBatches(app);
  for (const mi of hiddenAbsent) mi.visible = true; // a re-shown prop must batch as itself; cullAbsentProps re-hides (cluster.ts runs it after a bake, before the frame draws)
  hiddenAbsent.clear();
  restoreVertexColours(NAME);   // S396: a bake never starts from a converted prop
  const old = batcher.getGroupByName(NAME);
  if (old) batcher.removeGroup(old.id);
  const group = batcher.addGroup(NAME, false, 100);

  const shared = new Map<string, pc.StandardMaterial>();
  const ids: string[] = [];
  let joined = 0;

  for (const [id, h] of room.props) {
    if (opts.only && !opts.only.has(id)) continue;
    if (neverBatch.has(id)) continue;
    if (!h.entity.enabled || !hasDrawableScale(h.entity)) continue;
    const comps = renderComponents(h.entity);
    if (comps.length === 0) continue;
    for (const rc of comps) {
      for (const mi of rc.meshInstances) {
        const m = mi.material as pc.StandardMaterial | undefined;
        if (!m || !m.diffuse) continue;
        const k = materialKey(m);
        const canonical = shared.get(k);
        if (canonical) { if (canonical !== m) mi.material = canonical; }
        else shared.set(k, m);
        // S396: a plain box carries its colour in its vertices and shares one material with every other plain box
        const kind = vertexColourMerge ? vcKind(rc, mi.material as pc.StandardMaterial) : null;
        if (kind) {
          const colourMat = mi.material as pc.StandardMaterial;
          const defs = (mi as unknown as Defs)._shaderDefs;
          vcOriginal.set(mi, { mesh: mi.mesh, material: colourMat, defs, group: NAME });
          mi.mesh = vcMesh(app, mi.mesh, kind === 'lit' ? colourMat.diffuse : colourMat.emissive);
          (mi as unknown as Defs)._shaderDefs = defs | pc.SHADERDEF_VCOLOR;
          mi.material = vcMaterial(kind, colourMat);   // the material setter clears the instance's cached shaders
        }
      }
      rc.batchGroupId = group.id;
    }
    // keep the handle's own view of its materials truthful — `setPropEmphasis`
    // and the belongings lift both read it, and both are excluded above, but a
    // stale array here is exactly the kind of quiet lie this file has cost.
    // (S396: a vertex-coloured box's handle keeps its COLOUR material, never the shared white one.)
    h.materials = comps.flatMap((rc) =>
      rc.meshInstances.map((mi) => (vcOriginal.get(mi)?.material ?? mi.material) as pc.StandardMaterial));
    if (h.materials[0]) h.material = h.materials[0];
    ids.push(id);
    joined++;
  }

  if (joined === 0) { batcher.removeGroup(group.id); return null; }
  // ⚑ ALWAYS the numeric id, never a bare generate() — see the header.
  batcher.generate([group.id]);
  return { groupId: group.id, group: NAME, joined, ids, idSet: new Set(ids) };
}

/**
 * Tear the batch down before any morph edits transforms or materials.
 * `removeGroup()` returns every source render component to the live scene, and
 * each prop gets a PRIVATE clone of its material back, so a cascade can animate
 * one prop's colour without dragging every prop that shared it.
 */
export function clearBatch(
  app: pc.Application, room: RoomHandles, handle: BatchHandle | null
): null {
  const batcher = app.batcher;
  if (!batcher || !handle) return null;
  restoreVertexColours(handle.group);   // S396: each box its own mesh and colour material back, before the private clones below
  batcher.removeGroup(handle.groupId);
  for (const id of handle.ids) {
    const h = room.props.get(id);
    if (!h) continue;
    const comps = renderComponents(h.entity);
    const owned = new Map<pc.StandardMaterial, pc.StandardMaterial>();
    for (const rc of comps) {
      for (const mi of rc.meshInstances) {
        const m = mi.material as pc.StandardMaterial | undefined;
        if (!m) continue;
        let mine = owned.get(m);
        if (!mine) { mine = m.clone(); mine.update(); owned.set(m, mine); }
        mi.material = mine;
      }
      rc.batchGroupId = -1;
    }
    h.materials = comps.flatMap((rc) =>
      rc.meshInstances.map((mi) => mi.material as pc.StandardMaterial));
    if (h.materials[0]) h.material = h.materials[0];
  }
  return null;
}

/**
 * ⚑ DRAWCALLS_ROOMS_EVAL_2026-11-01 — ABSENT PROPS WERE STILL DRAWN.
 *
 * `clusterMorph.ts` marks a prop that does not exist in the current space state
 * by `setLocalScale(0,0,0)` (box props; models/composites use `.enabled`), and
 * `bakeBatch()` rightly leaves those out of the batch. But they stay ENABLED and
 * VISIBLE, so every one is still a culled-in mesh instance: a degenerate,
 * zero-area draw call. Measured at Era 4 from Room 3's seat looking west:
 * 144 draws, 84 of them zero-scale boxes (Room 1's 1997 CRT/keyboard/kit/desk
 * set that era 4 has "removed"). Frustum culling cannot drop them because their
 * AABB is a point and the point is in view.
 *
 * Fix: hide the mesh instance (`mi.visible = false`, the flag the culler reads)
 * while its entity's scale is 0, show it again the moment the scale is back.
 * Touches NO render component, NO layer membership, NO batch — joined props are
 * skipped, so it is safe beside batch bake/clear and the morph's grow-in.
 * ROLLBACK: delete this function and its call in cluster.ts update().
 */
export function cullAbsentProps(room: RoomHandles, joined: ReadonlySet<string> | null): number {
  let hidden = 0;
  const apply = (mis: pc.MeshInstance[], absent: boolean): void => {
    for (const mi of mis) {
      if (absent) { if (mi.visible) { mi.visible = false; hiddenAbsent.add(mi); } hidden++; }
      else if (hiddenAbsent.delete(mi)) mi.visible = true;
    }
  };
  for (const [id, h] of room.props) {
    if (h.model || h.composite || joined?.has(id)) continue;
    const mis = h.entity.render?.meshInstances;
    if (!mis) continue;
    const absent = !hasDrawableScale(h.entity);
    apply(mis, absent);
    // ⚑ S377 — and a box prop's CHILDREN: its print (calendarPage.ts attachPrintToBox — a poster, a window's view)
    //   is a plane parented to the box, so a removed poster's print stayed a culled-in zero-area draw in every later
    //   era (measured: 1997's night view, removed at r2, was one more draw in 2003). No allocation: a box prop's
    //   children are only ever its print.
    for (const c of h.entity.children) { const r = (c as pc.Entity).render; if (r) apply(r.meshInstances, absent); }
  }
  return hidden;
}
