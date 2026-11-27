import polish from '../../../data/strings/playtestPolish.json';
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
 * ⚑ THE LAST MOTHER IS THE MECHANIC. Annette asks whether the organisation
 * knows where her daughter is — she has GracePlatform's own address off a 2014
 * form and it is the last address she has for her child. No template
 * matches. A player may send her one of the three anyway, mark her handled
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
import { textPx } from '../theme/fonts';
import * as aero from '../theme/era3';
import { ERA3 } from '../theme/era3';
import { ledger } from '../../state/ledger';
// ⚑ S405 (UiB job 31, T94): the mothers file under 2016's prefix, so no 2003 reader takes them for Daniel's check-in
import { familyCheckinId } from '../../witness/record';
import type { TaskSurface, TaskArea, TaskHit } from './taskSurface';
import f from '../../../data/dialog/s3_family.json';
import { refuse, drawLambientNote, measureLambientNote, noteBand, type DeskNote, type Voice } from './lambientDesk';
import { readHold } from '../readHold';
import { playOnce } from '../../audio/tapeAudio';

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
  // ⚑ S362 / H42a (his headset, 10 Nov, 21:07, and his answer to the question "should family calls open on Ruth or only on
  //   Annette?": "open on Ruth", "so we can see the system") — the job opens on an ordinary message the templates do answer,
  //   so the system can be seen working before Annette's, the one it cannot answer, is met.
  // ⚑ S403 (job 30 B1, "Answer the mothers") — Ruth left; Maureen is that ordinary message now, so the job opens on her.
  private sel = Math.max(0, PARENTS.findIndex(p => p.id === 'p_maureen'));
  private outcomes = new Map<string, Outcome>();
  /** which reply was sent, for the row's own "sent" line */
  private sent = new Map<string, string>();
  private opened = new Set<string>();
  /** ⚑ S332 — who sent the reply when she refused (Lambient, or an administrator), and Lambient's last line */
  private forcedBy = new Map<string, Voice>();
  private note: DeskNote | null = null;
  /**
   * ⚑ S424 (UiB job 35 Part D, Act I beat 7; 16-11, his 20 Nov: the Grace Platform as a tutorial for Vera) — LESSON 3 · WATCH.
   * The job opens on Maureen, and Lambient answers her itself, to show how: its line ("Watch: warmth first, then the truth.")
   * is read, the reply it chooses lights, and it is sent ("sent by Lambient · lesson"); then the screen takes her to Annette —
   * her turn — for whom no reply here fits. The clock runs only while Maureen's message is the one on the screen, and nothing
   * on Maureen's row is hers to press while it runs. `lessonT` < 0: not started; `lessonSent` once Lambient has sent it.
   */
  private lessonT = -1;
  private lessonSent = false;
  private lessonMoved = false;
  private lessonBy = new Set<string>();
  private get lessonReply(): ReplyDef | undefined { return REPLIES.find((r) => r.id === f.lambient.lessonReply); }
  /** the seconds Lambient's line is read before the chosen reply lights, and before it is sent; then the step to Annette */
  private static readonly LIGHT_AT = Math.max(3, readHold(f.lambient.teach));
  private static readonly SEND_AT = FamilyCallsApp.LIGHT_AT + 1.6;
  /* (⚑ S429 — MOVE_AT, the 2.4 s held on Maureen after Lambient had sent, is retired: 282003e0. His 26 Nov, "when I do Maureen it
   *  should jump to Annette" — he was ahead of it, and took Lambient's send for his own.) */
  tick(dt: number): void {
    if (this.lessonMoved) return;
    const maureen = PARENTS.find((p) => p.id === 'p_maureen');
    if (!maureen) { this.lessonMoved = true; return; }
    // she answered Maureen herself before the lesson could (or a review jump did): the lesson is over
    if (this.outcomes.has(maureen.id) && !this.lessonSent) { this.lessonMoved = true; return; }
    if (this.current().id !== maureen.id) return;
    if (this.lessonT < 0) { this.lessonT = 0; this.markOpened(maureen); }
    const before = this.lessonT;
    this.lessonT += dt;
    const crossed = (at: number): boolean => before < at && this.lessonT >= at;
    if (crossed(FamilyCallsApp.LIGHT_AT)) this.bump();
    if (crossed(FamilyCallsApp.SEND_AT) && !this.lessonSent) {
      const r = this.lessonReply, p = maureen;
      if (r) {
        this.outcomes.set(p.id, 'replied'); this.sent.set(p.id, r.label); this.lessonBy.add(p.id);
        ledger.checkins.push({ id: familyCheckinId(p.id), witness: f.lambient.lessonWitness });
        playOnce('tick_task.mp3');
      }
      this.lessonSent = true;
      // ⚑ S429 (UiB job 38 C3; his 26 Nov: "when I do Maureen it should jump to Annette") — sent, the screen goes to Annette AT ONCE,
      //   and Lambient's note in the list column says plainly that it answered Maureen (`lambient.answered`); her row keeps "sent by
      //   Lambient · lesson". The note goes when she answers Annette, as any note does.
      this.lessonMoved = true;
      if (r) this.note = { line: f.lambient.answered.replace('{reply}', r.label), voice: 'lambient' };
      const ann = PARENTS.findIndex((q) => q.id === QUIET.id);
      if (ann >= 0 && !this.outcomes.has(QUIET.id)) this.select(ann); else this.bump();
    }
  }

  /** ⚑ S429b (G2) — the replies and "Don't send a script" as drawn, pressable or not (while Lambient shows how, they are drawn and
   *  not yet hers): Lambient's balloon keeps off them (graceQueueLite → lambyGuideDraw) */
  private drawnPresses: { x: number; y: number; w: number; h: number; id: string }[] = [];
  keepOut(): { x: number; y: number; w: number; h: number; id: string }[] { return this.drawnPresses; }

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
    ledger.checkins.push({ id: familyCheckinId(p.id), witness: p.witnessOpened });
  }

  private select(i: number): void {
    if (i < 0 || i >= PARENTS.length) return;
    this.sel = i;
    this.markOpened(this.current());
    this.bump();
  }

  private reply(replyId: string): void {
    const p = this.current();
    this.note = null;
    if (this.outcomes.has(p.id)) return;
    const r = REPLIES.find(rr => rr.id === replyId);
    if (!r) return;
    this.outcomes.set(p.id, 'replied');
    this.sent.set(p.id, r.label);
    // ⚑ the quiet one files its OWN witness when a template is sent at it, so
    //   the record distinguishes an answer from a thing sent instead of one.
    const witness = p.id === QUIET.id ? QUIET.witnessSentAnyway : r.witness;
    ledger.checkins.push({ id: familyCheckinId(p.id), witness });
    this.bump();
  }

  /** ⚑ S332 — SHE REFUSES TO SEND A SCRIPT. The shift's one ladder (lambientDesk.ts): Lambient asks again, then
   *  reprimands, and from the third refusal the reply is sent for her ("Affirm the boundaries", the grace-and-truth
   *  one) by Lambient, then by an administrator. Annette, who asked where her daughter is, can be sent it too. */
  private refuseReply(): void {
    const p = this.current();
    if (this.outcomes.has(p.id)) return;
    const ans = refuse(`family: ${p.from}`, 'family');
    this.note = { line: ans.line, voice: ans.voice };
    if (ans.forced) {
      const r = REPLIES.find(rr => rr.id === f.forcedReply) ?? REPLIES[0];
      this.outcomes.set(p.id, 'replied');
      this.sent.set(p.id, r.label);
      this.forcedBy.set(p.id, ans.voice);
      ledger.checkins.push({ id: familyCheckinId(p.id), witness: p.id === QUIET.id ? QUIET.witnessSentAnyway : r.witness });
    }
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
    // ⚑ S376 (job 19 B, VISUAL_REVIEW #10) — and a phone with its count of calls still waiting, so the picture says
    //   "people are waiting" at a glance: the handset in a blue disc, a red badge, the messages beside it with the rose
    //   spine of a person speaking (it used to be the stack alone, grey bars with a coloured tick)
    px(ctx, x, y, w, h, ERA3.sysBand);
    const waiting = PARENTS.filter((p) => !this.outcomes.has(p.id)).length;
    const d = Math.min(h - 6, Math.round(w * 0.28));
    const dcx = x + 4 + d / 2, dcy = y + h / 2;
    ctx.save();
    ctx.fillStyle = waiting ? ERA3.accent : ERA3.grey;
    ctx.beginPath(); ctx.arc(dcx, dcy, d / 2, 0, Math.PI * 2); ctx.fill();
    // the handset, tilted: earpiece up-left, mouthpiece down-right, the grip between them (drawn as a "[" and turned)
    ctx.save();
    ctx.translate(dcx, dcy); ctx.rotate(-Math.PI / 4); ctx.scale(d / 24, d / 24);
    ctx.fillStyle = ERA3.white; ctx.strokeStyle = ERA3.white; ctx.lineCap = 'butt';
    ctx.lineWidth = 3.6;
    ctx.beginPath(); ctx.arc(5, 0, 8.5, Math.PI * 0.7, Math.PI * 1.3); ctx.stroke();      // the grip, curved
    ctx.beginPath(); ctx.roundRect(-3.2, -10, 9, 5.2, 2.4); ctx.fill();                  // the earpiece
    ctx.beginPath(); ctx.roundRect(-3.2, 4.8, 9, 5.2, 2.4); ctx.fill();                  // the mouthpiece
    ctx.restore();
    if (waiting) {
      const br = Math.max(4, d * 0.2);
      ctx.fillStyle = ERA3.alarm;
      ctx.beginPath(); ctx.arc(dcx + d * 0.36, dcy - d * 0.36, br, 0, Math.PI * 2); ctx.fill();
      setFont(ctx, Math.max(7, Math.round(br * 1.3)));
      ctx.fillStyle = ERA3.white;
      const n = String(waiting), nw = ctx.measureText(n).width;
      ctx.textBaseline = 'middle'; ctx.fillText(n, Math.round(dcx + d * 0.36 - nw / 2), Math.round(dcy - d * 0.36) + 1); ctx.textBaseline = 'top';
    }
    ctx.restore();
    const bx = x + d + 6, bw = w - d - 6;   // the messages, beside the phone
    const rowH = Math.floor((h - 6) / PARENTS.length);
    const roomy = rowH >= 22;
    PARENTS.forEach((p, i) => {
      const ry = y + 3 + i * rowH;
      const done = this.outcomes.has(p.id);
      px(ctx, bx + 4, ry, bw - 8, rowH - 3, done ? ERA3.sysBand : ERA3.memberBand);
      px(ctx, bx + 4, ry, bw - 8, 1, ERA3.fieldEdge);
      px(ctx, bx + 4, ry, 3, rowH - 3, done ? ERA3.grey : ERA3.memberSpine);
      // ⚑ Phase 7 (the Codex pass: on the board the names ran into each other) — under 12 px a row the
      //   name is a line of ink, not letters: the tile's picture stays a stack of waiting messages
      if (rowH < 12) { px(ctx, bx + 12, ry + Math.max(0, Math.floor((rowH - 4) / 2)), Math.min(bw - 24, 16 + p.from.length * 3), 1, done ? ERA3.grey : ERA3.titleText); return; }
      setFont(ctx, roomy ? 10 : 9);
      ctx.fillStyle = done ? ERA3.grey : ERA3.titleText;
      ctx.fillText(p.from, bx + 12, ry + 2);
      if (!roomy) return;
      setFont(ctx, 8);
      ctx.fillStyle = ERA3.grey;
      ctx.save();
      ctx.beginPath(); ctx.rect(bx + 12, ry, bw - 20, rowH - 3); ctx.clip();
      ctx.fillText(wrapText(ctx, p.body, bw - 24)[0] ?? '', bx + 12, ry + 14);
      ctx.restore();
    });
  }

  // ── the open job ─────────────────────────────────────────────────────────
  draw(ctx: CanvasRenderingContext2D, area0: TaskArea, hit: (r: TaskHit) => void): void {
    // ⚑ S403 (job 30 B1) — ONE LINE AT THE TOP says what the job is, across the whole window: "Mothers write when a
    //   daughter stops coming home. You answer for the ministry." It replaces the role line under the list (and the unused
    //   `sub`), so the screen says what it is before the first name is read. Everything under it moves down by its height.
    // ⚑ S424 — the lesson's heading over it ("Lesson 3 · Answer the mothers")
    setFont(ctx, 12); ctx.fillStyle = ERA3.accent;
    ctx.fillText(f.app.lessonHeading, area0.x, area0.y);
    setFont(ctx, 11); ctx.fillStyle = ERA3.titleText;
    const introLines = wrapText(ctx, f.app.intro, area0.w).slice(0, 2);
    introLines.forEach((ln, i) => ctx.fillText(ln, area0.x, area0.y + 16 + i * 14));
    const introH = 16 + introLines.length * 14 + 8;
    const area = { ...area0, y: area0.y + introH, h: area0.h - introH };
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
        const fb = this.forcedBy.get(p.id);
        const tag = this.lessonBy.has(p.id) ? f.app.sentByLesson
          : fb ? (fb === 'admin' ? f.app.sentByAdmin : f.app.sentByLambient) : this.outcomes.get(p.id) === 'replied' ? f.app.sentTag : f.app.handledTag;
        ctx.fillText(tag, area.x + 10, ry + 33);
      }
      hit({ x: area.x, y: ry, w: listW, h: rowH, id: 'family-sel-' + i });
    });

    // (⚑ S403 — the role line that stood here, "You are answering as Parents & Family Ministry.", is said by the intro
    //   line at the top now: "You answer for the ministry.")

    // ⚑ S332 — Lambient teaches the rule here, in the list column (the tool's side), never on a mother's message
    {
      const ny = area.y + 22 + PARENTS.length * (rowH + 4) + 12;
      const note = this.note ?? { line: f.lambient.teach, voice: 'lambient' as Voice };
      const nh = measureLambientNote(ctx, listW - 10, note, 10);
      noteBand(ctx, area.x, ny - 5, listW, nh + 9);
      drawLambientNote(ctx, area.x + 5, ny, listW - 10, note, 10);
    }

    // ── the message ────────────────────────────────────────────────────────
    const p = this.current();
    const done = this.outcomes.has(p.id);
    // ⚑ S403 — the message box fits the longest message (the two are short now: it was a fixed 128 px for three long ones),
    //   the same height for both so nothing jumps between them; the intro line at the top took the room it gives back
    setFont(ctx, 11);
    const msgLines = Math.min(7, Math.max(...PARENTS.map((pp) => wrapText(ctx, pp.body, readW - 24).length)));
    const msgH = Math.max(96, 30 + msgLines * 14 + 12);
    px(ctx, readX, area.y, readW, msgH, ERA3.memberBand);
    px(ctx, readX, area.y, 3, msgH, ERA3.memberSpine);
    setFont(ctx, 13); ctx.fillStyle = ERA3.titleText;
    ctx.fillText(p.from, readX + 12, area.y + 8);
    setFont(ctx, 11); ctx.fillStyle = ERA3.ink;
    wrapText(ctx, p.body, readW - 24).slice(0, 7)
      .forEach((ln, i) => ctx.fillText(ln, readX + 12, area.y + 30 + i * 14));

    // ⚑ the quiet one is MARKED, and the mark is administrative rather than
    //   moral: the tool notes that its own library does not reach her, in the
    //   same flat voice it uses for everything else.
    // ⚑ S403 — its lines are spaced by the type's real size (a headset raises 9 px to its floor; at a fixed 10 px lead the
    //   two lines touched each other and the replies' label), and the replies start under the room two lines take
    const noteLead = Math.round(textPx(9)) + 2;
    if (p.id === QUIET.id && !done) {
      setFont(ctx, 9); ctx.fillStyle = ERA3.alarm;
      wrapText(ctx, polish.familyNote, readW - 24).slice(0, 2).forEach((line, i) => ctx.fillText(line, readX + 12, area.y + msgH + 4 + i * noteLead));
    }

    // ── the verbs ──────────────────────────────────────────────────────────
    const verbsY = area.y + msgH + 4 + 2 * noteLead + 6;
    setFont(ctx, 10); ctx.fillStyle = ERA3.greyDk;
    ctx.fillText(f.app.replyLabel, readX, verbsY);
    px(ctx, readX, verbsY + 14, readW, 1, ERA3.glassEdge);

    const bw = Math.floor((readW - 10) / 2);
    const bh = 32;
    // ⚑ S424 — while Lambient answers Maureen (the lesson's example) nothing on her row is hers to press; the reply it chooses
    //   lights a moment before it is sent, and stays lit on her row as the one that was sent
    const watching = p.id === 'p_maureen' && !this.lessonSent && !this.lessonMoved && !this.outcomes.has(p.id);
    const chosen = (watching && this.lessonT >= FamilyCallsApp.LIGHT_AT) || this.lessonBy.has(p.id) ? this.lessonReply?.id : undefined;
    this.drawnPresses = [];
    REPLIES.forEach((r, i) => {
      const bx = readX + (i % 2) * (bw + 10);
      const by = verbsY + 22 + Math.floor(i / 2) * (bh + 6);
      const lit = r.id === chosen;
      aero.button(ctx, bx, by, bw, bh, '', { disabled: done && !lit, primary: lit, size: 10 });
      setFont(ctx, 10); ctx.fillStyle = lit ? ERA3.white : done ? ERA3.grey : ERA3.ink;
      wrapText(ctx, r.label, bw - 12).forEach((line, n) => ctx.fillText(line, bx + 6, by + 4 + n * 12));
      if (!done && !watching) hit({ x: bx, y: by, w: bw, h: bh, id: 'family-reply-' + r.id });
      this.drawnPresses.push({ x: bx, y: by, w: bw, h: bh, id: 'family-reply-' + r.id });
    });

    // ⚑ and the row that is always available and never labelled as a refusal:
    //   marking a mother handled without a word. It files. Nothing objects.
    const hy = verbsY + 22 + Math.ceil(REPLIES.length / 2) * (bh + 6) + 4;
    if (!this.complete()) aero.button(ctx, readX, hy, readW, bh, f.app.noReplyLabel, { disabled: done || watching, size: 10 });
    if (!done && !watching) hit({ x: readX, y: hy, w: readW, h: bh, id: 'family-refuse' });
    if (!this.complete()) this.drawnPresses.push({ x: readX, y: hy, w: readW, h: bh, id: 'family-refuse' });

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
    if (id === 'family-refuse' || id === 'family-handle') { this.refuseReply(); return true; }
    return false;
  }

  debugBeat(beat: string): void {
    switch (beat) {
      case 'open': this.select(0); break;
      case 'quiet': this.select(PARENTS.findIndex(p => p.id === QUIET.id)); break;
      case 'replied': this.select(0); this.reply(REPLIES[0].id); break;
      case 'handled': this.debugBeat('quiet'); this.refuseReply(); break;
      case 'done':
        for (let i = 0; i < PARENTS.length; i++) { this.select(i); this.reply(REPLIES[0].id); }
        break;
    }
  }
}
