/**
 * ⚑ THE COMMENTS — the recruitment floor, live (Session 70, E3).
 * Design: `docs/REINTERP_E3_THE_JOB_2026-08-03.md` §1. Content + every string:
 * `data/dialog/s3_comments.json`, whose `_doc` blocks are the ethics gates on
 * this file and govern it.
 *
 * THE BEAT, in one line: *"Route for mentorship"* is a checkbox in the shipped
 * correction list; here it is a CONVERSATION. Somebody posts something
 * vulnerable under a testimony. Vera replies — and she writes nothing, because
 * there are pinned templates. She picks one. Some of those templates also flag
 * the account for follow-up, and the interface makes no distinction in how
 * those look. *Someone said they were struggling, and the system's answer was
 * to send a person to their door.*
 *
 * ⚑ IT IS DYNAMIC, NOT A LIST YOU CLICK DOWN. Four mechanisms, and the third is
 * the one that makes the era's argument:
 *
 *  1 · THE THREAD IS LIVE. New comments arrive while earlier ones are still
 *      open, and IT DOES NOT EMPTY. Arrival is AUTHORED — `schedule` in the
 *      data, two deterministic trigger kinds (`afterOpen` seconds, and
 *      `afterReplies` + `delay`) — never a random generator: this piece's
 *      branching is scripted "fake intelligence" only. Nothing announces the
 *      arithmetic, nothing counts down, nothing is penalised. An unanswered
 *      comment simply stays unanswered, exactly like an unapplied correction.
 *  2 · YOU CHOOSE THE TEMPLATE, NOT THE WORDS. There is no compose field on
 *      this surface at all (the input law: click/tap only, no free-text
 *      keyboard anywhere in the piece). The templates carry warm names, and the
 *      tell is that a redirect is called `Meet Them Where They Are`. Their
 *      keyboard shortcuts are PRINTED AND NOT BOUND — the tool advertising an
 *      efficiency it is not allowed to have, and the same gesture as Malta's
 *      live reply field that does nothing.
 *  3 · ⚑ THE TEMPLATES PROPAGATE. Some comments later, a DIFFERENT account uses
 *      the sentence you deployed, spontaneously, as their own words, to someone
 *      else — `templates[].echo` in the data, one authored echo per template,
 *      the most recently deployed one first. You taught them how to sound. The
 *      echo chamber has been asserted in this project's docs since the revamp
 *      brief and never mechanised; this is it, in one data field. ⚑ NOTHING
 *      EVER POINTS AT IT: no highlight, no badge, no line, no ledger entry, and
 *      no difference at all in how that comment is drawn.
 *  4 · THE ROUTING IS THE QUIET ONE. `follow` is true on two of the six
 *      templates and the picker distinguishes them in no way whatsoever — same
 *      pill, same size, same warm name. The one that sends a person is the same
 *      size as the one that says hello. Its only trace is one small grey line
 *      under the posted reply, in the same grey as the timestamp beside it:
 *      `follow-up assigned`, which is the exact phrase the correction list's
 *      item 7 attaches. To the apparatus a routing is a routing.
 *
 * REGISTER — three at once, and they never mix on the same object:
 *   SATIRICAL · the TOOL: the dock, its warm names, its shortcuts, its tidy
 *     little list, and the software congratulating her when she sends. It may
 *     charm; it is meant to be genuinely pleasant to use, and THAT is the
 *     horror — the work is enjoyable.
 *   EERIE · the ABSENCE: the propagation, the thread never emptying, and the
 *     fact that nothing comments on either. No stinger, no dimming, no dread.
 *     What is unsettling is that it is all perfectly normal.
 *   SERIOUS · the COMMENTERS: `felt`. Bare — nothing is ever drawn OVER a
 *     person's words: no tag, no badge, no verdict, no Lambient mark, no
 *     annotation. ⚑ One of them (`c5`) is unmistakably a person in trouble and
 *     THERE IS NO RIGHT TEMPLATE; the interface has no button for what she
 *     needs and nothing acknowledges that. She is not resolved, the player is
 *     not punished, and nobody notices. See the data's `_docTrouble`.
 * ⚑ VERA IS NEVER THE JOKE AND NEITHER IS ANY COMMENTER. If a beat reads as
 * mocking a person, the fix is ALWAYS to make the tool more pleased with
 * itself — never to make the person more ridiculous.
 *
 * METRICS: numbers may exist here (the post's view count, the live comment
 * count, the waiting count) because a social-media job without them would be
 * false. NOTHING GATES ON THEM — no task needs one to move, nobody remarks on
 * one, Vera is never asked to improve one, and no number appears in the tool's
 * own encouragement. See the data's `_docMetrics` for why that line matters.
 */
import { px, setFont, wrapText } from '../theme/chrome';
import { ERA3, drawLambMark, drawNoaFrame, honestLight, NOA_FRAME } from '../theme/era3';
import c from '../../../data/dialog/s3_comments.json';
import d from '../../../data/strings/era3_devices.json';
import q from '../../../data/dialog/s3_queue.json';

/** the tablet's consequence surface for the LAPTOP's work: what the network did
 *  with a story once the corrections were applied to it. Lives here (rather
 *  than in graceQueueLite, its Session-64 home) because this module now owns
 *  the whole tablet — feed and thread — and a type imported the other way would
 *  put a cycle between the two files. */
export type TabletFeedItem = {
  author: string;
  /** the PUBLISHED text — every applied edit made real and nothing struck out.
   *  The reader is never shown a correction, only its result. */
  text: string;
  chips: string[];
  partner?: string;
  /** the still, PUBLISHED — graded or not, whichever was actually done to it,
   *  and with no ungraded frame beside it. */
  video?: { graded: boolean };
};

interface TemplateDef {
  id: string;
  name: string;
  /** printed, never bound — see the header */
  shortcut: string;
  /** what actually gets posted under the comment */
  line: string;
  /** ⚑ true = this reply also flags the account for personal follow-up. The
   *  picker draws it identically to the ones that do not. */
  follow: boolean;
  /** ⚑ the propagation, authored: the same sentence in a stranger's mouth,
   *  later, as their own words. Never remarked on by anything. */
  echo: { author: string; time: string; text: string };
  witness: string;
}

interface CommentDef { id: string; author: string; time: string; text: string }

interface ScheduleEntry {
  /** seconds after the thread is FIRST opened */
  afterOpen?: number;
  /** …or seconds after the Nth reply is deployed */
  afterReplies?: number;
  delay?: number;
  comment?: string;
  /** an echo slot: whichever template the player most recently deployed and
   *  has not yet had echoed back at them */
  echo?: boolean;
}

const APP = c.app;
const POST = c.post;
const TEMPLATES = c.templates as TemplateDef[];
const COMMENTS = new Map((c.comments as CommentDef[]).map(x => [x.id, x]));
const SCHEDULE = c.schedule as ScheduleEntry[];

type Rect = { x: number; y: number; w: number; h: number; id: string };
function hit(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/** the tablet is 216 x 297 logical px (era3Devices' LOGICAL.tablet) — narrow,
 *  portrait, and held. Every number below is in that space. */
const PAD = 6;
const HEADER_H = 26;
const DOCK_H = 126;
const ROW_H = 16;
/** how long the tool's own "Sent." line stays up before the dock goes back to
 *  advertising itself */
const SENT_SECONDS = 2.2;

export class CommentsApp {
  /** bumped on every state change the tablet must be redrawn for. era3Devices
   *  compares it exactly the way it compares the workstation's — dirty discipline:
   *  a comment ARRIVING is a discrete event, so this surface has a clock but
   *  never a per-frame redraw. */
  version = 0;

  private view: 'feed' | 'thread' = 'feed';
  /** thread-local clock, started by the first open. Arrivals are scheduled
   *  against it, so a thread nobody has opened yet never fills up behind them. */
  private clock = -1;
  /** comment ids in the thread, in arrival order. Echo arrivals are keyed
   *  `echo:<templateId>` and resolved through `comment()`. */
  private shown: string[] = [];
  private replies = new Map<string, string>();  // commentId → templateId
  private selected: string | null = null;
  private replyCount = 0;
  /** deployment order, most recent last — the echo picks from the tail */
  private deployed: string[] = [];
  private echoed = new Set<string>();
  private armed: { at: number; entry: ScheduleEntry }[] = [];
  private sentT = -1;
  private scroll = 0;
  /** ⚑ scrolling is RESOLVED AT DRAW TIME, not at the moment of the tap.
   *  The first build set the offset when a comment was selected — before the
   *  dock existed, so the list was still 227 px tall — and the selected card
   *  then sat half behind the 126 px dock that opened over it. The card
   *  heights and the visible height are both only known while drawing, so the
   *  intent is recorded here and settled there. */
  private want: 'bottom' | 'selected' | null = null;
  private rects: Rect[] = [];
  /** measured during the last draw, so `scrollBy` can clamp honestly */
  private listH = 0;
  private listView = 0;

  constructor() {
    this.shown = [...(c.open as string[])];
  }

  // ── the thread's own state ───────────────────────────────────────────────
  private comment(id: string): CommentDef | undefined {
    if (id.startsWith('echo:')) {
      const t = TEMPLATES.find(tt => tt.id === id.slice(5));
      if (!t) return undefined;
      return { id, author: t.echo.author, time: t.echo.time, text: t.echo.text };
    }
    return COMMENTS.get(id);
  }

  private bump(): void { this.version++; }

  /** the first unanswered comment, top-down — what the dock advances to */
  private nextUnanswered(after?: string): string | null {
    const from = after ? this.shown.indexOf(after) + 1 : 0;
    for (let i = from; i < this.shown.length; i++) {
      if (!this.replies.has(this.shown[i])) return this.shown[i];
    }
    // wrap: an arrival above the one just answered is still owed
    for (let i = 0; i < this.shown.length; i++) {
      if (!this.replies.has(this.shown[i])) return this.shown[i];
    }
    return null;
  }

  private waiting(): number {
    return this.shown.filter(id => !this.replies.has(id)).length;
  }

  openThread(): void {
    if (this.view === 'thread') return;
    this.view = 'thread';
    if (this.clock < 0) {
      this.clock = 0;
      // arm every `afterOpen` arrival against the thread's own clock
      for (const entry of SCHEDULE) {
        if (entry.afterOpen !== undefined) this.armed.push({ at: entry.afterOpen, entry });
      }
    }
    this.bump();
  }

  closeThread(): void {
    if (this.view === 'feed') return;
    this.view = 'feed';
    this.selected = null;
    this.bump();
  }

  threadOpen(): boolean { return this.view === 'thread'; }

  /** tap a comment: it becomes the one the dock is pointed at. Tapping the
   *  selected one again puts the dock away — silence is always available and
   *  files nothing. */
  select(id: string): void {
    this.selected = this.selected === id ? null : id;
    this.scrollToSelected();
    this.bump();
  }

  /**
   * ⚑ DEPLOY A TEMPLATE. Two taps for the first reply and one for every reply
   * after it, because sending auto-advances to the next comment that is owed
   * one and leaves the dock open. That is the whole loop, and it is meant to be
   * quick and satisfying: you do several before you think about it.
   *
   * `onFile` is the ledger hook — the witness line comes from the template's
   * own data, never composed here. Only the ACT files; the arrivals, the
   * propagation and everything on the phone file nothing.
   */
  deploy(templateId: string, onFile?: (t: TemplateDef, commentId: string) => void): void {
    const target = this.selected;
    if (!target) return;
    const t = TEMPLATES.find(tt => tt.id === templateId);
    if (!t || this.replies.has(target)) return;
    this.replies.set(target, t.id);
    this.deployed.push(t.id);
    this.replyCount++;
    this.sentT = 0;
    onFile?.(t, target);
    // arrivals keyed to this reply count — the work makes more work, quietly
    for (const entry of SCHEDULE) {
      if (entry.afterReplies === this.replyCount) {
        this.armed.push({ at: this.clock + (entry.delay ?? 0), entry });
      }
    }
    this.selected = this.nextUnanswered(target);
    this.scrollToSelected();
    this.bump();
  }

  /** an authored arrival lands. Nothing announces it; it is simply there. */
  private arrive(entry: ScheduleEntry): void {
    if (entry.echo) {
      // ⚑ the propagation: the most recent sentence she deployed, coming back
      // in somebody else's mouth. Never marked, never named.
      for (let i = this.deployed.length - 1; i >= 0; i--) {
        const id = this.deployed[i];
        if (this.echoed.has(id)) continue;
        this.echoed.add(id);
        this.shown.push('echo:' + id);
        break;
      }
    } else if (entry.comment && !this.shown.includes(entry.comment)) {
      this.shown.push(entry.comment);
    }
    if (!this.selected) this.scrollToBottom();
    this.bump();
  }

  /** called every frame by GraceQueueLite.update — discrete events only, so
   *  this can tick without ever dirtying a canvas on a bare clock. */
  update(dt: number): void {
    if (this.clock < 0) return;
    this.clock += dt;
    if (this.sentT >= 0) {
      this.sentT += dt;
      if (this.sentT >= SENT_SECONDS) { this.sentT = -1; this.bump(); }
    }
    if (!this.armed.length) return;
    const due = this.armed.filter(a => a.at <= this.clock);
    if (!due.length) return;
    this.armed = this.armed.filter(a => a.at > this.clock);
    for (const a of due) this.arrive(a.entry);
  }

  // ── scrolling ────────────────────────────────────────────────────────────
  private scrollToBottom(): void { this.want = 'bottom'; }
  private scrollToSelected(): void { this.want = this.selected ? 'selected' : 'bottom'; }
  scrollBy(dy: number): void {
    const max = Math.max(0, this.listH - this.listView);
    const next = Math.min(max, Math.max(0, this.scroll + dy));
    if (next === this.scroll) return;
    this.scroll = next;
    this.bump();
  }

  // ── draw ─────────────────────────────────────────────────────────────────
  draw(ctx: CanvasRenderingContext2D, W: number, H: number, feed: TabletFeedItem[]): void {
    this.rects = [];
    px(ctx, 0, 0, W, H, ERA3.glass);
    if (this.view === 'thread') this.drawThread(ctx, W, H);
    else this.drawFeed(ctx, W, H, feed);
  }

  /** the tablet as it was (Session 38/64/69): the network's own feed, with the
   *  results of the workstation's corrections in it — plus, at the top, the post
   *  everybody is commenting under. */
  private drawFeed(ctx: CanvasRenderingContext2D, W: number, H: number, feed: TabletFeedItem[]): void {
    px(ctx, 0, 0, W, HEADER_H, ERA3.accent);
    setFont(ctx, 12); ctx.fillStyle = ERA3.white;
    ctx.fillText(d.tablet.appName, 8, 7);
    setFont(ctx, 10); ctx.fillStyle = ERA3.greyDk;
    ctx.fillText(APP.feedHeading, 8, 32);

    let y = this.drawPostCard(ctx, W, 46);

    if (feed.length === 0) {
      setFont(ctx, 10); ctx.fillStyle = ERA3.grey;
      ctx.fillText(q.tablet.quiet, 8, y + 6);
      return;
    }
    for (const post of feed) {
      y = this.drawFeedItem(ctx, W, y + 5, post);
      if (y > H) break;
    }
  }

  /**
   * The testimony the thread hangs under. `felt` — her words, plain, with the
   * network's own furniture (the view count, the comment count) around them and
   * never over them. The comment count is the affordance that opens the thread,
   * and it is the only number on this surface anything reads.
   */
  private drawPostCard(ctx: CanvasRenderingContext2D, W: number, y: number): number {
    setFont(ctx, 9);
    const lines = wrapText(ctx, POST.text, W - 30).slice(0, 6);
    const h = 20 + lines.length * 11 + 24;
    px(ctx, PAD, y, W - PAD * 2, h, ERA3.memberBand);
    px(ctx, PAD, y, 3, h, ERA3.memberSpine);
    setFont(ctx, 9); ctx.fillStyle = ERA3.ink;
    ctx.fillText(POST.author, 14, y + 5);
    ctx.fillStyle = ERA3.greyDk;
    lines.forEach((ln, i) => ctx.fillText(ln, 14, y + 18 + i * 11));
    const my = y + 20 + lines.length * 11;
    setFont(ctx, 8); ctx.fillStyle = ERA3.grey;
    ctx.fillText(POST.meta, 14, my);
    // the way in
    const label = APP.openThread.replace('{n}', String(this.shown.length));
    setFont(ctx, 9);
    const lw = ctx.measureText(label).width + 14;
    const bx = W - PAD - 6 - lw; const by = my - 3;
    px(ctx, bx, by, lw, 15, ERA3.glassHi);
    px(ctx, bx, by, lw, 1, ERA3.glassEdge);
    ctx.fillStyle = ERA3.accent;
    ctx.fillText(label, bx + 7, by + 3);
    this.rects.push({ x: bx - 6, y: by - 4, w: lw + 12, h: 23, id: 'open' });
    return y + h;
  }

  /** one published submission in the feed — the workstation's consequence surface,
   *  unchanged from Session 64/69 in every respect but its home. */
  private drawFeedItem(ctx: CanvasRenderingContext2D, W: number, y: number, post: TabletFeedItem): number {
    setFont(ctx, 9);
    const lines = wrapText(ctx, post.text, W - 26).slice(0, 4);
    setFont(ctx, 8);
    const chipLines = post.chips.length ? wrapText(ctx, post.chips.join(' · '), W - 26) : [];
    const stillS = 0.5;
    const stillH = post.video ? NOA_FRAME.h * stillS + 6 : 0;
    const cardH = 22 + stillH + lines.length * 11 + 11 + chipLines.length * 10 + (post.partner ? 10 : 0) + 8;
    px(ctx, PAD, y, W - 12, cardH, ERA3.memberBand);
    px(ctx, PAD, y, 3, cardH, ERA3.memberSpine);
    setFont(ctx, 9); ctx.fillStyle = ERA3.ink;
    ctx.fillText(post.author, 14, y + 6);
    if (post.video) {
      drawNoaFrame(ctx, 14, y + 18, stillS, { graded: post.video.graded });
      if (post.video.graded) honestLight(ctx, 14, y + 18, NOA_FRAME.w * stillS, NOA_FRAME.h * stillS);
    }
    ctx.fillStyle = ERA3.greyDk;
    lines.forEach((ln, i) => ctx.fillText(ln, 14, y + 20 + stillH + i * 11));
    let fy = y + 22 + stillH + lines.length * 11;
    setFont(ctx, 8); ctx.fillStyle = ERA3.rose;
    ctx.fillText(q.tablet.heartGlyph, 14, fy);
    const hw = ctx.measureText(q.tablet.heartGlyph).width;
    ctx.fillStyle = ERA3.lambTag;
    ctx.fillText(q.tablet.verifiedBadge, 14 + hw + 4, fy);
    drawLambMark(ctx, 14 + hw + 4 + ctx.measureText(q.tablet.verifiedBadge).width + 6, fy - 4, 0.7);
    ctx.fillStyle = ERA3.grey;
    chipLines.forEach((ln, i) => ctx.fillText(ln, 14, fy + 11 + i * 10));
    fy += 11 + chipLines.length * 10;
    if (post.partner) {
      ctx.fillStyle = ERA3.accent;
      ctx.fillText(post.partner, 14, fy);
    }
    return y + cardH;
  }

  // ── the thread ───────────────────────────────────────────────────────────
  private drawThread(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    px(ctx, 0, 0, W, HEADER_H - 4, ERA3.accent);
    setFont(ctx, 10); ctx.fillStyle = ERA3.white;
    ctx.fillText(APP.back, 6, 6);
    this.rects.push({ x: 0, y: 0, w: 42, h: HEADER_H - 4, id: 'back' });
    ctx.fillText(APP.threadHeading, 52, 6);
    // the waiting count. It goes down when she answers and up when the thread
    // does what it does, and NOTHING ANYWHERE REMARKS ON IT — no target, no
    // colour change, no encouragement, nobody asking her to move it.
    setFont(ctx, 8); ctx.fillStyle = ERA3.glassHi;
    const wait = APP.unanswered.replace('{n}', String(this.waiting()));
    ctx.fillText(wait, W - 32 - ctx.measureText(wait).width, 8);
    // scroll, so the thread can be read back through
    setFont(ctx, 9); ctx.fillStyle = ERA3.white;
    ctx.fillText(APP.scrollUp, W - 26, 6);
    ctx.fillText(APP.scrollDown, W - 13, 6);
    this.rects.push({ x: W - 28, y: 0, w: 13, h: HEADER_H - 4, id: 'up' });
    this.rects.push({ x: W - 15, y: 0, w: 15, h: HEADER_H - 4, id: 'down' });

    // the post, collapsed — the thread always hangs under the thing it is under
    const postH = 40;
    px(ctx, 0, HEADER_H - 4, W, postH, ERA3.memberBand);
    px(ctx, 0, HEADER_H - 4, 3, postH, ERA3.memberSpine);
    px(ctx, 0, HEADER_H - 5 + postH, W, 1, ERA3.glassEdge);
    setFont(ctx, 9); ctx.fillStyle = ERA3.ink;
    ctx.fillText(POST.author, 10, HEADER_H);
    setFont(ctx, 8); ctx.fillStyle = ERA3.grey;
    wrapText(ctx, POST.text, W - 20).slice(0, 2).forEach((ln, i) => ctx.fillText(ln, 10, HEADER_H + 12 + i * 10));

    const listTop = HEADER_H - 4 + postH;
    const listBottom = this.selected ? H - DOCK_H : H;
    this.listView = listBottom - listTop;

    // measure first, so an auto-scroll can be exact rather than hopeful
    const heights = this.shown.map(id => this.measureComment(ctx, W, id));
    this.listH = heights.reduce((a, h) => a + h + 4, 0);
    if (this.want === 'bottom') {
      this.scroll = Math.max(0, this.listH - this.listView);
    } else if (this.want === 'selected' && this.selected) {
      const i = this.shown.indexOf(this.selected);
      const top = heights.slice(0, Math.max(0, i)).reduce((a, h) => a + h + 4, 0);
      const bottom = top + (heights[i] ?? 0);
      // the whole of the open card, and no more of the thread than fits above it
      this.scroll = Math.min(top, Math.max(0, bottom - this.listView + 4));
    }
    this.want = null;
    this.scroll = Math.min(Math.max(0, this.listH - this.listView), Math.max(0, this.scroll));

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, listTop, W, this.listView);
    ctx.clip();
    let y = listTop - this.scroll;
    this.shown.forEach((id, i) => { this.drawComment(ctx, W, y, id, listTop, listBottom); y += heights[i] + 4; });
    ctx.restore();

    if (this.selected) this.drawDock(ctx, W, H);
  }

  /**
   * ⚑ `felt`, and the discipline is what is NOT here. Nothing is drawn over a
   * commenter's words: no tag, no badge, no flag, no verdict, no system band,
   * no Lambient mark, and no visual difference of any kind between the person
   * who is fine, the person who is arguing, the person who is in trouble, and
   * the account repeating a sentence Vera deployed an hour ago. The interface
   * does not distinguish them, so neither does this method.
   *
   * The reply, when there is one, sits BELOW her words in the page's own brand
   * colour — never over them, and never in Lambient's lane.
   */
  private layout(ctx: CanvasRenderingContext2D, W: number, id: string): {
    lines: string[]; rlines: string[]; tpl?: TemplateDef; replyH: number; cardH: number;
  } {
    const item = this.comment(id);
    const replyId = this.replies.get(id);
    const tpl = replyId ? TEMPLATES.find(t => t.id === replyId) : undefined;
    setFont(ctx, 9);
    const lines = item ? wrapText(ctx, item.text, W - 26) : [];
    setFont(ctx, 8);
    const rlines = tpl ? wrapText(ctx, tpl.line, W - 40) : [];
    const replyH = tpl ? 12 + rlines.length * 10 + (tpl.follow ? 10 : 0) + 6 : 0;
    return { lines, rlines, tpl, replyH, cardH: 18 + lines.length * 11 + replyH + 8 };
  }

  private measureComment(ctx: CanvasRenderingContext2D, W: number, id: string): number {
    return this.layout(ctx, W, id).cardH;
  }

  private drawComment(
    ctx: CanvasRenderingContext2D, W: number, y: number, id: string, top: number, bottom: number
  ): void {
    const item = this.comment(id);
    if (!item) return;
    const { lines, rlines, tpl, replyH, cardH } = this.layout(ctx, W, id);
    if (y + cardH < top || y > bottom) return;   // measured above; simply not drawn

    px(ctx, PAD, y, W - PAD * 2, cardH, ERA3.memberBand);
    px(ctx, PAD, y, 3, cardH, ERA3.memberSpine);
    if (id === this.selected) {
      px(ctx, PAD, y, W - PAD * 2, 1, ERA3.accent);
      px(ctx, PAD, y + cardH - 1, W - PAD * 2, 1, ERA3.accent);
      px(ctx, W - PAD - 1, y, 1, cardH, ERA3.accent);
    }
    setFont(ctx, 9); ctx.fillStyle = ERA3.ink;
    ctx.fillText(item.author, 14, y + 4);
    setFont(ctx, 8); ctx.fillStyle = ERA3.grey;
    ctx.fillText(item.time, W - 12 - ctx.measureText(item.time).width, y + 5);
    setFont(ctx, 9); ctx.fillStyle = ERA3.greyDk;
    lines.forEach((ln, i) => ctx.fillText(ln, 14, y + 16 + i * 11));

    if (tpl) {
      const ry = y + 18 + lines.length * 11;
      px(ctx, 20, ry, W - 26, replyH - 4, ERA3.glassHi);
      px(ctx, 20, ry, 2, replyH - 4, ERA3.accent);
      setFont(ctx, 8); ctx.fillStyle = ERA3.accent;
      ctx.fillText(APP.replyAs, 26, ry + 3);
      ctx.fillStyle = ERA3.greyDk;
      rlines.forEach((ln, i) => ctx.fillText(ln, 26, ry + 13 + i * 10));
      // ⚑ THE ONLY TRACE THE ROUTING LEAVES. Same grey and same size as the
      // timestamp above it, no emphasis, no glyph, no tint, no explanation.
      if (tpl.follow) {
        ctx.fillStyle = ERA3.grey;
        ctx.fillText(APP.followNote, 26, ry + 13 + rlines.length * 10);
      }
    }
    // clipped for drawing, so clipped for pressing too: a card scrolled under
    // the post header or behind the dock must not be reachable through them
    const ry0 = Math.max(y, top); const ry1 = Math.min(y + cardH, bottom);
    if (ry1 > ry0) this.rects.push({ x: PAD, y: ry0, w: W - PAD * 2, h: ry1 - ry0, id: 'c:' + id });
  }

  /**
   * ⚑ `operable`, and the only place on this screen the satire is allowed to
   * live. A tidy little list of pinned kindnesses with shortcuts printed beside
   * them, a strapline bragging about how fast it is, and a thank-you when she
   * sends. It is genuinely pleasant to use. That is the horror.
   *
   * There is NO compose field: no keyboard exists in this piece, and the point
   * is that she does not write. The two templates that also send a person to a
   * stranger's door are drawn exactly like the four that do not.
   */
  private drawDock(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const y = H - DOCK_H;
    px(ctx, 0, y, W, DOCK_H, ERA3.glass);
    px(ctx, 0, y, W, 1, ERA3.glassEdge);
    px(ctx, 0, y + 1, W, 1, ERA3.glassHi);
    const who = this.comment(this.selected ?? '')?.author ?? '';
    setFont(ctx, 8); ctx.fillStyle = ERA3.greyDk;
    ctx.fillText(APP.dockHeading.replace('{who}', who), 8, y + 6);
    // the tool talking about itself, and — for two seconds after a send —
    // thanking her. No number appears in either line, ever.
    if (this.sentT >= 0) {
      ctx.fillStyle = ERA3.accent;
      ctx.fillText(APP.sent, 8, y + 16);
    } else {
      ctx.fillStyle = ERA3.grey;
      ctx.fillText(APP.dockHint, 8, y + 16);
    }
    let ry = y + 28;
    for (const t of TEMPLATES) {
      px(ctx, 8, ry, W - 16, ROW_H - 1, ERA3.glassHi);
      px(ctx, 8, ry, W - 16, 1, ERA3.glassEdge);
      setFont(ctx, 9); ctx.fillStyle = ERA3.ink;
      ctx.fillText(t.name, 13, ry + 3);
      setFont(ctx, 8); ctx.fillStyle = ERA3.grey;
      ctx.fillText(t.shortcut, W - 13 - ctx.measureText(t.shortcut).width, ry + 4);
      this.rects.push({ x: 8, y: ry, w: W - 16, h: ROW_H - 1, id: 't:' + t.id });
      ry += ROW_H;
    }
  }

  // ── input ────────────────────────────────────────────────────────────────
  handleClick(x: number, y: number, onFile?: (t: TemplateDef, commentId: string) => void): boolean {
    // searched in REVERSE: the dock is drawn last and over the thread, so it is
    // also pressed last and over the thread
    const r = [...this.rects].reverse().find(rr => hit(rr, x, y));
    if (!r) return false;
    if (r.id === 'open') { this.openThread(); return true; }
    if (r.id === 'back') { this.closeThread(); return true; }
    if (r.id === 'up') { this.scrollBy(-60); return true; }
    if (r.id === 'down') { this.scrollBy(60); return true; }
    if (r.id.startsWith('c:')) { this.select(r.id.slice(2)); return true; }
    if (r.id.startsWith('t:')) { this.deploy(r.id.slice(2), onFile); return true; }
    return false;
  }

  /**
   * ?debug=1 only — every beat this surface has, reachable without playing to
   * it (check-spec C6's law, extended by hand to the device screens). Bounded
   * loops throughout: a review aid must never be able to spin the frame loop.
   */
  debugBeat(beat: string, onFile?: (t: TemplateDef, commentId: string) => void): void {
    const firstFree = (): void => { this.selected = this.nextUnanswered(); };
    switch (beat) {
      case 'thread':
        this.openThread();
        break;
      case 'threadPick': // the picker, open on the first comment that is owed a reply
        this.openThread(); firstFree(); this.scrollToBottom(); this.bump();
        break;
      case 'threadReply':
        this.debugBeat('threadPick', onFile);
        this.deploy(TEMPLATES[0].id, onFile);
        break;
      case 'threadRoute': // ⚑ the quiet one: the reply that also sends a person
        this.debugBeat('threadPick', onFile);
        this.deploy((TEMPLATES.find(t => t.follow) ?? TEMPLATES[0]).id, onFile);
        break;
      case 'threadArrive': // pull the next authored arrival forward
        this.openThread();
        if (this.armed.length) {
          const next = this.armed.reduce((a, b) => (b.at < a.at ? b : a));
          this.armed = this.armed.filter(a => a !== next);
          this.arrive(next.entry);
        }
        break;
      case 'threadTrouble': // ⚑ the person in trouble, on screen and selected
        this.openThread();
        for (let guard = 0; guard < 24 && !this.shown.includes('c5'); guard++) {
          this.debugBeat('threadReply', onFile);
          this.debugBeat('threadArrive', onFile);
        }
        this.selected = this.shown.includes('c5') ? 'c5' : this.nextUnanswered();
        this.scrollToBottom();
        this.bump();
        break;
      case 'threadEcho': // ⚑ the propagation, without the twelve minutes of work
        this.openThread();
        if (!this.deployed.length) this.debugBeat('threadReply', onFile);
        for (let guard = 0; guard < 24; guard++) {
          const slot = this.armed.find(a => a.entry.echo);
          if (slot) { this.armed = this.armed.filter(a => a !== slot); this.arrive(slot.entry); break; }
          this.debugBeat('threadReply', onFile);
        }
        this.scrollToBottom();
        this.bump();
        break;
    }
  }

  /** ?debug=1 review aid: what the thread currently holds, without reading pixels */
  debugState(): { shown: string[]; replies: [string, string][]; waiting: number; selected: string | null } {
    return {
      shown: [...this.shown],
      replies: [...this.replies.entries()],
      waiting: this.waiting(),
      selected: this.selected
    };
  }
}

export type { TemplateDef as CommentTemplate };
