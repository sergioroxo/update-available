/**
 * ⚑ FIT IN v4 (1997), on Daniel's handheld — ported from the games review's prototype
 * (Games_Proposals_2026-10-04_v4/fitin_v4.html), which Sérgio called "fantastic" (2026-10-04). It replaces
 * S189's falling-blocks FIT IN (his "tetris like?", 2026-09-27; redesigned on "it can't have colors, it is all
 * in shade of green", 2026-09-28) and keeps its `DeviceGame` shape, its place on the handheld and its filing.
 *
 * THE ONE RULE (a player gets it in five seconds): a block slides; TAP drops it; only the part that fits the
 * MOULD stays. The mould is the tall dotted outline; it narrows with every floor. Level 1 is THE TAPER (60 px
 * wide, narrowing 1.6 px a floor); five more moulds follow — each a shape the programme wants a life to fit:
 * THE HOUSE, THE CHURCH, THE CAKE, THE GOWN, THE PORTRAIT (invented, generic; no cross, no figure).
 *
 * THE LAW OF THE GAMES (his: "they all have a rhetoric of failure, that unables you to win, aka the queer side
 * always wins"): every mould narrows or steps in somewhere, so a tower with nothing cut off — the programme's
 * win — is in none of them. What is cut off falls, rings, and JOINS THE HEAP, which stays: one heap, shared by
 * every mould, run after run, that never loses a pixel. When the tower is over, the programme's own blocks
 * slide out one by one and the heap stands. The satire is the seller's (the cartridge, the cheer, the mould);
 * nothing here speaks for a person.
 *
 * PERIOD-TRUE: the screen is greens only — the theme's three plus three derived midpoints (HANDHELD in
 * src/desktop/theme/calendar.ts), a six-step ramp: L > LM > M > MD > DD > D.
 *
 * CONTROLS (his, 2026-10-04: "games can always work in multiple ways"). The handheld's own buttons are the
 * primary way and are enough to play: A / B / START start a run and drop the block; the d-pad's LEFT / RIGHT
 * choose the mould on the title and the end card (in play every d-pad arm drops the block, as in v3); START
 * pauses. A tap on the glass drops the block too, and the two small arrows on the glass choose the mould.
 *
 * SOUND: live Web Audio inside this module (oscillators and filtered noise; gentle, nothing recorded), silent
 * whenever the piece's one mute is on (gameMenuBus.soundMuted — the same signal the menu's Sound row sets).
 * It runs only while the handheld is in hand (heldDevice ticks the game only then).
 *
 * DRAWING: only `fillStyle` + `fillRect` (the Painter), so the preview tool can play it headless; the heap is
 * kept as pixels in a typed array and painted as rects. `frameKey` names exactly what is visible.
 * All display text is data/dialog/s1_fitin.json. Filed once, when the first run ends:
 * "FIT IN played — the odd pieces stayed" (unchanged).
 */
import { px as pxc, type Painter } from '../room/calendarArt';
// ⚑ S221 (his, 2026-10-08: "make sure the FIT IN also has it, so it looks good") — CLEAR v8's 5×7 type, not the calendar's 3×5
import { text, textW } from '../room/font57';
import { HANDHELD as H } from '../desktop/theme/calendar';
import { gameMenuBus } from '../state/gameMenuBus';
import D from '../../data/dialog/s1_fitin.json';
import type { DeviceGame, GameKey } from './types';

/** the six-step ramp, lightest to darkest (all from the theme) */
const G = {
  L: H.screenLight, LM: H.screenLightMid, M: H.screenMid, MD: H.screenMidDark, DD: H.screenDeep, D: H.screenDark
} as const;

const W = 160, H_ = 144;
const GROUND_Y = 126;        // screen row of the datum (height 0) when camH = 0
const BH = 7;                // block height
const CX = 80;               // the mould's centre line

// ── the moulds ───────────────────────────────────────────────────────────────────────────────────────────────
/** the little brush a mould's decorations draw with: heights are px above the mould's foot; every mark is dotted */
interface Brush {
  dots(x: number, h0: number, w: number, hh: number): void;
  line(x0: number, h: number, x1: number): void;
  ring(cx: number, h: number, r: number): void;
  arch(cx: number, h0: number, hw: number, hh: number): void;
  scallop(cx: number, h: number, w: number): void;
  inset(k: number, h0: number, w0: number, hh: number): void;
  cord(cx: number, h: number): void;
}
interface Mould {
  name: string; short: string;
  w0: number;                            // the first block's width
  v0: number;                            // the first block's speed (px/s)
  /** 'bottom': the width is read at the floor's foot (level 1, exactly v3); 'top': under its own top edge */
  at: 'bottom' | 'top';
  /** the mould's width at h px above the foot */
  w: (h: number) => number;
  deco: (P: Brush) => void;
  top: number;                           // the floor at which the mould is full
}
type MouldDef = Omit<Mould, 'name' | 'short' | 'top'>;
const sq = Math.sqrt;
const DEFS: MouldDef[] = [
  { w0: 60, v0: 56, at: 'bottom', w: (h) => 60 - 1.6 * h / BH, deco() { /* the taper is bare */ } },
  { w0: 52, v0: 66, at: 'top',
    w: (h) => h < 63 ? 52 : Math.max(0, 52 - 2 * (h - 63)),
    deco(P) { P.dots(CX - 5, 0, 10, 20); P.dots(CX - 22, 24, 10, 12); P.dots(CX + 12, 24, 10, 12); P.line(CX - 26, 63, CX + 26); P.dots(CX + 13, 70, 6, 12); } },
  { w0: 54, v0: 62, at: 'top',
    w: (h) => h < 56 ? 54 : h < 112 ? 30 : Math.max(0, 30 - 30 * (h - 112) / 70),
    deco(P) { P.arch(CX, 0, 14, 26); P.dots(CX - 20, 22, 7, 16); P.dots(CX + 13, 22, 7, 16); P.ring(CX, 76, 6); P.arch(CX, 96, 6, 12); } },
  { w0: 56, v0: 72, at: 'top',
    w: (h) => h < 42 ? 56 : h < 84 ? 42 : h < 119 ? 28 : h < 140 ? 12 : 0,
    deco(P) { P.scallop(CX, 40, 56); P.scallop(CX, 82, 42); P.scallop(CX, 117, 28); P.dots(CX - 1, 140, 2, 6); } },
  { w0: 60, v0: 68, at: 'top',
    w: (h) => h < 56 ? 60 - 38 * h / 56 : h < 84 ? 22 - 2 * (h - 56) / 28 : h < 105 ? 8 : 0,
    deco(P) { P.line(CX - 11, 56, CX + 11); P.line(CX - 9, 60, CX + 9); P.scallop(CX, 6, 56); } },
  { w0: 50, v0: 64, at: 'top',
    w: (h) => h < 84 ? 50 : h < 112 ? 50 * sq(Math.max(0, 1 - ((h - 84) / 28) * ((h - 84) / 28))) : 0,
    deco(P) { P.inset(8, 84, 50, 28); P.cord(CX, 112); } }
];
const topFloorOf = (m: MouldDef): number => {
  for (let n = 0; n < 80; n++) {
    const wd = m.at === 'bottom' ? m.w(n * BH) : m.w((n + 1) * BH - 0.01);
    if (wd < 2) return n;
  }
  return 80;
};
const MOULDS: Mould[] = DEFS.map((d, i) => ({ ...d, name: D.moulds[i].name, short: D.moulds[i].short, top: topFloorOf(d) }));

/** the odd marks stamped on what is kept (5 × 5, light on dark) */
const STAMPS: string[][] = [
  ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..'],   // a heart
  ['.XXX.', 'X...X', 'X...X', 'X...X', '.XXX.'],   // a ring
  ['X...X', '.X.X.', '..X..', '.X.X.', 'X...X'],   // an x
  ['..X..', '..X..', 'XXXXX', '..X..', '..X..'],   // a plus
  ['X....', 'XX...', '.XX..', '..XX.', '...XX']    // a stair
];

// ── sound: live Web Audio, PC-speaker / FM-ish — square + triangle, short, gentle ─────────────────────────────
const MASTER = 0.4;
interface Tone { at?: number; v?: number; a?: number; type?: OscillatorType; to?: number }
interface Hiss { at?: number; v?: number; f?: number; q?: number; ft?: BiquadFilterType }
const SND = (() => {
  let ac: AudioContext | null = null, master: GainNode | null = null, nbuf: AudioBuffer | null = null;
  /** the piece's one mute (the menu's Sound row and the room's button set it) */
  const muted = (): boolean => gameMenuBus.soundMuted?.() === true;
  function ctx(): AudioContext | null {
    if (!ac) {
      try {
        const Ctor: typeof AudioContext | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        ac = new Ctor();
        master = ac.createGain(); master.gain.value = MASTER;
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6500;
        master.connect(lp); lp.connect(ac.destination);
        nbuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
        const d = nbuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch { ac = null; return null; }
    }
    if (ac.state === 'suspended') void ac.resume().catch(() => { /* needs a gesture; the next press tries again */ });
    return ac;
  }
  /** a mute that arrives mid-tone silences the tails too */
  function sync(): void { if (ac && master) master.gain.setTargetAtTime(muted() ? 0 : MASTER, ac.currentTime, 0.03); }
  function tone(f: number, dur: number, o: Tone = {}): void {
    if (muted()) { sync(); return; }
    const a = ctx(); if (!a || !master) return;
    sync();
    const t = a.currentTime + (o.at ?? 0);
    const osc = a.createOscillator(), g = a.createGain();
    osc.type = o.type ?? 'square'; osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    const v = o.v ?? 0.12;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + (o.a ?? 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(master); osc.start(t); osc.stop(t + dur + 0.03);
  }
  function noise(dur: number, o: Hiss = {}): void {
    if (muted()) { sync(); return; }
    const a = ctx(); if (!a || !master || !nbuf) return;
    sync();
    const t = a.currentTime + (o.at ?? 0);
    const src = a.createBufferSource(); src.buffer = nbuf;
    const f = a.createBiquadFilter(); f.type = o.ft ?? 'bandpass'; f.frequency.value = o.f ?? 1200; f.Q.value = o.q ?? 1;
    const g = a.createGain(); g.gain.setValueAtTime(o.v ?? 0.1, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master); src.start(t); src.stop(t + dur + 0.02);
  }
  return { tone, noise, unlock: ctx, get running() { return !!ac && ac.state === 'running' && !muted(); } };
})();
// a C-major pentatonic across two octaves: every floor has its own note, so a tower is a tune
const PENTA = [262, 294, 330, 392, 440, 523, 587, 659, 784, 880, 1047, 1175, 1319];
const note = (i: number): number => PENTA[((i % PENTA.length) + PENTA.length) % PENTA.length];
const sfx = {
  start(): void { [262, 330, 392, 523].forEach((f, i) => SND.tone(f, 0.09, { at: i * 0.07, v: 0.1 })); },
  drop(n: number, perfect: boolean): void {
    SND.noise(0.04, { f: 2200, q: 2, v: 0.07 });
    if (perfect) {
      [0, 4, 7].forEach((s, i) => SND.tone(note(n % 7 + s % 5 + i * 2), 0.14, { at: i * 0.05, v: 0.09, type: 'triangle' }));
      SND.tone(note(n) * 2, 0.2, { at: 0.16, v: 0.05, type: 'triangle' });
    } else SND.tone(note(n % 9), 0.09, { v: 0.09 });
  },
  /** a cut-off piece lands on the heap: a soft, warm, slightly different note each time */
  chunk(w: number, n: number): void {
    SND.noise(0.07, { f: 260, q: 0.8, v: 0.1, ft: 'lowpass' });
    SND.tone(note(n * 3 + Math.round(w)) * 0.5, 0.45, { type: 'triangle', v: 0.1 });
    SND.tone(note(n * 3 + Math.round(w) + 2), 0.35, { type: 'sine', v: 0.05, at: 0.03 });
  },
  leave(i: number): void { SND.tone(980 - i * 16, 0.05, { v: 0.06 }); },
  count(i: number): void { SND.tone(note(i), 0.05, { type: 'triangle', v: 0.05 }); },
  bloom(): void { [262, 330, 392, 523, 659].forEach((f, i) => SND.tone(f, 1.8, { type: 'triangle', v: 0.06, a: 0.25, at: i * 0.05 })); },
  pause(): void { SND.tone(520, 0.06, { v: 0.07 }); SND.tone(390, 0.08, { v: 0.07, at: 0.06 }); },
  pick(): void { SND.tone(660, 0.05, { v: 0.06, type: 'triangle' }); },
  full(): void { [392, 494, 587, 784].forEach((f, i) => SND.tone(f, 0.16, { at: i * 0.08, v: 0.08, type: 'triangle' })); },
  /** a light bass loop (square, very quiet): a PC-speaker pulse that keeps the screen alive */
  bass(step: number): void { const f = BASS[step % BASS.length]; if (f) SND.tone(f, 0.12, { v: 0.045 }); }
};
const BASS = [131, 0, 196, 0, 175, 0, 196, 165];

// ── the heap: what was cut off. One mound on a world three screens wide; mass rolls downhill (slope 2) and ───────
//    nothing ever takes it away. Kept as pixels (kind per world column and row) and painted as rects.
const WW_ = 480, WOFF = 160;      // heap world columns -160 .. 319
const HM = 3000;                  // rows the heap may reach
const K_FILL = 1, K_RIM = 2, K_STAMP_L = 3, K_STAMP_D = 4;

interface Floor { x0: number; x1: number; perfect: boolean }
interface Chunk { x: number; w: number; h: number; vy: number; vx: number; id: number; done?: boolean }
interface Leaver { x0: number; x1: number; h: number; vx: number }
interface Pop { x: number; t: number }
type Mode = 'title' | 'play' | 'pause' | 'dying' | 'sweep' | 'end';

export class FitIn implements DeviceGame {
  readonly w = W; readonly h = H_;
  private mode: Mode = 'title';
  private lvl = 0;                       // the mould chosen (on the title / end cards)
  private ranLvl = 0;                    // the mould being played, or just played
  private floors: Floor[] = [];
  private base = 0;
  private bx = 0; private bdir = 1;
  private chunks: Chunk[] = [];
  private leavers: Leaver[] = [];
  private pops: Pop[] = [];
  private clock = 0;
  private camH = 0; private camTarget = 0;
  private placedCount = 0;
  private hiBy = MOULDS.map(() => 0);
  private runKept = 0;
  private hintT = 0; private sweepT = 0; private dieT = 0;
  private countShown = 0; private countT = 0;
  private cheer: { t: number; s: string } | null = null;
  private chunkSeq = 0;
  private shake = 0;
  private completed = false;
  private musicT = 0; private musicStep = 0;
  // the heap
  private readonly heap = new Uint8Array(WW_ * HM);
  private readonly HP = new Array<number>(WW_).fill(0);     // the mound's height per column (what mass has rolled to)
  private readonly HV = new Int32Array(WW_);                   // the highest painted row + 1 per column (a stamp can stand above a lower neighbour)
  private heapVer = 0;
  private keptCells = 0;
  private stampCount = 0;
  // the filing
  private filing: string | null = null;
  private filed = false;
  private seed = 7;

  private get RM(): Mould { return MOULDS[this.ranLvl]; }
  private get CM(): Mould { return MOULDS[this.lvl]; }
  private rnd(): number { this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff; return this.seed / 0x7fffffff; }

  // ── geometry ─────────────────────────────────────────────────────────────────────────────────────────────
  private mwH(h: number): number { return Math.max(0, this.RM.w(h)); }
  private mw(n: number): number { const m = this.RM; return Math.max(0, m.at === 'bottom' ? m.w(n * BH) : m.w((n + 1) * BH - 0.01)); }
  private mouldL(n: number): number { return CX - this.mw(n) / 2; }
  private mouldR(n: number): number { return CX + this.mw(n) / 2; }
  private topWidth(): number { const f = this.floors[this.floors.length - 1]; return f ? f.x1 - f.x0 : this.RM.w0; }
  private speedFor(n: number): number { return Math.min(280, this.RM.v0 + 7 * n); }
  private floorBottom(n: number): number { return this.base + n * BH; }

  // ── the heap ─────────────────────────────────────────────────────────────────────────────────────────────
  private hp(x: number): number { return this.HP[Math.max(0, Math.min(WW_ - 1, Math.floor(x) + WOFF))]; }
  private heapMax(x0: number, x1: number): number {
    let m = 0;
    for (let x = Math.floor(x0); x < Math.ceil(x1); x++) m = Math.max(m, this.hp(x));
    return m;
  }
  private setPix(i: number, row: number, kind: number): void {
    if (i < 0 || i >= WW_ || row < 0 || row >= HM) return;
    this.heap[i * HM + row] = kind; this.heapVer++;
    if (row + 1 > this.HV[i]) this.HV[i] = row + 1;
  }
  /** one pixel of mass dropped on world column i, rolling downhill */
  private addUnit(i0: number): void {
    let i = i0;
    const HP = this.HP;
    for (let guard = 0; guard < 400; guard++) {
      const cur = HP[i], l = i > 0 ? HP[i - 1] : -1, r = i < WW_ - 1 ? HP[i + 1] : -1;
      if (l < 0 || r < 0) {
        if (l < 0 && r >= 0 && r < cur - 2) { i++; continue; }
        if (r < 0 && l >= 0 && l < cur - 2) { i--; continue; }
        if (l < 0 || r < 0) return;
      }
      if (l < cur - 2 || r < cur - 2) { i += (l < r) ? -1 : (r < l ? 1 : (guard & 1 ? 1 : -1)); continue; }
      break;
    }
    if (i < 0 || i >= WW_) return;
    const row = HP[i];
    if (row >= HM - 2) return;
    if (row > 0) this.setPix(i, row - 1, K_FILL);
    this.setPix(i, row, K_RIM); HP[i] = row + 1;
  }
  /** a cut-off piece comes to rest: its mass joins the mound, and an odd mark is pressed into it */
  private heapLand(x0: number, w: number, side: number): void {
    const X = Math.floor(x0), WW = Math.max(1, Math.round(w)), units = Math.max(3, Math.round(w * BH * 2.5));
    for (let u = 0; u < units; u++) this.addUnit(X + (u % WW) + WOFF + (side > 0 ? 1 : -1) * Math.floor(u / WW / 2));
    if (WW >= 8) {
      const st = STAMPS[this.stampCount++ % STAMPS.length];
      const cx0 = X + Math.floor((WW - 5) / 2) + WOFF, top = this.hp(X + WW / 2) - 2;
      for (let dx = -1; dx <= 5; dx++) for (let dh = 0; dh <= 6; dh++) this.setPix(cx0 + dx, top - dh, K_STAMP_L);
      st.forEach((row, j) => [...row].forEach((ch, k2) => { if (ch === 'X') this.setPix(cx0 + k2, top - 1 - j, K_STAMP_D); }));
    }
  }

  // ── the run ──────────────────────────────────────────────────────────────────────────────────────────────
  private startRun(): void {
    this.completed = false; this.ranLvl = this.lvl;
    this.base = this.heapMax(CX - 32, CX + 32);                        // the tower stands on whatever is there
    this.floors = []; this.chunks = []; this.leavers = []; this.pops = []; this.placedCount = 0; this.runKept = 0; this.hintT = 0; this.cheer = null;
    this.bx = 0; this.bdir = 1; this.mode = 'play'; this.camH = this.camTarget = Math.max(0, this.base - 26); this.musicT = 0; this.musicStep = 0;
    sfx.start();
  }
  private addChunk(x0: number, x1: number, hBottom: number, vx: number): void {
    const w = x1 - x0; if (w < 0.3) return;
    const cells = Math.max(1, Math.round(w * BH / 10));
    this.keptCells += cells; this.runKept += cells;
    this.chunks.push({ x: x0, w, h: hBottom, vy: 0, vx, id: this.chunkSeq++ });
  }
  private drop(): void {
    if (this.mode !== 'play') return;
    const n = this.floors.length, bw = this.topWidth(), x0 = this.bx, x1 = this.bx + bw, c0 = (x0 + x1) / 2;
    let perfect = false;
    if (Math.abs(c0 - CX) <= 3) { perfect = true; this.bx = CX - bw / 2; }
    const l = this.bx, r = this.bx + bw, ml = this.mouldL(n), mr = this.mouldR(n);
    const s0 = Math.max(l, ml), s1 = Math.min(r, mr), wid = s1 - s0, hb = this.floorBottom(n);
    if (wid < 2) {                                                     // it does not fit at all: the whole block is cut off, and the tower is over
      this.addChunk(l, r, hb, r < ml ? -14 : 14); this.mode = 'dying'; this.dieT = 0; sfx.drop(n, false); SND.tone(150, 0.3, { to: 70, v: 0.1 });
      return;
    }
    if (s0 > l) this.addChunk(l, s0, hb, -12 - (n % 3) * 3);
    if (r > s1) this.addChunk(s1, r, hb, 12 + (n % 3) * 3);
    this.floors.push({ x0: s0, x1: s1, perfect }); this.placedCount = this.floors.length;
    this.hiBy[this.ranLvl] = Math.max(this.hiBy[this.ranLvl], this.placedCount); this.hintT = 99;
    sfx.drop(n, perfect);
    if (perfect) { this.cheer = { t: 0.9, s: D.cheer.clean }; this.pops.push({ x: CX, t: 0 }); }
    this.bdir = this.rnd() < 0.5 ? 1 : -1; this.bx = this.bdir > 0 ? 0 : W - (s1 - s0);
    this.camTarget = Math.max(this.base - 26, this.floorBottom(this.floors.length) - 66);
    this.shake = 0.08;
    if (this.floors.length >= this.RM.top) {                           // the mould is full: there is nowhere left to put a block
      this.completed = true; this.cheer = { t: 1.4, s: D.cheer.top }; sfx.full(); this.mode = 'dying'; this.dieT = 0;
    }
  }
  private selectMould(d: number): void {
    if (this.mode !== 'title' && this.mode !== 'end') return;
    this.lvl = (this.lvl + d + MOULDS.length) % MOULDS.length; sfx.pick();
  }

  // ── input ────────────────────────────────────────────────────────────────────────────────────────────────
  key(k: GameKey): void {
    SND.unlock();
    const card = this.mode === 'title' || this.mode === 'end';
    if (k === 'left' || k === 'right') {                               // choose the mould on the cards; in play every arm drops the block
      if (card) this.selectMould(k === 'left' ? -1 : 1); else this.key('a');
      return;
    }
    if (k === 'up' || k === 'down') { this.key('a'); return; }
    if (card) { if (k === 'a' || k === 'b' || k === 'start') this.startRun(); return; }
    if (k === 'start') {
      if (this.mode === 'play') { this.mode = 'pause'; sfx.pause(); }
      else if (this.mode === 'pause') { this.mode = 'play'; sfx.pause(); }
      return;
    }
    if (this.mode === 'pause') return;
    if (k === 'a' || k === 'b') this.drop();
  }
  /** a tap on the glass: on the cards, the two small arrows choose the mould and anywhere else starts; in play it drops; paused, it resumes */
  tap(x?: number, y?: number): void {
    if (this.mode === 'pause') { this.key('start'); return; }
    if ((this.mode === 'title' || this.mode === 'end') && x !== undefined && y !== undefined) {
      const sy0 = this.mode === 'title' ? 76 : 61, sy1 = sy0 + 12;   // S221: the arrows' rows moved with the 5×7 type
      if (y >= sy0 - 2 && y <= sy1 + 2 && (x < 30 || x > W - 30)) { this.key(x < 30 ? 'left' : 'right'); return; }
    }
    this.key('a');
  }

  // ── the turn of the clock ────────────────────────────────────────────────────────────────────────────────
  tick(dt0: number): void {
    const dt = Math.max(0, Math.min(0.1, dt0));
    this.clock += dt;
    if (this.cheer) { this.cheer.t -= dt; if (this.cheer.t <= 0) this.cheer = null; }
    if (this.shake > 0) this.shake -= dt;
    this.pops = this.pops.filter((p) => (p.t += dt) < 0.5);
    if (this.mode === 'title') this.syncTitleCam();
    this.camH += (this.camTarget - this.camH) * Math.min(1, dt * 5);
    // falling cut-off pieces (they drift outward off the tower, fall, ring, and stay)
    for (const k of this.chunks) {
      k.vy += 420 * dt; k.h -= k.vy * dt; k.x += k.vx * dt;
      const floorH = this.heapMax(k.x, k.x + k.w);
      if (k.h <= floorH) { k.h = floorH; k.done = true; this.heapLand(k.x, k.w, k.vx); sfx.chunk(k.w, k.id); }
    }
    this.chunks = this.chunks.filter((k) => !k.done);
    if (this.mode === 'play') {
      this.hintT += dt;
      const n = this.floors.length, bw = this.topWidth(), v = this.speedFor(n);
      this.bx += this.bdir * v * dt;
      if (this.bx < 0) { this.bx = 0; this.bdir = 1; }
      if (this.bx > W - bw) { this.bx = W - bw; this.bdir = -1; }
      this.musicT += dt;                                               // the bass pulse, while the run is on
      while (this.musicT >= 0.19) { this.musicT -= 0.19; if (SND.running) sfx.bass(this.musicStep); this.musicStep++; }
    } else if (this.mode === 'dying') {
      this.dieT += dt; this.camTarget = Math.max(this.base - 26, this.floorBottom(this.floors.length) - 66);
      if (this.dieT > (this.completed ? 1.5 : 0.9) && this.chunks.length === 0) { this.mode = 'sweep'; this.sweepT = 0; }
    } else if (this.mode === 'sweep') {                                // the programme's own blocks slide out, top first; what was kept stays
      this.sweepT += dt; this.camTarget = Math.max(0, this.base - 30);
      if (this.sweepT > 0.05) {
        this.sweepT = 0;
        const f = this.floors.pop();
        if (f) { this.leavers.push({ x0: f.x0, x1: f.x1, h: this.floorBottom(this.floors.length), vx: 160 }); sfx.leave(this.floors.length); }
        else if (this.leavers.length === 0) {
          this.mode = 'end'; this.countShown = 0; this.countT = 0; sfx.bloom();
          if (this.completed) this.lvl = (this.lvl + 1) % MOULDS.length;
          if (!this.filed) { this.filed = true; this.filing = D.filing; }
        }
      }
    } else if (this.mode === 'end') {
      this.camTarget = Math.max(0, this.base - 30);
      this.countT += dt;
      if (this.countShown < this.runKept && this.countT > 0.02) { this.countT = 0; this.countShown++; if (this.countShown % 3 === 0) sfx.count(this.countShown / 3); }
    }
    for (const l of this.leavers) { l.x0 += l.vx * dt; l.x1 += l.vx * dt; }
    this.leavers = this.leavers.filter((l) => l.x0 < W + 10);
  }
  /** the title looks at the heap's foot (the heap never changes while it is up, but this keeps it honest) */
  private syncTitleCam(): void { this.camH = this.camTarget = Math.max(0, this.heapMax(CX - 40, CX + 40) - 40); }

  takeFiling(): string | null { const f = this.filing; this.filing = null; return f; }

  /** exactly what the screen shows, so the device uploads only when something visible moved */
  frameKey(): string {
    const m = this.mode;
    if (m === 'title') {
      this.syncTitleCam();
      const ph = (Math.sin(this.clock * 1.7) + 1) / 2;
      const bw0 = Math.round(this.CM.w0 * 0.55);
      return `t|${Math.floor(this.clock * 2) % 2}|${Math.floor(this.clock * 2.5) % 2}|${this.lvl}|${Math.round(40 + ph * 80 - bw0 / 2)}|${this.keptCells}|${this.hiBy[this.lvl]}|${this.heapVer}|${Math.round(this.camH)}`;
    }
    const f = this.floors[this.floors.length - 1];
    const sh = this.shake > 0 ? Math.round(Math.sin(this.clock * 90)) : 0;
    const blink = m === 'end' ? Math.floor(this.clock * 2) % 2 : 0;
    const pulse = (m === 'end' || m === 'sweep') ? Math.floor(this.clock * 2.5) % 2 : 0;
    const dither = this.chunks.length ? Math.floor(this.clock * 14) % 2 : 0;
    const ch = this.chunks.map((k) => `${Math.round(k.x)},${this.chunkY(k)},${Math.round(k.w)}`).join(';');
    const lv = this.leavers.map((l) => `${Math.round(l.x0)}-${Math.round(l.x1)}`).join(',');
    const pp = this.pops.map((p) => `${Math.round(p.t * 40)}.${Math.round(p.t * 6)}`).join(',');
    const bxk = m === 'play' ? `${Math.round(this.bx)}-${Math.round(this.bx + this.topWidth())}` : 0;
    return `${m}|${blink}|${pulse}|${dither}|${sh}|${Math.round(this.camH)}|${Math.round(this.camH * 0.4)}|${bxk}|${this.floors.length}|${f ? `${Math.round(f.x0)},${Math.round(f.x1)}` : ''}|${ch}|${lv}|${pp}|${this.cheer?.s ?? ''}|${this.hintT < 4 && this.placedCount === 0 ? 1 : 0}|${this.countShown}|${this.keptCells}|${this.placedCount}|${this.lvl}|${this.ranLvl}|${this.completed ? 1 : 0}|${this.heapVer}`;
  }

  // ── drawing ──────────────────────────────────────────────────────────────────────────────────────────────
  draw(g: Painter): void {
    pxc(g, 0, 0, G.L, W, H_);
    if (this.mode === 'title') { this.drawTitle(g); return; }
    const ox = this.shake > 0 ? Math.round(Math.sin(this.clock * 90)) : 0;
    this.drawWorld(g, ox);
    this.hud(g);
    const blink = Math.floor(this.clock * 2) % 2 === 0;
    const ctext = (s: string, y: number, col: string, k = 1, x0 = 0, w = W): void => { text(g, s, x0 + Math.round((w - textW(s, k)) / 2), y, col, k); };
    if (this.mode === 'play' && this.hintT < 4 && this.placedCount === 0) {
      pxc(g, 20, 88, G.D, 120, 11); ctext(this.RM.name, 90, G.LM);
      pxc(g, 20, 100, G.D, 120, 11); ctext(D.hint.rule1, 102, G.L);
      pxc(g, 20, 112, G.D, 120, 11); ctext(D.hint.rule2, 114, G.L);
    }
    if (this.cheer && (this.mode === 'play' || this.mode === 'dying')) {
      const wd = textW(this.cheer.s) + 8;
      pxc(g, Math.round((W - wd) / 2), 20, G.D, wd, 11); ctext(this.cheer.s, 22, G.L);
    }
    if (this.mode === 'pause') { pxc(g, 40, 50, G.D, 80, 30); ctext(D.pause.title, 53, G.L, 2); ctext(D.pause.resume, 70, G.M); }
    if (this.mode === 'end') {
      pxc(g, 16, 13, G.D, 128, 72); pxc(g, 18, 15, G.L, 124, 68); pxc(g, 19, 16, G.D, 122, 66); pxc(g, 20, 17, G.L, 120, 64);
      ctext(D.end.title, 20, G.D, 2); pxc(g, 28, 36, G.MD, 104, 1);
      // S221: the 5×7 type is taller, so the counts sit at single size, dark on their pale labels
      const fitL = D.hud.fit, topL = D.hud.top;
      text(g, fitL, 26, 41, G.MD); text(g, `${String(this.placedCount).padStart(2, '0')}/${MOULDS[this.ranLvl].top}`, 26 + textW(fitL) + 4, 41, G.D);
      text(g, topL, 92, 41, G.MD); text(g, String(this.hiBy[this.ranLvl]).padStart(2, '0'), 92 + textW(topL) + 4, 41, G.D);
      this.oddIcon(g, 26, 52);
      // KEPT +, what this run cut off, and the heap's whole
      text(g, `${D.hud.kept} +${this.countShown}  ${D.hud.all} ${this.keptCells}`, 36, 52, G.D);
      this.arrow(g, 24, 63, -1, G.D); this.arrow(g, 133, 63, 1, G.D);
      ctext((this.completed ? D.end.next : '') + this.CM.name, 63, G.D);
      if (blink) ctext(D.end.press, 73, G.MD);
    }
  }

  /** a small solid triangle, 4 wide, 7 tall */
  private arrow(g: Painter, x: number, y: number, dir: number, col: string): void {
    for (let i = 0; i < 4; i++) pxc(g, dir < 0 ? x + 3 - i : x + i, y + i, col, 1, 7 - i * 2);
  }
  private oddIcon(g: Painter, x: number, y: number): void {
    STAMPS[0].forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'X') pxc(g, x + i, y + j, G.L); }));
  }
  private hud(g: Painter): void {
    pxc(g, 0, 0, G.D, W, 11);
    text(g, D.hud.fit, 3, 2, G.M); text(g, String(this.placedCount).padStart(2, '0'), 3 + textW(D.hud.fit) + 4, 2, G.L);
    text(g, this.RM.short, 40, 2, G.LM);
    this.oddIcon(g, 98, 2); text(g, D.hud.kept, 106, 2, G.M); text(g, String(this.keptCells).padStart(4, '0'), 106 + textW(D.hud.kept) + 4, 2, G.L);
    pxc(g, 0, 11, G.DD, W, 1);
  }
  private sy(h: number): number { return GROUND_Y + Math.round(this.camH) - h; }
  /** the screen row of a falling piece's top — whole pixels only (the glass has no half-greens) */
  private chunkY(k: Chunk): number { return Math.round(this.sy(k.h + BH)); }

  /** the heap, painted from its pixels; `pulse` flips the checker (it breathes at the end); rows above `yMin` are left out */
  private drawHeap(g: Painter, pulse: number, ox: number, yMin: number): void {
    const Y0 = GROUND_Y + Math.round(this.camH);
    for (let x = 0; x < W; x++) {
      const i = x + WOFF, top = this.HV[i];
      if (top <= 0) continue;
      const r0 = Math.max(0, Y0 - H_), r1 = Math.min(top - 1, Y0 - 1 - yMin);
      for (let row = r0; row <= r1; row++) {
        const k = this.heap[i * HM + row];
        if (!k) continue;
        const col = k === K_FILL ? (((i + row + pulse) & 1) ? G.L : ((i + row) % 6 === 0 ? G.MD : G.LM)) : k === K_RIM ? G.D : k === K_STAMP_L ? G.L : G.D;
        pxc(g, x + ox, Y0 - 1 - row, col);
      }
    }
  }

  /** a straight block: dark outline, mid body, light top, a step of the ramp under it */
  private block(g: Painter, ox: number, x0: number, x1: number, hBottom: number, moving: boolean): void {
    const y = this.sy(hBottom + BH), w = Math.max(1, Math.round(x1) - Math.round(x0)), x = Math.round(x0) + ox;
    if (y > H_ || y + BH < 0) return;
    pxc(g, x, y, G.D, w, BH);
    if (w > 2) {
      pxc(g, x + 1, y + 1, G.M, w - 2, BH - 2); pxc(g, x + 1, y + 1, G.L, w - 2, 1); pxc(g, x + 1, y + 2, G.LM, w - 2, 1);
      pxc(g, x + 1, y + BH - 3, G.MD, w - 2, 1); pxc(g, x + 1, y + BH - 2, G.DD, w - 2, 1);
    }
    if (moving && w > 6) for (let i = 4; i < w - 3; i += 6) pxc(g, x + i, y + 3, G.D);
  }

  /** the brush: every mark is a dotted dither in `oc` (level 1 keeps v3's MD; the new moulds draw one step darker so their shapes read) */
  private brush(g: Painter, ox: number, oc: string): Brush {
    const put = (x: number, h: number): void => { const yy = this.sy(this.base + h); if (yy >= 0 && yy < H_) pxc(g, Math.round(x) + ox, Math.round(yy), oc); };
    const P: Brush = {
      dots(x, h0, w, hh) {
        for (let j = 0; j <= hh; j++) { put(x, h0 + j); put(x + w, h0 + j); }
        for (let i = 0; i <= w; i += 2) { put(x + i, h0 + hh); put(x + i, h0); }
      },
      line(x0, h, x1) { for (let x = Math.round(x0); x <= x1; x += 2) put(x, h); },
      ring(cx, h, r) { for (let a = 0; a < 16; a++) put(Math.round(cx + Math.cos(a * Math.PI / 8) * r), Math.round(h + Math.sin(a * Math.PI / 8) * r)); },
      arch(cx, h0, hw, hh) {
        for (let j = 0; j < hh - hw; j++) { put(cx - hw, h0 + j); put(cx + hw, h0 + j); }
        for (let a = 0; a <= 8; a++) put(Math.round(cx + Math.cos(a * Math.PI / 8) * hw), Math.round(h0 + hh - hw + Math.sin(a * Math.PI / 8) * hw));
      },
      scallop(cx, h, w) {
        for (let x = -w / 2 + 2; x <= w / 2 - 3; x += 4) { put(Math.round(cx + x), h - 1); put(Math.round(cx + x) + 1, h - 2); put(Math.round(cx + x) + 2, h - 1); }
      },
      inset: (k, h0, _w0, hh) => {
        for (let h = 2; h < h0 + hh - k; h += 2) {
          const half = this.mwH(h) / 2 - k;
          if (half > 1 && h < h0 + hh - k - 1) { put(Math.round(CX - half), h); put(Math.round(CX + half), h); }
        }
      },
      cord(cx, h) {
        for (let i = 0; i <= 10; i += 2) { put(cx - 18 + (i * 1.5 | 0), h + 1 + i); put(cx + 18 - (i * 1.5 | 0), h + 1 + i); }
        for (let a = 0; a < 3; a++) put(cx, h + 12 + a);
      }
    };
    return P;
  }

  /** the dotted outline of a mould: its edge every other row, and a dotted line where the edge turns inward */
  private mouldOutline(g: Painter, ox: number, m: Mould): void {
    const oc = m === MOULDS[0] ? G.MD : G.DD;
    for (let yy = 0; yy < H_; yy++) {
      const h = GROUND_Y + Math.round(this.camH) - yy - this.base;
      if (h < 0) continue;
      const half = m.w(h) / 2, up = m.w(h + 1) / 2;
      if (half >= 1 && yy % 2 === 0) { pxc(g, Math.round(CX - half) + ox, yy, oc); pxc(g, Math.round(CX + half - 1) + ox, yy, oc); }
      if (half - up > 1.5 && half >= 1) for (let x = CX - half; x < CX + half; x += 2) pxc(g, Math.round(x) + ox, yy, oc);       // a step: the mould's edge turns inward
      else if (up >= 1 && half < 1) for (let x = CX - up; x < CX + up; x += 2) pxc(g, Math.round(x) + ox, yy, oc);                // the closing top of a flat-topped mould
    }
    m.deco(this.brush(g, ox, oc));
  }

  private drawWorld(g: Painter, ox: number): void {
    // sparse "sky" dither that drifts with the camera: a little alive
    for (let i = 0; i < 14; i++) { const x = (i * 37 + 11) % W, yy = (((i * 53 + 7) % 200) + Math.round(this.camH * 0.4)) % 130; pxc(g, x + ox, yy + 10, G.M); }
    this.mouldOutline(g, ox, this.RM);
    // the heap (it pulses at the end), then the ground
    const pulse = (this.mode === 'end' || this.mode === 'sweep') && Math.floor(this.clock * 2.5) % 2 === 0 ? 1 : 0;
    this.drawHeap(g, pulse, ox, 0);
    const gy = this.sy(0);
    if (gy < H_) {
      pxc(g, ox, gy, G.MD, W, H_ - gy); pxc(g, ox, gy, G.D, W, 1);
      for (let x = 0; x < W; x += 4) pxc(g, x + ((gy) % 2) * 2 + ox, gy + 2, G.D);
    }
    // the heap's plateau under the tower (always the top of what was kept): a plinth line
    if (this.floors.length || this.mode === 'play') pxc(g, Math.round(CX - 32) + ox, this.sy(this.base), G.D, 64, 1);
    // the tower
    this.floors.forEach((f, i) => this.block(g, ox, f.x0, f.x1, this.floorBottom(i), false));
    for (const l of this.leavers) this.block(g, ox, l.x0, l.x1, l.h, false);
    if (this.mode === 'play') this.block(g, ox, this.bx, this.bx + this.topWidth(), this.floorBottom(this.floors.length), true);
    // falling cut-off pieces, in front of the heap, in front of the tower: you watch them fall
    const ph = Math.floor(this.clock * 14);
    for (const k of this.chunks) {
      const y = this.chunkY(k), x = Math.round(k.x) + ox, w = Math.max(1, Math.round(k.w));
      pxc(g, x, y, G.D, w, BH);
      for (let j = 1; j < BH - 1; j++) for (let i = 1; i < w - 1; i++) pxc(g, x + i, y + j, (i + j + ph) % 2 === 0 ? G.L : G.MD);
    }
    for (const p of this.pops) {
      const y = this.sy(this.floorBottom(this.floors.length)) - 2, r = Math.round(p.t * 40);
      pxc(g, CX - r + ox, y, G.D); pxc(g, CX + r + ox, y, G.D);
      pxc(g, CX - r + ox, y - 3 - Math.round(p.t * 6), G.L); pxc(g, CX + r + ox, y - 3 - Math.round(p.t * 6), G.L);
    }
  }

  private drawTitle(g: Painter): void {
    this.syncTitleCam();
    const ctext = (s: string, y: number, col: string, k = 1): void => { text(g, s, Math.round((W - textW(s, k)) / 2), y, col, k); };
    // attract mode: a block slides in its mould above the heap
    const ph = (Math.sin(this.clock * 1.7) + 1) / 2;
    // cartridge label
    for (let x = 0; x < W; x += 4) { pxc(g, x, 0, G.D, 2, 2); pxc(g, x + 2, 2, G.D, 2, 2); }
    pxc(g, 8, 8, G.D, W - 16, 1); pxc(g, 8, 44, G.D, W - 16, 1);
    ctext(D.publisher, 11, G.M); ctext(D.title, 21, G.D, 3);
    if (Math.floor(this.clock * 2) % 2 === 0) ctext(D.card.start, 48, G.D);
    ctext(D.card.rule1, 58, G.D); ctext(D.card.rule2, 67, G.D);
    // the mould chooser: two small arrows on the glass and the d-pad, left and right
    this.arrow(g, 14, 78, -1, G.D); this.arrow(g, 142, 78, 1, G.D);
    ctext(`${this.lvl + 1}/${MOULDS.length} ${this.CM.name}`, 78, G.D);
    // a miniature of the chosen mould (dotted), a sliding block, and the heap at the foot
    const m = this.CM, oc = m === MOULDS[0] ? G.MD : G.DD, top = m.top * BH, ky = 27 / Math.max(top, 60), kx = 0.55, baseY = 117;
    for (let yy = 90; yy < baseY; yy++) {
      const h = (baseY - yy) / ky; if (h > top + 3) continue;
      const half = m.w(h) * kx / 2, up = m.w(h + 1 / ky) * kx / 2;
      if (half >= 1 && yy % 2 === 0) { pxc(g, Math.round(CX - half), yy, oc); pxc(g, Math.round(CX + half - 1), yy, oc); }
      if (half - up > 1.5 && half >= 1) for (let x = CX - half; x < CX + half; x += 2) pxc(g, Math.round(x), yy, oc);
      else if (up >= 1 && half < 1) for (let x = CX - up; x < CX + up; x += 2) pxc(g, Math.round(x), yy, oc);
    }
    const bw0 = Math.round(m.w0 * kx), bxd = Math.round(40 + ph * 80 - bw0 / 2);
    pxc(g, bxd, 108, G.D, bw0, 6); pxc(g, bxd + 1, 109, G.M, bw0 - 2, 4); pxc(g, bxd + 1, 109, G.L, bw0 - 2, 1);
    // the heap at the foot (what has been kept so far), drawn from the real heap, clipped to the strip under the miniature
    this.drawHeap(g, Math.floor(this.clock * 2.5) % 2, 0, 118);
    const gy = this.sy(0);
    if (gy < H_) { const y0 = Math.max(gy, 118); pxc(g, 0, y0, G.MD, W, H_ - y0); if (gy >= 118) pxc(g, 0, gy, G.D, W, 1); }
    pxc(g, 0, 118, G.D, W, 1);
    pxc(g, 0, 126, G.D, W, 1); pxc(g, 0, 127, G.L, W, 17);
    // the cartridge's own count
    this.oddIcon(g, 4, 128); text(g, `${D.hud.kept} ${this.keptCells}  ${D.hud.top} ${this.hiBy[this.lvl]}`, 14, 128, G.D);
    ctext(D.licence, 136, G.MD);
  }
}
