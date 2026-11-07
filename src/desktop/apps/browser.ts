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
import { entriesByEra } from '../../witness/record';
import { browserChrome, restoring, glitchBands, CHROME, ADDR, ERA4, V3, WEB, roundRect, roundEdge, pill, avatar, thumb,
  profileGlyph, streamScene, streamShot, progressBar, type TabLook } from '../theme/era4';
import { ledger } from '../../state/ledger';
import { buildStartModel } from '../../witness/startModel';
import { StartMenuMap } from './startMenuMap';
import { gameMenuBus } from '../../state/gameMenuBus';
import startCopy from '../../../data/strings/slice.json';
import { StartPanel, fakeOs } from './startPanel';
import { beatDone } from '../../witness/map';
import { FloppySheep, FLOPPY_LABEL } from './floppysheep';
import { markE4, e4Has } from '../../narrative/e4Beats';
import { E4Messenger, type ChatId } from './messenger';
import { drawGoalPicture } from './goalPicture';
import { drawContagionClip } from './contagionClip';
import updates from '../../../data/strings/updates.json';
import script from '../../../data/dialog/s4_boot.json';
import body from '../../../data/dialog/s4_browser.json';
import ballScript from '../../../data/dialog/s4_ball.json';
import V from '../../../data/dialog/s4_v3.json';

export interface Hit { x: number; y: number; w: number; h: number; id: string }
type Surface = 'monitor' | 'laptop' | 'headset';

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

interface BotChip { label: string; reply: string; filed: string; mute?: boolean }
interface BotBeat { id: string; lines: string[]; chips?: BotChip[]; button?: string; filed?: string }
const BOT = V.bot as unknown as { tab: string; mark: string; online: string; lineSeconds: number; typing: string; beats: BotBeat[];
  week: { title: string; meridian: string; declined: string };
  heading: { title: string; ring: string; streak: string; stamp: string };
  map: { title: string; exposure: string; you: string; nodes: { id: string; label: string; kind: string }[]; mutedTag: string; leftTag: string } };
const ARTICLES = V.news.articles;
const PH = V.photos;
const CL = V.clinic;
const SR = V.search;
const W3 = V.witness;

/** ⚑ the failure on the desk's two screens, in seconds from the device stopping (app.ts CLOSE_LEAD_SECONDS matches) */
export const FAIL = { bands: 6.5, off: 14.5 } as const;
const RESTORE_SECONDS = 2.4;
const BOOT_SECONDS = 2.6;
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
const ROOM_WAIT = { min: 5, max: 12 } as const;
/** the clip plays over the whole page for this long when the map beat begins (one loop of its six frames) */
const CLIP_TAKEOVER_SECONDS = 14.4;

type Step = 'idle' | 'house' | 'newyou' | 'mum' | 'dad' | 'link' | 'news' | 'clinic' | 'meridian' | 'left' | 'pause'
  | 'search' | 'typing' | 'results' | 'bot' | 'junie' | 'confirm' | 'photos' | 'ready';
interface Tab { id: string; kind: 'search' | 'news' | 'clinic' | 'photos'; title: string; address: string }

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
  private typedT = 0;
  private typeT = 0;
  // the bot
  private botBeat = -1;
  private botT = 0;
  private botSaid: { who: 'bot' | 'her'; text: string }[] = [];
  private botDone = new Set<string>();
  private botNextIn = -1;
  private ring = 94;
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
  private hits: Hit[] = [];
  private pressable = true;
  private publish(h: Hit): void { if (this.pressable) this.hits.push(h); }
  private filedSession = false;
  private read = new Set<string>();
  private failT = 0;
  private streamOpen = false;
  version = 0;

  // ── the surface the rest of the piece reads ───────────────────────────────
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
  get guideVoice(): boolean { return !!this.nowLine || this.waitNow; }
  sayLine(line: string): void { this.nowLine = line; this.version++; }
  /** the laptop's line while the messenger is not up (the restore, the session worn) */
  get consoleLine(): string { return this.phase === 'open' ? '' : V.laptop.restoring; }
  get consoleMark(): string { return PROGRAM.console.mark; }
  get consoleLineWorn(): string { return V.laptop.worn; }

  private get bot(): BotBeat | null { return this.botBeat >= 0 ? BOT.beats[this.botBeat] ?? null : null; }
  private botLines(b: BotBeat): string[] { return b.lines.map((l) => l.replace('{number}', this.clinicNumber.toLocaleString('en-GB'))); }
  private get botLinesShown(): number { const b = this.bot; return b && this.botT >= 0 ? Math.min(b.lines.length, 1 + Math.floor(this.botT / BOT.lineSeconds)) : 0; }
  /** ⚑ the clip owns the page before the map beat speaks (the review: "the over-the-top moment, direct and brute") */
  private get clipTakeover(): boolean { return this.bot?.id === 'map' && this.botT < 0; }
  private get botBeatReady(): boolean { const b = this.bot; return !!b && this.botLinesShown >= b.lines.length && this.botT >= (b.lines.length - 1) * BOT.lineSeconds + 0.5; }
  private get enquiryOpen(): boolean { return this.enquiry === 'draft' || this.enquiry === 'sending' || this.enquiry === 'replied'; }

  // ── conducted looks ──────────────────────────────────────────────────────
  private face(s: Surface): void {
    // the story needs the monitor: the free game on its bookmark folds away (it is one press to reopen)
    if (s === 'monitor' && this.mode === 'game') { this.floppy.closeGame(); this.mode = 'story'; this.version++; }
    this.faceOwed = s;
    this.tryFace();
  }
  private tryFace(): void {
    if (!this.faceOwed || !this.onFace) return;
    if (this.onFace(this.faceOwed)) this.faceOwed = null;
  }
  /** Lamby's "Show me": look at the screen the target is on */
  guideSurface(): 'monitor' | 'laptop' {
    const t = this.lambyGuide?.view.targets ?? [];
    return t.some((id) => this.messenger.targets.some((r) => r.id === id)) ? 'laptop' : 'monitor';
  }

  private file(id: string, outcome: 'read' | 'opened' | 'answered' | 'done', witness: string): void {
    if (ledger.e4Space.some((e) => e.id === id)) return;
    ledger.e4Space.push({ id, outcome, witness });
  }
  private go(step: Step): void { this.step = step; this.stepT = 0; this.stallT = 0; this.version++; }

  /** ⚑ the one press the story waits on now ON THE MONITOR, for the just-in-time ring */
  private pathIds(): Set<string> {
    const s = new Set<string>();
    if (this.phase !== 'open' || this.messenger.felt) return s;
    if (this.newyouUp) { s.add('ny-continue'); return s; }
    if (this.enquiry === 'draft') { s.add('enq-send'); return s; }
    if (this.enquiry === 'replied') { s.add('enq-close'); return s; }
    switch (this.step) {
      case 'news': if (this.clinicNotice) s.add('clinic-open'); break;
      case 'clinic': s.add('clinic-support'); break;
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
    m.mumToday = 4; m.mumDraft = true; m.mumPage = 4; m.mumOpened = true; m.dadIn = true; m.dadRead = true; m.dadPage = 1; m.linkOpened = true;
    m.junieOpenable = true; m.junieOpened = true; m.junieUnmuted = true; m.junieReplied = true; m.junieX = true;
    m.want = null; m.view = 'list'; m.wallpaper = 'goal';
    this.junieWarm = true;
    this.go('ready');
  }
  private allTabs(): Tab[] {
    this.newsOpened = ARTICLES.length;
    return [this.searchTab(), this.newsTab(), this.clinicTab(), this.photosTab()];
  }
  private searchTab(): Tab { return { id: 'search', kind: 'search', title: SR.newTab, address: '' }; }
  /** ⚑ ONE News tab (the review: seven tabs and their names cut off); its pager carries the articles */
  private newsTab(): Tab { return { id: 'news', kind: 'news', title: V.news.tab, address: '' }; }
  /** which article the News tab shows, and how many have arrived */
  private newsIndex = 0;
  private newsOpened = 0;
  private clinicTab(): Tab { return { id: 'clinic', kind: 'clinic', title: CL.tab, address: CL.address }; }
  private photosTab(): Tab { return { id: 'photos', kind: 'photos', title: PH.tab, address: PH.address }; }
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
    this.orb.line = PROGRAM.saver.line;
    this.tabs = [this.searchTab(), this.photosTab()];
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
    if (!this.pressable && this.hits.length) this.hits = [];
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
    const at = (s: number): boolean => b4 < s && this.stepT >= s;
    const m = this.messenger;
    // the messenger's own clock (the draft's caret)
    const mt = m.t; m.t += dt;
    if (m.lockT > 0) { m.lockT = Math.max(0, m.lockT - dt); if (m.lockT === 0) this.version++; }
    if (m.view === 'mum' && m.mumDraft && Math.floor(mt * 2) !== Math.floor(m.t * 2)) this.version++;
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
        if (t?.word) { this.wotdSaid = true; meetWord(t.id); this.sayLine(`${app.title}: ${t.word}. ${t.line ?? ''}`); }
      }
      if (!this.waitSaid && this.quietT > 25 && entriesByEra().e4.length >= 2 && !ledger.games.some((g) => g.id === 'matchmade')) {
        this.waitSaid = true; this.waitNow = true; this.version++;
      }
    }
    switch (this.step) {
      case 'house':
        // Act I · eighteen — her friends write first; the piece turns her to the laptop
        if (at(0.05)) { markE4('eighteen'); this.face('laptop'); m.want = 'house'; }
        for (let i = 0; i < 3; i++) if (at(1.0 + i * 0.9)) { m.houseShown = i + 1; playOnce('ui_press.mp3'); this.version++; }
        if (m.houseHeart && this.stepT >= 0) {
          // the heart is sent; the update restores "defaults" a breath later — the system's act, not hers
          if (this.heartT < 0) this.heartT = 0; else this.heartT += dt;
          if (this.heartT >= 1.6) this.beginNewYou();
        }
        break;
      case 'mum':
        if (at(1.2)) this.face('laptop');
        if (at(1.4)) { m.mumToday = 1; m.want = 'mum'; if (m.view !== 'mum') m.view = 'list'; playOnce('ui_press.mp3'); this.version++; }
        if (at(2.8)) { m.mumToday = 3; playOnce('ui_press.mp3'); this.version++; }
        if (m.mumPage >= V.messenger.mum.years.length) {
          // she reached today: her last line, her unsent draft, then Dad
          if (this.todayT < 0) this.todayT = 0; else this.todayT += dt;
          if (this.todayT >= 1.2 && m.mumToday < 4) { m.mumToday = 4; this.version++; }
          if (this.todayT >= 2.6 && !m.mumDraft) { m.mumDraft = true; this.version++; }
          if (this.todayT >= 4.2 && !m.dadIn) { m.dadIn = true; m.want = 'dad'; playOnce('ui_press.mp3'); this.go('dad'); }
        }
        break;
      case 'news':
        // the news opens behind Mum's link, tab after tab; then the clinic writes
        // the news arrives behind Mum's link, one article after another: the pager's count climbs
        for (let i = 1; i < ARTICLES.length; i++) if (at(i * 0.9)) { this.newsOpened = i + 1; playOnce('ui_press.mp3'); this.version++; }
        if (at(ARTICLES.length * 0.9 + 3.6)) { this.clinicNotice = true; playOnce('ui_press.mp3'); this.version++; }
        break;
      case 'meridian':
        if (this.enquiry === 'sending') {
          this.enquiryT += dt;
          if (this.enquiryT >= ENQUIRY_REPLY_SECONDS) { this.enquiry = 'replied'; this.version++; }
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
        if (this.stepT >= ROOM_WAIT.min && (e4Has('room') || this.stepT >= ROOM_WAIT.max)) {
          this.go('search');
          this.typedT = 0;
          this.face('monitor');
          this.openTab('search');
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
    if (this.clipTakeover && Math.floor(before * 8) !== Math.floor(this.botT * 8)) this.version++;
    if (this.botNextIn >= 0) { this.botNextIn -= dt; if (this.botNextIn < 0) { this.botNextIn = -1; this.nextBot(); } }
    // the bot's "rest" ends the bot's act: the piece turns her to the laptop, where Junie's badge has waited all day
    if (b.id === 'rest' && this.botBeatReady && this.step === 'bot' && this.botT >= (b.lines.length - 1) * BOT.lineSeconds + 2.4) {
      const m = this.messenger;
      m.junieOpenable = true; m.want = 'junie'; m.view = 'list';
      this.go('junie');
      this.face('laptop');
      playOnce('ui_press.mp3');
    }
  }
  private startBot(id: string): void {
    const was = this.bot;
    if (was && !this.botDone.has(was.id)) { this.botDone.add(was.id); for (const l of this.botLines(was)) this.botSaid.push({ who: 'bot', text: l }); }
    this.botBeat = BOT.beats.findIndex((b) => b.id === id);
    this.botT = 0;
    if (id === 'map') { markE4('map'); this.botT = -CLIP_TAKEOVER_SECONDS; }
    if (id === 'heading') this.ring = 97;
    if (id === 'unmuted') this.ring = 61;
    if (BOT.beats[this.botBeat]?.lines.length) playOnce('agent_2026.mp3');
    this.version++;
  }
  private nextBot(): void {
    const order = ['hello', 'reasons', 'heading', 'map', 'rest'];
    const b = this.bot;
    const i = b ? order.indexOf(b.id) : -1;
    if (i >= 0 && i < order.length - 1) this.startBot(order[i + 1]);
  }
  /** her answer: her bubble, its reply (it always agrees), and the next beat after a breath */
  private answerBot(chip: BotChip | null): void {
    const b = this.bot;
    if (!b || this.botDone.has(b.id) || !this.botBeatReady) return;
    this.botDone.add(b.id);
    for (const l of this.botLines(b)) this.botSaid.push({ who: 'bot', text: l });
    if (chip) {
      this.botSaid.push({ who: 'her', text: chip.label });
      this.botSaid.push({ who: 'bot', text: chip.reply });
      this.file(`conv:${b.id}`, 'answered', chip.filed);
      if (b.id === 'map') {
        this.file('v3:mute', 'answered', chip.filed);
        if (chip.mute) { this.mapMuted = true; this.messenger.houseMuted = true; this.ring = 98; }
      }
    } else if (b.filed) this.file(`conv:${b.id}`, 'done', b.filed);
    playOnce('ui_press.mp3');
    if (b.id === 'unmuted') { this.go('photos'); this.openTab('photos'); }
    else this.botNextIn = 0.9;
    this.version++;
  }

  // ── the act changes, named ────────────────────────────────────────────────
  private beginNewYou(): void {
    this.newyouUp = true;
    this.profile = 'goal';
    this.messenger.wallpaper = 'goal';
    this.messenger.lockT = 3.5;   // the lid shows its new wallpaper on the lock screen first
    this.messenger.want = null;
    this.openTab('search');
    markE4('newyou');
    playOnce('step_done_2026.mp3');
    this.face('monitor');
    this.go('newyou');
  }

  // ── the messenger, pressed (the laptop) ──────────────────────────────────
  drawMessenger(ctx: CanvasRenderingContext2D, W: number, H: number, pressable: boolean): Hit[] {
    const r = this.messenger.draw(ctx, W, H);
    // ⚑ nothing on the lid is pressable once the screens are done (the headset is the way on), or while it is not hers
    if (!pressable || this.programDone) { this.messenger.targets = []; return []; }
    return r;
  }
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
    m.view = c;
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
      if (!m.mumOpened) { m.mumOpened = true; m.mumPage = 0; markE4('mum'); }
      if (m.want === 'link') m.mumPage = V.messenger.mum.years.length;
    } else if (c === 'dad') {
      if (m.dadIn && !m.dadRead) {
        m.dadRead = true;
        m.dadPage = 0;
        markE4('dad');
        this.file('v3:dad', 'read', W3.dad);
        m.want = 'link';
        this.go('link');
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
    if (id === 'dad-today' && m.view === 'dad') { m.dadPage = 1; playOnce('ui_press.mp3'); this.version++; return; }
    if (id === 'house-heart' && !m.houseHeart) {
      m.houseHeart = true; m.want = null;
      this.file('v3:house', 'answered', W3.house);
      playOnce('ui_press.mp3'); this.version++;
      return;
    }
    if (id.startsWith('mum-') && m.view === 'mum') {
      m.mumPage = Math.min(V.messenger.mum.years.length, m.mumPage + 1);
      if (m.mumPage >= V.messenger.mum.years.length) this.file('v3:mum', 'read', W3.mum);
      playOnce('ui_press.mp3'); this.version++;
      return;
    }
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
    if (id === 'junie-unmute' && !m.junieUnmuted) {
      m.junieUnmuted = true; m.want = null;
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

  draw(ctx: CanvasRenderingContext2D, W: number, H: number, pressable = true): void {
    this.drawSurfaceContent(ctx, W, H, pressable);
    const guide = this.lambyGuide?.view;
    if (pressable && guide && !guide.hidden && guide.rung === 'show' && !this.startMap.active) {
      const targets = this.hits.filter(h => guide.targets.includes(h.id));
      for (const r of targets) drawGuidePointer(ctx, r, { x: W - 24, y: H - 24 }, CHROME.accent, guide.frame);
    }
    if (this.phase === 'open' && !this.idleOrb) {
      const S = startCopy.desktop.startMenu;
      px(ctx, W - 80, 3, 50, 20, CHROME.button);
      setFont(ctx, 10); ctx.fillStyle = CHROME.buttonInk; ctx.fillText(S.paperMenu, W - 71, 7);
      this.hits.unshift({ x: W - 80, y: 3, w: 50, h: 20, id: 'start-menu' });
      const nav = this.startMap.draw(ctx, W, H, 'e4', this.startModel(), this.startMapSilent);
      if (nav.length) this.hits = [...nav, ...this.hits.filter(r => r.id === 'start-menu' || r.id === 'whattodo')];
    }
  }
  drawLaptopGuide(ctx: CanvasRenderingContext2D, W: number, H: number, hits: import('./lambyGuideDraw').GuideHit[]): void {
    if (this.lambyGuide?.canRequest && !this.startMap.active && !this.messenger.felt) {
      this.lambyGuidePaint = drawLambyGuide(ctx, 'e4', this.lambyGuide.view, hits, { w: W, h: H }, this.hits.map(h => `press:${h.id}`));
    }
  }
  pressLaptopGuide(id: string): boolean {
    if (id === 'lg-tray') { this.nowLine = null; this.waitNow = false; }
    this.lambyGuide?.activity();
    const took = this.lambyGuide?.press(id) ?? false;
    if (took) { this.version++; if (id === 'lg-show') this.onGuideLook?.(); }
    return took;
  }
  /** Lamby's "Take me there": press the target for her (navigation only — never an answer) */
  pressGuideTarget(id: string): 'monitor' | 'laptop' | null {
    if (this.guideSilent || this.guideVoice) return null;
    const allowed = ['ny-continue', 'clinic-open', 'clinic-support', 'search-go', 'ad-chat', 'tab-photos', 'start-menu', 'row-mum', 'chat-mum', 'row-dad', 'chat-dad'];
    if (!allowed.includes(id)) return null;
    const onLid = this.messenger.targets.find((h) => h.id === id);
    if (onLid) { this.handleMessenger(id); return 'laptop'; }
    const r = this.hits.find(h => h.id === id);
    if (r) { this.handleClick(r.x + r.w / 2, r.y + r.h / 2); return 'monitor'; }
    return null;
  }

  private drawSurfaceContent(ctx: CanvasRenderingContext2D, W: number, H: number, pressable: boolean): void {
    this.hits = [];
    this.pressable = pressable;
    const back = this.tabsBack();
    if (this.phase === 'dormant' || this.settleT > 0) { px(ctx, 0, 0, W, H, CHROME.page); return; }
    if (this.phase === 'saver') {
      if (this.orb) this.orb.draw(ctx, W, H); else px(ctx, 0, 0, W, H, CHROME.page);
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
    const blink = this.phase === 'open' && this.liveTab === 'search' && this.pressable && !botOn && (this.step === 'search' && this.typedDone)
      && Math.floor(this.t / CURSOR_BLINK) % 2 === 0;
    const looks: TabLook[] = shown.map((t) => this.phase === 'failed' ? (t.kind === 'search' ? { badge: this.streamOpen ? '●' : '!', state: 'normal' } : { state: 'locked' })
      : t.kind === 'news' && this.newsOpened > 1 ? { badge: String(this.newsOpened) } : {});
    const rects = browserChrome(ctx, W, shown, live, addr, blink || this.step === 'typing', looks, 80);
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
        for (const h of this.hits) if (path.has(h.id)) this.ringAround(ctx, h);
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
    if (this.step === 'search') return script.search.typed.slice(0, Math.floor(script.search.typed.length * Math.min(1, this.typedT / 1.4)));
    if (this.step === 'typing') {
      const k = Math.min(1, this.typeT / PROGRAM.typingSeconds);
      const n = script.search.typed.length + Math.floor((PROGRAM.chosen.length - script.search.typed.length) * k);
      return PROGRAM.chosen.slice(0, n);
    }
    if (this.step === 'results') return PROGRAM.chosen;
    return '';
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
  private bar(ctx: CanvasRenderingContext2D, W: number, H: number, left: string, buttons: { id: string; label: string; kind: 'primary' | 'quiet' }[], mono = false): void {
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
  }
  private pageGround(ctx: CanvasRenderingContext2D, W: number, H: number): void { px(ctx, 0, PAGE_TOP, W, H - PAGE_TOP, V3.page); }

  // ── the search (the new tab, then Act III) ────────────────────────────────
  private drawSearch(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.pageGround(ctx, W, H);
    // the wallpaper: hers until the update, then the goal
    const wx = W - 262, wy = PAGE_TOP + 10, ww = 244, wh = H - BAR_H - PAGE_TOP - 20;
    if (this.profile === 'goal') drawGoalPicture(ctx, wx, wy, ww, wh);
    else thumb(ctx, wx, wy, ww, wh, 3, false, 8);
    const lx = 40;
    setFont(ctx, 30); ctx.fillStyle = V3.ink;
    ctx.fillText(SR.brand, lx, PAGE_TOP + 40);
    const bx = lx, by = PAGE_TOP + 92, bw = 380, bh = 36;
    pill(ctx, bx, by, bw, bh, V3.edge); pill(ctx, bx + 1, by + 1, bw - 2, bh - 2, V3.card);
    const typed = this.step === 'search' ? this.addressNow() : '';
    if (typed) { setFont(ctx, 15); ctx.fillStyle = V3.ink; ctx.fillText(typed, bx + 18, by + 10); }
    else { setFont(ctx, 14); ctx.fillStyle = V3.ink2; ctx.fillText(SR.placeholder, bx + 18, by + 11); }
    // the bookmark: the free game, one press away (S168)
    if (this.step !== 'typing') {
      const label = '☆ ' + FLOPPY_LABEL;
      setFont(ctx, 12);
      const kw = Math.ceil(ctx.measureText(label).width) + 18;
      pill(ctx, lx, PAGE_TOP + 8, kw, 20, V3.card);
      ctx.fillStyle = V3.ink2; ctx.fillText(label, lx + 9, PAGE_TOP + 12);
      this.publish({ x: lx, y: PAGE_TOP + 8, w: kw, h: 20, id: 'bm-floppy' });
    }
    if (this.typedDone) {
      // ⚑ the engine finishes her sentence four ways; three assume she wants out, and the one she meant is last
      const rows = script.search.completions as string[];
      const top = by + bh + 4, rh = 24;
      const dh = rows.length * rh + 10;
      roundEdge(ctx, bx, top, bw, dh, 6, V3.edge, V3.card);
      setFont(ctx, 14);
      rows.forEach((r, i) => {
        px(ctx, bx + 16, top + 13 + i * rh, 5, 5, V3.ink2);
        ctx.fillStyle = V3.ink;
        ctx.save(); ctx.beginPath(); ctx.rect(bx + 28, top, bw - 36, dh); ctx.clip();
        ctx.fillText(r, bx + 30, top + 8 + i * rh);
        ctx.restore();
      });
      this.publish({ x: bx, y: top, w: bw, h: dh, id: 'search-open' });
    }
    this.bar(ctx, W, H, this.step === 'search' ? SR.barHint : '', this.typedDone ? [{ id: 'search-go', label: SR.go, kind: 'primary' }] : []);
  }

  private drawResults(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.pageGround(ctx, W, H);
    const x = 40, cw = W - 80;
    setFont(ctx, 12); ctx.fillStyle = V3.ink2; ctx.fillText(SR.queryLabel, x, PAGE_TOP + 12);
    setFont(ctx, 17); ctx.fillStyle = V3.ink; ctx.fillText(PROGRAM.chosen, x, PAGE_TOP + 28);
    // the ad, first and biggest — it says it is an ad
    let y = PAGE_TOP + 60;
    const A = SR.ad, ah = 92;
    roundEdge(ctx, x - 8, y - 6, cw + 16, ah, 7, V3.edge, V3.card);
    setFont(ctx, 12); ctx.fillStyle = V3.ink; ctx.fillText(A.sponsored, x, y);
    ctx.font = monoFor(12); ctx.fillStyle = V3.ink2; ctx.fillText(A.url, x + Math.ceil(ctx.measureText(A.sponsored).width) + 24, y + 1);
    setFont(ctx, 18); ctx.fillStyle = V3.primary; ctx.fillText(A.title, x, y + 18);
    setFont(ctx, 14); ctx.fillStyle = V3.ink; ctx.fillText(A.snippet, x, y + 42);
    setFont(ctx, 11); ctx.fillStyle = V3.ink2; ctx.fillText(A.why, x, y + 64);
    this.publish({ x: x - 8, y: y - 6, w: cw + 16, h: ah, id: 'result-agent' });
    y += ah + 10;
    for (const r of SR.others) {
      ctx.font = monoFor(11); ctx.fillStyle = V3.ink2; ctx.fillText(r.url, x, y);
      setFont(ctx, 15); ctx.fillStyle = V3.ink; ctx.fillText(r.title, x, y + 15);
      setFont(ctx, 13); ctx.fillStyle = V3.ink2; ctx.fillText(r.snippet, x, y + 35);
      y += 62;
    }
    this.bar(ctx, W, H, SR.sticky, [{ id: 'ad-chat', label: SR.chat, kind: 'primary' }]);
  }

  // ── the update's "defaults": the new you ─────────────────────────────────
  private drawNewYou(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.hits = this.hits.filter((h) => h.id === 'start-menu' || h.id.startsWith('lg-') || h.id.startsWith('sm-'));
    ctx.save(); ctx.globalAlpha = 0.55; px(ctx, 0, PAGE_TOP, W, H - PAGE_TOP, V3.sheetWash); ctx.restore();
    const N = V.newyou;
    const cw = 600, ch = H - BAR_H - PAGE_TOP - 20, cx = Math.round((W - cw) / 2), cy = PAGE_TOP + 10;
    roundEdge(ctx, cx, cy, cw, ch, 8, V3.edge, V3.card);
    drawGoalPicture(ctx, cx + 14, cy + 14, 220, ch - 28, { t: this.t });
    const rx = cx + 256;
    setFont(ctx, 24); ctx.fillStyle = V3.ink; ctx.fillText(N.title, rx, cy + 24);
    setFont(ctx, 17); ctx.fillStyle = V3.ink2; ctx.fillText(N.sub, rx, cy + 58);
    let y = cy + 100;
    for (const r of N.rows) {
      px(ctx, rx, y - 8, cw - (rx - cx) - 20, 1, V3.edge);
      setFont(ctx, 14); ctx.fillStyle = V3.ink; ctx.fillText(r, rx, y);
      ctx.fillStyle = V3.botInk; ctx.fillText('✓ ' + N.value, rx + 150, y);
      y += 34;
    }
    setFont(ctx, 12); ctx.fillStyle = V3.ink2; ctx.fillText(N.fine, rx, y + 4);
    this.bar(ctx, W, H, N.bar, [{ id: 'ny-continue', label: N.continue, kind: 'primary' }], true);
  }

  // ── the news ──────────────────────────────────────────────────────────────
  private drawArticle(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.pageGround(ctx, W, H);
    const i = Math.min(this.newsIndex, ARTICLES.length - 1);
    const a = ARTICLES[i];
    const cx = 40, cw = W - 80, cy = PAGE_TOP + 8, ch = H - BAR_H - PAGE_TOP - 16;
    roundEdge(ctx, cx, cy, cw, ch, 6, V3.edge, V3.card);
    const x = cx + 28;
    ctx.font = newsFor(24); ctx.textBaseline = 'top'; ctx.fillStyle = V3.ink; ctx.fillText(a.mast, x, cy + 12);
    px(ctx, x, cy + 42, cw - 56, 2, V3.ink);
    ctx.font = monoFor(12); ctx.fillStyle = V3.ink2; ctx.fillText(a.date, x, cy + 49);
    ctx.font = newsFor(21);
    let y = cy + 70;
    for (const ln of wrapText(ctx, a.head, cw - 56).slice(0, 2)) { ctx.fillStyle = V3.ink; ctx.fillText(ln, x, y); y += 25; }
    y += 6;
    setFont(ctx, 17); ctx.fillStyle = V3.ink;
    for (const p of a.body) { for (const ln of wrapText(ctx, p, cw - 56)) { ctx.fillText(ln, x, y); y += 22; } y += 6; }
    ctx.font = monoFor(11); ctx.fillStyle = V3.ink2;
    ctx.fillText(a.source, x, Math.min(cy + ch - 18, y + 4));
    const opened = this.newsOpened;
    const left = this.clinicNotice && this.step === 'news' ? V.news.notice : V.news.count.replace('{n}', String(i + 1)).replace('{of}', String(opened));
    const buttons: { id: string; label: string; kind: 'primary' | 'quiet' }[] = [];
    if (i > 0) buttons.push({ id: 'news-prev', label: V.news.prev, kind: 'quiet' });
    if (i < opened - 1) buttons.push({ id: 'news-next', label: V.news.next, kind: 'quiet' });
    if (this.clinicNotice && this.step === 'news') buttons.push({ id: 'clinic-open', label: V.news.open, kind: 'primary' });
    this.bar(ctx, W, H, left, buttons);
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
    const ly = ty + th + 10, lw = cw - 40;
    setFont(ctx, 13); ctx.fillStyle = V3.ink2; ctx.fillText(CL.letterTitle, tx, ly);
    setFont(ctx, 17); ctx.fillStyle = V3.ink; ctx.fillText(CL.letter, tx, ly + 18);
    const bw = Math.floor((lw - 12) / 2);
    CL.readings.forEach((r, k) => {
      const bx = tx + k * (bw + 12), by = ly + 44;
      roundEdge(ctx, bx, by, bw, cy + ch - 8 - by, 5, V3.edge, V3.page);
      setFont(ctx, 12); ctx.fillStyle = V3.ink2; ctx.fillText(r.label, bx + 10, by + 6);
      setFont(ctx, 15); ctx.fillStyle = V3.ink;
      wrapText(ctx, r.text, bw - 20).slice(0, 2).forEach((ln, i) => ctx.fillText(ln, bx + 10, by + 23 + i * 19));
    });
    const buttons: { id: string; label: string; kind: 'primary' | 'quiet' }[] = this.step === 'clinic' ? [{ id: 'clinic-support', label: CL.support, kind: 'primary' }] : [];
    this.bar(ctx, W, H, CL.source, buttons, true);
  }

  /** ⚑ V4 as built — her enquiry to Meridian, its auto-reply, and the loop's receipt (the clinic referred her) */
  private drawEnquiry(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.hits = this.hits.filter((h) => h.id === 'start-menu' || h.id.startsWith('lg-') || h.id.startsWith('sm-'));
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
  private drawBot(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.pageGround(ctx, W, H);
    if (this.clipTakeover) {
      // the clip, as big as the page allows, the stamp always in its corner; then it shrinks back into the map panel
      const top = PAGE_TOP + 22, avail = H - BAR_H - 8 - top;
      const ch = avail, cw = Math.min(W - 32, Math.round(ch * 16 / 9));
      const cx = Math.round((W - cw) / 2);
      setFont(ctx, 13); ctx.fillStyle = V3.ink;
      ctx.fillText(V.clip.title, cx, PAGE_TOP + 4);
      const tw = Math.ceil(ctx.measureText(V.clip.title + '   ').width);
      ctx.font = monoFor(11); ctx.fillStyle = V3.ink2;
      ctx.fillText(`${V.clip.channel}  ·  ${V.clip.recommended}`, cx + tw, PAGE_TOP + 6);
      drawContagionClip(ctx, this.botT + CLIP_TAKEOVER_SECONDS, cx, top, cw, ch);
      this.bar(ctx, W, H, BOT.mark + ' · ' + V.clip.recommended, []);
      return;
    }
    const top = PAGE_TOP + 4;
    px(ctx, 0, top, W, 36, V3.card);
    px(ctx, 0, top + 36, W, 1, V3.edge);
    avatar(ctx, 16, top + 5, 26, V3.primary, 'S');
    setFont(ctx, 17); ctx.fillStyle = V3.ink; ctx.fillText(BOT.mark, 52, top + 4);
    px(ctx, 52, top + 25, 6, 6, V3.bot);
    setFont(ctx, 11); ctx.fillStyle = V3.ink2; ctx.fillText(BOT.online, 62, top + 22);
    const bodyTop = top + 44, bodyBottom = H - BAR_H - 6;
    const chatX = 16, chatW = 318, panelX = chatX + chatW + 16, panelW = W - 16 - panelX;
    px(ctx, panelX - 8, bodyTop, 1, bodyBottom - bodyTop, V3.edge);
    this.drawConversation(ctx, chatX, bodyTop, chatW, bodyBottom);
    this.drawBotPanel(ctx, panelX, bodyTop, panelW, bodyBottom);
    const b = this.bot;
    const ready = !!b && this.botBeatReady && !this.botDone.has(b.id);
    const buttons: { id: string; label: string; kind: 'primary' | 'quiet' }[] = [];
    if (ready && b!.chips) b!.chips.forEach((c, k) => buttons.push({ id: `conv-chip-${k}`, label: c.label, kind: k === 0 ? 'primary' : 'quiet' }));
    else if (ready && b!.button) buttons.push({ id: 'conv-act', label: b!.button, kind: 'primary' });
    const typing = !!b && this.botLinesShown < b.lines.length;
    this.bar(ctx, W, H, typing ? BOT.typing : '', buttons.reverse());
  }

  private drawConversation(ctx: CanvasRenderingContext2D, x: number, top: number, w: number, bottom: number): void {
    const b = this.bot;
    type Row = { who: 'bot' | 'her' | 'dots'; text: string };
    const rows: Row[] = this.botSaid.map((s) => ({ who: s.who, text: s.text }));
    if (b && !this.botDone.has(b.id) && this.step !== 'ready' && this.step !== 'photos') {
      const lines = this.botLines(b);
      for (let k = 0; k < this.botLinesShown; k++) rows.push({ who: 'bot', text: lines[k] });
      if (this.botLinesShown < lines.length) rows.push({ who: 'dots', text: '' });
    }
    setFont(ctx, 16);
    const maxW = w - 40;
    const sized = rows.map((r) => {
      if (r.who === 'dots') return { r, lines: [] as string[], h: 26 };
      setFont(ctx, 16);
      const lines = wrapText(ctx, r.text, maxW - 24).slice(0, 4);
      return { r, lines, h: lines.length * 20 + 14 + 6 };
    });
    let y = bottom;
    const placed: { s: typeof sized[number]; y: number }[] = [];
    for (let i = sized.length - 1; i >= 0; i--) {
      if (y - sized[i].h < top) break;
      y -= sized[i].h;
      placed.unshift({ s: sized[i], y });
    }
    for (const { s, y: ry } of placed) {
      if (s.r.who === 'dots') {
        roundRect(ctx, x + 30, ry, 46, 20, 10, V3.botSoft);
        const d = Math.floor(this.botT / 0.3) % 3;
        for (let k = 0; k < 3; k++) px(ctx, x + 41 + k * 10, ry + 8, 5, 5, k === d ? V3.ink : V3.grey);
        continue;
      }
      setFont(ctx, 16);
      const mine = s.r.who === 'her';
      const bw = Math.max(...s.lines.map((l) => Math.ceil(ctx.measureText(l).width))) + 24;
      const bh = s.h - 6;
      const bx = mine ? x + w - 4 - bw : x + 30;
      if (!mine) avatar(ctx, x, ry, 22, V3.primary, 'S');
      roundRect(ctx, bx, ry, bw, bh, 9, mine ? KETTLE_MINE : V3.botSoft);
      setFont(ctx, 16); ctx.fillStyle = V3.ink;
      s.lines.forEach((l, k) => ctx.fillText(l, bx + 12, ry + 7 + k * 20));
    }
  }

  /** what the bot is showing her: her week (its evidence), then where she is heading, then the map and the clip */
  private drawBotPanel(ctx: CanvasRenderingContext2D, x: number, top: number, w: number, bottom: number): void {
    const b = this.bot;
    const id = b?.id ?? 'hello';
    const title = (t: string, y: number): void => { setFont(ctx, 12); ctx.fillStyle = V3.ink2; ctx.fillText(t.toUpperCase(), x, y); };
    if (id === 'hello' || id === 'reasons') {
      // its evidence: every refusal of the week, kept as a reason
      title(BOT.week.title, top);
      const rows: [string, string][] = [
        [CL.tab, `${CL.numberLabel} ${this.clinicNumber.toLocaleString('en-GB')}`],
        [BOT.week.meridian, BOT.week.declined],
        [V.messenger.chats.house.name, V.messenger.house.left[0].text],
        [V.messenger.chats.dad.name, V.messenger.dad.before[1].text]
      ];
      let y = top + 22;
      for (const [k, v] of rows) {
        roundEdge(ctx, x, y, w, 46, 6, V3.edge, V3.card);
        setFont(ctx, 12); ctx.fillStyle = V3.ink2; ctx.fillText(k, x + 12, y + 7);
        setFont(ctx, 14); ctx.fillStyle = V3.ink;
        ctx.save(); ctx.beginPath(); ctx.rect(x + 12, y + 20, w - 24, 20); ctx.clip(); ctx.fillText(v, x + 12, y + 24); ctx.restore();
        y += 54;
      }
      return;
    }
    if (id === 'heading') {
      title(BOT.heading.title, top);
      const ph = bottom - top - 26;
      drawGoalPicture(ctx, x, top + 20, Math.min(w - 96, ph * 0.8), ph, { t: this.t });
      this.drawRing(ctx, x + w - 84, top + 30, 80);
      setFont(ctx, 11); ctx.fillStyle = V3.botInk;
      ctx.fillText(BOT.heading.stamp, x + w - 84, top + 124);
      ctx.fillText(BOT.heading.streak, x + w - 84, top + 140);
      return;
    }
    // the map and the clip (map, rest, unmuted, ready)
    title(BOT.map.title, top);
    const mh = 112;
    this.drawMap(ctx, x, top + 18, w, mh);
    const lineY = top + 18 + mh + 6, clipY = lineY + 16, clipH = bottom - clipY;
    const clipW = Math.min(w - 96, Math.round(clipH * 16 / 9));
    setFont(ctx, 12); ctx.fillStyle = V3.ink;
    ctx.fillText(V.clip.title, x, lineY);
    const tw = Math.ceil(ctx.measureText(V.clip.title + '  ').width);
    ctx.font = monoFor(10); ctx.fillStyle = V3.ink2;
    ctx.fillText(V.clip.channel, x + tw, lineY + 2);
    drawContagionClip(ctx, this.t, x, clipY, clipW, clipH);
    const rx = x + clipW + 10, rw = w - clipW - 10, rd = Math.min(80, rw, clipH);
    this.drawRing(ctx, rx + Math.round((rw - rd) / 2), clipY + Math.round((clipH - rd) / 2), rd);
  }

  /** the "Becoming" ring: it never passes 99 % — and it falls when she unmutes Junie */
  private drawRing(ctx: CanvasRenderingContext2D, x: number, y: number, d: number): void {
    const cx = x + d / 2, cy = y + d / 2, r = d / 2 - 6;
    ctx.save();
    ctx.lineWidth = 10;
    ctx.strokeStyle = V3.grey;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = this.ring < 90 ? V3.danger : V3.bot;
    ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (Math.min(99, this.ring) / 100)); ctx.stroke();
    ctx.restore();
    setFont(ctx, 18); ctx.fillStyle = V3.ink;
    const s = `${Math.min(99, this.ring)}%`;
    const tw = Math.ceil(ctx.measureText(s).width);
    ctx.fillText(s, Math.round(cx - tw / 2), Math.round(cy - 14));
    setFont(ctx, 10); ctx.fillStyle = V3.ink2;
    const lw = Math.ceil(ctx.measureText(BOT.heading.ring).width);
    ctx.fillText(BOT.heading.ring, Math.round(cx - lw / 2), Math.round(cy + 6));
  }

  /** her contacts as a network: exposure sources in red; Junie turns warm when she unmutes her */
  private drawMap(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    roundEdge(ctx, x, y, w, h, 6, V3.edge, V3.card);
    const cx = x + Math.round(w * 0.40), cy = y + Math.round(h / 2) + 4;
    const R = BOT.map;
    const pos: Record<string, [number, number]> = {
      mum: [-0.30, -0.30], dad: [-0.36, 0.20], sam: [-0.20, 0.38], junie: [0.10, -0.32], house: [0.26, 0.22], line: [0.02, 0.40], bot: [0.28, -0.06]
    };
    const nodeAt = (id: string): [number, number] => { const p = pos[id] ?? [0, 0]; return [Math.round(cx + p[0] * w), Math.round(cy + p[1] * (h - 24) * 1.2)]; };
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
      setFont(ctx, 11); ctx.fillStyle = V3.ink;
      ctx.fillText(n.label, nx + d / 2 + 3, ny - 6);
      if (muted || n.kind === 'left') {
        setFont(ctx, 9); ctx.fillStyle = V3.ink2;
        ctx.fillText(n.kind === 'left' ? R.leftTag : R.mutedTag, nx + d / 2 + 3, ny + 6);
      }
    }
    void exposure;
    setFont(ctx, 12); ctx.fillStyle = V3.danger;
    const ew = Math.ceil(ctx.measureText(R.exposure).width);
    ctx.fillText(R.exposure, x + w - ew - 8, y + 6);
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
    thumb(ctx, ox, py0, 128, 92, 3, false, 6);
    setFont(ctx, 14); ctx.fillStyle = V3.ink; ctx.fillText(PH.original, ox, py0 + 100);
    let sy = py0 + 126;
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
        let ty = sy + 38;
        for (let k = 0; k < this.botLinesShown; k++) {
          setFont(ctx, 15);
          const tw = Math.ceil(ctx.measureText(b.lines[k]).width) + 22;
          avatar(ctx, ox, ty, 20, V3.primary, 'S');
          roundRect(ctx, ox + 26, ty - 2, tw, 24, 9, V3.botSoft);
          setFont(ctx, 15); ctx.fillStyle = V3.ink; ctx.fillText(b.lines[k], ox + 37, ty + 2);
          ty += 30;
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
  handleClick(x: number, y: number): boolean {
    const lg = this.hits.find(h => h.id.startsWith('lg-') && x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    this.lambyGuide?.activity();
    if (lg?.id === 'lg-tray') { this.nowLine = null; this.waitNow = false; }
    if (lg && this.lambyGuide?.press(lg.id)) { this.version++; return true; }
    this.quietT = 0;
    this.stallT = 0;
    this.idleT = 0;
    if (this.idleOrb) { this.idleOrb = null; this.version++; return true; }
    if (this.waitNow) { this.waitNow = false; this.version++; }
    if (this.nowLine) { this.nowLine = null; this.version++; }
    if (this.phase === 'handed') return false;
    if (this.phase === 'failed') return true;
    if (this.phase === 'saver') { this.wake(); return true; }
    if (this.phase !== 'open') return true;
    const hit = this.hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
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
    if (id.startsWith('tab-')) { this.openTab(id.slice(4)); return true; }
    if (id === 'news-prev' || id === 'news-next') {
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
    if ((id === 'result-agent' || id === 'ad-chat') && this.step === 'results') {
      // ⚑ beat 10 — the one voice that stays
      markE4('bot');
      ledger.e4Space.push({ id: 'agent', outcome: 'opened', witness: W3.agent });
      playOnce('agent_2026.mp3');
      this.go('bot');
      this.startBot('hello');
      return true;
    }
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

  private openTab(id: string): void {
    if (!this.tabs.some((t) => t.id === id)) return;
    this.liveId = id;
    const t = this.tabs.find((x) => x.id === id)!;
    const art = ARTICLES[this.newsIndex];
    if (t.kind === 'news' && art && !this.read.has(art.id)) {
      this.read.add(art.id);
      ledger.e4Space.push({ id: `tab:${art.id}`, outcome: 'read', witness: `read: ${art.mast} — ${art.head}` });
    }
    this.version++;
  }

  /** the room's coordinate-less press, and the debug panel's own exit */
  handOverLid(): void { this.phase = 'handed'; this.version++; }
  /** the device has stopped: the agent's page cannot be reached any more */
  fail(): void { if (this.phase !== 'failed') { this.phase = 'failed'; this.failT = 0; if (this.streamOpen) this.liveId = 'search'; this.version++; } }
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

/** her bubble in the bot's chat: the warm of her own room, not the agent's mint */
const KETTLE_MINE = V3.ticket;
