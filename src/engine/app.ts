/**
 * Engine — one room, two facings (PRODUCTION_SCRIPT v0.3 Part I; room per
 * ERA1_LOGIC v1 §4). The monitor at the desk carries the desktop OS; behind
 * the player, the back-of-house carries the witness repository wall.
 * Browser: drag anywhere off the monitor to look around — fully free, 360°;
 * the ⟲ control / F2 is an assist that swings you around. Crossing to the
 * witness hemisphere does the filing bookkeeping however you got there.
 * On the witness side every control is dead (cursor: not-allowed).
 * Units are meters; the monitor screen is centered at the origin.
 */
import * as pc from 'playcanvas';
import { DesktopOS } from '../desktop/os';
import { WitnessCanvas } from '../witness/intake';
import { ledger } from '../state/ledger';
import { gameMenuBus } from '../state/gameMenuBus';
import { ERA1_CANVAS } from '../desktop/theme/era1';
import { buildEra1Room } from '../room/era1room';
import { preloadModels } from '../room/assets';
import { buildFluidNiche, type FacetState, type FluidNiche } from '../room/fluidNiche';
import { buildCeilingWitness, type CeilingWitness } from '../room/ceilingWitness';
import { buildClusterShell, relocationFor, RELOCATIONS, type ClusterShell, type EraKey,
  type RelocationPlan } from '../room/cluster';
import { buildPointCloud, closeBackdropColor, type PointCloud } from '../room/pointCloud';
import { createSendRuntime, type SendRuntime } from '../room/sends';
import { buildMovementNodes, type MovementNodes } from '../room/movementNodes';
import { createSpine, type Spine } from '../narrative/spine';
import { TapeSystem, type TapeId } from '../narrative/tapes';
import { TapeAudioBus, roomBed, setOneShotsMuted } from '../audio/tapeAudio';
import { mountDebugPanel } from '../debug/panel';
import { makeScreenTexture, makeScreenEntity, screenUploads } from './screenTexture';
import { buildEra3Devices, type Era3Devices } from '../room/era3Devices';
import clusterData from '../../data/room/cluster.json';
import strings from '../../data/strings/slice.json';
import reinterpStrings from '../../data/strings/reinterp.json';
/** ⚑ S80: the frame's own words for look-mode 3's button. It lives in the game
 *  menu's string file because the recentre row beside it does too — one file
 *  for the frame voice, none of it on the monitor texture. */
import menuStrings from '../../data/strings/gameMenu.json';

const FLIP_SECONDS = 0.9;
/** the CRT's visible screen (meters, 4:3) — bezels in era1.json sit flush */
const SCREEN = { w: 0.4, h: 0.3, x: 0, y: 1.08, z: 0 };
/** the witness repository wall (sharp, oversized — surveillance scale) */
const WITNESS = { w: 1.6, h: 1.2, x: 0, y: 1.5, z: 3.4 };
/** seated eye position at the desk */
const EYE = { x: 0, y: 1.16, z: 0.7 };
/** the power button on the CRT (S1.0 power-on beat — the SHIPPED build's own
 *  gesture, `os.isOff`; reinterp never enters that phase, and its own optional
 *  early power-press is retired, decision doc §3) */
const POWER_BTN = { x: 0.19, y: 0.895, z: 0.03 };
/** the Starter Kit floppy on the desk (S1.2 insert beat) — in the leaflet pocket */
const KIT_FLOPPY = { x: -0.34, y: 0.762, z: 0.12 };
const DRAG_PITCH_MAX = 55;
/** O1 establishing framing (reinterp): pulled back, room-wide, window-lit */
const ESTABLISH = { x: 0, y: 1.62, z: 2.55, pitch: -7 };
// ── THE WAKE (docs/REINTERP_OPENING_DECISION_2026-07-24.md §3, Sérgio) ──
// Logging in at the interim panel IS the entry gesture: you arrive to a room
// lit only by the window, the main light comes up as if someone had flipped
// the switch on the way in, and the machine boots by itself. Nothing is asked
// of the player — this REPLACES S40's optional early power-press outright
// (D22's auto-boot was always the closed decision; E2's "Daniel turns it on
// himself" contrast, D38, gets its passivity back, undiluted).
/** the room as you find it, before the switch — moonlight only */
const WAKE_DARK_SECONDS = 1.2;
/** the switch itself: lamp + fill come up, moon recedes */
const WAKE_RAMP_SECONDS = 1.8;
// ── THE OPENING DESCENT (S48, rebuilt in S53 from Sérgio's second playthrough)
// Entry begins INSIDE the room, up near the door corner in the dark, and drifts
// in along ONE curve until it is sitting at the desk. HISTORICAL TIMING:
// "arrive → the light comes up → the machine boots." S84 keeps the same wake
// and boot hand-off but centres the light swell in flight: light → arrive → boot.
//
// S53 (his words): "the zoom in to place should be more in a curve, it can start
// a bit down in the room, not centered with the chair, that way we 'enter' the
// room and the camera also rotates to be in front of the screen, not so
// mechanical of going down to the seat and up to the screen, that way it can
// slowly flow." So the S48 shape — fall straight down from y 5.6 above the roof
// at a pinned −78°, THEN rotate level on the spot — is gone. It is now a single
// eased bezier that resolves POSITION AND AIM TOGETHER: it starts off-centre
// (the door side, not over the chair), under the ceiling rather than above it,
// and it arcs in while the view swings off the moonlit window and settles on the
// monitor. One `s`, one curve, one arrival — see startCamMove/DOLLY_CTRL, which
// is the same primitive the room-to-room dolly already flies; the front door is
// now literally one use of the piece's own arc, not a bespoke two-phase crane.
// Starting under the roof also means the ceiling slab is never hidden and never
// restored (S48 had to, and logged the batcher churn it cost at boot).
//
// COMFORT LAW (CLAUDE.md's turn-only body; §0-REV-4's accessibility rule).
// ⚑ Translation and rotation NOW OVERLAP, which is exactly the combination that
// provokes VR sickness, so the whole budget went into keeping the rates low
// instead of into separating the phases: the envelope is 0.43 m/s and 9.1°/s
// (S48's separated version peaked at 1.1 m/s and 41°/s — this moves the body
// slower AND turns the head four times slower, while never stopping).
// ⚑ CORRECTED 2026-08-06: this comment used to assert the leg MET those peaks.
// It did not. S72's L4 assertion measured 0.497 m/s here — the envelope was
// named from this leg and the leg overran it by 1.2× from the day it shipped.
// Fixed by DESCENT_SECONDS 10 → 11.6 (see below). `npm run audit` now fails if
// any driven leg exceeds the envelope, so this class of drift cannot recur
// silently — but every figure here is DESKTOP-measured and A11 has never run.
// Smootherstep throughout: zero velocity AND zero acceleration at both ends, no
// start jolt, no mid-move speed change, no arrival bump. Yaw takes the shortest
// signed path, so it cannot wind the long way round. No roll, ever, and no
// field-of-view games. HISTORICAL WRONG CLAIM: "Any input (click, drag, key)
// lands you in the seat at once." S84 routes pointers through S80's tap test:
// a deliberate tap or key skips; a travelling press is a look and keeps flying.
// ⚑ VR IS STILL THE RISK CASE: in a headset this remains the one piece of
// artificial locomotion in a work whose entire bodily law is "you never walk".
// It MUST be judged in the A11 in-headset pass; `?descent=0` turns it off for
// that A/B (and for anyone who does not want it).
/** where the entrance begins: inside the room, high on the DOOR side (the door
 *  is at x 2.1, z 2.2), off-centre from the chair, aimed down and across at the
 *  moonlit window — the room's only light before the wake */
const DESCENT_FROM = { x: 1.52, y: 2.18, z: 2.62, pitch: -30, yaw: 44 };
/** the bezier CONTROL point (same role as DOLLY_CTRL): it holds the path high
 *  and out over the floor through the middle of the move, so the camera curls
 *  in over its own right shoulder and settles, rather than sliding down the
 *  diagonal between two marks.
 *  ⚑ The offset that matters is the one PERPENDICULAR to the straight line from
 *  DESCENT_FROM to the seat. A control point placed "between" the two ends bows
 *  nothing however far along it sits — it only re-times the move. (First pass
 *  here did exactly that and the frame trace caught it: 0.028 m of bow across a
 *  2.65 m chord, i.e. a straight line.) This one is offset 0.52 m perpendicular
 *  — up, and out toward the door side — measured as 0.50 m of real sagitta. */
const DESCENT_VIA = { x: 1.03, y: 2.45, z: 1.03 };
/** one continuous move, slow enough to read as drifting in and sitting down.
 *  ⚑ 11.6, not 10 — and this is the comfort law, not a taste call. S72's L4
 *  assertion measured this leg at **0.497 m/s against the 0.43 m/s envelope**:
 *  1.875 × 2.653 m of chord / 10 s. The comment above these constants used to
 *  claim "measured peaks are 0.43 m/s and 9.1°/s", but the envelope was NAMED
 *  from this leg and the leg had never met it — for every player, every run, as
 *  the first thing that happens. Applied 2026-08-06 on Sérgio's decision, since
 *  the 2 s is pacing and pacing is his. ⚑ 11.6 was applied first and measured
 *  0.429 — inside, but by 0.001 m/s, which is a hairline any later tweak to
 *  DESCENT_FROM/VIA or the seat would erase. Sérgio took 12.0 for real margin.
 *  Re-measure with `node tools/shots.mjs comfort` after touching any of those. */
const DESCENT_SECONDS = 12.0;
/** Centre the existing 1.8 s light swell on the 12 s entrance's midpoint.
 *  Negative wake time is only a scheduled hold: no camera timing changes. */
const WAKE_DURING_DESCENT_DELAY =
  DESCENT_SECONDS / 2 - (WAKE_DARK_SECONDS + WAKE_RAMP_SECONDS / 2);
// ── ⚑ THE RELOCATION (S61; every era change from S67) — the piece lifts you ──
// Sérgio, after playing it: *"the transition needs explaining… the fly over
// needs to be slower and let you see the room being built so you understand
// the new space and the passage of time."* What he saw was a 2.4 s dolly
// (`dollyTo(homeYaw, 2.4)`) fired at the same instant as a 6.5 s cascade: the
// camera arrived at Vera's desk, facing a wall, four seconds before the space
// behind it finished opening. Six years, and it was over before it read.
//
// It is THREE LEGS, timed by `RELOCATIONS` in src/room/cluster.ts (which is
// also what re-times the cascade, so the two halves cannot drift):
//   1 RISE     — you come up out of the chair while the room is unchanged.
//                Nothing has happened yet; you are just no longer sitting.
//   2 THE BUILD — the space changes while you are up there, in front of you,
//                and the camera crosses slowly over it. This is the leg the
//                note asked for: the room is built in front of you, not behind.
//   3 DESCEND  — down into a seat, the facing resolving with the position
//                (S53's lesson: one curve, aim and place together).
//
// ⚑ S67 MADE THIS THE PIECE'S MOVEMENT GRAMMAR RATHER THAN ONE HANDOFF, and
// the argument is in docs/REINTERP_THE_BUILDING_2026-08-02.md: the one bodily
// law is that you turn but never walk, and its meaning is that a screen fixes
// your facing while what is behind you is other people. So the lift happens at
// EVERY era change and *what you see when you come up* is the story — one
// closed room at E1→E2, three at E2→E3, three again and routinely at E3→E4.
// The legs are deliberately the same; only the view differs. `RELOC_POSES`
// below is the camera half, keyed identically to cluster.ts's table.
//
// ⚑ COMFORT LAW (CLAUDE.md; §0-REV-4). This is artificial locomotion — the
// longest in the piece — so every leg is held to the envelope S53 measured for
// the opening descent: peak 0.43 m/s linear, 9.1°/s angular, smootherstep
// (arcs) / smoothstep (straight tweens) easing so velocity is zero at both
// ends of every leg, no roll, no FOV games, yaw always the shortest signed
// path. Those two easings put the peak at exactly 1.875 × chord / duration for
// an arc and 1.5 × chord / duration for a tween, which is why every duration
// here is a quotient rather than a preference: E2→E3's descent is 11.5 s and
// not 10 because 1.875 × 2.5445 / 10 = 0.477, over the envelope. E3→E4's
// crossing is 24 s because the building is 8.8 m wide and the turn is 142°.
// Measured peaks from real runs are in the session log; ALL are desktop
// figures, because A11 (the in-headset pass) has still never run. Any input
// lands you in the seat at once (endRelocation) and settles the room — the
// same escape the descent has, for the same reason — and `?descent=0` opts
// out of the whole grammar, exactly as it opts out of the entrance.
/** end of leg 1: standing over Daniel's desk, still inside his closed room.
 *  Kept UNDER the ceiling (2.68) and the lintels (2.43) throughout, so no
 *  slab ever has to be hidden and restored (the churn S48 logged). */
const RELOC_OVERLOOK_A = { x: 0.25, y: 2.16, z: 1.75, pitch: -17, yaw: 0 };
/** leg 1's bezier control — offset PERPENDICULAR to the chord (S53's finding:
 *  a control point placed "between" the ends bows nothing, it only re-times).
 *  ~0.23 m of real sagitta: you rise first and lean back after, rather than
 *  sliding up the diagonal. */
const RELOC_RISE_VIA = { x: 0.15, y: 2.00, z: 0.95 };
/** end of leg 2: out over the middle of the opened space, already turning
 *  toward Room 2. A straight eased tween, not an arc — during the build the
 *  camera should be the steadiest thing on screen. */
const RELOC_OVERLOOK_B = { x: -2.30, y: 2.28, z: 1.60, pitch: -13, yaw: 52 };
/** leg 3's control point: out over Room 2's floor, so the descent curls in
 *  over the bed and settles at the desk instead of dropping on a diagonal */
const RELOC_DESCEND_VIA = { x: -3.70, y: 2.10, z: 1.45 };
/**
 * ⚑ E1→E2's leg 2 (S67): THE HOLD THAT GOES NOWHERE.
 *
 * The walls stay on, so there is no second room for the camera to cross
 * toward, and the honest thing is to not pretend there is. It drifts 0.57 m —
 * a little further west, a little further down, toward the wall the building
 * happens to be behind — and stops. Slowest leg in the piece by a factor of
 * three (0.12 m/s peak), which reads as WAITING rather than as travel.
 *
 * ⚑ S71: it must not read as a missing asset, and what S67 relied on to stop
 * that — Room 1's doorplate lighting alone in the dark — IS GONE (Sérgio cut
 * the plates). The hold is now 7 seconds over a closed room with nothing added
 * to it. That is deliberate and it is untested in the seat: flagged in the
 * Session 71 log as the one thing the cut leaves open.
 */
const RELOC_E1_HOLD = { x: -0.30, y: 2.20, z: 1.62, pitch: -19, yaw: 0 };
/** E1→E2's leg 3 control: 0.23 m of sagitta (the rise's own figure), out over
 *  the room so you settle back into the chair rather than drop into it */
const RELOC_E1_DESCEND_VIA = { x: -0.38, y: 1.90, z: 0.83 };
/** E3→E4's leg 1 — Room 2's overlook. Deliberately the exact translation of
 *  Room 1's (+0.25 x, +1.00 y, +1.05 z off the seat, 1.4715 m of chord): by
 *  the third time, the move must be recognisable in the body, not just in the
 *  edit. Same via offset, same 7.0 s, same 0.394 m/s peak. */
const RELOC_OVERLOOK_R2 = { x: -4.15, y: 2.16, z: 1.75, pitch: -17, yaw: 90 };
const RELOC_R2_RISE_VIA = { x: -4.25, y: 2.00, z: 0.95 };
/** E3→E4's leg 2 — the mirror of RELOC_OVERLOOK_B, over the Room 1 / Room 3
 *  threshold, and the crossing that gets there is the longest move in the
 *  piece: 6.45 m and 142° of turn. See the durations in cluster.ts. */
const RELOC_OVERLOOK_C = { x: 2.30, y: 2.28, z: 1.60, pitch: -13, yaw: 308 };
/** E3→E4's leg 3 control — RELOC_DESCEND_VIA mirrored in x, so the descent
 *  into Maya's seat is geometrically identical to the one into Vera's */
const RELOC_R3_DESCEND_VIA = { x: 3.70, y: 2.10, z: 1.45 };

/** the camera half of a relocation, keyed exactly as cluster.ts's RELOCATIONS
 *  (`${from}-${to}`); the space half — durations, walls, the seat — lives
 *  there so the two cannot drift. Leg 1 and leg 3 are ARCS (a `via` control
 *  point); leg 2 is a straight eased tween, because while the space is
 *  changing the camera should be the steadiest thing on screen. */
interface RelocPoses {
  rise: { x: number; y: number; z: number; pitch: number; yaw: number };
  riseVia: { x: number; y: number; z: number };
  hold: { x: number; y: number; z: number; pitch: number; yaw: number };
  descendVia: { x: number; y: number; z: number };
}
const RELOC_POSES: Record<string, RelocPoses | undefined> = {
  'e1-e2': { rise: RELOC_OVERLOOK_A, riseVia: RELOC_RISE_VIA,
    hold: RELOC_E1_HOLD, descendVia: RELOC_E1_DESCEND_VIA },
  'e2-e3': { rise: RELOC_OVERLOOK_A, riseVia: RELOC_RISE_VIA,
    hold: RELOC_OVERLOOK_B, descendVia: RELOC_DESCEND_VIA },
  'e3-e4': { rise: RELOC_OVERLOOK_R2, riseVia: RELOC_R2_RISE_VIA,
    hold: RELOC_OVERLOOK_C, descendVia: RELOC_R3_DESCEND_VIA }
};

/** the DOLLY's pull-back CONTROL point (Sérgio, Round 23): raised and slightly
 *  back from the hub, so travel between rooms bows up-and-back (you rise over
 *  the space and see the three rooms) before pushing into the next desk. Used
 *  directly as the bezier control, not as a pass-through — clean arcs now that
 *  the rooms sit on the x-axis. Module scope since S72 (see CAMERA_POSES). */
const DOLLY_CTRL = { x: 0, y: 1.98, z: 1.15 };

export interface CameraPose { x: number; y: number; z: number; pitch: number; yaw: number }

/** each room's SEAT — the desk framed at E1 intimacy (eye ~0.8 m from the
 *  screen, level), identical to the E1 view the player already trusts. Room 1
 *  faces the north desk (yaw 0); Room 2 sits at its west desk (yaw 90); Room 3
 *  at its east desk (yaw 270). All three desks read the same closeness.
 *  ⚑ Module scope since S72 so the audit tool can be handed THIS function's own
 *  output rather than a transcription of it (see CAMERA_POSES below). */
export function seatPose(yaw: number): CameraPose {
  switch (((yaw % 360) + 360) % 360) {
    case 90:  return { x: -4.4, y: EYE.y, z: 0.7, pitch: 0, yaw: 90 };  // Room 2 (west)
    /**
     * ⚑ ROOM 3 SITS THREE DEGREES DOWN — Sérgio, 2026-09-04, off the seat
     * renders. Every other seat is level because every other seat's subject is
     * a screen at eye height on a desk you are pulled up to. Room 3's is not:
     * Maya's laptop lid tops out at y≈0.98 and her desk surface carries the
     * era's whole vocabulary (the headset, the controller, the sketchbook), all
     * of it below the horizon. At pitch 0 the laptop's bottom edge fell 1.7°
     * outside the frame and 42% of the view was bare wall above her window.
     * Three degrees is the smallest correction that brings the desk whole into
     * frame; it is a FRAMING fix, and the wall behind it is a separate one
     * (S115, the dressing).
     */
    case 270: return { x: 4.4, y: EYE.y, z: 0.7, pitch: -3, yaw: 270 };  // Room 3 (east)
    case 180: return { x: EYE.x, y: EYE.y, z: 0.7, pitch: 0, yaw: 180 }; // spine (door + record) — review only
    default:  return { x: EYE.x, y: EYE.y, z: EYE.z, pitch: 0, yaw: 0 }; // Room 1 (front)
  }
}

/**
 * ⚑ THE POSE TABLES, PUBLISHED (S72 — the audit system, L3).
 *
 * `tools/harness/sweep.mjs` carried its own COPY of the seats and the five S67
 * overlooks. It was correct on the day it was written and had no way of staying
 * correct: move an overlook here and the sweep goes on photographing the old
 * one, silently, which is the precise failure mode the tool exists to catch.
 * So the tool no longer holds camera numbers at all — `tools/shots.mjs` reads
 * this object off `window.__poses` (published by the debug panel under
 * `?debug=1`, alongside `__camProbe`) and photographs whatever the build
 * actually flies. Nothing here is new geometry: every field REFERENCES the
 * constant above it. Adding a seat or an overlook means adding it here too, and
 * that is the only maintenance this arrangement asks for.
 *
 * The leg durations come from `cluster.ts`'s RELOCATIONS — the same table the
 * space half reads — so the comfort assertion divides the chord this file
 * authored by the seconds that file authored, exactly as the engine does.
 */
export const CAMERA_POSES = {
  /** the seated eye, and the camera's vertical FOV in degrees (createAppShell) */
  eye: EYE,
  fov: 42,
  /** every seat the piece can put you in, keyed by the yaw that names it */
  seats: {
    r1: seatPose(0),
    'r1-turned': seatPose(180),
    r2: seatPose(90),
    r3: seatPose(270)
  } as Record<string, CameraPose>,
  /** the S67 overlooks — leg 1's and leg 2's ends, which is what a review
   *  actually wants to look at (the room as the lift shows it to you) */
  overlooks: {
    'look-A-room1': RELOC_OVERLOOK_A,
    'look-e1hold': RELOC_E1_HOLD,
    'look-B-open': RELOC_OVERLOOK_B,
    'look-R2': RELOC_OVERLOOK_R2,
    'look-C-cross': RELOC_OVERLOOK_C
  } as Record<string, CameraPose>,
  /** THE OPENING DESCENT as a driven leg: one arc, from → via → the seat */
  descent: {
    from: DESCENT_FROM,
    via: DESCENT_VIA,
    to: { x: EYE.x, y: EYE.y, z: EYE.z, pitch: 0, yaw: 0 } as CameraPose,
    seconds: DESCENT_SECONDS,
    arc: true
  },
  /** the three relocations, each as its three driven legs with the durations
   *  cluster.ts times them at. `arc` = a bezier through `via` (smootherstep,
   *  peak 1.875 × chord / dur); `arc: false` = a straight eased tween
   *  (smoothstep, peak 1.5 × chord / dur). See the comfort block above. */
  relocations: Object.fromEntries(Object.entries(RELOC_POSES).map(([key, p]) => {
    const plan = RELOCATIONS[key];
    const from = key.slice(0, 2);
    return [key, {
      /** where that era is actually seated — the panel's own onRelocate start */
      start: seatPose(from === 'e3' ? 90 : 0),
      legs: [
        { leg: 'rise', to: p!.rise, via: p!.riseVia, seconds: plan?.riseSeconds ?? 0, arc: true },
        { leg: 'build', to: p!.hold, via: null, seconds: plan?.buildSeconds ?? 0, arc: false },
        { leg: 'descend', to: seatPose(plan?.seat ?? 0), via: p!.descendVia,
          seconds: plan?.descendSeconds ?? 0, arc: true }
      ]
    }];
  })),
  /** the DOLLY's bezier control point — the send's own arc (dollyTo) */
  dollyCtrl: DOLLY_CTRL,
  /**
   * How long a scripted send's dolly takes (app.ts's onSendResolve).
   *
   * ⚑ 2.4 → 38, SÉRGIO'S CALL 2026-08-17 (checklist D-B, `08 §17`). S82 measured
   * the s2 leg at **6.874 m/s against a 0.43 m/s comfort envelope — sixteen
   * times over** — and s2 is on E2's ORDINARY path, not a side branch, so every
   * player took it. The two options were lengthening the dolly or replacing it
   * with R28 §1's blink cut; he chose the dolly, for now. Both are legitimate:
   * the blink is the movement law's default for cross-room travel, but a send
   * is the system MOVING you and watching that happen is part of the point —
   * a cut would hide the thing the beat is about.
   *
   * ⚑ 39, not a round number and not a guess — it is the envelope, MEASURED.
   * At 38 s the audit put s2's longest leg (8.87 m) at **0.434 m/s against the
   * 0.43 m/s envelope — over by 0.9%**, with s3/s4 already clear at 0.279. He
   * chose to close that last 0.9% rather than round it away. At 39 s all three
   * legs sit inside on both the linear and the rotational axis.
   *
   * ⚑ So this constant is DERIVED FROM THE LONGEST LEG. If the send geometry
   * ever moves, re-derive it — do not nudge it. `npm run audit`'s comfort
   * table is what proves it, and it is only trustworthy because the sampling
   * window in `tools/shots.mjs` is now longer than this number. **If you raise
   * this, raise that too**, or the audit will sample a fraction of the move and
   * report a comfortable-looking pass it did not measure. That exact trap fired
   * once already, on 2026-08-17, at 38 s against a 4 s window.
   */
  dollySeconds: 39
};
// R28-1 movement prototype (docs/REINTERP_RESTRUCTURE_R28_2026-07-10.md §2):
// the blink is a CUT, never a tween: fade to black, THEN move the camera,
// THEN fade back — no smooth travel (Sérgio's explicit law: gaze must stay
// free, and a blink can never look like a dolly).
// R28-0c (item 4) fix: this used to be 0.32 — bigger than the visual disc's
// own 0.22m radius (movementNodes.ts's MARKER_DIAMETER/2) — so a click aimed
// at scenery near/above a marker's floor point (e.g. shelf items on the
// bookcase) could register as a marker hit and steal the click, teleporting
// the player instead of interacting with the prop. The hit radius now MATCHES
// the visible disc exactly: a click only arms a marker if it actually lands
// on the disc you can see.
const MARKER_HIT_RADIUS = 0.22;
const BLINK_OUT_SECONDS = 0.13;
const BLINK_IN_SECONDS = 0.22;
/** R28-2b: the three cassette shelf spots (tapeA/tapeB are new props; tapeC
 *  is the existing `mixtape` prop, repositioned in reinterp_deltas.json's r1
 *  override to sit beside them) and the boombox's own click zone — the
 *  physical geometry lives here in code (CLAUDE.md: layout in .ts, display
 *  text in data/); the state machine + captions live in data/dialog/
 *  s1_tapes.json + src/narrative/tapes.ts. */
// Session 49 (finding 2): re-sited to match the props' new home in
// data/room/reinterp_deltas.json r1 — the three tapes now sit at the cassette
// player's own base height (0.766) in the open shelf run BESIDE it, because the
// real cassettePlayer.glb is deep enough (z[0.529,0.711]) that two of them used
// to be hidden underneath it. These points ARE the click geometry: they must
// stay identical to the prop positions in that file.
// Session 55: re-sited AGAIN, x1.74→1.86 and z spacing 0.15→0.10. The boombox's
// own re-rotation (models.json's cassettePlayer `tilt`) turned it from a thin
// vertical tower into a wide landscape box (measured live AABB x[1.785,1.936]
// z[0.417,0.824]) — at the old x1.74 the tapes sat shallower than that new
// footprint, reading as "in front of" the player rather than beside it
// (Sérgio's live screenshot review). x1.86 matches the boombox's own depth;
// z0.87/0.97/1.07 starts clear of its new z-max (0.824) instead of overlapping.
// Session 56: y0.766→0.709 for every point below. The bookcaseOpen.glb shelf
// board this whole run rests on was never actually measured directly before —
// `mesh.getPositions()` transformed by the entity's world matrix, bucketed by
// Y, puts its top at 0.703, not the 0.76 every session since 32 inherited.
// Cross-checked against book1 (undisputed correct for 17+ sessions): its own
// base (1.10) matches a DIFFERENT board in the same mesh (top at 1.102)
// almost exactly, confirming the method. Every prop on this shelf had been
// floating 5.7cm above its real surface the whole time.
const TAPE_SHELF: Record<TapeId, { x: number; y: number; z: number }> = {
  tapeA: { x: 1.86, y: 0.709, z: 0.87 },
  tapeB: { x: 1.86, y: 0.709, z: 0.97 },
  tapeC: { x: 1.86, y: 0.709, z: 1.07 }
};
const TAPE_HIT_RADIUS = 0.045; // stays under half the 0.10m shelf spacing (Session 55) — no ambiguity between tapes
/** the boombox's measured AABB (Session 56, post-rotation + shelf-height fix):
 *  x[1.785,1.936] y[0.703,0.885] z[0.417,0.824]; this sits at its centre so
 *  the whole object is clickable */
/** the tennis racket on the Room-1 floor (data/room/reinterp_deltas.json r1);
 *  a generous radius because it lies flat and low, and a floor object read at
 *  a seated angle is a small target. */
const RACKET_HIT = { x: -0.65, y: 0.12, z: 2.6 };
const BOOMBOX_HIT = { x: 1.86, y: 0.793, z: 0.62 };
const BOOMBOX_HIT_RADIUS = 0.21;
/** the visual "docked" spot, just in front of the boombox's own deck plate */
const TAPE_SLOT_PROP: Record<TapeId, string> = {
  tapeA: 'tapeAInSlot', tapeB: 'tapeBInSlot', tapeC: 'tapeCInSlot'
};
const TAPE_SHELF_PROP: Record<TapeId, string> = { tapeA: 'tapeA', tapeB: 'tapeB', tapeC: 'mixtape' };
/** R28-2c: the belongings beat's click geometry (data/room/belongings.json
 *  names WHICH ids are eligible + their labels; this stays in .ts per the
 *  layout-in-code rail). The three tapes reuse TAPE_SHELF's own points
 *  exactly (mixtape = Tape C's shelf spot) rather than duplicating them;
 *  the plant/books/poster are fixed room props with no other click zone. */
const BELONGINGS_HIT: Record<string, { p: { x: number; y: number; z: number }; r: number }> = {
  mixtape: { p: TAPE_SHELF.tapeC, r: TAPE_HIT_RADIUS },
  tapeA: { p: TAPE_SHELF.tapeA, r: TAPE_HIT_RADIUS },
  tapeB: { p: TAPE_SHELF.tapeB, r: TAPE_HIT_RADIUS },
  plantModel: { p: { x: -1.75, y: 0.15, z: -0.35 }, r: 0.18 },
  book1: { p: { x: 1.98, y: 1.21, z: 0.55 }, r: 0.12 },
  book2: { p: { x: 1.98, y: 1.2, z: 0.65 }, r: 0.12 },
  poster1: { p: { x: 0.95, y: 1.62, z: -0.695 }, r: 0.22 },
  // D33 (Session 34): two small new shelf props, added to the eligible set —
  // positions match their era1.json prop entries exactly.
  // ⚑ S86: both of these were stale against reinterp_deltas.json's r1 — teddyBox
  // by 5 cm (Session 56's shelf correction never reached this table) and
  // rainbowDuck by 12 cm in z, so its 0.12 m radius was centred on empty shelf.
  // They are now the props' actual r1 points, and BOTH props moved this session
  // because neither could be SEEN from the seat (see their _doc entries).
  teddyBox: { p: { x: 1.98, y: 1.16, z: 0.85 }, r: 0.14 },
  rainbowDuck: { p: { x: 1.98, y: 1.712, z: 0.5 }, r: 0.12 }
};

interface AppOptions {
  reinterp?: boolean;
  /** ?facet= debug override for the fluid trans niche (reinterp only) */
  facet?: FacetState;
  /** ?era=2|3|4 — jump cluster + rig to an era's open state (review tool) */
  era?: EraKey;
  /** ?morph=2|3|4 — play the E1→EN morph live, 4s after load (review tool) */
  morphDemo?: EraKey;
  /** ?close=1 — the point-cloud Close, room dark (review tool) */
  close?: boolean;
  /** ?reveal=1 — the O7 first-filing reveal state (review tool) */
  reveal?: boolean;
  /** ?nobatch=1 — disable static batching (A/B perf comparison, review tool) */
  nobatch?: boolean;
}

/**
 * The application shell is prepared while the orienting card is still up on
 * XR-capable devices. WebXR requires requestSession() to happen in the same
 * user-gesture stack as ENTER VR, while the room's model preload is async.
 * Preparing only the PlayCanvas device + camera here lets startApp() make that
 * request synchronously, before its first await, without starting or revealing
 * any of the fiction behind the content note.
 *
 * The authored camera pose lives on a parent rig. In desktop mode the child is
 * identity, so this is exactly the old camera transform. In XR, PlayCanvas owns
 * the child's tracked head pose while the existing entrance/relocation/TURN
 * choreography continues to move the rig.
 */
interface AppShell {
  canvasEl: HTMLCanvasElement;
  app: pc.Application;
  cameraRig: pc.Entity;
  camera: pc.Entity;
}

let preparedXrShell: AppShell | null = null;
let preparedXrReady: Promise<boolean> | null = null;
let immersiveVrRequested = false;

function createAppShell(canvasEl: HTMLCanvasElement): AppShell {
  const app = new pc.Application(canvasEl, {
    graphicsDeviceOptions: { antialias: false, alpha: false }
  });
  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  window.addEventListener('resize', () => app.resizeCanvas());

  const cameraRig = new pc.Entity('camera-rig');
  cameraRig.setLocalPosition(EYE.x, EYE.y, EYE.z);
  app.root.addChild(cameraRig);

  const camera = new pc.Entity('camera');
  camera.addComponent('camera', {
    clearColor: new pc.Color(0.05, 0.04, 0.03),
    fov: 42,
    nearClip: 0.05
  });
  cameraRig.addChild(camera);

  return { canvasEl, app, cameraRig, camera };
}

/**
 * Called only after navigator.xr has directly confirmed immersive-vr support.
 * Wait for PlayCanvas's own async availability probe too; its start() rejects
 * an otherwise valid user gesture until this internal flag has become true.
 */
export function prepareImmersiveVrEntry(canvasEl: HTMLCanvasElement): Promise<boolean> {
  if (preparedXrShell?.canvasEl === canvasEl && preparedXrReady) return preparedXrReady;
  if (preparedXrShell) return Promise.resolve(false);

  const shell = createAppShell(canvasEl);
  preparedXrShell = shell;
  const xr = shell.app.xr;
  if (!xr) {
    preparedXrReady = Promise.resolve(false);
    return preparedXrReady;
  }
  if (xr.isAvailable(pc.XRTYPE_VR)) {
    preparedXrReady = Promise.resolve(true);
    return preparedXrReady;
  }

  preparedXrReady = new Promise<boolean>((resolve) => {
    const event = `available:${pc.XRTYPE_VR}`;
    const finish = (available: boolean): void => {
      if (!available) return;
      xr.off(event, finish);
      xr.off('error', fail);
      resolve(true);
    };
    const fail = (): void => {
      xr.off(event, finish);
      xr.off('error', fail);
      resolve(false);
    };
    xr.on(event, finish);
    xr.on('error', fail);
  });
  return preparedXrReady;
}

/** Mark the next synchronous startApp() call as the ENTER VR path. */
export function requestImmersiveVrEntry(): void {
  immersiveVrRequested = true;
}

export async function startApp(canvasEl: HTMLCanvasElement, options: AppOptions = {}): Promise<pc.Application> {
  const shell = preparedXrShell?.canvasEl === canvasEl
    ? preparedXrShell
    : createAppShell(canvasEl);
  preparedXrShell = null;
  preparedXrReady = null;
  const startInVr = immersiveVrRequested;
  immersiveVrRequested = false;
  const { app, cameraRig, camera } = shell;
  const xr = app.xr;

  /** PlayCanvas leaves its last tracked local pose on the camera when a
   * session ends. Restore the identity child so the authored rig is once again
   * the complete desktop pose, then restore the ordinary canvas resolution. */
  const restoreDesktopCamera = (): void => {
    camera.setLocalPosition(0, 0, 0);
    camera.setLocalEulerAngles(0, 0, 0);
    app.resizeCanvas();
  };
  xr?.on('end', restoreDesktopCamera);

  // This must remain before the first await in this async function: WebXR
  // accepts requestSession only inside ENTER VR's original click stack.
  if (startInVr && xr && camera.camera) {
    xr.start(camera.camera, pc.XRTYPE_VR, pc.XRSPACE_LOCAL, {
      callback: (error) => {
        if (!error) return;
        restoreDesktopCamera();
        console.warn('Unable to enter immersive VR; continuing on desktop.', error);
      }
    });
  }

  app.scene.ambientLight = new pc.Color(0.16, 0.15, 0.15);
  // reinterp E1 style pass (§2-E1): warm the ambient a touch so the floor/shell
  // read cozy under the lamp's dominance — baseline ambient is untouched.
  if (options.reinterp === true) app.scene.ambientLight = new pc.Color(0.17, 0.14, 0.11);

  if (new URLSearchParams(window.location.search).get('debug') === '1') {
    (window as { __app?: pc.Application }).__app = app; // ?debug=1 scene-graph probe
    // ?debug=1 ledger probe (read-only review aid): prior sessions could only
    // verify filings via the witness surface as a proxy — this closes that gap.
    // Debug-gated; the in-memory-only invariant is about persistence, and this
    // neither persists nor transmits anything.
    (window as { __ledger?: () => unknown }).__ledger = () => JSON.parse(JSON.stringify(ledger));
  }
  // asset pipeline: preload real low-poly models BEFORE building the room, so
  // props with a `model` key spawn meshes. Only for reinterp — the shipped
  // baseline uses boxes, so loading models there is wasted work (and avoids the
  // vite dev-server public-file race on the pages that don't need them).
  if (options.reinterp === true) await preloadModels(app);

  const room = buildEra1Room(app, options.reinterp === true);

  // ── the fluid trans niche + the cluster shell (reinterp only) ──
  // The niche is one lateral-arc alcove of facet-states (?facet= forces one
  // for review). Around it, the CLUSTER SHELL: the mirrored west alcove, the
  // aperture scrims (sealed → dim → open), the per-era light rigs, and the
  // dormant ceiling-witness shell — plus the point-cloud Close, built once.
  // ?layout=x — the disposition of the 360° space (Sérgio, Round 24). T (default)
  // keeps the back as a WALL (door + record spine). X opens that back into a 4th
  // ARM toward the ending. Same three room interiors; only the back changes.
  const layout: 'x' | 't' = new URLSearchParams(window.location.search).get('layout') === 'x' ? 'x' : 't';
  let niche: FluidNiche | null = null;
  let ceiling: CeilingWitness | null = null;
  let cluster: ClusterShell | null = null;
  let cloud: PointCloud | null = null;
  let sendRt: SendRuntime | null = null;
  let movementNodes: MovementNodes | null = null;
  // R28-2b: the tape system's pure logic (src/narrative/tapes.ts, mirrors
  // guide.ts's split) + its audio bus (src/audio/tapeAudio.ts). Both are
  // Era-1-only in effect (the boombox itself leaves the room at E2), but the
  // objects live for the app's lifetime — driveMorph() resets them on every
  // era shift rather than tearing them down.
  let tapes: TapeSystem | null = null;
  let tapeAudio: TapeAudioBus | null = null;
  let era3Devices: Era3Devices | null = null;
  if (options.reinterp === true) {
    niche = buildFluidNiche(app);
    niche.setFacet(options.facet ?? 'none');
    ceiling = buildCeilingWitness(app);
    cluster = buildClusterShell(app, room, niche, ceiling, layout, options.nobatch !== true);
    // ⚑ S108: see ClusterShell.setNeverBatch — handed over below, once
    //   EMPHASIS_PROPS is in scope (`applyNeverBatch()`).

    cloud = buildPointCloud(app);
    // the SEND seam (master script §4). HISTORICAL WRONG CLAIM: "no beat fires
    // it". S82 corrected that by inspection: the spine offers s1/s2 on E2's
    // ordinary path; s3/s4 remain inaccessible on Daniel's black E3 CRT. The
    // debug panel also carries review buttons for the filing/carry-back path.
    sendRt = createSendRuntime(room, niche);
    // R28-1: the movement node graph (floor markers at the existing camera
    // seats). Geometry/gating only — the camera cut lives in requestMove().
    movementNodes = buildMovementNodes(app);
    tapes = new TapeSystem();
    tapeAudio = new TapeAudioBus();
    // Session 37 (E3-i): THE THREE-SCREEN ROOM foundation — Room 2's workstation/
    // tablet/phone screens. Era-gated (setEra() below, alongside the room's
    // own era toggles); the movement nodes above (r2-tablet/r2-phone,
    // data/room/nodes.json) share this module's DEVICE_SEAT_POSES as their
    // authored source.
    era3Devices = buildEra3Devices(app);
  }
  // (the in-room cork board that used to be built here is RETIRED — decision
  // doc §1, Sérgio: "I would've liked the cork board to actually work, but
  // there've been so many issues with the design of it that I don't think
  // it's worth it." The wall keeps one surface, the record's own plane.)

  // ── the two surfaces ──
  const os = new DesktopOS({ reinterp: options.reinterp === true });
  // R28-4: hand the game menu's Leave button the real leave flow once it
  // exists — before this (e.g. during the pre-fiction orienting card),
  // gameMenuBus.leaveEngine is null and the menu falls back to a reload
  // (src/desktop/gameMenu.ts).
  if (options.reinterp === true) gameMenuBus.leaveEngine = () => os.leaveNow();
  if (new URLSearchParams(window.location.search).get('debug') === '1') {
    // ?debug=1 OS probe (review aid, like __ledger): drive monitor clicks in
    // logical canvas coords without the world→screen projection dance
    (window as { __os?: DesktopOS }).__os = os;
    // ?debug=1 guide probe (R28-2a, read-only): the active side-message + the
    // retired set, so reviews can watch the thread without screenshot-chasing.
    (window as { __guide?: () => unknown }).__guide = () =>
      os.guide ? os.guide.snapshot() : null;
    // R28-2b tape probe (read-only, like __guide/__ledger)
    (window as { __tapes?: () => unknown }).__tapes = () =>
      tapes ? tapes.snapshot() : null;
    // Session 37 (E3-i) device-screen probe (read-only, like __os/__tapes):
    // the raw offscreen canvases, for pixel-probing shell content/lamb-marks
    (window as { __era3Devices?: () => unknown }).__era3Devices = () =>
      era3Devices ? era3Devices.debugCanvases() : null;
    // Session 38 (E3-ii) GraceQueue probe (review aid, like __os): the live
    // instance, so a review can drive its handleClick(x,y) in logical
    // workstation-canvas coordinates directly, without the world→screen
    // projection dance — mirrors __os's own established convention exactly.
    (window as { __graceQueue?: () => unknown }).__graceQueue = () =>
      era3Devices ? era3Devices.debugQueue() : null;
    // S61 FREE-CAMERA probe (?debug=1 only, write-only review aid — the
    // companion to __camProbe, which can only land on the three SEAT poses).
    // Room 2's seat sits 0.57 m from the workstation, so every prop-dressing review
    // in that room was being done through a screen that fills the frame, or by
    // dragging the view a few degrees at a time. This puts the camera anywhere
    // (and reads it back), which is how S61 surveyed Room 2's dressing and how
    // the relocation arc's own poses were checked frame by frame. It never
    // runs in play: `debugOn` is `?debug=1`.
    (window as { __camFree?: (x: number, y: number, z: number, pitch: number, yaw: number) => unknown }).__camFree =
      (x, y, z, pitch, yaw) => {
        camPos.set(x, y, z);
        camPitch = pitch;
        camYaw = yaw;
        camMove = null;
        return { pos: [camPos.x, camPos.y, camPos.z], pitch: camPitch, yaw: camYaw };
      };
    /**
     * ⚑ S72 THE COMFORT PROBE (`?debug=1`, read-only — the companion to
     * `__camFree`, which writes). The comfort law (0.43 m/s, 9.1 °/s) is the
     * only law in this piece that can hurt a person, and until now it was a
     * number a session happened to measure by hand: E3→E4 shipped at 3.667 m/s,
     * 8.5× the envelope, under a comment describing a rise the code never
     * performed, and nothing noticed for weeks.
     *
     * `tools/shots.mjs --comfort` samples this every frame through every driven
     * leg and differentiates it. `seq` is what makes that honest: it changes at
     * every leg boundary and at every CUT, so a pair of samples that do not
     * share a seq is discarded rather than reported as an infinite velocity.
     * `driven` distinguishes a curve in flight from the player simply sitting.
     */
    (window as { __camPose?: () => unknown }).__camPose = () => ({
      x: camPos.x, y: camPos.y, z: camPos.z, pitch: camPitch, yaw: camYaw,
      driven: !!camMove, seq: camMoveSeq,
      conducted: camMove?.conducted ?? false,
      arc: camMove?.arc ?? false,
      dur: camMove?.dur ?? 0,
      // ⚑ the MOVE's own clock, and it is the one the comfort check must
      // differentiate against. Wall-clock frame deltas measure the renderer:
      // headless swiftshader stutters, and dividing a normal step by a 100 ms
      // frame reported 2.8 m/s on a leg the curve runs at 0.44. `t` advances by
      // the app's own dt, so d(position)/d(t) is the velocity the curve
      // PRESCRIBES — what a player at a steady frame rate actually receives.
      t: camMove?.t ?? 0,
      leg: relocLeg, reloc: relocKey, descent: descentActive,
      // ⚑ S85: the player's own look, reported SEPARATELY and deliberately so.
      // pitch/yaw above stay the curve's PRESCRIBED pose, which is the thing
      // the comfort law is about — folding a hand-drag into them would make
      // the audit report the player's wrist as leg velocity.
      lookYaw: lookOffYaw, lookPitch: lookOffPitch
    });
    // THE WAKE probe (read-only, like __guide; replaces S40's __preBoot):
    // the wake has no desktop-canvas surface to eyeball (the monitor is dark
    // until it ends), so this closes the same review gap __ledger did —
    // `k` is the light ramp, 0 = as-you-found-it, 1 = lit.
    (window as { __wake?: () => unknown }).__wake = () =>
      ({ active: wakeActive, t: wakeT, k: wakeLightK(wakeT) });
  }

  // ── the NARRATIVE SPINE (reinterp; real playthroughs only, not review
  // params): the script's beat conductor — era updates on documented
  // failures, send summonses, the bare final restart → the Close. The OS
  // performs; the engine moves the space; the spine decides when. ──
  let spine: Spine | null = null;
  if (options.reinterp === true) {
    // S58: review params (?era=/?close=/?reveal=/?morphDemo=) used to skip
    // spine creation entirely via a `reviewMode` gate — the conductor stayed
    // null for the WHOLE session (nothing later re-creates it), so no send
    // ever armed and no update ever fired, and nothing on screen said why
    // (docs/REINTERP_PLAYTHROUGH_E2_2026-07-26.md ROOT CAUSE #1). The spine
    // is cheap and side-effect-free to seed — onEra() only sets a step and
    // resets a timer — so it is created unconditionally here, and the `?era=`
    // branch below seeds it to match the requested era. A review session now
    // drives the same conductor a linear playthrough does, instead of
    // silently lacking one.
    spine = createSpine(os, { onClose: () => enterClose() });
    os.onEraShift = (era) => {
      // ⚑ the spine's onClose still owns the constellation — it is TOLD now
      //   (S101), rather than left to notice on its own clock 22 s later that a
      //   ritual it did not arm has finished. See `Spine.onEra`.
      if (era === 'close') { spine?.onEra('close'); return; }
      /**
       * ⚑ S109 — the destination's bed is REMEMBERED here and arrives when the
       * flight lands (`endRelocation`), not now.
       *
       * The era's restart completes MID-FLIGHT — S86 moved the ascent to the
       * "I Agree" press deliberately, so the update and the aging are one
       * movement — which means this fires while the camera is still travelling.
       * Setting the bed here made the destination's room arrive before the
       * player did, and (measured) left the building's drone as the thing still
       * playing once they got there: both halves backwards. The passage plays
       * the building; the room arrives with the room.
       */
      pendingBed = BED_FOR[era] ?? null;
      if (!relocPlan) { roomBed.set(pendingBed, 3.0); pendingBed = undefined; }
      driveMorph(era as EraKey);
      spine?.onEra(era);
    };
    // ⚑ S86: I Agree / Install pressed — the ascent starts here, not at the
    // restart. `close` has no room to age into; it takes the constellation.
    os.onEraRelocate = (era) => {
      if (era === 'close') return;
      beginEraRelocation(era);
    };
    os.onSendResolve = (id, outcome) => {
      sendRt?.fire(id, outcome);
      if (outcome === 'visited') {
        const yaw = sendRt?.targetYaw(id);
        // the summons resolves as a TURN — the dolly carries you to the
        // named room (takeable: not conducted; the player keeps the camera)
        // ⚑ 2026-08-17: this literal was 2.4 and CAMERA_POSES.dollySeconds — the
        // constant whose own comment says "how long a scripted send's dolly
        // takes (app.ts's onSendResolve)" — was DEAD CONFIG, appearing exactly
        // once in all of src/: its own definition. Sérgio's D-B decision was
        // applied to that constant first and changed nothing a player would
        // feel, which is the whole reason this line now READS it. A tuning knob
        // wired to nothing is worse than no knob: it invites a fix that lands
        // nowhere and reports success.
        if (yaw !== null && yaw !== undefined) dollyTo(yaw, CAMERA_POSES.dollySeconds, false);
      }
    };
    if (new URLSearchParams(window.location.search).get('debug') === '1') {
      // S58 spine probe (read-only, like __os/__wake): the conductor's own
      // step, so a review can confirm the era buttons and `?era=` jumps
      // actually advance the narrative and not just the room/desktop era.
      (window as { __spine?: () => unknown }).__spine = () =>
        spine ? { step: spine.step } : null;
    }
  }
  const witness = new WitnessCanvas();
  if (options.reinterp === true) {
    // The rear wall is ONE surface for the whole of Era 1 (its opening-board
    // footprint and the witness terminal's are the same rectangle — see
    // data/room/cluster.json's witnessTerminal note), so nothing has to be
    // re-placed per stage any more now the cork frame is gone: the plane sits
    // where restoreWitnessSurface() puts it and simply changes what it shows
    // (dormant through O3 → hardening on the first filing → the cold record).
    os.onOpeningProfileChange = (profile) => {
      witness.setOpeningProfile(profile);
      setTerminalFrameVisible(false);
    };
    witness.setOpeningProfile(os.openingProfileSnapshot());
  }

  const frontTex = makeScreenTexture(app, os.canvas);
  const front = makeScreenEntity('desktop-screen', frontTex, SCREEN.w, SCREEN.h);
  front.setLocalPosition(SCREEN.x, SCREEN.y, SCREEN.z);
  front.setLocalEulerAngles(90, 0, 0); // faces +Z (the chair)
  app.root.addChild(front);

  const backTex = makeScreenTexture(app, witness.canvas);
  const back = makeScreenEntity('witness-screen', backTex, WITNESS.w, WITNESS.h, options.reinterp === true);
  back.setLocalPosition(WITNESS.x, WITNESS.y, WITNESS.z);
  back.setLocalEulerAngles(90, 180, 0); // faces -Z (the chair, once turned)
  app.root.addChild(back);
  const terminalFrame = room.props.get('terminalFrame')?.entity;
  const setTerminalFrameVisible = (visible: boolean): void => {
    if (terminalFrame) terminalFrame.enabled = visible;
  };
  const restoreWitnessSurface = (): void => {
    if (options.reinterp !== true) return;
    const wt = clusterData.witnessTerminal;
    back.setLocalPosition(wt.pos[0], wt.pos[1], wt.pos[2]);
    back.setLocalScale(wt.w, 1, wt.h);
  };
  if (options.reinterp === true) {
    // R26 B4: the legible record stays on the wall TERMINAL on the south
    // spine. The overhead ceiling witness remains dormant; witness role and
    // lineage live on this one wall surface — which, since the cork board's
    // retirement (decision doc §1/§5), begins DORMANT rather than warm: the
    // lineage's warm first note is now the lit room + "complete your profile,
    // Daniel" (Sérgio confirmed 2026-07-24), and this plane's job is the cold
    // half of the arc — it wakes by hardening, on the first filing.
    restoreWitnessSurface();
  }

  // vignette: definition falls off toward the edges (taste call: no particles)
  const vignette = document.createElement('div');
  Object.assign(vignette.style, {
    position: 'fixed', inset: '0', zIndex: '5', pointerEvents: 'none',
    background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 52%, rgba(26,16,8,0.55) 100%)'
  } as CSSStyleDeclaration);
  document.body.appendChild(vignette);

  // the cold creep: when the system has filed something unseen, the witness
  // side bleeds into peripheral vision — a reason to turn around (Sérgio)
  // NOTE: no CSS transition here — opacity is driven every frame (a transition
  // would fight the per-frame pulse and the layer would never reach its target)
  const coldCreep = document.createElement('div');
  Object.assign(coldCreep.style, {
    position: 'fixed', inset: '0', zIndex: '6', pointerEvents: 'none', opacity: '0',
    background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 38%, rgba(70,110,160,0.0) 56%, rgba(80,130,190,0.82) 100%)'
  } as CSSStyleDeclaration);
  document.body.appendChild(coldCreep);
  let coldPhase = 0;

  // DIARY.TXT breakout: a soft, warm full-frame wash when the system fails to
  // delete the person's words. No strobe; it decays over the diary hold, then
  // the spine arms the update ritual.
  const glitch = document.createElement('div');
  Object.assign(glitch.style, {
    position: 'fixed', inset: '0', zIndex: '7', pointerEvents: 'none', opacity: '0',
    background: 'radial-gradient(ellipse at center, rgba(255,220,140,0.18) 0%, rgba(180,80,60,0.24) 58%, rgba(70,120,180,0.35) 100%)'
  } as CSSStyleDeclaration);
  document.body.appendChild(glitch);
  let glitchT = 0;
  let glitchDur = 0;
  os.onGlitch = (kind) => {
    glitch.style.background = kind === 'person'
      ? 'radial-gradient(ellipse at center, rgba(255,220,140,0.18) 0%, rgba(180,80,60,0.24) 58%, rgba(70,120,180,0.35) 100%)'
      : 'radial-gradient(ellipse at center, rgba(130,180,255,0.18) 0%, rgba(60,90,150,0.34) 68%, rgba(0,0,0,0.48) 100%)';
    glitchDur = kind === 'person' ? 2.8 : 2.0;
    glitchT = glitchDur;
  };

  // R28-1 movement prototype (reinterp only — baseline/`?flat=1` must stay
  // byte-identical, so neither element is even CREATED outside the flag):
  // the blink-cut overlay (opaque black, above the glitch wash), driven
  // manually every frame like the other overlays here (no CSS transition, so
  // it can never race the per-frame camera cut it straddles); and the
  // one-time, dismissable, non-diegetic movement hint (frame voice, plain —
  // "the frame never plays" still holds: this is chrome, not the fiction).
  let blinkOverlay: HTMLDivElement | null = null;
  let moveHint: HTMLDivElement | null = null;
  let tapeCaption: HTMLDivElement | null = null;
  let tapeMuteBtn: HTMLButtonElement | null = null;
  /** ⚑ S80 — look-mode 3's entry: see THE GYRO block further down. Created
   *  here with the rest of the frame chrome so the styling stays in one place
   *  (and so the non-reinterp baseline never even builds the element). */
  let motionBtn: HTMLButtonElement | null = null;
  function dismissMoveHint(): void {
    if (moveHintDismissed || !moveHint) return;
    moveHintDismissed = true;
    moveHint.style.opacity = '0';
    moveHint.style.pointerEvents = 'none';
  }
  if (options.reinterp === true) {
    blinkOverlay = document.createElement('div');
    Object.assign(blinkOverlay.style, {
      position: 'fixed', inset: '0', zIndex: '8', pointerEvents: 'none', opacity: '0',
      background: '#000'
    } as CSSStyleDeclaration);
    document.body.appendChild(blinkOverlay);

    // moveHint's own chrome, kept as one shared literal (spec-law C4 palette
    // ratchet) — the tape caption below reuses the pattern, not the object.
    const HINT_CHROME = {
      position: 'fixed', left: '50%', bottom: '9%', transform: 'translateX(-50%)',
      zIndex: '9', background: 'rgba(10,10,14,0.78)', color: '#cdd3df',
      font: '12px monospace', padding: '6px 12px', borderRadius: '4px',
      opacity: '0', pointerEvents: 'none', transition: 'opacity 0.4s'
    };

    moveHint = document.createElement('div');
    moveHint.textContent = (reinterpStrings as { movementHint?: string }).movementHint ?? 'Click a marker to move.';
    Object.assign(moveHint.style, { ...HINT_CHROME, cursor: 'pointer' } as CSSStyleDeclaration);
    document.body.appendChild(moveHint);
    moveHint.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      dismissMoveHint();
    });

    // (S40's `preBootHint` caption is gone with the LOOK/INTERACT window —
    // the interim panel's controls display teaches both verbs now, for both
    // platforms, before anything starts. Session 44's log has the reasoning.)
    // R28-2a: the old floppyHint DOM one-off (R28-0c item 10) is gone — Era-1
    // guidance now lives in the DIEGETIC side-message thread (the OS taskbar
    // status well, data/dialog/s1_guide.json). moveHint was the first piece
    // of non-diegetic frame chrome; R28-2b adds two more, same law (the frame
    // never PLAYS — this is captioning/accessibility chrome around a diegetic
    // object, not a system voice): the tape system's HARD RAIL forbids new
    // desktop-canvas UI this session, so segment captions (subtitle-style,
    // for the tapes playing in the room) and a small global mute toggle live
    // here as fixed DOM, exactly like moveHint, never on the monitor texture.
    // ⚑ S86 — THE BOTTOM-CENTRE STRIP IS RESERVED. This element owns it, and
    // nothing else in the build may be positioned into it (see motionBtn
    // below, which was and is no longer). zIndex 11 puts it over any chrome
    // that ends up near it anyway: when two surfaces collide the caption is the
    // one that must remain readable.
    tapeCaption = document.createElement('div');
    Object.assign(tapeCaption.style, {
      position: 'fixed', left: '50%', bottom: '4%', transform: 'translateX(-50%)',
      zIndex: '11', background: 'rgba(10,10,14,0.78)', color: '#e8dcc0',
      font: 'italic 12px monospace', padding: '5px 12px', borderRadius: '4px',
      maxWidth: '70%', textAlign: 'center',
      opacity: '0', pointerEvents: 'none', transition: 'opacity 0.3s'
    } as CSSStyleDeclaration);
    document.body.appendChild(tapeCaption);

    tapeMuteBtn = document.createElement('button');
    tapeMuteBtn.textContent = 'mute';
    Object.assign(tapeMuteBtn.style, {
      position: 'fixed', right: '3%', top: '3%', zIndex: '9',
      background: 'rgba(10,10,14,0.78)', color: '#cdd3df', border: '1px solid #444',
      font: '11px monospace', padding: '4px 10px', borderRadius: '4px',
      opacity: '0', pointerEvents: 'none', transition: 'opacity 0.3s', cursor: 'pointer'
    } as CSSStyleDeclaration);
    document.body.appendChild(tapeMuteBtn);
    tapeMuteBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (!tapeAudio || !tapeMuteBtn) return;
      tapeAudio.setMuted(!tapeAudio.isMuted);
      roomBed.setMuted(tapeAudio.isMuted);   // ⚑ S109 — one mute, every source
      setOneShotsMuted(tapeAudio.isMuted);   // ⚑ S116 — …and it now actually is
      tapeMuteBtn.textContent = tapeAudio.isMuted ? 'unmute' : 'mute';
    });

    // ⚑ S80 — THE MOTION BUTTON. Frame chrome, exactly like the three above:
    // plain, undecorated, never on the monitor texture, never in the fiction's
    // voice. It has to be a DELIBERATE OBJECT rather than a technicality
    // because `DeviceOrientationEvent.requestPermission()` cannot be called on
    // page load at all — iOS requires a real user gesture, so the gesture has
    // to be something a person chooses to make. Reuses HINT_CHROME so no new
    // colour enters the build (check-spec C4's palette ratchet).
    // ⚑ S86 — AND IT DOES NOT LIVE IN THE BOTTOM-CENTRE STRIP ANY MORE.
    // Sérgio's iPad screenshot: *"Welcome. You are not alone tonight."* — Tape
    // A's first caption — printed BEHIND this button. Two systems owned the
    // same strip and neither knew about the other: `tapeCaption` sits at
    // bottom 4 %, this sat at bottom 3 %, both centred on left 50 %.
    //
    // ⚑ THE STRIP IS THE CAPTION'S AND NOTHING ELSE MAY BE PUT THERE. It is
    // the accessibility surface — the only way the tapes' and the ball's words
    // reach a player who cannot hear them (S79 recorded captions as
    // load-bearing for the ball) — so the chrome moves and the caption does
    // not. This button joins the frame-chrome column in the bottom-LEFT, above
    // the pause button (gameMenu's own corner, 14 px in, 34 px tall), which is
    // also where a thumb already expects frame controls on a phone.
    // `translateX` is dropped with the centring, or the button would sit half
    // off the left edge — and `paintMotionBtn` no longer puts it back.
    //
    // ⚑ AND THE HEIGHT IS `calc(4% + 72px)`, NOT A FIXED 60 px, BECAUSE A
    // LEFT-HAND COLUMN IS NOT BY ITSELF OUT OF THE WAY. Measured live at
    // Sérgio's own viewport ROTATED (806×1408 portrait), the button at 60 px
    // and the longest real tape caption — s1_tapes.json's *"Fold my hands the
    // way you showed me, keep my eyes upon the floor;"*, which wraps to two
    // lines there — cleared each other by TEN PIXELS. A ten-pixel miss is the
    // same bug waiting for a longer line, and the caption is the surface that
    // may never be gambled with. The offset tracks the caption's own `bottom:
    // 4%` and then clears the wrapped strip above it, so the two cannot share a
    // band at either orientation. Measured live with that same longest caption:
    // 34 px of vertical air at 806×1408 portrait (where it wraps to two lines)
    // and 48 px at 1408×806 landscape (where it does not).
    /**
     * ⚑ S117 — AND IT DOES NOT LIVE IN THE BOTTOM-LEFT EITHER. This is S86's
     * fault, one corner over, and it cost the piece its ending.
     *
     * Era 4's ONE TOUCH is the headset, deliberately placed ~24° off the seat
     * bearing so it is inside the frame — which puts it in the bottom-left of
     * the view. This button was 14 px in from the left, 28 px tall, at
     * `bottom: calc(4% + 72px)`: at 1280 × 860 that is [14, 726]–[192, 754].
     * The visor's own plane projected to (138, 811) — **57 px below the
     * button's lower edge.** Sérgio's ruling that Room 3's seat sits at pitch
     * −3 moved that projection to (146, 747), i.e. INSIDE the button, and
     * `document.elementFromPoint` then returns the BUTTON: the DOM eats the
     * press, the canvas never sees it, `wear()` never runs, L never speaks and
     * the walk stops in Era 4 with 197 presses and no ending.
     *
     * ⚑ The 3° did not cause this — it revealed it. Two systems owned the same
     * corner and neither knew about the other, and they cleared each other by
     * 57 px, which is the same ten-pixel miss S86's own comment above warns
     * about, waiting for a different reason.
     *
     * THE TOP BAND IS THE ONE STRIP NO ERA PUTS ANYTHING INTERACTIVE IN: every
     * era's surfaces sit on a desk, at or below eye level (E1/E2's monitor
     * centres near y 480, E3's workstation likewise, E4's laptop at y 780 and
     * its headset at y 750; L's chips, worn, run y 530–710). So the button
     * joins the MUTE button's line instead of the pause button's column — same
     * 3 % inset, one row down so it clears the review build's era pill — and
     * the caption strip it was moved here to protect in the first place is
     * untouched, because it is nowhere near it any more.
     *
     * ⚑ `tools/walk.mjs` now refuses to press any control whose projected point
     * is covered by frame chrome, and names the element in its report. A
     * measurement, not a memory: the next time something is put in a corner the
     * era already owns, the walk says so instead of quietly not finishing.
     */
    motionBtn = document.createElement('button');
    Object.assign(motionBtn.style, {
      ...HINT_CHROME, left: '3%', top: 'calc(3% + 30px)', bottom: 'auto', transform: 'none',
      border: '1px solid #444', cursor: 'pointer', display: 'none'
    } as CSSStyleDeclaration);
    motionBtn.style.opacity = '1';
    motionBtn.style.pointerEvents = 'auto';
    document.body.appendChild(motionBtn);
  }

  // S1.0 hint: shown while the machine waits dark
  const offHint = document.createElement('div');
  offHint.textContent = strings.off.hint;
  Object.assign(offHint.style, {
    position: 'fixed', left: '0', right: '0', bottom: '16%', zIndex: '6',
    textAlign: 'center', color: '#d8cdb4', font: '13px monospace',
    pointerEvents: 'none', opacity: '0', transition: 'opacity 1.2s'
  } as CSSStyleDeclaration);
  document.body.appendChild(offHint);
  let offShown = false;

  // ── camera state: one free yaw; the flip is a tween on it ──
  let camYaw = 0;
  let camPitch = 0;
  /**
   * ⚑ S85 — THE LOOK DURING A DRIVEN MOVE, and why it is an OFFSET.
   *
   * S85a measured it: a drag while the entrance arc flies moved the view one
   * frame and snapped back — yaw 42.44° → 26.44°, and the next tick put it at
   * 42.40°. Not inert: a 16° jerk that returns, which is worse. The cause is
   * that a curve WRITES `camPitch`/`camYaw` every frame from its own
   * interpolation, so anything `pointermove` puts there is overwritten before
   * it is ever drawn.
   *
   * So the drag stops writing those two while a curve owns them, and layers on
   * top instead — exactly how the gyro already composes (`applyMotionLook()`
   * poses the CHILD camera after the rig is posed, which is why turning a
   * tablet DOES look during the descent and dragging did not). The curve's own
   * path is untouched: it still starts where it started and arrives where it
   * arrived, and the offset rides it.
   *
   * The offset is never allowed to survive a landing. `endDescent()`,
   * `seatCut()` and `performSeatCut()` all commit an AUTHORED pose, and a
   * leftover offset would tilt the seat the room was composed for; each clears
   * it. When a leg simply ends with nothing taking over, the offset is folded
   * into `camYaw`/`camPitch` instead — the look the player did during the move
   * is the look they keep.
   */
  let lookOffYaw = 0;
  let lookOffPitch = 0;
  /** an authored pose is being committed: the drag that rode the leg ends here */
  function clearLookOffset(): void { lookOffYaw = 0; lookOffPitch = 0; }
  /** the leg ended free: fold the ride into the free camera and carry on */
  function commitLookOffset(): void {
    if (lookOffYaw === 0 && lookOffPitch === 0) return;
    camYaw += lookOffYaw;
    camPitch = Math.max(-DRAG_PITCH_MAX, Math.min(DRAG_PITCH_MAX, camPitch + lookOffPitch));
    clearLookOffset();
  }
  let tween: number | null = null; // yaw target while the ⟲ swing runs
  let facingBack = false;
  /**
   * ⚑ S70 — WHICH DEVICE IS IN HER HANDS (null = none). Set by the seat cut
   * below, and read by `isBackYaw()`.
   *
   * THE BUG THIS CLOSES, found by building a clickable surface on the tablet
   * and discovering it could not be clicked: the witness hemisphere is defined
   * by a GLOBAL camera yaw (`n > 90 && n < 270`), which assumes the player is
   * in Room 1's seat looking at Room 1's monitor. Room 2's TABLET seat authors
   * a camera yaw of 180 (`data/room/nodes.json`, `r2-tablet`) because the
   * tablet lies on the far side of the bed and she has to look that way to read
   * it — so simply SITTING DOWN WITH THE TABLET counted as turning to the
   * record: `os.markWitnessSeen()` fired, the cold-creep stopped, and — the
   * part that actually bites — `pointerdown`'s whole prop/screen block is
   * guarded by `if (!facingBack)`, so every press on that screen was discarded
   * before it reached `era3Devices.handleWorkstationPointer`. Harmless while the
   * tablet was a read-only feed; fatal the moment it grew verbs.
   *
   * THE FIX, and why it is this one: a device in your hands is not a direction.
   * While one is held the player is looking at an object 40 cm from their face,
   * not across the room at the record, so the hemisphere simply does not apply
   * — the turn is still the signature bodily ask, it is just made from a seat
   * that has a room in front of it. Leaving the phone seat or the tablet seat
   * restores the hemisphere exactly as it was.
   *
   * ⚑ NOT the whole defect. The general fault — a yaw-based hemisphere in a
   * piece that now has three rooms and five seats — is S71's to measure and is
   * the same root cause as its listed "`CURRENT:` readout is wrong at both
   * device seats". This closes the case that blocks S70 and no more.
   */
  let heldDevice: 'tablet' | 'phone' | null = null;
  let flipCount = 0;
  let drag: { x: number; y: number } | null = null;

  // ?debug=1: publish "where am I" (era + which room the view is in) so the
  // debug panel can show a live readout — the answer to "which version/room?".
  const debugOn = new URLSearchParams(window.location.search).get('debug') === '1';
  const ROOM_LABEL: Record<number, string> = {
    0: 'Room 1 · front (gay)', 90: 'Room 2 · west (lesbian)',
    270: 'Room 3 · east (trans)'
  };
  /** the two side rooms begin where the base room's own walls stood (era1.json
   *  wallWest/wallEast at x ∓2.13, and the side floors start at ∓2.03) */
  const ROOM_EDGE_X = 2.03;
  let lastNow = '';
  function publishNow(): void {
    if (!debugOn) return;
    const eraU = (cluster ? cluster.era : 'e1').toUpperCase();
    let room = ROOM_LABEL[0];
    let facing = '';
    if (cluster && cluster.state !== 'sealed') {
      /**
       * ⚑ S71 — WHERE YOU ARE IS A POSITION, NOT A FACING.
       *
       * This used to pick whichever of the four seat yaws was nearest `camYaw`,
       * which is right in a room seat and wrong at every device seat: Room 2's
       * tablet seat authors yaw 180 (the tablet lies on the far side of the
       * bed), so sitting down with it reported `spine · door + record` while
       * the player was in Room 2 — measured this session at both device seats,
       * in both E3 and E4. It is the same root cause S70 patched in the witness
       * hemisphere: a global camera yaw standing in for a place. The three
       * rooms are separated in x and nothing else is, so x is the answer, and
       * the facing is reported as what it is — a facing.
       */
      room = camPos.x < -ROOM_EDGE_X ? ROOM_LABEL[90]
        : camPos.x > ROOM_EDGE_X ? ROOM_LABEL[270]
          : ROOM_LABEL[0];
      // …and a device in the hands is not a direction either (S70's rule, same
      // seat, same reason): the tablet seat authors yaw 180 because the tablet
      // lies across the bed, not because the player turned around.
      if (!heldDevice && angDist(camYaw, 180) < 45) facing = ' · turned to the record';
    }
    const s = `${eraU} · ${room}${facing}`;
    if (s !== lastNow) { lastNow = s; (window as { __reinterpNow?: string }).__reinterpNow = s; }
    // the Quest budget, live (WEBXR_PERFORMANCE_NOTES: ~50–100): last frame's
    // draw-call total, for the panel readout + batching A/B (?nobatch=1)
    (window as { __drawCalls?: number }).__drawCalls = app.stats.drawCalls.total;
    // ⚑ S105 — the companion number, and the one CLAUDE.md's law is actually
    //   about: how often a screen is re-sent to the GPU. See screenTexture.ts.
    (window as { __uploads?: number }).__uploads = screenUploads;
  }

  // reinterp only: camera POSITION + a smoothstep move for the O2 desk pan and
  // the R (reset-view) shortcut. `conducted` = auto-cam ON: the move ignores
  // drag/keys (accessibility, §0-REV-4); OFF = it's just the default framing
  // the player can grab away from at any time.
  const camPos = new pc.Vec3(EYE.x, EYE.y, EYE.z);
  // A move is a linear tween by default; a dolly passes a `via` waypoint and the
  // path becomes a single quadratic-bezier ARC bowing through it — one eased
  // curve, continuous velocity end-to-end (no mid-swing stop; VR-comfortable).
  interface CamMove { fx: number; fy: number; fz: number; fp: number; fyaw: number;
    tx: number; ty: number; tz: number; tp: number; tyaw: number;
    vx: number; vy: number; vz: number; arc: boolean;
    t: number; dur: number; conducted: boolean; }
  let camMove: CamMove | null = null;
  /** S72: monotonic id of the driven leg currently owning the camera — see
   *  startCamMove and the `__camPose` probe. Never resets; only ever compared. */
  let camMoveSeq = 0;
  /** ⚑ THE ONE OPT-OUT (`?descent=0`). It has always turned off the entrance
   *  descent; S67 makes it turn off the RELOCATIONS too, because they are the
   *  same thing at a larger scale and the brief is explicit that whatever opts
   *  out of one must opt out of the other. With it off, an era shift ages the
   *  room and cuts you to the destination seat — no driven motion anywhere in
   *  the piece. Read once: the URL cannot change mid-session. */
  const drivenMoves = new URLSearchParams(window.location.search).get('descent') !== '0';
  // THE WAKE (decision doc §3): true from the moment the player logs in at
  // the interim panel until the light has finished coming up and the machine
  // has booted itself. It replaces S40's LOOK/INTERACT pre-boot window and
  // its optional power-press outright — nothing here is a gate, and there is
  // nothing for the player to find or press.
  let wakeActive = false;
  let wakeT = 0;
  // THE OPENING DESCENT (see the constants above). S53: no phases left to
  // track — the move IS a single camMove arc, so this is just "is the front
  // door still playing", read by the skip handlers and by the landing check.
  let descentActive = false;
  // S61 THE RELOCATION: which leg owns the camera, or null when it is not
  // running. See the RELOC_* constants above for the shape and the comfort
  // arithmetic; beginRelocation/advanceRelocation/endRelocation drive it.
  // S67: plus WHICH relocation — the key into RELOC_POSES / cluster.ts's
  // RELOCATIONS, and the plan itself, so a leg never has to ask what era it is.
  let relocLeg: 'rise' | 'build' | 'descend' | null = null;
  let relocKey: string | null = null;
  let relocPlan: RelocationPlan | null = null;
  // O7 reveal choreography: seconds until the tilt returns to level; whether
  // the tilt ran conducted — a free tilt cedes to the player's drag
  let revealReturn = -1;
  let revealConducted = false;
  let morphDemoIn = -1; // ?morph= review: seconds until the live morph plays

  // R28-1 movement prototype: the blink transition state. `blinkPhase` null =
  // idle; 'out' = fading to black (the cut itself lands at the END of 'out',
  // never mid-fade — a blink shows nothing moving); 'in' = fading back from
  // the new seat. `blinkT` counts seconds within the current phase.
  let blinkPhase: 'out' | 'in' | null = null;
  let blinkT = 0;
  let blinkTargetNode: string | null = null;
  let moveHintShown = false;
  let moveHintDismissed = false;
  /** Session 65 (Sérgio: *"there's a 'click a marker to move' always on, we
   *  need to think about this logistics"*). It was: shown the first time any
   *  marker is offered, and hidden ONLY by actually using one — so a player
   *  who looked around, or who moved with the review panel, kept a permanent
   *  instruction pinned over the room. A caption that never leaves stops being
   *  a caption and becomes furniture, and the frame does not get to nag. It
   *  now teaches once and goes: it holds for HINT_SECONDS and then fades,
   *  whether or not it was obeyed. Using a marker still dismisses it early. */
  let moveHintT = -1;
  const HINT_SECONDS = 7;

  /**
   * ⚑⚑ THE DEMONSTRATION — the room performs the instruction the screen gives.
   *
   * Sérgio's, from a walk: *"when we have the moment of the racket, it should
   * move in front of us like a visualizer, as if exemplifying IRL, not like in
   * first person, but as if it was a tutorial in the screen but also in the
   * space. We should apply this language of making more moments happen."*
   *
   * The screen half already existed — `provotype.ts`'s drawFigure has drawn
   * lift / exhale / strike since the beat was built. The real racket lay on the
   * floor doing nothing while a diagram of it performed on the monitor. This is
   * the other half, and it is the CONDUCTING LAYER'S NEXT RUNG: emphasis says
   * "this object"; a demonstration says "like this".
   *
   * ⚑ IT OBEYS drawFigure'S OWN LAW, and that law is the whole ethics of the
   * beat: "a few blocky positions, no rhythm, no impact lines, no screen shake…
   * administrative, not kinaesthetic. It must NOT feel like a satisfying swing."
   * A racket that swung WELL would make the practice feel good, and the practice
   * is the subject. So: three still positions, a hard cut between them, no
   * easing, no follow-through, no sound. It moves the way an instruction manual
   * moves — and the apparatus rehearsing a bodily violence in a calm diagram,
   * using your own object, is more frightening than any animation of it.
   *
   * ⚑ AND IT NEVER TOUCHES THE PLAYER'S BODY. R28 §1: the only bodily ask is
   * the turn. The object demonstrates; the person is not asked to swing, mime,
   * or aim. Watching the system show you the gesture is the beat.
   */
  const RACKET_REST = { yaw: 25, pitch: 0, y: 0 };
  const RACKET_POSES: Record<string, { yaw: number; pitch: number; y: number }> = {
    // raised and held, tilted back — the diagram's arm at its top position
    lift:   { yaw: 10, pitch: -68, y: 0.62 },
    // held there. the exhale is the person's, not the object's: it does NOT
    // move, because a prop that moved on a breath would be acting
    exhale: { yaw: 10, pitch: -62, y: 0.60 },
    // down. one position, not a swing — no arc is drawn between these
    strike: { yaw: 14, pitch: -8,  y: 0.16 }
  };
  let racketPose: string | null = null;
  function syncRacketDemo(): void {
    const want = (os.provotype?.roomPose ?? null) as string | null;
    if (want === racketPose) return;
    racketPose = want;
    const h = room.props.get('tennisRacketModel');
    if (!h) return;
    const p = want ? RACKET_POSES[want] : null;
    const base = RACKET_HIT;
    h.entity.setLocalPosition(base.x, (p ? p.y : RACKET_REST.y), base.z);
    h.entity.setLocalEulerAngles(p ? p.pitch : RACKET_REST.pitch, p ? p.yaw : RACKET_REST.yaw, 0);
  }

  // R28-2a: prop emphasis follows the ACTIVE side-message (data key
  // `emphasis`, resolved to prop ids here — geometry stays in .ts). This
  // generalizes R28-0c item 10's floppy lift: a STATIC brightness lift (no
  // pulse, no glow halo — Soft Lo-Fi) on the props the current guidance
  // points at, restored to their exact prior emissive when it retires.
  // Session 49 (finding 2): `boombox` now names ONE id — `boomboxModel`, the
  // real cassettePlayer.glb (data/room/reinterp_deltas.json r1). The four box
  // props it replaces (boombox + the three zeroed speaker/deck details) are
  // gone from the room, so pointing at them lifted nothing that existed.
  const EMPHASIS_PROPS: Record<string, string[]> = {
    floppy: ['kitFloppy', 'kitFloppyLabel', 'kitFloppyShutter'],
    // ⚑ THE TAPES LIFT WITH THE PLAYER — 2026-08-21. The guidance for this beat
    // reads "a companion tape is included. the player is on the shelf", and only
    // the PLAYER was lifted, so the sentence pointed at two things and the room
    // answered for one. Sérgio, walking it: *"On the shelf we should be able to
    // see which tape you'd want to be played, because the user doesn't know —
    // also it would help with the glow, because then the person knows what to
    // click."* Both halves of the sentence now light.
    //
    // ⚑ All three tapes lift, not one. The piece does not tell you which tape to
    // choose — choosing is the beat — it only tells you that these objects are
    // the ones you may touch. Singling one out would conduct the player past a
    // decision instead of into it.
    boombox: ['boomboxModel', 'tapeA', 'tapeB', 'mixtape'],
    // ⚑ THE RACKET IS THE PILLOW PROVOTYPE'S INSTRUMENT, not set dressing.
    // Sérgio: *"Isn't the Racket a provotype of the pillow?"* — and he is
    // right; `data/provotypes/pillow.json`'s own states read "Raise the
    // racket." / "Use a full exhale. Address the person linked to the injury."
    // It is the object of a documented practice (a racket struck against a
    // pillow while addressing a parent), and it had no hit, no emphasis and no
    // link to the beat it belongs to — the room held the instrument and the
    // screen held the session, and nothing joined them.
    pillow: ['tennisRacketModel'],
    // ⚑ THE GATHERING WINDOW — the hint that most needed a room and had none.
    // Sérgio: *"the plant, the two books, the poster, the duck, and the monkey
    // (they aren't clickable at all), no glow around like a pressable area
    // feedback."* He was right in the way that matters: those props are
    // clickable ONLY while the belongings window is open, and outside it they
    // are inert with no feedback — so "clickable" was true of a beat a player
    // may never open, which is indistinguishable from untrue.
    //
    // ⚑ The window is also the one beat in the piece where the room IS the
    // interface: the guidance says keep what you can carry, and the answer is
    // not on the screen. Every eligible object lifting for exactly as long as
    // the window is open is the conducting layer doing its whole job — it says
    // THESE, and it says NOW, and it stops saying it when the moment passes.
    belongings: ['mixtape', 'tapeA', 'tapeB', 'plantModel', 'book1', 'book2',
      'poster1', 'teddyBox', 'rainbowDuck', 'tennisRacketModel']
  };
  // of the prop's own diffuse — never a new light. Session 49 raised this from
  // 0.32: measured on the shelf, 0.32 of a ~0.27 diffuse added ~0.09 emissive
  // to a dark object 1.9m away in a lamp-lit room, and before/after screenshots
  // were indistinguishable. The guidance said "the player is on the shelf" and
  // nothing on the shelf changed. Still a static lift — no pulse, no halo, no
  // new light source (Soft Lo-Fi); it just has to be visible to do its job.
  // 0.55/0.06 was picked by eye against the lamp-lit shelf: 0.32 was invisible,
  // 0.85 read as a glowing object (a new light, which the doctrine forbids).
  const EMPHASIS_FRAC = 0.55;
  /** …and a floor, so a very dark prop still reads as lifted at all */
  const EMPHASIS_FLOOR = 0.06;
  let appliedEmphasis: string | null = null;
  /** id → the exact prior emissive of EVERY material that prop renders with */
  const emphasisRestore = new Map<string, pc.Color[]>();
  function setPropEmphasis(key: string | null): void {
    if (key === appliedEmphasis) return;
    if (appliedEmphasis) {
      for (const id of EMPHASIS_PROPS[appliedEmphasis] ?? []) {
        const h = room.props.get(id);
        const orig = emphasisRestore.get(id);
        if (!h || h.emissive || !orig) continue;
        h.materials.forEach((m, i) => {
          if (!orig[i]) return;
          m.emissive = orig[i];
          m.update();
        });
      }
      emphasisRestore.clear();
    }
    appliedEmphasis = key;
    if (key) {
      for (const id of EMPHASIS_PROPS[key] ?? []) {
        const h = room.props.get(id);
        if (!h || h.emissive) continue; // never touch true emissives (LEDs etc.)
        // `materials`, never `material`: a MODEL prop's `material` is an orphan
        // nothing renders, which is exactly why this lift used to be invisible
        // on the boombox (src/room/era1room.ts's PropHandle doc).
        emphasisRestore.set(id, h.materials.map(m => m.emissive.clone()));
        for (const m of h.materials) {
          const d = m.diffuse;
          m.emissive = new pc.Color(
            Math.min(1, d.r * EMPHASIS_FRAC + EMPHASIS_FLOOR),
            Math.min(1, d.g * EMPHASIS_FRAC + EMPHASIS_FLOOR),
            Math.min(1, d.b * EMPHASIS_FRAC + EMPHASIS_FLOOR)
          );
          m.update();
        }
      }
    }
  }

  /**
   * ⚑ S108 — the props the lift above can reach must not share a material with
   * anything, or lifting one lights every prop of the same colour in the batch.
   * Handed to the cluster here rather than at construction because this table is
   * declared after the shell is built; `ClusterShell.setNeverBatch` carries the
   * full reasoning.
   */
  cluster?.setNeverBatch(Object.values(EMPHASIS_PROPS).flat());

  // R28-2c: the belongings beat's visual mark — a PERSISTENT warm lift on a
  // kept prop, distinct from setPropEmphasis above in both mechanism-detail
  // and meaning: that one is the SYSTEM's transient ask (one active guide
  // message, restores on retire); this is the PLAYER's own mark (one per
  // kept item, holds until un-kept, never restores on its own). Kept props
  // are excluded from BOTH batch groups in cluster.ts specifically so this
  // is always safe to mutate in place — no shared-material cross-talk with
  // an unrelated same-colour prop (book2/tapeB share a hex, for instance).
  // Model props (the plant) get the SAME lift on each of their own already-
  // per-instance-cloned mesh materials (src/room/assets.ts's tintModel).
  const KEPT_LIFT = 0.16;
  const keptMarked = new Set<string>();
  const keptMarkOrigins = new Map<string, pc.Color[]>();
  function forEachMeshInstance(entity: pc.Entity, fn: (mi: pc.MeshInstance) => void): void {
    entity.forEach((node) => {
      const ent = node as pc.Entity;
      if (ent.render) for (const mi of ent.render.meshInstances) fn(mi);
    });
  }
  function liftColor(c: pc.Color): pc.Color {
    return new pc.Color(
      Math.min(1, c.r + KEPT_LIFT),
      Math.min(1, c.g + KEPT_LIFT * 0.6),
      Math.min(1, c.b + KEPT_LIFT * 0.2)
    );
  }
  // R28-2c fix: REASSERT the lift every frame while kept, rather than
  // apply-once — the cluster morph's own applyTarget()/snapTo() legitimately
  // zeroes a non-emissive prop's emissive on every fold (that is how EVERY
  // other prop's transient tints are cleared between states), which would
  // otherwise silently wipe the player's kept-mark the moment any morph
  // (even a frozen/exempted one's own settle-snap) next touches the prop.
  // Reapplying from the ONE captured origin each frame is idempotent and
  // self-healing against that, at negligible cost (≤7 props, once/frame).
  function applyKeptMark(id: string, on: boolean): void {
    const h = room.props.get(id);
    if (!h) return;
    if (h.model) {
      if (on) {
        if (!keptMarkOrigins.has(id)) {
          const saved: pc.Color[] = [];
          forEachMeshInstance(h.entity, (mi) => saved.push((mi.material as pc.StandardMaterial).emissive.clone()));
          keptMarkOrigins.set(id, saved);
        }
        const origins = keptMarkOrigins.get(id)!;
        let i = 0;
        forEachMeshInstance(h.entity, (mi) => {
          const mat = mi.material as pc.StandardMaterial;
          mat.emissive = liftColor(origins[i] ?? mat.emissive);
          i++;
          mat.update();
        });
        keptMarked.add(id);
      } else if (keptMarked.has(id)) {
        const saved = keptMarkOrigins.get(id);
        let i = 0;
        forEachMeshInstance(h.entity, (mi) => {
          const mat = mi.material as pc.StandardMaterial;
          if (saved && saved[i]) mat.emissive = saved[i].clone();
          i++;
          mat.update();
        });
        keptMarkOrigins.delete(id);
        keptMarked.delete(id);
      }
      return;
    }
    if (h.emissive) return; // never touch true emissives (none of the eligible set are)
    if (on) {
      if (!keptMarkOrigins.has(id)) keptMarkOrigins.set(id, [h.material.emissive.clone()]);
      const origin = keptMarkOrigins.get(id)![0];
      h.material.emissive = liftColor(origin);
      h.material.update();
      keptMarked.add(id);
    } else if (keptMarked.has(id)) {
      const saved = keptMarkOrigins.get(id);
      if (saved && saved[0]) h.material.emissive = saved[0].clone();
      h.material.update();
      keptMarkOrigins.delete(id);
      keptMarked.delete(id);
    }
  }
  function syncBelongingsMarks(): void {
    const b = os.belongings;
    if (!b) return;
    for (const id of b.eligible) applyKeptMark(id, b.isKept(id));
  }

  // R28-2b: the tape system's PHYSICAL side — never move a prop's position at
  // runtime (that would silently desync from the settled static batch, see
  // cluster.ts's own note); insert/eject is expressed the SAME way the kit
  // floppy already hides itself — toggling `.enabled` on a pre-placed pair
  // (the shelf box vs. its own "docked" marker at the boombox).
  /** last `tapes.inserted` the props were synced to — the loop watches this so
   *  a tape that ends by itself still returns to the shelf visually (S86). */
  let tapesLastInserted: TapeId | null = null;
  /** ⚑ S89 — the shelf tape currently under the pointer (hover or an in-
   *  progress press), or null. Read by the per-frame loop to show its label
   *  in the tapeCaption strip before anything plays — see testTapeHover(). */
  let hoveredTapeId: TapeId | null = null;
  function syncTapeProps(): void {
    if (!tapes) return;
    tapesLastInserted = tapes.inserted;
    const cur = tapes.inserted;
    (Object.keys(TAPE_SHELF) as TapeId[]).forEach((id) => {
      const shelfH = room.props.get(TAPE_SHELF_PROP[id]);
      const slotH = room.props.get(TAPE_SLOT_PROP[id]);
      if (shelfH) shelfH.entity.enabled = id !== cur;
      if (slotH) slotH.entity.enabled = id === cur;
    });
  }

  // the audio bus only reacts to STATE CHANGES (play started/stopped, the
  // active segment's own named clip changed) — never polled blindly, so a
  // missing per-segment audio name never even attempts a request.
  //
  // R28-2b-ii (Session 32) BUG FIX: this used to key the "did the clip
  // change" check off the SEGMENT id, not the audio FILENAME. That was
  // harmless while every segment's `audio` was null (Session 30's build),
  // but once a single real recording spans many caption segments (e.g. Tape
  // C's ~30 lyric-timed captions all naming the same
  // family_design_solutions_tape97.mp3), comparing by segment id called
  // setClip() — which tears down and recreates the <audio> element — on
  // EVERY caption change, restarting the same song from 0:00 every few
  // seconds. Comparing by the resolved audio name instead means the clip
  // is only (re)started when the actual file changes; a null-audio tape
  // (Tape B's ad-copy-era captions, still true for any segment without a
  // recording) behaves exactly as before.
  let tapesWasPlaying = false;
  let tapesLastAudioName: string | null = null;
  function syncTapeAudio(): void {
    if (!tapes || !tapeAudio) return;
    if (tapes.isPlaying && !tapesWasPlaying) {
      const name = tapes.activeSegment?.audio ?? null;
      tapeAudio.start(name);
      tapesLastAudioName = name;
    } else if (!tapes.isPlaying && tapesWasPlaying) {
      tapeAudio.stop();
      tapesLastAudioName = null;
    } else if (tapes.isPlaying) {
      const seg = tapes.activeSegment;
      const name = seg?.audio ?? null;
      if (name !== tapesLastAudioName) {
        tapeAudio.setClip(name);
        tapesLastAudioName = name;
      }
    }
    tapesWasPlaying = tapes.isPlaying;
  }

  // R28-2d-iv (Session 35): the NetVision Player reuses the SAME tapeAudio
  // bus (there is only ever one boombox-shaped audio bus in the room, and by
  // the time the E2 desktop's video can be open, the Era-1 boombox has
  // already been torn down by the era shift — see tapes.ts's
  // handleEraShift() — so the two never contend for it). Its track name
  // (`audioTrack` in data/dialog/s2_media.json) is deliberately NOT in
  // tapeAudio.ts's REGISTRY yet — the missing-file-safe pattern means the
  // ambient hiss bed plays alone, with zero console errors, until Sérgio's
  // song lands and one REGISTRY line is added.
  let netvisionWasPlaying = false;
  function syncNetvisionAudio(): void {
    if (!os.netvision || !tapeAudio) return;
    const playing = os.netvision.isPlaying;
    if (playing && !netvisionWasPlaying) {
      tapeAudio.start(os.netvision.trackName);
    } else if (!playing && netvisionWasPlaying) {
      tapeAudio.stop();
    }
    netvisionWasPlaying = playing;
  }

  // the gaze-dwell facet pull (geometry doc §2.2 #3) — ambient and reversible:
  // a facet resolves WHILE you look and recedes when you don't; nothing accrues,
  // nothing displays, nothing completes (never latched — the frame never plays)
  const gazeDir = new pc.Vec3();
  const COS_GAZE = Math.cos((12 * Math.PI) / 180); // one-station gaze cone
  let dwellFacet: FacetState | null = null;
  let dwellMs = 0;
  let gazeFg: FacetState | null = null;

  function startCamMove(to: { x: number; y: number; z: number; pitch: number; yaw: number },
                        dur: number, conducted: boolean,
                        via?: { x: number; y: number; z: number }): void {
    const dyaw = ((to.yaw - camYaw + 540) % 360) - 180; // shortest signed rotation
    const fx = camPos.x, fy = camPos.y, fz = camPos.z;
    // `via` is the bezier CONTROL point (raised, back from center): the path bows
    // up-and-over toward it, so mid-travel you rise above the space and see the
    // three rooms, then settle at the desk — the pull-back/push-in in one stroke
    const vx = via ? via.x : 0;
    const vy = via ? via.y : 0;
    const vz = via ? via.z : 0;
    camMove = { fx, fy, fz, fp: camPitch, fyaw: camYaw,
      tx: to.x, ty: to.y, tz: to.z, tp: to.pitch, tyaw: camYaw + dyaw,
      vx, vy, vz, arc: !!via, t: 0, dur, conducted };
    // ⚑ S72: every start bumps the leg counter. The comfort assertion samples
    // the live rig and differentiates it, and a CUT is not locomotion — a blink
    // jump and endRelocation's own seat snap both move the camera metres in one
    // frame, legitimately. Differencing across those would report thousands of
    // m/s and the check would be switched off on its first run. So the sampler
    // only measures a pair of frames that share a leg id, which is exactly the
    // set of frames a driven curve owns.
    camMoveSeq++;
    tween = null;
  }

  /** the light ramp, as a 0..1 curve over the wake's own clock: a beat of the
   *  room as you found it, then the switch, smoothstepped so the lamp swells
   *  rather than snaps (a snap would read as a bug; this reads as a hand). */
  function wakeLightK(t: number): number {
    const k = Math.max(0, Math.min(1, (t - WAKE_DARK_SECONDS) / WAKE_RAMP_SECONDS));
    return k * k * (3 - 2 * k);
  }

  /** Land in the seat. The lights already own their independent clock during
   *  the flight; an early deliberate skip continues the same ramp from at
   *  least its old post-arrival start, while a natural landing boots only after
   *  both the light and camera have finished. */
  function endDescent(): void {
    if (!descentActive) return;
    descentActive = false;
    camMove = null; // drop the arc wherever it had got to
    clearLookOffset(); // …and any look that rode it: the seat is authored
    camPos.set(EYE.x, EYE.y, EYE.z);
    camPitch = 0;
    camYaw = 0;
    cameraRig.setLocalPosition(camPos.x, camPos.y, camPos.z);
    cameraRig.setLocalEulerAngles(camPitch, camYaw, 0);
    wakeActive = true;
    wakeT = Math.max(0, wakeT);
    if (wakeT >= WAKE_DARK_SECONDS + WAKE_RAMP_SECONDS) finishWake();
  }

  /** the end of the wake: the room is lit and the machine boots ITSELF —
   *  unconditional, unpressable, the only path in (decision doc §3). */
  function finishWake(): void {
    if (!wakeActive) return;
    wakeActive = false;
    applyLightsOn();            // the lit state, exactly (no drift from the ramp)
    os.beginReinterpOpening();  // boot on the monitor → O3 profile
  }

  // ── THE RELOCATION's three legs (see RELOC_POSES + cluster.ts RELOCATIONS) ──
  /** start the whole move. Called from driveMorph on an era shift that has a
   *  plan — never on a snap/settled jump, and never under ?descent=0. */
  /**
   * ⚑ S109 — ONE BED PER ERA, and `passage_building` between them.
   *
   * The beds are Lane D's argument made concrete: a room that sounds like a
   * year. The PASSAGE is the better half of the idea — the same drone in every
   * transition, because the building has stood since 1997 and only the tenants
   * changed. Review round 1 measured 21 s, 29.5 s and 42.5 s of camera travel
   * with nothing to hear; that is the longest dead air in the work and this is
   * what goes in it.
   */
  const BED_FOR: Record<string, string> = {
    e1: 'bed_1997.mp3', e2: 'bed_2003.mp3', e3: 'bed_2016.mp3', e4: 'bed_2026.mp3'
  };
  const PASSAGE_BED = 'passage_building.mp3';
  /** set when an era lands mid-flight; consumed by `endRelocation` */
  let pendingBed: string | null | undefined;

  function beginRelocation(key: string, plan: RelocationPlan): void {
    // ⚑ the building, for the length of the flight. `onEraShift` brings the
    //   destination's own bed up when the era actually lands.
    roomBed.set(PASSAGE_BED, 2.0);
    const poses = RELOC_POSES[key];
    if (!poses) return;
    // ⚑ A relocation owns the camera outright, so the front door cannot still
    // be running under it. In play they never overlap (the descent lands ~10 s
    // after load, eras shift minutes later) — but the debug panel can start a
    // relocation mid-descent, and the update loop's `descentActive && !camMove
    // → endDescent()` would then fire the instant leg 1's arc resolved and
    // teleport the camera into the seat mid-flight. Measured live before this
    // guard: an 88 m/s, 1020 °/s single-frame spike between legs 1 and 2.
    descentActive = false;
    wakeActive = false;
    relocKey = key;
    relocPlan = plan;
    relocLeg = 'rise';
    startCamMove(poses.rise, plan.riseSeconds, true, poses.riseVia);
  }
  /** each leg hands over the frame its arc resolves — no gap, no still beat */
  function advanceRelocation(): void {
    const poses = relocKey ? RELOC_POSES[relocKey] : undefined;
    if (!poses || !relocPlan) { endRelocation(); return; }
    if (relocLeg === 'rise') {
      relocLeg = 'build';
      // a straight eased tween: while the space changes, the camera is the
      // one thing on screen that is not changing shape
      startCamMove(poses.hold, relocPlan.buildSeconds, true);
    } else if (relocLeg === 'build') {
      relocLeg = 'descend';
      startCamMove(seatPose(relocPlan.seat), relocPlan.descendSeconds, true, poses.descendVia);
    } else if (relocLeg === 'descend') {
      endRelocation();
    }
  }
  /** land it: in the seat, room settled, the era's machine free to start.
   *  Called both when leg 3 resolves on its own and as the SKIP — any input at
   *  all calls this, exactly as endDescent works, so a scripted move of this
   *  length can never trap anyone or make them sit through motion they don't
   *  want. It is also the whole ?descent=0 path (seatCut below). */
  function endRelocation(): void {
    /**
     * ⚑ S109 — YOU ARRIVE, AND THE ROOM IS THERE. The building's drone has been
     * under the whole flight; this is where it gives way to the year you landed
     * in. 3.5 s, so it settles rather than cuts.
     *
     * ⚑ READ OFF `os.era` RATHER THAN A REMEMBERED VALUE, and that is the whole
     * lesson of the hour. The restart lands mid-flight, so the order of
     * `onEraRelocate` / `onEraShift` / this depends on which beat fired when —
     * and a probe that drives one of them by hand produces a fourth order that
     * never happens in play. Rather than encode an order, ask the only question
     * that is always answerable HERE: what era am I standing in now? The bed
     * follows the room, whatever route the piece took to it.
     */
    pendingBed = undefined;
    roomBed.set(BED_FOR[os.era] ?? null, 3.5);
    if (!relocLeg) return;
    const key = relocKey;
    const seat = relocPlan?.seat ?? 0;
    relocLeg = null;
    relocKey = null;
    relocPlan = null;
    camMove = null;
    cluster?.settleNow(); // the space finishes wherever the cascade had got to
    seatCut(seat);
    // ⚑ and only NOW does Vera's workstation start: the era's machine boots in
    // front of you, in the seat, the way E1's did (Sérgio: "we shouldn't
    // start without the boot up on the computer"). E3's arrival only — E1→E2
    // and E3→E4 have no device boot of their own to hold back.
    if (key === 'e2-e3') era3Devices?.beginArrival();
  }
  /** put the camera in a room's seat, now. The landing half of a relocation,
   *  and the whole of it under ?descent=0. */
  function seatCut(yaw: number): void {
    seatYaw = yaw;
    seatNodeId = null; // a base room seat: seatPose(yaw) IS its authored pose
    clearLookOffset(); // S85: an authored pose, so nothing rides in on top of it
    const sp = seatPose(yaw);
    camPos.set(sp.x, sp.y, sp.z);
    camPitch = sp.pitch;
    camYaw = sp.yaw;
    cameraRig.setLocalPosition(camPos.x, camPos.y, camPos.z);
    cameraRig.setLocalEulerAngles(camPitch, camYaw, 0);
  }

  /** grabbing/keying the view cancels a non-conducted move (the player left it) */
  function nudgeCamera(): void {
    if (camMove && !camMove.conducted) { camMove = null; }
    if (revealReturn > 0 && !revealConducted) revealReturn = -1; // the player took over
  }

  // ── the DOLLY (Sérgio, Round 23): the browser camera lives in SEATS, one per
  // room, each a fixed composed framing (the desk centered, like the E1 view).
  // Moving between rooms is a two-phase dolly: pull back to the hub — you SEE
  // you're surrounded by the rooms — swing, then push in to the next seat.
  // Head-drag past a room boundary re-seats on release; arrow keys step rooms;
  // R homes. Sealed E1 keeps the shipped single-seat behavior. Browser only —
  // in VR the head is the camera and the rooms simply surround you. ──
  let seatYaw = 0;                        // current seat (0 = R1 | 90 = R2 west | 270 = R3 east)
  /** ⚑ S80: the movement node the player is actually sitting in, or null for a
   *  base room seat. Device seats author their own pose (nodes.json), which
   *  `seatPose(seatYaw)` cannot reproduce — Recentre needs the real one. */
  let seatNodeId: string | null = null;

  const angDist = (a: number, b: number): number =>
    Math.abs((((a - b) % 360) + 540) % 360 - 180);

  /** the three rooms the dolly seats in — Room 1 (0), Room 2 west (90), Room 3
   *  east (270). The spine (180: door + record terminal) is a channel you can
   *  turn to look at, never a room. E4 uses the same three; its home is Room 3
   *  (Maya = the trans room evolved), set by cluster.homeYaw = 270. */
  function seatYaws(): number[] {
    if (!cluster || cluster.state === 'sealed') return [0];
    // X-layout opens the back into a 4th arm (180) — a real seat toward the
    // ending. T keeps the back a wall, so 180 stays a channel, not a seat.
    return layout === 'x' ? [0, 90, 180, 270] : [0, 90, 270];
  }
  function dollyTo(toYaw: number, totalDur: number, conducted: boolean): void {
    seatYaw = toYaw;
    if (angDist(camYaw, toYaw) < 1 && !camMove) return; // already there
    // one continuous arc: seat → up-and-back over the space (you SEE all three
    // rooms) → the next desk. Single eased curve = no stop-and-go at the center.
    startCamMove(seatPose(toYaw), totalDur, conducted, DOLLY_CTRL);
  }

  /** true while a SCRIPTED move owns the camera/space: any camera tween/dolly
   *  in flight, a cluster morph cascade running, or the pre-fiction opening
   *  wall. R28-1's "scripted moves always win" law: markers hide and clicks
   *  are ignored for the whole superset (a stricter guard than the minimum
   *  the brief lists — simpler than telling apart every dolly's cause, and it
   *  can never let a marker click land mid-transition). */
  function scriptedBusy(): boolean {
    return !!camMove || (cluster?.busy ?? false) || wakeActive;
  }

  /** the actual seat CUT — no tween, no arc, just the target pose, called at
   *  the bottom of the blink's fade-to-black. */
  function performSeatCut(nodeId: string): void {
    const node = movementNodes?.find(nodeId);
    if (!node) return;
    seatYaw = node.seatYaw;
    // ⚑ S80: remember WHICH seat, not just its yaw. A device seat carries its
    // own authored pose, so `seatPose(seatYaw)` is the wrong answer there —
    // measured this session when Recentre at the tablet seat swung the view to
    // Room 1's facing. Same root cause S70/S71 kept finding: a global yaw
    // standing in for a place.
    seatNodeId = nodeId;
    // Session 37 (E3-i): an intra-room device seat (the tablet/phone) carries
    // its own exact camera pose — seatPose(seatYaw) is only a fallback for
    // the three base room seats, which have no `pose` of their own.
    const sp = node.pose ?? seatPose(node.seatYaw);
    camPos.set(sp.x, sp.y, sp.z);
    camPitch = sp.pitch;
    camYaw = sp.yaw;
    cameraRig.setLocalPosition(camPos.x, camPos.y, camPos.z);
    cameraRig.setLocalEulerAngles(camPitch, camYaw, 0);
    camMove = null;
    tween = null;
    clearLookOffset(); // S85: same law as seatCut — an authored pose lands clean

    // ⚑ THE HELD READ (Session 66) — see era3Devices.ts's note. Taking the
    // tablet or phone seat lifts that screen off the furniture into the hand;
    // any other seat puts everything back. The resting BOX prop hides while
    // its screen is held, so the object is never in two places at once.
    const held: 'tablet' | 'phone' | null =
      nodeId === 'r2-tablet' ? 'tablet' : nodeId === 'r2-phone' ? 'phone' : null;
    heldDevice = held;
    // ⚑ the seat is noted on EVERY cut, because from 2026-08-24 the phone is
    //   picked up by pressing it rather than by taking a seat, and the held
    //   pose is still derived from wherever she is actually sitting.
    era3Devices?.noteSeat(sp);
    era3Devices?.holdDevice(held, sp);
    for (const [prop, name] of [['w_tabletDevice', 'tablet'], ['w_phoneDevice', 'phone']] as const) {
      const h = room?.props.get(prop);
      if (h) h.entity.enabled = held !== name;
    }
  }

  /**
   * R28-1's ONE input seam (docs/REINTERP_RESTRUCTURE_R28_2026-07-10.md §2):
   * every way of choosing a destination — today's mouse click, tomorrow's
   * Quest thumbstick-highlight + trigger/A confirm (xr-standard mapping) —
   * routes through here. NEVER called from a gaze/hover path (that is the
   * explicit Sérgio law this session is built around): only a discrete
   * "confirm" input may call this. A pending call is dropped, not queued, if
   * a scripted move starts first — scripted moves always win.
   */
  function requestMove(nodeId: string): void {
    if (!options.reinterp || !cluster || !movementNodes) return;
    if (blinkPhase !== null) return; // a blink is already running
    if (scriptedBusy()) return; // scripted moves always win
    const node = movementNodes.find(nodeId);
    if (!node) return;
    if (!movementNodes.available(cluster.era, seatYaw).some(n => n.id === nodeId)) return; // not offered
    dismissMoveHint();
    blinkTargetNode = nodeId;
    blinkPhase = 'out';
    blinkT = 0;
  }
  if (debugOn) {
    // ?debug=1 review aid (like __camProbe): drive a marker move from the
    // console/tests without needing a real click-and-ray-hit.
    (window as { __requestMove?: (id: string) => void }).__requestMove = requestMove;
    (window as { __movementNodes?: () => string[] }).__movementNodes =
      () => (cluster && movementNodes ? movementNodes.available(cluster.era, seatYaw).map(n => n.id) : []);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ⚑ S80 — LOOK-MODE 3: THE GYRO. The third of the three look-modes
  // (CLAUDE.md, corrected by Sérgio 2026-08-06), and for every Apple device
  // except Vision Pro it IS the experience: Safari implements WebXR only on
  // visionOS, so `navigator.xr` will never fire on iPhone or iPad and the
  // browser 3D room is what those audiences get. You turn the device and the
  // room turns, as in a 360 video.
  //
  // ⚑ SAME CAMERA, SAME SEAT, SAME SCENE. This adds no camera and no mode of
  // its own. The RIG keeps the authored pose — the seat, the scripted moves,
  // the drag — and the gyro rotates the CHILD camera entity, which is exactly
  // where PlayCanvas puts a tracked head in XR. So the composition falls out
  // for free: drag and gyro COMPOSE rather than fight (the research spec's
  // `q_final = q_touch × q_gyro`, with the rig standing in for `q_touch`), and
  // every scripted relocation still owns the camera while it flies.
  //
  // ⚑ IT IS A LOOK, NEVER AN INPUT. Nothing here selects, arms, hovers or
  // triggers anything, and there is no dwell, no gaze target and no timer
  // (R28: no gaze-triggered anything, ever). Turning the device changes what
  // you can see and nothing else; a tap is still the only way to act.
  //
  // ⚑ AND IT MUST NEVER BLOCK DRAG-TO-LOOK. Permission denied, sensor absent,
  // insecure origin, desktop browser — in every one of those cases the button
  // says so plainly and the drag path continues untouched.
  //
  // The maths is the research spec's, verbatim except where PlayCanvas differs
  // (noted at the line): q_gyro = q₀ × q₁ × q₂, with q₂ from the SCREEN
  // ORIENTATION. HISTORICAL INCOMPLETE CLAIM: "recomputed on
  // `orientationchange`" — it always was recomputed each frame, and S83 now
  // derives/polls the cardinal too because the event/API may be absent. That
  // is why the piece does not have to demand landscape. The horizon stays
  // level relative to gravity with no axis flipping, in either posture.
  // ═══════════════════════════════════════════════════════════════════════
  type MotionState = 'unsupported' | 'idle' | 'asking' | 'live' | 'denied' | 'silent';
  type ScreenAngleSource = 'screen.orientation' | 'legacy' | 'derived' | 'unknown';
  type ScreenAngleReading = {
    angle: number | null;
    source: ScreenAngleSource;
    /** the API value before sensor reconciliation; diagnostic only */
    reported: number | null;
  };
  let motionState: MotionState = 'unsupported';
  const motionAngles: { alpha: number | null; beta: number | null; gamma: number | null } = {
    alpha: null, beta: null, gamma: null
  };
  let motionSeen = false;
  let motionSilentTimer = 0;
  /** the device heading (deg) that currently means "the way the seat faces" */
  let motionYawZero = 0;
  /** true for one frame after a recentre is asked for, before a reading lands */
  let motionWantZero = true;

  // pre-allocated, per the spec's own note: nothing here allocates per frame
  const qDevice = new pc.Quat();
  /** q₁ — the fixed −90° about X that aims the camera out through the back of
   *  the device instead of over its top edge */
  const qAxis = new pc.Quat(-Math.SQRT1_2, 0, 0, Math.SQRT1_2);
  const qScreen = new pc.Quat();
  const qAbsolute = new pc.Quat();
  const qZeroFix = new pc.Quat();
  const qHead = new pc.Quat();
  const qAngleProbe = new pc.Quat();
  const qResolvedProbe = new pc.Quat();
  const vHeading = new pc.Vec3();
  const vRoll = new pc.Vec3();
  const vProbeForward = new pc.Vec3();
  const vProbeUp = new pc.Vec3();
  const vProbeRight = new pc.Vec3();
  const vProbeLevelUp = new pc.Vec3();
  const vResolved = new pc.Vec3();
  const V_FWD = new pc.Vec3(0, 0, -1);
  const V_UP = new pc.Vec3(0, 1, 0);
  const CARDINAL_SCREEN_ANGLES = [0, 90, -90, 180] as const;
  let motionScreen: ScreenAngleReading = { angle: null, source: 'unknown', reported: null };
  let motionOrientationKey = '';
  let legacyOrientationEvents = 0;
  let screenOrientationEvents = 0;

  function normalAngle(deg: number): number {
    const n = ((Math.round(deg / 90) * 90) % 360 + 360) % 360;
    return n === 270 ? -90 : n;
  }

  function viewportOrientation(): {
    media: 'portrait' | 'landscape';
    aspect: 'portrait' | 'landscape' | 'square';
    agrees: boolean;
    width: number;
    height: number;
  } {
    const media = window.matchMedia('(orientation: landscape)').matches ? 'landscape' : 'portrait';
    const aspect = window.innerWidth === window.innerHeight ? 'square'
      : window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    return {
      media, aspect, agrees: aspect === 'square' || media === aspect,
      width: window.innerWidth, height: window.innerHeight
    };
  }

  /** Absolute roll after applying one q₂ candidate. The correct cardinal
   *  screen correction is the one whose gravity-referenced horizon is upright;
   *  the opposite landscape sign is 180° away, not an equally plausible fit. */
  function screenCandidateRoll(angle: number): number {
    qAngleProbe.setFromAxisAngle(pc.Vec3.FORWARD, angle);
    qResolvedProbe.copy(qDevice).mul(qAxis).mul(qAngleProbe);
    qResolvedProbe.transformVector(V_FWD, vProbeForward);
    qResolvedProbe.transformVector(V_UP, vProbeUp);
    // Measure the camera's up against a gravity-level up at the same yaw and
    // pitch. Unlike Euler.z, this does not turn yaw 180° into a fake roll 180°.
    if (Math.abs(vProbeForward.dot(V_UP)) > 0.99) {
      // Looking exactly along gravity has no defined horizon. Rotation changes
      // pass through this briefly; retain the current cardinal if possible.
      return motionScreen.angle === angle ? 0 : 180;
    }
    vProbeRight.cross(vProbeForward, V_UP).normalize();
    vProbeLevelUp.cross(vProbeRight, vProbeForward).normalize();
    return Math.abs(Math.atan2(
      vProbeUp.dot(vProbeRight),
      vProbeUp.dot(vProbeLevelUp)
    ) * pc.math.RAD_TO_DEG);
  }

  function derivedScreenAngle(): number | null {
    // Aspect says portrait/landscape but cannot say landscape-left/right (and
    // some tablets have a natural landscape orientation). The live gravity-
    // referenced sensor quaternion supplies that missing sign without forcing
    // either posture. Until beta + gamma exist, the honest answer is unknown.
    if (motionAngles.beta === null || motionAngles.gamma === null) return null;
    let best: number = CARDINAL_SCREEN_ANGLES[0];
    let bestRoll = Number.POSITIVE_INFINITY;
    for (const angle of CARDINAL_SCREEN_ANGLES) {
      const roll = screenCandidateRoll(angle);
      // Keep the previous derived answer on a genuine tie; this is discrete
      // orientation bookkeeping, not smoothing or filtering the gyro look.
      if (roll < bestRoll - 0.01 ||
          (Math.abs(roll - bestRoll) <= 0.01 && motionScreen.angle === angle)) {
        best = angle;
        bestRoll = roll;
      }
    }
    return best;
  }

  /** The screen-orientation correction and the evidence behind it. A numeric
   *  zero is returned only when a source actually says zero; absence is null.
   *  API values are reconciled against gravity so a present-but-stale 0 cannot
   *  silently masquerade as portrait on a landscape viewport. */
  function screenAngle(): ScreenAngleReading {
    const so = window.screen?.orientation?.angle;
    const legacy = (window as { orientation?: number }).orientation;
    const reported = Number.isFinite(so) ? normalAngle(so as number)
      : Number.isFinite(legacy) ? normalAngle(legacy as number) : null;
    const source: ScreenAngleSource = Number.isFinite(so) ? 'screen.orientation'
      : Number.isFinite(legacy) ? 'legacy' : 'unknown';
    const derived = derivedScreenAngle();

    if (reported !== null) {
      // A wrong cardinal is at least 90° worse. Leave 45° of margin for a
      // person holding the device at an angle during the physical rotation.
      if (derived !== null && screenCandidateRoll(derived) + 45 < screenCandidateRoll(reported)) {
        return { angle: derived, source: 'derived', reported };
      }
      return { angle: reported, source, reported };
    }
    if (derived !== null) return { angle: derived, source: 'derived', reported: null };
    return { angle: null, source: 'unknown', reported: null };
  }

  /** the heading of a rotation about world-up, in degrees (0 = along −Z) */
  function yawOf(q: pc.Quat): number {
    q.transformVector(V_FWD, vHeading);
    if (Math.abs(vHeading.y) > 0.99) {
      // pointed at the ceiling or the floor: forward carries no heading, so
      // take it from the device's own up vector instead (the standard
      // magic-window degeneracy, and it is reachable — people look up)
      q.transformVector(V_UP, vRoll);
      const s = vHeading.y > 0 ? -1 : 1;
      vHeading.set(s * vRoll.x, 0, s * vRoll.z);
    }
    return Math.atan2(-vHeading.x, -vHeading.z) * pc.math.RAD_TO_DEG;
  }

  /** q_gyro = q₀ × q₁ × q₂, into `qAbsolute`. False means q₂ is honestly
   *  unknown, so no camera rotation is applied with a fabricated zero. */
  function composeMotion(): boolean {
    const x = (motionAngles.beta ?? 0) * pc.math.DEG_TO_RAD;
    const y = (motionAngles.alpha ?? 0) * pc.math.DEG_TO_RAD;
    const z = -(motionAngles.gamma ?? 0) * pc.math.DEG_TO_RAD;
    const c1 = Math.cos(x / 2), c2 = Math.cos(y / 2), c3 = Math.cos(z / 2);
    const s1 = Math.sin(x / 2), s2 = Math.sin(y / 2), s3 = Math.sin(z / 2);
    qDevice.set(
      s1 * c2 * c3 + c1 * s2 * s3,
      c1 * s2 * c3 - s1 * c2 * s3,
      c1 * c2 * s3 - s1 * s2 * c3,
      c1 * c2 * c3 + s1 * s2 * s3
    );
    motionScreen = screenAngle();
    ledger.view.screenAngle = motionScreen.angle;
    ledger.view.screenAngleSource = motionScreen.source;
    const viewport = viewportOrientation();
    const orientationKey = `${viewport.media}/${viewport.aspect}/${motionScreen.angle ?? 'unknown'}`;
    if (motionOrientationKey && orientationKey !== motionOrientationKey) {
      // Polling is intentional: deprecated `orientationchange` and
      // ScreenOrientation.change are not both dependable on the iPadOS
      // versions this mode must support. This catches the same change even if
      // neither event arrives. It changes only the zero, never sensor data.
      motionWantZero = true;
    }
    motionOrientationKey = orientationKey;
    if (motionScreen.angle === null) return false;
    // ⚑ DEGREES, not the radians the research spec passes here: PlayCanvas's
    // Quat.setFromAxisAngle takes degrees. The spec/three.js q₂ is axis +Z,
    // angle −screenAngle. PlayCanvas FORWARD is −Z, so axis −Z with angle
    // +screenAngle is the SAME quaternion. The old "absorbs the sign flip"
    // claim is therefore correct; this spells out the equivalence.
    qScreen.setFromAxisAngle(pc.Vec3.FORWARD, motionScreen.angle);
    qAbsolute.copy(qDevice).mul(qAxis).mul(qScreen);
    return true;
  }

  /** ⚑ THE PER-FRAME APPLICATION. Called after the rig is posed, so the rig is
   *  the seat and this is the head. 1:1 with the device — deliberately NO
   *  smoothing: a lag between turning your head and the picture turning is its
   *  own nausea, and worse than the jitter it would hide. */
  function applyMotionLook(): void {
    if (motionState !== 'live' || xr?.active) return;
    if (!composeMotion()) return;
    if (motionWantZero) {
      motionWantZero = false;
      motionYawZero = yawOf(qAbsolute);
      ledger.view.yawZero = motionYawZero;
    }
    // re-zero the HEADING only. Pitch and roll are gravity-referenced and
    // absolute on every platform, so they are left exactly as measured —
    // cancelling them would tilt the horizon by however the phone happened to
    // be held at the moment the player pressed recentre.
    qZeroFix.setFromEulerAngles(0, -motionYawZero, 0);
    qHead.copy(qZeroFix).mul(qAbsolute);
    camera.setLocalRotation(qHead);
    // Diagnostic means the resolved CAMERA, not merely the child/head offset:
    // include the authored seat/drag rig in yaw and pitch as the player sees it.
    camera.getRotation().getEulerAngles(vResolved);
  }

  function onDeviceOrientation(e: DeviceOrientationEvent): void {
    if (e.alpha === null && e.beta === null && e.gamma === null) return;
    if (e.alpha !== null) motionAngles.alpha = e.alpha;
    if (e.beta !== null) motionAngles.beta = e.beta;
    if (e.gamma !== null) motionAngles.gamma = e.gamma;
    if (!motionSeen) {
      motionSeen = true;
      motionState = 'live';
      motionWantZero = true; // arriving never swings the room: here is forward
      paintMotionBtn();
    }
  }

  function stopMotion(remember: 'off' | 'denied' | 'unavailable'): void {
    window.removeEventListener('deviceorientation', onDeviceOrientation, true);
    window.clearTimeout(motionSilentTimer);
    motionSeen = false;
    motionOrientationKey = '';
    motionState = remember === 'off' ? 'idle' : remember === 'denied' ? 'denied' : 'silent';
    ledger.view.motion = remember;
    if (!xr?.active) camera.setLocalEulerAngles(0, 0, 0); // hand the view back to the rig
    paintMotionBtn();
  }

  function attachMotion(): void {
    window.addEventListener('deviceorientation', onDeviceOrientation, true);
    // ⚑ the silent failure the spec warns about: on an insecure origin, and on
    // hardware with no IMU, the listener attaches and simply never fires — no
    // error, no console warning. So it is given a moment to prove itself and
    // then told the truth about itself.
    motionSilentTimer = window.setTimeout(() => {
      if (!motionSeen) stopMotion('unavailable');
    }, 1500);
  }

  /** ⚑ THE ENTRY FLOWS ARE DIFFERENT ON THE TWO PLATFORMS, and neither may
   *  block the other: iOS 13+ must ask (a native modal, inside this very
   *  gesture stack, over HTTPS); Android grants orientation with no prompt at
   *  all. One button, one press, two paths behind it. */
  function requestMotion(): void {
    type Requestable = { requestPermission?: () => Promise<PermissionState | string> };
    const req = (window.DeviceOrientationEvent as unknown as Requestable | undefined)?.requestPermission;
    if (typeof req !== 'function') { // Android, and every non-iOS browser
      motionState = 'asking';
      paintMotionBtn();
      attachMotion();
      return;
    }
    motionState = 'asking';
    paintMotionBtn();
    req.call(window.DeviceOrientationEvent)
      .then((res: string) => {
        if (res === 'granted') {
          ledger.view.motion = 'granted';
          attachMotion();
        } else {
          stopMotion('denied');
        }
      })
      .catch(() => stopMotion('denied'));
  }

  function paintMotionBtn(): void {
    if (!motionBtn) return;
    const copy = menuStrings;
    const label: Record<MotionState, string> = {
      unsupported: '',
      idle: copy.motionEnable,
      asking: copy.motionAsking,
      live: copy.motionDisable,
      denied: copy.motionDenied,
      silent: copy.motionUnavailable
    };
    motionBtn.textContent = label[motionState];
    motionBtn.title = motionState === 'idle' ? copy.motionEnableHint : label[motionState];
    motionBtn.style.display = motionState === 'unsupported' ? 'none' : 'block';
    // ⚑ S86: NO `translateX(-50%)` HERE ANY MORE. This line used to re-centre
    // the button on every repaint, which is how it kept landing back on top of
    // the caption strip; with the button now anchored at left:14px it would
    // also have pulled it half off the left edge. The button's position is set
    // once at creation and this function only ever changes its words.
  }

  /**
   * ⚑ RECENTRE — reachable from the game menu, and load-bearing rather than
   * plumbing. iOS gives no reliable absolute heading, so the yaw above is
   * RELATIVE to a zero and it drifts; and this piece's one bodily ask is the
   * turn, which makes *where forward is* part of the work rather than a
   * setting. It is frame voice: it sits beside Restart, not in the fiction.
   *
   * It also puts the frame back to its authored width, because the pinch zoom
   * is the other way the view can end up somewhere the player did not mean.
   */
  function recentreView(): void {
    ledger.view.recentres++;
    if (camera.camera) camera.camera.fov = FOV_HOME;
    if (motionState === 'live') {
      motionWantZero = true; // the next reading decides where forward is
      return;
    }
    // drag-to-look has no sensor to re-zero: put the facing back on the seat
    // the player is actually in — a device seat's own authored pose if that is
    // where they are, not the room seat's (see `seatNodeId`).
    const node = seatNodeId ? movementNodes?.find(seatNodeId) : null;
    const sp = node?.pose ?? seatPose(seatYaw);
    camYaw = sp.yaw;
    camPitch = sp.pitch;
    tween = null;
  }

  if (options.reinterp === true && motionBtn) {
    // ⚑ WHO SEES THE BUTTON. `DeviceOrientationEvent` exists on desktop Chrome
    // too and never fires there, so its mere presence proves nothing: the
    // affordance is offered where a sensor is PLAUSIBLE — iOS (which announces
    // itself by needing permission) or a coarse/touch pointer — plus `?motion=1`,
    // a review switch so this path can be exercised on a desktop browser.
    const forced = new URLSearchParams(window.location.search).get('motion') === '1';
    const hasEvent = typeof window.DeviceOrientationEvent !== 'undefined';
    const needsPermission = typeof (window.DeviceOrientationEvent as unknown as
      { requestPermission?: unknown } | undefined)?.requestPermission === 'function';
    const touchy = navigator.maxTouchPoints > 0 ||
      window.matchMedia?.('(pointer: coarse)')?.matches === true;
    if (hasEvent && (forced || needsPermission || touchy)) motionState = 'idle';
    paintMotionBtn();
    motionBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (motionState === 'live') stopMotion('off');
      else if (motionState !== 'asking') requestMotion();
    });
    // portrait ⇄ landscape: q₂ is recomputed from this every frame, so the
    // only thing the change needs is a re-zero, or the room appears to have
    // swung 90° while the player merely turned the phone in their hand.
    window.addEventListener('orientationchange', () => {
      legacyOrientationEvents++;
      motionWantZero = true;
    });
    window.screen?.orientation?.addEventListener?.('change', () => {
      screenOrientationEvents++;
      motionWantZero = true;
    });
    // the menu's Recentre row (see src/desktop/gameMenu.ts)
    gameMenuBus.recentreView = recentreView;
    (window as { __motion?: () => unknown }).__motion = () => ({
      state: motionState, yawZero: motionYawZero, angles: { ...motionAngles },
      screenAngle: motionScreen, viewport: viewportOrientation(),
      resolved: { yaw: vResolved.y, pitch: vResolved.x, roll: vResolved.z },
      events: { orientationchange: legacyOrientationEvents, screenChange: screenOrientationEvents },
      fov: camera.camera?.fov
    });
    (window as { __recentre?: () => void }).__recentre = recentreView;
    (window as { __motionSim?: (on: boolean) => boolean }).__motionSim = motionSimulate;
  }

  /**
   * ⚑ S80 — THE REVIEW ROUTE FOR A MODE NOBODY CAN PRESS AT A DESK (?debug=1
   * and the panel's own button). A desktop browser cannot make the gesture iOS
   * demands and has no IMU to answer it, so look-mode 3 would otherwise be
   * unreviewable anywhere but a phone — which is exactly how a mode ships
   * broken. This attaches the REAL listener and feeds it REAL
   * `deviceorientation` events with synthetic angles, so everything downstream
   * (the quaternion chain, the screen-orientation term, the zeroing, the
   * picking through a rotated camera) is the shipping path and only the sensor
   * is fake. ⚑ It is NOT a substitute for a device: it cannot show sensor
   * noise, permission behaviour, or how the turn feels in the hand.
   */
  let motionSimTimer = 0;
  function motionSimulate(on: boolean): boolean {
    window.clearInterval(motionSimTimer);
    motionSimTimer = 0;
    if (!on) { stopMotion('off'); return false; }
    if (typeof window.DeviceOrientationEvent !== 'function') return false;
    attachMotion();
    let a = 0;
    motionSimTimer = window.setInterval(() => {
      a = (a + 2) % 360; // a slow, steady turn on the spot — ~14°/s at 50 ms
      window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',
        { alpha: a, beta: 90, gamma: 0 })); // beta 90 = held upright, level
    }, 50);
    return true;
  }

  const isBackYaw = (): boolean => {
    // In XR the authored rig yaw is only half the view: the child's tracked
    // head turn must be what crosses the witness hemisphere.
    // S70: a device in the hands is not a direction — see `heldDevice`.
    // ⚑ S80: and gyro-look is the same situation as XR — the rig's yaw is the
    // seat, not the facing — so it is answered the same way, by the camera's
    // own world forward.
    // ⚑ S88 — this `camera.forward.z > 0` test is the SAME hardcoded global
    // hemisphere §16 CLASS 4 named (assumes the seat's own forward is world
    // -Z, true only at seatYaw 0). The desktop branch below is now fixed
    // relative to `seatYaw`; this one is left exactly as found because
    // neither XR nor gyro-look can be driven or verified in this sandboxed
    // browser (no headset, no real device motion) — S88 will not guess a
    // rotation sign it cannot test. Flagging for whoever next has hardware:
    // at Maya's (270°) or Vera's (90°) seat this most likely reports the
    // wrong hemisphere in-headset too, the same way the flip button did here.
    if (heldDevice) return false;
    if (xr?.active || motionState === 'live') return camera.forward.z > 0;
    // ⚑ S88 fix — was `((camYaw % 360) + 360) % 360` (i.e. hardcoded to a
    // seatYaw-0 forward), so at Maya's (270°) or Vera's (90°) seat "back" was
    // measured from the wrong zero point. Made seat-relative: back is now
    // >90°/<270° AWAY FROM THIS SEAT'S OWN authored forward, not from world
    // yaw 0. At seatYaw 0 this is byte-identical to the old test.
    const n = ((((camYaw - seatYaw) % 360) + 360) % 360);
    return n > 90 && n < 270;
  };

  const flipBtn = document.createElement('button');
  flipBtn.id = 'flip';
  flipBtn.textContent = '⟲';
  flipBtn.title = 'turn around (F2 — or just drag)';
  flipBtn.setAttribute('aria-label', 'turn around (F2, or drag the view)');
  Object.assign(flipBtn.style, {
    position: 'fixed', right: '14px', bottom: '14px', zIndex: '10',
    width: '36px', height: '36px', borderRadius: '18px',
    background: 'rgba(20,20,28,0.85)', color: '#667', border: '1px solid #334',
    font: '16px monospace', cursor: 'pointer', display: 'none',
    transition: 'color 0.3s, border-color 0.3s'
  } as CSSStyleDeclaration);
  document.body.appendChild(flipBtn);

  const pulse = (): void => {
    flipBtn.style.color = '#ffd';
    flipBtn.style.borderColor = '#ffd';
  };
  os.onFlipReady = pulse;
  os.onLeave = () => {
    flipBtn.style.display = 'none';
    if (xr?.active) xr.end();
  };

  /** the ⟲ assist: tween to the other facing (drag can do it manually too) */
  function doFlip(): void {
    if (!os.inDesktop || os.paused) return;
    const n = ((camYaw % 360) + 360) % 360;
    // ⚑ S88 fix — was `facingBack ? 0 : 180`, always targeting the WORLD
    // hemisphere. Confirmed live at Maya's E4 seat (authored forward 270°):
    // the button turned the camera only to yaw 180 — a 90° swing, not the
    // ~180° "turn around" the ball's respite is built on. Made seat-relative:
    // the assist now targets this seat's own forward/back (seatYaw /
    // seatYaw+180). At seatYaw 0 (E1/E2) this is byte-identical to before.
    const target = facingBack ? seatYaw : (seatYaw + 180) % 360;
    const delta = ((target - n + 540) % 360) - 180;
    tween = camYaw + delta;
    flipBtn.style.color = '#667';
    flipBtn.style.borderColor = '#334';
  }
  flipBtn.addEventListener('click', doFlip);

  /** crossing to the witness hemisphere files you — however you turned */
  function onCrossed(back2: boolean): void {
    // ⚑ S80: the cursor no longer says `not-allowed` when you turn. It said so
    // because the press really WAS discarded on this side (the yaw hemisphere);
    // now that picking is what the ray hits, the room behind you answers
    // normally and a "no" cursor would be a lie about the build.
    canvasEl.style.cursor = 'default';
    if (back2) {
      if (!os.inDesktop) return; // nothing on record before the desktop
      flipCount++;
      ledger.flips = flipCount;
      // the data thread: the name is filed the first time you witness
      if (!ledger.records.includes('ministry-index-card')) {
        ledger.records.push('ministry-index-card');
      }
      witness.messagesOnFile = os.irc ? os.irc.userMessageCount : 0;
    } else if (flipCount > 0) {
      os.unlockDossier(); // returned: card #1
    }
  }

  // ── input routing ──
  function screenRay(e: MouseEvent): { p0: pc.Vec3; p1: pc.Vec3 } | null {
    if (!camera.camera) return null;
    const rect = canvasEl.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * canvasEl.clientWidth;
    const sy = ((e.clientY - rect.top) / rect.height) * canvasEl.clientHeight;
    return {
      p0: camera.camera.screenToWorld(sx, sy, camera.camera.nearClip),
      p1: camera.camera.screenToWorld(sx, sy, camera.camera.farClip)
    };
  }

  /** screen px → desktop canvas logical px (the monitor plane at z=0) */
  function toDesktop(e: MouseEvent): { x: number; y: number } | null {
    const ray = screenRay(e);
    if (!ray) return null;
    const dz = ray.p1.z - ray.p0.z;
    if (Math.abs(dz) < 1e-6) return null;
    const t = (SCREEN.z - ray.p0.z) / dz;
    if (t < 0 || t > 1) return null;
    const wx = ray.p0.x + (ray.p1.x - ray.p0.x) * t;
    const wy = ray.p0.y + (ray.p1.y - ray.p0.y) * t;
    const u = (wx - SCREEN.x) / SCREEN.w + 0.5;
    const v = 0.5 - (wy - SCREEN.y) / SCREEN.h;
    if (u < 0 || u > 1 || v < 0 || v > 1) return null;
    // hit-testing speaks logical pixels; the backing store is ×RENDER_SCALE
    return { x: u * ERA1_CANVAS.width, y: v * ERA1_CANVAS.height };
  }

  function rayHitsPoint(e: MouseEvent, p: { x: number; y: number; z: number }, radius: number): boolean {
    const ray = screenRay(e);
    if (!ray) return false;
    const dx = ray.p1.x - ray.p0.x;
    const dy = ray.p1.y - ray.p0.y;
    const dz = ray.p1.z - ray.p0.z;
    const len2 = dx * dx + dy * dy + dz * dz;
    if (len2 < 1e-9) return false;
    let t = ((p.x - ray.p0.x) * dx + (p.y - ray.p0.y) * dy + (p.z - ray.p0.z) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = ray.p0.x + t * dx - p.x;
    const cy = ray.p0.y + t * dy - p.y;
    const cz = ray.p0.z + t * dz - p.z;
    return Math.sqrt(cx * cx + cy * cy + cz * cz) < radius;
  }

  // the disk leaves the desk when it enters the drive. In reinterp the insertion
  // is the FIRST FILING (O7) — it flips cluster state so the witness record wakes
  // — but the old radial-era flourishes (an upward camera glance at the ceiling
  // presence + wall light-leak seams) are REMOVED (Sérgio R26: "the camera goes
  // up to nothing"). The reveal is now a quiet state change; the three-room O7
  // reconception is a Codex design lane (the doorways ARE the widening).
  os.onKitInserted = () => {
    for (const id of ['kitFloppy', 'kitFloppyLabel', 'kitFloppyShutter']) {
      const ent = app.root.findByName(id);
      if (ent instanceof pc.Entity) ent.enabled = false;
    }
    if (cluster && cluster.state === 'sealed') cluster.reveal();
  };

  /**
   * ⚑ S80 — TAP vs DRAG, and it is the whole reason this session exists.
   *
   * WHAT IT WAS: every interaction in the piece resolved on `pointerdown` —
   * the power button, the kit, the belongings, the tapes, the monitor plane,
   * Room 2's device screens, the floor markers — while `pointermove` dragged
   * the camera. There was no discrimination of any kind. On a mouse that
   * survives (you click precisely, and you start drags on empty space by
   * habit). ⚑ On a touch screen it is a defect on first contact: EVERY attempt
   * to look around that begins on a prop also activates that prop, and
   * look-mode 3's whole navigation is touch, on a screen where a thumb covers
   * several props at once.
   *
   * WHAT IT IS NOW, and it is the ordinary fix (Sérgio's own research spec
   * arrives at the same one — `onTouchEnd`, "only if single tap"): the press
   * ALWAYS begins a look, and the release resolves an interaction only if the
   * press neither travelled nor lingered. A press that travels is a look. A
   * press that stays is a tap.
   *
   * The two thresholds, and why these numbers:
   *  · TAP_SLOP_PX 10 — measured as PATH LENGTH, not displacement, so a wiggle
   *    that returns to where it started still reads as a look. 10 CSS px is
   *    ~1.6° of yaw at the drag rate below: far under the smallest thing in the
   *    room, far over the jitter of a finger lifting off glass.
   *  · TAP_MS 1200 — generous on purpose. A long press is not a gesture
   *    anywhere in this piece, so nothing competes for it; the limit exists
   *    only so a thumb RESTING on the glass does not fire something when it
   *    eventually lifts. Erring long costs nothing; erring short would swallow
   *    a deliberate slow press, which is worse than the fault being fixed.
   *
   * ⚑ AND THE SECOND FIX IS THAT THIS BLOCK NO LONGER ASKS WHICH WAY YOU FACE.
   * It used to sit entirely inside `if (!facingBack)` — a yaw-based witness
   * hemisphere (`camYaw` in 90…270), so turning past a threshold discarded
   * every press in the room. That was a reasonable shortcut in a one-room
   * build; in a three-room building it is wrong, and on a device you PHYSICALLY
   * ROTATE it is systemic — a whole hemisphere would simply stop responding.
   * S70 patched only the held-device case; S76 warned it would silently eat
   * S77's chips. The replacement is what the ray actually hits, which every
   * test below already computes: `toDesktop()` clamps to t ∈ [0,1] along
   * near→far and to u,v ∈ [0,1] on the plane, and `rayHitsPoint()` is a
   * distance test against a forward segment — so a surface behind you cannot
   * be hit, by geometry, without anything having to know your yaw.
   * `facingBack` itself is untouched and still means what it always meant:
   * the crossing that files you (onCrossed / markWitnessSeen / the cold creep).
   */
  const TAP_SLOP_PX = 10;
  const TAP_MS = 1200;
  /** the live press, or null. `moved` is accumulated path length in CSS px. */
  let press: { id: number; t: number; moved: number; opening: boolean } | null = null;
  /** every pointer currently down, for the two-finger pinch below */
  const pointers = new Map<number, { x: number; y: number }>();

  /**
   * ⚑ S80 — PINCH-TO-ZOOM ON THE CAMERA FOV (mode-3 scope item, and the
   * CORRECTED answer to "the canvas is small on a phone").
   *
   * Sérgio, 2026-08-06: *"I wouldn't make touching the screen turn it into flat
   * inside the mobile. We can have zooms, that is different, but I don't want
   * the 'fill up'."* A canvas that takes the viewport IS flat-by-tapping: the
   * room disappears and the spatial frame goes with it, and the spatial frame
   * is the piece. So this narrows the FRAME instead — you see LESS of the room,
   * LARGER, and you never leave it. It is the native 360-video gesture, it is
   * the camera rather than the fiction, and it adds no UI surface.
   *
   * `FOV = clamp(FOV − Δd · sensitivity, 30°, 80°)`, straight from the research
   * spec. The zoom PERSISTS after the fingers lift (a panorama does not spring
   * back); the game menu's Recentre puts it back to the authored 42°.
   */
  const FOV_MIN = 30;
  const FOV_MAX = 80;
  const FOV_HOME = 42; // createAppShell's authored value, and CAMERA_POSES.fov
  const PINCH_SENSITIVITY = 0.10; // °/px, by feel — never tested on hardware
  let pinch: number | null = null; // last two-finger distance, or null

  function pointerSpread(): number {
    const [a, b] = [...pointers.values()];
    if (!a || !b) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  /**
   * ⚑ S89 — TAPE IDENTITY. Sérgio, 2026-08-15: "how does it label each of the
   * tapes so we know which one to play?" Before this there was no answer —
   * the three cassettes on the shelf differ only by a raw hex tint
   * (data/room/reinterp_deltas.json), which says nothing about WHAT is on
   * them. This is the read: a shelf tape (not yet inserted) under the
   * pointer, tested the same way the click itself is (rayHitsPoint against
   * TAPE_SHELF), so the label always names the exact tape a press would
   * insert next. Read on both a genuine mouse hover (pointermove, no button
   * down) AND on pointerdown itself — the label appears the instant a finger
   * lands, and `resolveTap` (the actual insert) still only fires on RELEASE,
   * so a touch press always shows the name before the tape plays, never after.
   */
  function testTapeHover(e: MouseEvent): TapeId | null {
    if (!tapes || !os.inDesktop || os.era !== 'e1') return null;
    for (const id of Object.keys(TAPE_SHELF) as TapeId[]) {
      if (tapes.inserted === id) continue;
      if (rayHitsPoint(e, TAPE_SHELF[id], TAPE_HIT_RADIUS)) return id;
    }
    return null;
  }

  /** the interaction resolution — everything that used to run on pointerdown */
  function resolveTap(e: PointerEvent): void {
    {
      if (os.isOff && rayHitsPoint(e, POWER_BTN, 0.08)) { // the era's first gesture
        os.powerOn();
        return;
      }
      // ⚑ THE RACKET → THE SESSION. The only room prop that opens a screen
      //   beat, and it is the right one: the provotype IS this object being
      //   used. Guarded on `inDesktop` so it never fires over a window or a
      //   felt scene, and on `reinterp` because the provotypes are ours.
      if (options.reinterp && os.inDesktop && os.desktopIdleForProps?.() &&
          rayHitsPoint(e, RACKET_HIT, 0.34)) {
        os.openPillowFromRoom?.();
        return;
      }
      if (os.inDesktop && !os.kit && rayHitsPoint(e, KIT_FLOPPY, 0.13)) {
        os.insertKit(); // S1.2 — you put the disk in yourself
        return;
      }
      // R28-2c: the belongings beat — ONLY while the gathering window is
      // open (T1's "Remind me later"). Checked BEFORE the tape/boombox block
      // below so a click on a tape's shelf spot KEEPS it during the window,
      // rather than inserting it into the boombox (the departure moment, not
      // a listening one); the boombox's own play/pause zone is untouched.
      // Un-eligible clicks fall through untouched (return only on a real hit).
      // S2R.7: the same geometry serves BOTH gathering passes (u2's departure
      // and u3's migration) — r2 moves none of the second pass's props, so no
      // per-era hit table is needed. Only what the CURRENT pass offers is
      // clickable: an object already kept in pass 1 is frozen, and its click
      // falls through untouched rather than being silently swallowed.
      const belongings = os.belongings;
      if (belongings?.windowOpen) {
        let kept = false;
        const offered = belongings.offered; // one set per click, not per prop
        for (const [id, hit] of Object.entries(BELONGINGS_HIT)) {
          if (!offered.has(id)) continue;
          if (rayHitsPoint(e, hit.p, hit.r)) {
            belongings.toggle(id);
            kept = true;
            break;
          }
        }
        if (kept) return;
      }
      // R28-2b: the three tapes + the boombox — Era-1 only (the boombox
      // itself leaves the room at E2; driveMorph() resets tape state on every
      // era shift, see below). A tape already inserted has no shelf entity
      // left to click (syncTapeProps disabled it), so this can never re-fire
      // on the same tape; checked BEFORE the boombox so an overlapping radius
      // never steals a shelf click (same precedence law as item 4 below).
      if (tapes && os.inDesktop && os.era === 'e1') {
        let tapeHandled = false;
        for (const id of Object.keys(TAPE_SHELF) as TapeId[]) {
          if (tapes.inserted === id) continue;
          if (rayHitsPoint(e, TAPE_SHELF[id], TAPE_HIT_RADIUS)) {
            tapes.insert(id);
            syncTapeProps();
            syncTapeAudio();
            tapeHandled = true;
            break;
          }
        }
        if (tapeHandled) return;
        if (rayHitsPoint(e, BOOMBOX_HIT, BOOMBOX_HIT_RADIUS)) {
          tapes.togglePlay();
          // ⚑ S86: STOP IS NOW AN EJECT (tapes.ts), so this press changes which
          // props exist and must re-sync them HERE. The loop watcher below is
          // for the tape that ends by ITSELF; leaving this press to the watcher
          // too would put the cassette back on the shelf one frame late — a
          // hand's gesture answered on the next tick instead of on the press.
          syncTapeProps();
          syncTapeAudio();
          return;
        }
      }
      // R28-0c (item 4): the monitor/OS click is checked BEFORE markers — prop
      // and OS interactions must win over a marker when both could match a
      // click (Sérgio: a shelf-item click teleported him instead of doing
      // nothing/interacting). toDesktop() only matches the narrow monitor
      // plane, so this reorder costs nothing on the far more common case
      // (clicking a marker on the floor, nowhere near the screen).
      const p = toDesktop(e);
      if (p) { // the monitor is the UI; everywhere else is the room
        os.handleClick(p.x, p.y);
        return;
      }
      // Session 38 (E3-ii): the workstation's own screen (Room 2's era3Devices
      // plane, a DIFFERENT plane from the shared Room-1 monitor above) —
      // same precedence rule as the monitor check just above it: a screen
      // click must win over a marker click before markers are even tested.
      // handleWorkstationPointer does its own generalized plane-ray hit test
      // (the workstation's vertical euler isn't the fixed axis toDesktop()
      // assumes) and returns false (never consumed) when the ray misses the
      // plane or the screen isn't visible this era, so this never steals a
      // click meant for a movement marker on the floor.
      if (era3Devices) {
        const ray = screenRay(e);
        if (ray && era3Devices.handleWorkstationPointer(ray)) return;
      }
      // R28-1: click-to-move, NEVER gaze-to-move — this pointerdown ray/hit
      // test is the ONLY thing that can arm a marker; looking at one (however
      // long) never does. Only test markers actually being offered right now
      // (movementNodes.available already excludes the current seat) AND
      // actually visible this frame (isVisible — defence in depth alongside
      // the tightened MARKER_HIT_RADIUS, item 4).
      if (movementNodes && cluster && !scriptedBusy()) {
        for (const n of movementNodes.available(cluster.era, seatYaw)) {
          if (!movementNodes.isVisible(n.id)) continue;
          if (rayHitsPoint(e, { x: n.marker[0], y: n.marker[1], z: n.marker[2] }, MARKER_HIT_RADIUS)) {
            requestMove(n.id);
            return;
          }
        }
      }
    }
  }

  // ⚑ the browser must not claim the gestures the room needs: without this a
  // touch-drag scrolls/rubber-bands the page and a pinch zooms the DOCUMENT,
  // and neither pointer stream ever reaches the code above.
  canvasEl.style.touchAction = 'none';

  /**
   * ⚑⚑ S86 — AND `touch-action` IS NOT ENOUGH ON iOS, WHICH IS WHY SÉRGIO'S
   * iPAD KEPT FALLING OUT OF FULLSCREEN MID-SCENE.
   *
   * The pinch is a BOUND CAMERA CONTROL in this piece (FOV 30°–80°, CLAUDE.md)
   * and Safari's own page zoom was firing underneath it and taking the page —
   * and fullscreen with it — along for the ride. Three layers are needed and
   * only the first was ever built:
   *   1. `touch-action: none` (above) — stops panning and double-tap zoom.
   *   2. the viewport meta (index.html) — `user-scalable=no, maximum-scale=1`.
   *   3. ⚑ THIS: WebKit's non-standard `gesturestart/change/end`, which is the
   *      event iOS Safari actually uses for a two-finger page zoom and which
   *      neither of the other two suppresses. It is dispatched on the DOCUMENT
   *      as well as the target, so both are bound; `preventDefault()` on it is
   *      the documented way to keep the page's own scale.
   * Plus `touchmove` with two fingers, registered non-passive so the call is
   * not ignored — some WebKit builds rubber-band the document from touchmove
   * even under `touch-action: none`.
   *
   * None of this changes what the gesture DOES: the FOV handler in
   * `pointermove` below is untouched. It only stops the browser doing a second,
   * uninvited thing with the same fingers. Desktop is unaffected — no browser
   * fires `gesture*` for a mouse.
   */
  const killGesture = (e: Event): void => { e.preventDefault(); };
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    canvasEl.addEventListener(type, killGesture, { passive: false });
    document.addEventListener(type, killGesture, { passive: false });
  }
  canvasEl.addEventListener('touchmove', (e) => {
    if (e.touches.length >= 2) e.preventDefault();
  }, { passive: false });

  /**
   * ⚑ S109 — ERA 1'S BED STARTS ON THE FIRST TOUCH, and it has to.
   *
   * Two reasons, and only the second is obvious. (1) `onEraShift` fires on era
   * CHANGES, and Era 1 is not a change — it is where the piece begins, so
   * nothing would ever ask for its bed. (2) Browsers refuse to start audio
   * before a real user gesture; a bed asked for at load would be rejected and
   * the era would be silent for the rest of the run with nothing in any log to
   * say why. The piece's first gesture is a press, so that is where it goes.
   * Once, then never again.
   */
  let bedStarted = false;
  const startFirstBed = (): void => {
    if (bedStarted) return;
    bedStarted = true;
    roomBed.set(BED_FOR[os.era] ?? BED_FOR.e1, 1.5);
  };
  canvasEl.addEventListener('pointerdown', startFirstBed);
  document.addEventListener('pointerdown', startFirstBed);

  canvasEl.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // a second finger is a PINCH: not a look, not a tap. Both are cancelled
    // outright rather than resumed, so lifting one finger of a zoom can never
    // fire whatever happened to be under it.
    if (pointers.size >= 2) {
      press = null;
      drag = null;
      pinch = pointerSpread();
      e.preventDefault(); // S86: the second finger belongs to the camera, not the page
      return;
    }
    // S84: the entrance stays skippable, but a tablet press is not yet a tap.
    // Record it through S80's same 10 px / 1.2 s release test: travelling is a
    // LOOK and must not destroy the opening. This branch also avoids
    // nudgeCamera(), which would cancel the conducted entrance arc itself.
    if (descentActive) {
      press = { id: e.pointerId, t: performance.now(), moved: 0, opening: true };
      drag = { x: e.clientX, y: e.clientY };
      try { canvasEl.setPointerCapture(e.pointerId); } catch { /* synthetic pointers */ }
      return;
    }
    // S61: and so is the relocation, for the same reason and by the same
    // gesture — it is the longest scripted move in the piece.
    // ⚑ S85 — AND THAT IS EXACTLY WHY IT MAY NOT END ON POINTERDOWN. S84 moved
    // the descent onto S80's release test and left this line on the old
    // immediate path, so the one move that argues the rooms are ONE BUILDING,
    // and that you are being carried through it, was still being thrown away by
    // any thumb that touched the glass. Same record, same 10 px / 1.2 s test:
    // a press that travels is a look (and now genuinely looks — see the
    // offset), a press that stays ends the move.
    if (relocLeg) {
      press = { id: e.pointerId, t: performance.now(), moved: 0, opening: true };
      drag = { x: e.clientX, y: e.clientY };
      try { canvasEl.setPointerCapture(e.pointerId); } catch { /* synthetic pointers */ }
      return;
    }
    press = { id: e.pointerId, t: performance.now(), moved: 0, opening: false };
    drag = { x: e.clientX, y: e.clientY };
    tween = null; // grabbing the view cancels the assist
    nudgeCamera(); // …and a non-conducted O2/reset move
    hoveredTapeId = testTapeHover(e); // S89: name the tape the instant a finger lands, before release inserts it
    try { canvasEl.setPointerCapture(e.pointerId); } catch { /* synthetic pointers */ }
  });
  canvasEl.addEventListener('pointermove', (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch !== null) {
      e.preventDefault(); // S86: see the gesture block above — the FOV is ours
      if (pointers.size < 2 || !camera.camera) return;
      const d = pointerSpread();
      camera.camera.fov = Math.max(FOV_MIN, Math.min(FOV_MAX,
        camera.camera.fov - (d - pinch) * PINCH_SENSITIVITY));
      pinch = d;
      return;
    }
    if (drag && (e.buttons & 1)) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (press) press.moved += Math.hypot(dx, dy); // path length, not displacement
      if (camMove) {
        // ⚑ S85: a curve owns camYaw/camPitch this frame, so writing them here
        // is erased before it is drawn. Ride on top of it at the same rate and
        // with the same clamp — but the clamp is on the SUM, so a look during a
        // move can never point further than a look standing still.
        lookOffYaw -= dx * 0.16;
        const pitch = camPitch + lookOffPitch - dy * 0.12;
        lookOffPitch = Math.max(-DRAG_PITCH_MAX, Math.min(DRAG_PITCH_MAX, pitch)) - camPitch;
      } else {
        camYaw -= dx * 0.16;
        camPitch = Math.max(-DRAG_PITCH_MAX, Math.min(DRAG_PITCH_MAX, camPitch - dy * 0.12));
      }
      drag = { x: e.clientX, y: e.clientY };
      return;
    }
    // hover feedback follows the ray like everything else now — off the
    // monitor plane `toDesktop()` simply returns null (S80: no yaw gate).
    const p = toDesktop(e);
    if (p) os.handleMove(p.x, p.y);
    else hoveredTapeId = testTapeHover(e); // S89: a genuine mouse hover over the shelf, no press
  });
  canvasEl.addEventListener('pointerup', (e) => {
    pointers.delete(e.pointerId);
    hoveredTapeId = null; // S89: the press-preview ends at release either way (insert, if any, takes over the caption)
    if (pinch !== null) {
      if (pointers.size < 2) pinch = null;
      drag = null;
      press = null;
      return;
    }
    const p = press;
    press = null;
    drag = null;
    // R28-0c (item 13, Sérgio: "the camera still jumps rooms from look/drag
    // input"): the old dolly-follow ("releasing a head-turn nearer another
    // room's facing travels there") was a non-marker way to change seats —
    // under options.reinterp, room-to-room movement is ONLY requestMove
    // (markers) or a scripted beat (sends/updates/the TURN); drag is
    // look-in-place only, full stop. The shipped (non-reinterp) baseline
    // never had this behavior to begin with, so nothing changes there.
    if (!p || p.id !== e.pointerId) return;
    if (p.moved > TAP_SLOP_PX) return;                 // it travelled: a look
    if (performance.now() - p.t > TAP_MS) return;      // it lingered: not a tap
    if (p.opening) {
      // ⚑⚑ THE DRIVEN MOVES ARE NOT SKIPPABLE BY POINTER. FIXED 2026-08-15.
      //
      // S48 made the descent skippable by anything, and that was right for a
      // mouse-only build. S80/S84/S85 then narrowed it to "a drag is a look, a
      // deliberate tap still skips" — and shipped that three times, because the
      // BRIEFS said so. They were wrong. Sérgio asked for the opposite, four
      // times, in plain words: *"tapping should not jump ahead"* · *"it should
      // be fixed even if the mode is free handling"* · *"all the camera
      // movements are still skippable"* · *"the clicking on the mouse jumps
      // ahead the travellings still."*
      //
      // He is right on the merits, not merely by authority. The descent and the
      // relocation are the piece's argument that these rooms are ONE BUILDING
      // and that you are being MOVED through it — the only bodily claim it
      // makes. A stray click during it is not an instruction to leave; on a
      // touch screen the first thing anyone does is touch the picture, and on a
      // workstation a click is how you check whether a thing is alive. Losing the
      // shot to either is a loss with no upside: the move is 12 s, it is
      // authored, and nothing waits behind it.
      //
      // So the press is SWALLOWED: it never ends the move, and it never falls
      // through onto the landed room. Dragging still looks around (S85b layers
      // the offset onto the curve). ESCAPE HATCH: the keydown path at ~2578
      // still ends either move, deliberately — a key is unambiguous and the
      // review sessions need a way out. That is the ONE way to cut a leg short.
      return;
    }
    resolveTap(e);
  });
  canvasEl.addEventListener('pointercancel', (e) => {
    pointers.delete(e.pointerId);
    press = null;
    drag = null;
    hoveredTapeId = null;
    if (pointers.size < 2) pinch = null;
  });
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    // S48: any key skips the descent too (Escape excepted — the game menu
    // intercepts that in the capture phase and never reaches here)
    if (descentActive) { endDescent(); return; }
    if (relocLeg) { endRelocation(); return; } // S61: same for the relocation
    // F2, not a letter: printable keys must always reach the typing hand
    if (e.key === 'F2' && os.inDesktop && !os.paused && !gameMenuBus.isOpen) {
      doFlip();
      e.preventDefault();
      return;
    }
    // reinterp browser CAMERA controls (§0-REV-5): arrow keys always steer the
    // view; R/F are shortcuts, but only when no phase is capturing typed text —
    // camera only, never a content verb. Non-reinterp keeps the shipped path.
    // R28-4: gate this whole block on the game menu too, so a stray keypress
    // while paused never leaves a hidden camera mutation to snap into view on
    // Resume (note: Escape itself never reaches this listener at all while
    // the menu exists — src/desktop/gameMenu.ts intercepts it in the capture
    // phase — so no separate Escape guard is needed here).
    if (options.reinterp && !os.paused && !gameMenuBus.isOpen) {
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') {
        // R28-0c (item 13): arrow keys are look-in-place ONLY, every era —
        // the old "left/right = dolly to the adjacent room" (Round 23) was a
        // non-marker way to change seats, which Sérgio flagged as the camera
        // still "gaze/arrow jumping" rooms. Under options.reinterp, the ONLY
        // way to change seats is requestMove (markers) or a scripted beat
        // (sends/updates/the TURN) — never a raw keypress.
        nudgeCamera();
        if (!camMove) {
          if (k === 'ArrowLeft') camYaw += 6;
          else if (k === 'ArrowRight') camYaw -= 6;
          else if (k === 'ArrowUp') camPitch = Math.min(DRAG_PITCH_MAX, camPitch + 5);
          else camPitch = Math.max(-DRAG_PITCH_MAX, camPitch - 5);
        }
        e.preventDefault();
        return;
      }
      if (!os.isCapturingText) {
        if (k === 'r' || k === 'R') { // reset to the era's home seat (E4: the TURN's facing)
          if (seatYaws().length > 1 && cluster) dollyTo(cluster.homeYaw, 2.2, false);
          else startCamMove({ x: EYE.x, y: EYE.y, z: EYE.z, pitch: 0, yaw: cluster ? cluster.homeYaw : 0 }, 0.7, false);
          e.preventDefault();
          return;
        }
        if ((k === 'f' || k === 'F') && os.inDesktop) { // flip (only meaningful in-desktop)
          doFlip();
          e.preventDefault();
          return;
        }
      }
    }
    if (facingBack) { // Esc returns; everything else is swallowed
      if (e.key === 'Escape') doFlip();
      e.preventDefault();
      return;
    }
    if (os.handleKey(e.key)) e.preventDefault();
  });

  // ── frame loop ──
  app.on('update', (dt: number) => {
    // R28-4 — THE GAME MENU hard-freezes the whole per-frame body: camera
    // tweens/dollies, the era-morph cascade, movement blink, tape/NetVision
    // audio clocks, os.update() (every ritual/kit/irc/diary/update timer) —
    // all of it lives inside this one callback, so skipping it wholesale is
    // both the simplest and the safest pause (nothing partially advances;
    // resuming just continues on the next real frame's ordinary small dt —
    // no accumulated-time jump, since we never buffer a skipped delta; the
    // engine's own dt is computed per-tick regardless of what we do with it).
    if (options.reinterp && gameMenuBus.isOpen) return;
    if (tween !== null) {
      const dir = Math.sign(tween - camYaw);
      camYaw += dir * (180 / FLIP_SECONDS) * dt;
      if ((dir > 0 && camYaw >= tween) || (dir < 0 && camYaw <= tween)) {
        camYaw = tween;
        tween = null;
      }
      camPitch += (0 - camPitch) * Math.min(1, dt * 6); // level out during the swing
    }
    if (options.reinterp) {
      // the descent owns the camera outright while it runs — it is the one
      // move in the piece the player did not ask for, so it is also the one
      // that yields instantly to any input (endDescent). S53: it IS a camMove
      // now, so it needs no clock of its own; it is landed below, the frame
      // the arc resolves.
      if (camMove) {
        camMove.t += dt;
        const k = Math.min(1, camMove.t / camMove.dur);
        // arcs use smootherstep (zero velocity AND acceleration at the ends — no
        // jerk as the dolly settles); plain tweens keep the lighter smoothstep
        const s = camMove.arc ? k * k * k * (k * (k * 6 - 15) + 10) : k * k * (3 - 2 * k);
        if (camMove.arc) { // quadratic bezier through the hub control point
          const u = 1 - s;
          camPos.x = u * u * camMove.fx + 2 * u * s * camMove.vx + s * s * camMove.tx;
          camPos.y = u * u * camMove.fy + 2 * u * s * camMove.vy + s * s * camMove.ty;
          camPos.z = u * u * camMove.fz + 2 * u * s * camMove.vz + s * s * camMove.tz;
        } else {
          camPos.x = camMove.fx + (camMove.tx - camMove.fx) * s;
          camPos.y = camMove.fy + (camMove.ty - camMove.fy) * s;
          camPos.z = camMove.fz + (camMove.tz - camMove.fz) * s;
        }
        camPitch = camMove.fp + (camMove.tp - camMove.fp) * s;
        camYaw = camMove.fyaw + (camMove.tyaw - camMove.fyaw) * s;
        if (k >= 1) camMove = null;
      }
      // the front door landed (the arc above just resolved on the seat) — hand
      // over to S44's wake, same frame, so there is no still beat between
      // arriving and the light starting to come up.
      if (descentActive && !camMove) endDescent();
      // …and the relocation's legs hand over to each other the same way
      if (relocLeg && !camMove) advanceRelocation();
      // ⚑ S85: a driven leg has ended and nothing took it over, so a look taken
      // during it becomes simply the look you are holding. (A landing never
      // reaches here with an offset — endDescent/seatCut clear it — and a
      // relocation's handover leaves camMove set, so the ride carries unbroken
      // across all three legs rather than snapping back at each boundary.)
      if (!camMove) commitLookOffset();
      cameraRig.setLocalPosition(camPos.x, camPos.y, camPos.z);
    }
    cameraRig.setLocalEulerAngles(camPitch + lookOffPitch, camYaw + lookOffYaw, 0);
    // ⚑ S80: …and then the head, if the player is turning a device. The rig is
    // the seat; this is the look. Nothing above it changes, in any era.
    applyMotionLook();
    publishNow(); // ?debug=1 live "you are here" readout

    // ── cluster / ceiling / Close + the O7 choreography (reinterp only) ──
    if (options.reinterp) {
      // THE WAKE (S84): its existing dark hold + ramp now runs independently
      // during the entrance so the room becomes visible in mid-flight. It may
      // reach full light before landing, but the machine still waits for the
      // camera: light timing changed; the 12 s path and boot hand-off did not.
      if (wakeActive) {
        wakeT += dt;
        applyRoomLight(wakeLightK(wakeT));
        if (!descentActive && wakeT >= WAKE_DARK_SECONDS + WAKE_RAMP_SECONDS) finishWake();
      }
      if (revealReturn > 0) {
        revealReturn -= dt;
        if (revealReturn <= 0) { // level back out after the upward glance
          startCamMove({ x: camPos.x, y: camPos.y, z: camPos.z, pitch: 0, yaw: camYaw }, 0.7, revealConducted);
        }
      }
      if (morphDemoIn > 0) {
        morphDemoIn -= dt;
        if (morphDemoIn <= 0 && cluster && options.morphDemo) driveMorph(options.morphDemo);
      }
      cluster?.update(dt);
      ceiling?.update(dt);
      cloud?.update(dt);
      // ⚑ S101 — the room goes once the sky is on its way (see `enterClose`).
      if (closeRoomPending && cloud && cloud.open >= 0.45) {
        for (const id of closeRoomPending) {
          const e = app.root.findByName(id);
          if (e instanceof pc.Entity) e.enabled = false;
        }
        closeRoomPending = null;
      }
      spine?.update(dt);

      // R28-1 movement prototype: the blink timer + marker visibility. The
      // cut happens at the BOTTOM of the 'out' fade (screen is fully black),
      // never mid-fade — no smooth travel, ever.
      if (blinkPhase === 'out') {
        blinkT += dt;
        const k = Math.min(1, blinkT / BLINK_OUT_SECONDS);
        if (blinkOverlay) blinkOverlay.style.opacity = k.toFixed(3);
        if (k >= 1) {
          if (blinkTargetNode) performSeatCut(blinkTargetNode);
          blinkTargetNode = null;
          blinkPhase = 'in';
          blinkT = 0;
        }
      } else if (blinkPhase === 'in') {
        blinkT += dt;
        const k = Math.min(1, blinkT / BLINK_IN_SECONDS);
        if (blinkOverlay) blinkOverlay.style.opacity = (1 - k).toFixed(3);
        if (k >= 1) {
          blinkPhase = null;
          if (blinkOverlay) blinkOverlay.style.opacity = '0';
        }
      }
      if (cluster && movementNodes) {
        const busy = scriptedBusy() || blinkPhase !== null;
        movementNodes.refresh(cluster.era, seatYaw, busy);
        if (!moveHintShown && !moveHintDismissed && !busy && moveHint) {
          if (movementNodes.available(cluster.era, seatYaw).length > 0) {
            moveHintShown = true;
            moveHintT = 0;
            moveHint.style.opacity = '1';
            moveHint.style.pointerEvents = 'auto';
          }
        }
        // it teaches once and leaves — see moveHintT's note
        if (moveHintT >= 0) {
          moveHintT += dt;
          if (moveHintT >= HINT_SECONDS) { moveHintT = -1; dismissMoveHint(); }
        }
      }

      // R28-2a: the active side-message's prop emphasis (data-driven; replaces
      // the R28-0c item-10 hardwired floppy lift — same visual mechanism).
      setPropEmphasis(os.guide?.activeEmphasis ?? null);
      // R28-2c: kept-item marks (persistent, player-authored — see above)
      syncBelongingsMarks();

      // R28-2b: the tape system's own clock (a tape playing back IS a clock,
      // unlike the guide thread's pure condition polling) — os.paused freezes
      // it exactly like it freezes everything else (Esc/pause law).
      if (tapes) {
        tapes.update(dt, os.paused);
        syncTapeAudio();
        // ⚑ S86: a tape that runs to its end now GOES HOME on its own (see
        // tapes.ts), and that is a prop change nobody clicked — so the shelf/
        // slot pair has to be re-synced from the loop, not only from the tap.
        // Cheap: syncTapeProps only toggles three `.enabled` flags.
        if (tapes.inserted !== tapesLastInserted) {
          tapesLastInserted = tapes.inserted;
          syncTapeProps();
        }
        tapeAudio?.setGamePaused(os.paused);
        // ⚑ S109 — the room bed on the same frame clock, and under the same two
        //   laws: the mute button and Esc/pause. Audio behind the menu does not
        //   keep playing silently; it stops. ("The frame never plays.")
        roomBed.setGamePaused(os.paused);
        roomBed.update(dt);
        if (tapeCaption) {
          const cap = tapes.activeCaption;
          // ⚑ S89 — TAPE IDENTITY. No tape playing (nothing to caption) and the
          // pointer is over/holding a shelf tape: name it, so "which one is
          // this" is answered before a press commits to playing it, not after.
          const hoverText = !cap && !tapes.inserted && hoveredTapeId
            ? `◈ ${tapes.def(hoveredTapeId).shelfLabel}` : null;
          const text = cap ?? hoverText;
          tapeCaption.textContent = text ?? '';
          tapeCaption.style.opacity = text ? '1' : '0';
        }
        if (tapeMuteBtn) {
          const show = !!tapes.inserted;
          tapeMuteBtn.style.opacity = show ? '1' : '0';
          tapeMuteBtn.style.pointerEvents = show ? 'auto' : 'none';
        }
      }
      // R28-2d-iv: the NetVision Player's audio slot — same bus, same
      // Esc/pause law (the tapes block above already re-asserts
      // setGamePaused every frame the bus exists; this only needs the sync).
      syncNetvisionAudio();

      // gaze-dwell: only once the cluster has been revealed (the E1 dark-
      // surround law), never under a ?facet= override, and only for facets the
      // era's table marks promotable (tier hero|set — fog stays unresolved)
      if (niche && cluster && !options.facet && cluster.state !== 'sealed' && !options.close) {
        const table = cluster.eraTable();
        const gz = table?.pull.gaze;
        if (table && gz && table.default !== 'all') {
          const fwd = camera.forward;
          let best: FacetState | null = null;
          let bestDot = COS_GAZE;
          for (const s of niche.stations) {
            gazeDir.sub2(s.pos, camPos).normalize();
            const d = gazeDir.dot(fwd);
            if (d > bestDot) { bestDot = d; best = s.facet; }
          }
          const entry = best ? table.facets[best] : undefined;
          if (best && entry && (entry.tier === 'hero' || entry.tier === 'set') && best !== table.default) {
            dwellMs = dwellFacet === best ? dwellMs + dt * 1000 : dt * 1000;
            dwellFacet = best;
            if (dwellMs >= gz.dwellMs && gazeFg !== best) {
              niche.setFacet(best);
              gazeFg = best;
              const tag = `niche:dwell:${best}`; // Ethics #10 — the player's own act
              if (!ledger.tags.includes(tag)) ledger.tags.push(tag);
            }
          } else if (dwellMs > 0 && gz.decay) {
            dwellMs -= dt * 1000;
            if (dwellMs <= 0) {
              dwellMs = 0;
              dwellFacet = null;
              if (gazeFg) { niche.setFacet(table.default as FacetState); gazeFg = null; } // recedes; never latched
            }
          }
        }
      }
    }

    const nowBack = isBackYaw();
    if (nowBack !== facingBack) {
      facingBack = nowBack;
      if (facingBack) os.markWitnessSeen(); // turning around answers the nudge
      onCrossed(facingBack);
    }

    // cold creep: pulse the witness side into the edges while it goes unseen
    if (os.hasUnseenWitness && !facingBack) {
      coldPhase += dt;
      const pulse = 0.55 + 0.25 * Math.sin(coldPhase * 2.0); // 0.30–0.80, clearly felt
      coldCreep.style.opacity = pulse.toFixed(3);
    } else {
      coldPhase = 0;
      coldCreep.style.opacity = '0';
    }

    if (glitchT > 0) {
      glitchT = Math.max(0, glitchT - dt);
      const k = glitchT / Math.max(glitchDur, 0.001);
      glitch.style.opacity = (0.82 * k).toFixed(3);
      glitch.style.transform = `translateY(${(Math.sin(glitchT * 60) * 1.5 * k).toFixed(2)}px)`;
    } else if (glitch.style.opacity !== '0') {
      glitch.style.opacity = '0';
      glitch.style.transform = 'translateY(0)';
    }

    // S1.0: the hint alone carries the beat (Sérgio: no blur needed)
    if (!options.close && os.isOff !== offShown) {
      offShown = os.isOff;
      offHint.style.opacity = offShown ? '1' : '0';
    }

    os.update(dt);
    syncRacketDemo(); // the room mirrors the diagram's pose (see its doc)
    if (os.dirty) { frontTex.upload(); os.dirty = false; }
    /**
     * ⚑ S106 — the record READS the era rather than being told it. Two
     * independent paths set the room's decade (the played `driveMorphSpace`
     * and the `?era=` review jump), and this project's own history says a
     * surface wired to one of two paths is a surface that is wrong on the
     * other. `setEra` early-returns when nothing moved, so this is a pointer
     * compare per frame and never a redraw.
     */
    witness.setEra(os.era);
    witness.update(dt);
    if (witness.dirty) { backTex.upload(); witness.dirty = false; }
    // ⚑ the LIVE camera pose, every frame — so pressing the phone can lift it to
    //   the hand from wherever she is actually looking, without depending on a
    //   seat cut having happened first. The held pose is still computed ONCE, at
    //   the moment of pick-up, so the phone stays where it was raised.
    era3Devices?.noteSeat({ x: camPos.x, y: camPos.y, z: camPos.z, pitch: camPitch, yaw: camYaw });
    // ⚑ the RESTING prop hides while its screen is in the hand, so the object is
    //   never in two places at once. `performSeatCut` already did this for the
    //   seat path; the press path needs the same guard, and doing it here covers
    //   both without either having to know about the other.
    if (era3Devices) {
      const restPhone = room?.props.get('w_phoneDevice');
      if (restPhone) restPhone.entity.enabled = !era3Devices.phoneInHand;
    }
    era3Devices?.tick(dt); // Session 37: uploads each device screen once, the first dirty frame

    if (os.inDesktop) flipBtn.style.display = 'block';
  });

  // ── the E1 two-temperature rig (§2-E1) — TWO LIGHTS FIGHT FOR ONE ROOM ──
  // Warm = life (lamp + fill), cool = the system (moon window + monitor + the
  // cold rear). Target ~70% warm / 30% cool in the lit state. Every colour here
  // is the room's EXISTING approved hue (era1.json) — rebalanced, not invented.
  // O1 (pre-power) is the cool moon-wash alone; O2 lights the lamp and lets its
  // amber pool over-throw the WHOLE room (Quest: faked with range/falloff, no
  // shadows). Only in reinterp; the shipped flow keeps era1.json values.
  function setLight(id: string, intensity: number, range?: number): void {
    const e = app.root.findByName(`light-${id}`);
    if (e instanceof pc.Entity && e.light) {
      e.light.intensity = intensity;
      if (range !== undefined) e.light.range = range;
    }
  }
  /** the wake's one dial, k = 0 (the room as you find it: moonlight through
   *  the window, lamp cold, monitor dark) … 1 (the O2 lit state, unchanged
   *  from what shipped: the lamp owns the room, cool stays an accent). The
   *  two temperatures still FIGHT — this just decides how far each one has
   *  got. k = 1 is byte-identical to the old applyLightsOn() values. */
  function applyRoomLight(k: number): void {
    setLight('roomFill', 0.05 + k * 0.80);   // warm ambient fill (life)
    setLight('lamp', k * 2.9, 5.6);          // amber pool over-throwing wider than real
    setLight('screenGlow', k * 0.32);        // the monitor — the only true cold INTERIOR source
    setLight('moonlight', 0.42 - k * 0.28);  // the window: the only light before the switch
    setLight('witnessCold', 0.12 + k * 0.38); // the cold rear, dimmed so the front stays warm
  }
  function applyLightsOn(): void { // O2: the lit state
    applyRoomLight(1);
  }
  // NOTE (Session 34): per-era lighting from E2 on is NOT owned here — it is
  // data/room/cluster.json's `rigs` table, applied by cluster.ts's applyRig()
  // at the end of every morphToEra() call (clusterMorph.ts's own header is
  // explicit: "Lights are NOT morphed here — the cluster's era rigs own
  // them"). The S2R.0a daylight cue (2003 DAYLIGHT replacing E1's night/lamp
  // rig) is implemented THERE (the `e2` rig's `moonlight` target), not as a
  // parallel function here — an app.ts-side override would only be clobbered
  // moments later by applyRig(toEra, animate) inside cluster.morphToEra().

  /**
   * ⚑ EVERY ERA SHIFT LANDS HERE, and since S67 every one of them is a
   * RELOCATION: the piece lifts you out of the room, the room changes under
   * you, and it sets you down. See the block above RELOC_POSES for why that is
   * the piece's argument and not a camera flourish.
   *
   * What this replaced, for the record: E1→E2 did NOTHING at all (E1/E2 are
   * single-room eras, so `seatYaws().length > 1` was false and no camera move
   * fired), and E3→E4 was `dollyTo(270, 4.5, autoCam)` — a 4.5 s arc across
   * 8.8 m and 180° of yaw, i.e. a 3.67 m/s / 75 °/s peak against an 0.43 m/s /
   * 9.1 °/s envelope, under a comment that claimed it "rise[s] up over thirty
   * years of rooms", which a yaw dolly does not do. Both are now the same
   * three legs E2→E3 has flown since S61, whose numbers are untouched.
   */
  /**
   * ⚑⚑ S86 — THE ASCENT NOW BEGINS ON THE PRESS, AND THAT IS THE WHOLE BEAT.
   *
   * Sérgio, 2026-08-15: *"When we press update shouldn't we ascend? Doesn't
   * make sense to do it after the update is done, because that way we can see
   * the room updating as well in sync. So when we get down the computer should
   * say 'welcome back Daniel'."*
   *
   * WHAT IT WAS: `os.onEraShift` fired at the END of the restart, so the order
   * was install (7.5 s) → restart (2.2 s) → *then* rise/build/descend (21 s).
   * The room aged while the player was up there, but they had already watched
   * the machine finish and go dark; the update and the aging were two
   * sequential events, and the argument that they are the SAME event was
   * nowhere on screen.
   *
   * WHAT IT IS NOW, on one clock (u2, e1→e2, 7/7/7):
   *   t 0.0  I Agree → the rise starts, the changelog types on the monitor
   *          receding below you
   *   t 7.0  the rise lands at the hold pose; the space cascade begins — E1's
   *          lamp-lit night crossfading to 2003 daylight *while you watch*
   *   t 9.7  the ritual's own restart completes: `onEraShift` → the desktop
   *          becomes E2 and the monitor comes back up reading
   *          "Welcome back, Daniel." — from above, small, in a changed room
   *   t 14.0 the descent begins, toward that line
   *   t 21.0 you are in the chair and the machine is greeting you by the name
   *          it holds.
   *
   * The two halves are split so this can happen: `driveMorphSpace()` is the
   * ROOM's half (tapes, kept freeze, the cluster morph, the relocation legs)
   * and may run early; `driveMorph()` keeps owning the DESKTOP's half and is
   * still what `os.onEraShift` calls. `earlyRelocEra` is the handshake — when
   * the press already started the space, the restart must not start it again.
   *
   * ⚑ Nothing about the legs, the easing, the comfort envelope or the skip
   * changed: `beginRelocation`/`endRelocation` are untouched, so a drag during
   * the ascent still looks around (S85's offset) and a still tap still ends it.
   */
  let earlyRelocEra: EraKey | null = null;

  /**
   * ⚑ Which updates lift you on the press. u2 (e1→e2) is the ritual this
   * session's walkthrough actually plays and verifies — "cold boot to the
   * middle of Era 2." u3 plays on the same monitor and would take the same
   * code path, but E3/E4 are S87's fence this week and this session neither
   * enters nor tests them, so u3's timing is deliberately left on the OLD
   * path (morph starts at `onEraShift`, restart-end) rather than changed
   * unwatched. The shape is identical when someone verifies it in-scope;
   * add 'e3' back and delete this note.
   */
  const EARLY_ASCENT_ERAS: ReadonlySet<string> = new Set(['e2']);

  /** the press half: start the room's change and the camera's ride, now. */
  function beginEraRelocation(era: string): void {
    if (!cluster || !drivenMoves) return;
    if (!EARLY_ASCENT_ERAS.has(era)) return;
    if (earlyRelocEra) return;                          // one ascent per ritual
    if (!relocationFor(cluster.era, era as EraKey)) return; // no plan → old path
    earlyRelocEra = era as EraKey;
    driveMorphSpace(era as EraKey);
  }

  function driveMorph(era: EraKey): void {
    if (!cluster) return;
    if (earlyRelocEra === era) {
      // the press already lifted us and the room is already aging; all that is
      // left for the restart to do is the desktop, which os.ts has just done.
      earlyRelocEra = null;
      return;
    }
    earlyRelocEra = null;
    os.setDesktopEra(era);
    driveMorphSpace(era);
  }

  function driveMorphSpace(era: EraKey): void {
    if (!cluster) return;
    // R28-2b: every era shift resets the tape system BEFORE the morph removes
    // the physical props — an in-flight play is an abrupt stop (filed like
    // any other outcome, nothing hidden), and the shelf/slot entities return
    // to their "nothing inserted" baseline so a later debug jump back to E1
    // never finds a tape stuck invisible from a stale `.enabled` toggle.
    if (tapes) {
      tapes.handleEraShift();
      syncTapeProps();
      syncTapeAudio();
    }
    // R28-2c: re-assert the kept set before every morph (idempotent) — the
    // belongings beat's payoff plumbing. Kept props are frozen at their exact
    // r1/E1 fold through this and every later era shift; un-kept eligible
    // props age/retire exactly as reinterp_deltas.json already dictates.
    if (os.belongings) cluster.setKeptIds(os.belongings.kept);
    const fromEra = cluster.era; // read BEFORE morphToEra reassigns it
    era3Devices?.setEra(era); // Session 37: the three device screens, e3+ only
    // S2R.0a: cluster.morphToEra() below calls applyRig(era, animate), which
    // owns the E2 daylight cue (data/room/cluster.json's `e2` rig) in the
    // SAME morph beat as the room aging — see the note above applyLightsOn().
    const key = `${fromEra}-${era}`;
    const plan = drivenMoves ? relocationFor(fromEra, era) : undefined;
    // the space's half is scheduled around the camera's legs; passing the plan
    // (or an explicit null) keeps the two halves reading the SAME numbers.
    cluster.morphToEra(era, true, plan ?? null);
    if (plan) {
      beginRelocation(key, plan);
    } else if (relocationFor(fromEra, era)) {
      // ?descent=0: whatever opts out of the entrance opts out of this too.
      // The room still ages; you are simply already in the destination seat
      // when it does, which is the pre-S61 grammar.
      seatCut(relocationFor(fromEra, era)?.seat ?? cluster.homeYaw);
      if (fromEra === 'e2' && era === 'e3') era3Devices?.beginArrival();
    } else if (seatYaws().length > 1 && seatYaw !== cluster.homeYaw) {
      dollyTo(cluster.homeYaw, 2.4, false); // era jumps re-seat at the lead room
    }
  }

  /** the Close: the room goes dark and gives way to the constellation —
   *  shared by the ?close=1 review param and the debug panel's button */
  /** ⚑ S101 — the room is NOT switched off on the same frame any more; see
   *  `enterClose`. These are the ids waiting to go, and the cloud's own opening
   *  is the clock. */
  let closeRoomPending: string[] | null = null;

  function enterClose(): void {
    if (!cluster || !cloud || cloud.visible) return;
    cluster.applyRig('close', false);
    /**
     * ⚑ AND THE ROOM STAYS FOR A BEAT (S101). The rig snaps the lights out on
     * this frame, so what is left is a dark room with the glow-stars over the
     * seat still lit — they are emissive, and they are the only thing in the
     * ceiling that ever was. The constellation opens out of exactly that patch,
     * and only once it is under way does the room itself go. Cutting the room on
     * the same frame (which is what this did) threw away the entire reason the
     * stars are up there: you have to see them ON a ceiling for them to become
     * anything.
     */
    closeRoomPending = [
      'era1-room',
      'fluid-niche',
      'cluster-shell',
      'ceiling-witness',
      'desktop-screen',
      'witness-screen',
      'movement-nodes',
      'era3-device-workstation',
      'era3-device-tablet',
      'era3-device-phone',
      // ⚑ AND ERA 4's TWO SURFACES (S101). They were missing, and the laptop's
      //   lid is enabled for the whole of `e4` — so the era that ACTUALLY
      //   reaches this function left a lit screen plane hanging in the
      //   constellation after the room around it had gone. The visor's
      //   per-frame gate already switches it off at the hand-off; naming it
      //   here too means the Close does not depend on that gate still running.
      'era3-device-laptop',
      'era4-visor'
    ];
    // Round 18: never black — the constellation sits in a night-blue sky
    if (camera.camera) camera.camera.clearColor = closeBackdropColor();
    cloud.show();
    camPos.set(EYE.x, EYE.y, EYE.z);
    camPitch = 6;
    camYaw = 0;
    cameraRig.setLocalPosition(camPos.x, camPos.y, camPos.z);
  }

  if (options.reinterp) {
    // review tools (?close / ?era / ?reveal / ?morph) bypass the O1 overlay —
    // they exist to look at 3D states, not to play the opening
    if (options.close && cluster && cloud) {
      enterClose();
    } else if (options.era && cluster) {
      // `settled`: a review jump wants the room's SETTLED state, not the
      // S2R.0/S2R.1 arrival narrative (silence → Lamby) — same spirit as
      // skipping O1/O3 below.
      os.setDesktopEra(options.era, true);
      // lighting: cluster.morphToEra(options.era, false) below applies that
      // era's rig (data/room/cluster.json), which owns lighting from E2 on.
      cluster.morphToEra(options.era, false); // the era's open cluster + rig, settled
      // Session 37: review jumps era-gate the device screens too. S61: and
      // `settled` skips the arrival (dark → boot → install), matching
      // os.setDesktopEra(options.era, true) two lines above.
      era3Devices?.setEra(options.era, true);
      if (options.facet && niche) niche.setFacet(options.facet); // override wins
      // boot SEATED at the era's home room (E4 boots already turned — the TURN)
      seatYaw = cluster.homeYaw;
      const sp = seatPose(seatYaw);
      camPos.set(sp.x, sp.y, sp.z);
      camPitch = sp.pitch;
      camYaw = sp.yaw;
      cameraRig.setLocalPosition(camPos.x, camPos.y, camPos.z);
      spine?.onEra(options.era); // S58: seed the conductor to match the jump
    } else if ((options.reveal || options.morphDemo) && cluster) {
      applyLightsOn();          // E1 lit state…
      cluster.reveal();         // …already past the first filing (O7)
      if (options.morphDemo) morphDemoIn = 4.0; // then the update opens the world
      camPos.set(ESTABLISH.x, ESTABLISH.y, ESTABLISH.z);
      camPitch = ESTABLISH.pitch;
      camYaw = 0;
      cameraRig.setLocalPosition(camPos.x, camPos.y, camPos.z);
    } else {
      // fresh load (past the interim log-in panel): the room is already there,
      // dark, and you come DOWN into it (S48) while it WAKES on its own
      // (S84, adopting Sérgio's device-pass call). No board-look gate, no power button, no teaching
      // window; nothing to press at any point.
      applyRoomLight(0);
      camYaw = 0;
      if (drivenMoves) {
        // S53: one arc, off-centre → the seat, aim resolving with position.
        // The pose is committed BEFORE startCamMove because that function reads
        // the live camera as the curve's start (and takes the shortest yaw).
        camPos.set(DESCENT_FROM.x, DESCENT_FROM.y, DESCENT_FROM.z);
        camPitch = DESCENT_FROM.pitch;
        camYaw = DESCENT_FROM.yaw;
        descentActive = true;
        wakeActive = true;
        wakeT = -WAKE_DURING_DESCENT_DELAY;
        startCamMove({ x: EYE.x, y: EYE.y, z: EYE.z, pitch: 0, yaw: 0 },
          DESCENT_SECONDS, true, DESCENT_VIA);
      } else {
        camPos.set(EYE.x, EYE.y, EYE.z);
        camPitch = 0;
        wakeActive = true;
        wakeT = 0;
      }
      // the facing is committed HERE, not left to the first per-frame pass —
      // otherwise the opening frame renders level and the pitch snaps on frame 2
      cameraRig.setLocalPosition(camPos.x, camPos.y, camPos.z);
      cameraRig.setLocalEulerAngles(camPitch, camYaw, 0);
    }
  }

  // dev travel panel (?debug=1 — the shipped build's system, ported; Round 18)
  if (options.reinterp) {
    mountDebugPanel(os, {
      app,
      // S58: route through the REAL transition path (os.onEraShift), not
      // driveMorph alone — driveMorph only advances the room/desktop-era
      // machinery; os.onEraShift additionally calls spine?.onEra(era), which
      // is what actually advances the narrative conductor (sends arm, updates
      // fire, E1 state retires on schedule). Without it the panel's era jump
      // desynchronised the spine from the room, which read as a locked build
      // (docs/REINTERP_PLAYTHROUGH_E2_2026-07-26.md ROOT CAUSE #1).
      onEra: (era) => os.onEraShift?.(era),
      // dev camera jump (?debug=1 only): window.__camProbe(yaw, pitch) teleports
      // to that facing's SEAT pose — how review screenshots are taken
      onCamProbe: (yaw, pitch) => {
        seatYaw = yaw;
        const sp = seatPose(yaw);
        camPos.set(sp.x, sp.y, sp.z);
        camYaw = sp.yaw;
        camPitch = pitch !== 0 ? pitch : sp.pitch;
        camMove = null;
      },
      // ⚑ S72 (see panel.ts's DebugOpts.poses): the code-resident tables plus
      // the DEVICE seats, which are authored in data/room/nodes.json and reach
      // the tool through the live node graph rather than a second read of it.
      // A node without its own `pose` is a base room seat, so it resolves
      // through the same seatPose() the cut itself calls (performSeatCut).
      poses: () => ({
        ...CAMERA_POSES,
        deviceSeats: (movementNodes?.nodes ?? []).map((n) => ({
          id: n.id, label: n.label, eras: n.eras,
          pose: n.pose ?? seatPose(n.seatYaw)
        }))
      }),
      onReveal: () => cluster?.reveal(),
      // ⚑ S67 (check-spec C6's rule, applied by hand because C6 can only see
      // os.ts's debugJump ids): every new beat gets a button. This one replays
      // a relocation from its own starting seat and era WITHOUT needing the
      // update ritual that normally fires it — the only way to judge three
      // ~20-45 s camera moves by feel without playing thirty years first.
      onRelocate: (from, to) => {
        if (!cluster) return;
        const plan = relocationFor(from, to);
        if (!plan) return;
        const start = from === 'e3' ? 90 : 0; // where that era is actually seated
        os.setDesktopEra(from, true);
        era3Devices?.setEra(from, true);
        cluster.morphToEra(from, false, null); // put the space in the FROM state
        seatCut(start);
        os.setDesktopEra(to, true);
        era3Devices?.setEra(to, true);
        cluster.morphToEra(to, true, plan);
        beginRelocation(`${from}-${to}`, plan);
      },
      onClose: enterClose,
      onFacet: (f) => niche?.setFacet(f),
      onFlip: doFlip,
      // ⚑ S80 (check-spec C6's rule, applied by hand for the same reason S67
      // did): look-mode 3 gets buttons, or it is a mode only a phone can see.
      onMotionSim: motionSimulate,
      onRecentre: recentreView,
      onFov: (deg) => { if (camera.camera) camera.camera.fov = deg; },
      motionDiagnostic: () => ({
        state: motionState,
        yawZero: motionYawZero,
        angles: { ...motionAngles },
        screenAngle: motionScreen,
        viewport: viewportOrientation(),
        resolved: { yaw: vResolved.y, pitch: vResolved.x, roll: vResolved.z },
        events: {
          orientationchange: legacyOrientationEvents,
          screenChange: screenOrientationEvents
        },
        fov: camera.camera?.fov
      }),
      sends: sendRt?.ids,
      onSend: (id, outcome) => sendRt?.fire(id, outcome)
    });
  }

  app.start();
  return app;
}
