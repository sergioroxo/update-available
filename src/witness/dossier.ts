/**
 * ⚑ S175 — A ROOM'S DOSSIER: what it says, and how it is drawn.
 *
 * Sérgio, on S174's dossier windows on Daniel's machine: "the sources open need to
 * be on the 4 panels that make the Close, it is nuisance to go back and forth.
 * Instead of the computer." So the window moved onto the panels (pointCloud.ts), and
 * its content lives here, where the panels, the menu and the public sources page
 * (tools/gen_sources_page.mjs) all read the same words.
 *
 * ⚑ NO PER-LABEL CLAIM. A constellation label carries only a name and an era; its
 * window is its ROOM's dossier — the room's status, its practices and their
 * verified sources (data/dossier/practices.json → the provotype cards), the room's
 * references listed together with the pressed one marked. Opening "detransition
 * cohort study (Fenway)" onto Era 4's practices under its own name would imply a
 * link the data never makes (close_restart.json `_docSource`).
 */
import closeNetwork from '../../data/strings/close_network.json';
import menuCopy from '../../data/strings/gameMenu.json';
import card from '../../data/strings/close_restart.json';
import words from '../../data/strings/status_words.json';
import links from '../../data/dossier/links.json';
import { practiceOf } from './record';
import { sourceTextOf } from './sources';
import { ERA1 } from '../desktop/theme/era1';
import { px, setFont, bevel, wrapText, windowFrame, DIALOG } from '../desktop/theme/chrome';
import { ERA3, windowFrame as aeroFrame } from '../desktop/theme/era3';
import { ERA4 } from '../desktop/theme/era4';
import { setFaceEra, faceEra, type FaceEra } from '../desktop/theme/fonts';

/** documented / disputed / imagined — the public word for a dossier status */
export function statusShort(s: string): string {
  return (words.short as Record<string, string>)[s] ?? s;
}
/** the sentence that explains it */
export function statusLong(s: string): string {
  return (words.long as Record<string, string>)[s] ?? s;
}
/** a source's text as the public reads it: the in-house marker made plain */
export function publicText(t: string): string {
  return t.split(words._verifyMarker).join(words.verifyPublic);
}

export type DossierLine = { t: string; k: 'head' | 'body' | 'dim' | 'ref' | 'mine' | 'link' };

/** a room's dossier (era 1–4), or the project's own documents (era 0) */
export function dossierLines(era: number, label: string | null): { title: string; lines: DossierLine[] } {
  const SRC = card.source;
  const lines: DossierLine[] = [];
  const refs = (closeNetwork.labels as { era: number; text: string }[]).filter((l) => l.era === era);
  const refBlock = (): void => {
    lines.push({ t: era === 0 ? SRC.makersRefsLabel : SRC.refsLabel, k: 'head' });
    for (const r of refs) lines.push({ t: (r.text === label ? '› ' : '  ') + r.text, k: r.text === label ? 'mine' : 'ref' });
  };
  if (era === 0) {
    for (const l of SRC.makersLines) lines.push({ t: l, k: 'body' });
    refBlock();
    lines.push({ t: card.makers, k: 'dim' });
    return { title: SRC.makersTitle, lines };
  }
  const pn = (closeNetwork.panels as { era: number; years: string; title: string; status: string; practices?: string[] }[])
    .find((p) => p.era === era);
  if (!pn) return { title: '', lines };
  lines.push({ t: statusLong(pn.status), k: 'body' });
  lines.push({ t: SRC.practicesLabel, k: 'head' });
  for (const kind of pn.practices ?? []) {
    const pr = practiceOf(kind);
    if (!pr) continue;
    lines.push({ t: `${pr.title.toUpperCase()} — ${pr.did}. [${statusShort(pr.status)}]`, k: 'body' });
    const src = sourceTextOf(pr as { source?: { file: string; index: number } | null });
    lines.push({ t: src ? `${menuCopy.yourFileSource}: ${publicText(src)}` : menuCopy.yourFileNoSource, k: 'dim' });
    // S175: a source with verified links points to the companion page that holds them
    const key = pr.source ? `${pr.source.file}#${pr.source.index}` : '';
    if (key && (links.links as Record<string, unknown[]>)[key]?.length) lines.push({ t: words.linkedNote, k: 'link' });
  }
  refBlock();
  return { title: SRC.windowTitle.replace('{years}', pn.years).replace('{title}', pn.title), lines };
}

/**
 * Draw a dossier in its room's own OS into (0, 0, W, H) logical pixels of `ctx`
 * (the caller scales): 1997 grey on teal, 2003 on Restorify's blue, 2016's glass,
 * 2026's dark; the frame's own dialog for era 0. Returns how many pages it runs to
 * and draws `page` (wrapped to the count). `footer` is the frame's one line at the
 * foot — how to turn the page.
 */
export function drawDossier(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  era: number, label: string | null, page: number, footer: (page: number, pages: number) => string
): { pages: number; page: number } {
  const was = faceEra();
  setFaceEra(era === 0 ? 'e1' : (`e${era}` as FaceEra));
  const { title, lines } = dossierLines(era, label);
  let area: { x: number; y: number; w: number; h: number };
  let ink: string = ERA1.black, dim: string = ERA1.greyDark, head: string = ERA1.navy, mine: string = ERA1.warnDark;
  const wx = 8, wy = 8, ww = W - 16, wh = H - 16;
  if (era === 3) {
    px(ctx, 0, 0, W, H, ERA3.deskMid);
    area = aeroFrame(ctx, wx, wy, ww, wh, title);
    // the glass is near-white: the secondary ink has to stay dark enough to read (S175)
    ink = ERA3.titleText; dim = ERA3.deskLow; head = ERA3.deskTop; mine = ERA3.bury;
  } else if (era === 4) {
    px(ctx, 0, 0, W, H, ERA4.field);
    px(ctx, wx, wy, ww, wh, ERA4.panelEdge);
    px(ctx, wx + 1, wy + 1, ww - 2, wh - 2, ERA4.panel);
    px(ctx, wx + 1, wy + 1, ww - 2, 20, ERA4.panelHi);
    setFont(ctx, 11);
    ctx.fillStyle = ERA4.textHi;
    ctx.fillText(title, wx + 10, wy + 5);
    area = { x: wx + 10, y: wy + 28, w: ww - 20, h: wh - 34 };
    ink = ERA4.text; dim = ERA4.dim; head = ERA4.meta; mine = ERA4.textHi;
  } else {
    px(ctx, 0, 0, W, H, era === 0 ? DIALOG.screenDark : era === 2 ? ERA1.titleBlue : ERA1.teal);
    const c = windowFrame(ctx, wx, wy, ww, wh, title);
    area = { x: c.x + 4, y: c.y + 4, w: c.w - 8, h: c.h - 8 };
  }
  setFont(ctx, 10);
  const rows: DossierLine[] = [];
  for (const l of lines) {
    if (l.k === 'head' && rows.length) rows.push({ t: '', k: 'body' });
    for (const w of wrapText(ctx, l.t, area.w)) rows.push({ t: w, k: l.k });
  }
  const LH = 13;
  const perPage = Math.max(1, Math.floor((area.h - 22) / LH));
  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  const pg = ((page % pages) + pages) % pages;
  let y = area.y;
  for (const r of rows.slice(pg * perPage, (pg + 1) * perPage)) {
    // a link is an invitation, not a warning: the heading's calm ink, never the era's red
    ctx.fillStyle = r.k === 'head' || r.k === 'link' ? head : r.k === 'dim' ? dim : r.k === 'mine' ? mine : ink;
    ctx.fillText(r.t, area.x, y);
    y += LH;
  }
  // the foot: one line in the frame's voice, on a status strip in the room's chrome
  const fy = area.y + area.h - 16;
  if (era >= 3) {
    px(ctx, area.x, fy, area.w, 16, era === 3 ? ERA3.titleA : ERA4.chip);
    ctx.fillStyle = era === 3 ? ERA3.titleText : ERA4.chipText;
  } else {
    bevel(ctx, area.x, fy, area.w, 16, false);
    ctx.fillStyle = ERA1.black;
  }
  setFont(ctx, 9);
  ctx.fillText(footer(pg, pages), area.x + 6, fy + 4);
  setFaceEra(was);
  return { pages, page: pg };
}
