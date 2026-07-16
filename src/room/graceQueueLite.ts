/**
 * GraceQueue — the laptop's moderation loop (Session 38, E3-ii).
 * docs/REINTERP_E3_GRACEQUEUE_CARDS_DRAFT_2026-07-13.md (the 8 cards, the
 * strip order, the tablet-side rules) + docs/REINTERP_E3_ADAPTATION_SPEC_
 * 2026-07-12.md's S3R.1 (the queue trains the eye) and S3R.5 (Mira's card
 * tests it). Mining FIND #7 Option B: the strip quietly trains the player's
 * eye on what "safe" looks like, so when Mira's off-script-but-true card
 * enters, the trained eye almost flags her before the player consciously
 * decides.
 *
 * Session 37's maximized-UI lesson carries forward explicitly: ONE card at a
 * time, big type, no crowding — this is deliberately simpler/roomier than the
 * shipped (non-reinterp) build's dense triage strip in
 * update-available/src/desktop/apps/graceQueue.ts, though it borrows that
 * file's LANE GRAMMAR verbatim (warm-cream member band + rose spine = a real
 * person; clinical/amber system band = the automated flag; soft-blue
 * Lambient foot band, no mascot window — distributed per FIND #6).
 *
 * Verbs: on-script cards get one verb (Approve). Off-script + Mira's card
 * get two: [Move to review] (the system's own suggestion — tinted, marked
 * "▲ system suggests") and [Let it stand] (un-tinted, "your call"). Every
 * action files witness-symmetrically to ledger.graceQueue — both off-script
 * outcomes are data, never silence (CLAUDE.md witness-symmetry law). No
 * scores/streaks/progress count are ever shown or derived (CLAUDE.md +
 * this session's brief, explicit).
 *
 * Mira (id 8, data/dialog/s3_queue.json) enters the strip dynamically, the
 * moment `miraGateFlags` (2) off-script cards have been sent to review — not
 * a fixed slot in `order` — so the eye is trained BEFORE it is tested, per
 * the draft doc's own instruction. Letting her stand files the era's glitch
 * line (`witness_glitch`, matching the shipped/locked canon phrase) and sets
 * `ledger.graceQueueMiraStood = true` — a flag for the LATER turn/counter-
 * current beats (S3R.6), not decided or acted on this session.
 */
import { px, setFont, wrapText } from '../desktop/theme/chrome';
import * as aero from '../desktop/theme/era3';
import { ERA3, drawLambMark } from '../desktop/theme/era3';
import { ledger } from '../state/ledger';
import q from '../../data/dialog/s3_queue.json';

interface CardDef {
  id: number;
  kind: 'onscript' | 'offscript' | 'mira';
  author: string;
  text: string;
  systemTag?: string;
  autoFlagLabel?: string;
  witnessApproved?: string;
  witnessReviewed?: string;
  witnessStood?: string;
  witness_glitch?: string;
}

const CARDS = q.cards as CardDef[];
const CARD_BY_ID = new Map(CARDS.map(c => [c.id, c]));
const BASE_ORDER = q.order as number[];
const MIRA_ID = q.miraId as number;
const MIRA_GATE = q.miraGateFlags as number;

type Mode = 'signin' | 'queue' | 'done';
type Rect = { x: number; y: number; w: number; h: number; id: string };
function hit(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export type TabletFeedItem = {
  author: string;
  text: string;
  badged: boolean;      // hearts + lamb-badge (on-script/approved only)
  miraTop?: boolean;     // pinned at the top, comments teaser beneath
};

export class GraceQueueLite {
  /** bumped on every state-changing action — era3Devices compares this to
   *  know when the laptop/tablet screens need a redraw + re-upload (dirty
   *  discipline: never re-dirtied by a ticking clock, only real state). */
  version = 0;

  private mode: Mode = 'signin';
  private remaining: number[] = [...BASE_ORDER];
  private currentId: number | null = null;
  private flagsFiled = 0;          // off-script cards (5/6/7) sent to review
  private miraShown = false;
  private rects: Rect[] = [];
  private lambLine: string;

  constructor() {
    this.lambLine = q.lambient.greet;
  }

  // ── queue progression ────────────────────────────────────────────────────
  private bump(): void { this.version++; }

  private nextCard(): void {
    if (!this.miraShown && this.flagsFiled >= MIRA_GATE) {
      this.miraShown = true;
      this.currentId = MIRA_ID;
      this.lambLine = q.lambient.miraNote;
      return;
    }
    const next = this.remaining.shift();
    if (next === undefined) {
      this.mode = 'done';
      this.currentId = null;
      return;
    }
    this.currentId = next;
  }

  private file(cardId: number, outcome: 'approved' | 'reviewed' | 'stood', witness: string): void {
    ledger.graceQueue.push({ cardId, outcome, witness });
  }

  beginQueue(): void {
    if (this.mode !== 'signin') return;
    this.mode = 'queue';
    this.nextCard();
    this.bump();
  }

  approve(): void {
    const card = this.currentId != null ? CARD_BY_ID.get(this.currentId) : undefined;
    if (!card || card.kind !== 'onscript') return;
    this.file(card.id, 'approved', card.witnessApproved ?? '');
    this.nextCard();
    this.bump();
  }

  moveToReview(): void {
    const card = this.currentId != null ? CARD_BY_ID.get(this.currentId) : undefined;
    if (!card || card.kind === 'onscript') return;
    this.file(card.id, 'reviewed', card.witnessReviewed ?? '');
    if (card.kind === 'offscript') this.flagsFiled++;
    this.nextCard();
    this.bump();
  }

  letStand(): void {
    const card = this.currentId != null ? CARD_BY_ID.get(this.currentId) : undefined;
    if (!card || card.kind === 'onscript') return;
    const witness = card.kind === 'mira' ? (card.witness_glitch ?? '') : (card.witnessStood ?? '');
    this.file(card.id, 'stood', witness);
    if (card.kind === 'mira') ledger.graceQueueMiraStood = true;
    this.nextCard();
    this.bump();
  }

  /** the tablet's consequence feed: only RESOLVED cards ever appear.
   *  Reviewed (buried) cards are simply absent. On-script approvals get the
   *  system's own hearts + lamb-badge; off-script cards that were let stand
   *  appear plain (the system never blessed them, it just failed to remove
   *  them). Mira, if let stand, pins to the top with a comments teaser. */
  tabletFeed(): TabletFeedItem[] {
    const resolved = new Map(ledger.graceQueue.map(g => [g.cardId, g.outcome]));
    const items: TabletFeedItem[] = [];
    let mira: TabletFeedItem | null = null;
    for (const card of CARDS) {
      const outcome = resolved.get(card.id);
      if (!outcome || outcome === 'reviewed') continue; // buried or not yet reached
      const item: TabletFeedItem = { author: card.author, text: card.text, badged: outcome === 'approved' };
      if (card.kind === 'mira') { mira = { ...item, miraTop: true }; continue; }
      items.push(item);
    }
    return mira ? [mira, ...items] : items;
  }

  // ── draw ─────────────────────────────────────────────────────────────────
  draw(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.rects = [];
    aero.wallpaper(ctx, W, H);
    aero.taskbar(ctx, W, H, '9:41'); // period placeholder clock, matches the phone's lock-screen clock
    const MARGIN = 14; const TASKBAR_H = 28;
    const winW = W - MARGIN * 2; const winH = H - TASKBAR_H - MARGIN - 8;
    // the OS shell (SisterSignal) is what you sign INTO; GraceQueue is the
    // moderation app you land in — the window's own title reflects which.
    const title = this.mode === 'signin' ? q.app.shellTitle : q.app.title;
    const c = aero.windowFrame(ctx, MARGIN, 8, winW, winH, title);
    aero.px(ctx, c.x, c.y, c.w, c.h, ERA3.glass);

    if (this.mode === 'signin') { this.drawSignIn(ctx, c); return; }
    if (this.mode === 'done') { this.drawDone(ctx, c); return; }
    this.drawCard(ctx, c);
  }

  private drawSignIn(ctx: CanvasRenderingContext2D, c: aero.AeroContent): void {
    setFont(ctx, 26); ctx.fillStyle = ERA3.titleText;
    ctx.fillText(q.app.signInGreeting, c.x + 24, c.y + 40);
    setFont(ctx, 15); ctx.fillStyle = ERA3.grey;
    ctx.fillText(q.app.signInSub, c.x + 24, c.y + 78);
    const bx = c.x + 24; const by = c.y + c.h - 70; const bw = 220; const bh = 42;
    aero.button(ctx, bx, by, bw, bh, q.app.signInButton, { primary: true, tone: 'good', size: 16 });
    this.rects.push({ x: bx, y: by, w: bw, h: bh, id: 'signin' });
    // Lambient's mark, top-right of the sign-in window (Session 37's original
    // placement, carried forward — the fragments already arrived here too)
    drawLambMark(ctx, c.x + c.w - 20, c.y + 10, 1.6);
  }

  private drawDone(ctx: CanvasRenderingContext2D, c: aero.AeroContent): void {
    setFont(ctx, 22); ctx.fillStyle = ERA3.titleText;
    ctx.fillText(q.app.doneHeading, c.x + 24, c.y + 40);
    setFont(ctx, 14); ctx.fillStyle = ERA3.grey;
    ctx.fillText(q.app.doneSub, c.x + 24, c.y + 72);
    this.drawLambientLane(ctx, c, this.lambLine);
  }

  private drawCard(ctx: CanvasRenderingContext2D, c: aero.AeroContent): void {
    const card = this.currentId != null ? CARD_BY_ID.get(this.currentId) : undefined;
    if (!card) return;
    const x = c.x + 10; const w = c.w - 20;

    // the MEMBER lane — big, roomy, one card only
    const cardH = 150;
    let y = c.y + 8;
    px(ctx, x, y, w, cardH, ERA3.memberBand);
    px(ctx, x, y, w, 1, ERA3.glassEdge);
    px(ctx, x, y + cardH - 1, w, 1, ERA3.glassEdge);
    px(ctx, x, y, 4, cardH, ERA3.memberSpine);
    setFont(ctx, 20); ctx.fillStyle = ERA3.ink;
    ctx.fillText(card.author, x + 20, y + 14);
    setFont(ctx, 15); ctx.fillStyle = ERA3.ink;
    wrapText(ctx, card.text, w - 40).slice(0, 6).forEach((ln, i) => ctx.fillText(ln, x + 20, y + 48 + i * 20));
    y += cardH + 8;

    // the SYSTEM/AUTO-FLAG lane
    const bandH = 34;
    const tone = card.kind === 'onscript' ? 'good' : card.kind === 'mira' ? 'alarm' : 'amber';
    const fill = tone === 'good' ? '#e6f3e9' : tone === 'amber' ? '#f7ecd2' : ERA3.alarmBand;
    const ink = tone === 'good' ? ERA3.good : tone === 'amber' ? ERA3.amber : ERA3.alarm;
    px(ctx, x, y, w, bandH, fill);
    px(ctx, x, y, w, 1, ERA3.glassHi);
    const label = card.kind === 'onscript' ? (card.systemTag ?? '') : (card.autoFlagLabel ?? '');
    const tagLabel = card.kind === 'onscript' ? 'SYSTEM' : card.kind === 'mira' ? 'SYSTEM' : 'AUTO-FLAG';
    const tx = aero.tag(ctx, x + 8, y + 9, tagLabel, ERA3.white, ink);
    setFont(ctx, 13); ctx.fillStyle = ink;
    wrapText(ctx, label, x + w - tx - 10).slice(0, 1).forEach(ln => ctx.fillText(ln, tx, y + 10));
    y += bandH + 10;

    // Lambient's foot lane (pinned)
    this.drawLambientLane(ctx, c, this.lambLine);

    // the ACTION row, above the Lambient lane
    const by = c.y + c.h - 34 - 48;
    if (card.kind === 'onscript') {
      const bw = w; const bx = x; const bh = 40;
      aero.button(ctx, bx, by, bw, bh, `${q.verbs.approve}  ▸`, { primary: true, tone: 'good', size: 15 });
      this.rects.push({ x: bx, y: by, w: bw, h: bh, id: 'approve' });
    } else {
      const gap = 12; const bw = (w - gap) / 2; const bh = 40;
      // MOVE TO REVIEW — the system's own suggestion, tinted
      aero.button(ctx, x, by, bw, bh, q.verbs.moveToReview, { tone: 'bury', primary: true, size: 14 });
      this.rects.push({ x, y: by, w: bw, h: bh, id: 'review' });
      setFont(ctx, 10); ctx.fillStyle = ERA3.bury;
      ctx.fillText(q.verbs.systemSuggestsTag, x, by + bh + 3);
      // LET IT STAND — un-tinted, "your call"
      const sx = x + bw + gap;
      aero.button(ctx, sx, by, bw, bh, q.verbs.letStand, { size: 14 });
      this.rects.push({ x: sx, y: by, w: bw, h: bh, id: 'stand' });
      setFont(ctx, 10); ctx.fillStyle = ERA3.grey;
      ctx.fillText(q.verbs.yourCallTag, sx, by + bh + 3);
    }
  }

  private drawLambientLane(ctx: CanvasRenderingContext2D, c: aero.AeroContent, line: string): void {
    const h = 30; const y = c.y + c.h - h;
    px(ctx, c.x, y, c.w, h, ERA3.lambBand);
    px(ctx, c.x, y, c.w, 1, ERA3.lambTag);
    this.lambBadge(ctx, c.x + 8, y + 9);
    const tx = aero.tag(ctx, c.x + 22, y + 9, 'LAMBIENT', ERA3.white, ERA3.lambTag);
    setFont(ctx, 11); ctx.fillStyle = ERA3.greyDk;
    wrapText(ctx, line, c.w - (tx - c.x) - 8).slice(0, 1).forEach(ln => ctx.fillText(ln, tx, y + 9));
  }

  private lambBadge(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = ERA3.white;
    ctx.beginPath(); ctx.arc(x + 5, y + 4, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e9eef5';
    ctx.beginPath(); ctx.arc(x + 5, y + 5, 3, 0, Math.PI * 2); ctx.fill();
    px(ctx, x + 3, y + 4, 1, 1, ERA3.ink); px(ctx, x + 6, y + 4, 1, 1, ERA3.ink);
  }

  // ── input ────────────────────────────────────────────────────────────────
  handleClick(x: number, y: number): void {
    const r = this.rects.find(rr => hit(rr, x, y));
    if (!r) return;
    if (r.id === 'signin') { this.beginQueue(); return; }
    if (r.id === 'approve') { this.approve(); return; }
    if (r.id === 'review') { this.moveToReview(); return; }
    if (r.id === 'stand') { this.letStand(); return; }
  }
}
