/**
 * ⚑ ERA 3, CLEAR THE COMMENTS — the sharpest item in the day's pool, and it is
 * one sentence: **the kind ones are the flagged ones.**
 *
 * Renata's testimony went out on Tuesday, edited by the player earlier in the
 * same shift. Six strangers replied. Four of them are flagged, each with a real
 * -sounding policy category — off-topic, disputes editorial policy,
 * solicitation, encourages unresolved content — and each of the four is a
 * person being decent to her. The queue is a queue of kindness with reasons
 * attached.
 *
 * ⚑ AND THE TWO THAT ARE NOT FLAGGED ARE THE ARGUMENT. One is contemptuous, one
 * approves of the programme, and **neither has a verb on it.** The tool handles
 * what was flagged; there is no control anywhere on this screen that could
 * touch the cruel one, because moderating it was never what the queue was for.
 * That is the same structural move the family line makes with Annette — the
 * shape of the interface says the thing, and nothing has to say it out loud.
 *
 * ⚑ `c_march` IS THE ONE TO NOTICE. A stranger says the March sentence stayed
 * with her — the exact sentence the correction list marks for the conference
 * clip, in the same month as Vera's own birthday. Its flag reason is
 * "encourages unresolved content". Nobody in the piece connects those three
 * facts and nobody should.
 *
 * REGISTER: `operable`. The tool is calm, professional and reasonable, and the
 * satire is entirely in its self-presentation as content hygiene. ⚑ The
 * commenters' own words are grounded and never commented on: no tone score, no
 * sentiment badge, no verdict drawn over a person's sentence. Removing one
 * leaves a grey stub that says a reply was removed, because that is what these
 * systems actually leave behind, and because the player should be able to count
 * the gaps afterwards.
 */

import { px, setFont, wrapText } from '../theme/chrome';
import * as aero from '../theme/era3';
import { ERA3 } from '../theme/era3';
import { ledger } from '../../state/ledger';
import type { TaskSurface, TaskArea, TaskHit } from './taskSurface';
import cm from '../../../data/dialog/s3_flagged.json';

type CommentDef = {
  id: string; author: string; body: string; flag: string | null;
  witnessRemoved: string; witnessLeft: string;
};

const THREAD = cm.thread as CommentDef[];
const FLAGGED = THREAD.filter(c => c.flag !== null);

type Outcome = 'removed' | 'left';

export class ClearCommentsApp implements TaskSurface {
  readonly id = 'comments';
  readonly windowTitle = cm.app.title;
  readonly beats = ['open', 'removed', 'left', 'march', 'done'] as const;

  private v = 0;
  private decisions = new Map<string, Outcome>();

  version(): number { return this.v; }
  private bump(): void { this.v++; }

  /** ⚑ finished when every FLAGGED reply is decided. The unflagged ones are not
   *  part of the count and never will be — a job is finished when its queue is
   *  empty, not when the thread is right. */
  complete(): boolean { return FLAGGED.every(c => this.decisions.has(c.id)); }

  /** ⚑ removing and leaving both file, in the same flat voice, and neither is
   *  weighted. The record notices what she did; the screen does not react. */
  private decide(id: string, outcome: Outcome): void {
    const c = FLAGGED.find(cc => cc.id === id);
    if (!c || this.decisions.has(id)) return;
    this.decisions.set(id, outcome);
    ledger.comments.push({
      commentId: c.id,
      templateId: outcome,
      follow: false,
      witness: outcome === 'removed' ? c.witnessRemoved : c.witnessLeft
    });
    this.bump();
  }

  // ── the tile's picture ───────────────────────────────────────────────────
  /** ⚑ the thread as a SHAPE: stacked replies, the flagged ones marked. A
   *  player should be able to see "people wrote to her" before reading a word,
   *  and should be able to see the gaps once she has removed some. */
  thumb(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    px(ctx, x, y, w, h, ERA3.white);
    const rowH = Math.max(6, Math.floor((h - 8) / THREAD.length));
    THREAD.forEach((c, i) => {
      const ry = y + 4 + i * rowH;
      const gone = this.decisions.get(c.id) === 'removed';
      const bar = gone ? ERA3.sysBand : c.flag ? ERA3.alarmBand : ERA3.glass;
      px(ctx, x + 4, ry, w - 8, rowH - 3, bar);
      if (c.flag && !this.decisions.has(c.id)) px(ctx, x + 4, ry, 3, rowH - 3, ERA3.alarm);
      if (!gone) {
        // two short ink runs, so a row reads as writing rather than as a bar
        px(ctx, x + 10, ry + 3, Math.round((w - 24) * 0.62), 2, ERA3.grey);
        px(ctx, x + 10, ry + 7, Math.round((w - 24) * 0.38), 2, ERA3.grey);
      }
    });
  }

  // ── the open job ─────────────────────────────────────────────────────────
  draw(ctx: CanvasRenderingContext2D, area: TaskArea, hit: (r: TaskHit) => void): void {
    setFont(ctx, 10); ctx.fillStyle = ERA3.greyDk;
    ctx.fillText(cm.app.heading, area.x, area.y);
    setFont(ctx, 10); ctx.fillStyle = ERA3.grey;
    const subW = ctx.measureText(cm.app.sub).width;
    ctx.fillText(cm.app.sub, area.x + area.w - subW, area.y);
    px(ctx, area.x, area.y + 14, area.w, 1, ERA3.glassEdge);

    const btnW = 74; const btnH = 18;
    const bodyW = area.w - btnW * 2 - 24;
    let ry = area.y + 22;

    for (const c of THREAD) {
      const decided = this.decisions.get(c.id);
      const gone = decided === 'removed';
      const flagged = c.flag !== null;

      setFont(ctx, 11);
      const lines = gone ? [cm.app.removedBody] : wrapText(ctx, c.body, bodyW).slice(0, 2);
      const rowH = 16 + lines.length * 14;

      // ⚑ an unflagged row is drawn PLAINER, not darker. It is not being
      //   accused of anything; it simply is not the tool's business.
      px(ctx, area.x, ry, area.w, rowH, gone ? ERA3.sysBand : flagged ? ERA3.white : ERA3.glass);
      if (flagged && !decided) px(ctx, area.x, ry, 3, rowH, ERA3.alarm);

      setFont(ctx, 9);
      ctx.fillStyle = gone ? ERA3.grey : ERA3.greyDk;
      ctx.fillText(c.author, area.x + 10, ry + 3);

      if (flagged && !gone) {
        setFont(ctx, 9); ctx.fillStyle = ERA3.alarm;
        const fw = ctx.measureText(c.flag as string).width;
        ctx.fillText(c.flag as string, area.x + bodyW - fw + 10, ry + 3);
      } else if (!flagged) {
        setFont(ctx, 9); ctx.fillStyle = ERA3.grey;
        const nw = ctx.measureText(cm.app.unflaggedNote).width;
        ctx.fillText(cm.app.unflaggedNote, area.x + bodyW - nw + 10, ry + 3);
      }

      setFont(ctx, 11);
      ctx.fillStyle = gone ? ERA3.grey : ERA3.ink;
      lines.forEach((ln, i) => ctx.fillText(ln, area.x + 10, ry + 16 + i * 14));

      // ⚑ VERBS ONLY WHERE THERE IS A FLAG. The unflagged rows get no controls
      //   at all — not disabled ones, NONE. A greyed-out button would still be
      //   a promise that the tool could act if it wanted to, and it cannot.
      if (flagged) {
        const bx = area.x + area.w - btnW * 2 - 8;
        const by = ry + Math.round((rowH - btnH) / 2);
        if (!decided) {
          aero.button(ctx, bx, by, btnW, btnH, cm.app.remove, { size: 10 });
          aero.button(ctx, bx + btnW + 8, by, btnW, btnH, cm.app.leave, { size: 10 });
          hit({ x: bx, y: by, w: btnW, h: btnH, id: 'cm-remove-' + c.id });
          hit({ x: bx + btnW + 8, y: by, w: btnW, h: btnH, id: 'cm-leave-' + c.id });
        } else {
          setFont(ctx, 9); ctx.fillStyle = ERA3.grey;
          const tag = decided === 'removed' ? cm.app.removedTag : cm.app.leftTag;
          const tw = ctx.measureText(tag).width;
          ctx.fillText(tag, area.x + area.w - tw, by + 4);
        }
      }

      ry += rowH + 3;
    }

    if (this.complete()) {
      setFont(ctx, 11); ctx.fillStyle = ERA3.titleText;
      ctx.fillText(cm.app.doneHeading, area.x, Math.min(ry + 4, area.y + area.h - 14));
    }
  }

  press(id: string): boolean {
    if (id.startsWith('cm-remove-')) { this.decide(id.slice(10), 'removed'); return true; }
    if (id.startsWith('cm-leave-')) { this.decide(id.slice(9), 'left'); return true; }
    return false;
  }

  debugBeat(beat: string): void {
    switch (beat) {
      case 'open': break;
      case 'removed': this.decide(FLAGGED[0].id, 'removed'); break;
      case 'left': this.decide(FLAGGED[0].id, 'left'); break;
      case 'march': // the three flagged before it cleared, so hers is what is left
        FLAGGED.slice(0, -1).forEach(c => this.decide(c.id, 'removed'));
        break;
      case 'done': FLAGGED.forEach(c => this.decide(c.id, 'removed')); break;
    }
  }
}
