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
  '>': '01000 00100 00010 00001 00010 00100 01000', '_': '00000 00000 00000 00000 00000 00000 11111'
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

/** one line of 5×7 text; `s` scales every dot. Returns the width drawn. */
export function text(c: Painter, str: string, x: number, y: number, col: string, s = 1): number {
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
