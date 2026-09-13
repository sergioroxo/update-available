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
  floor: { x: 4.4, z: 0.7, w: 22, d: 16 },
  /** the hall's walls — a real end to the room, 2026-09-13 (the far floor read
   *  as a beige horizon under the rig); tall, and in the sky's own dark */
  walls: { h: 5.2, back: 12.4, front: -6.4, left: -7.3, right: 8.7 },
  sky: COMMONS_SKY,
  floorColor: ERA4.panelEdge,
  wallColor: ERA4.panel,
  stageColor: PLACE.floorLo,
  frameColor: ERA4.panelHi
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
  pushBox(pos, idx, FL.x, -0.02, FL.z, FL.w / 2, 0.02, FL.d / 2); paint(WORLD.floorColor, 8);
  /**
   * ⚑ COLOUR (2026-09-12). Sérgio: "not totally convinced on the styling of
   * the space… maybe we need more pop of colour." A ball has a dance floor and
   * it has lights. The floor between her and the stage is a grid of tiles in
   * three of the palette's warm and cool values; the stage edge is lit; the
   * columns are two pink, two teal; and three coloured lights sweep the room
   * (below). All from the theme — nothing invented.
   */
  const TILE = [PLACE.textileHi, ERA4.l, PLACE.sunHi, PLACE.bookAlt];
  for (let i = 0; i < 9; i++) for (let j = 0; j < 8; j++) {
    const x = 5.2 + i * 0.5, z = S.z - 2.0 + j * 0.5;
    pushBox(pos, idx, x, 0.032, z, 0.24, 0.01, 0.24); paint(TILE[(i * 3 + j * 5) % 4], 8);   // proud of the floor, no z-fight
  }
  // ⚑ the walls (2026-09-13): four, tall, dark — the hall has an inside now
  const WL = WORLD.walls;
  pushBox(pos, idx, WL.back, WL.h / 2, FL.z, 0.06, WL.h / 2, FL.d / 2); paint(WORLD.wallColor, 8);
  pushBox(pos, idx, WL.front, WL.h / 2, FL.z, 0.06, WL.h / 2, FL.d / 2); paint(WORLD.wallColor, 8);
  pushBox(pos, idx, FL.x, WL.h / 2, WL.left, FL.w / 2, WL.h / 2, 0.06); paint(WORLD.wallColor, 8);
  pushBox(pos, idx, FL.x, WL.h / 2, WL.right, FL.w / 2, WL.h / 2, 0.06); paint(WORLD.wallColor, 8);
  pushBox(pos, idx, S.x, S.h / 2, S.z, S.w / 2, S.h / 2, S.d / 2); paint(WORLD.stageColor, 8);
  pushBox(pos, idx, S.x - S.d / 2, S.h, S.z, 0.03, 0.02, S.w / 2); paint(PLACE.sunHi, 8);   // the stage's lit lip
  // the screen's frame (the picture itself is the `stream` plane, in front of it)
  pushBox(pos, idx, SC.x + 0.06, SC.y, SC.z, 0.06, SC.h / 2 + 0.12, SC.w / 2 + 0.12); paint(WORLD.frameColor, 8);
  // four columns, so the hall has a size: two either side of the stage, two behind her
  const COL = [PLACE.textileHi, ERA4.l, ERA4.l, PLACE.textileHi];
  [[9.4, -3.2], [9.4, 4.6], [1.0, -3.2], [1.0, 4.6]].forEach(([x, z], k) => {
    pushBox(pos, idx, x, 2.2, z, 0.18, 2.2, 0.18); paint(COL[k], 8);
  });
  // a band of colour along the back wall behind the screen
  pushBox(pos, idx, SC.x + 0.4, 1.2, SC.z, 0.05, 1.2, 6.5); paint(PLACE.bookAlt, 8);
  // a low rail round the floor's far edge: the world has an end
  pushBox(pos, idx, FL.x - FL.w / 2 + 0.2, 0.5, FL.z, 0.05, 0.5, FL.d / 2); paint(ERA4.panelEdge, 8);
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
  mat.emissive = new pc.Color(0.34, 0.34, 0.34);
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
