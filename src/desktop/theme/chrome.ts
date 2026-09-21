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

type Rect = { x: number; y: number; w: number; h: number };
export interface ContentRect { x: number; y: number; w: number; h: number; closeBox: Rect; minBox?: Rect }

/**
 * ⚑ S165 / W-E2 (a) — THE FRAMES DRAWN THIS FRAME, in paint order. Sérgio
 * (2026-09-20): "ALL 1997/2003 windows get a taskbar button and a minimise
 * box, period-true." A window that passes `minKey` gets the `_` box beside
 * its close box and is listed here with its key; every frame is listed (keyed
 * or not) so a press can find the TOPMOST frame under it and a covered
 * window's box is never pressed through the one on top. os.ts resets this at
 * the top of each desktop draw and reads it in `handleClick`.
 */
export interface FrameRec { key?: string; x: number; y: number; w: number; h: number; minBox?: Rect }
let framesDrawn: FrameRec[] = [];
export function resetFrames(): void { framesDrawn = []; }
/** the keyed frames whose minimise box is not under a later frame — the aimable ones */
export function minBoxesVisible(): { key: string; x: number; y: number; w: number; h: number }[] {
  const out: { key: string; x: number; y: number; w: number; h: number }[] = [];
  framesDrawn.forEach((f, i) => {
    if (!f.key || !f.minBox) return;
    const cx = f.minBox.x + f.minBox.w / 2, cy = f.minBox.y + f.minBox.h / 2;
    for (let j = i + 1; j < framesDrawn.length; j++) {
      const g = framesDrawn[j];
      if (cx >= g.x && cx <= g.x + g.w && cy >= g.y && cy <= g.y + g.h) return;
    }
    out.push({ key: f.key, ...f.minBox });
  });
  return out;
}
/** the topmost frame under a point, or null */
export function topFrameAt(x: number, y: number): FrameRec | null {
  for (let i = framesDrawn.length - 1; i >= 0; i--) {
    const f = framesDrawn[i];
    if (x >= f.x && x <= f.x + f.w && y >= f.y && y <= f.y + f.h) return f;
  }
  return null;
}

/** Window frame with two-tone title bar + close box. Returns content rect.
 *  `minKey` (S165): the window minimises — a `_` box beside the close box, and
 *  a taskbar button under that key (os.ts). */
export function windowFrame(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, title: string, active = true, minKey?: string
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
  // minimise box, period-true: beside the close box, a bar at the foot
  let mb: Rect | undefined;
  if (minKey) {
    mb = { x: cb.x - 14, y: cb.y, w: 12, h: 12 };
    bevel(ctx, mb.x, mb.y, mb.w, mb.h, true);
    px(ctx, mb.x + 3, mb.y + 8, 6, 2, ERA1.black);
  }
  framesDrawn.push({ key: minKey, x, y, w, h, minBox: mb });
  return { x: x + 4, y: y + 3 + barH + 2, w: w - 8, h: h - barH - 9, closeBox: cb, minBox: mb };
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
/**
 * ⚑ S162 / R3-01 + R3-31 — THE FRAME'S DIALOG CHROME, in DOM: the 1997 machine's
 * own look for the front door and the game menu (Sérgio: "computer thematics").
 * ERA1 tokens only, named for how a dialog uses them. The frame still never
 * plays: the chrome is the machine's, the words stay functional. The dark glass
 * below (`FRAME`) stays for what sits OVER the room — the helper strip, the
 * captions, the XR planes — where readability over a 3D scene wins.
 */
export const DIALOG = {
  panel: ERA1.beige,
  light: ERA1.white,
  dark: ERA1.grey,
  darker: ERA1.greyDark,
  titleBar: ERA1.navy,
  titleInk: ERA1.white,
  ink: ERA1.black,
  dim: ERA1.greyDark,
  faint: ERA1.grey,
  screen: ERA1.teal,
  screenDark: ERA1.tealDark,
  paper: ERA1.paper,
  /** the veil behind a dialog: the frame's own dark, an rgb string, never a fiction colour */
  veilRGB: '8, 8, 10',
  font: '13px Tahoma, Verdana, "MS Sans Serif", Arial, sans-serif'
} as const;

/** the 1997 bevel on a DOM element: light top-left, dark bottom-right (sunk: the reverse) */
export function domBevel(el: HTMLElement, sunk = false, width = 2): void {
  const a = sunk ? DIALOG.dark : DIALOG.light;
  const b = sunk ? DIALOG.light : DIALOG.darker;
  el.style.borderStyle = 'solid';
  el.style.borderWidth = `${width}px`;
  el.style.borderColor = `${a} ${b} ${b} ${a}`;
}

/** ⚑ S168 — THE LEAVE PAGE's greys (src/frame/leavePage.ts): a reference site's own
 *  palette, deliberately not the fiction's — the page must look like any page. */
export const REFERENCE = {
  paper: '#ffffff',
  ink: '#202122',
  link: '#3366cc',
  rule: '#a2a9b1',
  panel: '#f8f9fa',
  panelHead: '#eaecf0',
  muted: '#54595d',
  placeholder: '#72777d'
} as const;

export const FRAME = {
  glass: 'rgba(10,10,14,0.78)',
  ink: '#cdd3df',
  // the game menu's own greys (S146: the map's columns import them instead of repeating them)
  bright: '#f2f4f8',
  text: '#dfe3ea',
  dim: '#b7bcc6',
  faint: '#8a8f9a',
  rule: '#383840',
  edge: '#303038'
} as const;
