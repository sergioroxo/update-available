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
