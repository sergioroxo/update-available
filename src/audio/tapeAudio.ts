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
  'tape-hiss.mp3': `${AUDIO_BASE}tape-hiss.mp3`,
  // R28-2b-ii (Session 32): Sérgio's real tape-side recordings, degraded via
  // tools/degrade_audio.sh --tape97 (assets/audio/ keeps the pristine + the
  // degraded master together; only the degraded file is ever registered here
  // — SYSTEM audio stays clean, HUMAN/TAPE audio never runs undegraded).
  'family_design_solutions_tape97.mp3': `${AUDIO_BASE}family_design_solutions_tape97.mp3`, // Tape C track 1 (mixtape)
  'fold_my_hands_tape97.mp3': `${AUDIO_BASE}fold_my_hands_tape97.mp3`, // Tape A's prayer segment
  // Tape B — SWAPPABLE CANDIDATE (Sérgio is producing alternate versions of
  // the broadcast jingle). Swap by generating a new degraded/wrapped file
  // with tools/degrade_audio.sh, adding ONE line here, and pointing
  // data/dialog/s1_tapes.json's tapeB segments at the new filename — nothing
  // else changes, same missing-file-safe registry pattern as everywhere else.
  'discover_the_new_you_tape97_radio.mp3': `${AUDIO_BASE}discover_the_new_you_tape97_radio.mp3`,
  // S46: build-time TTS (tools/tts/render.py, Supertonic) — Lamby's voice reading
  // its own death notice (S2R.5's PureMail apology). APPARATUS audio, so unlike
  // the tape entries above it never goes through degrade_audio.sh (that pass is
  // for HUMAN/TAPE audio only, per that script's own doctrine comment).
  'lamby_puremail_apology.wav': `${AUDIO_BASE}lamby_puremail_apology.wav`
};

const HISS_FILE = 'tape-hiss.mp3';

/**
 * R28-2b-ii (Session 32): Sérgio's live-playtest note — "the tape hiss is too
 * loud." Two gains, not one: the bed is a genuinely quiet floor (~-18dB, well
 * under any real clip) when nothing else is playing (ambient room presence
 * for tapes with no recording yet, e.g. Tape A's welcome/instruction
 * segments), and it DUCKS even further whenever a real degraded clip is
 * playing — the clip's own file already carries its own hiss floor mixed in
 * by tools/degrade_audio.sh's --tape97 preset, so a full-strength LIVE hiss
 * bed on top of that would double it. Ducking (not stopping) keeps the room
 * tone continuous under a clip rather than cutting in/out.
 */
const HISS_VOLUME_IDLE = 0.12; // no clip playing — the ambient floor
const HISS_VOLUME_DUCKED = 0.03; // a real clip is playing — nearly inaudible, avoids doubling the clip's own baked-in hiss

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
      this.hiss.volume = HISS_VOLUME_IDLE;
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

  /** swap (or clear) the named clip without touching the hiss bed's playback
   *  (only its gain — see HISS_VOLUME_IDLE/DUCKED above). */
  setClip(clipName?: string | null): void {
    if (this.clip) { this.clip.pause(); this.clip = null; }
    const playingRealClip = this.wantPlaying && isAudioAvailable(clipName);
    if (this.hiss) this.hiss.volume = playingRealClip ? HISS_VOLUME_DUCKED : HISS_VOLUME_IDLE;
    if (!playingRealClip) return;
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

/**
 * One-shot playback for a single named clip, outside any boombox bus — e.g.
 * a "read aloud" button (S46: data/dialog/s2_caleb.json's `pureMail.readAloudTrack`
 * hook). Same missing-file-safe pattern as everywhere else in this module: an
 * unregistered name is simply never requested, never thrown, never logged.
 */
export function playOnce(name: string | null | undefined): HTMLAudioElement | null {
  if (!isAudioAvailable(name)) return null;
  const audio = new Audio(REGISTRY[name as string]);
  audio.play().catch(() => { /* autoplay policy or a headless harness — never a thrown error */ });
  return audio;
}
