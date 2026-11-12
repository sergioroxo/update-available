/**
 * ⚑ S376 (UiB job 19 Part B, VISUAL_REVIEW_2026-11-12 #3) — THE 2003 DESKTOP'S WALLPAPER: Restorify's own picture.
 *
 * Under every window of 2003 the ground was a flat `titleBlue` field with a navy slab across the top (S24's "minimal
 * per-era desktop re-skin", never replaced). S295 gave 2003 XP's windows, buttons and taskbar; this gives it XP's
 * ground: an OEM wallpaper, the kind a branded machine shipped with — a deep sky, two clouds, two rolling green
 * hills, a low sun going down behind the far one, and the lamb on its brow: the programme's picture of "one day at a
 * time" (the same hill, sun and lamb as its 2003 calendar on the wall, CAL_2003). Nothing real is depicted: the hills
 * are invented, banded and dithered at the seams the way a 2003 desktop's 256-colour fallback rendered a photograph.
 *
 * ⚑ HIS RULING ON PART A (12 Nov, T71): "the new calm one, but darker so the icons read". So the calm version, made
 * darker and softer where the icons stand: the sky is deep (ERA3's deep blue into Restorify's blue), the hills are the
 * calendar's shaded green dithered with the machine's own green, and the bright part of the picture — the clouds, the
 * low sun, the horizon's last light — lies to the right, away from the two icon columns. Every icon label is white on
 * a ground of at most about a third of white's luminance, with XP's black drop shadow (os.ts `drawIconInto`).
 *
 * Drawn once into a grid (theme/pixelGrid.ts) and cached; each desktop draw is one `drawImage`.
 */
import { CAL_2003, CAL_2016 } from './calendar';
import { ERA1 } from './era1';
import { ERA3 } from './era3';
import { PixelGrid, blitGrid } from './pixelGrid';

const cache = new Map<string, HTMLCanvasElement>();

/** the far hill's crest at x: high on the left (under the icons), falling away to the right (the sky and its light) */
function farTop(x: number, W: number, H: number): number {
  const u = x / W;
  return Math.round(H * (0.40 + 0.25 * u * u) - 14 * Math.sin(u * 7.5) - 6 * Math.sin(x / 23));
}
/** the near hill's crest: a darker swell up from the bottom left, dipping under the far hill to the right */
function nearTop(x: number, W: number, H: number): number {
  const u = x / W;
  return Math.round(H * (0.58 + 0.24 * u) - 26 * Math.sin(u * 3.4 + 0.4) + 5 * Math.sin(x / 31));
}

function paint(W: number, H: number): PixelGrid {
  const C = CAL_2003;
  const g = new PixelGrid(W, H, ERA3.deskLow);
  // the sky: deep at the top, Restorify's blue lower down, the calendar's sky only at the horizon on the right
  const bands: [string, number][] = [[ERA3.deskLow, 0.36], [ERA1.titleBlue, 0.14], [C.skyTop, 0.08], [C.skyMid, 0.05], [C.skyLow, 0.03]];
  let y = 0;
  bands.forEach(([col, f], i) => {
    const h = Math.round(H * f);
    g.rect(0, y, W, h, col);
    if (i) { g.checker(0, y, W, 2, bands[i - 1][0]); g.checker(0, y + 2, W, 2, bands[i - 1][0], 1, col); }
    y += h;
  });
  g.rect(0, y, W, H - y, C.skyHorizon);
  // the sun, low on the right, half behind the far hill: the system's own light, going down on "one day"
  const sx = Math.round(W * 0.8), sy = Math.round(H * 0.6);
  g.disc(sx, sy, 22, C.sun);
  g.checker(sx - 22, sy - 22, 44, 44, C.skyHorizon, 0, C.sun);
  g.disc(sx, sy, 17, C.sun);
  g.disc(sx, sy, 13, C.sunCore);
  // two clouds, puffed, to the right of the icons, each with its shadow under it
  for (const [cx, cy] of [[Math.round(W * 0.47), Math.round(H * 0.15)], [Math.round(W * 0.74), Math.round(H * 0.27)]]) {
    for (const [dx, dy, rr] of [[-18, 4, 10], [0, 0, 14], [18, 4, 10], [8, 8, 9]]) g.disc(cx + dx, cy + dy, rr, C.wool);
    g.rect(cx - 26, cy + 10, 54, 5, C.woolShade);
    g.checker(cx - 26, cy + 9, 54, 1, C.woolShade);
  }
  // the far hill: the calendar's shaded green dithered half and half with the pine of the hills further off, a
  //   lighter stipple along its crest where the low sun catches it
  for (let x = 0; x < W; x++) {
    const top = farTop(x, W, H);
    g.rect(x, top, 1, H - top, C.hillFrontShade);
    for (let yy = top + 3; yy < H; yy++) if ((x + yy) % 2 === 0) g.set(x, yy, CAL_2016.pine);
    g.set(x, top, C.hillFront);
    if (x % 2 === 0) g.set(x, top + 1, C.hillFront);
    if (x % 3 === 0) g.rect(x, top + 5, 1, 2, C.hillFront);
  }
  // the near hill: the shaded green with a sparse stipple of the machine's own green (soft, not a checkerboard),
  //   deepening toward the bottom of the screen
  for (let x = 0; x < W; x++) {
    const top = nearTop(x, W, H);
    g.rect(x, top, 1, H - top, CAL_2016.pine);
    for (let yy = top + 1; yy < H; yy++) {
      const k = (yy - top) / Math.max(1, H - top);
      if (k < 0.5 ? (x + yy) % 2 === 0 : (x + 2 * yy) % 4 === 0) g.set(x, yy, C.hillFrontShade);
    }
    if (Math.floor(x / 2) % 2 === 0) g.set(x, top, C.hillFrontShade);
  }
  // the lamb on the brow of the far hill, grazing toward the sun
  const lx = Math.round(W * 0.6);
  const ly = farTop(lx, W, H) - 9;
  for (const [dx, dy, rr] of [[-6, 0, 6], [2, -3, 7], [9, 0, 6], [2, 4, 6]]) g.disc(lx + dx, ly + dy, rr, C.wool);
  g.checker(lx - 10, ly + 4, 24, 5, C.woolShade, 0, C.wool);
  g.rect(lx - 6, ly + 8, 2, 6, C.lambFace);
  g.rect(lx + 8, ly + 8, 2, 6, C.lambFace);
  g.rect(lx + 13, ly - 4, 6, 6, C.lambFace);
  g.rect(lx + 12, ly - 5, 3, 2, C.lambFace);                   // an ear
  g.set(lx + 17, ly - 2, C.wool);                              // the eye
  return g;
}

/** the wallpaper over (0, 0) → (W, H), logical px */
export function drawRestorifyWallpaper(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  const key = `${W}x${H}`;
  let cv = cache.get(key);
  if (!cv) { cv = paint(W, H).toCanvas(); cache.set(key, cv); }
  blitGrid(ctx, cv, 0, 0, W, H);
}
