/**
 * ⚑ S408 / 03-11 (UiB job 32 Part C; his 21 Nov answer: "Yes, or even a manuel, brochure something") — THE WOMEN'S
 * TRACK, ONE PAGE. 2003's women's-group task ("Next task: see how it is done there", data/sends.json s1) led nowhere:
 * "Go there" filed and nothing changed. It opens this now, on Daniel's monitor: one page of Restorify's brochure for its
 * women's track, the same programme reworded for women, in the period's soft print look. OPERABLE (the programme's
 * self-presentation); a bridge to 2016 through the system's word for women ('emotional dependency'), never through anyone's
 * story. Words and sources: data/strings/womens_track.json. Its colours are the palette's (ERA1, CAL_2003).
 */
import { ERA1 } from '../theme/era1';
import { CAL_2003 } from '../theme/calendar';
import * as ui from '../theme/chrome';
import W from '../../../data/strings/womens_track.json';

interface Hit { x: number; y: number; w: number; h: number; id: string }

const X = 56, Y = 12, WW = 400, WH = 336;

export class WomensTrackApp {
  open = true;
  dirty = true;
  hits: Hit[] = [];
  private hover = '';
  onClose?: () => void;

  draw(ctx: CanvasRenderingContext2D): void {
    this.hits = [];
    const c = ui.windowFrame(ctx, X, Y, WW, WH, W.title, true);
    this.hits.push({ ...c.closeBox, id: 'wt-close' });
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.silver);
    // the page: a printed sheet on the window's grey, its shadow under it
    const px = c.x + 10, py = c.y + 8, pw = c.w - 20, ph = c.h - 44;
    ui.px(ctx, px + 3, py + 3, pw, ph, ERA1.greyDark);
    ui.px(ctx, px, py, pw, ph, CAL_2003.paper);
    // the band: the programme's women's colour, its kicker
    ui.px(ctx, px, py, pw, 22, CAL_2003.skyLow);
    ui.px(ctx, px, py + 22, pw, 2, CAL_2003.sun);
    ui.setFont(ctx, 10); ctx.fillStyle = CAL_2003.tagline;
    ctx.fillText(W.kicker, px + 12, py + 6);
    const L = px + 12, TW = pw - 24;
    let y = py + 32;
    const para = (text: string, size: number, color: string, lh: number, gap = 6): void => {
      ui.setFont(ctx, size); ctx.fillStyle = color;
      for (const row of ui.wrapText(ctx, text, TW)) { ctx.fillText(row, L, y); y += lh; }
      y += gap;
    };
    para(W.headline, 14, CAL_2003.brand, 17, 4);
    para(W.lead, 10, CAL_2003.ink, 13);
    para(W.look, 10, ERA1.greyDark, 13, 2);
    for (const p of W.points as string[]) {
      ui.px(ctx, L + 2, y + 4, 5, 5, CAL_2003.weekend);
      ui.setFont(ctx, 10); ctx.fillStyle = CAL_2003.ink;
      for (const row of ui.wrapText(ctx, p, TW - 14)) { ctx.fillText(row, L + 14, y); y += 13; }
      y += 3;
    }
    y += 4;
    // the first step, boxed, the way a brochure sets its call to action
    ui.setFont(ctx, 10);
    const rows = ui.wrapText(ctx, W.step, TW - 16);
    const bh = rows.length * 13 + 10;
    ui.px(ctx, L - 1, y - 1, TW + 2, bh + 2, CAL_2003.sun);
    ui.px(ctx, L, y, TW, bh, CAL_2003.sunCore);
    ctx.fillStyle = CAL_2003.tagline;
    rows.forEach((r, i) => ctx.fillText(r, L + 8, y + 5 + i * 13));
    y += bh + 8;
    para(W.foot, 9, ERA1.greyDark, 12, 2);
    ui.setFont(ctx, 9); ctx.fillStyle = ERA1.grey;
    ctx.fillText(W.mark, L, py + ph - 14);
    // Close
    const bw = 70, bx = c.x + c.w - bw - 10, by = c.y + c.h - 28;
    ui.button(ctx, bx, by, bw, 20, W.close, { hover: this.hover === 'wt-done' });
    this.hits.push({ x: bx, y: by, w: bw, h: 20, id: 'wt-done' });
  }

  contains(x: number, y: number): boolean { return x >= X && x <= X + WW && y >= Y && y <= Y + WH; }

  handleMove(x: number, y: number): void {
    const h = this.hits.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    const id = h ? h.id : '';
    if (id !== this.hover) { this.hover = id; this.dirty = true; }
  }

  handleClick(x: number, y: number): void {
    const h = this.hits.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    if (h && (h.id === 'wt-close' || h.id === 'wt-done')) { this.open = false; this.dirty = true; this.onClose?.(); }
  }
}
