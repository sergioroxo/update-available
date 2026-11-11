/**
 * ⚑ S321 — "TRY IT ON": THE MIRROR (DESIGN_2026_V3_PRESSURE_2026-11-07.md beat 14; his second ruling: "not softer,
 * harsher. The system starts it. We see the mirror and the reveal of a male body, and then Junie's link breaks in.
 * Junie ends it; the player does not.").
 *
 * What the worn session shows from the moment the device goes on: nobody asks. "See how it feels. No pressure. Just
 * try it." A mirror fills the view; in it is HER PHOTOGRAPH, and the system's swap filter runs on it while it says how
 * natural it looks. Then her hands come up in front of her, and they change too. It is head-locked (the glass is on her
 * face; turning does not stop it) and there is nothing on it to press. It ends only when Junie's link breaks in
 * (`E4Shell`), and the Esc menu always works.
 *
 * ⚑ S364 (UiB job 14 Part B, N12 — his: "in the try-on, her photo morphs back into 'what she should be'"). The mirror
 * no longer rewrites a stick figure into a stock man: it shows `drawSwapMorph` (swapFilter.ts) — her own photo
 * (`mayaPhoto`, "me, after.jpg") morphing into the goal picture, in the filter's own order and on this timeline: her
 * hair cut from the ends upward (5–10 s), the jaw (10–15), the jacket wiping down over her pink top (15–20), the grin
 * (20–23), her room draining to the system's sky under all of it, and the gloss — halo, rays, sparkles, the verified
 * tick, "You, restored · 2027" — landing last (23–29). The filter's own chrome sits on the glass of the mirror
 * ("✦ Restore", its intensity climbing; "Made with AI"). In the raid the people drag that intensity back
 * (`ball.ts`); `tryOnAmount` and `mirrorRect` are exported so the raid starts from exactly this picture.
 *
 * ⚑ The piece's invention, `speculative` in the Dossier (RESEARCH_2026_V3_THREADS thread 2: no documented use of VR,
 * AR or "see yourself as" tools in conversion practice; the body-swap mechanism is real; a trans writer warns such
 * "gender swap" demos harm as much as help; RESEARCH_ROGD_AND_FILTERS §C: the 2019 gender-swap lenses were used by some
 * to mock trans people — the filter that "restores" is ours, card "The filter" at the Close). So it is short, stylised
 * and interrupted: a pixel photograph on a cell grid, a drawn face, no likeness. Harsh light, hard steps, a flash at
 * each change.
 *
 * Signature (the room builder may reuse it, e.g. for 3D hands' timing): `drawTryOn(ctx, W, H, t)`, `t` = seconds
 * since the device went on; `TRYON` holds the timeline (`done` = the reveal complete → `markE4('tryon')`, `link` =
 * when Junie's link breaks in). Words: `data/dialog/s4_v3.json` `tryon`.
 */
import V3 from '../../../data/dialog/s4_v3.json';
import { GOAL, ERA4, CLIP } from '../theme/era4';
import { px } from '../theme/chrome';
import { fontFor, monoFor } from '../theme/fonts';
import { drawSwapMorph } from './swapFilter';

const T = V3.tryon;
/** the timeline, in seconds since the device went on */
export const TRYON = { hair: [5, 10], jaw: [10, 15], shoulders: [15, 20], smile: [20, 23], hands: [23, 30], done: 31, link: 34 } as const;

const HAIR = ERA4.photoHair, SKIN = ERA4.photoSkinHi, SKIN_LO = ERA4.photoSkin;

/** 0..1 through a [from, to] window */
const k = (t: number, w: readonly [number, number]): number => Math.max(0, Math.min(1, (t - w[0]) / (w[1] - w[0])));

/** ⚑ S364 — how far the filter has got at `t`: its stages (theme/era4.ts `portraitAt`) on the lines' timeline — the
 *  hair by 10 s, the jaw by 15, the body by 20, the smile by 23, the gloss by 29 ("You, restored. It already fits.") */
const KEYS: [number, number][] = [[TRYON.hair[0], 0], [TRYON.hair[1], 0.2], [TRYON.jaw[1], 0.4], [TRYON.shoulders[1], 0.6], [TRYON.smile[1], 0.72], [29, 1]];
export function tryOnAmount(t: number): number {
  if (t <= KEYS[0][0]) return 0;
  for (let i = 1; i < KEYS.length; i++) {
    const [t1, a1] = KEYS[i], [t0, a0] = KEYS[i - 1];
    if (t <= t1) return a0 + ((a1 - a0) * (t - t0)) / (t1 - t0);
  }
  return 1;
}

/** ⚑ S364 — the mirror's glass on the visor at `t`: it grows in over the first three seconds, then fills the view */
export function mirrorRect(W: number, _H: number, t: number): { x: number; y: number; w: number; h: number } {
  const grow = Math.min(1, Math.max(0, t) / 3);
  const w = Math.round(120 + 100 * grow), h = Math.round(180 + 120 * grow);
  return { x: Math.round((W - w) / 2), y: Math.round(14 + (1 - grow) * 40), w, h };
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
  const { x: mx, y: my, w: mw, h: mh } = mirrorRect(W, H, t);
  px(ctx, mx - 6, my - 6, mw + 12, mh + 12, ERA4.ruleHi);
  // ⚑ S364 — in it, her photograph, and the filter working on it
  drawSwapMorph(ctx, mx, my, mw, mh, tryOnAmount(t), t, { chrome: true });
  // a hard white flash at each change (harsh, never soft): the filter's scan crossing the glass
  for (const w of [TRYON.hair, TRYON.jaw, TRYON.shoulders, TRYON.smile]) {
    const mid = (w[0] + w[1]) / 2;
    if (Math.abs(t - mid) < 0.25) {
      const band = Math.max(6, Math.round(mh / 40));
      const y = my + Math.round(((t - mid + 0.25) / 0.5) * (mh - band));
      px(ctx, mx, y, mw, band, GOAL.sparkleHi);
    }
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
