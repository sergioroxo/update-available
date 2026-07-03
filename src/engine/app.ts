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
import { mountStartupOverlay } from '../desktop/opening';
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
/** the Starter Kit floppy on the desk (S1.2 insert beat) — in the leaflet pocket */
const KIT_FLOPPY = { x: -0.34, y: 0.762, z: 0.12 };
const DRAG_PITCH_MAX = 55;
/** O1 establishing framing (reinterp): pulled back, room-wide, window-lit */
const ESTABLISH = { x: 0, y: 1.62, z: 2.55, pitch: -7 };
const CAM_MOVE_SECONDS = 1.4; // O2 establishing → desk pan

interface AppOptions {
  reinterp?: boolean;
}

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

export function startApp(canvasEl: HTMLCanvasElement, options: AppOptions = {}): pc.Application {
  const app = new pc.Application(canvasEl, {
    graphicsDeviceOptions: { antialias: false, alpha: false }
  });
  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  window.addEventListener('resize', () => app.resizeCanvas());
  app.scene.ambientLight = new pc.Color(0.16, 0.15, 0.15);

  buildEra1Room(app);

  // ── the two surfaces ──
  const os = new DesktopOS({ reinterp: options.reinterp === true });
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

  // the cold creep: when the system has filed something unseen, the witness
  // side bleeds into peripheral vision — a reason to turn around (Sérgio)
  // NOTE: no CSS transition here — opacity is driven every frame (a transition
  // would fight the per-frame pulse and the layer would never reach its target)
  const coldCreep = document.createElement('div');
  Object.assign(coldCreep.style, {
    position: 'fixed', inset: '0', zIndex: '6', pointerEvents: 'none', opacity: '0',
    background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 38%, rgba(70,110,160,0.0) 56%, rgba(80,130,190,0.82) 100%)'
  } as CSSStyleDeclaration);
  document.body.appendChild(coldCreep);
  let coldPhase = 0;

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

  // reinterp only: camera POSITION + a smoothstep move for the O2 desk pan and
  // the R (reset-view) shortcut. `conducted` = auto-cam ON: the move ignores
  // drag/keys (accessibility, §0-REV-4); OFF = it's just the default framing
  // the player can grab away from at any time.
  const camPos = new pc.Vec3(EYE.x, EYE.y, EYE.z);
  interface CamMove { fx: number; fy: number; fz: number; fp: number; fyaw: number;
    tx: number; ty: number; tz: number; tp: number; tyaw: number; t: number; dur: number; conducted: boolean; }
  let camMove: CamMove | null = null;
  let autoCam = false;

  function startCamMove(to: { x: number; y: number; z: number; pitch: number; yaw: number },
                        dur: number, conducted: boolean): void {
    const dyaw = ((to.yaw - camYaw + 540) % 360) - 180; // shortest signed rotation
    camMove = { fx: camPos.x, fy: camPos.y, fz: camPos.z, fp: camPitch, fyaw: camYaw,
      tx: to.x, ty: to.y, tz: to.z, tp: to.pitch, tyaw: camYaw + dyaw, t: 0, dur, conducted };
    tween = null;
  }
  /** grabbing/keying the view cancels a non-conducted move (the player left it) */
  function nudgeCamera(): void { if (camMove && !camMove.conducted) camMove = null; }

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

  function rayHitsPoint(e: MouseEvent, p: { x: number; y: number; z: number }, radius: number): boolean {
    const ray = screenRay(e);
    if (!ray) return false;
    const dx = ray.p1.x - ray.p0.x;
    const dy = ray.p1.y - ray.p0.y;
    const dz = ray.p1.z - ray.p0.z;
    const len2 = dx * dx + dy * dy + dz * dz;
    if (len2 < 1e-9) return false;
    let t = ((p.x - ray.p0.x) * dx + (p.y - ray.p0.y) * dy + (p.z - ray.p0.z) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = ray.p0.x + t * dx - p.x;
    const cy = ray.p0.y + t * dy - p.y;
    const cz = ray.p0.z + t * dz - p.z;
    return Math.sqrt(cx * cx + cy * cy + cz * cz) < radius;
  }

  // the disk leaves the desk when it enters the drive
  os.onKitInserted = () => {
    for (const id of ['kitFloppy', 'kitFloppyLabel', 'kitFloppyShutter']) {
      const ent = app.root.findByName(id);
      if (ent instanceof pc.Entity) ent.enabled = false;
    }
  };

  canvasEl.addEventListener('pointerdown', (e) => {
    if (!facingBack) {
      if (os.isOff && rayHitsPoint(e, POWER_BTN, 0.08)) { // the era's first gesture
        os.powerOn();
        return;
      }
      if (os.inDesktop && !os.kit && rayHitsPoint(e, KIT_FLOPPY, 0.13)) {
        os.insertKit(); // S1.2 — you put the disk in yourself
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
    nudgeCamera(); // …and a non-conducted O2/reset move
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
    // reinterp browser CAMERA controls (§0-REV-5): arrow keys always steer the
    // view; R/F are shortcuts, but only when no phase is capturing typed text —
    // camera only, never a content verb. Non-reinterp keeps the shipped path.
    if (options.reinterp && !os.paused) {
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') {
        nudgeCamera();
        if (!camMove) {
          if (k === 'ArrowLeft') camYaw += 6;
          else if (k === 'ArrowRight') camYaw -= 6;
          else if (k === 'ArrowUp') camPitch = Math.min(DRAG_PITCH_MAX, camPitch + 5);
          else camPitch = Math.max(-DRAG_PITCH_MAX, camPitch - 5);
        }
        e.preventDefault();
        return;
      }
      if (!os.isCapturingText) {
        if (k === 'r' || k === 'R') { // reset to the desk framing
          startCamMove({ x: EYE.x, y: EYE.y, z: EYE.z, pitch: 0, yaw: 0 }, 0.7, false);
          e.preventDefault();
          return;
        }
        if ((k === 'f' || k === 'F') && os.inDesktop) { // flip (only meaningful in-desktop)
          doFlip();
          e.preventDefault();
          return;
        }
      }
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
    if (options.reinterp) {
      if (camMove) {
        camMove.t += dt;
        const k = Math.min(1, camMove.t / camMove.dur);
        const s = k * k * (3 - 2 * k); // smoothstep
        camPos.x = camMove.fx + (camMove.tx - camMove.fx) * s;
        camPos.y = camMove.fy + (camMove.ty - camMove.fy) * s;
        camPos.z = camMove.fz + (camMove.tz - camMove.fz) * s;
        camPitch = camMove.fp + (camMove.tp - camMove.fp) * s;
        camYaw = camMove.fyaw + (camMove.tyaw - camMove.fyaw) * s;
        if (k >= 1) camMove = null;
      }
      camera.setLocalPosition(camPos.x, camPos.y, camPos.z);
    }
    camera.setLocalEulerAngles(camPitch, camYaw, 0);

    const nowBack = isBackYaw();
    if (nowBack !== facingBack) {
      facingBack = nowBack;
      if (facingBack) os.markWitnessSeen(); // turning around answers the nudge
      onCrossed(facingBack);
    }

    // cold creep: pulse the witness side into the edges while it goes unseen
    if (os.hasUnseenWitness && !facingBack) {
      coldPhase += dt;
      const pulse = 0.55 + 0.25 * Math.sin(coldPhase * 2.0); // 0.30–0.80, clearly felt
      coldCreep.style.opacity = pulse.toFixed(3);
    } else {
      coldPhase = 0;
      coldCreep.style.opacity = '0';
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

  // ── reinterp opening (O1): window-lit room behind the start-screen overlay ──
  function setLight(id: string, intensity: number): void {
    const e = app.root.findByName(`light-${id}`);
    if (e instanceof pc.Entity && e.light) e.light.intensity = intensity;
  }
  function applyWindowLight(): void { // O1: lit only by the window, monitor dark
    setLight('roomFill', 0.08);
    setLight('lamp', 0.0);
    setLight('screenGlow', 0.0);
    setLight('witnessCold', 0.12);
  }
  function applyLightsOn(): void { // O2: a warm ordinary click; the lamp over-throws
    setLight('roomFill', 1.0);
    setLight('lamp', 2.6);      // more than physically real — symbolic (R11-3 anchor)
    setLight('screenGlow', 0.22);
    setLight('witnessCold', 0.9);
  }

  if (options.reinterp) {
    applyWindowLight();
    camPos.set(ESTABLISH.x, ESTABLISH.y, ESTABLISH.z);
    camPitch = ESTABLISH.pitch;
    camYaw = 0;
    camera.setLocalPosition(camPos.x, camPos.y, camPos.z);
    const overlay = mountStartupOverlay({
      onContinue: (choices) => {
        autoCam = choices.autoCam;
        overlay.destroy();
        applyLightsOn();                 // O2: room lights + lamp over-throw
        // O2: framed camera moves establishing → desk (conducted under auto-cam,
        // otherwise the default framing the player can drag away from).
        startCamMove({ x: EYE.x, y: EYE.y, z: EYE.z, pitch: 0, yaw: 0 }, CAM_MOVE_SECONDS, autoCam);
        os.beginReinterpOpening();        // boot on the monitor → O3 profile
      },
      onLeave: () => { os.leaveNow(); }
    });
  }

  app.start();
  return app;
}
