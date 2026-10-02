/**
 * ⚑ S177 / R4-27 — THE CALENDAR PAGES: one month per era, drawn as pixel art.
 *
 * Sérgio, 2026-09-24: a calendar "across eras, the image on it to be specific to each
 * era… related to the age, time, and the connection with SOGICE, not all need to be
 * religious". 2026-09-26: D1 "break that rule of the flat colours, no texture. Make
 * the pixel art good"; D4 the four pages as proposed ("Amazing, love it"):
 *
 *   e1 · July 1997 — Daniel, 16: a band on his wall, an ordinary teenager's calendar,
 *        and one week in someone else's hand: "camp", 12–19 July, his mother's biro.
 *        Summer camps were a documented vector; nothing on the page is religious.
 *   e2 · November 2003 — Restorify's promotional calendar (its sunrise, its lamb) and
 *        the days crossed off in his own marker: the software's streak, kept by him.
 *   e3 · December 2016 — Vera's work planner from the platform, the 6th ringed (the
 *        "Tuesday 6 December" of her phone's lock screen — S209: the real vote day) and the shift's quota on a
 *        sticky note. Malta's law is published on the 9th; the page knows nothing of it.
 *   e4 · October 2026 — a queer bookshop's gift calendar, one night marked in her
 *        hand: the Commons. The respite register — joy, never a trap.
 *
 * The page is PAINTED, never lettered with a font: every glyph is a 3×5 bitmap here
 * and the handwriting is placed pixel by pixel, so it is the same on every machine and
 * crisp through FILTER_NEAREST. Colours come from src/desktop/theme/calendar.ts. The
 * drawing speaks only `fillStyle` + `fillRect`, so tools/calendar_preview.mjs renders
 * the same pages to PNG outside the browser (this file never imports PlayCanvas;
 * calendarPage.ts hangs the page in the room).
 *
 * Layout (80 × 152, the model's front face — `face` in data/room/models.json): the
 * picture on rows 0–71, the binding on 72–79 (the model's own rings stand in front of
 * it), the month on 80–151.
 */
import { CAL_1997, CAL_2003, CAL_2016, CAL_2026, type CalendarInks } from '../desktop/theme/calendar';

export type PageEra = 'e1' | 'e2' | 'e3' | 'e4';
export const PAGE_W = 80;
export const PAGE_H = 152;

export interface Painter { fillStyle: string | CanvasGradient | CanvasPattern; fillRect(x: number, y: number, w: number, h: number): void }

// ── the 3×5 type ─────────────────────────────────────────────────────────────
const GLYPH: Record<string, string> = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111',
  '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001001010010',
  '8': '111101111101111', '9': '111101111001111',
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111', '/': '001001010100100', '-': '000000111000000',
  ',': '000000000010100', '.': '000000000000010', ' ': '000000000000000',
  "'": '010010000000000', ':': '000010000010000', '&': '010101010101011',
  // S183 — the intake terminal's prompt and cursor
  '>': '100010001010100', '_': '000000000000111', '<': '001010100010001', '!': '010010010000010', '?': '111001010000010', '%': '101001010100101', '"': '101101000000000'
};

export type Ctx = Painter;
export function px(c: Ctx, x: number, y: number, col: string, w = 1, h = 1): void { c.fillStyle = col; c.fillRect(x, y, w, h); }

/** one line of 3×5 text; `s` scales every cell (a ×2 title). Returns the width drawn. */
export function text(c: Ctx, str: string, x: number, y: number, col: string, s = 1): number {
  let cx = x;
  for (const ch of str.toUpperCase()) {
    const g = GLYPH[ch] ?? GLYPH[' '];
    for (let i = 0; i < 15; i++) if (g[i] === '1') px(c, cx + (i % 3) * s, y + Math.floor(i / 3) * s, col, s, s);
    cx += 4 * s;
  }
  return cx - x - s;
}
export const textW = (str: string, s = 1): number => str.length * 4 * s - s;

/** a pixel sprite from rows of characters; each char maps to a colour, '.' is clear */
export function sprite(c: Ctx, x: number, y: number, rows: string[], map: Record<string, string>): void {
  rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const col = map[r[i]]; if (col) px(c, x + i, y + j, col); } });
}

/** a vertical band from `a` to `b` over rows y0..y1, dithered across the seam */
export function gradient(c: Ctx, y0: number, y1: number, stops: string[], width = PAGE_W): void {
  const n = stops.length - 1;
  for (let y = y0; y <= y1; y++) {
    const t = ((y - y0) / Math.max(1, y1 - y0)) * n;
    const k = Math.min(n - 1, Math.floor(t));
    const f = t - k;
    // ordered 2×2 dither: the next stop creeps in over the seam in a checker
    for (let x = 0; x < width; x++) {
      const thr = ((x & 1) * 2 + (y & 1)) / 4 + 0.125;
      px(c, x, y, f > thr ? stops[k + 1] : stops[k]);
    }
  }
}

/** a filled disc (for the sun, the drum, the lights) */
export function disc(c: Ctx, cx: number, cy: number, r: number, col: string, clipY = 999): void {
  for (let y = Math.ceil(cy - r); y <= cy + r; y++) {
    if (y > clipY) continue;
    const w = Math.floor(Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy))));
    px(c, cx - w, y, col, w * 2 + 1, 1);
  }
}

/** a pixel line (Bresenham), `t` thick */
export function line(c: Ctx, x0: number, y0: number, x1: number, y1: number, col: string, t = 1): void {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, x = x0, y = y0;
  for (;;) {
    px(c, x, y, col, t, t);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

// ── the month grid ───────────────────────────────────────────────────────────
interface Month { name: string; year: number; first: number /* weekday of the 1st, 0 = Sunday */; days: number; mondayFirst: boolean }
interface Grid { cellX: (col: number) => number; cellY: (row: number) => number; at: (day: number) => { x: number; y: number }; cw: number; ch: number }

const GRID_TOP = 94, CELL_W = 11;

function monthGrid(c: Ctx, m: Month, ink: CalendarInks, weekendCols: number[]): Grid {
  const lead = m.mondayFirst ? (m.first + 6) % 7 : m.first;
  const rows = Math.ceil((lead + m.days) / 7);
  const ch = rows > 5 ? 9 : 11;
  const title = `${m.name} ${m.year}`;
  text(c, title, Math.round((PAGE_W - textW(title)) / 2), 82, ink.head);
  const letters = m.mondayFirst ? 'MTWTFSS' : 'SMTWTFS';
  for (let i = 0; i < 7; i++) text(c, letters[i], 1 + i * CELL_W + 4, 88, weekendCols.includes(i) ? ink.weekend : ink.ink);
  const cellX = (col: number): number => 1 + col * CELL_W;
  const cellY = (row: number): number => GRID_TOP + row * ch;
  // the rules
  for (let r = 0; r <= rows; r++) px(c, 1, cellY(r), ink.rule, 7 * CELL_W + 1, 1);
  for (let k = 0; k <= 7; k++) px(c, cellX(k), GRID_TOP, ink.rule, 1, rows * ch + 1);
  const at = (day: number): { x: number; y: number } => {
    const i = lead + day - 1;
    return { x: cellX(i % 7), y: cellY(Math.floor(i / 7)) };
  };
  for (let d = 1; d <= m.days; d++) {
    const { x, y } = at(d);
    const col = (lead + d - 1) % 7;
    text(c, String(d), x + 2, y + 2, weekendCols.includes(col) ? ink.weekend : ink.ink);
  }
  return { cellX, cellY, at, cw: CELL_W, ch };
}

/** the binding strip: the page's punched holes under the model's rings */
function binding(c: Ctx, ink: CalendarInks): void {
  px(c, 0, 72, ink.rule, PAGE_W, 1);
  for (const x of [23, 55]) { px(c, x, 75, ink.hole, 3, 2); }
}

// ── handwriting: lowercase, placed pixel by pixel (x-height 5, a descender below) ──
const HAND: Record<string, string[]> = {
  c: ['.##', '#..', '#..', '#..', '.##'],
  a: ['.##.', '...#', '.###', '#..#', '.###'],
  m: ['##.#.', '#.#.#', '#.#.#', '#.#.#', '#.#.#'],
  p: ['##.', '#.#', '#.#', '#.#', '##.', '#..', '#..'],
  o: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  n: ['##.', '#.#', '#.#', '#.#', '#.#'],
  s: ['.##', '#..', '.#.', '..#', '##.']
};
/** a word in someone's hand, letters a pixel apart, each with its own small lift */
export function hand(c: Ctx, word: string, x: number, y: number, col: string): number {
  let cx = x;
  [...word].forEach((ch, k) => {
    const g = HAND[ch];
    if (!g) { cx += 3; return; }
    const lift = k % 3 === 1 ? -1 : 0;   // the hand is not a printer: the line wanders
    g.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') px(c, cx + i, y + j + lift, col); });
    cx += g[0].length + 1;
  });
  return cx - x - 1;
}

// ── 1997 · July · a band, and his mother's hand ─────────────────────────────
function page1997(c: Ctx): void {
  const P = CAL_1997;
  px(c, 0, 0, P.paper, PAGE_W, PAGE_H);
  // the picture: a stage at night
  gradient(c, 0, 59, [P.night, P.dusk, P.haze, P.glow]);
  // three beams from the rig, dithered so the stage shows through them
  const beams: [number, string][] = [[16, P.beamA], [40, P.beamB], [64, P.beamC]];
  for (const [bx, col] of beams) {
    px(c, bx - 2, 14, P.cone, 5, 2);
    for (let y = 16; y <= 59; y++) {
      const half = 1 + Math.floor((y - 16) * 0.26);
      for (let x = bx - half; x <= bx + half; x++) if (((x + y) & 1) === 0 && x >= 0 && x < PAGE_W) px(c, x, y, col);
    }
  }
  // the band's name, twice the type size, in its poster pink
  const name = 'SUGARWIRE';
  const nx = Math.round((PAGE_W - textW(name, 2)) / 2);
  text(c, name, nx + 1, 4, P.titleShadow, 2);
  text(c, name, nx, 3, P.title, 2);
  for (const [sx, sy] of [[6, 18], [73, 22], [30, 25], [52, 17], [11, 34], [69, 38], [45, 30]]) px(c, sx, sy, P.spark);
  // the stacks
  for (const sx of [2, 70]) {
    px(c, sx, 42, P.speaker, 8, 18);
    disc(c, sx + 4, 47, 2, P.cone); disc(c, sx + 4, 54, 3, P.cone);
    px(c, sx + 4, 47, P.figure); px(c, sx + 4, 54, P.figure);
  }
  // the drums, back right
  px(c, 44, 44, P.cymbal, 7, 1); px(c, 47, 45, P.figure, 1, 6);
  disc(c, 52, 53, 5, P.drumShell); disc(c, 52, 53, 4, P.drumHead); px(c, 52, 53, P.drumShell);
  px(c, 57, 49, P.drumShell, 4, 3); px(c, 57, 49, P.drumHead, 4, 1);
  // the three of them, in silhouette with the lights on their edges
  const F = { k: P.figure, r: P.rim, g: P.guitar, n: P.neck, b: P.bass };
  sprite(c, 13, 34, [
    '...kk.......',
    '..kkkk......',
    '..kkkkr.....',
    '...kk.......',
    '.kkkkkk.....',
    'kkkkkkkr.nn.',
    'kkkkkkk.nn..',
    'k.kgggg.n...',
    'k.ggggggn...',
    '..ggggkg....',
    '...kkkk.....',
    '...kkkkr....',
    '...kk.kk....',
    '...kk.kk....',
    '...kk.kk....',
    '...kk.kk....',
    '...kk.kkr...',
    '...kk.kk....',
    '...kk..kk...',
    '..kkk..kkk..',
    '............',
    '............',
    '............',
    '............',
    '............',
    '............'
  ], F);
  // the singer, arm up, at the stand
  sprite(c, 33, 31, [
    '.......k.....',
    '..k.k.kk.....',
    '..kkkkk......',
    '..kkkkr..r...',
    '...kkk..kk...',
    '..kkkkkkk....',
    '.kkkkkkr.....',
    'kkkkkkr....k.',
    'k.kkkkk....k.',
    'k.kkkkk....k.',
    'k.kkkkkr...k.',
    '..kkkkk....k.',
    '..kk.kk....k.',
    '..kk.kk....k.',
    '..kk.kkr...k.',
    '..kk.kk....k.',
    '..kk.kk....k.',
    '..kk.kk....k.',
    '..kk..kk...k.',
    '..kk..kk...k.',
    '.kkk..kkk.kkk'
  ], F);
  px(c, 43, 31, P.cone, 2, 2); // the mic
  // ⚑ S179 — hidden in plain sight (his: "hidden elements of queerness"): a pink triangle pin on
  //   the singer's chest, two pixels. Nobody on the page mentions it.
  px(c, 36, 38, P.title, 2, 1); px(c, 36, 39, P.title, 1, 1);
  // the bass player, right
  sprite(c, 60, 35, [
    '..kk........',
    '.kkkk.......',
    '.rkkkk......',
    '..kk........',
    '.kkkkkk.....',
    'rkkkkkkk....',
    '.kkkkkkk....',
    '.bbbbk.k....',
    'bbbbbbbnn...',
    '.bbbbk..nnn.',
    '..kkkk....nn',
    '..kkkk......',
    '..kk.kk.....',
    '..kk.kk.....',
    '.rkk.kk.....',
    '..kk.kk.....',
    '..kk.kk.....',
    '..kk.kk.....',
    '.kkk.kkk....'
  ], F);
  // the stage
  px(c, 0, 60, P.stageTop, PAGE_W, 1);
  px(c, 0, 61, P.stage, PAGE_W, 10);
  for (let x = 3; x < PAGE_W; x += 13) px(c, x, 62, P.stageFront, 1, 9);
  px(c, 0, 71, P.stageFront, PAGE_W, 1);
  binding(c, P);
  const g = monthGrid(c, { name: 'JULY', year: 1997, first: 2, days: 31, mondayFirst: false }, P, [0]);
  // ⚑ HIS MOTHER'S HAND — "camp", Saturday 12 to Saturday 19, in her biro: a start tick
  //   on the 12th running off the week's edge, then the word and an arrow through the
  //   week that follows. The only writing on the page that is not his.
  const s = g.at(12), e = g.at(19);
  const yl = s.y + g.ch - 3;
  px(c, s.x + 2, yl - 2, P.mother, 1, 3);
  line(c, s.x + 2, yl, s.x + g.cw - 1, yl, P.mother);
  const r2 = g.at(13);
  const yw = r2.y + 7;
  const w = hand(c, 'camp', r2.x + 3, yw, P.mother);
  line(c, r2.x + 3 + w + 1, yw + 3, e.x + g.cw - 3, yw + 3, P.mother);
  line(c, e.x + g.cw - 5, yw + 1, e.x + g.cw - 3, yw + 3, P.mother);
  line(c, e.x + g.cw - 5, yw + 5, e.x + g.cw - 3, yw + 3, P.mother);
}

// ── 2003 · November · Restorify's sunrise, and his streak ───────────────────
function page2003(c: Ctx): void {
  const P = CAL_2003;
  px(c, 0, 0, P.paper, PAGE_W, PAGE_H);
  gradient(c, 0, 46, [P.skyTop, P.skyMid, P.skyLow, P.skyHorizon]);
  // the sun coming up behind the hill, its rays dotted out
  for (let a = 0; a < 9; a++) {
    const ang = Math.PI * (0.06 + a * 0.11);
    for (let r = 15; r < 27; r += 2) px(c, Math.round(40 - Math.cos(ang) * r), Math.round(47 - Math.sin(ang) * r), P.ray);
  }
  disc(c, 40, 47, 11, P.sun, 46);
  disc(c, 40, 47, 7, P.sunCore, 46);
  // the wordmark and its promise
  const brand = 'RESTORIFY';
  const bx = Math.round((PAGE_W - textW(brand, 2)) / 2);
  text(c, brand, bx + 1, 5, P.brandShadow, 2);
  text(c, brand, bx, 4, P.brand, 2);
  const tag = 'ONE DAY AT A TIME';
  text(c, tag, Math.round((PAGE_W - textW(tag)) / 2), 17, P.tagline);
  // two hills, the far one lighter, each with a shaded flank
  for (let x = 0; x < PAGE_W; x++) {
    const yb = Math.round(44 - 5 * Math.sin((x + 8) / 13));
    px(c, x, yb, x > 44 ? P.hillBackShade : P.hillBack, 1, 72 - yb);
    const yf = Math.round(55 - 6 * Math.sin((x - 30) / 16));
    px(c, x, yf, x < 22 ? P.hillFrontShade : P.hillFront, 1, 72 - yf);
  }
  for (const [tx, ty] of [[8, 62], [27, 66], [49, 64], [70, 67], [15, 69]]) px(c, tx, ty, P.hillFrontShade, 1, 2);
  // the lamb — the software's own mascot, grazing on the promise
  sprite(c, 55, 46, [
    '..wwwww.....',
    '.wwwwwwwss..',
    'wwwwwwwwwff.',
    'wwwwwwwwwfff',
    '.wwwwwwwwff.',
    '..s.s..s.s..',
    '..f.f..f.f..'
  ], { w: P.wool, s: P.woolShade, f: P.lambFace });
  binding(c, P);
  const g = monthGrid(c, { name: 'NOVEMBER', year: 2003, first: 6, days: 30, mondayFirst: false }, P, [0, 6]);
  // ⚑ HIS MARKER — every day up to today crossed off, thick and a little uneven. The
  //   streak the software counts, kept on paper by the man it counts.
  for (let d = 1; d <= 18; d++) {
    const { x, y } = g.at(d);
    const j = d % 3 === 0 ? 1 : 0;
    line(c, x + 2, y + 1 + j, x + g.cw - 3, y + g.ch - 2, P.marker, 2);
    line(c, x + g.cw - 3 - j, y + 1, x + 2, y + g.ch - 2, P.marker, 2);
  }
}

// ── 2016 · December · the platform’s planner, the 6th, the quota ───────────
function page2016(c: Ctx): void {
  const P = CAL_2016;
  px(c, 0, 0, P.paper, PAGE_W, PAGE_H);
  px(c, 0, 0, P.band, PAGE_W, 11);
  const brand = 'GRACEPLATFORM';
  text(c, brand, Math.round((PAGE_W - textW(brand)) / 2), 3, P.bandText);
  px(c, 0, 11, P.bandAccent, PAGE_W, 1);
  // the stock photograph: winter pines, printed with a white border
  const X0 = 4, Y0 = 15, X1 = 75, Y1 = 68;
  px(c, X0 + 1, Y0 + 1, P.frameShadow, X1 - X0 + 1, Y1 - Y0 + 1);
  px(c, X0 - 1, Y0 - 1, P.frame, X1 - X0 + 3, Y1 - Y0 + 3);
  for (let y = Y0; y <= Y1; y++) px(c, X0, y, y < Y0 + 14 ? P.skyHigh : P.sky, X1 - X0 + 1, 1);
  for (let x = X0; x <= X1; x++) {
    const ys = Math.round(52 - 4 * Math.sin((x - 10) / 11));
    px(c, x, ys, x > 54 ? P.snowShade : P.snow, 1, Y1 - ys + 1);
  }
  const pine = (cx: number, base: number, h: number): void => {
    for (let k = 0; k < h; k++) {
      const half = Math.floor((k % 6) * 0.7 + k * 0.28);
      px(c, cx - half, base - h + k, k % 6 === 0 ? P.snow : (k % 2 ? P.pine : P.pineDark), half * 2 + 1, 1);
    }
    px(c, cx, base, P.trunk, 1, 3);
  };
  pine(20, 52, 24); pine(33, 55, 18); pine(60, 50, 28); pine(71, 54, 14);
  for (const [fx, fy] of [[9, 20], [26, 24], [44, 19], [52, 30], [14, 36], [38, 33], [67, 22], [47, 42], [8, 45], [29, 44]]) px(c, fx, fy, P.flake);
  binding(c, P);
  const g = monthGrid(c, { name: 'DECEMBER', year: 2016, first: 4, days: 31, mondayFirst: true }, P, [5, 6]);
  // ⚑ HER BIRO — the 6th ringed, not quite closed. The day on her phone's lock screen: ⚑ S209 / B7 (his ruling),
  //   the day Malta's parliament passed its ban, unanimously (6 December 2016), so the fiction sits on the record.
  const { x, y } = g.at(6);
  const ring = ['..######..', '.#......#.', '#........#', '#........#', '#........#', '#........#', '#.......#.', '.#.....#..', '..#####...'];
  sprite(c, x + 1, y + 1, ring, { '#': P.pen });
  // the platform's sticky note, stuck over the month's last days
  const nx = 46, ny = 136;
  px(c, nx + 1, ny + 1, P.noteShade, 32, 14);
  px(c, nx, ny, P.note, 32, 14);
  px(c, nx, ny, P.noteShade, 32, 1);
  text(c, 'SHIFT', nx + 3, ny + 2, P.noteInk);
  text(c, '60', nx + 23, ny + 2, P.pen);
  text(c, 'CORR.', nx + 3, ny + 8, P.noteInk);
}

// ── 2026 · October · the bookshop's party, and her night ────────────────────
function page2026(c: Ctx): void {
  const P = CAL_2026;
  px(c, 0, 0, P.paper, PAGE_W, PAGE_H);
  gradient(c, 0, 61, [P.night, P.evening, P.warm]);
  // the bunting: rainbow and trans colours, sagging across the room
  const flags = [P.flagRed, P.transBlue, P.flagOrange, P.transPink, P.flagYellow, P.transWhite, P.flagGreen, P.transPink, P.flagBlue, P.transBlue, P.flagViolet];
  const sag = (x: number, top: number, depth: number): number => Math.round(top + depth * Math.sin((x / PAGE_W) * Math.PI));
  for (let x = 0; x < PAGE_W; x++) px(c, x, sag(x, 3, 7), P.string);
  flags.forEach((col, i) => {
    const fx = 2 + i * 7, fy = sag(fx + 2, 3, 7) + 1;
    for (let k = 0; k < 5; k++) px(c, fx + Math.floor(k / 2), fy + k, col, 5 - 2 * Math.floor(k / 2), 1);
  });
  // the string of lights below it
  for (let x = 0; x < PAGE_W; x++) px(c, x, sag(x, 16, 6), P.string);
  for (let x = 4; x < PAGE_W; x += 8) { const yb = sag(x, 16, 6) + 1; px(c, x - 1, yb, P.bulbGlow, 3, 3); px(c, x, yb + 1, P.bulb); px(c, x, yb, P.bulb); }
  // the shop's shelf, left: it is a bookshop
  px(c, 1, 36, P.shelf, 11, 26);
  const spines = [P.spineA, P.spineB, P.spineC, P.flagViolet, P.spineB, P.spineA, P.spineC];
  for (let row = 0; row < 3; row++) for (let i = 0; i < 4; i++) {
    const col = spines[(row * 3 + i) % spines.length];
    px(c, 2 + i * 2 + (row % 2), 38 + row * 8, col, 2, 6 - (i % 2));
  }
  // four people dancing — one in a chair — every one of them different
  const body = ['..ttt..', '..ttt..', '..ttt..', '..lll..'];
  const poses: Record<string, string[]> = {
    up: ['s.....s', 's.hhh.s', 's.hss.s', '.t.s.t.', '.ttttt.', ...body, '..l.l..', '..l.l..', '.l...l.', '.l...l.', 'll...ll'],
    out: ['.......', '..hhh..', '..hss..', '..sss..', 'sttttts', ...body, '..l.l..', '..l..l.', '..l..l.', '.l....l', 'll....l'],
    one: ['......s', '..hhh.s', '..hss.s', '..sss.t', 'sttttt.', ...body, '..l.l..', '..l.l..', '.l..l..', '.l..l..', 'll..ll.']
  };
  const person = (x: number, skin: string, hair: string, shirt: string, pose: string): void =>
    sprite(c, x, 46, poses[pose], { h: hair, s: skin, t: shirt, l: P.legs });
  person(16, P.skinA, P.hairB, P.shirtA, 'up');
  person(30, P.skinC, P.hairD, P.shirtC, 'out');
  person(62, P.skinB, P.hairC, P.shirtD, 'one');
  // the one in the chair, arms up with the rest
  sprite(c, 45, 46, [
    's.....s..',
    's.hhh.s..',
    's.hss.s..',
    '.t.s.t...',
    '.ttttt...',
    'c.ttt....',
    'c.ttt....',
    'c.ttt....',
    'c.ttt....',
    'ccccllll.',
    '.c...c.l.',
    'c.....cl.',
    'c..c..cl.',
    'c.....cll',
    '.c...c...',
    '..ccc....'
  ], { s: P.skinD, h: P.hairA, t: P.shirtB, l: P.legs, c: P.chair, w: P.string });
  // the floor, warm
  px(c, 0, 62, P.floorTop, PAGE_W, 1);
  px(c, 0, 63, P.floor, PAGE_W, 9);
  for (let x = 6; x < PAGE_W; x += 16) px(c, x, 64, P.floorTop, 5, 1);
  binding(c, P);
  const g = monthGrid(c, { name: 'OCTOBER', year: 2026, first: 4, days: 31, mondayFirst: true }, P, [5, 6]);
  // ⚑ HER FELT-TIP — Friday the 23rd ringed, and the word under it running into the
  //   weekend: the Commons. The page's one mark, and it is for something she wants.
  const { x, y } = g.at(23);
  const ring = ['..######.', '.#......#', '#........', '#.......#', '#.......#', '.#.....#.', '..#####..'];
  sprite(c, x + 1, y, ring, { '#': P.felt });
  const w = hand(c, 'commons', x + 2, y + 8, P.felt);
  // and a small heart after it
  sprite(c, x + 2 + w + 2, y + 9, ['#.#', '###', '.#.'], { '#': P.felt });
}

export function drawCalendarPage(c: Painter, era: PageEra): void {
  if (era === 'e1') page1997(c);
  else if (era === 'e2') page2003(c);
  else if (era === 'e3') page2016(c);
  else page2026(c);
}

