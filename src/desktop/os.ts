/**
 * The desktop OS — phase state machine for the vertical slice:
 * warning → boot → name → desktop (mIRC → DM → log toast) → [flip happens
 * in the engine] → dossier card #1. All display text from data/strings/.
 *
 * Registers: warning/left = frame (bare); name/desktop = operable;
 * the ESC pause overlay is care infrastructure and preempts everything.
 */
import { ERA1, ERA1_CANVAS, RENDER_SCALE } from './theme/era1';
import * as ui from './theme/chrome';
import institutionStrings from '../../data/strings/institution.json';
import { entriesByEra, practiceOf } from '../witness/record';
import { drawYesPoster, YES_W, YES_H } from './apps/yesPoster';
import { Web1997App } from './apps/web1997';
import browserStrings from '../../data/dialog/s1_browser.json';
import { Web2003App } from './apps/web2003';
import { TestimonyApp } from './apps/testimony';
import testimonyStrings from '../../data/dialog/s2_testimony.json';
import forumStrings from '../../data/dialog/s2_forum.json';
import ircDialog from '../../data/dialog/s1_irc.json';
import { drawPixelIcon, hasPixelIcon } from './theme/icons';
import { setFaceEra } from './theme/fonts';
import { IrcApp } from './apps/irc';
import { KitApp } from './apps/kit';
import kitStrings from '../../data/dialog/s1_kit.json';
import { PacketApp } from './apps/packet';
import { DiaryApp } from './apps/diary';
import { ProvotypeApp, type Provotype } from './apps/provotype';
import { UpdateApp, type UpdateKey } from './apps/update';
import { RestorifyApp } from './apps/restorify';
import { NetVisionPlayerApp } from './apps/netvision';
import { CalebThreadApp } from './apps/caleb';
import { AccountabilityApp } from './apps/accountability';
import { LambyRigFileApp } from './apps/lambyRigFile';
import { RootCauseApp } from './apps/rootCause';
import { MediaPlayerApp } from './apps/mediaPlayer';
import rootCauseStrings from '../../data/strings/rootcause.json';
// ERA 4's SHELL (S76) — the place the visor opens. See that module's header:
// this file draws it INSTEAD of a desktop from `e4` on, because E4 has none.
import { E4Shell, setE4Bridge, roomIsMounted } from './apps/space';
// ONE Lamby (see src/desktop/apps/lambyChar.ts's header — that module is the
// single definition, shared with ?lambyrig=1). His debut draws the CHARACTER,
// not the little blocky mark this file used to carry: a conductor introducing
// himself by name should be the same creature the rest of the era shows.
import { drawLambyChar, type LambyAction } from './apps/lambyChar';
import { E2_SPLASH, drawE2Splash, e2SplashVersion } from './apps/bootSplash';
import { drawLambyCartoon, e2CartoonVersion, E2_CARTOON } from './apps/lambyCartoon';
// the boot jingle hook — an unregistered name is never requested (registry law
// in that module's header), so this is silent and error-free until an asset lands
import { playOnce, isAudioAvailable } from '../audio/tapeAudio';
import { GuideThread } from '../narrative/guide';
import { setPauseOS, pauseItems, pauseWords, wayBackLine } from '../narrative/pauses';
import { BelongingsSystem } from '../narrative/belongings';
import sendsData from '../../data/sends.json';
import { ledger, wipeLedger } from '../state/ledger';
import strings from '../../data/strings/slice.json';
import reinterpStrings from '../../data/strings/reinterp.json';
import opening from '../../data/strings/opening.json';
import lambyStrings from '../../data/dialog/s2_lamby.json';
import jingleLyrics from '../../data/dialog/s2_jingle_lyrics.json';
import s4update from '../../data/dialog/s4_update.json';
import mediaStrings from '../../data/dialog/s2_media.json';
import calebStrings from '../../data/dialog/s2_caleb.json';
import pillowProvotypeData from '../../data/provotypes/pillow.json';
import originIntakeProvotypeData from '../../data/provotypes/origin_intake_e1.json';

/**
 * S2R.0/S2R.1 (R28-2d-i/ii): the E2 arrival sub-state machine, only
 * meaningful while desktopEra === 'e2'.
 *   'silence'    the waiting screen (felt · bare, S2R.0c) — one dim line;
 *   'osBoot'     THE LAMBYOS BOOT (Session 60) — the machine has been updated
 *                and this is where it says so, crawl + jingle hook;
 *   'lambyBoot'  the brief "Restorify — finishing installation…" beat;
 *   'lambyIntro' ⚑ LAMBY IS PRESENTED — his debut, in character, two lines;
 *   'lambyProgram' he presents RESTORIFY — so the face and the apparatus stop
 *                reading as two competing systems (Sérgio, finding A4);
 *   'active'     the ordinary era-2 desktop (icons + taskbar).
 *
 * SESSION 60, why the middle three exist. Sérgio: *"there is no boot up
 * sequence for the new version of LambyOS… we need to be presented to Lamby,
 * if not it doesn't make much connection with the overall experience. Also it
 * may create a bit of conflict with the overall Restorify system, so Lamby
 * needs to present it to us."* The era used to go silence → 1.6s of installer
 * text → a window in which a lamb was simply, unaccountably, already there.
 * The version change passed unmarked and the conductor the whole guidance
 * lineage hangs on arrived without a name.
 *
 * ASSISTANT LAW ARITHMETIC (CLAUDE.md R28 amendment 2 + the shipped cap):
 * two conduction beats, exactly two lines each — four assistant lines across
 * the whole arrival, under the ≤5-per-stage cap, and ≤2 per beat as required.
 * Dismissal works at BOTH beats and files at both; dismissing the
 * introduction skips the program beat entirely (the era does not chase).
 */
type E2Stage = 'silence' | 'post' | 'splash' | 'osBoot' | 'lambyBoot' | 'lambyCartoon' | 'lambyIntro' | 'lambyProgram' | 'active';
/** S156 / R3-48 — the black beat before the splash (the POST beep and the drive), and the black
 *  beat before Lamby's panel: a 2003 machine goes dark between the things it shows you */
const E2_POST_SECONDS = 2.0;
/** ⚑ Phase 7 (his: "the song needs a fade-out, not a drop cut") — the jingle at half (S155), fading to nothing over its last seconds */
const JINGLE_VOLUME = 0.5;
const JINGLE_FADE_SECONDS = 3.5;
type LyricLine = { t: number; words: Array<[number, string]> };
const JINGLE_LINES = (jingleLyrics as unknown as { lines: LyricLine[] }).lines;
/** ⚑ Phase 7 — how long a new guide line stands in full above the taskbar before it folds into its well */
const GUIDE_TIP_SECONDS = 7;
/** S157 / R3-50: how long a 2003 program's loading box holds before its window */
const PROGRAM_SPLASH_SECONDS = 1.6;
const MEDIA_PLAYER_TITLE = 'Media Player';
const E2_LAMBY_BLACK = 0.9;
const E2_BOOT_HOLD = 2.2;   // s — hold the completed LambyOS 2003 crawl before the installer line
const LAMBY_BOOT_HOLD = 2.4; // s — black (S156), then the "finishing installation…" line's hold
/** S2R.5: s of ordinary desktop between the video beat ending and the
 *  PureMail envelope. The collapse is triggered by the apparatus's own
 *  documented failure, never by the player — the delay is only pacing.
 *  S60: 2.4 → 5.0. Caleb's toast now arrives at the END of the video rather
 *  than at the break's start (finding D17), and it needs a moment of ordinary
 *  desktop to be seen and pressed before the collapse takes the screen. */
const PUREMAIL_DELAY = 5.0;
/** s for the desktop to come back up out of the residue's fade-to-black
 *  (S60, finding F25 — the beat used to end on a hard cut to the desktop) */
const DESKTOP_RETURN_FADE = 1.8;

// The shipped opening (warning→off→boot→splash→name→desktop) is UNTOUCHED.
// Behind ?reinterp=1 the four r_* phases REPLACE it (OPENING_AND_FLOW_SPEC
// §1, O1–O3): O1 (start screen) is a DOM overlay owned by the engine while the
// monitor sits in `r_dark`; O2 boot + O3 profile/recap render on the monitor.
type Phase =
  | 'warning' | 'off' | 'boot' | 'splash' | 'name' | 'desktop' | 'left'
  | 'r_dark' | 'r_boot' | 'r_splash' | 'r_profile' | 'r_recap';
type DesktopEra = 'e1' | 'e2' | 'e3' | 'e4';

const SPLASH_SECONDS = 4.6;        // hold the loading screen long enough to read
const BOOT_CPS = 0.030;            // seconds per char — slower BIOS crawl
const BOOT_HOLD = 4.8;             // hold completed BIOS so the install lines read
const R_BOOT_HOLD = 3.2;           // hold the LambyOS boot after the crawl completes
/** S156 (Sérgio: "we are missing the chime of the boot-up… it jumps to the profile setup"): the
 *  OS splash between the crawl and the profile, with the era's own startup chime */
const R_SPLASH_SECONDS = 4.2;

const WARNING_ARM_DELAY = 4; // s before CONTINUE becomes active (ethics)
const ESCALATION_FALLBACK = 24; // s after the hook: Rob escalates even if the player never flips (main-parity)
// display text lives in data/ — never in code (CLAUDE.md law)
const BOOT_LINES: ReadonlyArray<string> = strings.boot.lines;

interface Hit { x: number; y: number; w: number; h: number; id: string }

interface DesktopOSOptions {
  reinterp?: boolean;
}

export interface OpeningProfileSnapshot {
  active: boolean;
  stage: 'inactive' | 'boot' | 'profile' | 'recap';
  icon: string;
  chips: string[];
  goal: string;
  filed: boolean;
}

export class DesktopOS {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly reinterp: boolean;
  dirty = true;

  private phase: Phase = 'warning';
  private t = 0;
  private phaseT = 0;
  private hits: Hit[] = [];
  private hover = '';
  /** ⚑ S207 — the era's pause (data/strings/pauses.json): open now, and which eras have had theirs */
  private pauseOpen: 'e1' | 'e2' | null = null;
  private pauseLines: string[] = [];
  private readonly pauseShown = new Set<string>();
  /** ⚑ Phase 7 — the 2003 jingle, kept so its tail can fade and its words can be drawn */
  private e2Jingle: HTMLAudioElement | null = null;
  private jingleLyricKey = '';
  /** ⚑ Phase 7 — the guide's tooltip: when its line last changed (−1: folded), and whether a press holds it up */
  private guideTipAt = -1;
  private guideTipPinned = false;
  paused = false;

  // boot
  private bootChars = 0;
  private readonly bootTotal = BOOT_LINES.reduce((n, l) => n + Math.max(l.length, 1), 0);

  // name
  private nameInput = '';
  private greeting = false;

  // reinterp opening (O2/O3, ?reinterp=1 only — see the r_* phases)
  private rBootChars = 0;
  private readonly rBootTotal = (opening.o2_boot_lines as string[])
    .reduce((n, l) => n + Math.max(l.length, 1), 0);
  private profileIcon = '';
  private profileChips: string[] = [];
  private profileGoal = ''; // '' until chosen; 'declined' files as a choice too
  private profileFiled = false;

  // desktop
  kit: KitApp | null = null;
  irc: IrcApp | null = null;
  packet: PacketApp | null = null;
  diary: DiaryApp | null = null;
  private desktopEra: DesktopEra = 'e1';
  /** the reinterpretation provotype runtime — reachable behind ?reinterp=1 only */
  provotype: ProvotypeApp | null = null;
  /** S55 — lamby_rig.exe, the Era-1 easter egg (the puppet-rigging tool,
   *  found BEFORE Lamby the character exists). E1-only, reinterp-only, never
   *  advertised. See src/desktop/apps/lambyRigFile.ts's header for the rules
   *  this field's own gating (e1DesktopIdle, below) exists to satisfy. */
  private lambyRigFile: LambyRigFileApp | null = null;
  /** S153 — ROOTCAUSE.EXE, the second file on the disk (W-L1, his pick) */
  rootCause: RootCauseApp | null = null;
  /** S157 / R3-52 — the 2003 media player Caleb's file opens in */
  mediaPlayer: MediaPlayerApp | null = null;
  /** S157 / R3-50 — a program starting: the loading box every 2003 app shows first
   *  (Sérgio: "Daily Realignment should have a loading box, like old Windows") */
  private programSplash: { title: string; t: number } | null = null;
  /** the era-update ritual (spine-armed; never player-triggered) */
  updateApp: UpdateApp | null = null;
  /** ⚑ ERA 4's SHELL (S76) — null until the era is `e4`, and from then on it is
   *  the whole of this canvas: the headset's standby field, then THE PLACE.
   *  There is no desktop underneath it (`drawDesktop` returns before any
   *  chrome), which is the era's own statement: the application layer is gone
   *  and the OS is the assistant. Published on the bridge so the room can mount
   *  this same canvas on the visor — see src/desktop/apps/space.ts. */
  e4: E4Shell | null = null;
  /** R28-2a: the Era-1 side-message guide thread (reinterp only, pre-Lamby) */
  guide: GuideThread | null = null;
  /** R28-2c: the belongings beat (T1's gathering window), reinterp only */
  belongings: BelongingsSystem | null = null;
  /** S2R.0/S2R.1: the E2 arrival sub-stage (silence → osBoot → lambyBoot →
   *  lambyIntro → lambyProgram → active) */
  private e2Stage: E2Stage = 'silence';
  private e2StageT = 0;
  /** the LambyOS 2003 crawl's typed-character counter (same grammar as the
   *  BIOS and O2 crawls above — this machine boots the way it always has, at
   *  a new version number) */
  /**
   * ⚑ S116 — the splash's own clock and its dissolve. `e2StageT` is reset when
   * the stage turns over, so the splash needs a second counter to keep
   * dissolving OVER the crawl that has already started typing underneath it.
   * That overlap is the whole of Sérgio's note: *"not skipable but we can have
   * the system appearing as the song still plays."*
   */
  private e2SplashFade = 0;
  private e2BootChars = 0;
  private e2BootDoneAt = Infinity; // e2StageT at which the crawl completed (typed OR click-completed)
  private readonly e2BootTotal = (lambyStrings.osBootLines as string[])
    .reduce((n, l) => n + Math.max(l.length, 1), 0);
  /** seconds since the Lamby surface currently on screen appeared — drives his
   *  appear-pop and his idle fidget. Reset when a Lamby window opens; NOT reset
   *  between his introduction and his presentation of Restorify, so the debut
   *  reads as one arrival with two things said, rather than two pop-ins. */
  private lambyPoseT = 0;
  /** S2R.3 seam (finding B8): a message has landed and has not been opened.
   *  While true, the Messenger sits on the desktop with its unread mark — the
   *  door stays there whether or not Lamby's notice was dismissed. */
  private messagePending = false;
  /** Lamby's notice ABOUT that message (one conduction beat, two lines, both
   *  answers work). Never open during a felt scene: it is armed only from the
   *  check-in card's own Continue press, on the ordinary desktop. */
  private messageNoticeOpen = false;
  private messageNoticeShown = false;
  /** S2R.2: the Restorify check-in window (opened by Begin, or the desktop icon) */
  restorify: RestorifyApp | null = null;
  /** S2R.4 (R28-2d-iv): Lamby's video offer — small popup, ≤2 lines + 2 chips.
   *  Provisional trigger: after the FIRST completed Restorify check-in (the
   *  FINAL trigger moves to the Caleb/S2R.3 relapse beat once that lane
   *  builds — documented in the session log, not decided here). */
  private netvisionOfferOpen = false;
  private netvisionOfferedThisSession = false;
  /** the NetVision Player itself (the New You Program video) */
  netvision: NetVisionPlayerApp | null = null;
  /** S2R.3–S2R.6 (Session 45): the Caleb thread's FELT surfaces — the
   *  messenger window, the redaction, his return, the residue commit. Lamby
   *  is never drawn inside any of them (the law is a module boundary: this
   *  object's module imports no Lamby renderer at all). */
  caleb: CalebThreadApp | null = null;
  /** every OPERABLE intrusion on that window — the accountability alert, the
   *  flag, the streak's death, the shame hold, and the PureMail collapse. */
  accountability: AccountabilityApp | null = null;
  private calebOpenedThisSession = false;
  /** when the collapse's envelope lands (Infinity = not armed) */
  private pureMailAt = Infinity;
  /** THE BREAK's residue: a small, non-interactive persistent mark once the
   *  video tears to static and Caleb's message-fragment surfaces through it —
   *  "the notification mark persisting quietly" (brief). The Caleb thread
   *  proper stays gated/untouched; this is only the visual residue. */
  private calebNotificationVisible = false;
  /** S46's WAV while it is sounding (S60). os.ts owns it so Esc/pause and
   *  Leave can reach it; null whenever nothing is playing. */
  private pureMailVoice: HTMLAudioElement | null = null;
  /** `t` at which the desktop began coming back up out of the residue's black */
  private desktopReturnAt = -1;
  /** ⚑ S164 / R3-61 — THE NOTICE RISES OUT OF THE RESIDUE'S DARK. Sérgio
   *  (2026-09-20): "didn't we make Caleb the breaking point of the narrative?
   *  then it should be in him." So after the residue the desktop does NOT come
   *  back: the monitor stays black — no icons, no taskbar, no toast — and the
   *  Service Transition notice (u3) is the next thing on it. True until the
   *  era changes (`setDesktopEra`). */
  private residueDark = false;
  /**
   * ⚑ S165 / W-E2 (a) — MINIMISED WINDOWS. Sérgio (2026-09-20): "ALL 1997/2003
   * windows get a taskbar button and a minimise box, period-true." The PROGRAM
   * windows — the channel, the wizard, the rig file, Root Cause Digger, the found
   * file, Restorify, the media player, the video — carry a `_` box
   * (`ui.windowFrame`'s `minKey`) and a taskbar button: pressed in while the
   * window is up, raised while it waits; the box or the button minimises, the
   * button (or the desktop icon) restores. Minimised = `open` false with the
   * instance kept, exactly S151's wizard, generalised. ⚑ NOT the felt windows —
   * the Messenger, the diary, the letter own the screen by the register law
   * (CLAUDE.md: felt = no mechanics) — and not the ritual's dialogs.
   */
  private minimised = new Set<string>();
  private windowOf(key: string): { open: boolean; hits?: unknown[]; restore?: () => void } | null {
    type Win = { open: boolean; hits?: unknown[]; restore?: () => void };
    switch (key) {
      case 'irc': return this.irc as unknown as Win | null;
      case 'web': return this.web as unknown as Win | null;
      case 'kit': return this.kit as unknown as Win | null;
      case 'lambyrig': return this.lambyRigFile as unknown as Win | null;
      case 'rootcause': return this.rootCause as unknown as Win | null;
      case 'restorify': return this.restorify as unknown as Win | null;
      case 'media': return this.mediaPlayer as unknown as Win | null;
      case 'netvision': return this.netvision as unknown as Win | null;
      case 'dossier': return { get open() { return false; } };   // handled by `dossierOpen` below
      default: return null;
    }
  }
  private windowOpen(key: string): boolean {
    return key === 'dossier' ? this.dossierOpen : !!this.windowOf(key)?.open;
  }
  private windowPresent(key: string): boolean {
    return key === 'dossier' ? (this.dossierOpen || this.minimised.has('dossier')) : !!this.windowOf(key);
  }
  minimiseWindow(key: string): void {
    if (!this.windowPresent(key) || !this.windowOpen(key)) return;
    if (key === 'dossier') this.dossierOpen = false;
    else {
      const w = this.windowOf(key)!;
      w.open = false;
      if (Array.isArray(w.hits)) w.hits.length = 0;   // nothing of a minimised window is aimable
    }
    this.minimised.add(key);
    this.dirty = true;
  }
  restoreWindow(key: string): void {
    this.minimised.delete(key);
    if (key === 'dossier') { this.dossierOpen = true; this.dirty = true; return; }
    const w = this.windowOf(key);
    if (!w) return;
    if (w.restore) w.restore(); else w.open = true;
    this.dirty = true;
  }
  /** the taskbar's window buttons, in a fixed order: present windows only */
  private taskbarWindows(): { key: string; label: string }[] {
    const all: { key: string; label: string }[] = [
      { key: 'kit', label: kitStrings.taskbarLabel },
      { key: 'irc', label: strings.desktop.taskbarIrc },
      { key: 'web', label: browserStrings.taskbar },
      { key: 'dossier', label: strings.desktop.taskbarDossier },
      { key: 'lambyrig', label: strings.desktop.taskbarLambyRig },
      { key: 'rootcause', label: strings.desktop.taskbarRootCause },
      { key: 'restorify', label: strings.desktop.taskbarRestorify },
      { key: 'media', label: strings.desktop.taskbarMedia },
      { key: 'netvision', label: strings.desktop.taskbarNetvision }
    ];
    return all.filter((w) => this.windowPresent(w.key) && (this.windowOpen(w.key) || this.minimised.has(w.key)));
  }
  /** a live send OFFER (master script §4) — icon + summons window on the desktop */
  private sendOffer: { id: string; open: boolean } | null = null;
  /** ⚑ S87 — hit rects from the last `drawSendOfferExternal` call (era3Devices.ts's
   *  workstation composite; see that method's own comment for why it exists). Kept
   *  separate from `this.hits`, which stays Daniel's own (dead, in E3) click
   *  table, so the two draw paths can never cross-hit each other. */
  private externalSendHits: Hit[] = [];
  /** ⚑ S87 — bumped whenever `sendOffer` changes, so era3Devices.ts's workstation
   *  screen knows to redraw+reupload (its dirty-upload law needs a version
   *  number, and the send offer is not on the workstation's own `graceQueueLite`
   *  clock). Static content otherwise — no per-frame animation to track. */
  private sendOfferVersion = 0;
  /** engine listens: the update restart landed — morph the space to `era` */
  onEraShift?: (era: string) => void;
  /** ⚑ S86 — engine listens: the player pressed I Agree / Install and the
   *  ascent must start NOW, so the room ages underneath them rather than after
   *  them. See UpdateApp.onInstallBegin for the whole argument. The engine
   *  decides which transitions take it; the OS only reports the press. */
  onEraRelocate?: (era: string) => void;
  /** engine listens: the player answered a summons (visit dollies the camera) */
  onSendResolve?: (id: string, outcome: 'visited' | 'declined') => void;
  private toast: { text: string; t: number } | null = null;
  private kitToastShown = false;
  private behindToastShown = false;
  private behindToastAt = Infinity;
  private escalationFallbackAt = Infinity; // Rob escalates on this deadline if the player never flips
  private diaryPendingAt = Infinity; // soft beat between the packet and the diary
  /** engine reads this to creep the cold (witness) side into peripheral vision */
  hasUnseenWitness = false;
  dossierUnlocked = false;
  private dossierOpen = false;
  /** ⚑ S183f / R5-04 — 2003's "Your file (read only)" (drawYourFile) */
  private yourFileOpen = false;
  /** ⚑ Phase 7 — the map's ○ beat: the folder has been opened once (menu state, never filed) */
  yourFileSeen = false;
  /** ⚑ S190 — the 1997 browser: the search, between the dial-up and the channel */
  web: Web1997App | null = null;
  /** ⚑ S191 — 2003's forum: recommended after the first check-in; opened from its desktop icon */
  forum: Web2003App | null = null;
  private forumRecommended = false;
  private lambyWaitShown = false;
  /** ⚑ S194 — seconds since the last press on the desktop (the helpers wait for quiet) */
  idleSeconds = 0;
  private joinChannel: () => void = () => {};
  /** ⚑ S186 — the image Rob sent over DCC, open in its viewer (owns the screen until closed) */
  private yesOpen = false;
  private yesArt: HTMLCanvasElement | null = null;
  /** engine listens: pulse the flip affordance when the hook lands */
  onFlipReady?: () => void;
  /** engine listens: user chose LEAVE */
  onLeave?: () => void;
  /** engine listens: hide the physical floppy once it is in the drive */
  onKitInserted?: () => void;
  /** S151 — the Un-Walk's pray step presses play on Tape A (app.ts owns the boombox) */
  onPlayTape?: () => void;
  /** …and Amen before the end takes it off */
  onStopTape?: () => void;
  /** S151 — what the boombox is doing, for the prayer's words (app.ts) */
  tapeProbe?: () => { inserted: string | null; playing: boolean; elapsed: number };
  /** engine listens: mirror O3's live selections onto the rear cork/record plane */
  onOpeningProfileChange?: (snapshot: OpeningProfileSnapshot) => void;
  /** engine listens: a soft full-frame glitch — warm for the person's breakout */
  onGlitch?: (kind: 'person' | 'system') => void;

  constructor(options: DesktopOSOptions = {}) {
    this.reinterp = options.reinterp === true;
    setPauseOS(this);   // S207 — the pauses read the same map from every era's surface
    this.canvas = document.createElement('canvas');
    this.canvas.width = ERA1_CANVAS.width * RENDER_SCALE;
    this.canvas.height = ERA1_CANVAS.height * RENDER_SCALE;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.scale(RENDER_SCALE, RENDER_SCALE); // all layout stays logical
    // reinterp replaces the shipped opening: the monitor waits dark (O1 lives
    // as the engine's DOM overlay) until beginReinterpOpening() lights the boot.
    if (this.reinterp) {
      this.phase = 'r_dark';
      // ⚑ S77 — THE RECORD HOLDS A NAME FROM THE FIRST FRAME, and this is a
      // BUG FIX, not tidying. `beginReinterpOpening` prefills it ("they already
      // know your name" — there is no typed name in this branch), but a review
      // jump (`?era=4`, `?flat=1`, any debug-panel landing) never runs the
      // opening, so the ledger sat on its display placeholder `—`. Era 4's
      // deadname beat reads the name from `ledger.name` and from nowhere else,
      // by design — so in exactly the state Sérgio reviews in, the era's
      // highest-risk line rendered as "…still lists you as —." Found by looking
      // at the frame. Setting it here makes it true of any reinterp session
      // however it was entered; `beginReinterpOpening` still sets the same value
      // and is now a no-op restatement rather than the only source.
      ledger.name = opening.o3_prefilled_name;
      this.guide = new GuideThread(this);
      this.belongings = new BelongingsSystem();
      // S76 — the room reads the era's shell and the last ritual through here.
      // Lazy by construction: app.ts builds era3Devices BEFORE the OS.
      setE4Bridge({
        canvas: () => this.canvas,
        update: () => this.updateApp,
        shell: () => this.e4,
        armFinal: () => this.armUpdate('u4'),
        // ⚑ S87 — the era-3 send offer's own workstation composite; see
        // `drawSendOfferExternal`'s comment and the blackout condition above.
        sendOfferActive: () => this.sendOfferActive,
        sendOfferVersion: () => this.sendOfferVersionNum,
        drawSendOfferExternal: (ctx) => this.drawSendOfferExternal(ctx),
        handleSendOfferExternalClick: (x, y) => this.handleSendOfferExternalClick(x, y)
      });
    }
  }

  /** the current desktop era — read by the guide-thread conditions */
  get era(): DesktopEra {
    return this.desktopEra;
  }

  get inDesktop(): boolean {
    return this.phase === 'desktop';
  }

  /**
   * True while a phase is capturing typed characters (name entry / IRC). The
   * engine consults this so browser CAMERA shortcuts (R/F, §0-REV-5) never
   * steal a letter from the typing hand. The reinterp opening (O1–O3) captures
   * no text — every choice is a click — so shortcuts are free there.
   */
  get isCapturingText(): boolean {
    // only the name entry types now — the IRC is lurk-only/press-only, so the
    // camera shortcuts (R/F) stay free while it's open (main-parity)
    if (this.phase === 'name' && !this.greeting) return true;
    return false;
  }

  /** O1→O2: the engine's start screen calls this on Continue (flat calls it at
   *  start, having no O1 overlay). Lights the LambyOS boot on the monitor. */
  beginReinterpOpening(): void {
    if (!this.reinterp || this.phase !== 'r_dark') return;
    ledger.name = opening.o3_prefilled_name; // "they already know your name"
    this.setPhase('r_boot');
    // (S156: the machine's own start is heard EARLIER now — app.ts plays it during the
    //  descent, "as we travel", so the crawl arrives on a machine already running)
  }

  /** S156 — the splash: the OS's mark, the loading bands, and the startup chime (ours) */
  private startReinterpSplash(): void {
    if (this.phase !== 'r_boot') return;
    this.setPhase('r_splash');
    playOnce('startup_1997.mp3');
  }

  /** R3-13 — the Family Form exists once Rob has said "i spoke with your mother"
   *  (irc.ts files the turn's `record`); read by the desktop icon, the wizard's
   *  fourth step and the guide's `form` message */
  get formAvailable(): boolean {
    return ledger.records.includes('rob-spoke-mother');
  }

  /** S1.0 power-on beat: the machine waits dark until the player acts */
  get isOff(): boolean {
    return this.phase === 'off';
  }

  /** S145 — the player has left (the menu's Leave); the frame's helper stays down */
  get hasLeft(): boolean {
    return this.phase === 'left';
  }

  powerOn(): void {
    if (this.phase === 'off') this.setPhase('boot');
  }

  /** S1.2 — the disk goes in (3D floppy click, or the A:\ icon) */
  insertKit(): void {
    if (this.phase !== 'desktop') return;
    // S151: the wizard keeps its state — the A:\ icon and the taskbar button
    // bring it back where it was (W-E2 for this window; Cancel minimises)
    if (this.kit) { this.kit.restore(); this.dirty = true; return; }
    this.kit = new KitApp();
    this.toast = null;
    playOnce('floppy_1997.mp3');   // S141: the disk goes in, the drive reads it
    if (!ledger.records.includes('kit-inserted')) ledger.records.push('kit-inserted');
    this.onKitInserted?.();
    // S151 — the programme's steps reach into the room and the desktop
    this.kit.onPlayTape = () => this.onPlayTape?.();
    this.kit.onStopTape = () => this.onStopTape?.();
    this.kit.tapeProbe = () => this.tapeProbe?.() ?? { inserted: null, playing: false, elapsed: 0 };
    this.kit.formAvailable = () => this.formAvailable;
    this.kit.diaryAvailable = () => this.diary !== null || ledger.records.includes('enrollment-acknowledged');
    this.kit.onOpenForm = () => this.openProvotype(originIntakeProvotypeData as unknown as Provotype);
    this.kit.onOpenDiary = () => { if (!this.diary) this.openDiary(); };
    // R3-24: the dial-up is heard as the connecting page opens, not after it
    this.kit.onDial = () => playOnce('dialup_1997.mp3');
    this.kit.onConnect = () => {
      // S1.4 — online. ⚑ S190: the browser opens first — the search is how he finds the channel
      //   (Phase 5; data/dialog/s1_browser.json); the channel opens from any page's Join
      if (!ledger.records.includes('went-online')) ledger.records.push('went-online');
      this.web = new Web1997App();
      this.web.onSearch = () => { if (!ledger.records.includes('search-1997')) ledger.records.push('search-1997'); this.dirty = true; };
      this.web.onJoin = () => { this.minimiseWindow('web'); this.joinChannel(); this.dirty = true; };
      this.dirty = true;
    };
    this.joinChannel = () => {
      if (this.irc) return;
      if (!ledger.records.includes('channel-joined')) ledger.records.push('channel-joined');
      this.irc = new IrcApp();
      this.irc.onLine = () => playOnce('irc_1997.mp3');
      this.irc.onImage = () => { this.yesOpen = true; this.dirty = true; };
      this.irc.onHooked = () => {
        this.toast = { text: strings.desktop.logToast, t: 6 };
        this.hasUnseenWitness = true; // the cold side begins to creep in
        this.behindToastAt = this.t + 7; // a beat later: a reason to look back
        this.onFlipReady?.();
        // the flip EARNS the escalation (main's resolved design): Rob only
        // pushes the residential program after you've turned and witnessed the
        // record — with a fallback so a player who never turns still advances.
        this.escalationFallbackAt = this.t + ESCALATION_FALLBACK;
      };
      // S1.7 → S1.8: the chosen reply summons the placement packet. The diary
      // glitch, not the IRC, is the true E1 → T1 trigger.
      this.irc.onEscalationDone = () => this.openPacket();
    };
    this.dirty = true;
  }

  /** the residential pitch begins — after the witness flip, or on the fallback */
  private escalate(): void {
    this.escalationFallbackAt = Infinity;
    this.irc?.beginEscalation();
    this.dirty = true;
  }

  /** S1.8 — the enrollment form appears; OK leads after a quiet beat to DIARY.TXT */
  private openPacket(): void {
    if (this.packet || this.diary) return;
    this.packet = new PacketApp();
    this.packet.onAck = () => {
      this.packet = null;
      this.diaryPendingAt = this.t + 1.0;
      this.dirty = true;
    };
    this.dirty = true;
  }

  /** S1.85 — the deletion fails; the person's glitch arms the real T1 update */
  private openDiary(): void {
    if (this.diary) return;
    this.diaryPendingAt = Infinity;
    this.diary = new DiaryApp();
    this.diary.onBreakout = () => this.onGlitch?.('person');
    this.diary.onDone = () => {
      this.diary = null;
      if (!ledger.records.includes('diary-glitch')) ledger.records.push('diary-glitch');
      this.dirty = true;
    };
    this.dirty = true;
  }

  /** the player has turned to the witness side — stop nudging them back, and
   *  let Rob escalate (turning to witness the record is what earns it) */
  markWitnessSeen(): void {
    this.hasUnseenWitness = false;
    this.behindToastAt = Infinity;
    if (this.irc && !this.irc.escalationActive) this.escalate();
    this.dirty = true;
  }

  /** open a reinterpretation provotype (diegetic invitation lives inside it) */
  /**
   * ⚑ THE ROOM'S ONE DOOR INTO A SCREEN BEAT — the racket opens the session it
   * is the instrument of. Same guard as the found file and lamby_rig.exe: only
   * on an otherwise-idle desktop, so it can never fire over a window or during
   * a felt scene, and never while a provotype is already open.
   */
  openPillowFromRoom(): void {
    if (this.provotype || !this.desktopIdle()) return;
    this.openProvotype(pillowProvotypeData as unknown as Provotype);
  }

  /** the room asks before it offers the racket — same law, exposed */
  desktopIdleForProps(): boolean { return this.desktopIdle(); }

  private openProvotype(data: Provotype): void {
    if (!this.reinterp || this.provotype) return;
    this.provotype = new ProvotypeApp(data);
    this.provotype.onClose = () => { this.provotype = null; this.dirty = true; this.wayBack(this.desktopEra); };   // S207
    this.dirty = true;
  }

  /** true only when the Era-1 desktop is otherwise bare — no kit/irc/packet/
   *  diary/provotype window open. `lamby_rig.exe` (S55) is drawn AND
   *  hit-tested only while this holds, so it can never be seen or clicked
   *  during a `felt` scene (the IRC channel, the placement packet, both
   *  register: felt — src/desktop/apps/irc.ts, packet.ts) or over any other
   *  E1 window. This is stricter than the click-priority ordering alone
   *  would require (that ordering already makes it unREACHABLE while those
   *  windows are open) — it also keeps it from merely being VISIBLE behind a
   *  felt window that doesn't cover the whole screen (the packet form does
   *  not), which the click ordering alone would not have prevented. */
  private e1DesktopIdle(): boolean {
    return !this.kit?.open && !this.irc?.open && !this.packet?.open && !this.diary?.open
      && !this.provotype && !this.lambyRigFile && !this.rootCause && !this.web;
  }

  /** the same idea, era-wide (Session 60): NOTHING is open — no window, no
   *  conduction, no ritual. The found file (the renamed dossier) is drawn only
   *  here, which is what makes "never reachable during a felt scene" a
   *  property of the code rather than a promise: the felt surfaces (the
   *  Messenger, the residue) are windows, and a window means not idle. */
  private desktopIdle(): boolean {
    return this.e1DesktopIdle()
      && !this.dossierOpen && !this.yourFileOpen && !this.yesOpen && !this.forum?.open && !this.testimony?.open
      && !this.restorify?.open && !this.caleb && !this.accountability
      && !this.netvision && !this.netvisionOfferOpen && !this.messageNoticeOpen
      && !this.updateApp && !this.sendOffer?.open;
  }

  /** S55 — opens the found file. Never rewarded (no toast, no assistant
   *  remark); filed to the ledger like any other one-off act, and only ever
   *  once per session (a second open is not a second "discovery"). */
  /** S153 — the game on the disk: opened like the rig file, never rewarded,
   *  filed once on opening; its endings file themselves (rootCause.ts) */
  private openRootCause(): void {
    if (this.rootCause || !this.e1DesktopIdle()) return;
    this.rootCause = new RootCauseApp();
    this.rootCause.onClose = () => { this.rootCause = null; this.dirty = true; this.wayBack(this.desktopEra); };   // S207
    if (!ledger.records.includes('rootcause-opened')) ledger.records.push('rootcause-opened');
    this.dirty = true;
  }

  private openLambyRigFile(): void {
    if (!this.reinterp || this.lambyRigFile) return;
    this.lambyRigFile = new LambyRigFileApp();
    this.lambyRigFile.onClose = () => { this.lambyRigFile = null; this.dirty = true; this.wayBack(this.desktopEra); };   // S207
    if (!ledger.records.includes('lamby-rig-opened')) ledger.records.push('lamby-rig-opened');
    this.dirty = true;
  }

  /** ARM an era update (the spine calls this on a documented failure —
   *  never the player; SCRIPT_UPDATE v0.5 §1). Modal over the desktop. */
  armUpdate(key: UpdateKey): void {
    if (!this.reinterp || this.updateApp) return;
    this.updateApp = new UpdateApp(key);
    // ⚑ S86: the press, reported the moment it happens. The engine starts the
    // relocation off this and finishes the era off `onComplete` below, so the
    // two halves of an era change are ONE movement instead of two events.
    this.updateApp.onInstallBegin = (toEra) => this.onEraRelocate?.(toEra);
    this.updateApp.onComplete = (toEra) => {
      this.updateApp = null;
      // S2R.7 item 5 — THE LAST FILING UNDER DANIEL'S NAME. It lands at the
      // restart, not at the notice: the record files the migration when the
      // migration happens. Witness-symmetric in the plainest sense — the
      // system's own act, filed in the system's own cold register, with no
      // player choice anywhere near it (src/witness/intake.ts renders it, the
      // line itself lives in data/strings/updates.json).
      if (key === 'u3' && !ledger.records.includes('subject-migrated')) {
        ledger.records.push('subject-migrated');
      }
      // S76 — the same filing at the same moment for the LAST update: the
      // service became continuous and the companion was registered. Filed at
      // the restart, not at the notice, and filed as the system's own act with
      // no player choice near it (witness symmetry, the plainest kind).
      // ⚑ TWO LINES, because two things happened and the record separates them:
      // the service stopped being an application, and a companion was
      // registered to the file. L is INSTALLED, agreed to in a dialog nobody
      // read — never a character who appears.
      if (key === 'u4' && ledger.e4Space.length === 0) {
        ledger.e4Space.push(
          { id: 'update', outcome: 'installed', witness: s4update.witness.installed },
          { id: 'companion', outcome: 'installed', witness: s4update.witness.arrived }
        );
      }
      this.setDesktopEra(toEra);
      this.dirty = true;
      this.onEraShift?.(toEra);
    };
    // R28-2c/S2R.7: the belongings beat runs ONCE PER DEPARTURE — pass 1 on
    // the T1 notice (u2, the teenager leaves for the placement), pass 2 on the
    // u3 notice ("what do you take from THIS life?", the adult's migration).
    // Same wiring, same window, a different pass number; u4/close have no
    // gathering (there is no room left to gather from — the apparatus is
    // ambient by then, and the final restart is bare by law).
    const pass = key === 'u2' ? 1 : key === 'u3' ? 2 : 0;
    if (pass !== 0 && this.belongings) {
      const belongings = this.belongings;
      const p = pass as 1 | 2;
      this.updateApp.onRemindLaterUsed = () => {
        belongings.openWindow(p);
        // R3-40 (Sérgio: "I deferred the update and there is nothing to do; the
        // IRC window is still there"): the notice took the channel with it — the
        // deferral's one act is in the ROOM, and the desktop must not argue
        if (this.irc) this.irc.open = false;
        this.dirty = true;
      };
      this.updateApp.onWindowClosed = () => belongings.closeWindow();
      this.updateApp.onUpdateNowDirect = () => belongings.fileProcessed(p);
    }
    this.dirty = true;
  }

  /** The room morphs by era; this keeps the monitor from remaining 1997.
   *  `settled`: skip the E2 arrival narrative (silence → Lamby) and land
   *  directly in the ordinary desktop — for `?era=` review jumps only; the
   *  real update ritual and the debug "era — the rooms age" jump both want
   *  the real S2R.0/S2R.1 beats to play. */
  setDesktopEra(era: string, settled = false): void {
    if (era !== 'e2' && era !== 'e3' && era !== 'e4') return;
    this.residueDark = false;   // S164: the dark after the residue ends with the era
    this.minimised.clear();     // S165: nothing waits in a taskbar the era no longer draws
    // ⚑ S104 — and the era's own surfaces stop publishing controls when the era
    //   does. See `clearExternalSendHits`: this is the belt to that brace, and it
    //   catches the case the retirement points cannot — an era ending while an
    //   offer is still live.
    this.clearExternalSendHits();
    const entering = this.desktopEra !== era;
    this.desktopEra = era;
    setFaceEra(era);   // 2026-09-13: the era's face (theme/fonts.ts)
    this.retireEra1Windows();
    // ⚑ E4 HAS NO DESKTOP (docs/REINTERP_E4_THE_SPACE_2026-08-06.md §6). E1, E2
    // and E3 all had one — icons, a taskbar, a thing you opened. This era
    // arrives as a device that is already on and already waiting, so the shell
    // takes the whole surface and no chrome is drawn around it ever again.
    if (era === 'e4') {
      if (!this.e4) this.e4 = this.newE4Shell();
      // A `?era=4` REVIEW JUMP never plays the opening, so this canvas can
      // still be sitting in `r_dark` — which was harmless while E3/E4 drew a
      // dead monitor and is not harmless now that the visor is textured with
      // it. In play the phase is already `desktop` and this changes nothing.
      if (this.phase !== 'desktop') this.setPhase('desktop');
      this.toast = null; // no era-status toast: there is no taskbar to sit in
      this.dirty = true;
      return;
    }
    // ⚑ S145 — A `?era=2|3` REVIEW JUMP never plays the opening either, so this
    //   canvas can still be sitting in `r_dark` — and `handleClick` routes the
    //   E2 arrival (the return press, the greeting's chips) only from `desktop`.
    //   `tools/tour.mjs --era 2` pressed the dark glass for ninety seconds and
    //   filed nothing. Same fix Era 4's branch above has carried since S76; in
    //   play the phase is already `desktop` and this changes nothing.
    if (this.phase !== 'desktop') this.setPhase('desktop');
    if (era === 'e2' && entering) {
      // S2R.0c: THE SILENCE — nothing speaks, not even the era-status toast.
      // The monitor holds only the S2R.0 waiting-screen line until pressed.
      this.e2Stage = settled ? 'active' : 'silence';
      this.e2StageT = 0;
      if (!settled) { this.dirty = true; return; } // no toast, no chrome — the silence holds
    }
    this.toast = { text: this.eraSkin().status, t: 6 };
    this.dirty = true;
  }

  private retireEra1Windows(): void {
    this.kit = null;
    this.irc = null;
    this.packet = null;
    this.diary = null;
    this.provotype = null;
    this.lambyRigFile = null; // S55 — E1-only scope; the file has no E2+ existence
    this.web = null;          // S190 — the 1997 browser stays in 1997
    this.forum = null;        // S191 — and the forum in 2003
    this.forumRecommended = false;
    this.testimony = null;    // S205 — and his story
    this.testimonyOffered = false;
    this.lambyWaitShown = false;
    this.rootCause = null;    // S153 — the same: the disk stays in 1997
    this.sendOffer = null;
    this.clearExternalSendHits();
    this.dossierOpen = false;
    this.yourFileOpen = false;
    this.kitToastShown = true;
    this.behindToastShown = true;
    this.behindToastAt = Infinity;
    this.escalationFallbackAt = Infinity;
    this.diaryPendingAt = Infinity;
    this.hasUnseenWitness = false;
    if (this.desktopEra !== 'e2') {
      this.restorify = null; // leaving e2 closes Restorify
      this.netvisionOfferOpen = false;
      this.netvision = null;
      this.caleb = null;
      this.accountability = null;
      this.pureMailAt = Infinity;
      this.messagePending = false;
      this.messageNoticeOpen = false;
      this.messageNoticeShown = false;
    }
  }

  /** the E2 arrival's own click routing (silence / boot / the two conduction beats) */
  private handleE2ArrivalClick(id: string): void {
    if (this.e2Stage === 'silence') {
      // THE RETURN PRESS (S2R.0, revised): the machine was already waiting —
      // any press on the dark glass advances it, same grammar as S1.0's
      // power press. Files once, immediately.
      this.fileLambyRecord('returned', 'return-press', lambyStrings.witness.returnPressed);
      this.startE2Post();
      return;
    }
    if (this.e2Stage === 'post') return;   // the machine is starting; nothing to press
    /**
     * ⚑ NOT SKIPPABLE (Sérgio, 2026-09-04: *"not skipable"*). A press during
     * the splash does nothing at all — and that is the beat, not an oversight:
     * a program that holds you for half a minute before it will let you touch
     * anything is the era performing its own self-regard. The FRAME's escape
     * is untouched (Esc/pause opens the game menu throughout, CLAUDE.md's
     * amendment 4), so the accessibility floor is intact while the fiction's
     * own surface refuses you.
     */
    if (this.e2Stage === 'splash') return;
    if (this.e2Stage === 'osBoot') {
      // same courtesy the O2 crawl gives: a press completes the typing. It
      // does NOT skip the beat — the boot still holds and resolves on its own.
      this.e2BootChars = this.e2BootTotal;
      this.dirty = true;
      return;
    }
    if (this.e2Stage === 'lambyBoot' || this.e2Stage === 'lambyCartoon') return; // the beat resolves on its own (no click-through)
    if (this.e2Stage === 'lambyIntro') {
      if (id === 'lamby-hello') {
        this.fileLambyRecord('begun', 'introduction', lambyStrings.witness.lambyIntroduced);
        this.e2Stage = 'lambyProgram';
        this.e2StageT = 0;
        this.dirty = true;
        return;
      }
      if (id === 'lamby-intro-dismiss') {
        // DISMISSAL LAW: it works at the debut too. He does not then go on to
        // present the program — a dismissed conductor does not keep talking.
        this.fileLambyRecord('dismissed', 'introduction', lambyStrings.witness.lambyIntroDismissed);
        ledger.assistant.dismissals += 1;
        this.e2Stage = 'active';
        this.e2StageT = 0;
        this.dirty = true;
        return;
      }
    }
    if (this.e2Stage === 'lambyProgram') {
      if (id === 'lamby-begin') { this.beginRestorify(true); return; }
      if (id === 'lamby-dismiss') { this.dismissLamby(); return; }
    }
  }

  /** S2R.0b — THE LAMBYOS BOOT. The update ritual restarted the machine; this
   *  is the machine coming back up at a new version, saying so, with its
   *  jingle. `playOnce` is silent (and never requests anything) until a real
   *  asset is registered — see data/dialog/s2_lamby.json's `_osBootDoc`. */
  /**
   * ⚑ S116 — THE SPLASH COMES FIRST. Restorify's own CD-ROM animation runs for
   * 23.7 s over the era's jingle, and the machine's boot text starts typing
   * underneath its dissolve while the last 7 s of the track plays. The order is
   * the one every disc-based product of that decade used — the publisher's
   * animation, then the machine's own boot, then the program — except that here
   * a bundled program has taken over the machine's boot entirely, which is what
   * the crawl's last line says out loud.
   */
  /** S156 / R3-48: black → the POST beep and the drive → the splash */
  private startE2Post(): void {
    this.e2Stage = 'post';
    this.e2StageT = 0;
    playOnce('boot_2003.mp3');
    this.dirty = true;
  }

  private startE2Splash(): void {
    this.e2Stage = 'splash';
    this.e2StageT = 0;
    this.e2SplashFade = 0;
    // (S166: the jingle is the software's now — see `startE2Cartoon`; the splash is a review surface)
    this.dirty = true;
  }

  /** S166 — the programme's boot: the cartoon, and the song is the programme's */
  private startE2Cartoon(): void {
    this.e2Stage = 'lambyCartoon';
    this.e2StageT = 0;
    // S155 / R3-48 (Sérgio: "boot music too loud"): the jingle at half
    const jingle = playOnce(lambyStrings.osBootTrack);
    if (jingle) jingle.volume = JINGLE_VOLUME;
    this.e2Jingle = jingle;
    jingle?.addEventListener('ended', () => { this.e2Jingle = null; this.dirty = true; });
    this.dirty = true;
  }

  private startE2Boot(): void {
    this.e2Stage = 'osBoot';
    this.e2StageT = 0;
    this.e2BootChars = 0;
    this.e2BootDoneAt = Infinity;
    this.dirty = true;
  }

  /** any surface that has Lamby drawn in it right now — his pose clock runs
   *  only while he is actually on screen */
  private get lambyOnScreen(): boolean {
    if (this.desktopEra === 'e2' && (this.e2Stage === 'lambyIntro' || this.e2Stage === 'lambyProgram')) return true;
    return this.messageNoticeOpen || this.netvisionOfferOpen;
  }

  /** File an S2R.0/S2R.1 record — witness resolved from data, never composed
   *  here. The three outcomes are `src/state/ledger.ts`'s own union and this
   *  session cannot widen it (that file is outside the fence), so the two new
   *  beats reuse it exactly: acting on a conduction is `begun`, refusing one
   *  is `dismissed`, and the `id` + the data-resolved witness line carry WHICH
   *  beat it was (`introduction`, `first-greeting`, `message-notice`). */
  private fileLambyRecord(
    outcome: 'returned' | 'begun' | 'dismissed', id: string, witness: string
  ): void {
    ledger.lamby.push({ id, outcome, witness });
  }

  /** Begin (from the greeting) or the Restorify icon (later) both land here */
  private openRestorify(): void {
    if (!this.restorify) {
      this.restorify = new RestorifyApp();
      // ⚑ S205 — the first check-in brings the testimony request; Caleb's message waits for the story to be out
      this.restorify.onCheckinFiled = () => { this.offerTestimony(); this.recommendForum(true); };
      this.restorify.onCheckinAcknowledged = () => this.maybeAnnounceMessage();
      this.startProgram(lambyStrings.restorifyTitle);
    }
    this.restorify.open = true;
    this.dirty = true;
  }

  /** ⚑ S191 — the recommendation event, 2003: a senior member picks the next thing for him */
  private recommendForum(quiet = false): void {
    if (this.forumRecommended || this.desktopEra !== 'e2') return;
    this.forumRecommended = true;
    if (!ledger.records.includes('forum-recommended')) ledger.records.push('forum-recommended');
    // S205: at the first check-in the testimony's request has the one toast; the forum's icon carries its pip
    if (!quiet) this.toast = { text: forumStrings.toast, t: 6 };
    this.dirty = true;
  }

  /**
   * ⚑ S207 — THE PAUSE, 1997 and 2003 (pauses.json; SKETCH §4). Once per era, while the main path is waiting
   * anyway, the era's software says what else is on the desk — only what has not been opened yet:
   *   1997 · once he is online and the screen has been quiet a while (he is waiting on the channel): the
   *          Un-Walk's "Did you know?" — Win95's tip of the day, in the programme's voice;
   *   2003 · after the first check-in, on a quiet desktop: Restorify's "Today" — Your Story first.
   * A modal dialog, one button; nothing filed. If there is nothing left to list, there is no pause.
   */
  private maybePause(): void {
    if (this.pauseOpen || this.phase !== 'desktop' || !this.reinterp) return;
    const era = this.desktopEra;
    if (era !== 'e1' && era !== 'e2') return;
    if (this.pauseShown.has(era)) return;
    let due = false;
    if (era === 'e1') {
      due = ledger.records.includes('went-online') && this.idleSeconds > 16
        && !this.provotype && !this.diary?.open && !this.packet?.open && !this.yesOpen && !this.updateApp && !this.kit?.open;
    } else {
      due = this.e2Stage === 'active' && this.testimonyOffered && this.idleSeconds > 12 && this.desktopIdle();
    }
    if (!due) return;
    this.pauseShown.add(era);
    const lines = pauseItems(era);
    if (!lines.length) return;
    this.pauseLines = lines;
    this.pauseOpen = era;
    if (era === 'e2') this.lambyWaitShown = true;   // the pause says it all; the older 'while you wait' toast retires
    this.dirty = true;
  }

  /** ⚑ S207 — THE WAY BACK: an optional thing was closed; the era's voice names the main path's next step.
   *  Never called for the people's things (Caleb's song, the tapes, the outtake, the ball). */
  wayBack(era: string): void {
    if (era === 'e1' || era === 'e2') {
      const l = wayBackLine(era);
      if (l) { this.toast = { text: l, t: 7 }; this.dirty = true; }
    } else if (era === 'e4') {
      const l = wayBackLine('e4');
      if (l) this.e4?.browser.sayLine(l);
    }
  }

  private drawPauseDialog(W: number, H: number): void {
    if (!this.pauseOpen) return;
    const { ctx } = this;
    const P = pauseWords(this.pauseOpen);
    ui.setFont(ctx, 10);
    const dw = 360;
    const wrapped = this.pauseLines.map((l) => ui.wrapText(ctx, l, dw - 60));
    const rows = wrapped.reduce((n, w) => n + w.length, 0);
    const dh = 112 + rows * 13 + this.pauseLines.length * 4;   // room for the outro above the button
    const dx = Math.round((W - dw) / 2), dy = Math.round((H - dh) / 2) - 10;
    const c = ui.windowFrame(ctx, dx, dy, dw, dh, P.title, true);
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.beige);
    if (c.closeBox.w > 0) this.hits.push({ ...c.closeBox, id: 'pause-close' });
    // the period's tip: a lit bulb (1997) or Restorify's house (2003), then the list
    if (this.pauseOpen === 'e1') {
      ui.px(ctx, c.x + 12, c.y + 10, 14, 14, ERA1.tooltip); ui.px(ctx, c.x + 15, c.y + 24, 8, 4, ERA1.grey);
      ui.px(ctx, c.x + 12, c.y + 10, 14, 1, ERA1.greyDark); ui.px(ctx, c.x + 12, c.y + 10, 1, 14, ERA1.greyDark); ui.px(ctx, c.x + 25, c.y + 10, 1, 14, ERA1.greyDark);
    } else if (hasPixelIcon('icon-restorify')) drawPixelIcon(ctx, c.x + 8, c.y + 8, 'icon-restorify');
    ui.setFont(ctx, 12); ctx.fillStyle = ERA1.navy; ctx.fillText(P.lead, c.x + 40, c.y + 10);
    let y = c.y + 32;
    ui.setFont(ctx, 10);
    wrapped.forEach((rowsOf) => {
      ui.px(ctx, c.x + 42, y + 4, 3, 3, ERA1.navy);
      rowsOf.forEach((r) => { ctx.fillStyle = ERA1.black; ctx.fillText(r, c.x + 50, y); y += 13; });
      y += 4;
    });
    ui.setFont(ctx, 9); ctx.fillStyle = ERA1.greyDark; ctx.fillText(P.outro, c.x + 40, y + 4);
    const bw = 80, bx = c.x + c.w - bw - 10, by = c.y + c.h - 28;
    ui.button(ctx, bx, by, bw, 20, P.close, { hover: this.hover === 'pause-close' });
    this.hits.push({ x: bx, y: by, w: bw, h: 20, id: 'pause-close' });
  }

  /** ⚑ S205 — 2003's testimony: Lamby asks for his story after the first check-in (s2_testimony.json) */
  testimony: TestimonyApp | null = null;
  private testimonyOffered = false;
  private offerTestimony(): void {
    if (this.testimonyOffered || this.desktopEra !== 'e2') return;
    this.testimonyOffered = true;
    this.toast = { text: testimonyStrings.offer, t: 9 };
    this.dirty = true;
  }
  private openTestimony(): void {
    if (!this.testimony) {
      this.testimony = new TestimonyApp();
      this.testimony.onFile = (id) => { if (!ledger.records.includes(id)) ledger.records.push(id); this.dirty = true; };
      // the story is out — and now Caleb writes ("saw they put yours up")
      this.testimony.onDone = () => { this.maybeLandMessage(); this.maybeAnnounceMessage(); this.dirty = true; };
    }
    this.testimony.open = true;
    this.dirty = true;
  }
  private openForum(): void {
    if (!this.forum) {
      this.forum = new Web2003App();
      this.forum.onAgree = () => { if (!ledger.records.includes('forum-rules')) ledger.records.push('forum-rules'); this.dirty = true; };
      this.forum.onPost = () => { if (!ledger.records.includes('forum-posted')) ledger.records.push('forum-posted'); this.dirty = true; };
      this.forum.onApply = () => { if (!ledger.records.includes('forum-applied')) ledger.records.push('forum-applied'); this.dirty = true; };
    }
    this.forum.open = true;
    this.dirty = true;
  }

  /** S157 / R3-50 — the loading box: a small centred window with the program's name and a
   *  bar that fills over PROGRAM_SPLASH_SECONDS; nothing under it takes a press meanwhile */
  private startProgram(title: string): void {
    if (this.desktopEra !== 'e2') return;   // 2003's furniture; the other eras have their own
    this.programSplash = { title, t: 0 };
    this.dirty = true;
  }
  private drawProgramSplash(W: number, H: number): void {
    const sp = this.programSplash;
    if (!sp) return;
    const { ctx } = this;
    const dw = 240; const dh = 64;
    const dx = Math.round((W - dw) / 2); const dy = Math.round((H - dh) / 2);
    ui.bevel(ctx, dx, dy, dw, dh, true);
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(sp.title, dx + 12, dy + 10);
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(lambyStrings.programLoading, dx + 12, dy + 26);
    const bw = dw - 24; const by = dy + 42;
    ui.px(ctx, dx + 11, by - 1, bw + 2, 12, ERA1.greyDark);
    ui.px(ctx, dx + 12, by, bw, 10, ERA1.white);
    const k = Math.min(1, sp.t / PROGRAM_SPLASH_SECONDS);
    const blocks = Math.floor((bw / 9) * k);
    for (let i = 0; i < blocks; i++) ui.px(ctx, dx + 13 + i * 9, by + 1, 7, 8, ERA1.navy);
  }

  /**
   * S2R.3 (rebuilt, Session 60 — findings B7 + B8): Caleb's message ARRIVES
   * after the first completed check-in, and that is all it does. It used to
   * also open itself, over the top of the card the player had just answered,
   * so the answer went unanswered and the Messenger appeared out of nowhere.
   * Now: it lands here, the program replies to the answer, and Lamby says so
   * when the card closes. Fires at most once per session.
   */
  private maybeLandMessage(): void {
    if (this.calebOpenedThisSession || this.messagePending) return;
    // ⚑ S205 — not at the first check-in any more: after his testimony is published (they met again at the shoot)
    if (!ledger.records.includes('testimony-online')) return;
    this.messagePending = true;
    this.dirty = true;
  }

  /** …and THEN he tells you (one conduction beat, two lines, both answers
   *  work). Only ever on the ordinary desktop — never over a felt window. */
  private maybeAnnounceMessage(): void {
    if (!this.messagePending || this.messageNoticeShown) return;
    if (this.caleb) return; // the person's window is already open: nothing to announce
    this.messageNoticeShown = true;
    // ⚑ S150 — ONE LINE AND THE DOT, no card (OPEN_ITEMS R3-55). The pop-up sat
    //   over the desktop beside PureMail's envelope and the two read as one
    //   choice; the Messenger's unread mark is the door, Lamby names it once.
    this.toast = { text: lambyStrings.messageToast, t: 8 };
    this.lambyPoseT = 0;
    this.dirty = true;
  }

  private handleMessageNoticeClick(id: string): void {
    if (id === 'message-open') {
      this.messageNoticeOpen = false;
      this.fileLambyRecord('begun', 'message-notice', lambyStrings.witness.messageOpened);
      this.openMessenger();
      return;
    }
    if (id === 'message-notnow') {
      // DISMISSAL LAW again: it works, it files, and the door stays open —
      // the Messenger keeps its unread mark on the desktop. The era waits.
      this.messageNoticeOpen = false;
      this.fileLambyRecord('dismissed', 'message-notice', lambyStrings.witness.messageDeferred);
      ledger.assistant.dismissals += 1;
      this.dirty = true;
    }
  }

  /** the player opens the message — from Lamby's notice, or from the unread
   *  Messenger icon if they dismissed him. Same door either way. */
  private openMessenger(): void {
    if (this.calebOpenedThisSession) return;
    this.calebOpenedThisSession = true;
    this.messagePending = false;
    this.messageNoticeOpen = false;
    this.openCaleb();
  }

  /** S2R.3A — the messenger window (felt). The apparatus is not in it. */
  private openCaleb(): void {
    if (this.caleb) return;
    if (this.restorify) this.restorify.open = false; // he takes the screen
    const thread = new CalebThreadApp();
    this.caleb = thread;
    this.startProgram(calebStrings.window.title);   // S157 / R3-50: the messenger loads first
    thread.onCommit = () => this.openAccountabilityAlert();
    // S60 (finding E20): he pressed the notification. The felt module reports
    // the press and learns nothing; the apparatus answers it, by re-asserting
    // the block it is holding. The affordance is real — the refusal is the
    // content. (This is also the ONLY thing that could honestly happen: the
    // block lifts on the apparatus's own failure, never on a player's press.)
    thread.onNotificationPressed = () => this.accountability?.pingStamp();
    // S157 / R3-52: the file he sent opens in a player, by a press
    thread.onOpenAttachment = (file) => {
      if (this.mediaPlayer) return;
      this.mediaPlayer = new MediaPlayerApp(file);
      this.mediaPlayer.onClose = () => { this.mediaPlayer = null; this.dirty = true; };
      this.startProgram(this.mediaPlayer ? MEDIA_PLAYER_TITLE : '');
      this.dirty = true;
    };
    thread.onThreadDone = () => {
      this.caleb = null;
      this.accountability = null;
      // finding F25 had the desktop come back UP out of the residue's own
      // fade-to-black; ⚑ S164 / R3-61: it does not come back at all. The dark
      // holds and the notice rises out of it (drawDesktop's `residueDark` branch).
      this.residueDark = true;
      // S2R.7 — THE RESIDUE LEADS SOMEWHERE. The thread's end is the era's
      // end: from here the spine (src/narrative/spine.ts) reads the residue
      // filing off the ledger and takes the era to its u3 close, exactly the
      // way E1's `diary-glitch` record arms T1. Two things happen at this
      // seam, and neither is the update itself — the update is armed by the
      // apparatus's own documented failure (S2R.5's collapse), never here:
      //   1. any UNANSWERED summons is withdrawn. The network that issued the
      //      referral has just told the player it can no longer vouch for
      //      itself; its errands do not outlive it. Nothing is filed for the
      //      withdrawal because nothing was ever filed for the offer (offers
      //      only file through src/room/sends.ts on an ANSWER) — so this
      //      cannot put a decision in the record the player never made.
      //   2. the desktop goes quiet. No toast, no assistant, no chrome event:
      //      the era says nothing else in its own voice after the residue.
      this.sendOffer = null;
    this.clearExternalSendHits();
      this.toast = null;
      this.dirty = true;
    };
    this.dirty = true;
  }

  /** S2R.3B/C — the commit-press has landed, and the apparatus answers it.
   *  This is the ONLY place the two registers touch: the felt module never
   *  imports the operable one, and vice versa. */
  private openAccountabilityAlert(): void {
    if (this.accountability) return;
    const alert = new AccountabilityApp();
    this.accountability = alert;
    this.mediaPlayer?.close();   // S157: the block cuts the song — the player goes with it
    playOnce('alert_2003.mp3');   // S141: the messenger's chime, lower — care and surveillance share a voice
    if (this.caleb) alert.setChatRect(this.caleb.windowRect);
    alert.onRedactionStart = () => this.caleb?.beginRedaction();
    alert.onAlertDone = (dismissed) => {
      // S2R.4: "I found something that helped others like you." If Lamby was
      // dismissed instead, the offer never comes — the era does not chase —
      // but the collapse still arrives: it was never the player's to trigger.
      if (dismissed || this.netvisionOfferedThisSession) this.pureMailAt = this.t + PUREMAIL_DELAY;
      else {
        this.netvisionOfferedThisSession = true;
        this.netvisionOfferOpen = true;
        this.lambyPoseT = 0; // he arrives in that window too — same pop, one creature
      }
      this.dirty = true;
    };
    alert.onMailClosed = () => {
      // S2R.5 — the block LIFTS: the same component, run in reverse
      this.accountability?.liftStamp();
      this.caleb?.clearToasts();
      this.caleb?.beginRestore();
      // …and the taskbar's "1 new message" goes with it: the fragment has
      // resolved into the real conversation coming back (finding E20).
      this.calebNotificationVisible = false;
      this.stopReadAloud();
      this.dirty = true;
    };
    // ⚑ S46's VOICE, WIRED (S60, finding E21 — "built and not wired", the
    // highest value-per-effort item in the review). os.ts owns the element so
    // that Esc/pause and Leave can reach it; `isAudioAvailable` decides whether
    // the row exists at all, so a missing WAV is silence and no button rather
    // than a button that does nothing.
    alert.readAloudAvailable = isAudioAvailable(calebStrings.pureMail.readAloudTrack);
    alert.isReadingAloud = () => this.readAloudPlaying;
    alert.onReadAloud = (track) => {
      if (this.readAloudPlaying) { this.stopReadAloud(); return false; }
      this.pureMailVoice = playOnce(track);
      return this.readAloudPlaying;
    };
    this.dirty = true;
  }

  /** true while Lamby is audibly reading the letter — the now-playing row's
   *  only source of truth (it never claims anything the element isn't doing) */
  private get readAloudPlaying(): boolean {
    const a = this.pureMailVoice;
    return !!a && !a.paused && !a.ended;
  }

  private stopReadAloud(): void {
    if (!this.pureMailVoice) return;
    this.pureMailVoice.pause();
    this.pureMailVoice = null;
    this.dirty = true;
  }

  private handleNetvisionOfferClick(id: string): void {
    // ⚑ ONLY ONE OF THESE IS A BUTTON (S60, finding C12). "Not now" on the
    // "don't be discouraged" pop-up is drawn GREYED and pushes no hit rect —
    // Sérgio named this beat as coercive, and a visibly inert option is the
    // honest rendering of it: the apparatus offers a choice that is not one.
    // Nothing branches; the player is not trapped either, because the video's
    // own skip arms at 15s and Leave/pause are live throughout.
    if (id === 'netvision-watch') {
      this.netvisionOfferOpen = false;
      this.openNetVision();
    }
  }

  private openNetVision(): void {
    // S2R.4 (revised): the skip arms at 15s, not instantly — Lamby is SHOWING
    // you this, so leaving is a social act rather than a UI convenience. The
    // value lives in data/dialog/s2_caleb.json and supersedes s2_media.json's.
    this.netvision = new NetVisionPlayerApp({
      skipDelaySeconds: calebStrings.video.skipDelaySeconds
    });
    this.netvision.onClosed = (result) => {
      this.netvision = null;
      if (result === 'interrupted') this.calebNotificationVisible = true;
      if (this.caleb) this.pureMailAt = this.t + PUREMAIL_DELAY;
      this.dirty = true;
    };
    this.dirty = true;
  }

  /**
   * Lamby's two-line dialog — ONE layout, used by his debut (S2R.1) and by the
   * video offer (S2R.4), because they are the same window and used to carry the
   * same bug.
   *
   * Session 49 (finding 3, Sérgio: "Welcome back Daniel… renders out of frame"):
   * both drew their lines with a bare `fillText` at a fixed inset inside a
   * 300px-wide frame. That leaves 252px of room, and BOTH first lines are wider
   * than that — "Welcome back, Daniel. We kept your room ready." measures 277px
   * and "I found something that helped others like you." 277px — so each spilled
   * ~25px (about four characters) past the window's right bevel and onto the
   * desktop behind it. The window was centred on the monitor the whole time; it
   * was the TEXT that was out of its frame.
   *
   * Fixed twice over, because every string here is still PLACEHOLDER pending
   * Sérgio's voice pass and a layout that merely just-fits is a trap: the frame
   * is wider, AND the lines wrap to the real measured width. A wrapped line is
   * still ONE line of Lamby speech — the ≤2-lines-per-conduction-beat law is
   * about utterances, not rendered rows.
   */
  private drawLambyDialog(
    W: number, H: number, title: string, line1: string, line2: string,
    opts: { dy?: number; hideChar?: boolean } = {}
  ): ui.ContentRect {
    const { ctx } = this;
    const dw = 348; const dh = 138;
    const dx = Math.round((W - dw) / 2);
    const dy = opts.dy ?? Math.round((H - dh) / 2);
    const c = ui.windowFrame(ctx, dx, dy, dw, dh, title, true);
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.beige);
    // Session 60: the little blocky mark this window used to carry is gone —
    // it is the SAME Lamby here as everywhere else (src/desktop/apps/lambyChar.ts,
    // the single definition), just small and seated in his own column. The
    // hero beats pass `hideChar` because they already draw him full size above.
    // 0.38 is the size at which his paperclip (which reaches ~84px left of his
    // centre at scale 1) clears the window's own bevel instead of being cut by it
    if (!opts.hideChar) this.drawLambySeated(c.x + 44, c.y + 48, 0.38);
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.black;
    const textX = c.x + (opts.hideChar ? 10 : 78);
    const maxW = c.w - (opts.hideChar ? 10 : 78) - 8; // his column, and a margin off the bevel
    let row = 0;
    for (const line of [line1, line2]) {
      for (const wrapped of ui.wrapText(ctx, line, maxW)) {
        ctx.fillText(wrapped, textX, c.y + 10 + row * 13);
        row++;
      }
    }
    return c;
  }

  /** Lamby, drawn from the one definition. `appear` for his first CYCLE on
   *  screen (the Clippy-lineage pop), `idle` after — the rig's own grammar. */
  private drawLambySeated(cx: number, cy: number, scale: number): void {
    const action: LambyAction = this.lambyPoseT < 3.2 ? 'appear' : 'idle';
    drawLambyChar(this.ctx, cx, cy, {
      mood: 'cheerful', action, t: this.lambyPoseT, moodStart: 0, scale
    });
  }

  /**
   * ⚑ THE DEBUT (S2R.1, rebuilt Session 60) — one full-screen conduction beat:
   * Lamby at full size, his two lines under him, and two answers that both
   * work. Used for BOTH his introduction and his presentation of Restorify, so
   * the two beats read as one creature saying two things, not two popups.
   */
  private drawE2Conduction(
    W: number, H: number, title: string, line1: string, line2: string,
    accept: { label: string; id: string }, dismiss: { label: string; id: string }
  ): void {
    const { ctx } = this;
    ui.px(ctx, 0, 0, W, H, ERA1.tealDark);
    this.drawLambySeated(Math.round(W / 2), 106, 0.85);
    const c = this.drawLambyDialog(W, H, title, line1, line2, { dy: 200, hideChar: true });
    const by = c.y + c.h - 26;
    ui.button(ctx, c.x + c.w - 104, by, 96, 18, accept.label, { hover: this.hover === accept.id });
    ui.button(ctx, c.x + 8, by, 96, 18, dismiss.label, { hover: this.hover === dismiss.id });
    this.hits.push({ x: c.x + c.w - 104, y: by, w: 96, h: 18, id: accept.id });
    this.hits.push({ x: c.x + 8, y: by, w: 96, h: 18, id: dismiss.id });
  }

  /** finding B8 — the notice that a message arrived. Lamby's window, on the
   *  ordinary desktop, never over the felt one. */
  private drawMessageNotice(W: number, H: number): void {
    const { ctx } = this;
    const c = this.drawLambyDialog(W, H, lambyStrings.messageTitle,
      lambyStrings.messageLine1, lambyStrings.messageLine2);
    const by = c.y + c.h - 26;
    ui.button(ctx, c.x + c.w - 86, by, 78, 18, lambyStrings.messageOpen, { hover: this.hover === 'message-open' });
    ui.button(ctx, c.x + 8, by, 96, 18, lambyStrings.messageNotNow, { hover: this.hover === 'message-notnow' });
    this.hits.push({ x: c.x + c.w - 86, y: by, w: 78, h: 18, id: 'message-open' });
    this.hits.push({ x: c.x + 8, y: by, w: 96, h: 18, id: 'message-notnow' });
  }

  private drawNetvisionOffer(W: number, H: number): void {
    const { ctx } = this;
    const c = this.drawLambyDialog(W, H, lambyStrings.videoOfferWindowTitle,
      lambyStrings.videoOfferLine1, lambyStrings.videoOfferLine2);
    const by = c.y + c.h - 26;
    ui.button(ctx, c.x + c.w - 86, by, 78, 18, lambyStrings.videoOfferWatch, { hover: this.hover === 'netvision-watch' });
    // greyed, and no hit rect — see handleNetvisionOfferClick's own note
    ui.button(ctx, c.x + 8, by, 96, 18, lambyStrings.videoOfferNotNow, { disabled: true });
    this.hits.push({ x: c.x + c.w - 86, y: by, w: 78, h: 18, id: 'netvision-watch' });
  }

  /** Lamby's "Begin" chip: files the greeting as begun, then opens Restorify */
  private beginRestorify(fromGreeting: boolean): void {
    if (fromGreeting) this.fileLambyRecord('begun', 'first-greeting', lambyStrings.witness.lambyBegun);
    this.e2Stage = 'active';
    this.e2StageT = 0;
    this.openRestorify();
  }

  /** DISMISSAL LAW (R28 amendment 2): always works, always files. Lamby does
   *  not return until the player opens Restorify themselves (the icon). */
  private dismissLamby(): void {
    this.fileLambyRecord('dismissed', 'first-greeting', lambyStrings.witness.lambyDismissed);
    ledger.assistant.dismissals += 1;
    this.e2Stage = 'active';
    this.e2StageT = 0;
    // S150 — the system says where the program went (R3-49); Lamby stays quiet
    this.toast = { text: lambyStrings.dismissedToast, t: 7 };
    this.dirty = true;
  }

  private eraSkin(): { clock: string; brand: string; status: string; icons: string[] } {
    if (this.desktopEra === 'e1') {
      return {
        clock: strings.desktop.clock,
        brand: strings.splash.title,
        status: '',
        icons: [strings.desktop.iconA, strings.desktop.iconIrc]
      };
    }
    const skins = strings.desktop.eraSkins as unknown as Record<string, {
      clock: string; brand: string; status: string; icons: string[];
    }>;
    return skins[this.desktopEra];
  }

  private desktopColors(): { bg: string; panel: string; text: string } {
    switch (this.desktopEra) {
      case 'e2': return { bg: ERA1.titleBlue, panel: ERA1.navy, text: ERA1.white };
      case 'e3': return { bg: ERA1.beige, panel: ERA1.olive, text: ERA1.black };
      case 'e4': return { bg: ERA1.black, panel: ERA1.greyDark, text: ERA1.silver };
      default: return { bg: ERA1.teal, panel: ERA1.navy, text: ERA1.black };
    }
  }

  get updateArmed(): boolean {
    return this.updateApp !== null;
  }

  /** a SEND offer lands (script §4: a summons, not a door). An icon appears;
   *  its window carries the reason + Turn-and-look / Not-now. Both file. */
  offerSend(id: string): void {
    if (!this.reinterp || this.sendOffer) return;
    const def = (sendsData as unknown as { sends: { id: string; offer: { icon: string } }[] })
      .sends.find(s => s.id === id);
    if (!def) return;
    this.sendOffer = { id, open: false };
    this.toast = { text: def.offer.icon, t: 6 };
    this.dirty = true;
    this.sendOfferVersion++;
  }

  /** The spine reads this as "hold your breath" (src/narrative/spine.ts). It
   *  now covers a live summons OR a modal narrative beat: a send offer must
   *  never surface on top of S2R.3's felt window, and u3 must not arm while
   *  the Caleb thread is still running. */
  get sendOfferPending(): boolean {
    return this.sendOffer !== null || this.caleb !== null || this.e4HoldsTheSpine;
  }

  /**
   * ⚑ S76 — ERA 4 OWNS ITS OWN CLOCK, and the spine must not run one against it.
   *
   * `src/narrative/spine.ts` (outside this session's fence) still carries a
   * placeholder `E4_HOLD = 22` — twenty-two seconds after arriving in E4 it
   * arms the bare final restart and closes the piece. That was a stand-in for
   * an era that did not exist yet. It exists now, it is four sessions long, and
   * a 22-second timer would end it while the player is still looking out of the
   * window.
   *
   * So the era holds the spine's breath the same way a live summons or a modal
   * narrative beat already does — one honest sentence: while E4 is running and
   * has not handed off, the spine has no business here. ⚑ The hand-off is
   * S79's: when the ball is over, `E4Shell.handOff()` releases this and the
   * bare restart arms exactly as the spine always meant it to.
   */
  private get e4HoldsTheSpine(): boolean {
    return this.desktopEra === 'e4' && this.e4 !== null && !this.e4.handedOffToClose;
  }

  private resolveSend(outcome: 'visited' | 'declined'): void {
    if (!this.sendOffer) return;
    const id = this.sendOffer.id;
    this.sendOffer = null;
    this.clearExternalSendHits();
    this.dirty = true;
    this.sendOfferVersion++;
    this.onSendResolve?.(id, outcome);
  }

  private drawSendOffer(W: number, H: number): void {
    this.drawSendOfferInto(this.ctx, this.hits, W, H);
  }

  /** ⚑ Phase 7 — the summons' icon on Daniel's own desktop, in the icon pass (x 12 · y 188, the grid's free cell) */
  private drawSendOfferIcon(ctx: CanvasRenderingContext2D, hits: Hit[]): void {
    if (!this.sendOffer || this.sendOffer.open) return;
    const def = (sendsData as unknown as { sends: { id: string; offer: { icon: string } }[] }).sends
      .find(s => s.id === this.sendOffer?.id);
    if (def) this.drawIconInto(ctx, hits, this.desktopEra === 'e1' ? 10 : 12, 188, def.offer.icon, 'icon-send');
  }

  /**
   * ⚑ S87 — THE SEND OFFER'S GEOMETRY, factored out so it can be drawn into
   * ANY context/hit table — Daniel's own (the ordinary call above, unchanged
   * pixels) or `drawSendOfferExternal` below, which era3Devices.ts's workstation
   * uses. Daniel's monitor is dead for the whole of E3 (S61) and stays that
   * way; the offer needs a live screen to draw on at all, so it draws on
   * Vera's workstation instead, exactly the technique already used for the u4
   * ritual (`era3Devices.ts`'s `RITUAL_OFFSET`/`drawWorkstation`).
   *
   * ⚑ THE DECLINE-ONLY GATE IS LIFTED — 2026-08-17, on measurement, not on
   * mood. S87 built it because s3/s4 share the machinery that flew the s2
   * dolly at 6.874 m/s against a 0.43 m/s envelope, sixteen times over. Sérgio
   * has since chosen the fix (checklist D-B: lengthen, don't blink-cut) and
   * `CAMERA_POSES.dollySeconds` is now 39 s, wired to the real call site.
   *
   * ⚑ THE NUMBERS THAT LIFTED IT, from `node tools/shots.mjs comfort` with a
   * sampling window long enough to watch the whole leg: s3 and s4 fly 4.65 m
   * and measure **0.279 m/s** — comfortably inside on the linear axis and
   * inside on the rotational one too. s2's 8.87 m is the long leg and the one
   * that set 39.
   *
   * ⚑ WHAT IS STILL TRUE, and belongs to whoever reads this next: the 0.43 m/s
   * envelope is DESKTOP-MEASURED and **A11, the in-headset pass, has never run
   * in this project's history**. These legs are inside a threshold nobody has
   * validated in stereo. That is a far better position than sixteen times over
   * it — but it is not the same as proven comfortable, and the first person
   * into a headset should watch this seam specifically.
   */
  private drawSendOfferInto(ctx: CanvasRenderingContext2D, hits: Hit[], W: number, H: number): void {
    if (!this.sendOffer) return;
    const def = (sendsData as unknown as {
      sends: { id: string; offer: { icon: string; lines: string[]; go: string; decline: string } }[];
    }).sends.find(s => s.id === this.sendOffer?.id);
    if (!def) return;
    if (!this.sendOffer.open) {
      // Daniel's desktop draws the icon with its other icons (drawSendOfferIcon); a borrowed screen draws it here
      if (ctx !== this.ctx) this.drawIconInto(ctx, hits, 10, 200, def.offer.icon, 'icon-send');
      return;
    }
    const dw = 300; const dh = 150;
    const dx = Math.round((W - dw) / 2); const dy = Math.round((H - dh) / 2);
    const c = ui.windowFrame(ctx, dx, dy, dw, dh, def.offer.icon, true);
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.black;
    def.offer.lines.forEach((line, i) => ctx.fillText(line, c.x + 10, c.y + 6 + i * 12));
    // ⚑⚑ RE-GATED 2026-08-21, and the lift was my error. I removed S87's
    // decline-only gate on COMFORT evidence — the dolly is now 39 s and all
    // three legs measure inside the envelope, which was true and was not the
    // whole question. I verified the JOURNEY and never checked the ARRIVAL.
    //
    // `data/sends.json` targets s3 at `{kind:"bay", yaw:0}` and s4 at
    // `{kind:"facet", facet:"transmasc"}` — both authored for the RETIRED
    // radial/hexagon layout, and s4's facet belongs to Room 3, which does not
    // exist in Era 3 at all. So accepting either flies the camera at a
    // destination that is not there: Sérgio hit a white box on the table, a
    // fly-over that locked, and a beat that vanished — and lost the whole era
    // to it (WALKTHROUGH_2026-08-21 §C).
    //
    // ⚑ This is the project's own dominant bug class wearing a new coat:
    // content that cannot be met. The comfort numbers were real evidence about
    // the wrong thing. Decline still files a genuine outcome and lets the era
    // advance, so E3 is playable with the gate on — which it is not with the
    // gate off. RESTORE THIS ONLY AFTER RETARGETING s3/s4 TO PLACES THAT EXIST
    // IN E3 UNDER THE THREE-ROOM MODEL, verified by arriving at them.
    const allowVisit = this.sendOffer.id !== 's3' && this.sendOffer.id !== 's4';
    if (allowVisit) {
      ui.button(ctx, c.x + c.w - 110, c.y + c.h - 26, 102, 18, def.offer.go, {});
      hits.push({ x: c.x + c.w - 110, y: c.y + c.h - 26, w: 102, h: 18, id: 'send-go' });
    }
    const declineW = allowVisit ? 70 : dw - 16;
    ui.button(ctx, c.x + 8, c.y + c.h - 26, declineW, 18, def.offer.decline, {});
    hits.push({ x: c.x + 8, y: c.y + c.h - 26, w: declineW, h: 18, id: 'send-decline' });
  }

  /** ⚑ S87 — the workstation composite (era3Devices.ts, via the E4 bridge; see the
   *  DesktopOS constructor's `setE4Bridge` call). `W`/`H` are always
   *  `ERA1_CANVAS`'s own — the same logical surface the u4 ritual draws at,
   *  which is why the caller can reuse `RITUAL_OFFSET` for both. */
  drawSendOfferExternal(ctx: CanvasRenderingContext2D): void {
    this.externalSendHits = [];
    this.drawSendOfferInto(ctx, this.externalSendHits, ERA1_CANVAS.width, ERA1_CANVAS.height);
  }

  /**
   * ⚑ S104 — AND IT HAS TO BE EMPTIED WHEN NOBODY IS DRAWING IT.
   *
   * `drawSendOfferExternal` clears and refills this list every time it runs, so
   * it is correct for exactly as long as it keeps being called. The moment Era 3
   * ends it stops being called and the list keeps its last contents **forever** —
   * a control published as live on a surface that is not in the room any more.
   *
   * Review round 1 blamed `os.hits` for this and `os.hits` is innocent: `draw()`
   * clears it on its first line and the Era-4 branch pushes only `e4-touch`
   * before returning. It was THIS list, and it was found the way these always
   * are — `tools/walk.mjs` collects rects reflectively from any field whose name
   * ends in `hits`/`rects`, aimed at Era 2's `icon-send` in Era 4, projected it
   * through the visor plane, and pressed the frame's pause button instead. Three
   * runs and two sessions were spent concluding the piece was stuck.
   *
   * ⚑ The fix is not "make the walker smarter". A rect list that outlives its
   * surface is wrong for any reader — a probe, a check, or a person reasoning
   * about the code. Empty it.
   */
  private clearExternalSendHits(): void {
    if (this.externalSendHits.length) this.externalSendHits = [];
  }

  /** ⚑ S87 — whether the workstation has anything to composite this frame. */
  get sendOfferActive(): boolean {
    return this.sendOffer !== null;
  }

  /** ⚑ S87 — bumped on every `sendOffer` change; era3Devices.ts folds it into
   *  the workstation screen's own dirty-upload version so a real change (offered,
   *  opened, resolved) re-uploads the texture without polling every frame. */
  get sendOfferVersionNum(): number {
    return this.sendOfferVersion;
  }

  /** ⚑ S87 — resolves a click against the geometry `drawSendOfferExternal`
   *  just drew. era3Devices.ts owns the workstation's own ray→logical-canvas
   *  conversion (its plane orientation differs from the desktop monitor's),
   *  so this takes already-local coordinates rather than a world ray. Returns
   *  whether the click landed on anything, exactly like the room's other
   *  device-screen handlers (`handleWorkstationPointer`'s own callees). */
  handleSendOfferExternalClick(x: number, y: number): boolean {
    const hit = this.externalSendHits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (!hit) return false;
    if (hit.id === 'icon-send') {
      if (this.sendOffer) { this.sendOffer.open = true; this.toast = null; this.sendOfferVersion++; }
      return true;
    }
    if (hit.id === 'send-go') { this.resolveSend('visited'); return true; }
    if (hit.id === 'send-decline') { this.resolveSend('declined'); return true; }
    return false;
  }

  private setPhase(p: Phase): void {
    this.phase = p;
    this.phaseT = 0;
    this.dirty = true;
    this.emitOpeningProfile();
  }

  openingProfileSnapshot(): OpeningProfileSnapshot {
    const stage = this.phase === 'r_boot' || this.phase === 'r_splash' ? 'boot'
      : this.phase === 'r_profile' ? 'profile'
        : this.phase === 'r_recap' ? 'recap'
          : 'inactive';
    return {
      active: this.reinterp && stage !== 'inactive',
      stage,
      icon: this.profileIcon,
      chips: [...this.profileChips],
      goal: this.profileGoal,
      filed: this.profileFiled
    };
  }

  private emitOpeningProfile(): void {
    if (!this.reinterp) return;
    this.onOpeningProfileChange?.(this.openingProfileSnapshot());
  }

  private clearProfileTags(): void {
    for (let i = ledger.tags.length - 1; i >= 0; i--) {
      if (ledger.tags[i].startsWith('profile:')) ledger.tags.splice(i, 1);
    }
  }

  /** The witness flip completed its return — the found file appears on the
   *  desktop. Session 60: FILED SILENTLY. It used to raise a "Dossier updated"
   *  toast, which is exactly the advertising the easter-egg rules forbid (S55's
   *  lamby_rig.exe: never advertised, never rewarded). Nothing announces it;
   *  it is simply there, for the player who looks at their own desktop. */
  unlockDossier(): void {
    if (this.dossierUnlocked) return;
    this.dossierUnlocked = true;
    if (!ledger.dossier.includes('card1')) ledger.dossier.push('card1');
    this.dirty = true;
  }

  // ── update / draw ──────────────────────────────────────────────────────
  update(dt: number): void {
    this.idleSeconds += dt;
    if (this.testimony?.open) { this.testimony.update(dt); if (this.testimony.dirty) this.dirty = true; }   // S205
    this.maybePause();
    // ⚑ S201 — Lamby's "while you wait": once, on a quiet 2003 desktop, after the thread was recommended
    if (!this.lambyWaitShown && this.desktopEra === 'e2' && this.e2Stage === 'active' && this.forumRecommended
        && !this.forum && this.idleSeconds > 30 && this.desktopIdle() && !this.toast) {
      this.lambyWaitShown = true;
      this.toast = { text: forumStrings.lambyWait, t: 8 };
      this.lambyPoseT = 0;
      this.dirty = true;
    }
    this.t += dt;
    this.phaseT += dt;
    if (this.paused) {
      // Esc/pause silences Lamby's reading too — "the game's pause literally
      // pauses audio, it does not keep playing silently" (tapeAudio's own
      // doctrine, applied to the one element os.ts owns).
      if (this.readAloudPlaying) this.pureMailVoice?.pause();
      this.draw();
      return;
    }
    if (this.pureMailVoice?.paused && !this.pureMailVoice.ended) {
      void this.pureMailVoice.play().catch(() => { /* autoplay policy — never thrown */ });
    }

    if (this.phase === 'boot') {
      const next = Math.min(Math.floor(this.phaseT / BOOT_CPS), this.bootTotal);
      if (next !== this.bootChars) { this.bootChars = next; this.dirty = true; }
      if (this.bootChars >= this.bootTotal && this.phaseT > BOOT_HOLD) this.setPhase('splash');
    }
    if (this.phase === 'splash' && this.phaseT >= SPLASH_SECONDS) this.setPhase('name');
    if (this.phase === 'r_boot') {
      const next = Math.min(Math.floor(this.phaseT / BOOT_CPS), this.rBootTotal);
      if (next !== this.rBootChars) { this.rBootChars = next; this.dirty = true; }
      if (this.rBootChars >= this.rBootTotal && this.phaseT > R_BOOT_HOLD) this.startReinterpSplash();
    }
    if (this.phase === 'r_splash') {
      this.dirty = true;   // the loading bands travel
      if (this.phaseT >= R_SPLASH_SECONDS) this.setPhase('r_profile');
    }
    if (this.phase === 'name' && this.greeting && this.phaseT > 2.8) {
      this.setPhase('desktop'); // empty desk — the kit is the only way in (S1.1)
    }
    // reinterp: the guide thread's floppy side-message carries this nudge
    // (R28-2a) — two simultaneous "insert the disk" surfaces would compete.
    // The shipped baseline keeps its toast exactly as-is.
    if (this.phase === 'desktop' && !this.kit && !this.kitToastShown && this.phaseT > 6
        && !this.reinterp) {
      this.kitToastShown = true;
      this.toast = { text: strings.desktop.kitToast, t: 8 };
      this.dirty = true;
    }
    if (this.phase === 'desktop' && this.kit) this.kit.update(dt);
    if (this.programSplash) {
      this.programSplash.t += dt;
      this.dirty = true;
      if (this.programSplash.t >= PROGRAM_SPLASH_SECONDS) this.programSplash = null;
    }
    if (this.mediaPlayer) this.mediaPlayer.update(dt);
    if (this.phase === 'desktop' && this.rootCause) this.rootCause.update(dt);
    if (this.phase === 'desktop' && this.irc) this.irc.update(dt);
    if (this.phase === 'desktop' && this.packet) this.packet.update(dt);
    if (this.phase === 'desktop' && this.diary) this.diary.update(dt);
    if (this.phase === 'desktop' && !this.diary && this.t >= this.diaryPendingAt) this.openDiary();
    // the fallback: if the player never turns to witness the record, Rob
    // escalates anyway once the deadline passes (main-parity — the flip is
    // the earned path, not a hard gate)
    if (this.t >= this.escalationFallbackAt) this.escalate();
    if (this.phase === 'desktop' && this.provotype) this.provotype.update(dt);
    if (this.phase === 'desktop' && this.lambyRigFile?.open) this.lambyRigFile.update(dt);
    // ⚑ S76: the ritual and the era's shell tick regardless of the phase, and
    // the two other phase gates around them are gone. Every other window here
    // is a window ON this canvas, so gating them on `desktop` is right; these
    // two are not — u4 draws on Vera's workstation and the shell draws on the visor,
    // both in the room, and a canvas that happens to be dark must not stop a
    // ritual the player is watching somewhere else. (It also makes the review
    // jumps honest: `?era=3` + the update4 button now actually runs.)
    if (this.updateApp) this.updateApp.update(dt);
    // the era's shell keeps its own slow clock (the standby light, quantised —
    // see space.ts). It runs whether or not the device has been touched.
    // S105: its `version` is read below, the way era3Devices reads it for the visor.
    const e4VersionBefore = this.e4?.version ?? 0;
    if (this.e4) this.e4.update(dt);
    if (this.phase === 'desktop' && this.netvision) this.netvision.update(dt);
    // S2R.3–S2R.6: the person's window and the apparatus's answer to it
    if (this.phase === 'desktop' && this.caleb) this.caleb.update(dt);
    if (this.phase === 'desktop' && this.accountability) this.accountability.update(dt);
    // THE BREAK (S2R.4): while the apparatus's own showpiece tears itself
    // apart, Caleb arrives through the corner-toast shape the system uses to
    // nag him. Pushed once — the toast object guards re-entry.
    // S60 (finding D17): AFTER the disclaimer crawl, not at the break's start.
    // He used to land on top of the fine print — "…not therapy, not a cure…
    // your old self may not be recoverable…", the line Sérgio called a great
    // text and never got to read. The tape gets to finish lying first.
    if (this.phase === 'desktop' && this.netvision?.disclaimerDone) this.caleb?.pushBreakToast();
    if (this.t >= this.pureMailAt) {
      this.pureMailAt = Infinity;
      this.accountability?.beginNetworkFailure();   // S157 / R3-58: seen failing, then the mail
      this.dirty = true;
    }
    // R28-2a: the guide is condition-driven only (no timers) — one tick per
    // frame. Era-1-only (CLAUDE.md R28 amendment 2: Lamby conducts from E2 —
    // the guide thread must not go on evaluating/filing once the era has
    // moved past it, even though its rendering was already E1-gated below).
    // S105: its one taskbar line is compared before/after, so a guide that
    // evaluates every frame but says nothing new costs no upload.
    const guideTextBefore = this.guide?.activeText ?? null;
    if (this.phase === 'desktop' && this.desktopEra === 'e1' && this.guide) this.guide.update();
    // ⚑ Phase 7 — the jingle: its tail fades; the drawn words change only when a word does
    if (this.e2Jingle) {
      const a = this.e2Jingle;
      const left = (Number.isFinite(a.duration) ? a.duration : 30.77) - a.currentTime;
      a.volume = JINGLE_VOLUME * Math.max(0, Math.min(1, left / JINGLE_FADE_SECONDS));
      const key = this.jingleKey();
      if (key !== this.jingleLyricKey) { this.jingleLyricKey = key; this.dirty = true; }
    }
    // ⚑ Phase 7 — a new line rises in full above the bar for a moment (see the taskbar's tooltip)
    if ((this.guide?.activeText ?? null) !== guideTextBefore) { this.guideTipAt = this.t; this.guideTipPinned = false; }
    if (this.guideTipAt >= 0 && this.t - this.guideTipAt > GUIDE_TIP_SECONDS && !this.guideTipPinned) { this.guideTipAt = -1; this.dirty = true; }
    // S2R.0/S2R.1: the E2 arrival's own transient beats. 'silence' holds until
    // pressed (no timer — click-only, rail); 'lambyBoot' is a brief system
    // beat ("Restorify — finishing installation…") that resolves on its own,
    // same pacing family as the BIOS/LambyOS boot holds above.
    if (this.phase === 'desktop' && this.desktopEra === 'e2' && this.e2Stage !== 'active') {
      const e2Before = this.e2StageT;
      this.e2StageT += dt;
      // ⚑ S166: the machine boots in SILENCE — post → the crawl; the jingle is the
      //   software's now and plays over Lamby's cartoon (`lambyCartoon`, below).
      //   The CD-ROM splash (S116) is retired from play; `e2Splash` reviews it.
      if (this.e2Stage === 'post' && this.e2StageT >= E2_POST_SECONDS) this.startE2Boot();
      if (this.e2Stage === 'lambyBoot' && e2Before < E2_LAMBY_BLACK && this.e2StageT >= E2_LAMBY_BLACK) this.dirty = true;
      if (this.e2Stage === 'splash') {
        // the surface only re-uploads when something on it has actually moved
        if (e2SplashVersion(this.e2StageT) !== e2SplashVersion(e2Before)) this.dirty = true;
        if (this.e2StageT >= E2_SPLASH.handoff) {
          // ⚑ the handoff: the crawl starts NOW and the splash dissolves over it
          this.e2SplashFade = E2_SPLASH.fade;
          this.startE2Boot();
        }
      } else if (this.e2SplashFade > 0) {
        this.e2SplashFade = Math.max(0, this.e2SplashFade - dt);
        this.dirty = true;
      }
      if (this.e2Stage === 'osBoot') {
        const next = Math.min(Math.floor(this.e2StageT / BOOT_CPS), this.e2BootTotal);
        // never walk back a click-completed crawl
        if (next > this.e2BootChars) { this.e2BootChars = next; this.dirty = true; }
        if (this.e2BootChars >= this.e2BootTotal && this.e2BootDoneAt === Infinity) {
          this.e2BootDoneAt = this.e2StageT;
        }
        // the crawl finishes, the footer holds, THEN the installer line
        if (this.e2StageT > this.e2BootDoneAt + E2_BOOT_HOLD) {
          this.e2Stage = 'lambyBoot';
          this.e2StageT = 0;
          this.dirty = true;
        }
      }
      if (this.e2Stage === 'lambyBoot' && this.e2StageT > LAMBY_BOOT_HOLD) {
        // ⚑ S166 — THE SOFTWARE BOOTS: Lamby's cartoon over the programme's own
        //   song (Sérgio: "a song from the program… it needs not to be the boot-in
        //   of the computer and OS, but of the software"). The jingle starts here
        //   and plays on under his introduction and into the programme.
        this.startE2Cartoon();
      }
      if (this.e2Stage === 'lambyCartoon') {
        if (e2CartoonVersion(this.e2StageT) !== e2CartoonVersion(e2Before)) this.dirty = true;
        if (this.e2StageT >= E2_CARTOON.handoff) {
          // ⚑ and here he is, for the first time in the piece
          this.e2Stage = 'lambyIntro';
          playOnce('chime_2003.mp3');   // S141: the machine has a sound card now, and it is pleased about it — Lamby arrives on it
          playOnce('lamby_pop.mp3');    // S155 / W-G1: and Lamby has a sound of his own — a small pop, the way a desk assistant announced itself
          this.e2StageT = 0;
          this.lambyPoseT = 0;
          this.dirty = true;
        }
      }
    }
    // Lamby's own clock — his appear-pop and idle fidget run whenever he is on
    // screen, in any of his windows (the debut, the notice, the video offer).
    if (this.phase === 'desktop' && this.lambyOnScreen) this.lambyPoseT += dt;
    if (!this.behindToastShown && this.t >= this.behindToastAt) {
      this.behindToastShown = true;
      this.toast = { text: strings.desktop.behindToast, t: 7 };
      this.dirty = true;
    }
    if (this.toast) {
      this.toast.t -= dt;
      // the text does not animate; only its arrival and its going matter
      if (this.toast.t <= 0) { this.toast = null; this.dirty = true; }
    }

    /**
     * ⚑ S105 — DIRTY ONLY WHEN SOMETHING DRAWN CHANGED (review R1, finding B-1).
     *
     * This block replaces one line — `this.dirty = true; // caret blink etc.;
     * dirty-rect optimization comes later` — which cost the piece a measured
     * ~240 texture uploads per second, FLAT, idle or animating, in every era,
     * on the two busiest surfaces in the work. CLAUDE.md's Quest budget says
     * "render-texture uploads on dirty only"; that line was the law's only
     * standing exception and nothing about it was ever an optimization
     * question — the surface was simply never asked whether it had changed.
     *
     * Two things make the answer cheap, and neither needed a new field:
     *
     * 1. **The windows already keep their own flags.** `kit.dirty`,
     *    `irc.dirty`, `diary.dirty`, `caleb.dirty`, `netvision.dirty`,
     *    `packet.dirty`, `provotype.dirty`, `restorify.dirty`,
     *    `accountability.dirty`, `updateApp.dirty` all exist and are
     *    maintained carefully (caleb's own comment: "the dissolve, the line's
     *    fade-in and the commit cross-fade all need every frame; nothing else
     *    in this beat does"). **Nothing in the repository read a single one of
     *    them** — os.ts flagged itself every frame instead, so all that care
     *    was dead code. `consume` below reads and clears them, which is also
     *    what makes hover changes inside those windows keep arriving: their
     *    `handleMove` returns early without touching this class, and their own
     *    flag is the only signal that anything moved.
     * 2. **Time-driven changes are QUANTISED and compared against the frame
     *    before**, the pattern `space.ts` and `era3Devices.ts` already use
     *    (`version++` on a step change). The caret genuinely blinks and must
     *    keep blinking — but it changes 4.4 times a second, not 120, so the
     *    step is what is compared, not the clock. `this.t - dt` is last
     *    frame's clock, so no previous-step field has to be stored anywhere.
     *
     * What stays per-frame is what genuinely moves per frame: the splash bar's
     * travelling bands, the fade up out of the residue, Lamby's continuous
     * sway, and the rig file's panel (the one window on this canvas with a
     * clock and no flag of its own).
     */
    const consume = (w: { dirty: boolean } | null | undefined): void => {
      if (w?.dirty) { w.dirty = false; this.dirty = true; }
    };
    consume(this.kit); consume(this.irc); consume(this.packet); consume(this.diary); consume(this.rootCause);
    consume(this.provotype); consume(this.restorify); consume(this.netvision); consume(this.mediaPlayer);
    consume(this.caleb); consume(this.accountability); consume(this.updateApp);
    // the era's shell keeps a real version counter instead of a flag (space.ts) —
    // it was read against `lastVersion` for the visor and never for this canvas.
    if (this.e4 && this.e4.version !== e4VersionBefore) this.dirty = true;
    // the guide's line is condition-driven: it changes when it changes.
    if (guideTextBefore !== (this.guide?.activeText ?? null)) this.dirty = true;

    // the caret — 2.2 Hz, and only where one is actually drawn
    const caretDrawn = this.phase === 'boot' || this.phase === 'name' || this.phase === 'r_boot'
      || (this.phase === 'desktop'
          && (this.irc?.open === true
              || (this.desktopEra === 'e2' && this.e2Stage === 'osBoot')));
    if (caretDrawn && Math.floor(this.t * 2.2) !== Math.floor((this.t - dt) * 2.2)) {
      this.dirty = true;
    }
    // the one-shot arming of the warning's Continue button
    if (this.phase === 'warning'
        && this.phaseT >= WARNING_ARM_DELAY && this.phaseT - dt < WARNING_ARM_DELAY) {
      this.dirty = true;
    }
    // and the genuinely continuous handful
    if (this.phase === 'splash') this.dirty = true;                       // the loading bands travel
    if (this.desktopReturnAt >= 0) this.dirty = true;                     // the fade back up out of black
    if (this.phase === 'desktop' && this.lambyOnScreen) this.dirty = true; // his sway is a sine, not a step
    if (this.phase === 'desktop' && this.lambyRigFile?.open) this.dirty = true; // panel on a bare clock

    this.draw();
  }

  private caretOn(): boolean {
    return Math.floor(this.t * 2.2) % 2 === 0;
  }

  private draw(): void {
    const W = ERA1_CANVAS.width;
    const H = ERA1_CANVAS.height;
    this.hits = [];

    switch (this.phase) {
      case 'warning': this.drawWarning(W, H); break;
      case 'off': ui.px(this.ctx, 0, 0, W, H, ERA1.black); break;
      case 'boot': this.drawBoot(); break;
      case 'splash': this.drawSplash(W, H); break;
      case 'name': this.drawName(W, H); break;
      case 'desktop': this.drawDesktop(W, H); break;
      case 'left': this.drawLeft(W, H); break;
      case 'r_dark': ui.px(this.ctx, 0, 0, W, H, ERA1.black); break; // O1: monitor off
      case 'r_boot': this.drawReinterpBoot(W, H); break;             // O2
      case 'r_splash': this.drawSplash(W, H); break;                 // S156: the OS coming up, and its chime
      case 'r_profile': this.drawReinterpProfile(W, H); break;       // O3
      case 'r_recap': this.drawReinterpRecap(W, H); break;           // O3 close
    }
    if (this.phase === 'desktop' && this.desktopEra === 'e2' && this.e2Jingle) this.drawJingleLyrics(W, H);
    if (this.reinterp) this.drawReinterpMarker(W);
    if (this.paused) this.drawPause(W, H);
  }

  /** the line being sung (index) and how many of its words are lit — '' when none is up */
  private jingleKey(): string {
    const a = this.e2Jingle;
    if (!a) return '';
    const now = a.currentTime;
    let li = -1;
    for (let i = 0; i < JINGLE_LINES.length; i++) if (JINGLE_LINES[i].t <= now) li = i;
    if (li < 0) return '';
    const L = JINGLE_LINES[li];
    if (li === JINGLE_LINES.length - 1 && now - L.words[L.words.length - 1][0] > 2.5) return '';
    return `${li}:${L.words.filter((w) => w[0] <= now).length}`;
  }

  /**
   * ⚑ Phase 7 (his: "The Lamby boot-up needs lyrics") — the programme's song, sung under its cartoon:
   * one line at a time on Restorify's navy band at the foot of the screen, each word lit as it is sung
   * (FloppySheep's karaoke, in 2003's chrome). The song is the programme's; nothing is filed.
   */
  private drawJingleLyrics(W: number, H: number): void {
    const key = this.jingleKey();
    if (!key || !this.e2Jingle) return;
    const [li] = key.split(':').map(Number);
    const now = this.e2Jingle.currentTime;
    const words = JINGLE_LINES[li].words;
    const { ctx } = this;
    ui.setFont(ctx, 12);
    const text = words.map((w) => w[1]).join(' ');
    const tw = Math.ceil(ctx.measureText(text).width);
    const bw = Math.min(W - 16, tw + 28), bh = 22;
    const bx = Math.round((W - bw) / 2), by = H - (this.e2Stage === 'active' ? 22 : 0) - bh - 10;
    ui.px(ctx, bx, by, bw, bh, ERA1.navy);
    ui.px(ctx, bx, by, bw, 1, ERA1.titleBlue);
    let x = Math.round((W - tw) / 2);
    for (const [t, w] of words) {
      ctx.fillStyle = t <= now ? ERA1.white : ERA1.grey;
      ctx.fillText(w, x, by + 5);
      x += ctx.measureText(w + ' ').width;
    }
  }

  private drawReinterpMarker(W: number): void {
    const { ctx } = this;
    const x = W - 20;
    const y = 6;
    ui.px(ctx, x, y, 14, 10, ERA1.greyDark);
    ui.px(ctx, x + 1, y + 1, 12, 8, ERA1.black);
    ui.px(ctx, x + 2, y + 2, 3, 6, ERA1.warn);
    ui.px(ctx, x + 6, y + 2, 3, 6, ERA1.ok);
    ui.px(ctx, x + 10, y + 2, 2, 6, ERA1.titleBlue);
  }

  private drawSplash(W: number, H: number): void {
    const { ctx } = this;
    ui.px(ctx, 0, 0, W, H, ERA1.black);
    // four-square mark (invented, era-true) + wordmark
    const mx = Math.round(W / 2) - 50; const my = Math.round(H / 2) - 40;
    ui.px(ctx, mx, my, 14, 14, ERA1.warn);
    ui.px(ctx, mx + 16, my, 14, 14, ERA1.ok);
    ui.px(ctx, mx, my + 16, 14, 14, ERA1.titleBlue);
    ui.px(ctx, mx + 16, my + 16, 14, 14, ERA1.olive);
    ui.setFont(ctx, 16);
    ctx.fillStyle = ERA1.white;
    ctx.fillText(strings.splash.title, mx + 40, my + 2);
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.grey;
    ctx.fillText(strings.splash.subtitle, mx + 40, my + 22);
    // banded loading bar, looping
    const bw = 180; const bx = Math.round((W - bw) / 2); const by = my + 56;
    ui.px(ctx, bx - 1, by - 1, bw + 2, 12, ERA1.greyDark);
    ui.px(ctx, bx, by, bw, 10, ERA1.black);
    const off = Math.floor((this.phaseT * 60) % (bw + 30)) - 30;
    for (let i = 0; i < 5; i++) {
      const sx = off + i * 7;
      if (sx >= 0 && sx + 5 <= bw) ui.px(ctx, bx + sx, by + 1, 5, 8, ERA1.titleBlue);
    }
  }

  private drawWarning(W: number, H: number): void {
    const { ctx } = this;
    ui.px(ctx, 0, 0, W, H, ERA1.black);
    ui.setFont(ctx, 11);
    ctx.fillStyle = ERA1.silver;
    ctx.fillText(strings.warning.title, 40, 24);
    ui.setFont(ctx, 10);
    strings.warning.body.forEach((line, i) => {
      ctx.fillStyle = i > 4 ? ERA1.grey : ERA1.silver;
      ctx.fillText(line, 40, 52 + i * 14);
    });
    const armed = this.phaseT >= WARNING_ARM_DELAY;
    ui.button(ctx, 40, H - 56, 200, 20, strings.warning.continue, {
      disabled: !armed, hover: this.hover === 'continue' && armed
    });
    ui.button(ctx, 256, H - 56, 70, 20, strings.warning.leave, { hover: this.hover === 'leave' });
    if (armed) this.hits.push({ x: 40, y: H - 56, w: 200, h: 20, id: 'continue' });
    this.hits.push({ x: 256, y: H - 56, w: 70, h: 20, id: 'leave' });
    if (!armed) {
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.greyDark;
      ctx.fillText('(one moment)', 40, H - 30);
    }
  }

  private drawBoot(): void {
    const { ctx } = this;
    ui.px(ctx, 0, 0, ERA1_CANVAS.width, ERA1_CANVAS.height, ERA1.black);
    ui.setFont(ctx, 12);
    ctx.fillStyle = ERA1.silver;
    let remaining = this.bootChars;
    let y = 12;
    for (const line of BOOT_LINES) {
      if (remaining <= 0) break;
      const take = Math.min(line.length, remaining);
      ctx.fillText(line.slice(0, take), 12, y);
      remaining -= Math.max(line.length, 1);
      y += 16;
    }
    if (this.caretOn()) ui.px(ctx, 12, y, 7, 12, ERA1.silver);
  }

  private drawName(W: number, H: number): void {
    const { ctx } = this;
    ui.px(ctx, 0, 0, W, H, ERA1.tealDark);
    const dw = 280; const dh = 110;
    const dx = Math.round((W - dw) / 2); const dy = Math.round((H - dh) / 2);
    const c = ui.windowFrame(ctx, dx, dy, dw, dh, strings.name.title, true);
    ui.setFont(ctx, 11);
    ctx.fillStyle = ERA1.black;
    if (!this.greeting) {
      ctx.fillText(strings.name.prompt, c.x + 8, c.y + 6);
      ui.inputField(ctx, c.x + 8, c.y + 24, c.w - 16, 20, this.nameInput, this.caretOn());
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.grey;
      ctx.fillText(strings.name.hint, c.x + 8, c.y + 50);
      ui.button(ctx, c.x + c.w - 60, c.y + c.h - 26, 52, 18, strings.name.ok, {
        disabled: this.nameInput.trim().length === 0, hover: this.hover === 'ok'
      });
      if (this.nameInput.trim().length > 0) {
        this.hits.push({ x: c.x + c.w - 60, y: c.y + c.h - 26, w: 52, h: 18, id: 'ok' });
      }
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.greyDark;
      ctx.fillText(strings.name.footnote, 40, H - 20);
    } else {
      ui.setFont(ctx, 13);
      ctx.fillStyle = ERA1.navy;
      ctx.fillText(strings.name.greeting.replace('{name}', ledger.name), c.x + 8, c.y + 16);
      // the tell — dim, easy to miss (Storyboard A3)
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.greyDark;
      ctx.fillText(strings.name.classifying, 8, H - 14);
    }
  }

  private drawDesktop(W: number, H: number): void {
    ui.resetFrames();   // S165: the frames drawn this frame, for the minimise boxes
    // S2R.0/S2R.1: the E2 arrival owns the WHOLE monitor until it settles —
    // no taskbar, no icons, no toast (the silence law; the Lamby beats are
    // transient conduction, not ordinary desktop chrome).
    if (this.desktopEra === 'e2' && this.e2Stage !== 'active') {
      this.drawE2Arrival(W, H);
      return;
    }
    // S2R.6 — THE RESIDUE (respite → felt): the quiet after owns the whole
    // monitor. No guide, no UI, no apparatus — not even the taskbar.
    if (this.caleb?.ownsScreen) {
      this.caleb.draw(this.ctx);
      return;
    }
    // ⚑ S164 / R3-61 — and after it, the dark stays: the era says nothing else
    //   in its own voice; the next thing on the monitor is the system noticing
    //   its own end (u3's notice, the one window drawn here), out of the black.
    if (this.residueDark) {
      ui.px(this.ctx, 0, 0, W, H, ERA1.black);
      if (this.updateApp?.open) this.updateApp.draw(this.ctx);
      return;
    }
    // ⚑ ERA 4 — AND THERE IS NO DESKTOP HERE (THE_SPACE §6). Every branch below
    // this one draws a desktop of some kind; this era draws a device that is
    // already on. The shell owns the whole surface — standby, then THE PLACE —
    // and nothing frames it: no taskbar, no icons, no clock, no era toast. In
    // the room this same canvas is textured onto the VISOR rather than a
    // monitor (src/room/era3Devices.ts), and under `?flat=1` it is the screen.
    // The update ritual is deliberately NOT excluded: u4 runs on Vera's workstation
    // and is over before this era begins, and any later ritual (the bare final
    // restart) is the frame's business, not the era's.
    if (this.desktopEra === 'e4' && this.e4) {
      this.e4.draw(this.ctx, W, H);
      // ⚑ NOT WHILE L IS STILL ON THE LAPTOP (2026-09-01). This full-screen rect
      //   IS the one touch — the OS canvas is textured onto the visor in E4, so
      //   pressing it is pressing the headset. Era 4 now opens on the laptop and
      //   `E4Shell.wear()` refuses until that is done, which left this rect
      //   registered and dead: a control the piece advertises as live and then
      //   ignores. `tools/walk.mjs` found it by pressing it and watching nothing
      //   move, which is the entire reason that check exists.
      if (!this.e4.worn && this.e4.stage !== 'laptop') {
        this.hits.push({ x: 0, y: 0, w: W, h: H, id: 'e4-touch' });
      }
      if (this.updateApp?.open) this.updateApp.draw(this.ctx);
      return;
    }
    const { ctx } = this;
    const skin = this.eraSkin();
    const colors = this.desktopColors();
    // ⚑ S61 — DANIEL'S MONITOR IS DEAD AT E3, and stays dead. The u3 ritual
    // used to hand the Room-1 CRT a full GracePlatform 2016 desktop the
    // instant the era flipped: "community profile migrated · testimony tools
    // ready", glowing on a 2003 machine in a room whose occupant has just
    // been transferred, and glowing THROUGH the whole relocation as the
    // camera flies over it. That is the other half of Sérgio's *"it installs
    // on the Era-2 session — a design that makes no sense"*: the arrival now
    // happens on Vera's workstation (src/room/graceQueueLite.ts), so this machine
    // has nothing left to show. It ran its removal, it restarted, and it is
    // an empty computer in a closed room.
    // ⚑ S76 CLOSES S61's OPEN QUESTION — *"where the OS surface should LIVE once
    // the player has left Room 1 for good"*. It lives on the screen the player
    // is actually looking at. The last update no longer comes back to this dead
    // CRT: u4 lands on VERA'S LAPTOP (src/room/era3Devices.ts composites it
    // there), so Daniel's machine stays off from E3 to the end, with no
    // exception at all. `?flat=1` has no room and no workstation to composite
    // anything onto, so the one canvas this file owns is the only screen it
    // has — the condition below draws there for exactly that reason, a fact
    // about `?flat=1`'s own geometry, not a decision made FOR shipped
    // behaviour by a review tool (CLAUDE.md: `?flat=1` is not an audience
    // target and no design decision should be justified by it).
    //
    // ⚑ S87 — AND THE SEND OFFER (s3/s4) GETS THE SAME TREATMENT AS u4, for
    // the same reason. This blackout used to be the whole of the send offer's
    // problem: `spine.ts` called `offerSend('s3')`/`offerSend('s4')` on the
    // ordinary E3 path, `offerSend` set state and a toast, and then this
    // early return fired first, every time — `drawSendOffer()` was never
    // reached, no hit rect was ever pushed, and `ledger.sends` never heard
    // about either send. IN THE ROOM it now draws on Vera's workstation instead
    // (`drawSendOfferExternal`/`handleSendOfferExternalClick`, wired through
    // the same E4-bridge seam as `update()`/`armFinal()` — see the
    // constructor's `setE4Bridge` call), so Daniel's monitor stays exactly as
    // dead as S61 left it. UNDER `?flat=1` there is no workstation either, so the
    // condition below now also lets a live send offer through — the same
    // exemption `!this.updateApp` already carves out for u4, extended to the
    // offer that precedes it. ⚑⚑ SAFETY: see `drawSendOfferInto`'s own
    // comment for the s3/s4 gate — the "go" button is withheld until Sérgio
    // picks the s2 dolly fix (08 §17); decline still draws, takes a click,
    // and files.
    if (this.desktopEra === 'e3' && (roomIsMounted() || (!this.updateApp && !this.sendOffer))) {
      ui.px(ctx, 0, 0, W, H, ERA1.black);
      return;
    }
    ui.px(ctx, 0, 0, W, H, colors.bg);

    if (this.desktopEra === 'e1') {
      // icons — the channel only exists once the kit has routed you there
      // S151: the disk stays on the desktop; once inserted it brings the wizard back
      if (!this.kit?.open) this.drawIcon(10, 8, strings.desktop.iconA, true, 'icon-a');
      if (this.irc && !this.irc.open) this.drawIcon(10, 56, strings.desktop.iconIrc, true, 'icon-irc');
      // reinterpretation-only: the provotype launchers (the invitation is inside each)
      if (this.reinterp && !this.provotype) {
        this.drawIcon(10, 104, reinterpStrings.launcherIcon, true, 'icon-provotype');
        // ⚑ R3-13 (Sérgio: "the companion form comes after Mom talked with Rob —
        //   I shouldn't be able to play it now"): the Family Form exists on this
        //   desktop only once Rob's "i spoke with your mother" has been said.
        //   The ledger IS the if-this-then-this — no storage, the line is filed.
        if (this.formAvailable) this.drawIcon(10, 152, reinterpStrings.launcherIconIntake, true, 'icon-provotype-intake');
      }
      // S55 — lamby_rig.exe: an unremarked file, never advertised, drawn only
      // on the otherwise-bare E1 desktop (see e1DesktopIdle's doc comment for
      // why that gate exists, not just click-priority).
      if (this.reinterp && this.e1DesktopIdle()) {
        this.drawIcon(10, 200, 'lamby_rig.exe', true, 'icon-lambyrig');
        // S153 — the game came with the disk: on the desktop from the moment it is in (○ sandbox)
        if (ledger.records.includes('kit-inserted')) this.drawIcon(10, 248, rootCauseStrings.icon, true, 'icon-rootcause');
      }
    } else {
      this.drawEraDesktopChrome(W, skin, colors);
      /**
       * ⚑⚑ S86 — THE TWO E1 PROVOTYPES USED TO VANISH AT THE ERA CHANGE, AND
       * NOBODY EVER CHOSE TO LEAVE THEM.
       *
       * Sérgio, after finding "Today's lesson" late: *"If I didn't go back I
       * would never find it… so they only exist before you press the floppy."*
       * And, playing the deployed build: *"Also where are the provotypes
       * here?"* — `data/provotypes/` holds five, check-spec counts five, and
       * the project lead, on the device this will be exhibited on, could not
       * reach one. **The check has been proving the FILES exist; it has never
       * proved a PLAYER can meet them.**
       *
       * The mechanism was exact: both launchers drew inside the `e1` branch
       * above with no equivalent for any later era, and Era 1 does not end by
       * a player's choice — the diary glitch files, spine.ts arms T1 1.2 s
       * later, and the era turns. Two authored surfaces closed for good on a
       * timer, with nothing anywhere saying they were closing.
       *
       * They are carried forward to E2 instead, on the FOUND FILE'S OWN LAW
       * (`desktopIdle()`, Session 60): never during a felt scene, never over a
       * window, never announced, never rewarded — there for the player who
       * looks. The fiction was already carrying them: E2's own boot crawl says
       * JOURNEY FILE … MIGRATED and *"Your file was kept while you were
       * away."* A session and an intake form kept on the new desktop is the
       * piece's own thesis about what a migration keeps.
       *
       * A SECOND COLUMN, not the era's shelf: `drawEraDesktopChrome` owns
       * x 12 (its icons run y 92, 140) and the Messenger and the found file
       * take y 236 and 296 below them. x 100 clears the first column's widest
       * label (centred on x+18, clipped at 62 px, so it ends by x 61) and
       * reads as what it is — files that came with you, beside the ones the
       * new software brought.
       *
       * ⚑ FOR SÉRGIO — a composition call, not a bug fix, and yours to
       * overrule: it is E2 ONLY. E3 leaves Daniel's monitor dead by law (S61)
       * and E4 is ambient, so "carry them forward" cannot mean "forever" here
       * without answering where an OS surface lives after Room 1, which is
       * S76's question and another session's fence.
       */
      if (this.reinterp && this.desktopEra === 'e2' && this.desktopIdle()) {
        this.drawIcon(100, 92, reinterpStrings.launcherIcon, true, 'icon-provotype');
        this.drawIcon(100, 140, reinterpStrings.launcherIconIntake, true, 'icon-provotype-intake');
        // ⚑ S183f / R5-04 — and his own file, which came with him too
        this.drawIcon(100, 188, institutionStrings.yourFile.icon, true, 'icon-your-file');
        // ⚑ S191 — the forum, once a thread has been recommended; unread until he opens it
        if (this.forumRecommended) this.drawIcon(100, 236, forumStrings.icon, true, 'icon-forum', !this.forum);
        // ⚑ S205 — his story, once it has been asked for; unread until it is out
        if (this.testimonyOffered) this.drawIcon(100, 284, testimonyStrings.icon, true, 'icon-story', !ledger.records.includes('testimony-online'));
      }
    }
    // THE FOUND FILE (Session 60) — the renamed dossier, in every era, on the
    // same terms as lamby_rig.exe: only on an otherwise-idle desktop (so it is
    // never on screen during a felt beat, and never competes with a window),
    // never announced, never rewarded. It is there for the player who looks.
    if (this.reinterp && this.dossierUnlocked && this.desktopIdle()) {
      // ⚑ Phase 7 — on its column's 48 px grid in 2003 (it sat 12 px under it)
      this.drawIcon(this.desktopEra === 'e1' ? 10 : 12, this.desktopEra === 'e1' ? 296 : 284, strings.dossier.icon, true, 'icon-found-file');
    }
    // ⚑ Phase 7 (his: the Route sheet "is not lined" and "appears on top of other stuff") — the summons'
    //   icon is a desktop object: drawn here with the others, UNDER every window, on the first column's grid
    this.drawSendOfferIcon(this.ctx, this.hits);
    // …and the Messenger, once a message has landed and not yet been read
    // (finding B8): the door stays visible whether or not Lamby's notice was
    // taken, so nothing depends on having said yes to him.
    if (this.desktopEra === 'e2' && this.messagePending) {
      this.drawIcon(12, 236, lambyStrings.messengerIcon, true, 'icon-messenger', true);
    }
    // windows
    // S151 — the wizard minimises itself when the channel opens, and comes back
    // only by a press (the A:\ icon, the taskbar): a window brought back is on top
    if (this.irc?.open) this.irc.draw(ctx, this.caretOn());
    if (this.kit?.open) this.kit.draw(ctx);
    if (this.web?.open) this.web.draw(ctx);
    if (this.packet?.open) this.packet.draw(ctx);
    if (this.diary?.open) this.diary.draw(ctx);
    if (this.dossierOpen) this.drawDossier(W, H);
    if (this.yourFileOpen) this.drawYourFile(W, H);
    if (this.provotype?.open) this.provotype.draw(ctx);
    if (this.lambyRigFile?.open) this.lambyRigFile.draw(ctx);
    if (this.rootCause?.open) this.rootCause.draw(ctx);
    // ⚑ a tray under another window is not pressable and publishes nothing
    if (this.irc?.open && (this.kit?.open || this.packet?.open || this.diary?.open || this.dossierOpen
        || this.provotype?.open || this.lambyRigFile?.open || this.rootCause?.open)) this.irc.covered();
    // S186 — the picture Rob sent, on top of everything, until it is closed
    if (this.yesOpen) {
      this.drawYesViewer(W, H);
      this.irc?.covered();
    }
    if (this.restorify?.open) this.restorify.draw(ctx);
    // the summons is a DESKTOP object, so it belongs under the windows. It was
    // drawn after them, and a real playthrough caught it: the s1 "Route sheet"
    // icon sat on top of the Caleb transcript, inside the felt window, next to
    // the reply chips. os.ts's own `sendOfferPending` law says a summons must
    // never surface on top of S2R.3's window; this is that law in the paint
    // order. (Clicks were never affected — the chat takes them first.)
    this.drawSendOffer(W, H);
    // ⚑ S191 — 2003's forum: over the desktop's objects and Restorify, under the felt window and the intrusions
    if (this.forum?.open) this.forum.draw(ctx);
    if (this.testimony?.open) this.testimony.draw(ctx);   // S205
    // S2R.3: the person's window FIRST (felt), then every intrusion on it
    // (operable) drawn over it. Lamby lives only in the second of these two
    // calls — he is never drawn inside the chat's frame, in any beat.
    if (this.caleb?.open) this.caleb.draw(ctx);
    if (this.accountability) this.accountability.draw(ctx);
    if (this.mediaPlayer?.open) this.mediaPlayer.draw(ctx);
    // finding B8: Lamby's message notice — over the desktop, never over the
    // Messenger itself (it is closed by the time that window opens)
    if (this.messageNoticeOpen) this.drawMessageNotice(W, H);
    if (this.programSplash) this.drawProgramSplash(W, H);   // S157: over the window it precedes
    // S2R.4: Lamby's video offer, then the player itself (over Restorify, but
    // still under the system-modal update ritual below)
    if (this.netvisionOfferOpen) this.drawNetvisionOffer(W, H);
    if (this.netvision?.open) this.netvision.draw(ctx);
    // …and his toasts arrive OVER the video: the crack in the showpiece
    if (this.caleb?.open) this.caleb.drawToasts(ctx);
    // the update ritual is SYSTEM-modal — it draws over everything.
    // S61: `.visible` is false only during a DEFERRAL, and the app now draws
    // one dim standing line there (Sérgio: "Remind me later — what does it
    // do?"), so the gate is `open` and the app decides what a withdrawn
    // notice looks like. It still draws nothing at all in any other case.
    if (this.updateApp?.open) this.updateApp.draw(ctx);
    // S165: the minimise boxes are aimable (the affordance is the target) — the
    //   uncovered ones, by geometry; the press itself resolves by `topFrameAt`
    for (const mb of ui.minBoxesVisible()) this.hits.push({ x: mb.x, y: mb.y, w: mb.w, h: mb.h, id: `min-${mb.key}` });
    // taskbar
    ui.bevel(ctx, 0, H - 22, W, 22, true);
    ui.button(ctx, 3, H - 19, 50, 16, 'MENU', {});
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(skin.clock, W - 44, H - 16);
    // R28-2a: the side-message guide line (data/dialog/s1_guide.json) — the
    // apparatus's own status voice (register: operable), NOT frame chrome.
    // It lives in the taskbar's sunken status well, one terse line at a time,
    // Era 1 only (Lamby conducts from E2). Not clickable, never a popup.
    // S165 / W-E2 (a) — every present program window has a taskbar button, the
    //   way a window did: pressed in while it is up, raised while it waits
    //   (S151's wizard button, generalised — see `minimiseWindow`)
    let wellX = 58;
    if (this.reinterp && this.phase === 'desktop' && (this.desktopEra === 'e1' || this.desktopEra === 'e2')) {
      const bw = 64;
      for (const w of this.taskbarWindows()) {
        if (wellX + bw > W - 50 - 40) break;   // the well keeps at least its stub
        ui.button(ctx, wellX, H - 19, bw, 16, '', {});
        if (this.windowOpen(w.key)) ui.bevel(ctx, wellX, H - 19, bw, 16, false);
        ui.setFont(ctx, 9);
        ctx.fillStyle = ERA1.black;
        ctx.fillText(w.label, wellX + 8, H - 16);
        this.hits.push({ x: wellX, y: H - 19, w: bw, h: 16, id: `taskbar-${w.key}` });
        wellX += bw + 4;
      }
    }
    if (this.reinterp && this.desktopEra === 'e1') {
      const wellW = W - 50 - wellX;
      ui.bevel(ctx, wellX, H - 19, wellW, 16, false);
      const guideLine = this.guide?.activeText;
      if (guideLine) {
        // ⚑ Phase 7 (his: "the suggestion flows over in the menu bar") — the line is kept inside its
        //   well; when it does not fit, the well shows its start and the whole line rises above the bar
        //   as a 1997 tooltip (the system's yellow slip, no character): for a moment when the line is
        //   new, and again whenever the well is pressed. Nothing is filed by reading it.
        ui.setFont(ctx, 9);
        ctx.fillStyle = ERA1.greyDark;
        const room = wellW - 12;
        const fits = ctx.measureText(guideLine).width <= room;
        let shown = guideLine;
        if (!fits) {
          while (shown.length > 4 && ctx.measureText(`${shown}...`).width > room) shown = shown.slice(0, -1);
          shown = `${shown.trimEnd()}...`;
        }
        ctx.fillText(shown, wellX + 6, H - 16);
        if (!fits) {
          this.hits.push({ x: wellX, y: H - 19, w: wellW, h: 16, id: 'taskbar-guide' });
          if (this.guideTipAt >= 0 || this.guideTipPinned) {
            const lines = ui.wrapText(ctx, guideLine, Math.min(300, wellW + 40) - 12);
            const tw = Math.ceil(Math.max(...lines.map((l) => ctx.measureText(l).width))) + 12;
            const th = lines.length * 11 + 6;
            const tx = Math.max(4, Math.min(W - tw - 4, wellX)); const ty = H - 22 - th - 2;
            ui.px(ctx, tx, ty, tw, th, ERA1.black);
            ui.px(ctx, tx + 1, ty + 1, tw - 2, th - 2, ERA1.tooltip);
            ctx.fillStyle = ERA1.black;
            lines.forEach((l, i) => ctx.fillText(l, tx + 6, ty + 4 + i * 11));
          }
        }
      }
    }
    // THE BREAK's residue (S2R.4), now a REAL AFFORDANCE (S60, finding E20 —
    // Sérgio: *"'1 new message — C___' in the system bar is barely visible AND
    // not clickable. He tried to open it and couldn't."*). Two fixes, one
    // rule — it is an affordance or it is not there:
    //   · legible: a raised taskbar button with the same unread pip the
    //     Messenger icon carries, not pale text sunk in a well;
    //   · clickable: pressing it does exactly what the corner toast does, and
    //     the apparatus answers by re-asserting its block. The mark is cleared
    //     the moment the block lifts, because then it is no longer true.
    if (this.reinterp && this.desktopEra === 'e2' && this.calebNotificationVisible) {
      const bw = W - 50 - wellX;   // S165: after the window buttons, if any
      ui.button(ctx, wellX, H - 19, bw, 16, '', { hover: this.hover === 'taskbar-message' });
      ui.px(ctx, wellX + 5, H - 15, 6, 6, ERA1.warn);
      ui.setFont(ctx, 9);
      ctx.fillStyle = this.hover === 'taskbar-message' ? ERA1.navy : ERA1.black;
      ctx.fillText(mediaStrings.breakNoticeText, wellX + 16, H - 16);
      this.hits.push({ x: wellX, y: H - 19, w: bw, h: 16, id: 'taskbar-message' });
    }
    // …and the desktop comes UP OUT OF BLACK after the residue (finding F25):
    // caleb.ts fades its field out, this fades the room back in. The era's
    // quietest beat is not allowed to end on a cut.
    if (this.desktopReturnAt >= 0) {
      const k = (this.t - this.desktopReturnAt) / DESKTOP_RETURN_FADE;
      if (k >= 1) this.desktopReturnAt = -1;
      else {
        ctx.save();
        ctx.globalAlpha = 1 - Math.max(0, k);
        ui.px(ctx, 0, 0, W, H, ERA1.black);
        ctx.restore();
      }
    }
    // toast
    // ⚑ S86 — NOT OVER THE PROVOTYPE'S CARE ROW. Seen with my own eyes the
    // moment the two E1 launchers were carried onto the E2 desktop (above) and
    // the Family Form opened there for the first time: the era-status well
    // ("journey file migrated · accountability online") paints a box at
    // y H-42…H-26, and the provotype's FIXED Leave/Pause/primary row sits at
    // y 332…352 — so the toast ate the bottom third of the card's own primary
    // button. Clicks were never affected, but this is the same impression the
    // dossier overflow made: an evidence surface that looks unmaintained.
    // The provotype is the one modal whose care row reaches these rows, and
    // that row is load-bearing by its own law (Leave and Pause live from frame
    // one, at a fixed position, every phase) — so an ambient system remark
    // yields to it and comes back when the card closes.
    if (this.toast && !this.provotype?.open) {
      ui.setFont(ctx, 9);
      const tw = ctx.measureText(this.toast.text).width + 12;
      ui.px(ctx, W - tw - 6, H - 42, tw, 16, ERA1.tooltip);
      ui.px(ctx, W - tw - 6, H - 42, tw, 1, ERA1.black);
      ui.px(ctx, W - tw - 6, H - 42, 1, 16, ERA1.black);
      ui.px(ctx, W - tw - 6, H - 27, tw, 1, ERA1.black);
      ui.px(ctx, W - 7, H - 42, 1, 16, ERA1.black);
      ctx.fillStyle = ERA1.black;
      ctx.fillText(this.toast.text, W - tw, H - 38);
    }
    // ⚑ S186 — the picture Rob sent owns the screen (the click routing says so): the taskbar and the
    //   minimise boxes drawn after it are not pressable while it is up, so they are not published
    if (this.yesOpen) this.hits = this.hits.filter((h) => h.id === 'yes-close');
    // ⚑ S207 — the pause is modal: drawn last, and the only thing pressable while it is up
    if (this.pauseOpen) { this.hits = []; this.drawPauseDialog(W, H); }
  }

  private drawEraDesktopChrome(
    W: number,
    skin: { brand: string; status: string; icons: string[] },
    colors: { panel: string; text: string }
  ): void {
    const { ctx } = this;
    ui.px(ctx, 26, 24, W - 52, 44, colors.panel);
    ui.setFont(ctx, 16);
    ctx.fillStyle = colors.text;
    ctx.fillText(skin.brand, 42, 34);
    ui.setFont(ctx, 9);
    ctx.fillStyle = this.desktopEra === 'e4' ? ERA1.grey : ERA1.paper;
    ctx.fillText(skin.status, 42, 56);
    skin.icons.forEach((label, i) => {
      // S2R.1 dismissal law: Lamby does not return until the player opens
      // Restorify themselves — E2's own first icon IS already named
      // "Restorify" (data/strings/slice.json eraSkins.e2), so that existing
      // icon is the door, present for the rest of era 2 regardless of how
      // the debut resolved (begun or dismissed). No duplicate icon added.
      // Session 60: the third icon in every era's list used to be the served
      // "Dossier" card. It is not on this shelf any more — see drawDesktop's
      // found-file block and data/strings/slice.json's `dossier._doc`.
      const id = this.desktopEra === 'e2' && i === 0 ? 'icon-restorify' : `icon-era-${i}`;
      this.drawIcon(12, 92 + i * 48, label, true, id);
    });
  }

  /** S2R.0/S2R.1 — the E2 arrival: silence → "finishing installation…" →
   *  Lamby's debut. Owns the whole monitor (no taskbar/icons) until it
   *  settles into the ordinary era-2 desktop. */
  private drawE2Arrival(W: number, H: number): void {
    const { ctx } = this;
    ui.px(ctx, 0, 0, W, H, ERA1.black);
    if (this.e2Stage === 'silence') {
      // felt · bare (S2R.0c): two lines, nothing else — no hint, no music.
      // Session 60 (finding A1, Sérgio: *"'Welcome Back Daniel' typeface is
      // not visible enough"*): it was 10px in `greyDark` — the palette's
      // darkest non-black, on black, at the far end of a room, through a CRT
      // that is itself a texture on a monitor mesh. The BARENESS was the
      // law, not the dimness; the fix keeps the one-line-in-the-dark staging
      // and makes it readable from the seat — bigger, in `silver`, with the
      // instruction under it kept quieter than the greeting so the hierarchy
      // still reads as a machine waiting rather than a dialog box shouting.
      ui.setFont(ctx, 15);
      ctx.fillStyle = ERA1.silver;
      ctx.fillText(lambyStrings.returnLine1, 30, Math.round(H / 2) - 18);
      ui.setFont(ctx, 11);
      ctx.fillStyle = ERA1.grey;
      ctx.fillText(lambyStrings.returnLine2, 30, Math.round(H / 2) + 8);
      return;
    }
    if (this.e2Stage === 'post') return;   // black: the machine is starting (the sound says so)
    if (this.e2Stage === 'splash') { drawE2Splash(ctx, this.e2StageT); return; }
    if (this.e2Stage === 'osBoot') {
      this.drawE2Boot(H);
      // the dissolve: the splash is still on top of the crawl for 1.2 s, which
      // is what makes the handoff read as one movement rather than a cut
      if (this.e2SplashFade > 0) {
        drawE2Splash(ctx, E2_SPLASH.handoff, this.e2SplashFade / E2_SPLASH.fade);
      }
      return;
    }
    if (this.e2Stage === 'lambyCartoon') { drawLambyCartoon(ctx, this.e2StageT); return; }
    if (this.e2Stage === 'lambyBoot') {
      if (this.e2StageT < E2_LAMBY_BLACK) return;   // S156 / R3-48: black before the installer line
      ui.setFont(ctx, 11);
      ctx.fillStyle = ERA1.silver;
      ctx.fillText(lambyStrings.installingLine, 22, Math.round(H / 2));
      return;
    }
    if (this.e2Stage === 'lambyIntro') {
      this.drawE2Conduction(W, H, lambyStrings.introTitle,
        lambyStrings.introLine1, lambyStrings.introLine2,
        { label: lambyStrings.introAccept, id: 'lamby-hello' },
        { label: lambyStrings.introDismiss, id: 'lamby-intro-dismiss' });
      return;
    }
    // 'lambyProgram' — and now the program he is the face of
    this.drawE2Conduction(W, H, lambyStrings.programTitle,
      lambyStrings.programLine1, lambyStrings.programLine2,
      { label: lambyStrings.programBegin, id: 'lamby-begin' },
      { label: lambyStrings.programDismiss, id: 'lamby-dismiss' });
  }

  /** S2R.0b — the LambyOS 2003 boot crawl (finding A2). Same typewriter
   *  grammar as the BIOS and O2 crawls, at a new version number: the machine
   *  has been UPDATED and the boot is where it says so. */
  private drawE2Boot(H: number): void {
    const { ctx } = this;
    ui.setFont(ctx, 12);
    let remaining = this.e2BootChars;
    let y = 40;
    for (const line of lambyStrings.osBootLines as string[]) {
      if (remaining <= 0) break;
      const take = Math.min(line.length, remaining);
      ctx.fillStyle = ERA1.silver;
      ctx.fillText(line.slice(0, take), 30, y);
      remaining -= Math.max(line.length, 1);
      y += 18;
    }
    if (this.caretOn() && this.e2BootChars < this.e2BootTotal) ui.px(ctx, 30, y, 7, 12, ERA1.silver);
    if (this.e2BootChars >= this.e2BootTotal) {
      ui.setFont(ctx, 10);
      ctx.fillStyle = ERA1.grey;
      ctx.fillText(lambyStrings.osBootFooter, 30, H - 34);
    }
  }

  private drawIcon(
    x: number, y: number, label: string, enabled: boolean, id: string, unread = false
  ): void {
    this.drawIconInto(this.ctx, this.hits, x, y, label, id, enabled, unread);
  }

  /** ⚑ S87 — `drawIcon`'s geometry, into any context/hit table; see
   *  `drawSendOfferInto`'s comment for why this exists. Label-width fitting
   *  still measures against `this.ctx` (font state, not pixels, is what
   *  matters there, and both contexts share the same `ui.setFont` scale). */
  private drawIconInto(
    ctx: CanvasRenderingContext2D, hits: Hit[],
    x: number, y: number, label: string, id: string, enabled = true, unread = false
  ): void {
    // S169 / R3-09: each launcher has its own picture (theme/icons.ts); the box stands in for an id without one
    if (enabled && hasPixelIcon(id)) drawPixelIcon(ctx, x + 7, y - 1, id);
    else {
      ui.px(ctx, x + 8, y, 20, 16, enabled ? ERA1.beige : ERA1.tealDark);
      ui.px(ctx, x + 8, y, 20, 4, enabled ? ERA1.navy : ERA1.tealDark);
    }
    // the unread mark (finding B8): a pip, not a number in the label — the
    // label is clipped to 62px and "Messenger (1)" lost its own count to the
    // ellipsis. `warn` is reserved for narrative events, and an unopened
    // message from Caleb is precisely one.
    if (unread) ui.px(ctx, x + 25, y - 3, 6, 6, ERA1.warn);
    ui.setFont(ctx, 9);
    ui.setFont(this.ctx, 9); // fitIconLabel measures against this.ctx — keep it in sync
    ctx.fillStyle = enabled ? ERA1.white : ERA1.tealDark;
    const fitted = this.fitIconLabel(label, 62);
    const tw = ctx.measureText(fitted).width;
    ctx.fillText(fitted, Math.round(x + 18 - tw / 2), y + 20);
    if (enabled) hits.push({ x, y, w: 38, h: 32, id });
  }

  private fitIconLabel(label: string, maxWidth: number): string {
    const { ctx } = this;
    if (ctx.measureText(label).width <= maxWidth) return label;
    let out = label;
    while (out.length > 4 && ctx.measureText(`${out}...`).width > maxWidth) out = out.slice(0, -1);
    return `${out}...`;
  }

  /**
   * THE FOUND FILE (Session 60) — what the Dossier card became. Sérgio,
   * 2026-07-26: *"it can stay as like an easter egg with a different name and
   * like an explainer of the program."* So it is not a card served to the
   * player any more; it is a text file sitting on the machine, written by the
   * program about itself, and the analyst furniture it used to wear (TACTIC /
   * LAYER / STATUS / ARCHIVE, and the researcher note that leaked in S58) is
   * gone with the authoring voice. A plain document window, one footer stamp,
   * nothing to press but close. The tactic content — the part he called
   * interesting — is untouched in substance and re-voiced in data.
   * ⚑ The name and every line are PLACEHOLDER-draft awaiting his pass.
   */
  private drawDossier(W: number, H: number): void {
    const { ctx } = this;
    const dw = 340; const dh = 216;
    const dx = Math.round((W - dw) / 2); const dy = Math.round((H - dh) / 2) - 8;
    const c = ui.windowFrame(ctx, dx, dy, dw, dh, strings.dossier.title, true, 'dossier');
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.paper);
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.black;
    strings.dossier.body.forEach((line, i) => {
      ctx.fillText(line, c.x + 10, c.y + 10 + i * 12);
    });
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(strings.dossier.footer, c.x + 10, c.y + c.h - 16);
    this.hits.push({ x: c.closeBox.x, y: c.closeBox.y, w: c.closeBox.w, h: c.closeBox.h, id: 'found-file-close' });
  }

  /**
   * ⚑ S183f / R5-04 — YOUR FILE (READ ONLY), 2003's device face of the record (PLAN_ROUND5 Phase 3:
   * "1997 the file is paper (the cabinet); 2003 a desktop folder; 2016 the accountability app; 2026
   * the record tab"). Daniel's whole file — 1997 and 2003, the same entries the wall shows him in
   * 2003 — newest first, each with the practice it belongs to (practices.json's title). Nothing
   * in it answers a press but the close box: it is a copy, and it says so.
   */
  private drawYourFile(W: number, H: number): void {
    const { ctx } = this;
    const S = institutionStrings.yourFile;
    const dw = 400; const dh = 236;
    const dx = Math.round((W - dw) / 2); const dy = Math.round((H - dh) / 2) - 8;
    const c = ui.windowFrame(ctx, dx, dy, dw, dh, S.title, true);
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.paper);
    const by = entriesByEra();
    const all = [...by.e1, ...by.e2].reverse();
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(S.sub.replace('{n}', String(all.length)), c.x + 10, c.y + 8);
    ui.px(ctx, c.x + 8, c.y + 22, c.w - 16, 1, ERA1.grey);
    const ROW = 13; const top = c.y + 28; const PW = 128;
    const room = Math.floor((c.h - 28 - 26) / ROW);
    const rows = all.length > room ? all.slice(0, room - 1) : all;
    if (all.length === 0) { ctx.fillStyle = ERA1.greyDark; ctx.fillText(S.empty, c.x + 10, top); }
    rows.forEach((e, i) => {
      const y = top + i * ROW;
      ctx.save(); ctx.beginPath(); ctx.rect(c.x + 8, y - 2, c.w - 16 - PW - 6, ROW); ctx.clip();
      ctx.fillStyle = e.flagged ? ERA1.warnDark : ERA1.black;
      ctx.fillText(e.witness, c.x + 10, y);
      ctx.restore();
      ctx.fillStyle = ERA1.grey;
      ui.setFont(ctx, 8);
      ctx.fillText((practiceOf(e.kind)?.title ?? '').toUpperCase(), c.x + c.w - 8 - PW, y + 1);
      ui.setFont(ctx, 9);
    });
    if (rows.length < all.length) {
      ctx.fillStyle = ERA1.grey;
      ctx.fillText(S.more.replace('{n}', String(all.length - rows.length)), c.x + 10, top + rows.length * ROW);
    }
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(S.footer, c.x + 10, c.y + c.h - 14);
    this.hits.push({ x: c.closeBox.x, y: c.closeBox.y, w: c.closeBox.w, h: c.closeBox.h, id: 'your-file-close' });
  }

  /** ⚑ S186 — yes.gif in a 1997 image viewer: the pixel art at ×2, nearest-neighbour; one close box */
  private drawYesViewer(W: number, H: number): void {
    const { ctx } = this;
    if (!this.yesArt) {
      const cv = document.createElement('canvas');
      cv.width = YES_W; cv.height = YES_H;
      const c2 = cv.getContext('2d');
      if (c2) drawYesPoster(c2);
      this.yesArt = cv;
    }
    const S = 2, iw = YES_W * S, ih = YES_H * S;
    const dw = iw + 16, dh = ih + 46;
    const dx = Math.round((W - dw) / 2), dy = Math.max(4, Math.round((H - dh) / 2) - 10);
    const c = ui.windowFrame(ctx, dx, dy, dw, dh, ircDialog.dcc.viewerTitle, true);
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.greyDark);
    const smooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.yesArt, c.x + 4, c.y + 4, iw, ih);
    ctx.imageSmoothingEnabled = smooth;
    ui.setFont(ctx, 8);
    ctx.fillStyle = ERA1.silver;
    ctx.fillText(ircDialog.dcc.viewerFoot, c.x + 4, c.y + ih + 10);
    this.hits.push({ x: c.closeBox.x, y: c.closeBox.y, w: c.closeBox.w, h: c.closeBox.h, id: 'yes-close' });
  }

  private drawPause(W: number, H: number): void {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(0, 0, W, H);
    ui.setFont(ctx, 13);
    ctx.fillStyle = ERA1.silver;
    ctx.fillText(strings.pause.title, Math.round(W / 2 - 24), 90);
    ui.button(ctx, Math.round(W / 2 - 80), 130, 70, 20, strings.pause.resume, { hover: this.hover === 'resume' });
    ui.button(ctx, Math.round(W / 2 + 10), 130, 70, 20, strings.pause.leave, { hover: this.hover === 'pleave' });
    this.hits.push({ x: Math.round(W / 2 - 80), y: 130, w: 70, h: 20, id: 'resume' });
    this.hits.push({ x: Math.round(W / 2 + 10), y: 130, w: 70, h: 20, id: 'pleave' });
  }

  private drawLeft(W: number, H: number): void {
    const { ctx } = this;
    ui.px(ctx, 0, 0, W, H, ERA1.black);
    ui.setFont(ctx, 11);
    ctx.fillStyle = ERA1.silver;
    strings.left.body.forEach((line, i) => {
      ctx.fillText(line, 40, Math.round(H / 2) - 20 + i * 16);
    });
  }

  // ── reinterp opening (O2/O3) ────────────────────────────────────────────
  /** a small Leave, drawn from the first frame of every opening beat (rail) */
  private drawOpeningLeave(W: number, H: number): void {
    ui.button(this.ctx, W - 70, H - 26, 60, 18, opening.o1_leave, { hover: this.hover === 'r-leave' });
    this.hits.push({ x: W - 70, y: H - 26, w: 60, h: 18, id: 'r-leave' });
  }

  /** O2 — the LambyOS boot: this computer was made FOR you (spec §1 O2) */
  private drawReinterpBoot(W: number, H: number): void {
    const { ctx } = this;
    ui.px(ctx, 0, 0, W, H, ERA1.black);
    ui.setFont(ctx, 12);
    let remaining = this.rBootChars;
    let y = 22;
    for (const line of opening.o2_boot_lines as string[]) {
      if (remaining <= 0) break;
      const take = Math.min(line.length, remaining);
      ctx.fillStyle = ERA1.silver;
      ctx.fillText(line.slice(0, take), 22, y);
      remaining -= Math.max(line.length, 1);
      y += 18;
    }
    if (this.caretOn() && this.rBootChars < this.rBootTotal) ui.px(ctx, 22, y, 7, 12, ERA1.silver);
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.grey;
    ctx.fillText(opening.o2_boot_footer, 22, H - 30);
    this.drawOpeningLeave(W, H);
  }

  /** small pixel objects for the profile grid — era-true, none are people */
  private drawProfileIcon(x: number, y: number, id: string): void {
    const p = (dx: number, dy: number, w: number, h: number, c: string): void =>
      ui.px(this.ctx, x + dx, y + dy, w, h, c);
    switch (id) {
      case 'star':
        p(10, 2, 4, 20, ERA1.tooltip); p(2, 10, 20, 4, ERA1.tooltip);
        p(5, 5, 3, 3, ERA1.tooltip); p(16, 5, 3, 3, ERA1.tooltip);
        p(5, 16, 3, 3, ERA1.tooltip); p(16, 16, 3, 3, ERA1.tooltip); break;
      case 'tape':
        p(2, 6, 20, 12, ERA1.beige); p(2, 6, 20, 2, ERA1.navy);
        p(6, 11, 4, 4, ERA1.black); p(14, 11, 4, 4, ERA1.black); break;
      case 'flower':
        p(10, 4, 4, 4, ERA1.warn); p(10, 16, 4, 4, ERA1.warn);
        p(4, 10, 4, 4, ERA1.warn); p(16, 10, 4, 4, ERA1.warn);
        p(10, 10, 4, 4, ERA1.tooltip); p(11, 16, 2, 6, ERA1.olive); break;
      case 'bird':
        p(6, 9, 12, 6, ERA1.titleBlue); p(13, 6, 6, 5, ERA1.titleBlue);
        p(18, 8, 4, 2, ERA1.warn); p(8, 10, 6, 3, ERA1.navy); p(2, 10, 5, 3, ERA1.titleBlue); break;
      case 'heart':
        p(5, 6, 6, 6, ERA1.warn); p(13, 6, 6, 6, ERA1.warn);
        p(6, 10, 12, 4, ERA1.warn); p(8, 13, 8, 3, ERA1.warn); p(10, 16, 4, 2, ERA1.warn); break;
      case 'moon': // a C-shaped crescent (open to the right)
        p(9, 2, 7, 3, ERA1.tooltip); p(6, 4, 4, 4, ERA1.tooltip);
        p(5, 8, 4, 6, ERA1.tooltip); p(6, 14, 4, 4, ERA1.tooltip);
        p(9, 17, 7, 3, ERA1.tooltip); break;
      default:
        p(4, 4, 16, 16, ERA1.silver);
    }
  }

  /** O3 — profile creation: name pre-filled, pick icon + 3 chips + 1 goal */
  private drawReinterpProfile(W: number, H: number): void {
    const { ctx } = this;
    ui.px(ctx, 0, 0, W, H, ERA1.teal);
    const wx = 26, wy = 12, ww = 460, wh = 360;
    const c = ui.windowFrame(ctx, wx, wy, ww, wh, opening.o3_window_title, true);
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.beige);
    const L = c.x + 8;

    // name — already filled in (they know it)
    ui.setFont(ctx, 13);
    ctx.fillStyle = ERA1.navy;
    ctx.fillText(`${opening.o3_name_label} ${ledger.name}`, L, c.y + 6);
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.grey;
    ctx.fillText(`(${opening.o3_name_note})`, L, c.y + 24);

    // icon grid
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(opening.o3_icon_prompt, L, c.y + 40);
    const icons = opening.o3_icons as { id: string; label: string }[];
    const cellW = 70, iconRowY = c.y + 54;
    icons.forEach((ic, i) => {
      const cellX = L + i * cellW;
      const boxX = cellX + 12, boxY = iconRowY, boxS = 40;
      ui.bevel(ctx, boxX, boxY, boxS, boxS, true);
      ui.px(ctx, boxX + 2, boxY + 2, boxS - 4, boxS - 4, ERA1.paper);
      this.drawProfileIcon(boxX + 8, boxY + 6, ic.id);
      if (this.profileIcon === ic.id) { // selection ring
        ui.px(ctx, boxX - 1, boxY - 1, boxS + 2, 2, ERA1.navy);
        ui.px(ctx, boxX - 1, boxY + boxS - 1, boxS + 2, 2, ERA1.navy);
        ui.px(ctx, boxX - 1, boxY - 1, 2, boxS + 2, ERA1.navy);
        ui.px(ctx, boxX + boxS - 1, boxY - 1, 2, boxS + 2, ERA1.navy);
      }
      this.hits.push({ x: boxX, y: boxY, w: boxS, h: boxS, id: `picon:${ic.id}` });
    });

    // chips — pick three
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(opening.o3_chip_prompt, L, c.y + 108);
    ui.setFont(ctx, 9);
    ctx.fillStyle = this.profileChips.length === 3 ? ERA1.ok : ERA1.grey;
    ctx.fillText(`(${opening.o3_chip_count}: ${this.profileChips.length}/3)`, L + 210, c.y + 108);
    const chips = opening.o3_chips as { id: string; label: string }[];
    const chipW = 142, chipH = 18, chipGap = 6;
    chips.forEach((ch, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const x = L + col * (chipW + chipGap);
      const y = c.y + 124 + row * (chipH + 4);
      const on = this.profileChips.includes(ch.id);
      ui.bevel(ctx, x, y, chipW, chipH, !on); // selected → sunken
      ui.setFont(ctx, 10);
      ctx.fillStyle = on ? ERA1.navy : ERA1.black;
      ctx.fillText(ch.label, x + 6, y + 4);
      this.hits.push({ x, y, w: chipW, h: chipH, id: `pchip:${ch.id}` });
    });

    // goal — insisted; no neutral option; declining files too
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(opening.o3_goal_prompt, L, c.y + 176);
    const goals = opening.o3_goals as { id: string; label: string }[];
    goals.forEach((g, i) => {
      const y = c.y + 192 + i * 18;
      const on = this.profileGoal === g.id;
      ui.px(ctx, L + 1, y + 1, 10, 10, ERA1.white);
      ui.px(ctx, L + 1, y + 1, 10, 1, ERA1.grey);
      ui.px(ctx, L + 1, y + 1, 1, 10, ERA1.grey);
      if (on) ui.px(ctx, L + 3, y + 3, 6, 6, ERA1.navy);
      ui.setFont(ctx, 10);
      ctx.fillStyle = ERA1.black;
      ctx.fillText(g.label, L + 18, y + 1);
      this.hits.push({ x: L, y, w: 260, h: 14, id: `pgoal:${g.id}` });
    });
    const declineY = c.y + 192 + goals.length * 18 + 2;
    ui.setFont(ctx, 9);
    ctx.fillStyle = this.profileGoal === 'declined' ? ERA1.navy : ERA1.grey;
    ctx.fillText(`— ${opening.o3_goal_decline}`, L + 18, declineY);
    this.hits.push({ x: L + 12, y: declineY - 2, w: 200, h: 14, id: 'pgoal:declined' });

    // confirm / leave
    const armed = this.profileIcon !== '' && this.profileChips.length === 3 && this.profileGoal !== '';
    ui.button(ctx, c.x + c.w - 92, c.y + c.h - 26, 84, 20, opening.o3_continue, {
      disabled: !armed, hover: this.hover === 'r-continue' && armed
    });
    if (armed) this.hits.push({ x: c.x + c.w - 92, y: c.y + c.h - 26, w: 84, h: 20, id: 'r-continue' });
    ui.button(ctx, c.x, c.y + c.h - 26, 64, 20, opening.o3_leave, { hover: this.hover === 'r-leave' });
    this.hits.push({ x: c.x, y: c.y + c.h - 26, w: 64, h: 20, id: 'r-leave' });
  }

  /** O3 close — the picks come back RE-CAPTIONED in the system's categories */
  private drawReinterpRecap(W: number, H: number): void {
    const { ctx } = this;
    ui.px(ctx, 0, 0, W, H, ERA1.teal);
    const wx = 46, wy = 20, ww = 420, wh = 344;
    const c = ui.windowFrame(ctx, wx, wy, ww, wh, opening.o3_recap_title, true);
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.paper);
    const L = c.x + 10;
    ui.setFont(ctx, 11);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(opening.o3_recap_intro, L, c.y + 8);

    const recap = opening.recaptions as {
      icon: Record<string, string>; chip: Record<string, string>; goal: Record<string, string>;
    };
    let y = c.y + 34;
    const section = (label: string): void => {
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.warnDark;
      ctx.fillText(label.toUpperCase(), L, y);
      y += 12;
    };
    const row = (line: string): void => {
      ui.setFont(ctx, 11);
      ctx.fillStyle = ERA1.black;
      ctx.fillText(`· ${line}`, L + 6, y);
      y += 16;
    };

    section(opening.o3_recap_icon_label);
    row(recap.icon[this.profileIcon] ?? this.profileIcon);
    y += 4;
    section(opening.o3_recap_chips_label);
    for (const ch of this.profileChips) row(recap.chip[ch] ?? ch);
    y += 4;
    section(opening.o3_recap_goal_label);
    row(recap.goal[this.profileGoal] ?? this.profileGoal);

    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.grey;
    ctx.fillText(opening.o3_recap_footer, L, c.y + c.h - 44);

    ui.button(ctx, c.x + c.w - 84, c.y + c.h - 26, 76, 20, opening.o3_recap_continue, {
      hover: this.hover === 'r-enter'
    });
    this.hits.push({ x: c.x + c.w - 84, y: c.y + c.h - 26, w: 76, h: 20, id: 'r-enter' });
    ui.button(ctx, c.x, c.y + c.h - 26, 64, 20, opening.o3_leave, { hover: this.hover === 'r-leave' });
    this.hits.push({ x: c.x, y: c.y + c.h - 26, w: 64, h: 20, id: 'r-leave' });
  }

  /** click routing for the reinterp opening beats (O2/O3) */
  private handleOpeningClick(id: string): void {
    if (id === 'r-leave') { this.leave(); return; }
    if (this.phase === 'r_boot') { this.startReinterpSplash(); return; } // any click skips the crawl
    if (this.phase === 'r_splash') { this.setPhase('r_profile'); return; } // …and the splash
    if (this.phase === 'r_profile') {
      if (id.startsWith('picon:')) {
        this.fileFirstProfileTouch();
        this.profileIcon = id.slice(6);
        this.emitOpeningProfile();
        this.dirty = true;
        return;
      }
      if (id.startsWith('pchip:')) {
        this.fileFirstProfileTouch();
        const c = id.slice(6);
        const i = this.profileChips.indexOf(c);
        if (i >= 0) this.profileChips.splice(i, 1);
        else if (this.profileChips.length < 3) this.profileChips.push(c);
        this.emitOpeningProfile();
        this.dirty = true; return;
      }
      if (id.startsWith('pgoal:')) {
        this.fileFirstProfileTouch();
        this.profileGoal = id.slice(6);
        this.emitOpeningProfile();
        this.dirty = true;
        return;
      }
      if (id === 'r-continue') this.commitProfile();
      return;
    }
    if (this.phase === 'r_recap' && id === 'r-enter') this.setPhase('desktop'); // identical routing
  }

  /**
   * FIND #5 (ERA_MINING R28): the FIRST filing lands within seconds of the
   * experience starting — the very first profile pick files immediately, not
   * batched at commitProfile. The most innocent click is already evidence;
   * the witness session log shows it later as its own line (intake.ts).
   */
  private fileFirstProfileTouch(): void {
    if (!ledger.records.includes('profile-initialized')) {
      ledger.records.push('profile-initialized');
    }
  }

  /** file the picks to the in-memory ledger, then show the re-captioning */
  private commitProfile(): void {
    if (this.profileIcon === '' || this.profileChips.length !== 3 || this.profileGoal === '') return;
    if (!this.profileFiled) {
      ledger.tags.push(`profile:icon:${this.profileIcon}`);
      for (const c of this.profileChips) ledger.tags.push(`profile:chip:${c}`);
      ledger.tags.push(`profile:goal:${this.profileGoal}`);
      this.profileFiled = true;
    }
    this.setPhase('r_recap');
  }

  // ── debug: jump between reinterp beats (dev panel; gated by ?debug=1) ────
  // Ported from the shipped build's debugJump grammar, scoped to the beats
  // this worktree's OS actually has. Never reachable without the flag.
  debugJump(beat: string): void {
    this.paused = false;
    switch (beat) {
      case 'off': this.setPhase('off'); break;
      case 'boot':
        ledger.name = opening.o3_prefilled_name;
        this.rBootChars = 0;
        this.setPhase('r_boot');
        break;
      case 'profile':
        ledger.name = opening.o3_prefilled_name;
        this.clearProfileTags();
        this.profileIcon = '';
        this.profileChips = [];
        this.profileGoal = '';
        this.profileFiled = false;
        this.setPhase('r_profile');
        break;
      case 'recap': {
        // the recap needs picks on file — fill from the real option sets
        const icons = opening.o3_icons as { id: string }[];
        const chips = opening.o3_chips as { id: string }[];
        const goals = opening.o3_goals as { id: string }[];
        if (this.profileIcon === '') this.profileIcon = icons[0]?.id ?? 'icon';
        while (this.profileChips.length < 3 && chips[this.profileChips.length]) {
          this.profileChips.push(chips[this.profileChips.length].id);
        }
        if (this.profileGoal === '') this.profileGoal = goals[0]?.id ?? 'declined';
        this.clearProfileTags();
        this.profileFiled = false;
        this.commitProfile();
        break;
      }
      case 'desktop': this.setPhase('desktop'); break;
      case 'kit': this.setPhase('desktop'); if (!this.kit) this.insertKit(); break;
      case 'packet': this.setPhase('desktop'); this.openPacket(); break;
      case 'diary': this.setPhase('desktop'); this.openDiary(); break;
      case 'diaryGlitch':
        this.setPhase('desktop');
        this.packet = null;
        this.diary = null;
        if (!ledger.records.includes('deletion-failed')) ledger.records.push('deletion-failed');
        if (!ledger.records.includes('diary-glitch')) ledger.records.push('diary-glitch');
        this.onGlitch?.('person');
        break;
      case 'pillow':
        this.setPhase('desktop');
        this.openProvotype(pillowProvotypeData as unknown as Provotype);
        break;
      case 'intake':
        this.setPhase('desktop');
        this.openProvotype(originIntakeProvotypeData as unknown as Provotype);
        break;
      case 'lambyRig':
        this.setPhase('desktop');
        this.openLambyRigFile();
        break;
      case 'update2': this.setPhase('desktop'); this.armUpdate('u2'); break;
      // S2R.0/S2R.1/S2R.2 review shortcuts (Session 34) — jump straight to a
      // sub-stage of the E2 arrival without driving the whole update ritual.
      case 'e2Silence':
        this.setPhase('desktop');
        this.setDesktopEra('e2');
        this.e2Stage = 'silence';
        this.e2StageT = 0;
        this.restorify = null;
        this.dirty = true;
        break;
      case 'e2Boot':
        // ⚑ S166: the WHOLE arrival — black, the POST, the crawl (silent), the
        // installer line, then the software's boot: Lamby's cartoon over the jingle.
        this.setPhase('desktop');
        this.setDesktopEra('e2');
        this.startE2Post();
        break;
      case 'e2Splash':
        // review only: the S116 CD-ROM splash, retired from play (S166)
        this.setPhase('desktop');
        this.setDesktopEra('e2');
        this.startE2Splash();
        break;
      case 'e2Cartoon':
        this.setPhase('desktop');
        this.setDesktopEra('e2');
        this.startE2Cartoon();
        break;
      case 'e2Crawl':
        this.setPhase('desktop');
        this.setDesktopEra('e2');
        this.startE2Boot();
        break;
      case 'e2Lamby':
        this.setPhase('desktop');
        this.setDesktopEra('e2');
        this.e2Stage = 'lambyIntro';
        this.e2StageT = 0;
        this.lambyPoseT = 0;
        this.dirty = true;
        break;
      case 'e2Program':
        this.setPhase('desktop');
        this.setDesktopEra('e2');
        this.e2Stage = 'lambyProgram';
        this.e2StageT = 0;
        this.lambyPoseT = 0;
        this.dirty = true;
        break;
      case 'e2Restorify':
        this.setPhase('desktop');
        this.setDesktopEra('e2');
        this.e2Stage = 'active';
        this.openRestorify();
        break;
      // Session 60 — the messenger seam (findings B7/B8): the message has
      // landed and Lamby is telling you about it. `messagePending` is set the
      // way the real path sets it, so "Not now" leaves the same unread
      // Messenger icon on the desktop that a played run would.
      case 'e2Message':
        this.setPhase('desktop');
        this.setDesktopEra('e2', true);
        this.e2Stage = 'active';
        this.restorify = null;
        this.calebOpenedThisSession = false;
        this.messagePending = true;
        this.messageNoticeShown = false;
        this.maybeAnnounceMessage();
        break;
      // the renamed dossier, opened directly — it is otherwise found only by
      // looking at an idle desktop, which is the point of it
      case 'foundFile':
        this.setPhase('desktop');
        this.unlockDossier();
        this.dossierOpen = true;
        break;
      // S2R.4 (Session 35) review shortcuts — the video offer and the player
      // itself, without hand-driving a real check-in first.
      case 'netvisionOffer':
        this.setPhase('desktop');
        this.setDesktopEra('e2');
        this.e2Stage = 'active';
        this.openRestorify();
        this.netvisionOfferedThisSession = false;
        this.netvisionOfferOpen = true;
        break;
      case 'netvision':
        this.setPhase('desktop');
        this.setDesktopEra('e2');
        this.e2Stage = 'active';
        this.netvisionOfferOpen = false;
        this.openNetVision();
        break;
      case 'netvisionBreak':
        this.setPhase('desktop');
        this.setDesktopEra('e2');
        this.e2Stage = 'active';
        this.netvisionOfferOpen = false;
        this.openNetVision();
        // S58 fix: this used to seek to `duration - 3` (111s at the current
        // 114s runtime) — past the break's start (100.3s) and deep into the
        // tear, so the debug jump never showed what it was named for. Land ON
        // the break instead, deriving it the same way netvision.ts's own
        // `breakStart` does (the scene flagged `break: true` — the song's
        // first "Call now"), so the two can never drift apart.
        this.netvision?.debugSeek(
          mediaStrings.scenes.find((s) => s.break)?.at ?? mediaStrings.duration - 3
        );
        break;
      case 'netvisionStatic':
        this.setPhase('desktop');
        this.setDesktopEra('e2');
        this.e2Stage = 'active';
        this.netvisionOfferOpen = false;
        this.openNetVision();
        this.netvision?.debugSeek(mediaStrings.duration);
        break;
      // S2R.3–S2R.6 (Session 45) review shortcuts. Each one drives the REAL
      // path (the same chips file, the same acts fire) — it only skips the
      // waiting. `src/debug/panel.ts` was outside this session's file fence,
      // so these have no buttons yet: reach them with
      // `window.__os.debugJump('calebChat')` under ?debug=1.
      case 'calebChat':
        this.setPhase('desktop');
        this.setDesktopEra('e2', true);
        this.e2Stage = 'active';
        this.calebOpenedThisSession = true;
        this.openCaleb();
        break;
      case 'calebCommit':
        this.debugJump('calebChat');
        this.caleb?.debugFastForwardToCommit();
        break;
      case 'calebAlert':
        this.debugJump('calebCommit');
        this.caleb?.debugCommit();
        this.openAccountabilityAlert();
        break;
      case 'calebSad':
        this.debugJump('calebAlert');
        this.caleb?.debugSealNow();
        this.accountability?.debugStep('sad');
        break;
      case 'calebCaught':
        this.debugJump('calebAlert');
        this.caleb?.debugSealNow();
        this.accountability?.debugStep('caught');
        break;
      case 'calebMail':
        this.debugJump('calebAlert');
        this.caleb?.debugSealNow();
        this.accountability?.debugStep('caught');
        this.accountability?.openMail();
        break;
      case 'calebResidue':
        this.debugJump('calebChat');
        this.caleb?.debugFastForwardToCommit();
        this.caleb?.debugResidue();
        break;
      case 'update3': this.setPhase('desktop'); this.armUpdate('u3'); break;
      // S2R.7: the dispersal lives inside u3's INSTALL screen, several clicks
      // and ~40s of deferral deep into the ritual — this lands on it directly
      // so the beat can be reviewed without playing the notice and the terms
      // through every time. Review only; play always takes the long way.
      case 'u3Dispersal':
        this.debugJump('update3');
        this.updateApp?.debugSkipToInstall();
        break;
      // ⚑ S76 — THE LAST UPDATE. In play it arms itself when the correction
      // list is exhausted and it draws on VERA'S LAPTOP, so this button is only
      // useful with the room at E3 (the panel's own era jump) — it arms the
      // ritual, it does not decide where the ritual appears.
      case 'update4': this.setPhase('desktop'); this.armUpdate('u4'); break;
      // E4's two shell states. The ROOM does not follow these (no OS beat has
      // ever moved the room — that is the panel's era jump, which calls
      // app.ts's morph and lands you in Maya's seat); they set what the era's
      // one surface is showing.
      // ⚑ S123 — the browser: the era's boot and its chrome. `e4Browser` is the
      // LINEAR ENTRY (it is what the era opens on); `e4BrowserSearch` lands on
      // the search tab directly, which is the surface that carries the era's
      // one piece of pure evidence.
      case 'e4Browser':
        this.setPhase('desktop'); this.setDesktopEra('e4');
        this.e4 = this.newE4Shell();
        this.e4.beginSession(0.6);
        // ⚑ 2026-09-12: the browser has its real home (the monitor) and the lid
        //   is L's console; the review route no longer borrows the lid.
        break;
      case 'e4BrowserSearch':
        this.debugJump('e4Browser');
        this.e4?.browser.debugJumpTo('search');
        break;
      case 'e4Standby':
        this.setPhase('desktop');
        this.setDesktopEra('e4');
        this.e4 = this.newE4Shell(); // back to the device untouched, for re-review
        break;
      case 'e4Place':
        this.setPhase('desktop');
        this.setDesktopEra('e4');
        // ⚑ S119 — the laptop opening (2026-09-01) made `wear()` refuse until
        // L has finished on the machine, and this route was never updated, so
        // for five days EVERY E4 panel button landed on the closed laptop. See
        // `space.ts debugSkipLaptop`.
        this.e4?.debugSkipLaptop();
        this.e4?.wear();
        break;
      // ⚑ S77 — L'S CONVERSATION, one button per beat (C6: three sessions have
      // now shipped beats Sérgio could not reach and concluded content was
      // missing when it wasn't). In PLAY there is nothing to jump to: the
      // conversation runs forward from the one touch by ordinary clicking, and
      // `e4L` below is that same linear entry. The rest land on a unit with the
      // record filled in as if the ones before had played.
      case 'e4L': this.debugJump('e4Place'); break;
      case 'e4Captions': this.e4Voice('u2_room'); break;
      case 'e4Unplaced': this.e4Voice('u3_unplaced'); break;
      case 'e4Deadname': this.e4Voice('u4_name_one'); break;
      // ⚑ S120 (P4) — the friction beat is no longer one of L's units: it is the
      // last thing the apparatus asks before the ball, and it lives in the
      // offers now. Same text, same chips, same audio names.
      case 'e4Friction': this.e4Offer('friction'); break;
      case 'e4Deadname2': this.e4Voice('u6_name_two'); break;
      case 'e4Shrink': this.e4Voice('u7_shrink_one'); break;
      case 'e4Shrink2': this.e4Voice('u8_shrink_two'); break;
      case 'e4Narrowed': this.e4Voice('u9_narrowed'); break;
      case 'e4Returns': this.e4Voice('u10_returns'); break;
      // …and the chips of whichever unit is on screen, without waiting the
      // lines out. The shrinking choice is a thing you look AT, so a reviewer
      // needs to be able to sit in front of a chip set.
      case 'e4Chips': this.e4?.voice.debugToChips(); break;
      // ⚑ S78 — THE OFFERS. In PLAY there is nothing to jump to: L's last chip
      // hands over and the whole sequence runs forward by ordinary clicking
      // (`e4Offers` below is that same linear entry — it is L's unit u10, whose
      // second chip starts it). The rest land on one beat directly.
      case 'e4Offers': this.e4Voice('u10_returns'); break;
      case 'e4Memory': this.e4Offer('m1'); break;
      case 'e4MemoryAB': this.e4Offer('m1'); this.e4?.offers.debugToggleEnhanced(); break;
      case 'e4Memory2': this.e4Offer('m2'); break;
      case 'e4Wall': this.e4Offer('wall'); break;
      case 'e4Curation': this.e4Offer('curation'); break;
      case 'e4Pause': this.e4Offer('pause'); break;
      // ⚑ S119 — the beat after the ball: L comes back and cannot process what
      // it just heard. Reached in play only by sitting through the whole ball,
      // so it needs a route of its own or nobody will ever look at it.
      case 'e4BallShots': this.e4Offer('ballshots'); break;
      case 'e4PauseChips': this.e4Offer('pause'); this.e4?.offers.debugToChips(); break;
      case 'e4Glitch': this.e4Offer('glitch'); break;
      case 'e4Cyclorama': this.e4Offer('cyclorama'); break;
      case 'e4Panels': this.e4Offer('panels'); break;
      // ⚑ S79 — THE BALL. `e4Ball` is the LINEAR ENTRY: it puts the beat where
      // `E4Offers.onBreak` puts it in play (the careful pause has just ended,
      // L has stopped talking, and something is coming in from the other side
      // of the building) and everything else runs forward on its own from
      // there, with nothing to press until the categories are over.
      // ⚑ The ROOM's light follows these; the visor does not, because the ball
      // is not on the visor and never will be.
      case 'e4Invite': this.e4BallJump('invited'); break;   // S133: Junie's card, Go in
      case 'e4Ball': this.e4BallJump('arrival'); break;
      case 'e4NoCategory': this.e4BallJump('noCategory'); break;
      case 'e4BallOpen': this.e4BallJump('ball'); break;
      case 'e4BallCat1': this.e4BallJump('category', 0); break;
      case 'e4BallCat2': this.e4BallJump('category', 1); break;
      case 'e4BallCat3': this.e4BallJump('category', 2); break;
      case 'e4BallCat4': this.e4BallJump('category', 3); break;
      case 'e4BallAfter': this.e4BallJump('after'); break;
      case 'closeUpdate': this.setPhase('desktop'); this.armUpdate('close'); break;
      case 'send-s1': this.setPhase('desktop'); this.offerSend('s1'); break;
      case 'send-s2': this.setPhase('desktop'); this.offerSend('s2'); break;
      case 'send-s3': this.setPhase('desktop'); this.offerSend('s3'); break;
      case 'send-s4': this.setPhase('desktop'); this.offerSend('s4'); break;
    }
    this.dirty = true;
  }

  /** ⚑ S77 review helper: put the device on (so the era's surface is the place,
   *  not the standby glass) and land L on one unit. Never reachable in play. */
  private e4Voice(unitId: string): void {
    this.debugJump('e4Place');
    this.e4?.voice.debugJumpTo(unitId);
  }

  /** ⚑ S78 review helper: the device on, L silent (the offers only run once the
   *  conversation is over), and the offers landed on one beat. Never in play. */
  /**
   * ⚑ THE CLOSE ARRIVES AS AN UPDATE, on her own machine (Sérgio, 2026-09-01).
   *   It is armed through exactly the same door the other four updates use —
   *   nothing bespoke about the ending — and accepted on the spot (S101).
   * ⚑ 2026-09-13: ONE constructor, because the review routes (`e4Browser`,
   *   `e4Standby`) built their own shells WITHOUT this hook, so an Era 4 begun
   *   from the panel's first button ran to the termination and then nothing:
   *   the device stopped, both screens died, and the Close never came. Found
   *   by the tour (tools/tour-e4.mjs), which starts from that button.
   */
  /** ⚑ S150 — the Close's era buttons lead back to a ROOM (OPEN_ITEMS R3-113):
   *  Era 4's shell after the Close is a stopped device with a failed browser and
   *  cannot be re-entered (`beginSession` is a no-op past `dormant`), which is
   *  the black screen Sérgio pressed Maya into. A fresh shell, the device
   *  untouched, as the review's own `e4Standby` jump makes it. */
  resetE4ForReturn(): void {
    if (this.desktopEra !== 'e4') return;
    this.e4 = this.newE4Shell();
    this.dirty = true;
  }

  private newE4Shell(): E4Shell {
    const sh = new E4Shell();
    sh.onCloseRequest = () => { this.armUpdate('close'); this.updateApp?.acceptNow(); };
    return sh;
  }

  private e4Offer(stage: string): void {
    this.debugJump('e4Place');
    this.e4?.voice.debugFinish();
    this.e4?.offers.debugJumpTo(stage);
  }

  /**
   * ⚑ S79 review helper: the device on, L finished, and the offers parked at
   * the BREAK — which is exactly where they are when the ball runs in play, and
   * which matters for more than tidiness: the ball hands back by calling
   * `resumeAfterBreak()`, so a review jump that skipped the hold would end the
   * ball into nothing and the era's finale would never play. Never in play.
   */
  private e4BallJump(where: 'invited' | 'arrival' | 'noCategory' | 'ball' | 'category' | 'after', index = 0): void {
    this.debugJump('e4Place');
    this.e4?.voice.debugFinish();
    this.e4?.offers.debugHoldForBreak();
    this.e4?.ball.debugJumpTo(where, index);
  }

  // ── input ──────────────────────────────────────────────────────────────
  handleMove(x: number, y: number): void {
    if (this.phase === 'desktop' && this.netvision?.open) { this.netvision.handleMove(x, y); return; }
    if (this.phase === 'desktop' && this.accountability?.modal) { this.accountability.handleMove(x, y); return; }
    if (this.phase === 'desktop' && this.caleb?.open) { this.caleb.handleMove(x, y); return; }
    if (this.phase === 'desktop' && this.provotype?.open) { this.provotype.handleMove(x, y); return; }
    if (this.phase === 'desktop' && this.web?.open) { this.web.handleMove(x, y); this.dirty = true; return; }
    if (this.phase === 'desktop' && this.testimony?.open) { this.testimony.handleMove(x, y); if (this.testimony.dirty) this.dirty = true; return; }
    if (this.phase === 'desktop' && this.forum?.open) { this.forum.handleMove(x, y); this.dirty = true; return; }
    if (this.phase === 'desktop' && this.lambyRigFile?.open) { this.lambyRigFile.handleMove(x, y); return; }
    if (this.phase === 'desktop' && this.restorify?.open) { this.restorify.handleMove(x, y); return; }
    const hit = this.hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    const id = hit ? hit.id : '';
    if (id !== this.hover) { this.hover = id; this.dirty = true; }
  }

  handleClick(x: number, y: number): void {
    this.idleSeconds = 0;   // S194 — the helpers wait for quiet
    const hit = this.hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (this.paused) {
      if (hit?.id === 'resume') this.paused = false;
      if (hit?.id === 'pleave') this.leave();
      this.dirty = true;
      return;
    }
    if (this.phase === 'off') { // any click on the dark glass = the switch
      this.powerOn();
      return;
    }
    // reinterp opening beats (O2/O3) own the monitor's clicks
    if (this.phase === 'r_boot' || this.phase === 'r_splash' || this.phase === 'r_profile' || this.phase === 'r_recap') {
      this.handleOpeningClick(hit ? hit.id : '');
      return;
    }
    // the update ritual is SYSTEM-modal while visible — it owns every click
    if (this.phase === 'desktop' && this.updateApp?.open && this.updateApp.visible) {
      this.updateApp.handleClick(x, y);
      this.dirty = true;
      return;
    }
    // ⚑ S76 — E4's shell owns every press on this surface, because it IS the
    // surface. Closed: any press on the dark glass is THE ONE TOUCH (S1.0's
    // power-press grammar). Worn: nothing is pressable yet, and a press falls
    // through to nothing rather than to a desktop that does not exist. S77's
    // chips land inside `E4Shell.handleClick`.
    if (this.phase === 'desktop' && this.desktopEra === 'e4' && this.e4) {
      this.e4.handleClick(x, y);
      this.dirty = true;
      return;
    }
    // S2R.0/S2R.1: the E2 arrival owns every click until it settles — the
    // silence advances on ANY press (the return press, S1.0-power-press
    // grammar), the boot beat is not clickable through (it resolves on its
    // own), and the greeting's own two chips are hit-tested normally.
    if (this.phase === 'desktop' && this.desktopEra === 'e2' && this.e2Stage !== 'active') {
      this.handleE2ArrivalClick(hit ? hit.id : '');
      return;
    }
    // ⚑ S186 — the picture Rob sent owns the screen while it is open: only its close box answers
    if (this.phase === 'desktop' && this.pauseOpen) {   // S207 — the pause owns the screen until it is closed
      if (hit?.id === 'pause-close') { this.pauseOpen = null; this.dirty = true; }
      return;
    }
    if (this.phase === 'desktop' && this.yesOpen) {
      if (hit?.id === 'yes-close') { this.yesOpen = false; this.irc?.imageClosed(); }
      this.dirty = true;
      return;
    }
    // the taskbar is CHROME: it sits outside every window, so its own hit is
    // asked before the window routing below (which returns unconditionally and
    // would otherwise swallow a press meant for the bar). Finding E20.
    if (this.phase === 'desktop' && hit?.id === 'taskbar-guide') {
      this.guideTipPinned = !this.guideTipPinned; this.guideTipAt = -1;
      this.dirty = true;
      return;
    }
    if (this.phase === 'desktop' && hit?.id === 'taskbar-message') {
      this.accountability?.pingStamp();
      this.dirty = true;
      return;
    }
    // …and Caleb's corner toast, for the same reason: it is drawn over every
    // window, so it is asked before them (finding E20/D17).
    if (this.phase === 'desktop' && this.caleb?.pressToastAt(x, y)) {
      this.dirty = true;
      return;
    }
    // S165 / W-E2: the topmost window's minimise box, before the windows take the
    //   click — only a keyed frame has one, and only the frame on top is asked
    if (this.phase === 'desktop') {
      const top = ui.topFrameAt(x, y);
      const mb = top?.minBox;
      if (top?.key && mb && x >= mb.x && x <= mb.x + mb.w && y >= mb.y && y <= mb.y + mb.h) {
        this.minimiseWindow(top.key);
        return;
      }
      // …and the taskbar's window buttons, which no window covers
      if (hit && hit.id.startsWith('taskbar-') && this.windowOf(hit.id.slice(8))) {
        const key = hit.id.slice(8);
        if (this.windowOpen(key)) this.minimiseWindow(key); else this.restoreWindow(key);
        return;
      }
    }
    // S2R.6: the residue owns the whole monitor while it is up
    if (this.phase === 'desktop' && this.caleb?.ownsScreen) { this.caleb.handleClick(x, y); return; }
    // S2R.4: the video player, then Lamby's offer — both own every click
    // while present, ahead of Restorify sitting underneath either of them.
    if (this.phase === 'desktop' && this.netvision?.open) { this.netvision.handleClick(x, y); return; }
    // finding B8: his notice owns the desktop's clicks while it is up (both
    // answers work; neither is a trap door out of the era)
    if (this.phase === 'desktop' && this.messageNoticeOpen) {
      this.handleMessageNoticeClick(hit ? hit.id : '');
      return;
    }
    if (this.phase === 'desktop' && this.netvisionOfferOpen) {
      this.handleNetvisionOfferClick(hit ? hit.id : '');
      return;
    }
    // S2R.3: the apparatus's intrusion sits over the conversation, so it is
    // asked first; the chat's own chips answer underneath it.
    if (this.phase === 'desktop' && this.accountability?.modal) { this.accountability.handleClick(x, y); return; }
    // S157: a program starting takes no press; the player, on top of the messenger, takes its own
    if (this.phase === 'desktop' && this.programSplash) return;
    if (this.phase === 'desktop' && this.mediaPlayer?.open) { this.mediaPlayer.handleClick(x, y); return; }
    if (this.phase === 'desktop' && this.caleb?.open) { this.caleb.handleClick(x, y); return; }
    // the provotype is modal while open — it owns the desktop's clicks
    if (this.phase === 'desktop' && this.provotype?.open) { this.provotype.handleClick(x, y); return; }
    // S55 — lamby_rig.exe is modal while open, same pattern as the provotype
    if (this.phase === 'desktop' && this.lambyRigFile?.open) { this.lambyRigFile.handleClick(x, y); return; }
    if (this.phase === 'desktop' && this.rootCause?.open) { this.rootCause.handleClick(x, y); return; }
    if (this.phase === 'desktop' && this.diary?.open) { this.diary.press(); return; }
    if (this.phase === 'desktop' && this.packet?.open) { this.packet.handleClick(x, y); return; }
    // ⚑ S199 — the browsers are windows over the desktop: asked AFTER the modal windows that draw above them
    //   (the exercise, the rig, the game, the diary, the packet — a walk stuck there when this came first) and
    //   BEFORE Restorify and the desktop's own icons, which sit under their left columns
    if (this.phase === 'desktop' && this.web?.open) { this.web.handleClick(x, y); this.dirty = true; return; }
    if (this.phase === 'desktop' && this.testimony?.open) { this.testimony.handleClick(x, y); this.dirty = true; return; }
    if (this.phase === 'desktop' && this.forum?.open) { this.forum.handleClick(x, y); this.dirty = true; if (!this.forum.open) this.wayBack('e2'); return; }   // S207: closed → the way back
    if (this.phase === 'desktop' && this.restorify?.open) { this.restorify.handleClick(x, y); return; }
    if (hit) {
      switch (hit.id) {
        case 'continue': this.setPhase('off'); break;
        case 'leave': this.leave(); break;
        case 'ok': this.confirmName(); break;
        case 'icon-a': this.insertKit(); break;
        // (the taskbar's window buttons are resolved above, before the windows take the click — S165)
        case 'icon-irc': if (this.irc) this.irc.open = true; break;
        case 'icon-found-file': this.dossierOpen = true; break;
        case 'found-file-close': this.dossierOpen = false; break;
        case 'icon-your-file': this.yourFileOpen = true; this.yourFileSeen = true; break;
        case 'icon-story': this.openTestimony(); break;   // S205
        case 'icon-forum': this.openForum(); break;
        case 'your-file-close': this.yourFileOpen = false; this.wayBack('e2'); break;   // S207
        case 'icon-messenger': this.openMessenger(); break;
        case 'icon-provotype': this.openProvotype(pillowProvotypeData as unknown as Provotype); break;
        case 'icon-provotype-intake': this.openProvotype(originIntakeProvotypeData as unknown as Provotype); break;
        case 'icon-lambyrig': this.openLambyRigFile(); break;
        case 'icon-rootcause': this.openRootCause(); break;
        case 'icon-era-0':
        case 'icon-era-1': this.toast = { text: this.eraSkin().status, t: 5 }; break;
        case 'icon-restorify': this.openRestorify(); break;
        case 'icon-send':
          if (this.sendOffer) { this.sendOffer.open = true; this.toast = null; this.sendOfferVersion++; }
          break;
        case 'send-go': this.resolveSend('visited'); break;
        case 'send-decline': this.resolveSend('declined'); break;
      }
      this.dirty = true;
      return;
    }
    if (this.phase === 'desktop' && this.kit?.open) { this.kit.handleClick(x, y); return; }
    if (this.phase === 'desktop' && this.irc?.open) this.irc.handleClick(x, y);
  }

  handleKey(key: string): boolean {
    if (key === 'Escape') {
      if (this.phase === 'desktop' || this.phase === 'name'
          || this.phase === 'r_boot' || this.phase === 'r_splash' || this.phase === 'r_profile' || this.phase === 'r_recap') {
        this.paused = !this.paused;
        this.dirty = true;
        return true;
      }
      return false;
    }
    if (this.paused) return true;

    if (this.phase === 'r_boot' && key === 'Enter') { this.startReinterpSplash(); return true; }
    if (this.phase === 'r_splash' && key === 'Enter') { this.setPhase('r_profile'); return true; }

    if (this.phase === 'warning' && key === 'Enter' && this.phaseT >= WARNING_ARM_DELAY) {
      this.setPhase('off');
      return true;
    }
    if (this.phase === 'off' && key === 'Enter') {
      this.powerOn();
      return true;
    }
    if (this.phase === 'splash' && key === 'Enter') { // skippable
      this.setPhase('name');
      return true;
    }
    if (this.phase === 'name' && !this.greeting) {
      if (key === 'Enter') { this.confirmName(); return true; }
      if (key === 'Backspace') { this.nameInput = this.nameInput.slice(0, -1); this.dirty = true; return true; }
      if (key.length === 1 && this.nameInput.length < 24) { this.nameInput += key; this.dirty = true; return true; }
    }
    if (this.phase === 'desktop' && this.kit?.open) {
      if (key === 'Enter') { this.kit.advance(); return true; }
      return key.length === 1; // reading, not typing — swallow strays
    }
    if (this.phase === 'desktop' && this.diary?.open) {
      if (key === 'Enter') { this.diary.press(); return true; }
      return key.length === 1;
    }
    if (this.phase === 'desktop' && this.packet?.open) {
      if (key === 'Enter') return true; // click/tap OK; no keyboard dependency
      return key.length === 1;
    }
    // the IRC is lurk-only + press-only now (main-parity): no free typing
    // anywhere (VR: no keyboard dependency). Swallow strays while it's open so
    // camera shortcuts never fire mid-read; the reply is a click, not a key.
    if (this.phase === 'desktop' && this.irc?.open) {
      return key.length === 1;
    }
    return false;
  }

  private confirmName(): void {
    const trimmed = this.nameInput.trim();
    if (!trimmed) return;
    ledger.name = trimmed; // memory only — see ledger.ts invariants
    this.greeting = true;
    this.phaseT = 0;
    this.dirty = true;
  }

  private leave(): void {
    wipeLedger();
    this.stopReadAloud(); // the voice does not outlive the session (S60)
    this.paused = false;
    this.setPhase('left');
    this.onLeave?.();
  }

  /** external Leave — the reinterp O1 start-screen overlay lives outside the
   *  monitor canvas, so it drives the wipe/exit through here (rail: Leave
   *  works from the disclaimer onward). */
  leaveNow(): void { this.leave(); }
}
