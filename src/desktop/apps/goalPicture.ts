/**
 * ⚑ S321 — THE GOAL PICTURE: "You, restored · 2027" (DESIGN_2026_V3_PRESSURE_2026-11-07.md, beats 2 and 10).
 * ⚑ S364 (UiB job 14 Part B, N9) — it became her own photograph run through the system's swap filter into a suited man.
 *
 * ⚑ S420 (UiB job 34; his 22 Nov: "it keeps on using that image of male 'maya' that I've asked to be replaced"; 21 Nov: "I
 * don't like the 'you, restored . 2027'. Let's remove that and rethink the picture interaction") — THE GOAL IS THE SYSTEM'S
 * DEFAULT AVATAR, `default.png` (theme/era4.ts `paintDefaultAvatar`): the grey head and shoulders an app shows when there is
 * no photo — no face, no hair, no clothes. The system wants her to be its default; it never draws who she "should" be. Its
 * caption is its file name (`data/dialog/s4_v3.json` `goal.caption`, "default.png"; the old caption is in that row's
 * `_docS420`). The suited figure, its gloss (halo, rays, sparkles, the "verified" tick) and its glyph are retired: in git at
 * bd3b0203. What the filter does to her own photo on the way there is `paintPortrait` (removal, never another person).
 *
 * ONE SHARED PAINTER, so every surface shows the same picture: the browser (the profile chip, the defaults sheet, the
 * bot's card, Photos), the messenger's chat wallpaper, the room's framed picture (never shown: e4Room.ts) and the old
 * try-on's split (swapFilter.ts `drawSwapFilter`). A filter that "restores" a person is the piece's invention, and the Close
 * says so (data/provotypes/e4_offers.json, "The filter", speculative).
 *
 * Signature (stable — the room imports it):
 *     drawGoalPicture(ctx, x, y, w, h, { caption?: string | false, t?: number, alpha?: number, broken?: number })
 * `caption: false` draws no band; `alpha` fades the whole picture (a wallpaper); `broken` (0..1) cracks it — the raid's
 * intervention; `t` is kept for the callers and unused since S420 (default.png does not twinkle).
 */
import V3 from '../../../data/dialog/s4_v3.json';
import { GOAL, PORTRAIT, portraitLayout, paintDefaultAvatar } from '../theme/era4';
import { px } from '../theme/chrome';
import { fontFor } from '../theme/fonts';

export interface GoalOpts { caption?: string | false; t?: number; alpha?: number; broken?: number }

/** the caption band's height for a frame of height `h` (0 when the frame is too small to carry one) */
export function goalBandH(h: number): number {
  return h >= 40 ? Math.max(12, Math.round(h * 0.13)) : 0;
}

/**
 * the caption band across the foot of the picture: the system's label for her, in its own ink. `broken` ≥ 0.75 strikes
 * it through and knocks it a cell out of true — the label failing with the gloss.
 */
export function goalBand(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, caption: string, broken = 0): void {
  const bandH = goalBandH(h);
  if (!bandH || !caption) return;
  const by = y + h - bandH;
  const slip = broken >= 0.75 ? Math.max(1, Math.round(bandH / 6)) : 0;
  px(ctx, x, by, w, bandH, GOAL.band);
  let size = Math.max(7, Math.min(16, Math.round(bandH * 0.62)));
  ctx.textBaseline = 'top';
  ctx.font = fontFor(size, 'e4');
  while (size > 7 && ctx.measureText(caption).width > w - 8) { size--; ctx.font = fontFor(size, 'e4'); }
  ctx.fillStyle = GOAL.bandInk;
  const tw = Math.ceil(ctx.measureText(caption).width);
  const tx = x + Math.max(4, Math.round((w - tw) / 2)) + slip, ty = by + Math.round((bandH - size) / 2);
  ctx.fillText(caption, tx, ty);
  if (slip) px(ctx, tx - 2, ty + Math.round(size / 2), tw + 4, Math.max(1, Math.round(size / 8)), GOAL.bandInk);
}

/**
 * the system's picture cracking: fractures that start at the frame's corners and edges, and stop short of the face (cols
 * 7–16, rows 4–16 stay clear: what breaks is the system's surface, never her). Drawn in the sheen's white
 * with a dark offset, a cell's quarter thick. `broken` 0..1 draws that share of the paths, each one growing in.
 */
const CRACKS: [number, number][][] = [
  [[0, 0], [2, 2], [3, 1], [5, 4], [6, 3]],
  [[24, 1], [22, 3], [23, 5], [20, 6], [19, 9]],
  [[0, 30], [2, 27], [1, 25], [4, 23], [3, 20]],
  [[18, 3], [20, 5], [22, 4], [24, 7]],
  [[24, 16], [21, 17], [22, 19], [19, 21], [20, 24]],
  [[0, 12], [2, 13], [1, 16], [4, 18]],
  [[12, 30], [11, 28], [13, 27], [12, 24], [14, 22]],
  [[24, 28], [21, 26], [22, 23]]
];
export function goalCracks(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, broken: number): void {
  if (broken <= 0) return;
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const L = portraitLayout(x, y, w, h);
  const th = Math.max(1, Math.round(L.c / 4));
  const step = th;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const share = Math.min(1, broken) * CRACKS.length;
  CRACKS.forEach((path, i) => {
    const grow = Math.max(0, Math.min(1, share - i));
    if (grow <= 0) return;
    const segs = path.length - 1;
    const upTo = grow * segs;
    for (let s = 0; s < segs; s++) {
      const part = Math.max(0, Math.min(1, upTo - s));
      if (part <= 0) break;
      const [ax, ay] = path[s], [bx, by] = path[s + 1];
      const x0 = L.ox + ax * L.c, y0 = L.oy + ay * L.c;
      const x1 = L.ox + (ax + (bx - ax) * part) * L.c, y1 = L.oy + (ay + (by - ay) * part) * L.c;
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / step));
      for (let k = 0; k <= n; k++) {
        const qx = Math.round(x0 + ((x1 - x0) * k) / n), qy = Math.round(y0 + ((y1 - y0) * k) / n);
        px(ctx, qx + th, qy + th, th, th, PORTRAIT.edge);
        px(ctx, qx, qy, th, th, PORTRAIT.crack);
      }
    }
  });
  ctx.restore();
}

export function drawGoalPicture(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, opts: GoalOpts = {}): void {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  if (w <= 0 || h <= 0) return;
  const was = ctx.globalAlpha;
  if (opts.alpha !== undefined) ctx.globalAlpha = was * opts.alpha;
  const broken = opts.broken ?? 0;
  // ⚑ S420 — default.png (a glyph-sized one below 20 px: the profile circle, a tab)
  paintDefaultAvatar(ctx, x, y, w, h);
  if (Math.min(w, h) >= 20) {
    goalCracks(ctx, x, y, w, h, broken);
    const caption = opts.caption === false ? '' : (opts.caption ?? V3.goal.caption);
    if (caption) {
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      goalBand(ctx, x, y, w, h, caption, broken);
      ctx.restore();
    }
  }
  ctx.globalAlpha = was;
}
