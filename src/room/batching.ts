/**
 * Static batching for the Quest draw-call budget (docs/WEBXR_PERFORMANCE_NOTES:
 * budget ~50–100 calls; the all-box rooms were ~150+). Strategy: the props that
 * are IDENTICAL across every space state (clusterMorph.constantPropIds() — the
 * same fold the morph runs) share one material per colour signature and join a
 * single pc.BatchManager STATIC group, collapsing ~60 mesh instances into one
 * draw call per unique colour (~29). The morph skips these ids entirely, so a
 * baked batch can never diverge from a live transform.
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
