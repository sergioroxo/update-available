/**
 * ROOTCAUSE.EXE — Root Cause Digger (W-L1, Sérgio's pick 2026-09-20; his
 * design: `Pc_Simulation/Lamby Games/Mini-Games_LAmby.md` §1, "Dig Dug").
 *
 * The second file on the companion disk, beside lamby_rig.exe: the fellowship's
 * own shovelware. Lamby digs down through the layers of a life — Childhood,
 * School, Father… Body — because the programme says the ROOT CAUSE is buried
 * there. The things that chase him are not monsters, they are DIAGNOSES; a
 * diagnosis that reaches him is APPLIED, and three of them make the programme's
 * report. Press one beside you to inflate it with a therapy word until it
 * bursts ("it was only a word"); lure two into one cell and they glitch each
 * other out ("fake labels"). Somewhere in the two deepest layers the AUTHENTIC
 * MEMORY is buried, and uncovering it is the one thing the programme flags.
 *
 * ⚑ PRESS-ONLY, TURN-BASED. No WASD, ever (CLAUDE.md): every press digs one
 * cell beside Lamby and is one turn — the diagnoses move after it, through the
 * tunnels the player dug (and now and then straight through the earth, the way
 * Dig Dug's did). A person in a headset plays it with the trigger; the walker
 * plays it with its presses. Register: operable. The satire is the programme's
 * own words, and it collapses on its own report — the deepest finding is "dig
 * deeper".
 *
 * ○ SANDBOX by the Progression Law: on the desktop from the disk, ○ on the
 * map, one soft guide line, never required, leavable at any moment. Both
 * endings file to the record (`rootcause:memory`, flagged; `rootcause:report`);
 * leaving mid-game files nothing.
 *
 * All wording in data/strings/rootcause.json.
 */
import { ERA1 } from '../theme/era1';
import * as ui from '../theme/chrome';
import { ledger } from '../../state/ledger';
import { drawLambyChar } from './lambyChar';
import copy from '../../../data/strings/rootcause.json';

interface Hit { x: number; y: number; w: number; h: number; id: string }
interface Cell { r: number; c: number }
interface Diagnosis { name: string; r: number; c: number; home: Cell; pumps: number; alive: boolean }

const COLS = 12;
const ROWS = copy.layers.length;   // one row per layer
const CELL_W = 30; const CELL_H = 26;
const WIN_X = 24; const WIN_Y = 10; const WIN_W = 464; const WIN_H = 344;
const LABEL_W = 96;
const APPLIED_TO_REPORT = 3;
const PUMPS_TO_BURST = 3;
/** a diagnosis with no tunnel to Lamby ghosts one step through earth every other turn —
 *  by turn, not by chance, so a game always closes in a few dozen presses */
const GHOST_EVERY = 2;

type Phase = 'intro' | 'digging' | 'flag' | 'report';

export class RootCauseApp {
  open = true;
  dirty = true;
  /** the OS listens: the window closed */
  onClose?: () => void;

  private phase: Phase = 'intro';
  private t = 0;
  private dug: boolean[][] = [];
  private lamby: Cell = { r: 0, c: 5 };
  private memory: Cell;
  private diagnoses: Diagnosis[] = [];
  private applied: string[] = [];
  private seenLayers = new Set<number>();
  private message = '';
  private turn = 0;
  private messageT = 0;
  private hits: Hit[] = [];
  private filed = false;

  constructor() {
    for (let r = 0; r < ROWS; r++) this.dug.push(new Array(COLS).fill(false));
    this.dug[0][5] = true;   // Lamby's own pocket on the surface layer
    // the memory: one of the two deepest layers, never under the start column
    const mr = ROWS - 1 - (Math.random() < 0.5 ? 0 : 1);
    let mc = Math.floor(Math.random() * COLS);
    if (mc === 5) mc = 9;
    this.memory = { r: mr, c: mc };
    // three diagnoses in pockets at the sides; the rest arrive as he goes deeper
    const names = [...copy.diagnoses];
    const pockets: Cell[] = [{ r: 1, c: 0 }, { r: 3, c: COLS - 1 }, { r: 5, c: 0 }, { r: 2, c: COLS - 1 }];
    pockets.forEach((p, i) => this.spawn(names[i], p));
  }

  private spawn(name: string, at: Cell): void {
    this.dug[at.r][at.c] = true;
    this.diagnoses.push({ name, r: at.r, c: at.c, home: { ...at }, pumps: 0, alive: true });
  }

  update(dt: number): void {
    this.t += dt;
    if (this.messageT > 0) this.messageT -= dt;
    this.dirty = true;
  }

  private say(text: string, hold = 4): void { this.message = text; this.messageT = hold; }

  // ── the turn ────────────────────────────────────────────────────────────
  private dig(to: Cell): void {
    this.dug[to.r][to.c] = true;
    this.lamby = { ...to };
    if (!this.seenLayers.has(to.r)) {
      this.seenLayers.add(to.r);
      this.say(copy.findings[to.r] ?? '');
      // the deeper he goes, the more of them there are
      if (to.r === 3 || to.r === 5) {
        const name = copy.diagnoses[this.diagnoses.length];
        if (name) this.spawn(name, { r: to.r + 1, c: to.c < COLS / 2 ? COLS - 1 : 0 });
      }
    }
    if (to.r === this.memory.r && to.c === this.memory.c) {
      this.say(copy.memoryFound);
      this.phase = 'flag';
      this.file('memory');
      return;
    }
    this.moveDiagnoses();
  }

  private pump(d: Diagnosis): void {
    d.pumps += 1;
    if (d.pumps >= PUMPS_TO_BURST) {
      d.alive = false;
      this.say(copy.burst.replace('{name}', d.name));
    } else {
      const word = copy.therapyWords[(d.pumps - 1) % copy.therapyWords.length];
      this.say(copy.pumped.replace('{name}', d.name).replace('{word}', word));
    }
    this.moveDiagnoses();
  }

  /** every living diagnosis takes one step toward Lamby — through the tunnels,
   *  or, when there is no tunnel, now and then straight through the earth */
  private moveDiagnoses(): void {
    this.turn += 1;
    for (const [i, d] of this.diagnoses.entries()) {
      if (!d.alive) continue;
      const next = this.stepToward(d, (this.turn + i) % GHOST_EVERY === 0);
      if (next) { d.r = next.r; d.c = next.c; }
    }
    // two in one cell: both glitch — the labels cancel
    const alive = this.diagnoses.filter((d) => d.alive);
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i]; const b = alive[j];
        if (a.alive && b.alive && a.r === b.r && a.c === b.c) {
          a.alive = false; b.alive = false;
          this.say(copy.glitched.replace('{a}', a.name).replace('{b}', b.name));
        }
      }
    }
    // one on Lamby: applied, and it goes home
    for (const d of this.diagnoses) {
      if (!d.alive || d.r !== this.lamby.r || d.c !== this.lamby.c) continue;
      this.applied.push(d.name);
      this.say(copy.applied.replace('{name}', d.name));
      d.r = d.home.r; d.c = d.home.c; d.pumps = 0;
      if (this.applied.length >= APPLIED_TO_REPORT) {
        this.phase = 'report';
        this.file('report');
        return;
      }
    }
  }

  /** breadth-first through dug cells; null when unreachable (then maybe a ghost step) */
  private stepToward(d: Diagnosis, mayGhost: boolean): Cell | null {
    const key = (r: number, c: number): number => r * COLS + c;
    const prev = new Map<number, number>();
    const queue: Cell[] = [{ r: d.r, c: d.c }];
    prev.set(key(d.r, d.c), -1);
    const target = key(this.lamby.r, this.lamby.c);
    let found = false;
    while (queue.length && !found) {
      const cur = queue.shift()!;
      for (const n of this.neighbours(cur)) {
        const k = key(n.r, n.c);
        if (prev.has(k) || !this.dug[n.r][n.c]) continue;
        prev.set(k, key(cur.r, cur.c));
        if (k === target) { found = true; break; }
        queue.push(n);
      }
    }
    if (found) {
      // walk back from Lamby to the cell after the diagnosis
      let k = target; let p = prev.get(k)!;
      while (p !== key(d.r, d.c)) { k = p; p = prev.get(k)!; }
      return { r: Math.floor(k / COLS), c: k % COLS };
    }
    if (mayGhost) {
      // ghost: one step through anything, straight toward him
      const dr = Math.sign(this.lamby.r - d.r); const dc = Math.sign(this.lamby.c - d.c);
      if (Math.abs(this.lamby.r - d.r) >= Math.abs(this.lamby.c - d.c) && dr) return { r: d.r + dr, c: d.c };
      if (dc) return { r: d.r, c: d.c + dc };
      if (dr) return { r: d.r + dr, c: d.c };
    }
    return null;
  }

  private neighbours(c: Cell): Cell[] {
    const out: Cell[] = [];
    if (c.r > 0) out.push({ r: c.r - 1, c: c.c });
    if (c.r < ROWS - 1) out.push({ r: c.r + 1, c: c.c });
    if (c.c > 0) out.push({ r: c.r, c: c.c - 1 });
    if (c.c < COLS - 1) out.push({ r: c.r, c: c.c + 1 });
    return out;
  }
  /** the press's name is its DIRECTION from Lamby — four ids for the whole grid, so a
   *  blind walk is bounded by its own per-control cap and the game still ends */
  private dirOf(from: Cell, to: Cell): string {
    return to.r < from.r ? 'up' : to.r > from.r ? 'down' : to.c < from.c ? 'left' : 'right';
  }

  private file(which: 'memory' | 'report'): void {
    if (this.filed) return;
    this.filed = true;
    const w = copy.witness[which];
    ledger.records.push(`rootcause-${which}:${w}`);   // one colon: the record reads the line after it
  }

  // ── drawing ─────────────────────────────────────────────────────────────
  draw(ctx: CanvasRenderingContext2D): void {
    this.hits = [];
    const c = ui.windowFrame(ctx, WIN_X, WIN_Y, WIN_W, WIN_H, copy.title, true, 'rootcause');
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.black);
    // ⚑ the close box is registered LAST (see the end of draw): the walker takes
    //   the first untried control, and a game whose first control is its exit
    //   is a game the walk never plays
    const closeBox = { ...c.closeBox, id: 'rootcause-close' };

    if (this.phase === 'intro') {
      ui.setFont(ctx, 12);
      ctx.fillStyle = ERA1.tooltip;
      ctx.fillText(copy.title.split(' — ')[1] ?? copy.title, c.x + 20, c.y + 20);
      ui.setFont(ctx, 10);
      copy.intro.forEach((line, i) => { ctx.fillStyle = ERA1.silver; ctx.fillText(line, c.x + 20, c.y + 48 + i * 14); });
      drawLambyChar(ctx, c.x + c.w - 80, c.y + 120, { mood: 'cheerful', action: 'idle', t: this.t, moodStart: 0, scale: 0.6 });
      ui.button(ctx, c.x + 20, c.y + c.h - 34, 80, 22, copy.start, {});
      this.hits.push({ x: c.x + 20, y: c.y + c.h - 34, w: 80, h: 22, id: 'rootcause-start' });
      this.hits.push(closeBox);
      return;
    }

    const gx = c.x + LABEL_W; const gy = c.y + 8;
    // the sky and the layers
    ui.px(ctx, gx, gy - 6, COLS * CELL_W, 6, ERA1.teal);
    for (let r = 0; r < ROWS; r++) {
      const y = gy + r * CELL_H;
      ui.setFont(ctx, 8);
      ctx.fillStyle = r === this.lamby.r ? ERA1.tooltip : ERA1.grey;
      ctx.fillText(copy.layers[r].toUpperCase(), c.x + 6, y + 8);
      for (let col = 0; col < COLS; col++) {
        const x = gx + col * CELL_W;
        const deep = r / ROWS;
        // earth darkens with depth; a tunnel is the void
        ui.px(ctx, x, y, CELL_W, CELL_H, this.dug[r][col] ? ERA1.black : (deep < 0.35 ? ERA1.olive : deep < 0.7 ? ERA1.warnDark : ERA1.greyDark));
        if (!this.dug[r][col]) {
          ui.px(ctx, x + 3 + ((r * 7 + col * 5) % 9), y + 5 + ((r * 3 + col * 11) % 11), 2, 2, ERA1.black);
        }
        ui.px(ctx, x, y, CELL_W, 1, ERA1.black);
        ui.px(ctx, x, y, 1, CELL_H, ERA1.black);
      }
    }
    // the diagnoses
    ui.setFont(ctx, 7);
    for (const d of this.diagnoses) {
      if (!d.alive) continue;
      const x = gx + d.c * CELL_W; const y = gy + d.r * CELL_H;
      const grow = d.pumps * 2;
      ui.px(ctx, x + 3 - grow, y + 4 - grow, CELL_W - 6 + grow * 2, CELL_H - 8 + grow * 2, ERA1.warn);
      ctx.fillStyle = ERA1.white;
      ctx.fillText(d.name.split(' ')[0].slice(0, 6), x + 4 - grow, y + 8 - grow);
    }
    // Lamby, small, in his cell
    if (this.phase === 'digging') {
      drawLambyChar(ctx, gx + this.lamby.c * CELL_W + CELL_W / 2, gy + this.lamby.r * CELL_H + CELL_H - 2,
        { mood: 'cheerful', action: 'idle', t: this.t, moodStart: 0, scale: 0.18 });
      // the presses: the earth beside him, and any diagnosis beside him
      for (const n of this.neighbours(this.lamby)) {
        const x = gx + n.c * CELL_W; const y = gy + n.r * CELL_H;
        const dIdx = this.diagnoses.findIndex((d) => d.alive && d.r === n.r && d.c === n.c);
        if (dIdx >= 0) {
          this.hits.push({ x, y, w: CELL_W, h: CELL_H, id: `pump:${this.dirOf(this.lamby, n)}` });
          continue;
        }
        // a faint mark on the pressable earth — the hand names it; this only says "here"
        ui.px(ctx, x + CELL_W / 2 - 1, y + CELL_H / 2 - 1, 2, 2, ERA1.tooltip);
        this.hits.push({ x, y, w: CELL_W, h: CELL_H, id: `dig:${this.dirOf(this.lamby, n)}` });
      }
    }
    // the line under the earth
    const ly = gy + ROWS * CELL_H + 6;
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.silver;
    ctx.fillText(this.messageT > 0 || this.phase !== 'digging' ? this.message : copy.hint, c.x + 6, ly);
    ctx.fillStyle = ERA1.grey;
    ctx.fillText(`applied ${this.applied.length}/${APPLIED_TO_REPORT}`, c.x + c.w - 70, ly);

    if (this.phase === 'flag' || this.phase === 'report') {
      const box = this.phase === 'flag' ? copy.flag : copy.report;
      const bw = 300; const bh = 110;
      const bx = c.x + Math.round((c.w - bw) / 2); const by = c.y + 70;
      const f = ui.windowFrame(ctx, bx, by, bw, bh, box.title, true);
      ui.px(ctx, f.x, f.y, f.w, f.h, ERA1.beige);
      ui.setFont(ctx, 10);
      box.lines.forEach((line, i) => {
        ctx.fillStyle = this.phase === 'flag' ? ERA1.warnDark : ERA1.black;
        ctx.fillText(line.replace('{list}', this.applied.join(', ')), f.x + 8, f.y + 6 + i * 13);
      });
      ui.button(ctx, f.x + f.w - 70, f.y + f.h - 24, 62, 18, copy.close, {});
      this.hits.push({ x: f.x + f.w - 70, y: f.y + f.h - 24, w: 62, h: 18, id: 'rootcause-close' });
    }
    this.hits.push(closeBox);
  }

  handleClick(x: number, y: number): void {
    const hit = this.hits.find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (!hit) return;
    this.dirty = true;
    if (hit.id === 'rootcause-close') { this.open = false; this.onClose?.(); return; }
    if (hit.id === 'rootcause-start') { this.phase = 'digging'; this.seenLayers.add(0); return; }
    if (this.phase !== 'digging') return;
    const target = this.neighbours(this.lamby).find((n) => this.dirOf(this.lamby, n) === hit.id.split(':')[1]);
    if (!target) return;
    if (hit.id.startsWith('dig:')) { this.dig(target); return; }
    if (hit.id.startsWith('pump:')) {
      const d = this.diagnoses.find((d) => d.alive && d.r === target.r && d.c === target.c);
      if (d) this.pump(d);
    }
  }
}
