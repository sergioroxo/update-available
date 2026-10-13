/** One floating presentation of E2's existing desktop canvas. Like Home XR,
 * selection intersects a nearest-filtered plane; the setup owns every action.
 * Browser rays and controller/hand select rays enter through the same press(). */
import * as pc from 'playcanvas';
import { makeScreenEntity, makeScreenTexture } from '../../engine/screenTexture';
import type { Ray } from '../../frame/xrFrame';
import type { LambySetup } from './setup';
import { PLACE } from '../theme/era4';
import { ERA1_CANVAS } from '../theme/era1';

const DIST = 2.2;
const { width: W, height: H } = ERA1_CANVAS;
export function mountSetupWindow(app: pc.Application, camera: pc.Entity, frame: HTMLElement, opts: {
  canvas: HTMLCanvasElement; setup(): LambySetup | null; update(dt: number): boolean;
}): { press(ray: Ray): void; hover(ray: Ray): void; update(dt: number, opacity: number): void; fold(k: number, reduced: boolean, target: pc.Vec3): void; destroy(): void } {
  const tex = makeScreenTexture(app, opts.canvas);
  const plane = makeScreenEntity('setup-in-stars', tex, 2, 1.5, true);
  app.root.addChild(plane);
  const material = plane.render!.material as pc.StandardMaterial;
  let width = 2, size = '', immersive = !!app.xr?.active;
  let position = new pc.Vec3();
  function hang(): void {
    position = camera.getPosition().clone().add(camera.forward.clone().mulScalar(DIST));
    plane.setPosition(position); plane.setRotation(camera.getRotation()); plane.rotateLocal(90, 0, 0);
  }
  hang();
  function fit(): void {
    const rect = app.graphicsDevice.canvas.getBoundingClientRect();
    const next = `${rect.width}:${rect.height}:${camera.camera!.fov}:${!!app.xr?.active}`;
    if (next === size) return; size = next;
    width = app.xr?.active ? 2 : 2 * DIST * Math.tan(camera.camera!.fov * Math.PI / 360)
      * rect.width / rect.height * (rect.width < 600 ? 0.95 : 0.7);
    plane.setLocalScale(width, 1, width * H / W);
  }
  function point(ray: Ray): { x: number; y: number } | null {
    const d = ray.p1.clone().sub(ray.p0), n = plane.up;
    const denominator = d.dot(n);
    if (Math.abs(denominator) < 1e-6) return null;
    const t = plane.getPosition().clone().sub(ray.p0).dot(n) / denominator;
    if (t < 0 || t > 1) return null;
    const p = plane.getWorldTransform().clone().invert().transformPoint(d.mulScalar(t).add(ray.p0));
    const u = p.x + 0.5, v = p.z + 0.5;
    return u >= 0 && u <= 1 && v >= 0 && v <= 1 ? { x: Math.round(u * W), y: Math.round(v * H) } : null;
  }
  function publish(): void {
    // Read-only projected hit rectangles, for the walker to aim real taps.
    if (!new URLSearchParams(location.search).has('debug') || app.xr?.active) return;
    const screen = (x: number, y: number): pc.Vec3 => camera.camera!.worldToScreen(
      plane.getWorldTransform().transformPoint(new pc.Vec3(x / W - 0.5, 0, y / H - 0.5)));
    frame.dataset.setupStage = opts.setup()?.stage ?? '';
    frame.dataset.setupHits = JSON.stringify((opts.setup()?.hits ?? []).map(h => {
      const a = screen(h.x, h.y), b = screen(h.x + h.w, h.y + h.h);
      return { id: h.id, x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
    }));
  }
  return {
    press(ray) {
      const p = point(ray);
      if (p) opts.setup()?.handleClick(p.x, p.y);
    },
    hover(ray) { const p = point(ray); opts.setup()?.handleMove(p?.x ?? -1, p?.y ?? -1); },
    update(dt, opacity) {
      if (immersive !== !!app.xr?.active) { immersive = !!app.xr?.active; hang(); }
      fit();
      if (opts.update(dt)) tex.upload();
      material.opacity = opacity; material.update(); publish();
    },
    fold(k, reduced, target) {
      // No flying window under reduced motion: a slow fade in place.
      material.opacity = reduced ? 1 - k : 1; material.update();
      if (!reduced) {
        if (k > 0.9) { material.emissiveMap = null; material.opacityMap = null; material.emissive.fromString(PLACE.sun); material.update(); }
        plane.setLocalScale(width * (1 - k) + 0.018 * k, 1, width * H / W * (1 - k) + 0.018 * k);
        plane.setPosition(position.clone().lerp(position, target, k));
      }
      frame.dataset.setupHits = '[]';
    },
    destroy() {
      delete frame.dataset.setupHits; delete frame.dataset.setupStage;
      plane.destroy(); material.destroy(); tex.destroy();
    }
  };
}
