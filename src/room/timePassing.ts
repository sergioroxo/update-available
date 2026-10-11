/**
 * ⚑ S229 / W1-C13 — TIME PASSING, SEEN. Walkthrough 1: "The transition from 1997 to 2003 wasn't clear" — the lead:
 * "some uncertainty of the time passing… maybe it needs some details morphing to make it look like time is passing".
 * His standing rule (CLAUDE.md, R28 amendment 1 as revised 2026-10-10): the piece does not expect anyone to look
 * around, it takes the viewer there. So the years are put in front of them twice, and neither asks anything:
 *
 *  1. THE CALENDAR TURNS. For the length of the E1→E2 cascade the wall calendar is flipped a year at a time —
 *     1997 → 1998 → … → 2003 — one page per step (the two authored pages at the ends, calendarArt.ts's
 *     `drawFlipPage` between), written into the live page texture of the 2003 calendar that the cascade has just
 *     put on the nail. Nothing is added to the scene, no draw call, no entity; one small canvas re-uploaded on the
 *     seven steps, not per frame.
 *  2. A YEAR COUNTER. The camera is across the room while the calendar turns, so a page is too small to read from
 *     there. A small frame-voice counter (FRAME ink, like frame/call.ts's button) counts the same years in DOM and
 *     fades out when it reaches 2003. It never takes a press (pointer-events: none) and never gates anything.
 *     In a headset there is no DOM overlay, so it is not shown — the calendar's own turn is the cue there.
 *
 * It runs inside the existing morph (the same seconds), starts when the cascade does, and `settle()` — called by
 * the relocation's skip — lands on the true 2003 page and puts the counter away at once.
 */
import * as pc from 'playcanvas';
import { drawCalendarPage, drawFlipPage } from './calendarArt';
import { FRAME } from '../desktop/theme/chrome';
import strings from '../../data/strings/timePassing.json';

const FIRST = 1997;
const LAST = 2003;
const N = LAST - FIRST;
const PAGE_ENTITY = 'calendar2003-page';
/** the last year lands this fraction of the way through the cascade; the counter holds, then fades */
const LAST_AT = 0.9;
const HOLD = 1.0;
const FADE = 0.8;

export interface TimePassing {
  /** arm it: the cascade starts `delay` s from now and lasts `duration` s. Restarts if already armed. */
  begin(delay: number, duration: number): void;
  tick(dt: number): void;
  /** the skip / any settle: the true 2003 page, the counter gone. Harmless when nothing is armed. */
  settle(): void;
  readonly active: boolean;
  readonly el: HTMLElement;
}

export function createTimePassing(app: pc.AppBase, xrActive: () => boolean): TimePassing {
  const el = document.createElement('div');
  el.id = 'reinterp-year';
  Object.assign(el.style, {
    position: 'fixed', left: '50%', top: 'calc(16px + env(safe-area-inset-top, 0px))', transform: 'translateX(-50%)',
    zIndex: '11', font: '22px/1.2 monospace', letterSpacing: '0.08em', padding: '8px 16px', borderRadius: '4px',
    background: FRAME.glass, color: FRAME.bright, border: `1px solid ${FRAME.edge}`,
    opacity: '0', pointerEvents: 'none', transition: 'opacity 0.3s', userSelect: 'none'
  } as CSSStyleDeclaration);
  el.setAttribute('aria-live', 'polite');
  document.body.appendChild(el);

  let armed = false;
  let delay = 0;
  let dur = 7;
  let t = 0;
  let counterStep = -1;
  let pageStep = -1;
  let shown = false;

  /** the 2003 calendar's page canvas, once the cascade has put the calendar on its nail */
  function pageCanvas(): { ctx: CanvasRenderingContext2D; tex: pc.Texture } | null {
    const e = app.root.findByName(PAGE_ENTITY);
    if (!(e instanceof pc.Entity) || !e.render) return null;
    const mi = e.render.meshInstances[0];
    const tex = (mi?.material as pc.StandardMaterial | undefined)?.diffuseMap;
    const canvas = tex?.getSource() as HTMLCanvasElement | undefined;
    const ctx = canvas?.getContext?.('2d');
    return tex && ctx ? { ctx, tex } : null;
  }
  function drawYear(i: number): boolean {
    const p = pageCanvas();
    if (!p) return false;
    if (i <= 0) drawCalendarPage(p.ctx, 'e1');
    else if (i >= N) drawCalendarPage(p.ctx, 'e2');
    else drawFlipPage(p.ctx, FIRST + i, i / N);
    p.tex.upload();
    return true;
  }
  function setCounter(i: number): void {
    el.textContent = strings.year.replace('{year}', String(FIRST + i));
  }
  function show(on: boolean, fadeSeconds = 0.3): void {
    el.style.transition = `opacity ${fadeSeconds}s`;
    el.style.opacity = on && !xrActive() ? '1' : '0';
    shown = on;
  }

  return {
    get active(): boolean { return armed; },
    el,
    begin(d: number, duration: number): void {
      armed = true; delay = Math.max(0, d); dur = Math.max(1, duration); t = 0; counterStep = -1; pageStep = -1;
      show(false, 0.01);
    },
    tick(dt: number): void {
      if (!armed) return;
      t += dt;
      const c = t - delay;
      if (c < 0) return;
      // which year the clock has reached: even steps across 0 … LAST_AT of the cascade
      const want = Math.min(N, Math.floor((c / (dur * LAST_AT)) * N + 1e-6));
      if (counterStep < 0) { setCounter(0); show(true); counterStep = 0; }
      if (want !== counterStep) { setCounter(want); counterStep = want; }
      // the page is written once the calendar is on its nail (the cascade spawns it as it begins)
      if (want !== pageStep && drawYear(want)) pageStep = want;
      if (counterStep === N && c >= dur * LAST_AT + HOLD) {
        if (shown) show(false, FADE);
        if (c >= dur * LAST_AT + HOLD + FADE && pageStep === N) armed = false;
      }
      if (xrActive()) el.style.opacity = '0';
    },
    settle(): void {
      if (!armed) return;
      armed = false;
      if (t >= delay) drawYear(N);
      show(false, 0.2);
    }
  };
}
