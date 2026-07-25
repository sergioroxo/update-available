/**
 * LAMBY, THE CHARACTER — THE ONE DEFINITION (Session 45; de-duplicated and
 * restyled in Session 48).
 *
 * S43 built the Clippy-lineage rig (moods `cheerful | clinical | sterile |
 * sad`, the appear-bounce, the idle drift, and the sad DEFLATE that the shame
 * beat depends on) inside the standalone rig lab, `src/lambyrig/lambyRig.ts`
 * + `?lambyrig=1`. S45 could not import it — the lab exported only
 * `startLambyRig(canvas)` and kept its drawing in private methods of a
 * non-exported class — so it PORTED the character here and flagged the
 * duplication. **Session 48 closed it: this module is now the single source,
 * and the lab imports `drawLambyChar` from it.** There is one Lamby. A change
 * to his look is made here and shows up in `?lambyrig=1` and in the game at
 * the same time; that is exactly how S48's restyle was verified.
 *
 * What the production surface needs and the lab did not:
 *   1. a `scale` — the lab draws Lamby at ~115×125 logical px on a bare stage;
 *      a window on the 512×384 desktop wants him smaller and placed;
 *   2. no stage clip and no speech bubble — the alert window carries Lamby's
 *      lines in its own type area, so a cartoon bubble would say it twice
 *      (and a bubble during the sad hold would undercut the hold). The lab
 *      keeps both of those around this call, where they belong.
 *
 * S48 — HE READS AS A SHEEP (Sérgio: "I love the new Lamby and the cadence,
 * but it should look more like a Sheep/Lamb"). SILHOUETTE AND TEXTURE ONLY:
 * drooping ears, a muzzle, a lamb's topknot, wool curls and a tail puff. The
 * MOTION VOCABULARY AND THE MOODS ARE UNTOUCHED — the appear pop, the idle
 * fidget, the sad deflate-and-hold and every per-mood face rule are exactly
 * what S43 authored, because the cadence is the part that already worked. The
 * Clippy paperclip stays too: it is the lineage quotation, not the animal.
 * Era-1 palette tokens only (no invented colors), integer positions, no
 * ctx.rotate — the ears droop by STEPPING, the way a 1997 sprite would.
 *
 * REGISTER: Lamby is `operable` and only ever `operable`. He is never drawn
 * inside a `felt` window (the Caleb chat, his return lines, the residue) —
 * see src/desktop/apps/caleb.ts, which imports nothing from this file.
 */
import { ERA1 } from '../theme/era1';
import * as ui from '../theme/chrome';

export type LambyMood = 'cheerful' | 'clinical' | 'sterile' | 'sad';
export type LambyAction = 'idle' | 'point' | 'appear' | 'disappear';

export interface LambyPose {
  mood: LambyMood;
  action: LambyAction;
  /** seconds since this Lamby appeared — drives blink, drift and the appear pop */
  t: number;
  /** the `t` at which the current mood was set — drives the sad deflate */
  moodStart: number;
  /** 1 = the rig lab's size (~118 wide × 125 tall logical px) */
  scale?: number;
  /** the rig lab LOOPS the appear pop so it can be watched over and over;
   *  production plays it once and settles. Lab-only. */
  loopAppear?: boolean;
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
  const local = p.loopAppear ? (p.t % CYCLE) / CYCLE : Math.min(p.t, CYCLE) / CYCLE;
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

/** the wool tone and its shadow, per mood — S43's exact choices, kept */
function woolTones(mood: LambyMood): { wool: string; shade: string } {
  return {
    wool: mood === 'sterile' ? ERA1.silver : ERA1.white,
    shade: mood === 'cheerful' ? ERA1.beige : mood === 'sad' ? ERA1.greyDark : ERA1.grey
  };
}

/** the face patch and its ears are DARKER than the fleece, the way a lamb's
 *  are — that contrast is most of what makes him read as an animal at 100px */
function faceTones(mood: LambyMood): { face: string; muzzle: string; ink: string; edge: string } {
  return {
    face: mood === 'sterile' ? ERA1.silver : ERA1.beige,
    muzzle: mood === 'sterile' ? ERA1.beige : ERA1.paper,
    ink: mood === 'sterile' ? ERA1.greyDark : ERA1.black,
    edge: mood === 'sterile' ? ERA1.grey : ERA1.greyDark
  };
}

function drawBody(ctx: CanvasRenderingContext2D, cx: number, cy: number, mood: LambyMood): void {
  const { wool, shade } = woolTones(mood);
  const fleece = [
    [-36, -20, 16], [-18, -34, 17], [2, -36, 18], [23, -30, 16],
    [38, -13, 17], [32, 10, 18], [12, 22, 19], [-12, 24, 18],
    [-34, 10, 18], [-44, -8, 15], [0, -8, 34]
  ] as const;
  ctx.fillStyle = shade;
  for (const [dx, dy, r] of fleece) circle(ctx, cx + dx + 2, cy + dy + 2, r);
  ctx.fillStyle = wool;
  for (const [dx, dy, r] of fleece) circle(ctx, cx + dx, cy + dy, r);
  // S48: a second, smaller ring of bumps around the crown — the fleece's own
  // scallop, doubled, so the silhouette reads CURLY rather than cloudy. Fixed
  // positions, never random: the wool must not shimmer between frames.
  const curls = [
    [-30, -30, 8], [-11, -42, 9], [11, -42, 9], [30, -26, 8], [42, -4, 8]
  ] as const;
  ctx.fillStyle = shade;
  for (const [dx, dy, r] of curls) circle(ctx, cx + dx + 1, cy + dy + 2, r);
  ctx.fillStyle = wool;
  for (const [dx, dy, r] of curls) circle(ctx, cx + dx, cy + dy, r);
  ui.px(ctx, cx - 29, cy + 34, 9, 24, ERA1.greyDark);
  ui.px(ctx, cx + 18, cy + 34, 9, 24, ERA1.greyDark);
  ui.px(ctx, cx - 34, cy + 56, 17, 5, ERA1.black);
  ui.px(ctx, cx + 13, cy + 56, 17, 5, ERA1.black);
}

/**
 * S48 — THE EARS. Drawn between the body and the face so their roots go
 * behind the face patch and read as attached. They droop by STEPPING down and
 * out (no ctx.rotate, 1997 rules); each is outlined by laying the same blocks
 * down one pixel bigger in the edge tone first.
 */
function drawEars(ctx: CanvasRenderingContext2D, cx: number, cy: number, mood: LambyMood): void {
  const { face, edge } = faceTones(mood);
  // rooted high, beside the brow, and HANGING — four steps out and down, each
  // a little narrower, so the pair reads as weight rather than as brackets
  const left = [
    [-22, -14, 10, 7], [-27, -8, 10, 7], [-31, -1, 9, 7], [-33, 6, 8, 6]
  ] as const;
  const blocks: [number, number, number, number][] = [];
  for (const [dx, dy, w, h] of left) {
    blocks.push([dx, dy, w, h]);
    blocks.push([-dx - w, dy, w, h]); // mirrored, so the pair is exact
  }
  for (const [dx, dy, w, h] of blocks) ui.px(ctx, cx + dx - 1, cy + dy - 1, w + 2, h + 2, edge);
  for (const [dx, dy, w, h] of blocks) ui.px(ctx, cx + dx, cy + dy, w, h, face);
}

function drawFace(ctx: CanvasRenderingContext2D, cx: number, cy: number, mood: LambyMood, phase: number): void {
  const { face, muzzle, ink, edge } = faceTones(mood);
  const { wool, shade } = woolTones(mood);
  // a head, not a helmet: smaller than S45's patch and rimmed, so it separates
  // from the fleece instead of being a hole in it
  ctx.fillStyle = edge;
  circle(ctx, cx, cy - 4, 21);
  ctx.fillStyle = face;
  circle(ctx, cx, cy - 4, 20);
  // S48 — THE TOPKNOT: a curl of fleece over the brow, where a lamb's is.
  ctx.fillStyle = shade;
  circle(ctx, cx - 6, cy - 21, 9);
  circle(ctx, cx + 7, cy - 23, 8);
  ctx.fillStyle = wool;
  circle(ctx, cx - 7, cy - 22, 9);
  circle(ctx, cx + 6, cy - 24, 8);
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
  // S48 — THE MUZZLE. A pale rounded snout below the eyes, carrying the nose
  // and the mouth: with the ears, it is what turns a face into an animal's.
  // Every mood's mouth is S43's exact shape, only carried 3px lower onto it.
  ctx.fillStyle = edge;
  circle(ctx, cx, cy + 8, 11);
  ui.px(ctx, cx - 11, cy + 3, 22, 11, edge);
  ctx.fillStyle = muzzle;
  circle(ctx, cx, cy + 8, 10);
  ui.px(ctx, cx - 10, cy + 4, 20, 9, muzzle);
  ui.px(ctx, cx - 3, cy + 3, 7, 3, ink);   // the nose
  ui.px(ctx, cx - 2, cy + 6, 5, 2, ink);
  const mouthY = cy + 11;
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
 * transfer 1:1. At scale 1 he occupies roughly cx-59…cx+55, cy-56…cy+70.
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
  drawEars(ctx, x, y, pose.mood);   // roots go behind the face patch
  drawFace(ctx, x, y, pose.mood, phase);
  drawGesture(ctx, x, y, pose.mood, pose.action, point);
  ctx.restore();
}
