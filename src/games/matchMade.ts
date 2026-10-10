/**
 * ⚑ S227 — MATCH MADE SIMPLE (2026), Second Thoughts' game on the console on Maya's bed. It REPLACES S189's TIDY
 * there (src/games/tidy.ts stays in the repo, unhooked). Ported from the prototype he approved — "Yes it is very
 * good indeed!" — Pc_Simulation/2026-screen-prototypes/v2_match_made_simple/match_made_simple_v2.html (+ README.md
 * beside it, which is the game in full). All display text: data/dialog/s4_matchmade.json. Colours: MATCHMADE in
 * src/desktop/theme/calendar.ts (the prototype's sixteen, which it lifted from TIDY and L's ERA4.l / lDim); gloss
 * and gradients are row dithers between them, never mixed shades. Type: src/room/font57.ts.
 *
 * THE GAME (unchanged from the prototype). One verb — swap two neighbours, match three — and turn-based: no clock.
 * A match of hers clears the programme's filter coating from ITS COPY of Maya and Junie's picture at the Commons
 * and pops a recommendation card. Its counter-match is a legal swap on the same board that coats a patch back onto
 * the copy, files what she matched under OLD FILE (the misfile), rains two more cards in and puts two tiles of that
 * kind back on the board. The ORIGINAL is immutable (`picture` is one authored function; nothing writes to it). The
 * score is min(99, ⌊100 · (1 − e^(−matches/5))⌋): it can never pass 99%, one patch can never be uncovered and the
 * end card's bar stops short. After 24 matches — or START → STOP HERE at any time — the programme's frame breaks and
 * what remains is the plain cream page with the intact picture. The law of the games: the programme's game cannot
 * be won; the queer side always wins.
 *
 * HIS ANSWERS ON v2 (2026-10-10), applied here: (1) the Commons has NO string lights or lanterns — a starry sky;
 * (2) the counter-move MAY re-coat Maya's and Junie's faces ("it increases the challenge and it is a poetic
 * reference") — kept; (3) their looks as drawn; (4) L's lines kept; (5) the 99% on the end card is a hand-drawn
 * numeral (`ninetyNine`), big bold pixel digits drawn as shapes, not the 5×7 glyphs at 12×.
 *
 * WHAT THE PORT CHANGED, AND WHY:
 * - The prototype's painter (fillStyle + fillRect, with an offset for the collapse and a clip) is `Pen`, a Painter
 *   that offsets, rounds and clips, so font57's `text` goes through it too. Its glossy title type, which drew row
 *   ranges of the glyphs, clips to row bands instead.
 * - Input is the room's: a tap on the glass (src/room/heldDevice.ts hands over screen pixels, already resolved on
 *   release behind the 10 px / 1.2 s threshold) and the GameKeys. The prototype's M key has no key here; its menu
 *   SOUND row is the console's own and quiets this game only. The piece's ONE mute (gameMenuBus.soundMuted)
 *   silences it like every source; muted by either, it shows OFF / MUTED.
 * - The window-blur auto-pause is the room's: the game only ticks while it is in her hand.
 * - frameKey: the idle animation (L's bob, the sparkles) never stops, so at rest the key steps ~10 times a second;
 *   during a swap, a fall, the counter-move, confetti, the end card and the collapse it steps 30 times a second.
 *   The menu and the final page are still, and upload only when they change.
 * - Filing: one line per GAME (his ruling: per game, not per round), when its first run ends.
 */
import type { Painter } from '../room/calendarArt';
import { text as text57, textW } from '../room/font57';
import { MATCHMADE as M } from '../desktop/theme/calendar';
import { gameMenuBus } from '../state/gameMenuBus';
import D from '../../data/dialog/s4_matchmade.json';
import type { DeviceGame, GameKey } from './types';

const W = 960, H = 540;

// the prototype's palette names, onto the theme's object (so the port reads like the prototype it came from)
const C = {
  INK: M.ink, PLUM: M.plum, DIM: M.dim, CREAM: M.cream, WHITE: M.white, SAND: M.sand, WOOD: M.wood, PINK: M.pink,
  TBLUE: M.tblue, BLUE: M.blue, PEN: M.pen, VIOLET: M.violet, GOLD: M.gold, ORANGE: M.orange, MINT: M.mint, GREEN: M.green
} as const;

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE PEN — fillStyle + fillRect only. ox/oy move a layer (the collapse); cl clips (absolute pixels).
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
type Rect4 = [number, number, number, number];
class Pen implements Painter {
  fillStyle: string | CanvasGradient | CanvasPattern = C.INK;
  g: Painter | null = null;
  ox = 0; oy = 0;
  cl: Rect4 | null = null;
  fillRect(x: number, y: number, w: number, h: number): void { R(x, y, w, h, this.fillStyle as string); }
}
const PEN = new Pen();
function R(x: number, y: number, w: number, h: number, c: string): void {
  const g = PEN.g; if (!g) return;
  x = Math.round(x + PEN.ox); y = Math.round(y + PEN.oy); w = Math.round(w); h = Math.round(h);
  const cl = PEN.cl;
  if (cl) {
    const a = Math.max(x, cl[0]), b = Math.max(y, cl[1]), cc = Math.min(x + w, cl[2]), d = Math.min(y + h, cl[3]);
    if (cc <= a || d <= b) return;
    x = a; y = b; w = cc - a; h = d - b;
  }
  if (w <= 0 || h <= 0 || x >= W || y >= H || x + w <= 0 || y + h <= 0) return;
  g.fillStyle = c; g.fillRect(x, y, w, h);
}
/** paint `fn` clipped to a rectangle in layer coordinates (intersected with any clip already set) */
function clipped(x0: number, y0: number, x1: number, y1: number, fn: () => void): void {
  const oc = PEN.cl;
  let n: Rect4 = [x0 + PEN.ox, y0 + PEN.oy, x1 + PEN.ox, y1 + PEN.oy];
  if (oc) n = [Math.max(n[0], oc[0]), Math.max(n[1], oc[1]), Math.min(n[2], oc[2]), Math.min(n[3], oc[3])];
  PEN.cl = n; fn(); PEN.cl = oc;
}

// ── type: font57 through the pen ────────────────────────────────────────────────────────────────────────────────
function text(str: string, x: number, y: number, col: string, s = 1): number { return text57(PEN, str, Math.round(x), Math.round(y), col, s); }
const OUT8: Array<[number, number]> = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1], [1, 2], [0, 2], [2, 2]];
function textO(str: string, x: number, y: number, col: string, ol: string, s = 1): void {
  const o = Math.max(2, Math.round(s * 0.6));
  for (const [dx, dy] of OUT8) text(str, x + dx * o, y + dy * o, ol, s);
  text(str, x, y, col, s);
}
const GLOSS_OUT: Array<[number, number]> = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1], [0, 2], [1, 2], [2, 2], [2, 3], [1, 3]];
/** glossy two-tone title type: white crown, gold body, orange foot, plum outline (the glyph rows by clip bands) */
function textGloss(str: string, x: number, y: number, s: number, oo?: number): void {
  const o = oo || Math.max(2, Math.round(s * 0.5));
  for (const [dx, dy] of GLOSS_OUT) text(str, x + dx * o, y + dy * o, C.PLUM, s);
  const cr = s >= 10 ? 1 : 2, BIG = 1e5;
  clipped(-BIG, y, BIG, y + cr * s, () => text(str, x, y, C.WHITE, s));
  clipped(-BIG, y + cr * s, BIG, y + 5 * s, () => text(str, x, y, C.GOLD, s));
  clipped(-BIG, y + 5 * s, BIG, y + 7 * s, () => text(str, x, y, C.ORANGE, s));
}
const ctextX = (str: string, s: number, x0 = 0, w = W): number => x0 + Math.round((w - textW(str, s)) / 2);
function ctext(str: string, y: number, col: string, s = 1, x0 = 0, w = W): void { text(str, ctextX(str, s, x0, w), y, col, s); }
function ctextO(str: string, y: number, col: string, ol: string, s = 1, x0 = 0, w = W): void { textO(str, ctextX(str, s, x0, w), y, col, ol, s); }

// ── shapes, rasterised to rows — crisp at any size, never an upscaled bitmap ────────────────────────────────────
function disc(cx: number, cy: number, r: number, c: string): void { cx = Math.round(cx); cy = Math.round(cy); const n = Math.floor(r); for (let dy = -n; dy <= n; dy++) { const w = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy))); R(cx - w, cy + dy, 2 * w + 1, 1, c); } }
function ellipse(cx: number, cy: number, rx: number, ry: number, c: string): void { cx = Math.round(cx); cy = Math.round(cy); const n = Math.floor(ry); for (let dy = -n; dy <= n; dy++) { const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry)))); R(cx - w, cy + dy, 2 * w + 1, 1, c); } }
function ring(cx: number, cy: number, r1: number, r0: number, c: string): void { cx = Math.round(cx); cy = Math.round(cy); const n = Math.floor(r1); for (let dy = -n; dy <= n; dy++) { const wo = Math.floor(Math.sqrt(Math.max(0, r1 * r1 - dy * dy))); if (Math.abs(dy) < r0) { const wi = Math.floor(Math.sqrt(r0 * r0 - dy * dy)); R(cx - wo, cy + dy, wo - wi, 1, c); R(cx + wi + 1, cy + dy, wo - wi, 1, c); } else R(cx - wo, cy + dy, 2 * wo + 1, 1, c); } }
function rrect(x: number, y: number, w: number, h: number, r: number, c: string): void { r = Math.max(0, Math.min(r, Math.floor(w / 2), Math.floor(h / 2))); for (let i = 0; i < r; i++) { const d = r - Math.round(Math.sqrt(r * r - (r - i - 0.5) ** 2)); R(x + d, y + i, w - 2 * d, 1, c); R(x + d, y + h - 1 - i, w - 2 * d, 1, c); } R(x, y + r, w, h - 2 * r, c); }
type Pt = [number, number];
function poly(pts: Pt[], c: string): void {
  let y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
    const yc = y + 0.5; let a = Infinity, b = -Infinity;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      if ((p[1] <= yc && q[1] > yc) || (q[1] <= yc && p[1] > yc)) { const x = p[0] + (yc - p[1]) * (q[0] - p[0]) / (q[1] - p[1]); a = Math.min(a, x); b = Math.max(b, x); }
    }
    if (b > a) { const xa = Math.round(a); R(xa, y, Math.round(b) - xa, 1, c); }
  }
}
function line(x0: number, y0: number, x1: number, y1: number, w: number, c: string): void { const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / Math.max(1, w / 2))); for (let i = 0; i <= n; i++) { const t = i / n; R(Math.round(x0 + (x1 - x0) * t - w / 2), Math.round(y0 + (y1 - y0) * t - w / 2), w, w, c); } }
function sparkle(cx: number, cy: number, r: number, c: string): void { const k = Math.max(1, r * 0.28); poly([[cx, cy - r], [cx + k, cy - k], [cx + r, cy], [cx + k, cy + k], [cx, cy + r], [cx - k, cy + k], [cx - r, cy], [cx - k, cy - k]], c); }
/** a vertical gradient as a row dither between palette steps (cell = the dither's row height) */
function vgrad(x: number, y: number, w: number, h: number, cols: string[], cell = 3): void {
  const rows = Math.ceil(h / cell);
  for (let j = 0; j < rows; j++) {
    const f = (j / Math.max(1, rows - 1)) * (cols.length - 1), k = Math.min(cols.length - 2, Math.floor(f)), lv = Math.floor((f - k) * 4);
    const useB = (lv === 1 && j % 4 === 0) || (lv === 2 && j % 2 === 0) || (lv === 3 && j % 4 !== 0) || lv >= 4;
    R(x, y + j * cell, w, Math.min(cell, h - j * cell), useB ? cols[k + 1] : cols[k]);
  }
}
/** gloss: every other row of a band lit in `c` */
function gloss(x: number, y: number, w: number, h: number, c: string, cell = 2): void { for (let j = 0; j < h; j += cell * 2) R(x, y + j, w, Math.min(cell, h - j), c); }
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// ── random (seedable for the preview tool only; play uses Math.random) ────────────────────────────────────────
let rnd: () => number = Math.random;
function seedRng(s: number): void { let a = s >>> 0; rnd = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ri = (n: number): number => Math.floor(rnd() * n);
const pickOf = <X>(a: readonly X[]): X => a[ri(a.length)];
const ease = (t: number): number => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
const easeBack = (t: number): number => { t = Math.max(0, Math.min(1, t)); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE PROGRAMME'S PRODUCTS — the five tile kinds. Icons only. All five are ITS filters, none is hers.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
const KIND: ReadonlyArray<{ base: string; dark: string; name: string }> = [
  { base: C.PINK, dark: C.VIOLET, name: 'petal' },    // PausePetal
  { base: C.BLUE, dark: C.PEN, name: 'drop' },        // Glow serum
  { base: C.ORANGE, dark: C.WOOD, name: 'rewind' },   // GentleNext "before"
  { base: C.GOLD, dark: C.ORANGE, name: 'sparkle' },  // SoftLoop shine
  { base: C.GREEN, dark: C.PEN, name: 'lens' }        // L's own lens
];
/** an icon centred on (cx, cy), `s` = its half-size */
function icon(k: number, cx: number, cy: number, s: number, col: string, accent?: string | null): void {
  const u = s / 16;
  if (k === 0) { for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; disc(cx + Math.cos(a) * 8.5 * u, cy + Math.sin(a) * 8.5 * u, 7 * u, col); } disc(cx, cy, 5 * u, accent || C.GOLD); }
  else if (k === 1) { disc(cx, cy + 4 * u, 10.5 * u, col); poly([[cx, cy - 16 * u], [cx + 9.5 * u, cy + 1 * u], [cx - 9.5 * u, cy + 1 * u]], col); if (accent) ellipse(cx - 4.5 * u, cy + 4 * u, 2.2 * u, 4 * u, accent); }
  else if (k === 2) { poly([[cx - 15 * u, cy], [cx, cy - 12 * u], [cx, cy + 12 * u]], col); poly([[cx, cy], [cx + 15 * u, cy - 12 * u], [cx + 15 * u, cy + 12 * u]], col); }
  else if (k === 3) { sparkle(cx - 2 * u, cy + 1 * u, 15 * u, col); sparkle(cx + 10 * u, cy - 10 * u, 5 * u, col); }
  else { ring(cx, cy, 14 * u, 8.5 * u, col); R(cx - 5 * u, cy - 5 * u, 3 * u, 3 * u, col); R(cx - 2 * u, cy - 7 * u, 3 * u, 2 * u, col); }
}
/** a glossy product tile, 50 × 50 */
function tile(k: number, x: number, y: number, lift = 0): void {
  const d = KIND[k]; y -= lift;
  rrect(x, y + 4, 50, 46, 11, d.dark);
  rrect(x, y, 50, 46, 11, d.base);
  gloss(x + 8, y + 4, 34, 12, C.WHITE, 2);
  R(x + 10, y + 3, 30, 2, C.WHITE);
  icon(k, x + 27, y + 26, 15, d.dark);
  icon(k, x + 25, y + 24, 15, C.WHITE, k === 1 ? C.TBLUE : null);
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
// MAYA AND JUNIE AT THE COMMONS — the original picture. Authored once, in 420 × 240 picture units, drawn at s = 1
// inside the programme's panel and at s = 2 for the ending (re-rasterised at each size, so the large one is sharp,
// not enlarged). Nothing in the game can change this function.
// ⚑ S227, his answer (1): NO string lights or lanterns — a starry sky (more stars, a soft band of the galaxy and a
// few bright ones), where the prototype hung its lights.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
type Star = [number, number, number, boolean];
const lcg = (seed: number): (() => number) => { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };
const STARS: Star[] = (() => { const a: Star[] = []; const r = lcg(7); for (let i = 0; i < 120; i++) a.push([Math.floor(r() * 420), Math.floor(r() * 166), r() < 0.22 ? 2 : 1, r() < 0.35]); return a; })();
/** the galaxy's band, a soft haze of faint dots from low left to high right */
const HAZE: Pt[] = (() => { const a: Pt[] = []; const r = lcg(31); for (let i = 0; i < 170; i++) { const t = r(); a.push([Math.floor(t * 420), Math.floor(158 - t * 122 + (r() - 0.5) * 26 * (1 - Math.abs(t - 0.5)))]); } return a; })();
/** the bright ones: four-pointed, a few gold */
const BRIGHT: Array<[number, number, number, boolean]> = [[34, 66, 5, false], [118, 94, 4, true], [300, 70, 5, false], [394, 126, 4, false], [22, 138, 3, true], [150, 62, 3, false], [336, 98, 4, true], [76, 118, 3, false], [404, 84, 3, false]];
const ORIGINAL = Object.freeze({ who: 'Maya and Junie', where: 'the Commons' });
function picture(x0: number, y0: number, s: number): void {
  const pr = (x: number, y: number, w: number, h: number, c: string): void => R(x0 + x * s, y0 + y * s, w * s, h * s, c);
  const pd = (x: number, y: number, r: number, c: string): void => disc(x0 + x * s, y0 + y * s, r * s, c);
  const pe = (x: number, y: number, rx: number, ry: number, c: string): void => ellipse(x0 + x * s, y0 + y * s, rx * s, ry * s, c);
  const pp = (pts: Pt[], c: string): void => poly(pts.map(([x, y]) => [x0 + x * s, y0 + y * s] as Pt), c);
  const pl = (ax: number, ay: number, bx: number, by: number, w: number, c: string): void => line(x0 + ax * s, y0 + ay * s, x0 + bx * s, y0 + by * s, w * s, c);
  clipped(x0, y0, x0 + 420 * s, y0 + 240 * s, () => {
    // night sky over a dusk horizon
    vgrad(x0, y0, 420 * s, 172 * s, [C.INK, C.INK, C.PLUM, C.VIOLET, C.PINK], 2 * s);
    for (const [x, y] of HAZE) pr(x, y, 1, 1, C.DIM);
    for (const [x, y, z, gold] of STARS) { if (z === 2) { pr(x - 2, y, 5, 1, gold ? C.GOLD : C.WHITE); pr(x, y - 2, 1, 5, gold ? C.GOLD : C.WHITE); } else pr(x, y, 1, 1, gold ? C.GOLD : C.CREAM); }
    pd(368, 46, 17, C.CREAM); pd(362, 41, 4, C.SAND); pd(374, 54, 3, C.SAND); pd(371, 38, 2, C.SAND);
    // the sign
    pr(96, 8, 228, 44, C.VIOLET); pr(100, 12, 220, 36, C.PLUM); pr(100, 44, 220, 2, C.GOLD);
    text(D.sign, x0 + Math.round(210 * s - textW(D.sign, 3 * s) / 2), y0 + 19 * s, C.CREAM, 3 * s);
    // the bright stars (where the prototype hung its string lights and lanterns)
    for (const [x, y, r, gold] of BRIGHT) { sparkle(x0 + x * s, y0 + y * s, r * s, gold ? C.GOLD : C.CREAM); pr(x, y, 1, 1, C.WHITE); }
    // the floor of the hall: a glowing grid
    pr(0, 172, 420, 68, C.PEN);
    for (const y of [176, 186, 200, 220]) pr(0, y, 420, 2, C.BLUE);
    for (let k = -5; k <= 5; k++) pl(210 + k * 22, 172, 210 + k * 70, 240, 2, C.BLUE);
    pe(212, 226, 74, 7, C.INK);
    // JUNIE (right): curls, a wave
    {
      const cx = 248;
      pr(cx - 15, 177, 13, 44, C.BLUE); pr(cx + 2, 177, 13, 44, C.BLUE); pr(cx - 1, 181, 2, 38, C.PEN);
      pp([[cx - 18, 219], [cx - 1, 219], [cx - 1, 227], [cx - 20, 227]], C.WHITE); pp([[cx + 2, 219], [cx + 19, 219], [cx + 21, 227], [cx + 2, 227]], C.WHITE);
      pr(cx - 27, 140, 8, 12, C.ORANGE); pr(cx - 27, 151, 7, 24, C.WOOD); pd(cx - 23.5, 177, 4.5, C.WOOD);
      pl(cx + 21, 146, cx + 34, 110, 7, C.WOOD); pd(cx + 35, 104, 6.5, C.WOOD); pr(cx + 30, 94, 3, 7, C.WOOD); pr(cx + 35, 93, 3, 7, C.WOOD);
      pr(cx + 18, 139, 9, 11, C.ORANGE);
      pp([[cx - 20, 144], [cx - 14, 137], [cx + 14, 137], [cx + 20, 144], [cx + 18, 179], [cx - 18, 179]], C.ORANGE);
      pp([[cx - 6, 137], [cx + 6, 137], [cx, 146]], C.CREAM);
      pr(cx - 4, 131, 8, 7, C.WOOD);
      pe(cx, 118, 15, 16, C.WOOD);
      for (const [x, y, r] of [[-12, 104, 8], [-2, 100, 9], [10, 101, 9], [17, 110, 6], [-17, 112, 6], [-6, 105, 6], [5, 104, 6]]) pd(cx + x, y, r, C.INK);
      pr(cx - 8, 116, 3, 4, C.INK); pr(cx + 5, 116, 3, 4, C.INK); pr(cx - 7, 116, 1, 1, C.WHITE); pr(cx + 6, 116, 1, 1, C.WHITE);
      pr(cx - 4, 126, 8, 2, C.INK); pr(cx - 6, 124, 2, 2, C.INK); pr(cx + 4, 124, 2, 2, C.INK);
      pd(cx + 15, 124, 2, C.GOLD);
    }
    // MAYA (left): long hair, the flag tee, her arm across Junie's shoulders
    {
      const cx = 176;
      pr(cx - 22, 96, 44, 66, C.VIOLET); pr(cx - 18, 110, 3, 48, C.PLUM); pr(cx + 15, 110, 3, 46, C.PLUM);
      pr(cx - 15, 177, 13, 42, C.INK); pr(cx + 2, 177, 13, 42, C.INK);
      pp([[cx - 18, 217], [cx - 1, 217], [cx - 1, 225], [cx - 20, 225]], C.WHITE); pp([[cx + 2, 217], [cx + 19, 217], [cx + 21, 225], [cx + 2, 225]], C.WHITE);
      pr(cx - 28, 135, 8, 12, C.TBLUE); pr(cx - 28, 147, 7, 28, C.SAND); pd(cx - 24.5, 177, 4.5, C.SAND);
      const stripes = [C.TBLUE, C.PINK, C.WHITE, C.PINK, C.TBLUE];
      for (let i = 0; i < 5; i++) pr(cx - 20, 133 + i * 9, 40, 9, stripes[i]);
      pp([[cx - 20, 133], [cx - 13, 130], [cx + 13, 130], [cx + 20, 133]], C.TBLUE);
      pr(cx - 4, 125, 8, 7, C.SAND);
      pe(cx, 112, 15, 17, C.SAND);
      pe(cx, 99, 19, 11, C.VIOLET);
      pp([[cx - 17, 100], [cx + 13, 95], [cx + 17, 104], [cx - 2, 107], [cx - 16, 115]], C.VIOLET);
      pr(cx - 8, 111, 3, 4, C.INK); pr(cx + 5, 111, 3, 4, C.INK); pr(cx - 7, 111, 1, 1, C.WHITE); pr(cx + 6, 111, 1, 1, C.WHITE);
      pd(cx - 10, 119, 2.2, C.PINK); pd(cx + 10, 119, 2.2, C.PINK);
      pr(cx - 4, 122, 8, 2, C.PLUM); pr(cx - 6, 120, 2, 2, C.PLUM); pr(cx + 4, 120, 2, 2, C.PLUM);
      pr(cx + 19, 135, 9, 11, C.TBLUE); pr(cx + 25, 139, 30, 7, C.SAND); pd(cx + 56, 142, 5, C.SAND);
    }
  });
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
// L — the programme's mascot. Drawn from discs, so it is sharp at every size; `broken` = its frame gone.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
function mascot(cx: number, cy: number, r: number, t: number, broken = false, bob = true): void {
  const ph = bob ? Math.abs(Math.sin(t * 4.2)) : 0;
  const lift = Math.round(ph * r * 0.35), sq = bob ? Math.max(0, 0.25 - ph) * 0.5 : 0;
  cy -= lift;
  const rx = r * (1 + sq), ry = r * (1 - sq);
  ellipse(cx, cy + r * 1.05 + lift, r * 0.8, r * 0.14, C.PLUM);
  if (!broken) { const wv = Math.round(Math.sin(t * 8) * r * 0.15); disc(cx - rx * 1.02, cy + r * 0.1 + wv, r * 0.24, C.GREEN); disc(cx + rx * 1.02, cy + r * 0.1 - wv, r * 0.24, C.GREEN); }
  else { disc(cx - rx * 0.9, cy + r * 0.6, r * 0.22, C.GREEN); disc(cx + rx * 0.9, cy + r * 0.6, r * 0.22, C.GREEN); }
  ellipse(cx, cy, rx, ry, C.GREEN);
  ellipse(cx, cy - r * 0.04, rx * 0.92, ry * 0.9, C.MINT);
  gloss(cx - rx * 0.55, cy - ry * 0.75, rx * 0.6, ry * 0.3, C.WHITE, Math.max(1, Math.round(r / 14)));
  const ex = r * 0.36, ey = cy - r * 0.08;
  if (!broken) {
    ellipse(cx - ex, ey, r * 0.13, r * 0.2, C.INK); ellipse(cx + ex, ey, r * 0.13, r * 0.2, C.INK);
    disc(cx - ex - r * 0.04, ey - r * 0.08, r * 0.05, C.WHITE); disc(cx + ex - r * 0.04, ey - r * 0.08, r * 0.05, C.WHITE);
    ellipse(cx - r * 0.62, cy + r * 0.2, r * 0.13, r * 0.08, C.PINK); ellipse(cx + r * 0.62, cy + r * 0.2, r * 0.13, r * 0.08, C.PINK);
    const n = 7, mw = r * 0.34, th = Math.max(1, Math.round(r * 0.07));
    for (let i = -n; i <= n; i++) { const fx = i / n; R(cx + fx * mw - th / 2, cy + r * 0.24 + (1 - fx * fx) * r * 0.16, th, th, C.INK); }
    const sb = Math.round(Math.sin(t * 3) * r * 0.08);
    sparkle(cx + r * 0.85, cy - r * 1.05 + sb, r * 0.32, C.GOLD); sparkle(cx + r * 0.85, cy - r * 1.05 + sb, r * 0.12, C.WHITE);
  } else {
    const th = Math.max(1, Math.round(r * 0.07));
    R(cx - ex - r * 0.13, ey, r * 0.26, th, C.INK); R(cx + ex - r * 0.13, ey, r * 0.26, th, C.INK);
    R(cx - r * 0.2, cy + r * 0.32, r * 0.4, th, C.INK);
  }
}
function flame(x: number, y: number, size: number, t: number): void {
  const u = size / 20, tip = Math.round(((Math.floor(t * 2.5) % 2) ? 2 : -2) * u);
  poly([[x + 10 * u + tip, y], [x + 18 * u, y + 13 * u], [x + 19 * u, y + 21 * u], [x + 10 * u, y + 28 * u], [x + 1 * u, y + 21 * u], [x + 2 * u, y + 12 * u], [x + 6 * u, y + 15 * u]], C.ORANGE);
  poly([[x + 10 * u - tip / 2, y + 9 * u], [x + 15 * u, y + 17 * u], [x + 15 * u, y + 22 * u], [x + 10 * u, y + 26 * u], [x + 5 * u, y + 22 * u], [x + 6 * u, y + 16 * u]], C.GOLD);
  ellipse(x + 10 * u, y + 22 * u, 2.5 * u, 3.5 * u, C.WHITE);
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
// ⚑ S227, his answer (5) — THE 99%, HAND-DRAWN: two chunky nines and a percent sign built from rings, rounded
// bars and one slanted slab, in the title type's gloss (plum outline and drop, white crown, gold body, orange foot).
// Each glyph is authored in a 64 × 96 box and drawn at `u` of that size.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
const NUM_W = 64, NUM_H = 96, NUM_GAP = 12;
function nineShape(x: number, y: number, u: number, c: string): void {
  ring(x + 32 * u, y + 30 * u, 30 * u, 11 * u, c);                 // the bowl
  R(x + 41 * u, y + 30 * u, 21 * u, 48 * u, c);                    // the stem down the right
  rrect(x + 4 * u, y + 72 * u, 58 * u, 24 * u, Math.round(11 * u), c);   // the foot, turning left
}
function pctShape(x: number, y: number, u: number, c: string): void {
  ring(x + 16 * u, y + 17 * u, 15 * u, 6 * u, c);
  ring(x + 48 * u, y + 79 * u, 15 * u, 6 * u, c);
  poly([[x + 44 * u, y], [x + 64 * u, y], [x + 20 * u, y + 96 * u], [x, y + 96 * u]], c);
}
/** the numeral's width at `u` */
const ninetyNineW = (u: number): number => Math.round((NUM_W * 3 + NUM_GAP * 2) * u);
function ninetyNine(x: number, y: number, u: number): void {
  const step = (NUM_W + NUM_GAP) * u;
  const all = (c: string, dx = 0, dy = 0): void => { nineShape(x + dx, y + dy, u, c); nineShape(x + step + dx, y + dy, u, c); pctShape(x + step * 2 + dx, y + dy, u, c); };
  const o = Math.max(3, Math.round(4 * u));
  for (const [dx, dy] of GLOSS_OUT) all(C.PLUM, dx * o, dy * o);
  const h = NUM_H * u, BIG = 1e5;
  all(C.GOLD);
  clipped(-BIG, y - 1, BIG, y + Math.round(h * 0.2), () => all(C.WHITE));
  clipped(-BIG, y + Math.round(h * 0.8), BIG, y + h + 1, () => all(C.ORANGE));
  // a glint on each bowl
  for (const k of [0, 1]) { gloss(x + step * k + 12 * u, y + 12 * u, 10 * u, 14 * u, C.WHITE, Math.max(1, Math.round(2 * u))); }
  sparkle(x + ninetyNineW(u) + 22 * u, y + 4 * u, 12 * u, C.WHITE); sparkle(x + ninetyNineW(u) + 22 * u, y + 4 * u, 5 * u, C.GOLD);
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
// SOUND — gentle live Web Audio under the piece's ONE mute. L must sound good: its counter-turn is a soft chime.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
/** the console's own SOUND row (memory only; wiped with the page): this game's sounds and nothing else */
let consoleQuiet = false;
interface ToneOpt { at?: number; v?: number; a?: number; type?: OscillatorType; to?: number }
const SND = (() => {
  let ac: AudioContext | null = null, master: GainNode | null = null, paused = false;
  const LEVEL = 0.5;
  const muted = (): boolean => gameMenuBus.soundMuted?.() === true || consoleQuiet;
  const level = (): number => (muted() || paused ? 0 : LEVEL);
  /** only ever called from a press (a gesture), so the context may start */
  function wake(): void {
    if (!ac) {
      try {
        const Ctor: typeof AudioContext | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        ac = new Ctor(); master = ac.createGain(); master.gain.value = level();
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4200; master.connect(lp); lp.connect(ac.destination);
      } catch { ac = null; return; }
    }
    if (ac.state === 'suspended') void ac.resume().catch(() => { /* needs a gesture; the next press tries again */ });
  }
  /** a mute that arrives mid-tone silences the tails too */
  function sync(): void { if (ac && master) master.gain.setTargetAtTime(level(), ac.currentTime, 0.03); }
  function tone(f: number, d: number, o: ToneOpt = {}): void {
    if (muted() || paused) { sync(); return; }
    if (!ac || !master || ac.state !== 'running') return;
    sync();
    const t0 = ac.currentTime + (o.at ?? 0), osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.type ?? 'sine'; osc.frequency.setValueAtTime(f, t0); if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + d);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(o.v ?? 0.06, t0 + (o.a ?? 0.012)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    osc.connect(g); g.connect(master); osc.start(t0); osc.stop(t0 + d + 0.05);
  }
  const st2 = (n: number): number => Math.pow(2, n / 12);
  return {
    wake, muted, sync,
    pause(p: boolean): void { paused = p; sync(); },
    select(): void { tone(880, 0.07, { v: 0.035 }); },
    swap(): void { tone(523, 0.1, { type: 'triangle', v: 0.04, to: 698 }); },
    bad(): void { tone(330, 0.2, { v: 0.05, to: 247 }); },
    match(n: number): void { const b = 523 * st2(n * 2); [0, 4, 7, 12].forEach((s, i) => tone(b * st2(s), 0.2, { at: i * 0.055, type: 'triangle', v: 0.055 })); tone(b * 4, 0.16, { at: 0.24, v: 0.022 }); tone(b * 5.04, 0.14, { at: 0.3, v: 0.016 }); },
    counter(): void { [784, 659, 523].forEach((f, i) => tone(f, 0.38, { at: i * 0.1, v: 0.045 })); },
    counter2(): void { tone(587, 0.25, { v: 0.035 }); },
    coat(): void { tone(262, 0.3, { v: 0.04, to: 196 }); },
    card(): void { tone(1175, 0.12, { v: 0.022 }); tone(1568, 0.12, { at: 0.06, v: 0.018 }); },
    start(): void { [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.18, { at: i * 0.07, type: 'triangle', v: 0.05 })); },
    end(): void { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.4, { at: i * 0.1, type: 'triangle', v: 0.05 })); },
    tick(): void { tone(1760, 0.04, { v: 0.012 }); },
    collapse(): void { tone(784, 1.8, { type: 'triangle', v: 0.05, to: 98, at: 0.3 }); tone(523, 1.6, { v: 0.035, to: 65, at: 0.45 }); },
    final(): void { [262, 330, 392, 494].forEach((f, i) => tone(f, 3.6, { at: 0.2 + i * 0.28, v: 0.028, a: 0.7 })); }
  };
})();

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE GAME — one verb (swap, match three); turn-based; no clock.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
const COLS = 8, ROWS = 7, NT = COLS * ROWS, TS = 54, BX = 21, BY = 68, KINDS = 5, PASS = 24;
const PX0 = 501, PY0 = 104, PCOLS = 7, PROWS = 4, NP = PCOLS * PROWS, PS = 60;
const SWAP_T = 0.18, POP_T = 0.3, FALL_T = 0.32, THINK_T = 1.05, ARM = 2.5;
/** the order the coating comes off its copy: both friends first; the far corner is never reached */
const ORDER: number[] = (() => { const a: Array<[number, number]> = []; for (let i = 0; i < NP; i++) { const cx = (i % PCOLS) * PS + 30, cy = Math.floor(i / PCOLS) * PS + 30; a.push([i, (cx - 210) ** 2 + 1.4 * (cy - 120) ** 2]); } a.sort((p, q) => p[1] - q[1] || p[0] - q[0]); return a.map((p) => p[0]); })();
const RANK: number[] = (() => { const r: number[] = []; ORDER.forEach((p, k) => (r[p] = k)); return r; })();
const MAXSHOWN = NP - 1;
void PROWS;

type Board = number[];
function matches(b: Board): number[] {
  const s = new Set<number>();
  for (let r = 0; r < ROWS; r++) { let run = 1; for (let c = 1; c <= COLS; c++) { if (c < COLS && b[r * COLS + c] === b[r * COLS + c - 1]) run++; else { if (run >= 3) for (let k = c - run; k < c; k++) s.add(r * COLS + k); run = 1; } } }
  for (let c = 0; c < COLS; c++) { let run = 1; for (let r = 1; r <= ROWS; r++) { if (r < ROWS && b[r * COLS + c] === b[(r - 1) * COLS + c]) run++; else { if (run >= 3) for (let k = r - run; k < r; k++) s.add(k * COLS + c); run = 1; } } }
  return [...s];
}
const swapped = (b: Board, i: number, j: number): Board => { const q = b.slice(); const t = q[i]; q[i] = q[j]; q[j] = t; return q; };
function allMoves(b: Board): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < NT; i++) {
    if (i % COLS < COLS - 1 && b[i] !== b[i + 1] && matches(swapped(b, i, i + 1)).length) out.push([i, i + 1]);
    if (i + COLS < NT && b[i] !== b[i + COLS] && matches(swapped(b, i, i + COLS)).length) out.push([i, i + COLS]);
  }
  return out;
}
const possible = (b: Board): [number, number] | null => { const m = allMoves(b); return m.length ? m[0] : null; };
const adj = (i: number, j: number): boolean => Math.abs((i % COLS) - (j % COLS)) + Math.abs(Math.floor(i / COLS) - Math.floor(j / COLS)) === 1;
function fresh(): Board {
  let b: Board = [];
  for (let k = 0; k < 20000; k++) {
    b = [];
    for (let i = 0; i < NT; i++) {
      const c = i % COLS, opts: number[] = [];
      for (let v = 0; v < KINDS; v++) { if (c >= 2 && b[i - 1] === v && b[i - 2] === v) continue; if (i >= 2 * COLS && b[i - COLS] === v && b[i - 2 * COLS] === v) continue; opts.push(v); }
      b.push(opts[ri(opts.length)]);
    }
    if (!matches(b).length && allMoves(b).length >= 3) return b;
  }
  return b;
}
const tpos = (i: number): { x: number; y: number } => ({ x: BX + (i % COLS) * TS + 2, y: BY + Math.floor(i / COLS) * TS + 2 });
const cardX = (k: number): number => 486 + k * 114, CARD_Y = 392;

type State = 'title' | 'play' | 'end' | 'collapse' | 'final' | 'menu';
type Phase = 'idle' | 'think' | 'swap' | 'back' | 'pop' | 'fall';
interface Part { x: number; y: number; vx: number; vy: number; c: string; life: number; w: number; h: number }
interface Burst { s: string; x: number; y: number; t: number }
interface Blob { x0: number; y0: number; x1: number; y1: number; t: number; dur: number; done?: boolean }
interface Card { k: number; x: number; y: number; vy: number; t: number; landed?: boolean }
interface Layer { draw: () => void; d: number; vx: number; g: number }
interface Probe {
  readonly s: { state: State; st: number; earned: number; score: number; shown: number; actor: string; phase: Phase; lOn: boolean; dismissals: number; recoats: number; counterTurns: number; cards: number; filed: number; history: number; canPlay: boolean; original: { who: string; where: string } };
  seed(n: number): void;
  move(): [number, number] | null;
  tpos(i: number): { x: number; y: number };
}

function makeGame(): { tick(dt: number): void; draw(): void; key(k: GameKey): void; tap(x: number, y: number): void; frameKey(): string; takeFiling(): string | null; probe: Probe } {
  let state: State = 'title', st = 0, age = 0, titleT = 0;
  let board: Board = [], cursor = 27, pick = -1, phase: Phase = 'idle', pt = 0, swp: { i: number; j: number; valid: boolean } | null = null, pop: number[] = [], fallFrom: number[] = [], cascade = 0, actor: 'player' | 'system' = 'player';
  let idle = 0, hint: [number, number] | null = null, earned = 0, score = 0, shownScore = 0, shown = 0;
  let patchAnim: Record<number, { kind: 'in' | 'out'; t: number }> = {}, filed: Array<{ k: number; t: number }> = [], cards: Card[] = [];
  let parts: Part[] = [], bursts: Burst[] = [], floats: Burst[] = [], blobs: Blob[] = [], glints: Array<{ i: number; t: number }> = [];
  let lOn = true, lLine = '', dismissals = 0, lastMatched = 0, lPair: [number, number] | null = null;
  let history: Array<{ matched: string; filedAs: string; recoated: number; sent: number }> = [];
  let menuSel = 0, ret: State = 'play', retSt = 0, layers: Layer[] = [], filingOut: string | null = null, filedOnce = false, firstTurn = true, endPending = false, endWait = 0;
  let recoats = 0, keyMode = false, counterTurns = 0, praiseI = 0, counterI = 0, tickAcc = 0;

  const calcScore = (): number => Math.min(99, Math.floor(100 * (1 - Math.exp(-earned / 5))));
  const say = (s: string): void => { lLine = s; };
  function reset(): void {
    board = fresh(); cursor = 3 * COLS + 3; pick = -1; phase = 'idle'; pt = 0; swp = null; pop = []; fallFrom = []; cascade = 0; actor = 'player';
    idle = 0; hint = null; earned = 0; score = 0; shownScore = 0; shown = 0; patchAnim = {}; filed = []; cards = [];
    parts = []; bursts = []; floats = []; blobs = []; glints = []; lOn = true; lLine = ''; lastMatched = 0; lPair = null; history = [];
    firstTurn = true; endPending = false; endWait = 0; recoats = 0; counterTurns = 0; praiseI = 0; counterI = 0; layers = [];
    // the feed arrives already full: two recommendations waiting
    cards = [{ k: 0, x: cardX(0), y: CARD_Y, vy: 0, t: 9 }, { k: 2, x: cardX(1), y: CARD_Y, vy: 0, t: 9 }];
  }
  const wipeRecord = (): void => { history = []; filed = []; cards = []; };
  const change = (s: State): void => { state = s; st = 0; };
  function begin(): void { reset(); change('play'); say(D.lHello); SND.start(); }

  const CONF = [C.GOLD, C.PINK, C.TBLUE, C.MINT, C.WHITE, C.VIOLET, C.ORANGE];
  function confetti(x: number, y: number, n: number, spread = 260, cols: readonly string[] = CONF): void {
    for (let i = 0; i < n; i++) parts.push({ x, y, vx: (rnd() - 0.5) * spread * 1.6, vy: -rnd() * spread - 40, c: pickOf(cols), life: 1.2 + rnd() * 1.2, w: 4 + ri(5), h: 4 + ri(8) });
    if (parts.length > 520) parts.splice(0, parts.length - 520);
  }
  const RAIN = [C.GOLD, C.PINK, C.TBLUE, C.WHITE, C.VIOLET, C.MINT];
  function rain(n: number): void { for (let i = 0; i < n; i++) parts.push({ x: rnd() * W, y: -10 - rnd() * 60, vx: (rnd() - 0.5) * 60, vy: 40 + rnd() * 80, c: pickOf(RAIN), life: 3, w: 4 + ri(5), h: 5 + ri(8) }); if (parts.length > 520) parts.splice(0, parts.length - 520); }
  function uncover(n: number): void { for (let k = 0; k < n && shown < MAXSHOWN; k++) { patchAnim[ORDER[shown]] = { kind: 'out', t: 0 }; shown++; } }
  /** his answer (2): the most recently uncovered patch is coated again — that may be over a face, as approved */
  function recoat(fx: number, fy: number): void {
    if (shown <= 0) return;
    shown--; recoats++;
    const idx = ORDER[shown];
    patchAnim[idx] = { kind: 'in', t: -0.62 };
    blobs.push({ x0: fx, y0: fy, x1: PX0 + (idx % PCOLS) * PS + 30, y1: PY0 + Math.floor(idx / PCOLS) * PS + 30, t: 0, dur: 0.62 });
  }
  function sendCards(n: number): void {
    for (let k = 0; k < n; k++) cards.push({ k: ri(KINDS), x: cardX(Math.min(3, cards.length)), y: -60 - k * 70, vy: 0, t: 0 });
    while (cards.length > 4) { const c = cards.shift()!; confetti(c.x + 52, c.y + 25, 8, 120); }
  }
  function removeCard(): void { if (!cards.length) return; const c = cards.shift()!; confetti(c.x + 52, c.y + 25, 22, 200); }

  function attempt(i: number, j: number): void {
    const valid = matches(swapped(board, i, j)).length > 0;
    swp = { i, j, valid }; phase = 'swap'; pt = 0; pick = -1; idle = 0; hint = null; SND.swap();
  }
  function centreOf(list: number[]): { x: number; y: number } { let x = 0, y = 0; for (const i of list) { const p = tpos(i); x += p.x + 25; y += p.y + 25; } return { x: x / list.length, y: y / list.length }; }
  function cleared(first: boolean): void {
    const ctr = centreOf(pop);
    if (first) cascade = 0; else cascade++;
    if (actor === 'player') {
      for (const i of pop) { const p = tpos(i); confetti(p.x + 25, p.y + 25, 7, 240); }
      if (first) {
        lastMatched = board[pop[0]]; earned++; const before = score; score = calcScore();
        uncover(firstTurn ? 6 : 2); firstTurn = false; removeCard();
        if (score > before) floats.push({ s: D.plus.replace('{n}', String(score - before)), x: 732, y: 14, t: 0 });
        bursts.push({ s: D.praise[praiseI++ % D.praise.length], x: BX + 216, y: ctr.y - 40, t: 0 });
        rain(70); say(D.lPraise[(earned - 1) % D.lPraise.length]);
      } else {
        uncover(1); bursts.push({ s: D.combo.replace('{n}', String(cascade + 1)), x: BX + 216, y: ctr.y - 30, t: 0 }); rain(30);
      }
      SND.match(cascade);
    } else {
      for (const i of pop) { const p = tpos(i); confetti(p.x + 25, p.y + 25, 3, 140, [C.MINT, C.GREEN, C.WHITE]); }
      if (first) {
        counterTurns++;
        recoat(ctr.x, ctr.y);
        filed.push({ k: lastMatched, t: 0 }); if (filed.length > 6) filed.shift();
        sendCards(2);
        history.push({ matched: KIND[lastMatched].name, filedAs: 'old file', recoated: 1, sent: 2 });
        say(D.lCounter[counterI++ % D.lCounter.length]);
        SND.counter();
      } else SND.counter2();
    }
    phase = 'pop'; pt = 0;
  }
  function gravity(): void {
    const dead = new Set(pop); fallFrom = new Array(NT);
    for (let c = 0; c < COLS; c++) {
      const kept: Array<{ v: number; r: number }> = [];
      for (let r = ROWS - 1; r >= 0; r--) { const i = r * COLS + c; if (!dead.has(i)) kept.push({ v: board[i], r }); }
      for (let r = ROWS - 1; r >= 0; r--) { const i = r * COLS + c, k = ROWS - 1 - r; if (k < kept.length) { board[i] = kept[k].v; fallFrom[i] = kept[k].r; } else { board[i] = ri(KINDS); fallFrom[i] = -(k - kept.length + 1); } }
    }
    pop = [];
  }
  function repopulate(): void {
    const idx = [...Array(NT).keys()];
    for (let i = idx.length - 1; i > 0; i--) { const j = ri(i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    let placed = 0;
    for (const i of idx) { if (placed >= 2) break; if (board[i] === lastMatched) continue; const q = board.slice(); q[i] = lastMatched; if (!matches(q).length && allMoves(q).length) { board = q; placed++; glints.push({ i, t: 0 }); } }
  }
  function settled(): void {
    if (!allMoves(board).length) { board = fresh(); say(D.lReshuffle); }
    if (actor === 'player') {
      actor = 'system'; const m = allMoves(board); lPair = m[ri(m.length)]; phase = 'think'; pt = 0; pick = -1; hint = null;
    } else {
      repopulate(); if (!allMoves(board).length) board = fresh();
      actor = 'player'; phase = 'idle'; idle = 0; lPair = null;
      if (earned >= PASS) { endPending = true; endWait = 0; }
    }
  }
  function updateFx(dt: number): void {
    for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.vx *= 1 - dt * 0.6; p.life -= dt; }
    parts = parts.filter((p) => p.life > 0 && p.y < H + 20);
    for (const b of bursts) b.t += dt; bursts = bursts.filter((b) => b.t < 1.1);
    for (const f of floats) f.t += dt; floats = floats.filter((f) => f.t < 1.2);
    for (const g of glints) g.t += dt; glints = glints.filter((g) => g.t < 0.8);
    for (const b of blobs) { b.t += dt; if (b.t >= b.dur && !b.done) { b.done = true; SND.coat(); confetti(b.x1, b.y1, 6, 90, [C.PINK, C.WHITE]); } }
    blobs = blobs.filter((b) => b.t < b.dur + 0.05);
    for (const k in patchAnim) { patchAnim[k].t += dt; if (patchAnim[k].t > 0.5) delete patchAnim[k]; }
    for (const f of filed) f.t += dt;
    cards.forEach((c, k) => {
      c.t += dt; const tx = cardX(k); c.x += (tx - c.x) * Math.min(1, dt * 10);
      if (c.y < CARD_Y || c.vy !== 0) { c.vy += 1500 * dt; c.y += c.vy * dt; if (c.y >= CARD_Y) { c.y = CARD_Y; if (c.vy > 260) { c.vy = -c.vy * 0.32; if (!c.landed) { c.landed = true; SND.card(); } } else c.vy = 0; } }
    });
    shownScore += (score - shownScore) * Math.min(1, dt * 5);
  }
  function tickPlay(dt: number): void {
    idle += dt; updateFx(dt);
    if (phase === 'idle') {
      if (endPending) { endWait += dt; if (endWait > 1.0 && !blobs.length) goEnd(); return; }
      if (actor === 'player' && !hint && idle > (firstTurn ? 3 : 6)) { hint = possible(board); if (hint && lOn) say(D.lHint); }
      return;
    }
    pt += dt;
    if (phase === 'think') { if (pt >= THINK_T && lPair) { phase = 'idle'; attempt(lPair[0], lPair[1]); } return; }
    if (phase === 'swap' && swp && pt >= SWAP_T) {
      board = swapped(board, swp.i, swp.j);
      if (!swp.valid) { phase = 'back'; pt = 0; SND.bad(); if (actor === 'player' && lOn) say(D.lOops); }
      else { swp = null; pop = matches(board); cleared(true); }
    } else if (phase === 'back' && swp && pt >= SWAP_T) { board = swapped(board, swp.i, swp.j); swp = null; phase = 'idle'; idle = 0; }
    else if (phase === 'pop' && pt >= POP_T) { gravity(); phase = 'fall'; pt = 0; }
    else if (phase === 'fall' && pt >= FALL_T) { pop = matches(board); if (pop.length) cleared(false); else settled(); }
  }
  function goEnd(): void { change('end'); score = 99; SND.end(); }
  function goCollapse(from: 'end' | 'play'): void {
    change('collapse'); SND.collapse(); layers = [];
    const L = (draw: () => void, d: number, vx: number, g: number): void => { layers.push({ draw, d, vx, g }); };
    for (let b = 0; b < 12; b++) { const y0 = b * 45; L(() => drawBgRows(y0, 45), 0.9 + (11 - b) * 0.08, 0, 1600); }
    if (from === 'end') {
      L(() => drawCardHalf(0), 0.45, -90, 900);
      L(() => drawCardHalf(1), 0.6, 110, 980);
      L(() => mascot(480, cardTop() + 84, 38, age, true, false), 0.3, 0, 1300);
    } else {
      L(drawHeader, 0.35, 0, 1300);
      L(drawFooter, 0.4, 0, 1300);
      L(drawBoardFrame, 0.75, -40, 1100);
      for (let i = 0; i < NT; i++) { const k = board[i]; const p = tpos(i); L(() => tile(k, p.x, p.y), 0.45 + rnd() * 0.5, (rnd() - 0.5) * 260, 1100 + rnd() * 500); }
      L(drawPanel, 0.65, 70, 1000);
    }
  }
  function goFinal(): void {
    change('final'); wipeRecord(); parts = []; bursts = []; blobs = [];
    // one line per GAME (his ruling): the first run that ends files it; a later run files nothing
    if (!filedOnce) { filedOnce = true; filingOut = D.filing; }
    SND.final();
  }
  function stopRun(): void { const from = ret === 'end' ? 'end' : 'play'; if (from === 'end') st = Math.max(st, 4.9); goCollapse(from); }

  // ── input ──────────────────────────────────────────────────────────────────────────────────────────────────
  const canPlay = (): boolean => state === 'play' && actor === 'player' && phase === 'idle' && !endPending;
  function openMenu(): void { ret = state; retSt = st; menuSel = 0; change('menu'); SND.pause(true); }
  function closeMenu(): void { state = ret; st = retSt; SND.pause(false); }
  function menuDo(k: number): void {
    if (k === 0) closeMenu();
    else if (k === 1) { SND.pause(false); reset(); titleT = 0; change('title'); }
    else if (k === 2) { consoleQuiet = !consoleQuiet; SND.sync(); }
    else if (k === 3) { SND.pause(false); state = ret; st = retSt; if (ret === 'play' || ret === 'end') stopRun(); else { reset(); change('title'); } }
  }
  function dismissL(): void { if (lOn) { lOn = false; dismissals++; } }
  function selectTile(i: number): void {
    if (!canPlay()) return;
    if (pick < 0) { pick = i; cursor = i; SND.select(); }
    else if (i === pick) pick = -1;
    else if (adj(pick, i)) { cursor = i; attempt(pick, i); }
    else { pick = i; cursor = i; SND.select(); }
  }
  function key(k: GameKey): void {
    SND.wake();
    if (state === 'menu') {
      if (k === 'up' || k === 'left') menuSel = (menuSel + 3) % 4;
      else if (k === 'down' || k === 'right') menuSel = (menuSel + 1) % 4;
      else if (k === 'a') menuDo(menuSel);
      else if (k === 'b' || k === 'start') closeMenu();
      return;
    }
    if (k === 'start') { if (state === 'play' || state === 'end') openMenu(); else if (state === 'title' && titleT >= ARM) begin(); return; }
    if (state === 'title') { if (k === 'a' && titleT >= ARM) begin(); return; }
    if (state === 'end') { if (k === 'a' && st > 1.5) st = Math.max(st, 4.9); return; }
    if (state === 'final') { if (k === 'a' && st > 2.5) { reset(); titleT = 0; change('title'); } return; }
    if (state !== 'play') return;
    keyMode = true;
    if (k === 'b') { if (pick >= 0) pick = -1; else dismissL(); return; }
    if (!canPlay()) return;
    const dirs: Partial<Record<GameKey, [number, number]>> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
    const dir = dirs[k];
    if (dir) {
      const [dx, dy] = dir, from = pick >= 0 ? pick : cursor;
      const x = (from % COLS) + dx, y = Math.floor(from / COLS) + dy;
      if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return;
      const to = y * COLS + x;
      if (pick >= 0) { cursor = to; attempt(pick, to); } else { cursor = to; idle = Math.min(idle, 1); }
      return;
    }
    if (k === 'a') selectTile(cursor);
  }
  function tap(x: number, y: number): void {
    SND.wake();
    x = Math.floor(x); y = Math.floor(y);
    if (state === 'title') { if (titleT >= ARM) begin(); return; }
    if (state === 'menu') { for (let k = 0; k < 4; k++) if (x >= 300 && x < 660 && y >= 150 + k * 66 && y < 202 + k * 66) { menuSel = k; menuDo(k); return; } return; }
    if (state === 'final') { if (st > 2.5) { reset(); titleT = 0; change('title'); } return; }
    if (x >= 890 && y < 54 && (state === 'play' || state === 'end')) { openMenu(); return; }
    if (state === 'end') { if (st > 1.5) st = Math.max(st, 4.9); return; }
    if (state !== 'play') return;
    keyMode = false;
    if (lOn && y >= 460) { dismissL(); return; }
    const c = Math.floor((x - BX) / TS), r = Math.floor((y - BY) / TS);
    if (c >= 0 && c < COLS && r >= 0 && r < ROWS) selectTile(r * COLS + c);
  }

  // ── drawing ────────────────────────────────────────────────────────────────────────────────────────────────
  const BG = [C.PINK, C.VIOLET, C.BLUE, C.TBLUE, C.MINT];
  /** a slice of the garish wellness gradient, plus its sparkles */
  function drawBgRows(y0: number, h: number): void {
    const cell = 4, rows = H / cell;
    for (let y = y0; y < y0 + h; y += cell) {
      const j = y / cell, f = (j / (rows - 1)) * (BG.length - 1), k = Math.min(BG.length - 2, Math.floor(f)), lv = Math.floor((f - k) * 4);
      const useB = (lv === 1 && j % 4 === 0) || (lv === 2 && j % 2 === 0) || (lv === 3 && j % 4 !== 0);
      R(0, y, W, cell, useB ? BG[k + 1] : BG[k]);
    }
    clipped(0, y0, W, y0 + h, () => {
      for (let i = 0; i < 26; i++) {
        const x = ((i * 157 + age * (14 + (i % 3) * 9)) % (W + 40)) - 20;
        const y = ((((i * 97 + 31) - age * (10 + (i % 4) * 5)) % H) + H) % H;
        const big = ((age * 0.9 + i * 0.37) % 1) < 0.5;
        sparkle(x, y, big ? 9 + (i % 3) * 3 : 4, i % 3 ? C.WHITE : C.GOLD);
      }
    });
  }
  const drawBg = (): void => drawBgRows(0, H);
  function pauseButton(): void { rrect(894, 8, 50, 40, 10, C.PLUM); rrect(896, 9, 46, 36, 9, C.CREAM); R(909, 17, 7, 21, C.PLUM); R(922, 17, 7, 21, C.PLUM); }
  function drawHeader(): void {
    R(0, 0, W, 56, C.VIOLET); gloss(0, 2, W, 20, C.PINK, 2); R(0, 0, W, 2, C.WHITE); R(0, 54, W, 3, C.PLUM);
    textO(D.brand, 18, 17, C.WHITE, C.PLUM, 3);
    const fs = 30 + Math.min(16, earned);
    flame(300, 50 - fs * 1.4, fs, age);
    textO(String(earned), 300 + fs + 6, 17, C.GOLD, C.PLUM, 3);
    textO(D.scoreLabel, 404, 8, C.CREAM, C.PLUM, 2);
    rrect(404, 29, 206, 18, 8, C.PLUM); rrect(407, 32, 200, 12, 6, C.INK);
    const fw = Math.round(200 * Math.min(99, shownScore) / 100);
    if (fw > 2) { rrect(407, 32, fw, 12, 6, C.GOLD); gloss(410, 33, Math.max(0, fw - 6), 4, C.WHITE, 2); }
    textO(D.percent.replace('{n}', String(Math.min(99, Math.round(shownScore)))), 628, 11, C.GOLD, C.PLUM, 5);
    if (SND.muted()) textO(D.muted, 770, 21, C.CREAM, C.PLUM, 2);
    pauseButton();
  }
  function drawBoardFrame(): void {
    const sys = actor === 'system' && state === 'play';
    rrect(BX - 10, BY - 10, COLS * TS + 20, ROWS * TS + 20, 16, C.WHITE);
    rrect(BX - 7, BY - 7, COLS * TS + 14, ROWS * TS + 14, 13, sys ? C.MINT : C.PINK);
    R(BX - 2, BY - 2, COLS * TS + 4, ROWS * TS + 4, C.INK);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if ((r + c) % 2) R(BX + c * TS, BY + r * TS, TS, TS, sys ? C.PEN : C.PLUM);
    for (const [x, y] of [[BX - 6, BY - 6], [BX + COLS * TS + 6, BY - 6], [BX - 6, BY + ROWS * TS + 6], [BX + COLS * TS + 6, BY + ROWS * TS + 6]]) { sparkle(x, y, 13, C.GOLD); sparkle(x, y, 5, C.WHITE); }
  }
  function outline(i: number, c: string, th: number): void { const x = BX + (i % COLS) * TS, y = BY + Math.floor(i / COLS) * TS; R(x, y, TS, th, c); R(x, y + TS - th, TS, th, c); R(x, y, th, TS, c); R(x + TS - th, y, th, TS, c); }
  function drawTiles(): void {
    clipped(BX, BY, BX + COLS * TS, BY + ROWS * TS, () => {
      for (let i = 0; i < NT; i++) {
        if (swp && (i === swp.i || i === swp.j)) continue;
        const p = tpos(i); let y = p.y;
        if (phase === 'fall' && fallFrom[i] !== undefined) y = BY + 2 + (fallFrom[i] + (Math.floor(i / COLS) - fallFrom[i]) * ease(pt / FALL_T)) * TS;
        if (phase === 'pop' && pop.includes(i)) {
          const k = pt / POP_T, r = 8 + k * 26;
          sparkle(p.x + 25, y + 25, r, actor === 'player' ? C.GOLD : C.MINT); sparkle(p.x + 25, y + 25, r * 0.45, C.WHITE);
          continue;
        }
        tile(board[i], p.x, y, i === pick ? 3 : 0);
      }
      if (swp) {
        const a = tpos(swp.i), b = tpos(swp.j), t = ease(pt / SWAP_T);
        tile(board[swp.i], a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
        tile(board[swp.j], b.x + (a.x - b.x) * t, b.y + (a.y - b.y) * t);
      }
      for (const g of glints) { const p = tpos(g.i); const r = 6 + g.t * 30; sparkle(p.x + 25, p.y + 25, r, C.MINT); }
    });
    if (state !== 'play') return;
    if (hint && actor === 'player' && phase === 'idle') { const th = (Math.floor(age * 2.5) % 2) ? 6 : 3; for (const i of hint) outline(i, C.GOLD, th); }
    if (actor === 'player' && phase === 'idle' && keyMode && pick < 0) outline(cursor, C.WHITE, 3);
    if (pick >= 0) outline(pick, C.GOLD, 5);
    if (actor === 'system' && phase === 'think' && lPair) {
      const t = pt / THINK_T, a = tpos(lPair[0]), b = tpos(lPair[1]);
      const m = t < 0.45 ? 0 : ease((t - 0.45) / 0.35);
      const x = a.x + (b.x - a.x) * m - 2, y = a.y + (b.y - a.y) * m - 2;
      outline(lPair[0], C.MINT, 4);
      R(x, y, TS, 4, C.WHITE); R(x, y + TS - 4, TS, 4, C.WHITE); R(x, y, 4, TS, C.WHITE); R(x + TS - 4, y, 4, TS, C.WHITE);
      rrect(x - 8, y - 12, 26, 28, 6, C.MINT); text('L', x - 1, y - 5, C.INK, 2);
    }
  }
  /** the programme's filter film: pastel bands, a sheen, a sparkle */
  function coatPx(px: number, py: number): string {
    const s = px + py; if ((s >= 24 && s < 40) || (s >= 50 && s < 56)) return C.WHITE;
    return Math.floor(py / 4) % 2 ? C.PINK : C.CREAM;
  }
  /** level 0..1 = how much of the film is there (a 6-px dissolve) */
  function drawCoat(x: number, y: number, level: number): void {
    if (level >= 1) {
      for (let py = 0; py < PS; py += 4) {
        R(x, y + py, PS, 4, Math.floor(py / 4) % 2 ? C.PINK : C.CREAM);
        const a = Math.max(0, 24 - py), b = Math.min(PS, 40 - py); if (b > a) R(x + a, y + py, b - a, 4, C.WHITE);
        const a2 = Math.max(0, 50 - py), b2 = Math.min(PS, 56 - py); if (b2 > a2) R(x + a2, y + py, b2 - a2, 4, C.WHITE);
      }
      R(x, y, PS, 2, C.WHITE); R(x, y, 2, PS, C.WHITE);
      sparkle(x + 42, y + 18, 8, C.GOLD); sparkle(x + 42, y + 18, 3, C.WHITE);
      return;
    }
    const lv = Math.floor(level * 16);
    for (let cy = 0; cy < 10; cy++) for (let cx = 0; cx < 10; cx++) if (BAYER[(cy % 4) * 4 + (cx % 4)] < lv) R(x + cx * 6, y + cy * 6, 6, 6, coatPx(cx * 6, cy * 6));
  }
  function drawCard(c: Card): void {
    const x = Math.round(c.x), y = Math.round(c.y);
    rrect(x - 2, y - 2, 108, 54, 12, C.GOLD);
    rrect(x + 1, y + 1, 102, 48, 10, C.VIOLET);
    gloss(x + 8, y + 4, 88, 16, C.PINK, 2);
    icon(c.k, x + 54, y + 27, 15, C.PLUM); icon(c.k, x + 52, y + 25, 15, KIND[c.k].base);
    for (const [gx, gy] of [[x + 12, y + 12], [x + 92, y + 38]]) { poly([[gx, gy - 6], [gx + 5, gy], [gx, gy + 6], [gx - 5, gy]], C.TBLUE); R(gx - 1, gy - 3, 2, 2, C.WHITE); }
    if (c.t < 1.6) textO(D.newCard, x - 6, y - 12, C.GOLD, C.PLUM, 2);
  }
  function drawPanel(): void {
    rrect(468, 58, 486, 400, 18, C.WHITE);
    rrect(472, 62, 478, 392, 15, C.CREAM);
    rrect(472, 62, 478, 38, 15, C.VIOLET); R(472, 84, 478, 16, C.VIOLET); gloss(490, 64, 442, 10, C.PINK, 2);
    ctextO(D.copyLabel, 70, C.WHITE, C.PLUM, 3, 472, 478);
    R(PX0 - 5, PY0 - 5, 430, 250, C.PLUM);
    picture(PX0, PY0, 1);
    for (let i = 0; i < NP; i++) {
      const x = PX0 + (i % PCOLS) * PS, y = PY0 + Math.floor(i / PCOLS) * PS, covered = RANK[i] >= shown, a = patchAnim[i];
      if (covered) { if (a && a.kind === 'in') { if (a.t >= 0) drawCoat(x, y, Math.min(1, a.t / 0.3)); } else drawCoat(x, y, 1); }
      else if (a && a.kind === 'out' && a.t < 0.4) drawCoat(x, y, 1 - a.t / 0.4);
    }
    // the one line under the picture: its record
    text(D.oldFile, 504, 356, C.PLUM, 3);
    const fx = 504 + textW(D.oldFile, 3) + 16;
    filed.forEach((f, k) => {
      const dy = Math.round(Math.max(0, 0.3 - f.t) * -120), x = fx + k * 40 + 16, y = 366 + dy;
      icon(f.k, x + 2, y + 2, 14, KIND[f.k].dark); icon(f.k, x, y, 14, KIND[f.k].base);
      if (k === filed.length - 1 && f.t < 1.2) { R(x - 18, y - 18, 36, 3, C.VIOLET); R(x - 18, y + 15, 36, 3, C.VIOLET); R(x - 18, y - 18, 3, 36, C.VIOLET); R(x + 15, y - 18, 3, 36, C.VIOLET); }
    });
    // the feed: loot-drop recommendation cards
    for (let k = 0; k < 4; k++) rrect(cardX(k), CARD_Y, 104, 50, 10, C.SAND);
    for (const c of cards) drawCard(c);
  }
  function drawFooter(): void {
    if (!lOn) return;
    mascot(52, 498, 28, age);
    rrect(98, 464, 850, 68, 16, C.PLUM);
    rrect(101, 467, 844, 62, 14, C.WHITE);
    gloss(118, 470, 810, 8, C.CREAM, 2);
    poly([[101, 490], [88, 500], [101, 508]], C.WHITE);
    sparkle(924, 482, 8, C.GOLD);
    if (lLine) ctext(lLine, 488, C.PLUM, 3, 101, 844);
  }
  function drawFx(): void {
    for (const b of blobs) {
      const t = ease(b.t / b.dur), x = b.x0 + (b.x1 - b.x0) * t, y = b.y0 + (b.y1 - b.y0) * t - Math.sin(t * Math.PI) * 120;
      for (let k = 1; k <= 4; k++) { const tt = ease(Math.max(0, b.t - k * 0.04) / b.dur); disc(b.x0 + (b.x1 - b.x0) * tt, b.y0 + (b.y1 - b.y0) * tt - Math.sin(tt * Math.PI) * 120, 9 - k * 2, C.CREAM); }
      disc(x, y, 14, C.PINK); disc(x - 4, y - 4, 5, C.WHITE);
    }
    for (const b of bursts) { const y = Math.round(b.y - b.t * 40); ctextO(b.s, y, C.GOLD, C.PLUM, 5, b.x - 300, 600); }
    for (const f of floats) textO(f.s, f.x, Math.round(f.y + 12 - f.t * 12), C.WHITE, C.PLUM, 3);   // stays inside the header band
  }
  const drawParts = (): void => { for (const p of parts) R(p.x, p.y, p.w, p.h, p.c); };
  // confetti falls over the board but behind the header, the picture panel and L's line, so it never garbles a word
  function drawPlay(): void { drawBg(); drawBoardFrame(); drawTiles(); drawParts(); drawHeader(); drawPanel(); drawFooter(); drawFx(); }

  function drawTitle(): void {
    drawBg();
    ctextO(D.brand, 18, C.WHITE, C.PLUM, 3);
    const b = Math.round(Math.sin(age * 3) * 4);
    textGloss(D.titleTop, ctextX(D.titleTop, 9, 0, 720), 60 + b, 9);
    textGloss(D.titleBottom, ctextX(D.titleBottom, 9, 0, 720), 136 + b, 9);
    // a starburst behind L (rotating smoothly, never flashing)
    const cx = 800, cy = 130;
    for (let k = 0; k < 10; k++) { const a = age * 0.4 + k * Math.PI / 5; poly([[cx, cy], [cx + Math.cos(a - 0.12) * 170, cy + Math.sin(a - 0.12) * 170], [cx + Math.cos(a + 0.12) * 170, cy + Math.sin(a + 0.12) * 170]], k % 2 ? C.GOLD : C.CREAM); }
    mascot(cx, cy, 62, age);
    // the one legend
    const lw = textW(D.legend, 3), total = lw + 24 + 5 * 60, lx = Math.round((W - total) / 2);
    textO(D.legend, lx, 254, C.WHITE, C.PLUM, 3);
    for (let k = 0; k < 5; k++) tile(k, lx + lw + 24 + k * 60, 238);
    ctextO(D.how, 316, C.WHITE, C.PLUM, 4);
    // PLAY — arms after a short beat so the note is seen
    const armed = titleT >= ARM, bx = 330, by = 376 + (armed ? Math.round(Math.abs(Math.sin(age * 4)) * -4) : 0);
    rrect(bx - 4, by - 4, 308, 82, 26, C.PLUM);
    rrect(bx, by, 300, 74, 22, armed ? C.GOLD : C.DIM);
    if (!armed) rrect(bx, by, Math.max(44, Math.round(300 * titleT / ARM)), 74, 22, C.SAND);
    else gloss(bx + 24, by + 6, 252, 20, C.WHITE, 2);
    ctext(D.play, by + 20, armed ? C.PLUM : C.CREAM, 5, bx, 300);
    R(0, 492, W, 48, C.INK);
    ctext(D.note, 506, C.CREAM, 3);
  }
  function cardTop(): number { const t = state === 'collapse' ? 5 : st; return Math.round(-460 + (78 + 460) * easeBack(t / 0.75)); }
  function drawCardBody(cy: number): void {
    rrect(66, cy + 8, 840, 380, 26, C.PINK);
    rrect(60, cy, 840, 380, 26, C.WHITE);
    rrect(66, cy + 6, 828, 368, 22, C.CREAM);
    rrect(300, cy - 20, 360, 44, 14, C.VIOLET); gloss(316, cy - 16, 328, 10, C.PINK, 2);
    ctext(D.endRibbon, cy - 9, C.WHITE, 3, 300, 360);
    ctext(D.end1, cy + 142, C.PLUM, 3, 60, 840);
    ctext(D.end2, cy + 172, C.PLUM, 3, 60, 840);
    // his answer (5): the 99% drawn by hand (D.limit names what it says)
    const u = 0.9;
    ninetyNine(480 - Math.round(ninetyNineW(u) / 2), cy + 208, u);
    // the bar fills to 99 and stops; its last sliver can never be reached
    const bx = 160, by = cy + 320, bw = 640;
    rrect(bx - 4, by - 4, bw + 8, 34, 14, C.PLUM); R(bx, by, bw, 26, C.INK);
    const ft = state === 'collapse' ? 1 : Math.min(1, Math.max(0, (st - 0.9) / 1.6));
    const fw = Math.round(bw * 0.99 * ease(ft));
    R(bx, by, fw, 26, C.GOLD); gloss(bx, by + 2, fw, 8, C.WHITE, 2);
    for (let k = 0; k < bw * 0.01; k += 2) R(bx + Math.round(bw * 0.99) + k, by, 1, 26, C.DIM);
  }
  function drawCardHalf(side: 0 | 1): void {
    const cy = cardTop(), mid = 480;
    clipped(side === 0 ? 0 : mid, 0, side === 0 ? mid : W, H, () => {
      drawCardBody(cy);
      // the crack
      for (let k = 0; k < 20; k++) { const y = cy - 20 + k * 21; R(mid - 4 + ((k % 2) ? 5 : -5), y, 8, 21, C.PLUM); }
    });
  }
  function drawEnd(): void {
    drawBg();
    const cx = 480, cy = 268;
    for (let k = 0; k < 14; k++) { const a = age * 0.35 + k * Math.PI / 7; poly([[cx, cy], [cx + Math.cos(a - 0.1) * 700, cy + Math.sin(a - 0.1) * 700], [cx + Math.cos(a + 0.1) * 700, cy + Math.sin(a + 0.1) * 700]], k % 2 ? C.GOLD : C.CREAM); }
    const top = cardTop();
    drawCardBody(top);
    mascot(480, top + 84, 38, age);
    pauseButton();
    drawParts();
  }
  function drawFinalLayer(): void {
    R(0, 0, W, H, C.CREAM);
    R(56, 6, 848, 488, C.PLUM);
    picture(60, 10, 2);
    ctext(D.caption, 506, C.PLUM, 3);
  }
  function drawCollapse(): void {
    drawFinalLayer();
    const t = st;
    for (const l of layers) {
      const dt = Math.max(0, t - l.d);
      const ox = l.vx * dt + (t > 0.12 && dt === 0 ? (l.vx >= 0 ? 4 : -4) : 0), oy = 0.5 * l.g * dt * dt;
      if (oy > H + 100) continue;
      PEN.ox = ox; PEN.oy = oy; l.draw(); PEN.ox = 0; PEN.oy = 0;
    }
    drawParts();
  }
  function drawFinal(): void {
    drawFinalLayer();
    if (st > 2.5) text(D.again, W - 16 - textW(D.again, 2), 512, C.DIM, 2);
  }
  function drawMenu(): void {
    R(0, 0, W, H, C.INK);
    ctext(D.paused, 60, C.CREAM, 6);
    const items = [D.resume, D.restart, D.sound.replace('{v}', SND.muted() ? D.off : D.on), D.stop];
    items.forEach((s, k) => { const y = 150 + k * 66; R(300, y, 360, 52, k === menuSel ? C.CREAM : C.PLUM); ctext(s, y + 15, k === menuSel ? C.INK : C.CREAM, 3, 300, 360); });
    ctext(D.menuHelp, 450, C.DIM, 2);
  }

  function tick(dt: number): void {
    age += dt;
    if (state === 'title') titleT += dt;
    else if (state === 'play') tickPlay(dt);
    else if (state === 'end') {
      st += dt; updateFx(dt);
      if (st < 3.8) { tickAcc += dt; if (tickAcc > 0.05) { tickAcc = 0; rain(4); } }
      if (st > 0.9 && st < 2.5 && Math.floor(st * 12) !== Math.floor((st - dt) * 12)) SND.tick();
      if (st >= 5.2) goCollapse('end');
    } else if (state === 'collapse') {
      st += dt; for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; } parts = parts.filter((p) => p.y < H + 20);
      if (st >= 3.4) goFinal();
    } else if (state === 'final') st += dt;
  }
  function draw(): void {
    PEN.ox = 0; PEN.oy = 0; PEN.cl = null;
    if (state === 'title') drawTitle();
    else if (state === 'play') drawPlay();
    else if (state === 'end') drawEnd();
    else if (state === 'collapse') drawCollapse();
    else if (state === 'final') drawFinal();
    else drawMenu();
  }
  /** is anything on the screen moving now that should move at full rate (a swap, a fall, the counter-move, confetti) */
  function busy(): boolean {
    if (state === 'collapse' || state === 'end') return true;
    if (state !== 'play') return false;
    return phase !== 'idle' || endPending || parts.length > 0 || bursts.length > 0 || floats.length > 0 || blobs.length > 0 || glints.length > 0
      || Object.keys(patchAnim).length > 0 || Math.abs(score - shownScore) > 0.3
      || cards.some((c, k) => c.y < CARD_Y || c.vy !== 0 || Math.abs(c.x - cardX(k)) > 0.5 || c.t < 1.6);
  }
  function frameKey(): string {
    const m = SND.muted() ? 1 : 0;
    if (state === 'menu') return `menu|${menuSel}|${m}`;
    if (state === 'final') return `final|${st > 2.5 ? 1 : 0}`;
    if (busy()) return `${state}|b${Math.floor(age * 30)}|${m}`;
    // at rest the idle animation (L's bob, the sparkles, the hint's pulse) is quantised to ~10 frames a second
    return `${state}|i${Math.floor(age * 10)}|${m}|${titleT >= ARM ? 1 : 0}|${lOn ? 1 : 0}|${pick}|${cursor}|${keyMode ? 1 : 0}|${hint ? 1 : 0}`;
  }

  reset();
  return {
    tick, draw, key, tap, frameKey,
    takeFiling(): string | null { const f = filingOut; filingOut = null; return f; },
    probe: {
      get s() { return { state, st, earned, score, shown, actor, phase, lOn, dismissals, recoats, counterTurns, cards: cards.length, filed: filed.length, history: history.length, canPlay: canPlay(), original: { ...ORIGINAL } }; },
      seed: seedRng,
      move: () => (canPlay() ? possible(board) : null),
      tpos
    }
  };
}

export class MatchMade implements DeviceGame {
  readonly w = W; readonly h = H;
  private readonly g = makeGame();
  /** for tools/game_preview.mjs only: read the run, seed the dice, ask for a legal move. Never used in play. */
  readonly probe: Probe = this.g.probe;
  tick(dt: number): void { this.g.tick(dt); }
  draw(c: Painter): void { PEN.g = c; this.g.draw(); PEN.g = null; }
  frameKey(): string { return this.g.frameKey(); }
  key(k: GameKey): void { this.g.key(k); }
  tap(x: number, y: number): void { this.g.tap(x, y); }
  takeFiling(): string | null { return this.g.takeFiling(); }
}
