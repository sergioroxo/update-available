/**
 * ⚑ S376 (UiB job 19 Part B, VISUAL_REVIEW_2026-11-12 #2) — THE SIX PROFILE PICTURES, as a 1997 machine drew them.
 *
 * The first thing Daniel answers on his machine is "Pick a picture for your profile." Two of the six (the star and
 * the moon) were drawn in `tooltip` cream on `paper` cream, about 1.05 : 1 — invisible on the computer and in the
 * headset — and the other four were 20 px marks lost in 36 px wells. They are now 32 × 32 icons in the Win95 manner:
 * a 1 px black outline, flat fills, one dithered shade, a white glint. ERA1's sixteen colours only; none of them is a
 * person. The chosen one comes back in the recap as "self-image: aspirational", so each is something a
 * sixteen-year-old would pick: a star, a mixtape, a red flower, a blue bird, a heart, the moon.
 *
 * Drawn once into a grid (theme/pixelGrid.ts) and cached; the ids are `data/strings/opening.json` `o3_icons`.
 */
import { ERA1 } from './era1';
import { PixelGrid, blitGrid, type Pt } from './pixelGrid';

export const PROFILE_ICON = 32;

const cache = new Map<string, HTMLCanvasElement>();

function paint(id: string): PixelGrid {
  const g = new PixelGrid(PROFILE_ICON, PROFILE_ICON);
  const K = ERA1.black;
  switch (id) {
    case 'star': {
      const pts: Pt[] = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 === 0 ? 14.6 : 6.2;
        pts.push([16 + r * Math.cos(a), 17 + r * Math.sin(a)]);
      }
      g.poly(pts, ERA1.tooltip, K);
      // the glint on the upper arm, the shade dithered into the lower right (the light from the top left, as Win95's)
      g.poly([[16, 6], [18.5, 12.5], [16, 15], [13.5, 12.5]], ERA1.white);
      g.checker(16, 17, 9, 8, ERA1.olive, 0, ERA1.tooltip);
      g.checker(20, 15, 6, 3, ERA1.olive, 0, ERA1.tooltip);
      break;
    }
    case 'tape': {
      g.rect(2, 7, 28, 19, K);
      g.rect(3, 8, 26, 17, ERA1.grey);
      g.rect(3, 8, 26, 1, ERA1.silver);
      g.rect(5, 9, 22, 8, ERA1.white);          // the label…
      g.rect(5, 9, 22, 2, ERA1.warn);           // …its red band
      g.rect(8, 13, 16, 1, ERA1.greyDark);      // a title in biro
      g.rect(8, 18, 16, 5, ERA1.greyDark);      // the window onto the reels
      for (const x of [11, 21]) { g.disc(x, 20, 2, ERA1.white); g.set(x, 20, K); }
      g.rect(10, 24, 12, 2, ERA1.silver);       // the bottom edge, where the head reads it
      g.set(4, 24, ERA1.greyDark); g.set(27, 24, ERA1.greyDark);   // two screws
      break;
    }
    case 'flower': {
      g.rect(15, 16, 2, 14, ERA1.ok);           // the stem
      g.rect(15, 16, 1, 14, ERA1.olive);
      g.poly([[16, 24], [9, 19], [8, 22], [15, 26]], ERA1.ok, K);
      g.poly([[17, 27], [24, 21], [25, 24], [18, 29]], ERA1.ok, K);
      const petals: [number, number][] = [[0, -7], [7, 0], [0, 7], [-7, 0], [5, -5], [5, 5], [-5, 5], [-5, -5]];
      for (const [dx, dy] of petals) g.disc(16 + dx, 12 + dy, 4, K);
      for (const [dx, dy] of petals) g.disc(16 + dx, 12 + dy, 3, ERA1.warn);
      for (const [dx, dy] of [[5, 5], [0, 7], [7, 0]] as [number, number][]) g.checker(16 + dx - 2, 12 + dy - 1, 4, 3, ERA1.warnDark, 0, ERA1.warn);
      g.set(9, 5, ERA1.white); g.set(10, 5, ERA1.white); g.set(9, 6, ERA1.white);
      g.disc(16, 12, 4, K);
      g.disc(16, 12, 3, ERA1.tooltip);
      g.checker(16, 13, 3, 2, ERA1.olive, 0, ERA1.tooltip);
      break;
    }
    case 'bird': {
      g.rect(9, 27, 13, 1, ERA1.olive);         // the branch he sits on
      g.rect(12, 23, 1, 4, K); g.rect(16, 22, 1, 5, K);
      g.poly([[4, 17], [9, 12], [18, 11], [24, 8], [28, 11], [25, 16], [20, 22], [10, 23], [3, 21]], ERA1.titleBlue, K);
      g.poly([[9, 15], [17, 14], [14, 20], [8, 19]], ERA1.navy, K);
      g.poly([[28, 10.5], [31.5, 12], [27, 14]], ERA1.warn, K);
      g.set(25, 11, K);
      g.rect(19, 13, 4, 1, ERA1.white);
      g.checker(11, 19, 10, 3, ERA1.navy, 0, ERA1.titleBlue);
      break;
    }
    case 'heart': {
      const pts: Pt[] = [[16, 28.5], [2.5, 15], [2.5, 9], [6, 4.5], [11, 4.5], [16, 9.5], [21, 4.5], [26, 4.5], [29.5, 9], [29.5, 15]];
      g.poly(pts, ERA1.warn, K);
      g.checker(17, 15, 12, 9, ERA1.warnDark, 0, ERA1.warn);
      g.rect(7, 8, 3, 2, ERA1.white);
      g.rect(6, 10, 2, 2, ERA1.white);
      break;
    }
    case 'moon': {
      g.disc(16, 16, 14, K);
      g.disc(16, 16, 13, ERA1.navy);
      g.disc(15, 16, 9, ERA1.tooltip);           // the moon, full…
      g.disc(19, 13, 8, ERA1.navy);              // …and the night taking its right side: a crescent
      g.checker(7, 17, 6, 6, ERA1.olive, 0, ERA1.tooltip);
      for (const [x, y] of [[24, 22], [25, 9], [21, 25], [10, 7]] as [number, number][]) g.set(x, y, ERA1.white);
      g.set(24, 21, ERA1.silver); g.set(24, 23, ERA1.silver); g.set(23, 22, ERA1.silver); g.set(25, 22, ERA1.silver);
      break;
    }
    default:
      g.rect(4, 4, 24, 24, K);
      g.rect(5, 5, 22, 22, ERA1.silver);
  }
  return g;
}

/** one profile picture, 32 × 32 logical px, its top-left at (x, y) */
export function drawProfilePicture(ctx: CanvasRenderingContext2D, x: number, y: number, id: string): void {
  let cv = cache.get(id);
  if (!cv) { cv = paint(id).toCanvas(); cache.set(id, cv); }
  blitGrid(ctx, cv, x, y);
}
