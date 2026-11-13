/**
 * ERA 1 palette (~1995–99) — 16 colors. LAW: import these, never invent
 * colors (CLAUDE.md). Matches assets/palettes/era1.gpl for Aseprite.
 */
export const ERA1 = {
  black: '#000000',
  white: '#ffffff',
  silver: '#c0c0c0',
  grey: '#808080',
  greyDark: '#404040',
  beige: '#d4d0c8', // window chrome
  paper: '#f5f4ed',
  teal: '#008080', // desktop
  tealDark: '#004040',
  navy: '#000080', // title bars
  titleBlue: '#1084d0',
  tooltip: '#ffffcc',
  warnDark: '#800000',
  warn: '#c42020', // the flicker — use sparingly, it is a narrative event
  ok: '#008000',
  olive: '#808000'
} as const;

/** Desktop canvas logical resolution for eras 1–2 — 4:3, a 1997 CRT. */
export const ERA1_CANVAS = { width: 512, height: 384 } as const;

/**
 * Backing-store multiplier: layout math stays logical (512×288) but the
 * canvas renders at ×3 (1536×864) so text is legible in VR. Pixel-art
 * sprites still land on the logical grid; only glyph rendering gains detail.
 */
export const RENDER_SCALE = 3;

/**
 * ⚑ S378 — DANIEL'S MACHINE'S OWN PLASTIC, for drawing the machine in 2D (the Close's computer panel,
 * src/room/machinePanel.ts, retired S380; the CRT itself is src/room/closeCrt.ts). Not new colours: the CRT's case, its recess and its power button exactly as the room
 * builds them (data/room/era1.json crtBody / crtNeck / crtPowerButton / keyboard), so the panel and the 3D machine are
 * the same beige. The green light is the palette's own `ok`.
 */
export const CRT_PLASTIC = {
  body: '#D8CDB4',    // crtBody, the bezels, the foot
  light: '#F5F4ED',   // the case's top edge catching the light — ERA1.paper
  shade: '#CFC4AA',   // crtNeck: the recess round the glass, the case's foot in shadow
  dark: '#B5A98C',    // crtPowerButton: the inner step, the badge's emboss
  key: '#C9BFA6'      // keyboard
} as const;
