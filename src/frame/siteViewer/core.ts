/**
 * ⚑ S291 — THE SITE VIEWER, ITS CORE. The four era websites (public/sites/) drawn on a canvas inside the piece, so the
 * same window can hang over the browser's 3D view AND in front of the head in a headset (DOM cannot be shown there, and an
 * iframe would be a page inside the piece). One state machine, one renderer, two mounts (domMount.ts, xrMount.ts).
 *
 * It owns: which year (or the hub of four doors), which tab, how far it is scrolled, what is hovered, and the press
 * resolver. It owns NO storage and makes NO request: images are the project's own static files (public/library,
 * public/assets/close), loaded like every other picture in the piece. Links to other sites are SHOWN as text with their
 * address; a press hands them to the host, which opens a tab in the browser and only notes the address in a headset.
 * It draws only when something changed (scroll, tab, hover, an image arriving); the mount uploads the texture then.
 */
import { MODEL, YEARS, type Block, type TabId } from './model';
import { SKINS, type View, type Year } from './skins';
import { layoutDoc, type Doc, type DocHit, type Op, type Rect, wrap } from './layout';
import { drawScrollbar, drawSiteHeader, drawStatus, drawWindow, roundRect, SCROLL_W, type DrawEnv, type Hit } from './frame';

export interface ViewerHost {
  /** a browser can open a new tab with the page version; a headset cannot */
  canOpenPage: boolean;
  close(): void;
  minimise(): void;
  /** a press on an outside source: the browser opens a tab, the headset only notes the address */
  openUrl(url: string): void;
  /** a press on a page of this site's own (relative path from the app root) */
  openPage(path: string): void;
  audio: { toggle(file: string): void; playing(): string | null };
  /** something changed that the mount must redraw (an image arrived, audio ended) */
  changed(): void;
}

export type Target = View;

export class ViewerCore {
  view: View = 'hub';
  tab: TabId = 'story';
  scroll = 0;
  hover = '';
  private hits: Hit[] = [];
  private docHits: (DocHit & { sx: number; sy: number })[] = [];
  private vp: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private maxScroll = 0;
  private thumb: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private doc: Doc | null = null;
  private docKey = '';
  private images = new Map<string, HTMLImageElement>();
  private toast: { text: string; until: number } | null = null;
  /** debug/review: the last painted size */
  lastSize = { w: 0, h: 0 };

  constructor(private host: ViewerHost) {}

  // ── state ──
  open(target: View): void {
    this.view = target; this.tab = 'story'; this.scroll = 0; this.hover = ''; this.doc = null;
  }
  setTab(t: TabId): void { if (t === this.tab) return; this.tab = t; this.scroll = 0; this.doc = null; }
  setView(v: View): void { if (v === this.view) return; this.open(v); }
  note(text: string, seconds = 9): void { this.toast = { text, until: performance.now() + seconds * 1000 }; }
  /** the page version of what is showing, as a path from the app root */
  pagePath(): string { return this.view === 'hub' ? 'sites/index.html' : `sites/${this.view}/index.html`; }
  /** true when a toast has just expired and the mount should repaint once */
  tickToast(now: number): boolean {
    if (this.toast && now > this.toast.until) { this.toast = null; return true; }
    return false;
  }

  // ── content ──
  private blocks(): Block[] {
    const foot: Block[] = [{ k: 'small', t: MODEL.contentNote }, { k: 'small', t: `${MODEL.records} · Updated ${MODEL.updated}` }];
    if (this.view === 'hub') {
      const H = MODEL.hub;
      return [
        { k: 'h2', t: H.title }, { k: 'lede', t: H.lede }, { k: 'h3', t: H.choose }, { k: 'doors', items: H.doors },
        { k: 'h3', t: H.alsoTitle },
        { k: 'pagelink', label: H.oldSources, note: H.oldSourcesNote, href: 'sources/index.html' },
        { k: 'media', title: H.filmTitle, what: H.filmWhat, file: 'assets/video/lambyos_welcome_home.mp4', type: 'video', credit: H.filmCredit, lyrics: [], lyricsTitle: '' },
        { k: 'h3', t: H.lexiconTitle }, { k: 'p', t: H.lexiconLead }, { k: 'links', items: H.lexiconLinks },
        { k: 'h3', t: H.aboutTitle }, ...H.about.map((t) => ({ k: 'p' as const, t })),
        { k: 'h3', t: H.howTitle }, { k: 'ul', items: H.how.map((t) => ({ t })) },
        ...foot
      ];
    }
    return [...MODEL.eras[this.view].tabs[this.tab], ...foot];
  }
  private image(src: string): HTMLImageElement {
    let img = this.images.get(src);
    if (!img) {
      img = new Image();
      img.onload = () => this.host.changed();
      img.src = src;   // the project's own static file, relative to the page
      this.images.set(src, img);
    }
    return img;
  }

  // ── drawing ──
  render(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.lastSize = { w: W, h: H };
    const skin = SKINS[this.view];
    const hits: Hit[] = [];
    this.hits = hits;
    const env: DrawEnv = { ctx, skin, W, H, hits, hover: this.hover };
    const era = this.view === 'hub' ? null : MODEL.eras[this.view];
    const title = era ? `${era.heading} — ${MODEL.siteName}` : MODEL.hub.title;
    const years = [
      { id: 'view:hub', label: 'Four years', active: this.view === 'hub', tip: 'The four websites' },
      ...YEARS.map((y) => ({ id: `view:${y}`, label: y, active: this.view === y, tip: `Open the ${y} website` }))
    ];
    const reg = drawWindow(env, title, years, this.host.canOpenPage, 'Opens the same site as a web page in a new tab');
    const vp0 = drawSiteHeader(env, reg.site, this.view, {
      heading: era?.heading ?? '', tagline: era?.tagline ?? '', siteName: MODEL.siteName, projectLine: MODEL.projectLine,
      tabs: MODEL.tabIds.map((id) => ({ id, label: MODEL.tabs[id], active: id === this.tab })), glance: era?.glance ?? []
    });
    this.vp = vp0;
    const textW = vp0.w - SCROLL_W;
    const key = `${this.view}|${this.tab}|${Math.round(textW)}`;
    if (!this.doc || key !== this.docKey) { this.doc = layoutDoc(ctx, this.blocks(), textW, skin, this.host.canOpenPage); this.docKey = key; }
    const doc = this.doc;
    this.maxScroll = Math.max(0, doc.h - vp0.h);
    this.scroll = Math.max(0, Math.min(this.maxScroll, Math.round(this.scroll)));

    // the document, clipped to its viewport and moved by the scroll
    ctx.save();
    ctx.beginPath(); ctx.rect(vp0.x, vp0.y, textW, vp0.h); ctx.clip();
    ctx.fillStyle = skin.contentBg; ctx.fillRect(vp0.x, vp0.y, textW, vp0.h);
    ctx.translate(vp0.x, vp0.y - this.scroll);
    const hovered = this.hover.startsWith('d') ? doc.hits.find((h) => h.id === this.hover) : undefined;
    if (hovered) { ctx.fillStyle = skin.link; ctx.globalAlpha = 0.14; ctx.fillRect(hovered.x, hovered.y, hovered.w, hovered.h); ctx.globalAlpha = 1; }
    const top = this.scroll - 80, bottom = this.scroll + vp0.h + 80;
    for (const op of doc.ops) {
      const oh = op.t === 'text' ? op.lh : op.t === 'rect' || op.t === 'chip' || op.t === 'img' || op.t === 'play' ? op.h : 0;
      if (op.y + oh < top || op.y > bottom) continue;
      this.drawOp(ctx, op, skin.font);
    }
    ctx.restore();
    this.docHits = doc.hits.map((h) => ({ ...h, sx: vp0.x + h.x, sy: vp0.y + h.y - this.scroll }));

    const sb = drawScrollbar(env, vp0, this.scroll, this.maxScroll);
    this.thumb = sb.thumb;

    const hit = this.hover ? [...hits.map((h) => ({ id: h.id, tip: h.tip })), ...doc.hits.map((h) => ({ id: h.id, tip: h.tip }))].find((h) => h.id === this.hover) : undefined;
    const live = this.toast && performance.now() <= this.toast.until ? this.toast.text : '';
    const left = live ? '' : (hit ? hit.tip : this.view === 'hub' ? 'Choose a year.' : MODEL.tabsLabel);
    if (live) this.drawToast(ctx, live, reg.status, skin);
    const pct = this.maxScroll <= 0 ? 'all shown' : `${Math.round((this.scroll / this.maxScroll) * 100)}%`;
    drawStatus(env, reg.status, left, pct);
  }

  /** a note (an address to open later, a page that opens outside the headset): wrapped, large, over the foot of the window */
  private drawToast(ctx: CanvasRenderingContext2D, text: string, status: Rect, skin: (typeof SKINS)[View]): void {
    const font = `700 22px ${skin.font}`;
    const lines = wrap(ctx, text, font, status.w - 90);
    const lh = 30, h = lines.length * lh + 28, y = status.y - h - 10, x = status.x + 20, w = status.w - 40;
    ctx.fillStyle = skin.chrome.bar; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = skin.chrome.barInk; ctx.lineWidth = 3; ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    ctx.font = font; ctx.fillStyle = skin.chrome.barInk; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, x + 20, y + 14 + lh / 2 + i * lh));
  }

  private drawOp(ctx: CanvasRenderingContext2D, op: Op, face: string): void {
    switch (op.t) {
      case 'rect': {
        if (op.r) { roundRect(ctx, op.x, op.y, op.w, op.h, op.r); if (op.fill) { ctx.fillStyle = op.fill; ctx.fill(); } if (op.stroke) { ctx.strokeStyle = op.stroke; ctx.lineWidth = op.lw ?? 1; ctx.stroke(); } }
        else {
          if (op.fill) { ctx.fillStyle = op.fill; ctx.fillRect(op.x, op.y, op.w, op.h); }
          if (op.stroke) { ctx.strokeStyle = op.stroke; ctx.lineWidth = op.lw ?? 1; ctx.strokeRect(op.x + (op.lw ?? 1) / 2, op.y + (op.lw ?? 1) / 2, op.w - (op.lw ?? 1), op.h - (op.lw ?? 1)); }
        }
        return;
      }
      case 'text': {
        ctx.font = op.font; ctx.fillStyle = op.color; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(op.s, op.x, op.y + op.lh / 2);
        if (op.u) { const w = ctx.measureText(op.s).width; ctx.fillRect(op.x, op.y + op.lh / 2 + Math.round(op.lh * 0.28), w, 2); }
        return;
      }
      case 'chip': {
        roundRect(ctx, op.x, op.y, op.w, op.h, 4); ctx.fillStyle = op.bg; ctx.fill();
        ctx.font = op.font; ctx.fillStyle = op.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(op.s, op.x + op.w / 2, op.y + op.h / 2 + 1); ctx.textAlign = 'left';
        return;
      }
      case 'img': {
        const img = this.image(op.src);
        if (img.complete && img.naturalWidth > 0) { ctx.drawImage(img, op.x, op.y, op.w, op.h); return; }
        const skin = SKINS[this.view];
        ctx.fillStyle = skin.pageBg; ctx.fillRect(op.x, op.y, op.w, op.h);
        ctx.strokeStyle = skin.rule; ctx.lineWidth = 2; ctx.strokeRect(op.x + 1, op.y + 1, op.w - 2, op.h - 2);
        ctx.font = `18px ${face}`; ctx.fillStyle = skin.dim; ctx.textBaseline = 'middle';
        wrap(ctx, op.alt, `18px ${face}`, op.w - 30).slice(0, 5).forEach((l, i) => ctx.fillText(l, op.x + 15, op.y + 30 + i * 26));
        return;
      }
      case 'play': {
        const skin = SKINS[this.view];
        const playing = this.host.audio.playing() === op.file;
        const hv = this.hover !== '' && this.docHits.some((h) => h.id === this.hover && h.act.type === 'audio' && h.act.file === op.file);
        roundRect(ctx, op.x, op.y, op.w, op.h, skin.os === 'w95' || skin.os === 'xp' ? 4 : 8);
        ctx.fillStyle = playing || hv ? skin.link : skin.card; ctx.fill(); ctx.strokeStyle = skin.link; ctx.lineWidth = 3; ctx.stroke();
        const ink = playing || hv ? skin.contentBg : skin.link;
        ctx.fillStyle = ink;
        if (playing) ctx.fillRect(op.x + 22, op.y + 14, 18, 20);
        else { ctx.beginPath(); ctx.moveTo(op.x + 22, op.y + 12); ctx.lineTo(op.x + 40, op.y + 24); ctx.lineTo(op.x + 22, op.y + 36); ctx.closePath(); ctx.fill(); }
        ctx.font = op.font; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(playing ? 'Stop' : op.label, op.x + 56, op.y + 25);
      }
    }
  }

  // ── input (logical px of the painted window) ──
  /** returns true when the hover changed (the mount repaints) */
  move(x: number, y: number): boolean {
    const id = this.idAt(x, y);
    if (id === this.hover) return false;
    this.hover = id;
    return true;
  }
  leave(): boolean { if (!this.hover) return false; this.hover = ''; return true; }
  private idAt(x: number, y: number): string {
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const h = this.hits[i];
      if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h.id;
    }
    if (this.inDoc(x, y)) for (const h of this.docHits) {
      if (x >= h.sx && x <= h.sx + h.w && y >= h.sy && y <= h.sy + h.h) return h.id;
    }
    return '';
  }
  private inDoc(x: number, y: number): boolean { return x >= this.vp.x && x < this.vp.x + this.vp.w - SCROLL_W && y >= this.vp.y && y <= this.vp.y + this.vp.h; }
  /** is this point over the document (for wheel/drag-scroll)? */
  overDoc(x: number, y: number): boolean { return this.inDoc(x, y); }
  /** a press; returns whether the window took it (so a headset ray that lands on it never falls through) */
  press(x: number, y: number): boolean {
    const id = this.idAt(x, y);
    if (!id) return false;
    this.act(id, y);
    return true;
  }
  private act(id: string, y: number): void {
    if (id === 'min') { this.host.minimise(); return; }
    if (id === 'close') { this.host.close(); return; }
    if (id === 'openpage') { this.host.openPage(this.pagePath()); return; }
    if (id.startsWith('view:')) { this.setView(id.slice(5) as View); return; }
    if (id.startsWith('tab:')) { this.setTab(id.slice(4) as TabId); return; }
    if (id === 'sc:up') { this.scrollBy(-160); return; }
    if (id === 'sc:down') { this.scrollBy(160); return; }
    if (id === 'sc:track') { this.scrollBy(y < this.thumb.y ? -(this.vp.h - 90) : y > this.thumb.y + this.thumb.h ? this.vp.h - 90 : 0); return; }
    const h = this.docHits.find((d) => d.id === id);
    if (!h) return;
    const a = h.act;
    if (a.type === 'url') this.host.openUrl(a.url);
    else if (a.type === 'page') this.host.openPage(a.href);
    else if (a.type === 'audio') this.host.audio.toggle(a.file);
    else if (a.type === 'door') this.setView(a.year as Year);
  }
  /** returns true if the offset moved */
  scrollBy(dy: number): boolean {
    const next = Math.max(0, Math.min(this.maxScroll, Math.round(this.scroll + dy)));
    if (next === this.scroll) return false;
    this.scroll = next;
    return true;
  }
  scrollTo(y: number): boolean { return this.scrollBy(y - this.scroll); }
  get pageStep(): number { return Math.max(120, this.vp.h - 90); }
  /** review tools: scroll so the first line containing `s` sits near the top; true if found */
  scrollToText(s: string): boolean {
    const op = this.doc?.ops.find((o) => o.t === 'text' && o.s.includes(s));
    if (!op) return false;
    this.scroll = Math.max(0, Math.min(this.maxScroll, op.y - 30));
    return true;
  }
  /** review tools: the centre of a hit (a window button, a tab, a link) in logical px */
  centerOf(id: string): { x: number; y: number } | null {
    const h = this.hits.find((k) => k.id === id);
    if (h) return { x: h.x + h.w / 2, y: h.y + h.h / 2 };
    const d = this.docHits.find((k) => k.id === id);
    return d ? { x: d.sx + d.w / 2, y: d.sy + d.h / 2 } : null;
  }
  /** review tools: the id of the first document hit of a kind that is on screen */
  firstDocHit(type: string): string | null { return this.docHits.find((h) => h.act.type === type && h.sy >= this.vp.y && h.sy + h.h <= this.vp.y + this.vp.h)?.id ?? null; }
  /** review tools: the toast showing now, or '' */
  toastText(): string { return this.toast && performance.now() <= this.toast.until ? this.toast.text : ''; }
  /** for review tools */
  info(): { view: View; tab: TabId; scroll: number; maxScroll: number; docH: number; vp: Rect } {
    return { view: this.view, tab: this.tab, scroll: this.scroll, maxScroll: this.maxScroll, docH: this.doc?.h ?? 0, vp: this.vp };
  }
}
