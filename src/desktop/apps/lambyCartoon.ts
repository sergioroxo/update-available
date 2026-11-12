/**
 * ⚑ THE PROGRAM'S OWN BOOT — LAMBY'S CARTOON OVER THE JINGLE (S166, 2026-09-21).
 *
 * Sérgio, on the S162 build: *"the Boot Jingle maybe only makes sense not as a
 * boot-in, but as when Lamby appears — a song from the program, with a cute
 * animation of Lamby sleeping and having impure thoughts, and being woken up by
 * a light that shows him what is right, and it is a computer with 'purity
 * streak'. The song can continue while on the menu, but it needs not to be the
 * boot-in of the computer and OS, but of the software."*
 *
 * So the machine boots in silence now (POST, the drive, the crawl — that is the
 * machine's), and when the crawl's last line has said that Restorify is part of
 * this computer, THE SOFTWARE boots: this cartoon, with his jingle
 * (`chase_the_clouds.mp3`, 30.77 s), hung on the track's measured phrase onsets
 * (0.12 · 3.34 · 5.20 · 9.64 · 20.71 · 23.66 — the same numbers bootSplash.ts
 * hung the old CD-ROM splash on). Lamby's introduction takes over on the last
 * phrase and the song plays out under it and into the program.
 *
 * ⚑ WHAT THE "IMPURE THOUGHTS" ARE: a dark scribble in a thought-cloud. Never a
 * picture of anything. This is the programme's OWN cartoon of itself — its
 * satire (CLAUDE.md: satire only inside perpetrator self-presentation) — and the
 * gag is that the software's idea of a thought is static, and its idea of a cure
 * is a monitor. It collapses on its own terms: the light that "shows him what is
 * right" is a screen with a number on it.
 * Register: operable (the software's surface; it may charm). Diegetic; the
 * frame never plays. Nothing real is quoted; every pixel is from the ERA1
 * palette; rotations are 90° steps (Lamby lies on his side, and stands).
 *
 * ⚑ S376 (UiB job 19 Part B, VISUAL_REVIEW_2026-11-12 #6) — REDRAWN AS A 2003 FLASH CARTOON OF ITSELF. It was grey
 * blocks on a black void: the least finished picture in 2003, and the programme's own media, which his rule says
 * must be over the top ("new versions must be over the top"). Now: *asleep*, his room at night (a dithered navy
 * wall, the window with a crescent, the bed with a teal-and-navy quilt, the monitor dark on its desk), "z z Z", and
 * a puffed white cloud with a black outline that fills with a scribble of static; *the light*, the screen switches
 * on and its glow spreads out of the glass across the room in a stepped circle, and behind it the room is gone: the
 * programme's sky (CAL_2003, the calendar's own sunrise colours) in hard sunburst rays turning slowly from the
 * screen, a green hill for a floor, sparkles; the cloud breaks into pixels and blows away; he stands and points at a
 * beige monitor with a big tick on it, RESTORIFY, PURITY STREAK, 412 days. The timeline (`E2_CARTOON`, the jingle's
 * phrase onsets) and his own drawing (`drawLambyChar`) are kept; the lyric band (os.ts) is unchanged. The scenes
 * are painted once into pixel grids (theme/pixelGrid.ts), so no edge is anti-aliased into an invented colour.
 * ⚑ HIS RULING ON PART A (12 Nov, T71): "as loud as it can be". So it goes all the way: the thought-cloud turns to a
 * storm that shakes as the static thickens; the light's rays turn; the cloud is blown apart into confetti; flowers pop
 * up out of the hill one by one; two birds cross; Lamby wakes with a halo; RESTORIFY drops in as extruded word-art
 * and a starburst stamps the streak. Every colour is still the palette's (ERA1, CAL_2003, PRINT), and nothing flashes:
 * the rays turn (each point changes about once a second), the sparkles and the static step at 3 per second at most
 * over small areas, and there is no full-screen alternation anywhere. Reduced motion holds the rays still.
 */
import { ERA1, ERA1_CANVAS } from '../theme/era1';
import { CAL_2003, PRINT } from '../theme/calendar';
import { px, setFont } from '../theme/chrome';
import { PixelGrid, blitGrid } from '../theme/pixelGrid';
import { reducedMotion } from '../../state/motion';
import { drawLambyChar } from './lambyChar';
import lambyStrings from '../../../data/dialog/s2_lamby.json';

const W = ERA1_CANVAS.width;   // 512
const H = ERA1_CANVAS.height;  // 384

/** the timeline, on the jingle's phrase onsets */
export const E2_CARTOON = {
  /** the dark: Lamby asleep, breathing; zzz rising */
  asleep: 0.12,
  /** the thought-cloud puffs in over him */
  cloud: 3.34,
  /** …and fills with the scribble */
  scribble: 5.20,
  /** the monitor on the right SWITCHES ON — the light */
  light: 9.64,
  /** the beam reaches the cloud; it thins and goes */
  cloudGone: 12.6,
  /** he wakes: stands (90° → upright), the appear pop */
  wake: 14.2,
  /** the screen writes what is right: the mark, the streak */
  screen: 16.4,
  /** he points at it, cheerful */
  point: 20.71,
  /** the handoff to his introduction; the song plays on under it */
  handoff: 23.66
} as const;

/** ⚑ his taste call (T71): the light's rays turn (the mock, over the top) or stand still */
export const CARTOON_RAYS_TURN = true;

const S = (lambyStrings as unknown as { cartoon: { mark: string; streakLabel: string; streakDays: string } }).cartoon;

function ramp(t: number, a: number, b: number): number {
  if (t <= a) return 0;
  if (t >= b) return 1;
  const k = (t - a) / (b - a);
  return k * k * (3 - 2 * k);
}

/** the surface re-uploads only when something moved (the S105 discipline):
 *  fast while a stroke is drawing or he is moving, slow while he sleeps */
export function e2CartoonVersion(t: number): number {
  const busy = (t >= E2_CARTOON.cloud && t < E2_CARTOON.cloud + 1.2)
    || (t >= E2_CARTOON.light && t < E2_CARTOON.light + 2.0)
    || (t >= E2_CARTOON.cloudGone && t < E2_CARTOON.cloudGone + 1.4)
    || (t >= E2_CARTOON.wake && t < E2_CARTOON.wake + 1.6)
    || (t >= E2_CARTOON.screen && t < E2_CARTOON.screen + 3.0);
  return Math.floor(t * (busy ? 15 : 5));
}

const FLOOR_Y = 300;
const LAMBY = { x: 150, y: 250 };                    // where he stands once he is up
const DESK = { x: 344, y: 238, w: 152, h: 62 };
const MON = { x: 360, y: 138, w: 124, h: 96 };       // the monitor's case
const GLASS = { x: MON.x + 7, y: MON.y + 7, w: MON.w - 14, h: MON.h - 22 };
const BEAM = { x: GLASS.x + Math.round(GLASS.w / 2), y: GLASS.y + Math.round(GLASS.h / 2) };
const CLOUD = { x: 150, y: 108 };
/** the cloud's puffs: (dx, dy, r) */
const PUFFS: [number, number, number][] = [[-46, 8, 22], [-20, -8, 28], [12, -12, 30], [44, 2, 24], [0, 16, 26], [-28, 20, 18], [30, 20, 18]];
/** the thought's three bubbles, from his head up to the cloud */
const BUBBLES: [number, number, number][] = [[96, 196, 2], [104, 184, 3], [116, 168, 5]];
const RAY_STEPS = 4;

// ── the two rooms, painted once ──────────────────────────────────────────────────────────────────────────────────
let night: HTMLCanvasElement | null = null;
const lit: (HTMLCanvasElement | null)[] = new Array<HTMLCanvasElement | null>(RAY_STEPS).fill(null);
let cloudCv: HTMLCanvasElement | null = null;

function paintDesk(g: PixelGrid, on: boolean): void {
  g.rect(DESK.x, DESK.y, DESK.w, DESK.h, ERA1.greyDark);
  g.rect(DESK.x, DESK.y, DESK.w, 3, ERA1.grey);                         // the desk's top edge catching the light
  g.rect(DESK.x + 8, DESK.y + 14, 52, 20, ERA1.black);                  // a drawer, its handle
  g.rect(DESK.x + 9, DESK.y + 15, 50, 18, ERA1.greyDark);
  g.rect(DESK.x + 28, DESK.y + 23, 12, 2, ERA1.grey);
  // the monitor: a beige case lit, a grey case in the dark
  const kase = on ? ERA1.beige : ERA1.grey, edge = on ? ERA1.white : ERA1.silver, shade = on ? ERA1.grey : ERA1.greyDark;
  g.rect(MON.x + 46, MON.y + MON.h, MON.w - 92, 6, shade);              // the neck
  g.rect(MON.x + 30, MON.y + MON.h + 6, MON.w - 60, 4, kase);           // the foot
  g.rect(MON.x, MON.y, MON.w, MON.h, ERA1.black);
  g.rect(MON.x, MON.y, MON.w - 1, MON.h - 1, edge);
  g.rect(MON.x + 1, MON.y + 1, MON.w - 2, MON.h - 2, shade);
  g.rect(MON.x + 1, MON.y + 1, MON.w - 3, MON.h - 3, kase);
  g.rect(GLASS.x - 1, GLASS.y - 1, GLASS.w + 2, GLASS.h + 2, shade);
  g.rect(GLASS.x, GLASS.y, GLASS.w, GLASS.h, on ? ERA1.titleBlue : ERA1.black);
  g.rect(MON.x + MON.w - 18, MON.y + MON.h - 10, 4, 3, on ? ERA1.ok : ERA1.greyDark);   // the power light
  g.rect(MON.x + 10, MON.y + MON.h - 10, 26, 2, shade);                 // the badge
}

function paintNight(): PixelGrid {
  const g = new PixelGrid(W, H, ERA1.navy);
  g.checker(0, 0, W, FLOOR_Y, PRINT.rallyNight);                        // the night wall: two navies, one texture
  g.rect(0, FLOOR_Y, W, H - FLOOR_Y, ERA1.tealDark);                    // the carpet
  g.checker(0, FLOOR_Y + 4, W, H - FLOOR_Y - 4, ERA1.black, 0, ERA1.tealDark);
  g.rect(0, FLOOR_Y, W, 2, ERA1.black);
  // the window: a frame, four panes of night, a crescent and its stars
  g.rect(36, 36, 96, 88, ERA1.black);
  g.rect(36, 36, 95, 87, ERA1.silver);
  g.rect(40, 40, 88, 80, ERA1.black);
  g.rect(83, 40, 2, 80, ERA1.silver);
  g.rect(40, 79, 88, 2, ERA1.silver);
  g.disc(106, 59, 9, ERA1.tooltip);
  g.disc(110, 56, 8, ERA1.black);
  for (const [sx, sy] of [[52, 52], [64, 98], [112, 104], [94, 48], [58, 70], [120, 88], [70, 46]]) g.set(sx, sy, ERA1.white);
  g.set(64, 97, ERA1.silver); g.set(64, 99, ERA1.silver); g.set(63, 98, ERA1.silver); g.set(65, 98, ERA1.silver);
  g.rect(30, 124, 108, 4, ERA1.greyDark);                               // the sill
  paintBed(g);
  paintDesk(g, false);
  return g;
}

/** the bed: headboard, frame and legs, the quilt (teal and navy, his mother's), the pillow — in both rooms, so he
 *  never lies on nothing when the light takes the night */
function paintBed(g: PixelGrid): void {
  g.rect(28, 196, 12, 104, ERA1.black);
  g.rect(29, 197, 10, 103, ERA1.greyDark);
  g.rect(36, 254, 206, 36, ERA1.black);
  g.rect(37, 255, 204, 34, ERA1.greyDark);
  g.rect(40, 290, 6, 10, ERA1.greyDark); g.rect(232, 290, 6, 10, ERA1.greyDark);
  g.rect(40, 226, 200, 30, ERA1.teal);
  g.checker(40, 226, 200, 30, ERA1.tealDark);
  for (let x = 48; x < 240; x += 22) g.rect(x, 226, 3, 30, ERA1.navy);
  g.rect(40, 236, 200, 2, ERA1.navy);
  g.rect(40, 248, 200, 2, ERA1.navy);
  g.rect(40, 226, 200, 1, ERA1.black);
  g.rect(232, 226, 8, 40, ERA1.tealDark);                               // the quilt falling over the end
  g.rect(44, 216, 46, 12, ERA1.black);
  g.rect(45, 217, 44, 10, ERA1.paper);
  g.checker(45, 223, 44, 4, ERA1.silver, 0, ERA1.paper);
}

function paintLit(step: number): PixelGrid {
  const C = CAL_2003;
  const g = new PixelGrid(W, H, C.skyMid);
  // the rays: hard bands out of the screen, sixteen of them, each step a quarter of a band further round
  const N = 16, band = (Math.PI * 2) / N, off = (step / RAY_STEPS) * band * 2;
  for (let y = 0; y < FLOOR_Y; y++) {
    for (let x = 0; x < W; x++) {
      const a = Math.atan2(y - BEAM.y, x - BEAM.x) + Math.PI + off;
      if (Math.floor(a / band) % 2 === 0) g.set(x, y, C.ray);
    }
  }
  g.disc(BEAM.x, BEAM.y, 92, C.skyHorizon);                             // the glow round the screen…
  g.checker(BEAM.x - 92, BEAM.y - 92, 184, 184, C.ray, 0, C.skyHorizon);
  g.disc(BEAM.x, BEAM.y, 76, C.sunCore);                                // …and its core
  // a far hill on the horizon, then the floor, which is a hill now: the programme's green, its shade dithered
  for (let x = 0; x < W; x++) {
    const top = Math.round(FLOOR_Y - 22 - 14 * Math.sin((x + 30) / 70) - 6 * Math.sin(x / 23));
    g.rect(x, top, 1, FLOOR_Y - top, C.hillBack);
    if (x % 3 === 0) g.rect(x, top + 3, 1, 2, C.hillBackShade);
  }
  g.rect(0, FLOOR_Y, W, H - FLOOR_Y, C.hillFront);
  g.checker(0, FLOOR_Y + 6, W, H - FLOOR_Y - 6, C.hillFrontShade);
  g.rect(0, FLOOR_Y, W, 2, C.hillFrontShade);
  for (let x = 0; x < W; x += 4) g.set(x + ((x / 4) % 2), FLOOR_Y - 1, C.hillBack);
  paintBed(g);
  paintDesk(g, true);
  return g;
}

function paintCloud(storm: boolean): PixelGrid {
  // the thought-cloud: puffs with one black outline round all of them, a dithered shade along the bottom; once the
  //   static is in it, a storm cloud (the programme's idea of a thought, darkening)
  const g = new PixelGrid(160, 100);
  const ox = CLOUD.x - 80, oy = CLOUD.y - 50;
  const fill = storm ? ERA1.grey : ERA1.white, shade = storm ? ERA1.greyDark : ERA1.silver;
  const m = g.emptyMask();
  for (const [dx, dy, r] of PUFFS) g.discMask(m, CLOUD.x + dx - ox, CLOUD.y + dy - oy, r);
  g.paintMask(m, fill, ERA1.black);
  for (const [dx, dy, r] of PUFFS) {
    if (dy >= 0) g.checker(CLOUD.x + dx - ox - r + 3, CLOUD.y + dy - oy + Math.floor(r / 2), 2 * r - 6, Math.max(1, Math.floor(r / 2) - 2), shade, 0, fill);
  }
  if (storm) for (const [dx, dy, r] of PUFFS) if (dy < 0) g.checker(CLOUD.x + dx - ox - 6, CLOUD.y + dy - oy - r + 4, 10, 3, ERA1.silver, 0, fill);
  return g;
}

let stormCv: HTMLCanvasElement | null = null;
let burstCv: HTMLCanvasElement | null = null;
function cached(): { night: HTMLCanvasElement; cloud: HTMLCanvasElement; storm: HTMLCanvasElement } {
  night ??= paintNight().toCanvas();
  cloudCv ??= paintCloud(false).toCanvas();
  stormCv ??= paintCloud(true).toCanvas();
  return { night, cloud: cloudCv, storm: stormCv };
}

/** the streak's starburst: fourteen points, the calendar's sun inside a red rim, a white ring — the stamp it gives you */
function burst(): HTMLCanvasElement {
  if (burstCv) return burstCv;
  const g = new PixelGrid(84, 84);
  const pts: [number, number][] = [];
  for (let i = 0; i < 28; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 14, r = i % 2 === 0 ? 41 : 32;
    pts.push([42 + r * Math.cos(a), 42 + r * Math.sin(a)]);
  }
  g.poly(pts, CAL_2003.sun, ERA1.warn);
  const inner = pts.map(([x, y]) => [42 + (x - 42) * 0.86, 42 + (y - 42) * 0.86] as [number, number]);
  g.poly(inner, CAL_2003.sun, ERA1.warnDark);
  g.disc(42, 42, 25, ERA1.white);
  g.disc(42, 42, 23, CAL_2003.sunCore);
  g.checker(30, 50, 26, 12, CAL_2003.sun, 0, CAL_2003.sunCore);
  return (burstCv = g.toCanvas());
}

/** a flower popping out of the hill (period clip-art): a stem, four petals, a centre */
function flower(ctx: CanvasRenderingContext2D, x: number, y: number, petal: string): void {
  px(ctx, x, y, 3, 16, ERA1.ok);
  px(ctx, x + 3, y + 7, 5, 3, ERA1.ok);                       // a leaf
  px(ctx, x - 5, y + 10, 5, 3, ERA1.ok);
  const P: [number, number][] = [[-5, -5], [5, -5], [-5, 5], [5, 5], [0, -7], [0, 7], [-7, 0], [7, 0]];
  for (const [dx, dy] of P) px(ctx, x + dx - 3, y - 6 + dy - 3, 9, 9, ERA1.black);
  for (const [dx, dy] of P) px(ctx, x + dx - 2, y - 6 + dy - 2, 7, 7, petal);
  px(ctx, x - 3, y - 9, 9, 7, ERA1.black);
  px(ctx, x - 2, y - 8, 7, 5, CAL_2003.sun);
}

/** a bird: a V, its wings up or down */
function bird(ctx: CanvasRenderingContext2D, x: number, y: number, up: boolean): void {
  for (let i = 0; i < 12; i++) {
    const dy = up ? -Math.round((11 - i) * 0.8) : Math.round((i < 6 ? i - 5 : 0) * 0.8);
    px(ctx, x - 12 + i, y + dy, 1, 3, ERA1.black);
    px(ctx, x + 12 - i, y + dy, 1, 3, ERA1.black);
  }
  px(ctx, x - 2, y - 1, 5, 4, ERA1.black);
}

/** word-art: the mark, extruded and outlined, the way a 2003 Flash intro set its logo */
function wordArt(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, size: number): void {
  setFont(ctx, size);
  const w = Math.ceil(ctx.measureText(text).width), x = Math.round(cx - w / 2);
  ctx.fillStyle = ERA1.navy;
  for (let k = 6; k >= 1; k--) ctx.fillText(text, x + k, y + k);                     // the extrusion
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [2, -2], [-2, 2], [2, 2]]) ctx.fillText(text, x + dx, y + dy);   // the outline
  ctx.fillStyle = ERA1.titleBlue; ctx.fillText(text, x + 1, y + 1);
  ctx.fillStyle = ERA1.white; ctx.fillText(text, x, y);
}
function litFrame(step: number): HTMLCanvasElement {
  return (lit[step] ??= paintLit(step).toCanvas());
}

/** a rough random sequence, the same for the same seed (the static is the same static on a redraw) */
function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

/** a 1 px line in logical pixels, as rects (the scribble) */
function stroke(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, c: string): void {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) px(ctx, Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 1, 1, c);
}

/** a disc with an outline, as rects (a thought bubble, the tick's plate) */
function bubble(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  for (let y = -r - 1; y <= r + 1; y++) {
    const o = Math.floor(Math.sqrt(Math.max(0, (r + 1) * (r + 1) + 0.6 * (r + 1) - y * y)));
    px(ctx, cx - o, cy + y, o * 2 + 1, 1, ERA1.black);
  }
  for (let y = -r; y <= r; y++) {
    const o = Math.floor(Math.sqrt(Math.max(0, r * r + 0.6 * r - y * y)));
    px(ctx, cx - o, cy + y, o * 2 + 1, 1, ERA1.white);
  }
}

/** clip to a stepped circle (two-pixel rows), so the light's edge is a pixel stair, never an anti-aliased curve */
function clipCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  for (let y = Math.max(0, Math.floor(cy - r)); y < Math.min(H, cy + r); y += 2) {
    const dy = y + 1 - cy, half = Math.sqrt(Math.max(0, r * r - dy * dy));
    if (half > 0) ctx.rect(Math.round(cx - half), y, Math.round(half * 2), 2);
  }
  ctx.clip();
}

export function drawLambyCartoon(ctx: CanvasRenderingContext2D, t: number): void {
  const { night: nightCv, cloud, storm } = cached();
  const k = ramp(t, E2_CARTOON.light, E2_CARTOON.light + 1.4);
  const still = reducedMotion() || !CARTOON_RAYS_TURN;
  const step = still ? 0 : Math.floor(Math.max(0, t - E2_CARTOON.light) * 4) % RAY_STEPS;

  // ── the room: night, until the screen's light spreads out of the glass and takes it ──
  if (t < E2_CARTOON.light || k < 1) blitGrid(ctx, nightCv, 0, 0, W, H);
  if (t >= E2_CARTOON.light) {
    ctx.save();
    if (k < 1) clipCircle(ctx, BEAM.x, BEAM.y, Math.max(6, k * 560));
    blitGrid(ctx, litFrame(step), 0, 0, W, H);
    ctx.restore();
    // sparkles: four-point stars that come and go in hard steps (never a fade)
    if (k >= 1) {
      const SP: [number, number, number][] = [[60, 54, 7], [236, 40, 5], [300, 148, 8], [44, 176, 4], [196, 70, 4], [296, 58, 6], [262, 214, 5],
        [340, 24, 6], [470, 40, 5], [24, 110, 5], [150, 30, 6], [500, 120, 4]];
      SP.forEach(([sx, sy, r], i) => {
        if (Math.floor(t * 1.5 + i * 0.7) % 3 === 0) return;   // each one on two beats in three, at 1.5 steps a second
        px(ctx, sx - r, sy, 2 * r + 1, 1, CAL_2003.sunCore);
        px(ctx, sx, sy - r, 1, 2 * r + 1, CAL_2003.sunCore);
        px(ctx, sx - 1, sy - 1, 3, 3, ERA1.white);
      });
    }
  }

  // ── Lamby: asleep on his side on the bed, then up (drawn under his thought, so its bubbles rise over him) ──
  const up = ramp(t, E2_CARTOON.wake, E2_CARTOON.wake + 0.5);
  if (up < 1) {
    ctx.save();
    // lying on his side: the puppet rotated a quarter turn. The turn back is a
    // 90° step, not a tween — he is on his side, then he is up.
    ctx.translate(LAMBY.x - 44, FLOOR_Y - 66);
    ctx.rotate(-Math.PI / 2);
    // a slow breath: the sleeping puppet scales a hair with the phrase's pulse
    const breath = 1 + 0.015 * Math.sin(t * 1.6);
    ctx.scale(breath, breath);
    // ⚑ asleep = the puppet's own blink frame, held (lambyChar.ts: phase 2.72–2.88
    //   of its 3.2 s cycle closes the eyes) — no second face is drawn for him
    drawLambyChar(ctx, 0, 0, { mood: 'clinical', action: 'idle', t: 2.8, moodStart: 0, scale: 0.9 });
    ctx.restore();
    // z z Z: one, two, three, then again — the cartoon's own count, in hard steps
    if (t >= E2_CARTOON.asleep && t < E2_CARTOON.light) {
      const n = Math.floor(t * 1.6) % 4;
      const Z: [number, number, number][] = [[64, 176, 12], [52, 156, 16], [36, 130, 22]];
      Z.slice(0, n).forEach(([zx, zy, size]) => {
        setFont(ctx, size);
        ctx.fillStyle = ERA1.white;
        ctx.fillText(size > 20 ? 'Z' : 'z', zx, zy);
      });
    }
  } else {
    const tAwake = t - E2_CARTOON.wake;
    const point = t >= E2_CARTOON.point;
    drawLambyChar(ctx, LAMBY.x, LAMBY.y, {
      mood: 'cheerful', action: point ? 'point' : (tAwake < 1.6 ? 'appear' : 'idle'),
      t: tAwake, moodStart: 0, scale: 1
    });
  }

  // ── the thought-cloud, and what the programme thinks a thought is ──
  const cloudIn = ramp(t, E2_CARTOON.cloud, E2_CARTOON.cloud + 1.2);
  if (t >= E2_CARTOON.cloud && t < E2_CARTOON.cloudGone) {
    // the bubbles pop up one by one from his head, then the cloud, all at once (a Flash cartoon's pop, not a fade)
    BUBBLES.forEach(([bx, by, r], i) => { if (cloudIn > i * 0.22) bubble(ctx, bx, by, r); });
    if (cloudIn >= 0.66) {
      // the scribble: static, thickening with the phrase — never a picture of anything; once it is thick the cloud
      //   goes dark and shakes (a pixel each way, three times a second: a jolt, not a flash)
      const sk = ramp(t, E2_CARTOON.scribble, E2_CARTOON.scribble + 3.0);
      const jolt = sk > 0.35 && !reducedMotion() ? (Math.floor(t * 3) % 2 ? 1 : -1) : 0;
      blitGrid(ctx, sk > 0.35 ? storm : cloud, CLOUD.x - 80 + jolt, CLOUD.y - 50);
      if (t >= E2_CARTOON.scribble - 0.6) {
        const r = rng(7 + Math.floor(t * 3));
        const n = Math.round(10 + sk * 80);
        let x = 112, y = 108;
        for (let i = 0; i < n; i++) {
          const nx = Math.max(100, Math.min(200, x + Math.round((r() - 0.5) * 30)));
          const ny = Math.max(90, Math.min(130, y + Math.round((r() - 0.5) * 16)));
          stroke(ctx, x + jolt, y, nx + jolt, ny, i % 3 ? ERA1.black : (sk > 0.35 ? ERA1.white : ERA1.greyDark));
          if (sk > 0.6 && i % 2 === 0) stroke(ctx, x + jolt, y + 1, nx + jolt, ny + 1, ERA1.black);
          x = nx; y = ny;
        }
      }
    }
  }
  // …and when the light has it, it breaks into pixels and blows away from the screen
  if (t >= E2_CARTOON.cloudGone && t < E2_CARTOON.cloudGone + 1.4) {
    const g = (t - E2_CARTOON.cloudGone) / 1.4;
    const r = rng(41);
    for (let i = 0; i < 120; i++) {
      const p = PUFFS[i % PUFFS.length];
      const a = r() * Math.PI * 2, d = r() * p[2];
      const bx = CLOUD.x + p[0] + Math.cos(a) * d, by = CLOUD.y + p[1] + Math.sin(a) * d * 0.8;
      const gone = r() < g * 1.1;   // fewer as it goes
      const ddx = bx - BEAM.x, ddy = by - BEAM.y, len = Math.hypot(ddx, ddy) || 1;
      const sp = 40 + r() * 70;
      const CONF = [ERA1.white, CAL_2003.sunCore, ERA1.titleBlue, CAL_2003.sun, ERA1.tooltip, ERA1.warn];
      if (!gone) px(ctx, Math.round(bx + (ddx / len) * sp * g), Math.round(by + (ddy / len) * sp * g - 24 * g), 3, 3, CONF[i % CONF.length]);
    }
  }

  // ── the screen writes what is right: a big tick, the mark, the streak ──
  if (t >= E2_CARTOON.screen) {
    const s = t - E2_CARTOON.screen;
    const tx = GLASS.x + 22, ty = GLASS.y + 38;
    if (s > 0.2) {
      bubble(ctx, tx, ty, 15);
      const ticks = Math.min(20, Math.floor((s - 0.2) / 0.03));
      for (let i = 0; i < ticks; i++) {
        if (i < 7) px(ctx, tx - 9 + i, ty - 1 + i, 3, 3, ERA1.ok);
        else px(ctx, tx - 3 + (i - 7), ty + 5 - (i - 7), 3, 3, ERA1.ok);
      }
    }
    setFont(ctx, 12);
    ctx.fillStyle = ERA1.white;
    const mark = S.mark.slice(0, Math.min(S.mark.length, Math.floor(s / 0.12) + 1));
    ctx.fillText(mark, GLASS.x + 44, GLASS.y + 12);
    if (s > 1.4) {
      px(ctx, GLASS.x + 44, GLASS.y + 28, GLASS.w - 52, 1, ERA1.white);
      setFont(ctx, 9);
      ctx.fillStyle = ERA1.tooltip;
      ctx.fillText(S.streakLabel, GLASS.x + 44, GLASS.y + 34);
      if (s > 2.2) {
        setFont(ctx, 14);
        ctx.fillStyle = ERA1.white;
        ctx.fillText(S.streakDays, GLASS.x + 44, GLASS.y + 48);
      }
    }
  }

  // ── and everything else the programme can think of ──
  if (t >= E2_CARTOON.cloudGone) {
    // flowers pop up out of the hill, one after another
    const FL: [number, string][] = [[24, ERA1.warn], [66, CAL_2003.sun], [252, ERA1.white], [292, ERA1.warn], [318, CAL_2003.sun], [500, ERA1.warn],
      [18, ERA1.white], [276, CAL_2003.sun]];
    FL.forEach(([fx, col], i) => { if (t >= E2_CARTOON.cloudGone + 0.3 + i * 0.35) flower(ctx, fx, FLOOR_Y + 14 + (i % 3) * 10, col); });
    // two birds crossing the sky
    const bt = t - E2_CARTOON.cloudGone, flap = Math.floor(t * 2) % 2 === 0;
    bird(ctx, Math.round(-20 + bt * 34) % (W + 40), 96, flap);
    bird(ctx, Math.round(-60 + bt * 34) % (W + 40), 116, !flap);
  }
  if (t >= E2_CARTOON.wake + 0.5) {
    // the halo: he wakes pure
    const hy = LAMBY.y - 74 + (Math.floor(t * 1.5) % 2);
    for (let dx = -22; dx <= 22; dx++) {
      const e = Math.round(5 * Math.sqrt(Math.max(0, 1 - (dx * dx) / (22 * 22))));
      px(ctx, LAMBY.x + dx, hy - e - 1, 1, 3, CAL_2003.sun);
      px(ctx, LAMBY.x + dx, hy + e - 1, 1, 3, CAL_2003.sun);
      if (dx % 4 === 0) { px(ctx, LAMBY.x + dx, hy - e - 1, 1, 1, CAL_2003.sunCore); }
    }
  }
  if (t >= E2_CARTOON.screen) {
    // RESTORIFY drops in from the top and lands with a bounce (steps, no tween)
    const s = t - E2_CARTOON.screen;
    const y = s < 0.15 ? -40 : s < 0.3 ? 30 : s < 0.45 ? 14 : 22;
    wordArt(ctx, S.mark, 172, y, 48);
    // …and the streak is stamped on, big
    if (s > 2.2) {
      const b = burst(), sc = s < 2.32 ? 1.3 : s < 2.44 ? 0.9 : 1;
      const bw = Math.round(b.width * sc), cx = 296, cy = 112;
      blitGrid(ctx, b, cx - bw / 2, cy - bw / 2, bw, bw);
      setFont(ctx, 11);
      ctx.fillStyle = ERA1.navy;
      const tw = Math.ceil(ctx.measureText(S.streakDays).width);
      ctx.fillText(S.streakDays, Math.round(cx - tw / 2), cy - 7);
    }
  }
}
