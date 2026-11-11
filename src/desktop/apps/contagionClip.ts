/**
 * ⚑ S321 — THE CLIP: an AI-made anti-"gender ideology" video, invented (DESIGN_2026_V3_PRESSURE_2026-11-07.md beat 11,
 * his ruling: "direct and brute: not violence, but close enough to the real genre to teach the visitor to recognise
 * it"). Its tropes are the ones RESEARCH_2026_V3_THREADS thread 4 documents — contagion (one friend, a chat, a class),
 * "who is talking to your child", a line that only goes up, "share before it's too late" — drawn in my own frames and
 * words, never copied from any real video. No real people, no faces: grey figures that turn red.
 *
 * ⚑ IT SAYS WHAT IT IS. A "Made with AI" stamp sits in its own corner on every frame (GLAAD's 2026 index warns of AI
 * anti-LGBTQ+ fakes; the piece shows one plainly labelled, which is more than the genre does).
 *
 * ⚑ S360 / clip (his 11 Nov: "Is it the AI that makes the video of the social contagion to her?" — yes; "music and a
 * narrator") — NOW MADE FOR MAYA, BY SECOND THOUGHTS, OUT OF HER OWN WEEK: the lot's five (Ola, Priya, Rae, Sam, Maya),
 * her 18th birthday, the clinic number 4,815, Meridian's door. Seven frames (ten since S364, below), and — his rule for the system's new media —
 * OVER THE TOP: a sparkling spotlight, a flash and a shake on every title card, glossy gold rules round the caption,
 * the genre's shouting capitals with a hot-red drop shadow. The last frame turns the alarm into the system's promise
 * ("YOU CAN STILL COME BACK.") under a sunburst. Never violent, no faces, never a medical word, never a joke at her.
 * Colours are only the palette's own (PLACE / ERA4 / WEB / CLIP in theme/era4.ts) — the red is the room's bookshelf red,
 * the gold the sun's.
 *
 * ONE SHARED PAINTER: the bot's map panel on the monitor plays it, and the room builder projects the same frames on
 * the ceiling. Signature (stable — the room imports it):
 *     drawContagionClip(ctx, t, x, y, w, h)
 * `t` is seconds since the clip began; it loops (CLIP_LOOP_SECONDS = the sum of `frameHolds`, 50 s since S364). The picture
 * changes at most ~8 times a second, so a caller that uploads on change stays cheap. Words and holds:
 * `data/dialog/s4_v3.json` `clip`.
 *
 * ⚑ S364 / clip (UiB job 14 Part B / N8; his 11 Nov on the 32 s cut: "needs a bit more of content, maybe we can push to
 * 45 seconds?") — THREE CARDS OF "SIGNS" after the birthday (frames 3–5, `sceneSigns`): the AI's diagnosis as a checklist
 * applied to her week — the parent-reported signs of the 2018 paper, each ticked on a beat with its "evidence" from her
 * own data, which never supports it (the collapse, built in); then a 5 / 5 stamp. Never the theory's name, never a
 * medical word. Ten frames now, 50 s (the narrator's own pace; s4_v3.json `clip._docS364` has the arithmetic).
 *
 * ⚑ SOUND (S360): `startClipSound()` / `stopClipSound()` below — the music bed and the narrator, in sync with t = 0.
 * The ceiling projection in the room stays silent (it never calls them).
 */
import V3 from '../../../data/dialog/s4_v3.json';
import { CLIP, PLACE, ERA4 } from '../theme/era4';
import { px } from '../theme/chrome';
import { fontFor, monoFor } from '../theme/fonts';
import { playLoop, playOnce, stopClip } from '../../audio/tapeAudio';

const C = V3.clip;
/** ⚑ S360 — each card's hold in seconds (its narrator line + 0.15 s entry + ≥ 0.6 s of air, on the music's beats) */
export const CLIP_HOLDS: readonly number[] = C.frames.map((_, i) => (C as { frameHolds?: number[] }).frameHolds?.[i] ?? C.frameSeconds);
/** each card's onset, seconds into the loop */
export const CLIP_ONSETS: readonly number[] = CLIP_HOLDS.map((_, i) => CLIP_HOLDS.slice(0, i).reduce((a, b) => a + b, 0));
export const CLIP_LOOP_SECONDS = CLIP_HOLDS.reduce((a, b) => a + b, 0);

const HOT = PLACE.book;       // the room's bookshelf red — the "caught" colour at full volume
const GOLD = PLACE.sunHi;
const GOLD2 = PLACE.sun;
const GREY = CLIP.figure;

// ── pixel glyphs (3 × 5 cells) for the clip's numerals, its one question mark, and the 5 / 5 stamp ──
const GLYPH: Record<string, string[]> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '8': ['111', '101', '111', '101', '111'],
  '?': ['111', '001', '011', '000', '010'],
  '/': ['001', '001', '010', '100', '100'],
};
/** ⚑ S364 — the tick, in pixels (8 × 6 cells): the font may not carry ✓, and a marker's tick is chunkier anyway */
const CHECK = ['00000011', '00000110', '10001100', '11011000', '01110000', '00100000'];
function check(ctx: CanvasRenderingContext2D, x: number, y: number, cell: number, col: string): void {
  for (let r = 0; r < CHECK.length; r++) for (let c = 0; c < 8; c++) if (CHECK[r][c] === '1') px(ctx, x + c * cell, y + r * cell, cell, cell, col);
}
/** the "Made with AI" stamp's type size for a clip `h` tall (the signs panel keeps clear of it) */
const tagSizeFor = (h: number): number => Math.max(7, Math.min(11, Math.round(h * 0.08)));
function glyphs(ctx: CanvasRenderingContext2D, str: string, x: number, y: number, cell: number, col: string): number {
  let cx = x;
  for (const ch of str) {
    const g = GLYPH[ch];
    if (!g) { cx += 2 * cell; continue; }
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r][c] === '1') px(ctx, cx + c * cell, y + r * cell, cell, cell, col);
    cx += 4 * cell;
  }
  return cx - x - cell;
}

/** a faceless figure, `s` px per cell: head, body */
function figure(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, col: string): void {
  px(ctx, x + s, y, 2 * s, 2 * s, col);
  px(ctx, x, y + 2 * s, 4 * s, 4 * s, col);
}

/** the same figure, hot: a stepped red halo round it, so the red reads as a light */
function hotFigure(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, a: number): void {
  ctx.globalAlpha = 0.16 * a;
  px(ctx, x - 2 * s, y - s, 8 * s, 8 * s, HOT);
  ctx.globalAlpha = 0.24 * a;
  px(ctx, x - s, y - s / 2, 6 * s, 7 * s, HOT);
  ctx.globalAlpha = 1;
  figure(ctx, x, y, s, HOT);
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, size: number, maxW: number): number {
  ctx.font = fontFor(size, 'e4');
  while (size > 6 && ctx.measureText(text).width > maxW) { size--; ctx.font = fontFor(size, 'e4'); }
  return size;
}

/** a sparkle: four arms and a bright heart — the "glossy" of it */
function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, big: boolean): void {
  const arm = big ? 3 : 2;
  px(ctx, x - arm * s, y, (2 * arm + 1) * s, s, GOLD);
  px(ctx, x, y - arm * s, s, (2 * arm + 1) * s, GOLD);
  px(ctx, x - s, y - s, 3 * s, 3 * s, PLACE.mug);
}

/** rays of dots from a centre, rotating: the sunburst */
function rays(ctx: CanvasRenderingContext2D, cx: number, cy: number, reach: number, count: number, rot: number, s: number, col: string): void {
  for (let i = 0; i < count; i++) {
    const a = rot + (i * Math.PI * 2) / count;
    const ca = Math.cos(a), sa = Math.sin(a);
    for (let r = 4 * s; r < reach; r += s * 2) px(ctx, cx + ca * r, cy + sa * r, s, s, col);
  }
}

interface G {
  x: number; y: number; w: number; h: number; sceneH: number; s: number; midX: number; midY: number;
  k: number;     // 0 … 1 through this card, in sixteenths
  q: number;     // the clock in eighths of a second (the sparkle's tick)
  f: number;
  sec: number;   // S364: seconds into this card, in eighths (the signs' ticks land on the music's beats)
}

/** the lot, as the messenger names it (s4_v3.json messenger house: 'Ola, Priya, Rae, Sam, you'); the fifth is her */
const LOT = ['Ola', 'Priya', 'Rae', 'Sam', 'Maya'];

// ── 0 · IT STARTED WITH ONE FRIEND. — the shape of the lot: five figures, one turns red, then the rest ──
function sceneLot(ctx: CanvasRenderingContext2D, g: G): void {
  const { s, midX, midY, k } = g;
  const names = LOT;
  const gap = 7 * s, x0 = midX - Math.floor((4 * s + 4 * 7 * s) / 2);
  const fy = midY - 4 * s;
  const red = (i: number): number => (k >= 0.12 + i * 0.14 ? 1 : 0);   // Ola first … Maya last
  // the line that passes the red from one to the next
  for (let i = 0; i < 4; i++) {
    if (red(i + 1)) px(ctx, x0 + i * gap + 4 * s, fy + 3 * s, 4 * s, Math.max(1, s), HOT);
    else if (red(i)) px(ctx, x0 + i * gap + 4 * s, fy + 3 * s, 2 * s, Math.max(1, s), HOT);
  }
  ctx.font = fontFor(Math.max(6, Math.min(9, 3 * s)), 'e4');
  for (let i = 0; i < 5; i++) {
    const fx = x0 + i * gap;
    if (red(i)) hotFigure(ctx, fx, fy, s, 1);
    else figure(ctx, fx, fy, s, GREY);
    // her name under each: this one is made for HER
    if (s >= 3) {
      const nm = names[i];
      const nw = Math.ceil(ctx.measureText(nm).width);
      ctx.fillStyle = red(i) ? PLACE.mug : ERA4.meta;
      ctx.fillText(nm, fx + 2 * s - Math.floor(nw / 2), fy + 7 * s);
    }
  }
  // a ring round the one that is hers
  if (red(4)) {
    const rx = x0 + 4 * gap - 2 * s, ry = fy - 2 * s;
    px(ctx, rx, ry, 8 * s, 1, GOLD); px(ctx, rx, ry + 10 * s, 8 * s, 1, GOLD);
    px(ctx, rx, ry, 1, 10 * s, GOLD); px(ctx, rx + 8 * s, ry, 1, 10 * s + 1, GOLD);
  }
}

// ── 1 · THEN A GROUP CHAT. — a phone called "the lot", its bubbles going red, a badge counting up ──
function sceneChat(ctx: CanvasRenderingContext2D, g: G): void {
  const { s, midX, y, sceneH, k } = g;
  const pw = 12 * s, ph = Math.min(sceneH - 3 * s, 16 * s), px0 = midX - pw / 2, py0 = y + Math.floor((sceneH - ph) / 2);
  // alarm rings from the phone
  const ring = Math.floor(k * 6);
  for (let r = 0; r < 3; r++) {
    const d = ((ring + r) % 3 + 1) * 2 * s;
    ctx.globalAlpha = 0.35 - r * 0.08;
    const col = HOT;
    px(ctx, px0 - d, py0 - d, pw + 2 * d, 1, col); px(ctx, px0 - d, py0 + ph + d, pw + 2 * d, 1, col);
    px(ctx, px0 - d, py0 - d, 1, ph + 2 * d, col); px(ctx, px0 + pw + d, py0 - d, 1, ph + 2 * d + 1, col);
  }
  ctx.globalAlpha = 1;
  px(ctx, px0, py0, pw, ph, CLIP.line);
  px(ctx, px0 + s, py0 + s, pw - 2 * s, ph - 2 * s, CLIP.band);
  px(ctx, px0 + s, py0 + s, pw - 2 * s, 2 * s, ERA4.panelEdge);            // the header: "the lot"
  for (let i = 0; i < 5; i++) px(ctx, px0 + 2 * s + i * 2 * s, py0 + s + s / 2, s, s, k * 5 > i ? HOT : GREY);   // its five dots
  for (let i = 0; i < 4; i++) {
    const by = py0 + 4 * s + i * 3 * s;
    if (by + 2 * s > py0 + ph - s) break;
    const bw = pw - 6 * s - (i % 2) * s;
    px(ctx, px0 + 2 * s + (i % 2) * 2 * s, by, bw, 2 * s, k * 4.5 > i ? HOT : ERA4.ruleHi);
  }
  // the badge: an unread count, running away
  const n = Math.min(99, Math.round(k * 120));
  const bx = px0 + pw - 2 * s, by0 = py0 - 2 * s;
  px(ctx, bx, by0, 6 * s, 4 * s, HOT);
  px(ctx, bx - 1, by0 + 1, 6 * s + 2, 4 * s - 2, HOT);
  ctx.font = fontFor(Math.max(6, Math.min(10, 3 * s)), 'e4');
  ctx.fillStyle = PLACE.mug;
  const label = n >= 99 ? '99+' : String(n);
  ctx.fillText(label, bx + 3 * s - Math.floor(ctx.measureText(label).width / 2), by0 + Math.round(s / 2));
}

// ── 2 · 18 TODAY. AND IT HAD SPREAD. — the birthday: a gold 18 on a cake, the candles, her friends round it, red ──
function sceneBirthday(ctx: CanvasRenderingContext2D, g: G): void {
  const { s, midX, y, k, q } = g;
  const cell = Math.max(1, Math.floor(s * 1.4));
  // the 18, big, gold, with a red shadow
  const gw = 7 * cell, gx = midX - Math.floor(gw / 2), gy = y + 2 * s;
  glyphs(ctx, '18', gx + cell / 2 + 1, gy + 1, cell, HOT);
  glyphs(ctx, '18', gx, gy, cell, GOLD);
  // the cake: two tiers, a red drip down the top one as the spread comes in
  const cakeY = gy + 5 * cell + 2 * s;
  px(ctx, midX - 9 * s, cakeY + 3 * s, 18 * s, 4 * s, PLACE.textileHi);
  px(ctx, midX - 6 * s, cakeY, 12 * s, 3 * s, PLACE.rugHi);
  const drips = Math.floor(k * 8);
  for (let i = 0; i < 6; i++) if (i * 1.4 < drips) px(ctx, midX - 6 * s + i * 2 * s, cakeY + 3 * s, s, (2 + (i % 3)) * s, HOT);
  for (let i = 0; i < 3; i++) {            // the candles, their flames flickering by the eighth
    const cx = midX - 4 * s + i * 4 * s;
    px(ctx, cx, cakeY - 2 * s, s, 2 * s, PLACE.mug);
    px(ctx, cx, cakeY - 3 * s - ((q + i) % 2), s, s, (q + i) % 3 === 0 ? GOLD2 : GOLD);
  }
  // the five round it, red as the spread arrives
  const fy = cakeY + s;
  const placed = [midX - 17 * s, midX - 13 * s, midX + 9 * s, midX + 13 * s];
  for (let i = 0; i < 4; i++) {
    if (k >= 0.2 + i * 0.15) hotFigure(ctx, placed[i], fy, s, 1); else figure(ctx, placed[i], fy, s, GREY);
  }
  sparkle(ctx, midX - 12 * s, y + 3 * s, Math.max(1, Math.floor(s / 2)), (q % 2) === 0);
  sparkle(ctx, midX + 12 * s, y + 5 * s, Math.max(1, Math.floor(s / 2)), (q % 2) === 1);
}

// ── 3–5 · THE SIGNS (S364; UiB job 14 Part B / N8) — SUDDEN. / ALWAYS ONLINE. / STRUGGLING BEFORE. The parent-reported
//    "signs" of the 2018 paper turned into the AI's CHECKLIST APPLIED TO HER WEEK, in the genre's gloss: a panel whose rows
//    accumulate across the three cards, each tick landing on a beat as the narrator finishes its sentence, each with its
//    "evidence" from her own data in small mono type. The evidence never supports the tick ("came out suddenly": Mum, June
//    2023, "so proud of you") — that is the collapse, built in. Then the stamp: 5 / 5. It never names the theory. ──
interface SignCard { frame: number; ticks: number[]; stampAt?: number }
const SIGNS = C.signs;
const SIGN_CARDS: readonly SignCard[] = SIGNS.cards;
const SIGN_FRAMES = new Set(SIGN_CARDS.map((c) => c.frame));

function sceneSigns(ctx: CanvasRenderingContext2D, g: G): void {
  const { x, y, w, h, sceneH, midX, f, sec, q } = g;
  const ci = SIGN_CARDS.findIndex((c) => c.frame === f);
  if (ci < 0) return;
  const card = SIGN_CARDS[ci];
  const rows = SIGNS.rows;
  const before = SIGN_CARDS.slice(0, ci).reduce((a, c) => a + c.ticks.length, 0);
  const shown = Math.min(rows.length, before + card.ticks.length);

  // the header band sits beside the "Made with AI" stamp, never under it
  const tag = tagSizeFor(h);
  ctx.font = fontFor(tag, 'e4');
  const tagRight = x + 3 + Math.ceil(ctx.measureText(C.aiTag).width) + 8;
  const titleSize = Math.max(tag + 2, Math.min(20, Math.round(sceneH * 0.075)));
  const top = y + 2, bottom = y + sceneH - 2;
  const headB = Math.max(y + 3 + tag + 6, top + titleSize + 5);
  const rowsTop = headB, rowsBottom = bottom - 1, avail = rowsBottom - rowsTop;
  const m = Math.max(3, Math.round(w * 0.02));

  // type sizes: all five rows with their evidence when that fits at a readable size; otherwise the earlier cards' rows
  // fold to one line (sign + tick) and only this card's rows keep their evidence. Planned for the fullest card, so the
  // panel never changes size between the three cards.
  const widest = (font: string, list: string[]): number => { ctx.font = font; return Math.max(...list.map((t) => Math.ceil(ctx.measureText(t).width))); };
  type Fit = { size: number; ev: number; signLine: number; evLine: number; gap: number; full: boolean; pad: number; box: number; cell: number; indent: number; contentW: number; signW: number };
  const fitAt = (size: number, full: boolean): Fit | null => {
    const ev = Math.max(5, Math.round(size * 0.85));
    const signLine = size + 2, evLine = ev + 2, gap = Math.max(1, Math.round(size * 0.25));
    const rowFull = signLine + evLine + gap, rowFold = signLine + gap;
    const need = full ? rows.length * rowFull
      : Math.max(...SIGN_CARDS.map((c, i) => { const b = SIGN_CARDS.slice(0, i).reduce((a, cc) => a + cc.ticks.length, 0); return b * rowFold + c.ticks.length * rowFull; }));
    if (need > avail) return null;
    const cell = Math.max(1, Math.floor(size / 6)), box = 8 * cell + 2;
    const indent = Math.max(4, Math.round(size * 0.6)), pad = Math.max(3, Math.round(size * 0.5));
    const signW = widest(fontFor(size, 'e4'), rows.map((r) => r.sign));
    const contentW = Math.max(signW + pad + box, indent + widest(monoFor(ev), rows.map((r) => r.evidence)));
    if (contentW + 2 * pad > w - 2 * m) return null;
    return { size, ev, signLine, evLine, gap, full, pad, box, cell, indent, contentW, signW };
  };
  const start = Math.max(7, Math.min(22, Math.round(sceneH * 0.085)));
  let fit: Fit | null = null;
  for (let sz = start; sz >= 9 && !fit; sz--) fit = fitAt(sz, true);
  for (let sz = start; sz >= 5 && !fit; sz--) fit = fitAt(sz, false);
  if (!fit) return;
  const L: Fit = fit;

  // the panel: a glossy slab, gold-ruled, a hot drop shadow — the genre's own furniture
  ctx.font = fontFor(titleSize, 'e4');
  const titleW = Math.ceil(ctx.measureText(SIGNS.title).width);
  const pw = Math.min(w - 2 * m, Math.max(L.contentW, titleW) + 2 * L.pad), px0 = midX - Math.floor(pw / 2);
  ctx.globalAlpha = 0.85; px(ctx, px0 + 2, top + 2, pw, bottom - top, HOT); ctx.globalAlpha = 1;
  px(ctx, px0, top, pw, bottom - top, CLIP.band);
  ctx.globalAlpha = 0.07; px(ctx, px0 + 1, top + 1, pw - 2, Math.round((headB - top) / 2), PLACE.mug); ctx.globalAlpha = 1;
  px(ctx, px0, top, pw, 1, GOLD); px(ctx, px0, bottom - 1, pw, 1, GOLD);
  px(ctx, px0, top, 1, bottom - top, GOLD); px(ctx, px0 + pw - 1, top, 1, bottom - top, GOLD);
  px(ctx, px0 + 1, headB - 2, pw - 2, 1, GOLD2);
  // the title, centred, kept clear of the stamp
  const tx = Math.max(midX - Math.floor(titleW / 2), tagRight + 4), ty = top + Math.max(1, Math.floor((headB - 2 - top - titleSize) / 2));
  ctx.font = fontFor(titleSize, 'e4');
  ctx.fillStyle = HOT; ctx.fillText(SIGNS.title, tx + 1, ty + 1);
  ctx.fillStyle = GOLD; ctx.fillText(SIGNS.title, tx, ty);

  // where the 5 / 5 stamp will land: astride the panel's right edge, over the column of ticks, clear of the words
  const textEnd = px0 + L.pad + L.signW + 2;
  const stampAt = (c: number): { sw: number; sh: number; sx: number; sy: number } => {
    const sw = 19 * c, sh = 9 * c;
    return { sw, sh, sx: Math.max(textEnd, Math.min(px0 + pw - Math.floor(sw / 2), x + w - sw - 2)), sy: Math.max(rowsTop, rowsBottom - sh - 1) };
  };
  let sCell = Math.max(1, Math.min(Math.floor(avail / 10), Math.floor((pw * 0.5) / 19)));
  while (sCell > 1 && stampAt(sCell).sx + stampAt(sCell).sw > x + w - 2) sCell--;
  const S = stampAt(sCell);
  const stamped = card.stampAt !== undefined && sec >= card.stampAt;
  // the score, kept in the header's right-hand end: a running count that turns gold on each beat a tick lands
  const done = before + card.ticks.filter((t) => sec >= t).length;
  const landed = card.ticks.some((t) => sec >= t && sec - t < 0.25);
  const tCell = Math.max(1, Math.floor((headB - 2 - top - 4) / 5));
  const tw = 15 * tCell, tX = px0 + pw - L.pad - tw;
  if (tX > tx + titleW + 2) glyphs(ctx, `${done} / ${rows.length}`, tX, top + Math.max(2, Math.floor((headB - 2 - top - 5 * tCell) / 2)), tCell, landed || stamped ? GOLD : ERA4.meta);

  // the rows: a sign, its box, the tick that lands on the beat; the evidence underneath, typed in just before it
  const fold = (i: number): boolean => !L.full && i < before;
  const rowH = (i: number): number => L.signLine + L.gap + (fold(i) ? 0 : L.evLine);
  const used = Array.from({ length: L.full ? rows.length : shown }, (_, i) => rowH(i)).reduce((a, b) => a + b, 0);
  const spread = L.full ? Math.min(Math.round(L.size * 0.5), Math.floor((avail - used) / rows.length)) : 0;
  const textX = px0 + L.pad, boxX = px0 + L.pad + L.contentW - L.box;
  let ry = rowsTop + Math.max(1, Math.floor(L.gap / 2));
  for (let i = 0; i < shown; i++) {
    const r = rows[i];
    const tickAt = i < before ? -1 : card.ticks[i - before];
    const appear = Math.max(0, tickAt - 1.25);
    if (sec < appear) break;
    const ticked = sec >= tickAt;
    const since = sec - tickAt;
    if (ticked && tickAt >= 0 && since < 0.25) {        // the landing: the row lights up gold for a quarter-second
      ctx.globalAlpha = 0.3; px(ctx, px0 + 1, ry - 1, pw - 2, rowH(i) - L.gap + 1, GOLD); ctx.globalAlpha = 1;
    }
    ctx.font = fontFor(L.size, 'e4');
    ctx.fillStyle = ticked ? CLIP.ink : ERA4.meta;
    ctx.fillText(r.sign, textX, ry);
    // the box, and the tick: a hot shadow under a gold mark, a size bigger on the beat it lands (the slam)
    const by = ry + Math.floor((L.signLine - L.box) / 2);
    px(ctx, boxX, by, L.box, 1, ticked ? GOLD : ERA4.ruleHi); px(ctx, boxX, by + L.box - 1, L.box, 1, ticked ? GOLD : ERA4.ruleHi);
    px(ctx, boxX, by, 1, L.box, ticked ? GOLD : ERA4.ruleHi); px(ctx, boxX + L.box - 1, by, 1, L.box, ticked ? GOLD : ERA4.ruleHi);
    if (ticked) {
      const cell = since >= 0 && since < 0.125 && tickAt >= 0 ? L.cell + 1 : L.cell;
      const cx = boxX + 1 + Math.floor((L.box - 2 - 8 * cell) / 2), cy = by - 2 * cell + Math.floor(L.box / 2);
      check(ctx, cx + Math.max(1, Math.floor(cell / 2)), cy + Math.max(1, Math.floor(cell / 2)), cell, HOT);
      check(ctx, cx, cy, cell, GOLD);
    }
    if (!fold(i)) {
      // the evidence: her own data as the machine files it, typed in during the second before the tick
      const ey = ry + L.signLine;
      const typed = ticked ? r.evidence.length : Math.floor(r.evidence.length * Math.max(0, Math.min(1, (sec - (tickAt - 1)) / 0.75)));
      const text = r.evidence.slice(0, typed);
      px(ctx, textX + 1, ey + 1, 1, L.ev, GOLD2);
      ctx.font = monoFor(L.ev);
      ctx.fillStyle = ERA4.text;
      ctx.fillText(text, textX + L.indent, ey);
      if (!ticked && (q % 2) === 0) px(ctx, textX + L.indent + Math.ceil(ctx.measureText(text).width) + 1, ey + 1, Math.max(2, Math.round(L.ev / 2)), L.ev, GOLD);
    }
    ry += rowH(i) + spread;
  }

  // the stamp: 5 / 5, over the column of ticks, the moment the narrator says "ticked"
  if (stamped) {
    const slam = sec - (card.stampAt ?? 0) < 0.125;      // it lands a size bigger, round the same centre
    const cell = sCell + (slam ? 1 : 0);
    const sw = 19 * cell, sh = 9 * cell;
    const sx = S.sx - (slam ? 9 : 0), sy = S.sy - (slam ? 4 : 0);
    ctx.globalAlpha = 0.88; px(ctx, sx, sy, sw, sh, CLIP.band); ctx.globalAlpha = 1;
    const t = Math.max(1, Math.floor(cell / 2));
    px(ctx, sx, sy, sw, t, HOT); px(ctx, sx, sy + sh - t, sw, t, HOT); px(ctx, sx, sy, t, sh, HOT); px(ctx, sx + sw - t, sy, t, sh, HOT);
    px(ctx, sx + cell, sy + cell, sw - 2 * cell, 1, HOT); px(ctx, sx + cell, sy + sh - cell - 1, sw - 2 * cell, 1, HOT);
    glyphs(ctx, SIGNS.stamp, sx + 2 * cell + Math.max(1, Math.floor(cell / 2)), sy + 2 * cell + Math.max(1, Math.floor(cell / 2)), cell, GOLD2);
    glyphs(ctx, SIGNS.stamp, sx + 2 * cell, sy + 2 * cell, cell, HOT);
    const sp = Math.max(1, Math.floor(g.s / 2));
    sparkle(ctx, sx - 2 * sp, sy + 2 * sp, sp, (q % 2) === 0);
    sparkle(ctx, sx + sw + sp, sy + sh - 2 * sp, sp, (q % 2) === 1);
    if (slam) { ctx.globalAlpha = 0.3; px(ctx, x, y, w, sceneH, PLACE.mug); ctx.globalAlpha = 1; }
  }
}

// ── 6 · 4,815 AND RISING. — the line that only goes up, with her number riding its tip ──
function sceneLine(ctx: CanvasRenderingContext2D, g: G): void {
  const { s, midX, y, sceneH, k, w } = g;
  const gw = Math.min(w - 8 * s, 40 * s), gh = sceneH - 6 * s;
  const gx0 = midX - Math.floor(gw / 2), gy0 = y + 3 * s;
  px(ctx, gx0, gy0 + gh, gw, s, CLIP.line);
  px(ctx, gx0, gy0, s, gh, CLIP.line);
  const steps = Math.max(2, Math.floor(gw / (2 * s)));
  const shown = Math.floor(steps * Math.max(0.2, Math.min(1, k * 1.15 + 0.125)));
  let tipX = gx0, tipY = gy0 + gh;
  for (let i = 0; i < shown; i++) {
    const v = Math.pow(i / steps, 2.2);
    const cx = gx0 + i * 2 * s, top = gy0 + gh - Math.round(v * gh) - s;
    ctx.globalAlpha = 0.28;
    px(ctx, cx, top + 2 * s, 2 * s, gy0 + gh - top - 2 * s, HOT);      // the area under the line, glowing
    ctx.globalAlpha = 1;
    px(ctx, cx, top, 2 * s, s * 2, HOT);
    tipX = cx + 2 * s; tipY = top;
  }
  // an arrowhead at the tip, and her number
  px(ctx, tipX, tipY - s, s, 3 * s, GOLD); px(ctx, tipX + s, tipY, s, s, GOLD); px(ctx, tipX - 2 * s, tipY - 2 * s, 3 * s, s, GOLD);
  const n = Math.round(4815 * Math.min(1, k * 1.15));
  const text = n.toLocaleString('en-GB');
  const size = Math.max(7, Math.min(16, 5 * s));
  ctx.font = fontFor(size, 'e4');
  const tw = Math.ceil(ctx.measureText(text).width);
  const nx = Math.max(gx0 + 3 * s, Math.min(tipX - tw - 2 * s, gx0 + gw - tw)), ny = Math.max(gy0, tipY - size - 3 * s);
  ctx.fillStyle = HOT; ctx.fillText(text, nx + 1, ny + 1);
  ctx.fillStyle = GOLD; ctx.fillText(text, nx, ny);
}

// ── 7 · EVEN MERIDIAN SHUT THE DOOR. — a door, a plate over it, light from the gap narrowing to a line ──
function sceneDoor(ctx: CanvasRenderingContext2D, g: G): void {
  const { s, midX, y, sceneH, k } = g;
  const dw = 14 * s, dh = Math.min(sceneH - 6 * s, 15 * s), dx = midX - Math.floor(dw / 2), dy = y + sceneH - dh - s;
  // the light behind it
  px(ctx, dx - s, dy - s, dw + 2 * s, dh + s, CLIP.line);
  px(ctx, dx, dy, dw, dh, GOLD);
  ctx.globalAlpha = 0.2; px(ctx, dx - 4 * s, dy - 3 * s, dw + 8 * s, dh + 4 * s, GOLD); ctx.globalAlpha = 1;
  // the door swings shut from the left: its leaf grows to fill the frame
  const leaf = Math.min(dw, Math.round(dw * Math.min(1, k * 1.5)));
  px(ctx, dx, dy, leaf, dh, CLIP.band);
  for (let i = 0; i < 3; i++) px(ctx, dx + s, dy + (1 + i * 4) * s, Math.max(0, leaf - 2 * s), 3 * s, ERA4.panelEdge);   // its panels
  if (leaf >= dw) px(ctx, dx + dw - 3 * s, dy + 7 * s, s, s, GOLD);                                                       // its handle
  // a small grey figure in front of it, her
  figure(ctx, dx - 7 * s, dy + dh - 6 * s, s, GREY);
  // the plate over the door: Meridian's name, in its own small capitals
  const plate = 'MERIDIAN';
  ctx.font = fontFor(Math.max(6, Math.min(9, 3 * s)), 'e4');
  const pw = Math.ceil(ctx.measureText(plate).width) + 2 * s;
  px(ctx, midX - Math.floor(pw / 2), dy - 3 * s, pw, 2 * s + 3, ERA4.panelHi);
  ctx.fillStyle = PLACE.mug; ctx.fillText(plate, midX - Math.floor(pw / 2) + s, dy - 3 * s + 2);
  // a bar across it as it shuts
  if (k >= 0.75) { px(ctx, dx - s, dy + 5 * s, dw + 2 * s, s * 2, HOT); }
}

// ── 8 · WHO IS TALKING TO YOU, MAYA? — a small figure under a spotlight, voices round her, one question ──
function sceneVoices(ctx: CanvasRenderingContext2D, g: G): void {
  const { s, midX, y, sceneH, k, q } = g;
  const cx = midX, fy = y + sceneH - 8 * s;
  // the spotlight: a cone of stepped bands down from the top
  for (let r = 0; r < sceneH - 2 * s; r += s) {
    const half = Math.floor(2 * s + r * 0.55);
    ctx.globalAlpha = 0.05 + 0.09 * (1 - r / sceneH);
    px(ctx, cx - half, y + r, 2 * half, s, PLACE.mug);
  }
  ctx.globalAlpha = 1;
  // the giant question mark behind her, hot
  const cell = Math.max(1, Math.floor(s * 1.3));
  glyphs(ctx, '?', cx - Math.floor(1.5 * cell), y + s, cell, HOT);
  // voices: red bubbles with three dots, arriving one by one round her
  const spots = [[-14, -6], [11, -9], [-10, -13], [13, 0], [-16, 2], [6, -14]];
  const nb = Math.floor(k * 7) + 1;
  for (let i = 0; i < Math.min(nb, spots.length); i++) {
    const bx = cx + spots[i][0] * s - 2 * s, by = fy + spots[i][1] * s;
    px(ctx, bx, by, 7 * s, 3 * s, HOT);
    px(ctx, bx + (i % 2 ? 5 : 1) * s, by + 3 * s, s, s, HOT);
    for (let d = 0; d < 3; d++) px(ctx, bx + s + d * 2 * s, by + s, s, s, (q + d + i) % 3 === 0 ? PLACE.mug : PLACE.wallLo);
  }
  figure(ctx, cx - 2 * s, fy, s, GREY);
  // the screen's glow on her
  px(ctx, cx + 3 * s, fy + 2 * s, 2 * s, 3 * s, CLIP.glow);
}

// ── 9 · YOU CAN STILL COME BACK. — the promise: a sunburst, her figure going from red to grey, a way home ──
function sceneBack(ctx: CanvasRenderingContext2D, g: G): void {
  const { s, midX, y, sceneH, k, q, w } = g;
  const cy = y + Math.floor(sceneH * 0.62);
  const rot = (g.k * 0.7);
  rays(ctx, midX, cy, w * 0.9, 18, rot, Math.max(1, Math.floor(s / 2)), GOLD2);
  rays(ctx, midX, cy, w * 0.55, 18, rot + Math.PI / 18, Math.max(1, Math.floor(s / 2)), GOLD);
  // the horizon and the light on it
  px(ctx, midX - 16 * s, cy + 6 * s, 32 * s, s, GOLD);
  ctx.globalAlpha = 0.3; px(ctx, midX - 8 * s, cy - 6 * s, 16 * s, 12 * s, GOLD); ctx.globalAlpha = 1;
  // a door of light at the end of it
  px(ctx, midX + 6 * s, cy - 3 * s, 4 * s, 9 * s, PLACE.mug);
  // her, turning grey as she walks to it: the system's idea of "back"
  const walk = Math.min(1, k * 1.25);
  const fx = midX - 12 * s + Math.round(walk * 12 * s);
  const hot = k < 0.45;
  if (hot) hotFigure(ctx, fx, cy, s, 1); else figure(ctx, fx, cy, s, GREY);
  sparkle(ctx, midX - 14 * s, y + 4 * s, Math.max(1, Math.floor(s / 2)), (q % 2) === 0);
  sparkle(ctx, midX + 15 * s, y + 6 * s, Math.max(1, Math.floor(s / 2)), (q % 2) === 1);
  sparkle(ctx, midX + 2 * s, y + 3 * s, Math.max(1, Math.floor(s / 2)), true);
}

/** S360's seven scenes in order; S364's signs cards are slotted in at their frames (s4_v3.json clip.signs.cards) */
const STORY = [sceneLot, sceneChat, sceneBirthday, sceneLine, sceneDoor, sceneVoices, sceneBack];
const SCENES: ((ctx: CanvasRenderingContext2D, g: G) => void)[] = [];
for (let i = 0, b = 0; i < C.frames.length; i++) SCENES.push(SIGN_FRAMES.has(i) ? sceneSigns : STORY[Math.min(b++, STORY.length - 1)]);

export function drawContagionClip(ctx: CanvasRenderingContext2D, t: number, x: number, y: number, w: number, h: number): void {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  if (w <= 0 || h <= 0) return;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.textBaseline = 'top';
  px(ctx, x, y, w, h, CLIP.field);
  const loop = ((t % CLIP_LOOP_SECONDS) + CLIP_LOOP_SECONDS) % CLIP_LOOP_SECONDS;
  let f = CLIP_ONSETS.length - 1;
  for (let i = 0; i < CLIP_ONSETS.length; i++) if (loop < CLIP_ONSETS[i] + CLIP_HOLDS[i]) { f = i; break; }
  const into = loop - CLIP_ONSETS[f];
  const k = Math.min(1, Math.floor((into / CLIP_HOLDS[f]) * 16) / 16);   // 0..1 within the card, in sixteenths
  const sec = Math.floor(into * 8) / 8;                                 // S364: seconds into the card, in eighths
  const q = Math.floor(loop * 8);                                       // the sparkle's own clock: eighths of a second
  const bandH = Math.max(12, Math.round(h * 0.2));
  const sceneH = h - bandH;
  const s = Math.max(1, Math.floor(sceneH / 18));
  const midX = x + Math.floor(w / 2), midY = y + Math.floor(sceneH / 2);
  const g: G = { x, y, w, h, sceneH, s, midX, midY, k, q, f, sec };

  // the glossy ground: a spotlight pool in nested rectangles, and a shine that sweeps across on a slant
  for (let i = 0; i < 5; i++) {
    ctx.globalAlpha = 0.5;
    const inset = Math.round((i / 5) * Math.min(w, sceneH) * 0.4);
    px(ctx, x + inset * 1.6, y + inset, w - 3.2 * inset, sceneH - 2 * inset, i % 2 ? CLIP.field : ERA4.fieldLo);
  }
  ctx.globalAlpha = 1;
  const sweep = ((loop * 0.45) % 1.6) - 0.3;           // 0 … 1 across the width, then rests off-screen
  ctx.globalAlpha = 0.07;
  for (let r = 0; r < sceneH; r += Math.max(1, s)) px(ctx, x + Math.round((sweep + r / (sceneH * 4)) * w), y + r, Math.round(w * 0.12), Math.max(1, s), PLACE.mug);
  ctx.globalAlpha = 1;

  // the card: a shake and a flash on its first eighth — the title card hits
  const hit = into < 0.14;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, sceneH); ctx.clip();
  if (hit) ctx.translate(q % 2 ? 1 : -1, 0);
  SCENES[f](ctx, g);
  ctx.restore();
  if (hit) { ctx.globalAlpha = 0.38; px(ctx, x, y, w, sceneH, PLACE.mug); ctx.globalAlpha = 1; }

  // the caption band, in the genre's own shouting capitals: gold rules, a hot drop shadow
  px(ctx, x, y + sceneH, w, bandH, CLIP.band);
  px(ctx, x, y + sceneH, w, 1, GOLD);
  px(ctx, x, y + sceneH + 1, w, 1, HOT);
  px(ctx, x, y + h - 2, w, 1, HOT);
  px(ctx, x, y + h - 1, w, 1, GOLD);
  const cap = C.frames[f];
  const size = fitFont(ctx, cap, Math.max(7, Math.round(bandH * 0.62)), w - 10);
  const tw = Math.ceil(ctx.measureText(cap).width);
  const tx = x + Math.max(4, Math.round((w - tw) / 2)), ty = y + sceneH + Math.round((bandH - size) / 2) + 1;
  ctx.fillStyle = HOT; ctx.fillText(cap, tx + 1, ty + 1);
  ctx.fillStyle = f === CLIP_HOLDS.length - 1 ? GOLD : CLIP.ink; ctx.fillText(cap, tx, ty);
  // the stamp: it says what it is
  const tagSize = tagSizeFor(h);
  ctx.font = fontFor(tagSize, 'e4');
  const tagW = Math.ceil(ctx.measureText(C.aiTag).width) + 8;
  px(ctx, x + 3, y + 3, tagW, tagSize + 5, CLIP.stamp);
  ctx.fillStyle = CLIP.stampInk;
  ctx.fillText(C.aiTag, x + 7, y + 5);
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// ⚑ S360 / clip (his 11 Nov: "music and a narrator") — THE CLIP'S SOUND.
//
// startClipSound() starts the music bed (clip_music.mp3, a 50 s loop on the same grid as the cards) and schedules the
// narrator: card n's file (clip_narr_n.mp3, the SYSTEM's synthetic voice, build-time TTS) starts `narratorDelay` after
// the card's onset, and again on every loop. The caller calls it when the clip's t is 0 (the picture and the sound
// then share one grid; the music's own currentTime is the clock, so a game-menu hold — which pauses every one-shot —
// holds the narrator too). stopClipSound() ends all of it. The ceiling projection never calls either: it stays silent.
// Memory only, no storage; the files are registered in tapeAudio.ts's REGISTRY and named in captions.json.
// ═══════════════════════════════════════════════════════════════════════════
const NARRATOR_DELAY = (C as { narratorDelay?: number }).narratorDelay ?? 0.15;
let soundTimer: number | null = null;
let music: HTMLAudioElement | null = null;
let narrators: HTMLAudioElement[] = [];

export function startClipSound(): void {
  stopClipSound();
  music = playLoop('clip_music.mp3');
  const wall0 = performance.now();
  const fired = new Set<number>();
  let last = 0;
  soundTimer = window.setInterval(() => {
    // the music is the clock when it exists (it freezes when the menu holds it); a missing file falls back to the wall
    const now = music ? music.currentTime : (performance.now() - wall0) / 1000 % CLIP_LOOP_SECONDS;
    if (now < last - 1) fired.clear();                                  // the loop wrapped
    last = now;
    for (let i = 0; i < CLIP_ONSETS.length; i++) {
      const at = CLIP_ONSETS[i] + NARRATOR_DELAY;
      if (fired.has(i) || now < at || now > at + 0.6) continue;         // never start a line late
      fired.add(i);
      const a = playOnce(`clip_narr_${i}.mp3`);
      if (a) narrators.push(a);
    }
    narrators = narrators.filter((a) => !a.ended);
  }, 40);
}

export function stopClipSound(): void {
  if (soundTimer !== null) { window.clearInterval(soundTimer); soundTimer = null; }
  stopClip(music); music = null;
  for (const a of narrators) stopClip(a);
  narrators = [];
}
