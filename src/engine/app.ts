/**
 * Engine bootstrap — PlayCanvas (as npm package; no cloud editor).
 * One scene, two cameras (PRODUCTION_SCRIPT_v0.3 Part I): for the scaffold,
 * only the browser camera exists, locked to the monitor. The room, the
 * drag-to-look orbit, and the XR session arrive with the vertical slice.
 */
import * as pc from 'playcanvas';
import { DesktopCanvas } from '../desktop/canvas';

export function startApp(canvasEl: HTMLCanvasElement): pc.Application {
  const app = new pc.Application(canvasEl, {
    graphicsDeviceOptions: { antialias: false, alpha: false }
  });
  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  window.addEventListener('resize', () => app.resizeCanvas());

  app.scene.ambientLight = new pc.Color(0.05, 0.05, 0.06);

  // ── The desktop canvas → texture (FILTER_NEAREST: the pixel law) ──
  const desktop = new DesktopCanvas();
  const texture = new pc.Texture(app.graphicsDevice, {
    width: desktop.canvas.width,
    height: desktop.canvas.height,
    format: pc.PIXELFORMAT_RGBA8,
    mipmaps: false,
    minFilter: pc.FILTER_NEAREST,
    magFilter: pc.FILTER_NEAREST,
    addressU: pc.ADDRESS_CLAMP_TO_EDGE,
    addressV: pc.ADDRESS_CLAMP_TO_EDGE
  });
  texture.setSource(desktop.canvas);

  const material = new pc.StandardMaterial();
  material.useLighting = false;
  material.diffuse = new pc.Color(0, 0, 0);
  material.emissiveMap = texture;
  material.emissive = new pc.Color(1, 1, 1);
  material.update();

  // ── The monitor plane (16:9), facing the camera ──
  const screen = new pc.Entity('monitor-screen');
  screen.addComponent('render', { type: 'plane' });
  screen.setLocalEulerAngles(90, 0, 0); // plane +Y normal → +Z (faces camera)
  const aspect = desktop.canvas.width / desktop.canvas.height;
  screen.setLocalScale(aspect, 1, 1);
  if (screen.render) screen.render.material = material;
  app.root.addChild(screen);

  // ── Browser camera, locked on the screen ──
  const camera = new pc.Entity('camera');
  camera.addComponent('camera', {
    clearColor: new pc.Color(0, 0, 0),
    fov: 45
  });
  camera.setLocalPosition(0, 0, 1.6);
  app.root.addChild(camera);

  app.on('update', (dt: number) => {
    desktop.update(dt);
    if (desktop.dirty) {
      texture.upload();
      desktop.dirty = false;
    }
  });

  app.start();
  return app;
}
