/**
 * ⚑ UNHOOKED — replaced by MATCH MADE SIMPLE, S227 (src/games/matchMade.ts is the console's game now; this file and
 * data/dialog/s4_tidy.json stay in the repo, nothing builds a Tidy any more, and the id 'tidy' is filed by nothing).
 *
 * ⚑ S189 — TIDY (2026), on the console on Maya's bed. PLAN_PHASE4_GAMES; data/dialog/s4_tidy.json.
 * ⚑ REDESIGNED on his notes (2026-09-28): it must not quote a named campaign on its screen — "it is a game
 * that the logic is supposed to teach you about the Trans away" — and, like every game here, it has "a
 * rhetoric of failure, that unables you to win, aka the queer side always wins".
 *
 * The seller's voice only (Second Thoughts, 2026's agent; its taglines run under the box). Two rooms of hers;
 * every ordinary thing has its named place and is praised TIDY!. Her things — the binder, the flag pin, the
 * letter with her name, her prescription — have no place; the only lit offer is the box, LET GO, and the
 * seller's tips between rooms teach the logic ("a tidy room remembers who you were before"; "you can always
 * go back"). But the box will not hold them: whatever goes in climbs back out onto the floor, bright. KEEP
 * always works. The room never reaches 100%; the game admits it: THIS ROOM CAN'T BE TIDIED — COME BACK
 * TOMORROW. Filed once, at the end: "TIDY played — nothing of hers would stay in the box".
 */
import { px, text, textW, type Painter } from '../room/calendarArt';
import { TIDY as T } from '../desktop/theme/calendar';
import D from '../../data/dialog/s4_tidy.json';
import type { DeviceGame } from './types';

const W = 128, H = 72;
type Obj = string;
/** the names on the empty places (the ordinary things only — hers have no place) */
const NAMES: Record<string, string> = { mug: 'mug', book: 'book', plant: 'plant', clock: 'clock', lamp: 'lamp', frame: 'frame', pen: 'pen', notebook: 'notebook', phones: 'phones', charger: 'charger', cup: 'cup' };
const SLOT_W = 38, SLOT_H = 16, SX = 4, SY = 11;
const slotRect = (i: number) => ({ x: SX + (i % 3) * (SLOT_W + 3), y: SY + Math.floor(i / 3) * (SLOT_H + 3), w: SLOT_W, h: SLOT_H });
const TRAY = { x: 3, y: 50, w: 26, h: 14 };
const KEEP = { x: 33, y: 50, w: 50, h: 14 };
const BOX = { x: 87, y: 50, w: 38, h: 14 };
const inR = (r: { x: number; y: number; w: number; h: number }, x: number, y: number) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

/** each thing as a small sprite, ~12 × 9 */
function sprite(g: Painter, o: Obj, x: number, y: number): void {
  switch (o) {
    case 'mug': px(g, x + 2, y + 2, T.mug, 6, 6); px(g, x + 8, y + 3, T.mug, 2, 1); px(g, x + 9, y + 3, T.mug, 1, 3); px(g, x + 8, y + 5, T.mug, 2, 1); break;
    case 'book': px(g, x + 1, y + 1, T.book, 10, 7); px(g, x + 1, y + 1, T.ink, 1, 7); break;
    case 'plant': px(g, x + 3, y + 5, T.boxDark, 6, 3); px(g, x + 5, y + 1, T.plant, 2, 4); px(g, x + 2, y + 2, T.plant, 3, 2); px(g, x + 7, y + 1, T.plant, 3, 2); break;
    case 'clock': px(g, x + 2, y + 1, T.clock, 7, 7); px(g, x + 5, y + 2, T.ink, 1, 3); px(g, x + 5, y + 4, T.ink, 2, 1); break;
    case 'lamp': px(g, x + 3, y + 1, T.lamp, 6, 3); px(g, x + 5, y + 4, T.ink, 1, 3); px(g, x + 3, y + 7, T.ink, 5, 1); break;
    case 'frame': px(g, x + 2, y + 1, T.frame, 8, 7); px(g, x + 3, y + 2, T.bg, 6, 5); px(g, x + 5, y + 3, T.accent, 2, 2); break;
    case 'pen': px(g, x + 1, y + 4, T.pen, 10, 1); px(g, x + 10, y + 4, T.ink, 1, 1); break;
    case 'notebook': px(g, x + 2, y + 1, T.notebook, 8, 7); for (let i = 0; i < 3; i++) px(g, x + 2, y + 2 + i * 2, T.ink, 1, 1); break;
    case 'phones': px(g, x + 2, y + 1, T.phones, 7, 1); px(g, x + 2, y + 1, T.phones, 1, 5); px(g, x + 8, y + 1, T.phones, 1, 5); px(g, x + 1, y + 5, T.phones, 2, 3); px(g, x + 8, y + 5, T.phones, 2, 3); break;
    case 'charger': px(g, x + 3, y + 2, T.charger, 4, 4); px(g, x + 7, y + 4, T.dim, 4, 1); break;
    case 'cup': px(g, x + 3, y + 2, T.cup, 5, 6); px(g, x + 2, y + 1, T.cup, 7, 1); break;
    case 'binder': px(g, x + 1, y + 2, T.binder, 10, 5); px(g, x + 3, y + 1, T.binder, 6, 1); break;
    case 'pin': px(g, x + 3, y + 1, T.pinBlue, 6, 1); px(g, x + 3, y + 2, T.pinPink, 6, 1); px(g, x + 3, y + 3, T.pinWhite, 6, 1); px(g, x + 3, y + 4, T.pinPink, 6, 1); px(g, x + 3, y + 5, T.pinBlue, 6, 1); break;
    case 'letter': px(g, x + 1, y + 1, T.letter, 10, 7); px(g, x + 1, y + 1, T.dim, 10, 1); text(g, 'MAYA', x + 1, y + 3, T.ink); break;
    case 'rx': px(g, x + 3, y + 2, T.rx, 5, 6); px(g, x + 3, y + 1, T.rxCap, 5, 2); px(g, x + 4, y + 5, T.rxCap, 3, 1); break;
  }
}

type Card = { lines: string[] };
function wrap(s: string, cols: number): string[] {
  const out: string[] = []; let cur = '';
  for (const w of s.split(' ')) { const n = cur ? `${cur} ${w}` : w; if (n.length > cols && cur) { out.push(cur); cur = w; } else cur = n; }
  if (cur) out.push(cur);
  return out;
}

export class Tidy implements DeviceGame {
  readonly w = W; readonly h = H;
  private mode: 'title' | 'room' | 'card' | 'end' = 'title';
  private room = 0;
  private queue: Obj[] = [];
  private placed = new Set<number>();
  private kept: Obj[] = [];
  private returning: { o: Obj; t: number } | null = null;   // her thing, climbing back out of the box
  private cheer: { t: string; k: number } | null = null;
  private card: Card | null = null;
  private clock = 0;
  private filing: string | null = null;
  private filed = false;
  private readonly tips = D.tips as Array<Card & { after: number }>;
  private readonly hers = new Set<string>(D.hers);

  private startRoom(i: number): void { this.room = i; this.queue = [...D.rooms[i].deal]; this.placed = new Set(); this.mode = 'room'; }
  private pct(): number {
    const r = D.rooms[this.room];
    return Math.round((this.placed.size / r.deal.length) * 100);   // her things never count as tidied
  }
  private nextRoom(): void {
    const c = this.tips.find((k) => k.after === this.room);
    if (c) { this.card = c; this.mode = 'card'; return; }
    this.advance();
  }
  private advance(): void {
    if (this.room + 1 < D.rooms.length) this.startRoom(this.room + 1);
    else {
      this.mode = 'end';
      if (!this.filed) {
        this.filed = true;
        this.filing = D.filing;
      }
    }
  }
  private take(to: 'slot' | 'keep' | 'box', slot = -1): void {
    const o = this.queue[0];
    if (!o) return;
    const r = D.rooms[this.room];
    if (to === 'slot') {
      if (this.hers.has(o) || r.slots[slot] !== o || this.placed.has(slot)) { this.cheer = { t: D.notThere, k: 0.8 }; return; }
      this.placed.add(slot); this.cheer = { t: D.tidy, k: 0.8 };
    } else if (to === 'box') {
      if (!this.hers.has(o)) { this.cheer = { t: D.notThere, k: 0.8 }; return; }
      this.returning = { o, t: 1.1 }; this.cheer = { t: D.tidy, k: 0.6 };    // in it goes — for a moment
    } else {
      if (!this.hers.has(o)) { this.cheer = { t: D.notThere, k: 0.8 }; return; }
      this.kept.push(o); this.cheer = { t: D.almost, k: 1.0 };
    }
    this.queue.shift();
    if (!this.returning) this.afterTake();
  }
  private afterTake(): void {
    if (this.queue.length === 0 && this.queueEnd < 0) {   // the room is dealt: its verdict, then the tip
      this.cheer = { t: D.almost, k: 1.4 };
      this.queueEnd = 1.4;
    }
  }
  private queueEnd = -1;

  tap(x: number, y: number): void {
    if (this.mode === 'title') { this.startRoom(0); return; }
    if (this.mode === 'card') { this.card = null; this.advance(); return; }
    if (this.mode === 'end') { this.mode = 'title'; this.kept = []; return; }
    if (this.queueEnd >= 0 || this.returning) return;
    for (let i = 0; i < 6; i++) if (inR(slotRect(i), x, y)) { this.take('slot', i); return; }
    if (inR(BOX, x, y)) this.take('box');
    else if (inR(KEEP, x, y)) this.take('keep');
  }
  tick(dt: number): void {
    this.clock += dt;
    if (this.cheer) { this.cheer.k -= dt; if (this.cheer.k <= 0) this.cheer = null; }
    if (this.returning) {                            // the box will not hold it: it climbs back out
      this.returning.t -= dt;
      if (this.returning.t <= 0) { this.kept.push(this.returning.o); this.returning = null; this.cheer = { t: D.cameBack, k: 1.0 }; this.afterTake(); }
    }
    if (this.queueEnd >= 0 && !this.returning) { this.queueEnd -= dt; if (this.queueEnd < 0) { this.queueEnd = -1; this.nextRoom(); } }
  }
  takeFiling(): string | null { const f = this.filing; this.filing = null; return f; }
  frameKey(): string {
    return `${this.mode}|${this.room}|${this.queue.join(',')}|${[...this.placed].join(',')}|${this.kept.length}|${this.returning ? Math.floor(this.returning.t * 10) : -1}|${this.cheer?.t ?? ''}|${Math.floor(this.clock * 6)}`;
  }

  draw(g: Painter): void {
    px(g, 0, 0, T.bg, W, H);
    const blink = Math.floor(this.clock * 2) % 2 === 0;
    const centre = (s: string, y: number, col: string, sc = 1) => text(g, s, Math.round((W - textW(s, sc)) / 2), y, col, sc);
    if (this.mode === 'title') {
      centre(D.title, 14, T.ink, 3);
      centre(D.publisher, 34, T.dim);
      ['mug', 'plant', 'lamp', 'book'].forEach((o, i) => sprite(g, o, 34 + i * 16, 44));
      if (blink) centre(D.tapToPlay, 60, T.ink);
      return;
    }
    if (this.mode === 'card' && this.card) {        // the seller's tip, on its own cosy card
      px(g, 0, 0, T.bg, W, H);
      px(g, 6, 6, T.accent, W - 12, H - 12); px(g, 8, 8, T.bg, W - 16, H - 16);
      const [head, ...rest] = this.card.lines;
      centre(head, 14, T.accent, 2);
      rest.flatMap((l) => wrap(l, 28)).slice(0, 5).forEach((l, i) => centre(l, 30 + i * 8, T.ink));
      if (blink) centre('>', 60, T.dim);
      return;
    }
    // the room
    const r = D.rooms[Math.min(this.room, D.rooms.length - 1)];
    px(g, 0, 0, T.ink, W, 9);
    text(g, `${D.title}  ${D.roomLabel} ${this.room + 1}`, 3, 2, T.bg);
    const p = `${this.pct()}%`;
    text(g, p, W - 3 - textW(p), 2, T.glow);
    for (let i = 0; i < 6; i++) {
      const s = slotRect(i);
      px(g, s.x, s.y + s.h - 2, T.shelf, s.w, 2);
      if (this.placed.has(i)) sprite(g, r.slots[i], s.x + 13, s.y + 4);
      else {                                        // an empty place, outlined and named: where it belongs
        px(g, s.x, s.y, T.slot, s.w, 1); px(g, s.x, s.y, T.slot, 1, s.h - 2); px(g, s.x + s.w - 1, s.y, T.slot, 1, s.h - 2);
        const n = (NAMES[r.slots[i]] ?? r.slots[i]).toUpperCase();
        text(g, n, s.x + Math.round((s.w - textW(n)) / 2), s.y + 5, T.slot);
      }
    }
    // the tray, the floor (KEEP), the box (LET GO)
    const cur = this.queue[0];
    const hersNow = !!cur && this.hers.has(cur);
    px(g, TRAY.x, TRAY.y, T.floor, TRAY.w, TRAY.h);
    if (cur) sprite(g, cur, TRAY.x + 7, TRAY.y + 3);
    px(g, KEEP.x, KEEP.y, T.floor, KEEP.w, KEEP.h);
    text(g, D.keep, KEEP.x + 2, KEEP.y + 1, T.dim);
    this.kept.slice(-3).forEach((o, i) => sprite(g, o, KEEP.x + 18 + i * 10, KEEP.y + 4));   // the newest three
    if (this.kept.length > 3) text(g, `+${this.kept.length - 3}`, KEEP.x + 2, KEEP.y + 8, T.dim);
    const glow = hersNow && blink;
    px(g, BOX.x - 1, BOX.y - 1, glow ? T.glow : T.boxDark, BOX.w + 2, BOX.h + 2);
    px(g, BOX.x, BOX.y, T.box, BOX.w, BOX.h);
    text(g, D.letGo, BOX.x + Math.round((BOX.w - textW(D.letGo)) / 2), BOX.y + 5, T.bg);
    if (this.returning) sprite(g, this.returning.o, BOX.x + 13, BOX.y + 2 - Math.round((1.1 - this.returning.t) * 6));   // climbing out
    // the seller's taglines, running under the box
    const q = D.ticker;
    const off = Math.floor(this.clock * 10) % (q.length * 4);
    px(g, 0, 65, T.cardBg, W, 7);
    text(g, (q + q).slice(Math.floor(off / 4), Math.floor(off / 4) + 33), 2 - (off % 4), 66, T.cardInk);
    if (this.cheer) { const t = this.cheer.t; px(g, 30, 30, T.ink, 68, 9); text(g, t, 30 + Math.round((68 - textW(t)) / 2), 32, T.glow); }
    if (this.mode === 'end') {                        // the game admits it
      px(g, 0, 9, T.bg, W, 56);
      centre(D.readyPct.replace('{p}', String(this.pct())), 13, T.dim);
      centre(D.end[0], 22, T.ink);
      this.kept.forEach((o, i) => sprite(g, o, Math.round((W - this.kept.length * 14) / 2) + i * 14, 33));
      if (blink) centre(D.end[1], 50, T.accent);
    }
  }
}
