/**
 * The radial cluster CONDUCTOR (v4 — Sérgio Round 22, his wedge drawing). The
 * space lives in DATA (data/room/reinterp_deltas.json) and transforms through
 * the ported shipped morph (clusterMorph.ts). The open space is a HEXAGON
 * aligned to the three 120° facings, hub = the player's chair: every 120° turn
 * faces a perpendicular back wall — a whole room in front of you (front = the
 * lead room, west = the parallel-tracks bay, east = the trans-facet room), and
 * FURNITURE is the limiter between rooms (bookcase run / wardrobe / dressers —
 * no interior walls). The rear face is the spine (door + record terminal) with
 * a clear sight channel; at E4 the TURN faces it and Maya's desk rises there.
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
import { ClusterMorph, constantPropIds } from './clusterMorph';
import { batchStaticProps } from './batching';
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
/** space-state index per era (reinterp_deltas.json fold: r1 → r2 → r3 → r4).
 *  Each era now has its OWN state, so the three rooms age era-to-era. */
const STATE_FOR_ERA: Record<EraKey, number> = { e1: 0, e2: 1, e3: 2, e4: 3 };
/** the witness record plane's z on the spine (E1 vs open). At E4 it leaves the
 *  spine entirely and migrates beside Room 3 — see migrateTerminal(). */
const PLANE_Z: [number, number] = [3.685, 3.865];
/** E4: the record shares Room 3's wall beside Maya's desk (east). The person
 *  and the record finally share a wall — the TURN's promise, unified. */
const TERMINAL_E4 = { pos: [5.66, 1.5, 1.75] as [number, number, number], yaw: 270 };
const TERMINAL_SPINE_YAW = 180;

function hex(c: string): pc.Color {
  const n = parseInt(c.slice(1), 16);
  return new pc.Color(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export interface ClusterShell {
  readonly state: ClusterState;
  readonly era: EraKey;
  /** the home facing: 0° (Room 1) until E4, then 270° — Room 3, Maya's room
   *  (the trans room evolved). The TURN travels here (◆N3 retargeted, Round 24). */
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
  ceiling: CeilingWitness,
  layout: 'x' | 't' = 't',
  batch = true
): ClusterShell {
  const root = new pc.Entity('cluster-shell');

  // X-layout: the back spine is not a wall but a 4th ARM to the ending. We open
  // it by hiding the spine wall + door (the record terminal stays, hovering at
  // the threshold to the ending). The morph toggles box scale/pos, never
  // `enabled`, so hiding by `enabled` survives every state change. Re-assert
  // after each morph in case a prop was (re)spawned. (T leaves the spine solid.)
  function applyLayout(): void {
    if (layout !== 'x') return;
    for (const id of ['spineWall', 'spineDoorPanel', 'spineDoorLintel',
      'spineDoorJambL', 'spineDoorJambR', 'spineDoorKnob']) {
      const h = room.props.get(id);
      if (h) h.entity.enabled = false;
    }
  }

  // ── the space morph (ported shipped effect) — start in the r1 state ──
  const morph = new ClusterMorph(room);
  morph.snapTo(0);
  applyLayout();

  // ── the Quest draw-call chore: the props constant across ALL space states
  // share materials and bake into one static batch group (the morph skips
  // them, so the batch can never go stale). ?nobatch=1 = the A/B escape. ──
  if (batch) {
    const joined = batchStaticProps(app, room, constantPropIds());
    (window as { __batchedProps?: number }).__batchedProps = joined;
  }

  // ── zone accent lights (rig-driven; the two rooms' own temperatures) ──
  const zoneLights: pc.Entity[] = [];
  const mkLight = (name: string, pos: number[], color: string, range: number): pc.Entity => {
    const e = new pc.Entity(name);
    e.addComponent('light', { type: 'omni', color: hex(color), intensity: 0, range, castShadows: false });
    e.setLocalPosition(pos[0], pos[1], pos[2]);
    root.addChild(e);
    return e;
  };
  zoneLights.push(mkLight('light-zoneE', [3.88, 2.15, 0.7], '#E8B7C8', 5.4)); // Room 3 (east): the trans room / Maya
  zoneLights.push(mkLight('light-zoneW', [-3.88, 2.15, 0.7], '#D9A8A0', 5.4)); // Room 2 (west): the lesbian room / Vera
  const mayaGlow = mkLight('light-mayaGlow', [4.4, 1.35, 0.7], '#8899BB', 3.0); // Room 3 interface light (E4)
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

  // the lamp LIGHT follows its carried props (change #10 — the warm thread). The
  // lamp lives in Room 1 for E1–E3; at E4 its props move to Maya's desk (r4
  // delta) and the light rides with them to Room 3. Nobody turned it off in 30
  // years — the one constant, now warming the last room.
  const lampLight = room.lights.get('lamp');
  const lampHome = lampLight ? lampLight.getLocalPosition().clone() : null;
  function carryLampLight(to: boolean): void {
    if (!lampLight || !lampHome) return;
    if (to) lampLight.setLocalPosition(5.15, 1.15, 1.5); // Maya's desk (Room 3), clear of the monitor
    else lampLight.setLocalPosition(lampHome.x, lampHome.y, lampHome.z);
  }

  // the witness record plane rides the spine (app owns the entity; we steer z).
  // At E4 it MIGRATES off the spine to Room 3's wall beside Maya's desk — the
  // person and the record share a wall (the TURN's promise, unified).
  let planeLerp: { from: number; to: number; t: number; dur: number } | null = null;
  function setPlaneZ(z: number): void {
    const e = app.root.findByName('witness-screen');
    if (e instanceof pc.Entity) {
      const p = e.getLocalPosition();
      e.setLocalPosition(p.x, p.y, z);
    }
  }
  function migrateTerminal(toRoom3: boolean): void {
    const e = app.root.findByName('witness-screen');
    if (!(e instanceof pc.Entity)) return;
    if (toRoom3) {
      e.setLocalPosition(TERMINAL_E4.pos[0], TERMINAL_E4.pos[1], TERMINAL_E4.pos[2]);
      e.setLocalEulerAngles(90, TERMINAL_E4.yaw, 0); // face -x, into Room 3
    } else {
      const t = clusterData.witnessTerminal;
      e.setLocalPosition(t.pos[0], t.pos[1], t.pos[2]);
      e.setLocalEulerAngles(90, TERMINAL_SPINE_YAW, 0); // back to the spine
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
    get homeYaw(): number { return era === 'e4' ? 270 : era === 'e3' ? 90 : 0; },

    reveal(): void {
      if (state !== 'sealed') return;
      state = 'dim';
      // R26: the wall light-leak seams ("white bars at floor level") and the
      // overhead ceiling-witness wake are RETIRED from the three-room build —
      // they were the radial-era "something beyond the walls" hint, now
      // redundant (the doorways do that job) and reading as clutter. The reveal
      // is kept as a pure STATE change so gaze/send gating still works.
    },

    morphToEra(toEra: EraKey, animate: boolean): void {
      const fromEra = era;
      era = toEra;
      const fromIdx = STATE_FOR_ERA[fromEra];
      const toIdx = STATE_FOR_ERA[toEra];
      seamsOff();
      carryLampLight(toEra === 'e4');
      migrateTerminal(toEra === 'e4');

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
          { t: 5.3, fn: () => applyRig('e2', true) },
          { t: 5.4, fn: () => applyLayout() } // X: keep the back arm open post-cascade
        ]);
        const t1 = eraTable();
        niche.setFacet((t1?.default ?? 'none') as FacetState);
        applyLayout();
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
      applyLayout(); // X: re-assert the open back arm after the fold
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
