/**
 * THE THREE-SCREEN ROOM (Session 37, E3-i foundation; Session 38, E3-ii wires
 * the laptop + tablet). docs/REINTERP_E3_ADAPTATION_SPEC_2026-07-12.md's
 * R29-b DEEP REVISION: "between 2003 and 2016 the machine stopped being a
 * place you sit. It became every screen you own." Room 2 (Vera, 2016) gets
 * three device screens — the laptop (desk), the tablet (bed), the phone
 * (nightstand) — each its own offscreen canvas textured onto its own plane,
 * the SAME technique src/engine/screenTexture.ts already gives the desktop
 * monitor and the witness wall (never duplicated, only reused at smaller
 * sizes for the tablet/phone per the spec's production note).
 *
 * SESSION 38 (E3-ii, the GraceQueue pattern strip + card set): the laptop now
 * runs src/room/graceQueueLite.ts behind its "Sign in" — the reinterp-built
 * moderation loop (ONE card at a time, big type, no crowding, per Session
 * 37's own maximized-UI lesson), NOT a straight port of the shipped
 * (non-reinterp) build's dense graceQueue.ts, though it borrows that file's
 * documented lane grammar (member/system/Lambient bands) verbatim per the
 * brief. The tablet is now DATA-DRIVEN from the same data/dialog/s3_queue.json
 * the laptop reads: approved cards appear with hearts + lamb-badges; cards
 * sent to review are simply ABSENT; Mira's card, if let stand, pins to the
 * top with a one-line comments teaser. The phone is UNCHANGED (still Session
 * 37's static lock/notification shell — Noa's ask per S3R.4 arrives E3-v).
 *
 * DIRTY DISCIPLINE (Quest budget law): the laptop/tablet no longer draw only
 * once — they redraw+re-upload exactly when `graceQueueLite.version` changes
 * (a real state change: sign-in, approve, move-to-review, let-it-stand),
 * never on a ticking clock or per-frame. The phone still draws once and never
 * again, per Session 37's original law (nothing about it changes this
 * session).
 *
 * Lambient's marks (the E2 dispersal payoff, master plan §5b "the watcher"
 * thread): a tiny badge on all three screens, drawn from the SAME fixed
 * FRAG offset grammar Session 33 used for the uninstall-report scatter
 * (src/desktop/apps/update.ts) — here rendered SETTLED (no animation; the
 * fragments have already migrated and arrived, per u3's own line).
 */
import * as pc from 'playcanvas';
import { makeScreenTexture, makeScreenEntity } from '../engine/screenTexture';
import { ledger } from '../state/ledger';
import { setEra3Lift, type EraKey } from './cluster';
import { FamilyCallsApp } from '../desktop/apps/familyCalls';
import { GraceQueueLite } from './graceQueueLite';
import { e4Bridge, claimRoomMount } from '../desktop/apps/space';
import { ERA1, ERA1_CANVAS } from '../desktop/theme/era1';
import { px } from '../desktop/theme/chrome';
import d from '../../data/strings/era3_devices.json';
import queue from '../../data/dialog/s3_queue.json';

/** Session 39 (E3 screen-format pass): each canvas's logical resolution is
 *  now chosen to MATCH its panel plane's world aspect exactly (a fixed
 *  logical-px-per-metre density on both axes — no non-uniform stretch is
 *  possible when w/h here equals PLACEMENT[name].size.w/h exactly).
 *
 *  laptop: PLACEMENT.laptop.size = 0.52 × 0.30m → 26:15 (~1.733:1, the 2016
 *  flat panel's real widescreen shape). Session 37 left this at the OLD
 *  CRT-era 512×384 (4:3) — a canvas built for a squarer screen, enlarged
 *  onto the new wide plane, so every pixel was stretched ~30% wider than
 *  tall. Fixed at 676×390 = 26k×15k for k=26: 676/0.52 = 390/0.30 = 1300
 *  logical px/m on both axes — square pixels, natively widescreen, no
 *  re-derivation needed elsewhere (hitPlane() already takes logical w/h as
 *  params, so click routing scales automatically — see hitPlane below).
 *  tablet: PLACEMENT.tablet.size = 0.16 × 0.22m → 8:11 (0.7273). Was
 *  220×300 (0.7333) — a ~0.8% mismatch, small but real. Fixed at 216×297
 *  (=16k×22k, k=13.5→ use 8k×11k, k=27): 216/0.16 = 297/0.22 = 1350 px/m,
 *  size kept close to the original for continuity (feed-overflow behaviour
 *  documented in Session 38 is unaffected, not this session's scope).
 *  phone: PLACEMENT.phone.size = 0.07 × 0.14m → exactly 1:2. Was 140×260
 *  (0.538) — the most visibly squashed of the three. Width 140 already
 *  matched (0.07 × 2000px/m); only height was wrong. Fixed at 140×280
 *  (140/0.07 = 280/0.14 = 2000 px/m). */
const LOGICAL = {
  laptop: { w: 676, h: 390, scale: 3 },
  phone: { w: 140, h: 280, scale: 2 },
  /** ⚑ THE VISOR (S76) draws no canvas of its own — it is textured with
   *  `DesktopOS.canvas`, the piece's one UI surface, at that canvas's own
   *  logical size. Same canvas, same FILTER_NEAREST, same `?flat=1`: only the
   *  mount point changed, from a monitor to a thing on your face. */
  visor: { w: ERA1_CANVAS.width, h: ERA1_CANVAS.height, scale: 1 }
} as const;

/** Room 2 (Vera, west) world placements — Session 37 FABLE/SÉRGIO CHECK:
 *  computed from tools/gen_rooms.mjs's local bedroom template (ox=-3.88,
 *  oz=0.7, whole-room yaw F=90; world = (ox + localZ, localY, oz - localX))
 *  then eyeballed/screenshot-verified in the browser this session — spatial
 *  FEEL, not a measured fact; a later session may retune any of these.
 *
 *  laptop: sits in the existing desk CRT's screen gap (the room's generic
 *  "computer" assembly from the template IS repurposed as 2016's laptop —
 *  no new geometry; a real hinged laptop body is a later polish pass, not a
 *  foundation blocker), so its plane must face the SAME direction the
 *  chair already looks (world +X, per seatPose(90)'s chair sitting at less-
 *  negative x than the desk) — vertical, like the desktop monitor.
 *  tablet: lies flat on the bed (screen up) — no rotation needed, the
 *  default 'plane' primitive already faces +Y.
 *  phone: lies flat on the nightstand (screen up) — same, no rotation. */
const PLACEMENT = {
  laptop: {
    // Sérgio's live readability note (Session 37): the shipped-shell CRT
    // screen read too small — swapped for a period-correct 2016 FLAT PANEL
    // (tools/gen_rooms.mjs's `flatPanel`, Room 2 only) and pulled ~0.19m
    // closer to the chair. This plane sits proud of `w_flatPanelScreen`'s
    // real-world face (measured the same way the CRT's was: box center
    // world x ≈ -5.005, thin axis half-extent 0.01 → box max x ≈ -4.995).
    // Session 66: the desk was measured and re-placed (it rendered 0.9 m deep
    // against an authored 0.6), taking the flat panel with it — this plane
    // rides the panel's new face at x ≈ -5.24.
    // ⚑ y 1.1 → 0.97, 2026-08-21. The monitor stopped being four floating boxes
    //   and became a Kenney mesh that SITS ON THE DESK (y 0.75, 0.383 tall), so
    //   the plane that used to ride a box hovering at 1.1 now rides a real
    //   screen face. A plane left at the old height reads as a display detached
    //   from its own monitor — which is exactly how it rendered before this fix.
    // ⚑ FITTED TO THE MESH, NOT GUESSED — 2026-08-21. Every previous number here
    //   was an estimate that moved whenever the monitor did, and Sérgio kept
    //   photographing the result: "the OS is bigger and lower than the screen
    //   model." Measured live instead: computerScreen renders as TWO parts, and
    //   the second is the panel — centre y 1.045, 0.652 x 0.398, depth 0.056 at
    //   x -5.33, so its glass face is x -5.302. The plane sat at x -5.20, a full
    //   10 cm in FRONT of the glass, 15 mm low, and wider than the panel.
    //   ⚑ THE LESSON, since this is the fourth refit: the model knows where its
    //   screen is. Ask it (`meshInstances[].aabb`) instead of estimating from the
    //   prop's outer box, which includes bezel, chin and stand.
    // ⚑ THE PANEL IS RAKED 8°, AND THIS PLANE NOW SHARES THE RAKE — 2026-08-24.
    //   Sérgio, sending the model in Preview: "the screen has a natural angle."
    //   It does, and it is IN THE MESH: computerScreen.glb's second primitive
    //   (material `metal`) is a single quad — the glass — with normal
    //   (0, 0.139, -0.99), i.e. 8.0° off vertical, top leaning away. Read from
    //   the GLB rather than the runtime AABB, because an AABB cannot express a
    //   rake: it reported the panel as 0.652 × 0.398 when the face is really
    //   0.652 × 0.402 tipped back, and fitting to that box is what left an
    //   upright plane crossing an angled screen — flush at the bottom edge,
    //   ~56 mm proud at the top.
    // ⚑ The world numbers, derived not eyeballed: model quad spans local
    //   x -0.3859…-0.0068, y 0.0556…0.2870, z 0.0358…0.0683; × scale 1.72,
    //   pivot-shifted by (-cx, -baseY, -cz), turned by propYaw 90 + model yaw
    //   180 = 270, dropped at the prop's (-5.33, 0.75, 0.7). That puts the
    //   glass centre at (-5.3301, 1.0446, 0.6999) with world normal
    //   (0.990, 0.139, 0). This plane sits 3 mm proud ALONG THAT NORMAL, so it
    //   clears the glass by the same 3 mm everywhere instead of only at one
    //   edge. If the monitor's scale, yaw or position moves, re-derive — the
    //   arithmetic is in this comment, so it can be redone rather than guessed.
    pos: { x: -5.327, y: 1.045, z: 0.7 },
    // ⚑ 0.52 × 0.30 → 0.60 × 0.35, 2026-08-21. Sérgio, on a screenshot: "the
    //   computer screen is too small for the size of the area of the desktop."
    //   The whole of Era 3 is read off this panel — a testimony, a rule, a
    //   rationale, a manual reference and a verse, all at once — and a monitor
    //   sized for physical realism made that a squint. The model grew with it
    //   (models.json computerScreen, scale 1.3 → 1.65); this plane must always
    //   be re-fitted when that number moves, or the display floats off its face.
    // ⚑ 0.585 × 0.355 → 0.645 × 0.372, 2026-08-24. Sérgio drew pink corners on a
    //   screenshot to mark where the limits are, and the display was sitting
    //   well inside them. It now spans 98.9% of the glass width. The HEIGHT is
    //   not 98.9% of the glass, on purpose: the laptop canvas is 676 × 390
    //   (1.733) and the glass is 1.623, so filling both axes would squash every
    //   glyph 6% horizontally — on a FILTER_NEAREST pixel surface that is
    //   visible. Instead the canvas aspect is preserved and ~15 mm of bare glass
    //   is left above and below. It does not read as a letterbox: the monitor
    //   prop carries a dark tint (its `color` in reinterp_deltas.json), so
    //   uncovered glass is the same near-black as the bezel around it.
    size: { w: 0.645, h: 0.372 },
    // ⚑ x 90 → 82: the 8° rake. 90 gave normal (1, 0, 0) — verified in-browser at
    //   Session 37, and correct for a plane that had no screen behind it. 82
    //   gives (0.990, 0.139, 0), which IS the mesh quad's normal. Sign checked
    //   against PlayCanvas's own euler→quat rather than assumed: 98 tips the
    //   wrong way (0.990, -0.139, 0), i.e. top toward the player.
    //   `hitPlane` needs no change — it reads the entity's world transform
    //   columns, so the rake arrives in the ray test for free, and the local
    //   Z basis stays predominantly -Y (0.139, -0.990, 0), which is what
    //   Session 38's `v = 0.5 + lz/hWorld` calibration depends on.
    euler: { x: 82, y: 90, z: 0 } // faces the chair, raked back like the glass
  },
  /**
   * ⚑ ROOM 3's VISOR (S76) — the seam S74 left, taken up.
   *
   * `data/room/reinterp_deltas.json`'s `e_headsetVisor` is a 0.09 × 0.09 × 0.16
   * box on the desk's front strip at (5.45, 0.87, 0.05) with yaw 270, and its
   * `_doc` says in as many words: *"⚑ THE SEAM for Stage 2 — this is where the
   * 2D canvas mounts as the era's screen surface. Left CLEAN on purpose."*
   *
   * The plane sits just proud of the face turned toward the seat. Maya's seat
   * (`seatPose(270)`) puts the eye at x 4.4 looking along +X, and yaw 270 turns
   * the box's 0.16 m extent into its DEPTH, so the face the player sees is
   * 0.09 wide × 0.09 tall at x ≈ 5.37. The plane is 4:3 to match the canvas —
   * 88 × 66 mm, inside that face — and faces −X (euler y 270, the mirror of the
   * laptop's 90). Measured off the authored box, not eyeballed.
   */
  visor: {
    /** ⚑ z 0.30, not 0.05 (2026-08-06). S76 measured the headset at 33.9° off
     *  the seat bearing against a 29.7° horizontal half-FOV — i.e. the era's
     *  opening gesture was OUTSIDE THE FRAME and the player had to drag to
     *  find it. S76 named the fix and could not apply it (the prop data was
     *  outside its fence). +0.25 m brings the bearing to ~20.8°, comfortably
     *  inside, and still clears the CRT/keyboard/folders cluster at z>=0.36.
     *  ⚑ Keep this in step with `e_headsetStand/Visor/Strap` and `e_glasses`
     *  in data/room/reinterp_deltas.json — they move together or the visor
     *  detaches from its own prop. */
    pos: { x: 5.365, y: 0.872, z: 0.30 },
    size: { w: 0.088, h: 0.066 },
    euler: { x: 90, y: 270, z: 0 }
  },
  phone: {
    // y verified in-browser (Session 37): the nightstand's REAL model AABB
    // tops out ~0.73m (not the box-fallback ~0.5m) — this sits just above it.
    // Session 61: and that 0.73 was itself the bug. sideTable.glb was carrying a
    // blanket 1.9 scale nobody had measured, rendering a 1.02 x 0.73 x 0.42 m
    // slab where the room authors a 0.4 x 0.5 x 0.4 nightstand — Sérgio's "box
    // on the floor". data/room/models.json now scales it to its authored box
    // (measured top 0.500), so the phone comes down with the surface it lies on.
    // Session 66: on the nightstand's new position; REST pose only.
    // ⚑ MOVED TO THE DESK, 2026-08-21 — and I moved the PROP here first and left
    //   this behind, which is precisely the mistake I had just written a warning
    //   about for the monitor. Sérgio, on a screenshot: "there is no Phone on the
    //   table, just some boxes… the area of the phone still exists and is not
    //   inside of a phone." A lit portrait rectangle hung in mid-air over the
    //   nightstand showing 9:41 and FloppySheep, with nothing under it.
    //   ⚑ A SCREEN AND ITS DEVICE ARE ONE OBJECT IN TWO FILES. Move either and
    //   the other must follow, every time.
    pos: { x: -5.02, y: 0.756, z: 1.16 },
    size: { w: 0.071, h: 0.152 },
    euler: { x: 90, y: 90, z: 0 } // flat on the desk, screen up, long axis along z
  }
} as const;

/** the intra-room camera SEATS the movement nodes cut to — see nodes.json's
 *  r2-tablet/r2-phone `pose`. Exported so app.ts and nodes.json's authored
 *  values can be cross-checked against the same source during review; the
 *  authoritative copy the engine actually uses is nodes.json (data-driven,
 *  per CLAUDE.md — geometry/layout may live in .ts, but a seat POSE is the
 *  kind of "layout" nodes.json already owns for the base three room seats,
 *  so the device seats follow the same home). FABLE/SÉRGIO CHECK throughout. */
export const DEVICE_SEAT_POSES = {
  // ⚑ Session 66: both seats STOPPED CRANING. S37 biased them closer and S61
  // re-aimed the phone downward, and each was the right local fix for a wrong
  // premise — that the way to read a 7 cm object lying on furniture is to put
  // your face near it. The device is lifted to the hand now (`holdDevice`),
  // so these are ordinary seated poses with a gentle downward gaze, and the
  // held pose is DERIVED from them (a retuned seat brings its device along).
  'r2-phone': { x: -2.42, y: 1.14, z: 0.12, pitch: -16, yaw: 90 }
} as const;

function makeCanvas(logicalW: number, logicalH: number, scale: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = logicalW * scale;
  canvas.height = logicalH * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('era3Devices: 2D context unavailable');
  ctx.imageSmoothingEnabled = false;
  ctx.scale(scale, scale);
  return { canvas, ctx };
}

// drawLambMark moved to ../desktop/theme/era3.ts (Session 38, imported above)
// so both this module AND graceQueueLite.ts can use it without a circular
// import between the two (era3Devices.ts already imports GraceQueueLite;
// graceQueueLite.ts needs the same corner mark for its sign-in screen — a
// shared theme-level home avoids the cycle).

// Session 70: `drawTabletShell` is GONE from this file, and so are the theme,
// wrapText and s3_queue imports it needed. The tablet stopped being a static
// consequence surface the moment it grew a job — it now carries the comment
// thread, the template picker and its own hit rects, exactly as the laptop and
// (since S64) the phone do. Its drawing moved to `src/desktop/apps/comments.ts`
// and is reached through `graceQueueLite.drawTablet()`, the same shape S64 used
// when the phone's shell moved out. The feed itself is UNCHANGED in every
// respect but its home: same cards, same hearts, same lamb badges, same
// published still.

// Session 64: `drawPhoneShell` is GONE, and so is its private `wrapPlain`. The
// phone stopped being a static shell the moment it started carrying the era's
// break — it now owns state, a clock and hit rects exactly as the laptop does,
// so its drawing moved to `graceQueueLite.drawPhone()` beside them. Its five
// invented colours moved too, into `src/desktop/theme/era3.ts` (`phoneBg`,
// `phonePanel`, `phoneDim`, `phoneMeta`, `phoneText`) — unchanged in value, and
// no longer in breach of the palette law that says colour lives in the theme.

/**
 * ⚑ THE HELD READ (Session 66) — the era's biggest usability debt, closed.
 *
 * Sérgio, after playing it: *"when you move to markers the objects are just
 * impossible to use and to view"*, and his own fix, which is the right one:
 * *"the other objects when we jump to the marker they should come closer to us
 * so we can 'use' them."*
 *
 * The debt is old and was flagged in its own data: `data/room/nodes.json`'s
 * `_doc` has said since R28-1 that a marker is placed at the seat's own
 * floor-projected (x,z) as *"a deliberate prototype simplification"*. For a
 * ROOM seat that is fine. For a 7 cm phone lying on a nightstand it meant the
 * camera craned down at 38° from 0.77 m at an object the size of a thumbnail,
 * and the era's break — two lines from Malta and a reply field — was staged on
 * it. The content was unreadable at the seat it is read from.
 *
 * So the device comes to the hand instead. Taking a device seat lifts that
 * screen off the furniture to a HELD pose in front of the camera; leaving puts
 * it back. It is the one thing a piece whose law is *you never walk* can still
 * do honestly: you cannot cross the room, but you can pick up your own phone.
 *
 * Three properties worth keeping:
 *  - the held pose is DERIVED from the seat's own camera pose, so it cannot
 *    drift out of frame if a seat is ever retuned;
 *  - click routing needs no changes at all — `hitPlane` reads the entity's live
 *    world transform, so the reply field stays pressable while held;
 *  - the resting box prop hides while its screen is in hand (app.ts), so there
 *    is never a phone on the nightstand AND a phone in front of you.
 *
 * ROLLBACK: `holdDevice(null)` is a no-op path — delete the `holdDevice` call
 * in app.ts's `performSeatCut` and everything returns to the rest poses.
 */
export type HeldDevice = 'tablet' | 'phone' | null;

/**
 * ⚑ THE LAST UPDATE LANDS HERE (S76). `data/dialog/s4_update.json` `_docWhere`
 * carries the argument; this is the wiring. The ritual object itself is
 * unchanged and still owned by `DesktopOS` — the OS runs its clock, files its
 * ledger entry and decides when it is over. This module only decides WHERE it
 * appears, and the answer is the screen the player is actually looking at when
 * Era 3 ends: Vera's laptop, the machine that gave her the work.
 *
 * The canvas offsets centre the ritual's own 512 × 384 logical surface on the
 * laptop's 676 × 390 panel. ⚑ The dialogs keep their 1997 chrome, deliberately:
 * every update in this piece has looked like this, and the acceptance criterion
 * for the era's opening is that the last one feels like all the others.
 */
const RITUAL_OFFSET = {
  x: Math.round((LOGICAL.laptop.w - ERA1_CANVAS.width) / 2),
  y: Math.round((LOGICAL.laptop.h - ERA1_CANVAS.height) / 2)
} as const;

/**
 * ⚑ THE TRIGGER FOR IT, and it is the system's own failure, never the player
 * (CLAUDE.md; Ethics #11). E3's argument is that a person corrects testimony by
 * hand, one item at a time; the update retires the person. So it arms when the
 * correction list is EXHAUSTED — counted from the same data the laptop reads,
 * against the record's own filings, so the two cannot drift apart.
 *
 * ⚑ WHY NOT THE SPINE, which is where every other update is armed: `spine.ts`'s
 * e3 path runs through `offer('s3')` / `offer('s4')`, and the scripted sends are
 * LATENT — no beat fires that seam, the offer icon has nowhere to draw on a
 * monitor that is off, and the spine therefore waits at `e3_s3` forever. That
 * is 08_STATUS_REGISTER §7's standing note, and it is why Era 4 was unreachable
 * by ordinary clicking before this session. When the sends land, the spine
 * should take this trigger back; it is one call and it belongs there.
 */
const CORRECTION_IDS = new Set((queue.corrections as { id: number }[]).map(c => c.id));
const TOTAL_CORRECTIONS = (queue.submissions as { corrections: number[] }[])
  .reduce((n, s) => n + s.corrections.filter(id => CORRECTION_IDS.has(id)).length, 0);
/** s of ordinary quiet after the last correction before the notice — long
 *  enough that it plainly is not a response to the player's press. */
const FINAL_GAP = 6;

/** ⚑ THE ONE TOUCH: how far in front of the eye the picture hangs once the
 *  device is on, and how big it is there. At the camera's 42° vertical FOV a
 *  0.21 m plane at 0.30 m covers ~91% of the frame's height and ~82% of its
 *  width — so the room is still there at the edges, sliding past, while the
 *  place stays exactly where it is. That margin is not a compromise; it is
 *  where the turn that does not work becomes visible. */
const WORN = { distance: 0.30, w: 0.28, h: 0.21 } as const;
/** the touch is not a movement (Sérgio, 2026-08-06) — no donning animation.
 *  This is only the picture arriving, and it is short enough not to be one. */
const WEAR_SECONDS = 0.55;
/** how far in front of the eye each device sits when held, in metres. A phone
 *  is held closer than a tablet because it is smaller, not because it matters
 *  more — both end up subtending roughly the same angle. */
const HELD_DISTANCE = { tablet: 0.60, phone: 0.36 } as const;
const HOLD_SECONDS = 0.45;

export interface Era3Devices {
  /** call once a frame — uploads any screen whose content just changed. The
   *  phone still draws/uploads exactly ONCE (Session 37's original law,
   *  unchanged); the laptop/tablet now re-check `graceQueueLite.version`
   *  each tick and redraw+re-upload ONLY when it has actually moved (a real
   *  queue action) — never on a ticking clock, per Quest budget discipline. */
  tick(dt: number): void;
  /** era-gate the three screens (and fire the once-only arrival witness
   *  line the first time era reaches e3+). Call from driveMorph() and the
   *  ?era= review-jump path alongside the room's own era toggles.
   *  S61 `settled`: a review jump wants the laptop already signed-in-ready,
   *  not the arrival narrative (dark → boot → install) — the same distinction
   *  os.ts's `setDesktopEra(era, settled)` draws for the E2 arrival. */
  setEra(era: EraKey, settled?: boolean): void;
  /** S61: the relocation has landed and the player is in Vera's seat — start
   *  her machine. Called by app.ts's endRelocation(), never by setEra: the
   *  boot belongs to the moment you ARRIVE, not to the moment the era flips
   *  (which is ~30 s earlier, in another room). No-op if already started. */
  beginArrival(): void;
  /** ⚑ raise a device to the hand (or `null` to put everything back) — see the
   *  HELD READ note above. `seat` is the camera pose being cut to; the held
   *  pose is computed from it, so the two can never disagree. */
  holdDevice(which: HeldDevice, seat: { x: number; y: number; z: number; pitch: number; yaw: number }): void;
  /** screen px → world ray (from app.ts's own screenRay()) → the laptop
   *  plane's logical canvas coords, generalized for ANY plane orientation
   *  (the laptop's vertical euler differs from the tablet/phone's flat
   *  screen-up planes, so this can't reuse app.ts's toDesktop()'s
   *  fixed-axis shortcut). Returns null if the ray misses the laptop
   *  entirely, or the laptop screen isn't visible/enabled this era. Routes
   *  straight into GraceQueueLite's own handleClick — the laptop is the
   *  ONLY device with verbs this session (tablet/phone have none yet). */
  handleLaptopPointer(ray: { p0: pc.Vec3; p1: pc.Vec3 }): boolean;
  /** ?debug=1 review aid only (like __os/__tapes) — the raw offscreen
   *  canvases, for pixel-probing the shell content/lamb-marks without
   *  screenshot-chasing the 3D projection. */
  debugCanvases(): Record<string, HTMLCanvasElement>;
  /** ?debug=1 review aid only (like __os) — the live GraceQueueLite
   *  instance, so a review can drive/inspect the queue in logical laptop-
   *  canvas coordinates without the world→screen projection dance. */
  debugQueue(): GraceQueueLite;
}

/** general ray↔plane hit test for a `makeScreenEntity` plane (which spans
 *  local X × local Z, scaled to world w × h, default face normal +Y) at ANY
 *  world orientation — computed from the entity's own world transform
 *  columns rather than assuming a fixed axis-aligned plane (app.ts's
 *  toDesktop()/toWitness() both hardcode one axis each; the three Era-3
 *  screens don't share a single orientation, so this can't reuse either).
 *  column0/1/2 = the entity's rotated+scaled local X/Y/Z basis vectors
 *  (Mat4.data is column-major: indices 0-2, 4-6, 8-10; 12-14 = translation —
 *  the same convention Session 37's own euler-facing note used to verify a
 *  plane's normal sign). Returns logical pixel coords or null if the ray
 *  misses the plane's bounds. */
function hitPlane(entity: pc.Entity, wWorld: number, hWorld: number, logicalW: number, logicalH: number, ray: { p0: pc.Vec3; p1: pc.Vec3 }): { x: number; y: number } | null {
  const m = entity.getWorldTransform().data;
  const cx = m[12], cy = m[13], cz = m[14];
  const rightX = m[0], rightY = m[1], rightZ = m[2];
  const normX = m[4], normY = m[5], normZ = m[6];
  const heightX = m[8], heightY = m[9], heightZ = m[10];

  const dx = ray.p1.x - ray.p0.x, dy = ray.p1.y - ray.p0.y, dz = ray.p1.z - ray.p0.z;
  const denom = dx * normX + dy * normY + dz * normZ;
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((cx - ray.p0.x) * normX + (cy - ray.p0.y) * normY + (cz - ray.p0.z) * normZ) / denom;
  if (t < 0 || t > 1) return null;

  const px = ray.p0.x + dx * t, py = ray.p0.y + dy * t, pz = ray.p0.z + dz * t;
  const ddx = px - cx, ddy = py - cy, ddz = pz - cz;

  const rightLen = Math.hypot(rightX, rightY, rightZ) || 1;
  const heightLen = Math.hypot(heightX, heightY, heightZ) || 1;
  const lx = (ddx * rightX + ddy * rightY + ddz * rightZ) / rightLen;   // world-length along local X, in [-w/2, w/2]
  const lz = (ddx * heightX + ddy * heightY + ddz * heightZ) / heightLen; // world-length along local Z, in [-h/2, h/2]

  const u = lx / wWorld + 0.5;
  // v: empirically calibrated in-browser (Session 38) against the laptop's
  // real screen — a real click on the visually-lower "Sign in" button
  // resolved to a logical y in the canvas's TOP half with `0.5 - lz/hWorld`,
  // so the sign here is `+`, not the `-` a naive mirror-of-toWitness() guess
  // would suggest. Session 37's own euler-facing note flagged exactly this:
  // "probing... rather than guessing" when a plane's orientation isn't a
  // simple shared-room yaw. Re-verify if PLACEMENT.laptop's euler ever changes.
  const v = 0.5 + lz / hWorld;
  if (u < 0 || u > 1 || v < 0 || v > 1) return null;
  return { x: u * logicalW, y: v * logicalH };
}

/** ray↔sphere, for pressing an OBJECT rather than a screen: the shortest
 *  distance from the segment to a point. `src/engine/app.ts` has its own
 *  `rayHitsPoint` for exactly this, and it is outside this session's fence —
 *  same maths, ten lines, rather than a change to a file this session may not
 *  touch. (If the two ever disagree, app.ts's is the original.) */
function rayNear(
  ray: { p0: pc.Vec3; p1: pc.Vec3 }, at: { x: number; y: number; z: number }, radius: number
): boolean {
  const dx = ray.p1.x - ray.p0.x, dy = ray.p1.y - ray.p0.y, dz = ray.p1.z - ray.p0.z;
  const len2 = dx * dx + dy * dy + dz * dz;
  if (len2 < 1e-9) return false;
  const t = Math.max(0, Math.min(1,
    ((at.x - ray.p0.x) * dx + (at.y - ray.p0.y) * dy + (at.z - ray.p0.z) * dz) / len2));
  const cx = ray.p0.x + dx * t - at.x;
  const cy = ray.p0.y + dy * t - at.y;
  const cz = ray.p0.z + dz * t - at.z;
  return cx * cx + cy * cy + cz * cz <= radius * radius;
}

export function buildEra3Devices(app: pc.Application): Era3Devices {
  // S76: there IS a room, so the last update draws on the laptop and Daniel's
  // Era-3 monitor stays off. `?flat=1` never reaches this line — see
  // src/desktop/apps/space.ts's `roomIsMounted`.
  claimRoomMount();
  type Screen = {
    name: keyof typeof PLACEMENT;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    tex: pc.Texture;
    entity: pc.Entity;
    dirty: boolean;
    logical: { w: number; h: number };
    /** ⚑ the visor: its pixels are drawn by `DesktopOS`, not here. The redraw
     *  loop below only uploads it — this module never touches that canvas's
     *  context, because the piece has ONE UI surface and this is a second
     *  mount of it, not a second copy. */
    external?: boolean;
    /** if present, checked each tick; the screen redraws+re-uploads ONLY
     *  when this value has changed since the last tick (dirty discipline —
     *  never a bare per-frame redraw). Screens without one (the phone) draw
     *  once at construction and never again, per Session 37's original law. */
    versionOf?: () => number;
    lastVersion?: number;
    /** where this screen LIVES when nobody is holding it (see HELD READ) */
    restPos: pc.Vec3;
    restEuler: pc.Vec3;
    /** the pose it is travelling toward, and how far along it is (0 = rest) */
    heldPos?: pc.Vec3;
    heldEuler?: pc.Vec3;
    holdK: number;      // 0 = on the furniture, 1 = in the hand
    holdTo: number;     // the target for holdK
  };
  const screens: Screen[] = [];
  // ⚑ THE LIFT's one wire: the laptop's break reaches the ROOM's light through
  // cluster.ts's module-level hook, because app.ts (which owns both halves) is
  // outside this session's file fence. See cluster.ts's E3_LIFT.
  const graceQueueLite = new GraceQueueLite({ onLight: setEra3Lift });
  // ⚑ THE DAY'S OTHER JOBS (ERA3_BUILD_PLAN stage 4). Each is a self-contained
  //   `TaskSurface` in src/desktop/apps/; mounting one gives it a tile on the
  //   board and nothing else in this file has to know it exists. A job that is
  //   not mounted has no tile, which is how the board grows without ever
  //   showing a tile that does nothing.
  graceQueueLite.mountTask(new FamilyCallsApp());

  function add(name: keyof typeof PLACEMENT, logical: { w: number; h: number; scale: number }, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, opts: { versionOf?: () => number } = {}): void {
    const { canvas, ctx } = makeCanvas(logical.w, logical.h, logical.scale);
    draw(ctx, logical.w, logical.h);
    const tex = makeScreenTexture(app, canvas);
    const place = PLACEMENT[name];
    const entity = makeScreenEntity(`era3-device-${name}`, tex, place.size.w, place.size.h);
    entity.setLocalPosition(place.pos.x, place.pos.y, place.pos.z);
    entity.setLocalEulerAngles(place.euler.x, place.euler.y, place.euler.z);
    entity.enabled = false; // setEra() decides visibility
    app.root.addChild(entity);
    screens.push({
      name, canvas, ctx, tex, entity, dirty: true, logical: { w: logical.w, h: logical.h },
      versionOf: opts.versionOf, lastVersion: opts.versionOf ? opts.versionOf() : undefined,
      restPos: new pc.Vec3(place.pos.x, place.pos.y, place.pos.z),
      restEuler: new pc.Vec3(place.euler.x, place.euler.y, place.euler.z),
      holdK: 0, holdTo: 0
    });
  }

  /**
   * The held pose, derived from the seat's camera pose. `pitch`/`yaw` are the
   * camera's own, so "in front of the eye" is computed rather than authored —
   * a retuned seat drags its held device with it and cannot leave it behind.
   *
   * The plane primitive faces +Y, which is why the euler is (90 + pitch, yaw,
   * 0) rather than the camera's own angles: PLACEMENT.laptop already uses the
   * same +90 convention to stand a screen upright, and the pitch term tilts the
   * device to meet a downward gaze the way a held object actually does.
   */
  function heldPoseFor(name: keyof typeof PLACEMENT, seat: { x: number; y: number; z: number; pitch: number; yaw: number }): { pos: pc.Vec3; euler: pc.Vec3 } {
    const dist = name === 'phone' ? HELD_DISTANCE.phone : HELD_DISTANCE.tablet;
    const p = seat.pitch * Math.PI / 180;
    const y = seat.yaw * Math.PI / 180;
    const fwd = new pc.Vec3(-Math.sin(y) * Math.cos(p), Math.sin(p), -Math.cos(y) * Math.cos(p));
    return {
      pos: new pc.Vec3(seat.x + fwd.x * dist, seat.y + fwd.y * dist, seat.z + fwd.z * dist),
      euler: new pc.Vec3(90 + seat.pitch, seat.yaw, 0)
    };
  }

  /**
   * The laptop's own draw, plus the ritual composited over it. `ritualTick`
   * moves once per frame while a ritual is up — the dirty-upload law's own
   * exception for "a beat that is genuinely animating" (the changelog types on,
   * the progress bar stutters), and it stops the instant the ritual is over.
   *
   * ⚑ S87 — AND THE E3 SEND OFFER (s3/s4), same offset, same reason: Daniel's
   * monitor is dead through the whole of E3 (S61), so the offer that used to
   * have nowhere to draw (`os.ts`'s own blackout, see that condition's own
   * comment) composites here instead — icon first, then its dialog once
   * opened, never both at once with the ritual (the ritual and a send offer
   * are never live at the same moment; `sendOfferPending` holds the spine's
   * breath while a summons is up, same law the felt window and E4 already use).
   */
  let ritualTick = 0;
  function drawLaptop(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    graceQueueLite.draw(ctx, w, h);
    const ritual = e4Bridge()?.update();
    if (ritual?.open) {
      if (ritual.fullScreen) px(ctx, 0, 0, w, h, ERA1.black);
      ctx.save();
      ctx.translate(RITUAL_OFFSET.x, RITUAL_OFFSET.y);
      ritual.draw(ctx);
      ctx.restore();
      return;
    }
    if (e4Bridge()?.sendOfferActive()) {
      ctx.save();
      ctx.translate(RITUAL_OFFSET.x, RITUAL_OFFSET.y);
      e4Bridge()?.drawSendOfferExternal(ctx);
      ctx.restore();
    }
  }

  add('laptop', LOGICAL.laptop, drawLaptop,
    { versionOf: () => graceQueueLite.version + ritualTick + (e4Bridge()?.sendOfferVersion() ?? 0) });
  // Session 70: the tablet takes its OWN version, exactly as the phone did in
  // S64 — it now has state the laptop knows nothing about (an open thread, a
  // selected comment, arrivals landing on their own schedule), and a comment
  // arriving must not re-upload the 676x390 laptop panel beside it.
  // ⚑ THE TABLET IS GONE — 2026-08-21, Sérgio: Era 3 is DESKTOP + PHONE.
  //   Its screen, its seat, its movement node and its room prop are all removed.
  //   ⚑ WHAT THIS ORPHANS, DELIBERATELY AND TEMPORARILY: `comments.ts` drew only
  //   here, so the comment thread — the recruitment floor, where Vera replies to
  //   strangers with pinned templates that silently flag accounts — has no
  //   surface until ERA3_BUILD_PLAN stage 4 rebuilds it as a DESKTOP task
  //   ("Clear the comments"). That is where it belongs: they are her employer's
  //   words and they should sit on her employer's screen.
  //   `graceQueueLite.drawTablet`/`tabletFeed`/`tabletVersion` and comments.ts
  //   are all LEFT INTACT for that stage. ⚑ Note for whoever wires it: comments
  //   is authored 216 × 297 logical px — portrait, tablet-shaped — and will need
  //   reflowing to a landscape window.
  // Session 64: the phone no longer draws once and never again (S37's law) —
  // it carries the era's break, so it takes its OWN version counter. The
  // dirty-upload law is unchanged, only widened: `phoneVersion` moves on a real
  // change (the message arriving, the message opening, the caret) and the
  // caret's blink therefore never re-uploads the laptop or the tablet.
  add('phone', LOGICAL.phone, (ctx, w, h) => graceQueueLite.drawPhone(ctx, w, h), { versionOf: () => graceQueueLite.phoneVersion });

  let arrived = false;
  let eraNow: EraKey = 'e1';
  /** s of quiet accumulated since the correction list was exhausted */
  let finalT = -1;
  let finalArmed = false;

  // ── ⚑ THE VISOR (S76) ─────────────────────────────────────────────────────
  /** created the first time the era reaches e4, because `src/engine/app.ts`
   *  builds this module BEFORE the OS exists and the visor is textured with the
   *  OS's own canvas. Nothing about it exists in E1–E3. */
  let visor: Screen | null = null;
  let visorK = 0;            // 0 = on the stand, 1 = on your face
  let camEntity: pc.Entity | null = null;
  /** the camera's yaw at the moment the device went on — every later yaw is
   *  measured against it, and that difference is the whole of the turn. */
  let wornYaw = 0;
  let wasWorn = false;

  function camera(): pc.Entity | null {
    if (!camEntity) {
      const found = app.root.findByName('camera');
      if (found instanceof pc.Entity) camEntity = found;
    }
    return camEntity;
  }

  function ensureVisor(): void {
    if (visor) return;
    const source = e4Bridge()?.canvas();
    if (!source) return;
    const place = PLACEMENT.visor;
    const tex = makeScreenTexture(app, source);
    const entity = makeScreenEntity('era4-visor', tex, place.size.w, place.size.h);
    entity.setLocalPosition(place.pos.x, place.pos.y, place.pos.z);
    entity.setLocalEulerAngles(place.euler.x, place.euler.y, place.euler.z);
    entity.enabled = false;
    app.root.addChild(entity);
    visor = {
      name: 'visor', canvas: source, ctx: null as unknown as CanvasRenderingContext2D,
      tex, entity, dirty: true, external: true,
      logical: { w: LOGICAL.visor.w, h: LOGICAL.visor.h },
      versionOf: () => e4Bridge()?.shell()?.version ?? 0,
      lastVersion: -1,
      restPos: new pc.Vec3(place.pos.x, place.pos.y, place.pos.z),
      restEuler: new pc.Vec3(place.euler.x, place.euler.y, place.euler.z),
      holdK: 0, holdTo: 0
    };
    screens.push(visor);
  }

  /** the plane primitive faces +Y; tipping it 90° about its own X turns that
   *  normal into the camera's +Z, i.e. straight back at the eye. Composed with
   *  the camera's own world rotation, that is "hung in front of your face" —
   *  and it is read from the camera's live transform rather than rebuilt out of
   *  euler angles, which do not survive the round trip (a rig yaw of 270 reads
   *  back off the child camera as 68.78° — measured in-browser, S76). */
  const TIP = new pc.Quat().setFromEulerAngles(90, 0, 0);
  const restQuat = new pc.Quat();
  const wornQuat = new pc.Quat();
  const nowQuat = new pc.Quat();
  const wornPos = new pc.Vec3();
  const nowPos = new pc.Vec3();

  /**
   * ⚑ THE PICTURE IS MOUNTED TO THE HEAD, and this is the line that does it.
   *
   * Every frame, while it is worn, the plane is placed in front of the camera's
   * own world transform. So the player turns — the one gesture this piece has
   * taught for thirty years of story, the gesture that has always worked — and
   * the place turns with them. **There is no away.**
   *
   * ⚑ NOBODY EXPLAINS THIS. There is no line, no cue, no glitch and no
   * assistant remark anywhere near it, in this file or any other. It is simply
   * true, and the player discovers it by doing the thing they have always done.
   * The only thing in the whole piece that ever mentions it is the record, once,
   * in its own administrative voice: `orientation: changed — view unchanged`.
   *
   * The room stays visible around the edges (see WORN's note), which is what
   * makes the beat legible rather than merely absolute: Maya's room slides past
   * the borders of a rectangle that does not move.
   */
  function driveVisor(dt: number): void {
    const shell = e4Bridge()?.shell();
    if (!visor || !shell) return;
    const cam = camera();
    const worn = shell.worn;
    /** the direction the camera is looking, as a compass bearing in degrees.
     *  Taken from the forward vector, which is unambiguous; see TIP's note. */
    const bearing = (): number => {
      const f = cam ? cam.forward : null;
      return f ? Math.atan2(-f.x, -f.z) * 180 / Math.PI : 0;
    };
    if (worn && !wasWorn && cam) { wornYaw = bearing(); }
    wasWorn = worn;
    const target = worn ? 1 : 0;
    if (visorK !== target) {
      const step = dt / WEAR_SECONDS;
      visorK = target > visorK ? Math.min(1, visorK + step) : Math.max(0, visorK - step);
    }
    if (visorK === 0 || !cam) {
      visor.entity.setPosition(visor.restPos.x, visor.restPos.y, visor.restPos.z);
      visor.entity.setEulerAngles(visor.restEuler.x, visor.restEuler.y, visor.restEuler.z);
      visor.entity.setLocalScale(PLACEMENT.visor.size.w, 1, PLACEMENT.visor.size.h);
      return;
    }
    const p = cam.getPosition();
    const f = cam.forward;
    const k = visorK * visorK * (3 - 2 * visorK); // smoothstep, as the held read
    wornPos.set(
      p.x + f.x * WORN.distance, p.y + f.y * WORN.distance, p.z + f.z * WORN.distance
    );
    restQuat.setFromEulerAngles(visor.restEuler.x, visor.restEuler.y, visor.restEuler.z);
    wornQuat.copy(cam.getRotation()).mul(TIP);
    nowPos.lerp(visor.restPos, wornPos, k);
    nowQuat.slerp(restQuat, wornQuat, k);
    visor.entity.setPosition(nowPos);
    visor.entity.setRotation(nowQuat);
    visor.entity.setLocalScale(
      PLACEMENT.visor.size.w + (WORN.w - PLACEMENT.visor.size.w) * k,
      1,
      PLACEMENT.visor.size.h + (WORN.h - PLACEMENT.visor.size.h) * k
    );
    // …and the picture answers the turn, in steps, and gets nowhere.
    if (worn) shell.setLook(((bearing() - wornYaw + 540) % 360) - 180);
  }

  return {
    tick(dt: number): void {
      // S76: the last update's own frames — see `drawLaptop`
      if (e4Bridge()?.update()?.open) ritualTick++;
      // ⚑ E3 ENDS WHEN THE WORK DOES. Counted off the record, not off any
      // screen's private state: every correction decided, then a beat of quiet,
      // then the platform announces its own end. See TOTAL_CORRECTIONS above.
      if (eraNow === 'e3' && !finalArmed && ledger.graceQueue.length >= TOTAL_CORRECTIONS) {
        finalT = finalT < 0 ? 0 : finalT + dt;
        if (finalT >= FINAL_GAP) { finalArmed = true; e4Bridge()?.armFinal(); }
      }
      driveVisor(dt);
      // S61: the arrival (dark → boot → install → sign-in) is the only thing
      // in this module with a clock. It bumps `version` on its own quantised
      // schedule, so the redraw path below is unchanged and still fires only
      // on a real content change — never per frame. See GraceQueueLite's header.
      graceQueueLite.update(dt);
      // the held read's own easing — position/rotation only, never a redraw:
      // moving a screen through the room does not change a pixel on it, so
      // this cannot dirty a canvas and the upload law below is untouched.
      for (const s of screens) {
        if (s.holdK === s.holdTo) continue;
        const step = dt / HOLD_SECONDS;
        s.holdK = s.holdTo > s.holdK ? Math.min(s.holdTo, s.holdK + step) : Math.max(s.holdTo, s.holdK - step);
        const k = s.holdK * s.holdK * (3 - 2 * s.holdK);
        const hp = s.heldPos ?? s.restPos;
        const he = s.heldEuler ?? s.restEuler;
        s.entity.setLocalPosition(
          s.restPos.x + (hp.x - s.restPos.x) * k,
          s.restPos.y + (hp.y - s.restPos.y) * k,
          s.restPos.z + (hp.z - s.restPos.z) * k
        );
        s.entity.setLocalEulerAngles(
          s.restEuler.x + (he.x - s.restEuler.x) * k,
          s.restEuler.y + (he.y - s.restEuler.y) * k,
          s.restEuler.z + (he.z - s.restEuler.z) * k
        );
      }
      for (const s of screens) {
        if (s.external) {
          // the visor: another module owns those pixels. Upload when the shell
          // says they changed, and never draw a stroke on them here.
          if (s.versionOf && s.lastVersion !== s.versionOf()) {
            s.lastVersion = s.versionOf();
            s.dirty = true;
          }
          if (s.dirty && s.entity.enabled) { s.tex.upload(); s.dirty = false; }
          continue;
        }
        if (s.versionOf && s.lastVersion !== s.versionOf()) {
          s.lastVersion = s.versionOf();
          s.ctx.clearRect(0, 0, s.logical.w, s.logical.h);
          if (s.name === 'laptop') drawLaptop(s.ctx, s.logical.w, s.logical.h);
          else graceQueueLite.drawPhone(s.ctx, s.logical.w, s.logical.h);
          s.dirty = true;
        }
        if (s.dirty) { s.tex.upload(); s.dirty = false; }
      }
    },
    setEra(era: EraKey, settled = false): void {
      eraNow = era;
      const visible = era === 'e3' || era === 'e4';
      // ⚑ S76: the visor is created here and not before — this module is built
      // before the OS exists, and the visor is textured with the OS's canvas.
      // It is Era 4's alone: Vera's three screens are enabled at e3 and e4 as
      // they always were, and this one is enabled at e4 and nowhere else, so no
      // era transition before the last one gains a single draw call from it.
      if (era === 'e4') ensureVisor();
      for (const s of screens) {
        s.entity.enabled = s.name === 'visor' ? era === 'e4' : visible;
      }
      // S61: a settled review jump lands on sign-in; a real transition leaves
      // the laptop dark until endRelocation() calls beginArrival(). E4 also
      // settles — by then the machine has long since been on.
      if (visible && (settled || era === 'e4')) graceQueueLite.settleArrival();
      if (visible && !arrived) {
        arrived = true;
        if (ledger.era3Arrival.length === 0) {
          ledger.era3Arrival.push({ witness: d.witnessArrival });
        }
      }
    },
    beginArrival(): void {
      graceQueueLite.beginArrival();
    },
    holdDevice(which: HeldDevice, seat: { x: number; y: number; z: number; pitch: number; yaw: number }): void {
      for (const s of screens) {
        if (s.name === 'laptop') continue; // the laptop is already at reading distance
        if (s.name === which) {
          const hp = heldPoseFor(s.name, seat);
          s.heldPos = hp.pos;
          s.heldEuler = hp.euler;
          s.holdTo = 1;
        } else {
          s.holdTo = 0;
        }
      }
    },
    handleLaptopPointer(ray: { p0: pc.Vec3; p1: pc.Vec3 }): boolean {
      const test = (name: 'laptop' | 'phone'): { x: number; y: number } | null => {
        const s = screens.find(sc => sc.name === name);
        if (!s || !s.entity.enabled) return null;
        const place = PLACEMENT[name];
        return hitPlane(s.entity, place.size.w, place.size.h, s.logical.w, s.logical.h, ray);
      };
      // ⚑ S76 — THE ONE TOUCH, and it is checked first because in Era 4 there
      // is nothing else on this route. Two ways to land it, both a press on the
      // same object: the visor's own screen plane (which is 9 cm across at a
      // metre, so it is small), or a generous sphere around the headset itself,
      // because the thing you are pressing is a headset on a stand and not a
      // button. There is no second confirmation and no donning animation: it is
      // touched and it is on.
      const shell = e4Bridge()?.shell();
      if (visor?.entity.enabled && shell && !shell.worn) {
        const onVisor = hitPlane(
          visor.entity, PLACEMENT.visor.size.w, PLACEMENT.visor.size.h,
          visor.logical.w, visor.logical.h, ray
        );
        if (onVisor || rayNear(ray, PLACEMENT.visor.pos, 0.16)) { shell.wear(); return true; }
      }
      // …and once it is on, the picture is in front of your face: every press
      // goes to it, because there is nothing else to press. It consumes them
      // even where it has nothing to do, so a press cannot fall through the
      // place onto the room behind it. S77's chips answer inside `handleClick`.
      if (visor?.entity.enabled && shell?.worn) {
        const onVisor = hitPlane(
          visor.entity, WORN.w, WORN.h, visor.logical.w, visor.logical.h, ray
        );
        if (onVisor) { shell.handleClick(onVisor.x, onVisor.y); return true; }
      }
      // ⚑ THE LAST UPDATE, on Vera's laptop. System-modal over that screen only
      // (a press on the phone or the tablet still reaches them — the ritual owns
      // the surface it is drawn on, not the room).
      const ritual = e4Bridge()?.update();
      const onLaptop = test('laptop');
      if (ritual?.open && ritual.visible && onLaptop) {
        ritual.handleClick(onLaptop.x - RITUAL_OFFSET.x, onLaptop.y - RITUAL_OFFSET.y);
        return true;
      }
      // ⚑ S87 — THE E3 SEND OFFER, same laptop, same offset, checked only once
      // no ritual owns the screen (the two are never live together — see
      // `drawLaptop`'s own comment).
      if (onLaptop && e4Bridge()?.sendOfferActive()) {
        if (e4Bridge()?.handleSendOfferExternalClick(onLaptop.x - RITUAL_OFFSET.x, onLaptop.y - RITUAL_OFFSET.y)) {
          return true;
        }
      }
      if (onLaptop) { graceQueueLite.handleClick(onLaptop.x, onLaptop.y); return true; }
      // Session 64: the PHONE is pressable now (the Malta notification, then
      // the reply field). The method keeps its Session-38 name because its only
      // call site is `src/engine/app.ts`'s pointerdown, which is outside this
      // session's file fence — it routes any Era-3 device screen that has
      // verbs. A press that lands on the phone's glass but on no target
      // returns false and falls through to the floor markers, exactly as a
      // miss on the laptop always has.
      const onPhone = test('phone');
      if (onPhone) return graceQueueLite.handlePhoneClick(onPhone.x, onPhone.y);
      // Session 70: and the TABLET has verbs now — the comment thread and its
      // template picker. Tested last only because it is the largest plane lying
      // flat in the room and a ray on its way to something else should not be
      // eaten by it; a press on its glass that hits no target returns false and
      // falls through to the floor markers, exactly as the other two do.
      // (the tablet used to be tested last here — it was the largest plane lying
      //  flat in the room, so it went after the others to avoid eating rays on
      //  their way elsewhere. With it gone there is nothing left to fall through
      //  to but the floor markers, which is what `false` does.)
      return false;
    },
    debugCanvases(): Record<string, HTMLCanvasElement> {
      // S76: `visor` joins the three, and it is deliberately the SAME object
      // `window.__os.canvas` already exposes — a review that probes both is
      // meant to see one canvas twice.
      const out: Record<string, HTMLCanvasElement> = {};
      for (const s of screens) out[s.name] = s.canvas;
      return out;
    },
    debugQueue(): GraceQueueLite {
      return graceQueueLite;
    }
  };
}
