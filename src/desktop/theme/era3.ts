/**
 * Session 37 (E3-i, the three-screen room foundation): PORTED VERBATIM from
 * the shipped (non-reinterp) build's `src/desktop/theme/era3.ts` — this is
 * the officially authored Era-3 palette, not an invented one (CLAUDE.md's
 * "import era palettes from src/desktop/theme/, never invent colors" is
 * satisfied by porting the era's own theme file, the same way era1/era2's
 * palettes were established). Used this session by `src/room/era3Devices.ts`
 * for the workstation's SisterSignal login/desktop shell only — GraceQueue itself
 * (the full moderation app below, also shipped) is NOT wired in yet; that is
 * E3-iii+ per docs/REINTERP_E3_ADAPTATION_SPEC_2026-07-12.md's build lanes.
 *
 * ERA 3 theme (~2014–2017) — Windows 7 "Aero" glass, drawn as pixel-art on the
 * same 512×384 logical grid as Eras 1 & 2 (rendered ×3 for VR).
 *
 * The machine has AGED: Era 1 was Win95 teal/grey; Era 2 was XP Luna (beige body,
 * saturated blue title, green start flag). Era 3 must read as a DIFFERENT, glassier,
 * cooler machine — light translucent bodies, soft gradients, a dark glass taskbar
 * with a round orb. This is the SisterSignal/GraceQueue era: a rebranded "flourishing"
 * network seen from the moderator's side.
 *
 * LAW (as Eras 1 & 2): import these colors, don't invent per call-site.
 */
import { px, setFont } from './chrome';
export { px } from './chrome';

export const ERA3 = {
  // Aero desktop (cool blue, soft light)
  deskTop: '#16324f',
  deskMid: '#1f4d76',
  deskLow: '#2f6ea0',
  glow: '#9fd0ff',
  // glass window
  glass: '#eef4fb',     // near-white glass body
  glassEdge: '#b9cfe6',
  glassHi: '#ffffff',
  titleA: '#dbeafe',    // light glass title bar (dark text on light glass)
  titleB: '#c2dbf6',
  titleHi: '#ffffff',
  titleText: '#1b3a5c',
  frame: '#7fa8d0',     // glassy outer frame
  // taskbar (dark glass)
  taskTop: '#2a4a6e',
  taskTopB: '#3a5d86',
  taskMid: '#1c3654',
  taskBot: '#13243a',
  orbA: '#7fd0ff',
  orbB: '#2f86d8',
  orbC: '#16538f',
  tray: '#10243d',
  // accents
  accent: '#2f86d8',    // aero blue
  accentHi: '#7fbef0',
  amber: '#e0a030',     // "concern"/flag
  rose: '#d2607e',      // a soft rose for the women / the warm thread
  good: '#56b06a',      // approve green
  bury: '#9a4a63',      // bury maroon (echo of the Lamby maroon)
  grey: '#7f8a97',
  greyDk: '#4a5560',
  white: '#ffffff',
  ink: '#1c2a38',
  field: '#ffffff',
  fieldEdge: '#9fb4cc',
  // GraceQueue lanes — each voice gets its own band so they never blur together.
  // human member (warm): a rose spine + cream card. system (clinical): cold grey.
  // lambient (the helper): soft blue. pressure (the Watcher): alarm rose-red.
  memberBand: '#fff7f9',   // warm cream behind a member's words
  memberSpine: '#d2607e',  // rose spine = a real person speaking
  sysBand: '#eceff3',      // clinical grey band = the automated system
  sysTag: '#6b7686',       // "SYSTEM" tag ink
  lambBand: '#e6f0fb',     // soft blue lane = Lambient's voice
  lambTag: '#2f86d8',      // "LAMBIENT" tag ink
  alarmBand: '#f6dde2',    // the Watcher's pressure band
  alarm: '#b03a55',        // ROOM INTEGRITY alarm ink
  // The PHONE (Session 37's nightstand screen, brought into the palette in
  // Session 64 — these five values were invented at the call site in
  // src/room/era3Devices.ts, which is exactly what the palette law forbids;
  // they are unchanged in value, only rehomed). A phone in 2016 is the one
  // dark screen in a bright era: the workstation is glass and daylight, and this
  // is a lit rectangle in a dark room, held close.
  phoneBg: '#0a0f18',      // the lock screen at night
  phonePanel: '#1f2a3a',   // a notification / a message field
  phoneDim: '#8aa0b8',     // the date under the clock
  phoneMeta: '#9fb4cc',    // timestamps
  phoneText: '#cfe0f2'     // what a person actually said
} as const;

/** The Aero desktop: a cool deep-blue gradient with a soft off-centre glow. */
export function wallpaper(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  px(ctx, 0, 0, W, Math.round(H * 0.34), ERA3.deskTop);
  px(ctx, 0, Math.round(H * 0.34), W, Math.round(H * 0.33), ERA3.deskMid);
  px(ctx, 0, Math.round(H * 0.67), W, H - Math.round(H * 0.67), ERA3.deskLow);
  // a soft light ray / orb glow, low-right (Win7-ish), drawn as faint rings
  const gx = Math.round(W * 0.66); const gy = Math.round(H * 0.6);
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = ERA3.glow;
  for (let r = 120; r > 0; r -= 22) { ctx.beginPath(); ctx.arc(gx, gy, r, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

/** Win7 taskbar: dark glass strip + a round orb (invented, not the MS logo). */
export function taskbar(ctx: CanvasRenderingContext2D, W: number, H: number, clock: string): void {
  const bh = 28; const ty = H - bh;
  px(ctx, 0, ty, W, 1, ERA3.taskTopB);
  px(ctx, 0, ty + 1, W, 7, '#34547d');
  px(ctx, 0, ty + 8, W, bh - 8, ERA3.taskBot);
  // round orb
  const ox = 16; const oy = ty + bh / 2;
  ctx.fillStyle = ERA3.orbC; ctx.beginPath(); ctx.arc(ox, oy, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = ERA3.orbB; ctx.beginPath(); ctx.arc(ox, oy, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = ERA3.orbA; ctx.beginPath(); ctx.arc(ox - 2, oy - 2, 4, 0, Math.PI * 2); ctx.fill();
  // ⚑ PINNED BUTTONS — 2026-08-24, from Sérgio's Windows 7 reference sheets.
  //   A period taskbar is not an orb and a clock: it is the orb, a row of
  //   pinned launchers, a notification tray and a TWO-LINE clock. These three
  //   are inert set dressing, exactly like the phone's furniture icons — a work
  //   machine has software on it that this shift is not about, and drawing them
  //   is what makes the one button that IS live read as a running application.
  const pinX = 190;
  for (let i = 0; i < 3; i++) {
    const bx = pinX + i * 34;
    px(ctx, bx, ty + 4, 30, bh - 8, ERA3.taskMid);
    px(ctx, bx, ty + 4, 30, 1, ERA3.taskTopB);
    // a browser ring, a folder, a disc — generic shapes, no real product's mark
    if (i === 0) {
      ctx.strokeStyle = ERA3.accentHi; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(bx + 15, oy, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(bx + 15, oy, 2.5, 6, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (i === 1) {
      px(ctx, bx + 8, oy - 4, 14, 9, ERA3.amber);
      px(ctx, bx + 8, oy - 6, 6, 2, ERA3.amber);
    } else {
      ctx.fillStyle = ERA3.glassHi;
      ctx.beginPath(); ctx.arc(bx + 15, oy, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ERA3.taskMid;
      ctx.beginPath(); ctx.arc(bx + 15, oy, 2, 0, Math.PI * 2); ctx.fill();
    }
  }

  // tray: a divider, two small glyphs, then the clock on two lines
  setFont(ctx, 10);
  const dateW = ctx.measureText(clock).width;
  const cw = Math.max(52, dateW + 18);
  px(ctx, W - cw - 46, ty + 5, 1, bh - 10, ERA3.taskTopB);
  // a network fan and a speaker, both drawn rather than typed
  for (let i = 0; i < 3; i++) px(ctx, W - cw - 38 + i * 3, oy + 2 - i * 2, 2, 3 + i * 2, ERA3.glassHi);
  px(ctx, W - cw - 24, oy - 2, 3, 5, ERA3.glassHi);
  px(ctx, W - cw - 21, oy - 4, 2, 9, ERA3.glassHi);
  px(ctx, W - cw - 6, ty + 4, cw, bh - 8, ERA3.tray);
  px(ctx, W - cw - 6, ty + 4, cw, 1, '#0a1c30');
  ctx.fillStyle = ERA3.white;
  setFont(ctx, 10);
  const tw2 = ctx.measureText(clock).width;
  ctx.fillText(clock, W - cw - 6 + Math.round((cw - tw2) / 2), ty + 6);
  setFont(ctx, 9);
  ctx.fillStyle = ERA3.phoneMeta;
  const dw2 = ctx.measureText(TASKBAR_DATE).width;
  ctx.fillText(TASKBAR_DATE, W - cw - 6 + Math.round((cw - dw2) / 2), ty + 16);
}

/** ⚑ the date under the clock, the way Windows 7 stacked them. Kept beside the
 *  taskbar rather than in a data file because it is CHROME, not dialogue — the
 *  same reason the caption glyphs live here. It matches the phone's own lock
 *  screen date; the two devices are in the same day. */
const TASKBAR_DATE = '13/12';

export interface AeroContent {
  x: number; y: number; w: number; h: number;
  closeBox: { x: number; y: number; w: number; h: number };
  /** ⚑ the MINIMISE box, returned 2026-08-24. The caption row has drawn three
   *  buttons since this file was written and only ever handed back the close
   *  box, so minimise was painted and dead — Sérgio, twice: "they should have a
   *  minimise button not just an X so people can know." A window you can put
   *  down is a window you can come back to, and in Era 3 that is not decoration:
   *  the board is a shift, and being able to set it aside is part of what makes
   *  picking it back up mean something. */
  minBox: { x: number; y: number; w: number; h: number };
}

/** Aero glass window: light translucent body, soft gradient title bar, dark caption. */
export function windowFrame(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, title: string, active = true
): AeroContent {
  const barH = 22;
  // glassy outer frame + body
  px(ctx, x - 2, y - 2, w + 4, h + 4, ERA3.frame);
  px(ctx, x - 1, y - 1, w + 2, h + 2, ERA3.glassHi);
  px(ctx, x, y, w, h, ERA3.glass);
  // title bar (light glass gradient, dark text)
  px(ctx, x, y, w, barH, active ? ERA3.titleA : '#dfe5ec');
  px(ctx, x, y, w, 2, ERA3.titleHi);
  px(ctx, x, y + barH - 7, w, 7, active ? ERA3.titleB : '#d2d8df');
  px(ctx, x, y + barH - 1, w, 1, ERA3.glassEdge);
  setFont(ctx, 12);
  ctx.fillStyle = active ? ERA3.titleText : ERA3.grey;
  ctx.fillText(title, x + 9, y + 6);
  // caption buttons: min, max, close(red)
  const by = y + 4; const bs = 14;
  // ⚑ TWO BUTTONS, NOT THREE — 2026-08-24. The restore-down (□) was drawn and
  // dead, the same fault minimise had until this session, and it is now a lie
  // as well: Era 3's window is MAXIMISED by decision (Sérgio) and has exactly
  // two states — up, and put down on the taskbar. A control that cannot do the
  // thing it depicts is worse than an absent one, because a player who presses
  // it and gets nothing learns that pressing things here does nothing.
  capBtn(ctx, x + w - 18, by, bs, ERA3.bury, ERA3.rose, 'x');
  capBtn(ctx, x + w - 36, by, bs, '#cfe0f2', ERA3.glassHi, '_');
  const cb = { x: x + w - 18, y: by, w: bs, h: bs };
  const mb = { x: x + w - 36, y: by, w: bs, h: bs };
  return { x: x + 5, y: y + barH + 5, w: w - 10, h: h - barH - 10, closeBox: cb, minBox: mb };
}

function capBtn(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, base: string, hi: string, glyph: string): void {
  px(ctx, x, y, s, s, base);
  px(ctx, x, y, s, 1, hi);
  px(ctx, x, y, 1, s, hi);
  px(ctx, x, y + s - 1, s, 1, ERA3.glassEdge);
  setFont(ctx, 10);
  ctx.fillStyle = glyph === 'x' ? ERA3.white : ERA3.titleText;
  ctx.fillText(glyph, x + 4, y + 2);
}

/** Aero pill button (glassy light blue, optional accent/hover ring). */
export function button(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, label: string,
  opts: { disabled?: boolean; hover?: boolean; primary?: boolean; size?: number; tone?: 'good' | 'bury' | 'amber' } = {}
): void {
  let fill = opts.primary ? '#cfe6ff' : '#eaf1f9';
  if (opts.tone === 'good') fill = '#d7efdc';
  if (opts.tone === 'bury') fill = '#f0d8e0';
  if (opts.tone === 'amber') fill = '#f6e6c4';
  px(ctx, x, y, w, h, fill);
  px(ctx, x, y, w, 1, ERA3.glassHi);
  px(ctx, x, y, 1, h, ERA3.glassHi);
  px(ctx, x, y + h - 1, w, 1, ERA3.glassEdge);
  px(ctx, x + w - 1, y, 1, h, ERA3.glassEdge);
  if (opts.hover && !opts.disabled) {
    px(ctx, x - 1, y - 1, w + 2, 1, ERA3.accent);
    px(ctx, x - 1, y + h, w + 2, 1, ERA3.accent);
    px(ctx, x - 1, y - 1, 1, h + 2, ERA3.accent);
    px(ctx, x + w, y - 1, 1, h + 2, ERA3.accent);
  }
  const fs = opts.size ?? 11;
  setFont(ctx, fs);
  ctx.fillStyle = opts.disabled ? ERA3.grey : ERA3.ink;
  const tw = ctx.measureText(label).width;
  ctx.fillText(label, Math.round(x + (w - tw) / 2), Math.round(y + (h - fs) / 2));
}

/** A small uppercase lane-tag pill (e.g. MEMBER / SYSTEM / LAMBIENT) so each
 * voice is labelled and never blurs into the next. Returns the x past the pill. */
export function tag(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, label: string, ink: string, fill: string
): number {
  setFont(ctx, 8);
  const w = ctx.measureText(label).width + 8;
  px(ctx, x, y, w, 12, fill);
  px(ctx, x, y, w, 1, ERA3.glassHi);
  ctx.fillStyle = ink;
  ctx.fillText(label, x + 4, y + 2);
  return x + w + 4;
}

/** Lambient's mark, settled (no animation) — the same seven fixed offsets
 *  Session 33's uninstall-report scatter used (src/desktop/apps/update.ts),
 *  drawn small and static: the fragments have already arrived, per u3's own
 *  "migrating." line. `scale` keeps the footprint tiny (~8x8px) regardless of
 *  which screen it sits on. Lives here (not in src/room/era3Devices.ts, its
 *  original Session 37 home) since Session 38's src/room/graceQueueLite.ts
 *  also needs it and importing it FROM era3Devices.ts would create a
 *  circular dependency (era3Devices.ts imports GraceQueueLite). */
export function drawLambMark(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1): void {
  const FRAG: [number, number][] = [
    [10, -6], [16, 3], [7, 9], [-8, 7], [-13, -4], [4, -12], [-3, 13]
  ];
  px(ctx, x, y, Math.max(1, Math.round(2 * scale)), Math.max(1, Math.round(2 * scale)), ERA3.grey);
  for (const [fx, fy] of FRAG) {
    px(
      ctx,
      x + Math.round(fx * 0.32 * scale),
      y + Math.round(fy * 0.32 * scale),
      Math.max(1, Math.round(1.6 * scale)),
      Math.max(1, Math.round(1.6 * scale)),
      ERA3.greyDk
    );
  }
}

/**
 * ⚑ THE LIFT, screen side (Session 64) — the workstation's grade warms while the
 * software on it does not change at all. `k` runs 0 (as you found it) → 1.
 *
 * Lives here, in the theme, for the reason the theme exists: the wash must be
 * made of THIS era's own colours, not of a warm hue invented at the call site.
 * `rose` puts the era's own warm thread over the cold glass; `amber` — the
 * colour this interface has only ever used to flag a person — is what actually
 * lights it. Two passes, both non-destructive blends, so every pixel of the
 * correction list is still exactly where and what it was: the panel is graded,
 * never redrawn.
 */
export function warmGrade(ctx: CanvasRenderingContext2D, W: number, H: number, k: number): void {
  if (k <= 0) return;
  const kk = Math.min(1, k);
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  // 0.62, not 1: enough that the cold glass goes warm, little enough that the
  // Aero blue is still visibly blue. It has to read as light falling on the
  // screen, not as a filter laid over it.
  ctx.globalAlpha = 0.62 * kk;
  ctx.fillStyle = ERA3.amber;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.14 * kk;
  ctx.fillStyle = ERA3.rose;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/**
 * ⚑ NOA'S VIDEO (Session 69) — the picture the correction list has always
 * claimed to be editing, and never had.
 *
 * Her submission has opened with *"I sent a video this time instead of writing
 * it out"* since Session 64, and there was no video: the player corrected a
 * recording they had never watched. That was a template shortcut. It is now
 * deliberate, and the frames below are it.
 *
 * ⚑ FACELESS, and by an in-world reason rather than a crop that hides a head:
 * she propped the workstation badly. What is in shot is her lap — the brother's
 * flannel over her knees, both sleeves coming in from the sides, her hands
 * meeting in the middle, and past them a dim room with one lamp in it. Someone
 * who says *"I'm not good on camera"* frames it exactly this wrong, and it
 * means the piece never has to draw a face to draw a person. Everything in the
 * frame is something she actually names.
 *
 * ⚑ AND THE HANDS ARE THE SENTENCE. *"my hands don't know where to go"* is not
 * illustrated by a caption; it is the animation. Eight poses over twenty-four
 * seconds — apart, coming together, interlaced, a thumb rubbing a thumb, the
 * sleeve pulled down over one hand, held there, apart again, still. The video
 * is short because her own words say it is: *"That's the whole video. Sorry it
 * isn't longer."*
 *
 * ⚑ NO CAMERA, NO FILE INPUT, EVER — the Restoration Filter's law, unchanged.
 * These are pre-authored pixel frames drawn from code. Nothing is captured,
 * nothing is uploaded, no permission is ever requested.
 *
 * REGISTER: `felt`. She is never the joke, nothing is drawn OVER her, and the
 * satire is entirely in the panel beside her (`honestLight` below and its
 * checklist item). The frame is SOFT — underdefined, warm, low-contrast — per
 * the doctrine that the witness side is the sharp side and life is not.
 *
 * COLOUR: every value in `NOA` is lifted verbatim from `data/room/era1.json`,
 * the piece's own approved domestic palette (`data/room/cluster.json`'s COLOR
 * LAW: *"every hex here already exists in data/room/era1.json"*). Nothing here
 * is invented — including the two skin values, which are the room's own floor
 * and bed-frame browns and are deliberately not chosen AS a skin tone.
 */
export const NOA = {
  wall: '#2C2C34',        // era1 boomboxSpeaker — the dim room behind her
  wallLit: '#74492F',     // era1 deskLeg — where the lamp reaches the wall
  glow: '#8A5A3B',        // era1 deskTop — the lamp's spill
  glowHot: '#E8C9A0',     // era1 roomFill light — its small hot centre
  floor: '#B98563',       // era1 rug
  bed: '#A07B52',         // era1 bedFrame — the edge of a bed past her knees
  blanket: '#D4A0A0',     // era1 blanket — a corner of it, out of focus
  dark: '#1A1A24',        // era1 witnessPanelFrame — the corners of the room
  // the flannel is OLD and the room is DIM, so its check is low-contrast and
  // warm — a bold check at this scale reads as a fence, not as a shirt.
  flannel: '#A07B52',     // era1 bedFrame — the worn ground
  flannelLit: '#B98563',  // era1 rug — where the lamp catches the cloth
  flannelDk: '#8A5A3B',   // era1 deskTop — the check
  flannelDp: '#74492F',   // era1 deskLeg — where two checks cross
  flannelPale: '#C9A8A0', // era1 book — the pale thread in the weave
  // ⚑ her hands are the brightest thing in the frame, and the reason is in the
  // room: the workstation she is recording into is the only light on them. It is the
  // same fact Room 2 is built on — in 2016 the screen is the lamp.
  skinHi: '#E6D2BC',      // era1 wall — where the screen catches them
  skin: '#C9A07A',        // era1 floor
  skinLo: '#8A5A3B'       // era1 deskTop
} as const;

/** the frame's own virtual grid — every composition figure below is in these
 *  units, and the caller picks how many device pixels one unit is worth. */
export const NOA_FRAME = { w: 176, h: 100 } as const;
/** how long the whole thing runs, and how long one pose holds. 8 × 3 = 24 s. */
export const NOA_SECONDS = 24;
const POSE_HOLD = 3;

/** the eight poses of one sentence. `l`/`r` are each hand's CENTRE in frame
 *  units; `cuff` is how far the sleeve has come down over that hand — it is her
 *  brother's shirt, so the sleeves are too long for her, which is the whole
 *  reason poses 6 and 7 are possible at all. */
const HAND_W = 27;
const HAND_H = 22;
const POSES: Array<{ l: [number, number]; r: [number, number]; cuffL: number; cuffR: number }> = [
  { l: [50, 64], r: [126, 64], cuffL: 0, cuffR: 0 },  // apart, one on each knee
  { l: [64, 62], r: [112, 62], cuffL: 0, cuffR: 0 },  // coming together
  { l: [76, 62], r: [100, 62], cuffL: 0, cuffR: 0 },  // fingers meeting
  { l: [78, 61], r: [98, 65], cuffL: 0, cuffR: 0 },   // one folded over the other
  { l: [78, 63], r: [98, 61], cuffL: 0, cuffR: 0 },   // a thumb rubbing a thumb
  { l: [72, 62], r: [104, 62], cuffL: 11, cuffR: 0 }, // the sleeve comes down
  { l: [70, 63], r: [106, 62], cuffL: 21, cuffR: 0 }, // and covers the hand
  { l: [56, 65], r: [120, 65], cuffL: 7, cuffR: 0 }   // apart again. still.
];

/**
 * One frame of her video, drawn into `x,y` at `s` device pixels per frame unit.
 * `t` is playback seconds (0 = the poster frame, nothing moving). `graded`
 * tightens the crop the way the preset does — the colour half of the grade is
 * `honestLight` below, applied by the caller OVER this.
 *
 * ⚑ The tighter crop closes on her HANDS, never off the flannel. A crop that
 * removed the flannel would be the piece taking a view on what correction 8
 * wants removed, and the piece does not have one.
 *
 * ⚑ DRAWN AS SILHOUETTES, NOT AS BARS. Two earlier passes built this scene out
 * of axis-aligned rectangles and stripes, and at this resolution every one of
 * them read as ARCHITECTURE — the flannel became a picket fence, the forearms
 * became shelves, and the hands became boxes on a plank. What makes a low-res
 * image read as a body is shape and value, not texture. So her knees are a
 * curve stepped column by column, her forearms are tapering diagonals coming up
 * from the bottom corners, her hands are rounded masses, and the weave is four
 * dashes and a lot of restraint. Everything is warm and low-contrast, with the
 * light falling off toward the edges — the Soft Lo-Fi doctrine, and the reason
 * the graded version lands: the tool's version is the SHARP one.
 *
 * ⚑ AND SHE HAS NO VIGNETTE. Her own frame is evenly, badly lit. The dark
 * closing corners in `honestLight` are the preset's, not hers.
 */
export function drawNoaFrame(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, s: number,
  opts: { t?: number; graded?: boolean } = {}
): void {
  const t = Math.max(0, opts.t ?? 0);
  const zoom = opts.graded ? s * 1.5 : s;
  const VW = NOA_FRAME.w; const VH = NOA_FRAME.h;
  const W = VW * s; const H = VH * s;
  const fine = zoom >= 1;   // the weave, the fingers and the grain drop out of
                            // the thumbnail, which only has to read as the same
                            // shot at half the size
  // the crop closes on the hands (88, 66); ungraded, that is simply the frame
  const ox = x + W / 2 - (opts.graded ? 88 : VW / 2) * zoom;
  const oy = y + H / 2 - (opts.graded ? 66 : VH / 2) * zoom;
  const R = (vx: number, vy: number, vw: number, vh: number, c: string): void => {
    px(ctx, ox + vx * zoom, oy + vy * zoom, vw * zoom, vh * zoom, c);
  };
  /** a soft mass: rows that narrow toward the top and bottom. Nothing in a body
   *  is a rectangle, and at 176×100 a rectangle is the only thing you notice. */
  const blob = (cx: number, cy: number, w: number, h: number, c: string): void => {
    for (let i = 0; i < h; i++) {
      const k = (i + 0.5) / h * 2 - 1;
      const hw = Math.max(1, Math.round(w / 2 * Math.sqrt(Math.max(0, 1 - k * k * 0.62))));
      R(cx - hw, cy - h / 2 + i, hw * 2, 1, c);
    }
  };

  ctx.save();
  ctx.beginPath();
  ctx.rect(Math.round(x), Math.round(y), Math.round(W), Math.round(H));
  ctx.clip();
  /** every edge in this frame is RAGGED by a few units, because a straight line
   *  at this size is a plank and a person's room does not have any. Hashed, not
   *  `v % n` — a modulus of a stepping counter is a sawtooth, and the first pass
   *  of this put a row of perfectly regular teeth along her knees. */
  // `freq` keeps the wobble LOW-frequency: hashing every unit gives a torn,
  // eroded edge that reads as damage, which is not what soft means.
  const jit = (v: number, amp: number, freq = 8): number => {
    let h = (Math.floor(v / freq) * 2654435761) >>> 0;
    h ^= h >>> 15; h = (h * 2246822519) >>> 0; h ^= h >>> 13;
    return (h % (amp * 2 + 1)) - amp;
  };

  // ── the room past her knees. One lamp on, and nothing in focus. ─────────
  R(0, 0, VW, VH, NOA.wall);                // nothing in this frame is unpainted
  R(0, 0, VW, 7, NOA.dark);                 // the ceiling corner, unreached
  blob(30, 18, 76, 30, NOA.glow);           // the lamp's spill on the wall
  blob(30, 17, 34, 15, NOA.glowHot);        // and the small hot centre of it
  R(120, 0, 56, 34, NOA.dark);              // the far corner it never reaches
  R(104, 24, 72, 12, NOA.bed);              // the end of a bed
  R(126, 19, 42, 6, NOA.blanket);           // a corner of the blanket on it
  for (let vx = 0; vx < VW; vx += 2) {      // the floor, well out of focus
    R(vx, 34 + jit(vx, 2), 2, 40, NOA.wallLit); // ⚑ NOT `floor`: that is the
  }                                             // same hex as the lit flannel,
  // and her knees vanished into the carpet. The floor behind her is the DARKEST
  // warm the palette has, so that she is the thing in front of it.

  // ── her lap: two knees, stepped column by column ────────────────────────
  const breath = Math.sin(t * 1.3) > 0 ? 0 : 1;   // she is breathing. That is all.
  /** how much of the screen's light reaches this column — the workstation is right
   *  in front of her, so the middle of the frame is the lit part, and the fall-
   *  off is FOUR ragged steps rather than three clean ones (three read as three
   *  painted panels, which is the opposite of what light does). */
  const GROUND = [NOA.flannelDk, NOA.flannel, NOA.flannelLit];
  // Continuous, then DITHERED IN BOTH AXES. Four hard tiers put three straight
  // vertical seams down her lap; dithering per COLUMN replaced them with
  // corduroy, because a whole column then takes one tone. So the lap is drawn
  // as small blocks and each block decides for itself — which is the only one of
  // the three that looks like light falling on cloth.
  const hash2 = (a: number, b: number): number => {
    let h = ((a * 73856093) ^ (b * 19349663)) >>> 0;
    h ^= h >>> 13; h = (h * 1274126177) >>> 0;
    return (h >>> 8) / 16777216;
  };
  const litAt = (vx: number, vy: number): number => {
    const L = 2 - Math.abs(vx - 88) / 46 - Math.max(0, (vy - 86) / 20);
    const base = Math.floor(L);
    return Math.max(0, Math.min(2, base + (L - base > hash2(vx, vy) ? 1 : 0)));
  };
  const kneeTop = (vx: number): number => {
    const hump = (c: number): number => {
      const d = (vx - c) / 48;
      return d * d >= 1 ? 0 : 17 * (1 - d * d);
    };
    return Math.round(64 - Math.max(hump(48), hump(128))) + breath + jit(vx, 1, 10);
  };
  for (let vx = 0; vx < VW; vx += 2) {
    const top = kneeTop(vx);
    R(vx, top - 3, 2, 3, NOA.flannelDp);        // where the lap meets the room
    for (let vy = top; vy < VH; vy += 6) R(vx, vy, 2, 6, GROUND[litAt(vx, vy)]);
    if (litAt(vx, top) >= 1) R(vx, top, 2, 2, GROUND[2]);  // light along the knee
  }
  // the cloth falling between her knees — a wedge, widening toward the camera
  for (let vy = 54; vy < VH; vy += 2) {
    const w = 4 + Math.round((vy - 54) * 0.2);
    R(88 - w / 2 + jit(vy, 1, 8), vy, w, 2, NOA.flannelDp);
  }
  if (fine) {   // the weave: single threads catching the light, never a check
    let ws = 991;
    const wr = (): number => (ws = (ws * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let i = 0; i < 70; i++) {
      const vx = Math.floor(wr() * VW); const vy = 48 + Math.floor(wr() * (VH - 48));
      if (vy < kneeTop(vx) || litAt(vx, vy) < 2) continue;
      const pale = wr() > 0.72;   // mostly the weave's own shadow; rarely a thread
      R(vx, vy, wr() > 0.5 ? 2 : 1, wr() > 0.5 ? 1 : 2, pale ? NOA.flannelPale : NOA.flannelDk);
    }
  }

  // ── her forearms, coming up from the bottom corners, and her hands ──────
  const pose = POSES[Math.min(POSES.length - 1, Math.floor(t / POSE_HOLD))];
  const arm = (hx: number, hy: number, cuff: number, fromLeft: boolean): void => {
    // the elbow is out of frame below her; the wrist is at the hand. Tapering
    // diagonals, because a horizontal band at this size is a shelf.
    const ex = fromLeft ? -14 : VW + 14; const ey = VH + 12;
    const wx = hx + (fromLeft ? -1 : 1) * (HAND_W / 2 - 3) * -1; // just inside the hand
    const reach = cuff;                       // the sleeve comes further over it
    const x0 = fromLeft ? 0 : Math.round(wx - reach);
    const x1 = fromLeft ? Math.round(wx + reach) : VW;
    for (let vx = x0; vx < x1; vx += 2) {
      const k = Math.min(1, Math.max(0, (vx - ex) / (wx - ex)));
      const cy = ey + (hy + 2 - ey) * k;
      const half = 17 - 4 * k;
      // the arms are DARKER than the lap they lie on, with the screen's light
      // along the top of each — that rim is the only thing that separates a
      // forearm from a knee at this size, and without it they merge into mud.
      R(vx, cy - half, 2, half * 2, NOA.flannelDk);
      R(vx, cy - half, 2, 3, NOA.flannel);
      R(vx, cy - half, 2, 1, NOA.flannelLit);
      R(vx, cy + half - 3, 2, 3, NOA.flannelDp);       // shadow underneath
    }
  };
  const hand = (hx: number, hy: number, fromLeft: boolean): void => {
    const dir = fromLeft ? 1 : -1;
    if (fine) {   // four fingers, folded under toward the other hand — mostly
      for (let f = 0; f < 4; f++) {          // hidden by the palm drawn over them
        const fx = hx + dir * (10 - f * 6);
        blob(fx, hy + 6 + Math.abs(f - 1), 7, 13 - Math.abs(f - 1) * 2, NOA.skin);
        R(fx + dir * 3, hy + 3, 1, 10, NOA.skinLo);
      }
    }
    blob(hx, hy + 3, HAND_W + 1, HAND_H, NOA.skinLo);  // the hand's own shadow
    blob(hx, hy, HAND_W, HAND_H, NOA.skin);
    blob(hx, hy - 5, HAND_W - 8, 9, NOA.skinHi);       // where the screen lights it
    if (fine) {
      blob(hx - dir * (HAND_W / 2 - 3), hy + 1, 9, 12, NOA.skin);   // the thumb
      R(hx - dir * (HAND_W / 2 - 7), hy - 4, 1, 11, NOA.skinLo);
    }
  };
  const [lx, ly] = pose.l; const [rx, ry] = pose.r;
  arm(lx, ly + breath, pose.cuffL, true);
  arm(rx, ry + breath, pose.cuffR, false);
  hand(lx, ly + breath, true);
  hand(rx, ry + breath, false);
  // the sleeve, drawn LAST on the hand it has come down over
  if (pose.cuffL > 0) blob(lx - HAND_W / 2 + pose.cuffL / 2 - 2, ly + breath + 1, pose.cuffL + 4, HAND_H + 6, NOA.flannel);
  if (pose.cuffL > 0) blob(lx - HAND_W / 2 + pose.cuffL / 2 - 2, ly + breath - 5, pose.cuffL, 8, NOA.flannelLit);

  // ── and the grain of a cheap camera in a room with one lamp in it ───────
  if (fine) {
    let seed = 7 + Math.floor(t / POSE_HOLD) * 7919;
    const rnd = (): number => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let i = 0; i < 70; i++) {
      const gy = Math.floor(rnd() * VH);
      R(Math.floor(rnd() * VW), gy, 1, 1,
        gy < 40 ? NOA.dark : rnd() > 0.5 ? NOA.flannelDp : NOA.wallLit);
    }
  }
  ctx.restore();
}

/**
 * ⚑ THE PRESET, applied — the colour half of correction 13.
 *
 * Three moves, and each one is a line of the documented codebook's PHASE 1
 * (`REINTERP_E3_REVAMP_BRIEF_2026-07-30.md` rev 3): *"cool/blue desaturation,
 * low-key harsh light, tight claustrophobic framing, shadows."* The framing is
 * `drawNoaFrame`'s crop; the other three are here.
 *
 * Phase 1 of that codebook is titled **pre-conversion "sickness"**. So the
 * preset does not comment on her, argue with her, or take any view of her at
 * all — it makes her look like a BEFORE, which is the only thing it knows how
 * to do. It has no opinion on anything corrections 8 and 9 disagree about, and
 * it must never acquire one.
 *
 * Non-destructive, like `warmGrade`: the frame is GRADED, never redrawn.
 */
export function honestLight(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  ctx.clip();
  // 1 · the colour comes out of her
  ctx.globalCompositeOperation = 'saturation';
  ctx.globalAlpha = 0.62;
  ctx.fillStyle = ERA3.grey;
  ctx.fillRect(x, y, w, h);
  // 2 · and the room goes cold — the era's own desktop blue, nothing invented
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.58;
  ctx.fillStyle = ERA3.deskMid;
  ctx.fillRect(x, y, w, h);
  // 3 · low-key: the light is pulled off the edges in six stepped rings, so the
  //     only thing left lit is the middle of her. Stepped, not a gradient —
  //     pixel discipline holds inside the picture too.
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = ERA3.taskBot;
  for (let i = 0; i < 6; i++) {
    ctx.globalAlpha = 0.09;
    const in0 = i * 3;
    ctx.fillRect(x + in0, y + in0, w - in0 * 2, 3);
    ctx.fillRect(x + in0, y + h - in0 - 3, w - in0 * 2, 3);
    ctx.fillRect(x + in0, y + in0, 3, h - in0 * 2);
    ctx.fillRect(x + w - in0 - 3, y + in0, 3, h - in0 * 2);
  }
  ctx.restore();
}

/**
 * ⚑ FLOPPYSHEEP (Session 70) — the mascot game on Vera's phone, and the only
 * app on it.
 *
 * Sérgio asked for it by name. It is `operable` and it is NOT respite: E3 has
 * no respite, and this does not quietly reintroduce one. It is the apparatus's
 * own cheerful product — the same publisher's lamb, still shipping delight
 * while the serious arm of the brand has become a workflow. The joke is on the
 * apparatus, never on the person holding the phone.
 *
 * So the palette is the one thing in this era allowed to be simply NICE: a
 * bright morning, a green field, a white sheep. Every value is lifted verbatim
 * from `data/room/era1.json` (the piece's own approved domestic palette, per
 * `data/room/cluster.json`'s COLOR LAW) or from `ERA3` above — nothing here is
 * invented, including the sky, which is the era's own desktop accent.
 */
export const FLOPPY = {
  sky: ERA3.accentHi,      // the era's own aero highlight, used as a morning
  skyLow: '#cfe0f2',       // the paler band at the horizon (also this file's capBtn face)
  cloud: ERA3.white,
  sun: '#FFD24C',          // era1 lamp warm
  hillFar: '#9FD8CB',      // era1 — the hills behind the field
  hill: '#A8B49A',         // era1 — the field itself
  hillDk: '#9A9486',       // era1 — its shadowed rows
  earth: '#8A5A3B',        // era1 deskTop — the ground under the grass
  fence: '#B89B7E',        // era1 — old wood in sunlight
  fenceDk: '#74492F',      // era1 deskLeg — its shadow side
  wool: ERA3.white,
  woolShade: '#E2CFBA',    // era1 — the underside of the fleece
  face: '#3A3A44',         // era1 — the sheep's face and ears
  leg: '#44464F',          // era1 — four legs, mid-cycle
  ink: ERA3.ink
} as const;

/** Sunken white field with an optional single line of text. */
export function field(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, text: string, color: string = ERA3.ink
): void {
  px(ctx, x, y, w, h, ERA3.field);
  px(ctx, x, y, w, 1, ERA3.fieldEdge);
  px(ctx, x, y, 1, h, ERA3.fieldEdge);
  px(ctx, x, y + h - 1, w, 1, ERA3.glassHi);
  px(ctx, x + w - 1, y, 1, h, ERA3.glassHi);
  if (text) {
    setFont(ctx, 11);
    ctx.fillStyle = color;
    ctx.fillText(text, x + 6, y + Math.round((h - 11) / 2));
  }
}

/**
 * ⚑ S154 — THE MEMBER'S FIGURE (I-01). An invented person-diagram in the genre
 * the 2010s made familiar — one outline of a body with several labelled lines
 * drawn to it — as a member posted it, and as the house redraws it. `lines`
 * are her four labels (attraction · identity · expression · body), each with
 * its own mark on the body: the heart, the head, the clothes, the whole
 * outline. `house` draws the platform's version instead: the same outline,
 * one line, one label. Nothing here comments on either; the two are what the
 * card shows and the correction chooses between. Rose for hers (a real person
 * speaking), the tool's blue for the house's. `s` is device px per unit; the
 * figure with its label column is 140 × 100 units.
 */
export const MEMBER_FIGURE = { w: 140, h: 100 } as const;   // the body and its label column
export function drawMemberFigure(
  ctx: CanvasRenderingContext2D, x: number, y: number, s: number,
  opts: { lines: string[]; house: boolean; houseLine: string }
): void {
  const P = (ux: number, uy: number, uw: number, uh: number, c: string): void =>
    px(ctx, x + ux * s, y + uy * s, Math.max(1, uw * s), Math.max(1, uh * s), c);
  const body = opts.house ? ERA3.lambTag : ERA3.rose;
  const bx = 30;   // the outline's left edge
  // the outline: head, neck, torso, arms, legs — a gingerbread silhouette in bands
  P(bx + 10, 4, 12, 12, body);          // head
  P(bx + 14, 16, 4, 3, body);           // neck
  P(bx + 4, 19, 24, 26, body);          // torso
  P(bx - 4, 21, 8, 16, body);           // arms
  P(bx + 28, 21, 8, 16, body);
  P(bx + 6, 45, 8, 24, body);           // legs
  P(bx + 18, 45, 8, 24, body);
  // the face, in the band colour's own light
  P(bx + 13, 8, 2, 2, ERA3.white); P(bx + 17, 8, 2, 2, ERA3.white);
  P(bx + 14, 12, 4, 1, ERA3.white);
  setFont(ctx, Math.max(6, Math.round(7 * s)));
  if (opts.house) {
    // one line, down the whole figure, one label — the house's picture
    P(bx + 15, 2, 1, 70, ERA3.white);
    P(bx + 15, 2, 1, 70, ERA3.glassEdge);
    P(bx + 34, 36, 14, 1, ERA3.lambTag);
    ctx.fillStyle = ERA3.lambTag;
    ctx.fillText(opts.houseLine, x + (bx + 50) * s, y + 32 * s);
    return;
  }
  // her four lines: each mark on the body, a leader to the right, her word
  const marks: [number, number, string][] = [
    [bx + 12, 28, opts.lines[0] ?? ''],   // the heart — attraction
    [bx + 16, 10, opts.lines[1] ?? ''],   // the head — identity
    [bx + 30, 30, opts.lines[2] ?? ''],   // the sleeve — expression
    [bx + 22, 56, opts.lines[3] ?? '']    // the leg — body
  ];
  marks.forEach(([mx, my, word], i) => {
    P(mx - 1, my - 1, 3, 3, ERA3.white);
    const ly = 8 + i * 22;
    P(mx + 2, my, 40 - (mx - bx) + 8, 1, ERA3.rose);         // out to the margin
    P(bx + 48, Math.min(my, ly), 1, Math.abs(ly - my) + 1, ERA3.rose);
    P(bx + 48, ly, 6, 1, ERA3.rose);
    ctx.fillStyle = ERA3.rose;
    ctx.fillText(word, x + (bx + 56) * s, y + (ly - 3) * s);
  });
}
