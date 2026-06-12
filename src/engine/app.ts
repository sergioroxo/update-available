/**
 * Engine — one room, two facings (PRODUCTION_SCRIPT v0.3 Part I; room per
 * ERA1_LOGIC v1 §4). The monitor at the desk carries the desktop OS; behind
 * the player, the back-of-house carries the witness repository wall.
 * Browser: drag anywhere off the monitor to look around (clamped on the life
 * side); the ⟲ control / F2 performs the 180° flip. On the witness side
 * every control is dead (cursor: not-allowed, clicks swallowed).
 * Units are meters; the monitor screen is centered at the origin.
 */
import * as pc from 'playcanvas';
import { DesktopOS } from '../desktop/os';
import { WitnessCanvas } from '../witness/intake';
import { ledger } from '../state/ledger';
import { ERA1_CANVAS } from '../desktop/theme/era1';
import { buildEra1Room } from '../room/era1room';

const FLIP_SECONDS = 0.9;
/** the CRT's visible screen (meters) — bezel boxes in era1.json sit flush */
const SCREEN = { w: 0.4, h: 0.225, x: 0, y: 1.08, z: 0 };
/** the witness repository wall (sharp, oversized — surveillance scale) */
const WITNESS = { w: 1.8, h: 1.0, x: 0, y: 1.5, z: 3.0 };
/** seated eye position at the desk */
const EYE = { x: 0, y: 1.16, z: 0.7 };
/** drag-look clamps: the life side is a glance, the flip is the act */
const DRAG_YAW_MAX = 110;
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

  // ── the flip + drag-look ──
  let yaw = 0; // 0 = desk, 180 = witness (the flip owns this)
  let yawTarget = 0;
  let dragYaw = 0; // the player's own glancing (clamped)
  let dragPitch = 0;
  let facingBack = false;
  let flipCount = 0;
  let drag: { x: number; y: number } | null = null;

  const flipBtn = document.createElement('button');
  flipBtn.id = 'flip';
  flipBtn.textContent = '⟲';
  flipBtn.title = 'turn around (F2)';
  flipBtn.setAttribute('aria-label', 'turn around (F2)');
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

  function doFlip(): void {
    if (!os.inDesktop || os.paused) return;
    yawTarget = yawTarget === 0 ? 180 : 0;
    dragYaw = 0; // the flip recenters the glance
    dragPitch = 0;
    flipBtn.style.color = '#667';
    flipBtn.style.borderColor = '#334';
    if (yawTarget === 180) {
      flipCount++;
      ledger.flips = flipCount;
      // the data thread: the name is filed the first time you witness
      if (!ledger.records.includes('ministry-index-card')) {
        ledger.records.push('ministry-index-card');
      }
      witness.messagesOnFile = os.irc ? os.irc.userMessageCount : 0;
    }
  }
  flipBtn.addEventListener('click', doFlip);

  // ── input routing: screen px → desktop canvas logical px ──
  function toDesktop(e: MouseEvent): { x: number; y: number } | null {
    if (!camera.camera) return null;
    const rect = canvasEl.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * canvasEl.clientWidth;
    const sy = ((e.clientY - rect.top) / rect.height) * canvasEl.clientHeight;
    const p0 = camera.camera.screenToWorld(sx, sy, camera.camera.nearClip);
    const p1 = camera.camera.screenToWorld(sx, sy, camera.camera.farClip);
    const dz = p1.z - p0.z;
    if (Math.abs(dz) < 1e-6) return null;
    const t = (SCREEN.z - p0.z) / dz;
    if (t < 0 || t > 1) return null;
    const wx = p0.x + (p1.x - p0.x) * t;
    const wy = p0.y + (p1.y - p0.y) * t;
    const u = (wx - SCREEN.x) / SCREEN.w + 0.5;
    const v = 0.5 - (wy - SCREEN.y) / SCREEN.h;
    if (u < 0 || u > 1 || v < 0 || v > 1) return null;
    // hit-testing speaks logical pixels; the backing store is ×RENDER_SCALE
    return { x: u * ERA1_CANVAS.width, y: v * ERA1_CANVAS.height };
  }

  canvasEl.addEventListener('pointerdown', (e) => {
    const p = facingBack ? null : toDesktop(e);
    if (p) { // the monitor is the UI; everywhere else is the room
      os.handleClick(p.x, p.y);
      return;
    }
    drag = { x: e.clientX, y: e.clientY };
    try { canvasEl.setPointerCapture(e.pointerId); } catch { /* synthetic pointers */ }
  });
  canvasEl.addEventListener('pointermove', (e) => {
    if (drag && (e.buttons & 1)) {
      dragYaw = Math.max(-DRAG_YAW_MAX, Math.min(DRAG_YAW_MAX, dragYaw - (e.clientX - drag.x) * 0.16));
      dragPitch = Math.max(-DRAG_PITCH_MAX, Math.min(DRAG_PITCH_MAX, dragPitch - (e.clientY - drag.y) * 0.12));
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
    // camera swing (the flip) + the player's own glance
    if (yaw !== yawTarget) {
      const dir = Math.sign(yawTarget - yaw);
      yaw += dir * (180 / FLIP_SECONDS) * dt;
      if ((dir > 0 && yaw >= yawTarget) || (dir < 0 && yaw <= yawTarget)) yaw = yawTarget;
    }
    camera.setLocalEulerAngles(dragPitch, yaw + dragYaw, 0);

    const nowBack = yaw > 90;
    if (nowBack !== facingBack) {
      facingBack = nowBack;
      canvasEl.style.cursor = facingBack ? 'not-allowed' : 'default';
      if (!facingBack && flipCount > 0) os.unlockDossier(); // returned: card #1
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
