/**
 * ⚑ S374 / J18-B2 — BIGGER GLASS IN THE HEADSET, NEVER NEARER (UIB_JOB_18 Part B; IDEAS_XR_TEXT_2026-11-12 ★3).
 *
 * From the headset seat the monitors' letters were too small IN ANGLE (0.70–0.81° against a reading floor of 0.8°), and
 * the cure that does not crowd the eye is a bigger screen at the same distance: Meta asks that anything looked at for long
 * stays at least 0.5 m away, and Daniel's CRT is already 0.56 m from the eye, so it does not come nearer — it grows. In a
 * headset only, each monitor and its glass are scaled ×1.2 about the CENTRE OF THE GLASS, so the glass stays exactly where
 * it was and every letter on it is 20 % bigger in the view:
 *   · 1997's CRT 0.40 → 0.48 m across (about a 21-inch tube), and 2003's LCD on the same glass;
 *   · 2016's flat panel 0.645 → 0.77 m;
 *   · 2026's monitor 0.533 → 0.64 m.
 * The browser look-modes keep today's sizes. `?xrglass=1` shows today's size in the headset and `?xrglass=1.1` (1–1.4)
 * tries another, without a build: the final size is his eye's call (UIB_JOB_18 "his Quest check").
 *
 * HOW. The glass plane is scaled in place (its position IS the glass centre). The monitor's own props are moved under a
 * PIVOT that is the affine "scale k about c" (position c·(1−k), scale k) under their original parent, so their local
 * transforms stay the authored ones: the era morph keeps writing them exactly as before, and nothing compounds. A stand
 * that would sink into the desk is left out of the pivot where it is a separate part (1997's neck and foot, 2003's stem
 * and foot): the tube grows on its own stand. The 2016 and 2026 monitors are one mesh each, so their stands grow with
 * them; the 5–6 cm that would go below the desk top is under the desk, hidden from the seat. The props are batched, so a
 * change of the pivot marks their batch group dirty (xrComfort rebuilds it before the draw, in room coordinates).
 * Hit tests: era3Devices' `hitPlane` reads the plane's own world size, and app.ts's `toDesktopR` asks `glassScale()`.
 */
import * as pc from 'playcanvas';
import { runtimeQuery } from '../edition';

/** how much bigger the headset's glass is (`?xrglass=` overrides it, 1–1.4) */
export function xrGlassFactor(): number {
  const q = Number(runtimeQuery().get('xrglass'));
  return q >= 1 && q <= 1.4 ? q : 1.2;
}

export interface XrGlass {
  /** the glass's current scale against its authored size (1 off the headset) */
  readonly k: number;
}

/**
 * Mount one monitor: `glass` is its screen plane (authored size `w` × `h`, its position the glass centre), `parts` the
 * prop entities that grow with it (looked up each frame, so a rebuilt room is picked up). `ready` says the room is in
 * front of the eye: nothing is touched before the first headset frame with the room up — not on the computer at all,
 * and not under the entrance's stars, which hide the room's mesh instances one by one (restoreEntrance.ts) and would be
 * shown through by a rebuilt batch (xrComfort.ts S270c learned that).
 */
export function mountXrGlass(app: pc.AppBase, glass: pc.Entity, size: { w: number; h: number }, parts: () => Array<pc.Entity | null | undefined>,
  ready: () => boolean = () => true): XrGlass {
  const K = xrGlassFactor();
  const pivots = new Map<pc.GraphNode, pc.Entity>();   // one pivot per original parent
  let k = 1, mounted = false;
  const dirtyBatches = (root: pc.GraphNode): void => {
    root.forEach((n) => { const g = (n as pc.Entity).render?.batchGroupId; if (g !== undefined && g >= 0) app.batcher?.markGroupDirty(g); });
  };
  const pivotFor = (parent: pc.GraphNode): pc.Entity => {
    let p = pivots.get(parent);
    if (!p) { p = new pc.Entity(`xr-glass-pivot:${glass.name}`); parent.addChild(p); pivots.set(parent, p); }
    return p;
  };
  /** the parts join a pivot under their own parent (identity until the scale is applied) */
  const gather = (): boolean => {
    let moved = false;
    for (const e of parts()) {
      if (!e?.parent || (e.parent as pc.Entity).name?.startsWith('xr-glass-pivot:')) continue;
      e.reparent(pivotFor(e.parent)); dirtyBatches(e); moved = true;
    }
    return moved;
  };
  app.on('update', () => {
    const want = app.xr?.active && ready() ? K : 1;
    if (!mounted && want === 1) return;   // the computer, and a headset before the room is up: untouched
    mounted = true;
    const moved = gather();
    if (k === want && !moved) return;
    k = want;
    glass.setLocalScale(size.w * k, 1, size.h * k);
    for (const [parent, pv] of pivots) {
      // the glass centre in the parent's coordinates (in 'update' the presentation stage is identity: room coordinates)
      const c = (parent as pc.Entity).getWorldTransform().clone().invert().transformPoint(glass.getPosition());
      pv.setLocalPosition(c.x * (1 - k), c.y * (1 - k), c.z * (1 - k));
      pv.setLocalScale(k, k, k);
      dirtyBatches(pv);
    }
  });
  return { get k() { return k; } };
}
