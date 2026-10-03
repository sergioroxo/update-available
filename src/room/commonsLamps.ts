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
import { BALL, PLACE, ERA4 } from '../desktop/theme/era4';
import { WORLD } from './commonsWorld';

const LAMP_COUNT = 41;
/** half-size of a lamp: a small held thing, not a piece of furniture */
const LAMP_HALF = 0.11;    // ⚑ S209g — a near star, ~16 m off: about the size of a bright planet from the seat
const LAMP_ASPECT = 1.0;
/** ⚑ S209g — seconds a lamp takes to rise out of the crowd into its place in the sky */
const ASCEND_SECONDS = 4.2;
/** where a hidden lamp waits — under the building, out of every frustum */
const SUNK_Y = -40;
/** seconds for the whole set to reach full brightness once the first one is up */
const RISE_SECONDS = 1.6;

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
let pulseHook: ((kind: 'chase' | 'flare') => void) | null = null;
/** ⚑ S209g / M2 — a chase down the strings (a category is called) or a flare of the whole hall (a landing; her lamp) */
export function pulseCommonsLamps(kind: 'chase' | 'flare'): void { pulseHook?.(kind); }
const CHASE_SECONDS = 1.4;
const FLARE_SECONDS = 1.8;
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
  /**
   * ⚑ 2026-09-12 — STRING LIGHTS ACROSS THE HALL. The Commons is a world now
   * (commonsWorld.ts): four strings of lamps hang across it at the ceiling
   * line, between the columns, front to back — the first six over her own
   * head so the room visibly begins where she is, the rest toward the stage.
   */
  // ⚑ S209g (his, 2026-10-03: "preferred without them, so it can look more like a starry sky") — NO
  //   STRINGS. Each lamp is a near star: a place on the dome over the open platform, and a place in the
  //   crowd it rises FROM when its person arrives — the count made visible, going up. The first places
  //   are in front of her, low, so the sky visibly begins where she is looking; the rest fill round.
  const from: [number, number, number][] = [];
  const az0 = 0;   // the seat faces +x: azimuth 0
  for (let n = 0; n < LAMP_COUNT; n++) {
    const spread = Math.min(1, n / 28);   // the first ones ahead, the later ones all the way round
    const az = az0 + (rng() - 0.5) * (0.9 + spread * 5.4);
    const el = 0.32 + rng() * 0.75;
    const r = 15 + rng() * 6;
    spots.push([WORLD.seat.x + Math.cos(az) * Math.cos(el) * r, 1.16 + Math.sin(el) * r, WORLD.seat.z + Math.sin(az) * Math.cos(el) * r]);
    // someone in the crowd, holding it up: between her and the stage, or beside her
    from.push([WORLD.seat.x + 2.2 + rng() * 2.6, 1.9, WORLD.seat.z + (rng() - 0.5) * 4.4]);
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
  // ⚑ S209g — every upload carries BOTH streams. A rebuild that set positions alone dropped the colour
  //   stream (measured: the vertex buffer held POSITION only), so since 2026-09-12 every lamp drew white.
  let positions: number[] = [];
  // ⚑ 2026-09-12: string lights in three colours — the lamp's own gold, the
  //   pink and the teal the hall is lit in — carried as vertex colours
  const LAMP_COLORS = [BALL.attention, PLACE.textileHi, ERA4.l].map((h) => new pc.Color().fromString(h));
  // ⚑ S209g / M2 — each lamp has its own brightness: at rest a little under full, a chase runs along
  //   the strings when a category is called, and the whole hall flares when someone lands (or she raises hers)
  const lampColors: number[] = new Array(LAMP_COUNT * 8 * 4).fill(1);
  const upload = (): void => {
    mesh.setPositions(positions);
    mesh.setColors(lampColors);
    mesh.setIndices(indices);
    mesh.update(pc.PRIMITIVE_TRIANGLES);
  };
  // each lamp's time since its person arrived (−1: not here); it rises from `from` to `spots` over ASCEND_SECONDS
  const arrived: number[] = new Array(LAMP_COUNT).fill(-1);
  const place = (): void => {
    positions = [];
    spots.forEach(([x, y, z], n) => {
      let px = x, py = y, pz = z, half = LAMP_HALF;
      if (arrived[n] < 0) py = SUNK_Y;
      else if (arrived[n] < ASCEND_SECONDS) {
        const u = arrived[n] / ASCEND_SECONDS, e = 1 - (1 - u) * (1 - u) * (1 - u);   // quick off the hand, slow into place
        const [fx, fy, fz] = from[n];
        px = fx + (x - fx) * e; py = fy + (y - fy) * e + Math.sin(u * Math.PI) * 1.2; pz = fz + (z - fz) * e;
        half = 0.035 + (LAMP_HALF - 0.035) * e;
      }
      for (const [cx, cy, cz] of C) positions.push(px + cx * half, py + cy * half * LAMP_ASPECT, pz + cz * half);
    });
  };
  const build = (present: number): void => {
    for (let n = 0; n < LAMP_COUNT; n++) {
      if (n < present && arrived[n] < 0) arrived[n] = 0;
      if (n >= present) arrived[n] = -1;
    }
    place();
    upload();
  };
  const paint = (bright: (n: number) => number): void => {
    for (let n = 0; n < LAMP_COUNT; n++) {
      const c = LAMP_COLORS[n % 3], b = bright(n);
      const w = Math.max(0, b - 1) * 0.6, k = Math.min(1, b);   // above 1: toward white
      const r = c.r * k + (1 - c.r * k) * w, g = c.g * k + (1 - c.g * k) * w, bl = c.b * k + (1 - c.b * k) * w;
      for (let i = 0; i < 8; i++) { const o = (n * 8 + i) * 4; lampColors[o] = r; lampColors[o + 1] = g; lampColors[o + 2] = bl; lampColors[o + 3] = 1; }
    }
  };
  build(0);
  paint(() => 0.8);
  const mat = new pc.StandardMaterial();
  mat.useLighting = false;
  mat.diffuse = new pc.Color(0, 0, 0);
  mat.emissive = new pc.Color(1, 1, 1);
  mat.emissiveVertexColor = true;
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
  let chaseT = -1, flareK = 0, pulseAcc = 0, t = 0;
  pulseHook = (kind) => { if (kind === 'chase') chaseT = 0; else flareK = 1; };
  // the chase is a wave across the sky, left to right as she faces the stage
  const across = spots.map(([, , z]) => Math.max(0, Math.min(1, (z - WORLD.seat.z + 18) / 36)));
  const tw = spots.map((_, n) => 0.7 + (n * 2.399) % 3);   // each star's own twinkle rate

  return {
    update(dt: number): void {
      if (want !== present) {
        present = want;
        build(present);
        ent.enabled = present > 0 || rise > 0;
      }
      // ⚑ S209g — the sky is alive while anyone is in it: lamps rising, twinkling, the chase, the flare
      t += dt;
      for (let n = 0; n < LAMP_COUNT; n++) if (arrived[n] >= 0) arrived[n] += dt;
      if (chaseT >= 0) chaseT += dt;
      if (chaseT > CHASE_SECONDS + 0.6) chaseT = -1;
      flareK = Math.max(0, flareK - dt / FLARE_SECONDS);
      pulseAcc += dt;
      if (present > 0 && pulseAcc >= 1 / 15) {
        pulseAcc = 0;
        paint((n) => {
          let b = 0.78 + 0.14 * Math.sin(t * tw[n] + n) + 0.7 * flareK;
          if (chaseT >= 0) { const d = Math.abs(across[n] - chaseT / CHASE_SECONDS); b += 0.6 * Math.max(0, 1 - d * 5); }
          if (arrived[n] >= 0 && arrived[n] < ASCEND_SECONDS) b += 0.4;   // a lamp going up burns brighter
          return b;
        });
        place();
        upload();
      }
      const target = present > 0 ? 1 : 0;
      const step = dt / RISE_SECONDS;
      rise = target > rise ? Math.min(target, rise + step) : Math.max(target, rise - step);
      if (mat.opacity !== rise) { mat.opacity = rise; mat.update(); }
      if (rise <= 0 && present === 0 && ent.enabled) ent.enabled = false;
    }
  };
}
