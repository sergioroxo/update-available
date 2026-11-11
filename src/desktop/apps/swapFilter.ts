/**
 * ⚑ S364 — THE SWAP FILTER (UiB job 14 Part B, N9 / N12). His: "integrate the gender-swap filter narrative"; "in the
 * try-on, her photo morphs back into 'what she should be'"; "the raid is the community intervening in that morph".
 *
 * Two painters over ONE photograph — hers (`mayaPhoto`, theme/era4.ts) and what the system's filter makes of it (the
 * goal picture, `goalPicture.ts`), which share a pose, a framing and a cell grid, so the two halves line up:
 *
 *     drawSwapFilter(ctx, x, y, w, h, k, t, opts?: { chrome?: boolean })
 *         the filter-app idiom: her photo and the goal split by a vertical slider at `k` (0 = all hers, 1 = all the
 *         goal), a handle on the divider, "Before | After" tags; with `chrome`, the filter's name and intensity
 *         ("✦ Restore") and a "Made with AI" stamp.
 *
 *     drawSwapMorph(ctx, x, y, w, h, amount, t, opts?: { chrome?, broken?, by?, byInk?, band? })
 *         a MORPH, not a split: the same photo at `amount` (0 hers … 1 the goal), the filter working in its own order —
 *         her hair cut from the ends upward, the jaw, the jacket wiping down over her top, the grin; the room draining
 *         under all of it; the gloss landing last. The headset's try-on (`mirror.ts`) and the raid (`ball.ts`) use it:
 *         `broken` cracks the gloss, `by` puts a name on the intensity handle while someone drags it back.
 *
 * Both read from 100 × 130 to 300 × 400 px (the type scales with the frame; the intensity bar drops below 110 px wide).
 * A filter that "restores" a person is the piece's invention (speculative at the Close, "The filter"); the documented
 * context is only the 2019 gender-swap lenses, used by some to mock trans people (RESEARCH_ROGD_AND_FILTERS §C). The
 * satire is the system's self-presentation — its name for the filter, its gloss, its badge — and it collapses: the
 * raid cracks it and drags it back to her. Words: `data/dialog/s4_v3.json` `goal.filter`.
 */
import V3 from '../../../data/dialog/s4_v3.json';
import { ERA4, WEB, CLIP, PORTRAIT, portraitAt, paintPortrait, mayaPhoto, roundRect, pill } from '../theme/era4';
import { px } from '../theme/chrome';
import { fontFor } from '../theme/fonts';
import { drawGoalPicture, goalBand, goalBandH, goalCracks } from './goalPicture';

const F = V3.goal.filter;
/** the filter's own name, with the period's assistant sparkle in front of it (as the browser's ✦ buttons carry it) */
const FILTER_NAME = '✦ ' + F.name;

export interface SwapFilterOpts { chrome?: boolean }
export interface SwapMorphOpts {
  /** the filter's name, its intensity bar (at `amount`) and the "Made with AI" stamp */
  chrome?: boolean;
  /** 0..1 — the gloss cracking (the raid) */
  broken?: number;
  /** a name on the intensity handle: who is dragging it (the raid) */
  by?: string;
  byInk?: string;
  /** the caption band, once the gloss has landed (default on) */
  band?: boolean;
}

/** the labels' type size for a frame `w` wide */
const labelSize = (w: number): number => Math.max(7, Math.min(11, Math.round(w / 24)));

/** a dark, see-through pill with a light label — the filter app's own tags */
function darkTag(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, size: number, alignRight = false): number {
  ctx.font = fontFor(size, 'e4');
  ctx.textBaseline = 'top';
  const tw = Math.ceil(ctx.measureText(label).width), h = size + 6, w = tw + 12;
  const lx = alignRight ? x - w : x;
  const was = ctx.globalAlpha;
  ctx.globalAlpha = was * 0.78;
  pill(ctx, lx, y, w, h, ERA4.field);
  ctx.globalAlpha = was;
  ctx.fillStyle = ERA4.textHi;
  ctx.fillText(label, lx + 6, y + 3);
  return w;
}

/** "Made with AI": the clip's stamp idiom (warning yellow, dark ink, square) */
function aiStamp(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, align: 'left' | 'right' | 'center' = 'left'): void {
  ctx.font = fontFor(size, 'e4');
  ctx.textBaseline = 'top';
  const w = Math.ceil(ctx.measureText(F.made).width) + 8;
  const sx = align === 'right' ? x - w : align === 'center' ? Math.round(x - w / 2) : x;
  px(ctx, sx, y, w, size + 5, CLIP.stamp);
  ctx.fillStyle = CLIP.stampInk;
  ctx.fillText(F.made, sx + 4, y + 2);
}

/**
 * the filter's pill: "✦ Restore", and its intensity — a track in the system's mint, filled to `k`, with a white handle
 * at `k`. `by` names whoever is dragging the handle, just above it, in their own colour. Centred on `cx`, its foot at
 * `bottom`. Returns its height.
 */
function filterPill(ctx: CanvasRenderingContext2D, cx: number, bottom: number, frameW: number, k: number, size: number, by = '', byInk: string = ERA4.textHi): number {
  ctx.font = fontFor(size, 'e4');
  ctx.textBaseline = 'top';
  const tw = Math.ceil(ctx.measureText(FILTER_NAME).width);
  const showBar = frameW >= 110;
  const barW = showBar ? Math.max(28, Math.min(80, Math.round(frameW * 0.26))) : 0;
  const h = size + 8, w = tw + 14 + (showBar ? barW + 10 : 0);
  const x = Math.round(cx - w / 2), y = bottom - h;
  const was = ctx.globalAlpha;
  ctx.globalAlpha = was * 0.82;
  pill(ctx, x, y, w, h, ERA4.field);
  ctx.globalAlpha = was;
  ctx.fillStyle = WEB.accent;
  ctx.fillText(FILTER_NAME, x + 7, y + 4);
  if (showBar) {
    const bx = x + tw + 16, by0 = y + Math.round(h / 2) - 2;
    pill(ctx, bx, by0, barW, 4, ERA4.ruleHi);
    const fw = Math.round(barW * Math.max(0, Math.min(1, k)));
    if (fw >= 2) pill(ctx, bx, by0, fw, 4, WEB.accent);
    const hd = Math.max(8, size);
    const hx = bx + fw - Math.round(hd / 2), hy = by0 + 2 - Math.round(hd / 2);
    roundRect(ctx, hx - 1, hy - 1, hd + 2, hd + 2, Math.floor(hd / 2) + 1, PORTRAIT.edge);
    roundRect(ctx, hx, hy, hd, hd, Math.floor(hd / 2), WEB.shimmer);
    if (by) {
      ctx.font = fontFor(size, 'e4');
      const bw = Math.ceil(ctx.measureText(by).width) + 10;
      const lx = Math.round(hx + hd / 2 - bw / 2), ly = hy - size - 9;
      const was2 = ctx.globalAlpha;
      ctx.globalAlpha = was2 * 0.86;
      pill(ctx, lx, ly, bw, size + 6, ERA4.field);
      ctx.globalAlpha = was2;
      ctx.fillStyle = byInk; ctx.fillText(by, lx + 5, ly + 3);
    }
  }
  return h;
}

/** the slider's handle: a white disc on the divider with a dark ring and two arrows */
function handle(ctx: CanvasRenderingContext2D, cx: number, cy: number, d: number): void {
  const x = Math.round(cx - d / 2), y = Math.round(cy - d / 2);
  roundRect(ctx, x - 1, y - 1, d + 2, d + 2, Math.floor(d / 2) + 1, PORTRAIT.edge);
  roundRect(ctx, x, y, d, d, Math.floor(d / 2), WEB.shimmer);
  const a = Math.max(2, Math.round(d / 6));
  const gap = Math.max(1, Math.round(d / 12));
  const mid = Math.round(cy);
  for (let j = -a; j <= a; j++) {
    const span = a - Math.abs(j);
    // ◂ on the left, ▸ on the right, in stepped rows
    px(ctx, Math.round(cx) - gap - a + Math.abs(j), mid + j, span + 1, 1, ERA4.field);
    px(ctx, Math.round(cx) + gap, mid + j, span + 1, 1, ERA4.field);
  }
}

/**
 * ⚑ the split: her photo on the left of the divider, the filter's on the right. `k` = how much of the frame the filter
 * has taken (0 all hers, 1 all the goal).
 */
export function drawSwapFilter(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, k: number, t: number, opts: SwapFilterOpts = {}): void {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  if (w <= 0 || h <= 0) return;
  k = Math.max(0, Math.min(1, k));
  const dx = x + Math.round((1 - k) * w);
  const size = labelSize(w);
  // the after: the goal picture, everything right of the divider
  if (dx < x + w) {
    ctx.save(); ctx.beginPath(); ctx.rect(dx, y, x + w - dx, h); ctx.clip();
    drawGoalPicture(ctx, x, y, w, h, { t });
    darkTag(ctx, x + w - 5, y + 5, F.after, size, true);
    ctx.restore();
  }
  // the before: hers, everything left of it
  if (dx > x) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, dx - x, h); ctx.clip();
    mayaPhoto(ctx, x, y, w, h);
    darkTag(ctx, x + 5, y + 5, F.before, size);
    ctx.restore();
  }
  // the divider and its handle
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const lw = Math.max(2, Math.round(w / 110));
  px(ctx, dx - Math.floor(lw / 2) - 1, y, lw + 2, h, PORTRAIT.edge);
  px(ctx, dx - Math.floor(lw / 2), y, lw, h, WEB.shimmer);
  const hd = Math.max(14, Math.min(30, Math.round(w * 0.11)));
  // the handle stays whole inside the frame, even with the slider at either end
  handle(ctx, Math.max(x + Math.ceil(hd / 2) + 1, Math.min(x + w - Math.ceil(hd / 2) - 1, dx)), y + Math.round(h * 0.46), hd);
  if (opts.chrome) {
    const bandH = goalBandH(h);
    filterPill(ctx, x + Math.round(w / 2), y + h - bandH - 5, w, k, size);
    if (w >= 200) aiStamp(ctx, x + Math.round(w / 2), y + 6, Math.max(7, size - 1), 'center');
    else aiStamp(ctx, x + w - 5, y + size + 16, Math.max(7, size - 1), 'right');
  }
  ctx.restore();
}

/**
 * ⚑ the morph: the same photo at `amount` (0 hers … 1 the goal), in the filter's order. `t` twinkles the sparkles.
 */
export function drawSwapMorph(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, amount: number, t: number, opts: SwapMorphOpts = {}): void {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  if (w <= 0 || h <= 0) return;
  amount = Math.max(0, Math.min(1, amount));
  const broken = Math.max(0, Math.min(1, opts.broken ?? 0));
  const s = { ...portraitAt(amount), broken };
  paintPortrait(ctx, x, y, w, h, s, t);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  // the cracks are the gloss's, and they go with it
  if (s.gloss > 0) goalCracks(ctx, x, y, w, h, broken * Math.min(1, s.gloss * 1.5));
  const banded = opts.band !== false && s.gloss >= 0.85;
  if (banded) goalBand(ctx, x, y, w, h, V3.goal.caption, broken);
  if (opts.chrome) {
    const size = labelSize(w);
    const bandH = banded ? goalBandH(h) : 0;
    filterPill(ctx, x + Math.round(w / 2), y + h - bandH - 5, w, amount, size, opts.by ?? '', opts.byInk ?? ERA4.textHi);
    aiStamp(ctx, x + w - 5, y + 5, Math.max(7, size - 1), 'right');
  }
  ctx.restore();
}
