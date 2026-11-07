/**
 * ⚑ S321 — THE CLIP: an AI-made anti-"gender ideology" video, invented (DESIGN_2026_V3_PRESSURE_2026-11-07.md beat 11,
 * his ruling: "direct and brute: not violence, but close enough to the real genre to teach the visitor to recognise
 * it"). Its tropes are the ones RESEARCH_2026_V3_THREADS thread 4 documents — contagion (one friend, a chat, a class),
 * "who is talking to your child", a line that only goes up, "share before it's too late" — drawn in my own frames and
 * words, never copied from any real video. No real people, no faces: grey figures that turn red.
 *
 * ⚑ IT SAYS WHAT IT IS. A "Made with AI" stamp sits in its own corner on every frame (GLAAD's 2026 index warns of AI
 * anti-LGBTQ+ fakes; the piece shows one plainly labelled, which is more than the genre does).
 *
 * ONE SHARED PAINTER: the bot's map panel on the monitor plays it, and the room builder projects the same frames on
 * the ceiling. Signature (stable — the room imports it):
 *     drawContagionClip(ctx, t, x, y, w, h)
 * `t` is seconds since the clip began; it loops. The picture changes at most ~8 times a second (the figures' spread is
 * quantised), so a caller that uploads on change stays cheap. Words: `data/dialog/s4_v3.json` `clip`.
 */
import V3 from '../../../data/dialog/s4_v3.json';
import { CLIP } from '../theme/era4';
import { px } from '../theme/chrome';
import { fontFor } from '../theme/fonts';

const C = V3.clip;
export const CLIP_LOOP_SECONDS = C.frames.length * C.frameSeconds;

/** a faceless figure, `s` px per cell: head, body */
function figure(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, col: string): void {
  px(ctx, x + s, y, 2 * s, 2 * s, col);
  px(ctx, x, y + 2 * s, 4 * s, 4 * s, col);
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, size: number, maxW: number): number {
  ctx.font = fontFor(size, 'e4');
  while (size > 6 && ctx.measureText(text).width > maxW) { size--; ctx.font = fontFor(size, 'e4'); }
  return size;
}

export function drawContagionClip(ctx: CanvasRenderingContext2D, t: number, x: number, y: number, w: number, h: number): void {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  if (w <= 0 || h <= 0) return;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.textBaseline = 'top';
  px(ctx, x, y, w, h, CLIP.field);
  const loop = ((t % CLIP_LOOP_SECONDS) + CLIP_LOOP_SECONDS) % CLIP_LOOP_SECONDS;
  const f = Math.min(C.frames.length - 1, Math.floor(loop / C.frameSeconds));
  const k = Math.floor(((loop - f * C.frameSeconds) / C.frameSeconds) * 8) / 8;   // 0..1 within the frame, in eighths
  const bandH = Math.max(12, Math.round(h * 0.2));
  const sceneH = h - bandH;
  const s = Math.max(1, Math.floor(sceneH / 18));
  const midX = x + Math.floor(w / 2), midY = y + Math.floor(sceneH / 2);
  if (f === 0) {
    // one friend: two figures; the second catches it
    figure(ctx, midX - 8 * s, midY - 3 * s, s, CLIP.caught);
    figure(ctx, midX + 4 * s, midY - 3 * s, s, k >= 0.5 ? CLIP.caught : CLIP.figure);
    if (k >= 0.25) px(ctx, midX - 3 * s, midY, 6 * s, s, CLIP.caught);
  } else if (f === 1) {
    // a group chat: a phone, its bubbles going red one by one
    const pw = 10 * s, ph = Math.min(sceneH - 4 * s, 16 * s);
    px(ctx, midX - pw / 2, y + 2 * s, pw, ph, CLIP.line);
    px(ctx, midX - pw / 2 + s, y + 3 * s, pw - 2 * s, ph - 2 * s, CLIP.band);
    for (let i = 0; i < 4; i++) {
      const by = y + 4 * s + i * 3 * s;
      if (by + 2 * s > y + 2 * s + ph - s) break;
      px(ctx, midX - pw / 2 + 2 * s + (i % 2) * 2 * s, by, pw - 6 * s, 2 * s, k * 4 > i ? CLIP.caught : CLIP.figure);
    }
  } else if (f === 2) {
    // a whole class: a grid, the red spreading from one desk
    const cols = 7, rows = 3, gx = 6 * s, gy = 7 * s;
    const ox = midX - Math.floor((cols * gx) / 2), oy = y + 2 * s;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const d = Math.abs(c - 3) + Math.abs(r - 1);
      figure(ctx, ox + c * gx, oy + r * gy, s, d <= k * 6 ? CLIP.caught : CLIP.figure);
    }
  } else if (f === 3) {
    // who is talking to your child: a small figure in the dark, lit by a screen
    const glowW = 10 * s;
    px(ctx, midX - glowW, midY - 6 * s, glowW * 2, 12 * s, CLIP.band);
    px(ctx, midX + 2 * s, midY - 2 * s, 3 * s, 4 * s, CLIP.glow);
    figure(ctx, midX - 4 * s, midY - 3 * s, s, CLIP.figure);
    if (k >= 0.5) px(ctx, midX + 2 * s, midY - 2 * s, 3 * s, 4 * s, CLIP.caught);
  } else if (f === 4) {
    // a line that only goes up
    const gw = Math.min(w - 8 * s, 40 * s), gh = sceneH - 6 * s;
    const gx0 = midX - Math.floor(gw / 2), gy0 = y + 3 * s;
    px(ctx, gx0, gy0 + gh, gw, s, CLIP.line);
    px(ctx, gx0, gy0, s, gh, CLIP.line);
    const steps = Math.max(2, Math.floor(gw / (2 * s)));
    const shown = Math.floor(steps * Math.max(0.2, k + 0.125));
    for (let i = 0; i < shown; i++) {
      const v = Math.pow(i / steps, 2.2);
      px(ctx, gx0 + i * 2 * s, gy0 + gh - Math.round(v * gh) - s, 2 * s, s * 2, CLIP.caught);
    }
  } else {
    // share before it's too late: dots on a map, all red now, and the share arrow
    for (let i = 0; i < 26; i++) {
      const dx = x + 3 * s + ((i * 37) % Math.max(1, w - 6 * s));
      const dy = y + 2 * s + ((i * 23) % Math.max(1, sceneH - 4 * s));
      px(ctx, dx, dy, 2 * s, 2 * s, CLIP.caught);
    }
    px(ctx, midX - 3 * s, midY, 6 * s, s, CLIP.ink);
    px(ctx, midX + 2 * s, midY - 2 * s, s, 5 * s, CLIP.ink);
  }
  // the caption band, in the genre's own shouting capitals
  px(ctx, x, y + sceneH, w, bandH, CLIP.band);
  const cap = C.frames[f];
  const size = fitFont(ctx, cap, Math.max(7, Math.round(bandH * 0.62)), w - 8);
  ctx.fillStyle = CLIP.ink;
  const tw = Math.ceil(ctx.measureText(cap).width);
  ctx.fillText(cap, x + Math.max(4, Math.round((w - tw) / 2)), y + sceneH + Math.round((bandH - size) / 2));
  // the stamp: it says what it is
  const tagSize = Math.max(7, Math.min(11, Math.round(h * 0.08)));
  ctx.font = fontFor(tagSize, 'e4');
  const tagW = Math.ceil(ctx.measureText(C.aiTag).width) + 8;
  px(ctx, x + 3, y + 3, tagW, tagSize + 5, CLIP.stamp);
  ctx.fillStyle = CLIP.stampInk;
  ctx.fillText(C.aiTag, x + 7, y + 5);
  ctx.restore();
}
