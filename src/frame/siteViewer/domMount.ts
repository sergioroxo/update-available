/**
 * ⚑ S291 — THE SITE VIEWER IN THE BROWSER: an overlay window over the 3D view, mounted like the game menu's panels and
 * the Leave page (plain DOM over the canvas; frame voice around it, the period OS's window inside it). The window itself
 * is ONE canvas (core.ts draws it) so it is exactly what the headset shows, only here it also takes the mouse wheel, a
 * touch drag, Esc and the scroll keys. Minimise folds it to a small tab at the bottom left; close removes it.
 *
 * It never pauses the piece by itself (the menu does that when it is the way here) and it stores nothing.
 */
import { DIALOG, domBevel } from '../../desktop/theme/chrome';
import { ViewerCore, type ViewerHost } from './core';
import { MODEL } from './model';
import { siteViewerBus, type ViewerTarget } from './bus';
import { viewerAudio } from './audio';
import { gameMenuBus } from '../../state/gameMenuBus';

const Z = 1150;   // over the game menu (1000) and the orienting card (900); under the Leave page (1200)
let mounted = false;

/** the logical size of the window for a given viewport — type stays the same size in logical px, the canvas scales */
export function logicalSize(vw: number, vh: number): { W: number; H: number; scale: number; cssW: number; cssH: number } {
  const availW = Math.floor(vw * 0.97), availH = Math.floor(vh * 0.95);
  const W = availW < 500 ? 440 : availW < 800 ? 640 : availW < 1100 ? 1024 : Math.min(1600, Math.round(availW / 1.15));
  const H = Math.max(520, Math.min(1400, Math.round(W * availH / availW)));
  const scale = Math.min(availW / W, availH / H);
  return { W, H, scale, cssW: Math.floor(W * scale), cssH: Math.floor(H * scale) };
}

let shared: ViewerCore | null = null;
export function mountSiteViewerDom(): ViewerCore {
  if (mounted && shared) return shared;
  mounted = true;
  let root: HTMLDivElement | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let chip: HTMLButtonElement | null = null;
  let isOpen = false;
  let dirty = true;
  let raf = 0;
  let size = logicalSize(window.innerWidth, window.innerHeight);
  let cameFromMenu = false;

  const host: ViewerHost = {
    canOpenPage: true,
    close: () => hide(true),
    minimise: () => minimise(),
    openUrl: (url) => openTab(url),
    openPage: (path) => openTab(path),
    audio: viewerAudio,
    changed: () => request()
  };
  const core = new ViewerCore(host);
  viewerAudio.setListener(() => request());

  /** a plain link followed in a new tab: a navigation the visitor chose, never a request the piece makes */
  function openTab(href: string): void {
    const a = document.createElement('a');
    a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.click();
  }

  function request(): void { dirty = true; }

  function paint(): void {
    if (!canvas || !isOpen) return;
    if (core.tickToast(performance.now())) dirty = true;
    if (!dirty) return;
    dirty = false;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pw = Math.round(size.cssW * dpr), ph = Math.round(size.cssH * dpr);
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
    canvas.style.width = `${size.cssW}px`; canvas.style.height = `${size.cssH}px`;
    ctx.setTransform(pw / size.W, 0, 0, ph / size.H, 0, 0);
    core.render(ctx, size.W, size.H);
  }
  function loop(): void { paint(); raf = requestAnimationFrame(loop); }

  const toLogical = (e: { clientX: number; clientY: number }): { x: number; y: number } => {
    const r = canvas!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * size.W, y: ((e.clientY - r.top) / r.height) * size.H };
  };

  function build(): void {
    root = document.createElement('div');
    root.id = 'reinterp-site-viewer';
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', `${MODEL.siteName}: the four websites`);
    Object.assign(root.style, {
      position: 'fixed', inset: '0', zIndex: String(Z), display: 'none', alignItems: 'center', justifyContent: 'center',
      background: `rgba(${DIALOG.veilRGB}, 0.72)`
    } as CSSStyleDeclaration);
    canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'The website, drawn in a window. Use the scroll bar, the mouse wheel or the arrow keys to read. Escape closes it. The same site is a web page: use the link after this picture.');
    Object.assign(canvas.style, { display: 'block', touchAction: 'none', cursor: 'default', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' } as CSSStyleDeclaration);
    // click-only: a press is resolved on RELEASE, behind a 10 px threshold — a press that travels is a scroll
    let down: { x: number; y: number; ly: number; scroll0: number; onDoc: boolean; moved: boolean; id: number } | null = null;
    canvas.addEventListener('pointerdown', (e) => {
      const p = toLogical(e);
      down = { x: e.clientX, y: e.clientY, ly: p.y, scroll0: core.scroll, onDoc: core.overDoc(p.x, p.y), moved: false, id: e.pointerId };
      canvas!.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = toLogical(e);
      if (down && down.id === e.pointerId) {
        if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10) down.moved = true;
        if (down.moved && down.onDoc) { if (core.scrollTo(down.scroll0 - (p.y - down.ly))) request(); }
        return;
      }
      if (core.move(p.x, p.y)) { canvas!.style.cursor = core.hover ? 'pointer' : 'default'; request(); }
    });
    canvas.addEventListener('pointerup', (e) => {
      const d = down; down = null;
      if (!d || d.id !== e.pointerId) return;
      if (d.moved) { request(); return; }
      const p = toLogical(e);
      core.move(p.x, p.y);
      core.press(p.x, p.y);
      request();
    });
    canvas.addEventListener('pointercancel', () => { down = null; });
    canvas.addEventListener('pointerleave', () => { if (!down && core.leave()) request(); });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const k = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? core.pageStep : 1;
      if (core.scrollBy((e.deltaY * k) / size.scale)) request();
    }, { passive: false });
    root.appendChild(canvas);
    // a keyboard and screen-reader way to the page version and out (the canvas itself is a picture)
    const sr = document.createElement('div');
    Object.assign(sr.style, { position: 'absolute', left: '-9999px', top: '0' } as CSSStyleDeclaration);
    const link = document.createElement('a');
    link.textContent = 'Open this website as a web page (new tab)'; link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.addEventListener('focus', () => { link.href = core.pagePath(); });
    link.href = 'sites/index.html';
    const closeBtn = document.createElement('button'); closeBtn.textContent = 'Close the website window';
    closeBtn.addEventListener('click', () => hide(true));
    sr.append(link, closeBtn);
    root.appendChild(sr);
    // a press on the veil, outside the window, is not a close: the window has its own close button
    document.body.appendChild(root);
    window.addEventListener('resize', onResize);
  }

  function onResize(): void {
    size = logicalSize(window.innerWidth, window.innerHeight);
    request();
  }

  const onKey = (e: KeyboardEvent): void => {
    if (!isOpen) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    let handled = true;
    switch (e.key) {
      case 'Escape': hide(true); break;
      case 'ArrowDown': core.scrollBy(80); break;
      case 'ArrowUp': core.scrollBy(-80); break;
      case 'PageDown': case ' ': core.scrollBy(core.pageStep); break;
      case 'PageUp': core.scrollBy(-core.pageStep); break;
      case 'Home': core.scrollTo(0); break;
      case 'End': core.scrollTo(1e9); break;
      default: handled = false;
    }
    if (!handled) return;
    // while the window is up, Esc is ITS way out: the menu and the engine never see the key
    if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement) { if (e.key !== 'Escape') return; }
    e.preventDefault(); e.stopImmediatePropagation();
    request();
  };

  function show(target: ViewerTarget): void {
    if (!root) build();
    cameFromMenu = gameMenuBus.isOpen;
    core.open(target);
    size = logicalSize(window.innerWidth, window.innerHeight);
    isOpen = true; dirty = true;
    root!.style.display = 'flex';
    chip?.remove(); chip = null;
    window.addEventListener('keydown', onKey, { capture: true });
    cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }

  function hide(closing: boolean): void {
    if (!root) return;
    isOpen = false;
    cancelAnimationFrame(raf);
    root.style.display = 'none';
    window.removeEventListener('keydown', onKey, { capture: true });
    if (closing) { viewerAudio.stop(); chip?.remove(); chip = null; }
  }

  function minimise(): void {
    hide(false);
    // the piece goes on while the tab waits; if the menu was how we got here, it closes so the piece is not held
    if (cameFromMenu && gameMenuBus.isOpen) gameMenuBus.close();
    chip?.remove();
    chip = document.createElement('button');
    chip.id = 'reinterp-site-chip';
    chip.textContent = `▲ ${core.view === 'hub' ? 'Sources' : `Sources · ${core.view}`}`;
    chip.setAttribute('aria-label', 'Show the website window again');
    Object.assign(chip.style, {
      position: 'fixed', left: '58px', bottom: '14px', zIndex: '998', height: '34px', padding: '0 14px',
      background: DIALOG.panel, color: DIALOG.ink, font: '13px Tahoma, Verdana, sans-serif', fontWeight: '700', cursor: 'pointer', borderRadius: '0'
    } as CSSStyleDeclaration);
    domBevel(chip);
    chip.addEventListener('click', () => { chip?.remove(); chip = null; cameFromMenu = false; isOpen = true; dirty = true; root!.style.display = 'flex'; window.addEventListener('keydown', onKey, { capture: true }); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); });
    document.body.appendChild(chip);
  }

  siteViewerBus.openDom = (t) => show(t);
  siteViewerBus.closeDom = () => { if (isOpen || chip) hide(true); };
  siteViewerBus.domOpen = () => isOpen;
  shared = core;
  return core;
}
