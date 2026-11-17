/**
 * ⚑ S400 (UiB job 29 Part C) — THE GAME ON ITS ERA WEBSITE. His words (16 Nov): "They are Optional, you are not supposed
 * to play the game in 2026, it is just a suggestion of Lamby … also we should add all the games in the Close HTML's".
 *
 * Each year's page (public/sites/<year>/index.html, tools/gen_era_sites.mjs) carries its game in its Media tab, drawn in
 * the year's own device (the handheld, the flip phone, the 2016 phone, the console), and one script, `game.js` beside the
 * page, built from THE PIECE'S OWN GAME CODE by tools/build-site-games.mjs. Nothing about the game is rewritten for the
 * web: the same class the room's device holds runs here. This file is what the room's device does for it (heldDevice.ts):
 * tick it, draw it when its frame key changes, hand it the presses.
 *
 * THE PAGE'S LAWS (check-era-sites.mjs checks the page and the script):
 *   · no request and no storage: the script draws on its own canvas and plays live Web Audio (FloppySheep's song is the
 *     site's own file, the one its Media tab already plays); a run's filing line is taken and dropped — nothing is kept;
 *   · it runs only while it can be seen: a hidden tab, a closed panel or a page scrolled past stops the clock (the game
 *     waits where it was), so a page left open costs nothing;
 *   · a tap is resolved on release, behind the piece's own 10 px / 1.2 s threshold (R28 §3), so a thumb that scrolls the
 *     page over the glass does not play;
 *   · the keyboard reaches the game only while the device has focus (a press on it gives it focus): arrows or WASD are
 *     the d-pad, Space or Z is A, X is B, Enter is START — the piece's own map (app.ts, S219). Anywhere else on the page
 *     the keys scroll and tab as they always do.
 */
import type { DeviceGame, GameKey } from '../games/types';
import { siteSound } from './sound';
import { setAudioBase } from './shims/tapeAudio';

export interface Mount { root: HTMLElement; glass: HTMLCanvasElement }

/** the page's game: the element marked data-game, and its canvas */
export function findMount(id: string): Mount | null {
  const root = document.querySelector<HTMLElement>(`[data-game="${id}"]`);
  const glass = root?.querySelector<HTMLCanvasElement>('canvas.glass') ?? null;
  if (!root || !glass) return null;
  const audio = root.getAttribute('data-audio');
  if (audio) setAudioBase(audio);
  bindSound(root);
  // the Story tab's "Play it on this page" is a label that opens the Media tab without a script; with one, it also
  // brings the game into view
  const section = root.closest('section') ?? root;
  const smooth = typeof window.matchMedia === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (const l of document.querySelectorAll<HTMLLabelElement>('label.golink')) {
    l.addEventListener('click', () => { setTimeout(() => section.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' }), 0); });
  }
  return { root, glass };
}

/** the page's Sound button: its words come from the page (data-on / data-off), so they are data, not code */
function bindSound(root: HTMLElement): void {
  const b = root.querySelector<HTMLButtonElement>('button[data-sound]');
  if (!b) return;
  const paint = (): void => {
    b.textContent = (siteSound.on ? b.dataset.on : b.dataset.off) ?? '';
    b.setAttribute('aria-pressed', siteSound.on ? 'true' : 'false');
  };
  b.addEventListener('click', () => { siteSound.set(!siteSound.on); paint(); });
  b.hidden = false;
  paint();
}

const KEYS: Record<string, GameKey> = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  a: 'left', A: 'left', d: 'right', D: 'right', w: 'up', W: 'up', s: 'down', S: 'down',
  ' ': 'a', z: 'a', Z: 'a', x: 'b', X: 'b', Enter: 'start'
};
const isKey = (k: string | undefined): k is GameKey => k === 'left' || k === 'right' || k === 'up' || k === 'down' || k === 'a' || k === 'b' || k === 'start';

export interface InputHandlers {
  /** a tap on the glass, in the canvas's own pixels (backing store) */
  tap(x: number, y: number): void;
  key(k: GameKey): void;
}

/**
 * The presses, wired once: the glass (a tap resolved on release), the device's buttons (data-key) and the keyboard while
 * the device has focus. Every press first arms the page's sound (a real gesture).
 */
export function wireInput(m: Mount, h: InputHandlers): void {
  const { root, glass } = m;
  let down: { id: number; x: number; y: number; t: number } | null = null;
  // (the glass is focusable, tabindex 0: a press on it gives it focus by itself, without a focus ring)
  glass.addEventListener('pointerdown', (e) => { down = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() }; });
  glass.addEventListener('pointercancel', () => { down = null; });
  glass.addEventListener('pointerup', (e) => {
    const d = down; down = null;
    if (!d || d.id !== e.pointerId) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10 || performance.now() - d.t > 1200) return;
    const r = glass.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    siteSound.arm();
    h.tap((e.clientX - r.left) * glass.width / r.width, (e.clientY - r.top) * glass.height / r.height);
  });
  for (const b of root.querySelectorAll<HTMLButtonElement>('button[data-key]')) {
    const k = b.dataset.key;
    if (!isKey(k)) continue;
    b.addEventListener('click', () => { siteSound.arm(); h.key(k); });
  }
  root.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = KEYS[e.key];
    if (!k) return;
    const t = e.target as HTMLElement | null;
    // a focused button already answers Space and Enter with its own click; never twice
    if (t && t.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
    e.preventDefault();
    siteSound.arm();
    h.key(k);
  });
}

/**
 * The clock: one animation frame at a time, and only while the glass can be seen (on screen, its panel open, the tab in
 * front). `step(dt)` advances and draws; it is never handed more than a tenth of a second, and a return from hiding
 * starts again from zero, so the game waits where it was rather than jumping.
 */
export function runClock(glass: HTMLElement, step: (dt: number) => void): void {
  let raf = 0, last = 0, onScreen = false;
  const frame = (t: number): void => {
    raf = 0;
    const dt = last ? Math.min(0.1, Math.max(0, (t - last) / 1000)) : 0;
    last = t;
    step(dt);
    schedule();
  };
  const schedule = (): void => {
    if (raf) return;
    if (!onScreen || document.hidden) { last = 0; return; }
    raf = requestAnimationFrame(frame);
  };
  if (typeof IntersectionObserver === 'function') {
    new IntersectionObserver((es) => { onScreen = es.some((x) => x.isIntersecting); schedule(); }).observe(glass);
  } else onScreen = true;
  document.addEventListener('visibilitychange', schedule);
  schedule();
}

/**
 * Sharp when the glass is shown at its own size or larger (pixels stay square), smooth when a big screen is shown
 * smaller than itself (MATCH MADE SIMPLE's 960 × 540 in a page column): nearest-neighbour shrinking would drop whole
 * rows of the 5×7 type.
 */
function watchScale(glass: HTMLCanvasElement): void {
  const set = (): void => {
    const w = glass.getBoundingClientRect().width * (window.devicePixelRatio || 1);
    glass.style.imageRendering = w + 0.5 >= glass.width ? 'pixelated' : 'auto';
  };
  if (typeof ResizeObserver === 'function') new ResizeObserver(set).observe(glass);
  window.addEventListener('resize', set);
  set();
}

/** a DeviceGame (FIT IN, CLEAR, MATCH MADE SIMPLE) on its page: the room's held device, without the room */
export function runDeviceGame(id: string, make: () => DeviceGame): void {
  const m = findMount(id);
  if (!m) return;
  const game = make();
  const { glass } = m;
  glass.width = game.w; glass.height = game.h;
  const ctx = glass.getContext('2d');
  if (!ctx) return;
  watchScale(glass);
  wireInput(m, {
    tap: (x, y) => game.tap?.(Math.floor(x), Math.floor(y)),
    key: (k) => game.key?.(k)
  });
  let shown = '';
  const draw = (): void => {
    const k = game.frameKey();
    if (k === shown) return;
    shown = k;
    game.draw(ctx);
  };
  runClock(glass, (dt) => {
    game.tick(dt);
    // the piece files one line when a run ends; a web page keeps nothing, so the line is taken and dropped
    game.takeFiling();
    draw();
  });
  draw();
  m.root.classList.add('live');
}
