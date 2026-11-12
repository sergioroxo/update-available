/**
 * ⚑ S200 → S332 — POST TO THE GROUP (2016, job 4). Data and grounding: data/dialog/s3_group.json.
 *
 * His second answers (8 Nov): the group is Maiden-to-be, drawn very close to a 2016 private group on a social
 * network — the blue bar, the cover photo, "Closed group", the member count, "Admin" badges — with an invented
 * platform name and no real logo. Vera is one of its admins. She posts this week's check-in (written for her, no
 * typing), and the same check-in then arrives on her own phone: she writes the rule and is ruled by it.
 * Comply (Post) or refuse (Not this week): refusing climbs the shift's one ladder (lambientDesk.ts), and the post goes
 * up anyway, by Lambient or by an administrator. The Trending box carries the year's real news (e3Trending.ts).
 * The women's posts are their own words: nothing comments on them.
 */
import { px, setFont, wrapText } from '../theme/chrome';
import { ERA3, button, GATHER as G } from '../theme/era3';
import { ledger } from '../../state/ledger';
import type { TaskSurface, TaskArea, TaskHit } from './taskSurface';
import { refuse, drawLambientNote, measureLambientNote, noteBand, type DeskNote, type Voice } from './lambientDesk';
import { drawTrending } from './e3Trending';
import D from '../../../data/dialog/s3_group.json';

type Post = { who: string; admin?: boolean; when: string; text: string; stats: string };

export class GroupTask implements TaskSurface {
  readonly id = 'group';
  readonly windowTitle = D.title;
  readonly beats = ['open', 'posted', 'refused'] as const;
  private v = 0;
  private by: 'you' | Voice | null = null;
  private note: DeskNote | null = null;

  version(): number { return this.v; }
  complete(): boolean { return this.by !== null; }

  /** ⚑ S376 (job 19 B, VISUAL_REVIEW #10) — the tile's picture is the group itself: the network's blue bar with
   *  the group's name, its five members as round pictures with no faces (no likeness, as every body in the piece),
   *  and the composer waiting for this week's check-in (it used to be two blue bars). */
  thumb(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ctx.save();
    px(ctx, x, y, w, h, G.page);
    const bar = h >= 30 ? Math.max(10, Math.round(h * 0.26)) : Math.max(5, Math.round(h * 0.24));
    px(ctx, x, y, w, bar, G.blue);
    if (bar >= 10) {
      const fs = Math.min(10, bar - 2);
      setFont(ctx, fs); ctx.fillStyle = G.white;
      ctx.fillText(D.group.name, x + 5, y + Math.max(1, Math.round((bar - fs) / 2)));
    }
    const MEMBERS = [ERA3.rose, ERA3.amber, ERA3.good, ERA3.accentHi, ERA3.bury];
    const comp = h >= 34 ? Math.max(8, Math.round(h * 0.22)) : 0;
    const r = Math.max(3, Math.min((h - bar - comp - 6) / 2, (w - 12) / (MEMBERS.length * 2.6)));
    const cy = y + bar + 3 + r;
    MEMBERS.forEach((col, i) => {
      const cx = x + 6 + r + i * r * 2.6;
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      // a person with no face: a head and shoulders in white, the picture's own crop
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = G.white;
      ctx.beginPath(); ctx.arc(cx, cy - r * 0.18, r * 0.36, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy + r * 0.95, r * 0.66, Math.PI, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
    if (comp) {
      const cy2 = y + h - comp - 2;
      ctx.fillStyle = G.card; ctx.strokeStyle = ERA3.fieldEdge; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(x + 5, cy2, w - 10, comp, comp / 2); ctx.fill(); ctx.stroke();
      setFont(ctx, Math.min(9, comp - 2)); ctx.fillStyle = ERA3.grey;
      ctx.fillText(D.composerEmpty, x + 5 + comp / 2, cy2 + Math.max(0, Math.round((comp - Math.min(9, comp - 2)) / 2) - 1));
    }
    ctx.restore();
  }

  private badge(ctx: CanvasRenderingContext2D, x: number, y: number): number {
    setFont(ctx, 7);
    const w = ctx.measureText(D.adminBadge).width + 6;
    px(ctx, x, y, w, 10, G.page); ctx.fillStyle = G.blue; ctx.fillText(D.adminBadge, x + 3, y + 1);
    return w;
  }

  draw(ctx: CanvasRenderingContext2D, a: TaskArea, hit: (r: TaskHit) => void): void {
    // the network's own frame: the blue bar, its name, its search
    px(ctx, a.x, a.y, a.w, 22, G.blue);
    setFont(ctx, 13); ctx.fillStyle = G.white; ctx.fillText(D.platform, a.x + 8, a.y + 4);
    px(ctx, a.x + 70, a.y + 5, 200, 12, G.search);
    setFont(ctx, 8); ctx.fillStyle = ERA3.grey; ctx.fillText(D.searchHint, a.x + 76, a.y + 7);
    const b = { x: a.x, y: a.y + 24, w: a.w, h: a.h - 24 };
    px(ctx, b.x, b.y, b.w, b.h, G.page);
    // the cover photo (two figures' worth of soft field, no faces), the group's name, closed, the count, the buttons
    px(ctx, b.x + 6, b.y + 4, b.w - 12, 40, G.cover);
    px(ctx, b.x + 6, b.y + 30, b.w - 12, 14, G.profile);
    setFont(ctx, 14); ctx.fillStyle = ERA3.ink; ctx.fillText(D.group.name, b.x + 10, b.y + 50);
    setFont(ctx, 9); ctx.fillStyle = ERA3.grey; ctx.fillText(D.group.meta, b.x + 10, b.y + 67);
    let bx = b.x + b.w - 8;
    for (const t of [...D.group.buttons].reverse()) {
      setFont(ctx, 9);
      const w = ctx.measureText(t).width + 14; bx -= w + 4;
      px(ctx, bx, b.y + 52, w, 16, G.card); ctx.fillStyle = ERA3.ink; ctx.fillText(t, bx + 7, b.y + 55);
    }
    const colW = Math.round(b.w * 0.6), fx = b.x + 6, sx = fx + colW + 8, sw = b.w - colW - 20;
    let y = b.y + 80;
    // the composer — this week's check-in, drafted for her
    if (!this.by) {
      setFont(ctx, 10);
      const draft = wrapText(ctx, D.post.text, colW - 12);
      const ch = 22 + draft.length * 13 + 32;
      px(ctx, fx, y, colW, ch, G.card);
      setFont(ctx, 8); ctx.fillStyle = ERA3.grey; ctx.fillText(D.composerLabel, fx + 6, y + 5);
      setFont(ctx, 10); ctx.fillStyle = ERA3.ink;
      draft.forEach((ln, i) => ctx.fillText(ln, fx + 6, y + 19 + i * 13));
      const by = y + ch - 26;
      button(ctx, fx + colW - 66, by, 60, 20, D.postButton, { primary: true, size: 10 });
      button(ctx, fx + colW - 160, by, 88, 20, D.refuseButton, { size: 10 });
      hit({ x: fx + colW - 66, y: by, w: 60, h: 20, id: 'group-post' });
      hit({ x: fx + colW - 160, y: by, w: 88, h: 20, id: 'group-refuse' });
      y += ch + 4;
    }
    // Lambient teaches the rule under the composer (the tool's voice, never on the women's posts)
    {
      const note = this.note ?? { line: D.teach, voice: 'lambient' as Voice };
      const nh = measureLambientNote(ctx, colW - 10, note, 10) + 8;
      noteBand(ctx, fx, y, colW, nh + 2);
      drawLambientNote(ctx, fx + 5, y + 5, colW - 10, note, 10);
      y += nh + 8;
    }
    // the feed: hers on top once posted, then the women's
    const mine: Post | null = this.by ? {
      who: D.post.who, admin: true,
      when: this.by === 'you' ? D.post.when : this.by === 'admin' ? D.post.byAdmin : D.post.byLambient,
      text: D.post.text, stats: D.post.seen
    } : null;
    const posts: Post[] = mine ? [mine, ...D.feed] : D.feed;
    for (const p of posts) {
      setFont(ctx, 10);
      const lines = wrapText(ctx, p.text, colW - 12);
      const ph = 30 + lines.length * 13 + 14;
      if (y + ph > b.y + b.h) break;
      px(ctx, fx, y, colW, ph, G.card);
      px(ctx, fx + 6, y + 6, 16, 16, G.profile);
      setFont(ctx, 10); ctx.fillStyle = G.blue; ctx.fillText(p.who, fx + 28, y + 5);
      const nw = ctx.measureText(p.who).width;
      if (p.admin) this.badge(ctx, fx + 32 + nw, y + 6);
      setFont(ctx, 8); ctx.fillStyle = ERA3.grey; ctx.fillText(p.when, fx + 28, y + 17);
      setFont(ctx, 10); ctx.fillStyle = ERA3.ink;
      lines.forEach((ln, i) => ctx.fillText(ln, fx + 6, y + 30 + i * 13));
      setFont(ctx, 8); ctx.fillStyle = ERA3.grey; ctx.fillText(p.stats, fx + 6, y + ph - 11);
      y += ph + 5;
    }
    // the sidebar: About, then Trending
    let sy = b.y + 80;
    const aboutH = 18 + D.about.lines.length * 11 + 4;
    px(ctx, sx, sy, sw, aboutH, G.card);
    setFont(ctx, 10); ctx.fillStyle = ERA3.ink; ctx.fillText(D.about.label, sx + 7, sy + 5);
    setFont(ctx, 8); ctx.fillStyle = ERA3.greyDk;
    D.about.lines.forEach((l, i) => ctx.fillText(l, sx + 7, sy + 19 + i * 11));
    sy += aboutH + 6;
    drawTrending(ctx, sx, sy, sw, b.y + b.h - sy - 40, G.blue);   // the foot stays clear for the way back
  }

  press(id: string): boolean {
    if (this.by) return false;
    if (id === 'group-post') { this.finish('you'); return true; }
    if (id === 'group-refuse') {
      const ans = refuse(D.refusedWhat);
      this.note = { line: ans.line, voice: ans.voice };
      if (ans.forced) this.finish(ans.voice);
      this.v++;
      return true;
    }
    return false;
  }

  private finish(by: 'you' | Voice): void {
    this.by = by;
    ledger.era3Jobs.push({ id: 'group', witness: D.witness });
    this.v++;
  }

  debugBeat(beat: string): void {
    if (beat === 'posted') this.press('group-post');
    if (beat === 'refused') this.press('group-refuse');
    this.v++;
  }
}
