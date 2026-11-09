/**
 * ⚑ S190 — the 1997 web, as the browser draws it (src/desktop/apps/web1997.ts). The page colours are the
 * period's own: the lavender page and the purple bevelled headings of the ex-gay link directories Sérgio found
 * (docs/reinterp/SOURCES_1997_WEB_2026-09-27.md), the default link blue and visited purple of the browsers.
 */
export const WEB97 = {
  page: '#ccccff', heading: '#660099', headingShade: '#330066', link: '#0000ee', visited: '#551a8b',
  text: '#000033', dim: '#555577', rule: '#9999cc', ringBar: '#dddddd', ringInk: '#000080',
  counterBg: '#aaaadd', searchBg: '#ffffff', engine: '#cc0000', engineAlt: '#0033cc', join: '#008000',
  construction: '#ffdd33',   // S194 — the period's 'under construction' yellow
  logoBg: '#1a2a6c', logoInk: '#e8e8f0', iconInk: '#1a2a6c',   // S197 — the browser's mark and its toolbar pictures
  // ⚑ S343 / T38 — three period page grammars, web-safe colours of the free-homepage years
  geoBg: '#ffffcc', geoTile: '#ffcc99', geoHeading: '#cc0066', geoShade: '#ff99cc', geoText: '#330033',
  geoBeads: ['#cc0066', '#ff99cc', '#ffcc99'],   // a beaded rule (never a rainbow: these are ministry pages)
  ringBg: '#000033', ringText: '#ffff00', ringLink: '#00ffff', ringVisited: '#ff99ff', ringHeading: '#ff9900', ringPanel: '#000066',
  dirHeading: '#003366', dirCell: '#eeeeee', dirEdge: '#999999',
  adSky: '#99ccff', adGrass: '#66cc33'   // the FIT IN advertisement's little field
} as const;

/** ⚑ S191 — the 2003 forum (src/desktop/apps/web2003.ts): a UBB/phpBB-era board, navy banner, pale panels */
export const WEB2003 = {
  page: '#eef1f6', banner: '#1f3a6b', bannerInk: '#ffffff', bannerDim: '#a9bbd8', panel: '#dde4ef', panelHead: '#3a5a8c',
  postHead: '#c9d4e6', text: '#1a1a2a', dim: '#5a6478', link: '#1c3fa0', check: '#1f7a3a', pending: '#fff6d6', praying: '#8a3a6a',
  // S199 — the typed-in values of a pre-filled form, the tab strip, the book covers
  filled: '#7a1f2b', tab: '#c9d4e6', white: '#ffffff', cover1: '#2a5a8a', cover2: '#8a5a2a', cover3: '#4a7a4a'
} as const;
