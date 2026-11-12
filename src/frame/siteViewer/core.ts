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
import { FILM, SKINS, isMachineView, type View, type Year } from './skins';
import { drawMachinePage, ReceiptPrint, LexiconPage, MACHINE_COPY } from './machine';
import lexStrings from '../../../data/strings/lexicon.json';
import { FILM_BAR, FILM_INSET, layoutDoc, type Doc, type DocHit, type Op, type Rect, wrap } from './layout';
import type { FilmState } from './audio';
import { drawScrollbar, drawSiteHeader, drawStatus, drawWindow, roundRect, SCROLL_W, type DrawEnv, type Hit } from './frame';
import { siteViewerBus } from './bus';

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
  /** ⚑ S371 — the one film (audio.ts `viewerFilm`): its pictures are drawn by the window itself */
  film: FilmApi;
  /** ⚑ S371 — the headset: the mount draws a loaded film's rect on a plane of its own (so only that rect is uploaded
   *  while it plays), and the window leaves that rect clear for it */
  filmLayer?: boolean;
  /** something changed that the mount must redraw (an image arrived, audio ended) */
  changed(): void;
}

export interface FilmApi {
  file(): string | null;
  state(file?: string): FilmState;
  video(): HTMLVideoElement | null;
  hasFrame(): boolean;
  time(): { t: number; dur: number };
  toggle(file: string): void;
  seek(file: string, frac: number): void;
  stop(): void;
}
type FilmOp = Extract<Op, { t: 'film' }>;
/** m:ss */
const clock = (s: number): string => { const n = Math.max(0, Math.floor(s)); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`; };

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
  /** ⚑ S371 — the film on screen at the last paint (its op, and where it sat in the window), for the partial repaint */
  private filmAt: { op: FilmOp; sx: number; sy: number } | null = null;
  /** debug/review: the last painted size */
  lastSize = { w: 0, h: 0 };
  /** ⚑ S378 — the pages before this one (the machine's page → its Receipt, the Lexicon, the four years; the Lexicon → a
   *  year's words): "Back" in the toolbar returns to them. A fresh open empties it. */
  private history: { view: View; tab: TabId; scroll: number }[] = [];
  /** ⚑ S378 — opened from the Close's computer panel: the window is LambyOS's, its toolbar the machine's three pages */
  private machineMode = false;
  /** ⚑ S378 — the machine's pages' own state: the printout, and the one Lexicon */
  private receipt = new ReceiptPrint();
  readonly lexicon: LexiconPage;
  /** ⚑ S378 — the machine's page's height at the last paint (it scrolls on a short window) */
  private machineH = 0;

  constructor(private host: ViewerHost) {
    this.lexicon = new LexiconPage(() => this.host.changed());
  }

  // ── state ──
  open(target: View): void {
    // ⚑ S372 — a caller may ask for a tab (siteViewerBus.openAt: the Lexicon's link to a year's "The words")
    const want = siteViewerBus.nextTab as TabId | null;
    if (this.view === 'lexicon' && target !== 'lexicon') this.lexicon.stop();
    this.view = target; this.tab = want && target !== 'hub' && !isMachineView(target) && MODEL.tabIds.includes(want) ? want : 'story';
    this.scroll = 0; this.hover = ''; this.doc = null;
    this.leaveFilm();   // S371
    // ⚑ S378 — a fresh open: no pages behind it; the machine's family opens on its first face
    this.history = [];
    this.machineMode = target === 'machine';
    this.enterMachineView(target);
  }
  /** ⚑ S378 — move to another page and keep this one behind "Back" (a page's own button, a Lexicon word's year link) */
  go(target: View): void {
    if (target === this.view) return;
    this.history.push({ view: this.view, tab: this.tab, scroll: this.scroll });
    if (this.history.length > 12) this.history.shift();
    this.switchTo(target);
  }
  /** ⚑ S378 — back to the page before; false when there is none */
  back(): boolean {
    const h = this.history.pop();
    if (!h) return false;
    this.switchTo(h.view, h.tab);
    this.scroll = h.view === 'receipt' ? this.scroll : h.scroll;
    return true;
  }
  get canGoBack(): boolean { return this.history.length > 0; }
  private switchTo(target: View, tab?: TabId): void {
    if (this.view === 'lexicon' && target !== 'lexicon') this.lexicon.stop();
    const want = (tab ?? siteViewerBus.nextTab) as TabId | null;
    this.view = target; this.tab = want && target !== 'hub' && !isMachineView(target) && MODEL.tabIds.includes(want) ? want : 'story';
    this.scroll = 0; this.hover = ''; this.doc = null;
    this.leaveFilm();
    this.enterMachineView(target, tab !== undefined);
  }
  private enterMachineView(target: View, returning = false): void {
    if (target === 'receipt' && !returning) this.receipt.reset();
    if (target === 'lexicon' && !returning) this.lexicon.reset();
  }
  /** ⚑ S378 — the window closed: a word's sound stops with it */
  closed(): void { this.lexicon.stop(); }
  /** ⚑ S378 — per frame: the printer's clock; true when the window must repaint */
  tick(dt: number): boolean { return this.view === 'receipt' && this.receipt.tick(dt); }
  setTab(t: TabId): void { if (t === this.tab) return; this.tab = t; this.scroll = 0; this.doc = null; this.leaveFilm(); }
  /** ⚑ S371 — a film belongs to the page it is on: leaving the page (another tab, another year) stops it; a track plays on */
  private leaveFilm(): void { this.filmAt = null; if (this.host.film.file()) this.host.film.stop(); }
  setView(v: View): void {
    if (v === this.view) return;
    // ⚑ S378 — a tab within the machine's window, or a year within the four sites, keeps the pages behind it
    const keep = this.history, mm = this.machineMode;
    this.open(v);
    this.history = keep; this.machineMode = mm || v === 'machine';
  }
  note(text: string, seconds = 9): void { this.toast = { text, until: performance.now() + seconds * 1000 }; }
  /** the page version of what is showing, as a path from the app root */
  pagePath(): string { return this.view === 'hub' || isMachineView(this.view) ? 'sites/index.html' : `sites/${this.view}/index.html`; }
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
        // ⚑ S371 — the sound and film that belong to the whole piece: the opening film, then the music of no one year
        { k: 'h3', t: H.soundTitle }, { k: 'p', t: H.soundLead }, H.film, ...H.sound,
        { k: 'h3', t: H.lexiconTitle }, { k: 'p', t: H.lexiconLead }, { k: 'links', items: H.lexiconLinks },
        { k: 'h3', t: H.aboutTitle }, ...H.about.map((t) => ({ k: 'p' as const, t })),
        { k: 'h3', t: H.howTitle }, { k: 'ul', items: H.how.map((t) => ({ t })) },
        ...foot
      ];
    }
    if (isMachineView(this.view)) return foot;   // S378: the machine's pages are drawn by machine.ts, never laid out as a doc
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
    // ⚑ S378 — "Back", first in the toolbar, whenever there is a page behind this one
    const back = this.history.length ? [{ id: 'back', label: `◄ ${MACHINE_COPY.back}`, active: false, tip: MACHINE_COPY.tips.back }] : [];
    if (isMachineView(this.view)) { this.renderMachine(env, back); return; }
    const era = this.view === 'hub' ? null : MODEL.eras[this.view];
    const title = era ? `${era.heading} — ${MODEL.siteName}` : MODEL.hub.title;
    const years = [
      ...back,
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
    if (!this.doc || key !== this.docKey) { this.doc = layoutDoc(ctx, this.blocks(), textW, skin, this.host.canOpenPage, true); this.docKey = key; }
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
    this.filmAt = null;
    for (const op of doc.ops) {
      const oh = op.t === 'text' ? op.lh : op.t === 'rect' || op.t === 'chip' || op.t === 'img' || op.t === 'play' || op.t === 'film' ? op.h : 0;
      if (op.y + oh < top || op.y > bottom) continue;
      if (op.t === 'film' && op.y + op.h > this.scroll && op.y < this.scroll + vp0.h) this.filmAt = { op, sx: vp0.x + op.x, sy: vp0.y + op.y - this.scroll };
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

  /**
   * ⚑ S378 — THE MACHINE'S WINDOW: LambyOS's own (machine.ts). Its toolbar is Back (when a page is behind) and, opened
   * from the Close's computer panel, the machine's three pages; the Lexicon opened on its own (the menu, the setup, its
   * star) has only Back. No "open as a web page": these pages exist only inside the piece.
   */
  private renderMachine(env: DrawEnv, back: { id: string; label: string; active: boolean; tip: string }[]): void {
    const { ctx } = env;
    const M = MACHINE_COPY;
    const tabs = this.machineMode
      ? (['machine', 'receipt', 'lexicon'] as const).map((v) => ({ id: `view:${v}`, label: M.tabs[v], active: this.view === v, tip: M.tips[v === 'machine' ? 'machine' : v] }))
      : [];
    const title = this.machineMode || this.view !== 'lexicon' ? M.windowTitle : (lexStrings as { star: string }).star;
    const items = [...back, ...tabs];
    const reg = drawWindow(env, title, items, false, '');
    // ⚑ S379 — opened on its own (the menu, the setup, its star) the Lexicon has no Back and no tabs: the empty toolbar
    //   strip is given to the page instead of standing there grey
    const site = items.length ? reg.site : { x: reg.site.x, y: reg.toolbar.y, w: reg.site.w, h: reg.site.h + reg.toolbar.h };
    this.docHits = [];
    this.thumb = { x: 0, y: 0, w: 0, h: 0 };
    if (this.view === 'machine') {
      const vp = { x: site.x, y: site.y, w: site.w, h: site.h };
      this.vp = vp;
      this.maxScroll = Math.max(0, this.machineH - vp.h);
      this.scroll = Math.max(0, Math.min(this.maxScroll, Math.round(this.scroll)));
      const inner = this.maxScroll > 0 ? { ...vp, w: vp.w - SCROLL_W } : vp;
      this.machineH = drawMachinePage(env, inner, this.scroll);
      this.maxScroll = Math.max(0, this.machineH - vp.h);
      if (this.maxScroll > 0) this.thumb = drawScrollbar(env, vp, this.scroll, this.maxScroll).thumb;
    } else if (this.view === 'receipt') {
      this.vp = { ...site };
      const r = this.receipt.draw(env, site, this.scroll, SCROLL_W);
      this.maxScroll = this.receipt.maxScroll;
      if (r.wantScroll !== null) this.scroll = r.wantScroll;
      this.scroll = Math.max(0, Math.min(this.maxScroll, Math.round(this.scroll)));
      this.thumb = drawScrollbar(env, { x: site.x, y: site.y, w: site.w, h: site.h }, this.scroll, this.maxScroll).thumb;
    } else {
      this.vp = { ...site };
      this.maxScroll = 0; this.scroll = 0;
      this.lexicon.draw(env, site);
    }
    const hit = this.hover ? this.hits.find((h) => h.id === this.hover) : undefined;
    const live = this.toast && performance.now() <= this.toast.until ? this.toast.text : '';
    if (live) this.drawToast(ctx, live, reg.status, SKINS[this.view]);
    const left = live ? '' : hit?.tip || (this.view === 'machine' ? M.status : this.view === 'receipt' ? (this.receipt.printing ? M.tips.printing : M.tips.printed) : M.tips.lexicon);
    drawStatus(env, reg.status, left, this.view === 'receipt' && this.maxScroll > 0 ? `${Math.round((this.scroll / this.maxScroll) * 100)}%` : '');
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
        // a track: Play / Stop; a film (S371): Play the film / Pause / Play / Play again
        const fs = op.kind === 'film' ? this.host.film.state(op.file) : 'idle';
        const playing = op.kind === 'film' ? fs === 'playing' || fs === 'loading' : this.host.audio.playing() === op.file;
        const hv = this.hover !== '' && this.docHits.some((h) => h.id === this.hover && (h.act.type === 'audio' || h.act.type === 'film') && h.act.file === op.file);
        roundRect(ctx, op.x, op.y, op.w, op.h, skin.os === 'w95' || skin.os === 'xp' ? 4 : 8);
        ctx.fillStyle = playing || hv ? skin.link : skin.card; ctx.fill(); ctx.strokeStyle = skin.link; ctx.lineWidth = 3; ctx.stroke();
        const ink = playing || hv ? skin.contentBg : skin.link;
        ctx.fillStyle = ink;
        if (playing && op.kind === 'film') { ctx.fillRect(op.x + 22, op.y + 13, 7, 22); ctx.fillRect(op.x + 34, op.y + 13, 7, 22); }
        else if (playing) ctx.fillRect(op.x + 22, op.y + 14, 18, 20);
        else if (fs !== 'error') { ctx.beginPath(); ctx.moveTo(op.x + 22, op.y + 12); ctx.lineTo(op.x + 40, op.y + 24); ctx.lineTo(op.x + 22, op.y + 36); ctx.closePath(); ctx.fill(); }
        ctx.font = op.font; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        const label = op.kind === 'film'
          ? (playing ? 'Pause' : fs === 'paused' ? 'Play' : fs === 'ended' ? 'Play again' : fs === 'error' ? 'Cannot play here' : op.label)
          : (playing ? 'Stop' : op.label);
        ctx.fillText(label, op.x + (fs === 'error' ? 22 : 56), op.y + 25);
        return;
      }
      case 'film': {
        // in the headset, a film that is loaded is drawn by the mount on its own plane, under this clear rect
        if (this.host.filmLayer && this.host.film.state(op.file) !== 'idle') { ctx.clearRect(op.x, op.y, op.w, op.h); return; }
        this.paintFilm(ctx, op.x, op.y, op);
      }
    }
  }

  /**
   * ⚑ S371 — A FILM'S SCREEN: the picture (the film's current frame, drawn from the hidden video element), and under it
   * the progress line with the time gone and the length. Before the first press it is a poster (a round play button and
   * "Play the film"): nothing loads until the press. Paused, the picture stays with the button over it; at the end,
   * "Play again". Drawn at (x, y) in the context's own units, so the window, the browser's per-frame repaint and the
   * headset's film plane all draw the same thing.
   */
  private paintFilm(ctx: CanvasRenderingContext2D, x: number, y: number, op: FilmOp): void {
    const F = this.host.film;
    const st = F.state(op.file);
    const face = SKINS[this.view].font;
    const { w, h, pic } = op;
    ctx.fillStyle = FILM.screen; ctx.fillRect(x, y, w, h);
    const v = st !== 'idle' && F.hasFrame() ? F.video() : null;
    if (v) ctx.drawImage(v, x, y, w, pic);
    const cx = x + w / 2, cy = y + pic / 2;
    const word = st === 'idle' ? 'Play the film' : st === 'loading' && !v ? 'Loading the film…' : st === 'paused' ? 'Paused' : st === 'ended' ? 'Play again'
      : st === 'error' ? 'This film cannot play here. It plays on the web page version.' : '';
    if (word) {
      if (v) { ctx.globalAlpha = 0.5; ctx.fillStyle = FILM.screen; ctx.fillRect(x, y, w, pic); ctx.globalAlpha = 1; }
      const icon = st === 'idle' || st === 'paused' || st === 'ended';
      const r = Math.round(pic * 0.13);
      if (icon) {
        ctx.beginPath(); ctx.arc(cx, cy - 18, r, 0, Math.PI * 2); ctx.lineWidth = 4; ctx.strokeStyle = FILM.ink; ctx.stroke();
        ctx.fillStyle = FILM.ink; ctx.beginPath();
        ctx.moveTo(cx - r * 0.32, cy - 18 - r * 0.45); ctx.lineTo(cx + r * 0.5, cy - 18); ctx.lineTo(cx - r * 0.32, cy - 18 + r * 0.45); ctx.closePath(); ctx.fill();
      }
      const font = `700 22px ${face}`;
      ctx.font = font; ctx.fillStyle = FILM.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      wrap(ctx, word, font, w - 60).forEach((l, i) => ctx.fillText(l, cx, (icon ? cy + r + 4 : cy) + i * 30));
      ctx.textAlign = 'left';
    }
    // the progress line: the time gone, the line (filled as far as the film has played, a knob at the head), the length
    const { t, dur } = st === 'idle' ? { t: 0, dur: 0 } : F.time();
    const by = y + pic + FILM_BAR / 2, x0 = x + FILM_INSET, x1 = x + w - FILM_INSET;
    const k = dur > 0 ? Math.max(0, Math.min(1, t / dur)) : 0;
    ctx.fillStyle = FILM.track; ctx.fillRect(x0, by - 3, x1 - x0, 6);
    ctx.fillStyle = FILM.ink; ctx.fillRect(x0, by - 3, Math.round((x1 - x0) * k), 6);
    ctx.beginPath(); ctx.arc(x0 + (x1 - x0) * k, by, 9, 0, Math.PI * 2); ctx.fill();
    ctx.font = `18px ${SKINS[this.view].mono}`; ctx.textBaseline = 'middle';
    ctx.textAlign = 'right'; ctx.fillText(clock(t), x0 - 14, by);
    ctx.textAlign = 'left'; ctx.fillText(dur > 0 ? clock(dur) : '-:--', x1 + 14, by);
  }

  /** ⚑ S371 — the browser's repaint while a film plays: only the film's rect (clipped to the page), never the window */
  paintFilmOnly(ctx: CanvasRenderingContext2D): boolean {
    const f = this.filmAt;
    if (!f) return false;
    ctx.save();
    ctx.beginPath(); ctx.rect(this.vp.x, this.vp.y, this.vp.w - SCROLL_W, this.vp.h); ctx.clip();
    this.paintFilm(ctx, f.sx, f.sy, f.op);
    ctx.restore();
    return true;
  }
  /** ⚑ S371 — the headset's film plane: which film is on screen, and the part of its rect the page shows (logical px
   *  of the window; `top`/`bottom` are the shown span inside the film's own rect), or null */
  filmView(): { file: string; x: number; y: number; w: number; h: number; top: number; bottom: number } | null {
    const f = this.filmAt;
    if (!f) return null;
    const top = Math.max(0, this.vp.y - f.sy), bottom = Math.min(f.op.h, this.vp.y + this.vp.h - f.sy);
    if (bottom - top < 2) return null;
    return { file: f.op.file, x: f.sx, y: f.sy + top, w: f.op.w, h: bottom - top, top, bottom };
  }
  /** ⚑ S371 — draw the shown part of the film's rect onto the headset's film canvas (cw × ch device px) */
  drawFilmInto(ctx: CanvasRenderingContext2D, cw: number, ch: number): boolean {
    const fv = this.filmView();
    if (!fv || !this.filmAt) return false;
    const kx = cw / fv.w, ky = ch / fv.h;
    ctx.setTransform(kx, 0, 0, ky, 0, -fv.top * ky);
    this.paintFilm(ctx, 0, 0, this.filmAt.op);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return true;
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
  private inDoc(x: number, y: number): boolean { return !isMachineView(this.view) && x >= this.vp.x && x < this.vp.x + this.vp.w - SCROLL_W && y >= this.vp.y && y <= this.vp.y + this.vp.h; }
  /** is this point over the document (for wheel/drag-scroll)? ⚑ S378: the receipt's paper and a scrolling machine page too */
  overDoc(x: number, y: number): boolean {
    if ((this.view === 'receipt' || (this.view === 'machine' && this.maxScroll > 0)) && x >= this.vp.x && x < this.vp.x + this.vp.w - SCROLL_W && y >= this.vp.y && y <= this.vp.y + this.vp.h) return true;
    return this.inDoc(x, y);
  }
  /** a press; returns whether the window took it (so a headset ray that lands on it never falls through) */
  press(x: number, y: number): boolean {
    const id = this.idAt(x, y);
    if (!id) return false;
    this.act(id, x, y);
    return true;
  }
  private act(id: string, x: number, y: number): void {
    if (id === 'min') { this.host.minimise(); return; }
    if (id === 'close') { this.host.close(); return; }
    // ⚑ S378 — Back; the machine's page's own buttons; the Lexicon's (its Close is Back, or closes a window it opened)
    if (id === 'back') { this.back(); return; }
    if (id.startsWith('m:era:')) { siteViewerBus.machine?.era(id.slice(6) as 'e1' | 'e2' | 'e3' | 'e4'); return; }
    if (id === 'm:again') { siteViewerBus.machine?.again(); return; }
    if (id === 'm:receipt') { this.go('receipt'); return; }
    if (id === 'm:lexicon') { this.go('lexicon'); return; }
    if (id === 'm:dossier') { this.go('hub'); return; }
    if (id.startsWith('lx:')) {
      const lid = id.slice(3);
      if (!this.lexicon.press(lid) && lid === 'lex-close') { if (!this.back()) this.host.close(); }
      return;
    }
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
    else if (a.type === 'film') this.host.film.toggle(a.file);
    else if (a.type === 'seek') {
      if (this.host.film.state(a.file) === 'idle') this.host.film.toggle(a.file);
      else this.host.film.seek(a.file, (x - (this.vp.x + a.x0)) / a.w);
    }
    else if (a.type === 'door') this.setView(a.year as Year);
  }
  /** returns true if the offset moved */
  scrollBy(dy: number): boolean {
    const next = Math.max(0, Math.min(this.maxScroll, Math.round(this.scroll + dy)));
    if (next === this.scroll) return false;
    this.scroll = next;
    if (this.view === 'receipt') this.receipt.scrolled();   // S378: the visitor took the paper; stop following the head
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
  info(): { view: View; tab: TabId; scroll: number; maxScroll: number; docH: number; vp: Rect; film: { file: string | null; state: FilmState; t: number; dur: number; onScreen: boolean } } {
    const F = this.host.film;
    return { view: this.view, tab: this.tab, scroll: this.scroll, maxScroll: this.maxScroll, docH: this.doc?.h ?? 0, vp: this.vp,
      film: { file: F.file(), state: F.state(), ...F.time(), onScreen: !!this.filmAt } };
  }
  /** review tools: every document hit that plays something (a track, a film, a film's progress line), in page order */
  mediaHits(): { id: string; type: string; file: string; sx: number; sy: number; w: number; h: number }[] {
    return this.docHits.flatMap((h) => (h.act.type === 'audio' || h.act.type === 'film' || h.act.type === 'seek' ? [{ id: h.id, type: h.act.type, file: h.act.file, sx: h.sx, sy: h.sy, w: h.w, h: h.h }] : []));
  }
}
