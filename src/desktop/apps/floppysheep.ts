/**
 * ⚑ FLOPPYSHEEP — the mascot game on Vera's phone (2016), and on a bookmark in 2026's browser.
 * ⚑ S221: v7, ported from the games review's prototype (`Pc_Simulation/Games_Proposals_2026-10-07_v7/
 * floppysheep_v7.html`), which Sérgio approved — "amazing and that's it". The prototype is the design of
 * record: its gameplay, its pacing (v7's re-paced confetti cannons), the lyric-driven level, the balloon, the
 * choir, the rockets, the tent, the Jumbotron, the finale and its collapse, the calm switch. Its level is
 * `floppysheepCourse.ts`; its words are `data/dialog/s3_floppysheep.json` (`_docV7` says what changed and why).
 *
 * Sérgio asked for this by name (S70: *"just feel like the need to the FloppySheep to be there would be
 * good"*), and it had to be BUILT rather than written down, because the whole of what it says is a thing you
 * can only find out by being able to do it: **it is one tap away while a comment sits unanswered.** That is
 * what everybody does at work. The piece says NOTHING about it — no scolding, no timer, no guilt, no
 * interruption, no ledger entry, ever. Nothing in the thread degrades while she plays.
 *
 * ⚑ IT IS NOT RESPITE. E3 has no respite (Sérgio's decision, confirmed) and this does not quietly reintroduce
 * one. FloppySheep is `operable`: the apparatus's own cheerful product, by the same publisher whose serious
 * arm has become a workflow — *a Lamby game*, says its own footer. The joke is on the brand. It is never on the
 * person holding the phone, and it is never a reward: nothing is unlocked by it, nothing is scored across
 * runs, no best is kept. Its counts live and die inside its own frame.
 *
 * ⚑ AND IT HAS TO BE ACTUALLY FUN. A deliberately bad little game would be the piece sneering at her for
 * playing it, and Vera is never the joke. v5–v7 were tuned on his notes for exactly that.
 *
 * ⚑ WHAT THE LAMBS ARE. She calls lambs by touching them and they follow; they drift away, more and more as
 * the song goes on — people choosing, never an enemy, never mocked (the drift sound is a soft "bye then",
 * never a loss sound). The programme's pressures (megaphone drones, the recruiter's crook, quota inspectors)
 * cost a lamb, never a life: there is no game over before the song ends. The platform's bombast over it is the
 * platform's, and it collapses on its own at the end — the fuel runs out.
 *
 * WHAT THE HOST CHANGED, and nothing else:
 *   · SPACE. The prototype is 300 logical px wide; the host's screen is scaled to that width and the game's
 *     height follows the host's aspect (both hosts are 1:2, so 300 × 600). The extra height is the footer's.
 *   · INPUT. Taps only (R28 §3: a tap is resolved on release — so there is no HOLD here, and every hop is the
 *     full, held hop; taps in the air still lift her again). No keys reach the phone. The Back arrow sits at
 *     the left of the header; the calm switch (the prototype's F / its HTML button) is drawn in the footer.
 *   · SOUND. The live Web Audio obeys the piece's ONE mute (gameMenuBus.soundMuted, as FIT IN does); there is
 *     no sound switch of its own. His song is `floppysheep_song.mp3` through `playOnce`, so the mute, the game
 *     menu's hold and the caption strip all reach it.
 *   · DIRTY DISCIPLINE. While the game is open and not paused the screen redraws and re-uploads at up to
 *     `TICK` (30/s), and stops the instant it is paused or closed. Every other screen in the era redraws only
 *     on a real state change; a game cannot.
 *
 * NO STORAGE, NO NETWORK: the run lives in this object and dies with it. Nothing is filed (ledger.ts says so).
 */
import { px } from '../theme/chrome';
import { ERA3, FLOPPY, FLOPPY_BOMB as BOMB, FLOPPY_SPEC as SPC } from '../theme/era3';
import { sansFor } from '../theme/fonts';
import g from '../../../data/dialog/s3_floppysheep.json';
import { playOnce, stopClip } from '../../audio/tapeAudio';
import { gameMenuBus } from '../../state/gameMenuBus';
import {
  LW as W, HEADER_H, GROUND_Y, GRASS_H, FOOT_Y, PLAY_BOT, LOW, SX, HW, SONG_LEN,
  LYRICS, wordAge, SECTIONS, envAt, smooth, D, Tinv, COURSE, DEFW, reserved, SETS, MARKS,
  type Env, type CourseItem
} from './floppysheepCourse';

/** the redraw quantum while the game is running (see the header) */
const TICK = 1 / 30;
const FONT = sansFor('e3');

const GRAVITY = 1150, HOP_V = -520, CUT_V = -300, SPRING_V = -790, COYOTE = 0.09, BUFFER = 0.11, CLOVER_SECONDS = 6, INV = 1.2;
const FLAPS = [-390, -330, -280, -230, -190];                // each tap in the air lifts her again, a little less each time (the clover: unlimited, -390)

type Rect = { x: number; y: number; w: number; h: number; id: string };
const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
};

// ── sound: phone-game chimes, live Web Audio, under the piece's one mute ─────────────────────────────────────
interface ToneOpts { at?: number; v?: number; a?: number; type?: OscillatorType; to?: number; bp?: number; q?: number; vib?: number; vd?: number }
interface NoiseOpts { at?: number; v?: number; a?: number; f?: number; to?: number; q?: number; ft?: BiquadFilterType }
const MASTER = 0.5;
const SND = (() => {
  let ac: AudioContext | null = null, master: GainNode | null = null, nbuf: AudioBuffer | null = null;
  /** the piece's one mute (the menu's Sound row and the room's button set it) */
  const muted = (): boolean => gameMenuBus.soundMuted?.() === true;
  function c_(): AudioContext | null {
    if (!ac) {
      try {
        const Ctor: typeof AudioContext | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        ac = new Ctor(); master = ac.createGain(); master.gain.value = MASTER;
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000; master.connect(lp); lp.connect(ac.destination);
        nbuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch { ac = null; return null; }
    }
    if (ac.state === 'suspended') void ac.resume().catch(() => { /* needs a gesture; the next press tries again */ });
    return ac;
  }
  /** a mute that arrives mid-tone silences the tails too */
  function sync(): void { if (ac && master) master.gain.setTargetAtTime(muted() ? 0 : MASTER, ac.currentTime, 0.03); }
  function tone(f: number, dur: number, o: ToneOpts = {}): void {
    if (muted()) { sync(); return; }
    const a = c_(); if (!a || !master) return; sync();
    const t = a.currentTime + (o.at ?? 0);
    const osc = a.createOscillator(), gn = a.createGain(); osc.type = o.type ?? 'sine'; osc.frequency.setValueAtTime(f, t); if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    if (o.bp) { const b = a.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = o.bp; b.Q.value = o.q ?? 3; osc.connect(b); b.connect(gn); } else osc.connect(gn);
    if (o.vib) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = o.vib; lg.gain.value = f * (o.vd ?? 0.05); l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + 0.05); }
    gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(o.v ?? 0.12, t + (o.a ?? 0.006)); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur); gn.connect(master); osc.start(t); osc.stop(t + dur + 0.03);
  }
  function noise(dur: number, o: NoiseOpts = {}): void {
    if (muted()) { sync(); return; }
    const a = c_(); if (!a || !master || !nbuf) return; sync();
    const t = a.currentTime + (o.at ?? 0);
    const src = a.createBufferSource(); src.buffer = nbuf; const f = a.createBiquadFilter(); f.type = o.ft ?? 'lowpass'; f.frequency.setValueAtTime(o.f ?? 400, t); if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur); f.Q.value = o.q ?? 0.7;
    const gn = a.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(o.v ?? 0.08, t + (o.a ?? 0.01)); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur); src.connect(f); f.connect(gn); gn.connect(master); src.start(t); src.stop(t + dur + 0.02);
  }
  return { tone, noise, unlock: c_, get state(): string { return ac ? ac.state : 'none'; } };
})();
const PEN = [523, 587, 659, 784, 880, 1047, 1175, 1319];
const lastSnd: Record<string, number> = {};
const gate_ = (k: string, gap: number): boolean => { const n = performance.now() / 1000; if (n - (lastSnd[k] ?? -9) < gap) return false; lastSnd[k] = n; return true; };

// ── the platform's palette for its own spectacle (theme: FLOPPY_BOMB) ────────────────────────────────────────
const CONFC = [BOMB.hot, BOMB.gold, BOMB.cyan, BOMB.lime, BOMB.orange, BOMB.violet, BOMB.white, BOMB.pink];
const FW_PAIRS: Array<[string, string]> = [[BOMB.hot, BOMB.gold], [BOMB.cyan, BOMB.white], [BOMB.lime, BOMB.gold], [BOMB.violet, BOMB.pink], [BOMB.orange, BOMB.gold], [BOMB.cyan, BOMB.hot], [BOMB.gold, BOMB.white]];
const TIERS: Array<[number, string, number]> = [[3, g.tiers[0], 0.0], [6, g.tiers[1], 0.6], [10, g.tiers[2], 1.4], [15, g.tiers[3], 2.4], [22, g.tiers[4], 3.4]];
const rnd1 = (a: number, b: number): number => a + Math.random() * (b - a);       // visual randomness only: nothing that is played ever reads it
const reducedMotion = (() => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } })();
const mmss = (s: number): string => { s = Math.max(0, Math.ceil(s - 0.06)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

// the 3x5 type for the Jumbotron (the same bitmap letters as the 2003 phone), drawn as lamps
const GLY: Record<string, string> = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001001010010', '8': '111101111101111', '9': '111101111001111',
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111', M: '101111111101101',
  N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111',
  '!': '010010010000010', '*': '000101010101000', ' ': '000000000000000', '-': '000000111000000', "'": '010010000000000'
};
const lampsW = (str: string, pitch: number): number => String(str).length * 4 * pitch - pitch;

// ── the world's things ──────────────────────────────────────────────────────────────────────────────────────
interface Obj { k: string; x: number; w: number; h: number; base: number; top: number; lt?: number; style: string; comp: number; fired: boolean; bot: number; y0: number; amp: number; ph: number; ch: string; bit: number; fade: number | null; gone: boolean; cleared: boolean }
interface Stray { x: number; y: number; ring: boolean; seed: number; lt?: number; taken?: boolean }
interface Clover { x: number; y: number; lt?: number; taken?: boolean }
interface Pit { x: number; w: number; lt?: number; hit: boolean }
interface Zone { z: string; x: number; w: number; g: number; y0: number; y1: number; cy: number; lt?: number }
interface Ring { r: number; hit: boolean }
interface Foe { k: string; x: number; w: number; y0: number; y: number; vx: number; age: number; cy: number; fired: boolean; rings: Ring[]; dead: boolean; rot: number; say: string; lt?: number; rise: number; L: number; T: number; ph: number; A: number; ang: number; top: number; base: number; still: boolean; flip: number; amp: number; gph: number; on: number; i: number; glow: number; text: string }
interface Lost { x: number; y: number; vx: number; vy: number; rot: number; t: number }
interface Wander { x: number; y: number; d: number; dir: number; seed: number }
interface Bubble { x: number; y: number; t: number; s: string }
interface Mote { x: number; y: number; vx: number; vy: number; life: number; ph: number; wool?: number }
interface Weather { k: string; x: number; y: number; vx: number; vy: number; life: number; ph?: number; c?: number }
interface State {
  mode: 'idle' | 'run' | 'done'; t: number; levelT: number; dist: number; speed: number; paused: boolean; fy: number; vy: number; onGround: boolean; standing: Obj | null;
  flapCount: number; coyote: number; buffer: number; held: boolean; hops: number; invT: number; doneT: number; flopT: number; squash: number; called: number;
  objs: Obj[]; strays: Stray[]; clovers: Clover[]; pits: Pit[]; zones: Zone[]; foes: Foe[]; flock: Array<{ id: number }>; lost: Lost[]; wander: Wander[];
  trail: Array<{ d: number; y: number }>; bubbles: Bubble[]; dust: Array<{ x: number; y: number; t: number }>; hearts: Array<{ x: number; y: number; t: number; k: number }>;
  weather: Weather[]; motes: Mote[]; nextX: number; chunkI: Record<string, number>; cloverT: number; driftAcc: number; driftTh: number; maxFlock: number;
  toast: { s: string; t: number } | null; lastSec: number; camY: number; itemI: number; inPit: boolean; zn: { g: number; fl: number; lift: number; push: number }; woolT: number; lastEnv: Env;
}
interface Conf { x: number; y: number; vx: number; vy: number; rot: number; vr: number; w: number; h: number; col: string; life: number; ph: number; rib: boolean; trail: Array<[number, number]> }
interface Spark { x: number; y: number; vx: number; vy: number; life: number; max: number; col: string; r: number; g: number; dr: number }
interface Rocket { x0: number; x: number; y: number; y0: number; yt: number; dur: number; t: number; vx: number; pair: [string, string]; fizz: boolean; big: boolean; dead?: boolean }
interface Cannon { side: number; life: number; fired: boolean; mis: boolean; amt: number }
interface Pop { k: 'puff' | 'shout' | 'flashring'; x: number; y: number; t: number; r?: number; s?: string; col?: string }
interface Litter { wd: number; dy: number; col: string; r: number; gone?: boolean }
interface Spec {
  full: boolean; combo: number; heat: number; tier: number; best: number; pulse: number; lost: number; lostText: string; shake: number; flash: number; flashGap: number; fuel: number;
  mi: number; lastT: number; finT: number; trailT: number; quiet: boolean; conf: Conf[]; rock: Rocket[]; sparks: Spark[]; cannon: Cannon[]; pops: Pop[]; litter: Litter[];
  queue: Array<{ at: number; mis: boolean; big: boolean; done?: boolean }>; lit: number[]; ledFlash: number; fanfare: number;
}

/**
 * THE GAME, as the prototype wrote it: one closure per FloppySheep on screen, its state in `S` (the world)
 * and `SPEC` (the v6 spectacle, which never touches the world). Drawn in the prototype's own 300-wide space.
 */
function makeGame(bump: () => void) {
  let ctx!: CanvasRenderingContext2D;
  let H = 600;                                                   // logical height: the host's aspect at 300 wide
  let hitRects: Rect[] = [];
  let lastDriftSnd = -9;

  // ── sound effects ──
  const sfx = {
    hop(): void { SND.tone(440, 0.11, { to: 700, v: 0.07 }); },
    flap(k: number): void { SND.tone(620 + k * 70, 0.07, { to: 860 + k * 70, v: 0.04 }); },
    land(): void { SND.noise(0.07, { f: 300, v: 0.06 }); SND.tone(170, 0.08, { to: 120, v: 0.06 }); },
    perch(): void { SND.tone(880, 0.12, { v: 0.05 }); SND.tone(1318, 0.1, { v: 0.03, at: 0.05 }); },
    baa(i: number): void { const f = 250 + (i % 5) * 18; SND.tone(f, 0.38, { type: 'sawtooth', to: f * 0.86, v: 0.05, vib: 24, vd: 0.06, bp: 780, q: 3 }); SND.tone(PEN[i % PEN.length], 0.3, { v: 0.07, at: 0.05 }); SND.tone(PEN[i % PEN.length] * 2, 0.18, { v: 0.025, at: 0.05 }); },
    drift(): void { if (SND.state !== 'running') return; SND.tone(330, 0.3, { to: 262, v: 0.028, type: 'triangle' }); },     // a soft, low "bye then", never a loss sound
    clover(): void { [784, 988, 1175, 1568].forEach((f, k) => SND.tone(f, 0.22, { v: 0.06, at: k * 0.05 })); },
    spring(): void { SND.tone(180, 0.35, { to: 520, v: 0.1, vib: 16, vd: 0.12 }); },
    bump(): void { SND.tone(392, 0.12, { type: 'triangle', v: 0.08 }); SND.tone(294, 0.2, { type: 'triangle', v: 0.08, at: 0.1 }); SND.tone(1300, 0.22, { to: 1900, v: 0.05, at: 0.05, vib: 22 }); },
    section(): void { [659, 784, 988].forEach((f, k) => SND.tone(f, 0.25, { v: 0.035, at: k * 0.07 })); },
    start(): void { [523, 659, 784].forEach((f, k) => SND.tone(f, 0.16, { v: 0.06, at: k * 0.06 })); },
    // v5 — the programme's pressures sound soft and a little silly, never alarming; the stomp is a small happy pop
    charge(): void { if (gate_('charge', 0.6)) SND.tone(170, 0.8, { to: 250, v: 0.03, type: 'triangle' }); },
    blast(): void { SND.noise(0.4, { f: 600, to: 150, v: 0.07 }); SND.tone(150, 0.4, { to: 85, v: 0.07, type: 'triangle' }); },
    snag(): void { SND.tone(520, 0.28, { to: 250, v: 0.06, vib: 18 }); },
    prick(): void { SND.tone(920, 0.07, { v: 0.045, type: 'triangle' }); SND.tone(700, 0.1, { v: 0.03, at: 0.06 }); },
    stomp(): void { SND.tone(300, 0.12, { to: 620, v: 0.07 }); SND.tone(940, 0.1, { v: 0.03, at: 0.05 }); },
    whoosh(): void { if (gate_('whoosh', 1.2)) SND.noise(0.7, { f: 300, to: 1200, v: 0.035, a: 0.2 }); },
    fall(): void { if (gate_('fall', 0.8)) SND.tone(520, 0.5, { to: 130, v: 0.05 }); },
    tick(): void { if (gate_('tick', 0.25)) SND.tone(1500, 0.03, { v: 0.018 }); },
    hum(): void { if (gate_('hum', 0.8)) SND.tone(220, 0.7, { v: 0.025, a: 0.2 }); },
    poof(): void { SND.tone(660, 0.25, { to: 330, v: 0.035, type: 'triangle' }); },
    // v6 — the platform's fanfares, soft and a little silly
    cannon(): void { if (gate_('cannon', 0.12)) { SND.noise(0.25, { f: 900, to: 200, v: 0.05 }); SND.tone(125, 0.25, { to: 62, v: 0.07, type: 'triangle' }); SND.tone(1250, 0.08, { v: 0.03, at: 0.03 }); } },
    mis(): void { if (gate_('mis', 0.15)) { SND.noise(0.28, { f: 420, to: 110, v: 0.035 }); SND.tone(270, 0.35, { to: 110, v: 0.04, type: 'triangle' }); } },
    fwLaunch(): void { if (gate_('fwl', 0.1)) SND.tone(520, 0.7, { to: 1500, v: 0.014 }); },
    fwBurst(): void { if (gate_('fwb', 0.1)) { SND.noise(0.5, { f: 1800, to: 300, v: 0.04 }); SND.tone(110, 0.4, { to: 50, v: 0.06, type: 'triangle' }); for (let i = 0; i < 4; i++) SND.tone(2000 + Math.random() * 2500, 0.05, { v: 0.01, at: 0.12 + i * 0.07 }); } },
    fizzle(): void { if (gate_('fizz', 0.2)) { SND.tone(720, 0.55, { to: 90, v: 0.035, type: 'triangle', vib: 30, vd: 0.1 }); SND.noise(0.3, { f: 2500, to: 300, v: 0.02 }); } },
    horn(k: number): void { if (SPEC.quiet) return; const m = Math.pow(2, k * 2 / 12); [311, 392, 466].forEach((f) => SND.tone(f * m, 0.55, { type: 'sawtooth', to: f * m * 0.97, v: 0.016, bp: 1200, q: 0.8, a: 0.03 })); },
    sparkle(c: number): void { const i = Math.min(c, 15); const f = PEN[i % PEN.length] * (i >= 8 ? 2 : 1); SND.tone(f * 2, 0.16, { v: 0.03, at: 0.03 }); SND.tone(f * 3, 0.1, { v: 0.015, at: 0.06 }); },
    fizzBanner(): void { SND.tone(540, 0.9, { to: 95, v: 0.04, vib: 9, vd: 0.05 }); SND.noise(0.8, { f: 3000, to: 200, v: 0.02 }); },
    lightsOut(): void { SND.tone(640, 0.5, { to: 140, v: 0.03, type: 'triangle' }); }
  };

  // ── his song: the level's clock. Off only if she turns it off; the game menu holds it; the one mute reaches it ──
  let song: HTMLAudioElement | null = null, songState: 'none' | 'loading' | 'ready' | 'ended' | 'missing' = 'none', songOff = false;
  const levelLen = (): number => (song && isFinite(song.duration) && song.duration > 60 ? song.duration : SONG_LEN);
  const songPlaying = (): boolean => !!song && !song.paused && !song.ended && songState !== 'missing';
  function startSong(t0: number): void {
    if (songOff || songState === 'missing') return;
    if (!song || song.ended) {
      const a = playOnce('floppysheep_song.mp3');
      if (!a) { songState = 'missing'; bump(); return; }
      song = a; songState = 'loading'; a.volume = 0.7;
      a.addEventListener('canplay', () => { if (songState === 'loading') songState = 'ready'; bump(); });
      a.addEventListener('ended', () => { if (song === a) songState = 'ended'; bump(); });
      a.addEventListener('error', () => { if (song === a) { songState = 'missing'; song = null; } bump(); });
      try { a.currentTime = t0 || 0; } catch { /* not seekable yet */ }
      return;
    }
    try { song.currentTime = t0 || 0; } catch { /* not seekable yet */ }
    void song.play().catch(() => { /* autoplay policy or a headless harness */ });
  }
  function stopSong(): void { stopClip(song); song = null; if (songState !== 'missing') songState = 'none'; }
  function toggleSong(): void {
    if (songPlaying()) { song!.pause(); songOff = true; }
    else { songOff = false; if (S.mode === 'run' && !S.paused) startSong(S.levelT); }
  }

  // ── state: ONE object for the world, so a run can be thrown away whole ──
  function newState(): State {
    return { mode: 'idle', t: 0, levelT: 0, dist: 0, speed: 126, paused: false, fy: GROUND_Y, vy: 0, onGround: true, standing: null, flapCount: 0, coyote: 0, buffer: 0, held: false,
      hops: 0, invT: 0, doneT: 0, flopT: 0, squash: 0, called: 0, objs: [], strays: [], clovers: [], pits: [], zones: [], foes: [], flock: [], lost: [], wander: [], trail: [], bubbles: [],
      dust: [], hearts: [], weather: [], motes: [], nextX: W - 60, chunkI: {}, cloverT: 0, driftAcc: 0, driftTh: 1, maxFlock: 0, toast: null, lastSec: -1, camY: 0, itemI: 0,
      inPit: false, zn: { g: 1, fl: 1, lift: 0, push: 0 }, woolT: 0, lastEnv: envAt(0) };
  }
  let S = newState();
  function reset(): void { S = newState(); fill(); }

  // ── building the world ──
  const OBJ0 = (k: string, x: number, lt: number | undefined): Obj => ({ k, x, w: 0, h: 0, base: GROUND_Y, top: GROUND_Y, lt, style: '', comp: 0, fired: false, bot: 0, y0: 0, amp: 0, ph: 0, ch: '', bit: 0, fade: null, gone: false, cleared: false });
  const FOE0 = (k: string, x: number, lt: number | undefined): Foe => ({ k, x, w: 0, y0: 0, y: 0, vx: 0, age: 0, cy: 0, fired: false, rings: [], dead: false, rot: 0, say: '', lt, rise: 0, L: 0, T: 1, ph: 0, A: 0, ang: 0, top: 0, base: GROUND_Y, still: false, flip: 0, amp: 0, gph: 0, on: 0, i: 0, glow: 0, text: '' });
  function build(k: string, x: number, o: Partial<CourseItem>): void {
    const s = S, low = !!o.low, base = GROUND_Y + (low ? LOW : 0), lt = o.lt, h = o.h ?? 0, rise = o.rise ?? 0;
    const obj = (p: Partial<Obj>): void => { s.objs.push(Object.assign(OBJ0(k, x, lt), { base }, p)); };
    const foe = (p: Partial<Foe>): void => { s.foes.push(Object.assign(FOE0(k, x, lt), p)); };
    switch (k) {
      case 'fence': obj({ w: 16, h, top: base - h }); break;
      case 'wire': obj({ w: 22, h, top: base - h }); break;
      case 'pipe': obj({ w: 30, h, top: base - h }); break;
      case 'bale': obj({ w: 46, h: 36, top: base - 36 }); break;
      case 'gate': obj({ w: 16, h: h || 70, top: base - (h || 70) }); break;
      case 'block': obj({ w: o.w || 36, h, top: base - h, style: o.style ?? '' }); break;
      case 'thorn': obj({ w: o.w || 38, h: 16, top: base - 16 }); break;
      case 'spring': obj({ w: 34, h: 14, top: base - 14 }); break;
      case 'ceil': obj({ w: 30, bot: GROUND_Y - rise, top: GROUND_Y - rise }); break;
      case 'puddle': obj({ w: 56, h: 4, top: base }); break;
      case 'cloud': { const top = GROUND_Y - rise; obj({ w: o.w || 80, top, y0: top, amp: o.amp || 0, ph: o.ph || 0, style: o.style || 'cloud', ch: o.ch ?? '', bit: o.bit ?? 0 }); break; }
      case 'stray': s.strays.push({ x, y: base - rise, ring: !!o.ring, seed: Math.floor(x) % 7, lt }); break;
      case 'clover': s.clovers.push({ x, y: base - rise, lt }); break;
      case 'pit': s.pits.push({ x, w: o.w ?? 0, lt, hit: false }); break;
      case 'grav': s.zones.push({ z: 'grav', x, w: o.w ?? 0, g: o.g ?? 1, y0: GROUND_Y - 320, y1: GROUND_Y + 6, cy: 0, lt }); break;
      case 'thermal': s.zones.push({ z: 'thermal', x, w: o.w ?? 0, g: 1, y0: GROUND_Y - (o.top ?? 0), y1: GROUND_Y + 6, cy: 0, lt }); break;
      case 'down': s.zones.push({ z: 'down', x, w: o.w ?? 0, g: 1, y0: GROUND_Y - 330, y1: GROUND_Y + 6, cy: 0, lt }); break;
      case 'storm': s.zones.push({ z: 'storm', x, w: o.w ?? 0, g: 1, y0: GROUND_Y - rise + 14, y1: GROUND_Y + 6, cy: GROUND_Y - rise, lt }); break;
      case 'drone': foe({ x: W + 30, y0: GROUND_Y - rise, y: GROUND_Y - rise, vx: -55, say: g.droneSays[Math.floor(x + rise) % 3 | 0] || g.droneSays[0] }); break;
      case 'crook': foe({ w: 8, rise, L: o.L ?? 0, T: o.T ?? 1, ph: o.ph ?? 0, A: 1.08 }); break;
      case 'inspector': foe({ w: 26, top: base - 34, base, still: !!o.still }); break;
      case 'ghost': foe({ w: 30, y0: GROUND_Y - rise, y: GROUND_Y - rise, amp: o.amp ?? 0, gph: o.ph ?? 0 }); break;
      case 'beam': foe({ w: o.w || 64, ph: o.ph || 0 }); break;
      case 'pylon': foe({ w: 20, i: o.i || 0, glow: 1 }); break;
      case 'sign': foe({ w: 70, text: o.text ?? '' }); break;
      case 'freegate': foe({ w: 60 }); break;
      default: break;                                                  // 'reserve' builds nothing: it only keeps the filler out
    }
  }
  function spawnCourse(): void { const s = S; while (s.itemI < COURSE.length) { const it = COURSE[s.itemI]; if (s.dist < it.spawnAt) break; build(it.k, it.k === 'drone' ? W + 30 : SX + (it.wd - s.dist), it); s.itemI++; } }
  function spawnChunk(): void {
    const s = S, wdStart = s.dist + (s.nextX - SX), tA = Tinv(wdStart); const L = levelLen(); const key = tA > L - 7 ? 'END' : envAt(tA).set;
    const set = SETS[key]; const k = s.chunkI[key] = (s.chunkI[key] == null ? -1 : s.chunkI[key]) + 1; const c = set[k % set.length]; const X = s.nextX;
    for (const [type, dx, a, b] of c.items) {
      const x = X + dx, wd = s.dist + (x - SX); if (reserved(wd, type === 'cloud' ? (b ?? 0) : (DEFW[type] || 0))) continue;
      if (type === 'cloud') build('cloud', x, { rise: a, w: b, style: 'cloud' }); else build(type, x, { h: a, rise: a });
    }
    s.nextX += c.len;
  }
  function fill(): void { while (S.nextX < W + 520) spawnChunk(); }

  // ── the sheep and the world: one frame of motion ──
  const SOLID: Record<string, 1> = { fence: 1, bale: 1, wire: 1, pipe: 1, gate: 1, block: 1 };
  const LAND: Record<string, 1> = { fence: 1, bale: 1, wire: 1, pipe: 1, gate: 1, block: 1, cloud: 1 };
  function zoneAt(): State['zn'] {
    const s = S; let gz = 1, fl = 1, lift = 0, push = 0;
    for (const z of s.zones) {
      if (z.x > SX + HW || z.x + z.w < SX - HW) continue; if (s.fy - 14 < z.y0 || s.fy - 14 > z.y1) continue;
      if (z.z === 'grav') gz = z.g; else if (z.z === 'storm') { gz = 1.7; fl = 0.7; } else if (z.z === 'thermal') lift = 1; else if (z.z === 'down') push = 1;
    }
    return { g: gz, fl, lift, push };
  }
  const beamState = (f: Foe): number => { const p = (S.t + f.ph * 0.9) % 3.2; return p < 1.3 ? 0 : p < 1.9 ? 0.18 + 0.3 * (p - 1.3) / 0.6 : p < 2.9 ? 1 : 1 - (p - 2.9) / 0.3; };
  function hurt(kind: string, how: string, n?: number): boolean {
    const s = S; if (s.invT > 0) return false;
    s.invT = INV; s.vy = Math.min(s.vy, -250); s.onGround = false;
    onBump();
    if (how === 'scatter') { const k = Math.min(n || 2, s.flock.length); for (let i = 0; i < k; i++) driftOne(true); s.bubbles.push({ x: SX, y: s.fy - 50, t: 0, s: k ? g.bubbles.scatter : g.bubbles.oops }); sfx.bump(); }
    else if (how === 'snag') { if (s.flock.length) { s.flock.pop(); s.lost.push({ x: SX - lambX(s.flock.length), y: trailY(lambX(s.flock.length)), vx: 20, vy: -620, rot: 0, t: 0 }); } s.bubbles.push({ x: SX, y: s.fy - 50, t: 0, s: g.bubbles.snagged }); sfx.snag(); }
    else if (how === 'count') { if (s.flock.length) driftOne(true); s.bubbles.push({ x: SX, y: s.fy - 50, t: 0, s: g.bubbles.counted }); sfx.bump(); }
    else { if (s.flock.length) { s.flock.pop(); s.lost.push({ x: SX - lambX(s.flock.length), y: trailY(lambX(s.flock.length)), vx: 150, vy: -380, rot: 0, t: 0 }); } s.bubbles.push({ x: SX, y: s.fy - 50, t: 0, s: g.bubbles.oops }); sfx.bump(); if (kind === 'thorn') sfx.prick(); }
    return true;
  }
  function doHop(): void { const s = S; s.vy = HOP_V; s.onGround = false; s.standing = null; s.coyote = 0; s.flapCount = 0; s.buffer = 0; sfx.hop(); }
  function physics(h: number): void {
    const s = S, prev = s.fy, z = zoneAt(); s.zn = z;
    s.vy += GRAVITY * z.g * h;
    if (z.lift) { if (s.vy > -250) s.vy += (-250 - s.vy) * Math.min(1, 3 * h); sfx.whoosh(); }
    if (z.push && s.vy < 430) s.vy += 1500 * h;
    s.fy += s.vy * h; s.onGround = false;
    s.coyote = Math.max(0, s.coyote - h); s.buffer = Math.max(0, s.buffer - h);
    for (const o of s.objs) if (o.k === 'spring' && !o.fired && o.x < SX + HW && o.x + o.w > SX - HW && s.fy >= o.top - 6 && s.fy <= o.base + 4) { o.fired = true; o.comp = 1; s.vy = SPRING_V; s.fy = Math.min(s.fy, o.top - 1); s.squash = 0.3; s.flapCount = 0; sfx.spring(); return; }
    const pit = s.pits.find((p) => p.x <= SX && p.x + p.w > SX); const floor = pit ? GROUND_Y + LOW : GROUND_Y;
    if (pit && !s.inPit) sfx.fall(); s.inPit = !!pit;
    let landed: Obj | 'ground' | null = null, top = floor;
    if (s.fy >= floor) landed = 'ground';
    for (const o of s.objs) {
      if (!LAND[o.k] || o.gone) continue;
      if (o.x > SX + HW + 4 || o.x + o.w < SX - HW - 4) continue;
      if (s.vy >= 0 && prev <= o.top + 6 && s.fy >= o.top && o.top < top) { landed = o; top = o.top; }
    }
    if (landed) {
      const impact = s.vy; s.fy = top; s.vy = 0; s.onGround = true; s.flapCount = 0; s.standing = landed === 'ground' ? null : landed; s.coyote = COYOTE;
      if (landed !== 'ground' && landed.style === 'vanish' && landed.fade == null) { landed.fade = 0.9; sfx.poof(); }
      if (impact > 150) { s.squash = 0.18; s.flopT = 0.18; s.dust.push({ x: SX - 6, y: s.fy, t: 0 }, { x: SX + 8, y: s.fy, t: 0 }); if (landed === 'ground') sfx.land(); else if (landed.k === 'cloud') sfx.perch(); else sfx.land(); }
      if (s.buffer > 0) doHop();
    }
    if (!s.onGround && prev >= floor - 0.01 && s.fy < floor) s.coyote = COYOTE;
  }
  function press(): void {
    SND.unlock(); const s = S;
    if (s.mode === 'idle') { startRun(); return; }
    if (s.mode === 'done') { if (s.doneT >= 0.8) startRun(); return; }
    if (s.paused) { setPaused(false); return; }
    if (s.mode !== 'run') return;
    pressRun();
  }
  function pressRun(): void {
    const s = S; s.held = true; const fl = s.zn.fl;
    if (s.onGround || s.coyote > 0) doHop();
    else if (s.cloverT > 0) { s.vy = FLAPS[0] * fl; s.flapCount = Math.min(s.flapCount + 1, 9); sfx.flap(1); }
    else if (s.flapCount < FLAPS.length) { s.vy = FLAPS[s.flapCount] * fl; sfx.flap(s.flapCount); s.flapCount++; }
    else s.buffer = BUFFER;
  }
  /** the prototype's release (a short tap cuts the hop). The host resolves a tap on RELEASE, so nothing calls
   *  this: every hop is the held one. Kept so the rule is visible where it would live. */
  function release(): void { const s = S; s.held = false; if (s.vy < CUT_V && !s.onGround) s.vy = CUT_V; }
  void release;
  function lambX(i: number): number { const row = Math.floor(i / 3), col = i % 3; return 34 + col * 30 + (row % 2) * 14 + row * 4; }       // how far behind her a lamb stands
  function trailY(back: number): number { const s = S, target = s.dist - back; for (let k = s.trail.length - 1; k >= 0; k--) if (s.trail[k].d <= target) return s.trail[k].y; return GROUND_Y; }
  function driftOne(scatter?: boolean): void {                            // a lamb peels off and trots away into the hills, unhurt
    const s = S, lo = scatter ? 0 : Math.max(0, s.flock.length - 6), i = lo + Math.floor(Math.random() * (s.flock.length - lo)); const lamb = s.flock.splice(i, 1)[0]; if (!lamb) return;
    const back = lambX(Math.min(i, 23)); s.wander.push({ x: SX - back, y: trailY(back) - Math.floor(Math.min(i, 23) / 3) * 6, d: 0, dir: Math.random() < 0.5 ? -1 : 1, seed: Math.random() * 6 });
    if (s.levelT >= 222.1 && s.levelT < 226) for (let k = 0; k < 6; k++) s.motes.push({ x: SX - back + (Math.random() - 0.5) * 16, y: trailY(back) - 16, vx: -20 - Math.random() * 20, vy: -20 - Math.random() * 30, life: 1.6, ph: Math.random() * 6 });   // "the slippage is a failure": it is not, and the light says so
    if (s.levelT - lastDriftSnd > 0.45) { lastDriftSnd = s.levelT; sfx.drift(); }
  }

  function foesStep(h: number): void {
    const s = S;
    for (const f of s.foes) {
      if (f.k === 'drone') {
        f.age += h; f.x += f.vx * h;
        if (f.dead) { f.y += 240 * h; f.rot += 7 * h; f.vx = -30; continue; }
        f.y = f.y0 + Math.sin(f.age * 2) * 8;
        if (f.x < W - 10) { f.cy += h; if (f.cy > 0.15 && f.cy < 0.9) sfx.charge(); if (f.cy >= 0.9 && !f.fired) { f.fired = true; f.rings.push({ r: 10, hit: false }); sfx.blast(); } if (f.cy >= 2.3) { f.cy = 0; f.fired = false; } }
        for (const r of f.rings) r.r += 230 * h; f.rings = f.rings.filter((r) => r.r < 300);
      } else if (f.k === 'inspector') { f.ph += h * 8; if (f.dead) f.flip += h; else if (!f.still) f.x -= 60 * h; }
      else if (f.k === 'ghost') f.y = f.y0 + f.amp * Math.sin(s.t * 1.4 + f.gph);
      else if (f.k === 'beam') { const b = beamState(f); if (b > 0.15 && f.on <= 0.15 && f.x < W && f.x > 0) sfx.hum(); f.on = b; }
      else if (f.k === 'crook') { const th = f.A * Math.sin(2 * Math.PI * s.t / f.T + f.ph); if (Math.abs(th) > f.A * 0.96 && Math.abs(f.ang) <= f.A * 0.96 && f.x < W && f.x > 0) sfx.tick(); f.ang = th; }
      else if (f.k === 'pylon') { if (f.x < SX + 70) f.glow = Math.max(0, f.glow - h * 1.4); }
    }
  }
  function collide(h: number): void {
    const s = S, cy = s.fy - 14;
    for (const o of s.objs) {
      if (o.k === 'cloud') {
        if (o.style === 'mover') o.top = o.y0 + o.amp * Math.sin(s.t * 1.1 + o.ph);
        if (o.fade != null) { o.fade -= h; if (o.fade <= 0) o.gone = true; }
        continue;
      }
      if (o.x > SX + HW || o.x + o.w < SX - HW) continue;
      if (SOLID[o.k]) { if (s.fy > o.top + 9 && o !== s.standing) { hurt('solid:' + o.k, 'drop'); break; } }
      else if (o.k === 'thorn') { if (s.fy > o.top + 3) { hurt('thorn', 'drop'); } }
      else if (o.k === 'ceil') { if (s.fy - 32 < o.bot) { if (hurt('ceil', 'drop')) s.vy = Math.max(s.vy, 150); else s.vy = Math.max(s.vy, 60); } }
    }
    for (const p of s.pits) { const r = p.x + p.w; if (!p.hit && r > SX - HW && r <= SX + HW + 3 && s.fy > GROUND_Y + 9) { p.hit = true; hurt('wall', 'drop'); } }
    for (const f of s.foes) {
      if (f.k === 'drone' && !f.dead) {
        for (const r of f.rings) { if (r.hit) continue; const dx = SX - f.x, dy = cy - f.y, d = Math.hypot(dx, dy); if (dx < 0 && Math.abs(Math.atan2(dy, -dx)) <= 0.53 && Math.abs(d - r.r) <= 10) { r.hit = true; hurt('blast', 'scatter', 3); } }
        if (Math.abs(SX - f.x) < 24 && Math.abs(cy - f.y) < 22) {
          if (s.vy > 40 && s.fy <= f.y + 2) { f.dead = true; s.vy = -340; s.flapCount = 0; sfx.stomp(); s.bubbles.push({ x: f.x, y: f.y - 20, t: 0, s: g.bubbles.pop }); onStomp(f.x, f.y - 10); }
          else hurt('drone', 'scatter', 2);
        }
      } else if (f.k === 'inspector' && !f.dead) {
        if (SX + HW > f.x + 2 && SX - HW < f.x + f.w - 2 && s.fy > f.top + 2) {
          if (s.vy > 40 && s.fy <= f.top + 12) { f.dead = true; s.vy = -300; s.flapCount = 0; sfx.stomp(); s.bubbles.push({ x: f.x + 13, y: f.top - 14, t: 0, s: g.bubbles.flip }); onStomp(f.x + 13, f.top - 10); }
          else hurt('inspector', 'count');
        }
      } else if (f.k === 'ghost') { if (Math.hypot(SX - (f.x + 15), cy - f.y) < 22) hurt('ghost', 'drop'); }
      else if (f.k === 'crook') {
        const px_ = f.x + 4, py = GROUND_Y - f.rise, tx_ = px_ + f.L * Math.sin(f.ang), ty = py + f.L * Math.cos(f.ang), vx = tx_ - px_, vy = ty - py;
        const u = Math.max(0, Math.min(1, ((SX - px_) * vx + (cy - py) * vy) / (vx * vx + vy * vy))); if (Math.hypot(SX - (px_ + u * vx), cy - (py + u * vy)) < 13) hurt('crook', 'snag');
      } else if (f.k === 'beam') { if (f.on >= 0.95 && SX > f.x + 8 && SX < f.x + f.w - 8 && cy > GROUND_Y - 150 && cy < GROUND_Y + 8) hurt('beam', 'scatter', 1); }
    }
    for (const st of s.strays) {
      if (st.taken) continue;
      if (Math.abs(st.x - SX) < 20 && s.fy > st.y - 20 && s.fy - 28 < st.y + 4) {
        st.taken = true; s.called++; onCall(st.x, st.y); s.flock.push({ id: s.called }); s.maxFlock = Math.max(s.maxFlock, s.flock.length);
        s.bubbles.push({ x: st.x, y: st.y - 34, t: 0, s: g.bubbles.baa }); for (let k = 0; k < 4; k++) s.hearts.push({ x: st.x + (k - 1.5) * 8, y: st.y - 20, t: 0, k }); sfx.baa(s.called - 1);
      }
    }
    s.strays = s.strays.filter((q) => !q.taken);
    for (const c of s.clovers) if (!c.taken && Math.abs(c.x - SX) < 20 && Math.abs(c.y - (s.fy - 14)) < 24) { c.taken = true; s.cloverT = CLOVER_SECONDS; s.bubbles.push({ x: SX, y: s.fy - 50, t: 0, s: g.bubbles.clover }); sfx.clover(); }
    s.clovers = s.clovers.filter((c) => !c.taken);
  }
  // the world scrolls by the song's own clock: D(levelT)
  function advance(step: number): void {
    const s = S; s.cloverT = Math.max(0, s.cloverT - step); s.invT = Math.max(0, s.invT - step);
    const dxT = Math.max(0, D(s.levelT) - s.dist), sub = 2, h = step / sub, dx = dxT / sub;
    for (let k = 0; k < sub; k++) {
      s.dist += dx; s.nextX -= dx;
      for (const o of s.objs) o.x -= dx; for (const q of s.strays) q.x -= dx; for (const c of s.clovers) c.x -= dx; for (const p of s.pits) p.x -= dx; for (const z of s.zones) z.x -= dx;
      for (const f of s.foes) if (f.k !== 'drone') f.x -= dx;
      foesStep(h); physics(h); collide(h);
    }
  }

  // ══ v6 · THE SPECTACLE ══ the platform's own bombast, laid over the world without touching one rule of it. Nothing here
  // ever mocks a lamb: the drift is untouched and never breaks a streak; the programme only counts what it called.
  let cannonLast = -99, cannonSide = 1;                          // v7: when the last salvo went, and which side the next lone cannon stands on
  const SPEC: Spec = { full: !reducedMotion, combo: 0, heat: 0, tier: 0, best: 0, pulse: 0, lost: 0, lostText: '', shake: 0, flash: 0, flashGap: 0, fuel: 1, mi: 0, lastT: 0, finT: 0, trailT: 0, quiet: false, conf: [], rock: [], sparks: [], cannon: [], pops: [], litter: [], queue: [], lit: [1, 1, 1], ledFlash: 0, fanfare: 0 };
  function specReset(): void {
    Object.assign(SPEC, { combo: 0, heat: 0, tier: 0, best: 0, pulse: 0, lost: 0, shake: 0, flash: 0, flashGap: 0, fuel: 1, mi: 0, lastT: 0, finT: 0, trailT: 0, quiet: false, conf: [], rock: [], sparks: [], cannon: [], pops: [], litter: [], queue: [], lit: [1, 1, 1], ledFlash: 0, fanfare: 0 });
    cannonLast = -99; cannonSide = 1;
  }
  // v7: the pacing. A minimum gap between salvos (the longer, the earlier in the song), one cannon and 60% of the confetti before the first chorus, two at 85% in it, v6's in the second half.
  const CANNON_GAP = (t: number): number => (t < 66 ? 20 : t < 107 ? 12 : t < 152 ? 3 : t < 205 ? 3 : 0);
  const CANNON_AMT = (t: number): number => (t < 107 ? 0.6 : t < 152 ? 0.85 : 1);
  function fireCannons(mis: boolean): void {
    const t = S.levelT;
    if (t - cannonLast < CANNON_GAP(t)) return;
    cannonLast = t;
    const amt = CANNON_AMT(t), sides = t < 107 ? [cannonSide] : [-1, 1]; if (t < 107) cannonSide = -cannonSide;
    sides.forEach((side, i) => { SPEC.cannon.push({ side, life: -i * 0.07, fired: false, mis: mis && Math.random() < 0.7, amt }); });
  }
  function cannonShoot(c: Cannon): void {
    c.fired = true; const px_ = c.side < 0 ? 24 : W - 24, py = PLAY_BOT - 24;
    if (c.mis) { sfx.mis(); for (let i = 0; i < 5; i++) SPEC.pops.push({ k: 'puff', x: px_ + c.side * -4 + rnd1(-8, 8), y: py - 10 - i * 4, t: 0, r: 6 + i * 2 }); SPEC.conf.push({ x: px_, y: py - 10, vx: -c.side * 20, vy: -60, rot: 0, vr: 4, w: 5, h: 9, col: BOMB.gold, life: 1.2, ph: 0, rib: true, trail: [] }); return; }
    sfx.cannon(); if (SPEC.full && !SPEC.quiet) SPEC.shake = Math.max(SPEC.shake, 2.2 * (0.5 + 0.5 * c.amt));
    const dir = c.side < 0 ? 1 : -1, n = Math.round((52 + Math.round(Math.random() * 14)) * c.amt);
    for (let i = 0; i < n && SPEC.conf.length < 300; i++) { const sp = rnd1(250, 520), a = (dir > 0 ? -1.15 : -Math.PI + 1.15) + rnd1(-0.34, 0.34);
      SPEC.conf.push({ x: px_ + Math.cos(a) * 18, y: py - 4 + Math.sin(a) * 18, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: rnd1(0, 6.28), vr: rnd1(-9, 9), w: rnd1(3, 5.5), h: rnd1(4.5, 8), col: CONFC[Math.floor(Math.random() * CONFC.length)], life: rnd1(2.6, 4), ph: rnd1(0, 6.28), rib: false, trail: [] }); }
    for (let i = 0, nr = c.amt < 1 ? 4 : 7; i < nr; i++) { const sp = rnd1(280, 480), a = (dir > 0 ? -1.15 : -Math.PI + 1.15) + rnd1(-0.3, 0.3);
      SPEC.conf.push({ x: px_ + Math.cos(a) * 18, y: py - 4 + Math.sin(a) * 18, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: 0, vr: 0, w: 2, h: 2, col: CONFC[Math.floor(Math.random() * CONFC.length)], life: rnd1(2.4, 3.4), ph: rnd1(0, 6.28), rib: true, trail: [] }); }
    for (let i = 0; i < 6; i++) SPEC.pops.push({ k: 'puff', x: px_ + dir * 10 + rnd1(-6, 6), y: py - 22 - i * 4, t: 0, r: 6 + i * 2 });
    for (let i = 0, nl = Math.round(26 * c.amt); i < nl; i++) SPEC.litter.push({ wd: S.dist + rnd1(-120, 300), dy: rnd1(6, 30), col: CONFC[Math.floor(Math.random() * CONFC.length)], r: rnd1(0, 3) });
    if (SPEC.litter.length > 220) SPEC.litter.splice(0, SPEC.litter.length - 220);
  }
  function launchRocket(mis: boolean, big: boolean): void {
    const x0 = rnd1(34, W - 34), pair = FW_PAIRS[Math.floor(Math.random() * FW_PAIRS.length)];
    SPEC.rock.push({ x0, x: x0, y: PLAY_BOT, y0: PLAY_BOT, yt: rnd1(70, 215), dur: rnd1(0.7, 1.0), t: 0, vx: rnd1(-14, 14), pair, fizz: !!mis, big: !!big }); sfx.fwLaunch();
  }
  function burst(r: Rocket): void {
    const n = Math.round(rnd1(32, 54) * (r.big ? 1.35 : 1)), kind = Math.floor(Math.random() * 3); sfx.fwBurst();
    for (let i = 0; i < n && SPEC.sparks.length < 520; i++) {
      const a = (i / n) * Math.PI * 2 + rnd1(-0.05, 0.05), sp = kind === 0 ? 118 + rnd1(-6, 6) : kind === 1 ? rnd1(30, 140) : rnd1(60, 110), willow = kind === 2;
      SPEC.sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: willow ? rnd1(1.4, 2.0) : rnd1(0.9, 1.4), max: 1.6, col: willow ? BOMB.gold : r.pair[i % 2], r: rnd1(1.3, 2.4), g: willow ? 55 : 95, dr: willow ? 0.5 : 0.8 });
    }
    SPEC.pops.push({ k: 'flashring', x: r.x, y: r.y, t: 0, r: 8 });
    if (SPEC.full) { SPEC.shake = Math.max(SPEC.shake, SPEC.quiet ? 0.4 : 1.1); if (SPEC.flashGap <= 0 && !SPEC.quiet) { SPEC.flash = Math.max(SPEC.flash, 0.1); SPEC.flashGap = 0.5; } }
  }
  const missP = (t: number): number => (t < 232 ? 0 : t < 258 ? 0.3 : t < 270 ? 0.12 : 0.3 + 0.7 * (1 - SPEC.fuel));
  function fireMark(m: [number, string]): void {
    const t = m[0], code = m[1], k = code.includes('q'), num = parseInt((code.match(/\d+/) || ['3'])[0], 10), pm = missP(t);
    if (code.includes('c')) fireCannons(Math.random() < pm);
    if (code.includes('f')) for (let i = 0; i < num; i++) SPEC.queue.push({ at: 0.12 + i * 0.23, mis: Math.random() < pm, big: num >= 8 });
    SPEC.fanfare = 1; if (!k && SPEC.full && !SPEC.quiet) SPEC.shake = Math.max(SPEC.shake, 1.6);
  }

  // ── the streak: OUTREACH combos. A call adds one; a bump ends it; the drift of a lamb never does (the programme only counts what it called) ──
  function tierOf(c: number): number { let k = 0; for (const [n] of TIERS) if (c >= n) k++; return k; }
  function onCall(x: number, y: number): void {
    const old = SPEC.tier; SPEC.combo++; SPEC.heat = 4.2; SPEC.best = Math.max(SPEC.best, SPEC.combo); SPEC.tier = tierOf(SPEC.combo); SPEC.pulse = 1; SPEC.lost = 0;
    if (SPEC.combo >= 3) sfx.sparkle(SPEC.combo);
    if (SPEC.tier > old) { if (SPEC.tier >= 2) sfx.horn(SPEC.tier); if (SPEC.tier >= 3) fireCannons(false); if (SPEC.tier >= 2 && SPEC.full && !SPEC.quiet) SPEC.shake = Math.max(SPEC.shake, 2.5); }
    const n = 5 + SPEC.tier * 3; for (let i = 0; i < n && SPEC.sparks.length < 520; i++) { const a = rnd1(0, 6.28), sp = rnd1(40, 120); SPEC.sparks.push({ x, y: y - 14 + S.camY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, life: rnd1(0.5, 0.9), max: 0.9, col: CONFC[Math.floor(Math.random() * CONFC.length)], r: rnd1(1.2, 2.2), g: 120, dr: 1 }); }
    if (SPEC.tier >= 2 && SPEC.combo % 2 === 0) SPEC.pops.push({ k: 'shout', x: x + rnd1(-26, 26), y: y - 60 + S.camY, t: 0, s: g.shouts[Math.floor(Math.random() * g.shouts.length)], col: CONFC[Math.floor(Math.random() * 6)] });
    SPEC.ledFlash = 0.35;
  }
  function onBump(): void { if (SPEC.combo >= 3) { SPEC.lost = 1; SPEC.lostText = TIERS[Math.max(0, SPEC.tier - 1)][1]; sfx.fizzBanner(); } SPEC.combo = 0; SPEC.heat = 0; SPEC.tier = 0; }
  function onStomp(x: number, y: number): void { SPEC.pops.push({ k: 'shout', x, y: y + S.camY, t: 0, s: g.stompShout, col: BOMB.hot }); for (let i = 0; i < 14; i++) { const a = rnd1(0, 6.28), sp = rnd1(60, 190); SPEC.sparks.push({ x, y: y + S.camY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rnd1(0.4, 0.8), max: 0.8, col: CONFC[i % CONFC.length], r: rnd1(1.4, 2.4), g: 160, dr: 1 }); } }

  // ── one frame of it ──
  function specUpdate(step: number): void {
    const s = S, t = s.levelT; SPEC.quiet = t >= 205 && t < 232;
    if (t < SPEC.lastT - 0.4) { const i = MARKS.findIndex((m) => m[0] > t - 1.0); SPEC.mi = i < 0 ? MARKS.length : i; }
    SPEC.lastT = t; while (SPEC.mi < MARKS.length && MARKS[SPEC.mi][0] <= t) { if (t - MARKS[SPEC.mi][0] < 1.2) fireMark(MARKS[SPEC.mi]); SPEC.mi++; }
    SPEC.fuel = t < 269.6 ? 1 : Math.max(0, 1 - (t - 269.6) / 4.6);
    for (let i = 0; i < 3; i++) { const on = SPEC.fuel > 0.78 - i * 0.26 ? 1 : 0; if (SPEC.lit[i] && !on) sfx.lightsOut(); SPEC.lit[i] = on; }
    if (t >= 261.9 && t < 270.4) { SPEC.finT -= step; if (SPEC.finT <= 0) { SPEC.finT = 0.36; launchRocket(Math.random() < missP(t), true); if (Math.random() < 0.45) launchRocket(Math.random() < missP(t), true); } }
    else if (t >= 270.4 && t < 277 && SPEC.fuel > 0) { SPEC.finT -= step; if (SPEC.finT <= 0) { SPEC.finT = 0.7 + 1.9 * (1 - SPEC.fuel); launchRocket(Math.random() < missP(t), false); } }
    // the streak: it lives on a heat bar, four seconds long, topped up by every call
    if (SPEC.heat > 0) { SPEC.heat -= step; if (SPEC.heat <= 0) { SPEC.heat = 0; if (SPEC.combo >= 3) { SPEC.lost = 1; SPEC.lostText = TIERS[Math.max(0, SPEC.tier - 1)][1]; } SPEC.combo = 0; SPEC.tier = 0; } }
    SPEC.pulse = Math.max(0, SPEC.pulse - step * 2.6); SPEC.lost = Math.max(0, SPEC.lost - step * 1.6); SPEC.flash = Math.max(0, SPEC.flash - step * 0.45); SPEC.flashGap = Math.max(0, SPEC.flashGap - step); SPEC.ledFlash = Math.max(0, SPEC.ledFlash - step); SPEC.fanfare = Math.max(0, SPEC.fanfare - step * 1.4);
    const base = SPEC.tier > 0 && !SPEC.quiet ? TIERS[SPEC.tier - 1][2] : (SPEC.tier > 0 ? TIERS[SPEC.tier - 1][2] * 0.4 : 0);
    SPEC.shake = Math.max(base, SPEC.shake * Math.pow(0.0006, step));
    // her sparkle trail, while the streak is on
    if (SPEC.tier >= 2) { SPEC.trailT -= step; if (SPEC.trailT <= 0) { SPEC.trailT = 0.035; if (SPEC.sparks.length < 520) SPEC.sparks.push({ x: SX - 14, y: s.fy - 16 + s.camY + rnd1(-9, 9), vx: -70 - rnd1(0, 40), vy: rnd1(-26, 26), life: rnd1(0.5, 0.9), max: 0.9, col: CONFC[Math.floor(Math.random() * CONFC.length)], r: rnd1(1.2, 2.4), g: 20, dr: 1 }); } }
    for (const q of SPEC.queue) { q.at -= step; if (q.at <= 0) { launchRocket(q.mis, q.big); q.done = true; } } SPEC.queue = SPEC.queue.filter((q) => !q.done);
    // cannons
    for (const c of SPEC.cannon) { c.life += step; if (!c.fired && c.life >= 0.28) cannonShoot(c); }
    SPEC.cannon = SPEC.cannon.filter((c) => c.life < 1.7);
    // rockets
    for (const r of SPEC.rock) {
      r.t += step; const k = Math.min(1, r.t / r.dur), e = 1 - (1 - k) * (1 - k); r.y = r.y0 + (r.yt - r.y0) * e; r.x = r.x0 + r.vx * r.t;
      if (SPEC.sparks.length < 520) SPEC.sparks.push({ x: r.x, y: r.y + 4, vx: rnd1(-10, 10), vy: rnd1(10, 40), life: 0.45, max: 0.45, col: r.fizz && k > 0.7 ? BOMB.orange : BOMB.gold, r: 1.4, g: 30, dr: 1 });
      if (k >= 1) { r.dead = true; if (r.fizz) { sfx.fizzle(); for (let i = 0; i < 7; i++) SPEC.sparks.push({ x: r.x, y: r.y, vx: rnd1(-26, 26), vy: rnd1(-10, 20), life: rnd1(0.6, 1.1), max: 1.1, col: i % 2 ? BOMB.gold : BOMB.white, r: 1.3, g: 150, dr: 1 }); SPEC.pops.push({ k: 'puff', x: r.x, y: r.y, t: 0, r: 7 }); } else burst(r); }
    }
    SPEC.rock = SPEC.rock.filter((r) => !r.dead);
    for (const p of SPEC.sparks) { p.life -= step; p.x += p.vx * step; p.y += p.vy * step; p.vy += p.g * step; p.vx *= Math.pow(0.4, step * p.dr); }
    SPEC.sparks = SPEC.sparks.filter((p) => p.life > 0);
    for (const p of SPEC.conf) {
      p.life -= step; p.rot += p.vr * step; p.ph += step * 9; p.x += p.vx * step; p.y += p.vy * step;
      if (p.rib) { p.x += Math.sin(p.ph * 1.3) * 22 * step; p.trail.push([p.x, p.y]); if (p.trail.length > 10) p.trail.shift(); }
      if (p.vy < 0) p.vy += 380 * step; else p.vy += (p.rib ? 160 : 70 - p.vy) * Math.min(1, 2.4 * step); p.vx *= Math.pow(0.35, step);
    }
    SPEC.conf = SPEC.conf.filter((p) => p.life > 0 && p.y < PLAY_BOT + 8);
    for (const p of SPEC.pops) p.t += step; SPEC.pops = SPEC.pops.filter((p) => p.t < (p.k === 'shout' ? 0.9 : p.k === 'puff' ? 0.8 : 0.5));
    for (const l of SPEC.litter) if (SX + (l.wd - s.dist) < -12) l.gone = true; SPEC.litter = SPEC.litter.filter((l) => !l.gone);
  }

  // ── drawing primitives ──
  const rect = (x: number, y: number, w: number, h: number, c: string): void => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  function circ(x: number, y: number, r: number, c: string): void { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); }
  function ell(x: number, y: number, rx: number, ry: number, c: string, rot = 0): void { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); }
  function rr(x: number, y: number, w: number, h: number, r: number, fill: string | null, stroke?: string, lw?: number): void { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); } }
  function tx(s: string, x: number, y: number, size: number, col: string, align: CanvasTextAlign = 'left', w = 600): void { ctx.font = `${w} ${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = col; ctx.fillText(s, x, y); }
  function wrap(s: string, maxW: number, size: number, w?: number): string[] { ctx.font = `${w || 600} ${size}px ${FONT}`; const words = s.split(' '), lines: string[] = []; let line = ''; for (const wd of words) { const t2 = line ? line + ' ' + wd : wd; if (ctx.measureText(t2).width > maxW && line) { lines.push(line); line = wd; } else line = t2; } if (line) lines.push(line); return lines; }
  const A = (a: number, fn: () => void): void => { ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, a)); fn(); ctx.restore(); };
  const ADD = (fn: () => void): void => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; fn(); ctx.restore(); };
  function poly(pts: Array<[number, number]>, fill: string): void { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
  function line(x1: number, y1: number, x2: number, y2: number, col: string, w: number): void { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(); }
  // the lyric answers: an object glows gold for 2.4 s once its line is sung
  const litNow = (o: { lt?: number }): boolean => o.lt != null && S.levelT >= o.lt && S.levelT < o.lt + 2.4;
  function glowBox(o: { lt?: number }, x: number, y: number, w: number, h: number): void { if (!litNow(o)) return; const k = S.levelT - (o.lt as number); const a = Math.min(1, k / 0.15) * Math.min(1, (2.4 - k) / 0.6); A(a * (0.65 + 0.25 * Math.sin(S.t * 7)), () => rr(x - 3, y - 3, w + 6, h + 6, 5, null, FLOPPY.sun, 2.5)); }

  // ── lettering of the platform's own voice ──
  function garish(str: string, x: number, y: number, size: number, o: { rot?: number; sc?: number; maxW?: number; rim?: string; c0?: string; c1?: string; c2?: string } = {}): void {   // a thick-outlined, shadowed, gold-to-hot-pink word
    ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); const sc = o.sc || 1; ctx.scale(sc, sc);
    ctx.font = `900 ${size}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    const mw = ctx.measureText(str).width, fit = o.maxW ? Math.min(1, o.maxW / mw) : 1; ctx.scale(fit, fit);
    ctx.strokeStyle = BOMB.ink; ctx.lineWidth = size * 0.34; ctx.strokeText(str, 2, 3); ctx.strokeStyle = o.rim || BOMB.hot; ctx.lineWidth = size * 0.26; ctx.strokeText(str, 0, 0);
    ctx.strokeStyle = BOMB.white; ctx.lineWidth = size * 0.12; ctx.strokeText(str, 0, 0);
    const gr = ctx.createLinearGradient(0, -size * 0.5, 0, size * 0.5); gr.addColorStop(0, o.c0 || BOMB.white); gr.addColorStop(0.3, o.c1 || BOMB.gold); gr.addColorStop(1, o.c2 || BOMB.orange); ctx.fillStyle = gr; ctx.fillText(str, 0, 0);
    ctx.restore();
  }
  function starburst(cx: number, cy: number, r0: number, r1: number, n: number, rot: number, col: string, a: number): void { A(a, () => { ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const ang = rot + i * Math.PI / n, rr_ = i % 2 ? r1 : r0; if (i) ctx.lineTo(cx + Math.cos(ang) * rr_, cy + Math.sin(ang) * rr_); else ctx.moveTo(cx + Math.cos(ang) * rr_, cy + Math.sin(ang) * rr_); } ctx.closePath(); ctx.fillStyle = col; ctx.fill(); }); }
  function bulbRing(x: number, y: number, w: number, h: number, gap: number, phase: number, on: boolean): void {
    const cols = [BOMB.gold, BOMB.hot, BOMB.white, BOMB.cyan]; let i = 0;
    const put = (bx: number, by: number): void => { const lit = on && (Math.floor(S.t * 8) + i) % 4 < 2; A(lit ? 1 : 0.35, () => circ(bx, by, 2.2, cols[(i + phase) % 4])); if (lit) ADD(() => A(0.35, () => circ(bx, by, 5, cols[(i + phase) % 4]))); i++; };
    for (let bx = x; bx <= x + w; bx += gap) put(bx, y); for (let by = y + gap; by < y + h; by += gap) put(x + w, by); for (let bx = x + w; bx >= x; bx -= gap) put(bx, y + h); for (let by = y + h - gap; by > y; by -= gap) put(x, by);
  }
  function lamps(str: string, x: number, y: number, pitch: number, dot: number, col: string): number { let cx = x; ctx.fillStyle = col; for (const ch of String(str).toUpperCase()) { const gl = GLY[ch] || GLY[' ']; for (let i = 0; i < 15; i++) if (gl[i] === '1') ctx.fillRect(cx + (i % 3) * pitch, y + Math.floor(i / 3) * pitch, dot, dot); cx += 4 * pitch; } return cx - x; }

  // ── the big things ──
  function lambyBalloon(x: number, y: number, sc: number, sag: number, wob: number, gy: number): void {   // the parade balloon: a woolly lamb the size of a barn
    const ty = gy - 4;
    ctx.lineWidth = 1.4; ctx.strokeStyle = rgba(ERA3.ink, 0.55);
    for (const dx of [-26, 26]) { const ax = x + dx * 1.6 * sc + Math.sin(S.t * 0.8 + dx) * 6; ctx.beginPath(); ctx.moveTo(x + dx * sc, y + 44 * sc * (1 - 0.3 * sag)); ctx.quadraticCurveTo(x + dx * 1.3 * sc, (y + ty) / 2, ax, ty); ctx.stroke(); A(0.9, () => { rr(ax - 8, ty - 7, 16, 9, 3, FLOPPY.fenceDk); rr(ax - 6, ty - 6, 12, 3, 2, FLOPPY.fence); }); }
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc * (1 - 0.36 * sag)); ctx.rotate(wob + sag * 0.1);
    for (let k = 0; k < 2; k++) { const col = k ? FLOPPY.wool : FLOPPY.woolShade, o = k ? -3 : 0; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; circ(Math.cos(a) * 46 + o, Math.sin(a) * 44 + o, 17, col); } circ(o, o, 49, col); }
    for (let i = 0; i < 3; i++) A(0.18, () => { ctx.strokeStyle = FLOPPY.woolShade; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-24 + i * 22, 40, 24, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); });
    if (sag > 0.1) A(Math.min(0.6, sag), () => { ctx.strokeStyle = FLOPPY.woolShade; ctx.lineWidth = 2.4; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-40 + i * 24, -30); ctx.quadraticCurveTo(-34 + i * 24, 0, -42 + i * 24 + (i % 2 ? 14 : -8), 34); ctx.stroke(); } });
    for (const sd of [-1, 1]) { ctx.save(); ctx.translate(sd * 38, 6 + sag * 6); ctx.rotate(sd * (0.42 + 0.18 * Math.sin(S.t * 1.7 + sd) + sag * 0.6)); ell(0, 12, 9, 17, FLOPPY.face); ell(0, 11, 4, 11, SPC.earInner); ctx.restore(); }
    ell(0, 8, 29, 27, FLOPPY.face); circ(-11, 0 + sag * 3, 8.5, ERA3.white); circ(11, 0 + sag * 3, 8.5, ERA3.white); circ(-10, 1 + sag * 4, 4.4, BOMB.ink); circ(12, 1 + sag * 4, 4.4, BOMB.ink); circ(-11.6, -1 + sag * 3, 1.6, ERA3.white); circ(10.4, -1 + sag * 3, 1.6, ERA3.white);
    A(0.85, () => { circ(-20, 14, 6, BOMB.hot); circ(20, 14, 6, BOMB.hot); }); ell(0, 12, 6, 4, SPC.nose);
    ctx.strokeStyle = ERA3.white; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 15, 11, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); ctx.lineCap = 'butt';
    A(0.55, () => ell(-20, -26, 16, 8, ERA3.white, -0.6));
    for (const sd of [-1, 1]) for (const k of [0, 1]) { const sw = Math.sin(S.t * 2.1 + k + sd) * (3 - sag * 2); rr(sd * (14 + k * 16) - 4 + sw, 46, 8, 16, 3, FLOPPY.leg); rr(sd * (14 + k * 16) - 4.5 + sw, 58, 9, 5, 2, BOMB.ink); }
    const hy = -62 + sag * 32; ADD(() => A(0.5, () => circ(0, hy, 30, BOMB.gold))); ctx.save(); ctx.translate(0, hy); ctx.rotate(Math.sin(S.t * 1.1) * 0.06 + sag * 0.35); ctx.strokeStyle = BOMB.gold; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(0, 0, 25, 7, 0, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = ERA3.white; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(0, 56 + sag * 8); ctx.rotate(Math.sin(S.t * 1.3) * 0.04); rr(-66, -2, 132, 18, 4, BOMB.hot); rect(-62, 1, 124, 2, ERA3.white); tx(g.balloonSash, 0, 8, 9.5, ERA3.white, 'center', 900); poly([[-66, 0], [-80, 6 + Math.sin(S.t * 3) * 4], [-66, 16]], BOMB.hot); poly([[66, 0], [80, 6 + Math.sin(S.t * 3 + 1) * 4], [66, 16]], BOMB.hot); ctx.restore();
    ctx.restore();
  }
  function balloonPose(t: number): { x: number; y: number; sag: number; vis: number } {   // when, where, how swollen. The last pass is the finale: it hovers, and then lets the air out.
    const ps: Array<[number, number, number]> = [[14, 54, 118], [84, 128, 100], [138, 186, 150], [188, 206, 112], [233, 255, 135]];
    if (S.mode === 'idle') { const k = (S.t * 0.04) % 1; return { x: W + 110 - k * (W + 260), y: 118, sag: 0, vis: 1 }; }
    for (const [a, b, y] of ps) if (t >= a && t < b) { const k = (t - a) / (b - a); return { x: W + 110 - k * (W + 260), y, sag: 0, vis: 1 }; }
    if (t >= 255.5) { const k = Math.min(1, (t - 255.5) / 9), e = 1 - (1 - k) * (1 - k); const sag = Math.max(0, 1 - SPEC.fuel), x = W + 110 - e * (W + 110 - 62) - (t > 270 ? (t - 270) * 6 : 0); return { x, y: 134 + sag * 200, sag, vis: 1 }; }
    return { x: 0, y: 0, sag: 0, vis: 0 };
  }
  function choirDrone(x: number, y: number, sc: number, pulse: number, i: number): void {
    ctx.save(); ctx.translate(x, y); const k = sc * (1 + 0.24 * pulse); ctx.scale(k, k);
    A(0.5, () => { ell(-7, -14, 9 + Math.sin(S.t * 30 + i) * 2, 1.8, ERA3.grey); ell(8, -14, 9 + Math.cos(S.t * 30 + i) * 2, 1.8, ERA3.grey); }); rect(-8, -13, 2, 5, ERA3.grey); rect(7, -13, 2, 5, ERA3.grey);
    rr(-14, -9, 30, 17, 8, ERA3.white); rr(-13.5, -8.5, 29, 16, 8, null, ERA3.grey, 1.4); rect(-5, -2, 14, 3, BOMB.hot); circ(10, -1, 3.2, ERA3.ink); circ(11, -2, 1, ERA3.white);
    poly([[-5, 8], [5, 8], [13, 23], [-13, 23]], BOMB.gold); ell(0, 23, 13, 3, FLOPPY.hillDk); ell(0, 23, 10, 2, ERA3.white);
    ctx.strokeStyle = ERA3.grey; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-10, 8); ctx.lineTo(-10, 18); ctx.moveTo(10, 8); ctx.lineTo(10, 18); ctx.stroke(); poly([[-10, 18], [10, 18], [0, 30]], CONFC[i % 6]);
    ctx.restore();
  }
  function drawChoir(t: number): void {
    const wins: Array<[number, number]> = [[134.5, 150.5], [181, 198], [258.2, 273]]; let k = 0, fin = false;
    for (const [a, b] of wins) { const kk = Math.min(smooth((t - a) / 2.2), smooth((b - t) / 2.2)); if (kk > k) { k = kk; fin = a > 250; } }
    if (fin && SPEC.fuel < 1) k *= SPEC.fuel;
    if (S.mode === 'idle' || k < 0.02) return;
    const sc = 0.78, pulse = Math.max(0, 1 - wordAge(t) / 0.24), N = fin ? 9 : 7, cx = W / 2 + 6 + (1 - k) * 160, cy = 100 + S.camY * 0.08 + Math.sin(S.t * 1.3) * 3 - (1 - k) * 24;
    A(0.92 * k, () => {
      for (let i = 0; i < N; i++) {
        const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1, dx = i === 0 ? 0 : side * row * 32, dy = row * 13 + Math.sin(S.t * 2 + i) * 2, drift = fin && SPEC.fuel < 0.7 ? (0.7 - SPEC.fuel) * 80 * (i % 3 - 1) : 0;
        if (pulse > 0) A(pulse * 0.6, () => { ctx.strokeStyle = BOMB.gold; ctx.lineWidth = 1.8; for (const r of [14, 24]) { ctx.beginPath(); ctx.arc(cx + dx + drift, cy + dy + 12, r + (1 - pulse) * 16, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke(); } });
        choirDrone(cx + dx + drift, cy + dy, sc, pulse, i); if (pulse > 0.3) A(pulse, () => tx(i % 2 ? '♪' : '♫', cx + dx + 10 + drift, cy + dy - 22 - (1 - pulse) * 14, 11, CONFC[(i + 2) % 6], 'center', 800));
      }
    });
  }
  function searchlights(e: Env, t: number): void {
    const fin = t >= 258, vis = (0.07 + 0.2 * Math.min(1, e.tint * 1.7) + 0.08 * e.stars + (fin ? 0.1 : 0)) * (S.mode === 'idle' ? 1.6 : 1); if (vis < 0.03) return;
    ADD(() => {
      for (let i = 0; i < 3; i++) {
        if (!SPEC.lit[i] && S.mode === 'run') continue; const bx = [34, 150, 266][i], ang = -Math.PI / 2 + 0.75 * Math.sin(S.t * 0.62 + i * 2.2) * (i === 1 ? 1 : 0.8) + (i === 0 ? 0.25 : i === 2 ? -0.25 : 0), L = 600, sp = 0.05;
        const x1 = bx + Math.cos(ang - sp) * L, y1 = PLAY_BOT + Math.sin(ang - sp) * L, x2 = bx + Math.cos(ang + sp) * L, y2 = PLAY_BOT + Math.sin(ang + sp) * L; const col = fin ? [BOMB.cyan, BOMB.hot, BOMB.gold][i] : SPC.beamWarm; const gr = ctx.createLinearGradient(bx, PLAY_BOT, bx + Math.cos(ang) * L, PLAY_BOT + Math.sin(ang) * L);
        gr.addColorStop(0, col); gr.addColorStop(1, rgba(ERA3.white, 0)); ctx.globalAlpha = vis; ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(bx - 4, PLAY_BOT); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(bx + 4, PLAY_BOT); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
  }
  function godRays(e: Env, cam: number): void {
    const k = Math.max(0, e.warm - 0.1) * 1.7 * (1 - e.rain) * (1 - e.fog * 0.5); if (k < 0.03) return; const sx = W - 54, sy = sunY(S.levelT) + cam * 0.12;
    ADD(() => {
      for (let i = 0; i < 13; i++) { const a = Math.PI * 0.52 + i * 0.12 + Math.sin(S.t * 0.2 + i * 1.7) * 0.03, len = 560, sp = 0.03 + 0.018 * (i % 3), gr = ctx.createLinearGradient(sx, sy, sx + Math.cos(a) * len, sy + Math.sin(a) * len);
        gr.addColorStop(0, rgba(SPC.ray, 0.34 * k * (0.7 + 0.3 * Math.sin(S.t * 0.9 + i)))); gr.addColorStop(1, rgba(SPC.ray, 0)); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a - sp) * len, sy + Math.sin(a - sp) * len); ctx.lineTo(sx + Math.cos(a + sp) * len, sy + Math.sin(a + sp) * len); ctx.closePath(); ctx.fill(); }
      for (let i = 1; i <= 4; i++) { const fx = sx + (W / 2 - sx) * i * 0.55, fy = sy + (240 - sy) * i * 0.55; A(0.1 * k, () => circ(fx, fy, 6 + i * 5, i % 2 ? BOMB.pink : BOMB.cyan)); }
    });
  }
  function bunting(t: number): void {
    const k = Math.max(smooth((t - 106) / 2) * smooth((152 - t) / 2), t >= 258 ? SPEC.fuel : 0, S.mode === 'idle' ? 1 : 0); if (k < 0.02) return;
    A(0.95 * k, () => {
      for (const [x0, x1, y0] of [[-10, W / 2 + 10, HEADER_H + 5], [W / 2 - 10, W + 10, HEADER_H + 5]]) {
        ctx.strokeStyle = BOMB.ink; ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = 0; i <= 12; i++) { const u = i / 12, x = x0 + (x1 - x0) * u, y = y0 + Math.sin(u * Math.PI) * 14; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
        for (let i = 0; i < 11; i++) { const u = (i + 0.5) / 12, x = x0 + (x1 - x0) * u, y = y0 + Math.sin(u * Math.PI) * 14, sw = Math.sin(S.t * 2.2 + i) * 1.6; poly([[x - 5, y], [x + 5, y], [x + sw, y + 11]], CONFC[(i * 3 + (x0 > 0 ? 1 : 0)) % 7]); }
      }
    });
  }
  function tentDraw(x: number, base: number, lit: number): void {   // the revival tent: stripes, scallops, a stage with a Lamby cut-out, a bulb arch, and a flag
    const w = 156, wallH = 38, top = base - wallH, apex = base - 112, cx = x + w / 2, c1 = BOMB.hot, c2 = ERA3.white;
    ADD(() => A(0.22 * lit, () => ell(cx, base - 14, w * 0.7, 40, BOMB.gold)));
    for (let i = 0; i < 8; i++) { const a = x + i * w / 8, b = a + w / 8, col = i % 2 ? c2 : c1; poly([[a, top], [b, top], [cx, apex]], col); rect(a, top, w / 8 + 0.6, wallH, col); }
    A(0.18, () => poly([[cx, apex], [x + w, top], [cx + 12, top]], ERA3.ink)); for (let i = 0; i < 8; i++) { const col = i % 2 ? c2 : c1; circ(x + w / 16 + i * w / 8, top + 2, w / 16, col); }
    rect(cx - 1, apex - 22, 2, 24, FLOPPY.fenceDk); poly([[cx + 1, apex - 22], [cx + 20 + Math.sin(S.t * 3) * 3, apex - 17], [cx + 1, apex - 11]], BOMB.gold);
    rr(cx - 26, base - 38, 52, 38, 10, SPC.stage); A(0.9 * lit, () => { const gr = ctx.createRadialGradient(cx, base - 18, 3, cx, base - 18, 34); gr.addColorStop(0, BOMB.gold); gr.addColorStop(1, rgba(BOMB.orange, 0.2)); ctx.fillStyle = gr; ctx.fillRect(cx - 25, base - 37, 50, 37); });
    rect(cx - 25, base - 5, 50, 5, FLOPPY.fenceDk); sheep(cx + Math.sin(S.t * 1.8) * 7, base - 5 - Math.abs(Math.sin(S.t * 3.6)) * 5, 0.5, { phase: S.t * 5 }); A(0.9, () => { ctx.strokeStyle = BOMB.gold; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(cx + Math.sin(S.t * 1.8) * 7 + 3, base - 40 - Math.abs(Math.sin(S.t * 3.6)) * 5, 8, 2.4, 0, 0, Math.PI * 2); ctx.stroke(); });
    for (let i = 0; i < 9; i++) { const a = Math.PI + i * Math.PI / 8, bx = cx + Math.cos(a) * 30; const on = lit > 0.4 && (Math.floor(S.t * 6) + i) % 3 !== 0; A(on ? 1 : 0.3, () => circ(bx, base - 38 + Math.sin(a) * 14, 1.9, i % 2 ? BOMB.gold : ERA3.white)); }
    rr(cx - 34, top - 20, 68, 14, 3, SPC.stage); tx(g.tentSign, cx, top - 12.5, 8.5, (Math.floor(S.t * 3) % 2 || lit < 0.4) ? BOMB.gold : BOMB.hot, 'center', 900);
    ADD(() => { for (let i = 0; i < 2; i++) { const ang = -Math.PI / 2 + 0.6 * Math.sin(S.t * 0.8 + i * 3.1) + (i ? 0.3 : -0.3), L = 340, sp = 0.045; const gr = ctx.createLinearGradient(cx, apex - 20, cx + Math.cos(ang) * L, apex - 20 + Math.sin(ang) * L); gr.addColorStop(0, i ? BOMB.cyan : BOMB.pink); gr.addColorStop(1, rgba(ERA3.white, 0)); ctx.globalAlpha = 0.34 * lit; ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(cx - 2, apex - 20); ctx.lineTo(cx + Math.cos(ang - sp) * L, apex - 20 + Math.sin(ang - sp) * L); ctx.lineTo(cx + Math.cos(ang + sp) * L, apex - 20 + Math.sin(ang + sp) * L); ctx.lineTo(cx + 2, apex - 20); ctx.fill(); } ctx.globalAlpha = 1; });
  }
  function jumbotron(x: number, y: number, sc: number, o: { dead?: number; legs?: boolean; cables?: boolean } = {}): void {   // the stadium board: CALLED, in lamps. Panels die from the edges inward when the fuel runs out.
    const fw = 120, fh = 74, called = S.called, dead = o.dead || 0; ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    if (o.legs) { rect(22, fh, 6, 80, FLOPPY.hillDk); rect(fw - 28, fh, 6, 80, FLOPPY.hillDk); rect(18, fh + 50, 14, 4, FLOPPY.fenceDk); rect(fw - 32, fh + 50, 14, 4, FLOPPY.fenceDk); }
    if (o.cables) { ctx.strokeStyle = ERA3.grey; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(14, -90); ctx.moveTo(fw - 14, 0); ctx.lineTo(fw - 14, -90); ctx.stroke(); }
    rr(-2, -2, fw + 4, fh + 4, 8, SPC.boardFrame); rr(-2, -2, fw + 4, fh + 4, 8, null, ERA3.grey, 1.4); rect(5, 5, fw - 10, fh - 10, SPC.boardGlass);
    const flash = SPEC.ledFlash > 0 ? SPEC.ledFlash / 0.35 : 0, col = flash > 0.4 ? ERA3.white : BOMB.gold;
    const live = dead < 0.98;
    if (live) {
      lamps(g.board.called, fw / 2 - lampsW(g.board.called, 2) / 2, 11, 2, 1.7, BOMB.cyan); const ns = String(called); lamps(ns, fw / 2 - lampsW(ns, 4.4) / 2, 25, 4.4, 3.5, col);
      ctx.save(); ctx.beginPath(); ctx.rect(7, 50, fw - 14, 14); ctx.clip(); const msg = g.board.ticker, mw = lampsW(msg, 2) + 8, off = (S.t * 34) % mw; lamps(msg + msg, 8 - off, 54, 2, 1.7, BOMB.hot); ctx.restore();
    }
    for (let i = 0; i < 20; i++) { const bx = 5 + i * (fw - 10) / 19; A(((Math.floor(S.t * 7) + i) % 3 === 0 ? 1 : 0.4) * (live ? 1 : 0.25), () => { circ(bx, 1.5, 1.4, BOMB.gold); circ(bx, fh - 1.5, 1.4, BOMB.hot); }); }
    if (dead > 0) for (let cy = 0; cy < 6; cy++) for (let cx = 0; cx < 9; cx++) { const hsh = ((cx * 7 + cy * 13) % 11) / 11; if (hsh < dead * 1.15) rect(5 + cx * (fw - 10) / 9, 5 + cy * (fh - 10) / 6, (fw - 10) / 9 + 0.5, (fh - 10) / 6 + 0.5, SPC.boardGlass); }
    ctx.restore();
  }
  function specSkyBack(e: Env, cam: number): void { const t = S.mode === 'idle' ? 0 : S.levelT; godRays(e, cam); searchlights(e, t); }
  function specSkyFront(cam: number): void {   // in front of the hills, behind the world: bunting, the balloon, the choir, rockets and their sparks, the big board of the finale
    const t = S.mode === 'idle' ? 0 : S.levelT, bp = balloonPose(t); bunting(t);
    if (bp.vis) A(0.88, () => lambyBalloon(bp.x, bp.y + cam * 0.22, 1, bp.sag || 0, Math.sin(S.t * 0.7) * 0.05, GROUND_Y + cam * 0.6));
    drawChoir(t);
    if (t >= 258.5 && S.mode !== 'idle') { const k = smooth((t - 258.5) / 2.4), yy = -90 + 140 * k, dead = SPEC.fuel < 1 ? 1 - SPEC.fuel * 1.05 : 0, up = t > 274.5 ? smooth((t - 274.5) / 2.2) : 0; jumbotron(W / 2 - 78, HEADER_H + 6 + (yy - 50) - up * 130, 1.3, { cables: true, dead: Math.max(0, Math.min(1, dead)) }); }
    ADD(() => {
      for (const p of SPEC.sparks) { const a = Math.max(0, p.life / p.max); ctx.globalAlpha = a; ctx.strokeStyle = p.col; ctx.lineWidth = p.r; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); ctx.stroke(); ctx.fillStyle = p.col; ctx.fillRect(p.x - p.r * 0.6, p.y - p.r * 0.6, p.r * 1.2, p.r * 1.2); } ctx.globalAlpha = 1;
      for (const r of SPEC.rock) { ctx.globalAlpha = 0.95; ctx.fillStyle = BOMB.white; ctx.fillRect(r.x - 1.3, r.y - 1.3, 2.6, 2.6); } ctx.globalAlpha = 1;
      for (const p of SPEC.pops) if (p.k === 'flashring') { const k = p.t / 0.5; ctx.globalAlpha = Math.max(0, 0.7 * (1 - k)); ctx.strokeStyle = ERA3.white; ctx.lineWidth = 3 * (1 - k) + 0.5; ctx.beginPath(); ctx.arc(p.x, p.y, 8 + k * 34, 0, Math.PI * 2); ctx.stroke(); } ctx.globalAlpha = 1;
    });
  }
  function specFar(): void {   // inside drawFar's parallax block, so it sits on the horizon: the revival tent and the stadium board
    const fin = S.levelT >= 258 && S.mode !== 'idle', lit = fin ? Math.max(0.05, SPEC.fuel > 0.55 ? 1 : SPEC.fuel / 0.55) : 1;
    tentDraw(wrapX(700, 0.2, 2300, 190), GROUND_Y - 2, lit);
    jumbotron(wrapX(1650, 0.3, 1900, 150), GROUND_Y - 130, 1, { legs: true, dead: fin ? Math.max(0, 1 - SPEC.fuel * 1.05) : 0 });
  }
  function cannonDraw(c: Cannon): void {
    const rise = Math.min(1, Math.max(0, c.life) / 0.2) * Math.min(1, Math.max(0, 1.65 - c.life) / 0.3); if (rise <= 0.01) return; const left = c.side < 0, px_ = left ? 24 : W - 24, py = PLAY_BOT + 12 - rise * 38, kick = c.fired && c.life < 0.55 ? (0.55 - c.life) * 14 : 0;
    ctx.save(); ctx.translate(px_, py); circ(0, 4, 10, BOMB.ink); circ(0, 4, 4.2, ERA3.white); circ(0, 4, 1.6, BOMB.gold);
    ctx.translate(0, -4); ctx.rotate(left ? -1.15 + (c.mis && c.fired ? 0.55 : 0) : -Math.PI + 1.15 - (c.mis && c.fired ? 0.55 : 0)); ctx.translate(-kick, 0);
    rr(-8, -9, 36, 18, 5, BOMB.hot); rect(4, -9, 4, 18, BOMB.gold); rect(13, -9, 4, 18, BOMB.gold); rect(-8, -9, 36, 3, BOMB.white); A(0.25, () => rect(-8, 4, 36, 5, BOMB.ink)); poly([[26, -9], [38, -15], [38, 15], [26, 9]], BOMB.gold); poly([[26, -9], [38, -15], [38, -10], [26, -4]], BOMB.white); ctx.restore();
  }
  function popsFront(): void {
    for (const p of SPEC.pops) {
      if (p.k === 'puff') { const k = p.t / 0.8; A(0.8 * (1 - k), () => circ(p.x + k * 6 * (p.x < W / 2 ? 1 : -1), p.y - k * 18, (p.r ?? 6) * (1 + k * 1.2), ERA3.white)); }
      else if (p.k === 'shout') { const k = p.t / 0.9, sc = Math.min(1, p.t / 0.12) * (1 + 0.1 * Math.sin(p.t * 18)), yy = p.y - k * 30; A(1 - Math.max(0, k - 0.6) / 0.4, () => { starburst(p.x, yy, 26 * sc, 17 * sc, 10, p.t * 3, p.col ?? BOMB.hot, 0.95); starburst(p.x, yy, 20 * sc, 13 * sc, 10, p.t * 3 + 0.3, BOMB.white, 0.9); garish(p.s ?? '', p.x, yy, 11, { sc, rim: BOMB.ink, maxW: 40 }); }); }
    }
  }
  function confettiDraw(): void {
    for (const p of SPEC.conf) {
      if (p.rib) { if (p.trail.length > 1) { ctx.strokeStyle = p.col; ctx.lineWidth = 2; A(Math.min(1, p.life), () => { ctx.beginPath(); p.trail.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }); } continue; }
      const f = Math.cos(p.ph); ctx.save(); ctx.globalAlpha = Math.min(1, p.life * 1.4); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ctx.fillRect(-p.w / 2, -p.h / 2 * f, p.w, Math.max(0.8, Math.abs(p.h * f))); ctx.restore();
    }
  }
  function litterDraw(): void { for (const l of SPEC.litter) { const x = SX + (l.wd - S.dist); if (x < -6 || x > W + 6) continue; rect(Math.round(x), GROUND_Y + l.dy, 3, 2, l.col); if (l.r > 2) rect(Math.round(x) + 1, GROUND_Y + l.dy + 2, 2, 1, ERA3.white); } }
  function megaSheep(): void { const s = S; if (SPEC.tier >= 1 && SPEC.heat > 0) { const r = 30 + SPEC.tier * 4 + Math.sin(S.t * 9) * 2, gr = ctx.createRadialGradient(SX + 2, s.fy - 18, 4, SX + 2, s.fy - 18, r); gr.addColorStop(0, rgba(BOMB.gold, 0.5 + 0.06 * SPEC.tier)); gr.addColorStop(0.6, rgba(BOMB.orange, 0.22)); gr.addColorStop(1, rgba(BOMB.hot, 0)); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(SX + 2, s.fy - 18, r, 0, Math.PI * 2); ctx.fill(); } }
  function specFront(): void {
    const t = S.levelT; confettiDraw(); for (const c of SPEC.cannon) cannonDraw(c); popsFront();
    if (SPEC.flash > 0.005 && SPEC.full) A(SPEC.flash, () => rect(0, HEADER_H, W, PLAY_BOT - HEADER_H, ERA3.white));
    const fin = S.mode === 'run' && t >= 261.9 && SPEC.fuel > 0.3, marquee = (SPEC.tier >= 3 && SPEC.heat > 0) || fin; if (marquee) bulbRing(4, HEADER_H + 6, W - 8, PLAY_BOT - HEADER_H - 12, 15, 0, true);
    // the banner: the platform's loudest word. It keeps out of her way when she is up high.
    const hi = S.fy + S.camY < 150 ? 0.38 : 1;
    if (S.mode === 'run' && SPEC.combo >= 3 && SPEC.heat > 0) {
      const tier = SPEC.tier, name = TIERS[tier - 1][1], k = SPEC.pulse, sc = (SPEC.quiet ? 0.72 : 1) * (1 + 0.32 * k * k), cy = 62 + (1 - Math.min(1, SPEC.heat * 2)) * 8;
      A(hi, () => {
        if (tier >= 2) { starburst(W / 2, cy, 98 * sc, 62 * sc, 14, S.t * 0.7, BOMB.gold, 0.4); starburst(W / 2, cy, 84 * sc, 54 * sc, 14, -S.t * 0.9, BOMB.hot, 0.45); }
        garish(name, W / 2, cy, 17 + tier * 1.5, { sc, rot: -0.06 + 0.025 * Math.sin(S.t * 7), maxW: W - 26 }); garish('x' + SPEC.combo, W / 2, cy + 30 + 3 * Math.sin(S.t * 9), 25 + Math.min(14, SPEC.combo * 0.5), { sc: 1 + 0.4 * k, rot: 0.05, c1: BOMB.lime, c2: BOMB.cyan, rim: BOMB.violet });
        for (let i = 0; i < 12; i++) rect(W / 2 - 42 + i * 7.5, cy + 54, 6, 4, i / 12 < SPEC.heat / 4.2 ? (i < 4 ? BOMB.orange : BOMB.lime) : rgba(ERA3.ink, 0.5));
      });
    } else if (SPEC.lost > 0) { const k = 1 - SPEC.lost; A(Math.min(1, SPEC.lost * 1.6) * hi, () => { ctx.save(); ctx.translate(W / 2, 62 + k * 70); ctx.rotate(k * 0.5); garish(SPEC.lostText, 0, 0, 16, { sc: 1 - k * 0.45, maxW: W - 26, c1: ERA3.grey, c2: ERA3.grey, rim: ERA3.grey }); ctx.restore(); }); }
    if (S.mode === 'run' && t >= 261.9 && t < 274 && SPEC.fuel > 0.2) { const k = Math.min(1, (t - 261.9) / 0.4); A(k * Math.min(1, SPEC.fuel * 1.3) * hi, () => garish(t < 268.9 ? g.finale.grand : g.finale.thanks, W / 2, 154 + 4 * Math.sin(S.t * 6), 19, { rot: 0.04 * Math.sin(S.t * 3), maxW: W - 30, c1: BOMB.lime, c2: BOMB.cyan, rim: BOMB.violet })); }
  }

  // ── input ──
  function startRun(): void { reset(); const s = S; s.mode = 'run'; s.levelT = 0; s.lastEnv = envAt(0); sfx.start(); startSong(0); spawnCourse(); fill(); specReset(); for (let i = 0; i < 2; i++) SPEC.queue.push({ at: 0.3 + i * 0.3, mis: false, big: false }); }
  function setPaused(v: boolean): void {
    const s = S; if (s.mode !== 'run') return; s.paused = v;
    if (song && songPlaying() && v) song.pause(); if (!v && !songOff && songState !== 'missing') startSong(s.levelT);
  }
  function toggleFx(): void { SPEC.full = !SPEC.full; if (!SPEC.full) { SPEC.shake = 0; SPEC.flash = 0; } }

  // ── the camera: it follows her up and down, looks ahead at a hole or a high route, and never loses her ──
  function cameraUpdate(step: number, instant?: boolean): void {
    const s = S, fy = s.fy, lo = 95 - fy, hi = 380 - fy;
    let tgt = Math.max(0, 262 - fy), pitNear = false;
    for (const p of s.pits) if (p.x < SX + 270 && p.x + p.w > SX - 60) pitNear = true;
    if (pitNear) tgt = Math.min(tgt, -92);
    else { let mt = 1e9; for (const o of s.objs) if (o.k === 'cloud' && o.x < SX + 250 && o.x + o.w > SX - 30) mt = Math.min(mt, o.top); for (const q of s.strays) if (q.x < SX + 250 && q.x > SX - 30) mt = Math.min(mt, q.y - 34); if (mt < 1e8) tgt = Math.max(tgt, 120 - mt); }
    tgt = Math.max(lo, Math.min(hi, tgt));
    s.camY = instant ? tgt : s.camY + (tgt - s.camY) * Math.min(1, 3.2 * step); s.camY = Math.max(lo, Math.min(hi, s.camY));
  }
  const envNow = (): Env => envAt(Math.min(S.levelT, levelLen() - 0.01));

  // ── the turn of the clock ──
  function update(dt: number): void {
    const s = S, step = Math.min(dt, 0.05); s.t += step; s.flopT = Math.max(0, s.flopT - step); s.squash = Math.max(0, s.squash - step);
    s.bubbles = s.bubbles.filter((b) => (b.t += step) < 0.8); s.dust = s.dust.filter((d) => (d.t += step) < 0.35); s.hearts = s.hearts.filter((h) => (h.t += step) < 1.0);
    s.motes = s.motes.filter((m) => { m.life -= step; m.x += m.vx * step; m.y += m.vy * step; m.ph += step * 4; return m.life > 0; });
    if (s.toast) { s.toast.t += step; if (s.toast.t > 3.2) s.toast = null; }
    for (const o of s.objs) if (o.comp > 0) o.comp = Math.max(0, o.comp - step * 4);
    for (const l of s.lost) { l.x += l.vx * step; l.vy += 900 * step; l.y += l.vy * step; l.rot += step * 8; if (l.y > GROUND_Y && l.vy > 0 && l.y < GROUND_Y + 40) { l.y = GROUND_Y; l.vy = -l.vy * 0.5; l.vx *= 0.7; } l.t += step; }
    s.lost = s.lost.filter((l) => l.x < W + 40 && l.t < 4);
    for (const w of s.wander) { w.d += step / 1.8; w.x -= (s.speed * 0.9 - 30) * step; }
    s.wander = s.wander.filter((w) => w.d < 1 && w.x > -40);
    updateWeather(step);
    if (s.mode === 'run') {
      if (s.paused) return;
      // the clock is the song: its own position when it is playing, ours when it is not
      s.levelT += step; if (song && songPlaying() && Math.abs(song.currentTime - s.levelT) < 1.5) s.levelT += (song.currentTime - s.levelT) * 0.12; else if (song && songPlaying()) s.levelT = song.currentTime;
      const L = levelLen(); const env = envNow(); s.lastEnv = env;
      if (env.i !== s.lastSec) { if (s.lastSec >= 0) sfx.section(); s.toast = { s: env.name, t: 0 }; s.lastSec = env.i; }
      s.speed = env.speed;
      advance(step); spawnCourse(); fill(); specUpdate(step);
      s.objs = s.objs.filter((o) => o.x + o.w > -60); s.strays = s.strays.filter((q) => q.x > -30); s.clovers = s.clovers.filter((c) => c.x > -30); s.pits = s.pits.filter((p) => p.x + p.w > -40); s.zones = s.zones.filter((z) => z.x + z.w > -40);
      s.foes = s.foes.filter((f) => (f.k === 'drone' ? f.x > -70 && f.y < H : f.x + (f.w || 0) > -150 - (f.k === 'crook' ? 150 : 0)));
      for (const o of s.objs) if (SOLID[o.k] && !o.cleared && o.x + o.w < SX - HW) { o.cleared = true; s.hops++; }
      s.trail.push({ d: s.dist, y: s.fy }); while (s.trail.length > 4 && s.trail[0].d < s.dist - 360) s.trail.shift();
      cameraUpdate(step);
      // "every hop is another piece of me": while that line is sung she sheds a little wool
      if (s.levelT >= 113.1 && s.levelT < 116.4) { s.woolT -= step; if (s.woolT <= 0) { s.woolT = 0.09; s.motes.push({ x: SX - 10, y: s.fy - 18, vx: -50 - Math.random() * 30, vy: -10 + Math.random() * 14, life: 1.8, ph: Math.random() * 6, wool: 1 }); } }
      // the flock cannot be held: lambs drift away, more and more as the song goes on (the rate per lamb per second is the section's own)
      if (s.flock.length) { s.driftAcc += s.flock.length * env.drift * step; if (s.driftAcc >= s.driftTh) { s.driftAcc = 0; s.driftTh = 0.4 + Math.random() * 1.2; driftOne(); } }
      if (s.levelT >= L) { s.levelT = L; s.mode = 'done'; s.doneT = 0; s.held = false; sfx.start(); bump(); }
    } else if (s.mode === 'done') {
      s.doneT += step; s.speed = Math.max(0, s.speed - 90 * step); const dx = s.speed * step; s.dist += dx; s.nextX -= dx;
      for (const o of s.objs) o.x -= dx; for (const q of s.strays) q.x -= dx; for (const c of s.clovers) c.x -= dx; for (const p of s.pits) p.x -= dx; for (const z of s.zones) z.x -= dx; for (const f of s.foes) if (f.k !== 'drone') f.x -= dx;
      physics(step); cameraUpdate(step); for (const w of s.wander) w.d += step / 1.8; specUpdate(step);
    }
  }
  // ── weather: soft particles. no flashing anything. ──
  function updateWeather(step: number): void {
    const s = S, e = s.lastEnv, cam = s.camY; s.weather = s.weather.filter((p) => p.life > 0);
    const want = (k: string, n: number): boolean => s.weather.filter((p) => p.k === k).length < n, gs = GROUND_Y + cam;                     // gs: where the meadow is on the screen
    if (e.rain > 0.02 && want('rain', 70 * e.rain)) for (let i = 0; i < 3; i++) s.weather.push({ k: 'rain', x: Math.random() * (W + 80), y: -10, vy: 340 + Math.random() * 120, vx: -70, life: 3 });
    if (e.wind > 0.05 && want('leaf', 12 * e.wind)) s.weather.push({ k: 'leaf', x: W + 10, y: 40 + Math.random() * 300, vx: -(160 + Math.random() * 120) * (0.5 + e.wind), vy: 12, ph: Math.random() * 6, life: 4, c: Math.random() < 0.5 ? 0 : 1 });
    if (e.spark > 0.05 && want('spark', 16 * e.spark)) s.weather.push({ k: 'spark', x: Math.random() * W, y: Math.max(50, Math.min(PLAY_BOT - 10, gs - Math.random() * 120)), vx: -12, vy: -14 - Math.random() * 10, ph: Math.random() * 6, life: 3 });
    if (e.fly > 0.05 && want('fly', 14 * e.fly)) s.weather.push({ k: 'fly', x: Math.random() * W, y: Math.max(50, Math.min(PLAY_BOT - 10, gs - 20 - Math.random() * 140)), vx: -8 - Math.random() * 8, vy: Math.sin(Math.random() * 6) * 6, ph: Math.random() * 6, life: 5 });
    for (const p of s.weather) { p.life -= step; p.x += (p.vx - (s.mode === 'run' ? s.speed * 0.15 : 0)) * step; p.y += p.vy * step; if (p.k === 'rain' && p.y > Math.min(gs + 28, PLAY_BOT + 10)) p.life = 0; if (p.x < -40) p.life = 0; if (p.ph != null) p.ph += step * 3; }
  }

  // ── the world's sprites ──
  function sheep(x: number, feet: number, sc: number, o: { air?: boolean; phase?: number; squash?: number; rot?: number; vy?: number; mega?: number } = {}): void {   // the body is a cloud of wool; the ears are floppy
    const air = o.air, phase = o.phase || 0, sq = o.squash || 0;
    ctx.save(); ctx.translate(x, feet); ctx.scale(sc, sc * (1 - sq)); if (o.rot) ctx.rotate(o.rot);
    [-13, -5, 5, 13].forEach((lx, i) => { const k = air ? (i % 2 ? -3 : 3) : Math.sin(phase + i * 1.6) * 4; rect(lx - 1.2 + k * 0.4, -10 - (air ? 3 : 0), 2.6, 10 - (air ? 0 : Math.max(0, -k) * 0.5), FLOPPY.leg); });
    const by = -24;
    ([[-13, 3, 9], [-5, -3, 10], [6, -3, 10], [14, 3, 9], [-9, 6, 9], [1, 7, 9], [10, 6, 9]] as const).forEach(([dx, dy, r]) => circ(dx, by + dy, r, FLOPPY.wool));
    ell(0, by + 12, 17, 3.2, FLOPPY.woolShade); circ(-20, by + 2, 5, FLOPPY.wool);
    const hy = by - 1 + (air && (o.vy ?? 0) > 60 ? 2 : 0);
    ell(20, hy + 2, 8.5, 8, FLOPPY.face); circ(19, hy - 6, 6, FLOPPY.wool); circ(23, hy, 1.6, ERA3.white);
    if ((o.mega ?? 0) >= 2) { rr(15.5, hy - 3, 13.5, 6, 2.4, SPC.shades); line(15.5, hy - 0.5, 9, hy - 1.5, SPC.shades, 1.4); A(0.7, () => rect(18, hy - 2, 4, 1.4, ERA3.white)); A(0.7, () => rect(24, hy - 2, 2.5, 1.4, ERA3.white)); }
    if ((o.mega ?? 0) >= 4) { poly([[13, hy - 10], [13.5, hy - 17], [16.6, hy - 13.4], [19.5, hy - 19], [22.4, hy - 13.4], [25.5, hy - 17], [26, hy - 10]], BOMB.gold); circ(19.5, hy - 19, 1.5, BOMB.hot); }
    const droop = air ? ((o.vy ?? 0) < 0 ? -0.5 : 0.7) : 0.2 + Math.sin(phase * 2) * 0.12;
    ctx.save(); ctx.translate(14, hy + 1); ctx.rotate(droop); ell(0, 5, 3.2, 7, FLOPPY.face); ctx.restore();
    ctx.restore();
  }
  function lambSprite(x: number, feet: number, sc: number, o: { air?: boolean; phase?: number; squash?: number; rot?: number; vy?: number } = {}): void { sheep(x, feet, sc * 0.62, o); }
  function fenceDraw(o: Obj): void { const x = o.x, top = o.top; rect(x, top, o.w, o.h, FLOPPY.fence); rect(x + o.w - 4, top, 4, o.h, FLOPPY.fenceDk); rect(x - 8, top + 7, o.w + 16, 5, FLOPPY.fence); rect(x - 8, top + 7, o.w + 16, 1.5, FLOPPY.fenceDk); rect(x - 8, top + Math.round(o.h / 2) + 3, o.w + 16, 5, FLOPPY.fence); rect(x, top, o.w, 2, FLOPPY.hillFar); }
  function wireDraw(o: Obj): void { const x = o.x, top = o.top; rect(x, top - 6, 5, o.h + 6, FLOPPY.fenceDk); rect(x + o.w - 5, top - 6, 5, o.h + 6, FLOPPY.fenceDk); ctx.strokeStyle = ERA3.grey; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + 5, top); ctx.lineTo(x + o.w - 5, top + 1.5); ctx.moveTo(x + 5, top + 12); ctx.lineTo(x + o.w - 5, top + 13.5); ctx.stroke(); for (let i = 0; i < 3; i++) rect(x + 8 + i * 4, top - 2, 1.5, 4, ERA3.grey); }
  function pipeDraw(o: Obj): void { const x = o.x, top = o.top; rect(x + 2, top + 10, o.w - 4, o.h - 10, ERA3.good); rect(x + 2, top + 10, 5, o.h - 10, ERA3.white); A(0.18, () => rect(x + 2, top + 10, o.w - 4, o.h - 10, ERA3.white)); A(0.25, () => rect(x + o.w - 9, top + 10, 7, o.h - 10, ERA3.ink)); rect(x - 3, top, o.w + 6, 12, ERA3.good); rect(x - 3, top, o.w + 6, 3, ERA3.white); A(0.25, () => rect(x - 3, top + 8, o.w + 6, 4, ERA3.ink)); ctx.strokeStyle = ERA3.ink; ctx.globalAlpha = 0.35; ctx.lineWidth = 1; ctx.strokeRect(x - 2.5, top + 0.5, o.w + 5, 11); ctx.globalAlpha = 1; }
  function ceilDraw(o: Obj): void { const x = o.x, b = o.bot, top = -400; rect(x + 2, top, o.w - 4, b - top - 12, ERA3.good); rect(x + 2, top, 5, b - top - 12, ERA3.white); A(0.18, () => rect(x + 2, top, o.w - 4, b - top - 12, ERA3.white)); A(0.25, () => rect(x + o.w - 9, top, 7, b - top - 12, ERA3.ink)); rect(x - 3, b - 12, o.w + 6, 12, ERA3.good); rect(x - 3, b - 12, o.w + 6, 3, ERA3.white); A(0.25, () => rect(x - 3, b - 4, o.w + 6, 4, ERA3.ink)); ctx.strokeStyle = ERA3.ink; ctx.globalAlpha = 0.35; ctx.lineWidth = 1; ctx.strokeRect(x - 2.5, b - 11.5, o.w + 5, 11); ctx.globalAlpha = 1; }
  function baleDraw(o: Obj): void { rr(o.x, o.top, o.w, o.h, 5, FLOPPY.sun); rr(o.x, o.top, o.w, o.h, 5, null, FLOPPY.fenceDk, 1.5); rect(o.x + 12, o.top, 3, o.h, FLOPPY.fenceDk); rect(o.x + o.w - 15, o.top, 3, o.h, FLOPPY.fenceDk); for (let i = 0; i < 4; i++) rect(o.x + 18 + i * 4, o.top + 6 + (i % 2) * 8, 2, 8, FLOPPY.fence); }
  function springPad(o: Obj): void { const k = o.comp || 0, h = 14 - k * 6, b = o.base; rect(o.x + 2, b - 3, o.w - 4, 3, FLOPPY.fenceDk); ctx.strokeStyle = ERA3.grey; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(o.x + 9, b - 3); for (let i = 0; i < 4; i++) ctx.lineTo(o.x + (i % 2 ? 9 : o.w - 9), b - 3 - (i + 1) * (h - 5) / 4); ctx.stroke(); rr(o.x, b - h - 2, o.w, 6, 3, ERA3.good); rect(o.x + 4, b - h - 1, o.w - 8, 2, ERA3.white); }
  function cloudShape(x: number, y: number, w: number, a: number): void { A(a, () => { ell(x + w * 0.2, y + 8, w * 0.22, 8, FLOPPY.cloud); ell(x + w * 0.5, y + 4, w * 0.3, 10, FLOPPY.cloud); ell(x + w * 0.8, y + 8, w * 0.22, 8, FLOPPY.cloud); rect(x + w * 0.1, y + 8, w * 0.8, 8, FLOPPY.cloud); rect(x + w * 0.1, y + 14, w * 0.8, 3, FLOPPY.skyLow); }); }
  function puddleDraw(o: Obj): void { const s = S; A(0.8, () => { ell(o.x + o.w / 2, GROUND_Y + 3, o.w / 2, 5, FLOPPY.skyLow); ell(o.x + o.w / 2 + 8, GROUND_Y + 2, o.w / 4, 2.5, ERA3.white); }); const k = (s.t * 1.3 + o.x * 0.01) % 1; A(0.5 * (1 - k), () => { ctx.strokeStyle = ERA3.white; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(o.x + o.w * 0.35, GROUND_Y + 3, 3 + k * 9, 1 + k * 2.4, 0, 0, Math.PI * 2); ctx.stroke(); }); }
  function cloverSprite(x: number, yy: number): void { const gc = ERA3.good; circ(x, yy - 5, 4.5, gc); circ(x - 5, yy, 4.5, gc); circ(x + 5, yy, 4.5, gc); circ(x, yy + 5, 4.5, gc); circ(x, yy, 1.6, FLOPPY.sun); if (Math.floor(S.t * 4) % 2 === 0) { circ(x - 9, yy - 8, 1.4, FLOPPY.sun); circ(x + 9, yy + 6, 1.4, FLOPPY.sun); } }
  const wrapX = (base: number, par: number, period: number, margin = 80): number => ((base - S.dist * par) % period + period) % period - margin;
  function windmill(x: number, y: number, sc: number): void { A(0.9, () => { ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.fillStyle = FLOPPY.hillDk; ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.lineTo(5, -42); ctx.lineTo(-5, -42); ctx.closePath(); ctx.fill(); ctx.fillStyle = FLOPPY.fenceDk; ctx.beginPath(); ctx.moveTo(-7, -42); ctx.lineTo(0, -52); ctx.lineTo(7, -42); ctx.closePath(); ctx.fill(); ctx.translate(0, -42); ctx.rotate(S.t * 0.5); ctx.strokeStyle = FLOPPY.fenceDk; ctx.lineWidth = 2.4; for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -30); ctx.stroke(); rect(1, -30, 8, 14, ERA3.white); } ctx.restore(); }); }
  function tree(x: number, y: number, sc: number): void { rect(x - 2 * sc, y - 16 * sc, 4 * sc, 16 * sc, FLOPPY.fenceDk); circ(x, y - 24 * sc, 13 * sc, FLOPPY.hillFar); circ(x - 7 * sc, y - 19 * sc, 9 * sc, FLOPPY.hillFar); circ(x + 8 * sc, y - 20 * sc, 9 * sc, FLOPPY.hillFar); }
  function lampPost(x: number, glow: number): void { rect(x - 1.5, GROUND_Y - 62, 3, 62, FLOPPY.fenceDk); rr(x - 6, GROUND_Y - 72, 12, 12, 4, FLOPPY.sun); A(glow * 0.5, () => { circ(x, GROUND_Y - 66, 30, FLOPPY.sun); }); A(glow * 0.18, () => poly([[x - 5, GROUND_Y - 60], [x + 5, GROUND_Y - 60], [x + 30, GROUND_Y], [x - 30, GROUND_Y]], FLOPPY.sun)); }

  // ── the v5 objects ──
  function blockDraw(o: Obj): void {   // 'load': a segment of a loading bar, lit as its word is sung; 'brick': a brick, for "every failure's a new brick"
    const x = o.x, y = o.top, w = o.w, hh = o.base - o.top;
    if (o.style === 'brick') {
      rect(x, y, w, hh, FLOPPY.earth); ctx.strokeStyle = FLOPPY.fence; ctx.lineWidth = 1.3;
      for (let r = 0; r * 11 < hh; r++) { const yy = y + r * 11; line(x, yy, x + w, yy, FLOPPY.fence, 1.3); for (let c = (r % 2 ? 10 : 0); c < w; c += 20) line(x + c, yy, x + c, Math.min(y + hh, yy + 11), FLOPPY.fence, 1.3); }
      rect(x, y, w, 3, FLOPPY.fence); A(0.2, () => rect(x + w - 5, y, 5, hh, ERA3.ink)); ctx.strokeStyle = FLOPPY.fenceDk; ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, hh - 1);
    } else {
      const lit = o.lt != null && S.levelT >= o.lt;
      rr(x, y, w, hh, 4, lit ? ERA3.good : FLOPPY.skyLow); A(0.35, () => rect(x + 3, y + 3, w - 6, 3, ERA3.white)); rr(x + 0.5, y + 0.5, w - 1, hh - 1, 4, null, lit ? FLOPPY.ink : ERA3.grey, 1.4);
      for (let r = 1; r * 12 < hh; r++) A(0.2, () => rect(x + 3, y + r * 12, w - 6, 1, ERA3.ink)); if (hh > 14) tx(lit ? '1' : '0', x + w / 2, y + 12, 10, lit ? ERA3.white : ERA3.grey, 'center', 800);
    }
  }
  function cloudPlat(o: Obj): void {   // every kind of footing that is not a solid
    const x = o.x, y = o.top, w = o.w, st = o.style, s = S;
    if (st === 'cloud') cloudShape(x, y, w, 1);
    else if (st === 'vanish') { const a = o.fade == null ? 0.88 : Math.max(0, o.fade / 0.9) * 0.88; cloudShape(x, y, w, a); A(0.5 * (o.fade == null ? 1 : a), () => { ctx.setLineDash([4, 4]); ctx.strokeStyle = ERA3.grey; ctx.lineWidth = 1.2; ctx.strokeRect(x + 3, y + 3, w - 6, 13); ctx.setLineDash([]); }); }
    else if (st === 'mover') { cloudShape(x, y, w, 1); const k = Math.cos(s.t * 1.1 + o.ph) * o.amp >= 0 ? 1 : -1; ctx.strokeStyle = ERA3.grey; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(x + w / 2 - 5, y + 11 + k * 2); ctx.lineTo(x + w / 2, y + 11 - k * 3); ctx.lineTo(x + w / 2 + 5, y + 11 + k * 2); ctx.stroke(); }
    else if (st === 'lamp') { A(0.28 + 0.1 * Math.sin(s.t * 2 + x), () => circ(x + w / 2, y + 4, 34, FLOPPY.sun)); cloudShape(x, y, w, 1); A(0.55, () => ell(x + w / 2, y + 7, w * 0.42, 6, FLOPPY.sun)); circ(x + w / 2, y - 6, 3.2, FLOPPY.sun); rect(x + w / 2 - 0.8, y - 3, 1.6, 8, FLOPPY.fenceDk); }
    else if (st === 'patch') { const hh = 16; rr(x, y, w, hh, 3, ERA3.white); rr(x + 0.5, y + 0.5, w - 1, hh - 1, 3, null, FLOPPY.fenceDk, 1.2); ctx.setLineDash([3, 2]); ctx.strokeStyle = FLOPPY.fence; ctx.lineWidth = 1; ctx.strokeRect(x + 3.5, y + 3.5, w - 7, hh - 7); ctx.setLineDash([]); tx(((o.bit || 0) % 2) ? '1' : '0', x + w / 2, y + hh / 2 + 0.5, 10, ERA3.grey, 'center', 800); A(0.2, () => rect(x + 2, y + hh, w - 4, 3, ERA3.ink)); }
    else if (st === 'key') { const dn = s.standing === o ? 3 : 0, jx = Math.sin(s.t * 38 + x) * 0.7; const xx = x + jx; A(0.25, () => rr(xx + 1, y + 6, w, 12, 4, ERA3.ink)); rr(xx, y + 2 + dn, w, 14, 4, FLOPPY.skyLow); rr(xx + 2, y + 1 + dn, w - 4, 11, 3, ERA3.white); rr(xx + 0.5, y + 1.5 + dn, w - 1, 14, 4, null, ERA3.grey, 1.2); tx(o.ch || '', xx + w / 2, y + 7 + dn, 10, ERA3.ink, 'center', 800); }
    else if (st === 'cable') {   // a cable between pylons that stand on the meadow far below: the height is the point
      const base = GROUND_Y; for (let px_ = Math.floor(x / 280) * 280; px_ < x + w; px_ += 280) { const ax = px_ + 120; if (ax < x - 10 || ax > x + w + 10) continue; A(0.6, () => { poly([[ax - 9, base], [ax - 3, y - 4], [ax + 3, y - 4], [ax + 9, base]], FLOPPY.hillDk); line(ax - 8, base - 40, ax + 8, base - 90, FLOPPY.fenceDk, 1.2); line(ax + 8, base - 40, ax - 8, base - 90, FLOPPY.fenceDk, 1.2); }); rect(ax - 12, y - 6, 24, 3, FLOPPY.fenceDk); circ(ax - 10, y - 4, 2.4, ERA3.white); circ(ax + 10, y - 4, 2.4, ERA3.white); }
      ctx.strokeStyle = ERA3.grey; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x, y + 1); ctx.lineTo(x + w, y + 1); ctx.stroke(); ctx.strokeStyle = ERA3.white; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();
    }
  }
  function thornDraw(o: Obj): void { const x = o.x, b = o.base, w = o.w; ell(x + w / 2, b - 5, w * 0.5, 8, FLOPPY.hillFar); A(0.4, () => ell(x + w / 2, b - 5, w * 0.5, 8, ERA3.ink)); for (let i = 0; i < Math.floor(w / 5); i++) { const px_ = x + 3 + i * 5, hh = 7 + (i * 7 % 6); poly([[px_ - 2, b - 7], [px_, b - 7 - hh], [px_ + 2, b - 7]], FLOPPY.fenceDk); } for (let i = 0; i < 3; i++) circ(x + 8 + i * (w / 3.4), b - 7 - (i % 2) * 3, 1.6, FLOPPY.fence); }
  function pitDraw(p: Pit): void {
    const x = p.x, w = p.w, top = GROUND_Y, fl = GROUND_Y + LOW;
    rect(x, top, w, fl - top + GRASS_H + 600, FLOPPY.earth); A(0.5, () => rect(x, top, w, fl - top + GRASS_H + 600, ERA3.ink));
    for (let i = 0; i < Math.floor(w / 48); i++) { const rx = x + 14 + i * 48 + (i % 3) * 7; A(0.25, () => line(rx, top + 6, rx + 5, top + 38 + (i % 3) * 8, FLOPPY.fence, 1.6)); }
    A(0.13, () => poly([[x + 12, top], [x + w - 12, top], [x + w * 0.8, fl], [x + w * 0.2, fl]], FLOPPY.sun));                       // daylight falling in from the meadow
    rect(x, fl, w, GRASS_H, FLOPPY.hill); A(0.35, () => rect(x, fl, w, GRASS_H, ERA3.ink)); rect(x, fl, w, 3, FLOPPY.hillFar);
    for (let i = 0; i < 8; i++) { const fx = x + ((i * 61 + 13) % Math.max(60, w)); A(0.6, () => { rect(fx, fl + 12 + (i % 3) * 5, 1.6, 6, FLOPPY.hillDk); circ(fx, fl + 11 + (i % 3) * 5, 2.6, i % 2 ? FLOPPY.sun : ERA3.white); }); }
    rect(x - 4, top, 4, 8, FLOPPY.hillFar); rect(x + w, top, 4, 8, FLOPPY.hillFar); rect(x - 2, top + 8, 2, LOW - 8, FLOPPY.fenceDk); rect(x + w, top + 8, 2, LOW - 8, FLOPPY.fenceDk);
    if (litNow(p)) { const k = S.levelT - (p.lt as number); A(Math.min(1, k / 0.15) * Math.min(1, (2.4 - k) / 0.6) * 0.7, () => { rect(x, top - 2, w, 3, FLOPPY.sun); }); }
  }
  function zoneDraw(z: Zone): void {
    const s = S, x = z.x, w = z.w, y0 = z.y0, y1 = z.y1, hh = y1 - y0;
    if (z.z === 'grav') {
      const light = z.g < 1; A(light ? 0.13 : 0.16, () => rect(x, y0, w, hh, light ? ERA3.accentHi : ERA3.ink));
      A(0.5, () => { ctx.setLineDash([5, 5]); ctx.strokeStyle = light ? ERA3.accentHi : ERA3.grey; ctx.lineWidth = 1.2; ctx.strokeRect(x, y0, w, hh); ctx.setLineDash([]); });
      for (let i = 0; i < Math.floor(w / 46); i++) for (let r = 0; r < 5; r++) { const ax = x + 22 + i * 46, ay = y0 + ((r * 66 + (light ? -1 : 1) * s.t * 26 + i * 17) % (hh)); const yy = ((ay - y0) % hh + hh) % hh + y0; A(0.38, () => { ctx.strokeStyle = light ? ERA3.accentHi : ERA3.grey; ctx.lineWidth = 2; ctx.beginPath(); const d = light ? -1 : 1; ctx.moveTo(ax - 5, yy - 3 * d); ctx.lineTo(ax, yy + 3 * d); ctx.lineTo(ax + 5, yy - 3 * d); ctx.stroke(); }); }
    } else if (z.z === 'thermal') {
      A(0.12, () => rect(x, y0, w, hh, FLOPPY.sun)); for (let i = 0; i < Math.floor(w / 26) + 1; i++) { A(0.5, () => { ctx.strokeStyle = FLOPPY.sun; ctx.lineWidth = 1.6; ctx.beginPath(); for (let yy = 0; yy < hh; yy += 8) { const px_ = x + 12 + i * 26 + Math.sin(yy * 0.07 + s.t * 3 + i) * 5; if (yy === 0) ctx.moveTo(px_, y1 - yy); else ctx.lineTo(px_, y1 - yy); } ctx.stroke(); }); }
      for (let i = 0; i < 6; i++) { const ly = y1 - ((s.t * 70 + i * 55) % hh), lx = x + 10 + (i * 37) % Math.max(20, w - 20); A(0.8, () => ell(lx, ly, 3.4, 1.7, i % 2 ? FLOPPY.sun : ERA3.white, Math.sin(s.t * 3 + i))); }
    } else if (z.z === 'down') {
      A(0.14, () => rect(x, y0, w, hh, ERA3.grey)); for (let i = 0; i < Math.floor(w / 20); i++) { const yy = y0 + ((s.t * 140 + i * 47) % hh); A(0.45, () => line(x + 10 + i * 20, yy, x + 10 + i * 20, yy + 16, ERA3.white, 1.6)); }
    } else if (z.z === 'storm') {
      const cy = z.cy; A(0.12, () => rect(x, y0, w, hh, ERA3.ink));
      for (let i = 0; i < Math.floor(w / 9); i++) { const yy = y0 + ((s.t * 330 + i * 53) % hh); A(0.5, () => line(x + 5 + i * 9 - 3, yy, x + 5 + i * 9 - 6, yy + 12, ERA3.white, 1.2)); }
      A(0.97, () => { for (const [px_, py, r] of [[0.14, 10, 14], [0.3, 2, 19], [0.5, -4, 23], [0.7, 2, 19], [0.86, 10, 14], [0.4, 12, 15], [0.6, 12, 15]]) circ(x + w * px_, cy + py, r, SPC.storm); rect(x + w * 0.14, cy + 8, w * 0.72, 14, SPC.storm); });
      A(0.35, () => { for (const [px_, py, r] of [[0.3, 12, 12], [0.5, 8, 14], [0.7, 12, 12]]) circ(x + w * px_, cy + py + 6, r, ERA3.ink); });
    }
    if (litNow(z)) { const k = s.levelT - (z.lt as number); A(Math.min(1, k / 0.15) * Math.min(1, (2.4 - k) / 0.6) * 0.8, () => { rect(x, y1 - 3, w, 3, FLOPPY.sun); }); }
  }
  function bubbleAt(x: number, y: number, s: string): void { ctx.font = `700 10px ${FONT}`; const w = ctx.measureText(s).width + 14; const bx = Math.max(w / 2 + 4, Math.min(W - w / 2 - 4, x)); rr(bx - w / 2, y - 9, w, 18, 9, ERA3.white); rr(bx - w / 2 + 0.5, y - 8.5, w - 1, 17, 9, null, ERA3.grey, 1); poly([[x - 4, y + 8], [x + 4, y + 8], [x, y + 14]], ERA3.white); tx(s, bx, y, 10, FLOPPY.ink, 'center', 700); }
  function droneDraw(f: Foe): void {
    const s = S, x = f.x, y = f.y, ph = s.t * 30;
    const charging = !f.dead && f.x < W - 10 && f.cy > 0 && f.cy < 0.9;
    if (charging) { const k = f.cy / 0.9; A(0.06 + 0.12 * k, () => poly([[x - 30, y - 12], [x - 30, y + 12], [x - 200, y + 100], [x - 200, y - 100]], ERA3.white)); A(0.4, () => { ctx.setLineDash([3, 6]); ctx.strokeStyle = ERA3.white; ctx.lineWidth = 1.5; for (const r of [60, 100, 140]) { ctx.beginPath(); ctx.arc(x, y, r, Math.PI - 0.53, Math.PI + 0.53); ctx.stroke(); } ctx.setLineDash([]); }); }
    ctx.save(); ctx.translate(x, y); if (f.dead) ctx.rotate(f.rot);
    A(0.45, () => { ell(-7, -14, 9 + Math.sin(ph) * 2, 1.8, ERA3.grey); ell(8, -14, 9 + Math.cos(ph) * 2, 1.8, ERA3.grey); }); rect(-8, -13, 2, 5, ERA3.grey); rect(7, -13, 2, 5, ERA3.grey);
    rr(-14, -9, 30, 17, 8, ERA3.white); rr(-13.5, -8.5, 29, 16, 8, null, ERA3.grey, 1.4); rect(-5, -2, 14, 3, ERA3.good); circ(10, -1, 3.2, ERA3.ink); circ(11, -2, 1, ERA3.white);
    poly([[-14, -5], [-14, 4], [-34, 14], [-34, -15]], FLOPPY.sun); ell(-34, -0.5, 3.2, 14.5, FLOPPY.hillDk); ell(-34.5, -0.5, 2.2, 12.5, ERA3.white); rect(-6, 8, 10, 3, ERA3.grey);
    ctx.restore();
    for (const r of f.rings) { const a = Math.max(0, 1 - r.r / 300); A(a * 0.85, () => { ctx.lineCap = 'round'; ctx.strokeStyle = ERA3.white; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r.r, Math.PI - 0.53, Math.PI + 0.53); ctx.stroke(); ctx.strokeStyle = FLOPPY.sun; ctx.lineWidth = 1.4; ctx.stroke(); ctx.lineCap = 'butt'; }); }
    if (charging && x < W + 20) bubbleAt(x - 6, y - 30, f.say);
    if (litNow(f) && !f.dead) glowBox(f, x - 36, y - 16, 56, 32);
  }
  function crookDraw(f: Foe): void {
    const s = S, px_ = f.x + 4, py = GROUND_Y - f.rise, th = f.ang, tipx = px_ + f.L * Math.sin(th), tipy = py + f.L * Math.cos(th);
    rect(px_ - 3, py, 6, GROUND_Y - py, FLOPPY.fenceDk); rect(px_ - 8, GROUND_Y - 5, 16, 5, FLOPPY.fenceDk); A(0.25, () => rect(px_ + 0.5, py, 2.5, GROUND_Y - py, ERA3.ink));
    ctx.lineCap = 'round'; line(px_, py, tipx, tipy, FLOPPY.fenceDk, 6); line(px_, py, tipx, tipy, FLOPPY.fence, 3.4); ctx.lineCap = 'butt';
    const hx = tipx - 7 * Math.cos(th), hy = tipy + 7 * Math.sin(th); ctx.strokeStyle = FLOPPY.fenceDk; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(hx, hy, 7, Math.PI * 0.35 - th, Math.PI * 1.35 - th); ctx.stroke(); ctx.strokeStyle = FLOPPY.fence; ctx.lineWidth = 3.2; ctx.stroke(); ctx.lineCap = 'butt';
    circ(px_, py, 11, ERA3.white); ctx.strokeStyle = FLOPPY.fenceDk; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px_, py, 11, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; line(px_ + Math.sin(a) * 8, py - Math.cos(a) * 8, px_ + Math.sin(a) * 9.6, py - Math.cos(a) * 9.6, ERA3.grey, 1); }
    const ha = s.t * 2.4; line(px_, py, px_ + Math.sin(ha) * 7, py - Math.cos(ha) * 7, ERA3.ink, 1.8); circ(px_, py, 1.6, ERA3.ink);
    if (litNow(f)) { const k = s.levelT - (f.lt as number); A(Math.min(1, k / 0.15) * Math.min(1, (2.4 - k) / 0.6) * 0.7, () => { ctx.strokeStyle = FLOPPY.sun; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(px_, py, 15, 0, Math.PI * 2); ctx.stroke(); }); }
  }
  function inspectorDraw(f: Foe): void {
    const x = f.x, top = f.top, base = f.base;
    ctx.save();
    if (f.dead) { const k = Math.min(1, f.flip / 0.5); ctx.translate(x + 13, base); ctx.rotate(k * 1.35); ctx.translate(-x - 13, -base); ctx.globalAlpha = Math.max(0, 1 - Math.max(0, f.flip - 0.7) / 0.9); }
    rr(x - 1, base - 9, 28, 9, 4, ERA3.ink); [5, 13, 21].forEach((cx) => circ(x + cx, base - 4.5, 2.6 + (f.dead ? 0 : Math.sin(f.ph + cx) * 0.3), ERA3.grey));
    rr(x + 2, top + 13, 22, 14, 4, ERA3.grey); rr(x + 2.5, top + 13.5, 21, 13, 4, null, ERA3.ink, 1.2); rect(x + 6, top + 19, 14, 2, ERA3.white);
    circ(x + 13, top + 8, 8.6, ERA3.white); ctx.strokeStyle = ERA3.ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x + 13, top + 8, 8.6, 0, Math.PI * 2); ctx.stroke(); circ(x + 10.5, top + 8, 3.4, ERA3.ink); circ(x + 9.5, top + 7, 1.1, ERA3.white); rect(x + 12, top - 3, 2, 3, ERA3.ink);
    if (!f.dead) { rr(x - 9, top + 12, 12, 16, 2, ERA3.white); rr(x - 8.5, top + 12.5, 11, 15, 2, null, ERA3.ink, 1); ctx.strokeStyle = ERA3.good; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 6, top + 20); ctx.lineTo(x - 3.5, top + 23); ctx.lineTo(x + 1, top + 16); ctx.stroke(); }
    ctx.restore();
    if (f.dead) { const k = f.flip; A(Math.max(0, 1 - k / 1.4), () => { const cx = x - 4 - k * 18, cyy = top + 18 - 90 * k + 170 * k * k; ctx.save(); ctx.translate(cx, cyy); ctx.rotate(k * 7); rr(-6, -8, 12, 16, 2, ERA3.white); rr(-5.5, -7.5, 11, 15, 2, null, ERA3.ink, 1); ctx.restore(); for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(x + 10 + i * 9 - k * 6, top - 8 - 50 * k + 120 * k * k + i * 6); ctx.rotate(k * (3 + i)); rect(-3, -2, 6, 4, ERA3.white); ctx.restore(); } }); }
    else glowBox(f, x - 9, top - 4, 36, 40);
  }
  function ghostDraw(f: Foe): void {
    const s = S, x = f.x + 15, y = f.y, wob = Math.sin(s.t * 3 + f.gph); const a = 0.62 + 0.14 * Math.sin(s.t * 1.7 + f.gph);
    A(a, () => { ctx.beginPath(); ctx.moveTo(x - 15, y + 12); ctx.lineTo(x - 15, y - 2); ctx.arc(x, y - 2, 15, Math.PI, 0); ctx.lineTo(x + 15, y + 12); for (let i = 0; i < 5; i++) ctx.lineTo(x + 15 - (i + 0.5) * 6, y + 12 + (i % 2 ? -1 : 5) + wob * 1.5); ctx.lineTo(x - 15, y + 12); ctx.closePath(); ctx.fillStyle = ERA3.white; ctx.fill(); ctx.strokeStyle = ERA3.grey; ctx.lineWidth = 1.2; ctx.stroke(); });
    A(a * 0.8, () => { for (let i = 0; i < 9; i++) rect(x - 11 + (i * 7 + Math.floor(s.t * 3)) % 22, y - 10 + (i * 5) % 18, 2.4, 2.4, i % 3 ? FLOPPY.skyLow : ERA3.grey); });
    glowBox(f, x - 18, y - 19, 36, 36);
  }
  function beamDraw(f: Foe): void {
    const x = f.x, w = f.w, b = GROUND_Y, top = GROUND_Y - 150, on = f.on;
    if (on > 0.02) { A(on * 0.5, () => rect(x + 8, top, w - 16, 150, ERA3.accentHi)); A(on * 0.5, () => { for (let i = 0; i < 9; i++) { const yy = top + ((S.t * 80 + i * 17) % 150); rect(x + 8, yy, w - 16, 2, ERA3.white); } }); if (on >= 0.95) A(0.9, () => { rect(x + 8, top, 2, 150, ERA3.white); rect(x + w - 10, top, 2, 150, ERA3.white); }); else A(0.5, () => { ctx.setLineDash([3, 5]); ctx.strokeStyle = ERA3.white; ctx.lineWidth = 1; ctx.strokeRect(x + 8, top, w - 16, 150); ctx.setLineDash([]); }); }
    for (const px_ of [x, x + w - 10]) { rect(px_, top, 10, 150, FLOPPY.hillDk); rect(px_, top, 4, 150, FLOPPY.fence); rr(px_ - 2, top - 8, 14, 10, 3, ERA3.grey); circ(px_ + 5, top - 3, 3, on > 0.15 ? ERA3.white : ERA3.ink); rect(px_ - 3, b - 6, 16, 6, FLOPPY.fenceDk); }
    glowBox(f, x - 4, top - 10, w + 8, 162);
  }
  function pylonDraw(f: Foe): void {
    const x = f.x, gl = f.glow, base = GROUND_Y, top = GROUND_Y - 78;
    if (gl > 0.02) { A(gl * 0.45, () => rect(x + 3, top - 160, 14, 160, ERA3.accentHi)); A(gl * 0.5, () => { for (let i = 0; i < 6; i++) rect(x + 3, top - 160 + ((S.t * 70 + i * 29) % 160), 14, 2, ERA3.white); }); }
    rect(x + 4, top, 12, 78, FLOPPY.hillDk); rect(x + 4, top, 4, 78, FLOPPY.fence); rr(x, top - 8, 20, 10, 3, ERA3.grey); circ(x + 10, top - 3, 3, gl > 0.1 ? ERA3.white : ERA3.ink); rect(x - 2, base - 6, 24, 6, FLOPPY.fenceDk);
    if (gl < 0.5 && gl > 0.02) A(0.5, () => { for (let i = 0; i < 4; i++) circ(x + 10 + Math.sin(S.t * 6 + i * 1.7) * 9, top - 14 - ((S.t * 22 + i * 6) % 18), 1.4, FLOPPY.sun); });
    glowBox(f, x - 3, top - 10, 26, 90);
  }
  function signDraw(f: Foe): void { const x = f.x, b = GROUND_Y; rect(x + 32, b - 40, 4, 40, FLOPPY.fenceDk); rr(x, b - 78, 70, 40, 5, ERA3.white); rr(x + 0.5, b - 77.5, 69, 39, 5, null, ERA3.grey, 1.4); rr(x, b - 78, 70, 11, 5, ERA3.grey); rect(x, b - 73, 70, 6, ERA3.grey); rect(x + 58, b - 76, 7, 6, ERA3.white); tx('x', x + 61.5, b - 72.5, 8, ERA3.ink, 'center', 800); tx('!', x + 12, b - 54, 14, ERA3.grey, 'center', 800); ctx.strokeStyle = ERA3.grey; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x + 12, b - 54, 9, 0, Math.PI * 2); ctx.stroke(); tx(f.text, x + 40, b - 54, 7, ERA3.ink, 'center', 800); glowBox(f, x, b - 78, 70, 40); }
  function freeGateDraw(f: Foe): void { const x = f.x, b = GROUND_Y; A(0.2 + 0.05 * Math.sin(S.t * 2), () => poly([[x + 8, b - 70], [x + 52, b - 70], [x + 120, b - 220], [x - 60, b - 220]], FLOPPY.sun)); rect(x, b - 70, 8, 70, FLOPPY.fenceDk); rect(x + 52, b - 70, 8, 70, FLOPPY.fenceDk); rect(x - 2, b - 74, 12, 6, FLOPPY.fence); rect(x + 50, b - 74, 12, 6, FLOPPY.fence); poly([[x + 8, b - 64], [x + 8, b - 2], [x - 30, b - 14], [x - 30, b - 52]], FLOPPY.fence); line(x - 30, b - 33, x + 8, b - 33, FLOPPY.fenceDk, 3); line(x - 18, b - 54, x - 18, b - 12, FLOPPY.fenceDk, 2); glowBox(f, x - 32, b - 76, 96, 78); }
  function gateDraw(o: Obj): void { const x = o.x, t = o.top, b = o.base, hh = b - t; rect(x - 4, t - 4, 24, hh + 4, FLOPPY.fenceDk); rect(x, t, 16, hh, FLOPPY.fence); for (let i = 0; i < 4; i++) line(x + 8, t + 6 + i * (hh - 12) / 3, x + 8, t + 6 + i * (hh - 12) / 3 + 3, FLOPPY.fenceDk, 6); for (let yy = t + 8; yy < b - 4; yy += 13) rect(x, yy, 16, 2.4, FLOPPY.fenceDk); rr(x + 2, t + hh / 2 - 7, 12, 11, 2, ERA3.grey); ctx.strokeStyle = ERA3.grey; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(x + 8, t + hh / 2 - 7, 4.5, Math.PI, 0); ctx.stroke(); circ(x + 8, t + hh / 2 - 1, 1.4, ERA3.ink); rect(x, t, 16, 2, FLOPPY.hillFar); }
  function strayDraw(q: Stray): void {
    const s = S, bob = Math.sin(s.t * 5 + q.seed) * 1.5;
    if (q.ring) { A(0.35 + 0.15 * Math.sin(s.t * 4 + q.x * 0.1), () => circ(q.x, q.y - 14 + bob, 27, FLOPPY.sun)); ctx.strokeStyle = FLOPPY.sun; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.ellipse(q.x, q.y - 14 + bob, 21, 23, 0, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = ERA3.white; ctx.lineWidth = 1; ctx.stroke(); }
    lambSprite(q.x, q.y + bob, 1, { phase: s.t * 3, air: false }); circ(q.x, q.y - 30 + bob, 3, FLOPPY.sun); if (Math.floor(s.t * 2) % 2 === 0) circ(q.x + 9, q.y - 33, 1.4, ERA3.white);
    if (litNow(q)) { const k = s.levelT - (q.lt as number); A(Math.min(1, k / 0.15) * Math.min(1, (2.4 - k) / 0.6) * 0.8, () => { ctx.strokeStyle = FLOPPY.sun; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(q.x, q.y - 14 + bob, 24, 0, Math.PI * 2); ctx.stroke(); }); }
  }

  // ── the sky, the far hills, the meadow ──
  function sunY(tt: number): number { if (tt < 150) return 78 + 230 * smooth(tt / 150); if (tt >= 258) return GROUND_Y + 14 - 150 * smooth((tt - 258) / 20); return GROUND_Y + 40; }
  function drawSky(e: Env, cam: number): void {
    const s = S; rect(0, 0, W, PLAY_BOT, FLOPPY.sky); rect(0, GROUND_Y - 80 + cam * 0.5, W, 80, FLOPPY.skyLow);
    const sY = sunY(s.levelT) + cam * 0.12, sunA = 1 - e.rain * 0.7 - e.fog * 0.3;
    A(sunA, () => circ(W - 54, sY, 22, FLOPPY.sun)); if (e.warm > 0.3 && sY > 200) A(0.25 * sunA, () => circ(W - 54, sY, 40, FLOPPY.sun));
    if (e.stars > 0.02) { A(e.stars, () => { for (let i = 0; i < 26; i++) { const x = (i * 83 + 17) % W, y = ((i * 47 + 11) % 220) + 8; const tw = 0.5 + 0.5 * Math.sin(s.t * 2 + i); A(0.4 + 0.6 * tw, () => rect(x, y, 1.8, 1.8, ERA3.white)); } }); }
    if (e.tint > 0.25 && e.rain < 0.6) A(Math.min(1, (e.tint - 0.25) * 3) * (1 - e.rain), () => { circ(60, 96 + cam * 0.12, 15, ERA3.white); circ(66, 92 + cam * 0.12, 13, FLOPPY.sky); });
    for (const [cx, cy, cw] of [[30, 96, 50], [170, 130, 42], [90, 190, 62], [220, 250, 48], [20, 300, 46]]) { const x = ((cx - s.dist * 0.12) % (W + 120) + W + 120) % (W + 120) - 60; const yy = cy + cam * 0.28; ell(x, yy, cw / 2, 9, FLOPPY.cloud); ell(x + cw * 0.18, yy - 7, cw * 0.28, 9, FLOPPY.cloud); }
    if (e.warm > 0.01) { const gy = GROUND_Y + cam * 0.5; const gr = ctx.createLinearGradient(0, gy - 150, 0, gy); gr.addColorStop(0, rgba(FLOPPY.sun, 0)); gr.addColorStop(1, rgba(FLOPPY.sun, e.warm * 0.55)); ctx.fillStyle = gr; ctx.fillRect(0, gy - 150, W, 150); }
    // up above the meadow the day thins into night: the higher the camera, the deeper the sky and the more stars
    const alt = Math.max(0, Math.min(1, (cam - 90) / 330));
    if (alt > 0.01) { A(alt * 0.7, () => rect(0, 0, W, PLAY_BOT, ERA3.ink)); A(Math.min(1, alt * 1.4), () => { for (let i = 0; i < 78; i++) { const x = (i * 71 + 29) % W, y = ((i * 53 + 7) % 480) + 4 + (cam * 0.05) % 20; const tw = 0.5 + 0.5 * Math.sin(s.t * 1.8 + i * 1.3); A(0.5 + 0.5 * tw, () => rect(x, y, 2.2 + (i % 4 === 0 ? 1 : 0), 2.2 + (i % 4 === 0 ? 1 : 0), ERA3.white)); } }); A(alt, () => { circ(228, 78 + cam * 0.04, 17, ERA3.white); circ(235, 73 + cam * 0.04, 15, ERA3.ink); }); }
  }
  function drawFar(e: Env, cam: number): void {
    const s = S, hd = s.dist * 0.3, HW_ = 120;
    ctx.save(); ctx.translate(0, cam * 0.6);
    for (let i = 0; i < 3; i++) { const x = ((i * 150 - hd) % (W + 150) + W + 150) % (W + 150) - 75; ctx.beginPath(); ctx.ellipse(x, GROUND_Y, HW_ * 0.75, 28, 0, Math.PI, 0); ctx.fillStyle = FLOPPY.hillFar; ctx.fill(); ctx.beginPath(); ctx.ellipse(x + 62, GROUND_Y, HW_ * 0.55, 18, 0, Math.PI, 0); ctx.fillStyle = FLOPPY.hill; ctx.fill(); }
    ctx.restore(); ctx.save(); ctx.translate(0, cam * 0.8);
    specFar();
    windmill(wrapX(220, 0.16, 760, 60), GROUND_Y - 6, 0.9);
    for (let i = 0; i < 3; i++) tree(wrapX(40 + i * 170, 0.45, 520, 40), GROUND_Y + 2, 0.8 + (i % 2) * 0.25);
    if (e.tint > 0.18) { const gl = Math.min(1, (e.tint - 0.18) * 3.5); for (let i = 0; i < 3; i++) lampPost(wrapX(80 + i * 200, 0.8, 600, 40), gl); }
    ctx.restore();
  }
  function drawTint(e: Env, k: number): void { if (e.tint > 0.005) A(e.tint * k, () => rect(0, 0, W, PLAY_BOT, ERA3.ink)); }
  function drawMist(e: Env): void {
    const s = S, m = Math.max(e.mist, e.fog), gs = GROUND_Y + s.camY;
    if (m > 0.02) for (let i = 0; i < 4; i++) { const x = ((i * 150 - s.t * 14 - s.dist * 0.06) % (W + 200) + W + 200) % (W + 200) - 100; A(0.34 * m, () => ell(x, gs - 38 - i * 24, 120, 13, ERA3.white)); }
    if (e.fog > 0.02) A(0.26 * e.fog, () => rect(0, 0, W, PLAY_BOT, ERA3.white));
  }
  function drawGround(): void {
    const s = S;
    rect(0, GROUND_Y + GRASS_H - 8, W, 900, FLOPPY.earth); A(0.16, () => { for (let i = 0; i < 12; i++) rect(0, GROUND_Y + GRASS_H + 8 + i * 30, W, 2, FLOPPY.fenceDk); });
    rect(0, GROUND_Y, W, GRASS_H, FLOPPY.hill); rect(0, GROUND_Y, W, 3, FLOPPY.hillFar); rect(0, GROUND_Y + GRASS_H - 8, W, 8, FLOPPY.earth);
    for (let i = 0; i < 12; i++) { const x = ((i * 31 - s.dist) % (W + 31) + W + 31) % (W + 31) - 10; rect(x, GROUND_Y + 10 + (i % 3) * 7, 5, 2, FLOPPY.hillDk); }
    for (let i = 0; i < 9; i++) { const x = ((i * 41 + 17 - s.dist) % (W + 41) + W + 41) % (W + 41) - 12, yy = GROUND_Y + 16 + (i % 3) * 5; rect(x, yy, 1.6, 6, FLOPPY.hillDk); circ(x, yy - 1, 3, i % 2 ? FLOPPY.sun : ERA3.white); }
    litterDraw(); for (const p of s.pits) pitDraw(p);
  }
  function drawWeather(): void {
    for (const p of S.weather) {
      if (p.k === 'rain') { ctx.strokeStyle = ERA3.white; ctx.lineWidth = 1; ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 4, p.y + 11); ctx.stroke(); ctx.globalAlpha = 1; }
      else if (p.k === 'leaf') A(0.9, () => { ell(p.x, p.y + Math.sin(p.ph ?? 0) * 6, 3.4, 1.7, p.c ? FLOPPY.sun : ERA3.white, Math.sin(p.ph ?? 0) * 0.8); });
      else if (p.k === 'spark') A(0.4 + 0.5 * Math.sin(p.ph ?? 0), () => circ(p.x, p.y, 1.6, FLOPPY.sun));
      else if (p.k === 'fly') A(0.3 + 0.7 * (0.5 + 0.5 * Math.sin(p.ph ?? 0)), () => { circ(p.x, p.y, 4.5, FLOPPY.sun); circ(p.x, p.y, 1.6, ERA3.white); });
    }
  }
  function header(): void {
    const s = S; rect(0, 0, W, HEADER_H, ERA3.white); rect(0, HEADER_H - 1, W, 1, FLOPPY.hillDk);
    // ⚑ the host's Back (the prototype had none: it was the whole page) — at the left, before her count
    tx(g.back, 11, 17, 24, FLOPPY.ink, 'center', 700);
    hitRects.push({ x: 0, y: 0, w: 26, h: HEADER_H, id: 'back' });
    // the clock is the song: time left, and how far through it you are
    const L = levelLen(), left = L - s.levelT;
    tx(g.header.called, 30, 12, 10, ERA3.grey, 'left', 600); tx(String(s.called), 30, 26, 15, FLOPPY.ink, 'left', 800);
    tx(mmss(left), W / 2, 18, 17, FLOPPY.ink, 'center', 800);
    tx(g.header.withYou, W - 14, 12, 10, ERA3.grey, 'right', 600); tx(String(s.flock.length), W - 14, 26, 15, FLOPPY.ink, 'right', 800);
    rect(0, HEADER_H, W, 4, FLOPPY.skyLow); rect(0, HEADER_H, W * Math.min(1, s.levelT / L), 4, ERA3.good);
    for (let i = 1; i < SECTIONS.length; i++) rect(Math.round(W * SECTIONS[i].t0 / L) - 0.5, HEADER_H, 1, 4, ERA3.white);
  }
  function footer(): void {
    const s = S; rect(0, GROUND_Y + GRASS_H, W, H - (GROUND_Y + GRASS_H), ERA3.white);
    let hint: string; if (s.mode === 'idle') hint = g.hint.start; else if (s.mode === 'done') hint = g.hint.done; else if (!s.onGround && s.flapCount < FLAPS.length && s.cloverT <= 0) hint = g.hint.air; else if (s.cloverT > 0) hint = g.hint.clover; else hint = g.push[Math.floor(s.levelT / 14) % g.push.length];
    tx(hint, W / 2, FOOT_Y + 2, 12, FLOPPY.ink, 'center', 600); tx(g.publisher, W / 2, FOOT_Y + 15, 9, ERA3.grey, 'center', 500);
    const NX = 12, NY = FOOT_Y + 22, playing = songPlaying();
    rr(NX, NY, 34, 34, 17, playing ? FLOPPY.hillFar : ERA3.white, FLOPPY.hillDk, 1.5);
    rect(NX + 19, NY + 8, 2, 14, FLOPPY.ink); rect(NX + 19, NY + 8, 6, 2, FLOPPY.ink); circ(NX + 15, NY + 23, 4.4, FLOPPY.ink);
    if (songOff || songState === 'missing') { ctx.strokeStyle = FLOPPY.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(NX + 5, NY + 29); ctx.lineTo(NX + 29, NY + 5); ctx.stroke(); }
    hitRects.push({ x: NX - 4, y: NY - 4, w: 42, h: 42, id: 'song' });
    const PX = W - 46; rr(PX, NY, 34, 34, 17, ERA3.white, FLOPPY.hillDk, 1.5); if (s.paused) poly([[PX + 13, NY + 9], [PX + 13, NY + 25], [PX + 26, NY + 17]], FLOPPY.ink); else { rect(PX + 11, NY + 10, 4, 14, FLOPPY.ink); rect(PX + 19, NY + 10, 4, 14, FLOPPY.ink); }
    hitRects.push({ x: PX - 4, y: NY - 4, w: 42, h: 42, id: 'pause' });
    lyricsDraw(54, FOOT_Y + 24, W - 106);
    const bw = W - 60, bh = 38, bx = 30, by = H - bh - 16, down = s.held && !s.onGround;
    // ⚑ the calm switch (the prototype's F and its "spectacle" button, outside its canvas): here, in the footer's spare height
    const cl = SPEC.full ? g.calm.full : g.calm.calm; ctx.font = `600 11px ${FONT}`; const cw = Math.ceil(ctx.measureText(cl).width) + 28, cx0 = Math.round(W / 2 - cw / 2), cy0 = Math.round((NY + 34 + by) / 2 - 11);
    rr(cx0, cy0, cw, 22, 11, SPEC.full ? ERA3.white : FLOPPY.skyLow, FLOPPY.hillDk, 1.2); tx(cl, W / 2 + 6, cy0 + 11, 11, FLOPPY.ink, 'center', 600);
    starburst(cx0 + 12, cy0 + 11, 5, 2.4, 5, 0, SPEC.full ? BOMB.gold : ERA3.grey, 1);
    hitRects.push({ x: cx0 - 4, y: cy0 - 4, w: cw + 8, h: 30, id: 'calm' });
    rr(bx, by + (down ? 3 : 0) + 3, bw, bh, 12, FLOPPY.hillDk); rr(bx, by + (down ? 3 : 0), bw, bh, 12, FLOPPY.hillFar); rect(bx + 10, by + 4 + (down ? 3 : 0), bw - 20, 2, ERA3.white);
    tx(g.jump, W / 2, by + bh / 2 + (down ? 3 : 0), 15, FLOPPY.ink, 'center', 800);
  }
  // the introduction: the platform's cheerful voice, and one plain line on how to play
  function intro(): void {
    A(0.45, () => rect(0, HEADER_H + 4, W, GROUND_Y + GRASS_H - HEADER_H - 4, ERA3.ink));
    ctx.save(); ctx.beginPath(); ctx.rect(0, HEADER_H + 4, W, GROUND_Y + GRASS_H - HEADER_H - 4); ctx.clip(); starburst(W / 2, 220, 330, 190, 18, S.t * 0.25, BOMB.gold, 0.2); starburst(W / 2, 220, 290, 170, 18, -S.t * 0.2, BOMB.hot, 0.16); ctx.restore();
    const X = 20, Y = 44, PW = W - 40, PH = 352; rr(X, Y + 4, PW, PH, 20, FLOPPY.hillDk); rr(X, Y, PW, PH, 20, ERA3.white); rect(X + 16, Y, PW - 32, 4, FLOPPY.hillFar);
    circ(X + 40, Y + 38, 27, FLOPPY.skyLow); lambSprite(X + 40, Y + 54, 1.5, { phase: S.t * 6 });
    garish(g.intro.title, X + 156, Y + 34, 24, { maxW: 160, rot: -0.03 }); tx(g.publisher, X + 72, Y + 58, 11, ERA3.grey, 'left', 600);
    const vl = wrap(g.intro.voice, PW - 40, 13, 600); vl.forEach((ln, i) => tx(ln, X + 20, Y + 88 + i * 16, 13, FLOPPY.ink, 'left', 600));
    tx(g.intro.signed, X + 20, Y + 88 + vl.length * 16 + 3, 10, ERA3.grey, 'left', 700);
    const hy = Y + 88 + vl.length * 16 + 16, hl = wrap(g.intro.how, PW - 52, 11.5, 700);
    rr(X + 14, hy, PW - 28, 28 + hl.length * 14, 12, FLOPPY.skyLow);
    tx(g.intro.howTitle, X + 26, hy + 13, 10, ERA3.grey, 'left', 800);
    hl.forEach((ln, i) => tx(ln, X + 26, hy + 29 + i * 14, 11.5, FLOPPY.ink, 'left', 700));
    const by = Y + PH - 36; rr(X + 40, by, PW - 80, 26, 13, ERA3.good); tx(g.intro.go, W / 2, by + 14, 14, ERA3.white, 'center', 800);
    bulbRing(X - 6, Y - 6, PW + 12, PH + 12, 16, 0, true);
    tx(g.intro.length.replace('{t}', mmss(levelLen())), W / 2, Y + PH + 14, 10, ERA3.white, 'center', 600);
  }
  // the end of the song: the cheerful count of the lambs called, and, plainly, how many are still here
  function outro(): void {
    const s = S, k = Math.min(1, (s.doneT - 0.6) / 0.5);
    A(k, () => {
      A(0.4, () => rect(0, HEADER_H + 4, W, GROUND_Y + GRASS_H - HEADER_H - 4, ERA3.ink));
      const X = 28, Y = 96, PW = W - 56, PH = 250; rr(X, Y + 4, PW, PH, 20, FLOPPY.hillDk); rr(X, Y, PW, PH, 20, ERA3.white); rect(X + 16, Y, PW - 32, 4, FLOPPY.hillFar);
      starburst(W / 2, Y + 100, 240, 150, 16, S.t * 0.2, BOMB.gold, 0.16); bulbRing(X - 6, Y - 6, PW + 12, PH + 12, 16, 1, true);
      garish(g.outro.title, W / 2, Y + 34, 22, { maxW: PW - 30, rot: -0.03 });
      tx(g.outro.said, W / 2, Y + 70, 12, FLOPPY.ink, 'center', 600);
      garish(String(s.called), W / 2, Y + 106, 44, { c1: BOMB.lime, c2: BOMB.cyan, rim: BOMB.violet, rot: 0.03 }); tx(g.outro.after, W / 2, Y + 140, 12, FLOPPY.ink, 'center', 600);
      rect(X + 30, Y + 160, PW - 60, 1, FLOPPY.skyLow);
      tx(g.outro.still, W / 2, Y + 182, 11, ERA3.grey, 'center', 600); tx(String(s.flock.length), W / 2, Y + 208, 24, FLOPPY.ink, 'center', 800);
      if (Math.floor(s.t * 2) % 2 === 0) tx(g.outro.again, W / 2, Y + 236, 12, FLOPPY.ink, 'center', 600);
    });
  }
  function lyricsDraw(x0: number, y0: number, w: number): void {   // his words, the line being sung, each word lit as it comes
    if (!song || !songPlaying()) { if (songState === 'missing') tx(g.hint.songMissing, x0, y0 + 8, 10, ERA3.grey, 'left', 500); return; }
    const now = song.currentTime; let li = -1; for (let i = 0; i < LYRICS.length; i++) if (LYRICS[i][0] <= now) li = i;
    if (li < 0 || now - LYRICS[li][1][LYRICS[li][1].length - 1][0] >= 3) { tx('♪', x0 + 8, y0 + 8, 12, ERA3.grey, 'left', 500); return; }
    ctx.font = `700 13px ${FONT}`; const words = LYRICS[li][1]; const rows: Array<Array<[number, string]>> = [[]]; let width = 0;
    for (const wd of words) { const ww = ctx.measureText(wd[1] + ' ').width; if (width + ww > w && rows[rows.length - 1].length) { rows.push([]); width = 0; } rows[rows.length - 1].push(wd); width += ww; }
    rows.slice(0, 3).forEach((row, ri) => { let x = x0; for (const [wt, word] of row) { ctx.fillStyle = wt <= now ? FLOPPY.ink : ERA3.grey; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(word, x, y0 + 8 + ri * 16); x += ctx.measureText(word + ' ').width; } });
  }

  function draw(c: CanvasRenderingContext2D, h: number): void {
    ctx = c; H = h; hitRects = [];
    const s = S, e = (s.mode === 'idle') ? envAt(0) : s.lastEnv, cam = s.camY;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, PLAY_BOT); ctx.clip();
    const shk = SPEC.full && SPEC.shake > 0.05 && !s.paused ? SPEC.shake : 0; if (shk) { rect(0, 0, W, PLAY_BOT, FLOPPY.sky); ctx.translate((Math.random() - 0.5) * 2 * shk, (Math.random() - 0.5) * 2 * shk); }
    drawSky(e, cam); specSkyBack(e, cam); drawFar(e, cam); specSkyFront(cam);
    ctx.save(); ctx.translate(0, cam);
    drawGround(); for (const z of s.zones) zoneDraw(z);
    ctx.restore();
    drawTint(e, 1); drawMist(e);
    ctx.save(); ctx.translate(0, cam);
    // the world: platforms behind, then the solids, the hazards, the lambs
    for (const o of s.objs) if (o.k === 'cloud' && !o.gone) { cloudPlat(o); glowBox(o, o.x, o.top - 2, o.w, 18); }
    for (const f of s.foes) { if (f.k === 'pylon') pylonDraw(f); else if (f.k === 'sign') signDraw(f); else if (f.k === 'freegate') freeGateDraw(f); else if (f.k === 'beam') beamDraw(f); }
    for (const o of s.objs) {
      if (o.k === 'fence') { fenceDraw(o); glowBox(o, o.x - 8, o.top, o.w + 16, o.h); } else if (o.k === 'wire') { wireDraw(o); glowBox(o, o.x - 2, o.top - 8, o.w + 4, o.h + 8); } else if (o.k === 'pipe') { pipeDraw(o); glowBox(o, o.x - 3, o.top, o.w + 6, o.h); }
      else if (o.k === 'ceil') { ceilDraw(o); } else if (o.k === 'bale') { baleDraw(o); glowBox(o, o.x, o.top, o.w, o.h); } else if (o.k === 'spring') { springPad(o); glowBox(o, o.x, o.top - 6, o.w, 20); }
      else if (o.k === 'puddle') puddleDraw(o); else if (o.k === 'block') { blockDraw(o); glowBox(o, o.x, o.top, o.w, o.base - o.top); }
      else if (o.k === 'thorn') { thornDraw(o); glowBox(o, o.x, o.top - 6, o.w, 22); } else if (o.k === 'gate') { gateDraw(o); glowBox(o, o.x - 4, o.top - 6, o.w + 8, o.h + 6); }
    }
    for (const q of s.strays) strayDraw(q);
    for (const cl of s.clovers) cloverSprite(cl.x, cl.y);
    for (const f of s.foes) { if (f.k === 'crook') crookDraw(f); else if (f.k === 'inspector') inspectorDraw(f); else if (f.k === 'ghost') ghostDraw(f); else if (f.k === 'drone') droneDraw(f); }
    ctx.restore(); drawTint(e, 0.3); ctx.save(); ctx.translate(0, cam);
    // lambs wandering off into the hills: smaller, higher, softer, and content
    for (const w of s.wander) { const k = w.d; A(1 - Math.max(0, k - 0.6) / 0.4, () => lambSprite(w.x + w.dir * 14 * k, w.y - 36 * k, 1 - 0.5 * k, { phase: s.t * 8 + w.seed })); }
    // the flock: behind her, in rows (depth), each copying her path
    const nShow = Math.min(s.flock.length, 24);
    for (let i = nShow - 1; i >= 0; i--) { const row = Math.floor(i / 3), back = lambX(i); const yy = trailY(back); const air = yy < GROUND_Y - 1; lambSprite(SX - back, yy - row * 6, 1 - row * 0.05, { air, phase: s.dist / 9 + i * 0.7, squash: 0, vy: 0 }); }
    for (const l of s.lost) lambSprite(l.x, l.y, 1, { air: true, rot: l.rot * 0.3, vy: 0 });
    // her
    const blink = s.invT > 0 && Math.floor(s.t * 14) % 2 === 0;
    megaSheep(); if (!blink) sheep(SX, s.fy, 1.0, { air: !s.onGround, phase: s.dist / 9, squash: s.squash > 0 ? 0.12 : 0, rot: 0, vy: s.vy, mega: SPEC.heat > 0 ? SPEC.tier : 0 });
    if (s.cloverT > 0) for (let i = 0; i < 5; i++) { const a = s.t * 6 + i * 1.3; circ(SX - 20 - i * 6 + Math.cos(a) * 2, s.fy - 20 + Math.sin(a) * 6, 1.8, FLOPPY.sun); }
    for (const d of s.dust) { const k = d.t / 0.35; circ(d.x + (d.x > SX ? 1 : -1) * k * 10, d.y - 2 - k * 4, 2.4 * (1 - k), FLOPPY.hillFar); }
    for (const h of s.hearts) { const k = h.t; A(1 - k, () => circ(h.x + Math.sin(k * 6 + h.k) * 4, h.y - k * 26, 2.4, FLOPPY.sun)); }
    for (const m of s.motes) A(Math.min(1, m.life) * (0.5 + 0.4 * Math.sin(m.ph)), () => { if (m.wool) { circ(m.x, m.y, 2.6, ERA3.white); circ(m.x + 1.6, m.y + 1, 1.8, FLOPPY.woolShade); } else circ(m.x, m.y, 2, FLOPPY.sun); });
    for (const b of s.bubbles) { ctx.font = `700 11px ${FONT}`; const w = ctx.measureText(b.s).width + 12; A(1 - b.t / 0.8, () => { rr(b.x - w / 2, b.y - b.t * 18 - 9, w, 18, 9, ERA3.white); tx(b.s, b.x, b.y - b.t * 18, 11, FLOPPY.ink, 'center', 700); }); }
    ctx.restore();
    drawWeather(); specFront();
    ctx.restore();
    header(); footer();
    if (s.toast) { const toast = s.toast; const k = Math.min(1, toast.t / 0.3) * Math.min(1, (3.2 - toast.t) / 0.5); A(k, () => { ctx.font = `700 12px ${FONT}`; const w = ctx.measureText(toast.s).width + 26; rr(W / 2 - w / 2, HEADER_H + 14, w, 22, 11, ERA3.white); tx(toast.s, W / 2, HEADER_H + 25, 12, FLOPPY.ink, 'center', 700); }); }
    if (s.mode === 'idle') intro();
    if (s.mode === 'done' && s.doneT > 0.6) outro();
    if (s.paused) { A(0.6, () => rect(0, 0, W, H, ERA3.ink)); tx(g.paused.title, W / 2, 250, 26, ERA3.white, 'center', 800); tx(g.paused.sub, W / 2, 282, 13, ERA3.white, 'center', 600); }
  }

  /** a press at a point of the game's own space. Returns the id of what was pressed ('tap' = the screen itself). */
  function pressAt(x: number, y: number): string {
    SND.unlock();
    for (const h of hitRects) if (x >= h.x && x < h.x + h.w && y >= h.y && y < h.y + h.h) {
      if (h.id === 'song') toggleSong();
      else if (h.id === 'pause') { if (S.mode === 'run') setPaused(!S.paused); }
      else if (h.id === 'calm') toggleFx();
      return h.id;
    }
    press();
    return 'tap';
  }
  /** ?debug=1 only: jump the song (and the world with it) to `t`, as if she had played to there */
  function seek(t: number): void {
    const s = S; if (s.mode !== 'run') startRun();
    S.levelT = t; S.dist = D(t); S.objs = []; S.strays = []; S.clovers = []; S.pits = []; S.zones = []; S.foes = []; S.nextX = W - 60;
    S.itemI = COURSE.findIndex((it) => it.spawnAt > S.dist - (W + 150)); if (S.itemI < 0) S.itemI = COURSE.length;
    SPEC.mi = MARKS.findIndex((m) => m[0] > t - 1.0); if (SPEC.mi < 0) SPEC.mi = MARKS.length; SPEC.lastT = t; cannonLast = -99;
    if (song) { try { song.currentTime = t; } catch { /* not seekable yet */ } }
    spawnCourse(); fill(); cameraUpdate(0, true);
  }

  return {
    draw, pressAt, update, seek,
    open(): void { songOff = false; reset(); specReset(); },
    close(): void { stopSong(); },
    get hits(): Rect[] { return hitRects; },
    get t(): number { return S.t; },
    get mode(): State['mode'] { return S.mode; },
    get paused(): boolean { return S.paused; },
    get state(): State { return S; },
    finish(): void { const s = S; if (s.mode !== 'run') startRun(); s.mode = 'done'; s.doneT = 1.2; s.held = false; stopSong(); }
  };
}

export class FloppySheep {
  /** is the game on screen? (the phone draws its home screen otherwise) */
  open = false;
  /** bumped when the screen must be redrawn — every TICK while the game is open and not paused, and on events */
  version = 0;
  /** what the player can press RIGHT NOW, in the host's own coordinates (the walker aims at these). The
   *  whole screen is the hop; Back, ♪, pause and the calm switch are asked first. Empty while closed. */
  rects: Rect[] = [];
  private readonly game = makeGame(() => { this.version++; });
  /** host px per game px (the host's width / 300), from the last draw */
  private k = 0.6;
  private lastTick = -1;

  // ── the shell ──
  openGame(): void {
    if (this.open) return;
    this.open = true;
    this.game.open();
    this.version++;
  }

  closeGame(): void {
    if (!this.open) return;
    this.open = false;
    this.game.close();
    this.rects = [];
    this.version++;
  }

  /** the entire input surface. `true` = the tap was the game's. */
  tap(x: number, y: number): boolean {
    if (!this.open) return false;
    const lx = x / this.k, ly = y / this.k;
    const back = this.game.hits.find((h) => h.id === 'back');
    if (back && lx >= back.x && lx < back.x + back.w && ly >= back.y && ly < back.y + back.h) { this.closeGame(); return true; }
    this.game.pressAt(lx, ly);
    this.version++;
    return true;
  }

  update(dt: number): void {
    if (!this.open) return;
    this.game.update(dt);
    // the redraw clock — 30/s while the game is open and not paused, and nothing otherwise
    if (this.game.paused) return;
    const tick = Math.floor(this.game.t / TICK);
    if (tick !== this.lastTick) { this.lastTick = tick; this.version++; }
  }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const k = W / 300; this.k = k;
    ctx.save();
    ctx.scale(k, k);
    this.game.draw(ctx, Math.round(H / k));
    ctx.restore();
    const r = (v: number): number => Math.round(v * k);
    this.rects = this.game.hits.filter((h) => h.id !== 'pause' || this.game.mode === 'run')
      .map((h) => ({ x: r(h.x), y: r(h.y), w: r(h.w), h: r(h.h), id: h.id }));
    // the whole screen is the button — one thumb, anywhere (asked last)
    this.rects.push({ x: 0, y: r(HEADER_H), w: W, h: H - r(HEADER_H), id: 'tap' });
  }

  /**
   * ?debug=1 — the states a reviewer wants to land on, and nothing here exists in play: the ordinary way in
   * is the icon on the phone's home screen.
   */
  debugBeat(beat: string): void {
    this.openGame();
    switch (beat) {
      case 'floppy': break;
      case 'floppyPlay': this.game.pressAt(150, 200); break;
      case 'floppyFinale': this.game.seek(255); break;
      case 'floppyOver': this.game.finish(); break;
    }
    this.version++;
  }
}

/**
 * The icon on the phone's home screen, drawn here so the lamb lives with the
 * rest of its own art. It is the ONLY app on her phone — which is a joke on the
 * publisher and never on her.
 */
export function drawFloppyIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  px(ctx, x, y, s, s, FLOPPY.sky);
  px(ctx, x, y, s, Math.round(s * 0.18), FLOPPY.skyLow);
  px(ctx, x, y + s - Math.round(s * 0.3), s, Math.round(s * 0.3), FLOPPY.hill);
  const cx = x + s / 2; const by = y + s - Math.round(s * 0.34);
  const bw = Math.round(s * 0.5); const bh = Math.round(s * 0.3);
  for (let i = 0; i < bh; i++) {
    const k = (i + 0.5) / bh * 2 - 1;
    const half = Math.max(1, Math.round(bw / 2 * Math.sqrt(Math.max(0, 1 - k * k * 0.55))));
    px(ctx, cx - half, by - bh + i, half * 2, 1, FLOPPY.wool);
  }
  px(ctx, cx + Math.round(bw * 0.28), by - bh, Math.round(s * 0.16), Math.round(s * 0.16), FLOPPY.face);
  px(ctx, cx - Math.round(bw * 0.34), by, 2, Math.round(s * 0.1), FLOPPY.leg);
  px(ctx, cx + Math.round(bw * 0.18), by, 2, Math.round(s * 0.1), FLOPPY.leg);
}

export const FLOPPY_LABEL = g.iconLabel;
