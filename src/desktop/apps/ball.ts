/**
 * ⚑ THE COMMONS (S133, 2026-09-11) — the ball, rebuilt so that a person can see
 * it, and so that she goes to it. Sérgio, on S79's version after his first
 * sit-through: *"The Ball makes no sense to not be visual… so it is just
 * sounds? … I don't like the ball honestly. If it's not visible, not relevant
 * here."* And his idea for what it should be, which is better than what was
 * built: *"it is through support and community that help makes you 'fail' the
 * conversion… we could integrate the ball as part of the event that she goes
 * inside of… the system starts glitching due to community demands for
 * representation and quality and that makes the ball become visible."*
 *
 * SO, THE SHAPE (his ruling: the headset STAYS ON):
 *  · The VR is the SOGICE risk — an overlay on her own room. Already built.
 *  · Junie's invitation, muted six weeks ago by the care system, reaches the
 *    headset anyway. ONE press: she goes in. Nothing narrates the choice.
 *  · The overlay tries to classify the shared space and fails, four labels,
 *    front and centre on the glass — and as it fails, forty-one lamps come up
 *    in the open building behind the glass (`src/room/commonsLamps.ts`).
 *    Forty-one people being specific is not a thing it can classify.
 *  · The MC calls the four categories over the room she can see.
 *  · A few seconds after the last line the apparatus tries to update and
 *    cannot. The device stops. That is the title, delivered by structure.
 *
 * ⚑ WHAT CHANGED IN THE LAWS BELOW, stated rather than smoothed over. Law 1
 * ("there is no screen") is re-argued: the invitation and the filter ARE on the
 * glass, in front of her face, because the risk and the rescue are the same
 * object, and a failure nobody can see is not a failure. Law 2 ("the device
 * leaves her face") is reversed: it stays on, and the shared space opens over
 * her room — which is the mixed-reality reading Sérgio asked for on 09-07. Laws
 * 3–7 stand exactly as written. The original header follows, kept as the
 * record of what this was.
 *
 * ⚑ TRANSCENDANCE — the ball (S79, Era 4 Stage 3). The last thing in the era,
 * and the only thing in it that is not work.
 * Lines and copy: `data/dialog/s4_ball.json` (read its `_doc` blocks before
 * changing a word). Design of record: `docs/REINTERP_E4_DEEP_PASS_2026-08-05.md`
 * §1, `docs/REINTERP_E4_THE_SPACE_2026-08-06.md` §3, and
 * `docs/REINTERP_E4_THE_DEVICE_2026-08-05.md`'s Stage 0 close. ⚑ And
 * `docs/research/BALLROOM_PROVENANCE_2026-08-06.md`, in full, first.
 *
 * ⚑ SEVEN LAWS THIS FILE EXISTS TO KEEP, none of them negotiable:
 *
 *  1. **THERE IS NO SCREEN.** Four eras have been surfaces — a CRT, a program,
 *     three device screens, a visor — and this is a ROOM: sound and light in
 *     geometry that already exists. This module draws no stage, adds no mesh,
 *     mounts no canvas of its own and shows the player no interface. What it
 *     draws on the visor is the MACHINE, lying on its stand, still failing.
 *     ⚑ That is the contrast the whole era is built on: *the apparatus can only
 *     ever show you a picture of a room. This is a room.*
 *  2. **⚑ THE TURN WORKS AGAIN.** S76 built a turn that does not — the place is
 *     pinned to the head and comes with you. Here the device leaves her face
 *     (`E4Shell` drops out of `worn`, and `src/room/era3Devices.ts` eases the
 *     visor plane back to its stand on its own), so there is nothing between
 *     the player and the room. The light is BEHIND the E4 seat, every station
 *     of it, because the one bodily ask this piece has ever made is the turn.
 *     Nobody explains that either.
 *  3. **NOTHING ASKS YOU TO LEAVE.** No timer, no prompt, no score, no chip, no
 *     marker, no continue. The categories run out and the room stays exactly as
 *     it is, for as long as the player sits in it. The way on is the thing on
 *     the desk behind them, which has been there the whole time.
 *  4. **⚑ THE LEDGER NEVER HEARS ABOUT IT.** This file imports no ledger and has
 *     no way to write to one. Same doctrine as Tape C and Malta: the apparatus
 *     did not ask for this and was not here. A player who turns to the record
 *     afterwards finds it blank for the first time since 1997.
 *  5. **THE STUTTER IS L'S, NEVER THE BALL'S** (Ethics #8; deep pass §1.4).
 *     `respite` is absolute: never a trap, never revealed as fake, and the
 *     system targets AROUND it, never through it. Every failure in this module
 *     happens on the machine's own surface, across the room. Nothing here may
 *     glitch a performer, drop a beat, or sour one word of the room.
 *  6. **⚑ L IS ABSENT.** It has nothing to do here, so it stops talking — not
 *     silenced, not defeated, unnecessary (deep pass §3.2). This file never
 *     touches `LVoice`, draws no caption band and speaks no assistant line;
 *     only L's INSTRUMENT keeps working, and only at its own surface. That
 *     absence is also how check-spec's C2 is kept: a `felt` beat is a beat the
 *     assistant is not in.
 *  7. **⚑ IT IS AN INTERPRETIVE HOMAGE, AND IT IS CREDITED.** Invented houses,
 *     invented categories, invented names, faceless, and NO borrowed vernacular
 *     anywhere: the MC performs the function — announce, categorise, celebrate
 *     — in ordinary English. The lineage is named in
 *     `data/provotypes/e4_ball.json` and `docs/reinterp/ATTRIBUTIONS.md`, not
 *     credited in the abstract, because "ballroom culture" as a general thank-you
 *     is the extraction pattern rather than a correction of it.
 *
 * ⚑ THE CAPTIONS ARE FRAME CHROME, NOT A SURFACE. The ball is sound in the
 * room, so it is subtitled the way sound in the room has been subtitled since
 * R28-2b: a plain fixed DOM element, no decoration, never on the monitor
 * texture, in the same idiom as `src/engine/app.ts`'s tape captions. A subtitle
 * is not a screen — it is the accommodation any film gives — and law 1 stands.
 * ⚑ KNOWN GAP, STATED RATHER THAN HIDDEN: DOM chrome does not render inside an
 * immersive WebXR session, so in a headset this beat is currently sound and
 * light with no captions. That is the same gap E1's tape captions already have
 * and it is an A11 item; it is not fixed here and it is not claimed to be.
 */
import {
  labelField, BALL, ERA4, PLACE, WEB, photograph, roundRect, pill, avatar, webButton, visorEdge,
  streamScene, streamShot
} from '../theme/era4';
import { px, setFont, wrapText } from '../theme/chrome';
import { setBallLight, setCommonsWorld } from '../../room/cluster';
import { setCommonsLamps } from '../../room/commonsLamps';
import { setCommonsFigures } from '../../room/commonsFigures';
import { playOnce, roomBed } from '../../audio/tapeAudio';
import script from '../../../data/dialog/s4_ball.json';

/** how long the machine's last failure sits on screen before the device comes
 *  off. Long enough to be read, short enough not to be a pause for effect. */
const OFF_SECONDS = 2.6;
/** the room is already warming while the machine is still working at it — the
 *  player sees it around the edges of a picture that does not move. */
const ARRIVAL_LEVEL = 0.28;
const BALL_LEVEL = 1;
/** after the last line: the room does not empty and the light does not drop
 *  away. It settles — and a few seconds later the APPARATUS ends the beat, not
 *  the player: the overlay tries to update and cannot (S133). */
const AFTER_LEVEL = 0.74;
const AFTER_STATION = 3;
/** how long the full room holds after the closing before the apparatus fails —
 *  ⚑ 2026-09-13: now `system.terminateSeconds` in s4_ball.json (the shutdown is named) */
/** the invitation card, on the worn visor's 512 x 384 canvas */
const INVITE = { x: 108, y: 92, w: 296, h: 184 } as const;   // ⚑ 2026-09-13: taller — it carries a link and what it is for
const JOIN = { x: INVITE.x + 14, y: INVITE.y + INVITE.h - 34, w: 96, h: 22 } as const;
/** the caption's head start on a clip — the same safety measure `lVoice.ts` and
 *  `offers.ts` keep, for the same reason, and NOT a pacing choice. */
const CAPTION_LEAD = 0.5;

interface BLine { id: string; text: string; audio?: string; hold: number; at?: number; flare?: number }
interface BLabel { id: string; object: string; text: string; hold: number; at?: number; lamps?: number }

type Phase = 'idle' | 'invited' | 'arrival' | 'off' | 'ball' | 'after' | 'done';
interface Hit { x: number; y: number; w: number; h: number; id: string }

const ARRIVAL = script.arrival.labels as unknown as BLabel[];
const SYSTEM = script.system as unknown as {
  intrusions: { at: number; hold: number }[]; mark: string; reconnecting: string; restoring: string;
  present: string; refused: string; terminated: string; reason: string; terminatedNote: string; terminateSeconds: number;
};
const STUTTER = script.stutter.labels as unknown as BLabel[];

/** opening → the four categories → the closing, flattened once at module load:
 *  the ball is one continuous run of lines and the category boundaries are a
 *  fact about the writing, not a state machine. */
const BALL_LINES: BLine[] = [
  ...(script.ball.opening.lines as unknown as BLine[]),
  ...(script.ball.categories as unknown as { lines: BLine[] }[]).flatMap((c) => c.lines),
  ...(script.ball.closing.lines as unknown as BLine[])
];

export class E4Ball {
  /** bumped on every change to what the VISOR draws (the machine's own
   *  failures, and nothing else). `E4Shell` folds it into its own version so
   *  the room re-uploads that texture only when it actually changed. */
  version = 0;

  /** ⚑ S133: the overlay drops. The device STAYS ON; `E4Shell` moves to its
   *  `ball` stage (still pinned to the face) and the room shows through. */
  onDeviceOff?: () => void;
  /** the beat is over — the apparatus fails next. Hands the era to its finale. */
  onOver?: () => void;
  /** she pressed Go in. The shell files it; this file never touches a ledger. */
  onJoin?: () => void;
  /** the one control this surface ever publishes: the invitation's chip */
  hits: Hit[] = [];

  private phase: Phase = 'idle';
  private t = 0;
  /** seconds since the ball's first line — the stutter schedule's clock */
  private ballT = 0;
  private queue: BLine[] = [];
  private cur: BLine | null = null;
  private spoke = false;
  private labels: BLabel[] = [];
  private label: BLabel | null = null;
  private labelT = 0;
  private stutterNext = 0;
  /** the attention's last authored mark, so a line with no `at` holds it */
  private station = 1;
  private caption: HTMLDivElement | null = null;

  get live(): boolean { return this.phase !== 'idle' && this.phase !== 'done'; }
  /** how much of the agent's environment is still on the glass: 1 before she
   *  goes in, falling label by label as the filter fails, 0 once the room is
   *  hers. The session does not end — it is seen through. */
  get environmentK(): number {
    if (this.phase === 'idle' || this.phase === 'invited') return 1;
    if (this.phase === 'arrival') {
      /**
       * ⚑ THE FIGHT'S SCORE (2026-09-13, `arrival._docStruggle`). The base falls
       * a step per label, as before; over it the glass CLEARS IN FLASHES that
       * come faster and hold longer with each label — the room breaking
       * through — and snaps back as the system restores its environment. By
       * the last label the flashes are most of the time.
       */
      const total = ARRIVAL.length;
      const left = this.labels.length + (this.label ? 1 : 0);
      const stage = total - left;                       // 0 on the first label
      const base = Math.max(0.08, (left - 1) / total);
      const period = Math.max(0.7, 2.4 - stage * 0.5);
      const open = 0.25 + stage * 0.28;                 // how much of each period is clear
      const ph = (this.labelT % period) / period;
      const flash = ph < open ? 1 : 0;
      return flash ? Math.min(base, 0.1) : Math.min(1, base + 0.18);
    }
    return 0;
  }
  /** 0..1 — how much of the room's own voice (its words, its hearts) is on the glass during the arrival */
  get breakthroughK(): number {
    if (this.phase !== 'arrival') return 0;
    const total = ARRIVAL.length;
    const left = this.labels.length + (this.label ? 1 : 0);
    return Math.min(1, (total - left) / (total - 1));
  }
  /** the stream window is on while the room is: from the glass clearing to the end */
  get streaming(): boolean { return this.phase === 'ball' || this.phase === 'after'; }
  /** the stream is VIDEO: it repaints twelve times a second while it is on */
  get streamVersion(): number { return this.streaming ? 1 + Math.floor(this.ballT * 12) : 0; }
  /** 0..1, decaying — the room answering a landing (the line's `flare`) */
  private landingK = 0;
  private lineSeq = 0;
  /** the ball clock at the moment the current line began — the lower third's slide */
  private lineAt = 0;
  /** the category the MC is calling right now, for the stream's own title */
  private get categoryTitle(): string {
    const cats = script.ball.categories as unknown as { title: string; lines: BLine[] }[];
    const id = this.cur?.id ?? '';
    for (const c of cats) if (c.lines.some(l => l.id === id)) return c.title;
    return '';
  }
  get invited(): boolean { return this.phase === 'invited'; }
  get phaseId(): string { return this.phase; }
  /** true from the moment the device comes off — `E4Shell` reads it to decide
   *  whether the visor is on a face or on a stand. */
  get deviceOff(): boolean {
    return this.phase === 'off' || this.phase === 'ball' || this.phase === 'after';
  }
  /** ⚑ the one press this beat takes, and it is only live once the categories
   *  have run out. A stray press must not be able to cut the piece's only
   *  respite short — and nothing anywhere announces the difference, so a player
   *  who presses early simply finds that nothing happens, which is what the
   *  whole era has been like. */
  get returnable(): boolean { return this.phase === 'after'; }

  /**
   * ⚑ THE WAY IN, and it is `E4Offers.onBreak` — the seam S78 left named and
   * empty, between the careful pause and the era's finale. L has just stopped
   * talking. The place is still up. And something comes in from the other side
   * of the building, which has been open since 2016.
   */
  /**
   * ⚑ THE INVITATION (S133). `E4Offers.onBreak` lands here now instead of on
   * `begin()`: the offers hold, and the visor shows one card — Junie, muted six
   * weeks ago, delivered anyway — with one chip. Nothing else is pressable and
   * nothing announces it. Going is hers.
   */
  invite(): void {
    if (this.phase !== 'idle') return;
    this.phase = 'invited';
    this.hits = [{ ...JOIN, id: 'commons-join' }];
    this.version++;
    // the room is already audible through the wall while she decides
    roomBed.set(script.room.bed, 4.0);
  }

  begin(): void {
    if (this.phase !== 'idle' && this.phase !== 'invited') return;
    this.hits = [];
    this.phase = 'arrival';
    this.labels = [...ARRIVAL];
    this.nextLabel();
    // ⚑ 2026-09-13: the hall is THERE from the press — behind the agent's
    //   environment, seen through it in flashes as the filter fights (see
    //   `environmentK`). It used to arrive only when the device came off.
    setCommonsWorld(true);
    // the room begins to warm behind the picture, low, while the machine works
    this.light(ARRIVAL_LEVEL, 1, 0);
    /**
     * ⚑ S109 — AND THE ROOM IS FINALLY AUDIBLE. `s4_ball.json`'s `room` block has
     * named these two files since S79 and **nothing in this class ever played
     * them** — only `lines[].audio` went through `playOnce` — so the piece's one
     * respite was 46 silent captions over three and a half minutes, with the MC
     * saying *"Music stays on"* over nothing. Review round 1 called it the
     * biggest single gap in what a player feels, and it was right.
     *
     * ⚑ THROUGH A WALL FIRST. The bed arrives while the device is still on her
     * face and the ball is somewhere else in the building — muffled, structured,
     * unmistakably a room full of people. The `landing` below is the same
     * recording with the wall taken away.
     *
     * ⚑ AND THE 38 VOICES STAY UNVOICED. This is the ROOM, not the MC: a bed and
     * a landing, no speech, no synthesis of anybody's words. That refusal
     * (`_docVoice`, `_docNoBall`) is untouched and must stay untouched.
     */
    roomBed.set(script.room.bed, 4.0);
    setCommonsLamps(this.label?.lamps ?? 0);
  }
  /** the lamps and the people arrive together — the people from nine lamps on */
  private crowd(n: number): void {
    setCommonsLamps(n);
    setCommonsFigures(n >= 9);
  }

  update(dt: number): void {
    if (this.phase === 'idle' || this.phase === 'done') return;
    this.t += dt;

    if (this.phase === 'invited') return;   // waiting on her, indefinitely
    if (this.phase === 'arrival') {
      const b4 = this.labelT;
      this.labelT += dt;
      if (Math.floor(b4 * 10) !== Math.floor(this.labelT * 10)) this.version++;   // the flashes are drawn, so they are uploaded
      if (this.label && this.labelT >= this.label.hold) {
        if (this.labels.length > 0) { this.nextLabel(); this.crowd(this.label?.lamps ?? 0); }
        else { this.phase = 'off'; this.t = 0; }
      }
      return;
    }

    if (this.phase === 'off') {
      // ⚑ the machine's last output stays up while the device comes off, and
      // then the surface is simply dark. Nobody takes it off on screen and
      // nothing narrates it: the picture ends, and the room is there.
      if (this.t >= OFF_SECONDS) {
        this.label = null;
        this.version++;
        this.onDeviceOff?.();
        this.phase = 'ball';
        // ⚑ 2026-09-12 — THE ROOM GOES. She is somewhere else now: the hall,
        //   the stage, the screen, the crowd (commonsWorld.ts). The building
        //   comes back when the device stops.
        setCommonsWorld(true);
        this.ballT = 0;
        // ⚑ THE WALL COMES DOWN with the device. The same recording, unfiltered:
        //   she is not hearing it from somewhere else any more.
        roomBed.set(script.room.landing, 2.5);
        this.queue = [...BALL_LINES];
        this.nextLine();
      }
      return;
    }

    this.ballT += dt;
    this.landingK = Math.max(0, this.landingK - dt / 2.4);
    this.stutterClock(dt);
    this.intrusionClock(dt);

    if (this.phase === 'after') {
      // ⚑ S133: the room stays; the APPARATUS does not. A few seconds after the
      //   last line the overlay tries to update, and the era's finale takes it
      //   from there — L returning to material it cannot process, the glitch,
      //   the device stopping. Nobody presses anything; nothing asks her to.
      // ⚑ 2026-09-13: and the "update" is a TERMINATION, named — the system
      //   gives up the room and says why in its own words (`system.terminated`).
      const b4 = this.afterT;
      this.afterT += dt;
      if (Math.floor(b4 * 8) !== Math.floor(this.afterT * 8)) this.version++;
      if (this.afterT >= SYSTEM.terminateSeconds) this.close();
      return;
    }
    this.lineClock(dt);
  }

  /** the line clock: the caption is on screen, then the clip follows it. */
  private lineClock(dt: number): void {
    if (!this.cur) return;
    const before = this.lineT;
    this.lineT += dt;
    if (!this.spoke && before < CAPTION_LEAD && this.lineT >= CAPTION_LEAD) this.speak(this.cur);
    if (this.lineT < this.cur.hold) return;
    if (this.queue.length > 0) { this.nextLine(); return; }
    // ⚑ THE CATEGORIES RUN OUT AND NOTHING ELSE HAPPENS. The light settles, the
    // caption clears, and there is no further beat in this file — not a fade,
    // not a prompt, not an ending. The room is still full.
    this.cur = null;
    this.showCaption('');
    this.phase = 'after';
    this.afterT = 0;
    this.light(AFTER_LEVEL, AFTER_STATION, 0);
    this.version++;
  }

  private lineT = 0;
  private afterT = 0;

  private nextLine(): void {
    this.lineSeq++;
    this.cur = this.queue.shift() ?? null;
    if (this.cur?.flare) this.landingK = 1;
    this.lineAt = this.ballT;
    this.lineT = 0;
    this.spoke = false;
    if (!this.cur) return;
    this.showCaption(this.cur.text);
    this.light(BALL_LEVEL, this.cur.at ?? this.station, this.cur.flare ?? 0);
  }

  private nextLabel(): void {
    this.label = this.labels.shift() ?? null;
    this.labelT = 0;
    this.version++;
  }

  /**
   * ⚑ PEER PRESSURE (2026-09-13, `system._doc`). Twice during the ball the
   * agent comes back for her: a card on the glass — reconnecting, restoring
   * the environment — with a bar that climbs and is pushed back down by the
   * room's own count until the connection is refused. Nothing is pressable;
   * nothing narrates it. The third time it terminates (see `after`).
   */
  private intrusionIdx = 0;
  private intrusionT = -1;   // <0: none running
  private intrusionClock(dt: number): void {
    if (this.phase !== 'ball') return;
    if (this.intrusionT < 0) {
      const next = SYSTEM.intrusions[this.intrusionIdx];
      if (next && this.ballT >= next.at) { this.intrusionT = 0; this.version++; }
      return;
    }
    const b4 = this.intrusionT;
    this.intrusionT += dt;
    if (Math.floor(b4 * 8) !== Math.floor(this.intrusionT * 8)) this.version++;
    const cur = SYSTEM.intrusions[this.intrusionIdx];
    if (cur && this.intrusionT >= cur.hold) { this.intrusionT = -1; this.intrusionIdx++; this.version++; }
  }
  /** the intrusion's bar: climbs for the first half, is pushed back for the second */
  private intrusionBar(t: number, hold: number): number {
    const half = hold * 0.55;
    if (t < half) return Math.min(0.78, (t / half) * 0.78);
    const back = (t - half) / (hold - half);
    return Math.max(0, 0.78 * (1 - back * back));
  }
  /** the room's count while the system is on the glass — it goes UP */
  private presentCount(t: number): number { return 41 + Math.floor(t * 1.8); }

  /** the machine goes on trying, on its stand, three times, and then stops. */
  private stutterClock(dt: number): void {
    if (this.label) {
      this.labelT += dt;
      if (this.labelT >= this.label.hold) { this.label = null; this.version++; }
    }
    const next = STUTTER[this.stutterNext];
    if (!next || this.ballT < (next.at ?? 0)) return;
    this.stutterNext++;
    this.label = next;
    this.labelT = 0;
    this.version++;
  }

  private speak(l: BLine): void {
    this.spoke = true;
    if (!l.audio || !l.text) return;
    // ⚑ unregistered names are silently never requested (the audio registry's
    // own law) — and per the data file's `_docVoice` none of these may ever be
    // rendered by build-time TTS. They wait on real recordings.
    playOnce(l.audio);
  }

  private light(level: number, station: number, flare: number): void {
    this.station = station;
    setBallLight({ level, station, flare });
  }

  /**
   * ⚑ THE PLAYER PUT IT BACK ON, which is the only way this beat ends and is
   * never asked for. The room does not stop — the light goes back down over the
   * cluster's own seven seconds while the era's finale begins, so the ball is
   * still going on behind the last thing the apparatus has to say.
   */
  close(): void {
    if (this.phase === 'done') return;
    this.phase = 'done';
    this.cur = null;
    this.label = null;
    this.hits = [];
    this.showCaption('');
    this.removeCaption();
    setBallLight(null);
    // ⚑ the lamps stay lit through the finale: the room is still full when the
    //   picture ends. They go with the era, in `E4Shell.finishHandOff`.
    this.version++;
    this.onOver?.();
  }

  /** every lamp goes out — the era is over, not the community */
  clearLamps(): void { setCommonsLamps(0); setCommonsFigures(false); }
  /** the device has stopped: the hall goes and the room she was in comes back */
  leaveWorld(): void { setCommonsWorld(false); this.clearLamps(); }

  /**
   * The press. With coordinates and the invitation up, it is the chip or
   * nothing; consumed always. In `after` a press still ends the beat early,
   * exactly as before, so a player who wants to leave can.
   */
  handleClick(x?: number, y?: number): boolean {
    if (this.phase === 'invited') {
      if (x === undefined || y === undefined) return true;
      const h = this.hits[0];
      if (h && x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) {
        this.onJoin?.();
        this.begin();
      }
      return true;
    }
    if (!this.returnable) return true;
    this.close();
    return true;
  }

  // ── the machine's surface, and it is the only thing this file draws ────────
  /**
   * ⚑ WHAT THE VISOR SHOWS, and it is never the ball. During the arrival it is
   * L's label field over the place — the same instrument that captioned her
   * shoes, working on a room. After the device comes off it is dark glass on a
   * stand a metre away, with the machine's own occasional failures on it,
   * legible only if the player turns back to look at it.
   */
  draw(ctx: CanvasRenderingContext2D, W: number, H: number, x: number, y: number, w: number): void {
    if (this.phase === 'invited') {
      /**
       * ⚑ THE CARD — a notification, the way a message arrives on a device in
       * 2026: a light card on the dark glass, the sender's avatar, the line,
       * and the apparatus's own admission underneath that the mute did not
       * hold. One pill. No decline exists, and nothing narrates the choice.
       */
      const inv = script.invite;
      roundRect(ctx, INVITE.x, INVITE.y + 2, INVITE.w, INVITE.h, 10, ERA4.panelEdge);
      roundRect(ctx, INVITE.x, INVITE.y, INVITE.w, INVITE.h, 10, WEB.card);
      // ⚑ 2026-09-13: Junie is not the agent — her mark is the room's pink, not the system's green
      avatar(ctx, INVITE.x + 14, INVITE.y + 14, 26, PLACE.textileHi, inv.from.slice(0, 1));
      setFont(ctx, 8);
      ctx.fillStyle = WEB.muted;
      ctx.fillText(script.commons.name + '  ·  now', INVITE.x + 50, INVITE.y + 12);
      setFont(ctx, 11);
      ctx.fillStyle = WEB.ink;
      ctx.fillText(inv.from, INVITE.x + 50, INVITE.y + 24);
      setFont(ctx, 12);
      let y = INVITE.y + 48;
      for (const row of wrapText(ctx, inv.line, INVITE.w - 28)) { ctx.fillText(row, INVITE.x + 14, y); y += 16; }
      // ⚑ 2026-09-13: THE LINK, and what it is for — see invite._docLink
      setFont(ctx, 10);
      const lw = Math.ceil(ctx.measureText(inv.link).width) + 22;
      roundRect(ctx, INVITE.x + 14, y + 2, lw, 18, 9, WEB.accentSoft);
      ctx.fillStyle = WEB.accentInk;
      ctx.fillText(inv.link, INVITE.x + 25, y + 6);
      px(ctx, INVITE.x + 25, y + 16, lw - 22, 1, WEB.accentInk);
      y += 26;
      setFont(ctx, 9);
      ctx.fillStyle = WEB.ink;
      for (const row of wrapText(ctx, inv.note, INVITE.w - 28)) { ctx.fillText(row, INVITE.x + 14, y); y += 12; }
      setFont(ctx, 8);
      ctx.fillStyle = WEB.muted;
      ctx.fillText(inv.meta, INVITE.x + 14, INVITE.y + INVITE.h - 48);
      webButton(ctx, JOIN.x, JOIN.y, inv.chip, 'primary', JOIN.w);
      return;
    }
    // ⚑ the system on the glass during the ball: the intrusions, and the termination
    if (this.phase === 'ball' && this.intrusionT >= 0) {
      const cur = SYSTEM.intrusions[this.intrusionIdx];
      if (cur) this.drawIntrusion(ctx, W, H, this.intrusionT, cur.hold);
    }
    if (this.phase === 'after') this.drawTermination(ctx, W, H, this.afterT);
    if (this.phase === 'arrival') this.drawBreakthrough(ctx, W, H);
    if (!this.label) return;
    if (this.phase === 'arrival' || this.phase === 'off') {
      // ⚑ FRONT AND CENTRE, and wide: this is the filter failing, on the glass
      //   she is looking through. It used to sit in the corner of a nine-
      //   centimetre visor across the room, where nobody ever read it.
      const fw = Math.round(W * 0.62);
      labelField(ctx, Math.round((W - fw) / 2), Math.round(H * 0.42), fw, this.label.object, this.label.text);
      return;
    }
    // the stutter: the overlay still trying, small, in its old corner
    labelField(ctx, x, y, w, this.label.object, this.label.text);
  }

  /** ⚑ the room's own words and hearts bleeding onto the glass as the filter
   *  loses (2026-09-13) — the stream's chat, nobody's words, at the edges, more
   *  of them and brighter with every label the system fails to make stick */
  private drawBreakthrough(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const k = this.breakthroughK;
    if (k <= 0) return;
    const chat = script.stream.chat as string[];
    const n = Math.round(2 + k * 10);
    const t = this.t;
    const was = ctx.globalAlpha;
    for (let i = 0; i < n; i++) {
      const seed = i * 7919 + 13;
      const x = ((seed * 31) % 1000) / 1000;
      const y0 = ((seed * 17) % 1000) / 1000;
      const rise = ((t * (0.05 + (i % 3) * 0.02)) + y0) % 1;
      const px0 = Math.round(20 + x * (W - 60));
      const py0 = Math.round(H - 30 - rise * (H - 60));
      const word = chat[(i * 5) % chat.length];
      ctx.globalAlpha = was * Math.min(1, k * 0.9 + 0.1) * (0.35 + 0.65 * (1 - rise));
      setFont(ctx, word.length <= 2 ? 16 : 11);
      ctx.fillStyle = i % 4 === 0 ? PLACE.textileHi : i % 4 === 1 ? PLACE.sunHi : i % 4 === 2 ? ERA4.l : ERA4.textHi;
      ctx.fillText(word, px0, py0);
    }
    ctx.globalAlpha = was;
  }

  /** the agent back on the glass: a card, a bar that climbs and is pushed back, the room's count going up */
  private drawIntrusion(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, hold: number): void {
    const fade = Math.min(1, t / 0.6, (hold - t) / 0.8);
    const was = ctx.globalAlpha;
    ctx.globalAlpha = was * Math.max(0, fade);
    const cw = 268, ch = 96, cx = Math.round((W - cw) / 2), cy = Math.round(H * 0.30);
    roundRect(ctx, cx, cy + 2, cw, ch, 10, ERA4.panelEdge);
    roundRect(ctx, cx, cy, cw, ch, 10, ERA4.panel);
    avatar(ctx, cx + 12, cy + 12, 22, WEB.primary, 'S');
    setFont(ctx, 10);
    ctx.fillStyle = ERA4.textHi;
    ctx.fillText(SYSTEM.mark, cx + 42, cy + 12);
    setFont(ctx, 8);
    ctx.fillStyle = ERA4.dim;
    ctx.fillText(SYSTEM.reconnecting, cx + 42, cy + 24);
    const bar = this.intrusionBar(t, hold);
    setFont(ctx, 9);
    ctx.fillStyle = ERA4.meta;
    ctx.fillText(SYSTEM.restoring, cx + 12, cy + 46);
    pill(ctx, cx + 12, cy + 60, cw - 24, 5, ERA4.rule);
    pill(ctx, cx + 12, cy + 60, Math.round((cw - 24) * bar), 5, ERA4.lDim);
    // the room pushing back: its count, going up, in the room's colour
    const present = SYSTEM.present.replace('{n}', String(this.presentCount(t)));
    setFont(ctx, 9);
    ctx.fillStyle = PLACE.textileHi;
    const pw = Math.ceil(ctx.measureText(present).width);
    ctx.fillText(present, cx + cw - 12 - pw, cy + 72);
    if (t > hold * 0.55) {
      ctx.fillStyle = ERA4.dim;
      ctx.fillText(SYSTEM.refused, cx + 12, cy + 72);
    }
    ctx.globalAlpha = was;
  }

  /** the shutdown, named in the system's own ideology — the beat before the glitch */
  private drawTermination(ctx: CanvasRenderingContext2D, W: number, H: number, t: number): void {
    const k = Math.min(1, t / 0.5);
    const was = ctx.globalAlpha;
    ctx.globalAlpha = was * k;
    const cw = 300, ch = 92, cx = Math.round((W - cw) / 2), cy = Math.round(H * 0.34);
    roundRect(ctx, cx, cy + 2, cw, ch, 10, ERA4.panelEdge);
    roundRect(ctx, cx, cy, cw, ch, 10, ERA4.field);
    px(ctx, cx, cy, cw, 3, ERA4.l);
    setFont(ctx, 14);
    ctx.fillStyle = ERA4.textHi;
    ctx.fillText(SYSTEM.terminated, cx + 16, cy + 16);
    setFont(ctx, 10);
    ctx.fillStyle = ERA4.l;
    ctx.fillText(SYSTEM.reason, cx + 16, cy + 40);
    setFont(ctx, 8);
    ctx.fillStyle = ERA4.dim;
    for (const row of wrapText(ctx, SYSTEM.terminatedNote, cw - 32)) { ctx.fillText(row, cx + 16, cy + 62); }
    ctx.globalAlpha = was;
  }

  /**
   * ⚑ THE CORRECTION SESSION — what the glass shows from the moment the
   * device goes on until Junie's card. The agent's own environment: a calm
   * field, a horizon, the photograph it restored framed on the wall, its mark,
   * one line, and a "preparing" bar that never completes. It is the program's
   * fifth step, and it never begins; what begins is the card.
   */
  drawSession(ctx: CanvasRenderingContext2D, W: number, H: number, t: number): void {
    const S = script.session;
    px(ctx, 0, 0, W, H, ERA4.field);
    // a horizon and a floor: the environment is a room the size of the glass
    px(ctx, 0, Math.round(H * 0.58), W, H, ERA4.panel);
    px(ctx, 0, Math.round(H * 0.58), W, 1, ERA4.ruleHi);
    // the photograph, framed on the wall — the one it made
    const pw = 150, ph = 93, fx = Math.round(W * 0.16), fy = Math.round(H * 0.22);
    px(ctx, fx - 6, fy - 6, pw + 12, ph + 12, ERA4.panelHi);
    photograph(ctx, fx, fy, pw, ph, true, 3);
    // the mark and the line
    avatar(ctx, Math.round(W * 0.56), fy, 24, WEB.primary, 'S');
    setFont(ctx, 9);
    ctx.fillStyle = ERA4.meta;
    ctx.fillText(S.mark + '  ·  ' + S.title, Math.round(W * 0.56) + 32, fy + 2);
    const SB = S as unknown as { grounding: { title: string; in: string; out: string; note: string };
      recorded: { title: string; mark: string; lines: string[] } };
    const item = t < S.seconds ? 0 : t < S.seconds + 8 ? 1 : 2;   // ⚑ 2026-09-13: the session BEGINS (session._docBegins)
    const tx = Math.round(W * 0.56);
    if (item === 0) {
      setFont(ctx, 12);
      ctx.fillStyle = ERA4.textHi;
      let y = fy + 36;
      for (const row of wrapText(ctx, S.line, Math.round(W * 0.38))) { ctx.fillText(row, tx, y); y += 17; }
      // preparing: a bar that fills slowly and is not going to get there
      setFont(ctx, 9);
      ctx.fillStyle = ERA4.dim;
      ctx.fillText(S.preparing, tx, y + 8);
      const bw = Math.round(W * 0.34);
      pill(ctx, tx, y + 22, bw, 5, ERA4.rule);
      pill(ctx, tx, y + 22, Math.round(bw * Math.min(0.82, t / (S.seconds * 1.3))), 5, ERA4.lDim);
    } else if (item === 1) {
      // grounding: a ring that breathes, four seconds in, four out
      const gt = t - S.seconds;
      const phase = (gt % 8) / 8;
      const k = phase < 0.5 ? phase * 2 : 2 - phase * 2;
      const r = Math.round(14 + k * 14);
      const rx = tx + 60, ry = fy + 78;   // under the title, with the ring's full breath clear of it
      setFont(ctx, 9);
      ctx.fillStyle = ERA4.meta;
      ctx.fillText(SB.grounding.title, tx, fy + 34);
      for (let i = 3; i >= 1; i--) {
        const was = ctx.globalAlpha;
        ctx.globalAlpha = was * (0.18 + 0.22 * (4 - i) / 3);
        roundRect(ctx, rx - r * i / 3, ry - r * i / 3, r * 2 * i / 3, r * 2 * i / 3, r * i / 3, ERA4.l);
        ctx.globalAlpha = was;
      }
      setFont(ctx, 12);
      ctx.fillStyle = ERA4.textHi;
      ctx.fillText(phase < 0.5 ? SB.grounding.in : SB.grounding.out, rx + 44, ry - 6);
      setFont(ctx, 8);
      ctx.fillStyle = ERA4.dim;
      ctx.fillText(SB.grounding.note, tx, ry + 38);
    } else {
      // the recorded voice: the system's own genre, two flat sentences it vouches for
      const rt = t - S.seconds - 8;
      setFont(ctx, 9);
      ctx.fillStyle = ERA4.meta;
      ctx.fillText(SB.recorded.title, tx, fy + 34);
      const line = SB.recorded.lines[Math.min(SB.recorded.lines.length - 1, Math.floor(rt / 4))];
      setFont(ctx, 12);
      ctx.fillStyle = ERA4.textHi;
      let y = fy + 52;
      for (const row of wrapText(ctx, '“' + line + '”', Math.round(W * 0.38))) { ctx.fillText(row, tx, y); y += 17; }
      // a play bar, running
      const bw = Math.round(W * 0.34);
      pill(ctx, tx, y + 10, bw, 4, ERA4.rule);
      pill(ctx, tx, y + 10, Math.round(bw * Math.min(1, rt / 9)), 4, ERA4.l);
      setFont(ctx, 8);
      ctx.fillStyle = ERA4.dim;
      ctx.fillText(SB.recorded.mark, tx, y + 20);
    }
    // ⚑ 2026-09-13: the plan, arriving item by item on the environment's floor —
    //   what the session was going to be. See s4_ball.json `_docPlan`.
    const floor = Math.round(H * 0.58);
    const plan = (S as unknown as { plan: { n: string; title: string; meta: string }[]; planTitle: string; environment: string });
    const px0 = Math.round(W * 0.16), pw0 = Math.round(W * 0.68);
    setFont(ctx, 9);
    ctx.fillStyle = ERA4.meta;
    ctx.fillText(plan.planTitle, px0, floor + 12);
    const envW = Math.ceil(ctx.measureText(plan.environment).width) + 16;
    pill(ctx, px0 + pw0 - envW, floor + 10, envW, 13, ERA4.panelHi);
    ctx.fillStyle = ERA4.dim;
    ctx.fillText(plan.environment, px0 + pw0 - envW + 8, floor + 12);
    const shown = Math.min(plan.plan.length, Math.floor(t / 2.2));
    plan.plan.forEach((it, k) => {
      if (k >= shown) return;
      const ry = floor + 30 + k * 30;
      const running = k === item - 1;
      roundRect(ctx, px0, ry, pw0, 26, 5, running ? ERA4.rule : ERA4.panelHi);
      avatar(ctx, px0 + 8, ry + 5, 16, running ? ERA4.l : k < item - 1 ? WEB.accent : ERA4.lDim, k < item - 1 ? '✓' : it.n);
      setFont(ctx, 10);
      ctx.fillStyle = ERA4.textHi;
      ctx.fillText(it.title, px0 + 32, ry + 4);
      setFont(ctx, 8);
      ctx.fillStyle = ERA4.dim;
      ctx.fillText(it.meta, px0 + 32, ry + 15);
    });
    visorEdge(ctx, W, H);
  }

  /**
   * ⚑ THE STREAM — `transjesus.str`, drawn on the window above the desk. The
   * picture is the piece's own photograph of a ball (variant 2 — the crowd in
   * silhouette, one person with the floor), under a title bar with the LIVE
   * dot and the count, the category the MC is calling as its caption, and a
   * chat column of nobody's words. No voice, ever.
   */
  drawStream(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const ST = script.stream;
    px(ctx, 0, 0, W, H, ERA4.field);
    if (!this.streaming) return;
    const t = this.ballT;
    // ⚑ 2026-09-13 (`stream._docPanel`): a taller title bar naming the event
    //   and the host, the category large in the lower third, the chat larger
    const TB = 24;
    const cw = 104, pw = W - cw - 4, ph = H - TB - 4;
    // the picture: a broadcast that cuts between shots
    streamScene(ctx, 2, TB + 2, pw, ph, t, streamShot(t), this.landingK);
    // the title bar: LIVE blinking, the mark, the event, the count ticking
    px(ctx, 0, 0, W, TB, ERA4.panel);
    if (Math.floor(t * 1.5) % 2 === 0) px(ctx, 8, 9, 6, 6, WEB.danger);
    setFont(ctx, 9);
    ctx.fillStyle = ERA4.textHi;
    ctx.fillText(ST.live, 18, 4);
    ctx.fillStyle = ERA4.text;
    ctx.fillText(ST.mark, 48, 4);
    setFont(ctx, 8);
    ctx.fillStyle = PLACE.textileHi;
    ctx.fillText(ST.event, 18, 14);
    ctx.fillStyle = ERA4.dim;
    ctx.fillText(ST.host, 18 + Math.ceil(ctx.measureText(ST.event).width) + 10, 14);
    const watching = (38 + Math.floor((Math.sin(t * 0.21) + 1) * 4.5)) + ' watching';
    setFont(ctx, 9);
    ctx.fillStyle = ERA4.textHi;
    ctx.fillText(watching, W - 8 - Math.ceil(ctx.measureText(watching).width), 8);
    // the lower third: the category, by number and title, sliding in when it changes
    const title = this.categoryTitle;
    if (title) {
      const cats = script.ball.categories as unknown as { title: string }[];
      const idx = cats.findIndex((c) => c.title === title);
      const of = ST.categoryOf.replace('{n}', String(idx + 1)).replace('{m}', String(cats.length));
      const since = this.ballT - this.lineAt;
      const k = Math.min(1, since / 0.5);
      setFont(ctx, 11);
      const tw = Math.min(pw - 16, Math.ceil(ctx.measureText(title).width) + 24);
      const lx = 8 - Math.round((1 - k) * (tw + 20));
      roundRect(ctx, lx, H - 40, tw, 32, 3, ERA4.panel);
      px(ctx, lx, H - 40, 4, 32, PLACE.textileHi);
      setFont(ctx, 8);
      ctx.fillStyle = PLACE.sunHi;
      ctx.fillText(of, lx + 12, H - 36);
      setFont(ctx, 11);
      ctx.fillStyle = ERA4.textHi;
      ctx.save(); ctx.beginPath(); ctx.rect(lx, H - 40, tw, 32); ctx.clip();
      ctx.fillText(title, lx + 12, H - 24);
      ctx.restore();
    }
    // the chat column: lines arriving, hearts rising
    px(ctx, W - cw - 2, TB, cw + 2, H - TB, ERA4.panel);
    setFont(ctx, 9);
    const chat = ST.chat as string[];
    const n = Math.floor(t * 0.9);
    const slide = Math.round((t * 0.9 % 1) * 18);
    ctx.save(); ctx.beginPath(); ctx.rect(W - cw, TB, cw, H - TB); ctx.clip();
    for (let k = 0; k < 10; k++) {
      const m = chat[(n + k) % chat.length];
      ctx.fillStyle = k === 9 ? ERA4.textHi : k > 6 ? ERA4.text : ERA4.dim;
      ctx.fillText(m, W - cw + 6, TB + 8 + k * 18 - slide);
    }
    ctx.restore();
    for (let k = 0; k < 6; k++) {
      const life = ((t * 0.7 + k * 0.37) % 1);
      const hx = W - 18 - ((k * 11) % 20), hy = H - 10 - Math.round(life * (H - 40));
      ctx.save(); ctx.globalAlpha = (1 - life) * (this.landingK > 0.2 ? 1 : 0.5);
      ctx.fillStyle = PLACE.textileHi;
      ctx.fillText('♥', hx, hy);
      ctx.restore();
    }
  }

  // ── the subtitle (frame chrome — see the file header) ─────────────────────
  private showCaption(text: string): void {
    if (!text) {
      if (this.caption) this.caption.style.opacity = '0';
      return;
    }
    if (!this.caption) this.mountCaption();
    if (!this.caption) return;
    this.caption.textContent = text;
    this.caption.style.opacity = '1';
  }

  private mountCaption(): void {
    if (typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.id = 'reinterp-ball-caption';
    el.setAttribute('aria-live', 'polite');
    Object.assign(el.style, {
      position: 'fixed', left: '50%', bottom: '4%', transform: 'translateX(-50%)',
      zIndex: '9', background: BALL.captionField, color: BALL.captionInk,
      font: '13px monospace', padding: '6px 14px', borderRadius: '4px',
      maxWidth: '76%', textAlign: 'center', lineHeight: '1.45',
      opacity: '0', pointerEvents: 'none', transition: 'opacity 0.3s'
    } as CSSStyleDeclaration);
    document.body.appendChild(el);
    this.caption = el;
  }

  private removeCaption(): void {
    this.caption?.remove();
    this.caption = null;
  }

  // ── review (?debug=1) ────────────────────────────────────────────────────
  /**
   * Land on a point in the beat directly. Review only — in play the whole thing
   * runs forward from the careful pause by ordinary clicking, and none of this
   * is reachable. C6: every beat gets a panel button, because three sessions
   * have now shipped beats the project lead could not reach and concluded
   * content was missing when it wasn't.
   */
  debugJumpTo(where: 'invited' | 'arrival' | 'noCategory' | 'ball' | 'category' | 'after', index = 0): void {
    this.removeCaption();
    this.phase = 'idle';
    this.stutterNext = 0;
    this.ballT = 0;
    if (where === 'invited') { this.invite(); return; }
    this.begin();
    if (where === 'arrival') return;
    if (where === 'noCategory') {
      this.labels = [];
      this.label = ARRIVAL[ARRIVAL.length - 1];
      this.labelT = 0;
      this.crowd(this.label.lamps ?? 0);
      this.version++;
      return;
    }
    this.crowd(41);
    setCommonsWorld(true);
    // everything below is past the point where the device comes off
    this.label = null;
    this.onDeviceOff?.();
    this.phase = 'ball';
    this.queue = [...BALL_LINES];
    if (where === 'category') {
      const cats = script.ball.categories as unknown as { lines: BLine[] }[];
      const first = cats[Math.max(0, Math.min(cats.length - 1, index))].lines[0].id;
      while (this.queue.length > 0 && this.queue[0].id !== first) this.queue.shift();
    }
    if (where === 'after') {
      this.queue = [];
      this.cur = null;
      this.showCaption('');
      this.phase = 'after';
      this.light(AFTER_LEVEL, AFTER_STATION, 0);
      this.version++;
      return;
    }
    this.nextLine();
  }
}
