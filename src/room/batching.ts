/**
 * Static batching for the Quest draw-call budget (docs/WEBXR_PERFORMANCE_NOTES:
 * budget ~50–100 calls; the all-box rooms were ~150+). Strategy: the props that
 * are IDENTICAL across every space state (clusterMorph.constantPropIds() — the
 * same fold the morph runs) share one material per colour signature and join a
 * single pc.BatchManager STATIC group, collapsing ~60 mesh instances into one
 * draw call per unique colour (~29). The morph skips these ids entirely, so a
 * baked batch can never diverge from a live transform.
 *
 * Phase 2 adds a second, short-lived STATIC group for the variable box props
 * after a morph has fully settled. The conductor clears that group before a
 * cascade, lets the morph mutate live transforms/materials, then rebakes the
 * settled end-state. That keeps the dramatic motion intact while bringing the
 * open-room draw-call ceiling down for review/headset time.
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

const SETTLED_GROUP = 'room-settled';

export interface SettledBatchHandle {
  groupId: number;
  joined: number;
  ids: string[];
}

/** materials are shared only within the static set, so a colour key is enough */
function materialKey(m: pc.StandardMaterial): string {
  const c = m.diffuse; const e = m.emissive;
  return [
    m.useLighting ? 1 : 0,
    c.r.toFixed(5), c.g.toFixed(5), c.b.toFixed(5),
    e.r.toFixed(5), e.g.toFixed(5), e.b.toFixed(5)
  ].join('|');
}

/**
 * Share materials + assign the batch group across `ids`. Returns how many
 * props joined the batch. Call AFTER the space is in its start state (the
 * r1 fold spawns some of the constants) and after layout hiding — a disabled
 * entity simply stays out of the batch until re-enabled.
 */
export function batchStaticProps(app: pc.Application, room: RoomHandles, ids: Set<string>): number {
  const batcher = app.batcher;
  if (!batcher) return 0;
  const group = batcher.addGroup('room-static', false, 100);
  const shared = new Map<string, pc.StandardMaterial>();
  let joined = 0;
  for (const id of ids) {
    const h = room.props.get(id);
    if (!h || h.model || !h.entity.render) continue;
    const key = materialKey(h.material);
    const canonical = shared.get(key);
    if (canonical) {
      h.entity.render.material = canonical;
      h.material = canonical;
    } else {
      shared.set(key, h.material);
    }
    h.entity.render.batchGroupId = group.id;
    joined++;
  }
  return joined;
}

function hasDrawableScale(e: pc.Entity): boolean {
  const s = e.getLocalScale();
  return Math.abs(s.x) > 0.0001 && Math.abs(s.y) > 0.0001 && Math.abs(s.z) > 0.0001;
}

/**
 * Clear the rebaked variable group before any morph edits transforms/materials.
 * PlayCanvas's removeGroup() returns all source render components to the live
 * scene, so the cascade can safely animate them frame-by-frame again.
 */
export function clearSettledBatch(app: pc.Application, room: RoomHandles, handle: SettledBatchHandle | null): null {
  const batcher = app.batcher;
  if (!batcher || !handle) return null;
  batcher.removeGroup(handle.groupId);
  for (const id of handle.ids) {
    const h = room.props.get(id);
    if (!h || !h.entity.render) continue;
    h.material = h.material.clone();
    h.material.update();
    h.entity.render.material = h.material;
  }
  return null;
}

/**
 * Batch the current settled state for non-model, non-static props. Call only
 * after the morph and layout have resolved; absent props are represented by
 * zero scale and are skipped until a later era brings them back.
 */
export function batchSettledProps(app: pc.Application, room: RoomHandles, staticIds: Set<string>): SettledBatchHandle | null {
  const batcher = app.batcher;
  if (!batcher) return null;
  const old = batcher.getGroupByName(SETTLED_GROUP);
  if (old) batcher.removeGroup(old.id);
  const group = batcher.addGroup(SETTLED_GROUP, false, 100);
  const shared = new Map<string, pc.StandardMaterial>();
  const ids: string[] = [];
  let joined = 0;
  for (const [id, h] of room.props) {
    if (staticIds.has(id) || h.model || !h.entity.render || !h.entity.enabled || !hasDrawableScale(h.entity)) continue;
    const key = materialKey(h.material);
    const canonical = shared.get(key);
    if (canonical) {
      h.entity.render.material = canonical;
      h.material = canonical;
    } else {
      shared.set(key, h.material);
    }
    h.entity.render.batchGroupId = group.id;
    ids.push(id);
    joined++;
  }
  if (joined === 0) {
    batcher.removeGroup(group.id);
    return null;
  }
  batcher.generate([group.id]);
  return { groupId: group.id, joined, ids };
}
