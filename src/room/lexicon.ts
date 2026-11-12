/**
 * ⚑ S209 / P7-47 — THE LEXICON — MULTIMEDIA EDITION (data/strings/lexicon.json; his, 2026-10-02: "'The Lexicon —
 * Multimedia Edition' — love this!"). The words the networks used and the reasons they gave, turned over at the
 * Close on Daniel's machine — dressed as the CD-ROM reference titles of his own decade (his reference: a 1993
 * multimedia Bible's title screen: a gilded 3D title on navy, an open book, a row of chapter buttons). The costume
 * is the period's; the voice inside it is the piece's own plain one: what each word claims, and what the evidence
 * says. Every mark here is invented; no real product, publisher or logo.
 *
 * ⚑ S372 / UiB job 17 Part B (his 11 Nov: "is the Lexicon updated? maybe it needs a revamp in the design department of
 * that computer layout and stuff?") — A REAL MULTIMEDIA EDITION, READABLE IN THE HEADSET. It kept the costume (the
 * gilded title on navy, the chapter buttons) and got what the name promised:
 *   · a PICTURE per word (src/room/lexiconArt.ts): pixel art in ERA1's sixteen, an emblem of how the word was sold;
 *   · a TIMELINE strip, 1997 · 2003 · 2016 · 2026: where the word appears, and what it turns into (`chains`);
 *   · a MEDIA button, "as it was sold": the seller's line in a media window, and the piece's own sound for the word
 *     where one exists (a tape, a jingle, the AI's narrator), the Close's song ducked under it;
 *   · "WHERE YOU MET IT", from the ledger (meetWord's place), and a button to that year's website, on its words tab;
 *   · TYPE FOR THE HEADSET: the site viewer's sizes are the reference (body 22 px on a 1024 px window 59° wide, ≈1.26°;
 *     small 18 px, ≈1.03°). Where the eye comes to Daniel's machine the glass's 512 px span ≈48° (measured in the emulated
 *     headset, tools/s372-lexicon-probe.mjs), ≈0.094° a pixel: the plain line is 17–19 px (≈1.6–1.8°), every reading line
 *     at least 13 px (≈1.2°, the viewer's body), the smallest label 11 px (≈1.03°, the viewer's small). Before S372 the
 *     body was 9–12 px. Every face is laid out by MEASURING (columns, a status plate, paging by what fits), never by a
 *     fixed count of rows.
 *
 * Faces: the title page (contents) · The Words (one word a page) · The Reasons (each group, paged by measure; then the
 * arc across thirty years) · Your Words (the ones that reached the player, in order, each a door to its page) · Sources.
 * It files nothing; it reads `ledger.lexicon` and `ledger.lexiconWhere`. Pixel discipline: whole-pixel rects in ERA1's
 * palette, the 3D title stacked in hard steps, never smoothed. It draws only when pressed (the glass uploads on change).
 */
import { ERA1 } from '../desktop/theme/era1';
import { px, setFont, wrapText, bevel } from '../desktop/theme/chrome';
import { newsFor } from '../desktop/theme/fonts';
import { ledger } from '../state/ledger';
import { playOnce, stopClip, roomBed } from '../audio/tapeAudio';
import { siteViewerBus, type ViewerTarget } from '../frame/siteViewer/bus';
import { drawEmblem, drawEmblemSmall } from './lexiconArt';
import L from '../../data/strings/lexicon.json';
import linkData from '../../data/dossier/links.json';

type Face = 'title' | 'words' | 'reasons' | 'yours' | 'sources';
type Hit = { x: number; y: number; w: number; h: number; id: string };
type Year = '1997' | '2003' | '2016' | '2026';
interface Term {
  id: string; term: string; short?: string; eras: number[]; status: string; close: string; word: string | null; line: string | null;
  later?: string; emblem?: string; sound?: string; soundTitle?: string; sold?: string; soldFrom?: string;
  chain?: string; forms?: Partial<Record<Year, string>>; draft?: boolean
}
interface Reason { reason: string; era: string; status: string }
const TERMS = L.terms as Term[];
const REASONS = L.reasons as Record<'men' | 'women' | 'trans', Reason[]>;
const UI = L.ui;
const CHAINS = L.chains as unknown as Record<string, { forms: Partial<Record<Year, string>>; note?: string }>;
const PLACES = L.places as Record<string, string>;
const BADGE = L.statusBadge as unknown as Record<string, [string, string]>;
const YEARS: Year[] = ['1997', '2003', '2016', '2026'];

/** ⚑ S233 — THE LEXICON'S OWN SOURCES (his 2026-10-11): every link in data/dossier/links.json whose verification is the
 *  Lexicon's research document, label and address exactly as stored there. Text only — the piece makes no network
 *  calls, so nothing here is opened or fetched. (tools/gen_sources_page.mjs refuses any link not verbatim in its doc.) */
export const LEXICON_RESEARCH_DOC = 'docs/reinterp/RESEARCH_LEXICON_2026-10-02.md';
/** ⚑ S241 — and the word-by-word source map (his Deep Research, 2026-10-11): USE and CLAIM sources per entry */
export const LEXICON_SOURCES_DOC = 'docs/reinterp/LEXICON_SOURCES_VERIFIED_2026-10-11.md';
export interface LexiconSource { label: string; url: string }
export const LEXICON_SOURCES: LexiconSource[] = (() => {
  const out: LexiconSource[] = [];
  const seen = new Set<string>();
  for (const arr of Object.values(linkData.links as Record<string, Array<LexiconSource & { verifiedIn: string }>>)) {
    for (const l of arr) {
      if ((l.verifiedIn !== LEXICON_RESEARCH_DOC && l.verifiedIn !== LEXICON_SOURCES_DOC) || seen.has(l.url)) continue;
      seen.add(l.url);
      out.push({ label: l.label, url: l.url });
    }
  }
  return out;
})();
const GROUPS: Array<'men' | 'women' | 'trans'> = ['women', 'men', 'trans'];   // the 2016 era's women first

// ── the type, sized for the headset (see the header) ──
const T_BODY = 17, T_SMALL = 14, T_TINY = 13, T_HEAD = 24;
/** where the timeline strip begins on a word's page (the chapter bar's band begins at 346) */
const STRIP_Y = 236;
/** the reading face: the period's CD-ROM articles were set in a serif; the chrome keeps the era's bitmap mono */
function serif(ctx: CanvasRenderingContext2D, size: number, bold = false): void { ctx.font = newsFor(size, bold); ctx.textBaseline = 'top'; }

/** the plate colour for a status */
function plateColour(status: string): string {
  if (status === 'community') return ERA1.ok;
  if (status === 'documented') return ERA1.teal;
  if (status === 'contested' || status === 'half') return ERA1.olive;
  if (status === 'moral' || status === 'political') return ERA1.greyDark;
  return ERA1.warnDark;
}

/** the research's status column, in the Lexicon's own short words */
function shortStatus(s: string): string {
  const u = s.toUpperCase();
  if (u.startsWith('NOT SUPPORTED')) return 'not supported';
  if (u.startsWith('NOT AN EMPIRICAL')) return 'not a finding';
  if (u.startsWith('CONTESTED')) return 'disputed';
  if (u.startsWith('DOCUMENTED')) return 'documented';
  if (u.startsWith('NO SOURCE')) return 'no source gives it';
  if (u.startsWith('PERCEPTIONS')) return 'perceptions, not causes';
  return s.toLowerCase().slice(0, 22);
}
function shortColour(s: string): string {
  const u = s.toUpperCase();
  if (u.startsWith('NOT SUPPORTED')) return ERA1.warnDark;
  if (u.startsWith('CONTESTED')) return ERA1.olive;
  if (u.startsWith('DOCUMENTED')) return ERA1.teal;
  return ERA1.greyDark;
}

/** the year of a place key's line ("2003 · the forum's pages" → '2003') */
function placeYear(key: string | undefined): Year | null {
  const p = key ? PLACES[key] : undefined;
  const y = p?.slice(0, 4);
  return y && (YEARS as string[]).includes(y) ? (y as Year) : null;
}

export interface LexiconOptions {
  /** something changed without a press (a sound ended): the host redraws and uploads */
  onChange?: () => void;
}

export class Lexicon {
  face: Face = 'title';
  private page = 0;
  /** the page counts of the measured faces, set by their last draw */
  private measured: Partial<Record<Face, number>> = {};
  /** the media window over a word's page ("as it was sold"), and the sound playing in it */
  private panel = false;
  private audio: HTMLAudioElement | null = null;
  private audioFile: string | null = null;

  constructor(private opts: LexiconOptions = {}) {}

  /** the word on show (The Words), for probes and hosts */
  get termId(): string | null { return this.face === 'words' ? TERMS[this.page]?.id ?? null : null; }

  /** a press on the glass, by hit id; true when it was the Lexicon's. 'lex-close' is the caller's to act on (it should
   *  call stopSound()). */
  press(id: string): boolean {
    if (!id.startsWith('lex-')) return false;
    const to = (f: Face, page = 0): void => { this.closePanel(); this.face = f; this.page = page; };
    if (id === 'lex-words') to('words');
    else if (id === 'lex-reasons') to('reasons');
    else if (id === 'lex-yours') to('yours');
    else if (id === 'lex-sources') to('sources');
    else if (id === 'lex-title') to('title');
    else if (id === 'lex-next') { this.closePanel(); this.page = Math.min(this.pages() - 1, this.page + 1); }
    else if (id === 'lex-prev') { this.closePanel(); this.page = Math.max(0, this.page - 1); }
    else if (id.startsWith('lex-go-')) {
      const i = TERMS.findIndex((t) => t.id === id.slice(7));
      if (i >= 0) to('words', i);
    }
    else if (id === 'lex-sold') { this.panel = true; const t = TERMS[this.page]; if (t?.sound) this.play(t.sound); }
    else if (id === 'lex-play') { const t = TERMS[this.page]; if (t?.sound) { if (this.audioFile) this.stopSound(); else this.play(t.sound); } }
    else if (id === 'lex-panel-close') this.closePanel();
    else if (id === 'lex-site') {
      const y = this.siteYear(TERMS[this.page]);
      this.closePanel();
      if (y) siteViewerBus.openAt(y as ViewerTarget, 'words');
    }
    return true;
  }

  /** stop the word's sound (the host calls this when the Lexicon closes) and let the Close's song back up */
  stopSound(): void {
    if (this.audio) { this.audio.onended = null; this.audio.onerror = null; stopClip(this.audio); }
    if (this.audioFile) roomBed.duck(0, 0);
    this.audio = null; this.audioFile = null;
  }

  private closePanel(): void { this.panel = false; this.stopSound(); }

  private play(file: string): void {
    this.stopSound();
    const a = playOnce(file);
    if (!a) return;
    this.audio = a; this.audioFile = file;
    roomBed.duck(-24, 3600);   // the Close's song steps right down under the word's own sound, and comes back after
    const done = (): void => { if (this.audio !== a) return; this.audio = null; this.audioFile = null; roomBed.duck(0, 0); this.opts.onChange?.(); };
    a.onended = done; a.onerror = done;
  }

  /** the year whose website a word links to: where it was met, else where it first appears */
  private siteYear(t: Term | undefined): Year | null {
    if (!t) return null;
    return placeYear(ledger.lexiconWhere?.[t.id]) ?? (String(t.eras[0]) as Year);
  }

  private pages(): number {
    if (this.face === 'words') return TERMS.length;
    return this.measured[this.face] ?? 1;
  }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number, hits: Hit[]): void {
    hits.length = 0;
    // the disc's own ground: navy, and a band of the lighter blue under the header, as the period's titles had
    px(ctx, 0, 0, W, H, ERA1.navy);
    if (this.face === 'title') this.drawTitle(ctx, W, H, hits);
    else if (this.face === 'words') this.drawWord(ctx, W, H, hits);
    else if (this.face === 'reasons') this.drawReasons(ctx, W, H, hits);
    else if (this.face === 'sources') this.drawSources(ctx, W, H, hits);
    else this.drawYours(ctx, W, H, hits);
    this.drawBar(ctx, W, H, hits);
  }

  /** the gilded title, in hard steps: shadow, three depths of gold, the face */
  private gilded(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number): void {
    setFont(ctx, size);
    const depth = [ERA1.black, ERA1.greyDark, ERA1.olive, ERA1.olive, ERA1.warnDark];
    const d = size >= 30 ? 1 : 0.6;
    depth.forEach((c, i) => { ctx.fillStyle = c; const o = Math.max(1, Math.round((depth.length - i) * d)); ctx.fillText(text, x + o, y + o); });
    ctx.fillStyle = ERA1.tooltip; ctx.fillText(text, x, y);
    // the period's highlight: a hard white line through the upper third of the letters
    ctx.save(); ctx.beginPath(); ctx.rect(x, y + Math.round(size * 0.18), ctx.measureText(text).width, Math.max(1, Math.round(size / 14))); ctx.clip();
    ctx.fillStyle = ERA1.white; ctx.fillText(text, x, y); ctx.restore();
  }
  /** the largest gilded size (≤ max, ≥ min) at which `text` fits `w` */
  private fit(ctx: CanvasRenderingContext2D, text: string, w: number, max: number, min: number): number {
    for (let s = max; s > min; s--) { setFont(ctx, s); if (ctx.measureText(text).width + 5 <= w) return s; }
    return min;
  }

  /** a bevelled button with a centred label in the era's bold face */
  private button(ctx: CanvasRenderingContext2D, hits: Hit[], label: string, x: number, y: number, w: number, h: number, id: string, down = false): void {
    bevel(ctx, x, y, w, h, !down);
    setFont(ctx, T_TINY);
    let s = T_TINY;
    while (ctx.measureText(label).width > w - 8 && s > 11) { s--; setFont(ctx, s); }
    ctx.fillStyle = ERA1.black;
    ctx.fillText(label, x + Math.round((w - ctx.measureText(label).width) / 2), y + Math.round((h - s) / 2));
    hits.push({ x, y, w, h, id });
  }

  // ── the title page: the cover's collage, and the contents as buttons ──
  private drawTitle(ctx: CanvasRenderingContext2D, W: number, H: number, hits: Hit[]): void {
    this.gilded(ctx, L.title, 18, 12, 40);
    setFont(ctx, 16); ctx.fillStyle = ERA1.white;
    const ew = ctx.measureText(L.edition).width;
    ctx.fillText(L.edition, W - 18 - ew, 30);
    px(ctx, 0, 62, W, 2, ERA1.titleBlue);
    serif(ctx, T_SMALL); ctx.fillStyle = ERA1.silver;
    ctx.fillText(wrapText(ctx, L.sub, W - 36)[0] ?? '', 18, 70);
    // the cover: twelve of the words' pictures, as a disc's box art — the media they were sold in
    const kinds = ['tape', 'booklet', 'web', 'board', 'tv', 'disk', 'phone', 'chat', 'news', 'law', 'form', 'key'];
    kinds.forEach((k, i) => drawEmblem(ctx, k, 22 + (i % 4) * 56, 98 + Math.floor(i / 4) * 56, 2));
    // the four years, under the collage: the disc spans them
    setFont(ctx, T_SMALL); ctx.fillStyle = ERA1.tooltip;
    ctx.fillText(YEARS.join(' · '), 22, 270);
    // contents: each chapter a button with its one line
    setFont(ctx, T_TINY); ctx.fillStyle = ERA1.silver; ctx.fillText(UI.contentsTitle, 262, 94);
    const n = ledger.lexicon.length;
    (L.contents as Array<{ id: string; label: string; line: string }>).forEach((c, i) => {
      const y = 112 + i * 52;
      bevel(ctx, 262, y, W - 262 - 14, 46, true);
      setFont(ctx, 15); ctx.fillStyle = ERA1.navy; ctx.fillText(c.label, 272, y + 6);
      serif(ctx, T_TINY); ctx.fillStyle = ERA1.greyDark;
      const line = c.line.replace('{m}', String(TERMS.length)).replace('{n}', String(n));
      wrapText(ctx, line, W - 262 - 34).slice(0, 1).forEach((l) => ctx.fillText(l, 272, y + 26));
      hits.push({ x: 262, y, w: W - 262 - 14, h: 46, id: c.id });
    });
    // what reached the visitor
    serif(ctx, T_SMALL); ctx.fillStyle = ERA1.tooltip;
    wrapText(ctx, n ? L.metCount.replace('{n}', String(n)).replace('{m}', String(TERMS.length)) : L.yoursNone, 220)
      .slice(0, 3).forEach((l, i) => ctx.fillText(l, 22, 292 + i * 18));
    void H;
  }

  // ── The Words: one word a page ──
  private drawWord(ctx: CanvasRenderingContext2D, W: number, H: number, hits: Hit[]): void {
    const t = TERMS[this.page];
    const top = this.header(ctx, W, t.term.toUpperCase(), `${this.page + 1} / ${TERMS.length}`);
    // ── the left column: the picture, the status plate, the media and the website ──
    const LX = 14, LW = 124;
    drawEmblem(ctx, t.emblem, LX + 26, top + 4, 3);
    let ly = top + 4 + 72 + 6;
    const [b1, b2] = BADGE[t.status] ?? ['', t.status.toUpperCase()];
    setFont(ctx, T_TINY);
    const b2Lines = wrapText(ctx, b2, LW - 10).slice(0, 2);
    const bh = 6 + 13 + b2Lines.length * 14;
    px(ctx, LX, ly, LW, bh, plateColour(t.status));
    px(ctx, LX, ly, LW, 1, ERA1.white);
    setFont(ctx, 12); ctx.fillStyle = ERA1.silver; ctx.fillText(b1, LX + 5, ly + 3);
    setFont(ctx, T_TINY); ctx.fillStyle = ERA1.white;
    b2Lines.forEach((l, i) => ctx.fillText(l, LX + 5, ly + 17 + i * 14));
    ly += bh + 4;
    const hasMedia = !!(t.sound || (t.word && t.line) || t.sold);
    if (hasMedia) {
      const label = t.status === 'community' ? UI.hear : UI.sold;
      this.button(ctx, hits, label, LX, ly, LW, 22, 'lex-sold', this.panel);
      ly += 25;
    }
    const sy = this.siteYear(t);
    if (sy) this.button(ctx, hits, UI.site.replace('{year}', sy), LX, ly, LW, 22, 'lex-site');

    // ── the right column: where you met it, the plain line, then 2026's change ──
    const RX = LX + LW + 14, RW = W - RX - 14;
    const bottom = STRIP_Y - 4;   // the strip begins under it
    const met = ledger.lexicon.includes(t.id);
    const where = met ? UI.metIn.replace('{place}', PLACES[ledger.lexiconWhere?.[t.id] ?? ''] ?? '').replace(/: $/, '') : UI.notMet;
    let body = T_BODY + 2, small = T_SMALL + 1;
    type Measured = { w: string[]; c: string[]; l: string[]; h: number };
    const measure = (): Measured => {
      serif(ctx, T_TINY, true); const w = wrapText(ctx, where, RW);
      serif(ctx, body); const c = wrapText(ctx, t.close, RW);
      serif(ctx, small); const l = t.later ? wrapText(ctx, `${UI.in2026}: ${t.later}`, RW) : [];
      return { w, c, l, h: w.length * 16 + 6 + c.length * Math.round(body * 1.25) + (l.length ? 10 + l.length * Math.round(small * 1.28) : 0) };
    };
    let m: Measured = measure();
    while (top + 2 + m.h > bottom && body > 14) { body--; if (small > T_TINY) small--; m = measure(); }
    if (top + 2 + m.h > bottom && m.w.length > 1) { m.w = [m.w[0].replace(/\s*\S+$/, '…')]; m.h -= 16; }
    let y = top + 2;
    serif(ctx, T_TINY, true); ctx.fillStyle = met ? ERA1.tooltip : ERA1.grey;
    for (const l of m.w) { ctx.fillText(l, RX, y); y += 16; }
    y += 6;
    serif(ctx, body); ctx.fillStyle = ERA1.white;
    for (const l of m.c) { ctx.fillText(l, RX, y); y += Math.round(body * 1.25); }
    if (m.l.length) {
      y += 10;
      px(ctx, RX, y - 5, 28, 1, ERA1.tooltip);
      serif(ctx, small); ctx.fillStyle = ERA1.silver;
      m.l.forEach((l, i) => {
        if (i === 0) {   // the label in gold, the rest in silver
          const lab = `${UI.in2026}:`;
          serif(ctx, small, true); ctx.fillStyle = ERA1.tooltip; ctx.fillText(lab, RX, y);
          const lw = ctx.measureText(lab + ' ').width;
          serif(ctx, small); ctx.fillStyle = ERA1.silver; ctx.fillText(l.slice(lab.length + 1), RX + lw, y);
        } else ctx.fillText(l, RX, y);
        y += Math.round(small * 1.28);
      });
    }

    // ── the timeline strip (under the media window while that is up) ──
    if (!this.panel) this.strip(ctx, W, t, STRIP_Y);

    // ── the media window, over the right column ──
    if (this.panel) this.drawPanel(ctx, t, RX - 6, top, W - RX - 8, H - 50 - top, hits);
    this.pager(hits);
    void H;
  }

  /** the header every face shares: the gilded heading (fitted), and a small right-hand note (the page count) */
  private header(ctx: CanvasRenderingContext2D, W: number, heading: string, note: string): number {
    setFont(ctx, T_SMALL);
    const nw = note ? ctx.measureText(note).width : 0;
    const size = this.fit(ctx, heading, W - 28 - nw - 14, T_HEAD, 14);
    this.gilded(ctx, heading, 14, 12 + Math.round((T_HEAD - size) / 2), size);
    if (note) { setFont(ctx, T_SMALL); ctx.fillStyle = ERA1.silver; ctx.fillText(note, W - 14 - nw, 18); }
    px(ctx, 0, 46, W, 2, ERA1.titleBlue);
    return 54;
  }

  /** 1997 · 2003 · 2016 · 2026: where the word appears (lit), and the names the record gives it on the way */
  private strip(ctx: CanvasRenderingContext2D, W: number, t: Term, y0: number): void {
    const chain = t.chain ? CHAINS[t.chain] : undefined;
    const forms: Partial<Record<Year, string>> = { ...(chain?.forms ?? {}), ...(t.forms ?? {}) };
    const metYear = placeYear(ledger.lexiconWhere?.[t.id]);
    const met = ledger.lexicon.includes(t.id);
    px(ctx, 10, y0, W - 20, 1, ERA1.titleBlue);
    const sw = Math.floor((W - 28) / 4), x0 = 14;
    const lineY = y0 + 29;
    px(ctx, x0 + sw / 2, lineY, sw * 3, 2, ERA1.titleBlue);
    // a word's own name repeats only where it changes: the first decade of a run names it, the rest say it held
    let run = '';
    const label = (yr: Year): { text: string; lit: boolean; held: boolean } => {
      const lit = t.eras.includes(Number(yr));
      const f = forms[yr] ?? (lit ? (t.short ?? t.term) : '—');
      const held = f !== '—' && f === run;
      run = f;
      return { text: held ? UI.held : f, lit, held };
    };
    let prev = '';
    YEARS.forEach((yr, i) => {
      const cx = Math.round(x0 + sw * i + sw / 2);
      const { text, lit, held } = label(yr);
      // the year
      setFont(ctx, 15); ctx.fillStyle = lit ? ERA1.white : ERA1.grey;
      const yw = ctx.measureText(yr).width;
      ctx.fillText(yr, cx - Math.round(yw / 2), y0 + 6);
      // the node: lit gold where the word appears, a hollow square where it does not
      if (lit) { px(ctx, cx - 6, lineY - 5, 12, 12, ERA1.olive); px(ctx, cx - 4, lineY - 3, 8, 8, ERA1.tooltip); }
      else { px(ctx, cx - 4, lineY - 3, 8, 8, ERA1.grey); px(ctx, cx - 2, lineY - 1, 4, 4, ERA1.navy); }
      if (met && metYear === yr) { setFont(ctx, T_SMALL); ctx.fillStyle = ERA1.tooltip; ctx.fillText('★', cx + 9, lineY - 7); }
      // what it turns into: an arrowhead on the line where the name changes
      if (i > 0 && !held && text !== '—' && prev !== '—' && text !== prev) {
        const ax = Math.round(cx - sw / 2);
        for (let k = 0; k < 4; k++) px(ctx, ax - 2 + k, lineY - 3 + k, 1, 8 - k * 2, ERA1.tooltip);
      }
      prev = text;
      // its name in that decade ("still used" where it held)
      serif(ctx, T_SMALL, lit && !held); ctx.fillStyle = held ? ERA1.silver : lit ? ERA1.white : ERA1.grey;
      wrapText(ctx, text, sw - 6).slice(0, chain?.note ? 2 : 3).forEach((l, k) => {
        const w = ctx.measureText(l).width;
        ctx.fillText(l, cx - Math.round(w / 2), lineY + 11 + k * 16);
      });
    });
    // the caption, where a chain has one: the line that keeps both readings (ETHICS #7)
    if (chain?.note) {
      serif(ctx, T_TINY); ctx.fillStyle = ERA1.silver;
      wrapText(ctx, chain.note, W - 28).slice(0, 2).forEach((l, i) => ctx.fillText(l, 14, lineY + 46 + i * 15));
    }
  }

  /** the media window: the seller's line, as it was sold, and the word's sound where the piece has one */
  private drawPanel(ctx: CanvasRenderingContext2D, t: Term, x: number, y: number, w: number, h: number, hits: Hit[]): void {
    px(ctx, x + 4, y + 4, w, h, ERA1.black);
    bevel(ctx, x, y, w, h, true);
    px(ctx, x + 3, y + 3, w - 6, 20, ERA1.navy);
    setFont(ctx, T_TINY); ctx.fillStyle = ERA1.white;
    ctx.fillText(t.status === 'community' ? UI.hearTitle : UI.soldTitle, x + 9, y + 7);
    // the close box
    bevel(ctx, x + w - 23, y + 5, 17, 16, true);
    setFont(ctx, 11); ctx.fillStyle = ERA1.black; ctx.fillText('✕', x + w - 19, y + 7);
    hits.push({ x: x + w - 40, y: y + 2, w: 38, h: 24, id: 'lex-panel-close' });
    // the screen
    const sx = x + 8, sy = y + 28, sw = w - 16, sh = h - 28 - 40;
    px(ctx, sx, sy, sw, sh, ERA1.black);
    px(ctx, sx, sy, sw, 1, ERA1.greyDark);
    let ty = sy + 8;
    const quote = t.word && t.line ? `${L.wotdPrefix} ${t.word}. ${t.line}` : t.sold ?? '';
    if (quote) {
      serif(ctx, 16); ctx.fillStyle = ERA1.tooltip;
      for (const l of wrapText(ctx, quote, sw - 16)) { ctx.fillText(l, sx + 8, ty); ty += 20; }
      ty += 4;
    }
    const from = t.sold ? t.soldFrom : (t.word ? UI.wotdFrom : '');
    if (from) {
      serif(ctx, T_TINY); ctx.fillStyle = ERA1.silver;
      for (const l of wrapText(ctx, `— ${from}`, sw - 16)) { ctx.fillText(l, sx + 8, ty); ty += 16; }
    }
    if (t.soundTitle) {
      ty += 6;
      serif(ctx, T_TINY); ctx.fillStyle = this.audioFile ? ERA1.white : ERA1.grey;
      for (const l of wrapText(ctx, `${this.audioFile ? UI.playing : '♪'} · ${t.soundTitle}`, sw - 16)) { if (ty > sy + sh - 16) break; ctx.fillText(l, sx + 8, ty); ty += 16; }
    }
    // the transport: play / stop (where there is a sound)
    const by = y + h - 32;
    if (t.sound) this.button(ctx, hits, this.audioFile ? UI.stop : UI.play, x + 8, by, 100, 24, 'lex-play', !!this.audioFile);
    else { serif(ctx, T_TINY); ctx.fillStyle = ERA1.greyDark; ctx.fillText(UI.silent, x + 10, by + 5); }
    this.button(ctx, hits, UI.back, x + w - 98, by, 90, 24, 'lex-panel-close');
  }

  // ── The Reasons: each group paged by what fits; then the arc ──
  private reasonPages(ctx: CanvasRenderingContext2D, W: number): Array<{ g: 'men' | 'women' | 'trans' | 'arc'; rows: Reason[]; intro: boolean }> {
    const out: Array<{ g: 'men' | 'women' | 'trans' | 'arc'; rows: Reason[]; intro: boolean }> = [];
    const LIMIT = 330, RW = W - 28 - 150;
    serif(ctx, T_SMALL);
    const introH = wrapText(ctx, L.reasonsIntro, W - 28).length * 18 + 10;
    let first = true;
    for (const g of GROUPS) {
      let cur: Reason[] = [], y = 54 + (first ? introH : 0) + 20;
      let intro = first;
      for (const r of REASONS[g]) {
        serif(ctx, 15); const rh = Math.max(wrapText(ctx, r.reason, RW).length * 19, 40) + 10;
        if (cur.length && y + rh > LIMIT) { out.push({ g, rows: cur, intro }); cur = []; y = 54 + 20; intro = false; }
        cur.push(r); y += rh;
      }
      if (cur.length) out.push({ g, rows: cur, intro });
      first = false;
    }
    out.push({ g: 'arc', rows: [], intro: false });
    return out;
  }

  private drawReasons(ctx: CanvasRenderingContext2D, W: number, H: number, hits: Hit[]): void {
    const pages = this.reasonPages(ctx, W);
    this.measured.reasons = pages.length;
    this.page = Math.min(this.page, pages.length - 1);
    const pg = pages[this.page];
    const note = `${this.page + 1} / ${pages.length}`;
    if (pg.g === 'arc') {
      let y = this.header(ctx, W, L.arcTitle.toUpperCase(), note) + 4;
      L.arc.forEach((a, i) => {
        const yr = YEARS[i];
        const text = a.replace(/^\d{4}\s*—\s*/, '');
        // the year on a gold plate, the decade's reasons beside it
        px(ctx, 14, y, 62, 24, ERA1.olive); px(ctx, 15, y + 1, 60, 22, ERA1.tooltip);
        setFont(ctx, 16); ctx.fillStyle = ERA1.navy; ctx.fillText(yr, 22, y + 4);
        if (i < 3) px(ctx, 44, y + 26, 2, 30, ERA1.titleBlue);
        serif(ctx, 15); ctx.fillStyle = ERA1.white;
        const lines = wrapText(ctx, text, W - 100);
        lines.forEach((l, k) => ctx.fillText(l, 88, y + 3 + k * 19));
        y += Math.max(58, lines.length * 19 + 16);
      });
      this.pager(hits);
      void H;
      return;
    }
    let y = this.header(ctx, W, (L.groups as Record<string, string>)[pg.g].toUpperCase(), note);
    if (pg.intro) {
      serif(ctx, T_SMALL); ctx.fillStyle = ERA1.silver;
      for (const l of wrapText(ctx, L.reasonsIntro, W - 28)) { ctx.fillText(l, 14, y); y += 18; }
      y += 10;
    }
    // the column heads
    setFont(ctx, 11); ctx.fillStyle = ERA1.silver;
    ctx.fillText(UI.reasonsEra, W - 150, y);
    y += 16;
    const RW = W - 28 - 150;
    for (const r of pg.rows) {
      px(ctx, 14, y - 5, W - 28, 1, ERA1.titleBlue);
      serif(ctx, 15); ctx.fillStyle = ERA1.white;
      const lines = wrapText(ctx, r.reason, RW);
      lines.forEach((l, i) => ctx.fillText(l, 14, y + i * 19));
      setFont(ctx, T_TINY); ctx.fillStyle = ERA1.silver; ctx.fillText(r.era, W - 150, y);
      const st = shortStatus(r.status);
      setFont(ctx, 12);
      wrapText(ctx, st, 126).slice(0, 2).forEach((l, k) => {
        const sw = Math.ceil(ctx.measureText(l).width) + 10;
        px(ctx, W - 150, y + 18 + k * 17, sw, 17, shortColour(r.status));
        ctx.fillStyle = ERA1.white; ctx.fillText(l, W - 145, y + 21 + k * 17);
      });
      y += Math.max(lines.length * 19, 40) + 10;
    }
    this.pager(hits);
    void H;
  }

  // ── Your Words: each met word a door to its page ──
  private drawYours(ctx: CanvasRenderingContext2D, W: number, H: number, hits: Hit[]): void {
    const met = ledger.lexicon.map((id) => TERMS.find((x) => x.id === id)).filter((t): t is Term => !!t);
    const ROW = 40, y0 = 54 + 26, LIMIT = 336;
    const per = Math.max(1, Math.floor((LIMIT - y0) / ROW));
    const pages = Math.max(1, Math.ceil(met.length / per));
    this.measured.yours = pages;
    this.page = Math.min(this.page, pages - 1);
    let y = this.header(ctx, W, L.tabs.yours.toUpperCase(), pages > 1 ? `${this.page + 1} / ${pages}` : '');
    serif(ctx, T_TINY); ctx.fillStyle = ERA1.silver;
    if (!met.length) { for (const l of wrapText(ctx, L.yoursNone, W - 28)) { ctx.fillText(l, 14, y + 4); y += 18; } this.pager(hits); return; }
    ctx.fillText(ellipsis(ctx, `${L.yoursIntro.replace(/:$/, '.')} ${UI.yoursGo}`, W - 28), 14, y);
    y = y0;
    met.slice(this.page * per, this.page * per + per).forEach((t, i) => {
      const n = this.page * per + i + 1;
      px(ctx, 14, y, W - 28, ROW - 4, i % 2 ? ERA1.navy : ERA1.tealDark);
      drawEmblemSmall(ctx, t.emblem, 20, y + 6);
      setFont(ctx, T_TINY); ctx.fillStyle = ERA1.grey; ctx.fillText(String(n).padStart(2, ' '), 50, y + 11);
      serif(ctx, 16, true); ctx.fillStyle = ERA1.tooltip;
      ctx.fillText(ellipsis(ctx, t.term, W - 14 - 150 - 74 - 8), 74, y + 3);
      serif(ctx, T_TINY); ctx.fillStyle = ERA1.silver;
      const where = PLACES[ledger.lexiconWhere?.[t.id] ?? ''] ?? '';
      if (where) ctx.fillText(ellipsis(ctx, where, W - 14 - 150 - 74 - 8), 74, y + 20);
      const st = BADGE[t.status]?.[1] ?? '';
      setFont(ctx, 11);
      const sw = Math.min(150, Math.ceil(ctx.measureText(st).width) + 10);
      px(ctx, W - 14 - sw - 6, y + 9, sw, 17, plateColour(t.status));
      ctx.fillStyle = ERA1.white; ctx.fillText(wrapText(ctx, st, sw - 8)[0] ?? '', W - 14 - sw - 1, y + 12);
      hits.push({ x: 14, y, w: W - 28, h: ROW - 4, id: `lex-go-${t.id}` });
      y += ROW;
    });
    this.pager(hits);
    void H;
  }

  /** ⚑ S233 — the Lexicon's Sources: what its research points to, printed (label, then the address in full, broken
   *  anywhere it must be, since an address has no spaces). ⚑ S242 — PAGED by measuring. ⚑ S372: at the headset's sizes. */
  private drawSources(ctx: CanvasRenderingContext2D, W: number, H: number, hits: Hit[]): void {
    const LABEL_LH = 18, URL_LH = 16, GAP = 10, LIMIT = 338, TOP = 54;
    const measure = (s: LexiconSource): { label: string[]; url: string[]; h: number } => {
      serif(ctx, 15); const label = wrapText(ctx, s.label, W - 28);
      setFont(ctx, T_TINY); const url = breakAnywhere(ctx, s.url, W - 36);
      return { label, url, h: label.length * LABEL_LH + url.length * URL_LH + GAP };
    };
    serif(ctx, T_SMALL);
    const intro = wrapText(ctx, L.sourcesIntro, W - 28);
    const pages: Array<Array<{ label: string[]; url: string[]; h: number }>> = [];
    let cur: Array<{ label: string[]; url: string[]; h: number }> = [], y = TOP + intro.length * 18 + 8;
    for (const s of LEXICON_SOURCES) {
      const m = measure(s);
      if (cur.length && y + m.h > LIMIT) { pages.push(cur); cur = []; y = TOP; }
      cur.push(m); y += m.h;
    }
    if (cur.length) pages.push(cur);
    this.measured.sources = Math.max(1, pages.length);
    this.page = Math.min(this.page, this.measured.sources - 1);
    y = this.header(ctx, W, L.tabs.sources.toUpperCase(), `${this.page + 1} / ${this.measured.sources}`);
    if (this.page === 0) {
      serif(ctx, T_SMALL); ctx.fillStyle = ERA1.silver;
      for (const l of intro) { ctx.fillText(l, 14, y); y += 18; }
      y += 8;
    }
    for (const m of pages[this.page] ?? []) {
      serif(ctx, 15); ctx.fillStyle = ERA1.white;
      for (const l of m.label) { ctx.fillText(l, 14, y); y += LABEL_LH; }
      setFont(ctx, T_TINY); ctx.fillStyle = ERA1.tooltip;
      for (const l of m.url) { ctx.fillText(l, 22, y); y += URL_LH; }
      y += GAP;
    }
    this.pager(hits);
    void H;
  }

  /** prev / next live in the chapter bar (drawBar); this only records that the face pages */
  private pager(_hits: Hit[]): void { /* the bar draws the arrows from pages() */ }

  /** the row of chapter buttons along the foot, as the period's titles had them, with the page arrows at its ends */
  private drawBar(ctx: CanvasRenderingContext2D, W: number, H: number, hits: Hit[]): void {
    const h = 26, y = H - h - 6;
    px(ctx, 0, y - 6, W, 1, ERA1.titleBlue);
    px(ctx, 0, y - 5, W, H - y + 5, ERA1.tealDark);
    const n = this.face === 'title' ? 1 : this.pages();
    const AW = 28;
    const arrow = (label: string, x: number, id: string, live: boolean): void => {
      if (live) this.button(ctx, hits, label, x, y, AW, h, id);
      else { bevel(ctx, x, y, AW, h, true); setFont(ctx, T_TINY); ctx.fillStyle = ERA1.grey; ctx.fillText(label, x + 9, y + 6); }
    };
    arrow('◄', 6, 'lex-prev', this.face !== 'title' && this.page > 0);
    arrow('►', W - 6 - AW, 'lex-next', this.face !== 'title' && this.page < n - 1);
    const S = UI.tabs;
    const tabs: Array<[string, string]> = [[S.words, 'lex-words'], [S.reasons, 'lex-reasons'], [S.yours, 'lex-yours'], [S.sources, 'lex-sources'], [S.close, 'lex-close']];
    const x0 = 6 + AW + 4, span = W - 2 * (6 + AW + 4);
    const w = Math.floor((span - 4 * (tabs.length - 1)) / tabs.length);
    tabs.forEach(([label, id], i) => {
      const x = x0 + i * (w + 4);
      const on = id === `lex-${this.face}`;
      this.button(ctx, hits, label, x, y, w, h, id, on);
    });
  }
}

/** one line of `text` that fits `w` in the ctx's current font, cut at a word with an ellipsis when it must be */
function ellipsis(ctx: CanvasRenderingContext2D, text: string, w: number): string {
  if (ctx.measureText(text).width <= w) return text;
  const words = text.split(' ');
  while (words.length > 1 && ctx.measureText(`${words.join(' ')}…`).width > w) words.pop();
  return `${words.join(' ').replace(/[,·:;]$/, '')}…`;
}

/** break a string with no spaces (an address) at the last character that fits, line by line, in the ctx's current font */
function breakAnywhere(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const ch of text) {
    if (cur && ctx.measureText(cur + ch).width > maxWidth) { lines.push(cur); cur = ch; }
    else cur += ch;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** the player met a word where the system used it: once, in order (the Close's "Your Words"), with WHERE (a key of
 *  lexicon.json `places`) — the first place only; memory only, like every ledger field */
export function meetWord(id: string, place?: string): void {
  if (ledger.lexicon.includes(id)) return;
  ledger.lexicon.push(id);
  if (place) ledger.lexiconWhere[id] = place;
}
