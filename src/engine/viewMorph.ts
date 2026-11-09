/**
 * ⚑ S346 / T08 — THE VIEW MORPH: no fade to black, anywhere (his 8 Nov headset session, 12:18 and 12:42: "I don't
 * want fade to blacks in any of it… fades to the same tone, color, something… This needs to be a morph into the
 * space").
 *
 * Every cut in the piece — a seat jump's blink, the 2016 → 2026 turn at the top of the flight, reduced motion's
 * flights, and in a headset every re-forming of the room — used to cover the view with black (or with the near-black
 * of the old particle veil) and uncover it somewhere else. Now the cover IS the destination: the view from where you
 * are going is rendered once into a texture, and it arrives through drifting pixel particles that swell and merge
 * over the room you are in until it has replaced it. The cut happens under that full cover — the live room behind it
 * is by then the same room — and the particles thin out and drift on. What you see is the room turning into the next
 * room, never a dark frame.
 *
 * One render of the destination per cut (a second camera, enabled for one frame, into a render target), one small
 * mask upload per visible coverage step (bucketed). On the desktop the plane fills the camera's frustum; in a headset
 * it is a head-locked square covering 130° and the capture is made at that field of view.
 */
import * as pc from 'playcanvas';
import { TIDY } from '../desktop/theme/calendar';

export interface ViewMorph {
  /** render the view from `pose` (a world transform in the parent's space; `parent` null = the scene root) into the
   *  morph's picture. Desktop: pass the camera's own fov/aspect; headset: `xr: true`. */
  capture(pose: pc.Mat4, parent: pc.Entity | null, opts: { xr: boolean }): void;
  /** show the morph at `coverage` 0…1; `leaving` = the second half (the particles thin out and drift on) */
  set(coverage: number, leaving: boolean): void;
  hide(): void;
  readonly visible: boolean;
  /** true once the last capture has rendered (false = the fallback tone shows instead of a picture) */
  readonly captured: boolean;
  readonly layerId: number;
}

/** the headset's capture: a square this wide, on a plane this far in front of the eyes */
const XR_FOV = 130, XR_DIST = 1.2;
/** never rendered by the capture: the morph itself, the frame's own panels, debug plates */
const NOT_CAPTURED = /^(View morph|XR Frame|XR debug|Home XR|UI)$/;

export function mountViewMorph(app: pc.AppBase, camera: pc.Entity): ViewMorph {
  // ── the mask: a fixed, seeded particle field (a hash, never a formula in x and y — S281 his: no rings) ──
  const CELLS = 192;
  const mask = document.createElement('canvas'); mask.width = CELLS; mask.height = CELLS;
  const mctx = mask.getContext('2d')!;
  const hash = (n: number): number => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const PARTS = Array.from({ length: 1600 }, (_, i) => ({
    x: hash(i) * CELLS, y: hash(i + 1000) * CELLS, at: hash(i + 2000) * 0.85, size: 2 + hash(i + 3000) * 5,
    dx: (hash(i + 4000) - 0.5) * 14, dy: -4 - hash(i + 5000) * 10
  }));
  const drawMask = (c: number, leaving: boolean): void => {
    mctx.clearRect(0, 0, CELLS, CELLS);
    const wash = Math.max(0, Math.min(1, (c - 0.62) / 0.3));
    if (wash > 0) { mctx.fillStyle = `rgba(255,255,255,${wash})`; mctx.fillRect(0, 0, CELLS, CELLS); }
    for (const p of PARTS) {
      if (p.at > c) continue;
      const k = Math.min(1, (c - p.at) / 0.25), grow = 1 + (c - p.at) * 3.5;
      const drift = (leaving ? 1 - c : c) * (leaving ? 1.6 : 1);
      const sz = p.size * grow, x = p.x + p.dx * drift - sz / 2, y = p.y + p.dy * drift - sz / 2;
      mctx.fillStyle = `rgba(255,255,255,${0.35 * k})`; mctx.fillRect(x - 2, y - 2, sz + 4, sz + 4);
      mctx.fillStyle = `rgba(255,255,255,${0.85 * k})`; mctx.fillRect(x, y, sz, sz);
    }
  };
  const maskTex = new pc.Texture(app.graphicsDevice, {
    width: CELLS, height: CELLS, format: pc.PIXELFORMAT_RGBA8, mipmaps: false,
    minFilter: pc.FILTER_LINEAR, magFilter: pc.FILTER_LINEAR,
    addressU: pc.ADDRESS_CLAMP_TO_EDGE, addressV: pc.ADDRESS_CLAMP_TO_EDGE
  });
  maskTex.setSource(mask);

  // ── the picture: a render target, (re)made at the size it is asked for ──
  let rt: pc.RenderTarget | null = null, rtTex: pc.Texture | null = null;
  const ensureTarget = (w: number, h: number): void => {
    if (rtTex && rtTex.width === w && rtTex.height === h) return;
    rt?.destroy(); rtTex?.destroy();
    rtTex = new pc.Texture(app.graphicsDevice, {
      name: 'view-morph', width: w, height: h, format: pc.PIXELFORMAT_RGBA8, mipmaps: false,
      minFilter: pc.FILTER_LINEAR, magFilter: pc.FILTER_LINEAR,
      addressU: pc.ADDRESS_CLAMP_TO_EDGE, addressV: pc.ADDRESS_CLAMP_TO_EDGE
    });
    rt = new pc.RenderTarget({ colorBuffer: rtTex, depth: true });
    material.emissiveMap = rtTex; material.update();
  };

  // ── the plane, on its own layer over everything the camera draws ──
  const layer = new pc.Layer({ name: 'View morph', clearDepthBuffer: true });
  app.scene.layers.pushTransparent(layer);
  camera.camera!.layers = [...camera.camera!.layers, layer.id];
  const material = new pc.StandardMaterial();
  material.useLighting = false;
  material.diffuse = new pc.Color(0, 0, 0);
  material.emissive = new pc.Color(1, 1, 1);
  // a render target is stored bottom-up: flip it to sit the right way round on the plane
  material.emissiveMapTiling = new pc.Vec2(1, -1); material.emissiveMapOffset = new pc.Vec2(0, 1);
  material.opacityMap = maskTex;
  material.opacityMapChannel = 'a';
  material.blendType = pc.BLEND_NORMAL;
  material.depthTest = false; material.depthWrite = false;
  material.cull = pc.CULLFACE_NONE;
  material.update();
  const fallback = new pc.Color().fromString(TIDY.lamp);   // if no picture could be made: the lamp's warm, never black
  const plane = new pc.Entity('xr-view-morph');
  plane.addComponent('render', { type: 'plane', layers: [layer.id] });
  plane.render!.material = material;
  plane.setLocalEulerAngles(90, 0, 0);
  plane.enabled = false;
  camera.addChild(plane);

  // ── the capture camera: enabled for exactly one frame per capture ──
  const capCam = new pc.Entity('xr-view-morph-capture');
  capCam.addComponent('camera', { priority: -10, aspectRatioMode: pc.ASPECT_MANUAL });
  capCam.enabled = false;
  app.root.addChild(capCam);
  let capturing = 0, captured = false, xrMode = false, lastBucket = -1, visible = false;
  app.on('postrender', () => {
    if (capturing > 0 && --capturing === 0) { capCam.enabled = false; captured = true; }
  });

  const fitPlane = (): void => {
    if (xrMode) { const s = 2 * XR_DIST * Math.tan(XR_FOV / 2 * Math.PI / 180); plane.setLocalPosition(0, 0, -XR_DIST); plane.setLocalScale(s, 1, s); return; }
    const cam = camera.camera!, d = Math.max(0.1, cam.nearClip * 2);
    const aspect = app.graphicsDevice.width / Math.max(1, app.graphicsDevice.height);
    const vfov = cam.horizontalFov ? 2 * Math.atan(Math.tan(cam.fov * Math.PI / 360) / aspect) : cam.fov * Math.PI / 180;
    const h = 2 * d * Math.tan(vfov / 2) * 1.02;
    plane.setLocalPosition(0, 0, -d); plane.setLocalScale(h * aspect, 1, h);
  };

  return {
    capture(pose, parent, opts) {
      xrMode = opts.xr;
      const main = camera.camera!, c = capCam.camera!;
      const dev = app.graphicsDevice;
      if (xrMode) ensureTarget(1024, 1024);
      else ensureTarget(Math.max(64, Math.min(2048, dev.width)), Math.max(64, Math.min(2048, dev.height)));
      const want = parent ?? app.root;
      if (capCam.parent !== want) { capCam.parent?.removeChild(capCam); want.addChild(capCam); }
      capCam.setLocalPosition(pose.getTranslation()); capCam.setLocalRotation(new pc.Quat().setFromMat4(pose));
      c.clearColor = main.clearColor.clone();
      c.nearClip = main.nearClip; c.farClip = main.farClip;
      c.horizontalFov = false;
      c.fov = xrMode ? XR_FOV : (main.horizontalFov ? 2 * Math.atan(Math.tan(main.fov * Math.PI / 360) * dev.height / Math.max(1, dev.width)) * 180 / Math.PI : main.fov);
      c.aspectRatio = xrMode ? 1 : dev.width / Math.max(1, dev.height);
      c.layers = main.layers.filter((id) => !NOT_CAPTURED.test(app.scene.layers.getLayerById(id)?.name ?? ''));
      c.renderTarget = rt!;
      capCam.enabled = true; capturing = 1; captured = false;
    },
    set(coverage, leaving) {
      const cov = Math.max(0, Math.min(1, coverage));
      if (cov <= 0 && !leaving) { this.hide(); return; }
      if (!captured && capturing === 0) { material.emissiveMap = null; material.emissive = fallback; material.update(); }
      else if (material.emissiveMap !== rtTex) { material.emissiveMap = rtTex; material.emissive = new pc.Color(1, 1, 1); material.update(); }
      fitPlane();
      plane.enabled = true; visible = true;
      const bucket = Math.floor(cov * 120) * 2 + (leaving ? 1 : 0);
      if (bucket === lastBucket) return;
      lastBucket = bucket;
      drawMask(cov, leaving);
      maskTex.upload();
    },
    hide() { plane.enabled = false; visible = false; lastBucket = -1; },
    get visible() { return visible; },
    get captured() { return captured; },
    get layerId() { return layer.id; }
  };
}
