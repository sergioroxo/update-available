/**
 * ⚑ S332 — THE PLACES LIST (2016, job 2). Data and grounding: data/dialog/s3_places.json.
 *
 * A member's post names The Wick ("a lesbian bar, all welcome"). The network keeps a list of places to avoid, and
 * Vera is asked to add it. Comply, and the place joins the list and leaves the post. Refuse, and Lambient asks again,
 * then reprimands, then does it, then an administrator does (lambientDesk.ts, one ladder for the shift). Either way
 * The Wick ends on the list: that is what the platform is for. Then Orla's message arrives and the stamp card on the
 * desk is stamped BANNED (graceQueueLite + era3Devices).
 *
 * REGISTER: the member's words are felt — her card is bare, nothing comments on her; the rule, the list, Lambient's
 * line and the Trending box are the tool's side of the screen.
 */
import { px, setFont, wrapText } from '../theme/chrome';
import * as aero from '../theme/era3';
import { ERA3 } from '../theme/era3';
import { ledger } from '../../state/ledger';
import type { TaskSurface, TaskArea, TaskHit } from './taskSurface';
import { refuse, drawLambientNote, noteBand, doneByLabel, type DeskNote, type Voice } from './lambientDesk';
import { drawTrending } from './e3Trending';
import P from '../../../data/dialog/s3_places.json';

export class PlacesListApp implements TaskSurface {
  readonly id = 'places';
  readonly windowTitle = P.title;
  readonly beats = ['open', 'added', 'refused'] as const;
  private v = 0;
  private by: 'you' | Voice | null = null;
  private note: DeskNote | null = null;

  version(): number { return this.v; }
  complete(): boolean { return this.by !== null; }

  thumb(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    px(ctx, x, y, w, h, ERA3.sysBand);
    const rows = Math.max(2, Math.min(5, Math.floor((h - 6) / 11)));
    for (let i = 0; i < rows; i++) {
      const ry = y + 4 + i * 11;
      px(ctx, x + 4, ry, w - 8, 8, ERA3.white);
      px(ctx, x + 4, ry, 2, 8, i === rows - 1 ? (this.by ? ERA3.alarm : ERA3.amber) : ERA3.alarm);
      px(ctx, x + 10, ry + 3, Math.min(w - 20, 30 + ((i * 17) % 28)), 2, ERA3.grey);
    }
  }

  draw(ctx: CanvasRenderingContext2D, a: TaskArea, hit: (r: TaskHit) => void): void {
    const GAP = 16;
    const leftW = Math.floor(a.w * 0.56), rx = a.x + leftW + GAP, rw = a.x + a.w - rx;
    // ── the member's post (felt: bare) ─────────────────────────────────────────
    setFont(ctx, 10); ctx.fillStyle = ERA3.greyDk; ctx.fillText(P.postLabel, a.x, a.y);
    const text = P.post.before + (this.by ? P.post.removed : P.post.place) + P.post.after;
    setFont(ctx, 12);
    const lines = wrapText(ctx, text, leftW - 30);
    const cardY = a.y + 16, cardH = 40 + lines.length * 17 + 8;
    px(ctx, a.x, cardY, leftW, cardH, ERA3.memberBand);
    px(ctx, a.x, cardY, 4, cardH, ERA3.memberSpine);
    setFont(ctx, 14); ctx.fillStyle = ERA3.ink; ctx.fillText(P.post.who, a.x + 16, cardY + 9);
    setFont(ctx, 9); ctx.fillStyle = ERA3.grey; ctx.fillText(P.post.when, a.x + 16, cardY + 26);
    setFont(ctx, 12);
    lines.forEach((ln, i) => {
      const ly = cardY + 40 + i * 17;
      // the place, once removed, is the platform's grey bracket inside her sentence
      const at = this.by ? ln.indexOf(P.post.removed) : -1;
      if (at < 0) { ctx.fillStyle = ERA3.ink; ctx.fillText(ln, a.x + 16, ly); return; }
      const pre = ln.slice(0, at), cut = P.post.removed, post = ln.slice(at + cut.length);
      let lx = a.x + 16;
      ctx.fillStyle = ERA3.ink; ctx.fillText(pre, lx, ly); lx += ctx.measureText(pre).width;
      ctx.fillStyle = ERA3.alarm; ctx.fillText(cut, lx, ly); lx += ctx.measureText(cut).width;
      ctx.fillStyle = ERA3.ink; ctx.fillText(post, lx, ly);
    });
    // ── the rule panel (operable: the tool's voice) ─────────────────────────────
    const py = cardY + cardH + 12, ph = a.y + a.h - py;
    px(ctx, a.x, py, leftW, ph, ERA3.glassHi);
    px(ctx, a.x, py, leftW, 1, ERA3.glassEdge);
    setFont(ctx, 13); ctx.fillStyle = ERA3.titleText; ctx.fillText(P.rule, a.x + 10, py + 9);
    setFont(ctx, 11); ctx.fillStyle = ERA3.greyDk;
    const why = wrapText(ctx, P.ruleWhy, leftW - 20);
    why.forEach((ln, i) => ctx.fillText(ln, a.x + 10, py + 28 + i * 13));
    const ny = py + 34 + why.length * 13;
    const note = this.note ?? { line: P.teach, voice: 'lambient' as Voice };
    noteBand(ctx, a.x + 6, ny - 4, leftW - 12, 44);
    drawLambientNote(ctx, a.x + 12, ny + 2, leftW - 24, note);
    const by = ny + 50;
    if (!this.by) {
      const bw = Math.floor((leftW - 30) / 2);
      aero.button(ctx, a.x + 10, by, bw, 30, P.comply, { primary: true, size: 12 });
      aero.button(ctx, a.x + 20 + bw, by, bw, 30, P.refuse, { size: 12 });
      hit({ x: a.x + 10, y: by, w: bw, h: 30, id: 'places-add' });
      hit({ x: a.x + 20 + bw, y: by, w: bw, h: 30, id: 'places-refuse' });
    } else {
      setFont(ctx, 13); ctx.fillStyle = ERA3.titleText; ctx.fillText(P.doneHeading, a.x + 10, by + 2);
      setFont(ctx, 10); ctx.fillStyle = ERA3.greyDk; ctx.fillText(P.doneSub, a.x + 10, by + 20);
    }
    // ── the list ───────────────────────────────────────────────────────────────
    setFont(ctx, 10); ctx.fillStyle = ERA3.greyDk; ctx.fillText(P.listHeading, rx, a.y);
    setFont(ctx, 9); ctx.fillStyle = ERA3.grey; ctx.fillText(P.listSub, rx, a.y + 14);
    let ly = a.y + 30;
    const row = (label: string, state: 'on' | 'proposed' | 'new'): void => {
      px(ctx, rx, ly, rw, 22, state === 'proposed' ? ERA3.sysBand : ERA3.white);
      px(ctx, rx, ly, 3, 22, state === 'proposed' ? ERA3.amber : ERA3.alarm);
      setFont(ctx, 10); ctx.fillStyle = state === 'proposed' ? ERA3.greyDk : ERA3.ink;
      ctx.save(); ctx.beginPath(); ctx.rect(rx, ly, rw - 4, 22); ctx.clip();
      ctx.fillText(label, rx + 10, ly + 6);
      ctx.restore();
      const t = state === 'proposed' ? P.proposed : state === 'new' && this.by ? doneByLabel(this.by) : '';
      if (t) { setFont(ctx, 8); ctx.fillStyle = state === 'new' ? ERA3.alarm : ERA3.grey; const tw = ctx.measureText(t).width; px(ctx, rx + rw - tw - 10, ly + 5, tw + 6, 12, ERA3.white); ctx.fillText(t, rx + rw - tw - 7, ly + 7); }
      ly += 26;
    };
    for (const l of P.list) row(l, 'on');
    row(P.newRow, this.by ? 'new' : 'proposed');
    drawTrending(ctx, rx, ly + 8, rw, a.y + a.h - ly - 10);
  }

  press(id: string): boolean {
    if (this.by) return false;
    if (id === 'places-add') { this.finish('you'); return true; }
    if (id === 'places-refuse') {
      const ans = refuse(P.refusedWhat);
      this.note = { line: ans.line, voice: ans.voice };
      if (ans.forced) this.finish(ans.voice);
      this.v++;
      return true;
    }
    return false;
  }

  private finish(by: 'you' | Voice): void {
    this.by = by;
    ledger.era3Jobs.push({ id: 'places', witness: P.witness });
    this.v++;
  }

  debugBeat(beat: string): void {
    if (beat === 'added') this.press('places-add');
    if (beat === 'refused') this.press('places-refuse');
    this.v++;
  }
}
