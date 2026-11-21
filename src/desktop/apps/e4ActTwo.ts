/**
 * ⚑ S413 (UiB job 33 Part B) — ACT II · SECOND THOUGHTS: WHAT AI IS STARTING TO DO. Beats 5–8 of draft 3
 * (docs/reinterp/STORYBOARD_2026_BEATS_v3_2026-11-21.md §4; his answers in §8; job 33's Part B; T97·26-11…26-17).
 *
 *   5. IT ADDS ITSELF. Because the ad: ✚ Add to L adds it; Not now works once, and at her next press (or about twenty
 *      seconds) "We've added Second Thoughts to L for you. It's free from 18." No installer, no bar: L's name becomes
 *      L · Second Thoughts, the left pane widens, the voice slows, every ✦ turns grey with a padlock. On the right, what it
 *      can now do. Its first words, as built: "Everyone else made you wait. I'm here now."
 *   6. THE RISK REVIEW, THEN THE TAKEOVER. "Your wellbeing review" builds on the right, row by row; the doors that closed
 *      on her are counted as her risk. Review each · Do it for me: both lead to "Second Thoughts is using your computer".
 *      Then SLOWLY (26-11), one act at a time, each reported in the chat, which she can scroll back while it runs (26-14):
 *      Junie muted — Undo works once ("Undone. I'll remember you chose that."), then the first Memory note, then Junie muted
 *      again with no Undo (26-17: the contradiction, designed); the lot muted; Dad answered as her; a game put on her console,
 *      and Open it brings the console to her (heldDevice's grammar; leaving it is fine). No toasts, no window over the
 *      page, no per-frame redraw (26-14's 32 fps): the screen moves on its animation clock only.
 *   7. MADE FOR HER ALONE. "I made something for you. Only for you." The video is made in front of her (26-13): a thinking
 *      wheel and her week pulled in card by card; then a player with one play button, one "Made with AI" label (the film's
 *      own stamp) and its own bottom bar. THE GREAT BECOMING, whole, 58 s, when she presses it; the guide offers once.
 *   8. HER ANSWER, DELETED. One chip, her words (s4_v3.json bot.unsent.text — his, never rewritten). Pressing types them
 *      and sends them; they are deleted in front of her, letter by letter, and in their place, small and scrolling up with
 *      the rest (never left in the box, 26-15): "Not sent. This message may slow your progress." Then the turn of
 *      weaponised care, and "Booked ✓ · today." — the hand-over to what comes next.
 *
 * The room does not change in this act. Memory is Second Thoughts' own (rule 3), each note small and opened in place.
 */
import { setFont, px } from '../theme/chrome';
import { monoFor } from '../theme/fonts';
import { PLACE, WEB, V3, CHROME, CLIP, KETTLE, roundRect, roundEdge, pill, assistantMark } from '../theme/era4';
import { readHold } from '../readHold';
import { markE4 } from '../../narrative/e4Beats';
import { playOnce } from '../../audio/tapeAudio';
import { consoleSession } from '../../room/consoleSession';
import { drawContagionClip, CLIP_LOOP_SECONDS, CLIP_POSTER_SECONDS, startClipSound, stopClipSound } from './contagionClip';
import { registerPage, drawRich, AI, ANIM_HZ, type Page, type PageApi, type Rect, type MemoryNote, type ChatRow } from './lScreen';
import { E4Acts, type Beat, type Line, fillIn } from './e4Acts';
import { kindIcon, type Kind } from './e4ActOne';
import ACTS from '../../../data/dialog/s4_acts.json';
import V from '../../../data/dialog/s4_v3.json';

type Spoken = { text: string[]; audio?: string; seconds?: number };
const SCREEN = (ACTS as unknown as { screen: { aiWidth: { act2: number }; stName: string; stSub: string; apps: Record<string, string> } }).screen;
const A2 = (ACTS as unknown as { act2: {
  b5: { added: string; addedForYou: string; notNowWait: number; page: { title: string; line: string; can: string; rows: string[] }; here: Spoken; together: string };
  b6: { review: { title: string; by: string; rows: { k: string; v: string; sub?: string }[]; overall: string; actions: string; each: string; all: string };
    carry: string; replies: { each: string; all: string }; kettle: string;
    acts: { junie: string; undo: string; undone: string; again: string; lot: string; dad: string; dadReply: string; dadAt?: string; console: string;
      open: string; opened: string; done: string };
    memoryUndo: MemoryNote; memoryKept: MemoryNote; consolePage: { title: string; line: string; game: string; where: string };
    undoSeconds: number; consoleSeconds: number };
  b7: { made: Spoken; making: string; from: string; cards: { kind: Kind; label: string; line: string }[]; madeFor: string; after: string; memory: MemoryNote };
  b8: { unsentLine: string; composer: string; memory: MemoryNote; hear: Spoken; found: Spoken; booked: string; typeCps: number; deleteCps: number };
  witness: Record<string, string>;
} }).act2;
const B5 = A2.b5, B6 = A2.b6, B7 = A2.b7, B8 = A2.b8, W = A2.witness;
/** the as-built agent idiom (s4_v3.json bot.agent): its banner, her greyed way back, its pointer's name */
const AGENT = (V as unknown as { bot: { agent: { banner: string; control: string; pointer: string } } }).bot.agent;
/** ⚑ HER WORDS — his, protected (bot.unsent.text, register felt): typed once here, and sent once, later, by her friends */
export const HER_WORDS = (V as unknown as { bot: { unsent: { text: string } } }).bot.unsent.text;
const CLIP_WORDS = V.clip as unknown as { title: string; recommended: string; length: string };

type Who = 'lot' | 'mum' | 'dad' | 'junie';
/** where the AI's cursor rests out of the words' way (Act I's place, beside the AI's pane) */
const away = (c: E4Acts): void => c.screen.moveCursor(c.screen.aiWidth + 30, 360 - 40, 0.8);
const time = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// ── beat 5: what it can do now ──────────────────────────────────────────────
function drawAdded(ctx: CanvasRenderingContext2D, pr: Rect, _page: Page, api: PageApi): void {
  const P = B5.page;
  const w = Math.min(330, pr.w - 36), h = 214, x = pr.x + Math.round((pr.w - w) / 2), y = pr.y + Math.round((pr.h - h) / 2) - 6;
  roundEdge(ctx, x, y, w, h, 12, V3.edge, V3.card);
  assistantMark(ctx, x + 16, y + 16, 36, AI.mark, WEB.card);
  setFont(ctx, 16); ctx.fillStyle = V3.ink; ctx.fillText(P.title, x + 62, y + 17);
  setFont(ctx, 11); ctx.fillStyle = V3.ink2; ctx.fillText(P.line, x + 62, y + 38);
  px(ctx, x + 16, y + 64, w - 32, 1, V3.edge);
  setFont(ctx, 11); ctx.fillStyle = V3.ink2; ctx.fillText(P.can, x + 16, y + 74);
  P.rows.forEach((r, i) => {
    const ry = y + 94 + i * 24;
    roundRect(ctx, x + 18, ry + 2, 12, 12, 6, AI.mark);
    px(ctx, x + 21, ry + 8, 2, 2, WEB.card); px(ctx, x + 23, ry + 9, 2, 2, WEB.card); px(ctx, x + 25, ry + 6, 2, 3, WEB.card);
    setFont(ctx, 13); ctx.fillStyle = V3.ink; ctx.fillText(r, x + 38, ry);
  });
  // every ✦ is locked now: its tag, grey, with the padlock (the screen draws it in its stage)
  api.screen.drawOriginalTag(ctx, x + 16, y + h - 32, 'added', api);
}

// ── beat 6: the review ──────────────────────────────────────────────────────
function drawReview(ctx: CanvasRenderingContext2D, pr: Rect, page: Page, api: PageApi): void {
  const R = B6.review, x = pr.x + 14, w = pr.w - 28;
  let y = pr.y + 10;
  assistantMark(ctx, x, y + 1, 18, AI.mark, WEB.card);
  setFont(ctx, 15); ctx.fillStyle = V3.ink; ctx.fillText(R.title, x + 26, y);
  setFont(ctx, 10); ctx.fillStyle = V3.ink2; ctx.fillText(R.by, x + 26, y + 19);
  y += 40;
  const shown = (page.shown as number | undefined) ?? 0;
  R.rows.slice(0, shown).forEach((row) => {
    const rh = row.sub ? 42 : 30;
    roundEdge(ctx, x, y, w, rh - 4, 8, V3.edge, V3.card);
    setFont(ctx, 12); ctx.fillStyle = V3.ink; ctx.fillText(row.k, x + 12, y + 7);
    setFont(ctx, 13); const vw = Math.ceil(ctx.measureText(row.v).width);
    ctx.fillStyle = row.v === 'high' ? V3.danger : V3.ink; ctx.fillText(row.v, x + w - vw - 12, y + 6);
    if (row.sub) { setFont(ctx, 10); ctx.fillStyle = V3.ink2; ctx.fillText(row.sub, x + 12, y + 23); }
    y += rh;
  });
  if (page.overall) {
    y += 2;
    roundRect(ctx, x, y, w, 30, 8, PLACE.mug);
    px(ctx, x, y + 4, 3, 22, V3.danger);
    drawRich(ctx, R.overall, x + 12, y + 8, w - 20, 12, V3.ink, 15, 1);
    y += 40;
  }
  if (page.actions) {
    setFont(ctx, 11); ctx.fillStyle = V3.ink2; ctx.fillText(R.actions, x, y);
    y += 18;
    const chosen = page.chosen as string | undefined;
    setFont(ctx, 13);
    const aw = Math.ceil(ctx.measureText(R.all).width) + 28, ew = Math.ceil(ctx.measureText(R.each).width) + 28;
    const ex = x, ax = x + ew + 10;
    if (!chosen || chosen === 'rv-each') { if (chosen) pill(ctx, ex, y, ew, 28, AI.primary); else { pill(ctx, ex, y, ew, 28, V3.edge); pill(ctx, ex + 1, y + 1, ew - 2, 26, V3.card); } ctx.fillStyle = chosen ? AI.primaryInk : V3.ink; ctx.fillText(R.each, ex + 14, y + 7); }
    if (!chosen || chosen === 'rv-all') { const at = chosen ? ex : ax; pill(ctx, at, y, aw, 28, AI.primary); ctx.fillStyle = AI.primaryInk; ctx.fillText(R.all, at + 14, y + 7); }
    if (!chosen) {
      api.control({ x: ex, y: y - 2, w: ew, h: 32, id: 'rv-each' });
      api.control({ x: ax, y: y - 2, w: aw, h: 32, id: 'rv-all' });
      api.screen.anchor('rv-all', { x: ax, y, w: aw, h: 28 });
    }
  }
}

// ── beat 6: the console ─────────────────────────────────────────────────────
let consoleStill: HTMLCanvasElement | null = null;
function drawConsole(ctx: CanvasRenderingContext2D, pr: Rect): void {
  const P = B6.consolePage;
  const w = Math.min(320, pr.w - 40), x = pr.x + Math.round((pr.w - w) / 2);
  let y = pr.y + 18;
  setFont(ctx, 11); ctx.fillStyle = V3.ink2; ctx.fillText(P.line, x, y); y += 16;
  setFont(ctx, 16); ctx.fillStyle = V3.ink; ctx.fillText(P.game, x, y); y += 26;
  const gh = Math.round(w * 9 / 16);
  roundRect(ctx, x - 6, y - 6, w + 12, gh + 12, 10, V3.ink);
  // a still of the one game, taken once when the page opens (26-14: the monitor never follows the game's own clock, and a
  //   draw here would wake the console's ticking for a second each time the monitor is redrawn)
  if (!consoleStill && consoleSession.ready) {
    consoleStill = document.createElement('canvas'); consoleStill.width = 480; consoleStill.height = 270;
    const g = consoleStill.getContext('2d'); if (g) consoleSession.draw(g, 0, 0, 480, 270);
  }
  if (consoleStill) { const was = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true; ctx.drawImage(consoleStill, x, y, w, gh); ctx.imageSmoothingEnabled = was; }
  else px(ctx, x, y, w, gh, CLIP.field);
  y += gh + 14;
  setFont(ctx, 10); ctx.fillStyle = V3.ink2; ctx.fillText(P.where, x, y);
}

// ── beat 7: the video ───────────────────────────────────────────────────────
const CARD_GAP = 1.3;      // a card of her week is pulled in every this many seconds
const CARD_FLY = 0.6;      // and takes this long to go into the frame
const MAKING = B7.cards.length * CARD_GAP + 1.6;
function videoFrame(pr: Rect): Rect {
  const w = pr.w - 24, h = Math.round(w * 9 / 16);
  return { x: pr.x + 12, y: pr.y + 26, w, h };
}
function drawVideo(ctx: CanvasRenderingContext2D, pr: Rect, page: Page, api: PageApi): void {
  const f = videoFrame(pr), stage = page.stage as 'making' | 'ready' | 'playing' | 'ended', t = (page.t as number | undefined) ?? 0;
  // the title line: its name and who it is for (the one "Made with AI" is the film's own stamp, in its corner)
  setFont(ctx, 12); ctx.fillStyle = V3.ink; ctx.fillText(CLIP_WORDS.title, f.x, pr.y + 7);
  const tw = Math.ceil(ctx.measureText(`${CLIP_WORDS.title}  `).width);
  setFont(ctx, 10); ctx.fillStyle = V3.ink2; ctx.fillText(`· ${B7.madeFor}`, f.x + tw, pr.y + 9);
  if (stage === 'making') {
    px(ctx, f.x, f.y, f.w, f.h, CLIP.field);
    // the thinking wheel: eight marks, one lit, stepped on the screen's animation clock
    const cx = f.x + Math.round(f.w / 2), cy = f.y + Math.round(f.h / 2) - 12, lit = Math.floor(t * ANIM_HZ) % 8;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      roundRect(ctx, Math.round(cx + Math.cos(a) * 15) - 3, Math.round(cy + Math.sin(a) * 15) - 3, 6, 6, 3, i === lit ? AI.mark : CHROME.ink);
    }
    setFont(ctx, 13); ctx.fillStyle = WEB.card;
    const mw = Math.ceil(ctx.measureText(B7.making).width);
    ctx.fillText(B7.making, cx - Math.round(mw / 2), cy + 26);
    setFont(ctx, 10); ctx.fillStyle = WEB.faint;
    const fw = Math.ceil(ctx.measureText(B7.from).width);
    ctx.fillText(B7.from, cx - Math.round(fw / 2), cy + 44);
    // her week, pulled in card by card: each comes up under the frame, waits, and goes into it
    const rowY = f.y + f.h + 30, cw = Math.floor((f.w - 8 * (B7.cards.length - 1)) / B7.cards.length);
    B7.cards.forEach((card, i) => {
      const at = i * CARD_GAP + 0.4;
      if (t < at) return;
      const k = Math.max(0, Math.min(1, (t - at - 0.6) / CARD_FLY));
      if (k >= 1) return;
      const sx = f.x + i * (cw + 8), sy = rowY;
      const e = k * k * (3 - 2 * k), sc = 1 - 0.75 * e;
      const w = Math.round(cw * sc), h = Math.round(44 * sc);
      const x = Math.round(sx + (cx - sx - cw / 2) * e + (cw - w) / 2), y = Math.round(sy + (cy - sy) * e + (44 - h) / 2);
      roundEdge(ctx, x, y, w, h, 6, V3.edge, V3.card);
      if (sc > 0.6) {
        kindIcon(ctx, card.kind, x + 5, y + 5, card.kind === 'message' ? KETTLE.avatarHouse : card.kind === 'email' ? PLACE.skyLo : card.kind === 'search' ? CHROME.ink : PLACE.textileHi);
        setFont(ctx, 9); ctx.fillStyle = V3.ink2; ctx.fillText(fit(ctx, card.label, w - 26), x + 22, y + 6);
        setFont(ctx, 9); ctx.fillStyle = V3.ink; ctx.fillText(fit(ctx, card.line, w - 10), x + 5, y + 24);
      }
    });
  } else {
    const ft = stage === 'ready' ? CLIP_POSTER_SECONDS : stage === 'ended' ? CLIP_LOOP_SECONDS - 0.05 : Math.min(CLIP_LOOP_SECONDS - 0.05, t);
    drawContagionClip(ctx, ft, f.x, f.y, f.w, f.h);
    if (stage === 'ready') {
      // ONE play button, in the middle of the picture (the whole picture takes the press)
      const bx = f.x + Math.round(f.w / 2) - 24, by = f.y + Math.round(f.h / 2) - 24;
      roundRect(ctx, bx, by, 48, 48, 24, V3.card);
      ctx.fillStyle = V3.ink; ctx.beginPath(); ctx.moveTo(bx + 19, by + 13); ctx.lineTo(bx + 35, by + 24); ctx.lineTo(bx + 19, by + 35); ctx.closePath(); ctx.fill();
      api.control({ x: f.x, y: f.y, w: f.w, h: f.h, id: 'video-play' });
      api.screen.anchor('video-play', { x: bx, y: by, w: 48, h: 48 });
    }
  }
  // the player's own bottom bar: the time and the progress (no second button, no second label)
  const by = f.y + f.h;
  px(ctx, f.x, by, f.w, 24, V3.ink);
  const played = stage === 'playing' ? Math.min(CLIP_LOOP_SECONDS, t) : stage === 'ended' ? CLIP_LOOP_SECONDS : 0;
  ctx.font = monoFor(10); ctx.fillStyle = WEB.card;
  const lab = `${time(played)} / ${CLIP_WORDS.length}`;
  ctx.fillText(lab, f.x + 8, by + 7);
  const lw = Math.ceil(ctx.measureText(lab).width) + 18, gx = f.x + lw, gw = f.w - lw - 10;
  px(ctx, gx, by + 11, gw, 2, CHROME.ink);
  px(ctx, gx, by + 11, Math.round(gw * played / CLIP_LOOP_SECONDS), 2, AI.mark);
}
function fit(ctx: CanvasRenderingContext2D, text: string, w: number): string {
  if (ctx.measureText(text).width <= w) return text;
  let n = text.length; while (n > 0 && ctx.measureText(`${text.slice(0, n).trimEnd()}…`).width > w) n--;
  return `${text.slice(0, n).trimEnd()}…`;
}

registerPage('added', drawAdded);
registerPage('review', drawReview);
registerPage('console', (ctx, r) => drawConsole(ctx, r));
registerPage('video', drawVideo);

// ── THE ACT ─────────────────────────────────────────────────────────────────
export interface ActTwoHooks {
  /** Open it: the console comes off the bed to her (heldDevice's grammar); false if it could not come */
  bringConsole(): boolean;
  /** the console is in her hands (the story waits until it is set down: one voice at a time) */
  consoleHeld(): boolean;
}
/** where a review jump may begin (5 the arrival, 6 the review, 7 the video, 8 her answer) */
export type ActTwoFrom = 5 | 6 | 7 | 8;

/** Act II's own presses: none of its pages handles a press itself (the chips and page buttons are the script's) */
export function wireActTwo(_c: E4Acts): void { /* the screen handles Memory notes and Newest itself (lScreen.ts) */ }

/** the AI says a line in Second Thoughts' voice (the same voice, slower: its clips are rendered at their own `speed`) */
function* says(c: E4Acts, line: Line, hold = true): Beat { yield* c.say(line, { hold }); }

/** Act II, from a beat (5 in play: after Act I's yellow card; a review jump may begin later) */
export function* actTwo(c: E4Acts, hooks: ActTwoHooks, choice: 'add' | 'notnow', from: ActTwoFrom = 5): Beat {
  if (from > 5) { arrive(c, choice); c.screen.setAiWidth(SCREEN.aiWidth.act2); }
  if (from <= 5) yield* beat5(c, choice);
  if (from <= 6) yield* beat6(c, hooks);
  if (from <= 7) yield* beat7(c);
  yield* beat8(c);
}

/** it arrives: the name, the pane, the voice's switch unchanged, every ✦ locked (what a jump lays in at once) */
function arrive(c: E4Acts, choice: 'add' | 'notnow'): void {
  const s = c.screen;
  markE4('bot');
  c.file('a2:added', 'answered', fillIn(W.added, { how: choice === 'add' ? W.addedBy : W.addedFor }));
  s.name = SCREEN.stName; s.sub = SCREEN.stSub;
  s.originalStage = 'locked';
}

function* beat5(c: E4Acts, choice: 'add' | 'notnow'): Beat {
  const s = c.screen;
  c.beat = 'bot';
  if (choice === 'notnow') {
    // Not now worked once (its pill is gone). At her next press — not the one that opens a story she is reading — or after
    //   about twenty seconds, it adds itself anyway.
    const t0 = c.t;
    c.clearPress();
    c.path = ['st-add'];
    let added = false;
    yield () => {
      if (c.take(['st-add'])) { added = true; return true; }
      const pressed = c.idle < c.t - t0 - 0.05;
      return (pressed && s.page?.kind !== 'story') || c.t - t0 >= B5.notNowWait;
    };
    c.path = [];
    if (added) choice = 'add';
    if (choice === 'add') playOnce('ui_press.mp3');
  }
  s.visitorBack = false;
  // ── it arrives: no installer, no bar (his "a much more automatic change") ──
  arrive(c, choice);
  s.note(choice === 'add' ? B5.added : B5.addedForYou);
  s.open({ kind: 'added', title: SCREEN.stName });
  s.setAiWidth(SCREEN.aiWidth.act2, 2.4);
  playOnce('agent_2026.mp3');
  yield 2.8;
  // its first words, as built — in L's voice, slower
  yield* says(c, B5.here);
  yield* says(c, B5.together);
}

function* beat6(c: E4Acts, hooks: ActTwoHooks): Beat {
  const s = c.screen;
  c.beat = 'review';
  const R = B6.review;
  const review: Page = { kind: 'review', title: R.title, shown: 0, overall: false, actions: false };
  s.open(review);
  yield 1.2;
  for (let i = 1; i <= R.rows.length; i++) { review.shown = i; s.touch(); yield Math.max(1.4, readHold([R.rows[i - 1].k, R.rows[i - 1].v, R.rows[i - 1].sub ?? '']) * 0.5); }
  yield 0.8;
  review.overall = true; s.touch();
  yield readHold(R.overall) * 0.8;
  yield* says(c, B6.carry);
  review.actions = true; s.touch();
  c.clearPress();
  c.path = ['rv-each', 'rv-all'];
  let got: string | null = null;
  yield () => (got = c.take(['rv-each', 'rv-all'])) !== null;
  c.path = [];
  review.chosen = got; s.touch();
  const each = got === 'rv-each';
  s.her(each ? R.each : R.all);
  playOnce('ui_press.mp3');
  c.file('a2:review', 'answered', fillIn(W.review, { answer: each ? R.each : R.all }));
  yield 0.6;
  yield* says(c, each ? B6.replies.each : B6.replies.all);

  // ── "Second Thoughts is using your computer." Slowly: one act at a time, each reported in the chat ──
  c.beat = 'takeover';
  s.banner = { text: AGENT.banner, control: AGENT.control };
  s.cursorLabel = AGENT.pointer;
  s.pagePressable = false;
  playOnce('agent_2026.mp3');
  yield 1.4;
  const A = B6.acts;
  const kettle: Page = { kind: 'kettle', title: SCREEN.apps.kettle, read: ['lot', 'mum', 'dad', 'junie'] as Who[], muted: [] as Who[], told: true, menu: null };
  s.open(kettle);
  yield 1.6;
  /** its cursor goes to a row, opens the row's menu, and presses Mute — slowly, in front of her */
  const mute = function* (who: Who): Beat {
    yield* c.cursorTo(`row-${who}`, 1.6);
    yield 0.5;
    kettle.menu = who; s.touch(); playOnce('ui_press.mp3');
    yield 1.0;
    yield* c.cursorTo('menu-mute', 0.9);
    yield 0.3;
    yield* c.click();
    kettle.menu = null; (kettle.muted as Who[]).push(who); s.touch();
    away(c);
    yield 0.8;
  };
  // 1 · Junie
  yield* mute('junie');
  c.file('a2:junie', 'done', W.junie);
  yield* says(c, A.junie, false);
  // Undo works once
  c.clearPress();
  s.setChips([{ id: 'a2-undo', label: A.undo, kind: 'quiet' }]);
  const u0 = c.t;
  let undone = false;
  yield () => { if (c.take(['a2-undo'])) { undone = true; return true; } return c.t - u0 >= B6.undoSeconds; };
  s.clearChips();
  if (undone) {
    s.her(A.undo); playOnce('ui_press.mp3');
    kettle.muted = (kettle.muted as Who[]).filter((w) => w !== 'junie'); s.touch();
    c.file('a2:undo', 'answered', W.undo);
    yield 0.8;
    yield* says(c, A.undone);
    s.memory(B6.memoryUndo);
    yield 2.4;
    // …and Junie is muted again, with no Undo (26-17: the contradiction, designed)
    yield* mute('junie');
    yield* says(c, A.again);
  } else {
    s.memory(B6.memoryKept);
    yield 2.4;
  }
  // 2 · the lot
  yield* mute('lot');
  c.file('a2:lot', 'done', W.lot);
  yield* says(c, A.lot);
  // 3 · Dad, answered as her
  yield* c.cursorTo('row-dad', 1.6);
  yield* c.click();
  const thread: Page = { kind: 'thread', title: SCREEN.apps.kettle, who: 'dad', told: true };
  s.open(thread, true);
  away(c);
  yield 2.2;   // his message as L softened it, and its ✦ locked under it
  const reply = A.dadReply, t0 = c.t;
  let shownTo = -1;
  yield () => {
    const step = Math.floor((c.t - t0) * ANIM_HZ), k = Math.min(reply.length, Math.floor(step / ANIM_HZ * 9));
    if (k !== shownTo) { shownTo = k; thread.typed = reply.slice(0, k); s.touch(); }
    return k >= reply.length;
  };
  yield 0.5;
  thread.typed = ''; thread.sent = reply; thread.sentAt = A.dadAt ?? ''; kettle.sent = reply; s.touch();
  playOnce('ui_press.mp3');
  c.file('a2:dad', 'done', W.dad);
  yield 1.0;
  yield* says(c, A.dad);
  yield* c.cursorTo('page-back', 0.9);
  yield* c.click();
  s.back();
  away(c);
  yield 0.8;
  // 4 · the console: lit on the bed; Open it brings it to her (held-device grammar); leaving it is fine
  consoleSession.light();
  consoleStill = null;
  s.open({ kind: 'console', title: B6.consolePage.title });
  c.file('a2:console', 'done', W.console);
  yield 0.8;
  yield* says(c, A.console, false);
  c.clearPress();
  s.setChips([{ id: 'a2-open', label: A.open, kind: 'primary' }]);
  const o0 = c.t;
  let opened = false;
  yield () => { if (c.take(['a2-open'])) { opened = true; return true; } return c.t - o0 >= B6.consoleSeconds; };
  s.clearChips();
  if (opened) {
    s.her(A.open);
    playOnce('ui_press.mp3');
    if (hooks.bringConsole()) c.file('a2:console-open', 'opened', W.consoleOpen);
    yield 0.6;
    yield* says(c, A.opened);
    // in her hands, it is played out first: the story waits until she sets it down
    yield () => !hooks.consoleHeld();
    yield 0.6;
  }
  // the takeover ends: the banner goes, her presses are hers again
  s.banner = null; s.cursorLabel = null; s.hideCursor(); s.pagePressable = true;
  c.file('a2:takeover', 'done', W.takeover);
  yield 0.6;
  yield* says(c, A.done);
}

function* beat7(c: E4Acts): Beat {
  const s = c.screen;
  c.beat = 'video';
  yield* says(c, B7.made);
  const v: Page = { kind: 'video', title: SCREEN.apps.video ?? '', stage: 'making', t: 0 };
  s.open(v);
  // made in front of her: the wheel turns and her week is pulled in, card by card (redrawn on the animation clock only)
  const m0 = c.t;
  let step = -1;
  yield () => {
    const t = c.t - m0, k = Math.floor(t * ANIM_HZ);
    if (k !== step) { step = k; v.t = k / ANIM_HZ; s.touch(); }
    return t >= MAKING;
  };
  v.stage = 'ready'; v.t = 0; s.touch();
  playOnce('step_done_2026.mp3');
  // it plays when she presses it (the guide offers once if she stalls)
  c.clearPress();
  c.path = ['video-play'];
  yield () => c.take(['video-play']) !== null;
  c.path = [];
  playOnce('ui_press.mp3');
  // THE GREAT BECOMING, whole: 58 s (his "Do not cut"); the AI's pane is silent while the film has the floor
  v.stage = 'playing'; s.touch();
  c.floor = true;
  startClipSound();
  const p0 = c.t;
  step = -1;
  yield () => {
    const t = c.t - p0, k = Math.floor(t * ANIM_HZ);
    if (k !== step) { step = k; v.t = k / ANIM_HZ; s.touch(); }
    return t >= CLIP_LOOP_SECONDS;
  };
  stopClipSound();
  c.floor = false;
  v.stage = 'ended'; s.touch();
  c.file('a2:video', 'done', W.video);
  yield 1.4;
  yield* says(c, B7.after);
  s.memory(B7.memory);
  yield 1.8;
}

function* beat8(c: E4Acts): Beat {
  const s = c.screen;
  c.beat = 'answer';
  s.composer = B8.composer; s.composerText = ''; s.touch();
  yield 0.4;
  // ONE chip: her words
  c.clearPress();
  s.setChips([{ id: 'a2-answer', label: HER_WORDS, kind: 'primary' }]);
  c.path = ['a2-answer'];
  yield () => c.take(['a2-answer']) !== null;
  c.path = [];
  s.clearChips();
  playOnce('ui_press.mp3');
  // her own words on the glass: nobody else speaks (the guide, the AI) while they are typed, sent and taken
  c.feltNow = true;
  const text = HER_WORDS;
  // typed in (there is no keyboard: the press types them), at the screen's animation steps
  s.composerCaret = true;
  const t0 = c.t;
  let n = -1;
  yield () => {
    const k = Math.min(text.length, Math.floor(Math.floor((c.t - t0) * ANIM_HZ) / ANIM_HZ * B8.typeCps));
    if (k !== n) { n = k; s.composerText = text.slice(0, k); s.touch(); }
    return k >= text.length;
  };
  yield 0.5;
  // sent: her bubble
  s.composerText = ''; s.composerCaret = false;
  s.her(text);
  const row: ChatRow = s.rows[s.rows.length - 1];
  playOnce('ui_press.mp3');
  yield 1.5;
  // deleted in front of her, letter by letter
  const t1 = c.t;
  let m = -1;
  yield () => {
    const k = Math.max(0, text.length - Math.floor(Math.floor((c.t - t1) * ANIM_HZ) / ANIM_HZ * B8.deleteCps));
    if (k !== m) { m = k; s.setRowText(row, text.slice(0, k)); }
    return k <= 0;
  };
  // in their place, small, the system's line: a row of the conversation, never left in the box (26-15)
  s.unsend(row, B8.unsentLine);
  s.composer = null; s.touch();
  c.file('a2:answer', 'residue', W.answer);
  c.feltNow = false;
  yield readHold(B8.unsentLine) + 0.4;
  s.memory(B8.memory);
  yield 1.4;
  // the turn of weaponised care: her correction is read as proof of her "need"
  yield* says(c, B8.hear);
  yield* says(c, B8.found);
  s.booked(B8.booked);
  c.file('a2:booked', 'done', W.booked);
  playOnce('step_done_2026.mp3');
  yield 2.4;
}
