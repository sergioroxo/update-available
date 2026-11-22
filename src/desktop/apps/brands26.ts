/**
 * ⚑ S418 (UiB job 34 Part B; T101) — THE THREE BRANDS, LOUDER EACH ACT. His 22 Nov on job 33's look: "Too plain, not over the
 * top" … "it needs much more"; the sketches he said yes to (docs/reinterp/refs/2026_os_sketches_2026-11-22.html) set the
 * hierarchy: L glossy (Act I), Second Thoughts a loud yellow takeover of the whole desktop (Act II), Shepherd Live™ a TV show
 * about her (Act III), each falling when it falls in the story.
 *
 * The desktop's chrome per brand is desk26.ts's (`LOOKS`: the menu bar, the windows, the dock, the wallpaper); the AI's window
 * per brand is lScreen.ts's (`AI_LOOKS`); Shepherd's television is shepherd.ts's. This file holds the brands' own words and
 * their INSTRUMENTS, drawn where the acts put them:
 *   · Second Thoughts' WELLBEING SCORE (a dial: 34 ▼, "3 doors closed this week") and its ACHIEVEMENT STICKERS (each put up by
 *     the act when the thing it names has been done to her), at the head of its window;
 *   · the "MUTED FOR YOU" sticker it slaps on a row of her Kettle (on the row, never on a person's words);
 *   · the die-cut sticker and the starburst the brands use.
 * Everything here is the products' self-presentation, in their own voice: the frame never scores or rewards the visitor, and
 * none of it is ever drawn over a person's words (felt stays bare).
 */
import { setFont, px } from '../theme/chrome';
import { OS26, PLACE } from '../theme/era4';
import { fillRR, rr, alpha, heavyText, hazard } from './desk26';
import ACTS from '../../../data/dialog/s4_acts.json';

/** the brands' words (s4_acts.json screen.os.brand) */
export const BRAND = (ACTS as unknown as { screen: { os: { brand: {
  l: { boast: string; personal: string; made: string; free: string };
  st: { name: string; using: string; tile: string; score: string; scoreLabel: string; scoreSub: string;
    stickers: Record<StickerId, string>; muted: string };
  shepherd: { episode: string; sponsor: string; ticker: string; ring: string; applause: string };
} } } }).screen.os.brand;

export type StickerId = 'junie' | 'dad' | 'calm';
/** the stickers' tilts (a few degrees each, as stickers are slapped on: the screens are smooth, his 9 Nov exception) */
const TILT: Record<StickerId, number> = { junie: -2.5, dad: 1.8, calm: -1.2 };
const STICK_H = 21;
const DIAL = 58;

/**
 * A DIE-CUT STICKER: its words heavy on its colour, a white cut edge round it, a hard shadow under it, tilted. Returns its width.
 * `measure` only: nothing is drawn.
 */
export function sticker(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tilt: number, fill: string, ink: string, size = 11, measure = false): number {
  setFont(ctx, size);
  const w = Math.ceil(ctx.measureText(text).width) + 18, h = Math.round(size * 1.9);
  if (measure) return w;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2); ctx.rotate((tilt * Math.PI) / 180); ctx.translate(-w / 2, -h / 2);
  fillRR(ctx, 1, 3, w, h, h / 2, alpha(OS26.stInk, 0.55));
  fillRR(ctx, -2, -2, w + 4, h + 4, h / 2 + 2, OS26.stSticker);
  fillRR(ctx, 0, 0, w, h, h / 2, fill);
  setFont(ctx, size); heavyText(ctx, text, 9, Math.round((h - size) / 2) - 1, ink, 0.5);
  ctx.restore();
  return w;
}

/** where the stickers go: the first row beside the dial's words (`first` px wide, from the words' left edge), the rows after it
 *  the window's whole width (`full`, from its left edge, under the dial); each keeps its place as others arrive */
function layStickers(ctx: CanvasRenderingContext2D, first: number, full: number, ids: StickerId[]): { id: StickerId; x: number; row: number; w: number }[] {
  const out: { id: StickerId; x: number; row: number; w: number }[] = [];
  let x = 0, row = 0;
  for (const id of (['junie', 'dad', 'calm'] as StickerId[]).filter((k) => ids.includes(k))) {
    const sw = sticker(ctx, BRAND.st.stickers[id], 0, 0, 0, '', '', 11, true);
    if (x > 0 && x + sw > (row === 0 ? first : full)) { row++; x = 0; }
    out.push({ id, x, row, w: sw });
    x += sw + 8;
  }
  return out;
}
/** the height of Second Thoughts' head (the dial, its words, the stickers under them) in a window `w` wide */
export function scoreHeight(ctx: CanvasRenderingContext2D, w: number, ids: StickerId[]): number {
  const laid = layStickers(ctx, Math.max(60, w - DIAL - 14), w, ids);
  const rows = laid.length ? Math.max(...laid.map((s) => s.row)) + 1 : 0;
  return 8 + (rows <= 1 ? Math.max(DIAL, 36 + rows * (STICK_H + 6)) : DIAL + 6 + (rows - 1) * (STICK_H + 6)) + 12;
}
/**
 * SECOND THOUGHTS' HEAD: THE WELLBEING SCORE AND THE STICKERS. A dial — a ring a third full in its yellow, the score in the
 * middle with its falling arrow — and beside it its words: "YOUR WELLBEING SCORE", "▼ 3 doors closed this week" (the doors that
 * closed on her, counted as her score); under them the stickers for what it did to her, as each is done. Still: nothing moves.
 */
export function drawScore(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, ids: StickerId[]): void {
  const B = BRAND.st, r = DIAL / 2, cx = x + r, cy = y + r;
  // the dial: its dark track, its yellow arc (the score's third of the ring), a tick at the arc's end
  ctx.lineCap = 'round';
  ctx.strokeStyle = OS26.stPanel2; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(cx, cy, r - 4, 0, Math.PI * 2); ctx.stroke();
  const k = Number(B.score) / 100;
  ctx.strokeStyle = PLACE.sunHi; ctx.beginPath(); ctx.arc(cx, cy, r - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke();
  ctx.lineCap = 'butt';
  setFont(ctx, 22);
  const sw = Math.ceil(ctx.measureText(B.score).width);
  heavyText(ctx, B.score, Math.round(cx - sw / 2), cy - 15, OS26.stText, 0.9);
  // the falling arrow under the number
  ctx.fillStyle = OS26.stAlarm; ctx.beginPath(); ctx.moveTo(cx - 5, cy + 9); ctx.lineTo(cx + 5, cy + 9); ctx.lineTo(cx, cy + 15); ctx.closePath(); ctx.fill();
  // its words
  const tx = x + DIAL + 14;
  setFont(ctx, 11); heavyText(ctx, B.scoreLabel, tx, y + 4, PLACE.sunHi, 0.4);
  ctx.fillStyle = OS26.stAlarm; ctx.beginPath(); ctx.moveTo(tx, y + 22); ctx.lineTo(tx + 8, y + 22); ctx.lineTo(tx + 4, y + 28); ctx.closePath(); ctx.fill();
  setFont(ctx, 11); ctx.fillStyle = OS26.stAlarm; ctx.fillText(B.scoreSub, tx + 12, y + 19);
  // the stickers, as they are earned: the first beside the dial's words, the rest under the dial
  for (const s of layStickers(ctx, Math.max(60, w - DIAL - 14), w, ids)) {
    const fill = s.id === 'calm' ? OS26.stInk : PLACE.sunHi, ink = s.id === 'calm' ? PLACE.sunHi : OS26.stInk;
    const sx = s.row === 0 ? tx + s.x : x + 2 + s.x, sy = s.row === 0 ? y + 38 : y + DIAL + 6 + (s.row - 1) * (STICK_H + 6);
    sticker(ctx, B.stickers[s.id], sx, sy, TILT[s.id], fill, ink);
  }
}

/**
 * "MUTED FOR YOU" — Second Thoughts' sticker, slapped across a muted row of her Kettle (its act, on the row: over the row's
 * right side and the system's own "muted by Second Thoughts", never over a person's words).
 */
export function mutedSticker(ctx: CanvasRenderingContext2D, rowX: number, rowY: number, rowW: number, rowH: number): void {
  setFont(ctx, 12);
  const w = sticker(ctx, BRAND.st.muted, 0, 0, 0, '', '', 12, true);
  const x = rowX + rowW - w - 26, y = rowY + Math.round(rowH / 2) - 13;
  ctx.save(); ctx.beginPath(); ctx.rect(rowX - 6, rowY - 6, rowW + 12, rowH + 12); ctx.clip();
  sticker(ctx, BRAND.st.muted, x, y, -6, PLACE.sunHi, OS26.stInk, 12);
  ctx.restore();
}

/** a starburst badge (the ad's "FREE FROM 18"): a many-pointed star in `fill`, its words heavy across it, tilted */
export function starburst(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, text: string, fill: string, ink: string, tilt = -12): void {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate((tilt * Math.PI) / 180);
  const pts = 16;
  const path = (R: number, r2: number): void => {
    ctx.beginPath();
    for (let i = 0; i < pts * 2; i++) { const a = (i / (pts * 2)) * Math.PI * 2, rad = i % 2 ? r2 : R; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rad, Math.sin(a) * rad); }
    ctx.closePath();
  };
  path(r + 3, r * 0.82 + 3); ctx.fillStyle = OS26.stSticker; ctx.fill();
  path(r, r * 0.82); ctx.fillStyle = fill; ctx.fill();
  setFont(ctx, 11);
  const lines = text.split(' ');
  lines.forEach((l, i) => { const lw = ctx.measureText(l).width; heavyText(ctx, l, -Math.round(lw / 2), -Math.round(lines.length * 6) + i * 12, ink, 0.5); });
  ctx.restore();
}

/** the ad's yellow, loud: a hazard band down its left edge (the brand's motif), in `h` */
export function hazardEdge(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number): void {
  ctx.save(); rr(ctx, x, y, w + radius, h, radius); ctx.clip();
  px(ctx, x, y, w, h, PLACE.sunHi);
  hazard(ctx, x, y, w, h, OS26.stInk, 1, 5);
  ctx.restore();
}
