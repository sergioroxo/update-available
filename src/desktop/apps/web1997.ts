/**
 * ⚑ S190/S194 — THE WEB, 1997 (Phase 5; PLAN_WEB_AND_HELPERS §1–2). Data and grounding: data/dialog/s1_browser.json.
 *
 * Opens when the kit's dial-up connects, on the fellowship's PORTAL — the browser's home page, set by the companion
 * disk. S194, his question: "will the user understand the connection of it IRC here?" So the portal says what the kit
 * said — tonight, others like you, a mentor will find you — with one big Join for #stillstruggling; under it the
 * search (tonight's query already in the field, the nights before in the history), the Resources, and the ring's
 * list. The system instructs; the web is there to explore:
 *  - the search → six results, all of them the network; page 2 the same network again; page 3 never loads;
 *  - every page carries the webring's bar (Prev · Next · Random · List — wherever he goes, the next site is another
 *    ministry) and the channel's Join;
 *  - List shows the ring's member sites (two of them "under construction", period-true);
 *  - each page names, at its foot, the dossier practice it is a trace of (the second reading).
 * Join opens the channel and MINIMISES the browser (os.ts): its taskbar button brings it back. No free typing.
 * Filed on the first search: "search history kept — referral pages returned".
 */
import * as ui from '../theme/chrome';
import { ERA1 } from '../theme/era1';
import { WEB97 as P } from '../theme/web1997';
import { practiceOf } from '../../witness/record';
import D from '../../../data/dialog/s1_browser.json';

interface Hit { x: number; y: number; w: number; h: number; id: string }
type PageId = keyof typeof D.pages;
type View = { kind: 'portal' } | { kind: 'results'; page: number } | { kind: 'page'; id: PageId } | { kind: 'list' } | { kind: 'dir' };
type PageDef = { heading: string; byline?: string; lines: string[]; counter?: boolean; practice?: string };

const WX = 4, WY = 3, WW = 504, WH = 356;
/** ⚑ S197 — Netscape 4's grammar (his visual archive): picture buttons, the location field, a status bar */
const TOOL_H = 30, LOC_H = 18, STATUS_H = 12;

export class Web1997App {
  open = true;
  hits: Hit[] = [];
  private view: View = { kind: 'portal' };
  private back: View[] = [];
  private fwd: View[] = [];
  private visited = new Set<string>();
  private hover = '';
  /** the first search, filed by os */
  onSearch?: () => void;
  /** Join: the channel opens */
  onJoin?: () => void;

  private go(v: View): void { this.back.push(this.view); this.fwd = []; this.view = v; }

  handleMove(x: number, y: number): void {
    const h = this.hits.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    this.hover = h ? h.id : '';
  }

  handleClick(x: number, y: number): void {
    const h = this.hits.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    if (!h) return;
    const id = h.id;
    if (id === 'web-back') { const b = this.back.pop(); if (b) { this.fwd.push(this.view); this.view = b; } return; }
    if (id === 'web-fwd') { const f = this.fwd.pop(); if (f) { this.back.push(this.view); this.view = f; } return; }
    if (id === 'web-reload') return;   // the same page, again
    if (id === 'web-home') { this.go({ kind: 'portal' }); return; }
    if (id === 'web-search' || id.startsWith('web-hist')) {
      this.onSearch?.();
      this.go({ kind: 'results', page: 1 });
      return;
    }
    if (id === 'web-next') { this.go({ kind: 'results', page: 2 }); return; }
    if (id === 'web-dir') { this.go({ kind: 'dir' }); return; }   // S198 — the directory
    if (id.startsWith('web-res:')) {
      const rid = id.slice(8);
      this.visited.add(rid);
      if (rid === 'chat') { this.onJoin?.(); return; }
      this.go({ kind: 'page', id: rid as PageId });
      return;
    }
    if (id === 'web-join') { this.onJoin?.(); return; }
    if (id.startsWith('web-ring:')) {
      const k = id.slice(9);
      if (k === 'list') { this.go({ kind: 'list' }); return; }
      const order = D.ringOrder as PageId[];
      const cur = this.view.kind === 'page' ? Math.max(0, order.indexOf(this.view.id)) : 0;
      const n = k === 'prev' ? (cur + order.length - 1) % order.length
        : k === 'next' ? (cur + 1) % order.length
        : (cur + 2) % order.length;
      this.visited.add(order[n]);
      this.go({ kind: 'page', id: order[n] });
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.hits = [];
    const c = ui.windowFrame(ctx, WX, WY, WW, WH, `${D.browser}`, true, 'web');
    // the chrome, Netscape 4's: a row of picture buttons, then the location field
    ui.px(ctx, c.x, c.y, c.w, TOOL_H + LOC_H + 4, ERA1.beige);
    const tools: Array<[string, string, boolean]> = [
      ['back', 'Back', this.back.length > 0], ['fwd', 'Forward', this.fwd.length > 0], ['reload', 'Reload', true],
      ['home', 'Home', this.view.kind !== 'portal'], ['search', 'Search', true], ['print', 'Print', false]
    ];
    tools.forEach(([k, label, live], i) => {
      const bx = c.x + 3 + i * 46, by = c.y + 2;
      ui.bevel(ctx, bx, by, 44, TOOL_H - 2, true);
      this.icon(ctx, k, bx + 16, by + 3, live);
      ui.setFont(ctx, 8);
      ctx.fillStyle = live ? ERA1.black : ERA1.grey;
      ctx.fillText(label, bx + Math.round((44 - ctx.measureText(label).width) / 2), by + 16);
      if (live) this.hits.push({ x: bx, y: by, w: 44, h: TOOL_H - 2, id: k === 'home' ? 'web-home' : k === 'search' ? 'web-search' : `web-${k}` });
    });
    // the browser's own mark, animated in the period (here: still)
    ui.px(ctx, c.x + c.w - 30, c.y + 2, 26, TOOL_H - 2, P.logoBg);
    ui.setFont(ctx, 14); ctx.fillStyle = P.logoInk; ctx.fillText('N', c.x + c.w - 22, c.y + 7);
    const ly = c.y + TOOL_H + 2;
    ui.setFont(ctx, 8); ctx.fillStyle = ERA1.black; ctx.fillText('Location:', c.x + 4, ly + 4);
    ui.bevel(ctx, c.x + 50, ly, c.w - 54, 16, false);
    ui.px(ctx, c.x + 52, ly + 2, c.w - 58, 12, ERA1.white);
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(this.address(), c.x + 55, ly + 3);
    // the status bar
    const sy = c.y + c.h - STATUS_H;
    ui.px(ctx, c.x, sy, c.w, STATUS_H, ERA1.beige);
    ui.bevel(ctx, c.x + 2, sy + 1, c.w - 60, STATUS_H - 2, false);
    ui.setFont(ctx, 8); ctx.fillStyle = ERA1.black; ctx.fillText('Document: Done', c.x + 6, sy + 2);
    const top = TOOL_H + LOC_H + 4;
    const body = { x: c.x, y: c.y + top, w: c.w, h: c.h - top - STATUS_H };
    ui.px(ctx, body.x, body.y, body.w, body.h, this.view.kind === 'results' || this.view.kind === 'dir' ? ERA1.white : P.page);
    if (this.view.kind === 'portal') this.drawPortal(ctx, body);
    else if (this.view.kind === 'results') this.drawResults(ctx, body, this.view.page);
    else if (this.view.kind === 'list') this.drawList(ctx, body);
    else if (this.view.kind === 'dir') this.drawDir(ctx, body);
    else this.drawPage(ctx, body, this.view.id);
    // (its close box answers nothing: the network does not let go — the channel is the way on;
    //  its minimise box and its taskbar button are the way to put it down)
  }

  /** the picture on each toolbar button, drawn in pixels (grey when the button is dead) */
  private icon(ctx: CanvasRenderingContext2D, k: string, x: number, y: number, live: boolean): void {
    const c = live ? P.iconInk : ERA1.grey;
    const r = (dx: number, dy: number, w: number, h: number) => ui.px(ctx, x + dx, y + dy, w, h, c);
    if (k === 'back') { for (let i = 0; i < 5; i++) r(4 - i, 5 - i, 1, 1 + i * 2); r(5, 4, 6, 3); }
    else if (k === 'fwd') { for (let i = 0; i < 5; i++) r(7 + i, 5 - i, 1, 1 + i * 2); r(1, 4, 6, 3); }
    else if (k === 'reload') { r(2, 2, 8, 2); r(2, 2, 2, 8); r(2, 8, 8, 2); r(8, 5, 2, 5); r(9, 1, 3, 3); }
    else if (k === 'home') { for (let i = 0; i < 5; i++) r(5 - i, i, 2 + i * 2, 1); r(2, 5, 8, 5); ui.px(ctx, x + 5, y + 7, 2, 3, P.logoBg); }
    else if (k === 'search') { r(2, 1, 6, 2); r(1, 2, 2, 5); r(7, 2, 2, 5); r(2, 7, 6, 2); r(8, 8, 3, 3); }
    else { r(2, 0, 8, 4); r(0, 4, 12, 5); r(2, 9, 8, 2); }
  }

  private address(): string {
    if (this.view.kind === 'portal') return D.portal.address;
    if (this.view.kind === 'results') return `${D.address}search?q=${D.query.replace(/ /g, '+')}${this.view.page > 1 ? '&page=2' : ''}`;
    if (this.view.kind === 'list') return 'http://members.ringsurf.com/walkingout/list.html';
    if (this.view.kind === 'dir') return D.directory.address;
    const id = this.view.id;
    const r = D.results.find((x) => x.id === id);
    return `http://${r?.url ?? `members.homepage.com/fellowshiplinks/${id}.html`}`;
  }

  private link(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, id: string, visited = false): void {
    ctx.fillStyle = visited ? P.visited : P.link;
    ctx.fillText(text, x, y);
    const w = ctx.measureText(text).width;
    ui.px(ctx, x, y + 10, w, 1, visited ? P.visited : P.link);
    this.hits.push({ x: x - 2, y: y - 2, w: w + 4, h: 14, id });
  }

  private heading(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number }, text: string, size = 22): void {
    ui.setFont(ctx, size);
    const hx = b.x + Math.round((b.w - ctx.measureText(text).width) / 2);
    ctx.fillStyle = P.headingShade; ctx.fillText(text, hx + 2, b.y + 10);
    ctx.fillStyle = P.heading; ctx.fillText(text, hx, b.y + 8);
  }

  /** the fellowship's portal — the kit's home page: the channel first, then the web */
  private drawPortal(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }): void {
    const T = D.portal;
    this.heading(ctx, b, T.heading);
    ui.setFont(ctx, 10);
    ctx.fillStyle = P.text;
    ctx.fillText(T.welcome, b.x + Math.round((b.w - ctx.measureText(T.welcome).width) / 2), b.y + 34);
    // the one big button
    const bw = 200, bx = b.x + Math.round((b.w - bw) / 2), by = b.y + 50;
    ui.button(ctx, bx, by, bw, 24, T.join, { hover: this.hover === 'web-join' });
    this.hits.push({ x: bx, y: by, w: bw, h: 24, id: 'web-join' });
    ui.setFont(ctx, 9);
    ctx.fillStyle = P.dim;
    ctx.fillText(T.joinSub, b.x + Math.round((b.w - ctx.measureText(T.joinSub).width) / 2), by + 30);
    ui.px(ctx, b.x + 20, b.y + 96, b.w - 40, 1, P.rule);
    // the search, tonight's query already in the field (no free typing — the law), the nights before under it
    const fx = b.x + 24, fy = b.y + 104;
    ui.setFont(ctx, 9); ctx.fillStyle = P.text; ctx.fillText(T.searchLabel, fx, fy + 4);
    const sx = fx + 84, sw = 180;
    ui.bevel(ctx, sx, fy, sw, 18, false);
    ui.px(ctx, sx + 2, fy + 2, sw - 4, 14, P.searchBg);
    ctx.fillStyle = ERA1.black; ctx.fillText(D.query, sx + 5, fy + 4);
    ui.button(ctx, sx + sw + 4, fy, 52, 18, D.searchButton, { hover: this.hover === 'web-search' });
    this.hits.push({ x: sx + sw + 4, y: fy, w: 52, h: 18, id: 'web-search' });
    ctx.fillStyle = P.dim; ctx.fillText(D.historyLabel, fx, fy + 26);
    let hx = fx + ctx.measureText(D.historyLabel).width + 10;
    D.history.forEach((q, i) => { this.link(ctx, q, hx, fy + 26, `web-hist:${i}`, true); hx += ctx.measureText(q).width + 12; });
    ui.px(ctx, b.x + 20, b.y + 146, b.w - 40, 1, P.rule);
    // the Resources, and the ring's list
    ui.setFont(ctx, 11); ctx.fillStyle = P.heading; ctx.fillText(T.resourcesLabel, fx, b.y + 152);
    ui.setFont(ctx, 10);
    T.resources.forEach((pid, i) => {
      const pg = D.pages[pid as PageId] as PageDef;
      this.link(ctx, pg.heading, fx + 12 + (i % 2) * 220, b.y + 170 + Math.floor(i / 2) * 18, `web-res:${pid}`, this.visited.has(pid));
    });
    ui.setFont(ctx, 9);
    this.link(ctx, T.ringLink, fx, b.y + 212, 'web-ring:list');
    this.link(ctx, D.directory.label, fx + 260, b.y + 212, 'web-dir');
    // the counter
    const cw = ctx.measureText(D.counter).width + 12;
    ui.px(ctx, b.x + Math.round((b.w - cw) / 2), b.y + b.h - 22, cw, 16, P.counterBg);
    ctx.fillStyle = P.text; ctx.fillText(D.counter, b.x + Math.round((b.w - cw) / 2) + 6, b.y + b.h - 18);
  }

  private drawResults(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }, page: number): void {
    ui.setFont(ctx, 16);
    ctx.fillStyle = P.engine; ctx.fillText(D.engine, b.x + 8, b.y + 6);
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(D.resultsFor.replace('{q}', D.query), b.x + 70, b.y + 8);
    ui.setFont(ctx, 8);
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(D.resultsCount.replace('1-6', page === 1 ? '1-6' : '7-12'), b.x + 8, b.y + 22);
    // S198 — the category match, above the sites (Yahoo, 1998)
    ctx.fillText(D.directory.resultsCategory, b.x + 8, b.y + 32);
    ui.setFont(ctx, 9);
    this.link(ctx, [...D.directory.path.slice(-3), D.directory.heading].join(' > '), b.x + 80, b.y + 32, 'web-dir');
    const rs = page === 1 ? D.results : [...D.results].reverse();   // page 2: the same network, again
    rs.forEach((r, i) => {
      const y = b.y + 48 + i * 33;
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

  /** ⚑ S198 — the directory, Yahoo-style: the path, the sub-categories, the site listings */
  private drawDir(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }): void {
    const T = D.directory;
    ui.setFont(ctx, 16); ctx.fillStyle = P.engine; ctx.fillText(D.engine, b.x + 8, b.y + 4);
    ui.setFont(ctx, 8);
    let x = b.x + 8;
    T.path.forEach((p, i) => {
      if (i === 0) { this.link(ctx, p, x, b.y + 26, 'web-home'); x += ctx.measureText(p).width; }
      else { ctx.fillStyle = P.link; ctx.fillText(p, x, b.y + 26); x += ctx.measureText(p).width; }
      ctx.fillStyle = ERA1.black; ctx.fillText(' > ', x, b.y + 26); x += ctx.measureText(' > ').width;
    });
    ui.setFont(ctx, 12); ctx.fillStyle = ERA1.black;
    ctx.fillText(`${T.heading} ${T.count}`, b.x + 8, b.y + 40);
    ui.px(ctx, b.x + 8, b.y + 56, b.w - 16, 1, ERA1.grey);
    ui.setFont(ctx, 9); ctx.fillStyle = ERA1.greyDark; ctx.fillText(T.categoriesLabel, b.x + 8, b.y + 62);
    T.categories.forEach((c, i) => {
      const cx = b.x + 20 + (i % 2) * 230, cy = b.y + 76 + Math.floor(i / 2) * 14;
      ui.setFont(ctx, 10);
      this.link(ctx, c.name, cx, cy, `web-res:${c.page}`, this.visited.has(c.page));
      ctx.fillStyle = ERA1.black; ctx.fillText(` (${c.n})`, cx + ctx.measureText(c.name).width + 2, cy);
    });
    const sy = b.y + 76 + Math.ceil(T.categories.length / 2) * 14 + 8;
    ui.px(ctx, b.x + 8, sy - 4, b.w - 16, 1, ERA1.grey);
    ui.setFont(ctx, 9); ctx.fillStyle = ERA1.greyDark; ctx.fillText(T.sitesLabel, b.x + 8, sy);
    D.list.members.filter((m) => m.page).slice(0, 8).forEach((m, i) => {
      const y = sy + 14 + i * 14;
      ui.setFont(ctx, 10);
      this.link(ctx, m.name, b.x + 20, y, `web-res:${m.page}`, this.visited.has(m.page!));
      const nw = ctx.measureText(m.name).width;
      ui.setFont(ctx, 9); ctx.fillStyle = ERA1.black;
      ctx.fillText(` - ${m.note}`, b.x + 24 + nw, y + 1);
    });
  }

  /** the ring's list of member sites — the network's scale, seen */
  private drawList(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }): void {
    const L = D.list;
    this.heading(ctx, b, L.heading, 18);
    ui.setFont(ctx, 9); ctx.fillStyle = P.dim;
    ctx.fillText(L.sub, b.x + Math.round((b.w - ctx.measureText(L.sub).width) / 2), b.y + 32);
    L.members.forEach((m, i) => {
      const y = b.y + 44 + i * 18;
      ui.setFont(ctx, 10);
      if (m.page) this.link(ctx, m.name, b.x + 30, y, `web-res:${m.page}`, this.visited.has(m.page));
      else {
        ctx.fillStyle = ERA1.grey; ctx.fillText(m.name, b.x + 30, y);
        ui.setFont(ctx, 8);
        const t = D.constructionMark, tw = ctx.measureText(t).width + 8;
        ui.px(ctx, b.x + b.w - 30 - tw, y - 1, tw, 12, P.construction);
        ctx.fillStyle = ERA1.black; ctx.fillText(t, b.x + b.w - 26 - tw, y + 1);
      }
      ui.setFont(ctx, 9); ctx.fillStyle = P.dim;
      ctx.fillText(m.note, b.x + 220, y);
    });
    this.ringBar(ctx, b);
  }

  private drawPage(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }, id: PageId): void {
    const pg = D.pages[id] as PageDef;
    this.heading(ctx, b, pg.heading);
    let top = b.y + 42;
    if (pg.byline) { ui.setFont(ctx, 9); ctx.fillStyle = P.dim; ctx.fillText(pg.byline, b.x + Math.round((b.w - ctx.measureText(pg.byline).width) / 2), b.y + 36); top += 8; }
    ui.px(ctx, b.x + 20, top, b.w - 40, 1, P.rule);
    ui.setFont(ctx, 10);
    ctx.fillStyle = P.text;
    pg.lines.forEach((l, i) => ctx.fillText(l, b.x + 30, top + 10 + i * 13));
    let y = top + 10 + pg.lines.length * 13 + 6;
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
    this.link(ctx, D.join, b.x + Math.round((b.w - jw) / 2), Math.max(y, b.y + b.h - 80), 'web-join');
    // the second reading: the practice this page is a trace of
    const pr = pg.practice ? practiceOf(pg.practice) : undefined;
    if (pr) {
      ui.setFont(ctx, 8); ctx.fillStyle = P.dim;
      const t = `${D.dossierMark} ${pr.title.toLowerCase()} — ${pr.did}`;
      ui.wrapText(ctx, t, b.w - 48).slice(0, 2).forEach((ln, i) => ctx.fillText(ln, b.x + 24, b.y + b.h - 60 + i * 10));
    }
    this.ringBar(ctx, b);
  }

  /** the ring's bar, on every page */
  private ringBar(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }): void {
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
