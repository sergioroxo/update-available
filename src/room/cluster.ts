/**
 * The radial CLUSTER SHELL — the conductor for the room-becomes-a-cluster arc
 * (flow model §R8-1: one screen → one room → a cluster; geometry doc §3;
 * style direction §1-2). Behind ?reinterp=1 only. Owns:
 *
 *  - the WEST ALCOVE greybox (+110° arc, mirror of the fluid niche): the other
 *    non-lead identity's recess — one station, occupant id per era from
 *    data/room/cluster.json (non-display slugs; content briefs dress it later);
 *  - the APERTURE SCRIMS over both alcoves: sealed (E1 — architecture felt as
 *    shadow) → dim (O7 first filing — dimly legible for the first time) →
 *    open (E2+ — the radial grammar as the new normal). Opening = the scrim
 *    LIFTS (a shutter, 90° discipline) while it fades — the O8 morph seen in
 *    the room;
 *  - the per-era LIGHT RIGS (cluster.json `rigs`): crossfaded light/ambient
 *    targets on the EXISTING era1.json lights — the cold light winning era
 *    over era. Light is the narrator: every state change here is light, no UI;
 *  - morphToEra(): the one seam the OS's update ritual (O8) calls on restart.
 *    Until that ritual lands in this worktree, ?era= / ?morph= drive it.
 *
 * Everything lerps EXISTING entities/materials — no allocation on the hot
 * path (the EraMorph discipline). No text, no popups, no scores: the frame
 * never plays.
 */
import * as pc from 'playcanvas';
import { ERA1 } from '../desktop/theme/era1';
import clusterData from '../../data/room/cluster.json';
import nicheData from '../../data/room/fluid_niche.json';
import type { FluidNiche, FacetState } from './fluidNiche';
import type { CeilingWitness } from './ceilingWitness';

export type EraKey = 'e1' | 'e2' | 'e3' | 'e4';
export type ClusterState = 'sealed' | 'dim' | 'open';

/** one era's facet table from data/room/fluid_niche.json (shapes vary per era
 *  — E4 has no transfem entry — so the JSON import is cast through this) */
export interface NicheEraTable {
  default: string;
  convergence: { allowed: boolean };
  facets: Record<string, { weight: number; hero: string | null; tier: string; register: string } | undefined>;
  pull: { gaze: { dwellMs: number; delta: number; decay: boolean; latched: boolean }; sends: string[] };
}

interface RigLight { intensity: number; range?: number; color?: string }
interface Rig { ambient: number[]; lights: Record<string, RigLight> }

const RIG_FADE_SECONDS = 2.5;
const SCRIM_FADE_SECONDS = 2.2;
const SCRIM_LIFT = 1.15; // meters the shutter rises while opening

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

export interface ClusterShell {
  readonly state: ClusterState;
  readonly era: EraKey;
  /** O7: sealed → dim + ceiling wake — the first-filing reveal */
  reveal(): void;
  /** the O8 seam: crossfade rig + open apertures + re-arm the niche table */
  morphToEra(era: EraKey, animate: boolean): void;
  /** apply a named rig directly (the Close uses 'close') */
  applyRig(name: string, animate: boolean): void;
  /** the era's niche facet table (fluid_niche.json), for the gaze resolver */
  eraTable(): NicheEraTable | undefined;
  update(dt: number): void;
}

export function buildClusterShell(
  app: pc.Application,
  niche: FluidNiche,
  ceiling: CeilingWitness
): ClusterShell {
  const root = new pc.Entity('cluster-shell');
  const west = clusterData.westAlcove;
  const [wx, wy, wz] = west.center as number[];

  // ── west alcove greybox: the fluid niche's structural grammar, mirrored ──
  const structuralMat = new pc.StandardMaterial();
  structuralMat.diffuse = hex(ERA1.tealDark);
  structuralMat.update();
  const fogMat = new pc.StandardMaterial();
  fogMat.diffuse = hex(ERA1.greyDark);
  fogMat.update();
  const heroMat = new pc.StandardMaterial();
  heroMat.useLighting = false;
  heroMat.diffuse = new pc.Color(0, 0, 0);
  heroMat.emissive = hex(ERA1.silver);
  heroMat.update();

  root.addChild(box('walcove-backing', [wx - 0.07, wy + 0.04, wz], [0.04, 0.86, 1.00], structuralMat));
  root.addChild(box('walcove-lintel',  [wx,        wy + 0.44, wz], [0.18, 0.06, 1.06], structuralMat));
  root.addChild(box('walcove-sill',    [wx + 0.02, wy - 0.24, wz], [0.20, 0.05, 0.98], structuralMat));
  root.addChild(box('walcove-jambN',   [wx - 0.01, wy + 0.04, wz - 0.50], [0.16, 0.86, 0.06], structuralMat));
  root.addChild(box('walcove-jambS',   [wx - 0.01, wy + 0.04, wz + 0.50], [0.16, 0.86, 0.06], structuralMat));

  const wStation = box('walcove-station', [wx + 0.04, wy - 0.05, wz], [0.16, 0.30, 0.16], fogMat);
  root.addChild(wStation);
  const wLight = new pc.Entity('light-walcove');
  wLight.addComponent('light', {
    type: 'omni', color: hex(ERA1.beige), intensity: 0, range: 0.85, castShadows: false
  });
  wLight.setLocalPosition(wx + 0.24, wy + 0.10, wz);
  root.addChild(wLight);

  // ── the aperture scrims (translucent shutters; lerped, never reallocated) ──
  interface Scrim { ent: pc.Entity; mat: pc.StandardMaterial; baseY: number }
  const scrims: Scrim[] = (clusterData.scrims as { id: string; pos: number[]; size: number[] }[]).map(s => {
    const mat = new pc.StandardMaterial();
    mat.diffuse = hex('#15151F'); // floorWitnessDark (era1.json)
    mat.blendType = pc.BLEND_NORMAL;
    mat.opacity = clusterData.scrimOpacity.sealed;
    mat.update();
    const ent = box(s.id, s.pos, s.size, mat);
    root.addChild(ent);
    return { ent, mat, baseY: s.pos[1] };
  });

  app.root.addChild(root);

  // ── state ──
  let state: ClusterState = 'sealed';
  let era: EraKey = 'e1';
  let scrimFrom = clusterData.scrimOpacity.sealed;
  let scrimTo = scrimFrom;
  let scrimT = 1; // 1 = settled
  let lifting = false;

  function setScrimTarget(opacity: number, lift: boolean): void {
    scrimFrom = scrims[0].mat.opacity;
    scrimTo = opacity;
    scrimT = 0;
    lifting = lift;
    for (const s of scrims) s.ent.enabled = true;
  }

  // ── rig crossfade (existing lights only; missing ids are skipped safely) ──
  interface LightFade {
    light: pc.LightComponent;
    fi: number; ti: number; fr: number; tr: number;
    fc: pc.Color; tc: pc.Color;
  }
  let rigFades: LightFade[] = [];
  let ambFrom = new pc.Color(0, 0, 0);
  let ambTo = new pc.Color(0, 0, 0);
  let rigT = 1;
  let rigDur = RIG_FADE_SECONDS;

  function applyRig(name: string, animate: boolean): void {
    const rig = (clusterData.rigs as unknown as Record<string, Rig | undefined>)[name];
    if (name === '_note') return; // the doc key is not a rig
    if (!rig) return;
    rigFades = [];
    for (const [id, target] of Object.entries(rig.lights)) {
      const e = app.root.findByName(`light-${id}`);
      if (!(e instanceof pc.Entity) || !e.light) continue;
      const l = e.light;
      const tc = target.color ? hex(target.color) : l.color.clone();
      if (animate) {
        rigFades.push({
          light: l,
          fi: l.intensity, ti: target.intensity,
          fr: l.range, tr: target.range ?? l.range,
          fc: l.color.clone(), tc
        });
      } else {
        l.intensity = target.intensity;
        if (target.range !== undefined) l.range = target.range;
        l.color = tc;
      }
    }
    ambTo = new pc.Color(rig.ambient[0], rig.ambient[1], rig.ambient[2]);
    if (animate) {
      ambFrom = app.scene.ambientLight.clone();
      rigT = 0;
      rigDur = RIG_FADE_SECONDS;
    } else {
      app.scene.ambientLight = ambTo;
      rigT = 1;
    }
  }

  function applyOccupant(): void {
    const occupant = (west.occupantByEra as Record<EraKey, string>)[era];
    const lit = state === 'open' && occupant !== 'none';
    if (wStation.render) wStation.render.material = lit ? heroMat : fogMat;
    if (wLight.light) wLight.light.intensity = lit ? 2.2 : state === 'dim' ? 0.35 : 0;
  }

  function eraTable(): NicheEraTable | undefined {
    return (nicheData.eras as unknown as Record<string, NicheEraTable | undefined>)[era];
  }

  return {
    get state(): ClusterState { return state; },
    get era(): EraKey { return era; },

    reveal(): void {
      if (state !== 'sealed') return;
      state = 'dim';
      setScrimTarget(clusterData.scrimOpacity.dim, false);
      ceiling.wake();
      applyOccupant();
      // the niche's E1 near-dark state stands (the darkness IS the content);
      // dim legibility comes from the scrim + the alcove's faint pool alone
    },

    morphToEra(toEra: EraKey, animate: boolean): void {
      era = toEra;
      const targetState = (clusterData.states as Record<EraKey, ClusterState>)[toEra] ?? 'open';
      applyRig(toEra, animate);
      if (targetState === 'open' && state !== 'open') {
        state = 'open';
        if (animate) setScrimTarget(clusterData.scrimOpacity.open, true);
        else {
          for (const s of scrims) { s.mat.opacity = 0; s.mat.update(); s.ent.enabled = false; }
        }
        if (animate) ceiling.wake(); else ceiling.wakeInstant();
      } else if (targetState === 'sealed') {
        state = 'sealed';
        setScrimTarget(clusterData.scrimOpacity.sealed, false);
      }
      const table = eraTable();
      niche.setFacet((table?.default ?? 'none') as FacetState);
      applyOccupant();
    },

    applyRig,
    eraTable,

    update(dt: number): void {
      if (scrimT < 1) {
        scrimT = Math.min(1, scrimT + dt / SCRIM_FADE_SECONDS);
        const k = scrimT * scrimT * (3 - 2 * scrimT);
        const o = scrimFrom + (scrimTo - scrimFrom) * k;
        for (const s of scrims) {
          s.mat.opacity = o;
          s.mat.update();
          if (lifting) s.ent.setLocalPosition(s.ent.getLocalPosition().x, s.baseY + SCRIM_LIFT * k, s.ent.getLocalPosition().z);
        }
        if (scrimT >= 1 && scrimTo <= 0) for (const s of scrims) s.ent.enabled = false;
      }
      if (rigT < 1) {
        rigT = Math.min(1, rigT + dt / rigDur);
        const k = rigT * rigT * (3 - 2 * rigT);
        for (const f of rigFades) {
          f.light.intensity = f.fi + (f.ti - f.fi) * k;
          f.light.range = f.fr + (f.tr - f.fr) * k;
          f.light.color = new pc.Color(
            f.fc.r + (f.tc.r - f.fc.r) * k,
            f.fc.g + (f.tc.g - f.fc.g) * k,
            f.fc.b + (f.tc.b - f.fc.b) * k
          );
        }
        app.scene.ambientLight = new pc.Color(
          ambFrom.r + (ambTo.r - ambFrom.r) * k,
          ambFrom.g + (ambTo.g - ambFrom.g) * k,
          ambFrom.b + (ambTo.b - ambFrom.b) * k
        );
      }
    }
  };
}
