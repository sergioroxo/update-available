/**
 * ⚑ THE COURSE BUILDER — Era 3's sixth board job, and the era's whole thesis
 * landing on one field. Design: docs/reinterp/ERA3_NARRATIVE.md §3 ("Build the
 * course module — set the modules — and the price... the funnel stops being a
 * metaphor at the number"). Content + every string, including all ten pricing
 * witnesses: `data/dialog/s3_course.json`, whose `_doc` is the authorship note
 * this file answers to.
 *
 * THE SCREEN, in one line: a list of lessons Vera can include or leave out, and
 * a row of prices she taps between. Nothing on it approves or objects to
 * anything she picks — not which modules, not the price, not "no charge," not
 * the highest tier. The frame never plays here either: no score, no bar, no
 * congratulation, just a flat "Published." once she presses the one button
 * that commits it.
 *
 * ⚑ THE PRICE IS THE SCENE. Everything else on this screen can be read as
 * misguided sincerity — a woman assembling lessons she believes will help. The
 * number is the one thing that cannot be read that way: it is what turns the
 * lesson plan into a product. So the price row gets no less care than the
 * modules — a genuinely low tier, a genuinely high one, and a real, selectable,
 * entirely unpunished "no charge" — and different choices file different
 * witnesses while the screen itself stays exactly the same for all of them.
 *
 * REGISTER: `operable`, and the satire lives ENTIRELY in this file's own
 * chrome — `data/dialog/s3_course.json`'s cheerful "Bundle what she'll walk
 * through," the PLATFORM PICK tag, the tidy "how this looks to her" preview.
 * The module content is never the joke: it is written in the documented
 * pastoral-process register of the women's ex-gay literature (see the data
 * file's `_doc` for the citation), not a parody of it.
 *
 * LEDGER: `ledger.records`, the piece's one generic string bag (used the same
 * way across `os.ts`, `irc.ts`, `flat.ts`, `app.ts` for "a thing that happened"
 * facts) — there is no dedicated `course` field on `Ledger` and this file does
 * not touch `src/state/ledger.ts`. Exactly one line is filed, at publish: its
 * full text is selected — never composed — from this surface's own
 * `pricing[].witness` in the data, keyed by which price was live and whether
 * the module set still matches the system's own starting picks.
 *
 * Implements `TaskSurface` (src/desktop/apps/taskSurface.ts): no canvas of its
 * own, no direct pointer access (the id a hit rect was registered under comes
 * back through `press`, already resolved by the seam's press/release law), no
 * timer it owns — nothing here animates, so `version()` only ever moves on a
 * real choice.
 */
import { px, setFont, wrapText } from '../theme/chrome';
import { ERA3, button, tag, field } from '../theme/era3';
import { ledger } from '../../state/ledger';
import type { TaskSurface, TaskArea, TaskHit } from './taskSurface';
import course from '../../../data/dialog/s3_course.json';

interface ModuleDef {
  id: string;
  title: string;
  desc: string;
  /** pre-ticked by the system when the screen first opens */
  defaultOn: boolean;
}

interface PriceDef {
  id: string;
  /** what the button reads when it is not the free tier */
  label: string;
  /** the real, selectable, unpunished option */
  noCharge: boolean;
  /** the platform's own suggested rate — marked, never pre-forced */
  recommended: boolean;
  /** two complete sentences, never one composed from parts. `default` fires
   *  when the published module set still matches the system's own starting
   *  picks; `changed` fires the moment she has touched a single toggle. */
  witness: { default: string; changed: string };
}

const APP = course.app;
const MODULES = course.modules as ModuleDef[];
const PRICING = course.pricing as PriceDef[];

export class CourseBuilder implements TaskSurface {
  readonly id = 'course';
  readonly windowTitle = APP.title;
  readonly beats = ['open', 'priced', 'free', 'published'] as const;

  private included = new Set<string>(MODULES.filter(m => m.defaultOn).map(m => m.id));
  private priceId: string = (PRICING.find(p => p.recommended) ?? PRICING[0]).id;
  private published = false;
  private ownVersion = 0;

  version(): number { return this.ownVersion; }
  private bump(): void { this.ownVersion++; }

  /** the tile goes grey once the module is filed — never on a count, never on
   *  a timer, only on the one act that actually finishes the job. */
  complete(): boolean { return this.published; }

  private price(): PriceDef { return PRICING.find(p => p.id === this.priceId) ?? PRICING[0]; }

  // ── input ──────────────────────────────────────────────────────────────
  /** ⚑ a published module is filed, not editable — the same law as the
   *  correction list's own decisions: once an act lands on the record, this
   *  screen stops offering to take it back. */
  press(id: string): boolean {
    if (this.published) return false;
    if (id.startsWith('mod:')) {
      const mid = id.slice(4);
      if (this.included.has(mid)) this.included.delete(mid); else this.included.add(mid);
      this.bump();
      return true;
    }
    if (id.startsWith('price:')) {
      const pid = id.slice(6);
      if (PRICING.some(p => p.id === pid) && pid !== this.priceId) { this.priceId = pid; this.bump(); }
      return true;
    }
    if (id === 'publish') { this.publish(); return true; }
    return false;
  }

  /** the one act this screen files. See the class header — the witness is
   *  chosen, never assembled, and it is the only place any choice made here
   *  ever shows up again. */
  private publish(): void {
    if (this.published) return;
    this.published = true;
    const p = this.price();
    const stock = MODULES.every(m => this.included.has(m.id) === m.defaultOn);
    ledger.records.push(stock ? p.witness.default : p.witness.changed);
    this.bump();
  }

  // ── the tile ───────────────────────────────────────────────────────────
  /** ⚑ "legible as a thumbnail before it is legible as text" — draws the
   *  actual module rows (filled = included) and the live price, so a reviewer
   *  can read her current choices off the board without opening the job. */
  thumb(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    px(ctx, x, y, w, h, ERA3.white);
    px(ctx, x, y, w, 1, ERA3.glassHi);
    px(ctx, x, y + h - 1, w, 1, ERA3.glassEdge);
    const pad = 6;
    const rows = MODULES.length;
    const rowH = Math.max(2, Math.floor((h - pad * 2 - 14) / rows));
    MODULES.forEach((m, i) => {
      const ry = y + pad + i * rowH;
      px(ctx, x + pad, ry, w - pad * 2, Math.max(1, rowH - 2), this.included.has(m.id) ? ERA3.accent : ERA3.glassEdge);
    });
    const p = this.price();
    setFont(ctx, 9); ctx.fillStyle = ERA3.ink;
    ctx.fillText(p.noCharge ? APP.noChargeTag : p.label, x + pad, y + h - 12);
  }

  // ── draw ───────────────────────────────────────────────────────────────
  draw(ctx: CanvasRenderingContext2D, area: TaskArea, hit: (r: TaskHit) => void): void {
    const { x, y, w, h } = area;
    const PRICE_H = 66;
    const PUB_H = 22;
    const GAP = 8;
    const topH = Math.max(90, h - PRICE_H - PUB_H - GAP * 2);

    const previewW = Math.round(w * 0.34);
    const listW = w - previewW - 12;

    this.drawModules(ctx, x, y, listW, topH, hit);
    this.drawPreview(ctx, x + listW + 12, y, previewW, topH);

    const priceY = y + topH + GAP;
    this.drawPricing(ctx, x, priceY, w, hit);

    const pubY = priceY + PRICE_H + GAP;
    this.drawPublish(ctx, x, pubY, w, PUB_H, hit);
  }

  private drawModules(
    ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, hit: (r: TaskHit) => void
  ): void {
    setFont(ctx, 11); ctx.fillStyle = ERA3.titleText;
    ctx.fillText(APP.heading, x, y);
    setFont(ctx, 9); ctx.fillStyle = ERA3.grey;
    ctx.fillText(APP.sub, x, y + 13);

    const listY = y + 28;
    const listH = h - 28;
    const rowH = Math.floor(listH / MODULES.length);

    MODULES.forEach((m, i) => {
      const ry = listY + i * rowH;
      const on = this.included.has(m.id);
      px(ctx, x, ry, w, rowH - 1, ERA3.white);
      px(ctx, x, ry, w, 1, ERA3.glassHi);
      px(ctx, x, ry + rowH - 2, w, 1, ERA3.glassEdge);

      const btnW = 62;
      const btnH = Math.min(16, rowH - 6);
      const btnX = x + w - btnW - 6;
      const btnY = ry + Math.round((rowH - 1 - btnH) / 2);

      setFont(ctx, 10); ctx.fillStyle = ERA3.ink;
      ctx.fillText(m.title, x + 6, ry + 2);
      setFont(ctx, 8); ctx.fillStyle = ERA3.grey;
      const descMaxW = Math.max(20, btnX - (x + 6) - 8);
      const descLine = wrapText(ctx, m.desc, descMaxW)[0] ?? '';
      ctx.fillText(descLine, x + 6, ry + Math.min(rowH - 10, 14));

      button(ctx, btnX, btnY, btnW, btnH, on ? APP.toggleOn : APP.toggleOff,
        { tone: on ? 'good' : undefined, size: 8 });
      hit({ x: btnX, y: btnY, w: btnW, h: btnH, id: 'mod:' + m.id });
    });
  }

  /** the live "what this looks like on the page" mock — the customer never
   *  sees a toggle or a tier list, only the module titles that survived and
   *  the number at the bottom. That gap between the two screens is the point. */
  private drawPreview(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    px(ctx, x, y, w, h, ERA3.white);
    px(ctx, x, y, w, 1, ERA3.glassHi);
    px(ctx, x, y, 1, h, ERA3.glassEdge);
    px(ctx, x, y + h - 1, w, 1, ERA3.glassEdge);
    px(ctx, x + w - 1, y, 1, h, ERA3.glassEdge);

    setFont(ctx, 9); ctx.fillStyle = ERA3.grey;
    ctx.fillText(APP.previewHeading, x + 8, y + 6);
    setFont(ctx, 11); ctx.fillStyle = ERA3.ink;
    ctx.fillText(APP.courseTitle, x + 8, y + 18);
    setFont(ctx, 8); ctx.fillStyle = ERA3.grey;
    ctx.fillText(APP.courseBy, x + 8, y + 31);

    let ly = y + 46;
    const bottomReserve = y + h - 32;
    setFont(ctx, 8); ctx.fillStyle = ERA3.greyDk;
    for (const m of MODULES) {
      if (!this.included.has(m.id)) continue;
      if (ly > bottomReserve) break;
      const line = wrapText(ctx, '· ' + m.title, w - 16)[0] ?? '';
      ctx.fillText(line, x + 8, ly);
      ly += 11;
    }

    const p = this.price();
    const priceText = p.noCharge ? APP.previewPriceFree : p.label;
    setFont(ctx, 13); ctx.fillStyle = ERA3.accent;
    ctx.fillText(priceText, x + 8, y + h - 28);
    // ⚑ a mock, not a control — disabled, and no hit rect: the customer's
    // button lives on a screen this one only imitates.
    button(ctx, x + 8, y + h - 14, w - 16, 11, APP.previewCta, { size: 8, disabled: true });
  }

  private drawPricing(
    ctx: CanvasRenderingContext2D, x: number, y: number, w: number, hit: (r: TaskHit) => void
  ): void {
    setFont(ctx, 10); ctx.fillStyle = ERA3.titleText;
    ctx.fillText(APP.priceHeading, x, y);
    setFont(ctx, 9); ctx.fillStyle = ERA3.grey;
    ctx.fillText(APP.priceSub, x, y + 13);

    const rowY = y + 30;
    const n = PRICING.length;
    const gap = 6;
    const btnW = Math.floor((w - gap * (n - 1)) / n);
    const btnH = 16;

    PRICING.forEach((p, i) => {
      const bx = x + i * (btnW + gap);
      const selected = p.id === this.priceId;
      if (p.recommended) {
        setFont(ctx, 7);
        tag(ctx, bx, rowY - 10, APP.recommendedTag, ERA3.white, ERA3.accent);
      }
      const label = p.noCharge ? APP.noChargeTag : p.label;
      button(ctx, bx, rowY, btnW, btnH, label, { tone: selected ? 'good' : undefined, primary: selected, size: 9 });
      hit({ x: bx, y: rowY, w: btnW, h: btnH, id: 'price:' + p.id });
    });

    const p = this.price();
    const priceText = p.noCharge ? APP.noChargeTag : p.label;
    field(ctx, x, rowY + btnH + 6, 220, 14, APP.currentPriceLabel.replace('{price}', priceText));
  }

  private drawPublish(
    ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, hit: (r: TaskHit) => void
  ): void {
    const btnW = 140;
    const bx = x + w - btnW;
    if (this.published) {
      setFont(ctx, 10); ctx.fillStyle = ERA3.grey;
      ctx.fillText(APP.publishedTag, bx, y + Math.round((h - 10) / 2));
      return;
    }
    button(ctx, bx, y, btnW, h, APP.publishButton, { tone: 'good', primary: true, size: 10 });
    hit({ x: bx, y, w: btnW, h, id: 'publish' });
  }

  /**
   * ?debug=1 only, reached as `course:open` / `course:priced` / `course:free` /
   * `course:published` — `graceQueueLite.debugBeat`'s `<jobId>:<beat>` forward
   * already opens the board and this job before calling in here (see that
   * file's own debugBeat), so every one of these lands on a screen a reviewer
   * can actually see. `open` resets to the screen's own starting state, since
   * a prior debug jump may have left it mid-choice.
   */
  debugBeat(beat: string): void {
    switch (beat) {
      case 'open':
        this.included = new Set(MODULES.filter(m => m.defaultOn).map(m => m.id));
        this.priceId = (PRICING.find(p => p.recommended) ?? PRICING[0]).id;
        this.published = false;
        this.bump();
        break;
      case 'priced':
        this.priceId = 'high';
        this.bump();
        break;
      case 'free':
        this.priceId = 'free';
        this.bump();
        break;
      case 'published':
        this.publish();
        break;
    }
  }
}
