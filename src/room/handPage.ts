/**
 * ⚑ S382 (UiB job 22 Part A, item 2) — A PAGE IN SOMEONE'S HAND, pixel by pixel.
 *
 * Sérgio, 13 Nov: "The notebook doesn't give me much because there is no interaction with it." Vera's notebook now
 * comes to her hand and shows one page (src/room/veraDesk.ts). The page is drawn here as pixel art, the piece's own
 * handwriting: calendarArt.ts's `hand` (her mother's "camp" in 1997, Vera's ring on the 2016 planner) has ten
 * lowercase letters, x-height 5, each letter placed by hand; this is the same idea carried to a whole alphabet so a
 * page of words can be written in it. x-height 5, ascenders 3 above it, descenders 2 below, a pixel between letters,
 * three between words, and the line wanders a pixel up or down from word to word because a hand is not a printer.
 * No font file: every glyph is in this table (fonts.ts law — nothing fetched, nothing that varies by machine).
 *
 * Colours are passed in by the caller from src/desktop/theme/ (palette law).
 */
import { px, type Ctx } from './calendarArt';

/** [top row relative to the x-height's top (negative = an ascender), rows] */
type Glyph = [number, string[]];

const G: Record<string, Glyph> = {
  a: [0, ['.##.', '...#', '.###', '#..#', '.###']],
  b: [-3, ['#..', '#..', '#..', '##.', '#.#', '#.#', '#.#', '##.']],
  c: [0, ['.##', '#..', '#..', '#..', '.##']],
  d: [-3, ['..#', '..#', '..#', '.##', '#.#', '#.#', '#.#', '.##']],
  e: [0, ['.#.', '#.#', '###', '#..', '.##']],
  f: [-3, ['..#', '.#.', '.#.', '###', '.#.', '.#.', '.#.', '.#.']],
  g: [0, ['.##', '#.#', '#.#', '#.#', '.##', '..#', '##.']],
  h: [-3, ['#..', '#..', '#..', '##.', '#.#', '#.#', '#.#', '#.#']],
  i: [-2, ['#', '.', '#', '#', '#', '#', '#']],
  j: [-2, ['.#', '..', '.#', '.#', '.#', '.#', '.#', '.#', '#.']],
  k: [-3, ['#..', '#..', '#..', '#.#', '##.', '##.', '#.#', '#.#']],
  l: [-3, ['#.', '#.', '#.', '#.', '#.', '#.', '#.', '.#']],
  m: [0, ['##.#.', '#.#.#', '#.#.#', '#.#.#', '#.#.#']],
  n: [0, ['##.', '#.#', '#.#', '#.#', '#.#']],
  o: [0, ['.#.', '#.#', '#.#', '#.#', '.#.']],
  p: [0, ['##.', '#.#', '#.#', '#.#', '##.', '#..', '#..']],
  q: [0, ['.##', '#.#', '#.#', '#.#', '.##', '..#', '..#']],
  r: [0, ['#.#', '##.', '#..', '#..', '#..']],
  s: [0, ['.##', '#..', '.#.', '..#', '##.']],
  t: [-2, ['.#.', '.#.', '###', '.#.', '.#.', '.#.', '..#']],
  u: [0, ['#.#', '#.#', '#.#', '#.#', '.##']],
  v: [0, ['#...#', '#...#', '.#.#.', '.#.#.', '..#..']],
  w: [0, ['#...#', '#...#', '#.#.#', '#.#.#', '.#.#.']],
  x: [0, ['#.#', '#.#', '.#.', '#.#', '#.#']],
  y: [0, ['#.#', '#.#', '#.#', '#.#', '.##', '..#', '##.']],
  z: [0, ['###', '..#', '.#.', '#..', '###']],
  A: [-3, ['.##.', '#..#', '#..#', '#..#', '####', '#..#', '#..#', '#..#']],
  B: [-3, ['###.', '#..#', '#..#', '###.', '#..#', '#..#', '#..#', '###.']],
  C: [-3, ['.###', '#...', '#...', '#...', '#...', '#...', '#...', '.###']],
  D: [-3, ['###.', '#..#', '#..#', '#..#', '#..#', '#..#', '#..#', '###.']],
  E: [-3, ['####', '#...', '#...', '###.', '#...', '#...', '#...', '####']],
  F: [-3, ['####', '#...', '#...', '###.', '#...', '#...', '#...', '#...']],
  G: [-3, ['.###', '#...', '#...', '#.##', '#..#', '#..#', '#..#', '.###']],
  H: [-3, ['#..#', '#..#', '#..#', '####', '#..#', '#..#', '#..#', '#..#']],
  I: [-3, ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '.#.', '###']],
  J: [-3, ['..##', '...#', '...#', '...#', '...#', '...#', '#..#', '.##.']],
  K: [-3, ['#..#', '#..#', '#.#.', '##..', '##..', '#.#.', '#..#', '#..#']],
  L: [-3, ['#...', '#...', '#...', '#...', '#...', '#...', '#...', '####']],
  M: [-3, ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#', '#...#']],
  N: [-3, ['#..#', '##.#', '##.#', '#.##', '#.##', '#..#', '#..#', '#..#']],
  O: [-3, ['.##.', '#..#', '#..#', '#..#', '#..#', '#..#', '#..#', '.##.']],
  P: [-3, ['###.', '#..#', '#..#', '###.', '#...', '#...', '#...', '#...']],
  Q: [-3, ['.##.', '#..#', '#..#', '#..#', '#..#', '#.#.', '#..#', '.#.#']],
  R: [-3, ['###.', '#..#', '#..#', '###.', '#.#.', '#..#', '#..#', '#..#']],
  S: [-3, ['.###', '#...', '#...', '.##.', '...#', '...#', '...#', '###.']],
  T: [-3, ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..']],
  U: [-3, ['#..#', '#..#', '#..#', '#..#', '#..#', '#..#', '#..#', '.##.']],
  V: [-3, ['#...#', '#...#', '#...#', '#...#', '.#.#.', '.#.#.', '.#.#.', '..#..']],
  W: [-3, ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '#.#.#', '.#.#.']],
  X: [-3, ['#..#', '#..#', '.##.', '.##.', '.##.', '.##.', '#..#', '#..#']],
  Y: [-3, ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..', '..#..']],
  Z: [-3, ['####', '...#', '..#.', '..#.', '.#..', '.#..', '#...', '####']],
  '0': [-3, ['.##.', '#..#', '#..#', '#..#', '#..#', '#..#', '#..#', '.##.']],
  '1': [-3, ['.#', '##', '.#', '.#', '.#', '.#', '.#', '.#']],
  '2': [-3, ['.##.', '#..#', '...#', '..#.', '.#..', '#...', '#...', '####']],
  '3': [-3, ['###.', '...#', '...#', '.##.', '...#', '...#', '...#', '###.']],
  '4': [-3, ['...#', '..##', '.#.#', '#..#', '####', '...#', '...#', '...#']],
  '5': [-3, ['####', '#...', '#...', '###.', '...#', '...#', '#..#', '.##.']],
  '6': [-3, ['.##.', '#...', '#...', '###.', '#..#', '#..#', '#..#', '.##.']],
  '7': [-3, ['####', '...#', '..#.', '..#.', '.#..', '.#..', '.#..', '.#..']],
  '8': [-3, ['.##.', '#..#', '#..#', '.##.', '#..#', '#..#', '#..#', '.##.']],
  '9': [-3, ['.##.', '#..#', '#..#', '#..#', '.###', '...#', '...#', '.##.']],
  '.': [4, ['#']],
  ',': [4, ['.#', '#.']],
  "'": [-3, ['#', '#']],
  '’': [-3, ['#', '#']],
  '"': [-3, ['#.#', '#.#']],
  '!': [-3, ['#', '#', '#', '#', '#', '#', '.', '#']],
  '?': [-3, ['.##.', '#..#', '...#', '..#.', '.#..', '.#..', '....', '.#..']],
  '-': [2, ['###']],
  ':': [1, ['#', '.', '.', '#']],
  ';': [1, ['.#', '..', '..', '.#', '#.']]
};

const SPACE = 3;
/** the hand's wander, word by word, in pixels (a short repeating figure, so the page is the same on every run) */
const WANDER = [0, 0, -1, 0, 1, 0, -1, -1, 0, 1];

export const handGlyphKnown = (ch: string): boolean => ch === ' ' || !!G[ch];

/** a word's width in the hand (letters a pixel apart) */
export function handWidth(word: string): number {
  let w = 0;
  for (const ch of word) w += (G[ch]?.[1][0].length ?? SPACE) + 1;
  return Math.max(0, w - 1);
}

/** one word at (x, baseline) — the baseline is the row under the x-height */
export function handWord(c: Ctx, word: string, x: number, baseline: number, col: string): number {
  let cx = x;
  for (const ch of word) {
    const g = G[ch];
    if (!g) { cx += SPACE + 1; continue; }
    const [top, rows] = g;
    const y0 = baseline - 5 + top;
    rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') px(c, cx + i, y0 + j, col); });
    cx += rows[0].length + 1;
  }
  return cx - x - 1;
}

/** wrap words to a width; returns the lines */
export function handWrap(text: string, width: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? line + ' ' + word : word;
    if (line && handWidth(next) > width) { out.push(line); line = word; } else line = next;
  }
  if (line) out.push(line);
  return out;
}

export interface HandPageInk { paper: string; rule: string; margin: string; ink: string }
export interface HandPageLayout { w: number; h: number; left: number; right: number; firstRule: number; pitch: number }

/**
 * A ruled page: rules every `pitch` px from `firstRule`, a margin line, the date in the top right corner above the
 * first rule, and the text written on the rules below it. Returns the number of lines the text took (so a caller can
 * check it fits) — the page never shrinks the hand to make it fit.
 */
export function drawHandPage(c: Ctx, L: HandPageLayout, ink: HandPageInk, date: string, text: string): number {
  px(c, 0, 0, ink.paper, L.w, L.h);
  for (let y = L.firstRule; y < L.h - 4; y += L.pitch) px(c, 2, y, ink.rule, L.w - 4, 1);
  px(c, L.left - 4, 0, ink.margin, 1, L.h);
  if (date) handWord(c, date, L.w - 6 - handWidth(date), L.firstRule - 2, ink.ink);
  const lines = handWrap(text, L.right - L.left);
  let n = 0;
  lines.forEach((line, i) => {
    const baseline = L.firstRule + L.pitch * (i + 1) - 1;
    let x = L.left;
    for (const word of line.split(' ')) {
      x += handWord(c, word, x, baseline + WANDER[n % WANDER.length], ink.ink) + SPACE + 1;
      n++;
    }
  });
  return lines.length;
}
