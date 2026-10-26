/** XR presentation space. Authored choreography stays in logical room coordinates.
 * Only the world is rebased, at full pixel coverage; the tracked camera is never written.
 * Restore identity after rendering so existing room hit tests retain their coordinates. */
import * as pc from 'playcanvas';
import { makeScreenEntity, makeScreenTexture } from '../engine/screenTexture';
import { FRAME, REFERENCE } from '../desktop/theme/chrome';
import { PLACE } from '../desktop/theme/era4';
import type { Ray } from './xrFrame';
import { gameMenuBus } from '../state/gameMenuBus';

export function mountXrComfort(app: pc.Application, rig: pc.Entity, head: pc.Entity, reduced: () => boolean) {
  const authored = new pc.Entity('authored-seat');
  authored.setLocalPosition(rig.getLocalPosition()); authored.setLocalRotation(rig.getLocalRotation());
  const stage = new pc.Entity('xr-world'); app.root.addChild(stage);
  const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
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
  let worldReady = true;
  let maskBucket = -1;
  let active = false, elapsed = -1, applied = '', pending = '', calibrated = false, cuts = 0;
  const pos = authored.getLocalPosition().clone(), rot = authored.getLocalRotation().clone();
  const destinationPos = pos.clone(), destinationRot = rot.clone();
  const key = () => [...authored.getLocalPosition().toArray(), ...authored.getLocalRotation().toArray()].map(n => n.toFixed(4)).join(',');
  const identity = () => { stage.setLocalPosition(0, 0, 0); stage.setLocalEulerAngles(0, 0, 0); };
  const updateMapping = () => {
    view.setTRS(pos, rot, pc.Vec3.ONE); inverse.copy(view).invert();
    physicalMap.mul2(fixed, inverse); logicalMap.copy(physicalMap).invert();
  };
  const matrix = () => {
    stage.setLocalPosition(physicalMap.getTranslation()); stage.setLocalRotation(new pc.Quat().setFromMat4(physicalMap));
  };
  function calibrate() {
    // Physical head pose is untouched. Map the current seated head to the authored eye.
    const yaw = head.getEulerAngles().y;
    calibration.setTRS(head.getPosition().clone(), new pc.Quat().setFromEulerAngles(0, yaw, 0), pc.Vec3.ONE);
    calibrationPending = true; calibrated = true; elapsed = 0; committed = false;
  }
  function tick(dt: number) {
    identity();
    if (!app.xr?.active) {
      active = false; calibrated = false; calibrationPending = false; veil.enabled = false; elapsed = -1;
      rig.setLocalPosition(authored.getLocalPosition()); rig.setLocalRotation(authored.getLocalRotation());
      return;
    }
    if (!active) {
      active = true; fixed.setTRS(rig.getPosition().clone(), rig.getRotation().clone(), pc.Vec3.ONE);
      pos.copy(authored.getLocalPosition()); rot.copy(authored.getLocalRotation()); applied = key(); updateMapping();
    }
    // The menu remains above an unobscured, paused world; the dissolve resumes with the story.
    if (gameMenuBus.isOpen) { veil.enabled = false; return; }
    const next = key();
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
      ctx.clearRect(0, 0, 64, 64);
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
        const noise = ((x * 73 + y * 151 + x * y * 17) % 257) / 257;
        if (noise > coverage) continue;
        ctx.fillStyle = noise < 0.72 ? REFERENCE.saverSky : noise < 0.90 ? FRAME.rule : (x + y) % 2 ? PLACE.ink : REFERENCE.saverDim;
        ctx.fillRect(x, y, 1, 1);
      }
      tex.upload();
    }
  }
  app.on('update', tick);
  app.on('prerender', () => {
    if (!app.xr?.active) { rig.setLocalPosition(authored.getLocalPosition()); rig.setLocalRotation(authored.getLocalRotation()); return; }
    // New room roots (including late era props) join the same presentation space.
    for (const child of [...app.root.children]) {
      if (child === stage || child === rig || child.name.startsWith('xr-') || child.name.startsWith('lambyos-home') || child.name.startsWith('setup-')) continue;
      // Reparenting room batches invalidates their captured hidden instances.
      // During the pre-story entrance only its stars need the rebased space.
      if (!worldReady && child.name !== 'restore-pixels') continue;
      stage.addChild(child);
    }
    matrix();
  });
  app.on('postrender', identity);
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
    status: () => ({ active, calibrated, elapsed, cuts, authored: authored.getLocalPosition().toArray(), head: head.getLocalPosition().toArray(), rig: rig.getPosition().toArray() }) };
}
