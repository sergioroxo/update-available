import { gameMenuBus } from '../../state/gameMenuBus';
import { xrTarget, xrOutline } from '../../frame/xrTargets';
/** One world-space canvas, unfolding from a pixel star. Browser/XR share rays. */
import * as pc from 'playcanvas';
import { makeScreenEntity, makeScreenTexture } from '../../engine/screenTexture';
import type { Ray } from '../../frame/xrFrame';
import type { LambySetup } from './setup';
import { PLACE } from '../theme/era4';
import { ERA1_CANVAS } from '../theme/era1';
import { reducedMotion } from '../../state/motion';

const DIST = 2.2;
const { width: W, height: H } = ERA1_CANVAS;
export function mountSetupWindow(app: pc.Application, camera: pc.Entity, frame: HTMLElement, opts: {
  canvas: HTMLCanvasElement; setup(): LambySetup | null; update(dt: number): boolean;
}): { press(ray: Ray): void; hover(ray: Ray): void; update(dt: number, progress: number): void; fold(k: number, reduced: boolean, target: pc.Vec3): void; destroy(): void } {
  // Paint before the very first GPU upload: never present an uninitialised white map.
  opts.update(0);
  const tex = makeScreenTexture(app, opts.canvas);
  const plane = makeScreenEntity('setup-in-stars', tex, 2, 1.5, true);
  app.root.addChild(plane);
  const material = plane.render!.material as pc.StandardMaterial;
  material.opacity = 0; material.depthTest = !app.xr?.active; material.update();
  const starCanvas = document.createElement('canvas'); starCanvas.width = starCanvas.height = 32;
  const g = starCanvas.getContext('2d')!; g.fillStyle = PLACE.sun;
  for (let y = 0; y < 32; y++) {
    const half = Math.max(1, Math.floor(9 * (1 - Math.abs(y - 16) / 16) ** 3));
    g.fillRect(16 - half, y, half * 2, 1);
  }
  const starTex = makeScreenTexture(app, starCanvas);
  const star = makeScreenEntity('setup-arrival-star', starTex, 0.06, 0.06, true);
  app.root.addChild(star);
  const starMat = star.render!.material as pc.StandardMaterial;
  let width = 2, height = 1.5, size = '', immersive = !!app.xr?.active, unfolded = false;
  let position = new pc.Vec3();
  let xrHoverKey = '';
  let xrHover: ReturnType<typeof xrTarget> = null;
  function hang(): void {
    const distance = app.xr?.active ? 1 : DIST;
    // ⚑ S269 (his 28 Oct headset session: the setup sat to one side, rolled 5–30°) — in a headset the window was hung
    //   on the head's whole rotation, so a tilted or turned-down head left it tilted for good. In XR it hangs level, at
    //   eye height, straight ahead of where the head FACES (its yaw); the browser keeps its exact framing.
    if (app.xr?.active) {
      const f = camera.forward.clone(); f.y = 0;
      if (f.lengthSq() < 1e-4) f.set(0, 0, -1);
      f.normalize();
      position = camera.getPosition().clone().add(f.clone().mulScalar(distance));
      const level = new pc.Quat().setFromEulerAngles(0, Math.atan2(-f.x, -f.z) * 180 / Math.PI, 0);
      for (const e of [plane, star]) { e.setPosition(position); e.setRotation(level); e.rotateLocal(90, 0, 0); }
      return;
    }
    position = camera.getPosition().clone().add(camera.forward.clone().mulScalar(distance));
    for (const e of [plane, star]) { e.setPosition(position); e.setRotation(camera.getRotation()); e.rotateLocal(90, 0, 0); }
  }
  hang();
  const unsubscribeMenu = gameMenuBus.onChange(open => { if (!open && app.xr?.active) hang(); });
  function fit(): void {
    const rect = app.graphicsDevice.canvas.getBoundingClientRect();
    const next = `${rect.width}:${rect.height}:${camera.camera!.fov}:${!!app.xr?.active}`;
    if (next === size) return; size = next;
    width = app.xr?.active ? 1 : 2 * DIST * Math.tan(camera.camera!.fov * Math.PI / 360)
      * rect.width / rect.height * (rect.width < 600 ? 0.92 : 0.80);
    height = width * H / W * (app.xr?.active || rect.width < 600 ? 1 : 0.80);
  }
  function point(ray: Ray): { x: number; y: number } | null {
    if (!unfolded) return null;
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
    if (!new URLSearchParams(location.search).has('debug') || app.xr?.active) return;
    const screen = (x: number, y: number): pc.Vec3 => camera.camera!.worldToScreen(
      plane.getWorldTransform().transformPoint(new pc.Vec3(x / W - 0.5, 0, y / H - 0.5)));
    frame.dataset.setupStage = opts.setup()?.stage ?? '';
    frame.dataset.setupHits = JSON.stringify((unfolded ? opts.setup()?.hits ?? [] : []).map(h => {
      const a = screen(h.x, h.y), b = screen(h.x + h.w, h.y + h.h);
      return { id: h.id, x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
    }));
  }
  const offset = (side: number): pc.Vec3 => position.clone().add(camera.right.clone().mulScalar(side * width));
  return {
    press(ray) { const p = point(ray); if (p) {
      const r = app.xr?.active ? xrTarget(opts.setup()?.hits ?? [], p.x, p.y, W * 0.04 / width) : null;
      opts.setup()?.handleClick(r ? r.x + r.w / 2 : p.x, r ? r.y + r.h / 2 : p.y);
    } },
    hover(ray) {
      const p = point(ray);
      xrHover = p && app.xr?.active ? xrTarget(opts.setup()?.hits ?? [], p.x, p.y, W * 0.04 / width) : null;
      const key = JSON.stringify(xrHover);
      if (key !== xrHoverKey) { xrHoverKey = key; const setup = opts.setup(); if (setup) setup.dirty = true; }
      opts.setup()?.handleMove(xrHover ? xrHover.x + xrHover.w / 2 : p?.x ?? -1, xrHover ? xrHover.y + xrHover.h / 2 : p?.y ?? -1);
    },
    update(dt, progress) {
      if (immersive !== !!app.xr?.active) { immersive = !!app.xr?.active; material.depthTest = !immersive; material.update(); hang(); }
      fit(); if (opts.update(dt)) { if (app.xr?.active) xrOutline(opts.canvas.getContext('2d')!, xrHover); tex.upload(); }
      const k = reducedMotion() ? 1 : progress;
      // First the single star crosses from the left; then it opens over 1.8 s.
      const arrive = Math.min(1, k / 0.22), open = Math.max(0, (k - 0.22) / 0.78);
      const at = offset(-0.54 * (1 - arrive));
      plane.setPosition(at); star.setPosition(at);
      plane.setLocalScale(0.025 + (width - 0.025) * open, 1, 0.025 + (height - 0.025) * open);
      material.opacity = open; material.depthWrite = open >= 1; material.update();
      star.setLocalScale(0.08 + width * 0.12 * open, 1, 0.08 + width * 0.12 * open);
      starMat.opacity = 1 - open; starMat.update(); star.enabled = open < 1;
      unfolded = k >= 1; publish();
    },
    fold(k, reduced, _target) {
      unfolded = false;
      const fold = Math.min(1, k / 0.7), leave = Math.max(0, (k - 0.7) / 0.3);
      material.opacity = reduced ? 1 - k : 1 - fold; material.depthWrite = false; material.update();
      if (!reduced) {
        plane.setLocalScale(width * (1 - fold) + 0.025 * fold, 1, height * (1 - fold) + 0.025 * fold);
        star.enabled = true; starMat.opacity = fold * (1 - leave); starMat.update();
        const s = 0.08 + width * 0.12 * (1 - fold); star.setLocalScale(s, 1, s);
        const at = offset(leave * 0.85); plane.setPosition(at); star.setPosition(at);
      }
      frame.dataset.setupHits = '[]';
    },
    destroy() {
      unsubscribeMenu();
      delete frame.dataset.setupHits; delete frame.dataset.setupStage;
      plane.destroy(); material.destroy(); tex.destroy(); star.destroy(); starMat.destroy(); starTex.destroy();
    }
  };
}
