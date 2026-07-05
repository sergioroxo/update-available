/**
 * The radial cluster CONDUCTOR (v3 — Sérgio Round 21). The space itself now
 * lives in DATA (data/room/reinterp_deltas.json) and transforms through the
 * ported shipped morph (clusterMorph.ts): at T1 the walls of Daniel's room
 * SLIDE AND STRETCH outward, the spine recedes with the door and the record
 * terminal, and two fully-dressed rooms cascade in where the walls stood —
 * so that facing any direction reads as A ROOM, not a diorama (his reference;
 * no central disc — "too impersonal"). Short piers remain on the old wall
 * lines: the memory of the wall.
 *
 * This module keeps only conduction: the per-era LIGHT RIGS (crossfaded — the
 * cold light winning), the T1 staged timeline (lamp hold → ballast → cascade →
 * settle), the O7 reveal (light-leak seams + ceiling wake), the E4 TURN's
 * homeYaw, the lamp LIGHT following its carried props, the witness plane's
 * spine ride, and the niche facet defaults. Light is the narrator; the props
 * belong to the morph.
 */
import * as pc from 'playcanvas';
import type { RoomHandles } from './era1room';
import { ClusterMorph } from './clusterMorph';
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
interface Rig { ambient: number[]; zoneFill: number; lights: Record<string, RigLight> }

const RIG_FADE_SECONDS = 2.5;
/** space-state index per era (reinterp_deltas.json fold: r1 → r2 → r4) */
const STATE_FOR_ERA: Record<EraKey, number> = { e1: 0, e2: 1, e3: 1, e4: 2 };
/** the witness record plane's home per spatial state (rides the spine) */
const PLANE_Z: [number, number] = [3.685, 5.405];

function hex(c: string): pc.Color {
  const n = parseInt(c.slice(1), 16);
  return new pc.Color(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export interface ClusterShell {
  readonly state: ClusterState;
  readonly era: EraKey;
  /** the home facing: 0° until E4, 180° after the TURN (locked ◆N3) */
  readonly homeYaw: number;
  /** O7: sealed → dim + ceiling wake — the first-filing reveal */
  reveal(): void;
  /** the O8 seam: cascade the space + crossfade the rig + re-arm the niche */
  morphToEra(era: EraKey, animate: boolean): void;
  /** apply a named rig directly (the Close uses 'close') */
  applyRig(name: string, animate: boolean): void;
  /** the era's niche facet table (fluid_niche.json), for the gaze resolver */
  eraTable(): NicheEraTable | undefined;
  update(dt: number): void;
}

export function buildClusterShell(
  app: pc.Application,
  room: RoomHandles,
  niche: FluidNiche,
  ceiling: CeilingWitness
): ClusterShell {
  const root = new pc.Entity('cluster-shell');

  // ── the space morph (ported shipped effect) — start in the r1 state ──
  const morph = new ClusterMorph(room);
  morph.snapTo(0);

  // ── zone accent lights (rig-driven; the two rooms' own temperatures) ──
  const zoneLights: pc.Entity[] = [];
  const mkLight = (name: string, pos: number[], color: string, range: number): pc.Entity => {
    const e = new pc.Entity(name);
    e.addComponent('light', { type: 'omni', color: hex(color), intensity: 0, range, castShadows: false });
    e.setLocalPosition(pos[0], pos[1], pos[2]);
    root.addChild(e);
    return e;
  };
  zoneLights.push(mkLight('light-zoneE', [2.9, 2.2, 3.6], '#D9A8A0', 2.8)); // the pink room
  zoneLights.push(mkLight('light-zoneW', [-2.9, 2.2, 3.6], '#5DCAA5', 2.8)); // the teal room
  const mayaGlow = mkLight('light-mayaGlow', [-0.2, 1.35, 4.8], '#8899BB', 2.4);
  void mayaGlow; // rig-driven by id

  // ── the O7 light-leak seams: thin pale strips at the base of the walls —
  // the first admission that there is anything beyond them ──
  const seamMat = new pc.StandardMaterial();
  seamMat.useLighting = false;
  seamMat.diffuse = new pc.Color(0, 0, 0);
  seamMat.emissive = hex('#AABBCC');
  seamMat.update();
  const seams: pc.Entity[] = [1, -1].map(sx => {
    const e = new pc.Entity(`seam-${sx > 0 ? 'e' : 'w'}`);
    e.addComponent('render', { type: 'box' });
    e.setLocalPosition(2.11 * sx, 0.05, 1.5);
    e.setLocalScale(0.02, 0.04, 4.3);
    if (e.render) e.render.material = seamMat;
    e.enabled = false;
    root.addChild(e);
    return e;
  });

  app.root.addChild(root);

  // ── state ──
  let state: ClusterState = 'sealed';
  let era: EraKey = 'e1';

  // the lamp LIGHT follows its carried props (r4 moves the lamp to Maya's desk)
  const lampLight = room.lights.get('lamp');
  const lampHome = lampLight ? lampLight.getLocalPosition().clone() : null;
  function carryLampLight(to: boolean): void {
    if (!lampLight || !lampHome) return;
    if (to) lampLight.setLocalPosition(-0.85, 1.08, 4.98);
    else lampLight.setLocalPosition(lampHome.x, lampHome.y, lampHome.z);
  }

  // the witness record plane rides the spine (app owns the entity; we steer z)
  let planeLerp: { from: number; to: number; t: number; dur: number } | null = null;
  function setPlaneZ(z: number): void {
    const e = app.root.findByName('witness-screen');
    if (e instanceof pc.Entity) {
      const p = e.getLocalPosition();
      e.setLocalPosition(p.x, p.y, z);
    }
  }

  // ── the choreography timeline (T1's staged arrival) ──
  let timeline: { t: number; fn: () => void }[] = [];
  let timelineT = 0;
  function schedule(events: { t: number; fn: () => void }[]): void {
    timeline = [...events].sort((a, b) => a.t - b.t);
    timelineT = 0;
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

  function applyRig(name: string, animate: boolean): void {
    if (name === '_note') return;
    const rig = (clusterData.rigs as unknown as Record<string, Rig | undefined>)[name];
    if (!rig) return;
    rigFades = [];
    const fadeLight = (l: pc.LightComponent, target: RigLight): void => {
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
    };
    for (const [id, target] of Object.entries(rig.lights)) {
      const e = app.root.findByName(`light-${id}`);
      if (e instanceof pc.Entity && e.light) fadeLight(e.light, target);
    }
    for (const zl of zoneLights) {
      if (zl.light) fadeLight(zl.light, { intensity: rig.zoneFill });
    }
    ambTo = new pc.Color(rig.ambient[0], rig.ambient[1], rig.ambient[2]);
    if (animate) {
      ambFrom = app.scene.ambientLight.clone();
      rigT = 0;
    } else {
      app.scene.ambientLight = ambTo;
      rigT = 1;
    }
  }

  function eraTable(): NicheEraTable | undefined {
    return (nicheData.eras as unknown as Record<string, NicheEraTable | undefined>)[era];
  }

  function seamsOff(): void { for (const s of seams) s.enabled = false; }

  return {
    get state(): ClusterState { return state; },
    get era(): EraKey { return era; },
    get homeYaw(): number { return era === 'e4' ? 180 : 0; },

    reveal(): void {
      if (state !== 'sealed') return;
      state = 'dim';
      for (const s of seams) s.enabled = true; // light under the walls — others exist
      ceiling.wake();
    },

    morphToEra(toEra: EraKey, animate: boolean): void {
      const fromEra = era;
      era = toEra;
      const fromIdx = STATE_FOR_ERA[fromEra];
      const toIdx = STATE_FOR_ERA[toEra];
      seamsOff();
      carryLampLight(toEra === 'e4');

      // T1, choreographed (choreography doc §T1): hold on the lamp → the
      // cascade rolls the space open under the ballast stages → settle.
      if (animate && fromEra === 'e1' && toEra === 'e2') {
        applyRig('hold', false);
        const setLight = (id: string, i: number): void => {
          const e = app.root.findByName(`light-${id}`);
          if (e instanceof pc.Entity && e.light) e.light.intensity = i;
        };
        state = 'open';
        planeLerp = { from: PLANE_Z[0], to: PLANE_Z[1], t: -3.0, dur: 5.2 }; // rides the cascade
        schedule([
          { t: 3.0, fn: () => morph.goToState(1, true) },     // the walls begin to leave
          { t: 3.0, fn: () => setLight('roomFill', 0.55) },   // ballast: clunk
          { t: 3.18, fn: () => setLight('roomFill', 0.05) },
          { t: 3.6, fn: () => setLight('roomFill', 0.95) },   // flicker
          { t: 3.78, fn: () => setLight('roomFill', 0.1) },
          { t: 4.2, fn: () => {                                // the other rooms were ready first
            for (const zl of zoneLights) if (zl.light) zl.light.intensity = 0.9;
            ceiling.wake();
          } },
          { t: 5.3, fn: () => applyRig('e2', true) }
        ]);
        const t1 = eraTable();
        niche.setFacet((t1?.default ?? 'none') as FacetState);
        return;
      }

      // every other transition: cascade only when stepping one state forward
      // (E3→E4 = Maya's desk + the lamp carry resolve in), snap otherwise
      if (toIdx !== fromIdx || !animate) {
        morph.goToState(toIdx, animate && toIdx === fromIdx + 1);
      }
      applyRig(toEra, animate);
      state = toIdx >= 1 ? 'open' : 'sealed';
      if (toIdx >= 1) { if (animate) ceiling.wake(); else ceiling.wakeInstant(); }
      setPlaneZ(PLANE_Z[toIdx >= 1 ? 1 : 0]);
      planeLerp = null;
      const table = eraTable();
      niche.setFacet((table?.default ?? 'none') as FacetState);
    },

    applyRig,
    eraTable,

    update(dt: number): void {
      if (timeline.length) {
        timelineT += dt;
        while (timeline.length && timeline[0].t <= timelineT) {
          const ev = timeline.shift();
          if (ev) ev.fn();
        }
      }
      morph.update(dt);
      if (planeLerp) {
        planeLerp.t += dt;
        const k = Math.max(0, Math.min(1, planeLerp.t / planeLerp.dur));
        const s = k * k * (3 - 2 * k);
        setPlaneZ(planeLerp.from + (planeLerp.to - planeLerp.from) * s);
        if (k >= 1) planeLerp = null;
      }
      if (rigT < 1) {
        rigT = Math.min(1, rigT + dt / RIG_FADE_SECONDS);
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
