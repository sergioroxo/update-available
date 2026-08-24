/**
 * THE CORRECTION LIST — the laptop, Era 3 (Session 64, E3-iii).
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
 *     with no before beside it and no way for a reader to know. The laptop
 *     remembers; the tablet publishes clean. It is the same disagreement
 *     between the two screens that `runs(sub, tracked)` already draws for text.
 *
 * ⚑ SESSION 70 — THE OTHER TWO SCREENS GET A JOB, and this class becomes the
 * desk rather than the laptop. E3's reframe (`REINTERP_E3_THE_JOB_2026-08-03`)
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
  ERA3, drawLambMark, warmGrade, drawNoaFrame, honestLight, NOA_FRAME, NOA_SECONDS
} from '../desktop/theme/era3';
import { ledger } from '../state/ledger';
import { CommentsApp, type TabletFeedItem, type CommentTemplate } from '../desktop/apps/comments';
import { FloppySheep, drawFloppyIcon, FLOPPY_LABEL } from '../desktop/apps/floppysheep';
import q from '../../data/dialog/s3_queue.json';
import updates from '../../data/strings/updates.json';
import d from '../../data/strings/era3_devices.json';

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
  witnessApplied: string;
  witnessSkipped: string;
}

interface SubmissionDef {
  id: number;
  author: string;
  text: string;
  /** a submission that came in as a recording rather than as writing. Noa's
   *  is the only one, and her own first line has always said so. */
  video?: { label: string; duration: string; beforeLabel: string };
  corrections: number[];
}

const SUBMISSIONS = q.submissions as SubmissionDef[];
const CORRECTIONS = new Map((q.corrections as CorrectionDef[]).map(c => [c.id, c]));
/** the submission after which Malta arrives on the phone (Noa's — the era's
 *  contradiction is complete, and the break lands on the person holding it) */
const MALTA_AFTER_SUBMISSION = 2;

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
 * you simply appeared at a laptop already sitting at a sign-in prompt. So the
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
 * actually on — the phone's blink never re-uploads the laptop.
 */
type Mode = 'dark' | 'boot' | 'install' | 'signin' | 'list' | 'done';

const ARRIVAL = (updates as unknown as {
  e3_arrival: {
    bootTitle: string; bootLines: string[]; bootFound: string;
    installTitle: string; changelog: string[]; installedLine: string;
  };
}).e3_arrival;

const MALTA = d.phone.malta;

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
 *  picture on the laptop's 676×390 panel; the small "as sent" frame beside it
 *  is the same picture at half that. `TRANSPORT_H` is reserved whether or not
 *  the preset has been applied, so applying it never shoves her card down the
 *  screen — only the lane fills. */
const PLAYER_S = 1;
const PLAYER_W = NOA_FRAME.w * PLAYER_S;
const PLAYER_H = NOA_FRAME.h * PLAYER_S;
/** the ungraded frame that stays beside it — the same picture, half the size */
const THUMB_S = 0.5;
const THUMB_W = NOA_FRAME.w * THUMB_S;
const THUMB_H = NOA_FRAME.h * THUMB_S;
const TRANSPORT_H = 28;
const VIDEO_BLOCK_H = PLAYER_H + 4 + TRANSPORT_H;
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
   *  know when the laptop/tablet screens need a redraw + re-upload (dirty
   *  discipline: never re-dirtied by a ticking clock, only real state, or by
   *  a beat that is genuinely animating). */
  version = 0;
  /** the phone's own counter — the caret blink must not re-upload the laptop */
  private phoneV = 0;

  /** ⚑ S70 — the tablet and the phone are no longer this screen's dependants.
   *  Each takes the version of everything that can change it and NOTHING else,
   *  so a comment arriving never re-uploads the laptop and a sheep in mid-air
   *  never re-uploads either of the other two. Summing two monotonic counters
   *  stays monotonic, which is all era3Devices' `versionOf` contract asks for. */
  get tabletVersion(): number { return this.version + this.comments.version; }
  get phoneVersion(): number { return this.phoneV + this.floppy.version; }

  /** the comment thread (the tablet) and the mascot game (the phone) */
  readonly comments = new CommentsApp();
  readonly floppy = new FloppySheep();

  private mode: Mode = 'dark';
  private arrivalT = -1;   // < 0 = not running
  private lastTick = -1;
  private subIdx = 0;
  private decisions = new Map<number, Outcome>();
  private rects: Rect[] = [];
  private phoneRects: Rect[] = [];
  private lambLine: string;

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
  update(dt: number): void {
    if (this.arrivalT >= 0) {
      this.arrivalT += dt;
      const want: Mode = this.arrivalT < this.bootSeconds ? (this.arrivalT < DARK_SECONDS ? 'dark' : 'boot')
        : this.arrivalT < this.bootSeconds + this.installSeconds ? 'install'
        : 'signin';
      const tick = Math.floor(this.arrivalT / TICK);
      if (want !== this.mode) {
        this.mode = want;
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
    // room's and the laptop's. Both stop of their own accord.
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
    // moment the sheep does. Neither can ever re-upload the laptop.
    this.comments.update(dt);
    this.floppy.update(dt);
  }

  /** 0 → 1: how far the laptop's grade has warmed. Never resets once lit. */
  private get liftK(): number {
    if (!this.liftFired) return 0;
    if (this.liftT < 0) return 1;
    return Math.min(1, (this.liftT - LIFT_DELAY_SECONDS) / LIFT_SECONDS);
  }

  // ── the list ─────────────────────────────────────────────────────────────
  private bump(): void { this.version++; }

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

  /** press the picture. It plays, or it stops. That is the entire contract:
   *  nothing asks for it, nothing waits for it, nothing is unlocked by it, and
   *  ⚑ NOTHING IS FILED — the apparatus did not ask you to watch her. */
  togglePlay(): void {
    if (!this.submission()?.video) return;
    if (this.playT >= NOA_SECONDS) this.playT = 0; // finished: pressing plays it again
    this.playing = !this.playing;
    this.bump();
  }

  beginList(): void {
    if (this.mode !== 'signin') return;
    this.mode = 'list';
    this.bump();
  }

  /** APPLY / SKIP — the only two verbs this era has. Both file; neither is
   *  weighted, tinted or answered. The counter only ever counts `applied`,
   *  and nothing else on the screen responds to either. */
  private decide(outcome: Outcome): void {
    const sub = this.submission();
    const item = this.current();
    if (this.mode !== 'list' || !sub || !item) return;
    this.decisions.set(item.id, outcome);
    ledger.graceQueue.push({
      cardId: item.id,
      outcome,
      witness: outcome === 'applied' ? item.witnessApplied : item.witnessSkipped
    });
    if (!this.current()) this.nextSubmission();
    this.bump();
  }

  apply(): void { this.decide('applied'); }
  skip(): void { this.decide('skipped'); }

  private nextSubmission(): void {
    const done = this.submission();
    this.subIdx++;
    // ⚑ THE BREAK ARMS ITSELF HERE, and the work does not pause for it: the
    // next submission loads in the same instant the phone lights up. She is
    // still holding the list when it arrives, and still holding it after.
    if (done && done.id === MALTA_AFTER_SUBMISSION) this.armMalta();
    if (this.subIdx >= SUBMISSIONS.length) this.mode = 'done';
  }

  // ── the break ────────────────────────────────────────────────────────────
  /** the phone lights on the nightstand. Nothing on the laptop reacts. */
  armMalta(): void {
    if (this.maltaArrived) return;
    this.maltaArrived = true;
    this.phoneV++;
  }

  /** she picks it up. Two lines, and then — a beat later — the light. */
  openMalta(): void {
    this.armMalta();
    if (this.maltaOpen) return;
    this.maltaOpen = true;
    this.caretT = 0;
    this.caretOn = true;
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
   * its own hit rects, and its own clock, exactly as the laptop does.
   *
   * BARE, and the omissions are the design. No Lambient badge (S37 put its
   * mark on all three screens; the mark comes off this one — the phone is the
   * one thing in the room she chose, and the apparatus does not get to sign
   * it). No app chrome beyond a name and a time. Nothing pressable except the
   * message and the reply field, and the reply field does nothing.
   */
  drawPhone(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.phoneRects = [];
    // ⚑ S70 — the game is the whole screen while it is open, and it owns its
    // own way out. Nothing of the work is visible behind it and nothing of the
    // work interrupts it.
    if (this.floppy.open) { this.floppy.draw(ctx, W, H); return; }
    px(ctx, 0, 0, W, H, ERA3.phoneBg);
    if (this.maltaOpen) { this.drawMalta(ctx, W, H); return; }

    setFont(ctx, 20);
    ctx.fillStyle = ERA3.white;
    ctx.fillText(d.phone.lockClock, Math.round((W - ctx.measureText(d.phone.lockClock).width) / 2), 30);
    setFont(ctx, 9);
    ctx.fillStyle = ERA3.phoneDim;
    ctx.fillText(d.phone.lockDate, Math.round((W - ctx.measureText(d.phone.lockDate).width) / 2), 56);

    // ⚑ THE ONE APP ON HER PHONE, and it is the publisher's mascot game.
    // S64's law here was "before Malta the lock screen is EMPTY — the phone in
    // this era is quiet, which is what makes one notification an event", and
    // that law is UNCHANGED: there are still no notifications until Malta. What
    // has been added is not a notification. It is the thing she has on her
    // phone, and the joke of it is entirely on the brand: the same lamb still
    // ships delight while the serious arm of it has become a workflow. It files
    // nothing, it is never suggested, and nothing anywhere remarks on it.
    const s = 44; const ix = Math.round((W - s) / 2); const iy = 104;
    drawFloppyIcon(ctx, ix, iy, s);
    setFont(ctx, 9);
    ctx.fillStyle = ERA3.phoneText;
    ctx.fillText(FLOPPY_LABEL, Math.round((W - ctx.measureText(FLOPPY_LABEL).width) / 2), iy + s + 6);
    this.phoneRects.push({ x: ix - 8, y: iy - 6, w: s + 16, h: s + 26, id: 'floppy' });

    if (!this.maltaArrived) return;

    const ny = H - 96; const nw = W - 16;
    px(ctx, 8, ny, nw, 80, ERA3.phonePanel);
    setFont(ctx, 10);
    ctx.fillStyle = ERA3.phoneMeta;
    ctx.fillText(d.phone.notificationApp, 15, ny + 8);
    ctx.fillText(d.phone.notificationTime, W - 15 - ctx.measureText(d.phone.notificationTime).width, ny + 8);
    setFont(ctx, 12);
    ctx.fillStyle = ERA3.white;
    ctx.fillText(MALTA.contact, 15, ny + 24);
    setFont(ctx, 11);
    ctx.fillStyle = ERA3.phoneText;
    wrapText(ctx, MALTA.preview, nw - 22).slice(0, 3).forEach((ln, i) => ctx.fillText(ln, 15, ny + 42 + i * 13));
    this.phoneRects.push({ x: 8, y: ny, w: nw, h: 80, id: 'notification' });
  }

  /** two lines from someone doing the same job in another country, and a reply
   *  field that will never be used. No commentary anywhere on this screen. */
  private drawMalta(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    setFont(ctx, 13);
    ctx.fillStyle = ERA3.white;
    ctx.fillText(MALTA.contact, 10, 10);
    setFont(ctx, 9);
    ctx.fillStyle = ERA3.phoneMeta;
    ctx.fillText(MALTA.time, W - 10 - ctx.measureText(MALTA.time).width, 13);
    px(ctx, 0, 30, W, 1, ERA3.phonePanel);

    setFont(ctx, 11);
    let y = 46;
    for (const line of MALTA.lines) {
      const lines = wrapText(ctx, line, W - 42);
      const h = lines.length * 13 + 12;
      px(ctx, 10, y, W - 30, h, ERA3.phonePanel);
      ctx.fillStyle = ERA3.phoneText;
      lines.forEach((ln, i) => ctx.fillText(ln, 16, y + 6 + i * 13));
      y += h + 10;
    }

    // the reply field: active, blinking, empty. Pressing it holds the cursor.
    const fy = H - 40; const fw = W - 20;
    px(ctx, 10, fy, fw, 28, ERA3.phonePanel);
    px(ctx, 10, fy, fw, 1, ERA3.phoneDim);
    if (this.caretOn) px(ctx, 18, fy + 7, 1, 14, ERA3.phoneText);
    this.phoneRects.push({ x: 10, y: fy, w: fw, h: 28, id: 'reply' });
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
   * the same surface that publishes what the laptop corrected is the one where
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
    if (this.mode === 'dark') { px(ctx, 0, 0, W, H, ERA3.taskBot); return; }
    if (this.mode === 'boot') { this.drawBoot(ctx, W, H); return; }
    if (this.mode === 'install') { this.drawInstall(ctx, W, H); return; }
    aero.wallpaper(ctx, W, H);
    aero.taskbar(ctx, W, H, '9:41'); // period placeholder clock, matches the phone's lock-screen clock
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
    const title = this.mode === 'signin' ? q.app.shellTitle : q.app.title;
    const c = aero.windowFrame(ctx, 0, 0, winW, winH, title);
    aero.px(ctx, c.x, c.y, c.w, c.h, ERA3.glass);
    // ⚑ The GUTTER the maximise took away. Windowed, the 14 px of wallpaper on
    //   either side was doing the work of page margin — with the window edge to
    //   edge, right-aligned text (the `n of m applied` counter) ended flush
    //   against the frame and read as clipped. The body still FILLS; only the
    //   layout is inset, which is what a maximised window does anyway.
    const GUTTER = 9;
    const body = { ...c, x: c.x + GUTTER, w: c.w - GUTTER * 2 };

    if (this.mode === 'signin') this.drawSignIn(ctx, body);
    else if (this.mode === 'done') this.drawDone(ctx, body);
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

  private drawDone(ctx: CanvasRenderingContext2D, c: aero.AeroContent): void {
    const CONTENT_W = Math.min(480, c.w - 48);
    const cx = c.x + (c.w - CONTENT_W) / 2;
    setFont(ctx, 22); ctx.fillStyle = ERA3.titleText;
    ctx.fillText(q.app.doneHeading, cx, c.y + 40);
    setFont(ctx, 14); ctx.fillStyle = ERA3.grey;
    ctx.fillText(q.app.doneSub, cx, c.y + 72);
    this.drawLambientLane(ctx, c, this.lambLine);
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
    const sub = this.submission();
    if (!sub) return;
    const GAP = 18;
    const leftW = 350;
    const rightX = c.x + leftW + GAP;
    const rightW = c.x + c.w - rightX;
    // ⚑ the picture sits ABOVE her words, because that is the order she sent
    // them in: she recorded it, and then apologised for it in writing.
    const videoH = sub.video ? VIDEO_BLOCK_H + 10 : 0;
    if (sub.video) this.drawVideo(ctx, c.x, c.y, leftW, sub, sub.video);
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
  private drawVideo(
    ctx: CanvasRenderingContext2D, x: number, y: number, w: number,
    sub: SubmissionDef, video: { label: string; duration: string; beforeLabel: string }
  ): void {
    const graded = this.graded(sub);
    px(ctx, x - 1, y - 1, PLAYER_W + 2, PLAYER_H + 2, ERA3.greyDk);
    drawNoaFrame(ctx, x, y, PLAYER_S, { t: this.playT, graded });
    if (graded) honestLight(ctx, x, y, PLAYER_W, PLAYER_H);
    this.rects.push({ x, y, w: PLAYER_W, h: PLAYER_H, id: 'video' });

    // the column beside the player: what the file is, and — once it has been
    // graded — what it was.
    const x2 = x + PLAYER_W + 12;
    setFont(ctx, 9); ctx.fillStyle = ERA3.grey;
    wrapText(ctx, video.label, x + w - x2).slice(0, 1).forEach(ln => ctx.fillText(ln, x2, y));
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
        : item.grade ? item.grade.note : '';
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

  private drawLambientLane(ctx: CanvasRenderingContext2D, c: aero.AeroContent, line: string): void {
    const h = 30; const y = c.y + c.h - h;
    px(ctx, c.x, y, c.w, h, ERA3.lambBand);
    px(ctx, c.x, y, c.w, 1, ERA3.lambTag);
    this.lambBadge(ctx, c.x + 8, y + 9);
    const tx = aero.tag(ctx, c.x + 22, y + 9, 'LAMBIENT', ERA3.white, ERA3.lambTag);
    setFont(ctx, 11); ctx.fillStyle = ERA3.greyDk;
    wrapText(ctx, line, c.w - (tx - c.x) - 8).slice(0, 1).forEach(ln => ctx.fillText(ln, tx, y + 9));
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
    const r = this.rects.find(rr => hit(rr, x, y));
    if (!r) return;
    if (r.id === 'signin') { this.beginList(); return; }
    if (r.id === 'apply') { this.apply(); return; }
    if (r.id === 'skip') { this.skip(); return; }
    if (r.id === 'video') { this.togglePlay(); return; }
  }

  handlePhoneClick(x: number, y: number): boolean {
    // the game takes the whole screen and the whole thumb while it is open
    if (this.floppy.open) return this.floppy.tap(x, y);
    const r = this.phoneRects.find(rr => hit(rr, x, y));
    if (!r) return false;
    if (r.id === 'notification') { this.openMalta(); return true; }
    if (r.id === 'reply') { this.pressReply(); return true; }
    if (r.id === 'floppy') { this.floppy.openGame(); return true; }
    return false;
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
    switch (beat) {
      case 'signin': this.settleArrival(); break;
      case 'list': this.settleArrival(); this.beginList(); break;
      case 'apply': this.apply(); break;
      case 'skip': this.skip(); break;
      case 'item7': // the hinge: work submission 1 down to its last correction
        this.debugBeat('list');
        applyUntil(() => {
          const sub = this.submission();
          return !sub || sub.id !== 1 || this.items(sub).filter(i => !this.decisions.has(i.id)).length <= 1;
        });
        break;
      case 'noa': // submission 2, both of her corrections open
        this.debugBeat('list');
        applyUntil(() => (this.submission()?.id ?? 99) >= 2);
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
      case 'maltaArrive': // through Noa, so the phone lights the way it does in play
        this.debugBeat('list');
        applyUntil(() => (this.submission()?.id ?? 99) > MALTA_AFTER_SUBMISSION);
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
      case 'floppy': case 'floppyPlay': case 'floppyOver':
        this.floppy.debugBeat(beat); break;
    }
  }
}
