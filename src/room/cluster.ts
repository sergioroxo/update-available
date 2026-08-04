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

/**
 * ⚑ S71 — THE EIGHT `terminalFrame` ASSERTS, CLOSED AT THE CALL SITE.
 *
 * `setTerminalVisible()` below toggles `.enabled` on this prop at every era
 * change (the record leaves the wall for E3 and comes back at E4), and
 * batching.ts's own documented law is that a batched node's world transform is
 * baked once per state and only re-derived on enable/disable — so PlayCanvas
 * rejects the insertion and the removal and logs
 * `ASSERT FAILED: Invalid batch N insertion/removal with node: "terminalFrame"`.
 * Measured this session: 2 per four era jumps, 8 per playthrough as S67 counted.
 *
 * S67 named `src/room/batching.ts` as the cause and left it there. The cause is
 * the toggle, and the toggle is in this file: a prop that is switched on and
 * off must not join a batch, which is exactly why BELONGINGS_IDS is already
 * excluded from both groups. Same remedy, same reason, and it costs at most one
 * draw call. ROLLBACK: delete this set and its two uses below.
 */
const UNBATCHED_IDS = new Set(['terminalFrame']);

const RIG_FADE_SECONDS = 2.5;
/**
 * ⚑ THE LIFT (Session 64) — Era 3's ONE INVERSION, and the era's ending.
 * `docs/REINTERP_E3_THE_CORRECTION_LIST_2026-07-30.md` §4.
 *
 * Every glitch in this piece so far is DEGRADATION: the tape hiss, the tearing
 * signal, the dying music box, Lamby coming apart in the u3 install. This one
 * BRIGHTENS. Malta arrives on the phone (December 2016, Act LV) and the room's
 * light lifts — and NOTHING ELSE CHANGES. Not one character of the correction
 * list, not one state in the software. The list is simply lit well enough to be
 * read as what it is.
 *
 * It is authored as GAINS ON THE e3 RIG rather than as a new rig in
 * `data/room/cluster.json`, and that is the honest encoding, not a convenience:
 * a named rig would be a different lighting STATE, and the whole beat is that
 * there is no new state — it is the same room at a different exposure. The
 * warm side takes the largest gain (the lamp, roomFill's rose) and the cold
 * side gives a little back (screenGlow, witnessCold), which is the piece's own
 * light doctrine — two lights fight for one room — winning warm for the first
 * time. Briefly.
 *
 * Slower than an ordinary rig crossfade on purpose: it must be FELT before it
 * is understood, and 2.5 s reads as a cut.
 */
const E3_LIFT_SECONDS = 5.0;
const E3_LIFT = {
  /** per-channel ambient gain — r/g above b, so the lift warms as it rises */
  ambient: [1.7, 1.72, 1.5],
  zoneFill: 1.4,
  /** per-light intensity gain; a light absent from the e3 rig is left alone */
  lights: {
    roomFill: 1.35,
    lamp: 2.4,
    screenGlow: 0.8,
    witnessCold: 0.8
  } as Record<string, number | undefined>,
  /** the lamp reaches further too — the only range change in the beat */
  lampRange: 1.5
};

/**
 * The lift's one call-in, module-level ON PURPOSE. The beat that fires it lives
 * on the laptop (`src/room/graceQueueLite.ts` → `src/room/era3Devices.ts`), and
 * neither of those holds a `ClusterShell` — `src/engine/app.ts` owns both halves
 * and is outside this session's file fence. A no-op when no shell exists (flat
 * mode, tests), which is the correct behaviour rather than a guard: with no room
 * there is no light to lift.
 */
let e3LiftHook: ((on: boolean) => void) | null = null;
export function setEra3Lift(on: boolean): void {
  e3LiftHook?.(on);
}
/**
 * ⚑ THE RELOCATION (Session 61; GENERALISED to every era change in Session 67)
 *
 * Sérgio's note: *"the fly over needs to be slower and let you see the room
 * being built so you understand the new space and the passage of time."* The
 * old handoff was a 2.4 s dolly fired at the same instant as a 6.5 s cascade,
 * so the camera had already landed at Vera's desk, facing a wall, before the
 * space finished opening behind it — six years and a different person, over
 * in the time it takes to blink.
 *
 * It is three legs, and the room changes IN THE MIDDLE ONE, in front of you:
 * RISE out of the seat → HOLD over the space while it ages → DESCEND into a
 * seat. `src/engine/app.ts` flies the camera and this module changes the
 * space; both read the SAME plan, so the two halves cannot drift apart.
 *
 * The cascade is stretched to fill its leg exactly (CASCADE 5.2 + PROP_DUR
 * 1.3 = 6.5 s at pace 1, so pace = cascadeSeconds / 6.5), which is what
 * `ClusterMorph.goToState`'s pace argument exists for.
 *
 * ⚑ WHAT SESSION 67 ADDED, AND WHY IT IS ONE MECHANISM RATHER THAN THREE
 * (docs/REINTERP_THE_BUILDING_2026-08-02.md, revision 1's four-beat table):
 * the piece's one bodily law is that you turn but never walk, and its meaning
 * is that a screen fixes your facing while what is behind you is other people.
 * So the lift happens at EVERY era change, and *what you see when you come up*
 * is the story — which means the legs must be identical and only the view may
 * differ. Hence a table: same three legs, same easing, same comfort envelope;
 * `opensWalls` and the destination seat carry the whole difference.
 *
 *   e1-e2  the walls stay CLOSED. Canon requires it — MASTER_PLAN_v2 §3, "E1→E2
 *          ages the SAME room (walls stay CLOSED — the homecoming is private)".
 *          The rise happens and the opening does not: up, a hold that goes
 *          nowhere, back down into the same chair. A palindrome, 7/7/7. It is
 *          meant to feel like it should have shown you more and didn't.
 *   e2-e3  the payoff, and the ONE comfort-MEASURED leg set (S61). Untouched.
 *   e3-e4  the third instance, and the longest: Room 2's seat to Room 3's is
 *          8.8 m apart, so at the 0.43 m/s envelope the crossing simply takes
 *          24 s. That is arithmetic, not taste — see app.ts's RELOC_POSES.
 *
 * ⚑ EVERY NUMBER HERE IS DESKTOP-MEASURED. A11 (the in-headset pass) has still
 * never run, so nothing below is verified in VR.
 */
export interface RelocationPlan {
  /** up out of the chair, inside the room you are leaving */
  riseSeconds: number;
  /** the camera's middle leg — the room changes in front of you */
  buildSeconds: number;
  /** down into the destination seat, the facing resolving with the position */
  descendSeconds: number;
  /** how long the SPACE cascade takes. Defaults to buildSeconds (E2→E3's
   *  behaviour, where the wall-drop fills the leg exactly); E3→E4 finishes its
   *  aging early and leaves the rest of the leg as pure travel over a building
   *  that is already done — which is what "almost routine" has to feel like. */
  cascadeSeconds?: number;
  /** true = the walls LEAVE during the build leg: the 'hold' rig, the ballast
   *  stutter, the other rooms' zone lights coming up, and the record leaving
   *  the spine. False = the room merely ages under you. */
  opensWalls: boolean;
  /**
   * ⚑ WHEN the era's own rig crossfades, in seconds after the rise ends. It is
   * per-transition because the light means something different each time, and
   * the default got E3→E4 wrong on the first pass — measured live, the E4 rig
   * (ambient 0.05, roomFill 0.1: "the cold has won") landed 2.5 s into a 24 s
   * crossing, so the one beat that has to show you three rooms one last time
   * played in near-black.
   *   e1-e2  EARLY. 2003's daylight replacing 1997's lamp-lit night is the
   *          single strongest time cue the piece owns, and at this beat the
   *          aging IS the content — you watch the light change from above.
   *   e2-e3  cascade − 3.0, i.e. the S61 timing, untouched.
   *   e3-e4  LATE. You cross a building that is still lit, and it goes out as
   *          you come down into Maya's room. Arrival, not transit.
   * Omitted → opensWalls ? cascade − 3.0 : min(2.5, cascade × 0.35).
   */
  rigDelaySeconds?: number;
  /** the seat yaw the descent lands in (0 = Room 1, 90 = Room 2, 270 = Room 3) */
  seat: number;
}

/** keyed `${from}-${to}`; a transition absent here takes the plain morph path */
export const RELOCATIONS: Record<string, RelocationPlan | undefined> = {
  'e1-e2': {
    riseSeconds: 7.0, buildSeconds: 7.0, descendSeconds: 7.0,
    opensWalls: false, seat: 0
  },
  'e2-e3': {
    riseSeconds: 7.0,
    buildSeconds: 11.0,
    /** 11.5, not 10: the descent is the longest leg of this move (2.54 m of
     *  chord) and at 10 s it measured a 0.477 m/s peak — over S53's 0.43
     *  envelope. Measured again at 11.5: 0.415 m/s. The number is the comfort
     *  law, not a taste call. */
    descendSeconds: 11.5,
    opensWalls: true, seat: 90
  },
  'e3-e4': {
    riseSeconds: 7.0,
    /** 24.0 is set by the TURN, not by the distance: the crossing swings the
     *  view 142° and 1.5 × 142 / 24 = 8.88 °/s sits under S53's 9.1 °/s
     *  ceiling. The translation peak that falls out of it (0.403 m/s) is
     *  comfortably inside 0.43. */
    buildSeconds: 24.0,
    /** the r4 fold reads at the same pace the wall-drop did; the remaining
     *  ~13 s of the leg is travel over a finished building */
    cascadeSeconds: 11.0,
    descendSeconds: 11.5,
    /** 2.0 s before the crossing ends, so the 2.5 s crossfade finishes just
     *  after the descent starts: the lights go out as you come down */
    rigDelaySeconds: 22.0,
    opensWalls: false, seat: 270
  }
};

/** the plan for an era step, or undefined when the piece should just morph */
export function relocationFor(from: EraKey, to: EraKey): RelocationPlan | undefined {
  return RELOCATIONS[`${from}-${to}`];
}
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

/**
 * ⚑ THE DOORPLATES ARE CUT (Session 71, Sérgio: *"the doorplates aren't
 * good."*). Three wall plates named each room from the overlook, and their job
 * was to caption rooms that had no identity of their own. S66 removed that job
 * — Room 2 is somebody's room now, with her lamp, her books and her cardigan
 * on the chair — so a plate telling you whose room it is became the frame
 * explaining the room to you, which this piece never does.
 *
 * ⚑ THE CHOREOGRAPHY STAYS. The rise, the hold and the descent are unchanged
 * and every measured figure in the Session 67 log still holds; only the
 * signage is gone. One consequence is named rather than hidden: S67's own
 * argument for E1→E2 was that the single lit plate is what stops the empty
 * hold reading as a missing asset. That hold is now 7 seconds over a closed
 * room with nothing in it, and whether it reads as waiting or as a bug is a
 * judgement for Sérgio in the seat.
 *
 * Removed with them: `drawPlate`/`fitFont`, the plate entities and their fade,
 * `showPlates`/`hidePlates`, `RelocationPlan.plates`, `doorplates` in
 * data/room/cluster.json, and data/strings/doorplates.json entirely.
 */

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
  /** the O8 seam: cascade the space + crossfade the rig + re-arm the niche.
   *  `plan` (S67) is the relocation choreography this shift is part of — the
   *  space's half of it, scheduled around the camera's three legs. Pass null
   *  for the undriven path (?descent=0, review jumps): everything happens at
   *  once, exactly as it did before the relocation existed. */
  morphToEra(era: EraKey, animate: boolean, plan?: RelocationPlan | null): void;
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
    settledBatch = batchSettledProps(app, room, new Set([...staticIds, ...BELONGINGS_IDS, ...UNBATCHED_IDS]));
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
    staticJoined = batchStaticProps(app, room, new Set([...staticIds].filter((id) => !BELONGINGS_IDS.has(id) && !UNBATCHED_IDS.has(id))));
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
  /**
   * ⚑ ROOM 2'S OWN LIGHT (Session 65, Sérgio: *"there's a lot of clipping
   * objects in this room and has no lights"* — the second half was exactly
   * true). Room 1 has a LAMP: a prop you can see, throwing light you can read
   * as coming from it. Room 2 had a single invisible ceiling omni at 2.15 m
   * and nothing else, so the whole room was flat fill with no source in it —
   * which is why it photographs as brown mud.
   *
   * The source it should have had is the one already on the desk. This is the
   * laptop's own spill, cool and short-range, sitting at the panel: at night,
   * in 2016, the screen IS the lamp. It also puts the piece's light doctrine
   * on the right side of the room — the warm lamp is Daniel's, and Vera's
   * light comes out of the work. The lift then does the rest of the argument
   * by finally putting something warm in here.
   *
   * Registered in `zoneLights` so the per-era rig drives it with the others;
   * `mayaGlow`'s existing '#8899BB' is reused rather than a new value.
   */
  /** a room light's COLOUR is room data, not code — read it from the rig that
   *  drives it (data/room/cluster.json) instead of pinning a second copy here.
   *  The fallback is only for a light with no authored entry yet. */
  const rigColor = (id: string): string =>
    (clusterData.rigs as unknown as Record<string, Rig | undefined>).e3?.lights?.[id]?.color
      ?? zoneLights[0].light?.color.toString(false) ?? '';

  const r2Screen = mkLight('light-r2Screen', [-5.1, 1.15, 0.7], rigColor('r2Screen'), 2.4);
  zoneLights.push(r2Screen);
  /**
   * ⚑ VERA'S LAMP (Session 66) — the other half of the same fix, and the more
   * important half. S65 gave Room 2 the laptop's cold spill; a room lit only by
   * the thing that is doing this to her is a thesis, not a home. The style
   * direction's governing idea is that **the warm light is life** and it needs
   * a visible source: Room 1's lamp is canon's one constant object precisely
   * because you can see it throwing what it throws.
   *
   * So Room 2 gets its own, on her desk (`w_lamp2*`), nineteen years newer and
   * smaller than Daniel's. Not rig-driven through `zoneLights` — it is named,
   * so `data/room/cluster.json`'s per-era rigs drive it like `lamp`, and the
   * era arc can take it down as the cold light wins. ROLLBACK: delete this
   * light, the three `w_lamp2*` props, and the `r2Lamp` rig entries.
   */
  mkLight('light-r2Lamp', [-5.30, 1.02, 1.24], rigColor('r2Lamp'), 2.6);
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
  /** the current crossfade's duration — RIG_FADE_SECONDS for every ordinary rig
   *  change, E3_LIFT_SECONDS for the lift (which must read as a room changing,
   *  not as a cut). */
  let rigFadeSeconds = RIG_FADE_SECONDS;
  /** true only between Malta and the next authored rig change — see liftE3() */
  let e3Lifted = false;

  function applyRig(name: string, animate: boolean): void {
    if (name === '_note') return;
    const rig = (clusterData.rigs as unknown as Record<string, Rig | undefined>)[name];
    if (!rig) return;
    rigFadeSeconds = RIG_FADE_SECONDS;
    e3Lifted = false; // any authored rig change ends the beat — see liftE3()
    fadeToRig(rig, animate);
  }

  /** the crossfade itself, shared by `applyRig` (an authored rig from
   *  data/room/cluster.json) and `liftE3` (a rig DERIVED from the e3 one). */
  function fadeToRig(rig: Rig, animate: boolean): void {
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

  /**
   * ⚑ THE LIFT — see E3_LIFT above for what this beat IS. Here is only how it
   * is built: the e3 rig, multiplied. Nothing is authored twice, so the lit
   * room cannot drift away from the unlit one; it is the same room, exposed.
   */
  function liftE3(on: boolean): void {
    const base = (clusterData.rigs as unknown as Record<string, Rig | undefined>).e3;
    if (!base || e3Lifted === on) return;
    e3Lifted = on;
    if (!on) { applyRig('e3', true); return; }
    const lights: Record<string, RigLight> = {};
    for (const [id, target] of Object.entries(base.lights)) {
      const gain = E3_LIFT.lights[id] ?? 1;
      lights[id] = {
        intensity: target.intensity * gain,
        range: id === 'lamp' && target.range !== undefined ? target.range * E3_LIFT.lampRange : target.range,
        color: target.color
      };
    }
    rigFadeSeconds = E3_LIFT_SECONDS;
    fadeToRig({
      ambient: base.ambient.map((c, i) => c * E3_LIFT.ambient[i]),
      zoneFill: base.zoneFill * E3_LIFT.zoneFill,
      lights
    }, true);
  }
  e3LiftHook = liftE3;

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

    morphToEra(toEra: EraKey, animate: boolean, plan?: RelocationPlan | null): void {
      const fromEra = era;
      era = toEra;
      const fromIdx = STATE_FOR_ERA[fromEra];
      const toIdx = STATE_FOR_ERA[toEra];
      // S67: `plan === undefined` means "use the choreography if there is one";
      // an explicit null is the opt-out (?descent=0, review jumps), which is
      // the pre-S61 behaviour — everything at once, no timeline.
      const reloc = animate && plan !== null
        ? (plan ?? relocationFor(fromEra, toEra))
        : undefined;
      seamsOff();
      carryLampLight(toEra === 'e4');
      migrateTerminal(toEra === 'e4');
      // S61 — see setTerminalVisible's note. On a WALL-OPENING relocation this
      // is deferred into the timeline below so the panel leaves WITH the walls
      // rather than blinking out three seconds before them.
      if (!reloc?.opensWalls) setTerminalVisible(toEra !== 'e3');

      // ⚑ THE RELOCATION's space half (choreography doc §T1's staged timeline,
      // moved here from the E1→E2 transition Session 27/R28-0c per Sérgio's
      // D14/D15 direction, and generalised to all three era steps in S67).
      // Everything hangs off `riseSeconds`: the space starts changing the
      // moment the camera stops climbing, and takes its own leg to do it.
      if (reloc) {
        const setLight = (id: string, i: number): void => {
          const e = app.root.findByName(`light-${id}`);
          if (e instanceof pc.Entity && e.light) e.light.intensity = i;
        };
        const R = reloc.riseSeconds;
        const cascade = reloc.cascadeSeconds ?? reloc.buildSeconds;
        const pace = cascade / CASCADE_BASE_SECONDS;
        const rigAt = reloc.rigDelaySeconds
          ?? (reloc.opensWalls ? cascade - 3.0 : Math.min(2.5, cascade * 0.35));
        state = toIdx >= 1 ? 'open' : 'sealed';
        const events: { t: number; fn: () => void }[] = [
          { t: R, fn: () => {                                  // the space begins to change
            beginMorphedStateBatch();
            morph.goToState(toIdx, true, pace);
            // S61: the record leaves the spine WITH the walls (see
            // setTerminalVisible) — one change, one moment, not two.
            if (reloc.opensWalls) setTerminalVisible(toEra !== 'e3');
          } }
        ];
        if (reloc.opensWalls) {
          applyRig('hold', true); // Session 27 (item 11): animated, not an instant
          // snap — an un-eased jump straight to the 'hold' rig hit the CRT's own
          // screenGlow light (E2's 0.38 → hold's 0.1) in a single frame, right as
          // the update notice appeared, reading as a lighting glitch on the monitor.
          planeLerp = { from: PLANE_Z[0], to: PLANE_Z[1], t: -R, dur: cascade };
          events.push(
            { t: R, fn: () => setLight('roomFill', 0.55) },      // ballast: clunk
            { t: R + 0.18, fn: () => setLight('roomFill', 0.05) },
            { t: R + 0.6, fn: () => setLight('roomFill', 0.95) }, // flicker
            { t: R + 0.78, fn: () => setLight('roomFill', 0.1) },
            { t: R + 2.0, fn: () => {                            // the other rooms were ready first
              for (const zl of zoneLights) if (zl.light) zl.light.intensity = 0.9;
            } },
            { t: R + rigAt, fn: () => applyRig(toEra, true) },
            { t: R + rigAt + 0.1, fn: () => applyLayout() }       // X: keep the back arm open
          );
        } else {
          // ⚑ NO ballast, NO stutter, NO zone lights: nothing is opening, the
          // room is only getting older. Its rig is the aging (E1→E2's 2003
          // daylight is the single strongest time cue the piece has), so it
          // crossfades inside the leg rather than at the seam — you watch the
          // light change from above instead of arriving to find it changed.
          if (toEra !== 'e4') setPlaneZ(PLANE_Z[toIdx >= 1 ? 1 : 0]);
          planeLerp = null;
          events.push(
            { t: R + rigAt, fn: () => applyRig(toEra, true) },
            { t: R + cascade, fn: () => applyLayout() }
          );
        }
        schedule(events);
        niche.setFacet((eraTable()?.default ?? 'none') as FacetState);
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
      // S67: NOT at E4 — migrateTerminal() has just put the record on Room 3's
      // wall at z 1.75, and setPlaneZ would drag it straight back to the spine's
      // z 3.62, i.e. outside Room 3 entirely, behind its east wall. Pre-existing
      // since the E4 migration landed; caught while generalising this path.
      if (toEra !== 'e4') setPlaneZ(PLANE_Z[toIdx >= 1 ? 1 : 0]);
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
      // S67: see morphToEra's note — at E4 the record lives on Room 3's wall
      // and the spine z would put it outside the room.
      if (era !== 'e4') setPlaneZ(PLANE_Z[STATE_FOR_ERA[era] >= 1 ? 1 : 0]);
      else migrateTerminal(true);
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
        rigT = Math.min(1, rigT + dt / rigFadeSeconds);
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
