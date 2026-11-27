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

  /** ⚑ S376 (job 19 B, VISUAL_REVIEW #10) — the tile's picture is what the job does: a street map of the town with
   *  places flagged on it, one of them red (the place she is asked to list). Once listed, the red pin is struck
   *  through. A flat 2016 picture in ERA3's colours; it used to be grey bars. */
  thumb(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ctx.save();
    px(ctx, x, y, w, h, ERA3.sysBand);
    // the water along the bottom, a quay's edge
    ctx.fillStyle = ERA3.glassEdge;
    ctx.beginPath(); ctx.moveTo(x, y + h * 0.78); ctx.quadraticCurveTo(x + w * 0.45, y + h * 0.62, x + w, y + h * 0.84);
    ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
    // a park, the streets (two avenues, a cross street, one on the diagonal)
    px(ctx, x + Math.round(w * 0.56), y, Math.round(w * 0.2), Math.round(h * 0.26), ERA3.good);
    const sw = Math.max(2, Math.round(h * 0.09));
    ctx.fillStyle = ERA3.white;
    for (const fx of [0.2, 0.5, 0.8]) ctx.fillRect(x + Math.round(w * fx), y, sw, Math.round(h * 0.8));
    ctx.fillRect(x, y + Math.round(h * 0.3), w, sw);
    ctx.strokeStyle = ERA3.white; ctx.lineWidth = sw;
    ctx.beginPath(); ctx.moveTo(x + w * 0.02, y + h * 0.05); ctx.lineTo(x + w * 0.42, y + h * 0.7); ctx.stroke();
    // the pins: two places already on the list, and the one in her member's post
    const r = Math.max(2.5, h * 0.13);
    const pin = (cx: number, cy: number, col: string, struck = false): void => {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(cx, cy - r * 1.7, r, Math.PI * 0.85, Math.PI * 2.15); ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = ERA3.white; ctx.beginPath(); ctx.arc(cx, cy - r * 1.7, r * 0.42, 0, Math.PI * 2); ctx.fill();
      if (struck) {
        ctx.strokeStyle = ERA3.ink; ctx.lineWidth = Math.max(1, r * 0.35);
        ctx.beginPath(); ctx.moveTo(cx - r * 1.4, cy - r * 3.1); ctx.lineTo(cx + r * 1.4, cy - r * 0.3); ctx.stroke();
      }
    };
    pin(x + w * 0.3, y + h * 0.62, ERA3.amber);
    pin(x + w * 0.88, y + h * 0.5, ERA3.amber);
    pin(x + w * 0.64, y + h * 0.74, this.by ? ERA3.grey : ERA3.alarm, !!this.by);
    ctx.restore();
  }

  /** ⚑ S433 (UiB job 40) — the lesson's moment, for its NOW line ("Add The Wick, or leave it off." / "Back to Today, for step 4.") */
  nowMoment(): string { return this.by ? 'done' : 'turn'; }

  draw(ctx: CanvasRenderingContext2D, a0: TaskArea, hit: (r: TaskHit) => void): void {
    // (⚑ S424's heading "Lesson 2 · The places list" over the job is retired at S433: the lesson's head, drawn by the workstation
    //  over this area, carries the training's step, what it teaches and the NOW line. s3_places.json `lessonHeading` kept.)
    const a = a0;
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
    // ⚑ S424 (storyboard beat 6: "The platform marks 'The Wick, upstairs on Fenn Street' in it") — while the place is only
    //   proposed, the platform's selection lies under its words in her sentence (the editor's in/out grammar, S386): a band and a
    //   red rule under the place. Her words are untouched; once listed, the place is the platform's grey bracket, as before.
    if (!this.by) {
      const full = lines.join(' '), at0 = full.indexOf(P.post.place), at1 = at0 + P.post.place.length;
      let off = 0;
      lines.forEach((ln, i) => {
        const s0 = Math.max(at0, off), s1 = Math.min(at1, off + ln.length);
        if (at0 >= 0 && s1 > s0) {
          const lx = a.x + 16 + ctx.measureText(ln.slice(0, s0 - off)).width, lw = ctx.measureText(ln.slice(s0 - off, s1 - off)).width;
          const ly = cardY + 40 + i * 17;
          px(ctx, Math.round(lx) - 1, ly - 2, Math.ceil(lw) + 2, 16, ERA3.lambBand);
          px(ctx, Math.round(lx) - 1, ly + 14, Math.ceil(lw) + 2, 1, ERA3.alarm);
        }
        off += ln.length + 1;
      });
    }
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
    // ⚑ S433 (UiB job 40; HEADSET_RUN finding 24: "the lesson's one ask is not the loudest thing on the page") — the rule's own title
    //   ("Add the place to the list", s3_places.json `rule`) is retired from the panel: the lesson's NOW row says the ask, loudest, at
    //   the top of the page. The panel keeps Lambient's lesson and the two answers.
    setFont(ctx, 11); ctx.fillStyle = ERA3.greyDk;
    const why = wrapText(ctx, P.ruleWhy, leftW - 20);
    why.forEach((ln, i) => ctx.fillText(ln, a.x + 10, py + 10 + i * 13));
    const ny = py + 14 + why.length * 13;
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
    // ⚑ S429 (UiB job 38 C2; his 26 Nov: "the back to today button is on top of the trending panel") — the finished lesson's way back
    //   sits in the page's own top row, where the small Back to Today stood while the lesson ran (that row is empty once it is done:
    //   graceQueueLite drawSurface), at the left, over nothing. At the area's right foot it lay over the Trending panel's last line
    //   ("The Continental Wire"), and neither column has a free foot for it: the left one ends 48 px under the rule's last button, the
    //   right one in the Trending panel.
    // ⚑ S429b (G4; it touched the title bar above and the heading below) — the same size and place as the Back to Today every lesson
    //   page has in that row while it runs (graceQueueLite drawSurface: 96 × 18), lit blue now that the lesson is done
    this.backAt = this.by ? { x: a0.x, y: a0.y - 28, w: 96, h: 18 } : null;
    // ── the list ───────────────────────────────────────────────────────────────
    setFont(ctx, 10); ctx.fillStyle = ERA3.greyDk; ctx.fillText(P.listHeading, rx, a.y);
    setFont(ctx, 9); ctx.fillStyle = ERA3.grey; ctx.fillText(P.listSub, rx, a.y + 14);
    let ly = a.y + 30;
    const row = (label: string, state: 'on' | 'proposed' | 'new'): void => {
      const t = state === 'proposed' ? P.proposed : state === 'new' && this.by ? doneByLabel(this.by) : '';
      // ⚑ S429b (G3; "Reading group · Thursdays, the librar" was cut at its row's right edge, in 5185e4f1 already) — a place too long
      //   for its row takes a second line, as a tagged row carries its tag on one; nothing is cut and no word changes
      setFont(ctx, 10);
      const lines = wrapText(ctx, label, rw - 18);
      const h = 10 + lines.length * 12 + (t ? 12 : 0);   // one line, no tag: 22; one line and a tag: 34 (as built)
      px(ctx, rx, ly, rw, h, state === 'proposed' ? ERA3.sysBand : ERA3.white);
      px(ctx, rx, ly, 3, h, state === 'proposed' ? ERA3.amber : ERA3.alarm);
      ctx.fillStyle = state === 'proposed' ? ERA3.greyDk : ERA3.ink;
      lines.forEach((ln, i) => ctx.fillText(ln, rx + 10, ly + 5 + i * 12));
      if (t) { setFont(ctx, 8); ctx.fillStyle = state === 'new' ? ERA3.alarm : ERA3.greyDk; ctx.fillText(t, rx + 10, ly + 8 + lines.length * 12); }
      ly += h + 4;
    };
    for (const l of P.list) row(l, 'on');
    row(P.newRow, this.by ? 'new' : 'proposed');
    // (⚑ S429 — the foot no longer keeps 46 px for the finished lesson's way back: it is in the page's top row, `backSlot`)
    drawTrending(ctx, rx, ly + 8, rw, a.y + a.h - ly - 12);
  }

  private backAt: { x: number; y: number; w: number; h?: number } | null = null;
  backSlot(): { x: number; y: number; w: number; h?: number } | null { return this.backAt; }

  press(id: string): boolean {
    if (this.by) return false;
    if (id === 'places-add') { this.finish('you'); return true; }
    if (id === 'places-refuse') {
      const ans = refuse(P.refusedWhat, 'places');
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
