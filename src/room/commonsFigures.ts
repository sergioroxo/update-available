/**
 * ⚑ THE COMMONS' PEOPLE (2026-09-12) — figures in the room, one mesh, one draw
 * call, and a stage for the one who has the floor.
 *
 * Sérgio, on the lamps of S133: *"Where is the livestream of TransJesus, or the
 * ball playing, or the VRChat… I gave you some great ideas on how to create the
 * narrative, and you keep ignoring me."* His ruling the same day: **figures in
 * the room AND a livestream window.** This file is the figures.
 *
 * ⚑ S377 — and made as PEOPLE, not mannequins (his ruling on job 19 A; see mountCommonsFigures).
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
import { CAL_2026 as C26 } from '../desktop/theme/calendar';
import { WORLD } from './commonsWorld';
import nodesData from '../../data/room/nodes.json';

const FIGURES = 22;   // ⚑ 2026-09-13: 14 → 22, and placed where the seat can SEE them (below)
const SUNK_Y = -40;
const RISE_SECONDS = 2.2;
/** ⚑ S227 — where SHE stands: the one spot (commonsWorld.ts `WORLD.spot`, nodes.json `commons-spot`), at the
 *  front of the crowd. Everything below that was measured from Maya's seat is measured from here now. */
const SEAT = { x: WORLD.spot.x, z: WORLD.spot.z, clear: 1.3 };
/** ⚑ 2026-09-12: the stage is the WORLD's (commonsWorld.ts) — in front of her,
 *  where a hall's stage is — and the crowd stands between her and it, and
 *  around her, the way you stand in a crowd. */
const STAGE = { x: WORLD.stage.x, y: 0.0, z: WORLD.stage.z, w: WORLD.stage.w, d: WORLD.stage.d, h: WORLD.stage.h };
const REBUILD_HZ = 12;   // ⚑ S209g / M1 — 8 → 12: a dance needs more frames than a sway
/** ⚑ S209g / I3 — while the room waits for her, the people near her open their arms toward her.
 *  ⚑ S227 — centred on HER now (the spot), and nobody steps away: the ring she was asked to walk to is
 *  retired with the markers, and what the room asks for is her lamp (his §8 Q2). The gesture is the ask. */
const CROWD_RING = ((nodesData.nodes as unknown as { id: string; marker: number[] }[]).find((n) => n.id === 'commons-spot')?.marker) ?? [WORLD.spot.x, 0.03, WORLD.spot.z];
const INVITE_RADIUS = 3.2, INVITE_STEP = 0, INVITE_SECONDS = 1.6;

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

interface Figure {
  x: number; z: number; h: number; w: number; phase: number; body: pc.Color; onStage: boolean; beside?: boolean; lower?: pc.Color; hair?: pc.Color; style?: number; build?: number; from?: { x: number; z: number }; delay?: number; walk?: number;
  /** ⚑ S377 — a person, not a mannequin: their skin, their shoes, what they wear over it, their sleeves, what their hands do */
  skin?: pc.Color; shoe?: pc.Color; outfit?: number; jacket?: pc.Color; sleeves?: boolean; pose?: number;
}

/**
 * ⚑ S370 / C1 (his, 11 Nov: "the raid still doesn't make sense visually… How is the transition to the raid? How is it
 * explained visually?"; UIB_JOB_16 Part C1 step 3) — THE PEOPLE ARRIVE, VISIBLY, FROM THE SIDES. The crowd no longer
 * rises out of the floor where it will stand (nobody saw it: half of it stood outside a Quest eye's frame, and a rise
 * in place reads as nothing arriving). Each person WALKS IN to their place: the left half from beyond the stage's far
 * left, the right half from the foot of the host's screen (the raid came out of that stream), each at a walk, a little
 * out of step with the next. The first half of every path is inside the seat's view (≈30–45° off his line of sight),
 * so the arrival is seen without a turn; nobody comes from behind him (his D2). One mesh, one draw call, as before.
 */
const ARRIVE_SPEED = 1.25;    // m/s — a walk
const ARRIVE_STAGGER = 1.6;   // s — the last one sets off this long after the first
/** the longest walk-in (from the farthest entry), in seconds: the presence clock `k` runs over this */
const ARRIVE_SECONDS = 6.2;

/**
 * ⚑ S370 / C1 — TRANSJESUS STEPS ON. At the raid, once the crowd is in, the people's dancing one walks on from the
 * stage's far left, across the front of the stage (through the middle of his view), to TJ_SPOT, ≈14° right of the seat's
 * line of sight — just left of the host's screen, where a presenter would stand beside the broadcast (the host's own
 * hologram stands at the screen's other side, and is pushed off its pad: commonsHost.ts `shoveCommonsHost`). There it
 * dances, wordless, for the rest of the night. 14° and not dead ahead: the picture comes to the front for the naming
 * (ball.ts, `CARD_NAMING`) and would hide them.
 */
export const TJ_WALK_SECONDS = 3.0;
const TJ_FROM = { x: WORLD.stage.x - 0.3, z: WORLD.stage.z - 2.3 };
const TJ_SPOT = { x: WORLD.stage.x - 0.4, z: 1.75 };

let hook: ((on: boolean) => void) | null = null;
/** the crowd is present, or it is not. ⚑ S370 / C1: it WALKS IN from the sides over ARRIVE_SECONDS (it used to rise). */
export function setCommonsFigures(on: boolean): void { hook?.(on); }
let tjHook: ((on: boolean) => void) | null = null;
/** ⚑ S370 / C1 — TransJesus steps onto the stage (a walk, TJ_WALK_SECONDS) and dances there; off: gone */
export function setCommonsTransJesus(on: boolean): void { tjHook?.(on); }
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
let danceHook: ((on: boolean) => void) | null = null;
/** ⚑ S293 — THE STREAM (ENDING_TRANSJESUS): TransJesus dances on the floor — the one lit from within, on the stage,
 *  wordless — and the people dance with them, arms rising on the beat. Not contestants: nobody walks a runway. */
export function setCommonsDance(on: boolean): void { danceHook?.(on); }
/** ⚑ S209g / I1 — she raised her lamp: the two beside her raise their arms with her */
export function answerCommonsFigures(): void { answerHook?.(); }
/** ⚑ S211 — where she stands in the hall: at "by the stage" she is ON the runway's line, and the
 *  performers walked through her (the tour's termination frame was a performer's back, 3 Oct) */
//   ⚑ S227: there is one spot and it is not on the stage's edge, so this stays false; kept so the
//   performers' on-stage branch below still has its reason written down.
let herAtStage = false;
export function setCommonsHerSeat(nodeId: string | null): void { herAtStage = false; void nodeId; }
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
const RUNWAY = { from: WORLD.stage.x - WORLD.stage.d / 2 - 0.2, to: WORLD.spot.x + 1.7, z: WORLD.stage.z };   // ⚑ S227: to her, at the spot   // the near end IN FRONT of the crowd (its nearest stand 2.6 m off)
/** one pass: out, a pause at the near end, back, a pause at the stage */
const WALK_OUT = 7.5, WALK_HOLD = 2.0;
const ARM_EASE = 0.5;

/**
 * ⚑ S377 / his ruling on job 19 A (12 Nov: the stream's crowd reads as MANNEQUINS in the headset; make them read as
 * people, low-poly, inside the draw-call budget). What made them mannequins, measured from the S375 headset frames and
 * the geometry: one block for both legs as wide as the torso and no feet; the shoulders at 0.64 of the height and the
 * crown at 0.8 of it (a squat, childlike figure 1.3 m tall); arms hanging dead straight from the shoulder; one beige
 * skin for everyone; pastel cloth self-lit until it went grey; smooth normals on boxes (every piece a soft blob); and
 * nobody facing anywhere — the arrivals slid in sideways. Now, still faceless, still axis-aligned boxes (90° steps):
 *  - a person's proportions: hips at 0.5 of the height, shoulders at 0.8, a neck, a head of 0.125;
 *  - two legs and two shoes, the shoes pointing the way the person faces (the one cue a faceless body needs);
 *  - a waist and shoulders, a pelvis in the trousers' colour, a belt, a skirt, an open jacket over a T-shirt, a hoodie;
 *  - arms in two pieces and a hand: hanging a little off the body, or one forearm forward (a drink, a phone);
 *  - skin, hair and clothes from the calendar's party (CAL_2026 — the shop's own crowd: four skins, four hairs, its
 *    shirts and flags) with the place's own colours: every tone from the theme;
 *  - each person FACES: the crowd the stage, the walkers the way they walk (legs stride, arms swing, opposite), the
 *    performers down the runway and back, TransJesus the room;
 *  - a weight shift and a small turn of the head between beats, so a standing person is never still the way a
 *    mannequin is;
 *  - flat-shaded (four vertices a face, normals set once, never recomputed): the low-poly reads as cut, not melted.
 * The arrival (S370 C1), the dance, the cheer, the greeting, the invitation, the show and TransJesus's walk-on are
 * unchanged: the same clocks drive the same places. Still one mesh for the crowd and one for the performers — two
 * draws, as before.
 */
export function mountCommonsFigures(app: pc.Application, parent: pc.Entity): { update(dt: number): void } {
  const rng = makeRng(20260912);
  const col = (h: string): pc.Color => new pc.Color().fromString(h);
  // the crowd is dressed for a ball: the calendar party's shirts and flags, the place's own warm cloth
  const tops = [C26.shirtA, C26.shirtB, C26.shirtC, C26.shirtD, C26.flagViolet, C26.flagOrange, C26.transPink, ERA4.l, PLACE.bookAlt, PLACE.textileHi, C26.transWhite, PLACE.book].map(col);
  const lowers = [C26.legs, PLACE.bookAlt, C26.flagBlue, PLACE.ink, C26.floor, PLACE.landLo, C26.legs, C26.flagViolet].map(col);
  const jackets = [C26.legs, PLACE.book, C26.flagGreen, PLACE.ink, C26.flagBlue, ERA4.lDim].map(col);
  const skins = [C26.skinA, C26.skinB, C26.skinC, C26.skinD, ERA4.photoSkin].map(col);
  const hairs = [C26.hairA, C26.hairD, C26.hairB, C26.hairC, C26.hairA, C26.hairD, ERA4.l, C26.transPink, PLACE.sunHi].map(col);
  const shoes = [C26.string, PLACE.ink, C26.transWhite, C26.string, PLACE.mug].map(col);
  const belt = col(C26.string);
  const figures: Figure[] = [];
  const cloth0 = tops[0];
  // the one on the stage
  figures.push({ x: STAGE.x, z: STAGE.z, h: 1.68, w: 0.30, phase: 0, body: cloth0, onStage: true });
  // two beside her, a stride and a half away either side, so she is IN the
  // crowd — ⚑ at half a metre a person fills the frame (measured); at 1.4 m
  // they are a person standing next to you
  // ⚑ S227 — at the spot: Junie a step ahead-left (she faces Junie as she arrives), Ade ahead-right, both
  //   inside the frame once she has turned to the stage, both clear of the runway's four abreast
  //   (measured from the spot's first frames: at 1.45 m Junie was a wall across half the frame; at ~2.1 m she
  //   is a person standing with you)
  for (const [x, z] of [[SEAT.x + 1.55, SEAT.z - 1.45], [SEAT.x + 1.7, SEAT.z + 1.3]] as const) {
    figures.push({
      x, z, h: 1.55 + rng() * 0.25, w: 0.26 + rng() * 0.08, phase: rng() * 6.28,
      body: tops[1 + Math.floor(rng() * 7)], onStage: false, beside: true
    });
  }
  // the rest between her and the stage, and a few behind her, uneven on purpose.
  // ⚑ 2026-09-13: measured from the seat — the frame at 2 m ahead is ±1.15 m,
  //   at 3.5 m ±2 m; the first cut spread the crowd over ±3.2 m and the seat
  //   saw nobody but the walker. Now they stand within the frame's band, either
  //   side of a gap down the middle, the way a crowd faces a stage.
  // ⚑ S227 — she is AT THE FRONT of the crowd now, so the crowd is beside and behind her: a flank either
  //   side of the stage's axis, framing the stage at the edges of her view, and the rest at her back.
  // ⚑ S359 / H24 (his D2, 10 Nov: the raid "should not force you to look behind you. It should be on the side") — the
  //   nine that stood at her back now rise AT HER SIDES, level with the desk seat (x 4.8–6.6), 2.6–3.8 m out left and
  //   right: the raid arrives in the edges of her view, and nobody is behind her.
  while (figures.length < FIGURES) {
    const flank = figures.length >= FIGURES - 9;
    const side = rng() < 0.5 ? -1 : 1;
    const x = flank ? SEAT.x - 0.4 + rng() * 1.8 : SEAT.x + 0.2 + rng() * 2.2;
    const z = flank ? SEAT.z + side * (2.6 + rng() * 1.2) : SEAT.z + side * (1.7 + rng() * 0.9);
    if (Math.hypot(x - SEAT.x, z - SEAT.z) < 1.5) continue;
    if (figures.some((g) => g.beside && Math.hypot(g.x - x, g.z - z) < 0.7)) continue;   // ⚑ S227: nobody inside Junie or Ade
    if (x > STAGE.x - STAGE.d / 2 - 0.4) continue;
    figures.push({
      x, z, h: 1.5 + rng() * 0.32, w: 0.24 + rng() * 0.1, phase: rng() * 6.28,
      body: tops[Math.floor(rng() * 8)], onStage: false
    });
  }

  // ⚑ S211 (his: "the overall aesthetic is very boxy") — still faceless, never a likeness, but people.
  // ⚑ S377 — and dressed and made as people (the header above): drawn from their own seed, so the places, heights and
  //   phases above are the ones they always had
  const dress = makeRng(20261112 + 377);
  const pick = <T>(a: T[]): T => a[Math.floor(dress() * a.length)];
  for (const f of figures) {
    f.body = pick(tops);
    f.lower = pick(lowers);
    f.hair = pick(hairs);
    f.style = Math.floor(dress() * 5);       // hair: crop, long, big, bun, shaved
    f.build = dress();
    f.skin = pick(skins);
    f.shoe = pick(shoes);
    f.outfit = Math.floor(dress() * 4);      // tee and belt, a dress, an open jacket, a hoodie
    f.jacket = pick(jackets);
    f.sleeves = dress() < 0.5;               // long sleeves
    f.pose = dress() < 0.35 ? (dress() < 0.5 ? 1 : 2) : 0;   // a third hold something in one hand
  }
  // ⚑ S370 / C1 — where each one walks in from (seeded apart from the layout above, so the places are unchanged): the
  //   left half from beyond the stage's far left corner, the right half from the foot of the host's screen, in front of
  //   its trusses (x < 9.6, so nobody walks through the frame); and when, and for how long
  const arrive = makeRng(20261112);
  for (const f of figures) {
    if (f.onStage) continue;
    const right = f.z > SEAT.z;
    f.from = right
      ? { x: 9.0 + arrive() * 0.3, z: 2.9 + arrive() * 2.0 }
      : { x: 10.3 + arrive() * 0.6, z: STAGE.z - STAGE.w / 2 - 0.8 - arrive() * 1.2 };
    f.delay = arrive() * ARRIVE_STAGGER;
    f.walk = Math.hypot(f.from.x - f.x, f.from.z - f.z) / ARRIVE_SPEED;
  }

  // ── geometry: flat-shaded boxes, four vertices a face (S377) ──
  /** a box's six faces: their normals and corners (the Close monitor's own table, closeMonitor.ts) */
  const FACES: { n: number[]; v: number[][] }[] = [
    { n: [0, 0, 1], v: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
    { n: [0, 0, -1], v: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] },
    { n: [0, 1, 0], v: [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]] },
    { n: [0, -1, 0], v: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]] },
    { n: [1, 0, 0], v: [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]] },
    { n: [-1, 0, 0], v: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]] }
  ];
  const VPB = 24;   // vertices a box
  // a person: legs ×2, shoes ×2, pelvis, torso, neck, head ×2 (crossed, near-round from any side), hair ×2,
  //   upper arm, forearm and hand ×2, and one piece of their outfit (belt, skirt, shirt front, hood)
  const PER = 18;
  const S = { legL: 0, legR: 1, shoeL: 2, shoeR: 3, pelvis: 4, torso: 5, neck: 6, headA: 7, headB: 8, hairA: 9, hairB: 10,
    uArmL: 11, fArmL: 12, handL: 13, uArmR: 14, fArmR: 15, handR: 16, extra: 17 } as const;
  // ⚑ S213 (his: "go ahead with the costumes for the performers") — the ones who walk are dressed for it:
  //   two costume pieces each, chosen by the category being walked (the four Late Arrivals one each)
  const PERF_PER = PER + 2;
  const CROWD_BOXES = FIGURES * PER;
  const PERF_BOXES = PERFORMERS * PERF_PER + 1 + 1;   // + the patch of light under them, + one spare
  const makeStatic = (boxes: number): { idx: Uint16Array | Uint32Array; nrm: Float32Array } => {
    const idx = boxes * VPB > 65535 ? new Uint32Array(boxes * 36) : new Uint16Array(boxes * 36);
    const nrm = new Float32Array(boxes * VPB * 3);
    for (let b = 0; b < boxes; b++) FACES.forEach((f, fi) => {
      const base = b * VPB + fi * 4;
      for (let k = 0; k < 4; k++) nrm.set(f.n, (base + k) * 3);
      idx.set([base, base + 1, base + 2, base, base + 2, base + 3], (b * 6 + fi) * 6);
    });
    return { idx, nrm };
  };
  const crowdStatic = makeStatic(CROWD_BOXES), perfStatic = makeStatic(PERF_BOXES);
  const posA = new Float32Array(CROWD_BOXES * VPB * 3), posB = new Float32Array(PERF_BOXES * VPB * 3);
  const colA = new Float32Array(CROWD_BOXES * VPB * 4), colB = new Float32Array(PERF_BOXES * VPB * 4);
  const paint = (cols: Float32Array, boxIndex: number, c: pc.Color): void => {
    for (let v = 0; v < VPB; v++) cols.set([c.r, c.g, c.b, 1], (boxIndex * VPB + v) * 4);
  };
  const C_TIGHTS = col(C26.legs);
  /** a person's colours, slot by slot */
  const paintPerson = (cols: Float32Array, first: number, f: { body: pc.Color; lower: pc.Color; hair: pc.Color; skin: pc.Color; shoe: pc.Color; outfit: number; jacket: pc.Color; sleeves: boolean }): void => {
    const dressed = f.outfit === 1, jacket = f.outfit === 2;
    const top = jacket ? f.jacket : f.body;
    const sleeve = top;
    const P = (slot: number, c: pc.Color): void => paint(cols, first + slot, c);
    const legs = dressed ? (f.sleeves ? C_TIGHTS : f.skin) : f.lower;   // under a dress: tights, or bare legs
    P(S.legL, legs); P(S.legR, legs);
    P(S.shoeL, f.shoe); P(S.shoeR, f.shoe);
    P(S.pelvis, f.lower); P(S.torso, top); P(S.neck, f.skin); P(S.headA, f.skin); P(S.headB, f.skin);
    P(S.hairA, f.hair); P(S.hairB, f.hair);
    P(S.uArmL, sleeve); P(S.uArmR, sleeve);
    P(S.fArmL, f.sleeves || jacket ? sleeve : f.skin); P(S.fArmR, f.sleeves || jacket ? sleeve : f.skin);
    P(S.handL, f.skin); P(S.handR, f.skin);
    P(S.extra, f.outfit === 0 ? belt : f.outfit === 1 ? f.lower : f.outfit === 2 ? f.body : top);
  };
  for (let n = 0; n < figures.length; n++) {
    const f = figures[n];
    paintPerson(colA, n * PER, { body: f.body, lower: f.lower!, hair: f.hair!, skin: f.skin!, shoe: f.shoe!, outfit: f.outfit!, jacket: f.jacket!, sleeves: !!f.sleeves });
  }
  // the performers, dressed for it: the palette's brightest, one each
  const perfCloth = [PLACE.textileHi, PLACE.sunHi, C26.transBlue, C26.flagViolet].map(col);
  const perfH = [1.72, 1.6, 1.66, 1.58];
  const perfHair = [C26.hairD, PLACE.sunHi, C26.hairC, C26.hairA].map(col);
  const perfSkin = [C26.skinC, C26.skinA, C26.skinB, C26.skinD].map(col);
  for (let i = 0; i < PERFORMERS; i++) {
    paintPerson(colB, i * PERF_PER, { body: perfCloth[i], lower: perfCloth[(i + 1) % PERFORMERS], hair: perfHair[i], skin: perfSkin[i], shoe: col(C26.string), outfit: 1, jacket: perfCloth[i], sleeves: false });
  }
  paint(colB, PERFORMERS * PERF_PER, col(PLACE.sunHi));       // the light on the floor under them
  paint(colB, PERFORMERS * PERF_PER + 1, col(PLACE.floorLo));

  const mesh = new pc.Mesh(app.graphicsDevice);
  const perfMesh = new pc.Mesh(app.graphicsDevice);
  // the box writer: into one of the two position buffers, at a box index
  let out: Float32Array = posA, bi = 0;
  const at = (buf: Float32Array, first: number): void => { out = buf; bi = first; };
  /** an axis-aligned box: centre, half-sizes */
  const box = (x: number, y: number, z: number, hx: number, hy: number, hz: number): void => {
    let o = bi * VPB * 3;
    for (const f of FACES) for (const [cx, cy, cz] of f.v) { out[o++] = x + cx * hx; out[o++] = y + cy * hy; out[o++] = z + cz * hz; }
    bi++;
  };
  /** a piece narrower or wider at the top than the bottom (half-sizes: depth hx, width hz, at the bottom and top) */
  const taper = (x: number, y: number, z: number, hy: number, bx: number, bz: number, tx: number, tz: number): void => {
    let o = bi * VPB * 3;
    for (const f of FACES) for (const [cx, cy, cz] of f.v) {
      const top = cy > 0;
      out[o++] = x + cx * (top ? tx : bx); out[o++] = y + cy * hy; out[o++] = z + cz * (top ? tz : bz);
    }
    bi++;
  };
  /**
   * ⚑ S377 — the person's own frame, in 90° steps: `dir` 0 faces +x (the stage), 1 +z, 2 −x (the room), 3 −z. A piece is
   * placed by (forward, side) from the person's centre, and its half-sizes (along forward, along side) swap with the
   * axis. Right-hand side is +z when facing +x.
   */
  let fx = 1, fz = 0, sx = 0, sz = 1, ox = 0, oz = 0, swap = false;
  const frame = (x: number, z: number, dir: number): void => {
    ox = x; oz = z;
    const d = ((dir % 4) + 4) % 4;
    fx = d === 0 ? 1 : d === 2 ? -1 : 0; fz = d === 1 ? 1 : d === 3 ? -1 : 0;
    sx = -fz; sz = fx;
    swap = d % 2 === 1;
  };
  const pBox = (fw: number, y: number, sd: number, hf: number, hy: number, hs: number): void =>
    box(ox + fw * fx + sd * sx, y, oz + fw * fz + sd * sz, swap ? hs : hf, hy, swap ? hf : hs);
  const pTaper = (fw: number, y: number, sd: number, hy: number, bf: number, bs: number, tf: number, ts: number): void =>
    taper(ox + fw * fx + sd * sx, y, oz + fw * fz + sd * sz, hy, swap ? bs : bf, swap ? bf : bs, swap ? ts : tf, swap ? tf : ts);
  const sinkBox = (): void => box(0, SUNK_Y, 0, 0, 0, 0);
  const sinkPerson = (): void => { for (let k = 0; k < PER; k++) sinkBox(); };

  let t = 0;
  // ⚑ S293 — the stream's dance (setCommonsDance): declared before the first build, which reads it
  let danceWant = false;
  let danceK = 0;
  // ⚑ S370 / C1 — TransJesus on the stage (setCommonsTransJesus): present, and how far through the walk on
  let tjWant = false;
  let tjK = 0;
  let tjT = 0;
  // Phase 7 — the show's state: who is walking (and since when), how high the arms are
  let show: CommonsShow = { performers: 0, category: -1, cheer: false };
  let walkT = 0;
  let armK = 0;
  type Costume = 'gown' | 'cape' | 'train' | 'pads';
  const COSTUME_BY_CATEGORY: Costume[] = ['gown', 'pads', 'cape', 'train'];
  const LATE_ARRIVALS: Costume[] = ['pads', 'gown', 'cape', 'train'];
  const costumeOf = (cat: number, i: number, n: number): Costume => n > 1 ? LATE_ARRIVALS[i % 4] : COSTUME_BY_CATEGORY[Math.max(0, cat) % 4];
  const COSTUME_COLOURS: Record<Costume, [pc.Color, pc.Color]> = {
    gown: [col(PLACE.textileHi), col(PLACE.sunHi)],   // a flared skirt, a crown
    cape: [col(PLACE.book), col(PLACE.sunHi)],        // a red cape, a gold collar
    train: [col(PLACE.sky), col(PLACE.sunHi)],        // a long train, a tiara
    pads: [col(ERA4.l), col(PLACE.ink)]                // shoulders, tall hair
  };
  /** the person's heights (S377: a person's proportions — hips at half the height, shoulders at 0.8, a head of 0.125) */
  const body = (h: number): { hip: number; shoulder: number; neck: number; head: number } =>
    ({ hip: h * 0.5, shoulder: h * 0.8, neck: h * 0.035, head: h * 0.125 });
  /** two costume pieces over a performer, in the frame `person` left set (`back` is behind them) */
  const costume = (kind: Costume, base: number, w: number, h: number, bob: number): void => {
    const B = body(h), shoulderY = base + B.shoulder + bob, headTop = shoulderY + B.neck + B.head;
    if (kind === 'gown') {
      pTaper(0, base + B.hip * 0.55 + bob * 0.5, 0, B.hip * 0.55, w * 0.62, w * 1.0, w * 0.3, w * 0.45);
      pBox(0, headTop + 0.05, 0, 0.07, 0.06, 0.03);
    } else if (kind === 'cape') {
      pBox(-w * 0.42, base + h * 0.5 + bob, 0, 0.015, h * 0.27, w * 0.7);
      pBox(0, shoulderY + 0.02, 0, w * 0.5, 0.035, w * 0.32);
    } else if (kind === 'train') {
      pBox(-(w * 0.3 + 0.36), base + 0.012, 0, 0.4, 0.01, w * 0.55);
      pBox(0, headTop + 0.02, 0, 0.08, 0.025, 0.02);
    } else {
      pBox(0, shoulderY - 0.01, 0, w * 0.4, 0.035, w * 0.9);
      pBox(0, headTop + 0.12, 0, B.head * 0.42, 0.12, B.head * 0.42);
    }
  };
  interface Look { style: number; build: number; outfit: number; pose: number }
  /**
   * ⚑ S377 — a person, faceless, in the frame `frame()` set (forward is the way they face). `bob` lifts the body on the
   * beat, `lean` tips the upper body along WORLD x (toward or away from the stage, as before), `up` raises the arms
   * (0 down … 1 over the head), `stride` 0…1 is how much they are walking and `step` the walk's phase, `shift` the
   * weight moved onto one leg (metres, sideways) and `nod` the head's small turn.
   */
  const person = (base: number, w: number, h: number, bob: number, lean: number, up: number, look: Look, stride: number, step: number, shift: number, nod: number): void => {
    const B = body(h);
    const legHw = Math.max(0.05, w * 0.21), legGap = 0.012, legHd = Math.max(0.055, w * 0.22);
    const swing = stride * 0.15 * Math.sin(step), lift = stride * 0.05;
    const hipY = base + B.hip + bob * 0.5;
    const skirt = look.outfit === 1;
    // the legs: thigh wider than the ankle; one forward, one back while walking, the stepping foot lifted
    for (const side of [-1, 1]) {
      const f = side * swing, up1 = Math.max(0, side * Math.cos(step)) * lift;
      const legTop = hipY, legBot = base + 0.07 + up1;
      const sd = side * (legHw + legGap) + (side < 0 ? Math.min(0, shift) : Math.max(0, shift)) * 0.4;
      pTaper(f, (legTop + legBot) / 2, sd, (legTop - legBot) / 2, legHd * 0.78, legHw * 0.78, legHd, legHw);
    }
    // the shoes, pointing forward: the one cue a faceless body needs to be facing somewhere
    for (const side of [-1, 1]) {
      const f = side * swing, up1 = Math.max(0, side * Math.cos(step)) * lift;
      const sd = side * (legHw + legGap) + (side < 0 ? Math.min(0, shift) : Math.max(0, shift)) * 0.4;
      pBox(f + 0.05, base + 0.035 + up1, sd, 0.13, 0.035, Math.max(0.045, legHw * 0.92));
    }
    const upperShift = shift, lx = lean;   // the upper body carries the weight shift; the lean is along world x
    const ox0 = ox;
    ox = ox0 + lx;
    // pelvis (trousers' or skirt's colour), torso (waist to shoulders)
    const waistHw = w * 0.42, waistHd = w * 0.34, sh = w * (0.6 + 0.14 * look.build), chestHd = w * 0.4;
    pBox(0, hipY + 0.03, upperShift, waistHd + 0.01, 0.07, legHw * 2 + legGap + 0.012);
    const torsoBot = hipY + 0.06, torsoTop = base + B.shoulder + bob;
    pTaper(0, (torsoBot + torsoTop) / 2, upperShift, (torsoTop - torsoBot) / 2, waistHd, waistHw, chestHd, sh);
    // neck, head (two crossed pieces: near-round from any side), hair
    const neckY = torsoTop + B.neck / 2;
    pBox(0, neckY, upperShift, 0.045, B.neck / 2 + 0.012, 0.042);
    const hy = torsoTop + B.neck + B.head / 2, hs = upperShift + nod;
    const hh = B.head / 2;
    pBox(0, hy, hs, hh * 0.88, hh, hh * 0.74);
    pBox(0, hy - hh * 0.06, hs, hh * 0.74, hh * 0.9, hh * 0.86);
    // hair: two pieces in five styles (back is −forward)
    if (look.style === 0) { pBox(-hh * 0.12, hy + hh * 0.62, hs, hh * 0.98, hh * 0.42, hh * 0.92); pBox(-hh * 0.62, hy + hh * 0.2, hs, hh * 0.4, hh * 0.7, hh * 0.86); }                  // a crop
    else if (look.style === 1) { pBox(-hh * 0.1, hy + hh * 0.66, hs, hh * 0.98, hh * 0.4, hh * 0.94); pBox(-hh * 0.66, hy - hh * 0.55, hs, hh * 0.42, hh * 1.5, hh * 0.98); }   // long, down the back
    else if (look.style === 2) { pBox(-hh * 0.18, hy + hh * 0.42, hs, hh * 1.3, hh * 1.0, hh * 1.28); pBox(-hh * 0.18, hy + hh * 0.42, hs, hh * 1.3, hh * 1.0, hh * 1.28); } // big, round
    else if (look.style === 3) { pBox(-hh * 0.1, hy + hh * 0.66, hs, hh * 0.98, hh * 0.4, hh * 0.92); pBox(-hh * 0.55, hy + hh * 1.05, hs, hh * 0.42, hh * 0.42, hh * 0.42); } // a bun
    else { pBox(-hh * 0.08, hy + hh * 0.86, hs, hh * 0.92, hh * 0.18, hh * 0.78); pBox(-hh * 0.08, hy + hh * 0.86, hs, hh * 0.92, hh * 0.18, hh * 0.78); }                     // shaved close
    // the arms: an upper arm, a forearm, a hand — hanging a little off the body, swinging opposite the legs while
    //   walking, one forearm forward (a drink, a phone) for some, or over the head by `up`
    const ua = h * 0.19, fa = h * 0.16, aw = Math.max(0.038, w * 0.13), shoulderY = torsoTop - 0.03;
    const k = up * up * (3 - 2 * up);
    for (const side of [-1, 1]) {
      const sd = upperShift + side * (sh + aw + 0.012);
      const sw = -side * swing * 0.45;
      const holding = k < 0.15 && stride < 0.05 && ((look.pose === 1 && side > 0) || (look.pose === 2 && side < 0));
      // the upper arm slides from hanging below the shoulder to raised above it (a column, 90° steps)
      const uy = shoulderY + (k * 2 - 1) * (ua / 2);
      pBox(sw, uy, sd, aw, ua / 2 + 0.01, aw);
      if (holding) {
        const ey = shoulderY - ua;   // the elbow: the forearm forward, level, and the hand at its end
        pBox(fa / 2, ey, sd, fa / 2 + 0.01, aw * 0.9, aw * 0.9);
        pBox(fa + 0.03, ey + 0.01, sd, 0.035, 0.045, aw * 0.95);
      } else {
        const fy = shoulderY + (k * 2 - 1) * (ua + fa / 2);
        pBox(sw * 1.4, fy, sd, aw * 0.9, fa / 2 + 0.01, aw * 0.9);
        const hy2 = shoulderY + (k * 2 - 1) * (ua + fa + 0.045);
        pBox(sw * 1.6, hy2, sd, aw * 0.95, 0.045, aw * 0.85);
      }
    }
    // the outfit's one piece: a belt, a skirt to the knee, an open jacket's T-shirt front, a hood
    if (look.outfit === 0) pBox(0, hipY + 0.09, upperShift, waistHd + 0.008, 0.02, waistHw + 0.008);
    else if (skirt) pTaper(0, hipY - B.hip * 0.2, upperShift, B.hip * 0.3, w * 0.5, w * 0.62, waistHd + 0.012, waistHw + 0.012);
    else if (look.outfit === 2) pBox(chestHd + 0.002, torsoTop - (torsoTop - torsoBot) * 0.38, upperShift, 0.012, (torsoTop - torsoBot) * 0.36, sh * 0.34);
    else pBox(-chestHd * 0.8, torsoTop + 0.01, upperShift, 0.07, 0.08, sh * 0.62);
    ox = ox0;
  };
  /** which of the four 90° headings a movement (dx, dz) is closest to */
  const heading = (dx: number, dz: number): number => Math.abs(dx) >= Math.abs(dz) ? (dx >= 0 ? 0 : 2) : (dz >= 0 ? 1 : 3);
  const build = (k: number, stageK: number): void => {
    at(posA, 0);
    const sunk = k <= 0;
    figures.forEach((f) => {
      if (sunk) { sinkPerson(); return; }
      // ⚑ S293 — while the stream dances, the floor is TransJesus's (drawn below, lit from within)
      // ⚑ S370 / C1 — and from the moment they step on at the raid
      if (f.onStage && (danceK > 0 || tjK > 0)) { sinkPerson(); return; }
      // ⚑ S370 / C1 — the walk in from the side: not yet set off → not here; on the way → a walking step, arms down
      let walking = 0;
      let x = f.x, z = f.z, dir = 0;
      if (f.from && f.walk) {
        const p = Math.max(0, Math.min(1, (k * ARRIVE_SECONDS - (f.delay ?? 0)) / f.walk));
        if (p <= 0) { sinkPerson(); return; }
        if (p < 1) {
          const e = p < 0.8 ? p * 0.9 / 0.8 : 0.9 + 0.1 * Math.sin(((p - 0.8) / 0.2) * Math.PI / 2);   // even pace, then settling
          x = f.from.x + (f.x - f.from.x) * e;
          z = f.from.z + (f.z - f.from.z) * e;
          walking = p < 0.92 ? 1 : (1 - p) / 0.08;   // S377: the stride settles as they arrive
          dir = heading(f.x - f.from.x, f.z - f.from.z);   // S377: they face the way they walk
        }
      }
      // ⚑ S209g / M1 (his tick): a bounce on the beat (two a second, each a little out of step with the next), a
      //   side-to-side sway on the bar, a lean; it was a 2 cm sway nobody could see, and the crowd read as boxes
      // ⚑ S370 / C1: the stage's one (figure 0, only ever seen in old review routes) still rises; nobody else does
      const rise = f.from ? 0 : (k - 1) * (f.h + 0.4);
      const beat = t * Math.PI * 2 + f.phase * 0.35;
      let bob = walking ? 0.03 * Math.abs(Math.sin(t * 7.5 + f.phase)) : 0.045 * Math.abs(Math.sin(beat));
      let lean = walking ? 0.03 : 0.035 * Math.sin(t * 0.8 + f.phase * 1.7);
      if (!f.onStage && !walking) z += 0.06 * Math.sin(beat / 2);
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
        dir = 2;
      }
      const base = (f.onStage ? STAGE.y + STAGE.h : 0.02) + rise;
      // the arms: the crowd's go up when the room answers (not the one on the stage, not the two beside her mid-greeting)
      const answer = f.beside ? answerK : 0;
      // ⚑ S293 — dancing: arms rise and fall on the bar, each a little out of step; some keep them low
      const danceArms = danceK * (Math.sin(f.phase * 3.1) > -0.2 ? Math.max(0, Math.sin(t * Math.PI * 1.0 + f.phase)) * 0.9 : 0.15);
      const up = f.onStage || walking || (f.beside && greetK > 0) ? 0 : Math.max(armK * (0.75 + 0.25 * Math.sin(f.phase)), inviteArms, answer, danceArms);
      // ⚑ S377 — standing, the weight moves from one leg to the other, slowly, and the head turns a little now and then
      const shift = walking ? 0 : 0.03 * Math.sin(t * 0.55 + f.phase * 1.3);
      const nod = walking ? 0 : 0.012 * Math.sin(t * 0.31 + f.phase * 2.1);
      frame(x, z, dir);
      person(base, f.w, f.h, bob, lean, up, { style: f.style ?? 0, build: f.build ?? 0.5, outfit: f.outfit ?? 0, pose: f.pose ?? 0 },
        walking, t * 7.5 + f.phase, shift, nod);
    });
    // ⚑ Phase 7 — the performers: down the runway and back, abreast, for as long as their category is called
    at(posB, 0);
    const nWalk = sunk || danceK > 0 || tjK > 0 ? 0 : Math.min(PERFORMERS, show.performers);
    const cycle = WALK_OUT * 2 + WALK_HOLD * 2;
    const ph = walkT % cycle;
    const leg = ph < WALK_OUT ? ph / WALK_OUT : ph < WALK_OUT + WALK_HOLD ? 1
      : ph < WALK_OUT * 2 + WALK_HOLD ? 1 - (ph - WALK_OUT - WALK_HOLD) / WALK_OUT : 0;
    const e = leg * leg * (3 - 2 * leg);
    // S377: out toward her they face the room; on the way back they face the stage; holding at either end, the room
    const perfDir = ph >= WALK_OUT + WALK_HOLD && ph < WALK_OUT * 2 + WALK_HOLD ? 0 : 2;
    const perfStride = leg > 0 && leg < 1 ? 1 : 0;
    // she is at the stage's edge: they perform up ON the stage, to her, and do not come down the runway
    const px = herAtStage ? WORLD.stage.x - 0.5 : RUNWAY.from + (RUNWAY.to - RUNWAY.from) * e;
    const pBase = herAtStage ? WORLD.stage.h + 0.02 : 0.02;
    // ⚑ S293 — TRANSJESUS, dancing on the floor: a step side to side, a sway, the arms rising and opening on the
    //   beat, a gown and a crown in the stream's own colours. Faceless like everyone; the brightest thing in the place.
    const tjBeat = t * Math.PI * 2 * (122 / 60) / 2;
    // ⚑ S370 / C1 — at TJ_SPOT now (≈14° right of the seat, beside the host's screen), walked on at the raid
    //   (`setCommonsTransJesus`): from TJ_FROM across the stage for TJ_WALK_SECONDS, then the dance, its sway easing in
    //   over a second. A route that only asks for the dance (old reviews) has them rise in place, as before.
    const tjOn = tjK > 0 || danceK > 0;
    const walkP = tjWant ? Math.min(1, tjT / TJ_WALK_SECONDS) : 1;
    const walkE = walkP * walkP * (3 - 2 * walkP);
    const swayK = tjWant ? Math.max(0, Math.min(1, (tjT - TJ_WALK_SECONDS) / 1.0)) : 1;
    const tjX = TJ_FROM.x + (TJ_SPOT.x - TJ_FROM.x) * walkE + swayK * 0.18 * Math.sin(t * 0.7);
    const tjZ = TJ_FROM.z + (TJ_SPOT.z - TJ_FROM.z) * walkE + swayK * 0.3 * Math.sin(t * 0.45);
    const setCostumeColours = (i: number, kind: Costume): void => {
      const [ca, cb] = COSTUME_COLOURS[kind];
      paint(colB, i * PERF_PER + PER, ca); paint(colB, i * PERF_PER + PER + 1, cb);
    };
    for (let i = 0; i < PERFORMERS; i++) {
      bi = i * PERF_PER;
      if (i === 0 && tjOn) {
        const h = 1.72, w = 0.31, base = STAGE.y + STAGE.h + 0.01 + (tjWant ? 0 : (danceK - 1) * 2.2);
        const stepping = walkP < 1;
        const bob = stepping ? 0.035 * Math.abs(Math.sin(t * 7.5)) : 0.05 * Math.abs(Math.sin(tjBeat));
        const lean = stepping ? 0.03 : 0.06 * Math.sin(tjBeat / 2) * swayK;
        const arms = stepping ? 0.3 : 0.55 + 0.45 * Math.sin(tjBeat / 2 + 0.6) * swayK + answerK * 0.4;
        frame(tjX, tjZ, stepping ? heading(TJ_SPOT.x - TJ_FROM.x, TJ_SPOT.z - TJ_FROM.z) : 2);   // S377: walking on, then facing the room
        person(base, w, h, bob, lean, Math.min(1, arms), { style: 1, build: 0.5, outfit: 1, pose: 0 }, stepping ? 1 : 0, t * 7.5, stepping ? 0 : 0.04 * Math.sin(tjBeat / 2) * swayK, 0);
        costume('gown', base, w, h, bob);
        setCostumeColours(i, 'gown');
        continue;
      }
      if (i >= nWalk) { for (let s = 0; s < PERF_PER; s++) sinkBox(); continue; }
      const z = RUNWAY.z + (i - (nWalk - 1) / 2) * 0.55;
      const h = perfH[i], w = 0.3;
      const step = Math.abs(Math.sin(walkT * 3.2 + i)) * 0.025 * (leg > 0 && leg < 1 ? 1 : 0.2);
      frame(px, z, perfDir);
      person(pBase, w, h, step, 0, herAtStage || leg >= 1 ? 0.9 : 0.15, { style: [1, 0, 2, 3][i], build: [0.2, 0.9, 0.5, 0.3][i], outfit: 1, pose: 0 },
        perfStride, walkT * 6.4 + i, 0, 0);   // at the near end, the arms open to the room
      const kind = costumeOf(show.category, i, nWalk);
      costume(kind, pBase, w, h, step);
      // the costume's colours live in the performers' own colour stream: set them for this walker
      setCostumeColours(i, kind);
    }
    // the light under them — a flat pale patch, on the floor, where they are
    bi = PERFORMERS * PERF_PER;
    if (nWalk > 0) box(px, pBase - 0.008, RUNWAY.z, 0.55, 0.004, 0.35 + nWalk * 0.28);
    else if (tjOn) box(tjX, STAGE.y + STAGE.h + 0.006, tjZ, 0.42, 0.004, 0.46);
    else sinkBox();
    // (the stage itself is the hall's — commonsWorld.ts; this box is spare and sunk)
    sinkBox(); void stageK;
    // ⚑ Phase 7 — two meshes: the crowd, lit by the room; the performers and their patch of light, lit from within,
    //   so the one who has the floor is the brightest thing in the hall. ⚑ S377: normals and indices are set once
    //   (flat faces of axis-aligned boxes do not change their normals); only the positions and the performers'
    //   costume colours are written per rebuild.
    mesh.setPositions(posA);
    mesh.update(pc.PRIMITIVE_TRIANGLES);
    perfMesh.setPositions(posB);
    perfMesh.setColors(colB);   // floats 0..1 — setColors32 wants bytes, and read these as black
    perfMesh.update(pc.PRIMITIVE_TRIANGLES);
  };
  mesh.setNormals(crowdStatic.nrm); mesh.setColors(colA); mesh.setIndices(crowdStatic.idx);
  perfMesh.setNormals(perfStatic.nrm); perfMesh.setColors(colB); perfMesh.setIndices(perfStatic.idx);
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
  perfMat.emissive = new pc.Color(0.62, 0.62, 0.62);   // ⚑ S293: 0.92 washed TransJesus to white under the stage light
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
  danceHook = (on) => { danceWant = on; if (on) ent.enabled = true; };
  // ⚑ S370 / C1 — TransJesus steps on (the walk starts from the far left of the stage each time)
  tjHook = (on) => { if (on && !tjWant) tjT = 0; tjWant = on; if (on) ent.enabled = true; };
  showHook = (s) => { if (s.category !== show.category) walkT = 0; show = s; };
  return {
    update(dt: number): void {
      if (!ent.enabled) return;
      t += dt;
      const before = k;
      // ⚑ S370 / C1 — the presence clock runs over the longest walk-in now (it was a 2.2 s rise)
      k = want ? Math.min(1, k + dt / ARRIVE_SECONDS) : Math.max(0, k - dt / ARRIVE_SECONDS);
      greetK = greetWant ? Math.min(1, greetK + dt / GREET_SECONDS) : Math.max(0, greetK - dt / GREET_SECONDS);
      inviteK = inviteWant ? Math.min(1, inviteK + dt / INVITE_SECONDS) : Math.max(0, inviteK - dt / INVITE_SECONDS);
      danceK = danceWant ? Math.min(1, danceK + dt / RISE_SECONDS) : Math.max(0, danceK - dt / RISE_SECONDS);
      tjK = tjWant ? Math.min(1, tjK + dt / RISE_SECONDS) : Math.max(0, tjK - dt / RISE_SECONDS);
      if (tjWant) tjT += dt;
      if (answerT >= 0) { answerT += dt; answerK = answerT < 0.4 ? answerT / 0.4 : answerT > 2.2 ? Math.max(0, 1 - (answerT - 2.2) / 0.5) : 1; if (answerT > 2.7) { answerT = -1; answerK = 0; } }
      if (show.performers > 0) walkT += dt;
      armK = show.cheer ? Math.min(1, armK + dt / ARM_EASE) : Math.max(0, armK - dt / (ARM_EASE * 3));
      acc += dt;
      if (acc < 1 / REBUILD_HZ && k === before) return;
      acc = 0;
      build(k, k);
      if (k <= 0 && !want && tjK <= 0 && danceK <= 0) ent.enabled = false;
    }
  };
}
