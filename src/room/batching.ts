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

export function hasDrawableScale(e: pc.Entity): boolean {
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
      // S402: the palette's dynamic batch the same way, by each prop's own material (see bakePalette)
      const own = vcOriginal.has(list[0]) ? vcOriginal : palOriginal.has(list[0]) ? palOriginal : null;
      // S402: a dynamic batch leaves out a member that is invisible when it is made (an absent prop's cull, which another
      //   caller may run without knowing it is batched); the palette's members are the batch's to draw, at any scale
      if (own === palOriginal) for (const mi of list) if (!mi.visible) { mi.visible = true; hiddenAbsent.delete(mi); }
      if (list.length < 2 || !own) continue;
      const at = new Map(list.map((mi, i) => [mi, i]));
      const id = (mi: pc.MeshInstance): number => (own.get(mi)?.material as unknown as { id: number } | undefined)?.id ?? 0;
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
    if (h.model || h.composite) continue;
    if (joined?.has(id)) {
      // ⚑ S402: a box in the palette's dynamic batch may have a part that is not (its print, drawn alone through the
      //   change): that part is hidden while the box is at 0, as any print is (the box itself is the batch's to draw)
      const own = h.entity.render?.meshInstances;
      if (own?.length && palOriginal.has(own[0])) {
        const absent = !hasDrawableScale(h.entity);
        for (const c of h.entity.children) { const r = (c as pc.Entity).render; if (r && !r.meshInstances.some((mi) => palOriginal.has(mi))) apply(r.meshInstances, absent); }
      }
      continue;
    }
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

/**
 * ⚑ S402 (UiB job 30 Part A, his "Lets keep on the engne work") — THE PROPS IN THEIR MOMENT SHARE DRAWS.
 *
 * S398 batched everything an era change does not animate, and the animated props in bands that leave their batch for
 * their moment. What was left over 75 was the moment itself: at the worst instant of 2016 → 2026 about 55 props are
 * being changed at once, and each drew alone because the morph writes to it every frame (its colour lerps, its scale and
 * place ease, and the glitch flickers its emissive and jitters its size). A static batch bakes a prop's transform and
 * shares its material, so it cannot hold a prop that is being written to.
 *
 * So the animated props of a change go into ONE DYNAMIC batch for the whole change (`bakePalette`). A dynamic batch
 * (the engine's own: `BatchGroup` dynamic) keeps each prop's own node as a bone and reads its world transform every
 * frame, so the morph's position, scale and jitter show exactly as they do on the prop drawn alone. The COLOURS cannot
 * ride a shared material, so each prop draws its colour from a small float texture, the PALETTE: one slot per mesh
 * instance, two texels (its diffuse, its emissive). Its mesh is swapped for a copy whose UVs point at its slot (uv0 at
 * the diffuse texel, uv1 at the emissive texel), and its material for the palette material of its kind: the same
 * material in every other respect (cloned from the first prop of that kind), with diffuse and emissive white and the
 * palette as diffuseMap (uv0) and emissiveMap (uv1). Before every render (`prerender`) the palette is rewritten from
 * each prop's OWN private material — the one the morph and the Close's glitch write to, untouched — converted exactly as
 * the engine converts a material colour into its uniform (`Color.linear`, float32), so the shader computes
 * `1 × texel` where it computed `uniform`: the same numbers. RGBA32F, so the glitch's emissive above 1 is kept as it is.
 *
 * THE PROPS THAT HOLD STILL share the same palette, in a STATIC group of their own (`name-still`): baked once, like the
 * room's group, but where the room's group shares a material only between props of the same colour (the models' wood,
 * carpet and metal were one draw each: 33 of the 79 draws left at 2016 → 2026's worst moment in the headset), the
 * palette's materials are shared across colours. A static batch bakes positions and normals on the CPU exactly as the
 * room's group does, so a model of any scale may join it; nothing is asked of a still prop but to be plain.
 *
 * What may join (`paletteKey`): a mesh instance that is plain — a standard material with no texture, opaque, no custom
 * chunks, a triangle mesh with normals (a model's vertex colour is kept: the slot copy carries the stream as it is
 * stored, and the palette material the flag) — and, in the DYNAMIC group, for anything but a box, a uniform world
 * scale: a dynamic batch turns normals by the bone's own 3×3, a single draw by its inverse transpose, and those agree
 * only for a box's axis normals or a uniform scale. The kind is every other material parameter, so props that differ in
 * anything but colour never share a palette material (one draw per kind and group). A model joins whole or not at all; a
 * box may leave its print out (drawn alone through the change, as it is one draw of its own in any batch). The rest (a
 * calendar page, a model with a part that may not) stays with the S398 bands or the room's group. Nothing that writes to
 * a prop's material needs to know: the palette reads it.
 *
 * Draw order: the merged list is drawn in the order the props' own materials would have been (id, highest first), as
 * the vertex-colour merge does (S396). Measured (tools/s396-drawcalls-probe.mjs --change, the paired render against
 * the old tear-down): no prop in another state at any moment of the four changes; costs and peaks in BUILD_LOG S402.
 * ROLLBACK: `?morphpalette=0` (the S398 bands alone), or delete this block and its calls in cluster.ts.
 */
const PALETTE_W = 256;   // texels a row: a slot is two texels (diffuse, emissive), so 128 slots a row
const PAL_UV_DEFS = pc.SHADERDEF_UV0 | pc.SHADERDEF_UV1 | pc.SHADERDEF_VCOLOR | pc.SHADERDEF_TANGENTS;
interface PalSlot { mi: pc.MeshInstance; rc: pc.RenderComponent; mesh: pc.Mesh; material: pc.StandardMaterial; defs: number; slot: number; group: string }
/** each joined mesh instance → what it had, and its slot */
const palOriginal = new Map<pc.MeshInstance, PalSlot>();
/** the slot copies of a source mesh, per (slot, palette height, primitive) — kept for the life of the app (one reference here) */
const palMeshes = new Map<pc.Mesh, Map<string, pc.Mesh>>();
/** one palette material per kind (the material's every parameter but its colours) */
const palMaterials = new Map<string, pc.StandardMaterial>();
let palTexture: pc.Texture | null = null;
let palData: Float32Array | null = null;
let palRows = 0;
/** each mesh instance's slot, for the life of the app (a destroyed prop's instance simply leaves its slot unused) */
const palSlotOf = new WeakMap<pc.MeshInstance, number>();
let palSlotNext = 0;
/** how many slots have been given out (the probe reads it: the texture holds 1,024 before it must grow) */
export function paletteSlotsGiven(): number { return palSlotNext; }
function slotFor(mi: pc.MeshInstance): number {
  let s = palSlotOf.get(mi);
  if (s === undefined) { s = palSlotNext++; palSlotOf.set(mi, s); }
  return s;
}
const palColour = new pc.Color();
/** the cost of keeping the palette, for the probe: the frames it was rewritten, the time it took (ms), the longest; the bakes */
export const paletteCost = { frames: 0, ms: 0, max: 0, uploads: 0, bakeMs: 0, bakeMax: 0, bakes: 0, selectMs: 0, swapMs: 0, generateMs: 0, meshesMade: 0 };
let paletteSyncHooked = false;

export interface PaletteHandle {
  /** the palette's groups: `name` (dynamic: the props that move) and `name-still` (static: the props that hold still) */
  groupIds: number[];
  group: string;
  /** how many props joined, and which (and how many of them in the static group) */
  joined: number;
  ids: string[];
  idSet: ReadonlySet<string>;
  still: number;
  /** mesh instances (slots) in the batch, and how many palette materials (kinds) they use */
  slots: number;
  kinds: number;
  /** the props offered that could not join, with why (for the probe) */
  skipped: Record<string, string>;
}

/** every standard-material parameter that is not a texture or one of the two colours the palette carries (PlayCanvas
 *  2.19 `standardMaterialParameterTypes`, which the package does not export) */
const PAL_PARAMS = ['ambient', 'aoIntensity', 'aoDetailMode', 'diffuseDetailMode', 'vertexColorGamma', 'specular', 'specularTint', 'occludeSpecular',
  'specularityFactor', 'specularityFactorTint', 'useMetalness', 'metalness', 'enableGGXSpecular', 'metalnessTint', 'useMetalnessSpecularColor',
  'anisotropyIntensity', 'anisotropyRotation', 'gloss', 'glossInvert', 'clearCoat', 'clearCoatGloss', 'clearCoatGlossInvert', 'clearCoatBumpiness',
  'useSheen', 'sheen', 'sheenGloss', 'sheenGlossInvert', 'fresnelModel', 'emissiveIntensity', 'bumpiness', 'normalDetailMapBumpiness', 'heightMapFactor',
  'alphaToCoverage', 'alphaTest', 'alphaFade', 'alphaDither', 'opacity', 'opacityFadesSpecular', 'opacityDither', 'opacityShadowDither', 'reflectivity',
  'refraction', 'refractionTint', 'refractionIndex', 'dispersion', 'thickness', 'thicknessTint', 'attenuation', 'attenuationDistance',
  'useDynamicRefraction', 'cubeMapProjection', 'useIridescence', 'iridescence', 'iridescenceTint', 'iridescenceThicknessTint',
  'iridescenceThicknessMin', 'iridescenceThicknessMax', 'iridescenceRefractionIndex', 'depthTest', 'depthFunc', 'depthWrite', 'depthBias',
  'slopeDepthBias', 'cull', 'blendType', 'useFog', 'useLighting', 'useSkybox', 'useTonemap', 'twoSidedLighting', 'shadowCatcher'] as const;
const PAL_TEXTURED = ['ao', 'aoDetail', 'diffuse', 'diffuseDetail', 'specular', 'specularityFactor', 'metalness', 'anisotropy', 'gloss', 'clearCoat',
  'clearCoatGloss', 'clearCoatNormal', 'sheen', 'sheenGloss', 'emissive', 'normal', 'normalDetail', 'height', 'opacity', 'refraction', 'thickness',
  'iridescence', 'iridescenceThickness', 'light'] as const;

/** the kind of a plain material (every parameter but diffuse and emissive), or why it cannot join */
function paletteKey(m: pc.Material | null | undefined, hasColour: boolean): { key: string } | { why: string } {
  if (!(m instanceof pc.StandardMaterial)) return { why: 'not a standard material' };
  const r = m as unknown as Record<string, unknown>;
  // a vertex colour stays (a model's own colours: the slot copy keeps the stream, the palette material the flag, so the
  //   shader multiplies the same colour into the same texel-for-uniform), and is part of the kind. A flag on a mesh with
  //   no colour stream is inert (the engine reads it only when the mesh has one), and is keyed as off.
  const vc: unknown[] = [];
  for (const t of PAL_TEXTURED) {
    if (r[`${t}Map`]) return { why: `${t}Map` };
    const on = hasColour && !!r[`${t}VertexColor`];
    vc.push(on, on ? r[`${t}VertexColorChannel`] : null);
  }
  if (m.sphereMap || m.cubeMap || m.envAtlas) return { why: 'environment map' };
  // custom chunks only: the engine makes an EMPTY chunk set on any material it has drawn (`hasShaderChunks` is then true),
  //   and a clone copies it — measured: a prop drawn alone once lost its place at the next bake
  const sc = (m as unknown as { _shaderChunks?: { glsl: Map<string, string>; wgsl: Map<string, string>; version: string } | null })._shaderChunks;
  if (sc && (sc.glsl.size || sc.wgsl.size || sc.version)) return { why: 'shader chunks' };
  if (m.blendType !== pc.BLEND_NONE || m.opacity !== 1 || m.alphaTest !== 0) return { why: 'not opaque' };
  const parts: unknown[] = [];
  for (const p of PAL_PARAMS) {
    const v = r[p];
    parts.push(v instanceof pc.Color ? [v.r, v.g, v.b, v.a] : v);
  }
  parts.push(vc);
  return { key: JSON.stringify(parts) };
}

/** one mesh instance: may it join, and as which kind */
function paletteSlotKind(rc: pc.RenderComponent, mi: pc.MeshInstance, moving: boolean): { key: string } | { why: string } {
  if (mi.skinInstance || mi.morphInstance || mi.instancingData) return { why: 'skinned, morphed or instanced' };
  const mesh = mi.mesh;
  const prim = mesh?.primitive?.[0];
  if (!mesh || !prim || prim.type !== pc.PRIMITIVE_TRIANGLES || !mesh.vertexBuffer) return { why: 'not a triangle mesh' };
  const names = mesh.vertexBuffer.format.elements.map((e) => e.name);
  if (!names.includes(pc.SEMANTIC_POSITION) || !names.includes(pc.SEMANTIC_NORMAL)) return { why: 'no normals' };
  // (a still prop goes to the static group, which bakes its normals by the inverse transpose, as the room's group does)
  if (moving && rc.type !== 'box') {
    const s = mi.node.getWorldTransform().getScale();
    const a = Math.abs(s.x), b = Math.abs(s.y), c = Math.abs(s.z), hi = Math.max(a, b, c);
    if (hi > 0 && (Math.abs(a - b) > hi * 1e-4 || Math.abs(a - c) > hi * 1e-4)) return { why: 'non-uniform scale (a batch turns its normals otherwise)' };
  }
  return paletteKey(mi.material, names.includes(pc.SEMANTIC_COLOR));
}

/** the palette texture, at least `slots` slots (rows of 128, the row count a power of two, at least 8: 1,024 slots, more than a
 *  visit gives out, so it is made once — a larger one would make every slot copy again, as their UVs follow its height) */
function paletteTexture(app: pc.Application, slots: number): void {
  let rows = 8;
  while (rows * (PALETTE_W / 2) < slots) rows *= 2;
  if (palTexture && rows <= palRows) return;
  palTexture?.destroy();
  palRows = rows;
  palTexture = new pc.Texture(app.graphicsDevice, {
    name: 'room-palette', width: PALETTE_W, height: rows, format: pc.PIXELFORMAT_RGBA32F, mipmaps: false,
    minFilter: pc.FILTER_NEAREST, magFilter: pc.FILTER_NEAREST, addressU: pc.ADDRESS_CLAMP_TO_EDGE, addressV: pc.ADDRESS_CLAMP_TO_EDGE
  });
  palData = palTexture.lock() as Float32Array;
  palData.fill(0);
  palTexture.unlock();
  for (const m of palMaterials.values()) { m.diffuseMap = palTexture; m.emissiveMap = palTexture; m.update(); }
}

/** the palette material of a kind (cloned from the first plain material of that kind) */
function paletteMaterial(key: string, from: pc.StandardMaterial): pc.StandardMaterial {
  let m = palMaterials.get(key);
  if (m) return m;
  m = from.clone();
  m.name = `room-palette-${palMaterials.size}`;
  m.diffuse = new pc.Color(1, 1, 1);
  m.emissive = new pc.Color(1, 1, 1);
  m.diffuseMap = palTexture; m.diffuseMapUv = 0; m.diffuseMapChannel = 'rgb';
  m.emissiveMap = palTexture; m.emissiveMapUv = 1; m.emissiveMapChannel = 'rgb';
  m.update();
  palMaterials.set(key, m);
  return m;
}

/** a copy of `src`'s first primitive with positions and normals only (compacted to the vertices it uses), and both UV
 *  sets pointing at `slot`'s two texels */
function paletteMesh(app: pc.Application, src: pc.Mesh, slot: number): pc.Mesh {
  const prim = src.primitive[0];
  const key = `${slot}|${palRows}|${prim.base}|${prim.count}|${prim.baseVertex ?? 0}`;
  let per = palMeshes.get(src);
  if (!per) { per = new Map(); palMeshes.set(src, per); }
  let mesh = per.get(key);
  if (mesh) return mesh;
  const pos: number[] = [], nrm: number[] = [];
  src.getPositions(pos); src.getNormals(nrm);
  let idx: number[];
  if (prim.indexed) {
    const all: number[] = []; src.getIndices(all);
    idx = all.slice(prim.base, prim.base + prim.count).map((i) => i + (prim.baseVertex ?? 0));
  } else idx = Array.from({ length: prim.count }, (_, i) => prim.base + i);
  // the vertex colour, if the mesh has one, copied as it is stored (its type and normalisation): a model's own colours
  const cEl = src.vertexBuffer.format.elements.find((e) => e.name === pc.SEMANTIC_COLOR);
  const col: number[] = [];
  if (cEl) src.getVertexStream(pc.SEMANTIC_COLOR, col);
  const cn = cEl?.numComponents ?? 0;
  const remap = new Map<number, number>();
  const P: number[] = [], N: number[] = [], C: number[] = [], out: number[] = [];
  for (const i of idx) {
    let j = remap.get(i);
    if (j === undefined) {
      j = remap.size; remap.set(i, j); P.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); N.push(nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]);
      for (let c = 0; c < cn; c++) C.push(col[i * cn + c]);
    }
    out.push(j);
  }
  const x = (slot % (PALETTE_W / 2)) * 2, y = Math.floor(slot / (PALETTE_W / 2));
  const v = (y + 0.5) / palRows, u0 = (x + 0.5) / PALETTE_W, u1 = (x + 1.5) / PALETTE_W;
  const n = remap.size;
  const uv0 = new Array<number>(n * 2), uv1 = new Array<number>(n * 2);
  for (let k = 0; k < n; k++) { uv0[k * 2] = u0; uv0[k * 2 + 1] = v; uv1[k * 2] = u1; uv1[k * 2 + 1] = v; }
  mesh = new pc.Mesh(app.graphicsDevice);
  mesh.setPositions(P); mesh.setNormals(N); mesh.setUvs(0, uv0); mesh.setUvs(1, uv1); mesh.setIndices(out);
  if (cEl) mesh.setVertexStream(pc.SEMANTIC_COLOR, C, cn, undefined, cEl.dataType, cEl.normalize);
  mesh.update(pc.PRIMITIVE_TRIANGLES, true);
  mesh.incRefCount();   // the cache's own reference (as vcMesh)
  paletteCost.meshesMade++;
  per.set(key, mesh);
  return mesh;
}

/** rewrite the palette from each joined mesh instance's own material; upload only if a value changed */
function syncPalette(): void {
  if (!palOriginal.size || !palTexture || !palData) return;
  const t0 = performance.now();
  const d = palData;
  let changed = false;
  const put = (o: number, c: pc.Color): void => {
    palColour.linear(c);
    const r = Math.fround(palColour.r), g = Math.fround(palColour.g), b = Math.fround(palColour.b);
    if (d[o] !== r || d[o + 1] !== g || d[o + 2] !== b) { d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 1; changed = true; }
  };
  for (const s of palOriginal.values()) {
    const x = (s.slot % (PALETTE_W / 2)) * 2, y = Math.floor(s.slot / (PALETTE_W / 2));
    const o = (y * PALETTE_W + x) * 4;
    put(o, s.material.diffuse);
    put(o + 4, s.material.emissive);
  }
  if (changed) { palTexture.upload(); paletteCost.uploads++; }
  const dt = performance.now() - t0;
  paletteCost.frames++; paletteCost.ms += dt; if (dt > paletteCost.max) paletteCost.max = dt;
}

/**
 * Bake the props `ids` (those that may: see the header) into one dynamic group, `name`. Each joined mesh instance keeps
 * its own material as the colour source (the handle's `material(s)` are left pointing at it), its mesh and material are
 * swapped for its slot copy and its kind's palette material. Returns null if none could join.
 */
export function bakePalette(
  app: pc.Application, room: RoomHandles, ids: Iterable<string>, neverBatch: ReadonlySet<string>,
  /** `moving`: the props something moves or scales through the change (the morph, the glitch) — they go into the
   *  DYNAMIC group, which reads their transforms every frame; every other prop holds still and goes into a STATIC group
   *  (`name-still`), baked once like the room's own group but sharing the palette's materials across colours (without
   *  `moving`, every prop moves). `partial`: the props that may join with only their plain parts (an animated box whose
   *  print is drawn alone: in a band it would draw alone too); any other prop joins whole or not at all, so a model with
   *  one part that may not keeps all its parts in the room's group, sharing its materials there as before. `demote`: a
   *  prop asked to move that the dynamic group cannot take (a model of uneven scale) joins the static one (the warm-up) */
  opts: { name?: string; moving?: ReadonlySet<string>; partial?: ReadonlySet<string>; demote?: boolean } = {}
): PaletteHandle | null {
  const name = opts.name ?? 'room-palette';
  const stillName = `${name}-still`;
  const batcher = app.batcher;
  if (!batcher) return null;
  const t0 = performance.now();
  disableEngineFirstBatch(app);
  orderMergedLikeTheirBatches(app);
  if (!paletteSyncHooked) { paletteSyncHooked = true; app.on('prerender', syncPalette); }
  // as bakeBatch: a hidden (zero-scale) prop must join as itself — and a dynamic batch leaves out whatever is invisible
  //   when it is made, so a prop that grows in from nothing would never be drawn
  for (const mi of hiddenAbsent) mi.visible = true;
  hiddenAbsent.clear();
  restorePalette(name);
  for (const n of [name, stillName]) { const old = batcher.getGroupByName(n); if (old) batcher.removeGroup(old.id); }

  // which props may join, and their mesh instances
  const skipped: Record<string, string> = {};
  type Part = { rc: pc.RenderComponent; mi: pc.MeshInstance; key: string };
  const joins: { id: string; moving: boolean; rcs: pc.RenderComponent[]; mis: Part[] }[] = [];
  for (const id of ids) {
    const h = room.props.get(id);
    if (!h) continue;
    if (neverBatch.has(id)) { skipped[id] = 'never batched'; continue; }
    if (!h.entity.enabled) continue;
    const rcs = renderComponents(h.entity);
    if (!rcs.length) continue;
    // per render component: the prop's own box joins if it is plain; a part that is not (a poster's print, a window's
    //   view: a textured plane parented to the box) stays drawn alone through the change, as each is one draw of its own
    //   in any batch (its texture is its own) — and, unbatched, it follows its box's jitter exactly
    const evaluate = (moving: boolean): { why: string; mis: Part[]; joinRcs: pc.RenderComponent[] } => {
      const mis: Part[] = [];
      const joinRcs: pc.RenderComponent[] = [];
      for (const rc of rcs) {
        if (rc.batchGroupId !== -1) return { why: 'already in a batch', mis, joinRcs };
        const part: Part[] = [];
        let partWhy = '';
        for (const mi of rc.meshInstances) {
          const k = paletteSlotKind(rc, mi, moving);
          if ('why' in k) { partWhy = k.why; break; }
          part.push({ rc, mi, key: k.key });
        }
        // a part may stay out only on a box prop (its print), never on a model (a model part that may not join keeps the
        //   whole model in its band or group, sharing its materials there)
        if (partWhy) { if (rc.entity === h.entity || !h.entity.render || !opts.partial?.has(id)) return { why: partWhy, mis, joinRcs }; continue; }
        mis.push(...part); joinRcs.push(rc);
      }
      return { why: mis.length ? '' : 'no plain part', mis, joinRcs };
    };
    let moving = !opts.moving || opts.moving.has(id);
    let e = evaluate(moving);
    // `demote` (the warm-up, where nothing moves): a prop asked to move that the dynamic group cannot take joins the static one
    if (e.why && moving && opts.demote) { const s = evaluate(false); if (!s.why) { e = s; moving = false; } }
    if (e.why) { skipped[id] = e.why; continue; }
    joins.push({ id, moving, rcs: e.joinRcs, mis: e.mis });
  }
  const slots = joins.reduce((n, j) => n + j.mis.length, 0);
  if (!slots) return null;
  paletteCost.selectMs += performance.now() - t0; const tSwap = performance.now();
  // each mesh instance keeps ONE slot for the life of the app, so its slot copy is made once and reused by every later
  //   bake (the next change, the probe's paired renders, the warm-up's)
  let maxSlot = 0;
  for (const j of joins) for (const { mi } of j.mis) maxSlot = Math.max(maxSlot, slotFor(mi));
  paletteTexture(app, maxSlot + 1);
  const groups = {
    moving: joins.some((j) => j.moving) ? batcher.addGroup(name, true, Number.POSITIVE_INFINITY) : null,
    still: joins.some((j) => !j.moving) ? batcher.addGroup(stillName, false, 100) : null   // 100 m: the room group's own limit
  };
  const kinds = new Set<string>();
  for (const j of joins) {
    for (const { rc, mi, key } of j.mis) {
      const own = mi.material as pc.StandardMaterial;
      const defs = (mi as unknown as Defs)._shaderDefs;
      const slot = slotFor(mi);
      palOriginal.set(mi, { mi, rc, mesh: mi.mesh, material: own, defs, slot, group: name });
      mi.mesh = paletteMesh(app, mi.mesh, slot);
      (mi as unknown as Defs)._shaderDefs = (defs & ~PAL_UV_DEFS) | pc.SHADERDEF_UV0 | pc.SHADERDEF_UV1 | (mi.mesh.vertexBuffer.format.hasColor ? pc.SHADERDEF_VCOLOR : 0);
      mi.material = paletteMaterial(key, own);   // the material setter clears the instance's cached shaders
      kinds.add(key);
    }
    const g = j.moving ? groups.moving : groups.still;
    if (g) for (const rc of j.rcs) rc.batchGroupId = g.id;
    // the handle keeps its OWN materials, every part's, in the same order (what the morph and the glitch write, what the
    //   palette reads)
    const h = room.props.get(j.id);
    if (h) {
      h.materials = renderComponents(h.entity).flatMap((rc) => rc.meshInstances.map((mi) => palOriginal.get(mi)?.material ?? (mi.material as pc.StandardMaterial)));
      if (h.materials[0]) h.material = h.materials[0];
    }
  }
  syncPalette();
  paletteCost.swapMs += performance.now() - tSwap; const tGen = performance.now();
  // ⚑ always the numeric ids, never a bare generate() (see the header)
  const groupIds = [groups.moving, groups.still].filter((g): g is pc.BatchGroup => !!g).map((g) => g.id);
  batcher.generate(groupIds);
  paletteCost.generateMs += performance.now() - tGen;
  const ms = performance.now() - t0;
  paletteCost.bakeMs += ms; paletteCost.bakes++; if (ms > paletteCost.bakeMax) paletteCost.bakeMax = ms;
  const idsOut = joins.map((j) => j.id);
  return { groupIds, group: name, joined: idsOut.length, ids: idsOut, idSet: new Set(idsOut), still: joins.filter((j) => !j.moving).length,
    slots, kinds: kinds.size, skipped };
}

/** every joined mesh instance of one group back to its own mesh, material and defines */
function restorePalette(group: string): pc.RenderComponent[] {
  const rcs = new Set<pc.RenderComponent>();
  for (const [mi, o] of palOriginal) {
    if (o.group !== group) continue;
    palOriginal.delete(mi);
    rcs.add(o.rc);
    if (!mi.mesh) continue;   // destroyed with its prop
    mi.mesh = o.mesh; (mi as unknown as Defs)._shaderDefs = o.defs; mi.material = o.material;
  }
  return [...rcs];
}

/** take the palette group down: every prop drawn alone again, with its own material (which the morph kept writing to) */
export function clearPalette(app: pc.Application, room: RoomHandles, handle: PaletteHandle | null): null {
  const batcher = app.batcher;
  if (!batcher || !handle) return null;
  const rcs = restorePalette(handle.group);
  for (const id of handle.groupIds) batcher.removeGroup(id);
  for (const rc of rcs) rc.batchGroupId = -1;
  for (const id of handle.ids) {
    const h = room.props.get(id);
    if (!h) continue;
    h.materials = renderComponents(h.entity).flatMap((rc) => rc.meshInstances.map((mi) => mi.material as pc.StandardMaterial));
    if (h.materials[0]) h.material = h.materials[0];
  }
  return null;
}
