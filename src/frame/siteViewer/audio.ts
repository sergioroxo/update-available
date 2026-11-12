/**
 * ⚑ S291 — the viewer's one audio element: the Media tab's tracks (project-owned, credited on the page) play on a press and
 * stop on a press. Same-origin static files, routed through the mixer like every other sound (audio/mix.ts), so the
 * menu's volume and mute apply. Memory only; one track at a time; it stops when the window closes.
 *
 * ⚑ S371 (UiB job 17 Part A; his 11 Nov: "make sure all the audios are playable in the close source websites") — and the
 * viewer's one FILM (`viewerFilm`): a video element that is never put on the page. The window draws its frames on its own
 * canvas (core.ts), in the browser and in the headset (xrMount.ts gives the film's rect a plane of its own, so only that
 * rect is uploaded while it plays). One thing plays at a time: a track stops the film, a film stops the track. Each file
 * is put under the mixer by its own name, so it plays at the level the piece measured for it (src/audio/levels.json).
 */
import { track } from '../../audio/mix';

type Listener = () => void;
const listeners = new Set<Listener>();
const notify = (): void => { for (const fn of [...listeners]) fn(); };
/** the shipped file's own name (the mixer's key for its channel and its measured level) */
const nameOf = (file: string): string => file.split('/').pop() ?? file;

let el: HTMLAudioElement | null = null;
let current: string | null = null;

export const viewerAudio = {
  /** a mount listens for a track or a film starting, pausing or ending (both mounts do; each repaints its own window) */
  setListener(fn: Listener): void { listeners.add(fn); },
  playing(): string | null { return current; },
  toggle(file: string): void {
    if (current === file) { this.stop(); return; }
    this.stop();
    viewerFilm.stop();   // one thing at a time
    const a = track(new Audio(file), nameOf(file), 'music');
    el = a;
    current = file;
    a.addEventListener('ended', () => { if (el === a) { current = null; notify(); } });
    a.addEventListener('error', () => { if (el === a) { current = null; notify(); } });
    void a.play().catch(() => { if (el === a) { current = null; notify(); } });
    notify();
  },
  stop(): void {
    if (el) { el.pause(); el.src = ''; el = null; }
    if (current) { current = null; notify(); }
  }
};

export type FilmState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

let video: HTMLVideoElement | null = null;
let filmFile: string | null = null;
let filmState: FilmState = 'idle';
/**
 * advances once per new picture of the film: its clock, counted in thirtieths of a second (both films are 24–30 frames a
 * second), plus every change of state, a seek, the first picture. Not requestVideoFrameCallback: it is tied to the page's
 * own rendering loop, which may not run while an immersive session holds the frames (the setup's film, setup.ts, reads the
 * clock the same way, and that one is known to play in the headset)
 */
let serial = 0;
let lastTick = -1;
const TICKS_PER_SECOND = 30;

export const viewerFilm = {
  file(): string | null { return filmFile; },
  /** the film's state, or 'idle' when `file` is given and is not the film that is loaded */
  state(file?: string): FilmState { return file !== undefined && file !== filmFile ? 'idle' : filmState; },
  /** the element, for drawing its current picture (never on the page) */
  video(): HTMLVideoElement | null { return video; },
  /** a picture can be drawn */
  hasFrame(): boolean { return !!video && video.readyState >= 2 && video.videoWidth > 0; },
  time(): { t: number; dur: number } {
    const d = video?.duration;
    return { t: video?.currentTime ?? 0, dur: d && Number.isFinite(d) ? d : 0 };
  },
  /** changes whenever there is a new picture to draw; a mount compares it with the one it last drew */
  serial(): number {
    if (video) { const tick = Math.floor(video.currentTime * TICKS_PER_SECOND); if (tick !== lastTick) { lastTick = tick; serial++; } }
    return serial;
  },
  /** a press on the film, or on its Play / Pause button */
  toggle(file: string): void {
    if (filmFile !== file || !video) { this.start(file); return; }
    if (filmState === 'playing' || filmState === 'loading') { video.pause(); return; }
    if (filmState === 'ended') video.currentTime = 0;
    if (filmState === 'error') { this.start(file); return; }
    void video.play().catch(() => { /* a refused play leaves it paused; the next press tries again */ });
  },
  /** a press on the progress line: go to that point (0..1) */
  seek(file: string, frac: number): void {
    if (filmFile !== file || !video) { this.start(file); return; }
    const { dur } = this.time();
    if (dur > 0) { video.currentTime = Math.max(0, Math.min(dur - 0.05, frac * dur)); serial++; notify(); }
  },
  pause(): void { if (video && !video.paused) video.pause(); },
  start(file: string): void {
    this.stop();
    viewerAudio.stop();   // one thing at a time
    const v = document.createElement('video');
    v.preload = 'auto'; v.playsInline = true; v.controls = false; v.disablePictureInPicture = true;
    v.setAttribute('playsinline', ''); v.setAttribute('disablepictureinpicture', '');
    track(v, nameOf(file), 'film');
    video = v; filmFile = file; filmState = 'loading'; lastTick = -1;
    const mine = (): boolean => video === v;
    const set = (s: FilmState): void => { if (mine() && filmState !== s) { filmState = s; serial++; notify(); } };
    v.addEventListener('playing', () => set('playing'));
    v.addEventListener('waiting', () => { if (mine() && !v.paused) set('loading'); });
    v.addEventListener('pause', () => { if (!v.ended) set('paused'); });
    v.addEventListener('ended', () => set('ended'));
    v.addEventListener('error', () => set('error'));
    v.addEventListener('seeked', () => { if (mine()) { serial++; notify(); } });
    v.addEventListener('loadeddata', () => { if (mine()) { serial++; notify(); } });
    v.src = file;   // the project's own static file, relative to the page; nothing loads before this press
    void v.play().catch(() => { if (mine() && v.paused) set(v.error ? 'error' : 'paused'); });
    notify();
  },
  stop(): void {
    const v = video;
    if (!v) return;
    video = null; filmFile = null; filmState = 'idle'; serial++;
    v.pause(); v.removeAttribute('src'); v.load();
    notify();
  }
};
