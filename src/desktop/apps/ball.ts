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
import { labelField, chip, BALL, ERA4 } from '../theme/era4';
import { px, setFont } from '../theme/chrome';
import { setBallLight } from '../../room/cluster';
import { setCommonsLamps } from '../../room/commonsLamps';
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
/** how long the full room holds after the closing before the apparatus fails */
const AFTER_SECONDS = 5.0;
/** the invitation card, on the worn visor's 512 x 384 canvas */
const INVITE = { x: 126, y: 118, w: 260, h: 118 } as const;
const JOIN = { x: INVITE.x + 12, y: INVITE.y + INVITE.h - 40, w: 96, h: 26 } as const;
/** the caption's head start on a clip — the same safety measure `lVoice.ts` and
 *  `offers.ts` keep, for the same reason, and NOT a pacing choice. */
const CAPTION_LEAD = 0.5;

interface BLine { id: string; text: string; audio?: string; hold: number; at?: number; flare?: number }
interface BLabel { id: string; object: string; text: string; hold: number; at?: number; lamps?: number }

type Phase = 'idle' | 'invited' | 'arrival' | 'off' | 'ball' | 'after' | 'done';
interface Hit { x: number; y: number; w: number; h: number; id: string }

const ARRIVAL = script.arrival.labels as unknown as BLabel[];
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

  update(dt: number): void {
    if (this.phase === 'idle' || this.phase === 'done') return;
    this.t += dt;

    if (this.phase === 'invited') return;   // waiting on her, indefinitely
    if (this.phase === 'arrival') {
      this.labelT += dt;
      if (this.label && this.labelT >= this.label.hold) {
        if (this.labels.length > 0) { this.nextLabel(); setCommonsLamps(this.label?.lamps ?? 0); }
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
    this.stutterClock(dt);

    if (this.phase === 'after') {
      // ⚑ S133: the room stays; the APPARATUS does not. A few seconds after the
      //   last line the overlay tries to update, and the era's finale takes it
      //   from there — L returning to material it cannot process, the glitch,
      //   the device stopping. Nobody presses anything; nothing asks her to.
      this.afterT += dt;
      if (this.afterT >= AFTER_SECONDS) this.close();
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
    this.cur = this.queue.shift() ?? null;
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
  clearLamps(): void { setCommonsLamps(0); }

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
       * ⚑ THE CARD. The apparatus's own panel grammar (`labelField`'s bracket),
       * because the message arrives THROUGH the apparatus — and its second
       * line is the apparatus admitting the mute did not hold. The chip is the
       * headset's grammar, the same as L's answers were. No decline exists.
       */
      const inv = script.invite;
      px(ctx, INVITE.x, INVITE.y, INVITE.w, INVITE.h, ERA4.panel);
      px(ctx, INVITE.x, INVITE.y, INVITE.w, 1, ERA4.ruleHi);
      px(ctx, INVITE.x, INVITE.y + INVITE.h - 1, INVITE.w, 1, ERA4.rule);
      px(ctx, INVITE.x, INVITE.y, 1, INVITE.h, ERA4.rule);
      px(ctx, INVITE.x + INVITE.w - 1, INVITE.y, 1, INVITE.h, ERA4.rule);
      setFont(ctx, 9);
      ctx.fillStyle = ERA4.meta;
      ctx.fillText(script.commons.name, INVITE.x + 12, INVITE.y + 10);
      setFont(ctx, 11);
      ctx.fillStyle = ERA4.text;
      ctx.fillText(inv.from + ' — ' + inv.line, INVITE.x + 12, INVITE.y + 30);
      setFont(ctx, 9);
      ctx.fillStyle = ERA4.dim;
      ctx.fillText(inv.meta, INVITE.x + 12, INVITE.y + 50);
      chip(ctx, JOIN.x, JOIN.y, JOIN.w, JOIN.h, inv.chip, { live: true });
      return;
    }
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
      setCommonsLamps(this.label.lamps ?? 0);
      this.version++;
      return;
    }
    setCommonsLamps(41);
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
