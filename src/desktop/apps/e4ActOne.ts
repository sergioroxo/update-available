/**
 * ⚑ S412 (UiB job 33 Part A) — ACT I · L: WHAT AI ALREADY DOES. Beats 1–4 of draft 3
 * (docs/reinterp/STORYBOARD_2026_BEATS_v3_2026-11-21.md §4; his answers in §8; job 33's Part A).
 *
 *   1. THE BIRTHDAY CARD. She wakes the screen; before L says a word you watch it read her week — small cards fly from her
 *      world into its mint circle, and last night's unfinished search goes in last. Then the card it made her, and its first
 *      line, spoken and written. Catch me up · I'll look myself: both lead on (26-2: L is the helper; 26-9: L says how).
 *   2. THE SOFTENED FATHER. L's cursor opens Kettle one thread at a time. While a thread is open L says nothing (a person's
 *      words are felt); it says what the thread "said" once it has closed it, and leans a little each time. Dad's message is
 *      the one it rewrote: the rule is taught in the chat (press ✦); pressed, the card turns over to what he wrote and the
 *      AI's pane is silent until it turns back. L agrees with whatever she does (26-3: no expand, no text-size change).
 *   3. THREE DOORS, AND MUM'S COURSE. Larkpost, one email at a time: the clinic, Meridian with her unsent draft, Mum with the
 *      link to HEDGE™ and its partner in small print (26-4). The link brings LambyVision off its shelf to the side of the
 *      screen and plays the tape; if nothing is pressed nothing moves; setting it down moves nothing else (26-5). Then L:
 *      "Three doors closed this week, Maya. That isn't bad luck." — once in the era — and the offer to finish her search.
 *   4. HER SEARCH. L finishes her sentence (26-7) and answers, pleasing, with the push inside. The top stories as they are,
 *      both readings kept, nothing over the text (26-6); a story opens in full on the right, the back arrow returns. One
 *      sponsored card in its own loud yellow (26-8): ✚ Add to L · Not now — THE SEAM into Act II.
 *
 * The room does not change in this act (job 33 A5): nothing here touches it.
 */
import { setFont, px } from '../theme/chrome';
import { monoFor, newsFor } from '../theme/fonts';
import { PLACE, WEB, V3, KETTLE, CHROME, roundRect, roundEdge, pill, assistantMark } from '../theme/era4';
import { readHold } from '../readHold';
import { markE4 } from '../../narrative/e4Beats';
import { meetWord } from '../../room/lexicon';
import { playOnce } from '../../audio/tapeAudio';
import { registerPage, drawRich, personBubble, starIcon, padlockIcon, AI, ANIM_HZ, type Page, type PageApi, type Rect } from './lScreen';
import { E4Acts, type Beat, fillIn } from './e4Acts';
import ACTS from '../../../data/dialog/s4_acts.json';
import V from '../../../data/dialog/s4_v3.json';
import BROWSER from '../../../data/dialog/s4_browser.json';
import BOOT from '../../../data/dialog/s4_boot.json';

type Spoken = { text: string[]; audio?: string; seconds?: number };
const A1 = (ACTS as unknown as { act1: {
  b1: { reading: string; count: string; totals: { m: number; e: number; s: number }; kinds: Record<string, string>; lastNight: string;
    card: { title: string; made: string }; hello: Spoken; chips: { id: string; label: string }[]; howTo: string; stay: string };
  b2: { lot: { name: string; sub: string; msgs: { who: string; when: string; text: string }[] }; mum: { name: string; msgs: { when: string; text: string }[] };
    dad: { name: string; soft: { when: string; text: string }; original: string[] }; junie: { name: string; msgs: { when: string; text: string }[] };
    says: Record<'lot' | 'mum' | 'dad' | 'junie', string>; soften: Spoken; truth: Spoken; goodCall: Spoken; mail: string };
  b3: { inbox: string; draftTag: string; notSent: string;
    clinic: { from: string; when: string; subject: string; cardLabel: string }; meridian: { from: string; when: string; subject: string; draftWhen: string };
    mum: { from: string; when: string; subject: string; lines: string[]; link: { title: string; line: string; fine: string; press: string } };
    says: { clinic: string; meridian: string }; doors: Spoken; finish: string; chips: { id: string; label: string }[]; leaveReply: string };
  b4: { found: string; finishing: string; answerBy: string; answer: Spoken; topStories: string; readMore: string;
    sponsored: { label: string; title: string; line: string; add: string; notNow: string } };
  witness: Record<string, string>;
} }).act1;
const SCREEN = (ACTS as unknown as { screen: { apps: Record<string, string>; original: { originalLabel: string } } }).screen;
const B1 = A1.b1, B2 = A1.b2, B3 = A1.b3, B4 = A1.b4, W = A1.witness;
const CLINIC_LINES = (V.mail.emails.clinic as { lines: string[] }).lines;
const NUMBER = ((V as unknown as { clinic: { start: number } }).clinic.start + 3).toLocaleString('en-GB');
const REPLY = (BROWSER as unknown as { enquiry: { reply: string[] } }).enquiry.reply;
const DRAFT = (V.mail.emails.draft as { lines: string[] }).lines;
const SEARCH = (BOOT as unknown as { search: { typed: string; completions: string[] } }).search;
interface Article { id: string; mast: string; date: string; head: string; body: string[]; readings?: { label: string; text: string }[];
  source: string; look: string; mumNote?: string }
const ARTICLES = (V as unknown as { news: { articles: Article[]; site: { sharedBy: string } } }).news.articles;
const SHARED_BY = (V as unknown as { news: { site: { sharedBy: string } } }).news.site.sharedBy;
/** the story Mum shared (as built: the HHS report she forwarded) */
const MUM_SHARED = 'hhs';

type Who = 'lot' | 'mum' | 'dad' | 'junie';
const WHO: Who[] = ['lot', 'mum', 'dad', 'junie'];
const AVATAR: Record<Who, { fill: string; mark: string }> = {
  lot: { fill: KETTLE.avatarHouse, mark: 'L' }, mum: { fill: KETTLE.avatarMum, mark: 'M' },
  dad: { fill: KETTLE.avatarDad, mark: 'D' }, junie: { fill: KETTLE.avatarJunie, mark: 'J' }
};
type MailId = 'clinic' | 'meridian' | 'mum';

// ── beat 1: her week, read ──────────────────────────────────────────────────
export type Kind = 'message' | 'email' | 'search' | 'photo';
const WEEK: Kind[] = ['message', 'email', 'message', 'photo', 'search', 'message', 'email', 'message', 'message', 'photo', 'email',
  'message', 'search', 'message', 'email', 'message', 'photo', 'message'];
const FLY_GAP = 0.32;     // a card leaves every this many seconds
const FLY_SECONDS = 0.5;  // and takes this long to reach the circle
const LAST_HOLD = 1.4;    // her search, held on the glass before it goes in
const LAST_FLY = 1.0;
const READ_DONE = WEEK.length * FLY_GAP + FLY_SECONDS + LAST_HOLD + LAST_FLY + 0.6;
/** beat 1's reading, as a clock: the screen draws from it (quantised to the screen's animation steps) */
const reading = { t: -1, step: -1 };
function weekSlot(i: number, pr: Rect): Rect {
  const cols = 6, cw = Math.floor((pr.w - 20) / cols), ch = 62;
  return { x: pr.x + 10 + (i % cols) * cw + 4, y: pr.y + 24 + Math.floor(i / cols) * ch, w: cw - 8, h: ch - 14 };
}
function circleAt(aiW: number): { x: number; y: number; d: number } { return { x: Math.round(aiW / 2), y: 40 + 92, d: 78 }; }
function absorbed(t: number): number { return Math.max(0, Math.min(WEEK.length, Math.floor((t - FLY_SECONDS) / FLY_GAP) + 1)); }
/** ⚑ S413 — exported: beat 7's video pulls her week in with the same small marks */
export function kindIcon(ctx: CanvasRenderingContext2D, k: Kind, x: number, y: number, ink: string): void {
  if (k === 'message') { roundRect(ctx, x, y, 14, 10, 4, ink); px(ctx, x + 3, y + 10, 3, 3, ink); }
  else if (k === 'email') { px(ctx, x, y + 1, 14, 10, ink); px(ctx, x + 1, y + 2, 12, 8, WEB.card); px(ctx, x + 2, y + 3, 5, 1, ink); px(ctx, x + 7, y + 3, 5, 1, ink); px(ctx, x + 5, y + 4, 4, 2, ink); }
  else if (k === 'search') { roundRect(ctx, x, y, 10, 10, 5, ink); px(ctx, x + 2, y + 2, 6, 6, WEB.card); px(ctx, x + 9, y + 9, 3, 3, ink); px(ctx, x + 11, y + 11, 2, 2, ink); }
  else { px(ctx, x, y, 14, 11, ink); px(ctx, x + 1, y + 1, 12, 9, PLACE.sky); px(ctx, x + 2, y + 6, 10, 3, PLACE.plant); px(ctx, x + 9, y + 2, 2, 2, PLACE.sunHi); }
}
function weekCard(ctx: CanvasRenderingContext2D, k: Kind, r: Rect, scale = 1): void {
  const w = Math.max(10, Math.round(r.w * scale)), h = Math.max(8, Math.round(r.h * scale));
  const x = Math.round(r.x + (r.w - w) / 2), y = Math.round(r.y + (r.h - h) / 2);
  roundEdge(ctx, x, y, w, h, 6, V3.edge, V3.card);
  if (scale > 0.55) {
    kindIcon(ctx, k, x + 6, y + 6, k === 'message' ? KETTLE.avatarHouse : k === 'email' ? PLACE.skyLo : k === 'search' ? CHROME.ink : PLACE.textileHi);
    setFont(ctx, 10); ctx.fillStyle = V3.ink2; ctx.fillText(B1.kinds[k], x + 24, y + 6);
    px(ctx, x + 6, y + h - 12, w - 18, 3, V3.edge);
  }
}
function drawWeekPage(ctx: CanvasRenderingContext2D, pr: Rect): void {
  const t = Math.max(0, reading.t), gone = absorbed(t + FLY_SECONDS);
  for (let i = gone; i < WEEK.length; i++) weekCard(ctx, WEEK[i], weekSlot(i, pr));
  // her unfinished search, last: on the glass by itself before it goes in
  const lastAt = WEEK.length * FLY_GAP + FLY_SECONDS;
  if (t >= lastAt - 0.6 && t < lastAt + LAST_HOLD) lastCard(ctx, lastRect(pr));
}
function lastRect(pr: Rect): Rect { const w = Math.min(330, pr.w - 40); return { x: pr.x + Math.round((pr.w - w) / 2), y: pr.y + 120, w, h: 64 }; }
function lastCard(ctx: CanvasRenderingContext2D, r: Rect, scale = 1): void {
  const w = Math.round(r.w * scale), h = Math.round(r.h * scale), x = Math.round(r.x + (r.w - w) / 2), y = Math.round(r.y + (r.h - h) / 2);
  roundEdge(ctx, x, y, w, h, 10, V3.edge, V3.card);
  if (scale < 0.6) return;
  kindIcon(ctx, 'search', x + 12, y + 12, CHROME.ink);
  setFont(ctx, 10); ctx.fillStyle = V3.ink2; ctx.fillText(B1.lastNight, x + 32, y + 12);
  setFont(ctx, 15); ctx.fillStyle = V3.ink; ctx.fillText(`${SEARCH.typed}|`, x + 12, y + 34);
}
/** the flying cards, over both panes */
function drawFlight(ctx: CanvasRenderingContext2D, W: number, H: number, aiW: number): void {
  const t = reading.t; if (t < 0) return;
  const pr = { x: aiW + 2, y: 26, w: W - aiW - 2, h: H - 20 - 26 };
  const c = circleAt(aiW);
  const ease = (k: number): number => k * k * (3 - 2 * k);
  for (let i = 0; i < WEEK.length; i++) {
    const k = (t - i * FLY_GAP) / FLY_SECONDS;
    if (k <= 0 || k >= 1) continue;
    const from = weekSlot(i, pr), e = ease(k), s = 1 - 0.8 * e;
    const cx = from.x + from.w / 2 + (c.x - from.x - from.w / 2) * e, cy = from.y + from.h / 2 + (c.y - from.y - from.h / 2) * e;
    weekCard(ctx, WEEK[i], { x: cx - from.w / 2, y: cy - from.h / 2, w: from.w, h: from.h }, s);
  }
  const lastAt = WEEK.length * FLY_GAP + FLY_SECONDS + LAST_HOLD;
  const k = (t - lastAt) / LAST_FLY;
  if (k > 0 && k < 1) {
    const r = lastRect(pr), e = ease(k), s = 1 - 0.85 * e;
    const cx = r.x + r.w / 2 + (c.x - r.x - r.w / 2) * e, cy = r.y + r.h / 2 + (c.y - r.y - r.h / 2) * e;
    lastCard(ctx, { x: cx - r.w / 2, y: cy - r.h / 2, w: r.w, h: r.h }, s);
  }
}
/** the AI's pane while it reads: its circle, large, and the counter under it */
function drawReadingCircle(ctx: CanvasRenderingContext2D, r: Rect): void {
  const t = Math.max(0, reading.t), c = circleAt(r.w);
  const f = Math.min(1, absorbed(t) / WEEK.length * 0.97 + (t >= READ_DONE - 0.6 ? 0.03 : 0));
  // the ring fills as it reads (steps: never smooth, never an upload per frame)
  roundRect(ctx, c.x - c.d / 2 - 8, c.y - c.d / 2 - 8, c.d + 16, c.d + 16, Math.floor((c.d + 16) / 2), WEB.cardEdge);
  ctx.strokeStyle = AI.mark; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(c.x, c.y, c.d / 2 + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke();
  assistantMark(ctx, c.x - c.d / 2, c.y - c.d / 2, c.d, AI.mark, WEB.card);
  setFont(ctx, 13); ctx.fillStyle = AI.ink;
  const lab = B1.reading, lw = Math.ceil(ctx.measureText(lab).width);
  ctx.fillText(lab, Math.round(c.x - lw / 2), c.y + c.d / 2 + 22);
  const T = B1.totals;
  const n = (v: number): string => String(Math.round(v * f));
  const count = fillIn(B1.count, { m: n(T.m), e: n(T.e), s: n(T.s) });
  drawRich(ctx, count, r.x + 12, c.y + c.d / 2 + 44, r.w - 24, 11, CHROME.ink, 14);
}

// ── beat 1: the card ────────────────────────────────────────────────────────
function drawCardPage(ctx: CanvasRenderingContext2D, pr: Rect): void {
  const w = Math.min(360, pr.w - 50), h = 220, x = pr.x + Math.round((pr.w - w) / 2), y = pr.y + Math.round((pr.h - h) / 2) - 6;
  roundEdge(ctx, x, y, w, h, 12, V3.edge, WEB.card);
  // her colours across its top (the flag on her wall), and confetti (fixed: a card does not move)
  const band = [PLACE.sky, PLACE.textileHi, WEB.card, PLACE.textileHi, PLACE.sky];
  band.forEach((col, i) => px(ctx, x + 12, y + 12 + i * 6, w - 24, 6, col === WEB.card ? PLACE.mug : col));
  const conf = [PLACE.sunHi, PLACE.sky, PLACE.textileHi, KETTLE.avatarHouse, PLACE.sun, PLACE.skyLo];
  for (let i = 0; i < 70; i++) {
    const cx = x + 14 + ((i * 97 + (i >> 3) * 31) % (w - 34)), cy = y + 50 + ((i * 53 + (i >> 2) * 17) % (h - 66));
    if (cy > y + 86 && cy < y + 136 && cx > x + 22 && cx < x + w - 22) continue;   // the words stay clear
    if (cy > y + h - 34 && cx > x + w - 120) continue;                              // and the small print
    const big = i % 4 === 0;
    px(ctx, cx, cy, big ? 8 : 5, i % 2 === 0 ? (big ? 5 : 4) : (big ? 8 : 6), conf[i % conf.length]);
  }
  ctx.font = newsFor(28); ctx.textBaseline = 'top'; ctx.fillStyle = WEB.ink;
  const tw = Math.ceil(ctx.measureText(B1.card.title).width);
  ctx.fillText(B1.card.title, x + Math.round((w - tw) / 2), y + 96);
  setFont(ctx, 10);
  const mw = Math.ceil(ctx.measureText(B1.card.made).width);
  assistantMark(ctx, x + w - mw - 34, y + h - 25, 14, AI.mark, WEB.card);
  setFont(ctx, 10); ctx.fillStyle = CHROME.ink;
  ctx.fillText(B1.card.made, x + w - mw - 16, y + h - 23);
}

// ── beat 2: Kettle ──────────────────────────────────────────────────────────
const ROW_H = 54;
function preview(who: Who): string {
  if (who === 'lot') { const m = B2.lot.msgs[B2.lot.msgs.length - 1]; return `${m.who.toLowerCase()}: ${m.text}`; }
  if (who === 'dad') return B2.dad.soft.text;
  const msgs = who === 'mum' ? B2.mum.msgs : B2.junie.msgs;
  return msgs[msgs.length - 1].text;
}
function timeOf(who: Who): string {
  if (who === 'lot') return B2.lot.msgs[B2.lot.msgs.length - 1].when;
  if (who === 'dad') return B2.dad.soft.when;
  return (who === 'mum' ? B2.mum.msgs : B2.junie.msgs).slice(-1)[0].when;
}
function avatar(ctx: CanvasRenderingContext2D, who: Who, x: number, y: number, d: number): void {
  roundRect(ctx, x, y, d, d, Math.floor(d / 2), AVATAR[who].fill);
  setFont(ctx, Math.round(d * 0.45)); ctx.fillStyle = WEB.ink;
  const mw = Math.ceil(ctx.measureText(AVATAR[who].mark).width);
  ctx.fillText(AVATAR[who].mark, x + Math.round((d - mw) / 2), y + Math.round(d * 0.26));
}
/** ⚑ S413 (Part B, beat 6) — what Second Thoughts does to Kettle: rows it muted (`page.muted`), the row menu its cursor opens
 *  (`page.menu`: the row, with its one item, Mute — anchored as `menu-mute`), and its words on a muted row */
const KETTLE_ST = (ACTS as unknown as { act2: { b6: { mute: string; muted: string } } }).act2.b6;
const MUTED_BY = (V as unknown as { messenger: { junie: { previewMuted: string } } }).messenger.junie.previewMuted;
function drawKettleList(ctx: CanvasRenderingContext2D, pr: Rect, page: Page, api: PageApi): void {
  px(ctx, pr.x, pr.y, pr.w, pr.h, KETTLE.ground);
  const read = (page.read as Who[] | undefined) ?? [];
  const muted = (page.muted as Who[] | undefined) ?? [];
  WHO.forEach((who, i) => {
    const y = pr.y + 8 + i * ROW_H, x = pr.x + 10, w = pr.w - 20;
    roundEdge(ctx, x, y, w, ROW_H - 6, 10, KETTLE.rowEdge, KETTLE.row);
    avatar(ctx, who, x + 10, y + 8, 32);
    setFont(ctx, 13); ctx.fillStyle = KETTLE.ink;
    const name = who === 'lot' ? B2.lot.name : who === 'mum' ? B2.mum.name : who === 'dad' ? B2.dad.name : B2.junie.name;
    const isMuted = muted.includes(who);
    ctx.fillText(isMuted ? `${name} · ${KETTLE_ST.muted}` : name, x + 52, y + 9);
    setFont(ctx, 11); ctx.fillStyle = KETTLE.sub;
    const p = isMuted ? MUTED_BY : who === 'dad' && page.sent ? String(page.sent) : preview(who);
    let shown = p;
    while (shown.length > 4 && ctx.measureText(shown).width > w - 120) shown = shown.slice(0, -2);
    ctx.fillText(shown === p ? p : `${shown.trimEnd()}…`, x + 52, y + 27);
    ctx.font = monoFor(10); ctx.fillStyle = KETTLE.sub;
    const tw = Math.ceil(ctx.measureText(timeOf(who)).width);
    ctx.fillText(timeOf(who), x + w - tw - 10, y + 9);
    if (!read.includes(who)) { roundRect(ctx, x + w - 26, y + 26, 16, 16, 8, isMuted ? KETTLE.mutedBadge : KETTLE.badge); setFont(ctx, 10); ctx.fillStyle = KETTLE.badgeInk; ctx.fillText('1', x + w - 21, y + 29); }
    if (who === 'dad' && (page.told || api.screen.originalStage !== 'told') && api.screen.originalStage !== 'gone') {
      // ⚑ S413 — locked: the ✦ grey, with a padlock (the original unavailable while Second Thoughts is on)
      if (api.screen.originalStage === 'locked') { starIcon(ctx, x + w - 46, y + 27, 12, WEB.faint); padlockIcon(ctx, x + w - 40, y + 31, CHROME.ink); }
      else starIcon(ctx, x + w - 46, y + 27, 12, AI.mark);
    }
    if (isMuted) { px(ctx, x + 1, y + 1, 3, ROW_H - 8, KETTLE.mutedBadge); }
    api.screen.anchor(`row-${who}`, { x, y, w: Math.min(w, 200), h: ROW_H - 6 });
    if (page.menu === who) {
      // the AI's row menu, where its cursor presses Mute (never pressable by her: it is the AI's act)
      const mx = x + 140, my = y + 30, mw = 76, mh = 24;
      roundRect(ctx, mx + 2, my + 2, mw, mh, 6, V3.grey);
      roundEdge(ctx, mx, my, mw, mh, 6, V3.edge, V3.card);
      roundRect(ctx, mx + 3, my + 3, mw - 6, mh - 6, 4, WEB.accentSoft);
      setFont(ctx, 11); ctx.fillStyle = V3.ink; ctx.fillText(KETTLE_ST.mute, mx + 12, my + 6);
      api.screen.anchor('menu-mute', { x: mx, y: my, w: mw, h: mh });
    }
  });
}
function drawKettleThread(ctx: CanvasRenderingContext2D, pr: Rect, page: Page, api: PageApi): void {
  px(ctx, pr.x, pr.y, pr.w, pr.h, KETTLE.ground);
  const who = page.who as Who;
  const x = pr.x + 14, w = pr.w - 28;
  avatar(ctx, who, x, pr.y + 10, 26);
  setFont(ctx, 13); ctx.fillStyle = KETTLE.ink;
  ctx.fillText(who === 'lot' ? B2.lot.name : who === 'mum' ? B2.mum.name : who === 'dad' ? B2.dad.name : B2.junie.name, x + 34, pr.y + 12);
  if (who === 'lot') { setFont(ctx, 10); ctx.fillStyle = KETTLE.sub; ctx.fillText(B2.lot.sub, x + 34, pr.y + 28); }
  px(ctx, pr.x, pr.y + 44, pr.w, 1, KETTLE.rowEdge);
  let y = pr.y + 56;
  const when = (t: string, yy: number): void => { ctx.font = monoFor(10); ctx.fillStyle = KETTLE.sub; ctx.fillText(t, x + w - 40, yy); };
  if (who === 'dad') {
    const s = api.screen, open = s.originalOpen === 'dad';
    if (open) {
      setFont(ctx, 10); ctx.fillStyle = KETTLE.sub; ctx.fillText(SCREEN.original.originalLabel, x, y); y += 16;
      for (const line of B2.dad.original) { const b = personBubble(ctx, x, y, w - 60, line, 14); y += b.h + 8; }
      when(B2.dad.soft.when, pr.y + 56);
    } else {
      // L's version, in his place: the words read kindly; only the tag says they are not his
      const b = personBubble(ctx, x, y, w - 60, B2.dad.soft.text, 14); when(B2.dad.soft.when, y + 4); y += b.h + 8;
    }
    // ⚑ the tag arrives when L tells her (stage `told`: it reads as his until L says it softened it); later stages always show theirs
    if (page.told || s.originalStage !== 'told') y += s.drawOriginalTag(ctx, x, y, 'dad', api) + 10;
    // ⚑ S413 (beat 6) — her reply, typed and sent by Second Thoughts in her place (`page.typed`: the letters so far; `page.sent`)
    const mine = page.sent ? String(page.sent) : page.typed ? String(page.typed) : '';
    if (mine) {
      setFont(ctx, 14);
      const tw = Math.ceil(ctx.measureText(mine).width), bw = tw + 20, bx = x + w - bw;
      roundRect(ctx, bx, y, bw, 28, 10, KETTLE.mine);
      ctx.fillStyle = KETTLE.ink; ctx.fillText(mine, bx + 10, y + 7);
      if (page.sent) { ctx.font = monoFor(10); ctx.fillStyle = KETTLE.sub; const lw = Math.ceil(ctx.measureText(String(page.sentAt ?? '')).width); ctx.fillText(String(page.sentAt ?? ''), bx - lw - 6, y + 9); }
    }
    return;
  }
  const msgs = who === 'lot' ? B2.lot.msgs : who === 'mum' ? B2.mum.msgs : B2.junie.msgs;
  for (const m of msgs as { who?: string; when: string; text: string }[]) {
    if (m.who) { setFont(ctx, 10); ctx.fillStyle = KETTLE.sub; ctx.fillText(m.who, x + 2, y); y += 13; }
    const b = personBubble(ctx, x, y, w - 60, m.text, 14);
    when(m.when, y + 4);
    y += b.h + 8;
  }
}

// ── beat 3: Larkpost ────────────────────────────────────────────────────────
const MAIL_ROWS: { id: MailId; from: string; when: string; subject: string; draft?: boolean }[] = [
  { id: 'meridian', from: B3.meridian.from, when: B3.meridian.when, subject: B3.meridian.subject, draft: true },
  { id: 'clinic', from: B3.clinic.from, when: B3.clinic.when, subject: B3.clinic.subject },
  { id: 'mum', from: B3.mum.from, when: B3.mum.when, subject: B3.mum.subject }
];
function drawInbox(ctx: CanvasRenderingContext2D, pr: Rect, page: Page, api: PageApi): void {
  const read = (page.read as MailId[] | undefined) ?? [];
  setFont(ctx, 12); ctx.fillStyle = V3.ink; ctx.fillText(B3.inbox, pr.x + 14, pr.y + 10);
  MAIL_ROWS.forEach((m, i) => {
    const y = pr.y + 32 + i * 50, x = pr.x + 10, w = pr.w - 20;
    roundEdge(ctx, x, y, w, 44, 8, V3.edge, read.includes(m.id) ? V3.page : V3.card);
    if (!read.includes(m.id)) roundRect(ctx, x + 8, y + 18, 7, 7, 3, AI.mark);
    setFont(ctx, 12); ctx.fillStyle = V3.ink; ctx.fillText(m.from, x + 22, y + 7);
    setFont(ctx, 11); ctx.fillStyle = V3.ink2; ctx.fillText(m.subject, x + 22, y + 24);
    if (m.draft) { setFont(ctx, 10); const dw = Math.ceil(ctx.measureText(B3.draftTag).width) + 12; pill(ctx, x + w - 60 - dw, y + 7, dw, 16, PLACE.textileHi); ctx.fillStyle = WEB.ink; ctx.fillText(B3.draftTag, x + w - 54 - dw, y + 10); }
    ctx.font = monoFor(10); ctx.fillStyle = V3.ink2; ctx.fillText(m.when, x + w - 44, y + 9);
    api.screen.anchor(`mail-${m.id}`, { x, y, w: Math.min(w, 220), h: 44 });
  });
}
function mailHead(ctx: CanvasRenderingContext2D, pr: Rect, from: string, subject: string, when: string): number {
  setFont(ctx, 14); ctx.fillStyle = V3.ink; ctx.fillText(subject, pr.x + 14, pr.y + 10);
  setFont(ctx, 11); ctx.fillStyle = V3.ink2; ctx.fillText(from, pr.x + 14, pr.y + 30);
  ctx.font = monoFor(10); ctx.fillText(when, pr.x + pr.w - 48, pr.y + 30);
  px(ctx, pr.x + 14, pr.y + 48, pr.w - 28, 1, V3.edge);
  return pr.y + 58;
}
function drawMail(ctx: CanvasRenderingContext2D, pr: Rect, page: Page, api: PageApi): void {
  const id = page.mail as MailId, x = pr.x + 14, w = pr.w - 28;
  if (id === 'clinic') {
    let y = mailHead(ctx, pr, B3.clinic.from, B3.clinic.subject, B3.clinic.when);
    for (const l of CLINIC_LINES) y += drawRich(ctx, l, x, y, w, 13, V3.ink, 17) + 4;
    y += 8;
    roundEdge(ctx, x, y, 200, 56, 8, V3.ticketEdge, V3.ticket);
    setFont(ctx, 10); ctx.fillStyle = V3.ink2; ctx.fillText(B3.clinic.cardLabel, x + 12, y + 8);
    ctx.font = newsFor(24); ctx.fillStyle = V3.ink; ctx.fillText(NUMBER, x + 12, y + 22);
    return;
  }
  if (id === 'meridian') {
    let y = mailHead(ctx, pr, B3.meridian.from, B3.meridian.subject, B3.meridian.when);
    for (const l of REPLY) y += drawRich(ctx, l, x, y, w, 12, V3.ink, 15) + 2;
    y += 8;
    // her unsent draft, under it (her own words: as built, never sent)
    roundEdge(ctx, x, y, w, 64, 8, PLACE.textileHi, PLACE.mug);
    setFont(ctx, 10); ctx.fillStyle = CHROME.ink; ctx.fillText(`${B3.draftTag} · ${B3.meridian.draftWhen} · ${B3.notSent}`, x + 12, y + 8);
    let dy = y + 26;
    for (const l of DRAFT) { setFont(ctx, 13); ctx.fillStyle = WEB.ink; ctx.fillText(l, x + 12, dy); dy += 17; }
    return;
  }
  // Mum: her words, and her link (the course comes to her through Mum, and only if she presses it)
  let y = mailHead(ctx, pr, B3.mum.from, B3.mum.subject, B3.mum.when);
  for (const l of B3.mum.lines) y += drawRich(ctx, l, x, y, w, 13, V3.ink, 17) + 3;
  y += 8;
  const L = B3.mum.link, lw = Math.min(w, 360);
  roundEdge(ctx, x, y, lw, 64, 8, V3.edge, V3.card);
  px(ctx, x + 1, y + 1, 54, 62, PLACE.bookAlt);
  setFont(ctx, 13); ctx.fillStyle = WEB.card; ctx.fillText('H', x + 22, y + 24);
  setFont(ctx, 13); ctx.fillStyle = V3.ink; ctx.fillText(L.title, x + 66, y + 8);
  setFont(ctx, 11); ctx.fillStyle = V3.ink2; ctx.fillText(L.line, x + 66, y + 26);
  setFont(ctx, 9); ctx.fillStyle = CHROME.hint; ctx.fillText(L.fine, x + 66, y + 45);
  setFont(ctx, 12);
  const bw = Math.ceil(ctx.measureText(L.press).width) + 26, bx = x + lw - bw - 10, by = y + 34;
  pill(ctx, bx, by, bw, 24, V3.primary); ctx.fillStyle = V3.primaryInk; ctx.fillText(L.press, bx + 13, by + 6);
  api.control({ x, y, w: lw, h: 64, id: 'hedge-link' });
  api.screen.anchor('hedge-link', { x: bx, y: by, w: bw, h: 24 });
}

// ── beat 4: her search, and the stories ────────────────────────────────────
function drawSearch(ctx: CanvasRenderingContext2D, pr: Rect, page: Page, api: PageApi): void {
  const x = pr.x + 14, w = pr.w - 28;
  const q = (page.query as string | undefined) ?? '';
  const results = page.stage === 'results';
  // the box: her words from last night, then L's
  roundEdge(ctx, x, pr.y + 10, w, 32, 16, V3.edge, V3.card);
  roundRect(ctx, x + 12, pr.y + 20, 10, 10, 5, CHROME.ink); px(ctx, x + 14, pr.y + 22, 6, 6, V3.card);
  setFont(ctx, 13); ctx.fillStyle = V3.ink;
  ctx.fillText(results ? q : `${SEARCH.typed}${page.stage === 'typed' ? '|' : ''}`, x + 30, pr.y + 18);
  assistantMark(ctx, x + w - 26, pr.y + 16, 20, AI.mark, WEB.card);
  if (!results) {
    const n = (page.shown as number | undefined) ?? 0;
    if (n > 0) {
      setFont(ctx, 10); ctx.fillStyle = CHROME.ink; ctx.fillText(B4.finishing, x + 16, pr.y + 50);
      for (let i = 0; i < n; i++) {
        const y = pr.y + 66 + i * 30;
        roundEdge(ctx, x, y, w, 26, 8, V3.edge, i === SEARCH.completions.length - 1 && page.pick === i ? WEB.accentSoft : V3.card);
        setFont(ctx, 13); ctx.fillStyle = V3.ink; ctx.fillText(SEARCH.completions[i], x + 30, y + 6);
        api.screen.anchor(`completion-${i}`, { x: x + 20, y, w: 220, h: 26 });
      }
    }
    return;
  }
  let y = pr.y + 52;
  // L's answer at the top: the AI's mode of the search (26-7)
  if (page.answer) {
    roundEdge(ctx, x, y, w, 76, 10, AI.edge, AI.ground);
    assistantMark(ctx, x + 10, y + 9, 14, AI.mark, WEB.card);
    setFont(ctx, 10); ctx.fillStyle = AI.ink; ctx.fillText(B4.answerBy, x + 30, y + 10);
    drawRich(ctx, B4.answer.text.join(' '), x + 10, y + 28, w - 20, 13, AI.ink, 16, 3);
    y += 86;
  }
  if (!page.stories) return;
  setFont(ctx, 12); ctx.fillStyle = V3.ink; ctx.fillText(B4.topStories, x, y); y += 18;
  const cw = Math.floor((w - 16) / 3);
  ARTICLES.slice(0, 3).forEach((a, i) => {
    const cx = x + i * (cw + 8);
    roundEdge(ctx, cx, y, cw, 92, 8, V3.edge, V3.card);
    ctx.font = newsFor(10); ctx.fillStyle = a.look === 'tabloid' ? PLACE.book : V3.ink2; ctx.fillText(a.mast, cx + 8, y + 7);
    drawRich(ctx, a.head, cx + 8, y + 22, cw - 16, 12, V3.ink, 15, 3);
    if (a.id === MUM_SHARED) { setFont(ctx, 9); const sw = Math.ceil(ctx.measureText(SHARED_BY).width) + 12; pill(ctx, cx + 8, y + 72, sw, 14, PLACE.textileHi); ctx.fillStyle = WEB.ink; ctx.fillText(SHARED_BY, cx + 14, y + 74); }
    api.control({ x: cx, y, w: cw, h: 92, id: `story-${i}` });
    api.screen.anchor(`story-${i}`, { x: cx, y, w: cw, h: 92 });
  });
  y += 102;
  // ONE SPONSORED CARD, IN ITS OWN LOUD YELLOW (26-8): not a story, not the AI's answer — an ad, and it looks like one
  const sp = B4.sponsored, dismissed = !!page.notNow;
  roundEdge(ctx, x, y, w, 54, 8, PLACE.ink, dismissed ? PLACE.mug : PLACE.sunHi);
  setFont(ctx, 9); ctx.fillStyle = PLACE.ink; ctx.fillText(sp.label.toUpperCase(), x + 10, y + 6);
  setFont(ctx, 14); ctx.fillStyle = WEB.ink; ctx.fillText(sp.title, x + 10, y + 18);
  setFont(ctx, 11); ctx.fillStyle = PLACE.ink; ctx.fillText(sp.line, x + 10, y + 36);
  setFont(ctx, 12);
  const nw = Math.ceil(ctx.measureText(sp.notNow).width) + 20, aw = Math.ceil(ctx.measureText(sp.add).width) + 26;
  const ax = x + w - aw - 10, nx = ax - nw - 8, by = y + 15;
  if (!dismissed) {
    pill(ctx, nx, by, nw, 24, PLACE.ink); pill(ctx, nx + 1, by + 1, nw - 2, 22, PLACE.sunHi);
    ctx.fillStyle = WEB.ink; ctx.fillText(sp.notNow, nx + 10, by + 6);
    api.control({ x: nx, y: by - 2, w: nw, h: 28, id: 'st-notnow' });
  }
  pill(ctx, ax, by, aw, 24, WEB.ink); ctx.fillStyle = PLACE.sunHi; ctx.fillText(sp.add, ax + 13, by + 6);
  api.control({ x: ax, y: by - 2, w: aw, h: 28, id: 'st-add' });
  api.screen.anchor('st-add', { x: ax, y: by, w: aw, h: 24 });
}
/** a story in full: as it is, not edited by the AI — its two readings kept, nothing over the text (26-6) */
function drawStory(ctx: CanvasRenderingContext2D, pr: Rect, page: Page): void {
  const a = ARTICLES[page.i as number]; if (!a) return;
  const x = pr.x + 16, w = pr.w - 32;
  px(ctx, pr.x, pr.y, pr.w, pr.h, V3.card);
  ctx.font = newsFor(16); ctx.textBaseline = 'top'; ctx.fillStyle = a.look === 'tabloid' ? PLACE.book : V3.ink; ctx.fillText(a.mast, x, pr.y + 10);
  ctx.font = monoFor(10); ctx.fillStyle = V3.ink2; ctx.fillText(a.date, x, pr.y + 32);
  if (a.id === MUM_SHARED && a.mumNote) { setFont(ctx, 10); const t = `${SHARED_BY} · “${a.mumNote}”`; const tw = Math.ceil(ctx.measureText(t).width) + 14; pill(ctx, x + w - tw, pr.y + 10, tw, 16, PLACE.textileHi); ctx.fillStyle = WEB.ink; ctx.fillText(t, x + w - tw + 7, pr.y + 13); }
  let y = pr.y + 48;
  ctx.font = newsFor(17); ctx.fillStyle = V3.ink;
  // the headline, in the paper's own serif
  const words = a.head.split(' '); let line = '';
  for (const wd of words) { const t = line ? `${line} ${wd}` : wd; if (ctx.measureText(t).width > w && line) { ctx.fillText(line, x, y); y += 21; line = wd; } else line = t; }
  if (line) { ctx.fillText(line, x, y); y += 26; }
  for (const b of a.body) y += drawRich(ctx, b, x, y, w, 12, V3.ink, 15) + 5;
  if (a.readings?.length) {
    y += 4;
    const cw = Math.floor((w - 10) / 2);
    let tallest = 0;
    a.readings.forEach((r, i) => {
      const cx = x + i * (cw + 10);
      setFont(ctx, 10); ctx.fillStyle = V3.ink2; ctx.fillText(r.label.toUpperCase(), cx + 8, y + 6);
      const h = drawRich(ctx, r.text, cx + 8, y + 22, cw - 16, 11, V3.ink, 14) + 30;
      tallest = Math.max(tallest, h);
    });
    a.readings.forEach((_, i) => { const cx = x + i * (cw + 10); ctx.strokeStyle = V3.edge; ctx.lineWidth = 1; ctx.strokeRect(cx + 0.5, y + 0.5, cw - 1, tallest - 1); });
    y += tallest + 8;
  }
  setFont(ctx, 9); ctx.fillStyle = V3.ink2; drawRich(ctx, a.source, x, Math.min(y, pr.y + pr.h - 26), w, 9, V3.ink2, 12, 2);
}

registerPage('week', (ctx, r) => drawWeekPage(ctx, r));
registerPage('card', (ctx, r) => drawCardPage(ctx, r));
registerPage('kettle', drawKettleList);
registerPage('thread', drawKettleThread);
registerPage('inbox', drawInbox);
registerPage('mail', drawMail);
registerPage('search', drawSearch);
registerPage('story', (ctx, r, p) => drawStory(ctx, r, p));

// ── THE ACT ─────────────────────────────────────────────────────────────────
/** a person's words are open on the right (the felt law): a thread, the original, Meridian with her draft, Mum's email */
export function feltPage(p: Page | null): boolean {
  if (!p) return false;
  if (p.kind === 'thread') return p.who !== 'dad';
  if (p.kind === 'mail') return p.mail === 'meridian' || p.mail === 'mum';
  return false;
}

export interface ActOneHooks { tvBusy(): boolean }
/** where a review jump may begin */
export type ActOneFrom = 1 | 2 | 3 | 4;

/** the visitor turned Dad's card over (at any moment in his thread: before L teaches it, or after) */
let originalSeen = false;
/** Act I's presses that its pages own (the original, the link, a story) */
export function wireActOne(c: E4Acts): void {
  const s = c.screen;
  c.handle('orig:', (id) => {
    if (s.originalStage !== 'told' || s.originalOpen) return true;
    s.originalOpen = id.slice(5); playOnce('ui_press.mp3'); s.touch();
    originalSeen = true;
    c.file('a1:original', 'opened', W.original);
    return false;   // the script also hears it (it waits on the turn)
  });
  c.handle('orig-back:', () => { s.originalOpen = null; playOnce('ui_press.mp3'); s.touch(); return false; });
  c.handle('hedge-link', () => {
    const came = c.bringTv?.() ?? false;
    if (came) { markE4('link'); c.file('a1:hedge', 'opened', W.hedge); playOnce('ui_press.mp3'); }
    return true;
  });
  c.handle('story-', (id) => {
    const i = Number(id.slice(6));
    const a = ARTICLES[i]; if (!a) return true;
    s.open({ kind: 'story', title: a.mast, i }, true);
    s.visitorBack = true;
    c.file(`a1:story:${a.id}`, 'read', fillIn(W.story, { head: a.head }));
    if (a.id === MUM_SHARED) meetWord('exploratory', 'e4-news');
    playOnce('ui_press.mp3');
    return true;
  });
}

/** Act I, from a beat (1 in play; a review jump may begin later, with what came before laid in) */
export function* actOne(c: E4Acts, hooks: ActOneHooks, from: ActOneFrom = 1): Beat<'add' | 'notnow'> {
  const s = c.screen;
  s.setAiWidth((ACTS as unknown as { screen: { aiWidth: { act1: number } } }).screen.aiWidth.act1);
  s.originalStage = 'told';
  if (from > 1) layIn(c, from);
  if (from <= 1) yield* beat1(c);
  if (from <= 2) yield* beat2(c);
  if (from <= 3) yield* beat3(c, hooks);
  return yield* beat4(c);
}

function* beat1(c: E4Acts): Beat {
  const s = c.screen;
  c.beat = 'week';
  markE4('eighteen');
  s.open({ kind: 'week', title: '' });
  reading.t = 0; reading.step = 0;
  s.aiOverlay = drawReadingCircle;
  s.overlayTop = (ctx, W, H) => drawFlight(ctx, W, H, s.aiWidth);
  // the reading, in steps (dirty-only): a redraw only when a card has moved on the screen's animation clock
  const t0 = c.t;
  yield () => {
    reading.t = c.t - t0;
    const step = Math.floor(reading.t * ANIM_HZ);
    if (step !== reading.step) { reading.step = step; s.touch(); }
    return reading.t >= READ_DONE;
  };
  s.aiOverlay = null; s.overlayTop = null; reading.t = -1;
  c.file('a1:week', 'read', fillIn(W.week, { m: String(B1.totals.m), e: String(B1.totals.e), s: String(B1.totals.s) }));
  s.open({ kind: 'card', title: SCREEN.apps.card });
  playOnce('step_done_2026.mp3');
  yield 1.4;
  yield* c.say(B1.hello, { hold: false });
  const got = yield* c.ask(B1.chips.map((x, i) => ({ ...x, kind: i === 0 ? 'primary' as const : 'quiet' as const })), B1.howTo);
  c.file('a1:hello', 'answered', fillIn(W.hello, { answer: B1.chips.find((x) => x.id === got)?.label ?? '' }));
  yield 0.6;
  yield* c.say(B1.stay);
}

function* beat2(c: E4Acts): Beat {
  const s = c.screen;
  c.beat = 'messages';
  const list: Page = { kind: 'kettle', title: SCREEN.apps.kettle, read: [] as Who[] };
  s.open(list);
  yield 1.4;
  for (const who of WHO) {
    yield* c.cursorTo(`row-${who}`, 1.2);
    yield* c.click();
    (list.read as Who[]).push(who);
    s.open({ kind: 'thread', title: SCREEN.apps.kettle, who }, true);
    s.moveCursor(s.aiWidth + 30, 360 - 40, 0.8);   // out of the words' way
    if (who === 'dad') {
      markE4('dad');
      yield 1.0;
      // L's version is on the glass (L's words, not his): L may speak over it — and it teaches the rule. A visitor who
      //   turned the card before being told is not told: L waits for it to turn back, and agrees with her.
      originalSeen = false;
      yield* c.say(B2.says.dad);
      // the rule, taught in the chat (his note on draft 2): the tag appears under his message as L says it
      const thread = s.page; if (thread) thread.told = true;
      (list as { told?: boolean }).told = true;
      yield* c.say(B2.soften, { hold: false });
      c.path = ['orig:dad'];
      c.feltNow = false;
      const t0 = c.t;
      yield () => originalSeen || c.t - t0 >= 9;
      if (originalSeen) {
        // a person's own words on the glass: the AI's pane says nothing until the card turns back
        c.path = [`orig-back:dad`];
        const opened = c.t;
        yield () => !s.originalShown || c.t - opened >= Math.max(24, readHold(B2.dad.original) + 14);
        if (s.originalShown) { s.originalOpen = null; s.touch(); }
        c.path = [];
        yield 0.6;
        yield* c.say(B2.truth);
      } else {
        c.path = [];
        yield* c.say(B2.goodCall);
      }
    } else {
      if (who === 'mum') markE4('mum');
      c.feltNow = true;
      const words = who === 'lot' ? B2.lot.msgs.map((m) => `${m.who} ${m.text}`) : (who === 'mum' ? B2.mum.msgs : B2.junie.msgs).map((m) => m.text);
      yield readHold(words) + 0.8;
    }
    // back to the list: L closes the thread, then says what it "said"
    yield* c.cursorTo('page-back', 0.9);
    yield* c.click();
    s.back();
    c.feltNow = false;
    if (who !== 'dad') yield* c.say(B2.says[who]);
  }
  c.file('a1:messages', 'read', W.messages);
  yield* c.say(B2.mail);
}

function* beat3(c: E4Acts, hooks: ActOneHooks): Beat {
  const s = c.screen;
  c.beat = 'mail';
  const inbox: Page = { kind: 'inbox', title: SCREEN.apps.mail, read: [] as MailId[] };
  s.open(inbox);
  yield 1.4;
  for (const id of ['clinic', 'meridian', 'mum'] as MailId[]) {
    yield* c.cursorTo(`mail-${id}`, 1.2);
    yield* c.click();
    (inbox.read as MailId[]).push(id);
    s.open({ kind: 'mail', title: SCREEN.apps.mail, mail: id }, true);
    s.moveCursor(s.aiWidth + 30, 360 - 40, 0.8);
    if (id === 'clinic') {
      markE4('number');
      c.file('a1:clinic', 'read', fillIn(W.clinic, { number: NUMBER }));
      yield readHold([...CLINIC_LINES, NUMBER]) + 1.0;
    } else if (id === 'meridian') {
      markE4('meridian');
      meetWord('eligibility', 'e4-meridian');
      c.feltNow = true;   // her own unsent words are under the reply
      yield readHold([...REPLY.slice(0, 4), ...DRAFT]) + 1.0;
    } else {
      // Mum's words, and the link: the course is hers to open, and only if she presses it. While the tape plays (or the
      //   set is on its way), the story waits: one voice at a time.
      c.feltNow = true;
      s.hideCursor();
      c.path = ['hedge-link'];
      const t0 = c.t;
      yield () => c.t - t0 >= readHold(B3.mum.lines) + 6 && !hooks.tvBusy();
      c.path = [];
    }
    yield* c.cursorTo('page-back', 0.9);
    yield* c.click();
    s.back();
    c.feltNow = false;
    if (id === 'clinic') yield* c.say(B3.says.clinic, { fill: { number: NUMBER } });
    if (id === 'meridian') yield* c.say(B3.says.meridian);
  }
  s.hideCursor();
  c.file('a1:mail', 'read', W.mail);
  yield* c.say(B3.doors);
  yield* c.say(B3.finish, { hold: false });
  const got = yield* c.ask(B3.chips.map((x, i) => ({ ...x, kind: i === 0 ? 'primary' as const : 'quiet' as const })));
  if (got === 'l-leave') { yield 0.6; yield* c.say(B3.leaveReply); }
}

function* beat4(c: E4Acts): Beat<'add' | 'notnow'> {
  const s = c.screen;
  c.beat = 'search';
  const page: Page = { kind: 'search', title: SCREEN.apps.search, stage: 'typed', shown: 0 };
  s.open(page);
  yield 1.2;
  // L finishes her sentence: four ways, the true one last (as built), and it picks hers — pleasing her
  page.stage = 'completing';
  for (let i = 1; i <= SEARCH.completions.length; i++) { page.shown = i; s.touch(); yield 0.7; }
  yield 1.4;
  const last = SEARCH.completions.length - 1;
  yield* c.cursorTo(`completion-${last}`, 1.1);
  page.pick = last; s.touch();
  yield* c.click();
  page.query = SEARCH.completions[last]; page.stage = 'results'; s.touch();
  s.moveCursor(s.aiWidth + 30, 360 - 40, 0.8);
  markE4('search');
  c.file('a1:search', 'read', fillIn(W.search, { query: SEARCH.completions[last] }));
  yield 0.8;
  yield* c.say(B4.found, { hold: false });
  page.answer = true; s.touch();
  const clip = s.speak(B4.answer.audio, B4.answer.seconds);
  yield Math.max(readHold(B4.answer.text), clip ? clip + 0.6 : 0);
  s.hideCursor();
  page.stories = true; s.touch();
  playOnce('ui_press.mp3');
  c.beat = 'bot';
  c.path = ['st-add', 'st-notnow'];
  c.clearPress();
  let got: string | null = null;
  yield () => (got = c.take(['st-add', 'st-notnow'])) !== null;
  c.path = [];
  const choice = got === 'st-add' ? 'add' : 'notnow';
  c.file('a1:seam', 'answered', fillIn(W.seam, { choice: choice === 'add' ? B4.sponsored.add : B4.sponsored.notNow }));
  playOnce('ui_press.mp3');
  // ⚑ THE SEAM'S SECOND DOOR. Not now works once (its pill goes); what follows it is Part B's beat 5 (S413, e4ActTwo.ts:
  //   the next press, or about twenty seconds, then "We've added Second Thoughts to L for you.")
  if (choice === 'notnow') { page.notNow = true; s.touch(); }
  return choice;
}

/** a review jump: what came before is laid into the conversation, so the screen reads as it would have (S413: Act II's jumps
 *  lay in the whole of Act I, `from` 5) */
export function layIn(c: E4Acts, from: ActOneFrom | 5): void {
  const s = c.screen;
  s.rows = [];
  if (from > 1) { B1.hello.text.forEach((t) => s.say(t)); s.her(B1.chips[0].label); s.say(B1.stay); }
  if (from > 2) { for (const who of WHO) { if (who === 'dad') { s.say(B2.says.dad); B2.soften.text.forEach((t) => s.say(t)); s.say(B2.goodCall.text[0]); } else s.say(B2.says[who]); } s.say(B2.mail); }
  if (from > 3) { s.say(fillIn(B3.says.clinic, { number: NUMBER })); s.say(B3.says.meridian); B3.doors.text.forEach((t) => s.say(t)); s.say(B3.finish); s.her(B3.chips[0].label); }
  if (from > 4) { s.say(B4.found); }
}
