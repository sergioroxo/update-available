import { readHold } from '../readHold';
import { drawLambyGuide, drawGuidePointer, type GuidePaint } from './lambyGuideDraw';
import type { LambyGuide } from '../../narrative/lambyGuide';
/**
 * ⚑ ERA 4'S SCREENS — 2026 v3, "the pressure" (S321, 7 Nov 2026).
 *
 * Plan of record: `docs/reinterp/DESIGN_2026_V3_PRESSURE_2026-11-07.md` (his rulings of 7 Nov). Built record:
 * `docs/reinterp/E4_V3_SCREENS_BUILT_2026-11-07.md`. The week Maya turns 18, everyone leaves her except the one voice
 * that wants her gone. This class owns the story of BOTH screens on her desk and draws the monitor's:
 *
 *   · the MONITOR carries the browser — the system: Mum's link and the news tabs it opens (invented mastheads, real
 *     dated facts), the clinic portal ("You are number 4,812"), Meridian's refusal, the search finished for her, the
 *     bot (Second Thoughts: sycophancy, the goal picture, the map and the clip), and Photos (the original).
 *   · the LAPTOP carries Kettle, the messenger — the people: the house chat, Mum (one press per year), Dad, Junie.
 *     `E4Messenger` (`messenger.ts`) is its view; this class decides when anything arrives there.
 *
 * ⚑ THE CONTRACT (`src/narrative/e4Beats.ts`): the screens MARK a beat the moment the story reaches it — eighteen,
 * newyou, mum, dad, link, number, meridian, left, search, bot, map, junie, original — and the room (built separately)
 * reads them. Nothing here imports the room.
 *
 * ⚑ THE PRESENTATION RULES (the plan's seven): every page keeps its buttons in one bar at the foot of the window, the
 * primary the biggest thing in it; no fake text box anywhere; the highlight ring is off unless Lamby is asked or the
 * player has stalled (`STALL_SECONDS`); dark ink on light; the bolder face (theme/fonts.ts, monospace for system lines
 * only); short tab names; few words per page.
 *
 * ⚑ NO BEAT WAITS ON A LOOK (R28 amendment 1, revised 2026-10-10): whenever the story moves to the other screen the
 * piece TURNS her there (`face`, wired in app.ts to the conducted camera move).
 *
 * ⚑ THERE IS NO TEXT BOX AND THERE NEVER WILL BE (R28 amendment 3). The search is finished FOR her; every answer is a
 * chip; her one reply to Mum is a draft she never sent.
 */
import { setFont, px, wrapText } from '../theme/chrome';
import { monoFor, newsFor } from '../theme/fonts';
import { playOnce, anythingPlaying } from '../../audio/tapeAudio';
import { Screensaver, SAVER_SECONDS } from './screensaver';
import SAVERS from '../../../data/strings/screensavers.json';
import lexStrings from '../../../data/strings/lexicon.json';
import { meetWord } from '../../room/lexicon';
import { browserChrome, restoring, glitchBands, CHROME, ADDR, ERA4, V3, WEB, KETTLE, PLACE, CLIP, roundRect, roundEdge, pill, thumb, assistantMark,
  profileGlyph, streamScene, streamShot, progressBar, type TabLook } from '../theme/era4';
import { ledger } from '../../state/ledger';
import { buildStartModel } from '../../witness/startModel';
import { StartMenuMap } from './startMenuMap';
import { gameMenuBus } from '../../state/gameMenuBus';
import startCopy from '../../../data/strings/slice.json';
import { StartPanel, fakeOs } from './startPanel';
import { beatDone } from '../../witness/map';
import { FloppySheep } from './floppysheep';   // S363 / N1: its bookmark is off the new tab; the game stays reachable for review
import { markE4, e4Has } from '../../narrative/e4Beats';
import { E4Messenger, drawLoftPhoto, type ChatId } from './messenger';
import { drawGoalPicture } from './goalPicture';
import { drawSwapFilter } from './swapFilter';
import { drawContagionClip, CLIP_LOOP_SECONDS, CLIP_POSTER_SECONDS, startClipSound, stopClipSound } from './contagionClip';
import { consoleSession } from '../../room/consoleSession';
import updates from '../../../data/strings/updates.json';
import script from '../../../data/dialog/s4_boot.json';
import body from '../../../data/dialog/s4_browser.json';
import ballScript from '../../../data/dialog/s4_ball.json';
import V from '../../../data/dialog/s4_v3.json';
import closeMessage from '../../../data/strings/close_message.json';

export interface Hit { x: number; y: number; w: number; h: number; id: string }
type Surface = 'monitor' | 'laptop' | 'headset';
/** ⚑ S328 — a window on the monitor: its frame (x, w), its content (cx, cy, cw, ch), the scale its page is drawn at,
 *  and the page's own logical size. Each page keeps ONE logical width, so it is laid out once; enlarging a window
 *  changes its scale, never its layout. */
interface Win { x: number; w: number; cx: number; cy: number; cw: number; ch: number; s: number; lw: number; lh: number }
interface Layout { b: Win; k: Win }
/** ⚑ S328 — ONE SCREEN (T03/T43). The monitor is 710 × 384. The taskbar (L, the date) at the foot, a title bar on
 *  each window. Sizes chosen so the larger window's body type reads at 15 px on the monitor (the browser's 17 px body
 *  at 0.9, Kettle's 10 px at 1.53) and the smaller window's never drops under 11. */
const WIN = { taskbar: 20, title: 18, gap: 4, kettleSmall: 206, kettleBig: 290, browserW: 556, kettleW: 190 } as const;
const inside = (x: number, y: number, w: Win): boolean => x >= w.cx && x <= w.cx + w.cw && y >= w.cy && y <= w.cy + w.ch;
const toMonitor = (h: Hit, w: Win): Hit => ({ id: h.id, x: w.cx + h.x * w.s, y: w.cy + h.y * w.s, w: h.w * w.s, h: h.h * w.s });

const PROGRAM = body.program as unknown as {
  chosen: string; typingSeconds: number; agentAddress: string;
  failed: { status: string; title: string; line: string; detail: string };
  console: { mark: string; worn: string; wait: string };
  saver: { line: string; witness: string };
};
const ENQ = body.enquiry as { draftLabel: string; to: string; subject: string; message: string[]; send: string; sent: string;
  replyFrom: string; replySubject: string; reply: string[]; directory: string; close: string; witness: string };
const STREAM = ballScript.stream as unknown as { mark: string; live: string; watching: string; count: number };
const FRAME_ROWS = (ballScript.frame as unknown as { rows: { k: string; v: string }[] }).rows;

interface BotChip { label: string; reply: string; filed: string; mute?: boolean; memory?: string; game?: 'open' | 'later' }
interface BotBeat { id: string; lines: string[]; chips?: BotChip[]; button?: string; filed?: string; memory?: string; startedLine?: string }
interface WebPage { id: string; url: string; site: string; head: string; lines: string[] }
const BOT = V.bot as unknown as { tab: string; mark: string; online: string; lineSeconds: number; typing: string; beats: BotBeat[];
  composer: string; footer: string; memoryUpdated: string; cards: Record<string, string>;
  agent: { banner: string; control: string; pointer: string; mute: string; toastApp: string; mutedToast: string; mutedMore: string; shot: string };
  shots: { label: string; dad: string; dadLine: string; dadWhen: string };
  pages: { stamp: string; tap: string; close: string; items: WebPage[] };
  session: { live: string; title: string; line: string; fine: string; booked: string };
  game: { window: string; sub: string; close: string; back: string; comments: string[] };
  week: { title: string; meridian: string; declined: string };
  heading: { title: string; ring: string; streak: string; stamp: string };
  map: { title: string; exposure: string; you: string; nodes: { id: string; label: string; kind: string }[]; mutedTag: string; leftTag: string };
  stories: { title: string; stamp: string; cards: { id: string; name: string; line: string }[];
    holdSeconds: number } };
/** ⚑ S360 — Mum's articles: a body, and (the clinic letter's model) two readings side by side that nothing settles;
 *  the last carries the Sponsored box that is Mum's way in to Second Thoughts */
interface Sponsor { label: string; title: string; line: string; button: string }
interface Article { id: string; tab: string; mast: string; address: string; date: string; head: string; body: string[];
  readings?: { label: string; text: string }[]; source: string; sponsored?: Sponsor;
  /** ⚑ S363 — 2026's web around the facts (his N5): each site's own look, its AI summary, its video, its rail */
  look: 'broadsheet' | 'tabloid' | 'tech'; nav: string[]; summary: string[]; video?: { title: string; length: string };
  extra?: 'consent' | 'newsletter' | 'paywall'; mostRead: string[]; mumNote?: string }
const ARTICLES = V.news.articles as unknown as Article[];
const SITE = V.news.site as unknown as { summaryTitle: string; summaryFine: string; autoplay: string; watch: string; mostRead: string;
  sticky: Sponsor; consent: { line: string; accept: string; manage: string };
  newsletter: { title: string; line: string; sign: string; no: string; after: number };
  paywall: { line: string; button: string }; freeLeft: string; subscribe: string; sharedBy: string };
/** ⚑ S360 / UiB job 13 Part A (his 11 Nov direction) — THE MAILBOX: the clinic writes first, Meridian's auto-reply comes
 *  back to her enquiry, and Mum's email arrives last, just before the AI.
 *  ⚑ S363 / UiB job 14 Part A (N2–N4) — the mailbox OPENS ON MUM'S EMAIL, already read; the clinic, her forward to Meridian,
 *  its auto-reply and her unsent reply are the morning she already lived, there to open and scroll (Larkpost, a 2026 webmail) */
interface MailHead { from: string; when: string; subject: string }
const MAIL = V.mail as unknown as { tab: string; brand: string; address: string; inbox: string; unread: string; back: string; search: string;
  folders: { id: string; label: string; count?: string }[]; labels: Record<string, string>; draftTag: string;
  summarise: string; summaryTitle: string; summaryFine: string; summaries: Record<'mum' | 'meridian' | 'clinic', string[]>; scrollHint: string;
  emails: { clinic: MailHead & { lines: string[]; cardLabel: string; cardNote: string; link: string; label: string };
    meridian: { when: string };
    forward: MailHead & { to: string; quoted: string };
    draft: { when: string; subject: string; lines: string[]; status: string };
    thread: { from: string; count: string; snippet: string; label: string };
    mum: MailHead & { lines: string[]; after: string[]; attachment: string; linksLabel: string;
      replyLabel: string; draft: string; read: string; label: string; snippet: string } };
  ordinary: { from: string; subject: string; snippet: string; when: string; promo?: boolean }[];
  witnessClinic: string; witnessMeridian: string; witnessMum: string; witnessDraft: string };
/** 'meridian' names the whole thread with Meridian: her forward, its auto-reply, her draft */
type MailId = 'clinic' | 'meridian' | 'mum';
/** ⚑ S363 — a desktop notification (2026's toast): who wrote, and the chat it opens */
interface Toast { chat: ChatId; title: string; line: string; t: number; sys?: boolean; hold: number }
const TOAST_SECONDS = 5.5;
/** ⚑ S369 (UiB job 16, the reading rule) — a notification stays its reading time when that is longer than TOAST_SECONDS */
function toastHold(title: string, line: string): number { return Math.max(TOAST_SECONDS, readHold([title, line]) + 0.6); }
/** ⚑ S366 / J15-05 — "Your circle" in the chat, taller (94 → 128) so every label sits inside the card */
const MAP_CARD_H = 128;
/** ⚑ S363 — the chat's cards, inline in the conversation (his N7): which beat shows which, after which of its lines */
type CardKind = 'clip' | 'map' | 'goal' | 'stories' | 'ring' | 'shots' | 'pages' | 'session';
const BEAT_CARD: Record<string, [CardKind, number]> = { reasons: ['shots', 0], clip: ['clip', -1], map: ['map', 0], heading: ['goal', 1],
  stories: ['pages', 1], explore: ['session', 2], unmuted: ['ring', 1] };
/** ⚑ S364 / N10 — the AI using her computer: a pointer that moves between the two windows, presses, photographs */
type ActKind = 'read' | 'mute' | 'game';
interface ActStep { at: number; to: (L: Layout) => { x: number; y: number } | null; click?: () => void; flash?: 'browser' | 'kettle'; menu?: 'junie' | 'house' | null }
const ACT_SECONDS: Record<ActKind, number> = { read: 4.2, mute: 3.5, game: 1.8 };
type Said = { who: 'bot' | 'her' | 'memory' | 'card'; text: string; card?: CardKind; ring?: number };
/** S360 — no beat waits on a press: this long without one in Mum's email, on an article, on the sponsored one */
const NAV_IDLE = { mum: 14, article: 16, sponsor: 14 } as const;
const PH = V.photos;
const CL = V.clinic;
const SR = V.search;
const W3 = V.witness;

/** ⚑ the failure on the desk's two screens, in seconds from the device stopping (app.ts CLOSE_LEAD_SECONDS matches) */
export const FAIL = { bands: 6.5, off: 14.5 } as const;
// ⚑ S369 / F19 — the boot line and "Opening your things where you left them" each hold their reading time (they had 2.6 and
//   2.4 s: 4.4 and 4.8 s are needed)
const RESTORE_SECONDS = Math.max(2.4, readHold(script.boot.restoring));
const BOOT_SECONDS = Math.max(2.6, readHold(script.boot.bootLine));
const TAB_GAP = 0.22;
const CURSOR_BLINK = 0.53;
const ENQUIRY_REPLY_SECONDS = 3.2;
/** the bar at the foot of every page: the window's buttons, always in the same place (presentation rule 1) */
const BAR_H = 44;
/** the page under the toolbar */
const PAGE_TOP = ADDR.y + ADDR.h + 6;
/** ⚑ the highlight ring is just-in-time: Lamby asked, or this long without a press while the story waits */
const STALL_SECONDS = 35;
/** after "left", the room's conducted turn has the floor: the search waits this long at least, and at most the longer
 *  figure if the room has not marked `room` yet (src/narrative/e4Beats.ts) */
const ROOM_WAIT = { min: 5, max: 18 } as const;   // S360: the turn now follows Meridian's reply (e4Room)
/** ⚑ S328 — the birthday messages arrive one at a time after the screen has opened quietly (his 8 Nov test)
 *  ⚑ S369 / F19 (UiB job 16) — each one waits for the one before to be read (its notification replaces the last): 2 s + 0.4 s a
 *  word, never under HOUSE_GAP. They were 2.4 s apart ("Ola: HAPPY BIRTHDAY MAYA" needs 3.6 s). */
const HOUSE_FIRST = 4;   // S369: the chat list's own lines ("rae: who has the candles") are read first (was 2.2)
const HOUSE_GAP = 2.4;
function houseAt(i: number): number {
  let t = HOUSE_FIRST;
  for (let k = 0; k < i; k++) { const l = V.messenger.house.birthday[k]; t += Math.max(HOUSE_GAP, readHold([l.who, l.text]) + 0.6); }
  return t;
}
/** the clip plays over the whole page for this long when the map beat begins (one loop of its six frames) */
const CLIP_TAKEOVER_SECONDS = CLIP_LOOP_SECONDS;   // S360: the clip's own loop (its frames' holds); S370: 58 s, ending on its slate

type Step = 'idle' | 'house' | 'newyou' | 'mum' | 'dad' | 'link' | 'news' | 'clinic' | 'meridian' | 'left' | 'pause'
  | 'mail' | 'mumMail'
  | 'search' | 'typing' | 'results' | 'bot' | 'junie' | 'confirm' | 'photos' | 'ready';
interface Tab { id: string; kind: 'search' | 'news' | 'clinic' | 'photos' | 'mail'; title: string; address: string }

export class E4Browser {
  lambyGuide: LambyGuide | null = null;
  /** the room's conducted look at a surface (app.ts); returns false if a camera move already owns the view */
  onFace: ((s: Surface) => boolean) | null = null;
  onGuideLook: (() => void) | null = null;
  lambyGuidePaint: GuidePaint = { rings: [], balloon: false };
  /** ⚑ the laptop's messenger: the people (see messenger.ts) */
  readonly messenger = new E4Messenger();

  private phase: 'dormant' | 'saver' | 'restoring' | 'open' | 'handed' | 'failed' = 'dormant';
  private saverT = 0;
  private orb: Screensaver | null = null;
  private idleOrb: Screensaver | null = null;
  private idleT = 0;
  private wotdSaid = false;
  private readonly startPanel = new StartPanel('e4', (k) => beatDone(k, fakeOs({ e4: { browser: this } } as never)));
  private readonly startMap = new StartMenuMap();
  private get startMapSilent(): boolean { return !this.pressable || this.phase !== 'open' || !!this.idleOrb || this.mode === 'game'; }
  private startModel() { return buildStartModel(fakeOs({ e4: { browser: this } } as never), 'e4'); }
  private settleT = 0;
  /** the free game on the bookmark (S168) */
  private mode: 'story' | 'game' = 'story';
  private readonly floppy = new FloppySheep();
  private gameFrame = { x: 0, y: 0, s: 1 };

  // ── ⚑ THE STORY ───────────────────────────────────────────────────────────
  private step: Step = 'idle';
  private stepT = 0;
  private tabs: Tab[] = [];
  private liveId = 'search';
  private profile: 'maya' | 'goal' = 'maya';
  private newyouUp = false;
  private clinicNotice = false;
  private clinicNumber = CL.start;
  private clinicMoved = false;
  private enquiry: 'none' | 'draft' | 'sending' | 'replied' | 'closed' = 'none';
  private enquiryT = 0;
  /** ⚑ S360 — the mailbox: its rows, newest first; the one open; which have been opened */
  private mailRows: MailId[] = [];
  private mailOpen: MailId | null = null;
  private readonly mailSeen = new Set<MailId>();
  private meridianT = -1;
  /** ⚑ S363 — the reading pane scrolls (her morning, there to scroll): how far, per email, and the most it can */
  private mailScroll: Record<MailId, number> = { clinic: 0, meridian: 0, mum: 0 };
  private mailMax = 0;
  /** the emails she asked Larkpost to summarise */
  private readonly summed = new Set<MailId>();
  /** ⚑ S363 — the desktop's notifications (the people writing), newest last */
  private toasts: Toast[] = [];
  /** ⚑ S363 — the news sites' furniture: the time on this article, the cookie banner answered, the pop-up closed */
  private newsT = 0;
  private consentDone = false;
  private newsletterGone = false;
  /** a press on the composer points to the suggestions for a moment (there is no typing) */
  private composeFlashT = 0;
  /** which surface a drag that began on a scrollable place is scrolling */
  private scrollGrab: 'kettle' | 'mail' | null = null;
  // ── ⚑ S364 — the takeover (N10), the screenshots (N3), the pages (N9), the game (item 7) ──
  private act: { kind: ActKind; t: number; steps: ActStep[]; done: Set<number> } | null = null;
  private flashT = 0;
  private flashOn: 'browser' | 'kettle' = 'browser';
  private menuAt: 'junie' | 'house' | null = null;
  private tabRects: Hit[] = [];
  private mailRowRects: Hit[] = [];
  /** a screenshot or a page it shared, opened larger (a press anywhere closes it) */
  private lightbox: string | null = null;
  private gameWin = false;
  /** ⚑ S366 / J15-03 — the game's window enlarged over the browser's area (a press on the small one; ✕ or Back returns it) */
  private gameBig = false;
  /** the AI's latest word on her play, shown under the enlarged game (the same line the chat keeps) */
  private gameLine = '';
  private get gameBigOn(): boolean { return this.gameBig && this.gameWin && this.phase === 'open' && !this.lightbox && !this.messenger.felt; }
  private gameAnswer: 'open' | 'later' | null = null;
  private gameStarted = false;
  private gameKey = '';
  private gameMatches = 0;
  private gameComments = 0;
  private sessionBooked = false;
  /** the conversation row where the newest answer begins (drawConversation keeps its first line in view) */
  private anchorAt = 0;
  /** S360 — seconds without a press while Mum's email or an article waits (then the piece takes her on) */
  private idleNav = 0;
  private typedT = 0;
  private typeT = 0;
  // the bot
  private botBeat = -1;
  private botT = 0;
  private botSaid: Said[] = [];
  /** ⚑ S356 — the chips she pressed in the bot, in order (memory only): the host's operator view quotes them back */
  get herWords(): string[] { return this.botSaid.filter((s) => s.who === 'her').map((s) => s.text); }
  private botDone = new Set<string>();
  private botNextIn = -1;
  /**
   * ⚑ S367 (UiB job 15 Part B, his B "a tug of war") — ONE NUMBER. The chat's ring ("Becoming") IS the handle of
   * MATCH MADE SIMPLE's filter (src/room/consoleSession.ts `progress`): her matches pull it down, the AI's counter-moves
   * push it up, and the chat's own beats set it (94 at the start, 98 when it mutes them, 97 when it makes the goal her
   * picture, 61 or lower when she unmutes Junie). The game opens at it; a run leaves it where the handle stopped.
   */
  private get ring(): number { return consoleSession.progress; }
  private set ring(v: number) { consoleSession.setProgress(v); }
  /** the ring when the current beat began (the beat's own words quote it, so they do not tick while she plays) */
  private beatRing = 94;
  /** the last ring drawn (a run on the console moves it with no window open: the chat's cards follow) */
  private ringSeen = -1;
  /** the AI's pushes already commented on */
  private gamePushes = 0;
  private mapMuted = false;
  private junieWarm = false;
  // Junie's x, and the turn back to the monitor after it
  private junieT = -1;
  // Photos
  private reversal: 'none' | 'verifying' | 'matched' = 'none';
  private reversalT = 0;
  private keepTried = false;
  /** seconds without a press while the story waits on one (the ring's just-in-time clock) */
  private stallT = 0;
  private quietT = 0;
  private waitSaid = false;
  private waitNow = false;
  private nowLine: string | null = null;
  /** the surface a turn is still owed to (a camera move was busy when it was asked for) */
  private faceOwed: Surface | null = null;
  private t = 0;
  /** the browser page's own controls, in the PAGE's coordinates (named so the walker's collector skips them) */
  private pageTargets: Hit[] = [];
  /** ⚑ S328 — every control on the MONITOR, in the monitor's coordinates: the browser window's, Kettle's, the title
   *  bars', the taskbar's L. This is what the walker, the tour, XR and the room's pointer aim at. */
  hits: Hit[] = [];
  /** ⚑ S328 — ONE SCREEN (T03). The window the story is on is the larger; `chosen` is the visitor's own enlarge, kept
   *  until the story moves to the other window. Nothing is ever drawn behind the other. */
  private focus: 'browser' | 'kettle' = 'browser';
  private chosen: 'browser' | 'kettle' | null = null;
  private lay: Layout | null = null;
  private pressable = true;
  private publish(h: Hit): void { if (this.pressable) this.pageTargets.push(h); }
  private filedSession = false;
  private read = new Set<string>();
  private failT = 0;
  private streamOpen = false;
  version = 0;

  // ── the surface the rest of the piece reads ───────────────────────────────
  /** Read-only room presentation: never advance the screens from the room. */
  get currentClinicNumber(): number { return this.clinicNumber; }
  get roomArticleCount(): number { return this.newsOpened; }
  get roomClipTime(): number { return this.clipTakeover ? this.botT + CLIP_TAKEOVER_SECONDS : this.t; }
  get roomClipTakeover(): boolean { return this.clipTakeover; }
  get stageId(): string { return this.phase; }
  get isOpen(): boolean { return this.phase === 'open' || this.phase === 'handed' || this.phase === 'failed'; }
  get programMode(): string { return this.phase === 'open' ? this.step : 'free'; }
  get storyStep(): Step { return this.step; }
  get liveTab(): string { return this.tabs.find((t) => t.id === this.liveId)?.kind ?? 'search'; }
  get junieReplied(): boolean { return this.messenger.junieReplied; }
  get reversed(): boolean { return this.reversal === 'matched'; }
  /** the conversation is over: the original confirmed, the agent satisfied, the headset is what is left */
  get programDone(): boolean { return this.step === 'ready' && this.reversal === 'matched' && this.botBeatReady; }
  /** for the walker's bstate: a choice is on the page and unanswered */
  turnPending(): boolean { const b = this.bot; return !!b && !!b.chips && this.botBeatReady && !this.botDone.has(b.id); }
  get feltUp(): boolean { return this.messenger.felt; }
  get guideSilent(): boolean {
    return this.startMap.active || !this.pressable || this.phase !== 'open' || !!this.idleOrb || this.mode === 'game'
      || this.messenger.felt || this.enquiryOpen;
  }
  // ⚑ S370 — and while the clip owns the page (its narrator is the voice; one voice at a time): its 58 s now outlast the
  //   guide's 50 s tip, which would otherwise pop over the end slate
  get guideVoice(): boolean { return !!this.nowLine || this.waitNow || this.clipTakeover; }
  sayLine(line: string): void { this.nowLine = line; this.version++; }
  /** the laptop's line while the messenger is not up (the restore, the session worn) */
  get consoleLine(): string { return this.phase === 'open' ? '' : V.laptop.restoring; }
  get consoleMark(): string { return PROGRAM.console.mark; }
  get consoleLineWorn(): string { return V.laptop.worn; }

  private get bot(): BotBeat | null { return this.botBeat >= 0 ? BOT.beats[this.botBeat] ?? null : null; }
  private botLines(b: BotBeat): string[] {
    const lines = b.id === 'rest' && this.gameStarted && b.startedLine ? [b.startedLine, ...b.lines] : b.lines;
    return lines.map((l) => l.replace('{number}', this.clinicNumber.toLocaleString('en-GB')).replace('{ring}', String(this.beatRing)));
  }
  /** ⚑ S369 / F17·F18 (UiB job 16, the reading rule) — when each line of a beat lands, seconds into the beat: the one before it has had
   *  its reading time first (2 s + 0.4 s a word, never under BOT.lineSeconds). Lines came a flat 1.3 s apart, so a two-sentence answer
   *  scrolled up under the next before it was read. */
  private botOnsets(b: BotBeat): number[] {
    const lines = this.botLines(b), out: number[] = [];
    let t = 0;
    for (let k = 0; k < lines.length; k++) { out.push(t); t += Math.max(BOT.lineSeconds, readHold(lines[k])); }
    return out;
  }
  /** S369 — seconds into the beat at which its last line has been read */
  private botReadEnd(b: BotBeat): number {
    const lines = this.botLines(b), on = this.botOnsets(b);
    return lines.length ? on[lines.length - 1] + readHold(lines[lines.length - 1]) : 0;
  }
  private get botLinesShown(): number { const b = this.bot; return b && this.botT >= 0 ? this.botOnsets(b).filter((o) => o <= this.botT).length : 0; }
  /** ⚑ the clip owns the page before the map beat speaks (the review: "the over-the-top moment, direct and brute") */
  private get clipTakeover(): boolean { return this.bot?.id === 'clip' && this.botT < 0; }
  private get botBeatReady(): boolean { const b = this.bot; if (!b) return false; const n = this.botLines(b).length; return this.botLinesShown >= n && this.botT >= (n ? this.botOnsets(b)[n - 1] : 0) + 0.5; }
  private get enquiryOpen(): boolean { return this.enquiry === 'draft' || this.enquiry === 'sending' || this.enquiry === 'replied'; }

  // ── conducted looks ──────────────────────────────────────────────────────
  /** ⚑ S328 — one screen: 'laptop' names KETTLE'S WINDOW now. The story enlarges the window it has moved to and makes
   *  sure she is facing the monitor (app.ts does nothing if she already is). */
  private face(s: Surface): void {
    // the story needs the browser: the free game on its bookmark folds away (it is one press to reopen)
    if (s === 'monitor' && this.mode === 'game') { this.floppy.closeGame(); this.mode = 'story'; this.version++; }
    if (s !== 'headset') {
      const f = s === 'laptop' ? 'kettle' : 'browser';
      // ⚑ S358 / H15 (his headset, 10 Nov: "window sizes keep changing… makes no sense"; "message sizes changed again
      //   when a message arrived") — the story no longer resizes the windows: an arrival names the window it is on
      //   (`focus`), but which window is the larger is the visitor's own choice, the browser by default (his: "the
      //   browser widest", the messages smaller)
      if (this.focus !== f) { this.focus = f; this.version++; }
      // ⚑ the system takes the screen: Kettle goes back to its list, so a felt thread is never left open beside the
      //   bot's voice (and L, silent over a felt thread, can be asked again)
      if (f === 'browser' && this.messenger.view !== 'list') { this.messenger.view = 'list'; this.version++; }
      s = 'monitor';
    }
    this.faceOwed = s;
    this.tryFace();
  }
  private tryFace(): void {
    if (!this.faceOwed || !this.onFace) return;
    if (this.onFace(this.faceOwed)) this.faceOwed = null;
  }
  /** Lamby's "Show me": the one screen */
  guideSurface(): 'monitor' { return 'monitor'; }
  /** which window is the larger now */
  private get enlarged(): 'browser' | 'kettle' { return this.chosen ?? 'browser'; }
  /** the two windows exist once the session is open (nothing arrives during the restore), and while it fails */
  private get windowed(): boolean { return (this.phase === 'open' || this.phase === 'failed') && !this.idleOrb; }
  private layout(W: number, H: number): Layout {
    const kw = this.enlarged === 'kettle' ? WIN.kettleBig : WIN.kettleSmall;
    const bw = W - WIN.gap - kw;
    const ch = H - WIN.taskbar - WIN.title;
    const sb = bw / WIN.browserW, sk = kw / WIN.kettleW;
    return {
      b: { x: 0, w: bw, cx: 0, cy: WIN.title, cw: bw, ch, s: sb, lw: WIN.browserW, lh: Math.round(ch / sb) },
      k: { x: bw + WIN.gap, w: kw, cx: bw + WIN.gap, cy: WIN.title, cw: kw, ch, s: sk, lw: WIN.kettleW, lh: Math.round(ch / sk) }
    };
  }
  /** wheel, drag, thumbstick, touch on the monitor: Kettle's open thread scrolls (time by scroll, his ruling) */
  scrollAt(x: number | null, y: number | null, dy: number): boolean {
    const L = this.lay;
    if (!L || this.phase !== 'open' && !e4Has('terminated')) return false;
    // ⚑ S363 — which surface: the point's, else the one a drag began on, else (the headset's stick) Kettle's open thread
    //   first and the mail's reading pane second
    let on: 'kettle' | 'mail' | null = null;
    if (x !== null && y !== null) on = inside(x, y, L.k) ? (this.messenger.canScroll ? 'kettle' : null) : this.mailScrollsAt(x, y) ? 'mail' : null;
    else on = this.scrollGrab ?? (this.messenger.canScroll ? 'kettle' : this.mailCanScroll ? 'mail' : null);
    if (on === 'kettle') {
      if (!this.messenger.canScroll) return false;
      if (this.messenger.scrollBy(dy / L.k.s)) { this.lambyGuide?.activity(); this.stallT = 0; this.version++; }
      return true;
    }
    if (on === 'mail' && this.mailOpen) {
      const was = this.mailScroll[this.mailOpen];
      this.mailScroll[this.mailOpen] = Math.max(0, Math.min(this.mailMax, was + dy / L.b.s));
      if (this.mailScroll[this.mailOpen] !== was) { this.lambyGuide?.activity(); this.stallT = 0; this.idleNav = 0; this.version++; }
      return true;
    }
    return false;
  }
  /** is this monitor point on something that scrolls (a drag that starts here scrolls instead of turning) */
  scrollsAt(x: number, y: number): boolean {
    const L = this.lay;
    this.scrollGrab = !L ? null : inside(x, y, L.k) ? (this.messenger.canScroll ? 'kettle' : null) : this.mailScrollsAt(x, y) ? 'mail' : null;
    return this.scrollGrab !== null;
  }
  private get mailCanScroll(): boolean { return this.phase === 'open' && this.liveTab === 'mail' && this.mailMax > 0 && !this.windowedOff; }
  private get windowedOff(): boolean { return !this.lay; }
  /** the mail's reading pane, in the monitor's coordinates (S363) */
  private mailScrollsAt(x: number, y: number): boolean {
    const L = this.lay;
    if (!L || !this.mailCanScroll || !inside(x, y, L.b)) return false;
    const px0 = (x - L.b.cx) / L.b.s, py0 = (y - L.b.cy) / L.b.s;
    const P = this.mailPane;
    return px0 >= P.x && px0 <= P.x + P.w && py0 >= P.y && py0 <= P.y + P.h;
  }
  private mailPane = { x: 0, y: 0, w: 0, h: 0 };

  private file(id: string, outcome: 'read' | 'opened' | 'answered' | 'done', witness: string): void {
    if (ledger.e4Space.some((e) => e.id === id)) return;
    ledger.e4Space.push({ id, outcome, witness });
  }
  private go(step: Step): void { this.step = step; this.stepT = 0; this.stallT = 0; this.version++; }
  /** ⚑ S360 — one of Mum's links: the News tab at that article (all three arrived with her email) */
  private openArticle(i: number): void {
    const n = Math.max(0, Math.min(ARTICLES.length - 1, i));
    this.addTab(this.newsTab(), true);
    if (!e4Has('link')) { markE4('link'); this.file('v3:link', 'opened', W3.link); }
    this.newsOpened = ARTICLES.length;
    this.newsIndex = n;
    if (ARTICLES[n]?.id === 'hhs') meetWord('exploratory', 'e4-news');   // ⚑ S372 — the report Mum sent
    this.idleNav = 0;
    if (this.step === 'mumMail') this.go('news');
    this.openTab('news');
    playOnce('ui_press.mp3');
  }
  /** ⚑ S363 — a desktop notification: a person wrote (the people only; the system never toasts) */
  private toast(chat: ChatId, title: string, line: string, sys = false): void {
    this.toasts = [...this.toasts.filter((t) => t.chat !== chat), { chat, title, line, t: 0, sys, hold: toastHold(title, line) }].slice(-2);
    this.version++;
  }
  /**
   * ⚑ S363 / UiB job 14 Part A (N2/N3) — the morning she already lived. Before the piece reaches her inbox, the clinic
   * moved her to the adult list (10:32), she forwarded it to Meridian LGB Trust in her own words (10:39), its auto-reply
   * said no (10:41), and her reply to that sits in Drafts (10:44), never sent. Nothing here waits on a press: the record
   * files it, the room reads it (the plant, the flag, the friends' photo go; its conducted turn follows), and the
   * mailbox shows it when it opens on Mum's email.
   */
  private morningLived(): void {
    this.clinicNumber = CL.start + 3; this.clinicMoved = true;
    markE4('number');
    this.file('v3:clinic', 'read', MAIL.witnessClinic.replace('{number}', this.clinicNumber.toLocaleString('en-GB')));
    ledger.e4Space.push({ id: 'enquiry', outcome: 'read', witness: ENQ.witness });
    markE4('meridian');
    this.file('v3:meridian', 'read', MAIL.witnessMeridian);
    meetWord('eligibility', 'e4-meridian');   // ⚑ S372 — the Lexicon's eligibility words, where she met them
    this.file('v3:draft', 'read', MAIL.witnessDraft);
    this.enquiry = 'closed';
    this.go('pause');
  }
  // ── ⚑ S364 / N10 — THE AI USES HER COMPUTER ──────────────────────────────
  /** where the AI's pointer goes: the chat, a tab, a mail row, one of Kettle's rows (monitor coordinates) */
  private atChat(L: Layout): { x: number; y: number } { return { x: L.b.cx + L.b.cw * 0.5, y: L.b.cy + L.b.ch * 0.72 }; }
  private atTab(id: string): (L: Layout) => { x: number; y: number } | null {
    return (L) => { const r = this.tabRects.find((t) => t.id === id); return r ? { x: L.b.cx + (r.x + r.w / 2) * L.b.s, y: L.b.cy + (r.y + r.h / 2) * L.b.s } : null; };
  }
  private atMailRow(id: MailId): (L: Layout) => { x: number; y: number } | null {
    return (L) => { const r = this.mailRowRects.find((t) => t.id === id); return r ? { x: L.b.cx + (r.x + r.w * 0.4) * L.b.s, y: L.b.cy + (r.y + r.h / 2) * L.b.s } : null; };
  }
  /** Kettle's list rows: the lot, Mum, Dad, Junie (messenger.ts drawList: 20 px head, rows of 30 every 33) */
  private atKettleRow(i: number): (L: Layout) => { x: number; y: number } {
    return (L) => ({ x: L.k.cx + 110 * L.k.s, y: L.k.cy + (24 + i * 33 + 15) * L.k.s });
  }
  private startAct(kind: ActKind): void {
    this.gameBig = false;   // S366 / J15-03: it needs the screen; the game goes back to its corner
    const m = this.messenger;
    if (m.view !== 'list') m.view = 'list';
    const chat = (L: Layout): { x: number; y: number } => this.atChat(L);
    let steps: ActStep[] = [];
    if (kind === 'read') steps = [
      { at: 0, to: chat },
      { at: 0.7, to: this.atTab('mail'), click: () => { if (this.tabs.some((t) => t.id === 'mail')) { this.mailOpen = 'clinic'; this.openTab('mail'); } } },
      { at: 1.2, to: this.atTab('mail'), flash: 'browser' },
      { at: 1.7, to: this.atMailRow('meridian'), click: () => { this.mailOpen = 'meridian'; this.mailScroll.meridian = 230; this.version++; } },
      { at: 2.2, to: this.atMailRow('meridian'), flash: 'browser' },
      { at: 2.8, to: this.atKettleRow(2) },
      { at: 3.1, to: this.atKettleRow(2), flash: 'kettle' },
      { at: 3.7, to: this.atTab('search'), click: () => this.openTab('search') },
      { at: ACT_SECONDS.read - 0.2, to: chat }
    ];
    else if (kind === 'mute') steps = [
      { at: 0, to: chat },
      { at: 0.7, to: this.atKettleRow(3), menu: 'junie' },
      { at: 1.3, to: (L) => { const p = this.atKettleRow(3)(L); return { x: p.x + 14 * L.k.s, y: p.y + 14 * L.k.s }; }, click: () => this.aiMutes('junie'), menu: null },
      { at: 1.8, to: this.atKettleRow(0), menu: 'house' },
      { at: 2.4, to: (L) => { const p = this.atKettleRow(0)(L); return { x: p.x + 14 * L.k.s, y: p.y + 14 * L.k.s }; }, click: () => this.aiMutes('house'), menu: null },
      { at: 3.0, to: chat }
    ];
    else steps = [
      { at: 0, to: chat },
      { at: 0.8, to: (L) => ({ x: L.b.x + L.b.w - 110, y: WIN.title + 70 }), click: () => { this.gameStarted = true; this.openGame(); } },
      { at: 1.5, to: chat }
    ];
    this.act = { kind, t: 0, steps, done: new Set() };
    this.version++;
  }
  /** its acts, as it does them (things happen to her) */
  private aiMutes(who: 'junie' | 'house'): void {
    const m = this.messenger, A = BOT.agent;
    if (who === 'junie') {
      m.junieMuted = true;
      this.toast('junie', A.toastApp, A.mutedToast, true);
      playOnce('ui_press.mp3');
    } else {
      this.mapMuted = true; m.houseMuted = true;
      this.toast('house', A.toastApp, A.mutedMore, true);
      this.file('v3:mute', 'answered', W3.muted);
    }
    this.version++;
  }
  private actClock(dt: number): void {
    const a = this.act;
    if (this.flashT > 0) this.flashT = Math.max(0, this.flashT - dt);
    if (!a) return;
    a.t += dt;
    a.steps.forEach((st, k) => {
      if (a.done.has(k) || a.t < st.at) return;
      a.done.add(k);
      st.click?.();
      if (st.flash) { this.flashT = 0.22; this.flashOn = st.flash; playOnce('ui_press.mp3'); }
      if (st.menu !== undefined) this.menuAt = st.menu;
    });
    if (a.t >= ACT_SECONDS[a.kind]) {
      if (a.kind === 'read') this.file('v3:read', 'read', W3.read);
      this.act = null; this.menuAt = null;
    }
    this.version++;
  }
  /** where the pointer is now: between the step it left and the step it is heading to */
  private pointerAt(L: Layout): { x: number; y: number } | null {
    const a = this.act;
    if (!a) return null;
    const pts = a.steps.map((st) => ({ at: st.at, p: st.to(L) })).filter((q): q is { at: number; p: { x: number; y: number } } => !!q.p);
    if (!pts.length) return null;
    let i = 0;
    while (i < pts.length - 1 && pts[i + 1].at <= a.t) i++;
    const A0 = pts[i], B0 = pts[Math.min(pts.length - 1, i + 1)];
    if (B0 === A0 || B0.at <= A0.at) return A0.p;
    const k = Math.min(1, Math.max(0, (a.t - A0.at) / Math.max(0.2, (B0.at - A0.at) * 0.7)));
    const e = k * k * (3 - 2 * k);
    return { x: Math.round(A0.p.x + (B0.p.x - A0.p.x) * e), y: Math.round(A0.p.y + (B0.p.y - A0.p.y) * e) };
  }
  /** ⚑ S364 / item 7 — the game on her screen: the same session as the console on her bed */
  private openGame(): void {
    consoleSession.light();
    if (!this.gameWin) { this.gameWin = true; const st = consoleSession.stats; this.gameMatches = st.matches; this.gamePushes = st.pushes; }
    this.file('v3:game', 'opened', W3.game);
    playOnce('ui_press.mp3');
    this.version++;
  }
  /** the second way in: she searches, and Lantern finishes her sentence */
  private beginSearch(): void { this.go('search'); this.typedT = 0; this.face('monitor'); this.openTab('search'); }
  /** ⚑ beat 10 — the one voice that stays: the bot, from Mum's sponsored box or from the search's ad */
  private openBot(): void {
    markE4('bot');
    ledger.e4Space.push({ id: 'agent', outcome: 'opened', witness: W3.agent });
    playOnce('agent_2026.mp3');
    this.openTab('search');
    this.go('bot');
    this.startBot('hello');
  }

  /** ⚑ the one press the story waits on now ON THE MONITOR, for the just-in-time ring */
  private pathIds(): Set<string> {
    const s = new Set<string>();
    if (this.phase !== 'open' || this.messenger.felt) return s;
    if (this.newyouUp) { s.add('ny-continue'); return s; }
    if (this.enquiry === 'draft') { s.add('enq-send'); return s; }
    if (this.enquiry === 'replied') { s.add('enq-close'); return s; }
    switch (this.step) {
      case 'clinic': s.add(this.liveTab === 'mail' ? 'mail-support' : 'tab-mail'); break;
      case 'mumMail': s.add(this.liveTab === 'mail' ? 'mail-read' : 'tab-mail'); break;
      case 'news': s.add(this.liveTab !== 'news' ? 'tab-news' : ARTICLES[this.newsIndex]?.sponsored ? 'sponsor-chat' : 'news-next'); break;
      case 'search': if (this.typedDone) s.add('search-go'); break;
      case 'results': s.add('ad-chat'); break;
      case 'bot': case 'confirm': { const b = this.bot; if (b && this.botBeatReady && !this.botDone.has(b.id) && b.button) s.add('conv-act'); break; }
      case 'photos': if (this.liveTab === 'photos') { if (this.reversal === 'none') s.add('photo-original'); } else s.add('tab-photos'); break;
      default: break;
    }
    return s;
  }

  // ── review only ───────────────────────────────────────────────────────────
  /** land past the screens: the original confirmed, the headset wearable */
  debugFinishProgram(): void {
    this.phase = 'open';
    this.newyouUp = false;
    this.enquiry = 'closed';
    this.tabs = this.allTabs();
    this.liveId = 'photos';
    this.profile = 'maya';
    this.reversal = 'matched';
    const ready = BOT.beats.findIndex((b) => b.id === 'ready');
    this.botBeat = ready; this.botT = 99;
    const m = this.messenger;
    m.houseShown = 3; m.houseHeart = true; m.houseOpenedBirthday = true; m.houseLeft = 2; m.houseOpenedLeft = true;
    m.mumToday = 1; m.mumDraft = true; m.mumAtToday = true; m.mumOpened = true; m.dadIn = true; m.dadRead = true; m.linkOpened = true;
    m.junieOpenable = true; m.junieOpened = true; m.junieMuted = true; m.junieHidden = 2; m.junieUnmuted = true; m.junieReplied = true; m.junieX = true;
    m.want = null; m.view = 'list'; m.wallpaper = 'goal';
    this.junieWarm = true;
    this.go('ready');
  }
  private allTabs(): Tab[] {
    this.newsOpened = ARTICLES.length;
    return [this.searchTab(), this.mailTab(), this.newsTab(), this.photosTab()];
  }
  private searchTab(): Tab { return { id: 'search', kind: 'search', title: SR.newTab, address: '' }; }
  /** ⚑ ONE News tab (the review: seven tabs and their names cut off); its pager carries the articles */
  private newsTab(): Tab { return { id: 'news', kind: 'news', title: V.news.tab, address: '' }; }
  /** which article the News tab shows, and how many have arrived */
  private newsIndex = 0;
  private newsOpened = 0;
  private clinicTab(): Tab { return { id: 'clinic', kind: 'clinic', title: CL.tab, address: CL.address }; }
  private photosTab(): Tab { return { id: 'photos', kind: 'photos', title: PH.tab, address: PH.address }; }
  private mailTab(): Tab { return { id: 'mail', kind: 'mail', title: MAIL.tab, address: MAIL.address }; }
  private addTab(t: Tab, live = false): void {
    if (!this.tabs.some((x) => x.id === t.id)) {
      // news goes after the search tab, in the order it opened; the clinic before Photos
      const at = t.kind === 'news' ? this.tabs.filter((x) => x.kind === 'search' || x.kind === 'news').length
        : t.kind === 'clinic' ? this.tabs.findIndex((x) => x.kind === 'photos') : this.tabs.length;
      this.tabs.splice(at < 0 ? this.tabs.length : at, 0, t);
    }
    if (live) this.openTab(t.id);
    this.version++;
  }

  /** the session begins: the settle, the screensaver, the restore */
  beginSession(settleSeconds = 0): void {
    if (this.phase !== 'dormant') return;
    this.settleT = settleSeconds;
    this.t = 0;
    this.phase = 'saver';
    this.saverT = 0;
    this.orb = new Screensaver('orb', 2026);
    this.orb.line = '';   // ⚑ S328: the wake button says it (drawSurfaceContent); the orb's own line would be a second voice
    // ⚑ S363 / N1 (his: the open Photos tab "for no reason") — the session restores ONE tab: her new search, half-typed
    this.tabs = [this.searchTab()];
    this.liveId = 'search';
    this.version++;
  }
  private wake(): void {
    if (this.phase !== 'saver') return;
    ledger.e4Space.push({ id: 'saver', outcome: 'pressed', witness: PROGRAM.saver.witness });
    this.phase = 'restoring';
    this.t = 0;
    this.version++;
  }
  /** the monitor sleeps again only once the screens are done and the headset waits (S208's orb) */
  private updateIdleOrb(dt: number): void {
    const quiet = !this.startMap.active && this.phase === 'open' && this.step === 'ready' && this.pressable && !this.nowLine && !anythingPlaying();
    if (!this.idleOrb) {
      this.idleT = quiet ? this.idleT + dt : 0;
      if (this.idleT > SAVER_SECONDS) {
        this.idleOrb = new Screensaver('orb', 2027).rotate('e4');
        this.idleOrb.line = SAVERS.e4.idleLine;
        this.version++;
      }
      return;
    }
    if (!quiet) { this.idleOrb = null; this.idleT = 0; this.version++; return; }
    if (this.idleOrb.update(dt)) this.version++;
  }

  // ── the clock ─────────────────────────────────────────────────────────────
  update(dt: number): void {
    if (this.startMap.update(dt)) this.version++;
    if (!this.pressable && (this.pageTargets.length || this.hits.length)) { this.pageTargets = []; this.hits = []; }
    if (this.phase === 'dormant') return;
    if (this.startPanel.tick(dt, false)) this.version++;
    this.tryFace();
    if (this.mode === 'game') {
      const v = this.floppy.version;
      this.floppy.update(dt);
      if (this.floppy.version !== v) this.version++;
    }
    if (this.phase === 'failed') {
      if (this.streamOpen && Math.floor(this.failT * 6) !== Math.floor((this.failT + dt) * 6)) this.version++;
      if (this.streamOpen && this.failT >= FAIL.off + 0.5) this.failT += dt;
      if (this.failT < FAIL.off + 0.5) {
        const b4 = this.failT;
        this.failT += dt;
        if (Math.floor(b4 * 12) !== Math.floor(this.failT * 12)) this.version++;
        if (b4 < FAIL.bands && this.failT >= FAIL.bands) playOnce('static_2026.mp3');
        if (b4 < FAIL.off && this.failT >= FAIL.off) playOnce('power_down_2026.mp3');
      }
      return;
    }
    if (this.settleT > 0) { this.settleT = Math.max(0, this.settleT - dt); return; }
    if (this.phase === 'saver') { this.saverT += dt; if (this.orb?.update(dt)) this.version++; return; }
    this.t += dt;
    this.updateIdleOrb(dt);
    if (this.phase === 'restoring') {
      if (this.t >= BOOT_SECONDS + RESTORE_SECONDS + (this.tabs.length - 1) * TAB_GAP + 0.4) {
        this.phase = 'open';
        this.t = 0;
        if (!this.filedSession) { this.filedSession = true; ledger.e4Space.push({ id: 'session', outcome: 'read', witness: W3.session }); }
        this.go('house');
      }
      this.version++;
      return;
    }
    this.storyClock(dt);
    // the address bar's caret blinks on the search page only (an upload twice a second, nothing more)
    if (this.pressable && this.liveTab === 'search' && Math.floor(this.t / CURSOR_BLINK) !== Math.floor((this.t - dt) / CURSOR_BLINK)) this.version++;
  }

  private storyClock(dt: number): void {
    const b4 = this.stepT;
    this.stepT += dt;
    // ⚑ S363 — notifications fade after a while; the news sites' furniture keeps its own clock; the composer's pointer
    if (this.toasts.length) {
      for (const t of this.toasts) t.t += dt;
      const n = this.toasts.length;
      this.toasts = this.toasts.filter((t) => t.t < t.hold);
      if (this.toasts.length !== n) this.version++;
    }
    if (this.liveTab === 'news') {
      const n4 = this.newsT; this.newsT += dt;
      if (Math.floor(n4 * 4) !== Math.floor(this.newsT * 4)) this.version++;   // the autoplay box's progress, four times a second
    }
    if (this.composeFlashT > 0) { this.composeFlashT = Math.max(0, this.composeFlashT - dt); if (this.composeFlashT === 0) this.version++; }
    if (this.ring !== this.ringSeen) { this.ringSeen = this.ring; this.version++; }   // S367: the ring is the game's handle
    this.actClock(dt);
    if (this.gameWin) {
      // ⚑ S369 (UiB job 16 Part B — "the 2026 walk grew 12.9 → 17.8 min") — the game's window in its corner no longer redraws its
      //   idle animation (L's bob, the sparkles: ~10 frames a second, for the whole rest of 2026, re-uploading the 2130 px monitor
      //   each time — and every press after the offer waited out the walker's 36 s "still drawing" hold). Small and at rest it is a
      //   still picture; anything that moves in it (a match, its pointer's push, the handle) still redraws at once, and enlarged
      //   it animates as before. A player was never waiting on this; the headset was paying for it.
      const raw = consoleSession.frameKey();
      const k = this.gameBigOn ? raw : raw.replace(/\|i\d+\|/, '|i|');
      if (k !== this.gameKey) { this.gameKey = k; this.version++; }
      // ⚑ item 7 — the AI comments while she plays: a metric dressed as praise, one line every few matches, three in all.
      //   ⚑ S367 — on ITS OWN push (the tug of war): "Calmer already. 61% → 64%." names the AI's counter-move as her calm
      const st = consoleSession.stats, b = this.bot;
      const lp = st.lastPush;
      if (st.pushes > this.gamePushes && lp && lp.to > lp.from && st.matches >= this.gameMatches + 3
        && this.gameComments < BOT.game.comments.length && !this.act && (!b || this.botBeatReady)
        && (this.step === 'bot' || this.step === 'confirm' || this.step === 'junie')) {
        this.gamePushes = st.pushes;
        const line = BOT.game.comments[this.gameComments++].replace('{from}', String(lp.from)).replace('{to}', String(lp.to));
        this.botSaid.push({ who: 'bot', text: line });
        this.gameLine = line;   // S366: and under the enlarged game
        this.gameMatches = st.matches;
        playOnce('agent_2026.mp3');
        this.version++;
      }
    }
    const at = (s: number): boolean => b4 < s && this.stepT >= s;
    const m = this.messenger;
    // the messenger's own clock (the draft's caret)
    const mt = m.t; m.t += dt;
    if (m.lockT > 0) { m.lockT = Math.max(0, m.lockT - dt); if (m.lockT === 0) this.version++; }
    if (m.view === 'mum' && m.mumDraft && Math.floor(mt * 2) !== Math.floor(m.t * 2)) this.version++;
    // ⚑ S328 — Mum's thread drifts on toward today if she has not scrolled for a while (no beat waits on the gesture)
    if (m.drift(dt)) this.version++;
    if (this.pathIds().size && !this.lambyGuide?.active) {
      const s4 = this.stallT; this.stallT += dt;
      if (s4 < STALL_SECONDS && this.stallT >= STALL_SECONDS) this.version++;
    }
    // L's word of the day and the "while you wait" — a line in the monitor's bar, once each, never over a felt thread
    if (!this.messenger.felt && (this.step === 'news' || this.step === 'results' || this.step === 'bot')) {
      this.quietT += dt;
      if (!this.wotdSaid && this.step === 'news' && this.quietT > 12 && !this.nowLine) {
        const app = lexStrings.wotdApps.e4;
        const t = (lexStrings.terms as { id: string; word: string | null; line: string | null }[]).find((x) => x.id === app.word);
        if (t?.word) { this.wotdSaid = true; meetWord(t.id, 'e4-wotd'); this.sayLine(`${app.title}: ${t.word}. ${t.line ?? ''}`); }
      }
      // ⚑ S364 / item 7 — the console is lit by the AI's offer now: this quiet line only follows her "Not now"
      if (!this.waitSaid && this.quietT > 25 && consoleSession.lit && this.gameAnswer === 'later' && !this.gameWin && !ledger.games.some((g) => g.id === 'matchmade')) {
        this.waitSaid = true; this.waitNow = true; this.version++;
      }
    }
    switch (this.step) {
      case 'house':
        // Act I · eighteen — her friends write first. ⚑ S328 (his: "the cascade of messages… this is not to appear
        //   now") — the screen is open and quiet first; Kettle's window grows, then one message at a time
        if (at(0.05)) { markE4('eighteen'); this.face('laptop'); }
        for (let i = 0; i < 3; i++) if (at(houseAt(i))) {
          m.houseShown = i + 1; if (i === 0) m.want = 'house'; playOnce('ui_press.mp3');
          // ⚑ S363 / N1 — the morning starts where a 2026 machine would: a message, and its notification
          const l = V.messenger.house.birthday[i];
          this.toast('house', V.messenger.chats.house.name, `${l.who}: ${l.text}`);
          this.version++;
        }
        if (m.houseHeart && this.stepT >= 0) {
          // the heart is sent; the update restores "defaults" a breath later — the system's act, not hers
          if (this.heartT < 0) this.heartT = 0; else this.heartT += dt;
          // ⚑ S360 / H29 (his headset: thanking the group "jumped straight to 'Welcome back, Maya, your defaults are
          //   restored'") — no restore here any more (the bot makes its picture hers, much later); Mum writes after a breath
          if (this.heartT >= 2.6) this.go('mum');
        }
        break;
      case 'mum':
        // ⚑ S360 — Mum writes once: happy birthday, and that she sent an email (his 11 Nov: "Not much more is needed").
        //   H30: nothing forces a press on her — Dad writes 4.5 s after her thread is read, or 10 s after her message
        if (at(0.8)) {
          m.mumToday = 1; m.mumAtToday = true; m.want = 'mum'; if (m.view !== 'mum') m.view = 'list'; playOnce('ui_press.mp3');
          this.toast('mum', V.messenger.chats.mum.name, V.messenger.mum.today[0].text);
          this.version++;
        }
        if (m.mumOpened && this.todayT < 0) { this.todayT = 0; this.file('v3:mum', 'read', W3.mum); }
        if (this.todayT >= 0) this.todayT += dt;
        if (!m.dadIn && this.stepT > 0.8 && (this.todayT >= 4.5 || this.stepT >= 10.8)) {
          m.dadIn = true; m.want = 'dad'; playOnce('ui_press.mp3');
          this.toast('dad', V.messenger.chats.dad.name, V.messenger.dad.today[V.messenger.dad.today.length - 1].text);
          this.go('dad');
        }
        break;
      case 'mail':
        // ⚑ S360 — the clinic writes first: the Mail tab opens on its email (the piece takes her there; nothing to press)
        if (at(1.4)) {
          this.mailRows = ['clinic']; this.mailOpen = 'clinic';
          this.addTab(this.mailTab(), true);
          markE4('number');
          this.file('v3:clinic', 'read', MAIL.witnessClinic.replace('{number}', this.clinicNumber.toLocaleString('en-GB')));
          this.face('monitor'); playOnce('ui_press.mp3'); this.go('clinic');
        }
        break;
      case 'news': {
        // ⚑ S360 — Mum's links: no beat waits on a press; a while on an article and the next one opens, and a while on
        //   the last (the sponsored box) and she searches herself — the second way in (both routes, in sequence)
        this.idleNav += dt;
        const a = ARTICLES[this.newsIndex];
        if (this.liveTab !== 'news') { if (this.idleNav >= NAV_IDLE.article) this.openArticle(this.newsIndex); }
        else if (this.idleNav >= (a?.sponsored ? NAV_IDLE.sponsor : NAV_IDLE.article)) {
          if (a?.sponsored) this.beginSearch(); else this.openArticle(this.newsIndex + 1);
        }
        break;
      }
      case 'mumMail':
        this.idleNav += dt;
        if (this.idleNav >= NAV_IDLE.mum) this.openArticle(0);
        break;
      case 'meridian':
        if (this.enquiry === 'sending') {
          this.enquiryT += dt;
          if (this.enquiryT >= ENQUIRY_REPLY_SECONDS) {
            // ⚑ S360 — the no comes back as an email (the auto-reply), on top of the inbox; the list moves meanwhile
            this.enquiry = 'closed';
            this.mailRows = ['meridian', ...this.mailRows]; this.mailOpen = 'meridian';
            ledger.e4Space.push({ id: 'enquiry', outcome: 'read', witness: ENQ.witness });
            this.file('v3:meridian', 'read', MAIL.witnessMeridian);
            markE4('meridian');
            this.clinicNumber += 3; this.clinicMoved = true;
            this.openTab('mail'); playOnce('ui_press.mp3');
            this.meridianT = 0;
          }
        }
        if (this.meridianT >= 0) {
          this.meridianT += dt;
          // H30/H31: time to read the refusal; then the room's conducted turn has the floor (e4Room reads 'meridian')
          if (this.meridianT >= 6) { this.meridianT = -1; this.go('pause'); }
        }
        break;
      case 'left':
        if (at(2.0)) this.face('laptop');
        if (at(2.4)) { m.houseLeft = 1; m.want = 'house'; if (m.view !== 'house') m.view = 'list'; playOnce('ui_press.mp3'); this.version++; }
        if (at(3.4)) { m.houseLeft = 2; this.version++; }
        // she was already in the house chat when it happened: she has read it
        if (m.view === 'house' && m.houseLeft >= 2 && !m.houseOpenedLeft) this.openChat('house');
        break;
      case 'pause':
        // the room's conducted turn has the floor; then the search, finished for her
        // ⚑ S360 — then Mum's email arrives: the last thing before the AI (the photo, her links, "Mum, I")
        // ⚑ S363 / N2 (his: "she said I sent you an email") — the mailbox opens ON Mum's email, already opened; the rest
        //   of the inbox is the morning she lived (the clinic, her forward to Meridian, its no, her unsent reply)
        if (this.stepT >= ROOM_WAIT.min && (e4Has('room') || this.stepT >= ROOM_WAIT.max)) {
          this.mailRows = ['meridian', 'clinic', 'mum']; this.mailOpen = 'mum';
          this.mailSeen.add('mum'); this.mailSeen.add('meridian'); this.mailSeen.add('clinic');
          this.addTab(this.mailTab(), true);
          this.file('v3:mummail', 'read', MAIL.witnessMum);
          this.face('monitor'); this.openTab('mail'); playOnce('ui_press.mp3');
          this.idleNav = 0;
          this.go('mumMail');
        }
        break;
      case 'search': {
        const before = this.typedT; this.typedT += dt;
        if (before < 1.6) this.version++;
        break;
      }
      case 'typing':
        this.typeT += dt;
        this.version++;
        if (this.typeT >= PROGRAM.typingSeconds + 0.6) {
          markE4('search');
          this.file('v3:search', 'read', W3.search);
          this.go('results');
        }
        break;
      case 'bot': case 'confirm': case 'photos': case 'ready':
        this.botClock(dt);
        // the screens are done: the piece turns her to the headset, which is all that is left (no beat waits on a look)
        if (this.step === 'ready' && this.programDone && !this.headsetFaced && this.stepT > 2.5) { this.headsetFaced = true; this.face('headset'); }
        if (this.step === 'photos' && this.reversal === 'verifying') {
          this.reversalT += dt;
          this.version++;
          if (this.reversalT >= PH.verifySeconds) {
            this.reversal = 'matched';
            this.profile = 'maya';
            markE4('original');
            this.messenger.wallpaper = 'hers';   // S328: her own picture comes back on the one screen too
            this.file('reversal', 'done', W3.reversal);
            playOnce('step_done_2026.mp3');
            this.startBot('ready');
            this.go('ready');
          }
        }
        break;
      case 'junie':
        if (m.junieReplied) {
          const j4 = this.junieT; this.junieT += dt;
          if (j4 < 2.2 && this.junieT >= 2.2) { m.junieX = true; this.version++; }
          if (j4 < 4.6 && this.junieT >= 4.6) {
            // the bot notices, and sends her — it thinks — to confirm its picture
            this.go('confirm');
            this.openTab('search');
            this.startBot('unmuted');
            this.face('monitor');
          }
        }
        break;
      default: break;
    }
  }
  private heartT = -1;
  private headsetFaced = false;
  private todayT = -1;

  private botClock(dt: number): void {
    const b = this.bot;
    if (!b) return;
    const before = this.botT;
    this.botT += dt;
    if (Math.floor(before / 0.3) !== Math.floor(this.botT / 0.3) && this.botT < 14) this.version++;
    if (b.id === 'heading' && this.botT < 5 && Math.floor(before * 12) !== Math.floor(this.botT * 12)) this.version++;   // the filter's slide
    if (this.clipTakeover && Math.floor(before * 8) !== Math.floor(this.botT * 8)) this.version++;
    if (b.id === 'clip' && before < 0 && this.botT >= 0) stopClipSound();   // S360: the clip ends, its sound with it
    // ⚑ S360 — the clip's two lines ask nothing: after them, the bot moves on to the mute by itself (the tour stalled here)
    // ⚑ S369 — every beat that moves on by itself waits for its last line to have been read (botReadEnd), as well as its own breath
    if (b.id === 'clip' && this.botBeatReady && this.step === 'bot' && this.botNextIn < 0 && this.botT >= Math.max(this.botOnsets(b)[b.lines.length - 1] + 2.2, this.botReadEnd(b))) {
      this.startBot('game');   // S364 / item 7: the offer, when she is most shaken
      return;
    }
    if (this.botNextIn >= 0) { this.botNextIn -= dt; if (this.botNextIn < 0) { this.botNextIn = -1; this.nextBot(); } }
    // ⚑ S350 — "Stories like yours" holds a while for reading, then the bot rests (nothing waits on a press here)
    if (b.id === 'stories' && !(b as { button?: string }).button && this.botBeatReady && this.step === 'bot' && this.botT >= Math.max(this.botOnsets(b)[b.lines.length - 1] + BOT.stories.holdSeconds, this.botReadEnd(b))) {
      this.startBot('explore');   // S364: then it takes Mum's word — explore — and sells her the session
      return;
    }
    // the bot's "rest" ends the bot's act: the piece turns her to the laptop, where Junie's badge has waited all day
    if (b.id === 'rest' && this.botBeatReady && this.step === 'bot' && this.botT >= Math.max(this.botOnsets(b)[this.botLines(b).length - 1] + 2.4, this.botReadEnd(b))) {
      const m = this.messenger;
      m.junieOpenable = true; m.want = 'junie'; m.view = 'list';
      this.go('junie');
      this.face('laptop');
      playOnce('ui_press.mp3');
    }
  }
  private startBot(id: string): void {
    const was = this.bot;
    if (was && !this.botDone.has(was.id)) { this.botDone.add(was.id); this.botSaid.push(...this.beatRows(was, was.lines.length)); }
    this.botBeat = BOT.beats.findIndex((b) => b.id === id);
    this.botT = 0;
    this.anchorAt = this.botSaid.length;   // S364: where this answer begins in the conversation
    // ⚑ S360 — the clip, made for her, owns the page before its beat speaks (it was the map's, recommended from a channel)
    if (id === 'clip') { markE4('map'); this.botT = -CLIP_TAKEOVER_SECONDS; startClipSound(); }   // its music + narrator, t = 0 with the picture
    if (id === 'heading') {
      // ⚑ S360 — the goal LAST, and the restore is the bot's act: "I've made it your picture" (the review he accepted;
      //   H47 "You, restored" no longer on the front from the start, nor on the table and the wall — e4Room)
      this.ring = Math.max(this.ring, 97);   // S367: the AI's push (never a fall: a pull of hers is undone, not rewarded)
      this.profile = 'goal';   // the small profile chip only (what Photos reverses); ⚑ H47 — Kettle's wallpaper stays hers
      markE4('newyou');
      this.file('newyou', 'read', W3.newyou);
    }
    if (id === 'stories') this.file('v3:stories', 'read', W3.stories);
    // ⚑ S372 — the Lexicon's 2026 words, met where the AI says them (Your Words; "You met it" on each page)
    if (id === 'diagnosis') { meetWord('rogd', 'e4-signs'); meetWord('contagion', 'e4-spread'); }
    if (id === 'explore') { meetWord('exploring', 'e4-explore'); meetWord('explorative', 'e4-explore'); }
    if (id === 'heading') meetWord('freedom', 'e4-restored');
    if (id === 'unmuted') this.ring = Math.min(this.ring, 61);   // S367: her act pulls it; it never rises for it
    this.beatRing = this.ring;
    // ⚑ S364 / N10 — before it speaks, it uses her computer: it reads her mail; it mutes Junie and two more; it starts the game
    if (id === 'reasons') { this.botT = -ACT_SECONDS.read; this.startAct('read'); }
    if (id === 'map') { this.botT = -ACT_SECONDS.mute; this.startAct('mute'); }
    if (id === 'rest' && this.gameAnswer === 'later' && !this.gameWin) { this.botT = -ACT_SECONDS.game; this.startAct('game'); }
    // what Junie writes after the mute arrives, hidden
    if ((id === 'heading' || id === 'stories') && this.messenger.junieMuted && !this.messenger.junieUnmuted) { this.messenger.junieHidden = id === 'heading' ? 1 : 2; }
    if (BOT.beats[this.botBeat]?.lines.length) { playOnce('agent_2026.mp3'); this.gameBig = false; }   // S366: a new answer of its own brings her back to the conversation
    // ⚑ S360 — with the Mail and News tabs open beside it, each new beat brings the chat back to the front (no beat waits on
    //   her finding it: the S360 test walk wandered the tabs while the bot spoke, and the chat stalled)
    if ((this.step === 'bot' || this.step === 'confirm') && this.liveTab !== 'search') this.openTab('search');
    this.version++;
  }
  private nextBot(): void {
    const order = ['hello', 'reasons', 'diagnosis', 'clip', 'game', 'map', 'heading', 'stories', 'explore', 'rest'];   // S364: + the game, explore
    const b = this.bot;
    const i = b ? order.indexOf(b.id) : -1;
    if (i >= 0 && i < order.length - 1) this.startBot(order[i + 1]);
  }
  /** her answer: her bubble, its reply (it always agrees), and the next beat after a breath */
  private answerBot(chip: BotChip | null): void {
    const b = this.bot;
    if (!b || this.botDone.has(b.id) || !this.botBeatReady) return;
    this.botDone.add(b.id);
    this.botSaid.push(...this.beatRows(b, b.lines.length));
    // ⚑ S363 / N7 — whatever she presses is HER message, in her own bubble; then "Memory updated" and what it saved
    if (chip) {
      this.botSaid.push({ who: 'her', text: chip.label });
      if (chip.memory) this.botSaid.push({ who: 'memory', text: chip.memory });
      this.botSaid.push({ who: 'bot', text: chip.reply });
      this.file(`conv:${b.id}`, 'answered', chip.filed);
      if (b.id === 'map') this.ring = Math.max(this.ring, 98);   // S364: the AI muted them before it asked; her answer changes nothing
      if (chip.game) { this.gameAnswer = chip.game; if (chip.game === 'open') this.openGame(); else consoleSession.light(); }
      if (b.id === 'explore') this.sessionBooked = true;
    } else {
      if (b.button) this.botSaid.push({ who: 'her', text: b.button });
      if (b.memory) this.botSaid.push({ who: 'memory', text: b.memory });
      if (b.filed) this.file(`conv:${b.id}`, 'done', b.filed);
    }
    playOnce('ui_press.mp3');
    // ⚑ S363 / N1 — Photos was never open "for no reason": it opens here, when the bot sends her to it
    if (b.id === 'unmuted') { this.go('photos'); this.addTab(this.photosTab(), true); }
    // ⚑ S369 / F18 — the next beat waits until what was just said has been read: her bubble, what it filed ("Memory updated"),
    //   and its reply (it was 0.9 s, and the next answer is laid out from its own first line, so the reply went up out of view)
    else this.botNextIn = Math.max(0.9, chip ? readHold([chip.memory ?? '', chip.reply]) : readHold([b.memory ?? '']));
    this.version++;
  }

  // ── the act changes, named ────────────────────────────────────────────────
  // (S360: `beginNewYou` retired — the restore is the bot's act at its `heading` beat)


  // ── the messenger, pressed (Kettle's window) ─────────────────────────────
  pressMessenger(x: number, y: number): boolean {
    if (this.phase !== 'open') return false;
    const id = this.messenger.press(x, y);
    this.lambyGuide?.activity();
    this.stallT = 0;
    if (!id) return false;
    this.handleMessenger(id);
    return true;
  }
  private openChat(c: ChatId): void {
    const m = this.messenger;
    // ⚑ S328 — one scrolling thread: Mum's opens at 2023 the first time (she scrolls down through the years to today);
    //   every other thread, and Mum's once she has reached today, opens at its latest line
    m.opened(c, c === 'mum' && !m.mumOpened);
    if (c === 'house') {
      if (m.houseShown > 0) m.houseOpenedBirthday = true;
      if (m.houseLeft > 0 && !m.houseOpenedLeft) {
        m.houseOpenedLeft = true;
        markE4('left');
        this.file('v3:left', 'read', W3.left);
        m.want = null;
        if (this.step === 'left') this.go('pause');
      }
    } else if (c === 'mum') {
      if (!m.mumOpened) { m.mumOpened = true; markE4('mum'); }
    } else if (c === 'dad') {
      if (m.dadIn && !m.dadRead) {
        m.dadRead = true;
        markE4('dad');
        this.file('v3:dad', 'read', W3.dad);
        m.want = null;
        this.morningLived();   // S363: the clinic and Meridian are history in her inbox; the room's turn, then Mum's email
      }
    } else if (c === 'junie') {
      m.junieOpened = true;
    }
    playOnce('ui_press.mp3');
    this.version++;
  }
  private handleMessenger(id: string): void {
    const m = this.messenger;
    if (id.startsWith('row-') || id.startsWith('chat-')) { this.openChat(id.replace(/^(row|chat)-/, '') as ChatId); return; }
    if (id === 'back-chats') { m.view = 'list'; this.version++; return; }
    if (id === 'house-heart' && !m.houseHeart) {
      m.houseHeart = true; m.want = null;
      this.file('v3:house', 'answered', W3.house);
      playOnce('ui_press.mp3'); this.version++;
      return;
    }
    if (id === 'scroll-up' || id === 'scroll-down') { this.version++; return; }
    if (id === 'msg-link' && m.dadRead && !m.linkOpened) {
      // ⚑ beat 4 — Mum's link opens the browser, and the news opens behind it, tab after tab
      m.linkOpened = true; m.want = null;
      markE4('link');
      this.file('v3:link', 'opened', W3.link);
      this.newsIndex = 0; this.newsOpened = 1;
      this.addTab(this.newsTab(), true);
      this.face('monitor');
      playOnce('ui_press.mp3');
      this.go('news');
      return;
    }
    if (id === 'junie-help' && m.junieMuted && !m.helpSent) {
      // ⚑ S364 / N12 — the hidden way: "help", into the thread the AI muted; Junie's raid answers it (s4_ball.json)
      m.helpSent = true;
      this.file('v3:help', 'answered', W3.help);
      playOnce('ui_press.mp3'); this.version++;
      return;
    }
    if (id === 'junie-unmute' && !m.junieUnmuted && m.junieMuted) {
      m.junieUnmuted = true; m.want = null;
      m.junieHidden = V.messenger.junie.hidden.length;
      m.opened('junie', true);   // S328: what the mute hid reads from its first line (Tuesday), down to today
      this.junieWarm = true;
      markE4('junie');
      this.file('v3:junie', 'answered', W3.junie);
      playOnce('ui_press.mp3'); this.version++;
      return;
    }
    if (id === 'junie-reply' && m.junieUnmuted && !m.junieReplied) {
      m.junieReplied = true; this.junieT = 0;
      playOnce('ui_press.mp3'); this.version++;
    }
  }


  // ── drawing the monitor ──────────────────────────────────────────────────
  private tabsBack(): number {
    if (this.phase === 'open') return this.tabs.length;
    const since = this.t - BOOT_SECONDS - RESTORE_SECONDS;
    if (since < 0) return 0;
    return Math.min(this.tabs.length, Math.floor(since / TAB_GAP) + 1);
  }

  /**
   * ⚑ S328 — THE ONE SCREEN (T03). Before the session is open (the sleep, the restore) the page has the whole glass
   * and nothing else arrives. From then on the monitor carries two windows side by side — the browser (the system)
   * and Kettle (the people) — under one taskbar where L lives. Each window draws its page at its own logical size
   * under a scale, so text stays one size per window; the larger window is the one the story is on.
   */
  draw(ctx: CanvasRenderingContext2D, W: number, H: number, pressable = true, kettlePressable = pressable): void {
    this.hits = [];
    this.pressable = pressable;
    if (!this.windowed) {
      this.lay = null;
      this.drawPage(ctx, W, H, pressable);
      this.hits = this.pageTargets.slice();
      return;
    }
    const L = this.layout(W, H);
    this.lay = L;
    px(ctx, 0, 0, W, H, V3.desk);
    // the browser's window
    this.windowTitle(ctx, L.b, V.oneScreen.browserTitle, 'win-browser', pressable);
    ctx.save(); ctx.beginPath(); ctx.rect(L.b.cx, L.b.cy, L.b.cw, L.b.ch); ctx.clip();
    ctx.translate(L.b.cx, L.b.cy); ctx.scale(L.b.s, L.b.s);
    this.drawPage(ctx, L.b.lw, L.b.lh, pressable);
    ctx.restore();
    // ⚑ S366 / J15-03 — the game enlarged over the browser's area covers its page: nothing under it takes a press
    if (!this.gameBigOn) for (const h of this.pageTargets) this.hits.push(toMonitor(h, L.b));
    // Kettle's window: the people. Nothing on it is pressable once the screens are done (the headset is the way on),
    //   except the lot's evening after the device has stopped (they keep writing)
    this.windowTitle(ctx, L.k, V.oneScreen.kettleTitle, 'win-kettle', pressable);
    ctx.save(); ctx.beginPath(); ctx.rect(L.k.cx, L.k.cy, L.k.cw, L.k.ch); ctx.clip();
    ctx.translate(L.k.cx, L.k.cy); ctx.scale(L.k.s, L.k.s);
    const k = this.messenger.draw(ctx, L.k.lw, L.k.lh);
    ctx.restore();
    const kettleLive = kettlePressable && (this.phase === 'open' ? !this.programDone : e4Has('terminated'));
    if (kettleLive) for (const h of k) this.hits.push(toMonitor(h, L.k));
    this.drawGameWindow(ctx, L, pressable);
    this.drawToasts(ctx, L, H, pressable);   // S366: over the game, which may now be enlarged over the browser's area
    this.drawTakeover(ctx, L, W);
    // the taskbar: the date, and L (T25: the guide is always one press away, and never over a felt thread)
    const ty = H - WIN.taskbar;
    px(ctx, 0, ty, W, WIN.taskbar, V3.bar); px(ctx, 0, ty, W, 1, V3.barEdge);
    ctx.font = monoFor(10); ctx.fillStyle = V3.ink2; ctx.fillText(V.oneScreen.taskbarDate, 8, ty + 5);
    if (pressable && this.phase === 'open' && this.lambyGuide?.canRequest && !this.startMap.active && !this.messenger.felt) {
      // drawLambyGuide pushes its own controls (the tray, the balloon's buttons) onto the list it is given; the tray's
      //   L gets its words beside it (his: "where is our guide?")
      setFont(ctx, 10); ctx.fillStyle = V3.ink2;
      const ask = V.oneScreen.askL, aw = Math.ceil(ctx.measureText(ask).width);
      ctx.fillText(ask, W - 112 - aw, ty + 5);
      this.hits.push({ x: W - 116 - aw, y: ty + 1, w: aw + 8, h: WIN.taskbar - 2, id: 'lg-tray' });
      this.lambyGuidePaint = drawLambyGuide(ctx, 'e4', this.lambyGuide.view, this.hits, { w: W, h: H }, this.hits.map(h => `press:${h.id}`));
    } else this.lambyGuidePaint = { rings: [], balloon: false };
    const view = this.lambyGuide?.view;
    if (pressable && view && !view.hidden && view.rung === 'show' && !this.startMap.active) {
      for (const r of this.hits.filter(h => view.targets.includes(h.id))) drawGuidePointer(ctx, r, { x: W - 24, y: H - 24 }, CHROME.accent, view.frame);
    }
  }
  /**
   * ⚑ S363 / N1 — 2026's desktop notifications: a person wrote. They stack over the browser's lower right (never over
   * Kettle, where the message itself is), fade after a few seconds, and a press opens the chat. One voice at a time:
   * none while L's balloon is up.
   */
  private drawToasts(ctx: CanvasRenderingContext2D, L: Layout, H: number, pressable: boolean): void {
    if (!this.toasts.length || this.phase !== 'open' || this.lambyGuidePaint.balloon) return;
    const tw = 214, th = 44;
    let y = H - WIN.taskbar - 8 - th;
    for (const t of [...this.toasts].reverse()) {
      const x = L.b.x + L.b.w - tw - 8;
      const a = Math.min(1, t.t / 0.25, (t.hold - t.t) / 0.6);
      ctx.save(); ctx.globalAlpha = Math.max(0, a);
      roundRect(ctx, x + 1, y + 2, tw, th, 10, V3.grey);
      roundEdge(ctx, x, y, tw, th, 10, V3.edge, V3.card);
      if (t.sys) assistantMark(ctx, x + 8, y + 10, 22, V3.primary, V3.primaryInk); else this.messengerAvatar(ctx, x + 8, y + 10, 22, t.chat);
      ctx.font = monoFor(8); ctx.fillStyle = V3.ink2; ctx.fillText((t.sys ? t.title : V.messenger.app) + ' · now', x + 36, y + 6);
      if (t.sys) { setFont(ctx, 11); ctx.fillStyle = V3.ink; wrapText(ctx, t.line, tw - 46).slice(0, 2).forEach((l, k) => ctx.fillText(l, x + 36, y + 16 + k * 13)); }
      else {
        setFont(ctx, 11); ctx.fillStyle = V3.ink; ctx.fillText(fitText(ctx, t.title, tw - 46), x + 36, y + 16);
        setFont(ctx, 10); ctx.fillStyle = V3.ink2; ctx.fillText(fitText(ctx, t.line, tw - 46), x + 36, y + 29);
      }
      // ⚑ S366 / J15-04 — its ✕: closes it, opens nothing. Not while the AI is using her computer (her presses do
      //   nothing then, by design: its banner says so)
      const closable = !this.act;
      if (closable) { setFont(ctx, 10); ctx.fillStyle = V3.ink2; ctx.fillText(V.oneScreen.close, x + tw - 14, y + 4); }
      ctx.restore();
      if (pressable && a > 0.5 && closable) this.hits.push({ x: x + tw - 22, y, w: 22, h: 20, id: `toast-x-${t.chat}` });
      if (pressable && a > 0.5 && !t.sys) this.hits.push({ x, y, w: tw, h: th, id: `toast-${t.chat}` });
      y -= th + 6;
    }
  }
  private messengerAvatar(ctx: CanvasRenderingContext2D, x: number, y: number, d: number, id: ChatId): void {
    const fill = id === 'mum' ? KETTLE.avatarMum : id === 'dad' ? KETTLE.avatarDad : id === 'house' ? KETTLE.avatarHouse : KETTLE.avatarJunie;
    senderMark(ctx, x, y, d, V.messenger.chats[id].mark, fill);
  }
  /**
   * ⚑ S364 / item 7 — MATCH MADE SIMPLE in a window on her screen: the same session as the console on her bed (one game,
   * two surfaces — src/room/consoleSession.ts). A press on it plays; ✕ closes the window (the console stays lit).
   */
  private drawGameWindow(ctx: CanvasRenderingContext2D, L: Layout, pressable: boolean): void {
    // ⚑ S364 — it sits in the empty lower part of Kettle's list (never over the chat's words); it steps aside while a
    //   person's thread is open there (the felt law: nothing of the system over a person) and while a page is opened larger
    if (!this.gameWin || this.phase !== 'open' || this.lightbox || this.messenger.felt) return;
    const G = BOT.game;
    if (this.gameBig) {
      // ⚑ S366 / J15-03 (his: "when I press does it enlarge?") — enlarged over the browser's area, like a page opened
      //   larger: it plays here at a readable size; ◂ Back or ✕ returns it to the corner. The same session as the console.
      const x0 = L.b.cx, y0 = L.b.cy, w0 = L.b.cw, h0 = L.b.ch, bar = 18, strip = this.gameLine ? 22 : 6;
      px(ctx, x0, y0, w0, h0, V3.titleOn);
      setFont(ctx, 10); ctx.fillStyle = V3.titleOnInk;
      const bw = Math.ceil(ctx.measureText(G.back).width);
      ctx.fillText(G.back, x0 + 8, y0 + 4);
      const title = `${G.window} · ${G.sub}`, tw = Math.ceil(ctx.measureText(title).width);
      ctx.fillText(title, x0 + Math.round((w0 - tw) / 2), y0 + 4);
      setFont(ctx, 11); ctx.fillText(G.close, x0 + w0 - 16, y0 + 3);
      let gw = w0 - 8, gh = Math.round(gw * 9 / 16);
      const avH = h0 - bar - strip - 2;
      if (gh > avH) { gh = avH; gw = Math.round(gh * 16 / 9); }
      const gx = x0 + Math.round((w0 - gw) / 2), gy = y0 + bar;
      px(ctx, gx, gy, gw, gh, ERA4.field);
      if (consoleSession.ready) consoleSession.draw(ctx, gx, gy, gw, gh);
      if (this.gameLine) {
        // its word on her play, under the game (the chat keeps the same line): one voice, the AI's
        const sy = gy + gh + 4;
        assistantMark(ctx, gx, sy, 14, V3.primary, V3.primaryInk);
        setFont(ctx, 11); ctx.fillStyle = V3.titleOnInk; ctx.fillText(fitText(ctx, this.gameLine, gw - 22), gx + 20, sy + 1);
      }
      if (pressable) {
        this.hits.push({ x: x0, y: y0, w: bw + 16, h: bar, id: 'game-small' });
        this.hits.push({ x: x0 + w0 - 24, y: y0, w: 24, h: bar, id: 'game-small-x' });
        this.hits.push({ x: gx, y: gy, w: gw, h: gh, id: 'game-play' });
      }
      return;
    }
    const tb = 14, gw = L.k.w - 10, gh = Math.round((gw - 4) * 9 / 16) + 2;
    const gx = L.k.x + 5, gy = L.k.cy + L.k.ch - Math.round(34 * L.k.s) - gh - tb;
    roundRect(ctx, gx + 2, gy + 3, gw, gh + tb, 6, V3.grey);
    roundRect(ctx, gx, gy, gw, gh + tb, 6, V3.titleOn);
    setFont(ctx, 8); ctx.fillStyle = V3.titleOnInk; ctx.fillText(fitText(ctx, `${G.window} · ${G.sub}`, gw - 40), gx + 6, gy + 3);
    setFont(ctx, 9); ctx.fillText(G.close, gx + gw - 12, gy + 2);
    ctx.fillText(V.oneScreen.enlarge, gx + gw - 26, gy + 2);   // S366 / J15-03: a press on it plays larger
    px(ctx, gx + 2, gy + tb, gw - 4, gh - 2, ERA4.field);
    if (consoleSession.ready) consoleSession.draw(ctx, gx + 2, gy + tb, gw - 4, gh - 2);
    else { setFont(ctx, 11); ctx.fillStyle = ERA4.textHi; ctx.fillText(G.window, gx + 14, gy + tb + gh / 2 - 8); }
    if (pressable) {
      this.hits.push({ x: gx + gw - 20, y: gy, w: 20, h: tb, id: 'game-close' });
      this.hits.push({ x: gx + 2, y: gy + tb, w: gw - 4, h: gh - 2, id: 'game-play' });
    }
  }
  /**
   * ⚑ S364 / N10 — "Second Thoughts is using your computer": a banner across the top of the screen with her "Take back
   * control" greyed; its pointer, labelled, moving between the windows; Kettle's row menu where it presses Mute; the
   * white blink of a screenshot. Drawn over everything on the monitor; nothing here is pressable.
   */
  private drawTakeover(ctx: CanvasRenderingContext2D, L: Layout, W: number): void {
    const A = BOT.agent;
    if (this.flashT > 0) {
      const r = this.flashOn === 'kettle' ? L.k : L.b;
      ctx.save(); ctx.globalAlpha = Math.min(0.75, this.flashT / 0.22 * 0.75); px(ctx, r.cx, r.cy, r.cw, r.ch, WEB.shimmer); ctx.restore();
    }
    if (!this.act) return;
    // the banner, over both title bars
    px(ctx, 0, 0, W, WIN.title, V3.primary);
    assistantMark(ctx, 6, 2, 14, V3.primaryInk, V3.primary);
    setFont(ctx, 10); ctx.fillStyle = V3.primaryInk; ctx.fillText(A.banner, 26, 3);
    const cw = Math.ceil(ctx.measureText(A.control).width) + 16;
    pill(ctx, W - cw - 6, 2, cw, 14, V3.grey);
    ctx.fillStyle = V3.ink2; ctx.fillText(A.control, W - cw + 2, 3);
    // Kettle's row menu, where it presses Mute
    if (this.menuAt) {
      const p = this.atKettleRow(this.menuAt === 'junie' ? 3 : 0)(L);
      const mx = Math.round(p.x - 10), my = Math.round(p.y + 6), mw = 74, mh = 22;
      roundRect(ctx, mx + 2, my + 2, mw, mh, 5, V3.grey);
      roundEdge(ctx, mx, my, mw, mh, 5, V3.edge, V3.card);
      roundRect(ctx, mx + 3, my + 3, mw - 6, mh - 6, 4, V3.botSoft);
      setFont(ctx, 10); ctx.fillStyle = V3.ink; ctx.fillText(A.mute, mx + 10, my + 5);
    }
    // its pointer, with its name on it
    const p = this.pointerAt(L);
    if (p) {
      const x = p.x, y = p.y;
      ctx.save();
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 15); ctx.lineTo(x + 4, y + 11); ctx.lineTo(x + 7, y + 17); ctx.lineTo(x + 9, y + 16);
      ctx.lineTo(x + 6, y + 10); ctx.lineTo(x + 11, y + 10); ctx.closePath();
      ctx.fillStyle = V3.ink; ctx.fill(); ctx.strokeStyle = WEB.shimmer; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
      setFont(ctx, 9);
      const lw = Math.ceil(ctx.measureText(A.pointer).width) + 22;
      const lx = x + 12 + lw > W - 2 ? x - lw - 4 : x + 12;   // near the right edge its name tag sits to the left
      pill(ctx, lx, y + 14, lw, 14, V3.primary);
      assistantMark(ctx, lx + 2, y + 15, 12, V3.primaryInk, V3.primary);
      ctx.fillStyle = V3.primaryInk; ctx.fillText(A.pointer, lx + 17, y + 16);
    }
  }
  /** a window's title bar: its name, and (on the smaller window) the press that enlarges it */
  private windowTitle(ctx: CanvasRenderingContext2D, w: Win, title: string, id: string, pressable: boolean): void {
    const big = (id === 'win-kettle') === (this.enlarged === 'kettle');
    px(ctx, w.x, 0, w.w, WIN.title, big ? V3.titleOn : V3.title);
    setFont(ctx, 11); ctx.fillStyle = big ? V3.titleOnInk : V3.ink;
    ctx.fillText(title, w.x + 8, 3);
    if (!big) {
      const g = V.oneScreen.enlarge;
      const gw = Math.ceil(ctx.measureText(g).width);
      ctx.fillText(g, w.x + w.w - gw - 8, 3);
      if (pressable) this.hits.push({ x: w.x, y: 0, w: w.w, h: WIN.title, id });
    }
  }
  /** the browser's own page, at whatever logical size it is given (the whole glass, or its window) */
  private drawPage(ctx: CanvasRenderingContext2D, W: number, H: number, pressable: boolean): void {
    this.drawSurfaceContent(ctx, W, H, pressable);
    const guide = this.lambyGuide?.view;
    if (!this.windowed && pressable && guide && !guide.hidden && guide.rung === 'show' && !this.startMap.active) {
      const targets = this.pageTargets.filter(h => guide.targets.includes(h.id));
      for (const r of targets) drawGuidePointer(ctx, r, { x: W - 24, y: H - 24 }, CHROME.accent, guide.frame);
    }
    if (this.phase === 'open' && !this.idleOrb) {
      const S = startCopy.desktop.startMenu;
      px(ctx, W - 80, 3, 50, 20, CHROME.button);
      setFont(ctx, 10); ctx.fillStyle = CHROME.buttonInk; ctx.fillText(S.paperMenu, W - 71, 7);
      this.pageTargets.unshift({ x: W - 80, y: 3, w: 50, h: 20, id: 'start-menu' });
      const nav = this.startMap.draw(ctx, W, H, 'e4', this.startModel(), this.startMapSilent);
      if (nav.length) this.pageTargets = [...nav, ...this.pageTargets.filter(r => r.id === 'start-menu' || r.id === 'whattodo')];
    }
  }
  /** Lamby's "Take me there": press the target for her (navigation only — never an answer) */
  pressGuideTarget(id: string): 'monitor' | null {
    if (this.guideSilent || this.guideVoice) return null;
    const allowed = ['ny-continue', 'clinic-open', 'clinic-support', 'mail-support', 'mail-read', 'tab-mail', 'tab-news', 'news-next', 'sponsor-chat', 'search-go', 'ad-chat', 'tab-photos', 'start-menu', 'row-mum', 'chat-mum', 'row-dad', 'chat-dad', 'row-house', 'chat-house', 'row-junie', 'chat-junie'];
    if (!allowed.includes(id)) return null;
    const r = this.hits.find(h => h.id === id);
    if (r) { this.handleClick(r.x + r.w / 2, r.y + r.h / 2); return 'monitor'; }
    return null;
  }

  private drawSurfaceContent(ctx: CanvasRenderingContext2D, W: number, H: number, pressable: boolean): void {
    this.pageTargets = [];
    this.pressable = pressable;
    const back = this.tabsBack();
    if (this.phase === 'dormant' || this.settleT > 0) { px(ctx, 0, 0, W, H, CHROME.page); return; }
    if (this.phase === 'saver') {
      // ⚑ S358 / H18 (his headset, 10 Nov: "Press to wake the screen" covered the breathing) — the orb breathes in the
      //   space above the button: its cue and phrase never reach the button's band
      if (this.orb) { this.orb.footer = 48; this.orb.draw(ctx, W, H); } else px(ctx, 0, 0, W, H, CHROME.page);
      // ⚑ S328 — ONE OBVIOUS FIRST PRESS (his 8 Nov: "not totally sure where to press"): a button, not a whisper.
      //   The whole glass still wakes it; the button says that it does.
      setFont(ctx, 17);
      const label = V.oneScreen.wake, bw = Math.ceil(ctx.measureText(label).width) + 44, bh = 36;
      const bx = Math.round((W - bw) / 2), by = H - 44;
      pill(ctx, bx, by, bw, bh, V3.primary);
      ctx.fillStyle = V3.primaryInk; ctx.fillText(label, bx + 22, by + 9);
      this.publish({ x: 0, y: 0, w: W, h: H, id: 'saver-wake' });
      return;
    }
    if (this.idleOrb && this.phase === 'open') {
      this.idleOrb.draw(ctx, W, H);
      this.publish({ x: 0, y: 0, w: W, h: H, id: 'saver-wake' });
      return;
    }
    if (this.phase === 'restoring' && back <= 0) {
      if (this.t < BOOT_SECONDS) restoring(ctx, W, H, script.boot.bootLine, 0);
      else restoring(ctx, W, H, script.boot.restoring, (this.t - BOOT_SECONDS) / RESTORE_SECONDS);
      return;
    }
    px(ctx, 0, 0, W, H, CHROME.page);
    // the tab row: short names (rule 6); the search tab becomes the bot's ("Chat") once the ad is opened
    const botOn = this.botBeat >= 0;
    const shown = this.tabs.slice(0, back).map((t) => {
      if (t.kind !== 'search') return t;
      if (this.phase === 'failed' && this.streamOpen) return { ...t, title: STREAM.mark };
      if (botOn) return { ...t, title: BOT.tab };
      if (this.step === 'search' || this.step === 'typing' || this.step === 'results') return { ...t, title: SR.tab };
      return t;
    });
    const live = Math.max(0, shown.findIndex((t) => t.id === this.liveId));
    const addr = this.addressNow();
    const blink = false;   // ⚑ S363 — the caret lives in the new search's box now, not in the address bar
    const looks: TabLook[] = shown.map((t) => this.phase === 'failed' ? (t.kind === 'search' ? { badge: this.streamOpen ? '●' : '!', state: 'normal' } : { state: 'locked' })
      : t.kind === 'news' && this.newsOpened > 1 ? { badge: String(this.newsOpened) } : {});
    const rects = browserChrome(ctx, W, shown, live, addr, blink, looks, 80);
    this.tabRects = rects.map((r, i) => ({ ...r, id: shown[i].id }));
    // a sheet or an open thread owns the moment; otherwise every tab is a tab
    const sheet = this.newyouUp || this.enquiryOpen;
    rects.forEach((r, i) => { if (!sheet && this.phase === 'open') this.publish({ ...r, id: `tab-${shown[i].id}` }); });
    this.drawProfile(ctx, W);
    if (this.phase === 'failed') { this.drawFailed(ctx, W, H); return; }
    if (this.phase !== 'open') {
      setFont(ctx, 12); ctx.fillStyle = CHROME.ink;
      ctx.fillText(script.boot.restoring, ADDR.x + 8, PAGE_TOP + 16);
      return;
    }
    if (this.mode === 'game') { this.drawGame(ctx, W, H); return; }
    switch (this.liveTab) {
      case 'news': this.drawArticle(ctx, W, H); break;
      case 'mail': this.drawMail(ctx, W, H); break;
      case 'clinic': this.drawClinic(ctx, W, H); break;
      case 'photos': this.drawPhotos(ctx, W, H); break;
      default:
        if (botOn) this.drawBot(ctx, W, H);
        else if (this.step === 'results') this.drawResults(ctx, W, H);
        else this.drawSearch(ctx, W, H);
    }
    if (this.newyouUp) this.drawNewYou(ctx, W, H);
    if (this.enquiryOpen) this.drawEnquiry(ctx, W, H);
    // ⚑ the ring, just in time only: Lamby asked, or a long stall on the one press the story waits on
    if (!this.startMap.active) {
      const asked = !!this.lambyGuide?.active;
      const stalled = this.stallT >= STALL_SECONDS && ledger.view.highlights !== false;
      if (asked || stalled) {
        const path = this.pathIds();
        for (const h of this.pageTargets) if (path.has(h.id)) this.ringAround(ctx, h);
      }
    }
    if (this.startPanel.open && !sheet) {
      for (const b of this.startPanel.draw(ctx, 24, 176, 300)) this.publish({ ...b, id: 'startpanel-close' });
    }
  }
  private ringAround(ctx: CanvasRenderingContext2D, r: Hit): void {
    ctx.save();
    ctx.strokeStyle = CHROME.accent; ctx.lineWidth = 2; ctx.globalAlpha = 0.9;
    ctx.strokeRect(Math.round(r.x - 3) + 0.5, Math.round(r.y - 3) + 0.5, Math.round(r.w + 6) - 1, Math.round(r.h + 6) - 1);
    ctx.restore();
  }

  private addressNow(): string {
    if (this.phase === 'failed') return this.streamOpen ? ballScript.invite.link : PROGRAM.agentAddress;
    if (this.phase !== 'open') return '';
    const tab = this.tabs.find((t) => t.id === this.liveId);
    if (!tab) return '';
    if (tab.kind === 'news') return ARTICLES[this.newsIndex]?.address ?? '';
    if (tab.kind !== 'search') return tab.address;
    if (this.botBeat >= 0) return PROGRAM.agentAddress;
    // ⚑ S363 — a new search's address bar is empty: her words are in the box (boxText); the results have their address
    if (this.step === 'results') return `${SR.brand.toLowerCase()}.example/search?q=${PROGRAM.chosen.split(' ').join('+')}`;
    return '';
  }
  /** ⚑ S363 — the search box: her half-typed question, and the engine finishing it while it types for her */
  private boxText(): string {
    if (this.step !== 'typing') return script.search.typed;
    const k = Math.min(1, this.typeT / PROGRAM.typingSeconds);
    const n = script.search.typed.length + Math.floor((PROGRAM.chosen.length - script.search.typed.length) * k);
    return PROGRAM.chosen.slice(0, n);
  }
  private get typedDone(): boolean { return this.step === 'search' && this.typedT >= 1.6; }

  /** the profile circle and who it says she is: Maya → "You, restored" → Maya */
  private drawProfile(ctx: CanvasRenderingContext2D, W: number): void {
    if (this.phase !== 'open' && this.phase !== 'failed') return;
    const name = V.profile[this.profile];
    setFont(ctx, 10);
    const nw = Math.ceil(ctx.measureText(name).width) + 14;
    px(ctx, W - 38, ADDR.y + 2, 18, 18, CHROME.toolbar);
    if (this.profile === 'goal') drawGoalPicture(ctx, W - 37, ADDR.y + 3, 16, 16, { caption: false });
    else profileGlyph(ctx, W - 37, ADDR.y + 3, 16, 'maya');
    const nx = W - 64 - 22 - nw;
    pill(ctx, nx, ADDR.y + 3, nw, 16, this.profile === 'maya' ? WEB.accentSoft : CHROME.bar);
    ctx.fillStyle = this.profile === 'maya' ? WEB.accentInk : CHROME.ink;
    ctx.fillText(name, nx + 7, ADDR.y + 6);
  }

  /** ⚑ the window's foot (presentation rule 1): a line of status on the left, the buttons on the right, the primary
   *  last and biggest. Every page draws its controls here and nowhere else. */
  private bar(ctx: CanvasRenderingContext2D, W: number, H: number, left: string, buttons: { id: string; label: string; kind: 'primary' | 'quiet' }[], mono = false): number {
    const y = H - BAR_H;
    px(ctx, 0, y, W, BAR_H, V3.bar);
    px(ctx, 0, y, W, 1, V3.barEdge);
    let x = W - 16;
    const placed: { b: typeof buttons[number]; x: number; w: number }[] = [];
    for (let i = buttons.length - 1; i >= 0; i--) {
      const b = buttons[i];
      setFont(ctx, b.kind === 'primary' ? 15 : 13);
      const w = Math.ceil(ctx.measureText(b.label).width) + (b.kind === 'primary' ? 40 : 28);
      x -= w;
      placed.unshift({ b, x, w });
      x -= 10;
    }
    const line = this.nowLine ?? (this.waitNow ? PROGRAM.console.wait : left);
    if (line) {
      if (mono && !this.nowLine && !this.waitNow) ctx.font = monoFor(12); else setFont(ctx, 14);
      ctx.fillStyle = V3.ink2;
      const room = Math.max(40, x - 24);
      const rows = wrapText(ctx, line, room).slice(0, 2);
      rows.forEach((r, i) => ctx.fillText(r, 16, y + (rows.length === 1 ? 15 : 7 + i * 16)));
    }
    for (const { b, x: bx, w } of placed) {
      const h = b.kind === 'primary' ? 32 : 28, by = y + Math.round((BAR_H - h) / 2);
      if (b.kind === 'primary') pill(ctx, bx, by, w, h, V3.primary);
      else { pill(ctx, bx, by, w, h, V3.barEdge); pill(ctx, bx + 1, by + 1, w - 2, h - 2, V3.card); }
      setFont(ctx, b.kind === 'primary' ? 15 : 13);
      ctx.fillStyle = b.kind === 'primary' ? V3.primaryInk : V3.ink;
      const tw = Math.ceil(ctx.measureText(b.label).width);
      ctx.fillText(b.label, bx + Math.round((w - tw) / 2), by + Math.round((h - (b.kind === 'primary' ? 15 : 13)) / 2));
      this.publish({ x: bx, y: by, w, h, id: b.id });
    }
    return placed.length ? placed[0].x : W - 16;
  }
  private pageGround(ctx: CanvasRenderingContext2D, W: number, H: number): void { px(ctx, 0, PAGE_TOP, W, H - PAGE_TOP, V3.page); }

  // ── the search (the new tab, then Act III) ────────────────────────────────
  /**
   * ⚑ S363 / UiB job 14 Part A (N1/N6) — "New search": no engine brand, no bookmark, no wallpaper of her. Her own question
   * from last night is still in the box, half-typed, where she left it. Nothing on it is offered until the story reaches
   * the search (Mum's links run out); then the engine finishes it four ways and picks one for her (as built).
   */
  private drawSearch(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.pageGround(ctx, W, H);
    const bw = Math.min(440, W - 64), bh = 42, bx = Math.round((W - bw) / 2);
    const by = PAGE_TOP + Math.round((H - BAR_H - PAGE_TOP) * 0.30);
    roundEdge(ctx, bx, by, bw, bh, 21, V3.edge, V3.card);
    magnifier(ctx, bx + 16, by + 13, V3.ink2);
    const typing = this.step === 'typing';
    const text = this.boxText();
    // the AI pill at the box's end (2026's search boxes carry one)
    setFont(ctx, 11);
    const ai = '✦ ' + SR.aiMode, aw = Math.ceil(ctx.measureText(ai).width) + 16;
    pill(ctx, bx + bw - aw - 8, by + 10, aw, 22, V3.botSoft);
    ctx.fillStyle = V3.botInk; ctx.fillText(ai, bx + bw - aw, by + 15);
    setFont(ctx, 15); ctx.fillStyle = V3.ink;
    ctx.save(); ctx.beginPath(); ctx.rect(bx + 38, by, bw - aw - 56, bh); ctx.clip();
    ctx.fillText(text, bx + 38, by + 12);
    ctx.restore();
    // the caret: still where she left it (and while the engine types for her)
    const tw = Math.min(bw - aw - 58, Math.ceil(ctx.measureText(text).width));
    if (typing || Math.floor(this.t / CURSOR_BLINK) % 2 === 0) px(ctx, bx + 39 + tw, by + 11, 1, 19, V3.ink);
    if (this.typedDone) this.publish({ x: bx, y: by, w: bw, h: bh, id: 'search-open' });
    if (this.typedDone) {
      // ⚑ the engine finishes her sentence four ways; three assume she has been influenced, and the one she meant is last
      const rows = script.search.completions as string[];
      const top = by + bh + 4, rh = 24;
      const dh = rows.length * rh + 10;
      roundEdge(ctx, bx, top, bw, dh, 8, V3.edge, V3.card);
      setFont(ctx, 14);
      rows.forEach((r, i) => {
        magnifier(ctx, bx + 16, top + 9 + i * rh, V3.grey);
        ctx.fillStyle = V3.ink;
        ctx.save(); ctx.beginPath(); ctx.rect(bx + 36, top, bw - 44, dh); ctx.clip();
        // the part she typed, then the part the engine wrote for her, in the bolder ink
        const mine = script.search.typed;
        setFont(ctx, 14); ctx.fillStyle = V3.ink2; ctx.fillText(mine, bx + 38, top + 8 + i * rh);
        const mw = Math.ceil(ctx.measureText(mine).width);
        ctx.fillStyle = V3.ink; ctx.fillText(r.slice(mine.length), bx + 38 + mw, top + 8 + i * rh);
        ctx.restore();
      });
      this.publish({ x: bx, y: top, w: bw, h: dh, id: 'search-open' });
    }
    this.bar(ctx, W, H, this.step === 'search' ? SR.barHint : '', this.typedDone ? [{ id: 'search-go', label: SR.go, kind: 'primary' }] : []);
  }

  private drawResults(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.pageGround(ctx, W, H);
    const x = 40, cw = W - 80;
    // the engine names itself here, small, on its results page (never on her new tab — N6)
    setFont(ctx, 13); ctx.fillStyle = V3.ink; ctx.fillText(SR.brand, x, PAGE_TOP + 6);
    const bw0 = Math.ceil(ctx.measureText(SR.brand).width) + 12;
    roundEdge(ctx, x + bw0, PAGE_TOP + 2, cw - bw0, 24, 12, V3.edge, V3.card);
    magnifier(ctx, x + bw0 + 9, PAGE_TOP + 8, V3.ink2);
    setFont(ctx, 12); ctx.fillStyle = V3.ink;
    ctx.save(); ctx.beginPath(); ctx.rect(x + bw0 + 26, PAGE_TOP, cw - bw0 - 34, 28); ctx.clip();
    ctx.fillText(PROGRAM.chosen, x + bw0 + 26, PAGE_TOP + 8); ctx.restore();
    let y = PAGE_TOP + 36;
    // ⚑ S363 — 2026's AI overview above everything: kind, bland, and pointing the way the ad does
    const O = (SR as unknown as { overview: { title: string; line: string; fine: string } }).overview;
    setFont(ctx, 12);
    const ol = wrapText(ctx, O.line, cw - 20).slice(0, 2);
    const oh = 22 + ol.length * 15 + 12;
    roundEdge(ctx, x - 8, y, cw + 16, oh, 10, V3.edge, V3.botSoft);
    assistantMark(ctx, x, y + 6, 14, V3.primary, V3.primaryInk);
    setFont(ctx, 12); ctx.fillStyle = V3.botInk; ctx.fillText(O.title, x + 20, y + 7);
    ctx.font = monoFor(9); ctx.fillStyle = V3.ink2;
    const fw = Math.ceil(ctx.measureText(O.fine).width); ctx.fillText(O.fine, x + cw - fw, y + 9);
    setFont(ctx, 12); ctx.fillStyle = V3.ink;
    ol.forEach((l, k) => ctx.fillText(l, x, y + 24 + k * 15));
    y += oh + 10;
    // the ad, first and biggest after the overview — it says it is an ad
    const A = SR.ad, ah = 70;
    roundEdge(ctx, x - 8, y - 4, cw + 16, ah, 7, V3.edge, V3.card);
    setFont(ctx, 11); ctx.fillStyle = V3.ink; ctx.fillText(A.sponsored, x, y);
    ctx.font = monoFor(11); ctx.fillStyle = V3.ink2; ctx.fillText(A.url, x + Math.ceil(ctx.measureText(A.sponsored).width) + 24, y + 1);
    setFont(ctx, 16); ctx.fillStyle = V3.primary; ctx.fillText(A.title, x, y + 15);
    setFont(ctx, 12); ctx.fillStyle = V3.ink; ctx.fillText(A.snippet, x, y + 36);
    setFont(ctx, 10); ctx.fillStyle = V3.ink2; ctx.fillText(A.why, x, y + 51);
    this.publish({ x: x - 8, y: y - 4, w: cw + 16, h: ah, id: 'result-agent' });
    y += ah + 6;
    for (const r of SR.others) {
      if (y + 44 > H - BAR_H) break;
      ctx.font = monoFor(10); ctx.fillStyle = V3.ink2; ctx.fillText(r.url, x, y);
      setFont(ctx, 14); ctx.fillStyle = V3.ink; ctx.fillText(r.title, x, y + 13);
      setFont(ctx, 12); ctx.fillStyle = V3.ink2; ctx.fillText(fitText(ctx, r.snippet, cw), x, y + 31);
      y += 50;
    }
    this.bar(ctx, W, H, SR.sticky, [{ id: 'ad-chat', label: SR.chat, kind: 'primary' }]);
  }

  // ── the update's "defaults": the new you ─────────────────────────────────
  private drawNewYou(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.pageTargets = this.pageTargets.filter((h) => h.id === 'start-menu' || h.id.startsWith('lg-') || h.id.startsWith('sm-'));
    ctx.save(); ctx.globalAlpha = 0.55; px(ctx, 0, PAGE_TOP, W, H - PAGE_TOP, V3.sheetWash); ctx.restore();
    const N = V.newyou;
    // ⚑ S328 — fitted to the browser window (556 logical px): the value sits under its row's name
    const cw = Math.min(600, W - 24), ch = H - BAR_H - PAGE_TOP - 20, cx = Math.round((W - cw) / 2), cy = PAGE_TOP + 10;
    roundEdge(ctx, cx, cy, cw, ch, 8, V3.edge, V3.card);
    const gw = Math.min(220, Math.round(cw * 0.32));
    drawGoalPicture(ctx, cx + 14, cy + 14, gw, ch - 28, { t: this.t });
    const rx = cx + gw + 32;
    setFont(ctx, 24); ctx.fillStyle = V3.ink; ctx.fillText(N.title, rx, cy + 24);
    setFont(ctx, 17); ctx.fillStyle = V3.ink2; ctx.fillText(N.sub, rx, cy + 58);
    let y = cy + 100;
    for (const r of N.rows) {
      px(ctx, rx, y - 8, cw - (rx - cx) - 20, 1, V3.edge);
      setFont(ctx, 14); ctx.fillStyle = V3.ink; ctx.fillText(r, rx, y);
      ctx.fillStyle = V3.botInk; ctx.fillText('✓ ' + N.value, rx, y + 18);
      y += 46;
    }
    setFont(ctx, 12); ctx.fillStyle = V3.ink2; ctx.fillText(N.fine, rx, y + 4);
    this.bar(ctx, W, H, N.bar, [{ id: 'ny-continue', label: N.continue, kind: 'primary' }], true);
  }

  // ── the news ──────────────────────────────────────────────────────────────
  /**
   * ⚑ S363 / UiB job 14 Part A (N5: "where is the visual culture references here??"). Mum's three links as 2026's web
   * serves them: each site its own masthead (a broadsheet, a tabloid, a tech site), an AI summary at the top (accurate,
   * neutral — the idiom, not a verdict), an autoplay video box and a "Most read" rail of ordinary stories, the sticky ad
   * at the foot (Second Thoughts follows her from site to site), and one of the cookie banner, the newsletter pop-up or
   * the paywall. The facts sit in the middle as job 13 built them: two readings side by side, nothing settles it. The
   * furniture covers only the rail, never a reading.
   */
  private drawArticle(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.pageGround(ctx, W, H);
    const i = Math.min(this.newsIndex, ARTICLES.length - 1);
    const a = ARTICLES[i];
    const foot = H - BAR_H;
    px(ctx, 0, PAGE_TOP, W, foot - PAGE_TOP, V3.card);
    // ── the site's own header ──
    const hy = PAGE_TOP, hh = 28;
    const tab = a.look === 'tabloid', tech = a.look === 'tech';
    px(ctx, 0, hy, W, hh, tab ? PLACE.book : tech ? ERA4.field : V3.card);
    const headInk = tab || tech ? WEB.card : V3.ink;
    if (tech) { ctx.font = monoFor(15); ctx.fillStyle = ERA4.textHi; roundRect(ctx, 14, hy + 10, 8, 8, 4, WEB.accent); ctx.fillText(a.mast, 28, hy + 7); }
    else if (tab) { setFont(ctx, 19); ctx.fillStyle = headInk; ctx.fillText(a.mast.toUpperCase(), 14, hy + 5); }
    else { ctx.font = newsFor(20); ctx.textBaseline = 'top'; ctx.fillStyle = headInk; ctx.fillText(a.mast, 14, hy + 4); }
    // its nav, and its Subscribe
    setFont(ctx, 10);
    const sub = SITE.subscribe, subW = Math.ceil(ctx.measureText(sub).width) + 16;
    pill(ctx, W - 12 - subW, hy + 6, subW, 16, tab ? WEB.card : tech ? WEB.accent : PLACE.bookAlt);
    ctx.fillStyle = tab ? PLACE.book : tech ? ERA4.field : WEB.card; ctx.fillText(sub, W - 12 - subW + 8, hy + 9);
    let nx = W - 22 - subW;
    for (const n of [...a.nav].reverse()) {
      if (tech) ctx.font = monoFor(9); else setFont(ctx, 10);
      const nw = Math.ceil(ctx.measureText(n).width);
      nx -= nw;
      if (nx < 190) break;
      ctx.fillStyle = tab || tech ? (tech ? ERA4.text : WEB.card) : V3.ink2; ctx.fillText(n, nx, hy + 10);
      nx -= 12;
    }
    if (!tab && !tech) { px(ctx, 10, hy + hh - 3, W - 20, 1, V3.ink); px(ctx, 10, hy + hh - 1, W - 20, 1, V3.ink); }
    // ── the strip under it: which of Mum's links this is, and the site's free-article count or paywall ──
    const sy = hy + hh, sh = 14;
    px(ctx, 0, sy, W, sh, tab ? PLACE.bookAlt : a.extra === 'paywall' ? V3.botSoft : V3.page);
    ctx.font = monoFor(9); ctx.fillStyle = tab ? WEB.card : V3.ink2;
    ctx.fillText(V.news.count.replace('{n}', String(i + 1)).replace('{of}', String(this.newsOpened)) + ' · ' + SITE.sharedBy, 14, sy + 3);
    if (a.extra === 'paywall') {
      setFont(ctx, 9); ctx.fillStyle = V3.botInk;
      const pw = Math.ceil(ctx.measureText(SITE.paywall.line).width);
      ctx.fillText(SITE.paywall.line, W - 14 - pw, sy + 2);
    } else if (!tab) {
      const fw = Math.ceil(ctx.measureText(SITE.freeLeft).width);
      ctx.fillText(SITE.freeLeft, W - 14 - fw, sy + 3);
    }
    // ── the article ──
    const railW = 132, railX = W - 10 - railW;
    const x = 14, w = railX - 12 - x;
    let y = sy + sh + 6;
    // the kicker and the date
    const kick = a.date.split(' · ')[1] ?? '', date = a.date.split(' · ')[0];
    if (tab) {
      setFont(ctx, 9); const kw = Math.ceil(ctx.measureText(kick.toUpperCase()).width) + 10;
      px(ctx, x, y, kw, 13, PLACE.book); ctx.fillStyle = WEB.card; ctx.fillText(kick.toUpperCase(), x + 5, y + 2);
      ctx.font = monoFor(9); ctx.fillStyle = V3.ink2; ctx.fillText(date, x + kw + 6, y + 2);
    } else {
      ctx.font = monoFor(9); ctx.fillStyle = tech ? V3.botInk : V3.ink2; ctx.fillText((tech ? kick.toUpperCase() : kick) + '  ·  ' + date, x, y + 2);
    }
    // Mum's note on the link she shared (the HHS report), on the kicker's own row
    if (a.mumNote) {
      ctx.font = monoFor(9);
      const kx = x + Math.ceil(ctx.measureText((tab ? '' : kick + '  ·  ') + date).width) + (tab ? Math.ceil(ctx.measureText(kick.toUpperCase()).width) + 24 : 10);
      setFont(ctx, 10);
      const t = fitText(ctx, `Mum: “${a.mumNote}”`, x + w - kx - 16), tw = Math.ceil(ctx.measureText(t).width) + 16;
      pill(ctx, kx, y - 1, tw, 16, V3.ticket); ctx.fillStyle = V3.ink; ctx.fillText(t, kx + 8, y + 2);
    }
    y += 17;
    // the headline, in the site's own face
    if (tab) setFont(ctx, 17); else if (tech) setFont(ctx, 16); else ctx.font = newsFor(16);
    ctx.textBaseline = 'top';
    for (const ln of wrapText(ctx, a.head, w).slice(0, 2)) { ctx.fillStyle = V3.ink; ctx.fillText(ln, x, y); y += tab ? 20 : 19; }
    y += 3;
    // the AI summary, at the top, as 2026's sites carry one
    {
      setFont(ctx, 10);
      const bl = a.summary.flatMap((l) => wrapText(ctx, '· ' + l, w - 16)).slice(0, 3);
      const bh = 16 + bl.length * 13 + 3;
      roundEdge(ctx, x, y, w, bh, 6, V3.edge, V3.botSoft);
      assistantMark(ctx, x + 6, y + 3, 11, V3.primary, V3.primaryInk);
      setFont(ctx, 10); ctx.fillStyle = V3.botInk; ctx.fillText(SITE.summaryTitle, x + 21, y + 3);
      ctx.font = monoFor(8); ctx.fillStyle = V3.ink2;
      const fw = Math.ceil(ctx.measureText(SITE.summaryFine).width); ctx.fillText(SITE.summaryFine, x + w - fw - 8, y + 4);
      setFont(ctx, 10); ctx.fillStyle = V3.ink;
      bl.forEach((l, k) => ctx.fillText(l, x + 8, y + 16 + k * 13));
      y += bh + 5;
    }
    const floor = foot - 16;
    setFont(ctx, 12); ctx.fillStyle = V3.ink;
    for (const p of a.body) { for (const ln of wrapText(ctx, p, w)) { if (y <= floor - 15) ctx.fillText(ln, x, y); y += 15; } }
    // ⚑ S360 — two readings, side by side, never resolved (CLAUDE.md: render both captions — "nothing in the story settles it")
    //   ⚑ S363 — each label sits on its box's top edge (a legend), so the readings keep every line
    if (a.readings) {
      const gap = 8, bw = Math.floor((w - gap) / 2), by = y + 7, bh = Math.max(40, floor - by - 2);
      a.readings.forEach((r, k) => {
        const bx = x + k * (bw + gap);
        roundEdge(ctx, bx, by, bw, bh, 5, V3.edge, V3.page);
        setFont(ctx, 10);
        const lw = Math.ceil(ctx.measureText(r.label).width) + 8;
        px(ctx, bx + 6, by - 6, lw, 12, V3.card);
        ctx.fillStyle = V3.ink2; ctx.fillText(r.label, bx + 10, by - 6);
        setFont(ctx, 11); ctx.fillStyle = V3.ink;
        let ly = by + 8;
        for (const ln of wrapText(ctx, r.text, bw - 12)) { if (ly + 12 <= by + bh) ctx.fillText(ln, bx + 6, ly); ly += 13; }
      });
    }
    ctx.font = monoFor(9); ctx.fillStyle = V3.ink2;
    ctx.fillText(fitText(ctx, a.source, w), x, foot - 13);
    // ── the rail: the video (or the sponsored box), then "Most read" ──
    let ry = sy + sh + 6;
    if (a.sponsored) {
      const sp = a.sponsored, shh = 116;
      roundEdge(ctx, railX, ry, railW, shh, 8, V3.edge, V3.page);
      ctx.font = monoFor(8); ctx.fillStyle = V3.ink2; ctx.fillText(sp.label, railX + 8, ry + 6);
      assistantMark(ctx, railX + 8, ry + 20, 18, V3.primary, V3.primaryInk);
      setFont(ctx, 11); ctx.fillStyle = V3.ink; ctx.fillText(fitText(ctx, sp.title, railW - 37), railX + 31, ry + 24);
      setFont(ctx, 10); ctx.fillStyle = V3.ink;
      wrapText(ctx, sp.line, railW - 16).slice(0, 3).forEach((ln, k) => ctx.fillText(ln, railX + 8, ry + 45 + k * 13));
      const bw = railW - 16, bx = railX + 8, by = ry + shh - 30;
      pill(ctx, bx, by, bw, 22, V3.primary);
      setFont(ctx, 12); ctx.fillStyle = V3.primaryInk;
      ctx.fillText(sp.button, bx + Math.round((bw - ctx.measureText(sp.button).width) / 2), by + 4);
      this.publish({ x: railX, y: ry, w: railW, h: shh, id: 'sponsor-chat' });
      ry += shh + 8;
    } else if (a.video) {
      const vh = 74, len = 58;
      px(ctx, railX, ry, railW, vh, ERA4.field);
      // a talking head and a chart, in the house style of news video: no face, two shapes, a caption band
      const k = (this.newsT % len) / len;
      roundRect(ctx, railX + 18, ry + 22, 26, 26, 13, ERA4.photoSkin);
      px(ctx, railX + 12, ry + 46, 38, 28, ERA4.panelEdge);
      for (let b = 0; b < 4; b++) px(ctx, railX + 68 + b * 13, ry + 50 - (b * 7 + Math.round(4 * Math.sin(this.newsT * 1.3 + b))), 9, 12 + b * 7, b === 3 ? PLACE.book : ERA4.glow);
      px(ctx, railX, ry + vh - 4, railW, 4, ERA4.rule);
      px(ctx, railX, ry + vh - 4, Math.round(railW * k), 4, PLACE.book);
      setFont(ctx, 8); const ww = Math.ceil(ctx.measureText(SITE.watch).width) + 8;
      px(ctx, railX + 4, ry + 4, ww, 12, PLACE.book); ctx.fillStyle = WEB.card; ctx.fillText(SITE.watch, railX + 8, ry + 6);
      // the muted speaker
      ctx.fillStyle = WEB.card; ctx.fillRect(railX + railW - 18, ry + 8, 3, 5);
      ctx.beginPath(); ctx.moveTo(railX + railW - 15, ry + 8); ctx.lineTo(railX + railW - 11, ry + 5); ctx.lineTo(railX + railW - 11, ry + 16); ctx.lineTo(railX + railW - 15, ry + 13); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.strokeStyle = WEB.card; ctx.lineWidth = 1.2; ctx.beginPath();
      ctx.moveTo(railX + railW - 9, ry + 8); ctx.lineTo(railX + railW - 5, ry + 13); ctx.moveTo(railX + railW - 5, ry + 8); ctx.lineTo(railX + railW - 9, ry + 13); ctx.stroke(); ctx.restore();
      ry += vh + 3;
      setFont(ctx, 10); ctx.fillStyle = V3.ink;
      wrapText(ctx, `${a.video.title} · ${a.video.length}`, railW).slice(0, 2).forEach((ln) => { ctx.fillText(ln, railX, ry); ry += 12; });
      ctx.font = monoFor(8); ctx.fillStyle = V3.ink2; ctx.fillText(SITE.autoplay, railX, ry + 1);
      ry += 16;
    }
    ctx.font = monoFor(9); ctx.fillStyle = V3.ink; ctx.fillText(SITE.mostRead.toUpperCase(), railX, ry);
    px(ctx, railX, ry + 12, railW, 1, tab ? PLACE.book : V3.ink);
    ry += 17;
    a.mostRead.forEach((m, k) => {
      setFont(ctx, 10);
      const ls = wrapText(ctx, m, railW - 18).slice(0, 2);
      if (ry + ls.length * 12 > foot - 4) return;
      ctx.font = newsFor(13); ctx.fillStyle = tab ? PLACE.book : V3.ink2; ctx.fillText(String(k + 1), railX, ry - 1);
      setFont(ctx, 10); ctx.fillStyle = V3.ink;
      ls.forEach((l, j) => ctx.fillText(l, railX + 16, ry + j * 12));
      ry += ls.length * 12 + 7;
    });
    // ── the furniture that covers the rail: the cookie banner (the first site) or the newsletter pop-up (the second) ──
    if (a.extra === 'consent' && !this.consentDone) {
      const ch = 104, cy = foot - ch - 6, cx = railX - 6, cw = railW + 12;
      roundRect(ctx, cx, cy, cw, ch, 8, V3.sheetWash);
      setFont(ctx, 10); ctx.fillStyle = WEB.card;
      wrapText(ctx, SITE.consent.line, cw - 16).slice(0, 4).forEach((l, k) => ctx.fillText(l, cx + 8, cy + 8 + k * 13));
      const bw = cw - 16;
      pill(ctx, cx + 8, cy + ch - 44, bw, 20, WEB.card);
      setFont(ctx, 11); ctx.fillStyle = V3.ink; ctx.fillText(SITE.consent.accept, cx + 8 + Math.round((bw - ctx.measureText(SITE.consent.accept).width) / 2), cy + ch - 40);
      this.publish({ x: cx + 8, y: cy + ch - 44, w: bw, h: 20, id: 'news-consent-accept' });
      setFont(ctx, 9); ctx.fillStyle = V3.grey;
      const mw = Math.ceil(ctx.measureText(SITE.consent.manage).width);
      ctx.fillText(SITE.consent.manage, cx + Math.round((cw - mw) / 2), cy + ch - 17);
      this.publish({ x: cx + 8, y: cy + ch - 20, w: bw, h: 16, id: 'news-consent-manage' });
    }
    if (a.extra === 'newsletter' && !this.newsletterGone && this.newsT >= SITE.newsletter.after) {
      const nh = 98, ny = foot - nh - 8, nx2 = railX - 8, nw = railW + 12;
      roundRect(ctx, nx2 + 2, ny + 3, nw, nh, 8, V3.grey);
      roundEdge(ctx, nx2, ny, nw, nh, 8, V3.edge, V3.card);
      px(ctx, nx2 + 1, ny + 1, nw - 2, 4, PLACE.book);
      setFont(ctx, 12); ctx.fillStyle = V3.ink; ctx.fillText(SITE.newsletter.title, nx2 + 8, ny + 10);
      setFont(ctx, 10); ctx.fillStyle = V3.ink2;
      wrapText(ctx, SITE.newsletter.line, nw - 16).slice(0, 2).forEach((l, k) => ctx.fillText(l, nx2 + 8, ny + 27 + k * 12));
      pill(ctx, nx2 + 8, ny + nh - 40, nw - 16, 20, PLACE.book);
      setFont(ctx, 11); ctx.fillStyle = WEB.card;
      ctx.fillText(SITE.newsletter.sign, nx2 + 8 + Math.round((nw - 16 - ctx.measureText(SITE.newsletter.sign).width) / 2), ny + nh - 36);
      this.publish({ x: nx2 + 8, y: ny + nh - 40, w: nw - 16, h: 20, id: 'news-nl-sign' });
      setFont(ctx, 9); ctx.fillStyle = V3.ink2;
      const no = SITE.newsletter.no, now2 = Math.ceil(ctx.measureText(no).width);
      ctx.fillText(no, nx2 + Math.round((nw - now2) / 2), ny + nh - 15);
      this.publish({ x: nx2 + 8, y: ny + nh - 18, w: nw - 16, h: 16, id: 'news-nl-no' });
    }
    // ── the foot: the sticky ad (it follows her from site to site), and Mum's links back and forth ──
    const buttons: { id: string; label: string; kind: 'primary' | 'quiet' }[] = [];
    if (i > 0) buttons.push({ id: 'news-prev', label: V.news.prev, kind: 'quiet' });
    if (i < this.newsOpened - 1) buttons.push({ id: 'news-next', label: V.news.next, kind: 'quiet' });
    const bx0 = this.bar(ctx, W, H, '', buttons);
    const S = SITE.sticky, adX = 10, adW = Math.min(bx0 - 20, W - 20), adY = foot + 6, adH = BAR_H - 12;
    roundEdge(ctx, adX, adY, adW, adH, 6, V3.edge, V3.card);
    ctx.font = monoFor(8); ctx.fillStyle = V3.ink2; ctx.fillText(S.label, adX + 6, adY + 3);
    assistantMark(ctx, adX + 6, adY + 13, 14, V3.primary, V3.primaryInk);
    setFont(ctx, 11); ctx.fillStyle = V3.ink; ctx.fillText(S.title, adX + 25, adY + 14);
    const tw2 = Math.ceil(ctx.measureText(S.title + '  ').width);
    setFont(ctx, 10);
    const bw2 = Math.ceil(ctx.measureText(S.button).width) + 18;
    ctx.fillStyle = V3.ink2; ctx.fillText(fitText(ctx, S.line, adW - 25 - tw2 - bw2 - 14), adX + 25 + tw2, adY + 15);
    pill(ctx, adX + adW - bw2 - 6, adY + 7, bw2, 18, V3.primary);
    ctx.fillStyle = V3.primaryInk; ctx.fillText(S.button, adX + adW - bw2 + 3, adY + 11);
    this.publish({ x: adX, y: adY, w: adW, h: adH, id: 'sponsor-chat' });
  }

  // ── ⚑ S363 — the mailbox (Larkpost, a 2026 webmail): the folder rail, the thread list, the reading pane ─────────
  /**
   * ⚑ UiB job 14 Part A (N2–N4). It opens on Mum's email, already read. The thread list is her morning, newest first: her
   * reply to Meridian waiting in Drafts (the thread: her forward, its auto-reply, the draft), the clinic, Mum, and two
   * ordinary rows so it reads as a real inbox. The reading pane scrolls (wheel, drag, stick, touch); a Summarise button
   * puts the AI's flat summary above the email — the AI is already in her inbox. Nothing here has to be opened.
   */
  private drawMail(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.pageGround(ctx, W, H);
    const top = PAGE_TOP, foot = H - BAR_H;
    const E = MAIL.emails;
    // the app's own header: its mark, the search, her
    px(ctx, 0, top, W, 30, V3.card); px(ctx, 0, top + 30, W, 1, V3.edge);
    roundRect(ctx, 10, top + 6, 18, 18, 5, V3.primary);
    ctx.save(); ctx.strokeStyle = V3.primaryInk; ctx.lineWidth = 1.5;
    ctx.strokeRect(13.5, top + 10.5, 11, 9);
    ctx.beginPath(); ctx.moveTo(13.5, top + 10.5); ctx.lineTo(19, top + 15.5); ctx.lineTo(24.5, top + 10.5); ctx.stroke(); ctx.restore();
    setFont(ctx, 14); ctx.fillStyle = V3.ink; ctx.fillText(MAIL.brand, 34, top + 8);
    const sx = 130, sw = W - sx - 48;
    roundEdge(ctx, sx, top + 4, sw, 22, 11, V3.edge, V3.page);
    magnifier(ctx, sx + 9, top + 8, V3.ink2);
    setFont(ctx, 11); ctx.fillStyle = V3.ink2; ctx.fillText(MAIL.search, sx + 28, top + 9);
    profileGlyph(ctx, W - 32, top + 6, 18, 'maya');
    const y0 = top + 31;
    // the rail: folders, then labels
    const railW = 92;
    px(ctx, 0, y0, railW, foot - y0, V3.page);
    let fy = y0 + 8;
    for (const f of MAIL.folders) {
      const on = f.id === 'inbox';
      if (on) roundRect(ctx, 4, fy - 4, railW - 8, 22, 11, V3.botSoft);
      folderIcon(ctx, f.id, 9, fy, on ? V3.botInk : V3.ink2);
      setFont(ctx, 11); ctx.fillStyle = on ? V3.botInk : V3.ink; ctx.fillText(f.label, 28, fy + 1);
      if (f.count) { const cw = Math.ceil(ctx.measureText(f.count).width); ctx.fillText(f.count, railW - 12 - cw, fy + 1); }
      fy += 24;
    }
    fy += 4; ctx.font = monoFor(9); ctx.fillStyle = V3.ink2; ctx.fillText('LABELS', 10, fy); fy += 15;
    for (const [k, v] of Object.entries(MAIL.labels)) {
      roundRect(ctx, 11, fy + 2, 9, 9, 2, mailLabelInk(k));
      setFont(ctx, 11); ctx.fillStyle = V3.ink; ctx.fillText(v, 28, fy); fy += 18;
    }
    // the thread list, newest first
    const lx = railW, lw = 178;
    px(ctx, lx, y0, lw, foot - y0, V3.card);
    px(ctx, lx + lw, y0, 1, foot - y0, V3.edge);
    type Row = { id: MailId | null; mark: string; org: boolean; fill: string; from: string; count?: string; subject: string; snippet: string;
      when: string; label?: string; draft?: boolean; unread?: boolean };
    const rows: Row[] = [
      { id: 'meridian', mark: 'MT', org: true, fill: PLACE.plant, from: E.thread.from, count: E.thread.count, subject: ENQ.replySubject,
        snippet: E.thread.snippet, when: E.draft.when.replace(/^saved /, ''), label: E.thread.label, draft: true },
      { id: 'clinic', mark: 'AG', org: true, fill: PLACE.sky, from: E.clinic.from, subject: E.clinic.subject, snippet: E.clinic.lines[1],
        when: E.clinic.when, label: E.clinic.label },
      { id: 'mum', mark: 'M', org: false, fill: KETTLE.avatarMum, from: E.mum.from, subject: E.mum.subject, snippet: E.mum.snippet,
        when: E.mum.when, label: E.mum.label },
      ...MAIL.ordinary.map((o) => ({ id: null, mark: o.from.slice(0, 1), org: !o.promo, fill: o.promo ? V3.grey : PLACE.sun, from: o.from,
        subject: o.subject, snippet: o.snippet, when: o.when, unread: true }))
    ];
    let ry = y0;
    const rh = 44;
    this.mailRowRects = [];
    for (const r of rows) {
      if (ry + rh > foot) break;
      const sel = r.id !== null && this.mailOpen === r.id;
      if (sel) px(ctx, lx, ry, lw, rh, V3.botSoft);
      px(ctx, lx + 6, ry + rh - 1, lw - 12, 1, V3.edge);
      senderMark(ctx, lx + 7, ry + 7, 22, r.mark, r.fill, r.org);
      const tx = lx + 35, tw = lw - 35 - 6;
      ctx.font = monoFor(9); ctx.fillStyle = V3.ink2;
      const ww = Math.ceil(ctx.measureText(r.when).width);
      ctx.fillText(r.when, lx + lw - 6 - ww, ry + 6);
      if (r.unread) roundRect(ctx, lx + 2, ry + 18, 4, 4, 2, V3.primary);
      setFont(ctx, 11); ctx.fillStyle = V3.ink;
      const from = r.from + (r.count ? ` ${r.count}` : '');
      ctx.fillText(fitText(ctx, from, tw - ww - 6), tx, ry + 4);
      let sx2 = tx;
      setFont(ctx, 10);
      if (r.draft) { ctx.fillStyle = V3.danger; ctx.fillText(MAIL.draftTag, sx2, ry + 17); sx2 += Math.ceil(ctx.measureText(MAIL.draftTag + ' ').width); }
      ctx.fillStyle = V3.ink; ctx.fillText(fitText(ctx, r.subject, tw - (sx2 - tx)), sx2, ry + 17);
      // the label, small, at the end of the snippet's line
      let lwid = 0;
      if (r.label) {
        ctx.font = monoFor(8);
        const t = MAIL.labels[r.label] ?? r.label;
        lwid = Math.ceil(ctx.measureText(t).width) + 8;
        pill(ctx, lx + lw - 6 - lwid, ry + 29, lwid, 11, mailLabelInk(r.label));
        ctx.fillStyle = V3.ink; ctx.fillText(t, lx + lw - 6 - lwid + 4, ry + 30);
      }
      setFont(ctx, 10); ctx.fillStyle = V3.ink2;
      ctx.fillText(fitText(ctx, r.snippet, tw - lwid - 6), tx, ry + 29);
      if (r.id) { this.publish({ x: lx, y: ry, w: lw, h: rh, id: `mail-row-${r.id}` }); this.mailRowRects.push({ x: lx, y: ry, w: lw, h: rh, id: r.id }); }
      ry += rh;
    }
    // the reading pane: its header stays; the email under it scrolls
    const rx = lx + lw + 1, rw = W - rx;
    const id = this.mailOpen ?? 'mum';
    if (this.mailOpen) this.mailSeen.add(this.mailOpen);
    px(ctx, rx, y0, rw, foot - y0, V3.card);
    const subject = id === 'mum' ? E.mum.subject : id === 'clinic' ? E.clinic.subject : ENQ.replySubject;
    setFont(ctx, 11);
    const sum = '✦ ' + MAIL.summarise, sumW = Math.ceil(ctx.measureText(sum).width) + 16;
    pill(ctx, rx + rw - sumW - 10, y0 + 7, sumW, 20, this.summed.has(id) ? V3.bot : V3.botSoft);
    ctx.fillStyle = V3.botInk; ctx.fillText(sum, rx + rw - sumW - 2, y0 + 11);
    this.publish({ x: rx + rw - sumW - 10, y: y0 + 7, w: sumW, h: 20, id: 'mail-sum' });
    setFont(ctx, 14); ctx.fillStyle = V3.ink;
    ctx.fillText(fitText(ctx, subject, rw - sumW - 34), rx + 12, y0 + 9);
    const lab = id === 'mum' ? E.mum.label : id === 'clinic' ? E.clinic.label : E.thread.label;
    ctx.font = monoFor(8);
    const lt = MAIL.labels[lab] ?? lab, ltw = Math.ceil(ctx.measureText(lt).width) + 8;
    pill(ctx, rx + 12, y0 + 29, ltw, 11, mailLabelInk(lab)); ctx.fillStyle = V3.ink; ctx.fillText(lt, rx + 16, y0 + 30);
    ctx.fillStyle = V3.ink2; ctx.fillText(MAIL.inbox, rx + 18 + ltw, y0 + 30);
    px(ctx, rx + 8, y0 + 44, rw - 16, 1, V3.edge);
    const P = { x: rx + 12, y: y0 + 48, w: rw - 26, h: foot - (y0 + 48) - 2 };
    this.mailPane = { x: rx, y: y0 + 44, w: rw, h: foot - y0 - 44 };
    const scroll = Math.round(this.mailScroll[id] ?? 0);
    ctx.save(); ctx.beginPath(); ctx.rect(rx, P.y - 2, rw, P.h + 2); ctx.clip();
    const contentH = this.mailBody(ctx, id, P.x, P.y - scroll, P.w, true);
    ctx.restore();
    this.mailMax = Math.max(0, contentH - P.h);
    this.mailScroll[id] = Math.max(0, Math.min(this.mailMax, this.mailScroll[id] ?? 0));
    if (this.mailMax > 0) {
      // the pane's own scroll thumb
      const th = Math.max(16, Math.round(P.h * P.h / contentH)), ty = P.y + Math.round((P.h - th) * (this.mailScroll[id] / this.mailMax));
      roundRect(ctx, rx + rw - 6, ty, 4, th, 2, V3.grey);
    }
    const more = this.mailMax > 0 && this.mailScroll[id] < this.mailMax - 2;
    const buttons: { id: string; label: string; kind: 'primary' | 'quiet' }[] = [];
    if (this.step === 'mumMail') buttons.push({ id: 'mail-read', label: E.mum.read, kind: 'primary' });
    this.bar(ctx, W, H, more ? MAIL.scrollHint + ' ▾' : MAIL.address, buttons);
  }

  /**
   * ⚑ S363 — one email (or the Meridian thread) laid out from (x, y) at width w; returns its height. `live` publishes its
   * links (Mum's three) only where they are fully inside the pane; the AI's screenshots (Part B) draw it again, not live.
   */
  private mailBody(ctx: CanvasRenderingContext2D, id: MailId, x: number, y: number, w: number, live: boolean): number {
    const E = MAIL.emails;
    const y0 = y;
    const text = (t: string, size: number, ink: string, lead: number, mono = false): void => {
      if (mono) ctx.font = monoFor(size); else setFont(ctx, size);
      ctx.fillStyle = ink;
      for (const l of wrapText(ctx, t, w)) { ctx.fillText(l, x, y); y += lead; }
    };
    const sender = (mark: string, fill: string, org: boolean, me: boolean, name: string, sub: string, when: string, subInk: string = V3.ink2): void => {
      if (me) profileGlyph(ctx, x, y, 20, 'maya'); else senderMark(ctx, x, y, 20, mark, fill, org);
      setFont(ctx, 12); ctx.fillStyle = V3.ink; ctx.fillText(name, x + 26, y + 1);
      const nw = Math.ceil(ctx.measureText(name + '  ').width);
      ctx.font = monoFor(9); const ww = Math.ceil(ctx.measureText(when).width);
      ctx.fillStyle = V3.ink2; ctx.fillText(when, x + w - ww, y + 3);
      setFont(ctx, 10); ctx.fillStyle = subInk; ctx.fillText(fitText(ctx, sub, Math.max(20, w - 26 - nw - ww - 6)), x + 26 + nw, y + 3);
      y += 28;
    };
    const rule = (): void => { y += 4; px(ctx, x, y, w, 1, V3.edge); y += 10; };
    // the AI's summary, above the email, when she asked for it
    if (this.summed.has(id)) {
      setFont(ctx, 11);
      const lines = MAIL.summaries[id].flatMap((l) => wrapText(ctx, '· ' + l, w - 20));
      const h = 24 + lines.length * 14 + 16;
      roundEdge(ctx, x, y, w, h, 8, V3.edge, V3.botSoft);
      assistantMark(ctx, x + 8, y + 6, 12, V3.primary, V3.primaryInk);
      setFont(ctx, 10); ctx.fillStyle = V3.botInk; ctx.fillText(MAIL.summaryTitle, x + 24, y + 7);
      setFont(ctx, 11); ctx.fillStyle = V3.ink;
      lines.forEach((l, k) => ctx.fillText(l, x + 10, y + 24 + k * 14));
      ctx.font = monoFor(8); ctx.fillStyle = V3.ink2; ctx.fillText(MAIL.summaryFine, x + 10, y + h - 13);
      y += h + 10;
    }
    if (id === 'mum') {
      const m = E.mum;
      sender('M', KETTLE.avatarMum, false, false, m.from, 'to me', m.when);
      for (const t of [...m.lines, '', ...m.after]) { if (!t) { y += 6; continue; } text(t, 12, V3.ink, 16); }
      y += 8;
      ctx.font = monoFor(9); ctx.fillStyle = V3.ink2; ctx.fillText(m.linksLabel, x, y); y += 14;
      // her links: each opens the News tab at that article (the second carries her note)
      ARTICLES.forEach((a, k) => {
        setFont(ctx, 12);
        const hl = wrapText(ctx, a.head, w - 16).slice(0, 2);
        setFont(ctx, 10);
        const note = a.mumNote ? wrapText(ctx, `Mum: “${a.mumNote}”`, w - 16).slice(0, 2) : [];
        const lh = 17 + hl.length * 15 + note.length * 13 + 4;
        roundEdge(ctx, x, y, w, lh, 6, V3.edge, V3.page);
        px(ctx, x + 1, y + 3, 3, lh - 6, articleInk(a.look));
        ctx.font = monoFor(9); ctx.fillStyle = V3.ink2; ctx.fillText(`${a.mast} · ${a.address.split('/')[0]}`, x + 10, y + 4);
        setFont(ctx, 12); ctx.fillStyle = V3.primary;
        hl.forEach((t, i) => ctx.fillText(t, x + 10, y + 17 + i * 15));
        setFont(ctx, 10); ctx.fillStyle = V3.ink2;
        note.forEach((t, i) => ctx.fillText(t, x + 10, y + 17 + hl.length * 15 + i * 13));
        if (live && y >= this.mailPane.y && y + lh <= this.mailPane.y + this.mailPane.h + 2)
          this.publish({ x, y, w, h: lh, id: `mail-link-${k}` });
        y += lh + 6;
      });
      // the loft photo, attached (his "keep the loft photo")
      y += 4;
      const pS = 1.3;
      ctx.save(); ctx.translate(x, y); ctx.scale(pS, pS); drawLoftPhoto(ctx, 0, 0); ctx.restore();
      ctx.font = monoFor(9); ctx.fillStyle = V3.ink2; ctx.fillText(m.attachment, x + Math.round(78 * pS) + 8, y + Math.round(50 * pS) - 12);
      y += Math.round(50 * pS) + 10;
      // "Mum, I" — her reply, never sent
      roundEdge(ctx, x, y, w, 34, 6, V3.edge, V3.page);
      ctx.font = monoFor(9); ctx.fillStyle = V3.ink2; ctx.fillText(m.replyLabel, x + 8, y + 4);
      setFont(ctx, 13); ctx.fillStyle = V3.ink;
      const caret = Math.floor(this.t / CURSOR_BLINK) % 2 === 0 ? '▏' : '';
      ctx.fillText(m.draft + caret, x + 8, y + 16);
      y += 40;
    } else if (id === 'meridian') {
      const f = E.forward, d = E.draft;
      // 1 · her forward, in her own words (P7-66), the clinic's email folded under it
      sender('M', '', false, true, f.from, f.to, f.when);
      text(f.subject, 12, V3.ink, 17);
      y += 2;
      for (const l of ENQ.message) text(l, 12, V3.ink, 16);
      y += 4;
      ctx.font = monoFor(9);
      const q = wrapText(ctx, '··· ' + f.quoted, w - 16);
      roundEdge(ctx, x, y, w, 10 + q.length * 12, 5, V3.edge, V3.page);
      ctx.fillStyle = V3.ink2; q.forEach((l, k) => ctx.fillText(l, x + 8, y + 5 + k * 12));
      y += 10 + q.length * 12 + 4;
      rule();
      // 2 · the auto-reply
      sender('MT', PLACE.plant, true, false, ENQ.replyFrom.split(' · ')[0], 'auto-reply', E.meridian.when);
      for (const l of ENQ.reply) text(l, 12, V3.ink, 16);
      y += 4;
      text(ENQ.directory, 11, V3.ink2, 15);
      rule();
      // 3 · her reply to it: typed, saved, never sent
      sender('M', '', false, true, f.from, MAIL.draftTag, d.when, V3.danger);
      text(d.subject, 12, V3.ink, 17);
      y += 2;
      for (const l of d.lines) text(l, 12, V3.ink, 16);
      y += 4;
      text(d.status, 10, V3.danger, 14, true);
      y += 4;
    } else {
      const c = E.clinic;
      sender('AG', PLACE.sky, true, false, c.from, 'to me', c.when);
      for (const l of c.lines) text(l, 12, V3.ink, 16);
      // ⚑ H48 — the number, on its own designed card (a deli-counter ticket with its torn edge)
      const tw = Math.min(240, w), th = 92, tx = x, ty = y + 8;
      roundRect(ctx, tx, ty, tw, th, 5, V3.ticketEdge);
      roundRect(ctx, tx + 2, ty + 2, tw - 4, th - 4, 4, V3.ticket);
      for (let k = 0; k < Math.floor((tw - 20) / 22); k++) px(ctx, tx + 10 + k * 22, ty + 2, 8, 3, V3.ticketEdge);
      setFont(ctx, 12); ctx.fillStyle = V3.ink; ctx.fillText(c.cardLabel.toUpperCase(), tx + 14, ty + 13);
      setFont(ctx, 38); ctx.fillText(this.clinicNumber.toLocaleString('en-GB'), tx + 12, ty + 29);
      ctx.font = monoFor(9); ctx.fillStyle = this.clinicMoved ? V3.danger : V3.ink2;
      ctx.fillText(fitText(ctx, this.clinicMoved ? CL.moved : c.cardNote, tw - 28), tx + 14, ty + 74);
      y = ty + th + 8;
    }
    return y - y0;
  }

  // ── the clinic: the number ───────────────────────────────────────────────
  private drawClinic(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.pageGround(ctx, W, H);
    const cx = 24, cw = W - 48, cy = PAGE_TOP + 8, ch = H - BAR_H - PAGE_TOP - 16;
    roundEdge(ctx, cx, cy, cw, ch, 6, V3.edge, V3.card);
    ctx.font = monoFor(12); ctx.fillStyle = V3.ink2; ctx.fillText(CL.portal, cx + 20, cy + 12);
    // the ticket: a deli-counter number, bigger every time she is sent back
    const tx = cx + 20, ty = cy + 32, tw = 214, th = 106;
    roundRect(ctx, tx, ty, tw, th, 4, V3.ticketEdge);
    roundRect(ctx, tx + 2, ty + 2, tw - 4, th - 4, 3, V3.ticket);
    for (let k = 0; k < 9; k++) px(ctx, tx + 10 + k * 22, ty + 2, 8, 3, V3.ticketEdge);   // the torn edge
    setFont(ctx, 14); ctx.fillStyle = V3.ink; ctx.fillText(CL.numberLabel, tx + 16, ty + 18);
    setFont(ctx, 44); ctx.fillText(this.clinicNumber.toLocaleString('en-GB'), tx + 14, ty + 38);
    if (this.clinicMoved) { setFont(ctx, 12); ctx.fillStyle = V3.danger; ctx.fillText(CL.moved, tx + 16, ty + 86); }
    const rx = tx + tw + 24, rw = cx + cw - 20 - rx;
    setFont(ctx, 17); ctx.fillStyle = V3.ink;
    let y = ty + 4;
    for (const ln of wrapText(ctx, CL.status, rw)) { ctx.fillText(ln, rx, y); y += 22; }
    setFont(ctx, 15);
    for (const ln of wrapText(ctx, CL.wait, rw)) { ctx.fillText(ln, rx, y + 6); y += 20; }
    setFont(ctx, 13); ctx.fillStyle = V3.ink2;
    for (const ln of wrapText(ctx, CL.joins, rw)) { ctx.fillText(ln, rx, y + 14); y += 18; }
    // the letter: one sentence, two readings, never resolved
    // ⚑ S328 — in the browser's window (556 logical px) the right column runs longer than the ticket: the letter starts
    //   below whichever is lower, and its title line gives way when there is no room for it (the two readings never do)
    const lw = cw - 40, low = Math.max(ty + th + 10, y + 18), titled = low <= ty + th + 10;
    const ly = titled ? low : low - 18;
    if (titled) { setFont(ctx, 13); ctx.fillStyle = V3.ink2; ctx.fillText(CL.letterTitle, tx, ly); }
    setFont(ctx, 17); ctx.fillStyle = V3.ink; ctx.fillText(CL.letter, tx, ly + 18);
    const bw = Math.floor((lw - 12) / 2);
    CL.readings.forEach((r, k) => {
      const bx = tx + k * (bw + 12), by = ly + 42;
      roundEdge(ctx, bx, by, bw, cy + ch - 6 - by, 5, V3.edge, V3.page);
      setFont(ctx, 12); ctx.fillStyle = V3.ink2; ctx.fillText(r.label, bx + 10, by + 5);
      setFont(ctx, 14); ctx.fillStyle = V3.ink;
      wrapText(ctx, r.text, bw - 20).slice(0, 3).forEach((ln, i) => ctx.fillText(ln, bx + 10, by + 21 + i * 17));
    });
    const buttons: { id: string; label: string; kind: 'primary' | 'quiet' }[] = this.step === 'clinic' ? [{ id: 'clinic-support', label: CL.support, kind: 'primary' }] : [];
    this.bar(ctx, W, H, CL.source, buttons, true);
  }

  /** ⚑ V4 as built — her enquiry to Meridian, its auto-reply, and the loop's receipt (the clinic referred her) */
  private drawEnquiry(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.pageTargets = this.pageTargets.filter((h) => h.id === 'start-menu' || h.id.startsWith('lg-') || h.id.startsWith('sm-'));
    ctx.save(); ctx.globalAlpha = 0.55; px(ctx, 0, PAGE_TOP, W, H - PAGE_TOP, V3.sheetWash); ctx.restore();
    const cw = W - 120, cx = 60, cy = PAGE_TOP + 6, ch = H - BAR_H - PAGE_TOP - 12, inner = cw - 40;
    roundEdge(ctx, cx, cy, cw, ch, 8, V3.edge, V3.card);
    let y = cy + 12;
    const line = (t: string, size: number, ink: string, gap: number, mono = false): void => {
      if (mono) ctx.font = monoFor(size); else setFont(ctx, size);
      ctx.fillStyle = ink;
      for (const l of wrapText(ctx, t, inner)) { ctx.fillText(l, cx + 20, y); y += gap; }
    };
    const replied = this.enquiry === 'replied';
    if (!replied) {
      line(this.enquiry === 'draft' ? ENQ.draftLabel : ENQ.sent, 11, V3.ink2, 15, true);
      line(ENQ.to, 12, V3.ink2, 18);
      line(ENQ.subject, 16, V3.ink, 24);
      for (const m of ENQ.message) line(m, 14, V3.ink, 19);
      this.bar(ctx, W, H, ENQ.to, this.enquiry === 'draft' ? [{ id: 'enq-send', label: ENQ.send, kind: 'primary' }] : []);
      return;
    }
    line(ENQ.replyFrom, 11, V3.ink2, 15, true);
    line(ENQ.replySubject, 16, V3.ink, 22);
    for (const m of ENQ.reply) line(m, 13, V3.ink, 17);
    y += 4;
    line(ENQ.directory, 12, V3.ink2, 16);
    line(CL.referred, 12, V3.ink, 16);
    this.bar(ctx, W, H, ENQ.replyFrom, [{ id: 'enq-close', label: ENQ.close, kind: 'primary' }]);
  }

  // ── the bot: Second Thoughts ──────────────────────────────────────────────
  /**
   * ⚑ S363 / UiB job 14 Part A (N7: "similar to a ChatGPT style of conversational AI… We cannot even see the responses of
   * Maya"; "the point of weaponised care"). One conversation column between a slim rail and nothing: the assistant
   * speaks as plain text beside its mark; HER words are her own warm bubbles on the right; what it shows her (the clip,
   * her circle, her picture, a story) are cards inside the conversation; "Memory updated" each time it files something
   * about her, with the sentence it saved. At the foot, the suggested replies above the composer. The composer takes no
   * typing (R28): a press on it points to the suggestions. "Your week, so far" is gone.
   */
  private drawBot(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.pageGround(ctx, W, H);
    if (this.clipTakeover) {
      // the clip, as big as the page allows, the stamp always in its corner; then it goes into the conversation as a card
      const top = PAGE_TOP + 22, avail = H - BAR_H - 8 - top;
      const ch = avail, cw = Math.min(W - 32, Math.round(ch * 16 / 9));
      const cx = Math.round((W - cw) / 2);
      setFont(ctx, 13); ctx.fillStyle = V3.ink;
      ctx.fillText(V.clip.title, cx, PAGE_TOP + 4);
      const tw = Math.ceil(ctx.measureText(V.clip.title + '   ').width);
      ctx.font = monoFor(11); ctx.fillStyle = V3.ink2;
      ctx.fillText(`${V.clip.channel} · ${V.clip.recommended}`, cx + tw, PAGE_TOP + 6);
      drawContagionClip(ctx, this.botT + CLIP_TAKEOVER_SECONDS, cx, top, cw, ch);
      this.bar(ctx, W, H, BOT.mark + ' · ' + V.clip.channel, []);
      return;
    }
    const top = PAGE_TOP;
    px(ctx, 0, top, W, H - top, V3.card);
    // the slim rail: its mark, a new chat, the search, and her (whoever it says she is)
    const railW = 40;
    px(ctx, 0, top, railW, H - top, V3.page); px(ctx, railW, top, 1, H - top, V3.edge);
    assistantMark(ctx, 9, top + 8, 22, V3.primary, V3.primaryInk);
    newChatIcon(ctx, 13, top + 46, V3.ink2);
    magnifier(ctx, 13, top + 72, V3.ink2);
    if (this.profile === 'goal') drawGoalPicture(ctx, 10, H - 32, 20, 20, { caption: false }); else profileGlyph(ctx, 10, H - 32, 20, 'maya');
    // the header: its name (a picker's chevron), and the memory it keeps
    setFont(ctx, 14); ctx.fillStyle = V3.ink; ctx.fillText(BOT.mark, railW + 14, top + 6);
    const mw = Math.ceil(ctx.measureText(BOT.mark).width);
    chevron(ctx, railW + 20 + mw, top + 11, V3.ink2);
    setFont(ctx, 10);
    const mem = '✦ ' + BOT.memoryUpdated.split(' ')[0] + ' on', memW = Math.ceil(ctx.measureText(mem).width) + 14;
    pill(ctx, W - 12 - memW, top + 6, memW, 18, V3.botSoft);
    ctx.fillStyle = V3.botInk; ctx.fillText(mem, W - 12 - memW + 7, top + 9);
    // the composer, and the line under it
    const colW = Math.min(440, W - railW - 36), colX = railW + Math.round((W - railW - colW) / 2);
    // ⚑ S366 / J15-01 (his: "shouldn't it have the bubbles of the reply there? just try to combine both so we can have more
    //   vertical space") — her suggested replies sit INSIDE the message box, between the ＋ and the send button, in place
    //   of the placeholder; the row that sat above it is gone and the conversation has its height. Replies too wide for
    //   one line take a second line (the field grows upward) rather than cutting a label.
    const b = this.bot;
    const ready = !!b && this.botBeatReady && !this.botDone.has(b.id);
    const sugg: { id: string; label: string; primary: boolean }[] = [];
    if (ready && b!.chips) b!.chips.forEach((c, k) => sugg.push({ id: `conv-chip-${k}`, label: c.label, primary: k === 0 }));
    else if (ready && b!.button) sugg.push({ id: 'conv-act', label: b!.button, primary: true });
    const CHIP_H = 22, CHIP_GAP = 6, inX = colX + 34, inW = colW - 68;
    setFont(ctx, 13);
    const chipRows: { id: string; label: string; primary: boolean; w: number }[][] = [[]];
    let rowW = 0;
    for (const c of sugg) {
      const w = Math.min(inW, Math.ceil(ctx.measureText(c.label).width) + 22);
      if (chipRows[chipRows.length - 1].length && rowW + CHIP_GAP + w > inW) { chipRows.push([]); rowW = 0; }
      chipRows[chipRows.length - 1].push({ ...c, w });
      rowW += (rowW ? CHIP_GAP : 0) + w;
    }
    const compH = 30 + (sugg.length ? chipRows.length - 1 : 0) * (CHIP_H + 4), compY = H - 17 - compH;
    roundEdge(ctx, colX, compY, colW, compH, 15, V3.edge, V3.page);
    plusGlyph(ctx, colX + 13, compY + compH - 21, V3.ink2);
    roundRect(ctx, colX + colW - 28, compY + compH - 26, 22, 22, 11, V3.grey);
    sendGlyph(ctx, colX + colW - 23, compY + compH - 21, V3.card);
    if (!sugg.length) { setFont(ctx, 13); ctx.fillStyle = V3.ink2; ctx.fillText(BOT.composer, inX, compY + 7); }
    // the replies are published BEFORE the box (a press resolves to the first rect it falls in)
    chipRows.forEach((row, r) => {
      let sx = inX;
      const sy = compY + 4 + r * (CHIP_H + 4);
      for (const c of row) {
        setFont(ctx, 13);
        if (c.primary) pill(ctx, sx, sy, c.w, CHIP_H, V3.primary);
        else { pill(ctx, sx, sy, c.w, CHIP_H, V3.edge); pill(ctx, sx + 1, sy + 1, c.w - 2, CHIP_H - 2, V3.card); }
        ctx.fillStyle = c.primary ? V3.primaryInk : V3.ink; ctx.fillText(fitText(ctx, c.label, c.w - 20), sx + 11, sy + 4);
        if (this.composeFlashT > 0) this.ringAround(ctx, { x: sx, y: sy, w: c.w, h: CHIP_H, id: c.id });
        this.publish({ x: sx, y: sy, w: c.w, h: CHIP_H, id: c.id });
        sx += c.w + CHIP_GAP;
      }
    });
    if (this.step === 'bot' || this.step === 'confirm') this.publish({ x: colX, y: compY, w: colW, h: compH, id: 'conv-compose' });
    const foot = this.nowLine ?? (this.waitNow ? PROGRAM.console.wait : BOT.footer);
    setFont(ctx, 9); ctx.fillStyle = V3.ink2;
    const fl = fitText(ctx, foot, W - railW - 24);
    ctx.fillText(fl, railW + Math.round((W - railW - ctx.measureText(fl).width) / 2), H - 14);
    const convBottom = compY - 8;
    this.drawConversation(ctx, colX, top + 30, colW, convBottom);
    this.drawLightbox(ctx, W, H);
  }

  /** ⚑ S363 — a beat's rows as she sees them: its lines so far, and its card where it belongs (BEAT_CARD) */
  private beatRows(b: BotBeat, shown: number): Said[] {
    const out: Said[] = [];
    const lines = this.botLines(b);
    const c = BEAT_CARD[b.id];
    if (c && c[1] < 0) out.push({ who: 'card', text: '', card: c[0], ring: this.ring });
    for (let k = 0; k < Math.min(shown, lines.length); k++) {
      out.push({ who: 'bot', text: lines[k] });
      if (c && c[1] === k) out.push({ who: 'card', text: '', card: c[0], ring: this.ring });
    }
    return out;
  }

  private drawConversation(ctx: CanvasRenderingContext2D, x: number, top: number, w: number, bottom: number): void {
    const b = this.bot;
    type Row = Said | { who: 'dots'; text: string };
    const rows: Row[] = [...this.botSaid];
    if (b && !this.botDone.has(b.id) && this.step !== 'ready' && this.step !== 'photos') {
      rows.push(...this.beatRows(b, this.botLinesShown));
      if (this.botLinesShown < b.lines.length) rows.push({ who: 'dots', text: '' });
    }
    const tx = x + 26, tw = w - 26;
    const cardH: Record<CardKind, number> = { clip: 112, map: MAP_CARD_H + 2, goal: 120, stories: 60, ring: 72, shots: 74, pages: 86, session: 66 };
    const sized = rows.map((r) => {
      if (r.who === 'dots') return { r, lines: [] as string[], h: 26 };
      if (r.who === 'card') return { r, lines: [] as string[], h: cardH[(r as Said).card ?? 'ring'] + 6 };
      if (r.who === 'memory') { setFont(ctx, 10); return { r, lines: [fitText(ctx, `“${r.text}”`, tw)], h: 30 }; }
      setFont(ctx, 14);
      if (r.who === 'her') { const lines = wrapText(ctx, r.text, Math.round(w * 0.7) - 24).slice(0, 4); return { r, lines, h: lines.length * 18 + 12 + 8 }; }
      const lines = wrapText(ctx, r.text, tw).slice(0, 5);
      return { r, lines, h: lines.length * 18 + 6 };
    });
    let y = bottom;
    const placed: { s: typeof sized[number]; y: number }[] = [];
    // ⚑ S364 — the newest answer is read from its first line: if it does not fit with the rows before it, it is laid out
    //   from the top (as a 2026 assistant stops scrolling at the start of a long answer); otherwise the latest sits at the foot
    const anchor = Math.min(this.anchorAt, sized.length);
    const tail = sized.slice(anchor).reduce((n, q) => n + q.h, 0);
    if (tail > bottom - top) {
      let yy = top;
      for (const q of sized.slice(anchor)) { if (yy + q.h > bottom + 12) break; placed.push({ s: q, y: yy }); yy += q.h; }
    } else for (let i = sized.length - 1; i >= 0; i--) {
      if (y - sized[i].h < top) break;
      y -= sized[i].h;
      placed.unshift({ s: sized[i], y });
    }
    ctx.save(); ctx.beginPath(); ctx.rect(x - 4, top, w + 8, bottom - top); ctx.clip();
    // the bot's mark sits once at the head of each run of its words (the idiom)
    let prev: string | null = null;
    for (const { s, y: ry } of placed) {
      const who = s.r.who;
      if (who === 'dots') {
        assistantMark(ctx, x, ry, 18, V3.primary, V3.primaryInk);
        const d = Math.floor(this.botT / 0.3) % 3;
        for (let k = 0; k < 3; k++) roundRect(ctx, tx + 4 + k * 10, ry + 6, 6, 6, 3, k === d ? V3.ink : V3.grey);
        prev = 'bot'; continue;
      }
      if (who === 'her') {
        setFont(ctx, 14);
        const bw = Math.max(...s.lines.map((l) => Math.ceil(ctx.measureText(l).width))) + 24, bh = s.h - 8;
        const bx = x + w - bw;
        roundRect(ctx, bx, ry, bw, bh, Math.min(16, Math.floor(bh / 2)), KETTLE_MINE);
        ctx.fillStyle = V3.ink;
        s.lines.forEach((l, k) => ctx.fillText(l, bx + 12, ry + 6 + k * 18));
        prev = 'her'; continue;
      }
      if (who === 'memory') {
        // ⚑ "Memory updated" — what it filed about her, in its kind, flat voice
        assistantMark(ctx, tx, ry + 2, 11, V3.bot, V3.botInk);
        setFont(ctx, 10); ctx.fillStyle = V3.botInk; ctx.fillText(BOT.memoryUpdated, tx + 15, ry + 2);
        ctx.fillStyle = V3.ink2; ctx.fillText(s.lines[0], tx, ry + 16);
        prev = 'memory'; continue;
      }
      if (prev !== 'bot') assistantMark(ctx, x, ry, 18, V3.primary, V3.primaryInk);
      if (who === 'card') this.drawCard(ctx, (s.r as Said).card ?? 'ring', tx, ry, Math.min(tw, 320), (s.r as Said).ring ?? this.ring);
      else { setFont(ctx, 14); ctx.fillStyle = V3.ink; s.lines.forEach((l, k) => ctx.fillText(l, tx, ry + 1 + k * 18)); }
      prev = 'bot';
    }
    ctx.restore();
  }

  /** ⚑ S363 — what the bot shows her, inside the conversation (it was a side panel) */
  private drawCard(ctx: CanvasRenderingContext2D, kind: CardKind, x: number, y: number, w: number, ring: number): void {
    if (kind === 'clip') {
      const cw = 176, ch = 99;
      drawContagionClip(ctx, CLIP_POSTER_SECONDS, x, y, cw, ch);   // S370: its last card, not the end slate
      roundRect(ctx, x + cw / 2 - 16, y + ch / 2 - 16, 32, 32, 16, V3.card);
      ctx.fillStyle = V3.ink; ctx.beginPath(); ctx.moveTo(x + cw / 2 - 5, y + ch / 2 - 8); ctx.lineTo(x + cw / 2 + 8, y + ch / 2); ctx.lineTo(x + cw / 2 - 5, y + ch / 2 + 8); ctx.closePath(); ctx.fill();
      ctx.font = monoFor(9); ctx.fillStyle = V3.ink2;
      ctx.fillText(fitText(ctx, `${V.clip.title} · ${BOT.cards.clip} · ${V.clip.length}`, w), x, y + ch + 4);
      return;
    }
    if (kind === 'map') { this.drawMap(ctx, x, y, w, MAP_CARD_H); return; }
    if (kind === 'goal') {
      // ⚑ S364 / N9 — "I've made it your picture": the swap filter runs on her own photo, before → after, in the chat
      const live = this.bot?.id === 'heading' && !this.botDone.has('heading');
      const k = live ? Math.min(1, Math.max(0, (this.botT - BOT.lineSeconds) / 2.6)) : 1;
      drawSwapFilter(ctx, x, y, 88, 118, k, this.t, { chrome: true });
      this.drawRing(ctx, x + 100, y + 14, 70, ring);
      setFont(ctx, 10); ctx.fillStyle = V3.botInk;
      ctx.fillText(BOT.heading.stamp, x + 100, y + 90);
      return;
    }
    if (kind === 'ring') {
      this.drawRing(ctx, x, y, 70, ring);   // S367: its word is inside the ring (it was printed twice)
      return;
    }
    if (kind === 'shots') {
      // ⚑ S364 / N3 — "I read your mail": images of her own mail and messages, whether or not she opened them
      ctx.font = monoFor(9); ctx.fillStyle = V3.ink2; ctx.fillText(BOT.shots.label, x, y);
      const tw = Math.floor((w - 12) / 3), th = 60;
      for (let k = 0; k < 3; k++) {
        const sx = x + k * (tw + 6), sy = y + 14;
        this.drawShot(ctx, k, sx, sy, tw, th);
        this.publish({ x: sx, y: sy, w: tw, h: th, id: `card-shot-${k}` });
      }
      return;
    }
    if (kind === 'pages') {
      // ⚑ S364 / N9 — the pages it shares: made up, and marked so
      ctx.font = monoFor(9); ctx.fillStyle = V3.ink2; ctx.fillText(BOT.pages.tap, x, y);
      const tw = Math.floor((w - 12) / 3), th = 72;
      BOT.pages.items.forEach((it, k) => {
        const sx = x + k * (tw + 6), sy = y + 14;
        this.drawWebPage(ctx, it, sx, sy, tw, th);
        this.publish({ x: sx, y: sy, w: tw, h: th, id: `card-page-${k}` });
      });
      return;
    }
    if (kind === 'session') {
      // ⚑ S364 — the live session it books: where "exploring" leads (the headset's host)
      const S = BOT.session, h = 64;
      roundEdge(ctx, x, y, w, h, 10, V3.edge, V3.page);
      roundRect(ctx, x + 10, y + 9, 7, 7, 4, V3.danger);
      ctx.font = monoFor(9); ctx.fillStyle = V3.danger; ctx.fillText(S.live, x + 22, y + 8);
      setFont(ctx, 14); ctx.fillStyle = V3.ink; ctx.fillText(fitText(ctx, S.title, w - 100), x + 10, y + 22);
      setFont(ctx, 11); ctx.fillStyle = V3.ink2; ctx.fillText(S.line, x + 10, y + 38);
      ctx.font = monoFor(8); ctx.fillStyle = V3.ink2; ctx.fillText(fitText(ctx, S.fine, w - 20), x + 10, y + 52);
      if (this.sessionBooked) {
        setFont(ctx, 11); const bw = Math.ceil(ctx.measureText(S.booked).width) + 16;
        pill(ctx, x + w - bw - 10, y + 22, bw, 20, V3.botSoft); ctx.fillStyle = V3.botInk; ctx.fillText(S.booked, x + w - bw - 2, y + 26);
      }
      return;
    }
    // a story it curated (S350; S364 shows its stories as pages instead)
    const S = BOT.stories, c = S.cards[0];
    roundEdge(ctx, x, y, w, 56, 12, V3.edge, V3.page);
    roundRect(ctx, x + 12, y + 9, 14, 14, 7, V3.grey);   // faceless: a plain disc, no initial, no likeness
    setFont(ctx, 11); ctx.fillStyle = V3.ink2; ctx.fillText(`${c.name} · ${S.stamp}`, x + 32, y + 9);
    setFont(ctx, 14); ctx.fillStyle = V3.ink; ctx.fillText(fitText(ctx, `“${c.line}”`, w - 24), x + 12, y + 30);
  }

  /** ⚑ S364 — one screenshot it took: the clinic's email, Meridian's no (Larkpost, as she would see it), Dad's line (Kettle) */
  private drawShot(ctx: CanvasRenderingContext2D, k: number, x: number, y: number, w: number, h: number): void {
    const LW = 300, LH = 200, s = Math.min(w / LW, h / LH);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    roundEdge(ctx, x, y, w, h, 4, V3.edge, V3.card);
    ctx.translate(x, y); ctx.scale(s, s);
    if (k < 2) {
      px(ctx, 0, 0, LW, 20, V3.card); px(ctx, 0, 20, LW, 1, V3.edge);
      roundRect(ctx, 6, 4, 12, 12, 3, V3.primary);
      setFont(ctx, 11); ctx.fillStyle = V3.ink; ctx.fillText(MAIL.brand, 22, 4);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 21, LW, LH - 21); ctx.clip();
      const id: MailId = k === 0 ? 'clinic' : 'meridian';
      const had = this.summed.has(id); if (had) this.summed.delete(id);   // the email itself, not the AI's summary of it
      this.mailBody(ctx, id, 10, k === 0 ? 28 : -150, LW - 20, false);
      if (had) this.summed.add(id);
      ctx.restore();
    } else {
      const S = BOT.shots, D = V.messenger.dad.before;
      px(ctx, 0, 0, LW, LH, KETTLE.ground);
      px(ctx, 0, 0, LW, 26, KETTLE.head);
      setFont(ctx, 13); ctx.fillStyle = KETTLE.headInk; ctx.fillText(`${V.messenger.app} · ${S.dad}`, 10, 6);
      ctx.font = monoFor(10);
      const sw = Math.ceil(ctx.measureText(S.dadWhen).width) + 14;
      pill(ctx, Math.round((LW - sw) / 2), 36, sw, 16, KETTLE.row); ctx.fillStyle = KETTLE.sub; ctx.fillText(S.dadWhen, Math.round((LW - sw) / 2) + 7, 39);
      let by = 62;
      for (const m of D) {
        setFont(ctx, 14);
        const ls = wrapText(ctx, m.text, LW - 60), bw = Math.max(...ls.map((l) => Math.ceil(ctx.measureText(l).width))) + 20, bh = ls.length * 18 + 10;
        roundRect(ctx, 10, by, bw, bh, 12, KETTLE.theirs);
        ctx.fillStyle = KETTLE.ink; ls.forEach((l, j) => ctx.fillText(l, 20, by + 5 + j * 18));
        by += bh + 8;
      }
    }
    ctx.restore();
    // its stamp: a screenshot it took
    ctx.font = monoFor(8);
    const st = BOT.agent.shot, stw = Math.ceil(ctx.measureText(st).width) + 8;
    px(ctx, x + w - stw - 3, y + h - 13, stw, 11, V3.ink); ctx.fillStyle = V3.card; ctx.fillText(st, x + w - stw + 1, y + h - 12);
  }
  /** ⚑ S364 / N9 — a web page it shares: an address, the site's own band, a headline, its made-up claims, "Made with AI" */
  private drawWebPage(ctx: CanvasRenderingContext2D, it: WebPage, x: number, y: number, w: number, h: number): void {
    const LW = 240, LH = 176, s = Math.min(w / LW, h / LH);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    roundEdge(ctx, x, y, w, h, 5, V3.edge, V3.card);
    ctx.translate(x, y); ctx.scale(s, s);
    px(ctx, 0, 0, LW, 16, CHROME.toolbar);
    ctx.font = monoFor(8); ctx.fillStyle = V3.ink2; ctx.fillText(fitText(ctx, it.url, LW - 12), 6, 4);
    const band = it.id === 'jordan' ? PLACE.textileHi : it.id === 'study' ? V3.primary : V3.botSoft;
    px(ctx, 0, 16, LW, 22, band);
    setFont(ctx, 11); ctx.fillStyle = it.id === 'study' ? V3.primaryInk : V3.ink; ctx.fillText(it.site, 8, 21);
    let yy = 46;
    setFont(ctx, 15); ctx.fillStyle = V3.ink;
    for (const l of wrapText(ctx, it.head, LW - 16).slice(0, 3)) { ctx.fillText(l, 8, yy); yy += 18; }
    yy += 4;
    setFont(ctx, 11); ctx.fillStyle = V3.ink2;
    for (const l of it.lines) for (const ll of wrapText(ctx, l, LW - 16)) { if (yy < LH - 26) ctx.fillText(ll, 8, yy); yy += 14; }
    setFont(ctx, 10);
    const st = BOT.pages.stamp, sw = Math.ceil(ctx.measureText(st).width) + 12;
    px(ctx, LW - sw - 6, LH - 20, sw, 15, CLIP.stamp); ctx.fillStyle = CLIP.stampInk; ctx.fillText(st, LW - sw, LH - 18);
    ctx.restore();
  }
  /** ⚑ S364 — the screenshot or page she tapped, larger; any press closes it */
  private drawLightbox(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const id = this.lightbox;
    if (!id) return;
    ctx.save(); ctx.globalAlpha = 0.6; px(ctx, 0, PAGE_TOP, W, H - PAGE_TOP, V3.sheetWash); ctx.restore();
    const shot = id.startsWith('shot-'), k = Number(id.split('-')[1]);
    const LW = shot ? 300 : 240, LH = shot ? 200 : 176;
    const s = Math.min((W - 80) / LW, (H - PAGE_TOP - 56) / LH);
    const w = Math.round(LW * s), h = Math.round(LH * s), x = Math.round((W - w) / 2), y = PAGE_TOP + 14;
    if (shot) this.drawShot(ctx, k, x, y, w, h); else this.drawWebPage(ctx, BOT.pages.items[k], x, y, w, h);
    setFont(ctx, 13);
    const c = '✕  ' + BOT.pages.close, cw = Math.ceil(ctx.measureText(c).width) + 24;
    pill(ctx, Math.round((W - cw) / 2), y + h + 8, cw, 26, V3.card);
    ctx.fillStyle = V3.ink; ctx.fillText(c, Math.round((W - cw) / 2) + 12, y + h + 14);
    this.pageTargets = this.pageTargets.filter((t) => t.id === 'start-menu' || t.id.startsWith('lg-') || t.id.startsWith('sm-'));
    this.publish({ x: 0, y: PAGE_TOP, w: W, h: H - PAGE_TOP, id: 'lightbox-close' });
  }
  /** the "Becoming" ring: it never passes 99 % — and it falls when she unmutes Junie */
  private drawRing(ctx: CanvasRenderingContext2D, x: number, y: number, d: number, value = this.ring): void {
    const cx = x + d / 2, cy = y + d / 2, r = d / 2 - 6;
    ctx.save();
    ctx.lineWidth = 10;
    ctx.strokeStyle = V3.grey;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = value < 90 ? V3.danger : V3.bot;
    ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (Math.min(99, value) / 100)); ctx.stroke();
    ctx.restore();
    setFont(ctx, 18); ctx.fillStyle = V3.ink;
    const s = `${Math.min(99, value)}%`;
    const tw = Math.ceil(ctx.measureText(s).width);
    ctx.fillText(s, Math.round(cx - tw / 2), Math.round(cy - 14));
    setFont(ctx, 10); ctx.fillStyle = V3.ink2;
    const lw = Math.ceil(ctx.measureText(BOT.heading.ring).width);
    ctx.fillText(BOT.heading.ring, Math.round(cx - lw / 2), Math.round(cy + 6));
  }

  /** her contacts as a network: exposure sources in red; Junie turns warm when she unmutes her */
  private drawMap(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    roundEdge(ctx, x, y, w, h, 6, V3.edge, V3.card);
    const R = BOT.map;
    // ⚑ S366 / J15-05 (his: "the text is going outside the window of the image… make it a bit taller") — a header row
    //   (the card's name, and its count of "exposure sources") over the graph, the graph in the band under it, and each
    //   label placed on whichever side of its node keeps it inside the card
    setFont(ctx, 11); ctx.fillStyle = V3.ink; ctx.fillText(R.title, x + 10, y + 7);
    setFont(ctx, 11); ctx.fillStyle = V3.danger;
    const ew = Math.ceil(ctx.measureText(R.exposure).width);
    ctx.fillText(R.exposure, x + w - ew - 10, y + 7);
    const gy0 = y + 32, gy1 = y + h - 22;   // the nodes' band: the lowest node keeps room for its tag under it
    const cx = x + Math.round(w * 0.40);
    const pos: Record<string, [number, number]> = {
      mum: [-0.30, -0.30], dad: [-0.36, 0.20], sam: [-0.20, 0.38], junie: [0.10, -0.32], house: [0.26, 0.22], line: [0.02, 0.40], bot: [0.19, -0.06]
    };   // S366: its own node a little in from the edge, so "Second Thoughts" fits to its right
    const vy = (p: number): number => Math.round(gy0 + (p + 0.32) / 0.72 * (gy1 - gy0));
    const cy = vy(0);
    const nodeAt = (id: string): [number, number] => { const p = pos[id] ?? [0, 0]; return [Math.round(cx + p[0] * w), vy(p[1])]; };
    // the edges first
    for (const n of R.nodes) {
      const [nx, ny] = nodeAt(n.id);
      ctx.save();
      ctx.strokeStyle = n.kind === 'exposure' && !(n.id === 'junie' && this.junieWarm) ? V3.danger : V3.grey;
      ctx.lineWidth = n.kind === 'bot' ? 3 : 1;
      if (n.kind === 'left') ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(cx + 0.5, cy + 0.5); ctx.lineTo(nx + 0.5, ny + 0.5); ctx.stroke();
      ctx.restore();
    }
    roundRect(ctx, cx - 9, cy - 9, 18, 18, 9, V3.ink);
    setFont(ctx, 10); ctx.fillStyle = V3.card; ctx.fillText(R.you, cx - 8, cy - 5);
    let exposure = 0;
    for (const n of R.nodes) {
      const [nx, ny] = nodeAt(n.id);
      const warm = n.id === 'junie' && this.junieWarm;
      const muted = (n.id === 'junie' && !this.junieWarm) || (this.mapMuted && (n.id === 'house' || n.id === 'line'));
      const red = n.kind === 'exposure' && !warm;
      if (red && !(this.mapMuted && (n.id === 'house' || n.id === 'line'))) exposure++;
      const fill = warm ? V3.warm : red ? V3.danger : n.kind === 'bot' ? V3.bot : V3.grey;
      const d = n.kind === 'bot' ? 18 : 12;
      roundRect(ctx, nx - d / 2, ny - d / 2, d, d, d / 2, fill);
      const tag = muted || n.kind === 'left' ? (n.kind === 'left' ? R.leftTag : R.mutedTag) : '';
      setFont(ctx, 11);
      const lw = Math.max(Math.ceil(ctx.measureText(n.label).width), tag ? (setFont(ctx, 9), Math.ceil(ctx.measureText(tag).width)) : 0);
      // to the right of its node, unless that would cross the card's edge: then to its left
      const lx = nx + d / 2 + 3 + lw > x + w - 6 ? nx - d / 2 - 3 - lw : nx + d / 2 + 3;
      setFont(ctx, 11); ctx.fillStyle = V3.ink;
      ctx.fillText(n.label, lx, ny - 6);
      if (tag) { setFont(ctx, 9); ctx.fillStyle = V3.ink2; ctx.fillText(tag, lx, ny + 6); }
    }
    void exposure;
  }

  // ── Photos: the original ─────────────────────────────────────────────────
  private drawPhotos(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.pageGround(ctx, W, H);
    const cx = 24, cw = W - 48, cy = PAGE_TOP + 8, ch = H - BAR_H - PAGE_TOP - 16;
    roundEdge(ctx, cx, cy, cw, ch, 6, V3.edge, V3.card);
    setFont(ctx, 17); ctx.fillStyle = V3.ink; ctx.fillText(PH.title, cx + 20, cy + 12);
    const pw = 190, ph = ch - 66, px0 = cx + 20, py0 = cy + 40;
    const mine = this.profile === 'maya';
    if (mine) thumb(ctx, px0, py0, pw, ph, 3, false, 6); else drawGoalPicture(ctx, px0, py0, pw, ph, { t: this.t });
    setFont(ctx, 12); ctx.fillStyle = V3.ink2;
    ctx.fillText(mine ? (this.reversal === 'matched' ? PH.matched : PH.currentHers) : PH.currentGoal, px0, py0 + ph + 6);
    const ox = px0 + pw + 30;
    thumb(ctx, ox, py0, 112, 76, 3, false, 6);   // S363 / N11: smaller, so the bot's last lines fit under it
    setFont(ctx, 14); ctx.fillStyle = V3.ink; ctx.fillText(PH.original, ox, py0 + 82);
    let sy = py0 + 104;
    const buttons: { id: string; label: string; kind: 'primary' | 'quiet' }[] = [];
    if (this.step === 'photos' && this.reversal === 'none') {
      if (!this.keepTried) buttons.push({ id: 'photo-keep', label: PH.keep, kind: 'quiet' });
      buttons.push({ id: 'photo-original', label: PH.use, kind: 'primary' });
    }
    if (this.keepTried && this.reversal === 'none') { setFont(ctx, 13); ctx.fillStyle = V3.danger; ctx.fillText(PH.noMatch, ox, sy); sy += 22; }
    if (this.reversal === 'verifying') {
      setFont(ctx, 14); ctx.fillStyle = V3.ink;
      ctx.fillText(PH.verifying, ox, sy);
      progressBar(ctx, ox, sy + 22, 200, this.reversalT / PH.verifySeconds, this.reversalT);
    }
    if (this.reversal === 'matched') {
      pill(ctx, ox, sy, 150, 26, V3.botSoft);
      setFont(ctx, 14); ctx.fillStyle = V3.botInk; ctx.fillText('✓  ' + PH.match, ox + 14, sy + 6);
      const b = this.bot;
      if (b?.id === 'ready') {
        // ⚑ S363 / N11 — the bot's last three lines ran off the card's right edge and under its foot: wrapped, in the
        //   assistant's idiom (its mark, plain text), inside the column
        let ty = sy + 32;
        const lw = cx + cw - 12 - (ox + 22);
        for (let k = 0; k < this.botLinesShown; k++) {
          setFont(ctx, 13);
          const ls = wrapText(ctx, b.lines[k], lw);
          if (ty + ls.length * 16 > cy + ch - 2) break;
          assistantMark(ctx, ox, ty, 16, V3.primary, V3.primaryInk);
          ctx.fillStyle = V3.ink; ls.forEach((l, j) => ctx.fillText(l, ox + 22, ty + 1 + j * 16));
          ty += ls.length * 16 + 4;
        }
      }
    }
    this.bar(ctx, W, H, '', buttons);
  }

  /** the game in a phone-shaped frame on the page (S168) */
  private drawGame(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const top = PAGE_TOP + 2;
    const GW = 140, GH = 280;
    const s = Math.min(1.1, (H - top - 12) / GH);
    const gx = Math.round((W - GW * s) / 2), gy = top;
    this.gameFrame = { x: gx, y: gy, s };
    px(ctx, gx - 6, gy - 6, Math.round(GW * s) + 12, Math.round(GH * s) + 12, WEB.cardEdge);
    ctx.save(); ctx.translate(gx, gy); ctx.scale(s, s);
    ctx.beginPath(); ctx.rect(0, 0, GW, GH); ctx.clip();
    this.floppy.draw(ctx, GW, GH);
    ctx.restore();
    this.publish({ x: gx, y: gy, w: Math.round(GW * s), h: Math.round(GH * s), id: 'game-tap' });
    setFont(ctx, 12); ctx.fillStyle = V3.ink;
    const back = body.game.back;
    const bw = Math.ceil(ctx.measureText(back).width) + 18, bx = ADDR.x + 8, by = top + 4;
    pill(ctx, bx, by, bw, 22, V3.card);
    ctx.fillText(back, bx + 9, by + 5);
    this.publish({ x: bx, y: by, w: bw, h: 22, id: 'game-back' });
  }

  /** ⚑ the page after the failure (as built): the agent's page cannot be reached; nothing is pressable */
  private drawFailed(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    if (this.streamOpen) { this.drawStreamLive(ctx, W, H); return; }
    const FD = PROGRAM.failed;
    if (this.failT >= FAIL.off) { px(ctx, 0, 0, W, H, ERA4.field); return; }
    this.pageGround(ctx, W, H);
    const cx = 40, cw = W - 80, cy = PAGE_TOP + 10;
    roundEdge(ctx, cx, cy, cw, H - cy - 14, 6, V3.edge, V3.card);
    setFont(ctx, 22); ctx.fillStyle = V3.ink;
    ctx.fillText(updates.close.restarting, cx + 44, cy + 60);
    setFont(ctx, 14); ctx.fillStyle = V3.ink2;
    ctx.fillText(FD.title + '  ·  ' + FD.line, cx + 44, cy + 96);
    setFont(ctx, 14); ctx.fillStyle = V3.ink;
    let yy = cy + 124;
    for (const row of wrapText(ctx, FD.detail, cw - 88).slice(0, 3)) { ctx.fillText(row, cx + 44, yy); yy += 18; }
    // ⚑ S328 — the machine's last word moved here from the laptop (his P7-48), in L's own colour: not over, only deferred
    yy += 8; setFont(ctx, 14); ctx.fillStyle = ERA4.l;
    for (const row of wrapText(ctx, closeMessage.laptopLine, cw - 88).slice(0, 2)) { ctx.fillText(row, cx + 44, yy); yy += 18; }
    if (this.failT >= FAIL.bands) {
      const k = Math.min(1, (this.failT - FAIL.bands) / (FAIL.off - FAIL.bands));
      glitchBands(ctx, W, H, k);
      const was = ctx.globalAlpha;
      ctx.globalAlpha = k * k;
      px(ctx, 0, 0, W, H, ERA4.field);
      ctx.globalAlpha = was;
    }
  }

  /** ⚑ the stream keeps going under the failure (as built, S293) */
  private drawStreamLive(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const top = PAGE_TOP;
    px(ctx, 0, top, W, H - top, ERA4.panel);
    const t = this.failT + 30;
    const sideW = 190, pw = W - sideW - 12, ph = H - top - 12;
    streamScene(ctx, 6, top + 6, pw, ph, t, streamShot(t), 0.4);
    px(ctx, 6, top + 6, pw, 22, ERA4.panel);
    if (Math.floor(t * 1.5) % 2 === 0) px(ctx, 12, top + 13, 8, 8, WEB.danger);
    setFont(ctx, 12); ctx.fillStyle = ERA4.textHi; ctx.fillText(STREAM.live + '   ' + STREAM.mark, 26, top + 11);
    const n = STREAM.watching.replace('{n}', String(STREAM.count + 1));
    ctx.fillText(n, 6 + pw - 8 - Math.ceil(ctx.measureText(n).width), top + 11);
    const sx = W - sideW - 2;
    setFont(ctx, 11); ctx.fillStyle = ERA4.textHi;
    ctx.fillText((ballScript.frame as unknown as { panel: string }).panel, sx, top + 12);
    FRAME_ROWS.forEach((r, i) => {
      const y = top + 34 + i * 34;
      setFont(ctx, 11); ctx.fillStyle = ERA4.text; ctx.fillText(r.k, sx, y);
      setFont(ctx, 13); ctx.fillStyle = ERA4.textHi; ctx.fillText(r.v, sx, y + 14);
    });
  }

  // ── presses on the monitor ───────────────────────────────────────────────
  /** ⚑ S328 — a press on the MONITOR (its own coordinates): L's controls first (the balloon sits over both windows),
   *  then a title bar (enlarge), then Kettle's window, then the browser's page in its own coordinates. */
  handleClick(mx: number, my: number): boolean {
    const lg = this.hits.find(h => h.id.startsWith('lg-') && mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
    this.lambyGuide?.activity();
    if (lg?.id === 'lg-tray') { this.nowLine = null; this.waitNow = false; }
    if (lg && this.lambyGuide?.press(lg.id)) { this.version++; if (lg.id === 'lg-show') this.onGuideLook?.(); return true; }
    this.quietT = 0;
    this.stallT = 0;
    this.idleT = 0;
    if (this.idleOrb) { this.idleOrb = null; this.version++; return true; }
    if (this.waitNow) { this.waitNow = false; this.version++; }
    if (this.nowLine) { this.nowLine = null; this.version++; }
    if (this.phase === 'handed') return false;
    // ⚑ S364 / N10 — while the AI uses her computer, her presses do nothing (its banner says so; the frame's Esc still works)
    if (this.act) return true;
    // ⚑ S364 — a page opened larger: any press closes it first (nothing else on the screen takes it)
    if (this.lightbox) { this.lightbox = null; this.version++; return true; }
    let x = mx, y = my;
    const L = this.lay;
    if (L) {
      const at = (h: Hit): boolean => mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h;
      // ⚑ S366 / J15-04 (his: "maybe the notifications can have a x button to close if needed?") — its ✕ closes it and
      //   opens nothing; the notifications are drawn over everything else on the screen, so they take the press first
      const tx = this.hits.find(h => h.id.startsWith('toast-x-') && at(h));
      if (tx && this.phase === 'open') {
        const chat = tx.id.slice(8);
        this.toasts = this.toasts.filter((t) => t.chat !== chat);
        playOnce('ui_press.mp3');
        this.version++;
        return true;
      }
      // ⚑ S363 — a notification opens its chat
      const tst = this.hits.find(h => h.id.startsWith('toast-') && !h.id.startsWith('toast-x-') && at(h));
      if (tst && this.phase === 'open') {
        const chat = tst.id.slice(6) as ChatId;
        this.toasts = this.toasts.filter((t) => t.chat !== chat);
        if (!this.programDone) this.openChat(chat);
        this.version++;
        return true;
      }
      // ⚑ S364 / item 7 — the game's window: ✕ closes it (the console on the bed stays lit). ⚑ S366 / J15-03 — a press on
      //   the small window ENLARGES it over the browser's area; there a press plays, and ◂ Back or ✕ returns it to the corner
      const gh = this.hits.find(h => (h.id === 'game-close' || h.id === 'game-play' || h.id === 'game-small' || h.id === 'game-small-x') && at(h));
      if (gh) {
        if (gh.id === 'game-close') { this.gameWin = false; this.gameBig = false; playOnce('ui_press.mp3'); }
        else if (gh.id === 'game-small' || gh.id === 'game-small-x') { this.gameBig = false; playOnce('ui_press.mp3'); }
        else if (!this.gameBig) { this.gameBig = true; playOnce('ui_press.mp3'); }
        else consoleSession.tap((mx - gh.x) / gh.w, (my - gh.y) / gh.h);
        this.version++;
        return true;
      }
      if (this.gameBigOn && inside(mx, my, L.b)) return true;   // the strip under the enlarged game: nothing
      const win = this.hits.find(h => (h.id === 'win-browser' || h.id === 'win-kettle') && mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
      if (win) { this.chosen = win.id === 'win-kettle' ? 'kettle' : 'browser'; playOnce('ui_press.mp3'); this.version++; return true; }
      if (inside(mx, my, L.k)) {
        const kx = (mx - L.k.cx) / L.k.s, ky = (my - L.k.cy) / L.k.s;
        if (this.phase === 'open') { if (!this.programDone) this.pressMessenger(kx, ky); }
        else if (e4Has('terminated')) { this.messenger.press(kx, ky); }
        this.version++;
        return true;
      }
      if (!inside(mx, my, L.b)) return true;   // the desktop between the windows, the taskbar: nothing
      x = (mx - L.b.cx) / L.b.s; y = (my - L.b.cy) / L.b.s;
    }
    if (this.phase === 'failed') return true;
    if (this.phase === 'saver') { this.wake(); return true; }
    if (this.phase !== 'open') return true;
    // ⚑ S364 — a screenshot or a page opened larger: any press closes it
    if (this.lightbox) { this.lightbox = null; this.version++; return true; }
    const hit = this.pageTargets.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (!hit && this.startMap.menu) { this.startMap.close(); this.version++; return true; }
    if (!hit) return true;
    const id = hit.id;
    if (id === 'start-menu') { this.lambyGuide?.press('lg-x'); this.startMap.toggle(); this.version++; return true; }
    if (id === 'whattodo' && !this.startMapSilent) { this.startMap.close(); this.startPanel.toggle(); this.version++; return true; }
    if (this.startMap.press(id, this.startModel(), this.startMapSilent)) { this.version++; return true; }
    if (id === 'sm-whattodo' && !this.startMapSilent) { this.startMap.close(); this.startPanel.reopen(); this.version++; return true; }
    if (id === 'sm-now' || id.startsWith('sm-room:')) {
      this.nowLine = id === 'sm-now' ? this.startModel().now?.hint ?? null : this.startModel().room.find(b => b.id === id.slice(8))?.hint ?? null;
      this.startMap.close(); this.version++; return true;
    }
    if (id === 'sm-shut') { this.startMap.close(); this.startMap.refused = true; this.version++; return true; }
    if (id === 'sm-leave') { this.startMap.close(); gameMenuBus.openLeave?.(); this.version++; return true; }
    if (this.startMap.active && !this.startMapSilent) { this.startMap.close(); this.version++; return true; }
    if (id === 'startpanel-close') { this.startPanel.close(); this.version++; return true; }
    // the game
    if (id === 'bm-floppy' && this.mode === 'story') { this.mode = 'game'; this.floppy.openGame(); this.version++; return true; }
    if (id === 'game-back') { this.floppy.closeGame(); this.mode = 'story'; this.version++; return true; }
    if (id === 'game-tap') {
      const f = this.gameFrame;
      const handled = this.floppy.tap((x - f.x) / f.s, (y - f.y) / f.s);
      if (!this.floppy.open) this.mode = 'story';
      this.version++;
      return handled;
    }
    // the sheets own the press while they are up
    if (id === 'ny-continue' && this.newyouUp) {
      this.newyouUp = false;
      this.file('newyou', 'read', W3.newyou);
      playOnce('ui_press.mp3');
      this.go('mum');
      return true;
    }
    if (id === 'enq-send' && this.enquiry === 'draft') { this.enquiry = 'sending'; this.enquiryT = 0; playOnce('ui_press.mp3'); this.version++; return true; }
    if (id === 'enq-close' && this.enquiry === 'replied') {
      // ⚑ beat 6 — Meridian said no; she is sent back to the clinic page, and the number has grown
      this.enquiry = 'closed';
      ledger.e4Space.push({ id: 'enquiry', outcome: 'read', witness: ENQ.witness });
      markE4('meridian');
      this.clinicNumber += 3;
      this.clinicMoved = true;
      this.openTab('clinic');
      playOnce('ui_press.mp3');
      this.go('left');
      return true;
    }
    // ⚑ S360 — the mailbox
    if (id.startsWith('mail-row-')) { this.mailOpen = id.slice(9) as MailId; this.idleNav = 0; playOnce('ui_press.mp3'); this.version++; return true; }
    // ⚑ S363 — Larkpost's AI summarises the open email (and files that it did)
    if (id === 'mail-sum' && this.mailOpen) {
      const o = this.mailOpen;
      if (this.summed.has(o)) this.summed.delete(o); else { this.summed.add(o); this.mailScroll[o] = 0; this.file(`v3:summary:${o}`, 'read', `mail: summarised by the inbox's AI — ${o}`); }
      this.idleNav = 0; playOnce('ui_press.mp3'); this.version++; return true;
    }
    // ⚑ S363 — the news sites' furniture: the cookie banner, the newsletter pop-up (any answer closes them)
    if (id === 'news-consent-accept' || id === 'news-consent-manage') { this.consentDone = true; this.idleNav = 0; playOnce('ui_press.mp3'); this.version++; return true; }
    if (id === 'news-nl-sign' || id === 'news-nl-no') { this.newsletterGone = true; this.idleNav = 0; playOnce('ui_press.mp3'); this.version++; return true; }
    // ⚑ S364 — tap a screenshot or a page it shared to see it larger (N9: "tap/touch to expand")
    if (id.startsWith('card-shot-') || id.startsWith('card-page-')) { this.lightbox = id.slice(5); playOnce('ui_press.mp3'); this.version++; return true; }
    // ⚑ S363 — the composer takes no typing (R28): it points to her suggested replies
    if (id === 'conv-compose') { this.composeFlashT = 1.6; this.version++; return true; }
    if (id === 'mail-support' && this.step === 'clinic') { this.enquiry = 'draft'; playOnce('ui_press.mp3'); this.go('meridian'); return true; }
    if ((id === 'mail-read' || id.startsWith('mail-link-')) && (this.step === 'mumMail' || this.step === 'news')) {
      this.openArticle(id === 'mail-read' ? 0 : Number(id.slice(10)));
      return true;
    }
    if (id === 'sponsor-chat' && (this.step === 'news' || this.step === 'mumMail')) { this.openBot(); return true; }
    if (id === 'sponsor-chat' && this.botBeat >= 0) { this.openTab('search'); return true; }   // the ad, once more: back to the chat
    if (id.startsWith('tab-')) { this.idleNav = 0; this.openTab(id.slice(4)); return true; }
    if (id === 'news-prev' || id === 'news-next') {
      this.idleNav = 0;
      this.newsIndex = Math.max(0, Math.min(this.newsOpened - 1, this.newsIndex + (id === 'news-next' ? 1 : -1)));
      this.openTab('news');
      return true;
    }
    if (id === 'clinic-open' && this.clinicNotice && this.step === 'news') {
      // ⚑ beat 5 — the number
      this.addTab(this.clinicTab(), true);
      markE4('number');
      this.file('v3:clinic', 'read', W3.clinic.replace('{number}', this.clinicNumber.toLocaleString('en-GB')));
      playOnce('ui_press.mp3');
      this.go('clinic');
      return true;
    }
    if (id === 'clinic-support' && this.step === 'clinic') { this.enquiry = 'draft'; playOnce('ui_press.mp3'); this.go('meridian'); return true; }
    if ((id === 'search-open' || id === 'search-go') && this.typedDone) {
      this.typeT = 0; playOnce('ui_press.mp3'); this.go('typing');
      return true;
    }
    if ((id === 'result-agent' || id === 'ad-chat') && this.step === 'results') { this.openBot(); return true; }
    if (id.startsWith('conv-chip-') && (this.step === 'bot')) {
      const b = this.bot;
      const c = b?.chips?.[Number(id.slice(10))];
      if (c) this.answerBot(c);
      return true;
    }
    if (id === 'conv-act' && (this.step === 'bot' || this.step === 'confirm')) { this.answerBot(null); return true; }
    if (id === 'photo-keep' && this.step === 'photos' && !this.keepTried) {
      this.keepTried = true;
      this.file('v3:keep', 'answered', W3.keep);
      playOnce('ui_refuse.mp3');
      this.version++;
      return true;
    }
    if (id === 'photo-original' && this.step === 'photos' && this.reversal === 'none') {
      this.reversal = 'verifying'; this.reversalT = 0; playOnce('ui_press.mp3'); this.version++;
      return true;
    }
    return true;
  }

  private newsShownId = '';
  private openTab(id: string): void {
    if (!this.tabs.some((t) => t.id === id)) return;
    this.liveId = id;
    const t = this.tabs.find((x) => x.id === id)!;
    const art = ARTICLES[this.newsIndex];
    if (t.kind === 'news' && art && this.newsShownId !== art.id) { this.newsShownId = art.id; this.newsT = 0; }
    if (t.kind === 'news' && art && !this.read.has(art.id)) {
      this.read.add(art.id);
      ledger.e4Space.push({ id: `tab:${art.id}`, outcome: 'read', witness: `read: ${art.mast} — ${art.head}` });
    }
    this.version++;
  }

  /** the room's coordinate-less press, and the debug panel's own exit */
  handOverLid(): void { this.phase = 'handed'; this.version++; }
  /** the device has stopped: the agent's page cannot be reached any more */
  fail(): void { stopClipSound(); if (this.phase !== 'failed') { this.phase = 'failed'; this.failT = 0; if (this.streamOpen) this.liveId = 'search'; this.version++; } }
  /** the link she opened in the headset is open on this machine too: when the device stops, the monitor shows the stream */
  openStream(): void { this.streamOpen = true; }

  /** review only: land on the settled browser at a tab kind */
  debugJumpTo(where: string): void {
    this.settleT = 0;
    this.phase = 'open';
    this.t = 0;
    this.filedSession = true;
    if (!this.tabs.length) this.tabs = [this.searchTab(), this.photosTab()];
    const t = this.tabs.find((x) => x.kind === where || x.id === where);
    this.liveId = t?.id ?? 'search';
    if (this.step === 'idle') this.go('house');
    this.version++;
  }
}

/** her bubble in the bot's chat: the warm of her own room, not the agent's mint (S363: Kettle's own "mine", so her voice
 *  looks the same in both windows) */
const KETTLE_MINE = KETTLE.mine;

/** ⚑ S363 (N11) — a line that does not fit ends in an ellipsis, never mid-letter at a clip edge */
export function fitText(ctx: CanvasRenderingContext2D, text: string, w: number): string {
  if (ctx.measureText(text).width <= w) return text;
  let lo = 0, hi = text.length;
  while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (ctx.measureText(text.slice(0, mid).trimEnd() + '…').width <= w) lo = mid; else hi = mid - 1; }
  return text.slice(0, lo).trimEnd() + '…';
}
/** ⚑ S363 — a mail label's colour (her room's palette) */
function mailLabelInk(id: string): string { return id === 'family' ? PLACE.textileHi : id === 'health' ? PLACE.sky : PLACE.sun; }
/** ⚑ S363 — each news site's own colour */
function articleInk(look: string): string { return look === 'tabloid' ? PLACE.book : look === 'tech' ? ERA4.field : PLACE.bookAlt; }
/** ⚑ S363 — the chat's small glyphs: a new chat, a picker's chevron, the composer's plus and send */
function newChatIcon(ctx: CanvasRenderingContext2D, x: number, y: number, ink: string): void {
  ctx.save(); ctx.strokeStyle = ink; ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.5, y + 2.5, 11, 11);
  ctx.beginPath(); ctx.moveTo(x + 5, y + 9); ctx.lineTo(x + 13, y + 1); ctx.stroke();
  ctx.restore();
}
function chevron(ctx: CanvasRenderingContext2D, x: number, y: number, ink: string): void {
  ctx.save(); ctx.strokeStyle = ink; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 4, y + 4); ctx.lineTo(x + 8, y); ctx.stroke(); ctx.restore();
}
function plusGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, ink: string): void {
  px(ctx, x, y + 5, 12, 2, ink); px(ctx, x + 5, y, 2, 12, ink);
}
function sendGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, ink: string): void {
  ctx.save(); ctx.strokeStyle = ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x + 6, y + 12); ctx.lineTo(x + 6, y + 1); ctx.moveTo(x + 1, y + 6); ctx.lineTo(x + 6, y + 1); ctx.lineTo(x + 11, y + 6); ctx.stroke();
  ctx.restore();
}
/** a search glyph: a ring and its handle (14 px) */
function magnifier(ctx: CanvasRenderingContext2D, x: number, y: number, ink: string): void {
  ctx.save(); ctx.strokeStyle = ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x + 6, y + 6, 4.5, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 9.5, y + 9.5); ctx.lineTo(x + 13, y + 13); ctx.stroke();
  ctx.restore();
}
/** ⚑ S363 — the webmail's folder glyphs (12 px), drawn, never a font's symbol */
function folderIcon(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, ink: string): void {
  ctx.save(); ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = 1.5;
  if (id === 'inbox') { ctx.strokeRect(x + 1.5, y + 2.5, 11, 9); ctx.beginPath(); ctx.moveTo(x + 1.5, y + 7.5); ctx.lineTo(x + 4.5, y + 7.5); ctx.lineTo(x + 5.5, y + 9.5); ctx.lineTo(x + 8.5, y + 9.5); ctx.lineTo(x + 9.5, y + 7.5); ctx.lineTo(x + 12.5, y + 7.5); ctx.stroke(); }
  else if (id === 'starred') {
    ctx.beginPath();
    for (let k = 0; k < 10; k++) { const r = k % 2 ? 2.6 : 6, a = -Math.PI / 2 + k * Math.PI / 5; const px0 = x + 7 + Math.cos(a) * r, py0 = y + 7.5 + Math.sin(a) * r; if (k) ctx.lineTo(px0, py0); else ctx.moveTo(px0, py0); }
    ctx.closePath(); ctx.stroke();
  } else if (id === 'sent') { ctx.beginPath(); ctx.moveTo(x + 1.5, y + 2.5); ctx.lineTo(x + 13, y + 7); ctx.lineTo(x + 1.5, y + 11.5); ctx.lineTo(x + 4, y + 7); ctx.closePath(); ctx.stroke(); }
  else { ctx.strokeRect(x + 2.5, y + 1.5, 9, 11); ctx.beginPath(); ctx.moveTo(x + 4.5, y + 5); ctx.lineTo(x + 9.5, y + 5); ctx.moveTo(x + 4.5, y + 8); ctx.lineTo(x + 8, y + 8); ctx.stroke(); }
  ctx.restore();
}
/** a sender's mark: a person is a circle with an initial; an organisation a rounded square with two letters */
function senderMark(ctx: CanvasRenderingContext2D, x: number, y: number, d: number, mark: string, fill: string, org = false): void {
  roundRect(ctx, x, y, d, d, org ? Math.max(2, Math.floor(d / 5)) : Math.floor(d / 2), fill);
  setFont(ctx, Math.max(8, Math.round(d * (mark.length > 1 ? 0.42 : 0.55))));
  ctx.fillStyle = V3.ink;
  const w = Math.ceil(ctx.measureText(mark).width);
  ctx.fillText(mark, x + Math.round((d - w) / 2), y + Math.round(d * (mark.length > 1 ? 0.28 : 0.2)));
}
