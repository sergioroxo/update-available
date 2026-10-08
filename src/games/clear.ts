/**
 * ⚑ S222 — CLEAR (2003), Restorify's game on Daniel's flip phone — ported from the games review's prototype
 * CLEAR v8 (Pc_Simulation/Games_Proposals_2026-10-08_clear_v8/clear_v8.html; the game in full is the v7
 * README, ../Games_Proposals_2026-10-07_v7/README.md). His rulings: v6 → "I prefer the Zuma version … maybe we
 * need to hit letters to make phrases"; v7 → "a really good idea and just needs to change the font"; v8 → "Much
 * better". It REPLACES S189's REACH on the phone (src/games/reach.ts stays in the repo, unhooked).
 *
 * A REAL ZUMA. The gun fires coloured balls; a ball that lands in the chain pushes it apart; three or more of one
 * colour in a row break out; the gap closes and, if the two sides now touch in one colour, they break too. THE
 * CHAIN IS THE PROGRAMME'S OWN WORDS, one letter to a ball (data/dialog/s2_clear.json `chain`, from the Lexicon
 * and ROOTCAUSE). The player's ball has no letter. Breaking a ball lets its letter go: if the player's sentence
 * still needs it (a gold ring marks those on the belt) it flies up into the tray; if not, it falls. The sentence
 * is I KNOW WHO I AM (his diary line, cut at the comma — s2_clear.json `sentence`).
 *
 * THE LAW OF THE GAMES (his: "a rhetoric of failure … the queer side always wins"): the programme's CLEAR meter is
 * 99 × (1 − e^(−broken/36)) and the belt is fed without end, so it can never read 100; the game can only be lost
 * (the belt reaches FILE, or the 2:00 runs out). And whichever way a session ends, the labels peel off the belt
 * and every letter the sentence still lacks is let go: EVERY END SCREEN HAS THE WHOLE SENTENCE IN THE TRAY.
 *
 * WHAT THE PORT CHANGED, AND WHY (the look is v8's; the Painter is only fillStyle + fillRect, src/games/types.ts):
 * - The prototype's pre-rendered ball sprites (drawImage) are pixel masks here, built once from the same disc
 *   formula and painted as horizontal fillRect runs; a scaled ball is the mask resampled nearest-neighbour, which
 *   is what drawImage did with smoothing off.
 * - The groove (three stroked polylines, round joins) is rasterised once into runs; the stain is each 12 px
 *   segment's band, rasterised on first use. Arcs, ellipses, rounded rects and the rotated barrel are pixel
 *   paths computed from the same numbers.
 * - globalAlpha does not exist: a fade over a known ground is a palette STEP (the two theme colours mixed, as
 *   the prototype's own alpha would have mixed them); a fade over a ground that varies (the burst rings, the
 *   peeling label, the white flash) is a DITHER. Steps are quantised so the frame key can name them.
 * - Input is the room's: a tap on the glass aims at the tap and fires (the gun and the NEXT key swap; PAUSE and
 *   SOUND are the soft keys); the device's keys — LEFT / RIGHT turn the gun a step a press (the keyboard's repeat
 *   turns it on), A fires, B (and UP / DOWN) swap, START pauses. While paused, a tap on the board resumes.
 * - The piece's ONE mute (gameMenuBus) silences this game like every source. The phone's SOUND soft key is the
 *   phone's own: it quiets the game's sounds and nothing else (S222 review: a key inside the fiction must not
 *   flip a frame setting — the frame's mute lives in the menu and the room). Muted by either, it shows OFF.
 *   Live Web Audio as in the prototype (its reverb, its notes, the climbing bell), silent whenever the mute is
 *   on; the pad under the play fades out by itself if the phone is put down mid-run (the game only ticks in hand).
 *   Two sounds carry meaning and are captioned (data/strings/captions.json): a letter arriving, the sentence whole.
 *
 * Filed once, when the first session ends: "CLEAR played — the sentence was whole" (s2_clear.json `filing`) — the
 * same once-per-game shape as REACH and FIT IN. All display text is s2_clear.json. Colours: CLEAR in
 * src/desktop/theme/calendar.ts, and shades mixed from it.
 */
import type { Painter } from '../room/calendarArt';
import { text as text57, textW, TH } from '../room/font57';
import { CLEAR as R } from '../desktop/theme/calendar';
import { gameMenuBus } from '../state/gameMenuBus';
import { announceCue } from '../audio/tapeAudio';
import D from '../../data/dialog/s2_clear.json';
import type { DeviceGame, GameKey } from './types';

const SENTENCE: string = D.sentence;
const UNITS: string[][] = D.chain.units;
const W = 240, H = 320, BX = 8, BY = 62, BW = 224, BH = 206, CX = BX + BW / 2, CY = BY + BH / 2;
const SESSION = 120, DS = 16, BR = 8, HITR = 14.5, K_METER = 36, TURNS = 1.4, R0 = 92, R1 = 34, LEAD = 90, V0 = 9, V1 = 15, SHOT_V = 430, COOL = 0.22;
const COL: string[] = [R.pink, R.blue, R.yellow, R.green, R.violet];
const NCOL = 5;
/** one press of LEFT / RIGHT turns the gun this far (the prototype turned 2.4 rad/s while a key was held) */
const TURN_STEP = 0.1;

// ── colour: the theme's, and shades mixed from it ─────────────────────────────────────────────────────────────
type RGB = [number, number, number];
const rgb = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const hexOf = (c: RGB): string => '#' + c.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
const mixRGB = (a: RGB, b: RGB, k: number): RGB => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * k)) as RGB;
const mixCache = new Map<string, string>();
/** `a` moved toward `b` by k — what drawing `b` at alpha k over `a` makes; the palette step that stands in for alpha */
function mix(a: string, b: string, k: number): string {
  const kk = Math.round(Math.max(0, Math.min(1, k)) * 20) / 20;
  if (kk <= 0) return a;
  if (kk >= 1) return b;
  const key = `${a}${b}${kk}`;
  let v = mixCache.get(key);
  if (!v) { v = hexOf(mixRGB(rgb(a), rgb(b), kk)); mixCache.set(key, v); }
  return v;
}
const q = (v: number, steps: number): number => Math.round(Math.max(0, Math.min(1, v)) * steps) / steps;

// ── painting helpers ─────────────────────────────────────────────────────────────────────────────────────────
const P = (g: Painter, x: number, y: number, col: string, w = 1, h = 1): void => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); };
/** a Painter that only paints inside a rectangle (the prototype's clip) */
class Clip implements Painter {
  fillStyle: string | CanvasGradient | CanvasPattern = R.lcdDark;
  constructor(private readonly g: Painter, private readonly x0: number, private readonly y0: number, private readonly x1: number, private readonly y1: number) {}
  fillRect(x: number, y: number, w: number, h: number): void {
    const a = Math.max(x, this.x0), b = Math.max(y, this.y0), c = Math.min(x + w, this.x1), d = Math.min(y + h, this.y1);
    if (c > a && d > b) { this.g.fillStyle = this.fillStyle; this.g.fillRect(a, b, c - a, d - b); }
  }
}
const T = (g: Painter, s: string, x: number, y: number, col: string, sc = 1): void => { text57(g, s, Math.round(x), Math.round(y), col, sc); };
const CT = (g: Painter, s: string, y: number, col: string, sc = 1, x0 = 0, w = W): void => T(g, s, x0 + Math.round((w - textW(s, sc)) / 2), y, col, sc);
function glyph(g: Painter, ch: string, cx: number, cy: number, col: string, sc = 1): void {
  T(g, ch, cx - Math.round(textW(ch, sc) / 2), cy - Math.round((TH * sc) / 2), col, sc);
}
/** a run of pixels: x, y, width, colour (relative or absolute, as the caller says) */
type Run = [number, number, number, string];
function runsOf(w: number, h: number, at: (x: number, y: number) => string | null): Run[] {
  const out: Run[] = [];
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      const c = at(x, y);
      if (!c) { x++; continue; }
      let e = x + 1;
      while (e < w && at(e, y) === c) e++;
      out.push([x, y, e - x, c]); x = e;
    }
  }
  return out;
}
/** paint runs; the colour is set only when it changes (runs that never overlap are kept sorted by colour, so a
 *  ball or the whole groove costs a handful of style changes, not one a run) */
const paintRuns = (g: Painter, runs: Run[], ox: number, oy: number): void => {
  let last = '';
  for (const [x, y, w, c] of runs) { if (c !== last) { g.fillStyle = c; last = c; } g.fillRect(ox + x, oy + y, w, 1); }
};
const byColour = (runs: Run[]): Run[] => runs.sort((a, b) => (a[3] < b[3] ? -1 : a[3] > b[3] ? 1 : 0));
/** the pixels a thin stroked circle (or arc) of radius r0..r1 covers, as offsets from its centre */
const ringCache = new Map<string, Array<[number, number]>>();
function ringPts(r0: number, r1: number, a0 = 0, a1 = Math.PI * 2): Array<[number, number]> {
  const key = `${r0}|${r1}|${a0}|${a1}`;
  const hit = ringCache.get(key);
  if (hit) return hit;
  const seen = new Set<string>(), out: Array<[number, number]> = [];
  for (let r = r0; r <= r1 + 1e-6; r += 0.4) {
    const n = Math.max(12, Math.ceil(Math.abs(a1 - a0) * r * 2));
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * (i / n), dx = Math.floor(Math.cos(a) * r), dy = Math.floor(Math.sin(a) * r), k = `${dx},${dy}`;
      if (!seen.has(k)) { seen.add(k); out.push([dx, dy]); }
    }
  }
  ringCache.set(key, out);
  return out;
}
/** a filled disc of radius r about (cx, cy): every pixel whose centre is inside, as absolute runs */
function discRuns(cx: number, cy: number, r: number, col: string): Run[] {
  const x0 = Math.floor(cx - r - 1), y0 = Math.floor(cy - r - 1), n = Math.ceil(2 * r + 3);
  return runsOf(n, n, (x, y) => Math.hypot(x0 + x + 0.5 - cx, y0 + y + 0.5 - cy) <= r ? col : null).map(([x, y, w, c]) => [x0 + x, y0 + y, w, c] as Run);
}
/** the prototype's rounded rectangle (arcTo corners), filled, as one rect a row */
function rrect(g: Painter, x: number, y: number, w: number, h: number, r: number, col: string): void {
  g.fillStyle = col;
  for (let j = 0; j < h; j++) {
    const dy = j + 0.5 < r ? r - (j + 0.5) : j + 0.5 > h - r ? j + 0.5 - (h - r) : 0;
    const inset = dy > 0 ? Math.round(r - Math.sqrt(Math.max(0, r * r - dy * dy))) : 0;
    g.fillRect(x + inset, y + j, w - 2 * inset, 1);
  }
}
function lamb(g: Painter, x: number, y: number): void {
  ['.WW.WW.', 'WWWWWWK', 'WWWWWKK', '.WWWWW.', '.K...K.'].forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.') P(g, x + i * 2, y + j * 2, ch === 'W' ? R.wool : R.lcdDark, 2, 2); }));
}

// ── the groove: a spiral that comes in from the left edge, sampled a pixel at a time ────────────────────────────
interface Geom { tab: Array<{ x: number; y: number }>; plen: number; groove: Run[]; gun: Run[]; head: Run[] }
let GEOM: Geom | null = null;
function geom(): Geom {
  if (GEOM) return GEOM;
  const tab: Array<{ x: number; y: number }> = [];
  const TH0 = -Math.PI / 2 - 0.75, x0 = CX + Math.cos(TH0) * R0, y0 = CY + Math.sin(TH0) * R0, tx = -Math.sin(TH0), ty = Math.cos(TH0);
  const raw: Array<{ x: number; y: number; s: number }> = [];
  let acc = 0, ax = x0 - tx * LEAD, ay = y0 - ty * LEAD;
  raw.push({ x: ax, y: ay, s: 0 });
  for (let i = 1; i <= 90; i++) { const x = x0 - tx * LEAD * (1 - i / 90), y = y0 - ty * LEAD * (1 - i / 90); acc += Math.hypot(x - ax, y - ay); raw.push({ x, y, s: acc }); ax = x; ay = y; }
  const n = 6000;
  for (let i = 1; i <= n; i++) {
    const u = i / n, th = TH0 + Math.PI * 2 * TURNS * u, r = R0 - (R0 - R1) * u, x = CX + Math.cos(th) * r, y = CY + Math.sin(th) * r;
    acc += Math.hypot(x - ax, y - ay); raw.push({ x, y, s: acc }); ax = x; ay = y;
  }
  const plen = acc;
  let j = 0;
  for (let s = 0; s <= plen; s += 1) {
    while (j < raw.length - 2 && raw[j + 1].s < s) j++;
    const a = raw[j], b = raw[j + 1], k = (s - a.s) / Math.max(1e-6, b.s - a.s);
    tab.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
  }
  // the three strokes (22 dark, 19 frame, 16 mid; round joins), as a distance field over the board
  const dist = new Float32Array(BW * BH).fill(99);
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < tab.length; i += 3) pts.push(tab[i]);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1e-9;
    const xa = Math.max(BX, Math.floor(Math.min(a.x, b.x) - 12)), xb = Math.min(BX + BW - 1, Math.ceil(Math.max(a.x, b.x) + 12));
    const ya = Math.max(BY, Math.floor(Math.min(a.y, b.y) - 12)), yb = Math.min(BY + BH - 1, Math.ceil(Math.max(a.y, b.y) + 12));
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
      const px = x + 0.5, py = y + 0.5, t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / l2));
      const d = Math.hypot(px - a.x - dx * t, py - a.y - dy * t), o = (y - BY) * BW + (x - BX);
      if (d < dist[o]) dist[o] = d;
    }
  }
  const groove = byColour(runsOf(BW, BH, (x, y) => { const d = dist[y * BW + x]; return d <= 8 ? R.lcdMid : d <= 9.5 ? R.frame : d <= 11 ? R.lcdDark : null; })
    .map(([x, y, w, c]) => [BX + x, BY + y, w, c] as Run));
  const gun = [...discRuns(CX, CY, 17, R.lcdDark), ...discRuns(CX, CY, 15, R.frame), ...discRuns(CX, CY, 11, R.lcdMid)];
  const head = discRuns(18, 280, 5, R.snakeHead);
  GEOM = { tab, plen, groove, gun, head };
  return GEOM;
}
function posAt(s: number): { x: number; y: number } {
  const TAB = geom().tab;
  if (s <= 0) { const a = TAB[0], b = TAB[6]; const dx = (a.x - b.x) / 6, dy = (a.y - b.y) / 6; return { x: a.x + dx * -s, y: a.y + dy * -s }; }
  const i = Math.min(TAB.length - 2, Math.floor(s)), k = s - i;
  return { x: TAB[i].x + (TAB[i + 1].x - TAB[i].x) * k, y: TAB[i].y + (TAB[i + 1].y - TAB[i].y) * k };
}
function tangAt(s: number): { x: number; y: number } {
  const a = posAt(s - 2), b = posAt(s + 2), dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
  return { x: dx / l, y: dy / l };
}
/** the stain's band for one 12 px segment of the groove (14 px wide, butt ends), rasterised on first use */
const stainCache = new Map<number, Array<[number, number, number]>>();
function stainBand(i: number): Array<[number, number, number]> {
  const hit = stainCache.get(i);
  if (hit) return hit;
  const TAB = geom().tab, a = TAB[Math.min(TAB.length - 1, i * 12)], b = TAB[Math.min(TAB.length - 1, i * 12 + 12)];
  const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1e-9, ux = dx / l, uy = dy / l;
  const out: Array<[number, number, number]> = [];
  const xa = Math.max(BX, Math.floor(Math.min(a.x, b.x) - 8)), xb = Math.min(BX + BW - 1, Math.ceil(Math.max(a.x, b.x) + 8));
  const ya = Math.max(BY, Math.floor(Math.min(a.y, b.y) - 8)), yb = Math.min(BY + BH - 1, Math.ceil(Math.max(a.y, b.y) + 8));
  for (let y = ya; y <= yb; y++) {
    let run = -1;
    for (let x = xa; x <= xb + 1; x++) {
      let inside = false;
      if (x <= xb) {
        const px = x + 0.5 - a.x, py = y + 0.5 - a.y, along = px * ux + py * uy, across = Math.abs(-px * uy + py * ux);
        inside = along >= 0 && along <= l && across <= 7;
      }
      if (inside && run < 0) run = x;
      if (!inside && run >= 0) { out.push([run, y, x - run]); run = -1; }
    }
  }
  stainCache.set(i, out);
  return out;
}

// ── the balls, cut as pixel art: five colours, five cuts of brightness (the prototype's disc, as a mask) ──────
const WHITE: RGB = [255, 255, 255], DARK: RGB = rgb(R.lcdDark);
function vivid(a: RGB, lb: number): RGB {
  const L = 0.3 * a[0] + 0.59 * a[1] + 0.11 * a[2], k = 1 + 0.55 * lb;
  return mixRGB(a.map((v) => Math.max(0, Math.min(255, Math.round(L + (v - L) * k)))) as RGB, WHITE, 0.05 + 0.16 * lb);
}
const SPR_S = 2 * BR + 4;
/** the base cut of colour k at brightness bucket b: S × S, null where empty */
const baseCache = new Map<string, Array<string | null>>();
function baseSprite(k: number, b: number): Array<string | null> {
  const key = `${k}|${b}`;
  const hit = baseCache.get(key);
  if (hit) return hit;
  const base = vivid(rgb(COL[k]), b / 4), hl = hexOf(mixRGB(base, WHITE, 0.5)), sh = hexOf(mixRGB(base, DARK, 0.28)), bs = hexOf(base), edge = hexOf(DARK), wh = hexOf(WHITE);
  const S = SPR_S, cc = S / 2 - 0.5, out: Array<string | null> = new Array(S * S).fill(null);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x - cc, dy = y - cc, r = Math.hypot(dx, dy);
    if (r <= BR + 0.2) { const dd = dx + dy; out[y * S + x] = r > BR - 1.1 ? edge : dd < -8 ? wh : dd < -3 ? hl : dd > 4.5 ? sh : bs; }
  }
  if (b >= 3) { for (let j = 2; j < 5; j++) out[j * S + 3] = wh; for (let i = 2; i < 5; i++) out[3 * S + i] = wh; }   // the glint
  baseCache.set(key, out);
  return out;
}
/** the cut drawn at w × w (nearest-neighbour, as drawImage with smoothing off), as runs */
const sprCache = new Map<string, Run[]>();
function sprite(k: number, b: number, w: number): Run[] {
  const key = `${k}|${b}|${w}`;
  const hit = sprCache.get(key);
  if (hit) return hit;
  const src = baseSprite(k, b), S = SPR_S;
  const runs = byColour(runsOf(w, w, (x, y) => src[Math.min(S - 1, Math.floor((y + 0.5) * S / w)) * S + Math.min(S - 1, Math.floor((x + 0.5) * S / w))]));
  sprCache.set(key, runs);
  return runs;
}

// ── sound: gentle, live, under the piece's one mute ─────────────────────────────────────────────────────────────
const MASTER = 0.5;
/** the phone's SOUND soft key: the game's own sounds only (memory only; wiped with the page) */
let phoneQuiet = false;
interface Tone { at?: number; v?: number; a?: number; type?: OscillatorType; to?: number }
const SND = (() => {
  let ac: AudioContext | null = null, master: GainNode | null = null, lastNote = -9, pad: GainNode[] | null = null, padOn = false;
  let lastPad = 0, dog: number | null = null;
  /** the piece's one mute (the menu's Sound row, the room's button), or the phone's own SOUND key */
  const muted = (): boolean => gameMenuBus.soundMuted?.() === true || phoneQuiet;
  function ctx(): AudioContext | null {
    if (!ac) {
      try {
        const Ctor: typeof AudioContext | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        ac = new Ctor();
        master = ac.createGain(); master.gain.value = muted() ? 0 : MASTER;
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.Q.value = 0.4; lp.connect(ac.destination); master.connect(lp);
        // a small room: a convolver on a noise tail (the prototype's)
        const conv = ac.createConvolver(), n = Math.floor(ac.sampleRate * 1.4), ir = ac.createBuffer(2, n, ac.sampleRate);
        for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6); }
        conv.buffer = ir; const wet = ac.createGain(); wet.gain.value = 0.45; conv.connect(wet); wet.connect(lp); master.connect(conv);
      } catch { ac = null; return null; }
    }
    if (ac.state === 'suspended') void ac.resume().catch(() => { /* needs a gesture; the next press tries again */ });
    return ac;
  }
  /** a mute that arrives mid-tone silences the tails (and the pad) too */
  function sync(): void { if (ac && master) master.gain.setTargetAtTime(muted() ? 0 : MASTER, ac.currentTime, 0.03); }
  function tone(f: number, dur: number, o: Tone = {}): void {
    if (muted()) { sync(); return; }
    const a = ctx(); if (!a || !master) return;
    sync();
    const t = a.currentTime + (o.at ?? 0);
    const osc = a.createOscillator(), g = a.createGain();
    osc.type = o.type ?? 'sine'; osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.v ?? 0.05, t + (o.a ?? 0.012)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(master); osc.start(t); osc.stop(t + dur + 0.05);
  }
  function note(f: number, v = 0.05, force = false): void {
    if (muted()) { sync(); return; }
    const a = ctx(); if (!a) return;
    if (!force && a.currentTime - lastNote < 0.09) return;
    lastNote = a.currentTime; tone(f, 1.0, { v }); tone(f * 2, 0.5, { v: v * 0.12, a: 0.03 });
  }
  function padOff(): void {
    if (!padOn || !ac || !pad) return;
    padOn = false;
    for (const g of pad) g.gain.setTargetAtTime(0, ac.currentTime, 0.08);
  }
  /** the low pad under play, rising as the chain nears FILE. It never creates the audio (no gesture in a tick);
   *  and if the ticks stop (the phone put down mid-run) a watchdog lets it fade */
  function setPad(share: number): void {
    lastPad = performance.now();
    if (!ac || !master) return;
    sync();
    if (!pad) pad = [131, 196].map((f) => { const o = ac!.createOscillator(), g = ac!.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.value = 0; o.connect(g); g.connect(master!); o.start(); return g; });
    padOn = true;
    pad[0].gain.setTargetAtTime(0.004 + 0.012 * share, ac.currentTime, 0.5); pad[1].gain.setTargetAtTime(0.003 + 0.009 * share, ac.currentTime, 0.5);
    if (dog === null) dog = window.setInterval(() => { if (performance.now() - lastPad > 300) { padOff(); if (dog !== null) { window.clearInterval(dog); dog = null; } } }, 250);
  }
  /** a sound that carries meaning names itself for the caption strip — only when it is heard */
  function cue(name: string): void { if (ac && !muted()) announceCue(name); }
  return { tone, note, setPad, padOff, cue, unlock: ctx, muted };
})();
const SCALE = [392, 440, 494, 587, 659, 784, 880, 988];
const PENT = [392, 440, 523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760];
const sfx = {
  fire(): void { SND.tone(300, 0.08, { to: 520, v: 0.018 }); },
  land(): void { SND.tone(190, 0.1, { to: 150, v: 0.03, a: 0.006 }); SND.tone(380, 0.05, { v: 0.008 }); },
  swap(): void { SND.tone(520, 0.05, { v: 0.012 }); SND.tone(660, 0.05, { v: 0.01, at: 0.04 }); },
  lose(): void { SND.tone(247, 0.2, { to: 190, v: 0.012, a: 0.03 }); },
  burst(n: number, chain: number): void { const i = Math.min(2 + n + chain, 7); SND.note(SCALE[i], 0.045, true); SND.tone(SCALE[Math.max(0, i - 2)], 0.6, { v: 0.02, at: 0.06 }); SND.tone(SCALE[Math.max(0, i - 4)], 0.7, { v: 0.015, at: 0.12 }); },
  close(): void { SND.tone(700, 0.05, { v: 0.008 }); },
  letterGo(): void { SND.tone(880, 0.25, { to: 1320, v: 0.012, a: 0.02 }); },
  letterIn(i: number): void { const f = PENT[i % PENT.length]; SND.tone(f, 0.9, { v: 0.036, a: 0.01 }); SND.tone(f * 2, 0.5, { v: 0.008, a: 0.02 }); SND.tone(f / 2, 1.1, { v: 0.012, at: 0.03, a: 0.04 }); SND.cue('clear_letter'); },
  start(): void { [294, 392, 494].forEach((f, i) => SND.tone(f, 0.9, { at: i * 0.16, v: 0.04, a: 0.06 })); },
  partner(): void { SND.tone(659, 0.8, { v: 0.026, a: 0.03 }); SND.tone(523, 1.0, { v: 0.026, a: 0.03, at: 0.18 }); },
  done(): void { [392, 494, 587, 784].forEach((f, i) => SND.tone(f, 2.6, { v: 0.04, a: 0.3, at: i * 0.12 })); SND.cue('clear_whole'); },
  end(): void { [392, 494, 587].forEach((f, i) => SND.tone(f, 2.2, { v: 0.03, a: 0.3, at: i * 0.1 })); },
  pause(): void { SND.tone(520, 0.05, { v: 0.012 }); }
};

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────────
interface Bead { id: number; s: number; k: number; ch: string; sep: boolean; lum: number; born: number; ox: number; oy: number; junction: boolean; peel: number; mine?: boolean }
interface Shot { x: number; y: number; vx: number; vy: number; k: number; dead?: boolean }
interface Flight { ch: string; x0: number; y0: number; slot: number; t: number; dur: number; done?: boolean }
interface Faller { ch: string; x: number; y: number; vx: number; vy: number; t: number }
interface Bit { x: number; y: number; vx: number; vy: number; life: number; col: string }
interface Float { x: number; y: number; t: number; s: string; col: string; big?: boolean }
interface Ring { x: number; y: number; t: number }
interface Slot { ch: string; st: number; flash: number }   // st: 0 empty, 1 a letter on its way, 2 in place, 3 a gap
type Mode = 'title' | 'play' | 'wave' | 'finish' | 'end';
const SLOT_P = 13, SLOT_W = 10, SLOT_H = 14;   // v8: a slot holds one 5×7 letter at 2×
const slotX = (i: number): number => { const tw = SENTENCE.length * SLOT_P - (SLOT_P - SLOT_W); return BX + Math.round((BW - tw) / 2) + i * SLOT_P; };
const slotText = (g: Painter, ch: string, x: number, y: number, col: string): void => T(g, ch, x + Math.round((SLOT_W - textW(ch, 2)) / 2), y, col, 2);
const mmss = (s: number): string => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const reducedMotion = ((): boolean => { try { return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } })();
/** the soft keys on the glass (the prototype's hit rects) */
const KEY_PAUSE = { x: 8, y: 292, w: 70, h: 26 }, KEY_SWAP = { x: 90, y: 292, w: 60, h: 26 }, KEY_SOUND = { x: 162, y: 292, w: 70, h: 26 };
const inside = (r: { x: number; y: number; w: number; h: number }, x: number, y: number): boolean => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

export class Clear implements DeviceGame {
  readonly w = W; readonly h = H;
  private seed = 2003;
  private id = 0;
  private mode: Mode = 'title';
  private clock = 0;
  /** the clock that stops while paused (the rings' pulse, the glints, the meter's flicker) */
  private pclock = 0;
  private tLeft = SESSION; private paused = false; private endT = 0; private sessions = 0; private brightBase = 0;
  private waveT = 0; private finT = 0; private readI = -1;
  private beads: Bead[] = []; private shots: Shot[] = []; private flights: Flight[] = []; private fallers: Faller[] = [];
  private bits: Bit[] = []; private floats: Float[] = []; private rings: Ring[] = [];
  private aim = -Math.PI / 2; private elapsed = 0; private cd = 0; private cur = 0; private nxt = 1;
  private score = 0; private cleared = 0; private clearedAll = 0; private combo = 0; private comboT = 0; private chainMax = 0;
  private endWhy = '';
  private msg = { text: D.partner.first, t: 0, ring: 0 };
  private said = new Set<string>();
  private feedQ: Array<{ ch: string; sep: boolean }> = [];
  private recent: string[][] = [];
  private slots: Slot[] = [];
  private flashFx = 0;
  private supplyT = -99;
  /** what the groove remembers: the colour broken on each 12 px of it (this phone's session only, in memory) */
  private readonly stainS: Array<{ k: number; n: number } | null>;
  private filing: string | null = null;
  private filed = false;

  constructor() {
    this.stainS = new Array(Math.ceil(geom().plen / 12) + 2).fill(null);
    this.makeSlots();
  }

  private rnd(): number { this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff; return this.seed / 0x7fffffff; }
  private get S_END(): number { return geom().plen - 6; }
  private bright(): number { return Math.min(1, this.brightBase + this.cleared / 70); }
  private pct(): number { return Math.min(99, Math.round(99 * (1 - Math.exp(-this.cleared / K_METER)))); }
  private nFilled(): number { return this.slots.filter((s) => s.st === 2).length; }
  private needCount(ch: string): number { return this.slots.reduce((n, s) => n + (s.ch === ch && s.st === 0 ? 1 : 0), 0); }
  private ncolours(): number { return this.elapsed < 25 ? 4 : NCOL; }
  private makeSlots(): void { this.slots = [...SENTENCE].map((ch) => ({ ch, st: ch === ' ' ? 3 : 0, flash: 0 })); }
  private say(s: string): void { this.msg = { text: s, t: 0, ring: 1.1 }; sfx.partner(); }
  private speed(): number { return V0 + (V1 - V0) * Math.min(1, this.elapsed / SESSION); }

  // ── the feed: the programme's own vocabulary, chosen so the sentence can always be finished ────────────────────
  private onBeltCount(ch: string): number { let n = 0; for (const b of this.beads) if (b.ch === ch) n++; for (const x of this.feedQ) if (x.ch === ch) n++; return n; }
  private pickUnit(): string[] {
    const need: Record<string, number> = {};
    for (const s of this.slots) if (s.st === 0) need[s.ch] = (need[s.ch] || 0) + 1;
    for (const ch in need) need[ch] = Math.max(0, need[ch] - this.onBeltCount(ch));
    let best: string[] = UNITS[0], bestScore = -1;
    for (let k = 0; k < 4; k++) {
      let u = UNITS[Math.floor(this.rnd() * UNITS.length)], guard = 0;
      while (this.recent.includes(u) && guard++ < 12) u = UNITS[Math.floor(this.rnd() * UNITS.length)];
      const left = { ...need }; let sc = 0;
      for (const w of u) for (const ch of w) if (left[ch] > 0) { left[ch]--; sc++; }
      sc += this.rnd() * 0.5;
      if (sc > bestScore) { bestScore = sc; best = u; }
    }
    // a letter the sentence still lacks and that is neither on the belt nor on its way is always sent for
    for (const ch in need) if (need[ch] > 0) {
      const have = UNITS.filter((u) => u.some((w) => w.includes(ch)) && !this.recent.slice(-2).includes(u));
      if (have.length && !best.some((w) => w.includes(ch))) { best = have[Math.floor(this.rnd() * have.length)]; break; }
    }
    this.recent.push(best); if (this.recent.length > 6) this.recent.shift();
    return best;
  }
  /** if the sentence lacks a letter that is neither on the belt nor on its way, the unit that has it goes to the front (at most once every 7 s) */
  private ensureSupply(): void {
    if (this.elapsed - this.supplyT < 7) return;
    const need: Record<string, number> = {};
    for (const s of this.slots) if (s.st === 0) need[s.ch] = (need[s.ch] || 0) + 1;
    for (const ch in need) {
      if (this.onBeltCount(ch) + this.flights.filter((f) => f.ch === ch).length >= need[ch]) continue;
      const have = UNITS.filter((u) => u.some((w) => w.includes(ch)));
      if (!have.length) continue;
      const u = have[Math.floor(this.rnd() * have.length)], qq: Array<{ ch: string; sep: boolean }> = [];
      for (const w of u) { for (let i = w.length - 1; i >= 0; i--) qq.push({ ch: w[i], sep: false }); qq.push({ ch: '', sep: true }); }
      this.feedQ.unshift(...qq); this.supplyT = this.elapsed;
      return;
    }
  }
  private refillQ(): void { const u = this.pickUnit(); for (const w of u) { for (let i = w.length - 1; i >= 0; i--) this.feedQ.push({ ch: w[i], sep: false }); this.feedQ.push({ ch: '', sep: true }); } }
  private colourOnBelt(): number[] { const have: number[] = []; for (const b of this.beads) if (b.s > 4 && !have.includes(b.k)) have.push(b.k); return have; }
  private randK(prev?: number, prev2?: number): number {
    const nc = this.ncolours(); let k: number, g = 0;
    do { k = Math.floor(this.rnd() * nc); g++; } while (g < 20 && prev === prev2 && k === prev && prev !== undefined);
    return k;
  }
  private newBead(s: number, lum?: number): Bead {
    if (!this.feedQ.length) this.refillQ();
    if (this.mode === 'play') this.ensureSupply();
    const x = this.feedQ.shift()!, n = this.beads.length;
    const k = this.randK(n ? this.beads[n - 1].k : undefined, n > 1 ? this.beads[n - 2].k : undefined);
    return { id: ++this.id, s, k, ch: x.ch, sep: x.sep, lum: lum ?? this.brightBase, born: 0, ox: 0, oy: 0, junction: false, peel: 0 };
  }
  private pickColour(): number { const have = this.colourOnBelt(); return have.length ? have[Math.floor(this.rnd() * have.length)] : Math.floor(this.rnd() * this.ncolours()); }
  private start(): void {
    this.sessions++; this.mode = 'play'; this.tLeft = SESSION; this.paused = false; this.score = 0; this.cleared = 0; this.combo = 0; this.chainMax = 0;
    this.elapsed = 0; this.endWhy = ''; this.cd = 0; this.waveT = 0; this.finT = 0; this.readI = -1;
    this.shots = []; this.flights = []; this.fallers = []; this.bits = []; this.floats = []; this.rings = []; this.said = new Set();
    this.brightBase = Math.min(0.4, (this.sessions - 1) * 0.1); this.aim = -Math.PI / 2; this.feedQ = []; this.recent = []; this.supplyT = -99; this.makeSlots();
    this.beads = [];
    for (let i = 0; i < 10; i++) this.beads.push(this.newBead(LEAD + 70 - i * DS, this.brightBase));
    this.cur = this.pickColour(); this.nxt = this.pickColour(); sfx.start();
    this.say(this.sessions === 1 ? D.partner.first : D.partner.again);
  }

  // ── the rules ─────────────────────────────────────────────────────────────────────────────────────────────
  private touching(a: number, b: number): boolean { return this.beads[a].s - this.beads[b].s <= DS * 1.5; }
  private runAt(i: number): [number, number] {
    const B = this.beads, k = B[i].k; let lo = i, hi = i;
    while (lo > 0 && B[lo - 1].k === k && this.touching(lo - 1, lo)) lo--;
    while (hi < B.length - 1 && B[hi + 1].k === k && this.touching(hi, hi + 1)) hi++;
    return [lo, hi];
  }
  /** the first ball a ball fired at this angle would touch */
  private trace(ang: number): { hit: number | null; d: number; x: number; y: number } {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    for (let d = 24; d < 260; d += 2) {
      const x = CX + dx * d, y = CY + dy * d;
      if (x < BX - 4 || x > BX + BW + 4 || y < BY - 4 || y > BY + BH + 4) return { hit: null, d, x, y };
      let best: number | null = null, bd = 1e9;
      for (let i = 0; i < this.beads.length; i++) { const b = this.beads[i]; if (b.s < 4) continue; const p = posAt(b.s), dd = Math.hypot(p.x - x, p.y - y); if (dd < HITR && dd < bd) { bd = dd; best = i; } }
      if (best !== null) return { hit: best, d, x, y };
    }
    return { hit: null, d: 260, x: CX + dx * 260, y: CY + dy * 260 };
  }
  private insertIndex(i: number, x: number, y: number): number { const p = posAt(this.beads[i].s), t = tangAt(this.beads[i].s); return (x - p.x) * t.x + (y - p.y) * t.y > 0 ? i : i + 1; }
  private land(sh: Shot, i: number): void {
    const j = this.insertIndex(i, sh.x, sh.y), sNew = j === 0 ? this.beads[0].s + DS : this.beads[j - 1].s - DS;
    const b: Bead = { id: ++this.id, s: sNew, k: sh.k, ch: '', sep: false, lum: Math.min(1, this.bright() + 0.2), born: 0.0001, ox: 0, oy: 0, junction: false, peel: 0, mine: true };
    const p = posAt(sNew); b.ox = sh.x - p.x; b.oy = sh.y - p.y; this.beads.splice(j, 0, b); sfx.land();
    const [lo, hi] = this.runAt(j);
    if (hi - lo + 1 >= 3) this.pop(lo, hi, 0, true); else this.combo = 0;
  }
  /** a break: the balls go; their letters are let go — one the sentence still needs flies to the tray, any other falls */
  private pop(lo: number, hi: number, reaction: number, byShot: boolean): void {
    const run = this.beads.splice(lo, hi - lo + 1), n = run.length;
    if (lo > 0 && lo < this.beads.length) this.beads[lo].junction = true;
    if (byShot) this.combo = this.comboT > 0 ? this.combo + 1 : 1;
    this.comboT = 2.6; this.chainMax = Math.max(this.chainMax, reaction);
    let gained = 0;
    for (const b of run) {
      const p = posAt(b.s);
      for (let i = 0; i < 6; i++) this.bits.push({ x: p.x + (i % 3 - 1) * 3, y: p.y + (Math.floor(i / 3) - 0.5) * 5, vx: (Math.random() - 0.5) * 110, vy: -30 - Math.random() * 90, life: 0.55, col: COL[b.k] });
      this.rings.push({ x: p.x, y: p.y, t: 0 });
      const bi = Math.min(this.stainS.length - 1, Math.floor(b.s / 12));
      if (bi >= 0 && b.s > 0) this.stainS[bi] = { k: b.k, n: Math.min(9, (this.stainS[bi]?.n ?? 0) + 1) };
      if (b.ch && b.ch !== ' ') {
        const si = this.slots.findIndex((s) => s.ch === b.ch && s.st === 0);
        if (si >= 0) { this.slots[si].st = 1; this.flights.push({ ch: b.ch, x0: p.x + b.ox, y0: p.y + b.oy, slot: si, t: 0, dur: 0.85 + 0.05 * (this.flights.length % 3) }); gained++; sfx.letterGo(); }
        else this.fallers.push({ ch: b.ch, x: p.x, y: p.y, vx: (Math.random() - 0.5) * 26, vy: -26 - Math.random() * 20, t: 0 });
      }
    }
    this.cleared += n; this.clearedAll += n;
    const pts = (n * 10 + (n - 3) * 10) * (1 + reaction) + 30 * Math.max(0, this.combo - 1) + 40 * gained;
    this.score += pts;
    const mid = run[Math.floor(n / 2)], p = posAt(mid.s);
    this.floats.push({ x: p.x, y: p.y - 8, t: 0, s: '+' + pts, col: R.halo });
    this.floats = this.floats.filter((f) => !f.big);
    if (reaction >= 1) this.floats.push({ x: CX, y: CY + 36, t: 0, s: D.float.chain + (reaction + 1), col: R.white, big: true });
    else if (this.combo >= 2) this.floats.push({ x: CX, y: CY + 36, t: 0, s: D.float.combo + this.combo, col: R.white, big: true });
    sfx.burst(Math.min(5, n - 3 + this.combo), reaction);
    if (!this.said.has('first')) { this.said.add('first'); this.say(D.partner.nice); }
    const MSGS: Array<[number, string]> = [[50, D.partner.half], [80, D.partner.almost], [95, D.partner.close], [99, D.partner.cap]];
    for (const [at, s] of MSGS) if (!this.said.has(s) && this.pct() >= at) { this.said.add(s); this.say(s); break; }
  }
  private fire(tx?: number, ty?: number): boolean {
    if (this.mode !== 'play' || this.paused) return false;
    if (tx !== undefined && ty !== undefined) this.aim = Math.atan2(ty - CY, tx - CX);
    if (this.cd > 0) return false;
    this.cd = COOL; sfx.fire();
    this.shots.push({ x: CX + Math.cos(this.aim) * 26, y: CY + Math.sin(this.aim) * 26, vx: Math.cos(this.aim) * SHOT_V, vy: Math.sin(this.aim) * SHOT_V, k: this.cur });
    this.cur = this.nxt; this.nxt = this.pickColour();
    return true;
  }
  private swap(): void { if (this.mode !== 'play' || this.paused) return; const t = this.cur; this.cur = this.nxt; this.nxt = t; sfx.swap(); }
  private togglePause(): void { if (this.mode !== 'play') return; this.paused = !this.paused; sfx.pause(); }

  private chainStep(dt: number): void {
    const B = this.beads, v = this.speed(), n = B.length;
    let anyGap = false;
    for (let i = 1; i < n; i++) if (B[i].s < B[i - 1].s - DS - 0.4) { anyGap = true; break; }
    if (n) B[0].s += (anyGap ? 0 : v) * dt;
    const closeV = Math.max(70, 5 * v), closed: Bead[] = [];
    for (let i = 1; i < n; i++) {
      const b = B[i], tgt = B[i - 1].s - DS;
      if (b.s < tgt - 0.001) { b.s = Math.min(tgt, b.s + closeV * dt); if (b.junction && b.s >= tgt - 0.01) closed.push(b); }
      else if (b.s > tgt + 0.001) b.s = Math.max(tgt, b.s - 170 * dt);
    }
    for (const b of B) { if (b.junction && !closed.includes(b)) { const i = B.indexOf(b); if (i <= 0 || b.s >= B[i - 1].s - DS - 0.01) closed.push(b); } }
    // a gap that has closed: if the two sides now touch in one colour, they go too (a chain reaction)
    for (const b of closed) {
      b.junction = false; const i = B.indexOf(b);
      if (i > 0 && B[i - 1].k === b.k) { const [lo, hi] = this.runAt(i); if (hi - lo + 1 >= 3) { this.pop(lo, hi, 1 + Math.min(4, this.chainMax), false); sfx.close(); break; } }
    }
    // fed without end, at the entrance, one ball at a time
    const last = this.beads[this.beads.length - 1];
    if (!last || last.s >= DS - 0.01) { const b = this.newBead(0, Math.min(1, this.bright() + 0.28)); b.born = 0.0001; this.beads.push(b); }
  }

  private beginWave(): void { this.mode = 'wave'; this.waveT = 0.3; this.shots = []; SND.padOff(); }
  private beginFinish(bySentence: boolean): void {
    this.mode = 'finish'; this.finT = 0; this.readI = -1; this.shots = []; SND.padOff();
    if (bySentence) this.say(D.partner.whole);
    this.flashFx = reducedMotion ? 0 : 0.4; sfx.done();
  }

  // ── the turn of the clock ─────────────────────────────────────────────────────────────────────────────────
  tick(dt0: number): void {
    let rem = Math.max(0, Math.min(0.1, dt0));
    while (rem > 1e-6) { const h = Math.min(1 / 60, rem); this.step(h); rem -= h; }
  }
  private step(dt: number): void {
    this.clock += dt; if (!this.paused) this.pclock += dt;
    this.rings = this.rings.filter((r) => (r.t += dt) < 0.7);
    if (this.msg.ring > 0) this.msg.ring -= dt;
    this.msg.t += dt;
    if (this.flashFx > 0) this.flashFx -= dt;
    for (const f of this.floats) f.t += dt;
    this.floats = this.floats.filter((f) => f.t < 1.1);
    for (const b of this.bits) { b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 420 * dt; }
    this.bits = this.bits.filter((b) => b.life > 0);
    for (const f of this.fallers) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 90 * dt; }
    this.fallers = this.fallers.filter((f) => f.t < 1.3);
    for (const s of this.slots) if (s.flash > 0) s.flash = Math.max(0, s.flash - dt);
    if (this.mode === 'title') return;
    if (this.mode !== 'play') SND.padOff();
    if (this.paused) { SND.padOff(); return; }
    // letters in flight (they land in every mode)
    for (const f of this.flights) {
      f.t += dt;
      if (f.t >= f.dur && !f.done) {
        f.done = true; this.slots[f.slot].st = 2; this.slots[f.slot].flash = 0.7; sfx.letterIn(this.nFilled() - 1); this.score += 25;
        if (!this.said.has('letter')) { this.said.add('letter'); this.say(D.partner.letter); }
      }
    }
    this.flights = this.flights.filter((f) => !f.done);
    if (this.mode === 'end') { this.endT += dt; return; }
    for (const b of this.beads) {
      if (b.born > 0) { b.born += dt; if (b.born > 1.6) b.born = 0; }
      b.lum += (this.bright() - b.lum) * Math.min(1, dt * 0.9);
      const k = Math.min(1, dt * 14); b.ox -= b.ox * k; b.oy -= b.oy * k;
    }
    if (this.mode === 'play') {
      this.tLeft = Math.max(0, this.tLeft - dt); this.elapsed += dt; this.comboT -= dt;
      if (this.comboT <= 0) { this.combo = 0; this.chainMax = 0; }
      this.cd = Math.max(0, this.cd - dt);
      this.chainStep(dt);
      for (const sh of this.shots) {
        const stepN = Math.ceil(Math.hypot(sh.vx, sh.vy) * dt / 3), hx = sh.vx * dt / stepN, hy = sh.vy * dt / stepN;
        for (let qn = 0; qn < stepN && !sh.dead; qn++) {
          sh.x += hx; sh.y += hy;
          let best = -1, bd = 1e9;
          for (let i = 0; i < this.beads.length; i++) { const b = this.beads[i]; if (b.s < 4) continue; const p = posAt(b.s), dd = Math.hypot(p.x - sh.x, p.y - sh.y); if (dd < HITR && dd < bd) { bd = dd; best = i; } }
          if (best >= 0) { sh.dead = true; this.land(sh, best); }
          else if (sh.x < BX - 8 || sh.x > BX + BW + 8 || sh.y < BY - 8 || sh.y > BY + BH + 8) { sh.dead = true; sfx.lose(); }
        }
      }
      this.shots = this.shots.filter((s) => !s.dead);
      SND.setPad(this.beads.length ? Math.max(0, Math.min(1, this.beads[0].s / this.S_END)) : 0);
      if (this.slots.every((s) => s.st === 2 || s.st === 3)) { this.endWhy = D.end.session; this.beginFinish(true); }
      else if (this.beads.length && this.beads[0].s >= this.S_END) { this.endWhy = D.end.full; this.say(D.partner.full); this.beginWave(); }
      else if (this.tLeft <= 0) { this.endWhy = D.end.time; this.beginWave(); }
    } else if (this.mode === 'wave') {                          // the labels give up: each peels off a ball and lets go a letter the sentence still lacks
      this.waveT += dt;
      const open = this.slots.map((s, i) => [s, i] as [Slot, number]).filter(([s]) => s.st === 0);
      if (open.length && this.waveT > 0.35) {
        const [s, si] = open[0]; this.waveT = 0.15; s.st = 1;
        const cand = this.beads.filter((b) => b.s > 4), src = cand[Math.floor(this.rnd() * cand.length)];
        const p = src ? posAt(src.s) : { x: CX, y: CY };
        if (src) { src.ch = ''; src.peel = 1; src.sep = false; }
        this.flights.push({ ch: s.ch, x0: p.x, y0: p.y, slot: si, t: 0, dur: 0.85 }); sfx.letterGo(); this.rings.push({ x: p.x, y: p.y, t: 0 });
      }
      if (!open.length && !this.flights.length) this.beginFinish(false);
    } else if (this.mode === 'finish') {
      this.finT += dt;
      const ri = Math.floor(this.finT / 0.11) - 2;
      if (ri !== this.readI && ri >= 0 && ri < this.slots.length) { this.readI = ri; if (this.slots[ri].ch !== ' ') { this.slots[ri].flash = 0.5; SND.note(PENT[(ri % 8) + 2], 0.02, true); } }
      const pe = this.beads.filter((b) => b.ch || b.sep);
      if (pe.length && Math.floor(this.finT / 0.05) > Math.floor((this.finT - dt) / 0.05)) {
        const b = pe[0]; b.ch = ''; b.sep = false; b.peel = 1; b.lum = 1; b.born = 0.0001; const p = posAt(b.s); this.rings.push({ x: p.x, y: p.y, t: 0 });
      }
      for (const b of this.beads) if (b.peel > 0) b.peel = Math.max(0, b.peel - dt * 2);
      if (this.finT > 1.4 + this.slots.length * 0.11) {
        this.mode = 'end'; this.endT = 0; sfx.end();
        if (!this.filed) { this.filed = true; this.filing = D.filing; }
      }
    }
  }

  takeFiling(): string | null { const f = this.filing; this.filing = null; return f; }

  // ── input ─────────────────────────────────────────────────────────────────────────────────────────────────
  private press(): void { if (this.mode === 'title') this.start(); else if (this.mode === 'end' && this.endT > 0.8) this.start(); }
  key(k: GameKey): void {
    SND.unlock();
    if (this.mode === 'title' || this.mode === 'end') { this.press(); return; }
    if (this.mode !== 'play') return;
    if (k === 'start') { this.togglePause(); return; }
    if (this.paused) return;
    if (k === 'left' || k === 'right') this.aim += (k === 'left' ? -1 : 1) * TURN_STEP;
    else if (k === 'a') this.fire();
    else this.swap();                                          // B, UP and DOWN (the prototype's swap keys)
  }
  /** a tap on the glass, in screen pixels: the soft keys, then — on the cards — start; in play the gun swaps and
   *  the board aims at the tap and fires; paused, a tap on the board resumes */
  tap(x: number, y: number): void {
    SND.unlock();
    if (this.mode !== 'title') {
      if (inside(KEY_PAUSE, x, y)) { this.togglePause(); return; }
      if (inside(KEY_SOUND, x, y)) { phoneQuiet = !phoneQuiet; return; }
      if (inside(KEY_SWAP, x, y)) { this.swap(); return; }
    }
    if (this.mode !== 'play') { this.press(); return; }
    if (this.paused) { if (y >= BY && y < BY + BH) this.togglePause(); return; }
    if (Math.hypot(x - CX, y - CY) < 14) { this.swap(); return; }
    if (y >= BY - 4 && y < BY + BH + 4) this.fire(x, y);
  }

  /** what the screen shows now: while anything moves, the clock (30 a second); at rest, exactly what is visible */
  frameKey(): string {
    const m = SND.muted() ? 1 : 0;
    const busy = this.mode === 'title' || this.mode === 'wave' || this.mode === 'finish' || (this.mode === 'play' && !this.paused)
      || this.flights.length > 0 || this.fallers.length > 0 || this.bits.length > 0 || this.rings.length > 0 || this.floats.length > 0
      || this.flashFx > 0 || this.msg.t < 0.4 || this.msg.ring > 0 || this.slots.some((s) => s.flash > 0);
    if (busy) return `${this.mode}|${Math.floor(this.clock * 30)}|${m}`;
    if (this.mode === 'end') return `end|${Math.floor(this.clock * 3)}|${Math.floor(this.pclock * 3)}|${Math.floor(this.clock * 2) % 2}|${this.endT > 0.8 ? 1 : 0}|${m}`;
    return `${this.mode}|${this.paused ? 1 : 0}|${m}|${this.score}|${Math.ceil(this.tLeft)}`;
  }

  // ── drawing ───────────────────────────────────────────────────────────────────────────────────────────────
  draw(g: Painter): void {
    P(g, 0, 0, R.lcd, W, H);
    const blink = Math.floor(this.clock * 2) % 2 === 0;
    if (this.mode === 'title') { this.drawTitle(g, blink); return; }
    this.header(g); this.board(g); this.footer(g);
    if (this.paused) { P(g, BX, BY + 80, R.lcdDark, BW, 40); CT(g, D.paused, BY + 90, R.lcd, 3, BX, BW); }
    if (this.flashFx > 0) {                                     // the white flash (alpha ≤ 0.35): a scanline dither
      const every = this.flashFx > 0.2 ? 2 : 4;
      for (let y = BY; y < BY + BH; y += every) P(g, BX, y, R.white, BW, 1);
    }
    if (this.mode === 'end') {
      P(g, BX + 8, BY + 24, R.lcdDark, BW - 16, 100); P(g, BX + 10, BY + 26, R.frame, BW - 20, 96); P(g, BX + 12, BY + 28, R.lcdDark, BW - 24, 92);
      CT(g, this.endWhy || D.end.session, BY + 32, R.lcd, 2, BX, BW);
      const row = (label: string, val: string, y: number, col: string): void => { T(g, label, BX + 24, y + 4, R.lcdMid); T(g, val, BX + BW - 24 - textW(val, 2), y, col, 2); };
      row(D.end.score, String(this.score).padStart(5, '0'), BY + 50, R.halo);
      row(D.end.clear, this.pct() + '%', BY + 68, R.green);
      row(D.end.broken, String(this.cleared).padStart(3, '0'), BY + 86, R.white);
      CT(g, D.end.line, BY + 101, R.lcd, 1, BX, BW);
      if (blink && this.endT > 0.8) CT(g, D.end.again, BY + 110, R.lcdMid, 1, BX, BW);
    }
  }

  private header(g: Painter): void {
    P(g, 0, 0, R.lcdDark, W, 17); lamb(g, 5, 3);
    T(g, D.hud.label, 24, 5, R.lcd);
    T(g, String(this.score).padStart(5, '0'), 76, 2, R.halo, 2);
    const tt = mmss(this.tLeft); T(g, tt, W - 8 - textW(tt, 2), 2, R.lcdMid, 2);
    this.tray(g);
    const p = this.pct();
    T(g, D.hud.meter, 8, 48, R.lcdMid); T(g, String(p).padStart(2, '0') + '%', 41, 48, R.green);
    const bx = 60, bw = W - 8 - bx;
    P(g, bx - 1, 47, R.lcdMid, bw + 2, 9); P(g, bx, 48, R.frame, bw, 7); P(g, bx, 48, R.green, Math.round(bw * p / 100), 7); P(g, bx + Math.round(bw * 0.99), 45, R.halo, 1, 12);
    if (p >= 99 && Math.floor(this.pclock * 3) % 2 === 0) P(g, bx + Math.round(bw * 0.99) - 2, 48, R.white, 2, 7);
  }
  /** the tray: the sentence under the labels, one slot to a letter */
  private tray(g: Painter): void {
    P(g, BX - 2, 19, R.lcdDark, BW + 4, 25); P(g, BX, 21, R.lcdMid, BW, 21); P(g, BX + 1, 22, R.frame, BW - 2, 19);
    if (this.slots.every((s) => s.st === 2 || s.st === 3)) {   // the whole sentence: the tray glows (halo at 0.08–0.28 over the frame, in steps)
      const a = 0.18 + 0.1 * Math.sin((Math.floor(this.clock * 3) / 3) * 4);
      P(g, BX + 1, 22, mix(R.frame, R.halo, q(a, 10)), BW - 2, 19);
    }
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i]; if (s.ch === ' ') continue;
      const x = slotX(i), y = 24;
      if (s.st === 2) {
        const fl = s.flash > 0 ? Math.min(1, s.flash / 0.5) : 0, wa = s.flash > 0 ? q(Math.min(0.5, s.flash), 10) : 0;   // the white flash over a letter that just landed
        P(g, x - 1, y - 1, mix(R.lcdDark, R.white, wa), SLOT_W + 2, SLOT_H + 2);
        P(g, x, y, mix(R.lcdMid, R.white, wa), SLOT_W, SLOT_H);
        slotText(g, s.ch, x, y, mix(fl > 0.5 ? R.white : R.halo, R.white, wa));
      } else {
        P(g, x - 1, y - 1, R.lcdDark, SLOT_W + 2, SLOT_H + 2);
        P(g, x, y, R.lcdDark, SLOT_W, SLOT_H); P(g, x, y + SLOT_H - 2, R.lcdMid, SLOT_W, 2);
        if (s.st === 1) P(g, x + 4, y + 5, mix(R.lcdDark, R.halo, q(0.5 + 0.4 * Math.sin(this.pclock * 9), 5)), 2, 2);
      }
    }
    for (const f of this.flights) {
      const k = Math.min(1, f.t / f.dur); if (k * 8 < 0.5) continue;   // (the prototype faded it in over its first eighth)
      const e = k * k * (3 - 2 * k), tx = slotX(f.slot) + SLOT_W / 2, ty = 24 + SLOT_H / 2;
      const x = f.x0 + (tx - f.x0) * e, y = f.y0 + (ty - f.y0) * e - Math.sin(k * Math.PI) * 26;
      P(g, x - 7, y - 9, R.lcdDark, 15, 19); P(g, x - 6, y - 8, R.halo, 13, 17); glyph(g, f.ch, x + 0.5, y + 0.5, R.lcdDark, 2);
    }
  }
  private groove(c: Painter): void {
    const G = geom();
    paintRuns(c, G.groove, 0, 0);
    for (let i = 0; i < this.stainS.length; i++) {
      const s = this.stainS[i]; if (!s) continue;
      c.fillStyle = mix(R.lcdMid, COL[s.k], Math.min(0.55, 0.14 + 0.06 * s.n));
      for (const [x, y, w] of stainBand(i)) c.fillRect(x, y, w, 1);
    }
    const e = G.tab[G.tab.length - 1];
    P(c, e.x - 10, e.y - 2, R.lcdDark, 20, 4); T(c, D.hud.file, e.x - Math.round(textW(D.hud.file) / 2), e.y + 4, R.lcd);
  }
  private drawBead(c: Painter, b: Bead): void {
    const p = posAt(b.s); if (b.s < -9) return;
    const x = p.x + b.ox, y = p.y + b.oy;
    const bk = Math.round(Math.max(0, Math.min(1, b.lum)) * 4);
    let sc = 1; if (b.born > 0) sc = 1 + 0.14 * Math.sin(Math.min(1, b.born / 0.5) * Math.PI);
    const w = Math.round(SPR_S * sc), ox = Math.round(x - w / 2), oy = Math.round(y - w / 2);
    paintRuns(c, sprite(b.k, bk, w), ox, oy);
    if (b.ch) glyph(c, b.ch, x + 0.5, y + 0.5, R.lcdDark, 1); else if (b.sep) P(c, x - 1, y - 1, R.lcdDark, 2, 2);
    if (b.lum > 0.55 && Math.floor((this.pclock * 3 + b.id) % 4) === 0) P(c, x - 5, y - 5, R.white, 2, 2);
    if (b.ch && this.mode === 'play' && this.needCount(b.ch) > 0) {   // the gold ring: this letter is still wanted (it pulses: two steps)
      const a = 0.55 + 0.45 * Math.sin(this.pclock * 6 + b.id), col = a > 0.6 ? R.halo : mix(R.lcdMid, R.halo, 0.55);
      const cx = ox + w / 2, cy = oy + w / 2;
      c.fillStyle = col; for (const [dx, dy] of ringPts(BR + 1, BR + 1.8)) c.fillRect(Math.round(cx) + dx, Math.round(cy) + dy, 1, 1);
    }
    if (b.peel > 0.5) P(c, x - 6, y - 3, R.lcd, 12, 6);       // the label peeling (alpha 1 → 0): solid, then a checker
    else if (b.peel > 0.2) { const X = Math.round(x - 6), Y = Math.round(y - 3); c.fillStyle = R.lcd; for (let j = 0; j < 6; j++) for (let i = (j & 1); i < 12; i += 2) c.fillRect(X + i, Y + j, 1, 1); }
  }
  private ballAt(c: Painter, x: number, y: number, k: number, sc = 1): void {
    const w = Math.round(SPR_S * sc); paintRuns(c, sprite(k, Math.round(this.bright() * 4), w), Math.round(x - w / 2), Math.round(y - w / 2));
  }
  /** the gun's barrel: three rects in its own turning frame, rasterised */
  private barrel(c: Painter): void {
    const ca = Math.cos(this.aim), sa = Math.sin(this.aim);
    for (let Y = CY - 25; Y < CY + 25; Y++) {
      let runX = 0, runC: string | null = null;
      for (let X = CX - 25; X <= CX + 25; X++) {
        let col: string | null = null;
        if (X < CX + 25) {
          const dx = X + 0.5 - CX, dy = Y + 0.5 - CY, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
          if (u >= 19 && u < 22 && v >= -5 && v < 5) col = R.halo;
          else if (u >= 8 && u < 21 && v >= -3 && v < 3) col = R.frame;
          else if (u >= 6 && u < 23 && v >= -5 && v < 5) col = R.lcdDark;
        }
        if (col !== runC) { if (runC) { c.fillStyle = runC; c.fillRect(runX, Y, X - runX, 1); } runC = col; runX = X; }
      }
    }
  }
  private board(g: Painter): void {
    P(g, BX - 4, BY - 4, R.lcdDark, BW + 8, BH + 8); P(g, BX - 2, BY - 2, R.frame, BW + 4, BH + 4); P(g, BX, BY, R.lcd, BW, BH);
    const c = new Clip(g, BX, BY, BX + BW, BY + BH);
    this.groove(c);
    for (let i = this.beads.length - 1; i >= 0; i--) this.drawBead(c, this.beads[i]);
    // the gun: a ring in the middle, a barrel that turns, the loaded ball at its muzzle, and a dotted line to the first ball it would touch
    const ax = Math.cos(this.aim), ay = Math.sin(this.aim);
    if (this.mode === 'play' && !this.paused) {
      const tr = this.trace(this.aim);
      for (let d = 32; d < tr.d - 8; d += 7) P(c, CX + ax * d - 0.5, CY + ay * d - 0.5, R.lcdDark, 2, 2);
      if (tr.hit !== null) { c.fillStyle = R.lcdDark; for (const [dx, dy] of ringPts(7.6, 8.4)) c.fillRect(Math.round(tr.x) + dx, Math.round(tr.y) + dy, 1, 1); }
    }
    paintRuns(c, geom().gun, 0, 0);
    this.barrel(c);
    if (this.mode === 'play' || this.mode === 'wave') { this.ballAt(c, CX + ax * 22, CY + ay * 22, this.cur, 1); this.ballAt(c, CX - ax * 3, CY - ay * 3, this.nxt, 0.55); }
    for (const sh of this.shots) this.ballAt(c, sh.x, sh.y, sh.k, 1);
    for (const f of this.fallers) glyph(c, f.ch, f.x, f.y, mix(R.lcdDark, R.lcd, q(f.t / 1.3, 4)), 1);   // fading toward the board
    for (const b of this.bits) { if (b.life * 2.2 < 0.4) continue; P(c, b.x, b.y, b.col, 3, 3); P(c, b.x, b.y, R.white, 1, 1); }
    for (const r of this.rings) {                               // a ring opening where a ball broke: solid, then a checker, then sparse
      const a = 1 - r.t / 0.7, rad = Math.round(6 + r.t * 30), X = Math.round(r.x), Y = Math.round(r.y);
      if (a < 0.12) continue;
      c.fillStyle = R.halo;
      for (const [dx, dy] of ringPts(rad - 0.8, rad + 0.8)) {
        const par = (X + dx + Y + dy) & 1;
        if (a > 0.6 || (a > 0.3 && par === 0) || ((X + dx) % 3 === 0 && par === 0)) c.fillRect(X + dx, Y + dy, 1, 1);
      }
    }
    for (const f of this.floats) {
      const k = f.t / 1.1, y = f.y - k * 22, fade = q(Math.max(0, k - 0.6) / 0.4, 4);
      if (fade >= 1) continue;
      const col = mix(f.col, R.lcd, fade), sh = mix(R.lcdDark, R.lcd, fade);
      if (f.big) { const sx = Math.round((W - textW(f.s, 2)) / 2); T(g, f.s, sx + 1, y + 1, sh, 2); T(g, f.s, sx, y, col, 2); }
      else { const sx = Math.round(f.x - textW(f.s, 1) / 2); T(g, f.s, sx + 1, y + 1, sh, 1); T(g, f.s, sx, y, col, 1); }
    }
    for (const [cx, cy] of [[BX - 3, BY - 3], [BX + BW + 1, BY - 3], [BX - 3, BY + BH + 1], [BX + BW + 1, BY + BH + 1]]) P(g, cx, cy, R.halo, 2, 2);
  }
  private partner(g: Painter): void {
    P(g, 8, 272, R.lcdDark, W - 16, 16); P(g, 9, 273, R.lcd, W - 18, 14);
    paintRuns(g, geom().head, 0, 0);
    g.fillStyle = R.halo;                                        // its halo (an ellipse, 3.2 × 1.2)
    const seen = new Set<string>();
    for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2, x = Math.floor(18 + Math.cos(a) * 3.2), y = Math.floor(274.5 + Math.sin(a) * 1.2), k = `${x},${y}`; if (!seen.has(k)) { seen.add(k); g.fillRect(x, y, 1, 1); } }
    if (this.msg.ring > 0) for (let i = 0; i < 2; i++) {         // it speaks: two arcs, fading
      const a = q(this.msg.ring * 1.2 - i * 0.25, 4); if (a <= 0) continue;
      g.fillStyle = mix(R.lcd, R.halo, a);
      for (const [dx, dy] of ringPts(7.6 + i * 3, 8.4 + i * 3, -0.9, 0.9)) g.fillRect(18 + dx, 280 + dy, 1, 1);
    }
    T(g, this.msg.text, 35, 277, mix(R.lcd, R.lcdDark, q(this.msg.t / 0.4, 4)));
  }
  private footer(g: Painter): void {
    this.partner(g);
    const sk = (x: number, label: string): void => { rrect(g, x, 294, 70, 22, 6, R.frame); rrect(g, x + 1, 295, 68, 20, 5, R.lcdDark); CT(g, label, 302, R.lcd, 1, x, 70); };
    sk(KEY_PAUSE.x, this.paused ? D.keys.resume : D.keys.pause);
    sk(KEY_SOUND.x, SND.muted() ? D.keys.soundOff : D.keys.soundOn);
    CT(g, D.hud.next, 294, R.lcdMid, 1, 78, 84);
    if (this.mode === 'play') this.ballAt(g, 120, 308, this.nxt, 1);
  }

  /** the title: one how-to line, and a loop that shows it — [B][R][O][K][E][N]: a green ball is put in beside the
   *  two greens; three green balls go; the letters O and K are let go and fly up into the tray; the rest closes up */
  private drawTitle(g: Painter, blink: boolean): void {
    P(g, 0, 0, R.lcdDark, W, 22); lamb(g, 6, 6); T(g, D.title.brand, 30, 4, R.lcd, 2);
    CT(g, D.title.name, 27, R.lcdDark, 4); CT(g, D.title.slogan, 60, R.green, 2);
    const ph = this.clock % 8, pitch = 30, x0 = 27, wy = 104, wh = 40, my = wy + wh / 2, cellX = (i: number): number => x0 + i * pitch;
    const tw = 6 * SLOT_P - (SLOT_P - SLOT_W), tx = Math.round((W - tw) / 2);
    P(g, tx - 5, 78, R.lcdDark, tw + 10, 22); P(g, tx - 3, 80, R.frame, tw + 6, 18);
    const flyT0 = 2.5, flyDur = 0.8;
    for (let i = 0; i < 6; i++) { const sx = tx + i * SLOT_P; P(g, sx, 82, R.lcdDark, SLOT_W, SLOT_H); P(g, sx, 82 + SLOT_H - 2, R.lcdMid, SLOT_W, 2); }
    P(g, 12, wy - 3, R.lcdDark, 216, wh + 6); P(g, 14, wy - 1, R.frame, 212, wh + 2); P(g, 15, wy, R.lcdMid, 210, wh);
    const L = [...D.title.demoWord], KC = [0, 1, 3, 3, 0, 1];
    const ease = (k: number): number => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
    const c = new Clip(g, 15, wy - 60, 15 + 210, wy - 60 + wh + 120);
    const shiftIn = ease((ph - 1.5) / 0.35), closeUp = ease((ph - 3.3) / 0.6);
    const bigBall = (k: number, x: number, y: number, sc: number): void => { const w = Math.round(28 * sc); if (w < 2) return; paintRuns(c, sprite(k, 1, w), Math.round(x - w / 2), Math.round(y - w / 2)); };
    const shot = ph > 0.9 && ph < 1.75, gone = ph >= 2.4, popK = ease((ph - 2.4) / 0.25);
    for (let i = 0; i < 6; i++) {
      let x = cellX(i), sc = 1;
      if (i >= 4) x += pitch * shiftIn;
      if (i >= 4) x -= pitch * 3 * closeUp;
      if (gone && (i === 2 || i === 3)) sc = 1 - popK;
      if (sc <= 0.02) continue;
      bigBall(KC[i], x, my, sc); if (sc > 0.85) glyph(c, L[i], x + 1, my + 1, R.lcdDark, 2);
    }
    // the player's ball: no letter
    if (ph > 0.9 && ph < 2.65) {
      const k = ease((ph - 0.9) / 0.7), sx = cellX(4), sy = shot ? my + 60 - 60 * k : my, sc = ph >= 2.4 ? 1 - popK : 1;
      if (ph > 1.75) bigBall(3, sx, my, sc); else bigBall(3, sx, sy, 1);
    }
    if (ph > 1.9 && ph < 2.4 && Math.sin(ph * 40) > 0) {        // the three, outlined (the prototype's blinking stroke)
      const rx = cellX(2) - 15, ry = wy + 3, rw = pitch * 3, rh = wh - 6;
      P(c, rx - 1, ry - 1, R.halo, rw + 2, 2); P(c, rx - 1, ry + rh - 1, R.halo, rw + 2, 2); P(c, rx - 1, ry - 1, R.halo, 2, rh + 2); P(c, rx + rw - 1, ry - 1, R.halo, 2, rh + 2);
    }
    // the two letters let go
    ([[L[2], 2, 2], [L[3], 3, 4]] as Array<[string, number, number]>).forEach(([ch, ci, slot]) => {
      if (ph > flyT0 && ph < 5.6) {
        const k = Math.min(1, (ph - flyT0) / flyDur), e = ease(k), fx = cellX(ci), fy = my, ex = tx + slot * SLOT_P + SLOT_W / 2, ey = 82 + SLOT_H / 2;
        const x = fx + (ex - fx) * e, y = fy + (ey - fy) * e - Math.sin(k * Math.PI) * 14;
        if (k < 1) { P(g, x - 7, y - 9, R.lcdDark, 15, 19); P(g, x - 6, y - 8, R.halo, 13, 17); glyph(g, ch, x + 0.5, y + 0.5, R.lcdDark, 2); }
        else { const sx = tx + slot * SLOT_P; P(g, sx, 82, R.lcdMid, SLOT_W, SLOT_H); slotText(g, ch, sx, 82, R.halo); }
      }
    });
    CT(g, D.title.howTo1, 156, R.lcdDark); CT(g, D.title.howTo2, 166, R.lcdDark);
    CT(g, D.title.aim, 192, R.lcdMid);
    if (blink) CT(g, D.title.start, 208, R.lcdDark, 2);
    CT(g, D.title.keys1, 232, R.lcdMid); CT(g, D.title.keys2, 242, R.lcdMid);
    // what the groove has kept so far, as a strip
    const sw = 6, sx = Math.round((W - sw * 30) / 2), sy = 262;
    P(g, sx - 2, sy - 2, R.lcdDark, sw * 30 + 4, sw + 4); P(g, sx, sy, R.lcd, sw * 30, sw);
    for (let i = 0; i < 30; i++) { const s = this.stainS[Math.floor(i * this.stainS.length / 30)]; if (s) P(g, sx + i * sw, sy, mix(R.lcd, COL[s.k], Math.min(0.95, 0.2 + s.n * 0.08)), sw, sw); }
    if (this.clearedAll) CT(g, D.title.brokenSoFar + this.clearedAll, 282, R.lcdMid);
    CT(g, D.title.promo, 306, R.lcdMid);
  }
}
