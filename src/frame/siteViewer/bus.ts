/**
 * ⚑ S291 — THE SITE VIEWER'S DOOR. A tiny singleton with no imports (the same idiom as state/gameMenuBus.ts): the menu,
 * the Close's Sources button and the Esc handler can ask for the viewer without importing a renderer or the engine.
 * The DOM mount (browser) and the XR mount (headset) each register themselves here; `open` picks the one in use.
 */
export type ViewerTarget = 'hub' | '1997' | '2003' | '2016' | '2026';

class SiteViewerBus {
  /** set by app.ts once the engine exists: is an immersive session running? */
  xrActive: () => boolean = () => false;
  openDom: ((t: ViewerTarget) => void) | null = null;
  openXr: ((t: ViewerTarget) => void) | null = null;
  closeDom: (() => void) | null = null;
  closeXr: (() => void) | null = null;
  /** true while a window is up (not while only its minimised tab is) */
  domOpen: () => boolean = () => false;
  xrOpen: () => boolean = () => false;

  open(target: ViewerTarget): void {
    if (this.xrActive() && this.openXr) this.openXr(target);
    else this.openDom?.(target);
  }
  /** ⚑ S372 — the tab a window opens on, for the one `openAt` call that asks (core.ts `open` reads it); null = 'story' */
  nextTab: string | null = null;
  /** open a year's website on one of its tabs (the Lexicon's word pages link to that year's "The words") */
  openAt(target: ViewerTarget, tab: string): void {
    this.nextTab = tab;
    try { this.open(target); } finally { this.nextTab = null; }
  }
  close(): void { this.closeDom?.(); this.closeXr?.(); }
  get isOpen(): boolean { return this.domOpen() || this.xrOpen(); }
}

export const siteViewerBus = new SiteViewerBus();

/** era number 1..4 (the Close's panels) → the viewer target */
export const ERA_TARGET: Record<number, ViewerTarget> = { 1: '1997', 2: '2003', 3: '2016', 4: '2026' };
