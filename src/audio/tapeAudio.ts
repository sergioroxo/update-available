/**
 * The tape audio bus (R28-2b) — one ambient hiss loop + an optional per-
 * segment clip, both local bundled assets (public/assets/audio/, served the
 * same way public/assets/models/ already is — an asset-load, not a runtime
 * network call; see tools/check-invariants.mjs's forbidden-token list, which
 * this file never touches — just the plain <audio src> element.
 *
 * REGISTRY LAW (mirrors src/room/assets.ts's model manifest): a segment in
 * data/dialog/s1_tapes.json may name any future filename in its `audio`
 * field. Only names present in REGISTRY below are ever assigned to an
 * <audio> element's `src` — an unregistered name is simply never requested,
 * so a segment can safely reference a file that doesn't exist yet (it drops
 * in later by adding one line here + the file itself) with ZERO console
 * errors, ever. This is deliberately stricter than assets.ts's load-then-
 * fall-back-on-error pattern: audio has no visual fallback to catch a 404
 * ugly, so we simply never issue the request for an unknown name.
 */

const AUDIO_BASE = 'assets/audio/';

/** Real bundled files, by the exact name a segment's `audio` field may use.
 *  Add a line here (and drop the file in public/assets/audio/) whenever a
 *  real recording lands — nothing else needs to change. */
const REGISTRY: Record<string, string> = {
  'tape-hiss.mp3': `${AUDIO_BASE}tape-hiss.mp3`
};

const HISS_FILE = 'tape-hiss.mp3';

export function isAudioAvailable(name: string | null | undefined): boolean {
  return !!name && name in REGISTRY;
}

/**
 * One bus per boombox (there is only ever one in the room): a looping hiss
 * bed plus at most one named clip layered on top. Respects a global mute and
 * the game's Esc/pause (paused audio literally pauses, it does not keep
 * playing silently — same "the frame never plays" spirit).
 */
export class TapeAudioBus {
  private hiss: HTMLAudioElement | null = null;
  private clip: HTMLAudioElement | null = null;
  private muted = false;
  private wantPlaying = false; // the bus's own intent, independent of game-pause
  private gamePaused = false; // last-known state, so a per-frame caller never spams play()/pause()

  private ensureHiss(): HTMLAudioElement {
    if (!this.hiss) {
      this.hiss = new Audio(REGISTRY[HISS_FILE]);
      this.hiss.loop = true;
      this.hiss.muted = this.muted;
    }
    return this.hiss;
  }

  /** start the ambient hiss (+ a named clip, if that file is registered) */
  start(clipName?: string | null): void {
    this.wantPlaying = true;
    const h = this.ensureHiss();
    h.muted = this.muted;
    h.currentTime = h.currentTime || 0;
    h.play().catch(() => { /* autoplay policy or a headless harness — never a thrown error */ });
    this.setClip(clipName);
  }

  /** swap (or clear) the named clip without touching the hiss bed */
  setClip(clipName?: string | null): void {
    if (this.clip) { this.clip.pause(); this.clip = null; }
    if (!this.wantPlaying || !isAudioAvailable(clipName)) return;
    const url = REGISTRY[clipName as string];
    this.clip = new Audio(url);
    this.clip.muted = this.muted;
    this.clip.play().catch(() => { /* see start() */ });
  }

  stop(): void {
    this.wantPlaying = false;
    this.hiss?.pause();
    this.clip?.pause();
    this.clip = null;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.hiss) this.hiss.muted = muted;
    if (this.clip) this.clip.muted = muted;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** the game's Esc/pause: suspend playback without losing `wantPlaying`/
   *  position. Called every frame by the caller — a no-op unless either the
   *  pause state or the playing intent actually changed, so a healthy
   *  playing tape never gets a redundant play() call 60 times a second. */
  setGamePaused(paused: boolean): void {
    if (paused === this.gamePaused) return;
    this.gamePaused = paused;
    if (!this.wantPlaying) return;
    if (paused) {
      this.hiss?.pause();
      this.clip?.pause();
    } else {
      this.hiss?.play().catch(() => { /* see start() */ });
      this.clip?.play().catch(() => { /* see start() */ });
    }
  }
}
