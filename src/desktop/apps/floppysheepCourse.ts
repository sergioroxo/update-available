/**
 * ⚑ FLOPPYSHEEP v7 — THE LEVEL (S221). Ported verbatim from the approved prototype
 * (`Pc_Simulation/Games_Proposals_2026-10-07_v7/floppysheep_v7.html`, his: "amazing and that's it"):
 * the nine chapters that follow his song, the song-clock scroll D(t), the course authored to his words,
 * the v4 filler chunks, and v7's big lyric marks (the cannon/firework table). Pure data and pure functions,
 * shared by every FloppySheep on screen (Vera's phone in 2016, the bookmark in 2026); nothing here holds a
 * run's state. The game itself is `floppysheep.ts`; its words are `data/dialog/s3_floppysheep.json`; his
 * timed words are `data/dialog/s3_floppysheep_lyrics.json` (identical to the prototype's LYRICS table).
 *
 * NOTHING HERE ROLLS DICE: every object of the level is placed by hand against a lyric line (`lt`, the time
 * its line is sung — from then, for 2.4 s, the object glows gold: "the level answers the line").
 */
import g from '../../../data/dialog/s3_floppysheep.json';
import lyrics from '../../../data/dialog/s3_floppysheep_lyrics.json';

// ── the game's own space: logical 300 wide (the prototype's), as tall as the host's aspect makes it ─────────
export const LW = 300;
export const HEADER_H = 36, GROUND_Y = 372, GRASS_H = 34, FOOT_Y = GROUND_Y + GRASS_H + 14, PLAY_BOT = GROUND_Y + GRASS_H;
export const LOW = 84;                                         // how far under the meadow the sunken lane lies
export const SX = 132, HW = 12;                                // the sheep's x, and half her hit width
/** the song's length when its file has not told us yet (the mp3 is 278.04 s) */
export const SONG_LEN = 278;

// ── his words, timed ───────────────────────────────────────────────────────────────────────────────────────
export type Word = [number, string];
export const LYRICS: Array<[number, Word[]]> =
  (lyrics as unknown as { lines: Array<{ t: number; words: Word[] }> }).lines.map((l) => [l.t, l.words]);
const WORDT: number[] = [];
for (const [, ws] of LYRICS) for (const w of ws) WORDT.push(w[0]);
WORDT.sort((a, b) => a - b);
/** seconds since the last sung word (the choir pulses on every word) */
export const wordAge = (t: number): number => {
  let lo = 0, hi = WORDT.length; if (!hi || t < WORDT[0]) return 9;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (WORDT[m] <= t) lo = m; else hi = m; }
  return t - WORDT[lo];
};

// ── the chapters: nine sections that follow the song. numbers blend across each boundary (the last 4 s) ─────
export interface Section { t0: number; name: string; tint: number; warm: number; rain: number; wind: number; mist: number; fog: number; spark: number; fly: number; stars: number; speed: number; drift: number; set: string }
const NAMES = g.sections as string[];
export const SECTIONS: Section[] = [
  { t0: 0,   name: NAMES[0], tint: 0,    warm: 0,    rain: 0, wind: 0.15, mist: 0,   fog: 0,   spark: 0.2, fly: 0, stars: 0,   speed: 126, drift: 0.003, set: 'S1' },
  { t0: 14,  name: NAMES[1], tint: 0,    warm: 0,    rain: 0, wind: 0.5,  mist: 0,   fog: 0,   spark: 0.1, fly: 0, stars: 0,   speed: 136, drift: 0.006, set: 'S2' },
  { t0: 42,  name: NAMES[2], tint: 0.08, warm: 0.2,  rain: 0, wind: 0.1,  mist: 0.8, fog: 0.1, spark: 0.3, fly: 0, stars: 0,   speed: 120, drift: 0.010, set: 'S3' },
  { t0: 66,  name: NAMES[3], tint: 0.05, warm: 0.1,  rain: 0, wind: 1.0,  mist: 0.1, fog: 0,   spark: 0,   fly: 0, stars: 0,   speed: 142, drift: 0.014, set: 'S4' },
  { t0: 107, name: NAMES[4], tint: 0,    warm: 0.5,  rain: 0, wind: 0.4,  mist: 0,   fog: 0,   spark: 1,   fly: 0, stars: 0,   speed: 160, drift: 0.022, set: 'S5' },
  { t0: 152, name: NAMES[5], tint: 0.32, warm: 0.28, rain: 0, wind: 0.2,  mist: 0,   fog: 0,   spark: 0,   fly: 1, stars: 0.6, speed: 148, drift: 0.032, set: 'S6' },
  { t0: 205, name: NAMES[6], tint: 0.55, warm: 0,    rain: 1, wind: 0.5,  mist: 0,   fog: 0,   spark: 0,   fly: 0, stars: 0.1, speed: 138, drift: 0.045, set: 'S7' },
  { t0: 232, name: NAMES[7], tint: 0.55, warm: 0,    rain: 0.5, wind: 0.3, mist: 0.5, fog: 0.7, spark: 0,  fly: 0, stars: 0,   speed: 168, drift: 0.060, set: 'S8' },
  { t0: 258, name: NAMES[8], tint: 0.12, warm: 0.55, rain: 0, wind: 0.1,  mist: 0.8, fog: 0.2, spark: 0.8, fly: 0, stars: 0,   speed: 110, drift: 0.085, set: 'S9' }
];
const NUM = ['tint', 'warm', 'rain', 'wind', 'mist', 'fog', 'spark', 'fly', 'stars', 'speed', 'drift'] as const;
export type Env = { i: number; name: string; set: string } & Record<typeof NUM[number], number>;
export const smooth = (k: number): number => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
function secIndex(t: number): number { let i = 0; for (let k = 0; k < SECTIONS.length; k++) if (SECTIONS[k].t0 <= t) i = k; return i; }
export function envAt(t: number): Env {
  const i = secIndex(t), cur = SECTIONS[i], nxt = SECTIONS[Math.min(SECTIONS.length - 1, i + 1)], end = i + 1 < SECTIONS.length ? nxt.t0 : Infinity;
  const mix = i + 1 < SECTIONS.length ? smooth(1 - (end - t) / 4) : 0;
  const e = { i, name: cur.name, set: cur.set } as Env;
  for (const k of NUM) e[k] = cur[k] + (nxt[k] - cur[k]) * mix;
  return e;
}

// THE WORLD SCROLLS AS A FUNCTION OF THE SONG CLOCK: D(t) is the distance travelled by song time t. Anything authored "at t" reaches the sheep at t, exactly.
const DSTEP = 0.05, DN = 7400; const Dtab = new Float32Array(DN + 1);
(function () { let d = 0; for (let i = 1; i <= DN; i++) { d += envAt((i - 0.5) * DSTEP).speed * DSTEP; Dtab[i] = d; } })();
export function D(t: number): number { t = Math.max(0, t); const f = t / DSTEP, i = Math.min(DN - 1, Math.floor(f)); return Dtab[i] + (Dtab[i + 1] - Dtab[i]) * (f - i); }
export function Tinv(d: number): number { let lo = 0, hi = DN; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (Dtab[m] <= d) lo = m; else hi = m; } return lo * DSTEP + (d - Dtab[lo]) / Math.max(1e-6, Dtab[lo + 1] - Dtab[lo]) * DSTEP; }

// ── THE COURSE, AUTHORED TO HIS WORDS. add(kind, t, params): t is the SONG TIME at which the object's left edge reaches the sheep (strays: their centre). ──
export interface CourseItem {
  k: string; t: number; lt?: number; w?: number; h?: number; rise?: number; style?: string; bit?: number; low?: boolean; text?: string;
  g?: number; top?: number; ph?: number; amp?: number; i?: number; ch?: string; L?: number; T?: number; still?: boolean; ring?: boolean;
  wd: number; spawnAt: number;
}
type Opts = Partial<Omit<CourseItem, 'k' | 't' | 'wd' | 'spawnAt'>>;
export const COURSE: CourseItem[] = [];
const add = (k: string, t: number, o: Opts = {}): void => { COURSE.push(Object.assign({ k, t, wd: 0, spawnAt: 0 }, o)); };
const plat = (style: string, t: number, rise: number, w: number, o: Opts = {}): void => add('cloud', t, Object.assign({ style, rise, w }, o));
const C = g.course;
const KEYS = C.keycaps.split('');

// 1 · "System boot sequence initiates" (13.7) — a staircase that LOADS: each block lights as its word is sung
([[13.62, 22, 13.72], [14.04, 44, 14.14], [14.46, 66, 14.56], [15.3, 88, 15.44]] as const).forEach(([t, h, lt]) => add('block', t, { w: 36, h, style: 'load', lt }));
add('stray', 15.45, { rise: 88, lt: 15.44 });
// 2 · "Execute the forced alignment protocol" (17.1) — five fences in a perfect row
[0, 0.56, 0.72, 1.0, 1.76].forEach((o, i) => add('fence', 17.4 + i * 0.6, { h: 30, lt: 17.12 + o }));
// 3 · "Recalibrating physics for pipeline compliance" (20.1, again 23.5) — a light field, then a heavy one; the pipeline at the end
add('grav', 19.9, { w: 400, g: 0.5, lt: 20.14 }); ([[20.75, 120], [21.55, 180], [22.35, 120]] as const).forEach(([t, r]) => add('stray', t, { rise: r, lt: 20.14 }));
add('grav', 23.3, { w: 410, g: 1.7, lt: 23.48 }); add('fence', 24.1, { h: 34, lt: 23.48 }); add('fence', 24.95, { h: 40, lt: 24.88 }); add('pipe', 25.9, { h: 46, lt: 25.1 }); add('stray', 26.45, { rise: 0, lt: 25.52 });
// 4 · "Corrected binary patches are applied" (26.8, again 30.1) — patch-stones to hop across, with the ground under them still fenced
([[26.9, 60, 26.76], [27.5, 100, 27.38], [28.1, 60, 28.2], [28.7, 100, 28.94], [29.3, 60, 29.3]] as const).forEach(([t, r, lt], i) => { plat('patch', t, r, 34, { lt, bit: i }); if (i % 2 === 0) add('stray', t + 0.12, { rise: r, lt }); });
add('fence', 27.3, { h: 30 }); add('fence', 28.5, { h: 30 });
([[30.3, 80, 30.06], [30.9, 130, 30.66], [31.5, 80, 31.52], [32.1, 130, 32.22], [32.7, 80, 32.66]] as const).forEach(([t, r, lt], i) => { plat('patch', t, r, 34, { lt, bit: i + 1 }); if (i % 2 === 1) add('stray', t + 0.12, { rise: r, lt }); });
add('fence', 31.1, { h: 30 }); add('fence', 32.4, { h: 30 });
// 5 · "Error state, floppy sheep" (33.7) — a hole in the meadow: the sunken lane, with the lambs of the line in it, a thorn, and a spring out (landing on two clouds, one per word)
add('sign', 33.0, { text: C.signErrorState, lt: 33.68 });
add('pit', 33.7, { w: 432, lt: 33.68 });
[34.5, 35.2, 36.0].forEach((t) => add('stray', t, { rise: 0, low: true, lt: 33.68 }));
add('thorn', 35.55, { low: true, w: 30 }); add('spring', 36.15, { low: true });
plat('cloud', 36.95, 150, 90); plat('cloud', 38.0, 180, 90, { lt: 38.1 }); add('stray', 38.3, { rise: 180, lt: 38.1 }); plat('cloud', 39.1, 130, 90, { lt: 39.16 }); add('stray', 39.4, { rise: 130, lt: 39.16 });
// 6 · the slow part: "Needs ... disease ... recalibration" (41.5 / 50.9 / 58.6) — a spring and a cloud route; a warm updraft to a high pasture; three recalibration beams
add('spring', 41.7, { lt: 41.54 }); plat('cloud', 42.45, 190, 100, { lt: 41.54 }); add('stray', 42.8, { rise: 190 }); add('clover', 43.5, { rise: 235 });
add('thermal', 50.2, { w: 210, top: 300, lt: 50.94 }); plat('cloud', 51.5, 300, 190, { lt: 50.94 }); add('stray', 52.0, { rise: 300 }); add('stray', 52.7, { rise: 300 });
add('beam', 58.8, { w: 64, ph: 0, lt: 58.62 }); add('beam', 60.0, { w: 64, ph: 1.0, lt: 58.62 }); add('beam', 61.2, { w: 64, ph: 2.0, lt: 58.62 }); add('stray', 62.7, { rise: 0 });
// 7 · "Quantum integrity of core code is nominal" (66.5, 69.8) — a downdraft, then a warm lift to a cloud
add('down', 66.6, { w: 150, lt: 66.46 }); add('fence', 68.1, { h: 30, lt: 66.46 });
add('thermal', 69.8, { w: 180, top: 220, lt: 69.76 }); plat('cloud', 70.7, 220, 150, { lt: 69.76 }); add('stray', 71.1, { rise: 220 }); add('stray', 71.8, { rise: 220 });
// 8 · "Corrective binary patches are applied" (73.1, 76.4) — wires on the ground, patch-stones over them
([[73.4, 40, 73.74], [74.2, 44, 74.54], [75.0, 40, 75.28]] as const).forEach(([t, h, lt]) => add('wire', t, { h, lt }));
([[73.5, 150], [74.3, 170], [75.1, 150]] as const).forEach(([t, r], i) => { plat('patch', t, r, 40, { lt: 73.08 + i * 0.7, bit: i }); add('stray', t + 0.14, { rise: r }); });
([[76.7, 44, 77.04], [77.5, 40, 77.86], [78.3, 44, 78.6]] as const).forEach(([t, h, lt]) => add('wire', t, { h, lt }));
([[76.8, 150], [77.6, 175], [78.4, 150]] as const).forEach(([t, r], i) => { plat('patch', t, r, 40, { lt: 76.4 + i * 0.7, bit: i + 1 }); add('stray', t + 0.14, { rise: r }); });
// 9 · "Error state / Floppy sheep / Refuse these recalibrations" (80.0 / 81.2 / 82.9) — the first megaphone drone; and pylons that fizzle as she goes by: refused
add('drone', 81.2, { rise: 40, lt: 82.86 });
[83.0, 83.9, 84.8].forEach((t, i) => add('pylon', t, { lt: 82.86, i }));
// 10 · "The light path is outside of my sight" (86.6-92.3) — a path of lamps that climbs into the mist and ends on a meadow in the sky
([[87.8, 60, 86.77], [89.0, 110, 90.11], [90.2, 160, 90.61], [91.4, 210, 91.19], [92.6, 250, 92.34]] as const).forEach(([t, r, lt], i) => plat(i === 4 ? 'vanish' : 'lamp', t, r, 80, { lt }));
plat('cloud', 94.0, 262, 190, { lt: 92.34 }); add('stray', 94.4, { rise: 262 }); add('stray', 95.1, { rise: 262 }); add('clover', 95.6, { rise: 300 });
// 11 · "Acceptable parameters" (95.9 ... 104.2) — the quota inspectors, and what they have to count
add('inspector', 97.4, { lt: 95.92 }); add('thorn', 98.9, {}); add('inspector', 100.4, { lt: 104.15 }); add('bale', 101.9, {}); add('inspector', 103.5, { lt: 104.15 });
// 12 · "One more run till it's clean ... jumping over the wire" (107.1 / 109.3) — and every hop is another piece of me (wool, in the game)
add('fence', 107.9, { h: 30, lt: 107.05 }); add('fence', 108.6, { h: 36, lt: 107.73 });
([[110.1, 36, 109.95], [110.8, 40, 110.43], [111.5, 44, 110.97], [112.2, 40, 111.4]] as const).forEach(([t, h, lt]) => add('wire', t, { h, lt }));
add('fence', 113.8, { h: 30, lt: 113.11 }); add('fence', 114.5, { h: 36, lt: 114.69 });
// 13 · "Wired to the machine that wants me higher" (114.7) — a spring to a cable high above the meadow; the inspectors wait on the ground ("play until it's fixed / until you're pure")
add('spring', 115.15, { lt: 114.69 }); plat('cable', 115.85, 240, 540, { lt: 116.17 });
[116.5, 117.3, 118.1, 118.9].forEach((t) => add('stray', t, { rise: 240, lt: 116.17 }));
add('inspector', 121.0, { lt: 116.97 }); add('inspector', 123.5, { lt: 122.99 }); add('inspector', 125.0, { lt: 124.83 });
// 14 · "Every failure's a new brick / every death is one step more" (126.4 / 129.7) — three bricks, then stairs of bricks
([[126.9, 126.69], [127.8, 127.53], [128.7, 128.35]] as const).forEach(([t, lt]) => add('block', t, { w: 40, h: 44, style: 'brick', lt }));
([[130.1, 30, 130.01], [130.65, 60, 130.95], [131.2, 90, 131.21]] as const).forEach(([t, h, lt]) => add('block', t, { w: 40, h, style: 'brick', lt })); add('stray', 131.55, { rise: 90, lt: 131.61 });
// 15 · chorus: "Keep on jumping, keep on leaping ... don't you dare to stop or weaken" (135.8 / 142.4) — a chain of clouds that leaps up to a pasture, and a drone at the height she has reached
([[135.9, 100, 136.49], [137.0, 160, 136.65], [138.1, 220, 137.43], [139.2, 280, 139.13]] as const).forEach(([t, r, lt]) => { plat('cloud', t, r, 80, { lt }); add('stray', t + 0.3, { rise: r, lt }); });
plat('cloud', 140.5, 300, 290, { lt: 139.93 }); [140.9, 141.6, 142.3].forEach((t) => add('stray', t, { rise: 300 })); add('clover', 141.2, { rise: 345 });
add('drone', 140.8, { rise: 300, lt: 142.43 });
add('reserve', 134.0, { w: 300 });
// 16 · "The screen is humming in the dark" (152.7) — thorns in the dusk; "my fingers shake on the input keys" (154.4) — five keycaps, spelling INPUT, that shake
add('thorn', 153.3, { lt: 152.73 }); add('thorn', 154.0, { lt: 153.99 });
([[155.2, 50, 154.63], [155.8, 86, 155.45], [156.4, 50, 155.93], [157.0, 86, 156.37], [157.6, 50, 157.11]] as const).forEach(([t, r, lt], i) => { plat('key', t, r, 34, { lt, ch: KEYS[i] ?? '' }); if (r === 86) add('stray', t + 0.1, { rise: r, lt }); });
// 17 · "The timer's ticking like a beating heart" (159.2) — two crooks that swing and tick; "is this what it means to be free" (161.7-164.5) — a stretch with nothing in it, and an open gate
add('crook', 159.9, { rise: 165, L: 140, T: 2.6, ph: 0, lt: 159.35 }); add('crook', 162.0, { rise: 165, L: 140, T: 2.6, ph: 1.6, lt: 161.69 });
add('reserve', 164.4, { w: 360 }); add('freegate', 164.7, { lt: 164.51 });
([[165.3, 0], [165.75, 50], [166.2, 90], [166.65, 50], [167.1, 0]] as const).forEach(([t, r]) => add('stray', t, { rise: r, lt: 164.51 })); add('clover', 166.2, { rise: 150 });
// 18 · "They say the score is watching me / the ghosts are in the code" (166.2 / 168.3)
add('inspector', 168.4, { lt: 166.21 }); add('ghost', 170.0, { rise: 60, amp: 30, ph: 0, lt: 168.33 }); add('ghost', 171.1, { rise: 120, amp: 36, ph: 2, lt: 169.33 }); add('ghost', 172.2, { rise: 50, amp: 30, ph: 4, lt: 170.69 });
// 19 · "Every jump I'm disappearing" (172.7) — platforms that fade; "being remade" (176) — platforms that move
[172.69, 173.05, 173.69, 173.89].forEach((lt, i) => { plat('vanish', 173.9 + i * 0.75, i % 2 ? 90 : 70, 70, { lt }); if (i % 2) add('stray', 173.9 + i * 0.75 + 0.2, { rise: 90 }); });
add('fence', 174.3, { h: 30 }); add('fence', 175.8, { h: 30 });
([[177.3, 0, 176.35], [178.6, 1.6, 176.99], [179.9, 3.2, 177.63]] as const).forEach(([t, ph, lt]) => { plat('mover', t, 120, 70, { lt, amp: 50, ph }); add('stray', t + 0.2, { rise: 200, lt }); });
// 20 · chorus again (179.7 / 188.8) — the chain climbs higher; a drone at her height
add('spring', 181.4, { lt: 179.65 });
([[182.7, 100, 182.83], [183.8, 150, 183.79], [184.9, 200, 184.63], [186.0, 250, 185.47]] as const).forEach(([t, r, lt]) => { plat('cloud', t, r, 80, { lt }); add('stray', t + 0.3, { rise: r, lt }); });
plat('cloud', 187.2, 270, 280, { lt: 187.13 }); [187.5, 188.2, 188.9].forEach((t) => add('stray', t, { rise: 270 }));
add('drone', 187.2, { rise: 270, lt: 188.77 });
add('reserve', 182.0, { w: 300 });
// 21 · the guitar break (191-205): THE GREAT ASCENT, up out of the meadow, past the clouds, to a meadow in the night sky ... and "I want to put it down" (205.5): the meadow ends
([[191.4, 300], [192.4, 340], [193.4, 320], [194.4, 380], [195.4, 360], [196.4, 420], [197.4, 400], [198.4, 450]] as const).forEach(([t, r], i) => { plat('cloud', t, r, 80); if (i % 2 === 0) add('stray', t + 0.25, { rise: r }); });
plat('cloud', 199.6, 460, 760, { lt: 205.53 }); [200.2, 200.9, 201.6, 202.3, 203.0, 203.7].forEach((t) => add('stray', t, { rise: 460 })); add('clover', 201.0, { rise: 505 }); add('clover', 203.4, { rise: 505 });
add('reserve', 190.4, { w: 2000 });
// 22 · "I want to walk away" (207.3) — a lane under the rain where the lambs are walking; the pit again, and a spring up
add('pit', 207.0, { w: 480, lt: 207.27 });
[207.9, 208.7, 209.5].forEach((t) => add('stray', t, { rise: 0, low: true, lt: 207.27 })); add('thorn', 208.4, { low: true, w: 30 }); add('spring', 209.9, { low: true });
// 23 · "But the screen is a mouth" (208.9) — the pipes; "it's learning what to say" (210.6 ... 213.9) — a drone; the door, locked, and the sheep at the door
add('pipe', 212.1, { h: 56, lt: 209.89 }); add('ceil', 212.1, { rise: 205 }); add('pipe', 213.2, { h: 70, lt: 211.75 }); add('ceil', 213.2, { rise: 215 });
add('drone', 214.3, { rise: 40, lt: 215.9 });
add('stray', 216.5, { rise: 0, lt: 216.99 }); add('gate', 217.4, { h: 70, lt: 216.99 });
// 24 · "bones are getting lighter now / thoughts are getting thin" (219) — a warm lift; "slippage is a failure" (222.1) — a storm, a downpour over the ground
add('thermal', 218.9, { w: 190, top: 270, lt: 218.99 }); plat('cloud', 220.0, 270, 170, { lt: 220.45 }); add('stray', 220.4, { rise: 270 }); add('stray', 221.1, { rise: 270 });
add('storm', 222.6, { w: 190, rise: 250, lt: 222.11 }); add('fence', 223.3, { h: 30, lt: 223.95 }); add('fence', 224.4, { h: 34, lt: 224.77 });
// 25 · "flap is a confession ... every coin, score, breath" (225.8-231.4) — a ladder of rings that only flaps reach
([[226.2, 70, 225.81], [227.6, 110, 227.15], [229.2, 150, 228.79], [230.9, 190, 230.47]] as const).forEach(([t, r, lt]) => add('stray', t, { rise: r, ring: true, lt }));
// 26 · "One more run" (232-258): the densest run of the song — each group lit on its line
add('fence', 232.8, { h: 36, lt: 232.29 }); add('wire', 233.5, { h: 40, lt: 232.87 }); add('pipe', 234.4, { h: 56, lt: 233.27 });
add('inspector', 236.1, { lt: 235.65 }); add('thorn', 237.0, { lt: 235.93 }); add('bale', 237.8, { lt: 238.85 });
add('spring', 239.4, { lt: 238.99 }); plat('cloud', 240.15, 190, 100, { lt: 239.25 }); add('stray', 240.5, { rise: 190 });
// "Don't look down" (242.6, 245.9) — a cable at 330 above the meadow: the ground is out of sight
add('spring', 242.3, { lt: 242.57 }); plat('cable', 243.0, 330, 560, { lt: 242.57 }); [243.5, 244.3, 245.1, 245.9].forEach((t) => add('stray', t, { rise: 330, lt: 245.85 }));
add('reserve', 240.8, { w: 700 });
add('fence', 249.0, { h: 30, lt: 248.63 }); add('wire', 249.8, { h: 44, lt: 249.23 }); add('pipe', 250.7, { h: 60, lt: 249.89 }); add('thorn', 251.6, { lt: 250.5 });
add('crook', 253.0, { rise: 165, L: 140, T: 2.2, ph: 0.7, lt: 252.23 }); add('bale', 254.7, { lt: 254.31 }); add('inspector', 255.6, { lt: 255.81 }); add('wire', 256.8, { h: 40, lt: 256.5 }); add('fence', 257.6, { h: 34, lt: 258.5 });
// 27 · "The pipes are closing in" (258.8) — a corridor of pipes with a gap between; "the sheep is almost gone / Acceptable parameters" (260-269) — five inspectors who do not move
([[259.6, 40, 175], [260.8, 66, 205], [262.0, 30, 150]] as const).forEach(([t, h, r], i) => { add('pipe', t, { h, lt: 258.8 + i * 0.5 }); add('ceil', t, { rise: r }); add('stray', t + 0.5, { rise: Math.round((h + r) / 2) - 10 }); });
([[263.5, 261.92], [265.0, 265.19], [266.5, 267.24], [267.9, 268.07], [269.3, 268.92]] as const).forEach(([t, lt]) => add('inspector', t, { still: true, lt }));

// the sort and the windows (world distance) that the v4 filler steps aside for
export const DEFW: Record<string, number> = { fence: 16, wire: 22, bale: 46, pipe: 30, ceil: 30, block: 36, gate: 16, thorn: 38, spring: 34, cloud: 80, pit: 300, grav: 400, thermal: 150, down: 140, storm: 170, beam: 64, pylon: 20, sign: 70, inspector: 26, ghost: 30, crook: 8, drone: 30, stray: 0, clover: 0, reserve: 200, freegate: 60, puddle: 56 };
const WINDOWS: Array<[number, number]> = [];
for (const it of COURSE) {
  it.w = it.w || DEFW[it.k] || 0; it.wd = D(it.t); if (it.k === 'drone') it.wd += LW + 30 - SX;
  const thr = it.k === 'drone' ? LW + 30 : LW + 150; it.spawnAt = it.wd - (thr - SX);
  if (it.k === 'drone') WINDOWS.push([D(it.t), D(it.t) + 620]);
  else if (it.k !== 'stray' && it.k !== 'clover') WINDOWS.push([it.wd - 55, it.wd + it.w + 55]);
}
COURSE.sort((a, b) => a.spawnAt - b.spawnAt);
WINDOWS.sort((a, b) => a[0] - b[0]);
const MERGED: Array<[number, number]> = [];
for (const w of WINDOWS) { const l = MERGED[MERGED.length - 1]; if (l && w[0] <= l[1]) l[1] = Math.max(l[1], w[1]); else MERGED.push([w[0], w[1]]); }
export const reserved = (wd: number, w: number): boolean => { for (const m of MERGED) if (wd + w > m[0] && wd < m[1]) return true; return false; };

// the v4 chunk sets — still the filler between the lyric's own objects. [kind, dx, a, b]: a = height or rise, b = a cloud's width
export type ChunkItem = [string, number, number?, number?];
export const SETS: Record<string, Array<{ len: number; items: ChunkItem[] }>> = {
  S1: [{ len: 420, items: [['stray', 60, 0], ['stray', 150, 0], ['fence', 250, 30], ['stray', 340, 0]] }, { len: 420, items: [['stray', 70, 0], ['fence', 200, 30], ['stray', 280, 0], ['stray', 350, 0]] }, { len: 440, items: [['stray', 60, 0], ['bale', 180], ['stray', 260, 0], ['stray', 380, 0]] }],
  S2: [{ len: 420, items: [['fence', 110, 30], ['stray', 170, 0], ['fence', 250, 40], ['stray', 320, 0], ['stray', 380, 0]] }, { len: 440, items: [['bale', 110], ['stray', 160, 36], ['stray', 250, 0], ['fence', 330, 30], ['stray', 400, 0]] }, { len: 430, items: [['stray', 60, 0], ['fence', 140, 30], ['fence', 250, 40], ['stray', 320, 0], ['stray', 390, 0]] }],
  S3: [{ len: 470, items: [['spring', 90], ['cloud', 190, 196, 104], ['stray', 230, 196], ['clover', 270, 232], ['stray', 380, 0]] }, { len: 460, items: [['cloud', 100, 100, 90], ['stray', 140, 100], ['cloud', 230, 140, 90], ['stray', 270, 140], ['stray', 380, 0]] }, { len: 500, items: [['stray', 60, 0], ['spring', 140], ['cloud', 230, 200, 110], ['stray', 270, 200], ['stray', 310, 200], ['stray', 430, 0]] }],
  S4: [{ len: 430, items: [['bale', 100], ['wire', 230, 36], ['stray', 300, 0], ['stray', 390, 0]] }, { len: 450, items: [['fence', 110, 40], ['stray', 170, 0], ['wire', 260, 44], ['stray', 340, 0], ['bale', 380]] }, { len: 460, items: [['stray', 60, 0], ['bale', 130], ['cloud', 220, 108, 96], ['stray', 262, 108], ['stray', 380, 0], ['fence', 430, 30]] }],
  S5: [{ len: 380, items: [['wire', 90, 40], ['stray', 150, 0], ['wire', 230, 36], ['stray', 290, 0]] }, { len: 400, items: [['fence', 90, 36], ['stray', 140, 0], ['wire', 210, 44], ['stray', 270, 0], ['wire', 330, 36], ['stray', 380, 0]] }, { len: 430, items: [['spring', 80], ['cloud', 170, 204, 100], ['stray', 210, 204], ['stray', 250, 204], ['wire', 320, 40], ['stray', 380, 0], ['stray', 420, 0]] }, { len: 400, items: [['bale', 90], ['stray', 200, 52], ['wire', 250, 40], ['stray', 320, 0], ['stray', 370, 0]] }],
  S6: [{ len: 440, items: [['fence', 110, 30], ['bale', 210], ['stray', 260, 40], ['stray', 330, 0], ['fence', 390, 40]] }, { len: 470, items: [['cloud', 90, 100, 84], ['stray', 130, 100], ['wire', 220, 40], ['stray', 290, 0], ['cloud', 340, 140, 84], ['stray', 380, 140]] }, { len: 450, items: [['stray', 60, 0], ['fence', 130, 40], ['stray', 200, 0], ['bale', 270], ['stray', 330, 40], ['stray', 420, 0]] }],
  S7: [{ len: 440, items: [['pipe', 110, 56], ['stray', 190, 0], ['puddle', 250], ['fence', 300, 40], ['stray', 380, 0]] }, { len: 470, items: [['spring', 90], ['cloud', 180, 200, 104], ['stray', 220, 200], ['pipe', 320, 64], ['stray', 410, 0]] }, { len: 430, items: [['puddle', 60], ['wire', 140, 44], ['stray', 210, 0], ['pipe', 280, 60], ['stray', 360, 0], ['stray', 410, 0]] }],
  S8: [{ len: 360, items: [['wire', 80, 40], ['fence', 160, 30], ['stray', 220, 0], ['pipe', 290, 60]] }, { len: 400, items: [['bale', 80], ['wire', 170, 44], ['stray', 230, 0], ['spring', 290], ['cloud', 340, 204, 70], ['stray', 365, 204]] }, { len: 380, items: [['fence', 80, 40], ['stray', 130, 0], ['pipe', 200, 64], ['stray', 270, 0], ['wire', 320, 40]] }, { len: 360, items: [['pipe', 80, 50], ['bale', 180], ['stray', 240, 36], ['fence', 300, 36], ['stray', 350, 0]] }],
  S9: [{ len: 520, items: [['stray', 80, 0], ['fence', 220, 30], ['stray', 360, 0]] }, { len: 520, items: [['bale', 140], ['stray', 260, 0], ['stray', 420, 0]] }, { len: 600, items: [['stray', 100, 0]] }],
  END: [{ len: 700, items: [] }]
};

// ── v6/v7 · the big lyric marks. c = cannons, f = fireworks (a digit is how many rockets), q = quiet (no shake). Nothing fires in the
//    rain (205-232): the lights go on sweeping, nobody cheers. ⚑ v7 (his: "the confetti cannons are a bit too much at the start as they
//    repeat a lot"): the marks before the first chorus lost most of their cannons (they keep a rocket: the beat is still marked), and a
//    minimum gap between salvos holds for every source (CANNON_GAP in floppysheep.ts). ─────────────────────────────────────────────────
export const MARKS: Array<[number, string]> = [[13.72, 'f2'], [17.12, 'f2'], [20.14, 'f1'], [26.76, 'f1q'], [33.68, 'cf4'], [38.1, 'f1q'], [41.54, 'f2'], [58.62, 'f3'], [66.46, 'f1q'], [81.17, 'cf3'], [82.86, 'f3'], [95.92, 'f2'],
  [107.05, 'cf4'], [109.27, 'f3'], [114.69, 'f3'], [126.37, 'f1q'], [133.31, 'cf3'], [135.79, 'f4'], [139.13, 'cf3'], [142.43, 'cf5'], [152.73, 'f2q'], [161.69, 'f2q'], [172.69, 'f1q'],
  [179.65, 'cf3'], [182.15, 'f4'], [185.47, 'cf3'], [188.77, 'cf5'], [191.4, 'f3'], [196.4, 'f3'], [200.2, 'f4'],
  [232.87, 'cf2'], [238.99, 'cf3'], [242.57, 'f3'], [248.63, 'cf3'], [252.23, 'cf3'], [258.8, 'cf5'],
  [261.92, 'cf6'], [262.83, 'cf6'], [265.19, 'cf7'], [266.15, 'cf7'], [267.24, 'cf8'], [268.07, 'cf8'], [268.92, 'cf12']];
