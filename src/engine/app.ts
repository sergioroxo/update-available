/**
 * Engine — one scene, two facings (PRODUCTION_SCRIPT v0.3 Part I).
 * Front plane: the desktop OS. Behind the camera: the witness side.
 * Browser flip = the ⟲ control swings the camera 180°; on the witness
 * side every control is dead (cursor: not-allowed, clicks swallowed).
 * The room and the XR session arrive in the next milestone.
 */
import * as pc from 'playcanvas';
import { DesktopOS } from '../desktop/os';
import { WitnessCanvas } from '../witness/intake';
import { ledger } from '../state/ledger';

const FLIP_SECONDS = 0.9;

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

function makeScreenEntity(name: string, tex: pc.Texture, aspect: number): pc.Entity {
  const material = new pc.StandardMaterial();
  material.useLighting = false;
  material.diffuse = new pc.Color(0, 0, 0);
  material.emissiveMap = tex;
  material.emissive = new pc.Color(1, 1, 1);
  material.update();
  const e = new pc.Entity(name);
  e.addComponent('render', { type: 'plane' });
  e.setLocalScale(aspect, 1, 1);
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
  app.scene.ambientLight = new pc.Color(0.05, 0.05, 0.06);

  // ── the two surfaces ──
  const os = new DesktopOS();
  const witness = new WitnessCanvas();
  const aspect = os.canvas.width / os.canvas.height;

  const frontTex = makeScreenTexture(app, os.canvas);
  const front = makeScreenEntity('desktop-screen', frontTex, aspect);
  front.setLocalPosition(0, 0, 0);
  front.setLocalEulerAngles(90, 0, 0); // faces +Z (camera)
  app.root.addChild(front);

  const backTex = makeScreenTexture(app, witness.canvas);
  const back = makeScreenEntity('witness-screen', backTex, aspect);
  back.setLocalPosition(0, 0, 3.2);
  back.setLocalEulerAngles(90, 180, 0); // faces -Z (camera, once turned)
  app.root.addChild(back);

  const camera = new pc.Entity('camera');
  camera.addComponent('camera', { clearColor: new pc.Color(0, 0, 0), fov: 45 });
  camera.setLocalPosition(0, 0, 1.6);
  app.root.addChild(camera);

  // ── the flip ──
  let yaw = 0;
  let yawTarget = 0;
  let facingBack = false;
  let flipCount = 0;

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

  // ── input routing: screen px → desktop canvas px ──
  function toDesktop(e: MouseEvent): { x: number; y: number } | null {
    if (!camera.camera) return null;
    const rect = canvasEl.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * canvasEl.clientWidth;
    const sy = ((e.clientY - rect.top) / rect.height) * canvasEl.clientHeight;
    const p0 = camera.camera.screenToWorld(sx, sy, camera.camera.nearClip);
    const p1 = camera.camera.screenToWorld(sx, sy, camera.camera.farClip);
    const dz = p1.z - p0.z;
    if (Math.abs(dz) < 1e-6) return null;
    const t = (0 - p0.z) / dz; // front plane lives at z=0
    if (t < 0 || t > 1) return null;
    const wx = p0.x + (p1.x - p0.x) * t;
    const wy = p0.y + (p1.y - p0.y) * t;
    const u = wx / aspect + 0.5;
    const v = 0.5 - wy;
    if (u < 0 || u > 1 || v < 0 || v > 1) return null;
    return { x: u * os.canvas.width, y: v * os.canvas.height };
  }

  canvasEl.addEventListener('pointerdown', (e) => {
    if (facingBack) return; // the witness side does not respond to you
    const p = toDesktop(e);
    if (p) os.handleClick(p.x, p.y);
  });
  canvasEl.addEventListener('pointermove', (e) => {
    if (facingBack) return;
    const p = toDesktop(e);
    if (p) os.handleMove(p.x, p.y);
  });
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
    // camera swing
    if (yaw !== yawTarget) {
      const dir = Math.sign(yawTarget - yaw);
      yaw += dir * (180 / FLIP_SECONDS) * dt;
      if ((dir > 0 && yaw >= yawTarget) || (dir < 0 && yaw <= yawTarget)) yaw = yawTarget;
      camera.setLocalEulerAngles(0, yaw, 0);
    }
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
