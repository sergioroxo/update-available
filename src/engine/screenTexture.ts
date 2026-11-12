/**
 * The screen-texture pipeline — extracted from app.ts (Session 37, E3-i) so
 * the three-screen room's new workstation/tablet/phone surfaces can REUSE the
 * exact same offscreen-canvas-onto-a-plane technique the desktop monitor and
 * witness wall already use, instead of duplicating it. Pure functions, no
 * closures over app state — safe to import from any room/device module.
 */
import * as pc from 'playcanvas';
import { runtimeQuery } from '../edition';

/**
 * ⚑ S374 / J18-B3 (IDEAS_XR_TEXT idea 6b) — THE HEADSET'S CANVAS SCALE. The screens are redrawn at ×4 in a headset
 * (S270d), and every redraw re-sends the whole canvas: 2016's workstation is 16.9 MB a time, up to 30 times a second
 * while Floppy Sheep plays. With job 18's ×1.2 glass a ×3 canvas still carries 31–39 texels per degree from the seat, about
 * twice the eye buffer's ~17, for 44 % fewer bytes. ×4 stays the default; `?xrcanvas=3` tries ×3 in the headset without a
 * build, so his fps readout and his eye can compare the two.
 */
export function xrCanvasScale(): number { return Number(runtimeQuery().get('xrcanvas')) === 3 ? 3 : 4; }

/**
 * `smooth` (S177) is for a screen that is NOT pixel art: Era 3's phone, a 2016 handset
 * with a dense display, drawn at ×3 (540 × 1080) and seen from the seat ~120 px tall.
 * Nearest-filtered with no mipmaps, that shrinks into jagged, shimmering pixels (his
 * 2026-09-26: "the quality of the phone screen is terrible, super pixelated"). Smooth
 * = mipmaps + trilinear; the upload stays on-dirty-only, the mip chain rides with it.
 */
export function makeScreenTexture(app: pc.AppBase, source: HTMLCanvasElement, smooth: boolean | 'minify' | 'screen' | 'film' = false): pc.Texture {
  /**
   * ⚑ S371 — `'film'`: A FILM'S OWN SMALL RECT, uploaded on every new frame of the film while it plays (the site viewer's
   * film plane, frame/siteViewer/xrMount.ts). Seen head-on at about 1:1, so linear both ways and NO mip chain: a chain
   * would be rebuilt on each of those uploads. Never switched to mips in a headset either. Counted like every screen.
   */
  const film = smooth === 'film';
  /**
   * ⚑ S346 / T-desk (a) — `'screen'`: STRAIGHT LINES FROM ANY ANGLE, for the SCREENS only (his approval, 9 Nov 2026).
   * "When I move and see a screen at an angle, lines and letters break into stair-steps" ("Welcome back, Daniel" in
   * Profile setup). The cause was nearest sampling: at a slant one axis of the glass is squeezed, nearest keeps one
   * texel in several, and every edge that is not square to the view steps. So a screen is sampled the way a real
   * display is seen: a mip chain (rebuilt by the GPU on every upload; uploads stay on-dirty only), trilinear, and the
   * most anisotropy the device allows, with linear magnify. The canvases are drawn at ×3 (×4 in a headset), so a
   * screen seen head-on is still crisp. THE ROOM'S OWN TEXTURES KEEP FILTER_NEAREST (CLAUDE.md, the dated exception).
   */
  /**
   * ⚑ W1-F1 — `'minify'`: A PIXEL SCREEN SEEN FROM FAR, WHICH IS EVERY ROOM-3 SCREEN. The 2026 monitor is drawn at
   * ×3 (2130 × 1152) and, from the seat, covers ~500 screen px: 4 texels to a pixel. Plain FILTER_NEAREST keeps one
   * texel in four and throws the rest away, so a 9 px glyph loses half its strokes ("Restoration" read as noise —
   * the colleague's "all so poorly scaled", 2026-10-08). Nearest is right for MAGNIFYING pixel art and wrong for
   * shrinking it. So: a mip chain for the shrink (trilinear, with anisotropy for the slant of the desk) and
   * FILTER_NEAREST kept for the magnify — close up, in a headset, a pixel is still a hard square. Still one
   * upload on dirty; the chain is built by the GPU with it.
   */
  const screen = smooth === 'screen';
  const minify = smooth === 'minify';
  const mips = smooth === true || minify || screen;
  /** the most the device allows (WebGL reports 1 where there is no extension) */
  const maxAniso = Math.max(1, Math.min(16, app.graphicsDevice.maxAnisotropy || 1));
  const tex = new pc.Texture(app.graphicsDevice, {
    width: source.width,
    height: source.height,
    format: pc.PIXELFORMAT_RGBA8,
    mipmaps: mips,
    minFilter: mips ? pc.FILTER_LINEAR_MIPMAP_LINEAR : film ? pc.FILTER_LINEAR : pc.FILTER_NEAREST,
    magFilter: smooth === true || screen || film ? pc.FILTER_LINEAR : pc.FILTER_NEAREST,
    anisotropy: screen ? maxAniso : minify ? 8 : 1,
    addressU: pc.ADDRESS_CLAMP_TO_EDGE,
    addressV: pc.ADDRESS_CLAMP_TO_EDGE
  });
  tex.setSource(source);
  // Session-only quality; restore the exact browser sampler on exit.
  const xrQuality = (immersive: boolean): void => {
    if (film) return;   // the film's rect keeps its sampler: no chain to rebuild on every frame of the film
    tex.mipmaps = immersive || mips;
    tex.minFilter = immersive || mips ? pc.FILTER_LINEAR_MIPMAP_LINEAR : pc.FILTER_NEAREST;
    tex.magFilter = immersive || smooth === true || screen ? pc.FILTER_LINEAR : pc.FILTER_NEAREST;
    tex.anisotropy = screen ? maxAniso : immersive ? Math.min(8, app.graphicsDevice.maxAnisotropy) : minify ? 8 : 1;
    tex.upload();
  };
  const onXrStart = (): void => xrQuality(true);
  // PlayCanvas fires end before clearing its session; active is still true in that callback.
  const onXrEnd = (): void => xrQuality(false);
  app.xr?.on('start', onXrStart); app.xr?.on('end', onXrEnd);
  if (app.xr?.active) xrQuality(true);
  const dispose = tex.destroy.bind(tex);
  tex.destroy = (): void => { app.xr?.off('start', onXrStart); app.xr?.off('end', onXrEnd); dispose(); };
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
  (tex as unknown as { __screen: boolean }).__screen = true;   // S270e: xrTextures.ts leaves the screens to xrQuality
  const raw = tex.upload.bind(tex);
  // ⚑ S270d (his headset: "the screen… black blank screen", every pass) — a screen's canvas is redrawn at ×4 in a
  //   headset (os.ts, era3Devices.ts). setSource() alone records the new size but keeps the GPU texture at the old
  //   one, so the engine wrote every later frame with texSubImage2D into a texture too small for it: refused, every
  //   time, and the monitor showed its first (black) frame for the rest of the session. resize() rebuilds it.
  let allocW = source.width, allocH = source.height;
  tex.upload = (): void => {
    if (allocW !== source.width || allocH !== source.height) {
      allocW = source.width; allocH = source.height;
      tex.resize(1, 1); tex.resize(allocW, allocH); tex.setSource(source);
    }
    screenUploads++; raw();
  };
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
