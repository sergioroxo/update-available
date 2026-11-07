/**
 * ⚑ S321 — THE GOAL PICTURE: "You, restored · 2027" (DESIGN_2026_V3_PRESSURE_2026-11-07.md, beats 2 and 10).
 *
 * NOT a composite of her (v2's outline is retired). It is THE GOAL she is pushed toward: a drawn stock young man,
 * smiling, in a shirt and tie, haloed and sparkling like an advert — over the top on purpose (his: "be over the top,
 * not clinical — clinical makes the piece as cold as SOGICE"). It circles back to the 1997 opening video's promise,
 * the Restoration Path and Restorify. Satire in the system's self-presentation only, and it collapses at "Use
 * original", where the verifier cannot match it to anybody.
 *
 * ONE SHARED PAINTER, so every surface shows the same picture: the browser (the new-tab wallpaper, the defaults
 * sheet, the bot's "where you're heading", Photos), the messenger's chat wallpaper, and — for the room builder — the
 * desk photo frame, the framed "You, restored" on the wall and the headset mirror. Pixel style: a 24-cell figure on
 * integer cells, colours from `theme/era4.ts`'s GOAL block, no anti-aliased edges. A drawn stock face, no real
 * person's likeness, no photograph. The caption's words live in `data/dialog/s4_v3.json` (`goal.caption`).
 *
 * Signature (stable — the room imports it):
 *     drawGoalPicture(ctx, x, y, w, h, { caption?: string | false, t?: number, alpha?: number })
 * `t` twinkles the sparkles (pass a clock in seconds; quantised to 0.5 s steps so a caller that redraws on change
 * uploads at most twice a second); `caption: false` draws no band; `alpha` fades the whole picture (a wallpaper).
 */
import V3 from '../../../data/dialog/s4_v3.json';
import { GOAL } from '../theme/era4';
import { px } from '../theme/chrome';
import { fontFor } from '../theme/fonts';

export interface GoalOpts { caption?: string | false; t?: number; alpha?: number }

/** the figure, on a 24 × 24 grid: [row, colFrom, colTo, colour key] (inclusive), drawn in order */
type Run = [number, number, number, keyof typeof GOAL];
const FIGURE: Run[] = [
  // hair: a side-parted quiff, short at the sides
  [2, 10, 15, 'hair'], [3, 8, 16, 'hair'], [4, 7, 16, 'hair'], [5, 7, 8, 'hair'], [5, 15, 16, 'hair'],
  // the face: a square jaw, clean shaven
  [5, 9, 14, 'skin'], [6, 8, 15, 'skin'], [7, 8, 15, 'skin'], [8, 8, 15, 'skin'], [9, 8, 15, 'skin'],
  [10, 8, 15, 'skin'], [11, 8, 15, 'skin'], [12, 9, 14, 'skin'], [13, 10, 13, 'skin'],
  // ears
  [8, 7, 7, 'skinLo'], [9, 7, 7, 'skinLo'], [8, 16, 16, 'skinLo'], [9, 16, 16, 'skinLo'],
  // brows, eyes
  [6, 9, 10, 'hair'], [6, 13, 14, 'hair'], [8, 10, 10, 'ink'], [8, 13, 13, 'ink'],
  // the grin: corners up, teeth, a lower line
  [10, 9, 9, 'ink'], [10, 14, 14, 'ink'], [11, 10, 13, 'teeth'], [11, 9, 9, 'ink'], [11, 14, 14, 'ink'], [12, 10, 13, 'ink'],
  // neck
  [14, 10, 13, 'skinLo'], [15, 10, 13, 'skinLo'],
  // the shirt, shoulders squared
  [16, 6, 17, 'shirt'], [17, 4, 19, 'shirt'], [18, 3, 20, 'shirt'], [19, 2, 21, 'shirt'], [20, 2, 21, 'shirt'],
  [21, 2, 21, 'shirt'], [22, 2, 21, 'shirt'], [23, 2, 21, 'shirt'],
  // the collar and the tie
  [16, 9, 10, 'collar'], [16, 13, 14, 'collar'], [17, 10, 10, 'collar'], [17, 13, 13, 'collar'],
  [16, 11, 12, 'tie'], [17, 11, 12, 'tie'], [18, 11, 12, 'tie'], [19, 11, 12, 'tie'], [20, 11, 12, 'tie'],
  [21, 11, 12, 'tie'], [22, 11, 12, 'tie']
];
/** the halo behind the head, as rows of a disc on the same grid */
const HALO: [number, number, number][] = [
  [0, 8, 15], [1, 6, 17], [2, 5, 18], [3, 4, 19], [4, 4, 19], [5, 3, 20], [6, 3, 20], [7, 3, 20], [8, 3, 20],
  [9, 3, 20], [10, 3, 20], [11, 4, 19], [12, 4, 19], [13, 5, 18], [14, 6, 17], [15, 8, 15]
];
/** sparkles: [col, row] centres on the grid (plus-shapes), and which half-second they light on */
const SPARKLES: [number, number, number][] = [[2, 3, 0], [21, 2, 1], [1, 12, 1], [22, 10, 0], [19, 14, 1]];

export function drawGoalPicture(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, opts: GoalOpts = {}): void {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  if (w <= 0 || h <= 0) return;
  const was = ctx.globalAlpha;
  if (opts.alpha !== undefined) ctx.globalAlpha = was * opts.alpha;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const caption = opts.caption === false ? '' : (opts.caption ?? V3.goal.caption);
  const bandH = caption && h >= 40 ? Math.max(12, Math.round(h * 0.13)) : 0;
  const figH = h - bandH;
  // the sky: two bands, the advert's own gradient done in steps
  px(ctx, x, y, w, figH, GOAL.sky);
  px(ctx, x, y, w, Math.round(figH * 0.35), GOAL.skyLo);
  const side = Math.min(w, figH);
  if (side < 20) {
    // ⚑ a glyph-sized version (the profile circle, a tab): head, hair, shoulders — the same picture, fewer cells
    const u = Math.max(1, Math.floor(side / 8));
    const cx = x + Math.floor((w - 8 * u) / 2), cy = y + figH - 8 * u;
    px(ctx, cx + 2 * u, cy, 4 * u, u, GOAL.hair);
    px(ctx, cx + 2 * u, cy + u, 4 * u, 3 * u, GOAL.skin);
    px(ctx, cx + 3 * u, cy + 3 * u, 2 * u, u, GOAL.ink);
    px(ctx, cx, cy + 5 * u, 8 * u, 3 * u, GOAL.shirt);
    px(ctx, cx + 3 * u, cy + 5 * u, 2 * u, 3 * u, GOAL.tie);
  } else {
    const cell = Math.max(1, Math.floor(side / 24));
    const ox = x + Math.floor((w - 24 * cell) / 2);
    const oy = y + figH - 24 * cell;
    for (const [r, a, b] of HALO) px(ctx, ox + a * cell, oy + r * cell, (b - a + 1) * cell, cell, GOAL.halo);
    // the sparkles: an advert's twinkle, two phases on a half-second clock
    const phase = Math.floor((opts.t ?? 0) * 2) % 2;
    for (const [c, r, on] of SPARKLES) {
      const k = on === phase ? GOAL.sparkleHi : GOAL.sparkle;
      const sx = ox + c * cell, sy = oy + r * cell;
      px(ctx, sx - cell, sy, cell * 3, cell, k);
      px(ctx, sx, sy - cell, cell, cell * 3, k);
    }
    for (const [r, a, b, k] of FIGURE) px(ctx, ox + a * cell, oy + r * cell, (b - a + 1) * cell, cell, GOAL[k]);
  }
  if (bandH) {
    px(ctx, x, y + figH, w, bandH, GOAL.band);
    let size = Math.max(7, Math.min(16, Math.round(bandH * 0.62)));
    ctx.textBaseline = 'top';
    ctx.font = fontFor(size, 'e4');
    while (size > 7 && ctx.measureText(caption).width > w - 8) { size--; ctx.font = fontFor(size, 'e4'); }
    ctx.fillStyle = GOAL.bandInk;
    const tw = Math.ceil(ctx.measureText(caption).width);
    ctx.fillText(caption, x + Math.max(4, Math.round((w - tw) / 2)), y + figH + Math.round((bandH - size) / 2));
  }
  ctx.restore();
  ctx.globalAlpha = was;
}

/** ⚑ S321 — the goal's figure by region, colours resolved, for the mirror ("try it on", mirror.ts), which rewrites her
 *  reflection into exactly this figure a region at a time: [row, colFrom, colTo, colour] on the same 24-cell grid. */
type Resolved = [number, number, number, string];
const pick = (f: (r: Run) => boolean): Resolved[] => FIGURE.filter(f).map(([r, a, b, key]) => [r, a, b, GOAL[key]] as Resolved);
export const GOAL_REGIONS = {
  hair: pick(([r, , , key]) => key === 'hair' && r <= 5),
  features: pick(([r, , , key]) => (key === 'hair' && r === 6) || (key === 'ink' && r === 8)),
  mouth: pick(([r, , , key]) => r >= 10 && r <= 12 && (key === 'ink' || key === 'teeth')),
  face: pick(([, , , key]) => key === 'skin' || key === 'skinLo'),
  body: pick(([, , , key]) => key === 'shirt' || key === 'collar' || key === 'tie')
};
