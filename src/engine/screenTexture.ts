/**
 * The screen-texture pipeline — extracted from app.ts (Session 37, E3-i) so
 * the three-screen room's new laptop/tablet/phone surfaces can REUSE the
 * exact same offscreen-canvas-onto-a-plane technique the desktop monitor and
 * witness wall already use, instead of duplicating it. Pure functions, no
 * closures over app state — safe to import from any room/device module.
 */
import * as pc from 'playcanvas';

export function makeScreenTexture(app: pc.Application, source: HTMLCanvasElement): pc.Texture {
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

export function makeScreenEntity(name: string, tex: pc.Texture, w: number, h: number, transparent = false): pc.Entity {
  const material = new pc.StandardMaterial();
  material.useLighting = false;
  material.diffuse = new pc.Color(0, 0, 0);
  material.emissiveMap = tex;
  material.emissive = new pc.Color(1, 1, 1);
  if (transparent) {
    material.opacityMap = tex;
    material.opacityMapChannel = 'a';
    material.blendType = pc.BLEND_NORMAL;
    material.depthWrite = false;
  }
  material.update();
  const e = new pc.Entity(name);
  e.addComponent('render', { type: 'plane' });
  e.setLocalScale(w, 1, h);
  if (e.render) e.render.material = material;
  return e;
}
