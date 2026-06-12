/**
 * Engine — one room, two facings (PRODUCTION_SCRIPT v0.3 Part I; room per
 * ERA1_LOGIC v1 §4). The monitor at the desk carries the desktop OS; behind
 * the player, the back-of-house carries the witness repository wall.
 * Browser: drag anywhere off the monitor to look around — fully free, 360°;
 * the ⟲ control / F2 is an assist that swings you around. Crossing to the
 * witness hemisphere does the filing bookkeeping however you got there.
 * On the witness side every control is dead (cursor: not-allowed).
 * Units are meters; the monitor screen is centered at the origin.
 */
import * as pc from 'playcanvas';
import { DesktopOS } from '../desktop/os';
import { WitnessCanvas } from '../witness/intake';
import { ledger } from '../state/ledger';
import { ERA1_CANVAS } from '../desktop/theme/era1';
import { buildEra1Room } from '../room/era1room';
import strings from '../../data/strings/slice.json';

const FLIP_SECONDS = 0.9;
/** the CRT's visible screen (meters, 4:3) — bezels in era1.json sit flush */
const SCREEN = { w: 0.4, h: 0.3, x: 0, y: 1.08, z: 0 };
/** the witness repository wall (sharp, oversized — surveillance scale) */
const WITNESS = { w: 1.6, h: 1.2, x: 0, y: 1.5, z: 3.4 };
/** seated eye position at the desk */
const EYE = { x: 0, y: 1.16, z: 0.7 };
/** the power button on the CRT (S1.0 power-on beat) */
const POWER_BTN = { x: 0.19, y: 0.895, z: 0.03 };
const DRAG_PITCH_MAX = 55;

function makeScreenTexture(app: pc.Application, source: HTMLCanvasElement): pc.Texture {
  const tex = new pc.Texture(app.graphicsDevice, {
    width: source.width,
    height: source.height,
    format: pc.PIXELFORMAT_RGBA8,
    mipmaps: false,
    minFilter: pc.FILTER_NEAREST,
    magFilter: pc.FILTER_NEAREST,
    addressU: pc.ADDRESS_CLAMP_TO_EDGE,
    addressV: pc.ADDRESS_CLAMP_TO_EDGE
  });
  tex.setSource(source);
  return tex;
}

function makeScreenEntity(name: string, tex: pc.Texture, w: number, h: number): pc.Entity {
  const material = new pc.StandardMaterial();
  material.useLighting = false;
  material.diffuse = new pc.Color(0, 0, 0);
  material.emissiveMap = tex;
  material.emissive = new pc.Color(1, 1, 1);
  material.update();
  const e = new pc.Entity(name);
  e.addComponent('render', { type: 'plane' });
  e.setLocalScale(w, 1, h);
  if (e.render) e.render.material = material;
  return e;
}

export function startApp(canvasEl: HTMLCanvasElement): pc.Application {
  const app = new pc.Application(canvasEl, {
    graphicsDeviceOptions: { antialias: false, alpha: false }
  });
  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  window.addEventListener('resize', () => app.resizeCanvas());
  app.scene.ambientLight = new pc.Color(0.16, 0.15, 0.15);

  buildEra1Room(app);

  // ── the two surfaces ──
  const os = new DesktopOS();
  const witness = new WitnessCanvas();

  const frontTex = makeScreenTexture(app, os.canvas);
  const front = makeScreenEntity('desktop-screen', frontTex, SCREEN.w, SCREEN.h);
  front.setLocalPosition(SCREEN.x, SCREEN.y, SCREEN.z);
  front.setLocalEulerAngles(90, 0, 0); // faces +Z (the chair)
  app.root.addChild(front);

  const backTex = makeScreenTexture(app, witness.canvas);
  const back = makeScreenEntity('witness-screen', backTex, WITNESS.w, WITNESS.h);
  back.setLocalPosition(WITNESS.x, WITNESS.y, WITNESS.z);
  back.setLocalEulerAngles(90, 180, 0); // faces -Z (the chair, once turned)
  app.root.addChild(back);

  const camera = new pc.Entity('camera');
  camera.addComponent('camera', {
    clearColor: new pc.Color(0.05, 0.04, 0.03),
    fov: 42,
    nearClip: 0.05
  });
  camera.setLocalPosition(EYE.x, EYE.y, EYE.z);
  app.root.addChild(camera);

  // vignette: definition falls off toward the edges (taste call: no particles)
  const vignette = document.createElement('div');
  Object.assign(vignette.style, {
    position: 'fixed', inset: '0', zIndex: '5', pointerEvents: 'none',
    background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 52%, rgba(26,16,8,0.55) 100%)'
  } as CSSStyleDeclaration);
  document.body.appendChild(vignette);

  // S1.0 hint: shown while the machine waits dark
  const offHint = document.createElement('div');
  offHint.textContent = strings.off.hint;
  Object.assign(offHint.style, {
    position: 'fixed', left: '0', right: '0', bottom: '16%', zIndex: '6',
    textAlign: 'center', color: '#d8cdb4', font: '13px monospace',
    pointerEvents: 'none', opacity: '0', transition: 'opacity 1.2s'
  } as CSSStyleDeclaration);
  document.body.appendChild(offHint);
  let offShown = false;

  // ── camera state: one free yaw; the flip is a tween on it ──
  let camYaw = 0;
  let camPitch = 0;
  let tween: number | null = null; // yaw target while the ⟲ swing runs
  let facingBack = false;
  let flipCount = 0;
  let drag: { x: number; y: number } | null = null;

  const isBackYaw = (): boolean => {
    const n = ((camYaw % 360) + 360) % 360;
    return n > 90 && n < 270;
  };

  const flipBtn = document.createElement('button');
  flipBtn.id = 'flip';
  flipBtn.textContent = '⟲';
  flipBtn.title = 'turn around (F2 — or just drag)';
  flipBtn.setAttribute('aria-label', 'turn around (F2, or drag the view)');
  Object.assign(flipBtn.style, {
    position: 'fixed', right: '14px', bottom: '14px', zIndex: '10',
    width: '36px', height: '36px', borderRadius: '18px',
    background: 'rgba(20,20,28,0.85)', color: '#667', border: '1px solid #334',
    font: '16px monospace', cursor: 'pointer', display: 'none',
    transition: 'color 0.3s, border-color 0.3s'
  } as CSSStyleDeclaration);
  document.body.appendChild(flipBtn);

  const pulse = (): void => {
    flipBtn.style.color = '#ffd';
    flipBtn.style.borderColor = '#ffd';
  };
  os.onFlipReady = pulse;
  os.onLeave = () => { flipBtn.style.display = 'none'; };

  /** the ⟲ assist: tween to the other facing (drag can do it manually too) */
  function doFlip(): void {
    if (!os.inDesktop || os.paused) return;
    const n = ((camYaw % 360) + 360) % 360;
    const target = facingBack ? 0 : 180;
    const delta = ((target - n + 540) % 360) - 180;
    tween = camYaw + delta;
    flipBtn.style.color = '#667';
    flipBtn.style.borderColor = '#334';
  }
  flipBtn.addEventListener('click', doFlip);

  /** crossing to the witness hemisphere files you — however you turned */
  function onCrossed(back2: boolean): void {
    canvasEl.style.cursor = back2 ? 'not-allowed' : 'default';
    if (back2) {
      if (!os.inDesktop) return; // nothing on record before the desktop
      flipCount++;
      ledger.flips = flipCount;
      // the data thread: the name is filed the first time you witness
      if (!ledger.records.includes('ministry-index-card')) {
        ledger.records.push('ministry-index-card');
      }
      witness.messagesOnFile = os.irc ? os.irc.userMessageCount : 0;
    } else if (flipCount > 0) {
      os.unlockDossier(); // returned: card #1
    }
  }

  // ── input routing ──
  function screenRay(e: MouseEvent): { p0: pc.Vec3; p1: pc.Vec3 } | null {
    if (!camera.camera) return null;
    const rect = canvasEl.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * canvasEl.clientWidth;
    const sy = ((e.clientY - rect.top) / rect.height) * canvasEl.clientHeight;
    return {
      p0: camera.camera.screenToWorld(sx, sy, camera.camera.nearClip),
      p1: camera.camera.screenToWorld(sx, sy, camera.camera.farClip)
    };
  }

  /** screen px → desktop canvas logical px (the monitor plane at z=0) */
  function toDesktop(e: MouseEvent): { x: number; y: number } | null {
    const ray = screenRay(e);
    if (!ray) return null;
    const dz = ray.p1.z - ray.p0.z;
    if (Math.abs(dz) < 1e-6) return null;
    const t = (SCREEN.z - ray.p0.z) / dz;
    if (t < 0 || t > 1) return null;
    const wx = ray.p0.x + (ray.p1.x - ray.p0.x) * t;
    const wy = ray.p0.y + (ray.p1.y - ray.p0.y) * t;
    const u = (wx - SCREEN.x) / SCREEN.w + 0.5;
    const v = 0.5 - (wy - SCREEN.y) / SCREEN.h;
    if (u < 0 || u > 1 || v < 0 || v > 1) return null;
    // hit-testing speaks logical pixels; the backing store is ×RENDER_SCALE
    return { x: u * ERA1_CANVAS.width, y: v * ERA1_CANVAS.height };
  }

  function rayHitsPowerButton(e: MouseEvent): boolean {
    const ray = screenRay(e);
    if (!ray) return false;
    const dx = ray.p1.x - ray.p0.x;
    const dy = ray.p1.y - ray.p0.y;
    const dz = ray.p1.z - ray.p0.z;
    const len2 = dx * dx + dy * dy + dz * dz;
    if (len2 < 1e-9) return false;
    let t = ((POWER_BTN.x - ray.p0.x) * dx + (POWER_BTN.y - ray.p0.y) * dy + (POWER_BTN.z - ray.p0.z) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = ray.p0.x + t * dx - POWER_BTN.x;
    const cy = ray.p0.y + t * dy - POWER_BTN.y;
    const cz = ray.p0.z + t * dz - POWER_BTN.z;
    return Math.sqrt(cx * cx + cy * cy + cz * cz) < 0.08;
  }

  canvasEl.addEventListener('pointerdown', (e) => {
    if (!facingBack) {
      if (os.isOff && rayHitsPowerButton(e)) { // the era's first gesture
        os.powerOn();
        return;
      }
      const p = toDesktop(e);
      if (p) { // the monitor is the UI; everywhere else is the room
        os.handleClick(p.x, p.y);
        return;
      }
    }
    drag = { x: e.clientX, y: e.clientY };
    tween = null; // grabbing the view cancels the assist
    try { canvasEl.setPointerCapture(e.pointerId); } catch { /* synthetic pointers */ }
  });
  canvasEl.addEventListener('pointermove', (e) => {
    if (drag && (e.buttons & 1)) {
      camYaw -= (e.clientX - drag.x) * 0.16;
      camPitch = Math.max(-DRAG_PITCH_MAX, Math.min(DRAG_PITCH_MAX, camPitch - (e.clientY - drag.y) * 0.12));
      drag = { x: e.clientX, y: e.clientY };
      return;
    }
    if (facingBack) return; // the witness side does not respond to you
    const p = toDesktop(e);
    if (p) os.handleMove(p.x, p.y);
  });
  canvasEl.addEventListener('pointerup', () => { drag = null; });
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    // F2, not a letter: printable keys must always reach the typing hand
    if (e.key === 'F2' && os.inDesktop && !os.paused) {
      doFlip();
      e.preventDefault();
      return;
    }
    if (facingBack) { // Esc returns; everything else is swallowed
      if (e.key === 'Escape') doFlip();
      e.preventDefault();
      return;
    }
    if (os.handleKey(e.key)) e.preventDefault();
  });

  // ── frame loop ──
  app.on('update', (dt: number) => {
    if (tween !== null) {
      const dir = Math.sign(tween - camYaw);
      camYaw += dir * (180 / FLIP_SECONDS) * dt;
      if ((dir > 0 && camYaw >= tween) || (dir < 0 && camYaw <= tween)) {
        camYaw = tween;
        tween = null;
      }
      camPitch += (0 - camPitch) * Math.min(1, dt * 6); // level out during the swing
    }
    camera.setLocalEulerAngles(camPitch, camYaw, 0);

    const nowBack = isBackYaw();
    if (nowBack !== facingBack) {
      facingBack = nowBack;
      onCrossed(facingBack);
    }

    // S1.0: the hint alone carries the beat (Sérgio: no blur needed)
    if (os.isOff !== offShown) {
      offShown = os.isOff;
      offHint.style.opacity = offShown ? '1' : '0';
    }

    os.update(dt);
    if (os.dirty) { frontTex.upload(); os.dirty = false; }
    witness.update(dt);
    if (witness.dirty) { backTex.upload(); witness.dirty = false; }

    if (os.inDesktop) flipBtn.style.display = 'block';
  });

  app.start();
  return app;
}
