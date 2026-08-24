/**
 * ⚑ ERA 3, THE JOB: ORDER THE PODCAST — `ERA3_NARRATIVE.md` §3's pool entry
 * ("drag three clips into a running order — other people's worst minutes,
 * arranged well") and taskSurface.ts's seam, built 2026-08-24.
 *
 * THE POINT OF THE SCENE, verbatim from the brief: *other people's worst
 * minutes, arranged well.* The craft is real — a good running order genuinely
 * is better than a bad one — and the material is three women's lowest
 * moments, being sequenced for retention. Vera is good at this. **The horror
 * is entirely in the competence.**
 *
 * ⚑ DRAG IS NOT AVAILABLE. CLAUDE.md's input law is click/tap only, resolved
 * on release, no drags. So the reordering verb is UP/DOWN ARROWS on each row,
 * not a lift-then-place two-step. Chosen over lift-and-place for three
 * reasons: (1) it needs no hidden "what is currently lifted?" state for the
 * player to track across a tap — the affordance IS the control, always
 * visible, always in the same place; (2) it degrades gracefully to exactly
 * three rows (a lift/place scheme earns its keep with longer lists; three
 * items reorder completely in at most two presses either way); (3) it is the
 * one reordering idiom a 2010s "content queue" tool already used unprompted
 * (playlist apps, ticket boards), so it reads as software Vera already knows
 * rather than as a puzzle this screen invented.
 *
 * ⚑ THE SUGGESTED ORDER IS THE STARTING ORDER, per clip `systemRank`
 * (`s3_podcast.json`). A `recommended` pill appears on any row currently
 * holding its system-suggested slot — present on all three at open, and
 * dropping off a row the moment she moves it away from that slot. It is
 * descriptive, not evaluative: it never says a row is right or wrong, only
 * where the system would have put it. Nothing else on the screen ever
 * responds to what she chooses. No score, no approval, no warning — the
 * brief's law held exactly: **whatever order she chooses, nothing on screen
 * approves or objects.**
 *
 * ⚑ THE WITNESS IS FILED ONCE, AT THE LOCK PRESS, and it is per clip per
 * final position — so a different running order genuinely files a different
 * record, invisibly, while the screen that produced it stays identical
 * either way. See `publish()` and `s3_podcast.json`'s `_docWitness`.
 *
 * LEDGER FIELD: `ledger.media`, `outcome: 'watched'` for all three clips.
 * Of the four outcomes that field allows ('declined' | 'watched' | 'skipped'
 * | 'interrupted'), this job has no exclusion mechanic — all three clips are
 * always in the published order, only their position varies — so 'declined'
 * and 'skipped' (both meaning "not used") and 'interrupted' (meaning "broken
 * off") do not fit any clip. 'watched' is the one outcome in that union that
 * means "this piece of media reached its audience", which is exactly what
 * locking the order does to all three. The position-specific witness text
 * (not the outcome value) carries the thing that actually varies.
 *
 * REGISTER (see `s3_podcast.json`'s `_docRegister`): the row chrome, the role
 * tags, the recommended pill and the lock button are `operable` — real
 * broadcast-production vocabulary laid sincerely over three worst minutes,
 * and the satire lives entirely there. The three `quote` strings are `felt`:
 * bare, sincere, never commented on by the tool's own voice, never scored.
 */
import { px, setFont, wrapText } from '../theme/chrome';
import * as aero from '../theme/era3';
import { ERA3 } from '../theme/era3';
import { ledger } from '../../state/ledger';
import type { TaskSurface, TaskArea, TaskHit } from './taskSurface';
import j from '../../../data/dialog/s3_podcast.json';

interface ClipDef {
  id: string;
  title: string;
  author: string;
  duration: string;
  role: string;
  systemRank: number;
  quote: string;
}

const CLIPS = j.clips as ClipDef[];
const WITNESS = j.witness as Record<string, Record<string, string>>;
const APP = j.app;

/** a small deterministic string hash — the waveform's seed, so a clip's
 *  picture is stable across redraws without needing Math.random or a stored
 *  array of bar heights. */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
  return h || 1;
}

/** a row of bars, heights derived from `seed` alone — the same clip always
 *  draws the same waveform, on the tile thumbnail and on the open row. */
function drawWaveform(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  seed: number, color: string
): void {
  const barW = 2; const gap = 1;
  const n = Math.max(4, Math.floor(w / (barW + gap)));
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const bh = Math.max(1, Math.round(((s >>> 8) % 1000) / 1000 * h));
    const bx = x + i * (barW + gap);
    const by = y + Math.floor((h - bh) / 2);
    px(ctx, bx, by, barW, bh, color);
  }
}

export class PodcastOrderApp implements TaskSurface {
  readonly id = 'podcast';
  readonly windowTitle = APP.title;
  readonly beats = ['open', 'reordered', 'published'] as const;

  private v = 0;
  /** clip ids, current running order — starts as the system's suggestion */
  private order: string[] = CLIPS.slice().sort((a, b) => a.systemRank - b.systemRank).map(c => c.id);
  private published = false;

  version(): number { return this.v; }
  private bump(): void { this.v++; }

  /** finished when the order is locked — never on a count, never on a timer */
  complete(): boolean { return this.published; }

  private clip(id: string): ClipDef { return CLIPS.find(c => c.id === id)!; }
  private clipsInOrder(): ClipDef[] { return this.order.map(id => this.clip(id)); }

  private moveUp(i: number): void {
    if (this.published || i <= 0 || i >= this.order.length) return;
    [this.order[i - 1], this.order[i]] = [this.order[i], this.order[i - 1]];
    this.bump();
  }

  private moveDown(i: number): void {
    if (this.published || i < 0 || i >= this.order.length - 1) return;
    [this.order[i], this.order[i + 1]] = [this.order[i + 1], this.order[i]];
    this.bump();
  }

  /** the lock — files the whole order at once, one witness line per clip per
   *  the slot it actually ended up in. Idempotent: a second press does nothing. */
  private publish(): void {
    if (this.published) return;
    this.published = true;
    this.clipsInOrder().forEach((c, i) => {
      ledger.media.push({ id: c.id, outcome: 'watched', witness: WITNESS[c.id][String(i + 1)] });
    });
    this.bump();
  }

  // ── the tile's picture ───────────────────────────────────────────────────
  /** the job read as an image: three waveforms, stacked — not an icon of
   *  "audio", the actual thing this job arranges. */
  thumb(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    px(ctx, x, y, w, h, ERA3.sysBand);
    const rowH = Math.floor((h - 8) / CLIPS.length);
    CLIPS.forEach((c, i) => {
      const ry = y + 4 + i * rowH;
      px(ctx, x + 4, ry, w - 8, rowH - 4, ERA3.white);
      drawWaveform(ctx, x + 8, ry + 3, w - 16, rowH - 10, hashStr(c.id), ERA3.accent);
    });
  }

  // ── the open job ─────────────────────────────────────────────────────────
  draw(ctx: CanvasRenderingContext2D, area: TaskArea, hit: (r: TaskHit) => void): void {
    setFont(ctx, 13); ctx.fillStyle = ERA3.titleText;
    ctx.fillText(APP.heading, area.x, area.y);
    setFont(ctx, 10); ctx.fillStyle = ERA3.grey;
    ctx.fillText(APP.sub, area.x, area.y + 16);
    setFont(ctx, 9); ctx.fillStyle = ERA3.greyDk;
    ctx.fillText(APP.listLabel, area.x, area.y + 34);
    px(ctx, area.x, area.y + 46, area.w, 1, ERA3.glassEdge);

    const FOOTER_H = 40;
    const GAP = 6;
    const rowsTop = area.y + 52;
    const rowH = Math.floor((area.h - 52 - FOOTER_H - GAP * 2) / 3);

    const order = this.clipsInOrder();
    order.forEach((c, i) => {
      const ry = rowsTop + i * (rowH + GAP);
      this.drawRow(ctx, area.x, ry, area.w, rowH, c, i, order.length, hit);
    });

    const by = area.y + area.h - FOOTER_H + 8;
    if (this.published) {
      setFont(ctx, 12); ctx.fillStyle = ERA3.titleText;
      ctx.fillText(APP.publishedHeading, area.x, by + 2);
      setFont(ctx, 10); ctx.fillStyle = ERA3.grey;
      ctx.fillText(APP.publishedSub, area.x, by + 18);
    } else {
      const bw = 140; const bh = 24;
      const bx = area.x + area.w - bw;
      aero.button(ctx, bx, by, bw, bh, APP.publishButton, { primary: true, tone: 'good' });
      hit({ x: bx, y: by, w: bw, h: bh, id: 'podcast-publish' });
    }
  }

  private drawRow(
    ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
    clip: ClipDef, idx: number, total: number, hit: (r: TaskHit) => void
  ): void {
    px(ctx, x, y, w, h, ERA3.white);
    px(ctx, x, y, 3, h, ERA3.memberSpine); // a real person speaking, same spine as everywhere else this era

    const textX = x + 10;
    const ctrlW = 20;
    const ctrlX = x + w - ctrlW - 4;
    const waveW = 60;
    const waveX = ctrlX - waveW - 14;
    const textW = waveX - textX - 8;

    setFont(ctx, 11); ctx.fillStyle = ERA3.titleText;
    const label = `${idx + 1}. ${clip.title} — ${clip.author}`;
    ctx.fillText(label, textX, y + 3);

    if (clip.systemRank === idx + 1) {
      const lw = ctx.measureText(label).width;
      aero.tag(ctx, textX + lw + 8, y + 3, APP.recommendedTag, ERA3.white, ERA3.lambTag);
    }

    setFont(ctx, 9); ctx.fillStyle = ERA3.grey;
    ctx.fillText(clip.role, textX, y + 17);

    setFont(ctx, 10); ctx.fillStyle = ERA3.ink;
    const quoted = `“${clip.quote}”`;
    wrapText(ctx, quoted, textW).slice(0, 2).forEach((ln, i) => ctx.fillText(ln, textX, y + 30 + i * 12));

    setFont(ctx, 9); ctx.fillStyle = ERA3.grey;
    ctx.fillText(clip.duration, waveX, y + 3);
    drawWaveform(ctx, waveX, y + h - 20, waveW, 16, hashStr(clip.id), ERA3.accent);

    const btnS = 18;
    const upY = y + 1;
    const downY = y + h - btnS - 1;
    aero.button(ctx, ctrlX, upY, btnS, btnS, APP.moveUp, { disabled: idx === 0, size: 9 });
    if (idx > 0 && !this.published) hit({ x: ctrlX, y: upY, w: btnS, h: btnS, id: 'podcast-up-' + idx });
    aero.button(ctx, ctrlX, downY, btnS, btnS, APP.moveDown, { disabled: idx === total - 1, size: 9 });
    if (idx < total - 1 && !this.published) hit({ x: ctrlX, y: downY, w: btnS, h: btnS, id: 'podcast-down-' + idx });
  }

  press(id: string): boolean {
    if (id === 'podcast-publish') { this.publish(); return true; }
    if (id.startsWith('podcast-up-')) { this.moveUp(Number(id.slice(11))); return true; }
    if (id.startsWith('podcast-down-')) { this.moveDown(Number(id.slice(13))); return true; }
    return false;
  }

  debugBeat(beat: string): void {
    switch (beat) {
      case 'open': break; // the default state already IS this beat
      case 'reordered': this.moveDown(0); break;
      case 'published': this.moveDown(0); this.publish(); break;
    }
  }
}
