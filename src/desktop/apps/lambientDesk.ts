/**
 * ⚑ S332 — LAMBIENT AT THE DESK: the rule taught, the refusal answered (DESIGN_2016_CONNECTIONS_2026-11-08.md, his
 * second answers). Two things every 2016 job shares, so they live once:
 *
 *  · `drawLambientNote` — Lambient's line in a job's RULE PANEL (the tool's side of the screen), with its tag. It
 *    teaches the rule in its own kind voice ("We say 'dependency' because a name can hurt someone."). It is never
 *    drawn on a person's words, never on the phone, and it never carries a source (sources stay on the era site).
 *  · `refuse` — the shift's ONE ladder. Refusing is real and filed (the dismissal law). The 1st refusal: Lambient
 *    pushes and the job stays open; the 2nd: it reprimands and the job stays open; the 3rd: it does the job itself;
 *    from the 4th: an administrator does it. Nothing on screen counts (the frame never plays: no score, no counter).
 *    ⚑ The update is not triggered by this (ETHICS 11); see s3_queue.json `refusal._doc`.
 */
import q from '../../../data/dialog/s3_queue.json';
import { px, setFont, wrapText } from '../theme/chrome';
import { ERA3, tag } from '../theme/era3';
import { ledger } from '../../state/ledger';

const R = (q as unknown as { refusal: {
  lines: string[]; lambientTag: string; adminTag: string;
  doneByYou: string; doneByLambient: string; doneByAdmin: string;
  witnessAsked: string; witnessLambient: string; witnessAdmin: string;
} }).refusal;

export const REFUSAL = R;

/** the count lives in memory for the shift only (reset with the era's day) */
export const deskRefusals = { n: 0 };
export function resetRefusals(): void { deskRefusals.n = 0; }

export type Voice = 'lambient' | 'admin';
export type DeskNote = { line: string; voice: Voice };
export type RefusalAnswer = DeskNote & { forced: boolean };

/** she refused `what` (a witness label from data). Returns what Lambient says and whether the job is now done for her. */
export function refuse(what: string): RefusalAnswer {
  const n = ++deskRefusals.n;
  const forced = n >= 3;
  const voice: Voice = n >= 4 ? 'admin' : 'lambient';
  const line = R.lines[Math.min(n, R.lines.length) - 1];
  const tpl = !forced ? R.witnessAsked : voice === 'admin' ? R.witnessAdmin : R.witnessLambient;
  ledger.era3Jobs.push({ id: 'refusal', witness: tpl.replace('{what}', what) });
  return { line, voice, forced };
}

/** who finished a job, as the job's own small tag says it */
export function doneByLabel(by: 'you' | Voice): string {
  return by === 'you' ? R.doneByYou : by === 'admin' ? R.doneByAdmin : R.doneByLambient;
}

/** Lambient's (or the platform's) line, tagged, wrapped to `w`. Returns the height it used. */
export function drawLambientNote(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, note: DeskNote, size = 11): number {
  const label = note.voice === 'admin' ? R.adminTag : R.lambientTag;
  const tx = tag(ctx, x, y, label, ERA3.white, note.voice === 'admin' ? ERA3.sysTag : ERA3.lambTag);
  setFont(ctx, size);
  const first = wrapText(ctx, note.line, Math.max(40, x + w - tx - 2));
  ctx.fillStyle = note.voice === 'admin' ? ERA3.ink : ERA3.greyDk;
  // the first line sits beside the tag; any more wrap under it at the panel's own margin
  const rest = first.length > 1 ? wrapText(ctx, first.slice(1).join(' '), w) : [];
  ctx.fillText(first[0] ?? '', tx, y);
  rest.forEach((ln, i) => ctx.fillText(ln, x, y + (i + 1) * (size + 3)));
  return (1 + rest.length) * (size + 3);
}

/** the height `drawLambientNote` will use, without drawing */
export function measureLambientNote(ctx: CanvasRenderingContext2D, w: number, note: DeskNote, size = 11): number {
  setFont(ctx, 8);
  const tagW = ctx.measureText(note.voice === 'admin' ? R.adminTag : R.lambientTag).width + 8;
  setFont(ctx, size);
  const first = wrapText(ctx, note.line, Math.max(40, w - tagW - 2));
  const rest = first.length > 1 ? wrapText(ctx, first.slice(1).join(' '), w) : [];
  return (1 + rest.length) * (size + 3);
}

/** a plain band under a note, so it reads as the tool's voice and not as page text */
export function noteBand(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  px(ctx, x, y, w, h, ERA3.lambBand);
  px(ctx, x, y, w, 1, ERA3.lambTag);
}
