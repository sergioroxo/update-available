/**
 * ⚑ S378 (UiB job 20 Part A) — THE MACHINE'S OWN PAGES, in the site viewer. His ask (12 Nov): "should we make one of the
 * panels the computer, so instead of being hidden and trigger phantom clicks to it… we can open fake html pages like the
 * other panels, that way it can work separately with a better design, making the Lexicon also accessible…".
 *
 * Until S378 the end of the Close was a card on Daniel's CRT standing back in the sky: a press on its far glass flew the
 * eye to it, and the glass — a bare plane through the whole ray — caught presses meant for other things. Now the computer
 * is a fifth panel in the Close's row (src/room/pointCloud.ts), and a press on it opens THIS: the machine's page, in the
 * same window the four rooms' panels open their websites in, on the computer and in the headset.
 *
 * Three pages, one window:
 *   · `machine` — the card's words laid out as a page (close_restart.json, reused unchanged): the mark and the span, "Restart
 *     as you are.", the file's size and the sentence that answers it, the four rooms, Start again, and the way on to the
 *     Receipt, the dossier (the four years as websites, in this same window) and the Lexicon;
 *   · `receipt` — the version history, printed: tractor-feed paper rising out of a dot-matrix printer at the foot of the
 *     window, a line at a time (S204), then scrolled like any page (src/witness/receiptLines.ts composes it);
 *   · `lexicon` — the one Lexicon (src/room/lexicon.ts, job 17 B's Multimedia Edition), drawn at its own 512 × 384 and
 *     scaled into the window, its presses mapped back to it. The menu and the setup open the same page (Part B).
 *
 * Frame voice: functional, plain, never playing. The machine's page wears the machine's own colours (ERA1's black glass,
 * silver words, the period's bevelled buttons) and its own face (Fixedsys Excelsior, the 1997 desktop's). Type is sized
 * for the headset: the viewer's window is 1024 logical px across 59° there (≈0.058° a px), so the smallest line here is
 * 18 px (≈1.04°), every reading line at least 22 px, the title 40–48 px. Nothing is stored; nothing is fetched.
 */
import card from '../../../data/strings/close_restart.json';
import lexStrings from '../../../data/strings/lexicon.json';
import { ERA1 } from '../../desktop/theme/era1';
import { PRINTOUT } from '../../desktop/theme/calendar';
import { FACES } from '../../desktop/theme/fonts';
import { recordEntries } from '../../witness/record';
import { composeReceipt, type PLine } from '../../witness/receiptLines';
import { Lexicon } from '../../room/lexicon';
import { drawButton, roundRect, type DrawEnv, type Hit } from './frame';
import type { Rect } from './layout';

/** the machine's own face (the 1997 desktop's bitmap face, vendored S373 — no font is ever fetched) */
export const MACHINE_FACE = FACES.e1.family;
const F = (px: number): string => `${px}px ${MACHINE_FACE}`;
const M = (card as unknown as { machine: MachineCopy }).machine;
interface MachineCopy {
  panelHint: string; panelButton: string; windowTitle: string; tabs: { machine: string; receipt: string; lexicon: string };
  back: string; roomsLabel: string; moreLabel: string; status: string; chip: string;
  tips: { era: string; again: string; receipt: string; dossier: string; lexicon: string; back: string; machine: string; printing: string; printed: string };
}
export const MACHINE_COPY = M;

const text = (ctx: CanvasRenderingContext2D, s: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'left'): void => {
  ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y); ctx.textAlign = 'left';
};
function wrapLines(ctx: CanvasRenderingContext2D, s: string, font: string, maxW: number): string[] {
  ctx.font = font;
  const out: string[] = []; let line = '';
  for (const w of s.split(' ')) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
  }
  if (line) out.push(line);
  return out;
}
/** the largest size ≤ `px` (and ≥ `min`) at which `s` fits on one line of `maxW` */
function fitPx(ctx: CanvasRenderingContext2D, s: string, px: number, maxW: number, min: number): number {
  let p = px;
  for (; p > min; p -= 2) { ctx.font = F(p); if (ctx.measureText(s).width <= maxW) break; }
  return p;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// THE MACHINE'S PAGE — restart
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Draw the restart page into `r` (the window's site region), scrolled by `scroll`; returns the content's full height so
 * the core can scroll it on a short window (a phone). The buttons are pushed onto `e.hits` with ids:
 *   `m:era:e1…e4` (go back to a room), `m:again` (start again), `m:receipt`, `m:dossier`, `m:lexicon`.
 * Three densities, the first that fits: `roomy` (a tall window; the headset's 1024 × 768), `tight` (a laptop's short
 * window: Start again shares its row with the three ways on), `compact` (a phone: two columns, then one); past that it
 * scrolls. Only buttons wholly inside the window are published (a press can only land on what is seen).
 */
export function drawMachinePage(e: DrawEnv, r: Rect, scroll: number): number {
  const { ctx } = e;
  ctx.fillStyle = ERA1.black; ctx.fillRect(r.x, r.y, r.w, r.h);
  const compact = r.w < 700;
  const cw = Math.min(r.w - (compact ? 36 : 96), 1000);
  const x0 = Math.round(r.x + (r.w - cw) / 2);
  const densities: Density[] = compact ? ['compact'] : ['roomy', 'tight'];
  let d: Density = densities[densities.length - 1];
  for (const k of densities) { if (paintMachine(e, x0, 0, cw, k, false) + 2 * PAD[k] <= r.h) { d = k; break; } }
  const H0 = paintMachine(e, x0, 0, cw, d, false);
  const top = r.y + Math.max(PAD[d], Math.round((r.h - H0) / 2)) - scroll;
  ctx.save();
  ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
  const first = e.hits.length;
  paintMachine(e, x0, top, cw, d, true);
  ctx.restore();
  // only what is wholly in the window can be pressed
  const kept = e.hits.slice(first).filter((h) => h.y >= r.y && h.y + h.h <= r.y + r.h);
  e.hits.length = first; e.hits.push(...kept);
  return H0 + 2 * PAD[d];
}

type Density = 'roomy' | 'tight' | 'compact';
const PAD: Record<Density, number> = { roomy: 28, tight: 14, compact: 16 };
const SZ: Record<Density, { hp: number; tp: number; bp: number; cp: number; sp: number; bh: number; gap: number; btn: number; rule: number; afterTitle: number; afterLines: number; afterRooms: number; beforeMakers: number }> = {
  roomy: { hp: 22, tp: 48, bp: 24, cp: 22, sp: 18, bh: 54, gap: 14, btn: 21, rule: 30, afterTitle: 24, afterLines: 22, afterRooms: 40, beforeMakers: 26 },
  tight: { hp: 20, tp: 42, bp: 22, cp: 20, sp: 18, bh: 50, gap: 12, btn: 20, rule: 18, afterTitle: 14, afterLines: 12, afterRooms: 0, beforeMakers: 16 },
  compact: { hp: 18, tp: 36, bp: 20, cp: 18, sp: 18, bh: 48, gap: 10, btn: 19, rule: 22, afterTitle: 18, afterLines: 16, afterRooms: 30, beforeMakers: 18 }
};

/** lay the page out from `top` (draw: paint and push hits; otherwise only measure); returns the height used */
function paintMachine(e: DrawEnv, x0: number, top: number, cw: number, d: Density, draw: boolean): number {
  const { ctx } = e;
  const z = SZ[d];
  let y = top;
  const T = (s: string, x: number, yy: number, font: string, color: string, align: CanvasTextAlign = 'left'): void => { if (draw) text(ctx, s, x, yy, font, color, align); };
  const B = (rect: Rect, label: string, id: string, tip: string): void => { if (draw) drawButton(e, rect, label, id, tip, { font: `700 ${z.btn}px ${MACHINE_FACE}`, style: 'w95' }); };
  // the machine's own header line: its mark, and the span it was running (the card's, S146)
  T(card.mark, x0, y + z.hp / 2, F(z.hp), ERA1.silver);
  T(card.years, x0 + cw, y + z.hp / 2, F(z.hp), ERA1.silver, 'right');
  y += z.hp + 12;
  if (draw) { ctx.fillStyle = ERA1.greyDark; ctx.fillRect(x0, y, cw, 2); }
  y += z.rule;
  // the title
  const tp = fitPx(ctx, card.title, z.tp, cw, 26);
  T(card.title, x0, y + tp / 2, F(tp), ERA1.white);
  y += tp + z.afterTitle;
  // S146: the file's size, then the sentence that answers it
  const all = recordEntries();
  const filed = card.filed.replace('{n}', String(all.length)).replace('{f}', String(all.filter((x) => x.flagged).length));
  const blh = Math.round(z.bp * 1.4);
  for (const s of [filed, card.kept]) {
    for (const l of wrapLines(ctx, s, F(z.bp), cw)) { T(l, x0, y + blh / 2, F(z.bp), ERA1.silver); y += blh; }
    y += 4;
  }
  y += z.afterLines;
  // the choice: the four rooms, then Start again
  const clh = Math.round(z.cp * 1.4);
  for (const l of wrapLines(ctx, card.choose, F(z.cp), cw)) { T(l, x0, y + clh / 2, F(z.cp), ERA1.grey); y += clh; }
  y += 8;
  const cols = d === 'compact' ? 2 : 4;
  const bw = Math.floor((cw - z.gap * (cols - 1)) / cols);
  card.eras.forEach((er, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    B({ x: x0 + col * (bw + z.gap), y: y + row * (z.bh + z.gap), w: bw, h: z.bh }, er.label, `m:era:${er.era}`, M.tips.era.replace('{label}', er.label));
  });
  y += Math.ceil(card.eras.length / cols) * (z.bh + z.gap);
  // Start again: the period's default button (a ring round the bevel). On a tight window it leads the next row, and the
  // three ways on (the receipt, the dossier, the Lexicon — S167, S209) follow it across the same four columns.
  const more: [string, string, string][] = [
    [card.receipt.button, 'm:receipt', M.tips.receipt],
    [card.dossier, 'm:dossier', M.tips.dossier],
    [M.tabs.lexicon, 'm:lexicon', M.tips.lexicon]
  ];
  const again = d === 'compact' ? { x: x0, y, w: cw, h: z.bh } : d === 'tight' ? { x: x0, y, w: bw, h: z.bh } : { x: x0, y, w: bw * 2 + z.gap, h: z.bh };
  if (draw) { ctx.fillStyle = ERA1.white; ctx.fillRect(again.x - 3, again.y - 3, again.w + 6, again.h + 6); }
  B(again, card.again, 'm:again', M.tips.again);
  if (d === 'tight') {
    // a thin rule between the restart and the ways on, so the row reads as two things
    if (draw) { ctx.fillStyle = ERA1.greyDark; ctx.fillRect(x0 + bw + Math.round(z.gap / 2) - 1, y - 4, 2, z.bh + 8); }
    more.forEach(([label, id, tip], i) => B({ x: x0 + (i + 1) * (bw + z.gap), y, w: bw, h: z.bh }, label, id, tip));
    y += z.bh + z.beforeMakers;
  } else {
    y += z.bh + z.afterRooms;
    const mlh = Math.round(z.cp * 1.4);
    T(M.moreLabel, x0, y + mlh / 2, F(z.cp), ERA1.grey);
    y += mlh + 8;
    const mcols = d === 'compact' ? 1 : 3;
    const mw = Math.floor((cw - z.gap * (mcols - 1)) / mcols);
    more.forEach(([label, id, tip], i) => {
      const col = i % mcols, row = Math.floor(i / mcols);
      B({ x: x0 + col * (mw + z.gap), y: y + row * (z.bh + z.gap), w: mw, h: z.bh }, label, id, tip);
    });
    y += Math.ceil(more.length / mcols) * (z.bh + z.gap) - z.gap + z.beforeMakers;
  }
  // S143: the makers, in one line, small — the frame's voice on the last screen
  const slh = Math.round(z.sp * 1.4);
  for (const l of wrapLines(ctx, card.makers, F(z.sp), cw)) { T(l, x0, y + slh / 2, F(z.sp), ERA1.grey); y += slh; }
  return y - top;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// THE RECEIPT — printed (S204), at the window's size
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const PRINT_LPS = 7;   // lines a second — a 1990s dot matrix at draft speed
export class ReceiptPrint {
  private lines: PLine[] = [];
  private key = '';
  private t = 0;
  /** where the paper is, as the viewer's scroll: 0 = the head of the receipt, max = the line just printed */
  maxScroll = 0;
  private follow = true;

  /** start printing again (each time the page is opened) */
  reset(): void { this.lines = []; this.key = ''; this.t = 0; this.follow = true; }
  get printing(): boolean { return this.lines.length === 0 || Math.floor(this.t * PRINT_LPS) < this.lines.length; }
  /** the printer's clock; true when a new line came out (the window repaints) */
  tick(dt: number): boolean {
    if (!this.lines.length) return false;
    const before = Math.floor(this.t * PRINT_LPS);
    if (before >= this.lines.length) return false;
    this.t += dt;
    return Math.floor(this.t * PRINT_LPS) !== before;
  }
  /** the visitor scrolled: stop following the head */
  scrolled(): void { this.follow = false; }

  /** draw into `r`; `scroll` is the viewer's (the core clamps it to `maxScroll`, and asks `wantScroll` while printing) */
  draw(e: DrawEnv, r: Rect, scroll: number, scrollW: number): { wantScroll: number | null } {
    const { ctx } = e;
    ctx.fillStyle = ERA1.black; ctx.fillRect(r.x, r.y, r.w, r.h);
    const avail = r.w - scrollW;
    const compact = avail < 700;
    const fp = compact ? 16 : 19, LH = Math.round(fp * 1.38);
    const pw = Math.min(avail - (compact ? 24 : 80), 820);
    const pl = Math.round(r.x + (avail - pw) / 2), pr = pl + pw;
    const font = F(fp);
    const key = `${pw}|${fp}`;
    if (key !== this.key) {
      ctx.font = font;
      this.lines = composeReceipt((s) => ctx.measureText(s).width, pw - 2 * (compact ? 34 : 44) - 4);
      this.key = key;
    }
    const L = this.lines;
    const shown = Math.min(L.length, Math.floor(this.t * PRINT_LPS));
    const done = shown >= L.length;
    // the printer: a beige body across the foot of the window, its slot, its light
    const bodyH = compact ? 56 : 70;
    const bodyY = r.y + r.h - bodyH, slotY = bodyY + 8;
    const inset = compact ? 34 : 44;
    const contentH = 18 + shown * LH + 28;
    const room = slotY - r.y;
    const overflow = Math.max(0, contentH - room);
    this.maxScroll = overflow;
    let s = Math.max(0, Math.min(overflow, scroll));
    let want: number | null = null;
    if (this.follow) { s = overflow; want = overflow; }
    const paperTop = slotY - contentH + (overflow - s);
    ctx.save();
    ctx.beginPath(); ctx.rect(r.x, r.y, avail, slotY - r.y); ctx.clip();
    const y0 = Math.max(r.y, paperTop);
    ctx.fillStyle = PRINTOUT.paper; ctx.fillRect(pl, y0, pw, slotY - y0);
    // green bars, two lines in every four
    for (let i = 0; i < L.length + 4; i += 4) {
      const b0 = paperTop + 14 + i * LH;
      const a = Math.max(y0, b0), b = Math.min(slotY, b0 + 2 * LH);
      if (b > a) { ctx.fillStyle = PRINTOUT.bar; ctx.fillRect(pl + inset - 10, a, pw - 2 * (inset - 10), b - a); }
    }
    // the sprocket holes, riding with the paper; the perforations either side
    const hs = compact ? 9 : 11;
    for (let hy = paperTop + 8; hy < slotY; hy += hs * 2 + 2) {
      if (hy < y0 - hs) continue;
      ctx.fillStyle = PRINTOUT.hole;
      ctx.beginPath(); ctx.arc(pl + inset / 2 - 4, hy + hs / 2, hs / 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(pr - inset / 2 + 4, hy + hs / 2, hs / 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = PRINTOUT.perf;
    ctx.fillRect(pl + inset - 14, y0, 2, slotY - y0); ctx.fillRect(pr - inset + 12, y0, 2, slotY - y0);
    if (paperTop >= r.y) for (let x = pl; x < pr; x += 10) ctx.fillRect(x, paperTop, 5, 2);   // the tear line
    for (let i = 0; i < shown; i++) {
      const l = L[i];
      const y = paperTop + 16 + i * LH;
      if (y < r.y - LH || y > slotY - 6) continue;
      const tx = pl + inset, cy = y + LH / 2;
      if (l.rule) { ctx.fillStyle = PRINTOUT.inkDim; for (let x = tx; x < pr - inset; x += 10) ctx.fillRect(x, cy, 5, 2); continue; }
      text(ctx, l.t, tx, cy, font, l.col ?? PRINTOUT.ink);
      if (l.right) {
        ctx.font = font;
        const rw = ctx.measureText(l.right).width, lw = ctx.measureText(l.t).width;
        let dots = '';
        while (ctx.measureText(dots + ' .').width < pr - inset - rw - (tx + lw) - 10) dots += ' .';
        text(ctx, dots, tx + lw, cy, font, PRINTOUT.inkDim);
        text(ctx, l.right, pr - inset - rw, cy, font, l.rightCol ?? PRINTOUT.ink);
      }
    }
    ctx.restore();
    // the printer's body over the slot, and its head moving while it prints
    ctx.fillStyle = PRINTOUT.body; ctx.fillRect(pl - 30, bodyY, pw + 60, bodyH);
    ctx.fillStyle = PRINTOUT.bodyDark; ctx.fillRect(pl - 30, bodyY, pw + 60, 3);
    ctx.fillStyle = PRINTOUT.slot; ctx.fillRect(pl, slotY, pw, 6);
    if (!done) { const hx = pl + inset + ((shown * 53) % (pw - 2 * inset - 24)); ctx.fillStyle = PRINTOUT.bodyDark; ctx.fillRect(hx, slotY - 3, 24, 5); }
    ctx.fillStyle = done ? PRINTOUT.led : PRINTOUT.failed; ctx.fillRect(pl - 14, bodyY + 22, 9, 9);
    if (done && this.follow) this.follow = false;
    return { wantScroll: want };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// THE LEXICON — the one Lexicon, scaled into the window
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const LW = 512, LH_ = 384;
export class LexiconPage {
  readonly lex: Lexicon;
  private hits: { x: number; y: number; w: number; h: number; id: string }[] = [];
  private at = { x: 0, y: 0, s: 1 };
  constructor(onChange: () => void) { this.lex = new Lexicon({ onChange }); }
  /** open on its contents (each time it is opened afresh) — ⚑ S381: or on its First Words, for the setup's "Read the
   *  Lexicon first" (siteViewerBus.openAt('lexicon', 'first')) */
  reset(face: 'title' | 'first' = 'title'): void { this.lex.stopSound(); this.lex.press(face === 'first' ? 'lex-first' : 'lex-title'); }
  draw(e: DrawEnv, r: Rect): void {
    const { ctx } = e;
    ctx.fillStyle = ERA1.navy; ctx.fillRect(r.x, r.y, r.w, r.h);
    const pad = r.w < 700 ? 6 : 14;
    const s = Math.min((r.w - pad * 2) / LW, (r.h - pad * 2) / LH_);
    const w = LW * s, h = LH_ * s;
    const x = Math.round(r.x + (r.w - w) / 2), y = Math.round(r.y + (r.h - h) / 2);
    this.at = { x, y, s };
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.imageSmoothingEnabled = false;
    this.lex.draw(ctx, LW, LH_, this.hits);
    ctx.restore();
    // a fine frame round the disc's page, in the period's chrome
    ctx.strokeStyle = ERA1.greyDark; ctx.lineWidth = 2; ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
    for (const hb of this.hits) e.hits.push({ x: x + hb.x * s, y: y + hb.y * s, w: hb.w * s, h: hb.h * s, id: `lx:${hb.id}`, tip: tipFor(hb.id) });
  }
  /** a press on one of its hits, by the Lexicon's own id; returns false for `lex-close` (the window's to act on) */
  press(id: string): boolean {
    if (id === 'lex-close') { this.lex.stopSound(); return false; }
    return this.lex.press(id);
  }
  stop(): void { this.lex.stopSound(); }
  /** review tools: the Lexicon's own hits in window px */
  get published(): Hit[] { return this.hits.map((h) => ({ x: this.at.x + h.x * this.at.s, y: this.at.y + h.y * this.at.s, w: h.w * this.at.s, h: h.h * this.at.s, id: `lx:${h.id}`, tip: '' })); }
}
function tipFor(id: string): string {
  const T = (lexStrings as { ui: { tabs: Record<string, string> } }).ui.tabs;
  if (id === 'lex-first') return T.first ?? '';
  if (id === 'lex-words') return T.words;
  if (id === 'lex-reasons') return T.reasons;
  if (id === 'lex-yours') return T.yours;
  if (id === 'lex-sources') return T.sources;
  if (id === 'lex-close') return M.tips.back;
  return '';
}

/** a plain, centred note for a machine page that has nothing to show (never expected; a guard) */
export function drawBlank(e: DrawEnv, r: Rect, s: string): void {
  e.ctx.fillStyle = ERA1.black; e.ctx.fillRect(r.x, r.y, r.w, r.h);
  roundRect(e.ctx, r.x, r.y, r.w, r.h, 0);
  text(e.ctx, s, r.x + r.w / 2, r.y + r.h / 2, F(22), ERA1.silver, 'center');
}
