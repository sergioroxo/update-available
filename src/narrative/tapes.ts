/**
 * THE ERA-1 TAPE SYSTEM (R28-2b) — three cassettes on the Room 1 bookcase
 * shelf, one boombox. Pure state/logic only (mirrors src/narrative/guide.ts's
 * split: content lives in data/dialog/s1_tapes.json, conditions/geometry/DOM/
 * audio live in src/engine/app.ts). No PlayCanvas entities, no DOM, no audio
 * elements touched here — this class only tracks WHICH tape is inserted,
 * WHETHER it is playing, and WHAT the current caption is, and files the
 * witness-symmetry outcomes described in data/dialog/s1_tapes.json's `_doc`.
 *
 * ⚑ THE GESTURE (S86, Sérgio's iPad pass): PRESS A TAPE AND IT PLAYS; PRESS THE
 * MACHINE AND IT STOPS AND GOES BACK ON THE SHELF. It used to take two presses
 * (load, then find and press the boombox) and stopping stranded the cassette in
 * the deck forever. One object, one press, and it can always be put back.
 *
 * WITNESS SYMMETRY (binding, ERA_MINING FIND #4): Tape A/B file exactly once,
 * the first decisive outcome reached — 'playedThrough' (elapsed reaches the
 * tail after the last segment) or 'stoppedMidway' (stopped/ejected/era-
 * shifted after elapsed > 0 but before the tail). A tape whose PLAY button
 * was never pressed (elapsed stays 0) files NOTHING — unplayed media gets no
 * response, the same doctrine the guide thread already follows. Tape C (the
 * mixtape) is hard-excluded from filing in code (`fileOutcome` returns
 * immediately for 'tapeC') and from the `tape-played` ledger record the
 * guide's `tape` side-message waits on (`start()` skips it for tapeC) — the
 * system's silence about it is enforced, not just documented (R28-2 spec §3/§6).
 */
import { ledger } from '../state/ledger';
import tapesData from '../../data/dialog/s1_tapes.json';

export type TapeId = 'tapeA' | 'tapeB' | 'tapeC';

export interface TapeSegment {
  id: string;
  at: number;
  kind: string;
  caption: string;
  audio: string | null;
  _doc?: string;
}

export interface TapeDef {
  id: TapeId;
  label: string;
  witness: { playedThrough: string; stoppedMidway: string } | null;
  segments: TapeSegment[];
  /** ⚑ S89 — real, ffprobe'd duration (seconds) of this tape's bundled real
   *  audio clip, measured from the world-clock moment it actually starts
   *  playing (its first segment naming a real `audio` filename), not from
   *  tape-insert. Optional: only tapes carrying real recorded audio need it.
   *  See totalSeconds()'s doc for why this exists — it is a bug fix, not
   *  decoration. */
  realDurationSec?: number;
  _doc?: string;
}

/** seconds the final caption holds before a fully-played tape auto-completes
 *  (no scrubbing/progress UI exists to show this — it is simply a quiet tail,
 *  same "no timer pressures the click" spirit as guide.ts: nothing requires
 *  the player to act inside this window, it just lets the last line land). */
const TAIL_SECONDS = 3;

export class TapeSystem {
  private readonly tapes: Map<TapeId, TapeDef>;
  private insertedId: TapeId | null = null;
  private playing = false;
  private elapsed = 0;
  private readonly filed = new Set<TapeId>();

  constructor() {
    const list = (tapesData as unknown as { tapes: TapeDef[] }).tapes;
    this.tapes = new Map(list.map((t) => [t.id, t]));
  }

  get inserted(): TapeId | null {
    return this.insertedId;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  def(id: TapeId): TapeDef {
    return this.tapes.get(id)!;
  }

  /**
   * ⚑ S89 BUG FIX — this used to be JUST `lastSegment.at + TAIL_SECONDS`, which
   * silently truncates the real bundled clip whenever the last CAPTION lands
   * before the real AUDIO does (captions are hand-paced against lyric sheets,
   * not against a track's own tail instrumental — Tape A's own `_doc` even
   * flagged a "~7s undershoot" as a known approximation). The undershoot isn't
   * cosmetic: once `elapsed` crosses this value, `update()` marks the tape
   * `playedThrough` and stops it, and `syncTapeAudio()` (src/engine/app.ts)
   * answers a stopped tape by calling `tapeAudio.stop()`, which PAUSES the
   * `<audio>` element outright — so the real clip was being cut dead mid-tail,
   * every time, on every tape carrying real audio. This is what Sérgio heard
   * as "'New you' is cut off in its last seconds" (Tape B undershot by ~2.2s
   * even before S89's other fix; Tape A's prayer undershoots by ~7s the same
   * way). Folding `realDurationSec` in as a floor means the state machine can
   * never end a tape before its own bundled clip has actually finished.
   */
  private totalSeconds(id: TapeId): number {
    const def = this.def(id);
    const segs = def.segments;
    const byCaptions = segs.length ? segs[segs.length - 1].at + TAIL_SECONDS : 0;
    return def.realDurationSec !== undefined ? Math.max(byCaptions, def.realDurationSec) : byCaptions;
  }

  /** the segment whose `at` has most recently passed, or null before the first */
  get activeSegment(): TapeSegment | null {
    if (!this.insertedId) return null;
    const segs = this.def(this.insertedId).segments;
    let found: TapeSegment | null = null;
    for (const s of segs) {
      if (s.at <= this.elapsed) found = s;
      else break;
    }
    return found;
  }

  get activeCaption(): string | null {
    if (!this.playing) return null;
    return this.activeSegment?.caption ?? null;
  }

  /**
   * ⚑ S86 — ONE PRESS PLAYS. Click a tape on the shelf and it loads AND starts,
   * ejecting whatever was inserted.
   *
   * Sérgio, 2026-08-15: *"When I press the tape it should start the tape, no?
   * Why would I need to press twice — especially if I don't have that info?"*
   * He is right and the old two-step was a mechanism, not a gesture: the piece
   * never taught "now press the machine", the boombox's own play zone is not
   * labelled, and a player who pressed a tape and heard nothing had every
   * reason to conclude the tape did nothing. Picking up a cassette and putting
   * it on is ONE act in the world; it is one act here now.
   */
  insert(id: TapeId): void {
    if (this.insertedId === id) return; // already loaded — no separate re-insert gesture
    this.stopAndFile();
    this.insertedId = id;
    this.elapsed = 0;
    this.playing = false;
    this.start();
  }

  eject(): void {
    if (!this.insertedId) return;
    this.stopAndFile();
    this.insertedId = null;
    this.elapsed = 0;
  }

  /**
   * Click the boombox: stop if playing, play if stopped. No-op if empty.
   *
   * ⚑ S86 — AND STOPPING PUTS IT BACK ON THE SHELF. Sérgio's report was that a
   * tape "stays stuck instead of returning to the shelf", and the fault was
   * real: `stopAndFile()` left `insertedId` set forever, so the object was out
   * of the world's only place for it with no gesture anywhere that could put it
   * back — the shelf spot had no entity left to click and the boombox's own
   * press only toggled a boolean. A thing you take out must be returnable, and
   * since there is no separate eject control in the room, STOP is the eject.
   */
  togglePlay(): void {
    if (!this.insertedId) return;
    if (this.playing) this.eject();
    else this.start();
  }

  private start(): void {
    if (!this.insertedId) return;
    this.playing = true;
    // the guide thread's `tape` side-message (s1_guide.json, condition key
    // `tapePlayed`) is satisfied by playing ANY of A/B — never C.
    if (this.insertedId !== 'tapeC' && !ledger.records.includes('tape-played')) {
      ledger.records.push('tape-played');
    }
  }

  /** stop, by click / eject / era-shift — files the decisive outcome exactly
   *  once per tape. Playback that never started leaves no trace at all. */
  private stopAndFile(): void {
    if (this.playing && this.insertedId && this.elapsed > 0) {
      this.fileOutcome(this.insertedId, 'stoppedMidway');
    }
    this.playing = false;
  }

  private fileOutcome(id: TapeId, outcome: 'playedThrough' | 'stoppedMidway'): void {
    if (id === 'tapeC') return; // BINDING: never files, under any outcome
    if (this.filed.has(id)) return; // one permanent witness record per tape
    const def = this.def(id);
    const witness = def.witness?.[outcome] ?? `${id}: ${outcome}`;
    ledger.tapes.push({ id, outcome, witness });
    this.filed.add(id);
  }

  /** advances the playhead. `gamePaused` freezes it exactly like Esc/pause
   *  freezes everything else — the one place this system touches real time,
   *  because a tape playing IS a clock, unlike the guide thread's pure
   *  condition polling (no player-facing deadline is ever created by this). */
  update(dt: number, gamePaused: boolean): void {
    if (!this.playing || !this.insertedId || gamePaused) return;
    this.elapsed += dt;
    if (this.elapsed >= this.totalSeconds(this.insertedId)) {
      this.fileOutcome(this.insertedId, 'playedThrough');
      this.playing = false;
      // ⚑ S86: it played out, so it comes home — same law as STOP above. The
      // filing has already happened, so this cannot be mistaken for an eject
      // outcome; `stopAndFile` guards on `playing` and `filed` in any case.
      this.insertedId = null;
      this.elapsed = 0;
    }
  }

  /** the room is about to morph away (the boombox itself leaves at E2) — an
   *  in-flight play is an abrupt stop, filed like any other; nothing hides
   *  just because the era shifted out from under it. */
  handleEraShift(): void {
    this.stopAndFile();
    this.insertedId = null;
    this.elapsed = 0;
  }

  /** ?debug=1 review probe (read-only) */
  snapshot(): { inserted: TapeId | null; playing: boolean; elapsed: number; caption: string | null } {
    return {
      inserted: this.insertedId,
      playing: this.playing,
      elapsed: Math.round(this.elapsed * 10) / 10,
      caption: this.activeCaption
    };
  }
}
