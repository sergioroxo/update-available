/**
 * ⚑ S376 (UiB job 19 Part B, VISUAL_REVIEW_2026-11-12 #3) — THE 2003 DESKTOP'S WALLPAPER: Restorify's own picture.
 *
 * Under every window of 2003 the ground was a flat `titleBlue` field with a navy slab across the top (S24's "minimal
 * per-era desktop re-skin", never replaced). S295 gave 2003 XP's windows, buttons and taskbar; this gives it XP's
 * ground: an OEM wallpaper, the kind a branded machine shipped with — a blue sky in bands, two clouds, a sun low on
 * the left, two rolling green hills, and the lamb on the brow. It is the programme's picture of "one day at a time"
 * (the same sunrise and lamb as its 2003 calendar on the wall, CAL_2003), so every colour is the calendar's.
 * Nothing real is depicted: the hills are invented, banded and dithered at the seams the way a 2003 desktop's
 * 256-colour fallback rendered a photograph.
 *
 * ⚑ TASTE (his eye, T71): `calm` (no rays, the period-true default, XP's own wallpaper was calm) or the louder
 * sunburst (`rays`), the system's media "over the top". Both from VISUAL_REVIEW mocks m03b / m03.
 *
 * Drawn once into a grid (theme/pixelGrid.ts) and cached; each desktop draw is one `drawImage`.
 */
import { CAL_2003 } from './calendar';
import { PixelGrid, blitGrid, type Pt } from './pixelGrid';

export type WallpaperLoudness = 'calm' | 'rays';
/** ⚑ the default his eye decides (VISUAL_REVIEW §3 taste call 7) */
export const RESTORIFY_WALLPAPER: WallpaperLoudness = 'calm';

const cache = new Map<string, HTMLCanvasElement>();

function paint(W: number, H: number, loud: WallpaperLoudness): PixelGrid {
  const C = CAL_2003;
  const g = new PixelGrid(W, H, C.skyTop);
  // the sky in four bands, each seam dithered two rows deep (a 2003 desktop's gradient, honestly stepped)
  const sky: [string, number][] = [[C.skyTop, 0.22], [C.skyMid, 0.2], [C.skyLow, 0.12], [C.skyHorizon, 0.08]];
  let y = 0;
  sky.forEach(([col, f], i) => {
    const h = Math.round(H * f);
    g.rect(0, y, W, h, col);
    if (i) g.checker(0, y, W, 2, sky[i - 1][0]);
    y += h;
  });
  g.rect(0, y, W, H - y, C.skyHorizon);
  // the sun, low on the left: the system's own light, promising a morning
  const sx = Math.round(W * 0.234), sy = Math.round(H * 0.4375);
  if (loud === 'rays') {
    const R = Math.max(W, H) * 1.1;
    for (let k = 0; k < 12; k++) {
      const a0 = (k * Math.PI) / 6, a1 = a0 + 0.12;
      const tri: Pt[] = [[sx, sy], [sx + R * Math.cos(a0), sy + R * Math.sin(a0)], [sx + R * Math.cos(a1), sy + R * Math.sin(a1)]];
      g.poly(tri, C.ray);
    }
  }
  g.disc(sx, sy, 26, C.sun);
  g.disc(sx, sy, 18, C.sunCore);
  g.checker(sx - 18, sy - 18, 36, 36, C.sun, 1, C.sunCore);   // its rim softened one dither deep…
  g.disc(sx, sy, 15, C.sunCore);                               // …and its face kept clean
  // two clouds, puffed, each with its own shadow under it
  for (const [cx, cy] of [[Math.round(W * 0.645), Math.round(H * 0.182)], [Math.round(W * 0.82), Math.round(H * 0.286)]]) {
    for (const [dx, dy, rr] of [[-18, 4, 10], [0, 0, 14], [18, 4, 10], [8, 8, 9]]) g.disc(cx + dx, cy + dy, rr, C.wool);
    g.rect(cx - 26, cy + 10, 54, 5, C.woolShade);
    g.checker(cx - 26, cy + 9, 54, 1, C.woolShade);
  }
  // the hills: the far one, then the near one — XP's rolling green, invented, with a grass edge stippled along each crest
  for (let x = 0; x < W; x++) {
    const top = Math.round(H * 0.604 - 34 * Math.sin((x + 40) / 120));
    g.rect(x, top, 1, H - top, C.hillBack);
    if (x % 3 === 0) g.rect(x, top + 4, 1, 3, C.hillBackShade);
  }
  for (let x = 0; x < W; x++) {
    const top = Math.round(H * 0.745 - 46 * Math.sin((x - 60) / 150) + 10 * Math.sin(x / 31));
    g.rect(x, top, 1, H - top, C.hillFront);
    if (Math.floor(x / 2) % 2 === 0) g.set(x, top + 1, C.hillBack);
  }
  g.checker(0, Math.round(H * 0.86), W, H - Math.round(H * 0.86), C.hillFrontShade, 0, C.hillFront);
  // the lamb on the brow of the far hill: the programme's mascot as the picture's subject, grazing toward the sun
  const lx = Math.round(W * 0.586), ly = Math.round(H * 0.6 - 2);
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
export function drawRestorifyWallpaper(ctx: CanvasRenderingContext2D, W: number, H: number, loud: WallpaperLoudness = RESTORIFY_WALLPAPER): void {
  const key = `${W}x${H}:${loud}`;
  let cv = cache.get(key);
  if (!cv) { cv = paint(W, H, loud).toCanvas(); cache.set(key, cv); }
  blitGrid(ctx, cv, 0, 0, W, H);
}
