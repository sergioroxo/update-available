/**
 * ⚑ S227 — THE CALL (his rule, 2026-10-10, CLAUDE.md R28 amendment 1 revised: "we should not expect people to look
 * around at any part, we need to take the viewer there"; and his pattern for the Commons: "a button can pop up saying
 * 'someone is calling you — press to go', so the person doesn't get startled").
 *
 * When the story's next step is a thing in the room away from the screen in front of her (2016's phone on its stand,
 * 2026's headset on the desk), a small button appears, in the frame's plain voice, and pressing it does exactly what
 * pressing the object does: the phone comes to the eye, the headset goes on. Looking for the object stays possible;
 * it is never required. Nothing is filed by the call itself. Words: data/strings/calls.json.
 */
import { FRAME } from '../desktop/theme/chrome';

export interface CallSpec { id: string; text: string; act: () => void }

export function mountCall(opts: { current: () => CallSpec | null; enabled: () => boolean }): { tick(dt: number): void; el: HTMLButtonElement } {
  const el = document.createElement('button');
  el.id = 'reinterp-call';
  Object.assign(el.style, {
    position: 'fixed', left: '50%', bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))', transform: 'translateX(-50%)',
    zIndex: '11', font: '14px/1.4 monospace', padding: '10px 16px', minHeight: '44px', borderRadius: '4px',
    background: FRAME.glass, color: FRAME.bright, border: `1px solid ${FRAME.edge}`, cursor: 'pointer',
    maxWidth: 'min(520px, 86vw)', opacity: '0', pointerEvents: 'none', transition: 'opacity 0.4s'
  } as CSSStyleDeclaration);
  document.body.appendChild(el);
  let shown: CallSpec | null = null;
  let since = 0;
  let poll = 0;
  let want: CallSpec | null = null;
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    const s = shown;
    hide();
    s?.act();
  });
  const hide = (): void => { shown = null; el.style.opacity = '0'; el.style.pointerEvents = 'none'; };
  return {
    el,
    tick(dt: number): void {
      poll += dt;
      if (poll >= 0.5) {
        poll = 0;
        const next = opts.enabled() ? opts.current() : null;
        if (next?.id !== want?.id) { want = next; since = 0; }
      }
      if (!want) { if (shown) hide(); return; }
      since += dt;
      // a short beat first, so the call never lands on top of the line that announced the thing
      if (!shown && since >= 3) {
        shown = want;
        el.textContent = want.text;
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
      }
    }
  };
}
