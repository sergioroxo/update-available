/**
 * The radial THREE-ROOM cluster — the conductor for the room-becomes-a-cluster
 * arc (flow model §R8-1; Sérgio Round 18: "see all the 3 rooms around you").
 * Behind ?reinterp=1 only. Owns:
 *
 *  - the shipped rear WITNESS FURNITURE + east/west walls HIDDEN in reinterp
 *    (the ceiling witness carries presence; the legible record shrinks to a
 *    wall TERMINAL on the south spine — Ethics #10 kept on a flat surface);
 *  - the segmented EAST/WEST WALLS: front run, lintel band, rear stub — the
 *    opening between them is a doorway-scale aperture into each bay;
 *  - TWO ROOM-BAYS beyond the apertures (east = the fluid trans room, whose
 *    niche relocates inside via fluid_niche.json; west = the other non-lead
 *    identity per era) — real room volumes: floor, walls, ceiling, own light;
 *  - the APERTURE SCRIMS: sealed (E1 — reads as wall in shadow) → dim (O7 —
 *    the bays dimly legible for the first time) → open (E2+ — the scrim LIFTS
 *    like a shutter while fading; the O8 morph seen in the room);
 *  - a REAL recessed DOOR on the south spine (the old flat door prop is gone);
 *  - the per-era LIGHT RIGS (cluster.json `rigs`) crossfaded on the EXISTING
 *    era1.json lights + the bay fills — the cold light winning, era over era;
 *  - morphToEra(): the one seam the OS's update ritual (O8) calls on restart.
 *
 * Everything lerps EXISTING entities/materials — no allocation on the hot
 * path (the EraMorph discipline). No text, no popups, no scores: the frame
 * never plays. Light is the narrator.
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
interface Rig { ambient: number[]; bayFill: number; lights: Record<string, RigLight> }

const RIG_FADE_SECONDS = 2.5;
const SCRIM_FADE_SECONDS = 2.2;
const SCRIM_LIFT = 2.4; // meters the shutter rises while opening (clears the aperture)

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
  /** the home facing: 0° until E4, 180° after the TURN (locked ◆N3) */
  readonly homeYaw: number;
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

  // ── 1. hide the shipped props the cluster replaces (reinterp only) ──
  for (const id of clusterData.hiddenShippedProps as string[]) {
    const e = app.root.findByName(id);
    if (e instanceof pc.Entity) e.enabled = false;
  }

  // ── shared materials (reuse era1.json hues; never invent) ──
  const wallMat = new pc.StandardMaterial();
  wallMat.diffuse = hex('#E6D2BC'); // wallWest/East hue
  wallMat.update();
  const floorMat = new pc.StandardMaterial();
  floorMat.diffuse = hex('#C9A07A'); // floor hue
  floorMat.update();
  const ceilMat = new pc.StandardMaterial();
  ceilMat.diffuse = hex('#E2CFBA'); // ceiling hue
  ceilMat.update();
  const woodMat = new pc.StandardMaterial();
  woodMat.diffuse = hex('#A8917B'); // window-frame wood
  woodMat.update();
  const doorMat = new pc.StandardMaterial();
  doorMat.diffuse = hex('#B89B7E'); // shipped door hue
  doorMat.update();
  const knobMat = new pc.StandardMaterial();
  knobMat.diffuse = hex('#8A5A3B');
  knobMat.update();
  const darkMat = new pc.StandardMaterial();
  darkMat.diffuse = hex('#1A1A24'); // witnessPanelFrame hue
  darkMat.update();
  const fogMat = new pc.StandardMaterial();
  fogMat.diffuse = hex(ERA1.greyDark);
  fogMat.update();
  const heroMat = new pc.StandardMaterial();
  heroMat.useLighting = false;
  heroMat.diffuse = new pc.Color(0, 0, 0);
  heroMat.emissive = hex(ERA1.silver);
  heroMat.update();

  // ── 2. segmented east/west walls (aperture z 2.1→3.5, lintel above 2.5) ──
  for (const sx of [1, -1]) {
    const x = 2.13 * sx;
    const side = sx > 0 ? 'e' : 'w';
    root.addChild(box(`wall-${side}-front`, [x, 1.35, 0.69], [0.04, 2.7, 2.82], wallMat));
    root.addChild(box(`wall-${side}-stub`, [x, 1.35, 3.61], [0.04, 2.7, 0.22], wallMat));
    root.addChild(box(`wall-${side}-lintel`, [x, 2.6, 2.8], [0.04, 0.2, 1.4], wallMat));
  }

  // the south spine: the shipped wallSouth was the witness void's near-black —
  // in the cluster it becomes an ordinary wall carrying the door + terminal
  root.addChild(box('wall-s-spine', [0, 1.35, 3.72], [4.26, 2.7, 0.04], wallMat));

  // ── 3. the two room-bays (real volumes beyond the apertures) ──
  const bayLights: pc.Entity[] = [];
  for (const sx of [1, -1]) {
    const side = sx > 0 ? 'e' : 'w';
    const cx = 3.24 * sx;
    root.addChild(box(`bay-${side}-floor`, [cx, -0.01, 2.8], [2.2, 0.02, 1.8], floorMat));
    root.addChild(box(`bay-${side}-back`, [4.36 * sx, 1.25, 2.8], [0.04, 2.5, 1.8], wallMat));
    root.addChild(box(`bay-${side}-sideN`, [cx, 1.25, 1.88], [2.2, 2.5, 0.04], wallMat));
    root.addChild(box(`bay-${side}-sideS`, [cx, 1.25, 3.72], [2.2, 2.5, 0.04], wallMat));
    root.addChild(box(`bay-${side}-ceiling`, [cx, 2.51, 2.8], [2.2, 0.02, 1.8], ceilMat));
    const fill = new pc.Entity(`light-bayFill-${side}`);
    fill.addComponent('light', {
      type: 'omni', color: hex('#E8C9A0'), intensity: 0, range: 2.6, castShadows: false
    });
    fill.setLocalPosition(3.2 * sx, 2.2, 2.8);
    root.addChild(fill);
    bayLights.push(fill);
  }

  // west bay: the companion identity's station (east bay content = the fluid
  // niche, relocated there via fluid_niche.json — built by fluidNiche.ts)
  const west = clusterData.bays.west;
  const wStation = box('walcove-station', [-4.14, 1.11, 2.8], [0.16, 0.30, 0.16], fogMat);
  root.addChild(wStation);
  const wLight = new pc.Entity('light-walcove');
  wLight.addComponent('light', {
    type: 'omni', color: hex(ERA1.beige), intensity: 0, range: 0.9, castShadows: false
  });
  wLight.setLocalPosition(-3.9, 1.26, 2.8);
  root.addChild(wLight);

  // ── 4. the real door (recessed, south spine) + the witness terminal ──
  const dx = clusterData.door.x;
  root.addChild(box('door-lintel', [dx, 2.13, 3.695], [1.0, 0.1, 0.07], woodMat));
  root.addChild(box('door-jambL', [dx - 0.47, 1.04, 3.695], [0.08, 2.08, 0.07], woodMat));
  root.addChild(box('door-jambR', [dx + 0.47, 1.04, 3.695], [0.08, 2.08, 0.07], woodMat));
  root.addChild(box('door-panel', [dx, 1.02, 3.705], [0.86, 2.04, 0.05], doorMat));
  root.addChild(box('door-knob', [dx - 0.33, 1.0, 3.67], [0.035, 0.035, 0.035], knobMat));

  const wt = clusterData.witnessTerminal;
  root.addChild(box('witness-terminal-frame',
    [wt.pos[0], wt.pos[1], 3.705], [wt.w + 0.14, wt.h + 0.14, 0.03], darkMat));

  // ── 4b. Maya's E4 desk — the TURN's destination (choreography §T3, LOCKED
  // Round 20: "let's be bold, we need emotion"). On the south spine beside the
  // terminal: the person and the record share a wall for the whole final act.
  // Greybox; hidden until e4. The lamp is CARRIED here (30 years on).
  const mayaScreenMat = new pc.StandardMaterial();
  mayaScreenMat.useLighting = false;
  mayaScreenMat.diffuse = new pc.Color(0, 0, 0);
  mayaScreenMat.emissive = hex('#2C3A5C'); // interface-lit sliver (windowPane hue)
  mayaScreenMat.update();
  const mayaRoot = new pc.Entity('maya-set');
  mayaRoot.addChild(box('maya-desk', [-0.2, 0.72, 3.30], [1.1, 0.04, 0.55], woodMat));
  mayaRoot.addChild(box('maya-desk-base', [-0.2, 0.36, 3.34], [0.9, 0.68, 0.42], woodMat));
  mayaRoot.addChild(box('maya-screen', [-0.2, 1.13, 3.52], [0.62, 0.36, 0.03], mayaScreenMat));
  mayaRoot.addChild(box('maya-screen-foot', [-0.2, 0.78, 3.5], [0.16, 0.08, 0.1], darkMat));
  mayaRoot.addChild(box('maya-phone', [0.14, 0.752, 3.24], [0.045, 0.008, 0.09], darkMat));
  mayaRoot.addChild(box('maya-chair', [-0.2, 0.45, 2.82], [0.42, 0.06, 0.42], woodMat));
  mayaRoot.addChild(box('maya-chair-post', [-0.2, 0.24, 2.82], [0.06, 0.36, 0.06], woodMat));
  mayaRoot.enabled = false;
  root.addChild(mayaRoot);
  const mayaGlow = new pc.Entity('light-mayaGlow');
  mayaGlow.addComponent('light', {
    type: 'omni', color: hex('#8899BB'), intensity: 0, range: 2.4, castShadows: false
  });
  mayaGlow.setLocalPosition(-0.2, 1.35, 3.05);
  root.addChild(mayaGlow);

  // ── 5. the aperture scrims (translucent shutters; lerped, never realloc) ──
  interface Scrim { ent: pc.Entity; mat: pc.StandardMaterial; baseY: number }
  const scrims: Scrim[] = (clusterData.scrims as { id: string; pos: number[]; size: number[] }[]).map(s => {
    const mat = new pc.StandardMaterial();
    mat.diffuse = hex('#15151F'); // floorWitnessDark hue
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

  // ── the window's era states (choreography: T1 takes the moon, T3 takes the
  // window entirely — daylight never returns) ──
  type WindowState = 'night' | 'day' | 'gone';
  let winState: WindowState = 'night';
  function setWindow(next: WindowState): void {
    if (next === winState) return;
    winState = next;
    const pane = app.root.findByName('windowPane');
    const moon = app.root.findByName('moon');
    if (pane instanceof pc.Entity && pane.render) {
      const m = pane.render.material as pc.StandardMaterial;
      m.emissive = hex(next === 'night' ? '#2C3A5C' : next === 'day' ? '#D4D0C8' : '#15151F');
      m.update();
    }
    if (moon instanceof pc.Entity) moon.enabled = next === 'night';
  }

  // ── the lamp carry (T3): same object, moved to Maya's desk — nobody turned
  // it off in 30 years. Instant reposition now; the authored travel beat is a
  // later polish pass. Originals cached so debug era-jumps restore cleanly. ──
  const LAMP_CARRY: Record<string, number[]> = {
    lampFoot: [-0.72, 0.755, 3.30],
    lampPole: [-0.72, 0.85, 3.30],
    lampShade: [-0.72, 0.97, 3.30],
    'light-lamp': [-0.72, 1.08, 3.24]
  };
  const lampHome: Record<string, pc.Vec3> = {};
  let lampCarried = false;
  function carryLamp(to: boolean): void {
    if (to === lampCarried) return;
    lampCarried = to;
    for (const id of Object.keys(LAMP_CARRY)) {
      const e = app.root.findByName(id);
      if (!(e instanceof pc.Entity)) continue;
      if (!(id in lampHome)) lampHome[id] = e.getLocalPosition().clone();
      const p = to ? LAMP_CARRY[id] : [lampHome[id].x, lampHome[id].y, lampHome[id].z];
      e.setLocalPosition(p[0], p[1], p[2]);
    }
  }

  // ── the choreography timeline (T1's staged arrival; future T2/T3 beats) ──
  let timeline: { t: number; fn: () => void }[] = [];
  let timelineT = 0;
  function schedule(events: { t: number; fn: () => void }[]): void {
    timeline = [...events].sort((a, b) => a.t - b.t);
    timelineT = 0;
  }
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
    if (name === '_note') return; // the doc key is not a rig
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
    for (const bl of bayLights) {
      if (bl.light) fadeLight(bl.light, { intensity: rig.bayFill });
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
    get homeYaw(): number { return era === 'e4' ? 180 : 0; },

    reveal(): void {
      if (state !== 'sealed') return;
      state = 'dim';
      setScrimTarget(clusterData.scrimOpacity.dim, false);
      ceiling.wake();
      applyOccupant();
      // the niche's E1 near-dark state stands (the darkness IS the content);
      // dim legibility comes from the scrim + the bays' faint pools alone
      for (const bl of bayLights) if (bl.light) bl.light.intensity = 0.22;
    },

    morphToEra(toEra: EraKey, animate: boolean): void {
      const fromEra = era;
      era = toEra;
      mayaRoot.enabled = toEra === 'e4';
      carryLamp(toEra === 'e4');

      // T1, choreographed (choreography doc §T1): hold on the lamp → ballast
      // stages → the bays light FIRST → the moon does not survive → settle.
      if (animate && fromEra === 'e1' && toEra === 'e2') {
        applyRig('hold', false);
        const setLight = (id: string, i: number): void => {
          const e = app.root.findByName(`light-${id}`);
          if (e instanceof pc.Entity && e.light) e.light.intensity = i;
        };
        schedule([
          { t: 3.0, fn: () => setLight('roomFill', 0.55) },   // ballast: clunk
          { t: 3.18, fn: () => setLight('roomFill', 0.05) },
          { t: 3.6, fn: () => setLight('roomFill', 0.95) },   // flicker
          { t: 3.78, fn: () => setLight('roomFill', 0.1) },
          { t: 4.2, fn: () => {                                // the other rooms were ready first
            for (const bl of bayLights) if (bl.light) bl.light.intensity = 0.9;
            state = 'open';
            setScrimTarget(clusterData.scrimOpacity.open, true);
            ceiling.wake();
          } },
          { t: 5.0, fn: () => setWindow('day') },              // the moon, gone
          { t: 5.3, fn: () => { applyRig('e2', true); applyOccupant(); } }
        ]);
        const t1 = eraTable();
        niche.setFacet((t1?.default ?? 'none') as FacetState);
        return;
      }

      setWindow(toEra === 'e1' ? 'night' : toEra === 'e4' ? 'gone' : 'day');
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
      if (timeline.length) {
        timelineT += dt;
        while (timeline.length && timeline[0].t <= timelineT) {
          const ev = timeline.shift();
          if (ev) ev.fn();
        }
      }
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
