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

/** Desktop canvas logical resolution for eras 1–2 (v0.2 §2.2). */
export const ERA1_CANVAS = { width: 512, height: 288 } as const;
