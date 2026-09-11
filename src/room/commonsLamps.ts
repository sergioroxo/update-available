/**
 * ⚑ THE COMMONS' LAMPS (S133, 2026-09-11) — the community, visible.
 *
 * Sérgio, on the ball as it was: *"The Ball makes no sense to not be visual… so
 * it is just sounds? … If it's not visible, not relevant here."* He was right.
 * S79's ball was a light changing colour, a subtitle strip, and two sound files
 * that do not exist; a person sitting in it saw nothing happen. This is what
 * happens: **forty-one lamps** come up in the open building — one per person
 * present — as the apparatus's filter fails to classify the space she has gone
 * into. `forty-one present · no host listed` is the overlay's own count, and
 * this is the count made visible.
 *
 * ⚑ WHY LAMPS AND NOT PEOPLE. Avatars cost draw calls this piece does not have
 * (140 at the turn against ≤75), and faceless low-poly figures are exactly the
 * uncanny thing a respite must not be. The lamp is the piece's own word: the
 * SOGICE companion is called *Lantern*; E3's invented scripture asks for *"one
 * lamp set beside the door"*; the logo is the lamp. Forty-one of them, held at
 * hand height, is the apparatus's vocabulary taken back — and it reads from
 * any seat, in any look-mode, at any distance.
 *
 * ⚑ ONE DRAW CALL. All forty-one are one procedural mesh (the same trick
 * `pointCloud.ts` uses for the Close's constellation). Lamps that are not yet
 * present are simply sunk below the floor; revealing one moves it up and
 * rebuilds the buffer — a handful of rebuilds over twenty seconds, then
 * nothing. Never batched, never lit: it is emissive and it is the light.
 *
 * ⚑ THE PALETTE IS THE THEME'S. `BALL.attention` is the warm the ball has always
 * had; nothing here invents a colour (check-spec's palette ratchet, 33/33).
 */
import * as pc from 'playcanvas';
import { BALL } from '../desktop/theme/era4';

const LAMP_COUNT = 41;
/** half-size of a lamp: a small held thing, not a piece of furniture */
const LAMP_HALF = 0.03;
const LAMP_ASPECT = 1.4;
/** where a hidden lamp waits — under the building, out of every frustum */
const SUNK_Y = -40;
/** seconds for the whole set to reach full brightness once the first one is up */
const RISE_SECONDS = 1.6;
/** the seat they must not crowd: the E4 seat at (4.4, 0.7), and the desk wall */
const SEAT = { x: 4.4, z: 0.7, clear: 1.35 };
const DESK_WALL_X = 4.95;

/** seeded, so the crowd stands where it stood last time — a review can
 *  photograph it twice and compare */
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

let hook: ((n: number) => void) | null = null;
/** how many of the forty-one are present. 0 takes them all away. */
export function setCommonsLamps(n: number): void {
  hook?.(Math.max(0, Math.min(LAMP_COUNT, Math.floor(n))));
}

export function mountCommonsLamps(app: pc.Application, parent: pc.Entity): { update(dt: number): void } {
  // ── positions: the open building, x −6.0…5.0 (Room 2 through Room 3), a
  // band at hand height, nobody inside the seat's own space or the desk ──
  const rng = makeRng(20260911);
  const spots: [number, number, number][] = [];
  // ⚑ SIX IN FRONT, AT THE EDGES, THIRTY-FIVE BEHIND. The old ball put every
  // station behind the seat so that the turn was the only way to see it; that
  // is still where the crowd is. But a player who has just pressed Go in and
  // is looking at the desk must see the space BEGIN — lamps at the periphery,
  // either side of the monitor — or the beat reads as nothing happening until
  // they happen to turn. The periphery is the invitation to turn.
  // Measured against the seat's 29.7° horizontal half-FOV: at 0.6–1.0 m ahead
  // a lamp is in frame only while |dz| ≤ ~0.5·dx, i.e. over the desk, above and
  // either side of the monitor (its glass tops out at y 1.165). Hand height
  // there is 1.3–1.6: people standing at the edge of the picture.
  while (spots.length < 6) {
    const dx = 0.9 + rng() * 0.25;                       // back by the wall
    const side = rng() < 0.5 ? -1 : 1;
    const x = SEAT.x + dx;
    const z = SEAT.z + side * (0.36 + rng() * 0.16);   // beside the monitor
    const y = 1.0 + rng() * 0.3;
    spots.push([x, y, z]);
  }
  while (spots.length < LAMP_COUNT) {
    const x = -6.0 + rng() * 10.0;
    const z = -0.6 + rng() * 3.4;
    const y = 0.95 + rng() * 0.6;
    if (x > DESK_WALL_X - 0.9) continue;
    if (Math.hypot(x - SEAT.x, z - SEAT.z) < SEAT.clear) continue;
    spots.push([x, y, z]);
  }

  const C = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
  ];
  const F = [
    [0, 1, 2, 0, 2, 3], [4, 6, 5, 4, 7, 6], [0, 4, 5, 0, 5, 1],
    [3, 2, 6, 3, 6, 7], [0, 3, 7, 0, 7, 4], [1, 5, 6, 1, 6, 2]
  ];
  const indices: number[] = [];
  for (let n = 0; n < LAMP_COUNT; n++) for (const face of F) for (const i of face) indices.push(n * 8 + i);

  const mesh = new pc.Mesh(app.graphicsDevice);
  const build = (present: number): void => {
    const positions: number[] = [];
    spots.forEach(([x, y, z], n) => {
      const yy = n < present ? y : SUNK_Y;
      for (const [cx, cy, cz] of C) {
        positions.push(x + cx * LAMP_HALF, yy + cy * LAMP_HALF * LAMP_ASPECT, z + cz * LAMP_HALF);
      }
    });
    mesh.setPositions(positions);
    mesh.setIndices(indices);
    mesh.update(pc.PRIMITIVE_TRIANGLES);
  };
  build(0);

  const mat = new pc.StandardMaterial();
  mat.useLighting = false;
  mat.diffuse = new pc.Color(0, 0, 0);
  mat.emissive = new pc.Color().fromString(BALL.attention);
  mat.blendType = pc.BLEND_NORMAL;
  mat.opacity = 0;
  mat.update();

  const ent = new pc.Entity('commons-lamps');
  ent.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, mat)] });
  // the whole building at once: never culled on a per-lamp basis
  ent.render!.meshInstances[0].cull = false;
  ent.enabled = false;
  parent.addChild(ent);

  let present = 0;
  let want = 0;
  let rise = 0;
  hook = (n) => { want = n; };

  return {
    update(dt: number): void {
      if (want !== present) {
        present = want;
        build(present);
        ent.enabled = present > 0 || rise > 0;
      }
      const target = present > 0 ? 1 : 0;
      const step = dt / RISE_SECONDS;
      rise = target > rise ? Math.min(target, rise + step) : Math.max(target, rise - step);
      if (mat.opacity !== rise) { mat.opacity = rise; mat.update(); }
      if (rise <= 0 && present === 0 && ent.enabled) ent.enabled = false;
    }
  };
}
