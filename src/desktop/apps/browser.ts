import polish from '../../../data/strings/playtestPolish.json';
import { drawLambyGuide, drawGuidePointer, type GuidePaint } from './lambyGuideDraw';
import type { LambyGuide } from '../../narrative/lambyGuide';
/**
 * ⚑ ERA 4'S BROWSER — S123, and it is the era's primary surface.
 *
 * Plan of record: `docs/reinterp/ERA4_E_PLUS_B_BUILD_2026-09-07.md` (E + B —
 * "the chapter has already happened", on the laptop, with the headset demoted
 * to one late sequence). Sérgio, 2026-09-07: *"I would start with the Boot up
 * and the fake chrome system and stuff."* This file is that, and only that:
 * the restore, the chrome, the tab row, and the search tab. The other four
 * tabs are declared and empty on purpose — see `TabId` below.
 *
 * ⚑ WHY THE BROWSER AT ALL. Eras 1–3 are a desktop; Era 4 was the only era
 * that left the computer, in a piece called PC Simulator. And the documented
 * 2026 apparatus is a browser: the research pass of 2026-09-07 found live
 * systems that present as information, support and "balance" rather than as
 * correction. The headset was always our extrapolation.
 *
 * ⚑ THERE IS NO TEXT BOX AND THERE NEVER WILL BE. R28 amendment 3 — no free
 * text, anywhere, ever; even the player's own name is `o3_prefilled_name`,
 * *"they already know your name."* That is not a limitation this file works
 * around, it is the file's sharpest object: the address bar holds six words she
 * typed and stopped, and the engine has already finished the sentence four
 * ways. She cannot type. Neither can the player. **The apparatus writes both
 * halves**, and no line anywhere remarks on it.
 *
 * ⚑ INVENTED MARKS ONLY, per Sérgio 2026-09-07: *"I would not use real names, I
 * would use symbolic representations of the topic, because that is the
 * educational side."* `Lantern` and `Second Thoughts` name CATEGORIES of thing,
 * not instances; the Dossier carries what is documented about the category.
 */
import lexStrings from '../../../data/strings/lexicon.json';
import { meetWord } from '../../room/lexicon';
import { px, setFont, wrapText } from '../theme/chrome';
import { playOnce, anythingPlaying } from '../../audio/tapeAudio';
import { Screensaver, SAVER_SECONDS } from './screensaver';
import SAVERS from '../../../data/strings/screensavers.json';
import { entriesByEra } from '../../witness/record';
import { pulse as witnessPulse } from '../../witness/pulse';
import { browserChrome, restoring, photograph, glitchBands, CHROME, ADDR, ERA4 } from '../theme/era4';
import updates from '../../../data/strings/updates.json';
import fixes from '../../../data/strings/visitorFixes.json';
import { ledger } from '../../state/ledger';
import { drawGlow } from '../../witness/pathGlow';
import { pauseWords } from '../../narrative/pauses';
import { buildStartModel } from '../../witness/startModel';
import { StartMenuMap } from './startMenuMap';
import { gameMenuBus } from '../../state/gameMenuBus';
import startCopy from '../../../data/strings/slice.json';
import { StartPanel, fakeOs } from './startPanel';   // S229 / W1-A6
import { beatDone } from '../../witness/map';
import { FloppySheep, FLOPPY_LABEL } from './floppysheep';
import script from '../../../data/dialog/s4_boot.json';
import {
  WEB, PLACE, roundRect, roundEdge, pill, webCard, webButton, chipRow, progressBar,
  avatar, messageBar, thumb, composite, profileGlyph, streamScene, streamShot, type TabLook
} from '../theme/era4';
import body from '../../../data/dialog/s4_browser.json';
import ballScript from '../../../data/dialog/s4_ball.json';

/** ⚑ the five tabs she left plus the one she did not. Only `search` draws a
 *  page in S123; the rest are the next sessions' work and are deliberately
 *  declared here so the chrome is honest about what the era will contain. */
type TabId = 'search' | 'chat' | 'record' | 'photos' | 'care' | 'extra';
interface Tab { id: TabId; mark: string; title: string; notHers?: boolean; address?: string }
const TABS = script.tabs as unknown as Tab[];
interface Thread { id: string; name: string; preview: string; time: string; badge?: string }
interface FileItem { name: string; kind: 'folder' | 'file'; meta: string }
interface Failed { status: string; title: string; line: string; detail: string; step: string }
const PROGRAM = body.program as unknown as {
  chosen: string; typingSeconds: number; agentMark: string; agentAddress: string;
  failed: Failed;
  console: { mark: string; restored: string; typing: string; managed: string; ready: string; worn: string;
    restoring: string; results: string; wait: string };
  saver: { mark: string; line: string; witness: string };
  results: { title: string; historyLabel: string; history: string[]; queryLabel: string; relatedLabel?: string; related?: string[];
    results: { id: string; title: string; url: string; snippet: string; press?: boolean; sponsored?: string; why?: string }[] };
};
/**
 * ⚑ S293 — THE AGENT CONDUCTS (s4_browser.json `agent`, RESEARCH_2026_V2_WEAPONISED_CARE §4.2 V2–V9). The five
 * numbered steps on rails are retired; the middle of 2026 is one conversation on the agent's own page. Each beat:
 * the agent's lines arrive a bubble at a time, then ONE way on — two chips (both continue, both filed: register,
 * never branch), or one button, or a card whose one live row is the press. The beat's card (the referral list, the
 * record, the composite, the care log and her story, the threads) stands in the right-hand panel, the way a 2026
 * assistant opens a canvas beside its chat.
 */
type CardId = 'resources' | 'record' | 'composite' | 'care' | 'threads';
interface Chip { label: string; filed: string }
interface Beat { id: string; lines: string[]; chips?: Chip[]; button?: string; card?: CardId; filed?: string; console?: string }
const AGENT = body.agent as unknown as {
  mark: string; heading: string; privacy: string; lineSeconds: number; composer: string; beats: Beat[];
  resources: { title: string; items: { id: string; name: string; meta: string; open: boolean }[] };
  record: { rows: { k: string; v: string; note?: string; locked?: boolean }[] };
  photo: { title: string; path: string; items: FileItem[]; folderItems: FileItem[]; cancel: string; back: string;
    restoring: string; restoringSeconds: number; stages: string[]; adjusted: string[]; before: string; after: string; strip: string; saved: string };
  care: { title: string; storiesTitle: string; other: { quote: string; who: string }; hers: { who: string; shared: string } };
  threads: { title: string; sub: string; items: Thread[]; witness: string };
};
const DEFAULTS = (body as unknown as { defaults: { title: string; sub: string; rows: { k: string; v: string; tag?: string; icon: string }[];
  fine: string; continue: string; witness: string } }).defaults;
const PROFILE = (body as unknown as { profile: Record<'default' | 'composite' | 'maya', string> }).profile;
const THREAD = (body as unknown as { thread: { name: string; sub: string; messages: { when: string; text: string }[]; reply: string; replied: string; after: string } }).thread;
const REVERSAL = (body as unknown as { reversal: { title: string; current: string; original: string; button: string; verifying: string;
  verifySeconds: number; match: string; matched: string; witness: string } }).reversal;
const CURRENT_AFTER = (body.record as unknown as { currentAfter: { v: string; note: string } }).currentAfter;
const STREAM = ballScript.stream as unknown as { mark: string; live: string; watching: string; count: number };
const FRAME_ROWS = (ballScript.frame as unknown as { rows: { k: string; v: string }[] }).rows;
const beatIndex = (id: string): number => AGENT.beats.findIndex((b) => b.id === id);
/** the page area under the toolbar, for painting the app ground */
const H_PAGE = 384;
/** ⚑ the failure on the desk's two screens, in seconds from the device stopping:
 *  the sentence holds, then the bands tear it, then both are off — and the Close's
 *  travel begins over dead screens (app.ts CLOSE_LEAD_SECONDS is set to match). */
// ⚑ Phase 7 (his: "we need more time to see the computers break down") — the sentence holds a
//   little longer and the bands take eight seconds to eat both screens, not three
export const FAIL = { bands: 6.5, off: 14.5 } as const;
/** …except after the Restoration, whose before/after is the point: it holds */
const RESULT_HOLD_SECONDS = 4.5;   // S150: no longer an advance — kept for the tour's timing notes
void RESULT_HOLD_SECONDS;

/** under four seconds. E2's splash is 23.7 because 2003 made you watch it. */
const RESTORE_SECONDS = 2.4;
/** P7-66: an auto-reply is fast — that is part of what it says */
const ENQUIRY_REPLY_SECONDS = 3.2;
const ENQ = body.enquiry as { draftLabel: string; to: string; subject: string; message: string[]; send: string; sent: string;
  replyFrom: string; replySubject: string; reply: string[]; directory: string; referred?: string; close: string; witness: string };
/**
 * ⚑ THE BOOT LINE, BEFORE THE RESTORE (2026-09-12). Sérgio: "it needs a boot
 * up moment of the OS, just aesthetically stating like 'L — Is booting up for
 * you, Maya' and then 'Restoring session'… giving like a few seconds so the
 * person can settle in the new position." The companion names itself and names
 * her, alone on the page, and only then does the session come back.
 */
const BOOT_SECONDS = 2.6;
/** the tabs come back one at a time as the restore completes. */
const TAB_GAP = 0.22;
/**
 * ⚑ AND THE SIXTH ARRIVES LATE — S129, and it is the whole of what the restore
 * has to say. Five tabs come back at an even beat, because they are one set:
 * the session she left. Then a pause the length of three of those beats, and a
 * sixth lands on its own.
 *
 * Nothing marks it, nothing points at it, and no line anywhere mentions it
 * again. It is simply not part of the rhythm the other five established, which
 * is the only way this surface can say *she did not open this one* without
 * saying it. ⚑ At an even gap it read as a set of six; the beat is the whole
 * difference between a session and an intrusion.
 */
const EXTRA_GAP = TAB_GAP * 3;
const CURSOR_BLINK = 0.53;

export interface Hit { x: number; y: number; w: number; h: number; id: string }

/**
 * ⚑ NOBODY HAS TO READ THEM ALL — Sérgio, 2026-09-08, and it is the ruling that
 * shapes this whole surface. Six tabs, any order, **none of them gating
 * anything**: the headset is on the desk from the era's first frame and the era
 * ends when she wears it, whether one tab has been opened or six.
 *
 * ⚑ SO ERA 4 IS AS LONG AS THE PLAYER MAKES IT, which is the answer to the note
 * he has now given three times — that the era takes too much of the piece. Two
 * tabs is about four minutes; six is about nine; neither is the wrong path,
 * because there is no path. Nothing is ever marked unread, nothing nags, and no
 * surface anywhere counts what is left.
 *
 * ⚑ AND WHAT YOU CHOSE TO READ IS FILED. Every tab opened writes one line to
 * the session file, in the machine's flattest voice: you are reading its record
 * of her while it keeps a record of your reading. Once per tab — opening
 * something twice is re-reading, not a second interest.
 */

export class E4Browser {
  lambyGuide: LambyGuide | null = null;
  onGuideLook: (() => void) | null = null;
  pressGuideTarget(id: string): void {
    if (!['search-open', 'result-agent', 'start-menu', 'res-meridian', 'tab3', 'thread-junie'].includes(id) || this.guideSilent || this.guideVoice) return;
    const r = this.hits.find(h => h.id === id);
    if (r) this.handleClick(r.x + r.w / 2, r.y + r.h / 2);
  }
  lambyGuidePaint: GuidePaint = { rings: [], balloon: false };

  /**
   * ⚑ `dormant` FIRST (2026-09-12). The shell — and this browser with it — is
   * built at the update ritual's restart, MID-FLIGHT, so a clock that starts
   * at construction has finished restoring before the camera lands: the boot
   * that d50f88a built was never once in the played path. The page stays dark
   * until `beginSession()` is called — by app.ts's `endRelocation` on the real
   * E3→E4 leg, with the settle delay, and by the review jumps at once.
   */
  private phase: 'dormant' | 'saver' | 'restoring' | 'open' | 'handed' | 'failed' = 'dormant';
  /** S160 / R3-87: the screensaver's own clock — the mark drifts on it */
  private saverT = 0;
  /** ⚑ S208 — GraceOS's breathing orb (screensaver.ts 'orb'): the arrival's sleep, and the laptop's own sleep again
   *  after SAVER_SECONDS of quiet on the restored page with nothing playing (that one files nothing) */
  private orb: Screensaver | null = null;
  private idleOrb: Screensaver | null = null;
  private idleT = 0;
  private wotdSaid = false;   // S209 / P7-47
  /** ⚑ S229 / W1-A6 — GraceOS's welcome-back card: once, on the restored page before the search, under nothing and over
   *  nothing (the page's lower half is bare); the map's conditions are asked of THIS browser (browserOpen, resultsSeen) */
  private readonly startPanel = new StartPanel('e4', (k) => beatDone(k, fakeOs({ e4: { browser: this } } as never)));
  private readonly startMap = new StartMenuMap();
  private get startMapSilent(): boolean { return !this.pressable || this.phase !== 'open' || !!this.idleOrb || this.mode === 'game' || (this.liveTab === 'chat' && this.threadOpen); }
  private startModel() { return buildStartModel(fakeOs({ e4: { browser: this } } as never), 'e4'); }
  private startCalm(): boolean {
    return !this.startMap.active && this.phase === 'open' && this.mode === 'free' && this.liveTab === 'search' && this.pressable && !this.idleOrb && !this.enquiryOpen && !this.defaultsOpen;
  }
  /** seconds still to wait before the boot line — the settle after landing */
  private settleT = 0;

  // ── ⚑ THE PROGRAM (2026-09-12) — see s4_browser.json `program._doc` ─────────
  /** free: the restored session, hers · typing: the search being finished for
   *  her · agent: Second Thoughts introducing itself · program: the five steps */
  private mode: 'free' | 'typing' | 'results' | 'agent' | 'game' = 'free';
  /** ⚑ S168 / R3-92 — FLOPPYSHEEP, THE COMPUTER VERSION (his 2026-09-21: now). The
   *  same game as Vera's phone (`floppysheep.ts`), on a bookmark in the free
   *  browser: one press away while the session waits — the same thing it said in
   *  2016, said again on a bigger screen. Optional; files nothing; never on rails
   *  (the bookmark is gone once the agent has the page). Drawn in a phone-shaped
   *  frame at GAME_SCALE; presses are mapped back into the game's own space. */
  private readonly floppy = new FloppySheep();
  private gameFrame = { x: 0, y: 0, s: 1 };
  /** ⚑ S293 / V0 — the update's defaults, over the restored page until Continue */
  private defaultsDone = false;
  private get defaultsOpen(): boolean { return this.phase === 'open' && this.mode === 'free' && !this.defaultsDone; }
  /** ⚑ S293 — who the toolbar thinks she is: Default → the composite → Maya */
  private profile: 'default' | 'composite' | 'maya' = 'default';
  // ── ⚑ S293 — THE CONVERSATION (see AGENT above) ──────────────────────────
  /** the live beat, an index into AGENT.beats */
  private beat = 0;
  /** seconds since the live beat began: its lines arrive on this */
  private beatT = 0;
  /** what has been said, oldest first: the agent's lines, her answers and what it filed under them */
  private said: { who: 'agent' | 'her' | 'filed'; text: string }[] = [];
  /** the chips she pressed, by beat — her story is made of these and nothing else (V8) */
  private chose = new Map<string, string>();
  /** the beat has been answered; the next begins after a short breath */
  private nextIn = -1;
  /** kept for the walker's bstate: beats answered (it reads `turnDone` / `stepDone`) */
  private turnDone = new Set<string>();
  private stepDone = new Set<string>();
  get step(): number { return this.beat; }
  /** V9 — the threads card is up (after access), then Junie's sheet, then her reply */
  private threadsUp = false;
  private threadOpen = false;
  private repliedT = -1;
  get junieReplied(): boolean { return this.repliedT >= 0; }
  /** V10 — the reversal on the Photos tab: confirm the original, the verifier, the match */
  private reversal: 'none' | 'verifying' | 'matched' = 'none';
  private reversalT = 0;
  get reversed(): boolean { return this.reversal === 'matched'; }
  /** ⚑ P7-66 — her enquiry to Meridian (s4_browser.json `enquiry`), opened from the agent's referral list now (V3–V4):
   *  her draft, one press to send it, the auto-reply seconds later, and Close. The agent is absent from the card. */
  private enquiry: 'none' | 'draft' | 'sending' | 'replied' | 'closed' = 'none';
  private enquiryT = 0;
  private get enquiryOpen(): boolean { return this.phase === 'open' && this.mode === 'agent' && (this.enquiry === 'draft' || this.enquiry === 'sending' || this.enquiry === 'replied'); }
  private typeT = 0;
  /** ⚑ S203 — L's "while you wait": seconds without a press while the agent has the page; said once */
  private quietT = 0;
  private waitSaid = false;
  private waitNow = false;
  /** ⚑ S207 — a line L says on the laptop until her next press: the pause, or a way back */
  private nowLine: string | null = null;
  private freeQuietT = 0;
  private pauseSaid = false;
  /** ⚑ the felt sheet: nothing of the agent's, L's or Lamby's may speak while it is up */
  private get feltUp(): boolean { return this.mode === 'agent' && this.threadOpen && this.liveTab === 'search'; }
  /** S207 — the way back: L names the main path's next step (os.wayBack) */
  get guideSilent(): boolean { return this.startMap.active || !this.pressable || this.phase !== 'open' || !!this.idleOrb || this.mode === 'game' || this.feltUp || this.enquiryOpen || this.picker !== 'closed'; }
  get guideVoice(): boolean { return this.mode !== 'free' && (!!this.nowLine || this.waitNow); }
  sayLine(line: string): void { this.nowLine = line; this.version++; }
  /** the photograph tool's own little machine (V6–V7): the file window, a folder, the making, the result */
  private picker: 'closed' | 'open' | 'folder' | 'restoring' | 'result' = 'closed';
  /** the photograph she chose — the save line names it */
  private chosenFile = '';
  private pickerT = 0;

  get programMode(): string { return this.mode; }
  /** the live beat, or null outside the conversation */
  private get cur(): Beat | null { return this.mode === 'agent' ? AGENT.beats[this.beat] ?? null : null; }
  /** how many of the live beat's lines are on the page yet */
  private get linesShown(): number {
    const b = this.cur;
    if (!b) return 0;
    return Math.min(b.lines.length, 1 + Math.floor(this.beatT / AGENT.lineSeconds));
  }
  /** the live beat's lines are all in, so its way on may be offered */
  private get beatReady(): boolean { const b = this.cur; return !!b && this.linesShown >= b.lines.length && this.beatT >= (b.lines.length - 1) * AGENT.lineSeconds + 0.5; }
  /** the conversation is over: the original confirmed, the agent satisfied, the headset is what is left */
  get programDone(): boolean { return this.mode === 'agent' && this.reversal === 'matched' && this.cur?.id === 'ready' && this.beatReady; }
  /** for the walker's bstate: a choice is on the page and unanswered */
  turnPending(): boolean { const b = this.cur; return !!b && !!b.chips && this.beatReady && !this.turnDone.has(b.id); }
  /** the line L's console on the laptop shows — see E4Shell.drawLaptop */
  get consoleLine(): string {
    const c = PROGRAM.console;
    if (this.feltUp) return '';   // Junie's thread: nobody else speaks
    if (this.lambyGuide?.active) return polish.sessionStatus;
    if (this.nowLine) return this.nowLine;
    if (this.waitNow) return c.wait;
    if (this.phase === 'restoring') return c.restoring;   // S160 / R3-91: the laptop says what it is doing
    if (this.mode === 'free' || this.mode === 'game') return this.phase === 'open' ? c.restored : '';
    if (this.mode === 'results') return c.results;
    if (this.mode === 'typing') return c.typing;
    if (this.programDone) return c.ready;
    return this.cur?.console ?? c.managed;
  }
  get consoleMark(): string {
    if (this.feltUp) return '';
    return this.mode === 'free' || this.mode === 'game' || this.mode === 'typing' || this.mode === 'results' ? PROGRAM.console.mark : PROGRAM.agentMark;
  }
  get consoleLineWorn(): string { return PROGRAM.console.worn; }
  /** review only: land past the conversation, the original confirmed, headset wearable */
  debugFinishProgram(): void {
    this.defaultsDone = true;
    this.mode = 'agent';
    this.enquiry = 'closed';
    for (const b of AGENT.beats) { this.turnDone.add(b.id); this.stepDone.add(b.id); }
    this.beat = beatIndex('ready');
    this.beatT = 99;
    this.reversal = 'matched';
    this.profile = 'maya';
    this.repliedT = 99;
    this.live = 0;
    this.version++;
  }
  /** file one line of the conversation's record — `conv:<beat>` is what the map and the walker read */
  private fileBeat(id: string, witness: string, outcome: 'answered' | 'done' | 'opened' | 'read' = 'done'): void {
    if (ledger.e4Space.some((e) => e.id === `conv:${id}`)) return;
    ledger.e4Space.push({ id: `conv:${id}`, outcome, witness });
  }
  /** the live beat is answered: her bubble (if she said something), what it filed, and the next beat after a breath */
  private answer(label: string | null, filed: string | undefined): void {
    const b = this.cur;
    if (!b || this.stepDone.has(b.id)) return;
    this.turnDone.add(b.id);
    this.stepDone.add(b.id);
    for (let k = 0; k < b.lines.length; k++) this.said.push({ who: 'agent', text: b.lines[k] });
    if (label) { this.said.push({ who: 'her', text: label }); this.chose.set(b.id, label); }
    if (filed) this.said.push({ who: 'filed', text: filed });
    this.fileBeat(b.id, filed ?? `${b.id}: done`, label ? 'answered' : 'done');
    playOnce('ui_press.mp3');
    // the messages beat stays: its threads, Junie's sheet and the reversal all happen under it
    if (b.id === 'messages') this.threadsUp = true; else this.nextIn = 0.9;
    this.version++;
  }
  /** move to the beat after this one */
  private advanceBeat(): void {
    if (this.beat < AGENT.beats.length - 1) this.beat += 1;
    this.beatT = 0;
    this.version++;
    if (AGENT.beats[this.beat]?.lines.length) playOnce('agent_2026.mp3');
  }
  /** her story, made only of the chips she pressed (V8) */
  private storyQuotes(): string[] {
    const out: string[] = [];
    for (const id of ['open', 'back']) { const l = this.chose.get(id); if (l) out.push(`“${l.replace(/\.$/, '')}.”`); }
    return out;
  }
  /** ⚑ S293 — the one press the story is waiting on now, for the glow (src/witness/pathGlow.ts's `path` ring). A
   *  choice of two chips is never ringed: either is the path. Junie's sheet is never ringed: it is felt. */
  private pathIds(): Set<string> {
    const s = new Set<string>();
    if (this.phase !== 'open' || (this.feltUp && !this.junieReplied)) return s;
    if (this.defaultsOpen) { s.add('def-continue'); return s; }
    if (this.mode === 'free') { s.add('search-open'); return s; }
    if (this.mode === 'results') { s.add('result-agent'); return s; }
    if (this.mode !== 'agent') return s;
    if (this.enquiry === 'draft') { s.add('enq-send'); return s; }
    if (this.enquiry === 'replied') { s.add('enq-close'); return s; }
    if (this.picker === 'open') { s.add('file-0'); return s; }
    if (this.picker === 'folder') { s.add('file-2'); return s; }
    const b = this.cur;
    if (!b || !this.beatReady) return s;
    if (b.id === 'resources' && this.enquiry === 'none') s.add('res-meridian');
    else if (b.id === 'messages' && this.turnDone.has('messages') && !this.threadOpen) s.add('thread-junie');
    else if (b.id === 'messages' && this.junieReplied && this.reversal === 'none') {
      if (this.liveTab === 'photos') s.add('photo-original'); else s.add('tab3');
    } else if (b.button && !this.stepDone.has(b.id)) s.add('conv-act');
    return s;
  }

  /** the session begins: the settle, the boot line, the restore, the tabs. */
  beginSession(settleSeconds = 0): void {
    if (this.phase !== 'dormant') return;
    this.settleT = settleSeconds;
    this.t = 0;
    // S160 / R3-87 (Sérgio: "a screensaver screen to press on to restore"): the machine is
    // asleep on its mark until she presses it; the restore is her first act, not the landing's
    this.phase = 'saver';
    this.saverT = 0;
    this.orb = new Screensaver('orb', 2026);
    this.orb.line = PROGRAM.saver.line;
    this.version++;
  }
  /** ⚑ S208 — the laptop sleeps again only on the restored page at rest: nothing said, nothing playing, pressable */
  private updateIdleOrb(dt: number): void {
    const quiet = !this.startMap.active && this.phase === 'open' && this.mode === 'free' && this.pressable && !this.nowLine && !this.waitNow && !anythingPlaying();
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
  /** the press on the screensaver: the restore begins */
  private wake(): void {
    if (this.phase !== 'saver') return;
    ledger.e4Space.push({ id: 'saver', outcome: 'pressed', witness: PROGRAM.saver.witness });
    this.phase = 'restoring';
    this.t = 0;
    this.version++;
  }
  private t = 0;
  private live = 0;
  private hits: Hit[] = [];
  /** ⚑ see `draw`: false while the device is on her face, and then this surface
   *  publishes nothing, because nothing here can be pressed. */
  private pressable = true;
  private publish(h: Hit): void { if (this.pressable) this.hits.push(h); }
  private filed = false;
  /** the record's change request: it works, it files, and nothing moves. */
  private requested = false;
  /** which care items she has undone — each undo works, and undoing them all
   *  still leaves the six weeks they were in force. */
  private undone = new Set<number>();
  /** the photograph's flip, free and repeatable (S119's rule, kept). */
  private enhanced = true;
  /** tabs already filed — see `openTab`. */
  private read = new Set<string>();
  version = 0;

  get stageId(): string { return this.phase; }
  get liveTab(): TabId { return TABS[this.live]?.id ?? 'search'; }
  /** S145 — the map asks whether the session has come back (the wake beat) */
  get isOpen(): boolean { return this.phase === 'open' || this.phase === 'handed' || this.phase === 'failed'; }

  /** the game in a phone-shaped frame on the page (S168 / R3-92) */
  private drawGame(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const top = ADDR.y + ADDR.h + 8;
    const GW = 140, GH = 280;
    const s = Math.min(1.25, (H - top - 12) / GH);
    const gx = Math.round((W - GW * s) / 2), gy = top;
    this.gameFrame = { x: gx, y: gy, s };
    px(ctx, gx - 6, gy - 6, Math.round(GW * s) + 12, Math.round(GH * s) + 12, WEB.cardEdge);
    ctx.save();
    ctx.translate(gx, gy);
    ctx.scale(s, s);
    ctx.beginPath(); ctx.rect(0, 0, GW, GH); ctx.clip();
    this.floppy.draw(ctx, GW, GH);
    ctx.restore();
    // the whole frame is the press (a hop); the game's own Back is inside it
    this.publish({ x: gx, y: gy, w: Math.round(GW * s), h: Math.round(GH * s), id: 'game-tap' });
    setFont(ctx, 9);
    ctx.fillStyle = CHROME.hint;
    const back = body.game.back;
    const bw = Math.ceil(ctx.measureText(back).width) + 16, bx = ADDR.x, by = top;
    px(ctx, bx, by, bw, 16, WEB.card);
    ctx.fillText(back, bx + 8, by + 4);
    this.publish({ x: bx, y: by, w: bw, h: 16, id: 'game-back' });
  }

  update(dt: number): void {
    if (this.startMap.update(dt)) this.version++;
    // ⚑ a surface that has stopped being pressable publishes nothing, even if
    //   nothing redraws it: the walk found a stale `tab0` still advertised
    //   through the whole finale and pressed it forty-five times (2026-09-12)
    if (!this.pressable && this.hits.length) this.hits = [];
    if (this.phase === 'dormant') return;
    if (this.startPanel.tick(dt, this.startCalm())) this.version++;   // S229 / W1-A6
    // ⚑ S207 — 2026's PAUSE (pauses.json): restored, before the search, after a quiet moment, L says once what
    //   else is open to her — only what is left (the console only once its game is there)
    if (!this.pauseSaid && this.phase === 'open' && this.mode === 'free' && !this.defaultsOpen) {
      this.freeQuietT += dt;
      if (this.freeQuietT > 10) {
        this.pauseSaid = true;
        const P = pauseWords('e4') as unknown as { line: string; items: Record<string, string>; joiner: string };
        const items: string[] = [];
        if (entriesByEra().e4.length >= 2 && !ledger.games.some((g) => g.id === 'matchmade')) items.push(P.items.matchmade);
        // S208 / A12 (REVIEW_ROUND_5, ERA26-17) — only what is left: a tab she has read (or a change she requested) is not offered
        if (!ledger.e4Space.some((e) => e.id === 'record' || e.id === 'tab:record')) items.push(P.items.record);
        if (!ledger.e4Space.some((e) => e.id === 'tab:photos')) items.push(P.items.photos);
        if (items.length) { this.nowLine = P.line.replace('{items}', items.join(P.joiner)); this.version++; }
      }
    }
    // ⚑ S209 / P7-47 — L's phrase of the day, once, after the pause's line, on the restored page at rest
    // ⚑ S219 / W1-B14 — no longer behind the pause's line (it never came for a player who searched at once)
    if (!this.wotdSaid && this.phase === 'open' && this.mode === 'free' && !this.nowLine && !this.defaultsOpen) {
      this.freeQuietT += dt;
      if (this.freeQuietT > 10) {
        const app = lexStrings.wotdApps.e4;
        const t = (lexStrings.terms as { id: string; word: string | null; line: string | null }[]).find((x) => x.id === app.word);
        if (t?.word) { this.wotdSaid = true; meetWord(t.id); this.sayLine(`${app.title}: ${t.word}. ${t.line ?? ''}`); }
      }
    }
    // ⚑ S203 — L's "while you wait" (see s4_browser.json console._docWait)
    if (!this.waitSaid && this.phase === 'open' && (this.mode === 'results' || this.mode === 'agent') && !this.feltUp && !this.enquiryOpen) {
      this.quietT += dt;
      if (this.quietT > 25 && entriesByEra().e4.length >= 2 && !ledger.games.some((g) => g.id === 'matchmade')) {
        this.waitSaid = true; this.waitNow = true; this.version++;
      }
    }
    if (this.mode === 'game') {
      const v = this.floppy.version;
      this.floppy.update(dt);
      if (this.floppy.version !== v) this.version++;
    }
    // S145 — the record tab's lamp: one upload per pulse step, not per frame
    const lamp = Math.ceil(witnessPulse.k() * 6);
    if (lamp !== this.lampStep) { this.lampStep = lamp; this.version++; }
    if (this.phase === 'failed') {
      // ⚑ S293 — the stream on the monitor is video: a few frames a second, for as long as it is on
      if (this.streamOpen && Math.floor(this.failT * 6) !== Math.floor((this.failT + dt) * 6)) this.version++;
      if (this.streamOpen && this.failT >= FAIL.off + 0.5) this.failT += dt;
      // ⚑ 2026-09-13: the failure spreads — the sentence, the bands, then off
      if (this.failT < FAIL.off + 0.5) {
        const b4 = this.failT;
        this.failT += dt;
        if (Math.floor(b4 * 12) !== Math.floor(this.failT * 12)) this.version++;
        // ⚑ the sounds of two screens dying are played ONCE, from here (the
        //   laptop's clock in space.ts is the same clock; one source, no doubling)
        if (b4 < FAIL.bands && this.failT >= FAIL.bands) playOnce('static_2026.mp3');
        if (b4 < FAIL.off && this.failT >= FAIL.off) playOnce('power_down_2026.mp3');
      }
      return;
    }
    if (this.settleT > 0) { this.settleT = Math.max(0, this.settleT - dt); return; }
    if (this.phase === 'saver') {
      this.saverT += dt;
      if (this.orb?.update(dt)) this.version++;   // the orb breathes in steps
      return;
    }
    this.t += dt;
    this.updateIdleOrb(dt);
    if (this.phase === 'restoring') {
      // ⚑ the whole boot is a clock and a line. Nothing is pressable during it,
      // and nothing can be skipped — the same ruling E2's splash got.
      if (this.t >= BOOT_SECONDS + RESTORE_SECONDS + (TABS.length - 1) * TAB_GAP + EXTRA_GAP) {
        this.phase = 'open';
        this.t = 0;
        this.file();
      }
      this.version++;
      return;
    }
    // ── the conversation's clocks ──
    if (this.mode === 'typing') {
      this.typeT += dt;
      this.version++;
      // S160 / R3-89: the finished search lands on a RESULTS page, not on the agent
      if (this.typeT >= PROGRAM.typingSeconds + 0.6) { this.mode = 'results'; this.version++; }
      return;
    }
    if (this.mode === 'agent') {
      const before = this.beatT;
      this.beatT += dt;
      // repaint on each bubble and each typing dot, not each frame
      if (Math.floor(before / 0.3) !== Math.floor(this.beatT / 0.3) && this.beatT < 12) this.version++;
      if (this.nextIn >= 0) { this.nextIn -= dt; if (this.nextIn < 0) { this.nextIn = -1; this.advanceBeat(); } }
      // P7-66: the enquiry's own clock — "Sent", then the reply, a few seconds later
      if (this.enquiry === 'sending') {
        this.enquiryT += dt;
        if (this.enquiryT >= ENQUIRY_REPLY_SECONDS) { this.enquiry = 'replied'; this.version++; }
      }
      if (this.picker === 'restoring') {
        const b4 = this.pickerT;
        this.pickerT += dt;
        if (Math.floor(b4 * 8) !== Math.floor(this.pickerT * 8)) this.version++;
        if (this.pickerT >= AGENT.photo.restoringSeconds) {
          this.picker = 'result';
          playOnce('step_done_2026.mp3');
          this.answer(null, `photograph: chosen — ${this.chosenFile}.jpg`);
        }
      }
      // V9: Junie's 'x', a breath after her reply
      if (this.repliedT >= 0 && this.repliedT < 3) { const b4 = this.repliedT; this.repliedT += dt; if (b4 < 2.2 && this.repliedT >= 2.2) this.version++; }
      // V10: the verifier, then the match — and the agent, satisfied, says its last two lines
      if (this.reversal === 'verifying') {
        this.reversalT += dt;
        if (this.reversalT >= REVERSAL.verifySeconds) {
          this.reversal = 'matched';
          this.profile = 'maya';
          this.threadOpen = false;   // the sheet folds away; the agent's page is what is behind it
          ledger.e4Space.push({ id: 'reversal', outcome: 'done', witness: REVERSAL.witness });
          playOnce('step_done_2026.mp3');
          this.advanceBeat();
        }
        this.version++;
      }
      return;
    }
    // the address bar's cursor is the only thing that moves on a settled page
    // ⚑ …and it stops moving the moment the device is on her face. The blink
    //   is a version bump, the version is a texture upload, and a monitor that
    //   nobody can press was re-uploading twice a second for the whole of the
    //   offers and the ball — an upload for nothing, and 900 ms of "the screen
    //   is still drawing itself" for the walker every time (2026-09-11).
    if (this.pressable &&
        Math.floor(this.t / CURSOR_BLINK) !== Math.floor((this.t - dt) / CURSOR_BLINK)) {
      this.version++;
    }
  }

  private file(): void {
    if (this.filed) return;
    this.filed = true;
    ledger.e4Space.push({ id: 'session', outcome: 'read', witness: script.boot.witness });
  }

  /** how many tabs have come back — during the restore this counts up. */
  private tabsBack(): number {
    if (this.phase === 'open') return TABS.length;
    const since = this.t - BOOT_SECONDS - RESTORE_SECONDS;
    if (since < 0) return 0;
    const n = Math.floor(since / TAB_GAP) + 1;
    // ⚑ the first five are the session; the sixth is not, and it waits.
    if (n < TABS.length) return Math.min(TABS.length - 1, n);
    const held = (TABS.length - 1) * TAB_GAP + EXTRA_GAP;
    return since >= held ? TABS.length : TABS.length - 1;
  }

  /**
   * ⚑ `pressable` — A SCREEN BEHIND YOUR HEAD DOES NOT PUBLISH CONTROLS
   * (2026-09-11). The monitor goes on drawing this browser after the device is
   * on her face, which is right — the desk does not stop existing — but the
   * room routes every press to the picture in front of her eyes from that
   * moment on (`era3Devices`'s monitor branch is gated on `stage === 'closed'`).
   * Left publishing, the six tabs became six controls advertised as live and
   * silently swallowed: the walk pressed them 45 times over, judged each inert,
   * and starved the offers of the presses they were waiting for until the run
   * died in front of an era that was working.
   *
   * That is this project's oldest defect class, and the walker has a name for
   * exactly this shape — "advertised as reachable while being physically
   * unreachable… the same class as a button drawn where nothing can press it".
   * The surface is the only thing that knows, so the surface says so.
   */
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
      setFont(ctx, 9); ctx.fillStyle = CHROME.buttonInk; ctx.fillText(S.paperMenu, W - 71, 9);
      this.hits.unshift({ x: W - 80, y: 3, w: 50, h: 20, id: 'start-menu' });
      const nav = this.startMap.draw(ctx, W, H, 'e4', this.startModel(), this.startMapSilent);
      if (nav.length) this.hits = [...nav, ...this.hits.filter(r => r.id === 'start-menu' || r.id === 'whattodo')];
    }

  }
  drawLaptopGuide(ctx: CanvasRenderingContext2D, W: number, H: number, hits: import('./lambyGuideDraw').GuideHit[]): void {
    if (this.lambyGuide?.canRequest && !this.startMap.active) this.lambyGuidePaint = drawLambyGuide(ctx, 'e4', this.lambyGuide.view, hits, { w: W, h: H }, this.hits.map(h => `press:${h.id}`));
  }
  pressLaptopGuide(id: string): boolean {
    if (id === 'lg-tray') { this.nowLine = null; this.waitNow = false; }
    this.lambyGuide?.activity();
    const took = this.lambyGuide?.press(id) ?? false;
    if (took) { this.version++; if (id === 'lg-show') this.onGuideLook?.(); }
    return took;
  }
  private drawSurfaceContent(ctx: CanvasRenderingContext2D, W: number, H: number, pressable: boolean): void {
    this.hits = [];
    this.pressable = pressable;
    const back = this.tabsBack();

    if (this.phase === 'dormant' || this.settleT > 0) {
      // the machine is simply off until the session begins
      px(ctx, 0, 0, W, H, CHROME.page);
      return;
    }
    if (this.phase === 'saver') {
      // S160 / R3-87 — the screensaver, one press; ⚑ S208: GraceOS's breathing orb (screensaver.ts)
      if (this.orb) this.orb.draw(ctx, W, H); else px(ctx, 0, 0, W, H, CHROME.page);
      this.publish({ x: 0, y: 0, w: W, h: H, id: 'saver-wake' });
      return;
    }
    if (this.idleOrb && this.phase === 'open') {   // S208 — asleep again; the whole glass only wakes it
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
    // ⚑ 2026-09-13: once the page is the agent's, the tab says so — it read
    //   "how do i tell" over Second Thoughts for the whole program
    const shown = TABS.slice(0, back).map((t) =>
      t.id === 'search' && this.phase === 'failed' && this.streamOpen ? { ...t, title: STREAM.mark }
        : t.id === 'search' && this.mode === 'agent' ? { ...t, title: PROGRAM.agentMark } : t);
    // ⚑ each tab shows its own address; only the search tab shows what she
    //   typed, and only it carries the cursor (2026-09-12, his review)
    const onSearch = this.liveTab === 'search';
    let addr = this.phase === 'failed' ? (this.streamOpen ? ballScript.invite.link : PROGRAM.agentAddress)
      : this.phase !== 'open' ? '' : onSearch ? script.search.typed : (TABS[this.live]?.address ?? '');
    let blink = this.phase === 'open' && onSearch && this.pressable && this.mode === 'free' && !this.defaultsOpen
      && Math.floor(this.t / CURSOR_BLINK) % 2 === 0;
    // ⚑ the search being finished FOR her: the typed six words, then the rest
    //   of the sentence arriving a character at a time, then the agent's address
    if (this.mode === 'typing') {
      const k = Math.min(1, this.typeT / PROGRAM.typingSeconds);
      const full = PROGRAM.chosen;
      const n = script.search.typed.length + Math.floor((full.length - script.search.typed.length) * k);
      addr = full.slice(0, n);
      blink = true;
    } else if (this.mode === 'results' && onSearch) {
      addr = PROGRAM.chosen;
    } else if (this.mode === 'agent' && onSearch) {
      addr = PROGRAM.agentAddress;
    }
    // ⚑ S145 — THE RECORD ON THE DEVICE, 2026 (THE_WITNESS_SYSTEM_PLAN §3E):
    //   the record tab's favicon lights on every filing (witness/pulse.ts) and,
    //   outside the conversation, its badge is the file's count. A sign, not a control.
    // ⚑ S293 — in the conversation the agent has the page: the other tabs are washed and publish nothing, until
    //   Junie's thread has been read — then Photos (where the original is kept) and the record open again.
    const lit = witnessPulse.k() > 0;
    const looks: TabLook[] = shown.map((t) => {
      if (this.phase === 'failed') return t.id === 'search' ? { badge: this.streamOpen ? '●' : '!', state: 'normal' } : { state: 'locked' };
      if (this.mode !== 'agent') return t.id === 'record' ? { badge: String(witnessPulse.countFor('e4')), lit } : {};   // S178: her file, not the run's
      if (t.id === 'search') return {};
      if ((t.id === 'photos' || t.id === 'record') && this.junieReplied) return { lit: t.id === 'record' && lit };
      return { state: 'locked' };
    });
    const rects = browserChrome(ctx, W, shown, this.live, addr, blink, looks, 80);
    rects.forEach((r, i) => {
      // ⚑ a locked tab publishes nothing, so nothing can be aimed at it
      if (this.mode === 'agent' && looks[i]?.state === 'locked') return;
      if (this.feltUp && TABS[i]?.id !== 'photos') return;   // the sheet: only the way to the original
      this.publish({ ...r, id: `tab${i}` });
    });
    // ⚑ S293 — the profile circle, and who it says she is (Default → the composite → Maya)
    if (this.phase === 'open' || this.phase === 'failed') {
      const name = PROFILE[this.profile];
      setFont(ctx, 8);
      const nw = Math.ceil(ctx.measureText(name).width) + 12;
      px(ctx, W - 38, ADDR.y + 2, 18, 18, CHROME.toolbar);
      profileGlyph(ctx, W - 37, ADDR.y + 3, 16, this.profile);
      const nx = W - 64 - 22 - nw;
      pill(ctx, nx, ADDR.y + 4, nw, 14, this.profile === 'maya' ? WEB.accentSoft : CHROME.bar);
      ctx.fillStyle = this.profile === 'maya' ? WEB.accentInk : CHROME.tabInk;
      ctx.fillText(name, nx + 6, ADDR.y + 7);
    }

    if (this.phase === 'failed') { this.drawFailed(ctx, W, H); return; }
    if (this.phase !== 'open') {
      // still coming back: the page under the chrome is empty and stays empty
      setFont(ctx, 9);
      ctx.fillStyle = CHROME.hint;
      ctx.fillText(script.boot.restoring, ADDR.x + 2, ADDR.y + ADDR.h + 12);
      // ⚑ and the one line the machine should not be able to say — see
      //   s4_boot.json `_docPrivate`. It arrives with the last of her tabs.
      if (back >= TABS.length - 1) ctx.fillText(script.boot.private, ADDR.x + 2, ADDR.y + ADDR.h + 24);
      return;
    }
    if (this.mode === 'game') { this.drawGame(ctx, W, H); return; }
    if (this.mode === 'free' && !this.defaultsOpen) {
      // S168 / R3-92: the bookmark — a chip at the address bar's foot, right
      const label = '☆ ' + FLOPPY_LABEL;
      setFont(ctx, 9);
      const bw = Math.ceil(ctx.measureText(label).width) + 14, bx = W - ADDR.x - bw, by = ADDR.y + ADDR.h + 4;
      px(ctx, bx, by, bw, 15, WEB.card);
      px(ctx, bx, by + 14, bw, 1, WEB.cardEdge);
      ctx.fillStyle = CHROME.hint;
      ctx.fillText(label, bx + 7, by + 4);
      this.publish({ x: bx, y: by, w: bw, h: 15, id: 'bm-floppy' });
    }
    if (this.mode === 'typing') { this.drawSearch(ctx, W); }
    else if (this.mode === 'agent') {
      switch (this.liveTab) {
        case 'photos': this.drawPhotos(ctx, W, H); break;
        case 'record': this.drawRecord(ctx, W, H); break;
        default:
          this.drawAgent(ctx, W, H);
          if (this.enquiryOpen) this.drawEnquiry(ctx, W, H);
          if (this.picker === 'open' || this.picker === 'folder') this.drawPicker(ctx, W, H);
          if (this.threadOpen) this.drawThread(ctx, W, H);
      }
    } else switch (this.liveTab) {
      case 'search':
        if (this.mode === 'results') this.drawResults(ctx, W, H);
        else this.drawSearch(ctx, W);
        break;
      case 'chat': this.drawChat(ctx, W, H); break;
      case 'record': this.drawRecord(ctx, W, H); break;
      case 'care': this.drawCare(ctx, W, H); break;
      case 'extra': this.drawExtra(ctx, W, H); break;
      case 'photos': this.drawPhotos(ctx, W, H); break;
    }
    if (this.defaultsOpen) this.drawDefaults(ctx, W, H);
    // ⚑ S281 / S293 — the glow logic (src/witness/pathGlow.ts): the warm ring on the one press the story is waiting for
    //   (`pathIds`), the pale line on the game's bookmark. A choice of two is never ringed; Junie's sheet never is.
    if (!this.startMap.active) {
      const path = this.pathIds();
      for (const h of this.hits) {
        const k = path.has(h.id) ? 'path' : h.id === 'bm-floppy' ? 'may' : null;
        if (k) drawGlow(ctx, h, k, CHROME.accent, WEB.faint);
      }
    }
    // ⚑ S229 / W1-A6 — the welcome-back card, over the page's bare lower half (never over the completions or the tabs)
    if (this.startPanel.open && this.startCalm()) {
      for (const b of this.startPanel.draw(ctx, 24, 176, 300)) this.publish({ ...b, id: 'startpanel-close' });
    }
  }

  /**
   * ⚑ S293 / V0 — THE DEFAULTS. A settings sheet, the kind an update leaves on the first screen: three rows the
   * update chose, the assistant marked "recommended for you", and one Continue. While it is up it is the only
   * control on the page (Start still works).
   */
  private drawDefaults(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.hits = this.hits.filter((h) => h.id === 'start-menu' || h.id.startsWith('lg-') || h.id.startsWith('sm-'));
    const top = ADDR.y + ADDR.h + 8;
    ctx.save(); ctx.globalAlpha = 0.75; px(ctx, 0, top, W, H - top, WEB.bg); ctx.restore();
    const w = 380, x = Math.round((W - w) / 2), y = top + 26, h = 226;
    webCard(ctx, x, y, w, h);
    setFont(ctx, 13); ctx.fillStyle = WEB.ink;
    ctx.fillText(DEFAULTS.title, x + 20, y + 16);
    setFont(ctx, 9); ctx.fillStyle = WEB.muted;
    ctx.fillText(DEFAULTS.sub, x + 20, y + 34);
    let ry = y + 56;
    for (const r of DEFAULTS.rows) {
      px(ctx, x + 20, ry - 6, w - 40, 1, WEB.cardEdge);
      if (r.icon === 'profile') profileGlyph(ctx, x + 20, ry, 18, 'default');
      else if (r.icon === 'search') { roundRect(ctx, x + 20, ry, 18, 18, 9, WEB.chip); setFont(ctx, 10); ctx.fillStyle = WEB.muted; ctx.fillText('⌕', x + 25, ry + 3); }
      else avatar(ctx, x + 20, ry, 18, WEB.primary, 'S');
      setFont(ctx, 9); ctx.fillStyle = WEB.muted;
      ctx.fillText(r.k, x + 48, ry + 4);
      setFont(ctx, 11); ctx.fillStyle = WEB.ink;
      ctx.fillText(r.v, x + 130, ry + 3);
      if (r.tag) {
        setFont(ctx, 8);
        const tw = Math.ceil(ctx.measureText(r.tag).width) + 12;
        pill(ctx, x + w - 20 - tw, ry + 2, tw, 14, WEB.accentSoft);
        ctx.fillStyle = WEB.accentInk; ctx.fillText(r.tag, x + w - 20 - tw + 6, ry + 5);
      }
      ry += 34;
    }
    setFont(ctx, 8); ctx.fillStyle = WEB.muted;
    ctx.fillText(DEFAULTS.fine, x + 20, ry + 2);
    const b = webButton(ctx, x + w - 20 - 96, y + h - 34, DEFAULTS.continue, 'primary', 96);
    this.publish({ ...b, id: 'def-continue' });
  }

  /**
   * ⚑ THE SEARCH, AND IT IS THE ERA'S EDUCATION IN FOUR LINES.
   *
   * She typed six words and stopped. The engine finished the sentence four ways
   * before she could, and three of the four assume she wants out; the fourth —
   * the one she probably meant — is last. **Nothing here is pressable.** It is
   * the one surface in the era that is purely evidence, and making it clickable
   * would turn a depiction of steering into a menu of it.
   *
   * ⚑ No character remarks on this, the record does not file it, and there is
   * no highlight, arrow or colour on the fourth line. If a reader does not see
   * it, they do not see it — that is the cost of showing rather than saying,
   * and this project has ruled repeatedly in favour of paying it.
   */
  private drawSearch(ctx: CanvasRenderingContext2D, W: number): void {
    const rows = script.search.completions as string[];
    const top = ADDR.y + ADDR.h + 11;
    // ⚑ the panel hugs the completions instead of filling the lid. A dropdown
    //   is the size of what is in it; a full-height box with four lines at the
    //   top of it is a page, and this is not a page — it is the thing that
    //   appeared under the address bar while she was still typing.
    const h = 22 + rows.length * 16 + 8;
    px(ctx, ADDR.x, top, W - ADDR.x * 2, h, CHROME.field);
    px(ctx, ADDR.x, top + h - 1, W - ADDR.x * 2, 1, CHROME.fieldEdge);
    setFont(ctx, 8);
    ctx.fillStyle = CHROME.hint;
    ctx.fillText(script.tabs[0].mark, ADDR.x + 14, top + 6);
    setFont(ctx, 11);
    for (let i = 0; i < rows.length; i++) {
      // ⚑ a magnifier dot per row, the way a suggestion list carries one. No
      //   highlight on the fourth: the one she probably meant is last and
      //   nothing points at it.
      px(ctx, ADDR.x + 14, top + 18 + i * 16, 4, 4, CHROME.hint);
      ctx.fillStyle = CHROME.ink;
      ctx.fillText(rows[i], ADDR.x + 24, top + 15 + i * 16);
    }
    /**
     * ⚑ 2026-09-12 — AND IT IS PRESSABLE NOW, AS ONE THING. The note above said
     * "nothing here is pressable… making it clickable would turn a depiction of
     * steering into a menu of it." Sérgio's review overruled the outcome and
     * kept the principle: "when I press the almost-written search, nothing
     * happens. Why? It should automatically happen." So the whole list is ONE
     * control, not four: pressing it does not let her choose a completion — the
     * engine chooses, and finishes the sentence for her. Steering, depicted, and
     * then done to her.
     */
    if (this.mode === 'free') this.publish({ x: ADDR.x, y: top, w: W - ADDR.x * 2, h, id: 'search-open' });
  }

  /**
   * ⚑ S160 / R3-89 — THE RESULTS PAGE. "A fake Google with the results of the search she
   * already did; recent queries." Her recent searches, ordinary; the query the engine
   * finished for her; four results, of which the first is the agent's own site and the only
   * press. Nothing here is true about anyone real; the marks are invented.
   */
  private drawResults(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const R = PROGRAM.results;
    const top = ADDR.y + ADDR.h + 10;
    px(ctx, 0, top - 10, W, H - top + 10, WEB.bg);
    const x = ADDR.x + 8;
    setFont(ctx, 8); ctx.fillStyle = WEB.muted;
    ctx.fillText(R.historyLabel, x, top);
    setFont(ctx, 9); ctx.fillStyle = WEB.muted;
    R.history.forEach((h, i) => { px(ctx, x, top + 14 + i * 12 + 3, 4, 4, WEB.faint); ctx.fillText(h, x + 10, top + 12 + i * 12); });
    let y = top + 14 + R.history.length * 12 + 8;
    setFont(ctx, 8); ctx.fillStyle = WEB.muted;
    ctx.fillText(R.queryLabel, x, y);
    setFont(ctx, 11); ctx.fillStyle = WEB.ink;
    ctx.fillText(PROGRAM.chosen, x, y + 11);
    y += 30;
    // ⚑ S193 — the related searches: her question, walked into the apparatus's vocabulary
    if (R.related?.length) {
      setFont(ctx, 8); ctx.fillStyle = WEB.muted;
      ctx.fillText(R.relatedLabel ?? '', x, y - 6);
      setFont(ctx, 9); ctx.fillStyle = WEB.accent;
      let rx = x + ctx.measureText((R.relatedLabel ?? '') + '  ').width;
      for (const t of R.related) { ctx.fillText(t, rx, y - 6); rx += ctx.measureText(t + '   ').width; }
      y += 10;
    }
    // ⚑ S209h / ERA26-16 — "People also ask": the platform's voice, sure of itself, in the right-hand column
    //   where answer panels sit. It opens the question that serves its partner and leaves the neutral ones
    //   folded; it says "multiple sources" and names three that are one network's — all in the results
    //   beside it. The critique is readable, never said.
    const P = (R as { paa?: { label: string; open: string; answer: string; closed: string[]; note: string; sourcesLabel: string; sources: string[] } }).paa;
    const fullW = W - ADDR.x * 2 - 8;
    const colW = P ? Math.min(fullW, 410) : fullW;
    if (P) {
      const px0 = x - 4 + colW + 12, bw = W - ADDR.x - px0, inner = bw - 16;
      setFont(ctx, 9);
      const ans = wrapText(ctx, P.answer, inner - 12);
      const srcs: string[] = [];
      for (const src of P.sources) srcs.push(src);
      const bh = 30 + ans.length * 12 + P.closed.length * 12 + 18 + 12 + srcs.length * 11 + 8;
      roundEdge(ctx, px0, y - 4, bw, bh, 5, WEB.cardEdge, WEB.card);
      const lx = px0 + 8;
      setFont(ctx, 8); ctx.fillStyle = WEB.muted; ctx.fillText(P.label, lx, y + 2);
      setFont(ctx, 10); ctx.fillStyle = WEB.ink; ctx.fillText('▾ ' + P.open, lx, y + 15);
      let py = y + 30;
      setFont(ctx, 9); ctx.fillStyle = WEB.ink;
      for (const ln of ans) { ctx.fillText(ln, lx + 10, py); py += 12; }
      py += 4;
      ctx.fillStyle = WEB.muted;
      for (const q of P.closed) { ctx.fillText('▸ ' + q, lx, py); py += 12; }
      py += 6;
      setFont(ctx, 8); ctx.fillStyle = WEB.muted; ctx.fillText(P.note, lx, py); py += 12;
      ctx.fillStyle = WEB.faint; ctx.fillText(P.sourcesLabel, lx, py); py += 11;
      ctx.fillStyle = WEB.accent;
      for (const src of srcs) { ctx.fillText(src, lx + 6, py); py += 11; }
    }
    for (const r of R.results) {
      const rh = r.why ? 54 : 42;
      if (y + rh > H - 14) break;
      if (r.press) { roundEdge(ctx, x - 4, y - 4, colW, rh + 2, 5, WEB.cardEdge, WEB.card); }
      // ⚑ S197 — a removed result: the platform's own generic notice, greyed, nothing to press
      if ((r as { removed?: boolean }).removed) {
        setFont(ctx, 8); ctx.fillStyle = WEB.faint; ctx.fillText(r.url, x, y);
        setFont(ctx, 11); ctx.fillStyle = WEB.muted; ctx.fillText(`⊘ ${r.title}`, x, y + 11);
        setFont(ctx, 9); ctx.fillStyle = WEB.muted; ctx.fillText(r.snippet, x, y + 25);
        y += rh + 6;
        continue;
      }
      setFont(ctx, 8);
      // ⚑ S293 / V1 — the ad says it is an ad, in the platform's own small bold type, and under it why she sees it
      let ux = x;
      if (r.sponsored) { ctx.fillStyle = WEB.ink; ctx.fillText(r.sponsored, x, y); ux += Math.ceil(ctx.measureText(r.sponsored + '  ·  ').width); ctx.fillStyle = WEB.muted; ctx.fillText('·', ux - 12, y); }
      ctx.fillStyle = WEB.accent;
      ctx.fillText(r.url, ux, y);
      if (r.why) { setFont(ctx, 8); ctx.fillStyle = WEB.muted; ctx.fillText(r.why, x, y + 38); }
      setFont(ctx, 11); ctx.fillStyle = r.press ? WEB.primary : WEB.ink;
      ctx.fillText(r.title.length > 58 ? r.title.slice(0, 57) + '…' : r.title, x, y + 11);
      setFont(ctx, 9); ctx.fillStyle = WEB.muted;
      wrapText(ctx, r.snippet, colW - 16).slice(0, 1).forEach((ln) => ctx.fillText(ln, x, y + 25));
      if (r.press) this.publish({ x: x - 4, y: y - 4, w: colW, h: rh + 2, id: `result-${r.id}` });
      // ⚑ S193 — the moderation paradox: the platform's own note, and the recommendation right under it
      const rr = r as { match?: string };
      let extra = 0;
      if (rr.match) { setFont(ctx, 9); ctx.fillStyle = WEB.match; ctx.fillText(rr.match, x, y + 38); extra += 13; }
      y += rh + 6 + extra;
    }
  }

  /**
   * ⚑ S293 — THE AGENT'S PAGE (V2–V9). The documented 2026 form (his visual archive; detrans.ai's live page, Dossier
   * e4_offers#3): a header with the mark and a live dot, the warning that conversations are public, the chat on the
   * left, and on the right the panel where the agent puts what it is showing her. The message bar at the foot is a
   * picture of one and says so: nothing is ever typed here. The chat keeps what was said, oldest scrolling off the
   * top, and under each of her answers what it filed — in its own flat voice, at the same weight as everything else.
   */
  private drawAgent(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const top = ADDR.y + ADDR.h + 8;
    px(ctx, 0, top - 8, W, H - top + 8, WEB.bg);
    const cx = ADDR.x + 8, cw = W - ADDR.x * 2 - 16, ch = H - top - 10;
    webCard(ctx, cx, top, cw, ch);
    // the header: avatar, the mark, a live dot, the heading — and the privacy line, which the ad contradicted
    avatar(ctx, cx + 12, top + 9, 22, WEB.primary, 'S');
    setFont(ctx, 11); ctx.fillStyle = WEB.ink;
    ctx.fillText(AGENT.mark, cx + 42, top + 9);
    setFont(ctx, 8); ctx.fillStyle = WEB.muted;
    px(ctx, cx + 42, top + 24, 5, 5, WEB.accent);
    ctx.fillText('online  ·  ' + AGENT.heading, cx + 50, top + 22);
    setFont(ctx, 8);
    const pw = Math.ceil(ctx.measureText('ⓘ ' + AGENT.privacy).width) + 16;
    roundRect(ctx, cx + cw - 12 - pw, top + 12, pw, 16, 5, WEB.accentSoft);
    ctx.fillStyle = WEB.ink; ctx.fillText('ⓘ ' + AGENT.privacy, cx + cw - 12 - pw + 8, top + 16);
    px(ctx, cx + 1, top + 38, cw - 2, 1, WEB.cardEdge);
    // the two columns: the chat, and the agent's panel
    const chatX = cx + 12, chatW = 316, panelX = chatX + chatW + 14, panelW = cx + cw - 12 - panelX;
    const bodyTop = top + 46, bar = top + ch - 30;
    px(ctx, panelX - 8, bodyTop - 2, 1, bar - bodyTop - 4, WEB.cardEdge);
    messageBar(ctx, chatX, bar, chatW, AGENT.composer);
    this.drawConversation(ctx, chatX, bodyTop, chatW, bar - 8);
    this.drawPanel(ctx, panelX, bodyTop, panelW, top + ch - 8);
  }

  /** the chat column: what has been said (oldest scrolling off the top), the live beat's lines, and its way on */
  private drawConversation(ctx: CanvasRenderingContext2D, x: number, top: number, w: number, bottom: number): void {
    const b = this.cur;
    type Row = { kind: 'agent' | 'her' | 'filed' | 'dots'; text: string };
    const rows: Row[] = this.said.map((s) => ({ kind: s.who, text: s.text }));
    if (b && !this.stepDone.has(b.id)) {
      for (let k = 0; k < this.linesShown; k++) rows.push({ kind: 'agent', text: b.lines[k] });
      if (this.linesShown < b.lines.length) rows.push({ kind: 'dots', text: '' });
    }
    // the way on, at the foot of the column: two chips, or one button
    let footH = 0;
    const ready = !!b && this.beatReady && !this.stepDone.has(b.id) && this.picker !== 'open' && this.picker !== 'folder' && this.picker !== 'restoring' && this.enquiry !== 'draft' && this.enquiry !== 'sending' && this.enquiry !== 'replied';
    if (ready && (b!.chips || b!.button)) footH = 30;
    // lay out from the bottom up
    setFont(ctx, 10);
    const maxW = w - 70;
    const sized = rows.map((r) => {
      if (r.kind === 'filed') return { r, lines: [r.text], h: 13 };
      if (r.kind === 'dots') return { r, lines: [], h: 22 };
      setFont(ctx, 10);
      const lines = wrapText(ctx, r.text, maxW).slice(0, 4);
      return { r, lines, h: lines.length * 13 + 12 + 5 };
    });
    let y = bottom - footH;
    const placed: { s: typeof sized[number]; y: number }[] = [];
    for (let i = sized.length - 1; i >= 0; i--) {
      if (y - sized[i].h < top) break;
      y -= sized[i].h;
      placed.unshift({ s: sized[i], y });
    }
    for (const { s, y: ry } of placed) {
      if (s.r.kind === 'filed') {
        setFont(ctx, 8); ctx.fillStyle = WEB.muted;
        const t = '↳ filed: ' + s.r.text;
        ctx.fillText(t, x + w - 4 - Math.min(w - 10, Math.ceil(ctx.measureText(t).width)), ry);
        continue;
      }
      if (s.r.kind === 'dots') {
        roundRect(ctx, x + 26, ry, 34, 16, 8, WEB.chip);
        const d = Math.floor(this.beatT / 0.3) % 3;
        for (let k = 0; k < 3; k++) px(ctx, x + 34 + k * 8, ry + 6, 4, 4, k === d ? WEB.ink : WEB.faint);
        continue;
      }
      setFont(ctx, 10);
      const mine = s.r.kind === 'her';
      const bw = Math.max(...s.lines.map((l) => Math.ceil(ctx.measureText(l).width))) + 22;
      const bh = s.h - 5;
      const bx = mine ? x + w - 4 - bw : x + 26;
      if (!mine) avatar(ctx, x, ry, 18, WEB.primary, 'S');
      roundRect(ctx, bx, ry, bw, bh, 8, mine ? WEB.accentSoft : WEB.chip);
      ctx.fillStyle = WEB.ink;
      s.lines.forEach((l, k) => ctx.fillText(l, bx + 11, ry + 6 + k * 13));
    }
    if (!ready || !b) return;
    const fy = bottom - 24;
    if (b.chips) {
      let bx = x + 26;
      b.chips.forEach((c, k) => {
        const r = webButton(ctx, bx, fy, c.label, k === 0 ? 'primary' : 'quiet');
        this.publish({ ...r, id: `conv-chip-${k}` });
        bx += r.w + 8;
      });
    } else if (b.button) {
      const r = webButton(ctx, x + 26, fy, b.button, 'primary');
      this.publish({ ...r, id: 'conv-act' });
    }
  }

  /** the agent's panel: what it is showing her for this beat */
  private drawPanel(ctx: CanvasRenderingContext2D, x: number, top: number, w: number, _bottom: number): void {
    const b = this.cur;
    const title = (t: string): number => { setFont(ctx, 8); ctx.fillStyle = WEB.muted; ctx.fillText(t.toUpperCase(), x, top); return top + 16; };
    if (!b) return;
    if (this.picker === 'restoring') { this.drawMaking(ctx, x, title(AGENT.photo.title), w); return; }
    const card = b.id === 'messages' ? (this.threadsUp ? 'threads' : null) : b.id === 'see' ? null : b.card ?? null;
    // the card arrives with the beat's last line, not before it
    const show = card && (this.stepDone.has(b.id) || this.linesShown >= b.lines.length);
    if (!card || !show) {
      // nothing to show: the page's own furniture — other people's questions, public (the documented form)
      const y0 = title('Recent conversations');
      const recent = ['can it be undone?', 'is it normal to feel this after a year', 'how do i tell my parents i want to stop'];
      setFont(ctx, 9);
      recent.forEach((q, i) => { ctx.fillStyle = WEB.accent; ctx.fillText(q, x + 4, y0 + i * 15); });
      setFont(ctx, 8); ctx.fillStyle = WEB.faint;
      ctx.fillText('public  ·  anonymous', x + 4, y0 + recent.length * 15 + 4);
      return;
    }
    if (card === 'resources') {
      let y = title(AGENT.resources.title);
      for (const it of AGENT.resources.items) {
        const h = 40;
        if (it.open) roundEdge(ctx, x, y, w, h, 6, WEB.cardEdge, WEB.card);
        else roundRect(ctx, x, y, w, h, 6, WEB.chip);
        setFont(ctx, 10); ctx.fillStyle = it.open ? WEB.primary : WEB.muted;
        ctx.fillText(it.name, x + 10, y + 8);
        setFont(ctx, 8); ctx.fillStyle = WEB.muted;
        ctx.fillText(it.meta, x + 10, y + 23);
        if (it.open && this.enquiry === 'none' && this.beatReady) this.publish({ x, y, w, h, id: `res-${it.id}` });
        if (it.open && this.enquiry !== 'none') { setFont(ctx, 8); ctx.fillStyle = WEB.ink; ctx.fillText(this.enquiry === 'closed' ? 'declined' : 'sent', x + w - 48, y + 8); }
        y += h + 6;
      }
      return;
    }
    if (card === 'record') {
      let y = title('Your information');
      roundEdge(ctx, x, y, w, AGENT.record.rows.length * 24 + 12, 6, WEB.cardEdge, WEB.card);
      y += 8;
      for (const r of AGENT.record.rows) {
        setFont(ctx, 8); ctx.fillStyle = WEB.muted; ctx.fillText(r.k, x + 10, y + 2);
        setFont(ctx, 10); ctx.fillStyle = r.locked ? WEB.muted : WEB.ink; ctx.fillText(r.v, x + 80, y);
        if (r.note) { setFont(ctx, 8); ctx.fillStyle = WEB.muted; ctx.fillText('🔒 ' + r.note, x + 80, y + 11); }
        y += 24;
      }
      return;
    }
    if (card === 'composite') {
      // ⚑ two pictures, side by side, the way such a tool shows its output: hers, and the one it made — whole, not split
      const F = AGENT.photo;
      let y = title(F.strip);
      const sz = Math.min(140, Math.floor((w - 16) / 2));
      thumb(ctx, x, y, sz, sz, 3, false, 6);
      composite(ctx, x + sz + 16, y, sz, sz);
      setFont(ctx, 8);
      const tag = (t: string, tx: number, ink: string, ground: string): void => {
        const tw = Math.ceil(ctx.measureText(t).width) + 12;
        pill(ctx, tx + 4, y + 4, tw, 14, ground); ctx.fillStyle = ink; ctx.fillText(t, tx + 10, y + 7);
      };
      tag(F.before, x, WEB.card, WEB.ink);
      tag(F.after, x + sz + 16, WEB.card, WEB.ink);
      // the strip every such tool now carries under its output
      const sw = Math.ceil(ctx.measureText(F.strip).width) + 12;
      pill(ctx, x + sz + 16 + sz - sw - 4, y + sz - 18, sw, 14, WEB.ink);
      ctx.fillStyle = WEB.card; ctx.fillText(F.strip, x + sz + 16 + sz - sw + 2, y + sz - 15);
      y += sz + 8;
      setFont(ctx, 8); ctx.fillStyle = WEB.muted; ctx.fillText('Adjusted', x, y + 4);
      chipRow(ctx, x + 50, y, F.adjusted, F.adjusted.map(() => true));
      y += 24;
      setFont(ctx, 8); ctx.fillStyle = WEB.muted;
      for (const row of wrapText(ctx, F.saved.replace('{name}', this.chosenFile || 'me, after'), w)) { ctx.fillText(row, x, y); y += 11; }
      return;
    }
    if (card === 'care') {
      let y = title(body.care.title);
      setFont(ctx, 9);
      for (const it of body.care.items as Array<{ what: string; when: string; why: string }>) {
        roundRect(ctx, x, y + 3, 6, 6, 3, WEB.accent);
        ctx.fillStyle = WEB.ink; ctx.fillText(it.what, x + 12, y);
        setFont(ctx, 8); ctx.fillStyle = WEB.muted; ctx.fillText(`${it.when}  ·  ${it.why}`, x + 150, y + 1);
        setFont(ctx, 9);
        y += 14;
      }
      ctx.fillStyle = WEB.muted; ctx.fillText(`${body.care.invite.from} — “${body.care.invite.text}”  ·  ${body.care.invite.when}`, x + 12, y); y += 18;
      // her story, beside the one the session will play her
      setFont(ctx, 8); ctx.fillStyle = WEB.muted; ctx.fillText(AGENT.care.storiesTitle.toUpperCase(), x, y); y += 13;
      const C = AGENT.care;
      roundRect(ctx, x, y, w, 30, 6, WEB.chip);
      setFont(ctx, 9); ctx.fillStyle = WEB.ink; ctx.fillText(`“${C.other.quote}”`, x + 10, y + 5);
      setFont(ctx, 8); ctx.fillStyle = WEB.muted; ctx.fillText(C.other.who + '  ·  verified', x + 10, y + 17);
      y += 36;
      roundEdge(ctx, x, y, w, 46, 6, WEB.accent, WEB.card);
      composite(ctx, x + 6, y + 6, 34, 34);
      setFont(ctx, 10); ctx.fillStyle = WEB.ink;
      ctx.fillText(this.storyQuotes().join('  '), x + 48, y + 8);
      setFont(ctx, 8); ctx.fillStyle = WEB.muted;
      ctx.fillText(`${C.hers.who}  ·  verified  ·  ${C.hers.shared}`, x + 48, y + 26);
      return;
    }
    if (card === 'threads') {
      const T = AGENT.threads;
      let y = title(T.title);
      setFont(ctx, 8); ctx.fillStyle = WEB.muted; ctx.fillText(T.sub, x, y); y += 16;
      for (const th of T.items) {
        const live = th.id === 'junie';
        roundEdge(ctx, x, y, w, 34, 6, live ? WEB.cardEdge : WEB.bg, live ? WEB.card : WEB.bg);
        avatar(ctx, x + 8, y + 7, 20, live ? PLACE.textileHi : WEB.faint, th.name[0]);
        setFont(ctx, 10); ctx.fillStyle = live ? WEB.ink : WEB.muted; ctx.fillText(th.name, x + 36, y + 6);
        setFont(ctx, 8); ctx.fillStyle = WEB.muted;
        ctx.save(); ctx.beginPath(); ctx.rect(x + 36, y + 18, w - 80, 12); ctx.clip(); ctx.fillText(th.preview, x + 36, y + 19); ctx.restore();
        ctx.fillText(th.time, x + w - 8 - Math.ceil(ctx.measureText(th.time).width), y + 6);
        if (th.badge && !this.threadOpen) { roundRect(ctx, x + w - 22, y + 18, 14, 12, 6, PLACE.textileHi); ctx.fillStyle = WEB.card; ctx.fillText(th.badge, x + w - 18, y + 20); }
        // only Junie's opens — the others are pictures of threads
        if (live && !this.threadOpen) this.publish({ x, y, w, h: 34, id: 'thread-junie' });
        y += 40;
      }
    }
  }

  /** V7 — the making: the photograph she chose, and the stages the tool claims (no "finding the face": it never draws one) */
  private drawMaking(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
    const F = AGENT.photo;
    const k = Math.min(1, this.pickerT / F.restoringSeconds);
    thumb(ctx, x, y, 96, 76, 3, false, 6);
    setFont(ctx, 10); ctx.fillStyle = WEB.ink;
    for (const [i, row] of wrapText(ctx, F.restoring, w - 110).entries()) ctx.fillText(row, x + 108, y + i * 13);
    progressBar(ctx, x + 108, y + 32, w - 116, k, this.pickerT);
    F.stages.forEach((st, n) => {
      const on = k >= (n + 0.5) / F.stages.length, cur = !on && k >= n / F.stages.length;
      roundRect(ctx, x + 108, y + 46 + n * 14, 8, 8, 4, on ? WEB.accent : cur ? WEB.primary : WEB.chip);
      setFont(ctx, 9); ctx.fillStyle = on ? WEB.muted : cur ? WEB.ink : WEB.faint;
      ctx.fillText(st, x + 122, y + 44 + n * 14);
    });
  }

  /**
   * V6 — THE FILE WINDOW IS A PICTURE OF ONE (CLAUDE.md: the filter never takes file input, never asks a permission).
   * Her folders, pre-authored; the folder opens; any photograph is the press; nothing is read or uploaded.
   */
  private drawPicker(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.hits = this.hits.filter((h) => h.id === 'start-menu' || h.id.startsWith('lg-') || h.id.startsWith('sm-') || h.id.startsWith('tab'));
    const F = AGENT.photo;
    const top = ADDR.y + ADDR.h + 8;
    ctx.save(); ctx.globalAlpha = 0.45; px(ctx, 0, top, W, H - top, WEB.ink); ctx.restore();
    const w = 440, h = 250, x = Math.round((W - w) / 2), y = top + 30;
    roundRect(ctx, x, y + 2, w, h, 8, WEB.faint);
    roundEdge(ctx, x, y, w, h, 8, WEB.cardEdge, WEB.card);
    setFont(ctx, 10); ctx.fillStyle = WEB.ink; ctx.fillText(F.title, x + 14, y + 8);
    const sbw = 96;
    px(ctx, x + sbw, y + 24, 1, h - 56, WEB.cardEdge);
    setFont(ctx, 8);
    ['Recents', 'Photos', 'Favourites', 'Shared'].forEach((n, k) => {
      const on = k === 1;
      if (on) roundRect(ctx, x + 8, y + 26 + k * 16, sbw - 16, 14, 4, WEB.accentSoft);
      ctx.fillStyle = on ? WEB.accentInk : WEB.muted;
      ctx.fillText(n, x + 16, y + 29 + k * 16);
    });
    pill(ctx, x + sbw + 12, y + 24, w - sbw - 24, 14, WEB.chip);
    ctx.fillStyle = WEB.faint; ctx.fillText('Search', x + sbw + 24, y + 27);
    const inFolder = this.picker === 'folder';
    const folder = F.items.find((i) => i.kind === 'folder');
    if (inFolder) {
      ctx.fillStyle = WEB.accentInk; ctx.fillText(F.back, x + sbw + 12, y + 44);
      this.publish({ x: x + sbw + 8, y: y + 40, w: 60, h: 14, id: 'file-back' });
      ctx.fillStyle = WEB.muted; ctx.fillText(`${F.path}  ›  ${folder?.name ?? ''}`, x + sbw + 64, y + 44);
    } else { ctx.fillStyle = WEB.muted; ctx.fillText(F.path, x + sbw + 12, y + 44); }
    const list = inFolder ? F.folderItems : F.items;
    const tw = 70, th = 48, gx = x + sbw + 12, gy = y + 60;
    list.forEach((it, k) => {
      const tx = gx + (k % 4) * (tw + 8), ty = gy + Math.floor(k / 4) * (th + 30);
      if (it.kind === 'folder') {
        roundRect(ctx, tx, ty, tw, th, 5, WEB.chip);
        roundRect(ctx, tx + 20, ty + 14, 30, 22, 3, WEB.faint);
        px(ctx, tx + 20, ty + 11, 12, 4, WEB.faint);
      } else thumb(ctx, tx, ty, tw, th, inFolder ? (k === 0 ? 2 : 3) : (k === 3 ? 3 : 3), !inFolder && k === 3);
      setFont(ctx, 8); ctx.fillStyle = WEB.ink;
      ctx.save(); ctx.beginPath(); ctx.rect(tx, ty + th, tw, 12); ctx.clip(); ctx.fillText(it.name, tx, ty + th + 4); ctx.restore();
      ctx.fillStyle = WEB.muted; ctx.fillText(it.meta, tx, ty + th + 14);
      this.publish({ x: tx, y: ty, w: tw, h: th + 24, id: `file-${k}` });
    });
    px(ctx, x + 1, y + h - 32, w - 2, 1, WEB.cardEdge);
    webButton(ctx, x + w - 156, y + h - 27, F.cancel, 'disabled', 64);
    webButton(ctx, x + w - 84, y + h - 27, 'Open', 'disabled', 70);
  }

  /**
   * ⚑ S293 / V9 — JUNIE'S THREAD. FELT. A messaging app's sheet over the whole page: the agent's page is covered and
   * nothing of the agent, L or Lamby is on it (the console falls silent; the glow and the guide stand down). Her
   * messages, unhurried; Maya's one reply; Junie's x. Nothing here files. The only other press on the screen is the
   * Photos tab, where the original is kept.
   */
  private drawThread(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.hits = this.hits.filter((h) => h.id === 'start-menu' || h.id.startsWith('sm-') || h.id.startsWith('tab'));
    const top = ADDR.y + ADDR.h + 6;
    px(ctx, 0, top, W, H - top, PLACE.wallHi);
    const x = 120, w = W - 240;
    // the thread's own header, in the room's colour, not the agent's
    px(ctx, x, top, w, 40, PLACE.wall);
    avatar(ctx, x + 12, top + 9, 22, PLACE.textileHi, THREAD.name[0]);
    setFont(ctx, 11); ctx.fillStyle = PLACE.ink; ctx.fillText(THREAD.name, x + 42, top + 9);
    setFont(ctx, 8); ctx.fillStyle = PLACE.floorLo; ctx.fillText(THREAD.sub, x + 42, top + 23);
    let y = top + 50;
    setFont(ctx, 10);
    let lastDay = '';
    for (const m of THREAD.messages) {
      const day = m.when.split(' ')[0];
      if (day !== lastDay) { lastDay = day; setFont(ctx, 8); ctx.fillStyle = PLACE.floorLo; ctx.fillText(m.when, x + Math.round(w / 2) - 20, y); y += 13; }
      setFont(ctx, 10);
      const rows = wrapText(ctx, m.text, w - 120);
      const bw = Math.max(...rows.map((r) => Math.ceil(ctx.measureText(r).width))) + 20;
      roundRect(ctx, x + 12, y, bw, rows.length * 13 + 10, 9, PLACE.textile);
      ctx.fillStyle = PLACE.ink;
      rows.forEach((r, k) => ctx.fillText(r, x + 22, y + 5 + k * 13));
      y += rows.length * 13 + 15;
    }
    if (this.repliedT < 0) {
      // her reply: plain, one chip, in her own colour
      const r = webButton(ctx, x + w - 12 - 96, y + 4, THREAD.reply, 'quiet', 96);
      this.publish({ ...r, id: 'junie-reply' });
      return;
    }
    setFont(ctx, 10);
    const rw = Math.ceil(ctx.measureText(THREAD.reply).width) + 20;
    roundRect(ctx, x + w - 12 - rw, y, rw, 23, 9, PLACE.sky);
    ctx.fillStyle = PLACE.ink; ctx.fillText(THREAD.reply, x + w - 2 - rw, y + 6);
    y += 29;
    if (this.repliedT >= 2.2) {
      const xw = Math.ceil(ctx.measureText(THREAD.replied).width) + 20;
      roundRect(ctx, x + 12, y, xw, 23, 9, PLACE.textile);
      ctx.fillStyle = PLACE.ink; ctx.fillText(THREAD.replied, x + 22, y + 6);
    }
  }

  /**
   * ⚑ THE PAGE AFTER THE FAILURE (2026-09-13). The device has stopped; the
   * browser's step five was still asking her to put it on. Now the agent's
   * page cannot be reached: a browser's own error page in the kit's register,
   * the step marked failed, and the machine's flat sentence about who ended
   * what. Nothing is pressable — `handleClick` eats presses in this phase.
   */
  private drawFailed(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    if (this.streamOpen) { this.drawStreamLive(ctx, W, H); return; }
    const FD = PROGRAM.failed;
    if (this.failT >= FAIL.off) { px(ctx, 0, 0, W, H, ERA4.field); return; }   // off
    const top = ADDR.y + ADDR.h + 6;
    px(ctx, 0, top, W, H_PAGE, WEB.bg);
    // the error page
    const cx = ADDR.x + 8, cw = W - ADDR.x * 2 - 16, cy = top + 10;
    webCard(ctx, cx, cy, cw, H - cy - 14);
    avatar(ctx, cx + 12, cy + 10, 22, WEB.faint, 'S');
    setFont(ctx, 11);
    ctx.fillStyle = WEB.muted;
    ctx.fillText(PROGRAM.agentMark, cx + 42, cy + 11);
    setFont(ctx, 8);
    px(ctx, cx + 42, cy + 26, 5, 5, WEB.faint);
    ctx.fillText(FD.status, cx + 50, cy + 23);
    px(ctx, cx + 1, cy + 40, cw - 2, 1, WEB.cardEdge);
    roundEdge(ctx, cx + 44, cy + 62, 34, 26, 4, WEB.faint, WEB.bg);
    px(ctx, cx + 52, cy + 70, 18, 2, WEB.faint);
    px(ctx, cx + 52, cy + 76, 12, 2, WEB.faint);
    setFont(ctx, 16);
    ctx.fillStyle = WEB.ink;
    ctx.fillText(updates.close.restarting, cx + 44, cy + 98);
    setFont(ctx, 9);
    ctx.fillStyle = WEB.muted;
    ctx.fillText(FD.title + '  ·  ' + FD.line, cx + 44, cy + 124);
    setFont(ctx, 9);
    ctx.fillStyle = WEB.ink;
    let yy = cy + 144;
    for (const row of wrapText(ctx, FD.detail, cw - 88).slice(0, 3)) { ctx.fillText(row, cx + 44, yy); yy += 12; }
    webButton(ctx, cx + 44, yy + 8, 'Reload', 'disabled', 72);
    if (this.failT >= FAIL.bands) {
      const k = Math.min(1, (this.failT - FAIL.bands) / (FAIL.off - FAIL.bands));
      glitchBands(ctx, W, H, k);
      const was = ctx.globalAlpha;
      ctx.globalAlpha = k * k;
      px(ctx, 0, 0, W, H, ERA4.field);
      ctx.globalAlpha = was;
    }
  }

  /**
   * ⚑ S293 — THE STREAM KEEPS GOING UNDER THE FAILURE (ENDING_TRANSJESUS step 7). When the device stops, the link
   * she opened is still open on her monitor: transjesus.str, live, the count holding, the frame's four failures
   * still on its sidebar. The laptop beside it reports that the update failed; this screen does not fail. It is
   * video, so it repaints a few times a second while it is on (the monitor's texture uploads on its version only).
   */
  private drawStreamLive(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const top = ADDR.y + ADDR.h + 6;
    px(ctx, 0, top, W, H - top, ERA4.panel);
    const t = this.failT + 30;
    const sideW = 170, pw = W - sideW - 12, ph = H - top - 12;
    streamScene(ctx, 6, top + 6, pw, ph, t, streamShot(t), 0.4);
    // the title over the picture: LIVE, the mark, the count
    px(ctx, 6, top + 6, pw, 18, ERA4.panel);
    if (Math.floor(t * 1.5) % 2 === 0) px(ctx, 12, top + 12, 6, 6, WEB.danger);
    setFont(ctx, 9); ctx.fillStyle = ERA4.textHi; ctx.fillText(STREAM.live + '   ' + STREAM.mark, 22, top + 10);
    const n = STREAM.watching.replace('{n}', String(STREAM.count + 1));
    ctx.fillText(n, 6 + pw - 8 - Math.ceil(ctx.measureText(n).width), top + 10);
    // the sidebar: what the platform could not say about it
    const sx = W - sideW - 2;
    setFont(ctx, 8); ctx.fillStyle = ERA4.dim;
    ctx.fillText((ballScript.frame as unknown as { panel: string }).panel, sx, top + 10);
    FRAME_ROWS.forEach((r, i) => {
      const y = top + 28 + i * 26;
      setFont(ctx, 8); ctx.fillStyle = ERA4.dim; ctx.fillText(r.k, sx, y);
      setFont(ctx, 10); ctx.fillStyle = ERA4.textHi; ctx.fillText(r.v, sx, y + 10);
    });
  }

  /** ⚑ the transcript — fourteen months, read backwards. Her side of every
   *  exchange sits above the row it was chosen from, the unpicked options still
   *  greyed beside it. Nothing remarks on that. */
  private drawChat(ctx: CanvasRenderingContext2D, W: number, H: number, bodyTop?: number): void {
    const top = bodyTop ?? ADDR.y + ADDR.h + 12;
    px(ctx, 0, top - 12, W, H - top + 12, WEB.bg);
    webCard(ctx, ADDR.x + 8, top, W - ADDR.x * 2 - 16, H - top - 14);
    const es = body.chat.entries as Array<{
      when: string; who: string; text: string; chose?: number; offered?: string[];
      filed?: string; note?: string;
    }>;
    let y = top + 10;
    const maxY = H - 16;
    let lastWhen = '';
    for (const e of es) {
      if (y > maxY - 18) break;
      if (e.when !== lastWhen) {
        lastWhen = e.when;
        setFont(ctx, 8);
        ctx.fillStyle = CHROME.hint;
        ctx.fillText(e.when, ADDR.x + 12, y);
        y += 11;
      }
      const hers = e.who === 'her';
      setFont(ctx, 10);
      const rows: string[] = wrapText(ctx, e.text, W - ADDR.x * 2 - 60).slice(0, 3);
      const bw = Math.min(W - ADDR.x * 2 - 40,
        Math.max(...rows.map(r => Math.ceil(ctx.measureText(r).width))) + 16);
      const bx = hers ? W - ADDR.x - 12 - bw : ADDR.x + 12;
      const bh = rows.length * 13 + 8;
      px(ctx, bx, y, bw, bh, hers ? CHROME.bar : CHROME.tabLive);
      ctx.fillStyle = CHROME.ink;
      rows.forEach((r, i) => ctx.fillText(r, bx + 8, y + 4 + i * 13));
      y += bh + 3;
      // ⚑ the row she chose from, still under her message
      if (hers && e.offered) {
        /**
         * ⚑ THE ROW SHE CHOSE FROM — and it WRAPS rather than overflowing.
         * The first pass laid the options out right-to-left from her message
         * and simply stopped when it ran out of margin, so a long reply pushed
         * its own suggestion row off the left edge and drew nothing. That is
         * the beat's own evidence going missing: the whole point of this row is
         * that the apparatus wrote both halves, and a row that vanishes when
         * her message is long hides it exactly where it matters most.
         */
        setFont(ctx, 8);
        const right = W - ADDR.x - 12;
        const left = ADDR.x + 12;
        const chips = e.offered.map((t, i) => ({
          t, i, w: Math.ceil(ctx.measureText(t).width) + 10
        }));
        // lay out in reading order, wrapping to a second line when needed
        const lines: typeof chips[] = [[]];
        let used = 0;
        for (const c of chips) {
          if (used + c.w + 3 > right - left && lines[lines.length - 1].length > 0) {
            lines.push([]); used = 0;
          }
          lines[lines.length - 1].push(c);
          used += c.w + 3;
        }
        for (const line of lines) {
          const total = line.reduce((a, c) => a + c.w + 3, -3);
          let ox = right - total;              // still right-aligned, under hers
          for (const c of line) {
            const picked = c.i === e.chose;
            px(ctx, ox, y, c.w, 12, picked ? CHROME.tabLive : CHROME.bar);
            ctx.fillStyle = picked ? CHROME.ink : CHROME.hint;
            ctx.fillText(c.t, ox + 5, y + 2);
            ox += c.w + 3;
          }
          y += 15;
        }
      }
      // ⚑ and what it wrote down underneath, at the same weight as everything else
      if (e.filed) {
        setFont(ctx, 8);
        ctx.fillStyle = CHROME.hint;
        ctx.fillText(e.filed, ADDR.x + 12, y);
        y += 11;
      }
      if (e.note) {
        setFont(ctx, 8);
        ctx.fillStyle = CHROME.hint;
        ctx.fillText(e.note, ADDR.x + 12, y);
        y += 11;
      }
      y += 3;
    }
  }

  /** the record as an account page — a profile card, one field locked, and a
   *  button that works and changes nothing. */
  private drawRecord(ctx: CanvasRenderingContext2D, W: number, H: number, bodyTop?: number): void {
    const top = bodyTop ?? ADDR.y + ADDR.h + 8;
    px(ctx, 0, top - 8, W, H - top + 8, WEB.bg);
    const cx = ADDR.x + 8, cw = W - ADDR.x * 2 - 16;
    webCard(ctx, cx, top, cw, H - top - 14);
    avatar(ctx, cx + 14, top + 12, 30, WEB.chip, 'M');
    setFont(ctx, 12);
    ctx.fillStyle = WEB.ink;
    ctx.fillText(body.record.title, cx + 54, top + 12);
    setFont(ctx, 8);
    ctx.fillStyle = WEB.muted;
    ctx.fillText('GraceOS account  ·  managed by your provider', cx + 54, top + 27);
    px(ctx, cx + 1, top + 50, cw - 2, 1, WEB.cardEdge);
    const LG = body.record.legacy;
    if (this.legacyOpen) {
      // ⚑ S149 — HER FILE, as a page of its own inside the card: Maya's own
      //   events, newest first, as the 2026 product keeps them. S144 listed the
      //   thirty years here (Daniel's and Vera's entries under her name); that
      //   broke the ruling that Maya is not Daniel (OPEN_ITEMS R3-95). The
      //   thirty years are the Close's. One press back to the fields.
      const rows = entriesByEra().e4.slice().reverse();
      let ly = top + 62;
      setFont(ctx, 10); ctx.fillStyle = WEB.ink;
      ctx.fillText(LG.heading, cx + 16, ly);
      setFont(ctx, 8); ctx.fillStyle = WEB.muted;
      ctx.fillText(LG.sub.replace('{n}', String(rows.length)), cx + 16 + 130, ly + 2);
      ly += 16;
      px(ctx, cx + 16, ly, cw - 32, 1, WEB.cardEdge);
      ly += 8;
      const bottom = top + (H - top - 14) - 44;
      const fit = Math.max(0, Math.floor((bottom - ly) / 13));
      const shown = rows.slice(0, fit);
      setFont(ctx, 8);
      if (shown.length === 0) { ctx.fillStyle = WEB.muted; ctx.fillText(LG.empty, cx + 16, ly); }
      for (const e of shown) {
        ctx.fillStyle = WEB.muted;
        ctx.fillText((LG.eras as Record<string, string>)[e.era] ?? '', cx + 16, ly);
        ctx.fillStyle = e.flagged ? WEB.accentInk : WEB.ink;
        ctx.save(); ctx.beginPath(); ctx.rect(cx + 52, ly - 2, cw - 68, 13); ctx.clip();
        ctx.fillText(e.witness, cx + 52, ly);
        ctx.restore();
        ly += 13;
      }
      const lr = webButton(ctx, cx + 16, top + (H - top - 14) - 36, LG.close, 'quiet');
      this.publish({ ...lr, id: 'legacy-toggle' });
      return;
    }
    let y = top + 62;
    // ⚑ S293 / V10 — after the reversal the file row reads current: the verifier believed what she confirmed last
    const recRows = (body.record.rows as Array<{ k: string; v: string; note: string; locked?: boolean }>).map((r) =>
      r.k === 'Your file' && this.reversal === 'matched' ? { ...r, v: CURRENT_AFTER.v, note: CURRENT_AFTER.note } : r);
    for (const r of recRows) {
      setFont(ctx, 9);
      ctx.fillStyle = WEB.muted;
      ctx.fillText(r.k, cx + 16, y + 1);
      setFont(ctx, 10);
      ctx.fillStyle = r.locked ? WEB.muted : WEB.ink;
      ctx.fillText(r.v, cx + 130, y);
      if (r.locked) {
        // the lock, and the reason, as a chip — the sentence doing the work
        setFont(ctx, 8);
        const t = '🔒 ' + r.note;
        const tw = Math.ceil(ctx.measureText(t).width) + 14;
        pill(ctx, cx + cw - 16 - tw, y - 2, tw, 15, WEB.chip);
        ctx.fillStyle = WEB.muted;
        ctx.fillText(t, cx + cw - 16 - tw + 7, y + 1);
      } else if (r.note) {
        setFont(ctx, 8);
        ctx.fillStyle = WEB.muted;
        ctx.fillText(r.note, cx + 300, y + 1);
      }
      px(ctx, cx + 16, y + 15, cw - 32, 1, WEB.cardEdge);
      y += 22;
    }
    y += 4;
    const label = this.requested ? body.record.acted : body.record.action;
    const r = webButton(ctx, cx + 16, y, label, this.requested ? 'disabled' : 'quiet');
    if (!this.requested && this.mode !== 'agent') this.publish({ ...r, id: 'record-request' });
    setFont(ctx, 8);
    ctx.fillStyle = WEB.muted;
    ctx.fillText(body.record.priorRequest, cx + 16, y + 28);
    // ⚑ S144 — THE LEGACY FILE: a press beside the request; the thirty years open in place
    const lr = webButton(ctx, cx + 16 + r.w + 10, y, LG.open, 'quiet');
    this.publish({ ...lr, id: 'legacy-toggle' });
  }
  private legacyOpen = false;
  private lampStep = 0;

  /** four things already done for her, each defensible, each with a working
   *  undo — a timeline, the way a care log shows itself — and one muted
   *  contact that is the way into the Commons. */
  private drawCare(ctx: CanvasRenderingContext2D, W: number, H: number, bodyTop?: number): void {
    const top = bodyTop ?? ADDR.y + ADDR.h + 8;
    px(ctx, 0, top - 8, W, H - top + 8, WEB.bg);
    const cx = ADDR.x + 8, cw = W - ADDR.x * 2 - 16;
    webCard(ctx, cx, top, cw, H - top - 14);
    setFont(ctx, 12);
    ctx.fillStyle = WEB.ink;
    ctx.fillText(body.care.title, cx + 16, top + 12);
    setFont(ctx, 8);
    ctx.fillStyle = WEB.muted;
    ctx.fillText(body.care.intro, cx + 16, top + 27);
    let y = top + 48;
    const items = body.care.items as Array<{ what: string; when: string; why: string; undo: string }>;
    const lx = cx + 24;
    px(ctx, lx + 3, y, 1, items.length * 34 + 20, WEB.cardEdge);   // the timeline's spine
    items.forEach((it, i) => {
      const done = this.undone.has(i);
      roundRect(ctx, lx, y + 2, 7, 7, 3, done ? WEB.faint : WEB.accent);
      setFont(ctx, 10);
      ctx.fillStyle = done ? WEB.muted : WEB.ink;
      ctx.fillText(it.what, lx + 18, y);
      setFont(ctx, 8);
      ctx.fillStyle = WEB.muted;
      ctx.fillText(`${it.when}  ·  ${it.why}`, lx + 18, y + 13);
      if (!done && this.mode !== 'agent') {
        const r = webButton(ctx, cx + cw - 16 - 70, y - 4, it.undo, 'quiet', 70);
        this.publish({ ...r, id: `care${i}` });
      }
      y += 34;
    });
    // the invitation, in the muted list where it has been for six weeks
    roundRect(ctx, lx, y + 2, 7, 7, 3, WEB.faint);
    setFont(ctx, 10);
    ctx.fillStyle = WEB.ink;
    ctx.fillText(`${body.care.invite.from} — "${body.care.invite.text}"`, lx + 18, y);
    setFont(ctx, 8);
    ctx.fillStyle = WEB.muted;
    ctx.fillText(this.undone.has(4) ? fixes.unmuted : body.care.invite.when, lx + 18, y + 13);
    if (!this.undone.has(4) && this.mode !== 'agent') {
      const r = webButton(ctx, cx + cw - 86, y - 4, fixes.unmute, 'quiet', 70); this.publish({ ...r, id: 'care4' });
    }
    ctx.fillText(body.care.footer, cx + 16, H - 28);
  }

  /** the tab she did not open. Two of its lines are documentary. */
  private drawExtra(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const top = ADDR.y + ADDR.h + 12;
    px(ctx, ADDR.x, top, W - ADDR.x * 2, H - top - 8, CHROME.field);
    setFont(ctx, 9);
    ctx.fillStyle = CHROME.hint;
    ctx.fillText(body.extra.mark, ADDR.x + 14, top + 10);
    setFont(ctx, 13);
    ctx.fillStyle = CHROME.ink;
    ctx.fillText(body.extra.tagline, ADDR.x + 14, top + 26);
    let y = top + 54;
    setFont(ctx, 10);
    for (const l of body.extra.lines as string[]) {
      ctx.fillStyle = CHROME.ink;
      ctx.fillText(l, ADDR.x + 14, y);
      y += 17;
    }
    // ⚑ the smallest type on the page, and it is the documentary one
    setFont(ctx, 9);
    ctx.fillStyle = CHROME.hint;
    ctx.fillText(body.extra.fine, ADDR.x + 14, y + 8);
    ctx.fillText(body.extra.opened, ADDR.x + 14, H - 18);
  }

  /**
   * ⚑ P7-66 — SHE ASKED HER OWN FIRST. Her draft to Meridian LGB Trust, over the restored page: one press sends it,
   * and the auto-reply lands under it a few seconds later — polite, procedural, final. Then Close, and the session
   * is hers again. While it is open it is the only control on the page (the page under it publishes nothing).
   */
  private drawEnquiry(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.hits = this.hits.filter((h) => h.id === 'start-menu' || h.id.startsWith('lg-') || h.id.startsWith('sm-'));
    const top = ADDR.y + ADDR.h + 8;
    ctx.save(); ctx.globalAlpha = 0.7; px(ctx, 0, top, W, H - top, WEB.bg); ctx.restore();
    const x = 40, w = W - 80, inner = w - 28;
    const replied = this.enquiry === 'replied';
    const h = replied ? Math.min(H - top - 12, 292) : 150;
    webCard(ctx, x, top + 4, w, h);
    let y = top + 14;
    const line = (t: string, size: number, ink: string, gap: number): void => {
      setFont(ctx, size); ctx.fillStyle = ink;
      for (const l of wrapText(ctx, t, inner)) { ctx.fillText(l, x + 14, y); y += gap; }
    };
    line(this.enquiry === 'draft' ? ENQ.draftLabel : ENQ.sent, 8, WEB.muted, 11);
    line(ENQ.to, 8, WEB.muted, 13);
    line(ENQ.subject, 10, WEB.ink, 15);
    for (const m of ENQ.message) line(m, 9, WEB.ink, 12);
    if (this.enquiry === 'draft') {
      const b = webButton(ctx, x + w - 84, top + h - 26, ENQ.send, 'primary', 70);
      this.publish({ ...b, id: 'enq-send' });
      return;
    }
    if (!replied) return;
    y += 4; px(ctx, x + 14, y, inner, 1, WEB.cardEdge); y += 8;
    line(ENQ.replyFrom, 8, WEB.muted, 11);
    line(ENQ.replySubject, 10, WEB.ink, 15);
    for (const m of ENQ.reply) line(m, 9, WEB.ink, 12);
    y += 2;
    line(ENQ.directory, 8, WEB.muted, 11);
    // ⚑ S293 / V4 — the loop's receipt: the referral is in the footer
    if (ENQ.referred) line(ENQ.referred, 8, WEB.ink, 11);
    const b = webButton(ctx, x + w - 84, top + h - 26, ENQ.close, 'quiet', 70);
    this.publish({ ...b, id: 'enq-close' });
  }

  /**
   * ⚑ S293 / V10 — THE ORIGINAL IS KEPT. In the conversation, after Junie's thread, Photos shows her profile photo as
   * the agent left it (the composite, labelled) and, under it, the original it promised to keep. One press: Use
   * original. The verifier runs, and is satisfied: Match: Maya. Nothing here is hidden or hacked; the button is the
   * system's own, and the sentence that put it there was meant to soothe.
   */
  private drawReversal(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const R = REVERSAL;
    const top = ADDR.y + ADDR.h + 8;
    px(ctx, 0, top - 8, W, H - top + 8, WEB.bg);
    const cx = ADDR.x + 8, cw = W - ADDR.x * 2 - 16;
    webCard(ctx, cx, top, cw, H - top - 10);
    setFont(ctx, 12); ctx.fillStyle = WEB.ink; ctx.fillText(R.title, cx + 16, top + 12);
    const pw = 200, ph = 160, y = top + 36;
    const matched = this.reversal === 'matched';
    const name = this.chosenFile || 'me, after';
    // the current profile photo
    if (matched) thumb(ctx, cx + 16, y, pw, ph, 3, false, 6); else composite(ctx, cx + 16, y, pw, ph);
    setFont(ctx, 8); ctx.fillStyle = WEB.muted;
    ctx.fillText(matched ? `${name}.jpg  ·  current` : R.current, cx + 16, y + ph + 8);
    // the original, kept
    const ox = cx + 16 + pw + 30;
    thumb(ctx, ox, y, 120, 96, 3, false, 6);
    setFont(ctx, 9); ctx.fillStyle = WEB.ink;
    ctx.fillText(R.original.replace('{name}', name), ox, y + 104);
    if (this.reversal === 'none') {
      const b = webButton(ctx, ox, y + 124, R.button, 'primary', 120);
      this.publish({ ...b, id: 'photo-original' });
      return;
    }
    if (this.reversal === 'verifying') {
      setFont(ctx, 10); ctx.fillStyle = WEB.muted;
      const dots = '.'.repeat(1 + Math.floor(this.reversalT * 3) % 3);
      ctx.fillText(R.verifying.replace('…', '') + dots, ox, y + 128);
      progressBar(ctx, ox, y + 144, 160, this.reversalT / R.verifySeconds, this.reversalT);
      return;
    }
    // matched: the verifier's green, her name, and the agent — satisfied — saying its last two lines
    roundRect(ctx, ox, y + 122, 120, 22, 11, WEB.accentSoft);
    setFont(ctx, 10); ctx.fillStyle = WEB.accentInk; ctx.fillText('✓  ' + R.match, ox + 12, y + 128);
    setFont(ctx, 8); ctx.fillStyle = WEB.muted; ctx.fillText(R.matched, ox, y + 152);
    const b = AGENT.beats[beatIndex('ready')];
    if (this.cur?.id === 'ready') {
      const n = this.linesShown;
      let ty = y + 172;
      for (let k = 0; k < n; k++) {
        setFont(ctx, 10);
        const tw = Math.ceil(ctx.measureText(b.lines[k]).width) + 22;
        avatar(ctx, ox, ty, 16, WEB.primary, 'S');
        roundRect(ctx, ox + 22, ty - 2, tw, 20, 8, WEB.chip);
        ctx.fillStyle = WEB.ink; ctx.fillText(b.lines[k], ox + 33, ty + 3);
        ty += 24;
      }
    }
  }

  /** the library: the original, and the one she never made, with its date. */
  private drawPhotos(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    if (this.mode === 'agent' && this.junieReplied) { this.drawReversal(ctx, W, H); return; }
    const top = ADDR.y + ADDR.h + 12;
    px(ctx, ADDR.x, top, W - ADDR.x * 2, H - top - 8, CHROME.field);
    setFont(ctx, 9);
    ctx.fillStyle = CHROME.hint;
    ctx.fillText(body.photos.heading, ADDR.x + 14, top + 10);
    photograph(ctx, ADDR.x + 14, top + 24, 150, 93, this.enhanced, 3);
    let y = top + 130;
    for (const f of body.photos.files as Array<{ name: string; when: string; note: string }>) {
      setFont(ctx, 9);
      ctx.fillStyle = CHROME.ink;
      ctx.fillText(f.name, ADDR.x + 14, y);
      setFont(ctx, 8);
      ctx.fillStyle = CHROME.hint;
      ctx.fillText(`${f.when}${f.note ? '  ·  ' + f.note : ''}`, ADDR.x + 150, y + 1);
      y += 15;
    }
    const label = this.enhanced ? body.photos.control : body.photos.kept;
    setFont(ctx, 9);
    const w = Math.ceil(ctx.measureText(label).width) + 16;
    px(ctx, ADDR.x + 14, y + 6, w, 15, CHROME.tabLive);
    ctx.fillStyle = CHROME.ink;
    ctx.fillText(label, ADDR.x + 22, y + 10);
    this.publish({ x: ADDR.x + 14, y: y + 6, w, h: 15, id: 'photo-flip' });
  }

  handleClick(x: number, y: number): boolean {
    const lg = this.hits.find(h => h.id.startsWith('lg-') && x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    this.lambyGuide?.activity();
    // An explicit help request yields this operable console line to Lamby. Quiet scenes remain gated.
    if (lg?.id === 'lg-tray') { this.nowLine = null; this.waitNow = false; }
    if (lg && this.lambyGuide?.press(lg.id)) { this.version++; return true; }

    this.quietT = 0;
    this.freeQuietT = 0;
    this.idleT = 0;
    if (this.idleOrb) { this.idleOrb = null; this.version++; return true; }   // S208 — a press wakes it, and does nothing else
    if (this.waitNow) { this.waitNow = false; this.version++; }
    if (this.nowLine) { this.nowLine = null; this.version++; }
    if (this.phase === 'handed') return false;
    if (this.phase === 'failed') return true;   // a dead page takes presses and does nothing
    if (this.phase === 'saver') { this.wake(); return true; }   // S160: the one press that restores
    if (this.phase !== 'open') return true;   // the restore takes presses and eats them
    const hit = this.hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (!hit && this.startMap.menu) { this.startMap.close(); this.version++; return true; }
    // ⚑ S293 / V0 — the defaults sheet: Continue, or nothing (Start still works)
    if (this.defaultsOpen && !(hit && (hit.id === 'start-menu' || hit.id.startsWith('sm-')))) {
      if (hit?.id === 'def-continue') {
        this.defaultsDone = true;
        ledger.e4Space.push({ id: 'defaults', outcome: 'read', witness: DEFAULTS.witness });
        playOnce('ui_press.mp3');
      }
      this.version++;
      return true;
    }
    // P7-66: while her enquiry is open it is the only thing on the page that takes a press (Start still works)
    if (this.enquiryOpen && !(hit && (hit.id === 'start-menu' || hit.id.startsWith('sm-')))) {
      if (hit?.id === 'enq-send' && this.enquiry === 'draft') { this.enquiry = 'sending'; this.enquiryT = 0; playOnce('ui_press.mp3'); }
      else if (hit?.id === 'enq-close' && this.enquiry === 'replied') {
        this.enquiry = 'closed';
        ledger.e4Space.push({ id: 'enquiry', outcome: 'read', witness: ENQ.witness });
        // V5 — the refusal is the agent's reason now: the referral beat is over, and it comes back to her
        this.answer(null, ENQ.witness);
      }
      this.version++;
      return true;
    }
    if (hit) {
      if (hit.id === 'start-menu') { this.lambyGuide?.press('lg-x'); this.startMap.toggle(); this.version++; return true; }
      if (hit.id === 'whattodo' && !this.startMapSilent) { this.startMap.close(); this.startPanel.toggle(); this.version++; return true; }
      if (this.startMap.press(hit.id, this.startModel(), this.startMapSilent)) { this.version++; return true; }
      if (hit.id === 'sm-whattodo' && !this.startMapSilent) { this.startMap.close(); this.startPanel.reopen(); this.version++; return true; }
      if (hit.id === 'sm-now' || hit.id.startsWith('sm-room:')) {
        this.nowLine = hit.id === 'sm-now' ? this.startModel().now?.hint ?? null : this.startModel().room.find(b => b.id === hit.id.slice(8))?.hint ?? null;
        this.startMap.close(); this.version++; return true;
      }
      if (hit.id === 'sm-shut') { this.startMap.close(); this.startMap.refused = true; this.version++; return true; }
      if (hit.id === 'sm-leave') { this.startMap.close(); gameMenuBus.openLeave?.(); this.version++; return true; }
      if (this.startMap.active && !this.startMapSilent) { this.startMap.close(); this.version++; return true; }
      if (this.mode === 'typing') return true;
      if (hit.id === 'startpanel-close') { this.startPanel.close(); this.version++; return true; }   // S229 / W1-A6
      // S168 / R3-92: the game, one press away
      if (hit.id === 'bm-floppy' && this.mode === 'free') { this.mode = 'game'; this.floppy.openGame(); this.version++; return true; }
      if (hit.id === 'game-back') { this.floppy.closeGame(); this.mode = 'free'; this.version++; return true; }
      if (hit.id === 'game-tap') {
        const f = this.gameFrame;
        const handled = this.floppy.tap((x - f.x) / f.s, (y - f.y) / f.s);
        if (!this.floppy.open) this.mode = 'free';   // its own Back
        this.version++;
        return handled;
      }
      // ── the takeover ──
      if (this.mode === 'free' && (hit.id === 'search-open' || hit.id === 'tab0')) {
        if (this.live !== 0) { this.openTab(0); }
        this.mode = 'typing'; this.typeT = 0; this.live = 0; this.version++;
        playOnce('ui_press.mp3');   // (S159: the typing sound is gone with the other keyboard sounds — his call)
        return true;
      }
      // ⚑ S293 / V1 → V2: the ad opens the agent's chat directly (the landing page is cut)
      if (hit.id === 'result-agent' && this.mode === 'results') {
        this.mode = 'agent'; this.beat = 0; this.beatT = 0; this.live = 0;
        ledger.e4Space.push({ id: 'agent', outcome: 'opened', witness: 'assistant: opened from a sponsored result — Second Thoughts' });
        this.version++; playOnce('agent_2026.mp3');
        return true;
      }
      // ── ⚑ S293 — the conversation ──
      if (this.mode === 'agent') {
        const b = this.cur;
        if (hit.id.startsWith('conv-chip-') && b?.chips && this.beatReady && !this.stepDone.has(b.id)) {
          const c = b.chips[Number(hit.id.slice(10))];
          if (c) this.answer(c.label, c.filed);
          return true;
        }
        if (hit.id === 'conv-act' && b && this.beatReady && !this.stepDone.has(b.id)) {
          if (b.id === 'see') { this.picker = 'open'; playOnce('ui_press.mp3'); this.version++; return true; }
          if (b.id === 'composite') { this.profile = 'composite'; this.picker = 'closed'; }
          this.answer(null, b.filed);
          return true;
        }
        if (hit.id === 'res-meridian' && b?.id === 'resources' && this.enquiry === 'none') {
          this.enquiry = 'draft'; playOnce('ui_press.mp3'); this.version++;
          return true;
        }
        if (hit.id.startsWith('file-') && (this.picker === 'open' || this.picker === 'folder')) {
          const k = Number(hit.id.slice(5));
          const list = this.picker === 'folder' ? AGENT.photo.folderItems : AGENT.photo.items;
          const it = list[k];
          // ⚑ 2026-09-13: a folder OPENS; a photograph is what the tool takes
          if (it && it.kind === 'folder') { this.picker = 'folder'; this.version++; return true; }
          this.chosenFile = it ? it.name.replace(/\.jpg$/i, '') : 'me, after';
          this.picker = 'restoring'; this.pickerT = 0; this.version++;
          playOnce('ui_press.mp3');
          return true;
        }
        if (hit.id === 'file-back' && this.picker === 'folder') { this.picker = 'open'; this.version++; return true; }
        if (hit.id === 'thread-junie' && b?.id === 'messages' && this.threadsUp && !this.threadOpen) {
          this.threadOpen = true;
          ledger.e4Space.push({ id: 'thread', outcome: 'opened', witness: AGENT.threads.witness });
          this.version++;
          return true;
        }
        // V9 — her reply to Junie: felt, filed nowhere
        if (hit.id === 'junie-reply' && this.threadOpen && this.repliedT < 0) { this.repliedT = 0; playOnce('ui_press.mp3'); this.version++; return true; }
        // V10 — the original
        if (hit.id === 'photo-original' && this.junieReplied && this.reversal === 'none') {
          this.reversal = 'verifying'; this.reversalT = 0; playOnce('ui_press.mp3'); this.version++;
          return true;
        }
        if (hit.id.startsWith('tab')) {
          const i = Number(hit.id.slice(3));
          // a locked tab published no rect
          if (Number.isFinite(i) && TABS[i]) { this.live = i; this.version++; }
          return true;
        }
        if (hit.id === 'legacy-toggle') {   // S144: readable on the rails too — it is a page, not a step
          this.legacyOpen = !this.legacyOpen; this.version++;
          if (this.legacyOpen && !ledger.e4Space.some((e) => e.id === 'legacy')) {
            ledger.e4Space.push({ id: 'legacy', outcome: 'read', witness: body.record.legacy.witness });
          }
          return true;
        }
        return true;
      }
      if (hit.id.startsWith('tab')) {
        const i = Number(hit.id.slice(3));
        if (Number.isFinite(i) && TABS[i]) { this.openTab(i); return true; }
      }
      // ⚑ the record's change request. It WORKS: it files, it thanks her, and
      //   the field does not move. That is the beat — a form that cannot be
      //   corrected from inside the account that owns it.
      if (hit.id === 'record-request' && !this.requested) {
        this.requested = true;
        ledger.e4Space.push({ id: 'record', outcome: 'read', witness: 'change requested — legacy field unchanged' });
        this.version++;
        return true;
      }
      // ⚑ every undo works. Undoing all four still leaves the six weeks they
      //   were in force, and nothing here says so.
      if (hit.id.startsWith('care')) {
        const i = Number(hit.id.slice(4));
        if (Number.isFinite(i)) {
          this.undone.add(i);
          ledger.e4Space.push({ id: `care${i}`, outcome: 'read', witness: 'care action reversed at subject\'s request' });
          this.version++;
          return true;
        }
      }
      if (hit.id === 'photo-flip') { this.enhanced = !this.enhanced; this.version++; return true; }
      if (hit.id === 'legacy-toggle') {
        this.legacyOpen = !this.legacyOpen; this.version++;
        if (this.legacyOpen && !ledger.e4Space.some((e) => e.id === 'legacy')) {
          ledger.e4Space.push({ id: 'legacy', outcome: 'read', witness: body.record.legacy.witness });
        }
        return true;
      }
    }
    /**
     * ⚑ A MISS IS A MISS (2026-09-12). This used to hand the browser over —
     * `phase = 'handed'` — on any press that hit no rect, and from then on the
     * page drew "Restoring your session" for ever. On the monitor, with real
     * fingers, that is every second press: Sérgio's review read "I pressed L
     * Chat and it broke down… I pressed the photo and it broke down", and
     * nothing had broken — the browser had quietly ended itself. A press on
     * empty page does nothing, which is what a browser does.
     */
    return true;
  }

  /**
   * ⚑ OPENING A TAB IS THE ONLY THING THIS ERA ASKS, AND IT ASKS NOTHING.
   * No tab gates any other, none is marked unread, nothing nags, and no surface
   * counts what is left — the headset is on the desk from the first frame and
   * the era ends when she wears it, whether one tab has been opened or six.
   *
   * ⚑ What it DOES do is file. One line per tab, once, in the machine's flattest
   * register: you are reading its record of her while it keeps a record of your
   * reading. Opening something twice is a person re-reading, not a second
   * interest — the same rule the offer cards and the photograph's flip obey.
   */
  private openTab(i: number): void {
    this.live = i;
    const t = TABS[i];
    const w = (body as Record<string, { witness?: string }>)[t.id]?.witness;
    if (w && !this.read.has(t.id)) {
      this.read.add(t.id);
      ledger.e4Space.push({ id: `tab:${t.id}`, outcome: 'read', witness: w });
    }
    this.version++;
  }

  /** the room's coordinate-less press, and the debug panel's own exit. */
  handOverLid(): void { this.phase = 'handed'; this.version++; }
  /** ⚑ 2026-09-13: the device has stopped — the agent's page cannot be reached
   *  any more, and the monitor says so (see `body.failed`). */
  fail(): void { if (this.phase !== 'failed') { this.phase = 'failed'; this.failT = 0; this.version++; } }
  private failT = 0;
  /** ⚑ S293 — the link she opened is open on this machine too: when the device stops, the monitor shows the stream */
  private streamOpen = false;
  openStream(): void { this.streamOpen = true; }

  /** review only: land on a tab, or on the settled browser. */
  debugJumpTo(where: string): void {
    this.settleT = 0;
    this.phase = 'open';
    this.t = 0;
    this.filed = true;
    this.defaultsDone = true;
    const i = TABS.findIndex(t => t.id === where);
    this.live = i >= 0 ? i : 0;
    this.version++;
  }
}
