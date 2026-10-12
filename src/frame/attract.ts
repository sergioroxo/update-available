/**
 * ⚑ S232 — THE EXHIBITION'S IDLE CYCLE (the lead, 2026-10-11). Words: data/strings/attract.json.
 *
 *   "If the experience is left untouched for 15 minutes it goes to the screensavers, that also show the advert to call
 *    people to the piece, and if the person touches it, it asks if you want to start from the beginning. If after 30
 *    minutes no one touches it it goes back to the home, and after 15 minutes goes to the screensavers, and so on."
 *
 * This is a FRAME layer, not a fiction one: it sits over everything (the 3D room, the desktop, LambyOS Home, the game
 * menu, the Leave page), speaks in the frame's plain voice, and files nothing. The in-fiction screensavers that appear
 * inside each era after ~150 s (screensaver.ts, hosted by os.ts / browser.ts / graceQueueLite.ts) are untouched; this
 * module only REUSES their drawing, full screen, as a gallery to call people in.
 *
 *   ONE idle clock (`lastTouch`), reset by any real human input — pointerdown, touchstart, keydown, wheel, a drag
 *   (pointermove with a button down) and, in a headset, a select/squeeze (app.ts calls `noteHumanInput`). It is NOT
 *   reset by the gyro (a phone on a table drifts: we never listen to it) nor by the piece's own scripted motion
 *   (nothing but a person's input reaches `lastTouch`).
 *
 *   15 min untouched  → ATTRACT: a full-screen overlay cycling [call-in card, the era savers, (the advert)]. The piece
 *                       underneath is HELD (the game menu's own freeze) and every sound is muted, as the Leave page does.
 *   a touch           → if the visit had begun: the plain question "Start from the beginning?" — Start (wipe + reload,
 *                       exactly the menu's Restart: `#home-armed`) or Carry on (dismiss, unhold, sound back, clock reset).
 *                       If the cycle began while LambyOS Home / the orienting card was up (the visit had not begun) a
 *                       touch just dismisses it: nothing to ask.
 *   30 min untouched  → back to LambyOS Home as a FRESH VISIT: the ledger wiped (the "wiped on idle" law) and a reload.
 *                       Home then counts again: 15 min → attract, and so on, forever.
 *
 *   ⚑ A fresh visit carries NO `#home-armed`. The Restart a person presses has read the notice minutes ago in this tab;
 *   nobody has read it after 30 empty minutes, so Home's 4 s arm runs in full for whoever walks up next.
 *   ⚑ IN A HEADSET there is no DOM overlay. The attract layer is skipped; at 30 min untouched the immersive session is
 *   ended and the same fresh-visit path runs (app.ts registers the session through `registerXrSession`).
 *   ⚑ Nothing is stored anywhere: the clock is a number in memory, the reload carries only the URL it already had.
 *
 * Off with `?kiosk=0` (the walk tools pass it). `?idlescale=N` = seconds per minute (default 60; `1` makes 15 min
 * 15 s) — a REVIEW parameter only.
 */
import { starfield } from './leavePage';
import copy from '../../data/strings/attract.json';
import { gameMenuBus } from '../state/gameMenuBus';
import { wipeLedger } from '../state/ledger';
import { roomBed, setOneShotsMuted } from '../audio/tapeAudio';
import { Screensaver, type SaverKind } from '../desktop/apps/screensaver';
import { faceEra, setFaceEra, type FaceEra } from '../desktop/theme/fonts';
import { DIALOG, FRAME, domBevel } from '../desktop/theme/chrome';

const Z = 1300;   // over the Leave page (1200), the game menu (1000) and Home / the orienting card (900)
const ATTRACT_MIN = 15;
const RETURN_MIN = 30;
const LOGICAL_H = 384;   // the desktop canvases' height (ERA1_CANVAS): the savers are drawn for it

// ── THE ADVERT SLOT ───────────────────────────────────────────────────────────────────────────────────────────────
// The call-in video/animation is not made yet. When it is, hand it over with `setAdvert({ seconds, mount })`:
// `mount(host)` fills `host` (a full-screen element) and returns its stop function. Until then the cycle skips the
// `advert` slide named in attract.json.
export interface AdvertSlide {
  /** how long the slide stays before the cycle moves on */
  seconds: number;
  /** build the advert into `host`; return a function that stops and removes it */
  mount(host: HTMLElement): () => void;
}
let advert: AdvertSlide | null = null;
export function setAdvert(a: AdvertSlide | null): void { advert = a; }

// ── the headset: no DOM overlay, but the same clock ───────────────────────────────────────────────────────────────
interface XrSession { active(): boolean; end(): void }
let xrSession: XrSession | null = null;
/** app.ts hands over the immersive session once the engine exists (the same idiom as gameMenuBus.leaveEngine) */
export function registerXrSession(s: XrSession | null): void { xrSession = s; }

let touched: (() => void) | null = null;
/** a real human input the DOM cannot report: a headset select or squeeze (frame/xrInput.ts callbacks in app.ts) */
export function noteHumanInput(): void { touched?.(); }

type State = 'play' | 'attract' | 'ask';
type SlideName = 'card' | SaverKind | 'advert';

export interface Attract { readonly state: State }

export function mountAttract(opts: { idleScale: number; debug?: boolean }): Attract {
  const SCALE = Math.max(0.05, opts.idleScale);
  const ATTRACT_MS = ATTRACT_MIN * 60 * 1000 * (SCALE / 60);
  const RETURN_MS = RETURN_MIN * 60 * 1000 * (SCALE / 60);
  const slideMs = (s: number): number => Math.max(1500, s * 1000 * (SCALE / 60));

  let state: State = 'play';
  let lastTouch = Date.now();
  let leaving = false;

  // what the overlay holds (null while state is 'play')
  let root: HTMLDivElement | null = null;
  let stage: HTMLDivElement | null = null;
  let cvs: HTMLCanvasElement | null = null;
  let cardEl: HTMLDivElement | null = null;
  let cardCvs: HTMLCanvasElement | null = null;
  let stopStars: (() => void) | null = null;
  let footEl: HTMLDivElement | null = null;
  let advertHost: HTMLDivElement | null = null;
  let askEl: HTMLDivElement | null = null;
  let carryBtn: HTMLButtonElement | null = null;
  let startBtn: HTMLButtonElement | null = null;
  let stopAdvert: (() => void) | null = null;
  let saver: Screensaver | null = null;
  let saverFace: FaceEra = 'e1';
  let slideIdx = -1;
  let slide: SlideName = 'card';
  let slideTimer = 0;
  let fadeTimer = 0;
  let raf = 0;
  let last = 0;
  let atHome = false;
  let heldMenu = false;
  let wasMenuOpen = false;
  let pressedBtn: Element | null = null;

  /** is the visit still in the front room? (Home, the short door's orienting card) — then there is nothing to hold or ask */
  const homeShowing = (): boolean => !!document.querySelector('#lambyos-home, #reinterp-orienting-card, #restore-entrance');

  // ── the fresh visit: Home again, the ledger wiped ──
  function freshVisit(): void {
    if (leaving) return;
    leaving = true;
    wipeLedger();
    // Restore visits return to WAKE, including when a review URL had started at an era.
    const freshQuery = new URLSearchParams(window.location.search);
    const restoreVisit = freshQuery.get('entrance') === 'restore' && freshQuery.get('home') !== '0';
    if (restoreVisit) {
      for (const key of ['era', 'morph', 'close', 'reveal']) freshQuery.delete(key);
    }
    try { window.history.replaceState(window.history.state, '', window.location.pathname + (restoreVisit ? '?' + freshQuery.toString() : window.location.search)); } catch { /* keep the hash */ }
    if (xrSession?.active()) {
      // ⚑ a headset has no overlay to take down: end the immersive session, then the same reload
      try { xrSession.end(); } catch { /* the reload ends it anyway */ }
      window.setTimeout(() => window.location.reload(), 600);
      return;
    }
    window.location.reload();
  }

  /** what the menu's Restart does (gameMenu.ts doRestart): wipe, `#home-armed`, reload */
  function startAgain(): void {
    if (leaving) return;
    leaving = true;
    wipeLedger();
    try { window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search + '#home-armed'); } catch { /* restart unarmed */ }
    window.location.reload();
  }

  // ── sound: silent while the cycle runs, and back as the person had it ──
  function setSilent(silent: boolean): void {
    const m = silent ? true : (gameMenuBus.soundMuted?.() ?? false);
    roomBed.setMuted(m);
    setOneShotsMuted(m);
  }

  // ── building the overlay ──
  const el = (tag: string, style: Partial<CSSStyleDeclaration>, text?: string): HTMLElement => {
    const e = document.createElement(tag);
    Object.assign(e.style, style as CSSStyleDeclaration);
    if (text !== undefined) e.textContent = text;
    return e;
  };

  function build(): void {
    root = el('div', {
      position: 'fixed', inset: '0', zIndex: String(Z), overflow: 'hidden', background: `rgb(${DIALOG.veilRGB})`,
      font: DIALOG.font, color: FRAME.bright, touchAction: 'none', userSelect: 'none', cursor: 'pointer'
    }) as HTMLDivElement;
    root.id = 'reinterp-attract';
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', copy.label);
    stage = el('div', { position: 'absolute', inset: '0', opacity: '1', transition: 'opacity 0.5s' }) as HTMLDivElement;
    root.appendChild(stage);

    cvs = document.createElement('canvas');
    cvs.setAttribute('aria-hidden', 'true');
    Object.assign(cvs.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', imageRendering: 'pixelated', display: 'none' } as CSSStyleDeclaration);
    stage.appendChild(cvs);

    // the call-in card: the piece's title and one line, in the frame's plain voice
    cardEl = el('div', {
      position: 'absolute', inset: '0', display: 'none', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '0 6vw', boxSizing: 'border-box', background: `rgb(${DIALOG.veilRGB})`
    }) as HTMLDivElement;
    // ⚑ S234 — the title is drawn by the Leave page's starfield (his 2026-10-11: "the screensaver effect of the fake
    // wikipedia page … so it is not so barebones"): the stars fly, then gather into the title, hold, and scatter.
    // The words stay in the DOM for screen readers (visually hidden); the invite line sits under the gathered title.
    cardCvs = document.createElement('canvas');
    cardCvs.setAttribute('aria-hidden', 'true');
    Object.assign(cardCvs.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' } as CSSStyleDeclaration);
    cardEl.appendChild(cardCvs);
    cardEl.appendChild(el('div', {
      position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap'
    }, copy.title));
    cardEl.appendChild(el('div', {
      position: 'absolute', left: '0', right: '0', bottom: '16vh', textAlign: 'center',
      font: 'clamp(16px, 2.6vw, 34px) Tahoma, Verdana, Arial, sans-serif', color: FRAME.dim
    }, copy.invite));
    stage.appendChild(cardEl);

    advertHost = el('div', { position: 'absolute', inset: '0', display: 'none' }) as HTMLDivElement;
    stage.appendChild(advertHost);

    // a small line under the savers, so a screen that is only a starfield still says what to do
    footEl = el('div', {
      position: 'absolute', left: '50%', bottom: '4vh', transform: 'translateX(-50%)', padding: '6px 16px',
      background: FRAME.glass, color: FRAME.ink, font: 'clamp(13px, 1.7vw, 20px) Tahoma, Verdana, Arial, sans-serif',
      whiteSpace: 'nowrap', display: 'none'
    }, copy.foot) as HTMLDivElement;
    root.appendChild(footEl);
    document.body.appendChild(root);
  }

  // ── the cycle ──
  const cycle = (): SlideName[] => (copy.cycle as SlideName[]).filter((s) => s !== 'advert' || !!advert);

  function faceFor(k: SlideName): FaceEra { return k === 'lock' ? 'e3' : k === 'orb' ? 'e4' : 'e1'; }

  function showSlide(next: SlideName): void {
    if (!root || !cvs || !cardEl || !advertHost || !footEl) return;
    stopAdvert?.(); stopAdvert = null;
    slide = next;
    const isSaver = next !== 'card' && next !== 'advert';
    cardEl.style.display = next === 'card' ? 'flex' : 'none';
    stopStars?.(); stopStars = null;
    if (next === 'card' && cardCvs) {
      const W = window.innerWidth, H = window.innerHeight;
      const longest = Math.max(...copy.titleLines.map((l: string) => l.length));
      const cell = Math.floor(Math.min((W * 0.82) / (longest * 4), (H * 0.42) / (copy.titleLines.length * 7)));
      stopStars = starfield(cardCvs, W, H, { lines: copy.titleLines, every: copy.secondsCard, hold: copy.secondsCard - 5, cell, minStars: 420 });
    }
    cvs.style.display = isSaver ? 'block' : 'none';
    advertHost.style.display = next === 'advert' ? 'block' : 'none';
    footEl.style.display = state === 'attract' && isSaver ? 'block' : 'none';
    saver = null;
    if (isSaver) {
      saverFace = faceFor(next);
      const prev = faceEra();
      setFaceEra(saverFace);   // the text savers read the era's face; set around this synchronous build/draw only
      try {
        saver = new Screensaver(next as SaverKind, next === 'lock' ? 2016 : next === 'orb' ? 2026 : 1997 + slideIdx);
        if (next === 'lock') { saver.clock = copy.lockClock; saver.waitingFrom = 3; }
        // the orb's own "press to continue" is the fiction's instruction; here the frame's foot line is the only one
      } finally { setFaceEra(prev); }
      resize();
    }
    if (next === 'advert' && advert) { advertHost.textContent = ''; stopAdvert = advert.mount(advertHost); }
  }

  function scheduleNext(): void {
    window.clearTimeout(slideTimer);
    const seconds = slide === 'card' ? copy.secondsCard : slide === 'advert' && advert ? advert.seconds : copy.secondsSaver;
    slideTimer = window.setTimeout(advance, slideMs(seconds));
  }

  function advance(): void {
    if (!root || !stage) return;
    const c = cycle();
    if (!c.length) return;
    stage.style.opacity = '0';
    window.clearTimeout(fadeTimer);
    fadeTimer = window.setTimeout(() => {
      if (!root || !stage) return;
      slideIdx = (slideIdx + 1) % c.length;
      showSlide(c[slideIdx]);
      stage.style.opacity = '1';
      scheduleNext();
    }, 500);
  }

  function resize(): void {
    if (!cvs) return;
    const aspect = Math.max(0.5, window.innerWidth / Math.max(1, window.innerHeight));
    cvs.width = Math.max(LOGICAL_H, Math.min(900, Math.round(LOGICAL_H * aspect)));
    cvs.height = LOGICAL_H;
  }

  function frame(now: number): void {
    raf = requestAnimationFrame(frame);
    if (!cvs || !saver) { last = now; return; }
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const g = cvs.getContext('2d');
    if (!g) return;
    saver.update(dt);
    const prev = faceEra();
    setFaceEra(saverFace);
    try { g.save(); saver.draw(g, cvs.width, cvs.height); g.restore(); } finally { setFaceEra(prev); }
  }

  // ── state changes ──
  function enterAttract(): void {
    state = 'attract';
    atHome = homeShowing();
    pressedBtn = null;
    build();
    if (!atHome) {
      // the piece underneath is HELD: the game menu's own freeze (the Leave page does the same)
      wasMenuOpen = gameMenuBus.isOpen;
      gameMenuBus.open();
      heldMenu = true;
    }
    setSilent(true);
    last = performance.now();
    raf = requestAnimationFrame(frame);
    // the first slide at once (no fade-in from nothing); the cycle fades between the rest
    slideIdx = 0;
    showSlide(cycle()[0]);
    scheduleNext();
  }

  function closeOverlay(): void {
    window.clearTimeout(slideTimer);
    window.clearTimeout(fadeTimer);
    cancelAnimationFrame(raf);
    stopAdvert?.(); stopAdvert = null;
    root?.remove();
    stopStars?.(); stopStars = null;
    root = stage = cvs = cardEl = footEl = advertHost = askEl = null;
    cardCvs = null;
    carryBtn = startBtn = null;
    saver = null;
  }

  /** dismiss everything and give the piece back: unheld, sound as it was, the clock reset */
  function resume(): void {
    closeOverlay();
    setSilent(false);
    if (heldMenu) { heldMenu = false; if (!wasMenuOpen) gameMenuBus.close(); }
    state = 'play';
    lastTouch = Date.now();
  }

  function showAsk(): void {
    if (!root) return;
    state = 'ask';
    if (footEl) footEl.style.display = 'none';
    root.style.cursor = 'default';
    const veil = el('div', {
      position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `rgba(${DIALOG.veilRGB}, 0.82)`
    }) as HTMLDivElement;
    const dialog = el('div', { width: 'min(440px, 92vw)', boxSizing: 'border-box', background: DIALOG.panel, color: DIALOG.ink, font: DIALOG.font }) as HTMLDivElement;
    domBevel(dialog);
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-labelledby', 'reinterp-attract-q');
    dialog.appendChild(el('div', { background: DIALOG.titleBar, color: DIALOG.titleInk, padding: '4px 8px', margin: '2px', fontWeight: '700', fontSize: '12px' }, copy.ask.titleBar));
    const panel = el('div', { padding: '16px 18px 16px' });
    const q = el('div', { fontSize: '16px', fontWeight: '700', margin: '0 0 6px' }, copy.ask.question);
    q.id = 'reinterp-attract-q';
    panel.appendChild(q);
    panel.appendChild(el('div', { fontSize: '12px', color: DIALOG.dim, margin: '0 0 14px' }, copy.ask.note));
    const mk = (label: string, act: string, emphasis: boolean): HTMLButtonElement => {
      const b = document.createElement('button');
      b.textContent = label;
      b.dataset.attractAct = act;
      Object.assign(b.style, {
        display: 'block', width: '100%', textAlign: 'left', font: 'inherit', fontWeight: emphasis ? '700' : '400', color: DIALOG.ink,
        background: DIALOG.panel, borderRadius: '0', padding: '10px 12px', margin: '0 0 8px', cursor: 'pointer', touchAction: 'manipulation'
      } as CSSStyleDeclaration);
      domBevel(b);
      return b;
    };
    startBtn = mk(copy.ask.start, 'start', false);
    carryBtn = mk(copy.ask.carryOn, 'carry', true);
    panel.appendChild(startBtn);
    panel.appendChild(carryBtn);
    dialog.appendChild(panel);
    veil.appendChild(dialog);
    root.appendChild(veil);
    askEl = veil;
    carryBtn.focus();   // the harmless one holds the focus
  }

  function backToAttract(): void {
    // a question left unanswered: the person has walked away. The cycle shows again; the 30-min count runs on.
    askEl?.remove(); askEl = null; carryBtn = startBtn = null;
    pressedBtn = null;
    state = 'attract';
    if (root) root.style.cursor = 'pointer';
    if (footEl && slide !== 'card' && slide !== 'advert') footEl.style.display = 'block';
  }

  // ── input: one clock, reset by real human input only ──
  touched = (): void => { if (state === 'play') lastTouch = Date.now(); };

  const TOUCH_TYPES = new Set(['pointerdown', 'touchstart', 'keydown', 'wheel']);
  const BEHIND_GLASS = new Set(['pointerup', 'pointermove', 'pointercancel', 'mousedown', 'mouseup', 'mousemove', 'touchmove', 'touchend', 'touchcancel', 'keyup', 'contextmenu', 'dblclick', 'auxclick']);

  function onInput(e: Event): void {
    if (leaving) return;
    if (state === 'play') {
      if (TOUCH_TYPES.has(e.type)) lastTouch = Date.now();
      else if (e.type === 'pointermove' && (e as PointerEvent).buttons > 0) lastTouch = Date.now();   // a camera drag
      return;
    }
    // ATTRACT or ASK: the piece is behind glass. Nothing below this line reaches it.
    if (TOUCH_TYPES.has(e.type)) {
      e.stopImmediatePropagation();
      if (state === 'attract') {
        // the touch that dismisses the cycle is not a button press: it is swallowed whole
        if (atHome) resume(); else { lastTouch = Date.now(); showAsk(); }
        return;
      }
      // state === 'ask': a person is here — the count restarts
      lastTouch = Date.now();
      if (e.type === 'keydown') {
        const k = e as KeyboardEvent;
        if (k.key === 'Escape') { e.preventDefault(); resume(); return; }
        if (k.key === 'Tab' && carryBtn && startBtn) {   // a two-button trap
          e.preventDefault();
          (document.activeElement === carryBtn ? startBtn : carryBtn).focus();
        }
        return;
      }
      if (e.type === 'pointerdown') pressedBtn = (e.target as Element | null)?.closest?.('[data-attract-act]') ?? null;
      return;
    }
    if (e.type === 'click') {
      e.stopImmediatePropagation();
      if (state !== 'ask') return;
      lastTouch = Date.now();
      const btn = (e.target as Element | null)?.closest?.('[data-attract-act]') as HTMLElement | null;
      if (!btn) return;
      // a click counts only if its press began on the same button (or came from the keyboard): the tap that opened
      // the question must not fall through onto a button under the finger
      const kb = (e as MouseEvent).detail === 0;
      if (!kb && pressedBtn !== btn) return;
      if (btn.dataset.attractAct === 'start') startAgain(); else resume();
      return;
    }
    if (BEHIND_GLASS.has(e.type)) e.stopImmediatePropagation();
  }
  const ALL = [...TOUCH_TYPES, ...BEHIND_GLASS, 'click'];
  for (const t of ALL) window.addEventListener(t, onInput, { capture: true, passive: true });
  window.addEventListener('resize', () => { if (state !== 'play') resize(); });

  // ── the clock ──
  const tick = (): void => {
    if (leaving) return;
    const idle = Date.now() - lastTouch;
    if (idle >= RETURN_MS) { freshVisit(); return; }
    // ⚑ in a headset there is no overlay: the clock only runs to the return
    if (xrSession?.active()) return;
    if (state === 'play' && idle >= ATTRACT_MS) enterAttract();
    else if (state === 'ask' && idle >= ATTRACT_MS) backToAttract();
  };
  window.setInterval(tick, Math.min(1000, Math.max(100, ATTRACT_MS / 10)));

  if (opts.debug) {
    // review handle (?debug=1 only): read the state, or jump to a slide
    (window as unknown as { __attract?: unknown }).__attract = {
      state: () => state,
      slide: () => slide,
      atHome: () => atHome,
      idleMs: () => Date.now() - lastTouch,
      show: (name: SlideName) => { if (state !== 'play') { window.clearTimeout(slideTimer); window.clearTimeout(fadeTimer); showSlide(name); } },
      advertSlot: () => !!advert
    };
  }

  return { get state() { return state; } };
}
