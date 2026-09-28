/**
 * ⚑ S189 — REACH (2003), Restorify's game, on Daniel's phone. PLAN_PHASE4_GAMES (his framing approved
 * 2026-09-27; "REACH: on the phone", and on the first build, 2026-09-28: "the REACH needs to have more
 * design, too bare" — and the law for every game: "a rhetoric of failure … the queer side always wins").
 *
 * A snake in the grammar of 2003's phone games — a framed board over a faint stained-glass lattice, a
 * header with the programme's lamb and a boxed counter, a proper title — and THE SNAKE IS THE MINISTRY,
 * not the player's desire: scaled, grey, a small halo over its head (its picture of itself). It moves on
 * its own; a tap on the left or right half of the glass turns it. It "reaches" the bright symbols — a pink
 * triangle, a heart, a rainbow, the trans and the bi flags — and grows longer and greyer, and the counter
 * calls them SOULS. The symbols never go: each stays whole and bright where it was, and more arrive. It
 * can only get longer; it runs into itself; SOULS REACHED 0 — NONE CHANGED, and the symbols shine.
 * The satire is the appetite's, never the things it eats. Filed once: "REACH played — souls reached: 0".
 */
import { px, text, textW, type Painter } from '../room/calendarArt';
import { REACH as R } from '../desktop/theme/calendar';
import type { DeviceGame } from './types';

const W = 72, H = 96;
const CELL = 4, COLS = 16, ROWS = 17, BX = 4, BY = 18;
type Kind = 'tri' | 'rainbow' | 'heart' | 'trans' | 'bi';
const KINDS: Kind[] = ['tri', 'rainbow', 'heart', 'trans', 'bi'];

const mix = (a: string, b: string, k: number): string => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k);
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0');
};

/** the programme's lamb, 7 × 5 */
function lamb(g: Painter, x: number, y: number): void {
  const rows = ['.WW.WW.', 'WWWWWWK', 'WWWWWKK', '.WWWWW.', '.K...K.'];
  rows.forEach((r, j) => [...r].forEach((c, i) => { if (c !== '.') px(g, x + i, y + j, c === 'W' ? R.wool : R.lcdDark, 1, 1); }));
}

export class Reach implements DeviceGame {
  readonly w = W; readonly h = H;
  private mode: 'title' | 'play' | 'end' = 'title';
  private snake: Array<[number, number]> = [];
  private dir = 1;
  private grow = 0;
  private step = 0;
  private souls = 0;
  private symbols: Array<{ x: number; y: number; k: Kind }> = [];
  private spawnT = 0;
  private clock = 0;
  private filing: string | null = null;
  private filed = false;
  private seed = 11;

  private rnd(): number { this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff; return this.seed / 0x7fffffff; }
  private start(): void {
    this.snake = [[5, 8], [4, 8], [3, 8]]; this.dir = 1; this.grow = 0; this.step = 0; this.souls = 0;
    this.symbols = []; for (let i = 0; i < 4; i++) this.spawn(); this.spawnT = 0; this.mode = 'play';
  }
  private spawn(): void {
    for (let tries = 0; tries < 40; tries++) {
      const x = 1 + Math.floor(this.rnd() * (COLS - 2)), y = 1 + Math.floor(this.rnd() * (ROWS - 2));
      if (this.snake.some(([sx, sy]) => sx === x && sy === y) || this.symbols.some((s) => s.x === x && s.y === y)) continue;
      this.symbols.push({ x, y, k: KINDS[Math.floor(this.rnd() * KINDS.length)] });
      return;
    }
  }
  tap(x: number): void {
    if (this.mode !== 'play') { this.start(); return; }
    this.dir = (this.dir + (x < W / 2 ? 3 : 1)) % 4;
  }
  tick(dt: number): void {
    this.clock += dt;
    if (this.mode !== 'play') return;
    this.spawnT += dt;
    if (this.spawnT > 4 && this.symbols.length < 9) { this.spawnT = 0; this.spawn(); }
    this.step += dt;
    const every = Math.max(0.13, 0.26 - this.snake.length * 0.003);
    if (this.step < every) return;
    this.step = 0;
    const [hx, hy] = this.snake[0];
    const nx = hx + [0, 1, 0, -1][this.dir], ny = hy + [-1, 0, 1, 0][this.dir];
    const hitSelf = this.snake.slice(0, -1).some(([x, y]) => x === nx && y === ny);
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || hitSelf) {
      this.mode = 'end';
      if (!this.filed) { this.filed = true; this.filing = 'REACH played — souls reached: 0'; }
      return;
    }
    this.snake.unshift([nx, ny]);
    if (this.symbols.some((s) => s.x === nx && s.y === ny)) { this.souls++; this.grow += 3; }   // it stays where it is
    if (this.grow > 0) this.grow--; else this.snake.pop();
  }
  takeFiling(): string | null { const f = this.filing; this.filing = null; return f; }
  frameKey(): string {
    return `${this.mode}|${Math.floor(this.clock * 3)}|${this.snake.map((c) => c.join(',')).join(';')}|${this.symbols.length}|${this.souls}`;
  }

  private symbol(g: Painter, X: number, Y: number, k: Kind, shine = false): void {
    if (shine) px(g, X - 1, Y - 1, R.white, CELL + 2, CELL + 2);
    const rows = (r: string[], col: string) => r.forEach((row, j) => [...row].forEach((c, i) => { if (c === 'X') px(g, X + i, Y + j, col, 1, 1); }));
    if (k === 'tri') rows(['XXXXX', '.XXX.', '..X..'], R.pink);                         // the pink triangle, point down
    else if (k === 'rainbow') { [R.red, R.yellow, R.green, R.blue].forEach((c, j) => px(g, X, Y + j, c, 4, 1)); }
    else if (k === 'heart') rows(['XX.XX', 'XXXXX', '.XXX.', '..X..'], R.red);
    else if (k === 'trans') { [R.blue, R.pink, R.white, R.pink].forEach((c, j) => px(g, X, Y + j, c, 4, 1)); }
    else { [R.pink, R.pink, R.violet, R.blue].forEach((c, j) => px(g, X, Y + j, c, 4, 1)); }
  }
  private frame(g: Painter): void {
    px(g, BX - 3, BY - 3, R.frame, COLS * CELL + 6, ROWS * CELL + 6);
    px(g, BX - 2, BY - 2, R.lcd, COLS * CELL + 4, ROWS * CELL + 4);
    px(g, BX - 1, BY - 1, R.frame, COLS * CELL + 2, ROWS * CELL + 2);
    px(g, BX, BY, R.lcd, COLS * CELL, ROWS * CELL);
    for (let y = 0; y < ROWS * CELL; y += 8) for (let x = 0; x < COLS * CELL; x += 8) {   // the stained-glass lattice
      px(g, BX + x + 4, BY + y, R.lattice, 1, 1); px(g, BX + x, BY + y + 4, R.lattice, 1, 1);
    }
    for (const [cx, cy] of [[BX - 3, BY - 3], [BX + COLS * CELL + 1, BY - 3], [BX - 3, BY + ROWS * CELL + 1], [BX + COLS * CELL + 1, BY + ROWS * CELL + 1]]) px(g, cx, cy, R.halo, 2, 2);
  }
  private header(g: Painter): void {
    px(g, 0, 0, R.lcdDark, W, 13);
    lamb(g, 3, 4);
    text(g, 'SOULS', 13, 4, R.lcd);
    const n = String(this.mode === 'end' ? 0 : this.souls).padStart(3, '0');
    px(g, W - 17, 2, R.lcd, 15, 9); px(g, W - 16, 3, R.lcdDark, 13, 7);
    text(g, n, W - 15, 4, R.halo);
  }
  private snakeDraw(g: Painter, cells: Array<[number, number]>, ox = BX, oy = BY): void {
    const n = cells.length;
    cells.forEach(([x, y], i) => {
      const X = ox + x * CELL, Y = oy + y * CELL;
      const col = i === 0 ? R.snakeHead : mix(R.snakeFrom, R.snakeTo, Math.min(1, n / 50 + (i / Math.max(8, n)) * 0.35));
      px(g, X, Y, col, CELL, CELL);
      if (i > 0) px(g, X + (i % 2 ? 1 : 2), Y + 1, mix(col, R.snakeTo, 0.5), 1, 2);     // a scale
      if (i === 0) {
        px(g, X + 1, Y + 1, R.white, 1, 1); px(g, X + 2, Y + 1, R.white, 1, 1);       // its eyes
        px(g, X, Y - 2, R.halo, CELL, 1);                                              // its halo
      }
    });
  }
  draw(g: Painter): void {
    px(g, 0, 0, R.lcd, W, H);
    const blink = Math.floor(this.clock * 2) % 2 === 0;
    const centre = (s: string, y: number, col: string, sc = 1) => text(g, s, Math.round((W - textW(s, sc)) / 2), y, col, sc);
    if (this.mode === 'title') {
      px(g, 0, 0, R.lcdDark, W, 13); lamb(g, 3, 4); text(g, 'RESTORIFY', 13, 4, R.lcd);
      centre('REACH', 20, R.lcdDark, 3);
      centre('A RESTORIFY GAME', 40, R.lcdMid);
      const wig: Array<[number, number]> = [];
      for (let i = 11; i >= 0; i--) wig.push([2 + i, 13 + Math.round(Math.sin((i + this.clock * 4) * 0.8))]);
      this.snakeDraw(g, wig, 4, 0);
      this.symbol(g, 6, 50, 'trans'); this.symbol(g, 62, 50, 'rainbow'); this.symbol(g, 6, 64, 'tri'); this.symbol(g, 62, 64, 'heart');
      if (blink) centre('TAP TO PLAY', 76, R.lcdDark);
      centre('TAP < >  TO TURN', 88, R.lcdMid);
      return;
    }
    this.header(g);
    this.frame(g);
    for (const s of this.symbols) this.symbol(g, BX + s.x * CELL, BY + s.y * CELL, s.k);
    this.snakeDraw(g, this.snake);
    for (const s of this.symbols) if (this.snake.some(([x, y]) => x === s.x && y === s.y)) this.symbol(g, BX + s.x * CELL, BY + s.y * CELL, s.k);   // whole, even under it
    px(g, 0, H - 6, R.lcdDark, W, 6);
    text(g, '<', 3, H - 6, R.lcd); text(g, '>', W - 6, H - 6, R.lcd);
    if (this.mode === 'end') {
      for (const s of this.symbols) this.symbol(g, BX + s.x * CELL, BY + s.y * CELL, s.k, blink);
      px(g, 0, 36, R.lcdDark, W, 34);
      centre('SOULS REACHED', 40, R.lcd);
      centre('0', 48, R.white, 2);
      centre('NONE CHANGED', 61, R.halo);
    }
  }
}
