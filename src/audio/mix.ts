/**
 * ⚑ S248 — THE ONE MIXER. A master level and five channels, in memory only (no storage of any kind: a restart
 * reloads the page, and the next visitor starts from the baseline).
 *
 *   MUSIC    songs, jingles, loops, scores (the home loop, the tapes' songs, the ads, the Close, the ball's music)
 *   ROOM     the ambience: each era's bed, the passage, the hall tone, the session's breathing
 *   VOICES   spoken lines and the tape bus: L, Lamby reading the notice, Tape A's introduction, the tape's hiss
 *   EFFECTS  everything else (presses, stings, chimes, boots, the games' synthesised sounds) — the default
 *   FILM     the setup's welcome advert, its own row because it is picture and sound together and one visitor will
 *            want the film quiet while still wanting the voices
 *
 * THE LEVEL A SOURCE PLAYS AT is   relative × file gain × channel × master
 *   · relative   what its caller already set (`el.volume = 0.28` for the home loop): unchanged, so every existing
 *                call keeps its meaning as a level INSIDE its channel
 *   · file gain  the loudness baseline, src/audio/levels.json (tools/audio-levels.mjs measured every shipped file
 *                with ffmpeg and brought music and rooms to about -23 LUFS, voices to about -20)
 *   · channel    the menu's slider for that kind of sound
 *   · master     the menu's / the setup's slider (default 0.7: the exhibition laptop runs at 100% system volume)
 * The existing mute sits on top of all of it (`el.muted`), untouched.
 *
 * HOW A CALLER STAYS UNCHANGED: `track(el, name)` gives the element its own `volume` property. Writing it stores the
 * caller's RELATIVE level and sets the real (native) volume to the product above; reading it gives the relative level
 * back, so fades that read `el.volume` and write it back keep working. `nativeVolume(el)` reads the real one.
 */
import channelData from './channels.json';
import levels from './levels.json';

export type Channel = 'music' | 'room' | 'voices' | 'effects' | 'film';
export const CHANNELS: readonly Channel[] = ['music', 'room', 'voices', 'effects', 'film'];
/** the baseline: at system volume 100% on headphones the piece sits at a comfortable level, not at full scale */
export const DEFAULT_MASTER = 0.7;

const state: { master: number; ch: Record<Channel, number> } = {
  master: DEFAULT_MASTER,
  ch: { music: 1, room: 1, voices: 1, effects: 1, film: 1 }
};

const listeners = new Set<() => void>();
const clamp01 = (n: number): number => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);

export function getMaster(): number { return state.master; }
export function getChannel(c: Channel): number { return state.ch[c]; }
export function setMaster(v: number): void { state.master = clamp01(v); changed(); }
export function setChannel(c: Channel, v: number): void { state.ch[c] = clamp01(v); changed(); }
/** the baseline again — master 0.7, every channel full */
export function resetMix(): void { state.master = DEFAULT_MASTER; for (const c of CHANNELS) state.ch[c] = 1; changed(); }
/** call `fn` whenever any level changes; returns the unsubscribe */
export function subscribeMix(fn: () => void): () => void { listeners.add(fn); return () => { listeners.delete(fn); }; }

const music = new Set<string>(channelData.music);
const room = new Set<string>(channelData.room);
const voices = new Set<string>(channelData.voices);
const film = new Set<string>(channelData.film);
const voicePattern = new RegExp(channelData.voicePattern);

/** which channel a shipped file belongs to; anything unknown is EFFECTS */
export function channelOf(name: string | null | undefined): Channel {
  if (!name) return 'effects';
  if (music.has(name)) return 'music';
  if (room.has(name)) return 'room';
  if (film.has(name)) return 'film';
  if (voices.has(name) || voicePattern.test(name)) return 'voices';
  return 'effects';
}

/** the loudness baseline for one file (1 when unmeasured) */
export function fileGain(name: string | null | undefined): number {
  const g = name ? (levels as Record<string, number>)[name] : undefined;
  return typeof g === 'number' && g > 0 ? g : 1;
}

/** channel × master — what the synthesised (Web Audio) sounds multiply their own level by */
export function scaleFor(c: Channel): number { return state.master * state.ch[c]; }

interface Tracked { name: string | null; channel: Channel; rel: number }
const meta = new WeakMap<HTMLMediaElement, Tracked>();
type Ref = { deref(): HTMLMediaElement | undefined } | HTMLMediaElement;
const live = new Set<Ref>();

const nativeDesc: PropertyDescriptor | undefined =
  typeof HTMLMediaElement !== 'undefined' ? Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume') : undefined;

function apply(el: HTMLMediaElement, m: Tracked): void {
  nativeDesc?.set?.call(el, clamp01(m.rel * fileGain(m.name) * state.ch[m.channel] * state.master));
}

/** the real volume the element is playing at (probes and the mix check read this; `el.volume` is the relative one) */
export function nativeVolume(el: HTMLMediaElement): number {
  return nativeDesc?.get ? (nativeDesc.get.call(el) as number) : el.volume;
}

/** the channel an element was filed under, or null if it was never tracked */
export function channelOfElement(el: HTMLMediaElement): Channel | null { return meta.get(el)?.channel ?? null; }

/**
 * Put a media element under the mixer. `name` is the shipped file (for its channel and its baseline gain); pass
 * `channel` to override the channel. Idempotent. From here on, `el.volume = x` means "x, inside my channel".
 */
export function track<T extends HTMLMediaElement>(el: T, name: string | null, channel?: Channel): T {
  if (meta.has(el)) return el;
  const m: Tracked = { name, channel: channel ?? channelOf(name), rel: 1 };
  meta.set(el, m);
  Object.defineProperty(el, 'volume', {
    configurable: true,
    get: () => m.rel,
    set: (v: number) => { m.rel = clamp01(Number(v)); apply(el, m); }
  });
  apply(el, m);
  const WR = (globalThis as unknown as { WeakRef?: new (e: HTMLMediaElement) => { deref(): HTMLMediaElement | undefined } }).WeakRef;
  if (live.size > 200) prune();
  live.add(WR ? new WR(el) : el);
  return el;
}

function prune(): void {
  for (const r of [...live]) if ('deref' in r && !r.deref()) live.delete(r);
}

function changed(): void {
  for (const r of [...live]) {
    const el = 'deref' in r ? r.deref() : r;
    if (!el) { live.delete(r); continue; }
    const m = meta.get(el);
    if (m) apply(el, m);
  }
  for (const fn of [...listeners]) fn();
}
