/** XR presentation space. Authored choreography stays in logical room coordinates.
 * Only the world is rebased, at full pixel coverage; the tracked camera is never written.
 * Restore identity after rendering so existing room hit tests retain their coordinates. */
import * as pc from 'playcanvas';
import { makeScreenEntity, makeScreenTexture } from '../engine/screenTexture';
import { FRAME, REFERENCE } from '../desktop/theme/chrome';
import { PLACE } from '../desktop/theme/era4';
import type { Ray } from './xrFrame';
import { gameMenuBus } from '../state/gameMenuBus';

type Batch = { _aabb: pc.BoundingBox; meshInstance: { node: pc.GraphNode; _aabb: pc.BoundingBox } | null };
type Batcher = { _batchList: Batch[]; _batchGroups: Record<string, { id: number }>; _dirtyGroups: number[];
  markGroupDirty(id: number): void; updateAll(): void };

export function mountXrComfort(app: pc.Application, rig: pc.Entity, head: pc.Entity, reduced: () => boolean) {
  const authored = new pc.Entity('authored-seat');
  authored.setLocalPosition(rig.getLocalPosition()); authored.setLocalRotation(rig.getLocalRotation());
  const stage = new pc.Entity('xr-world'); app.root.addChild(stage);
  // ⚑ S268 (his: "the pixels need to be smaller… too big of squares, it gives a more scary look") — 64 → 192 cells,
  //   written as one ImageData per coverage step rather than a fillRect per cell
  const CELLS = 192;
  const canvas = document.createElement('canvas'); canvas.width = CELLS; canvas.height = CELLS;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(CELLS, CELLS);
  const rgb = (hex: string): [number, number, number] => { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const INKS = [REFERENCE.saverSky, FRAME.rule, PLACE.ink, REFERENCE.saverDim].map(rgb);
  const tex = makeScreenTexture(app, canvas);
  const veil = makeScreenEntity('xr-pixel-dissolve', tex, 6, 6, true);
  const layer = new pc.Layer({ name: 'XR comfort', clearDepthBuffer: true });
  app.scene.layers.pushTransparent(layer); head.camera!.layers = [...head.camera!.layers, layer.id];
  veil.render!.layers = [layer.id];
  head.addChild(veil); veil.setLocalPosition(0, 0, -1.2); veil.setLocalEulerAngles(90, 0, 0); veil.enabled = false;
  const calibration = new pc.Mat4();
  let calibrationPending = false, committed = false;
  const fixed = new pc.Mat4(), view = new pc.Mat4(), inverse = new pc.Mat4();
  const physicalMap = new pc.Mat4(), logicalMap = new pc.Mat4();
  const physicalBounds = new WeakMap<Batch, pc.BoundingBox>();
  let worldReady = true;
  let maskBucket = -1;
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
  const updateMapping = () => {
    const facing = level(rot);
    view.setTRS(pos.clone().add(facing.transformVector(new pc.Vec3(0, 0, -LEAN))), facing, pc.Vec3.ONE); inverse.copy(view).invert();
    physicalMap.mul2(fixed, inverse); logicalMap.copy(physicalMap).invert();
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
      active = false; calibrated = false; calibrationPending = false; veil.enabled = false; elapsed = -1;
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
    if (gameMenuBus.isOpen) { veil.enabled = false; return; }
    const next = key();
    // ⚑ S268 (his: "the camera was locked with my movement… I couldn't escape") — a re-formed room is aimed where the
    //   head faces, so every authored nudge (a lean, a look offset, a pitch) re-aimed the world at the gaze, over and
    //   over. Only a real change of place or of facing (a send, a seat jump, a conducted turn) re-forms the room now.
    if (next !== pending && !meaningful()) { pending = next; applied = next; }
    if (next !== pending) { pending = next; destinationPos.copy(authored.getLocalPosition()); destinationRot.copy(authored.getLocalRotation()); }
    if (pending !== applied && elapsed < 0) { elapsed = 0; committed = false; }
    if (elapsed >= 0) {
      elapsed += dt;
      if (!committed && (reduced() || elapsed >= 1) && (applied !== pending || calibrationPending)) {
        if (calibrationPending) { fixed.copy(calibration); calibrationPending = false; }
        else {
          // Keep the calibrated seated origin, but re-form the destination in
          // the current heading: a freely turned head must not miss the next beat.
          fixed.setTRS(fixed.getTranslation(), new pc.Quat().setFromEulerAngles(0, head.getEulerAngles().y, 0), pc.Vec3.ONE);
        }
        pos.copy(destinationPos); rot.copy(destinationRot); applied = pending; committed = true; cuts++; updateMapping();
      }
      if (reduced() || elapsed >= 2) elapsed = -1;
    }
    veil.enabled = elapsed >= 0;
    if (veil.enabled) {
      tex.minFilter = pc.FILTER_NEAREST; tex.magFilter = pc.FILTER_NEAREST; tex.mipmaps = false;
      const coverage = Math.min(1, elapsed < 1 ? elapsed / 0.8 : (2 - elapsed) / 0.8);
      const bucket = Math.floor(Math.max(0, coverage) * 257);
      if (bucket === maskBucket) return;
      maskBucket = bucket;
      const d = img.data;
      for (let y = 0; y < CELLS; y++) for (let x = 0; x < CELLS; x++) {
        const noise = ((x * 73 + y * 151 + x * y * 17) % 257) / 257, o = (y * CELLS + x) * 4;
        if (noise > coverage) { d[o + 3] = 0; continue; }
        const c = INKS[noise < 0.72 ? 0 : noise < 0.90 ? 1 : (x + y) % 2 ? 2 : 3];
        d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      tex.upload();
    }
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
  return { authored, calibrate, logicalRay, physicalPoint,
    setWorldReady(ready: boolean) { worldReady = ready; },
    /** Available to the existing debug-only global; deterministic transition review, not a runtime input. */
    reviewStep: tick,
    get busy() { return elapsed >= 0; }, get calibrated() { return calibrated; },
    status: () => ({ active, calibrated, elapsed, cuts, worldReady, shift: physicalMap.getTranslation().toArray(), shiftYaw: new pc.Quat().setFromMat4(physicalMap).getEulerAngles().y,
      batchesOnStage: ((app.batcher as unknown as { _batchList?: { meshInstance: { node: pc.GraphNode } | null }[] } | null)?._batchList ?? []).filter(b => b.meshInstance?.node === stage).length,
      batches: ((app.batcher as unknown as { _batchList?: unknown[] } | null)?._batchList ?? []).length, authored: authored.getLocalPosition().toArray(), head: head.getLocalPosition().toArray(), rig: rig.getPosition().toArray() }) };
}
