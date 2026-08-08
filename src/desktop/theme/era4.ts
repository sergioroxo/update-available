/**
 * ERA 4 palette + visor chrome (2026, Room 3, Maya).
 * ⚑ Written by the STOPPED run, which numbered itself Session 75. That number is
 * RETIRED and never reused; the era's build is S76-S79. See BUILD_QUEUE_LIVE.md.
 *
 * ⚑ SALVAGED 2026-08-06. Session 75 (the first S73 attempt) was STOPPED by
 * Sérgio mid-run; this palette is the only artefact it produced and it is kept
 * rather than thrown away — the same discipline that recovered tools/harness/.
 * ⚑ ITS FRAMING IS SUPERSEDED, ITS COLOURS ARE NOT. The header below states
 * Option A ("only the mount point changed"). Sérgio pushed back on exactly that
 * on 2026-08-06 and the answer is now `docs/REINTERP_E4_THE_SPACE_2026-08-06.md`:
 * the visor opens a PLACE, not a rectangle — a headset home environment,
 * ad-saturated and addressed to her by name. Every hex here still obeys the
 * COLOR LAW and is still usable; read the paragraph below as history.
 *
 * THE SURFACE HAS NOT CHANGED, ONLY ITS MOUNT POINT
 * (docs/REINTERP_E4_THE_DEVICE_2026-08-05.md, Option A). Every era so far has
 * drawn onto ONE offscreen 2D canvas textured onto a mesh with FILTER_NEAREST:
 * a CRT in 1997/2003, a flat panel and two device screens in 2016, and now the
 * VISOR of a headset. Same canvas (`DesktopOS.canvas`), same logical
 * resolution (`ERA1_CANVAS`), same `?flat=1` fallback — so this file is a
 * PALETTE and a set of draw helpers, not a second UI system.
 *
 * COLOR LAW (CLAUDE.md; the same discipline `theme/era3.ts`'s NOA block
 * follows): every hex below is lifted VERBATIM from `data/room/era1.json`, the
 * room's own authored palette. Nothing here is invented. The room's dark glass
 * (`#15151F`, `#11111C`, `#1A1A24`) is literally the colour S74 turned the CRT
 * off to; the mint (`#9FD8CB` / `#5DCAA5`) is the room's own soft green, and it
 * is L's voice colour for a deliberate reason — ⚑ **L must sound and look
 * GOOD** (`REINTERP_E4_THE_ARGUMENT_2026-08-05.md` §4.1). A voice rendered in
 * alarm red would let the real thing off the hook. The uncanniness is in what
 * it offers, never in how it looks.
 *
 * ⚑ NOT a horror palette. Soft Lo-Fi doctrine: underdefined edges, low
 * contrast between the field and its panels, one warm accent. The SHARP thing
 * on this surface is the system's own instruments — the caption band, the
 * label field, the counter — exactly as the selective-fidelity law requires.
 */
import { px, setFont } from './chrome';

export const ERA4 = {
  // the field — the visor's own darkness, the room's dead-glass hex
  field: '#11111C',
  fieldLo: '#15151F',
  panel: '#1A1A24',
  panelHi: '#1D1D28',
  panelEdge: '#23232F',
  rule: '#2C2C34',
  ruleHi: '#3A3A44',

  // type
  dim: '#556677',      // meta, timestamps, the things the system says to itself
  meta: '#6C7BA8',     // labels
  text: '#AABBCC',     // ordinary system text
  textHi: '#ECE7D8',   // ⚑ the caption — the warmest, most legible thing here

  // L: warm, mint, unhurried. Never red, never a warning colour.
  l: '#9FD8CB',
  lDim: '#5DCAA5',
  lBand: '#15151F',

  // chips
  chip: '#1D1D28',
  chipEdge: '#44464F',
  chipLive: '#9FD8CB',
  chipText: '#AABBCC',
  chipGone: '#3A3A44',     // a foreclosed chip: visible, greyed, never removed

  // the memories surface — the one warm rectangle in the era
  photoSky: '#8899BB',
  photoSkyHi: '#AABBCC',
  photoWall: '#A8917B',
  photoWallHi: '#C9BFA6',
  photoSkin: '#B89B7E',
  photoSkinHi: '#C9A07A',
  photoHair: '#74492F',
  photoCloth: '#9A9486',
  photoClothHi: '#B5A98C',
  photoWarm: '#E8C9A0',
  photoSun: '#F7C775',
  photoFrame: '#404040',

  // the room's own light, seen through the visor
  glow: '#9FB4C0',
  redact: '#44464F'
} as const;

/**
 * ⚑ THE PLACE (S76) — the home environment's palette, and it is the WARMEST
 * block in the piece since Era 1's paper.
 *
 * `docs/REINTERP_E4_THE_SPACE_2026-08-06.md` §4.1: *"The headset goes on and it
 * is better in here. Warmer, brighter and quieter than the room she is sitting
 * in. ⚑ The piece must let this land honestly. No irony, no warning."* So none
 * of these are dimmed, greyed or soured. It is a nice room. That is the whole
 * point, and souring it would be the era arguing with itself.
 *
 * COLOR LAW, same discipline as the ERA4 block above and `era3.ts`'s NOA:
 * ⚑ every hex is lifted VERBATIM from `data/room/era1.json`. Nothing invented.
 * The wall creams and the wood browns are literally the colours Daniel's 1997
 * room is painted in — which is not a saving, it is the argument: the pleasant
 * default room the apparatus hands her is assembled out of the same handful of
 * colours every room in this piece has always had.
 */
export const PLACE = {
  wallHi: '#F0E5D4',     // the lit wall, up near the window
  wall: '#E6D2BC',
  wallLo: '#CFC4AA',     // shadowed wall, and the window's own frame
  sill: '#B5A98C',
  floor: '#A07B52',
  floorLo: '#8A5A3B',    // the plank seams
  floorHi: '#B98563',    // where the light lands
  sky: '#AABBCC',
  skyLo: '#8899BB',      // higher up, further away
  skyHaze: '#EBD9C4',    // the warm band that sits on the horizon
  land: '#A8B49A',       // something green, far off, unresolvable
  landLo: '#9A9486',
  sun: '#F7C775',
  sunHi: '#FFD24C',
  rug: '#D8CDB4',
  rugHi: '#E8C9A0',
  textile: '#C9A8A0',    // the cushion nobody chose
  textileHi: '#D9A8A0',
  plant: '#A8B49A',
  plantLo: '#9A9486',
  mug: '#F5EDDC',
  shelf: '#B5A98C',
  book: '#C42020',
  bookAlt: '#2C3A5C',
  ink: '#74492F'         // the environment's own small print
} as const;

/** ⚑ THE PARALLAX BOUND. The picture answers when you look, and it answers a
 *  little, in hard steps, and it never gets anywhere: three layers, twelve
 *  pixels at the very front, and turning further buys nothing. `look` is
 *  −1…+1 and is already quantised by the caller (see apps/space.ts's LOOK_STEP)
 *  so this can only ever be redrawn a handful of times across a whole turn. */
const PARALLAX = { far: 3, mid: 7, near: 12 } as const;
const shift = (look: number, depth: keyof typeof PARALLAX): number =>
  Math.round(-look * PARALLAX[depth]);

/**
 * ⚑ THE HOME ENVIRONMENT — a picture of a place, drawn on the canvas.
 *
 * Every VR headset ships one: a pleasant default room, a view out of a window,
 * a horizon. ⚑ *"A room that is not yours, that millions of people have an
 * identical copy of, designed to feel like somewhere"* (THE_SPACE §2). It adds
 * NO geometry — it is flat, and the flatness is the era's argument: the
 * apparatus can only ever show you a picture of a room.
 *
 * Drawn in hard steps, integer positions, no rotations (pixel discipline). The
 * only soft thing is the light, which is three alpha washes — the same device
 * `photograph()` uses for the light the system adds to her picture.
 *
 * ⚑ PLACEHOLDER-draft art — Sérgio's eye pending, like the NOA frames.
 */
export function homeEnvironment(
  ctx: CanvasRenderingContext2D, W: number, H: number, look: number
): void {
  const HORIZON = 236;
  const far = shift(look, 'far');
  const mid = shift(look, 'mid');
  const near = shift(look, 'near');

  // ── the wall, and the floor it stands on ──────────────────────────────────
  px(ctx, 0, 0, W, HORIZON, PLACE.wall);
  px(ctx, 0, 0, W, 96, PLACE.wallHi);          // higher up is lighter
  px(ctx, 0, HORIZON - 26, W, 26, PLACE.wallLo);
  px(ctx, 0, HORIZON, W, H - HORIZON, PLACE.floor);
  for (let y = HORIZON + 11; y < H; y += 13) px(ctx, 0, y, W, 1, PLACE.floorLo);

  // ── the window: the whole reason a default room feels like somewhere ──────
  const wx = 168 + mid; const wy = 44; const ww = 264; const wh = 168;
  px(ctx, wx - 6, wy - 6, ww + 12, wh + 12, PLACE.wallLo);   // the frame
  px(ctx, wx, wy, ww, wh, PLACE.skyLo);
  px(ctx, wx + far, wy + 52, ww, 46, PLACE.sky);
  px(ctx, wx + far, wy + 98, ww, 22, PLACE.skyHaze);         // the warm band
  px(ctx, wx + far, wy + 120, ww, 34, PLACE.land);
  px(ctx, wx + far, wy + 146, ww, 22, PLACE.landLo);
  // the sun: two squares, low and left, never a disc — pixel discipline
  px(ctx, wx + 42 + far, wy + 74, 18, 18, PLACE.sunHi);
  px(ctx, wx + 36 + far, wy + 68, 30, 30, PLACE.sun);
  px(ctx, wx + 42 + far, wy + 74, 18, 18, PLACE.sunHi);
  // mullions — the frame does not parallax against its own glass
  px(ctx, wx + Math.round(ww / 2) - 2, wy, 4, wh, PLACE.wallLo);
  px(ctx, wx, wy + Math.round(wh / 2) - 2, ww, 4, PLACE.wallLo);
  px(ctx, wx - 8, wy + wh, ww + 16, 9, PLACE.sill);

  // ── the light it throws, which is the honest part ─────────────────────────
  ctx.save();
  ctx.globalAlpha = 0.20;
  px(ctx, wx - 26, HORIZON, ww + 52, 40, PLACE.sun);
  ctx.globalAlpha = 0.14;
  px(ctx, wx - 54, HORIZON + 40, ww + 108, 44, PLACE.sun);
  ctx.globalAlpha = 0.08;
  px(ctx, wx - 86, HORIZON + 84, ww + 172, 52, PLACE.sun);
  ctx.restore();
  px(ctx, wx + 10, HORIZON + 6, ww - 20, 3, PLACE.floorHi);

  // ── the things somebody put here for you ──────────────────────────────────
  // a shelf, three books, a plant. None of it is anybody's.
  const sx = 22 + mid;
  px(ctx, sx, 108, 108, 6, PLACE.shelf);
  px(ctx, sx + 10, 86, 8, 22, PLACE.book);
  px(ctx, sx + 20, 82, 7, 26, PLACE.bookAlt);
  px(ctx, sx + 29, 88, 9, 20, PLACE.ink);
  px(ctx, sx + 74, 92, 20, 16, PLACE.plantLo);
  px(ctx, sx + 78, 74, 12, 20, PLACE.plant);
  px(ctx, sx + 70, 80, 10, 8, PLACE.plant);
  px(ctx, sx + 88, 78, 10, 8, PLACE.plant);

  // the rug, the table, the cushion, the cup somebody left in the render
  const nx = near;
  px(ctx, 74 + nx, 262, 344, 78, PLACE.rug);
  px(ctx, 74 + nx, 262, 344, 4, PLACE.rugHi);
  px(ctx, 74 + nx, 336, 344, 4, PLACE.rugHi);
  px(ctx, 150 + nx, 272, 190, 30, PLACE.floorLo);
  px(ctx, 150 + nx, 272, 190, 5, PLACE.floorHi);
  px(ctx, 166 + nx, 302, 10, 26, PLACE.floorLo);
  px(ctx, 314 + nx, 302, 10, 26, PLACE.floorLo);
  px(ctx, 292 + nx, 258, 16, 14, PLACE.mug);
  px(ctx, 292 + nx, 258, 16, 3, PLACE.wallHi);
  px(ctx, 40 + nx, 288, 74, 44, PLACE.textile);
  px(ctx, 40 + nx, 288, 74, 5, PLACE.textileHi);
}

/**
 * ⚑ THE VISOR'S OWN EDGE. Four hard bands of the field colour, darkest at the
 * very border — the limit of what the thing on your face can show you. It is
 * also the honest seam: in the room, the picture is a rectangle mounted to your
 * head, and the rectangle has edges even when the place inside it does not.
 */
export function visorEdge(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  const bands: [number, number][] = [[14, 0.10], [8, 0.20], [4, 0.34], [2, 0.55]];
  ctx.save();
  for (const [inset, alpha] of bands) {
    ctx.globalAlpha = alpha;
    px(ctx, 0, 0, W, inset, ERA4.field);
    px(ctx, 0, H - inset, W, inset, ERA4.field);
    px(ctx, 0, 0, inset, H, ERA4.field);
    px(ctx, W - inset, 0, inset, H, ERA4.field);
  }
  ctx.restore();
}

/**
 * The device before it is worn: a dark field, one standby light, one dim line.
 * ⚑ Drawn LARGE and simple on purpose — this same canvas is textured onto a
 * 9 cm visor across the room, so anything smaller than this reads as noise. The
 * grammar is S2R.0's waiting screen (one dim line on dark glass, pressed to
 * advance), which is the piece's own way of saying "it is on, and it is waiting".
 */
export function standby(
  ctx: CanvasRenderingContext2D, W: number, H: number, pulse: number, label: string
): void {
  px(ctx, 0, 0, W, H, ERA4.field);
  px(ctx, 0, 0, W, 40, ERA4.fieldLo);
  px(ctx, 0, H - 40, W, 40, ERA4.fieldLo);
  const cx = Math.round(W / 2); const cy = Math.round(H / 2) - 14;
  // ⚑ THE STANDBY LIGHT, and it is deliberately BIG. Measured in-browser (S76):
  // the visor's face is about 80 screen px across at the seat, so a tasteful
  // 4 px rail resolves to less than one pixel and the device reads as dead
  // furniture. This is the affordance — the piece may not explain the headset
  // in words (the touchless budget, and nothing in Era 4 is announced), so the
  // object has to say "on, and waiting" by being visibly lit.
  const wide = 240 + Math.round(pulse * 24);
  px(ctx, cx - Math.round(wide / 2), cy - 2, wide, 14, ERA4.lBand);
  px(ctx, cx - Math.round(wide / 2), cy, wide, 10, ERA4.lDim);
  px(ctx, cx - 40, cy - 8, 80, 26, ERA4.l);
  setFont(ctx, 10);
  ctx.fillStyle = ERA4.dim;
  const tw = Math.ceil(ctx.measureText(label).width);
  ctx.fillText(label, cx - Math.round(tw / 2), cy + 28);
}

/** The visor's resting field: not black — a dark grey-blue with a soft, very
 *  low-contrast vignette. Underdefined edges, per the Soft Lo-Fi doctrine. */
export function visorField(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  px(ctx, 0, 0, W, H, ERA4.field);
  // three faint bands rather than a gradient — pixel discipline, hard steps
  px(ctx, 0, 0, W, 26, ERA4.fieldLo);
  px(ctx, 0, H - 26, W, 26, ERA4.fieldLo);
}

/**
 * ⚑ THE CAPTION BAND — the era's accessibility surface AND its safety surface
 * (`REINTERP_E4_THE_ARGUMENT_2026-08-05.md` §4.2). It is drawn FIRST, before
 * the line is spoken, because a caption read a half-second early is the only
 * warning an audio beat can give. It is also the era's witness surface: a
 * piece whose spine is the record should let you read what was said to you.
 *
 * `speaker` is drawn small and dim; the line itself is the brightest text on
 * the whole surface. That hierarchy is the point — the apparatus's words are
 * the most legible thing in Maya's room.
 */
export function captionBand(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  speaker: string,
  lines: string[]
): void {
  const rows = Math.max(1, lines.length);
  const h = 16 + rows * 14 + 8;
  const y = H - h - 10;
  px(ctx, 12, y, W - 24, h, ERA4.lBand);
  px(ctx, 12, y, 2, h, ERA4.lDim);           // the speaker rail
  px(ctx, 12, y, W - 24, 1, ERA4.rule);
  px(ctx, 12, y + h - 1, W - 24, 1, ERA4.rule);
  setFont(ctx, 9);
  ctx.fillStyle = ERA4.lDim;
  ctx.fillText(speaker, 22, y + 5);
  setFont(ctx, 11);
  ctx.fillStyle = ERA4.textHi;
  lines.forEach((line, i) => ctx.fillText(line, 22, y + 18 + i * 14));
}

/**
 * A chip. Three states and only three: LIVE (pressable), GONE (foreclosed —
 * ⚑ drawn, greyed, and never removed: the shrinking choice is only legible in
 * retrospect if the foreclosure stays on screen), and HOVER.
 */
export function chip(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  label: string,
  opts: { live: boolean; hover?: boolean } = { live: true }
): void {
  px(ctx, x, y, w, h, opts.live ? ERA4.chip : ERA4.field);
  const edge = !opts.live ? ERA4.chipGone : opts.hover ? ERA4.chipLive : ERA4.chipEdge;
  px(ctx, x, y, w, 1, edge);
  px(ctx, x, y + h - 1, w, 1, edge);
  px(ctx, x, y, 1, h, edge);
  px(ctx, x + w - 1, y, 1, h, edge);
  setFont(ctx, 10);
  ctx.fillStyle = !opts.live ? ERA4.chipGone : opts.hover ? ERA4.chipLive : ERA4.chipText;
  ctx.fillText(label, x + 8, y + Math.round((h - 10) / 2));
}

/**
 * The system's own label field — the thing it puts on an object when it
 * captions the room. ⚑ This is the SHARP object on the surface (selective
 * fidelity: the system's instruments are the most defined things in the
 * piece), which is why it has a hard bracket and the caption band does not.
 */
export function labelField(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number,
  object: string, label: string, uncertain = false
): void {
  const h = 30;
  px(ctx, x, y, w, h, ERA4.panel);
  px(ctx, x, y, w, 1, ERA4.ruleHi);
  px(ctx, x, y + h - 1, w, 1, ERA4.rule);
  // the bracket: two hard corners, the machine's own framing gesture
  for (const cx of [x, x + w - 7]) {
    px(ctx, cx, y, 7, 1, ERA4.lDim);
    px(ctx, cx === x ? x : x + w - 1, y, 1, 5, ERA4.lDim);
    px(ctx, cx, y + h - 1, 7, 1, ERA4.lDim);
    px(ctx, cx === x ? x : x + w - 1, y + h - 5, 1, 5, ERA4.lDim);
  }
  setFont(ctx, 9);
  ctx.fillStyle = ERA4.meta;
  ctx.fillText(object, x + 10, y + 5);
  setFont(ctx, 11);
  ctx.fillStyle = uncertain ? ERA4.dim : ERA4.text;
  ctx.fillText(label, x + 10, y + 16);
}

/**
 * ⚑ THE PHOTOGRAPH (S4R.4, the memories feature). Pre-authored pixel art —
 * there is NO camera input and NO file input in this piece, ever, and there
 * never will be (CLAUDE.md hard invariant; the same law the E1 Restoration
 * Filter obeys). Two versions of the SAME image:
 *
 *   `original`  — hers. Dim, off-centre, grainy, the horizon slightly wrong.
 *   `enhanced`  — ⚑ and the cruelty is that it is a GOOD photo. Warmer light,
 *                 straightened, cleaner, the sky lifted. The system is pleased
 *                 with itself. It thinks it did her a favour, and by every
 *                 measure it has been taught, it did.
 *
 * FACELESS, like `era3.ts`'s NOA frames and for the same reason: no real
 * people, no likenesses, ever. The figure is a shape at a window.
 * ⚑ PLACEHOLDER-draft art — Sérgio's eye pending.
 */
export function photograph(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  enhanced: boolean
): void {
  const sky = enhanced ? ERA4.photoSkyHi : ERA4.photoSky;
  const wall = enhanced ? ERA4.photoWallHi : ERA4.photoWall;
  const skin = enhanced ? ERA4.photoSkinHi : ERA4.photoSkin;
  const cloth = enhanced ? ERA4.photoClothHi : ERA4.photoCloth;

  px(ctx, x, y, w, h, wall);
  // the window she is standing in front of — straightened in the enhanced pass
  const tilt = enhanced ? 0 : 3;
  const wx = x + Math.round(w * 0.10);
  const ww = Math.round(w * 0.52);
  px(ctx, wx, y + 6 + tilt, ww, Math.round(h * 0.62), sky);
  px(ctx, wx + Math.round(ww / 2) - 1, y + 6 + tilt, 2, Math.round(h * 0.62), wall);
  if (enhanced) {
    // the light the system added: a warm wash across the top third
    ctx.save();
    ctx.globalAlpha = 0.30;
    px(ctx, x, y, w, Math.round(h * 0.4), ERA4.photoSun);
    ctx.restore();
  }
  // the figure — a shape, no face, ever
  const fx = x + Math.round(w * 0.56);
  const fy = y + Math.round(h * 0.22);
  px(ctx, fx, fy, 14, 14, skin);                 // head
  px(ctx, fx - 2, fy - 3, 18, 6, ERA4.photoHair);
  px(ctx, fx - 4, fy + 15, 22, h - (fy - y) - 15, cloth); // shoulders down
  if (!enhanced) {
    // her version has grain. The enhanced one does not, and that is the tell.
    ctx.save();
    ctx.globalAlpha = 0.10;
    for (let i = 0; i < 90; i++) {
      const gx = x + ((i * 37) % w);
      const gy = y + ((i * 53) % h);
      px(ctx, gx, gy, 1, 1, ERA4.textHi);
    }
    ctx.restore();
  }
  // frame
  px(ctx, x - 1, y - 1, w + 2, 1, ERA4.photoFrame);
  px(ctx, x - 1, y + h, w + 2, 1, ERA4.photoFrame);
  px(ctx, x - 1, y - 1, 1, h + 2, ERA4.photoFrame);
  px(ctx, x + w, y - 1, 1, h + 2, ERA4.photoFrame);
}

/**
 * THE FINALE's cyclorama slits (S4R.9). ⚑ Deliberately the SAME grammar as the
 * relocation choreography's building — vertical lit slots in a dark field,
 * countless rooms seen edge-on — and NOT a second visual idea invented for the
 * ending (`REINTERP_THE_BUILDING_2026-08-02.md`). `k` runs 0→1.
 */
export function cyclorama(ctx: CanvasRenderingContext2D, W: number, H: number, k: number): void {
  px(ctx, 0, 0, W, H, ERA4.field);
  const n = 18;
  for (let i = 0; i < n; i++) {
    const phase = Math.max(0, Math.min(1, k * 2.2 - i / n));
    if (phase <= 0) continue;
    const sw = 3;
    const sx = Math.round(((i + 0.5) / n) * W) - 1;
    const sh = Math.round(H * 0.62 * phase);
    px(ctx, sx, Math.round((H - sh) / 2), sw, sh, i % 3 === 0 ? ERA4.glow : ERA4.rule);
  }
}
