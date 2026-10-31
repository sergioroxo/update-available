/**
 * RESTORIFY — the check-in shell (S2R.2, R28-2d-ii). Shell only, per the
 * session brief: the purity streak ("412 days · includes supervised period")
 * front and center, and the Daily Realignment prompt with answer chips.
 * Every answer is accepted; each chip files a DIFFERENT witness tag
 * (register, never branch — master plan §5b). No Thought Audit, no webcam,
 * no Caleb, no streak death — those are later, gated lanes.
 * Copy in data/dialog/s2_lamby.json (PLACEHOLDER-draft, Sérgio voice pass
 * pending).
 *
 * Session 60: the card now has TWO states — the question, and the program's
 * reply to your answer (finding B7: it used to resolve into nothing). See
 * `onCheckinAcknowledged` and `drawResponse` below.
 */
import decisions from '../../../data/strings/cx3b.json';
import companionCopy from '../../../data/strings/companion.json';
import { StartPanel } from './startPanel';
import { ERA1, ERA1_CANVAS } from '../theme/era1';
import * as ui from '../theme/chrome';
import { ledger } from '../../state/ledger';
import lamby from '../../../data/dialog/s2_lamby.json';
import rigCopy from '../../../data/strings/lamby_rig.json';
import { LambyRigPanel, type Mood } from '../../lambyrig/lambyRig';
import { drawLambyChar } from './lambyChar';

interface Chip { id: string; label: string; witness: string }
interface Response { id: string; line1: string; line2: string }
interface Hit { x: number; y: number; w: number; h: number; id: string }

const DW = 400; const DH = 256;

export class RestorifyApp {
  open = true;
  today = true;
  private readonly todayPanel = new StartPanel('e2');
  showToday(): void { this.settings = false; this.lastChip = null; this.today = true; this.open = true; this.dirty = true; }
  offerPending = false;
  /** ⚑ S275 — Daniel's first leaving act: the evening check-in (its chips gain "I don't know") */
  evening = false;
  onEveningDone?: () => void;
  startEvening(): void { this.evening = true; this.settings = false; this.today = false; this.lastChip = null; this.open = true; this.dirty = true; }
  private chips(): Chip[] { return this.evening ? [...(lamby.checkinChips as Chip[]), lamby.eveningChip as Chip] : lamby.checkinChips as Chip[]; }
  /** S275 — the button by the streak opens the pocket pet (os.ts owns it) */
  onOpenCompanion?: () => void;
  private settings = false;
  private selectedDay = 'steady';
  private readonly panel = new LambyRigPanel();
  private readonly preview = document.createElement('canvas');
  private t = 0;
  private moodStart = 0;
  showPersonalise(): void {
    this.settings = true; this.open = true; this.offerPending = false;
    this.panel.handleClick(`mood:${ledger.guidePersonalisation.moods[this.selectedDay]}`, this.t);
    this.dirty = true;
  }
  update(dt: number): void { this.t += dt; if (this.settings || this.lastChip) this.dirty = true; }
  private drawPersonalise(ctx: CanvasRenderingContext2D): void {
    const c = ui.windowFrame(ctx, 24, 10, 464, 344, rigCopy.personalise.title, true, 'restorify');
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.beige);
    this.hits.push({ ...c.closeBox, id: 'personalise-done' });
    ui.setFont(ctx, 10); ctx.fillStyle = ERA1.navy;
    ctx.fillText(rigCopy.personalise.intro, c.x + 10, c.y + 10);
    ui.setFont(ctx, 9); ctx.fillStyle = ERA1.black;
    ctx.fillText(rigCopy.personalise.selected, c.x + 10, c.y + 28);
    const defaults: Record<string, Mood> = { steady: 'cheerful', grateful: 'cheerful', tired: 'clinical', struggling: 'sad' };
    lamby.checkinChips.forEach((day, i) => {
      const x = c.x + 10, y = c.y + 55 + i * 44, w = 132;
      ui.button(ctx, x, y, w, 24, day.label, { disabled: this.selectedDay === day.id });
      this.hits.push({ x, y, w, h: 24, id: `day:${day.id}` });
      ui.setFont(ctx, 9); ctx.fillStyle = ERA1.greyDark;
      const mood = ledger.guidePersonalisation.moods[day.id];
      ctx.fillText(rigCopy.moods[mood] + (mood === defaults[day.id] ? ` · ${rigCopy.personalise.recommended}` : ''), x + 2, y + 27);
    });
    // Render the SAME panel at its authored coordinates. This host crops out
    // animation controls: only the programme's four moods are configurable.
    this.preview.width = 512; this.preview.height = 384;
    const pctx = this.preview.getContext('2d')!;
    ui.px(pctx, 0, 0, 512, 384, ERA1.tealDark);
    const panelHits = this.panel.draw(pctx, { ...c, x: 28, y: 32, w: 456, h: 318 }, this.t, '');
    const x = c.x + 150, y = c.y + 52, controlsY = c.y + 212;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.preview, 28, 32, 456, 200, x, y, 296, 130);
    // Keep the shared mood controls at their native, readable size.
    ctx.drawImage(this.preview, 48, 272, 300, 36, x, controlsY, 300, 36);
    for (const h of panelHits.filter(h => h.id.startsWith('mood:'))) this.hits.push({ ...h,
      x: x + h.x - 48, y: controlsY + h.y - 272 });
    ui.setFont(ctx, 9); ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(rigCopy.personalise.smallPrint, c.x + 10, c.y + 255);
    ui.button(ctx, c.x + c.w - 70, c.y + c.h - 28, 60, 20, rigCopy.personalise.done);
    this.hits.push({ x: c.x + c.w - 70, y: c.y + c.h - 28, w: 60, h: 20, id: 'personalise-done' });
  }
  dirty = true;
  /** R28-2d-iv (S2R.4): fires once, right after a check-in chip is filed —
   *  os.ts uses this to decide whether Lamby's video offer should surface
   *  (provisional trigger: after the FIRST completed check-in). */
  onCheckinFiled?: () => void;
  /**
   * Session 60 (finding B7, Sérgio: *"how was your walk resolves into
   * nothing"*): the card used to vanish the instant a chip was pressed,
   * because os.ts opened the Messenger over it in the same tick — the player
   * answered a question and the question left without a word. Now the answer
   * gets an ANSWER (see `checkinResponses` in the data), the card holds until
   * the player presses Continue, and THIS fires then. The seam that follows —
   * Lamby saying a message arrived — hangs off this callback, not off the chip
   * press, so nothing ever talks over the program's own reply.
   */
  onCheckinAcknowledged?: () => void;

  private hits: Hit[] = [];
  private hover = '';
  private lastChip: string | null = null;

  private get geom(): { dx: number; dy: number } {
    const dx = Math.round((ERA1_CANVAS.width - DW) / 2);
    const dy = Math.round((ERA1_CANVAS.height - DH) / 2);
    return { dx, dy };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.hits = [];
    if (this.settings) { this.drawPersonalise(ctx); return; }
    if (this.today) {
      this.todayPanel.footerAction = decisions.restorify.checkin;
      this.hits.push(...this.todayPanel.draw(ctx, 88, 50, 336).map(r => ({ ...r, id: 'restorify-close' })));
      if (this.todayPanel.actionRect) this.hits.push({ ...this.todayPanel.actionRect, id: 'today-checkin' });
      return;
    }
    const { dx, dy } = this.geom;
    const c = ui.windowFrame(ctx, dx, dy, DW, DH, lamby.restorifyTitle, true, 'restorify');
    this.hits.push({ ...c.closeBox, id: this.lastChip ? 'checkin-continue' : 'restorify-close' });
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.beige);
    const L = c.x + 10;
    ui.button(ctx, c.x + c.w - 76, c.y + 5, 66, 18, decisions.restorify.back);
    this.hits.push({ x: c.x + c.w - 76, y: c.y + 5, w: 66, h: 18, id: 'restorify-today' });

    // the purity streak — front and center; it counted while he was away
    ui.setFont(ctx, 18);
    ctx.fillStyle = ERA1.navy;
    ctx.fillText(lamby.streakValue, L, c.y + 8);
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.grey;
    ctx.fillText(lamby.streakLabel, L, c.y + 30);
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(`(${lamby.streakNote})`, L, c.y + 44);

    // ⚑ S272 (his 31 Oct: "the personalising Lamby can be also a button [on] the Streak") — after the first check-in
    //   the guide's settings live beside the streak they serve, never as a popup of their own
    if (ledger.checkins.some(ch => !ch.id.startsWith('e3'))) {
      // ⚑ S275 — the settings are gone: the companion grows from the answers (companion.ts)
      const bw = 110, bx = c.x + c.w - bw - 10;
      ui.button(ctx, bx, c.y + 32, bw, 18, companionCopy.open, { hover: this.hover === 'companion-open' });
      this.hits.push({ x: bx, y: c.y + 32, w: bw, h: 18, id: 'companion-open' });
    }
    ui.px(ctx, L, c.y + 60, c.w - 20, 1, ERA1.grey);

    if (this.lastChip) { this.drawResponse(ctx, c, L); return; }

    // the daily realignment — every answer accepted, none "correct"
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(this.evening ? lamby.eveningPrompt : lamby.checkinPrompt, L, c.y + 70);

    const chips = this.chips();
    const chipW = 128; const chipH = 20; const gapX = 8; const gapY = 8;
    chips.forEach((ch, i) => {
      const col = i % 2; const row = Math.floor(i / 2);
      const x = L + col * (chipW + gapX);
      const y = c.y + 88 + row * (chipH + gapY);
      const on = this.lastChip === ch.id;
      ui.bevel(ctx, x, y, chipW, chipH, !on); // the current answer sits sunken
      ui.setFont(ctx, 9);
      ctx.fillStyle = on ? ERA1.navy : (this.hover === `checkin:${ch.id}` ? ERA1.navy : ERA1.black);
      ctx.fillText(ch.label, x + 8, y + 5);
      this.hits.push({ x, y, w: chipW, h: chipH, id: `checkin:${ch.id}` });
    });


    const bx = c.x + c.w - 70; const by = c.y + c.h - 22;
    ui.button(ctx, bx, by, 60, 18, lamby.closeLabel, { hover: this.hover === 'restorify-close' });
    this.hits.push({ x: bx, y: by, w: 60, h: 18, id: 'restorify-close' });
  }

  /**
   * The program's reply to the answer (finding B7). Register, never branch:
   * the four replies differ in WORDING only — the same Continue, the same
   * next beat, the same everything after. What differs is what got filed, and
   * the reply is where the player can see that something was.
   */
  private drawResponse(ctx: CanvasRenderingContext2D, c: ui.ContentRect, L: number): void {
    const chip = this.chips().find(ch => ch.id === this.lastChip);
    const reply = [...(lamby.checkinResponses as Response[]), lamby.eveningResponse as Response].find(r => r.id === this.lastChip);

    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.grey;
    ctx.fillText(lamby.checkinResponseHeading, L, c.y + 68);
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.navy;
    ctx.fillText(`${this.evening ? lamby.eveningPrompt : lamby.checkinPrompt} ${chip?.label ?? ''}`, L, c.y + 82);

    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.black;
    let row = 0;
    for (const line of [reply?.line1 ?? '', reply?.line2 ?? '']) {
      for (const wrapped of ui.wrapText(ctx, line, c.w - 120)) {
        ctx.fillText(wrapped, L, c.y + 104 + row * 13);
        row++;
      }
    }

    drawLambyChar(ctx, c.x + c.w - 55, c.y + 148, {
      mood: ledger.guidePersonalisation.moods[this.lastChip!] ?? 'cheerful', action: 'idle',
      t: this.t, moodStart: this.moodStart, scale: 0.48
    });
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.grey;
    ctx.fillText(lamby.checkinFiledNote, L, c.y + c.h - 30);

    const bx = c.x + c.w - 80; const by = c.y + c.h - 22;
    ui.button(ctx, bx, by, 70, 18, lamby.checkinContinue, { hover: this.hover === 'checkin-continue' });
    this.hits.push({ x: bx, y: by, w: 70, h: 18, id: 'checkin-continue' });
  }

  handleMove(x: number, y: number): void {
    const hit = this.hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    const id = hit ? hit.id : '';
    if (id !== this.hover) { this.hover = id; this.dirty = true; }
  }

  handleClick(x: number, y: number): void {
    const hit = this.hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (!hit) return;
    if (hit.id === 'personalise-done') { this.showToday(); return; }
    if (hit.id === 'personalise-open') { this.showPersonalise(); return; }
    if (hit.id === 'companion-open') { this.onOpenCompanion?.(); return; }
    if (this.settings && hit.id.startsWith('day:')) {
      this.selectedDay = hit.id.slice(4);
      this.panel.handleClick(`mood:${ledger.guidePersonalisation.moods[this.selectedDay]}`, this.t);
      this.dirty = true; return;
    }
    if (this.settings && hit.id.startsWith('mood:') && this.panel.handleClick(hit.id, this.t)) {
      ledger.guidePersonalisation.moods[this.selectedDay] = this.panel.mood;
      ledger.guidePersonalisation.personalised = true;
      this.dirty = true; return;
    }
    if (hit.id === 'restorify-today') { this.showToday(); return; }
    if (hit.id === 'today-checkin') { this.lastChip = null; this.today = false; this.dirty = true; return; }
    if (hit.id === 'restorify-close') { this.open = false; this.dirty = true; if (this.evening) { this.evening = false; this.onEveningDone?.(); } return; }
    if (hit.id === 'checkin-continue' && this.evening) { this.evening = false; this.open = false; this.dirty = true; this.onEveningDone?.(); return; }
    if (hit.id === 'checkin-continue') {
      // the card closes on the player's press, never underneath them
      this.open = false;
      this.dirty = true;
      this.onCheckinAcknowledged?.();
      return;
    }
    if (hit.id.startsWith('checkin:')) {
      const id = hit.id.slice(8);
      const chip = this.chips().find(c => c.id === id);
      if (chip) {
        this.lastChip = chip.id;
        this.moodStart = this.t;
        if (!ledger.checkins.some(ch => !ch.id.startsWith('e3'))) this.offerPending = true;
        ledger.checkins.push({ id: chip.id, witness: chip.witness });
        this.dirty = true;
        this.onCheckinFiled?.();
      }
    }
  }
}
