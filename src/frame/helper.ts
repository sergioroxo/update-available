/** Controls-only frame reminder. Narrative directions belong to Lamby; the Start menu holds the list.
 * Existing silence/idle/menu gates still apply, including the XR frame plate. */
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
  /** ⚑ S219 / W1-B6 — a multiplier on the idle wait: at a computer people stand still reading far longer
   *  than on a phone or in a headset, so the line waits longer there (1 = the data's own seconds) */
  idleScale?: () => number;
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
    el.textContent = mapData.controlsHint;
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
      if (!opts.enabled() || gameMenuBus.isOpen) { hide(); idle = 0; return; }
      // the map is derived from the whole ledger; twice a second is plenty
      pollT += dt;
      if (pollT >= 0.5 || !polled) { pollT = 0; polled = true; last = opts.hint(); }
      const h = last;
      if (!h || h.quiet) { hide(); idle = 0; return; }
      // the beat moved on: whatever was up is stale
      if (shown && shownKey !== h.key) hide();
      if (forced) return;
      idle += dt;
      if (!shown && idle >= H.idleSeconds * (opts.idleScale?.() ?? 1)) show(h);
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
