/**
 * ⚑ S364 (UiB job 14, Part B7 — "the AI offers the game") — THE CONSOLE SESSION: one running MATCH MADE SIMPLE, two
 * surfaces. The console on Maya's bed (src/room/handheld.ts 'e_console', the shared grammar of heldDevice.ts) and the
 * monitor's window (src/desktop/apps/browser.ts) both show — and both play — THIS game instance. A tap on either changes
 * both; the game ticks once per frame, in the room's frame (the held device's tick), never in the window — so it cannot
 * be ticked twice when both are visible.
 *
 * - LIGHTING. The console was gated "once her file holds two entries". It is now gated on `light()`: the AI's offer
 *   ("I've put it on your console") lights it, whether she answers Okay or Not now. Until then it shows its dark home
 *   screen. Nothing in the story waits on it; the walker never needs it (it presses the monitor's published rects).
 * - TICKING. A game ticks while it is in hand (as before), and — new — while the console is lit (so the picture on the
 *   bed moves and the monitor's window is live), or for a second after the monitor last drew it. Only in 2026's era
 *   (the held device's own era gate).
 * - RESTART. buildDevices() calls `_reset()`: a fresh game, unlit, not ready.
 * - WHAT THE AI MAY SAY. `stats` (matches made, cumulative across the game's own restarts; the game's % — it never
 *   passes 99) and `playing` (a tap or key on either surface within ~6 s).
 * Memory only: nothing here is stored, nothing is sent.
 */
import { MatchMade } from '../games/matchMade';
import type { DeviceGame, GameKey } from '../games/types';
import type { Painter } from './calendarArt';

export interface ConsoleSession {
  /** the 2026 console exists and its game can run (the room is built) */
  readonly ready: boolean;
  /** the console on the bed shows the game (lit) rather than its dark home screen */
  readonly lit: boolean;
  /** light the console on the bed with the game (the AI "put it on your console"); idempotent */
  light(): void;
  /** paint the CURRENT frame of the same running game into a 2D canvas rect (keep 16:9 inside it; letterbox) */
  draw(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void;
  /** a press at normalised game coords (0..1, 0..1) — the monitor window's taps; same effect as a tap on the console's glass */
  tap(u: number, v: number): void;
  /** changes whenever the picture changes (so the monitor re-uploads only then) */
  frameKey(): string;
  /** for the AI's comments: matches made so far this session, and the game's own progress percent (whatever the game shows as its % — read matchMade.ts; it never passes 99) */
  readonly stats: { matches: number; percent: number };
  /** true while someone is actively playing (a tap within the last ~6 s on either surface) */
  readonly playing: boolean;
}

/** what the room's held device uses: not part of the interface the chat codes against */
export interface ConsoleSessionInternal extends ConsoleSession {
  /** the one game, wrapped so every tap/key on the glass is seen; created on first need */
  heldGame(): DeviceGame;
  /** does the console tick while it lies on the bed (lit, or the monitor drew it a moment ago) */
  ticksUnheld(): boolean;
  /** review only: the game's own probe (legal move, tile positions) */
  probe(): MatchMade['probe'] | null;
  _built(on: boolean): void;
  _reset(): void;
}

const GW = 960, GH = 540;
const PLAYING_MS = 6000;
const VIEWED_MS = 1000;
const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function makeSession(): ConsoleSessionInternal {
  let game: MatchMade | null = null;
  let wrapped: DeviceGame | null = null;
  let built = false, lit = false;
  let lastAct = -1e9, lastDraw = -1e9;
  let earnedSeen = 0, matches = 0;
  // the monitor's own copy of the picture: the game draws into a 960 × 540 canvas once per change, then it is scaled
  let cv: HTMLCanvasElement | null = null, cx: CanvasRenderingContext2D | null = null, drawnKey = '\0';

  const g = (): MatchMade => { if (!game) { game = new MatchMade(); earnedSeen = 0; matches = 0; } return game; };
  const sample = (): void => {
    if (!game) return;
    const e = game.probe.s.earned;
    if (e > earnedSeen) matches += e - earnedSeen;
    earnedSeen = e;                       // a restart inside the game drops it to 0: the count keeps what was made
  };
  const act = (): void => { lastAct = now(); };

  const s: ConsoleSessionInternal = {
    get ready() { return built; },
    get lit() { return lit; },
    light() { lit = true; g(); },
    draw(ctx, x, y, w, h) {
      const m = g();
      lastDraw = now();
      if (!cv) { cv = document.createElement('canvas'); cv.width = GW; cv.height = GH; cx = cv.getContext('2d'); }
      if (!cx) return;
      const k = m.frameKey();
      if (k !== drawnKey) { drawnKey = k; m.draw(cx as unknown as Painter); }
      const sc = Math.min(w / GW, h / GH);
      const dw = Math.floor(GW * sc), dh = Math.floor(GH * sc);
      const dx = Math.floor(x + (w - dw) / 2), dy = Math.floor(y + (h - dh) / 2);
      const was = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = sc < 1;      // a downscale is smoothed; an upscale stays hard-edged
      ctx.drawImage(cv, dx, dy, dw, dh);
      ctx.imageSmoothingEnabled = was;
    },
    tap(u, v) {
      g().tap(Math.max(0, Math.min(GW - 1, u * GW)), Math.max(0, Math.min(GH - 1, v * GH)));
      act(); sample();
    },
    frameKey() { return `${lit ? 1 : 0}|${game ? game.frameKey() : '-'}`; },
    get stats() {
      sample();
      return { matches, percent: game ? Math.min(99, game.probe.s.score) : 0 };
    },
    get playing() { return now() - lastAct < PLAYING_MS; },
    heldGame() {
      if (wrapped) return wrapped;
      const m = g();
      wrapped = {
        w: m.w, h: m.h,
        tick: (dt) => { m.tick(dt); sample(); },
        draw: (c) => m.draw(c),
        frameKey: () => m.frameKey(),
        key: (k: GameKey) => { m.key(k); act(); },
        tap: (x, y) => { m.tap(x, y); act(); sample(); },
        takeFiling: () => m.takeFiling(),
        // the pick-up's own START: only on the title screen (a run already going on the monitor must not open its menu)
        wake: () => { if (m.probe.s.state === 'title') m.key('start'); }
      };
      return wrapped;
    },
    ticksUnheld() { return lit || now() - lastDraw < VIEWED_MS; },
    probe() { return game ? game.probe : null; },
    _built(on) { built = on; },
    _reset() { game = null; wrapped = null; built = false; lit = false; lastAct = lastDraw = -1e9; earnedSeen = 0; matches = 0; drawnKey = '\0'; }
  };
  return s;
}

const session = makeSession();
export const consoleSession: ConsoleSession = session;
/** for src/room/handheld.ts only */
export const consoleSessionInternal: ConsoleSessionInternal = session;
