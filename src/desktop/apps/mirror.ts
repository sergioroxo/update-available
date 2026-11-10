/**
 * ⚑ S321 — "TRY IT ON": THE MIRROR (DESIGN_2026_V3_PRESSURE_2026-11-07.md beat 14; his second ruling: "not softer,
 * harsher. The system starts it. We see the mirror and the reveal of a male body, and then Junie's link breaks in.
 * Junie ends it; the player does not.").
 *
 * What the worn session shows from the moment the device goes on: nobody asks. "See how it feels. No pressure. Just
 * try it." A mirror fills the view; in it, her reflection is rewritten a region at a time — the hair, the jaw, the
 * shoulders, the smile — into the man of the shared goal picture (goalPicture.ts's figure, cell for cell), while the
 * system says how natural it looks. Then her hands come up in front of her, and they change too. It is head-locked
 * (the glass is on her face; turning does not stop it) and there is nothing on it to press. It ends only when
 * Junie's link breaks in (`E4Shell`), and the Esc menu always works.
 *
 * ⚑ The piece's invention, `speculative` in the Dossier (RESEARCH_2026_V3_THREADS thread 2: no documented use of VR,
 * AR or "see yourself as" tools in conversion practice; the body-swap mechanism is real; a trans writer warns such
 * "gender swap" demos harm as much as help). So it is short, stylised and interrupted: pixel figures on a 24-cell grid,
 * no real face, no photograph, no skin detail beyond the grid. Harsh light, hard steps, a flash at each change.
 *
 * Signature (the room builder may reuse it, e.g. for 3D hands' timing): `drawTryOn(ctx, W, H, t)`, `t` = seconds
 * since the device went on; `TRYON` holds the timeline (`done` = the reveal complete → `markE4('tryon')`, `link` =
 * when Junie's link breaks in). Words: `data/dialog/s4_v3.json` `tryon`.
 */
import V3 from '../../../data/dialog/s4_v3.json';
import { GOAL, PLACE, ERA4, CLIP } from '../theme/era4';
import { px } from '../theme/chrome';
import { fontFor, monoFor } from '../theme/fonts';
import { GOAL_REGIONS } from './goalPicture';

const T = V3.tryon;
/** the timeline, in seconds since the device went on */
export const TRYON = { hair: [5, 10], jaw: [10, 15], shoulders: [15, 20], smile: [20, 23], hands: [23, 30], done: 31, link: 34 } as const;

type Run = [number, number, number, string];
const HAIR = ERA4.photoHair, SKIN = ERA4.photoSkinHi, SKIN_LO = ERA4.photoSkin, TOP = PLACE.textileHi, INK = GOAL.ink;
/** her reflection before it is rewritten: long hair to the shoulders, a softer jaw, a neutral mouth, a pink top */
const MAYA = {
  hair: [[2, 9, 14, HAIR], [3, 7, 16, HAIR], [4, 6, 17, HAIR], [5, 6, 8, HAIR], [5, 15, 17, HAIR],
    ...[6, 7, 8, 9, 10, 11, 12, 13, 14, 15].flatMap((r) => [[r, 6, 7, HAIR], [r, 16, 17, HAIR]]),
    [16, 5, 7, HAIR], [16, 16, 18, HAIR], [17, 5, 6, HAIR], [17, 17, 18, HAIR]] as Run[],
  face: [[5, 9, 14, SKIN], [6, 8, 15, SKIN], [7, 8, 15, SKIN], [8, 8, 15, SKIN], [9, 8, 15, SKIN], [10, 8, 15, SKIN],
    [11, 9, 14, SKIN], [12, 10, 13, SKIN], [13, 11, 12, SKIN_LO], [14, 11, 12, SKIN_LO], [15, 11, 12, SKIN_LO]] as Run[],
  features: [[6, 9, 10, HAIR], [6, 13, 14, HAIR], [8, 10, 10, INK], [8, 13, 13, INK]] as Run[],
  mouth: [[11, 11, 12, INK]] as Run[],
  body: [[16, 8, 15, TOP], [17, 7, 16, TOP], [18, 6, 17, TOP], [19, 5, 18, TOP], [20, 5, 18, TOP], [21, 5, 18, TOP],
    [22, 5, 18, TOP], [23, 5, 18, TOP]] as Run[]
};

/** 0..1 through a [from, to] window */
const k = (t: number, w: readonly [number, number]): number => Math.max(0, Math.min(1, (t - w[0]) / (w[1] - w[0])));

function runs(ctx: CanvasRenderingContext2D, rs: Run[], ox: number, oy: number, c: number, cut = 99): void {
  for (const [r, a, b, col] of rs) if (r <= cut) px(ctx, ox + a * c, oy + r * c, (b - a + 1) * c, c, col);
}

/** a hand held up in front of her, 12 × 16 cells: hers (slim) or the one it is made into (broad, haired) */
function hand(ctx: CanvasRenderingContext2D, x: number, y: number, c: number, broad: boolean, mirrorX: boolean): void {
  const cell = (cx: number, cy: number, w: number, h: number, col: string): void =>
    px(ctx, mirrorX ? x + (12 - cx - w) * c : x + cx * c, y + cy * c, w * c, h * c, col);
  if (!broad) {
    // hers: four slim fingers with air between them, a narrow palm, the thumb out to the side
    for (const [f, top] of [[1, 2], [3, 0], [5, 1], [7, 3]]) cell(f, top, 1, 8 - top, SKIN);
    cell(1, 7, 8, 7, SKIN); cell(9, 8, 2, 3, SKIN);
    cell(2, 14, 6, 2, SKIN_LO);
  } else {
    // the one it is made into: thick fingers, a broad palm, knuckles, hair on the back of it
    for (const [f, top] of [[0, 2], [3, 0], [6, 1], [9, 3]]) cell(f, top, 2, 8 - top, SKIN_LO);
    cell(0, 7, 11, 8, SKIN_LO); cell(10, 8, 2, 4, SKIN_LO);
    for (const f of [0, 3, 6, 9]) cell(f, 7, 2, 1, HAIR);
    for (const [hx, hy] of [[1, 10], [4, 9], [7, 11], [2, 12], [5, 12], [8, 13], [3, 14]]) cell(hx, hy, 1, 1, HAIR);
    cell(1, 15, 9, 1, SKIN_LO);
  }
}

/** ⚑ S354 — `speaker`: the lines gain a speaker (UiB job 11 Part A: the try-on is Shepherd Live™'s — "Let me show
 *  you who you could be." — so its mark sits on a tab above the caption band; the lines and the timing are as they were) */
export function drawTryOn(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, speaker = ''): void {
  ctx.textBaseline = 'top';
  // the session's room: cold, hard-lit, nowhere
  px(ctx, 0, 0, W, H, CLIP.field);
  for (let y = 0; y < H; y += 4) px(ctx, 0, y, W, 1, CLIP.band);            // scanlines: the picture says it is a picture
  // the mirror: it grows in over the first seconds, then fills the view
  const grow = Math.min(1, t / 3);
  const mw = Math.round(120 + 100 * grow), mh = Math.round(180 + 120 * grow);
  const mx = Math.round((W - mw) / 2), my = Math.round(14 + (1 - grow) * 40);
  px(ctx, mx - 6, my - 6, mw + 12, mh + 12, ERA4.ruleHi);
  px(ctx, mx, my, mw, mh, PLACE.sky);
  px(ctx, mx, my, mw, Math.round(mh * 0.4), PLACE.skyLo);
  // her reflection, rewritten region by region into the goal's figure
  const c = Math.max(2, Math.floor(Math.min(mw, mh) / 24));
  const ox = mx + Math.round((mw - 24 * c) / 2), oy = my + mh - 24 * c;
  const kh = k(t, TRYON.hair), kj = k(t, TRYON.jaw), ks = k(t, TRYON.shoulders), km = k(t, TRYON.smile);
  // the body first (it sits under everything)
  if (ks < 0.5) runs(ctx, MAYA.body, ox, oy, c); else runs(ctx, GOAL_REGIONS.body, ox, oy, c);
  if (kj < 0.5) runs(ctx, MAYA.face, ox, oy, c); else runs(ctx, GOAL_REGIONS.face, ox, oy, c);
  runs(ctx, kj < 0.5 ? MAYA.features : GOAL_REGIONS.features, ox, oy, c);
  runs(ctx, km < 0.5 ? MAYA.mouth : GOAL_REGIONS.mouth, ox, oy, c);
  // the hair: cut from the ends upward, then the goal's
  if (kh < 1) runs(ctx, MAYA.hair, ox, oy, c, Math.round(17 - kh * 13));
  if (kh >= 0.6) runs(ctx, GOAL_REGIONS.hair, ox, oy, c);
  // a hard white flash at each change (harsh, never soft)
  for (const w of [TRYON.hair, TRYON.jaw, TRYON.shoulders, TRYON.smile]) {
    const mid = (w[0] + w[1]) / 2;
    if (Math.abs(t - mid) < 0.25) { const y = my + Math.round(((t - mid + 0.25) / 0.5) * mh); px(ctx, mx, y, mw, 3 * c, GOAL.sparkleHi); }
  }
  // her hands come up in front of her, and they change too
  const kH = k(t, TRYON.hands);
  const bandY = H - 46;
  if (kH > 0) {
    // they rise from below the glass to just above the caption band, either side of the mirror
    const hc = 8, rise = Math.min(1, kH * 3);
    const hy = Math.round(H - rise * (H - bandY + 16 * hc));
    hand(ctx, Math.round(W * 0.03), hy, hc, kH >= 0.55, false);
    hand(ctx, Math.round(W * 0.97) - 12 * hc, hy, hc, kH >= 0.55, true);
  }
  // the system's stamp, and how far it has "fitted" her
  ctx.font = monoFor(10);
  const stamp = T.stamp, sw = Math.ceil(ctx.measureText(stamp).width) + 10;
  px(ctx, 8, 8, sw, 16, CLIP.stamp);
  ctx.fillStyle = CLIP.stampInk; ctx.fillText(stamp, 13, 11);
  const fit = Math.min(99, Math.round(Math.min(1, t / TRYON.done) * 99));
  const ft = T.fitting.replace('{n}', String(fit));
  const fw = Math.ceil(ctx.measureText(ft).width);
  ctx.fillStyle = CLIP.ink; ctx.fillText(ft, W - fw - 10, 11);
  px(ctx, W - 110, 26, 100, 4, CLIP.band);
  px(ctx, W - 110, 26, fit, 4, CLIP.caught);
  // the voice: one line at a time, in the caption band
  let line = T.lines[0].text;
  for (const l of T.lines) if (t >= l.at) line = l.text;
  px(ctx, 0, bandY, W, 34, CLIP.band);
  if (speaker) {
    ctx.font = monoFor(9);
    const tw = Math.ceil(ctx.measureText(speaker).width) + 12;
    px(ctx, 8, bandY - 13, tw, 13, CLIP.band);
    ctx.fillStyle = ERA4.glow; ctx.fillText(speaker, 14, bandY - 11);
  }
  ctx.font = fontFor(16, 'e4');
  const lw = Math.ceil(ctx.measureText(line).width);
  ctx.fillStyle = CLIP.ink;
  ctx.fillText(line, Math.max(8, Math.round((W - lw) / 2)), bandY + 9);
}
