/** The frame's saver, in the scene: one merged pixel mesh + one XR text panel.
 * r1 has already been folded by ClusterMorph; the existing entrance arc owns the seat flight.
 * No narrative clocks run until setup/glitch have handed back to app.ts. */
import * as pc from 'playcanvas';
import copy from '../../data/strings/entrance.json';
import attractCopy from '../../data/strings/attract.json';
import { DOT } from '../frame/leavePage';
import { FRAME } from '../desktop/theme/chrome';
import { PLACE } from '../desktop/theme/era4';
import { closeBackdropColor } from './pointCloud';
import { sampleRoomSurfaces } from './clusterMorph';
import { hex } from './era1room';
import type { RoomHandles } from './era1room';
import { makeScreenEntity, makeScreenTexture } from '../engine/screenTexture';
import { startSetup } from '../desktop/setup/setup';
import { chooseCut } from '../state/cut';
import { mountSetupWindow } from '../desktop/setup/setupWindow';
import type { Ray } from '../frame/xrFrame';
import type { LambySetup } from '../desktop/setup/setup';
import { playLoop, stopClip } from '../audio/tapeAudio';
import { gameMenuBus } from '../state/gameMenuBus';

let glitch: (() => Promise<void>) | null = null;
/** A single 0.65 s material/light state; no strobe, no second flash. */
export function entranceGlitch(): Promise<void> { return glitch?.() ?? Promise.resolve(); }

export interface RestoreEntrance {
  readonly blocking: boolean;
  readonly flying: boolean;
  readonly roomVisibility: number;
  press(ray?: Ray): void;
  hover(ray: Ray): void;
  cancel(): void;
  update(dt: number): void;
}

export function buildRestoreEntrance(app: pc.Application, room: RoomHandles, rig: pc.Entity, camera: pc.Entity,
  opts: { points: pc.Vec3[]; setupCanvas: HTMLCanvasElement; setup(): LambySetup | null; updateSetup(dt: number): boolean; clearSetup(): void; reduced(): boolean; crossFade(): boolean; prepareRestore(): void; flyToSeat(): Promise<void>; beginStory(): void; lights(k: number): void }): RestoreEntrance {
  type Phase = 'wake' | 'restore' | 'flight' | 'setup' | 'fold' | 'typing' | 'glitch' | 'done';
  let phase: Phase = 'wake', clock = 0, elapsed = 0, releaseTime = 0, flash = 0;
  let resolveFlash: (() => void) | null = null;
  const N = 900, RESTORE = 9, EVERY = attractCopy.secondsCard * 3, HOLD = EVERY - 11, MOVE = 4.5;
  const smooth = (k: number): number => k * k * (3 - 2 * k);
  const origin = rig.getWorldTransform().clone();
  const world = (p: pc.Vec3): pc.Vec3 => origin.transformPoint(p);
  const targets: pc.Vec3[] = [];
  const aspect = app.graphicsDevice.width / app.graphicsDevice.height;
  const CELL = Math.min(0.07, Math.tan((camera.camera?.fov ?? 42) * Math.PI / 360) * aspect * 6 * 0.82 / 43);
  copy.title.forEach((line, li) => {
    [...line].forEach((ch, ci) => {
      const glyph = DOT[ch] ?? DOT[' '];
      for (let i = 0; i < 15; i++) if (glyph[i] === '1') targets.push(world(new pc.Vec3(
        -(line.length * 4 - 1) * CELL / 2 + (ci * 4 + i % 3) * CELL,
        0.40 - li * 7 * CELL - Math.floor(i / 3) * CELL, -3)));
    });
  });
  const land = sampleRoomSurfaces(room, N);
  opts.points.forEach((point, i) => { land[i].point = point; }); // these opening stars remain as room specks
  const stars = Array.from({ length: N }, (_, i) => ({
    x: Math.sin(i * 12.9898) * 7, y: Math.cos(i * 4.1414) * 5, z: -0.2 - (i / N) * 18,
    p: new pc.Vec3(), from: new pc.Vec3(), delay: 0
  }));
  // Capture the live layer meshes, including the cluster's settled batches.
  // Never toggle batched nodes: visibility belongs to their actual MeshInstances.
  const instances = [...new Set(app.scene.layers.layerList.flatMap((layer) => layer.meshInstances))].filter(mi => mi.node.name !== 'room-specks');
  const visible = instances.map((mi) => mi.visible);
  const materials = [...new Set(instances.map((mi) => mi.material))].filter((m): m is pc.StandardMaterial => m instanceof pc.StandardMaterial);
  const delays = new Map(materials.map((m, i) => [m, (i % 7) * 0.4]));
  stars.forEach((s, i) => { s.delay = delays.get(land[i].material as pc.StandardMaterial) ?? 0; });
  const paints = materials.map((m) => ({ m, diffuse: m.diffuse.clone(), emissive: m.emissive.clone(), opacity: m.opacity, blend: m.blendType, depth: m.depthWrite }));
  const lights: { light: pc.LightComponent; color: pc.Color; intensity: number }[] = [];
  app.root.forEach((node) => { const e = node as pc.Entity; if (e.light) lights.push({ light: e.light, color: e.light.color.clone(), intensity: e.light.intensity }); });
  const ambient = app.scene.ambientLight.clone();
  instances.forEach((mi) => { mi.visible = false; });
  if (camera.camera) camera.camera.clearColor = closeBackdropColor();

  const root = new pc.Entity('restore-pixels'); app.root.addChild(root);
  const positions = new Float32Array(N * 12), colors = new Float32Array(N * 16), indices: number[] = [];
  const warm = hex(FRAME.bright), cool = hex(PLACE.skyLo);
  for (let i = 0; i < N; i++) {
    const c = i % 9 === 0 ? cool : warm;
    for (let v = 0; v < 4; v++) colors.set([c.r, c.g, c.b, 1], i * 16 + v * 4);
    indices.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
  }
  const mesh = new pc.Mesh(app.graphicsDevice);
  mesh.setPositions(positions); mesh.setColors(colors); mesh.setIndices(indices); mesh.update(pc.PRIMITIVE_TRIANGLES);
  const ink = new pc.StandardMaterial(); ink.useLighting = false; ink.emissive.set(1, 1, 1);
  ink.emissiveVertexColor = true; ink.opacityVertexColor = true; ink.blendType = pc.BLEND_NORMAL; ink.depthWrite = false; ink.diffuse.set(0, 0, 0); ink.cull = pc.CULLFACE_NONE; ink.update();
  const pixels = new pc.MeshInstance(mesh, ink, root); pixels.cull = false;
  root.addComponent('render', { meshInstances: [pixels] });

  const frame = document.createElement('div'); frame.id = 'restore-entrance'; frame.dataset.phase = phase;
  frame.setAttribute('role', 'status'); frame.setAttribute('aria-label', copy.title.join(' '));
  Object.assign(frame.style, { position: 'fixed', inset: '0', pointerEvents: 'none', color: FRAME.bright,
    font: '16px monospace', zIndex: '800' });
  const invite = document.createElement('div');
  Object.assign(invite.style, { position: 'absolute', left: '0', right: '0', bottom: '16vh', textAlign: 'center' });
  const hint = document.createElement('div'); hint.textContent = copy.invite; invite.appendChild(hint);
  const active = document.createElement('div'); active.textContent = copy.active;
  Object.assign(active.style, { marginTop: '12px', fontSize: '12px', color: FRAME.dim }); invite.appendChild(active);
  const status = document.createElement('div');
  Object.assign(status.style, { position: 'absolute', left: '64px', bottom: '24px', right: '20px', lineHeight: '1.5' });
  frame.append(invite, status); document.body.appendChild(frame);
  const enterVr = document.createElement('button'); enterVr.textContent = copy.enterVr;
  Object.assign(enterVr.style, { position: 'absolute', right: '24px', bottom: '24px', pointerEvents: 'auto',
    font: '14px monospace', background: FRAME.glass, color: FRAME.bright, border: `1px solid ${FRAME.dim}`, padding: '8px', display: 'none' });
  frame.appendChild(enterVr);
  const availableVr = (): void => { if (app.xr?.isAvailable(pc.XRTYPE_VR)) enterVr.style.display = ''; };
  availableVr(); app.xr?.on(`available:${pc.XRTYPE_VR}`, availableVr);
  enterVr.addEventListener('click', () => {
    if (camera.camera && app.xr?.isAvailable(pc.XRTYPE_VR)) app.xr.start(camera.camera, pc.XRTYPE_VR, pc.XRSPACE_LOCAL);
  });
  // XR has the same plain frame words on a small, nearest-filtered world-space panel.
  const cvs = document.createElement('canvas'); cvs.width = 768; cvs.height = 128;
  const texture = makeScreenTexture(app, cvs);
  const panel = makeScreenEntity('restore-frame-words', texture, 2.4, 0.4, true);
  rig.addChild(panel); panel.setLocalPosition(0, -0.64, -3); panel.setLocalEulerAngles(90, 0, 0);
  let text = '';
  function words(next: string): void {
    if (text === next) return; text = next; status.textContent = next;
    const ctx = cvs.getContext('2d')!; ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.fillStyle = FRAME.bright; ctx.font = '24px monospace'; ctx.textAlign = 'center';
    (phase === 'wake' ? [copy.invite, copy.active] : [next]).forEach((line, i) => { ctx.font = i === 1 ? '18px monospace' : '24px monospace'; ctx.fillText(line, 384, 44 + i * 42); });
    texture.upload();
  }
  words(' ');
  function setPhase(next: Phase): void { phase = next; frame.dataset.phase = next; elapsed = 0; }
  function paint(k: number): void {
    paints.forEach(({ m, opacity }) => {
      // Fade the actual image, preserving every texture/tint and transform.
      const arrival = opts.crossFade() ? k : smooth(Math.max(0, Math.min(1, (elapsed - (delays.get(m) ?? 0) - 1.8) / 4.8)));
      m.opacity = opacity * arrival; m.blendType = pc.BLEND_NORMAL; m.depthWrite = arrival > 0.95; m.update();
    });
    opts.lights(k); app.scene.ambientLight.copy(ambient).mulScalar(k);
    // S246: LambyOS Home's loop gives way to the room's own sound as the room arrives (not a cut at the end)
    if (music) music.volume = 0.28 * (1 - k);
  }
  function originalPaint(): void {
    for (const { m, diffuse, emissive, opacity, blend, depth } of paints) { m.diffuse.copy(diffuse); m.emissive.copy(emissive); m.opacity = opacity; m.blendType = blend; m.depthWrite = depth; m.update(); }
    for (const { light, color, intensity } of lights) { light.color = color.clone(); light.intensity = intensity; }
    app.scene.ambientLight.copy(ambient); opts.lights(1);
  }
  glitch = () => {
    if (opts.reduced()) return Promise.resolve();
    setPhase('glitch'); flash = 0;
    const green = hex(PLACE.land);
    for (const { m, diffuse, emissive } of paints) {
      const flatten = (c: pc.Color): pc.Color => {
        const grey = (c.r + c.g + c.b) / 3;
        return new pc.Color((c.r + grey) / 2 * (0.85 + 0.15 * green.r / green.g), (c.g + grey) / 2, (c.b + grey) / 2 * (0.85 + 0.15 * green.b / green.g));
      };
      m.diffuse.copy(flatten(diffuse)); m.emissive.copy(flatten(emissive)); m.update();
    }
    // ⚑ S246 (his 2026-10-14: "there is a flash on the lights that become white"): the room as it was is FLATTER and
    // DIMMER, never brighter — each light keeps its own hue, half-desaturated, at 70% of its strength; the ambient dims.
    app.scene.ambientLight.copy(ambient).mulScalar(0.8);
    lights.forEach(({ light, color, intensity }) => {
      const g = (color.r + color.g + color.b) / 3;
      light.color = new pc.Color((color.r + g) / 2, (color.g + g) / 2 * 1.03, (color.b + g) / 2);
      light.intensity = intensity * 0.7;
    });
    return new Promise<void>((resolve) => { resolveFlash = resolve; });
  };
  let music: HTMLAudioElement | null = null;
  let flight: Promise<void> | null = null;
  let floating: ReturnType<typeof mountSetupWindow> | null = null;
  let disposed = false;
  function dispose(): void {
    if (disposed) return; disposed = true;
    stopClip(music); music = null;
    originalPaint(); instances.forEach((mi, i) => { mi.visible = visible[i]; });
    app.xr?.off(`available:${pc.XRTYPE_VR}`, availableVr);
    floating?.destroy(); floating = null; opts.setup()?.destroy(); opts.clearSetup();
    frame.remove(); root.destroy(); mesh.destroy(); ink.destroy(); panel.destroy(); texture.destroy(); glitch = null;
  }
  async function handover(): Promise<void> {
    await (flight ?? opts.flyToSeat()); if (disposed) return;
    await entranceGlitch(); if (disposed) return; setPhase('done'); dispose();
    opts.beginStory();
  }
  const right = new pc.Vec3(), up = new pc.Vec3();
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const entrance: RestoreEntrance = {
    get roomVisibility() { return phase === 'restore' ? smooth(Math.min(1, elapsed / RESTORE)) : phase === 'flight' || phase === 'glitch' || phase === 'done' ? 1 : 0; },
    get blocking() { return phase !== 'done'; }, get flying() { return phase === 'flight' || phase === 'restore'; },
    cancel() {
      setPhase('done'); dispose(); const resolve = resolveFlash; resolveFlash = null; resolve?.();
    },
    hover(ray) { if (phase === 'setup') floating?.hover(ray); },
    press(ray) {
      if (gameMenuBus.isOpen) return;
      if (phase === 'setup') { if (ray) floating?.press(ray); return; }
      if (phase !== 'wake') return;
      music = playLoop('lambyos_home_loop.mp3'); if (music) music.volume = 0.28;
      stars.forEach((s) => s.from.copy(s.p)); setPhase('setup'); invite.style.display = 'none'; words('');
      const result = startSetup();
      floating = mountSetupWindow(app, camera, frame, {
        canvas: opts.setupCanvas, setup: opts.setup, update: opts.updateSetup
      });
      void result.then(({ cut }) => {
        if (disposed) return;
        chooseCut(cut); opts.clearSetup(); setPhase('fold'); words('');
      });
    },
    update(dt) {
      if (phase === 'done') return;
      clock += dt; elapsed += dt;
      const immersive = !!app.xr?.active; frame.style.display = immersive ? 'none' : ''; panel.enabled = immersive;
      if (phase === 'glitch') {
        flash += dt;
        if (flash >= 0.65) { originalPaint(); const resolve = resolveFlash; resolveFlash = null; resolve?.(); }
        return;
      }
      if (phase === 'typing') {
        words(copy.restoring.slice(0, Math.floor(elapsed * 23)));
        if (elapsed < copy.restoring.length / 23 + 0.2) return;
        stars.forEach((s) => s.from.copy(s.p)); opts.prepareRestore(); setPhase('restore'); paint(0);
        flight = opts.flyToSeat();
      }
      if (phase !== 'wake' && phase !== 'restore' && phase !== 'setup' && phase !== 'fold') return;
      if (phase === 'setup' || phase === 'fold') releaseTime += dt;
      if (phase === 'setup') floating?.update(dt, smooth(Math.min(1, elapsed / 2.3)));
      // ⚑ S245 — the opening film has its own music: the setup's loop steps aside for it and comes back after
      if (phase === 'setup' && music) {
        const want = opts.setup()?.filmActive ? 0 : 0.28;
        music.volume = Math.max(0, Math.min(1, music.volume + (want - music.volume) * Math.min(1, dt * 4)));
      }
      if (phase === 'fold') {
        const k = smooth(Math.min(1, elapsed / 1.8));
        floating?.fold(k, opts.reduced(), world(new pc.Vec3(0.3, 0.2, -3)));
        if (elapsed >= 1.8) {
          floating?.destroy(); floating = null;
          stars[N - 1].p.copy(world(new pc.Vec3(0.3, 0.2, -3)));
          setPhase('typing'); words('');
        }
      }
      const t = clock % EVERY, start = EVERY - HOLD - 2 * MOVE;
      const k = t < start ? 0 : t < start + MOVE ? (t - start) / MOVE : t < start + MOVE + HOLD ? 1 : Math.max(0, 1 - (t - start - MOVE - HOLD) / MOVE);
      const e = opts.reduced() ? 1 : smooth(k);
      if (phase === 'restore') {
        words(copy.restoring);
        if (elapsed > 0.05) instances.forEach((mi, i) => { mi.visible = visible[i]; });
        const k = smooth(Math.min(1, elapsed / RESTORE)); paint(k);
        if (music) music.volume = 0.28 * (1 - k);
      }
      if (phase === 'restore' && opts.crossFade()) { ink.opacity = 1 - smooth(Math.min(1, elapsed / RESTORE)); ink.update(); }
      right.copy(camera.right); up.copy(camera.up);
      for (let i = 0; i < N; i++) {
        const s = stars[i]; let half = 0.010;
        if (phase === 'wake') {
          if (!opts.reduced()) s.z += dt * 0.9 * (1 - e);
          if (s.z > -0.2) s.z = -18;
          s.p.set(s.x, s.y, s.z); origin.transformPoint(s.p, s.p);
          if (targets[i]) { s.p.lerp(s.p, targets[i], e); half = 0.006 + CELL * 0.34 * e; }
        } else if (phase === 'setup' || phase === 'fold') {
          // The title releases into a calm field; the setup stays at the eye.
          const drift = opts.reduced() ? 0 : smooth(Math.min(1, releaseTime / 2.4));
          const loose = world(new pc.Vec3(s.x, s.y, Math.min(-3.4, s.z)));
          s.p.lerp(s.from, loose, drift);
          if (!opts.reduced()) s.z += dt * 0.035;
        } else if (phase === 'restore') {
          const progress = Math.max(0, Math.min(1, (elapsed - s.delay) / 2.8));
          s.p.lerp(s.from, land[i].point, smooth(progress));
          if (opts.crossFade()) s.p.copy(s.from);
          const resolve = smooth(Math.max(0, Math.min(1, (elapsed - 4) / 5)));
          half = (opts.reduced() ? 0.006 : 0.012 + 0.075 * smooth(progress)) * (1 - resolve);
          const m = land[i].material as pc.StandardMaterial;
          const c = i < opts.points.length || m.diffuseMap || m.emissiveMap ? hex(PLACE.sun) : m.diffuse;
          const mix = opts.reduced() ? 0 : smooth(progress);
          const base = i % 9 === 0 ? cool : warm;
          for (let v = 0; v < 4; v++) colors.set([base.r + (c.r - base.r) * mix, base.g + (c.g - base.g) * mix, base.b + (c.b - base.b) * mix, 1 - resolve], i * 16 + v * 4);
        }
        for (let v = 0; v < 4; v++) {
          const [x, y] = corners[v], o = i * 12 + v * 3;
          positions[o] = s.p.x + (right.x * x + up.x * y) * half;
          positions[o + 1] = s.p.y + (right.y * x + up.y * y) * half;
          positions[o + 2] = s.p.z + (right.z * x + up.z * y) * half;
        }
      }
      mesh.setPositions(positions); if (phase === 'restore') mesh.setColors(colors); mesh.update(pc.PRIMITIVE_TRIANGLES, false);
      if (phase === 'restore' && elapsed >= RESTORE) {
        originalPaint(); root.enabled = false; words(copy.found); setPhase('flight'); void handover();
      }
    }
  };
  return entrance;
}
