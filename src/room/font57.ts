/**
 * ⚑ S221 — THE 5×7 TYPE for the handheld games (his, 2026-10-08, on CLEAR v8: "Much better — the quality
 * improvement you made on the CLEAR game, make sure the FIT IN also has it, so it looks good").
 *
 * The calendar's 3×5 type (calendarArt.ts) is right for a calendar page seen across a room and wrong for a
 * game held in the hand: at 3 dots wide an A and an R are a guess. The period's own answer was the 5×7 dot
 * matrix (the LCD character sets of the 1990s and 2000s), so this is the type those screens actually drew,
 * as well as a legible one. Letters and digits are 5 wide (I is 3, so words do not gap; digits stay 5 so a
 * count does not jitter); punctuation is trimmed to its ink. Same call shape as calendarArt's `text`.
 */
import { px, type Painter } from './calendarArt';

const F57: Record<string, string> = {
  A: '01110 10001 10001 11111 10001 10001 10001', B: '11110 10001 10001 11110 10001 10001 11110', C: '01110 10001 10000 10000 10000 10001 01110',
  D: '11100 10010 10001 10001 10001 10010 11100', E: '11111 10000 10000 11110 10000 10000 11111', F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01111', H: '10001 10001 10001 11111 10001 10001 10001', I: '01110 00100 00100 00100 00100 00100 01110',
  J: '00111 00010 00010 00010 00010 10010 01100', K: '10001 10010 10100 11000 10100 10010 10001', L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001', N: '10001 10001 11001 10101 10011 10001 10001', O: '01110 10001 10001 10001 10001 10001 01110',
  P: '11110 10001 10001 11110 10000 10000 10000', Q: '01110 10001 10001 10001 10101 10010 01101', R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110', T: '11111 00100 00100 00100 00100 00100 00100', U: '10001 10001 10001 10001 10001 10001 01110',
  V: '10001 10001 10001 10001 10001 01010 00100', W: '10001 10001 10001 10101 10101 10101 01010', X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 10001 01010 00100 00100 00100', Z: '11111 00001 00010 00100 01000 10000 11111',
  '0': '01110 10001 10011 10101 11001 10001 01110', '1': '00100 01100 00100 00100 00100 00100 01110', '2': '01110 10001 00001 00010 00100 01000 11111',
  '3': '11111 00010 00100 00010 00001 10001 01110', '4': '00010 00110 01010 10010 11111 00010 00010', '5': '11111 10000 11110 00001 00001 10001 01110',
  '6': '00110 01000 10000 11110 10001 10001 01110', '7': '11111 00001 00010 00100 01000 01000 01000', '8': '01110 10001 10001 01110 10001 10001 01110',
  '9': '01110 10001 10001 01111 00001 00010 01100',
  '.': '00000 00000 00000 00000 00000 01100 01100', ',': '00000 00000 00000 00000 01100 00100 01000', '!': '00100 00100 00100 00100 00100 00000 00100',
  '?': '01110 10001 00001 00010 00100 00000 00100', ':': '00000 01100 01100 00000 01100 01100 00000', '-': '00000 00000 00000 11111 00000 00000 00000',
  '+': '00000 00100 00100 11111 00100 00100 00000', '%': '11000 11001 00010 00100 01000 10011 00011', '/': '00000 00001 00010 00100 01000 10000 00000',
  "'": '01100 00100 01000 00000 00000 00000 00000', '"': '01010 01010 01010 00000 00000 00000 00000', '&': '01100 10010 10100 01000 10101 10010 01101',
  '(': '00010 00100 01000 01000 01000 00100 00010', ')': '01000 00100 00010 00010 00010 00100 01000', '=': '00000 00000 11111 00000 11111 00000 00000',
  '*': '00000 00100 10101 01110 10101 00100 00000', '#': '01010 01010 11111 01010 11111 01010 01010', '<': '00010 00100 01000 10000 01000 00100 00010',
  '>': '01000 00100 00010 00001 00010 00100 01000', '_': '00000 00000 00000 00000 00000 00000 11111',
  // ⚑ S367 — lower case, the period's LCD set (5 × 7, with an eighth row for g j p q y), for `textCased` only: a
  //   username on a name tag ("maya") reads as a username. `text` still upper-cases everything, so no game changes.
  a: '00000 00000 01110 00001 01111 10001 01111', b: '10000 10000 10110 11001 10001 10001 11110', c: '00000 00000 01110 10000 10000 10001 01110',
  d: '00001 00001 01101 10011 10001 10001 01111', e: '00000 00000 01110 10001 11111 10000 01110', f: '00110 01001 01000 11100 01000 01000 01000',
  g: '00000 00000 01111 10001 10001 01111 00001 01110', h: '10000 10000 10110 11001 10001 10001 10001', i: '00100 00000 01100 00100 00100 00100 01110',
  j: '00010 00000 00110 00010 00010 00010 10010 01100', k: '10000 10000 10010 10100 11000 10100 10010', l: '01100 00100 00100 00100 00100 00100 01110',
  m: '00000 00000 11010 10101 10101 10001 10001', n: '00000 00000 10110 11001 10001 10001 10001', o: '00000 00000 01110 10001 10001 10001 01110',
  p: '00000 00000 11110 10001 10001 11110 10000 10000', q: '00000 00000 01101 10011 10011 01101 00001 00001', r: '00000 00000 10110 11001 10000 10000 10000',
  s: '00000 00000 01110 10000 01110 00001 11110', t: '01000 01000 11100 01000 01000 01001 00110', u: '00000 00000 10001 10001 10001 10011 01101',
  v: '00000 00000 10001 10001 10001 01010 00100', w: '00000 00000 10001 10001 10101 10101 01010', x: '00000 00000 10001 01010 00100 01010 10001',
  y: '00000 00000 10001 10001 10001 01111 00001 01110', z: '00000 00000 11111 00010 00100 01000 11111'
};

interface Glyph { rows: string[]; l: number; w: number }
const GLY: Record<string, Glyph> = {};
for (const [ch, src] of Object.entries(F57)) {
  const rows = src.split(' ');
  let l = 0, r = 4;
  if (!/[A-Z0-9]/.test(ch) || ch === 'I') {
    l = 5; r = -1;
    for (const row of rows) for (let i = 0; i < 5; i++) if (row[i] === '1') { l = Math.min(l, i); r = Math.max(r, i); }
  }
  GLY[ch] = { rows, l, w: r - l + 1 };
}
GLY[' '] = { rows: [], l: 0, w: 3 };
const gOf = (ch: string): Glyph => GLY[ch] ?? GLY[' '];

/** the type's height in pixels at scale 1 */
export const TH = 7;

/** ⚑ S373 — a review hook (tools/text-angle.mjs installs it; nothing else does): told each line's painter and dot scale, so the
 *  type's size in degrees can be measured like any fillText. A property read and a no-op call otherwise. */
const seen = (c: Painter, s: number, str: string): void => (globalThis as { __f57?: (c: Painter, s: number, str: string) => void }).__f57?.(c, s, str);

/** one line of 5×7 text; `s` scales every dot. Returns the width drawn. */
export function text(c: Painter, str: string, x: number, y: number, col: string, s = 1): number {
  seen(c, s, str);
  let cx = x;
  for (const ch of str.toUpperCase()) {
    const g = gOf(ch);
    for (let j = 0; j < g.rows.length; j++) for (let i = 0; i < g.w; i++) if (g.rows[j][g.l + i] === '1') px(c, cx + i * s, y + j * s, col, s, s);
    cx += (g.w + 1) * s;
  }
  return cx - x - s;
}

export const textW = (str: string, s = 1): number => {
  let w = 0;
  for (const ch of str.toUpperCase()) w += (gOf(ch).w + 1) * s;
  return Math.max(0, w - s);
};

/** ⚑ S367 — the same type with its case kept (lower case from the LCD set above; a letter it lacks falls back to upper
 *  case). g j p q y drop one row below the line. Returns the width drawn. */
export function textCased(c: Painter, str: string, x: number, y: number, col: string, s = 1): number {
  seen(c, s, str);
  let cx = x;
  for (const ch0 of str) {
    const g = GLY[ch0] ?? gOf(ch0.toUpperCase());
    for (let j = 0; j < g.rows.length; j++) for (let i = 0; i < g.w; i++) if (g.rows[j][g.l + i] === '1') px(c, cx + i * s, y + j * s, col, s, s);
    cx += (g.w + 1) * s;
  }
  return cx - x - s;
}
export const textCasedW = (str: string, s = 1): number => {
  let w = 0;
  for (const ch0 of str) w += ((GLY[ch0] ?? gOf(ch0.toUpperCase())).w + 1) * s;
  return Math.max(0, w - s);
};
