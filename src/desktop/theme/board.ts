/**
 * THE CORK BOARD — the warm side's material palette (O1, the pre-fiction
 * opening surface). LAW: import these, never invent colors (CLAUDE.md).
 *
 * Extracted from `src/desktop/opening.ts`, where 55 colors had accumulated at
 * their call sites. Every value here is EXACTLY what that file already drew —
 * this is a naming pass, not a repaint. Nothing on screen changed.
 *
 * Why these deserve names rather than a palette of 16 like ERA1: the board is
 * an ILLUSTRATION, not a UI chrome. Its colors are materials — cork, pine
 * frame, sun-bleached paper, post-it, pin, photo emulsion — and naming them as
 * materials is what stops the next scrap from being invented ad hoc.
 *
 * The board is load-bearing narratively: R26 §B1's witness lineage is warm cork
 * you pin yourself to → the cold filed record. The cold-side rendering of these
 * same materials lives in `./witness.ts`; see the drift note there.
 */

/** The board itself: cork field, and the pine frame around it. */
export const BOARD = {
  cork: '#9b6a3d',
  corkMid: '#b9824d',
  corkLow: '#8b5931',
  corkDark: '#684021', // section rules
  frame: '#6f4323',
  frameLit: '#8b5a32', // top/left — the light falls from upper-left
  frameShade: '#4e2d17' // right/bottom
} as const;

/** Paper stock pinned to it, warm and variously aged. */
export const PAPER = {
  fresh: '#eee3c5',
  warm: '#f5edda',
  old: '#d7c196',
  band: '#e7d1a6', // the controls strip
  clipping: '#e7dcc5',
  polaroid: '#eee9db'
} as const;

/** Handwriting and print, darkest to faintest. */
export const INK = {
  black: '#161616',
  deep: '#24170f',
  sheet: '#1f170e',
  body: '#1e1710',
  logo: '#2b1c13',
  scribble: '#4b3424', // the margin notes, in a human hand
  muted: '#7a726a',
  onDark: '#f3ead2' // the one scrap that is charcoal, so its text inverts
} as const;

/** The orange accent — the piece's one warm signal on this surface. */
export const ACCENT = {
  orange: '#f59b23', // CONTINUE, once armed
  orangeDim: '#a9540f',
  orangeEdge: '#b15f16'
} as const;

/** Post-it stock for the start-up option buttons. */
export const POSTIT = {
  yellow: '#f2d36b', // the selected one
  blue: '#99c2cf',
  green: '#a8c58b' // Leave — always available, never styled as a warning
} as const;

/** Pin heads. Colour carries no meaning here; the variety is the point. */
export const PIN = {
  red: '#d9342d',
  blue: '#315db5',
  gold: '#d2b329',
  crimson: '#b5312a',
  green: '#2f9c51'
} as const;

/** Scrap stock — the board's accumulated debris, one colour per scrap. */
export const SCRAP = {
  lilac: '#d8c5df',
  oat: '#d9cf9b',
  charcoal: '#202020',
  mint: '#b9d7a0',
  gold: '#efcf4a',
  ticket: '#ead6a4',
  ticketOld: '#dfc68e',
  tape: '#d0b5d5',
  tapeOld: '#c8b186'
} as const;

/**
 * Polaroid emulsion: four [top, bottom] gradient pairs, and the figures inside.
 * Deliberately unreadable as faces — soft-lo-fi doctrine, and these are people
 * who are not the system's to render sharply.
 */
export const PHOTO = {
  moods: [
    ['#8e6c38', '#d8ab63'],
    ['#533f48', '#bd9c7a'],
    ['#e7d7bd', '#8ca0a3'],
    ['#d7d0b6', '#b8816d']
  ],
  skinA: '#f0d0b2',
  skinB: '#e6c3a1',
  figureA: '#604735',
  figureB: '#875b62'
} as const;

/** CONTINUE before it arms (the 4s ethics delay) — present but visibly inert. */
export const DISARMED = { body: '#9c8560', text: '#3e3326' } as const;
