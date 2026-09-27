/**
 * ⚑ S177 / R4-27 — hang a calendar page (calendarArt.ts) on a spawned calendar model.
 * The model carries its printed face in data/room/models.json (`face`); a prop that
 * wants a page says which (`page` in the room data: e1 · e2 · e3 · e4).
 */
import * as pc from 'playcanvas';
import { drawCalendarPage, PAGE_W, PAGE_H, type PageEra } from './calendarArt';
import { drawPrint, PRINT_SIZE, type PrintId } from './printArt';

export type { PageEra };
/** the model's printed face in its own native units: x0, y0, x1, y1, z */
export type Face = [number, number, number, number, number];
/**
 * Hang a page on a spawned calendar model: one plane over the model's front face,
 * inside the model's own (scaled) frame, a hair in front of the paper — the model's
 * rings stand further out and still read in front of it. Lit like the room's props.
 */
export function attachCalendarPage(wrapper: pc.Entity, face: Face, era: PageEra): void {
  const app = pc.Application.getApplication();
  const model = wrapper.children[0] as pc.Entity | undefined;
  if (!app || !model) return;
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W; canvas.height = PAGE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  drawCalendarPage(ctx, era);
  const tex = new pc.Texture(app.graphicsDevice, {
    width: PAGE_W, height: PAGE_H, format: pc.PIXELFORMAT_RGBA8, mipmaps: false,
    minFilter: pc.FILTER_NEAREST, magFilter: pc.FILTER_NEAREST,
    addressU: pc.ADDRESS_CLAMP_TO_EDGE, addressV: pc.ADDRESS_CLAMP_TO_EDGE
  });
  tex.setSource(canvas);
  const mat = new pc.StandardMaterial();
  mat.diffuseMap = tex;
  mat.update();
  const [x0, y0, x1, y1, z] = face;
  const plane = new pc.Entity(`${wrapper.name}-page`);
  plane.addComponent('render', { type: 'plane' });
  if (plane.render) plane.render.material = mat;
  // the plane primitive lies in XZ facing +Y; stood up it faces +Z, the paper's side
  plane.setLocalEulerAngles(90, 0, 0);
  plane.setLocalPosition((x0 + x1) / 2, (y0 + y1) / 2, z);
  plane.setLocalScale(x1 - x0, 1, y1 - y0);
  model.addChild(plane);
}

/** a pixel-art canvas as a nearest-filtered texture on a lit material */
function printMaterial(app: pc.AppBase, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): pc.StandardMaterial | null {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  draw(ctx);
  const tex = new pc.Texture(app.graphicsDevice, {
    width: w, height: h, format: pc.PIXELFORMAT_RGBA8, mipmaps: false,
    minFilter: pc.FILTER_NEAREST, magFilter: pc.FILTER_NEAREST,
    addressU: pc.ADDRESS_CLAMP_TO_EDGE, addressV: pc.ADDRESS_CLAMP_TO_EDGE
  });
  tex.setSource(canvas);
  const mat = new pc.StandardMaterial();
  mat.diffuseMap = tex;
  mat.update();
  return mat;
}

/**
 * ⚑ S179 / R5-02 — a PRINT on a box prop (a poster, a sign, a flyer): one plane over the box's
 * front face (+Z in its own frame, which its yaw turns to face the room), a hair proud of it.
 * The box is scaled to its size, so a unit plane inside it is exactly the face.
 */
export function attachPrintToBox(box: pc.Entity, id: PrintId): void {
  const app = pc.Application.getApplication();
  if (!app) return;
  const [w, h] = PRINT_SIZE[id];
  const mat = printMaterial(app, w, h, (ctx) => drawPrint(ctx, id));
  if (!mat) return;
  const plane = new pc.Entity(`${box.name}-print`);
  plane.addComponent('render', { type: 'plane' });
  if (plane.render) plane.render.material = mat;
  plane.setLocalEulerAngles(90, 0, 0);
  plane.setLocalPosition(0, 0, 0.5 + 0.02);
  box.addChild(plane);
}
