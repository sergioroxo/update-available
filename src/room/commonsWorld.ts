/**
 * ⚑ THE COMMONS AS A WORLD (2026-09-12). Sérgio, on the first plates of the
 * Commons overlaid on her room: *"I dunno if the 'VR' that L sends us should be
 * in the real space, I think it should be in Virtual space, that breaks with
 * reality yes, but like even for TransJesus etc, it would make sense to be seen
 * inside of VRChat world, like TransAcademy."*
 *
 * So the room goes. When Junie's card is pressed the building she is sitting
 * in is switched off — every wall, every desk, the monitor she was reading —
 * and this takes its place: a social-VR hall the size of a gym, floor and
 * stage and a video screen the width of a wall, string lights, the crowd as
 * avatars, a sky. She has not moved; the seat is the seat; turning still
 * turns. What is around her is somewhere else, which is what a headset does.
 * When the update fails the hall tears and the room comes back.
 *
 * ⚑ INVENTED, AND LEGIBLE AS THE THING IT STANDS FOR. Not any real platform's
 * geometry or mark (CLAUDE.md: invented marks only); the shape every such
 * world shares — a floor plane, a stage, a screen, a crowd — drawn low-poly in
 * the piece's own palette. The Dossier cites the referent; the fiction carries
 * *the Commons*.
 *
 * Budget: the hall is one mesh (floor, stage, screen frame, four columns), one
 * draw call; the crowd (`commonsFigures.ts`) one; the lamps one; the stream
 * screen one; two lights. ≤ 5 draw calls for the whole world.
 */
import * as pc from 'playcanvas';
import { PLACE, ERA4, BALL, COMMONS_SKY } from '../desktop/theme/era4';
import { setFont } from '../desktop/theme/chrome';
import { roundRect } from '../desktop/theme/era4';
import script from '../../data/dialog/s4_ball.json';

/** the world is laid out round the E4 seat, facing +x like the seat does */
export const WORLD = {
  seat: { x: 4.4, z: 0.7 },
  /** the stage: 4 m in front of her, wide, a step up. ⚑ Measured on the first
   *  plate: at 3 m, with the screen 4.2 m wide behind it, the picture filled
   *  48° of a 59° frame and she was IN it rather than in front of it. */
  stage: { x: 9.4, y: 0.0, z: 0.7, w: 5.0, d: 2.2, h: 0.24 },   // ⚑ 2026-09-13: 8.4 → 9.4, a metre further: the frame is a 42° telephoto, and at 4 m the walker was half its height
  /** the screen behind it — big, and six metres off. ⚑ 2026-09-13: raised to
   *  y 2.75 and widened to 3.2 m: at 2.2 the walker on the stage stood in front
   *  of the stream and covered the category caption from the seat. */
  screen: { x: 11.4, y: 2.75, z: 0.7, w: 3.4, h: 1.9 },
  /** ⚑ S209g (his, 2026-10-03: "it boxes off the space, instead of letting it breathe") — NO WALLS.
   *  The hall is an open platform under the sky, the way a social-VR world floats: a slab with a rim of
   *  light at its edge, the dusk all the way round the horizon, the stars overhead. (The walls of
   *  2026-09-13 were there because the far floor read as a beige horizon; the rim and the horizon's
   *  own glow answer that now.) */
  floor: { x: 5.0, z: 0.7, w: 30, d: 26 },
  sky: COMMONS_SKY,
  // ⚑ S209 / B24 (REVIEW_ROUND_5, ERA26-05; his "Warm it please!") — the one respite was the darkest room in the piece:
  //   near-black interface panels for walls and floor. Now the warm wall and wood of the rooms themselves (PLACE),
  //   so the hall is a place people made, not the system's dark
  floorColor: PLACE.floor,
  wallColor: PLACE.wallLo,
  stageColor: PLACE.floorLo,
  frameColor: ERA4.panelHi,
  /** ⚑ S209g — where the hall's words stand, now that there are no walls to hang them on */
  boards: { rules: { x: 6.2, z: -6.8 }, banners: { xs: [2.4, 3.8, 5.2, 6.6], z: 5.6 }, firsts: { x: -3.4, z: 0.7 } }
} as const;

function pushBox(pos: number[], idx: number[], x: number, y: number, z: number, hx: number, hy: number, hz: number): void {
  const base = pos.length / 3;
  const C = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
  ];
  const F = [
    [0, 1, 2, 0, 2, 3], [4, 6, 5, 4, 7, 6], [0, 4, 5, 0, 5, 1],
    [3, 2, 6, 3, 6, 7], [0, 3, 7, 0, 7, 4], [1, 5, 6, 1, 6, 2]
  ];
  for (const [cx, cy, cz] of C) pos.push(x + cx * hx, y + cy * hy, z + cz * hz);
  for (const f of F) for (const i of f) idx.push(base + i);
}

export interface CommonsWorld {
  /** everything the world owns hangs under this — the crowd and the lamps mount here */
  entity: pc.Entity;
  setOn(on: boolean): void;
  readonly on: boolean;
  update(dt: number): void;
}

export function mountCommonsWorld(app: pc.Application): CommonsWorld {
  const entity = new pc.Entity('commons-world');
  entity.enabled = false;
  app.root.addChild(entity);

  // ── the hall: one mesh with vertex colours ──
  const pos: number[] = [], idx: number[] = [], col: number[] = [];
  const paint = (hex: string, n: number): void => {
    const c = new pc.Color().fromString(hex);
    for (let i = 0; i < n; i++) col.push(c.r, c.g, c.b, 1);
  };
  const S = WORLD.stage, SC = WORLD.screen, FL = WORLD.floor;
  // the platform: a slab with a thickness, so its edge reads as an edge and not a line
  pushBox(pos, idx, FL.x, -0.16, FL.z, FL.w / 2, 0.16, FL.d / 2); paint(WORLD.floorColor, 8);
  /**
   * ⚑ COLOUR (2026-09-12). Sérgio: "not totally convinced on the styling of
   * the space… maybe we need more pop of colour." A ball has a dance floor and
   * it has lights. The floor between her and the stage is a grid of tiles in
   * three of the palette's warm and cool values; the stage edge is lit; and
   * three coloured lights sweep the room (below). All from the theme.
   */
  const TILE = [PLACE.textileHi, ERA4.l, PLACE.sunHi, PLACE.bookAlt];
  for (let i = 0; i < 9; i++) for (let j = 0; j < 8; j++) {
    const x = 5.2 + i * 0.5, z = S.z - 2.0 + j * 0.5;
    pushBox(pos, idx, x, 0.032, z, 0.24, 0.01, 0.24); paint(TILE[(i * 3 + j * 5) % 4], 8);   // proud of the floor, no z-fight
  }
  // ⚑ S209g — the rim of light round the platform's edge: where the world ends, it glows
  const x0 = FL.x - FL.w / 2, x1 = FL.x + FL.w / 2, z0 = FL.z - FL.d / 2, z1 = FL.z + FL.d / 2;
  pushBox(pos, idx, FL.x, 0.02, z0 + 0.05, FL.w / 2, 0.02, 0.05); paint(PLACE.sunHi, 8);
  pushBox(pos, idx, FL.x, 0.02, z1 - 0.05, FL.w / 2, 0.02, 0.05); paint(PLACE.sunHi, 8);
  pushBox(pos, idx, x0 + 0.05, 0.02, FL.z, 0.05, 0.02, FL.d / 2); paint(PLACE.sunHi, 8);
  pushBox(pos, idx, x1 - 0.05, 0.02, FL.z, 0.05, 0.02, FL.d / 2); paint(PLACE.sunHi, 8);
  pushBox(pos, idx, S.x, S.h / 2, S.z, S.w / 2, S.h / 2, S.d / 2); paint(WORLD.stageColor, 8);
  pushBox(pos, idx, S.x - S.d / 2, S.h, S.z, 0.03, 0.02, S.w / 2); paint(PLACE.sunHi, 8);   // the stage's lit lip
  // the screen's frame (the picture itself is the `stream` plane, in front of it), standing on two trusses
  pushBox(pos, idx, SC.x + 0.06, SC.y, SC.z, 0.06, SC.h / 2 + 0.12, SC.w / 2 + 0.12); paint(WORLD.frameColor, 8);
  for (const side of [-1, 1]) {
    const tz = SC.z + side * (SC.w / 2 + 0.05), ty = (SC.y - SC.h / 2) / 2;
    pushBox(pos, idx, SC.x + 0.06, ty, tz, 0.05, ty, 0.05); paint(WORLD.frameColor, 8);
  }
  // ⚑ S209g / L3 — the words stand in the open: banner poles and a crossbar, and the boards' legs
  const B = WORLD.boards;
  for (const bx of B.banners.xs) { pushBox(pos, idx, bx, 2.2, B.banners.z, 0.025, 2.2, 0.025); paint(PLACE.floorLo, 8); }
  pushBox(pos, idx, (B.banners.xs[0] + B.banners.xs[3]) / 2, 4.28, B.banners.z, (B.banners.xs[3] - B.banners.xs[0]) / 2 + 0.6, 0.025, 0.025); paint(PLACE.floorLo, 8);
  // (the house rules float: a world's sign, no legs — S209i)
  for (const dz of [-1.6, 1.6]) { pushBox(pos, idx, B.firsts.x, 0.45, B.firsts.z + dz, 0.04, 0.45, 0.04); paint(PLACE.floorLo, 8); }
  const mesh = new pc.Mesh(app.graphicsDevice);
  mesh.setPositions(pos);
  mesh.setIndices(idx);
  mesh.setColors(col);
  mesh.setNormals(pc.calculateNormals(pos, idx));
  mesh.update(pc.PRIMITIVE_TRIANGLES);
  const mat = new pc.StandardMaterial();
  mat.diffuse = new pc.Color(1, 1, 1);
  mat.diffuseVertexColor = true;
  // ⚑ 2026-09-13: the colours HOLD under the rig — the tiles, the columns and
  //   the stage lip carry a third of their own colour as light, so a gold
  //   stage light does not turn the whole hall to one beige (it did)
  mat.emissiveVertexColor = true;
  mat.emissive = new pc.Color(0.52, 0.52, 0.52);   // ⚑ S209g / L1 — 0.34 → 0.52: the respite is the brightest room in 2026, not the darkest
  mat.specular = new pc.Color(0, 0, 0);
  mat.update();
  const hall = new pc.Entity('commons-hall');
  hall.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, mat)] });
  hall.render!.meshInstances[0].cull = false;
  entity.addChild(hall);

  // ── two lights: the stage's, and a fill over the crowd ──
  const stageLight = new pc.Entity('commons-stage-light');
  stageLight.addComponent('light', {
    // ⚑ 2026-09-13: 1.1 → 0.55 — the gold washed every colour in the hall to one
    type: 'point', color: new pc.Color().fromString(BALL.attention), intensity: 0.55, range: 8, castShadows: false
  });
  stageLight.setLocalPosition(S.x, 3.2, S.z);
  entity.addChild(stageLight);
  // ── three coloured lights that sweep the floor: pink, teal, gold ──
  const sweeps = [PLACE.textileHi, ERA4.l, PLACE.sunHi].map((hex, k) => {
    const e = new pc.Entity(`commons-sweep-${k}`);
    e.addComponent('light', {
      type: 'point', color: new pc.Color().fromString(hex), intensity: 0.8, range: 5.0, castShadows: false
    });
    e.setLocalPosition(S.x, 3.0, S.z);
    entity.addChild(e);
    return e;
  });
  const fill = new pc.Entity('commons-fill');
  fill.addComponent('light', {
    // ⚑ 2026-09-13: the fill is the sky's teal now, not a second warm — a hall
    //   at night is lit from its stage, and the rest of it is cool
    type: 'point', color: new pc.Color().fromString(ERA4.l), intensity: 0.45, range: 14, castShadows: false
  });
  fill.setLocalPosition(WORLD.seat.x - 1.5, 4.2, WORLD.seat.z);
  entity.addChild(fill);
  // ⚑ S209g / L1 — and a warm one over the whole hall: the haze of the late-day rooms, from the ceiling line
  const warm = new pc.Entity('commons-warm');
  warm.addComponent('light', {
    type: 'point', color: new pc.Color().fromString(PLACE.skyHaze), intensity: 1.1, range: 16, castShadows: false
  });
  warm.setLocalPosition(WORLD.seat.x + 1.0, 4.6, WORLD.seat.z);
  entity.addChild(warm);

  // ── ⚑ S209g — THE SKY, ALL THE WAY ROUND: a dusk glow on the horizon, and the far stars ──
  entity.addChild(mountSky(app));

  // ── ⚑ S209g / L3 — THE WALLS SAY PEOPLE MADE THIS PLACE: one canvas, one mesh, one draw call ──
  //   her right: the four houses' banners; her left: the house rules; behind her: a wall of firsts
  entity.addChild(mountHallWalls(app));

  let on = false;
  let t = 0;
  return {
    entity,
    get on() { return on; },
    setOn(v: boolean): void { on = v; entity.enabled = v; },
    update(dt: number): void {
      updateHerLamp(app, dt, on);   // ⚑ S209g / I1
      if (!on) return;
      t += dt;
      // the stage light breathes with the room, slowly
      if (stageLight.light) stageLight.light.intensity = 0.55 + 0.12 * Math.sin(t * 0.7);
      // and the three sweeps circle the floor at their own rates, never a strobe
      sweeps.forEach((e, k) => {
        const a = t * (0.35 + k * 0.12) + k * 2.1;
        e.setLocalPosition(WORLD.seat.x + 1.6 + Math.cos(a) * 2.6, 2.6 + Math.sin(t * 0.5 + k) * 0.3, S.z + Math.sin(a) * 2.8);
      });
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ⚑ S209g / L3 — THE HALL'S WORDS (his ticks, 2026-10-03). A ball's hall is a
// place people made: banners for the houses, the rules they keep, photographs
// of the nights they had. One 512² canvas drawn once, one mesh of quads mapped
// onto it, one draw call, nearest filtering. The words are s4_ball.json's
// `ball.hall`; the colours the theme's. Invented throughout — no real house,
// no real ball's rules.
// ═══════════════════════════════════════════════════════════════════════════
const HALL = (script as unknown as { ball: { hall: { rulesTitle: string; rulesPin: string; rules: string[]; banners: string[]; firstsTitle: string } } }).ball.hall;
const ATLAS = 512;
const RULES = { x: 0, y: 0, w: 256, h: 160 };
const BANNER = { x: 256, y: 0, w: 64, h: 184 };
const FIRSTS = { x: 0, y: 256, w: 320, h: 196 };

function drawHallAtlas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = ATLAS; c.height = ATLAS;
  const g = c.getContext('2d')!;
  const rect = (x: number, y: number, w: number, h: number, col: string): void => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  // ⚑ S209i (his, 2026-10-03: "very basic and not aesthetical, make it more for the time") — the house rules
  //   as a 2026 social-VR world posts them: a floating glass card, a glowing edge, a gradient header with the
  //   house's lamp, each rule on its own chip with a coloured mark, and the pin at the foot
  const R0 = RULES;
  roundRect(g, R0.x, R0.y, R0.w, R0.h, 12, ERA4.l);                         // the glow edge
  roundRect(g, R0.x + 2, R0.y + 2, R0.w - 4, R0.h - 4, 10, ERA4.panel);     // the glass
  const HDR = 30;
  roundRect(g, R0.x + 4, R0.y + 4, R0.w - 8, HDR - 2, 8, PLACE.textileHi);   // the header band
  rect(R0.x + 4, R0.y + HDR - 6, R0.w - 8, 4, PLACE.textileHi);
  rect(R0.x + 12, R0.y + 9, 9, 14, PLACE.ink); rect(R0.x + 14, R0.y + 11, 5, 10, PLACE.sunHi);   // the lamp
  setFont(g, 14);
  g.fillStyle = ERA4.panel;
  g.fillText(HALL.rulesTitle, R0.x + 28, R0.y + 10);
  const mark = [PLACE.textileHi, PLACE.sunHi, ERA4.l, PLACE.book, PLACE.sky];
  setFont(g, 9);
  let ry = R0.y + HDR + 5;
  HALL.rules.forEach((rule, i) => {
    const text = rule.replace(/^\d+\.\s*/, '');
    roundRect(g, R0.x + 8, ry, R0.w - 16, 18, 6, ERA4.panelHi);
    rect(R0.x + 14, ry + 5, 8, 8, mark[i % mark.length]);
    g.fillStyle = ERA4.textHi;
    let line = text;
    while (g.measureText(line).width > R0.w - 44 && line.includes(' ')) line = line.slice(0, line.lastIndexOf(' '));
    g.fillText(line, R0.x + 28, ry + 4);
    ry += 21;
  });
  setFont(g, 8);
  g.fillStyle = ERA4.dim;
  g.fillText(HALL.rulesPin, R0.x + 12, R0.y + R0.h - 13);
  // the four banners: a house's colour, its name down the cloth, a lamp at the head, a swallowtail
  const cloth = [PLACE.sunHi, ERA4.l, PLACE.textileHi, PLACE.bookAlt];
  const ink = [PLACE.ink, PLACE.ink, PLACE.ink, PLACE.mug];
  HALL.banners.slice(0, 4).forEach((name, i) => {
    const bx = BANNER.x + i * BANNER.w;
    rect(bx + 4, BANNER.y, BANNER.w - 8, BANNER.h, cloth[i]);
    rect(bx + 4, BANNER.y, BANNER.w - 8, 6, PLACE.floorLo);                 // the pole's sleeve
    rect(bx + 26, BANNER.y + 14, 12, 16, ink[i]); rect(bx + 28, BANNER.y + 16, 8, 12, PLACE.sunHi);   // the lamp
    for (let k = 0; k < 14; k++) g.clearRect(bx + 32 - k, BANNER.y + BANNER.h - 14 + k, k * 2, 1); // the swallowtail
    g.save();
    g.translate(bx + 40, BANNER.y + 40);
    g.rotate(Math.PI / 2);                                                  // a 90° step, the only kind
    setFont(g, 13);
    g.fillStyle = ink[i];
    g.fillText(name, 0, 0);
    g.restore();
  });
  // the wall of firsts: a cork board of polaroids, people with their arms up
  rect(FIRSTS.x, FIRSTS.y, FIRSTS.w, FIRSTS.h, PLACE.floorLo);
  rect(FIRSTS.x + 4, FIRSTS.y + 4, FIRSTS.w - 8, FIRSTS.h - 8, PLACE.floorHi);
  setFont(g, 13);
  g.fillStyle = PLACE.mug;
  const fw = Math.ceil(g.measureText(HALL.firstsTitle).width);
  g.fillText(HALL.firstsTitle, FIRSTS.x + Math.round((FIRSTS.w - fw) / 2), FIRSTS.y + 10);
  const grounds = [PLACE.sky, PLACE.textileHi, ERA4.l, PLACE.sunHi, PLACE.bookAlt, PLACE.rugHi, PLACE.skyLo, PLACE.textile];
  const bodies = [PLACE.book, PLACE.sunHi, PLACE.bookAlt, PLACE.mug, ERA4.l, PLACE.textileHi];
  let seed = 7;
  const rnd = (): number => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let r = 0; r < 2; r++) for (let q = 0; q < 4; q++) {
    const x = FIRSTS.x + 24 + q * 72 + Math.round((rnd() - 0.5) * 6), y = FIRSTS.y + 34 + r * 78 + Math.round((rnd() - 0.5) * 6);
    rect(x, y, 56, 66, PLACE.mug);
    rect(x + 4, y + 4, 48, 46, grounds[(r * 4 + q) % grounds.length]);
    const n = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const fx = x + 10 + k * 14 + Math.round(rnd() * 4), top = y + 18 + Math.round(rnd() * 6);
      const col = bodies[Math.floor(rnd() * bodies.length)];
      rect(fx, top + 8, 8, 24 - (top - y - 18), col);                      // a body
      rect(fx + 1, top, 6, 6, PLACE.wallHi);                                // a head (no face)
      rect(fx - 3, top - 6, 2, 12, col); rect(fx + 9, top - 6, 2, 12, col);  // arms up
    }
    rect(x + 4, y + 54, 48, 2, PLACE.wallLo);                               // the caption line nobody wrote
  }
  return c;
}

function mountHallWalls(app: pc.Application): pc.Entity {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const quad = (cx: number, cy: number, cz: number, rx: number, rz: number, hw: number, hh: number,
    r: { x: number; y: number; w: number; h: number }): void => {
    const b = pos.length / 3;
    // ⚑ a canvas source is not flipped here: v 0 is the canvas top (measured: the first cut hung the walls upside down)
    const u0 = r.x / ATLAS, u1 = (r.x + r.w) / ATLAS, v0 = (r.y + r.h) / ATLAS, v1 = r.y / ATLAS;
    pos.push(cx - rx * hw, cy - hh, cz - rz * hw, cx + rx * hw, cy - hh, cz + rz * hw,
      cx + rx * hw, cy + hh, cz + rz * hw, cx - rx * hw, cy + hh, cz - rz * hw);
    uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  };
  const B = WORLD.boards;
  // her left (−z): the house rules, on legs, at eye height
  quad(B.rules.x, 2.0, B.rules.z, 1, 0, 1.4, 0.88, RULES);
  // her right (+z): the four banners, hung from their crossbar
  B.banners.xs.forEach((x, i) => quad(x + 0.3, 2.95, B.banners.z - 0.04, -1, 0, 0.42, 1.2, { ...BANNER, x: BANNER.x + i * BANNER.w }));
  // behind her (−x): the board of firsts, on legs
  quad(B.firsts.x + 0.05, 1.75, B.firsts.z, 0, -1, 1.6, 0.98, FIRSTS);
  const mesh = new pc.Mesh(app.graphicsDevice);
  mesh.setPositions(pos);
  mesh.setUvs(0, uv);
  mesh.setIndices(idx);
  mesh.update(pc.PRIMITIVE_TRIANGLES);
  const tex = new pc.Texture(app.graphicsDevice, {
    width: ATLAS, height: ATLAS, format: pc.PIXELFORMAT_RGBA8, mipmaps: false,
    minFilter: pc.FILTER_NEAREST, magFilter: pc.FILTER_NEAREST,
    addressU: pc.ADDRESS_CLAMP_TO_EDGE, addressV: pc.ADDRESS_CLAMP_TO_EDGE
  });
  tex.setSource(drawHallAtlas());
  const mat = new pc.StandardMaterial();
  mat.useLighting = false;
  mat.diffuse = new pc.Color(0, 0, 0);
  mat.emissive = new pc.Color(0.92, 0.92, 0.92);
  mat.emissiveMap = tex;
  mat.opacityMap = tex;
  mat.opacityMapChannel = 'a';
  mat.alphaTest = 0.5;
  mat.cull = pc.CULLFACE_NONE;
  mat.update();
  const e = new pc.Entity('commons-walls');
  e.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, mat)] });
  e.render!.meshInstances[0].cull = false;
  return e;
}

// ═══════════════════════════════════════════════════════════════════════════
// ⚑ S209g / I1 — HER LAMP (his tick, "we can try"). The MC says "the rest of you
// make the noise". She holds a lamp like everyone else in the hall, low at the
// edge of her view; a press raises it, and the room answers (ball.ts →
// pulseCommonsLamps). Never scored, never filed: the respite files nothing.
// It rides the camera, so it is in her hand in every look-mode, the headset's too.
// ═══════════════════════════════════════════════════════════════════════════
let herLamp: pc.Entity | null = null;
let herShown = false;
let herRaiseT = -1;
const HER_RAISE_SECONDS = 2.6;
export function setHerLamp(shown: boolean): void { herShown = shown; }
export function raiseHerLamp(): void { if (herShown) herRaiseT = 0; }
export function herLampRaised(): boolean { return herRaiseT >= 0; }

export function updateHerLamp(app: pc.Application, dt: number, worldOn: boolean): void {
  const show = herShown && worldOn;
  if (!herLamp) {
    if (!show) return;
    const cam = app.root.findByName('camera') as pc.Entity | null;
    if (!cam) return;
    // a small lantern: a lit body, a dark cap and base — the hall's lamps, held
    herLamp = new pc.Entity('commons-her-lamp');
    const part = (name: string, hex: string, y: number, sx: number, sy: number): void => {
      const e = new pc.Entity(name);
      e.addComponent('render', { type: 'box' });
      const m = new pc.StandardMaterial();
      m.useLighting = false;
      m.diffuse = new pc.Color(0, 0, 0);
      m.emissive = new pc.Color().fromString(hex);
      m.update();
      e.render!.material = m;
      e.render!.castShadows = false;
      e.setLocalPosition(0, y, 0);
      e.setLocalScale(sx, sy, sx);
      herLamp!.addChild(e);
    };
    part('her-lamp-glow', PLACE.sunHi, 0, 0.022, 0.03);
    part('her-lamp-cap', PLACE.floorLo, 0.019, 0.026, 0.008);
    part('her-lamp-base', PLACE.floorLo, -0.019, 0.026, 0.008);
    cam.addChild(herLamp);
  }
  herLamp.enabled = show;
  if (!show) { herRaiseT = -1; return; }
  let k = 0;
  if (herRaiseT >= 0) {
    herRaiseT += dt;
    const u = herRaiseT / HER_RAISE_SECONDS;
    k = u < 0.2 ? u / 0.2 : u > 0.75 ? Math.max(0, (1 - u) / 0.25) : 1;
    k = k * k * (3 - 2 * k);
    if (u >= 1) herRaiseT = -1;
  }
  // low at the right edge of her view → up into it
  herLamp.setLocalPosition(0.16 - 0.04 * k, -0.125 + 0.15 * k, -0.42 - 0.04 * k);
}

// ═══════════════════════════════════════════════════════════════════════════
// ⚑ S209g — THE SKY (his, 2026-10-03: no string lights, "so it can look more
// like a starry sky"; and the walls boxed the space in). One unlit mesh: a ring
// of dusk round the horizon, far enough that it never meets the platform, its
// colours the late-day haze fading up into the night; and a few hundred far
// stars, still. The 41 lamps (commonsLamps.ts) are the near stars: they rise
// out of the crowd as people arrive, and they twinkle.
// ═══════════════════════════════════════════════════════════════════════════
function mountSky(app: pc.Application): pc.Entity {
  const pos: number[] = [], idx: number[] = [], col: number[] = [];
  const c = (hex: string, k = 1): number[] => { const q = new pc.Color().fromString(hex); return [q.r * k, q.g * k, q.b * k, 1]; };
  const cx = WORLD.seat.x, cz = WORLD.seat.z, R = 70, SEG = 40;
  // the horizon: rows of a ring, low warm haze → a dusty rose → the night
  const rows: [number, number[]][] = [[-34, c(COMMONS_SKY)], [-5, c(PLACE.skyHaze)], [3, c(PLACE.textile)], [14, c(COMMONS_SKY)]];
  for (let i = 0; i < SEG; i++) {
    const a0 = (i / SEG) * Math.PI * 2, a1 = ((i + 1) / SEG) * Math.PI * 2;
    for (let r = 0; r < rows.length - 1; r++) {
      const b = pos.length / 3;
      const [ya, ca] = rows[r], [yb, cb] = rows[r + 1];
      pos.push(cx + Math.cos(a0) * R, ya, cz + Math.sin(a0) * R, cx + Math.cos(a1) * R, ya, cz + Math.sin(a1) * R,
        cx + Math.cos(a1) * R, yb, cz + Math.sin(a1) * R, cx + Math.cos(a0) * R, yb, cz + Math.sin(a0) * R);
      col.push(...ca, ...ca, ...cb, ...cb);
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
  }
  // the far stars: small squares on a dome, seeded, a little uneven in brightness
  let seed = 20261003;
  const rnd = (): number => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const SR = 60;
  for (let n = 0; n < 260; n++) {
    const az = rnd() * Math.PI * 2, el = (0.16 + rnd() * 0.84) * (Math.PI / 2) * 0.96;
    const x = cx + Math.cos(az) * Math.cos(el) * SR, y = Math.sin(el) * SR, z = cz + Math.sin(az) * Math.cos(el) * SR;
    const h = 0.09 + rnd() * 0.1, k = 0.45 + rnd() * 0.55;
    const ca = c(n % 7 === 0 ? PLACE.sun : PLACE.wallHi, k);
    // a square facing the seat: span it on the two directions across the line of sight
    const dx = x - cx, dy = y - 1.16, dz = z - cz, L = Math.hypot(dx, dy, dz);
    const fx = dx / L, fy = dy / L, fz = dz / L;
    let ux = -fz, uy = 0, uz = fx; const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul;
    const vx = fy * uz - fz * uy, vy = fz * ux - fx * uz, vz = fx * uy - fy * ux;
    const b = pos.length / 3;
    pos.push(x - ux * h - vx * h, y - uy * h - vy * h, z - uz * h - vz * h, x + ux * h - vx * h, y + uy * h - vy * h, z + uz * h - vz * h,
      x + ux * h + vx * h, y + uy * h + vy * h, z + uz * h + vz * h, x - ux * h + vx * h, y - uy * h + vy * h, z - uz * h + vz * h);
    col.push(...ca, ...ca, ...ca, ...ca);
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  const mesh = new pc.Mesh(app.graphicsDevice);
  mesh.setPositions(pos);
  mesh.setColors(col);
  mesh.setIndices(idx);
  mesh.update(pc.PRIMITIVE_TRIANGLES);
  const mat = new pc.StandardMaterial();
  mat.useLighting = false;
  mat.diffuse = new pc.Color(0, 0, 0);
  mat.emissive = new pc.Color(1, 1, 1);
  mat.emissiveVertexColor = true;
  mat.cull = pc.CULLFACE_NONE;
  mat.update();
  const e = new pc.Entity('commons-sky');
  e.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, mat)] });
  e.render!.meshInstances[0].cull = false;
  return e;
}
