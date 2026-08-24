/**
 * ⚑ CUT THE STORY — one of the day's six jobs (`taskSurface.ts`'s seam),
 * ERA3_BUILD_PLAN stage 4. Board id `story`, row already in
 * `data/dialog/s3_queue.json`'s `board` array (label "Cut the Story", note
 * "forty seconds for the vertical").
 *
 * ⚑ THE MATERIAL, and why it is Renata's and not Noa's. `s3_queue.json`'s own
 * `story._doc` ties the suggested in-point to correction 3's `edit.find` —
 * "the minute Renata forgot to monitor herself" — which belongs to submission
 * 1 (Renata), not submission 2 (Noa's video). Correction 3 itself ("Clip for
 * the broadcast" · "mark forty seconds for the conference audio") is already
 * a CORRECTION-LIST item on Renata's testimony; this screen is what applying
 * that correction actually FEELS like from the inside — an interactive choice
 * of where forty seconds of her comes from, instead of a checkbox that marks
 * a sentence. So: no video, no `drawNoaFrame`, no webcam frame at all. What
 * is being cut is a RECORDED VOICE — correction 3 names it "conference
 * audio" — read out over her own testimony text, and the "vertical" is a
 * captioned audiogram, the exact format 2016 conference-promo clips actually
 * used. The suggested in-point is computed from correction 3's `edit.find`
 * (matched against Renata's own submission text, never duplicated as a
 * second copy of her words) so the two screens can never drift apart.
 *
 * ⚑ THE MECHANIC. `story._doc` overrides its own originating spec ("drag the
 * handles") on CLAUDE.md's own authority: a press that travels is a LOOK, so
 * dragging a scrub handle is not an input this piece has. The verb is a TAP
 * on the sentence the clip starts from — sentence-grained, not a continuous
 * scrubber — which is also sharper than dragging: she is not trimming a
 * waveform, she is choosing which of her sentences the world will see. The
 * timeline below is a waveform for legibility, but every tap on it snaps to
 * whichever of her four sentences is nearest, and the forty-second window
 * always starts exactly there.
 *
 * ⚑ THE 24s/40s TENSION (Sérgio's brief) DOES NOT APPLY HERE — Noa's
 * `NOA_SECONDS` never enters this file — but its own version exists anyway:
 * her four sentences, read at a real pace, run under forty seconds. A clip
 * that must be forty seconds has to run past the end of a sentence and into
 * silence, or double back. Rather than invent that awkwardness away, it is
 * the point: `TOTAL_SECONDS` (96) is the tape's own hand-authored length —
 * not derived from her words, but from a woman who trails off, circles back,
 * and leaves gaps CLAUDE.md's own doctrine calls the composition (the same
 * one `VOICE` in `graceQueueLite.ts` uses for Renata's voice already). The
 * suggested window (56s–96s) is built to land EXACTLY on the tape's own end —
 * the system's clip runs her right up to where she stops, so it never has to
 * show that anything was cut off. The honest alternative — starting at 0s or
 * 18s — runs past its own end into the silence after her hardest sentence,
 * which is exactly what "nothing rewards her either" should look like: a
 * clip that trails into quiet instead of landing clean.
 *
 * ⚑ WHAT I COULD NOT WIRE: `witness.declined` / `backLabel`. `drawSurface` in
 * `graceQueueLite.ts` resolves the id `board-back` to `backToBoard()` BEFORE
 * it is ever offered to `openSurface.press()` (see that file's
 * `handleClick`), so a job has no hook that fires when the player leaves it
 * unfinished — there is no lifecycle callback in `TaskSurface` for it. I did
 * not draw a second, job-owned back button to manufacture one: a screen with
 * two back controls, only one of which quietly logs something, is worse than
 * one honest gap. `story.declined` and `story.backLabel` are unused; wiring
 * them needs a small addition to the seam itself (out of the files I own).
 *
 * REGISTER: `operable` — the timeline, the pill, the publish button. Her
 * words, wherever they appear (the audiogram caption), are never captioned
 * with a verdict, a play glyph, or a badge — the same law `graceQueueLite.ts`
 * states for Noa's video, held here for Renata's voice instead.
 */
import { px, setFont, wrapText } from '../theme/chrome';
import * as aero from '../theme/era3';
import { ERA3 } from '../theme/era3';
import { ledger } from '../../state/ledger';
import type { TaskSurface, TaskArea, TaskHit } from './taskSurface';
import q from '../../../data/dialog/s3_queue.json';

interface StoryCopy {
  appTitle: string;
  heading: string;
  sub: string;
  suggestedTag: string;
  windowLabel: string;
  publish: string;
  publishedHeading: string;
  publishedSub: string;
  backLabel: string;
  witness: {
    opened: string;
    acceptedSuggestion: string;
    chosenOther: string;
    declined: string;
  };
}

type SubmissionRow = { id: number; author: string; text: string };
type CorrectionRow = { id: number; edit?: { find?: string } };

const STORY = q.story as unknown as StoryCopy;
const RENATA = (q.submissions as SubmissionRow[]).find(s => s.id === 1);
const CORRECTION_3 = (q.corrections as CorrectionRow[]).find(c => c.id === 3);

/** her testimony, split into the sentences a tap can land on. Sourced from
 *  her own submission text (never duplicated as a second string) so this
 *  screen can never say something different from the correction list. */
const SENTENCES: string[] = RENATA ? RENATA.text.split(/(?<=[.?!])\s+/) : [];

/** the sentence correction 3 already marks — matched against her own text,
 *  not hardcoded as an index, so a future edit to either can't drift apart
 *  silently. Falls back to sentence 0 if the match ever fails (it should not). */
const SUGGESTED_IDX = Math.max(0, SENTENCES.findIndex(s => s === CORRECTION_3?.edit?.find));

/** the tape's own length — see the file header on why it outruns her words. */
const TOTAL_SECONDS = 96;

/** hand-authored timing for her four sentences: where each starts and ends,
 *  and — by what is left OUT of this array — where the silences are. Same
 *  doctrine as `VOICE` in `graceQueueLite.ts`: authored, not derived, and the
 *  gaps are hers. */
const BEATS: { start: number; end: number }[] = [
  { start: 0, end: 14 },   // "I don't have a tidy version of this."
  { start: 18, end: 52 },  // the long doubling sentence — she circles it
  { start: 56, end: 84 },  // the roommate, the laugh, the minute she forgot
  { start: 86, end: 96 }   // "I don't know what that minute means yet."
];
const BEAT_COUNT = Math.min(SENTENCES.length, BEATS.length);

function parseMMSS(label: string): number {
  const [m, s] = label.split(':').map(Number);
  return (m || 0) * 60 + (s || 0);
}
const WINDOW_SECONDS = parseMMSS(STORY.windowLabel) || 40;

function mmss(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** deterministic texture only — the STRUCTURE (which seconds are speech vs
 *  silence) is authored in `BEATS` above; this just keeps the bars inside a
 *  speech run from reading as a flat brick. */
function grain(n: number): number {
  let h = (n * 2654435761) >>> 0;
  h ^= h >>> 13; h = (h * 2246822519) >>> 0; h ^= h >>> 16;
  return (h % 1000) / 1000;
}

/** which sentence (or none, mid-silence) a given second falls in */
function beatAt(sec: number): number {
  for (let i = 0; i < BEAT_COUNT; i++) if (sec >= BEATS[i].start && sec < BEATS[i].end) return i;
  return -1;
}

/** 0..1 waveform height for one second of tape */
function levelAt(sec: number): number {
  const b = beatAt(sec);
  if (b < 0) return 0.08; // between sentences: almost nothing
  const dur = BEATS[b].end - BEATS[b].start;
  const k = (sec - BEATS[b].start) / Math.max(1, dur);
  const envelope = 0.32 + 0.5 * Math.sin(Math.PI * Math.min(1, k * 1.15));
  return Math.min(1, envelope + grain(sec) * 0.22);
}

/** the boundary (in seconds) a tap should snap to for sentence `i` — the
 *  midpoint of the silence on either side, so there is no dead zone anywhere
 *  on the tape and every second belongs to exactly one sentence to tap. */
function segRange(i: number): { from: number; to: number } {
  const from = i === 0 ? 0 : (BEATS[i - 1].end + BEATS[i].start) / 2;
  const to = i === BEAT_COUNT - 1 ? TOTAL_SECONDS : (BEATS[i].end + BEATS[i + 1].start) / 2;
  return { from, to };
}

export class StoryCutTask implements TaskSurface {
  readonly id = 'story';
  readonly windowTitle = STORY.appTitle;
  readonly beats = ['open', 'moved', 'published', 'publishedOther'] as const;

  private v = 0;
  private inIdx = SUGGESTED_IDX;
  private published = false;
  private openedFiled = false;

  version(): number { return this.v; }
  private bump(): void { this.v++; }

  complete(): boolean { return this.published; }

  private inStart(): number { return BEATS[Math.min(this.inIdx, BEAT_COUNT - 1)]?.start ?? 0; }
  private windowEnd(): number { return Math.min(TOTAL_SECONDS, this.inStart() + WINDOW_SECONDS); }

  /** the words the current window actually covers, for the caption — every
   *  sentence whose span overlaps [inStart, windowEnd). Her own words, shown
   *  plain: this IS the job, not a comment on it. */
  private windowText(): string {
    const end = this.windowEnd();
    const parts: string[] = [];
    for (let i = 0; i < BEAT_COUNT; i++) {
      if (BEATS[i].start < end && BEATS[i].end > this.inStart()) parts.push(SENTENCES[i]);
    }
    return parts.join(' ');
  }

  private selectSentence(i: number): void {
    if (i < 0 || i >= BEAT_COUNT || this.published) return;
    if (i === this.inIdx) return;
    this.inIdx = i;
    this.bump();
  }

  private publish(): void {
    if (this.published) return;
    this.published = true;
    const accepted = this.inIdx === SUGGESTED_IDX;
    ledger.media.push({
      id: 'story',
      outcome: accepted ? 'watched' : 'interrupted',
      witness: accepted ? STORY.witness.acceptedSuggestion : STORY.witness.chosenOther
    });
    this.bump();
  }

  // ── the tile's picture: a waveform, the suggested stretch marked ─────────
  thumb(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    px(ctx, x, y, w, h, ERA3.sysBand);
    const bars = 40;
    const barW = w / bars;
    const sugStart = BEATS[SUGGESTED_IDX].start;
    const sugFrom = sugStart / TOTAL_SECONDS;
    const sugTo = this.windowEndFraction(sugStart);
    for (let i = 0; i < bars; i++) {
      const t = (i / bars) * TOTAL_SECONDS;
      const frac = i / bars;
      const lvl = levelAt(t);
      const bh = Math.max(2, Math.round(lvl * (h - 8)));
      const inWindow = frac >= sugFrom && frac <= sugTo;
      px(ctx, x + i * barW, y + h - 4 - bh, Math.max(1, barW - 1), bh, inWindow ? ERA3.accent : ERA3.grey);
    }
  }
  private windowEndFraction(startSec: number): number {
    return Math.min(TOTAL_SECONDS, startSec + WINDOW_SECONDS) / TOTAL_SECONDS;
  }

  // ── the open job ─────────────────────────────────────────────────────────
  draw(ctx: CanvasRenderingContext2D, area: TaskArea, hit: (r: TaskHit) => void): void {
    if (!this.openedFiled) {
      this.openedFiled = true;
      ledger.media.push({ id: 'story', outcome: 'watched', witness: STORY.witness.opened });
    }

    if (this.published) { this.drawPublished(ctx, area); return; }

    setFont(ctx, 13); ctx.fillStyle = ERA3.titleText;
    ctx.fillText(STORY.heading, area.x, area.y);
    setFont(ctx, 10); ctx.fillStyle = ERA3.grey;
    ctx.fillText(STORY.sub, area.x, area.y + 16);
    px(ctx, area.x, area.y + 32, area.w, 1, ERA3.glassEdge);

    // ── the timeline ─────────────────────────────────────────────────────
    const LABEL_W = 30;
    const tlY = area.y + 42;
    const barTop = tlY + 16;
    const barH = 26;
    const trackX = area.x + LABEL_W;
    const trackW = area.w - LABEL_W * 2;

    setFont(ctx, 8); ctx.fillStyle = ERA3.grey;
    ctx.fillText('0:00', area.x, barTop + barH - 8);
    const totalLabel = mmss(TOTAL_SECONDS);
    ctx.fillText(totalLabel, area.x + area.w - ctx.measureText(totalLabel).width, barTop + barH - 8);

    // the window duration badge — fixed, never moves, labels the clip length
    setFont(ctx, 9); ctx.fillStyle = ERA3.titleText;
    const wlw = ctx.measureText(STORY.windowLabel).width;
    px(ctx, area.x + area.w - wlw - 10, tlY, wlw + 8, 12, ERA3.white);
    ctx.fillText(STORY.windowLabel, area.x + area.w - wlw - 6, tlY + 1);

    // bars, one per second
    for (let s = 0; s < TOTAL_SECONDS; s++) {
      const bx = trackX + (s / TOTAL_SECONDS) * trackW;
      const bw = Math.max(1, trackW / TOTAL_SECONDS - 1);
      const lvl = levelAt(s);
      const bh = Math.max(2, Math.round(lvl * (barH - 4)));
      const inWindow = s >= this.inStart() && s < this.windowEnd();
      px(ctx, bx, barTop + barH - 4 - bh, bw, bh, inWindow ? ERA3.accent : ERA3.grey);
    }

    // the suggested tag — always at the same place, whatever she chooses
    const sugX = trackX + (BEATS[SUGGESTED_IDX].start / TOTAL_SECONDS) * trackW;
    setFont(ctx, 8);
    const tagW = ctx.measureText(STORY.suggestedTag).width + 8;
    px(ctx, sugX, tlY, tagW, 11, ERA3.amber);
    ctx.fillStyle = ERA3.ink;
    ctx.fillText(STORY.suggestedTag, sugX + 4, tlY + 1);
    px(ctx, sugX, tlY + 11, 1, 6, ERA3.amber);

    // the in-point marker
    const inX = trackX + (this.inStart() / TOTAL_SECONDS) * trackW;
    px(ctx, inX, barTop - 2, 2, barH + 4, ERA3.titleText);

    // one hit rect per sentence, covering the whole tape with no dead zone
    for (let i = 0; i < BEAT_COUNT; i++) {
      const { from, to } = segRange(i);
      const hx = trackX + (from / TOTAL_SECONDS) * trackW;
      const hw = ((to - from) / TOTAL_SECONDS) * trackW;
      hit({ x: hx, y: tlY, w: hw, h: barH + 16, id: 'story-seg-' + i });
    }

    // ── the preview card (a captioned audiogram, the era's own vertical format) ──
    const cardY = barTop + barH + 14;
    const cardW = 92;
    const cardH = Math.max(60, area.y + area.h - cardY - 30);
    px(ctx, area.x, cardY, cardW, cardH, ERA3.taskBot);
    px(ctx, area.x, cardY, cardW, 1, ERA3.frame);
    px(ctx, area.x, cardY, 1, cardH, ERA3.frame);
    px(ctx, area.x, cardY + cardH - 1, cardW, 1, ERA3.frame);
    px(ctx, area.x + cardW - 1, cardY, 1, cardH, ERA3.frame);
    // a small audiogram sliver at the top of the card
    for (let i = 0; i < 14; i++) {
      const t = this.inStart() + (i / 14) * Math.min(WINDOW_SECONDS, 6);
      const lvl = levelAt(t);
      const bh = Math.max(1, Math.round(lvl * 10));
      px(ctx, area.x + 6 + i * 5, cardY + 8 + (10 - bh), 3, bh, ERA3.accentHi);
    }
    setFont(ctx, 8); ctx.fillStyle = ERA3.white;
    wrapText(ctx, this.windowText(), cardW - 12).slice(0, 12)
      .forEach((ln, i) => ctx.fillText(ln, area.x + 6, cardY + 26 + i * 10));

    // time range beside the card
    const infoX = area.x + cardW + 14;
    setFont(ctx, 10); ctx.fillStyle = ERA3.titleText;
    ctx.fillText(`${mmss(this.inStart())}–${mmss(this.windowEnd())}`, infoX, cardY);

    // ── publish ──────────────────────────────────────────────────────────
    const bw = 96; const bh2 = 22;
    const bx = area.x + area.w - bw; const by = area.y + area.h - bh2;
    aero.button(ctx, bx, by, bw, bh2, STORY.publish, { primary: true });
    hit({ x: bx, y: by, w: bw, h: bh2, id: 'story-publish' });
  }

  private drawPublished(ctx: CanvasRenderingContext2D, area: TaskArea): void {
    setFont(ctx, 14); ctx.fillStyle = ERA3.titleText;
    ctx.fillText(STORY.publishedHeading, area.x, area.y);
    setFont(ctx, 11); ctx.fillStyle = ERA3.grey;
    ctx.fillText(STORY.publishedSub, area.x, area.y + 20);

    const cardW = 100; const cardH = 178;
    const cardX = area.x; const cardY = area.y + 44;
    px(ctx, cardX, cardY, cardW, cardH, ERA3.taskBot);
    px(ctx, cardX, cardY, cardW, 1, ERA3.frame);
    px(ctx, cardX, cardY, 1, cardH, ERA3.frame);
    px(ctx, cardX, cardY + cardH - 1, cardW, 1, ERA3.frame);
    px(ctx, cardX + cardW - 1, cardY, 1, cardH, ERA3.frame);
    for (let i = 0; i < 16; i++) {
      const t = this.inStart() + (i / 16) * Math.min(WINDOW_SECONDS, 8);
      const lvl = levelAt(t);
      const bh = Math.max(1, Math.round(lvl * 12));
      px(ctx, cardX + 6 + i * 5.5, cardY + 10 + (12 - bh), 3, bh, ERA3.accentHi);
    }
    setFont(ctx, 8); ctx.fillStyle = ERA3.white;
    wrapText(ctx, this.windowText(), cardW - 12).slice(0, 16)
      .forEach((ln, i) => ctx.fillText(ln, cardX + 6, cardY + 30 + i * 10));
  }

  press(id: string): boolean {
    if (id.startsWith('story-seg-')) { this.selectSentence(Number(id.slice(10))); return true; }
    if (id === 'story-publish') { this.publish(); return true; }
    return false;
  }

  debugBeat(beat: string): void {
    switch (beat) {
      case 'open': this.inIdx = SUGGESTED_IDX; this.published = false; this.bump(); break;
      case 'moved': this.debugBeat('open'); this.selectSentence(SUGGESTED_IDX === 0 ? 1 : 0); break;
      case 'published': this.debugBeat('open'); this.publish(); break;
      case 'publishedOther': this.debugBeat('moved'); this.publish(); break;
    }
  }
}
