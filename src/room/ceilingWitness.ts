/**
 * The ceiling witness — PRESENCE ONLY (R8-3, adopted; style direction §3).
 * The watcher occupies heaven's position: a square iris recessed into the
 * ceiling (90°-step pixel discipline — no curves) and, once awake, a pale
 * SOURCELESS wash from above — light with no lamp, the only light in the
 * piece that casts no shadows even in fiction. It NEVER reads, never shows
 * text; the legible record stays with the assistants + flat surfaces
 * (Ethics #10). Dormant until the O7 first filing wakes it; awake it
 * breathes — a slow intensity swell, presence without address.
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
  /** begin the slow fade-in (O7 first-filing; idempotent) */
  wake(): void;
  /** jump straight to fully awake (debug/era overrides — no animation) */
  wakeInstant(): void;
  readonly awake: boolean;
  update(dt: number): void;
}

export function buildCeilingWitness(app: pc.Application): CeilingWitness {
  const root = new pc.Entity('ceiling-witness');
  const [cx, cy, cz] = CW.center as number[];

  // the recess: a dark square set into the ceiling — legible as architecture
  // even while dormant (O6: "felt as hum and shadow, not shown")
  const darkMat = new pc.StandardMaterial();
  darkMat.diffuse = hex('#11111C'); // wallSouth's near-black (era1.json)
  darkMat.update();
  root.addChild(box('witness-oculus', [cx, cy + 0.006, cz], [CW.oculusSize, 0.012, CW.oculusSize], darkMat));

  // the iris: a square emissive ring (4 thin boxes) + a darker pupil.
  // Emissive is driven by the wake level — near-black dormant, pale awake.
  const ringColor = hex(CW.ringColor);
  const ringMat = new pc.StandardMaterial();
  ringMat.useLighting = false;
  ringMat.diffuse = new pc.Color(0, 0, 0);
  ringMat.emissive = new pc.Color(0, 0, 0);
  ringMat.update();
  const s = CW.ringSide;
  const t = CW.ringThickness;
  const ry = cy - 0.004;
  root.addChild(box('witness-ringN', [cx, ry, cz - s / 2], [s + t, 0.012, t], ringMat));
  root.addChild(box('witness-ringS', [cx, ry, cz + s / 2], [s + t, 0.012, t], ringMat));
  root.addChild(box('witness-ringW', [cx - s / 2, ry, cz], [t, 0.012, s - t], ringMat));
  root.addChild(box('witness-ringE', [cx + s / 2, ry, cz], [t, 0.012, s - t], ringMat));

  const pupilMat = new pc.StandardMaterial();
  pupilMat.diffuse = hex('#15151F'); // floorWitnessDark (era1.json)
  pupilMat.update();
  root.addChild(box('witness-pupil', [cx, cy - 0.008, cz], [CW.pupilSize, 0.012, CW.pupilSize], pupilMat));

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
