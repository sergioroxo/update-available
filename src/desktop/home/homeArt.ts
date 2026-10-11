/**
 * ⚑ S231 — LAMBYOS HOME'S ART: GPT's round-4 layers (OpenAI image generation, at the project's direction, 2026),
 * replacing the room that used to be drawn in code here (S227–S230's pixel-art canvas, 619 lines, now gone).
 *
 * WHAT THIS FILE IS. Pure data and arithmetic, no drawing: where each layer sits (homeLayout.json, GPT's
 * `layout.json` copied verbatim — every rect is [x, y, w, h] in its own 4K coordinate system, 3840×2160 for the
 * laptop room and 2160×3840 for the phone room), which file holds it (homeArtManifest.json, written by
 * tools/home-art.mjs, which also made public/home/*.webp from the 4K PNG masters), and the few decisions the
 * layout does not make for us (the breakpoint, the two sizes, the armchair's hit area). lambyosHome.ts builds
 * the DOM from it. Nothing here touches the document.
 *
 * TWO SIZES. Every layer ships twice, `_l` at its full coordinate size and `_s` at half; `useLarge()` picks per
 * screen from the device pixels the room is actually drawn in (a 1440×900 laptop at DPR 2 draws the room 2880 px
 * wide and gets the large set; a 390×844 phone at DPR 3 draws it 1170 px wide and gets the small one).
 *
 * THE BREAKPOINT is GPT's own (round4 logic.js): a viewport narrower than 0.8 (width/height) is the phone room.
 */
import layout from './homeLayout.json';
import manifest from './homeArtManifest.json';

export type Mode = 'laptop' | 'phone';
export interface Rect { x: number; y: number; w: number; h: number }

/** every object that is pressed (lexicon is pressed in the return and answered "later" in the arrival) */
export type HomeObject =
  | 'door' | 'notice' | 'plaque' | 'lexicon' | 'armchair' | 'remote' | 'switch'
  | 'computer' | 'tablet' | 'headset' | 'lamby' | 'clock' | 'calendar';

export const ROOM: Record<Mode, { w: number; h: number }> = {
  laptop: { w: layout.laptop.width, h: layout.laptop.height },
  phone: { w: layout.phone.width, h: layout.phone.height }
};

export const modeFor = (vw: number, vh: number): Mode => (vw / vh < 0.8 ? 'phone' : 'laptop');

type Row = {
  id: string;
  laptop: number[]; phone: number[];
  tabOrder: number | null;
  visualRect?: { laptop: number[]; phone: number[] };
  padlock?: { visualAnchor: number[] };
  pivot?: number[];
};
const rows = layout.objects as Row[];
const row = (id: string): Row => {
  const r = rows.find((o) => o.id === id);
  if (!r) throw new Error(`homeLayout.json: no object "${id}"`);
  return r;
};
const toRect = (a: number[]): Rect => ({ x: a[0], y: a[1], w: a[2], h: a[3] });

/**
 * the button's rectangle: GPT's, with ONE correction. On the laptop the armchair's rectangle lies almost entirely
 * under Lamby's (336 × 352 of 352 × 352 units), so a press on the chair would always have been Lamby's. Only the
 * strip of the chair that shows beside him (x ≥ 3700) is the chair's; on the phone the chair's rectangle runs
 * 40 units into the remote's, so it stops where the remote's begins.
 */
export function hitRect(k: HomeObject, mode: Mode): Rect {
  const r = toRect(row(k)[mode]);
  if (k === 'armchair' && mode === 'laptop') { const right = r.x + r.w; r.x = 3700; r.w = right - 3700; }
  if (k === 'armchair' && mode === 'phone') r.h = row('remote').phone[1] - r.y;
  return r;
}

/** where the layer's picture is drawn (its fitted artwork), when the object has a picture */
export function visualRect(id: string, mode: Mode): Rect | null {
  const v = row(id).visualRect;
  return v ? toRect(v[mode]) : null;
}

/** GPT's reading order (its `tabOrder`), with the Lexicon after the plaque (its place on the shelf, ours to keep) */
export const TAB_ORDER: HomeObject[] = (() => {
  const base = rows.filter((o) => o.tabOrder !== null && o.id !== 'speech-bubble').sort((a, b) => a.tabOrder! - b.tabOrder!).map((o) => o.id as HomeObject);
  base.splice(base.indexOf('plaque') + 1, 0, 'lexicon');
  return base;
})();

/** the speech bubble: its RIGHT edge and top are fixed; the width and height follow the text (round4 positionBubble) */
export const bubbleRect = (mode: Mode): Rect => toRect(row('speech-bubble')[mode]);

/** a device's padlock: a point inside its visual rectangle as fractions (x, y) */
export const padlockAnchor = (k: 'computer' | 'tablet' | 'headset'): [number, number] => {
  const a = row(k).padlock!.visualAnchor;
  return [a[0], a[1]];
};

/** the clock's two hands: their rectangles and their pivot (as fractions of the hand) */
export const HAND_PIVOT: [number, number] = (() => { const p = row('clock-hour-hand').pivot!; return [p[0], p[1]]; })();
export const handRect = (which: 'hour' | 'minute', mode: Mode): Rect => toRect(row(`clock-${which}-hand`)[mode]);

/** the layers that are pictures only (no button of their own) */
export const DECOR: string[] = ['vhs', 'cd-box'];

/** the layer's natural size, in its room's coordinate units */
export function layerSize(name: string, mode: Mode): { w: number; h: number } {
  const m = (manifest as Record<string, { stem: string; w: number; h: number }>)[`${name}-${mode}`];
  if (!m) throw new Error(`homeArtManifest.json: no layer "${name}-${mode}"`);
  return { w: m.w, h: m.h };
}

/** the file for a layer, relative to the page (vite's `base: './'`) */
export function layerUrl(name: string, mode: Mode, large: boolean): string {
  const m = (manifest as Record<string, { stem: string }>)[`${name}-${mode}`];
  if (!m) throw new Error(`homeArtManifest.json: no layer "${name}-${mode}"`);
  return `home/${m.stem}_${large ? 'l' : 's'}.webp`;
}

/** the large set only where the room is drawn wider than ~2000 device pixels (a laptop room's 3840 units at
 *  > 0.55 device px per unit; the phone room, 2160 units wide, shares the ratio) */
export const useLarge = (cssPxPerUnit: number, dpr: number): boolean => cssPxPerUnit * dpr > 0.55;
