/**
 * ⚑ S192 — TAG THE VIDEO: the recommendation event, 2016 (Phase 5). Data and grounding:
 * data/dialog/s3_recommend.json. A job on Vera's board like any other (TaskSurface).
 *
 * She tags the network's new testimony video with the house vocabulary — the explicit term greyed out,
 * "not used in house style" — and the estimated reach fills in as she does. "Preview as viewer" opens the
 * platform's page in a Chrome-grammar window: the video, and Up next walking theology → pastoral advice →
 * testimony in three steps to the one she tagged, "84% match — recommended for you", and the end card:
 * "Does any of this sound familiar?" and "Share your story". Nothing on the page tells anybody what it is.
 * Who selects the next thing is now the platform; she only chose its words. Filed: "video tagged for
 * Recommended — n keywords", or, if she leaves with none, "video left untagged".
 */
import { px, setFont } from '../theme/chrome';
import { ERA3, button, STREAMLINE as S } from '../theme/era3';
import { ledger } from '../../state/ledger';
import type { TaskSurface, TaskArea, TaskHit } from './taskSurface';
import D from '../../../data/dialog/s3_recommend.json';

type Tag = { id: string; label: string; off?: string };

export class RecommendTask implements TaskSurface {
  readonly id = 'recommend';
  readonly windowTitle = D.title;
  readonly beats = ['open', 'tagged', 'preview', 'endcard'] as const;
  private v = 0;
  private applied = new Set<string>();
  private view: 'tags' | 'preview' | 'endcard' = 'tags';
  private step = 0;             // how far along Up next the viewer has gone
  private filed = false;

  version(): number { return this.v; }
  complete(): boolean { return this.filed; }

  thumb(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    px(ctx, x, y, w, h, S.page);
    const vw = Math.min(w - 8, Math.round((h - 8) * 1.6));
    px(ctx, x + 4, y + 4, vw, h - 8, S.player);
    px(ctx, x + 4 + vw / 2 - 4, y + h / 2 - 5, 8, 10, S.playerInk);
    let tx = x + vw + 10;
    for (let i = 0; i < 3 && tx < x + w - 10; i++) { px(ctx, tx, y + 6 + i * 10, Math.min(30, x + w - tx - 4), 6, S.chip); }
  }

  draw(ctx: CanvasRenderingContext2D, area: TaskArea, hit: (r: TaskHit) => void): void {
    if (this.view === 'tags') this.drawTags(ctx, area, hit);
    else this.drawPage(ctx, area, hit);
  }

  private drawTags(ctx: CanvasRenderingContext2D, a: TaskArea, hit: (r: TaskHit) => void): void {
    // the video, as the network's editor sees it
    const vw = 150, vh = 86;
    px(ctx, a.x, a.y, vw, vh, S.player);
    px(ctx, a.x + vw / 2 - 6, a.y + vh / 2 - 8, 12, 16, S.playerInk);
    setFont(ctx, 11); ctx.fillStyle = ERA3.ink;
    ctx.fillText(D.video.title, a.x + vw + 12, a.y);
    setFont(ctx, 9); ctx.fillStyle = ERA3.grey;
    ctx.fillText(`${D.video.channel} · ${D.video.length} · ${D.video.views}`, a.x + vw + 12, a.y + 16);
    // the keywords
    setFont(ctx, 9); ctx.fillStyle = ERA3.grey;
    ctx.fillText(D.tagsLabel.toUpperCase(), a.x + vw + 12, a.y + 36);
    let tx = a.x + vw + 12, ty = a.y + 50;
    for (const t of D.tags as Tag[]) {
      setFont(ctx, 9);
      const w = ctx.measureText(t.label).width + 16;
      if (tx + w > a.x + a.w) { tx = a.x + vw + 12; ty += 20; }
      const on = this.applied.has(t.id);
      px(ctx, tx, ty, w, 16, t.off ? S.chipOff : on ? S.chipOn : S.chip);
      ctx.fillStyle = t.off ? ERA3.grey : on ? ERA3.white : ERA3.ink;
      ctx.fillText(t.label, tx + 8, ty + 3);
      if (!t.off) hit({ x: tx, y: ty, w, h: 16, id: `tag:${t.id}` });
      tx += w + 6;
    }
    const off = (D.tags as Tag[]).find((t) => t.off);
    if (off) { setFont(ctx, 8); ctx.fillStyle = ERA3.grey; ctx.fillText(`${off.label}: ${off.off}`, a.x + vw + 12, ty + 22); }
    // the reach, filling in as she tags
    const ry = a.y + vh + 30;
    setFont(ctx, 9); ctx.fillStyle = ERA3.grey;
    ctx.fillText(D.reachLabel.toUpperCase(), a.x, ry);
    const n = Math.min(D.reach.length, this.applied.size);
    D.reach.slice(0, n).forEach((r, i) => { setFont(ctx, 10); ctx.fillStyle = ERA3.accent; ctx.fillText(`→ ${r}`, a.x + 8, ry + 16 + i * 15); });
    // preview, once there is anything to preview
    const by = a.y + a.h - 26;
    button(ctx, a.x + a.w - 150, by, 150, 22, D.preview, { primary: true, disabled: this.applied.size === 0 });
    if (this.applied.size > 0) hit({ x: a.x + a.w - 150, y: by, w: 150, h: 22, id: 'preview' });
  }

  /** the platform's page, as a viewer sees it, in the browser of 2016 */
  private drawPage(ctx: CanvasRenderingContext2D, a: TaskArea, hit: (r: TaskHit) => void): void {
    // the browser's chrome: one tab, the omnibox
    px(ctx, a.x, a.y, a.w, 34, S.chrome);
    px(ctx, a.x + 8, a.y + 4, 220, 14, S.tab);
    setFont(ctx, 8); ctx.fillStyle = ERA3.ink;
    ctx.save(); ctx.beginPath(); ctx.rect(a.x + 8, a.y + 4, 214, 14); ctx.clip();
    ctx.fillText(D.browser.tab, a.x + 14, a.y + 7); ctx.restore();
    px(ctx, a.x + 8, a.y + 20, a.w - 16, 12, S.omnibox);
    ctx.fillStyle = ERA3.greyDk; ctx.fillText(D.browser.omnibox, a.x + 14, a.y + 22);
    const b = { x: a.x, y: a.y + 36, w: a.w, h: a.h - 36 };
    px(ctx, b.x, b.y, b.w, b.h, S.page);
    setFont(ctx, 12); ctx.fillStyle = S.brand; ctx.fillText(D.browser.site, b.x + 8, b.y + 4);
    // the player, and the video that is playing now
    const cur = D.chain[this.step];
    // the player takes what is left under the chrome after the title, channel and two comments (~74 px)
    const vh = Math.max(60, Math.min(Math.round(b.w * 0.55 * 0.56), b.h - 22 - 74));
    const vw = Math.round(Math.min(b.w * 0.6, vh / 0.56));
    px(ctx, b.x + 8, b.y + 22, vw, vh, S.player);
    if (this.view === 'endcard') {
      const E = D.endCard;
      setFont(ctx, 11); ctx.fillStyle = S.playerInk;
      ctx.fillText(E.title, b.x + 20, b.y + 32);
      E.boxes.forEach((t, i) => {
        px(ctx, b.x + 22, b.y + 50 + i * 16, 10, 10, S.playerInk);
        px(ctx, b.x + 23, b.y + 51 + i * 16, 8, 8, S.player);
        setFont(ctx, 10); ctx.fillStyle = S.playerInk; ctx.fillText(t, b.x + 40, b.y + 49 + i * 16);
      });
      button(ctx, b.x + 22, b.y + 22 + vh - 26, 130, 20, E.share, { primary: true });
      hit({ x: b.x + 22, y: b.y + 22 + vh - 26, w: 130, h: 20, id: 'share' });
    } else {
      px(ctx, b.x + 8 + vw / 2 - 6, b.y + 22 + vh / 2 - 8, 12, 16, S.playerInk);
      px(ctx, b.x + 8, b.y + 22 + vh - 4, vw, 4, S.bar);
      px(ctx, b.x + 8, b.y + 22 + vh - 4, Math.round(vw * 0.35), 4, S.barOn);
    }
    setFont(ctx, 11); ctx.fillStyle = ERA3.ink;
    ctx.fillText(cur.title, b.x + 8, b.y + 26 + vh);
    setFont(ctx, 9); ctx.fillStyle = ERA3.grey;
    ctx.fillText(`${cur.channel} · ${cur.length}`, b.x + 8, b.y + 41 + vh);
    // the comments: other people recognising themselves
    D.comments.forEach((c, i) => {
      setFont(ctx, 9); ctx.fillStyle = ERA3.greyDk;
      ctx.fillText(`${c.who}  ${c.text}`, b.x + 8, b.y + 55 + vh + i * 11);
    });
    // Up next
    const sx = b.x + vw + 18, sw = b.w - vw - 26;
    setFont(ctx, 9); ctx.fillStyle = ERA3.greyDk; ctx.fillText(D.upNext, sx, b.y + 22);
    D.chain.forEach((c, i) => {
      if (i <= this.step && this.view !== 'endcard' && i === this.step) return;   // the one playing is not "next"
      if (i < this.step) return;
      const y = b.y + 38 + (i - this.step - (this.view === 'endcard' ? 0 : 1)) * 44;
      if (y < b.y + 30) return;
      px(ctx, sx, y, 48, 28, S.player);
      setFont(ctx, 8); ctx.fillStyle = S.playerInk; ctx.fillText(c.length, sx + 26, y + 18);
      setFont(ctx, 9); ctx.fillStyle = ERA3.ink;
      ctx.save(); ctx.beginPath(); ctx.rect(sx + 52, y, sw - 52, 40); ctx.clip();
      ctx.fillText(c.title, sx + 52, y);
      setFont(ctx, 8); ctx.fillStyle = ERA3.grey; ctx.fillText(c.channel, sx + 52, y + 13);
      if ((c as { match?: string }).match) { ctx.fillStyle = S.match; ctx.fillText((c as { match: string }).match, sx + 52, y + 25); }
      ctx.restore();
      if (this.view !== 'endcard') hit({ x: sx, y, w: sw, h: 40, id: `next:${i}` });
    });
  }

  press(id: string): boolean {
    if (id.startsWith('tag:')) {
      const t = id.slice(4);
      if (this.applied.has(t)) this.applied.delete(t); else this.applied.add(t);
      this.touched = true;
      this.v++; return true;
    }
    if (id === 'preview') { this.view = 'preview'; this.step = 0; this.file(); this.v++; return true; }
    if (id.startsWith('next:')) {
      this.step = Number(id.slice(5));
      if (this.step >= D.chain.length - 1) { this.step = D.chain.length - 1; this.view = 'endcard'; }
      this.v++; return true;
    }
    if (id === 'share') return true;   // the button is the platform's; it goes nowhere she can follow
    return false;
  }

  /** ⚑ S208 / A8 (REVIEW_ROUND_5, ERA16-09) — a press on a tag; a peek and Back is not a refusal */
  private touched = false;
  private declinedFiled = false;

  private file(): void {
    if (this.filed && !this.declinedFiled) return;
    // a later tag-and-preview replaces an earlier "left untagged": the record keeps what she finally did
    if (this.declinedFiled) {
      const i = ledger.era3Jobs.findIndex((j) => j.id === 'recommend' && j.witness === D.witness.declined);
      if (i >= 0) ledger.era3Jobs.splice(i, 1);
      this.declinedFiled = false;
    }
    this.filed = true;
    ledger.era3Jobs.push({ id: 'recommend', witness: D.witness.tagged.replace('{n}', String(this.applied.size)) });
  }

  onLeave(): void {
    if (this.filed || !this.touched) return;   // only a real leaving — after she had begun — is filed
    this.filed = true;
    this.declinedFiled = true;
    ledger.era3Jobs.push({ id: 'recommend', witness: D.witness.declined });
  }

  debugBeat(beat: string): void {
    if (beat === 'tagged') { this.applied = new Set(['ssa', 'christiangay']); }
    if (beat === 'preview') { this.applied = new Set(['ssa', 'christiangay']); this.view = 'preview'; this.step = 0; }
    if (beat === 'endcard') { this.view = 'endcard'; this.step = D.chain.length - 1; }
    this.v++;
  }
}
