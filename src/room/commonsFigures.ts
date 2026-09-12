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

const FIGURES = 14;
const SUNK_Y = -40;
const RISE_SECONDS = 2.2;
const SEAT = { x: 4.4, z: 0.7, clear: 1.3 };
/** ⚑ 2026-09-12: the stage is the WORLD's (commonsWorld.ts) — in front of her,
 *  where a hall's stage is — and the crowd stands between her and it, and
 *  around her, the way you stand in a crowd. */
const STAGE = { x: WORLD.stage.x, y: 0.0, z: WORLD.stage.z, w: WORLD.stage.w, d: WORLD.stage.d, h: WORLD.stage.h };
const REBUILD_HZ = 8;

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

interface Figure { x: number; z: number; h: number; w: number; phase: number; body: pc.Color; onStage: boolean }

let hook: ((on: boolean) => void) | null = null;
/** the crowd is present, or it is not. It rises over RISE_SECONDS. */
export function setCommonsFigures(on: boolean): void { hook?.(on); }

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
  for (const [x, z] of [[4.8, -1.5], [4.7, 2.9]] as const) {
    figures.push({
      x, z, h: 1.55 + rng() * 0.25, w: 0.26 + rng() * 0.08, phase: rng() * 6.28,
      body: cloth[1 + Math.floor(rng() * (cloth.length - 1))], onStage: false
    });
  }
  // the rest between her and the stage, and a few behind her, uneven on purpose
  while (figures.length < FIGURES) {
    const behind = figures.length >= FIGURES - 3;
    const x = behind ? SEAT.x - 1.6 - rng() * 1.6 : SEAT.x + 1.5 + rng() * 2.0;
    const z = STAGE.z + (rng() - 0.5) * 6.4;
    if (Math.hypot(x - SEAT.x, z - SEAT.z) < 1.8) continue;
    // a gap down the middle so she can see the stage between the people in front
    if (!behind && Math.abs(z - STAGE.z) < 0.6) continue;
    if (x > STAGE.x - STAGE.d / 2 - 0.4) continue;
    figures.push({
      x, z, h: 1.5 + rng() * 0.32, w: 0.24 + rng() * 0.1, phase: rng() * 6.28,
      body: cloth[Math.floor(rng() * cloth.length)], onStage: false
    });
  }

  // ── geometry: every figure is two boxes (body, head); the stage is one ──
  const C = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
  ];
  const F = [
    [0, 1, 2, 0, 2, 3], [4, 6, 5, 4, 7, 6], [0, 4, 5, 0, 5, 1],
    [3, 2, 6, 3, 6, 7], [0, 3, 7, 0, 7, 4], [1, 5, 6, 1, 6, 2]
  ];
  const BOXES = FIGURES * 2 + 1;
  const indices: number[] = [];
  for (let n = 0; n < BOXES; n++) for (const face of F) for (const i of face) indices.push(n * 8 + i);
  const colors: number[] = [];
  const pushBoxColor = (c: pc.Color): void => { for (let i = 0; i < 8; i++) colors.push(c.r, c.g, c.b, 1); };
  for (const f of figures) { pushBoxColor(f.body); pushBoxColor(skin); }
  pushBoxColor(new pc.Color().fromString(PLACE.floorLo));

  const mesh = new pc.Mesh(app.graphicsDevice);
  const positions = new Array<number>(BOXES * 8 * 3).fill(0);
  let pi = 0;
  const box = (x: number, y: number, z: number, hx: number, hy: number, hz: number): void => {
    for (const [cx, cy, cz] of C) {
      positions[pi++] = x + cx * hx; positions[pi++] = y + cy * hy; positions[pi++] = z + cz * hz;
    }
  };
  let t = 0;
  const build = (k: number, stageK: number): void => {
    pi = 0;
    const sunk = k <= 0;
    figures.forEach((f, n) => {
      if (sunk) { box(f.x, SUNK_Y, f.z, 0.1, 0.1, 0.1); box(f.x, SUNK_Y, f.z, 0.1, 0.1, 0.1); return; }
      // rising from the floor, then a sway
      const rise = (k - 1) * (f.h + 0.4);
      const bob = 0.02 * Math.sin(t * 1.9 + f.phase);
      const lean = 0.025 * Math.sin(t * 0.8 + f.phase * 1.7);
      let x = f.x, z = f.z;
      if (f.onStage) {
        // the one with the floor: a slow walk along the stage and back
        x = STAGE.x - 0.3 + Math.cos(t * 0.17) * 0.3;
        z = STAGE.z + Math.sin(t * 0.25) * 0.6;   // a slow walk — ⚑ 0.6 m either way, not 1.0: from the 'by the stage' marker she walked out of frame
      }
      const base = (f.onStage ? STAGE.y + STAGE.h : 0.02) + rise;
      // half-sizes: a body 0.62 of the height and the width given; a head a
      // fifth of the height across (half = 0.055 h) — the first cut passed the
      // head's SIZE as its half-size and rendered 0.38 m heads on 0.26 m bodies
      const bodyH = f.h * 0.62, headH = f.h * 0.055;
      box(x + lean, base + bodyH / 2 + bob, z, f.w / 2, bodyH / 2, f.w * 0.36);
      box(x + lean * 1.4, base + bodyH + headH + 0.03 + bob, z, headH, headH, headH * 0.9);
      void n;
    });
    // (the stage itself is the hall's — commonsWorld.ts; this box is spare and sunk)
    box(STAGE.x, SUNK_Y, STAGE.z, 0.1, 0.1, 0.1); void stageK;
    mesh.setPositions(positions);
    mesh.setIndices(indices);
    mesh.setColors(colors);   // floats 0..1 — setColors32 wants bytes, and read these as black
    mesh.setNormals(pc.calculateNormals(positions, indices));
    mesh.update(pc.PRIMITIVE_TRIANGLES);
  };
  build(0, 0);

  const mat = new pc.StandardMaterial();
  mat.diffuse = new pc.Color(1, 1, 1);
  mat.diffuseVertexColor = true;
  mat.specular = new pc.Color(0, 0, 0);
  // a little self-light so the dark cloths are not silhouettes under a warm rig
  mat.emissive = new pc.Color(0.16, 0.14, 0.13);
  mat.update();
  const ent = new pc.Entity('commons-figures');
  ent.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, mat)] });
  ent.render!.meshInstances[0].cull = false;
  ent.enabled = false;
  parent.addChild(ent);

  (window as unknown as { __commonsFigures?: unknown }).__commonsFigures = figures.map(f => [+f.x.toFixed(2), +f.z.toFixed(2), +f.h.toFixed(2), f.onStage]);
  let want = false;
  let k = 0;
  let acc = 0;
  hook = (on) => { want = on; if (on) ent.enabled = true; };
  return {
    update(dt: number): void {
      if (!ent.enabled) return;
      t += dt;
      const before = k;
      k = want ? Math.min(1, k + dt / RISE_SECONDS) : Math.max(0, k - dt / RISE_SECONDS);
      acc += dt;
      if (acc < 1 / REBUILD_HZ && k === before) return;
      acc = 0;
      build(k, k);
      if (k <= 0 && !want) ent.enabled = false;
    }
  };
}
