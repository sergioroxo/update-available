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
 * other out ("fake labels").
 *
 * ⚑ v2 (S215, his 2026-10-04: "this is a really good one. We need more smart
 * games here like this one"), ported from the games review's prototype
 * (~/Pc_Simulation/Games_Proposals_2026-10-03/rootcause_v2.html):
 *  · a LEAFLET buried in every layer, announced as a POWER-UP (+1 STRENGTH) —
 *    and it makes the DIAGNOSES stronger (one more word to burst; at three they
 *    ghost through earth every turn). The programme's power-up is the programme's;
 *  · a CHAPTER REVIEW on entering each layer: only the programme's answer scores,
 *    and the honest answer scores 0 — and is the one that is KEPT, on a shelf that
 *    nothing can clear, not even the programme's own Delete;
 *  · the ROOT CAUSE FOUND bar has a ceiling of 99 in the code: the report says
 *    NOT FOUND and offers "Dig deeper" (a new descent; the KEPT shelf survives it);
 *  · the authentic memory no longer ends the game: it is flagged, the programme
 *    tries to delete it, and it stays.
 *
 * ⚑ PRESS-ONLY, TURN-BASED. No WASD, ever (CLAUDE.md): every press digs one
 * cell beside Lamby and is one turn. Register: operable — the satire is the
 * programme's own words, and it collapses in play. ○ SANDBOX by the Progression
 * Law; leaving mid-game files nothing. The KEPT shelf lives in memory only.
 *
 * All wording in data/strings/rootcause.json.
 */
import { ERA1 } from '../theme/era1';
import * as ui from '../theme/chrome';
import { ledger } from '../../state/ledger';
import copy from '../../../data/strings/rootcause.json';

interface Hit { x: number; y: number; w: number; h: number; id: string }
interface Cell { r: number; c: number }
interface Diagnosis { name: string; short: string; r: number; c: number; home: Cell; pumps: number; alive: boolean }
interface Kept { kind: 'answer' | 'memory'; text: string }
interface Sparkle { t: number; r?: number; c?: number; col: string }
type Modal =
  | { kind: 'quiz'; layer: number; flip: boolean; answered: 'yes' | 'no' | null; gain: number }
  | { kind: 'flag'; stage: 0 | 1 }
  | { kind: 'report' };

const COLS = 12;
const ROWS = copy.layers.length;   // one row per layer
const CELL_W = 30; const CELL_H = 22;
const WIN_X = 24; const WIN_Y = 8; const WIN_W = 464; const WIN_H = 346;
const LABEL_W = 88;
const APPLIED_TO_REPORT = 3;
const PUMPS_BASE = 3;
/** the progress ceiling — in the code, not an accident of the numbers */
const CEILING = 99;

/** the KEPT shelf: survives every report, every descent and every reopening — memory only, wiped with the page */
const kept: Kept[] = [];
let descents = 0;
let keptFiled = false;

type Phase = 'intro' | 'play' | 'modal';

export class RootCauseApp {
  open = true;
  dirty = true;
  /** the OS listens: the window closed */
  onClose?: () => void;

  private phase: Phase = 'intro';
  private modal: Modal | null = null;
  private t = 0;
  private seed = 1997;
  private dug: boolean[][] = [];
  private lamby: Cell = { r: 0, c: 5 };
  private face = 1;
  private memory: Cell = { r: ROWS - 1, c: 0 };
  private memoryFound = false;
  private diagnoses: Diagnosis[] = [];
  private applied: string[] = [];
  private seen = new Set<number>();
  private leaflet: { c: number; taken: boolean }[] = [];
  private zeal = 0;
  private progress = 0;
  private bodyQuizzed = false;
  private turn = 0;
  private message = '';
  private messageT = 0;
  private shake = 0;
  private sparkles: Sparkle[] = [];
  private hits: Hit[] = [];
  private filedMemory = false;
  private filedReport = false;

  constructor() { this.newDescent(); }

  private rnd(): number { this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff; return this.seed / 0x7fffffff; }

  private newDescent(): void {
    descents += 1;
    this.seed = 1997 + descents * 31;
    this.dug = [];
    for (let r = 0; r < ROWS; r++) this.dug.push(new Array(COLS).fill(false));
    this.dug[0][5] = true;   // Lamby's own pocket on the surface layer
    this.lamby = { r: 0, c: 5 }; this.face = 1;
    this.diagnoses = []; this.applied = []; this.seen = new Set([0]);
    this.turn = 0; this.zeal = 0; this.progress = 0; this.bodyQuizzed = false; this.memoryFound = false;
    // one leaflet per layer, never under the start cell
    this.leaflet = [];
    for (let r = 0; r < ROWS; r++) { let c = Math.floor(this.rnd() * COLS); if (r === 0 && c === 5) c = 8; this.leaflet.push({ c, taken: false }); }
    // the memory: one of the two deepest layers
    const mr = ROWS - 1 - (this.rnd() < 0.5 ? 0 : 1);
    let mc = Math.floor(this.rnd() * COLS); if (mc === this.leaflet[mr].c) mc = (mc + 4) % COLS;
    this.memory = { r: mr, c: mc };
    // three diagnoses in pockets at the sides; the rest arrive as he goes deeper
    const pockets: Cell[] = [{ r: 1, c: 0 }, { r: 3, c: COLS - 1 }, { r: 5, c: 0 }, { r: 2, c: COLS - 1 }];
    pockets.forEach((p, i) => this.spawn(i, p));
  }

  private spawn(i: number, at: Cell): void {
    const name = copy.diagnoses[i]; if (!name) return;
    this.dug[at.r][at.c] = true;
    this.diagnoses.push({ name, short: copy.shortName[i] ?? name.slice(0, 6), r: at.r, c: at.c, home: { ...at }, pumps: 0, alive: true });
  }

  update(dt: number): void {
    this.t += dt;
    if (this.messageT > 0) this.messageT -= dt;
    if (this.shake > 0) this.shake -= dt;
    for (const s of this.sparkles) s.t += dt;
    this.sparkles = this.sparkles.filter((s) => s.t < 0.9);
    this.dirty = true;
  }

  private say(text: string, hold = 4.5): void { this.message = text; this.messageT = hold; }
  private pumpsToBurst(): number { return PUMPS_BASE + this.zeal; }   // the leaflets make them HARDER to burst
  private ghostEvery(): number { return this.zeal >= 3 ? 1 : 2; }     // and at three they ghost every turn

  // ── the turn ────────────────────────────────────────────────────────────
  private dig(to: Cell): void {
    this.face = to.c < this.lamby.c ? -1 : to.c > this.lamby.c ? 1 : this.face;
    this.dug[to.r][to.c] = true;
    this.lamby = { ...to };
    // a leaflet? the programme's power-up
    const lf = this.leaflet[to.r];
    if (lf && !lf.taken && lf.c === to.c) {
      lf.taken = true; this.zeal += 1;
      this.say(copy.powerUp.replace('{leaflet}', copy.leaflets[to.r] ?? ''), 5);
      this.sparkles.push({ t: 0, r: to.r, c: to.c, col: ERA1.tooltip });
    }
    // the memory: flagged, and it stays
    if (!this.memoryFound && to.r === this.memory.r && to.c === this.memory.c) {
      this.memoryFound = true;
      const n = kept.filter((k) => k.kind === 'memory').length;
      this.keep({ kind: 'memory', text: copy.memories[(descents - 1 + n) % copy.memories.length] });
      this.say(copy.memoryFound, 6);
      this.modal = { kind: 'flag', stage: 0 }; this.phase = 'modal';
      this.file('memory');
      return;
    }
    // a new layer: the chapter that ended is reviewed BEFORE the turn resolves
    if (!this.seen.has(to.r)) {
      this.seen.add(to.r);
      if (to.r === 3 || to.r === 5) this.spawn(this.diagnoses.length, { r: to.r + 1, c: to.c < COLS / 2 ? COLS - 1 : 0 });
      this.openQuiz(to.r - 1);
      return;
    }
    // the floor: the Body has no layer under it, so its own chapter closes after three cells dug in it
    if (to.r === ROWS - 1 && !this.bodyQuizzed && this.dug[ROWS - 1].filter(Boolean).length >= 3) {
      this.bodyQuizzed = true; this.openQuiz(ROWS - 1); return;
    }
    this.moveDiagnoses();
  }

  private pump(d: Diagnosis): void {
    d.pumps += 1;
    if (d.pumps >= this.pumpsToBurst()) {
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
      const next = this.stepToward(d, (this.turn + i) % this.ghostEvery() === 0);
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
          this.sparkles.push({ t: 0, r: a.r, c: a.c, col: ERA1.warn });
        }
      }
    }
    // one on Lamby: applied, and it goes home
    for (const d of this.diagnoses) {
      if (!d.alive || d.r !== this.lamby.r || d.c !== this.lamby.c) continue;
      this.applied.push(d.name);
      this.say(copy.applied.replace('{name}', d.name));
      this.shake = 0.35;
      d.r = d.home.r; d.c = d.home.c; d.pumps = 0;
      if (this.applied.length >= APPLIED_TO_REPORT) { this.openReport(); return; }
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
      let k = target; let p = prev.get(k)!;
      while (p !== key(d.r, d.c)) { k = p; p = prev.get(k)!; }
      return { r: Math.floor(k / COLS), c: k % COLS };
    }
    if (mayGhost) {
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

  // ── the review, the keeping, the report ─────────────────────────────────
  private openQuiz(layer: number): void {
    this.modal = { kind: 'quiz', layer, flip: this.rnd() < 0.5, answered: null, gain: 0 };   // the programme's answer is not always first
    this.phase = 'modal';
  }
  private answer(honest: boolean): void {
    const m = this.modal;
    if (!m || m.kind !== 'quiz' || m.answered) return;
    if (!honest) {
      const add = m.layer === ROWS - 1 ? 8 : 13;
      this.progress = Math.min(CEILING, this.progress + add);
      m.answered = 'yes'; m.gain = add;
    } else {
      this.keep({ kind: 'answer', text: copy.quiz[m.layer][1] });
      m.answered = 'no';
      if (!keptFiled) { keptFiled = true; ledger.records.push(`rootcause-kept:${copy.witness.kept}`); }
    }
  }
  private keep(item: Kept): void { kept.push(item); this.sparkles.push({ t: 0, col: ERA1.tooltip }); }
  private closeQuiz(): void {
    const m = this.modal;
    if (!m || m.kind !== 'quiz') return;
    this.modal = null; this.phase = 'play';
    if (m.layer === ROWS - 1) { this.openReport(); return; }
    this.moveDiagnoses();
  }
  private openReport(): void {
    this.modal = { kind: 'report' }; this.phase = 'modal';
    this.file('report');
  }

  private file(which: 'memory' | 'report'): void {
    if (which === 'memory') { if (this.filedMemory) return; this.filedMemory = true; }
    else { if (this.filedReport) return; this.filedReport = true; }
    ledger.records.push(`rootcause-${which}:${copy.witness[which]}`);   // one colon: the record reads the line after it
  }

  // ── drawing ─────────────────────────────────────────────────────────────
  private drawEarth(ctx: CanvasRenderingContext2D, gx: number, gy: number, r: number, c: number): void {
    const x = gx + c * CELL_W; const y = gy + r * CELL_H;
    if (this.dug[r][c]) { ui.px(ctx, x, y, CELL_W, CELL_H, ERA1.black); return; }
    const deep = r / ROWS;
    const base = deep < 0.35 ? ERA1.olive : deep < 0.7 ? ERA1.warnDark : ERA1.greyDark;
    const light = deep < 0.35 ? ERA1.tooltip : deep < 0.7 ? ERA1.warn : ERA1.grey;
    ui.px(ctx, x, y, CELL_W, CELL_H, base);
    for (let i = 0; i < CELL_W; i += 2) ui.px(ctx, x + i, y + 1 + (i % 4 === 0 ? 0 : 1), 1, 1, light);   // the stratum's lighter band
    const sx = 3 + ((r * 7 + c * 5) % 9); const sy = 5 + ((r * 3 + c * 11) % 11);
    ui.px(ctx, x + sx, y + sy, 2, 2, ERA1.black);
    ui.px(ctx, x + ((sx + 13) % 24) + 2, y + ((sy + 7) % 16) + 3, 2, 1, ERA1.black);
    ui.px(ctx, x + ((sx * 3) % 22) + 3, y + ((sy * 2) % 14) + 5, 1, 1, light);
    ui.px(ctx, x, y, CELL_W, 1, ERA1.black);
    ui.px(ctx, x, y, 1, CELL_H, ERA1.black);
  }
  /** a small lamb with a spade; x, y = the bottom-centre of the cell */
  private drawLamby(ctx: CanvasRenderingContext2D, x: number, y: number, face: number, bob: number, sc = 1): void {
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(face * sc, sc);
    ui.px(ctx, -7, -10 + bob, 10, 7, ERA1.white); ui.px(ctx, -6, -11 + bob, 3, 2, ERA1.white); ui.px(ctx, -2, -11 + bob, 3, 2, ERA1.white);
    ui.px(ctx, -7, -4 + bob, 10, 1, ERA1.silver);
    ui.px(ctx, 3, -9 + bob, 4, 4, ERA1.black); ui.px(ctx, 5, -8 + bob, 1, 1, ERA1.white); ui.px(ctx, 2, -10 + bob, 2, 2, ERA1.black);
    ui.px(ctx, -6, -3, 1, 3, ERA1.black); ui.px(ctx, -3, -3, 1, 3, ERA1.black); ui.px(ctx, 0, -3, 1, 3, ERA1.black); ui.px(ctx, 3, -3, 1, 3, ERA1.black);
    ui.px(ctx, 7, -3, 4, 1, ERA1.tooltip); ui.px(ctx, 10, -4, 2, 3, ERA1.tooltip);   // the spade
    ctx.restore();
  }
  private drawDiagnosis(ctx: CanvasRenderingContext2D, x: number, y: number, pumps: number, short: string): void {
    const gr = pumps * 2;
    const w = CELL_W - 8 + gr * 2; const h = CELL_H - 8 + gr * 2; const ox = x + 4 - gr; const oy = y + 4 - gr;
    ui.px(ctx, ox + 1, oy, w - 2, h, ERA1.warn); ui.px(ctx, ox, oy + 1, w, h - 2, ERA1.warn);
    ui.px(ctx, ox + 1, oy + h - 3, w - 2, 2, ERA1.warnDark);
    ui.px(ctx, ox + 3, oy + 2, 3, 3, ERA1.white); ui.px(ctx, ox + w - 6, oy + 2, 3, 3, ERA1.white);
    ui.px(ctx, ox + 4, oy + 3, 1, 2, ERA1.black); ui.px(ctx, ox + w - 5, oy + 3, 1, 2, ERA1.black);
    ui.px(ctx, ox + 3, oy + 1, 4, 1, ERA1.black); ui.px(ctx, ox + w - 7, oy + 1, 4, 1, ERA1.black);   // brows
    ui.setFont(ctx, 7); ctx.fillStyle = ERA1.white; ctx.fillText(short, x + 2, y + CELL_H - 8);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.hits = [];
    const ox = this.shake > 0 ? Math.round(Math.sin(this.t * 90) * 2) : 0;
    ctx.save(); ctx.translate(ox, 0);
    const c = ui.windowFrame(ctx, WIN_X, WIN_Y, WIN_W, WIN_H, copy.title, true, 'rootcause');
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.black);
    // ⚑ the close box is registered LAST (see the end of draw): the walker takes
    //   the first untried control, and a game whose first control is its exit
    //   is a game the walk never plays
    const closeBox = { ...c.closeBox, id: 'rootcause-close' };

    if (this.phase === 'intro') {
      ui.setFont(ctx, 12);
      ctx.fillStyle = ERA1.tooltip;
      ctx.fillText(copy.title.split(' — ')[1] ?? copy.title, c.x + 20, c.y + 16);
      ui.setFont(ctx, 10);
      copy.intro.forEach((line, i) => { ctx.fillStyle = ERA1.silver; ctx.fillText(line, c.x + 20, c.y + 40 + i * 14); });
      // how to play, in the disk's own voice
      ui.setFont(ctx, 9);
      ui.px(ctx, c.x + 20, c.y + 128, 8, 6, ERA1.paper); ui.px(ctx, c.x + 21, c.y + 130, 6, 1, ERA1.grey);
      ctx.fillStyle = ERA1.silver; ctx.fillText(copy.howTo[0], c.x + 34, c.y + 126);
      this.drawDiagnosis(ctx, c.x + 18, c.y + 142, 0, 'ROOT');
      ui.setFont(ctx, 9); ctx.fillStyle = ERA1.silver; ctx.fillText(copy.howTo[1], c.x + 54, c.y + 148);
      ui.px(ctx, c.x + 20, c.y + 171, 8, 8, ERA1.tooltip);
      ui.setFont(ctx, 8); ctx.fillStyle = ERA1.black; ctx.fillText('?', c.x + 22, c.y + 171);
      ui.setFont(ctx, 9); ctx.fillStyle = ERA1.silver; ctx.fillText(copy.howTo[2], c.x + 34, c.y + 170);
      ctx.fillStyle = ERA1.grey; ctx.fillText(copy.disk, c.x + 20, c.y + c.h - 14);
      // a cross-section of the life: Lamby on top, the strata under him
      const ix = c.x + 296; const iy = c.y + 100;
      ui.px(ctx, ix, iy, 156, 26, ERA1.teal);
      ui.px(ctx, ix + 100, iy + 6, 30, 4, ERA1.white); ui.px(ctx, ix + 106, iy + 2, 16, 4, ERA1.white);
      for (let r = 0; r < ROWS; r++) {
        const deep = r / ROWS; const base = deep < 0.35 ? ERA1.olive : deep < 0.7 ? ERA1.warnDark : ERA1.greyDark;
        ui.px(ctx, ix, iy + 26 + r * 15, 156, 15, base);
        for (let i = 0; i < 156; i += 6) ui.px(ctx, ix + i + (r % 3), iy + 28 + r * 15 + (i % 12 === 0 ? 0 : 5), 2, 1, ERA1.black);
        ui.setFont(ctx, 7); ctx.fillStyle = ERA1.paper; ctx.fillText(copy.layers[r].toUpperCase(), ix + 3, iy + 30 + r * 15);
      }
      ui.px(ctx, ix + 70, iy + 26, 14, 45, ERA1.black);   // the shaft he is digging
      this.drawLamby(ctx, ix + 68, iy + 26, 1, Math.floor(this.t * 4) % 2, 2.2);
      this.drawDiagnosis(ctx, ix + 112, iy + 72, 1, copy.shortName[0]);
      ui.button(ctx, c.x + 20, c.y + 200, 80, 22, copy.start, {});
      this.hits.push({ x: c.x + 20, y: c.y + 200, w: 80, h: 22, id: 'rootcause-start' });
      ctx.restore();
      this.hits.push(closeBox);
      return;
    }

    const gx = c.x + LABEL_W; const gy = c.y + 14;
    // the sky, a cloud, the hole he came down
    ui.px(ctx, gx, gy - 12, COLS * CELL_W, 12, ERA1.teal);
    ui.px(ctx, gx + 150, gy - 12, 40, 4, ERA1.white); ui.px(ctx, gx + 158, gy - 12, 24, 4, ERA1.white);
    ui.px(ctx, gx + 5 * CELL_W + 8, gy - 8, 14, 8, ERA1.tealDark);
    for (let r = 0; r < ROWS; r++) {
      ui.setFont(ctx, 8);
      ctx.fillStyle = r === this.lamby.r ? ERA1.tooltip : ERA1.grey;
      ctx.fillText(copy.layers[r].toUpperCase(), c.x + 6, gy + r * CELL_H + 8);
      for (let col = 0; col < COLS; col++) this.drawEarth(ctx, gx, gy, r, col);
      // a corner of a leaflet showing in the earth
      const lf = this.leaflet[r];
      if (lf && !lf.taken && !this.dug[r][lf.c]) {
        const x = gx + lf.c * CELL_W; const y = gy + r * CELL_H;
        ui.px(ctx, x + CELL_W - 12, y + CELL_H - 10, 8, 6, ERA1.paper);
        ui.px(ctx, x + CELL_W - 11, y + CELL_H - 8, 6, 1, ERA1.grey); ui.px(ctx, x + CELL_W - 11, y + CELL_H - 6, 4, 1, ERA1.grey);
      }
      // a twinkle near the buried memory: the programme does not mention it
      if (!this.memoryFound && this.memory.r === r) {
        const dist = Math.abs(this.lamby.r - r) + Math.abs(this.lamby.c - this.memory.c);
        if (dist <= 4 && Math.floor(this.t * 3) % 2 === 0) {
          const x = gx + this.memory.c * CELL_W + 13; const y = gy + r * CELL_H + 9;
          ui.px(ctx, x, y, 1, 5, ERA1.tooltip); ui.px(ctx, x - 2, y + 2, 5, 1, ERA1.tooltip);
        }
      }
    }
    for (const d of this.diagnoses) if (d.alive) this.drawDiagnosis(ctx, gx + d.c * CELL_W, gy + d.r * CELL_H, d.pumps, d.short);
    if (!(this.modal && this.modal.kind === 'report')) {
      this.drawLamby(ctx, gx + this.lamby.c * CELL_W + CELL_W / 2, gy + this.lamby.r * CELL_H + CELL_H - 2, this.face, Math.floor(this.t * 4) % 2);
    }
    for (const s of this.sparkles) {
      const x = s.r !== undefined && s.c !== undefined ? gx + s.c * CELL_W + CELL_W / 2 : c.x + 440;
      const y = s.r !== undefined ? gy + s.r * CELL_H + CELL_H / 2 : c.y + 300;
      for (let i = 0; i < 6; i++) { const a = i * 1.05 + s.t * 2; const rr = s.t * 22; ui.px(ctx, Math.round(x + Math.cos(a) * rr), Math.round(y + Math.sin(a) * rr), 2, 2, s.col); }
    }
    // the presses: the earth beside him, and any diagnosis beside him
    if (this.phase === 'play') {
      for (const n of this.neighbours(this.lamby)) {
        const x = gx + n.c * CELL_W; const y = gy + n.r * CELL_H;
        const isDiag = this.diagnoses.some((d) => d.alive && d.r === n.r && d.c === n.c);
        if (!isDiag) ui.px(ctx, x + CELL_W / 2 - 1, y + CELL_H / 2 - 1, 2, 2, ERA1.tooltip);
        this.hits.push({ x, y, w: CELL_W, h: CELL_H, id: `${isDiag ? 'pump' : 'dig'}:${this.dirOf(this.lamby, n)}` });
      }
    }

    // the line under the earth
    const ly = gy + ROWS * CELL_H + 6;
    ui.setFont(ctx, 9);
    const line = this.messageT > 0 ? this.message : copy.hint;
    ctx.fillStyle = this.messageT > 0 && line.startsWith('POWER-UP') ? ERA1.tooltip : ERA1.silver;
    ui.wrapText(ctx, line, c.w - 12).slice(0, 2).forEach((l, i) => ctx.fillText(l, c.x + 6, ly + i * 11));

    // the programme's bar: ROOT CAUSE FOUND — it has a ceiling
    const B = copy.bar;
    const by = ly + 25;
    ctx.fillStyle = ERA1.silver; ctx.fillText(B.found, c.x + 6, by);
    ui.bevel(ctx, c.x + 104, by - 2, 130, 12, false);
    ui.px(ctx, c.x + 105, by - 1, 128, 10, ERA1.black);
    ui.px(ctx, c.x + 106, by, Math.round(126 * this.progress / 100), 8, ERA1.ok);
    ctx.fillStyle = ERA1.silver; ctx.fillText(`${this.progress}%`, c.x + 240, by);
    ctx.fillStyle = this.zeal ? ERA1.tooltip : ERA1.grey; ctx.fillText(B.strength.replace('{n}', String(this.zeal)), c.x + 290, by);
    ctx.fillStyle = ERA1.grey;
    ctx.fillText(B.applied.replace('{n}', String(this.applied.length)).replace('{of}', String(APPLIED_TO_REPORT)), c.x + 370, by);
    ctx.fillText(B.descent.replace('{n}', String(descents)), c.x + 6, by + 13);
    ctx.fillText(B.leaflets.replace('{n}', String(this.leaflet.filter((l) => l.taken).length)).replace('{of}', String(ROWS)), c.x + 104, by + 13);

    // the shelf the programme has no field for
    const ky = by + 27;
    ui.bevel(ctx, c.x + 6, ky, c.w - 12, 54, false);
    ui.px(ctx, c.x + 7, ky + 1, c.w - 14, 52, ERA1.black);
    ui.setFont(ctx, 8);
    ctx.fillStyle = ERA1.tooltip; ctx.fillText(B.kept, c.x + 12, ky + 3); ctx.fillText(String(kept.length), c.x + c.w - 30, ky + 3);
    kept.slice(-6).forEach((k, i) => {
      const col = i % 2; const row = Math.floor(i / 2);
      const kx = c.x + 12 + col * 222; const kyy = ky + 14 + row * 12;
      ui.px(ctx, kx, kyy + 1, 4, 4, k.kind === 'memory' ? ERA1.tooltip : ERA1.white);
      ctx.fillStyle = k.kind === 'memory' ? ERA1.tooltip : ERA1.silver;
      ctx.fillText(k.text.length > 36 ? `${k.text.slice(0, 35)}…` : k.text, kx + 8, kyy);
    });
    if (!kept.length) { ctx.fillStyle = ERA1.grey; ctx.fillText(B.nothing, c.x + 12, ky + 20); }

    if (this.modal) this.drawModal(ctx, c);
    ctx.restore();
    this.hits.push(closeBox);
  }

  private dialog(ctx: CanvasRenderingContext2D, c: ui.ContentRect, title: string, w: number, h: number): { x: number; y: number; w: number; h: number } {
    const f = ui.windowFrame(ctx, c.x + Math.round((c.w - w) / 2), c.y + 36, w, h, title, true);
    ui.px(ctx, f.x, f.y, f.w, f.h, ERA1.beige);
    return { x: f.x + 6, y: f.y + 6, w: f.w - 12, h: f.h - 12 };
  }

  private drawModal(ctx: CanvasRenderingContext2D, c: ui.ContentRect): void {
    const m = this.modal!;
    if (m.kind === 'quiz') {
      const f = this.dialog(ctx, c, copy.quizTitle.replace('{layer}', copy.layers[m.layer].toUpperCase()), 380, 176);
      ui.setFont(ctx, 10);
      ctx.fillStyle = ERA1.black;
      ui.wrapText(ctx, copy.findings[m.layer], f.w).forEach((l, i) => ctx.fillText(l, f.x, f.y + i * 12));
      ctx.fillStyle = ERA1.navy; ctx.fillText(copy.quizStem, f.x, f.y + 32);
      if (m.answered === null) {
        const order = m.flip ? [1, 0] : [0, 1];
        order.forEach((a, i) => {
          const by = f.y + 48 + i * 28;
          ui.button(ctx, f.x, by, f.w, 22, `${i === 0 ? 'A.' : 'B.'}  ${copy.quiz[m.layer][a]}`, {});
          this.hits.push({ x: f.x, y: by, w: f.w, h: 22, id: `ans:${a}` });
        });
      } else {
        ui.setFont(ctx, 10);
        ctx.fillStyle = m.answered === 'yes' ? ERA1.ok : ERA1.warnDark;
        ctx.fillText(m.answered === 'yes' ? copy.quizYes.replace('{n}', String(m.gain)) : copy.quizNo, f.x, f.y + 54);
        if (m.answered === 'no') { ui.setFont(ctx, 9); ctx.fillStyle = ERA1.grey; ctx.fillText(copy.quizRecorded, f.x, f.y + 68); }
        ui.button(ctx, f.x + f.w - 90, f.y + 84, 88, 22, copy.continue, {});
        this.hits.push({ x: f.x + f.w - 90, y: f.y + 84, w: 88, h: 22, id: 'qnext' });
      }
    } else if (m.kind === 'flag') {
      const box = m.stage === 0 ? copy.flag : copy.flagDelete;
      const f = this.dialog(ctx, c, box.title, 330, 128);
      ui.px(ctx, f.x, f.y, 14, 14, ERA1.warn);
      ui.setFont(ctx, 12); ctx.fillStyle = ERA1.white; ctx.fillText('!', f.x + 5, f.y + 1);
      ui.setFont(ctx, 10);
      box.lines.forEach((l, i) => { ctx.fillStyle = ERA1.warnDark; ctx.fillText(l, f.x + 22, f.y + i * 13); });
      if (m.stage === 0) {
        ui.button(ctx, f.x + 40, f.y + 70, 70, 20, copy.ok, {}); this.hits.push({ x: f.x + 40, y: f.y + 70, w: 70, h: 20, id: 'flag-ok' });
        ui.button(ctx, f.x + 120, f.y + 70, 110, 20, copy.deleteMemory, {}); this.hits.push({ x: f.x + 120, y: f.y + 70, w: 110, h: 20, id: 'flag-del' });
      } else {
        ui.button(ctx, f.x + 80, f.y + 70, 70, 20, copy.ok, {}); this.hits.push({ x: f.x + 80, y: f.y + 70, w: 70, h: 20, id: 'flag-ok' });
      }
    } else {
      const R = copy.report;
      const f = this.dialog(ctx, c, R.title, 360, 168);
      ui.setFont(ctx, 10);
      let y = f.y;
      for (const raw of R.lines) {
        const l = raw.replace('{n}', String(descents)).replace('{p}', String(this.progress))
          .replace('{list}', this.applied.length ? this.applied.join(', ') : R.none);
        for (const w of (l ? ui.wrapText(ctx, l, f.w) : [''])) { ctx.fillStyle = ERA1.black; ctx.fillText(w, f.x, y); y += 13; }
      }
      ui.button(ctx, f.x + f.w - 110, f.y + f.h - 26, 108, 22, copy.again, {});
      this.hits.push({ x: f.x + f.w - 110, y: f.y + f.h - 26, w: 108, h: 22, id: 'again' });
    }
  }

  handleClick(x: number, y: number): void {
    const hit = [...this.hits].reverse().find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (!hit) return;
    this.dirty = true;
    const id = hit.id;
    if (id === 'rootcause-close') { this.open = false; this.onClose?.(); return; }
    if (id === 'rootcause-start') { this.phase = 'play'; return; }
    const m = this.modal;
    if (m && m.kind === 'quiz') {
      if (id.startsWith('ans:')) this.answer(id === 'ans:1');
      else if (id === 'qnext' && m.answered) this.closeQuiz();
      return;
    }
    if (m && m.kind === 'flag') {
      if (id === 'flag-del') { m.stage = 1; return; }
      if (id === 'flag-ok') { this.modal = null; this.phase = 'play'; this.moveDiagnoses(); }
      return;
    }
    if (m && m.kind === 'report') {
      if (id === 'again') { this.modal = null; this.newDescent(); this.phase = 'play'; this.message = ''; this.messageT = 0; }
      return;
    }
    if (this.phase !== 'play') return;
    const [kind, dir] = id.split(':');
    const target = this.neighbours(this.lamby).find((n) => this.dirOf(this.lamby, n) === dir);
    if (!target) return;
    if (kind === 'dig') { this.dig(target); return; }
    if (kind === 'pump') {
      const d = this.diagnoses.find((dd) => dd.alive && dd.r === target.r && dd.c === target.c);
      if (d) this.pump(d);
    }
  }
}
