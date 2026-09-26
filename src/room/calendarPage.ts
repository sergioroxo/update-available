/**
 * ⚑ S177 / R4-27 — hang a calendar page (calendarArt.ts) on a spawned calendar model.
 * The model carries its printed face in data/room/models.json (`face`); a prop that
 * wants a page says which (`page` in the room data: e1 · e2 · e3 · e4).
 */
import * as pc from 'playcanvas';
import { drawCalendarPage, PAGE_W, PAGE_H, type PageEra } from './calendarArt';

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
