/**
 * ⚑ S191 — THE RECOMMENDATION, 2003 (Phase 5). Data and grounding: data/dialog/s2_forum.json.
 *
 * The programme's forum, in the period's browser (menu bar, Back · Forward · Stop · Refresh · Home, an address
 * bar with Go). Opened from the desktop icon that appears after his first check-in, when a senior member
 * recommends a thread (the recommendation event: a person, a moderator's community, picks the next thing).
 * 1. The RULES page: five rules, "I Agree" live, "I Do Not Agree" drawn dead — care and surveillance on one
 *    screen, and the web twin of the rules sheet on the wall. Filed.
 * 2. The board: its rooms by age, sex and marriage (the documented division), the recommended thread open.
 * 3. "Post reply" posts his one given line (no free typing), a moderator holds it, and "3 people are praying
 *    for you." Filed. The window closes and reopens where it was.
 */
import { meetWord } from '../../room/lexicon';
import * as ui from '../theme/chrome';
import { ERA1 } from '../theme/era1';
import { WEB2003 as P } from '../theme/web1997';
import D from '../../../data/dialog/s2_forum.json';
import fixes from '../../../data/strings/visitorFixes.json';
import { ledger } from '../../state/ledger';

interface Hit { x: number; y: number; w: number; h: number; id: string }
const WX = 8, WY = 8, WW = 496, WH = 344;
/** the dossier cards, as the sources page names them (data/dialog/s2_forum.json cardLabels — never a later year) */
const CARD_LABEL = D.cardLabels as Record<string, string>;

export class Web2003App {
  open = true;
  hits: Hit[] = [];
  /** S196 — the board is a place: its index, its pages; Back returns along the way he came */
  private stage: string = 'rules';   // 'rules' | 'thread' | 'index' | 'page:<id>'
  /** ⚑ S345 — Lamby's "Share it" opens Harbor at the thread, where Post your story is the next press */
  showThread(): void { this.stage = 'thread'; this.trail = []; }
  private trail: string[] = [];
  private posted = false;
  private hover = '';
  /** os files these (ledger.records) */
  onAgree?: () => void;
  onPost?: () => void;
  /** S199 — the pre-filled application, submitted */
  onApply?: () => void;
  private applied = false;
  /** ⚑ S342 (his 9 Nov answer 2: "instead of posting the reply, it's posting your testimony") — os.ts sets this once
   *  Restorify Media has made his story; Harbor's Post then posts it, in the programme's words */
  storyReady = false;
  private ordered = new Set<number>();

  /** true when what is under the pointer changed (S271: only then does the screen repaint) */
  handleMove(x: number, y: number): boolean {
    const h = this.hits.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    const was = this.hover; this.hover = h ? h.id : '';
    return this.hover !== was;
  }
  handleClick(x: number, y: number): void {
    const h = this.hits.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    if (!h) return;
    if (h.id === 'forum-close') { this.open = false; return; }
    if (h.id === 'forum-agree') { this.stage = 'thread'; this.onAgree?.(); return; }
    if (h.id === 'forum-back' && this.trail.length) { this.stage = this.trail.pop()!; return; }
    if (h.id === 'forum-index') { this.trail.push(this.stage); this.stage = 'index'; return; }
    if (h.id === 'forum-thread') { this.trail.push(this.stage); this.stage = 'thread'; return; }
    if (h.id.startsWith('forum-page:')) {
      this.trail.push(this.stage); this.stage = 'page:' + h.id.slice(11);
      // S209 / B22 — asking for a partner is the board's act; Harbor files the match
      if (h.id === 'forum-page:partner' && !ledger.records.includes('harbor-partner')) ledger.records.push('harbor-partner');
      // S357e — the programme's house rules, read on the approved connection
      if (h.id === 'forum-page:parents' && !ledger.records.includes('harbor-parents')) ledger.records.push('harbor-parents');
      // S209 / P7-47 — the words met where the board uses them
      if (h.id === 'forum-page:partner') meetWord('accountability', 'e2-forum');
      if (h.id === 'forum-page:process') { meetWord('ssa', 'e2-forum'); meetWord('struggle', 'e2-forum'); }
      if (h.id === 'forum-page:wound') meetWord('wound', 'e2-forum');
      return;
    }
    if (h.id === 'forum-post' && !this.posted && this.storyReady) { this.posted = true; this.onPost?.(); }
    if (h.id.startsWith('forum-go:')) { this.trail.push(this.stage); this.stage = h.id.slice(9); return; }
    if (h.id.startsWith('forum-order:')) { this.ordered.add(Number(h.id.slice(12))); return; }
    if (h.id === 'forum-submit' && !this.applied) { this.applied = true; this.onApply?.(); }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.hits = [];
    const addr = this.stage === 'rules' ? `${D.address}join.asp` : this.stage === 'index' ? `${D.address}default.asp`
      : this.stage === 'apply' ? `${D.address}anchor/apply.asp` : this.stage === 'books' ? `${D.address}store/default.asp`
      : this.stage.startsWith('page:') ? `${D.address}resources/${this.stage.slice(5)}.asp` : `${D.address}thread.asp?t=4471`;
    const wv = drawWebView(ctx, {
      title: `Harbor — ${D.bannerSub}`, address: addr, closeId: 'forum-close', hover: this.hover,
      backId: this.trail.length > 0 ? 'forum-back' : null,
      homeId: this.stage !== 'index' && this.stage !== 'rules' ? 'forum-index' : null,
      // S357e — a page's `status` takes the browser's status bar (the parents' thread: "an approved connection")
      status: this.stage.startsWith('page:') ? (D.pages as Record<string, { status?: string }>)[this.stage.slice(5)]?.status : undefined
    });
    this.hits.push(...wv.hits);
    // the page
    const b = wv.page;
    ui.px(ctx, b.x, b.y, b.w, b.h, P.page);
    // the board's banner
    ui.px(ctx, b.x, b.y, b.w, 30, P.banner);
    ui.setFont(ctx, 18);
    ctx.fillStyle = P.bannerInk;
    ctx.fillText(D.banner, b.x + 12, b.y + 6);
    ui.setFont(ctx, 9);
    ctx.fillStyle = P.bannerDim;
    ctx.fillText(D.bannerSub, b.x + 100, b.y + 12);
    if (this.stage === 'rules') this.drawRules(ctx, b);
    else if (this.stage === 'index') this.drawIndex(ctx, b);
    else if (this.stage === 'apply') this.drawApply(ctx, b);
    else if (this.stage === 'books') this.drawBooks(ctx, b);
    else if (this.stage.startsWith('page:')) this.drawPage(ctx, b, this.stage.slice(5));
    else this.drawThread(ctx, b);
  }

  private drawRules(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }): void {
    const R = D.rules;
    ui.px(ctx, b.x + 60, b.y + 44, b.w - 120, 200, P.panel);
    ui.px(ctx, b.x + 60, b.y + 44, b.w - 120, 18, P.panelHead);
    ui.setFont(ctx, 10);
    ctx.fillStyle = P.bannerInk;
    ctx.fillText(R.title, b.x + 70, b.y + 48);
    ctx.fillStyle = P.text;
    R.lines.forEach((l, i) => {
      const y = b.y + 74 + i * 22;
      ui.px(ctx, b.x + 72, y, 11, 11, ERA1.white);
      ui.px(ctx, b.x + 72, y, 11, 1, ERA1.grey); ui.px(ctx, b.x + 72, y, 1, 11, ERA1.grey);
      ctx.fillStyle = P.check; ctx.fillText('✓', b.x + 73, y - 1);
      ctx.fillStyle = P.text; ctx.fillText(l, b.x + 90, y);
    });
    ui.setFont(ctx, 9);
    ctx.fillStyle = P.dim;
    ctx.fillText(R.note, b.x + 72, b.y + 188);
    const by = b.y + 212;
    ui.button(ctx, b.x + b.w / 2 - 110, by, 100, 20, R.disagree, { disabled: true });
    ui.button(ctx, b.x + b.w / 2 + 10, by, 100, 20, R.agree, { hover: this.hover === 'forum-agree' });
    this.hits.push({ x: b.x + b.w / 2 + 10, y: by, w: 100, h: 20, id: 'forum-agree' });
  }

  private link(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, id: string): void {
    ui.setFont(ctx, 9);
    ctx.fillStyle = P.link;
    ctx.fillText(text, x, y);
    const w = ctx.measureText(text).width;
    ui.px(ctx, x, y + 10, w, 1, P.link);
    this.hits.push({ x: x - 2, y: y - 2, w: w + 4, h: 14, id });
  }

  /** ⚑ S196/S199 — the front page, on Evergreen's 2004 layout: audience tabs, a left navigation column, the
   *  recommendation pinned, the forum summary in the forum software's own columns, a featured book */
  private drawIndex(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }): void {
    const I = D.index;
    // the audience tabs, under the banner
    let tx = b.x + 104;
    ui.setFont(ctx, 9);
    for (const a of I.audiences) {
      const w = ctx.measureText(a.label).width + 14;
      ui.px(ctx, tx, b.y + 32, w, 14, P.tab);
      this.link(ctx, a.label, tx + 7, b.y + 34, `forum-go:${a.to}`);
      tx += w + 3;
    }
    // the left column
    ui.px(ctx, b.x, b.y + 30, 96, b.h - 30, P.panel);
    I.nav.forEach((n, i) => {
      const y = b.y + 40 + i * 16;
      if (n.to) this.link(ctx, n.label, b.x + 8, y, `forum-go:${n.to}`);
      else { ui.setFont(ctx, 9); ctx.fillStyle = P.dim; ctx.fillText(n.label, b.x + 8, y); }
    });
    const x0 = b.x + 104, w0 = b.w - 112;
    // the recommendation, pinned
    ui.px(ctx, x0, b.y + 52, w0, 26, P.pending);
    ui.setFont(ctx, 8); ctx.fillStyle = P.dim; ctx.fillText(I.recommended, x0 + 4, b.y + 54);
    this.link(ctx, D.thread.title, x0 + 4, b.y + 64, 'forum-thread');
    // the forum summary: Topic · Author · Replies · Views · Last Post
    ui.setFont(ctx, 9); ctx.fillStyle = P.text; ctx.fillText(I.forumsLabel, x0, b.y + 84);
    // ⚑ S339 (T41, his 8 Nov: the board "is really difficult to read") — the columns are measured, not guessed: each
    //   cell is cut to its own column with an ellipsis, so a topic no longer runs under its author
    const cols = [0, w0 - 198, w0 - 134, w0 - 90, w0 - 50];
    const fit = (v: string, w: number): string => { if (ctx.measureText(v).width <= w) return v; let o = v; while (o.length > 1 && ctx.measureText(o + '…').width > w) o = o.slice(0, -1); return o + '…'; };
    ui.px(ctx, x0, b.y + 96, w0, 12, P.panelHead);
    ui.setFont(ctx, 8); ctx.fillStyle = P.bannerInk;
    I.topicsHead.forEach((h, i) => ctx.fillText(fit(h, (cols[i + 1] ?? w0) - cols[i] - 6), x0 + 3 + cols[i], b.y + 98));
    I.topics.forEach((t, r) => {
      const y = b.y + 110 + r * 13;
      ui.px(ctx, x0, y - 1, w0, 12, r % 2 ? P.panel : P.white);
      ui.setFont(ctx, 8);
      ui.setFont(ctx, t.live || (t as { page?: string }).page ? 9 : 8); const topic = fit(t.t, cols[1] - 8);
      if (t.live) this.link(ctx, topic, x0 + 3, y, 'forum-thread');
      else if ((t as { page?: string }).page) this.link(ctx, topic, x0 + 3, y, `forum-page:${(t as { page?: string }).page}`);   // S209 / B22
      else { ctx.fillStyle = P.text; ctx.fillText(topic, x0 + 3, y); }
      ui.setFont(ctx, 8); ctx.fillStyle = P.dim;
      [t.a, t.r, t.v, t.l].forEach((v, i) => ctx.fillText(fit(v, (cols[i + 2] ?? w0) - cols[i + 1] - 6), x0 + 3 + cols[i + 1], y));
    });
    // Resources, and the featured book
    const ry = b.y + 170;
    ui.setFont(ctx, 9); ctx.fillStyle = P.text; ctx.fillText(I.resourcesLabel, x0, ry);
    I.resources.forEach((id, i) => this.link(ctx, (D.pages as Record<string, { heading: string }>)[id].heading, x0 + 8 + i * 120, ry + 14, `forum-page:${id}`));
    ui.px(ctx, x0, ry + 32, 12, 16, P.cover2);
    this.link(ctx, I.featured, x0 + 18, ry + 36, 'forum-go:books');
  }

  /** ⚑ S199 — the bookstore: cover · title · copy · order, the period's shape */
  private drawBooks(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }): void {
    const B = D.books;
    const x0 = b.x + 24;
    ui.setFont(ctx, 14); ctx.fillStyle = P.banner; ctx.fillText(B.heading, x0, b.y + 38);
    ui.setFont(ctx, 8); ctx.fillStyle = P.dim; ctx.fillText(B.note, x0, b.y + 56);
    const covers = [P.cover1, P.cover2, P.cover3];
    B.items.forEach((it, i) => {
      const y = b.y + 70 + i * 52;
      ui.px(ctx, x0, y, 30, 42, covers[i % 3]);
      ui.px(ctx, x0 + 4, y + 6, 22, 2, P.white);
      ui.setFont(ctx, 10); ctx.fillStyle = P.text; ctx.fillText(it.title, x0 + 40, y);
      ui.setFont(ctx, 9); ctx.fillStyle = P.dim;
      it.copy.forEach((l, k) => ctx.fillText(l, x0 + 40, y + 14 + k * 11));
      ctx.fillStyle = P.text; ctx.fillText(it.price, x0 + 300, y);
      if (this.ordered.has(i)) { ctx.fillStyle = P.check; ctx.fillText(B.ordered, x0 + 300, y + 14); }
      else this.link(ctx, B.order, x0 + 300, y + 14, `forum-order:${i}`);
    });
    this.link(ctx, D.index.back, x0, b.y + b.h - 16, 'forum-index');
  }

  /** ⚑ S199 — THE APPLICATION, pre-filled from his 1997 file. Only Submit is live; the three reasons stay blank */
  private drawApply(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }): void {
    const A = D.apply;
    const has = (id: string) => ledger.records.includes(id);
    // ⚑ W1-D5 (walkthrough 1: the application ran off the screen) — the label column is only as wide as its longest
    //   label, so the filed values have the room they need; a note that still would not fit is dropped, never clipped
    const x0 = b.x + 16, vx = b.x + 150, vmax = b.x + b.w - 12;
    ui.setFont(ctx, 12); ctx.fillStyle = P.banner; ctx.fillText(A.heading, x0, b.y + 34);
    ui.setFont(ctx, 8); ctx.fillStyle = P.dim; ctx.fillText(A.intro, x0, b.y + 50);
    let y = b.y + 64;
    const part = (t: string) => { ui.px(ctx, x0, y - 1, b.w - 32, 10, P.panel); ui.setFont(ctx, 8); ctx.fillStyle = P.panelHead; ctx.fillText(t, x0 + 2, y); y += 11; };
    const row = (label: string, value: string | null, from = A.onFile) => {
      ui.setFont(ctx, 8); ctx.fillStyle = P.text; ctx.fillText(label, x0 + 4, y);
      ctx.fillStyle = value ? P.filled : P.dim; ctx.fillText(value ?? A.none, vx, y);
      if (value) {
        const nx = vx + ctx.measureText(value).width + 6;
        if (nx + ctx.measureText(`(${from})`).width <= vmax) { ctx.fillStyle = P.dim; ctx.fillText(`(${from})`, nx, y); }
      }
      y += 11;
    };
    const pledge = has('pledge-signed') ? A.pledgeSigned : has('pledge-declined') ? A.pledgeDeclined : null;
    part(A.parts.p1);
    row(A.name, ledger.name || null);
    row(A.referred, has('channel-joined') ? A.referredValue : null);
    part(A.parts.p3);
    row(A.pastor, has('rob-spoke-mother') ? A.pastorValue : null);
    ui.setFont(ctx, 8); ctx.fillStyle = P.text; ctx.fillText(A.authority, x0 + 4, y);
    let ax = vx;
    A.authorityOpts.forEach((o, i) => {
      const on = i === A.authorityPick && has('profile-initialized');
      ui.px(ctx, ax, y + 1, 7, 7, on ? P.filled : P.white);
      ctx.fillStyle = P.text; ctx.fillText(o, ax + 10, y); ax += ctx.measureText(o).width + 18;
    });
    y += 11;
    part(A.parts.p4);
    row(A.previous, has('enrollment-acknowledged') ? A.previousValue : null);
    row(A.pledge, pledge);
    ui.setFont(ctx, 8); ctx.fillStyle = P.text; ctx.fillText(A.reasons, x0 + 4, y);
    [0, 1, 2].forEach((i) => { ctx.fillText(`${i + 1}.`, vx + i * 70, y); ui.px(ctx, vx + 10 + i * 70, y + 8, 50, 1, P.dim); });
    y += 12;
    part(A.parts.p10);
    row(A.parental, has('rob-spoke-mother') ? A.parentalValue : null);
    ui.setFont(ctx, 8); ctx.fillStyle = P.text; ctx.fillText(A.option, x0 + 4, y);
    ui.px(ctx, vx, y + 1, 7, 7, P.filled); ctx.fillStyle = P.filled; ctx.fillText(A.optionA, vx + 10, y); y += 11;
    ui.px(ctx, vx, y + 1, 7, 7, P.white); ctx.fillStyle = P.text; ctx.fillText(A.optionB, vx + 10, y); y += 12;
    ctx.fillStyle = P.filled; ctx.fillText(A.fee, x0 + 4, y); y += 14;
    if (this.applied) { ui.px(ctx, x0, y - 2, b.w - 32, 14, P.pending); ctx.fillStyle = P.text; ctx.fillText(A.received, x0 + 4, y); }
    else {
      ui.button(ctx, x0 + 4, y - 2, 110, 16, A.submit, { hover: this.hover === 'forum-submit' });
      this.hits.push({ x: x0 + 4, y: y - 2, w: 110, h: 16, id: 'forum-submit' });
    }
    this.link(ctx, D.index.back, b.x + b.w - 90, b.y + b.h - 14, 'forum-index');
  }

  /** a Resources page: the seller's voice, and at its foot the dossier card it stands on (the second reading) */
  private drawPage(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }, id: string): void {
    const pg = (D.pages as Record<string, { heading: string; lines: string[]; lineH?: number; card: { file: string; index: number } }>)[id];
    if (!pg) return;
    const x0 = b.x + 24;
    ui.setFont(ctx, 14); ctx.fillStyle = P.banner; ctx.fillText(pg.heading, x0, b.y + 40);
    ui.px(ctx, x0, b.y + 60, b.w - 48, 1, P.panelHead);
    ui.setFont(ctx, 10); ctx.fillStyle = P.text;
    // S357e — a page may set `lineH` (a thread of posts): its lines sit closer, a blank line is half a line
    if (pg.lineH) { let y = b.y + 70; for (const l of pg.lines) { if (l) { ctx.fillText(l, x0, y); y += pg.lineH; } else y += pg.lineH / 2; } }
    else pg.lines.forEach((l, i) => ctx.fillText(l, x0, b.y + 70 + i * 14));
    ui.setFont(ctx, 8); ctx.fillStyle = P.dim;
    ctx.fillText(fixes.dossier.replace('{item}', CARD_LABEL[pg.card.file] ?? pg.card.file), x0, b.y + b.h - 30);
    this.link(ctx, D.index.back, x0, b.y + b.h - 16, 'forum-index');
  }

  private drawThread(ctx: CanvasRenderingContext2D, b: { x: number; y: number; w: number; h: number }): void {
    const T = D.thread;
    // the rooms, down the left
    ui.px(ctx, b.x, b.y + 30, 96, b.h - 30, P.panel);
    ui.setFont(ctx, 9);
    ctx.fillStyle = P.dim;
    ctx.fillText(D.roomsLabel, b.x + 8, b.y + 36);
    D.rooms.forEach((r, i) => {
      const on = r === T.room;
      if (on) ui.px(ctx, b.x + 4, b.y + 50 + i * 16, 88, 14, P.panelHead);
      ctx.fillStyle = on ? P.bannerInk : P.link;
      ctx.fillText(r, b.x + 8, b.y + 52 + i * 16);
    });
    // the thread (and the way to the rest of the board)
    const x0 = b.x + 104, w0 = b.w - 112;
    this.link(ctx, D.index.back, b.x + 8, b.y + b.h - 16, 'forum-index');
    ui.setFont(ctx, 11);
    ctx.fillStyle = P.text;
    ctx.fillText(T.title, x0, b.y + 36);
    let y = b.y + 54;
    // ⚑ S342 — once his story is in play, the thread shows the post that asks for it (Gareth's) and his card under it
    for (const p of this.storyReady ? T.posts.slice(0, 1) : T.posts) {
      const h = 14 + p.lines.length * 12 + 6;
      ui.px(ctx, x0, y, w0, h, ERA1.white);
      ui.px(ctx, x0, y, w0, 12, P.postHead);
      ui.setFont(ctx, 9);
      ctx.fillStyle = P.link; ctx.fillText(p.who, x0 + 4, y + 1);
      ctx.fillStyle = P.dim; ctx.fillText(p.meta, x0 + 4 + ctx.measureText(p.who).width + 8, y + 1);
      ctx.fillStyle = P.text;
      p.lines.forEach((l, i) => ctx.fillText(l, x0 + 6, y + 16 + i * 12));
      y += h + 4;
    }
    // ⚑ S342 — what Post posts is his testimony: the programme's own card for it, filled in from Restorify Media
    const S = T.story;
    const card = (yy: number, pending: boolean): number => {
      const h = 14 + S.lines.length * 12 + 22;
      ui.px(ctx, x0, yy, w0, h, pending ? P.pending : ERA1.white);
      ui.px(ctx, x0, yy, w0, 12, P.postHead);
      ui.setFont(ctx, 9);
      ctx.fillStyle = P.link; ctx.fillText(S.who, x0 + 4, yy + 1);
      ctx.fillStyle = P.dim; ctx.fillText(pending ? S.metaPending : S.meta, x0 + 4 + ctx.measureText(S.who).width + 8, yy + 1);
      ctx.fillStyle = P.text;
      S.lines.forEach((l, i) => ctx.fillText(l, x0 + 6, yy + 16 + i * 12));
      // the attachment: the file he uploaded
      const ay = yy + 18 + S.lines.length * 12;
      ui.px(ctx, x0 + 6, ay, 9, 9, P.banner); ui.px(ctx, x0 + 9, ay + 2, 3, 5, P.bannerInk);
      ctx.fillStyle = P.link; ctx.fillText(S.attachment, x0 + 20, ay);
      return h;
    };
    if (!this.posted) {
      ui.setFont(ctx, 9);
      if (!this.storyReady) {
        ui.button(ctx, x0, y + 4, 110, 18, T.postStory, { disabled: true });
        ctx.fillStyle = P.dim;
        ctx.fillText(T.notReady, x0 + 118, y + 8);
      } else {
        ctx.fillStyle = P.dim;
        ctx.fillText(T.preview, x0, y + 2);
        const h = card(y + 14, false);
        ui.button(ctx, x0, y + 20 + h, 110, 18, T.postStory, { hover: this.hover === 'forum-post', primary: true });
        this.hits.push({ x: x0, y: y + 20 + h, w: 110, h: 18, id: 'forum-post' });
      }
    } else {
      y += card(y, true) + 4;
      ui.px(ctx, x0, y, w0, 30, P.pending);
      ui.setFont(ctx, 9);
      ctx.fillStyle = P.text;
      ctx.fillText(T.pending, x0 + 6, y + 4);
      ctx.fillStyle = P.praying;
      ctx.fillText(T.praying, x0 + 6, y + 17);
      // ⚑ W1-D3 (walkthrough 1: "how do you get out after posting?") — the page used to end on the
      //   confirmation, with only a small link in the corner and the tiny close box; two plain buttons now
      const bw = 130, by = y + 36;
      ui.button(ctx, x0, by, bw, 18, T.afterBoard, { hover: this.hover === 'forum-index' });
      this.hits.push({ x: x0, y: by, w: bw, h: 18, id: 'forum-index' });
      ui.button(ctx, x0 + bw + 8, by, bw, 18, T.afterClose, { hover: this.hover === 'forum-close' });
      this.hits.push({ x: x0 + bw + 8, y: by, w: bw, h: 18, id: 'forum-close' });
    }
  }
}

/**
 * ⚑ S342 — THE 2003 BROWSER'S CHROME, one function (his 9 Nov: the DVD page "doesn't even have the browser look, so it
 * is not connected to the browser of the project"). WebView 6, as Harbor has always drawn it — title bar, the menu
 * bar, Back · Forward · Stop · Refresh · Home, the address bar with Go — and now a status bar at the foot. Harbor
 * (Web2003App) and Restorify Media's site (testimony.ts: Daniel's page, the parents' form, the DVD collection) both
 * draw through it, in the same window, so the 2003 web is one browser. Returns the page's rect and the live controls.
 */
export function drawWebView(ctx: CanvasRenderingContext2D, o: {
  title: string; address: string; closeId: string; backId?: string | null; homeId?: string | null; status?: string;
  hover?: string;
}): { page: { x: number; y: number; w: number; h: number }; hits: Hit[] } {
  const hits: Hit[] = [];
  const c = ui.windowFrame(ctx, WX, WY, WW, WH, `${o.title} - ${D.browser}`, true);
  hits.push({ x: c.closeBox.x, y: c.closeBox.y, w: c.closeBox.w, h: c.closeBox.h, id: o.closeId });
  // the menu bar
  ui.px(ctx, c.x, c.y, c.w, 58, ERA1.beige);
  ui.setFont(ctx, 9);
  ctx.fillStyle = ERA1.black;
  let mx = c.x + 6;
  for (const m of D.menus) { ctx.fillText(m, mx, c.y + 3); mx += ctx.measureText(m).width + 12; }
  ui.px(ctx, c.x, c.y + 15, c.w, 1, ERA1.grey);
  // the toolbar: Back · Forward · Stop · Refresh · Home (Back and Home live only where they lead somewhere)
  let tx = c.x + 4;
  D.toolbar.forEach((t, i) => {
    const w = ctx.measureText(t).width + 14;
    const id = i === 0 ? o.backId : i === 4 ? o.homeId : null;
    ui.button(ctx, tx, c.y + 18, w, 18, t, { disabled: i === 1 || i === 2 || (i === 0 && !id), hover: !!id && o.hover === id });
    if (id) hits.push({ x: tx, y: c.y + 18, w, h: 18, id });
    tx += w + 3;
  });
  // the address bar
  ctx.fillStyle = ERA1.greyDark;
  ctx.fillText(D.addressLabel, c.x + 6, c.y + 43);
  ui.bevel(ctx, c.x + 50, c.y + 40, c.w - 90, 15, false);
  ui.px(ctx, c.x + 52, c.y + 42, c.w - 94, 11, ERA1.white);
  ctx.fillStyle = ERA1.black;
  ctx.fillText(o.address, c.x + 55, c.y + 43);
  ui.button(ctx, c.x + c.w - 36, c.y + 40, 32, 15, D.go, {});
  // the status bar
  const sy = c.y + c.h - 13;
  ui.px(ctx, c.x, sy, c.w, 13, ERA1.beige);
  ui.bevel(ctx, c.x + 2, sy + 1, c.w - 70, 11, false);
  ui.bevel(ctx, c.x + c.w - 66, sy + 1, 64, 11, false);
  ui.setFont(ctx, 8); ctx.fillStyle = ERA1.black;
  ctx.fillText(o.status ?? D.statusDone, c.x + 6, sy + 2);
  ctx.fillText(D.statusZone, c.x + c.w - 62, sy + 2);
  return { page: { x: c.x, y: c.y + 60, w: c.w, h: c.h - 60 - 13 }, hits };
}
