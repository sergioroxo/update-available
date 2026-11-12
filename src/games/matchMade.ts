/**
 * ⚑ S227 — MATCH MADE SIMPLE (2026), Second Thoughts' game on the console on Maya's bed. It REPLACES S189's TIDY
 * there (src/games/tidy.ts stays in the repo, unhooked). Ported from the prototype he approved — "Yes it is very
 * good indeed!" — Pc_Simulation/2026-screen-prototypes/v2_match_made_simple/match_made_simple_v2.html (+ README.md
 * beside it). All display text: data/dialog/s4_matchmade.json (and three words read from s4_v3.json, so they cannot
 * drift from the chat: the ring's word, the filter's name and the pointer's name). Colours: MATCHMADE in
 * src/desktop/theme/calendar.ts, and the picture's PORTRAIT tokens; gloss and gradients are row dithers between them,
 * never mixed shades. Type: src/room/font57.ts.
 *
 * ⚑ S367 (UiB job 15 Part B; his choice "B, a tug of war", 11 Nov) — THE GAME IS A TUG OF WAR OVER HER PICTURE.
 * - THE PICTURE is Maya and Junie at Pride '24 (src/games/pridePicture.ts, one authored function nothing writes to),
 *   with the system's swap filter on MAYA — the same filter, in the same order, as the try-on and the raid
 *   (theme/era4.ts `portraitAt`). Junie is never filtered.
 * - ONE HANDLE, under the picture, on the filter's intensity bar (the raid's grammar, swapFilter.ts `filterPill`: the
 *   filter's name "✦ Restore", a track filled to the value, a white handle, a name tag on whoever moved it last). Its
 *   word is the chat's ring word ("BECOMING", s4_v3.json bot.heading.ring) and its % is THE CHAT'S RING: one number.
 *   The system's fill grows from the left; her pink from the right; the last 1% of the track is hers and never fills.
 * - HER MOVE PULLS. Each match of hers sends her colours flying to the handle and pulls it back toward her (tag
 *   "maya"). The verb is hers: swap two, match three; turn-based; no clock.
 * - ITS MOVE PUSHES. Then Second Thoughts' pointer (the N10 grammar of browser.ts `drawTakeover`: an arrow, a pill
 *   with its mark and its name) comes onto the board and makes a LEGAL swap of its own, files what she just matched
 *   under OLD FILE, puts two of that kind back on the board — and then crosses to the handle and drags it forward (tag
 *   "Second Thoughts"). L, its mascot, names the push as calm.
 * - THE NUMBERS. Her first match of a turn pulls 8, each cascade 3 more; its push is 5, +1 late in a run (from her
 *   16th match), +1 below 50%, +2 more below 25%. It escalates — a second counter-move every fourth turn from her
 *   10th match, and every turn once she has it below 30% — so across a run the handle drifts her way (played
 *   headless from 97%, 24 matches end near 50%) but she can never simply win it. The handle can never pass 99%: at
 *   the wall its pointer leans on the handle and the handle will not go, and the track runs on past it in her pink.
 *   The filter never seats (pridePicture.ts: a strand of her hair, her pin, an unfinished gloss).
 * - THE GRIP. The picture's filter for a handle at v % is (v / 100)^2.5 (`grip`): the try-on's order, spread over the
 *   range a run is played in, so each pull gives a visible piece of her back (the gloss, the grin, her top, her jaw,
 *   her hair beginning to grow back by the end of a run). Its number always claims more than the picture shows.
 * - NOTHING REWARDS ERASING HER. Her match keeps the free-to-play praise (the burst, the confetti, the chord); its
 *   push has none: no confetti, no burst, no float, a flat slide of a sound. The glitter that grows on Maya as it
 *   pushes is the system's own gloss, its self-presentation — and it collapses.
 * - THE RECOMMENDATION CARDS ARE GONE (they cost the tug of war its legibility); OLD FILE moved into the header.
 * - JUNIE IS NOT GREYED. `paintPride` can grey her toward "muted" (the chat's mute); built, photographed, and left off:
 *   at the console's size a greyed, dithered Junie reads as the filter working on her too, and a grey face reads as
 *   illness — the opposite of the two rules (the filter is on Maya only; Junie is never mocked).
 * - THE END. After 24 matches the seller's card drops in with where the handle stopped (its "almost ready", drawn in
 *   the hand-drawn numerals of his answer 5) and cracks; or START → STOP HERE breaks the frame at once. The filtered
 *   copy falls away and the plain page shows the two of them at Pride, whole: "original kept" (the restore tool's own
 *   words to its record, as in her Photos). Filed once per game: "MATCH MADE SIMPLE played — the original stayed".
 *
 * THE SESSION. The game is one instance shared by the console on the bed and the monitor's window
 * (src/room/consoleSession.ts). `progress` / `setProgress(n)` are the chat's ring: the chat sets it at its beats (the
 * handle eases there, tagged "Second Thoughts" when it rises, untagged when it falls) and the game opens wherever it
 * is; a run keeps it where the handle stops. `pushes` and `lastPush` let the chat name the AI's own pushes as calm.
 *
 * Unchanged from S227: the Pen (a Painter that offsets, rounds and clips; fillStyle + fillRect only), the input (a tap
 * on the glass, already resolved on release, and the GameKeys), the console's own SOUND row under the piece's one
 * mute, frameKey (~10 a second at rest, 30 while anything moves; the menu and the final page upload on change), the
 * filing (one line per GAME).
 */
import type { Painter } from '../room/calendarArt';
import { text as text57, textW, textCased, textCasedW } from '../room/font57';
import { largeText } from '../desktop/theme/fonts';
import { MATCHMADE as M } from '../desktop/theme/calendar';
import { gameMenuBus } from '../state/gameMenuBus';
import { scaleFor, subscribeMix } from '../audio/mix';
import D from '../../data/dialog/s4_matchmade.json';
import V3 from '../../data/dialog/s4_v3.json';
import { paintPride, prideMaya } from './pridePicture';
import type { DeviceGame, GameKey } from './types';

const W = 960, H = 540;
/** the chat's own words, upper-cased for the 5×7 type: the ring, the filter, the pointer (they cannot drift) */
const RING_WORD = V3.bot.heading.ring.toUpperCase();
const FILTER_WORD = V3.goal.filter.name.toUpperCase();
const ITS_NAME = V3.bot.agent.pointer;
const HER_NAME = D.her;
/** where the handle stands before anything has set it (the chat sets it at its beats; see consoleSession.ts) */
export const DEFAULT_PROGRESS = 94;

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
/** case kept: a username on a name tag */
function textC(str: string, x: number, y: number, col: string, s = 1): number { return textCased(PEN, str, Math.round(x), Math.round(y), col, s); }
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
/**
 * ⚑ S374 / J18-B1 — 2026's LARGE TEXT on the console (UIB_JOB_18 Part B). Held at 0.5 m in a headset (heldDevice.ts), a ×2
 * line of the 5×7 type is 0.78° from the eye, under the 0.8° reading floor; ×3 is 1.17°. So with the era's large-text setting
 * on (fonts.ts `largeText`: in a headset) every ×2 line is drawn at ×3, and the few rows that then meet are given room
 * (the header's file row, the end card's word over the number, the plain page's bottom line). Off the headset nothing moves.
 */
const small = (): number => largeText() ? 3 : 2;
function ctext(str: string, y: number, col: string, s = 1, x0 = 0, w = W): void { text(str, ctextX(str, s, x0, w), y, col, s); }
function ctextO(str: string, y: number, col: string, ol: string, s = 1, x0 = 0, w = W): void { textO(str, ctextX(str, s, x0, w), y, col, ol, s); }

// ── shapes, rasterised to rows — crisp at any size, never an upscaled bitmap ────────────────────────────────────
function disc(cx: number, cy: number, r: number, c: string): void { cx = Math.round(cx); cy = Math.round(cy); const n = Math.floor(r); for (let dy = -n; dy <= n; dy++) { const w = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy))); R(cx - w, cy + dy, 2 * w + 1, 1, c); } }
function ellipse(cx: number, cy: number, rx: number, ry: number, c: string): void { cx = Math.round(cx); cy = Math.round(cy); const n = Math.floor(ry); for (let dy = -n; dy <= n; dy++) { const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry)))); R(cx - w, cy + dy, 2 * w + 1, 1, c); } }
function ring(cx: number, cy: number, r1: number, r0: number, c: string): void { cx = Math.round(cx); cy = Math.round(cy); const n = Math.floor(r1); for (let dy = -n; dy <= n; dy++) { const wo = Math.floor(Math.sqrt(Math.max(0, r1 * r1 - dy * dy))); if (Math.abs(dy) < r0) { const wi = Math.floor(Math.sqrt(r0 * r0 - dy * dy)); R(cx - wo, cy + dy, wo - wi, 1, c); R(cx + wi + 1, cy + dy, wo - wi, 1, c); } else R(cx - wo, cy + dy, 2 * wo + 1, 1, c); } }
/** an elliptical ring (the 0) */
function ellRing(cx: number, cy: number, rx1: number, ry1: number, rx0: number, ry0: number, c: string): void {
  cx = Math.round(cx); cy = Math.round(cy); const n = Math.floor(ry1);
  for (let dy = -n; dy <= n; dy++) {
    const wo = Math.floor(rx1 * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry1 * ry1))));
    if (Math.abs(dy) < ry0) { const wi = Math.floor(rx0 * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry0 * ry0)))); R(cx - wo, cy + dy, wo - wi, 1, c); R(cx + wi + 1, cy + dy, wo - wi, 1, c); } else R(cx - wo, cy + dy, 2 * wo + 1, 1, c);
  }
}
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
function sparkle(cx: number, cy: number, r: number, c: string): void { const k = Math.max(1, r * 0.28); poly([[cx, cy - r], [cx + k, cy - k], [cx + r, cy], [cx + k, cy + k], [cx, cy + r], [cx - k, cy + k], [cx - r, cy], [cx - k, cy - k]], c); }
/** gloss: every other row of a band lit in `c` */
function gloss(x: number, y: number, w: number, h: number, c: string, cell = 2): void { for (let j = 0; j < h; j += cell * 2) R(x, y + j, w, Math.min(cell, h - j), c); }

// ── random (seedable for the preview tool only; play uses Math.random) ────────────────────────────────────────
let rnd: () => number = Math.random;
function seedRng(s: number): void { let a = s >>> 0; rnd = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ri = (n: number): number => Math.floor(rnd() * n);
const pickOf = <X>(a: readonly X[]): X => a[ri(a.length)];
const ease = (t: number): number => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
const easeIO = (t: number): number => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
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
// ⚑ S227, his answer (5) — THE END CARD'S NUMBER, HAND-DRAWN: chunky digits and a percent sign built from rings,
// rounded bars and slanted slabs, in the title type's gloss (plum outline and drop, white crown, gold body, orange
// foot). Each glyph is authored in a 64 × 96 box and drawn at `u` of that size. ⚑ S367: every digit, because the
// card now shows where the handle stopped (one number), not a fixed 99.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
const NUM_W = 64, NUM_H = 96, NUM_GAP = 12, BIG = 1e5;
function digitShape(d: number, x: number, y: number, u: number, c: string): void {
  const X = (v: number): number => x + v * u, Y = (v: number): number => y + v * u, rr = (v: number): number => Math.round(v * u);
  switch (d) {
    case 0: ellRing(X(32), Y(48), 31 * u, 47 * u, 12 * u, 27 * u, c); break;
    case 1:
      R(X(23), Y(0), 21 * u, 80 * u, c);
      poly([[X(23), Y(0)], [X(44), Y(0)], [X(44), Y(12)], [X(4), Y(30)], [X(4), Y(16)]], c);
      rrect(X(6), Y(74), 52 * u, 22 * u, rr(10), c); break;
    case 2:
      clipped(-BIG, Y(0) - 1, BIG, Y(30), () => ring(X(32), Y(30), 30 * u, 11 * u, c));
      poly([[X(41), Y(28)], [X(62), Y(30)], [X(25), Y(78)], [X(2), Y(78)]], c);
      rrect(X(2), Y(74), 60 * u, 22 * u, rr(10), c); break;
    case 3:
      clipped(X(30), -BIG, BIG, BIG, () => { ring(X(30), Y(24), 24 * u, 8 * u, c); ring(X(30), Y(68), 28 * u, 10 * u, c); });
      rrect(X(4), Y(0), 32 * u, 17 * u, rr(8), c); R(X(16), Y(40), 16 * u, 16 * u, c); rrect(X(2), Y(79), 34 * u, 17 * u, rr(8), c); break;
    case 4:
      R(X(40), Y(0), 21 * u, 96 * u, c);
      poly([[X(40), Y(0)], [X(61), Y(0)], [X(21), Y(62)], [X(0), Y(62)]], c);
      rrect(X(0), Y(56), 64 * u, 19 * u, rr(6), c); break;
    case 5:
      rrect(X(6), Y(0), 56 * u, 18 * u, rr(6), c); R(X(6), Y(0), 20 * u, 48 * u, c);
      clipped(X(30), -BIG, BIG, BIG, () => ring(X(30), Y(64), 31 * u, 11 * u, c));
      R(X(6), Y(33), 28 * u, 15 * u, c); rrect(X(2), Y(79), 34 * u, 17 * u, rr(8), c); break;
    case 6:
      ring(X(32), Y(66), 30 * u, 11 * u, c); R(X(2), Y(20), 21 * u, 46 * u, c);
      rrect(X(2), Y(0), 58 * u, 24 * u, rr(11), c); break;
    case 7:
      rrect(X(0), Y(0), 64 * u, 20 * u, rr(6), c);
      poly([[X(42), Y(0)], [X(64), Y(0)], [X(30), Y(96)], [X(8), Y(96)]], c); break;
    case 8: ring(X(32), Y(24), 23 * u, 8 * u, c); ring(X(32), Y(68), 28 * u, 10 * u, c); break;
    default:
      ring(X(32), Y(30), 30 * u, 11 * u, c);                 // the bowl
      R(X(41), Y(30), 21 * u, 48 * u, c);                     // the stem down the right
      rrect(X(4), Y(72), 58 * u, 24 * u, Math.round(11 * u), c);   // the foot, turning left
  }
}
function pctShape(x: number, y: number, u: number, c: string): void {
  ring(x + 16 * u, y + 17 * u, 15 * u, 6 * u, c);
  ring(x + 48 * u, y + 79 * u, 15 * u, 6 * u, c);
  poly([[x + 44 * u, y], [x + 64 * u, y], [x + 20 * u, y + 96 * u], [x, y + 96 * u]], c);
}
/** the number's width at `u` (its digits and the %) */
const bigNumberW = (n: number, u: number): number => Math.round((NUM_W * (String(n).length + 1) + NUM_GAP * String(n).length) * u);
function bigNumber(n: number, x: number, y: number, u: number): void {
  const digits = String(n).split('').map(Number), step = (NUM_W + NUM_GAP) * u;
  const all = (c: string, dx = 0, dy = 0): void => { digits.forEach((d, i) => digitShape(d, x + step * i + dx, y + dy, u, c)); pctShape(x + step * digits.length + dx, y + dy, u, c); };
  const o = Math.max(3, Math.round(4 * u));
  for (const [dx, dy] of GLOSS_OUT) all(C.PLUM, dx * o, dy * o);
  const h = NUM_H * u;
  all(C.GOLD);
  clipped(-BIG, y - 1, BIG, y + Math.round(h * 0.2), () => all(C.WHITE));
  clipped(-BIG, y + Math.round(h * 0.8), BIG, y + h + 1, () => all(C.ORANGE));
  sparkle(x + bigNumberW(n, u) + 22 * u, y + 4 * u, 12 * u, C.WHITE); sparkle(x + bigNumberW(n, u) + 22 * u, y + 4 * u, 5 * u, C.GOLD);
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
// SOUND — gentle live Web Audio under the piece's ONE mute. L must sound good: its turn opens on a soft chime.
// ⚑ S367: its PUSH is a flat slide, never a reward; her pull lands with a small lift.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
/** the console's own SOUND row (memory only; wiped with the page): this game's sounds and nothing else */
let consoleQuiet = false;
interface ToneOpt { at?: number; v?: number; a?: number; type?: OscillatorType; to?: number }
const SND = (() => {
  let ac: AudioContext | null = null, master: GainNode | null = null, paused = false;
  const LEVEL = 0.5;
  const muted = (): boolean => gameMenuBus.soundMuted?.() === true || consoleQuiet;
  const level = (): number => (muted() || paused ? 0 : LEVEL * scaleFor('effects'));
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
  subscribeMix(sync);   // S248: the menu's master and EFFECTS sliders reach the synthesised sounds too
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
    /** her colours reach the handle: a small lift */
    pull(): void { tone(659, 0.12, { type: 'triangle', v: 0.035, to: 784 }); },
    /** its turn begins: L's soft chime */
    counter(): void { [784, 659, 523].forEach((f, i) => tone(f, 0.38, { at: i * 0.1, v: 0.04 })); },
    counter2(): void { tone(587, 0.25, { v: 0.03 }); },
    /** its push: a flat slide, never a fanfare */
    push(): void { tone(262, 0.4, { v: 0.03, to: 294 }); },
    /** the wall: the handle will not go */
    wall(): void { tone(147, 0.22, { v: 0.04, to: 139 }); },
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
const SWAP_T = 0.18, POP_T = 0.3, FALL_T = 0.32, ARM = 2.5;
/** the picture, in the panel (7 px cells: 64 × 36 of them) */
const PIC = { x: 487, y: 100, w: 448, h: 252 } as const;
/** the handle's track: its x at 0 % (TX0) and at 100 % (TFULL), where the track ends (TX1: past 100 %, so at the 99 % wall
 *  a stub of her pink still shows beyond the handle), its top and height */
const TX0 = 503, TFULL = 897, TX1 = 923, TY = 394, TH = 16, HANDLE_R = 15;
/** its turn: the pointer comes to the board, drags, crosses to the handle, pushes, goes */
const AIM_T = 0.55, REACH_T = 0.5, PUSH_T = 0.6, LEAVE_T = 0.4, WALL_T = 0.45, FLIGHT_T = 0.4, GLOW_T = 0.6;
/** Maya's place in the panel's picture (her head; her side, where the filter works) */
const MAYA = prideMaya(PIC.x, PIC.y, PIC.w, PIC.h);
/** the tug: her pulls, its pushes (see the header) */
const PULL_FIRST = 8, PULL_CASCADE = 3;
/** where its pointer rests off the glass, at the handle's height */
const OFF = { x: W + 40, y: TY + 8 };

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
/**
 * ⚑ the filter's grip on the picture for a handle at `v` %: (v / 100)^2.5. The filter's ORDER is the try-on's (hair,
 * jaw, body, smile, gloss); the curve only spreads its stages over the range a run is played in (from the chat's
 * 94–98 down to about 50), so every pull of hers gives a visible piece of her back — the gloss, the grin, her top,
 * her jaw, and her hair beginning to grow back by the end of a full run. Its number always claims more than the
 * picture shows. Never more than 0.976, and pridePicture.ts keeps it from seating at any value.
 */
const grip = (v: number): number => Math.pow(Math.max(0, Math.min(99, v)) / 100, 2.5);
const handleX = (v: number): number => TX0 + (TFULL - TX0) * Math.max(0, Math.min(99, v)) / 100;
const clampP = (n: number): number => Math.max(0, Math.min(99, Math.round(n)));

type State = 'title' | 'play' | 'end' | 'collapse' | 'final' | 'menu';
/** her turn: idle → swap → pop → fall (→ pop …). Its turn: aim → swap → pop → fall (…) → reach → push (→ aim …) → leave */
type Phase = 'idle' | 'aim' | 'swap' | 'back' | 'pop' | 'fall' | 'reach' | 'push' | 'leave';
type Tag = '' | 'her' | 'it';
interface Part { x: number; y: number; vx: number; vy: number; c: string; life: number; w: number; h: number }
interface Burst { s: string; x: number; y: number; t: number }
interface Flight { x0: number; y0: number; t: number; pull: number; landed?: boolean }
interface Filed { k: number; t: number; x0: number; y0: number }
interface Layer { draw: () => void; d: number; vx: number; g: number }
interface Probe {
  readonly s: {
    state: State; st: number; earned: number; score: number; progress: number; handle: number; tag: Tag; actor: string; phase: Phase;
    lOn: boolean; dismissals: number; counterTurns: number; pushes: number; walls: number; lastPush: { from: number; to: number } | null;
    filed: number; history: number; canPlay: boolean; original: { who: string; where: string }
  };
  seed(n: number): void;
  move(): [number, number] | null;
  tpos(i: number): { x: number; y: number };
  /** review only (tools/s367-game-stills.mjs): the end card's hand-drawn number, painted into any Painter */
  paintNumber(p: Painter, n: number, x: number, y: number, u: number): void;
}
const ORIGINAL = Object.freeze({ who: 'Maya and Junie', where: "Pride '24" });

interface Game {
  tick(dt: number): void; draw(): void; key(k: GameKey): void; tap(x: number, y: number): void; frameKey(): string; takeFiling(): string | null;
  progress(): number; setProgress(n: number, snap?: boolean): void; pushes(): number; lastPush(): { from: number; to: number } | null;
  probe: Probe;
}
function makeGame(): Game {
  let state: State = 'title', st = 0, age = 0, titleT = 0;
  let board: Board = [], cursor = 27, pick = -1, phase: Phase = 'idle', pt = 0, swp: { i: number; j: number; valid: boolean } | null = null, pop: number[] = [], fallFrom: number[] = [], cascade = 0, actor: 'player' | 'system' = 'player';
  let idle = 0, hint: [number, number] | null = null, earned = 0;
  // ── THE HANDLE: `prog` is the number (the chat's ring), `hv` where the handle is drawn, `hTo` where it eases
  let prog = DEFAULT_PROGRESS, hv = DEFAULT_PROGRESS, hTo = DEFAULT_PROGRESS, tag: Tag = 'it', tagT = 9, wallT = 9;
  let pushFrom = 0, pushTo = 0, pushWall = false, pushesN = 0, wallsN = 0, last: { from: number; to: number } | null = null, movesLeft = 0;
  // ── its pointer
  let ptr = { x: OFF.x, y: OFF.y }, ptrFrom = { x: OFF.x, y: OFF.y }, lPair: [number, number] | null = null;
  let flights: Flight[] = [], glows: number[] = [], filed: Filed[] = [], parts: Part[] = [], bursts: Burst[] = [], glints: Array<{ i: number; t: number }> = [];
  let lOn = true, lLine = '', dismissals = 0, lastMatched = 0;
  let history: Array<{ matched: string; filedAs: string; pushed: number }> = [];
  let menuSel = 0, ret: State = 'play', retSt = 0, layers: Layer[] = [], filingOut: string | null = null, filedOnce = false, firstTurn = true, endPending = false, endWait = 0;
  let keyMode = false, counterTurns = 0, pullI = 0, counterI = 0, tickAcc = 0, endValue = DEFAULT_PROGRESS;

  const say = (s: string): void => { lLine = s; };
  function setTag(t: Tag): void { if (t !== tag) { tag = t; tagT = 0; } }
  function reset(): void {
    board = fresh(); cursor = 3 * COLS + 3; pick = -1; phase = 'idle'; pt = 0; swp = null; pop = []; fallFrom = []; cascade = 0; actor = 'player';
    idle = 0; hint = null; earned = 0; flights = []; filed = []; glows = []; glints = [];
    parts = []; bursts = []; lOn = true; lLine = ''; lastMatched = 0; lPair = null; history = [];
    firstTurn = true; endPending = false; endWait = 0; counterTurns = 0; pullI = 0; counterI = 0; layers = []; movesLeft = 0;
    ptr = { x: OFF.x, y: OFF.y }; hv = hTo = prog; wallT = 9;
  }
  const wipeRecord = (): void => { history = []; filed = []; };
  const change = (s: State): void => { state = s; st = 0; };
  function begin(): void { reset(); change('play'); say(D.lHello); SND.start(); }

  const CONF = [C.GOLD, C.PINK, C.TBLUE, C.MINT, C.WHITE, C.VIOLET, C.ORANGE];
  function confetti(x: number, y: number, n: number, spread = 260, cols: readonly string[] = CONF): void {
    for (let i = 0; i < n; i++) parts.push({ x, y, vx: (rnd() - 0.5) * spread * 1.6, vy: -rnd() * spread - 40, c: pickOf(cols), life: 1.2 + rnd() * 1.2, w: 4 + ri(5), h: 4 + ri(8) });
    if (parts.length > 520) parts.splice(0, parts.length - 520);
  }
  const RAIN = [C.GOLD, C.PINK, C.TBLUE, C.WHITE, C.VIOLET, C.MINT];
  function rain(n: number): void { for (let i = 0; i < n; i++) parts.push({ x: rnd() * W, y: -10 - rnd() * 60, vx: (rnd() - 0.5) * 60, vy: 40 + rnd() * 80, c: pickOf(RAIN), life: 3, w: 4 + ri(5), h: 5 + ri(8) }); if (parts.length > 520) parts.splice(0, parts.length - 520); }

  function attempt(i: number, j: number): void {
    const valid = matches(swapped(board, i, j)).length > 0;
    swp = { i, j, valid }; phase = 'swap'; pt = 0; pick = -1; idle = 0; hint = null; SND.swap();
  }
  function centreOf(list: number[]): { x: number; y: number } { let x = 0, y = 0; for (const i of list) { const p = tpos(i); x += p.x + 25; y += p.y + 25; } return { x: x / list.length, y: y / list.length }; }
  /** how hard it pushes now (see the header) */
  const pushSize = (): number => 5 + (earned >= 16 ? 1 : 0) + (prog < 50 ? 1 : 0) + (prog < 25 ? 2 : 0);
  /** does it make a second counter-move this turn */
  const twice = (): boolean => (earned >= 10 && counterTurns % 4 === 3) || prog < 30;

  function cleared(first: boolean): void {
    const ctr = centreOf(pop);
    if (first) cascade = 0; else cascade++;
    if (actor === 'player') {
      for (const i of pop) { const p = tpos(i); confetti(p.x + 25, p.y + 25, 7, 240); }
      // ⚑ her pull: her colours fly from the match to the handle, and pull it when they land
      flights.push({ x0: ctr.x, y0: ctr.y, t: 0, pull: first ? PULL_FIRST : PULL_CASCADE });
      if (first) {
        lastMatched = board[pop[0]]; earned++; firstTurn = false;
        bursts.push({ s: D.praise[pullI % D.praise.length], x: BX + 216, y: ctr.y - 40, t: 0 });
        rain(70);
      } else {
        bursts.push({ s: D.combo.replace('{n}', String(cascade + 1)), x: BX + 216, y: ctr.y - 30, t: 0 }); rain(30);
      }
      SND.match(cascade);
    } else {
      // its match: the tiles go, and that is all (no confetti, no burst: nothing about its move is a prize)
      if (first) {
        filed.push({ k: lastMatched, t: 0, x0: ctr.x, y0: ctr.y }); if (filed.length > 6) filed.shift();
        history.push({ matched: KIND[lastMatched].name, filedAs: 'old file', pushed: 0 });
        SND.counter2();
      }
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
  /** its turn: the pointer comes for a legal swap */
  function aim(): void {
    const m = allMoves(board); lPair = m.length ? m[ri(m.length)] : null;
    if (!lPair) { board = fresh(); const m2 = allMoves(board); lPair = m2[ri(m2.length)] ?? null; }
    ptrFrom = { ...ptr }; phase = 'aim'; pt = 0;
  }
  function settled(): void {
    if (!allMoves(board).length) { board = fresh(); say(D.lReshuffle); }
    if (actor === 'player') {
      actor = 'system'; counterTurns++; movesLeft = twice() ? 2 : 1; pick = -1; hint = null;
      SND.counter(); aim();
    } else {
      // its swap has settled: put two of what she matched back, then cross to the handle
      repopulate(); if (!allMoves(board).length) board = fresh();
      ptrFrom = { ...ptr }; phase = 'reach'; pt = 0;
    }
  }
  function startPush(): void {
    pushFrom = prog; pushTo = Math.min(99, prog + pushSize());
    const wall = prog + pushSize() > 99;
    pushWall = wall; prog = pushTo; pushesN++; last = { from: pushFrom, to: pushTo };
    if (history.length) history[history.length - 1].pushed = pushTo - pushFrom;
    hTo = pushTo; setTag('it'); phase = 'push'; pt = 0; SND.push();
    if (wall) { wallsN++; wallT = -PUSH_T * 0.6; say(D.lWall[counterI++ % D.lWall.length]); }
    else say(movesLeft > 1 ? D.lTwice : D.lCounter[counterI++ % D.lCounter.length]);
  }
  function endTurn(): void {
    actor = 'player'; phase = 'idle'; idle = 0; lPair = null;
    if (earned >= PASS) { endPending = true; endWait = 0; }
  }
  function updateFx(dt: number): void {
    for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.vx *= 1 - dt * 0.6; p.life -= dt; }
    parts = parts.filter((p) => p.life > 0 && p.y < H + 20);
    for (const b of bursts) b.t += dt; bursts = bursts.filter((b) => b.t < 1.1);
    for (const g of glints) g.t += dt; glints = glints.filter((g) => g.t < 0.8);
    for (const f of filed) f.t += dt;
    for (const f of flights) {
      f.t += dt;
      if (f.t >= FLIGHT_T && !f.landed) {
        f.landed = true;
        // ⚑ the pull lands: the handle comes back toward her, by her name
        prog = Math.max(0, prog - f.pull); hTo = prog; setTag('her'); SND.pull(); glows.push(0);
        if (f.pull === PULL_FIRST && lOn) say(D.lPull[pullI++ % D.lPull.length]);
      }
    }
    flights = flights.filter((f) => f.t < FLIGHT_T + 0.05);
    glows = glows.map((g) => g + dt).filter((g) => g < GLOW_T);
    tagT += dt;
    const w0 = wallT; wallT += dt;
    if (w0 < 0 && wallT >= 0) SND.wall();   // the handle meets the wall
    // the handle eases to its number, except while its pointer is dragging it
    if (phase !== 'push') hv += (hTo - hv) * Math.min(1, dt * 7);
  }
  function tickPlay(dt: number): void {
    idle += dt; updateFx(dt);
    if (phase === 'idle') {
      if (endPending) { endWait += dt; if (endWait > 1.0 && !flights.length) goEnd(); return; }
      if (actor === 'player' && !hint && idle > (firstTurn ? 3 : 6)) { hint = possible(board); if (hint && lOn) say(D.lHint); }
      return;
    }
    pt += dt;
    if (phase === 'aim') {
      if (!lPair) { ptrFrom = { ...ptr }; phase = 'leave'; pt = 0; return; }
      const a = tpos(lPair[0]), k = easeIO(pt / AIM_T);
      ptr = { x: ptrFrom.x + (a.x + 30 - ptrFrom.x) * k, y: ptrFrom.y + (a.y + 30 - ptrFrom.y) * k };
      if (pt >= AIM_T) attempt(lPair[0], lPair[1]);
      return;
    }
    if (phase === 'swap' && swp) {
      if (actor === 'system') { const a = tpos(swp.i), b = tpos(swp.j), k = ease(pt / SWAP_T); ptr = { x: a.x + 30 + (b.x - a.x) * k, y: a.y + 30 + (b.y - a.y) * k }; }
      if (pt >= SWAP_T) {
        board = swapped(board, swp.i, swp.j);
        if (!swp.valid) { phase = 'back'; pt = 0; SND.bad(); if (actor === 'player' && lOn) say(D.lOops); }
        else { swp = null; pop = matches(board); cleared(true); }
      }
      return;
    }
    if (phase === 'back' && swp && pt >= SWAP_T) { board = swapped(board, swp.i, swp.j); swp = null; phase = 'idle'; idle = 0; }
    else if (phase === 'pop' && pt >= POP_T) { gravity(); phase = 'fall'; pt = 0; }
    else if (phase === 'fall' && pt >= FALL_T) { pop = matches(board); if (pop.length) cleared(false); else settled(); }
    else if (phase === 'reach') {
      const k = easeIO(pt / REACH_T), tx = handleX(hv), ty = TY + 8;
      ptr = { x: ptrFrom.x + (tx - ptrFrom.x) * k, y: ptrFrom.y + (ty - ptrFrom.y) * k };
      if (pt >= REACH_T) startPush();
    } else if (phase === 'push') {
      const k = easeIO(pt / PUSH_T);
      hv = pushFrom + (pushTo - pushFrom) * k;
      // at the wall it leans on the handle and the handle will not go
      const lean = pushWall && k > 0.6 ? Math.round(Math.sin(pt * 40) * 3) : 0;
      ptr = { x: handleX(hv) + lean, y: TY + 8 };
      if (pt >= PUSH_T) {
        // the handle stays where it pushed it — unless the chat set the ring meanwhile; then it eases there
        hv = pushTo;
        movesLeft--;
        if (movesLeft > 0) aim();
        else { ptrFrom = { ...ptr }; phase = 'leave'; pt = 0; }
      }
    } else if (phase === 'leave') {
      const k = easeIO(pt / LEAVE_T);
      ptr = { x: ptrFrom.x + (OFF.x - ptrFrom.x) * k, y: ptrFrom.y + (OFF.y - ptrFrom.y) * k };
      if (pt >= LEAVE_T) endTurn();
    }
  }
  function goEnd(): void { change('end'); endValue = clampP(prog); SND.end(); }
  function goCollapse(from: 'end' | 'play'): void {
    change('collapse'); SND.collapse(); layers = []; flights = []; glows = [];
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
      // the filtered copy falls away first; the original was under it all along
      L(drawPanel, 0.2, 70, 1000);
    }
  }
  function goFinal(): void {
    change('final'); wipeRecord(); parts = []; bursts = []; flights = []; glows = [];
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
  /** where a filed icon rests in the header's OLD FILE row */
  const oldX = (): number => 418 + textW(D.oldFile, small()) + 26;   // S374: after the label, at its headset size too
  const fileX = (k: number): number => oldX() + k * (largeText() ? 34 : 38);   // S374: six still clear MUTED at ×3
  function drawHeader(): void {
    R(0, 0, W, 56, C.VIOLET); gloss(0, 2, W, 20, C.PINK, 2); R(0, 0, W, 2, C.WHITE); R(0, 54, W, 3, C.PLUM);
    textO(D.brand, 18, 17, C.WHITE, C.PLUM, 3);
    const fs = 30 + Math.min(16, earned);
    flame(300, 50 - fs * 1.4, fs, age);
    textO(String(earned), 300 + fs + 6, 17, C.GOLD, C.PLUM, 3);
    // its record: OLD FILE, what she matched, filed by its counter-move
    textO(D.oldFile, 418, largeText() ? 17 : 21, C.CREAM, C.PLUM, small());
    filed.forEach((f, k) => {
      const tx = fileX(k), ty = 28, m = ease(f.t / 0.5);
      const x = f.x0 + (tx - f.x0) * m, y = f.y0 + (ty - f.y0) * m - Math.sin(m * Math.PI) * 60;
      icon(f.k, x + 2, y + 2, 13, KIND[f.k].dark); icon(f.k, x, y, 13, KIND[f.k].base);
    });
    if (SND.muted()) textO(D.muted, 790, largeText() ? 17 : 21, C.CREAM, C.PLUM, small());
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
    // its choice, outlined in its colour while its pointer comes for it
    if (actor === 'system' && phase === 'aim' && lPair) { outline(lPair[0], C.MINT, 4); if (pt > AIM_T * 0.5) outline(lPair[1], C.MINT, 2); }
  }
  /** ⚑ S367 — its pointer: the takeover's arrow and pill (browser.ts drawTakeover), redrawn in the game's pixels */
  const ARROW: Pt[] = [[0, 0], [0, 15], [4, 11], [7, 17], [9, 16], [6, 10], [11, 10]];
  const ARROW_O: Array<[number, number]> = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
  function itsMark(x: number, y: number, d: number): void { disc(x + d / 2, y + d / 2, d / 2, C.INK); sparkle(x + d / 2, y + d / 2, d * 0.36, C.MINT); }
  function itsPill(x: number, y: number, s: number): number {
    const tw = textCasedW(ITS_NAME, s), d = 8 * s, h = 9 * s + 6, w = tw + d + 3 * s + 14;
    rrect(x - 2, y - 2, w + 4, h + 4, Math.floor(h / 2) + 2, C.INK);
    rrect(x, y, w, h, Math.floor(h / 2), C.GREEN);
    itsMark(x + 4, y + Math.round((h - d) / 2), d);
    textC(ITS_NAME, x + d + 3 * s + 4, y + Math.round((h - 8 * s) / 2) + Math.round(s / 2), C.INK, s);
    return w;
  }
  function drawPointer(): void {
    if (state !== 'play' || actor !== 'system' || ptr.x > W + 20) return;
    const x = Math.round(ptr.x), y = Math.round(ptr.y), u = 2.6;
    const pts = (dx: number, dy: number): Pt[] => ARROW.map(([a, b]) => [x + a * u + dx, y + b * u + dy] as Pt);
    for (const [dx, dy] of ARROW_O) poly(pts(dx * 3, dy * 3), C.WHITE);
    poly(pts(0, 0), C.INK);
    // its pill: below the arrow on the board; on the handle it hangs where the handle's own tag would be
    const onBar = y > PIC.y + PIC.h - 10, s = onBar ? 3 : small();
    const pw = textCasedW(ITS_NAME, s) + 8 * s + 3 * s + 14;
    const px0 = Math.max(4, Math.min(W - pw - 4, onBar ? x - Math.round(pw / 2) : x + 22));
    itsPill(px0, onBar ? TY - 46 : y + 44, s);
  }
  /** the filter's handle under the picture: the system's fill from the left, hers from the right, a white handle */
  function drawHandle(): void {
    const hx = Math.round(handleX(hv)), w = TX1 - TX0;
    rrect(TX0 - 5, TY - 5, w + 10, TH + 10, 13, C.PLUM);
    R(TX0, TY, hx - TX0, TH, C.GREEN); gloss(TX0, TY + 2, hx - TX0, 4, C.MINT, 2);
    R(hx, TY, TX1 - hx, TH, C.PINK); gloss(hx, TY + 2, TX1 - hx, 4, C.WHITE, 2);
    // past 99 %: hers, always — it never fills (hatched, and the track runs on beyond the handle's reach)
    const sx = Math.round(handleX(99)) + HANDLE_R + 3;
    for (let k = sx; k < TX1; k += 3) R(k, TY, 1, TH, C.WHITE);
    // the handle (it shudders against the wall)
    const sh = wallT >= 0 && wallT < WALL_T ? Math.round(Math.sin(wallT * 50) * 3 * (1 - wallT / WALL_T)) : 0;
    const cx = hx + sh, cy = TY + TH / 2;
    disc(cx, cy + 2, HANDLE_R + 2, C.PLUM); disc(cx, cy, HANDLE_R + 2, C.PLUM); disc(cx, cy, HANDLE_R, C.WHITE);
    R(cx - 5, cy - 6, 3, 12, C.DIM); R(cx + 2, cy - 6, 3, 12, C.DIM);
    // who moved it last — hidden while its pointer holds it (the pointer's own pill is the tag then)
    const held = state === 'play' && actor === 'system' && (phase === 'reach' || phase === 'push') && Math.hypot(ptr.x - hx, ptr.y - (TY + 8)) < 60;
    if (tag && !held) {
      const pop2 = Math.round((1 - easeBack(tagT / 0.3)) * 10);
      if (tag === 'it') {
        const pw = textCasedW(ITS_NAME, 3) + 24 + 9 + 14;
        itsPill(Math.max(474, Math.min(948 - pw, cx - Math.round(pw / 2))), TY - 46 + pop2, 3);
      } else {
        const tw = textCasedW(HER_NAME, 3), pw = tw + 22, ph = 9 * 3 + 6;
        const x0 = Math.max(474, Math.min(948 - pw, cx - Math.round(pw / 2))), y0 = TY - 46 + pop2;
        rrect(x0 - 2, y0 - 2, pw + 4, ph + 4, Math.floor(ph / 2) + 2, C.PLUM);
        rrect(x0, y0, pw, ph, Math.floor(ph / 2), C.PINK);
        textC(HER_NAME, x0 + 11, y0 + 4, C.PLUM, 3);
      }
      poly([[cx - 6, TY - 13 + pop2], [cx + 6, TY - 13 + pop2], [cx, TY - 6 + pop2]], tag === 'it' ? C.INK : C.PLUM);
    }
    // the one number, under the system's fill: the chat's ring word and its % (left, clear of its pointer, which works
    // the handle in the upper range); the filter's own name at the other end
    const ly = TY + TH + 14;
    const pct = D.percent.replace('{n}', String(clampP(hv))), rw = textW(RING_WORD, 3);
    textO(RING_WORD, TX0, ly + 1, C.CREAM, C.PLUM, 3);
    textO(pct, TX0 + rw + 16, ly - 6, C.GOLD, C.PLUM, 5);
    const fw = textW(FILTER_WORD, 3), fx = TX1 - fw;
    sparkle(fx - 16, ly + 10, 10, C.GREEN); sparkle(fx - 16, ly + 10, 4, C.WHITE);
    textO(FILTER_WORD, fx, ly + 1, C.GREEN, C.PLUM, 3);
  }
  function drawPanel(): void {
    rrect(468, 58, 486, 400, 18, C.WHITE);
    rrect(472, 62, 478, 392, 15, C.CREAM);
    rrect(472, 62, 478, 34, 15, C.VIOLET); R(472, 80, 478, 16, C.VIOLET); gloss(490, 64, 442, 8, C.PINK, 2);
    ctextO(D.copyLabel, 69, C.WHITE, C.PLUM, 3, 472, 478);
    R(PIC.x - 4, PIC.y - 4, PIC.w + 8, PIC.h + 8, C.PLUM);
    // ⚑ the picture, the filter on Maya at the handle's grip (never past 99, never seated)
    paintPride(PEN, PIC.x, PIC.y, PIC.w, PIC.h, { filter: grip(hv), t: age });
    clipped(PIC.x, PIC.y, PIC.x + PIC.w, PIC.y + PIC.h, () => {
      // her pull lands: her colours round her, for a moment
      for (const g of glows) {
        const k = g / GLOW_T, r = 40 + k * 60;
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.3; sparkle(MAYA.hx + Math.cos(a) * r, MAYA.hy + Math.sin(a) * r * 0.8, Math.round(11 * (1 - k)) + 3, HERS[i % HERS.length]); }
      }
      // its push: the filter passing down over her again (a scan, not a prize)
      if (state === 'play' && phase === 'push') {
        const y = Math.round(MAYA.y0 + (MAYA.y1 - MAYA.y0) * easeIO(pt / PUSH_T));
        R(MAYA.x0, y - 2, MAYA.x1 - MAYA.x0, 4, C.MINT); R(MAYA.x0, y, MAYA.x1 - MAYA.x0, 1, C.WHITE);
      }
    });
    drawHandle();
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
  /** her colours on their way to the handle: a short arc of trans-flag sparks */
  const HERS = [C.TBLUE, C.PINK, C.WHITE, C.PINK, C.TBLUE];
  function drawFlights(): void {
    for (const f of flights) {
      if (f.landed) continue;
      const tx = handleX(hv), ty = TY + TH / 2;
      for (let k = 0; k < 5; k++) {
        const m = ease(Math.max(0, f.t - k * 0.035) / FLIGHT_T);
        const x = f.x0 + (tx - f.x0) * m, y = f.y0 + (ty - f.y0) * m - Math.sin(m * Math.PI) * 90;
        sparkle(x, y, 13 - k * 2, HERS[k]); if (k === 0) sparkle(x, y, 5, C.WHITE);
      }
    }
  }
  function drawFx(): void {
    for (const b of bursts) { const y = Math.round(b.y - b.t * 40); ctextO(b.s, y, C.GOLD, C.PLUM, 5, b.x - 300, 600); }
  }
  const drawParts = (): void => { for (const p of parts) R(p.x, p.y, p.w, p.h, p.c); };
  // confetti falls over the board but behind the header, the picture panel and L's line, so it never garbles a word
  function drawPlay(): void { drawBg(); drawBoardFrame(); drawTiles(); drawParts(); drawHeader(); drawPanel(); drawFooter(); drawFx(); drawFlights(); drawPointer(); }

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
    // S374: with the ring's word at ×3 (large text) the three lines and the number are spaced a little apart
    const lg = largeText();
    ctext(D.end1, cy + (lg ? 136 : 142), C.PLUM, 3, 60, 840);
    ctext(D.end2, cy + (lg ? 164 : 172), C.PLUM, 3, 60, 840);
    // his answer (5): the number drawn by hand — ⚑ S367: where the handle stopped (one number), the ring's word over it
    const u = 0.82, nw = bigNumberW(endValue, u);
    ctext(RING_WORD, cy + (lg ? 194 : 204), C.PLUM, small(), 60, 840);
    bigNumber(endValue, 480 - Math.round(nw / 2), cy + (lg ? 228 : 222), u);
    // the bar fills to the number and stops; its last 1 % is hers and can never be reached
    const bx = 160, by = cy + 324, bw = 640;
    rrect(bx - 4, by - 4, bw + 8, 30, 12, C.PLUM); R(bx, by, bw, 22, C.PINK);
    const ft = state === 'collapse' ? 1 : Math.min(1, Math.max(0, (st - 0.9) / 1.6));
    const fw = Math.round(bw * (endValue / 100) * ease(ft));
    R(bx, by, fw, 22, C.GREEN); gloss(bx, by + 2, fw, 6, C.MINT, 2);
    for (let k = 0; k < bw * 0.01; k += 2) R(bx + Math.round(bw * 0.99) + k, by, 1, 22, C.WHITE);
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
  /** the plain page: the two of them at Pride, whole — the filter has dropped off; the restore tool's own label */
  function drawFinalLayer(): void {
    R(0, 0, W, H, C.CREAM);
    paintPride(PEN, 56, 6, 848, 488, { filter: 0, t: 0 });
    ctext(D.caption, 506, C.PLUM, 3);
    textC(D.originalKept, 60, largeText() ? 506 : 510, C.DIM, small());
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
    if (st > 2.5) text(D.again, W - 16 - textW(D.again, small()), largeText() ? 506 : 512, C.DIM, small());
  }
  function drawMenu(): void {
    R(0, 0, W, H, C.INK);
    ctext(D.paused, 60, C.CREAM, 6);
    const items = [D.resume, D.restart, D.sound.replace('{v}', SND.muted() ? D.off : D.on), D.stop];
    items.forEach((s, k) => { const y = 150 + k * 66; R(300, y, 360, 52, k === menuSel ? C.CREAM : C.PLUM); ctext(s, y + 15, k === menuSel ? C.INK : C.CREAM, 3, 300, 360); });
    ctext(D.menuHelp, 450, C.DIM, small());
  }

  function tick(dt: number): void {
    age += dt;
    if (state === 'title') { titleT += dt; hv += (hTo - hv) * Math.min(1, dt * 7); tagT += dt; }
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
    else { hv += (hTo - hv) * Math.min(1, dt * 7); }
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
  /** is anything on the screen moving now that should move at full rate (a swap, a fall, its pointer, a pull, confetti) */
  function busy(): boolean {
    if (state === 'collapse' || state === 'end') return true;
    if (state !== 'play') return false;
    return phase !== 'idle' || endPending || parts.length > 0 || bursts.length > 0 || flights.length > 0 || glows.length > 0 || glints.length > 0
      || Math.abs(hTo - hv) > 0.05 || tagT < 0.35 || (wallT >= 0 && wallT < WALL_T) || filed.some((f) => f.t < 0.55);
  }
  function frameKey(): string { return frameKeyOf() + (largeText() ? '|L' : ''); }   // S374: a window that caches by key redraws on the switch
  function frameKeyOf(): string {
    const m = SND.muted() ? 1 : 0;
    if (state === 'menu') return `menu|${menuSel}|${m}`;
    if (state === 'final') return `final|${st > 2.5 ? 1 : 0}`;
    if (busy()) return `${state}|b${Math.floor(age * 30)}|${m}`;
    // at rest the idle animation (L's bob, the sparkles, the hint's pulse) is quantised to ~10 frames a second
    return `${state}|i${Math.floor(age * 10)}|${m}|${titleT >= ARM ? 1 : 0}|${lOn ? 1 : 0}|${pick}|${cursor}|${keyMode ? 1 : 0}|${hint ? 1 : 0}|${Math.round(hv * 4)}|${tag}`;
  }

  reset();
  return {
    tick, draw, key, tap, frameKey,
    takeFiling(): string | null { const f = filingOut; filingOut = null; return f; },
    progress: () => clampP(prog),
    setProgress(n: number, snap = false): void {
      const v = clampP(n);
      if (snap) { prog = hv = hTo = v; return; }
      if (v === prog) return;
      setTag(v > prog ? 'it' : '');
      prog = v; hTo = v;
    },
    pushes: () => pushesN,
    lastPush: () => (last ? { ...last } : null),
    probe: {
      get s() {
        return {
          state, st, earned, score: clampP(prog), progress: clampP(prog), handle: hv, tag, actor, phase, lOn, dismissals, counterTurns,
          pushes: pushesN, walls: wallsN, lastPush: last ? { ...last } : null, filed: filed.length, history: history.length, canPlay: canPlay(), original: { ...ORIGINAL }
        };
      },
      seed: seedRng,
      move: () => (canPlay() ? possible(board) : null),
      tpos,
      paintNumber(p: Painter, n: number, x: number, y: number, u: number): void { const was = PEN.g; PEN.g = p; bigNumber(n, x, y, u); PEN.g = was; }
    }
  };
}

export class MatchMade implements DeviceGame {
  readonly w = W; readonly h = H;
  private readonly g = makeGame();
  /** for tools/game_preview.mjs and tools/s367-game-stills.mjs only: read the run, seed the dice, ask for a legal move */
  readonly probe: Probe = this.g.probe;
  tick(dt: number): void { this.g.tick(dt); }
  draw(c: Painter): void { PEN.g = c; this.g.draw(); PEN.g = null; }
  frameKey(): string { return this.g.frameKey(); }
  key(k: GameKey): void { this.g.key(k); }
  tap(x: number, y: number): void { this.g.tap(x, y); }
  takeFiling(): string | null { return this.g.takeFiling(); }
  /** ⚑ S367 — the handle, 0..99 (the chat's ring) */
  get progress(): number { return this.g.progress(); }
  /** ⚑ S367 — the chat sets the ring; the handle eases there (tagged "Second Thoughts" when it rises, untagged when it
   *  falls). `snap` puts it there at once, untouched tag (the session handing a new game the ring it already had). */
  setProgress(n: number, snap = false): void { this.g.setProgress(n, snap); }
  /** ⚑ S367 — how many times its counter-moves have pushed the handle (this game, every run) */
  get pushes(): number { return this.g.pushes(); }
  /** ⚑ S367 — its last push, from → to (integers), or null before the first */
  get lastPush(): { from: number; to: number } | null { return this.g.lastPush(); }
}
