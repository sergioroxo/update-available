/**
 * ⚑ S189 — FIT IN (1997), on Daniel's handheld. PLAN_PHASE4_GAMES; his "tetris like?" (2026-09-27).
 * ⚑ REDESIGNED on his notes (2026-09-28): "To make the gameboy accurate it can't have colors, since it is all
 * in shade of green" — and the law for every game here: "they all have a rhetoric of failure, that unables
 * you to win, aka the queer side always wins."
 *
 * A falling-blocks game in the handheld's four greens. The programme's pieces — the seven straight shapes,
 * solid — lock in and clear lines, and the score praises CLEAN LINES. Its other pieces are ODD (a ring, a
 * stair, a plus with an arm too many, a heart, a cup), drawn in the screen's own dither so they read at a
 * glance without a colour it does not have. When one lands the game says NOT A FIT and tries to throw it
 * out — and it STAYS. A row that holds an odd piece will not clear: the programme cannot make its clean
 * lines out of them. More odd pieces come the longer you play, until nothing else does; the well fills with
 * them; GAME OVER — the pieces stayed. The game cannot be won; they always win. (The satire is the seller's:
 * the cheer is the programme's; the odd pieces are never mocked — they are the only thing that lasts.)
 * Controls are the handheld's own: the d-pad moves, A turns, B drops, START starts and pauses.
 * Filed once, when a run ends: "FIT IN played — the odd pieces stayed".
 */
import { px, text, textW, type Painter } from '../room/calendarArt';
import { HANDHELD as H } from '../desktop/theme/calendar';
import type { DeviceGame, GameKey } from './types';

const W = 80, H_ = 72;
const COLS = 10, ROWS = 17, CELL = 4, WX = 2, WY = 2;

type Cells = Array<[number, number]>;
/** the programme's pieces: the seven straight shapes */
const STRAIGHT: Cells[] = [
  [[0, 1], [1, 1], [2, 1], [3, 1]], [[1, 0], [2, 0], [1, 1], [2, 1]], [[0, 1], [1, 1], [2, 1], [1, 0]],
  [[0, 1], [1, 1], [2, 1], [2, 0]], [[0, 1], [1, 1], [2, 1], [0, 0]], [[1, 0], [2, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [1, 1], [2, 1]]
];
/** the odd ones — none of them tiles a straight line */
const ODD: Cells[] = [
  [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]],   // a ring
  [[0, 0], [1, 1], [2, 2]],                                          // a stair, cell to cell at the corners
  [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [2, 3]],                  // a plus with an arm too many
  [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1], [1, 2]],                  // a heart
  [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],                          // an x
  [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2], [3, 2]],                  // a long step
  [[0, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1]]                   // a cup
];

interface Piece { cells: Cells; x: number; y: number; odd: boolean }

export class FitIn implements DeviceGame {
  readonly w = W; readonly h = H_;
  private mode: 'title' | 'play' | 'pause' | 'end' = 'title';
  private well: number[][] = [];          // 0 empty, 1 straight, 2 odd
  private cur: Piece | null = null;
  private fall = 0;
  private count = 0;                      // pieces dealt
  private clean = 0;
  private oddIn = 0;                      // odd pieces that stayed
  private flash: { piece: Piece; t: number } | null = null;
  private cheer: { text: string; t: number } | null = null;
  private clock = 0;
  private filing: string | null = null;
  private filed = false;
  private seed = 7;

  constructor() { this.reset(); }

  private rnd(): number { this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff; return this.seed / 0x7fffffff; }
  private reset(): void {
    this.well = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    this.cur = null; this.count = 0; this.clean = 0; this.oddIn = 0; this.flash = null; this.cheer = null; this.fall = 0;
  }
  private deal(): void {
    const oddChance = Math.min(1, 0.15 + this.count * 0.07);
    const odd = this.rnd() < oddChance;
    const set = odd ? ODD : STRAIGHT;
    const k = Math.floor(this.rnd() * set.length);
    const cells = set[k].map(([x, y]) => [x, y] as [number, number]);
    this.cur = { cells, x: 3, y: 0, odd };
    this.count++;
    if (this.collides(this.cur, 0, 0)) this.over('full');
  }
  private collides(p: Piece, dx: number, dy: number, cells = p.cells): boolean {
    for (const [cx, cy] of cells) {
      const x = p.x + cx + dx, y = p.y + cy + dy;
      if (x < 0 || x >= COLS || y >= ROWS) return true;
      if (y >= 0 && this.well[y][x]) return true;
    }
    return false;
  }
  private rotate(): void {
    if (!this.cur) return;
    const turned = this.cur.cells.map(([x, y]) => [-y, x] as [number, number]);
    const minX = Math.min(...turned.map((c) => c[0])), minY = Math.min(...turned.map((c) => c[1]));
    const norm = turned.map(([x, y]) => [x - minX, y - minY] as [number, number]);
    if (!this.collides(this.cur, 0, 0, norm)) this.cur.cells = norm;
  }
  private land(): void {
    const p = this.cur!;
    this.cur = null;
    for (const [cx, cy] of p.cells) if (p.y + cy >= 0) this.well[p.y + cy][p.x + cx] = p.odd ? 2 : 1;
    if (p.odd) { this.oddIn++; this.flash = { piece: p, t: 0.9 }; this.cheer = { text: 'NOT A FIT', t: 0.9 }; return; }
    // only a row of the programme's own pieces is "clean" — a row that holds an odd one never clears
    let lines = 0;
    this.well = this.well.filter((row) => { const clean = row.every((v) => v === 1); if (clean) lines++; return !clean; });
    while (this.well.length < ROWS) this.well.unshift(Array(COLS).fill(0));
    if (lines) { this.clean += lines; this.cheer = { text: 'CLEAN LINES!', t: 1.2 }; }
  }
  private over(_why: 'full'): void {
    this.mode = 'end';
    this.cheer = { text: 'GAME OVER', t: 99 };
    if (!this.filed) { this.filed = true; this.filing = 'FIT IN played — the odd pieces stayed'; }
  }

  key(k: GameKey): void {
    if (this.mode === 'title' || this.mode === 'end') {
      if (k === 'start' || k === 'a') { this.reset(); this.mode = 'play'; this.deal(); }
      return;
    }
    if (k === 'start') { this.mode = this.mode === 'pause' ? 'play' : 'pause'; return; }
    if (this.mode !== 'play' || !this.cur || this.flash) return;
    if (k === 'left' && !this.collides(this.cur, -1, 0)) this.cur.x--;
    else if (k === 'right' && !this.collides(this.cur, 1, 0)) this.cur.x++;
    else if (k === 'a' || k === 'up') this.rotate();
    else if (k === 'down') { if (!this.collides(this.cur, 0, 1)) this.cur.y++; else this.land(); }
    else if (k === 'b') { while (!this.collides(this.cur, 0, 1)) this.cur.y++; this.land(); }
  }
  tap(): void { this.key(this.mode === 'play' ? 'b' : 'start'); }

  tick(dt: number): void {
    this.clock += dt;
    if (this.cheer && this.cheer.t < 99) { this.cheer.t -= dt; if (this.cheer.t <= 0) this.cheer = null; }
    if (this.mode !== 'play') return;
    if (this.flash) {                                // it tries to throw it out; it stays
      this.flash.t -= dt;
      if (this.flash.t <= 0) { this.flash = null; this.deal(); }
      return;
    }
    if (!this.cur) { this.deal(); return; }
    this.fall += dt;
    const step = Math.max(0.3, 0.75 - this.count * 0.015);
    if (this.fall >= step) {
      this.fall = 0;
      if (!this.collides(this.cur, 0, 1)) this.cur.y++; else this.land();
    }
  }

  takeFiling(): string | null { const f = this.filing; this.filing = null; return f; }

  frameKey(): string {
    const blink = Math.floor(this.clock * 2) % 2;
    const c = this.cur ? `${this.cur.x},${this.cur.y},${this.cur.cells.join(';')}` : '';
    const f = this.flash ? Math.floor(this.flash.t * 8) : -1;
    return `${this.mode}|${blink}|${c}|${f}|${this.clean}|${this.oddIn}|${this.cheer?.text ?? ''}|${this.well.map((r) => r.join('')).join('')}`;
  }

  draw(g: Painter): void {
    px(g, 0, 0, H.screenLight, W, H_);
    const blink = Math.floor(this.clock * 2) % 2 === 0;
    if (this.mode === 'title') {
      text(g, 'FIT IN', Math.round((W - textW('FIT IN', 2)) / 2), 14, H.screenDark, 2);
      px(g, 14, 29, H.screenMid, W - 28, 1);
      text(g, 'MAKE CLEAN LINES', Math.round((W - textW('MAKE CLEAN LINES')) / 2), 34, H.screenMid);
      if (blink) text(g, 'PRESS START', Math.round((W - textW('PRESS START')) / 2), 46, H.screenDark);
      // ⚑ Phase 7 (the Codex pass: the title never said which button does what) — the handheld's own legend
      text(g, '< > MOVE  A TURN', Math.round((W - textW('< > MOVE  A TURN')) / 2), 57, H.screenMid);
      text(g, 'B DROP', Math.round((W - textW('B DROP')) / 2), 64, H.screenMid);
      return;
    }
    // the well: a grey grid of straight lines
    px(g, WX - 1, WY - 1, H.screenDark, COLS * CELL + 2, ROWS * CELL + 2);
    px(g, WX, WY, H.screenLight, COLS * CELL, ROWS * CELL);
    for (let x = 1; x < COLS; x++) px(g, WX + x * CELL, WY, H.screenMid, 1, ROWS * CELL);
    const cell = (x: number, y: number, col: string): void => { if (y >= 0) px(g, WX + x * CELL, WY + y * CELL, col, CELL, CELL); };
    /** an odd cell: the screen's own dither, dark and light — no colour the handheld does not have */
    const odd = (x: number, y: number, lit = false): void => {
      if (y < 0) return;
      const X = WX + x * CELL, Y = WY + y * CELL;
      px(g, X, Y, lit ? H.screenLight : H.screenDark, CELL, CELL);
      for (let j = 0; j < CELL; j++) for (let i = 0; i < CELL; i++) if ((i + j) % 2 === 0) px(g, X + i, Y + j, lit ? H.screenDark : H.screenMid, 1, 1);
    };
    const pulse = this.mode === 'end' && blink;
    this.well.forEach((row, y) => row.forEach((v, x) => { if (v === 1) cell(x, y, H.screenDark); else if (v === 2) odd(x, y, pulse); }));
    if (this.cur) for (const [cx, cy] of this.cur.cells) { if (this.cur.odd) odd(this.cur.x + cx, this.cur.y + cy); else cell(this.cur.x + cx, this.cur.y + cy, H.screenDark); }
    if (this.flash && Math.floor(this.flash.t * 8) % 2 === 0) {
      const p = this.flash.piece;
      for (const [cx, cy] of p.cells) odd(p.x + cx, p.y + cy, true);
    }
    // the side: the score the programme keeps, and the count of what it could not remove
    const SX = WX + COLS * CELL + 4;
    text(g, 'CLEAN', SX, 2, H.screenDark);
    text(g, String(this.clean), SX, 9, H.screenDark);
    text(g, 'ODD', SX, 20, H.screenMid);
    text(g, String(this.oddIn), SX, 27, H.screenMid);
    odd((SX - WX) / CELL, 9); odd((SX - WX) / CELL + 1, 9); odd((SX - WX) / CELL, 10);
    if (this.cheer && this.mode !== 'end') {
      const t = this.cheer.text;
      px(g, WX, 30, H.screenDark, COLS * CELL, 9);
      text(g, t, WX + Math.round((COLS * CELL - textW(t)) / 2), 32, H.screenLight);
    }
    if (this.mode === 'end' && this.cheer) {       // the verdict, across the whole glass
      const t = this.cheer.text;
      px(g, 0, 26, H.screenDark, W, 11);
      text(g, t, Math.round((W - textW(t)) / 2), 29, H.screenLight);
      px(g, 0, 40, H.screenDark, W, 9); text(g, 'THEY STAYED', Math.round((W - textW('THEY STAYED')) / 2), 42, H.screenLight);
      if (blink) text(g, 'START', Math.round((W - textW('START')) / 2), 56, H.screenDark);
    }
    if (this.mode === 'pause') {
      px(g, WX, 44, H.screenDark, COLS * CELL, 9);
      text(g, 'PAUSE', WX + Math.round((COLS * CELL - textW('PAUSE')) / 2), 46, H.screenLight);
    }
  }
}
