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
import decisions from '../../../data/strings/cx3b.json';
import { reducedMotion } from '../../state/motion';
import fixes from '../../../data/strings/visitorFixes.json';

interface Hit { x: number; y: number; w: number; h: number; id: string }
type PageId = keyof typeof D.pages;
type View = { kind: 'portal' } | { kind: 'results'; page: number } | { kind: 'page'; id: PageId } | { kind: 'list' } | { kind: 'dir' };
type PageDef = { heading: string; byline?: string; lines: string[]; counter?: boolean; practice?: string; style?: string; badge?: boolean };
type Ink = { link: string; visited: string };
/** ⚑ S343 / T38 — the three page grammars (data/dialog/s1_browser.json `styles`) */
type Style = 'geo' | 'ring' | 'dir';
const INK: Record<Style, Ink & { text: string; dim: string; heading: string; shade: string }> = {
  geo: { link: P.link, visited: P.visited, text: P.geoText, dim: P.dim, heading: P.geoHeading, shade: P.geoShade },
  ring: { link: P.ringLink, visited: P.ringVisited, text: P.ringText, dim: ERA1.silver, heading: P.ringHeading, shade: ERA1.black },
  dir: { link: P.link, visited: P.visited, text: ERA1.black, dim: ERA1.greyDark, heading: P.dirHeading, shade: ERA1.white }
};

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
  onFitIn?: () => void;
  private bannerTime = 0;
  /** ⚑ S343 — the FIT IN advertisement's one moving part (the piece that does not fit blinks), on the portal only */
  update(dt: number): boolean {
    if (reducedMotion()) return false;
    const before = Math.floor(this.bannerTime * 2);
    this.bannerTime = (this.bannerTime + dt) % 600;
    return this.open && this.view.kind === 'portal' && Math.floor(this.bannerTime * 2) !== before;
  }
  /** ⚑ S343 / T34 — the os plays the fellowship's MIDI while its own pages are up (not Seekr's) */
  get onFellowshipPage(): boolean { return this.open && this.view.kind !== 'results' && this.view.kind !== 'dir'; }
  /** Covered controls are not live, even though their window remains open underneath. */
  covered(): void { this.hits = []; }
  onRootCause?: () => void;
  onClose?: () => void;
  /** Join: the channel opens */
  onJoin?: () => void;

  private go(v: View): void { this.back.push(this.view); this.fwd = []; this.view = v; }

  /** true when what is under the pointer changed (S271: only then does the screen repaint) */
  handleMove(x: number, y: number): boolean {
    const h = this.hits.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    const was = this.hover; this.hover = h ? h.id : '';
    return this.hover !== was;
  }

  handleClick(x: number, y: number): void {
    const h = this.hits.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    if (!h) return;
    const id = h.id;
    if (id === 'web-fitin') { this.onFitIn?.(); return; }
    if (id === 'web-rootcause') { this.onRootCause?.(); return; }
    if (id === 'web-close') { if (this.onClose) this.onClose(); else this.open = false; return; }
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
      if (rid === 'root') this.onRootCause?.();
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
      drawWeb1997Icon(ctx, k, bx + 16, by + 3, live);
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
    // ⚑ S343 / T38 (his 8 Nov: "press here to play FIT IN… doesn't need to be on everything… we need a little bit
    //   more space") — the full-width banner that sat under every page, and squeezed every page to make room for
    //   itself, is gone; FIT IN is a small advertisement on the Fellowship Network's own page (drawPortal)
    ctx.save(); ctx.beginPath(); ctx.rect(body.x, body.y, body.w, body.h); ctx.clip();
    if (this.view.kind === 'portal') this.drawPortal(ctx, body);
    else if (this.view.kind === 'results') this.drawResults(ctx, body, this.view.page);
    else if (this.view.kind === 'list') this.drawList(ctx, body);
    else if (this.view.kind === 'dir') this.drawDir(ctx, body);
    else this.drawPage(ctx, body, this.view.id);
    ctx.restore();
    this.hits.push({ ...c.closeBox, id: 'web-close' });
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

  private link(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, id: string, visited = false, ink: Ink = P): void {
    ctx.fillStyle = visited ? ink.visited : ink.link;
    ctx.fillText(text, x, y);
    const w = ctx.measureText(text).width;
    ui.px(ctx, x, y + 10, w, 1, visited ? ink.visited : ink.link);
    this.hits.push({ x: x - 2, y: y - 2, w: w + 4, h: 14, id });
  }

  private heading(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number }, text: string, size = 22,
    ink: { heading: string; shade: string } = { heading: P.heading, shade: P.headingShade }, left = false): number {
    ui.setFont(ctx, size);
    const tw = ctx.measureText(text).width;
    const hx = left ? b.x + 24 : b.x + Math.round((b.w - tw) / 2);
    ctx.fillStyle = ink.shade; ctx.fillText(text, hx + 2, b.y + 10);
    ctx.fillStyle = ink.heading; ctx.fillText(text, hx, b.y + 8);
    return hx;
  }

  /** the fellowship's portal — the kit's home page: the channel first, then the web */
  private drawPortal(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }): void {
    const T = D.portal;
    this.heading(ctx, b, T.heading);
    ui.setFont(ctx, 10);
    ctx.fillStyle = P.text;
    ctx.fillText(T.welcome, b.x + Math.round((b.w - ctx.measureText(T.welcome).width) / 2), b.y + 33);
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.navy;
    const startW = Math.ceil(ctx.measureText(T.start).width);
    const startX = b.x + Math.round((b.w - startW) / 2);
    ctx.fillText(T.start, startX, b.y + 46);
    // the one big button
    const bw = 200, bx = b.x + Math.round((b.w - bw) / 2), by = b.y + 60;
    ui.button(ctx, bx, by, bw, 24, T.join, { hover: this.hover === 'web-join' });
    this.hits.push({ x: Math.min(bx, startX), y: b.y + 44, w: Math.max(bx + bw, startX + startW) - Math.min(bx, startX), h: 40, id: 'web-join' });
    ui.setFont(ctx, 9);
    ctx.fillStyle = P.dim;
    ctx.fillText(T.joinSub, b.x + Math.round((b.w - ctx.measureText(T.joinSub).width) / 2), by + 26);
    ui.px(ctx, b.x + 20, b.y + 98, b.w - 40, 1, P.rule);
    // the search, tonight's query already in the field (no free typing — the law), the nights before under it
    const fx = b.x + 24, fy = b.y + 104;
    ui.setFont(ctx, 9); ctx.fillStyle = P.text; ctx.fillText(T.searchLabel, fx, fy + 4);
    const sx = fx + 84, sw = 180;
    ui.bevel(ctx, sx, fy, sw, 18, false);
    ui.px(ctx, sx + 2, fy + 2, sw - 4, 14, P.searchBg);
    ctx.fillStyle = ERA1.black; ctx.fillText(D.query, sx + 5, fy + 4);
    ui.button(ctx, sx + sw + 4, fy, 52, 18, D.searchButton, { hover: this.hover === 'web-search' });
    this.hits.push({ x: sx, y: fy, w: sw + 56, h: 18, id: 'web-search' });
    ctx.fillStyle = P.dim; ctx.fillText(D.historyLabel, fx, fy + 26);
    let hx = fx + ctx.measureText(D.historyLabel).width + 10;
    D.history.forEach((q, i) => { this.link(ctx, q, hx, fy + 26, `web-hist:${i}`, true); hx += ctx.measureText(q).width + 12; });
    ui.px(ctx, b.x + 20, b.y + 146, b.w - 40, 1, P.rule);
    // the Resources (one column now, with room between them), the ring's list, and FIT IN's little advertisement
    ui.setFont(ctx, 11); ctx.fillStyle = P.heading; ctx.fillText(T.resourcesLabel, fx, b.y + 154);
    ui.setFont(ctx, 10);
    T.resources.forEach((pid, i) => {
      const pg = D.pages[pid as PageId] as PageDef;
      this.link(ctx, pg.heading, fx + 12, b.y + 170 + i * 16, `web-res:${pid}`, this.visited.has(pid));
    });
    this.drawFitInAd(ctx, b.x + b.w - 24 - 184, b.y + 154);
    ui.setFont(ctx, 9);
    this.link(ctx, T.ringLink, fx, b.y + 236, 'web-ring:list');
    this.link(ctx, D.directory.label, fx + 248, b.y + 236, 'web-dir');
    // the counter
    const cw = ctx.measureText(D.counter).width + 12;
    ui.px(ctx, b.x + Math.round((b.w - cw) / 2), b.y + b.h - 16, cw, 14, P.counterBg);
    ctx.fillStyle = P.text; ctx.fillText(D.counter, b.x + Math.round((b.w - cw) / 2) + 6, b.y + b.h - 14);
  }

  /** ⚑ S343 / T38 (his answer 2: "only on the Fellowship network page, smaller, designed, less basic") — a 1997
   *  button advertisement for FIT IN: its title, its promise, a PLAY button, and the game itself in miniature (a
   *  block coming down onto a tapering stack; the piece that overhangs blinks — the piece that will be cut off) */
  private drawFitInAd(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const w = 184, h = 66, B = decisions.banner;
    const hot = this.hover === 'web-fitin';
    ui.px(ctx, x, y, w, h, ERA1.navy);
    ui.px(ctx, x + 2, y + 2, w - 4, h - 4, P.adSky);
    ui.px(ctx, x + 2, y + h - 14, w - 4, 12, P.adGrass);
    for (let i = 4; i < w - 4; i += 6) ui.px(ctx, x + i, y + h - 15, 2, 1, P.adGrass);   // the grass's edge
    // the words
    ui.setFont(ctx, 18);
    ctx.fillStyle = ERA1.white; ctx.fillText(B.frames[0], x + 9, y + 7);
    ctx.fillStyle = ERA1.navy; ctx.fillText(B.frames[0], x + 8, y + 6);
    ui.setFont(ctx, 8); ctx.fillStyle = ERA1.navy;
    ui.wrapText(ctx, B.frames[1], 100).slice(0, 2).forEach((l, i) => ctx.fillText(l, x + 8, y + 26 + i * 9));
    ui.button(ctx, x + 8, y + h - 18, 46, 15, `${B.play} >`, { hover: hot });
    // the game in miniature: a dotted mould, the stack, the block coming down
    const gx = x + 122, gy = y + h - 14;
    for (let i = 0; i < 44; i += 3) { ui.px(ctx, gx + i, gy - 44, 1, 1, ERA1.navy); ui.px(ctx, gx + i, gy - 1, 1, 1, ERA1.navy); }
    for (let j = 0; j < 44; j += 3) { ui.px(ctx, gx, gy - 44 + j, 1, 1, ERA1.navy); ui.px(ctx, gx + 43, gy - 44 + j, 1, 1, ERA1.navy); }
    const rows: Array<[number, number, string]> = [[4, 36, P.geoHeading], [8, 28, ERA1.olive], [12, 20, P.dirHeading]];
    rows.forEach(([ox, bw, col], i) => { ui.px(ctx, gx + ox, gy - 9 - i * 9, bw, 8, col); ui.px(ctx, gx + ox, gy - 9 - i * 9, bw, 1, ERA1.white); });
    const blink = reducedMotion() || Math.floor(this.bannerTime * 2) % 2 === 0;
    const by = gy - 40;
    ui.px(ctx, gx + 16, by, 20, 8, ERA1.warnDark);
    if (blink) { ui.px(ctx, gx + 36, by, 10, 8, ERA1.warn); ui.px(ctx, gx + 36, by, 10, 1, ERA1.white); }
    ui.px(ctx, gx + 24, by - 6, 1, 4, ERA1.navy); ui.px(ctx, gx + 28, by - 7, 1, 5, ERA1.navy);   // it is falling
    // the period's AD tag, and who paid for it
    ui.setFont(ctx, 7);
    ui.px(ctx, x + w - 17, y + 2, 15, 9, ERA1.silver); ctx.fillStyle = ERA1.black; ctx.fillText(B.tag, x + w - 15, y + 2);
    ctx.fillStyle = P.dim; ctx.fillText(B.ad, x + w - ctx.measureText(B.ad).width, y + h + 1);
    this.hits.push({ x, y, w, h, id: 'web-fitin' });
  }

  private drawResults(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }, page: number): void {
    ui.setFont(ctx, 16);
    ctx.fillStyle = P.engine; ctx.fillText(D.engine, b.x + 8, b.y + 4);
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(D.resultsFor.replace('{q}', D.query), b.x + 70, b.y + 6);
    ui.setFont(ctx, 8);
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(D.resultsCount.replace('1-6', page === 1 ? '1-6' : '7-12'), b.x + 8, b.y + 22);
    // ⚑ S343 / T38 — Pages: 1 2 3 sit up here now (3 never loads), so every result has room under it
    ui.setFont(ctx, 9);
    const px = b.x + b.w - 150, py = b.y + 21;
    ctx.fillStyle = ERA1.black; ctx.fillText(D.resultsPages, px, py);
    ctx.fillStyle = page === 1 ? ERA1.black : P.link; ctx.fillText('1', px + 40, py);
    ctx.fillStyle = page === 2 ? ERA1.black : P.link; ctx.fillText('2', px + 52, py);
    ctx.fillStyle = ERA1.grey; ctx.fillText('3', px + 64, py);
    if (page === 1) this.link(ctx, `${D.next} >`, px + 82, py, 'web-next');
    // S198 — the category match, above the sites (Yahoo, 1998)
    ui.setFont(ctx, 8); ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(D.directory.resultsCategory, b.x + 8, b.y + 35);
    ui.setFont(ctx, 9);
    this.link(ctx, [...D.directory.path.slice(-3), D.directory.heading].join(' > '), b.x + 80, b.y + 35, 'web-dir');
    ui.px(ctx, b.x + 8, b.y + 49, b.w - 16, 1, ERA1.silver);
    const rs = page === 1 ? D.results : [...D.results].reverse();   // page 2: the same network, again
    rs.forEach((r, i) => {
      const y = b.y + 55 + i * 35;
      ui.setFont(ctx, 10);
      this.link(ctx, r.title, b.x + 12, y, `web-res:${r.id}`, this.visited.has(r.id));
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.black;
      ctx.fillText(r.snippet, b.x + 20, y + 13);
      ui.setFont(ctx, 8);
      ctx.fillStyle = ERA1.ok;
      ctx.fillText(r.url, b.x + 20, y + 23);
    });
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
      const y = b.y + 50 + i * 17;   // S343: clear of the subtitle
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

  /** ⚑ S343 / T38 — every page in one of three period grammars, with room between its parts */
  private drawPage(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }, id: PageId): void {
    const pg = D.pages[id] as PageDef;
    const style: Style = pg.style === 'ring' || pg.style === 'dir' ? pg.style : 'geo';
    const K = INK[style], S = D.styles;
    this.pageBackground(ctx, b, style);
    // the heading, in the page's own manner
    const left = style === 'dir';
    const hx = this.heading(ctx, b, pg.heading, style === 'dir' ? 18 : 22, K, left);
    ui.setFont(ctx, style === 'dir' ? 18 : 22);
    const hw = ctx.measureText(pg.heading).width;
    if (style === 'geo' && pg.badge) this.newBurst(ctx, hx + hw + 10, b.y + 4, S.geo.new);
    if (style === 'ring') { this.ringLogo(ctx, hx - 34, b.y + 6); this.ringLogo(ctx, hx + hw + 8, b.y + 6); }
    let top = b.y + 36;
    if (pg.byline) {
      ui.setFont(ctx, 9); ctx.fillStyle = K.dim;
      ctx.fillText(pg.byline, left ? b.x + 24 : b.x + Math.round((b.w - ctx.measureText(pg.byline).width) / 2), b.y + 34);
      top += 12;
    }
    if (style === 'geo') this.beadRule(ctx, b.x + 40, top, b.w - 80);
    else ui.px(ctx, b.x + 20, top, b.w - 40, 1, style === 'ring' ? P.ringHeading : P.dirEdge);
    // the links block at the foot: the channel (every page), the game (the Root page), then the dossier mark and the ring
    const links: Array<[string, string]> = [[D.join, 'web-join']];
    if (id === 'root') links.push([fixes.rootLink, 'web-rootcause']);
    const linksY = b.y + b.h - 62 - links.length * 17;
    const room = linksY - (top + 10) - (pg.counter ? 22 : 0) - 4;
    const step = Math.max(12, Math.min(16, Math.floor(room / Math.max(1, pg.lines.length))));
    ui.setFont(ctx, 10);
    let y = top + 10;
    for (const l of pg.lines) {
      if (style === 'dir' && l.includes(' · ') && l === l.toUpperCase()) this.cellRow(ctx, b.x + 30, y - 2, l.split(' · '), step);
      else {
        ctx.fillStyle = K.text;
        const lx = style === 'geo' ? b.x + Math.round((b.w - ctx.measureText(l).width) / 2) : b.x + 30;
        ctx.fillText(l, lx, y);
      }
      y += step;
    }
    if (pg.counter) {
      ui.setFont(ctx, 9);
      const w = ctx.measureText(D.counter).width + 12, cx = b.x + Math.round((b.w - w) / 2);
      ui.px(ctx, cx, y, w, 16, style === 'dir' ? P.dirCell : P.counterBg);
      ctx.fillStyle = K.text; ctx.fillText(D.counter, cx + 6, y + 4);
    }
    ui.setFont(ctx, 10);
    links.forEach(([t, lid], i) => {
      const tw = ctx.measureText(t).width;
      this.link(ctx, t, b.x + Math.round((b.w - tw) / 2), linksY + i * 17, lid, false, K);
    });
    // the period's own small print, and the second reading: the practice this page is a trace of
    ui.setFont(ctx, 8); ctx.fillStyle = K.dim;
    const small = style === 'geo' ? `${S.geo.guestbook}   ·   ${S.geo.bestViewed}` : style === 'dir' ? S.dir.updated : `${S.ring.member} ${D.ringBar.name}`;
    ctx.fillText(small, b.x + Math.round((b.w - ctx.measureText(small).width) / 2), b.y + b.h - 62);
    const pr = pg.practice ? practiceOf(pg.practice) : undefined;
    if (pr) {
      const t = fixes.dossier.replace('{item}', pg.practice === 'profile' ? fixes.questionnaire : pr.title.toLowerCase());
      ctx.fillStyle = K.dim;
      ui.wrapText(ctx, t, b.w - 48).slice(0, 1).forEach((ln) => ctx.fillText(ln, b.x + 24, b.y + b.h - 51));
    }
    this.ringBar(ctx, b, style);
  }

  private pageBackground(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }, style: Style): void {
    if (style === 'geo') {
      ui.px(ctx, b.x, b.y, b.w, b.h, P.geoBg);
      for (let y = 4; y < b.h; y += 16) for (let x = (y / 16) % 2 ? 12 : 4; x < b.w; x += 16) { ui.px(ctx, b.x + x, b.y + y, 2, 2, P.geoTile); ui.px(ctx, b.x + x + 2, b.y + y + 2, 1, 1, P.geoTile); }
    } else if (style === 'ring') {
      ui.px(ctx, b.x, b.y, b.w, b.h, P.ringBg);
      for (let i = 0; i < 70; i++) { const sx = (i * 97 + 13) % b.w, sy = (i * 53 + 7) % b.h; ui.px(ctx, b.x + sx, b.y + sy, 1, 1, i % 5 ? ERA1.grey : ERA1.white); }
    } else ui.px(ctx, b.x, b.y, b.w, b.h, ERA1.white);
  }
  private beadRule(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
    for (let i = 0, k = 0; i < w - 4; i += 6, k++) { const c = P.geoBeads[k % P.geoBeads.length]; ui.px(ctx, x + i + 1, y - 2, 3, 5, c); ui.px(ctx, x + i, y - 1, 5, 3, c); }
  }
  /** the period's NEW! burst, an eight-point star of pixels */
  private newBurst(ctx: CanvasRenderingContext2D, x: number, y: number, text: string): void {
    ui.px(ctx, x + 2, y + 4, 28, 12, P.construction); ui.px(ctx, x + 6, y, 20, 20, P.construction);
    ui.px(ctx, x, y + 8, 32, 4, P.construction); ui.px(ctx, x + 14, y - 3, 4, 26, P.construction);
    ui.setFont(ctx, 8); ctx.fillStyle = ERA1.warn; ctx.fillText(text, x + 5, y + 6);
  }
  /** the ring's mark: three linked rings */
  private ringLogo(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const ring = (cx: number, cy: number, col: string): void => {
      ui.px(ctx, cx - 3, cy - 6, 6, 2, col); ui.px(ctx, cx - 3, cy + 4, 6, 2, col);
      ui.px(ctx, cx - 6, cy - 3, 2, 6, col); ui.px(ctx, cx + 4, cy - 3, 2, 6, col);
      ui.px(ctx, cx - 5, cy - 5, 2, 2, col); ui.px(ctx, cx + 3, cy - 5, 2, 2, col); ui.px(ctx, cx - 5, cy + 3, 2, 2, col); ui.px(ctx, cx + 3, cy + 3, 2, 2, col);
    };
    ring(x + 6, y + 7, P.ringText); ring(x + 14, y + 7, P.ringLink); ring(x + 22, y + 7, P.ringHeading);
  }
  /** a directory's table row: one bordered cell per entry */
  private cellRow(ctx: CanvasRenderingContext2D, x: number, y: number, cells: string[], h: number): void {
    ui.setFont(ctx, 9);
    let cx = x;
    for (const t of cells) {
      const w = Math.ceil(ctx.measureText(t).width) + 10;
      ui.px(ctx, cx, y, w, h - 1, P.dirEdge); ui.px(ctx, cx + 1, y + 1, w - 2, h - 3, P.dirCell);
      ctx.fillStyle = P.link; ctx.fillText(t, cx + 5, y + 2);
      cx += w + 2;
    }
    ui.setFont(ctx, 10);
  }

  /** the ring's bar, on every page */
  private ringBar(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }, style: Style = 'geo'): void {
    const ry = b.y + b.h - 38;
    const dark = style === 'ring';
    ui.px(ctx, b.x + 20, ry, b.w - 40, 32, dark ? P.ringHeading : P.dirEdge);
    ui.px(ctx, b.x + 21, ry + 1, b.w - 42, 30, dark ? P.ringPanel : P.ringBar);
    ui.setFont(ctx, 9);
    ctx.fillStyle = dark ? P.ringText : P.ringInk;
    const name = D.ringBar.name;
    ctx.fillText(name, b.x + Math.round((b.w - ctx.measureText(name).width) / 2), ry + 3);
    const items: Array<[string, string]> = [[D.ringBar.prev, 'prev'], [D.ringBar.random, 'random'], [D.ringBar.list, 'list'], [D.ringBar.next, 'next']];
    const slot = (b.w - 40) / items.length;
    items.forEach(([t, k], i) => {
      const tw = ctx.measureText(t).width;
      this.link(ctx, t, b.x + 20 + i * slot + Math.round((slot - tw) / 2), ry + 17, `web-ring:${k}`, false, dark ? INK.ring : P);
    });
  }
}

/** the picture on each toolbar button, drawn in pixels (grey when the button is dead) */
export function drawWeb1997Icon(ctx: CanvasRenderingContext2D, k: string, x: number, y: number, live: boolean): void {
  const c = live ? P.iconInk : ERA1.grey;
  const r = (dx: number, dy: number, w: number, h: number) => ui.px(ctx, x + dx, y + dy, w, h, c);
  if (k === 'back') { for (let i = 0; i < 5; i++) r(4 - i, 5 - i, 1, 1 + i * 2); r(5, 4, 6, 3); }
  else if (k === 'fwd') { for (let i = 0; i < 5; i++) r(7 + i, 5 - i, 1, 1 + i * 2); r(1, 4, 6, 3); }
  else if (k === 'reload') { r(2, 2, 8, 2); r(2, 2, 2, 8); r(2, 8, 8, 2); r(8, 5, 2, 5); r(9, 1, 3, 3); }
  else if (k === 'home') { for (let i = 0; i < 5; i++) r(5 - i, i, 2 + i * 2, 1); r(2, 5, 8, 5); ui.px(ctx, x + 5, y + 7, 2, 3, P.logoBg); }
  else if (k === 'search') { r(2, 1, 6, 2); r(1, 2, 2, 5); r(7, 2, 2, 5); r(2, 7, 6, 2); r(8, 8, 3, 3); }
  else { r(2, 0, 8, 4); r(0, 4, 12, 5); r(2, 9, 8, 2); }
}
