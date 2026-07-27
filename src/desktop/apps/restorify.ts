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
import { ERA1, ERA1_CANVAS } from '../theme/era1';
import * as ui from '../theme/chrome';
import { ledger } from '../../state/ledger';
import lamby from '../../../data/dialog/s2_lamby.json';

interface Chip { id: string; label: string; witness: string }
interface Response { id: string; line1: string; line2: string }
interface Hit { x: number; y: number; w: number; h: number; id: string }

const DW = 300; const DH = 210;

export class RestorifyApp {
  open = true;
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
    const { dx, dy } = this.geom;
    const c = ui.windowFrame(ctx, dx, dy, DW, DH, lamby.restorifyTitle, true);
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.beige);
    const L = c.x + 10;

    // the purity streak — front and center; it counted while he was away
    ui.setFont(ctx, 18);
    ctx.fillStyle = ERA1.navy;
    ctx.fillText(lamby.streakValue, L, c.y + 8);
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.grey;
    ctx.fillText(lamby.streakLabel, L, c.y + 30);
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(`(${lamby.streakNote})`, L, c.y + 44);

    ui.px(ctx, L, c.y + 60, c.w - 20, 1, ERA1.grey);

    if (this.lastChip) { this.drawResponse(ctx, c, L); return; }

    // the daily realignment — every answer accepted, none "correct"
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(lamby.checkinPrompt, L, c.y + 70);

    const chips = lamby.checkinChips as Chip[];
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
    const chip = (lamby.checkinChips as Chip[]).find(ch => ch.id === this.lastChip);
    const reply = (lamby.checkinResponses as Response[]).find(r => r.id === this.lastChip);

    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.grey;
    ctx.fillText(lamby.checkinResponseHeading, L, c.y + 68);
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.navy;
    ctx.fillText(`${lamby.checkinPrompt} ${chip?.label ?? ''}`, L, c.y + 82);

    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.black;
    let row = 0;
    for (const line of [reply?.line1 ?? '', reply?.line2 ?? '']) {
      for (const wrapped of ui.wrapText(ctx, line, c.w - 20)) {
        ctx.fillText(wrapped, L, c.y + 104 + row * 13);
        row++;
      }
    }

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
    if (hit.id === 'restorify-close') { this.open = false; this.dirty = true; return; }
    if (hit.id === 'checkin-continue') {
      // the card closes on the player's press, never underneath them
      this.open = false;
      this.dirty = true;
      this.onCheckinAcknowledged?.();
      return;
    }
    if (hit.id.startsWith('checkin:')) {
      const id = hit.id.slice(8);
      const chip = (lamby.checkinChips as Chip[]).find(c => c.id === id);
      if (chip) {
        this.lastChip = chip.id;
        ledger.checkins.push({ id: chip.id, witness: chip.witness });
        this.dirty = true;
        this.onCheckinFiled?.();
      }
    }
  }
}
