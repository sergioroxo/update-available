/**
 * ⚑ S209 / P7-47 — THE LEXICON — MULTIMEDIA EDITION (data/strings/lexicon.json; his, 2026-10-02: "'The Lexicon —
 * Multimedia Edition' — love this!"). The words the networks used and the reasons they gave, turned over at the
 * Close on Daniel's machine — dressed as the CD-ROM reference titles of his own decade (his reference: a 1993
 * multimedia Bible's title screen: a gilded 3D title on navy, an open book, a row of chapter buttons). The costume
 * is the period's; the voice inside it is the piece's own plain one: what each word claims, and what the evidence
 * says. Every mark here is invented; no real product, publisher or logo.
 *
 * Faces: the title page · The Words (one term a page: the term, its eras, its status, the plain line, and "as it was
 * sold" — the seller's Word of the Day) · The Reasons (men, women, trans people, and the arc across thirty years) ·
 * Your Words (the ones that reached the player, in order). It files nothing; it reads `ledger.lexicon`.
 * Pixel discipline: whole-pixel rects in ERA1's palette, the 3D title stacked in hard steps, never smoothed.
 */
import { ERA1 } from '../desktop/theme/era1';
import { px, setFont, wrapText, bevel } from '../desktop/theme/chrome';
import { ledger } from '../state/ledger';
import L from '../../data/strings/lexicon.json';

type Face = 'title' | 'words' | 'reasons' | 'yours';
type Hit = { x: number; y: number; w: number; h: number; id: string };
interface Term { id: string; term: string; eras: number[]; status: string; close: string; word: string | null; line: string | null }
const TERMS = L.terms as Term[];
const REASONS = L.reasons as Record<'men' | 'women' | 'trans', { reason: string; era: string; status: string }[]>;
const GROUPS: Array<'men' | 'women' | 'trans' | 'arc'> = ['women', 'men', 'trans', 'arc'];   // the 2016 era's women first
/** the reasons, paged: each group in runs of six (no reason is ever dropped for space), then the arc */
const REASON_PAGES: Array<{ g: 'men' | 'women' | 'trans' | 'arc'; rows: { reason: string; era: string; status: string }[] }> = (() => {
  const out: Array<{ g: 'men' | 'women' | 'trans' | 'arc'; rows: { reason: string; era: string; status: string }[] }> = [];
  for (const g of GROUPS) {
    if (g === 'arc') { out.push({ g, rows: [] }); continue; }
    const all = REASONS[g];
    for (let i = 0; i < all.length; i += 6) out.push({ g, rows: all.slice(i, i + 6) });
  }
  return out;
})();

export class Lexicon {
  face: Face = 'title';
  private page = 0;

  /** a press on the glass, by hit id; true when it was the Lexicon's. 'lex-close' is the caller's to act on. */
  press(id: string): boolean {
    if (!id.startsWith('lex-')) return false;
    if (id === 'lex-words') { this.face = 'words'; this.page = 0; }
    else if (id === 'lex-reasons') { this.face = 'reasons'; this.page = 0; }
    else if (id === 'lex-yours') { this.face = 'yours'; this.page = 0; }
    else if (id === 'lex-title') { this.face = 'title'; }
    else if (id === 'lex-next') this.page = Math.min(this.pages() - 1, this.page + 1);
    else if (id === 'lex-prev') this.page = Math.max(0, this.page - 1);
    return true;
  }

  private pages(): number {
    if (this.face === 'words') return TERMS.length;
    if (this.face === 'reasons') return REASON_PAGES.length;
    return 1;
  }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number, hits: Hit[]): void {
    hits.length = 0;
    // the disc's own ground: navy, a band of lighter blue under the title, as the period's titles had
    px(ctx, 0, 0, W, H, ERA1.navy);
    if (this.face === 'title') this.drawTitle(ctx, W, H);
    else if (this.face === 'words') this.drawWord(ctx, W, H, hits);
    else if (this.face === 'reasons') this.drawReasons(ctx, W, H, hits);
    else this.drawYours(ctx, W, H);
    this.drawTabs(ctx, W, H, hits);
  }

  /** the gilded title, in hard steps: shadow, three depths of gold, the face */
  private gilded(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number): void {
    setFont(ctx, size);
    const depth = [ERA1.black, ERA1.greyDark, ERA1.olive, ERA1.olive, ERA1.warnDark];
    depth.forEach((c, i) => { ctx.fillStyle = c; ctx.fillText(text, x + (depth.length - i), y + (depth.length - i)); });
    ctx.fillStyle = ERA1.tooltip; ctx.fillText(text, x, y);
    // the period's highlight: a hard white line through the upper third of the letters
    ctx.save(); ctx.beginPath(); ctx.rect(x, y + Math.round(size * 0.18), ctx.measureText(text).width, Math.max(1, Math.round(size / 14))); ctx.clip();
    ctx.fillStyle = ERA1.white; ctx.fillText(text, x, y); ctx.restore();
  }

  /** the open book, drawn in rects: two pages, ruled lines, a gilt edge, a shadow */
  private book(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    px(ctx, x + 6, y + 6, w, h, ERA1.black);
    px(ctx, x, y, w, h, ERA1.olive);
    const half = Math.floor((w - 6) / 2);
    px(ctx, x + 3, y + 3, half, h - 6, ERA1.paper);
    px(ctx, x + 3 + half + 2, y + 3, half - 2, h - 6, ERA1.paper);
    px(ctx, x + 3 + half, y + 3, 2, h - 6, ERA1.grey);   // the gutter
    for (let r = 0; r < Math.floor((h - 18) / 7); r++) {
      px(ctx, x + 9, y + 10 + r * 7, half - 14, 1, ERA1.silver);
      px(ctx, x + half + 11, y + 10 + r * 7, half - 16, 1, ERA1.silver);
    }
    px(ctx, x + 9, y + 10, 14, 13, ERA1.warn);   // the illuminated capital
  }

  private drawTitle(ctx: CanvasRenderingContext2D, W: number, _H: number): void {
    px(ctx, 0, 34, W, 2, ERA1.titleBlue);
    this.book(ctx, 30, 110, 190, 120);
    this.gilded(ctx, L.title, 36, 48, 40);
    setFont(ctx, 14); ctx.fillStyle = ERA1.white; ctx.fillText(L.edition, 252, 128);
    setFont(ctx, 9); ctx.fillStyle = ERA1.silver;
    wrapText(ctx, L.sub, W - 268).forEach((l, i) => ctx.fillText(l, 252, 152 + i * 12));
    const n = ledger.lexicon.length;
    setFont(ctx, 9); ctx.fillStyle = ERA1.tooltip;
    ctx.fillText(n ? L.metCount.replace('{n}', String(n)).replace('{m}', String(TERMS.length)) : L.yoursNone, 252, 196);
  }

  private drawWord(ctx: CanvasRenderingContext2D, W: number, H: number, hits: Hit[]): void {
    const t = TERMS[this.page];
    const labels = L.statusLabels as Record<string, string>;
    this.gilded(ctx, t.term.toUpperCase(), 20, 18, t.term.length > 22 ? 16 : 22);
    setFont(ctx, 9); ctx.fillStyle = ERA1.silver;
    ctx.fillText(t.eras.join(' · '), 20, 52);
    if (ledger.lexicon.includes(t.id)) { ctx.fillStyle = ERA1.tooltip; ctx.fillText(L.met, W - 20 - ctx.measureText(L.met).width, 52); }
    // the status, on a plate
    setFont(ctx, 10);
    const st = labels[t.status] ?? t.status;
    const sw = Math.ceil(ctx.measureText(st).width) + 14;
    px(ctx, 20, 66, sw, 16, t.status === 'community' ? ERA1.ok : t.status === 'documented' ? ERA1.teal : ERA1.warnDark);
    ctx.fillStyle = ERA1.white; ctx.fillText(st, 27, 69);
    // the plain line
    setFont(ctx, 12); ctx.fillStyle = ERA1.white;
    let y = 96;
    for (const l of wrapText(ctx, t.close, W - 40)) { ctx.fillText(l, 20, y); y += 16; }
    // as it was sold
    if (t.word && t.line) {
      y += 10;
      setFont(ctx, 9); ctx.fillStyle = ERA1.silver; ctx.fillText(L.sold, 20, y); y += 14;
      px(ctx, 20, y - 3, W - 40, 1, ERA1.titleBlue);
      setFont(ctx, 10); ctx.fillStyle = ERA1.tooltip;
      for (const l of wrapText(ctx, `${L.wotdPrefix} ${t.word}. ${t.line}`, W - 48)) { ctx.fillText(l, 24, y + 4); y += 13; }
    }
    this.pager(ctx, W, H, hits);
  }

  private drawReasons(ctx: CanvasRenderingContext2D, W: number, H: number, hits: Hit[]): void {
    const pg = REASON_PAGES[this.page];
    const g = pg.g;
    if (g === 'arc') {
      this.gilded(ctx, L.arcTitle.toUpperCase(), 20, 18, 20);
      setFont(ctx, 11); ctx.fillStyle = ERA1.white;
      let y = 62;
      for (const a of L.arc) { for (const l of wrapText(ctx, a, W - 40)) { ctx.fillText(l, 20, y); y += 15; } y += 8; }
      this.pager(ctx, W, H, hits);
      return;
    }
    this.gilded(ctx, (L.groups as Record<string, string>)[g].toUpperCase(), 20, 18, 20);
    setFont(ctx, 9); ctx.fillStyle = ERA1.silver;
    let y = 50;
    if (this.page === 0) { for (const l of wrapText(ctx, L.reasonsIntro, W - 40)) { ctx.fillText(l, 20, y); y += 11; } y += 6; }
    for (const r of pg.rows) {
      setFont(ctx, 9); ctx.fillStyle = ERA1.white;
      const rows = wrapText(ctx, r.reason, W - 150);
      rows.forEach((l, i) => ctx.fillText(l, 20, y + i * 11));
      ctx.fillStyle = ERA1.silver; ctx.fillText(r.era, W - 124, y);
      ctx.fillStyle = ERA1.tooltip; ctx.fillText(shortStatus(r.status), W - 124, y + 11);
      y += Math.max(rows.length, 2) * 11 + 5;
    }
    this.pager(ctx, W, H, hits);
  }

  private drawYours(ctx: CanvasRenderingContext2D, _W: number, H: number): void {
    this.gilded(ctx, L.tabs.yours.toUpperCase(), 20, 18, 20);
    setFont(ctx, 10); ctx.fillStyle = ERA1.silver;
    if (!ledger.lexicon.length) { ctx.fillText(L.yoursNone, 20, 62); return; }
    ctx.fillText(L.yoursIntro, 20, 56);
    let y = 76;
    for (const id of ledger.lexicon) {
      const t = TERMS.find((x) => x.id === id);
      if (!t || y > H - 70) continue;
      setFont(ctx, 11); ctx.fillStyle = ERA1.tooltip; ctx.fillText(t.term, 24, y);
      setFont(ctx, 9); ctx.fillStyle = ERA1.silver;
      ctx.fillText((L.statusLabels as Record<string, string>)[t.status] ?? '', 230, y + 1);
      y += 17;
    }
  }

  private pager(ctx: CanvasRenderingContext2D, W: number, H: number, hits: Hit[]): void {
    const y = H - 62, n = this.pages();
    const btn = (label: string, x: number, id: string): void => {
      bevel(ctx, x, y, 70, 20, true); setFont(ctx, 10); ctx.fillStyle = ERA1.black;
      ctx.fillText(label, x + Math.round((70 - ctx.measureText(label).width) / 2), y + 5); hits.push({ x, y, w: 70, h: 20, id });
    };
    if (this.page > 0) btn(L.prev, 20, 'lex-prev');
    if (this.page < n - 1) btn(L.next, W - 90, 'lex-next');
    setFont(ctx, 9); ctx.fillStyle = ERA1.silver;
    const pg = L.page.replace('{i}', String(this.page + 1)).replace('{n}', String(n));
    ctx.fillText(pg, Math.round((W - ctx.measureText(pg).width) / 2), y + 6);
  }

  /** the row of chapter buttons along the foot, as the period's titles had them */
  private drawTabs(ctx: CanvasRenderingContext2D, W: number, H: number, hits: Hit[]): void {
    const y = H - 32, h = 24;
    px(ctx, 0, y - 6, W, 1, ERA1.titleBlue);
    const tabs: Array<[string, string]> = [[L.tabs.words, 'lex-words'], [L.tabs.reasons, 'lex-reasons'], [L.tabs.yours, 'lex-yours'], [L.tabs.close, 'lex-close']];
    const w = Math.floor((W - 20 - 8 * 3) / 4);
    tabs.forEach(([label, id], i) => {
      const x = 10 + i * (w + 8);
      const on = (id === 'lex-words' && this.face === 'words') || (id === 'lex-reasons' && this.face === 'reasons') || (id === 'lex-yours' && this.face === 'yours');
      bevel(ctx, x, y, w, h, !on);
      setFont(ctx, 10); ctx.fillStyle = ERA1.black;
      ctx.fillText(label, x + Math.round((w - ctx.measureText(label).width) / 2), y + 7);
      hits.push({ x, y, w, h, id });
    });
  }
}

/** the research's status column, in the Lexicon's own short words */
function shortStatus(s: string): string {
  const u = s.toUpperCase();
  if (u.startsWith('NOT SUPPORTED')) return 'not supported';
  if (u.startsWith('NOT AN EMPIRICAL')) return 'not a finding';
  if (u.startsWith('CONTESTED')) return 'disputed';
  if (u.startsWith('DOCUMENTED')) return 'documented';
  if (u.startsWith('NO SOURCE')) return 'no source gives it';
  return s.toLowerCase().slice(0, 18);
}

/** the player met a word where the system used it: once, in order (the Close's "Your Words") */
export function meetWord(id: string): void {
  if (!ledger.lexicon.includes(id)) ledger.lexicon.push(id);
}
