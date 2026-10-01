/**
 * ⚑ S177 / R4-27 — THE CALENDAR PAGES' INKS. Sérgio, 2026-09-26 (D1): "We should
 * break that rule of the flat colours, no texture. Make the pixel art good." A
 * calendar page is a PRINTED surface: the one room object that carries a picture,
 * drawn as pixel art at its native size and shown through FILTER_NEAREST, like a
 * screen. These are its paper and inks, one set per era — kept here, with the other
 * era palettes, so src/room/calendarPage.ts never writes a literal (check-spec C4).
 *
 * What each page is (his D4, "Amazing, love it"): 1997 a teenager's band calendar
 * with one week written in by his mother; 2003 Restorify's promotional calendar, the
 * days crossed off in his marker; 2016 the platform's work planner on December, the
 * 13th ringed; 2026 a queer bookshop's gift calendar with one night marked in her hand.
 */

/** shared by every page: the printed furniture of a month grid */
export interface CalendarInks {
  paper: string; rule: string; ink: string; weekend: string; head: string; hole: string;
}

export const CAL_1997 = {
  paper: '#fbf7ee', rule: '#d9d0bf', ink: '#2b2622', weekend: '#c23b3b', head: '#2b2622', hole: '#5c5246',
  // the picture: a band under the lights
  night: '#1b1033', dusk: '#34164f', haze: '#5c1f66', glow: '#8a2c78',
  title: '#ff5fa2', titleShadow: '#12091f', spark: '#fff4d6',
  beamA: '#f7d774', beamB: '#7fe0ff', beamC: '#ff9ad5',
  stage: '#3a2418', stageTop: '#7a4f36', stageFront: '#22140d',
  speaker: '#140c1c', cone: '#4b4458', figure: '#0f0816', rim: '#e0a8d8',
  guitar: '#d94f3c', neck: '#caa46a', bass: '#3a7bd5', drumHead: '#d9d2e6', drumShell: '#7a2a5e', cymbal: '#e8c75a',
  // his mother's ballpoint
  mother: '#2446a8'
} as const;

export const CAL_2003 = {
  paper: '#f8f8f4', rule: '#d3d6dc', ink: '#23262d', weekend: '#5d7394', head: '#1084d0', hole: '#5a5e66',
  // the picture: Restorify's sunrise, and the lamb
  skyTop: '#7fb2e0', skyMid: '#a8cbe8', skyLow: '#f6d3a8', skyHorizon: '#ffe79a',
  sun: '#ffd54a', sunCore: '#fff2b0', ray: '#fff0b8',
  hillBack: '#9ccc65', hillBackShade: '#86b957', hillFront: '#6fae4a', hillFrontShade: '#5a9a3c',
  brand: '#1084d0', brandShadow: '#ffffff', tagline: '#000080',
  wool: '#f7f7f2', woolShade: '#c9c9c0', lambFace: '#2a2a2a',
  // his marker
  marker: '#d42a2a'
} as const;

export const CAL_2016 = {
  paper: '#f4f4f2', rule: '#cfd3d8', ink: '#2c3138', weekend: '#6b7a8c', head: '#2e3a4a', hole: '#5b6068',
  // the planner's header, and its stock photograph of winter
  band: '#2e3a4a', bandText: '#ffffff', bandAccent: '#6fb3b8',
  frame: '#ffffff', frameShadow: '#b9bec5',
  sky: '#cfd8e3', skyHigh: '#b7c4d4', snow: '#f4f6f8', snowShade: '#c5d0dc',
  pine: '#2f4f3e', pineDark: '#223a2e', trunk: '#4a3a30', flake: '#ffffff',
  // her biro, and the platform's sticky note
  pen: '#c0392b', note: '#f7e27a', noteShade: '#e0c95c', noteInk: '#3a3a3a'
} as const;

export const CAL_2026 = {
  paper: '#f6efe2', rule: '#d8ccb4', ink: '#2e2a33', weekend: '#7b5ea7', head: '#2e2a33', hole: '#5e5648',
  // the picture: the shop's party — bunting, lights, people dancing
  night: '#1d2b3a', evening: '#28324c', warm: '#3a3456',
  floor: '#5a3b2e', floorTop: '#7a5440', string: '#12161f', bulb: '#ffd27a', bulbGlow: '#b98a4a',
  flagRed: '#e0564f', flagOrange: '#f0a04b', flagYellow: '#f4d35e', flagGreen: '#5fb36b',
  flagBlue: '#4f86d9', flagViolet: '#8f63c9', transBlue: '#5bcefa', transPink: '#f5a9b8', transWhite: '#ffffff',
  skinA: '#f1c9a5', skinB: '#c68642', skinC: '#8d5524', skinD: '#e0ac69',
  hairA: '#2b1d14', hairB: '#d6a05a', hairC: '#7a3b8f', hairD: '#1a1a1a',
  shirtA: '#e0564f', shirtB: '#5fb36b', shirtC: '#f4d35e', shirtD: '#5bcefa',
  legs: '#2a2f45', chair: '#9aa3b5', spineA: '#b5523b', spineB: '#3f7f8c', spineC: '#d1a13f', shelf: '#4a2f24',
  // her felt-tip
  felt: '#8e44ad'
} as const;

/**
 * ⚑ S179 / R5-02 — THE WALLS' PRINTS (src/room/printArt.ts). Sérgio, 2026-09-27: the posters
 * should "reflect the culture of SOGICE — like movie posters for SOGICE movies, religious
 * elements, secular marches… stuff that helps set the tone of the time"; the 2016 one "more
 * related to X-out-Loud, they even have music videos". Every title below is an invented
 * mark (CLAUDE.md); the genres are documented, the names are ours.
 */
export const PRINT = {
  // 1997 · the camp's rally poster
  rallyNight: '#10204a', rallyDawn: '#e8834a', rallyGlow: '#f7c46a', rallyHill: '#1c2b24', rallyCross: '#fff4d6',
  rallyTitle: '#ffffff', rallyAccent: '#f4d35e', rallyCrowd: '#0b1322',
  // 1997 · the Christian rock band
  bandBg: '#2f4a2a', bandBgHi: '#5a7a3a', bandInk: '#f0a04b', bandPale: '#f5ecd2', bandDark: '#161a12', bandDove: '#ffffff',
  // 2003 · the testimony film
  filmSky: '#1a2236', filmDawn: '#f2a65a', filmSun: '#ffe08a', filmRoad: '#3a3a44', filmRoadLit: '#c9a36a',
  filmField: '#2a3a2a', filmFieldLit: '#6a7a3a', filmMan: '#0c0c12', filmTitle: '#f5f0e0', filmCredit: '#8a8aa0',
  // 2003 · the restored-family conference
  confBg: '#f4efe4', confBlue: '#1f4d9a', confGold: '#d4a13f', confRed: '#b8413a', confInk: '#23262d',
  // 2016 · the testimony tour (music video)
  tourA: '#f7c6d6', tourB: '#c9b6f0', tourC: '#9fd8e8', tourSpot: '#fff6e0', tourSinger: '#2a2238', tourTitle: '#2a2238',
  tourPlay: '#ffffff', tourPlayBg: '#e0567a',
  tourDark: '#1c1428', tourGrain: '#3a2c48', tourHands: '#0e0a16', tourBarBg: '#5a4a66', tourHaze: '#8a6a9a',
  // 2016 · the women's retreat sign
  retreatBg: '#f6efe6', retreatRose: '#d98a9a', retreatLeaf: '#8fb08a', retreatInk: '#5a4a5a',
  // 2016 · the march flyer
  marchBg: '#ffffff', marchBlue: '#2b5fae', marchPink: '#e27a9a', marchInk: '#1d2330', marchSky: '#dfe9f5',
  // 2026 · the Commons ball poster
  ballBg: '#1d1830', ballGlow: '#3a2a5c', ballGold: '#f4c95d', ballPink: '#f5a9b8', ballBlue: '#5bcefa', ballWhite: '#ffffff',
  ballFigure: '#f1c9a5', ballInk: '#fff4d6',
  // S181 · the institution's labels: a drawer card, a luggage tag in his mother's hand
  cardStock: '#efe9d6', cardInk: '#23232f', tagStock: '#e8dcc0', tagString: '#8a6a4a', motherInk: '#2446a8',
  // Phase 7 · the Release Work sheet (1997) — ERA1's own paper, navy, greys and dark red, re-used
  relPaper: '#f5f4ed', relNavy: '#000080', relInk: '#404040', relGrey: '#808080', relPillow: '#d4d0c8',
  relWhite: '#ffffff', relRed: '#800000'
} as const;

/** ⚑ S205 — 2003's testimony footage: a church hall on a camcorder — warm walls, a navy banner, two people
 *  (faceless, as every body in the piece), the camera's own overlays */
export const FOOTAGE = {
  wall: '#c9b48e', wallHi: '#d8c6a2', floor: '#7a5a3e', floorHi: '#8d6a4a', banner: '#22305e', bannerInk: '#e8c96a',
  chair: '#5a4632', stand: '#3a3a40', softbox: '#f2eee2', skin: '#d9a77f', skin2: '#b9835c', hair: '#2e2420',
  danielShirt: '#5f7fa8', danielTrousers: '#34363e', calebJacket: '#5d7a4e', calebTrousers: '#2c2e34',
  rec: '#d23a2a', osd: '#f4f2ea', scan: '#000000', black: '#0a0a0c', sub: '#ffffff', subWho: '#e8c96a'
} as const;

/** ⚑ S204 — the Close's printout: continuous tractor-feed paper, green-bar, from a dot-matrix printer */
export const PRINTOUT = {
  paper: '#f7f5ec', bar: '#dcebd8', hole: '#101014', perf: '#c9c6ba', ink: '#26262c', inkDim: '#5a5a62',
  failed: '#8a1c1c', body: '#d4d0c8', bodyDark: '#8a877f', slot: '#2a2a2e', led: '#3a9a3a'
} as const;

/**
 * ⚑ S186 — yes.gif, the image MentorRob sends Daniel over DCC in 1997 (src/desktop/apps/yesPoster.ts).
 * Its grammar is the documented one of the mid-90s ex-gay print advertising Sérgio found (a crowd of
 * smiling people, arms raised, before a waterfall; "YES!"; a verse; a PO box — his 1996 image,
 * docs/reinterp/SOURCES_1997_WEB_2026-09-27.md); every mark on it is invented.
 */
export const YES_POSTER = {
  sky: '#a9cdea', skyHigh: '#d6eaf8', water: '#f4f9ff', waterShade: '#bcd6ee', mist: '#e6f1fb',
  rock: '#46614f', rockDark: '#2a3e31', moss: '#6f8f58',
  title: '#1d3c86', yes: '#ffffff', yesEdge: '#1d3c86', yesShade: '#8fb6e0',
  verse: '#14203e', band: '#1d3c86', bandInk: '#ffffff', bandDim: '#a9cdea',
  hair: '#2a1e16',
  shirts: ['#e05a4a', '#f2c14e', '#5aa0d8', '#ffffff', '#7a5ac8', '#4aa86a', '#f08aa8'],
  skins: ['#f1c9a5', '#c58c5c', '#8a5a3a', '#e8b890']
} as const;

/** ⚑ S188 — Daniel's 1997 handheld (src/room/handheld.ts): the classic grey body is the prop's own colour;
 *  these are its face — the bezel, the lit screen's four greens, the magenta A/B, the dark d-pad. */
export const HANDHELD = {
  bezel: '#4a4a58', dpad: '#23232b', button: '#a8235d',
  screenLight: '#c4cf6e', screenMid: '#8a9a4a', screenDark: '#2f3d23'
} as const;

/** ⚑ S189 — REACH, on Daniel's 2003 phone: the phone's grey-blue LCD, the snake's greys, the symbols' colours */
export const REACH = {
  lcd: '#9fb3bd', lcdDark: '#1f2c33', lcdMid: '#5e7482',
  snakeHead: '#2a3136', snakeFrom: '#6d7479', snakeTo: '#2a2d30',
  pink: '#f08aa8', blue: '#5bcefa', white: '#ffffff', red: '#e0454f', orange: '#f29a3b', yellow: '#f2d94e',
  green: '#4aa86a', violet: '#8a5ac8',
  halo: '#f2d06b', lattice: '#8ea2ad', frame: '#3a4b55', wool: '#ffffff', woolShade: '#d6dde2'
} as const;

/** ⚑ S189 — TIDY (2026), on Maya's console: the cosy genre's pastels (the disguise), and the cards' dark */
export const TIDY = {
  bg: '#f6efe6', shelf: '#d9c3a5', slot: '#c9b08c', ink: '#3a3040', dim: '#9a8a78', accent: '#e8a0b4', glow: '#f2d06b',
  box: '#b89a7a', boxDark: '#8a6e52', floor: '#e9dccb', cardBg: '#1c1a24', cardInk: '#f6efe6', cardDim: '#9a93a8',
  mug: '#6fa8d8', book: '#c0504d', plant: '#5aa06a', clock: '#e0b050', lamp: '#f2c879', frame: '#a07a5a',
  pen: '#2a4a8a', notebook: '#8a5ac8', phones: '#303038', charger: '#e8e8e8', cup: '#d87a5a',
  binder: '#3a3a48', pinBlue: '#5bcefa', pinPink: '#f5a9b8', pinWhite: '#ffffff', letter: '#ffffff', rx: '#f0f0f0', rxCap: '#5b8fd8'
} as const;
