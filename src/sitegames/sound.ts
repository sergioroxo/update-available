/**
 * ⚑ S400 (UiB job 29 Part C) — THE ERA WEBSITE'S ONE MUTE, for the game on that page (public/sites/<year>/game.js,
 * built by tools/build-site-games.mjs). In the piece the games obey the frame's one mute (gameMenuBus.soundMuted) and
 * the mixer's levels (audio/mix.ts); on a web page there is neither, so the build points those two modules at
 * src/sitegames/shims/, which read this.
 *
 * Two rules, both the page's:
 *   · NOTHING SOUNDS BEFORE A PRESS ON THE GAME. Until the visitor has pressed the device once, the games are told
 *     they are muted, so no AudioContext is even made (a browser would refuse one without a gesture anyway).
 *   · AFTER THAT, THE PAGE'S SOUND BUTTON DECIDES. It starts on; the visitor can turn it off. Nothing is stored:
 *     a reload starts again from the beginning.
 */
type Listener = () => void;
const listeners = new Set<Listener>();
let pressed = false;
let wanted = true;

export const siteSound = {
  /** what the games read: true until the first press, then the visitor's choice */
  muted(): boolean { return !pressed || !wanted; },
  /** the visitor's choice, for the page's button */
  get on(): boolean { return wanted; },
  /** the first press on the device (a real gesture: the audio may start) */
  arm(): void { if (pressed) return; pressed = true; emit(); },
  set(on: boolean): void { if (wanted === on) return; wanted = on; emit(); },
  subscribe(fn: Listener): () => void { listeners.add(fn); return () => { listeners.delete(fn); }; }
};
function emit(): void { for (const fn of listeners) { try { fn(); } catch { /* a listener's fault is its own */ } } }
