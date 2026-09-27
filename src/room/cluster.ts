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
import { ClusterMorph } from './clusterMorph';
import { bakeBatch, clearBatch, type BatchHandle } from './batching';
import clusterData from '../../data/room/cluster.json';
import nicheData from '../../data/room/fluid_niche.json';
import belongingsData from '../../data/room/belongings.json';
import type { FluidNiche, FacetState } from './fluidNiche';
import type { CeilingWitness } from './ceilingWitness';
// ⚑ S79: the ball borrows two colours and adds no palette of its own — the
// colour law's one home is the theme, and both of these are era1.json's own.
import { BALL } from '../desktop/theme/era4';
import { mountCommonsLamps } from './commonsLamps';
import { mountCommonsFigures } from './commonsFigures';
import { mountCommonsWorld, WORLD, type CommonsWorld } from './commonsWorld';

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
 *  the batch below (not just the morph's own STATIC_IDS check) —
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
 * on the workstation (`src/room/graceQueueLite.ts` → `src/room/era3Devices.ts`), and
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
 * ⚑ THE BALL'S LIGHT (S79) — TRANSCENDANCE, and it is the whole of what the
 * scene costs this file. `docs/REINTERP_E4_DEEP_PASS_2026-08-05.md` §1.3 and
 * `REINTERP_E4_THE_DEVICE_2026-08-05.md`'s Stage 0 close: **the ball has no
 * screen at all** — no stage, no mesh, no geometry of any kind is added for it.
 * It is sound, and it is this: light moving through a building that has been
 * standing since 1997 and had its walls taken down in 2016.
 *
 * ⚑ ONE LIGHT THAT MOVES, AND IT IS THE INVERSE OF E3's HOUSE LOOK. Correction
 * 13 on the 2016 list applies a grading preset under `Household` 1:5 — *"one
 * lamp for the whole room, so that no face is lit differently from another."*
 * This is one lamp that travels and lights one person at a time, differently,
 * because that is what a room full of attention pointed at one person looks
 * like. ⚑ Nothing in the piece ever remarks on the pair, and nothing may.
 *
 * ⚑ IT NEVER REACHES THE PLAYER. Station 4 stops 2.2 m short of Room 3's seat:
 * at the ball nothing is addressed to you and nobody is selling — you are not
 * the customer, which is the exact difference between this room and the one the
 * headset was showing thirty seconds earlier (THE_SPACE §3). The attention is
 * always somebody else's, and it is always given rather than taken.
 *
 * Two omni lights, no shadows, no meshes, no draw calls of their own; both sit
 * at intensity 0 whenever the ball is not running, which is every frame of the
 * other twenty-nine years. Module-level hook for the same reason `setEra3Lift`
 * is one: the beat that drives it lives on the OS side of a file fence
 * (`src/desktop/apps/ball.ts`) and holds no `ClusterShell`. A no-op with no
 * shell, which is correct rather than defensive — under `?flat=1` there is no
 * room, so there is no light to put in it, and the captions still run.
 */
export interface BallLightState {
  /** 0…1 — how full the building is */
  level: number;
  /** float index into BALL_STATIONS: 1 is the far west end, 4 the nearest the
   *  attention ever comes. Fractional values are mid-walk. */
  station: number;
  /** 0…1 — the room answering a landing. Brief, warm, never a strobe. */
  flare: number;
}
/**
 * Where the attention can be. Geometry, so it lives in code (00_START_HERE) —
 * and it is authored against the OPEN building, which is what E3 left behind:
 * Room 2 at x −4.4, Room 1 at 0, Room 3 (the seat) at +4.4, the spine at z 3.6.
 * ⚑ Every station is BEHIND the E4 seat, whose facing is +x. The room the piece
 * has been asking you to turn away from for thirty years is where the ball is.
 */
const BALL_STATIONS: [number, number, number][] = [
  [0.00, 1.70, 3.10],   // 0 · the spine door — where the sound comes in
  [-6.10, 1.55, 0.70],  // 1 · the far west end
  [-4.40, 1.55, 0.70],  // 2 · Room 2
  [0.00, 1.55, 0.70],   // 3 · Room 1, the open middle
  [2.20, 1.55, 0.70]    // 4 · as near as it ever comes, and it stops there
];
/** seconds for the building to fill, and to empty. Slow enough to be a room
 *  filling rather than a cut — the same instinct as E3_LIFT_SECONDS. */
const BALL_FADE_SECONDS = 7.0;
/** the attention's own easing constant, in seconds. It is a person crossing a
 *  floor, so it drifts toward its mark and never snaps to it. */
const BALL_WALK_TAU = 2.4;
const BALL_FLARE_SECONDS = 1.8;
/** peak intensities, and the ambient the full room adds over the era's rig */
const BALL_ATTENTION_I = 2.4;
const BALL_ROOM_I = 0.85;
const BALL_AMBIENT = [0.16, 0.13, 0.09];

let ballHook: ((s: BallLightState | null) => void) | null = null;
let worldRef: CommonsWorld | null = null;
let roomHook: ((hidden: boolean) => void) | null = null;
/** app.ts registers this: it switches the building off and on around the world */
export function onCommonsRoom(fn: (hidden: boolean) => void): void { roomHook = fn; }
/** the Commons world on: the room goes, the hall arrives. Off: the room returns. */
export function setCommonsWorld(on: boolean): void {
  if (!worldRef || worldRef.on === on) return;
  worldRef.setOn(on);
  roomHook?.(on);
}
/** `null` ends the beat and takes the light back down over BALL_FADE_SECONDS */
export function setBallLight(s: BallLightState | null): void {
  ballHook?.(s);
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
    /** S156 / R3-46: the descent now un-pitches 45° (the overlook looks down at the room as it
     *  ages), and 1.5 × 45 / 8 = 8.4 °/s keeps it under the 9.1 ceiling; 7 s would be 9.6 */
    riseSeconds: 7.0, buildSeconds: 7.0, descendSeconds: 8.0,
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
/** HISTORICAL WRONG MECHANISM: the record plane used to "ride z" on every era
 *  transition (first 3.685/3.865, later 3.60/3.62). That duplicated the
 *  canonical spine placement in cluster.json and twice allowed an era shift
 *  to put the live record behind a mount. S84 removes that second authority:
 *  migrateTerminal(false) restores the one authored spine pose; only E4's
 *  explicit migration is allowed to move the surface. */
/**
 * ⚑ 2026-09-05 — THE RECORD DOES NOT FOLLOW HER, and that beat is RETIRED.
 *
 * Sérgio: *"The whole narrative of Daniel and Maya was not working, so it needs
 * to be cleared out"* — scoped, on the same day, to **the link between them**:
 * both people stay, they stop being the same file.
 *
 * What used to be here was `TERMINAL_E4` and a `migrateTerminal()` that carried
 * the intake plane off the spine and hung it on Maya's wall at E4, under the
 * heading "the person and the record finally share a wall — the TURN's promise,
 * unified." It is the single mechanism that made Daniel's 1997 file into the
 * thing describing Maya in 2026, and once he struck the name off it (the same
 * morning) there was nothing left in it that was true: a file cannot follow
 * someone it was never about.
 *
 * ⚑ It also removes the fault it kept producing. That plane covered her poster
 * and clipped her photograph until yesterday; it drew DORMANT for anyone
 * entering the era directly; it needed a mount prop, an era-4 vocabulary, a
 * misfile line and a never-asleep clause to be defensible at all. Four fixes to
 * hold up one connection. The record now behaves the way it does at E3 and for
 * the same reason: **by 2016 the apparatus stopped being a place you go to, and
 * by 2026 a cold panel bolted to a bedroom wall is 1997's object.** The file's
 * final form is the Close's constellation, which is where the piece already
 * puts it.
 */

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
  /**
   * ⚑ S108 — tell the batch which props must never share a material, and rebake.
   *
   * This is a setter and not a constructor argument for one dull reason that is
   * worth writing down rather than rediscovering: the set app.ts wants to pass
   * is the union of its own `EMPHASIS_PROPS`, which is declared ~700 lines AFTER
   * the call that builds this shell. Reaching it from the constructor is a
   * temporal-dead-zone crash, and moving the table would break `check-spec`'s
   * C11, which parses it out of app.ts by its exact indentation. So the shell is
   * built, the table comes into scope, and the caller hands it over — one extra
   * bake at boot, which costs nothing and is measurable if it ever stops
   * happening (`window.__batchedProps`).
   */
  setNeverBatch(ids: Iterable<string>): void;
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
  /** apply a named rig directly (the Close uses 'close'). `seconds` lengthens
   *  the crossfade for the one place it must read as night falling, not as a
   *  rig change (the Close's `hold`). */
  applyRig(name: string, animate: boolean, seconds?: number): void;
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
  batch = true,
  /** ⚑ S108: props whose materials something writes to at runtime — they never
   *  join the batch and never share. app.ts passes its EMPHASIS_PROPS union. */
  neverBatch: ReadonlySet<string> = new Set()
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
  // ⚑ S108: this file no longer needs `constantPropIds()`. It existed here only
  //   to keep the constant props out of the settled batch group, and there is
  //   one group now; `clusterMorph` computes the same set for itself (its own
  //   `STATIC_IDS`) and that contract is untouched.
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
  let roomBatch: BatchHandle | null = null;
  let settledJoined = 0;
  let pendingSettledRebatch = false;
  /**
   * ⚑ S108: the props that may never share a material with anything, because
   * something writes to theirs at runtime and a shared write is a write to every
   * prop carrying it. `BELONGINGS_IDS` is the R28-2c set (the "kept" warm lift);
   * `UNBATCHED_IDS` is the S71 toggle; `neverBatch` is whatever the caller adds,
   * which app.ts fills with the union of its own EMPHASIS_PROPS — the guide's
   * prop-lift reaches those and nothing else. `staticIds` is NOT in this set any
   * more: the static/settled split was the thing producing 61 duplicate batches,
   * and one group with one numeric id is what replaced it.
   */
  const excluded = new Set([...BELONGINGS_IDS, ...UNBATCHED_IDS, ...neverBatch]);
  function publishBatchStats(): void {
    const w = window as { __batchedProps?: number; __staticBatchedProps?: number; __settledBatchedProps?: number };
    w.__staticBatchedProps = 0; // one group now — kept so old probes read 0, not stale
    w.__settledBatchedProps = settledJoined;
    w.__batchedProps = settledJoined;
  }
  function clearSettled(): void {
    roomBatch = clearBatch(app, room, roomBatch);
    settledJoined = 0;
    publishBatchStats();
  }
  function rebuildSettled(): void {
    if (!batch) return;
    clearSettled();
    roomBatch = bakeBatch(app, room, excluded);
    settledJoined = roomBatch?.joined ?? 0;
    publishBatchStats();
  }
  function beginMorphedStateBatch(): void {
    if (!batch) return;
    clearSettled();
    pendingSettledRebatch = true;
  }
  if (batch) rebuildSettled();

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
   * workstation's own spill, cool and short-range, sitting at the panel: at night,
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
   * important half. S65 gave Room 2 the workstation's cold spill; a room lit only by
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
  mkLight('light-r2Lamp', [-5.30, 1.02, 1.30], rigColor('r2Lamp'), 2.6);   // S177: with the lamp, 6 cm left
  const mayaGlow = mkLight('light-mayaGlow', [4.4, 1.35, 0.7], '#8899BB', 3.0); // Room 3 interface light (E4)
  void mayaGlow; // rig-driven by id

  // ── ⚑ THE BALL (S79) — see BallLightState above. Deliberately NOT pushed into
  // `zoneLights` and deliberately not named after any rig key: no era rig may
  // reach these, so the one warm thing in 2026 cannot be dimmed by the light
  // arc that is busy losing to the cold everywhere else. Both idle at 0. ──
  const ballAttention = mkLight('light-ballAttention', BALL_STATIONS[3], BALL.attention, 6.5);
  const ballRoom = mkLight('light-ballRoom', [-1.0, 2.3, 0.9], BALL.room, 12.0);
  // ⚑ S133 — and the community itself, visible: forty-one lamps in the open
  // building, one procedural mesh, driven by `setCommonsLamps` from ball.ts.
  /**
   * ⚑ 2026-09-12 — THE COMMONS IS A WORLD, not an overlay. The crowd and the
   * lamps hang under it, so they exist only while it does; and it hangs under
   * app.root, not under this shell, because the shell (the three rooms) is
   * switched OFF while she is there. See commonsWorld.ts.
   */
  const commonsWorld = mountCommonsWorld(app);
  const commonsLamps = mountCommonsLamps(app, commonsWorld.entity);
  const commonsFigures = mountCommonsFigures(app, commonsWorld.entity);
  worldRef = commonsWorld;

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
    if (to) lampLight.setLocalPosition(5.44, 1.02, 1.2); // ⚑ S179: at the head of Maya's beacon lamp (e_lampBeacon) // Maya's desk (Room 3) — ⚑ 2026-09-05: z 1.5 was 0.19 m PAST the desk's own edge (it ends at 1.31), so the lamp it follows was standing over the bed
    else lampLight.setLocalPosition(lampHome.x, lampHome.y, lampHome.z);
  }

  // The witness record has one spine pose. At E4 it MIGRATES off the spine to
  // Room 3's wall beside Maya's desk — the person and record share a wall.
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

  /**
   * ⚑ ROOM 3 ARRIVES WITH ITS OWN ERA — settled 2026-08-24, and the answer is a
   * WALL, not a prop toggle.
   *
   * Sérgio, on a screenshot of Era 3: *"you can continue to see Maya's room
   * while in Era-3… I don't think it is possible to showcase the past of all
   * rooms while the narrative develops. Each room appears in sequence and is
   * frozen in time when we jump to another time."*
   *
   * ⚑ THE CAUSE WAS ONE DATA LINE: `r3`'s remove list took down `wallWest` AND
   * `wallEast` in the same fold, so 2016 opened onto BOTH 1997 and 2026 at once.
   * Measured from Vera's seat, the turn put 62 of Maya's 68 props in frame, lit
   * and furnished, ten years early. `wallEast` now comes off at `r4` instead.
   *
   * ⚑ AND THIS REPLACES A WORSE FIX OF MINE. I had hidden Maya's fifty personal
   * props at E3 and kept the shell, so the room read as "a spare room". That
   * solved the spoiler and left the architecture lying: a room with no wall in
   * front of it, pretending to be empty. The wall was always there in the data;
   * it was simply being removed an era too early. **One line of data beats fifty
   * entity toggles, and it is the room's own grammar rather than a special
   * case.** The era transitions already mean "the walls come off" — now they
   * come off ONE AT A TIME, which is what the sequence was always for.
   */

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
  /** ⚑ S79: what the RIG wants the ambient to be this frame, kept separately so
   *  the ball can add warmth ON TOP of a crossfade instead of fighting it. The
   *  two systems never write the same value: the rig owns `ambNow`, the ball
   *  owns everything after it. */
  let ambNow = app.scene.ambientLight.clone();
  let rigT = 1;
  /** the current crossfade's duration — RIG_FADE_SECONDS for every ordinary rig
   *  change, E3_LIFT_SECONDS for the lift (which must read as a room changing,
   *  not as a cut). */
  let rigFadeSeconds = RIG_FADE_SECONDS;
  /** true only between Malta and the next authored rig change — see liftE3() */
  let e3Lifted = false;

  function applyRig(name: string, animate: boolean, seconds?: number): void {
    if (name === '_note') return;
    const rig = (clusterData.rigs as unknown as Record<string, Rig | undefined>)[name];
    if (!rig) return;
    rigFadeSeconds = seconds ?? RIG_FADE_SECONDS;
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
    /**
     * ⚑ 2026-09-05 — A RIG THAT NAMES A ZONE LIGHT NOW WINS, and until today it
     * did not. This loop ran AFTER the named pass above and overwrote every
     * zone light with `zoneFill` — so `r2Screen`, which is both a zone light and
     * a rig key, had its authored e4 value of 0.4 silently replaced by 0.52 on
     * every era shift. A number in `cluster.json` that the code overwrites two
     * lines later is worse than no number: it reads as a decision and is a
     * comment. Naming a zone light in a rig is now the way to say "not this
     * one", which is what Room 2 going dark needs.
     */
    for (const zl of zoneLights) {
      const key = zl.name.replace(/^light-/, '');
      if (rig.lights[key] !== undefined) continue; // the rig spoke for this one
      if (zl.light) fadeLight(zl.light, { intensity: rig.zoneFill });
    }
    ambTo = new pc.Color(rig.ambient[0], rig.ambient[1], rig.ambient[2]);
    if (animate) {
      ambFrom = ambNow.clone();
      rigT = 0;
    } else {
      ambNow = ambTo.clone();
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

  // ── ⚑ THE BALL'S LIGHT — see BallLightState at the top of this file ────────
  /** what the beat has asked for; `null` = it is over and the room empties */
  let ballWant: BallLightState | null = null;
  /** what the room is actually doing, eased toward it */
  let ballLevel = 0;
  let ballStation = 3;
  let ballFlare = 0;
  /** true from the first request until the light has finished going back down —
   *  every frame outside that window this whole system costs one comparison. */
  let ballLive = false;
  const ballAmb = new pc.Color(0, 0, 0);
  const ballPos = new pc.Vec3();

  function ballLightState(s: BallLightState | null): void {
    ballWant = s;
    if (s) {
      ballLive = true;
      // the first request also places the attention, so the light does not
      // travel across the building on its way to where it starts
      if (ballLevel <= 0) ballStation = s.station;
    }
  }
  ballHook = ballLightState;

  /** the attention's world position, lerped between the two stations it is
   *  between — a person crossing a floor, not a light jumping between marks. */
  function stationAt(f: number): pc.Vec3 {
    if (worldRef?.on) {
      // ⚑ in the world the stations are the stage, end to end: 1 is stage
      //   left, 4 stage right, and the attention walks along it
      const k = Math.max(0, Math.min(1, (f - 1) / 3));
      const S = WORLD.stage;
      return ballPos.set(S.x - 0.4, S.h + 1.6, S.z - S.w * 0.42 + S.w * 0.84 * k);
    }
    const n = BALL_STATIONS.length;
    const c = Math.max(0, Math.min(n - 1, f));
    const i = Math.min(n - 2, Math.floor(c));
    const k = c - i;
    const a = BALL_STATIONS[i];
    const b = BALL_STATIONS[i + 1];
    return ballPos.set(
      a[0] + (b[0] - a[0]) * k,
      a[1] + (b[1] - a[1]) * k,
      a[2] + (b[2] - a[2]) * k
    );
  }

  function updateBall(dt: number): void {
    if (!ballLive) return;
    const wantLevel = ballWant ? Math.max(0, Math.min(1, ballWant.level)) : 0;
    const rate = dt / BALL_FADE_SECONDS;
    ballLevel = wantLevel > ballLevel
      ? Math.min(wantLevel, ballLevel + rate)
      : Math.max(wantLevel, ballLevel - rate);
    if (ballWant) {
      const k = Math.min(1, dt / BALL_WALK_TAU);
      ballStation += (ballWant.station - ballStation) * k;
      const wantFlare = Math.max(0, Math.min(1, ballWant.flare));
      ballFlare = wantFlare > ballFlare
        ? wantFlare
        : Math.max(wantFlare, ballFlare - dt / BALL_FLARE_SECONDS);
    } else {
      ballFlare = Math.max(0, ballFlare - dt / BALL_FLARE_SECONDS);
    }

    const p = stationAt(ballStation);
    ballAttention.setLocalPosition(p.x, p.y, p.z);
    if (ballAttention.light) {
      ballAttention.light.intensity = BALL_ATTENTION_I * ballLevel * (1 + ballFlare * 0.55);
    }
    if (ballRoom.light) ballRoom.light.intensity = BALL_ROOM_I * ballLevel;
    ballAmb.set(
      ambNow.r + BALL_AMBIENT[0] * ballLevel,
      ambNow.g + BALL_AMBIENT[1] * ballLevel,
      ambNow.b + BALL_AMBIENT[2] * ballLevel
    );
    app.scene.ambientLight = ballAmb;

    // …and when the room has finished emptying, hand the ambient back to the
    // rig exactly as it was, so nothing downstream can tell the ball happened.
    if (!ballWant && ballLevel <= 0 && ballFlare <= 0) {
      ballLive = false;
      app.scene.ambientLight = ambNow;
    }
  }

  function eraTable(): NicheEraTable | undefined {
    return (nicheData.eras as unknown as Record<string, NicheEraTable | undefined>)[era];
  }

  function seamsOff(): void { for (const s of seams) s.enabled = false; }

  return {
    setNeverBatch(ids: Iterable<string>): void {
      for (const id of ids) excluded.add(id);
      rebuildSettled();
    },
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
      // S61 — see setTerminalVisible's note. On a WALL-OPENING relocation this
      // is deferred into the timeline below so the panel leaves WITH the walls
      // rather than blinking out three seconds before them.
      if (!reloc?.opensWalls) setTerminalVisible(toEra !== 'e3' && toEra !== 'e4');

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
            if (reloc.opensWalls) setTerminalVisible(toEra !== 'e3' && toEra !== 'e4');
          } }
        ];
        if (reloc.opensWalls) {
          applyRig('hold', true); // Session 27 (item 11): animated, not an instant
          // snap — an un-eased jump straight to the 'hold' rig hit the CRT's own
          // screenGlow light (E2's 0.38 → hold's 0.1) in a single frame, right as
          // the update notice appeared, reading as a lighting glitch on the monitor.
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
      clearSettled();
      morph.goToState(STATE_FOR_ERA[era], false); // snap, deterministic
      applyRig(era, false);
      state = STATE_FOR_ERA[era] >= 1 ? 'open' : 'sealed';
      // morph.goToState does not own this app-level surface. Reassert its one
      // legal pose after a skipped relocation or a debug settle.
      setTerminalVisible(era !== 'e3' && era !== 'e4');
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
        ambNow = new pc.Color(
          ambFrom.r + (ambTo.r - ambFrom.r) * k,
          ambFrom.g + (ambTo.g - ambFrom.g) * k,
          ambFrom.b + (ambTo.b - ambFrom.b) * k
        );
        app.scene.ambientLight = ambNow;
      }
      // ⚑ LAST, and after the rig on purpose: the ball adds warmth on top of
      // whatever the era's light is doing rather than replacing it, so a
      // crossfade and a ball can run in the same frame without a fight.
      updateBall(dt);
      commonsLamps.update(dt);
      commonsFigures.update(dt);
      commonsWorld.update(dt);
    }
  };
}
