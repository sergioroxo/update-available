/**
 * The ceiling witness — retired/dormant presence shell (R26 B4).
 * The watcher occupies heaven's position: a square iris recessed into the
 * ceiling (90°-step pixel discipline — no curves) and, once awake, a pale
 * SOURCELESS wash from above — light with no lamp, the only light in the
 * piece that casts no shadows even in fiction. It NEVER reads, never shows
 * text; the legible record stays with the assistants + flat surfaces
 * (Ethics #10). The wall cork/record surface now carries the witness lineage,
 * so the cluster no longer wakes this overhead iris during reveal or updates.
 *
 * ⚑ SESSION 61 — THE IRIS NO LONGER RENDERS. R26 retired the WAKE and left the
 * geometry in the ceiling: a 1.06 m near-black square with a darker pupil,
 * permanently dormant, over Room 1. Nothing ever lit it, nothing ever
 * referred to it, and once the walls come down at E3 you sit in Room 2 and
 * look up at it across the open space. Sérgio's Room-2 review circled exactly
 * that — *"a black square in the sky"*, unexplained — and it was unexplained
 * because it is the leftover of a mechanic this build no longer has. Picked
 * live from his own sightline before removal: the ray from Room 2's seat at
 * (-4.4, 1.16, 0.7) hits `witness-oculus`, AABB centre (0, 2.701, 1.5).
 * The module stays (the wash light, the wake/wakeInstant hooks and the
 * data block are all still here, unchanged and still wired) so the presence
 * can be restored in one line if the overhead lineage is ever revived; what
 * is gone is the four ring bars, the oculus recess and the pupil — the only
 * parts that were ever VISIBLE while dormant.
 *
 * Geometry + wash parameters live in data/room/cluster.json (ceilingWitness);
 * all hues are existing era1.json values. Behind ?reinterp=1 only.
 */
import * as pc from 'playcanvas';
import cluster from '../../data/room/cluster.json';

const CW = cluster.ceilingWitness;

function hex(c: string): pc.Color {
  const n = parseInt(c.slice(1), 16);
  return new pc.Color(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function box(name: string, pos: number[], size: number[], mat: pc.Material): pc.Entity {
  const e = new pc.Entity(name);
  e.addComponent('render', { type: 'box' });
  e.setLocalPosition(pos[0], pos[1], pos[2]);
  e.setLocalScale(size[0], size[1], size[2]);
  if (e.render) e.render.material = mat;
  return e;
}

export interface CeilingWitness {
  /** legacy hook; currently unused so the overhead iris stays dormant */
  wake(): void;
  /** legacy hook; currently unused so the overhead iris stays dormant */
  wakeInstant(): void;
  readonly awake: boolean;
  update(dt: number): void;
}

export function buildCeilingWitness(app: pc.Application): CeilingWitness {
  const root = new pc.Entity('ceiling-witness');
  const [cx, , cz] = CW.center as number[]; // the iris's own `cy` went with it (S61)

  // ⚑ THE IRIS GEOMETRY IS RETIRED (Session 61 — see the header). The recess
  // (`witness-oculus`), the four ring bars and the pupil used to be built
  // here; they never lit, never woke, and read from Room 2 as an unexplained
  // black square in the ceiling. `box()` and the ring colour/side/thickness
  // data are deliberately left intact below and in data/room/cluster.json so
  // restoring the presence is a matter of putting these four lines back.
  const ringColor = hex(CW.ringColor);
  const ringMat = new pc.StandardMaterial();
  ringMat.useLighting = false;
  ringMat.diffuse = new pc.Color(0, 0, 0);
  ringMat.emissive = new pc.Color(0, 0, 0);
  ringMat.update();
  void box; // the builder stays for that restore path

  // the wash: pale, from above, no visible source, no shadows (all lights in
  // this piece cast none — here it is also the fiction)
  const wash = new pc.Entity('light-witnessWash');
  wash.addComponent('light', {
    type: 'omni',
    color: hex(CW.wash.color),
    intensity: 0,
    range: CW.wash.range,
    castShadows: false
  });
  wash.setLocalPosition(cx, CW.wash.y, cz);
  root.addChild(wash);

  app.root.addChild(root);

  let level = 0;          // 0 = dormant, 1 = awake
  let target = 0;
  let breathPhase = 0;

  function apply(): void {
    const breath = level >= 1 ? 1 + CW.breath.depth * Math.sin(breathPhase * (Math.PI * 2) / CW.breath.period) : 1;
    ringMat.emissive.set(ringColor.r * level * breath, ringColor.g * level * breath, ringColor.b * level * breath);
    ringMat.update();
    if (wash.light) wash.light.intensity = CW.wash.intensity * level * breath;
  }

  return {
    wake(): void { target = 1; },
    wakeInstant(): void { target = 1; level = 1; apply(); },
    get awake(): boolean { return target === 1; },
    update(dt: number): void {
      if (level !== target) {
        const step = dt / CW.wakeSeconds;
        level = target > level ? Math.min(target, level + step) : Math.max(target, level - step);
        apply();
      } else if (level >= 1) {
        breathPhase += dt; // the slow swell — presence, not signal
        apply();
      }
    }
  };
}
