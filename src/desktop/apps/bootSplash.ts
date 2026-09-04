/**
 * THE BOOT SPLASHES — two eras, the same idea, aged.
 *
 * ⚑ WHY THIS EXISTS (Sérgio, 2026-09-04, having listened to all three 6.5 s
 * cuts of the E2 jingle): *"None of them, the 6 second doesnt fit. Would it
 * make sense for the full 30 sec jingle? we can do some like animation like to
 * old disney game cd-rom?"* — and, on the shape of it: *"not skipable but we
 * can have the system appearing as the song still plays… I dont find Restorify
 * usages so you can design the aesthetics of it. Yeah i like the spinner idea
 * for E3, it should already have a boot up sequence so yeah."*
 *
 * He is right, and the 6 s sting was reasoning from the WINDOW — the boot crawl
 * is 6.6 s, so cut the jingle to 6.5. That gets the arithmetic right and the
 * object wrong. **A startup sting is what an operating system has. A thirty
 * second animated splash is what a CD-ROM has**, and 2003's Restorify is not an
 * operating system: it is consumer software that arrived on a disc and wants
 * you to know it cost somebody money.
 *
 * The era's own law permits exactly this — `operable` surfaces "may glitter,
 * charm, play" (CLAUDE.md) — and E2 is the apparatus at its most pleased with
 * itself: the update has just installed, the machine has come back at a new
 * version. **A splash you cannot skip, playing its own theme at you for half a
 * minute before it will let you do anything, IS the satire**, and it collapses
 * later without anyone commenting: by E4 the same lineage opens with no splash
 * at all, because by then it is already inside the room and does not have to
 * sell itself.
 *
 * ⚑ IT IS DIEGETIC, so "the frame never plays" (CLAUDE.md) is untouched. This
 * is the software's splash, in the software's voice, on the software's surface.
 * The frame stays silent and undecorated throughout, and Esc/pause — a FRAME
 * affordance, not a diegetic one — keeps working the whole way, which is how
 * "not skippable" stays compatible with the piece's accessibility floor.
 *
 * ⚑ NOTHING REAL IS QUOTED. The reference is a REGISTER, not an asset: no
 * Disney, no Microsoft, no Broderbund, no Humongous. The mark below is
 * Restorify's own and it is drawn here in code, from the ERA1 sixteen-colour
 * palette, in integer pixels — there is no image file to license or mistake for
 * somebody's property.
 */
import { ERA1, ERA1_CANVAS } from '../theme/era1';
import { px, setFont } from '../theme/chrome';
import { ERA3 } from '../theme/era3';

const W = ERA1_CANVAS.width;   // 512
const H = ERA1_CANVAS.height;  // 384

/**
 * ⚑ THE TIMELINE IS HUNG ON THE TRACK'S OWN PHRASE ONSETS, MEASURED.
 *
 * `chase_the_clouds.mp3` is Sérgio's own jingle: 30.77 s, ~64.6 BPM, with
 * phrase onsets at 0.12 · 3.34 · 5.20 · 9.64 · 20.71 · 23.66 s (measured off
 * the waveform, not guessed; a four-bar phrase is ≈ 3.72 s). Every beat below
 * lands on one of those, which is the entire reason the full track is better
 * than a cut of it: a cut has no phrases left to land on.
 */
export const E2_SPLASH = {
  /** the roofline starts drawing itself with the opening phrase */
  strokeIn: 0.12,
  /** the walls arrive and the house closes */
  house: 1.60,
  /** ⚑ the window LIGHTS — the money beat, on the second phrase */
  light: 3.34,
  /** RESTORIFY assembles, letter by letter */
  wordmark: 5.20,
  /** the shine sweep crosses it (the one gratuitous flourish, and it is period) */
  shine: 6.60,
  /** the tagline types under the mark */
  tagline: 7.50,
  /** the loading bar appears and begins to fill — a 2003 splash LOADS at you */
  bar: 9.64,
  /** the bar completes and the publisher's card sits under it */
  publisher: 20.71,
  /**
   * ⚑ THE HANDOFF — "the system appearing as the song still plays" (Sérgio).
   * The splash dissolves on the last phrase and the OS crawl begins typing
   * underneath it while the final 7 s of the track runs. The arithmetic is not
   * a coincidence: the crawl is 219 characters at 0.030 s/char = 6.57 s, so its
   * last line — `RESTORIFY IS NOW PART OF THIS COMPUTER.` — completes at 30.23 s
   * and the track ends at 30.77. **The jingle finishes on that sentence.**
   */
  handoff: 23.66,
  /** the dissolve's length; the crawl is already typing under it */
  fade: 1.20
} as const;

const CX = Math.round(W / 2);

/** the house's own geometry, in one place so the animation and the mark agree */
const HOUSE = {
  apexY: 88,
  eaveY: 120,
  halfSpan: 62,   // roof half-width at the eaves
  wallX: 208, wallY: 120, wallW: 96, wallH: 58,
  winX: 238, winY: 134, winW: 36, winH: 28,
  doorX: 282, doorY: 148, doorW: 16, doorH: 30
};

/** eased 0→1 over [a,b], clamped */
function ramp(t: number, a: number, b: number): number {
  if (t <= a) return 0;
  if (t >= b) return 1;
  const k = (t - a) / (b - a);
  return k * k * (3 - 2 * k);
}

/**
 * ⚑ HOW OFTEN THIS SURFACE HAS TO BE RE-UPLOADED (the S105 discipline).
 * The canvas is a GPU texture and CLAUDE.md's budget is "render-texture uploads
 * on dirty only". So the splash publishes a VERSION that only steps when
 * something on it has actually moved: fast while strokes are drawing, slow
 * through the eleven-second bar fill, fast again for the dissolve. At rest in
 * the middle of the animation that is ~5 uploads a second instead of ~60.
 */
export function e2SplashVersion(t: number): number {
  const rate = t < E2_SPLASH.bar ? 15 : (t < E2_SPLASH.publisher ? 5 : 15);
  return Math.floor(t * rate);
}

/** the whole splash, at time `t` seconds, at `alpha` (the dissolve) */
export function drawE2Splash(ctx: CanvasRenderingContext2D, t: number, alpha = 1): void {
  if (alpha <= 0) return;
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * alpha;

  // the card: a deep blue installer ground, and the era's own bevel around it
  px(ctx, 0, 0, W, H, ERA1.navy);
  px(ctx, 0, 0, W, 1, ERA1.titleBlue);
  px(ctx, 0, 0, 1, H, ERA1.titleBlue);
  px(ctx, 0, H - 1, W, 1, ERA1.black);
  px(ctx, W - 1, 0, 1, H, ERA1.black);

  drawHouse(ctx, t);
  drawWordmark(ctx, t);
  drawBar(ctx, t);

  if (t >= E2_SPLASH.publisher) {
    setFont(ctx, 9);
    ctx.fillStyle = ERA1.grey;
    const line = 'a HopeRestored company';
    ctx.fillText(line, CX - Math.round(ctx.measureText(line).width / 2), 336);
  }

  ctx.globalAlpha = prev;
}

/**
 * THE MARK. A house with one lit window — and it is chosen, not decorative.
 *
 * Restorify's promise is to give somebody back to their family, and a house
 * with a light on is the most reassuring possible picture of that. It is also
 * the piece's own light doctrine compressed into a logo: on a sixteen-colour
 * palette that is otherwise blue and grey, `tooltip` — the pale yellow — is the ONLY warm
 * value available, so the lit window really is the single warm thing on the
 * screen. Thirty years later the player is sitting in a room where one lamp has
 * been left on the whole time and nobody ever turned it off. **The mark
 * collapses on its own, later, without a word of comment** — which is the only
 * way this piece is allowed to satirise anything.
 */
function drawHouse(ctx: CanvasRenderingContext2D, t: number): void {
  const lit = t >= E2_SPLASH.light;
  const body = lit ? ERA1.titleBlue : ERA1.tealDark;

  // the roofline draws itself, left stroke then right, over the opening phrase
  const k = ramp(t, E2_SPLASH.strokeIn, E2_SPLASH.house);
  const rows = HOUSE.eaveY - HOUSE.apexY;
  const shown = Math.round(rows * k);
  for (let i = 0; i < shown; i++) {
    const half = Math.round((HOUSE.halfSpan * (i + 1)) / rows);
    px(ctx, CX - half, HOUSE.apexY + i, half * 2, 1, body);
  }

  // the walls arrive under it and the house closes
  const wk = ramp(t, E2_SPLASH.house, E2_SPLASH.house + 1.4);
  if (wk > 0) {
    const h = Math.round(HOUSE.wallH * wk);
    px(ctx, HOUSE.wallX, HOUSE.wallY, HOUSE.wallW, h, body);
  }

  if (!lit) return;

  // ⚑ the window, and the one warm value in the palette
  const breath = Math.floor(t * 0.8) % 2 === 0;
  px(ctx, HOUSE.winX, HOUSE.winY, HOUSE.winW, HOUSE.winH, breath ? ERA1.tooltip : ERA1.paper);
  px(ctx, HOUSE.winX + Math.round(HOUSE.winW / 2) - 1, HOUSE.winY, 2, HOUSE.winH, ERA1.navy);
  px(ctx, HOUSE.winX, HOUSE.winY + Math.round(HOUSE.winH / 2) - 1, HOUSE.winW, 2, ERA1.navy);
  // the door — small, closed, and on the far side of the window from you
  px(ctx, HOUSE.doorX, HOUSE.doorY, HOUSE.doorW, HOUSE.doorH, ERA1.navy);
  // the ground the house stands on — a flat shadow, not a colour. It was
  // `tealDark` for one pass and read as a green line under the building, which
  // is what a sixteen-colour palette does to you if you reach for "dark".
  px(ctx, HOUSE.wallX - 10, HOUSE.wallY + HOUSE.wallH, HOUSE.wallW + 20, 2, ERA1.black);
}

/** the wordmark assembles letter by letter, then a shine crosses it */
function drawWordmark(ctx: CanvasRenderingContext2D, t: number): void {
  if (t < E2_SPLASH.wordmark) return;
  const NAME = 'RESTORIFY';
  setFont(ctx, 26);
  const full = ctx.measureText(NAME).width;
  const x0 = CX - Math.round(full / 2);
  const y = 208;
  const chars = Math.min(NAME.length, Math.floor((t - E2_SPLASH.wordmark) / 0.14) + 1);
  ctx.fillStyle = ERA1.white;
  ctx.fillText(NAME.slice(0, chars), x0, y);

  // the shine: a pale band crossing the finished wordmark, once
  if (t >= E2_SPLASH.shine && t < E2_SPLASH.shine + 0.9) {
    const k = (t - E2_SPLASH.shine) / 0.9;
    const bx = Math.round(x0 - 24 + k * (full + 48));
    const prev = ctx.globalAlpha;
    ctx.globalAlpha = prev * 0.35;
    px(ctx, bx, y - 4, 10, 34, ERA1.white);
    px(ctx, bx + 10, y - 4, 4, 34, ERA1.silver);
    ctx.globalAlpha = prev;
  }

  if (t < E2_SPLASH.tagline) return;
  /**
   * ⚑ THE TAGLINE, and it is the collapse built in at the point of sale.
   * "one day at a time" is the claim; the very next surface the player sees is
   * Restorify's own Purity Streak reading `412 days` with `includes supervised
   * period` under it in small grey. The marketing and the mechanism disagree on
   * the same screen, six seconds apart, and nobody points at it.
   */
  const TAG = 'Restoration, one day at a time.';
  setFont(ctx, 11);
  const chars2 = Math.min(TAG.length, Math.floor((t - E2_SPLASH.tagline) / 0.045));
  ctx.fillStyle = ERA1.silver;
  ctx.fillText(TAG.slice(0, chars2), CX - Math.round(ctx.measureText(TAG).width / 2), 246);
}

/** the loading bar — eleven seconds of a machine insisting it is busy */
function drawBar(ctx: CanvasRenderingContext2D, t: number): void {
  if (t < E2_SPLASH.bar) return;
  const bx = 156; const by = 292; const bw = 200; const bh = 10;
  px(ctx, bx - 1, by - 1, bw + 2, bh + 2, ERA1.greyDark);
  px(ctx, bx, by, bw, bh, ERA1.black);
  const k = Math.min(1, (t - E2_SPLASH.bar) / (E2_SPLASH.publisher - E2_SPLASH.bar));
  // stepped, not smooth: 2003 progress bars moved in blocks
  const blocks = Math.floor(k * 20);
  for (let i = 0; i < blocks; i++) px(ctx, bx + 2 + i * 10, by + 2, 8, bh - 4, ERA1.titleBlue);
  setFont(ctx, 9);
  ctx.fillStyle = ERA1.grey;
  const label = k >= 1 ? 'Ready.' : 'Preparing your program…';
  ctx.fillText(label, CX - Math.round(ctx.measureText(label).width / 2), by + 16);
}

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * ⚑ E3 — THE SAME IDEA, AGED, AND IT COSTS A FRACTION (Sérgio: *"Yeah i like
 * the spinner idea for E3, it should already have a boot up sequence so yeah."*)
 *
 * A 2016 product would NOT have a CD-ROM splash. It has a wordmark held for two
 * seconds and a spinner, and it does not play you a theme — it does not need
 * to, because you did not buy it and you cannot uninstall it: it came with the
 * workstation. **The contrast IS the era argument**: 2003 spends thirty seconds
 * introducing itself and 2016 spends two, because by 2016 the apparatus has
 * stopped being a place you go to and moved into the infrastructure already in
 * use (REINTERP_INFRASTRUCTURE_SPINE_2026-07-25).
 *
 * It also closes real dead air: review R1 measured ~28 s of blank workstation at
 * Era 3's arrival, the longest stretch of nothing on a lit surface in the piece.
 *
 * No house. The mark is gone by 2016 — a house was something you could picture,
 * and Lambient is a process. What is left is the word and a ring that turns.
 */
export const E3_IDLE = { spinnerHz: 6 } as const;

/** the spinner steps in twelfths — a 2016 spinner is not smooth either, and a
 *  stepped one is also the only kind this piece's pixel law allows (integer
 *  positions, 90°-step rotations: the ticks come from a fixed ring, never from
 *  a rotated sprite) */
export function e3SpinnerStep(t: number): number {
  return Math.floor(t * E3_IDLE.spinnerHz);
}

/** twelve ticks on a ring, one leading, fading behind it */
export function drawSpinner(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, t: number,
  lead: string, mid: string, rest: string
): void {
  const step = Math.floor(t * E3_IDLE.spinnerHz) % 12;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.round(Math.cos(a) * r) - 1;
    const y = cy + Math.round(Math.sin(a) * r) - 1;
    const behind = (i - step + 12) % 12;
    px(ctx, x, y, 3, 3, behind === 0 ? lead : (behind <= 3 ? mid : rest));
  }
}

/**
 * ⚑ E3's IDLE — what Vera's workstation is doing while you are still in the air.
 *
 * Review R1, §2: *"After landing, Vera's workstation is a dark-blue empty
 * screen for the whole 28 s before the arrival boot… That is the longest
 * dead-air on a lit screen in the piece and it is at an arrival."* The screen
 * is enabled at the era shift, which happens MID-FLIGHT, and the boot only
 * starts when the descent lands — so a lit surface sat in frame saying nothing
 * for half a minute, at the exact moment the player is being carried into a new
 * decade and looking for something to read.
 *
 * ⚑ The fix is not to start the boot earlier — it is to notice that **a 2016
 * machine is never off.** It has been sitting here, on, since before you
 * arrived, and what it shows is a wordmark and a ring that turns. Then you land
 * and it wakes and takes an update. That is the era contrast doing the work for
 * free: 2003's machine had to be restarted and sang at you for half a minute;
 * 2016's was never off and shows you a spinner. By 2016 the apparatus has
 * stopped being a place you go to (REINTERP_INFRASTRUCTURE_SPINE_2026-07-25) —
 * and a machine that never turns off is what that sentence looks like.
 *
 * Dim on purpose: this is a screen nobody is at yet.
 */
export function drawE3Idle(
  ctx: CanvasRenderingContext2D, w: number, h: number, t: number
): void {
  px(ctx, 0, 0, w, h, ERA3.taskBot);
  const cx = Math.round(w / 2);
  const cy = Math.round(h * 0.46);
  const NAME = 'SisterSignal';
  setFont(ctx, 20);
  ctx.fillStyle = ERA3.grey;
  ctx.fillText(NAME, cx - Math.round(ctx.measureText(NAME).width / 2), cy - 28);
  // ⚑ the ring's trailing ticks were `tray` on a `taskBot` ground — three points
  // of luminance apart, so eight of the twelve simply were not there and the
  // spinner read as four grey specks. Quiet is a low brightness, not an
  // invisible one.
  drawSpinner(ctx, cx, cy + 26, 16, t, ERA3.accent, ERA3.grey, ERA3.greyDk);
}
