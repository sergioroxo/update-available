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
  /** how many props joined — published as `window.__batchedProps` by cluster.ts */
  joined: number;
  /** every prop in the batch, so the tear-down can give each its material back */
  ids: string[];
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
    if (ent.render) out.push(ent.render);
  });
  return out;
}

/** materials are shared only within this group, so a colour signature is enough */
function materialKey(m: pc.StandardMaterial): string {
  const c = m.diffuse; const e = m.emissive;
  return [
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
 * Bake the current settled state into ONE batch group. Call only after the morph
 * and layout have resolved; absent props are represented by zero scale and are
 * skipped until a later era brings them back.
 */
export function bakeBatch(
  app: pc.Application, room: RoomHandles, neverBatch: Set<string>
): BatchHandle | null {
  const batcher = app.batcher;
  if (!batcher) return null;
  disableEngineFirstBatch(app);
  const old = batcher.getGroupByName(GROUP);
  if (old) batcher.removeGroup(old.id);
  const group = batcher.addGroup(GROUP, false, 100);

  const shared = new Map<string, pc.StandardMaterial>();
  const ids: string[] = [];
  let joined = 0;

  for (const [id, h] of room.props) {
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
      }
      rc.batchGroupId = group.id;
    }
    // keep the handle's own view of its materials truthful — `setPropEmphasis`
    // and the belongings lift both read it, and both are excluded above, but a
    // stale array here is exactly the kind of quiet lie this file has cost.
    h.materials = comps.flatMap((rc) =>
      rc.meshInstances.map((mi) => mi.material as pc.StandardMaterial));
    if (h.materials[0]) h.material = h.materials[0];
    ids.push(id);
    joined++;
  }

  if (joined === 0) { batcher.removeGroup(group.id); return null; }
  // ⚑ ALWAYS the numeric id, never a bare generate() — see the header.
  batcher.generate([group.id]);
  return { groupId: group.id, joined, ids };
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
