/**
 * ⚑ S200 — POST TO THE GROUP (2016). Data and grounding: data/dialog/s3_group.json. A job on Vera's board (TaskSurface).
 *
 * His visual archive (2026-09-29): in 2016 "the ministry disappears into platforms" — a group lives inside the
 * social network's OWN frame (the blue header, the cover, Joined / Invite, post cards with likes, comments and
 * shares, a sidebar of suggested groups), and "the institution becomes visually subordinate". Vera posts the week's
 * testimony to the network's private group; the platform does the rest. The post's text is written for her (no
 * free typing); Post publishes it, and the platform reports it back as a count. Filed as The recommendation.
 * Every mark is invented ("gather", the group, the members).
 */
import { px, setFont } from '../theme/chrome';
import { ERA3, button, GATHER as G } from '../theme/era3';
import { ledger } from '../../state/ledger';
import type { TaskSurface, TaskArea, TaskHit } from './taskSurface';
import D from '../../../data/dialog/s3_group.json';

export class GroupTask implements TaskSurface {
  readonly id = 'group';
  readonly windowTitle = D.title;
  readonly beats = ['open', 'posted'] as const;
  private v = 0;
  private posted = false;

  version(): number { return this.v; }
  complete(): boolean { return this.posted; }

  thumb(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    px(ctx, x, y, w, h, G.page);
    px(ctx, x, y, w, 6, G.blue);
    px(ctx, x + 4, y + 9, w - 8, Math.min(14, h / 4), G.cover);
    for (let i = 0; i < 3 && y + 28 + i * 10 < y + h - 4; i++) px(ctx, x + 4, y + 28 + i * 10, w - 8, 7, G.card);
  }

  draw(ctx: CanvasRenderingContext2D, a: TaskArea, hit: (r: TaskHit) => void): void {
    // the platform's own frame: the blue bar, its name, its search
    px(ctx, a.x, a.y, a.w, 22, G.blue);
    setFont(ctx, 13); ctx.fillStyle = G.white; ctx.fillText(D.platform, a.x + 8, a.y + 4);
    px(ctx, a.x + 70, a.y + 5, 200, 12, G.search);
    setFont(ctx, 8); ctx.fillStyle = ERA3.grey; ctx.fillText(D.searchHint, a.x + 76, a.y + 7);
    const b = { x: a.x, y: a.y + 24, w: a.w, h: a.h - 24 };
    px(ctx, b.x, b.y, b.w, b.h, G.page);
    // the cover, the group's square, its name and its buttons
    px(ctx, b.x + 6, b.y + 4, b.w - 12, 34, G.cover);
    px(ctx, b.x + 14, b.y + 20, 30, 30, G.white);
    px(ctx, b.x + 16, b.y + 22, 26, 26, G.profile);
    setFont(ctx, 12); ctx.fillStyle = ERA3.ink; ctx.fillText(D.group.name, b.x + 52, b.y + 40);
    setFont(ctx, 8); ctx.fillStyle = ERA3.grey; ctx.fillText(D.group.meta, b.x + 52, b.y + 54);
    let bx = b.x + b.w - 8;
    for (const t of [...D.group.buttons].reverse()) {
      setFont(ctx, 9);
      const w = ctx.measureText(t).width + 14; bx -= w + 4;
      px(ctx, bx, b.y + 42, w, 14, G.card); ctx.fillStyle = ERA3.ink; ctx.fillText(t, bx + 7, b.y + 44);
    }
    // two columns: the feed, and the sidebar
    const colW = Math.round(b.w * 0.62), fx = b.x + 6, sx = fx + colW + 8, sw = b.w - colW - 20;
    let y = b.y + 64;
    // the composer — written for her
    px(ctx, fx, y, colW, 40, G.card);
    setFont(ctx, 8); ctx.fillStyle = ERA3.grey; ctx.fillText(this.posted ? D.composerEmpty : D.composerLabel, fx + 6, y + 4);
    if (!this.posted) {
      setFont(ctx, 9); ctx.fillStyle = ERA3.ink; ctx.fillText(D.post.text, fx + 6, y + 16);
      button(ctx, fx + colW - 56, y + 22, 50, 14, D.postButton, { primary: true, size: 9 });
      hit({ x: fx + colW - 56, y: y + 22, w: 50, h: 14, id: 'group-post' });
    }
    y += 46;
    // the feed: hers on top once posted, then the others
    const posts = this.posted ? [{ who: D.post.who, when: D.post.when, text: D.post.text, link: D.post.link, stats: D.post.seen }, ...D.feed] : D.feed;
    for (const p of posts) {
      const ph = p.link ? 58 : 48;
      if (y + ph > b.y + b.h) break;
      px(ctx, fx, y, colW, ph, G.card);
      px(ctx, fx + 6, y + 5, 14, 14, G.profile);
      setFont(ctx, 9); ctx.fillStyle = G.blue; ctx.fillText(p.who, fx + 24, y + 4);
      setFont(ctx, 7); ctx.fillStyle = ERA3.grey; ctx.fillText(p.when, fx + 24, y + 14);
      setFont(ctx, 9); ctx.fillStyle = ERA3.ink;
      ctx.save(); ctx.beginPath(); ctx.rect(fx, y, colW - 4, ph); ctx.clip();
      ctx.fillText(p.text, fx + 6, y + 24);
      if (p.link) { px(ctx, fx + 6, y + 34, colW - 12, 12, G.search); setFont(ctx, 8); ctx.fillStyle = ERA3.greyDk; ctx.fillText(p.link, fx + 10, y + 36); }
      ctx.restore();
      setFont(ctx, 7); ctx.fillStyle = ERA3.grey; ctx.fillText(p.stats, fx + 6, y + ph - 10);
      y += ph + 5;
    }
    // the sidebar: About, and the groups it suggests next
    let sy = b.y + 64;
    px(ctx, sx, sy, sw, 50, G.card);
    setFont(ctx, 9); ctx.fillStyle = ERA3.ink; ctx.fillText(D.about.label, sx + 6, sy + 4);
    setFont(ctx, 8); ctx.fillStyle = ERA3.greyDk;
    D.about.lines.forEach((l, i) => ctx.fillText(l, sx + 6, sy + 17 + i * 10));
    sy += 56;
    px(ctx, sx, sy, sw, 16 + D.suggested.items.length * 16, G.card);
    setFont(ctx, 9); ctx.fillStyle = ERA3.ink; ctx.fillText(D.suggested.label, sx + 6, sy + 4);
    D.suggested.items.forEach((t, i) => {
      setFont(ctx, 8); ctx.fillStyle = G.blue; ctx.fillText(t, sx + 6, sy + 18 + i * 16);
      ctx.fillStyle = ERA3.grey; ctx.fillText(D.suggested.join, sx + sw - 28, sy + 18 + i * 16);
    });
  }

  press(id: string): boolean {
    if (id === 'group-post' && !this.posted) {
      this.posted = true;
      ledger.era3Jobs.push({ id: 'group', witness: D.witness });
      this.v++;
      return true;
    }
    return false;
  }

  debugBeat(beat: string): void { if (beat === 'posted') this.press('group-post'); this.v++; }
}
