/**
 * ⚑ S191 — THE RECOMMENDATION, 2003 (Phase 5). Data and grounding: data/dialog/s2_forum.json.
 *
 * The programme's forum, in the period's browser (menu bar, Back · Forward · Stop · Refresh · Home, an address
 * bar with Go). Opened from the desktop icon that appears after his first check-in, when a senior member
 * recommends a thread (the recommendation event: a person, a moderator's community, picks the next thing).
 * 1. The RULES page: five rules, "I Agree" live, "I Do Not Agree" drawn dead — care and surveillance on one
 *    screen, and the web twin of the rules sheet on the wall. Filed.
 * 2. The board: its rooms by age, sex and marriage (the documented division), the recommended thread open.
 * 3. "Post reply" posts his one given line (no free typing), a moderator holds it, and "3 people are praying
 *    for you." Filed. The window closes and reopens where it was.
 */
import * as ui from '../theme/chrome';
import { ERA1 } from '../theme/era1';
import { WEB2003 as P } from '../theme/web1997';
import D from '../../../data/dialog/s2_forum.json';

interface Hit { x: number; y: number; w: number; h: number; id: string }
const WX = 8, WY = 8, WW = 496, WH = 344;

export class Web2003App {
  open = true;
  hits: Hit[] = [];
  private stage: 'rules' | 'thread' = 'rules';
  private posted = false;
  private hover = '';
  /** os files these (ledger.records) */
  onAgree?: () => void;
  onPost?: () => void;

  handleMove(x: number, y: number): void {
    const h = this.hits.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    this.hover = h ? h.id : '';
  }
  handleClick(x: number, y: number): void {
    const h = this.hits.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    if (!h) return;
    if (h.id === 'forum-close') { this.open = false; return; }
    if (h.id === 'forum-agree') { this.stage = 'thread'; this.onAgree?.(); return; }
    if (h.id === 'forum-post' && !this.posted) { this.posted = true; this.onPost?.(); }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.hits = [];
    const c = ui.windowFrame(ctx, WX, WY, WW, WH, `Harbor — ${D.bannerSub} - ${D.browser}`, true);
    this.hits.push({ x: c.closeBox.x, y: c.closeBox.y, w: c.closeBox.w, h: c.closeBox.h, id: 'forum-close' });
    // the menu bar
    ui.px(ctx, c.x, c.y, c.w, 58, ERA1.beige);
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.black;
    let mx = c.x + 6;
    for (const m of D.menus) { ctx.fillText(m, mx, c.y + 3); mx += ctx.measureText(m).width + 12; }
    ui.px(ctx, c.x, c.y + 15, c.w, 1, ERA1.grey);
    // the toolbar: Back · Forward · Stop · Refresh · Home (only Back is ever live in the period's grey)
    let tx = c.x + 4;
    D.toolbar.forEach((t, i) => {
      const w = ctx.measureText(t).width + 14;
      ui.button(ctx, tx, c.y + 18, w, 18, t, { disabled: i === 1 || i === 2 });
      tx += w + 3;
    });
    // the address bar
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(D.addressLabel, c.x + 6, c.y + 43);
    ui.bevel(ctx, c.x + 50, c.y + 40, c.w - 90, 15, false);
    ui.px(ctx, c.x + 52, c.y + 42, c.w - 94, 11, ERA1.white);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(this.stage === 'rules' ? `${D.address}join.asp` : `${D.address}thread.asp?t=4471`, c.x + 55, c.y + 43);
    ui.button(ctx, c.x + c.w - 36, c.y + 40, 32, 15, D.go, {});
    // the page
    const b = { x: c.x, y: c.y + 60, w: c.w, h: c.h - 60 };
    ui.px(ctx, b.x, b.y, b.w, b.h, P.page);
    // the board's banner
    ui.px(ctx, b.x, b.y, b.w, 30, P.banner);
    ui.setFont(ctx, 18);
    ctx.fillStyle = P.bannerInk;
    ctx.fillText(D.banner, b.x + 12, b.y + 6);
    ui.setFont(ctx, 9);
    ctx.fillStyle = P.bannerDim;
    ctx.fillText(D.bannerSub, b.x + 100, b.y + 12);
    if (this.stage === 'rules') this.drawRules(ctx, b); else this.drawThread(ctx, b);
  }

  private drawRules(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }): void {
    const R = D.rules;
    ui.px(ctx, b.x + 60, b.y + 44, b.w - 120, 200, P.panel);
    ui.px(ctx, b.x + 60, b.y + 44, b.w - 120, 18, P.panelHead);
    ui.setFont(ctx, 10);
    ctx.fillStyle = P.bannerInk;
    ctx.fillText(R.title, b.x + 70, b.y + 48);
    ctx.fillStyle = P.text;
    R.lines.forEach((l, i) => {
      const y = b.y + 74 + i * 22;
      ui.px(ctx, b.x + 72, y, 11, 11, ERA1.white);
      ui.px(ctx, b.x + 72, y, 11, 1, ERA1.grey); ui.px(ctx, b.x + 72, y, 1, 11, ERA1.grey);
      ctx.fillStyle = P.check; ctx.fillText('✓', b.x + 73, y - 1);
      ctx.fillStyle = P.text; ctx.fillText(l, b.x + 90, y);
    });
    ui.setFont(ctx, 9);
    ctx.fillStyle = P.dim;
    ctx.fillText(R.note, b.x + 72, b.y + 188);
    const by = b.y + 212;
    ui.button(ctx, b.x + b.w / 2 - 110, by, 100, 20, R.disagree, { disabled: true });
    ui.button(ctx, b.x + b.w / 2 + 10, by, 100, 20, R.agree, { hover: this.hover === 'forum-agree' });
    this.hits.push({ x: b.x + b.w / 2 + 10, y: by, w: 100, h: 20, id: 'forum-agree' });
  }

  private drawThread(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }): void {
    const T = D.thread;
    // the rooms, down the left
    ui.px(ctx, b.x, b.y + 30, 96, b.h - 30, P.panel);
    ui.setFont(ctx, 9);
    ctx.fillStyle = P.dim;
    ctx.fillText(D.roomsLabel, b.x + 8, b.y + 36);
    D.rooms.forEach((r, i) => {
      const on = r === T.room;
      if (on) ui.px(ctx, b.x + 4, b.y + 50 + i * 16, 88, 14, P.panelHead);
      ctx.fillStyle = on ? P.bannerInk : P.link;
      ctx.fillText(r, b.x + 8, b.y + 52 + i * 16);
    });
    // the thread
    const x0 = b.x + 104, w0 = b.w - 112;
    ui.setFont(ctx, 11);
    ctx.fillStyle = P.text;
    ctx.fillText(T.title, x0, b.y + 36);
    let y = b.y + 54;
    for (const p of T.posts) {
      const h = 14 + p.lines.length * 12 + 6;
      ui.px(ctx, x0, y, w0, h, ERA1.white);
      ui.px(ctx, x0, y, w0, 12, P.postHead);
      ui.setFont(ctx, 9);
      ctx.fillStyle = P.link; ctx.fillText(p.who, x0 + 4, y + 1);
      ctx.fillStyle = P.dim; ctx.fillText(p.meta, x0 + 4 + ctx.measureText(p.who).width + 8, y + 1);
      ctx.fillStyle = P.text;
      p.lines.forEach((l, i) => ctx.fillText(l, x0 + 6, y + 16 + i * 12));
      y += h + 4;
    }
    if (!this.posted) {
      ui.button(ctx, x0, y + 4, 80, 18, T.reply, { hover: this.hover === 'forum-post' });
      this.hits.push({ x: x0, y: y + 4, w: 80, h: 18, id: 'forum-post' });
      ui.setFont(ctx, 9);
      ctx.fillStyle = P.dim;
      ctx.fillText(`"${T.yourLine}"`, x0 + 88, y + 8);
    } else {
      ui.px(ctx, x0, y, w0, 30, P.pending);
      ui.setFont(ctx, 9);
      ctx.fillStyle = P.text;
      ctx.fillText(T.pending, x0 + 6, y + 4);
      ctx.fillStyle = P.praying;
      ctx.fillText(T.praying, x0 + 6, y + 17);
    }
  }
}
