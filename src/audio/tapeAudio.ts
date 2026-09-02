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
  // S51: Sérgio's real 1:54 song, the E2 NetVision infomercial's actual
  // soundtrack (data/dialog/s2_media.json's `audioTrack`, whose scene timings
  // ARE this file's line timings). Degraded with degrade_audio.sh's NEW
  // --tape03 preset and deliberately NOT --wrap'd — two corrections to the
  // `…_tape97_radio` entry above, which he heard and rejected for this spot:
  // the diegetic source is a VHS, not a broadcast (so no dial-tuning bursts,
  // which would also have shifted every caption by their 1.3s head offset),
  // and its hiss was "a bit too much" (--tape03's floor measures 10.4 dB
  // under --tape97's at matched program loudness). The `…_radio` file stays
  // registered — it is still correct for Tape B, the Era-1 '97 radio spot.
  'discover_the_new_you_infomercial_tape03.mp3': `${AUDIO_BASE}discover_the_new_you_infomercial_tape03.mp3`,
  // S46: build-time TTS (tools/tts/render.py, Supertonic) — Lamby's voice reading
  // its own death notice (S2R.5's PureMail apology). APPARATUS audio, so unlike
  // the tape entries above it never goes through degrade_audio.sh (that pass is
  // for HUMAN/TAPE audio only, per that script's own doctrine comment).
  'lamby_puremail_apology.wav': `${AUDIO_BASE}lamby_puremail_apology.wav`,
  // ⚑ TAPE A'S SPOKEN SIDE ONE — rendered 2026-08-21 (tools/tts/render.py,
  //   register: apparatus). Registering it is not a formality: the law above
  //   means an UNREGISTERED name is never requested, silently and with no
  //   console error — so a rendered file, correctly named in the data, would
  //   still have played nothing and looked exactly like the bug it was fixing.
  'tapeA_side_one_intro.wav': `${AUDIO_BASE}tapeA_side_one_intro.wav`,
  // ⚑ L, ERA 4's VOICE — 47 clips, rendered 2026-09-02 in ONE sitting
  //   (tools/tts/render.py, Supertonic F3, register: apparatus). Ten
  //   conversation units from data/dialog/s4_l.json and the fifteen offer
  //   lines that follow them from s4_offers.json — the same machine in the
  //   same conversation, so the same batch and the same voice style.
  //   ⚑ MP3, AND THE WAV IS THE ARCHIVE. render.py writes a lossless 44.1 kHz
  //   mono master and tools/tts/publish_mp3.sh encodes it at 96 kbps mono and
  //   moves the master to assets/audio/ — the same pristine/shipped split
  //   degrade_audio.sh already keeps. 23 MB became 2 MB, and every one of these
  //   is fetched ON DEMAND, mid-scene, while a caption is already on screen
  //   waiting for it: this is latency in the middle of a sentence, not download
  //   size at a loading screen.
  //   ⚑ AND THEY ARE LISTED ONE BY ONE ON PURPOSE. A prefix rule would have
  //   been shorter and would have given back exactly the 404s this law exists
  //   to prevent: an unregistered name is never requested, and that guarantee
  //   only holds while the registry names real files. Era 4 was silent for
  //   three sessions with every one of these correctly named in the data.
  'l_u1a.mp3': `${AUDIO_BASE}l_u1a.mp3`,
  'l_u1b.mp3': `${AUDIO_BASE}l_u1b.mp3`,
  'l_u1r_ok.mp3': `${AUDIO_BASE}l_u1r_ok.mp3`,
  'l_u1r_who.mp3': `${AUDIO_BASE}l_u1r_who.mp3`,
  'l_u1r_silent.mp3': `${AUDIO_BASE}l_u1r_silent.mp3`,
  'l_u2a.mp3': `${AUDIO_BASE}l_u2a.mp3`,
  'l_u2b.mp3': `${AUDIO_BASE}l_u2b.mp3`,
  'l_u2c.mp3': `${AUDIO_BASE}l_u2c.mp3`,
  'l_u3a.mp3': `${AUDIO_BASE}l_u3a.mp3`,
  'l_u3b.mp3': `${AUDIO_BASE}l_u3b.mp3`,
  'l_u3c.mp3': `${AUDIO_BASE}l_u3c.mp3`,
  'l_u4a.mp3': `${AUDIO_BASE}l_u4a.mp3`,
  'l_u4r_correct.mp3': `${AUDIO_BASE}l_u4r_correct.mp3`,
  'l_u4r_why.mp3': `${AUDIO_BASE}l_u4r_why.mp3`,
  'l_u5a.mp3': `${AUDIO_BASE}l_u5a.mp3`,
  'l_u5r_absorb.mp3': `${AUDIO_BASE}l_u5r_absorb.mp3`,
  'l_u5r_bypass.mp3': `${AUDIO_BASE}l_u5r_bypass.mp3`,
  'l_u6a.mp3': `${AUDIO_BASE}l_u6a.mp3`,
  'l_u6r_correct.mp3': `${AUDIO_BASE}l_u6r_correct.mp3`,
  'l_u6r_notnow.mp3': `${AUDIO_BASE}l_u6r_notnow.mp3`,
  'l_u7a.mp3': `${AUDIO_BASE}l_u7a.mp3`,
  'l_u7r_sure.mp3': `${AUDIO_BASE}l_u7r_sure.mp3`,
  'l_u7r_tired.mp3': `${AUDIO_BASE}l_u7r_tired.mp3`,
  'l_u7r_care.mp3': `${AUDIO_BASE}l_u7r_care.mp3`,
  'l_u8a.mp3': `${AUDIO_BASE}l_u8a.mp3`,
  'l_u8r_maybe.mp3': `${AUDIO_BASE}l_u8r_maybe.mp3`,
  'l_u8r_notthat.mp3': `${AUDIO_BASE}l_u8r_notthat.mp3`,
  'l_u9a.mp3': `${AUDIO_BASE}l_u9a.mp3`,
  'l_u9r_showme.mp3': `${AUDIO_BASE}l_u9r_showme.mp3`,
  'l_u10a.mp3': `${AUDIO_BASE}l_u10a.mp3`,
  'l_u10r_correct.mp3': `${AUDIO_BASE}l_u10r_correct.mp3`,
  'l_u10r_handoff.mp3': `${AUDIO_BASE}l_u10r_handoff.mp3`,
  'l_m1a.mp3': `${AUDIO_BASE}l_m1a.mp3`,
  'l_m1b.mp3': `${AUDIO_BASE}l_m1b.mp3`,
  'l_m1u.mp3': `${AUDIO_BASE}l_m1u.mp3`,
  'l_m2a.mp3': `${AUDIO_BASE}l_m2a.mp3`,
  'l_m2b.mp3': `${AUDIO_BASE}l_m2b.mp3`,
  'l_m2u.mp3': `${AUDIO_BASE}l_m2u.mp3`,
  'l_w1a.mp3': `${AUDIO_BASE}l_w1a.mp3`,
  'l_w1b.mp3': `${AUDIO_BASE}l_w1b.mp3`,
  'l_c1a.mp3': `${AUDIO_BASE}l_c1a.mp3`,
  'l_c1b.mp3': `${AUDIO_BASE}l_c1b.mp3`,
  'l_c1c.mp3': `${AUDIO_BASE}l_c1c.mp3`,
  'l_p1a.mp3': `${AUDIO_BASE}l_p1a.mp3`,
  'l_p1b.mp3': `${AUDIO_BASE}l_p1b.mp3`,
  'l_p1r_yes.mp3': `${AUDIO_BASE}l_p1r_yes.mp3`,
  'l_p1r_name.mp3': `${AUDIO_BASE}l_p1r_name.mp3`,
  // ⚑ S103b — THE E2 BOOT JINGLE, MADE AND REGISTERED (2026-09-02). It was
  //   hooked and unmade for three sessions: `data/dialog/s2_lamby.json`'s
  //   `osBootTrack` has asked for this name since S60 and the registry law meant
  //   the request was simply never issued. It is a 6.5 s cut of Sérgio's own
  //   `Chase_The_Clouds` — the jingle the era already owns — so the BOOT is the
  //   mark's first appearance and the infomercial its second: the ear learns it
  //   before the mouth sells it. Three candidate cuts sit in
  //   `assets/audio/candidates/`; A ships and swapping is one `cp`.
  'lambyos_2003_boot.mp3': `${AUDIO_BASE}lambyos_2003_boot.mp3`,
  // ⚑ E2's AUDIO SPINE, both halves. The master plan has called the sweet/broken
  //   jingle pair that since Round 2 and neither had ever been in the repo: the
  //   file lived on Sérgio's disk and the collapse beat's "the jingle returns
  //   broken — slow, detuned, dying music box" had no audio hook at all. The
  //   broken one is a TREATMENT of the real file (pitch down ~3½ semitones,
  //   slowed, wobbled, band-limited, dying at 20 s) — the same instinct as the
  //   tape97/tape03 chains: degrade what is real rather than synthesize what is
  //   fake. `tools/make_tones.sh` holds the exact chain.
  'chase_the_clouds.mp3': `${AUDIO_BASE}chase_the_clouds.mp3`,
  'chase_the_clouds_broken.mp3': `${AUDIO_BASE}chase_the_clouds_broken.mp3`,
  /**
   * ⚑ THE SOUNDS THE PIECE MAKES ITSELF (2026-09-02, `tools/make_tones.sh`).
   *
   * Every one of these is a sine pair or filtered noise whose exact chain is in
   * that script. Nothing is sourced, so nothing needs a licence row, nothing can
   * be relicensed under us, and — the part that matters — **no real OS sound is
   * quoted.** Microsoft's chords and Apple's chime are copyrighted works, and an
   * "error ding" is exactly the sort of thing that gets lifted by accident.
   *
   * ⚑ REGISTERED AHEAD OF THEIR HOOKS, ON PURPOSE. Most of these have no caller
   * yet — the bus needs `setBed()` and the cascade needs a `playOnce` per window
   * (S109). Registering now means that session adds the CODE PATH and nothing
   * else, instead of adding a code path and then discovering that the files it
   * plays were never registered. That discovery has cost this project two
   * sessions already. A registered name with no caller is inert; an unregistered
   * name with a caller is a silence nobody can explain.
   */
  'post_beep_1997.mp3': `${AUDIO_BASE}post_beep_1997.mp3`,
  'err_ding_1997.mp3': `${AUDIO_BASE}err_ding_1997.mp3`,
  'chime_2003.mp3': `${AUDIO_BASE}chime_2003.mp3`,
  'alert_2003.mp3': `${AUDIO_BASE}alert_2003.mp3`,
  'ting_2016.mp3': `${AUDIO_BASE}ting_2016.mp3`,
  'tick_task.mp3': `${AUDIO_BASE}tick_task.mp3`,
  'ready_e4.mp3': `${AUDIO_BASE}ready_e4.mp3`,
  'set_down_e4.mp3': `${AUDIO_BASE}set_down_e4.mp3`,
  // the four floors and the building between them (D-4, D-7)
  'bed_1997.mp3': `${AUDIO_BASE}bed_1997.mp3`,
  'bed_2003.mp3': `${AUDIO_BASE}bed_2003.mp3`,
  'bed_2016.mp3': `${AUDIO_BASE}bed_2016.mp3`,
  'bed_2026.mp3': `${AUDIO_BASE}bed_2026.mp3`,
  'passage_building.mp3': `${AUDIO_BASE}passage_building.mp3`
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

/** The live bus, if one has been constructed. src/engine/app.ts owns
 *  construction and drives it every frame; this module-scope handle exists
 *  ONLY for releaseBus() below. Safe because this file's whole model is
 *  already "there is only ever one bus" (see TapeAudioBus's own doc). */
let liveBus: TapeAudioBus | null = null;

/**
 * Put the bus down — stop the named clip AND the hiss bed — for a desktop app
 * that owns the bus for exactly as long as its window is open.
 *
 * WHY THIS EXISTS (S51): src/engine/app.ts's syncNetvisionAudio() opens with
 * `if (!os.netvision || !tapeAudio) return;`, and os.ts nulls that reference the
 * instant the player closes — so the sync's own `tapeAudio.stop()` branch is
 * unreachable. Nobody noticed while `audioTrack` named a file that did not
 * exist and the clip slot was always silent. Now that a real 1:54 song is
 * registered it is audible: skipping the video at 15s left the jingle singing
 * over the desktop for another minute and a half (verified in-build, which is
 * how this was found). The tidiest fix is one line in that sync function, but
 * app.ts belongs to another session this round — so the app that owns the clip
 * releases it itself. Harmless if the app.ts fix later lands: stopping an
 * already-stopped bus is a no-op, and `stop()` is idempotent.
 */
export function releaseBus(): void {
  liveBus?.stop();
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

  constructor() {
    liveBus = this; // see releaseBus() — one bus, and a closing app must be able to put it down
  }

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
