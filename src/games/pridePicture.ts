/**
 * ⚑ S367 (UiB job 15 Part B) — MAYA AND JUNIE AT PRIDE '24, the picture MATCH MADE SIMPLE works on. His (11 Nov):
 * "Make an improved Maya + Junie at pride, it makes sense to give the extra context of life."
 *
 *     paintPride(p, x, y, w, h, { filter, junieMute?, t? })
 *
 * ONE AUTHORED FUNCTION THAT NOTHING WRITES TO. It paints with `fillStyle` + `fillRect` only, through any `Painter`
 * (the game's Pen at 960 × 540, the preview tool's buffer, or a 2D canvas), on a grid of 64 × 36 cells: the cell is
 * the largest whole number of pixels that fits (7 in the game's panel, 13 on the plain page at the end), the grid is
 * centred and the margin left over is the picture's plum mount. It stays inside (x, y, w, h).
 *
 * THE PICTURE. A daylight Pride, a summer afternoon: Maya (left) and Junie (right) close in the front of the crowd,
 * Junie's arm round Maya's shoulders and her hand on Maya's far shoulder; behind them the crowd, Maya's trans flag and
 * a rainbow flag on her side, the "PRIDE '24" banner, a placard with a heart and the people under it on Junie's side.
 * Maya is her photograph's figure (theme/era4.ts `PORTRAIT_FIGURE`, the S364 redraw: her hair, her skin, her pink top,
 * the trans-flag pin over her heart, her earrings). Junie is drawn in the same hand: her dark curls (the console's old
 * picture), her deep-brown skin, and her own warm yellow (Kettle's avatar for her, `KETTLE.avatarJunie` = PLACE.sun,
 * which is PORTRAIT.light here), laughing.
 * ⚑ DAYLIGHT, NOT THE STARRY SKY (his standing rule allows either; never string lights or lanterns). Judged on the
 * console's size (the monitor's window is ~300 px wide, a cell ≈ 2 px): the two heads are dark-haired, and against a
 * night sky Junie's curls and Maya's hair merge into it; against a blue sky every head, face and flag keeps its edge.
 * And the filter's gloss (the halo, the rays, the sparkles) is cream, white and gold — on daylight it still reads as
 * the brightest thing in the picture, and its drained sky (the goal's flat grey-blue) reads as a hole in the day.
 *
 * THE FILTER (`filter`, 0 = hers … 1). The same swap filter, in the same order, as `drawSwapMorph` / `portraitAt`:
 * her hair cut from the ends upward and the quiff grown in, the jaw, the jacket wiping down over her top, the grin,
 * the life around her draining to the goal's flat sky, the gloss landing last. It works on MAYA ONLY: the drain and
 * the gloss stop at the line between the two of them, and nothing of Junie — not her arm across Maya's shoulders,
 * not her hand — is ever filtered.
 * ⚑ IT NEVER SEATS. Whatever `filter` is, three things stay hers: one strand of her long hair falling from the quiff to
 * her shoulder (the cut never reaches it), her trans-flag pin (it stays on the lapel when the jacket comes down over
 * her top), and the gloss never completes (it stops short of the "verified" tick, which therefore never appears).
 *
 * `junieMute` (0..1, optional, default 0): Junie greyed toward "muted" — built and kept OFF in the game. See
 * matchMade.ts's header for why (the reading it would cost).
 *
 * `t` twinkles the gloss's sparkles (quantised to half-seconds). Colours: the game's MATCHMADE palette and the era4
 * PORTRAIT tokens, nothing else (pixel discipline). No likeness of anyone; drawn faces.
 */
import type { Painter } from '../room/calendarArt';
import { text as text57, textW } from '../room/font57';
import { MATCHMADE as M } from '../desktop/theme/calendar';
import { PORTRAIT as P, PORTRAIT_FIGURE as FIG, portraitAt } from '../desktop/theme/era4';
import D from '../../data/dialog/s4_matchmade.json';

export const PRIDE_GRID = { cols: 64, rows: 36 } as const;
export interface PrideOpts {
  /** 0 = hers … 1 = the filter's (the game passes its handle / 100, so never more than 0.99) */
  filter: number;
  /** 0..1 — Junie greyed toward "muted" (optional; off in the game) */
  junieMute?: number;
  /** seconds; twinkles the gloss */
  t?: number;
}
const GW = PRIDE_GRID.cols, GH = PRIDE_GRID.rows;
/** where Maya's 24 × 30 figure sits in the picture (her cell (c, r) → picture (MX + c, MY + r)), and Junie's */
const MX = 9, MY = 6, JX = 29, JY = 6;
/** the line between them: the drain and the gloss are Maya's side only (columns below it) */
const BOUND = 30;

/** the cell size and the grid's origin inside a rect */
export function prideLayout(x: number, y: number, w: number, h: number): { c: number; ox: number; oy: number } {
  const c = Math.max(1, Math.floor(Math.min(w / GW, h / GH)));
  return { c, ox: Math.round(x + Math.floor((w - GW * c) / 2)), oy: Math.round(y + Math.floor((h - GH * c) / 2)) };
}

/** where Maya is in a rect, in pixels: her head's centre, and her side of the picture (the filter's region) */
export function prideMaya(x: number, y: number, w: number, h: number): { hx: number; hy: number; x0: number; x1: number; y0: number; y1: number } {
  const L = prideLayout(x, y, w, h);
  return { hx: L.ox + (MX + 12) * L.c, hy: L.oy + (MY + 10) * L.c, x0: L.ox + (MX + 1) * L.c, x1: L.ox + BOUND * L.c, y0: L.oy + (MY + 2) * L.c, y1: L.oy + GH * L.c };
}

// ── the painter's state for one call (module-level; the function is synchronous and re-entrant only in sequence) ────
let PT: Painter | null = null;
let CS = 1, OX = 0, OY = 0, XC: number = GW;
/** one run of cells, clipped to the grid (and to columns < XC while the gloss paints) */
function cell(gx: number, gy: number, gw: number, gh: number, col: string): void {
  const a = Math.max(0, gx), b = Math.max(0, gy), e = Math.min(XC, gx + gw), f = Math.min(GH, gy + gh);
  if (e <= a || f <= b || !PT) return;
  PT.fillStyle = col; PT.fillRect(OX + a * CS, OY + b * CS, (e - a) * CS, (f - b) * CS);
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE DAY BEHIND THEM — built once as a cell map (nothing writes to it after); the drain reads it per cell.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const RAINBOW = [P.tie, M.orange, M.gold, M.green, M.blue, M.violet];
const TRANS = [P.flagBlue, P.flagPink, P.flagWhite, P.flagPink, P.flagBlue];
/** the crowd, back to front: [col, head row, near (a bigger head, with eyes), skin, hair, top, arm up: -1 left / 1 right / 0] */
type Person = [number, number, boolean, string, string, string, number];
const CROWD: Person[] = [
  // the far row, all along the street
  [0, 14, false, M.sand, M.plum, M.violet, 0], [5, 13, false, M.wood, M.ink, M.orange, -1], [9, 15, false, P.skinLo, P.hair, M.tblue, 0],
  [24, 14, false, P.skin, M.violet, M.gold, 0], [28, 15, false, M.sand, M.ink, M.green, 0], [31, 15, false, P.skin, M.plum, M.orange, 0],
  [36, 15, false, M.wood, M.ink, M.blue, 0], [43, 14, false, M.sand, M.orange, M.violet, 0], [49, 14, false, P.skinLo, P.hair, M.pink, 0], [54, 15, false, M.wood, M.ink, M.green, 1], [59, 13, false, P.skin, M.gold, M.blue, 0],
  // the near ones at the edges, half out of the frame
  [-2, 21, true, P.skin, P.hair, M.green, 0], [60, 20, true, M.wood, M.ink, M.violet, 0]
];
function buildDay(): string[][] {
  const g: string[][] = Array.from({ length: GH }, () => new Array<string>(GW).fill(M.blue));
  const put = (x: number, y: number, w: number, h: number, c: string): void => {
    for (let j = Math.max(0, y); j < Math.min(GH, y + h); j++) for (let i = Math.max(0, x); i < Math.min(GW, x + w); i++) g[j][i] = c;
  };
  // the sky: the afternoon's blue, the trans-flag blue lower down, the warm haze at the street's end — a ROW dither,
  // as the game's own gradients are (vgrad), never a checkerboard
  const SKY = [M.blue, M.blue, M.tblue, M.tblue];
  for (let j = 0; j < GH; j++) {
    const f = (Math.min(23, j) / 23) * (SKY.length - 1), k = Math.min(SKY.length - 2, Math.floor(f)), lv = Math.floor((f - k) * 4);
    const useB = (lv === 1 && j % 4 === 0) || (lv === 2 && j % 2 === 0) || (lv === 3 && j % 4 !== 0);
    put(0, j, GW, 1, useB ? SKY[k + 1] : SKY[k]);
  }
  // clouds
  for (const [x, y, w] of [[2, 1, 7], [20, 2, 5], [44, 9, 5]] as Array<[number, number, number]>) { put(x + 1, y - 1, w - 3, 1, M.white); put(x, y, w, 1, M.white); put(x + 1, y + 1, w - 2, 1, M.cream); }
  // the banner's poles (the banner itself is on Junie's side and never drains)
  put(34, 4, 1, 18, M.wood); put(61, 4, 1, 18, M.wood);
  // Maya's side: her trans flag, flying, and a rainbow flag
  put(3, 2, 1, 14, M.wood);
  for (let i = 0; i < 10; i++) { const dy = [0, 0, 1, 1, 1, 0, 0, 1, 1, 1][i]; for (let s = 0; s < 5; s++) put(4 + i, 2 + s + dy, 1, 1, TRANS[s]); }
  put(12, 8, 1, 8, M.wood);
  for (let i = 0; i < 6; i++) { const dy = [1, 0, 0, 1, 1, 0][i]; for (let s = 0; s < 6; s++) put(6 + i, 8 + s + dy, 1, 1, RAINBOW[s]); }
  // Junie's side: the placard (a heart), on its stick
  put(56, 14, 1, 4, M.wood);
  put(52, 8, 9, 7, M.wood); put(53, 8, 7, 6, M.cream);
  for (const [x, y, w] of [[54, 9, 2], [57, 9, 2], [54, 10, 5], [55, 11, 3], [56, 12, 1]] as Array<[number, number, number]>) put(x, y, w, 1, M.pink);
  // the crowd: a head (hair on top and at the sides), shoulders, a body to the frame's foot; an arm up for some
  for (const [x, y, near, skin, hair, top, arm] of CROWD) {
    const n = near ? 5 : 3, sh = near ? 2 : 1;
    put(x - sh - 1, y + n, n + 2 * sh + 2, GH, top);
    put(x - sh, y + n, n + 2 * sh, 1, top);
    put(x, y, n, n, skin); put(x, y, n, near ? 2 : 1, hair); put(x - 1, y, 1, near ? 3 : 2, hair); put(x + n, y, 1, near ? 3 : 2, hair);
    if (near) { put(x + 1, y + 3, 1, 1, M.ink); put(x + 3, y + 3, 1, 1, M.ink); }
    if (arm) { const ax = arm < 0 ? x - sh - 1 : x + n + sh; put(ax, y - 3, 1, n + 3, skin); }
  }
  // the banner's own cloth, gold hem, and its shadow
  put(33, 1, 30, 6, M.violet); put(33, 6, 30, 1, M.gold); put(34, 7, 29, 1, M.plum);
  return g;
}
let DAY: string[][] | null = null;

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// JUNIE — her own layers in the same 24 × 30 hand as Maya's (her face and shoulders share Maya's shapes, so the two
// are drawn alike; her curls, her colours and her laugh are hers).
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
type Layer = readonly string[];
const lay = (rows: Record<number, string>): string[] => Array.from({ length: 30 }, (_, r) => rows[r] ?? '.'.repeat(24));
const J_HAIR = lay({
  1: '........HH.HHh.HH.......',
  2: '......HHhHHHHHHHHH......',
  3: '.....HHHHHHhHHHHhHH.....',
  4: '....HhHHHHHHHHHHHHHH....',
  5: '....HHHHhHHHHHHHHhHH....',
  6: '...HHHHHHHHHHHHHHHHHH...',
  7: '...HhHHHHHHHHHHHHHHhH...',
  8: '..HHHHHHHHHHHHHHHHHHHH..',
  9: '...HHHHHHHHHHHHHHHHHH...',
  10: '..HhHHHHHHHHHHHHHHHHhH..',
  11: '...HHHHHHHHHHHHHHHHHH...',
  12: '...HHhHHH.......HHhHH...',
  13: '....HHH..........HHH....',
  14: '.....H............H.....'
});
const J_FRINGE = lay({
  6: '........HhHHHhHH........',
  7: '........H......H........'
});
const J_FEAT = lay({
  8: '.........HH..HH.........',
  9: '..........e..e..........',
  10: '.........c....c.........',
  11: '............s...........',
  12: '................g.......'
});
/** her laugh: open */
const J_MOUTH = lay({
  12: '.........e....e.........',
  13: '..........eeee..........'
});
const J_KEY: Record<string, string> = { H: M.ink, h: M.plum, S: M.wood, s: M.wood, e: M.ink, c: M.orange, g: M.gold, T: P.light, t: M.gold, W: P.light };
/** the greys she would be muted to (only if `junieMute` > 0) */
const J_MUTE: Record<string, string> = { H: M.plum, h: M.dim, S: M.dim, s: M.plum, e: M.plum, c: M.dim, g: M.dim, T: P.frame, t: M.dim, W: P.frame };
const isDither = (k: number, gx: number, gy: number): boolean => k > FIG.bayer(gx, gy);

/** paint a layer at an origin with a key map; `skip(col,row)` leaves a cell out */
function layerAt(L: Layer, x0: number, y0: number, key: Record<string, string>, mute = 0, mkey?: Record<string, string>, skip?: (c: number, r: number) => boolean): void {
  for (let r = 0; r < L.length; r++) {
    const row = L[r];
    let runX = -1, runC = '';
    for (let c = 0; c <= row.length; c++) {
      let col = '';
      if (c < row.length) {
        const ch = row[c];
        if (ch !== '.' && !(skip && skip(c, r))) col = mute > 0 && mkey && isDither(mute, x0 + c, y0 + r) ? mkey[ch] : key[ch];
      }
      if (col !== runC) { if (runC) cell(x0 + runX, y0 + r, c - runX, 1, runC); runX = c; runC = col; }
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// MAYA, under the filter — the same cells and modes as era4's paintPortrait (cut, dither, swap, wipe)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const PK = (ch: string): string => P[FIG.key[ch]];
/** the strand the cut never reaches: from the side of the quiff down to her shoulder (her grid's cells) */
const STRAND = new Set<string>(['7,8', '7,9', '7,10', '7,11', '7,12', '7,13', '7,14', '6,15', '6,16', '6,17', '6,18', '6,19', '5,20', '5,21', '5,22']);
const inStrand = (c: number, r: number): boolean => STRAND.has(`${c},${r}`);
function mayaLayer(her: Layer, goal: Layer, mode: 'cut' | 'dither' | 'wipe' | 'swap', k: number, keep = false): void {
  for (let r = 0; r < 30; r++) {
    const hr = her[r], gr = goal[r];
    // one colour per cell ('' = nothing), then runs of the same colour painted as one rect
    let runX = 0, runC = '';
    for (let c = 0; c <= 24; c++) {
      let col = '';
      if (c < 24) {
        const a = hr[c], b = gr[c];
        if (a !== '.' || b !== '.') {
          if (mode === 'cut') {
            // her hair is cut from the ends upward (bar the strand that stays), the template's grows in over it
            const cut = k > 0.9 * Math.max(0, Math.min(1, (23 - r) / 21)) && !(keep && inStrand(c, r));
            const grown = k > 0.55 + 0.4 * FIG.bayer(c, r);
            col = b !== '.' && grown ? PK(b) : a !== '.' && !cut ? PK(a) : '';
          } else {
            const on = mode === 'dither' ? k > FIG.bayer(c, r) : mode === 'wipe' ? k > Math.min(0.98, Math.max(0, (r - 17) / 13)) : k >= 0.5;
            const ch = on ? b : a;
            col = ch !== '.' ? PK(ch) : '';
          }
        }
      }
      if (col !== runC) { if (runC) cell(MX + runX, MY + r, c - runX, 1, runC); runX = c; runC = col; }
    }
  }
}
const EMPTY: Layer = lay({});

/**
 * ⚑ THE PICTURE. `filter` 0..1 (hers … the filter's); see the header. Nothing in the game can change this function.
 */
export function paintPride(p: Painter, x: number, y: number, w: number, h: number, opts: PrideOpts): void {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  if (w <= 0 || h <= 0) return;
  const L = prideLayout(x, y, w, h);
  PT = p; CS = L.c; OX = L.ox; OY = L.oy; XC = GW;
  // the mount, round whatever the grid leaves
  p.fillStyle = M.plum; p.fillRect(x, y, w, h);
  const s = portraitAt(Math.max(0, Math.min(1, opts.filter)));
  // ⚑ it never seats: the gloss stops short of the "verified" tick (which paintPortrait draws at gloss ≥ 0.9)
  const gloss = Math.min(s.gloss, 0.86);
  const mute = Math.max(0, Math.min(1, opts.junieMute ?? 0));
  const t = opts.t ?? 0;
  DAY ??= buildDay();

  // ── the day, drained on her side only (soft over the four columns before the line), the gloss's halo and rays over it
  for (let gy = 0; gy < GH; gy++) {
    let runX = 0, runC = '';
    for (let gx = 0; gx <= GW; gx++) {
      let col = '';
      if (gx < GW) {
        col = DAY[gy][gx];
        if (gx < BOUND) {
          const edge = Math.max(0, Math.min(1, (BOUND - gx) / 4));
          if (s.drain * edge > FIG.bayer(gx, gy)) col = P.dSky;
          if (gloss > 0) {
            const gc = FIG.gloss(gx - MX, gy - MY);
            if (gc && gloss * edge > FIG.bayer(gx + 2, gy + 1)) col = gc;
          }
        }
      }
      if (col !== runC) { if (runC) cell(runX, gy, gx - runX, 1, runC); runX = gx; runC = col; }
    }
  }
  // the banner's words (Junie's side, never drained)
  {
    const sz = Math.max(1, Math.floor(CS * 0.6)), str = D.sign;
    const tw = textW(str, sz), bx = OX + 33 * CS, bw = 30 * CS, by = OY + 1 * CS, bh = 5 * CS;
    text57(p, str, Math.round(bx + (bw - tw) / 2), Math.round(by + (bh - 7 * sz) / 2), M.cream, sz);
  }

  // ── JUNIE behind: her curls and her shoulders
  layerAt(J_HAIR, JX, JY, J_KEY, mute, J_MUTE);
  layerAt(FIG.her.body, JX, JY, J_KEY, mute, J_MUTE);
  const arm = (k: string): string => (mute > 0 ? J_MUTE[k] : J_KEY[k]);

  // ── MAYA, back to front, the filter in its order
  mayaLayer(FIG.her.back, FIG.goal.hair, 'cut', s.hair, true);
  mayaLayer(FIG.her.face, FIG.goal.face, 'dither', s.jaw);
  mayaLayer(FIG.her.feat, FIG.goal.feat, 'swap', s.jaw);
  mayaLayer(FIG.her.mouth, FIG.goal.mouth, 'swap', s.smile);
  mayaLayer(FIG.her.body, FIG.goal.body, 'wipe', s.body);
  // her pin, over her heart — ⚑ it stays: the jacket comes down over her top and the pin is still on it
  {
    const bx = MX + 14, by = MY + 24;
    cell(bx, by, 3, 3, P.edge);
    if (CS >= 3) {
      // five stripes inside a one-sub-cell rim (in pixels: the pin is the one place finer than a cell)
      const rim = Math.max(1, Math.round(CS / 4)), x0 = OX + bx * CS + rim, y0 = OY + by * CS + rim, iw = 3 * CS - 2 * rim;
      for (let i = 0; i < 5; i++) { const a = Math.round((i * iw) / 5), b = Math.round(((i + 1) * iw) / 5); if (b > a) { p.fillStyle = TRANS[i]; p.fillRect(x0, y0 + a, iw, b - a); } }
    } else for (let i = 0; i < 3; i++) cell(bx, by + i, 3, 1, TRANS[i * 2]);
  }
  mayaLayer(FIG.her.front, EMPTY, 'cut', s.hair, true);
  // her earrings, gone with the hair
  if (s.hair < 0.5) { cell(MX + 7, MY + 12, 1, 1, P.gold); cell(MX + 16, MY + 12, 1, 1, P.gold); }
  // ── JUNIE'S ARM across Maya's shoulders, in her own yellow sleeve: over Maya's hair (as an arm round long hair lies),
  //    behind her neck, and her hand over Maya's far shoulder — over the top or over the jacket alike: nothing of
  //    Junie is under the filter
  cell(MX + 3, MY + 16, 5, 1, arm('T')); cell(MX + 3, MY + 17, 5, 1, arm('t'));
  cell(MX + 16, MY + 16, 7, 1, arm('T')); cell(MX + 16, MY + 17, 7, 1, arm('t'));
  cell(MX + 1, MY + 16, 2, 3, arm('S')); cell(MX + 1, MY + 19, 1, 1, arm('S'));
  // ── JUNIE in front: her face, her laugh, her curls over her forehead
  layerAt(FIG.her.face, JX, JY, J_KEY, mute, J_MUTE);
  layerAt(J_FEAT, JX, JY, J_KEY, mute, J_MUTE);
  layerAt(J_MOUTH, JX, JY, J_KEY, mute, J_MUTE);
  layerAt(J_FRINGE, JX, JY, J_KEY, mute, J_MUTE);

  // ── the gloss's sparkles, Maya's side only (it never completes: no tick)
  if (gloss > 0) {
    XC = BOUND;
    const phase = Math.floor(t * 2) % 2;
    FIG.sparkles.forEach(([c0, r0, on], i) => {
      if (gloss < 0.5 + i * 0.05) return;
      const k = on === phase ? P.sparkleHi : P.sparkle, sx = MX + c0, sy = MY + r0;
      cell(sx - 1, sy, 3, 1, k); cell(sx, sy - 1, 1, 3, k);
    });
    XC = GW;
  }
  PT = null;
}
