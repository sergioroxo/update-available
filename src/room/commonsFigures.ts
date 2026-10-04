/**
 * ⚑ THE COMMONS' PEOPLE (2026-09-12) — figures in the room, one mesh, one draw
 * call, and a stage for the one who has the floor.
 *
 * Sérgio, on the lamps of S133: *"Where is the livestream of TransJesus, or the
 * ball playing, or the VRChat… I gave you some great ideas on how to create the
 * narrative, and you keep ignoring me."* His ruling the same day: **figures in
 * the room AND a livestream window.** This file is the figures.
 *
 * ⚑ NO CHARACTER MODEL EXISTS IN THIS BUILD, and rather than wait for one these
 * are made the way the piece already draws a crowd in its photographs
 * (`photograph()`, variant 2): faceless, a body and a head, uneven heights,
 * uneven spacing, warm textile colours, never a face. A dozen, not forty-one —
 * the lamps stay as the room's light; these are who is holding them. They are
 * LIT by the room (the ball's own lights, `cluster.ts`), not emissive, so they
 * sit in the space rather than glow in it. One `pc.Mesh` with vertex colours,
 * rebuilt at 8 Hz so the crowd sways and the one on the stage walks — cheap,
 * and the only way a single draw call can move fourteen people.
 *
 * ⚑ PLACEMENT is the old ball's: the stage is in the open middle (Room 1's
 * floor, `BALL_STATIONS[3]`), BEHIND the E4 seat, so the room turns the player
 * round; and two of them stand in Room 3 beside the desk so the space visibly
 * begins for a player who has not yet turned. Nobody within the seat's clear
 * radius, nobody in the desk wall.
 *
 * Respite law: nothing here is a trap, nothing is revealed as fake, and the
 * apparatus never touches these — they exist only while the room does.
 */
import * as pc from 'playcanvas';
import { PLACE, ERA4 } from '../desktop/theme/era4';
import { WORLD } from './commonsWorld';
import nodesData from '../../data/room/nodes.json';

const FIGURES = 22;   // ⚑ 2026-09-13: 14 → 22, and placed where the seat can SEE them (below)
const SUNK_Y = -40;
const RISE_SECONDS = 2.2;
const SEAT = { x: 4.4, z: 0.7, clear: 1.3 };
/** ⚑ 2026-09-12: the stage is the WORLD's (commonsWorld.ts) — in front of her,
 *  where a hall's stage is — and the crowd stands between her and it, and
 *  around her, the way you stand in a crowd. */
const STAGE = { x: WORLD.stage.x, y: 0.0, z: WORLD.stage.z, w: WORLD.stage.w, d: WORLD.stage.d, h: WORLD.stage.h };
const REBUILD_HZ = 12;   // ⚑ S209g / M1 — 8 → 12: a dance needs more frames than a sway
/** ⚑ S209g / I3 — the crowd's ring (nodes.json `commons-crowd`): while the room waits for her, the people
 *  around it step aside and open their arms — a gap is the invitation, in the world, not a glow */
const CROWD_RING = ((nodesData.nodes as unknown as { id: string; marker: number[] }[]).find((n) => n.id === 'commons-crowd')?.marker) ?? [5.8, 0.03, -1.7];
const INVITE_RADIUS = 1.9, INVITE_STEP = 0.7, INVITE_SECONDS = 1.6;

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Figure { x: number; z: number; h: number; w: number; phase: number; body: pc.Color; onStage: boolean; beside?: boolean; lower?: pc.Color; hair?: pc.Color; style?: number; build?: number }

let hook: ((on: boolean) => void) | null = null;
/** the crowd is present, or it is not. It rises over RISE_SECONDS. */
export function setCommonsFigures(on: boolean): void { hook?.(on); }
let greetHook: ((on: boolean) => void) | null = null;
/** ⚑ S161 / R3-106 — the two beside her turn to her: they lean in a step and
 *  their sway lifts, for as long as the greeting is on the glass. Faceless
 *  bodies cannot look, so the gesture is the whole of it — and it is only
 *  ever these two, never the crowd, never the stage. */
export function greetCommonsFigures(on: boolean): void { greetHook?.(on); }
let inviteHook: ((on: boolean) => void) | null = null;
/** ⚑ S209g / I3 — the room makes space round the crowd's ring (ball.ts, while `wantsHer`) */
export function inviteCommonsFigures(on: boolean): void { inviteHook?.(on); }
let answerHook: (() => void) | null = null;
/** ⚑ S209g / I1 — she raised her lamp: the two beside her raise their arms with her */
export function answerCommonsFigures(): void { answerHook?.(); }
/** ⚑ S211 — where she stands in the hall: at "by the stage" she is ON the runway's line, and the
 *  performers walked through her (the tour's termination frame was a performer's back, 3 Oct) */
let herAtStage = false;
export function setCommonsHerSeat(nodeId: string | null): void { herAtStage = nodeId === 'commons-stage'; }
const GREET_SECONDS = 1.4;
const GREET_STEP = 0.45;

/**
 * ⚑ Phase 7 — THE SHOW, SEEN (his: "the Ball/Trans jesus, we need visually to see the show in some way").
 * The MC calls a category and its performers WALK it where she can see them: off the stage's front edge,
 * down the gap the crowd leaves in the middle, to a few metres from her, a turn, and back — slowly, the
 * way a floor is taken. The four Late Arrivals walk it together, abreast. A pale patch of light lies on
 * the floor under whoever has it. When the room answers a line (its `flare`) the crowd's arms go up.
 * All of it in the one mesh and the one draw call the crowd already had.
 */
export interface CommonsShow { performers: number; category: number; cheer: boolean }
let showHook: ((s: CommonsShow) => void) | null = null;
export function setCommonsShow(s: CommonsShow): void { showHook?.(s); }
const PERFORMERS = 4;
/** the runway: from the stage's front edge toward her, down the crowd's middle gap */
const RUNWAY = { from: WORLD.stage.x - WORLD.stage.d / 2 - 0.2, to: WORLD.seat.x + 1.7, z: WORLD.stage.z };   // the near end IN FRONT of the crowd (its nearest stand 2.6 m off)
/** one pass: out, a pause at the near end, back, a pause at the stage */
const WALK_OUT = 7.5, WALK_HOLD = 2.0;
const ARM_EASE = 0.5;

export function mountCommonsFigures(app: pc.Application, parent: pc.Entity): { update(dt: number): void } {
  const rng = makeRng(20260912);
  // ⚑ the crowd is dressed for it: the palette's brightest, not its greys
  const cloth = [PLACE.textileHi, PLACE.sunHi, ERA4.l, PLACE.book, PLACE.bookAlt, PLACE.textile, PLACE.sky, PLACE.sun]
    .map((h) => new pc.Color().fromString(h));
  const skin = new pc.Color().fromString(ERA4.photoSkin);
  const figures: Figure[] = [];
  // the one on the stage
  figures.push({ x: STAGE.x, z: STAGE.z, h: 1.68, w: 0.30, phase: 0, body: cloth[0], onStage: true });
  // two beside her, a stride and a half away either side, so she is IN the
  // crowd — ⚑ at half a metre a person fills the frame (measured); at 1.4 m
  // they are a person standing next to you
  for (const [x, z] of [[4.9, -1.7], [4.8, 3.1]] as const) {
    figures.push({
      x, z, h: 1.55 + rng() * 0.25, w: 0.26 + rng() * 0.08, phase: rng() * 6.28,
      body: cloth[1 + Math.floor(rng() * (cloth.length - 1))], onStage: false, beside: true
    });
  }
  // the rest between her and the stage, and a few behind her, uneven on purpose.
  // ⚑ 2026-09-13: measured from the seat — the frame at 2 m ahead is ±1.15 m,
  //   at 3.5 m ±2 m; the first cut spread the crowd over ±3.2 m and the seat
  //   saw nobody but the walker. Now they stand within the frame's band, either
  //   side of a gap down the middle, the way a crowd faces a stage.
  while (figures.length < FIGURES) {
    const behind = figures.length >= FIGURES - 3;
    const x = behind ? SEAT.x - 1.6 - rng() * 1.6 : SEAT.x + 2.6 + rng() * 1.4;   // ⚑ never nearer than 2.6 m: at 1.4 a figure was a wall, at 2.2 a door
    const side = rng() < 0.5 ? -1 : 1;
    const reach = 0.55 + (x - SEAT.x) * 0.5;   // the frame's half-width at that distance
    const z = behind ? STAGE.z + (rng() - 0.5) * 4.0 : STAGE.z + side * (0.55 + rng() * reach);
    if (Math.hypot(x - SEAT.x, z - SEAT.z) < 1.5) continue;
    if (x > STAGE.x - STAGE.d / 2 - 0.4) continue;
    figures.push({
      x, z, h: 1.5 + rng() * 0.32, w: 0.24 + rng() * 0.1, phase: rng() * 6.28,
      body: cloth[Math.floor(rng() * cloth.length)], onStage: false
    });
  }

  // ⚑ S211 (his: "the overall aesthetic is very boxy") — still faceless, never a likeness, but people:
  //   a lower garment and a top in different colours, a build (shoulders), and hair in four shapes
  const hairs = [PLACE.ink, PLACE.floorLo, PLACE.book, PLACE.sunHi, ERA4.l, PLACE.bookAlt].map((h) => new pc.Color().fromString(h));
  for (const f of figures) {
    f.lower = cloth[Math.floor(rng() * cloth.length)];
    f.hair = hairs[Math.floor(rng() * hairs.length)];
    f.style = Math.floor(rng() * 4);
    f.build = rng();
  }
  // ── geometry: every person is six pieces (legs, torso, head, hair, two arms) ──
  const C = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
  ];
  const F = [
    [0, 1, 2, 0, 2, 3], [4, 6, 5, 4, 7, 6], [0, 4, 5, 0, 5, 1],
    [3, 2, 6, 3, 6, 7], [0, 3, 7, 0, 7, 4], [1, 5, 6, 1, 6, 2]
  ];
  // Phase 7: each figure also has two arms; the performers are four more figures with arms; one patch of light
  const PER = 9;   // ⚑ S212: legs, torso, head (two crossed pieces), hair, and each arm with its hand
  // ⚑ S213 (his: "go ahead with the costumes for the performers") — the ones who walk are dressed for it:
  //   two costume pieces each, chosen by the category being walked (the four Late Arrivals one each)
  const PERF_PER = PER + 2;
  const BOXES = FIGURES * PER + PERFORMERS * PERF_PER + 1 + 1;
  const indices: number[] = [];
  for (let n = 0; n < BOXES; n++) for (const face of F) for (const i of face) indices.push(n * 8 + i);
  const colors: number[] = [];
  const pushBoxColor = (c: pc.Color): void => { for (let i = 0; i < 8; i++) colors.push(c.r, c.g, c.b, 1); };
  for (const f of figures) { pushBoxColor(f.lower!); pushBoxColor(f.body); pushBoxColor(skin); pushBoxColor(skin); pushBoxColor(f.hair!); pushBoxColor(f.body); pushBoxColor(skin); pushBoxColor(f.body); pushBoxColor(skin); }
  // the performers, dressed for it: the palette's brightest, one each
  const perfCloth = [PLACE.textileHi, PLACE.sunHi, PLACE.sky, PLACE.bookAlt].map((h) => new pc.Color().fromString(h));
  const perfH = [1.72, 1.6, 1.66, 1.58];
  const perfHair = [PLACE.ink, PLACE.sunHi, PLACE.book, PLACE.floorLo].map((h) => new pc.Color().fromString(h));
  for (let i = 0; i < PERFORMERS; i++) { pushBoxColor(perfCloth[(i + 1) % PERFORMERS]); pushBoxColor(perfCloth[i]); pushBoxColor(skin); pushBoxColor(skin); pushBoxColor(perfHair[i]); pushBoxColor(perfCloth[i]); pushBoxColor(skin); pushBoxColor(perfCloth[i]); pushBoxColor(skin); pushBoxColor(skin); pushBoxColor(skin); }
  pushBoxColor(new pc.Color().fromString(PLACE.sunHi));      // the light on the floor under them
  pushBoxColor(new pc.Color().fromString(PLACE.floorLo));

  const PERF_BOXES = PERFORMERS * PERF_PER + 1;
  const boxIdx = (n: number): number[] => { const out: number[] = []; for (let b = 0; b < n; b++) for (const face of F) for (const i of face) out.push(b * 8 + i); return out; };
  const indicesA = boxIdx(BOXES - PERF_BOXES), indicesB = boxIdx(PERF_BOXES);
  const cA0 = FIGURES * PER * 32, cB1 = (FIGURES * PER + PERF_BOXES) * 32;
  const colorsA = colors.slice(0, cA0).concat(colors.slice(cB1)), colorsB = colors.slice(cA0, cB1);
  void indices;
  const mesh = new pc.Mesh(app.graphicsDevice);
  const perfMesh = new pc.Mesh(app.graphicsDevice);
  const positions = new Array<number>(BOXES * 8 * 3).fill(0);
  let pi = 0;
  const box = (x: number, y: number, z: number, hx: number, hy: number, hz: number): void => {
    for (const [cx, cy, cz] of C) {
      positions[pi++] = x + cx * hx; positions[pi++] = y + cy * hy; positions[pi++] = z + cz * hz;
    }
  };
  let t = 0;
  // Phase 7 — the show's state: who is walking (and since when), how high the arms are
  let show: CommonsShow = { performers: 0, category: -1, cheer: false };
  let walkT = 0;
  let armK = 0;
  const sinkBox = (x: number, z: number): void => box(x, SUNK_Y, z, 0.1, 0.1, 0.1);
  const sinkPerson = (x: number, z: number): void => { for (let k = 0; k < PER; k++) sinkBox(x, z); };
  type Costume = 'gown' | 'cape' | 'train' | 'pads';
  const COSTUME_BY_CATEGORY: Costume[] = ['gown', 'pads', 'cape', 'train'];
  const LATE_ARRIVALS: Costume[] = ['pads', 'gown', 'cape', 'train'];
  const costumeOf = (cat: number, i: number, n: number): Costume => n > 1 ? LATE_ARRIVALS[i % 4] : COSTUME_BY_CATEGORY[Math.max(0, cat) % 4];
  const COSTUME_COLOURS: Record<Costume, [pc.Color, pc.Color]> = {
    gown: [new pc.Color().fromString(PLACE.textileHi), new pc.Color().fromString(PLACE.sunHi)],   // a flared skirt, a crown
    cape: [new pc.Color().fromString(PLACE.book), new pc.Color().fromString(PLACE.sunHi)],        // a red cape, a gold collar
    train: [new pc.Color().fromString(PLACE.sky), new pc.Color().fromString(PLACE.sunHi)],        // a long train, a tiara
    pads: [new pc.Color().fromString(ERA4.l), new pc.Color().fromString(PLACE.ink)]                // shoulders, tall hair
  };
  /** two costume pieces over a performer; `back` is the side they walk away from (+x on the way out) */
  const costume = (kind: Costume, x: number, base: number, z: number, w: number, h: number, bob: number): void => {
    const headH = h * 0.055, shoulderY = base + h * 0.64 + bob, headTop = shoulderY + 0.03 + headH * 2;
    if (kind === 'gown') {
      taper(x, base + h * 0.2 + bob * 0.5, z, h * 0.2, w * 0.55, w * 0.95, w * 0.3, w * 0.45);
      box(x, headTop + 0.05, z, 0.03, 0.06, 0.07);
    } else if (kind === 'cape') {
      box(x + w * 0.36, base + h * 0.42 + bob, z, 0.015, h * 0.24, w * 0.66);
      box(x, shoulderY + 0.02, z, w * 0.32, 0.035, w * 0.5);
    } else if (kind === 'train') {
      box(x + w * 0.3 + 0.36, base + 0.012, z, 0.4, 0.01, w * 0.55);
      box(x, headTop + 0.02, z, 0.02, 0.025, 0.08);
    } else {
      box(x, shoulderY - 0.01, z, w * 0.32, 0.035, w * 0.88);
      box(x, headTop + 0.12, z, headH * 0.9, 0.12, headH * 0.9);
    }
  };
  /** a piece narrower or wider at the top than the bottom (half-sizes: depth hx, width hz) */
  const taper = (x: number, y: number, z: number, hy: number, bx: number, bz: number, tx: number, tz: number): void => {
    for (const [cx, cy, cz] of C) {
      const top = cy > 0;
      positions[pi++] = x + cx * (top ? tx : bx); positions[pi++] = y + cy * hy; positions[pi++] = z + cz * (top ? tz : bz);
    }
  };
  /** ⚑ S211 — a person, faceless: legs (or a skirt) tapering to the floor, a torso widening to the shoulders,
   *  a head, hair in one of four shapes behind and over it, and two arms. Six pieces, the same draw call. */
  const person = (x: number, base: number, z: number, w: number, h: number, bob: number, lean: number, up: number, style: number, build: number): void => {
    const legH = h * 0.40, torsoH = h * 0.24, headH = h * 0.055;
    const skirt = style === 1;
    taper(x + lean * 0.3, base + legH / 2 + bob * 0.5, z, legH / 2, w * 0.28, w * (skirt ? 0.62 : 0.40), w * 0.27, w * 0.44);
    const sh = w * (0.48 + 0.12 * build);
    const ty = base + legH + torsoH / 2 + bob;
    taper(x + lean, ty, z, torsoH / 2, w * 0.27, w * 0.44, w * 0.3, sh);
    const hy = base + legH + torsoH + 0.03 + headH + bob, hx = x + lean * 1.4;
    // ⚑ S212 — a rounder head: two crossed pieces read near-octagonal from any side, and keep to 90° steps
    box(hx, hy, z, headH * 0.92, headH * 0.78, headH);
    box(hx, hy, z, headH * 0.7, headH, headH * 0.76);
    if (style === 0) box(hx - headH * 0.12, hy + headH * 0.62, z, headH * 1.02, headH * 0.42, headH * 1.06);          // short
    else if (style === 1) box(hx - headH * 0.55, hy - headH * 0.55, z, headH * 0.55, headH * 1.55, headH * 1.1);     // long, down the back
    else if (style === 2) box(hx - headH * 0.15, hy + headH * 0.35, z, headH * 1.3, headH * 1.05, headH * 1.35);     // big, round
    else box(hx - headH * 0.2, hy + headH * 1.1, z, headH * 0.5, headH * 0.45, headH * 0.5);                          // a bun
    arms(x + lean, base + legH + torsoH + bob, z, sh * 2, h, up);
  };
  /** two arms at a body's shoulders: down at its sides, or up over its head by `up` (0..1) */
  const arms = (x: number, top: number, z: number, w: number, h: number, up: number): void => {
    const len = h * 0.3, hw = 0.035;
    for (const side of [-1, 1]) {
      const sz = z + side * (w / 2 + hw + 0.01);
      const k = up * up * (3 - 2 * up);
      const cy = top + (k * 2 - 1) * (len / 2 + 0.02);
      box(x, cy, sz, hw, len / 2, hw);   // hanging at the side → raised over the shoulder
      // ⚑ S212 — a hand at the arm's end: below it when the arm hangs, above it when raised
      const end = cy + (k * 2 - 1) * (len / 2 + 0.03);
      box(x, end, sz, hw * 1.15, 0.03, hw * 1.15);
    }
  };
  const build = (k: number, stageK: number): void => {
    pi = 0;
    const sunk = k <= 0;
    figures.forEach((f, n) => {
      if (sunk) { sinkPerson(f.x, f.z); return; }
      // rising from the floor, then the dance — ⚑ S209g / M1 (his tick): a bounce on the beat (two a
      //   second, each a little out of step with the next), a side-to-side sway on the bar, a lean; it was
      //   a 2 cm sway nobody could see, and the crowd read as boxes
      const rise = (k - 1) * (f.h + 0.4);
      const beat = t * Math.PI * 2 + f.phase * 0.35;
      let bob = 0.045 * Math.abs(Math.sin(beat));
      let lean = 0.035 * Math.sin(t * 0.8 + f.phase * 1.7);
      let x = f.x, z = f.z;
      if (!f.onStage) z += 0.06 * Math.sin(beat / 2);
      // ⚑ S209g / I3 — make room: step out from the ring, and turn the body toward her
      let inviteArms = 0;
      if (inviteK > 0 && !f.onStage) {
        const dx = f.x - CROWD_RING[0], dz = f.z - CROWD_RING[2], d = Math.hypot(dx, dz);
        if (d < INVITE_RADIUS && d > 0.01) {
          const w = inviteK * (1 - d / INVITE_RADIUS * 0.5);
          x += (dx / d) * INVITE_STEP * w; z += (dz / d) * INVITE_STEP * w;
          lean += Math.sign(SEAT.x - f.x) * 0.05 * w;
          inviteArms = 0.45 * w;
        }
      }
      if (f.beside && greetK > 0) {
        // the greeting's gesture: a step toward her seat, a lean, the sway lifted
        z += Math.sign(SEAT.z - f.z) * GREET_STEP * greetK;
        lean += Math.sign(SEAT.x - f.x) * 0.06 * greetK;
        bob += 0.035 * greetK * Math.max(0, Math.sin(t * 2.6 + f.phase));
      }
      if (f.onStage) {
        // the one with the floor: a slow walk along the stage and back
        x = STAGE.x - 0.3 + Math.cos(t * 0.17) * 0.3;
        z = STAGE.z + Math.sin(t * 0.25) * 0.6;   // a slow walk — ⚑ 0.6 m either way, not 1.0: from the 'by the stage' marker she walked out of frame
      }
      const base = (f.onStage ? STAGE.y + STAGE.h : 0.02) + rise;
      // half-sizes: a body 0.62 of the height and the width given; a head a
      // fifth of the height across (half = 0.055 h) — the first cut passed the
      // head's SIZE as its half-size and rendered 0.38 m heads on 0.26 m bodies
      // the arms: the crowd's go up when the room answers (not the one on the stage, not the two beside her mid-greeting)
      const answer = f.beside ? answerK : 0;
      const up = f.onStage || (f.beside && greetK > 0) ? 0 : Math.max(armK * (0.75 + 0.25 * Math.sin(f.phase)), inviteArms, answer);
      person(x, base, z, f.w, f.h, bob, lean, up, f.style ?? 0, f.build ?? 0.5);
      void n;
    });
    // ⚑ Phase 7 — the performers: down the runway and back, abreast, for as long as their category is called
    const nWalk = sunk ? 0 : Math.min(PERFORMERS, show.performers);
    const cycle = WALK_OUT * 2 + WALK_HOLD * 2;
    const ph = walkT % cycle;
    const leg = ph < WALK_OUT ? ph / WALK_OUT : ph < WALK_OUT + WALK_HOLD ? 1
      : ph < WALK_OUT * 2 + WALK_HOLD ? 1 - (ph - WALK_OUT - WALK_HOLD) / WALK_OUT : 0;
    const e = leg * leg * (3 - 2 * leg);
    // she is at the stage's edge: they perform up ON the stage, to her, and do not come down the runway
    const px = herAtStage ? WORLD.stage.x - 0.5 : RUNWAY.from + (RUNWAY.to - RUNWAY.from) * e;
    const pBase = herAtStage ? WORLD.stage.h + 0.02 : 0.02;
    for (let i = 0; i < PERFORMERS; i++) {
      if (i >= nWalk) { sinkPerson(px, RUNWAY.z); sinkBox(px, RUNWAY.z); sinkBox(px, RUNWAY.z); continue; }
      const z = RUNWAY.z + (i - (nWalk - 1) / 2) * 0.55;
      const h = perfH[i], w = 0.3;
      const step = Math.abs(Math.sin(walkT * 3.2 + i)) * 0.025 * (leg > 0 && leg < 1 ? 1 : 0.2);
      person(px, pBase, z, w, h, step, 0, herAtStage || leg >= 1 ? 0.9 : 0.15, [1, 0, 2, 3][i], [0.2, 0.9, 0.5, 0.3][i]);   // at the near end, the arms open to the room
      const kind = costumeOf(show.category, i, nWalk);
      costume(kind, px, pBase, z, w, h, step);
      // the costume's colours live in the performers' own colour stream: set them for this walker
      const [ca, cb] = COSTUME_COLOURS[kind];
      for (const [slot, c] of [[PER, ca], [PER + 1, cb]] as const) {
        const o = (i * PERF_PER + slot) * 32;
        for (let v = 0; v < 8; v++) { colorsB[o + v * 4] = c.r; colorsB[o + v * 4 + 1] = c.g; colorsB[o + v * 4 + 2] = c.b; colorsB[o + v * 4 + 3] = 1; }
      }
    }
    // the light under them — a flat pale patch, on the floor, where they are
    if (nWalk > 0) box(px, pBase - 0.008, RUNWAY.z, 0.55, 0.004, 0.35 + nWalk * 0.28);
    else sinkBox(px, RUNWAY.z);
    // (the stage itself is the hall's — commonsWorld.ts; this box is spare and sunk)
    box(STAGE.x, SUNK_Y, STAGE.z, 0.1, 0.1, 0.1); void stageK;
    // ⚑ Phase 7 — two meshes from the one buffer: the crowd, lit by the room; the performers and their
    //   patch of light, lit from within, so the one who has the floor is the brightest thing in the hall
    const A0 = FIGURES * PER * 24, B1 = (FIGURES * PER + PERF_BOXES) * 24;
    const posA = positions.slice(0, A0).concat(positions.slice(B1)), posB = positions.slice(A0, B1);
    mesh.setPositions(posA);
    mesh.setIndices(indicesA);
    mesh.setColors(colorsA);   // floats 0..1 — setColors32 wants bytes, and read these as black
    mesh.setNormals(pc.calculateNormals(posA, indicesA));
    mesh.update(pc.PRIMITIVE_TRIANGLES);
    perfMesh.setPositions(posB);
    perfMesh.setIndices(indicesB);
    perfMesh.setColors(colorsB);
    perfMesh.setNormals(pc.calculateNormals(posB, indicesB));
    perfMesh.update(pc.PRIMITIVE_TRIANGLES);
  };
  build(0, 0);

  const mat = new pc.StandardMaterial();
  mat.diffuse = new pc.Color(1, 1, 1);
  mat.diffuseVertexColor = true;
  mat.specular = new pc.Color(0, 0, 0);
  // ⚑ 2026-09-13: self-light in the cloth's OWN colour (emissiveVertexColor),
  //   not a grey — under the gold stage light every figure had gone tan
  mat.emissiveVertexColor = true;
  mat.emissive = new pc.Color(0.42, 0.42, 0.42);
  mat.update();
  const ent = new pc.Entity('commons-figures');
  // the performers' material: the same vertex colours, lit from within at nearly full
  const perfMat = new pc.StandardMaterial();
  perfMat.diffuse = new pc.Color(1, 1, 1);
  perfMat.diffuseVertexColor = true;
  perfMat.specular = new pc.Color(0, 0, 0);
  perfMat.emissiveVertexColor = true;
  perfMat.emissive = new pc.Color(0.92, 0.92, 0.92);
  perfMat.update();
  ent.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, mat), new pc.MeshInstance(perfMesh, perfMat)] });
  ent.render!.meshInstances[0].cull = false;
  ent.render!.meshInstances[1].cull = false;
  ent.enabled = false;
  parent.addChild(ent);

  (window as unknown as { __commonsFigures?: unknown }).__commonsFigures = figures.map(f => [+f.x.toFixed(2), +f.z.toFixed(2), +f.h.toFixed(2), f.onStage]);
  let want = false;
  let k = 0;
  let acc = 0;
  let greetWant = false;
  let greetK = 0;
  let inviteWant = false;
  let inviteK = 0;
  let answerT = -1;
  let answerK = 0;
  hook = (on) => { want = on; if (on) ent.enabled = true; };
  greetHook = (on) => { greetWant = on; };
  inviteHook = (on) => { inviteWant = on; };
  answerHook = () => { answerT = 0; };
  showHook = (s) => { if (s.category !== show.category) walkT = 0; show = s; };
  return {
    update(dt: number): void {
      if (!ent.enabled) return;
      t += dt;
      const before = k;
      k = want ? Math.min(1, k + dt / RISE_SECONDS) : Math.max(0, k - dt / RISE_SECONDS);
      greetK = greetWant ? Math.min(1, greetK + dt / GREET_SECONDS) : Math.max(0, greetK - dt / GREET_SECONDS);
      inviteK = inviteWant ? Math.min(1, inviteK + dt / INVITE_SECONDS) : Math.max(0, inviteK - dt / INVITE_SECONDS);
      if (answerT >= 0) { answerT += dt; answerK = answerT < 0.4 ? answerT / 0.4 : answerT > 2.2 ? Math.max(0, 1 - (answerT - 2.2) / 0.5) : 1; if (answerT > 2.7) { answerT = -1; answerK = 0; } }
      if (show.performers > 0) walkT += dt;
      armK = show.cheer ? Math.min(1, armK + dt / ARM_EASE) : Math.max(0, armK - dt / (ARM_EASE * 3));
      acc += dt;
      if (acc < 1 / REBUILD_HZ && k === before) return;
      acc = 0;
      build(k, k);
      if (k <= 0 && !want) ent.enabled = false;
    }
  };
}
