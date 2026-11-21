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
 * ⚑ THE CONTROLS ARE PUBLISHED AS `controls` (monitor coordinates). E4Browser copies them into its `hits`, which the walker,
 * the tour, XR and the room's pointer read; the name here is deliberately not one the walker's collector matches, so nothing
 * is counted twice.
 */
import { setFont, px } from '../theme/chrome';
import { monoFor } from '../theme/fonts';
import { PLACE, WEB, V3, KETTLE, CHROME, ERA4, roundRect, roundEdge, pill, assistantMark } from '../theme/era4';
import { playOnce, stopClip } from '../../audio/tapeAudio';
import ACTS from '../../../data/dialog/s4_acts.json';

export interface Hit { x: number; y: number; w: number; h: number; id: string }
export interface Rect { x: number; y: number; w: number; h: number }
export type OriginalStage = 'told' | 'locked' | 'gone' | 'restored';
/** a row of the conversation: the AI's words, her own (a chip she pressed), or a small note of what the AI did.
 *  ⚑ S413 — and Second Thoughts' own: a Memory note (opened in place), her unsent words' row, the booked pill */
export interface ChatRow { who: 'ai' | 'her' | 'note' | 'memory' | 'unsent' | 'booked'; text: string; mem?: MemoryNote; open?: boolean; id?: string }
/** ⚑ S413 (rule 3) — what Second Thoughts files about her: the note, what it is used for, who it is shared with */
export interface MemoryNote { memory: string; usedFor: string; sharedWith: string }
export interface Chip { id: string; label: string; kind?: 'primary' | 'quiet' }
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
  original: { told: string; turnBack: string; originalLabel: string; locked: string; restored: string } } }).screen;

/** the monitor's taskbar (the date, the guide), as E4Browser's one screen had it */
export const TASKBAR = 20;
/** the right pane's bar: the back arrow and what is open */
export const PAGE_BAR = 26;
/** the AI pane's head: its mark, its name, the voice switch */
const HEAD = 40;
/** moving things move in steps of this many a second (dirty-only uploads) */
export const ANIM_HZ = 8;
const PAD = 10;
const LINE = 17;          // the AI's 13 px lines
const HER_LINE = 15;      // her 12 px bubble lines

/** ⚑ S413 — the ✦ drawn inside the conversation follows the screen's stage (locked: grey, with a padlock) */
let iconLocked = false;
const PAGES = new Map<string, PageRenderer>();
/** an act registers how one kind of page on the right is drawn (Act I: week, card, kettle, mail, search, story) */
export function registerPage(kind: string, draw: PageRenderer): void { PAGES.set(kind, draw); }

/** the 2026 ink for the AI's pane: L's mint, softened for a pale ground */
export const AI = { ground: WEB.accentSoft, ink: WEB.accentInk, mark: WEB.accent, edge: WEB.accent, note: CHROME.ink, chip: WEB.card,
  chipEdge: WEB.cardEdge, primary: WEB.primary, primaryInk: WEB.primaryInk } as const;

export class LScreen {
  version = 0;
  /** every control on the monitor (monitor coordinates); E4Browser copies these into its `hits` */
  controls: Hit[] = [];
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
  aiRect(H: number): Rect { return { x: 0, y: 0, w: this.aiW, h: H - TASKBAR }; }
  /** the page's own area on the right, under its bar */
  pageRect(W: number, H: number): Rect {
    const x = Math.min(W, this.aiW + 2);
    return { x, y: PAGE_BAR, w: Math.max(0, W - x), h: H - TASKBAR - PAGE_BAR };
  }

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
  }

  // ── the picture ────────────────────────────────────────────────────────────
  draw(ctx: CanvasRenderingContext2D, W: number, H: number, pressable: boolean): Hit[] {
    this.controls = [];
    this.anchors.clear();
    const push = (h: Hit): void => { if (pressable) this.controls.push(h); };
    const body = H - TASKBAR;
    px(ctx, 0, 0, W, H, V3.page);
    // ── her world (drawn first: the AI's pane is the frame's left edge, and a wide AI pane covers it) ──
    const pr = this.pageRect(W, H);
    if (pr.w > 0) {
      px(ctx, pr.x, 0, pr.w, PAGE_BAR, V3.bar);
      px(ctx, pr.x, PAGE_BAR - 1, pr.w, 1, V3.barEdge);
      const page = this.page;
      let tx = pr.x + 10;
      if (this.canGoBack) {
        setFont(ctx, 12);
        const label = `‹ ${S.back}`, bw = Math.ceil(ctx.measureText(label).width) + 16;
        roundRect(ctx, pr.x + 6, 4, bw, PAGE_BAR - 8, 8, this.visitorBack ? V3.card : V3.bar);
        ctx.fillStyle = this.visitorBack ? V3.ink : V3.ink2; ctx.fillText(label, pr.x + 14, 7);
        this.anchor('page-back', { x: pr.x + 6, y: 4, w: bw, h: PAGE_BAR - 8 });
        if (this.visitorBack) push({ x: pr.x + 6, y: 2, w: bw, h: PAGE_BAR - 4, id: 'page-back' });
        tx = pr.x + 14 + bw;
      }
      if (page?.title) { setFont(ctx, 12); ctx.fillStyle = V3.ink; ctx.fillText(page.title, tx, 7); }
      // ⚑ S413 (beat 6) — the AI is using her computer: its banner over her world's bar, her way back there and greyed
      if (this.banner) {
        px(ctx, pr.x, 0, pr.w, PAGE_BAR, V3.primary);
        assistantMark(ctx, pr.x + 8, 5, 16, V3.primaryInk, V3.primary);
        setFont(ctx, 10);
        const cw = Math.ceil(ctx.measureText(this.banner.control).width) + 16;
        pill(ctx, pr.x + pr.w - cw - 6, 5, cw, 16, V3.grey);
        ctx.fillStyle = V3.ink2; ctx.fillText(this.banner.control, pr.x + pr.w - cw + 2, 7);
        setFont(ctx, 11); ctx.fillStyle = V3.primaryInk; ctx.fillText(fitTo(ctx, this.banner.text, pr.w - cw - 46), pr.x + 30, 7);
      }
      ctx.save(); ctx.beginPath(); ctx.rect(pr.x, pr.y, pr.w, pr.h); ctx.clip();
      px(ctx, pr.x, pr.y, pr.w, pr.h, V3.page);
      const draw = page ? PAGES.get(page.kind) : undefined;
      if (page && draw) draw(ctx, pr, page, { screen: this, control: (h) => { if (this.pagePressable) push(h); }, pressable: pressable && this.pagePressable });
      ctx.restore();
    }
    // ── the AI (⚑ S414: or what has taken its pane over) ──
    const ar = this.aiRect(H);
    if (!(this.full && this.full(ctx, ar, push))) this.drawAi(ctx, ar, push);
    px(ctx, this.aiW, 0, 2, body, AI.edge);
    // ── the taskbar (the guide's tray is E4Browser's, drawn after) ──
    const ty = H - TASKBAR;
    px(ctx, 0, ty, W, TASKBAR, V3.bar); px(ctx, 0, ty, W, 1, V3.barEdge);
    ctx.font = monoFor(10); ctx.fillStyle = V3.ink2; ctx.textBaseline = 'top'; ctx.fillText(this.date, 8, ty + 5);
    if (this.overlayTop) this.overlayTop(ctx, W, H);
    // ── the AI's cursor, over everything ──
    if (this.cur.on) drawCursor(ctx, this.cur.x, this.cur.y, this.cur.flash > 0, this.cursorLabel, W);
    return this.controls;
  }

  private drawAi(ctx: CanvasRenderingContext2D, r: Rect, push: (h: Hit) => void): void {
    iconLocked = this.originalStage === 'locked';
    px(ctx, r.x, r.y, r.w, r.h, AI.ground);
    // the head: the mark, the name, the line under it; the voice switch at its right
    assistantMark(ctx, r.x + PAD, 9, 24, AI.mark, WEB.card);
    setFont(ctx, 15); ctx.fillStyle = AI.ink; ctx.fillText(this.name, r.x + PAD + 32, 7);
    setFont(ctx, 10); ctx.fillStyle = AI.note; ctx.fillText(this.sub, r.x + PAD + 32, 25);
    if (this.voiceSwitch) {
      setFont(ctx, 10);
      const word = this.voiceOn ? S.voiceOn : S.voiceOff;
      const sw = 22 + Math.ceil(ctx.measureText(word).width) + 10, sh = 20, sx = r.x + r.w - PAD - sw, sy = 10;
      roundEdge(ctx, sx, sy, sw, sh, 10, AI.edge, this.voiceOn ? WEB.card : AI.ground);
      speakerIcon(ctx, sx + 7, sy + 5, this.voiceOn ? AI.ink : AI.note, this.voiceOn);
      ctx.fillStyle = this.voiceOn ? AI.ink : AI.note; ctx.fillText(word, sx + 22, sy + 5);
      push({ x: sx - 2, y: sy - 3, w: sw + 4, h: sh + 6, id: 'l-voice' });
      this.anchor('l-voice', { x: sx, y: sy, w: sw, h: sh });
    }
    px(ctx, r.x + PAD, HEAD - 1, r.w - 2 * PAD, 1, WEB.cardEdge);
    // the foot: the answers it offers (and the line under them)
    const cw = r.w - 2 * PAD;
    let foot = r.y + r.h - 8;
    const helpLines = this.help ? wrapRich(ctx, this.help, cw, 10) : [];
    foot -= helpLines.length * 13;
    const helpY = foot;
    // ⚑ S413 (beat 8) — the message box, at the very foot: her words typed into it (no keyboard), a caret while they come
    const COMPOSER_H = 28;
    let composerY = -1;
    if (this.composer !== null) { foot -= COMPOSER_H + 2; composerY = foot; foot -= 6; }
    const chipH = 28, gap = 6;
    const chipRects: Hit[] = [];
    for (let i = this.chips.length - 1; i >= 0; i--) {
      foot -= chipH;
      chipRects.unshift({ x: r.x + PAD, y: foot, w: cw, h: chipH, id: this.chips[i].id });
      foot -= gap;
    }
    const chatBottom = this.chips.length ? foot - 2 : foot;
    // the conversation, newest at the foot, older lines rising out of view (scrollable back)
    ctx.save(); ctx.beginPath(); ctx.rect(r.x, HEAD, r.w, Math.max(0, chatBottom - HEAD)); ctx.clip();
    if (this.aiOverlay) this.aiOverlay(ctx, { x: r.x, y: HEAD, w: r.w, h: chatBottom - HEAD });
    else {
      const laid: { row: ChatRow; lines: Line[]; h: number }[] = [];
      for (const row of this.rows) {
        if (row.who === 'memory') { laid.push({ row, lines: [], h: row.open ? 14 + 3 * 13 + 4 : 13 }); continue; }
        if (row.who === 'booked') { laid.push({ row, lines: [], h: 22 }); continue; }
        const size = row.who === 'ai' ? 13 : row.who === 'her' ? 12 : 10;
        const lines = wrapRich(ctx, row.text, row.who === 'her' ? cw - 34 : row.who === 'unsent' ? cw - 20 : cw, size);
        const h = row.who === 'her' ? Math.max(1, lines.length) * HER_LINE + 10 : row.who === 'note' || row.who === 'unsent' ? lines.length * 13 + 2 : lines.length * LINE;
        laid.push({ row, lines, h });
      }
      const typingH = this.typing ? 20 : 0;
      const total = laid.reduce((a, l) => a + l.h + 8, 0) + typingH;
      // ⚑ S413 (26-14) — reading back: what arrived below since the last draw does not move the lines she is reading
      if (this.chatBack > 0 && total > this.chatTotal && this.chatTotal > 0) this.chatBack += total - this.chatTotal;
      this.chatTotal = total;
      this.chatMax = Math.max(0, total - (chatBottom - HEAD - 8));
      this.chatBack = Math.min(this.chatBack, this.chatMax);
      let y = chatBottom - 4 - total + this.chatBack;
      for (const { row, lines, h } of laid) {
        if (y + h > HEAD - 40 && y < chatBottom + 20) {
          if (row.who === 'her') {
            const bw = Math.min(cw - 30, Math.max(0, ...lines.map((l) => l.w)) + 20), bx = r.x + r.w - PAD - bw;
            roundRect(ctx, bx, y, bw, h, 9, KETTLE.mine);
            lines.forEach((l, i) => drawLine(ctx, l, bx + 10, y + 5 + i * HER_LINE, 12, WEB.ink));
          } else if (row.who === 'memory') {
            // ⚑ S413 (rule 3) — Memory: one small line, its own mark; open, the three lines of what it keeps and for whom
            const M = S.memory, m = row.mem!;
            assistantMark(ctx, r.x + PAD, y + 1, 10, AI.mark, WEB.card);
            setFont(ctx, 10); ctx.fillStyle = AI.ink;
            const lab = row.open ? M.updated : `${M.updated} ›`, lw = Math.ceil(ctx.measureText(lab).width);
            ctx.fillText(lab, r.x + PAD + 14, y);
            if (row.id) push({ x: r.x + PAD - 2, y: y - 4, w: lw + 22, h: row.open ? h + 4 : 20, id: row.id });
            if (row.open) {
              const kx = r.x + PAD + 14, kw = cw - 14;
              roundEdge(ctx, kx - 6, y + 14, kw + 6, 3 * 13 + 4, 6, AI.chipEdge, WEB.card);
              const line3 = (k: string, v: string, yy: number): void => {
                setFont(ctx, 10); ctx.fillStyle = AI.note; const kw2 = Math.ceil(ctx.measureText(`${k} · `).width);
                ctx.fillText(`${k} · `, kx, yy);
                ctx.fillStyle = AI.ink; ctx.fillText(fitTo(ctx, v, kw - kw2 - 6), kx + kw2, yy);
              };
              line3(M.memory, m.memory, y + 17); line3(M.usedFor, m.usedFor, y + 30); line3(M.sharedWith, m.sharedWith, y + 43);
            }
          } else if (row.who === 'unsent') {
            // ⚑ S413 (beat 8; 26-15) — where her words were: the system's line, small, on her side, a red ring; it scrolls up
            //   with the conversation (it is never left in the box)
            const lw = Math.max(0, ...lines.map((l) => l.w)), lx = r.x + r.w - PAD - lw;
            roundRect(ctx, lx - 16, y + 1, 11, 11, 5, V3.danger);
            px(ctx, lx - 11, y + 3, 1, 4, WEB.card); px(ctx, lx - 11, y + 8, 1, 2, WEB.card);
            lines.forEach((l, i) => drawLine(ctx, l, lx + (lw - l.w), y + 1 + i * 13, 10, V3.danger));
          } else if (row.who === 'booked') {
            setFont(ctx, 12);
            const bw = Math.ceil(ctx.measureText(row.text).width) + 20;
            pill(ctx, r.x + PAD, y, bw, 22, AI.primary);
            ctx.fillStyle = AI.primaryInk; ctx.fillText(row.text, r.x + PAD + 10, y + 5);
          } else if (row.who === 'note') {
            lines.forEach((l, i) => drawLine(ctx, l, r.x + PAD, y + 1 + i * 13, 10, AI.note));
          } else {
            lines.forEach((l, i) => drawLine(ctx, l, r.x + PAD, y + i * LINE, 13, AI.ink));
          }
        }
        y += h + 8;
      }
      if (this.typing) { for (let i = 0; i < 3; i++) roundRect(ctx, r.x + PAD + i * 9, y + 6, 6, 6, 3, AI.mark); }
      // older lines fade out under the head (a band of the pane's own ground, stepped)
      if (this.chatMax > this.chatBack) { px(ctx, r.x, HEAD, r.w, 3, AI.ground); }
    }
    ctx.restore();
    // ⚑ S413 (26-14) — she has scrolled back: a small pill at the conversation's foot returns her to the newest line
    if (!this.aiOverlay && this.chatBack > 0) {
      setFont(ctx, 10);
      const lab = `${S.newest} ↓`, nw = Math.ceil(ctx.measureText(lab).width) + 16, nx = r.x + r.w - PAD - nw, ny = chatBottom - 22;
      pill(ctx, nx, ny, nw, 18, AI.primary); ctx.fillStyle = AI.primaryInk; ctx.fillText(lab, nx + 8, ny + 4);
      push({ x: nx - 2, y: ny - 3, w: nw + 4, h: 24, id: 'chat-newest' });
    }
    // ⚑ S413 (beat 8) — the message box: its placeholder, or her words as they are typed in (no keyboard: the chip types them)
    if (composerY >= 0) {
      roundEdge(ctx, r.x + PAD, composerY, cw, COMPOSER_H, 14, AI.chipEdge, WEB.card);
      setFont(ctx, 12);
      const t = this.composerText;
      if (t) {
        const shown = fitTo(ctx, t, cw - 26, true);
        ctx.fillStyle = WEB.ink; ctx.fillText(shown, r.x + PAD + 12, composerY + 7);
        if (this.composerCaret) px(ctx, r.x + PAD + 13 + Math.ceil(ctx.measureText(shown).width), composerY + 6, 1, 15, WEB.ink);
      } else { ctx.fillStyle = AI.note; ctx.fillText(this.composer ?? '', r.x + PAD + 12, composerY + 7); }
    }
    // the answers
    this.chips.forEach((c, i) => {
      const h = chipRects[i];
      const primary = (c.kind ?? (i === 0 ? 'primary' : 'quiet')) === 'primary';
      if (primary) pill(ctx, h.x, h.y, h.w, h.h, AI.primary);
      else { pill(ctx, h.x, h.y, h.w, h.h, AI.chipEdge); pill(ctx, h.x + 1, h.y + 1, h.w - 2, h.h - 2, AI.chip); }
      setFont(ctx, 13);
      const tw = Math.ceil(ctx.measureText(c.label).width);
      ctx.fillStyle = primary ? AI.primaryInk : AI.ink;
      ctx.fillText(c.label, h.x + Math.round((h.w - tw) / 2), h.y + 7);
      push(h);
      this.anchor(c.id, h);
    });
    helpLines.forEach((l, i) => drawLine(ctx, l, r.x + PAD, helpY + i * 13, 10, AI.note));
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
    this.onPress?.(h.id);
    return h.id;
  }
  /** the conversation scrolls under this point */
  chatAt(x: number, y: number, H: number): boolean { return x >= 0 && x < this.aiW && y >= HEAD && y < H - TASKBAR; }
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
      if (iconLocked) { starIcon(ctx, cx + 1, y + Math.round(size * 0.05), Math.max(9, size - 2), WEB.faint); padlockIcon(ctx, cx + 7, y + Math.round(size * 0.35), CHROME.ink); }
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
function drawCursor(ctx: CanvasRenderingContext2D, x: number, y: number, pressing: boolean, label: string | null = null, W = 9999): void {
  // ⚑ S413 — its name on it while it uses her computer (the as-built agent idiom: a pointer that says whose it is)
  if (label) {
    setFont(ctx, 9);
    const lw = Math.ceil(ctx.measureText(label).width) + 22, lx = x + 14 + lw > W - 2 ? x - lw - 4 : x + 14;
    pill(ctx, lx, y + 16, lw, 14, AI.primary);
    assistantMark(ctx, lx + 2, y + 17, 12, AI.primaryInk, AI.primary);
    ctx.fillStyle = AI.primaryInk; ctx.fillText(label, lx + 17, y + 18);
  }
  if (pressing) { ctx.strokeStyle = AI.mark; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.stroke(); }
  const path = (): void => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 17); ctx.lineTo(x + 4, y + 13); ctx.lineTo(x + 7, y + 19); ctx.lineTo(x + 10, y + 18); ctx.lineTo(x + 7, y + 12); ctx.lineTo(x + 12, y + 12); ctx.closePath(); };
  path(); ctx.fillStyle = AI.ink; ctx.fill();
  ctx.save(); ctx.translate(x, y); ctx.scale(0.78, 0.78); ctx.translate(-x + 1.2, -y + 3); path(); ctx.fillStyle = ERA4.l; ctx.fill(); ctx.restore();
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
