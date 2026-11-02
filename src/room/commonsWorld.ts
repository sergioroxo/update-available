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
  /** ⚑ S227 — THE ONE SPOT (nodes.json `commons-spot`, kept in step by hand): the front of the crowd, on the
   *  stage's axis, 4.2 m from it. She is cut here when the hall cuts in, and everything she needs is ahead. */
  spot: { x: 5.2, z: 0.7 },
  /** ⚑ S209g — where the hall's words stand, now that there are no walls to hang them on.
   *  ⚑ S227 (his §8 Q9: "the wall of firsts comes into the forward half; nothing she needs is behind her") —
   *  all three moved forward of the spot: the rules front-left of the stage (~−41°), the banners front-right
   *  (~+30…50°), the wall of firsts out to her left (~−78°), facing her. They used to stand left, right and
   *  BEHIND the old seat. Axis-aligned still: 90° steps only. */
  boards: {
    rules: { x: 9.0, z: -2.6 },
    banners: { xs: [7.4, 8.4, 9.4, 10.4], z: 4.2 },
    firsts: { x: 6.0, z: -3.4 }
  }
} as const;

/** ⚑ S227 — HIS Q8 ("not a conducted turn — a prompt"): the room's call is pressed on the glass (ball.ts), and
 *  the turn to the stage is the camera's, so it is the engine's (app.ts registers it). One hook, like
 *  cluster.ts's `onCommonsRoom`, because the shell that presses it is rebuilt on every return to 2026. */
let turnHook: (() => void) | null = null;
export function onTurnToStage(fn: () => void): void { turnHook = fn; }
export function turnToStage(): void { turnHook?.(); }

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
  // ⚑ S293 — the banners, the house rules and the wall of firsts are gone with the ballroom (ENDING_TRANSJESUS): the
  //   place is a floor, a stage, the stream's screen and the sky. Nothing on it says who anybody is.
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


  let on = false;
  let t = 0;
  return {
    entity,
    get on() { return on; },
    setOn(v: boolean): void { on = v; entity.enabled = v; },
    update(dt: number): void {
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
// ⚑ S209g — THE SKY (his, 2026-10-03: no string lights, "so it can look more
// like a starry sky"; and the walls boxed the space in). One unlit mesh: a ring
// of dusk round the horizon, far enough that it never meets the platform, its
// colours the late-day haze fading up into the night; and a few hundred far
// stars, still. (S293: the 41 lamps that rose here are gone with the ballroom; the stream's light is the stage's.)
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
