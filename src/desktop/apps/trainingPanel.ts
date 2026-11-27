/**
 * ⚑ S433 (UiB job 40; his 26 Nov: "I don't fully remember what I had to do") — GRACEPLATFORM'S TRAINING FRAME, drawn the same
 * way on every page of the training: the board's header, each lesson's page and the welcome's cards.
 *
 *  · `drawKicker` — "TRAINING · STEP n OF 4 · NAME" in the platform's small caps, and four pips after it (done, here, ahead), so
 *    the step she is on is read at a glance, on the board and on the lesson alike.
 *  · `drawNowRow` — the one thing to do now, tagged NOW (the tour teaches the tag: "marked NOW"), bold, on a white strip with the
 *    platform's blue spine: the loudest line on a lesson's page. As tall as its words (whole lines), never cut.
 *
 * The words are data (data/strings/e3_training.json). Palette from the era's theme only; text through the era's own fonts, so
 * the headset's larger text (fonts.ts `textPx`) lays out the same way.
 */
import training from '../../../data/strings/e3_training.json';
import * as aero from '../theme/era3';
import { ERA3 } from '../theme/era3';
import { px, setFont, wrapText } from '../theme/chrome';
import { textPx } from '../theme/fonts';
import { studioFont } from './veraSurfaces';

export const TRAINING = training;
/** the training's steps: the welcome, then the three lessons */
export const TRAINING_STEPS = 4;
export type LessonKey = 'testimony' | 'places' | 'family';
const LESSON_STEP: Record<LessonKey, number> = { testimony: 2, places: 3, family: 4 };
/** a lesson's step in the training (2–4) */
export function lessonStep(id: string): number { return LESSON_STEP[id as LessonKey] ?? 0; }
/** a lesson's NOW line for the moment it is in (e3_training.json `lessons.<id>.now`) */
export function lessonNow(id: LessonKey, moment: string): string {
  const now = (training.lessons[id] as { now: Record<string, string> }).now;
  return now[moment] ?? now.turn;
}

/** the kicker's words: "TRAINING · STEP n OF 4", with the step's name when given */
export function kickerText(step: number, name?: string): string {
  if (step > TRAINING_STEPS) return training.kickerDone;   // every step done
  const t = name ? training.kickerNamed : training.kicker;
  return t.replace('{n}', String(step)).replace('{m}', String(TRAINING_STEPS)).replace('{name}', name ?? '');
}

/** the kicker's height (its type's own size, so the headset's larger text is allowed for) */
export function kickerHeight(): number { return Math.round(textPx(9, 'e3')) + 3; }

/**
 * The kicker at (x, y), `maxW` wide at most: the words, then the four pips (done · here · ahead). `step` 0…4 is the step she is
 * on; `TRAINING_STEPS + 1` draws every pip done. Returns the right edge it used.
 */
export function drawKicker(ctx: CanvasRenderingContext2D, x: number, y: number, maxW: number, step: number, name?: string): number {
  const PIP = 7, GAP = 3, pipsW = TRAINING_STEPS * PIP + (TRAINING_STEPS - 1) * GAP;
  setFont(ctx, 9); ctx.fillStyle = ERA3.greyDk;
  let words = kickerText(step, name);
  // the name goes before anything is cut: a kicker is never sliced at its box's edge
  if (ctx.measureText(words).width > maxW - pipsW - 8) words = kickerText(step);
  ctx.fillText(words, x, y);
  const tw = Math.ceil(ctx.measureText(words).width);
  const h = Math.round(textPx(9, 'e3'));
  const py = y + Math.max(0, Math.round((h - PIP) / 2));
  let pxx = x + tw + 8;
  for (let i = 1; i <= TRAINING_STEPS; i++) {
    const fill = i < step ? ERA3.accent : i === step ? ERA3.amber : ERA3.glassEdge;
    px(ctx, pxx, py, PIP, PIP, fill);
    pxx += PIP + GAP;
  }
  return pxx - GAP;
}

/** the NOW row's lines at width `w` (the tag's width taken off the first) */
function nowLines(ctx: CanvasRenderingContext2D, w: number, text: string): { lines: string[]; tagW: number; lead: number } {
  setFont(ctx, 8);
  const tagW = Math.ceil(ctx.measureText(training.nowTag).width) + 8 + 6;
  studioFont(ctx, 13, true);
  const lead = Math.round(textPx(13, 'e3')) + 4;
  const lines = wrapText(ctx, text, w - 14 - tagW);
  return { lines, tagW, lead };
}

/** the NOW row's height at width `w` */
export function nowRowHeight(ctx: CanvasRenderingContext2D, w: number, text: string): number {
  const { lines, lead } = nowLines(ctx, w, text);
  return Math.max(24, lines.length * lead + 8);
}

/** a lesson's teaching line (e3_training.json `lessons.<id>.teaches`) */
export function lessonTeaches(id: LessonKey): string { return (training.lessons[id] as { teaches: string }).teaches; }
/** the tallest of a lesson's NOW lines at width `w`: its page keeps one layout whatever the moment */
export function lessonNowMax(ctx: CanvasRenderingContext2D, id: LessonKey, w: number): number {
  const now = (training.lessons[id] as { now: Record<string, string> }).now;
  return Math.max(...Object.values(now).map((t) => nowRowHeight(ctx, w, t)));
}

/** the NOW row at (x, y), `w` wide (at least `minH` tall): the white strip, the blue spine, the tag and the ask. Returns its height. */
export function drawNowRow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, text: string, minH = 0): number {
  const { lines, tagW, lead } = nowLines(ctx, w, text);
  const h = Math.max(24, lines.length * lead + 8, minH);
  px(ctx, x, y, w, h, ERA3.white);
  px(ctx, x, y, 3, h, ERA3.accent);
  px(ctx, x + 1, y + h, w, 1, ERA3.glassEdge);
  const ty = y + Math.round((h - lines.length * lead) / 2) + 2;
  aero.tag(ctx, x + 10, ty + Math.max(0, Math.round((lead - 4 - 12) / 2)), training.nowTag, ERA3.white, ERA3.accent);
  studioFont(ctx, 13, true); ctx.fillStyle = ERA3.titleText;
  lines.forEach((ln, i) => ctx.fillText(ln, x + 10 + tagW, ty + i * lead));
  return h;
}
