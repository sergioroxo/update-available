/**
 * UN-WALK — the Starter Kit's programme (S1.2–S1.4, register: operable), and
 * since S151 (2026-09-20) THE ERA'S PROGRAMME: a Win95 wizard whose First
 * Steps page is the spine of 1997 — five steps, each a press that opens its own
 * panel and ticks off when done, in order (read · pray · connect · form ·
 * journal). Sérgio's reference is `References images/for the Era-1 programs.png`
 * (R3-15): a picture panel on the left, a bold title, plain text, Back / Next /
 * Cancel. He found the old booklet "a box with white background, empty" and
 * asked what the person was supposed to DO on each page (R3-16/19/22) — so
 * every page here either asks for one press or says what it is waiting on.
 *
 *   read    → two pages of the programme's own text; Done ticks it
 *   pray    → the companion tape plays (from here, or from the shelf); the
 *             sung words appear from data/dialog/s1_prayer.json, highlighted as
 *             they are sung (R3-21/22: Whisper timings, authored text); one
 *             press at the end — Amen
 *   connect → the Internet Setup Wizard on the black screen (R3-24): welcome,
 *             the number, connecting — the dial-up sound, then the channel
 *   form    → opens only once Rob has "spoken with your mother" (R3-13); the
 *             Family Form on the desktop
 *   journal → after the placement letter; DIARY.TXT
 *
 * All wording in data/dialog/s1_kit.json. BACK is drawn dead on every page
 * (R26: the path only runs forward). Cancel MINIMISES — the wizard keeps its
 * state and comes back from the A:\ icon or the taskbar (W-E2, for this window).
 *
 * The prayer needs the room: the OS hands this class a `tapeProbe` (what the
 * boombox is doing) and an `onPlayTape` (press play on Tape A) — both wired in
 * src/engine/app.ts, so the tape system stays the one clock and the shelf's
 * own press does exactly what the button does.
 */
import { ERA1, ERA1_CANVAS } from '../theme/era1';
import * as ui from '../theme/chrome';
import { ledger } from '../../state/ledger';
import kit from '../../../data/dialog/s1_kit.json';
import prayer from '../../../data/dialog/s1_prayer.json';
import tapesData from '../../../data/dialog/s1_tapes.json';

type KitPhase = 'autorun' | 'wizard' | 'setup';
type Panel = 'welcome' | 'steps' | 'read' | 'pray' | 'pledge' | 'connect' | 'form' | 'diary';
type SetupPage = 'welcome' | 'number' | 'connecting';
export type StepId = 'read' | 'pray' | 'pledge' | 'connect' | 'form' | 'diary';

/** same shape every other surface in the build publishes (provotype.ts, os.ts,
 *  graceQueueLite.ts, phoneE3.ts) — built while drawing, tested on click */
interface Hit { x: number; y: number; w: number; h: number; id: string }

/** what the boombox is doing, read each frame (src/narrative/tapes.ts snapshot) */
export interface TapeProbe { inserted: string | null; playing: boolean; elapsed: number }

const AUTORUN_SECONDS = 2.6;
/** the connecting page: the dial-up recording is 7.4 s; the channel opens after it */
const DIAL_SECONDS = 8.0;
const DIAL_LINE_EVERY = 1.9;
/** tape-time second at which the prayer's recording begins on Tape A */
export const PRAYER_AT = (tapesData as unknown as { tapes: { id: string; segments: { id: string; at: number }[] }[] })
  .tapes.find((t) => t.id === 'tapeA')!.segments.find((s) => s.id === 'a-prayer-01')!.at;
export const PRAYER_LEN = prayer.durationSec;
/** the recording's second at which the first chorus has been sung — from there Amen is offered.
 *  Sérgio (2026-09-20): a sixteen-year-old with a two-minute hymn on a cassette FAST-FORWARDED
 *  it; the one act a person had here was to stop, and the record notices which they did. */
const AMEN_FROM = (prayer.lines as { w: string; s: number; e: number }[][])[7].slice(-1)[0].e;

/** a line cut to a width, with the era's own three dots */
function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let out = text;
  while (out.length > 3 && ctx.measureText(`${out}...`).width > maxW) out = out.slice(0, -1);
  return `${out}...`;
}

const W = ERA1_CANVAS.width;
const DW = 430; const DH = 330; const DX = Math.round((W - DW) / 2); const DY = 18;
const PIC_W = 112;

export class KitApp {
  open = true;
  dirty = true;
  /** fires when the dial sequence completes — the OS opens the channel */
  onConnect?: () => void;
  /** fires as the connecting page opens — the OS plays the dial-up */
  onDial?: () => void;
  /** press play on the companion tape (app.ts: Tape A into the boombox) */
  onPlayTape?: () => void;
  /** …and stop it: Amen before the end takes the tape off (app.ts: eject) */
  onStopTape?: () => void;
  /** ⚑ W1-C3 (walkthrough 1: "the Un-Walk's Cancel button broke the system") — Cancel is the OS's own minimise,
   *  so the wizard keeps its taskbar button like every other window and the guide knows it was set aside;
   *  before this it only shut `open`, and the person was left on a bare desktop with a small disk icon */
  onCancel?: () => void;
  /** the fourth and fifth steps open desktop surfaces the OS owns */
  onOpenForm?: () => void;
  onOpenDiary?: () => void;
  /** the boombox, read each frame — set by app.ts; null means no room */
  tapeProbe: (() => TapeProbe) | null = null;
  /** R3-13: the Family Form exists only after Rob's "I spoke with your mother" */
  formAvailable: () => boolean = () => false;
  /** the journal exists after the placement letter */
  diaryAvailable: () => boolean = () => false;

  private phase: KitPhase = 'autorun';
  private panel: Panel = 'welcome';
  private setupPage: SetupPage = 'welcome';
  private t = 0;
  private readPage = 0;
  private readDone = false;
  private prayerDone = false;
  /** the prayer has been heard to its end at least once (live, or on the ledger) */
  private prayerHeard = false;
  /** the tape was playing the prayer and stopped before its end */
  private prayerStopped = false;
  private connected = false;
  private hits: Hit[] = [];

  // ── read-only state for the guide thread and the map ──
  get reading(): boolean { return this.phase === 'wizard' && this.open; }
  get dialing(): boolean { return this.phase === 'setup'; }
  get stepsShown(): boolean { return this.phase === 'wizard' && this.panel === 'steps'; }
  get onPrayerPage(): boolean { return this.phase === 'wizard' && this.panel === 'pray'; }
  get onConnectPage(): boolean { return this.phase === 'wizard' && this.panel === 'connect'; }
  get hasRead(): boolean { return this.readDone; }
  get hasPrayed(): boolean { return this.prayerDone; }
  /** the step the programme is waiting on, or null when every step is done */
  get currentStep(): StepId | null {
    for (const s of this.stepIds()) if (!this.stepDone(s)) return s;
    return null;
  }

  private stepIds(): StepId[] { return kit.steps.items.map((i) => i.id as StepId); }

  stepDone(id: StepId): boolean {
    switch (id) {
      case 'read': return this.readDone;
      case 'pray': return this.prayerDone;
      case 'pledge': return ledger.records.includes('pledge-signed') || ledger.records.includes('pledge-declined');
      case 'connect': return this.connected || ledger.records.includes('went-online');
      case 'form': return ledger.provotypes.some((p) => p.id === 'origin_intake_e1');
      case 'diary': return ledger.records.includes('diary-glitch');
    }
  }

  /** a step can be pressed when the one before it is done and the world has it */
  private stepAvailable(id: StepId): boolean {
    const ids = this.stepIds();
    const i = ids.indexOf(id);
    if (i > 0 && !this.stepDone(ids[i - 1])) return false;
    if (id === 'form') return this.formAvailable();
    if (id === 'diary') return this.diaryAvailable();
    return true;
  }

  update(dt: number): void {
    this.t += dt;
    if (this.phase === 'autorun' && this.t >= AUTORUN_SECONDS) {
      this.phase = 'wizard';
      this.t = 0;
    }
    if (this.phase === 'setup' && this.setupPage === 'connecting' && this.t >= DIAL_SECONDS && !this.connected) {
      this.connected = true;
      this.phase = 'wizard';
      this.panel = 'steps';
      this.open = false;   // the channel takes the screen; the programme waits in the taskbar
      this.onConnect?.();
    }
    // the prayer, heard: live from the boombox, or already on the ledger
    const p = this.prayerProbe();
    if (p.state === 'ended') this.prayerHeard = true;
    if (p.state === 'stopped') this.prayerStopped = true;
    if (p.state === 'singing' || p.state === 'intro') this.prayerStopped = false;
    this.dirty = true;
  }

  /** where the prayer is, in the recording's own seconds */
  private prayerProbe(): { state: 'idle' | 'intro' | 'singing' | 'ended' | 'stopped'; songT: number } {
    if (this.prayerHeard || ledger.tapes.some((t) => t.id === 'tapeA' && t.outcome === 'playedThrough')) {
      const live = this.tapeProbe?.();
      if (live && live.inserted === 'tapeA' && live.playing) {
        const songT = live.elapsed - PRAYER_AT;
        return songT < 0 ? { state: 'intro', songT } : { state: 'singing', songT };
      }
      return { state: 'ended', songT: PRAYER_LEN };
    }
    const live = this.tapeProbe?.();
    if (!live || live.inserted !== 'tapeA') {
      return { state: this.prayerStopped ? 'stopped' : 'idle', songT: 0 };
    }
    const songT = live.elapsed - PRAYER_AT;
    // ⚑ S219 — the end is asked BEFORE "not playing": the computer's prayer (W1-C4) stops by itself at its end,
    //   and a finished prayer read as "stopped" offered Play again forever (the walk looped here)
    if (songT >= PRAYER_LEN - 0.5) return { state: 'ended', songT };
    if (!live.playing) return { state: 'stopped', songT };
    if (songT < 0) return { state: 'intro', songT };
    return { state: 'singing', songT };
  }

  /** Enter: the page's primary press */
  advance(): void {
    const primary = this.hits.find((h) => h.id !== 'cancel' && h.id !== 'back' && !h.id.startsWith('step:'));
    if (primary) this.press(primary.id);
    else if (this.panel === 'steps') {
      const cur = this.currentStep;
      if (cur && this.stepAvailable(cur)) this.press(`step:${cur}`);
    }
  }

  /** show the wizard again (the A:\ icon, the taskbar button) */
  restore(): void {
    this.open = true;
    this.dirty = true;
  }

  // ── drawing ──────────────────────────────────────────────────────────────
  draw(ctx: CanvasRenderingContext2D): void {
    this.hits = [];
    if (this.phase === 'setup') { this.drawSetup(ctx); return; }

    const c = ui.windowFrame(ctx, DX, DY, DW, DH, kit.windowTitle, true, 'kit');
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.beige);
    this.hits.push({ ...c.closeBox, id: 'cancel' });

    if (this.phase === 'autorun') {
      ui.px(ctx, c.x + 8, c.y + 8, c.w - 16, c.h - 16, ERA1.black);
      ui.setFont(ctx, 10);
      ctx.fillStyle = ERA1.silver;
      const shown = Math.min(kit.autorun.length, 1 + Math.floor(this.t / 0.5));
      for (let i = 0; i < shown; i++) ctx.fillText(kit.autorun[i], c.x + 16, c.y + 16 + i * 14);
      return;
    }

    // the picture panel — the wizard's left third, a period illustration
    this.drawPicture(ctx, c.x + 8, c.y + 8, PIC_W, c.h - 52);
    const tx = c.x + 8 + PIC_W + 14;
    const tw = c.w - 8 - PIC_W - 14 - 12;
    const ty = c.y + 10;
    switch (this.panel) {
      case 'welcome': this.drawTextPage(ctx, tx, ty, tw, kit.welcome.title, kit.welcome.lines); break;
      case 'steps': this.drawSteps(ctx, tx, ty, tw, c); break;
      case 'read': {
        const p = kit.read.pages[this.readPage];
        this.drawTextPage(ctx, tx, ty, tw, p.title, p.lines);
        break;
      }
      case 'pray': this.drawPray(ctx, tx, ty, tw, c); break;
      case 'pledge': this.drawPledge(ctx, tx, ty, tw, c); break;
      case 'connect': this.drawTextPage(ctx, tx, ty, tw, kit.connect.title, kit.connect.lines); break;
      case 'form': this.drawTextPage(ctx, tx, ty, tw, kit.form.title, kit.form.lines); break;
      case 'diary': this.drawTextPage(ctx, tx, ty, tw, kit.diary.title, kit.diary.lines); break;
    }
    this.drawButtonRow(ctx, c);
  }

  private drawTextPage(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, title: string, lines: string[]): void {
    ui.setFont(ctx, 14);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(title, x, y);
    ui.setFont(ctx, 10);
    lines.forEach((line, i) => {
      ctx.fillStyle = ERA1.black;
      ctx.fillText(line, x, y + 30 + i * 14);
    });
    void w;
  }

  /** the etched rule and Back / Next / Cancel, as the reference has them */
  private drawButtonRow(ctx: CanvasRenderingContext2D, c: ui.ContentRect): void {
    const ry = c.y + c.h - 36;
    ui.px(ctx, c.x + 8, ry, c.w - 16, 1, ERA1.grey);
    ui.px(ctx, c.x + 8, ry + 1, c.w - 16, 1, ERA1.white);
    const by = c.y + c.h - 28; const bw = 68; const bh = 20;
    // ⚑ Phase 7 (his: "Play the tape button: the text flows over") — the middle button is as wide as
    //   its word: "Play the tape", "Open DIARY.TXT", "Connect now" ran past a 68 px button
    const primary = this.primaryButton();
    ui.setFont(ctx, 10);
    const pw = primary ? Math.max(bw, Math.ceil(ctx.measureText(primary.label).width) + 16) : bw;
    const x3 = c.x + c.w - 8 - bw; const x2 = x3 - 6 - pw; const x1 = x2 - 2 - bw;
    // ⚑ BACK GETS NO HIT RECT, deliberately — it is drawn dead so the affordance
    // of return is SHOWN to be dead rather than hidden (R26, Sérgio).
    ui.button(ctx, x1, by, bw, bh, kit.buttons.back, { disabled: true });
    if (primary) {
      ui.button(ctx, x2, by, pw, bh, primary.label, { disabled: primary.disabled });
      if (!primary.disabled) this.hits.push({ x: x2, y: by, w: pw, h: bh, id: primary.id });
    }
    ui.button(ctx, x3, by, bw, bh, kit.buttons.cancel, {});
    this.hits.push({ x: x3, y: by, w: bw, h: bh, id: 'cancel' });
  }

  /** what the middle button says on this page — and whether it is live */
  private primaryButton(): { id: string; label: string; disabled: boolean } | null {
    switch (this.panel) {
      case 'welcome': return { id: 'next', label: kit.buttons.next, disabled: false };
      case 'steps': return this.currentStep === null
        ? { id: 'finish', label: kit.buttons.finish, disabled: false }
        : { id: 'next', label: kit.buttons.next, disabled: true };
      case 'read': return this.readPage < kit.read.pages.length - 1
        ? { id: 'next', label: kit.buttons.next, disabled: false }
        : { id: 'done', label: kit.buttons.done, disabled: false };
      case 'pray': {
        const p = this.prayerProbe();
        if (p.state === 'ended') return { id: 'amen', label: kit.pray.amen, disabled: false };
        // the first chorus sung: the press is offered, and taking it early is a choice the file keeps
        if (p.state === 'singing' && p.songT >= AMEN_FROM) return { id: 'amen', label: kit.pray.amen, disabled: false };
        if (p.state === 'idle' || p.state === 'stopped') return { id: 'play', label: p.state === 'stopped' ? kit.pray.again : kit.pray.play, disabled: false };
        return null;
      }
      case 'pledge': return { id: 'sign', label: kit.pledge.sign, disabled: false };
      case 'connect': return { id: 'connect', label: kit.connect.button, disabled: false };
      case 'form': return { id: 'open-form', label: kit.form.button, disabled: false };
      case 'diary': return { id: 'open-diary', label: kit.diary.button, disabled: false };
    }
  }

  /** the First Steps: the era's programme as a list of presses */
  private drawSteps(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, c: ui.ContentRect): void {
    ui.setFont(ctx, 14);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(kit.steps.title, x, y);
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(kit.steps.intro, x, y + 24);
    const cur = this.currentStep;
    kit.steps.items.forEach((item, i) => {
      const id = item.id as StepId;
      const ry = y + 44 + i * 36;
      const done = this.stepDone(id);
      const live = !done && this.stepAvailable(id);
      // the box
      ui.bevel(ctx, x, ry + 1, 12, 12, false);
      ui.px(ctx, x + 2, ry + 3, 8, 8, ERA1.white);
      if (done) {
        ui.px(ctx, x + 3, ry + 7, 2, 3, ERA1.black);
        ui.px(ctx, x + 5, ry + 8, 2, 2, ERA1.black);
        ui.px(ctx, x + 7, ry + 6, 2, 2, ERA1.black);
        ui.px(ctx, x + 9, ry + 4, 1, 2, ERA1.black);
      }
      ui.setFont(ctx, 11);
      ctx.fillStyle = done ? ERA1.greyDark : live ? ERA1.navy : ERA1.grey;
      ctx.fillText(`${i + 1}. ${item.label}`, x + 18, ry);
      ui.setFont(ctx, 9);
      ctx.fillStyle = done || live ? ERA1.greyDark : ERA1.grey;
      const note = done ? kit.steps.doneMark : live ? item.desc : ('after' in item && item.after ? item.after : item.desc);
      ctx.fillText(fit(ctx, note, w - 18), x + 18, ry + 15);
      if (live) {
        // the live row is a press, and the current one says so
        const r = { x: x - 4, y: ry - 4, w, h: 32 };
        if (id === cur) {
          ui.px(ctx, r.x, r.y, r.w, 1, ERA1.grey); ui.px(ctx, r.x, r.y + r.h - 1, r.w, 1, ERA1.white);
          ui.px(ctx, r.x, r.y, 1, r.h, ERA1.grey); ui.px(ctx, r.x + r.w - 1, r.y, 1, r.h, ERA1.white);
        }
        this.hits.push({ ...r, id: `step:${id}` });
      }
    });
    if (cur === null) {
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.ok;
      ctx.fillText(kit.steps.allDone, x, c.y + c.h - 52);
    }
  }

  /** the prayer: the tape, then its words as they are sung */
  /**
   * ⚑ S170 / I-03 — THE PLEDGE CARD (his research's 1990s form: the signed card).
   * The programme's own card, in the programme's own words, with the name typed
   * at the profile and nothing else; Sign is the row's button and "Not today"
   * sits on the card — both lead on, both are filed (the decline flagged), the
   * card is 'on file' either way, which is the satire and it is the programme's.
   */
  private drawPledge(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, c: ui.ContentRect): void {
    const P = kit.pledge;
    ui.setFont(ctx, 14);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(P.title, x, y);
    ui.setFont(ctx, 10);
    const answered = this.stepDone('pledge');
    if (answered) {
      const signed = ledger.records.includes('pledge-signed');
      ui.wrapText(ctx, signed ? P.signed : P.declined, w).forEach((ln, i) => ctx.fillText(ln, x, y + 30 + i * 14));
      return;
    }
    let row = 0;
    P.before.forEach((line) => ui.wrapText(ctx, line, w).forEach((ln) => { ctx.fillText(ln, x, y + 24 + row * 13); row++; }));
    // the card: paper, a rule, the lines with the name set in
    const cy = y + 24 + row * 13 + 8, ch = 92;
    ui.px(ctx, x, cy, w, ch, ERA1.paper);
    ui.px(ctx, x, cy, w, 1, ERA1.grey); ui.px(ctx, x, cy + ch - 1, w, 1, ERA1.grey);
    ui.px(ctx, x, cy, 1, ch, ERA1.grey); ui.px(ctx, x + w - 1, cy, 1, ch, ERA1.grey);
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.navy;
    ctx.fillText(P.cardTitle, x + 8, cy + 6);
    ui.px(ctx, x + 8, cy + 18, w - 16, 1, ERA1.grey);
    ctx.fillStyle = ERA1.black;
    const name = ledger.name && ledger.name !== '—' ? ledger.name : '________';
    P.cardLines.forEach((ln, i) => ctx.fillText(ln.replace('{name}', name), x + 8, cy + 24 + i * 12));
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(P.ring, x, cy + ch + 6);
    // "Not today" — on the card's own row, left of the wizard's buttons
    const bw = 68, bh = 20, bx = x, by = c.y + c.h - 28;
    ui.button(ctx, bx, by, bw, bh, P.later, {});
    this.hits.push({ x: bx, y: by, w: bw, h: bh, id: 'pledge-notnow' });
  }

  private drawPray(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, c: ui.ContentRect): void {
    ui.setFont(ctx, 14);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(kit.pray.title, x, y);
    const p = this.prayerProbe();
    ui.setFont(ctx, 10);
    if (p.state === 'idle' || p.state === 'stopped') {
      const lines = p.state === 'stopped' ? [kit.pray.stopped, '', ...kit.pray.before] : kit.pray.before;
      lines.forEach((line, i) => { ctx.fillStyle = ERA1.black; ctx.fillText(line, x, y + 30 + i * 14); });
      // S159 / R3-20 — the other tape, named as a thing that is there, not a thing to do
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.greyDark;
      ui.wrapText(ctx, kit.pray.aside, w).forEach((ln, i) => ctx.fillText(ln, x, y + 30 + (lines.length + 1) * 14 + i * 12));
      return;
    }
    if (p.state === 'intro') {
      ctx.fillStyle = ERA1.black;
      ctx.fillText(kit.pray.playing, x, y + 30);
      ctx.fillStyle = ERA1.greyDark;
      ctx.fillText(kit.pray.intro, x, y + 58);
      return;
    }
    // singing / ended: the words, a window of lines around the one being sung
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(p.state === 'ended' ? kit.pray.ended : p.songT >= AMEN_FROM ? kit.pray.mayStop : kit.pray.playing, x, y + 24);
    const lines = prayer.lines as { w: string; s: number; e: number }[][];
    const songT = p.state === 'ended' ? PRAYER_LEN + 1 : p.songT;
    let curLine = 0;
    lines.forEach((l, i) => { if (l[0].s <= songT) curLine = i; });
    const SHOW = 7; const LH = 14;
    const first = Math.max(0, Math.min(curLine - 2, lines.length - SHOW));
    const top = y + 46;
    const maxY = c.y + c.h - 44;
    ui.setFont(ctx, 10);
    for (let i = first; i < Math.min(lines.length, first + SHOW); i++) {
      const ly = top + (i - first) * LH;
      if (ly + LH > maxY) break;
      let lx = x;
      for (const word of lines[i]) {
        const sung = word.e <= songT;
        const now = word.s <= songT && songT < word.e;
        const ww = ctx.measureText(word.w).width;
        if (now) ui.px(ctx, lx - 1, ly - 1, ww + 2, 12, ERA1.tooltip);
        ctx.fillStyle = now ? ERA1.navy : sung ? ERA1.black : ERA1.grey;
        ctx.fillText(word.w, lx, ly);
        lx += ww + 4;
        if (lx > x + w) break;
      }
    }
  }

  /** R3-24 — the Internet Setup Wizard on the black screen */
  private drawSetup(ctx: CanvasRenderingContext2D): void {
    ui.px(ctx, 0, 0, W, ERA1_CANVAS.height, ERA1.black);
    const s = kit.setup;
    if (this.setupPage === 'connecting') {
      const dw = 300; const dh = 130;
      const dx = Math.round((W - dw) / 2); const dy = Math.round((ERA1_CANVAS.height - dh) / 2);
      const c = ui.windowFrame(ctx, dx, dy, dw, dh, s.connecting.title, true);
      ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.beige);
      this.drawModem(ctx, c.x + 10, c.y + 14);
      ui.setFont(ctx, 10);
      const shown = Math.min(s.connecting.lines.length, 1 + Math.floor(this.t / DIAL_LINE_EVERY));
      for (let i = 0; i < shown; i++) {
        ctx.fillStyle = i === shown - 1 ? ERA1.black : ERA1.greyDark;
        ctx.fillText(s.connecting.lines[i], c.x + 60, c.y + 14 + i * 16);
      }
      if (shown >= s.connecting.lines.length) {
        ctx.fillStyle = ERA1.navy;
        ctx.fillText(s.connecting.welcome, c.x + 60, c.y + 14 + shown * 16 + 6);
      }
      return;
    }
    const dw = 400; const dh = 300;
    const dx = Math.round((W - dw) / 2); const dy = Math.round((ERA1_CANVAS.height - dh) / 2);
    const c = ui.windowFrame(ctx, dx, dy, dw, dh, s.windowTitle, true, 'kit');
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.beige);
    this.hits.push({ ...c.closeBox, id: 'setup-cancel' });
    this.drawPicture(ctx, c.x + 8, c.y + 8, PIC_W, c.h - 52, true);
    const tx = c.x + 8 + PIC_W + 14; const ty = c.y + 10;
    if (this.setupPage === 'welcome') {
      this.drawTextPage(ctx, tx, ty, c.w - PIC_W - 40, s.welcome.title, s.welcome.lines);
    } else {
      ui.setFont(ctx, 10);
      ctx.fillStyle = ERA1.black;
      ctx.fillText(s.number.title, tx, ty);
      ui.wrapText(ctx, s.number.prompt, c.w - PIC_W - 40).forEach((line, i) => ctx.fillText(line, tx, ty + 24 + i * 14));
      ctx.fillText(s.number.areaLabel, tx, ty + 66);
      ctx.fillText(s.number.numberLabel, tx + 90, ty + 66);
      ui.inputField(ctx, tx, ty + 80, 60, 18, s.number.area, false);
      ctx.fillStyle = ERA1.black; ctx.fillText('-', tx + 72, ty + 84);
      ui.inputField(ctx, tx + 90, ty + 80, 130, 18, s.number.number, false);
      ctx.fillStyle = ERA1.black;
      ctx.fillText(s.number.countryLabel, tx, ty + 114);
      ui.inputField(ctx, tx, ty + 128, 220, 18, s.number.country, false);
    }
    // the row
    const ry = c.y + c.h - 36;
    ui.px(ctx, c.x + 8, ry, c.w - 16, 1, ERA1.grey);
    ui.px(ctx, c.x + 8, ry + 1, c.w - 16, 1, ERA1.white);
    const by = c.y + c.h - 28; const bw = 68; const bh = 20;
    const x3 = c.x + c.w - 8 - bw; const x2 = x3 - 6 - bw; const x1 = x2 - 2 - bw;
    ui.button(ctx, x1, by, bw, bh, kit.buttons.back, { disabled: true });
    ui.button(ctx, x2, by, bw, bh, kit.buttons.next, {});
    this.hits.push({ x: x2, y: by, w: bw, h: bh, id: 'setup-next' });
    ui.button(ctx, x3, by, bw, bh, kit.buttons.cancel, {});
    this.hits.push({ x: x3, y: by, w: bw, h: bh, id: 'setup-cancel' });
  }

  // ── the pictures: a period wizard's left panel, in the era's own sixteen colours ──
  private drawPicture(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, globe = false): void {
    ui.px(ctx, x, y, w, h, ERA1.teal);
    ui.px(ctx, x, y, w, 1, ERA1.tealDark); ui.px(ctx, x, y, 1, h, ERA1.tealDark);
    // the computer: a monitor on a case, a keyboard in front
    const mx = x + 24; const my = y + 22;
    ui.px(ctx, mx, my, 60, 46, ERA1.silver);
    ui.px(ctx, mx + 2, my + 2, 56, 42, ERA1.beige);
    ui.px(ctx, mx + 7, my + 6, 46, 32, ERA1.greyDark);
    ui.px(ctx, mx + 9, my + 8, 42, 28, globe ? ERA1.navy : ERA1.teal);
    ui.px(ctx, mx + 9, my + 8, 42, 4, ERA1.navy);
    ui.px(ctx, mx + 12, my + 15, 20, 2, ERA1.white); ui.px(ctx, mx + 12, my + 20, 30, 2, ERA1.white); ui.px(ctx, mx + 12, my + 25, 24, 2, ERA1.white);
    ui.px(ctx, mx + 22, my + 46, 16, 5, ERA1.grey);
    ui.px(ctx, mx + 12, my + 51, 36, 3, ERA1.silver);
    ui.px(ctx, mx - 2, my + 58, 64, 10, ERA1.beige); ui.px(ctx, mx - 2, my + 66, 64, 2, ERA1.grey);
    for (let i = 0; i < 8; i++) ui.px(ctx, mx + 2 + i * 7, my + 61, 4, 3, ERA1.greyDark);
    if (globe) {
      // the world it reaches: a globe below, and the dotted line down to it
      const gx = x + w / 2; const gy = y + h - 40;
      for (let i = 0; i < 6; i++) ui.px(ctx, mx + 30 - i * 2, my + 74 + i * 6, 2, 3, ERA1.tooltip);
      ui.px(ctx, gx - 22, gy - 22, 44, 44, ERA1.navy);
      ui.px(ctx, gx - 24, gy - 16, 48, 32, ERA1.navy);
      ui.px(ctx, gx - 16, gy - 24, 32, 48, ERA1.navy);
      ui.px(ctx, gx - 14, gy - 14, 12, 10, ERA1.ok); ui.px(ctx, gx - 4, gy - 4, 14, 8, ERA1.ok);
      ui.px(ctx, gx + 4, gy - 16, 10, 8, ERA1.ok); ui.px(ctx, gx - 12, gy + 6, 8, 10, ERA1.ok);
      ui.px(ctx, gx - 22, gy - 4, 6, 6, ERA1.white); ui.px(ctx, gx + 10, gy + 10, 8, 6, ERA1.white);
      return;
    }
    // the walk: a door, ajar, at the bottom right — light through it — and a
    // line of footprints from under the desk towards it, left foot, right foot
    if (h > 200) {
      const doorX = x + w - 36; const doorY = y + h - 66;
      ui.px(ctx, doorX, doorY, 24, 44, ERA1.greyDark);
      ui.px(ctx, doorX + 2, doorY + 2, 12, 40, ERA1.tooltip);
      ui.px(ctx, doorX + 16, doorY + 22, 2, 2, ERA1.black);
      const x0 = x + 14; const y0 = y + 100; const x1 = doorX - 8; const y1 = doorY + 34;
      const N = 9;
      for (let i = 0; i < N; i++) {
        const k = i / (N - 1);
        const px0 = Math.round(x0 + (x1 - x0) * k + (i % 2 ? 5 : -5) * (1 - k));
        const py0 = Math.round(y0 + (y1 - y0) * k);
        const col = i % 2 ? ERA1.paper : ERA1.silver;
        ui.px(ctx, px0, py0, 4, 6, col);
        ui.px(ctx, px0 + 1, py0 - 2, 2, 1, col);
        ui.px(ctx, px0 - 1 + (i % 2 ? 3 : 0), py0 - 1, 1, 1, col);
      }
    }
  }

  private drawModem(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ui.px(ctx, x, y + 10, 40, 22, ERA1.silver);
    ui.px(ctx, x + 2, y + 12, 36, 18, ERA1.beige);
    const lit = Math.floor(this.t * 6) % 3;
    for (let i = 0; i < 3; i++) ui.px(ctx, x + 6 + i * 10, y + 18, 6, 4, i === lit ? ERA1.ok : ERA1.greyDark);
    ui.px(ctx, x + 12, y + 36, 16, 3, ERA1.grey);
    ui.px(ctx, x + 18, y + 39, 4, 16, ERA1.grey);
  }

  // ── pressing ─────────────────────────────────────────────────────────────
  /** click routing — logical canvas coordinates, against the rects `draw` registered */
  handleClick(x: number, y: number): void {
    if (this.phase === 'autorun') return;
    const hit = this.hits.find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (hit) this.press(hit.id);
  }

  private press(id: string): void {
    this.dirty = true;
    if (id.startsWith('step:')) {
      const step = id.slice(5) as StepId;
      if (!this.stepAvailable(step) || this.stepDone(step)) return;
      this.panel = step;
      if (step === 'read') this.readPage = 0;
      return;
    }
    switch (id) {
      case 'cancel': if (this.onCancel) this.onCancel(); else this.open = false; return;
      case 'next':
        if (this.panel === 'welcome') this.panel = 'steps';
        else if (this.panel === 'read' && this.readPage < kit.read.pages.length - 1) this.readPage++;
        return;
      case 'done':
        if (this.panel === 'read') {
          this.readDone = true;
          if (!ledger.records.includes('kit-read')) ledger.records.push('kit-read');
          this.panel = 'steps';
        }
        return;
      case 'sign':
        if (!ledger.records.includes('pledge-signed') && !ledger.records.includes('pledge-declined')) ledger.records.push('pledge-signed');
        this.panel = 'steps';
        return;
      case 'pledge-notnow':
        if (!ledger.records.includes('pledge-signed') && !ledger.records.includes('pledge-declined')) ledger.records.push('pledge-declined');
        this.panel = 'steps';
        return;
      case 'play': this.prayerStopped = false; this.onPlayTape?.(); return;
      case 'amen': {
        const p = this.prayerProbe();
        this.prayerDone = true;
        // to the end, or cut at the chorus — one line each; the early one is flagged
        const early = p.state === 'singing';
        if (!ledger.records.includes('prayer-said') && !ledger.records.includes('prayer-cut')) {
          ledger.records.push(early ? 'prayer-cut' : 'prayer-said');
        }
        if (early) this.onStopTape?.();
        this.panel = 'steps';
        return;
      }
      case 'connect':
        this.phase = 'setup';
        this.setupPage = 'welcome';
        this.t = 0;
        return;
      case 'setup-next':
        if (this.setupPage === 'welcome') this.setupPage = 'number';
        else if (this.setupPage === 'number') {
          this.setupPage = 'connecting';
          this.t = 0;
          this.onDial?.();
        }
        return;
      case 'setup-cancel':
        if (this.setupPage === 'connecting') return;   // a dial in progress is not cancelled
        this.phase = 'wizard';
        this.panel = 'steps';
        return;
      case 'open-form': this.onOpenForm?.(); this.panel = 'steps'; this.open = false; return;
      case 'open-diary': this.onOpenDiary?.(); this.panel = 'steps'; this.open = false; return;
      case 'finish': this.open = false; return;
    }
  }
}
