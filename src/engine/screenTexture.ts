/**
 * The screen-texture pipeline — extracted from app.ts (Session 37, E3-i) so
 * the three-screen room's new workstation/tablet/phone surfaces can REUSE the
 * exact same offscreen-canvas-onto-a-plane technique the desktop monitor and
 * witness wall already use, instead of duplicating it. Pure functions, no
 * closures over app state — safe to import from any room/device module.
 */
import * as pc from 'playcanvas';

/**
 * `smooth` (S177) is for a screen that is NOT pixel art: Era 3's phone, a 2016 handset
 * with a dense display, drawn at ×3 (540 × 1080) and seen from the seat ~120 px tall.
 * Nearest-filtered with no mipmaps, that shrinks into jagged, shimmering pixels (his
 * 2026-09-26: "the quality of the phone screen is terrible, super pixelated"). Smooth
 * = mipmaps + trilinear; the upload stays on-dirty-only, the mip chain rides with it.
 */
export function makeScreenTexture(app: pc.Application, source: HTMLCanvasElement, smooth: boolean | 'minify' = false): pc.Texture {
  /**
   * ⚑ W1-F1 — `'minify'`: A PIXEL SCREEN SEEN FROM FAR, WHICH IS EVERY ROOM-3 SCREEN. The 2026 monitor is drawn at
   * ×3 (2130 × 1152) and, from the seat, covers ~500 screen px: 4 texels to a pixel. Plain FILTER_NEAREST keeps one
   * texel in four and throws the rest away, so a 9 px glyph loses half its strokes ("Restoration" read as noise —
   * the colleague's "all so poorly scaled", 2026-10-08). Nearest is right for MAGNIFYING pixel art and wrong for
   * shrinking it. So: a mip chain for the shrink (trilinear, with anisotropy for the slant of the desk) and
   * FILTER_NEAREST kept for the magnify — close up, in a headset, a pixel is still a hard square. Still one
   * upload on dirty; the chain is built by the GPU with it.
   */
  const minify = smooth === 'minify';
  const mips = smooth === true || minify;
  const tex = new pc.Texture(app.graphicsDevice, {
    width: source.width,
    height: source.height,
    format: pc.PIXELFORMAT_RGBA8,
    mipmaps: mips,
    minFilter: mips ? pc.FILTER_LINEAR_MIPMAP_LINEAR : pc.FILTER_NEAREST,
    magFilter: smooth === true ? pc.FILTER_LINEAR : pc.FILTER_NEAREST,
    anisotropy: minify ? 8 : 1,
    addressU: pc.ADDRESS_CLAMP_TO_EDGE,
    addressV: pc.ADDRESS_CLAMP_TO_EDGE
  });
  tex.setSource(source);
  /**
   * ⚑ S105 — EVERY SCREEN UPLOAD IS COUNTED, so the law can be checked instead
   * of believed. CLAUDE.md's Quest budget says "render-texture uploads on dirty
   * only", and for months the piece broke it on its two busiest surfaces at
   * ~240 uploads/s while every check stayed green — because nothing in the
   * repository could see an upload happen.
   *
   * This wraps the instance (not the engine, not WebGL: patching
   * `WebGLRenderingContext.prototype.texImage2D` from a probe stops PlayCanvas
   * initialising at all, which is how this counter came to live here instead).
   * It counts exactly what the law is about — OUR screens being re-sent to the
   * GPU — and nothing else. Read it as `window.__uploads` under `?debug=1`.
   */
  const raw = tex.upload.bind(tex);
  tex.upload = (): void => { screenUploads++; raw(); };
  return tex;
}

/** ⚑ S105 — total screen-texture uploads since load; see `makeScreenTexture`. */
export let screenUploads = 0;

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
