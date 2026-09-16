/**
 * ⚑ THE HELPER — the map's current hint, in frame chrome, when the player has
 * stalled (S145, 2026-09-16; docs/reinterp/THE_WITNESS_SYSTEM_PLAN_2026-09-16.md §3C).
 *
 * Sérgio: "there should be a helper system for people to know what to do
 * next." The piece already has two guiding voices and both are the
 * apparatus's (Era 1's side-messages, Lamby's conduction) — they can only say
 * what the apparatus wants. This is the frame's: one plain line, the same
 * idiom as `moveHint` (fixed DOM, never on the monitor texture), that says
 * what the piece is waiting on. It appears when
 *   (i)  nothing has been pressed or dragged for `idleSeconds` (data) while
 *        the current beat is not `quiet`, or
 *   (ii) the player resumes from the menu's map (`gameMenuBus.showHint`).
 * Any press, drag or key hides it and restarts the clock; a beat change
 * hides it. It never appears during a `quiet` beat (felt / respite / the
 * Close), never while the menu is open, and it files nothing.
 *
 * ⚑ The click/tap law's "no timers" forbids PRESSURE on the clock. An idle
 * helper is the opposite: it waits for the player to stop, then offers. It is
 * documented as the one clock in the frame, and it never counts down at anyone.
 */
import { gameMenuBus } from '../state/gameMenuBus';
import mapData from '../../data/strings/map.json';
import { FRAME } from '../desktop/theme/chrome';

export interface HelperHint { text: string; where?: string; quiet: boolean; key: string }

export interface Helper {
  /** once per frame */
  tick(dt: number): void;
  /** the player did something — hide, and restart the idle clock */
  activity(): void;
  /** the line on screen right now, or null — the headset's plate draws the same line (xrFrame) */
  text(): string | null;
  destroy(): void;
}

const H = (mapData as unknown as { helper: { idleSeconds: number; prefix: string } }).helper;

export function mountHelper(opts: {
  /** the map's current hint, or null when the piece is not waiting on the player */
  hint: () => HelperHint | null;
  /** false while the fiction has not started, or the engine is paused */
  enabled: () => boolean;
}): Helper {
  const el = document.createElement('div');
  el.id = 'reinterp-helper';
  Object.assign(el.style, {
    position: 'fixed', left: '50%', bottom: '14%', transform: 'translateX(-50%)',
    zIndex: '9', background: FRAME.glass, color: FRAME.ink,
    font: '12px monospace', padding: '6px 12px', borderRadius: '4px',
    maxWidth: 'min(520px, 86vw)', textAlign: 'center', lineHeight: '1.5',
    opacity: '0', pointerEvents: 'none', transition: 'opacity 0.4s'
  } as CSSStyleDeclaration);
  document.body.appendChild(el);

  let idle = 0;
  let shown = false;
  let shownKey: string | null = null;
  let forced = false;   // shown by request (the map's Resume) — stays until the next press
  let pollT = 0;
  let polled = false;
  let last: HelperHint | null = null;

  const hide = (): void => {
    if (!shown) return;
    shown = false; forced = false;
    el.style.opacity = '0';
  };
  const show = (h: HelperHint): void => {
    el.textContent = `${H.prefix} ${h.text}${h.where ? `  (${h.where})` : ''}`;
    shownKey = h.key;
    shown = true;
    el.style.opacity = '1';
  };

  const onActivity = (): void => { idle = 0; hide(); };
  const onPointer = (e: PointerEvent): void => { if (e.type === 'pointerdown' || e.buttons) onActivity(); };
  window.addEventListener('pointerdown', onPointer, true);
  window.addEventListener('pointermove', onPointer, true);
  window.addEventListener('keydown', onActivity, true);
  window.addEventListener('wheel', onActivity, { capture: true, passive: true });

  gameMenuBus.showHint = () => {
    const h = opts.hint();
    if (!h || h.quiet) return;
    forced = true;
    show(h);
  };

  return {
    tick(dt: number): void {
      if (!opts.enabled() || gameMenuBus.isOpen) { if (shown && !forced) hide(); idle = 0; return; }
      // the map is derived from the whole ledger; twice a second is plenty
      pollT += dt;
      if (pollT >= 0.5 || !polled) { pollT = 0; polled = true; last = opts.hint(); }
      const h = last;
      if (!h || h.quiet) { hide(); idle = 0; return; }
      // the beat moved on: whatever was up is stale
      if (shown && shownKey !== h.key) hide();
      if (forced) return;
      idle += dt;
      if (!shown && idle >= H.idleSeconds) show(h);
    },
    activity: onActivity,
    text(): string | null { return shown ? el.textContent : null; },
    destroy(): void {
      window.removeEventListener('pointerdown', onPointer, true);
      window.removeEventListener('pointermove', onPointer, true);
      window.removeEventListener('keydown', onActivity, true);
      window.removeEventListener('wheel', onActivity, true);
      gameMenuBus.showHint = null;
      el.remove();
    }
  };
}
