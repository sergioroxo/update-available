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
 * cold light winning), the T1-style staged timeline (lamp hold → ballast →
 * cascade → settle — as of Session 27/R28-0c this plays on the E2→E3 update,
 * since E2 is Daniel's closed homecoming room and the space opens one update
 * later, D14/D15), the O7 reveal state, the E4 TURN's
 * homeYaw, the lamp LIGHT following its carried props, the witness plane's
 * spine ride, and the niche facet defaults. Light is the narrator; the props
 * belong to the morph.
 */
import * as pc from 'playcanvas';
import type { RoomHandles } from './era1room';
import { ClusterMorph, constantPropIds } from './clusterMorph';
import { batchStaticProps, batchSettledProps, clearSettledBatch, type SettledBatchHandle } from './batching';
import clusterData from '../../data/room/cluster.json';
import nicheData from '../../data/room/fluid_niche.json';
import belongingsData from '../../data/room/belongings.json';
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

/** R28-2c (the belongings beat): props the player may KEEP are excluded from
 *  BOTH batching groups below (not just the morph's own STATIC_IDS check) —
 *  a shared-material batch would cross-contaminate the per-item "kept" warm
 *  lift onto any OTHER prop of the identical colour signature (a real risk
 *  here: book2 and tapeB share `#9FB4C0`, tapeA/cdStack/modem share
 *  `#D4D0C8`). Excluding ~7 props costs a handful of extra draw calls, well
 *  inside the Quest budget, in exchange for guaranteed-independent materials. */
const BELONGINGS_IDS = new Set(
  (belongingsData as unknown as { eligible: { id: string }[] }).eligible.map((e) => e.id)
);

const RIG_FADE_SECONDS = 2.5;
/**
 * ⚑ THE RELOCATION (Session 61) — the E2→E3 handoff's shared clock.
 *
 * Sérgio's note: *"the fly over needs to be slower and let you see the room
 * being built so you understand the new space and the passage of time."* The
 * old handoff was a 2.4 s dolly fired at the same instant as a 6.5 s cascade,
 * so the camera had already landed at Vera's desk, facing a wall, before the
 * space finished opening behind it — six years and a different person, over
 * in the time it takes to blink.
 *
 * It is now three legs, and the room opens IN THE MIDDLE ONE, in front of
 * you: RISE out of Daniel's chair while his room is still closed → HOLD over
 * the space while the walls leave and Room 2 assembles → DESCEND into Vera's
 * seat. `src/engine/app.ts` flies the camera and this module opens the space;
 * both read these three numbers, so the two halves cannot drift apart.
 *
 * The cascade is stretched to fill the middle leg exactly (CASCADE 5.2 +
 * PROP_DUR 1.3 = 6.5 s at pace 1, so pace = BUILD_SECONDS / 6.5), which is
 * what `ClusterMorph.goToState`'s pace argument exists for.
 */
export const RELOCATION = {
  /** up out of the chair, inside the still-closed Room 1 */
  riseSeconds: 7.0,
  /** the walls leave and the three rooms resolve — the camera barely moves */
  buildSeconds: 11.0,
  /** down into Room 2's seat, the facing resolving with the position.
   *  11.5, not 10: the descent is the longest leg (2.64 m of arc) and at 10 s
   *  it measured a 0.477 m/s peak — over S53's 0.43 envelope. Measured again
   *  at 11.5: 0.415 m/s. The number is the comfort law, not a taste call. */
  descendSeconds: 11.5
} as const;
const CASCADE_BASE_SECONDS = 6.5; // CASCADE + PROP_DUR in clusterMorph.ts
/** space-state index per era (reinterp_deltas.json fold: r1 → r2 → r3 → r4).
 *  Each era now has its OWN state, so the three rooms age era-to-era. */
const STATE_FOR_ERA: Record<EraKey, number> = { e1: 0, e2: 1, e3: 2, e4: 3 };
/** the witness record plane's z on the spine (E1 vs open). At E4 it leaves the
 *  spine entirely and migrates beside Room 3 — see migrateTerminal(). Session
 *  27 (R28-0c, item 12): these used to be 3.685/3.865 — BOTH already deeper
 *  than the physical opening-board cork frame's own near face (measured live
 *  AABB: ~3.649), so the flat plane fell fully BEHIND that fixed 3D prop the
 *  instant any era transition ran, reading as a bare cork board with random
 *  floating sticky notes and nothing behind them (the frame's own baked
 *  decoration, unmasked). Pulled both values in front of that face with a
 *  safety margin so the record plane is never occluded by the frame prop. */
const PLANE_Z: [number, number] = [3.60, 3.62];
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
  /** O7: sealed → dim — the first-filing reveal */
  reveal(): void;
  /** the O8 seam: cascade the space + crossfade the rig + re-arm the niche */
  morphToEra(era: EraKey, animate: boolean): void;
  /** apply a named rig directly (the Close uses 'close') */
  applyRig(name: string, animate: boolean): void;
  /** S61: land the current transition NOW, wherever it had got to — the
   *  relocation's skip (any input, per the comfort law) needs the space
   *  finished as well as the camera seated, or the player is left in a
   *  half-built room with a cascade still rolling behind them. */
  settleNow(): void;
  /** the era's niche facet table (fluid_niche.json), for the gaze resolver */
  eraTable(): NicheEraTable | undefined;
  /** R28-2c (the belongings beat): freeze these prop ids at their exact r1/
   *  E1 fold through every later morph — the payoff plumbing for the T1
   *  gathering window. Idempotent; safe to call before every era shift. */
  setKeptIds(ids: ReadonlySet<string>): void;
  /** true while a scripted space transition is in flight (the T1-style
   *  timeline OR a morph cascade) — R28-1: movement markers hide for this,
   *  same "scripted moves always win" rule the camera dolly already honors. */
  readonly busy: boolean;
  update(dt: number): void;
}

export function buildClusterShell(
  app: pc.Application,
  room: RoomHandles,
  niche: FluidNiche,
  _ceiling: CeilingWitness,
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
  const staticIds = constantPropIds();
  const morph = new ClusterMorph(room);
  morph.snapTo(0);
  applyLayout();

  // R28-2b (the three-tape system): the "inserted" markers start hidden —
  // nothing is in the boombox at boot. src/narrative/tapes.ts + the engine's
  // click handler toggle these via `.enabled` only, matching the kit-floppy
  // precedent (app.ts's onKitInserted) — NEVER by moving a prop's position,
  // which would silently desync from the settled static batch below (it
  // bakes world transforms once per era state and only re-derives on
  // enable/disable, per batching.ts's own documented law).
  for (const id of ['tapeAInSlot', 'tapeBInSlot', 'tapeCInSlot']) {
    const h = room.props.get(id);
    if (h) h.entity.enabled = false;
  }

  // ── the Quest draw-call chore: constants bake once; variable box props bake
  // only after a state settles, then unbake before the next morph so live
  // transforms/materials remain truthful. ?nobatch=1 = the A/B escape. ──
  let staticJoined = 0;
  let settledBatch: SettledBatchHandle | null = null;
  let settledJoined = 0;
  let pendingSettledRebatch = false;
  function publishBatchStats(): void {
    const w = window as { __batchedProps?: number; __staticBatchedProps?: number; __settledBatchedProps?: number };
    w.__staticBatchedProps = staticJoined;
    w.__settledBatchedProps = settledJoined;
    w.__batchedProps = staticJoined + settledJoined;
  }
  function clearSettled(): void {
    settledBatch = clearSettledBatch(app, room, settledBatch);
    settledJoined = 0;
    publishBatchStats();
  }
  function rebuildSettled(): void {
    if (!batch) return;
    clearSettled();
    // R28-2c: belongings-eligible props are ALSO excluded here (reusing the
    // "staticIds" skip check inside batchSettledProps), never joining the
    // settled group regardless of kept state — see BELONGINGS_IDS above.
    settledBatch = batchSettledProps(app, room, new Set([...staticIds, ...BELONGINGS_IDS]));
    settledJoined = settledBatch?.joined ?? 0;
    publishBatchStats();
  }
  function beginMorphedStateBatch(): void {
    if (!batch) return;
    clearSettled();
    pendingSettledRebatch = true;
  }
  if (batch) {
    // R28-2c: belongings-eligible props never join the permanent static
    // group either, even if their fold happens to be identical everywhere.
    staticJoined = batchStaticProps(app, room, new Set([...staticIds].filter((id) => !BELONGINGS_IDS.has(id))));
    rebuildSettled();
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
  /**
   * ⚑ SESSION 61 — THE RECORD LEAVES THE WALL AT E3 (Sérgio: *"the witness
   * panel is still visible in Room 2"*). The record plane hangs on the SPINE
   * at (0, 1.5, ~3.6); once E3 takes the walls down, Room 2's seat looks
   * straight across the open floor at it — picked live from that seat, the ray
   * lands on `witness-screen`, AABB centre (-0.86, 1.43, 3.62).
   *
   * It is hidden for E3 only, and the reason is the era's own thesis rather
   * than tidiness: REINTERP_INFRASTRUCTURE_SPINE_2026-07-25 is explicit that
   * 2016 is where the apparatus "stopped being a place you go to" and moved
   * into the infrastructure already in use — which is exactly why the walls
   * open there. A cold record mounted on a wall is the E1/E2 grammar (a place
   * you can turn around and face). At E3 the record is not on a wall at all:
   * it is inside the platform, and Lambient's badge is already sitting in the
   * corner of all three of Vera's screens. Nothing stops being FILED — the
   * ledger and the intake are untouched — and the plane comes back at E4,
   * migrated beside Maya's desk, which is the migration the piece already
   * scripts (TERMINAL_E4 below).
   */
  function setTerminalVisible(visible: boolean): void {
    const e = app.root.findByName('witness-screen');
    if (e instanceof pc.Entity) e.enabled = visible;
    // …and its MOUNT. `terminalFrame` (reinterp_deltas.json r1) is the dark
    // surround the plane hangs in; hiding the plane alone left a black slab on
    // the spine, which is what the first pass of this fix produced and what a
    // live pick caught (AABB centre (-0.9, 1.5, 3.705)). r4 removes the frame
    // outright — this is the same retirement, one era earlier and reversible.
    const f = room.props.get('terminalFrame')?.entity;
    if (f) f.enabled = visible;
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
    get busy(): boolean { return morph.running || timeline.length > 0; },

    reveal(): void {
      if (state !== 'sealed') return;
      state = 'dim';
      // R26: the wall light-leak seams ("white bars at floor level") and the
      // overhead ceiling-witness wake are retired from the three-room build.
      // The wall record now carries the witness lineage, so reveal is a pure
      // state change for gaze/send gating.
    },

    morphToEra(toEra: EraKey, animate: boolean): void {
      const fromEra = era;
      era = toEra;
      const fromIdx = STATE_FOR_ERA[fromEra];
      const toIdx = STATE_FOR_ERA[toEra];
      seamsOff();
      carryLampLight(toEra === 'e4');
      migrateTerminal(toEra === 'e4');
      // S61 — see setTerminalVisible's note. On the ANIMATED E2→E3 relocation
      // this is deferred into the timeline below so the panel leaves WITH the
      // walls rather than blinking out three seconds before them.
      if (!(animate && fromEra === 'e2' && toEra === 'e3')) setTerminalVisible(toEra !== 'e3');

      // T2, choreographed (choreography doc §T1 — the SAME staged timeline,
      // moved here from the E1→E2 transition Session 27/R28-0c per Sérgio's
      // D14/D15 direction: E2 is Daniel's closed homecoming room; the walls
      // stay shut until the E2→E3 update, so this is where "the room OPENS,
      // it does not explode" actually happens now): hold on the lamp → the
      // cascade rolls the space open under the ballast stages → settle.
      if (animate && fromEra === 'e2' && toEra === 'e3') {
        applyRig('hold', true); // Session 27 (item 11): animated, not an instant
        // snap — an un-eased jump straight to the 'hold' rig hit the CRT's own
        // screenGlow light (E2's 0.38 → hold's 0.1) in a single frame, right as
        // the update notice appeared, reading as a lighting glitch on the monitor.
        const setLight = (id: string, i: number): void => {
          const e = app.root.findByName(`light-${id}`);
          if (e instanceof pc.Entity && e.light) e.light.intensity = i;
        };
        state = 'open';
        // Session 61: every beat below used to sit in the first 5.4 s, under a
        // 2.4 s camera dolly. They now hang off RELOCATION.riseSeconds — the
        // space starts opening the moment the camera stops climbing, and takes
        // the whole middle leg to do it (see RELOCATION's own note above).
        const R = RELOCATION.riseSeconds;
        const pace = RELOCATION.buildSeconds / CASCADE_BASE_SECONDS;
        planeLerp = { from: PLANE_Z[0], to: PLANE_Z[1], t: -R, dur: RELOCATION.buildSeconds };
        schedule([
          { t: R, fn: () => {                                  // the walls begin to leave
            beginMorphedStateBatch();
            morph.goToState(2, true, pace);
            // S61: the record leaves the spine WITH the walls (see
            // setTerminalVisible) — one change, one moment, not two.
            setTerminalVisible(false);
          } },
          { t: R, fn: () => setLight('roomFill', 0.55) },      // ballast: clunk
          { t: R + 0.18, fn: () => setLight('roomFill', 0.05) },
          { t: R + 0.6, fn: () => setLight('roomFill', 0.95) }, // flicker
          { t: R + 0.78, fn: () => setLight('roomFill', 0.1) },
          { t: R + 2.0, fn: () => {                            // the other rooms were ready first
            for (const zl of zoneLights) if (zl.light) zl.light.intensity = 0.9;
          } },
          { t: R + RELOCATION.buildSeconds - 3.0, fn: () => applyRig('e3', true) },
          { t: R + RELOCATION.buildSeconds - 2.9, fn: () => applyLayout() } // X: keep the back arm open
        ]);
        const t1 = eraTable();
        niche.setFacet((t1?.default ?? 'none') as FacetState);
        applyLayout();
        return;
      }

      // every other transition: cascade only when stepping one state forward
      // (E3→E4 = Maya's desk + the lamp carry resolve in), snap otherwise
      let rebuildAfterLayout = false;
      if (toIdx !== fromIdx || !animate) {
        const willAnimate = animate && toIdx === fromIdx + 1;
        if (willAnimate) beginMorphedStateBatch();
        else clearSettled();
        morph.goToState(toIdx, willAnimate);
        rebuildAfterLayout = !willAnimate;
      }
      applyRig(toEra, animate);
      state = toIdx >= 1 ? 'open' : 'sealed';
      setPlaneZ(PLANE_Z[toIdx >= 1 ? 1 : 0]);
      planeLerp = null;
      const table = eraTable();
      niche.setFacet((table?.default ?? 'none') as FacetState);
      applyLayout(); // X: re-assert the open back arm after the fold
      if (rebuildAfterLayout) rebuildSettled();
    },

    applyRig,
    eraTable,
    setKeptIds(ids: ReadonlySet<string>): void { morph.setKeptIds(ids); },

    settleNow(): void {
      timeline = [];
      timelineT = 0;
      planeLerp = null;
      clearSettled();
      morph.goToState(STATE_FOR_ERA[era], false); // snap, deterministic
      applyRig(era, false);
      state = STATE_FOR_ERA[era] >= 1 ? 'open' : 'sealed';
      setPlaneZ(PLANE_Z[STATE_FOR_ERA[era] >= 1 ? 1 : 0]);
      setTerminalVisible(era !== 'e3');
      niche.setFacet((eraTable()?.default ?? 'none') as FacetState);
      applyLayout();
      rebuildSettled();
    },

    update(dt: number): void {
      if (timeline.length) {
        timelineT += dt;
        while (timeline.length && timeline[0].t <= timelineT) {
          const ev = timeline.shift();
          if (ev) ev.fn();
        }
      }
      morph.update(dt);
      if (pendingSettledRebatch && !morph.running) {
        pendingSettledRebatch = false;
        applyLayout();
        rebuildSettled();
      }
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
