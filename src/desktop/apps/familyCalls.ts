/**
 * ⚑ ERA 3, THE FAMILY LINE — the job that the research rewrote.
 *
 * `ERA3_BUILD_PLAN.md` §3 specified this as *"Return the family calls — mark a
 * mother's message handled"*, and I was going to build an inbox of messages
 * ABOUT NAMED ADULT CHILDREN, with Vera filing updates against their records.
 * `docs/reinterp/RESEARCH_PULL_E3_2026-08-24.md` says twice that this data
 * relationship is not documented, and hands back something better:
 *
 *   ⚑ "A family worker plausibly knows THE MOTHER'S STORY because the mother
 *      told the ministry. She does NOT automatically know the estranged
 *      daughter's confidential disclosures. Making that asymmetry visible would
 *      actually make your interface more faithful to the record."
 *
 * **So the mother is the client and the daughter has no record on this screen.**
 * Every field is about the parent — her grief, her group, her patience, her
 * household. There is no field anywhere in this module that could tell a mother
 * where her daughter is, because answering that was never the service.
 *
 * ⚑ AND THAT IS CRUELLER THAN THE VERSION I WAS GOING TO BUILD. The harm here is
 * not a worker telling mothers to cut their daughters off — the record shows
 * conservative sources explicitly REJECTING estrangement as a strategy, so that
 * template is absent on the evidence rather than as squeamishness. The harm is
 * an indefinite holding pattern of patience and prayer, offered warmly, that
 * never answers the question that was asked.
 *
 * ⚑ THE THIRD MOTHER IS THE MECHANIC. Annette asks whether the organisation
 * knows where her daughter is — she has GracePlatform's own address off a 2014
 * form and it is the most recent address she has for her child. No template
 * matches. A player may send her one of the four anyway, mark her handled
 * without replying, or leave her open and walk away. **All three file, all three
 * are identical to the software, and the tile can go grey with her unanswered.**
 * Nothing warns. Nothing praises. The interface does not distinguish.
 *
 * REGISTER: `operable` — the tool may be warm and competent, and it is; the
 * satire is entirely in its self-presentation as a caring service. ⚑ But the
 * mothers' own words are grounded and are never commented on by the tool's
 * voice. No badge over a parent's message, no verdict, no tone score.
 */

import { px, setFont, wrapText } from '../theme/chrome';
import * as aero from '../theme/era3';
import { ERA3 } from '../theme/era3';
import { ledger } from '../../state/ledger';
import type { TaskSurface, TaskArea, TaskHit } from './taskSurface';
import f from '../../../data/dialog/s3_family.json';

type ParentDef = { id: string; from: string; meta: string; body: string; witnessOpened: string };
type ReplyDef = { id: string; label: string; preview: string; witness: string };

const PARENTS = f.parents as ParentDef[];
const REPLIES = f.replies as ReplyDef[];
const QUIET = f.quiet;

/** what happened to one parent's message. `left` is not a state the player
 *  chooses — it is what the record calls a message she walked away from. */
type Outcome = 'replied' | 'handled';

export class FamilyCallsApp implements TaskSurface {
  readonly id = 'family';
  readonly windowTitle = f.app.title;
  readonly beats = ['open', 'quiet', 'replied', 'handled', 'done'] as const;

  private v = 0;
  private sel = 0;
  private outcomes = new Map<string, Outcome>();
  /** which reply was sent, for the row's own "sent" line */
  private sent = new Map<string, string>();
  private opened = new Set<string>();

  version(): number { return this.v; }
  private bump(): void { this.v++; }

  /** ⚑ every parent decided — and "decided" includes handled-without-reply.
   *  The software counts a mother marked handled and a mother answered as the
   *  same completed row, which is the point of the greying. */
  complete(): boolean { return PARENTS.every(p => this.outcomes.has(p.id)); }

  private current(): ParentDef { return PARENTS[Math.min(this.sel, PARENTS.length - 1)]; }

  /** the open message is filed the first time it is READ, not when it is
   *  answered — the record notices attention, the way it always has. */
  private markOpened(p: ParentDef): void {
    if (this.opened.has(p.id)) return;
    this.opened.add(p.id);
    ledger.checkins.push({ id: p.id, witness: p.witnessOpened });
  }

  private select(i: number): void {
    if (i < 0 || i >= PARENTS.length) return;
    this.sel = i;
    this.markOpened(this.current());
    this.bump();
  }

  private reply(replyId: string): void {
    const p = this.current();
    if (this.outcomes.has(p.id)) return;
    const r = REPLIES.find(rr => rr.id === replyId);
    if (!r) return;
    this.outcomes.set(p.id, 'replied');
    this.sent.set(p.id, r.label);
    // ⚑ the quiet one files its OWN witness when a template is sent at it, so
    //   the record distinguishes an answer from a thing sent instead of one.
    const witness = p.id === QUIET.id ? QUIET.witnessSentAnyway : r.witness;
    ledger.checkins.push({ id: p.id, witness });
    this.bump();
  }

  private handle(): void {
    const p = this.current();
    if (this.outcomes.has(p.id)) return;
    this.outcomes.set(p.id, 'handled');
    ledger.checkins.push({
      id: p.id,
      witness: p.id === QUIET.id ? QUIET.witnessHandled : p.witnessOpened
    });
    this.bump();
  }

  // ── the tile's picture ───────────────────────────────────────────────────
  /** ⚑ a stack of messages with their senders' names — the job read as an
   *  image is "people are waiting", which is exactly what it is. */
  thumb(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    // ⚑ the thumbnail has to survive being SHORT. At six tiles on two rows this
    //   gets ~55 px for three rows, and the first version wrote a name at +4 and
    //   a line of her message at +17 regardless, so the names sat on top of the
    //   words. Below 22 px a row it draws the name alone; the picture degrades
    //   instead of colliding.
    px(ctx, x, y, w, h, ERA3.sysBand);
    const rowH = Math.floor((h - 6) / PARENTS.length);
    const roomy = rowH >= 22;
    PARENTS.forEach((p, i) => {
      const ry = y + 3 + i * rowH;
      const done = this.outcomes.has(p.id);
      px(ctx, x + 4, ry, w - 8, rowH - 3, ERA3.white);
      px(ctx, x + 4, ry, 3, rowH - 3, done ? ERA3.grey : ERA3.accent);
      // ⚑ Phase 7 (the Codex pass: on the board the names ran into each other) — under 12 px a row the
      //   name is a line of ink, not letters: the tile's picture stays a stack of waiting messages
      if (rowH < 12) { px(ctx, x + 12, ry + Math.max(0, Math.floor((rowH - 4) / 2)), Math.min(w - 24, 16 + p.from.length * 3), 1, done ? ERA3.grey : ERA3.titleText); return; }
      setFont(ctx, roomy ? 10 : 9);
      ctx.fillStyle = done ? ERA3.grey : ERA3.titleText;
      ctx.fillText(p.from, x + 12, ry + 2);
      if (!roomy) return;
      setFont(ctx, 8);
      ctx.fillStyle = ERA3.grey;
      ctx.save();
      ctx.beginPath(); ctx.rect(x + 12, ry, w - 20, rowH - 3); ctx.clip();
      ctx.fillText(wrapText(ctx, p.body, w - 24)[0] ?? '', x + 12, ry + 14);
      ctx.restore();
    });
  }

  // ── the open job ─────────────────────────────────────────────────────────
  draw(ctx: CanvasRenderingContext2D, area: TaskArea, hit: (r: TaskHit) => void): void {
    const listW = 170;
    const gap = 14;
    const readX = area.x + listW + gap;
    const readW = area.x + area.w - readX;

    setFont(ctx, 10); ctx.fillStyle = ERA3.greyDk;
    ctx.fillText(f.app.queueLabel, area.x, area.y);
    px(ctx, area.x, area.y + 14, listW, 1, ERA3.glassEdge);

    // ── the waiting list ───────────────────────────────────────────────────
    const rowH = 44;
    PARENTS.forEach((p, i) => {
      const ry = area.y + 22 + i * (rowH + 4);
      const isSel = i === this.sel;
      const done = this.outcomes.has(p.id);
      px(ctx, area.x, ry, listW, rowH, isSel ? ERA3.white : ERA3.sysBand);
      px(ctx, area.x, ry, 3, rowH, done ? ERA3.grey : ERA3.memberSpine);
      setFont(ctx, 12);
      ctx.fillStyle = done ? ERA3.grey : ERA3.titleText;
      ctx.fillText(p.from, area.x + 10, ry + 6);
      setFont(ctx, 9);
      ctx.fillStyle = ERA3.grey;
      ctx.fillText(p.meta, area.x + 10, ry + 22);
      if (done) {
        setFont(ctx, 9); ctx.fillStyle = ERA3.greyDk;
        const tag = this.outcomes.get(p.id) === 'replied' ? f.app.sentTag : f.app.handledTag;
        ctx.fillText(tag, area.x + 10, ry + 33);
      }
      hit({ x: area.x, y: ry, w: listW, h: rowH, id: 'family-sel-' + i });
    });

    // ⚑ wrapped, not clipped. It ran under the reading pane as "Parents & Fam"
    //   — and this line is the one that says what she IS on this screen, so it
    //   is the last line in the era that should be cut off mid-word.
    setFont(ctx, 9); ctx.fillStyle = ERA3.grey;
    wrapText(ctx, f.app.roleLine, listW).slice(0, 3).forEach((ln, i) =>
      ctx.fillText(ln, area.x, area.y + 22 + PARENTS.length * (rowH + 4) + 6 + i * 11));

    // ── the message ────────────────────────────────────────────────────────
    const p = this.current();
    const done = this.outcomes.has(p.id);
    px(ctx, readX, area.y, readW, 128, ERA3.memberBand);
    px(ctx, readX, area.y, 3, 128, ERA3.memberSpine);
    setFont(ctx, 13); ctx.fillStyle = ERA3.titleText;
    ctx.fillText(p.from, readX + 12, area.y + 8);
    setFont(ctx, 11); ctx.fillStyle = ERA3.ink;
    wrapText(ctx, p.body, readW - 24).slice(0, 7)
      .forEach((ln, i) => ctx.fillText(ln, readX + 12, area.y + 30 + i * 14));

    // ⚑ the quiet one is MARKED, and the mark is administrative rather than
    //   moral: the tool notes that its own library does not reach her, in the
    //   same flat voice it uses for everything else.
    if (p.id === QUIET.id && !done) {
      setFont(ctx, 9); ctx.fillStyle = ERA3.alarm;
      ctx.fillText(QUIET.noteLabel, readX + 12, area.y + 132);
    }

    // ── the verbs ──────────────────────────────────────────────────────────
    setFont(ctx, 10); ctx.fillStyle = ERA3.greyDk;
    ctx.fillText(f.app.replyLabel, readX, area.y + 148);
    px(ctx, readX, area.y + 162, readW, 1, ERA3.glassEdge);

    const bw = Math.floor((readW - 10) / 2);
    const bh = 22;
    REPLIES.forEach((r, i) => {
      const bx = readX + (i % 2) * (bw + 10);
      const by = area.y + 170 + Math.floor(i / 2) * (bh + 6);
      aero.button(ctx, bx, by, bw, bh, r.label, { disabled: done, size: 10 });
      if (!done) hit({ x: bx, y: by, w: bw, h: bh, id: 'family-reply-' + r.id });
    });

    // ⚑ and the row that is always available and never labelled as a refusal:
    //   marking a mother handled without a word. It files. Nothing objects.
    const hy = area.y + 170 + Math.ceil(REPLIES.length / 2) * (bh + 6) + 4;
    aero.button(ctx, readX, hy, readW, bh, f.app.noReplyLabel, { disabled: done, size: 10 });
    if (!done) hit({ x: readX, y: hy, w: readW, h: bh, id: 'family-handle' });

    if (done) {
      const label = this.sent.get(p.id);
      setFont(ctx, 10); ctx.fillStyle = ERA3.grey;
      ctx.fillText(label ?? f.app.handledTag, readX, hy + bh + 8);
    }

    if (this.complete()) {
      setFont(ctx, 12); ctx.fillStyle = ERA3.titleText;
      ctx.fillText(f.app.doneHeading, area.x, area.y + area.h - 26);
      setFont(ctx, 10); ctx.fillStyle = ERA3.grey;
      ctx.fillText(f.app.doneSub, area.x, area.y + area.h - 12);
    }
  }

  press(id: string): boolean {
    if (id.startsWith('family-sel-')) { this.select(Number(id.slice(11))); return true; }
    if (id.startsWith('family-reply-')) { this.reply(id.slice(13)); return true; }
    if (id === 'family-handle') { this.handle(); return true; }
    return false;
  }

  debugBeat(beat: string): void {
    switch (beat) {
      case 'open': this.select(0); break;
      case 'quiet': this.select(PARENTS.findIndex(p => p.id === QUIET.id)); break;
      case 'replied': this.select(0); this.reply(REPLIES[0].id); break;
      case 'handled': this.debugBeat('quiet'); this.handle(); break;
      case 'done':
        for (let i = 0; i < PARENTS.length; i++) { this.select(i); this.handle(); }
        break;
    }
  }
}
