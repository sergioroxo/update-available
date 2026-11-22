/**
 * ⚑ S412 (UiB job 33 Part A; T98, draft 3 of 21 Nov §2) — THE SCREEN FOR THE WHOLE OF 2026: one monitor, two panes, always in
 * the same places.
 *
 *   · LEFT, THE AI. L, then Second Thoughts, then Shepherd. It talks here and it reports what it did here: its mark and its
 *     name at the top with the voice switch, the conversation under it, and the answers it offers at the foot.
 *   · RIGHT, HER WORLD. Whatever the AI has opened — Kettle, Larkpost, the search, a story, later the video and the stream —
 *     one thing at a time, under a slim bar with a back arrow. NO TABS ANYWHERE. The AI opens things for her: she never hunts.
 *   · THE AI'S PANE WIDENS AS IT TAKES OVER (`setAiWidth`): a narrow column in Act I, wider in Act II, the whole screen in
 *     Act III; the friends push it back. The takeover can be seen in the layout itself. The widths are data
 *     (s4_acts.json screen.aiWidth) and the story's to tune.
 *   · NO CARD LONGER THAN THREE LINES, AND NOTHING POPS UP OVER WHAT YOU ARE READING.
 *
 * This file is the frame and nothing else: the panes, the conversation, the answers, the voice switch, the AI's own cursor,
 * the back arrow, and the Original ✦'s stage. What is on the right is drawn by PAGES the acts register (`registerPage`): Act I
 * (src/desktop/apps/e4ActOne.ts) registers her week, the card, Kettle, Larkpost, the search and the stories; Parts B–D add
 * theirs. The director (src/desktop/apps/e4Acts.ts) moves the story; this file only holds and draws its state.
 *
 * ⚑ THE ORIGINAL ✦ (rule 2) — `originalStage`: told (Act I: "softened by L", press to see what the person wrote) → locked
 * (Act II: grey, a padlock, "original unavailable while Second Thoughts is on") → gone (Act III: no tags) → restored (beat 10,
 * by her friends). Pages draw their tags from it (`drawOriginalTag`); while an original is shown (`originalOpen`) the AI's pane
 * says nothing — a person's own words are felt — and the director waits (`felt`).
 *
 * ⚑ DIRTY ONLY (S406): every change bumps `version`; anything that moves (the AI's cursor, a pane widening, a flying card) moves
 * in steps of `ANIM_HZ` a second, so the monitor is re-uploaded at most that often while something moves and never at rest.
 *
 * ⚑ S413 (Part B, Act II) — what Second Thoughts adds to the frame: MEMORY rows (one small line each, opened in place into
 * Memory · Used for · Shared with — rule 3, 26-12), her UNSENT row (her words deleted, the system's line in their place,
 * a row that scrolls up with the rest — 26-15), a BOOKED pill, the COMPOSER at the pane's foot (beat 8: her words typed in
 * with no keyboard), the BANNER over her world while the AI uses her computer (its "Take back control" greyed), a name tag
 * on the AI's cursor, every ✦ in the conversation grey with a padlock once the stage is `locked`, and a conversation that
 * stays where the visitor scrolled it while new lines arrive (26-14: "let him scroll the chat"; a Newest pill returns).
 *
 * ⚑ S417 (UiB job 34 Part A; T101) — THE TWO PANES ARE TWO WINDOWS ON A 2026 DESKTOP (desk26.ts: the wallpaper, the menu bar
 * with the Menu button, the dock, one notification at a time), in the same places and widening as before; L's window is a modern
 * AI chat app (its chat list, the model chip, the big greeting, rounded answers, the composer that is never typed into, the
 * voice switch beside it). `desk.skin` says which product the desktop wears (Part B dresses them). New controls: `start-menu`
 * (E4Browser opens the Start menu), `dock:<app>` (handled here, never handed to the script).
 *
 * ⚑ THE CONTROLS ARE PUBLISHED AS `controls` (monitor coordinates). E4Browser copies them into its `hits`, which the walker,
 * the tour, XR and the room's pointer read; the name here is deliberately not one the walker's collector matches, so nothing
 * is counted twice.
 */
import { setFont, px } from '../theme/chrome';
import { newsFor } from '../theme/fonts';
import { PLACE, WEB, V3, KETTLE, CHROME, ERA4, OS26, roundRect, roundEdge, pill, assistantMark } from '../theme/era4';
import { playOnce, stopClip } from '../../audio/tapeAudio';
import { Desk26, drawWallpaper, drawMenuBar, drawDock, drawWindow, drawNote, aiWindow, worldWindow, contentOf, softShadow, rr, fillRR, alpha,
  edgeRR, fit26, look26, TITLE_H, WIN_RADIUS, APPS26, type App26, type Tile26, type DockApp, type MenuBar26, type SeamApi } from './desk26';
import { drawScore, scoreHeight, BRAND, type StickerId } from './brands26';
import ACTS from '../../../data/dialog/s4_acts.json';

export interface Hit { x: number; y: number; w: number; h: number; id: string }
export interface Rect { x: number; y: number; w: number; h: number }
export type OriginalStage = 'told' | 'locked' | 'gone' | 'restored';
/** a row of the conversation: the AI's words, her own (a chip she pressed), or a small note of what the AI did.
 *  ⚑ S413 — and Second Thoughts' own: a Memory note (opened in place), her unsent words' row, the booked pill */
export interface ChatRow { who: 'ai' | 'her' | 'note' | 'memory' | 'unsent' | 'booked'; text: string; mem?: MemoryNote; open?: boolean; id?: string }
/** ⚑ S413 (rule 3) — what Second Thoughts files about her: the note, what it is used for, who it is shared with */
export interface MemoryNote { memory: string; usedFor: string; sharedWith: string }
/** an answer at the AI's foot. ⚑ S418 — 'hers': a chip that carries her own words (beat 8) is drawn plain, never branded */
export interface Chip { id: string; label: string; kind?: 'primary' | 'quiet' | 'hers' }
/** a page on the right: its kind names the renderer an act registered; anything else is the page's own state */
export interface Page { kind: string; title?: string; [k: string]: unknown }
/** what a page renderer is handed: where to draw, how to publish a control, and the screen itself */
export interface PageApi {
  screen: LScreen;
  /** publish a control (monitor coordinates) — only while the visitor may press the page */
  control(h: Hit): void;
  pressable: boolean;
}
export type PageRenderer = (ctx: CanvasRenderingContext2D, r: Rect, page: Page, api: PageApi) => void;

const S = (ACTS as unknown as { screen: { aiWidth: Record<string, number>; date: string; lName: string; lSub: string; voiceOn: string;
  voiceOff: string; voiceLabel: string; back: string; her: string; apps: Record<string, string>; newest: string;
  memory: { updated: string; memory: string; usedFor: string; sharedWith: string };
  original: { told: string; turnBack: string; originalLabel: string; locked: string; restored: string };
  os: OsWords } }).screen;
/** ⚑ S417 — the desktop's own words (s4_acts.json screen.os) */
interface OsWords { menus: string[]; status: string; apps: Record<App26, string>; why: Record<string, string>;
  chats: { newChat: string; today: string; yesterday: string; todayList: string[]; yesterdayList: string[]; live: string };
  model: string; greeting: string; composer: string; menu: { apps: string; whatToDo: string };
  notes: { sorted: { title: string; text: string }; seconds: number } }
export const OS = S.os;
/** Shepherd Live™'s own name, for the menu bar while its session has the screen */
const SHEPHERD_NAME = (ACTS as unknown as { act3: { b9: { studio: { name: string } } } }).act3.b9.studio.name;

/** ⚑ S417 — the band at the foot where the guide's tray sits (the dock's row; drawLambyGuide puts L's head at H − 20) */
export const TASKBAR = 20;
/** moving things move in steps of this many a second (dirty-only uploads) */
export const ANIM_HZ = 8;
const PAD = 10;
const LINE = 18;          // the AI's 14 px lines (S417: larger, calmer; job 33's were 13/17)
const HER_LINE = 16;      // her 13 px bubble lines
/** ⚑ S417 — L's chat list: a column when the window is at least this wide, a strip of chats under the title bar when not */
const SIDEBAR_MIN = 300;
const SIDEBAR_W = 96;
const STRIP_H = 19;
const CHIP_H = 25;
const COMPOSER_H = 28;
/** the big greeting's size (the period's chat apps open on a serif hello) */
const GREET = 17;

/** ⚑ S413 — the ✦ drawn inside the conversation follows the screen's stage (locked: grey, with a padlock) */
let iconLocked = false;
const PAGES = new Map<string, PageRenderer>();
/** an act registers how one kind of page on the right is drawn (Act I: week, card, kettle, mail, search, story) */
export function registerPage(kind: string, draw: PageRenderer): void { PAGES.set(kind, draw); }

/** the 2026 ink for the AI's pane: L's mint, softened for a pale ground */
export const AI = { ground: WEB.accentSoft, ink: WEB.accentInk, mark: WEB.accent, edge: WEB.accent, note: CHROME.ink, chip: WEB.card,
  chipEdge: WEB.cardEdge, primary: WEB.primary, primaryInk: WEB.primaryInk } as const;

/**
 * ⚑ S418 (UiB job 34 Part B) — THE AI'S WINDOW, PER BRAND. L's (Act I) is white and polished: its answers glossy, a ✦ in each
 * one it offers. Second Thoughts' (Act II) is near-black with yellow and cream type, its own score at the head. The plain OS
 * (after the friends) gives L back its window without the gloss. A person's words keep their own plain bubble in all of them,
 * and the composer stays the OS's own white field (it is hers to fill, never the brand's).
 */
interface AiLook {
  ground: string; ink: string; ink2: string; title: string; title2: string; titleMark: string; titleMarkInk: string;
  mark: string; markInk: string;
  primary: string; primaryInk: string; primaryHi: string | null; quiet: string; quietInk: string; quietEdge: string;
  dots: string; memInk: string; memBox: string; memEdge: string; memKey: string; memVal: string; alarm: string;
  booked: string; bookedInk: string; voice: string; voiceOn: string; voiceInk: string; voiceEdge: string; lock: string;
  chip: string; chipInk: string; chipEdge: string; spark: boolean; send: string; sendInk: string;
}
const L_AI: AiLook = {
  ground: OS26.win, ink: AI.ink, ink2: OS26.winInk2, title: OS26.winInk, title2: OS26.winInk2, titleMark: AI.mark, titleMarkInk: WEB.card,
  mark: AI.mark, markInk: WEB.card,
  primary: AI.primary, primaryInk: AI.primaryInk, primaryHi: WEB.accent, quiet: OS26.win, quietInk: AI.ink, quietEdge: AI.chipEdge,
  dots: AI.mark, memInk: AI.ink, memBox: WEB.card, memEdge: AI.chipEdge, memKey: AI.note, memVal: AI.ink, alarm: V3.danger,
  booked: AI.primary, bookedInk: AI.primaryInk, voice: OS26.win, voiceOn: WEB.accentSoft, voiceInk: AI.ink, voiceEdge: AI.edge, lock: CHROME.ink,
  chip: OS26.lPremium, chipInk: AI.ink, chipEdge: AI.edge, spark: true, send: AI.primary, sendInk: AI.primaryInk
};
const PLAIN_AI: AiLook = { ...L_AI, primaryHi: null, spark: false, chip: WEB.accentSoft };
const ST_AI: AiLook = {
  ground: OS26.stPanel, ink: OS26.stText, ink2: OS26.stDim, title: OS26.stInk, title2: OS26.stPanel2, titleMark: OS26.stInk, titleMarkInk: PLACE.sunHi,
  mark: PLACE.sunHi, markInk: OS26.stInk,
  primary: PLACE.sunHi, primaryInk: OS26.stInk, primaryHi: null, quiet: OS26.stPanel2, quietInk: OS26.stText, quietEdge: PLACE.sunHi,
  dots: PLACE.sunHi, memInk: PLACE.sunHi, memBox: OS26.stPanel2, memEdge: PLACE.sunHi, memKey: OS26.stDim, memVal: OS26.stText, alarm: OS26.stAlarm,
  booked: PLACE.sunHi, bookedInk: OS26.stInk, voice: OS26.stPanel2, voiceOn: OS26.stPanel2, voiceInk: PLACE.sunHi, voiceEdge: PLACE.sunHi, lock: OS26.stDim,
  chip: PLACE.sunHi, chipInk: OS26.stInk, chipEdge: PLACE.sunHi, spark: false, send: PLACE.sunHi, sendInk: OS26.stInk
};
const AI_LOOKS: Record<Desk26['skin'], AiLook> = { l: L_AI, plain: PLAIN_AI, secondThoughts: ST_AI, shepherd: ST_AI };
/** the padlock's ink on the locked ✦ (dark on a pale window, dim on Second Thoughts' dark one) */
let lockInk: string = CHROME.ink;

export class LScreen {
  version = 0;
  /** every control on the monitor (monitor coordinates); E4Browser copies these into its `hits` */
  controls: Hit[] = [];
  /** ⚑ S417 — THE DESKTOP the two windows stand on (desk26.ts): which skin is on (`desk.skin`: the acts set it), the one
   *  notification at the top right, the dock's one-line reason */
  readonly desk = new Desk26();
  /** ⚑ S417 — the Menu (E4Browser's Start menu) is open: the menu bar's button reads pressed in */
  menuOpen = false;
  /** ⚑ S417 — where the conversation was drawn at the last draw (beat 1's reading circle stands in it; the wheel scrolls it) */
  aiStage: Rect = { x: 0, y: 0, w: 0, h: 0 };
  /** ⚑ S417 — the menu bar's status area begins here (E4Browser lays Second Thoughts' Memory item left of it) */
  statusX = 0;
  /** ⚑ S417 — a person's words, the guide's balloon, the film or the AI's voice have the floor: notifications wait */
  hush = false;
  /** Shepherd's session had the AI's window (the whole glass) at the last draw */
  private fullOn = false;
  /** the stream (or the dark after it) had the whole glass at the last draw */
  private coverOn = false;
  // ── the panes ──
  private aiW = S.aiWidth.act1;
  private aiFrom = S.aiWidth.act1;
  private aiTo = S.aiWidth.act1;
  private aiT = 1;
  private aiDur = 0;
  /** the AI's name and its line under it (Part B: "L · Second Thoughts") */
  name = S.lName;
  sub = S.lSub;
  // ── the conversation ──
  rows: ChatRow[] = [];
  /** the AI is about to say something (three dots, still: no animation, no uploads) */
  typing = false;
  chips: Chip[] = [];
  /** a short line under the answers (26-9: how to talk to L) */
  help: string | null = null;
  /** pixels the conversation is scrolled back from its newest line (the visitor's wheel or drag) */
  private chatBack = 0;
  private chatMax = 0;
  /** ⚑ S413 — the conversation's whole height at the last draw: a line arriving while she reads back keeps her place */
  private chatTotal = 0;
  /** ⚑ S413 — beat 8's message box at the pane's foot (null: none); its words, and whether its caret shows */
  composer: string | null = null;
  composerText = '';
  composerCaret = false;
  /** ⚑ S413 — over her world while the AI uses her computer (its own words, and her greyed way back) */
  banner: { text: string; control: string } | null = null;
  /** ⚑ S413 — the name on the AI's cursor (Second Thoughts', while it uses her computer) */
  cursorLabel: string | null = null;
  private memoryCount = 0;
  /** ⚑ S418 — Second Thoughts' achievement stickers, each put up by the act when the thing it names has been done to her */
  stickers: StickerId[] = [];
  sticker(id: StickerId): void { if (!this.stickers.includes(id)) { this.stickers.push(id); this.version++; } }
  unsticker(id: StickerId): void { const n = this.stickers.length; this.stickers = this.stickers.filter((x) => x !== id); if (this.stickers.length !== n) this.version++; }
  // ── her world ──
  private stack: Page[] = [];
  /** the visitor may press the back arrow (Act I: on a story); while the AI is navigating, the arrow is the AI's */
  visitorBack = false;
  /** the visitor may press the page's own controls */
  pagePressable = true;
  // ── the Original ✦ ──
  originalStage: OriginalStage = 'told';
  /** the id of the original turned over now (a person's words on the glass: the AI's pane is silent), or null */
  originalOpen: string | null = null;
  // ── the voice ──
  voiceOn = true;
  /** the voice switch is drawn (Shepherd's voice has none: Part C sets this false) */
  voiceSwitch = true;
  private clip: HTMLAudioElement | null = null;
  // ── the AI's cursor ──
  private cur: { x: number; y: number; fx: number; fy: number; tx: number; ty: number; t: number; dur: number; on: boolean; flash: number } =
    { x: 0, y: 0, fx: 0, fy: 0, tx: 0, ty: 0, t: 1, dur: 0, on: false, flash: 0 };
  private animClock = 0;
  /** a picture the AI pane carries instead of the conversation's head (beat 1's reading: the big circle); drawn by its owner */
  aiOverlay: ((ctx: CanvasRenderingContext2D, r: Rect) => void) | null = null;
  /** drawn over both panes and under the AI's cursor (beat 1's cards flying from her world into the AI) */
  overlayTop: ((ctx: CanvasRenderingContext2D, W: number, H: number) => void) | null = null;
  /** ⚑ S414 (Act III) — something that takes the AI's pane over whole (Shepherd Live™'s session, at the pane's full width): drawn
   *  in the pane's place, publishing its own controls; it returns false when it has nothing to draw (the pane draws itself) */
  full: ((ctx: CanvasRenderingContext2D, r: Rect, push: (h: Hit) => void) => boolean) | null = null;
  /** ⚑ S415 (Part D) — something that takes the WHOLE monitor (transjesus.str, beats 11–13: the stream fills the screen, then the
   *  dark): drawn over everything, the taskbar included, publishing its own controls; it returns false when it has nothing to draw */
  cover: ((ctx: CanvasRenderingContext2D, W: number, H: number, push: (h: Hit) => void) => boolean) | null = null;
  /** a press the screen does not handle itself (chips, page controls, the original's tag) */
  onPress: ((id: string) => void) | null = null;
  /** the taskbar's date */
  date = S.date;

  // ── the layout ─────────────────────────────────────────────────────────────
  get aiWidth(): number { return this.aiW; }
  /** the AI's pane grows (or is pushed back) to `w` monitor px over `seconds` */
  setAiWidth(w: number, seconds = 0): void {
    if (seconds <= 0) { this.aiW = this.aiTo = this.aiFrom = w; this.aiT = 1; this.version++; return; }
    this.aiFrom = this.aiW; this.aiTo = w; this.aiT = 0; this.aiDur = seconds;
  }
  /** ⚑ S417 — the AI's window on the desktop (L, Second Thoughts; Shepherd's session at the whole width) */
  aiRect(W: number, H: number): Rect { return aiWindow(this.aiW, W, H); }
  /** the page's own area on the right: her world's window, under its title bar */
  pageRect(W: number, H: number): Rect { return contentOf(worldWindow(this.aiW, W, H)); }

  // ── her world ──────────────────────────────────────────────────────────────
  get page(): Page | null { return this.stack[this.stack.length - 1] ?? null; }
  /** the AI opens something on the right (it replaces what is there, or is laid over it with a way back) */
  open(page: Page, over = false): void {
    if (over) this.stack.push(page); else this.stack = [page];
    this.closeOriginal();
    this.version++;
  }
  /** the page's own state changed (a thread opened, a line typed): redraw */
  touch(): void { this.version++; }
  get canGoBack(): boolean { return this.stack.length > 1; }
  back(): boolean { if (this.stack.length <= 1) return false; this.stack.pop(); this.closeOriginal(); this.version++; return true; }
  /** ⚑ S413 (the walk of 4ca2e2d0's dead end) — an original belongs to the page that shows it: when that page goes, it turns
   *  back with it. It was left open behind the Kettle list (pressed again as L's cursor left Dad's thread): the AI's pane
   *  stayed silent for good — the felt law holding over words no longer on the glass — and nothing could be pressed. */
  private closeOriginal(): void { if (this.originalOpen) this.originalOpen = null; }

  // ── the conversation ───────────────────────────────────────────────────────
  // ⚑ S413 (26-14) — a new line no longer pulls the conversation down while the visitor is reading back (chatBack > 0): it
  //   arrives below, the place she is reading stays put (draw keeps it), and the Newest pill says there is more
  say(text: string): void { this.rows.push({ who: 'ai', text }); this.typing = false; this.version++; }
  her(text: string): void { this.rows.push({ who: 'her', text }); this.chatBack = 0; this.version++; }
  note(text: string): void { this.rows.push({ who: 'note', text }); this.version++; }
  /** ⚑ S413 (rule 3) — a Memory note: one small line; a press opens it in place. Returns its id. */
  memory(m: MemoryNote): string {
    const id = `mem-note:${this.memoryCount++}`;
    this.rows.push({ who: 'memory', text: S.memory.updated, mem: m, open: false, id }); this.version++;
    return id;
  }
  toggleMemory(id: string): boolean {
    const r = this.rows.find((x) => x.id === id); if (!r) return false;
    r.open = !r.open; this.version++; return true;
  }
  /** ⚑ S413 (beat 8) — her row's words replaced (the deletion, letter by letter); '' keeps an empty bubble's place */
  setRowText(row: ChatRow, text: string): void { if (row.text !== text) { row.text = text; this.version++; } }
  /** ⚑ S413 (beat 8) — her row becomes the system's small line in its place: it scrolls up with the rest (26-15) */
  unsend(row: ChatRow, line: string): void { row.who = 'unsent'; row.text = line; this.version++; }
  booked(text: string): void { this.rows.push({ who: 'booked', text }); this.version++; }
  /** the conversation is at its newest line (nothing scrolled back) */
  get atNewest(): boolean { return this.chatBack === 0; }
  newest(): void { if (this.chatBack) { this.chatBack = 0; this.version++; } }
  setChips(chips: Chip[], help: string | null = null): void { this.chips = chips; this.help = help; this.version++; }
  clearChips(): void { if (this.chips.length || this.help) { this.chips = []; this.help = null; this.version++; } }
  setTyping(on: boolean): void { if (this.typing !== on) { this.typing = on; this.version++; } }
  /** the conversation is longer than its pane (a wheel or a drag over it scrolls it) */
  get chatScrolls(): boolean { return this.chatMax > 0; }
  /** the visitor's wheel or drag over the conversation: dy > 0 reads on (towards the newest) */
  scrollChat(dy: number): boolean {
    const was = this.chatBack;
    this.chatBack = Math.max(0, Math.min(this.chatMax, this.chatBack - dy));
    if (this.chatBack !== was) { this.version++; return true; }
    return false;
  }

  // ── the voice ──────────────────────────────────────────────────────────────
  /** speak a rendered line (memory only; the switch decides). Returns the clip's own length in seconds, 0 if silent. */
  speak(audio: string | undefined, seconds: number | undefined, force = false): number {
    if (!audio || !(this.voiceOn || force)) return 0;
    this.stopVoice();
    this.clip = playOnce(audio);
    return this.clip ? (seconds ?? 0) : 0;
  }
  stopVoice(): void { if (this.clip) { stopClip(this.clip); this.clip = null; } }
  /** a line is being spoken now */
  get speaking(): boolean { return !!this.clip && !this.clip.paused && !this.clip.ended; }
  toggleVoice(): void {
    this.voiceOn = !this.voiceOn;
    if (!this.voiceOn) this.stopVoice();
    playOnce('ui_press.mp3');
    this.version++;
  }

  // ── the AI's cursor ────────────────────────────────────────────────────────
  /** the AI's own mint cursor moves to (x, y) on the monitor over `seconds` (it appears where it was, or at the pane) */
  moveCursor(x: number, y: number, seconds: number): void {
    const c = this.cur;
    if (!c.on) { c.x = this.aiW - 20; c.y = 70; c.on = true; }
    c.fx = c.x; c.fy = c.y; c.tx = Math.round(x); c.ty = Math.round(y); c.t = 0; c.dur = Math.max(0.05, seconds);
    this.version++;
  }
  get cursorArrived(): boolean { return this.cur.t >= 1; }
  /** the AI's press: a ring at the cursor for a moment */
  clickCursor(): void { this.cur.flash = 0.3; playOnce('ui_press.mp3'); this.version++; }
  hideCursor(): void { if (this.cur.on) { this.cur.on = false; this.version++; } }
  get cursorOn(): boolean { return this.cur.on; }

  /** where a page publishes the target of a press the AI will make (monitor coordinates); kept from the last draw */
  private anchors = new Map<string, Rect>();
  anchor(id: string, r: Rect): void { this.anchors.set(id, r); }
  anchorOf(id: string): Rect | null { return this.anchors.get(id) ?? null; }

  // ── the clock ──────────────────────────────────────────────────────────────
  update(dt: number): void {
    const stepOf = (t: number): number => Math.floor(t * ANIM_HZ);
    const before = this.animClock;
    this.animClock += dt;
    const tick = stepOf(before) !== stepOf(this.animClock);
    if (this.aiT < 1) {
      this.aiT = Math.min(1, this.aiT + dt / Math.max(0.01, this.aiDur));
      const k = this.aiT * this.aiT * (3 - 2 * this.aiT);
      const w = Math.round(this.aiFrom + (this.aiTo - this.aiFrom) * k);
      if (w !== this.aiW && (tick || this.aiT >= 1)) { this.aiW = this.aiT >= 1 ? this.aiTo : w; this.version++; }
    }
    const c = this.cur;
    if (c.on && c.t < 1) {
      c.t = Math.min(1, c.t + dt / c.dur);
      if (tick || c.t >= 1) {
        const k = c.t * c.t * (3 - 2 * c.t);
        c.x = Math.round(c.fx + (c.tx - c.fx) * k); c.y = Math.round(c.fy + (c.ty - c.fy) * k);
        this.version++;
      }
    }
    if (c.flash > 0) { c.flash = Math.max(0, c.flash - dt); if (c.flash === 0) this.version++; }
    if (this.clip && (this.clip.ended || this.clip.paused) && this.clip.currentTime > 0) this.clip = null;
    // ⚑ S417 — the desktop's own clock (a notification's slide-in steps at ANIM_HZ; the dock's reason goes after its time)
    this.desk.hush = this.hush || this.originalShown || this.typing || this.speaking || this.coverOn;
    const dv = this.desk.version;
    this.desk.update(dt, ANIM_HZ);
    if (this.desk.version !== dv) this.version++;
  }
  /** ⚑ S417 — a notification, at the top right (one at a time; it waits while anything else has the floor) */
  notify(app: Tile26, title: string, text: string, seconds = OS.notes.seconds, tone?: 'st'): void { this.desk.notify({ app, title, text, seconds, tone }); }
  /** ⚑ S417 — which skin the desktop wears (the acts say when a product arrives and falls) */
  setSkin(skin: Desk26['skin']): void { this.desk.setSkin(skin); this.version++; }
  /** ⚑ S418 — THE BRANDS FALL (her Yes): the show's chrome is gone, then the yellow left under it, then the last of it torn off,
   *  then the plain OS — a step every 0.4 s (2.5 changes a second); reduced motion: a cut to the plain OS */
  fallToPlain(): void { this.stickers = []; this.desk.fall(['secondThoughts', 'peel', 'plain'], 0.4); this.version++; }

  // ── the picture ────────────────────────────────────────────────────────────
  /**
   * ⚑ S417 (UiB job 34 Part A) — THE SCREEN IS A DESKTOP NOW (desk26.ts): the wallpaper; her world's window on the right and
   * the AI's window on the left, in job 33's places and widening as before (aiWidth: 214 → 340 → the whole glass → 240); the
   * menu bar with the Menu button over them; the dock at the foot; one notification at the top right. Job 33's frame (the V3
   * desk, the title bars, the thin taskbar) is retired whole; it is kept in git at bfad99bd (lScreen.ts `draw`/`drawAi`).
   */
  draw(ctx: CanvasRenderingContext2D, W: number, H: number, pressable: boolean): Hit[] {
    this.controls = [];
    this.anchors.clear();
    const push = (h: Hit): void => { if (pressable) this.controls.push(h); };
    // ⚑ S415 — the stream (and the dark after it) has the whole glass: nothing of the desktop under it
    this.coverOn = !!this.cover && this.cover(ctx, W, H, push);
    if (this.coverOn) return this.controls;
    const api: SeamApi = { W, H, desk: this.desk, push };
    drawWallpaper(ctx, api);
    // ── her world (drawn first: a wide AI window covers its place) ──
    const ww = worldWindow(this.aiW, W, H);
    if (ww.w > 60) this.drawWorld(ctx, ww, pressable, push, api);
    // ── the AI (⚑ S414: or what has taken its window over: Shepherd's session, at the whole width) ──
    const aw = aiWindow(this.aiW, W, H);
    this.fullOn = false;
    if (this.full) {
      ctx.save(); rr(ctx, aw.x, aw.y, aw.w, aw.h, WIN_RADIUS); ctx.clip();
      this.fullOn = this.full(ctx, aw, push);
      ctx.restore();
      if (this.fullOn) softShadow(ctx, aw, WIN_RADIUS);
    }
    if (!this.fullOn) this.drawAi(ctx, aw, push, api);
    // ── the menu bar (the Menu button, the app in front, the clock) and the dock ──
    // ⚑ S418 — the menu bar wears the brand in front: L's ✦ and its boast (Act I); Second Thoughts' name and claim, and her
    //   greyed way back while it uses her computer (Act II: job 33's banner, moved here from her world's title); Shepherd
    //   Live™'s LIVE dot and its name (Act III). The plain OS: the app's name and nothing else.
    const skin = this.desk.skin, B = BRAND;
    const bar: MenuBar26 = {
      app: skin === 'secondThoughts' ? B.st.name : skin === 'shepherd' ? (this.fullOn ? SHEPHERD_NAME.toUpperCase() : B.st.name) : this.name,
      menus: OS.menus, status: OS.status, date: this.date, menuOpen: this.menuOpen,
      appMark: skin === 'l' ? 'spark' : skin === 'shepherd' && this.fullOn ? 'live' : null,
      claim: skin === 'secondThoughts' ? B.st.using : null,
      boast: skin === 'l' ? B.l.boast : null,
      control: skin === 'secondThoughts' && this.banner ? this.banner.control : null
    };
    this.statusX = drawMenuBar(ctx, bar, api).statusX;
    drawDock(ctx, this.dockApps(), api);
    // ── the one notification, in her world's title band (never over the words under it) ──
    if (ww.w > 60) drawNote(ctx, { x: ww.x, y: ww.y, w: ww.w, h: TITLE_H }, this.desk);
    if (this.overlayTop) this.overlayTop(ctx, W, H);
    // ── the AI's cursor, over everything ──
    if (this.cur.on) drawCursor(ctx, this.cur.x, this.cur.y, this.cur.flash > 0, this.cursorLabel, W, this.desk.skin === 'secondThoughts');
    return this.controls;
  }

  /** her world's window: its title (the back arrow, what is open), the AI's banner over it while it uses her computer, the page */
  private drawWorld(ctx: CanvasRenderingContext2D, ww: Rect, pressable: boolean, push: (h: Hit) => void, api: SeamApi): void {
    const page = this.page, L = look26(this.desk.skin);
    let tx = drawWindow(ctx, ww, { title: '' }, api);
    if (this.canGoBack) {
      setFont(ctx, 12);
      const label = `‹ ${S.back}`, bw = Math.ceil(ctx.measureText(label).width) + 16;
      if (this.visitorBack) edgeRR(ctx, tx, ww.y + 3, bw, TITLE_H - 6, 8, L.winEdge === L.winTitle ? L.winInk : L.winEdge, L.winTitle === OS26.winTitle ? OS26.win : L.winTitle);
      ctx.fillStyle = this.visitorBack || L.winTitle !== OS26.winTitle ? L.winInk : L.winInk2; ctx.fillText(label, tx + 8, ww.y + 5);
      this.anchor('page-back', { x: tx, y: ww.y + 3, w: bw, h: TITLE_H - 6 });
      if (this.visitorBack) push({ x: tx, y: ww.y + 1, w: bw, h: TITLE_H - 2, id: 'page-back' });
      tx += bw + 8;
    }
    if (page?.title) { setFont(ctx, 12); ctx.fillStyle = L.winInk; ctx.fillText(fit26(ctx, page.title, ww.x + ww.w - tx - 10), tx, ww.y + 5); }
    // ⚑ S413 (beat 6) — the AI is using her computer. ⚑ S418: its banner is the menu bar's now (Second Thoughts' yellow bar:
    //   "SECOND THOUGHTS™ · is using your computer", her greyed way back at its right); her world's title band is its yellow
    //   already, and carries the AI's mark at its right while it works there
    if (this.banner) assistantMark(ctx, ww.x + ww.w - 24, ww.y + 4, 15, L.winInk, L.winTitle);
    const pr = contentOf(ww);
    ctx.save(); rr(ctx, ww.x + 1, ww.y + 1, ww.w - 2, ww.h - 2, WIN_RADIUS - 1); ctx.clip();
    ctx.beginPath(); ctx.rect(pr.x, pr.y, pr.w, pr.h); ctx.clip();
    // ⚑ S418 — under Second Thoughts her world's window is its dark too, wherever her own app does not lay its own ground
    px(ctx, pr.x, pr.y, pr.w, pr.h, this.desk.skin === 'secondThoughts' ? OS26.stGround : OS26.winSide);
    const draw = page ? PAGES.get(page.kind) : undefined;
    if (page && draw) draw(ctx, pr, page, { screen: this, control: (h) => { if (this.pagePressable) push(h); }, pressable: pressable && this.pagePressable });
    ctx.restore();
  }

  /**
   * ⚑ S417 — L AS A MODERN AI CHAT APP, inside its window: the title (its mark, its name and line — job 33's, which change as
   * the products arrive — and the voice switch); its chat list (a column when the window is wide, a strip of chats under the
   * title when it is narrow; L's own: gone while Second Thoughts or Shepherd have it); then the conversation, which opens on
   * the model chip and a big greeting and scrolls; the answers as rounded chips; the line under them; and the composer, "Ask L
   * anything", which shows her words when they are typed for her and never takes the keyboard.
   */
  private drawAi(ctx: CanvasRenderingContext2D, r: Rect, push: (h: Hit) => void, api: SeamApi): void {
    iconLocked = this.originalStage === 'locked';
    if (r.w <= 0) return;
    const P = AI_LOOKS[this.desk.skin];
    lockInk = P.lock;
    const tx = drawWindow(ctx, r, { title: '', ai: true }, api);
    // ── the title: the mark, the name and its line (job 33's: they change as the products arrive and fall) ──
    const sx = r.x + r.w;
    assistantMark(ctx, tx, r.y + 4, 15, P.titleMark, P.titleMarkInk);
    setFont(ctx, 12);
    const nameW = sx - 8 - (tx + 20);
    const name = fitTo(ctx, this.name, nameW);
    ctx.fillStyle = P.title; ctx.fillText(name, tx + 20, r.y + 5);
    const nw = Math.ceil(ctx.measureText(name).width);
    setFont(ctx, 11);
    if (nameW - nw - 10 > 40) { ctx.fillStyle = P.title2; ctx.fillText(fitTo(ctx, this.sub, nameW - nw - 10), tx + 28 + nw, r.y + 6); }
    // ── the body ──
    const body = contentOf(r);
    ctx.save(); rr(ctx, r.x + 1, r.y + 1, r.w - 2, r.h - 2, WIN_RADIUS - 1); ctx.clip();
    px(ctx, body.x, body.y, body.w, body.h, P.ground);
    ctx.restore();
    const own = this.desk.skin === 'l' || this.desk.skin === 'plain';
    let left = body.x, width = body.w, top = body.y;
    if (own && body.w >= SIDEBAR_MIN) { this.drawChatColumn(ctx, { x: body.x, y: body.y, w: SIDEBAR_W, h: body.h }); left += SIDEBAR_W; width -= SIDEBAR_W; }
    else if (own) { this.drawChatStrip(ctx, { x: body.x, y: body.y, w: body.w, h: STRIP_H }); top += STRIP_H; }
    const cx = left + PAD, cw = width - 2 * PAD;
    // ⚑ S418 — Second Thoughts' head: its wellbeing score (the dial) and its achievement stickers, fixed above the conversation
    //   (its instruments: the sharpest things in the era). They are its own; nothing of them is ever drawn on a person's words.
    if (this.desk.skin === 'secondThoughts' && !this.aiOverlay) {
      const hh = scoreHeight(ctx, cw, this.stickers);
      drawScore(ctx, cx, top + 8, cw, this.stickers);
      top += hh;
      px(ctx, body.x + 6, top - 4, body.w - 12, 1, OS26.stPanel2);
    }
    // the foot: the composer; the line under the answers; the answers
    const composerY = body.y + body.h - 7 - COMPOSER_H;
    let foot = composerY - 6;
    const helpLines = this.help ? wrapRich(ctx, this.help, cw, 11) : [];
    foot -= helpLines.length * 13;
    const helpY = foot;
    if (helpLines.length) foot -= 5;
    // the answers: rounded chips, flowed left to right, wrapping (a long answer takes its own row). ⚑ S418 — L's offered
    //   answers carry its ✦ (drawn before the words); a chip that is her own words carries nothing
    const sparkW = (c: Chip): number => (P.spark && c.kind !== 'hers' && (c.kind ?? (this.chips.indexOf(c) === 0 ? 'primary' : 'quiet')) === 'primary' ? 16 : 0);
    setFont(ctx, 13);
    const chipRows: { id: string; w: number }[][] = [];
    for (const c of this.chips) {
      const w = Math.min(cw, Math.ceil(ctx.measureText(c.label).width) + 30 + sparkW(c));
      const row = chipRows[chipRows.length - 1];
      const used = row ? row.reduce((a, x) => a + x.w + 6, 0) : 0;
      if (row && used + w <= cw) row.push({ id: c.id, w }); else chipRows.push([{ id: c.id, w }]);
    }
    const chipRects: Hit[] = [];
    if (chipRows.length) {
      foot -= chipRows.length * CHIP_H + (chipRows.length - 1) * 6;
      chipRows.forEach((row, i) => { let x = cx; for (const c of row) { chipRects.push({ x, y: foot + i * (CHIP_H + 6), w: c.w, h: CHIP_H, id: c.id }); x += c.w + 6; } });
      foot -= 6;
    }
    const chatTop = top + 4, chatBottom = foot;
    this.aiStage = { x: left, y: top, w: width, h: Math.max(0, chatBottom - top) };
    // ── the conversation, newest at the foot, older lines rising out of view (scrollable back) ──
    ctx.save(); ctx.beginPath(); ctx.rect(left, top, width, Math.max(0, chatBottom - top)); ctx.clip();
    if (this.aiOverlay) this.aiOverlay(ctx, this.aiStage);
    else {
      const laid: { row: ChatRow | null; kind?: 'chip' | 'hello'; lines: Line[]; h: number }[] = [];
      // the head of the conversation (L's own): its model chip, and the big greeting
      if (own) {
        laid.push({ row: null, kind: 'chip', lines: wrapRich(ctx, OS.model, cw, 11), h: 20 });
        ctx.font = newsFor(GREET, false);
        laid.push({ row: null, kind: 'hello', lines: [], h: this.greetingLines(ctx, cw).length * (GREET + 4) + 2 });
      }
      for (const row of this.rows) {
        if (row.who === 'memory') { laid.push({ row, lines: [], h: row.open ? 16 + 3 * 14 + 4 : 14 }); continue; }
        if (row.who === 'booked') { laid.push({ row, lines: [], h: 24 }); continue; }
        const size = row.who === 'ai' ? 14 : row.who === 'her' ? 13 : 11;
        const lines = wrapRich(ctx, row.text, row.who === 'her' ? cw - 34 : row.who === 'unsent' ? cw - 20 : cw, size);
        const h = row.who === 'her' ? Math.max(1, lines.length) * HER_LINE + 10 : row.who === 'note' || row.who === 'unsent' ? lines.length * 14 + 2 : lines.length * LINE;
        laid.push({ row, lines, h });
      }
      const typingH = this.typing ? 20 : 0;
      const total = laid.reduce((a, l) => a + l.h + 8, 0) + typingH;
      // ⚑ S413 (26-14) — reading back: what arrived below since the last draw does not move the lines she is reading
      if (this.chatBack > 0 && total > this.chatTotal && this.chatTotal > 0) this.chatBack += total - this.chatTotal;
      this.chatTotal = total;
      this.chatMax = Math.max(0, total - (chatBottom - chatTop - 8));
      this.chatBack = Math.min(this.chatBack, this.chatMax);
      // a short conversation sits under its head (the greeting at the top, as an empty chat opens); a long one keeps its newest
      //   line at the foot
      let y = this.chatMax > 0 ? chatBottom - 4 - total + this.chatBack : chatTop + 4;
      for (const { row, kind, lines, h } of laid) {
        if (y + h > top - 40 && y < chatBottom + 20) {
          if (kind === 'chip') {
            // ⚑ S418 — the model chip, polished: L's mint into a pale sky, a hairline of light along its top
            setFont(ctx, 11);
            const w = Math.min(cw, Math.ceil(lines[0]?.w ?? 0) + 18);
            if (P.spark) {
              const g = ctx.createLinearGradient(cx, 0, cx + w, 0); g.addColorStop(0, WEB.accentSoft); g.addColorStop(1, P.chip);
              rr(ctx, cx, y, w, 19, 9.5); ctx.fillStyle = g; ctx.fill();
              rr(ctx, cx + 0.5, y + 0.5, w - 1, 18, 9); ctx.strokeStyle = P.chipEdge; ctx.lineWidth = 1; ctx.stroke();
              px(ctx, cx + 8, y + 2, w - 16, 1, OS26.win);
            } else edgeRR(ctx, cx, y, w, 19, 9.5, P.chipEdge, P.chip);
            if (lines[0]) drawLine(ctx, lines[0], cx + 9, y + 3, 11, P.chipInk);
          } else if (kind === 'hello') {
            this.drawGreeting(ctx, cx, y, cw, P.spark);
          } else if (row && row.who === 'her') {
            const bw = Math.min(cw - 30, Math.max(0, ...lines.map((l) => l.w)) + 22), bx = cx + cw - bw;
            fillRR(ctx, bx, y, bw, h, 12, KETTLE.mine);
            lines.forEach((l, i) => drawLine(ctx, l, bx + 11, y + 5 + i * HER_LINE, 13, WEB.ink));
          } else if (row && row.who === 'memory') {
            // ⚑ S413 (rule 3) — Memory: one small line, its own mark; open, the three lines of what it keeps and for whom
            const M = S.memory, m = row.mem!;
            assistantMark(ctx, cx, y + 1, 11, P.mark, P.markInk);
            setFont(ctx, 11); ctx.fillStyle = P.memInk;
            const lab = row.open ? M.updated : `${M.updated} ›`, lw = Math.ceil(ctx.measureText(lab).width);
            ctx.fillText(lab, cx + 15, y);
            if (row.id) push({ x: cx - 2, y: y - 4, w: lw + 24, h: row.open ? h + 4 : 21, id: row.id });
            if (row.open) {
              const kx = cx + 15, kw = cw - 15;
              edgeRR(ctx, kx - 6, y + 15, kw + 6, 3 * 14 + 4, 7, P.memEdge, P.memBox);
              const line3 = (k: string, v: string, yy: number): void => {
                setFont(ctx, 11); ctx.fillStyle = P.memKey; const kw2 = Math.ceil(ctx.measureText(`${k} · `).width);
                ctx.fillText(`${k} · `, kx, yy);
                ctx.fillStyle = P.memVal; ctx.fillText(fitTo(ctx, v, kw - kw2 - 6), kx + kw2, yy);
              };
              line3(M.memory, m.memory, y + 18); line3(M.usedFor, m.usedFor, y + 32); line3(M.sharedWith, m.sharedWith, y + 46);
            }
          } else if (row && row.who === 'unsent') {
            // ⚑ S413 (beat 8; 26-15) — where her words were: the system's line, small, on her side, a red ring; it scrolls up
            //   with the conversation (it is never left in the box)
            const lw = Math.max(0, ...lines.map((l) => l.w)), lx = cx + cw - lw;
            roundRect(ctx, lx - 16, y + 1, 11, 11, 5, P.alarm);
            px(ctx, lx - 11, y + 3, 1, 4, WEB.card); px(ctx, lx - 11, y + 8, 1, 2, WEB.card);
            lines.forEach((l, i) => drawLine(ctx, l, lx + (lw - l.w), y + 1 + i * 14, 11, P.alarm));
          } else if (row && row.who === 'booked') {
            setFont(ctx, 12);
            const bw = Math.ceil(ctx.measureText(row.text).width) + 22;
            pill(ctx, cx, y, bw, 22, P.booked);
            ctx.fillStyle = P.bookedInk; ctx.fillText(row.text, cx + 11, y + 5);
          } else if (row && row.who === 'note') {
            lines.forEach((l, i) => drawLine(ctx, l, cx, y + 1 + i * 14, 11, P.ink2));
          } else {
            lines.forEach((l, i) => drawLine(ctx, l, cx, y + i * LINE, 14, P.ink));
          }
        }
        y += h + 8;
      }
      if (this.typing) { for (let i = 0; i < 3; i++) fillRR(ctx, cx + i * 10, y + 6, 7, 7, 3.5, P.dots); }
    }
    ctx.restore();
    // ⚑ S413 (26-14) — she has scrolled back: a small pill at the conversation's foot returns her to the newest line
    if (!this.aiOverlay && this.chatBack > 0) {
      setFont(ctx, 11);
      const lab = `${S.newest} ↓`, nw = Math.ceil(ctx.measureText(lab).width) + 18, nx = cx + cw - nw, ny = chatBottom - 23;
      pill(ctx, nx, ny, nw, 19, P.primary); ctx.fillStyle = P.primaryInk; ctx.fillText(lab, nx + 9, ny + 3);
      push({ x: nx - 2, y: ny - 3, w: nw + 4, h: 25, id: 'chat-newest' });
    }
    // ⚑ S417 — the composer: "Ask L anything" (or the act's own word for it), her words as they are typed in for her (beat 8:
    //   the chip types them), and its send button. It is never typed into: it publishes nothing.
    // ⚑ S417 — the voice switch sits beside the composer (the period's voice button; job 33's `l-voice`, moved on the glass)
    let fw = cw;
    if (this.voiceSwitch) {
      setFont(ctx, 11);
      const word = this.voiceOn ? S.voiceOn : S.voiceOff;
      const vw = 22 + Math.ceil(ctx.measureText(word).width) + 10, vx = cx + cw - vw, vy = composerY + 2, vh = COMPOSER_H - 4;
      edgeRR(ctx, vx, vy, vw, vh, vh / 2, P.voiceEdge, this.voiceOn ? P.voiceOn : P.voice);
      speakerIcon(ctx, vx + 7, vy + 7, this.voiceOn ? P.voiceInk : P.ink2, this.voiceOn);
      ctx.fillStyle = this.voiceOn ? P.voiceInk : P.ink2; ctx.fillText(word, vx + 22, vy + 5);
      push({ x: vx - 3, y: composerY - 3, w: vw + 6, h: COMPOSER_H + 6, id: 'l-voice' });
      this.anchor('l-voice', { x: vx, y: vy, w: vw, h: vh });
      fw = cw - vw - 6;
    }
    edgeRR(ctx, cx, composerY, fw, COMPOSER_H, COMPOSER_H / 2, OS26.winEdge, OS26.win);
    const t = this.composerText;
    setFont(ctx, 12);
    if (t) {
      const shown = fitTo(ctx, t, fw - 40, true);
      ctx.fillStyle = WEB.ink; ctx.fillText(shown, cx + 12, composerY + 7);
      if (this.composerCaret) px(ctx, cx + 13 + Math.ceil(ctx.measureText(shown).width), composerY + 6, 1, 16, WEB.ink);
    } else { ctx.fillStyle = OS26.winInk2; ctx.fillText(fitTo(ctx, this.composer ?? OS.composer, fw - 40), cx + 12, composerY + 7); }
    const bx = cx + fw - COMPOSER_H + 3, by = composerY + 3, bd = COMPOSER_H - 6;
    fillRR(ctx, bx, by, bd, bd, bd / 2, t ? P.send : OS26.winEdge);
    ctx.strokeStyle = t ? P.sendInk : OS26.win; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(bx + bd / 2, by + bd - 6); ctx.lineTo(bx + bd / 2, by + 6); ctx.moveTo(bx + bd / 2 - 4, by + 10); ctx.lineTo(bx + bd / 2, by + 6); ctx.lineTo(bx + bd / 2 + 4, by + 10); ctx.stroke();
    ctx.lineCap = 'butt';
    // the answers
    this.chips.forEach((c) => {
      const h = chipRects.find((x) => x.id === c.id); if (!h) return;
      const i = this.chips.indexOf(c);
      const hers = c.kind === 'hers';
      const primary = !hers && (c.kind ?? (i === 0 ? 'primary' : 'quiet')) === 'primary';
      // ⚑ S418 — a chip that carries her own words is hers: the OS's plain white, no brand (felt stays bare)
      if (hers) edgeRR(ctx, h.x, h.y, h.w, h.h, h.h / 2, OS26.winEdge, OS26.win);
      else if (primary && P.primaryHi) {
        // L's gloss: its mint into its deep green, a sheen on the upper half, a glow around it
        softShadow(ctx, h, h.h / 2, 0.8, P.primary);
        const g = ctx.createLinearGradient(0, h.y, 0, h.y + h.h); g.addColorStop(0, P.primaryHi); g.addColorStop(1, P.primary);
        rr(ctx, h.x, h.y, h.w, h.h, h.h / 2); ctx.fillStyle = g; ctx.fill();
        fillRR(ctx, h.x + 6, h.y + 2, h.w - 12, Math.round(h.h * 0.38), h.h * 0.3, alpha(OS26.win, 0.22));
      } else if (primary) fillRR(ctx, h.x, h.y, h.w, h.h, h.h / 2, P.primary);
      else edgeRR(ctx, h.x, h.y, h.w, h.h, h.h / 2, P.quietEdge, P.quiet);
      setFont(ctx, 13);
      const sw = sparkW(c);
      const label = fitTo(ctx, c.label, h.w - 20 - sw);
      const lines = wrapRich(ctx, label, 9999, 13);
      const tw = (lines[0]?.w ?? 0) + sw;
      const lx = h.x + Math.round((h.w - tw) / 2);
      if (sw) starIcon(ctx, lx, h.y + 6, 12, primary ? P.primaryInk : P.mark);
      if (lines[0]) drawLine(ctx, lines[0], lx + sw, h.y + 6, 13, hers ? WEB.ink : primary ? P.primaryInk : P.quietInk);
      push(h);
      this.anchor(c.id, h);
    });
    helpLines.forEach((l, i) => drawLine(ctx, l, cx, helpY + i * 13, 11, P.ink2));
  }

  /** the big greeting's lines at this width (the serif of the period's chat apps; its ✦ drawn) */
  private greetingLines(ctx: CanvasRenderingContext2D, w: number): string[] {
    const words = OS.greeting.replace('✦', '').trim().split(' ');
    const out: string[] = []; let line = '';
    for (const wd of words) { const t = line ? `${line} ${wd}` : wd; if (ctx.measureText(t).width > w - 22 && line) { out.push(line); line = wd; } else line = t; }
    if (line) out.push(line);
    return out;
  }
  private drawGreeting(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, gloss = false): void {
    ctx.font = newsFor(GREET, false); ctx.textBaseline = 'top';
    const lines = this.greetingLines(ctx, w);
    lines.forEach((l, i) => { ctx.fillStyle = OS26.winInk; ctx.fillText(l, x, y + i * (GREET + 4)); });
    const last = lines[lines.length - 1] ?? '';
    const lx = x + Math.ceil(ctx.measureText(last).width) + 5, ly = y + (lines.length - 1) * (GREET + 4) + 1;
    if (iconLocked) { starIcon(ctx, lx, ly, 15, WEB.faint); padlockIcon(ctx, lx + 8, ly + 7, CHROME.ink); }
    else {
      starIcon(ctx, lx, ly, 15, AI.mark);
      // ⚑ S418 — L's gloss: two small sparks beside its ✦, one of them gold (still: a card does not glitter on its own)
      if (gloss) { starIcon(ctx, lx + 15, ly - 4, 7, OS26.lGold); starIcon(ctx, lx + 16, ly + 9, 5, AI.mark); }
    }
  }
  /** ⚑ S417 — L's chat list as a column (a wide window) */
  private drawChatColumn(ctx: CanvasRenderingContext2D, r: Rect): void {
    const C = OS.chats;
    ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    px(ctx, r.x, r.y, r.w, r.h, OS26.winSide);
    px(ctx, r.x + r.w - 1, r.y, 1, r.h, OS26.winRule);
    let y = r.y + 8;
    edgeRR(ctx, r.x + 7, y, r.w - 14, 21, 7, OS26.winEdge, OS26.win);
    setFont(ctx, 11); ctx.fillStyle = OS26.winInk; ctx.fillText(fitTo(ctx, `✎ ${C.newChat}`, r.w - 28), r.x + 14, y + 4);
    y += 31;
    const group = (head: string, items: string[]): void => {
      setFont(ctx, 11); ctx.fillStyle = OS26.menuQuiet; ctx.fillText(head, r.x + 10, y); y += 16;
      for (const it of items) {
        const on = it === C.live;
        if (on) fillRR(ctx, r.x + 5, y - 3, r.w - 10, 19, 6, OS26.winSideOn);
        setFont(ctx, 11); ctx.fillStyle = on ? OS26.winInk : OS26.winInk2; ctx.fillText(fitTo(ctx, it, r.w - 22), r.x + 11, y);
        y += 20;
      }
      y += 6;
    };
    group(C.today, C.todayList);
    group(C.yesterday, C.yesterdayList);
    ctx.restore();
  }
  /** ⚑ S417 — L's chat list as a strip under the title (a narrow window): the live chat first, the others after it */
  private drawChatStrip(ctx: CanvasRenderingContext2D, r: Rect): void {
    const C = OS.chats;
    px(ctx, r.x, r.y, r.w, r.h, OS26.winSide);
    px(ctx, r.x, r.y + r.h - 1, r.w, 1, OS26.winRule);
    // the live chat first, then last night's search, then the rest; only whole names, and a count of those left over
    const items = [C.live, ...C.yesterdayList, ...C.todayList.filter((x) => x !== C.live)];
    let x = r.x + 6, shown = 0;
    setFont(ctx, 11);
    for (const it of items) {
      const w = Math.ceil(ctx.measureText(it).width) + 14;
      const left = items.length - shown - 1;
      if (x + w > r.x + r.w - 6 - (left ? 24 : 0)) break;
      const on = it === C.live;
      if (on) fillRR(ctx, x, r.y + 2, w, r.h - 5, 7, OS26.winSideOn);
      ctx.fillStyle = on ? OS26.winInk : OS26.winInk2; ctx.fillText(it, x + 7, r.y + 3);
      x += w + 2; shown++;
    }
    if (shown < items.length) { ctx.fillStyle = OS26.menuQuiet; ctx.fillText(`+${items.length - shown}`, x + 4, r.y + 3); }
  }
  /** ⚑ S417 — the dock: which of her apps are open (a dot), and which she can reach now (the rest are dimmed and say why) */
  dockApps(): DockApp[] {
    const right = appOf(this.page?.kind ?? '');
    const skin = this.desk.skin;
    const mine: DockApp[] = APPS26.map((app) => ({ app, label: OS.apps[app], open: !this.fullOn && skin !== 'secondThoughts' && (app === 'l' || app === right), reachable: this.reach(app) }));
    // ⚑ S418 — the products put themselves in her dock, first: Second Thoughts from its arrival (Act II), Shepherd Live™ beside
    //   it while its session runs (Act III); her own apps dim under them (and say why, pressed)
    const brands: DockApp[] = [];
    if (skin === 'secondThoughts' || skin === 'shepherd') brands.push({ app: 'st', label: BRAND.st.name, open: skin === 'secondThoughts', reachable: true });
    if (skin === 'shepherd') brands.push({ app: 'shepherd', label: SHEPHERD_NAME, open: true, reachable: true });
    return [...brands, ...mine];
  }
  /** an app she can reach now: one that is open (a press brings it forward: it is already there), and Search while a story is
   *  open over it (a press is the back arrow's, which job 33 lets her press). Nothing while the AI uses her computer. */
  private reach(app: Tile26): boolean {
    if (app === 'st' || app === 'shepherd') return true;
    // ⚑ S418 — while Second Thoughts is on, her apps are its: dimmed, and pressed they say so
    if (this.desk.skin === 'secondThoughts') return false;
    if (this.fullOn || this.banner || !this.pagePressable) return false;
    if (app === 'l') return true;
    const right = appOf(this.page?.kind ?? '');
    if (app === right) return true;
    return false;
  }
  /** why an app cannot be reached, in the voice of whatever is in front */
  private whyNot(): string { return OS.why[this.desk.skin] ?? OS.why.l; }
  /** ⚑ S417 — a dock press (or the Menu's app row): it brings the app forward where she may, says why where she may not, and
   *  never moves the story (it is not handed to the script) */
  pressApp(app: Tile26): void {
    playOnce('ui_press.mp3');
    if (!this.reach(app)) { this.desk.showTip(app, this.whyNot()); this.version++; return; }
    if (app === 'search' && this.page?.kind === 'story' && this.visitorBack && this.stack[0]?.kind === 'search') { this.back(); return; }
    this.version++;
  }

  /** the Original ✦'s tag under a message the AI changed, in this act's stage; returns its height (0: no tag) */
  drawOriginalTag(ctx: CanvasRenderingContext2D, x: number, y: number, id: string, api: PageApi): number {
    if (this.originalStage === 'gone') return 0;
    const open = this.originalOpen === id;
    const locked = this.originalStage === 'locked';
    const word = locked ? S.original.locked : open ? S.original.turnBack : S.original.told;
    setFont(ctx, 10);
    const w = Math.ceil(ctx.measureText(word).width) + 30, h = 18;
    roundEdge(ctx, x, y, w, h, 9, locked ? WEB.faint : AI.edge, locked ? V3.page : AI.ground);
    if (locked) padlockIcon(ctx, x + 7, y + 4, CHROME.ink); else starIcon(ctx, x + 6, y + 3, 11, AI.mark);
    ctx.fillStyle = locked ? CHROME.ink : AI.ink; ctx.fillText(word, x + 22, y + 4);
    if (!locked && this.originalStage !== 'restored') {
      api.control({ x: x - 4, y: y - 4, w: w + 8, h: h + 8, id: open ? `orig-back:${id}` : `orig:${id}` });
      this.anchor(`orig:${id}`, { x, y, w, h });
    }
    return h;
  }
  /** a person's own words are on the glass: the AI's pane says nothing (the felt law in an era where the AI reads everything) */
  get originalShown(): boolean { return this.originalOpen !== null; }

  /** a press on the monitor (monitor coordinates): the switch and the back arrow are the screen's; the rest go to `onPress` */
  press(x: number, y: number): string | null {
    const h = [...this.controls].reverse().find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    if (!h) return null;
    if (h.id === 'l-voice') { this.toggleVoice(); return h.id; }
    if (h.id === 'page-back') { if (this.visitorBack && this.back()) playOnce('ui_press.mp3'); return h.id; }
    // ⚑ S413 — a Memory note opens (or folds) in place; Newest returns the conversation to its last line
    if (h.id.startsWith('mem-note:')) { if (this.toggleMemory(h.id)) playOnce('ui_press.mp3'); return h.id; }
    if (h.id === 'chat-newest') { this.newest(); playOnce('ui_press.mp3'); return h.id; }
    // ⚑ S417 — the dock: a reader's press, handled here and never handed to the script (it cannot move a beat)
    if (h.id.startsWith('dock:')) { this.pressApp(h.id.slice(5) as Tile26); return h.id; }
    this.onPress?.(h.id);
    return h.id;
  }
  /** the conversation scrolls under this point */
  chatAt(x: number, y: number, _H: number): boolean { const r = this.aiStage; return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h; }
}

/** ⚑ S417 — which of her apps a page on the right belongs to (the dock's dot; the app she may bring forward) */
export function appOf(kind: string): App26 | null {
  if (kind === 'kettle' || kind === 'thread' || kind === 'junie' || kind === 'junieLink') return 'kettle';
  if (kind === 'inbox' || kind === 'mail') return 'lark';
  if (kind === 'search' || kind === 'story') return 'search';
  if (kind === 'card' || kind === 'week' || kind === 'added' || kind === 'review') return 'l';
  return null;
}

/** a line that does not fit ends in an ellipsis (or, `tail`, shows its end: a box being typed into keeps the caret in view) */
function fitTo(ctx: CanvasRenderingContext2D, text: string, w: number, tail = false): string {
  if (ctx.measureText(text).width <= w) return text;
  if (tail) { let k = 0; while (k < text.length && ctx.measureText(`…${text.slice(k)}`).width > w) k++; return `…${text.slice(k)}`; }
  let n = text.length; while (n > 0 && ctx.measureText(`${text.slice(0, n).trimEnd()}…`).width > w) n--; return `${text.slice(0, n).trimEnd()}…`;
}

// ── type with icons in it (✦ and 🔈 are drawn, not left to a font) ───────────
interface Piece { text: string; icon?: 'star' | 'speaker' }
interface Line { pieces: Piece[]; w: number }
const ICON_W = 13;
function pieceW(ctx: CanvasRenderingContext2D, p: Piece): number { return p.icon ? ICON_W : ctx.measureText(p.text).width; }
function splitIcons(word: string): Piece[] {
  const out: Piece[] = [];
  let buf = '';
  for (const ch of Array.from(word)) {
    if (ch === '✦' || ch === '🔈') { if (buf) out.push({ text: buf }); buf = ''; out.push({ text: '', icon: ch === '✦' ? 'star' : 'speaker' }); }
    else buf += ch;
  }
  if (buf) out.push({ text: buf });
  return out;
}
/** wrap text that may carry ✦ / 🔈 to `maxW` at `size` px */
export function wrapRich(ctx: CanvasRenderingContext2D, text: string, maxW: number, size: number): Line[] {
  setFont(ctx, size);
  const space = ctx.measureText(' ').width;
  const lines: Line[] = [];
  let cur: Piece[] = [], w = 0;
  for (const word of text.split(' ')) {
    const ps = splitIcons(word), ww = ps.reduce((a, p) => a + pieceW(ctx, p), 0);
    if (cur.length && w + space + ww > maxW) { lines.push({ pieces: cur, w }); cur = []; w = 0; }
    if (cur.length) { cur.push({ text: ' ' }); w += space; }
    cur.push(...ps); w += ww;
  }
  if (cur.length) lines.push({ pieces: cur, w });
  return lines;
}
export function drawLine(ctx: CanvasRenderingContext2D, l: Line, x: number, y: number, size: number, ink: string): void {
  setFont(ctx, size);
  let cx = x;
  for (const p of l.pieces) {
    if (p.icon === 'star') {
      // ⚑ S413 — once Second Thoughts is on, every ✦ is grey, with a padlock (the original is unavailable)
      if (iconLocked) { starIcon(ctx, cx + 1, y + Math.round(size * 0.05), Math.max(9, size - 2), WEB.faint); padlockIcon(ctx, cx + 7, y + Math.round(size * 0.35), lockInk); }
      else starIcon(ctx, cx + 1, y + Math.round(size * 0.05), Math.max(9, size - 2), AI.mark);
    }
    else if (p.icon === 'speaker') speakerIcon(ctx, cx + 1, y + Math.round(size * 0.1), ink, true);
    else { ctx.fillStyle = ink; ctx.fillText(p.text, cx, y); }
    cx += pieceW(ctx, p);
  }
}
/** a short text, wrapped and drawn; returns the height used */
export function drawRich(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, size: number, ink: string, lineH = Math.round(size * 1.3), maxLines = 99): number {
  const lines = wrapRich(ctx, text, maxW, size).slice(0, maxLines);
  lines.forEach((l, i) => drawLine(ctx, l, x, y + i * lineH, size, ink));
  return lines.length * lineH;
}

// ── the small glyphs ────────────────────────────────────────────────────────
/** ✦ — four points, L's mint */
export function starIcon(ctx: CanvasRenderingContext2D, x: number, y: number, d: number, ink: string): void {
  const cx = x + d / 2, cy = y + d / 2, r = d / 2, k = r * 0.28;
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r); ctx.lineTo(cx + k, cy - k); ctx.lineTo(cx + r, cy); ctx.lineTo(cx + k, cy + k);
  ctx.lineTo(cx, cy + r); ctx.lineTo(cx - k, cy + k); ctx.lineTo(cx - r, cy); ctx.lineTo(cx - k, cy - k);
  ctx.closePath(); ctx.fill();
}
/** 🔈 — a speaker, with its waves while the voice is on */
export function speakerIcon(ctx: CanvasRenderingContext2D, x: number, y: number, ink: string, waves: boolean): void {
  px(ctx, x, y + 3, 3, 4, ink);
  ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(x + 3, y + 3); ctx.lineTo(x + 7, y); ctx.lineTo(x + 7, y + 10); ctx.lineTo(x + 3, y + 7); ctx.closePath(); ctx.fill();
  if (waves) { px(ctx, x + 9, y + 3, 1, 4, ink); px(ctx, x + 11, y + 1, 1, 8, ink); }
  else { px(ctx, x + 9, y + 2, 1, 1, ink); px(ctx, x + 10, y + 3, 1, 1, ink); px(ctx, x + 11, y + 4, 1, 1, ink); px(ctx, x + 11, y + 2, 1, 1, ink); px(ctx, x + 9, y + 4, 1, 1, ink); }
}
/** a padlock (the locked stage) */
export function padlockIcon(ctx: CanvasRenderingContext2D, x: number, y: number, ink: string): void {
  px(ctx, x, y + 4, 8, 6, ink);
  px(ctx, x + 1, y, 1, 4, ink); px(ctx, x + 6, y, 1, 4, ink); px(ctx, x + 2, y, 4, 1, ink);
}
/** the AI's cursor: an arrow in L's mint with a dark edge, and a ring when it presses */
function drawCursor(ctx: CanvasRenderingContext2D, x: number, y: number, pressing: boolean, label: string | null = null, W = 9999, st = false): void {
  // ⚑ S418 — Second Thoughts' pointer is its own yellow (L's is L's mint)
  const fill = st ? PLACE.sunHi : AI.primary, ink = st ? OS26.stInk : AI.primaryInk, body = st ? PLACE.sunHi : ERA4.l, edge = st ? OS26.stInk : AI.ink;
  // ⚑ S413 — its name on it while it uses her computer (the as-built agent idiom: a pointer that says whose it is)
  if (label) {
    setFont(ctx, st ? 11 : 9);
    const lh = st ? 17 : 14;
    const lw = Math.ceil(ctx.measureText(label).width) + 24, lx = x + 14 + lw > W - 2 ? x - lw - 4 : x + 14;
    if (st) fillRR(ctx, lx - 1, y + 15, lw + 2, lh + 2, (lh + 2) / 2, OS26.stInk);
    pill(ctx, lx, y + 16, lw, lh, fill);
    assistantMark(ctx, lx + 2, y + 17, lh - 2, ink, fill);
    ctx.fillStyle = ink; ctx.fillText(label, lx + lh + 4, y + 18);
  }
  if (pressing) { ctx.strokeStyle = st ? PLACE.sunHi : AI.mark; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.stroke(); }
  const path = (): void => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 17); ctx.lineTo(x + 4, y + 13); ctx.lineTo(x + 7, y + 19); ctx.lineTo(x + 10, y + 18); ctx.lineTo(x + 7, y + 12); ctx.lineTo(x + 12, y + 12); ctx.closePath(); };
  path(); ctx.fillStyle = edge; ctx.fill();
  ctx.save(); ctx.translate(x, y); ctx.scale(0.78, 0.78); ctx.translate(-x + 1.2, -y + 3); path(); ctx.fillStyle = body; ctx.fill(); ctx.restore();
}
/** the person's own words: a plain bubble (their style, not the AI's) */
export function personBubble(ctx: CanvasRenderingContext2D, x: number, y: number, maxW: number, text: string, size = 13): { w: number; h: number } {
  const lines = wrapRich(ctx, text, maxW - 20, size);
  const lh = Math.round(size * 1.3);
  const w = Math.min(maxW, Math.max(...lines.map((l) => l.w)) + 20), h = lines.length * lh + 12;
  roundEdge(ctx, x, y, w, h, 10, KETTLE.rowEdge, KETTLE.theirs);
  lines.forEach((l, i) => drawLine(ctx, l, x + 10, y + 6 + i * lh, size, KETTLE.ink));
  return { w, h };
}
export const INK = { page: V3.page, card: V3.card, edge: V3.edge, ink: V3.ink, ink2: V3.ink2, primary: V3.primary, primaryInk: V3.primaryInk,
  warm: PLACE.sun, loud: PLACE.sunHi, pink: PLACE.textileHi, sky: PLACE.sky, white: WEB.card, mint: AI.mark } as const;
