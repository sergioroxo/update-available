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
import { mountDebugPanel } from '../debug/panel';
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
// a click-to-move marker's hit radius is a touch larger than its visual disc
// (0.22m, movementNodes.ts) — the same "forgiving after arm" click generosity
// the O1 wall click already uses. The blink is a CUT, never a tween: fade to
// black, THEN move the camera, THEN fade back — no smooth travel (Sérgio's
// explicit law: gaze must stay free, and a blink can never look like a dolly).
const MARKER_HIT_RADIUS = 0.32;
const BLINK_OUT_SECONDS = 0.13;
const BLINK_IN_SECONDS = 0.22;

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

function makeScreenTexture(app: pc.Application, source: HTMLCanvasElement): pc.Texture {
  const tex = new pc.Texture(app.graphicsDevice, {
    width: source.width,
    height: source.height,
    format: pc.PIXELFORMAT_RGBA8,
    mipmaps: false,
    minFilter: pc.FILTER_NEAREST,
    magFilter: pc.FILTER_NEAREST,
    addressU: pc.ADDRESS_CLAMP_TO_EDGE,
    addressV: pc.ADDRESS_CLAMP_TO_EDGE
  });
  tex.setSource(source);
  return tex;
}

function makeScreenEntity(name: string, tex: pc.Texture, w: number, h: number, transparent = false): pc.Entity {
  const material = new pc.StandardMaterial();
  material.useLighting = false;
  material.diffuse = new pc.Color(0, 0, 0);
  material.emissiveMap = tex;
  material.emissive = new pc.Color(1, 1, 1);
  if (transparent) {
    material.opacityMap = tex;
    material.opacityMapChannel = 'a';
    material.blendType = pc.BLEND_NORMAL;
    material.depthWrite = false;
  }
  material.update();
  const e = new pc.Entity(name);
  e.addComponent('render', { type: 'plane' });
  e.setLocalScale(w, 1, h);
  if (e.render) e.render.material = material;
  return e;
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
  }
  const openingBoardDressing = options.reinterp === true ? buildOpeningBoardDressing(app) : null;

  // ── the two surfaces ──
  const os = new DesktopOS({ reinterp: options.reinterp === true });
  if (new URLSearchParams(window.location.search).get('debug') === '1') {
    // ?debug=1 OS probe (review aid, like __ledger): drive monitor clicks in
    // logical canvas coords without the world→screen projection dance
    (window as { __os?: DesktopOS }).__os = os;
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
    const sp = seatPose(node.seatYaw);
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
      // R28-1: click-to-move, NEVER gaze-to-move — this pointerdown ray/hit
      // test is the ONLY thing that can arm a marker; looking at one (however
      // long) never does. Only test markers actually being offered right now
      // (movementNodes.available already excludes the current seat).
      if (movementNodes && cluster && !scriptedBusy()) {
        for (const n of movementNodes.available(cluster.era, seatYaw)) {
          if (rayHitsPoint(e, { x: n.marker[0], y: n.marker[1], z: n.marker[2] }, MARKER_HIT_RADIUS)) {
            requestMove(n.id);
            return;
          }
        }
      }
      const p = toDesktop(e);
      if (p) { // the monitor is the UI; everywhere else is the room
        os.handleClick(p.x, p.y);
        return;
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
    // dolly-follow (Round 23): releasing a head-turn nearer another room's
    // facing travels there — "when the person turns their head it follows
    // the path of the camera". A small turn inside the room stays free.
    if (options.reinterp && !facingBack && !camMove) {
      const seats = seatYaws();
      if (seats.length > 1 && angDist(camYaw, seatYaw) > 55) {
        let best = seatYaw;
        for (const s of seats) if (angDist(camYaw, s) < angDist(camYaw, best)) best = s;
        if (best !== seatYaw) dollyTo(best, 2.6, false);
      }
    }
  });
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    // F2, not a letter: printable keys must always reach the typing hand
    if (e.key === 'F2' && os.inDesktop && !os.paused) {
      doFlip();
      e.preventDefault();
      return;
    }
    // reinterp browser CAMERA controls (§0-REV-5): arrow keys always steer the
    // view; R/F are shortcuts, but only when no phase is capturing typed text —
    // camera only, never a content verb. Non-reinterp keeps the shipped path.
    if (options.reinterp && !os.paused) {
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') {
        const seats = seatYaws();
        if (seats.length > 1 && (k === 'ArrowLeft' || k === 'ArrowRight')) {
          // open cluster: left/right = dolly to the adjacent room (Round 23)
          if (!camMove || !camMove.conducted) {
            let i = seats.indexOf(seatYaw);
            if (i < 0) { // era snap left us off-list: nearest seat by angle
              i = 0;
              for (let j = 1; j < seats.length; j++) {
                if (angDist(seatYaw, seats[j]) < angDist(seatYaw, seats[i])) i = j;
              }
            }
            const next = k === 'ArrowLeft'
              ? seats[(i + 1) % seats.length]
              : seats[(i - 1 + seats.length) % seats.length];
            dollyTo(next, 2.6, false);
          }
        } else {
          nudgeCamera();
          if (!camMove) {
            if (k === 'ArrowLeft') camYaw += 6;
            else if (k === 'ArrowRight') camYaw -= 6;
            else if (k === 'ArrowUp') camPitch = Math.min(DRAG_PITCH_MAX, camPitch + 5);
            else camPitch = Math.max(-DRAG_PITCH_MAX, camPitch - 5);
          }
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
    os.setDesktopEra(era);
    setOpeningBoardVisibleForEra(era);
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
      'movement-nodes'
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
      os.setDesktopEra(options.era);
      setOpeningBoardVisibleForEra(options.era);
      cluster.morphToEra(options.era, false); // the era's open cluster + rig, settled
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
