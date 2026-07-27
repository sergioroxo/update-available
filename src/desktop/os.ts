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
import { IrcApp } from './apps/irc';
import { KitApp } from './apps/kit';
import { PacketApp } from './apps/packet';
import { DiaryApp } from './apps/diary';
import { ProvotypeApp, type Provotype } from './apps/provotype';
import { UpdateApp, type UpdateKey } from './apps/update';
import { RestorifyApp } from './apps/restorify';
import { NetVisionPlayerApp } from './apps/netvision';
import { CalebThreadApp } from './apps/caleb';
import { AccountabilityApp } from './apps/accountability';
import { LambyRigFileApp } from './apps/lambyRigFile';
// ONE Lamby (see src/desktop/apps/lambyChar.ts's header — that module is the
// single definition, shared with ?lambyrig=1). His debut draws the CHARACTER,
// not the little blocky mark this file used to carry: a conductor introducing
// himself by name should be the same creature the rest of the era shows.
import { drawLambyChar, type LambyAction } from './apps/lambyChar';
// the boot jingle hook — an unregistered name is never requested (registry law
// in that module's header), so this is silent and error-free until an asset lands
import { playOnce } from '../audio/tapeAudio';
import { GuideThread } from '../narrative/guide';
import { BelongingsSystem } from '../narrative/belongings';
import sendsData from '../../data/sends.json';
import { ledger, wipeLedger } from '../state/ledger';
import strings from '../../data/strings/slice.json';
import reinterpStrings from '../../data/strings/reinterp.json';
import opening from '../../data/strings/opening.json';
import lambyStrings from '../../data/dialog/s2_lamby.json';
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
type E2Stage = 'silence' | 'osBoot' | 'lambyBoot' | 'lambyIntro' | 'lambyProgram' | 'active';
const E2_BOOT_HOLD = 2.2;   // s — hold the completed LambyOS 2003 crawl before the installer line
const LAMBY_BOOT_HOLD = 1.6; // s — the "finishing installation…" beat's hold
/** S2R.5: s of ordinary desktop between the video beat ending and the
 *  PureMail envelope. The collapse is triggered by the apparatus's own
 *  documented failure, never by the player — the delay is only pacing. */
const PUREMAIL_DELAY = 2.4;

// The shipped opening (warning→off→boot→splash→name→desktop) is UNTOUCHED.
// Behind ?reinterp=1 the four r_* phases REPLACE it (OPENING_AND_FLOW_SPEC
// §1, O1–O3): O1 (start screen) is a DOM overlay owned by the engine while the
// monitor sits in `r_dark`; O2 boot + O3 profile/recap render on the monitor.
type Phase =
  | 'warning' | 'off' | 'boot' | 'splash' | 'name' | 'desktop' | 'left'
  | 'r_dark' | 'r_boot' | 'r_profile' | 'r_recap';
type DesktopEra = 'e1' | 'e2' | 'e3' | 'e4';

const SPLASH_SECONDS = 4.6;        // hold the loading screen long enough to read
const BOOT_CPS = 0.030;            // seconds per char — slower BIOS crawl
const BOOT_HOLD = 4.8;             // hold completed BIOS so the install lines read
const R_BOOT_HOLD = 3.2;           // hold the LambyOS boot after the crawl completes

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
  /** the era-update ritual (spine-armed; never player-triggered) */
  updateApp: UpdateApp | null = null;
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
  /** a live send OFFER (master script §4) — icon + summons window on the desktop */
  private sendOffer: { id: string; open: boolean } | null = null;
  /** engine listens: the update restart landed — morph the space to `era` */
  onEraShift?: (era: string) => void;
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
  /** engine listens: pulse the flip affordance when the hook lands */
  onFlipReady?: () => void;
  /** engine listens: user chose LEAVE */
  onLeave?: () => void;
  /** engine listens: hide the physical floppy once it is in the drive */
  onKitInserted?: () => void;
  /** engine listens: mirror O3's live selections onto the rear cork/record plane */
  onOpeningProfileChange?: (snapshot: OpeningProfileSnapshot) => void;
  /** engine listens: a soft full-frame glitch — warm for the person's breakout */
  onGlitch?: (kind: 'person' | 'system') => void;

  constructor(options: DesktopOSOptions = {}) {
    this.reinterp = options.reinterp === true;
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
      this.guide = new GuideThread(this);
      this.belongings = new BelongingsSystem();
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
  }

  /** S1.0 power-on beat: the machine waits dark until the player acts */
  get isOff(): boolean {
    return this.phase === 'off';
  }

  powerOn(): void {
    if (this.phase === 'off') this.setPhase('boot');
  }

  /** S1.2 — the disk goes in (3D floppy click, or the A:\ icon) */
  insertKit(): void {
    if (this.phase !== 'desktop' || this.kit) return;
    this.kit = new KitApp();
    this.toast = null;
    if (!ledger.records.includes('kit-inserted')) ledger.records.push('kit-inserted');
    this.onKitInserted?.();
    this.kit.onConnect = () => {
      // S1.4 — the kit's last step is the channel it chose for you
      if (!ledger.records.includes('went-online')) ledger.records.push('went-online');
      this.irc = new IrcApp();
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
  private openProvotype(data: Provotype): void {
    if (!this.reinterp || this.provotype) return;
    this.provotype = new ProvotypeApp(data);
    this.provotype.onClose = () => { this.provotype = null; this.dirty = true; };
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
      && !this.provotype && !this.lambyRigFile;
  }

  /** the same idea, era-wide (Session 60): NOTHING is open — no window, no
   *  conduction, no ritual. The found file (the renamed dossier) is drawn only
   *  here, which is what makes "never reachable during a felt scene" a
   *  property of the code rather than a promise: the felt surfaces (the
   *  Messenger, the residue) are windows, and a window means not idle. */
  private desktopIdle(): boolean {
    return this.e1DesktopIdle()
      && !this.dossierOpen
      && !this.restorify?.open && !this.caleb && !this.accountability
      && !this.netvision && !this.netvisionOfferOpen && !this.messageNoticeOpen
      && !this.updateApp && !this.sendOffer?.open;
  }

  /** S55 — opens the found file. Never rewarded (no toast, no assistant
   *  remark); filed to the ledger like any other one-off act, and only ever
   *  once per session (a second open is not a second "discovery"). */
  private openLambyRigFile(): void {
    if (!this.reinterp || this.lambyRigFile) return;
    this.lambyRigFile = new LambyRigFileApp();
    this.lambyRigFile.onClose = () => { this.lambyRigFile = null; this.dirty = true; };
    if (!ledger.records.includes('lamby-rig-opened')) ledger.records.push('lamby-rig-opened');
    this.dirty = true;
  }

  /** ARM an era update (the spine calls this on a documented failure —
   *  never the player; SCRIPT_UPDATE v0.5 §1). Modal over the desktop. */
  armUpdate(key: UpdateKey): void {
    if (!this.reinterp || this.updateApp) return;
    this.updateApp = new UpdateApp(key);
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
      this.updateApp.onRemindLaterUsed = () => belongings.openWindow(p);
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
    const entering = this.desktopEra !== era;
    this.desktopEra = era;
    this.retireEra1Windows();
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
    this.sendOffer = null;
    this.dossierOpen = false;
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
      this.startE2Boot();
      return;
    }
    if (this.e2Stage === 'osBoot') {
      // same courtesy the O2 crawl gives: a press completes the typing. It
      // does NOT skip the beat — the boot still holds and resolves on its own.
      this.e2BootChars = this.e2BootTotal;
      this.dirty = true;
      return;
    }
    if (this.e2Stage === 'lambyBoot') return; // the beat resolves on its own (no click-through)
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
  private startE2Boot(): void {
    this.e2Stage = 'osBoot';
    this.e2StageT = 0;
    this.e2BootChars = 0;
    this.e2BootDoneAt = Infinity;
    playOnce(lambyStrings.osBootTrack);
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
      this.restorify.onCheckinFiled = () => this.maybeLandMessage();
      this.restorify.onCheckinAcknowledged = () => this.maybeAnnounceMessage();
    }
    this.restorify.open = true;
    this.dirty = true;
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
    if (ledger.checkins.length !== 1) return;
    this.messagePending = true;
    this.dirty = true;
  }

  /** …and THEN he tells you (one conduction beat, two lines, both answers
   *  work). Only ever on the ordinary desktop — never over a felt window. */
  private maybeAnnounceMessage(): void {
    if (!this.messagePending || this.messageNoticeShown) return;
    if (this.caleb) return; // the person's window is already open: nothing to announce
    this.messageNoticeShown = true;
    this.messageNoticeOpen = true;
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
    thread.onCommit = () => this.openAccountabilityAlert();
    thread.onThreadDone = () => {
      this.caleb = null;
      this.accountability = null;
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
      this.dirty = true;
    };
    this.dirty = true;
  }

  private handleNetvisionOfferClick(id: string): void {
    if (id === 'netvision-watch') {
      this.netvisionOfferOpen = false;
      this.openNetVision();
      return;
    }
    if (id === 'netvision-notnow') {
      this.netvisionOfferOpen = false;
      ledger.media.push({ id: 'offer', outcome: 'declined', witness: lambyStrings.videoOfferDeclined });
      if (this.caleb) this.pureMailAt = this.t + PUREMAIL_DELAY;
      this.dirty = true;
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
    ui.button(ctx, c.x + 8, by, 96, 18, lambyStrings.videoOfferNotNow, { hover: this.hover === 'netvision-notnow' });
    this.hits.push({ x: c.x + c.w - 86, y: by, w: 78, h: 18, id: 'netvision-watch' });
    this.hits.push({ x: c.x + 8, y: by, w: 96, h: 18, id: 'netvision-notnow' });
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
  }

  /** The spine reads this as "hold your breath" (src/narrative/spine.ts). It
   *  now covers a live summons OR a modal narrative beat: a send offer must
   *  never surface on top of S2R.3's felt window, and u3 must not arm while
   *  the Caleb thread is still running. */
  get sendOfferPending(): boolean {
    return this.sendOffer !== null || this.caleb !== null;
  }

  private resolveSend(outcome: 'visited' | 'declined'): void {
    if (!this.sendOffer) return;
    const id = this.sendOffer.id;
    this.sendOffer = null;
    this.dirty = true;
    this.onSendResolve?.(id, outcome);
  }

  private drawSendOffer(W: number, H: number): void {
    if (!this.sendOffer) return;
    const def = (sendsData as unknown as {
      sends: { id: string; offer: { icon: string; lines: string[]; go: string; decline: string } }[];
    }).sends.find(s => s.id === this.sendOffer?.id);
    if (!def) return;
    if (!this.sendOffer.open) {
      this.drawIcon(10, 200, def.offer.icon, true, 'icon-send');
      return;
    }
    const dw = 300; const dh = 150;
    const dx = Math.round((W - dw) / 2); const dy = Math.round((H - dh) / 2);
    const c = ui.windowFrame(this.ctx, dx, dy, dw, dh, def.offer.icon, true);
    ui.setFont(this.ctx, 9);
    this.ctx.fillStyle = ERA1.black;
    def.offer.lines.forEach((line, i) => this.ctx.fillText(line, c.x + 10, c.y + 6 + i * 12));
    ui.button(this.ctx, c.x + c.w - 110, c.y + c.h - 26, 102, 18, def.offer.go, {});
    ui.button(this.ctx, c.x + 8, c.y + c.h - 26, 70, 18, def.offer.decline, {});
    this.hits.push({ x: c.x + c.w - 110, y: c.y + c.h - 26, w: 102, h: 18, id: 'send-go' });
    this.hits.push({ x: c.x + 8, y: c.y + c.h - 26, w: 70, h: 18, id: 'send-decline' });
  }

  private setPhase(p: Phase): void {
    this.phase = p;
    this.phaseT = 0;
    this.dirty = true;
    this.emitOpeningProfile();
  }

  openingProfileSnapshot(): OpeningProfileSnapshot {
    const stage = this.phase === 'r_boot' ? 'boot'
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
    this.t += dt;
    this.phaseT += dt;
    if (this.paused) { this.draw(); return; }

    if (this.phase === 'boot') {
      const next = Math.min(Math.floor(this.phaseT / BOOT_CPS), this.bootTotal);
      if (next !== this.bootChars) this.bootChars = next;
      if (this.bootChars >= this.bootTotal && this.phaseT > BOOT_HOLD) this.setPhase('splash');
    }
    if (this.phase === 'splash' && this.phaseT >= SPLASH_SECONDS) this.setPhase('name');
    if (this.phase === 'r_boot') {
      const next = Math.min(Math.floor(this.phaseT / BOOT_CPS), this.rBootTotal);
      if (next !== this.rBootChars) this.rBootChars = next;
      if (this.rBootChars >= this.rBootTotal && this.phaseT > R_BOOT_HOLD) this.setPhase('r_profile');
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
    }
    if (this.phase === 'desktop' && this.kit) this.kit.update(dt);
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
    if (this.phase === 'desktop' && this.updateApp) this.updateApp.update(dt);
    if (this.phase === 'desktop' && this.netvision) this.netvision.update(dt);
    // S2R.3–S2R.6: the person's window and the apparatus's answer to it
    if (this.phase === 'desktop' && this.caleb) this.caleb.update(dt);
    if (this.phase === 'desktop' && this.accountability) this.accountability.update(dt);
    // THE BREAK (S2R.4): while the apparatus's own showpiece tears itself
    // apart, Caleb arrives through the corner-toast shape the system uses to
    // nag him. Pushed once — the toast object guards re-entry.
    if (this.phase === 'desktop' && this.netvision?.inBreakNow) this.caleb?.pushBreakToast();
    if (this.t >= this.pureMailAt) {
      this.pureMailAt = Infinity;
      this.accountability?.openMail();
      this.dirty = true;
    }
    // R28-2a: the guide is condition-driven only (no timers) — one tick per
    // frame. Era-1-only (CLAUDE.md R28 amendment 2: Lamby conducts from E2 —
    // the guide thread must not go on evaluating/filing once the era has
    // moved past it, even though its rendering was already E1-gated below).
    if (this.phase === 'desktop' && this.desktopEra === 'e1' && this.guide) this.guide.update();
    // S2R.0/S2R.1: the E2 arrival's own transient beats. 'silence' holds until
    // pressed (no timer — click-only, rail); 'lambyBoot' is a brief system
    // beat ("Restorify — finishing installation…") that resolves on its own,
    // same pacing family as the BIOS/LambyOS boot holds above.
    if (this.phase === 'desktop' && this.desktopEra === 'e2' && this.e2Stage !== 'active') {
      this.e2StageT += dt;
      if (this.e2Stage === 'osBoot') {
        const next = Math.min(Math.floor(this.e2StageT / BOOT_CPS), this.e2BootTotal);
        if (next > this.e2BootChars) this.e2BootChars = next; // never walk back a click-completed crawl
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
        // ⚑ and here he is, for the first time in the piece
        this.e2Stage = 'lambyIntro';
        this.e2StageT = 0;
        this.lambyPoseT = 0;
        this.dirty = true;
      }
    }
    // Lamby's own clock — his appear-pop and idle fidget run whenever he is on
    // screen, in any of his windows (the debut, the notice, the video offer).
    if (this.phase === 'desktop' && this.lambyOnScreen) this.lambyPoseT += dt;
    if (!this.behindToastShown && this.t >= this.behindToastAt) {
      this.behindToastShown = true;
      this.toast = { text: strings.desktop.behindToast, t: 7 };
    }
    if (this.toast) {
      this.toast.t -= dt;
      if (this.toast.t <= 0) this.toast = null;
    }
    this.dirty = true; // caret blink etc.; dirty-rect optimization comes later
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
      case 'r_profile': this.drawReinterpProfile(W, H); break;       // O3
      case 'r_recap': this.drawReinterpRecap(W, H); break;           // O3 close
    }
    if (this.reinterp) this.drawReinterpMarker(W);
    if (this.paused) this.drawPause(W, H);
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
    const { ctx } = this;
    const skin = this.eraSkin();
    const colors = this.desktopColors();
    ui.px(ctx, 0, 0, W, H, colors.bg);

    if (this.desktopEra === 'e1') {
      // icons — the channel only exists once the kit has routed you there
      if (!this.kit) this.drawIcon(10, 8, strings.desktop.iconA, true, 'icon-a');
      if (this.irc) this.drawIcon(10, 8, strings.desktop.iconIrc, true, 'icon-irc');
      // reinterpretation-only: the provotype launchers (the invitation is inside each)
      if (this.reinterp && !this.provotype) {
        this.drawIcon(10, 104, reinterpStrings.launcherIcon, true, 'icon-provotype');
        this.drawIcon(10, 152, reinterpStrings.launcherIconIntake, true, 'icon-provotype-intake');
      }
      // S55 — lamby_rig.exe: an unremarked file, never advertised, drawn only
      // on the otherwise-bare E1 desktop (see e1DesktopIdle's doc comment for
      // why that gate exists, not just click-priority).
      if (this.reinterp && this.e1DesktopIdle()) {
        this.drawIcon(10, 200, 'lamby_rig.exe', true, 'icon-lambyrig');
      }
    } else {
      this.drawEraDesktopChrome(W, skin, colors);
    }
    // THE FOUND FILE (Session 60) — the renamed dossier, in every era, on the
    // same terms as lamby_rig.exe: only on an otherwise-idle desktop (so it is
    // never on screen during a felt beat, and never competes with a window),
    // never announced, never rewarded. It is there for the player who looks.
    if (this.reinterp && this.dossierUnlocked && this.desktopIdle()) {
      this.drawIcon(this.desktopEra === 'e1' ? 10 : 12, 296, strings.dossier.icon, true, 'icon-found-file');
    }
    // …and the Messenger, once a message has landed and not yet been read
    // (finding B8): the door stays visible whether or not Lamby's notice was
    // taken, so nothing depends on having said yes to him.
    if (this.desktopEra === 'e2' && this.messagePending) {
      this.drawIcon(12, 236, lambyStrings.messengerIcon, true, 'icon-messenger', true);
    }
    // windows
    if (this.kit?.open) this.kit.draw(ctx);
    if (this.irc?.open) this.irc.draw(ctx, this.caretOn());
    if (this.packet?.open) this.packet.draw(ctx);
    if (this.diary?.open) this.diary.draw(ctx);
    if (this.dossierOpen) this.drawDossier(W, H);
    if (this.provotype?.open) this.provotype.draw(ctx);
    if (this.lambyRigFile?.open) this.lambyRigFile.draw(ctx);
    if (this.restorify?.open) this.restorify.draw(ctx);
    // S2R.3: the person's window FIRST (felt), then every intrusion on it
    // (operable) drawn over it. Lamby lives only in the second of these two
    // calls — he is never drawn inside the chat's frame, in any beat.
    if (this.caleb?.open) this.caleb.draw(ctx);
    if (this.accountability) this.accountability.draw(ctx);
    this.drawSendOffer(W, H);
    // finding B8: Lamby's message notice — over the desktop, never over the
    // Messenger itself (it is closed by the time that window opens)
    if (this.messageNoticeOpen) this.drawMessageNotice(W, H);
    // S2R.4: Lamby's video offer, then the player itself (over Restorify, but
    // still under the system-modal update ritual below)
    if (this.netvisionOfferOpen) this.drawNetvisionOffer(W, H);
    if (this.netvision?.open) this.netvision.draw(ctx);
    // …and his toasts arrive OVER the video: the crack in the showpiece
    if (this.caleb?.open) this.caleb.drawToasts(ctx);
    // the update ritual is SYSTEM-modal — it draws over everything
    if (this.updateApp?.open && this.updateApp.visible) this.updateApp.draw(ctx);
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
    if (this.reinterp && this.desktopEra === 'e1') {
      ui.bevel(ctx, 58, H - 19, W - 108, 16, false);
      const guideLine = this.guide?.activeText;
      if (guideLine) {
        ui.setFont(ctx, 9);
        ctx.fillStyle = ERA1.greyDark;
        ctx.fillText(guideLine, 64, H - 16);
      }
    }
    // THE BREAK's residue (S2R.4): a quiet, non-interactive mark — "the
    // notification mark persisting quietly" — same status-well spot as the
    // guide line (mutually exclusive era, no layout clash).
    if (this.reinterp && this.desktopEra === 'e2' && this.calebNotificationVisible) {
      ui.bevel(ctx, 58, H - 19, W - 108, 16, false);
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.tooltip;
      ctx.fillText(mediaStrings.breakNoticeText, 64, H - 16);
    }
    // toast
    if (this.toast) {
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
    if (this.e2Stage === 'osBoot') { this.drawE2Boot(H); return; }
    if (this.e2Stage === 'lambyBoot') {
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
    const { ctx } = this;
    ui.px(ctx, x + 8, y, 20, 16, enabled ? ERA1.beige : ERA1.tealDark);
    ui.px(ctx, x + 8, y, 20, 4, enabled ? ERA1.navy : ERA1.tealDark);
    // the unread mark (finding B8): a pip, not a number in the label — the
    // label is clipped to 62px and "Messenger (1)" lost its own count to the
    // ellipsis. `warn` is reserved for narrative events, and an unopened
    // message from Caleb is precisely one.
    if (unread) ui.px(ctx, x + 25, y - 3, 6, 6, ERA1.warn);
    ui.setFont(ctx, 9);
    ctx.fillStyle = enabled ? ERA1.white : ERA1.tealDark;
    const fitted = this.fitIconLabel(label, 62);
    const tw = ctx.measureText(fitted).width;
    ctx.fillText(fitted, Math.round(x + 18 - tw / 2), y + 20);
    if (enabled) this.hits.push({ x, y, w: 38, h: 32, id });
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
    const c = ui.windowFrame(ctx, dx, dy, dw, dh, strings.dossier.title, true);
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
    if (this.phase === 'r_boot') { this.setPhase('r_profile'); return; } // any click skips the crawl
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
      case 'update4': this.setPhase('desktop'); this.armUpdate('u4'); break;
      case 'closeUpdate': this.setPhase('desktop'); this.armUpdate('close'); break;
      case 'send-s1': this.setPhase('desktop'); this.offerSend('s1'); break;
      case 'send-s2': this.setPhase('desktop'); this.offerSend('s2'); break;
      case 'send-s3': this.setPhase('desktop'); this.offerSend('s3'); break;
      case 'send-s4': this.setPhase('desktop'); this.offerSend('s4'); break;
    }
    this.dirty = true;
  }

  // ── input ──────────────────────────────────────────────────────────────
  handleMove(x: number, y: number): void {
    if (this.phase === 'desktop' && this.netvision?.open) { this.netvision.handleMove(x, y); return; }
    if (this.phase === 'desktop' && this.accountability?.modal) { this.accountability.handleMove(x, y); return; }
    if (this.phase === 'desktop' && this.caleb?.open) { this.caleb.handleMove(x, y); return; }
    if (this.phase === 'desktop' && this.provotype?.open) { this.provotype.handleMove(x, y); return; }
    if (this.phase === 'desktop' && this.lambyRigFile?.open) { this.lambyRigFile.handleMove(x, y); return; }
    if (this.phase === 'desktop' && this.restorify?.open) { this.restorify.handleMove(x, y); return; }
    const hit = this.hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    const id = hit ? hit.id : '';
    if (id !== this.hover) { this.hover = id; this.dirty = true; }
  }

  handleClick(x: number, y: number): void {
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
    if (this.phase === 'r_boot' || this.phase === 'r_profile' || this.phase === 'r_recap') {
      this.handleOpeningClick(hit ? hit.id : '');
      return;
    }
    // the update ritual is SYSTEM-modal while visible — it owns every click
    if (this.phase === 'desktop' && this.updateApp?.open && this.updateApp.visible) {
      this.updateApp.handleClick(x, y);
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
    if (this.phase === 'desktop' && this.caleb?.open) { this.caleb.handleClick(x, y); return; }
    // the provotype is modal while open — it owns the desktop's clicks
    if (this.phase === 'desktop' && this.provotype?.open) { this.provotype.handleClick(x, y); return; }
    // S55 — lamby_rig.exe is modal while open, same pattern as the provotype
    if (this.phase === 'desktop' && this.lambyRigFile?.open) { this.lambyRigFile.handleClick(x, y); return; }
    if (this.phase === 'desktop' && this.diary?.open) { this.diary.press(); return; }
    if (this.phase === 'desktop' && this.packet?.open) { this.packet.handleClick(x, y); return; }
    if (this.phase === 'desktop' && this.restorify?.open) { this.restorify.handleClick(x, y); return; }
    if (hit) {
      switch (hit.id) {
        case 'continue': this.setPhase('off'); break;
        case 'leave': this.leave(); break;
        case 'ok': this.confirmName(); break;
        case 'icon-a': this.insertKit(); break;
        case 'icon-irc': if (this.irc) this.irc.open = true; break;
        case 'icon-found-file': this.dossierOpen = true; break;
        case 'found-file-close': this.dossierOpen = false; break;
        case 'icon-messenger': this.openMessenger(); break;
        case 'icon-provotype': this.openProvotype(pillowProvotypeData as unknown as Provotype); break;
        case 'icon-provotype-intake': this.openProvotype(originIntakeProvotypeData as unknown as Provotype); break;
        case 'icon-lambyrig': this.openLambyRigFile(); break;
        case 'icon-era-0':
        case 'icon-era-1': this.toast = { text: this.eraSkin().status, t: 5 }; break;
        case 'icon-restorify': this.openRestorify(); break;
        case 'icon-send': if (this.sendOffer) { this.sendOffer.open = true; this.toast = null; } break;
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
          || this.phase === 'r_boot' || this.phase === 'r_profile' || this.phase === 'r_recap') {
        this.paused = !this.paused;
        this.dirty = true;
        return true;
      }
      return false;
    }
    if (this.paused) return true;

    if (this.phase === 'r_boot' && key === 'Enter') { this.setPhase('r_profile'); return true; }

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
    this.paused = false;
    this.setPhase('left');
    this.onLeave?.();
  }

  /** external Leave — the reinterp O1 start-screen overlay lives outside the
   *  monitor canvas, so it drives the wipe/exit through here (rail: Leave
   *  works from the disclaimer onward). */
  leaveNow(): void { this.leave(); }
}
