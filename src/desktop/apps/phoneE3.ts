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
const LINK_VOTE = m.linkVote as { masthead: string; headline: string; fact: string; preview: string[] };   // S227 / M1: the never-drawn standfirst and tapHint are gone; ⚑ S426: its fact line (call 3); ⚑ S434: its preview's lines
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
/** ⚑ S426e (his 24 Nov) — the forwards (the same card) and the "… was added" lines may come CASCADE_STEP apart: being outnumbered is the
 *  point. A person's own words in the cascade ("putting it in the other group as well", "deirdre", "I know.") are each given their
 *  reading time (readHold) before anything else lands under them. */
function cascadeWait(c: Msg | undefined): number {
  return c && c.from !== 'system' && c.text && c.kind !== 'link' ? Math.max(CASCADE_STEP, readHold([c.text])) : CASCADE_STEP;
}
/** ⚑ S332 — Bea's news lands a message at a time; the removals run slower than the forwards (the outnumbering) */
const NEWS_STEP = 1.7;
/** ⚑ S426 (UiB job 35 Part D, Act III beat 13; his 20 Nov 16-17: "the removal should be seen happening") — THE REMOVAL, SEEN. One
 *  message at a time, slowly enough to watch: the platform's outline around it (OUTLINE_S, the outline stepping at OUTLINE_HZ;
 *  still under reduced motion), "removing…" (REMOVING_S), the bubble greyed (GREY_S), then folded into "Removed by GracePlatform";
 *  REVIEW_GAP between one message and the next. The bar is up REVIEW_LEAD before the first outline. (S332's REMOVE_STEP, a strike
 *  every 1.5 s on the Review page, and S332's reply wait are retired: 17847974.) */
const OUTLINE_S = 1.5, REMOVING_S = 1.5, GREY_S = 1.0, REVIEW_GAP = 1.0, OUTLINE_HZ = 3;
/** ⚑ S426e (his 24 Nov: "I couldn't read the chat because there were too many lines of people coming") — the bar is read before the
 *  first outline (the reading rule, 2 s + 0.4 s a word: about 6.4 s); each removal is 4 s of steps and 1 s apart (was 2.9 + 0.4) */
const REVIEW_LEAD = readHold([vera.removals.bar]);
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
/* (⚑ S428 — S357fr's EVENING_START, '18:04', is retired: the clock is the visitor's own time of day now, below. 40a59042 holds it.) */
/** ⚑ S428 (UiB job 38 A1; his 26 Nov: "I meant the real time of the day. I know this was related to the timing of the Malta releasing
 *  the law but it simply doesnt work the time aspect so we just keep the day element") — THE CLOCK IS THE VISITOR'S OWN TIME OF DAY,
 *  read from the device it runs on (no network, nothing stored). The day stays Tuesday 6 December 2016 (era3_devices.json lockDate).
 *  Every message is still stamped with the minute it lands (S357fr), and nothing in the story waits on the clock. */
function nowMinutes(): number { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
function clockMinutes(t: string): number { const [h, mm] = t.split(':').map(Number); return (h || 0) * 60 + (mm || 0); }
/** ⚑ S429 (UiB job 38 F3) — 24-hour time with the hour padded, as a 2016 phone and a Windows taskbar write it: "00:15", never "0:15"
 *  (the phone's status bar, its lock screen, each message's stamp, the banner and the taskbar all read this) */
function clockOf(min: number): string { const w = ((Math.floor(min) % 1440) + 1440) % 1440, h = Math.floor(w / 60), mm = w % 60; return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; }
const CASCADE_REPEAT_VOLUME = 0.4;
/** ⚑ S426e (his 24 Nov) — the group stays in its column (the maximised desktop chat, WIDE_*, is retired: 9974fe1f). In the thread:
 *  NAME_ROOM keeps the first message's name under the bar (no line cut in half); nothing written in it reaches past W - RIGHT_PAD
 *  (156 of the phone's 180): on a phone held upright the Handset Window's column is cut at the screen's edge, and about 162 of the
 *  180 are in view (measured from the seat, 390 × 844), so every bubble, card, "Removed by GracePlatform", the bar's words, the
 *  "removing…" tag and the forward chip end at least 6 px inside it. (As built the bubbles reached 166 and the folded lines 171.) */
const RIGHT_PAD = 24, NAME_GAP = 8;   // (⚑ S429 — NAME_ROOM, the first message's room under the bar, is retired with the paged window)

/**
 * ⚑ S429 (UiB job 38 C1 and F1; his 26 Nov: "it should be like a scroll motion, like this is a phone from 2016", "there's like blank
 * spaces"; and his 24 Nov rule, no line ever cut) — WHERE THE LINES FALL. A context that draws nothing and records, for every line
 * of text a screen would write, its top and bottom (in the caller's coordinates; textBaseline honoured). A thread is laid out with it
 * first, so it can be clipped BETWEEN lines and never through one, and scrolled a line at a time; and a screen under a notification
 * banner learns which of its lines the banner's lower edge would cut. Measuring is the real context's; nothing is drawn or stored.
 */
type TextBox = { y0: number; y1: number };
function textBoxes(real: CanvasRenderingContext2D, boxes: TextBox[]): CanvasRenderingContext2D {
  let st: Record<string, unknown> = { font: real.font, textBaseline: 'top', textAlign: 'left', fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1,
    lineWidth: 1, lineDashOffset: 0, imageSmoothingEnabled: true, imageSmoothingQuality: 'low', ty: 0 };
  const stack: Record<string, unknown>[] = [];
  const text = (_s: string, _x: number, y: number): void => {
    const s = Number(/(\d+(?:\.\d+)?)px/.exec(String(st.font))?.[1] ?? 12), b = String(st.textBaseline), yy = y + Number(st.ty);
    const top = b === 'top' || b === 'hanging' ? yy : b === 'middle' ? yy - s * 0.6 : yy - s;
    // the glyphs' own band: from a little under the em box's top to its foot (descenders end there); a line set tighter than its
    //   type (the headset's larger type on a card's 13 px lines) then still touches its neighbours instead of overlapping them
    boxes.push({ y0: Math.floor(top + s * 0.1), y1: Math.ceil(top + s) });
  };
  const fns: Record<string, unknown> = {
    fillText: text, strokeText: text,
    measureText: (s: string) => { const f = real.font; real.font = String(st.font); const r = real.measureText(s); real.font = f; return r; },
    save: () => { stack.push({ ...st }); }, restore: () => { st = stack.pop() ?? st; },
    translate: (_x: number, y: number) => { st.ty = Number(st.ty) + y; },
    createLinearGradient: () => ({ addColorStop() { /* nothing drawn */ } }), createRadialGradient: () => ({ addColorStop() { /* nothing drawn */ } }),
    createPattern: () => null, getLineDash: () => []
  };
  return new Proxy({}, {
    get(_t, k) {
      if (typeof k !== 'string') return undefined;
      if (k in fns) return fns[k];
      if (k === 'canvas') return real.canvas;
      if (k in st) return st[k];
      return () => undefined;
    },
    set(_t, k, v) { if (typeof k === 'string') st[k] = v; return true; }
  }) as unknown as CanvasRenderingContext2D;
}
/** ⚑ S429 (F1) — the real context with its words left out: a screen drawn through it again inside a band repaints its ground and its
 *  shapes there, and no letters, so a line the banner's edge would have cut is hidden whole */
function withoutText(real: CanvasRenderingContext2D): CanvasRenderingContext2D {
  return new Proxy(real, {
    get(t, k) {
      if (k === 'fillText' || k === 'strokeText') return () => undefined;
      const v = Reflect.get(t, k, t) as unknown;
      return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(t) : v;
    },
    set(t, k, v) { return Reflect.set(t, k, v, t); }
  });
}
/* (⚑ S429b — `onlyText`, S429's words-only pass clipped to the whole lines' band, is retired: a hidden line's descenders leaked through
 *  that clip. `wholeLinesOnly` below draws each line whole or not at all. 3fa9452d.) */
/** ⚑ S429b (G1; the coordinator's look at S429's frames: "the descenders of a line hidden above show as one or two grey dots") — the
 *  real context drawing ONLY whole lines between `a` and `b`: a line's glyph band (as `textBoxes` measures it) inside them is drawn,
 *  any other line is not drawn at all, its descenders with it; shapes and pictures are left out (drawn by the shapes' pass) */
function wholeLinesOnly(real: CanvasRenderingContext2D, a: number, b: number): CanvasRenderingContext2D {
  const keep = new Set(['measureText', 'save', 'restore', 'translate', 'scale', 'setTransform', 'getTransform', 'resetTransform']);
  const text = (k: 'fillText' | 'strokeText') => (s: string, x: number, y: number, mw?: number): void => {
    const size = Number(/(\d+(?:\.\d+)?)px/.exec(real.font)?.[1] ?? 12), bl = real.textBaseline;
    const top = bl === 'top' || bl === 'hanging' ? y : bl === 'middle' ? y - size * 0.6 : y - size;
    if (Math.floor(top + size * 0.1) < a || Math.ceil(top + size) > b) return;
    if (mw === undefined) real[k](s, x, y); else real[k](s, x, y, mw);
  };
  return new Proxy(real, {
    get(t, k) {
      if (k === 'fillText' || k === 'strokeText') return text(k);
      const v = Reflect.get(t, k, t) as unknown;
      if (typeof v !== 'function') return v;
      return typeof k === 'string' && keep.has(k) ? (v as (...q: unknown[]) => unknown).bind(t) : () => undefined;
    },
    set(t, k, v) { return Reflect.set(t, k, v, t); }
  });
}
/** ⚑ S429c (H2; the coordinator: Bea's banner ended "make it an offence to try to" with nothing after it) — a notification's preview
 *  as a phone shows it: its first `max` lines, and when the message goes on past them the last shown line ends in "…" (words dropped
 *  from its end until it fits; no word changed). A message that fits whole (her unfinished note) gets none. */
function previewLines(ctx: CanvasRenderingContext2D, text: string, width: number, max: number): string[] {
  const all = phoneWrap(ctx, text, width);
  if (all.length <= max) return all;
  const lines = all.slice(0, max);
  let last = lines[max - 1].replace(/[\s,;:.\-—]+$/, '');
  while (ctx.measureText(last + '…').width > width && last.includes(' ')) last = last.slice(0, last.lastIndexOf(' ')).replace(/[\s,;:.\-—]+$/, '');
  lines[max - 1] = last + '…';
  return lines;
}
/** the edges a box list allows: `a` moved down past any line it would cut, `b` up past any line it would cut */
function snapBetweenLines(boxes: TextBox[], a: number, b: number): { a: number; b: number } {
  for (let moved = true; moved;) { moved = false; for (const x of boxes) if (x.y0 < a && a < x.y1) { a = x.y1; moved = true; } }
  for (let moved = true; moved;) { moved = false; for (const x of boxes) if (x.y0 < b && b < x.y1) { b = x.y0; moved = true; } }
  return { a, b: Math.max(a, b) };
}
/** ⚑ S429 (C1) — a thread's message: its slot height and how it draws itself at a slot's top */
type ThreadItem = { key: string; h: number; draw: (c: CanvasRenderingContext2D, y: number) => void };
/** ⚑ S429 (C1) — a typical line of a thread (13 px words on 17 px lines): what a page keeps of the one before */
const THREAD_LINE = 17;
/** ⚑ S429 (C1) — the wheel's pixels for one line (a 100 px notch is three lines, as a desktop browser scrolls); the thumbstick's lines
 *  a second, 3 at the edge of its dead zone to 7 at full (≤ 7 Hz: each step one repaint, and none while it is still) */
const WHEEL_PX_PER_LINE = 34, STICK_DEAD = 0.35, STICK_MIN_RATE = 3, STICK_MAX_RATE = 7;

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
    this.stage = 'news'; this.newsT = 0; this.newsN = 0; this.newsPaused = false; this.banner = null; this.newsHeld = false; this.logLand('news');
    this.bump();
  }
  /**
   * ⚑ S428 (UiB job 38 A2, rows 9–10; his 26 Nov: "the phone should not open by itslef on the messages of the maiden … The automatic
   * is 2026 not 2016") — BEA'S NEWS COMES AS A NOTIFICATION. Opening Nuala's message brings it (graceQueueLite, once her message has
   * had its reading time): Bea's first message lands in the group and the phone shows it the way a 2016 phone does, a banner (the
   * lock screen's card) with the group's name and her first line, and one sound. Nothing opens. When she opens the group (the
   * notification, or the group from Messages), the rest of the news runs, each message after the one before has had its reading
   * time (`newsWait`, the fiction's own time, unchanged).
   */
  noticeNews(): void {
    if (this.stage !== 'quiet' || this.disconnected) return;
    this.stage = 'news'; this.newsT = 0; this.newsN = 1; this.newsPaused = false; this.newsHeld = true; this.banner = null;
    this.landedAt.set('n0', this.clockShown); this.logLand('news'); this.logLand('n0');
    this.notify('bea', m.group.name, `${NEWS[0].from}: ${NEWS[0].text ?? ''}`);
  }
  /** ⚑ S428 — the news waits for her to open the group (row 10): the first message is in, the rest are not written yet */
  private newsHeld = false;
  /** ⚑ S428 — the last of Bea's news on her glass, seconds (its reading time counts only while the group is in front of her: row 11) */
  private newsReadT = 0;
  /**
   * ⚑ S428 (rows 6, 9, 12) — THE PHONE'S OWN NOTIFICATION: news the chain brings that is not a person's message — her Notes, the
   * group's first line of Bea's news, the platform's review. It is drawn the way a message's is (a banner over the screen she is on,
   * a card on the lock screen; the phone's own colours), it sounds once (phone_ping_2016, the sound every message makes), and it
   * stays until she opens it. Opening it does what opening that app would: the Notes, the group. Nothing opens by itself.
   */
  private notice: { id: 'notes' | 'bea' | 'review'; from: string; text: string; time: string } | null = null;
  private notify(id: 'notes' | 'bea' | 'review', from: string, text: string): void {
    this.notice = { id, from, text, time: this.clockShown };
    playOnce('phone_ping_2016.mp3'); this.bump();
  }
  /** the notification waiting to be opened, if any (graceQueueLite's chain, the Start map, the probes) */
  get noticeId(): 'notes' | 'bea' | 'review' | null { return this.notice?.id ?? null; }
  /** ⚑ S428 — the stage of the group's evening (graceQueueLite's chain, the probes; read only) */
  get stageNow(): Stage { return this.stage; }
  /** ⚑ S428 (B4) — the Start map's "Take me there" on a waiting notification: the press her own on it would be */
  pressNotice(): void { this.openNotice(); }
  /** she opened the waiting notification (its banner or card, or the app it names): what opening that app does */
  private openNotice(): void {
    const n = this.notice;
    if (!n) return;
    this.notice = null;
    if (n.id === 'notes') { if (!this.conductMemoryNotes()) { this.screen = 'notes'; this.bump(); } return; }
    this.screen = 'group'; this.openGroup();
  }
  /** ⚑ S428 (row 6) — closing the memory page puts this on the phone: a Notes notification (her unfinished note's first line) */
  noticeNotes(): void {
    if (this.disconnected || this.refusalWritten || this.notice?.id === 'notes') return;
    const mam = NOTE_ENTRIES.find((e) => e.id === 'mam');
    this.notify('notes', HOME.fNotes, mam?.text ?? '');
  }
  /** ⚑ S428 (row 12) — leaving the kit puts this on the phone: from the group, "GracePlatform is reviewing this group" */
  noticeReview(): boolean {
    if (this.stage !== 'read' || this.disconnected || this.notice?.id === 'review') return false;
    this.reviewDue = true;
    this.notify('review', m.group.name, vera.removals.notice);
    return true;
  }
  /** ⚑ S428 — the review is asked for and waits for her to open the group (row 13) */
  private reviewDue = false;
  /** ⚑ S428 (row 15) — the end, answered: she forwarded the link once the review could not keep up, or closed the group after
   *  it had been on her glass (graceQueueLite arms the update on it) */
  endAnswered: 'forward' | 'close' | null = null;
  /** ⚑ S428 — "Review could not keep up." has been on her glass (the group in front of her once the forwards were in) */
  private endSeen = false;
  get endOnGlass(): boolean { return this.endSeen; }
  /** ⚑ S428 (row 8) — she closed her Notes once her line was written: the phone locked (graceQueueLite then earns Nuala's message) */
  notesClosed = false;
  /** ⚑ S428 (row 9) — when she opened each of tonight's messages (era seconds), for its reading time */
  private readAt = new Map<string, number>();
  /** seconds since she opened message `id` (−1: not opened) */
  readFor(id: string): number { const at = this.readAt.get(id); return at === undefined ? -1 : this.clockSec - at; }
  /** she has opened message `id` and it has had its reading time since (the reading rule; never less than its hold) */
  readDone(id: string): boolean {
    const e = this.evening.find((x) => x.id === id);
    return !!e && this.readFor(id) >= Math.max(HOLDS[id] ?? READ_HOLD, readHold(e.text ?? ''));
  }
  /** ⚑ S428 — the screen the phone shows (graceQueueLite's chain and the probes; read only) */
  get screenNow(): string { return this.screen; }
  /** ⚑ S428 — the news has begun and waits for her to open the group, or runs */
  get newsWaiting(): boolean { return this.stage === 'news' && this.newsHeld; }
  /** ⚑ S428 — the group's news or its review is running (the platform's music keeps its old stops on this: S429's part) */
  get groupRunning(): boolean { return (this.stage === 'news' && !this.newsHeld) || this.stage === 'takeover'; }
  /** ⚑ S428 — the review has been asked for (the notification is up, or she has opened the group and it runs or has run) */
  get reviewAsked(): boolean { return this.reviewDue || this.stage === 'takeover' || this.stage === 'after'; }
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
  /** ⚑ S426e — the probes' record of Act III's pace: each message's landing and each removal step, on the era's own clock (seconds) */
  readonly landLog: { key: string; t: number }[] = [];
  private logLand(key: string): void { this.landLog.push({ key, t: Math.round(this.clockSec * 10) / 10 }); }
  startReview(): boolean {
    if (this.stage !== 'read' || this.disconnected) return false;
    this.logLand('review');
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
    this.screen = 'notes'; this.openMessage = null; this.banner = null; this.notesConducted = true;
    this.refusalT = 0; this.refusalLead = reducedMotion() ? 0 : REFUSAL_BREATH;
    this.bump();
    return true;
  }
  /** ⚑ S428 — her note was typed in front of her (the chain's Notes): her first ‹ after it is written closes them (row 8) */
  private notesConducted = false;
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
  /** ⚑ S357fr / 16-12 — what the glass and the taskbar read. ⚑ S428: the visitor's own time of day (it was EVENING_START plus the
   *  minutes the era had run) */
  private clockShown = clockOf(nowMinutes());
  /** seconds the era has run on its own update loop (the probes' log and the reading holds count on it, never the story) */
  private clockSec = 0;
  /** ⚑ S357fr / 16-12 — the minute each of the group's live messages landed ('n' + i Bea's news, 'v' her reply, 'c' + i the
   *  cascade), so the thread shows the clock's own time for each, never an authored one ahead of it */
  private landedAt = new Map<string, string>();
  private tickClock(dt: number): void {
    const before = Math.floor(this.clockSec);
    this.clockSec += dt;
    if (Math.floor(this.clockSec) === before) return;   // the device's clock is read once a second, the glass redrawn when the minute turns
    const shown = clockOf(nowMinutes());
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
      screen: this.screen, stage: this.stage, delivered: this.evening.map(e => e.id), clock: this.clockShown, notice: this.notice?.id ?? null,
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
    this.evening.push(e); this.banner = e; this.bannerFromGroup = false; this.bannerAge = 0; this.holdFor = Math.max(HOLDS[e.id] ?? READ_HOLD, readHold(e.text ?? ''));
    // ⚑ S327 / T04 (his 8 Nov: "two different messages from Orla, which doesn't make a lot of sense") — ONE banner for
    //   Orla's evening: the stamp line lands in the same thread, quietly, under the quiz message
    if (e.id === 'arrival') { const st = mirrorCopy.events.find(x => x.id === 'stamp'); if (st && !this.delivered('stamp')) this.evening.push({ ...st, time: now }); }
    // (⚑ S425 — Mam's message no longer opens her Notes by itself: her one Notes moment is the memory's, beat 10)
    playOnce('phone_ping_2016.mp3'); this.bump();
  }

  private newsBanner(messages: Msg[]): void {
    const e = messages[messages.length - 1];
    if (this.screen === 'group') { this.banner = null; this.bump(); return; }   // S327: it is landing on the open thread
    // ⚑ S434 — or on the group's own link reader (Bea's card's preview): it lands in the thread, and Back shows it there
    if (this.screen === 'article') { this.banner = null; this.bannerFromGroup = false; this.bump(); return; }
    // ⚑ S357fr / 16-12 — it has just landed: the banner says the clock's minute, not the message's authored one
    if (e) { this.banner = { from: e.from, time: this.clockShown, text: e.text ?? (e.kind === 'link2' ? LINK_VOTE.headline : e.kind === 'link' ? m.link.headline : '') }; this.bannerFromGroup = true; }
    this.bump();
  }
  /** ⚑ S428 — the banner up is the group's (its news or a forward landing while she was elsewhere): opening the group clears it */
  private bannerFromGroup = false;
  get eveningClock(): string { return this.clockShown; }
  disconnected = false;
  disconnect(): void { this.disconnected = true; this.evening = []; this.eventQueue = []; this.readMessages.clear(); veraDay.personalMessageSeen = false; this.banner = null; this.notice = null; this.openMessage = null; this.refusalT = -1; this.screen = 'lock'; this.bump(); }
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
    this.tickStick(dt);   // ⚑ S429 (C1) — the headset's thumbstick on a thread
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
      // ⚑ S428 (UiB job 38 A2, rows 7–8) — written, the line stays on her glass and the Notes stay open: her ‹ closes them (it was
      //   S425's reading hold and then the lock screen by itself). The typing is the fiction's own time, unchanged.
      if (this.refusalWritten) { this.refusalT = -1; this.bump(); }
      else if (this.notesFrame() !== before) this.bump();
    }
    // ⚑ S332 — MALTA, the era's own beat (conducted: the platform holds every other voice while it runs).
    // ⚑ S426 (Act III) — news: Bea's messages land one at a time, each after the one before has been read; then `read` (the kit).
    //   takeover: the platform's bar, then each Malta message outlined, "removing…", greyed, folded (one at a time); the forwards
    //   begin once those are gone and land faster than it can follow: it greys the first two and cannot keep up. after: the
    //   forwards in, the review outnumbered.
    // ⚑ S428 (UiB job 38 A2, rows 10–14; HEADSET_RUN answer a, "It felt stuck") — the group's news and the platform's review run on
    //   whatever she opens or plays: a job, a finished lesson opened again, the phone game, a minimised window. Their messages land
    //   in the thread and on the badge, and wait there for her. (`if (!visible) return;` froze both: 40a59042.) Only the last of
    //   Bea's news needs her eyes: its reading time counts while the group is on her glass (row 11).
    const onGlass = visible && this.screen === 'group';
    if (this.stage === 'after' && onGlass && !this.endSeen) { this.endSeen = true; this.bump(); }
    if (this.stage === 'news') {
      if (this.newsPaused || this.newsHeld) return;
      this.newsT += dt;
      if (this.newsN < NEWS.length) {
        // ⚑ S357fr / 16-12 — Bea's first message no longer waits for the clock to roll up to 21:41: it lands at the clock's minute
        if (this.newsT >= newsWait(this.newsN)) {
          this.newsT = 0; this.newsN++; this.landedAt.set('n' + (this.newsN - 1), this.clockShown); this.logLand('n' + (this.newsN - 1));
          if (this.scrollO !== null && this.userScrolled) this.unseen++;   // she is looking back: what she is reading stays put (⚑ S429: her place is a content y)
          this.newsBanner(NEWS.slice(0, this.newsN));
          if (this.screen === 'group') this.markGroupSeen();
          this.cascadeSound(); this.bump();
        }
        return;
      }
      // the last message (Hanne's) read: the news is in (⚑ S428: its reading time counted while the group is in front of her)
      if (onGlass) this.newsReadT += dt;
      if (this.newsReadT >= newsWait(NEWS.length)) { this.stage = 'read'; veraDay.voted = true; this.logLand('read'); this.bump(); }
      return;
    }
    if (this.stage !== 'takeover' && this.stage !== 'after') return;
    // the review: one message at a time, each step a repaint (the outline's march at OUTLINE_HZ; none under reduced motion)
    if (this.reviewing) {
      const r = this.reviewing, step = this.outlineStep();
      r.t += dt;
      const len = r.phase === 'outline' ? OUTLINE_S : r.phase === 'removing' ? REMOVING_S : GREY_S;
      if (r.t >= len) {
        if (r.phase === 'outline') { r.phase = 'removing'; r.t = 0; this.logLand(r.key + ':removing'); }
        else if (r.phase === 'removing') { r.phase = 'grey'; r.t = 0; this.logLand(r.key + ':grey'); }
        else { this.removed.add(r.key); this.reviewing = null; this.reviewT = -REVIEW_GAP; this.logLand(r.key + ':folded'); }
        this.bump();
      } else if (this.outlineStep() !== step) this.bump();
    } else if (this.stage === 'takeover') {
      this.reviewT += dt;
      if (this.reviewT >= 0) {
        const next = this.nextReview();
        if (next) { this.reviewing = { key: next, phase: 'outline', t: 0 }; this.logLand(next + ':outline'); this.bump(); }
        else this.reviewT = 0;
      }
    }
    if (!this.cascadeOn && REVIEW_NEWS.every((k) => this.removed.has(k))) { this.cascadeOn = true; this.cascadeT = 0; this.bump(); }
    if (!this.cascadeOn) return;
    this.cascadeT += dt;
    while (this.cascadeN < CASCADE.length && this.cascadeT >= (this.cascadeN === 0 ? CASCADE_STEP : cascadeWait(CASCADE[this.cascadeN - 1]))) {
      this.cascadeT -= this.cascadeN === 0 ? CASCADE_STEP : cascadeWait(CASCADE[this.cascadeN - 1]);
      this.cascadeN++; this.landedAt.set('c' + (this.cascadeN - 1), this.clockShown); this.logLand('c' + (this.cascadeN - 1)); this.newsBanner(CASCADE.slice(0, this.cascadeN));
      if (this.scrollO !== null && this.userScrolled) this.unseen++;
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
    // ⚑ S429 (F1; his 24 Nov rule: no line is ever cut) — a banner over a screen never cuts a line under its lower edge. A thread lays
    //   itself out under it (its list begins below the banner, whole lines only: `bannerFloor`); any other screen is drawn, and then
    //   drawn again WITHOUT ITS WORDS in the band from the banner's edge down to the end of the line the edge would cut, so that line
    //   is hidden whole (its ground and shapes stay). Nothing moves; only the cut line goes.
    const banner = this.conductingNotes ? 0 : this.bannerBottom(ctx, W);
    this.bannerFloor = banner ? banner + 2 : 0;
    const drawScreen = (c: CanvasRenderingContext2D): void => {
      // (⚑ S426 — the article page, S362's conducted masthead and headline that read as a blank page, is retired: 17847974)
      // ⚑ S434 — Bea's card's preview, on her tap: the messenger's own link reader (drawPreview)
      if (this.screen === 'article') { this.drawPreview(c, W, bodyH); }
      else if (this.screen === 'evening') { this.drawEvening(c, W, bodyH); }
      else if (this.screen === 'personal') { this.drawThreadView(c, W, bodyH); this.pushBack(20, 62); }
      else if (this.screen === 'lock') { this.drawLock(c, W, bodyH); }
      else if (this.screen === 'photos' || this.screen === 'photo') { this.drawPhotos(c, W, bodyH); }
      else if (this.screen === 'notes') { this.drawNotes(c, W, bodyH); }
      else if (this.screen === 'group') { this.drawGroup(c, W, bodyH); }
      else if (this.screen === 'platform') { this.drawPlatform(c, W, bodyH); }
      else if (this.screen === 'inbox') { this.drawInbox(c, W, bodyH); }
      else if (this.screen === 'message') { this.drawMessage(c, W, bodyH); }
      else if (this.screen === 'walk') { this.drawWalk(c, W, bodyH); }
      else { this.drawHome(c, W, bodyH); }
    };
    ctx.save(); ctx.beginPath(); ctx.rect(0, bannerH, W, bodyH); ctx.clip(); ctx.translate(0, bannerH);
    drawScreen(ctx);
    const threaded = this.screen === 'evening' || this.screen === 'group';
    if (banner && !threaded) {
      const keep = this.rects.length, boxes: TextBox[] = [];
      drawScreen(textBoxes(ctx, boxes));
      this.rects.length = keep;
      const veil = snapBetweenLines(boxes, banner, banner).a;
      if (veil > banner) {
        ctx.save(); ctx.beginPath(); ctx.rect(0, banner, W, veil - banner); ctx.clip();
        drawScreen(withoutText(ctx));
        ctx.restore();
        this.rects.length = keep;
        // what lay in the band is not pressable there (the banner above it is)
        this.rects = this.rects.flatMap(r => {
          if (r.y + r.h <= banner || r.y >= veil) return [r];
          if (r.y >= banner) { const h = r.y + r.h - veil; return h > 4 ? [{ ...r, y: veil, h }] : []; }
          return [r];
        });
      }
      this.veilBand = veil > banner ? { y0: banner, y1: veil } : null;
    } else this.veilBand = null;
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
    this.mirrorPass = true;
    try { this.draw(ctx, W, H); } finally { this.mirrorPass = false; }
    const mirrored = this.rects;
    this.rects = physical;
    return mirrored;
  }
  private openEvening(from: string): void {
    this.atNewest();
    this.eveningFrom = from; this.screen = from === m.group.name ? 'group' : 'evening';
    if (this.banner?.from === from) this.banner = null;   // S327: opened, the notification has done its job
    for (const e of this.evening.filter(e => e.from === from)) this.readMessages.add('evening:' + e.id);
    // ⚑ S357fr / 16-9 — her older messages from them are in the same thread (drawEvening): on the glass now, so read
    for (const b of BACKLOG.filter(b => b.from === from)) this.readMessages.add(b.from + b.time);
    if (from === m.personalMessage.from) { this.readMessages.add('personal'); veraDay.personalMessageSeen = true; }
    // ⚑ S428 (row 9) — when she opened each message: its reading time counts from here
    for (const e of this.evening.filter(e => e.from === from)) if (!this.readAt.has(e.id)) this.readAt.set(e.id, this.clockSec);
    if (this.screen === 'group') { this.openGroup(); return; }
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
    // ⚑ S429 (C1) — the thread scrolls line by line (layThread), whole lines only, no blank band; its pills as before
    this.layThread(ctx, W, top + 6, H - 8, sized.map((s, i) => ({ key: 'm' + i, h: s.h, draw: (c: CanvasRenderingContext2D, y: number) => {
      const bh = s.lines.length * 17 + 10;
      bubble(c, 10, y, W - 22, bh, 'in');
      phoneFont(c, 13); c.fillStyle = PHONE.ink;
      s.lines.forEach((ln, j) => c.fillText(ln, 19, y + 5 + j * 17));
      let yy = y + bh + 2;
      if (s.it.photo) {
        this.photoSprites ??= makeE3PhotoSprites(m.cameraRoll.busText); c.drawImage(this.photoSprites[4], 12, yy, 100, 100);
        this.rects.push({ x: 12, y: yy, w: 100, h: 100, id: 'open-photo-4' });   // ⚑ S362 / H45 — the photo in the thread opens in Photos
        yy += 104;
      }
      phoneFont(c, 10); c.fillStyle = PHONE.dim; c.fillText(s.it.time, 14, yy);
      // ⚑ S362 / H45 (his headset, 10 Nov: the photo message — "opening Orla goes to the files with the photos") — a message that
      //   is about a photo opens the Photos app on the phone's own camera roll; the bubble is the press, "Photos ›" says so
      if (s.it.opens === 'photos') {
        phoneFont(c, 11, 600); c.fillStyle = PHONE.tint;
        const lab = HOME.openPhotos, lw = c.measureText(lab).width;
        c.fillText(lab, W - 14 - lw, yy - 1);
        this.rects.push({ x: 10, y, w: W - 22, h: bh + 18, id: 'open-photos' });
      }
    } })), top);
  }
  private get bannerPhoto(): boolean { return this.evening.some(e => e === this.banner && e.photo === true); }
  /** ⚑ S429 (F1) — the banner's lower edge (its hairline shadow included) if one is drawn over this screen, else 0 */
  private bannerBottom(ctx: CanvasRenderingContext2D, W: number): number {
    const b = this.notice ?? this.banner;
    if (!b || this.bannersHidden || this.screen === 'lock' || this.groupBannerOverPreview) return 0;
    phoneFont(ctx, 12);
    const lines = previewLines(ctx, b.text, W - 12 - 20, 3);
    const photo = !this.notice && this.bannerPhoto;
    return 22 + 32 + lines.length * 16 + (photo ? 78 : 0) + 1;
  }
  /** ⚑ S434 — inside the group's own link reader (Bea's card's preview) the group's own news, forwards and review notification are not
   *  drawn over the page (as on the open thread: they land in the thread, and Back shows them); the preview stays readable until Back */
  private get groupBannerOverPreview(): boolean {
    return this.screen === 'article' && (this.notice ? this.notice.id === 'bea' || this.notice.id === 'review' : this.bannerFromGroup);
  }
  /** ⚑ S429 (F1) — where the list of a thread may begin while a banner is over it (0: no banner) */
  private bannerFloor = 0;
  /** ⚑ S429 (F1) — the band under a banner redrawn without words on a screen that is not a thread (probes read it) */
  veilBand: { y0: number; y1: number } | null = null;
  private drawBanner(ctx: CanvasRenderingContext2D, W: number): void {
    // ⚑ S428 — the phone's own notification (her Notes, the group's news, the review) is a banner like a message's, and it is the
    //   one drawn while it waits; it keeps the minute it came in
    const b = this.notice ?? this.banner;
    if (!b || this.bannersHidden || this.groupBannerOverPreview) return;
    if (this.screen === 'lock') return;   // S330: the lock screen shows its messages as stacked cards (drawLock)
    phoneFont(ctx, 12);
    const x = 6, y = 22, w = W - 12;
    const lines = previewLines(ctx, b.text, w - 20, 3);
    const photo = !this.notice && this.bannerPhoto;
    const h = 32 + lines.length * 16 + (photo ? 78 : 0);
    roundRect(ctx, x, y + 1, w, h, 10, PHONE.dim);   // a hairline shadow under the card
    roundRect(ctx, x, y, w, h, 10, PHONE.surface);
    ctx.fillStyle = PHONE.ink; phoneFont(ctx, 12, 600); ctx.fillText(b.from, x + 10, y + 8);
    phoneFont(ctx, 10); ctx.fillStyle = PHONE.dim; ctx.fillText(this.notice ? this.notice.time : this.clockShown, x + w - 36, y + 8);
    phoneFont(ctx, 12); ctx.fillStyle = PHONE.ink; lines.forEach((line, i) => ctx.fillText(line, x + 10, y + 28 + i * 16));
    if (photo) {
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
    // ⚑ S428 — the phone's own notification waiting is the newest card, on top (her press on it opens what it names)
    if (this.notice) {
      phoneFont(ctx, 12); const lines = previewLines(ctx, this.notice.text, W - 40, 2);
      const h = 30 + lines.length * 16;
      roundRect(ctx, 10, y, W - 20, h, 8, PHONE.surface);
      ctx.fillStyle = PHONE.ink; phoneFont(ctx, 12, 600); ctx.fillText(this.notice.from, 20, y + 7);
      phoneFont(ctx, 10); ctx.fillStyle = PHONE.dim; ctx.fillText(this.notice.time, W - 48, y + 8);
      phoneFont(ctx, 12); ctx.fillStyle = PHONE.ink; lines.forEach((line, i) => ctx.fillText(line, 20, y + 26 + i * 16));
      this.rects.push({ x: 10, y, w: W - 20, h, id: 'lock-notice' });
      y += h + 6;
    }
    for (const c of cards) {
      // ⚑ S429 (his 24 Nov rule; seen in this job's stills) — a card that counts more messages ("+1") keeps its preview clear of the
      //   count: it was drawn over the end of Orla's second line ("dee's keeping the corner")
      phoneFont(ctx, 12); const lines = previewLines(ctx, c.text, W - 40 - (c.more ? 26 : 0), 2);
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
   * ⚑ S426 (UiB job 35 Part D, Act III; his 20 Nov 16-16, "I wasn't reading because it didn't allow me to read") — THE GROUP, IN ITS
   * COLUMN. ⚑ S426e (his 24 Nov, on the group filling the monitor: "And now the messenger covers all of the screen?? What happened?")
   * — the thread stays in the Handset Window's own column for the whole of Act III, beside GracePlatform; the maximised desktop chat
   * (9974fe1f) is retired. What 16-16 asked for stays: it scrolls, every message is kept (none replaces the last), ▲ Earlier
   * messages / ▼ Latest look back and come forward. Over it: the platform's bar while it reviews the group (its blue), each Malta
   * message outlined, "removing…", greyed and folded (beat 13); "↪ Forward the link" in the composer's place (beat 14).
   * ⚑ S426e ("fix it first as well") — NO LINE IS CUT: the list begins under the header and the bar, with room for the first
   * message's name; the window holds whole messages only (the cut message drawn above the first, 9974fe1f, is retired); while the
   * review is scrolling to a message in its hand the pills stand down, so a long one (Bea's first) is whole. Everything of hers and
   * the platform's keeps RIGHT_PAD clear of the column's right edge (cut on a phone held upright). The composer's strip is kept
   * only while the forward chip is in it, so a long message (Bea's first) is whole under the bar.
   */
  private drawGroup(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = PHONE.bg; ctx.fillRect(0, 0, W, H);
    const y0 = statusBar(ctx, W, this.clockText);
    let top = appBar(ctx, W, y0, m.group.name, this.membersMeta());
    this.pushBack(y0, top);

    // ⚑ S426 (beat 13) — the platform's bar over the thread while it reviews it, in its blue; "Review could not keep up." once the
    //   forwards are in (S332's "Review is still running." / "{n} items could not be reviewed" are retired)
    if (this.inTakeover) {
      const lead = 12;
      phoneFont(ctx, 10, 600);
      const lines = phoneWrap(ctx, this.stage === 'after' ? REVIEW_LOST : REVIEW_BAR, W - 10 - RIGHT_PAD);
      const bh = 6 + lines.length * lead;
      ctx.fillStyle = ERA3.accent; ctx.fillRect(0, top, W, bh);
      ctx.fillStyle = PHONE.surface; lines.forEach((ln, i) => ctx.fillText(ln, 10, top + 3 + i * lead));
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
      const cw = Math.min(W - 10 - RIGHT_PAD, tw + 28), cx = W - RIGHT_PAD - cw;
      ctx.fillStyle = PHONE.hairline; ctx.fillRect(0, cy - 6, W, 1);
      roundRect(ctx, cx, cy, cw, 24, 12, PHONE.bubbleOut);
      ctx.fillStyle = PHONE.surface; ctx.fillText(FORWARD_LABEL, cx + 14, cy + 6);
      this.rects.push({ x: cx, y: cy, w: cw, h: 24, id: 'forward-link' });
    }

    // ⚑ bottom-up fill, and the guard tests the PROSPECTIVE position so the
    //   topmost bubble can never slide under the bar above it.
    // ⚑ S426e — a message that opens with its sender's name has NAME_GAP above it in its own slot, so the name sits clear of the
    //   bubble (or the review's outline) above it (as built the name was drawn 4 px into the bubble above)
    //   (and the message in the review's hand says whose it is, its "removing…" tag on that row)
    const named = msgs.map((msg, i) => !this.removed.has(msg.key) && msg.from !== 'system' && msg.from !== VERA
      && (i === 0 || msgs[i - 1].from !== msg.from || this.reviewing?.key === msg.key));
    const heights = msgs.map((msg, i) => (this.removed.has(msg.key) ? 22 : this.msgHeight(ctx, msg, W)) + 6 + (named[i] ? NAME_GAP : 0));
    const listBottom = this.forwardOffered ? cy - 8 : H - 8;
    // ⚑ S426 (beat 13: "one message at a time, slowly enough to watch") — the review takes her to the Malta message in its hand: if
    //   it is not whole in view, the thread scrolls to it, the bottom pill standing down meanwhile. Once the forwards come the thread
    //   follows the newest again, and the review's marks are pushed up by them (beat 14: it cannot keep up). ⚑ S426e — only while she
    //   has not scrolled herself (then her place is kept). ⚑ S429: `layThread` does it, line by line.
    const inHand = this.reviewing && !this.cascadeOn && !this.userScrolled ? this.reviewing.key : null;
    // ⚑ S429 (C1) — THE GROUP SCROLLS LINE BY LINE (layThread): the wheel, the thumbstick, ▲ ▼; whole lines only, no blank band. A
    //   message's name is drawn at the head of each sender's run, as a 2016 phone does (S426e's name for the first whole message in
    //   view, NAME_ROOM, is retired with the paged window: 282003e0).
    this.layThread(ctx, W, top + 4, listBottom, msgs.map((msg, i) => ({ key: msg.key, h: heights[i], draw: (c: CanvasRenderingContext2D, y: number) => {
      const my = y + (named[i] ? NAME_GAP : 0), who = named[i];
      if (this.removed.has(msg.key)) {
        // ⚑ the platform reached into her phone: the bubble stays, emptied, in the system's grey
        // ⚑ S426e — whole inside the column's RIGHT_PAD (as built it reached 171 of 180: "GracePlatfo|rm" on an upright phone)
        const room = W - RIGHT_PAD - 30;
        phoneFont(c, 10); if (c.measureText(REMOVED_LINE).width + 14 > room) phoneFont(c, 9);
        const tw = Math.min(room, Math.ceil(c.measureText(REMOVED_LINE).width) + 14);
        const rx = msg.from === VERA ? W - RIGHT_PAD - tw : 30;
        roundRect(c, rx, my, tw, 18, 9, PHONE.hairline);
        c.fillStyle = PHONE.dim; c.fillText(REMOVED_LINE, rx + 7, my + 4);
        return;
      }
      const rv = this.reviewing?.key === msg.key ? this.reviewing : null;
      const box = msg.from === VERA ? this.drawMine(c, msg, my, W) : this.drawMsg(c, msg, my, W, who, rv?.phase === 'grey');
      if (rv && box) this.drawReviewMark(c, box, rv.phase, who ? msg.from : '', W);
    } })), top, inHand);
    this.groupView = { keys: this.threadWhole, scrollBack: this.scrollBack, userScrolled: this.userScrolled, unseen: this.unseen };
  }
  /** ⚑ S426 — the thread was scrolled by the review (to the message in its hand), not by her */
  private scrollByPiece = false;
  /** ⚑ S434b — the card to stand whole on the group's next draw in the Handset Window (back from its preview); and that draw */
  private revealKey: string | null = null;
  private mirrorPass = false;
  /** ⚑ S434b — the probes' handle: the last thread drawn in the Handset Window: its list's top and foot (above the ▼ pill's strip when
   *  one shows), the pill, and each message's slot on the glass (the phone's own pixels) */
  mirrorThread: { vTop: number; vBottom: number; latest: boolean; whole: string[]; slots: Record<string, { y0: number; y1: number }> } | null = null;
  /** ⚑ S426e — she has scrolled up herself (▲): nothing that lands pulls her down; `unseen` messages have landed below her since */
  private userScrolled = false;
  private unseen = 0;
  /** ⚑ S426e — the probes' handle on the group's view: the keys drawn (whole), her scroll, what landed unseen */
  groupView: { keys: string[]; scrollBack: number; userScrolled: boolean; unseen: number } = { keys: [], scrollBack: 0, userScrolled: false, unseen: 0 };

  /** ⚑ S426 (beat 13) — the platform's hand on a message: its outline (dashed, marching at OUTLINE_HZ; still under reduced motion),
   *  and from the second step a "removing…" tag at the bubble's top right, both in the platform's blue */
  private drawReviewMark(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }, phase: 'outline' | 'removing' | 'grey', name = '', W = 180): void {
    if (phase === 'outline' || phase === 'removing') {
      ctx.save();
      ctx.strokeStyle = ERA3.accent; ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]); ctx.lineDashOffset = this.outlineStep() * 4;
      ctx.strokeRect(Math.round(b.x - 3) + 0.5, Math.round(b.y - 1) + 0.5, Math.round(b.w + 6), Math.round(b.h + 4));   // S426e: its top clear of the name
      ctx.restore();
    }
    if (phase === 'removing' || phase === 'grey') {
      // ⚑ S426e — on the name's row, right of the name (never over it), inside the column's RIGHT_PAD
      phoneFont(ctx, 10, 600);
      const nameEnd = name ? b.x + 2 + Math.ceil(ctx.measureText(name).width) + 6 : b.x;
      const lw = Math.ceil(ctx.measureText(REVIEW_REMOVING).width) + 12;
      const tx = Math.round(Math.min(W - RIGHT_PAD - lw, Math.max(b.x + b.w - lw, nameEnd))), ty = Math.round(b.y - 12);
      roundRect(ctx, tx, ty, lw, 15, 7, ERA3.accent);
      ctx.fillStyle = PHONE.surface; ctx.fillText(REVIEW_REMOVING, tx + 6, ty + 2);
    }
  }

  /** ⚑ S332 — her one message in the era, on the right where her words would always have been.
   *  ⚑ S426 (beat 14) — it is her forward now (her reply is retired): the link card on her side, edged in her colour, no words */
  private drawMine(ctx: CanvasRenderingContext2D, msg: Msg, y: number, W: number): { x: number; y: number; w: number; h: number } {
    const w = W - 40 - RIGHT_PAD, x = W - RIGHT_PAD - w, h = this.cardH(ctx, msg, w);
    roundRect(ctx, x - 2, y - 2, w + 4, h + 4, 11, PHONE.bubbleOut);
    this.drawLinkCard(ctx, x, y, w, msg, false);
    return { x, y, w, h };
  }

  private msgHeight(ctx: CanvasRenderingContext2D, msg: Msg, W: number): number {
    if (msg.from === 'system') { phoneFont(ctx, 10); return 17; }
    // ⚑ S426e — a card is as tall as its whole headline (and Bea's, its fact line): nothing on it is cut (cardH)
    if (msg.kind === 'link' || msg.kind === 'link2') return this.cardH(ctx, msg, msg.from === VERA ? W - 40 - RIGHT_PAD : W - 30 - RIGHT_PAD) + 4;
    phoneFont(ctx, 13);
    return 15 + phoneWrap(ctx, msg.text ?? '', this.textW(W)).length * 17;
  }
  /** the width a message's words wrap to (as built W - 62; ⚑ S426e: inside RIGHT_PAD, the bubble's 18 px of padding beside them) */
  private textW(W: number): number { return W - 30 - RIGHT_PAD - 18; }

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
    // ⚑ S426e — a card that opens a sender's run says who sent it too (as built only a bubble did: Bea's card stood unnamed at the top)
    if (showWho && (msg.kind === 'link' || msg.kind === 'link2')) { phoneFont(ctx, 10, 600); ctx.fillStyle = PHONE.dim; ctx.fillText(msg.from, bx + 2, y - 10); }
    if (msg.kind === 'link' || msg.kind === 'link2') {
      const w = W - bx - RIGHT_PAD;
      this.drawLinkCard(ctx, bx, y, w, msg, grey);
      // ⚑ S434 — Bea's card is a press now (his "Yes, a preview"), until the review greys it; the forwards' cards stay cards
      if (msg.kind === 'link2' && !grey) this.rects.push({ x: bx, y, w, h: this.cardH(ctx, msg, w), id: 'malta-open' });
      return { x: bx, y, w, h: this.cardH(ctx, msg, w) };
    }
    phoneFont(ctx, 13);
    const lines = phoneWrap(ctx, msg.text ?? '', this.textW(W));
    let widest = 0;
    for (const ln of lines) widest = Math.max(widest, ctx.measureText(ln).width);
    const bw = Math.min(W - bx - RIGHT_PAD, widest + 18);
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
  /** ⚑ S426e (his 24 Nov: no line cut) — the card's lines at width `w`: its masthead, its whole headline, and (Bea's card) its whole fact
   *  line; at the column's width the red square gives way to a red spine at the card's left, so the words have the width (as built
   *  the headline was cut at two lines and the fact line at one: "Malta outlaws conversion" / "Malta · Act LV of") */
  private cardLines(ctx: CanvasRenderingContext2D, msg: Msg, w: number): { head: string[]; fact: string[] } {
    const link = msg.kind === 'link2' ? LINK_VOTE : m.link;
    phoneFont(ctx, 11, 600); const head = phoneWrap(ctx, link.headline, w - 22);
    phoneFont(ctx, 9); const fact = msg.kind === 'link2' ? phoneWrap(ctx, LINK_VOTE.fact, w - 22) : [];
    return { head, fact };
  }
  private cardH(ctx: CanvasRenderingContext2D, msg: Msg, w: number): number {
    const { head, fact } = this.cardLines(ctx, msg, w);
    return 7 + 12 + head.length * 13 + (fact.length ? 4 + fact.length * 11 : 0) + 7;
  }
  private drawLinkCard(
    ctx: CanvasRenderingContext2D, x: number, y: number, w: number, msg: Msg, grey: boolean
  ): void {
    const link = msg.kind === 'link2' ? LINK_VOTE : m.link, { head, fact } = this.cardLines(ctx, msg, w), h = this.cardH(ctx, msg, w);
    roundRect(ctx, x, y, w, h, 9, grey ? PHONE.hairline : PHONE.surface);
    ctx.fillStyle = grey ? PHONE.faint : PHONE.tileLive; ctx.fillRect(x + 5, y + 7, 4, h - 14);
    const tx = x + 15;
    phoneFont(ctx, 9);
    ctx.fillStyle = grey ? PHONE.faint : PHONE.dim;
    ctx.fillText(link.masthead, tx, y + 7);
    phoneFont(ctx, 11, 600);
    ctx.fillStyle = grey ? PHONE.faint : PHONE.ink;
    head.forEach((ln, i) => ctx.fillText(ln, tx, y + 19 + i * 13));
    if (fact.length) {
      phoneFont(ctx, 9);
      ctx.fillStyle = grey ? PHONE.faint : PHONE.dim;
      fact.forEach((ln, i) => ctx.fillText(ln, tx, y + 19 + head.length * 13 + 4 + i * 11));
    }
  }

  /** ⚑ S434 — Bea's card may be opened: it has landed, and the review has not greyed or removed it */
  private get maltaCardOpenable(): boolean {
    const k = NEWS.findIndex((n) => n.kind === 'link2');
    if (k < 0 || this.newsN <= k) return false;
    const key = 'n' + k;
    return !this.removed.has(key) && !(this.reviewing?.key === key && this.reviewing.phase === 'grey');
  }
  /** ⚑ S434 — what the preview drew, per canvas size (the Handset Window's 180 × 310, the phone in the room's 180 × 360): each line
   *  with its size and box, how many body lines, and any paragraph left out for want of room (none, by design). Probes read it. */
  previewViews: Record<string, { W: number; H: number; top: number; lines: { t: string; role: string; size: number; weight: number; x0: number; x1: number; y0: number; y1: number }[]; body: number; dropped: number }> = {};
  /**
   * ⚑ S434 (UiB job 40 Part B item 3; his 27 Nov answer to job 38's call 3: "does this also make the link from Malta something that
   * you can open? as a preview inside of the app?" — "Yes, a preview") — BEA'S CARD'S PREVIEW: the 2016 messenger's own link reader,
   * on her tap, in the phone's own grammar (theme/phone.ts: its status bar, an app bar with the one back chevron, a white page, the
   * sans, the card's red as the paper's rule). The invented masthead is the bar's title; under it the card's headline and fact line,
   * then a few short lines on what the law does (s3_maiden.json linkVote `preview`, documentary). Laid out to be read whole at the
   * seat: nothing scrolls, and a paragraph that would not fit whole is left out whole (never cut; `dropped` says so, and none is).
   * No Lambient, no platform voice, nothing filed. Back (the chevron) returns to the group where she was (pressControl 'back').
   */
  private drawPreview(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = PHONE.surface; ctx.fillRect(0, 0, W, H);
    const y0 = statusBar(ctx, W, this.clockText);
    const top = appBar(ctx, W, y0, '');
    this.pushBack(y0, top);
    type Line = { t: string; role: string; size: number; weight: 400 | 600; x0: number; x1: number; y0: number; y1: number; color: string };
    const lines: Line[] = [];
    // the masthead, the bar's title, set after the chevron (centred it would touch it)
    let ms = 14; phoneFont(ctx, ms, 600);
    while (ms > 11 && ctx.measureText(LINK_VOTE.masthead).width > W - 22 - 8) { ms--; phoneFont(ctx, ms, 600); }
    lines.push({ t: LINK_VOTE.masthead, role: 'masthead', size: ms, weight: 600, x0: 22, x1: 22 + ctx.measureText(LINK_VOTE.masthead).width, y0: y0 + 8, y1: y0 + 8 + ms + 3, color: PHONE.ink });
    const X = 10, TW = W - 20;
    let y = top + 9, dropped = 0, body = 0;
    const block = (text: string, role: string, size: number, weight: 400 | 600, step: number, color: string): Line[] => {
      phoneFont(ctx, size, weight);
      // the fact line breaks between its parts ("Malta · Act LV of 2016" / "passed 5 December"), never inside one
      const rows = role === 'fact' ? text.split(' · ').reduce<string[]>((acc, part) => {
        const last = acc[acc.length - 1];
        if (last !== undefined && ctx.measureText(last + ' · ' + part).width <= TW) acc[acc.length - 1] = last + ' · ' + part; else acc.push(part);
        return acc;
      }, []).flatMap((r) => phoneWrap(ctx, r, TW)) : phoneWrap(ctx, text, TW);
      return rows.map((t, i) => ({ t, role, size, weight, x0: X, x1: X + ctx.measureText(t).width, y0: y + i * step, y1: y + i * step + step, color }));
    };
    const place = (b: Line[], gap: number): boolean => {
      if (!b.length || b[b.length - 1].y1 > H - 6) return false;
      lines.push(...b); y = b[b.length - 1].y1 + gap; return true;
    };
    place(block(LINK_VOTE.headline, 'headline', 15, 600, 19, PHONE.ink), 3);
    place(block(LINK_VOTE.fact, 'fact', 11, 400, 14, PHONE.dim), 0);
    const rule = y + 5;
    y = rule + 9;
    for (const para of LINK_VOTE.preview) {
      const b = block(para, 'body', 12, 400, 16, PHONE.ink);
      if (place(b, 6)) body += b.length; else dropped++;
    }
    // the paper: the card's red as the masthead's rule under the bar, a hairline between the fact line and the lines on the law
    ctx.fillStyle = PHONE.tileLive; ctx.fillRect(0, top, W, 2);
    ctx.fillStyle = PHONE.hairline; ctx.fillRect(X, rule, TW, 1);
    for (const l of lines) { phoneFont(ctx, l.size, l.weight); ctx.fillStyle = l.color; ctx.fillText(l.t, l.x0, l.role === 'masthead' ? l.y0 : l.y0 + 1); }
    this.previewViews[`${W}x${H}`] = { W, H, top: y0, lines: lines.map(({ color: _c, ...l }) => ({ ...l, x0: Math.round(l.x0), x1: Math.round(l.x1) })), body, dropped };
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
    this.revealKey = null;   // ⚑ S434b — any other press: the reveal (back from the preview) is spent
    if (r.id.startsWith('lock-card:')) { this.openEvening(r.id.slice(10)); this.bump(); return true; }
    switch (r.id) {
      // ⚑ S428 — the phone's own notification (her Notes, the group's news, the review): its banner or its lock-screen card
      case 'lock-notice': this.openNotice(); return true;
      case 'evening-banner':
        if (this.notice) { this.openNotice(); return true; }
        // ⚑ S426 — a card's banner opens the group (the cards are not links: call 3)
        if (this.banner?.text === m.link.headline || this.banner?.text === LINK_VOTE.headline) { this.screen = 'group'; this.openGroup(); return true; }
        if (this.banner && this.evening.some(e => e.from === this.banner!.from && e.text === this.banner!.text)) { this.openEvening(this.banner.from); }
        else { this.screen = 'group'; this.openGroup(); }
        this.bump(); return true;
      // S358 / H13 — ⚑ S426e: she has scrolled; what lands now does not pull her down (`unseen` counts it), ▼ takes her to the bottom
      // ⚑ S429 (C1) — ▲ back a page (line-snapped, the cut message made whole), ▼ to the newest; the wheel and the stick go line by line
      case 'scroll-up': this.pageUp(); return true;
      case 'scroll-down': this.holdAt(null); this.scrollByPiece = false; return true;
      case 'inbox-prev': this.inboxPage--; this.bump(); return true;
      case 'inbox-next': this.inboxPage++; this.bump(); return true;
      case 'personal-notification': this.openPersonalThread(); return true;
      case 'unlock': this.screen = 'home'; this.bump(); return true;
      case 'notification': this.screen = 'group'; this.openGroup(); return true;
      case 'group': this.screen = 'group'; this.openGroup(); return true;
      // ⚑ S428 (row 7) — the Notes app opened while her Notes notification waits is that notification opened
      case 'notes': if (this.notice?.id === 'notes') { this.openNotice(); return true; } this.screen = 'notes'; this.bump(); return true;
      case 'inbox':
        this.screen = 'inbox';
        // The optional inbox never files a reading event.
        this.bump(); return true;
      // S158: the chat goes back to Messages; S177: so does an open message
      case 'back':
        // ⚑ S428 (row 8) — her note written, her ‹ closes the Notes: the phone locks (Nuala's message lands there, graceQueueLite)
        if (this.screen === 'notes' && this.notesConducted && this.refusalWritten && !this.notesClosed) {
          this.notesClosed = true; this.screen = 'lock'; this.banner = null; this.bannerAge = 0; this.holdFor = 2; this.bump(); return true;
        }
        // ⚑ S434 — the preview's Back: to the group, where she was (her scroll kept); the group in front of her again does what
        //   opening it does (the review asked for begins; what landed meanwhile is seen there)
        if (this.screen === 'article') {
          const k = NEWS.findIndex((n) => n.kind === 'link2');
          this.revealKey = k >= 0 && !this.removed.has('n' + k) ? 'n' + k : null;   // S434b: the card she tapped, whole in view
          this.screen = 'group'; this.openGroup(true); return true;
        }
        // ⚑ S428 (row 15) — "Review could not keep up." seen, closing the group is one of her two ways on (the update follows)
        if (this.screen === 'group' && this.endSeen && !this.endAnswered) this.endAnswered = 'close';
        if (this.screen === 'photo') { this.screen = 'photos'; this.bump(); return true; } if (this.screen === 'photos' && this.photosFrom) { this.screen = this.photosFrom; this.photosFrom = null; this.bump(); return true; } this.screen = this.screen === 'group' || this.screen === 'message' || this.screen === 'evening' || this.personalOpen ? 'inbox' : 'home'; this.openMessage = null; this.bump(); return true;
      case 'platform': this.screen = 'platform'; this.bump(); return true;
      case 'photos-prev': this.photoPage--; this.bump(); return true;
      case 'photos-next': this.photoPage++; this.bump(); return true;
      case 'photos': this.photosFrom = null; this.photoPage = 0; this.screen = 'photos'; this.bump(); return true;
      // ⚑ S362 / H45 — from a message about a photo: the camera roll, and Back returns to the thread it came from
      case 'open-photos': this.photosFrom = this.screen; this.photoPage = 0; this.screen = 'photos'; this.bump(); return true;
      case 'open-photo-4': this.photosFrom = this.screen; this.photoIndex = 4; this.screen = 'photo'; this.bump(); return true;
      case 'walk': this.screen = 'walk'; this.bump(); return true;
      // ⚑ S434 (UiB job 40 Part B item 3; his "Yes, a preview") — her tap on Bea's card: its preview, the messenger's own link reader,
      //   in the phone. Only while the card is hers to read (landed, not greyed or removed by the review); it files nothing (Malta
      //   files nothing), reads nothing (the last message's reading time counts only in the thread) and holds nothing back.
      case 'malta-open':
        if (this.screen !== 'group' || !this.maltaCardOpenable) return true;
        this.screen = 'article'; this.banner = this.bannerFromGroup ? null : this.banner; this.bannerFromGroup = false; this.bump(); return true;
      // ⚑ S426 (beat 14; his call 4) — her forward, one press: it lands among theirs, a link with no words, and it stays (the review
      //   never reaches it). Nothing is filed. (S332's reply, `reply-bea`, is retired: 17847974.)
      case 'forward-link':
        if (!this.forwardOffered) return true;
        this.forwarded = true; this.forwardAt = this.cascadeN; this.landedAt.set('v', this.clockShown);
        if (this.stage === 'after' && !this.endAnswered) this.endAnswered = 'forward';   // ⚑ S428 (row 15): the update follows
        this.scrollO = null; this.userScrolled = false; this.unseen = 0;   // her own forward, seen where it lands
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
      case 'news': this.startNews(); this.newsN = NEWS.length; this.stage = 'read'; veraDay.voted = true; this.screen = 'group'; this.notice = null; this.newsHeld = false; this.bump(); break;
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
   * ⚑ S358 / H13 (his headset, 10 Nov: "no way to scroll the messages on the phone") — a thread showed its newest messages only;
   * "Earlier messages" (a pill under the bar) stepped back a screenful of whole messages, "Latest" (a pill at the foot) returned.
   * ⚑ S429 (UiB job 38 C1; his 26 Nov: "the earlier messages doesn't fully work … it should be like a scroll motion, like this is a
   * phone from 2016"; "there's like blank spaces") — THE THREAD SCROLLS LINE BY LINE. It is laid out once without drawing
   * (`textBoxes`): every line's top and bottom is known, so the list is clipped between lines and never through one (job 35's whole
   * lines), and each line is a scroll stop. The wheel on the computer and the thumbstick in the headset move it a line at a time; ▲
   * stays for touch and goes back a page (the message it cuts made whole, or the page less one line), ▼ comes back to the newest. At
   * rest the newest sits at the foot; scrolled up, her place is kept while messages land under her ("▼ New messages"). The paged window
   * (`scrollWindow`, a message at a time, filling up from the foot and leaving a band of empty thread under ▲) is retired: 282003e0.
   * `scrollO` is the content's y at the list's top while she (or the review) holds it up; null at rest. `scrollBack` stays the probes'
   * word for it: 0 at rest, else the pixels of thread below the list.
   */
  private scrollO: number | null = null;
  private scrollBack = 0;
  private static readonly PILL = 20;
  /** ⚑ S429 — the last laid-out thread: where it stood, its stops (each line's top, less 2 px), the stops that begin a message */
  private thread: { O: number; V: number; restO: number; minO: number; stops: number[]; firsts: number[]; spans: { a: number; b: number }[] } | null = null;
  /** ⚑ S429 — the probes' handle: the keys of the messages whose every line is on the glass */
  private threadWhole: string[] = [];
  /** ⚑ S429 — what the last laid-out thread showed (probes and the stills read it): the list's clip, its pills */
  threadView: { c0: number; c1: number; vTop: number; vBottom: number; earlier: boolean; latest: boolean; O: number; restO: number; lines: number } | null = null;
  private layThread(ctx: CanvasRenderingContext2D, W: number, listTop: number, listBottom: number, items: ThreadItem[], pillTop: number, hold: string | null = null): void {
    const PILLR = PhoneE3.PILL + 2;
    // a banner over the thread: the list (and its ▲) begins under it (F1)
    listTop = Math.max(listTop, this.bannerFloor); pillTop = Math.max(pillTop, this.bannerFloor);
    // ── laid out without drawing: every line's top and bottom, in the thread's own coordinates ──
    const cum: number[] = []; let T = 0;
    for (const it of items) { cum.push(T); T += it.h; }
    const keep = this.rects.length, boxes: (TextBox & { i: number })[] = [];
    items.forEach((it, i) => { const bx: TextBox[] = []; it.draw(textBoxes(ctx, bx), cum[i]); for (const b of bx) boxes.push({ ...b, i }); });
    this.rects.length = keep;
    const sorted = [...boxes].sort((a, b) => a.y0 - b.y0);
    const rows: { y0: number; y1: number; i: number }[] = [];
    for (const b of sorted) { const r = rows[rows.length - 1]; if (r && b.y0 < r.y1) r.y1 = Math.max(r.y1, b.y1); else rows.push({ y0: b.y0, y1: b.y1, i: b.i }); }
    // a stop is 2 px above its line, never above the end of the line before it (so the list's top never falls inside that one)
    const stops = rows.map((r, k) => Math.max(k ? rows[k - 1].y1 : -Infinity, r.y0 - 2));
    const firstOf = new Map<number, number>();
    rows.forEach((r, k) => { if (!firstOf.has(r.i)) firstOf.set(r.i, stops[k]); });
    const firsts = [...firstOf.values()].sort((a, b) => a - b);
    const spans = items.map((it, i) => {
      const own = boxes.filter((b) => b.i === i);
      return own.length ? { a: Math.min(...own.map((b) => b.y0)) - 2, b: Math.max(...own.map((b) => b.y1)) + 2 } : { a: cum[i], b: cum[i] + it.h };
    });
    const minO = Math.min(0, stops[0] ?? 0);
    // ── where the list stands: at rest the newest at the foot; scrolled, her place; ▲ and ▼ reserve their strips ──
    const fit = (want: number | null, showLatest: boolean) => {
      const latest = want !== null && showLatest;
      const vBottom = latest ? listBottom - PILLR : listBottom;
      for (const reserveTop of [true, false]) {
        const vTop = reserveTop ? Math.max(listTop, pillTop + PILLR) : listTop, V = vBottom - vTop, restO = T - V;
        if (restO <= minO + 0.5) { if (reserveTop) continue; return { vTop, vBottom, V, O: restO, restO, earlier: false, rest: true, latest: false }; }
        const O = want === null ? restO : Math.max(minO, Math.min(restO, want));
        const earlier = O > minO + 0.5;
        if (reserveTop && !earlier) continue;
        return { vTop, vBottom, V, O, restO, earlier, rest: want === null || O >= restO - 0.5, latest };
      }
      return { vTop: listTop, vBottom, V: vBottom - listTop, O: minO, restO: minO, earlier: false, rest: true, latest: false };
    };
    // the review's hand: the message it is on is brought whole into view, unless she has scrolled herself
    const held = hold ? items.findIndex((x) => x.key === hold) : -1;
    let f = fit(this.scrollO, !(held >= 0 && this.scrollByPiece));
    if (held >= 0 && !this.userScrolled) {
      const s = spans[held];
      if (s.a < f.O - 0.5 || s.b > f.O + f.V + 0.5) {
        this.scrollO = s.b - s.a <= f.V ? s.b - f.V : s.a; this.scrollByPiece = true;
        f = fit(this.scrollO, false);
      }
    } else if (held < 0 && this.scrollByPiece && !this.userScrolled) { this.scrollO = null; this.scrollByPiece = false; f = fit(null, true); }
    // ⚑ S434b (the coordinator's frame 12: back from the preview with her place kept, Bea's card stood cut at the thread's foot, its fact
    //   line hidden under the edge and the ▼ pill) — BACK FROM THE PREVIEW, THE CARD SHE TAPPED STANDS WHOLE: its whole slot (the card and
    //   the gap under it) inside the list, its foot above the ▼ pill's strip when one shows, by the least shift from her place (down if
    //   it was cut at the foot, up if at the top); her place is that, then (the place she was reading). Everything else as before: the
    //   whole-lines rule cuts no other row (S429b). Measured on the Handset Window's own canvas (`mirrorPass`), once.
    if (this.revealKey && this.mirrorPass) {
      const i = items.findIndex((x) => x.key === this.revealKey);
      this.revealKey = null;
      if (i >= 0) {
        const a = cum[i], b = cum[i] + items[i].h;
        for (let k = 0; k < 3 && (a < f.O - 0.5 || b > f.O + f.V + 0.5); k++) {
          this.scrollO = b - a > f.V || a < f.O - 0.5 ? a : b - f.V; this.userScrolled = true; this.scrollByPiece = false;
          f = fit(this.scrollO, true);
        }
      }
    }
    if (f.rest && this.scrollO !== null && !(held >= 0 && this.scrollByPiece)) { this.scrollO = null; f = fit(null, true); }
    if (this.scrollO === null) { this.unseen = 0; this.userScrolled = false; }
    this.scrollBack = this.scrollO === null ? 0 : Math.max(1, Math.round(f.restO - f.O));
    // ── the clip, between lines: a line the list's edge would cut is left out whole ──
    const toScreen = (b: TextBox): TextBox => ({ y0: b.y0 - f.O + f.vTop, y1: b.y1 - f.O + f.vTop });
    const on = boxes.map(toScreen);
    const { a: c0, b: c1 } = snapBetweenLines(on, f.vTop, f.vBottom);
    // ⚑ S429b (G1; "a hidden line draws nothing at all, descenders included … a bubble with no whole line on view is not drawn; a
    //   bubble's visible part ends with the padding of its last whole line") — EACH MESSAGE AS MUCH AS ITS WHOLE LINES. A message with no
    //   whole line on view draws nothing (no empty bubble, no tails); one cut by the list's edge shows its bubble, card or picture only
    //   to EDGE_PAD past its first and last whole lines; its words are drawn line by line, a line whole or not at all (S429's clip of the
    //   words, through which a hidden line's descenders leaked, and its bubbles run to the list's edges: 3fa9452d)
    const EDGE_PAD = 5;
    const r0 = this.rects.length;
    items.forEach((it, i) => {
      const y = f.vTop + cum[i] - f.O;
      if (y + it.h < f.vTop - 24 || y > f.vBottom + 24) return;
      const own = on.filter((_b, k) => boxes[k].i === i), seen = own.filter((b) => b.y0 >= c0 && b.y1 <= c1);
      if (own.length && !seen.length) return;
      // its bubble (or card) is drawn only around its own words: a message cut by the list's edge whose bubble words are all hidden
      //   (only its name above, or its time under, on view) shows those lines alone, no strip of empty bubble
      const big = Math.max(0, ...own.map((b) => b.y1 - b.y0)), main = seen.filter((b) => b.y1 - b.y0 >= big - 1);
      const cutAbove = own.some((b) => b.y0 < c0), cutBelow = own.some((b) => b.y1 > c1);
      const shapes = !(cutAbove || cutBelow) || main.length > 0;
      const top = cutAbove && main.length ? Math.max(f.vTop, Math.min(...main.map((b) => b.y0)) - EDGE_PAD) : f.vTop;
      const bot = cutBelow && main.length ? Math.min(f.vBottom, Math.max(...main.map((b) => b.y1)) + EDGE_PAD) : f.vBottom;
      if (shapes) {
        ctx.save(); ctx.beginPath(); ctx.rect(0, top, W, Math.max(0, bot - top)); ctx.clip();
        it.draw(withoutText(ctx), y);
        ctx.restore();
      }
      const k0 = this.rects.length;
      ctx.save(); ctx.beginPath(); ctx.rect(0, f.vTop, W, f.vBottom - f.vTop); ctx.clip();
      it.draw(wholeLinesOnly(ctx, c0, c1), y);
      ctx.restore();
      this.rects.length = k0;
      // what it publishes, only where it is drawn
      for (let k = r0; k < this.rects.length; k++) if (this.rects[k].y < top || this.rects[k].y + this.rects[k].h > bot) {
        const r = this.rects[k], y0 = Math.max(r.y, top), y1 = Math.min(r.y + r.h, bot);
        this.rects[k] = y1 - y0 > 4 ? { ...r, y: y0, h: y1 - y0 } : { ...r, h: 0 };
      }
    });
    // its own presses, only where it is drawn
    const added = this.rects.splice(r0).filter((r) => r.h > 4);
    this.rects.push(...added);
    this.threadWhole = items.filter((_it, i) => {
      const own = on.filter((_b, k) => boxes[k].i === i);
      return own.length > 0 && own.every((b) => b.y0 >= c0 && b.y1 <= c1);
    }).map((it) => it.key);
    this.thread = { O: f.O, V: f.V, restO: f.restO, minO, stops, firsts, spans };
    if (this.mirrorPass) this.mirrorThread = { vTop: Math.round(f.vTop), vBottom: Math.round(f.vBottom), latest: f.latest, whole: [...this.threadWhole],
      slots: Object.fromEntries(items.map((it, i) => [it.key, { y0: Math.round(f.vTop + cum[i] - f.O), y1: Math.round(f.vTop + cum[i] + it.h - f.O) }])) };
    this.threadView = { c0, c1, vTop: f.vTop, vBottom: f.vBottom, earlier: f.earlier, latest: f.latest, O: Math.round(f.O), restO: Math.round(f.restO),
      lines: on.filter((b) => b.y0 >= c0 && b.y1 <= c1).length };
    // ── the ways to look back, over the list's reserved strips (the bottom one stands down while the review holds the thread) ──
    this.drawScrollPills(ctx, W, pillTop, listBottom, f.earlier, f.latest);
  }
  private drawScrollPills(ctx: CanvasRenderingContext2D, W: number, top: number, bottom: number, earlier: boolean, latest: boolean): void {
    const pill = (label: string, y: number, id: string, up: boolean): void => {
      // ⚑ S426 — on a band of the thread's ground, so nothing of the thread shows round it
      ctx.fillStyle = PHONE.bg; ctx.fillRect(0, y - 3, W, PhoneE3.PILL + 2);
      phoneFont(ctx, 9);
      // ⚑ S426e (16-16: "▲ ▼ to look back") — a drawn ▲ / ▼ before the words, so the pill says which way it goes
      const pw = Math.ceil(ctx.measureText(label).width) + 31, px0 = Math.round((W - pw) / 2);
      roundRect(ctx, px0, y, pw, PhoneE3.PILL - 4, 8, PHONE.hairline);
      const tx = px0 + 10, ty = y + 8;
      ctx.fillStyle = PHONE.ink; ctx.beginPath();
      if (up) { ctx.moveTo(tx, ty + 2); ctx.lineTo(tx + 7, ty + 2); ctx.lineTo(tx + 3.5, ty - 3); }
      else { ctx.moveTo(tx, ty - 2); ctx.lineTo(tx + 7, ty - 2); ctx.lineTo(tx + 3.5, ty + 3); }
      ctx.closePath(); ctx.fill();
      ctx.fillText(label, px0 + 21, y + 3);
      this.rects.push({ x: 0, y: y - 2, w: W, h: PhoneE3.PILL, id });
    };
    if (earlier) pill(m.group.earlier, top + 3, 'scroll-up', true);
    // ⚑ S426e (his 24 Nov) — scrolled up while messages land, the bottom pill says so: "New messages" (it takes her to the bottom)
    if (latest) pill(this.unseen > 0 ? m.group.newMessages : m.group.latest, bottom - PhoneE3.PILL + 2, 'scroll-down', false);
  }
  /* (⚑ S426e — the wide group's ▲ ▼ gutter, `drawScrollArrows`, is retired with the wide group: 9974fe1f. The column's pills carry
   *  ▲ / ▼ drawn in them.) */
  /** ⚑ S429 — a thread is on the glass (her Orla, Mam, Nuala; the group): the wheel and the thumbstick scroll it */
  get threadOnGlass(): boolean { return (this.screen === 'group' || this.screen === 'evening') && !this.disconnected && !!this.thread; }
  /** ⚑ S429 — a thread opened: at its newest, nothing held, the last thread's stops forgotten */
  private atNewest(): void { this.scrollO = null; this.scrollBack = 0; this.userScrolled = false; this.unseen = 0; this.scrollByPiece = false; this.thread = null; this.wheelAcc = 0; }
  /** ⚑ S429 — she holds the thread at content y `O` (null: back to the newest); true if it moved */
  private holdAt(O: number | null): boolean {
    const t = this.thread;
    if (!t) return false;
    if (O !== null) O = Math.max(t.minO, O);
    if (O !== null && O >= t.restO - 0.5) O = null;
    if (O === this.scrollO || (O !== null && this.scrollO !== null && Math.abs(O - this.scrollO) < 0.5)) return false;
    this.scrollO = O; this.scrollByPiece = false;
    if (O === null) { this.userScrolled = false; this.unseen = 0; } else this.userScrolled = true;
    this.bump(); return true;
  }
  /** ⚑ S429 (C1) — `n` lines down (towards the newest; up when negative): the wheel's and the thumbstick's step */
  scrollLines(n: number): boolean {
    const t = this.thread;
    if (!t || !this.threadOnGlass || !n) return false;
    let O = this.scrollO ?? t.O;   // two steps before the glass is redrawn go on from the first
    for (let k = 0; k < Math.abs(n); k++) {
      if (n < 0) { const up = t.stops.filter((v) => v < O - 0.5); O = up.length ? Math.max(t.minO, up[up.length - 1]) : t.minO; }
      else { const down = t.stops.find((v) => v > O + 0.5); O = down === undefined ? t.restO : Math.min(down, t.restO); }
    }
    return this.holdAt(O);
  }
  /** ⚑ S429 (C1) — ▲ for touch: back a page. The message the list's top cuts is made whole if it fits; else the page less one line,
   *  begun at a message's first line where one falls in it */
  private pageUp(): boolean {
    const t = this.thread;
    if (!t) return false;
    const O0 = this.scrollO ?? t.O, N0 = O0 - (t.V - THREAD_LINE);
    const cut = t.spans.find((s) => s.a < O0 - 0.5 && s.b > O0 + 0.5);
    const lo = cut ? Math.max(N0, cut.b - t.V) : N0, hi = cut ? cut.a + 0.5 : O0 - 0.5;
    let O = t.firsts.find((v) => v >= lo - 0.5 && v < hi);
    if (O === undefined && cut && cut.b - cut.a <= t.V) O = cut.a;
    if (O === undefined) O = t.stops.find((v) => v >= N0 - 0.5 && v < O0 - 0.5);
    if (O === undefined) { const up = t.stops.filter((v) => v < O0 - 0.5); O = up.length ? up[up.length - 1] : t.minO; }
    return this.holdAt(O);
  }
  private wheelAcc = 0;
  /** ⚑ S429 (C1) — the computer's wheel over the thread: page pixels (down reads on), a line per WHEEL_PX_PER_LINE. True while a thread
   *  is on the glass (the wheel is the thread's there, never the camera's zoom) */
  wheel(dy: number): boolean {
    if (!this.threadOnGlass) return false;
    if (Math.sign(dy) !== Math.sign(this.wheelAcc)) this.wheelAcc = 0;
    this.wheelAcc += dy;
    const n = Math.trunc(this.wheelAcc / WHEEL_PX_PER_LINE);
    if (n) { this.wheelAcc -= n * WHEEL_PX_PER_LINE; this.scrollLines(n); }
    return true;
  }
  private stickY = 0;
  private stickAt = -1;
  private stickAcc = 0;
  /** ⚑ S429 (C1) — the headset's thumbstick (y down +), read each frame; `tick` steps the thread at ≤ STICK_MAX_RATE lines a second */
  stick(y: number): void { this.stickY = y; this.stickAt = this.clockSec; }
  private tickStick(dt: number): void {
    const live = this.threadOnGlass && Math.abs(this.stickY) > STICK_DEAD && this.clockSec - this.stickAt < 0.3;
    if (!live) { this.stickAcc = 1; return; }   // the first push steps at once
    const k = (Math.min(1, Math.abs(this.stickY)) - STICK_DEAD) / (1 - STICK_DEAD);
    this.stickAcc += dt * (STICK_MIN_RATE + (STICK_MAX_RATE - STICK_MIN_RATE) * k);
    if (this.stickAcc >= 1) { this.stickAcc -= 1; this.scrollLines(Math.sign(this.stickY)); }
    if (this.stickAcc > 1) this.stickAcc = 1;
  }
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

  private openGroup(keepPlace = false): void {
    if (!keepPlace) this.atNewest();   // ⚑ S434: back from Bea's card's preview, her place in the thread is kept
    this.markGroupSeen();
    veraDay.phoneAnswered = true;
    // ⚑ S428 (rows 10 and 13) — opening the group, however she opens it (its notification, its lock card, Messages), starts what
    //   waits there: the rest of Bea's news, or the platform's review. Its notification has done its job.
    if (this.notice && (this.notice.id === 'bea' || this.notice.id === 'review')) this.notice = null;
    if (this.bannerFromGroup) { this.banner = null; this.bannerFromGroup = false; }
    if (this.newsHeld) { this.newsHeld = false; this.newsT = 0; }
    if (this.reviewDue) { this.reviewDue = false; this.startReview(); }
    this.bump();
  }

  get floppyBlocked(): boolean { return this.opts.floppyOpen(); }
  /** ⚑ she opened it at least once — the record's only branch, and it changes
   *  nothing anyone can see. */
  get everOpened(): boolean { return this.opened; }
}
