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
import { browserChrome, restoring, photograph, CHROME, ADDR } from '../theme/era4';
import { ledger } from '../../state/ledger';
import script from '../../../data/dialog/s4_boot.json';
import body from '../../../data/dialog/s4_browser.json';

/** ⚑ the five tabs she left plus the one she did not. Only `search` draws a
 *  page in S123; the rest are the next sessions' work and are deliberately
 *  declared here so the chrome is honest about what the era will contain. */
type TabId = 'search' | 'chat' | 'record' | 'photos' | 'care' | 'extra';
interface Tab { id: TabId; mark: string; title: string; notHers?: boolean }
const TABS = script.tabs as unknown as Tab[];

/** under four seconds. E2's splash is 23.7 because 2003 made you watch it. */
const RESTORE_SECONDS = 2.4;
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
  private phase: 'restoring' | 'open' | 'handed' = 'restoring';
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
    this.t += dt;
    if (this.phase === 'restoring') {
      // ⚑ the whole boot is a clock and a line. Nothing is pressable during it,
      // and nothing can be skipped — the same ruling E2's splash got.
      if (this.t >= RESTORE_SECONDS + (TABS.length - 1) * TAB_GAP + EXTRA_GAP) {
        this.phase = 'open';
        this.t = 0;
        this.file();
      }
      this.version++;
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
    const since = this.t - RESTORE_SECONDS;
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

    if (this.phase === 'restoring' && back <= 0) {
      restoring(ctx, W, H, script.boot.restoring, this.t / RESTORE_SECONDS);
      return;
    }

    px(ctx, 0, 0, W, H, CHROME.page);
    const shown = TABS.slice(0, back);
    const addr = this.phase === 'open' ? script.search.typed : '';
    const blink = this.phase === 'open' && this.pressable && Math.floor(this.t / CURSOR_BLINK) % 2 === 0;
    const rects = browserChrome(ctx, W, shown, this.live, addr, blink);
    rects.forEach((r, i) => this.publish({ ...r, id: `tab${i}` }));

    if (this.phase !== 'open') {
      // still coming back: the page under the chrome is empty and stays empty
      setFont(ctx, 9);
      ctx.fillStyle = CHROME.hint;
      ctx.fillText(script.boot.restoring, ADDR.x + 2, ADDR.y + ADDR.h + 12);
      return;
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
  }

  /** ⚑ the transcript — fourteen months, read backwards. Her side of every
   *  exchange sits above the row it was chosen from, the unpicked options still
   *  greyed beside it. Nothing remarks on that. */
  private drawChat(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const top = ADDR.y + ADDR.h + 12;
    px(ctx, ADDR.x, top, W - ADDR.x * 2, H - top - 8, CHROME.field);
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

  /** the record as an account page: one field greyed, and a button that works
   *  and changes nothing. */
  private drawRecord(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const top = ADDR.y + ADDR.h + 12;
    px(ctx, ADDR.x, top, W - ADDR.x * 2, H - top - 8, CHROME.field);
    setFont(ctx, 11);
    ctx.fillStyle = CHROME.ink;
    ctx.fillText(body.record.title, ADDR.x + 14, top + 10);
    let y = top + 32;
    for (const r of body.record.rows as Array<{ k: string; v: string; note: string; locked?: boolean }>) {
      setFont(ctx, 9);
      ctx.fillStyle = CHROME.hint;
      ctx.fillText(r.k, ADDR.x + 14, y);
      setFont(ctx, 10);
      ctx.fillStyle = r.locked ? CHROME.hint : CHROME.ink;
      ctx.fillText(r.v, ADDR.x + 120, y - 1);
      if (r.note) {
        setFont(ctx, 8);
        ctx.fillStyle = CHROME.hint;
        ctx.fillText(r.note, ADDR.x + 190, y);
      }
      y += 18;
    }
    y += 6;
    const label = this.requested ? body.record.acted : body.record.action;
    setFont(ctx, 9);
    const bw = Math.ceil(ctx.measureText(label).width) + 20;
    px(ctx, ADDR.x + 14, y, bw, 16, this.requested ? CHROME.bar : CHROME.tabLive);
    ctx.fillStyle = this.requested ? CHROME.hint : CHROME.ink;
    ctx.fillText(label, ADDR.x + 24, y + 3);
    if (!this.requested) this.publish({ x: ADDR.x + 14, y, w: bw, h: 16, id: 'record-request' });
    setFont(ctx, 8);
    ctx.fillStyle = CHROME.hint;
    ctx.fillText(body.record.priorRequest, ADDR.x + 14, y + 22);
  }

  /** four things already done for her, each defensible, each with a working
   *  undo — and one muted contact that is the way into the ball. */
  private drawCare(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const top = ADDR.y + ADDR.h + 12;
    px(ctx, ADDR.x, top, W - ADDR.x * 2, H - top - 8, CHROME.field);
    setFont(ctx, 9);
    ctx.fillStyle = CHROME.hint;
    ctx.fillText(body.care.intro, ADDR.x + 14, top + 8);
    let y = top + 26;
    const items = body.care.items as Array<{ what: string; when: string; why: string; undo: string }>;
    items.forEach((it, i) => {
      const done = this.undone.has(i);
      setFont(ctx, 10);
      ctx.fillStyle = done ? CHROME.hint : CHROME.ink;
      ctx.fillText(it.what, ADDR.x + 14, y);
      setFont(ctx, 8);
      ctx.fillStyle = CHROME.hint;
      ctx.fillText(`${it.when} · ${it.why}`, ADDR.x + 14, y + 13);
      if (!done) {
        const w = Math.ceil(ctx.measureText(it.undo).width) + 14;
        const bx = W - ADDR.x - 14 - w;
        px(ctx, bx, y - 2, w, 14, CHROME.tabLive);
        ctx.fillStyle = CHROME.ink;
        ctx.fillText(it.undo, bx + 7, y + 1);
        this.publish({ x: bx, y: y - 2, w, h: 14, id: `care${i}` });
      }
      y += 30;
    });
    // ⚑ the invitation, sitting inside the muted list where it has been for six weeks
    setFont(ctx, 9);
    ctx.fillStyle = CHROME.ink;
    ctx.fillText(`${body.care.invite.from} — "${body.care.invite.text}"`, ADDR.x + 14, y);
    setFont(ctx, 8);
    ctx.fillStyle = CHROME.hint;
    ctx.fillText(body.care.invite.when, ADDR.x + 14, y + 12);
    setFont(ctx, 8);
    ctx.fillStyle = CHROME.hint;
    ctx.fillText(body.care.footer, ADDR.x + 14, H - 18);
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
    photograph(ctx, ADDR.x + 14, top + 24, 150, 93, this.enhanced, 0);
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
    if (this.phase !== 'open') return true;   // the restore takes presses and eats them
    const hit = this.hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (hit) {
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
    this.phase = 'handed';
    this.version++;
    return false;
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
