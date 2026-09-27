/**
 * ⚑ THE LEAVE PAGE — an in-between (S168 / W-F1).
 *
 * Sérgio (2026-08-21 §F): *"The Leave button should let you get back if you
 * want to… it should create an interim space that could be safe and affirming
 * to either LGBT and SOGICE people, but should let you go back to the narrative
 * if you wanted."* And 2026-09-21: *"an in-between fake chrome webpage that can
 * let you go back — like a wikipedia lookalike so people could be protected
 * and still have the possibility to get back to the experience if needed.
 * Serve as well as easter egg."*
 *
 * So Leave opens THIS: a plain encyclopedia article that any screen can show
 * without explaining itself. Frame voice, and the frame never plays — the site
 * is invented (no real site's name, mark or logo), the article is true and dull
 * (`data/strings/leavePage.json`: a screensaver), and the way back is discreet
 * but findable three ways: the last entry under See also, the small link in the
 * corner, and Esc. While it is up the piece is HELD (the menu's own freeze) and
 * every sound is muted; the page title is the article's, so a tab list shows
 * nothing else. "Leave for good" is the old Leave — the ledger wiped, the inert
 * "You left." screen.
 *
 * ⚑ NOTHING IS STORED (CLAUDE.md): the page reads nothing and writes nothing;
 * the search box is a picture of one. No fonts are fetched: a system serif.
 */
import copy from '../../data/strings/leavePage.json';
import { gameMenuBus } from '../state/gameMenuBus';
import { roomBed, setOneShotsMuted } from '../audio/tapeAudio';
import { REFERENCE } from '../desktop/theme/chrome';

const Z = 1200;   // over the game menu (1000) and the orienting card (900)

/** the page's own greys — a reference site's, not the fiction's (theme/chrome.ts REFERENCE) */
const INK = REFERENCE.ink;
const LINK = REFERENCE.link;
const RULE = REFERENCE.rule;
const PANEL = REFERENCE.panel;
const PAPER = REFERENCE.paper;
const MUTED = REFERENCE.muted;

export interface LeavePage {
  /** show the page; `onLeaveForGood` is the old Leave */
  show(onLeaveForGood: () => void): void;
  readonly isOpen: boolean;
}

export function mountLeavePage(): LeavePage {
  let root: HTMLDivElement | null = null;
  let savedTitle = '';
  let wasMenuOpen = false;

  const el = (tag: string, style: Partial<CSSStyleDeclaration>, text?: string): HTMLElement => {
    const e = document.createElement(tag);
    Object.assign(e.style, style as CSSStyleDeclaration);
    if (text !== undefined) e.textContent = text;
    return e;
  };

  let stopSaver: (() => void) | null = null;
  const hide = (): void => {
    if (!root) return;
    stopSaver?.(); stopSaver = null;
    root.remove();
    root = null;
    document.title = savedTitle;
    roomBed.setMuted(false);
    setOneShotsMuted(false);
    window.removeEventListener('keydown', onKey, { capture: true });
    if (!wasMenuOpen) gameMenuBus.close();
  };

  const onKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    hide();
  };

  const build = (onLeaveForGood: () => void): HTMLDivElement => {
    const page = el('div', {
      position: 'fixed', inset: '0', zIndex: String(Z), overflowY: 'auto', background: PAPER, color: INK,
      font: '15px Georgia, "Times New Roman", serif', lineHeight: '1.6'
    }) as HTMLDivElement;
    page.id = 'reinterp-leave-page';
    page.setAttribute('role', 'document');

    // ── the site's top bar: a wordmark, tabs, a search box (a picture of one) ──
    const top = el('div', { display: 'flex', alignItems: 'center', gap: '18px', padding: '8px 18px', borderBottom: `1px solid ${RULE}`, background: PANEL, flexWrap: 'wrap' });
    const mark = el('div', { display: 'flex', flexDirection: 'column', minWidth: '150px' });
    mark.appendChild(el('div', { fontSize: '17px', fontWeight: '700', letterSpacing: '0.5px' }, copy.siteName));
    mark.appendChild(el('div', { fontSize: '11px', color: MUTED }, copy.tagline));
    top.appendChild(mark);
    const tabs = el('div', { display: 'flex', gap: '14px', fontSize: '13px', fontFamily: 'Arial, Helvetica, sans-serif', flex: '1' });
    copy.tabs.forEach((t, i) => tabs.appendChild(el('span', { color: i === 0 ? INK : LINK, borderBottom: i === 0 ? `2px solid ${INK}` : 'none', paddingBottom: '2px' }, t)));
    top.appendChild(tabs);
    const search = el('div', { border: `1px solid ${RULE}`, background: PAPER, padding: '4px 10px', fontSize: '13px', color: REFERENCE.placeholder, minWidth: '180px', fontFamily: 'Arial, Helvetica, sans-serif' }, copy.searchPlaceholder);
    top.appendChild(search);
    // the corner way back — small, plain, always there
    const corner = el('button', {
      font: '12px Arial, Helvetica, sans-serif', color: LINK, background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 6px'
    }, copy.cornerResume);
    corner.addEventListener('click', hide);
    top.appendChild(corner);
    page.appendChild(top);

    // ── the article ──
    const body = el('div', { maxWidth: '980px', margin: '0 auto', padding: '18px 22px 40px' });
    body.appendChild(el('h1', { font: '28px Georgia, "Times New Roman", serif', fontWeight: '400', margin: '0 0 4px', borderBottom: `1px solid ${RULE}`, paddingBottom: '4px' }, copy.title));
    body.appendChild(el('div', { fontSize: '12px', color: MUTED, fontStyle: 'italic', margin: '4px 0 12px', paddingLeft: '18px' }, copy.hatnote));

    const cols = el('div', { display: 'flex', gap: '22px', alignItems: 'flex-start', flexWrap: 'wrap' });
    const main = el('div', { flex: '1 1 420px', minWidth: '260px' });
    const info = el('table', { flex: '0 0 250px', border: `1px solid ${RULE}`, background: PANEL, fontSize: '12.5px', fontFamily: 'Arial, Helvetica, sans-serif', borderCollapse: 'collapse', width: '250px' });
    const cap = el('caption', { fontWeight: '700', fontSize: '14px', padding: '6px', background: REFERENCE.panelHead, captionSide: 'top' }, copy.infobox.title);
    info.appendChild(cap);
    // ⚑ S177 — the infobox's picture: a starfield, as screensavers were (see `starfield`)
    {
      const tr = document.createElement('tr');
      const td = el('td', { padding: '6px 8px 2px', textAlign: 'center' });
      td.setAttribute('colspan', '2');
      const cvs = document.createElement('canvas');
      Object.assign(cvs.style, { width: '234px', height: '132px', display: 'block', margin: '0 auto', background: REFERENCE.saverSky });
      td.appendChild(cvs);
      td.appendChild(el('div', { fontSize: '11.5px', color: MUTED, padding: '4px 0 2px' }, copy.screensaver.caption));
      tr.appendChild(td);
      info.appendChild(tr);
      stopSaver = starfield(cvs, 234, 132);
    }
    for (const [k, v] of copy.infobox.rows) {
      const tr = document.createElement('tr');
      tr.appendChild(el('th', { textAlign: 'left', padding: '4px 8px', verticalAlign: 'top', width: '40%' }, k));
      tr.appendChild(el('td', { padding: '4px 8px', verticalAlign: 'top' }, v));
      info.appendChild(tr);
    }
    cols.appendChild(main);
    cols.appendChild(info);
    body.appendChild(cols);

    main.appendChild(el('p', { margin: '0 0 12px' }, copy.lead));
    const toc = el('div', { display: 'inline-block', border: `1px solid ${RULE}`, background: PANEL, padding: '8px 14px', margin: '4px 0 14px', fontSize: '13px' });
    toc.appendChild(el('div', { fontWeight: '700', textAlign: 'center', marginBottom: '4px' }, copy.contentsTitle));
    copy.sections.forEach((s, i) => toc.appendChild(el('div', { color: LINK }, `${i + 1}  ${s.heading}`)));
    toc.appendChild(el('div', { color: LINK }, `${copy.sections.length + 1}  ${copy.seeAlsoTitle}`));
    main.appendChild(toc);
    for (const s of copy.sections) {
      main.appendChild(el('h2', { font: '20px Georgia, "Times New Roman", serif', fontWeight: '400', margin: '16px 0 6px', borderBottom: `1px solid ${RULE}` }, s.heading));
      for (const p of s.paragraphs) main.appendChild(el('p', { margin: '0 0 10px' }, p));
    }
    main.appendChild(el('h2', { font: '20px Georgia, "Times New Roman", serif', fontWeight: '400', margin: '16px 0 6px', borderBottom: `1px solid ${RULE}` }, copy.seeAlsoTitle));
    const ul = el('ul', { margin: '0 0 12px', paddingLeft: '22px' });
    for (const s of copy.seeAlso) ul.appendChild(el('li', { color: LINK }, s));
    // ⚑ the way back, as the last entry: a link like the others, and it is the one that works
    const li = el('li', {});
    const back = el('a', { color: LINK, cursor: 'pointer', textDecoration: 'none' }, copy.resumeLink);
    back.setAttribute('href', '#');
    back.addEventListener('click', (e) => { e.preventDefault(); hide(); });
    li.appendChild(back);
    ul.appendChild(li);
    main.appendChild(ul);

    // the foot: the licence line, the last-edited line, and the old Leave, small
    const foot = el('div', { borderTop: `1px solid ${RULE}`, marginTop: '24px', paddingTop: '10px', fontSize: '12px', color: MUTED, fontFamily: 'Arial, Helvetica, sans-serif' });
    foot.appendChild(el('div', {}, copy.lastEdited));
    foot.appendChild(el('div', { marginTop: '4px' }, copy.footer));
    const gone = el('button', { font: '12px Arial, Helvetica, sans-serif', color: LINK, background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px 0 0', textDecoration: 'underline' }, copy.leaveForGood);
    gone.addEventListener('click', () => { hide(); onLeaveForGood(); });
    foot.appendChild(gone);
    body.appendChild(foot);
    page.appendChild(body);
    return page;
  };

  return {
    get isOpen() { return !!root; },
    show(onLeaveForGood: () => void): void {
      if (root) return;
      savedTitle = document.title;
      wasMenuOpen = gameMenuBus.isOpen;
      // the piece is held while the page is up: the menu's own freeze, and silence
      gameMenuBus.open();
      roomBed.setMuted(true);
      setOneShotsMuted(true);
      root = build(onLeaveForGood);
      document.body.appendChild(root);
      document.title = copy.docTitle;
      window.addEventListener('keydown', onKey, { capture: true });
      root.scrollTop = 0;
    }
  };
}

// ── ⚑ S177 — THE STARFIELD, and what it sometimes says ──────────────────────────
// Sérgio, 2026-09-26: the Leave page as "a hidden message of hope, within a screensaver
// analogy". A warp starfield, the most ordinary screensaver there was; every
// `everySeconds` the stars gather for `holdSeconds` into three short lines and scatter
// again — the way a screensaver drifts into a clock. Read by nobody who is not looking.
// No storage, no timers left behind: the loop is one rAF and stops when the page closes.
const DOT: Record<string, string> = {
  A: '010101111101101', D: '110101101101110', E: '111100110100111', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', N: '110101101101101', O: '010101101101010', R: '110101110101101', S: '011100010001110',
  T: '111010010010010', U: '101101101101111', W: '101101111111101', Y: '101101010010010', ' ': '000000000000000'
};

function starfield(cvs: HTMLCanvasElement, W: number, H: number): () => void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cvs.width = W * dpr; cvs.height = H * dpr;
  const ctx = cvs.getContext('2d');
  if (!ctx) return () => {};
  ctx.scale(dpr, dpr);
  // the message's dots, centred, 4 px per cell
  const targets: { x: number; y: number }[] = [];
  const lines = copy.screensaver.lines;
  const CELL = 4, LINE_H = 6 * CELL + 4;
  lines.forEach((line, li) => {
    const w = line.length * 4 * CELL - CELL;
    const x0 = (W - w) / 2, y0 = (H - lines.length * LINE_H) / 2 + li * LINE_H + 2;
    [...line].forEach((ch, ci) => {
      const g = DOT[ch] ?? DOT[' '];
      for (let i = 0; i < 15; i++) if (g[i] === '1') targets.push({ x: x0 + ci * 4 * CELL + (i % 3) * CELL, y: y0 + Math.floor(i / 3) * CELL });
    });
  });
  const N = Math.max(160, targets.length + 40);
  const stars = Array.from({ length: N }, () => ({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: Math.random() }));
  const EVERY = copy.screensaver.everySeconds, HOLD = copy.screensaver.holdSeconds, MOVE = 1.4;
  // never early: a person may have opened this page because someone is looking
  let raf = 0, last = performance.now(), clock = 0;
  const frame = (now: number): void => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
    const t = clock % EVERY, start = EVERY - HOLD - 2 * MOVE;
    // 0 = free flight, 1 = gathered
    const k = t < start ? 0 : t < start + MOVE ? (t - start) / MOVE : t < start + MOVE + HOLD ? 1 : Math.max(0, 1 - (t - start - MOVE - HOLD) / MOVE);
    const e = k * k * (3 - 2 * k);
    ctx.fillStyle = REFERENCE.saverSky; ctx.fillRect(0, 0, W, H);
    stars.forEach((s, i) => {
      s.z -= dt * 0.35 * (1 - e);
      if (s.z <= 0.02) { s.x = (Math.random() - 0.5) * 2; s.y = (Math.random() - 0.5) * 2; s.z = 1; }
      const px = W / 2 + (s.x / s.z) * (W / 4), py = H / 2 + (s.y / s.z) * (H / 4);
      const tg = targets[i];
      const x = tg ? px + (tg.x - px) * e : px, y = tg ? py + (tg.y - py) * e : py;
      const size = tg && e > 0.5 ? 2 : s.z < 0.35 ? 2 : 1;
      ctx.fillStyle = !tg && e > 0 ? REFERENCE.saverDim : REFERENCE.saverStar;
      if (x >= 0 && x < W && y >= 0 && y < H) ctx.fillRect(Math.round(x), Math.round(y), size, size);
    });
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
