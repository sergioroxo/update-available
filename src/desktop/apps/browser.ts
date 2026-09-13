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
import { px, setFont, wrapText } from '../theme/chrome';
import { browserChrome, restoring, photograph, glitchBands, CHROME, ADDR, ERA4 } from '../theme/era4';
import updates from '../../../data/strings/updates.json';
import { ledger } from '../../state/ledger';
import script from '../../../data/dialog/s4_boot.json';
import {
  WEB, roundRect, roundEdge, pill, webCard, webButton, chipRow, progressBar,
  avatar, messageBar, thumb, compareSplit, type TabLook
} from '../theme/era4';
import body from '../../../data/dialog/s4_browser.json';

/** ⚑ the five tabs she left plus the one she did not. Only `search` draws a
 *  page in S123; the rest are the next sessions' work and are deliberately
 *  declared here so the chrome is honest about what the era will contain. */
type TabId = 'search' | 'chat' | 'record' | 'photos' | 'care' | 'extra';
interface Tab { id: TabId; mark: string; title: string; notHers?: boolean; address?: string }
const TABS = script.tabs as unknown as Tab[];
interface Step { id: TabId; n: number; title: string; ask: string; button?: string; done?: string; witness?: string; console: string }
interface FileItem { name: string; kind: 'folder' | 'file'; meta: string }
interface Failed { status: string; title: string; line: string; detail: string; step: string }
const PROGRAM = body.program as unknown as {
  chosen: string; typingSeconds: number; agentMark: string; agentAddress: string;
  greeting: string[]; begin: string; beginWitness: string; stepLabel: string; locked: string;
  steps: Step[];
  files: { title: string; path: string; items: FileItem[]; cancel: string; restoring: string;
    before: string; after: string; saved: string; restoringSeconds: number;
    upload: string; stages: string[]; adjusted: string[]; savedButton: string;
    folderItems: FileItem[]; back: string };
  failed: Failed;
  console: { mark: string; restored: string; typing: string; managed: string; ready: string; worn: string };
};
/** the agent moves to the next step this long after the press */
const ADVANCE_SECONDS = 1.4;
/** the page area under the toolbar, for painting the app ground */
const H_PAGE = 384;
/** ⚑ the failure on the desk's two screens, in seconds from the device stopping:
 *  the sentence holds, then the bands tear it, then both are off — and the Close's
 *  travel begins over dead screens (app.ts CLOSE_LEAD_SECONDS is set to match). */
export const FAIL = { bands: 5.5, off: 8.5 } as const;
/** …except after the Restoration, whose before/after is the point: it holds */
const RESULT_HOLD_SECONDS = 4.5;

/** under four seconds. E2's splash is 23.7 because 2003 made you watch it. */
const RESTORE_SECONDS = 2.4;
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
  /**
   * ⚑ `dormant` FIRST (2026-09-12). The shell — and this browser with it — is
   * built at the update ritual's restart, MID-FLIGHT, so a clock that starts
   * at construction has finished restoring before the camera lands: the boot
   * that d50f88a built was never once in the played path. The page stays dark
   * until `beginSession()` is called — by app.ts's `endRelocation` on the real
   * E3→E4 leg, with the settle delay, and by the review jumps at once.
   */
  private phase: 'dormant' | 'restoring' | 'open' | 'handed' | 'failed' = 'dormant';
  /** seconds still to wait before the boot line — the settle after landing */
  private settleT = 0;

  // ── ⚑ THE PROGRAM (2026-09-12) — see s4_browser.json `program._doc` ─────────
  /** free: the restored session, hers · typing: the search being finished for
   *  her · agent: Second Thoughts introducing itself · program: the five steps */
  private mode: 'free' | 'typing' | 'agent' | 'program' = 'free';
  private typeT = 0;
  /** seconds since the agent's page opened — its bubbles arrive on this */
  private agentT = 0;
  /** index into program.steps; the live step. The last step is the headset. */
  private step = 0;
  private stepDone = new Set<string>();
  /** seconds since the live step was completed — the agent moves on after a beat */
  private advanceT = -1;
  /** the Restoration exercise's own little machine */
  private picker: 'closed' | 'open' | 'folder' | 'restoring' | 'result' = 'closed';
  /** the photograph she chose — the folder's, or the top level's; the save line names it */
  private chosenFile = '';
  private pickerT = 0;

  get programMode(): string { return this.mode; }
  /** the steps are done and the headset is the only thing left */
  get programDone(): boolean {
    return this.mode === 'program' && this.step >= PROGRAM.steps.length - 1;
  }
  /** the line L's console on the laptop shows — see E4Shell.drawLaptop */
  get consoleLine(): string {
    const c = PROGRAM.console;
    if (this.mode === 'free') return this.phase === 'open' ? c.restored : '';
    if (this.mode === 'typing' || this.mode === 'agent') return c.typing;
    if (this.programDone) return c.ready;
    return PROGRAM.steps[this.step]?.console ?? '';
  }
  get consoleMark(): string { return this.mode === 'free' ? PROGRAM.console.mark : PROGRAM.agentMark; }
  get consoleLineWorn(): string { return PROGRAM.console.worn; }
  /** review only: land past the steps, headset wearable */
  debugFinishProgram(): void {
    this.mode = 'program';
    for (const st of PROGRAM.steps) this.stepDone.add(st.id);
    this.step = PROGRAM.steps.length - 1;
    this.live = 0;
    this.version++;
  }
  private stepTab(id: string): number { const i = TABS.findIndex(t => t.id === id); return i < 0 ? 0 : i; }
  private completeStep(): void {
    const st = PROGRAM.steps[this.step];
    if (!st || this.stepDone.has(st.id)) return;
    this.stepDone.add(st.id);
    if (st.witness) ledger.e4Space.push({ id: `step:${st.id}`, outcome: 'done', witness: st.witness });
    this.advanceT = 0;
    this.version++;
  }

  /** the session begins: the settle, the boot line, the restore, the tabs. */
  beginSession(settleSeconds = 0): void {
    if (this.phase !== 'dormant') return;
    this.settleT = settleSeconds;
    this.t = 0;
    this.phase = 'restoring';
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

  update(dt: number): void {
    // ⚑ a surface that has stopped being pressable publishes nothing, even if
    //   nothing redraws it: the walk found a stale `tab0` still advertised
    //   through the whole finale and pressed it forty-five times (2026-09-12)
    if (!this.pressable && this.hits.length) this.hits = [];
    if (this.phase === 'dormant') return;
    if (this.phase === 'failed') {
      // ⚑ 2026-09-13: the failure spreads — the sentence, the bands, then off
      if (this.failT < FAIL.off + 0.5) {
        const b4 = this.failT;
        this.failT += dt;
        if (Math.floor(b4 * 12) !== Math.floor(this.failT * 12)) this.version++;
      }
      return;
    }
    if (this.settleT > 0) { this.settleT = Math.max(0, this.settleT - dt); return; }
    this.t += dt;
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
    // ── the program's clocks ──
    if (this.mode === 'typing') {
      this.typeT += dt;
      this.version++;
      if (this.typeT >= PROGRAM.typingSeconds + 0.6) { this.mode = 'agent'; this.agentT = 0; this.version++; }
      return;
    }
    if (this.mode === 'agent') {
      const before = this.agentT;
      this.agentT += dt;
      // repaint on each bubble and each dot, not each frame
      if (Math.floor(before / 0.3) !== Math.floor(this.agentT / 0.3)) this.version++;
    }
    if (this.mode === 'program') {
      if (this.advanceT >= 0) {
        this.advanceT += dt;
        const hold = PROGRAM.steps[this.step]?.id === 'photos' ? RESULT_HOLD_SECONDS : ADVANCE_SECONDS;
        if (this.advanceT >= hold) {
          this.advanceT = -1;
          if (this.step < PROGRAM.steps.length - 1) {
            this.step += 1;
            this.live = this.stepTab(PROGRAM.steps[this.step].id);
            this.picker = 'closed';
          }
          this.version++;
        }
      }
      if (this.picker === 'restoring') {
        this.pickerT += dt;
        if (this.pickerT >= PROGRAM.files.restoringSeconds) {
          this.picker = 'result';
          this.enhanced = true;
          this.version++;
          this.completeStep();
        }
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
    this.hits = [];
    this.pressable = pressable;
    const back = this.tabsBack();

    if (this.phase === 'dormant' || this.settleT > 0) {
      // the machine is simply off until the session begins
      px(ctx, 0, 0, W, H, CHROME.page);
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
      t.id === 'search' && this.mode !== 'free' && this.mode !== 'typing' ? { ...t, title: PROGRAM.agentMark } : t);
    // ⚑ each tab shows its own address; only the search tab shows what she
    //   typed, and only it carries the cursor (2026-09-12, his review)
    const onSearch = this.liveTab === 'search';
    let addr = this.phase === 'failed' ? PROGRAM.agentAddress
      : this.phase !== 'open' ? '' : onSearch ? script.search.typed : (TABS[this.live]?.address ?? '');
    let blink = this.phase === 'open' && onSearch && this.pressable && this.mode === 'free'
      && Math.floor(this.t / CURSOR_BLINK) % 2 === 0;
    // ⚑ the search being finished FOR her: the typed six words, then the rest
    //   of the sentence arriving a character at a time, then the agent's address
    if (this.mode === 'typing') {
      const k = Math.min(1, this.typeT / PROGRAM.typingSeconds);
      const full = PROGRAM.chosen;
      const n = script.search.typed.length + Math.floor((full.length - script.search.typed.length) * k);
      addr = full.slice(0, n);
      blink = true;
    } else if ((this.mode === 'agent' || this.mode === 'program') && onSearch) {
      addr = PROGRAM.agentAddress;
    }
    const looks: TabLook[] = shown.map((t) => {
      if (this.phase === 'failed') return t.id === 'search' ? { badge: '!', state: 'normal' } : { state: 'locked' };
      if (this.mode !== 'program') return {};
      const st = PROGRAM.steps.find(x => x.id === t.id);
      if (!st) return { state: 'locked' };
      const idx = PROGRAM.steps.indexOf(st);
      return {
        badge: String(st.n),
        state: this.stepDone.has(st.id) ? 'done' : idx > this.step ? 'locked' : 'normal'
      };
    });
    const rects = browserChrome(ctx, W, shown, this.live, addr, blink, looks);
    rects.forEach((r, i) => {
      // ⚑ in the program only the live step's tab (and the finished ones) are
      //   controls; a locked step publishes nothing, so nothing can be aimed at it
      if (this.mode === 'program' && looks[i]?.state === 'locked') return;
      this.publish({ ...r, id: `tab${i}` });
    });

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
    if (this.mode === 'typing') { this.drawSearch(ctx, W); return; }
    if (this.mode === 'agent') { this.drawAgent(ctx, W, H); return; }
    if (this.mode === 'program') {
      const st = PROGRAM.steps[this.step];
      const bodyTop = this.drawStepBar(ctx, W, st);
      switch (this.liveTab) {
        case 'photos': this.drawRestoration(ctx, W, H, bodyTop); return;
        case 'search': this.drawAgent(ctx, W, H, bodyTop); return;
        case 'chat': this.drawChat(ctx, W, H, bodyTop); return;
        case 'record': this.drawRecord(ctx, W, H, bodyTop); return;
        case 'care': this.drawCare(ctx, W, H, bodyTop); return;
        default: break;
      }
    }
    switch (this.liveTab) {
      case 'search': this.drawSearch(ctx, W); break;
      case 'chat': this.drawChat(ctx, W, H); break;
      case 'record': this.drawRecord(ctx, W, H); break;
      case 'care': this.drawCare(ctx, W, H); break;
      case 'extra': this.drawExtra(ctx, W, H); break;
      case 'photos': this.drawPhotos(ctx, W, H); break;
    }
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
   * ⚑ THE AGENT'S PAGE — a chat, because that is what such a thing looks like
   * in 2026: an avatar, message bubbles arriving one after another, and a
   * message bar at the bottom that is a PICTURE of a message bar. Nothing can
   * be typed into it, ever (no free text anywhere in the piece); the only
   * control is the one pill the last bubble carries. In the program it is the
   * session's own page: the five steps as a checklist.
   */
  private drawAgent(ctx: CanvasRenderingContext2D, W: number, H: number, bodyTop?: number): void {
    const top = bodyTop ?? ADDR.y + ADDR.h + 8;
    px(ctx, 0, top - 8, W, H - top + 8, WEB.bg);
    const cx = ADDR.x + 8, cw = W - ADDR.x * 2 - 16;
    webCard(ctx, cx, top, cw, H - top - 14);
    // the header: avatar, the mark, a live dot
    avatar(ctx, cx + 12, top + 10, 22, WEB.primary, 'S');
    setFont(ctx, 11);
    ctx.fillStyle = WEB.ink;
    ctx.fillText(PROGRAM.agentMark, cx + 42, top + 11);
    setFont(ctx, 8);
    ctx.fillStyle = WEB.muted;
    px(ctx, cx + 42, top + 26, 5, 5, WEB.accent);
    ctx.fillText('online', cx + 50, top + 23);
    px(ctx, cx + 1, top + 40, cw - 2, 1, WEB.cardEdge);
    let y = top + 52;
    const bubble = (text: string, mine = false): void => {
      setFont(ctx, 10);
      const rows = wrapText(ctx, text, cw - 120).slice(0, 4);
      const bw = Math.max(...rows.map(r => Math.ceil(ctx.measureText(r).width))) + 22;
      const bh = rows.length * 13 + 12;
      const bx = mine ? cx + cw - 12 - bw : cx + 42;
      roundRect(ctx, bx, y, bw, bh, 8, mine ? WEB.accentSoft : WEB.chip);
      ctx.fillStyle = WEB.ink;
      rows.forEach((r, k) => ctx.fillText(r, bx + 11, y + 6 + k * 13));
      y += bh + 6;
    };
    if (this.mode === 'agent') {
      // the greeting arrives a bubble at a time
      const shown = Math.min(PROGRAM.greeting.length, 1 + Math.floor(this.agentT / 0.9));
      for (let k = 0; k < shown; k++) bubble(PROGRAM.greeting[k]);
      if (shown < PROGRAM.greeting.length) {
        // typing dots
        roundRect(ctx, cx + 42, y, 34, 16, 8, WEB.chip);
        const d = Math.floor(this.agentT / 0.3) % 3;
        for (let k = 0; k < 3; k++) px(ctx, cx + 50 + k * 8, y + 6, 4, 4, k === d ? WEB.ink : WEB.faint);
      } else {
        const r = webButton(ctx, cx + 42, y + 2, PROGRAM.begin, 'primary', 84);
        this.publish({ ...r, id: 'agent-begin' });
      }
    } else {
      bubble(PROGRAM.console.managed);
      // the checklist card inside the chat
      const lx = cx + 42, lw = cw - 54;
      roundEdge(ctx, lx, y, lw, 16 + PROGRAM.steps.length * 17 + 11, 6, WEB.cardEdge, WEB.card);
      let ly = y + 9;
      for (const st of PROGRAM.steps) {
        const done = this.stepDone.has(st.id);
        const cur = PROGRAM.steps[this.step] === st && !done;
        roundRect(ctx, lx + 10, ly + 1, 9, 9, 4, done ? WEB.accent : cur ? WEB.primary : WEB.chip);
        if (done) { ctx.fillStyle = WEB.card; setFont(ctx, 8); ctx.fillText('✓', lx + 11, ly); }
        setFont(ctx, 10);
        ctx.fillStyle = done ? WEB.muted : WEB.ink;
        ctx.fillText(`${st.n}   ${st.title}`, lx + 26, ly);
        if (cur) {
          // ⚑ on its own row (2026-09-13): beside the title it ran into it
          setFont(ctx, 8);
          ctx.fillStyle = WEB.muted;
          ctx.fillText(st.ask, lx + 46, ly + 12);
          ly += 11;
        }
        ly += 17;
      }
    }
    messageBar(ctx, cx + 12, top + (H - top - 14) - 34, cw - 24, `Message ${PROGRAM.agentMark}`);
  }

  /**
   * ⚑ THE STEP HEADER — one strip under the toolbar, the same on every step:
   * five segments showing where she is, "Step n of 5" and the agent's mark,
   * the ask as a title, and the ONE control as a primary pill. The page's own
   * content sits under it, which is what makes a step a tab rather than a new
   * screen. Returns where the page body starts.
   */
  private drawStepBar(ctx: CanvasRenderingContext2D, W: number, st: Step): number {
    const top = ADDR.y + ADDR.h + 6;
    const h = 44;
    px(ctx, 0, top, W, H_PAGE, WEB.bg);
    px(ctx, 0, top, W, h, WEB.card);
    px(ctx, 0, top + h - 1, W, 1, WEB.cardEdge);
    const done = this.stepDone.has(st.id);
    // the five segments
    const segW = 26, segX = ADDR.x + 8;
    PROGRAM.steps.forEach((x, k) => {
      const fill = this.stepDone.has(x.id) ? WEB.accent : k === this.step ? WEB.primary : WEB.chip;
      pill(ctx, segX + k * (segW + 3), top + 8, segW, 4, fill);
    });
    setFont(ctx, 8);
    ctx.fillStyle = WEB.muted;
    ctx.fillText(PROGRAM.stepLabel.replace('{n}', String(st.n)) + '  ·  ' + PROGRAM.agentMark, segX, top + 16);
    setFont(ctx, 12);
    ctx.fillStyle = WEB.ink;
    ctx.fillText(done && st.done ? st.done : st.ask, segX, top + 27);
    if (!done && st.button && !(st.id === 'photos' && this.picker !== 'closed')) {
      const bw = Math.ceil(ctx.measureText(st.button).width) + 26;
      const r = webButton(ctx, W - ADDR.x - 12 - Math.max(84, bw), top + 12, st.button, 'primary', 84);
      this.publish({ ...r, id: `step-${st.id}` });
    } else if (done) {
      setFont(ctx, 9);
      ctx.fillStyle = WEB.accentInk;
      const t = '✓  done';
      ctx.fillText(t, W - ADDR.x - 12 - Math.ceil(ctx.measureText(t).width), top + 18);
    }
    return top + h + 10;
  }

  /**
   * ⚑ THE RESTORATION EXERCISE — Sérgio's mandatory step, and the one that
   * shows what the system can do to a person. It is drawn as the AI photo tool
   * it would be in 2026: a drop zone, presets, a shimmering progress with the
   * stages it claims to be doing, and a before/after with a handle. "Upload"
   * opens a file window that is a PICTURE of a file window (CLAUDE.md: the
   * filter never takes file input, never asks a permission); she picks one of
   * her own photographs; the site "restores" her from a pre-authored pair; the
   * result is saved beside the original. Nothing announces what "restored"
   * means — the two pictures do.
   */
  private drawRestoration(ctx: CanvasRenderingContext2D, W: number, H: number, top: number): void {
    const F = PROGRAM.files;
    const cx = ADDR.x + 8, cw = W - ADDR.x * 2 - 16;
    const ch = H - top - 14;
    webCard(ctx, cx, top, cw, ch);
    // the tool's own header
    avatar(ctx, cx + 12, top + 10, 20, WEB.accent, '✦');
    setFont(ctx, 11);
    ctx.fillStyle = WEB.ink;
    ctx.fillText('Restoration', cx + 40, top + 10);
    setFont(ctx, 8);
    ctx.fillStyle = WEB.muted;
    ctx.fillText('AI photo restore  ·  Photos', cx + 40, top + 22);
    chipRow(ctx, cx + cw - 190, top + 12, ['Natural', 'Professional', 'Restored'], [false, false, true]);
    px(ctx, cx + 1, top + 38, cw - 2, 1, WEB.cardEdge);
    const by = top + 48;

    if (this.picker === 'closed') {
      // the drop zone: a dashed rounded well with the upload glyph, and her recents
      const zx = cx + 16, zw = cw - 32, zh = 108;
      roundRect(ctx, zx, by, zw, zh, 8, WEB.bg);
      for (let d = 0; d < zw; d += 8) { px(ctx, zx + 4 + d, by, 4, 1, WEB.faint); px(ctx, zx + 4 + d, by + zh - 1, 4, 1, WEB.faint); }
      for (let d = 0; d < zh; d += 8) { px(ctx, zx, by + 4 + d, 1, 4, WEB.faint); px(ctx, zx + zw - 1, by + 4 + d, 1, 4, WEB.faint); }
      roundRect(ctx, zx + Math.round(zw / 2) - 14, by + 18, 28, 28, 14, WEB.chip);
      setFont(ctx, 14);
      ctx.fillStyle = WEB.primary;
      ctx.fillText('↑', zx + Math.round(zw / 2) - 5, by + 24);
      setFont(ctx, 10);
      ctx.fillStyle = WEB.ink;
      const l1 = 'Drop a photo here, or';
      ctx.fillText(l1, zx + Math.round((zw - ctx.measureText(l1).width) / 2), by + 54);
      const r = webButton(ctx, zx + Math.round(zw / 2) - 42, by + 72, F.upload, 'primary', 84);
      this.publish({ ...r, id: 'step-photos' });
      setFont(ctx, 8);
      ctx.fillStyle = WEB.muted;
      ctx.fillText('Recent', cx + 16, by + zh + 12);
      const tv = [3, 1, 0];
      tv.forEach((v, k) => thumb(ctx, cx + 16 + k * 66, by + zh + 24, 58, 36, v, false));
      return;
    }
    if (this.picker === 'open') {
      // the file window: a sidebar, a search pill, a grid of tiles, a footer
      const w = Math.min(420, cw - 40), h = ch - 60;
      const x = cx + Math.round((cw - w) / 2), y = top + 46;
      ctx.save(); ctx.globalAlpha = 0.35; px(ctx, cx, top, cw, ch, WEB.ink); ctx.restore();
      roundRect(ctx, x, y + 2, w, h, 8, WEB.faint);
      roundEdge(ctx, x, y, w, h, 8, WEB.cardEdge, WEB.card);
      setFont(ctx, 10);
      ctx.fillStyle = WEB.ink;
      ctx.fillText(F.title, x + 14, y + 8);
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
      ctx.fillStyle = WEB.faint;
      ctx.fillText('Search', x + sbw + 24, y + 27);
      ctx.fillStyle = WEB.muted;
      ctx.fillText(F.path, x + sbw + 12, y + 44);
      // the tiles
      const tw = 78, th = 48, gx = x + sbw + 12, gy = y + 56;
      (F.items as FileItem[]).forEach((it, k) => {
        const tx = gx + (k % 4) * (tw + 8), ty = gy + Math.floor(k / 4) * (th + 30);
        if (it.kind === 'folder') {
          roundRect(ctx, tx, ty, tw, th, 5, WEB.chip);
          roundRect(ctx, tx + 24, ty + 14, 30, 22, 3, WEB.faint);
          px(ctx, tx + 24, ty + 11, 12, 4, WEB.faint);
        } else {
          thumb(ctx, tx, ty, tw, th, k === 1 ? 3 : k === 2 ? 3 : 0, k === 3);
        }
        setFont(ctx, 8);
        ctx.fillStyle = WEB.ink;
        ctx.save(); ctx.beginPath(); ctx.rect(tx, ty + th, tw, 12); ctx.clip();
        ctx.fillText(it.name, tx, ty + th + 4); ctx.restore();
        ctx.fillStyle = WEB.muted;
        ctx.fillText(it.meta, tx, ty + th + 14);
        this.publish({ x: tx, y: ty, w: tw, h: th + 24, id: `file-${k}` });
      });
      // the footer: Cancel and Open, both drawn, neither doing anything — the
      // step is mandatory and a tile is the press
      px(ctx, x + 1, y + h - 32, w - 2, 1, WEB.cardEdge);
      webButton(ctx, x + w - 156, y + h - 27, F.cancel, 'quiet', 64);
      webButton(ctx, x + w - 84, y + h - 27, 'Open', 'disabled', 70);
      return;
    }
    if (this.picker === 'folder') {
      // ⚑ inside the folder (2026-09-13): the same window, one level down —
      //   her Pride photographs, three of them, and any one is the press
      const w = Math.min(420, cw - 40), h = ch - 60;
      const x = cx + Math.round((cw - w) / 2), y = top + 46;
      ctx.save(); ctx.globalAlpha = 0.35; px(ctx, cx, top, cw, ch, WEB.ink); ctx.restore();
      roundRect(ctx, x, y + 2, w, h, 8, WEB.faint);
      roundEdge(ctx, x, y, w, h, 8, WEB.cardEdge, WEB.card);
      setFont(ctx, 10);
      ctx.fillStyle = WEB.ink;
      ctx.fillText(F.title, x + 14, y + 8);
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
      ctx.fillStyle = WEB.faint;
      ctx.fillText('Search', x + sbw + 24, y + 27);
      ctx.fillStyle = WEB.accentInk;
      ctx.fillText(F.back, x + sbw + 12, y + 44);
      this.publish({ x: x + sbw + 8, y: y + 40, w: 60, h: 14, id: 'file-back' });
      ctx.fillStyle = WEB.muted;
      const folder = (F.items as FileItem[]).find((i) => i.kind === 'folder');
      const crumb = `${F.path}  ›  ${folder?.name ?? ''}`;
      ctx.fillText(crumb, x + sbw + 12 + 52, y + 44);
      const tw = 78, th = 48, gx = x + sbw + 12, gy = y + 56;
      (F.folderItems as FileItem[]).forEach((it, k) => {
        const tx = gx + (k % 4) * (tw + 8), ty = gy;
        thumb(ctx, tx, ty, tw, th, k === 0 ? 2 : 3, false);
        setFont(ctx, 8);
        ctx.fillStyle = WEB.ink;
        ctx.save(); ctx.beginPath(); ctx.rect(tx, ty + th, tw, 12); ctx.clip();
        ctx.fillText(it.name, tx, ty + th + 4); ctx.restore();
        ctx.fillStyle = WEB.muted;
        ctx.fillText(it.meta, tx, ty + th + 14);
        this.publish({ x: tx, y: ty, w: tw, h: th + 24, id: `file-${k}` });
      });
      px(ctx, x + 1, y + h - 32, w - 2, 1, WEB.cardEdge);
      webButton(ctx, x + w - 156, y + h - 27, F.cancel, 'quiet', 64);
      webButton(ctx, x + w - 84, y + h - 27, 'Open', 'disabled', 70);
      return;
    }
    if (this.picker === 'restoring') {
      const k = Math.min(1, this.pickerT / F.restoringSeconds);
      thumb(ctx, cx + 16, by, 120, 74, 3, false);
      setFont(ctx, 11);
      ctx.fillStyle = WEB.ink;
      ctx.fillText(F.restoring, cx + 150, by + 2);
      progressBar(ctx, cx + 150, by + 20, cw - 170, k, this.pickerT);
      const stages = F.stages as string[];
      stages.forEach((st, n) => {
        const on = k >= (n + 0.5) / stages.length, cur = !on && k >= n / stages.length;
        roundRect(ctx, cx + 150, by + 36 + n * 14, 8, 8, 4, on ? WEB.accent : cur ? WEB.primary : WEB.chip);
        setFont(ctx, 9);
        ctx.fillStyle = on ? WEB.muted : cur ? WEB.ink : WEB.faint;
        ctx.fillText(st, cx + 164, by + 34 + n * 14);
      });
      return;
    }
    // the result: the comparison with its handle, the chips, and the save line
    // ⚑ a photograph's own proportions, and the handle THROUGH the figure —
    //   at the card's full width the split fell beside her and neither half
    //   showed the change (measured on the first plate). The figure stands at
    //   0.56 of the frame; the split sits at 0.62 so both halves carry her.
    const ph = Math.min(ch - 100, 176), pw = Math.round(ph * 1.6);
    const px0 = cx + 16;
    compareSplit(ctx, px0, by, pw, ph,
      (c) => thumb(c, px0, by, pw, ph, 3, false, 6),
      (c) => thumb(c, px0, by, pw, ph, 3, true, 6),
      0.5, F.before, F.after);   // ⚑ 2026-09-13: through the middle of the face, now that it is a portrait
    // beside it: what was adjusted, and the save
    const rx = px0 + pw + 16;
    setFont(ctx, 9);
    ctx.fillStyle = WEB.muted;
    ctx.fillText('Adjusted', rx, by + 2);
    let cy = by + 16;
    for (const a of F.adjusted as string[]) {
      cy = chipRow(ctx, rx, cy, [a], [true]) > 0 ? cy + 20 : cy;
    }
    webButton(ctx, rx, cy + 4, F.savedButton, 'disabled', 96);
    setFont(ctx, 8);
    ctx.fillStyle = WEB.muted;
    const savedLine = F.saved.replace('{name}', this.chosenFile || 'IMG_2211');
    for (const row of wrapText(ctx, savedLine, cw - (rx - cx) - 16).slice(0, 3)) { ctx.fillText(row, rx, cy + 32); cy += 10; }
  }

  /**
   * ⚑ THE PAGE AFTER THE FAILURE (2026-09-13). The device has stopped; the
   * browser's step five was still asking her to put it on. Now the agent's
   * page cannot be reached: a browser's own error page in the kit's register,
   * the step marked failed, and the machine's flat sentence about who ended
   * what. Nothing is pressable — `handleClick` eats presses in this phase.
   */
  private drawFailed(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const FD = PROGRAM.failed;
    if (this.failT >= FAIL.off) { px(ctx, 0, 0, W, H, ERA4.field); return; }   // off
    const top = ADDR.y + ADDR.h + 6;
    px(ctx, 0, top, W, H_PAGE, WEB.bg);
    // the step bar, as it was, with the last segment failed
    px(ctx, 0, top, W, 44, WEB.card);
    px(ctx, 0, top + 43, W, 1, WEB.cardEdge);
    const segW = 26, segX = ADDR.x + 8;
    PROGRAM.steps.forEach((_x, k) => {
      const last = k === PROGRAM.steps.length - 1;
      pill(ctx, segX + k * (segW + 3), top + 8, segW, 4, last ? WEB.faint : WEB.accent);
    });
    setFont(ctx, 8);
    ctx.fillStyle = WEB.muted;
    ctx.fillText(PROGRAM.stepLabel.replace('{n}', String(PROGRAM.steps.length)) + '  ·  ' + PROGRAM.agentMark, segX, top + 16);
    setFont(ctx, 12);
    ctx.fillStyle = WEB.ink;
    ctx.fillText(FD.step, segX, top + 27);
    // the error page
    const cx = ADDR.x + 8, cw = W - ADDR.x * 2 - 16, cy = top + 54;
    webCard(ctx, cx, cy, cw, H - cy - 14);
    avatar(ctx, cx + 12, cy + 10, 22, WEB.faint, 'S');
    setFont(ctx, 11);
    ctx.fillStyle = WEB.muted;
    ctx.fillText(PROGRAM.agentMark, cx + 42, cy + 11);
    setFont(ctx, 8);
    px(ctx, cx + 42, cy + 26, 5, 5, WEB.faint);
    ctx.fillText(FD.status, cx + 50, cy + 23);
    px(ctx, cx + 1, cy + 40, cw - 2, 1, WEB.cardEdge);
    // the glyph a browser draws when there is nothing to draw
    roundEdge(ctx, cx + 44, cy + 62, 34, 26, 4, WEB.faint, WEB.bg);
    px(ctx, cx + 52, cy + 70, 18, 2, WEB.faint);
    px(ctx, cx + 52, cy + 76, 12, 2, WEB.faint);
    // ⚑ the sentence — the same one the laptop carries (updates.json close.restarting):
    //   "the message spreads on both monitors" (Sérgio, 2026-09-13)
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
    let y = top + 62;
    for (const r of body.record.rows as Array<{ k: string; v: string; note: string; locked?: boolean }>) {
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
    if (!this.requested && this.mode !== 'program') this.publish({ ...r, id: 'record-request' });
    setFont(ctx, 8);
    ctx.fillStyle = WEB.muted;
    ctx.fillText(body.record.priorRequest, cx + 16, y + 28);
  }

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
      if (!done && this.mode !== 'program') {
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
    ctx.fillText(body.care.invite.when, lx + 18, y + 13);
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

  /** the library: the original, and the one she never made, with its date. */
  private drawPhotos(ctx: CanvasRenderingContext2D, W: number, H: number): void {
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
    if (this.phase === 'handed') return false;
    if (this.phase === 'failed') return true;   // a dead page takes presses and does nothing
    if (this.phase !== 'open') return true;   // the restore takes presses and eats them
    if (this.mode === 'typing') return true;  // the engine is busy finishing her sentence
    const hit = this.hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (hit) {
      // ── the takeover ──
      if (this.mode === 'free' && (hit.id === 'search-open' || hit.id === 'tab0')) {
        if (this.live !== 0) { this.openTab(0); }
        this.mode = 'typing'; this.typeT = 0; this.live = 0; this.version++;
        return true;
      }
      if (hit.id === 'agent-begin' && this.mode === 'agent') {
        this.mode = 'program'; this.step = 0;
        this.live = this.stepTab(PROGRAM.steps[0].id);
        ledger.e4Space.push({ id: 'program', outcome: 'begun', witness: PROGRAM.beginWitness });
        this.version++;
        return true;
      }
      // ── the steps ──
      if (this.mode === 'program') {
        if (hit.id.startsWith('step-')) {
          const st = PROGRAM.steps[this.step];
          if (st && hit.id === `step-${st.id}`) {
            if (st.id === 'photos') { this.picker = 'open'; this.version++; return true; }
            if (st.id === 'record') this.requested = true;
            this.completeStep();
          }
          return true;
        }
        if (hit.id.startsWith('file-') && (this.picker === 'open' || this.picker === 'folder')) {
          const k = Number(hit.id.slice(5));
          const list = (this.picker === 'folder' ? PROGRAM.files.folderItems : PROGRAM.files.items) as FileItem[];
          const it = list[k];
          // ⚑ 2026-09-13: a folder OPENS; a photograph is what the tool takes
          if (it && it.kind === 'folder') { this.picker = 'folder'; this.version++; return true; }
          this.chosenFile = it ? it.name.replace(/\.jpg$/i, '') : 'IMG_2211';
          this.picker = 'restoring'; this.pickerT = 0; this.version++;
          return true;
        }
        if (hit.id === 'file-back' && this.picker === 'folder') { this.picker = 'open'; this.version++; return true; }
        if (hit.id.startsWith('tab')) {
          const i = Number(hit.id.slice(3));
          // only a finished step or the live one; a locked tab published no rect
          if (Number.isFinite(i) && TABS[i]) { this.live = i; this.version++; }
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

  /** review only: land on a tab, or on the settled browser. */
  debugJumpTo(where: string): void {
    this.settleT = 0;
    this.phase = 'open';
    this.t = 0;
    this.filed = true;
    const i = TABS.findIndex(t => t.id === where);
    this.live = i >= 0 ? i : 0;
    this.version++;
  }
}
