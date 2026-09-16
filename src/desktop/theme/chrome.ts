/**
 * Era-1 window chrome — Win95-style bevels, title bars, buttons, drawn in
 * pixel-integer rects from the ERA1 palette only.
 */
import { ERA1 } from './era1';
import { fontFor } from './fonts';

export function px(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, color: string
): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** ⚑ 2026-09-13: the face is the ERA's (theme/fonts.ts) — bold under 13 px in
 *  1997/2003, the way a bitmap UI had no thin strokes; `os.setDesktopEra`
 *  sets which era is drawing. Every text site in the piece goes through here. */
export function setFont(ctx: CanvasRenderingContext2D, size = 12): void {
  ctx.font = fontFor(size);
  ctx.textBaseline = 'top';
}

/** Word-wrap to a max pixel width using the ctx's CURRENT font — era-agnostic,
 *  ported verbatim from the shipped (non-reinterp) build's identical helper so
 *  Era-3+ modules (which draw longer testimony/system text than Era 1's short
 *  labels) don't reinvent it. Pure function, no color/theme dependency. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (cur && ctx.measureText(test).width > maxWidth) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Raised (or sunken) 3D bevel on a silver body. */
export function bevel(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, raised = true
): void {
  px(ctx, x, y, w, h, ERA1.beige);
  const lite = raised ? ERA1.white : ERA1.greyDark;
  const dark = raised ? ERA1.greyDark : ERA1.white;
  px(ctx, x, y, w, 1, lite);
  px(ctx, x, y, 1, h, lite);
  px(ctx, x, y + h - 1, w, 1, dark);
  px(ctx, x + w - 1, y, 1, h, dark);
}

export interface ContentRect { x: number; y: number; w: number; h: number; closeBox: { x: number; y: number; w: number; h: number } }

/** Window frame with two-tone title bar + close box. Returns content rect. */
export function windowFrame(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, title: string, active = true
): ContentRect {
  bevel(ctx, x, y, w, h, true);
  const barH = 16;
  // banded "gradient" (period-true: hard bands, no smooth ramps)
  const half = Math.floor((w - 6) / 2);
  px(ctx, x + 3, y + 3, half, barH, active ? ERA1.navy : ERA1.grey);
  px(ctx, x + 3 + half, y + 3, w - 6 - half, barH, active ? ERA1.titleBlue : ERA1.grey);
  setFont(ctx, 10);
  ctx.fillStyle = ERA1.white;
  ctx.fillText(title, x + 8, y + 6);
  // close box
  const cb = { x: x + w - 17, y: y + 5, w: 12, h: 12 };
  bevel(ctx, cb.x, cb.y, cb.w, cb.h, true);
  ctx.fillStyle = ERA1.black;
  ctx.fillText('x', cb.x + 3, cb.y + 1);
  return { x: x + 4, y: y + 3 + barH + 2, w: w - 8, h: h - barH - 9, closeBox: cb };
}

export function button(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, label: string,
  opts: { disabled?: boolean; hover?: boolean } = {}
): void {
  bevel(ctx, x, y, w, h, true);
  setFont(ctx, 10);
  ctx.fillStyle = opts.disabled ? ERA1.grey : opts.hover ? ERA1.navy : ERA1.black;
  const tw = ctx.measureText(label).width;
  ctx.fillText(label, Math.round(x + (w - tw) / 2), Math.round(y + (h - 10) / 2));
}

/** Sunken white input field with optional caret. */
export function inputField(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, value: string,
  caretOn: boolean
): void {
  px(ctx, x, y, w, h, ERA1.white);
  px(ctx, x, y, w, 1, ERA1.grey);
  px(ctx, x, y, 1, h, ERA1.grey);
  px(ctx, x, y + h - 1, w, 1, ERA1.white);
  px(ctx, x + w - 1, y, 1, h, ERA1.white);
  setFont(ctx, 11);
  ctx.fillStyle = ERA1.black;
  const shown = value.length > 38 ? value.slice(-38) : value;
  ctx.fillText(shown, x + 4, y + Math.round((h - 11) / 2));
  if (caretOn) {
    const cw = ctx.measureText(shown).width;
    px(ctx, x + 5 + cw, y + 3, 2, h - 6, ERA1.black);
  }
}

/**
 * ⚑ S145 — THE FRAME'S OWN INK. The non-diegetic chrome (moveHint, the tape
 * caption, the game menu, the helper) has used the same two values by hand
 * since R28 — a near-black glass and a cool grey ink — and the palette ratchet
 * counts every copy. Named once here so a new piece of frame chrome imports
 * them rather than inventing a shade. Frame voice: functional, undecorated.
 */
export const FRAME = {
  glass: 'rgba(10,10,14,0.78)',
  ink: '#cdd3df'
} as const;
