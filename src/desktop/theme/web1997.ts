/**
 * ⚑ S190 — the 1997 web, as the browser draws it (src/desktop/apps/web1997.ts). The page colours are the
 * period's own: the lavender page and the purple bevelled headings of the ex-gay link directories Sérgio found
 * (docs/reinterp/SOURCES_1997_WEB_2026-09-27.md), the default link blue and visited purple of the browsers.
 */
export const WEB97 = {
  page: '#ccccff', heading: '#660099', headingShade: '#330066', link: '#0000ee', visited: '#551a8b',
  text: '#000033', dim: '#555577', rule: '#9999cc', ringBar: '#dddddd', ringInk: '#000080',
  counterBg: '#aaaadd', searchBg: '#ffffff', engine: '#cc0000', engineAlt: '#0033cc', join: '#008000',
  construction: '#ffdd33'   // S194 — the period's 'under construction' yellow
} as const;

/** ⚑ S191 — the 2003 forum (src/desktop/apps/web2003.ts): a UBB/phpBB-era board, navy banner, pale panels */
export const WEB2003 = {
  page: '#eef1f6', banner: '#1f3a6b', bannerInk: '#ffffff', bannerDim: '#a9bbd8', panel: '#dde4ef', panelHead: '#3a5a8c',
  postHead: '#c9d4e6', text: '#1a1a2a', dim: '#5a6478', link: '#1c3fa0', check: '#1f7a3a', pending: '#fff6d6', praying: '#8a3a6a'
} as const;
