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
 * `t` is seconds since the clip began; it loops (CLIP_LOOP_SECONDS = the sum of `frameHolds`, 50 s since S364, 58 s since S370). The picture
 * changes at most ~8 times a second, so a caller that uploads on change stays cheap. Words and holds:
 * `data/dialog/s4_v3.json` `clip`.
 *
 * ⚑ S364 / clip (UiB job 14 Part B / N8; his 11 Nov on the 32 s cut: "needs a bit more of content, maybe we can push to
 * 45 seconds?") — THREE CARDS OF "SIGNS" after the birthday (frames 3–5, `sceneSigns`): the AI's diagnosis as a checklist
 * applied to her week — the parent-reported signs of the 2018 paper, each ticked on a beat with its "evidence" from her
 * own data, which never supports it (the collapse, built in); then a 5 / 5 stamp. Never the theory's name, never a
 * medical word. Ten frames now, 50 s (the narrator's own pace; s4_v3.json `clip._docS364` has the arithmetic).
 *
 * ⚑ S370 / clip (UiB job 16 Part C3–C4; his 11 Nov: "the sound is fantastic, love the check marks and the intensity of
 * each of the signs… I meant showing visual aspects of the Signs, not really the messages… in the end it stops quite
 * abruptly the sound and the message. But it is going to a very cool place"; and on Meridian: "if it is clear the point
 * of the conversion therapy targeting more of T now, even from LGB") — three things, and nothing he loved moved:
 *   1. THE SIGNS ARE PICTURES (`sceneSigns`): two panels a card, each the AI's own made picture of a sign (a calendar
 *      flipping to 18 TODAY; her friends lighting up on a spreading map; screen-time bars; hearts; a rain cloud over her
 *      house), with its tick, its beat and its gold tell exactly where S364–S366 put them — and its own evidence, typed
 *      into the picture, undoing it on the beat. Card 5's second panel is the whole checklist, where 5 / 5 lands.
 *   2. MERIDIAN SAYS WHY (`sceneMeridian`, frame 7: "EVEN THE LGB GROUP SAYS YOU'RE NOT ONE OF THEM."): L G B T, the T
 *      falling out of the row; then the AI's screenshot of the email, "as recorded at birth" marked as its proof.
 *   3. AN ENDING (`sceneSlate`, frame 10): the last card holds a second longer, and an end slate in Second Thoughts' own
 *      grammar follows — its mark, its name, "Always on your side.", and "Talk to Second Thoughts" as its one button —
 *      while the music resolves and fades. Eleven frames, 58 s (s4_v3.json `clip._docS370` has the arithmetic).
 * Since S370 the clip is a film with an end, not a loop: `CLIP_LOOP_SECONDS` keeps its name (callers import it) and is
 * still the sum of the holds; the conversation's thumbnail is `CLIP_POSTER_SECONDS` (the last card, not the slate).
 *
 * ⚑ SOUND (S360): `startClipSound()` / `stopClipSound()` below — the music bed and the narrator, in sync with t = 0.
 * The ceiling projection in the room stays silent (it never calls them; since S365 it paints no clip at all).
 */
import V3 from '../../../data/dialog/s4_v3.json';
import B4 from '../../../data/dialog/s4_browser.json';
import { CLIP, PLACE, ERA4, WEB, V3 as INK3, assistantMark, roundRect, pill } from '../theme/era4';
import { px } from '../theme/chrome';
import { fontFor, monoFor } from '../theme/fonts';
import { playOnce, stopClip } from '../../audio/tapeAudio';

const C = V3.clip;
/** ⚑ S360 — each card's hold in seconds (its narrator line + 0.15 s entry + ≥ 0.6 s of air, on the music's beats) */
export const CLIP_HOLDS: readonly number[] = C.frames.map((_, i) => (C as { frameHolds?: number[] }).frameHolds?.[i] ?? C.frameSeconds);
/** each card's onset, seconds into the loop */
export const CLIP_ONSETS: readonly number[] = CLIP_HOLDS.map((_, i) => CLIP_HOLDS.slice(0, i).reduce((a, b) => a + b, 0));
export const CLIP_LOOP_SECONDS = CLIP_HOLDS.reduce((a, b) => a + b, 0);
/** ⚑ S370 — the end slate is the last frame; "YOU CAN STILL COME BACK." is the last card before it */
export const SLATE_FRAME = C.frames.length - 1;
const LAST_CARD = SLATE_FRAME - 1;
/** S370: the last card holds 6 s now, and its picture keeps S360's pace (a 5 s card) before holding */
const BACK_PACE = 5;
/** ⚑ S370 — the conversation's thumbnail of the clip: the last card, at the moment S360–S366's poster showed (4.4 s in) */
export const CLIP_POSTER_SECONDS = CLIP_ONSETS[LAST_CARD] + 4.4;

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
  // ⚑ S370 — the Meridian card's letters
  'L': ['100', '100', '100', '100', '111'],
  'G': ['111', '100', '101', '101', '111'],
  'B': ['110', '101', '110', '101', '110'],
  'T': ['111', '010', '010', '010', '010'],
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

// ── 3–5 · THE SIGNS (S364; UiB job 14 Part B / N8) — SUDDENLY. / ALWAYS ONLINE. / STRUGGLING BEFORE. The parent-reported
//    "signs" of the 2018 paper turned into the AI's CHECKLIST APPLIED TO HER WEEK, in the genre's gloss, each tick landing
//    on a beat as the narrator finishes its sentence, each with its "evidence" from her own data. The evidence never
//    supports the tick ("came out suddenly": Mum, June 2023, "so proud of you") — that is the collapse, built in. Then the
//    stamp: 5 / 5. It never names the theory. ──
//
//    ⚑ S366 (UiB job 15, J15-02; his 11 Nov: "the signs are a bit not explored enough and a bit repetitive logic") — EACH
//    SIGN FAILS IN ITS OWN WAY. Every row's `evidence` is the machine's own data in its own confident voice, and its `tell`
//    (a fragment of that line) is what the machine marks as its proof: on the beat the tick lands, the tell turns gold, the
//    tick's own ink. What it marks is exactly what undoes the tick.
//
//    ⚑ S370 (UiB job 16 Part C3; his 11 Nov: "love the check marks and the intensity of each of the signs… I meant showing
//    visual aspects of the Signs, not really the messages, because they don't show much") — EACH SIGN IS A PICTURE NOW, and
//    the ticks, the beats, the typing and the gold tell are exactly where they were: the pictures are ADDED under them.
//    Two panels a card (card 5: the last sign, and the whole checklist, where the 5 / 5 lands), each the AI's own made
//    picture — it "generates" (a shimmer, then the picture diffusing out of noise), glossy, a little wrong — under its
//    sign and its box. The picture makes the claim; its own evidence, typed into the picture in the second before the
//    tick, undoes it on the beat:
//      (1) SUDDENLY: a calendar flipping fast to "18 TODAY" — and Mum's message pops up on it, dated Jun 2023;
//      (2) FRIENDS TOO: her friends lighting up one after another on a spreading map, the arrows all pointing at her —
//          and "all 4 met after Jun 2023";
//      (3) ALWAYS ONLINE: screen-time bars climbing to 6 h 12 m, the biggest running off the phone — and its label is the
//          clinic's waiting list;
//      (4) SO POPULAR: hearts bursting out of her phone — and on the beat each one turns into a birthday message, a cake;
//      (5) STRUGGLING BEFORE: a rain cloud over her house — and the cloud is Dad's line, Sep 2025.
//    No faces (grey figures, as the clip's others); no medical or diagnostic word; never a joke at her: what is wrong in
//    each picture is the machine's (its impossible dates, its ghost node, its bar too long for the phone, its upside-down
//    heart, its leaning chimney), and what undoes it is her own life.
interface SignRow { sign: string; evidence: string; tell?: string; picture?: string; page?: string; count?: string }
interface SignCard { frame: number; ticks: number[]; stampAt?: number }
const SIGNS = C.signs as { title: string; rows: SignRow[]; stamp: string; cards: SignCard[] };
/** the tick's ink, and the tell's: the machine's gold, so the proof it marks reads as part of the tick */
const TELL = GOLD;
const SIGN_CARDS: readonly SignCard[] = SIGNS.cards;
const SIGN_FRAMES = new Set(SIGN_CARDS.map((c) => c.frame));

interface Box { x: number; y: number; w: number; h: number }
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
/** a cheap, stable hash of three integers into 0 … 1 (the AI's noise, the same on every redraw of an eighth) */
function hash3(a: number, b: number, c: number): number {
  let n = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
function ruleBox(ctx: CanvasRenderingContext2D, b: Box, col: string): void {
  px(ctx, b.x, b.y, b.w, 1, col); px(ctx, b.x, b.y + b.h - 1, b.w, 1, col);
  px(ctx, b.x, b.y, 1, b.h, col); px(ctx, b.x + b.w - 1, b.y, 1, b.h, col);
}
/** the genre's furniture: a glossy slab on a hot drop shadow, gold-ruled */
function slab(ctx: CanvasRenderingContext2D, b: Box): void {
  ctx.globalAlpha = 0.85; px(ctx, b.x + 2, b.y + 2, b.w, b.h, HOT); ctx.globalAlpha = 1;
  px(ctx, b.x, b.y, b.w, b.h, CLIP.band);
  ctx.globalAlpha = 0.07; px(ctx, b.x + 1, b.y + 1, b.w - 2, Math.max(2, Math.round(b.h * 0.14)), PLACE.mug); ctx.globalAlpha = 1;
  ruleBox(ctx, b, GOLD);
}
/** a bitmap of cells, one colour per letter ('.' is empty) */
function cells(ctx: CanvasRenderingContext2D, rows: readonly string[], x: number, y: number, c: number, ink: Record<string, string>): void {
  for (let r = 0; r < rows.length; r++) for (let k = 0; k < rows[r].length; k++) { const col = ink[rows[r][k]]; if (col) px(ctx, x + k * c, y + r * c, c, c, col); }
}
const HEART = ['.hh.hh.', 'hhhhhhh', 'hhhhhhh', '.hhhhh.', '..hhh..', '...h...'];
const CAKE = ['...f...', '...c...', '.ttttt.', '.ttttt.', 'bbbbbbb', 'bbbbbbb'];
const CAKE_INK = { f: GOLD, c: PLACE.mug, t: PLACE.rugHi, b: PLACE.textileHi };

// ── the evidence, set into the picture: wrapped to fit, the tell never broken across lines ──
interface EvFit { size: number; lines: string[]; lineH: number; w: number }
const NBSP = ' ';
function wrapWords(ctx: CanvasRenderingContext2D, text: string, tell: string | undefined, maxW: number): string[] {
  // "Who, when: 'what'" — the attribution on its own line, as a message's header (never inside the tell)
  const colon = text.indexOf(': ');
  if (colon > 0 && !(tell && text.indexOf(tell) < colon + 2 && text.indexOf(tell) + tell.length > colon)) {
    return [...wrapWords(ctx, text.slice(0, colon + 1), tell, maxW), ...wrapWords(ctx, text.slice(colon + 2), tell, maxW)];
  }
  const guarded = tell && text.includes(tell) ? text.replace(tell, tell.split(' ').join(NBSP)) : text;
  const out: string[] = [];
  let cur = '';
  for (const word of guarded.split(' ')) {
    const next = cur ? `${cur} ${word}` : word;
    if (!cur || ctx.measureText(next).width <= maxW) cur = next; else { out.push(cur); cur = word; }
  }
  if (cur) out.push(cur);
  return out.map((l) => l.split(NBSP).join(' '));
}
function fitEvidence(ctx: CanvasRenderingContext2D, text: string, tell: string | undefined, maxW: number, maxH: number, maxSize: number): EvFit {
  const make = (size: number): EvFit => {
    ctx.font = monoFor(size);
    const lines = wrapWords(ctx, text, tell, maxW);
    const lineH = size + Math.max(2, Math.round(size * 0.35));
    return { size, lines, lineH, w: Math.max(...lines.map((l) => Math.ceil(ctx.measureText(l).width))) };
  };
  for (let size = Math.max(5, maxSize); size > 5; size--) {
    const e = make(size);
    if (e.w <= maxW && e.lines.length * e.lineH <= maxH) return e;
  }
  return make(5);
}
/** her data as the machine files it: typed in during the second before the tick; on the tick the tell turns the tick's
 *  gold, underlined as a reader marks a line (S366's grammar, unchanged). `cx` centres each line on it. */
function drawEvidence(ctx: CanvasRenderingContext2D, ev: EvFit, x: number, y: number, tell: string | undefined, typed: number,
  marked: boolean, q: number, ink: string = ERA4.text, cx?: number): void {
  ctx.font = monoFor(ev.size);
  let offset = 0;
  let cursor: { x: number; y: number } | null = null;
  const total = ev.lines.reduce((a, l) => a + l.length + 1, -1);
  ev.lines.forEach((line, i) => {
    const ly = y + i * ev.lineH;
    const lw = Math.ceil(ctx.measureText(line).width);
    const lx = cx === undefined ? x : Math.round(cx - lw / 2);
    const shown = Math.max(0, Math.min(line.length, typed - offset));
    const at = tell ? line.indexOf(tell) : -1;
    if (marked && tell && at >= 0) {
      const pre = line.slice(0, at), post = line.slice(at + tell.length);
      const kx = lx + Math.ceil(ctx.measureText(pre).width), kw = Math.ceil(ctx.measureText(tell).width);
      ctx.fillStyle = ink; ctx.fillText(pre, lx, ly); ctx.fillText(post, kx + kw, ly);
      ctx.fillStyle = TELL; ctx.fillText(tell, kx, ly);
      px(ctx, kx, ly + ev.size + 1, kw, 1, GOLD2);
    } else if (shown > 0) {
      ctx.fillStyle = ink; ctx.fillText(line.slice(0, shown), lx, ly);
    }
    if (!marked && typed < total && typed >= offset && typed <= offset + line.length) cursor = { x: lx + Math.ceil(ctx.measureText(line.slice(0, shown)).width) + 1, y: ly };
    offset += line.length + 1;
  });
  const c = cursor as { x: number; y: number } | null;
  if (c && typed > 0 && (q % 2) === 0) px(ctx, c.x, c.y + 1, Math.max(2, Math.round(ev.size / 2)), ev.size, GOLD);
}

/** the box and the tick: a hot shadow under a gold mark, a size bigger on the eighth it lands (the slam) — S364's */
function tickBox(ctx: CanvasRenderingContext2D, bx: number, by: number, box: number, cell: number, ticked: boolean, slam: boolean): void {
  ruleBox(ctx, { x: bx, y: by, w: box, h: box }, ticked ? GOLD : ERA4.ruleHi);
  if (!ticked) return;
  const c = slam ? cell + 1 : cell;
  const cx = bx + 1 + Math.floor((box - 2 - 8 * c) / 2), cy = by - 2 * c + Math.floor(box / 2);
  check(ctx, cx + Math.max(1, Math.floor(c / 2)), cy + Math.max(1, Math.floor(c / 2)), c, HOT);
  check(ctx, cx, cy, c, GOLD);
}

/** where a sign's picture is in its own time */
interface Pic {
  row: SignRow; sec: number; q: number; u: number;
  p: number;          // 0 … 1: the picture's claim, from its appearing to just before the tick
  typed: number;      // characters of the evidence typed so far (all of it once ticked)
  ticked: boolean; since: number;
}

// before a picture appears: the AI "generating" it — a dim field, a slow shimmer, three dots taking turns
function generating(ctx: CanvasRenderingContext2D, b: Box, q: number): void {
  px(ctx, b.x, b.y, b.w, b.h, ERA4.fieldLo);
  const band = Math.max(8, Math.round(b.w * 0.18)), sx = b.x - band + ((q * 5) % (b.w + band));
  ctx.globalAlpha = 0.35;
  for (let r = 0; r < b.h; r += 2) px(ctx, sx + Math.round(r / 2), b.y + r, band, 2, ERA4.panelEdge);
  ctx.globalAlpha = 1;
  const d = Math.max(2, Math.round(b.h / 22)), cx = b.x + Math.floor(b.w / 2), cy = b.y + Math.floor(b.h / 2);
  for (let i = 0; i < 3; i++) px(ctx, cx + (i - 1) * 3 * d - Math.floor(d / 2), cy - Math.floor(d / 2), d, d, (Math.floor(q / 2) % 3) === i ? GOLD : ERA4.meta);
}
// as it appears: the picture diffusing out of noise (k: 0 all noise … 1 clear)
function diffuse(ctx: CanvasRenderingContext2D, b: Box, k: number, q: number, cell: number): void {
  const cols = [ERA4.panelEdge, ERA4.ruleHi, CLIP.field, ERA4.meta, ERA4.panelEdge, ERA4.ruleHi, GOLD2];
  for (let yy = 0; yy < b.h; yy += cell) for (let xx = 0; xx < b.w; xx += cell) {
    const n = hash3(xx / cell, yy / cell, q);
    if (n < 1 - k) px(ctx, b.x + xx, b.y + yy, cell, cell, cols[Math.floor(n * 997) % cols.length]);
  }
}

/** a message bubble on the dark: the machine's screenshot of a line of her life */
function bubble(ctx: CanvasRenderingContext2D, b: Box, marked: boolean, avatar: string | null, u: number): void {
  px(ctx, b.x, b.y, b.w, b.h, ERA4.panelHi);
  ruleBox(ctx, b, marked ? GOLD : ERA4.ruleHi);
  px(ctx, b.x + 2 * u, b.y + b.h, u, u, marked ? GOLD : ERA4.ruleHi);                   // its tail
  if (avatar) { const a = Math.max(3, 3 * u); px(ctx, b.x + u, b.y + u, a, a, avatar); px(ctx, b.x + u, b.y + u, 1, 1, ERA4.panelHi); px(ctx, b.x + u + a - 1, b.y + u, 1, 1, ERA4.panelHi); }
}

// ── (1) SUDDENLY: a calendar flipping fast to 18 TODAY; then Mum's message, Jun 2023, pops up on it ──
const FLIP = ['03', '21', '32', '14', '00', '25', '31', '08', '45', '12', '28', '05'];   // its dates, some impossible
function picCalendar(ctx: CanvasRenderingContext2D, b: Box, P: Pic): void {
  const { u, q } = P;
  const landed = P.p >= 0.8;
  const ch = Math.round(b.h * 0.66) - 2 * u, cw = Math.min(Math.round(ch * 0.95), Math.round(b.w * 0.5));
  const cx0 = b.x + Math.round(b.w * 0.1), cy0 = b.y + 2 * u;
  const ccx = cx0 + Math.floor(cw / 2), ccy = cy0 + Math.floor(ch / 2);
  if (landed) {                                                  // the gloss: a gold burst behind it once it lands
    rays(ctx, ccx, ccy, Math.max(b.w, b.h), 14, (P.sec * 0.8), Math.max(1, Math.floor(u / 2)), GOLD2);
    ctx.globalAlpha = 0.18; px(ctx, cx0 - 2 * u, cy0 - u, cw + 4 * u, ch + 3 * u, GOLD); ctx.globalAlpha = 1;
  }
  // the pages under it, and the page
  px(ctx, cx0 + u, cy0 + ch, cw - u, u, PLACE.sill);
  px(ctx, cx0, cy0, cw, ch, PLACE.mug);
  const hb = Math.max(3 * u, Math.round(ch * 0.24));
  px(ctx, cx0, cy0, cw, hb, HOT);
  for (const f of [0.18, 0.34, 0.8]) { const rx = cx0 + Math.round(cw * f); px(ctx, rx, cy0 - u, u, 2 * u, ERA4.ruleHi); px(ctx, rx, cy0 - u, u, u, CLIP.ink); }   // its rings, unevenly spaced
  if (landed) {
    const word = P.row.page ?? '';
    const sz = fitFont(ctx, word, Math.max(6, hb - 2), cw - 2 * u);
    ctx.fillStyle = PLACE.mug;
    ctx.fillText(word, ccx - Math.floor(ctx.measureText(word).width / 2), cy0 + Math.max(1, Math.floor((hb - sz) / 2)));
  } else {
    for (let i = 0; i < 3; i++) px(ctx, cx0 + 2 * u + i * Math.round(cw * 0.3), cy0 + Math.floor(hb / 2) - Math.floor(u / 2), Math.round(cw * (0.12 + 0.12 * hash3(i, q, 7))), u, PLACE.mug);
  }
  // the date: flipping by the eighth, a page-lift band and pages flying off; then 18
  const gc = Math.max(1, Math.floor(Math.min((cw - 4 * u) / 7, (ch - hb - 3 * u) / 5)));
  const num = landed ? '18' : FLIP[q % FLIP.length];
  const gx = ccx - Math.floor((7 * gc) / 2), gy = cy0 + hb + Math.floor((ch - hb - 5 * gc) / 2);
  if (!landed) {
    px(ctx, cx0, cy0 + hb, cw, Math.round((ch - hb) * ((q % 3) / 3)), PLACE.rug);
    for (let i = 0; i < 3; i++) {
      const fly = ((q + i * 3) % 6) / 6;
      ctx.globalAlpha = 1 - fly;
      px(ctx, cx0 + Math.round(cw * (0.5 + 0.6 * fly)), cy0 + hb - Math.round(ch * 0.8 * fly), Math.round(cw * 0.35), 2 * u, PLACE.mug);
    }
    ctx.globalAlpha = 1;
  }
  glyphs(ctx, num, gx + Math.max(1, Math.floor(gc / 4)), gy + Math.max(1, Math.floor(gc / 4)), gc, PLACE.textileHi);
  glyphs(ctx, num, gx, gy, gc, HOT);
  if (landed) {
    sparkle(ctx, cx0 + cw, cy0 + 2 * u, Math.max(1, Math.floor(u / 2)), (q % 2) === 0);
    sparkle(ctx, cx0 - u, cy0 + ch - 2 * u, Math.max(1, Math.floor(u / 2)), (q % 2) === 1);
  }
  // Mum's message, popping up on the calendar's foot as it is typed (the machine's own screenshot of her)
  if (P.typed <= 0) return;
  const bw = Math.round(b.w * 0.8), av = 3 * u, pad = Math.max(2, u);
  const bx = b.x + b.w - u - bw;
  const ev = fitEvidence(ctx, P.row.evidence, P.row.tell, bw - av - 3 * pad, Math.round(b.h * 0.36), Math.max(6, Math.round(b.h * 0.1)));
  const bh = ev.lines.length * ev.lineH + 2 * pad;
  const by = b.y + b.h - bh - 2 * u;
  bubble(ctx, { x: bx, y: by, w: bw, h: bh }, P.ticked, PLACE.textileHi, u);
  drawEvidence(ctx, ev, bx + av + 2 * pad, by + pad, P.row.tell, P.typed, P.ticked, q);
}

// ── (2) FRIENDS TOO: her friends lighting up one after another on a spreading map, every arrow pointing at her ──
function picSpread(ctx: CanvasRenderingContext2D, b: Box, P: Pic): void {
  const { u, q, p } = P;
  const ev = fitEvidence(ctx, P.row.evidence, P.row.tell, b.w - 2 * u, Math.round(b.h * 0.3), Math.max(6, Math.round(b.h * 0.1)));
  const evH = ev.lines.length * ev.lineH;
  const a: Box = { x: b.x, y: b.y, w: b.w, h: b.h - evH - 2 * u };
  // the map: a faint graticule
  for (let gx = a.x + 3 * u; gx < a.x + a.w; gx += 6 * u) px(ctx, gx, a.y, 1, a.h, ERA4.panelEdge);
  for (let gy = a.y + 2 * u; gy < a.y + a.h; gy += 6 * u) px(ctx, a.x, gy, a.w, 1, ERA4.panelEdge);
  const fs = Math.max(1, Math.floor(Math.min(a.h / 21, a.w / 36)));
  const nameSize = Math.max(6, Math.min(10, 2 * fs + 3));
  const named = fs >= 2;
  const block = 6 * fs + (named ? nameSize + 2 : 0);
  const mx = a.x + Math.floor(a.w / 2), my = a.y + Math.floor(a.h / 2);
  const topY = a.y + u, lowY = a.y + a.h - block;
  const spots = [[a.x + 2 * u, topY], [a.x + a.w - 2 * u - 4 * fs, topY], [mx - Math.round(a.w * 0.24) - 2 * fs, lowY], [mx + Math.round(a.w * 0.24) - 2 * fs, lowY]];
  const lit = (i: number): boolean => p >= 0.12 + i * 0.17;
  const caught = p >= 0.85;
  const hx = mx - 2 * fs, hy = my - 3 * fs - Math.round(fs / 2);
  // a spoke to nowhere: the machine's ghost node, top centre (a little wrong)
  const ghost = [mx + 6 * fs, a.y + u + 2 * fs];
  for (let d = 0.2; d < 1; d += 0.14) px(ctx, Math.round(mx + (ghost[0] - mx) * d), Math.round(my + (ghost[1] - my) * d), fs, fs, ERA4.ruleHi);
  ruleBox(ctx, { x: ghost[0] - 2 * fs, y: ghost[1] - 2 * fs, w: 4 * fs, h: 4 * fs }, ERA4.ruleHi);
  ctx.font = fontFor(nameSize, 'e4');
  for (let i = 0; i < 4; i++) {
    const [fx, fy] = spots[i];
    const cx = fx + 2 * fs, cy = fy + 3 * fs;
    // the spoke: dots flowing from her friend into her once lit (the arrow of the "spread")
    const steps = Math.max(4, Math.floor(Math.hypot(cx - mx, cy - my) / (2 * fs)));
    for (let k = 1; k < steps - 1; k++) {
      const d = k / steps, flow = lit(i) && ((k + q) % 3) !== 0;
      px(ctx, Math.round(cx + (mx - cx) * d), Math.round(cy + (my - cy) * d), fs, fs, flow ? HOT : ERA4.ruleHi);
    }
    if (lit(i)) {                                              // the heat round her friend, pulsing
      const r = (((q + i * 2) % 4) + 3) * fs;
      ctx.globalAlpha = 0.3; ruleBox(ctx, { x: cx - r, y: cy - r, w: 2 * r, h: 2 * r }, HOT); ctx.globalAlpha = 1;
      hotFigure(ctx, fx, fy, fs, 1);
    } else figure(ctx, fx, fy, fs, GREY);
    if (named) {
      const nm = LOT[i], nw = Math.ceil(ctx.measureText(nm).width);
      ctx.fillStyle = lit(i) ? PLACE.mug : ERA4.meta;
      ctx.fillText(nm, Math.max(a.x + 1, Math.min(a.x + a.w - nw - 1, cx - Math.floor(nw / 2))), fy + 6 * fs + 2);
    }
  }
  // her, in the middle, ringed: the map's target
  if (caught) hotFigure(ctx, hx, hy, fs, 1); else figure(ctx, hx, hy, fs, GREY);
  ruleBox(ctx, { x: hx - 2 * fs, y: hy - 2 * fs, w: 8 * fs, h: 10 * fs }, GOLD);
  if (P.typed > 0) drawEvidence(ctx, ev, b.x, b.y + b.h - evH - u, P.row.tell, P.typed, P.ticked, q, ERA4.text, b.x + Math.floor(b.w / 2));
}

// ── (3) ALWAYS ONLINE: screen-time bars climbing to 6 h 12 m — the biggest runs off the phone, and its label is the
//    clinic's waiting list ──
function picScreen(ctx: CanvasRenderingContext2D, b: Box, P: Pic): void {
  const { u, q, p } = P;
  const f: Box = { x: b.x + u, y: b.y, w: b.w - 5 * u, h: b.h - u };            // the phone, on its side
  px(ctx, f.x, f.y, f.w, f.h, CLIP.line);
  const ib: Box = { x: f.x + u, y: f.y + u, w: f.w - 2 * u, h: f.h - 2 * u };
  px(ctx, ib.x, ib.y, ib.w, ib.h, ERA4.fieldLo);
  px(ctx, f.x + Math.max(1, Math.floor(u / 3)), f.y + Math.floor(f.h / 2) - 2 * u, Math.max(1, Math.floor(u / 2)), 4 * u, ERA4.ruleHi);   // its camera
  // the count, climbing (glossy gold, a hot shadow)
  const count = P.row.count ?? '';
  const nums = count.match(/\d+/g)?.map(Number) ?? [0, 0];
  const mins = Math.round((nums[0] * 60 + (nums[1] ?? 0)) * clamp01(p * 1.15));
  const label = p * 1.15 >= 1 ? count : `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, '0')} m`;
  const cs = fitFont(ctx, count, Math.max(7, Math.round(f.h * 0.17)), ib.w - 4 * u);
  const cx = ib.x + 2 * u, cy = ib.y + u;
  ctx.fillStyle = HOT; ctx.fillText(label, cx + 1, cy + 1);
  ctx.fillStyle = GOLD; ctx.fillText(label, cx, cy);
  // the top app's bar: it runs off the phone's edge (a little wrong, and over the top)
  const barH = Math.max(u, Math.round(f.h * 0.07)), icon = barH;
  const bx = cx + icon + u, by = cy + cs + 2 * u;
  const big = Math.round((b.x + b.w - bx) * clamp01(p * 1.2));
  px(ctx, cx, by, icon, icon, CLIP.glow);
  ctx.globalAlpha = 0.3; px(ctx, bx - 1, by - 1, big + 2, barH + 2, HOT); ctx.globalAlpha = 1;
  px(ctx, bx, by, big, barH, HOT);
  // its label, under it: a grey shimmer until the machine fills it in
  const shown = count && P.row.evidence.startsWith(count) ? P.row.evidence.slice(count.length).replace(/^[,\s]+/, '') : P.row.evidence;
  const skipped = P.row.evidence.length - shown.length;
  const ex = bx, ew = ib.x + ib.w - u - ex, ey = by + barH + u;
  const ev = fitEvidence(ctx, shown, P.row.tell, ew, Math.round(f.h * 0.36), Math.max(6, Math.round(b.h * 0.1)));
  if (P.typed <= skipped) {
    for (let i = 0; i < ev.lines.length; i++) px(ctx, ex, ey + i * ev.lineH + 1, Math.round(ew * (0.4 + 0.3 * i)), ev.size - 1, (q + i) % 4 === 0 ? ERA4.ruleHi : ERA4.panelEdge);
  } else drawEvidence(ctx, ev, ex, ey, P.row.tell, P.typed - skipped, P.ticked, q);
  // the other apps: short, grey
  const icons = [PLACE.plant, PLACE.textileHi, PLACE.rugHi];
  let sy = ey + ev.lines.length * ev.lineH + u;
  for (let i = 0; i < 3 && sy + barH <= ib.y + ib.h - u; i++, sy += barH + Math.max(u, Math.round(barH * 0.6))) {
    px(ctx, cx, sy, icon, icon, icons[i]);
    px(ctx, bx, sy, Math.round(ew * [0.3, 0.18, 0.1][i] * clamp01(p * 1.2 - 0.1 * (i + 1))), barH, GREY);
  }
}

// ── (4) SO POPULAR: hearts bursting out of her phone — and on the beat they are birthday messages ──
function picHearts(ctx: CanvasRenderingContext2D, b: Box, P: Pic): void {
  const { u, q, p } = P;
  const ev = fitEvidence(ctx, P.row.evidence, P.row.tell, b.w - 2 * u, Math.round(b.h * 0.3), Math.max(6, Math.round(b.h * 0.1)));
  const evH = ev.lines.length * ev.lineH;
  const a: Box = { x: b.x, y: b.y, w: b.w, h: b.h - evH - 2 * u };
  const phH = a.h - 2 * u, phW = Math.max(4 * u, Math.round(phH * 0.52));
  const fx = a.x + 2 * u, fy = a.y + 2 * u;
  px(ctx, fx, fy, phW, phH, CLIP.line);
  px(ctx, fx + u, fy + u, phW - 2 * u, phH - 2 * u, ERA4.fieldLo);
  for (let i = 0; i < 3; i++) px(ctx, fx + 2 * u, fy + 3 * u + i * 3 * u, phW - 4 * u, 2 * u, ERA4.panelEdge);
  const n = Number(P.row.evidence.match(/\d+/)?.[0] ?? 5);
  // where they land: a loose grid beside the phone (three, then two), nudged off the grid as the machine would
  const gx0 = fx + phW + 3 * u, gw = a.x + a.w - gx0, cellW = Math.floor(gw / 3), cellH = Math.floor(a.h / 2);
  const hc = Math.max(1, Math.floor(Math.min(cellW / 10, cellH / 9)));
  const slots = [[0, 0], [1, 0], [2, 0], [0.5, 1], [1.5, 1], [2.5, 1]];
  const ox = fx + phW - 3 * hc, oy = fy;
  let arrived = 0;
  for (let i = 0; i < Math.min(n, slots.length); i++) {
    const t0 = 0.08 + i * 0.15, k = clamp01((p - t0) / 0.2);
    if (k <= 0 && !P.ticked) continue;
    const kk = P.ticked ? 1 : 1 - (1 - k) * (1 - k);
    const jx = Math.round((hash3(i, 2, 5) - 0.5) * 2 * hc), jy = Math.round((hash3(i, 7, 3) - 0.5) * 2 * hc);
    const tx = gx0 + Math.round(slots[i][0] * cellW) + Math.floor((cellW - 9 * hc) / 2) + jx;
    const ty = a.y + slots[i][1] * cellH + Math.floor((cellH - 8 * hc) / 2) + jy;
    const hx = Math.round(ox + (tx - ox) * kk) + hc, hy = Math.round(oy + (ty - oy) * kk) + hc;
    if (k >= 1 || P.ticked) arrived++;
    if (P.ticked) {
      // on the beat: each heart was a birthday message — a bubble with a cake in it
      if (P.since < 0.125) { px(ctx, hx - hc, hy - hc, 9 * hc, 8 * hc, PLACE.mug); continue; }
      px(ctx, hx - hc, hy - hc, 9 * hc, 8 * hc, ERA4.panelHi);
      ruleBox(ctx, { x: hx - hc, y: hy - hc, w: 9 * hc, h: 8 * hc }, GOLD);
      cells(ctx, CAKE, hx, hy, hc, CAKE_INK);
    } else {
      const rows = i === 3 ? [...HEART].reverse() : HEART;               // one of them upside down (a little wrong)
      cells(ctx, rows, hx, hy, hc, { h: HOT });
      if (k >= 1) sparkle(ctx, hx + 7 * hc, hy, Math.max(1, Math.floor(hc / 2)), ((q + i) % 2) === 0);
    }
  }
  // the badge: the count, on her phone
  const bc = Math.max(1, Math.floor(hc / 2) + 1), bw = 5 * bc;
  px(ctx, fx + phW - Math.floor(bw / 2), fy - 2 * bc, bw, 7 * bc, HOT);
  if (arrived > 0) glyphs(ctx, String(Math.min(arrived, n)), fx + phW - Math.floor(bw / 2) + bc, fy - bc, bc, PLACE.mug);
  if (P.typed > 0) drawEvidence(ctx, ev, b.x, b.y + b.h - evH - u, P.row.tell, P.typed, P.ticked, q, ERA4.text, b.x + Math.floor(b.w / 2));
}

// ── (5) STRUGGLING BEFORE: a rain cloud over her house — and the cloud is Dad's line ──
function picRain(ctx: CanvasRenderingContext2D, b: Box, P: Pic): void {
  const { u, q, p } = P;
  const cw = b.w - 2 * u, cx0 = b.x + u;
  const ev = fitEvidence(ctx, P.row.evidence, P.row.tell, cw - 6 * u, Math.round(b.h * 0.34), Math.max(6, Math.round(b.h * 0.09)));
  const ch = Math.max(Math.round(b.h * 0.28), ev.lines.length * ev.lineH + 3 * u);
  const cy0 = b.y + 6 * u;
  // the house, low in the frame: a roof of steps, its walls in the rain's gloom, one warm window with her in it
  const houseH = b.y + b.h - (cy0 + ch) - 3 * u;
  const hw = Math.min(Math.round(b.w * 0.46), Math.round(houseH * 1.5)), wallH = Math.round(houseH * 0.56), roofH = houseH - wallH;
  const hx = b.x + Math.floor((b.w - hw) / 2), wallY = b.y + b.h - wallH;
  const chW = Math.max(u, Math.round(hw * 0.1)), chX = hx + Math.round(hw * 0.68);
  px(ctx, chX, wallY - roofH - u, chW, roofH, PLACE.floorLo);                 // the chimney…
  px(ctx, chX + Math.max(1, Math.floor(chW / 2)), wallY - roofH - 2 * u, chW, u, PLACE.floorLo);   // …leaning (a little wrong)
  const steps = Math.max(2, Math.floor(roofH / Math.max(1, u)));
  const rowH = roofH / steps;
  for (let r = 0; r < steps; r++) {
    const inset = Math.round((hw / 2) * (r / steps)) - u;
    px(ctx, hx + inset, Math.round(wallY - (r + 1) * rowH), hw - 2 * inset, Math.ceil(rowH), PLACE.floorLo);
  }
  px(ctx, hx, wallY, hw, wallH, PLACE.sill);
  ctx.globalAlpha = 0.3; px(ctx, hx - u, wallY - roofH - 2 * u, hw + 2 * u, wallH + roofH + 2 * u, ERA4.field); ctx.globalAlpha = 1;
  const ww = Math.max(3 * u, Math.round(hw * 0.26)), wh = Math.max(3 * u, Math.round(wallH * 0.56));
  const wx = hx + Math.round(hw * 0.16), wy = wallY + Math.round(wallH * 0.2);
  px(ctx, wx, wy, ww, wh, PLACE.sun);
  const fs = Math.max(1, Math.floor(wh / 7));
  figure(ctx, wx + Math.floor(ww / 2) - 2 * fs, wy + wh - 6 * fs, fs, GREY);
  const dw = Math.max(2 * u, Math.round(hw * 0.17));
  px(ctx, hx + Math.round(hw * 0.62), wallY + Math.round(wallH * 0.3), dw, wallH - Math.round(wallH * 0.3), ERA4.panelEdge);
  // the rain, from the cloud onto the roof and the ground round it (never through the house)
  const rainTop = cy0 + ch, rainH = Math.max(1, wallY - roofH - rainTop);
  ctx.globalAlpha = 0.85;
  for (let i = 0; i < 26; i++) {
    const rx = cx0 + 2 * u + Math.floor(hash3(i, 3, 9) * (cw - 4 * u));
    const over = rx >= hx - u && rx <= hx + hw + u;
    const span = Math.max(1, (over ? wallY - roofH - 2 * u : b.y + b.h) - rainTop);
    const ry = rainTop + ((q * 2 * u + Math.floor(hash3(i, 5, 1) * span)) % span);
    px(ctx, rx, ry, Math.max(1, Math.floor(u / 2)), Math.min(2 * u, rainTop + span - ry), i % 3 ? CLIP.glow : PLACE.skyLo);
  }
  ctx.globalAlpha = 1;
  // the cloud: a dark slab with lumps on top; a flash of lightning halfway through the claim
  const lump = (lx: number, lw: number, lh: number): void => { roundRect(ctx, lx, cy0 - lh + 2 * u, lw, lh, Math.floor(lh / 2), ERA4.ruleHi); };
  lump(cx0 + Math.round(cw * 0.08), Math.round(cw * 0.3), 4 * u);
  lump(cx0 + Math.round(cw * 0.32), Math.round(cw * 0.36), 6 * u);
  lump(cx0 + Math.round(cw * 0.62), Math.round(cw * 0.28), 4 * u);
  roundRect(ctx, cx0, cy0, cw, ch, 2 * u, ERA4.ruleHi);
  px(ctx, cx0 + 2 * u, cy0 + ch - u, cw - 4 * u, u, ERA4.rule);
  if (p >= 0.45 && p < 0.5) {
    ctx.globalAlpha = 0.5; px(ctx, cx0, cy0, cw, ch, PLACE.mug); ctx.globalAlpha = 1;
    const lx = hx + Math.round(hw * 0.3);
    for (let k = 0; k < 4; k++) px(ctx, lx + (k % 2 ? u : -u), rainTop + Math.round((rainH * k) / 4), u, Math.ceil(rainH / 4), GOLD);
  }
  if (P.typed > 0) drawEvidence(ctx, ev, cx0, cy0 + Math.floor((ch - ev.lines.length * ev.lineH) / 2) + 1, P.row.tell, P.typed, P.ticked, q, ERA4.textHi, cx0 + Math.floor(cw / 2));
}

const PICTURES: Record<string, (ctx: CanvasRenderingContext2D, b: Box, P: Pic) => void> = {
  calendar: picCalendar, spread: picSpread, screentime: picScreen, hearts: picHearts, rain: picRain
};

function sceneSigns(ctx: CanvasRenderingContext2D, g: G): void {
  const { x, y, w, h, sceneH, midX, f, sec, q } = g;
  const ci = SIGN_CARDS.findIndex((c) => c.frame === f);
  if (ci < 0) return;
  const card = SIGN_CARDS[ci];
  const rows = SIGNS.rows;
  const before = SIGN_CARDS.slice(0, ci).reduce((a, c) => a + c.ticks.length, 0);

  // the header: the title and the running score, kept clear of the "Made with AI" stamp
  const tag = tagSizeFor(h);
  ctx.font = fontFor(tag, 'e4');
  const tagRight = x + 3 + Math.ceil(ctx.measureText(C.aiTag).width) + 8;
  const titleSize = Math.max(tag + 2, Math.min(20, Math.round(sceneH * 0.075)));
  const top = y + 2, bottom = y + sceneH - 3;
  const headB = Math.max(y + 3 + tag + 6, top + titleSize + 5);
  const m = Math.max(3, Math.round(w * 0.02));
  ctx.font = fontFor(titleSize, 'e4');
  const titleW = Math.ceil(ctx.measureText(SIGNS.title).width);
  const tx = Math.max(midX - Math.floor(titleW / 2), tagRight + 4), ty = top + Math.max(1, Math.floor((headB - 2 - top - titleSize) / 2));
  ctx.fillStyle = HOT; ctx.fillText(SIGNS.title, tx + 1, ty + 1);
  ctx.fillStyle = GOLD; ctx.fillText(SIGNS.title, tx, ty);
  const stamped = card.stampAt !== undefined && sec >= card.stampAt;
  const done = before + card.ticks.filter((t) => sec >= t).length;
  const landed = card.ticks.some((t) => sec >= t && sec - t < 0.25);
  const tCell = Math.max(1, Math.floor((headB - 2 - top - 4) / 5));
  const tX = x + w - m - 15 * tCell;
  if (tX > tx + titleW + 2) glyphs(ctx, `${done} / ${rows.length}`, tX, top + Math.max(2, Math.floor((headB - 2 - top - 5 * tCell) / 2)), tCell, landed || stamped ? GOLD : ERA4.meta);

  // the two panels, side by side
  const gap = m, pw = Math.floor((w - 2 * m - gap - 2) / 2), py = headB + 1, ph = bottom - py;
  const panels: Box[] = [{ x: x + m, y: py, w: pw, h: ph }, { x: x + m + pw + gap, y: py, w: pw, h: ph }];
  // one size for the sign on both panels of a card (and the box and tick that go with it)
  const pad = Math.max(2, Math.round(pw * 0.03));
  const boxFor = (sz: number): number => 8 * Math.max(1, Math.floor(sz / 6)) + 2;
  let size = Math.max(7, Math.min(20, Math.round(sceneH * 0.075)));
  const names = card.ticks.map((_, i) => rows[before + i].sign);
  ctx.font = fontFor(size, 'e4');
  while (size > 6 && Math.max(...names.map((n) => ctx.measureText(n).width)) > pw - 3 * pad - boxFor(size)) { size--; ctx.font = fontFor(size, 'e4'); }
  const box = boxFor(size), cell = Math.max(1, Math.floor(size / 6));
  const headH = Math.max(box, size + 2) + 2 * pad;

  card.ticks.forEach((tickAt, i) => {
    const row = rows[before + i];
    const b = panels[i];
    slab(ctx, b);
    const appear = i === 0 ? 0 : Math.max(0, tickAt - 1.25);
    const ticked = sec >= tickAt, since = sec - tickAt;
    // the sign and its box
    const by = b.y + pad + Math.floor((headH - 2 * pad - box) / 2);
    tickBox(ctx, b.x + pad, by, box, cell, ticked, ticked && since < 0.125);
    if (sec >= appear) {
      ctx.font = fontFor(size, 'e4');
      ctx.fillStyle = ticked ? CLIP.ink : ERA4.meta;
      ctx.fillText(row.sign, b.x + 2 * pad + box, b.y + pad + Math.floor((headH - 2 * pad - size) / 2));
    }
    px(ctx, b.x + 1, b.y + headH, b.w - 2, 1, GOLD2);
    // the picture
    const pb: Box = { x: b.x + pad, y: b.y + headH + pad, w: b.w - 2 * pad, h: b.h - headH - 2 * pad };
    const u = Math.max(1, Math.floor(Math.min(pb.h / 24, pb.w / 40)));
    ctx.save();
    ctx.beginPath(); ctx.rect(pb.x, pb.y, pb.w, pb.h); ctx.clip();
    if (sec < appear) generating(ctx, pb, q);
    else {
      px(ctx, pb.x, pb.y, pb.w, pb.h, CLIP.field);
      const typed = ticked ? row.evidence.length : Math.floor(row.evidence.length * clamp01((sec - (tickAt - 1)) / 0.75));
      const P: Pic = { row, sec, q, u, p: clamp01((sec - appear) / Math.max(0.25, tickAt - 0.25 - appear)), typed, ticked, since };
      (PICTURES[row.picture ?? ''] ?? picCalendar)(ctx, pb, P);
      if (sec - appear < 0.5) diffuse(ctx, pb, (sec - appear) / 0.5, q, Math.max(2, u));
    }
    ctx.restore();
    // the landing: the panel lights up gold for a quarter-second (S364's row flash)
    if (ticked && since < 0.25) { ctx.globalAlpha = 0.3; px(ctx, b.x + 1, b.y + 1, b.w - 2, b.h - 2, GOLD); ctx.globalAlpha = 1; }
  });

  // card 5: the second panel is the whole checklist — five signs, five boxes — and the 5 / 5 lands on it
  if (card.ticks.length < 2) {
    const b = panels[1];
    slab(ctx, b);
    const listTop = b.y + pad, stampH = Math.round(b.h * 0.36), listH = b.h - 2 * pad - stampH;
    let rs = Math.max(6, Math.min(size, Math.floor(listH / rows.length) - 2));
    ctx.font = fontFor(rs, 'e4');
    while (rs > 6 && (Math.max(...rows.map((r) => ctx.measureText(r.sign).width)) > b.w - 3 * pad - boxFor(rs) || rows.length * (Math.max(boxFor(rs), rs + 2) + 1) > listH)) { rs--; ctx.font = fontFor(rs, 'e4'); }
    const rb = boxFor(rs), rc = Math.max(1, Math.floor(rs / 6)), rowH = Math.floor(listH / rows.length);
    const lastAt = card.ticks[0];
    rows.forEach((r, i) => {
      const ry = listTop + i * rowH;
      const ticked = i < before || sec >= lastAt;
      tickBox(ctx, b.x + pad, ry + Math.floor((rowH - rb) / 2), rb, rc, ticked, i >= before && ticked && sec - lastAt < 0.125);
      ctx.font = fontFor(rs, 'e4');
      ctx.fillStyle = ticked ? CLIP.ink : ERA4.meta;
      ctx.fillText(r.sign, b.x + 2 * pad + rb, ry + Math.floor((rowH - rs) / 2));
    });
    if (sec >= lastAt && sec - lastAt < 0.25) { ctx.globalAlpha = 0.3; px(ctx, b.x + 1, listTop + before * rowH - 1, b.w - 2, rowH + 2, GOLD); ctx.globalAlpha = 1; }
    // the stamp: 5 / 5, below the list, the moment the narrator says the last "five" (S364: "ticked")
    if (stamped) {
      const slam = sec - (card.stampAt ?? 0) < 0.125;
      const c0 = Math.max(1, Math.min(Math.floor((stampH - 2 * pad) / 9), Math.floor((b.w * 0.8) / 19)));
      const c1 = c0 + (slam ? 1 : 0);
      const sw = 19 * c1, sh = 9 * c1;
      const sx = b.x + Math.floor((b.w - sw) / 2), sy = b.y + b.h - pad - Math.floor((stampH - 2 * pad + 9 * c0) / 2) - (slam ? Math.floor(c1 / 2) : 0);
      ctx.globalAlpha = 0.88; px(ctx, sx, sy, sw, sh, CLIP.band); ctx.globalAlpha = 1;
      const t = Math.max(1, Math.floor(c1 / 2));
      px(ctx, sx, sy, sw, t, HOT); px(ctx, sx, sy + sh - t, sw, t, HOT); px(ctx, sx, sy, t, sh, HOT); px(ctx, sx + sw - t, sy, t, sh, HOT);
      px(ctx, sx + c1, sy + c1, sw - 2 * c1, 1, HOT); px(ctx, sx + c1, sy + sh - c1 - 1, sw - 2 * c1, 1, HOT);
      glyphs(ctx, SIGNS.stamp, sx + 2 * c1 + Math.max(1, Math.floor(c1 / 2)), sy + 2 * c1 + Math.max(1, Math.floor(c1 / 2)), c1, GOLD2);
      glyphs(ctx, SIGNS.stamp, sx + 2 * c1, sy + 2 * c1, c1, HOT);
      const sp = Math.max(1, Math.floor(g.s / 2));
      sparkle(ctx, sx - 2 * sp, sy + 2 * sp, sp, (q % 2) === 0);
      sparkle(ctx, sx + sw + sp, sy + sh - 2 * sp, sp, (q % 2) === 1);
      if (slam) { ctx.globalAlpha = 0.3; px(ctx, x, y, w, sceneH, PLACE.mug); ctx.globalAlpha = 1; }
    }
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

// ── 7 · EVEN THE LGB GROUP SAYS YOU'RE NOT ONE OF THEM. — ⚑ S370 (UiB job 16 Part C4; his 11 Nov: "the part of the
//    Meridian, if it is clear the point of the conversion therapy targeting more of T now, even from LGB"). It was a door
//    and a plate ("EVEN MERIDIAN SHUT THE DOOR."): the point — that the refusal was about her being trans — was nowhere
//    on it. Now the AI's own picture says it, sharply, in its spin: L G B T in the genre's gold, the T glitches and falls
//    out of the row (as the narrator says "LGB"), its place left as a barred, dashed gap beside her; then its EVIDENCE,
//    the screenshot it took of her mail (S364's "I read your mail"), slides up — Meridian's eligibility line, from the
//    email itself (s4_browser.json `enquiry`, never copied) — and the machine marks "as recorded at birth" as its proof,
//    in the tick's gold, on the beat ("NOT ONE OF THEM"). The AI uses the refusal against her: that is the satire, and it
//    collapses on its own evidence (a group's rule, not a fact about her). Meridian is invented; no figure is stated. ──
const MER = C.meridian as { letters: string; gone: string; tell: string; dropAt: number; markAt: number };
const MER_FROM: string = B4.enquiry.replyFrom;
const MER_LINE: string = B4.enquiry.reply.find((l: string) => l.includes(MER.tell)) ?? MER.tell;
const SHOT: string = V3.bot.agent.shot;
function sceneMeridian(ctx: CanvasRenderingContext2D, g: G): void {
  const { x, y, w, h, sceneH, midX, sec, q } = g;
  const word = MER.letters + MER.gone;
  const tag = tagSizeFor(h);
  ctx.font = fontFor(tag, 'e4');
  const tagRight = x + 3 + Math.ceil(ctx.measureText(C.aiTag).width) + 8;
  const m = Math.max(3, Math.round(w * 0.02));
  // the letters: the clip's pixel glyphs, big, gold on a hot shadow
  const gc = Math.max(1, Math.floor(Math.min((sceneH * 0.3) / 5, (w * 0.46) / (4 * word.length - 1))));
  const gw = (4 * word.length - 1) * gc;
  const gx0 = midX - Math.floor(gw / 2) - 2 * gc;
  let gy0 = y + Math.max(3, Math.round(sceneH * 0.05));
  if (gx0 < tagRight + 4) gy0 = Math.max(gy0, y + tag + 9);
  const sh = Math.max(1, Math.floor(gc / 3));
  for (let i = 0; i < MER.letters.length; i++) {
    const lx = gx0 + i * 4 * gc;
    glyphs(ctx, word[i], lx + sh, gy0 + sh, gc, HOT);
    glyphs(ctx, word[i], lx, gy0, gc, GOLD);
  }
  sparkle(ctx, gx0 - 2 * gc, gy0 + gc, Math.max(1, Math.floor(gc / 3)), (q % 2) === 0);
  // the T: there, then glitching, then falling out of the row
  const tx = gx0 + MER.letters.length * 4 * gc;
  const fall = sec - MER.dropAt;
  if (fall < -0.5) {
    glyphs(ctx, MER.gone, tx + sh, gy0 + sh, gc, HOT);
    glyphs(ctx, MER.gone, tx, gy0, gc, GOLD);
  } else if (fall < 0) {
    const j = (q % 3) - 1;
    glyphs(ctx, MER.gone, tx + j * sh, gy0, gc, (q % 2) ? HOT : GOLD);
    px(ctx, tx - gc, gy0 + 2 * gc + j * gc, 5 * gc, Math.max(1, Math.floor(gc / 2)), PLACE.mug);    // a tear across it
  } else if (fall < 0.75) {
    const k = fall / 0.75;
    ctx.globalAlpha = 1 - k;
    glyphs(ctx, MER.gone, tx, gy0 + Math.round(k * k * 14 * gc), gc, GREY);
    ctx.globalAlpha = 1;
  }
  // her, beside the row, grey; and once the T has gone, its place: a dashed gap, barred
  const fs = Math.max(1, Math.floor((5 * gc) / 7));
  figure(ctx, tx + 5 * gc, gy0 + 5 * gc - 6 * fs, fs, GREY);
  if (fall >= 0.25) {
    const gb: Box = { x: tx - Math.max(1, Math.floor(gc / 2)), y: gy0 - Math.max(1, Math.floor(gc / 2)), w: 3 * gc + 2 * Math.max(1, Math.floor(gc / 2)), h: 5 * gc + 2 * Math.max(1, Math.floor(gc / 2)) };
    const dash = Math.max(2, gc);
    for (let d = 0; d < gb.w; d += 2 * dash) { px(ctx, gb.x + d, gb.y, Math.min(dash, gb.w - d), 1, HOT); px(ctx, gb.x + d, gb.y + gb.h - 1, Math.min(dash, gb.w - d), 1, HOT); }
    for (let d = 0; d < gb.h; d += 2 * dash) { px(ctx, gb.x, gb.y + d, 1, Math.min(dash, gb.h - d), HOT); px(ctx, gb.x + gb.w - 1, gb.y + d, 1, Math.min(dash, gb.h - d), HOT); }
    if (fall >= 0.75) px(ctx, gb.x, gy0 + 2 * gc, gb.w, gc, HOT);
  }
  // the evidence: its screenshot of her mail, sliding up
  const cardAt = MER.dropAt + 0.5;
  if (sec < cardAt) return;
  const cy0 = gy0 + 5 * gc + Math.max(gc, 6), cb: Box = { x: x + m, y: cy0, w: w - 2 * m - 2, h: y + sceneH - 3 - cy0 };
  const slide = Math.round(cb.h * (1 - clamp01((sec - cardAt) / 0.5)) ** 2);
  const b: Box = { ...cb, y: cb.y + slide };
  slab(ctx, b);
  const pad = Math.max(3, Math.round(b.h * 0.08));
  const hs = Math.max(6, Math.min(12, Math.round(b.h * 0.13)));
  ctx.font = monoFor(hs);
  ctx.fillStyle = ERA4.meta; ctx.fillText(MER_FROM, b.x + pad, b.y + pad);
  const shotW = Math.ceil(ctx.measureText(SHOT).width) + 6;
  if (b.x + pad + ctx.measureText(MER_FROM).width + shotW + 8 < b.x + b.w - pad) {
    px(ctx, b.x + b.w - pad - shotW, b.y + pad - 1, shotW, hs + 2, ERA4.panelEdge);
    ctx.fillStyle = ERA4.text; ctx.fillText(SHOT, b.x + b.w - pad - shotW + 3, b.y + pad);
  }
  px(ctx, b.x + pad, b.y + pad + hs + 3, b.w - 2 * pad, 1, ERA4.ruleHi);
  const ey = b.y + pad + hs + 3 + pad;
  const ev = fitEvidence(ctx, MER_LINE, MER.tell, b.w - 2 * pad, b.y + b.h - pad - ey, Math.max(6, Math.round(b.h * 0.16)));
  const typeAt = cardAt + 0.5, typed = sec >= MER.markAt ? MER_LINE.length : Math.floor(MER_LINE.length * clamp01((sec - typeAt) / 1.25));
  const marked = sec >= MER.markAt;
  if (marked) {
    // the machine's proof, lit: a gold glow behind it, and a dotted line from it up to the gap
    ctx.font = monoFor(ev.size);
    ev.lines.forEach((line, i) => {
      const at = line.indexOf(MER.tell);
      if (at < 0) return;
      const kx = b.x + pad + Math.ceil(ctx.measureText(line.slice(0, at)).width), kw = Math.ceil(ctx.measureText(MER.tell).width), ky = ey + i * ev.lineH;
      ctx.globalAlpha = sec - MER.markAt < 0.25 ? 0.45 : 0.2; px(ctx, kx - 2, ky - 2, kw + 4, ev.size + 5, GOLD); ctx.globalAlpha = 1;
    });
  }
  drawEvidence(ctx, ev, b.x + pad, ey, MER.tell, typed, marked, q, ERA4.textHi);
  // and a pointer from the gap down to its proof (the screenshot's top edge): this is what it says the gap means
  if (marked) for (let yy = gy0 + 5 * gc + Math.max(2, gc); yy < b.y - 1; yy += 3) px(ctx, tx + Math.floor(1.5 * gc), yy, Math.max(1, Math.floor(gc / 3)), 2, GOLD);
  if (marked && sec - MER.markAt < 0.25) { ctx.globalAlpha = 0.25; px(ctx, b.x + 1, b.y + 1, b.w - 2, b.h - 2, GOLD); ctx.globalAlpha = 1; }
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
//    ⚑ S370: the card holds a second longer (the music's new A asks before the slate resolves it). Its picture keeps
//    S360's timing to the eighth — the walk, the red going grey — by the clock of its first five seconds, and then holds,
//    the rays still turning.
function sceneBack(ctx: CanvasRenderingContext2D, g: G): void {
  const { s, midX, y, sceneH, q, w, sec } = g;
  const k = Math.min(1, Math.floor((sec / BACK_PACE) * 16) / 16);
  const cy = y + Math.floor(sceneH * 0.62);
  const rot = Math.floor((sec / BACK_PACE) * 16) / 16 * 0.7;
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

// ── 10 · THE END SLATE — ⚑ S370 (UiB job 16 Part C3; his 11 Nov: "in the end it stops quite abruptly the sound and the
//    message"). An ending in the channel's own grammar: the trailer's dark, red and gold give way, from the centre out,
//    to the assistant's own calm cream page — its mark, its name, its tagline, and its call to action as its one filled
//    button, a shine passing over it and a ring that keeps asking to be pressed. It cannot be pressed: it is a picture in
//    a video. The "Made with AI" stamp stays in its corner. No subtitle band: the button says what the narrator says.
//    Colours: the 2026 assistant's own tokens (era4.ts V3 / WEB), as on the chat page it hands back to. ──
const SLATE = C.slate as { line: string; button: string };
function sceneSlate(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, sec: number): void {
  const open = clamp01(sec / 0.375);
  const ow = Math.round(w * open), oh = Math.round(h * open);
  px(ctx, x + Math.floor((w - ow) / 2), y + Math.floor((h - oh) / 2), ow, oh, INK3.page);
  if (open < 1) return;
  const midX = x + Math.floor(w / 2);
  // the mark and the name, in a row
  const d = Math.max(10, Math.round(Math.min(h * 0.24, w * 0.14)));
  const ns = Math.max(9, Math.round(h * 0.11));
  ctx.font = fontFor(ns, 'e4');
  const name = V3.bot.mark, nw = Math.ceil(ctx.measureText(name).width);
  const rowW = d + Math.round(d * 0.35) + nw, rx = midX - Math.floor(rowW / 2), ry = y + Math.round(h * 0.2);
  const pop = sec < 0.375 ? 0 : Math.min(1, (sec - 0.375) / 0.25);
  if (pop > 0) {
    const dd = Math.round(d * (pop < 1 ? 1.15 : 1));
    assistantMark(ctx, rx - Math.floor((dd - d) / 2), ry - Math.floor((dd - d) / 2), dd, INK3.primary, INK3.primaryInk);
  }
  if (sec >= 0.5) { ctx.fillStyle = INK3.ink; ctx.fillText(name, rx + d + Math.round(d * 0.35), ry + Math.floor((d - ns) / 2)); }
  // the tagline
  if (sec >= 0.625) {
    const ts = Math.max(7, Math.round(h * 0.065));
    ctx.font = fontFor(ts, 'e4');
    const tw = Math.ceil(ctx.measureText(SLATE.line).width);
    ctx.fillStyle = INK3.ink2; ctx.fillText(SLATE.line, midX - Math.floor(tw / 2), ry + d + Math.round(h * 0.06));
  }
  // the call to action: its one filled button, rising into place, a shine passing over it, a ring asking to be pressed
  if (sec >= 0.75) {
    const bh = Math.max(14, Math.round(h * 0.15)), bs = Math.max(8, Math.round(bh * 0.46));
    ctx.font = fontFor(bs, 'e4');
    const lw = Math.ceil(ctx.measureText(SLATE.button).width), bw = lw + 2 * Math.round(bh * 0.8);
    const rise = Math.round(bh * (1 - clamp01((sec - 0.75) / 0.25)));
    const bx = midX - Math.floor(bw / 2), by = y + Math.round(h * 0.66) + rise;
    const ring = ((sec - 1) % 1.5) / 1.5;
    if (sec >= 1) {
      const r = Math.round(ring * bh * 0.5);
      ctx.globalAlpha = 0.22 * (1 - ring); pill(ctx, bx - r, by - r, bw + 2 * r, bh + 2 * r, WEB.accent); ctx.globalAlpha = 1;
    }
    pill(ctx, bx, by, bw, bh, INK3.primary);
    ctx.save();
    ctx.beginPath(); ctx.rect(bx + Math.floor(bh / 2), by, bw - bh, bh); ctx.clip();
    ctx.globalAlpha = 0.18; px(ctx, bx + Math.round(((sec * 0.8) % 1.6 - 0.3) * bw), by, Math.round(bh * 0.4), bh, WEB.shimmer);
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.fillStyle = INK3.primaryInk; ctx.fillText(SLATE.button, midX - Math.floor(lw / 2), by + Math.floor((bh - bs) / 2));
  }
}

/** S360's seven scenes in order (S370: the door is Meridian's picture now); S364's signs cards are slotted in at their
 *  frames (s4_v3.json clip.signs.cards); S370's end slate is the last frame, drawn on its own (below) */
const STORY = [sceneLot, sceneChat, sceneBirthday, sceneLine, sceneMeridian, sceneVoices, sceneBack];
const SCENES: ((ctx: CanvasRenderingContext2D, g: G) => void)[] = [];
for (let i = 0, b = 0; i < C.frames.length; i++) SCENES.push(SIGN_FRAMES.has(i) ? sceneSigns : STORY[Math.min(b++, STORY.length - 1)]);

/** the caption band's words on one line, or — when a caption is long (S370's Meridian line) — on two, so it is not
 *  shrunk to half the size of its neighbours */
function captionLines(cap: string): string[] {
  if (cap.length <= 40) return [cap];
  const words = cap.split(' ');
  let best = 1, diff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ').length, b = words.slice(i).join(' ').length;
    if (Math.abs(a - b) < diff) { diff = Math.abs(a - b); best = i; }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

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
  const tagSize = tagSizeFor(h);
  const stamp = (): void => {
    // the stamp: it says what it is
    ctx.font = fontFor(tagSize, 'e4');
    const tagW = Math.ceil(ctx.measureText(C.aiTag).width) + 8;
    px(ctx, x + 3, y + 3, tagW, tagSize + 5, CLIP.stamp);
    ctx.fillStyle = CLIP.stampInk;
    ctx.fillText(C.aiTag, x + 7, y + 5);
  };

  // ⚑ S370 — the end slate owns the whole frame (no subtitle band), and the stamp stays in its corner
  if (f === SLATE_FRAME) {
    sceneSlate(ctx, x, y, w, h, sec);
    stamp();
    ctx.restore();
    return;
  }

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
  const lines = captionLines(C.frames[f]);
  const ink = f === LAST_CARD ? GOLD : CLIP.ink;
  if (lines.length === 1) {
    const cap = lines[0];
    const size = fitFont(ctx, cap, Math.max(7, Math.round(bandH * 0.62)), w - 10);
    const tw = Math.ceil(ctx.measureText(cap).width);
    const tx = x + Math.max(4, Math.round((w - tw) / 2)), ty = y + sceneH + Math.round((bandH - size) / 2) + 1;
    ctx.fillStyle = HOT; ctx.fillText(cap, tx + 1, ty + 1);
    ctx.fillStyle = ink; ctx.fillText(cap, tx, ty);
  } else {
    let size = Math.max(6, Math.round(bandH * 0.37));
    for (const l of lines) size = Math.min(size, fitFont(ctx, l, size, w - 10));
    ctx.font = fontFor(size, 'e4');
    const lead = size + Math.max(1, Math.round(size * 0.15));
    const ty0 = y + sceneH + Math.round((bandH - lead - size) / 2) + 1;
    lines.forEach((cap, i) => {
      const tw = Math.ceil(ctx.measureText(cap).width);
      const tx = x + Math.max(4, Math.round((w - tw) / 2)), ty = ty0 + i * lead;
      ctx.fillStyle = HOT; ctx.fillText(cap, tx + 1, ty + 1);
      ctx.fillStyle = ink; ctx.fillText(cap, tx, ty);
    });
  }
  stamp();
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// ⚑ S360 / clip (his 11 Nov: "music and a narrator") — THE CLIP'S SOUND.
//
// startClipSound() starts the music bed (clip_music.mp3, on the same grid as the cards: 58 s since S370, an outro that
// fades to silence at its end — the chat's takeover stops it there, so it is heard once) and schedules the
// narrator: card n's file (clip_narr_n.mp3, the SYSTEM's synthetic voice, build-time TTS) starts `narratorDelay` after
// the card's onset (S360–S366: and again on every loop; since S370 the clip plays once). The caller calls it when the clip's t is 0 (the picture and the sound
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
  // ⚑ S370: once, not looped — the music now ends in silence, and a loop would wrap into card 0's boom if the picture's
  //   clock ran a moment behind the audio's when the takeover stops it
  music = playOnce('clip_music.mp3');
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
