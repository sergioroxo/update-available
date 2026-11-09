/** XR presentation space. Authored choreography stays in logical room coordinates.
 * Only the world is rebased, at full pixel coverage; the tracked camera is never written.
 * Restore identity after rendering so existing room hit tests retain their coordinates. */
import * as pc from 'playcanvas';
import type { ViewMorph } from '../engine/viewMorph';
import type { Ray } from './xrFrame';
import { gameMenuBus } from '../state/gameMenuBus';
import { LANDING } from '../engine/eraChange';

type Batch = { _aabb: pc.BoundingBox; meshInstance: { node: pc.GraphNode; _aabb: pc.BoundingBox } | null };
type Batcher = { _batchList: Batch[]; _batchGroups: Record<string, { id: number }>; _dirtyGroups: number[];
  markGroupDirty(id: number): void; updateAll(): void };

/** ⚑ S271 (his 31 Oct headset: "I want to recenter, but it doesn't recenter the image… now is to the side") — the
 *  opening's panels (the setup window, the frame's words) hang in the headset's own space, outside the rebased world,
 *  so Recentre never reached them; and they re-hung wherever the head pointed when the menu closed — at the menu, off
 *  to the side. They listen here instead: Recentre hands them the head as it was when the menu opened. */
export const xrRecentred = new Set<(head: pc.Vec3, yaw: number) => void>();

export function mountXrComfort(app: pc.Application, rig: pc.Entity, head: pc.Entity, reduced: () => boolean, morph: ViewMorph) {
  const authored = new pc.Entity('authored-seat');
  authored.setLocalPosition(rig.getLocalPosition()); authored.setLocalRotation(rig.getLocalRotation());
  const stage = new pc.Entity('xr-world'); app.root.addChild(stage);
  // ⚑ S346 / T08 — the veil is gone. It covered the view with particles over a near-black wash (the saver sky) and cut
  //   under it: his 8 Nov "fades to black… I don't want fade to blacks in any of it". The cover is now the view from
  //   the destination itself (engine/viewMorph.ts): the room you are in turns into the room you are going to.
  /** the cover's two halves, in seconds: in (the destination arrives; the cut at its end) and out (the particles go).
   *  An era change asks for a slower one through `slowNext()`. */
  const QUICK = { cover: 1.0, reveal: 1.0 }, SLOW = { cover: LANDING.cover, reveal: LANDING.reveal };   // S347: one number (eraChange.ts)
  let timing = QUICK, slowPending = false;
  const pendingFixed = new pc.Mat4();
  const calibration = new pc.Mat4();
  let calibrationPending = false, committed = false;
  const fixed = new pc.Mat4(), view = new pc.Mat4(), inverse = new pc.Mat4();
  const physicalMap = new pc.Mat4(), logicalMap = new pc.Mat4();
  const physicalBounds = new WeakMap<Batch, pc.BoundingBox>();
  let worldReady = true;
    let active = false, elapsed = -1, applied = '', pending = '', calibrated = false, cuts = 0;
  const pos = authored.getLocalPosition().clone(), rot = authored.getLocalRotation().clone();
  const destinationPos = pos.clone(), destinationRot = rot.clone();
  const key = () => [...authored.getLocalPosition().toArray(), ...authored.getLocalRotation().toArray()].map(n => n.toFixed(4)).join(',');
  /** a change worth re-forming the room for: ≥ 0.35 m of place, or ≥ 20° of facing (pitch and roll never count) */
  const meaningful = (): boolean => {
    const p = authored.getLocalPosition(), yaw = authored.getLocalRotation().getEulerAngles().y;
    const dy = Math.abs(((yaw - level(rot).getEulerAngles().y) % 360 + 540) % 360 - 180);
    return p.distance(pos) >= 0.35 || dy >= 20 || calibrationPending;
  };
  const identity = () => { stage.setLocalPosition(0, 0, 0); stage.setLocalEulerAngles(0, 0, 0); };
  // ⚑ S268 — the world is only ever TURNED for the viewer, never tilted: an authored pitch (a lean to the desk, a
  //   look down) is the browser camera's, and in a headset it tipped the whole room ("lopsided"). Yaw only.
  const level = (q: pc.Quat): pc.Quat => new pc.Quat().setFromEulerAngles(0, q.getEulerAngles().y, 0);
  // ⚑ S270b (his: "I'm on top of the backrest of the armchair… I want to put my elbows on the table") — the authored
  //   eye is the BROWSER camera's, set back 0.45 m from the desk edge so a flat screen frames the monitor. A seated
  //   head in the headset leans in: the eye the head is mapped to sits 0.15 m further forward, over the seat.
  const LEAN = 0.15;
  // ⚑ S270g / VR-04 — the desk meets the visitor's own table: a vertical shift of the whole presentation space, kept
  //   through re-seats and re-forms (the table does not move when the head does). Set by matchDesk().
  let lift = 0;
  /** the authored desk sits this far below the authored eye in every room (Room 1: eye 1.16, desk top 0.74) */
  const DESK_BELOW_EYE = 0.42;
  const updateMapping = () => {
    const facing = level(rot);
    view.setTRS(pos.clone().add(facing.transformVector(new pc.Vec3(0, 0, -LEAN))), facing, pc.Vec3.ONE); inverse.copy(view).invert();
    physicalMap.mul2(fixed, inverse);
    physicalMap.data[13] += lift;
    logicalMap.copy(physicalMap).invert();
  };
  const matrix = () => {
    stage.setLocalPosition(physicalMap.getTranslation()); stage.setLocalRotation(new pc.Quat().setFromMat4(physicalMap));
  };
  // ⚑ S268 (his: "how can I recenter if it forces me to look to the panel, it always makes it worse") — the menu's
  //   Recentre uses the head as it was when the menu OPENED, before the visitor turned to the panel
  const menuHead = { p: new pc.Vec3(), yaw: 0, held: false };
  gameMenuBus.onChange((open) => {
    if (open && app.xr?.active) { menuHead.p.copy(head.getPosition()); menuHead.yaw = head.getEulerAngles().y; menuHead.held = true; }
    if (!open) menuHead.held = false;
  });
  function calibrate() {
    // Physical head pose is untouched. Map the seated head to the authored eye.
    const p = menuHead.held ? menuHead.p : head.getPosition(), yaw = menuHead.held ? menuHead.yaw : head.getEulerAngles().y;
    calibration.setTRS(p.clone(), new pc.Quat().setFromEulerAngles(0, yaw, 0), pc.Vec3.ONE);
    calibrationPending = true; calibrated = true; elapsed = 0; committed = false;
    for (const f of xrRecentred) f(p.clone(), yaw);
  }
  // ⚑ S268 (his: "The Meta recenter system of long press… should work here") — the headset's own recentre re-origins
  //   the reference space and fires 'reset'; any calibration made before it is stale, so the mapping goes back to the
  //   seat itself (the head's new origin IS the authored eye), at once, with no dissolve
  let resetSpace: { addEventListener(t: string, f: () => void): void; removeEventListener(t: string, f: () => void): void } | null = null;
  // ⚑ S270b — and the new origin is NOT the authored eye: the tracked head sits wherever the space says (his headset
  //   showed the room from the ceiling until a press). So the seat is taken from the head itself, a moment after the
  //   reset, once the pose has caught up; the same happens on entering VR, so nothing waits for a press.
  let seatIn = -1, offFor = 0;
  const seatFromHead = (): void => {
    fixed.setTRS(head.getPosition().clone(), new pc.Quat().setFromEulerAngles(0, head.getEulerAngles().y, 0), pc.Vec3.ONE);
    calibrated = true; calibrationPending = false; updateMapping();
  };
  const onSpaceReset = (): void => {
    rig.setLocalPosition(authored.getLocalPosition()); rig.setLocalRotation(level(authored.getLocalRotation()));
    fixed.setTRS(rig.getPosition().clone(), rig.getRotation().clone(), pc.Vec3.ONE);
    calibrationPending = false; updateMapping(); seatIn = 0.15;
  };
  app.xr?.on('start', () => {
    const space = (app.xr as unknown as { _referenceSpace?: typeof resetSpace })._referenceSpace ?? null;
    resetSpace?.removeEventListener('reset', onSpaceReset); resetSpace = space; space?.addEventListener('reset', onSpaceReset);
  });
  app.xr?.on('end', () => { resetSpace?.removeEventListener('reset', onSpaceReset); resetSpace = null; });
  function tick(dt: number) {
    identity();
    if (!app.xr?.active) {
      if (active) morph.hide();
      active = false; calibrated = false; calibrationPending = false; elapsed = -1;
      rig.setLocalPosition(authored.getLocalPosition()); rig.setLocalRotation(authored.getLocalRotation());
      return;
    }
    if (!active) {
      // the tracked space hangs from the rig: keep it level, at the seat, or every head move is skewed
      rig.setLocalPosition(authored.getLocalPosition()); rig.setLocalRotation(level(authored.getLocalRotation()));
      active = true; fixed.setTRS(rig.getPosition().clone(), rig.getRotation().clone(), pc.Vec3.ONE);
      pos.copy(authored.getLocalPosition()); rot.copy(authored.getLocalRotation()); applied = key(); updateMapping();
      seatIn = 0.5;
    }
    // ⚑ S270c (his third pass: still "on top of the room" on entering VR) — the first frames of a session can carry no
    //   tracked pose yet, so the countdown only runs once the head has really been placed; and a head more than 0.45 m
    //   above or below its seat for 1.5 s (a late pose, standing up) is seated again. Leaning and stepping stay free.
    const tracked = head.getLocalPosition().lengthSq() > 1e-6 || Math.abs(head.getLocalRotation().w) < 0.99999;
    if (seatIn >= 0 && tracked && (seatIn -= dt) < 0) seatFromHead();
    const off = calibrated && !gameMenuBus.isOpen && elapsed < 0 && Math.abs(head.getPosition().y - fixed.getTranslation().y) > 0.45;
    offFor = off ? offFor + dt : 0;
    if (offFor > 1.5) { offFor = 0; seatFromHead(); }
    // The menu remains above an unobscured, paused world; the dissolve resumes with the story.
    if (gameMenuBus.isOpen) { if (elapsed >= 0) morph.hide(); return; }
    const next = key();
    // ⚑ S268 (his: "the camera was locked with my movement… I couldn't escape") — a re-formed room is aimed where the
    //   head faces, so every authored nudge (a lean, a look offset, a pitch) re-aimed the world at the gaze, over and
    //   over. Only a real change of place or of facing (a send, a seat jump, a conducted turn) re-forms the room now.
    if (next !== pending && !meaningful()) { pending = next; applied = next; }
    if (next !== pending) { pending = next; destinationPos.copy(authored.getLocalPosition()); destinationRot.copy(authored.getLocalRotation()); }
    if (pending !== applied && elapsed < 0) { elapsed = 0; committed = false; }
    if (elapsed === 0 && !committed) {
      // the start of a re-form: decide where the head will be mapped, and photograph the room from there
      timing = slowPending ? SLOW : QUICK; slowPending = false;
      if (calibrationPending) pendingFixed.copy(calibration);
      else pendingFixed.setTRS(fixed.getTranslation(), new pc.Quat().setFromEulerAngles(0, head.getEulerAngles().y, 0), pc.Vec3.ONE);
      captureDestination();
    }
    if (elapsed >= 0) {
      elapsed += dt;
      const total = timing.cover + timing.reveal;
      // ⚑ S347 — reduced motion is no longer an instant cut here: it is the same clock as a plain soft dissolve (viewMorph
      //   draws no particles and no sparks under reduced motion), so an era's landing still turns the room into the next one gently
      const cutNow = reduced() && timing === QUICK;   // an ordinary re-form under reduced motion stays the instant cut
      if (!committed && (cutNow || elapsed >= timing.cover) && (applied !== pending || calibrationPending)) {
        // Keep the calibrated seated origin, re-formed in the heading the head had when the morph began (the picture
        // was made for that heading, so the live room behind it is the same room at the cut)
        fixed.copy(pendingFixed); calibrationPending = false;
        pos.copy(destinationPos); rot.copy(destinationRot); applied = pending; committed = true; cuts++; updateMapping();
      }
      if (cutNow || elapsed >= total) { elapsed = -1; morph.hide(); return; }
      // ⚑ S281's particles, kept (his: "smoother, more particle based. stuff morphs into") — now they are windows
      const leaving = elapsed >= timing.cover;
      const coverage = leaving ? (total - elapsed) / (timing.reveal * 0.8) : elapsed / (timing.cover * 0.8);
      morph.set(Math.min(1, coverage), leaving);
    }
  }
  /** the logical pose the head will have once the pending re-form commits, rendered into the morph's picture */
  function captureDestination(): void {
    const toPos = applied !== pending ? destinationPos : pos, toRot = applied !== pending ? destinationRot : rot;
    const facing = level(toRot);
    const viewAfter = new pc.Mat4().setTRS(toPos.clone().add(facing.transformVector(new pc.Vec3(0, 0, -LEAN))), facing, pc.Vec3.ONE);
    const physAfter = new pc.Mat4().mul2(pendingFixed, viewAfter.clone().invert());
    physAfter.data[13] += lift;
    const logicalAfter = physAfter.clone().invert();
    morph.capture(new pc.Mat4().mul2(logicalAfter, head.getWorldTransform()), stage, { xr: true });
  }
  app.on('update', tick);
  app.on('prerender', () => {
    if (!app.xr?.active) { rig.setLocalPosition(authored.getLocalPosition()); rig.setLocalRotation(authored.getLocalRotation()); return; }
    // New room roots (including late era props) join the same presentation space.
    const moved = new Set<number>();
    for (const child of [...app.root.children]) {
      if (child === stage || child === rig || child.name.startsWith('xr-') || child.name.startsWith('lambyos-home') || child.name.startsWith('setup-')) continue;
      // Reparenting room batches invalidates their captured hidden instances.
      // During the pre-story entrance only its stars need the rebased space.
      if (!worldReady && child.name !== 'restore-pixels') continue;
      stage.addChild(child);
      // only a batched prop's move needs its batch rebuilt (S270c: rebuilding every group when the stars moved in
      //   made fresh, visible batches — the room showed through the opening's stars, which had hidden the old ones)
      child.forEach((n) => { const g = (n as pc.Entity).render?.batchGroupId; if (g !== undefined && g >= 0) moved.add(g); });
    }
    // ⚑ S270 (his headset, 28 Oct: the room forms at the desk, then cuts to the ceiling; a black box in front; the
    //   plant flies on Recentre) — the static batches (walls, ceiling, desk: ~55 meshes) hang from app.root, not from
    //   this stage, so they never followed the rebase and sat a tracked head-height (~1.2 m) low. And reparenting a
    //   batched prop puts its hidden originals back on screen. So: rebuild the batches here, while the stage is still
    //   identity (baked in room coordinates), and hang every batch from the stage, its bounds following it.
    const batcher = app.batcher as unknown as Batcher | null;
    if (batcher) {
      for (const g of moved) batcher.markGroupDirty(g);
      if (batcher._dirtyGroups.length) { app.root.syncHierarchy(); batcher.updateAll(); }
    }
    matrix();
    // ⚑ S270b (his: "if I turn around, it just jumps into the stars… the racket and the Game Boy floating in space") —
    //   a static batch's mesh has no bounds of its own (built from raw streams), so letting the engine derive them put
    //   every wall at the floor's centre and culled it whenever that point left the view. The batch keeps its true
    //   bounds in room coordinates; for the draw they are carried into the presentation space, and put back after.
    if (batcher) for (const b of batcher._batchList) {
      const mi = b.meshInstance;
      if (!mi) continue;
      if (mi.node !== stage) mi.node = stage;
      let box = physicalBounds.get(b);
      if (!box) { box = new pc.BoundingBox(); physicalBounds.set(b, box); }
      box.setFromTransformedAabb(b._aabb, physicalMap); mi._aabb = box;
    }
  });
  app.on('postrender', () => {
    identity();
    const batcher = app.batcher as unknown as Batcher | null;
    if (batcher) for (const b of batcher._batchList) if (b.meshInstance) b.meshInstance._aabb = b._aabb;
  });
  const logicalRay = (ray: Ray): Ray => {
    if (!app.xr?.active) return ray;
    return { p0: logicalMap.transformPoint(ray.p0), p1: logicalMap.transformPoint(ray.p1) };
  };
  const physicalPoint = (p: pc.Vec3): pc.Vec3 => physicalMap.transformPoint(p);
  const logicalPoint = (p: pc.Vec3): pc.Vec3 => app.xr?.active ? logicalMap.transformPoint(p) : p.clone();
  /** VR-04: put the desk top at this physical height (a fingertip on a real table). Returns the shift applied. */
  const matchDesk = (tableY: number): number => {
    const desk = physicalMap.transformPoint(new pc.Vec3(pos.x, pos.y - DESK_BELOW_EYE, pos.z)).y;
    lift = Math.max(-0.3, Math.min(0.3, lift + tableY - desk)); updateMapping();
    return lift;
  };
  const stageYaw = (): number => new pc.Quat().setFromMat4(physicalMap).getEulerAngles().y;
  return { authored, calibrate, logicalRay, physicalPoint, logicalPoint, matchDesk, stageYaw,
    get deskLift() { return lift; },
    setWorldReady(ready: boolean) { worldReady = ready; },
    /** Available to the existing debug-only global; deterministic transition review, not a runtime input. */
    reviewStep: tick,
    get busy() { return elapsed >= 0; }, get calibrated() { return calibrated; },
    /** S346 — the next re-form is an era's landing: a slower morph (more time, his 8 Nov note) */
    slowNext() { slowPending = true; },
    status: () => ({ active, calibrated, elapsed, cuts, worldReady, shift: physicalMap.getTranslation().toArray(), shiftYaw: new pc.Quat().setFromMat4(physicalMap).getEulerAngles().y,
      batchesOnStage: ((app.batcher as unknown as { _batchList?: { meshInstance: { node: pc.GraphNode } | null }[] } | null)?._batchList ?? []).filter(b => b.meshInstance?.node === stage).length,
      batches: ((app.batcher as unknown as { _batchList?: unknown[] } | null)?._batchList ?? []).length, authored: authored.getLocalPosition().toArray(), head: head.getLocalPosition().toArray(), rig: rig.getPosition().toArray() }) };
}
