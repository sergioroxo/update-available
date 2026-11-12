/**
 * ⚑ S291 — THE SITE VIEWER'S SKINS. One per year (1997 GeoCities home page, 2003 portal, 2016 flat platform, 2026 app)
 * plus the hub. Every colour is a token imported from src/desktop/theme/* — the same tokens, name for name, that
 * tools/gen_era_sites.mjs reads for the HTML pages (docs/reinterp/ERA_SITES_2026-11-01.md lists them), so the page and
 * the window in the piece wear the same year. Nothing is invented here. Text contrast was checked 4.5:1 by the
 * generator for these pairs; the window chrome (title bars, buttons) is the period OS's own, from ERA1/ERA3/ERA4.
 */
import { ERA1 } from '../../desktop/theme/era1';
import { WEB97, WEB2003 } from '../../desktop/theme/web1997';
import { ERA3 } from '../../desktop/theme/era3';
import { ERA4, PLACE, WALL } from '../../desktop/theme/era4';
import { DIALOG } from '../../desktop/theme/chrome';

export type Year = '1997' | '2003' | '2016' | '2026';
export type View = Year | 'hub';
export type Os = 'w95' | 'xp' | 'aero' | 'app';
export type Status = 'documentary' | 'contested' | 'speculative';

export interface Skin {
  view: View;
  os: Os;
  /** body / headings / mono / serif-or-not faces (system stacks only: no font is ever fetched) */
  font: string; mono: string; headFont: string;
  pageBg: string; contentBg: string;
  ink: string; dim: string; link: string; h: string; rule: string;
  card: string; cardEdge: string; noteBg: string; noteBar: string;
  tag: Record<Status, [string, string]>;
  /** the OS window around the site */
  chrome: { frame: string; frameHi: string; frameLo: string; titleA: string; titleB: string; titleInk: string; bar: string; barInk: string; btn: string; btnInk: string; close: string; closeInk: string; sel: string; selInk: string };
  /** window title: used by the title bar */
  accent: string;
}

const SANS_95 = 'Verdana, Geneva, "DejaVu Sans", Arial, sans-serif';
const SANS_03 = 'Tahoma, Verdana, "DejaVu Sans", Arial, sans-serif';
const SANS_16 = '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const SANS_26 = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
const MONO = '"Courier New", Menlo, Consolas, monospace';

const w95 = {
  frame: DIALOG.panel, frameHi: DIALOG.light, frameLo: DIALOG.darker, titleA: DIALOG.titleBar, titleB: DIALOG.titleBar, titleInk: DIALOG.titleInk,
  bar: DIALOG.panel, barInk: DIALOG.ink, btn: DIALOG.panel, btnInk: DIALOG.ink, close: DIALOG.panel, closeInk: DIALOG.ink, sel: DIALOG.titleBar, selInk: DIALOG.titleInk
};

export const SKINS: Record<View, Skin> = {
  '1997': {
    view: '1997', os: 'w95', font: SANS_95, mono: MONO, headFont: 'Georgia, "Times New Roman", Times, serif',
    pageBg: WEB97.page, contentBg: WEB97.searchBg, ink: WEB97.text, dim: WEB97.dim, link: WEB97.link, h: WEB97.heading, rule: WEB97.rule,
    card: WEB97.searchBg, cardEdge: WEB97.rule, noteBg: WEB97.page, noteBar: WEB97.heading,
    tag: { documentary: [ERA1.ok, ERA1.white], contested: [ERA1.olive, ERA1.black], speculative: [ERA1.navy, ERA1.white] },
    chrome: w95, accent: WEB97.engine
  },
  '2003': {
    view: '2003', os: 'xp', font: SANS_03, mono: MONO, headFont: SANS_03,
    pageBg: WEB2003.page, contentBg: WEB2003.white, ink: WEB2003.text, dim: WEB2003.dim, link: WEB2003.link, h: WEB2003.panelHead, rule: WEB2003.postHead,
    card: WEB2003.white, cardEdge: WEB2003.postHead, noteBg: WEB2003.pending, noteBar: WEB2003.panelHead,
    tag: { documentary: [WEB2003.check, WEB2003.white], contested: [WEB2003.filled, WEB2003.white], speculative: [WEB2003.praying, WEB2003.white] },
    chrome: {
      frame: ERA1.titleBlue, frameHi: ERA1.titleBlue, frameLo: ERA1.navy, titleA: ERA1.titleBlue, titleB: ERA1.navy, titleInk: ERA1.white,
      bar: ERA1.beige, barInk: ERA1.black, btn: ERA1.titleBlue, btnInk: ERA1.white, close: ERA1.warn, closeInk: ERA1.white, sel: ERA1.titleBlue, selInk: ERA1.white
    },
    accent: ERA1.titleBlue
  },
  '2016': {
    view: '2016', os: 'aero', font: SANS_16, mono: MONO, headFont: SANS_16,
    pageBg: ERA3.glass, contentBg: ERA3.white, ink: ERA3.ink, dim: ERA3.greyDk, link: ERA3.deskLow, h: ERA3.titleText, rule: ERA3.glassEdge,
    card: ERA3.white, cardEdge: ERA3.glassEdge, noteBg: ERA3.lambBand, noteBar: ERA3.lambTag,
    tag: { documentary: [ERA3.good, ERA3.ink], contested: [ERA3.amber, ERA3.ink], speculative: [ERA3.bury, ERA3.white] },
    chrome: {
      frame: ERA3.frame, frameHi: ERA3.glassHi, frameLo: ERA3.deskLow, titleA: ERA3.titleA, titleB: ERA3.titleB, titleInk: ERA3.titleText,
      bar: ERA3.glass, barInk: ERA3.ink, btn: ERA3.glassHi, btnInk: ERA3.titleText, close: ERA3.bury, closeInk: ERA3.white, sel: ERA3.accent, selInk: ERA3.white
    },
    accent: ERA3.accent
  },
  '2026': {
    view: '2026', os: 'app', font: SANS_26, mono: MONO, headFont: SANS_26,
    pageBg: ERA4.field, contentBg: ERA4.field, ink: ERA4.text, dim: ERA4.text, link: ERA4.l, h: ERA4.textHi, rule: ERA4.panelEdge,
    card: ERA4.panel, cardEdge: ERA4.panelEdge, noteBg: ERA4.panel, noteBar: WALL.accent,
    tag: { documentary: [ERA4.l, ERA4.field], contested: [WALL.accent, ERA4.field], speculative: [ERA4.photoSky, ERA4.field] },
    chrome: {
      frame: ERA4.panelEdge, frameHi: ERA4.ruleHi, frameLo: ERA4.rule, titleA: ERA4.panel, titleB: ERA4.panelHi, titleInk: ERA4.text,
      bar: ERA4.panel, barInk: ERA4.text, btn: ERA4.panelHi, btnInk: ERA4.textHi, close: ERA4.panelHi, closeInk: ERA4.textHi, sel: ERA4.l, selInk: ERA4.field
    },
    accent: ERA4.l
  },
  hub: {
    view: 'hub', os: 'w95', font: SANS_16, mono: MONO, headFont: SANS_16,
    pageBg: PLACE.wallHi, contentBg: PLACE.wallHi, ink: PLACE.ink, dim: PLACE.ink, link: WALL.price, h: PLACE.ink, rule: PLACE.wallLo,
    card: WALL.cardHi, cardEdge: PLACE.wallLo, noteBg: WALL.cardHi, noteBar: WALL.accent,
    tag: { documentary: [ERA1.ok, ERA1.white], contested: [ERA1.olive, ERA1.black], speculative: [ERA1.navy, ERA1.white] },
    chrome: w95, accent: WALL.accent
  }
};

/** the four doors on the hub, each in its year's own colour (the same four the hub page uses) */
export const DOORS: Record<Year, [string, string]> = {
  '1997': [ERA1.teal, ERA1.white],
  '2003': [WEB2003.banner, ERA1.white],
  '2016': [ERA3.deskMid, ERA1.white],
  '2026': [ERA4.field, ERA4.textHi]
};

/** ⚑ S371 — a film's screen in the window, the same in every year (a player is black whatever the page around it):
 *  the picture's surround, its words and controls, the progress line's track */
export const FILM = { screen: ERA1.black, ink: ERA1.white, track: ERA1.greyDark } as const;

/** extra tokens the site headers use (all from the themes) */
export const HEAD = {
  y1997: { tile: WEB97.counterBg, shade: WEB97.headingShade, stripe: WEB97.construction, stripeInk: ERA1.black, ring: WEB97.ringBar, ringInk: WEB97.ringInk, engine: WEB97.engine, black: ERA1.black, white: ERA1.white },
  y2003: { banner: WEB2003.banner, bannerInk: WEB2003.bannerInk, bannerDim: WEB2003.bannerDim, panelHead: WEB2003.panelHead, tab: WEB2003.tab, white: WEB2003.white, brand: ERA1.titleBlue, tip: WEB2003.pending, ink: WEB2003.text },
  y2016: { bar: ERA3.deskMid, barLo: ERA3.deskTop, white: ERA3.white, pale: ERA3.titleA, accentHi: ERA3.accentHi },
  y2026: { field: ERA4.field, panel: ERA4.panel, panelHi: ERA4.panelHi, edge: ERA4.panelEdge, l: ERA4.l, textHi: ERA4.textHi, text: ERA4.text, warm: WALL.accent },
  dialog: { panel: DIALOG.panel, light: DIALOG.light, dark: DIALOG.dark, darker: DIALOG.darker, ink: DIALOG.ink, dim: DIALOG.dim, faint: DIALOG.faint, titleBar: DIALOG.titleBar, titleInk: DIALOG.titleInk }
};
