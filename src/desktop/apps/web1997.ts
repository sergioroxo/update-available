/**
 * ⚑ S190 — THE SEARCH, 1997 (Phase 5). Data and grounding: data/dialog/s1_browser.json.
 *
 * Opens when the kit's dial-up connects, in place of the channel: the channel is now something he FINDS. The
 * search field already holds tonight's query; the history below it holds the nights before. Search → six
 * results, all of them the network; a Next to page 2 of the same; a page 3 that never loads. Any result opens
 * a page in the period's lavender, and every page carries the webring's bar (Prev · Next · Random · List —
 * wherever he goes, the next site is another ministry) and the channel's Join. Join opens #stillstruggling.
 * No free typing anywhere. Filed on the first search: "search history kept — referral pages returned".
 */
import * as ui from '../theme/chrome';
import { ERA1 } from '../theme/era1';
import { WEB97 as P } from '../theme/web1997';
import D from '../../../data/dialog/s1_browser.json';

interface Hit { x: number; y: number; w: number; h: number; id: string }
type PageId = keyof typeof D.pages;
type View = { kind: 'home' } | { kind: 'results'; page: number } | { kind: 'page'; id: PageId };

const WX = 6, WY = 6, WW = 500, WH = 350;

export class Web1997App {
  open = true;
  hits: Hit[] = [];
  private view: View = { kind: 'home' };
  private back: View[] = [];
  private visited = new Set<string>();
  private hover = '';
  /** the first search, filed by os */
  onSearch?: () => void;
  /** Join: the channel opens */
  onJoin?: () => void;

  private go(v: View): void { this.back.push(this.view); this.view = v; }

  handleMove(x: number, y: number): void {
    const h = this.hits.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    this.hover = h ? h.id : '';
  }

  handleClick(x: number, y: number): void {
    const h = this.hits.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    if (!h) return;
    const id = h.id;
    if (id === 'web-back') { const b = this.back.pop(); if (b) this.view = b; return; }
    if (id === 'web-search' || id.startsWith('web-hist')) {
      this.onSearch?.();
      this.go({ kind: 'results', page: 1 });
      return;
    }
    if (id === 'web-next') { this.go({ kind: 'results', page: 2 }); return; }
    if (id.startsWith('web-res:')) {
      const rid = id.slice(8);
      this.visited.add(rid);
      if (rid === 'chat') { this.onJoin?.(); return; }
      this.go({ kind: 'page', id: rid as PageId });
      return;
    }
    if (id === 'web-join') { this.onJoin?.(); return; }
    if (id.startsWith('web-ring:')) {
      const order = D.ringOrder as PageId[];
      const cur = this.view.kind === 'page' ? order.indexOf(this.view.id) : 0;
      const k = id.slice(9);
      const n = k === 'prev' ? (cur + order.length - 1) % order.length
        : k === 'next' ? (cur + 1) % order.length
        : k === 'random' ? (cur + 2) % order.length
        : order.indexOf('ring');
      this.visited.add(order[n]);
      this.go({ kind: 'page', id: order[n] });
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.hits = [];
    const c = ui.windowFrame(ctx, WX, WY, WW, WH, `${D.engine} - ${D.browser}`, true);
    // the chrome: Back, the address
    ui.px(ctx, c.x, c.y, c.w, 22, ERA1.beige);
    const canBack = this.back.length > 0;
    ui.button(ctx, c.x + 3, c.y + 3, 44, 16, D.back, { disabled: !canBack, hover: this.hover === 'web-back' });
    if (canBack) this.hits.push({ x: c.x + 3, y: c.y + 3, w: 44, h: 16, id: 'web-back' });
    ui.bevel(ctx, c.x + 52, c.y + 3, c.w - 56, 16, false);
    ui.px(ctx, c.x + 54, c.y + 5, c.w - 60, 12, ERA1.white);
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(this.address(), c.x + 57, c.y + 6);
    const body = { x: c.x, y: c.y + 24, w: c.w, h: c.h - 24 };
    ui.px(ctx, body.x, body.y, body.w, body.h, this.view.kind === 'page' ? P.page : ERA1.white);
    if (this.view.kind === 'home') this.drawHome(ctx, body);
    else if (this.view.kind === 'results') this.drawResults(ctx, body, this.view.page);
    else this.drawPage(ctx, body, this.view.id);
    // (its close box answers nothing: the network does not let go — the channel is the way on)
  }

  private address(): string {
    if (this.view.kind === 'home') return D.address;
    if (this.view.kind === 'results') return `${D.address}search?q=${D.query.replace(/ /g, '+')}${this.view.page > 1 ? '&page=2' : ''}`;
    const r = D.results.find((x) => x.id === (this.view as { id: string }).id);
    return `http://${r?.url ?? ''}`;
  }

  private link(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, id: string, visited = false): void {
    ctx.fillStyle = visited ? P.visited : P.link;
    ctx.fillText(text, x, y);
    const w = ctx.measureText(text).width;
    ui.px(ctx, x, y + 10, w, 1, visited ? P.visited : P.link);
    this.hits.push({ x: x - 2, y: y - 2, w: w + 4, h: 14, id });
  }

  private drawHome(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }): void {
    // the engine's logo, in its own two colours
    ui.setFont(ctx, 28);
    const lx = b.x + Math.round(b.w / 2) - 44;
    ctx.fillStyle = P.engine; ctx.fillText(D.engine.slice(0, 3), lx, b.y + 40);
    ctx.fillStyle = P.engineAlt; ctx.fillText(D.engine.slice(3), lx + ctx.measureText(D.engine.slice(0, 3)).width, b.y + 40);
    // the field, already holding tonight's query (no free typing — the law)
    const fx = b.x + 70, fy = b.y + 86, fw = b.w - 200;
    ui.bevel(ctx, fx, fy, fw, 20, false);
    ui.px(ctx, fx + 2, fy + 2, fw - 4, 16, P.searchBg);
    ui.setFont(ctx, 11);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(D.query, fx + 6, fy + 5);
    ui.px(ctx, fx + 8 + ctx.measureText(D.query).width, fy + 4, 1, 12, ERA1.black);
    ui.button(ctx, fx + fw + 6, fy, 60, 20, D.searchButton, { hover: this.hover === 'web-search' });
    this.hits.push({ x: fx + fw + 6, y: fy, w: 60, h: 20, id: 'web-search' });
    // the nights before
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(D.historyLabel, fx, fy + 36);
    D.history.forEach((q, i) => this.link(ctx, q, fx + 8, fy + 52 + i * 16, `web-hist:${i}`, true));
  }

  private drawResults(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }, page: number): void {
    ui.setFont(ctx, 16);
    ctx.fillStyle = P.engine; ctx.fillText(D.engine, b.x + 8, b.y + 6);
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(D.resultsFor.replace('{q}', D.query), b.x + 70, b.y + 8);
    ui.setFont(ctx, 8);
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(D.resultsCount.replace('1-6', page === 1 ? '1-6' : '7-12'), b.x + 8, b.y + 28);
    const rs = page === 1 ? D.results : [...D.results].reverse();   // page 2: the same network, again
    rs.forEach((r, i) => {
      const y = b.y + 44 + i * 40;
      ui.setFont(ctx, 10);
      this.link(ctx, r.title, b.x + 12, y, `web-res:${r.id}`, this.visited.has(r.id));
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.black;
      ctx.fillText(r.snippet, b.x + 12, y + 14);
      ctx.fillStyle = ERA1.ok;
      ctx.fillText(r.url, b.x + 12, y + 25);
    });
    // Pages: 1 2 3 — and 3 never loads
    const py = b.y + b.h - 18;
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(D.resultsPages, b.x + 12, py);
    ctx.fillStyle = page === 1 ? ERA1.black : P.link; ctx.fillText('1', b.x + 50, py);
    ctx.fillStyle = page === 2 ? ERA1.black : P.link; ctx.fillText('2', b.x + 62, py);
    ctx.fillStyle = ERA1.grey; ctx.fillText('3', b.x + 74, py);
    if (page === 1) this.link(ctx, `${D.next} >`, b.x + 90, py, 'web-next');
  }

  private drawPage(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }, id: PageId): void {
    const pg = D.pages[id] as { heading: string; lines: string[]; counter?: boolean };
    // the bevelled purple heading of the period
    ui.setFont(ctx, 22);
    const hx = b.x + Math.round((b.w - ctx.measureText(pg.heading).width) / 2);
    ctx.fillStyle = P.headingShade; ctx.fillText(pg.heading, hx + 2, b.y + 12);
    ctx.fillStyle = P.heading; ctx.fillText(pg.heading, hx, b.y + 10);
    ui.px(ctx, b.x + 20, b.y + 40, b.w - 40, 1, P.rule);
    ui.setFont(ctx, 10);
    ctx.fillStyle = P.text;
    pg.lines.forEach((l, i) => ctx.fillText(l, b.x + 30, b.y + 50 + i * 13));
    let y = b.y + 50 + pg.lines.length * 13 + 8;
    if (pg.counter) {
      ui.setFont(ctx, 9);
      const w = ctx.measureText(D.counter).width + 12;
      ui.px(ctx, b.x + Math.round((b.w - w) / 2), y, w, 16, P.counterBg);
      ctx.fillStyle = P.text; ctx.fillText(D.counter, b.x + Math.round((b.w - w) / 2) + 6, y + 4);
      y += 22;
    }
    // the channel, on every page
    ui.setFont(ctx, 10);
    const jw = ctx.measureText(D.join).width;
    this.link(ctx, D.join, b.x + Math.round((b.w - jw) / 2), Math.max(y, b.y + b.h - 62), 'web-join');
    // the ring's bar, on every page
    const ry = b.y + b.h - 40;
    ui.px(ctx, b.x + 20, ry, b.w - 40, 30, P.ringBar);
    ui.px(ctx, b.x + 20, ry, b.w - 40, 1, P.rule);
    ui.setFont(ctx, 9);
    ctx.fillStyle = P.ringInk;
    const name = D.ringBar.name;
    ctx.fillText(name, b.x + Math.round((b.w - ctx.measureText(name).width) / 2), ry + 3);
    const items: Array<[string, string]> = [[D.ringBar.prev, 'prev'], [D.ringBar.random, 'random'], [D.ringBar.list, 'list'], [D.ringBar.next, 'next']];
    const slot = (b.w - 40) / items.length;
    items.forEach(([t, k], i) => {
      const tw = ctx.measureText(t).width;
      this.link(ctx, t, b.x + 20 + i * slot + Math.round((slot - tw) / 2), ry + 16, `web-ring:${k}`);
    });
  }
}
