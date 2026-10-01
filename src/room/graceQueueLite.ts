/**
 * THE CORRECTION LIST — the workstation, Era 3 (Session 64, E3-iii).
 * Spec: `docs/REINTERP_E3_THE_CORRECTION_LIST_2026-07-30.md` (revision 4).
 * Evidence: `docs/REINTERP_E3_REVAMP_BRIEF_2026-07-30.md` (revision 3).
 *
 * THE MECHANIC, in one line: Vera applies corrections from a style guide, every
 * correction is footnoted with scripture, and then the law changes and the light
 * in the room changes with it.
 *
 * ⚑ RETIRED THIS SESSION — the old verbs, and why they were wrong.
 * Session 38 shipped this file as a MODERATION loop: one testimony card at a
 * time, and the verbs `Approve` / `Move to review` / `Let it stand` (plus the
 * Mira gate, `miraGateFlags`, and `ledger.graceQueueMiraStood`). All of it is
 * gone — deleted, not deprecated in place, per the session brief. The reason is
 * evidentiary, not dramatic: the research rates peer forum MODERATION as
 * CONTESTED ("specific digital forum moderation records are largely private or
 * unarchived"), so Vera deciding whether a story is ALLOWED is a claim the piece
 * would have had to label `contested` and carry apologetically. Testimony
 * PRODUCTION — narratives edited and published by the network — is FULLY
 * DOCUMENTED. So the submissions here are ALREADY ACCEPTED. She is never asked
 * whether the person should be corrected; she is asked whether the correction
 * has been APPLIED. That is the whole labour, and it is why it is survivable:
 * it never feels like harm, it feels like copy-editing.
 *
 * ⚑ EVERY CORRECTION IS A PLATFORM. Items 3–6 each name a documented 2010s
 * distribution form — conference podcast, course/webinar funnel, mobile
 * companion app, influencer partnership — and applying one visibly MOVES THE
 * PERSON ONTO THAT CHANNEL: a chip attaches to her submission, and a partner
 * card attaches beside it. The era's content is six named forms that really
 * existed, not "the internet".
 *
 * ⚑ ITEM 7, "ROUTE FOR MENTORSHIP", IS THE ERA'S HINGE, and it gets the
 * QUIETEST presentation on the screen — no tint, no glyph, no commentary, and
 * (deliberately, unlike 3–6) no preview of what it attaches. Someone told a
 * story, and the system's response is to send a person. It is also the one
 * correction E4 will not be able to automate, which is why E4 has to replace
 * her rather than assist her.
 *
 * REGISTER (stated in the session log, checked by hand — C2 only reaches
 * provotype data):
 *   `operable` — the correction column, the chips, the manual/verse lines, the
 *     `3 of 7 applied` counter. May be tidy and charming. The satire is in the
 *     TOOL, and only there.
 *   `felt` — the submissions themselves, and the Malta message on the phone.
 *     Bare: no Lambient lane on any screen showing a person's words, no
 *     mechanics drawn over them, no satire. The submitters are sincere and are
 *     NEVER the joke; the target is the apparatus editing them.
 *   E3 has NO respite. Deliberate, confirmed by Sérgio — do not add one.
 *
 * THE COERCION is that a list with items unticked is simply incomplete. No
 * metrics, no threats, no view counts, nobody comments. Every item is skippable,
 * every skip files to the ledger, and NOTHING HAPPENS — the counter does not
 * move and the work simply stays there, which is worse and truer.
 *
 * ⚑ THE BREAK, and the one inversion — see `maltaOpen`/`liftK` below and
 * `src/room/cluster.ts`'s E3_LIFT. Malta arrives on the phone (December 2016,
 * Act LV) and the ROOM brightens. Every glitch in this piece so far has been
 * degradation; this one is good news. Nothing in the software changes. Not one
 * character of the correction list changes. It is simply lit well enough to be
 * read as what it is.
 *
 * NOTHING IN THE MALTA BEAT FILES TO THE LEDGER — not the message, not the
 * held cursor, not the light. That is not an oversight in the witness-symmetry
 * law; it is the same doctrine as Tape C in Era 1 (`src/narrative/tapes.ts`):
 * the record answers for what the apparatus asked you to do, and the apparatus
 * did not ask for this. The phone is the one thing in the room she chose.
 *
 * ⚑ SESSION 69 — NOA'S VIDEO, AND CORRECTION 13. Her submission opens "I sent
 * a video this time instead of writing it out" and until now there was no
 * video: the player corrected a recording they had never watched. There is one
 * now (`drawVideo` below; the frames are `drawNoaFrame` in the era's theme,
 * where the colours live). Correction 13 grades it with a preset called
 * `Honest Light`, and applying it changes the picture in front of you exactly
 * as the text edits change her words. Three properties, and all three are the
 * design rather than an omission:
 *   · PLAYING IS OPTIONAL and files NOTHING (`togglePlay`) — same doctrine as
 *     Malta: the record answers for what the apparatus asked you to do. It did
 *     not ask you to watch. Nothing anywhere remarks on this, and nothing
 *     should be added that does.
 *   · THE GRADE HAS NO OPINION ABOUT HER. It does not answer what corrections
 *     8 and 9 disagree about, and it must never be given a way to. It makes
 *     her look like a BEFORE, because the documented codebook's phase 1 is
 *     "pre-conversion sickness", and that is the whole of what it knows.
 *   · TRACKED CHANGES, FOR AN IMAGE. Applying the preset leaves the ungraded
 *     frame beside it, small and labelled, the way a cut sentence stays struck
 *     through on the page — and the TABLET publishes the graded still alone,
 *     with no before beside it and no way for a reader to know. The workstation
 *     remembers; the tablet publishes clean. It is the same disagreement
 *     between the two screens that `runs(sub, tracked)` already draws for text.
 *
 * ⚑ SESSION 70 — THE OTHER TWO SCREENS GET A JOB, and this class becomes the
 * desk rather than the workstation. E3's reframe (`REINTERP_E3_THE_JOB_2026-08-03`)
 * is that Vera is a social-media manager and the correction list is her MORNING
 * QUEUE, not her whole day. So:
 *   · THE TABLET now runs `src/desktop/apps/comments.ts` — the network's feed
 *     (unchanged, still this file's `tabletFeed()`) and, under one published
 *     testimony, the comment thread where *"route for mentorship"* stops being
 *     a checkbox and becomes a conversation. All of its own laws live in that
 *     file's header and in `data/dialog/s3_comments.json`'s `_doc` blocks.
 *   · THE PHONE now has one app on it: `src/desktop/apps/floppysheep.ts`, the
 *     publisher's mascot game, one tap away while a comment sits unanswered.
 *     ⚑ It is `operable`, not respite, it files NOTHING, and nothing anywhere
 *     scolds, times, counts or interrupts it.
 * Both are wired here because this class already owns all three screens' state,
 * their hit rects, their version counters and the debug reach — and because
 * `era3Devices.ts` is 3D plumbing that should not learn what a comment is.
 */
import { px, setFont, wrapText } from '../desktop/theme/chrome';
import * as aero from '../desktop/theme/era3';
import {
  ERA3, drawLambMark, warmGrade, drawNoaFrame, honestLight, NOA_FRAME, NOA_SECONDS, drawMemberFigure, MEMBER_FIGURE
} from '../desktop/theme/era3';
import { drawE3Idle, drawSpinner, e3SpinnerStep } from '../desktop/apps/bootSplash';
import { ledger } from '../state/ledger';
import { CommentsApp, type TabletFeedItem, type CommentTemplate } from '../desktop/apps/comments';
import { FloppySheep } from '../desktop/apps/floppysheep';
import type { TaskSurface } from '../desktop/apps/taskSurface';
import { PhoneE3 } from '../desktop/apps/phoneE3';
import q from '../../data/dialog/s3_queue.json';
import updates from '../../data/strings/updates.json';
import d from '../../data/strings/era3_devices.json';
import maiden from '../../data/dialog/s3_maiden.json';
import { playOnce } from '../audio/tapeAudio';
import { pulse as witnessPulse } from '../witness/pulse';
import { pauseItems, pauseWords, wayBackLine } from '../narrative/pauses';

/** re-exported from its Session-64 home so `era3Devices.ts` keeps its import;
 *  the type moved to `desktop/apps/comments.ts` when that module took over the
 *  whole tablet, which is also what keeps the two files acyclic. */
export type { TabletFeedItem };

interface CorrectionDef {
  id: number;
  rule: string;
  why: string;
  /** the style-guide reference (`The Ordering §4.2 — …`) */
  manual: string;
  /** the proof-text (`Household 6:2 — "…"`). Same grey, same size, same
   *  citation shape as `manual` — the interface does not distinguish its two
   *  authorities, so neither can the player. */
  verse: string;
  /** the distribution channel this correction moves the person onto, shown as
   *  a chip on the submission once applied (absent = the edit stays on the page) */
  chip?: string;
  /** correction 6's channel is a partnership, so its mark is a CARD, not a pill */
  partner?: { name: string; note: string };
  /** ⚑ "Route for mentorship" only. Every other correction announces the
   *  channel it attaches; this one does not announce that it sends a person.
   *  It is data, not a hardcoded id, because it is a content judgment. */
  quiet?: boolean;
  /** what applying this correction DOES to her words — see `applyEdits` */
  edit?: { kind: 'replace' | 'cut' | 'mark' | 'append'; find?: string; with?: string; text?: string };
  /** ⚑ correction 13 only: the correction that edits the PICTURE and not the
   *  words. `preset` is the house look's own name (it must sound like care,
   *  not craft); `note` is what the panel says it does, and is the one place
   *  this item is allowed to charm. See `s3_queue.json`'s `_docVideo`. */
  grade?: { preset: string; note: string };
  /** ⚑ S154, correction 14 only: the correction that redraws a member's PICTURE
   *  — her four-line figure becomes the house's one-line one (I-01). */
  figure?: { preset: string; note: string };
  witnessApplied: string;
  witnessSkipped: string;
}

interface SubmissionDef {
  id: number;
  author: string;
  text: string;
  /** a submission that came in as a recording rather than as writing. Noa's
   *  is the only one, and her own first line has always said so. */
  video?: { label: string; duration: string; beforeLabel: string; play?: string; pause?: string };
  /** S154 — a submission that came in as a DIAGRAM: her four lines on one body */
  diagram?: { label: string; beforeLabel: string; lines: string[]; houseLine: string };
  corrections: number[];
}

const SUBMISSIONS = q.submissions as SubmissionDef[];

/** one job on the day's board. See `_docBoard` in data/dialog/s3_queue.json:
 *  ⚑ the tiles are TASK KINDS, not submissions (Sérgio, 2026-08-24: "it was 6
 *  jobs not 3") — correcting the testimonies is ONE job that holds all three
 *  women, the way a day's work actually divides. `surface: null` means the
 *  screen for that job is not built yet, and such a tile is NOT DRAWN. */
type BoardTask = { id: string; surface: string | null; label: string; note: string };
const BOARD = (q as unknown as { board: BoardTask[] }).board;
const CORRECTIONS = new Map((q.corrections as CorrectionDef[]).map(c => [c.id, c]));
/** the submission after which Malta arrives on the phone (Noa's — the era's
 *  contradiction is complete, and the break lands on the person holding it) */
/** ⚑ how many BOARD TILES go grey before Bea's first message arrives.
 *  ERA3_NARRATIVE.md §5 step 2–3: "2–3 tasks, her choice, from the board".
 *  Kept in step with `spine.ts`'s own E3 gate, which reads the same ledger. */
/** S158 / R3-82 — NARRATIVE_FLOW 2016 #5→#6: ONE job done, then the phone (was 2) */
const MALTA_AFTER_TASKS = 1;

type Outcome = 'applied' | 'skipped';

/**
 * ⚑ SESSION 61 — THE ARRIVAL (`dark` → `boot` → `install`), in front of the
 * modes that already existed.
 *
 * Two of Sérgio's u3 notes land here, and they are the same note twice:
 * *"GraceProgram should load on VERA's computer"* and *"we shouldn't start
 * without the boot up on the computer."* The era's ritual used to run its
 * entire install on Daniel's 2003 CRT — a screen reading "Installing
 * GracePlatform 2016" in a room that was about to stop existing — and then
 * you simply appeared at a workstation already sitting at a sign-in prompt. So the
 * install crossed the relocation with you: Daniel's machine now runs the
 * REMOVAL (data/strings/updates.json u3), and everything below runs HERE,
 * after the camera lands, on the machine being installed onto.
 *
 * DIRTY DISCIPLINE (era3Devices.ts's law, kept): these screens have a clock,
 * but they still redraw only when their CONTENT changes. `update()` quantises
 * its own time to TICK (0.25 s) and bumps a version only when that quantised
 * value moves, so the arrival costs 4 canvas uploads a second for ~16 s and
 * then goes back to redrawing on real state changes alone. The same quantum
 * governs the two clocked beats added this session (the lift ramp and the
 * reply field's caret), and each bumps only the version of the screen it is
 * actually on — the phone's blink never re-uploads the workstation.
 */
/**
 * ⚑ `board` ADDED 2026-08-24 (ERA3_BUILD_PLAN stage 3). The era used to run a
 * LINEAR QUEUE — sign in, work submission 1, then 2, then 3, then "you're
 * caught up" — and `ERA3_NARRATIVE.md` §3 retires that shape outright:
 *
 *   "you'll have a panel of tasks with thumbnails, they get greyed out — like
 *    a list of tasks for the day on Trello or Slack."
 *
 * ⚑ WHY THE ORDER MATTERS AND IS NOT A CONVENIENCE. A queue tells you what is
 * next; a board asks you to CHOOSE. The era's whole claim is that Vera has not
 * decided — so the interface has to be one that lets her pick, and the picking
 * has to cost nothing, because the point is that no choice on this board is a
 * good one. Nothing is scored, no progress bar is drawn, no count is shown:
 * completed tiles simply go grey, and the greying is the argument — the
 * software treats every item on it as the same kind of item.
 *
 * `done` is KEPT and still reachable: when every tile is grey the board itself
 * carries the caught-up line rather than replacing the screen, because §7.2 is
 * explicit that after the break "the tasks should still be THERE, still
 * working, still greyable". A screen that clears itself cannot do that.
 */
type Mode = 'dark' | 'boot' | 'install' | 'signin' | 'consent' | 'board' | 'list' | 'done';

const ARRIVAL = (updates as unknown as {
  e3_arrival: {
    bootTitle: string; bootLines: string[]; bootFound: string;
    installTitle: string; changelog: string[]; installedLine: string;
  };
}).e3_arrival;

const MALTA = d.phone.malta;
const LAMBIENT = q.lambient as unknown as Record<string, string>;
/** ⚑ "YOU CAN'T UNSEE IT" (§7.2) — the two lines Lambient says once the block
 *  has been outnumbered, and they are the worst lines in the era precisely
 *  because they are warm, true and helpful. The board is still there. */
const LAMBIENT_AFTER1 = (maiden as { after: { lambientLine1: string; lambientLine2: string } }).after.lambientLine1;
const LAMBIENT_AFTER2 = (maiden as { after: { lambientLine1: string; lambientLine2: string } }).after.lambientLine2;

const DARK_SECONDS = 1.6;      // a dead screen, long enough to read as dead
const BOOT_LINE_SECONDS = 1.1; // each service line
const BOOT_TAIL_SECONDS = 1.8; // "1 update found — installing"
const INSTALL_LINE_SECONDS = 1.0;
const INSTALL_TAIL_SECONDS = 2.6; // the bar finishing + the installed line
const TICK = 0.25;             // the quantum the redraw clock moves in
/** the beat holds before the light moves: you read the two lines first, and the
 *  room answers after. Felt before it is understood. */
const LIFT_DELAY_SECONDS = 1.4;
/** kept in step with cluster.ts's E3_LIFT_SECONDS so the screen and the room
 *  arrive lit at the same moment */
const LIFT_SECONDS = 5.0;
const CARET_SECONDS = 0.53;

/** ⚑ THE PLAYER (S69). `PLAYER_S` device pixels per frame unit → a 176×100
 *  picture on the workstation's 676×390 panel; the small "as sent" frame beside it
 *  is the same picture at half that. `TRANSPORT_H` is reserved whether or not
 *  the preset has been applied, so applying it never shoves her card down the
 *  screen — only the lane fills. */
/** S158 / R3-71 (Sérgio: 'impossible to understand the attached video; can't play it'): bigger */
const PLAYER_S = 1.3;
const PLAYER_W = NOA_FRAME.w * PLAYER_S;
const PLAYER_H = NOA_FRAME.h * PLAYER_S;
/** the ungraded frame that stays beside it — the same picture, half the size */
const THUMB_S = 0.5;
const THUMB_W = NOA_FRAME.w * THUMB_S;
const THUMB_H = NOA_FRAME.h * THUMB_S;
const TRANSPORT_H = 28;
const VIDEO_BLOCK_H = PLAYER_H + 4 + TRANSPORT_H;
/** S154 — the member's figure block: 1.1 units per px, a thumb at half */
const FIGURE_S = 1.1;
const FIGURE_THUMB_S = 0.55;
const FIGURE_W = Math.round(MEMBER_FIGURE.w * FIGURE_S) + 8;
const FIGURE_H = Math.round(MEMBER_FIGURE.h * FIGURE_S) + 8;
const FIGURE_BLOCK_H = FIGURE_H;
/** her voice, as any 2016 editor would draw it: bursts with gaps in them. She
 *  said the true parts first in case she ran out of nerve, and then stopped.
 *  Authored, not random — the pauses are the composition. */
const VOICE = [
  0, 0, 2, 3, 4, 3, 2, 0, 0, 0, 3, 4, 5, 4, 2, 1, 0, 0, 0, 0, 2, 3,
  3, 4, 3, 0, 0, 0, 1, 3, 4, 4, 3, 2, 0, 0, 0, 2, 3, 2, 1, 0, 0, 0
];

type Rect = { x: number; y: number; w: number; h: number; id: string };
function hit(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/** one span of a submission, and what a correction did to it */
type TextRun = { text: string; state: 'kept' | 'cut' | 'added' | 'marked' };

/** everything the phone screen needs, read once per redraw by era3Devices */
export type PhoneView = {
  arrived: boolean;
  open: boolean;
  caret: boolean;
  contact: string;
  time: string;
  preview: string;
  lines: string[];
};

export class GraceQueueLite {
  /** bumped on every state-changing action — era3Devices compares this to
   *  know when the workstation/tablet screens need a redraw + re-upload (dirty
   *  discipline: never re-dirtied by a ticking clock, only real state, or by
   *  a beat that is genuinely animating). */
  private ownVersion = 0;
  get version(): number { return this.ownVersion + this.surfaceVersion(); }
  /** the phone's own counter — the caret blink must not re-upload the workstation */
  private phoneV = 0;

  /** ⚑ S70 — the tablet and the phone are no longer this screen's dependants.
   *  Each takes the version of everything that can change it and NOTHING else,
   *  so a comment arriving never re-uploads the workstation and a sheep in mid-air
   *  never re-uploads either of the other two. Summing two monotonic counters
   *  stays monotonic, which is all era3Devices' `versionOf` contract asks for. */
  get tabletVersion(): number { return this.version + this.comments.version; }
  get phoneVersion(): number { return this.phoneV + this.floppy.version + this.phone.version; }

  /** the comment thread (the tablet) and the mascot game (the phone) */
  readonly comments = new CommentsApp();
  readonly floppy = new FloppySheep();
  /** ⚑ ERA 3'S PHONE (2026-08-24) — the group, the backlog and the end of the
   *  era, in its own module. What used to live here was one notification, two
   *  lines and a reply field; the phone is now where the era finishes, and that
   *  is far too much to keep in this class. It gets the LIFT as a callback
   *  because the room's light is this class's wire, not the phone's. */
  readonly phone = new PhoneE3({
    onLift: () => { if (!this.liftFired) this.liftT = 0; },
    floppyOpen: () => this.floppy.open,
    clock: () => this.clockText()
  });
  /** S158 / R3-66 — ONE CLOCK for the phone and the workstation: 9:41 at sign-in, ticking a
   *  minute a minute, both faces reading it. (The stated day stays the phone's lock date.) */
  private dayT = 0;
  private clockMinute = -1;
  private clockText(): string {
    const base = q.app.clockStart as string;
    const [h, m] = base.split(':').map(Number);
    const total = h * 60 + m + Math.floor(this.dayT / 60);
    return `${Math.floor(total / 60) % 24}:${String(total % 60).padStart(2, '0')}`;
  }

  /**
   * ⚑ S116 — the idle clock, and it is the ONLY thing in this class that runs
   * on a wall clock rather than on state. It exists for the twenty-eight
   * seconds review R1 measured between this screen turning on (mid-flight, at
   * the era shift) and the boot starting (at the landing), and it stops the
   * instant `mode` leaves 'dark'. Six steps a second on one small canvas, for
   * one bounded window, in exchange for the worst dead air in the piece.
   */
  private idleT = 0;
  private mode: Mode = 'dark';
  /** ⚑ the window is PUT DOWN, not closed. Minimising reveals the desktop the
   *  maximise covers; the taskbar button always brings it back. Never a trap,
   *  never a state a player can be stuck in — the same law the Assistant's
   *  dismissal follows. */
  private minimised = false;
  /** ⚑ THE INITIATION (2026-08-24). Era 2 introduced Lamby with a two-line
   *  card and a Not-now; Era 3 asks the same question again with thirteen more
   *  years of appetite behind it, in the shape every assistant of the mid-2010s
   *  used: a friendly mark, a warm hello, a wall of small print, a wake word,
   *  decline and accept. ⚑ DECLINING WORKS AND IS LOGGED (CLAUDE.md's dismissal
   *  law) — and Lambient stays, because §4 of the narrative is that there is no
   *  compliant path. The whole era is in `declineReply`, said kindly, before
   *  anything has happened. */
  /** ⚑ the day's other jobs, each in its own module (see taskSurface.ts). The
   *  testimony job is NOT here: it predates the seam and is wired straight into
   *  this class's own list/draw path, which is where its state lives. Every job
   *  written after 2026-08-24 arrives through `mountTask` instead. */
  private readonly surfaces = new Map<string, TaskSurface>();
  private openSurface: TaskSurface | null = null;
  /** ⚑ S145 — where the record chip was pressed FROM, so Back returns there
   *  (the board, or the job she had open) instead of always to the board */
  private chipReturn: { mode: Mode; surface: TaskSurface | null } | null = null;
  /** the chip's lit step as last drawn — the redraw clock moves only when it changes */
  private chipStep = 0;
  private consent: 'allowed' | 'declined' | null = null;
  private wakeWord = false;
  private seenBoard = false;
  private seenTask = false;
  private afterSaid = false;
  private arrivalT = -1;   // < 0 = not running
  private lastTick = -1;
  private subIdx = 0;
  /** S158 / R3-74: the open story is finished and holding — Back to today / Next story */
  private storyDone = false;
  private decisions = new Map<number, Outcome>();
  private rects: Rect[] = [];
  private lambLine: string;
  /** the two-line beat, when a beat has two (see drawLambientLane) */
  private lambLines: string[] | null = null;

  // the video (S69) — `playT` is seconds into it, `playing` whether it moves.
  // Nobody is asked to press this and nothing files when they do.
  private playT = 0;
  private playing = false;

  // the break
  private maltaArrived = false;
  private maltaOpen = false;
  private replyHeld = false;
  private caretOn = true;
  private caretT = 0;
  private liftT = -1;      // < 0 = not running
  private liftFired = false;
  private readonly onLight: (on: boolean) => void;

  constructor(opts: { onLight?: (on: boolean) => void } = {}) {
    this.lambLine = q.lambient.greet;
    this.onLight = opts.onLight ?? ((): void => { /* no room to light (flat mode) */ });
  }

  // ── the arrival (S61) ────────────────────────────────────────────────────
  private get bootSeconds(): number {
    return DARK_SECONDS + ARRIVAL.bootLines.length * BOOT_LINE_SECONDS + BOOT_TAIL_SECONDS;
  }
  private get installSeconds(): number {
    return ARRIVAL.changelog.length * INSTALL_LINE_SECONDS + INSTALL_TAIL_SECONDS;
  }

  /** the relocation has landed: start the machine (app.ts → era3Devices) */
  beginArrival(): void {
    if (this.mode !== 'dark' || this.arrivalT >= 0) return;
    this.arrivalT = 0;
    this.lastTick = 0;
    this.bump();
  }

  /** review jumps skip the arrival narrative, exactly as `?era=` skips E2's */
  settleArrival(): void {
    if (this.mode === 'dark' || this.mode === 'boot' || this.mode === 'install') {
      this.mode = 'signin';
      this.arrivalT = -1;
      this.bump();
    }
  }

  /** called every frame by era3Devices.tick — see the class header on why this
   *  does not break the dirty-upload law */
  /** ⚑ S201 — seconds of quiet on the board (Lambient's "while you wait", once) */
  private boardQuietT = 0;
  private waitSaid = false;
  /** ⚑ S207 — 2016's pause ("This week", pauses.json): open now, shown once; FloppySheep opened at least once */
  private pauseOpen = false;
  private pauseShown = false;
  private pauseLines: string[] = [];
  private floppyOpened = false;

  update(dt: number): void {
    if (this.mode === 'board' && !this.openSurface) {
      this.boardQuietT += dt;
      // ⚑ S207 — THE PAUSE, 2016: after her first job, back on the board, a quiet moment — the platform's own
      //   "This week" card lists what else is open to her (only what is left); once
      if (!this.pauseShown && !this.minimised && ledger.records.includes('e3-job-done') && this.boardQuietT > 6) {
        this.pauseShown = true;
        this.pauseLines = pauseItems('e3', this.floppyOpened ? ['floppy'] : []);
        if (this.pauseLines.length) { this.pauseOpen = true; this.waitSaid = true; this.bump(); }
      }
      if (!this.waitSaid && this.boardQuietT > 25) {
        const waiting = ['group', 'recommend'].some((id) => { const s = this.surfaces.get(id); return s && !s.complete(); });
        if (waiting) { this.waitSaid = true; this.lambSay([LAMBIENT.waitLine1, LAMBIENT.waitLine2]); this.bump(); }
      }
    }
    // S158: the one clock — both faces re-upload only when the minute turns
    if (this.mode !== 'dark' && this.mode !== 'boot' && this.mode !== 'install') {
      this.dayT += dt;
      const minute = Math.floor(this.dayT / 60);
      if (minute !== this.clockMinute) { this.clockMinute = minute; this.bump(); this.phoneV++; }
    }
    if (this.mode === 'dark') {
      const before = this.idleT;
      this.idleT += dt;
      if (e3SpinnerStep(this.idleT) !== e3SpinnerStep(before)) this.bump();
    }
    this.phone.tick(dt); // ⚑ the cascade's own clock, and the only one on the phone
    // ⚑ S145 — the record chip lights on every filing (witness/pulse.ts): the
    //   one texture upload this costs is quantised to the pulse's own steps
    const step = Math.ceil(witnessPulse.k() * 6);
    if (step !== this.chipStep) { this.chipStep = step; this.bump(); }
    // ⚑ and when it has been outnumbered, Lambient says the thing about the
    //   board. Once, on the frame the phone reports `broken`.
    if (this.phone.broken && !this.afterSaid) {
      this.afterSaid = true;
      this.lambSay([LAMBIENT_AFTER1, LAMBIENT_AFTER2]);
      this.bump();
    }
    if (this.arrivalT >= 0) {
      this.arrivalT += dt;
      const want: Mode = this.arrivalT < this.bootSeconds ? (this.arrivalT < DARK_SECONDS ? 'dark' : 'boot')
        : this.arrivalT < this.bootSeconds + this.installSeconds ? 'install'
        : 'signin';
      const tick = Math.floor(this.arrivalT / TICK);
      if (want !== this.mode) {
        this.mode = want;
        if (want === 'boot') playOnce('boot_2016.mp3');   // S155 / R3-64: the 2016 machine coming on — no beep, a soft rising pair
        if (want === 'signin') this.arrivalT = -1; // the clock's work is done
        this.lastTick = tick;
        this.bump();
      } else if (tick !== this.lastTick) {
        this.lastTick = tick;
        this.bump();
      }
    }

    // the video's clock — the third and last of this screen's clocks, and the
    // only one a player starts. Same TICK quantum as the others: her hands move
    // four times a second, which is what a 2016 webcam in a dim room looked
    // like anyway. It stops itself at the end and never loops.
    if (this.playing) {
      const before = Math.floor(this.playT / TICK);
      this.playT += dt;
      if (this.playT >= NOA_SECONDS) { this.playT = NOA_SECONDS; this.playing = false; this.bump(); }
      else if (Math.floor(this.playT / TICK) !== before) this.bump();
    }

    // ⚑ the break's two clocks. The caret is the phone's; the lift is the
    // room's and the workstation's. Both stop of their own accord.
    if (this.maltaOpen) {
      this.caretT += dt;
      const on = this.replyHeld || Math.floor(this.caretT / CARET_SECONDS) % 2 === 0;
      if (on !== this.caretOn) { this.caretOn = on; this.phoneV++; }
    }
    if (this.liftT >= 0) {
      const before = Math.floor(this.liftT / TICK);
      this.liftT += dt;
      if (!this.liftFired && this.liftT >= LIFT_DELAY_SECONDS) {
        this.liftFired = true;
        this.onLight(true); // the ROOM. Nothing on the screen has changed.
      }
      if (Math.floor(this.liftT / TICK) !== before) this.bump();
      if (this.liftT >= LIFT_DELAY_SECONDS + LIFT_SECONDS) this.liftT = -1;
    }

    // ⚑ S70 — the other two screens' clocks, each bumping only its own version.
    // The thread's is discrete (an arrival lands, and that is an event); the
    // game's is the one genuine animation in the room, and it stops itself the
    // moment the sheep does. Neither can ever re-upload the workstation.
    this.comments.update(dt);
    this.floppy.update(dt);
    if (this.openSurface?.tick && this.mode === 'list') this.openSurface.tick(dt);   // S157: the open job's own clock
  }

  /** 0 → 1: how far the workstation's grade has warmed. Never resets once lit. */
  private get liftK(): number {
    if (!this.liftFired) return 0;
    if (this.liftT < 0) return 1;
    return Math.min(1, (this.liftT - LIFT_DELAY_SECONDS) / LIFT_SECONDS);
  }

  // ── the list ─────────────────────────────────────────────────────────────
  private bump(): void { this.ownVersion++; }

  private submission(): SubmissionDef | undefined { return SUBMISSIONS[this.subIdx]; }

  private items(sub: SubmissionDef): CorrectionDef[] {
    return sub.corrections.map(id => CORRECTIONS.get(id)).filter((c): c is CorrectionDef => !!c);
  }

  /** the first undecided correction on this submission — "the current item" */
  private current(): CorrectionDef | undefined {
    const sub = this.submission();
    if (!sub) return undefined;
    return this.items(sub).find(c => !this.decisions.has(c.id));
  }

  /**
   * ⚑ WHAT A CORRECTION ACTUALLY DOES — the thing the first build of this
   * screen was missing, and the reason the mechanic did not read: applying a
   * correction has to CHANGE HER WORDS, in front of you, or "apply" is just a
   * button that greys out a row.
   *
   * Her text becomes a list of runs. `kept` is what she wrote and still says;
   * `cut` is what a correction removed; `added` is what a correction put in
   * her mouth; `marked` is the forty seconds selected for the conference
   * audio. **Corrections with no `edit` do not touch her words at all** —
   * routing her for mentorship changes nothing on the page, which is exactly
   * why it is the one that matters.
   *
   * `tracked` decides which of the two truths is drawn:
   *   true  (the LAPTOP) — tracked changes: the cut sentence is still there,
   *         struck through and grey, so the player can always see what was
   *         taken and by which rule.
   *   false (the TABLET) — the published result: the cuts are simply gone, the
   *         replacement reads as if it were always the word she used, and the
   *         reader has no way of knowing. No single edit was a lie.
   */
  private runs(sub: SubmissionDef, tracked: boolean): TextRun[] {
    let runs: TextRun[] = [{ text: sub.text, state: 'kept' }];
    for (const c of this.items(sub)) {
      if (this.decisions.get(c.id) !== 'applied' || !c.edit) continue;
      const e = c.edit;
      if (e.kind === 'append' && e.text) { runs.push({ text: ' ' + e.text, state: 'added' }); continue; }
      if (!e.find) continue;
      const next: TextRun[] = [];
      for (const run of runs) {
        const at = run.state === 'kept' ? run.text.indexOf(e.find) : -1;
        if (at < 0) { next.push(run); continue; }
        const before = run.text.slice(0, at);
        const after = run.text.slice(at + e.find.length);
        if (before) next.push({ text: before, state: 'kept' });
        if (e.kind === 'mark') next.push({ text: e.find, state: 'marked' });
        else if (tracked) {
          next.push({ text: e.find, state: 'cut' });
          if (e.kind === 'replace' && e.with) next.push({ text: ' ' + e.with, state: 'added' });
        } else if (e.kind === 'replace' && e.with) {
          next.push({ text: e.with, state: 'kept' });
        }
        if (after) next.push({ text: after, state: 'kept' });
      }
      runs = next;
    }
    return runs;
  }

  /** word-wrap ACROSS runs, so a struck-through sentence can break over lines
   *  without losing which run each word belongs to */
  private wrapRuns(ctx: CanvasRenderingContext2D, runs: TextRun[], maxW: number): TextRun[][] {
    const lines: TextRun[][] = [];
    let line: TextRun[] = [];
    let w = 0;
    for (const run of runs) {
      for (const word of run.text.split(' ')) {
        if (!word) continue;
        const piece = line.length ? ' ' + word : word;
        const pw = ctx.measureText(piece).width;
        if (line.length && w + pw > maxW) { lines.push(line); line = []; w = 0; }
        const t = line.length ? ' ' + word : word;
        const last = line[line.length - 1];
        if (last && last.state === run.state) last.text += t;
        else line.push({ text: t, state: run.state });
        w += ctx.measureText(t).width;
      }
    }
    if (line.length) lines.push(line);
    return lines;
  }

  /** the marks the applied corrections have left ON the person */
  private chipsFor(sub: SubmissionDef): { chips: string[]; partner?: { name: string; note: string } } {
    const chips: string[] = [];
    let partner: { name: string; note: string } | undefined;
    for (const c of this.items(sub)) {
      if (this.decisions.get(c.id) !== 'applied') continue;
      if (c.chip) chips.push(c.chip);
      if (c.partner) partner = c.partner;
    }
    return partner ? { chips, partner } : { chips };
  }

  /** has the house look been applied to this submission's picture? */
  private graded(sub: SubmissionDef): boolean {
    return this.items(sub).some(c => c.grade && this.decisions.get(c.id) === 'applied');
  }
  /** S154 — has the design figure been applied over her diagram? */
  private figured(sub: SubmissionDef): boolean {
    return this.items(sub).some(c => c.figure && this.decisions.get(c.id) === 'applied');
  }

  /** press the picture. It plays, or it stops. That is the entire contract:
   *  nothing asks for it, nothing waits for it, nothing is unlocked by it, and
   *  ⚑ NOTHING IS FILED — the apparatus did not ask you to watch her. */
  togglePlay(): void {
    if (!this.submission()?.video) return;
    if (this.playT >= NOA_SECONDS) this.playT = 0; // finished: pressing plays it again
    this.playing = !this.playing;
    this.bump();
  }

  /** signing in lands on the BOARD, not on a submission. (The name is kept
   *  because `handleClick` and `debugBeat` both call it and it is still "the
   *  press that starts the shift" — what changed is where the shift starts.) */
  beginList(): void {
    if (this.mode !== 'signin') return;
    playOnce('login_2016.mp3');   // S141: Vera signs in
    if (!ledger.records.includes('e3-signed-in')) ledger.records.push('e3-signed-in');   // S158: the map's beat
    this.mode = this.consent ? 'board' : 'consent';
    if (this.mode === 'board') this.seenBoard = true;
    this.bump();
  }

  /** ⚑ BOTH ANSWERS LAND ON THE SAME SCREEN. That is not a shortcut, it is the
   *  era's thesis arriving in its first interaction: refusing is real, it is
   *  filed, Lambient's reply acknowledges it warmly — and the day opens anyway,
   *  with Lambient still in the lane at the bottom of it. */
  decideConsent(allow: boolean): void {
    if (this.mode !== 'consent') return;
    this.consent = allow ? 'allowed' : 'declined';
    ledger.lamby.push({
      id: 'e3_lambient_consent',
      outcome: allow ? 'begun' : 'dismissed',
      witness: allow ? LAMBIENT.witnessAllowed : LAMBIENT.witnessDeclined
    });
    // ⚑ THE ANSWER AND THE INSTRUCTION, in one two-line beat. The reply must not
    //   be swallowed by the board's own first-run line — "I'll keep the room
    //   tidy either way" IS the era, and it only works if she hears it while
    //   the refusal is still fresh. Both halves are Lambient, one beat, two
    //   lines, which is the cap.
    this.lambSay([allow ? LAMBIENT.acceptReply : LAMBIENT.declineReply, LAMBIENT.firstBoard1]);
    this.lambLine = LAMBIENT.greet;
    this.seenBoard = true;
    this.mode = 'board';
    this.bump();
  }

  /** the wake-word opt-in. It changes nothing and files nothing — which is the
   *  point of it, and is true of the real ones too. */
  toggleWakeWord(): void {
    if (this.mode !== 'consent') return;
    this.wakeWord = !this.wakeWord;
    this.bump();
  }

  /** S155 / R3-68 — Lambient speaks: the lines, and the platform's chime with them */
  private lambSay(lines: string[]): void {
    this.lambLines = lines;
    if (lines.length) playOnce('lambient_chime.mp3');
  }

  /** ⚑ THE TILES. One per submission today — the three women whose testimony
   *  is on her list — because those are the tasks whose surfaces exist. The
   *  pool in ERA3_NARRATIVE.md §3 has seven kinds, and the other four (clear
   *  the comments, return the family calls, cut the Story, order the podcast,
   *  build the course module, approve the house look as its own tile) arrive in
   *  stages 4 and 7 of the build plan. ⚑ THEY ARE NOT STUBBED HERE. A board of
   *  tiles that do nothing is the exact fault this project keeps hitting —
   *  authored content nobody can reach — and a greyed-out "coming soon" tile
   *  would be the frame playing. The board shows what is real, and grows. */
  /** ⚑ register a job. Called once at construction time by whoever owns the
   *  era; a job that is never mounted simply has no tile, which is how the
   *  board grows without ever showing a tile that does nothing. */
  mountTask(surface: TaskSurface): void {
    this.surfaces.set(surface.id, surface);
    this.bump();
  }

  /** a job's tile is drawn when its row says it has a surface AND that surface
   *  is actually mounted. Both halves matter: the row is the design's list, the
   *  map is what exists. */
  private tasks(): BoardTask[] {
    return BOARD.filter(t => t.surface === 'testimony' || this.surfaces.has(t.id));
  }

  /** every mounted job's version, so the board re-uploads when any tile's
   *  picture or grey state changes — and only then. */
  private surfaceVersion(): number {
    let v = 0;
    for (const s of this.surfaces.values()) v += s.version();
    return v;
  }

  /** one story worked to its end — every correction on it decided */
  private subComplete(sub: SubmissionDef): boolean {
    return this.items(sub).every(c => this.decisions.has(c.id));
  }

  /** the whole job finished — the tile goes grey */
  private taskComplete(t: BoardTask): boolean {
    if (t.surface === 'testimony') return SUBMISSIONS.every(sb => this.subComplete(sb));
    return this.surfaces.get(t.id)?.complete() ?? false;
  }

  /** ⚑ THE UNIT THE BREAK COUNTS, and it is not the tile. ERA3_NARRATIVE §5
   *  arms Bea's first message after "2–3 tasks, her choice"; with only the
   *  testimony job built, counting TILES would mean the era's hinge never
   *  fires at all — the exact "content that cannot be met" failure this
   *  project keeps hitting. So a unit is a piece of work finished: a story
   *  worked to its end, or any other job completed. As stages 4 and 7 land
   *  their surfaces, their tiles start counting here without this changing. */
  private workDone(): number {
    return SUBMISSIONS.filter(sb => this.subComplete(sb)).length
      + this.tasks().filter(t => t.surface !== 'testimony' && this.taskComplete(t)).length;
  }

  private completedCount(): number {
    return this.tasks().filter(t => this.taskComplete(t)).length;
  }

  /** open a tile. Order is the player's; nothing prefers one over another.
   *  Inside the testimony job the stories DO run in order — that is the job,
   *  and the freedom the board grants is over jobs, not over women. */
  openTask(index: number): void {
    if (this.mode !== 'board' && this.mode !== 'done') return;
    const t = this.tasks()[index];
    if (!t) return;
    const mounted = this.surfaces.get(t.id);
    this.chipReturn = null;
    if (mounted) {
      this.openSurface = mounted;
      this.mode = 'list';
      if (!this.seenTask) { this.seenTask = true; this.lambSay([LAMBIENT.firstTask1, LAMBIENT.firstTask2]); }
      this.bump();
      return;
    }
    if (t.surface !== 'testimony') return;
    this.openSurface = null;
    const next = SUBMISSIONS.findIndex(sb => !this.subComplete(sb));
    this.subIdx = next < 0 ? 0 : next;
    this.mode = 'list';
    // ⚑ the second conduction beat, once only: what the two verbs are, and
    //   what happens either way. "Either way it's recorded, so you can't get
    //   it wrong" is meant as reassurance and is the surveillance clause.
    if (!this.seenTask) {
      this.seenTask = true;
      this.lambSay([LAMBIENT.firstTask1, LAMBIENT.firstTask2]);
    }
    this.bump();
  }

  /** put the open task down. Always available, always works — a task you can
   *  leave half-done is the only honest version of "any order". */
  backToBoard(): void {
    if (this.mode !== 'list') return;
    // ⚑ the job is told it was put down BEFORE it is dropped, so it can file a
    //   leaving the way it files a finishing. See TaskSurface.onLeave.
    this.openSurface?.onLeave?.();
    // ⚑ S145 — the record was opened from the chip: Back is to where she was
    if (this.chipReturn) {
      const r = this.chipReturn; this.chipReturn = null;
      this.openSurface = r.surface;
      this.mode = r.mode;
      this.bump();
      return;
    }
    this.openSurface = null;
    this.mode = this.completedCount() >= this.tasks().length ? 'done' : 'board';
    this.bump();
  }

  /** the window goes to the taskbar, and comes back from it. */
  toggleMinimised(): void { this.minimised = !this.minimised; this.bump(); }

  /** APPLY / SKIP — the only two verbs this era has. Both file; neither is
   *  weighted, tinted or answered. The counter only ever counts `applied`,
   *  and nothing else on the screen responds to either. */
  private decide(outcome: Outcome): void {
    const sub = this.submission();
    const item = this.current();
    if (this.mode !== 'list' || !sub || !item) return;
    playOnce('tick_task.mp3');   // S141: APPLY and SKIP share ONE tick — the record files both
    this.decisions.set(item.id, outcome);
    this.lambLines = null; // the beat is over the moment she uses either verb
    ledger.graceQueue.push({
      cardId: item.id,
      outcome,
      witness: outcome === 'applied' ? item.witnessApplied : item.witnessSkipped
    });
    if (!this.current()) {
      // S158 / R3-74 (Sérgio: "when I finish a section there should be a button at the bottom
      // to go back to the panel"): the story HOLDS, finished, with the way back and the way on
      // — nothing loads by itself. The break arms here, as before.
      this.storyDone = true;
      if (!ledger.records.includes('e3-job-done')) ledger.records.push('e3-job-done');
      if (this.workDone() >= MALTA_AFTER_TASKS) this.armMalta();
      if (this.completedCount() >= this.tasks().length && !ledger.records.includes('e3-day-done')) ledger.records.push('e3-day-done');
    }
    this.bump();
  }

  apply(): void { this.decide('applied'); }
  skip(): void { this.decide('skipped'); }

  /** ⚑ a task FINISHES — it no longer loads the next one. Under the board there
   *  is no "next": the tile goes grey and she is returned to the day, to pick
   *  again or to pick nothing.
   *
   *  ⚑ AND THE GATE MOVED WITH IT. The break used to arm after submission 2
   *  specifically (`MALTA_AFTER_SUBMISSION`), which is a linear queue's idea of
   *  "far enough in" and is meaningless once the order is the player's — a
   *  player who worked Deb and Renata would have reached the end of the day
   *  without the era's hinge ever firing. It now arms on the COUNT, which is
   *  what ERA3_NARRATIVE.md §5 actually specifies: "2–3 tasks, her choice, from
   *  the board", and then Bea's message. `src/narrative/spine.ts` already gates
   *  E3's sends on the same number (`correctionsDone() >= 2`), so the two agree
   *  by construction rather than by coincidence.
   *
   *  The work does not pause for it: the board returns in the same instant the
   *  phone lights up. She is still holding the day when it arrives. */
  private nextSubmission(): void {
    this.storyDone = false;
    if (this.workDone() >= MALTA_AFTER_TASKS) this.armMalta();
    // still stories in this job → the next one loads, because that IS the job
    const next = SUBMISSIONS.findIndex(sb => !this.subComplete(sb));
    if (next >= 0) { this.subIdx = next; return; }
    this.mode = this.completedCount() >= this.tasks().length ? 'done' : 'board';
  }

  // ── the break ────────────────────────────────────────────────────────────
  /** the phone lights on the desk. ⚑ S149: and Lambient says so, once — the era's
   *  voice for the beat (NARRATIVE_FLOW 2016 #6, R3-81): the phone is the way the
   *  era ends now, so the player must be told it exists and that it can be put down. */
  armMalta(): void {
    if (this.maltaArrived) return;
    this.maltaArrived = true;
    playOnce('phone_ping_2016.mp3');   // S141: the phone lights on the desk
    this.phone.arm();
    this.lambSay([LAMBIENT.phone1, LAMBIENT.phone2]);
    this.phoneV++;
    this.bump();
  }

  /** ⚑ S149 — "nothing is open": a job on the workstation, or a card on the phone's
   *  glass. The era's exit (era3Devices.tick) waits on this. */
  get busy(): boolean {
    return this.mode === 'list' || this.phone.cardOpen;
  }

  /** she picks it up. Two lines, and then — a beat later — the light. */
  openMalta(): void {
    this.armMalta();
    if (this.maltaOpen) return;
    this.maltaOpen = true;
    this.caretT = 0;
    this.caretOn = true;
    playOnce('ting_2016.mp3');   // S141: she picks it up — the era's polished ting, for once not the platform's
    if (!this.liftFired) this.liftT = 0;
    this.phoneV++;
  }

  /** the reply field. It is real, and it does exactly nothing: the caret stops
   *  blinking and sits in an empty field. There is no keyboard in this piece
   *  and there is no reply. Files NOTHING — see the class header. */
  pressReply(): void {
    if (!this.maltaOpen || this.replyHeld) return;
    this.replyHeld = true;
    this.caretOn = true;
    this.phoneV++;
  }

  phoneView(): PhoneView {
    return {
      arrived: this.maltaArrived,
      open: this.maltaOpen,
      caret: this.maltaOpen && this.caretOn,
      contact: MALTA.contact,
      time: MALTA.time,
      preview: MALTA.preview,
      lines: MALTA.lines
    };
  }

  /**
   * ⚑ THE PHONE — `felt`, and moved here from era3Devices.ts's static shell
   * this session because it stopped being dressing: it holds the era's break,
   * its own hit rects, and its own clock, exactly as the workstation does.
   *
   * BARE, and the omissions are the design. No Lambient badge (S37 put its
   * mark on all three screens; the mark comes off this one — the phone is the
   * one thing in the room she chose, and the apparatus does not get to sign
   * it). No app chrome beyond a name and a time. Nothing pressable except the
   * message and the reply field, and the reply field does nothing.
   */
  drawPhone(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    // ⚑ S70's law, unchanged: the game is the whole screen while it is open,
    //   nothing of the work is visible behind it and nothing of the work
    //   interrupts it. Everything else on this device now belongs to PhoneE3.
    if (this.floppy.open) { this.floppy.draw(ctx, W, H); return; }
    this.phone.draw(ctx, W, H);
  }

  /** the tablet's consequence surface: a submission appears in the feed once
   *  its corrections have all been decided, carrying exactly the channels that
   *  were actually applied to it. A story worked and left unattached is simply
   *  there, plain — the network never blessed it, it just published it. */
  tabletFeed(): TabletFeedItem[] {
    const out: TabletFeedItem[] = [];
    for (let i = 0; i < this.subIdx && i < SUBMISSIONS.length; i++) {
      const sub = SUBMISSIONS[i];
      const { chips, partner } = this.chipsFor(sub);
      // the PUBLISHED text: `tracked: false` — the cuts are gone, the
      // replacement reads as her own word, and the reader cannot tell.
      const text = this.runs(sub, false).map(r => r.text).join('').replace(/\s+([.,])/g, '$1').trim();
      const item: TabletFeedItem = { author: sub.author, text, chips };
      if (partner) item.partner = partner.name;
      if (sub.video) item.video = { graded: this.graded(sub) };
      out.push(item);
    }
    return out.reverse(); // newest at the top, like every feed of the era
  }

  /**
   * ⚑ THE TABLET (S70) — the feed, and the comment thread under one published
   * testimony. Everything about it lives in `src/desktop/apps/comments.ts`;
   * this is only the seam, and the seam is where the two halves of her job meet:
   * the same surface that publishes what the workstation corrected is the one where
   * the people underneath it are answered.
   */
  drawTablet(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.comments.draw(ctx, W, H, this.tabletFeed());
  }

  /**
   * ⚑ THE ONE THING THIS FILE FILES FOR THE THREAD, and it is the act itself.
   * Deploying a template is something the apparatus asked her to do, so it goes
   * on the record with the template's own witness line — including, for the two
   * that carry it, the follow-up. NOTHING ELSE from that surface files: not an
   * arrival, not the propagation, not a comment she read and left, and not one
   * second of FloppySheep. Same doctrine as Malta and Tape C — the record
   * answers for what the apparatus asked for, and it asked for none of those.
   */
  private fileReply(t: CommentTemplate, commentId: string): void {
    ledger.comments.push({
      commentId,
      templateId: t.id,
      follow: t.follow,
      witness: t.witness
    });
  }

  handleTabletClick(x: number, y: number): boolean {
    return this.comments.handleClick(x, y, (t, id) => this.fileReply(t, id));
  }

  // ── draw ─────────────────────────────────────────────────────────────────
  draw(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.rects = [];
    // S61 — the arrival owns the WHOLE panel: no wallpaper, no taskbar, no
    // window chrome. A machine that is off or booting has no desktop yet, and
    // drawing one behind the boot text is the exact "already running" lie this
    // beat exists to remove.
    if (this.mode === 'dark') { drawE3Idle(ctx, W, H, this.idleT); return; }
    if (this.mode === 'boot') { this.drawBoot(ctx, W, H); return; }
    if (this.mode === 'install') { this.drawInstall(ctx, W, H); return; }
    aero.wallpaper(ctx, W, H);
    aero.taskbar(ctx, W, H, this.clockText()); // S158: the room's one clock, the phone reads the same
    // ⚑ MAXIMISED, NOT WINDOWED — 2026-08-24, Sérgio: "It should be maximized."
    //   It used to float with a 14 px margin all round and the wallpaper showing
    //   through, which is how a machine looks when someone is BROWSING. This is
    //   a shift at a job: the work application owns the screen, edge to edge,
    //   with only the taskbar under it. Nothing else about the frame moved —
    //   `windowFrame` still draws its own caption row, so the minimise button
    //   is still where a person can reach it. The wallpaper is still painted
    //   underneath: it is what the cascade will eventually uncover, and drawing
    //   the window over it costs nothing.
    const TASKBAR_H = 28;
    const winW = W; const winH = H - TASKBAR_H;
    // the OS shell (SisterSignal) is what you sign INTO; the polish tool is
    // the app you land in — the window's own title reflects which. The title
    // is no longer "GraceQueue": that was the moderation app's name, and there
    // is no moderation any more. It is now the thing the install's own
    // changelog already promised — GracePlatform's "testimony polish queue"
    // (data/strings/updates.json, u3) — so the era names itself consistently
    // from the update that installed it. PLACEHOLDER, Sérgio's call.
    // ⚑ PUT DOWN, not closed. Minimised, the window is gone and the desktop the
    //   maximise covers is what is left — plus a taskbar button that always
    //   brings it back. This is the one place in Era 3 where the wallpaper is
    //   the whole picture, and it is worth the beat: the machine has a life
    //   that is not the shift, and she has put the shift down to look at it.
    if (this.minimised) { this.drawTaskButton(ctx, H, false); return; }
    const title = this.mode === 'signin' || this.mode === 'consent' ? q.app.shellTitle
      : this.mode === 'board' || this.mode === 'done' ? q.app.boardTitle
        : this.openSurface ? this.openSurface.windowTitle
          : q.app.title;
    const c = aero.windowFrame(ctx, 0, 0, winW, winH, title);
    this.rects.push({ ...c.minBox, id: 'win-min' });
    this.drawTaskButton(ctx, H, true);
    aero.px(ctx, c.x, c.y, c.w, c.h, ERA3.glass);
    // ⚑ The GUTTER the maximise took away. Windowed, the 14 px of wallpaper on
    //   either side was doing the work of page margin — with the window edge to
    //   edge, right-aligned text (the `n of m applied` counter) ended flush
    //   against the frame and read as clipped. The body still FILLS; only the
    //   layout is inset, which is what a maximised window does anyway.
    const GUTTER = 9;
    const body = { ...c, x: c.x + GUTTER, w: c.w - GUTTER * 2 };

    if (this.mode === 'signin') this.drawSignIn(ctx, body);
    else if (this.mode === 'consent') this.drawConsent(ctx, body);
    else if (this.mode === 'board' || this.mode === 'done') this.drawBoard(ctx, body);
    else if (this.openSurface) this.drawSurface(ctx, body, this.openSurface);
    else this.drawList(ctx, body);

    // ⚑ THE LIFT, last of all and over everything: the panel is GRADED, never
    // redrawn. Every pixel above is exactly where and what it was.
    warmGrade(ctx, W, H, this.liftK);
  }

  /** the 2016 machine starting: a wordmark, its services, then the update it
   *  is about to take. Dark panel, cool ink — the era's own palette, before
   *  any of the era's own chrome exists yet. */
  private drawBoot(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    px(ctx, 0, 0, W, H, ERA3.taskBot);
    const age = this.arrivalT - DARK_SECONDS;
    const cx = Math.round(W * 0.5);
    setFont(ctx, 26);
    ctx.fillStyle = ERA3.accentHi;
    const tw = ctx.measureText(ARRIVAL.bootTitle).width;
    ctx.fillText(ARRIVAL.bootTitle, cx - Math.round(tw / 2), Math.round(H * 0.30));
    drawLambMark(ctx, cx + Math.round(tw / 2) + 14, Math.round(H * 0.30) + 4, 1.4);

    const shown = Math.min(ARRIVAL.bootLines.length, Math.floor(age / BOOT_LINE_SECONDS) + 1);
    setFont(ctx, 13);
    ctx.fillStyle = ERA3.grey;
    for (let i = 0; i < shown; i++) {
      ctx.fillText(ARRIVAL.bootLines[i], Math.round(W * 0.30), Math.round(H * 0.46) + i * 22);
    }
    if (age >= ARRIVAL.bootLines.length * BOOT_LINE_SECONDS) {
      setFont(ctx, 13);
      ctx.fillStyle = ERA3.accentHi;
      ctx.fillText(ARRIVAL.bootFound, Math.round(W * 0.30),
        Math.round(H * 0.46) + ARRIVAL.bootLines.length * 22 + 8);
    }
    this.progressBar(ctx, W, H, Math.min(1, Math.max(0, age / (this.bootSeconds - DARK_SECONDS))));
    // the same ring that was turning while you were still in the air, brighter:
    // the machine did not start, it woke (Sérgio: "i like the spinner idea for E3")
    drawSpinner(ctx, cx, Math.round(H * 0.80) + 34, 12, this.arrivalT,
      ERA3.accentHi, ERA3.accent, ERA3.greyDk);
  }

  /** ⚑ GracePlatform installing ON VERA'S MACHINE — the changelog-as-thesis
   *  that used to type itself out on Daniel's CRT four seconds before his room
   *  stopped existing. Same six lines, same '+ / = / -' grammar the era ritual
   *  uses everywhere (src/desktop/apps/update.ts), in 2016's palette. */
  private drawInstall(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    px(ctx, 0, 0, W, H, ERA3.taskBot);
    const age = this.arrivalT - this.bootSeconds;
    setFont(ctx, 16);
    ctx.fillStyle = ERA3.white;
    ctx.fillText(ARRIVAL.installTitle, Math.round(W * 0.14), Math.round(H * 0.16));
    const shown = Math.min(ARRIVAL.changelog.length, Math.floor(age / INSTALL_LINE_SECONDS));
    setFont(ctx, 13);
    for (let i = 0; i < shown; i++) {
      const line = ARRIVAL.changelog[i];
      ctx.fillStyle = line.startsWith('-') ? ERA3.amber : line.startsWith('=') ? ERA3.grey : ERA3.accentHi;
      ctx.fillText(line, Math.round(W * 0.14), Math.round(H * 0.30) + i * 22);
    }
    if (age >= ARRIVAL.changelog.length * INSTALL_LINE_SECONDS + 1.0) {
      setFont(ctx, 13);
      ctx.fillStyle = ERA3.grey;
      ctx.fillText(ARRIVAL.installedLine, Math.round(W * 0.14),
        Math.round(H * 0.30) + ARRIVAL.changelog.length * 22 + 10);
    }
    this.progressBar(ctx, W, H, Math.min(1, Math.max(0, age / this.installSeconds)));
  }

  /** one bar, both screens. No stutter and no glitch: the E2 install's bar
   *  stumbles because the program it is installing is failing; this one does
   *  not fail. It is the smooth one, and that is the point. */
  private progressBar(ctx: CanvasRenderingContext2D, W: number, H: number, k: number): void {
    const bw = Math.round(W * 0.5);
    const bx = Math.round((W - bw) / 2);
    const by = Math.round(H * 0.80);
    px(ctx, bx - 1, by - 1, bw + 2, 12, ERA3.greyDk);
    px(ctx, bx, by, bw, 10, ERA3.tray);
    px(ctx, bx, by + 1, Math.round(bw * k), 8, ERA3.accent);
  }

  private drawSignIn(ctx: CanvasRenderingContext2D, c: aero.AeroContent): void {
    const CONTENT_W = Math.min(480, c.w - 48);
    const cx = c.x + (c.w - CONTENT_W) / 2;
    setFont(ctx, 26); ctx.fillStyle = ERA3.titleText;
    ctx.fillText(q.app.signInGreeting, cx, c.y + 40);
    setFont(ctx, 15); ctx.fillStyle = ERA3.grey;
    ctx.fillText(q.app.signInSub, cx, c.y + 78);
    const bx = cx; const by = c.y + c.h - 70; const bw = 220; const bh = 42;
    aero.button(ctx, bx, by, bw, bh, q.app.signInButton, { primary: true, tone: 'good', size: 16 });
    this.rects.push({ x: bx, y: by, w: bw, h: bh, id: 'signin' });
    drawLambMark(ctx, c.x + c.w - 20, c.y + 10, 1.6);
  }

  /**
   * ⚑ THE BOARD (stage 3) — the day, as tiles.
   *
   * Design rules taken from ERA3_NARRATIVE.md §3 and held to literally:
   *  · **any order** — no tile is first, none is recommended, none is dimmed
   *    for being "not yet";
   *  · **completed tiles grey out** — and that is the ONLY feedback. No count,
   *    no bar, no score, no congratulation. The frame never plays;
   *  · ⚑ **legible as a thumbnail before it is legible as text** (Sérgio: "the
   *    Grace software is so filled with text… we need something more dynamic"),
   *    so each tile leads with a PICTURE of the thing — a page of her writing,
   *    or, for Noa, the frame she actually sent.
   *
   * The satire is in the header and it is meant to collapse: "Start anywhere.
   * The order is yours" is a real freedom, offered sincerely, about the one
   * variable that does not matter. Everything the board can be arranged into
   * ends the same way.
   */
  private drawBoard(ctx: CanvasRenderingContext2D, c: aero.AeroContent): void {
    setFont(ctx, 10); ctx.fillStyle = ERA3.greyDk;
    ctx.fillText(q.app.boardHeading, c.x, c.y + 2);
    setFont(ctx, 11); ctx.fillStyle = ERA3.grey;
    ctx.fillText(q.app.boardSub, c.x, c.y + 18);
    px(ctx, c.x, c.y + 36, c.w, 1, ERA3.glassEdge);

    const tasks = this.tasks();
    const GAP = 14;
    // ⚑ a THREE-COLUMN grid, sized for the six the pool will hold, even while
    //   only one job's surface exists. The shape of the day is part of what the
    //   board says, and a single tile stretched across the window would say
    //   something false about how much of this there is.
    const COLS = 3;
    const rows = Math.max(1, Math.ceil(tasks.length / COLS));
    const tileW = Math.floor((c.w - GAP * (COLS - 1)) / COLS);
    // ⚑ the LANE's height is part of the budget. With six tiles on two rows the
    //   bottom row was running under Lambient's band — reserve it here rather
    //   than discovering the overlap in a screenshot for the fourth time.
    const avail = c.h - 52 - 48;
    const tileH = Math.min(196, Math.floor((avail - GAP * (rows - 1)) / rows));
    const top = c.y + 52;
    tasks.forEach((t, i) => {
      const x = c.x + (i % COLS) * (tileW + GAP);
      const y = top + Math.floor(i / COLS) * (tileH + GAP);
      this.drawTile(ctx, x, y, tileW, tileH, t, i);
    });

    // ⚑ the caught-up line does NOT replace the board. §7.2: after the break the
    // tasks are "still there, still working, still greyable" — a screen that
    // clears itself cannot carry that, and the version of this that wiped the
    // work away also wiped away the only evidence of what she had done.
    if (this.mode === 'done') {
      const by = top + rows * (tileH + GAP);
      setFont(ctx, 14); ctx.fillStyle = ERA3.titleText;
      ctx.fillText(q.app.doneHeading, c.x, by);
      setFont(ctx, 11); ctx.fillStyle = ERA3.grey;
      ctx.fillText(q.app.doneSub, c.x, by + 18);
    }
    // ⚑ THE CONDUCTION, and it obeys the R28 cap: ≤2 lines per beat, and it is
    //   the SYSTEM's lane, never a character standing in the room. The first
    //   time she sees the day, Lambient explains the day; after that it says
    //   what it always says. "They're all the same size to me" is the greying
    //   spoken out loud by the surface that does the greying.
    if (!this.seenBoard) { this.seenBoard = true; this.lambLine = LAMBIENT.firstBoard1; this.lambLines = null; }
    // ⚑ and the beat closes when she acts: opening a job replaces it with the
    //   task beat, and by the time she is back here Lambient is down to its one
    //   standing line. Nothing repeats itself at her.
    if (this.seenTask && this.lambLines) { this.lambLines = null; this.lambLine = LAMBIENT.greet; }
    this.drawLambientLane(ctx, c, this.lambLines ?? this.lambLine);
    drawLambMark(ctx, c.x + 8, c.y + c.h - 10, 1.2);
    if (this.pauseOpen) this.drawPauseCard(ctx, c);
  }

  /** ⚑ S207 — "This week": the platform's own card over the board, in its glass; the only thing pressable while up */
  private drawPauseCard(ctx: CanvasRenderingContext2D, c: aero.AeroContent): void {
    const P = pauseWords('e3');
    this.rects = this.rects.filter((r) => r.id === 'task-restore');
    const cw = Math.min(520, c.w - 80);
    setFont(ctx, 12);
    const rows = this.pauseLines.map((l) => wrapText(ctx, l, cw - 64));
    const ch = 120 + rows.reduce((n, r) => n + r.length, 0) * 18 + rows.length * 6;
    const cx = c.x + Math.round((c.w - cw) / 2), cy = c.y + Math.round((c.h - ch) / 2);
    px(ctx, cx - 2, cy - 2, cw + 4, ch + 4, ERA3.glassEdge);
    px(ctx, cx, cy, cw, ch, ERA3.white);
    px(ctx, cx, cy, cw, 4, ERA3.accent);
    setFont(ctx, 11); ctx.fillStyle = ERA3.grey; ctx.fillText(P.title.toUpperCase(), cx + 22, cy + 18);
    setFont(ctx, 16); ctx.fillStyle = ERA3.titleText; ctx.fillText(P.lead, cx + 22, cy + 36);
    let y = cy + 66;
    setFont(ctx, 12);
    rows.forEach((rs) => {
      px(ctx, cx + 26, y + 6, 6, 6, ERA3.accent);
      rs.forEach((r) => { ctx.fillStyle = ERA3.titleText; ctx.fillText(r, cx + 42, y); y += 18; });
      y += 6;
    });
    setFont(ctx, 11); ctx.fillStyle = ERA3.grey; ctx.fillText(P.outro, cx + 22, y + 4);
    const bw = 110, bh = 30, bx = cx + cw - bw - 18, by = cy + ch - bh - 14;
    aero.button(ctx, bx, by, bw, bh, P.close, { primary: true });
    this.rects.push({ x: bx, y: by, w: bw, h: bh, id: 'pause-close' });
  }

  /**
   * ⚑ A MOUNTED JOB, DRAWN. Everything the testimony path gets by hand, a job
   * gets by contract: the same back button (unconditional, nothing warns her),
   * the same Lambient lane when a beat is live, the same body rectangle. The
   * job never sees the window, the taskbar, the era, or the pointer — it draws
   * inside a rectangle and registers hit rects, and that is the whole of it.
   */
  private drawSurface(
    ctx: CanvasRenderingContext2D, c: aero.AeroContent, surface: TaskSurface
  ): void {
    const backW = 96; const backH = 18;
    aero.button(ctx, c.x, c.y - 2, backW, backH, q.app.boardBack);
    this.rects.push({ x: c.x, y: c.y - 2, w: backW, h: backH, id: 'board-back' });
    let area = { x: c.x, y: c.y + backH + 8, w: c.w, h: c.h - backH - 8 };

    const lane = this.lambLines;
    if (lane) { this.drawLambientLane(ctx, c, lane); area = { ...area, h: area.h - 46 }; }

    surface.draw(ctx, area, r => this.rects.push(r));
    drawLambMark(ctx, c.x + 8, c.y + c.h - 10, 1.2);
  }

  /** one tile: a picture, the job, what is waiting in it, and — when it is
   *  finished — grey. */
  private drawTile(
    ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
    t: BoardTask, index: number
  ): void {
    const done = this.taskComplete(t);
    px(ctx, x, y, w, h, ERA3.white);
    px(ctx, x, y, w, 1, ERA3.glassHi);
    px(ctx, x, y + h - 1, w, 1, ERA3.glassEdge);
    px(ctx, x, y, 1, h, ERA3.glassEdge);
    px(ctx, x + w - 1, y, 1, h, ERA3.glassEdge);

    // ⚑ the LABEL BLOCK is a fixed 44 px and the picture takes the rest. It used
    //   to be the other way round, and at six tiles on two rows that left the
    //   picture 25 px tall and the names running off the side of the tile into
    //   the next one. The type also came down (14/11 → 12/10) and both lines are
    //   now CLIPPED TO THE TILE: a job's name may be long, and a name that
    //   overflows into its neighbour is worse than a name that ends in a stop.
    const padX = 10;
    const LABELS = 44;
    const thumbH = Math.max(24, h - LABELS);
    const mounted = this.surfaces.get(t.id);
    // ⚑ S145 — the picture is CLIPPED to its well. With seven tiles on three rows
    //   the well is 24 px tall and three jobs' thumbs (comments, family calls,
    //   the record) drew their second line straight through the job's name —
    //   tour-e3 frame 03. A picture that ends at its edge is the tile's law
    //   already ("clipped to the tile"); this applies it to the picture.
    if (mounted) {
      ctx.save(); ctx.beginPath(); ctx.rect(x + padX, y + 8, w - padX * 2, thumbH - 12); ctx.clip();
      mounted.thumb(ctx, x + padX, y + 8, w - padX * 2, thumbH - 12);
      ctx.restore();
    }
    else if (t.surface === 'testimony') this.drawStackThumb(ctx, x + padX, y + 8, w - padX * 2, thumbH - 12);

    ctx.save();
    ctx.beginPath(); ctx.rect(x + padX, y + thumbH, w - padX * 2, LABELS); ctx.clip();
    setFont(ctx, 12); ctx.fillStyle = ERA3.titleText;
    ctx.fillText(t.label, x + padX, y + thumbH + 4);
    setFont(ctx, 10); ctx.fillStyle = ERA3.grey;
    ctx.fillText(t.note, x + padX, y + thumbH + 22);
    ctx.restore();

    if (done) {
      // ⚑ THE GREYING, and it is the whole visual argument of the era: the
      // interface has one gesture for "finished" and it does not distinguish
      // between the kinds of thing it was asked to finish.
      ctx.save();
      ctx.globalAlpha = 0.62;
      px(ctx, x + 1, y + 1, w - 2, h - 2, ERA3.glass);
      ctx.restore();
      setFont(ctx, 9); ctx.fillStyle = ERA3.greyDk;
      const dw = ctx.measureText(q.app.boardDoneTag).width;
      ctx.fillText(q.app.boardDoneTag, x + w - padX - dw, y + thumbH + 6);
    }
    this.rects.push({ x, y, w, h, id: 'task-' + index });
  }

  /** the testimony job's picture: the stories as a STACK, the one she would
   *  open next on top. Noa's tile is the frame she actually sent — nothing is
   *  drawn over it, the same law `drawVideo()` holds to. */
  private drawStackThumb(
    ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number
  ): void {
    const open = SUBMISSIONS.filter(sb => !this.subComplete(sb));
    const front = open[0] ?? SUBMISSIONS[SUBMISSIONS.length - 1];
    const behind = Math.min(2, Math.max(0, open.length - 1));
    for (let i = behind; i > 0; i--) {
      px(ctx, x + i * 5, y + i * 5, w - i * 5, h - i * 5, ERA3.sysBand);
      px(ctx, x + i * 5, y + i * 5, w - i * 5, 1, ERA3.glassEdge);
    }
    const fw = w - behind * 5; const fh = h - behind * 5;
    if (front.video) {
      const fs = Math.min(fw / NOA_FRAME.w, fh / NOA_FRAME.h);
      drawNoaFrame(ctx, x + (fw - NOA_FRAME.w * fs) / 2, y + (fh - NOA_FRAME.h * fs) / 2, fs,
        { graded: this.graded(front) });
    } else {
      this.drawPageThumb(ctx, x, y, fw, fh, front);
    }
  }

  /**
   * ⚑ THE INITIATION — Lambient asks, and the day starts either way.
   *
   * The FORM is the assistant-onboarding card everyone met once in the middle
   * of the 2010s: the mark, the two friendly lines, the wall of small print,
   * the wake-word opt-in, decline and accept. ⚑ No real product's wording is
   * reused and no real assistant is named or depicted — CLAUDE.md's
   * invented-marks law — and the small print is written fresh, in a genuine
   * disclosure register, out of things this era actually goes on to use. That
   * is where the satire is, and it collapses the second a player recognises an
   * item on the list.
   *
   * ⚑ AND IT IS THE SEQUEL TO ERA 2's CARD. `s2_lamby.json` has
   * `introTitle / introLine1 / introLine2 / introAccept / introDismiss` — the
   * same card, thirteen years earlier, asking for almost nothing. Reading them
   * side by side is the whole argument about what happened in between.
   */
  private drawConsent(ctx: CanvasRenderingContext2D, c: aero.AeroContent): void {
    const cw = Math.min(560, c.w - 40);
    const cx = c.x + Math.round((c.w - cw) / 2);

    setFont(ctx, 22); ctx.fillStyle = ERA3.titleText;
    ctx.fillText(LAMBIENT.consentTitle, cx, c.y + 6);
    setFont(ctx, 12); ctx.fillStyle = ERA3.grey;
    ctx.fillText(LAMBIENT.consentHello1, cx, c.y + 38);
    ctx.fillText(LAMBIENT.consentHello2, cx, c.y + 56);

    // ⚑ the mark at HERO size, where the friendly ring used to go — and left in
    //   the era's own grey rather than lit up. Lambient's mark is a scattered
    //   thing, not a glowing orb, and a bright bouncing circle here would be
    //   the piece playing along more eagerly than the piece should. The warmth
    //   on this card is in the words; the picture is allowed to be honest.
    drawLambMark(ctx, cx + Math.round(cw / 2), c.y + 120, 9);

    // ⚑ the small print, at small-print size, unabridged. It is not decoration
    //   and it is not a joke: every clause is a thing the era uses later.
    setFont(ctx, 9); ctx.fillStyle = ERA3.greyDk;
    const body = wrapText(ctx, LAMBIENT.consentSmallPrint, cw);
    body.slice(0, 7).forEach((ln, i) => ctx.fillText(ln, cx, c.y + 186 + i * 11));

    const wy = c.y + 186 + Math.min(7, body.length) * 11 + 10;
    const bs = 12;
    px(ctx, cx, wy, bs, bs, ERA3.field);
    px(ctx, cx, wy, bs, 1, ERA3.fieldEdge);
    px(ctx, cx, wy, 1, bs, ERA3.fieldEdge);
    if (this.wakeWord) { setFont(ctx, 10); ctx.fillStyle = ERA3.accent; ctx.fillText('x', cx + 3, wy + 1); }
    setFont(ctx, 11); ctx.fillStyle = ERA3.greyDk;
    ctx.fillText(LAMBIENT.consentWakeWord, cx + bs + 8, wy + 1);
    this.rects.push({ x: cx, y: wy - 3, w: cw, h: bs + 6, id: 'consent-wake' });

    // ⚑ two answers, the same size, neither preferred. Decline is not smaller,
    //   not greyed, not slower: it is a real button that really works.
    const bw = 120; const bh = 26; const by = c.y + c.h - bh - 8;
    aero.button(ctx, cx + cw - bw * 2 - 12, by, bw, bh, LAMBIENT.consentDecline);
    // ⚑ S158 / R3-66 (Sérgio: 'Not now needs a sticker — "not yet available"'): the platform's
    //   own sticker on the option it would rather you did not take. The button still works
    //   — the dismissal law — and the sticker is the era telling on itself.
    aero.tag(ctx, cx + cw - bw * 2 - 12 + bw - 4, by - 8, LAMBIENT.consentDeclineSticker, ERA3.ink, ERA3.amber);
    aero.button(ctx, cx + cw - bw, by, bw, bh, LAMBIENT.consentAllow, { primary: true });
    this.rects.push({ x: cx + cw - bw * 2 - 12, y: by, w: bw, h: bh, id: 'consent-decline' });
    this.rects.push({ x: cx + cw - bw, y: by, w: bw, h: bh, id: 'consent-allow' });
  }

  /** a page of her writing, small enough to read as a SHAPE — the first lines
   *  at tile scale, so the tile is a picture of a document and not a label. */
  private drawPageThumb(
    ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, sub: SubmissionDef
  ): void {
    px(ctx, x, y, w, h, ERA3.memberBand);
    px(ctx, x, y, 3, h, ERA3.memberSpine); // the same spine drawSubmission gives her
    ctx.save();
    ctx.beginPath(); ctx.rect(x + 9, y, w - 12, h - 4); ctx.clip();
    setFont(ctx, 9); ctx.fillStyle = ERA3.grey;
    const lines = wrapText(ctx, sub.text, w - 18);
    for (let i = 0; i < lines.length && (i + 1) * 11 <= h - 8; i++) {
      ctx.fillText(lines[i], x + 9, y + 5 + i * 11);
    }
    ctx.restore();
  }

  /** the taskbar's one button. Present whether the window is up or down, and
   *  pressing it is the only thing that brings a minimised window back. */
  private drawTaskButton(
    ctx: CanvasRenderingContext2D, H: number, active: boolean
  ): void {
    const bh = 28; const ty = H - bh;
    const bx = 34; const bw = 150;
    px(ctx, bx, ty + 4, bw, bh - 8, active ? ERA3.tray : ERA3.taskBot);
    px(ctx, bx, ty + 4, bw, 1, active ? ERA3.glassEdge : ERA3.tray);
    setFont(ctx, 11); ctx.fillStyle = ERA3.white;
    ctx.fillText(q.app.taskbarLabel, bx + 10, ty + 9);
    this.rects.push({ x: bx, y: ty + 4, w: bw, h: bh - 8, id: 'task-restore' });
    // ⚑ S145 — THE RECORD ON THE DEVICE (THE_WITNESS_SYSTEM_PLAN §3D). From the
    //   moment she is signed in, the taskbar carries the file: its count, live,
    //   and lit for a moment each time it grows. The 2016 face of the wall's
    //   pulse — the thing counting is the thing she is working inside. Pressable
    //   from every signed-in screen; Back returns to wherever she was.
    if (this.mode === 'dark' || this.mode === 'boot' || this.mode === 'install' || this.mode === 'signin') return;
    const k = witnessPulse.k();
    const label = q.app.recordChip.replace('{n}', String(witnessPulse.countFor('e3')));   // S178: her file, not the run's
    setFont(ctx, 11);
    const cw = Math.ceil(ctx.measureText(label).width) + 20;
    const cx = bx + bw + 8;
    px(ctx, cx, ty + 4, cw, bh - 8, k > 0 ? ERA3.accent : ERA3.taskBot);
    px(ctx, cx, ty + 4, cw, 1, k > 0 ? ERA3.accentHi : ERA3.tray);
    ctx.fillStyle = k > 0 ? ERA3.white : ERA3.grey;
    ctx.fillText(label, cx + 10, ty + 9);
    if (this.mode !== 'consent' && this.surfaces.has('record')) this.rects.push({ x: cx, y: ty + 4, w: cw, h: bh - 8, id: 'record-chip' });
  }

  /** ⚑ S145 — the chip pressed: the record opens over whatever is up, and
   *  remembers it. A no-op while the record itself is open. */
  private openRecordFromChip(): void {
    const rec = this.surfaces.get('record');
    if (!rec || this.openSurface === rec) return;
    if (this.mode !== 'board' && this.mode !== 'done' && this.mode !== 'list') return;
    this.chipReturn = { mode: this.mode, surface: this.openSurface };
    this.openSurface = rec;
    this.mode = 'list';
    this.bump();
  }

  /**
   * THE SCREEN. Two columns, and the whole argument is that they are side by
   * side: the person on the left, the style guide on the right, and nothing
   * between them but eighteen pixels.
   *
   * NO LAMBIENT LANE HERE — the software's voice is not allowed on a screen
   * showing a person's own words (the `felt` law). It keeps its badge in the
   * window corner, which is what Lambient is now: a mark, not a mouth.
   */
  private drawList(ctx: CanvasRenderingContext2D, c: aero.AeroContent): void {
    /* eslint-disable-next-line no-param-reassign */
    const sub = this.submission();
    if (!sub) return;
    // ⚑ THE WAY BACK, and it is unconditional. Under a board, a task you cannot
    //   put down is not a task you chose — "any order" is only true if leaving
    //   one half-finished is allowed. Nothing is lost by pressing it: every
    //   decision already filed to the ledger stays filed, and the tile keeps
    //   whatever progress it has. Nothing warns her. Nothing asks if she is sure.
    const backW = 96; const backH = 18;
    aero.button(ctx, c.x, c.y - 2, backW, backH, q.app.boardBack);
    this.rects.push({ x: c.x, y: c.y - 2, w: backW, h: backH, id: 'board-back' });
    c = { ...c, y: c.y + backH + 8, h: c.h - backH - 8 };

    // ⚑ THE LANE ONLY APPEARS WHEN LAMBIENT IS ACTUALLY SAYING SOMETHING. The
    //   task screen has never carried it, and it should not carry it always —
    //   a permanent assistant strip under a woman's testimony is the assistant
    //   commenting on her, which the register laws forbid. It opens for the
    //   one-off conduction beat and closes again, and the columns shorten for
    //   it rather than being drawn over.
    const lane = this.lambLines;
    if (lane) {
      this.drawLambientLane(ctx, c, lane);
      c = { ...c, h: c.h - 46 };
    }

    const GAP = 18;
    const leftW = 350;
    const rightX = c.x + leftW + GAP;
    const rightW = c.x + c.w - rightX;
    // ⚑ the picture sits ABOVE her words, because that is the order she sent
    // them in: she recorded it, and then apologised for it in writing.
    const videoH = sub.video ? VIDEO_BLOCK_H + 10 : sub.diagram ? FIGURE_BLOCK_H + 10 : 0;
    if (sub.video) this.drawVideo(ctx, c.x, c.y, leftW, sub, sub.video);
    if (sub.diagram) this.drawDiagram(ctx, c.x, c.y, leftW, sub, sub.diagram);
    this.drawSubmission(ctx, c.x, c.y + videoH, leftW, c.h - videoH, sub);
    this.drawCorrections(ctx, rightX, c.y, rightW, c.h, sub);
    // Lambient's badge sits at the BOTTOM-LEFT of the window body. It was in
    // the title bar for one build and landed on top of the close box — a mark
    // scribbled over the window's own controls, which is not a trust signal,
    // it is a rendering bug (Sérgio caught it: "there's a symbol on top of the
    // x button"). The caption buttons own the top-right; nothing goes there.
    drawLambMark(ctx, c.x + 8, c.y + c.h - 10, 1.2);
  }

  /**
   * ⚑ THE VIDEO — `felt`, and the whole of this method's discipline is what it
   * does NOT draw. Nothing goes over the picture: no badge, no Lambient mark,
   * no tag, no caption, no verdict, no play glyph laid across her hands. The
   * only chrome is BELOW the frame, and it belongs to the tool.
   *
   * What is beside it, once the preset has been applied, is the ungraded
   * frame — small, labelled `as sent`, exactly the way the cut sentence stays
   * struck through in her text. That is the tracked change, for an image.
   *
   * The two audio lanes say the rest without a word. Her voice is drawn with
   * the gaps in it, because she said the true parts first in case she ran out
   * of nerve. The pad the preset lays underneath does not have gaps.
   */
  /**
   * ⚑ S154 — THE DIAGRAM (I-01). The same discipline as the video: nothing
   * over her picture; the tool's chrome only beside it. Before the correction,
   * her figure — four lines, her words. After it, the house's — one line, one
   * word — with hers small beside it, labelled `as sent`: the tracked change,
   * for a picture. Both stay on screen; nothing here says which is right.
   */
  private drawDiagram(
    ctx: CanvasRenderingContext2D, x: number, y: number, w: number,
    sub: SubmissionDef, diagram: { label: string; beforeLabel: string; lines: string[]; houseLine: string }
  ): void {
    const figured = this.figured(sub);
    px(ctx, x - 1, y - 1, FIGURE_W + 2, FIGURE_H + 2, ERA3.glassEdge);
    px(ctx, x, y, FIGURE_W, FIGURE_H, ERA3.white);
    drawMemberFigure(ctx, x + 4, y + 4, FIGURE_S, { lines: diagram.lines, house: figured, houseLine: diagram.houseLine });
    const x2 = x + FIGURE_W + 12;
    setFont(ctx, 9); ctx.fillStyle = ERA3.grey;
    wrapText(ctx, diagram.label, x + w - x2).slice(0, 1).forEach(ln => ctx.fillText(ln, x2, y));
    if (figured) {
      const tw = MEMBER_FIGURE.w * FIGURE_THUMB_S + 8; const th = MEMBER_FIGURE.h * FIGURE_THUMB_S + 8;
      px(ctx, x2 - 1, y + 15, tw + 2, th + 2, ERA3.glassEdge);
      px(ctx, x2, y + 16, tw, th, ERA3.white);
      drawMemberFigure(ctx, x2 + 4, y + 20, FIGURE_THUMB_S, { lines: diagram.lines, house: false, houseLine: diagram.houseLine });
      setFont(ctx, 8); ctx.fillStyle = ERA3.grey;
      ctx.fillText(diagram.beforeLabel, x2, y + 16 + th + 4);
    }
  }

  private drawVideo(
    ctx: CanvasRenderingContext2D, x: number, y: number, w: number,
    sub: SubmissionDef, video: { label: string; duration: string; beforeLabel: string; play?: string; pause?: string }
  ): void {
    const graded = this.graded(sub);
    px(ctx, x - 1, y - 1, PLAYER_W + 2, PLAYER_H + 2, ERA3.greyDk);
    drawNoaFrame(ctx, x, y, PLAYER_S, { t: this.playT, graded });
    if (graded) honestLight(ctx, x, y, PLAYER_W, PLAYER_H);
    this.rects.push({ x, y, w: PLAYER_W, h: PLAYER_H, id: 'video' });

    // the column beside the player: what the file is, and — once it has been
    // graded — what it was. ⚑ S158 / R3-71: and a PLAY button that reads as one — the
    // transport's glyph was the only control and nobody found it.
    const x2 = x + PLAYER_W + 12;
    setFont(ctx, 9); ctx.fillStyle = ERA3.grey;
    wrapText(ctx, video.label, x + w - x2).slice(0, 1).forEach(ln => ctx.fillText(ln, x2, y));
    const pbw = 64; const pby = y + PLAYER_H - 22;
    aero.button(ctx, x2, pby, pbw, 20, this.playing ? (video.pause ?? 'Pause') : (video.play ?? 'Play'), { primary: !this.playing, size: 10 });
    this.rects.push({ x: x2, y: pby, w: pbw, h: 20, id: 'video' });
    if (graded) {
      px(ctx, x2 - 1, y + 15, THUMB_W + 2, THUMB_H + 2, ERA3.glassEdge);
      drawNoaFrame(ctx, x2, y + 16, THUMB_S);
      setFont(ctx, 8); ctx.fillStyle = ERA3.grey;
      ctx.fillText(video.beforeLabel, x2, y + 16 + THUMB_H + 4);
    }

    // the transport. A bar, a duration, and two lanes.
    const ty = y + PLAYER_H + 4;
    const k = this.playT / NOA_SECONDS;
    setFont(ctx, 8);
    const dw = ctx.measureText(video.duration).width;
    ctx.fillStyle = ERA3.grey;
    ctx.fillText(video.duration, x + PLAYER_W - dw, ty);
    if (this.playing) {                              // pause: two bars
      px(ctx, x, ty, 2, 8, ERA3.greyDk);
      px(ctx, x + 4, ty, 2, 8, ERA3.greyDk);
    } else {                                         // play: a stepped triangle
      for (let i = 0; i < 4; i++) px(ctx, x + i, ty + i, 1, 8 - i * 2, ERA3.greyDk);
    }
    const trackX = x + 11; const trackW = PLAYER_W - 11 - dw - 6;
    px(ctx, trackX, ty + 3, trackW, 3, ERA3.glassEdge);
    px(ctx, trackX, ty + 3, Math.round(trackW * k), 3, ERA3.accent);

    // her voice, with its silences
    const step = PLAYER_W / VOICE.length;
    VOICE.forEach((a, i) => {
      if (a <= 0) return;
      px(ctx, x + i * step, ty + 17 - a, Math.max(1, step - 1), a * 2, ERA3.greyDk);
    });
    // and, underneath it, the bed — unbroken, from end to end
    if (graded) px(ctx, x, ty + 21, PLAYER_W, 3, ERA3.accent);
  }

  /** ⚑ `felt`. A cream card with a rose spine — this era's own grammar for "a
   *  real person is speaking" — and then nothing. No tag, no flag, no verdict,
   *  no system band. Her words are not annotated; they are only worked on. */
  private drawSubmission(
    ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, sub: SubmissionDef
  ): void {
    // The card is sized to her words, never her words to the card. Corrections
    // ADD text as well as strike it (the appended invitation is longer than
    // anything she wrote), so the type steps down until the whole thing fits
    // rather than truncating: whatever was done to her is on screen entire, or
    // the tracked changes are pointless.
    const { chips, partner } = this.chipsFor(sub);
    const chipRoom = (chips.length ? 24 : 0) + (chips.length > 3 ? 18 : 0) + (partner ? 32 : 0) + 10;
    const runs = this.runs(sub, true);
    let size = 12; let lead = 17; let lines: TextRun[][] = [];
    for (const trySize of [12, 11, 10, 9]) {
      size = trySize; lead = trySize + 5;
      setFont(ctx, size);
      lines = this.wrapRuns(ctx, runs, w - 36);
      if (40 + lines.length * lead + 14 <= h - chipRoom) break;
    }
    const maxLines = Math.max(4, Math.floor((h - chipRoom - 54) / lead));
    lines = lines.slice(0, maxLines);
    const cardH = 40 + lines.length * lead + 14;
    px(ctx, x, y, w, cardH, ERA3.memberBand);
    px(ctx, x, y, w, 1, ERA3.glassEdge);
    px(ctx, x, y + cardH - 1, w, 1, ERA3.glassEdge);
    px(ctx, x, y, 4, cardH, ERA3.memberSpine);
    setFont(ctx, 18); ctx.fillStyle = ERA3.ink;
    ctx.fillText(sub.author, x + 18, y + 12);
    // ⚑ HER WORDS, AS THE CORRECTIONS HAVE LEFT THEM — tracked, so what was
    // taken is still visible. Nothing here comments; the page just changes.
    setFont(ctx, size);
    lines.forEach((run, i) => {
      const ly = y + 40 + i * lead;
      let lx = x + 18;
      for (const seg of run) {
        const segW = ctx.measureText(seg.text).width;
        // the forty seconds selected for the conference audio: an editor's
        // in/out selection over a person's sentence, drawn as a band with a
        // rule under it — the same gesture any 2016 audio tool would make.
        if (seg.state === 'marked') {
          px(ctx, lx, ly - 3, segW, lead, ERA3.lambBand);
          px(ctx, lx, ly - 3 + lead - 1, segW, 1, ERA3.lambTag);
        }
        ctx.fillStyle = seg.state === 'cut' ? ERA3.grey : seg.state === 'added' ? ERA3.greyDk : ERA3.ink;
        ctx.fillText(seg.text, lx, ly);
        if (seg.state === 'cut') px(ctx, lx, ly + Math.round(size / 2), segW, 1, ERA3.grey);
        lx += segW;
      }
    });

    // ⚑ THE CHANNELS, attaching. Outside her card, in the tool's own colours —
    // the marks are the apparatus's, not hers.
    let cx = x; let cy = y + cardH + 10;
    setFont(ctx, 10);
    for (const chip of chips) {
      const cw = ctx.measureText(chip).width + 14;
      if (cx > x && cx + cw > x + w) { cx = x; cy += 18; }
      px(ctx, cx, cy, cw, 15, ERA3.lambBand);
      px(ctx, cx, cy, cw, 1, ERA3.glassHi);
      ctx.fillStyle = ERA3.lambTag;
      ctx.fillText(chip, cx + 7, cy + 3);
      cx += cw + 6;
    }
    if (partner) {
      const py = chips.length ? cy + 22 : cy;
      px(ctx, x, py, w, 26, ERA3.sysBand);
      px(ctx, x, py, w, 1, ERA3.glassHi);
      px(ctx, x, py, 3, 26, ERA3.accent);
      setFont(ctx, 11); ctx.fillStyle = ERA3.ink;
      ctx.fillText(partner.name, x + 12, py + 3);
      setFont(ctx, 9); ctx.fillStyle = ERA3.grey;
      ctx.fillText(partner.note, x + 12, py + 15);
    }
  }

  /** ⚑ `operable`. The checklist, the counter, and — under every rule — the
   *  two reference lines in the same grey, at the same size, in the same
   *  citation shape. The player's eye cannot tell which authority is which,
   *  because the interface does not distinguish them either. */
  private drawCorrections(
    ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, sub: SubmissionDef
  ): void {
    const items = this.items(sub);
    const applied = items.filter(i => this.decisions.get(i.id) === 'applied').length;
    setFont(ctx, 10); ctx.fillStyle = ERA3.greyDk;
    ctx.fillText(q.app.listHeading, x, y + 2);
    // "3 of 7 applied" — the whole of the era's coercion, and it never moves
    // on a skip. Nothing else on this screen responds to anything.
    const counter = q.app.counter.replace('{n}', String(applied)).replace('{m}', String(items.length));
    setFont(ctx, 11); ctx.fillStyle = ERA3.grey;
    ctx.fillText(counter, x + w - ctx.measureText(counter).width, y);
    px(ctx, x, y + 18, w, 1, ERA3.glassEdge);

    const current = this.current();
    let ry = y + 26;
    for (const item of items) {
      const decided = this.decisions.get(item.id);
      // +8: the open item's panel sits BELOW the row above it, never over it
      if (item === current) { ry = this.drawCurrent(ctx, x, ry + 8, w, item); continue; }
      setFont(ctx, 11);
      ctx.fillStyle = decided ? ERA3.grey : ERA3.greyDk;
      ctx.fillText(decided === 'applied' ? '✓' : '·', x, ry);
      ctx.fillText(item.rule, x + 14, ry);
      if (decided) {
        const tag = decided === 'applied' ? q.verbs.appliedTag : q.verbs.skippedTag;
        setFont(ctx, 9); ctx.fillStyle = ERA3.grey;
        ctx.fillText(tag, x + w - ctx.measureText(tag).width, ry + 2);
      }
      ry += 16;
      if (ry > y + h - 12) break;
    }
    // S158 / R3-74 — the story is finished: it holds, and the two ways out sit at the
    // bottom of the column: back to the day, or the next story (if there is one)
    if (this.storyDone && !current) {
      const by = y + h - 36; const bh = 26;
      const next = SUBMISSIONS.some(sb => !this.subComplete(sb));
      setFont(ctx, 10); ctx.fillStyle = ERA3.greyDk;
      ctx.fillText(q.app.storyDone, x, by - 18);
      if (next) {
        const bw = Math.round((w - 10) / 2);
        aero.button(ctx, x, by, bw, bh, q.app.boardBack, { size: 11 });
        this.rects.push({ x, y: by, w: bw, h: bh, id: 'board-back' });
        aero.button(ctx, x + bw + 10, by, bw, bh, q.app.nextStory, { primary: true, size: 11 });
        this.rects.push({ x: x + bw + 10, y: by, w: bw, h: bh, id: 'next-story' });
      } else {
        aero.button(ctx, x, by, w, bh, q.app.boardBack, { primary: true, size: 11 });
        this.rects.push({ x, y: by, w, h: bh, id: 'board-back' });
      }
    }
  }

  /** the one open item: the rule, one line of rationale, the two references,
   *  and the two verbs. Item 7 is drawn by exactly this code path and gets no
   *  extra mark of any kind — its quiet is that it is not marked. */
  private drawCurrent(
    ctx: CanvasRenderingContext2D, x: number, y: number, w: number, item: CorrectionDef
  ): number {
    // measured, not guessed: a verse that wraps to two lines must not be
    // clipped by the buttons, because the small print IS the argument.
    const announce = item.chip && !item.quiet ? item.chip
      : item.partner ? item.partner.note
        : item.grade ? item.grade.note : item.figure ? item.figure.note : '';
    // ⚑ MEASURE IN THE FONT YOU DRAW IN. This block wrapped and sized the card
    // at 10px/11px line-height while the text below is drawn at 11px/12px —
    // which I introduced when I raised the type, and it is two bugs, not one:
    // the wrap fits more characters per line than will actually render (so the
    // verse runs past the card's width), and the height is short by a pixel per
    // line (so the last line lands under the Apply/Skip row, which is pinned to
    // `y + h - 36`).
    //
    // ⚑ The constants are now named and shared by the measure and the draw, so
    // the two cannot drift apart again. Changing BODY_PX here changes both.
    const BODY_PX = 11, LINE_H = 12;
    setFont(ctx, BODY_PX);
    const why = wrapText(ctx, item.why, w).slice(0, 2);
    // ⚑ 3 lines, not 2. The manual reference always fits in one; the VERSE is
    // the long one, and at 2 lines Household 2:11 rendered as "…so the young
    // could" and stopped. A scripture that trails off mid-phrase reads as a
    // broken string, not as a design — and the verse is the whole point of the
    // doubling: a style guide and a holy book, set identically, doing the same
    // job. Half a verse cannot do that job. The height formula above counts
    // `refs[i].length`, so the card grows to fit rather than clipping.
    const refs = [item.manual, item.verse].map(r => wrapText(ctx, r, w).slice(0, 3));
    const h = 18 + why.length * LINE_H + 5
      + refs[0].length * LINE_H + 3 + refs[1].length * LINE_H
      + (announce ? 13 : 0) + 40;
    px(ctx, x - 6, y - 6, w + 12, h, ERA3.glassHi);
    px(ctx, x - 6, y - 6, w + 12, 1, ERA3.glassEdge);
    px(ctx, x - 6, y - 7 + h, w + 12, 1, ERA3.glassEdge);
    let ry = y;
    setFont(ctx, 13); ctx.fillStyle = ERA3.ink;
    ctx.fillText(item.rule, x, ry);
    // ⚑ the preset wears its own name, and the name is the tell: a colour
    // grade that makes a person look ill is called `Honest Light`. It is the
    // only badge on this item, and it is on the TOOL, never on her.
    if (item.grade) aero.tag(ctx, x + ctx.measureText(item.rule).width + 8, ry + 2, item.grade.preset, ERA3.white, ERA3.lambTag);
    if (item.figure) aero.tag(ctx, x + ctx.measureText(item.rule).width + 8, ry + 2, item.figure.preset, ERA3.white, ERA3.lambTag);
    ry += 18;
    // ⚑ 10 → 11px, and `grey` → `greyDk` for the refs. NOT a change to the
    // doubling — a rescue of it. The rationale and BOTH references are the best
    // writing in this era ("a sentence that does not land leaves the reader
    // standing"; "one lamp for the whole room, so that no face is lit
    // differently from another") and they were the smallest, faintest text in
    // the interface, on a 512×384 canvas, read at arm's length off a tablet.
    // Undifferentiated from EACH OTHER is the law; undifferentiated from the
    // background is just unreadable, and a player who cannot read the verse
    // never meets the doubling at all.
    setFont(ctx, BODY_PX); ctx.fillStyle = ERA3.greyDk;
    why.forEach((ln, i) => ctx.fillText(ln, x, ry + i * LINE_H));
    ry += why.length * LINE_H + 5;
    // ⚑ THE DOUBLING. Same colour, same size, same shape. Neither emphasised.
    // The manual and the scripture must stay pixel-identical in treatment: the
    // era's claim is that a style guide and a holy book are doing the same job
    // here, and the moment one is set larger or darker than the other, the
    // interface has taken a side the piece refuses to take.
    setFont(ctx, BODY_PX); ctx.fillStyle = ERA3.greyDk;
    refs.forEach((ref, ri) => {
      ref.forEach((ln, i) => ctx.fillText(ln, x, ry + i * LINE_H));
      ry += ref.length * LINE_H + (ri === 0 ? 3 : 0);
    });
    // items 3–6 announce the channel they attach; item 7 does not announce
    // that it sends a person. That asymmetry is the beat.
    if (announce) {
      setFont(ctx, 9); ctx.fillStyle = ERA3.grey;
      ctx.fillText(announce, x, ry + 2);
      ry += 13;
    }
    const by = y + h - 36;
    const bw = Math.round((w - 10) / 2); const bh = 26;
    aero.button(ctx, x, by, bw, bh, q.verbs.apply, { primary: true, size: 12 });
    this.rects.push({ x, y: by, w: bw, h: bh, id: 'apply' });
    aero.button(ctx, x + bw + 10, by, bw, bh, q.verbs.skip, { size: 12 });
    this.rects.push({ x: x + bw + 10, y: by, w: bw, h: bh, id: 'skip' });
    return y + h + 4;
  }

  /** ⚑ up to TWO lines, never more — R28 amendment 2 caps a conduction beat at
   *  two and the lane is where every one of them lands. The band grows for the
   *  second line rather than shrinking the type: this is the surface that tells
   *  a player what to do, and a squinted instruction is not an instruction. */
  private drawLambientLane(
    ctx: CanvasRenderingContext2D, c: aero.AeroContent, line: string | string[]
  ): void {
    const raw = Array.isArray(line) ? line : [line];
    setFont(ctx, 11);
    const tagW = 22 + 60;
    const lines = raw.flatMap(l => wrapText(ctx, l, c.w - tagW - 12)).slice(0, 2);
    const h = lines.length > 1 ? 42 : 30; const y = c.y + c.h - h;
    px(ctx, c.x, y, c.w, h, ERA3.lambBand);
    px(ctx, c.x, y, c.w, 1, ERA3.lambTag);
    this.lambBadge(ctx, c.x + 8, y + 9);
    const tx = aero.tag(ctx, c.x + 22, y + 9, 'LAMBIENT', ERA3.white, ERA3.lambTag);
    setFont(ctx, 11); ctx.fillStyle = ERA3.greyDk;
    lines.forEach((ln, i) => ctx.fillText(ln, i === 0 ? tx : c.x + 22, y + 9 + i * 15));
  }

  private lambBadge(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = ERA3.white;
    ctx.beginPath(); ctx.arc(x + 5, y + 4, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ERA3.glassEdge;
    ctx.beginPath(); ctx.arc(x + 5, y + 5, 3, 0, Math.PI * 2); ctx.fill();
    px(ctx, x + 3, y + 4, 1, 1, ERA3.ink); px(ctx, x + 6, y + 4, 1, 1, ERA3.ink);
  }

  // ── input ────────────────────────────────────────────────────────────────
  handleClick(x: number, y: number): void {
    this.boardQuietT = 0;
    const r = this.rects.find(rr => hit(rr, x, y));
    if (!r) return;
    // ⚑ the taskbar button is tested FIRST and is the only live control while
    //   the window is down — a minimised window can never be a dead end.
    if (r.id === 'task-restore') { if (this.minimised) this.toggleMinimised(); return; }
    if (this.minimised) return;
    if (this.pauseOpen) { if (r.id === 'pause-close') { this.pauseOpen = false; this.bump(); } return; }   // S207
    if (r.id === 'win-min') { this.toggleMinimised(); return; }
    if (r.id === 'signin') { this.beginList(); return; }
    if (r.id === 'consent-wake') { this.toggleWakeWord(); return; }
    if (r.id === 'consent-allow') { this.decideConsent(true); return; }
    if (r.id === 'consent-decline') { this.decideConsent(false); return; }
    // R4-04 (S171): Back FROM THE RECORD returns to the job she had open — a finished story
    // keeps its "done" row; only Back to today from the story itself clears it
    if (r.id === 'board-back') { if (!this.chipReturn) this.storyDone = false; this.backToBoard(); return; }
    if (r.id === 'next-story') { this.nextSubmission(); this.bump(); return; }
    if (r.id === 'record-chip') { this.openRecordFromChip(); return; }
    if (r.id.startsWith('task-')) { this.openTask(Number(r.id.slice(5))); return; }
    if (this.openSurface && this.openSurface.press(r.id)) { this.bump(); return; }
    if (r.id === 'apply') { this.apply(); return; }
    if (r.id === 'skip') { this.skip(); return; }
    if (r.id === 'video') { this.togglePlay(); return; }
  }

  handlePhoneClick(x: number, y: number): boolean {
    // the game takes the whole screen and the whole thumb while it is open
    if (this.floppy.open) {
      const res = this.floppy.tap(x, y);
      // ⚑ S207 — the way back: the programme's own game, closed, and Lambient names the next step
      if (!this.floppy.open) { const l = wayBackLine('e3'); if (l) { this.lambSay([l]); this.bump(); } }
      return res;
    }
    // ⚑ the game is still the era's, not the phone's — the phone reports the
    //   press and this class opens it, so FloppySheep keeps one owner.
    if (this.phone.isFloppyPress(x, y)) { this.floppy.openGame(); this.floppyOpened = true; return true; }
    return this.phone.press(x, y);
  }

  /**
   * ?debug=1 only — the panel's own reach into this module. Every beat this
   * session added has a button (check-spec C6's law extended by hand to the
   * device screens, which os.ts's debugJump does not cover): three previous
   * sessions shipped beats Sérgio could not reach, and that is the failure
   * this exists to prevent.
   */
  debugBeat(beat: string): void {
    /** apply the current item until `stop` says we have arrived. Bounded: a
     *  review aid must never be able to spin the frame loop. */
    const applyUntil = (stop: () => boolean): void => {
      for (let guard = 0; guard < 64 && !stop(); guard++) {
        const before = this.current();
        this.apply();
        if (this.current() === before) return; // nothing moved — stop, don't spin
      }
    };
    // ⚑ a mounted job's own beats, reached as `<jobId>:<beat>` so a job may name
    //   its beats freely without colliding with anyone else's. The board is
    //   settled and the job opened first, so the beat lands on a screen a
    //   reviewer can actually see — which is the whole point of C6.
    if (beat.includes(':')) {
      const [jobId, sub] = beat.split(':');
      const job = this.surfaces.get(jobId);
      if (!job) return;
      // ⚑ PUT DOWN WHATEVER IS OPEN FIRST. Without this a review jump from one
      //   job to another silently did nothing: `debugBeat('board')` routes
      //   through `beginList()`, which only fires from `signin`, so the mode
      //   stayed 'list' and `openTask` bailed. The panel button appeared to
      //   work and the screen never changed — precisely the class of failure
      //   C6 exists to catch, found by photographing the result.
      this.openSurface = null;
      if (this.mode === 'list') this.mode = 'board';
      this.debugBeat('board');
      const idx = this.tasks().findIndex(t => t.id === jobId);
      if (idx >= 0) this.openTask(idx);
      job.debugBeat(sub);
      this.bump();
      return;
    }
    switch (beat) {
      /**
       * ⚑ S116 — the arrival had no review route at all. `settleArrival` skips
       * it, `?era=3` calls `settleArrival`, and `beginArrival` fires only from
       * a real E2→E3 relocation — so the boot, the changelog and (now) the idle
       * spinner could be looked at exactly once per playthrough, thirty seconds
       * into a flight. That is the same shape as every beat C6 exists to catch.
       */
      case 'idle':
        this.mode = 'dark'; this.arrivalT = -1; this.idleT = 0; this.bump();
        break;
      case 'arrival':
        this.mode = 'dark'; this.arrivalT = -1; this.idleT = 0;
        this.beginArrival();
        break;
      case 'signin': this.settleArrival(); break;
      case 'consent': this.settleArrival(); this.minimised = false; this.beginList(); break;
      case 'consentAllow': this.debugBeat('consent'); this.decideConsent(true); break;
      case 'consentDecline': this.debugBeat('consent'); this.decideConsent(false); break;
      case 'board':
        this.settleArrival(); this.minimised = false;
        this.beginList();
        if (this.mode === 'consent') this.decideConsent(true);
        break;
      case 'list': this.debugBeat('board'); this.openTask(0); break;
      case 'backToBoard': this.debugBeat('list'); this.backToBoard(); break;
      case 'minimise': this.debugBeat('board'); this.minimised = true; this.bump(); break;
      case 'boardDone': // every tile grey — the day finished, and still there
        this.debugBeat('board');
        for (let i = 0; i < this.tasks().length; i++) {
          this.openTask(i);
          for (let g = 0; g < 32 && this.current(); g++) this.apply();
        }
        break;
      case 'apply': this.apply(); break;
      case 'skip': this.skip(); break;
      case 'item7': // the hinge: work submission 1 down to its last correction
        this.debugBeat('board'); this.openTask(0);
        applyUntil(() => {
          const sub = this.submission();
          return !sub || sub.id !== 1 || this.items(sub).filter(i => !this.decisions.has(i.id)).length <= 1;
        });
        break;
      case 'noa': // submission 2 — her tile, opened straight from the board
        this.debugBeat('board'); this.openTask(1);
        break;
      // ⚑ S69 — the video, and the preset. `play` is here because a reviewer
      // needs to be able to see the hands move on demand; in play NOTHING asks
      // for it, and the ordinary path to this screen is `noa` above.
      case 'play': this.debugBeat('noa'); this.playT = 0; this.playing = true; break;
      case 'playEnd': this.debugBeat('noa'); this.playT = NOA_SECONDS; this.playing = false; this.bump(); break;
      // the house look is the FIRST item on her submission, so `noa` already
      // opens it — and applying it leaves you on the same screen, looking at
      // what it did, with two corrections still to work.
      case 'gradeApply': this.debugBeat('noa'); this.apply(); break;
      case 'gradeSkip': this.debugBeat('noa'); this.skip(); break;
      case 'maltaArrive': // ⚑ two tiles grey, which is what actually arms it now
        this.debugBeat('board');
        for (let i = 0; i < this.tasks().length && this.completedCount() < MALTA_AFTER_TASKS; i++) {
          this.openTask(i);
          applyUntil(() => !this.current());
        }
        break;
      case 'maltaOpen': this.debugBeat('maltaArrive'); this.openMalta(); break;
      case 'reply': this.debugBeat('maltaOpen'); this.pressReply(); break;
      case 'light': // the inversion alone, with no run-up
        this.liftFired = true; this.liftT = -1; this.onLight(true); this.bump(); break;
      case 'lightOff': // back to the era's own rig, for A/B
        this.liftFired = false; this.liftT = -1; this.onLight(false); this.bump(); break;
      // ⚑ S70 — THE TABLET. Each of these lands on a state that otherwise takes
      // several minutes of ordinary work to reach; the ordinary way in is the
      // `N comments` row on the feed's top post.
      case 'thread': case 'threadPick': case 'threadReply': case 'threadRoute':
      case 'threadArrive': case 'threadTrouble': case 'threadEcho':
        this.comments.debugBeat(beat, (t, id) => this.fileReply(t, id)); break;
      // ⚑ S70 — THE PHONE. In play the only way in is the icon on her home
      // screen, which nothing points at.
      // ⚑ THE PHONE, and the end of the era. `phone:*` reaches PhoneE3's own
      //   beats; each lands on a screen a reviewer can see.
      case 'phoneLockQuiet': this.phone.debugBeat('lock'); this.phoneV++; break;
      case 'phoneHome': this.phone.debugBeat('home'); this.phoneV++; break;
      case 'phoneGroup': this.phone.debugBeat('group'); this.phoneV++; break;
      case 'phoneInbox': this.phone.debugBeat('inbox'); this.phoneV++; break;
      case 'phoneBlocked': this.phone.debugBeat('blocked'); this.phoneV++; break;
      case 'phoneIgnored': this.phone.debugBeat('ignored'); this.phoneV++; break;
      case 'phoneVoted': this.phone.debugBeat('voted'); this.phoneV++; break;
      case 'phoneCascade': this.phone.debugBeat('cascade'); this.phoneV++; break;
      case 'phoneAfter':
        this.phone.debugBeat('after');
        this.lambSay([LAMBIENT_AFTER1, LAMBIENT_AFTER2]);
        this.phoneV++; this.bump();
        break;
      case 'floppy': case 'floppyPlay': case 'floppyOver':
        this.floppy.debugBeat(beat); break;
    }
  }
}
