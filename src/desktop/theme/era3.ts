/**
 * Session 37 (E3-i, the three-screen room foundation): PORTED VERBATIM from
 * the shipped (non-reinterp) build's `src/desktop/theme/era3.ts` — this is
 * the officially authored Era-3 palette, not an invented one (CLAUDE.md's
 * "import era palettes from src/desktop/theme/, never invent colors" is
 * satisfied by porting the era's own theme file, the same way era1/era2's
 * palettes were established). Used this session by `src/room/era3Devices.ts`
 * for the laptop's SisterSignal login/desktop shell only — GraceQueue itself
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
  // dark screen in a bright era: the laptop is glass and daylight, and this
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
  // tray well + clock
  setFont(ctx, 11);
  const cw = ctx.measureText(clock).width + 16;
  px(ctx, W - cw - 6, ty + 4, cw, bh - 8, ERA3.tray);
  px(ctx, W - cw - 6, ty + 4, cw, 1, '#0a1c30');
  ctx.fillStyle = ERA3.white;
  ctx.fillText(clock, W - cw + 2, ty + 9);
}

export interface AeroContent { x: number; y: number; w: number; h: number; closeBox: { x: number; y: number; w: number; h: number } }

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
  capBtn(ctx, x + w - 18, by, bs, ERA3.bury, ERA3.rose, 'x');
  capBtn(ctx, x + w - 36, by, bs, '#cfe0f2', ERA3.glassHi, '□');
  capBtn(ctx, x + w - 54, by, bs, '#cfe0f2', ERA3.glassHi, '_');
  const cb = { x: x + w - 18, y: by, w: bs, h: bs };
  return { x: x + 5, y: y + barH + 5, w: w - 10, h: h - barH - 10, closeBox: cb };
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
 * ⚑ THE LIFT, screen side (Session 64) — the laptop's grade warms while the
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
