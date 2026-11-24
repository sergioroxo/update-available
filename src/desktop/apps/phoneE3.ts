import mirrorCopy from '../../../data/strings/e3_mirror.json';
/** One private, memory-only phone shared by the stand, held view and desktop mirror.
 * Work beats deliver authored banners. Reading never files, sends or replies;
 * the kit drives the news sequence even when the visitor never opens the phone.
 * Everything here is felt. The platform cannot inspect message contents.
 */

import {
  PHONE, phoneFont, phoneWrap, roundRect, statusBar, appBar, bubble, avatar,
  appTile, wallpaper, furnitureTile, dock, pageDots, dateWidget
} from '../theme/phone';
import { makeE3PhotoSprites } from './e3PhoneSprites';
import { drawFloppyIcon } from './floppysheep';
import { veraDay } from '../../state/veraDay';
import { entriesByEra } from '../../witness/record';
import m from '../../../data/dialog/s3_maiden.json';
import d from '../../../data/strings/era3_devices.json';
import { playOnce } from '../../audio/tapeAudio';
import vera from '../../../data/dialog/s3_vera.json';
import { readHold } from '../readHold';
import { ledger } from '../../state/ledger';
import { reducedMotion } from '../../state/motion';
import { ERA3 } from '../theme/era3';

type Msg = { from: string; time: string; text?: string; kind?: string };
type MirrorEvent = { id: string; time: string; from: string; text: string; photo?: boolean };
type Rect = { x: number; y: number; w: number; h: number; id: string };

const BEFORE = m.before as Msg[];
/** ⚑ S332 — Malta in Bea's thread (s3_maiden.json `news`) and the removals. (⚑ S426: her one reply, "finally. about time x", is
 *  retired — s3_maiden.json `_retiredS426`; her one act is the forward, `FORWARD_LABEL`) */
const NEWS = m.news as Msg[];
const REMOVED_LINE = m.removedLine as string;
/** ⚑ S426 (Act III beats 13–14) — the platform's bar over the thread while it reviews it, and when it has lost; its step label */
const REVIEW_BAR = vera.removals.bar, REVIEW_LOST = vera.removals.lost, REVIEW_REMOVING = vera.removals.removing;
/** ⚑ S426 (beat 14; his call 4) — her one act in the chat */
const FORWARD_LABEL = m.group.forward;
const VERA = 'Vera';
const CASCADE = m.cascade as Msg[];
type Live = Msg & { key: string };
const LINK_VOTE = m.linkVote as { masthead: string; headline: string; fact: string };   // S227 / M1: the never-drawn standfirst and tapHint are gone; ⚑ S426: its fact line (call 3)
const BACKLOG = m.backlog as { from: string; time: string; text: string; register?: string; stampCard?: string; opens?: string; thread?: { time: string; text: string }[] }[];
const UNLOCK_HINT = (m.home as unknown as Record<string, string>).unlockHint;
const HOME = m.home as unknown as Record<string, string>;

/** ⚑ how far the era has got. `quiet` is the phone S64 built — a lock screen
 *  with one game on it and no notifications at all, which is what makes ONE
 *  arriving an event. Every step after that is player-initiated except the
 *  cascade, which is other people. */
/** ⚑ S426 (Act III) — `news` Bea's news landing (beat 11); `read` all of it landed and read: the phone waits while the platform
 *  brings the kit (beat 12); `takeover` the platform reviewing the group, then the forwards (beats 13–14); `after` the forwards in,
 *  the review outnumbered (the last beat). */
type Stage = 'quiet' | 'news' | 'read' | 'takeover' | 'after';
type Screen = 'lock' | 'home' | 'group' | 'inbox' | 'platform' | 'message' | 'walk' | 'personal' | 'notes' | 'photos' | 'photo' | 'evening' | 'article';
/** Lambient's card, and it is the same card whichever way she got here */

/** the cascade's own clock. Messages land ~0.45 s apart — fast enough to read
 *  as more-than-one-person, slow enough that a player can watch names arrive.
 *  ⚑ This is the ONE clocked beat in this module and it bumps only the phone's
 *  version, so it never re-uploads the workstation panel beside it. */
// ⚑ S288 (headset B: "This needs to be a little bit slower because I couldn't read what it was") — 0.45 → 0.9 s a message:
//   still a flood, now one you can read
const CASCADE_STEP = 0.75;
/** ⚑ S332 — Bea's news lands a message at a time; the removals run slower than the forwards (the outnumbering) */
const NEWS_STEP = 1.7;
/** ⚑ S426 (UiB job 35 Part D, Act III beat 13; his 20 Nov 16-17: "the removal should be seen happening") — THE REMOVAL, SEEN. One
 *  message at a time, slowly enough to watch: the platform's outline around it (OUTLINE_S, the outline stepping at OUTLINE_HZ;
 *  still under reduced motion), "removing…" (REMOVING_S), the bubble greyed (GREY_S), then folded into "Removed by GracePlatform";
 *  REVIEW_GAP between one message and the next. The bar is up REVIEW_LEAD before the first outline. (S332's REMOVE_STEP, a strike
 *  every 1.5 s on the Review page, and S332's reply wait are retired: 17847974.) */
const OUTLINE_S = 1.2, REMOVING_S = 1.0, GREY_S = 0.7, REVIEW_GAP = 0.4, REVIEW_LEAD = 2.0, OUTLINE_HZ = 3;
/** ⚑ S426 — what the review removes, in its order: Bea's card first (news[1]), then Bea's lines (news[0], news[2]), then Susan's
 *  (news[3]); Hanne's "read that again susan" is not about Malta in its words and stays. Then the first REVIEW_FORWARDS forwards
 *  (Susan's, Hanne's), and it cannot keep up: the rest stay up. */
const REVIEW_NEWS = ['n1', 'n0', 'n2', 'n3'];
const REVIEW_FORWARDS = 2;
/** ⚑ S219 / W1-B13 — at most one message sound per this many seconds, the repeats at a fraction of the first */
const CASCADE_SOUND_GAP = 1.5;
/** ⚑ S327 / T06 (his 8 Nov: "a Maiden-to-be message popped in while I pressed the testimony editor") — a held message
 *  is delivered only while the platform is AT REST (no job, page or card open, no other voice speaking), and the next
 *  waits this long after the last, so each one is read before the next arrives. */
const READ_HOLD = 6;
/** ⚑ S362 / H28 (his headset, 10 Nov: "Orla's message needs more time"; after "the pastor's wife" the scene "jumped super fast and I lost
 *  my place") — each message is held for as long as it takes to read it, not one length for all. Seconds the platform's other voices
 *  (the next message, the Notes draft, Lambient) wait after it lands. Was 4 s for every one; Mam's (the pastor's wife) is 25 words
 *  and Orla's last one carries a photo. */
const HOLDS: Record<string, number> = { arrival: 8, decision: 9, after: 10 };
/** ⚑ S362 / H28 — Bea's news, at a reading pace: seconds from the one before to each message landing (was a flat 1.7 s each, all five in
 *  7.4 s). The article's card is followed by the article itself, shown by the piece for ARTICLE_HOLD (its entry is the 6.5 s).
 *  ⚑ S368 / F09 (UiB job 16, the reading rule) — S362's [0.6, 5, 6.5, 3.5, 3] still let the article take the glass 5 s after Bea's
 *  23-word message (it needs 11.2 s) and her "i just read it four times" scroll on before it was read. Now each message waits
 *  until the one before it has had its reading time (2 s + 0.4 s a word, never under NEWS_MIN), the article page its own.
 *  The cascade after them stays fast, by design ("outnumbered"). */
const NEWS_FIRST = 0.6;
const NEWS_MIN = 4.5;
function newsWait(i: number): number {
  if (i <= 0) return NEWS_FIRST;
  const prev = NEWS[i - 1];
  if (!prev) return NEWS_STEP;
  // ⚑ S426 — the card is read with its fact line (call 3)
  const text = prev.kind === 'link2' ? [LINK_VOTE.masthead, LINK_VOTE.headline, LINK_VOTE.fact] : prev.kind === 'link' ? [m.link.headline] : [prev.text ?? ''];
  return Math.max(NEWS_MIN, readHold(text));
}
/** ⚑ S362 / H28 + H42 — a note the piece shows her write is TYPED in (it was a block that appeared), then held: seconds in all
 *  ⚑ S368 / F08 — the held part is the reading rule's, counted from the last letter (it was 8 s in all, 3 s after typing)
 *  ⚑ S425 — 9 → 7 letters a second: the glass changes at most 7 times a second while it types (≤ 8 Hz; the caret is solid while
 *  letters come, as a phone's is, and blinks only before the first and after the last) */
const NOTES_TYPE_CPS = 7;
type NoteEntry = { id?: string; title?: string; text: string };
const NOTE_ENTRIES = m.notes.entries as NoteEntry[];
/* Mam's unfinished reply (notes.entries `mam`) — ⚑ S425 (his call 2, 23 Nov: "Mam's unfinished note is already in Vera's Notes,
 *  under her new line. — Yes"): already in her Notes when they open, under the new note; no longer typed after Mam's message
 *  (its MAM_NOTE handle went with that typing; 76d0671d holds it) */
/** ⚑ S404 (UiB job 30 C2) — her newest note, above Mam's, no title: "It wasn't dependency. I was in love with her." */
const REFUSAL_NOTE = NOTE_ENTRIES.find((e) => e.id === 'refusal') ?? null;
/** ⚑ S404 / S425 — the breath, the new note open and empty with its caret, before her first letter */
const REFUSAL_BREATH = 1.2;
/* (⚑ S426 — the takeover's alert, "Intervening now. You do not need to do anything." held by the reading rule before the first
 *  removal (S362/S368's TAKEOVER_ALERT), is retired: its thought is the platform's bar over the thread now. 17847974 holds it.) */
/** ⚑ S357fr / 16-12 (his headset, 20 Nov: "why is the time flying … we should remove this idea of the time jumping"; "No, the
 *  timing flying, I hate it") — THE EVENING'S CLOCK IS A CLOCK. S368 (F05·F10) rolled the one clock (the phone's, read by the
 *  workstation's taskbar too) up to each message's authored time — 18:04 → 18:41 in 13 s, then 19:22, 20:05, 21:41, 22:51 —
 *  and held each message until it got there. Now it starts at EVENING_START with the era and runs a minute a minute, and
 *  every message (tonight's people, Bea's news, her reply, the cascade, Orla's last) is stamped with the minute it actually
 *  lands: nothing waits for the clock, nothing on the glass is from a time the clock has not reached, and the clock never
 *  leaps. (The authored times in e3_mirror.json `slots`/`events` and s3_maiden.json `news`/`cascade`/`reply` are no longer
 *  read for the evening; Deirdre's group's morning, `before`, keeps its own.) */
const EVENING_START = '18:04';
function clockMinutes(t: string): number { const [h, mm] = t.split(':').map(Number); return (h || 0) * 60 + (mm || 0); }
function clockOf(min: number): string { const h = Math.floor(min / 60) % 24, mm = min % 60; return `${h}:${String(mm).padStart(2, '0')}`; }
const CASCADE_REPEAT_VOLUME = 0.4;
/** ⚑ S426 (Act III) — the group drawn at least this wide is the Handset Window maximised: a desktop chat (drawGroup); its
 *  bubbles' words wrap at WIDE_TEXT, its cards are WIDE_CARD wide, and ▲ ▼ stand at the left of a WIDE_GUTTER at its right (the
 *  gutter's outer part is the monitor's edge, cut from view on a phone held upright: nothing of hers or the thread's is put there) */
const WIDE_MIN = 300, WIDE_TEXT = 340, WIDE_CARD = 300, WIDE_GUTTER = 58;

export class PhoneE3 {
  version = 0;
  private screen: Screen = 'lock';
  private stage: Stage = 'quiet';
  /** how many cascade messages have landed */
  private cascadeN = 0;
  private cascadeT = 0;
  /** she opened the link at least once — the record's only branch */
  private opened = false;
  /** the block has been shown for the current stage */
  private readMessages = new Set<string>();
  /** ⚑ S219 / W1-E4·E7 — how many of the group's messages she has SEEN. The badge and the thread's "N new messages" were
   *  computed from the stage alone, so they never fell: opening the thread left "4 new messages", and the cascade's
   *  sixteen stayed counted on the home grid for good. Unread is what has landed and has not yet been on her screen. */
  private groupSeen = 0;
  /** ⚑ S219 / W1-E6 — the card on the glass is a SPENT link being answered, not the stage's own beat: it closes and
   *  moves nothing (no ledger, no lift, no stage) */
  /** ⚑ S227 / M2·M7 (his 2026-10-10: "two sheets, the second shortened") — how many sheets this run has put on the
   *  glass, and whether the one up now is a later one: only the first shows its body; every later one is the title and
   *  the note alone. The ledger lines are untouched. */
  /** S177 — the backlog message open on its own screen (`from + time`), or null */
  private openMessage: string | null = null;
  private rects: Rect[] = [];
  private inboxPage = 0;
  private personalArmed = false;
  get personalSeen(): boolean { return this.readMessages.has('personal'); }
  get personalOpen(): boolean { return this.screen === 'personal'; }
  armPersonal(): void { if (!this.personalArmed) { this.personalArmed = true; this.bump(); } }
  openPersonalThread(): void {
    this.readMessages.add('personal'); veraDay.personalMessageSeen = true;
    this.screen = 'personal'; this.bump();
  }
  closePersonalThread(): void { if (this.personalOpen) { this.screen = 'inbox'; this.bump(); } }
  /** Same phone-owned content on either surface; never installs phone hit rects on the desktop. */
  drawThreadView(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = PHONE.bg; ctx.fillRect(0, 0, W, H);
    const y = appBar(ctx, W, statusBar(ctx, W, this.clockText), m.personalMessage.from);
    phoneFont(ctx, 13); ctx.fillStyle = PHONE.ink;
    let by = y + 18;
    for (const text of m.personalMessage.thread) {
      const lines = phoneWrap(ctx, text, W - 40);
      bubble(ctx, 10, by, W - 20, lines.length * 18 + 20, 'in');
      ctx.fillStyle = PHONE.ink;
      lines.forEach((ln, i) => ctx.fillText(ln, 20, by + 10 + i * 18));
      by += lines.length * 18 + 30;
    }
  }

  /** S158 / R3-66: the phone's clock is the workstation's — one clock for the room */
  constructor(private readonly opts: { onLift(): void; floppyOpen(): boolean; clock?: () => string }) {}
  private get clockText(): string { return this.clockShown; }

  /** ⚑ S426 — an evening message may carry a photo (S368's Orla's last did; it is retired, call 5: e3_mirror.json `_retiredS426events`) */
  private evening: MirrorEvent[] = [];
  private eventQueue: MirrorEvent[] = [];
  private bannerAge = READ_HOLD;
  /** ⚑ S362 / H28 — how long the message now showing is held (HOLDS) */
  private holdFor = READ_HOLD;
  /** ⚑ S327 — set every frame by the platform: nothing is open there and no other voice is speaking */
  atRest = false;
  /**
   * ⚑ S332 — MALTA, conducted: Bea's news begins landing in the group thread (graceQueueLite brings the window forward).
   * ⚑ S426 (UiB job 35 Part D, Act III beat 11, ⟨felt⟩; his 20 Nov 16-16: "I wasn't reading because it didn't allow me to read")
   * — the thread keeps every message and scrolls; each message lands only after the one before has had its reading time (as
   * built); the card carries its fact line and is not a link (call 3: S362's article page, conducted onto the glass for its hold,
   * is retired, and so is opening a card at all); no reply is offered (her reply, S332, is retired). The last message read, the
   * news is `read` and the phone waits: the platform brings the campaign kit (beat 12), then asks for the review (`startReview`).
   * `veraDay.voted` is set once all of it has been read (the map's "Bea's news" beat; it used to be set as the news began).
   */
  startNews(): void {
    if (this.stage !== 'quiet' || this.disconnected) return;
    veraDay.phoneAnswered = true;
    this.stage = 'news'; this.newsT = 0; this.newsN = 0; this.newsPaused = false; this.banner = null;
    this.bump();
  }
  private newsN = 0;
  private newsT = 0;
  /** ⚑ S362 / H43 — how many of Bea's Malta messages have landed (⚑ S426: the room's light lifts on the card, the second) */
  get newsLanded(): number { return this.newsN; }
  /** ⚑ S426 — all of Bea's news has landed and been read: the platform may take the group back to its place and bring the kit */
  get newsDone(): boolean { return this.stage === 'read' || this.stage === 'takeover' || this.stage === 'after'; }
  /** ⚑ S362 / H43 — a hold on the news (one voice at a time). ⚑ S426: nothing sets it in the visit now (the PRIORITY ALERT that
   *  held it is retired); kept for the era jump's reset */
  newsPaused = false;
  private photosFrom: Screen | null = null;
  /** ⚑ S426 — the takeover's alert is retired (its thought is the bar's): never up. Kept false for the probes that read it. */
  get takeoverAlert(): boolean { return false; }
  /** ⚑ S426 — her reply is retired: never offered. Kept false for the probes that read it. */
  get replyOffered(): boolean { return false; }
  private cascadeOn = false;
  private removed = new Set<string>();
  /** ⚑ S426 — the review's clock: < 0 the wait before the next outline (the bar's lead, then REVIEW_GAP); the message in hand */
  private reviewT = 0;
  private reviewing: { key: string; phase: 'outline' | 'removing' | 'grey'; t: number } | null = null;
  /** ⚑ S426 (beat 14; his call 4) — her forward: pressed, and how many of the forwards had landed when it was (it lands among them) */
  private forwarded = false;
  private forwardAt = 0;
  get inTakeover(): boolean { return this.stage === 'takeover' || this.stage === 'after'; }
  /** ⚑ S426 — "↪ Forward the link" is hers while the forwards run and after (never taken away on a timer) */
  get forwardOffered(): boolean { return (this.stage === 'after' || (this.stage === 'takeover' && this.cascadeOn)) && !this.forwarded && !this.disconnected; }
  private liveMsgs(): Live[] {
    // ⚑ S357fr / 16-12 — each at the minute it landed (a review jump that lands them all at once: the clock's minute)
    const at = (key: string): string => this.landedAt.get(key) ?? this.clockShown;
    const out: Live[] = NEWS.slice(0, this.newsN).map((n, i) => ({ ...n, time: at('n' + i), key: 'n' + i }));
    const mine = (): void => { out.push({ from: VERA, time: at('v'), kind: 'link', key: 'v' }); };
    CASCADE.slice(0, this.cascadeN).forEach((c, i) => {
      if (this.forwarded && i === this.forwardAt) mine();
      out.push({ ...c, time: at('c' + i), key: 'c' + i });
    });
    if (this.forwarded && this.forwardAt >= this.cascadeN) mine();
    return out;
  }
  /** ⚑ S426 — what the review removes, in its order (REVIEW_NEWS, then the first REVIEW_FORWARDS forwards); never hers */
  private reviewOrder(): string[] {
    const forwards = CASCADE.flatMap((c, i) => c.from === 'system' ? [] : ['c' + i]).slice(0, REVIEW_FORWARDS);
    return [...REVIEW_NEWS, ...forwards];
  }
  /** the next message the review can reach: the first in its order not yet removed, once it has landed */
  private nextReview(): string | undefined {
    const live = new Set(this.liveMsgs().map(x => x.key));
    const k = this.reviewOrder().find(x => !this.removed.has(x));
    return k && live.has(k) ? k : undefined;
  }
  private get reviewDone(): boolean { return !this.reviewing && this.reviewOrder().every(k => this.removed.has(k)); }
  /** ⚑ S426 — the probes' handle: the message in the review's hand and its step, her forward, how many were removed */
  get reviewState(): { key: string | null; phase: string | null; removed: string[]; forwarded: boolean; forwardOffered: boolean; stage: Stage } {
    return { key: this.reviewing?.key ?? null, phase: this.reviewing?.phase ?? null, removed: [...this.removed], forwarded: this.forwarded, forwardOffered: this.forwardOffered, stage: this.stage };
  }
  /**
   * ⚑ S426 (UiB job 35 Part D, Act III beat 13) — THE REVIEW, asked for by the platform once the kit is closed and the board is
   * clear: the bar lies over the thread (REVIEW_LEAD), then the Malta messages are outlined, "removing…", greyed and folded one
   * at a time; the forwards begin once those four are gone (beat 14). False unless the news has been read and nothing has begun.
   */
  startReview(): boolean {
    if (this.stage !== 'read' || this.disconnected) return false;
    this.stage = 'takeover'; this.reviewT = reducedMotion() ? -REVIEW_LEAD / 2 : -REVIEW_LEAD; this.reviewing = null; this.bump();
    return true;
  }
  /** the outline's step (it marches at OUTLINE_HZ; still under reduced motion): part of what the glass shows, so a change repaints */
  private outlineStep(): number { return this.reviewing && !reducedMotion() ? Math.floor(this.reviewing.t * OUTLINE_HZ) % 2 : 0; }
  /** ⚑ S404 (UiB job 30 C2) — her newest note: seconds into its conduct (−1 when not being written), and whether it is written
   *  (then it is in the Notes for good, and filed once) */
  private refusalT = -1;
  private refusalWritten = false;
  get conductingNotes(): boolean { return this.refusalT >= 0; }
  /** ⚑ S404 — the probes' handle: which note the piece is showing her write ('refusal', or null) and the new one's state
   *  (⚑ S425: Mam's unfinished reply is no longer typed — `writing` is never 'mam' — and nothing waits: `refusalPending` false) */
  get notesNow(): { writing: 'mam' | 'refusal' | null; refusalWritten: boolean; refusalPending: boolean } {
    return { writing: this.refusalT >= 0 ? 'refusal' : null, refusalWritten: this.refusalWritten, refusalPending: false };
  }
  /**
   * ⚑ S425 (UiB job 35 Part D, Act II, storyboard beat 10, ⟨felt⟩; his 20 Nov 16-13/16-14; his call 2) — HER NOTES, ONCE. With
   * her own struck-through 2014 words on Kindredraft's page (⚑ S426: the Handset Window stays in its own column beside it — S425
   * brought it in over the page's right half; his 24 Nov: "misaligned and on top of another layer"), the phone opens
   * her Notes and the newest note is typed at the top, letter by letter (`refusal`, word for word), Mam's unfinished reply and
   * the shopping line already under it. Nothing speaks, no sound, nothing to press (its Back is withheld while it is written).
   * The record files it once, as a gap (witness.residue), as built. Written and held its reading time, the phone goes back to its
   * lock screen, and after a breath the next message may land there (Nuala's). Under reduced motion the note is there whole.
   * (S327/S362/S404's two typings after Mam's message — her unfinished reply typed by itself, then this note — are retired;
   * 76d0671d holds them.) False if there is nothing to write (already written, or the phone is gone).
   */
  conductMemoryNotes(): boolean {
    if (!REFUSAL_NOTE || this.refusalWritten || this.refusalT >= 0 || this.disconnected) return false;
    this.screen = 'notes'; this.openMessage = null; this.banner = null;
    this.refusalT = 0; this.refusalLead = reducedMotion() ? 0 : REFUSAL_BREATH;
    this.bump();
    return true;
  }
  /** ⚑ S404 — seconds of the new note's conduct before its first letter (the breath, its caret blinking in the empty note) */
  private refusalLead = 0;
  /** ⚑ S404 — how many of the new note's letters are written (Infinity once it is; whole at once under reduced motion) */
  private refusalLetters(): number {
    if (this.refusalWritten || (this.refusalT >= 0 && reducedMotion())) return Infinity;
    return this.refusalT < 0 ? 0 : Math.max(0, Math.floor((this.refusalT - this.refusalLead) * NOTES_TYPE_CPS));
  }
  /** ⚑ S425 — what the glass shows of the note being written: its letters, and the caret (solid while letters come; blinking at
   *  2 Hz before the first and after the last; none under reduced motion). The glass is redrawn only when this changes. */
  private notesFrame(): string {
    if (this.refusalT < 0 || !REFUSAL_NOTE) return '';
    const n = Math.min(this.refusalLetters(), REFUSAL_NOTE.text.length);
    return n + '|' + (this.caretShown() ? 1 : 0);
  }
  private caretShown(): boolean {
    if (this.refusalT < 0 || !REFUSAL_NOTE || reducedMotion()) return false;
    const n = this.refusalLetters();
    if (n > 0 && n < REFUSAL_NOTE.text.length) return true;
    return Math.floor(this.refusalT * 2) % 2 === 0;
  }
  /** ⚑ S327 — the cascade, conducted: the group thread is put on the glass while it fills (the piece takes her there) */
  showGroup(): void {
    if (this.disconnected) return;
    this.screen = 'group'; this.openMessage = null; this.banner = null; this.markGroupSeen(); veraDay.phoneAnswered = true; this.bump();
  }
  private eveningFrom = '';
  /** ⚑ S357fr / 16-12 — what the glass and the taskbar read: EVENING_START plus the minutes the era has run, one a minute */
  private clockShown = EVENING_START;
  private clockSec = 0;
  /** ⚑ S357fr / 16-12 — the minute each of the group's live messages landed ('n' + i Bea's news, 'v' her reply, 'c' + i the
   *  cascade), so the thread shows the clock's own time for each, never an authored one ahead of it */
  private landedAt = new Map<string, string>();
  private tickClock(dt: number): void {
    this.clockSec += dt;
    const shown = clockOf(clockMinutes(EVENING_START) + Math.floor(this.clockSec / 60));
    if (shown !== this.clockShown) { this.clockShown = shown; this.bump(); }
  }
  /** ⚑ S357fr / 16-12 — the camera roll's dates; Orla's last photo is dated the minute her message landed */
  private photoDate(i: number): string {
    const after = this.evening.find(e => e.id === 'after');
    return (m.cameraRoll.dates[i] ?? '').replace('{t}', after?.time ?? this.clockShown);
  }
  /** ⚑ S368 / F05 — the phone goes to sleep: its lock screen, nothing over it (the evening passes there, then Orla writes) */
  sleep(): void {
    if (this.disconnected) return;
    this.screen = 'lock'; this.banner = null; this.openMessage = null; this.bump();
  }
  private banner: { from: string; time: string; text: string } | null = null;
  bannersHidden = false;
  arrive(id: string): void {
    const e = mirrorCopy.events.find(e => e.id === id);
    if (!e || [...this.evening, ...this.eventQueue].some(a => a.id === id) || this.disconnected) return;
    this.eventQueue.push(e); this.deliverEvent();
  }
  /** ⚑ S327 — a message is waiting, or the last one is still being read: the platform's other voices wait for it */
  get voiceBusy(): boolean { return this.bannerAge < this.holdFor || (this.atRest && this.eventQueue.length > 0) || this.conductingNotes; }
  get queued(): number { return this.eventQueue.length; }
  /** S336 — diagnosis only: why a queued message is not being delivered */
  debugState(): Record<string, unknown> {
    return { queue: this.eventQueue.map(e => e.id), bannerAge: Math.round(this.bannerAge * 10) / 10, bannersHidden: this.bannersHidden,
      atRest: this.atRest, disconnected: this.disconnected, conductingNotes: this.conductingNotes,
      screen: this.screen, stage: this.stage, delivered: this.evening.map(e => e.id), clock: this.clockShown,
      times: this.evening.map(e => `${e.id} ${e.time}`) };
  }
  delivered(id: string): boolean { return this.evening.some(e => e.id === id); }
  private deliverEvent(): void {
    if (!this.eventQueue.length || this.bannerAge < this.holdFor || this.bannersHidden || !this.atRest || this.disconnected || this.conductingNotes) return;
    const raw = this.eventQueue.shift()!;
    // ⚑ S357fr / 16-12 — each message lands at the clock's own minute (it used to take the evening's next authored slot and
    //   roll the clock up to it). Orla's quiz and her stamp line came at one minute: "should be like one minute less" — the
    //   quiz is stamped a minute before the stamp line that lands under it (never before a message that came ahead of it).
    const now = this.clockShown, last = this.evening[this.evening.length - 1];
    const e = { ...raw, time: raw.id === 'arrival' ? clockOf(Math.max(clockMinutes(now) - 1, last ? clockMinutes(last.time) : 0)) : now };
    // ⚑ S368 / F08 — each message is held at least by the reading rule (2 s + 0.4 s a word), never less than S362's HOLDS
    this.evening.push(e); this.banner = e; this.bannerAge = 0; this.holdFor = Math.max(HOLDS[e.id] ?? READ_HOLD, readHold(e.text ?? ''));
    // ⚑ S327 / T04 (his 8 Nov: "two different messages from Orla, which doesn't make a lot of sense") — ONE banner for
    //   Orla's evening: the stamp line lands in the same thread, quietly, under the quiz message
    if (e.id === 'arrival') { const st = mirrorCopy.events.find(x => x.id === 'stamp'); if (st && !this.delivered('stamp')) this.evening.push({ ...st, time: now }); }
    // (⚑ S425 — Mam's message no longer opens her Notes by itself: her one Notes moment is the memory's, beat 10)
    playOnce('phone_ping_2016.mp3'); this.bump();
  }

  private newsBanner(messages: Msg[]): void {
    const e = messages[messages.length - 1];
    if (this.screen === 'group') { this.banner = null; this.bump(); return; }   // S327: it is landing on the open thread
    // ⚑ S357fr / 16-12 — it has just landed: the banner says the clock's minute, not the message's authored one
    if (e) this.banner = { from: e.from, time: this.clockShown, text: e.text ?? (e.kind === 'link2' ? LINK_VOTE.headline : e.kind === 'link' ? m.link.headline : '') };
    this.bump();
  }
  get eveningClock(): string { return this.clockShown; }
  disconnected = false;
  disconnect(): void { this.disconnected = true; this.evening = []; this.eventQueue = []; this.readMessages.clear(); veraDay.personalMessageSeen = false; this.banner = null; this.openMessage = null; this.refusalT = -1; this.screen = 'lock'; this.bump(); }
  get hitRects(): Rect[] { return this.rects; }
  get unreadCount(): number { return this.inboxBadge; }   // ⚑ S357fr / 16-9: one count, the list's
  private bump(): void { this.version++; }
  get quietReading(): boolean { return this.screen === 'group' || this.screen === 'walk' || this.screen === 'platform' || this.screen === 'article' || this.screen === 'evening' || this.screen === 'photos' || this.screen === 'photo' || this.screen === 'notes' || this.personalOpen || this.screen === 'message' || this.screen === 'inbox'; }
  presentInbox(): void { this.screen = 'inbox'; this.openMessage = null; this.bump(); }


  /** ⚑ S219 — every message of the group's thread that has landed, past the history she already had */
  private groupLanded(): number { return this.newsN + this.cascadeN; }
  private groupUnread(): number { return Math.max(0, this.groupLanded() - this.groupSeen); }
  /** the thread is on her screen: what has landed is seen */
  private markGroupSeen(): void { this.groupSeen = this.groupLanded(); }

  // ── the era drives these ─────────────────────────────────────────────────
  /** ⚑ IGNORING IS NOT A WAY OUT, and this is where that is enforced. Called
   *  when the player finishes another piece of work on the workstation without
   *  having opened the link: Lambient arrives anyway, with the same news, in
   *  the same voice. No timer does this — her own next action does. */
  onWorkDone(): void { /* Private phone reading is never reported to work. */ }

  /** S149 — a card is on the glass (the era's exit waits for it to be dismissed) */
  get cardOpen(): boolean { return false; }

  /** the era asks: is it finished? Used to arm the update that ends Era 3. */
  get broken(): boolean { return this.stage === 'after'; }

  tick(dt: number, visible = true): void {
    this.tickClock(dt);
    if (!this.bannersHidden) { this.bannerAge += dt; this.deliverEvent(); }
    // ⚑ S425 — her newest note, conducted (conductMemoryNotes): typed at ≤ 7 letters a second, the glass redrawn only when what it
    //   shows changes; written, it is filed once (as a gap); held its reading time, the phone goes to its lock screen
    if (this.refusalT >= 0 && REFUSAL_NOTE) {
      const before = this.notesFrame(); this.refusalT += dt;
      if (!this.refusalWritten && this.refusalLetters() >= REFUSAL_NOTE.text.length) {
        // written: it stays in her Notes, and the record files the gap, once (s3_maiden.json witness.residue)
        this.refusalWritten = true;
        if (!ledger.era3Jobs.some((j) => j.id === 'residue')) ledger.era3Jobs.push({ id: 'residue', witness: m.witness.residue });
      }
      const typing = reducedMotion() ? 0 : REFUSAL_NOTE.text.length / NOTES_TYPE_CPS;
      if (this.refusalT >= this.refusalLead + typing + readHold([REFUSAL_NOTE.title ?? '', REFUSAL_NOTE.text])) {
        // "after its reading time the phone goes back to its lock screen" — a breath there before the next message may land
        this.refusalT = -1; this.screen = 'lock'; this.banner = null; this.bannerAge = 0; this.holdFor = 2; this.bump();
      } else if (this.notesFrame() !== before) this.bump();
    }
    // ⚑ S332 — MALTA, the era's own beat (conducted: the platform holds every other voice while it runs).
    // ⚑ S426 (Act III) — news: Bea's messages land one at a time, each after the one before has been read; then `read` (the kit).
    //   takeover: the platform's bar, then each Malta message outlined, "removing…", greyed, folded (one at a time); the forwards
    //   begin once those are gone and land faster than it can follow: it greys the first two and cannot keep up. after: the
    //   forwards in, the review outnumbered.
    if (!visible) return;
    if (this.stage === 'news') {
      if (this.newsPaused) return;
      this.newsT += dt;
      if (this.newsN < NEWS.length) {
        // ⚑ S357fr / 16-12 — Bea's first message no longer waits for the clock to roll up to 21:41: it lands at the clock's minute
        if (this.newsT >= newsWait(this.newsN)) {
          this.newsT = 0; this.newsN++; this.landedAt.set('n' + (this.newsN - 1), this.clockShown);
          if (this.scrollBack > 0) this.scrollBack++;   // she is looking back: what she is reading stays put
          this.newsBanner(NEWS.slice(0, this.newsN));
          if (this.screen === 'group') this.markGroupSeen();
          this.cascadeSound(); this.bump();
        }
        return;
      }
      // the last message (Hanne's) read: the news is in
      if (this.newsT >= newsWait(NEWS.length)) { this.stage = 'read'; veraDay.voted = true; this.bump(); }
      return;
    }
    if (this.stage !== 'takeover' && this.stage !== 'after') return;
    // the review: one message at a time, each step a repaint (the outline's march at OUTLINE_HZ; none under reduced motion)
    if (this.reviewing) {
      const r = this.reviewing, step = this.outlineStep();
      r.t += dt;
      const len = r.phase === 'outline' ? OUTLINE_S : r.phase === 'removing' ? REMOVING_S : GREY_S;
      if (r.t >= len) {
        if (r.phase === 'outline') { r.phase = 'removing'; r.t = 0; }
        else if (r.phase === 'removing') { r.phase = 'grey'; r.t = 0; }
        else { this.removed.add(r.key); this.reviewing = null; this.reviewT = -REVIEW_GAP; }
        this.bump();
      } else if (this.outlineStep() !== step) this.bump();
    } else if (this.stage === 'takeover') {
      this.reviewT += dt;
      if (this.reviewT >= 0) {
        const next = this.nextReview();
        if (next) { this.reviewing = { key: next, phase: 'outline', t: 0 }; this.bump(); }
        else this.reviewT = 0;
      }
    }
    if (!this.cascadeOn && REVIEW_NEWS.every((k) => this.removed.has(k))) { this.cascadeOn = true; this.cascadeT = 0; this.bump(); }
    if (!this.cascadeOn) return;
    this.cascadeT += dt;
    while (this.cascadeT >= CASCADE_STEP && this.cascadeN < CASCADE.length) {
      this.cascadeT -= CASCADE_STEP;
      this.cascadeN++; this.landedAt.set('c' + (this.cascadeN - 1), this.clockShown); this.newsBanner(CASCADE.slice(0, this.cascadeN));
      if (this.scrollBack > 0) this.scrollBack++;
      this.cascadeSound();
      if (this.screen === 'group') this.markGroupSeen();   // it landed under her eyes
      this.bump();
    }
    if (this.stage === 'takeover' && this.cascadeN >= CASCADE.length && this.reviewDone) {
      // the forwards in, and the review stopped where it was: "Review could not keep up."
      this.stage = 'after';
      veraDay.cascadeSeen = true;
      this.bump();
    }
  }

  /** ⚑ S219 / W1-B13 (his walkthrough: "message sounds are too much") — the cascade is sixteen messages 0.45 s apart and each
   *  used to ring. Now a message that lands while the last one is still sounding makes no sound, a repeat inside
   *  `CASCADE_SOUND_GAP` seconds is silent, and the later ones are quieter. The cascade still READS as more-than-one-person
   *  (the thread fills at the same pace); it just stops being a ringing. */
  private lastSound: HTMLAudioElement | null = null;
  private lastSoundAt = -1e9;
  private soundCount = 0;
  private cascadeSound(): void {
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
    const still = this.lastSound && !this.lastSound.ended && !this.lastSound.paused;
    if (still || now - this.lastSoundAt < CASCADE_SOUND_GAP) return;
    const a = playOnce('phone_msg_2016.mp3');
    if (!a) return;
    a.volume = this.soundCount === 0 ? 1 : CASCADE_REPEAT_VOLUME;
    this.soundCount++;
    this.lastSound = a;
    this.lastSoundAt = now;
  }

  // ── the beats ────────────────────────────────────────────────────────────
  /** ⚑ S227 — the phone has moved past Bea's first card (the board may offer an update again; see graceQueueLite) */
  get pastFirst(): boolean { return this.stage !== 'quiet'; }

  /* (⚑ S426 — S219's `openLink`, a press on a card opening the article page, is retired with the page: the cards are not links,
   *  his call 3. 17847974 holds it.) */

  // ── draw ─────────────────────────────────────────────────────────────────
  /**
   * ⚑ EVERY SCREEN BELOW IS DRAWN IN THE PHONE'S OWN GRAMMAR, NOT THE ERA'S.
   * See `src/desktop/theme/phone.ts` for why: a different device by a different
   * maker, in a proportional sans on a light ground, with a status bar, an app
   * bar, bubbles and an icon grid. GracePlatform's Aero blue appears nowhere on
   * this device, and the contrast between the two is the point of having both.
   */
  draw(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.rects = [];
    if (this.disconnected) { ctx.fillStyle = PHONE.ink; ctx.fillRect(0, 0, W, H); return; }
    ctx.fillStyle = PHONE.bg;
    ctx.fillRect(0, 0, W, H);
    // ⚑ S330 (his 8 Nov, twice: "what is this notification box on top of this? … it should be pop in messages on the
    //   phone") — the banner no longer pushes the screen down as a box above the phone. It is drawn OVER the screen,
    //   under the status bar, the way a phone does it; on the lock screen the messages stack as cards instead.
    const bannerH = 0;
    const bodyH = H - bannerH;
    ctx.save(); ctx.beginPath(); ctx.rect(0, bannerH, W, bodyH); ctx.clip(); ctx.translate(0, bannerH);
    // (⚑ S426 — the article page, S362's conducted masthead and headline that read as a blank page, is retired: 17847974)
    if (this.screen === 'evening') { this.drawEvening(ctx, W, bodyH); }
    else if (this.screen === 'personal') { this.drawThreadView(ctx, W, bodyH); this.pushBack(20, 62); }
    else if (this.screen === 'lock') { this.drawLock(ctx, W, bodyH); }
    else if (this.screen === 'photos' || this.screen === 'photo') { this.drawPhotos(ctx, W, bodyH); }
    else if (this.screen === 'notes') { this.drawNotes(ctx, W, bodyH); }
    else if (this.screen === 'group') { this.drawGroup(ctx, W, bodyH); }
    else if (this.screen === 'platform') { this.drawPlatform(ctx, W, bodyH); }
    else if (this.screen === 'inbox') { this.drawInbox(ctx, W, bodyH); }
    else if (this.screen === 'message') { this.drawMessage(ctx, W, bodyH); }
    else if (this.screen === 'walk') { this.drawWalk(ctx, W, bodyH); }
    else { this.drawHome(ctx, W, bodyH); }
    ctx.restore();
    this.rects = this.rects.map(r => ({ ...r, y: r.y + bannerH }));
    // ⚑ S281 — THE GLOW LOGIC on her phone (his 1 Nov: "FloppySheep and the message app should slightly glow
    //   differently so we can understand where we need to go"): the warm ring on the one thing the phone is waiting
    //   on, the pale shimmer on the game that is only ever hers to open. Drawn with the screen (no animation).
    // ⚑ the sheet is drawn OVER whatever is behind it, the way a phone does it
    if (!this.conductingNotes) this.drawBanner(ctx, W);
    // ⚑ S327 / T31 (his 8 Nov: "it has two back buttons, one on the top, one down… this is a mistake") — ONE back: the
    //   chevron on each screen's own app bar. The second, drawn at the foot, is gone, and so is "Reply on your phone"
    //   (T05: "it doesn't really work, and it should be removed") — she reads here; she does not write.
    if (this.conductingNotes) this.rects = this.rects.filter(r => r.id !== 'back');
    this.rects = this.rects.flatMap(r => {
      const x = Math.max(0, r.x), y = Math.max(0, r.y), right = Math.min(W, r.x + r.w), bottom = Math.min(H, r.y + r.h);
      return right > x && bottom > y ? [{ ...r, x, y, w: right - x, h: bottom - y }] : [];
    });
  }

  /** S281 — what the phone is waiting on, screen by screen: the notification, then Messages, then the group, then the
   *  live link. Nothing once the group's news is all seen and the link is spent. */

  /** A second viewport shares state, but must not replace the physical screen's hit geometry. */
  drawMirrored(ctx: CanvasRenderingContext2D, W: number, H: number): Rect[] {
    const physical = this.rects;
    this.draw(ctx, W, H);
    const mirrored = this.rects;
    this.rects = physical;
    return mirrored;
  }
  private openEvening(from: string): void {
    this.scrollBack = 0;
    this.eveningFrom = from; this.screen = from === m.group.name ? 'group' : 'evening';
    if (this.banner?.from === from) this.banner = null;   // S327: opened, the notification has done its job
    for (const e of this.evening.filter(e => e.from === from)) this.readMessages.add('evening:' + e.id);
    // ⚑ S357fr / 16-9 — her older messages from them are in the same thread (drawEvening): on the glass now, so read
    for (const b of BACKLOG.filter(b => b.from === from)) this.readMessages.add(b.from + b.time);
    if (from === m.personalMessage.from) { this.readMessages.add('personal'); veraDay.personalMessageSeen = true; }
    if (this.screen === 'group') this.markGroupSeen();
    this.bump();
  }
  /** ⚑ S327 — ONE thread per person: what she already had from them (the backlog) above what arrived tonight, the
   *  newest at the foot like any messaging app, the oldest dropping off the top when the glass is full */
  private drawEvening(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const y0 = statusBar(ctx, W, this.clockText);
    const top = appBar(ctx, W, y0, this.eveningFrom);
    this.pushBack(y0, top);
    const items: { text: string; time: string; photo?: boolean; opens?: string }[] = [];
    for (const b of BACKLOG.filter(b => b.from === this.eveningFrom)) for (const t of b.thread ?? [{ time: b.time, text: b.text }]) items.push({ ...t, opens: b.opens });
    for (const e of this.evening.filter(e => e.from === this.eveningFrom)) items.push({ text: e.text, time: e.time, photo: !!e.photo });
    phoneFont(ctx, 13);
    const sized = items.map(it => ({ it, lines: phoneWrap(ctx, it.text, W - 42), h: 0 }));
    for (const s of sized) s.h = s.lines.length * 17 + 14 + (s.it.photo ? 104 : 0) + 14;
    const win = this.scrollWindow(sized.map(s => s.h), top + 6, H - 8);
    this.drawScrollPills(ctx, W, top, H - 8, win);
    let y = win.y;
    const shown = sized.slice(win.from, win.to);
    for (const s of shown) {
      const bh = s.lines.length * 17 + 10;
      bubble(ctx, 10, y, W - 22, bh, 'in');
      phoneFont(ctx, 13); ctx.fillStyle = PHONE.ink;
      s.lines.forEach((ln, i) => ctx.fillText(ln, 19, y + 5 + i * 17));
      let yy = y + bh + 2;
      if (s.it.photo) {
        this.photoSprites ??= makeE3PhotoSprites(m.cameraRoll.busText); ctx.drawImage(this.photoSprites[4], 12, yy, 100, 100);
        this.rects.push({ x: 12, y: yy, w: 100, h: 100, id: 'open-photo-4' });   // ⚑ S362 / H45 — the photo in the thread opens in Photos
        yy += 104;
      }
      phoneFont(ctx, 10); ctx.fillStyle = PHONE.dim; ctx.fillText(s.it.time, 14, yy);
      // ⚑ S362 / H45 (his headset, 10 Nov: the photo message — "opening Orla goes to the files with the photos") — a message that
      //   is about a photo opens the Photos app on the phone's own camera roll; the bubble is the press, "Photos ›" says so
      if (s.it.opens === 'photos') {
        phoneFont(ctx, 11, 600); ctx.fillStyle = PHONE.tint;
        const lab = HOME.openPhotos, lw = ctx.measureText(lab).width;
        ctx.fillText(lab, W - 14 - lw, yy - 1);
        this.rects.push({ x: 10, y, w: W - 22, h: bh + 18, id: 'open-photos' });
      }
      y += s.h;
    }
  }
  private get bannerPhoto(): boolean { return this.evening.some(e => e === this.banner && e.photo === true); }
  private drawBanner(ctx: CanvasRenderingContext2D, W: number): void {
    if (!this.banner || this.bannersHidden) return;
    if (this.screen === 'lock') return;   // S330: the lock screen shows its messages as stacked cards (drawLock)
    phoneFont(ctx, 12);
    const x = 6, y = 22, w = W - 12;
    const lines = phoneWrap(ctx, this.banner.text, w - 20).slice(0, 3);
    const h = 32 + lines.length * 16 + (this.bannerPhoto ? 78 : 0);
    roundRect(ctx, x, y + 1, w, h, 10, PHONE.dim);   // a hairline shadow under the card
    roundRect(ctx, x, y, w, h, 10, PHONE.surface);
    ctx.fillStyle = PHONE.ink; phoneFont(ctx, 12, 600); ctx.fillText(this.banner.from, x + 10, y + 8);
    phoneFont(ctx, 10); ctx.fillStyle = PHONE.dim; ctx.fillText(this.clockShown, x + w - 36, y + 8);
    phoneFont(ctx, 12); ctx.fillStyle = PHONE.ink; lines.forEach((line, i) => ctx.fillText(line, x + 10, y + 28 + i * 16));
    if (this.bannerPhoto) {
      this.photoSprites ??= makeE3PhotoSprites(m.cameraRoll.busText); ctx.drawImage(this.photoSprites[4], x + 10, y + 32 + lines.length * 16, 72, 72);
    }
    this.rects.unshift({ x, y, w, h, id: 'evening-banner' });
  }

  /** S330 — the lock screen's messages, newest first, as cards on the wallpaper (one card per person). */
  private drawLockCards(ctx: CanvasRenderingContext2D, W: number, H: number, top: number): number {
    // one card per person, newest person first; the card shows that person's FIRST line (Orla's quiz, not her
    // afterthought) and how many more wait, the way a lock screen groups a thread
    const byFrom = new Map<string, { from: string; time: string; text: string; more: number; last: number; photo?: boolean }>();
    this.evening.forEach((ev, i) => {
      const e = ev as { id?: string; from: string; time: string; text?: string; photo?: boolean };
      const c = byFrom.get(e.from);
      // ⚑ S368 / F05 — a message hours later is news of its own: Orla's 22:51 "missed you tonight x" is what her card shows
      //   (with "Photo" under it), not her 18:04 quiz; the earlier lines are counted (+N) as before
      if (c && e.id === 'after') { c.more++; c.time = e.time; c.last = i; c.text = e.text ?? ''; c.photo = !!e.photo; }
      else if (c) { c.more++; c.time = e.time; c.last = i; }
      else byFrom.set(e.from, { from: e.from, time: e.time, text: e.text ?? '', more: 0, last: i, photo: !!e.photo });
    });
    const cards = [...byFrom.values()].sort((a, b) => b.last - a.last).slice(0, 3);
    let y = top;
    for (const c of cards) {
      phoneFont(ctx, 12); const lines = phoneWrap(ctx, c.text, W - 40).slice(0, 2);
      if (c.photo) lines.push(HOME.photoLine ?? 'Photo');
      const h = 30 + lines.length * 16;
      if (y + h > H - 48) break;
      roundRect(ctx, 10, y, W - 20, h, 8, PHONE.surface);
      ctx.fillStyle = PHONE.ink; phoneFont(ctx, 12, 600); ctx.fillText(c.from, 20, y + 7);
      phoneFont(ctx, 10); ctx.fillStyle = PHONE.dim; ctx.fillText(c.time, W - 48, y + 8);
      phoneFont(ctx, 12); lines.forEach((line, i) => { ctx.fillStyle = c.photo && i === lines.length - 1 ? PHONE.dim : PHONE.ink; ctx.fillText(line, 20, y + 26 + i * 16); });
      if (c.more) { phoneFont(ctx, 10); ctx.fillStyle = PHONE.dim; ctx.fillText(`+${c.more}`, W - 34, y + h - 16); }
      this.rects.push({ x: 10, y, w: W - 20, h, id: `lock-card:${c.from}` });
      y += h + 6;
    }
    return y;
  }

  private drawLock(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    wallpaper(ctx, W, H);
    statusBar(ctx, W, this.clockText);
    phoneFont(ctx, 40, 400);
    ctx.fillStyle = PHONE.surface;
    const cw = ctx.measureText(this.clockText).width;
    ctx.fillText(this.clockText, Math.round((W - cw) / 2), 52);
    phoneFont(ctx, 12);
    const dw = ctx.measureText(d.phone.lockDate).width;
    ctx.fillText(d.phone.lockDate, Math.round((W - dw) / 2), 100);

    // ⚑ S150 — A DRAWN UNLOCK (OPEN_ITEMS R3-77). The press area was there and
    //   nothing showed it (Sérgio: "I need a button to unlock the screen"): a
    //   pill at the bottom of the glass, the phone's own surface on its own
    //   wallpaper, with the hint inside it. Same rect, now a thing you can see.
    const unlockPill = (): void => {
      phoneFont(ctx, 12, 600);
      const uw = Math.ceil(ctx.measureText(UNLOCK_HINT).width) + 28;
      const ux = Math.round((W - uw) / 2), uy = H - 40;
      roundRect(ctx, ux, uy, uw, 26, 13, PHONE.surface);
      ctx.fillStyle = PHONE.ink;
      ctx.fillText(UNLOCK_HINT, ux + 14, uy + 8);
      this.rects.push({ x: ux, y: uy, w: uw, h: 26, id: 'unlock' });
    };
    this.drawLockCards(ctx, W, H, 120);
    unlockPill();
  }

  /** ⚑ AN ICON GRID ON A WALLPAPER — the single thing that most makes a screen
   *  read as a phone rather than as a window with rows in it. Four apps, and
   *  only one of them wants anything from her. */
  private photoSprites: HTMLCanvasElement[] | null = null;
  private photoIndex = 0;
  private photoPage = 0;
  private drawPhotos(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.photoSprites ??= makeE3PhotoSprites(m.cameraRoll.busText);
    ctx.fillStyle = PHONE.surface; ctx.fillRect(0, 0, W, H);
    const y0 = statusBar(ctx, W, this.clockText);
    const top = appBar(ctx, W, y0, HOME.fPhotos); this.pushBack(y0, top);
    ctx.save(); ctx.imageSmoothingEnabled = false;
    if (this.screen === 'photo') {
      const size = Math.max(20, Math.min(144, H - top - 70)), x = Math.round((W - size) / 2), y = top + 20;
      ctx.drawImage(this.photoSprites[this.photoIndex], x, y, size, size);
      phoneFont(ctx, 11); ctx.fillStyle = PHONE.dim;
      ctx.fillText(this.photoDate(this.photoIndex), Math.max(52, x), y + size + 12);
    } else {
      const sprites = this.photoSprites.slice(0, this.evening.some(e => e.id === 'after') ? 5 : 4);
      const perPage = H < 260 ? 2 : 4, pages = sprites.length;
      this.photoPage = Math.min(this.photoPage, pages - 1);
      sprites.slice(this.photoPage, this.photoPage + perPage).forEach((sprite, n) => {
        const i = this.photoPage + n;
        const size = Math.max(20, Math.min(H < 300 ? 56 : 72, H - top - 76));
        const x = 12 + (n % 2) * 84, y = top + 12 + Math.floor(n / 2) * (size + 18);
        ctx.drawImage(sprite, x, y, size, size);
        phoneFont(ctx, 10); ctx.fillStyle = PHONE.dim; ctx.fillText(this.photoDate(i), x, y + size + 5);
        this.rects.push({ x, y, w: size, h: size + 14, id: 'photo-' + i });
      });
      phoneFont(ctx, 14); ctx.fillStyle = PHONE.tint;
      if (this.photoPage > 0) { ctx.fillText(m.home.previousPage, 62, H - 22); this.rects.push({ x: 50, y: H - 32, w: 50, h: 30, id: 'photos-prev' }); }
      if (this.photoPage < pages - 1) { ctx.fillText(m.home.nextPage, W - 24, H - 22); this.rects.push({ x: W - 50, y: H - 32, w: 50, h: 30, id: 'photos-next' }); }
    }
    ctx.restore();
  }

  private drawNotes(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = PHONE.surface; ctx.fillRect(0, 0, W, H);
    const y0 = statusBar(ctx, W, this.clockText);
    let y = appBar(ctx, W, y0, HOME.fNotes);
    this.pushBack(y0, y);
    // which notes are on the glass, newest first, and how much of each is written:
    //   · ⚑ S425 (beat 10; his call 2) — while the piece shows her new note, the new note at the top, opened empty with the caret
    //     for a breath, then typing; under it, already there, Mam's unfinished reply and the shopping line (the whole list);
    //   · otherwise the Notes as she keeps them: the new note only once she has written it.
    //   (S362's Mam's reply typed alone after Mam's message, and S404's two-note conduct, are retired at S425.)
    const shown: { entry: NoteEntry; letters: number; caret: boolean }[] =
      this.refusalT >= 0 && REFUSAL_NOTE ? [{ entry: REFUSAL_NOTE, letters: this.refusalLetters(), caret: this.caretShown() },
        ...NOTE_ENTRIES.filter((e) => e !== REFUSAL_NOTE).map((entry) => ({ entry, letters: Infinity, caret: false }))]
        : NOTE_ENTRIES.filter((e) => e !== REFUSAL_NOTE || this.refusalWritten).map((entry) => ({ entry, letters: Infinity, caret: false }));
    for (const { entry, letters, caret } of shown) {
      y += 12;
      if (entry.title) {
        phoneFont(ctx, 14, 600); ctx.fillStyle = PHONE.ink;
        ctx.fillText(entry.title, 12, y); y += 21;
      }
      phoneFont(ctx, 13); ctx.fillStyle = PHONE.ink;
      // ⚑ S362 / H42 (his headset: "it should appear differently", not as a sudden block) — while the piece shows this draft it
      //   TYPES itself in, the way a note being written does (lines wrapped on the whole text, so words never jump), caret last
      let left = letters;
      let tail = '', tailY = y;
      // ⚑ S404 — her new note keeps its two sentences on their own lines (she starts the second on a new line); the others wrap
      const rows = entry === REFUSAL_NOTE ? entry.text.split(/(?<=[.!?])\s+/).flatMap((t) => phoneWrap(ctx, t, W - 24)) : phoneWrap(ctx, entry.text, W - 24);
      for (const line of rows) {
        const seg = line.slice(0, Math.max(0, left)); left -= line.length + 1;
        if (seg) { ctx.fillText(seg, 12, y); tail = seg; tailY = y; }
        y += 18;
      }
      if (caret) {
        ctx.fillStyle = PHONE.ink; ctx.fillRect(12 + Math.ceil(ctx.measureText(tail).width) + 1, tailY, 1, 14);
      }
      y += 12; ctx.fillStyle = PHONE.hairline; ctx.fillRect(12, y, W - 24, 1);
    }
  }

  private drawHome(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    wallpaper(ctx, W, H);
    statusBar(ctx, W, this.clockText);

    // ⚑ the at-a-glance card, and it is quietly the worst line on the device:
    //   "No events today", on the day the era ends.
    if (H >= 300) dateWidget(ctx, 10, 24, W - 20, HOME.widgetWeekday, HOME.widgetDate, HOME.widgetNote);


    // ⚑ FOUR COLUMNS AT PHONE DENSITY, not a 2×2 of billboards. The four apps
    //   that matter sit in the first row and everything under them is set
    //   dressing — a phone is mostly things you are not opening right now, and
    //   that is what makes the four legible rather than what buries them.
    const compact = H < 230;
    const s = compact ? 24 : 32;
    const gap = Math.round((W - s * 4) / 5);
    const col = (i: number): number => gap + i * (s + gap);
    const rowY = (r: number): number => (H >= 300 ? 84 : compact ? 24 : 32) + r * (s + (compact ? 16 : 22));

    // ⚑ S158 / R3-78 (Sérgio: "I need the home screen and a Messages app to enter the chat"):
    //   the first tile is THE PLATFORM's own app (it says she is signed in on the workstation
    //   and sends her back to it); the group is reached through MESSAGES, where its thread
    //   sits at the top with its unread count over the backlog.
    appTile(ctx, col(0), rowY(0), s, PHONE.tileGroup, 'chat', HOME.shortPlatform, '');
    this.rects.push({ x: col(0), y: rowY(0), w: s, h: s + 12, id: 'platform' });

    // ⚑ S357fr / 16-9 — the badge is what the Messages list itself declares unread (inboxRows), not the backlog alone
    const unreadAll = this.inboxBadge;
    appTile(ctx, col(1), rowY(0), s, PHONE.tileMail, 'mail', m.home.messagesLabel,
      unreadAll ? String(unreadAll) : '');
    this.rects.push({ x: col(1), y: rowY(0), w: s, h: s + 12, id: 'inbox' });

    // ⚑ FloppySheep gets its OWN icon — the sheep on its hill under its sky,
    //   which has existed in `floppysheep.ts` since S70 and which the first
    //   home screen replaced with a generic gamepad for no reason at all.
    //   Clipped into the plate's rounded corners so it reads as an app.
    ctx.save();
    // ⚑ clipped to the ROUNDED path, not to a square: a square clip left the
    //   sheep's sky with hard corners inside a rounded plate, which is the one
    //   detail that makes an icon look pasted on rather than made.
    const fx = col(2); const fy = rowY(0); const fr = Math.round(s * 0.24);
    ctx.beginPath();
    ctx.moveTo(fx + fr, fy);
    ctx.arcTo(fx + s, fy, fx + s, fy + s, fr);
    ctx.arcTo(fx + s, fy + s, fx, fy + s, fr);
    ctx.arcTo(fx, fy + s, fx, fy, fr);
    ctx.arcTo(fx, fy, fx + s, fy, fr);
    ctx.closePath();
    ctx.clip();
    drawFloppyIcon(ctx, fx, fy, s);
    ctx.restore();
    phoneFont(ctx, 9);
    ctx.fillStyle = PHONE.surface;
    // ⚑ the SHORT label. "FloppySheep" at a 32 px column ran into Messages on
    //   one side and Live on the other — a home screen truncates, it does not
    //   overlap, and the full name is on the game's own screen anyway.
    const flabel = HOME.shortFloppy;
    const fw = ctx.measureText(flabel).width;
    ctx.fillText(flabel, fx + (s - fw) / 2, fy + s + 3);
    this.rects.push({ x: col(2), y: rowY(0), w: s, h: s + 12, id: 'floppy' });

    // ⚑ the stream has no caption any more. "Nobody asked you to watch this"
    //   was the piece talking over its own observation; the fact that it is
    //   running and she never opens it is the observation, and it does not
    //   need a label. A live dot is all it gets.
    appTile(ctx, col(3), rowY(0), s, PHONE.tileLive, 'live', HOME.shortStream, '');
    ctx.fillStyle = PHONE.badge;
    ctx.beginPath(); ctx.arc(col(3) + s - 5, rowY(0) + 5, 3, 0, Math.PI * 2); ctx.fill();
    // ⚑ S358 / H11 (his headset, 10 Nov: "a 'live' button goes nowhere") — it is not a button any more: no press, no
    //   ray outline, like the camera and the clock beside it. It runs; she never opens it; that is the observation.

    const furniture = [
      ['camera', HOME.fCamera], ['clock', HOME.fClock],
      ['calendar', HOME.fCalendar], ['settings', HOME.fSettings],
      ['photos', HOME.fPhotos], ['weather', HOME.fWeather],
      ['notes', HOME.fNotes], ['files', HOME.fFiles]
    ] as const;
    furniture.forEach(([kind, label], i) => {
      // ⚑ S181 / R5-04 — the last tile is the accountability app: her file, on her phone
      const walk = kind === 'files';
      furnitureTile(ctx, col(i % 4), rowY(1 + Math.floor(i / 4)), s, kind, walk ? HOME.fWalk : label);
      if (kind === 'photos') this.rects.push({ x: col(i % 4), y: rowY(1 + Math.floor(i / 4)), w: s, h: s + 12, id: 'photos' });
      if (kind === 'notes') this.rects.push({ x: col(i % 4), y: rowY(1 + Math.floor(i / 4)), w: s, h: s + 12, id: 'notes' });
      if (walk) this.rects.push({ x: col(i % 4), y: rowY(1 + Math.floor(i / 4)), w: s, h: s + 12, id: 'walk' });
    });

    if (compact) return;
    pageDots(ctx, W, H - 56, 2, 0);
    const dy = dock(ctx, W, H);
    ([['phone', 0], ['browser', 1], ['music', 2], ['maps', 3]] as const)
      .forEach(([kind, i]) => furnitureTile(ctx, col(i), dy + 7, s, kind));
  }

  /** ⚑ THE GROUP, as a messaging app — and every bubble is on the LEFT.
   *
   *  In any real thread your own words run down the right-hand side. Vera's
   *  right-hand side is EMPTY, for the whole length of the era, because she
   *  never writes anything here. The composer sits at the bottom with its
   *  placeholder showing. Nothing points at this and nothing ever mentions it. */
  /** ⚑ S208 / A20 (REVIEW_ROUND_5, ERA16-15) — the header counts the people the cascade adds ("Aoife was added",
   *  "3 people were added"): the ending is people joining, and the group's own number should say so */
  private membersMeta(): string {
    let n = parseInt(m.group.meta, 10) || 0;
    const shown = CASCADE.slice(0, this.cascadeN);
    for (const c of shown) {
      const t = (c as { text?: string }).text ?? '';
      const k = t.match(/^(\d+) people were added/);
      if (k) n += Number(k[1]); else if (/ was added$/.test(t)) n += 1;
    }
    return m.group.meta.replace(/^\d+/, String(n));
  }

  // ⚑ S362 / H40 — the thread's type is 13 px on 17 px lines (was 11 on 14), the names above bubbles and the time stamps 10 (was 8): fewer
  //   words to a line, a taller thread, and the scroll pills (S358 / H13) carry the rest.
  /**
   * ⚑ S426 (UiB job 35 Part D, Act III; his 20 Nov 16-16, "I wasn't reading because it didn't allow me to read") — THE GROUP, WIDE.
   * Drawn at WIDE_MIN or more (the Handset Window opened wide in the board's place, graceQueueLite `mirrorWide`), the same thread is
   * a desktop chat: the group's own header (no status bar, and no back while the piece holds the thread there), bubbles no wider than
   * WIDE_TEXT (smaller bubbles: more of the thread in view, the morning's messages above), ▲ ▼ in a gutter at the right to look back
   * a screenful and come forward again (presses only). Narrow (the phone itself, the window in its column) it is as built.
   * Over both: the platform's bar while it reviews the group (its blue), each Malta message outlined, "removing…", greyed and folded
   * (beat 13); her chip "↪ Forward the link" in the composer's place while the forwards run and after (beat 14).
   */
  private wideNow = false;
  private drawGroup(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const wide = this.wideNow = W >= WIDE_MIN;
    const CW = wide ? W - WIDE_GUTTER : W;   // the thread's own width (wide: the arrows' gutter at the right)
    ctx.fillStyle = PHONE.bg; ctx.fillRect(0, 0, W, H);
    let top: number;
    if (wide) {
      const hh = 34;
      ctx.fillStyle = PHONE.bar; ctx.fillRect(0, 0, W, hh); ctx.fillStyle = PHONE.hairline; ctx.fillRect(0, hh - 1, W, 1);
      phoneFont(ctx, 15, 600); ctx.fillStyle = PHONE.ink; ctx.fillText(m.group.name, 14, 9);
      const nw = Math.ceil(ctx.measureText(m.group.name).width);
      phoneFont(ctx, 11); ctx.fillStyle = PHONE.dim; ctx.fillText(this.membersMeta(), 14 + nw + 10, 12);
      top = hh;
    } else {
      const y0 = statusBar(ctx, W, this.clockText);
      top = appBar(ctx, W, y0, m.group.name, this.membersMeta());
      this.pushBack(y0, top);
    }

    // ⚑ S426 (beat 13) — the platform's bar over the thread while it reviews it, in its blue; "Review could not keep up." once the
    //   forwards are in (S332's "Review is still running." / "{n} items could not be reviewed" are retired)
    if (this.inTakeover) {
      const fs = wide ? 11 : 10, lead = fs + 3;
      phoneFont(ctx, fs, 600);
      const lines = phoneWrap(ctx, this.stage === 'after' ? REVIEW_LOST : REVIEW_BAR, W - 20);
      const bh = 8 + lines.length * lead;
      ctx.fillStyle = ERA3.accent; ctx.fillRect(0, top, W, bh);
      ctx.fillStyle = PHONE.surface; lines.forEach((ln, i) => ctx.fillText(ln, 10, top + 4 + i * lead));
      top += bh;
    }

    const msgs: Live[] = [
      ...BEFORE.map((b, i) => ({ ...b, key: 'b' + i })),
      ...this.evening.filter(e => e.from === m.group.name).map(e => ({ from: e.from, time: e.time, text: e.text, key: 'e' + e.id })),
      ...this.liveMsgs()
    ];

    // the composer's place: empty all era; ⚑ S426 (beat 14; his call 4) — her one act, while the forwards run and after
    const cy = H - 30;
    if (this.forwardOffered) {
      phoneFont(ctx, 12, 600);
      const tw = Math.ceil(ctx.measureText(FORWARD_LABEL).width);
      const cw = Math.min(CW - 20, tw + 28), cx = CW - 10 - cw;
      ctx.fillStyle = PHONE.hairline; ctx.fillRect(0, cy - 6, W, 1);
      roundRect(ctx, cx, cy, cw, 24, 12, PHONE.bubbleOut);
      ctx.fillStyle = PHONE.surface; ctx.fillText(FORWARD_LABEL, cx + 14, cy + 6);
      this.rects.push({ x: cx, y: cy, w: cw, h: 24, id: 'forward-link' });
    }

    // ⚑ bottom-up fill, and the guard tests the PROSPECTIVE position so the
    //   topmost bubble can never slide under the bar above it.
    const heights = msgs.map(msg => (this.removed.has(msg.key) ? 22 : this.msgHeight(ctx, msg, CW)) + 6);   // S426: a folded line keeps 4 px for the name over the next
    let win = this.scrollWindow(heights, top + 4, cy - 8, !wide);
    // ⚑ S426 (beat 13: "one message at a time, slowly enough to watch") — the review takes her to the Malta message in its hand: if
    //   it is not whole in view, the thread scrolls to it (setting aside the fewest newer messages that keep it in view). Once the
    //   forwards come the thread follows the newest again, and the review's marks are pushed up by them (beat 14: it cannot keep
    //   up). ▲ ▼ are hers throughout.
    const inHand = this.reviewing && !this.cascadeOn ? msgs.findIndex((x) => x.key === this.reviewing!.key) : -1;
    if (inHand >= 0 && !(win.from <= inHand && inHand < win.to)) {
      for (let end = msgs.length; end > inHand; end--) {
        this.scrollBack = msgs.length - end;
        win = this.scrollWindow(heights, top + 4, cy - 8, !wide);
        if (win.from <= inHand) break;
      }
      this.scrollByPiece = this.scrollBack > 0;
    } else if (inHand < 0 && this.scrollByPiece && this.cascadeOn) {
      this.scrollBack = 0; this.scrollByPiece = false; win = this.scrollWindow(heights, top + 4, cy - 8, !wide);
    }
    const drawn: { y: number; h: number; msg: Live }[] = [];
    let y = win.y;
    // ⚑ S426 — the message above the first whole one is drawn too, its top cut by the bar (a thread that scrolls, not a gap)
    if (win.from > 0) drawn.push({ y: y - heights[win.from - 1], h: heights[win.from - 1] - 6, msg: msgs[win.from - 1] });
    for (let i = win.from; i < win.to; i++) { drawn.push({ y, h: heights[i] - 6, msg: msgs[i] }); y += heights[i]; }
    let lastFrom = '';
    const firstWhole = win.from > 0 ? 1 : 0;   // ⚑ S426 — the first whole message in view says who wrote it (the one above is cut)
    ctx.save(); ctx.beginPath(); ctx.rect(0, top, W, cy - 8 - top); ctx.clip();   // ⚑ S362 / H40 — a message taller than the window is clipped, not drawn over the bars
    for (const [k, { y: my, msg }] of drawn.entries()) {
      if (k === firstWhole) lastFrom = '';
      if (this.removed.has(msg.key)) {
        // ⚑ the platform reached into her phone: the bubble stays, emptied, in the system's grey
        phoneFont(ctx, 10);
        const tw = Math.min(CW - 44, ctx.measureText(REMOVED_LINE).width + 16);
        const rx = msg.from === VERA ? CW - 10 - tw : 30;
        roundRect(ctx, rx, my, tw, 18, 9, PHONE.hairline);
        ctx.fillStyle = PHONE.dim; ctx.fillText(REMOVED_LINE, rx + 8, my + 4);
        lastFrom = msg.from; continue;
      }
      const rv = this.reviewing?.key === msg.key ? this.reviewing : null;
      const box = msg.from === VERA ? this.drawMine(ctx, msg, my, CW) : this.drawMsg(ctx, msg, my, CW, msg.from !== lastFrom, rv?.phase === 'grey');
      if (rv && box) this.drawReviewMark(ctx, box, rv.phase);
      lastFrom = msg.from;
    }
    ctx.restore();
    // the ways to look back, over the thread (⚑ S426: drawn after it, so the cut message above lies under the pill)
    if (wide) this.drawScrollArrows(ctx, W, top, cy - 8, win); else this.drawScrollPills(ctx, W, top, cy - 8, win);
  }
  /** ⚑ S426 — the thread was scrolled by the review (to the message in its hand), not by her */
  private scrollByPiece = false;

  /** ⚑ S426 (beat 13) — the platform's hand on a message: its outline (dashed, marching at OUTLINE_HZ; still under reduced motion),
   *  and from the second step a "removing…" tag at the bubble's top right, both in the platform's blue */
  private drawReviewMark(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }, phase: 'outline' | 'removing' | 'grey'): void {
    if (phase === 'outline' || phase === 'removing') {
      ctx.save();
      ctx.strokeStyle = ERA3.accent; ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]); ctx.lineDashOffset = this.outlineStep() * 4;
      ctx.strokeRect(Math.round(b.x - 3) + 0.5, Math.round(b.y - 3) + 0.5, Math.round(b.w + 6), Math.round(b.h + 6));
      ctx.restore();
    }
    if (phase === 'removing' || phase === 'grey') {
      phoneFont(ctx, 10, 600);
      const lw = Math.ceil(ctx.measureText(REVIEW_REMOVING).width) + 12;
      const tx = Math.round(b.x + b.w - lw), ty = Math.round(b.y - 8);
      roundRect(ctx, tx, ty, lw, 15, 7, ERA3.accent);
      ctx.fillStyle = PHONE.surface; ctx.fillText(REVIEW_REMOVING, tx + 6, ty + 2);
    }
  }

  /** ⚑ S332 — her one message in the era, on the right where her words would always have been.
   *  ⚑ S426 (beat 14) — it is her forward now (her reply is retired): the link card on her side, edged in her colour, no words */
  private drawMine(ctx: CanvasRenderingContext2D, msg: Msg, y: number, W: number): { x: number; y: number; w: number; h: number } {
    const w = this.wideNow ? Math.min(W - 44, WIDE_CARD) : W - 44, x = W - 10 - w, h = msg.kind === 'link2' ? 70 : 56;
    roundRect(ctx, x - 2, y - 2, w + 4, h + 4, 11, PHONE.bubbleOut);
    this.drawLinkCard(ctx, x, y, w, msg, false);
    return { x, y, w, h };
  }

  private msgHeight(ctx: CanvasRenderingContext2D, msg: Msg, W: number): number {
    if (msg.from === 'system') { phoneFont(ctx, 10); return 17; }
    if (msg.kind === 'link2') return 74;   // ⚑ S426 — the card with its fact line (call 3)
    if (msg.kind === 'link') return 60;
    phoneFont(ctx, 13);
    return 15 + phoneWrap(ctx, msg.text ?? '', this.textW(W)).length * 17;
  }
  /** the width a message's words wrap to: as built narrow; wide, no wider than WIDE_TEXT (S426) */
  private textW(W: number): number { return this.wideNow ? Math.min(W - 62, WIDE_TEXT) : W - 62; }

  private drawMsg(
    ctx: CanvasRenderingContext2D, msg: Msg, y: number, W: number, showWho: boolean, grey = false
  ): { x: number; y: number; w: number; h: number } | null {
    if (msg.from === 'system') {
      // people being ADDED while it happens, in the platform's own grey note
      phoneFont(ctx, 10);
      ctx.fillStyle = PHONE.dim;
      const tw = ctx.measureText(msg.text ?? '').width;
      ctx.fillText(msg.text ?? '', Math.round((W - tw) / 2), y + 3);
      return null;
    }
    const bx = 30;
    if (showWho) avatar(ctx, 6, y + 2, 20, msg.from);
    if (msg.kind === 'link' || msg.kind === 'link2') {
      const w = this.wideNow ? Math.min(W - bx - 14, WIDE_CARD) : W - bx - 14;
      this.drawLinkCard(ctx, bx, y, w, msg, grey);
      return { x: bx, y, w, h: msg.kind === 'link2' ? 70 : 56 };
    }
    phoneFont(ctx, 13);
    const lines = phoneWrap(ctx, msg.text ?? '', this.textW(W));
    let widest = 0;
    for (const ln of lines) widest = Math.max(widest, ctx.measureText(ln).width);
    const bw = Math.min(W - bx - 14, widest + 18);
    const h = 15 + lines.length * 17;
    // ⚑ S426 — greyed, the bubble is the system's grey and its words fade, before it folds
    if (grey) roundRect(ctx, bx, y, bw, h, 9, PHONE.hairline); else bubble(ctx, bx, y, bw, h, 'in');
    if (showWho) {
      phoneFont(ctx, 10, 600);
      ctx.fillStyle = PHONE.dim;
      ctx.fillText(msg.from, bx + 2, y - 10);
    }
    phoneFont(ctx, 13);
    ctx.fillStyle = grey ? PHONE.faint : PHONE.ink;
    lines.forEach((ln, i) => ctx.fillText(ln, bx + 9, y + 7 + i * 17));
    return { x: bx, y, w: bw, h };
  }

  /** ⚑ the pretend newspaper carrying the real law (§7.3): invented masthead,
   *  documented act, drawn as the link preview card a messaging app makes.
   *  ⚑ S426 (his call 3: "The Malta news is a card, not a link") — not a link: no press, no page. Bea's card (`link2`) carries one line
   *  of fact under its headline, "Malta · Act LV of 2016 · passed 5 December"; the forwards' cards (`link`) are as built. Greyed while
   *  the review removes it. (S149/S219's press and spent state are retired: 17847974.) */
  private drawLinkCard(
    ctx: CanvasRenderingContext2D, x: number, y: number, w: number, msg: Msg, grey: boolean
  ): void {
    const vote = msg.kind === 'link2', link = vote ? LINK_VOTE : m.link, h = vote ? 70 : 56;
    roundRect(ctx, x, y, w, h, 9, grey ? PHONE.hairline : PHONE.surface);
    roundRect(ctx, x + 6, y + 10, 36, 36, 5, grey ? PHONE.faint : PHONE.tileLive);
    phoneFont(ctx, 9);
    ctx.fillStyle = grey ? PHONE.faint : PHONE.dim;
    ctx.fillText(link.masthead, x + 48, y + 7);
    phoneFont(ctx, 11, 600);
    ctx.fillStyle = grey ? PHONE.faint : PHONE.ink;
    const lines = phoneWrap(ctx, link.headline, w - 54).slice(0, 2);
    lines.forEach((ln, i) => ctx.fillText(ln, x + 48, y + 21 + i * 13));
    if (vote) {
      phoneFont(ctx, 9);
      ctx.fillStyle = grey ? PHONE.faint : PHONE.dim;
      phoneWrap(ctx, LINK_VOTE.fact, w - 54).slice(0, 1).forEach((ln) => ctx.fillText(ln, x + 48, y + 21 + lines.length * 13 + 5));
    }
  }

  /** ⚑ S357fr / 16-9 (his headset, 20 Nov: "it's saying seven messages but … I cannot …") — THE INBOX'S ROWS, one model for
   *  the list and for the badge on the Messages tile. The badge used to count the backlog alone, apart from the list: it
   *  said 7 while the rows on the glass said "87 unread" (muted), "3 unread" and "No new messages", and a person who had
   *  written tonight AND before kept a counted message under a row with no dot. Now each row carries what it declares
   *  unread — a dotted row its own unread messages (tonight's and the older ones in the same thread), the group its "N new
   *  messages", a preview its "N unread" — and the badge is their sum, a muted chat excepted (its row says "muted"). */
  private inboxRows(): { from: string; text: string; time: string; id: string; read: boolean; unread: number; muted?: boolean }[] {
    // ⚑ S327 / T05 (his 8 Nov: "the mentor's message isn't on the phone") — tonight's people NEWEST FIRST, each once:
    //   the mentor's message used to sit fourth in arrival order, off the first page. A person she has older messages
    //   from is the same row (the thread holds both); the group's own check-in counts as the group's news.
    const senders: string[] = [];
    for (const e of [...this.evening].reverse()) if (e.from !== m.group.name && !senders.includes(e.from)) senders.push(e.from);
    const groupNew = this.groupUnread() + this.evening.filter(e => e.from === m.group.name && !this.readMessages.has('evening:' + e.id)).length;
    const older = (from: string): number => BACKLOG.filter(b => b.from === from && !this.readMessages.has(b.from + b.time)).length;
    return [
      ...senders.map(from => {
        const mine = this.evening.filter(e => e.from === from), last = mine[mine.length - 1];
        const unread = mine.filter(e => !this.readMessages.has('evening:' + e.id)).length + older(from);
        return { from, text: last.text ?? '', time: last.time, id: 'evening:' + from, read: unread === 0, unread };
      }),
      ...m.groupPreviews.map(g => ({ from: g.name, text: (g.muted ? m.groupPreviewUI.muted + ' · ' : '') + m.groupPreviewUI.unread.replace('{n}', String(g.unread)), time: '', id: '', read: true, unread: g.unread, muted: g.muted })),
      { from: m.home.groupLabel, text: groupNew ? m.home.groupUnread.replace('{n}', String(groupNew)) : m.home.groupQuiet, time: '', id: 'group', read: !groupNew, unread: groupNew },
      ...BACKLOG.filter(b => !senders.includes(b.from)).map(b => { const read = this.readMessages.has(b.from + b.time); return { from: b.from, text: b.text, time: b.time, id: 'read-' + b.from + b.time, read, unread: read ? 0 : 1 }; })
    ];
  }
  /** ⚑ S357fr / 16-9 — the Messages tile's badge: what the list itself declares unread.
   *  ⚑ S357fw (his 22 Nov: "Only dotted people") — only the rows that wear an unread dot count, so the badge empties as
   *  she reads. The group previews (SisterSignal's "3 unread") carry no dot and cannot be opened: they no longer count,
   *  so the badge no longer sticks at 3. */
  get inboxBadge(): number { return this.inboxRows().reduce((n, r) => n + (r.read || r.muted ? 0 : r.unread), 0); }

  /** ⚑ read-only, and it files NOTHING. §6's design law: the piece never makes
   *  her open them, and if a player never touches this inbox that is also true
   *  of her. Drawn as a conversation LIST, with unread dots. */
  private drawInbox(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = PHONE.surface; ctx.fillRect(0, 0, W, H);
    const y0 = statusBar(ctx, W, this.clockText);
    let y = appBar(ctx, W, y0, m.home.messagesLabel);
    this.pushBack(y0, y);
    // ⚑ S327 / T05 (his 8 Nov: "the mentor's message isn't on the phone") — tonight's people NEWEST FIRST, each once:
    //   the mentor's message used to sit fourth in arrival order, off the first page. A person she has older messages
    //   from is the same row (the thread holds both); the group's own check-in counts as the group's news.
    const rows = this.inboxRows();
    // The era's news stays reachable on every page; private threads can be paged independently.
    const group = rows.splice(rows.findIndex(r => r.id === 'group'), 1)[0];
    const perPage = Math.max(1, Math.floor((H - y - 36) / 52) - 1);
    const pages = Math.max(1, rows.length);
    this.inboxPage = Math.min(this.inboxPage, pages - 1);
    for (const b of [group, ...rows.slice(this.inboxPage, this.inboxPage + perPage)]) {
      const h = 52;
      if (!b.read) { ctx.fillStyle = PHONE.tint; ctx.fillRect(5, y + 13, 4, 4); }
      phoneFont(ctx, 13, 600); ctx.fillStyle = PHONE.ink; ctx.fillText(b.from, 14, y + 5);
      phoneFont(ctx, 10); ctx.fillStyle = PHONE.dim;
      ctx.fillText(b.time, W - 10 - ctx.measureText(b.time).width, y + 20);
      phoneFont(ctx, 12);
      ctx.fillText(phoneWrap(ctx, b.text, W - 28)[0], 14, y + 32);
      ctx.fillStyle = PHONE.hairline; ctx.fillRect(14, y + h - 1, W - 14, 1);
      if (b.id) this.rects.push({ x: 0, y, w: W, h, id: b.id }); y += h;
    }
    phoneFont(ctx, 13); ctx.fillStyle = PHONE.dim;
    if (this.inboxPage > 0) { ctx.fillText(m.home.previousPage, 12, H - 26); this.rects.push({ x: 0, y: H - 36, w: 50, h: 36, id: 'inbox-prev' }); }
    if (this.inboxPage < pages - 1) { ctx.fillText(m.home.nextPage, W - 25, H - 26); this.rects.push({ x: W - 50, y: H - 36, w: 50, h: 36, id: 'inbox-next' }); }
  }

  /** ⚑ LAMBIENT'S CARD, as a SHEET from the bottom edge — the shape a phone of
   *  this period used for anything it wanted acknowledged. Both versions are
   *  polite; nothing is threatened, nothing is withheld, and the only difference
   *  between them is how she got here. */
  // ── press ────────────────────────────────────────────────────────────────
  press(x: number, y: number): boolean {
    const r = this.rects.find(rr =>
      x >= rr.x && x <= rr.x + rr.w && y >= rr.y && y <= rr.y + rr.h);
    if (!r) return false;
    return this.pressControl(r.id);
  }

  pressControl(id: string): boolean {
    const r = { id };
    if (r.id.startsWith('lock-card:')) { this.openEvening(r.id.slice(10)); this.bump(); return true; }
    switch (r.id) {
      case 'evening-banner':
        // ⚑ S426 — a card's banner opens the group (the cards are not links: call 3)
        if (this.banner?.text === m.link.headline || this.banner?.text === LINK_VOTE.headline) { this.screen = 'group'; this.openGroup(); return true; }
        if (this.banner && this.evening.some(e => e.from === this.banner!.from && e.text === this.banner!.text)) { this.openEvening(this.banner.from); }
        else { this.screen = 'group'; this.openGroup(); }
        this.bump(); return true;
      case 'scroll-up': this.scrollBack += this.pageStep; this.scrollByPiece = false; this.bump(); return true;   // S358 / H13
      case 'scroll-down': this.scrollBack = 0; this.scrollByPiece = false; this.bump(); return true;
      case 'scroll-next': this.scrollBack = Math.max(0, this.scrollBack - this.pageStep); this.scrollByPiece = false; this.bump(); return true;   // ⚑ S426 — ▼ (the group wide)
      case 'inbox-prev': this.inboxPage--; this.bump(); return true;
      case 'inbox-next': this.inboxPage++; this.bump(); return true;
      case 'personal-notification': this.openPersonalThread(); return true;
      case 'unlock': this.screen = 'home'; this.bump(); return true;
      case 'notification': this.screen = 'group'; this.openGroup(); return true;
      case 'group': this.screen = 'group'; this.openGroup(); return true;
      case 'inbox':
        this.screen = 'inbox';
        // The optional inbox never files a reading event.
        this.bump(); return true;
      // S158: the chat goes back to Messages; S177: so does an open message
      case 'back': if (this.screen === 'photo') { this.screen = 'photos'; this.bump(); return true; } if (this.screen === 'photos' && this.photosFrom) { this.screen = this.photosFrom; this.photosFrom = null; this.bump(); return true; } this.screen = this.screen === 'group' || this.screen === 'message' || this.screen === 'evening' || this.screen === 'article' || this.personalOpen ? 'inbox' : 'home'; this.openMessage = null; this.bump(); return true;
      case 'platform': this.screen = 'platform'; this.bump(); return true;
      case 'photos-prev': this.photoPage--; this.bump(); return true;
      case 'photos-next': this.photoPage++; this.bump(); return true;
      case 'photos': this.photosFrom = null; this.photoPage = 0; this.screen = 'photos'; this.bump(); return true;
      // ⚑ S362 / H45 — from a message about a photo: the camera roll, and Back returns to the thread it came from
      case 'open-photos': this.photosFrom = this.screen; this.photoPage = 0; this.screen = 'photos'; this.bump(); return true;
      case 'open-photo-4': this.photosFrom = this.screen; this.photoIndex = 4; this.screen = 'photo'; this.bump(); return true;
      case 'notes': this.screen = 'notes'; this.bump(); return true;
      case 'walk': this.screen = 'walk'; this.bump(); return true;
      // ⚑ S426 (beat 14; his call 4) — her forward, one press: it lands among theirs, a link with no words, and it stays (the review
      //   never reaches it). Nothing is filed. (S332's reply, `reply-bea`, is retired: 17847974.)
      case 'forward-link':
        if (!this.forwardOffered) return true;
        this.forwarded = true; this.forwardAt = this.cascadeN; this.landedAt.set('v', this.clockShown);
        if (this.scrollBack > 0) this.scrollBack = 0;   // her own forward, seen where it lands
        playOnce('phone_msg_2016.mp3'); this.bump(); return true;
      default:
        if (r.id.startsWith('evening:')) { this.openEvening(r.id.slice(8)); return true; }
        if (r.id.startsWith('photo-')) { this.photoIndex = Number(r.id.slice(6)); this.screen = 'photo'; this.bump(); return true; }
        if (r.id.startsWith('read-')) {
          this.readMessages.add(r.id.slice(5));
          this.openMessage = r.id.slice(5);
          this.screen = 'message';
          this.bump();
          return true;
        }
        return false;
    }
  }

  /** `floppy` is owned by the era, not by this module — it returns false so the
   *  caller's own handler opens the game. */
  isFloppyPress(x: number, y: number): boolean {
    const r = this.rects.find(rr =>
      x >= rr.x && x <= rr.x + rr.w && y >= rr.y && y <= rr.y + rr.h);
    return r?.id === 'floppy';
  }

  debugBeat(beat: string): void {
    switch (beat) {
      case 'lock': this.screen = 'lock'; this.bump(); break;
      case 'home': this.screen = 'home'; this.bump(); break;
      case 'group': this.screen = 'group'; this.openGroup(); break;
      case 'inbox': this.screen = 'inbox'; this.bump(); break;
      // ⚑ S426 — review aids for Act III: the news all landed and read; the review asked for (its bar up); the four Malta messages
      //   folded and the forwards running; all of it done (the review outnumbered)
      case 'news': this.startNews(); this.newsN = NEWS.length; this.stage = 'read'; veraDay.voted = true; this.screen = 'group'; this.bump(); break;
      case 'review': this.debugBeat('news'); this.startReview(); this.screen = 'group'; this.bump(); break;
      case 'cascade':
        this.debugBeat('review'); this.reviewT = 0;
        REVIEW_NEWS.forEach((k) => this.removed.add(k)); this.cascadeOn = true;
        this.bump();
        break;
      case 'after':
        this.debugBeat('cascade');
        this.cascadeN = CASCADE.length; this.reviewOrder().forEach((k) => this.removed.add(k)); this.reviewing = null; this.stage = 'after';
        veraDay.cascadeSeen = true;
        this.bump();
        break;
    }
  }

  /**
   * ⚑ S177 — the phone's back chevron was DRAWN on every app bar (theme/phone.ts appBar)
   * and never published as a rect, so it could not be pressed (his 2026-09-26: "the back
   * button on it doesn't work"). Every screen with an app bar now publishes it.
   */
  /**
   * ⚑ S358 / H13 (his headset, 10 Nov: "no way to scroll the messages on the phone") — a thread showed its newest
   * messages only, and the oldest fell off the top for good. `scrollBack` holds how many of the newest are set aside;
   * "Earlier messages" (a pill under the bar) steps back a screenful, "Latest" (a pill at the foot) returns. Presses
   * only: no drag, no wheel (a headset has neither). It resets when a thread is opened.
   */
  private scrollBack = 0;
  private static readonly PILL = 20;
  /** `reserve` (as built): room is kept above and below for the "Earlier messages" / "Latest" pills; the group wide keeps its ▲ ▼ in
   *  a gutter at the side instead (⚑ S426) */
  private scrollWindow(heights: number[], top: number, bottom: number, reserve = true): { from: number; to: number; y: number; earlier: boolean; latest: boolean } {
    const fit = (end: number, t: number, b: number): number => {   // the first index that fits above `end`, filling up from b
      let y = b, i = end;
      while (i > 0 && y - heights[i - 1] >= t) { y -= heights[i - 1]; i--; }
      return i;
    };
    const n = heights.length;
    this.scrollBack = Math.max(0, Math.min(this.scrollBack, Math.max(0, n - 1)));
    const latest = this.scrollBack > 0;
    const b = latest && reserve ? bottom - PhoneE3.PILL - 2 : bottom;
    const end = n - this.scrollBack;
    let from = fit(end, top, b);
    const earlier = from > 0;
    if (earlier && reserve) from = fit(end, top + PhoneE3.PILL + 2, b);
    // ⚑ S362 / H40 — with the larger type one long message (Bea's first) can be taller than the window: the newest is always drawn
    //   (its top clipped by the caller) rather than an empty thread
    if (from >= end && end > 0) from = end - 1;
    let y = b; for (let i = from; i < end; i++) y -= heights[i];
    return { from, to: end, y, earlier, latest };
  }
  private drawScrollPills(ctx: CanvasRenderingContext2D, W: number, top: number, bottom: number, win: { from: number; to: number; earlier: boolean; latest: boolean }): void {
    const pill = (label: string, y: number, id: string): void => {
      // ⚑ S426 — on a band of the thread's ground, so a message cut under it does not show round it
      ctx.fillStyle = PHONE.bg; ctx.fillRect(0, y - 3, W, PhoneE3.PILL + 2);
      phoneFont(ctx, 9);
      const pw = Math.ceil(ctx.measureText(label).width) + 20, px0 = Math.round((W - pw) / 2);
      roundRect(ctx, px0, y, pw, PhoneE3.PILL - 4, 8, PHONE.hairline);
      ctx.fillStyle = PHONE.ink; ctx.fillText(label, px0 + 10, y + 3);
      this.rects.push({ x: 0, y: y - 2, w: W, h: PhoneE3.PILL, id });
    };
    this.pageStep = Math.max(1, win.to - win.from - 1);
    if (win.earlier) pill(m.group.earlier, top + 3, 'scroll-up');
    if (win.latest) pill(m.group.latest, bottom - PhoneE3.PILL + 2, 'scroll-down');
  }
  /** ⚑ S426 (the group wide) — ▲ ▼ in the gutter at the thread's right: ▲ a screenful back (shown while there is more above),
   *  ▼ a screenful forward (shown while she is looking back). Drawn triangles, presses only. */
  private drawScrollArrows(ctx: CanvasRenderingContext2D, W: number, top: number, bottom: number, win: { from: number; to: number; earlier: boolean; latest: boolean }): void {
    this.pageStep = Math.max(1, win.to - win.from - 1);
    const bx = W - WIDE_GUTTER + 4, bw = 24, bh = 24;
    const arrow = (y: number, up: boolean, id: string): void => {
      roundRect(ctx, bx, y, bw, bh, 6, PHONE.hairline);
      const cx = bx + bw / 2, cy = y + bh / 2;
      ctx.fillStyle = PHONE.ink; ctx.beginPath();
      if (up) { ctx.moveTo(cx - 6, cy + 3); ctx.lineTo(cx + 6, cy + 3); ctx.lineTo(cx, cy - 4); }
      else { ctx.moveTo(cx - 6, cy - 3); ctx.lineTo(cx + 6, cy - 3); ctx.lineTo(cx, cy + 4); }
      ctx.closePath(); ctx.fill();
      this.rects.push({ x: bx - 3, y: y - 3, w: bw + 6, h: bh + 6, id });
    };
    if (win.earlier) arrow(top + 6, true, 'scroll-up');
    if (win.latest) arrow(bottom - bh - 2, false, 'scroll-next');
  }
  private pageStep = 1;
  private pushBack(barTop: number, barBottom: number): void {
    this.rects.push({ x: 0, y: barTop, w: 44, h: barBottom - barTop, id: 'back' });
  }

  /** S177 — one backlog message on its own screen: the sender in the bar, the whole
   *  message as a bubble, the time under it. Read-only, like the inbox; files nothing. */
  private drawMessage(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = PHONE.bg; ctx.fillRect(0, 0, W, H);
    const y0 = statusBar(ctx, W, this.clockText);
    const b = BACKLOG.find((x) => x.from + x.time === this.openMessage);
    const top = appBar(ctx, W, y0, b ? b.from : m.home.messagesLabel);
    this.pushBack(y0, top);
    if (!b) return;
    const entries = b.thread ?? [{ time: b.time, text: b.text }];
    let by = top + 8;
    for (const entry of entries) {
      phoneFont(ctx, 12);
      const lines = phoneWrap(ctx, entry.text, W - 42);
      const bh = lines.length * 15 + 14;
      bubble(ctx, 10, by, W - 22, bh, 'in');
      ctx.fillStyle = PHONE.ink;
      lines.forEach((ln, i) => ctx.fillText(ln, 19, by + 7 + i * 15));
      by += bh + 3;
      phoneFont(ctx, 10); ctx.fillStyle = PHONE.dim;
      ctx.fillText(entry.time, 14, by);
      if (b.opens === 'photos') {   // ⚑ S362 / H45 — same press as in the thread (drawEvening)
        phoneFont(ctx, 11, 600); ctx.fillStyle = PHONE.tint;
        const lab = HOME.openPhotos, lw = ctx.measureText(lab).width;
        ctx.fillText(lab, W - 14 - lw, by - 1);
        this.rects.push({ x: 10, y: by - bh - 3, w: W - 22, h: bh + 18, id: 'open-photos' });
      }
      by += 15;
    }
    if (b.stampCard) {
      phoneFont(ctx, 13, 600); ctx.fillStyle = PHONE.ink;
      const lines = phoneWrap(ctx, b.stampCard, W - 40);
      ctx.fillStyle = PHONE.surface; ctx.fillRect(12, by + 4, W - 24, 74);
      ctx.fillStyle = PHONE.ink;
      lines.forEach((ln, i) => ctx.fillText(ln, 20, by + 14 + i * 17));
    }
  }

  /** ⚑ S181 / R5-04 — WALK WITH, the accountability app: her own file, newest first, in the
   *  app's warm voice. Read only; the frame's menu keeps the reading of what it means. */
  private drawWalk(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = PHONE.surface; ctx.fillRect(0, 0, W, H);
    const y0 = statusBar(ctx, W, this.clockText);
    const top = appBar(ctx, W, y0, HOME.walkTitle, HOME.walkSub);
    this.pushBack(y0, top);
    // ⚑ S182 — WHO RECEIVES IT (his intake research: the documented 2016 form is a weekly report
    //   emailed to a named partner — spouse, parent, pastor, mentor; here Deirdre, the group's facilitator)
    phoneFont(ctx, 10); ctx.fillStyle = PHONE.dim;
    ctx.fillText(HOME.walkReport, 12, top + 6);
    ctx.fillStyle = PHONE.hairline; ctx.fillRect(12, top + 18, W - 24, 1);
    const rows = entriesByEra().e3.slice().reverse();
    let y = top + 26;
    phoneFont(ctx, 11);
    if (!rows.length) { ctx.fillStyle = PHONE.dim; ctx.fillText(HOME.walkEmpty, 14, y + 4); }
    for (const r of rows) {
      const lines = phoneWrap(ctx, r.witness, W - 34);
      const h = lines.length * 14 + 8;
      if (y + h > H - 22) break;
      ctx.fillStyle = r.flagged ? PHONE.badge : PHONE.tint;
      ctx.beginPath(); ctx.arc(14, y + 6, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PHONE.ink;
      lines.forEach((ln, i) => ctx.fillText(ln, 24, y + i * 14));
      ctx.fillStyle = PHONE.hairline; ctx.fillRect(24, y + h - 4, W - 34, 1);
      y += h;
    }
    phoneFont(ctx, 10); ctx.fillStyle = PHONE.faint;
    ctx.fillText(HOME.walkFoot, 12, H - 16);
  }

  /** S158 / R3-78 — the platform's own app on the phone: a card that says where the work is */
  private drawPlatform(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = PHONE.surface; ctx.fillRect(0, 0, W, H);
    const y0 = statusBar(ctx, W, this.clockText);
    const y = appBar(ctx, W, y0, m.home.platformLabel);
    this.pushBack(y0, y);
    phoneFont(ctx, 12, 600); ctx.fillStyle = PHONE.ink;
    ctx.fillText(m.home.platformHello, 14, y + 20);
    phoneFont(ctx, 11); ctx.fillStyle = PHONE.dim;
    phoneWrap(ctx, m.home.platformNote, W - 28).forEach((ln, i) => ctx.fillText(ln, 14, y + 40 + i * 14));
  }

  private openGroup(): void {
    this.scrollBack = 0;
    this.markGroupSeen();
    veraDay.phoneAnswered = true;
    this.bump();
  }

  get floppyBlocked(): boolean { return this.opts.floppyOpen(); }
  /** ⚑ she opened it at least once — the record's only branch, and it changes
   *  nothing anyone can see. */
  get everOpened(): boolean { return this.opened; }
}
