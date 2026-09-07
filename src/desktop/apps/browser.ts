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
import { px, setFont } from '../theme/chrome';
import { browserChrome, restoring, CHROME, ADDR } from '../theme/era4';
import { ledger } from '../../state/ledger';
import script from '../../../data/dialog/s4_boot.json';

/** ⚑ the five tabs she left plus the one she did not. Only `search` draws a
 *  page in S123; the rest are the next sessions' work and are deliberately
 *  declared here so the chrome is honest about what the era will contain. */
type TabId = 'search' | 'chat' | 'record' | 'photos' | 'care' | 'extra';
interface Tab { id: TabId; mark: string; title: string; notHers?: boolean }
const TABS = script.tabs as unknown as Tab[];

/** under four seconds. E2's splash is 23.7 because 2003 made you watch it. */
const RESTORE_SECONDS = 2.4;
/** the tabs come back one at a time as the restore completes — the last one
 *  lands after the others and nothing marks it. */
const TAB_GAP = 0.22;
const CURSOR_BLINK = 0.53;

export interface Hit { x: number; y: number; w: number; h: number; id: string }

export class E4Browser {
  private phase: 'restoring' | 'open' | 'handed' = 'restoring';
  private t = 0;
  private live = 0;
  private hits: Hit[] = [];
  private filed = false;
  version = 0;

  get stageId(): string { return this.phase; }
  get liveTab(): TabId { return TABS[this.live]?.id ?? 'search'; }

  update(dt: number): void {
    this.t += dt;
    if (this.phase === 'restoring') {
      // ⚑ the whole boot is a clock and a line. Nothing is pressable during it,
      // and nothing can be skipped — the same ruling E2's splash got.
      if (this.t >= RESTORE_SECONDS + TABS.length * TAB_GAP) {
        this.phase = 'open';
        this.t = 0;
        this.file();
      }
      this.version++;
      return;
    }
    // the address bar's cursor is the only thing that moves on a settled page
    if (Math.floor(this.t / CURSOR_BLINK) !== Math.floor((this.t - dt) / CURSOR_BLINK)) {
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
    return Math.max(0, Math.min(TABS.length, Math.floor((this.t - RESTORE_SECONDS) / TAB_GAP) + 1));
  }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.hits = [];
    const back = this.tabsBack();

    if (this.phase === 'restoring' && back <= 0) {
      restoring(ctx, W, H, script.boot.restoring, this.t / RESTORE_SECONDS);
      return;
    }

    px(ctx, 0, 0, W, H, CHROME.page);
    const shown = TABS.slice(0, back);
    const addr = this.phase === 'open' ? script.search.typed : '';
    const blink = this.phase === 'open' && Math.floor(this.t / CURSOR_BLINK) % 2 === 0;
    const rects = browserChrome(ctx, W, shown, this.live, addr, blink);
    rects.forEach((r, i) => this.hits.push({ ...r, id: `tab${i}` }));

    if (this.phase !== 'open') {
      // still coming back: the page under the chrome is empty and stays empty
      setFont(ctx, 9);
      ctx.fillStyle = CHROME.hint;
      ctx.fillText(script.boot.restoring, ADDR.x + 2, ADDR.y + ADDR.h + 12);
      return;
    }
    if (this.liveTab === 'search') this.drawSearch(ctx, W);
    else this.drawStub(ctx, W, H);
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
  }

  /** the four tabs S123 does not build yet. It says so, in the machine's own
   *  flattest voice, rather than drawing a blank page a reviewer would file as
   *  a bug. ⚑ Delete this the session each tab lands. */
  private drawStub(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const top = ADDR.y + ADDR.h + 10;
    px(ctx, ADDR.x, top, W - ADDR.x * 2, H - top - 6, CHROME.field);
    setFont(ctx, 9);
    ctx.fillStyle = CHROME.hint;
    ctx.fillText('not built yet — S123 is the boot and the chrome', ADDR.x + 10, top + 10);
  }

  /**
   * ⚑ A TAB TAKES THE PRESS; ANYTHING ELSE HANDS THE LID OVER.
   *
   * This is the S123 seam and it is deliberately blunt, because the alternative
   * shipped a dead era. The browser draws over the whole lid, so while it owned
   * every press the laptop beat's own three lines could never begin — L never
   * spoke, the headset never lit, and Era 4 had no way to start. Caught by
   * reading this file's own wiring, not by a walk, and it would have been a
   * reachability regression of exactly the class `00_WHERE_THINGS_STAND` trap 0
   * describes: a fix opening the hole it is closing.
   *
   * So: press a tab and you read a tab, as long as you like. Press the page and
   * the browser stands down for good and the era proceeds as it does today.
   * ⚑ INTERIM. Under E+B the tabs ARE the era and there is no handing over —
   * the laptop's three lines are one of the things that build deletes. Until
   * then this keeps the piece playable end to end, which is the standing rule.
   */
  handleClick(x: number, y: number): boolean {
    if (this.phase === 'handed') return false;
    if (this.phase !== 'open') return true;   // the restore takes presses and eats them
    const hit = this.hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (hit) {
      const i = Number(hit.id.slice(3));
      if (Number.isFinite(i) && TABS[i]) { this.live = i; this.version++; return true; }
    }
    this.phase = 'handed';
    this.version++;
    return false;
  }

  /** the room's coordinate-less press, and the debug panel's own exit. */
  handOverLid(): void { this.phase = 'handed'; this.version++; }

  /** review only: land on a tab, or on the settled browser. */
  debugJumpTo(where: string): void {
    this.phase = 'open';
    this.t = 0;
    this.filed = true;
    const i = TABS.findIndex(t => t.id === where);
    this.live = i >= 0 ? i : 0;
    this.version++;
  }
}
