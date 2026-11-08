import { ledger, ledgerGeneration } from '../../state/ledger';
import { e4Has } from '../../narrative/e4Beats';
/**
 * ⚑ S328 — KETTLE, A WINDOW ON HER MONITOR (T03, his headset test of 8 Nov: "I think we're just gonna have to remove
 * the laptop, and this is all has to be integrated"). It was the laptop's lid (S321); the laptop is gone from 2026.
 * Kettle is now the window beside the browser on the one screen, the way 2016 shows Vera's phone as a window beside
 * the platform. People live here (the lot, Mum, Dad, Junie); the system lives in the browser.
 *
 * ⚑ TIME BY SCROLL, NOT BUTTONS (his: "We don't need a button to press through time… it should all be in the
 * scroll"). Every thread is ONE scrolling thread, dated by its separators: Mum's years 2023 → today, Dad's September
 * and today, Junie's Tuesday and today, the lot's morning and tonight. Wheel, drag, thumbstick and touch scroll it
 * (`scrollBy`); the scroll bar's ▲ ▼ are scroll controls for a hand or a click, never a "next year" button. If she
 * does not scroll, Mum's thread drifts on by itself (`drift`), so no beat waits on her finding the gesture.
 *
 * FELT (CLAUDE.md register law): while a thread is open there is no glow, no Lamby, no system voice (`felt`). No free
 * text, no reply box: her one reply to the lot and to Junie is a chip.
 *
 * This file is a VIEW with state; `E4Browser` owns the story and decides when things arrive. Its rects are kept in
 * `targets` (not `hits`: the walker's collector must not project them in Kettle's own coordinates); the browser
 * copies them, moved into the monitor's coordinates, into its own `hits`.
 */
import V3 from '../../../data/dialog/s4_v3.json';
import { ERA4, KETTLE, roundRect, pill, photograph, PLACE } from '../theme/era4';
import { px, setFont, wrapText } from '../theme/chrome';
import { monoFor } from '../theme/fonts';
import { drawGoalPicture } from './goalPicture';

export type ChatId = 'house' | 'mum' | 'dad' | 'junie';
export interface MRect { x: number; y: number; w: number; h: number; id: string }
interface Msg { who?: string; text?: string; sys?: boolean; mine?: boolean; link?: string; photo?: string; sep?: string; draft?: boolean; year?: string }

const M = V3.messenger;
type LinkId = keyof typeof M.mum.links;
const HEAD_H = 20;
const BAR_H = 30;
/** the scroll bar's width; its ▲ ▼ are square */
const SB = 15;
/** one ▲ / ▼ press scrolls this share of the thread's height */
const PAGE = 0.7;
/** Mum's thread drifts on by itself after this long without a scroll, at this speed (logical px a second) */
const DRIFT_AFTER = 9;
const DRIFT_SPEED = 26;

export class E4Messenger {
  view: 'list' | ChatId = 'list';
  /** the chat wallpaper: hers until the update restores "defaults", then the goal picture */
  wallpaper: 'hers' | 'goal' = 'hers';
  /** what the story waits on next — it names the list's one primary button */
  want: ChatId | 'link' | null = null;
  houseShown = 0;
  houseHeart = false;
  houseOpenedBirthday = false;
  houseLeft = 0;
  houseOpenedLeft = false;
  /** Mum's lines today that have arrived (of `M.mum.today`), and her unsent draft */
  mumToday = 0;
  mumDraft = false;
  /** ⚑ S328 — she has scrolled down to today in Mum's thread (was `mumPage`, one press per year) */
  mumAtToday = false;
  mumOpened = false;
  dadIn = false;
  dadRead = false;
  linkOpened = false;
  junieOpenable = false;
  junieOpened = false;
  junieUnmuted = false;
  junieReplied = false;
  junieX = false;
  /** the bot's "mute 2 more", if she pressed it: the lot goes grey on the list */
  houseMuted = false;
  eveningShown = 0;
  eveningRead = 0;
  private eveningT = 0;
  private generation = ledgerGeneration;
  private returned = false;

  // ── the scroll ──────────────────────────────────────────────────────────
  /** per thread: how far the thread is scrolled UP from its latest line (0 = the bottom) */
  private scrollOf: Record<ChatId, number> = { house: 0, mum: 0, dad: 0, junie: 0 };
  /** the furthest it can go, from the last draw */
  private maxScroll = 0;
  /** open at the oldest line the next time it is drawn (Mum's thread, the first time) */
  private toTop = false;
  private idleT = 0;
  /** bumps when the scroll moves, so the monitor re-uploads */
  scrollV = 0;

  /** Friends keep writing; no sound, glow, filing or forced focus. Memory is wiped with the ledger. */
  updateEvening(dt: number): boolean {
    if (this.generation !== ledgerGeneration) {
      this.generation = ledgerGeneration; this.eveningShown = this.eveningRead = this.eveningT = 0;
      this.returned = false; this.houseMuted = false; return true;
    }
    if (!ledger.e4Space.some(e => e.id === 'v3:mute')) return false;
    if (e4Has('terminated') && !this.returned) { this.returned = true; this.view = 'list'; this.want = null; }
    const before = this.eveningShown;
    this.eveningT += dt;
    this.eveningShown = e4Has('terminated') ? M.house.evening.length : Math.min(M.house.evening.length, Math.floor(this.eveningT / 7));
    if (this.view === 'house' && !this.houseMuted && this.eveningShown > before) this.eveningRead = this.eveningShown;
    return before !== this.eveningShown;
  }
  /** Also used by the stopped device: reading friends never re-enters the system's browser. */
  pressEvening(id: string): void {
    if (id === 'back-chats') this.view = 'list';
    for (const chat of ['mum', 'dad', 'junie'] as const) if (id === `row-${chat}` || id === `chat-${chat}`) this.view = chat;
    if (id === 'row-house' || id === 'chat-house') { this.view = 'house'; this.eveningRead = this.eveningShown; this.scrollOf.house = 0; }
  }
  /** the window's controls this frame (see the header: not `hits`) */
  targets: MRect[] = [];
  /** a clock for the draft's caret */
  t = 0;

  /** a thread is open: felt — nothing of the system speaks */
  get felt(): boolean { return this.view !== 'list'; }

  /** seconds left on the lock screen (the update shows its new wallpaper there first) */
  lockT = 0;

  /** ⚑ the story opens a thread: Mum's opens at 2023 the first time; every other at its latest line */
  opened(c: ChatId, top = false): void {
    this.view = c;
    this.toTop = top;
    if (!top) this.scrollOf[c] = 0;
    this.idleT = 0;
  }

  /** wheel, drag, thumbstick, touch: dy > 0 reads on (later lines), dy < 0 goes back. True if it moved. */
  scrollBy(dy: number): boolean {
    if (this.view === 'list' || this.lockT > 0) return false;
    this.idleT = 0;
    const was = this.scrollOf[this.view];
    this.scrollOf[this.view] = Math.max(0, Math.min(this.maxScroll, was - dy));
    if (this.scrollOf[this.view] === was) return false;
    this.scrollV++;
    return true;
  }
  get canScroll(): boolean { return this.view !== 'list' && this.maxScroll > 0; }

  /** Mum's thread drifts toward today if she has not scrolled for a while (the piece takes her there) */
  drift(dt: number): boolean {
    // ⚑ S334 — RETIRED (his 8 Nov: "don't understand the need to have that action; we open the messages on the last
    //   read, and there is a need to scroll down to get to the latest"): a thread never moves by itself. It opens where
    //   she last read (first open: the oldest unread line) and she scrolls, or presses ▼, down to the newest.
    if (this.view !== 'mum' || this.mumAtToday || this.lockT > 0 || DRIFT_AFTER > 0) { this.idleT = 0; return false; }
    this.idleT += dt;
    if (this.idleT < DRIFT_AFTER) return false;
    const was = this.scrollOf.mum;
    this.scrollOf.mum = Math.max(0, was - DRIFT_SPEED * dt);
    if (Math.floor(was) === Math.floor(this.scrollOf.mum)) return false;
    this.scrollV++;
    return true;
  }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number): MRect[] {
    this.targets = [];
    px(ctx, 0, 0, W, H, KETTLE.ground);
    if (this.lockT > 0) { this.drawLock(ctx, W, H); return this.targets; }
    if (this.view === 'list') this.drawList(ctx, W, H);
    else this.drawThread(ctx, W, H, this.view);
    return this.targets;
  }

  press(x: number, y: number): string | null {
    const h = this.targets.find((r) => x >= r.x - 2 && x <= r.x + r.w + 2 && y >= r.y - 2 && y <= r.y + r.h + 2);
    if (!h) return null;
    if (h.id === 'scroll-up' || h.id === 'scroll-down') {
      this.scrollBy((h.id === 'scroll-down' ? 1 : -1) * Math.max(40, this.viewH * PAGE));
      return h.id;
    }
    if (this.eveningShown > 0) this.pressEvening(h.id);
    return h.id;
  }
  private viewH = 100;

  // ── the list ──────────────────────────────────────────────────────────────
  private header(ctx: CanvasRenderingContext2D, W: number, title: string, right: string): void {
    px(ctx, 0, 0, W, HEAD_H, KETTLE.head);
    setFont(ctx, 11); ctx.fillStyle = KETTLE.headInk;
    ctx.fillText(title, 7, 4);
    ctx.font = monoFor(9);
    const rw = Math.ceil(ctx.measureText(right).width);
    ctx.fillText(right, W - rw - 7, 6);
  }

  private avatar(ctx: CanvasRenderingContext2D, x: number, y: number, d: number, id: ChatId): void {
    const fill = id === 'mum' ? KETTLE.avatarMum : id === 'dad' ? KETTLE.avatarDad : id === 'house' ? KETTLE.avatarHouse : KETTLE.avatarJunie;
    roundRect(ctx, x, y, d, d, Math.floor(d / 2), fill);
    setFont(ctx, Math.max(8, Math.round(d * 0.55)));
    ctx.fillStyle = KETTLE.ink;
    const mark = M.chats[id].mark;
    const w = Math.ceil(ctx.measureText(mark).width);
    ctx.fillText(mark, x + Math.round((d - w) / 2), y + Math.round(d * 0.2));
  }

  private preview(id: ChatId): { text: string; badge: number; muted: boolean; when: string } {
    const C = M.chats[id];
    if (id === 'house') {
      if (this.eveningShown > 0) return { text: this.houseMuted ? M.muted : `${M.house.evening[this.eveningShown - 1].who}: ${M.house.evening[this.eveningShown - 1].text}`,
        badge: this.eveningShown - this.eveningRead, muted: this.houseMuted, when: M.house.tonight };
      if (this.houseLeft > 0) {
        const l = M.house.left[this.houseLeft - 1];
        return { text: l.sys ? l.text : `${l.who}: ${l.text}`, badge: this.houseOpenedLeft ? 0 : this.houseLeft, muted: this.houseMuted, when: '13:40' };
      }
      if (this.houseShown > 0) {
        const l = M.house.birthday[this.houseShown - 1];
        return { text: this.houseHeart ? `${M.you}: ${M.house.heart}` : `${l.who}: ${l.text}`, badge: this.houseOpenedBirthday ? 0 : this.houseShown, muted: this.houseMuted, when: '07:31' };
      }
      return { text: C.idle, badge: 0, muted: false, when: 'Tue' };
    }
    if (id === 'mum') {
      if (this.mumToday > 0) {
        const last = M.mum.today.slice(0, this.mumToday).filter((m) => m.text).pop();
        return { text: last?.text ?? C.idle, badge: this.mumOpened ? 0 : this.mumToday, muted: false, when: M.mum.today[this.mumToday - 1].when };
      }
      return { text: C.idle, badge: 0, muted: false, when: 'Mon' };
    }
    if (id === 'dad') {
      if (this.dadIn) return { text: M.dad.today[M.dad.today.length - 1].text, badge: this.dadRead ? 0 : M.dad.today.length, muted: false, when: '10:21' };
      return { text: C.idle, badge: 0, muted: false, when: 'Sep 25' };
    }
    if (this.junieUnmuted) return { text: this.junieReplied ? `${M.you}: ${M.junie.reply}` : M.junie.today.text, badge: 0, muted: false, when: M.junie.today.when };
    return { text: C.idle, badge: this.junieOpened ? 0 : 1, muted: true, when: M.junie.today.when };
  }

  private canOpen(id: ChatId): boolean {
    if (id === 'house') return this.houseShown > 0;
    if (id === 'mum') return this.mumToday > 0;
    if (id === 'dad') return this.dadIn;
    return this.junieOpenable;
  }

  /** the wallpaper: hers until the update restores "defaults", then the goal — on the lock screen and the list only */
  private wall(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    if (this.wallpaper === 'goal') drawGoalPicture(ctx, x, y, w, h, { caption: false });
    else photograph(ctx, x, y, w, h, false, 3);
  }

  /** the lock screen: the wallpaper, the date, the app's name (the update's new wallpaper shows here first) */
  drawLock(ctx: CanvasRenderingContext2D, W: number, H: number, line = ''): void {
    this.wall(ctx, 0, 0, W, H);
    px(ctx, 0, 0, W, 30, KETTLE.banner);
    setFont(ctx, 15); ctx.fillStyle = KETTLE.bannerInk;
    ctx.fillText(M.date, 8, 7);
    ctx.font = monoFor(9);
    const aw = Math.ceil(ctx.measureText(M.app).width);
    ctx.fillText(M.app, W - aw - 8, 11);
    const cap = line || (this.wallpaper === 'goal' ? V3.goal.caption : '');
    if (cap) {
      setFont(ctx, 11);
      const cw = Math.min(W - 8, Math.ceil(ctx.measureText(cap).width) + 16);
      px(ctx, Math.round((W - cw) / 2), H - 26, cw, 20, KETTLE.banner);
      ctx.fillStyle = KETTLE.bannerInk; ctx.fillText(cap, Math.round((W - cw) / 2) + 8, H - 22);
    }
  }

  private drawList(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.wall(ctx, 0, HEAD_H, W, H - HEAD_H - BAR_H);
    this.header(ctx, W, M.app, M.date);
    const rows: ChatId[] = ['house', 'mum', 'dad', 'junie'];
    const rh = 30, L = 4, R = W - 4;
    let y = HEAD_H + 4;
    for (const id of rows) {
      const p = this.preview(id);
      const live = this.canOpen(id);
      roundRect(ctx, L, y, R - L, rh, 5, KETTLE.row);
      this.avatar(ctx, L + 3, y + 5, 20, id);
      setFont(ctx, 10); ctx.fillStyle = KETTLE.ink;
      let name = M.chats[id].name;
      if (id === 'house' && this.eveningShown > this.eveningRead) name += ` · ${M.house.unread.replace('{n}', String(this.eveningShown - this.eveningRead))}`;
      else if (p.muted) name += `  · ${M.muted}`;
      const nx = L + 28;
      ctx.save(); ctx.beginPath(); ctx.rect(nx, y, R - nx - 34, rh); ctx.clip();
      ctx.fillText(name, nx, y + 3);
      setFont(ctx, 9); ctx.fillStyle = KETTLE.sub;
      ctx.fillText(p.text, nx, y + 16);
      ctx.restore();
      ctx.font = monoFor(8); ctx.fillStyle = KETTLE.sub;
      const tw = Math.ceil(ctx.measureText(p.when).width);
      ctx.fillText(p.when, R - tw - 4, y + 4);
      if (p.badge > 0) {
        const s = String(p.badge);
        setFont(ctx, 9);
        const bw = Math.max(13, Math.ceil(ctx.measureText(s).width) + 6);
        pill(ctx, R - bw - 4, y + 16, bw, 11, p.muted ? ERA4.ruleHi : KETTLE.badge);
        ctx.fillStyle = KETTLE.badgeInk;
        ctx.fillText(s, R - bw - 4 + Math.round((bw - ctx.measureText(s).width) / 2), y + 17);
      }
      if (live) this.targets.push({ x: L, y, w: R - L, h: rh, id: `row-${id}` });
      y += rh + 3;
    }
    // the foot of the window: one primary, the next thing the story waits on
    this.bar(ctx, W, H, false, this.listPrimary(), '');
  }

  private listPrimary(): { id: string; label: string } | null {
    const w = this.want;
    if (!w) return this.eveningShown > this.eveningRead ? { id: 'chat-house', label: M.chats.house.open } : null;
    if (w === 'link') return { id: 'chat-mum', label: M.chats.mum.open };
    return { id: `chat-${w}`, label: M.chats[w].open };
  }

  /** the window's foot: Back (in a thread) and the one primary, always in the same place; else a quiet hint */
  private bar(ctx: CanvasRenderingContext2D, W: number, H: number, back: boolean, primary: { id: string; label: string } | null, hint: string): void {
    const y = H - BAR_H;
    px(ctx, 0, y, W, BAR_H, KETTLE.row);
    px(ctx, 0, y, W, 1, KETTLE.rowEdge);
    let x = 4;
    setFont(ctx, 10);
    if (back) {
      const bw = Math.ceil(ctx.measureText(M.back).width) + 12;
      pill(ctx, x, y + 5, bw, 20, KETTLE.quietEdge);
      pill(ctx, x + 1, y + 6, bw - 2, 18, KETTLE.row);
      ctx.fillStyle = KETTLE.ink; ctx.fillText(M.back, x + 6, y + 10);
      this.targets.push({ x, y: y + 5, w: bw, h: 20, id: 'back-chats' });
      x += bw + 5;
    }
    if (primary) {
      setFont(ctx, 11);
      const pw = Math.min(W - x - 4, Math.ceil(ctx.measureText(primary.label).width) + 16);
      pill(ctx, x, y + 4, pw, 22, KETTLE.primary);
      ctx.save(); ctx.beginPath(); ctx.rect(x, y + 4, pw, 22); ctx.clip();
      ctx.fillStyle = KETTLE.primaryInk; ctx.fillText(primary.label, x + 8, y + 9);
      ctx.restore();
      this.targets.push({ x, y: y + 4, w: pw, h: 22, id: primary.id });
    } else if (hint) {
      setFont(ctx, 9); ctx.fillStyle = KETTLE.sub;
      ctx.fillText(hint, x + 2, y + 10);
    }
  }

  // ── a thread: ONE scrolling thread, dated by its separators ─────────────
  private messages(id: ChatId): Msg[] {
    const out: Msg[] = [];
    if (id === 'house') {
      out.push({ sep: M.today });
      for (const l of M.house.birthday.slice(0, this.houseShown)) out.push({ who: l.who, text: l.text });
      if (this.houseHeart) out.push({ mine: true, text: M.house.heart });
      for (const l of M.house.left.slice(0, this.houseLeft)) out.push(l.sys ? { sys: true, text: l.text } : { who: l.who, text: l.text });
      if (this.eveningShown > 0) {
        out.push({ sep: M.house.tonight });
        for (const l of M.house.evening.slice(0, this.eveningShown)) out.push({ who: l.who, text: l.text });
      }
    } else if (id === 'mum') {
      // ⚑ the years, oldest first, then today: she scrolls down through them (no "2024 ›")
      for (const yr of M.mum.years) {
        out.push({ sep: yr.when, year: yr.when });
        for (const m of yr.msgs) out.push(m as Msg);
      }
      out.push({ sep: M.today, year: M.today });
      for (const m of M.mum.today.slice(0, this.mumToday)) out.push(m.link ? { link: m.link } : { text: m.text });
      if (this.mumDraft) out.push({ draft: true, mine: true, text: M.mum.draft });
    } else if (id === 'dad') {
      // what he said in September, then what he said today: one thread, no "Today ›"
      out.push({ sep: M.dad.before[0].when, year: M.dad.before[0].when });
      for (const m of M.dad.before) out.push({ text: m.text });
      if (this.dadIn) {
        out.push({ sep: M.today, year: M.today });
        for (const m of M.dad.today) out.push({ text: m.text });
      }
    } else if (!this.junieUnmuted) {
      // muted: the one message of the morning, and the note that says why it was not seen
      out.push({ sys: true, text: M.junie.mutedNote });
      out.push({ text: M.junie.today.text });
    } else {
      // ⚑ unmuting shows what the mute hid: her three lines from Tuesday (the lever, and the stream), then today
      out.push({ sep: M.junie.tuesday, year: M.junie.tuesday });
      for (const m of M.junie.before) out.push({ text: m.text });
      out.push({ sep: M.today, year: M.today });
      out.push({ text: M.junie.today.text });
      if (this.junieReplied) out.push({ mine: true, text: M.junie.reply });
      if (this.junieX) out.push({ text: M.junie.replied });
    }
    return out;
  }

  private threadPrimary(id: ChatId): { id: string; label: string } | null {
    const own = this.ownPrimary(id);
    if (own) return own;
    // ⚑ the story is waiting on another chat: this thread's one primary goes there (the walk found a player can sit in
    //   Dad's thread after Sam left, with nothing but Back to press)
    const w = this.want;
    if (w && w !== 'link' && w !== id) return { id: `chat-${w}`, label: M.chats[w].open };
    if (w === 'link' && id !== 'mum') return { id: 'chat-mum', label: M.chats.mum.open };
    return null;
  }

  private ownPrimary(id: ChatId): { id: string; label: string } | null {
    if (id === 'house') return this.houseShown >= M.house.birthday.length && !this.houseHeart ? { id: 'house-heart', label: M.house.heartButton } : null;
    if (id === 'mum') {
      if (!this.mumAtToday) return null;   // the scroll is the way on (the bar says so)
      if (this.dadIn && !this.dadRead) return { id: 'chat-dad', label: M.chats.dad.open };
      if (this.dadRead && !this.linkOpened && this.want === 'link') return { id: 'msg-link', label: M.mum.linkButton };
      return null;
    }
    if (id === 'dad') return this.want === 'link' ? { id: 'chat-mum', label: M.dad.backToMum } : null;
    if (!this.junieUnmuted) return { id: 'junie-unmute', label: M.junie.unmute };
    if (!this.junieReplied) return { id: 'junie-reply', label: M.junie.reply };
    return null;
  }

  private drawThread(ctx: CanvasRenderingContext2D, W: number, H: number, id: ChatId): void {
    const C = M.chats[id];
    const top = HEAD_H + 2, bottom = H - BAR_H;
    // Dad's message arrives as a banner over Mum's thread
    let bodyTop = top + 2;
    const banner = id === 'mum' && this.dadIn && !this.dadRead;
    if (banner) bodyTop = top + 22;
    const msgs = this.messages(id);
    const shown = this.drawMessages(ctx, W - SB - 2, bodyTop, bottom - 2, msgs, id);
    // the scroll bar: a track, a thumb, ▲ ▼ — scroll controls, not a "next" button
    this.drawScrollBar(ctx, W - SB - 1, bodyTop, SB, bottom - 2 - bodyTop, id);
    if (banner) {
      px(ctx, 4, top + 2, W - 8, 18, KETTLE.banner);
      setFont(ctx, 9); ctx.fillStyle = KETTLE.bannerInk;
      ctx.fillText(M.dad.banner, 9, top + 6);
    }
    // the thread's header: avatar, name, and the date of what is on screen now (the scroll's place in time)
    px(ctx, 0, 0, W, HEAD_H + 2, KETTLE.head);
    this.avatar(ctx, 5, 3, 15, id);
    setFont(ctx, 11); ctx.fillStyle = KETTLE.headInk;
    ctx.fillText(C.name, 25, 5);
    const nameEnd = 25 + Math.ceil(ctx.measureText(C.name).width) + 10;
    const sub = id === 'junie' && !this.junieUnmuted ? C.sub : shown || C.sub;
    if (sub) {
      ctx.font = monoFor(9);
      const sw = Math.ceil(ctx.measureText(sub).width);
      // only if it fits beside the name (the lot's member list does not, in the window's width)
      if (W - sw - 7 >= nameEnd) ctx.fillText(sub, W - sw - 7, 7);
    }
    // ⚑ in Mum's thread, she reaches today by scrolling there: the story goes on from that moment
    if (id === 'mum' && !this.mumAtToday && this.scrollOf.mum <= 2 && !this.toTop) this.mumAtToday = true;
    const primary = this.threadPrimary(id);
    const hint = !primary && this.maxScroll > 0 && this.scrollOf[id] > 2 ? M.scrollHint : '';
    this.bar(ctx, W, H, true, primary, hint);
  }

  private drawScrollBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, id: ChatId): void {
    if (this.maxScroll <= 0) return;
    px(ctx, x, y, w, h, KETTLE.row);
    px(ctx, x, y, 1, h, KETTLE.rowEdge);
    const arrow = (ay: number, up: boolean): void => {
      roundRect(ctx, x + 1, ay, w - 1, w, 3, KETTLE.quietEdge);
      ctx.fillStyle = KETTLE.ink;
      const cx = x + Math.round(w / 2), cy = ay + Math.round(w / 2);
      for (let k = 0; k < 4; k++) ctx.fillRect(cx - k, up ? cy - 2 + k : cy + 1 - k, k * 2 + 1, 1);
    };
    arrow(y, true); arrow(y + h - w, false);
    const track = h - 2 * w - 4;
    if (track > 8) {
      const view = this.viewH, total = view + this.maxScroll;
      const th = Math.max(10, Math.round(track * view / total));
      const k = 1 - this.scrollOf[id] / this.maxScroll;   // 0 at the oldest line, 1 at the latest
      const ty = y + w + 2 + Math.round((track - th) * k);
      roundRect(ctx, x + 3, ty, w - 5, th, 3, KETTLE.sub);
    }
    if (this.scrollOf[id] < this.maxScroll) this.targets.push({ x, y, w, h: w, id: 'scroll-up' });
    if (this.scrollOf[id] > 0) this.targets.push({ x, y: y + h - w, w, h: w, id: 'scroll-down' });
  }

  /** lay the thread out from its latest line upward, offset by the scroll; returns the date of the lines on screen */
  private drawMessages(ctx: CanvasRenderingContext2D, W: number, top: number, bottom: number, msgs: Msg[], id: ChatId): string {
    const maxW = W - 12;
    type Box = { m: Msg; h: number; lines: string[] };
    const boxes: Box[] = msgs.map((m) => {
      if (m.sep) return { m, h: 17, lines: [] };
      if (m.sys) { setFont(ctx, 9); return { m, h: 17, lines: wrapText(ctx, m.text ?? '', W - 24) }; }
      // ⚑ S334 (his 8 Nov: "the size of the content is kinda big, so it can be quite less need for the scrolling") —
      //   body text one step smaller, lines one px tighter: more of a thread fits, less to scroll
      if (m.link) { setFont(ctx, 9); const l = M.mum.links[m.link as LinkId]; const lines = wrapText(ctx, l.head, maxW - 14).slice(0, 3); return { m, h: 16 + lines.length * 12 + 8, lines }; }
      if (m.photo) return { m, h: 54, lines: [] };
      setFont(ctx, 9);
      // a group's speaker sits on the same line as their words
      const lines = wrapText(ctx, (m.who ? `${m.who}  ` : '') + (m.text ?? ''), maxW - 14);
      return { m, h: lines.length * 12 + 6 + (m.draft ? 11 : 0) + 3, lines };
    });
    const total = boxes.reduce((s, b) => s + b.h, 0);
    this.viewH = bottom - top;
    this.maxScroll = Math.max(0, total - this.viewH);
    if (this.toTop) { this.scrollOf[id] = this.maxScroll; this.toTop = false; }
    this.scrollOf[id] = Math.max(0, Math.min(this.maxScroll, this.scrollOf[id]));
    const scroll = Math.round(this.scrollOf[id]);
    ctx.save(); ctx.beginPath(); ctx.rect(0, top, W, bottom - top); ctx.clip();
    let y = bottom + scroll;
    let date = '';
    for (let i = boxes.length - 1; i >= 0; i--) {
      const b = boxes[i];
      y -= b.h;
      // the separator nearest above the top of what is on screen names the time she is reading
      if (b.m.year && !date && y <= top + this.viewH * 0.5) date = b.m.year;
      if (y > bottom || y + b.h < top) continue;
      this.drawBox(ctx, W, maxW, b, y);
    }
    ctx.restore();
    return date;
  }

  private drawBox(ctx: CanvasRenderingContext2D, W: number, maxW: number, b: { m: Msg; h: number; lines: string[] }, by: number): void {
    const m = b.m;
    if (m.sep) {
      ctx.font = monoFor(9);
      const sw = Math.ceil(ctx.measureText(m.sep).width) + 12;
      pill(ctx, Math.round((W - sw) / 2), by + 2, sw, 13, KETTLE.row);
      ctx.fillStyle = KETTLE.sub; ctx.fillText(m.sep, Math.round((W - sw) / 2) + 6, by + 4);
      return;
    }
    if (m.sys) {
      setFont(ctx, 9);
      const sw = Math.min(W - 12, Math.ceil(ctx.measureText(b.lines[0] ?? '').width) + 12);
      pill(ctx, Math.round((W - sw) / 2), by + 1, sw, 14, KETTLE.sys);
      ctx.fillStyle = KETTLE.ink; ctx.fillText(b.lines[0] ?? '', Math.round((W - sw) / 2) + 6, by + 3);
      return;
    }
    if (m.link) {
      const l = M.mum.links[m.link as LinkId];
      const cw = maxW, ch = b.h - 4;
      roundRect(ctx, 6, by, cw, ch, 5, KETTLE.linkEdge);
      roundRect(ctx, 7, by + 1, cw - 2, ch - 2, 4, KETTLE.link);
      px(ctx, 7, by + 1, 3, ch - 2, KETTLE.head);
      ctx.font = monoFor(8); ctx.fillStyle = KETTLE.sub; ctx.fillText(l.mast, 14, by + 4);
      setFont(ctx, 9); ctx.fillStyle = KETTLE.ink;
      b.lines.forEach((ln, k) => ctx.fillText(ln, 14, by + 16 + k * 12));
      if (m.link === 'a0' && !this.linkOpened && this.dadRead && this.want === 'link') this.targets.push({ x: 6, y: by, w: cw, h: ch, id: 'msg-link' });
      return;
    }
    if (m.photo) {
      // the loft photo: an old print, a small child seen from behind on a lawn — no face, no name
      const pw = 78, ph = 50, ox = 6;
      px(ctx, ox, by, pw, ph, KETTLE.row);
      px(ctx, ox + 3, by + 3, pw - 6, ph - 13, PLACE.sky);
      px(ctx, ox + 3, by + 3 + 19, pw - 6, ph - 13 - 19, PLACE.land);
      px(ctx, ox + 36, by + 10, 6, 6, PLACE.floorLo);           // the back of a head, hair
      px(ctx, ox + 34, by + 16, 10, 10, PLACE.textileHi);       // a little dress, from behind
      px(ctx, ox + 35, by + 26, 2, 5, PLACE.sill); px(ctx, ox + 41, by + 26, 2, 5, PLACE.sill);
      ctx.font = monoFor(8); ctx.fillStyle = KETTLE.sub;
      ctx.fillText(M.mum.loftCaption, ox + 4, by + ph - 9);
      return;
    }
    const mine = !!m.mine;
    setFont(ctx, 9);
    let textW = Math.max(...b.lines.map((l) => Math.ceil(ctx.measureText(l).width)));
    if (m.draft) { ctx.font = monoFor(8); textW = Math.max(textW, Math.ceil(ctx.measureText(M.mum.draftLabel).width)); setFont(ctx, 9); }
    const bw = Math.min(maxW, textW + 14);
    const bh = b.h - 3;
    const bx = mine ? W - 4 - bw : 6;
    roundRect(ctx, bx, by, bw, bh, 6, m.draft ? KETTLE.draft : mine ? KETTLE.mine : KETTLE.theirs);
    let ty = by + 3;
    if (m.draft) { ctx.font = monoFor(8); ctx.fillStyle = KETTLE.sub; ctx.fillText(M.mum.draftLabel, bx + 7, ty); ty += 11; }
    setFont(ctx, 9); ctx.fillStyle = KETTLE.ink;
    b.lines.forEach((ln, k) => {
      if (k === 0 && m.who && ln.startsWith(m.who)) {
        // the speaker's name in the thread's second ink, then their words
        ctx.fillStyle = KETTLE.sub; ctx.fillText(m.who, bx + 7, ty);
        const nw = Math.ceil(ctx.measureText(`${m.who}  `).width);
        ctx.fillStyle = KETTLE.ink; ctx.fillText(ln.slice(m.who.length).trimStart(), bx + 7 + nw, ty);
        return;
      }
      ctx.fillText(ln, bx + 7, ty + k * 12);
    });
    if (m.draft && Math.floor(this.t * 2) % 2 === 0) {
      const lw = Math.ceil(ctx.measureText(b.lines[b.lines.length - 1] ?? '').width);
      px(ctx, bx + 8 + lw, ty + (b.lines.length - 1) * 13, 1, 12, KETTLE.ink);
    }
  }
}
