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

  const hide = (): void => {
    if (!root) return;
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
