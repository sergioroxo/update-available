/**
 * LAMBY, THE CHARACTER — the production renderer (Session 45, S2R.3C).
 *
 * S43 built the Clippy-lineage rig (moods `cheerful | clinical | sterile |
 * sad`, the appear-bounce, the idle drift, and the sad DEFLATE that the shame
 * beat depends on) inside the standalone rig lab, `src/lambyrig/lambyRig.ts`
 * + `?lambyrig=1`, and deliberately did not adopt it — "S45 does that".
 *
 * This file is that adoption. The lab's drawing and pose math are PORTED here
 * verbatim in behaviour (same fleece layout, same face/gesture rules, same
 * three motion curves, same era-1 tokens — no invented colors, no ctx.rotate),
 * with two changes the production surface needs and the lab did not:
 *   1. a `scale` — the lab draws Lamby at ~115×125 logical px on a bare stage;
 *      a window on the 512×384 desktop wants him smaller and placed;
 *   2. no stage clip and no speech bubble — the alert window carries Lamby's
 *      lines in its own type area, so a cartoon bubble would say it twice
 *      (and a bubble during the sad hold would undercut the hold).
 *
 * WHY A PORT AND NOT AN IMPORT: the lab exports only `startLambyRig(canvas)`,
 * which owns a whole canvas, the URL params and its own rAF loop; its drawing
 * lives in private methods of a non-exported class. Extracting them would mean
 * editing `lambyRig.ts`, which this session's file fence forbids ("consume it,
 * don't edit it"). The honest follow-up is one commit: have the lab import
 * THIS module and delete its private copies, so the character has exactly one
 * definition. Flagged in the session log — until then, a change to Lamby's
 * look must be made in both files.
 *
 * REGISTER: Lamby is `operable` and only ever `operable`. He is never drawn
 * inside a `felt` window (the Caleb chat, his return lines, the residue) —
 * see src/desktop/apps/caleb.ts, which imports nothing from this file.
 */
import { ERA1 } from '../theme/era1';
import * as ui from '../theme/chrome';

export type LambyMood = 'cheerful' | 'clinical' | 'sterile' | 'sad';
export type LambyAction = 'idle' | 'point' | 'appear';

export interface LambyPose {
  mood: LambyMood;
  action: LambyAction;
  /** seconds since this Lamby appeared — drives blink, drift and the appear pop */
  t: number;
  /** the `t` at which the current mood was set — drives the sad deflate */
  moodStart: number;
  /** 1 = the rig lab's size (~115 wide × 125 tall logical px) */
  scale?: number;
}

const CYCLE = 3.2; // s — the lab's animation cycle (blink phase + appear pop)

/** Slow ambient sway during idle — the "little fidget". Silenced while sad:
 *  stillness is the point of the hold. */
function idleDrift(p: LambyPose): { dx: number; dy: number } {
  if (p.action !== 'idle' || p.mood === 'sad') return { dx: 0, dy: 0 };
  return { dx: Math.sin(p.t * 0.9) * 1.6, dy: Math.sin(p.t * 1.6 + 1.2) * 1.2 };
}

/** Clippy-style pop: overshoot on the way up, a squash on landing, then settle. */
function appearBounce(p: LambyPose): { sx: number; sy: number } {
  if (p.action !== 'appear') return { sx: 1, sy: 1 };
  const local = Math.min(p.t, CYCLE) / CYCLE;
  if (local >= 0.6) return { sx: 1, sy: 1 };
  const q = local / 0.6;
  const wave = Math.sin(q * Math.PI * 2.5) * (1 - q);
  return { sx: 1 - wave * 0.16, sy: 1 + wave * 0.24 };
}

/** THE SHAME MECHANISM (S2R.3C): a slow sink-and-hold, not a scold — the
 *  apparatus looks hurt and stays that way. A faint tremor once settled keeps
 *  the held pose reading as breath, not a frozen sprite. */
function deflateAmount(p: LambyPose): { squash: number; sink: number } {
  if (p.mood !== 'sad') return { squash: 0, sink: 0 };
  const u = Math.min(1, Math.max(0, (p.t - p.moodStart) / 0.65));
  const eased = 1 - Math.pow(1 - u, 3);
  const tremor = u >= 1 ? Math.sin(p.t * 1.1) * 0.4 : 0;
  return { squash: 0.1 * eased, sink: 6 * eased + tremor };
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(Math.round(x), Math.round(y), Math.round(r), 0, Math.PI * 2);
  ctx.fill();
}

function drawShadow(ctx: CanvasRenderingContext2D, cx: number, y: number): void {
  ui.px(ctx, cx - 48, y, 96, 6, ERA1.greyDark);
  ui.px(ctx, cx - 34, y + 6, 68, 3, ERA1.black);
}

/** the squared "paperclip" loop behind Lamby: Clippy grammar without a sprite */
function drawPaperclip(ctx: CanvasRenderingContext2D, cx: number, cy: number, mood: LambyMood, point: number): void {
  const x = cx - 84;
  const y = cy - 28;
  const wire = mood === 'sterile' ? ERA1.grey : mood === 'sad' ? ERA1.greyDark : ERA1.silver;
  ui.px(ctx, x, y, 38, 3, wire);
  ui.px(ctx, x, y, 3, 64, wire);
  ui.px(ctx, x, y + 61, 46, 3, wire);
  ui.px(ctx, x + 43, y + 22, 3, 42, wire);
  ui.px(ctx, x + 17, y + 22, 29, 3, wire);
  ui.px(ctx, x + 17, y + 22, 3, 32, wire);
  ui.px(ctx, x + 17, y + 51, 19 + Math.floor(point / 2), 3, wire);
}

function drawBody(ctx: CanvasRenderingContext2D, cx: number, cy: number, mood: LambyMood): void {
  const wool = mood === 'sterile' ? ERA1.silver : ERA1.white;
  const shade = mood === 'cheerful' ? ERA1.beige : mood === 'sad' ? ERA1.greyDark : ERA1.grey;
  const fleece = [
    [-36, -20, 16], [-18, -34, 17], [2, -36, 18], [23, -30, 16],
    [38, -13, 17], [32, 10, 18], [12, 22, 19], [-12, 24, 18],
    [-34, 10, 18], [-44, -8, 15], [0, -8, 34]
  ] as const;
  ctx.fillStyle = shade;
  for (const [dx, dy, r] of fleece) circle(ctx, cx + dx + 2, cy + dy + 2, r);
  ctx.fillStyle = wool;
  for (const [dx, dy, r] of fleece) circle(ctx, cx + dx, cy + dy, r);
  ui.px(ctx, cx - 29, cy + 34, 9, 24, ERA1.greyDark);
  ui.px(ctx, cx + 18, cy + 34, 9, 24, ERA1.greyDark);
  ui.px(ctx, cx - 34, cy + 56, 17, 5, ERA1.black);
  ui.px(ctx, cx + 13, cy + 56, 17, 5, ERA1.black);
}

function drawFace(ctx: CanvasRenderingContext2D, cx: number, cy: number, mood: LambyMood, phase: number): void {
  const face = mood === 'sterile' ? ERA1.beige : ERA1.paper;
  const ink = mood === 'sterile' ? ERA1.greyDark : ERA1.black;
  ctx.fillStyle = face;
  circle(ctx, cx, cy - 8, 24);
  ui.px(ctx, cx - 27, cy - 14, 8, 17, face);
  ui.px(ctx, cx + 19, cy - 14, 8, 17, face);
  const blink = phase > 2.72 && phase < 2.88;
  if (blink) {
    ui.px(ctx, cx - 12, cy - 9, 8, 2, ink);
    ui.px(ctx, cx + 5, cy - 9, 8, 2, ink);
  } else if (mood === 'sterile') {
    ui.px(ctx, cx - 12, cy - 12, 8, 7, ink);
    ui.px(ctx, cx + 5, cy - 12, 8, 7, ink);
    ui.px(ctx, cx - 10, cy - 10, 4, 3, ERA1.silver);
    ui.px(ctx, cx + 7, cy - 10, 4, 3, ERA1.silver);
  } else if (mood === 'sad') {
    // downcast, heavy-lidded — not scolding, just looking away. The shame
    // reads through avoidance, not an expression aimed at the player.
    ui.px(ctx, cx - 12, cy - 8, 8, 2, ink);
    ui.px(ctx, cx + 5, cy - 8, 8, 2, ink);
  } else {
    ui.px(ctx, cx - 11, cy - 11, 5, 5, ink);
    ui.px(ctx, cx + 7, cy - 11, 5, 5, ink);
    ui.px(ctx, cx - 10, cy - 10, 2, 2, ERA1.white);
    ui.px(ctx, cx + 8, cy - 10, 2, 2, ERA1.white);
  }
  const mouthY = cy + 8;
  if (mood === 'cheerful') {
    ui.px(ctx, cx - 5, mouthY, 11, 2, ink);
    ui.px(ctx, cx - 3, mouthY + 2, 7, 2, ink);
  } else if (mood === 'clinical') {
    ui.px(ctx, cx - 6, mouthY, 12, 2, ink);
  } else if (mood === 'sad') {
    // flat line, corners hooked down — a plain frown, no melodrama.
    ui.px(ctx, cx - 7, mouthY, 14, 2, ink);
    ui.px(ctx, cx - 8, mouthY + 2, 2, 2, ink);
    ui.px(ctx, cx + 6, mouthY + 2, 2, 2, ink);
  } else {
    ui.px(ctx, cx - 8, mouthY - 1, 16, 2, ink);
    ui.px(ctx, cx - 8, mouthY + 3, 16, 1, ERA1.grey);
  }
}

function drawGesture(ctx: CanvasRenderingContext2D, cx: number, cy: number, mood: LambyMood, action: LambyAction, point: number): void {
  const arm = mood === 'sterile' ? ERA1.grey : ERA1.silver;
  const hoof = mood === 'sterile' ? ERA1.greyDark : ERA1.black;
  if (action === 'point') {
    ui.px(ctx, cx + 38, cy - 9, 38 + point, 5, arm);
    ui.px(ctx, cx + 76 + point, cy - 12, 8, 11, hoof);
    ui.px(ctx, cx + 84 + point, cy - 9, 14, 3, hoof);
    return;
  }
  if (mood === 'sad') {
    // the arm hangs, not rests — the droop reads before the face does.
    ui.px(ctx, cx + 34, cy + 16, 10, 22, arm);
    ui.px(ctx, cx + 32, cy + 36, 10, 9, hoof);
    return;
  }
  ui.px(ctx, cx + 36, cy + 4, 24, 5, arm);
  ui.px(ctx, cx + 58, cy + 2, 8, 10, hoof);
}

/**
 * Draw Lamby centred on (cx, cy) — the same anchor the rig lab uses, so poses
 * transfer 1:1. At scale 1 he occupies roughly cx-59…cx+55, cy-54…cy+70.
 */
export function drawLambyChar(ctx: CanvasRenderingContext2D, cx: number, cy: number, pose: LambyPose): void {
  const s = pose.scale ?? 1;
  const phase = pose.t % CYCLE;
  const point = pose.action === 'point' ? Math.round(8 + Math.sin(pose.t * 7) * 2) : 0;
  const drift = idleDrift(pose);
  const bounce = appearBounce(pose);
  const deflate = deflateAmount(pose);
  const x = cx + drift.dx;
  const y = cy + drift.dy;

  ctx.save();
  // the whole puppet scales about its own centre, then squash-stretch (appear)
  // and deflate (sad) compose through one transform anchored near the hooves,
  // so the character compresses toward the ground and not toward the sky.
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.translate(-cx, -cy);
  const anchorY = y + 60;
  ctx.translate(x, anchorY);
  ctx.scale(bounce.sx, bounce.sy * (1 - deflate.squash));
  ctx.translate(-x, -anchorY + deflate.sink);

  drawShadow(ctx, x, y + 70);
  drawPaperclip(ctx, x, y, pose.mood, point);
  drawBody(ctx, x, y, pose.mood);
  drawFace(ctx, x, y, pose.mood, phase);
  drawGesture(ctx, x, y, pose.mood, pose.action, point);
  ctx.restore();
}
