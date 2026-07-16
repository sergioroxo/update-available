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
import { buildClusterShell, type ClusterShell, type EraKey } from '../room/cluster';
import { buildOpeningBoardDressing, type OpeningBoardMode } from '../room/openingBoardDressing';
import { buildPointCloud, closeBackdropColor, type PointCloud } from '../room/pointCloud';
import { createSendRuntime, type SendRuntime } from '../room/sends';
import { buildMovementNodes, type MovementNodes } from '../room/movementNodes';
import { createSpine, type Spine } from '../narrative/spine';
import { TapeSystem, type TapeId } from '../narrative/tapes';
import { TapeAudioBus } from '../audio/tapeAudio';
import { mountDebugPanel } from '../debug/panel';
import { makeScreenTexture, makeScreenEntity } from './screenTexture';
import { buildEra3Devices, type Era3Devices } from '../room/era3Devices';
import clusterData from '../../data/room/cluster.json';
import strings from '../../data/strings/slice.json';
import reinterpStrings from '../../data/strings/reinterp.json';

const FLIP_SECONDS = 0.9;
/** the CRT's visible screen (meters, 4:3) — bezels in era1.json sit flush */
const SCREEN = { w: 0.4, h: 0.3, x: 0, y: 1.08, z: 0 };
/** the witness repository wall (sharp, oversized — surveillance scale) */
const WITNESS = { w: 1.6, h: 1.2, x: 0, y: 1.5, z: 3.4 };
/** seated eye position at the desk */
const EYE = { x: 0, y: 1.16, z: 0.7 };
/** the power button on the CRT (S1.0 power-on beat) */
const POWER_BTN = { x: 0.19, y: 0.895, z: 0.03 };
/** the Starter Kit floppy on the desk (S1.2 insert beat) — in the leaflet pocket */
const KIT_FLOPPY = { x: -0.34, y: 0.762, z: 0.12 };
const DRAG_PITCH_MAX = 55;
/** O1 establishing framing (reinterp): pulled back, room-wide, window-lit */
const ESTABLISH = { x: 0, y: 1.62, z: 2.55, pitch: -7 };
/** O1 begins looking at the spine-wall cork board, offset from the doorway. */
const OPENING_WALL_VIEW = { x: -0.86, y: EYE.y, z: EYE.z, pitch: 0, yaw: 180 };
/** O1/O3's transparent paper overlay, pinned over the physical cork board. */
const OPENING_WALL_BOARD = { x: -0.86, y: 1.43, z: 3.565, w: 1.5, h: 1.125 };
// O2 establishing → desk pan: slow enough to read as travel through the room,
// not a cut (Sérgio, Round 18: 1.4s "is so fast it makes no sense"), and it
// starts a beat AFTER the lights land so the two events stay legible.
const CAM_MOVE_SECONDS = 3.6;
const CAM_MOVE_DELAY_MS = 700;
const STARTUP_ARM_SECONDS = 4.0;
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
const TAPE_SHELF: Record<TapeId, { x: number; y: number; z: number }> = {
  tapeA: { x: 1.75, y: 0.646, z: 0.4 },
  tapeB: { x: 1.75, y: 0.646, z: 0.55 },
  tapeC: { x: 1.75, y: 0.646, z: 0.7 }
};
const TAPE_HIT_RADIUS = 0.07; // stays under half the 0.15m shelf spacing — no ambiguity between tapes
const BOOMBOX_HIT = { x: 1.9, y: 0.76, z: 0.55 };
const BOOMBOX_HIT_RADIUS = 0.22;
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
  teddyBox: { p: { x: 1.98, y: 0.71, z: 0.5 }, r: 0.14 },
  rainbowDuck: { p: { x: 1.98, y: 1.6, z: 0.38 }, r: 0.12 }
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

export async function startApp(canvasEl: HTMLCanvasElement, options: AppOptions = {}): Promise<pc.Application> {
  const app = new pc.Application(canvasEl, {
    graphicsDeviceOptions: { antialias: false, alpha: false }
  });
  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  window.addEventListener('resize', () => app.resizeCanvas());
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
    cloud = buildPointCloud(app);
    // the SEND seam (master script §4) — no beat fires it in this worktree
    // yet (the trigger beats ride the content-merge lane); the debug panel
    // carries review buttons so the filing/carry-back path stays testable
    sendRt = createSendRuntime(room, niche);
    // R28-1: the movement node graph (floor markers at the existing camera
    // seats). Geometry/gating only — the camera cut lives in requestMove().
    movementNodes = buildMovementNodes(app);
    tapes = new TapeSystem();
    tapeAudio = new TapeAudioBus();
    // Session 37 (E3-i): THE THREE-SCREEN ROOM foundation — Room 2's laptop/
    // tablet/phone screens. Era-gated (setEra() below, alongside the room's
    // own era toggles); the movement nodes above (r2-tablet/r2-phone,
    // data/room/nodes.json) share this module's DEVICE_SEAT_POSES as their
    // authored source.
    era3Devices = buildEra3Devices(app);
  }
  const openingBoardDressing = options.reinterp === true ? buildOpeningBoardDressing(app) : null;

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
    // laptop-canvas coordinates directly, without the world→screen
    // projection dance — mirrors __os's own established convention exactly.
    (window as { __graceQueue?: () => unknown }).__graceQueue = () =>
      era3Devices ? era3Devices.debugQueue() : null;
  }

  // ── the NARRATIVE SPINE (reinterp; real playthroughs only, not review
  // params): the script's beat conductor — era updates on documented
  // failures, send summonses, the bare final restart → the Close. The OS
  // performs; the engine moves the space; the spine decides when. ──
  let spine: Spine | null = null;
  const reviewMode = !!(options.era || options.close || options.reveal || options.morphDemo);
  if (options.reinterp === true) {
    if (!reviewMode) spine = createSpine(os, { onClose: () => enterClose() });
    os.onEraShift = (era) => {
      if (era === 'close') return; // the spine's onClose owns the constellation
      driveMorph(era as EraKey);
      spine?.onEra(era);
    };
    os.onSendResolve = (id, outcome) => {
      sendRt?.fire(id, outcome);
      if (outcome === 'visited') {
        const yaw = sendRt?.targetYaw(id);
        // the summons resolves as a TURN — the dolly carries you to the
        // named room (takeable: not conducted; the player keeps the camera)
        if (yaw !== null && yaw !== undefined) dollyTo(yaw, 2.4, false);
      }
    };
  }
  const witness = new WitnessCanvas();
  if (options.reinterp === true) {
    os.onOpeningProfileChange = (profile) => {
      witness.setOpeningProfile(profile);
      if (profile.active) {
        showOpeningSurface(profile.stage === 'boot' ? 'intro' : 'profile');
      } else if (!openingWallActive) {
        showOpeningSurface('witness');
      }
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
  const placeOpeningWallBoard = (): void => {
    back.setLocalPosition(OPENING_WALL_BOARD.x, OPENING_WALL_BOARD.y, OPENING_WALL_BOARD.z);
    back.setLocalScale(OPENING_WALL_BOARD.w, 1, OPENING_WALL_BOARD.h);
  };
  const showOpeningSurface = (mode: OpeningBoardMode): void => {
    if (options.reinterp !== true) return;
    placeOpeningWallBoard();
    setTerminalFrameVisible(false);
    openingBoardDressing?.setMode(mode);
    openingBoardDressing?.setVisible(true);
  };
  if (options.reinterp === true) {
    // R26 B4: the legible record stays on the wall TERMINAL on the south
    // spine. The overhead ceiling witness remains dormant; witness role and
    // lineage live on the cork/record wall surface.
    restoreWitnessSurface();
  }

  const camera = new pc.Entity('camera');
  camera.addComponent('camera', {
    clearColor: new pc.Color(0.05, 0.04, 0.03),
    fov: 42,
    nearClip: 0.05
  });
  camera.setLocalPosition(EYE.x, EYE.y, EYE.z);
  app.root.addChild(camera);

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

    moveHint = document.createElement('div');
    moveHint.textContent = (reinterpStrings as { movementHint?: string }).movementHint ?? 'Click a marker to move.';
    Object.assign(moveHint.style, {
      position: 'fixed', left: '50%', bottom: '9%', transform: 'translateX(-50%)',
      zIndex: '9', background: 'rgba(10,10,14,0.78)', color: '#cdd3df',
      font: '12px monospace', padding: '6px 12px', borderRadius: '4px',
      opacity: '0', pointerEvents: 'none', transition: 'opacity 0.4s', cursor: 'pointer'
    } as CSSStyleDeclaration);
    document.body.appendChild(moveHint);
    moveHint.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      dismissMoveHint();
    });
    // R28-2a: the old floppyHint DOM one-off (R28-0c item 10) is gone — Era-1
    // guidance now lives in the DIEGETIC side-message thread (the OS taskbar
    // status well, data/dialog/s1_guide.json). moveHint was the first piece
    // of non-diegetic frame chrome; R28-2b adds two more, same law (the frame
    // never PLAYS — this is captioning/accessibility chrome around a diegetic
    // object, not a system voice): the tape system's HARD RAIL forbids new
    // desktop-canvas UI this session, so segment captions (subtitle-style,
    // for the tapes playing in the room) and a small global mute toggle live
    // here as fixed DOM, exactly like moveHint, never on the monitor texture.
    tapeCaption = document.createElement('div');
    Object.assign(tapeCaption.style, {
      position: 'fixed', left: '50%', bottom: '4%', transform: 'translateX(-50%)',
      zIndex: '9', background: 'rgba(10,10,14,0.78)', color: '#e8dcc0',
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
      tapeMuteBtn.textContent = tapeAudio.isMuted ? 'unmute' : 'mute';
    });
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
  let tween: number | null = null; // yaw target while the ⟲ swing runs
  let facingBack = false;
  let flipCount = 0;
  let drag: { x: number; y: number } | null = null;

  // ?debug=1: publish "where am I" (era + which room the view is in) so the
  // debug panel can show a live readout — the answer to "which version/room?".
  const debugOn = new URLSearchParams(window.location.search).get('debug') === '1';
  const ROOM_LABEL: Record<number, string> = {
    0: 'Room 1 · front (gay)', 90: 'Room 2 · west (lesbian)',
    180: 'spine · door + record', 270: 'Room 3 · east (trans)'
  };
  let lastNow = '';
  function publishNow(): void {
    if (!debugOn) return;
    const eraU = (cluster ? cluster.era : 'e1').toUpperCase();
    let room = 'Room 1 · front (gay)';
    if (cluster && cluster.state !== 'sealed') {
      let best = 0;
      for (const y of [0, 90, 180, 270]) if (angDist(camYaw, y) < angDist(camYaw, best)) best = y;
      room = ROOM_LABEL[best];
    }
    const s = `${eraU} · ${room}`;
    if (s !== lastNow) { lastNow = s; (window as { __reinterpNow?: string }).__reinterpNow = s; }
    // the Quest budget, live (WEBXR_PERFORMANCE_NOTES: ~50–100): last frame's
    // draw-call total, for the panel readout + batching A/B (?nobatch=1)
    (window as { __drawCalls?: number }).__drawCalls = app.stats.drawCalls.total;
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
  let autoCam = false;
  let openingWallActive = false;
  let openingWallT = 0;
  let openingWallArmed = false;
  // O7 reveal choreography: seconds until the tilt returns to level; whether
  // the tilt ran conducted (autoCam) — a free tilt cedes to the player's drag
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

  // R28-2a: prop emphasis follows the ACTIVE side-message (data key
  // `emphasis`, resolved to prop ids here — geometry stays in .ts). This
  // generalizes R28-0c item 10's floppy lift: a STATIC brightness lift (no
  // pulse, no glow halo — Soft Lo-Fi) on the props the current guidance
  // points at, restored to their exact prior emissive when it retires.
  const EMPHASIS_PROPS: Record<string, string[]> = {
    floppy: ['kitFloppy', 'kitFloppyLabel', 'kitFloppyShutter'],
    boombox: ['boombox', 'boomboxSpeakerL', 'boomboxSpeakerR', 'boomboxDeck']
  };
  const EMPHASIS_FRAC = 0.32; // of the prop's own diffuse — never a new light
  let appliedEmphasis: string | null = null;
  const emphasisRestore = new Map<string, pc.Color>();
  function setPropEmphasis(key: string | null): void {
    if (key === appliedEmphasis) return;
    if (appliedEmphasis) {
      for (const id of EMPHASIS_PROPS[appliedEmphasis] ?? []) {
        const h = room.props.get(id);
        const orig = emphasisRestore.get(id);
        if (!h || h.emissive || !orig) continue;
        h.material.emissive = orig;
        h.material.update();
      }
      emphasisRestore.clear();
    }
    appliedEmphasis = key;
    if (key) {
      for (const id of EMPHASIS_PROPS[key] ?? []) {
        const h = room.props.get(id);
        if (!h || h.emissive) continue; // never touch true emissives (LEDs etc.)
        emphasisRestore.set(id, h.material.emissive.clone());
        const d = h.material.diffuse;
        h.material.emissive = new pc.Color(d.r * EMPHASIS_FRAC, d.g * EMPHASIS_FRAC, d.b * EMPHASIS_FRAC);
        h.material.update();
      }
    }
  }

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
  function syncTapeProps(): void {
    if (!tapes) return;
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
    tween = null;
  }

  function setOpeningWall(active: boolean): void {
    openingWallActive = active;
    openingWallT = 0;
    openingWallArmed = false;
    witness.setStartupBoard(active, false);
    if (active) {
      showOpeningSurface('intro');
    } else {
      showOpeningSurface('witness');
    }
  }

  function continueFromOpeningWall(): void {
    const choices = witness.startupChoices();
    autoCam = choices.autoCam;
    openingWallActive = false;
    openingWallT = 0;
    openingWallArmed = false;
    witness.setStartupBoard(false, false);
    showOpeningSurface('intro');
    applyLightsOn();                 // O2: room lights + lamp over-throw
    os.beginReinterpOpening();        // boot on the monitor → O3 profile
    window.setTimeout(() => {
      startCamMove({ x: EYE.x, y: EYE.y, z: EYE.z, pitch: 0, yaw: 0 }, CAM_MOVE_SECONDS, true);
    }, CAM_MOVE_DELAY_MS);
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
  // The dolly's pull-back CONTROL point: raised and slightly back from the hub,
  // so travel between rooms bows up-and-back (you rise over the space and see the
  // three rooms) before pushing into the next desk. Used directly as the bezier
  // control (not a pass-through) — clean arcs now that rooms sit on the x-axis.
  const DOLLY_CTRL = { x: 0, y: 1.98, z: 1.15 };
  let seatYaw = 0;                          // current seat (0 = R1 | 90 = R2 west | 270 = R3 east)

  const angDist = (a: number, b: number): number =>
    Math.abs((((a - b) % 360) + 540) % 360 - 180);

  /** each room's SEAT — the desk framed at E1 intimacy (eye ~0.8 m from the
   *  screen, level), identical to the E1 view the player already trusts. Room 1
   *  faces the north desk (yaw 0); Room 2 sits at its west desk (yaw 90); Room 3
   *  at its east desk (yaw 270). All three desks read the same closeness. */
  function seatPose(yaw: number): { x: number; y: number; z: number; pitch: number; yaw: number } {
    switch (((yaw % 360) + 360) % 360) {
      case 90:  return { x: -4.4, y: EYE.y, z: 0.7, pitch: 0, yaw: 90 };  // Room 2 (west)
      case 270: return { x: 4.4, y: EYE.y, z: 0.7, pitch: 0, yaw: 270 };  // Room 3 (east)
      case 180: return { x: EYE.x, y: EYE.y, z: 0.7, pitch: 0, yaw: 180 }; // spine (door + record) — review only
      default:  return { x: EYE.x, y: EYE.y, z: EYE.z, pitch: 0, yaw: 0 }; // Room 1 (front)
    }
  }
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
    return !!camMove || (cluster?.busy ?? false) || openingWallActive;
  }

  /** the actual seat CUT — no tween, no arc, just the target pose, called at
   *  the bottom of the blink's fade-to-black. */
  function performSeatCut(nodeId: string): void {
    const node = movementNodes?.find(nodeId);
    if (!node) return;
    seatYaw = node.seatYaw;
    // Session 37 (E3-i): an intra-room device seat (the tablet/phone) carries
    // its own exact camera pose — seatPose(seatYaw) is only a fallback for
    // the three base room seats, which have no `pose` of their own.
    const sp = node.pose ?? seatPose(node.seatYaw);
    camPos.set(sp.x, sp.y, sp.z);
    camPitch = sp.pitch;
    camYaw = sp.yaw;
    camera.setLocalPosition(camPos.x, camPos.y, camPos.z);
    camera.setLocalEulerAngles(camPitch, camYaw, 0);
    camMove = null;
    tween = null;
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

  const isBackYaw = (): boolean => {
    const n = ((camYaw % 360) + 360) % 360;
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
  os.onLeave = () => { flipBtn.style.display = 'none'; };

  /** the ⟲ assist: tween to the other facing (drag can do it manually too) */
  function doFlip(): void {
    if (!os.inDesktop || os.paused) return;
    const n = ((camYaw % 360) + 360) % 360;
    const target = facingBack ? 0 : 180;
    const delta = ((target - n + 540) % 360) - 180;
    tween = camYaw + delta;
    flipBtn.style.color = '#667';
    flipBtn.style.borderColor = '#334';
  }
  flipBtn.addEventListener('click', doFlip);

  /** crossing to the witness hemisphere files you — however you turned */
  function onCrossed(back2: boolean): void {
    canvasEl.style.cursor = back2 ? 'not-allowed' : 'default';
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

  /** screen px → witness/wall canvas logical px (the spine plane, facing -Z) */
  function toWitness(e: MouseEvent): { x: number; y: number } | null {
    const ray = screenRay(e);
    if (!ray) return null;
    const p = back.getLocalPosition();
    const s = back.getLocalScale();
    const dz = ray.p1.z - ray.p0.z;
    if (Math.abs(dz) < 1e-6) return null;
    const t = (p.z - ray.p0.z) / dz;
    if (t < 0 || t > 1) return null;
    const wx = ray.p0.x + (ray.p1.x - ray.p0.x) * t;
    const wy = ray.p0.y + (ray.p1.y - ray.p0.y) * t;
    // The spine plane faces -Z, so its visible horizontal axis is mirrored
    // relative to the front monitor plane.
    const u = 0.5 - (wx - p.x) / s.x;
    const v = 0.5 - (wy - p.y) / s.z;
    if (u < 0 || u > 1 || v < 0 || v > 1) return null;
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

  canvasEl.addEventListener('pointerdown', (e) => {
    if (openingWallActive) {
      const p = toWitness(e);
      if (p) {
        const action = witness.handleStartupClick(p.x, p.y);
        if (action === 'continue') {
          continueFromOpeningWall();
          return;
        }
        if (action === 'leave') {
          os.leaveNow();
          setOpeningWall(false);
          return;
        }
        if (action === 'handled') return;
        if (action === null && openingWallArmed) {
          continueFromOpeningWall();
          return;
        }
        if (action === null) return;
      }
    }
    if (!facingBack) {
      if (os.isOff && rayHitsPoint(e, POWER_BTN, 0.08)) { // the era's first gesture
        os.powerOn();
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
      const belongings = os.belongings;
      if (belongings?.windowOpen) {
        let kept = false;
        for (const [id, hit] of Object.entries(BELONGINGS_HIT)) {
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
      // Session 38 (E3-ii): the laptop's own screen (Room 2's era3Devices
      // plane, a DIFFERENT plane from the shared Room-1 monitor above) —
      // same precedence rule as the monitor check just above it: a screen
      // click must win over a marker click before markers are even tested.
      // handleLaptopPointer does its own generalized plane-ray hit test
      // (the laptop's vertical euler isn't the fixed axis toDesktop()
      // assumes) and returns false (never consumed) when the ray misses the
      // plane or the screen isn't visible this era, so this never steals a
      // click meant for a movement marker on the floor.
      if (era3Devices) {
        const ray = screenRay(e);
        if (ray && era3Devices.handleLaptopPointer(ray)) return;
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
    drag = { x: e.clientX, y: e.clientY };
    tween = null; // grabbing the view cancels the assist
    nudgeCamera(); // …and a non-conducted O2/reset move
    try { canvasEl.setPointerCapture(e.pointerId); } catch { /* synthetic pointers */ }
  });
  canvasEl.addEventListener('pointermove', (e) => {
    if (drag && (e.buttons & 1)) {
      camYaw -= (e.clientX - drag.x) * 0.16;
      camPitch = Math.max(-DRAG_PITCH_MAX, Math.min(DRAG_PITCH_MAX, camPitch - (e.clientY - drag.y) * 0.12));
      drag = { x: e.clientX, y: e.clientY };
      return;
    }
    if (facingBack) return; // the witness side does not respond to you
    const p = toDesktop(e);
    if (p) os.handleMove(p.x, p.y);
  });
  canvasEl.addEventListener('pointerup', () => {
    drag = null;
    // R28-0c (item 13, Sérgio: "the camera still jumps rooms from look/drag
    // input"): the old dolly-follow ("releasing a head-turn nearer another
    // room's facing travels there") was a non-marker way to change seats —
    // under options.reinterp, room-to-room movement is ONLY requestMove
    // (markers) or a scripted beat (sends/updates/the TURN); drag is
    // look-in-place only, full stop. The shipped (non-reinterp) baseline
    // never had this behavior to begin with, so nothing changes there.
  });
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
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
      camera.setLocalPosition(camPos.x, camPos.y, camPos.z);
    }
    camera.setLocalEulerAngles(camPitch, camYaw, 0);
    publishNow(); // ?debug=1 live "you are here" readout

    // ── cluster / ceiling / Close + the O7 choreography (reinterp only) ──
    if (options.reinterp) {
      if (openingWallActive && !openingWallArmed) {
        openingWallT += dt;
        if (openingWallT >= STARTUP_ARM_SECONDS) {
          openingWallArmed = true;
          witness.setStartupBoard(true, true);
        }
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
            moveHint.style.opacity = '1';
            moveHint.style.pointerEvents = 'auto';
          }
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
        tapeAudio?.setGamePaused(os.paused);
        if (tapeCaption) {
          const cap = tapes.activeCaption;
          tapeCaption.textContent = cap ?? '';
          tapeCaption.style.opacity = cap ? '1' : '0';
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
    if (os.dirty) { frontTex.upload(); os.dirty = false; }
    witness.update(dt);
    if (witness.dirty) { backTex.upload(); witness.dirty = false; }
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
  function applyWindowLight(): void { // O1: warm room start; the corkboard asset itself is unlit/non-reflective
    setLight('roomFill', 0.85);
    setLight('lamp', 2.9, 5.6);
    setLight('screenGlow', 0.0);
    setLight('moonlight', 0.14);
    setLight('witnessCold', 0.50);
  }
  function applyLightsOn(): void { // O2: the lamp owns the room; cool stays an accent
    setLight('roomFill', 0.85);            // warm ambient fill (life)
    setLight('lamp', 2.9, 5.6);            // amber pool over-throwing wider than real
    setLight('screenGlow', 0.32);          // the monitor — the only true cold INTERIOR source
    setLight('moonlight', 0.14);           // moon-blue window wash, soft/low
    setLight('witnessCold', 0.50);         // the cold rear, dimmed so the front stays warm
  }
  // NOTE (Session 34): per-era lighting from E2 on is NOT owned here — it is
  // data/room/cluster.json's `rigs` table, applied by cluster.ts's applyRig()
  // at the end of every morphToEra() call (clusterMorph.ts's own header is
  // explicit: "Lights are NOT morphed here — the cluster's era rigs own
  // them"). The S2R.0a daylight cue (2003 DAYLIGHT replacing E1's night/lamp
  // rig) is implemented THERE (the `e2` rig's `moonlight` target), not as a
  // parallel function here — an app.ts-side override would only be clobbered
  // moments later by applyRig(toEra, animate) inside cluster.morphToEra().

  // the opening's physical cork-board frame sits fixed at Room 1's ORIGINAL
  // spine coordinates (built once, never carried by the morph). It backs the
  // same flat surface as the witness terminal everywhere the terminal stays
  // on that spine (E1-E3) — but at E4 the terminal MIGRATES to Maya's wall
  // (cluster.ts migrateTerminal), leaving this frame behind as an empty,
  // contentless prop on Room 1's now-vacated wall. Hide it whenever the
  // terminal is away from the spine; restore it if a review jump returns
  // to an earlier era (the frame belongs wherever the flat plane still does).
  function setOpeningBoardVisibleForEra(era: EraKey): void {
    const dressing = app.root.findByName('opening-board-dressing');
    if (dressing instanceof pc.Entity) dressing.enabled = era !== 'e4';
  }

  /** animated era morph + the TURN: E4's restart re-anchors the home facing
   *  180° (◆N3 LOCKED — "let's be bold, we need emotion"): a slow conducted
   *  pan under auto-cam, a takeable default otherwise */
  function driveMorph(era: EraKey): void {
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
    os.setDesktopEra(era);
    setOpeningBoardVisibleForEra(era);
    era3Devices?.setEra(era); // Session 37: the three device screens, e3+ only
    // S2R.0a: cluster.morphToEra() below calls applyRig(era, animate), which
    // owns the E2 daylight cue (data/room/cluster.json's `e2` rig) in the
    // SAME morph beat as the room aging — see the note above applyLightsOn().
    cluster.morphToEra(era, true);
    if (era === 'e4') {
      // THE TURN as a dolly — the piece's slowest, heaviest move: rise up over
      // thirty years of rooms and settle into Room 3, Maya's room (the trans
      // room evolved; ◆N3 retargeted from the old spine desk, Round 24)
      dollyTo(270, 4.5, autoCam);
    } else if (seatYaws().length > 1 && seatYaw !== cluster.homeYaw) {
      dollyTo(cluster.homeYaw, 2.4, false); // era jumps re-seat at the lead room
    }
  }

  /** the Close: the room goes dark and gives way to the constellation —
   *  shared by the ?close=1 review param and the debug panel's button */
  function enterClose(): void {
    if (!cluster || !cloud || cloud.visible) return;
    cluster.applyRig('close', false);
    for (const id of [
      'era1-room',
      'fluid-niche',
      'cluster-shell',
      'ceiling-witness',
      'desktop-screen',
      'witness-screen',
      'opening-board-dressing',
      'movement-nodes',
      'era3-device-laptop',
      'era3-device-tablet',
      'era3-device-phone'
    ]) {
      const e = app.root.findByName(id);
      if (e instanceof pc.Entity) e.enabled = false;
    }
    // Round 18: never black — the constellation sits in a night-blue sky
    if (camera.camera) camera.camera.clearColor = closeBackdropColor();
    cloud.show();
    camPos.set(EYE.x, EYE.y, EYE.z);
    camPitch = 6;
    camYaw = 0;
    camera.setLocalPosition(camPos.x, camPos.y, camPos.z);
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
      // R28-0c (item 12b): review jumps skip O1/O3 entirely, so there is never
      // any real content (profile pins, filed record) for the physical
      // cork-board dressing to frame — setOpeningBoardVisibleForEra() would
      // force it visible anyway (true for e1-e3), reading as a bare "undone"
      // board with only the model's own baked decorative sticky notes on it.
      // Review jumps hide the dressing outright instead; the real O1→O3→E1
      // playthrough path (continueFromOpeningWall → onOpeningProfileChange)
      // is unaffected and still shows/hides it correctly by stage.
      const dressing = app.root.findByName('opening-board-dressing');
      if (dressing instanceof pc.Entity) dressing.enabled = false;
      cluster.morphToEra(options.era, false); // the era's open cluster + rig, settled
      era3Devices?.setEra(options.era); // Session 37: review jumps era-gate the device screens too
      if (options.facet && niche) niche.setFacet(options.facet); // override wins
      // boot SEATED at the era's home room (E4 boots already turned — the TURN)
      seatYaw = cluster.homeYaw;
      const sp = seatPose(seatYaw);
      camPos.set(sp.x, sp.y, sp.z);
      camPitch = sp.pitch;
      camYaw = sp.yaw;
      camera.setLocalPosition(camPos.x, camPos.y, camPos.z);
    } else if ((options.reveal || options.morphDemo) && cluster) {
      applyLightsOn();          // E1 lit state…
      cluster.reveal();         // …already past the first filing (O7)
      if (options.morphDemo) morphDemoIn = 4.0; // then the update opens the world
      camPos.set(ESTABLISH.x, ESTABLISH.y, ESTABLISH.z);
      camPitch = ESTABLISH.pitch;
      camYaw = 0;
      camera.setLocalPosition(camPos.x, camPos.y, camPos.z);
    } else {
      applyWindowLight();
      if (options.reinterp === true) {
        setOpeningWall(true);
        camPos.set(OPENING_WALL_VIEW.x, OPENING_WALL_VIEW.y, OPENING_WALL_VIEW.z);
        camPitch = OPENING_WALL_VIEW.pitch;
        camYaw = OPENING_WALL_VIEW.yaw;
      } else {
        camPos.set(EYE.x, EYE.y, EYE.z);
        camPitch = 0;
        camYaw = 0;
      }
      camera.setLocalPosition(camPos.x, camPos.y, camPos.z);
    }
  }

  // dev travel panel (?debug=1 — the shipped build's system, ported; Round 18)
  if (options.reinterp) {
    mountDebugPanel(os, {
      onEra: (era) => driveMorph(era),
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
      onReveal: () => cluster?.reveal(),
      onClose: enterClose,
      onFacet: (f) => niche?.setFacet(f),
      onFlip: doFlip,
      sends: sendRt?.ids,
      onSend: (id, outcome) => sendRt?.fire(id, outcome)
    });
  }

  app.start();
  return app;
}
