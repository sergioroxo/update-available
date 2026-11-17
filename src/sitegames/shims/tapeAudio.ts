/**
 * ⚑ S400 — stands in for src/audio/tapeAudio.ts in the era websites' game builds (tools/build-site-games.mjs). The
 * games use three of its calls: `announceCue` (the piece's caption strip — there is none on the page), `playOnce`
 * (FloppySheep's song, a file the site already serves from assets/audio/ and credits on its Media tab) and `stopClip`.
 * The file is the project's own, loaded from the same folder as the page's other sound, and only after a press.
 */
import { siteSound } from '../sound';

/** where the page's sound files are, relative to the page (the shell reads it from the page: data-audio) */
let base = 'assets/audio/';
export function setAudioBase(path: string): void { base = path; }

const live = new Set<HTMLMediaElement>();
siteSound.subscribe(() => { for (const a of live) a.muted = siteSound.muted(); });

export function announceCue(_name: string): void { /* no caption strip on the page */ }

export function playOnce(name: string | null | undefined): HTMLAudioElement | null {
  if (!name || !/^[a-z0-9_-]+\.mp3$/i.test(name)) return null;
  const a = new Audio(base + name);
  a.muted = siteSound.muted();
  live.add(a);
  const forget = (): void => { live.delete(a); };
  a.addEventListener('ended', forget);
  a.addEventListener('error', forget);
  a.play().catch(() => { /* autoplay policy or a headless harness — never a thrown error */ });
  return a;
}

export function stopClip(a: HTMLMediaElement | null): void {
  if (!a) return;
  a.loop = false;
  a.pause();
  live.delete(a);
}
