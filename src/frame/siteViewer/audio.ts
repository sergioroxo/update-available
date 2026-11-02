/**
 * ⚑ S291 — the viewer's one audio element: the Media tab's tracks (project-owned, credited on the page) play on a press and
 * stop on a press. Same-origin static files, routed through the mixer like every other sound (audio/mix.ts), so the
 * menu's volume and mute apply. Memory only; one track at a time; it stops when the window closes.
 */
import { track } from '../../audio/mix';

let el: HTMLAudioElement | null = null;
let current: string | null = null;
let onChange: () => void = () => {};

export const viewerAudio = {
  setListener(fn: () => void): void { onChange = fn; },
  playing(): string | null { return current; },
  toggle(file: string): void {
    if (current === file) { this.stop(); return; }
    this.stop();
    el = track(new Audio(file), file.split('/').pop()?.replace(/\.[a-z0-9]+$/, '') ?? null, 'music');
    current = file;
    el.addEventListener('ended', () => { current = null; onChange(); });
    el.addEventListener('error', () => { current = null; onChange(); });
    void el.play().catch(() => { current = null; onChange(); });
    onChange();
  },
  stop(): void {
    if (el) { el.pause(); el.src = ''; el = null; }
    if (current) { current = null; onChange(); }
  }
};
