/**
 * ⚑ S321 — KETTLE, THE MESSENGER ON HER LAPTOP (DESIGN_2026_V3_PRESSURE_2026-11-07.md, "The two screens").
 *
 * Everything that is a person lives here: the house chat (her friends), Mum, Dad, Junie (muted). An invented
 * look-alike of a 2026 messenger — no real brand, no real look. ⚑ WHY THE LAPTOP: the monitor is the only screen fully
 * in frame from the seat and it carries the system's pages (the bot, the map, the clip, the clinic letter, the
 * articles), which need its width. A messenger is a narrow column by nature, and the lid's 224 × 140 at 0.30 m gives a
 * logical pixel 1.8× the physical size of the monitor's — so the felt lines are the biggest type in the room. The
 * piece turns her to the lid whenever a person writes (`E4Browser.face`), so no beat waits on her choosing to look.
 *
 * FELT (CLAUDE.md register law): while a thread is open there is no glow, no Lamby, no system voice (`felt`). The
 * presses are one at a time, at the foot of the window: the next year of Mum, Read Dad, Open link, Unmute, thank you.
 * No free text, no reply box: her one reply to the house and to Junie is a chip.
 *
 * This file is a VIEW with state; `E4Browser` owns the story and decides when things arrive. Its rects are kept in
 * `targets` (not `hits`, so the walker's monitor collector does not project them onto the wrong screen); the shell
 * copies them into `laptopHits`, which is where the walker, XR and the room's pointer look for the lid's controls.
 */
import V3 from '../../../data/dialog/s4_v3.json';
import { KETTLE, roundRect, pill, photograph, PLACE } from '../theme/era4';
import { px, setFont, wrapText } from '../theme/chrome';
import { monoFor } from '../theme/fonts';
import { drawGoalPicture } from './goalPicture';

export type ChatId = 'house' | 'mum' | 'dad' | 'junie';
export interface MRect { x: number; y: number; w: number; h: number; id: string }
interface Msg { who?: string; text?: string; sys?: boolean; mine?: boolean; link?: string; photo?: string; sep?: string; draft?: boolean }

const M = V3.messenger;
type LinkId = keyof typeof M.mum.links;
const HEAD_H = 16;
const BAR_H = 28;

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
  mumPage = 0;
  mumOpened = false;
  dadIn = false;
  dadRead = false;
  linkOpened = false;
  junieOpenable = false;
  junieOpened = false;
  junieUnmuted = false;
  junieReplied = false;
  junieX = false;
  /** the bot's "mute 2 more", if she pressed it: the house goes grey on the list */
  houseMuted = false;
  /** the lid's controls this frame (see the header: not `hits`) */
  targets: MRect[] = [];
  /** a clock for the sparkle on the goal wallpaper */
  t = 0;

  /** a thread is open: felt — nothing of the system speaks */
  get felt(): boolean { return this.view !== 'list'; }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number): MRect[] {
    this.targets = [];
    px(ctx, 0, 0, W, H, KETTLE.ground);
    if (this.view === 'list') this.drawList(ctx, W, H);
    else this.drawThread(ctx, W, H, this.view);
    return this.targets;
  }

  press(x: number, y: number): string | null {
    const h = this.targets.find((r) => x >= r.x - 2 && x <= r.x + r.w + 2 && y >= r.y - 2 && y <= r.y + r.h + 2);
    return h ? h.id : null;
  }

  // ── the list ──────────────────────────────────────────────────────────────
  private header(ctx: CanvasRenderingContext2D, W: number, title: string, right: string): void {
    px(ctx, 0, 0, W, HEAD_H, KETTLE.head);
    setFont(ctx, 10); ctx.fillStyle = KETTLE.headInk;
    ctx.fillText(title, 6, 3);
    ctx.font = monoFor(9);
    const rw = Math.ceil(ctx.measureText(right).width);
    ctx.fillText(right, W - rw - 6, 4);
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

  private drawList(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.header(ctx, W, M.app, M.date);
    const rows: ChatId[] = ['house', 'mum', 'dad', 'junie'];
    const rh = 22;
    let y = HEAD_H;
    for (const id of rows) {
      const p = this.preview(id);
      const live = this.canOpen(id);
      px(ctx, 0, y, W, rh, KETTLE.row);
      px(ctx, 0, y + rh - 1, W, 1, KETTLE.rowEdge);
      this.avatar(ctx, 5, y + 3, 16, id);
      setFont(ctx, 10); ctx.fillStyle = KETTLE.ink;
      let name = M.chats[id].name;
      if (p.muted) name += `  · ${M.muted}`;
      ctx.fillText(name, 26, y + 2);
      setFont(ctx, 9); ctx.fillStyle = KETTLE.sub;
      ctx.save(); ctx.beginPath(); ctx.rect(26, y + 11, W - 26 - 30, 11); ctx.clip();
      ctx.fillText(p.text, 26, y + 12);
      ctx.restore();
      ctx.font = monoFor(8); ctx.fillStyle = KETTLE.sub;
      const tw = Math.ceil(ctx.measureText(p.when).width);
      ctx.fillText(p.when, W - tw - 5, y + 3);
      if (p.badge > 0) {
        const s = String(p.badge);
        setFont(ctx, 8);
        const bw = Math.max(12, Math.ceil(ctx.measureText(s).width) + 6);
        pill(ctx, W - bw - 5, y + 11, bw, 10, p.muted ? KETTLE.mutedBadge : KETTLE.badge);
        ctx.fillStyle = KETTLE.badgeInk;
        ctx.fillText(s, W - bw - 5 + Math.round((bw - ctx.measureText(s).width) / 2), y + 12);
      }
      if (live) this.targets.push({ x: 0, y, w: W, h: rh - 1, id: `row-${id}` });
      y += rh;
    }
    // the foot of the window: one primary, the next thing the story waits on
    this.bar(ctx, W, H, false, this.listPrimary());
  }

  private listPrimary(): { id: string; label: string } | null {
    const w = this.want;
    if (!w) return null;
    if (w === 'link') return { id: 'chat-mum', label: M.chats.mum.open };
    return { id: `chat-${w}`, label: M.chats[w].open };
  }

  /** the window's foot: Back (in a thread) and the one primary, always in the same place */
  private bar(ctx: CanvasRenderingContext2D, W: number, H: number, back: boolean, primary: { id: string; label: string } | null): void {
    const y = H - BAR_H;
    px(ctx, 0, y, W, BAR_H, KETTLE.row);
    px(ctx, 0, y, W, 1, KETTLE.rowEdge);
    let x = 5;
    setFont(ctx, 10);
    if (back) {
      const bw = Math.ceil(ctx.measureText(M.back).width) + 12;
      pill(ctx, x, y + 4, bw, 20, KETTLE.quietEdge);
      pill(ctx, x + 1, y + 5, bw - 2, 18, KETTLE.row);
      ctx.fillStyle = KETTLE.ink; ctx.fillText(M.back, x + 6, y + 9);
      this.targets.push({ x, y: y + 4, w: bw, h: 20, id: 'back-chats' });
      x += bw + 5;
    }
    if (primary) {
      setFont(ctx, 11);
      const pw = Math.ceil(ctx.measureText(primary.label).width) + 18;
      pill(ctx, x, y + 3, pw, 22, KETTLE.primary);
      ctx.fillStyle = KETTLE.primaryInk; ctx.fillText(primary.label, x + 9, y + 8);
      this.targets.push({ x, y: y + 3, w: pw, h: 22, id: primary.id });
    }
  }

  // ── a thread ──────────────────────────────────────────────────────────────
  private messages(id: ChatId): Msg[] {
    const out: Msg[] = [];
    if (id === 'house') {
      out.push({ sep: M.today });
      for (const l of M.house.birthday.slice(0, this.houseShown)) out.push({ who: l.who, text: l.text });
      if (this.houseHeart) out.push({ mine: true, text: M.house.heart });
      for (const l of M.house.left.slice(0, this.houseLeft)) out.push(l.sys ? { sys: true, text: l.text } : { who: l.who, text: l.text });
    } else if (id === 'mum') {
      if (this.mumPage < M.mum.years.length) {
        const yr = M.mum.years[this.mumPage];
        out.push({ sep: yr.when });
        for (const m of yr.msgs) out.push(m as Msg);
      } else {
        out.push({ sep: M.today });
        for (const m of M.mum.today.slice(0, this.mumToday)) out.push(m.link ? { link: m.link } : { text: m.text });
        if (this.mumDraft) out.push({ draft: true, mine: true, text: M.mum.draft });
      }
    } else if (id === 'dad') {
      out.push({ sep: M.dad.before[0].when });
      for (const m of M.dad.before) out.push({ text: m.text });
      if (this.dadIn) { out.push({ sep: M.today }); for (const m of M.dad.today) out.push({ text: m.text }); }
    } else {
      if (!this.junieUnmuted) out.push({ sys: true, text: M.junie.mutedNote });
      out.push({ sep: 'Tue' });
      for (const m of M.junie.before) out.push({ text: m.text });
      out.push({ sep: M.today });
      out.push({ text: M.junie.today.text });
      if (this.junieReplied) out.push({ mine: true, text: M.junie.reply });
      if (this.junieX) out.push({ text: M.junie.replied });
    }
    return out;
  }

  private threadPrimary(id: ChatId): { id: string; label: string } | null {
    if (id === 'house') return this.houseShown >= M.house.birthday.length && !this.houseHeart ? { id: 'house-heart', label: M.house.heartButton } : null;
    if (id === 'mum') {
      if (this.mumPage < M.mum.years.length) {
        const next = M.mum.years[this.mumPage + 1];
        return { id: next ? `mum-${next.label}` : 'mum-today', label: M.mum.years[this.mumPage].next };
      }
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
    // the thread's header: avatar, name, and (Junie) whether she is muted
    px(ctx, 0, 0, W, HEAD_H + 2, KETTLE.head);
    this.avatar(ctx, 5, 2, 14, id);
    setFont(ctx, 10); ctx.fillStyle = KETTLE.headInk;
    ctx.fillText(C.name, 24, 4);
    // Mum's header says which year the page is (one press per year), so the year never scrolls away
    const sub = id === 'junie' ? (this.junieUnmuted ? M.junie.unmuted : C.sub)
      : id === 'mum' ? (this.mumPage < M.mum.years.length ? M.mum.years[this.mumPage].when : M.today) : C.sub;
    if (sub) {
      ctx.font = monoFor(8);
      const sw = Math.ceil(ctx.measureText(sub).width);
      ctx.fillText(sub, W - sw - 6, 5);
    }
    const top = HEAD_H + 2, bottom = H - BAR_H;
    // the wallpaper behind the chat: hers, then — from the update on — the goal
    ctx.save(); ctx.beginPath(); ctx.rect(0, top, W, bottom - top); ctx.clip();
    if (this.wallpaper === 'goal') drawGoalPicture(ctx, 0, top, W, bottom - top, { alpha: 0.42 });
    else { const was = ctx.globalAlpha; ctx.globalAlpha = 0.28; photograph(ctx, 0, top, W, bottom - top, false, 3); ctx.globalAlpha = was; }
    ctx.restore();
    // Dad's message arrives as a banner over Mum's thread
    let bodyTop = top + 2;
    if (id === 'mum' && this.dadIn && !this.dadRead) {
      px(ctx, 4, top + 2, W - 8, 16, KETTLE.banner);
      setFont(ctx, 9); ctx.fillStyle = KETTLE.bannerInk;
      ctx.fillText(M.dad.banner, 9, top + 6);
      bodyTop = top + 20;
    }
    this.drawMessages(ctx, W, bodyTop, bottom - 2, this.messages(id));
    this.bar(ctx, W, H, true, this.threadPrimary(id));
  }

  /** lay the messages out from the bottom up; the oldest scroll off the top, the way a chat does */
  private drawMessages(ctx: CanvasRenderingContext2D, W: number, top: number, bottom: number, msgs: Msg[]): void {
    const maxW = 178;
    type Box = { m: Msg; h: number; lines: string[] };
    const boxes: Box[] = msgs.map((m) => {
      if (m.sep) return { m, h: 13, lines: [] };
      if (m.sys) { setFont(ctx, 9); return { m, h: 15, lines: wrapText(ctx, m.text ?? '', W - 30) }; }
      if (m.link) { setFont(ctx, 10); const l = M.mum.links[m.link as LinkId]; const lines = wrapText(ctx, l.head, maxW - 12).slice(0, 2); return { m, h: 14 + lines.length * 12 + 6, lines }; }
      if (m.photo) return { m, h: 46, lines: [] };
      setFont(ctx, 10);
      // ⚑ a group's speaker sits on the same line as their words (two lines of name and text did not fit the lid)
      const lines = wrapText(ctx, (m.who ? `${m.who}  ` : '') + (m.text ?? ''), maxW - 12);
      return { m, h: lines.length * 12 + 7 + (m.draft ? 10 : 0) + 3, lines };
    });
    let y = bottom;
    const placed: { b: Box; y: number }[] = [];
    for (let i = boxes.length - 1; i >= 0; i--) {
      if (y - boxes[i].h < top) break;
      y -= boxes[i].h;
      placed.unshift({ b: boxes[i], y });
    }
    for (const { b, y: by } of placed) {
      const m = b.m;
      if (m.sep) {
        ctx.font = monoFor(8);
        const sw = Math.ceil(ctx.measureText(m.sep).width) + 10;
        pill(ctx, Math.round((W - sw) / 2), by + 1, sw, 11, KETTLE.row);
        ctx.fillStyle = KETTLE.sub; ctx.fillText(m.sep, Math.round((W - sw) / 2) + 5, by + 2);
        continue;
      }
      if (m.sys) {
        setFont(ctx, 9);
        const sw = Math.min(W - 16, Math.ceil(ctx.measureText(b.lines[0] ?? '').width) + 12);
        pill(ctx, Math.round((W - sw) / 2), by + 1, sw, 13, KETTLE.sys);
        ctx.fillStyle = KETTLE.ink; ctx.fillText(b.lines[0] ?? '', Math.round((W - sw) / 2) + 6, by + 3);
        continue;
      }
      if (m.link) {
        const l = M.mum.links[m.link as LinkId];
        const cw = maxW, ch = b.h - 4;
        roundRect(ctx, 6, by, cw, ch, 5, KETTLE.linkEdge);
        roundRect(ctx, 7, by + 1, cw - 2, ch - 2, 4, KETTLE.link);
        px(ctx, 7, by + 1, 3, ch - 2, KETTLE.head);
        ctx.font = monoFor(8); ctx.fillStyle = KETTLE.sub; ctx.fillText(l.mast, 14, by + 4);
        setFont(ctx, 10); ctx.fillStyle = KETTLE.ink;
        b.lines.forEach((ln, k) => ctx.fillText(ln, 14, by + 15 + k * 12));
        if (m.link === 'a0' && !this.linkOpened && this.dadRead && this.want === 'link') this.targets.push({ x: 6, y: by, w: cw, h: ch, id: 'msg-link' });
        continue;
      }
      if (m.photo) {
        // the loft photo: an old print, a small child seen from behind on a lawn — no face, no name
        const pw = 64, ph = 42, ox = 6;
        px(ctx, ox, by, pw, ph, KETTLE.row);
        px(ctx, ox + 3, by + 3, pw - 6, ph - 12, PLACE.sky);
        px(ctx, ox + 3, by + 3 + 16, pw - 6, ph - 12 - 16, PLACE.land);
        px(ctx, ox + 29, by + 8, 5, 5, PLACE.floorLo);           // the back of a head, hair
        px(ctx, ox + 27, by + 13, 9, 9, PLACE.textileHi);        // a little dress, from behind
        px(ctx, ox + 28, by + 22, 2, 4, PLACE.sill); px(ctx, ox + 33, by + 22, 2, 4, PLACE.sill);
        ctx.font = monoFor(8); ctx.fillStyle = KETTLE.sub;
        ctx.fillText(M.mum.loftCaption, ox + 4, by + ph - 9);
        continue;
      }
      const mine = !!m.mine;
      setFont(ctx, 10);
      let textW = Math.max(...b.lines.map((l) => Math.ceil(ctx.measureText(l).width)));
      if (m.draft) { ctx.font = monoFor(8); textW = Math.max(textW, Math.ceil(ctx.measureText(M.mum.draftLabel).width)); setFont(ctx, 10); }
      const bw = Math.min(maxW, textW + 12);
      const bh = b.h - 3;
      const bx = mine ? W - 6 - bw : 6;
      roundRect(ctx, bx, by, bw, bh, 6, m.draft ? KETTLE.draft : mine ? KETTLE.mine : KETTLE.theirs);
      let ty = by + 4;
      if (m.draft) { ctx.font = monoFor(8); ctx.fillStyle = KETTLE.sub; ctx.fillText(M.mum.draftLabel, bx + 6, ty); ty += 10; }
      setFont(ctx, 10); ctx.fillStyle = KETTLE.ink;
      b.lines.forEach((ln, k) => {
        if (k === 0 && m.who && ln.startsWith(m.who)) {
          // the speaker's name in the thread's second ink, then their words
          ctx.fillStyle = KETTLE.sub; ctx.fillText(m.who, bx + 6, ty);
          const nw = Math.ceil(ctx.measureText(`${m.who}  `).width);
          ctx.fillStyle = KETTLE.ink; ctx.fillText(ln.slice(m.who.length).trimStart(), bx + 6 + nw, ty);
          return;
        }
        ctx.fillText(ln, bx + 6, ty + k * 12);
      });
      if (m.draft && Math.floor(this.t * 2) % 2 === 0) {
        const lw = Math.ceil(ctx.measureText(b.lines[b.lines.length - 1] ?? '').width);
        px(ctx, bx + 7 + lw, ty + (b.lines.length - 1) * 12, 1, 11, KETTLE.ink);
      }
    }
  }
}
