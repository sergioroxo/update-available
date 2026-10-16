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
import { setCommonsLamps, pulseCommonsLamps } from '../../room/commonsLamps';
import { setCommonsFigures, greetCommonsFigures, setCommonsShow, inviteCommonsFigures, answerCommonsFigures } from '../../room/commonsFigures';
import { setHerLamp, raiseHerLamp, herLampRaised, turnToStage } from '../../room/commonsWorld';
import { playOnce, playLoop, stopClip, roomBed } from '../../audio/tapeAudio';
import { isSpeedrun, extraOn, markExtraPassed } from '../../state/cut';
import script from '../../../data/dialog/s4_ball.json';

/**
 * ⚑ S227 — THE COMMONS, STREAMLINED (docs/reinterp/COMMONS_STREAMLINE_2026-10-10.md, and its §8, his answers,
 * which win where they differ). What changed in this file, stated rather than smoothed over:
 *  · ONE SPOT. The hall cuts in and she is cut to the front of the crowd with it (app.ts, the room hook;
 *    nodes.json `commons-spot`). No markers, no ring, no "to your left" (F4, F5; R28 amendment 1 as revised
 *    2026-10-10, "take the viewer there").
 *  · THE CALL, NOT A CONDUCTED TURN (his Q8). After the greeting a small card — "someone is calling you" —
 *    waits on the glass; her press turns her to the stage (`turnToStage`, the engine's slow turn) and the MC
 *    opens. Nothing turns her on its own, so nothing startles her. Law 3's "no prompt" is revised by that
 *    answer: the call is the room's, and it is the only one.
 *  · THE INTRUSIONS LAND ON THE BALL'S STRUCTURE (`afterCategory`), between categories, never on a clock and
 *    never mid-line; the MC waits for the room's refusal and carries on.
 *  · THE SECOND ASKS FOR HER LAMP (his Q2), and is refused whether she raises it or not (Q3).
 *  · LESS TEXT: the first arrival label and the three stutter labels are gone (T2, T3); one stutter line
 *    survives as intrusion 2's status.
 *  · ONE SOUND AT A TIME (§4): one bell, at the drop; the landing at the drop; the room ducked under any
 *    system sound; her lantern waits for a bell still sounding.
 *  · THE SPEEDRUN VERSION is a composition of these same lines (`script.speedrun`), read when `isSpeedrun()`.
 */

/** how long the machine's last failure sits on screen before the device comes
 *  off. Long enough to be read, short enough not to be a pause for effect. */
const OFF_SECONDS = 2.6;
/** ⚑ S161 / R3-105 — THE FIRST FLASH COMES BEFORE THE WORLD. Sérgio (round 3):
 *  "the glitch should appear before the disco starts so we don't miss the
 *  entrance." The hall used to be there from the press, behind the glass, so
 *  the cut from her room to the hall happened under the first label and was
 *  never seen as an event. Now the glass flickers over HER OWN ROOM for this
 *  long — the filter failing with nothing behind it yet — and the hall cuts in
 *  on the first full flash. ⚑ S227: and she is cut to the spot on that flash. */
const WORLD_IN_SECONDS = 2.4;
/** the flicker before the world: the glass drops to this every FLICKER_EVERY s, briefly */
const FLICKER_EVERY = 0.8;
const FLICKER_OPEN = 0.12;
const FLICKER_K = 0.55;
/** ⚑ S161 / R3-106 — the last of the lamps come up in the hall, after the device
 *  is off, over the greeting — not during the fight (the labels now climb to
 *  25; `commonsLamps.ts` holds 41). */
const LAMP_FULL = 41;
/** the room is already warming while the machine is still working at it — the
 *  player sees it around the edges of a picture that does not move. */
const ARRIVAL_LEVEL = 0.28;
const BALL_LEVEL = 1;
/** after the last line: the room does not empty and the light does not drop
 *  away. It settles — and a few seconds later the APPARATUS ends the beat, not
 *  the player: the overlay tries to update and cannot (S133). */
const AFTER_LEVEL = 0.74;
const AFTER_STATION = 3;
/** the invitation card, on the worn visor's 512 x 384 canvas */
const INVITE = { x: 108, y: 92, w: 296, h: 184 } as const;   // ⚑ 2026-09-13: taller — it carries a link and what it is for
const JOIN = { x: INVITE.x + 14, y: INVITE.y + INVITE.h - 34, w: 96, h: 22 } as const;
/** ⚑ S227 — the room's call (his Q8), small, a little below the middle of the glass */
const CALL = { x: 156, y: 168, w: 200, h: 60 } as const;
const CALL_CHIP = { x: CALL.x + 14, y: CALL.y + CALL.h - 30, w: CALL.w - 28, h: 22 } as const;
/** after her press, the turn is under way before the MC has the floor */
const CALL_LEAD = 1.2;
/** after the room refuses an intrusion, the MC carries on this many seconds later */
const RESUME_AFTER_REFUSAL = 1.5;
/** ⚑ S227 / §4 — the room ducks by this while a system sound plays (≈ 9 dB) */
const DUCK_DB = -9;
/** the bell (commons_lamps_rise, 8.0 s) and her lantern (commons_her_lantern, 4.6 s) — one at a time */
const BELL_SECONDS = 8.0;
const LANTERN_SECONDS = 4.6;
/** the session's Begin chip, on the worn visor's canvas (drawn by `drawSession`) */
const BEGIN_W = 84;
/** the caption's head start on a clip — the same safety measure `lVoice.ts` and
 *  `offers.ts` keep, for the same reason, and NOT a pacing choice. */
const CAPTION_LEAD = 0.5;

interface BLine { id: string; text: string; audio?: string; hold: number; at?: number; flare?: number; who?: string }
/** ⚑ Phase 7 — the MC's name in the bubbles (s4_ball.json `ball.mc`) */
const MC_NAME = (script.ball as unknown as { mc: string }).mc;
/** how many bubbles stand at once, newest at the bottom */
const BUBBLES = 3;
interface BLabel { id: string; object: string; text: string; hold: number; at?: number; lamps?: number }
interface BCat { id: string; title: string; lines: BLine[]; performers?: number }
interface Intrusion { afterCategory: number; hold: number; needsHer?: boolean; status?: string }

type Phase = 'idle' | 'invited' | 'arrival' | 'off' | 'ball' | 'after' | 'done';
interface Hit { x: number; y: number; w: number; h: number; id: string }

const ALL_ARRIVAL = script.arrival.labels as unknown as BLabel[];
const SYSTEM = script.system as unknown as {
  intrusions: Intrusion[]; mark: string; reconnecting: string; restoring: string;
  present: string; refused: string; terminated: string; reason: string; terminatedNote: string; terminateSeconds: number;
  holding: string; inCrowd: string; hint: string;
};
const CALL_TEXT = (script.ball as unknown as { call: { line: string; chip: string } }).call;
const ALL_CATS = script.ball.categories as unknown as BCat[];
const SPEEDRUN = (script as unknown as { speedrun: {
  session: { cardAfter: number }; arrival: string[]; greeting: string[]; opening: string[];
  categories: string[]; closing: string[]; intrusions: Intrusion[];
} }).speedrun;

/**
 * ⚑ S227 — THE COMPOSITION, chosen at invitation, never at module load. The guided default uses the authored
 * subset in `script.speedrun`; opting into commons before invitation or reviewing `?cut=full` uses every line.
 * Both preserve the authored order. Opening →
 * categories → closing stay one continuous run: the category boundaries are a fact about the writing, and the
 * intrusions are hung on them.
 */
interface Composition { arrival: BLabel[]; greeting: BLine[]; lines: BLine[]; cats: BCat[]; intrusions: Intrusion[] }
function compose(): Composition {
  const greet = script.ball.greeting.lines as unknown as BLine[];
  const opening = script.ball.opening.lines as unknown as BLine[];
  const closing = script.ball.closing.lines as unknown as BLine[];
  if (!(isSpeedrun() && !extraOn('commons'))) {
    return {
      arrival: ALL_ARRIVAL, greeting: greet, cats: ALL_CATS, intrusions: SYSTEM.intrusions,
      lines: [...opening, ...ALL_CATS.flatMap((c) => c.lines), ...closing]
    };
  }
  const pick = <T extends { id: string }>(from: T[], ids: string[]): T[] => from.filter((x) => ids.includes(x.id));
  const cats = pick(ALL_CATS, SPEEDRUN.categories);
  return {
    arrival: pick(ALL_ARRIVAL, SPEEDRUN.arrival), greeting: pick(greet, SPEEDRUN.greeting), cats,
    intrusions: SPEEDRUN.intrusions,
    lines: [...pick(opening, SPEEDRUN.opening), ...cats.flatMap((c) => c.lines), ...pick(closing, SPEEDRUN.closing)]
  };
}
/** ⚑ S227 — how long after Begin Junie's card lands, in the Speedrun Version (E4Shell reads it) */
export const SPEEDRUN_CARD_AFTER = SPEEDRUN.session.cardAfter;

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
  /** the controls this surface publishes: the invitation's chip, then the room's call, then the lamp's hint */
  hits: Hit[] = [];
  /** ⚑ S227 — the session's Begin chip (his Q7), drawn by `drawSession`, pressed through `E4Shell` */
  sessionHits: Hit[] = [];

  private phase: Phase = 'idle';
  private t = 0;
  /** the beat's own running clock, for the one-sound-at-a-time slots */
  private clock = 0;
  private comp: Composition = compose();
  /** R3-105: the hall has cut in behind the glass (WORLD_IN_SECONDS into the arrival) */
  private worldIn = false;
  /** R3-106: the greeting's lines are on the glass; the ball's clock waits */
  private greeting = false;
  /** ⚑ S227 — the room's call is on the glass, waiting for her press (his Q8) */
  private calling = false;
  private callT = 0;
  /** seconds until the MC opens, after her press on the call (<0: not counting) */
  private startIn = -1;
  /** ⚑ S227 — the MC is waiting between categories while the system is on the glass */
  private holding = false;
  private resumeIn = -1;
  /** seconds since the hall came up — the stream's clock */
  private ballT = 0;
  private queue: BLine[] = [];
  private cur: BLine | null = null;
  private spoke = false;
  private labels: BLabel[] = [];
  private label: BLabel | null = null;
  private labelT = 0;
  /** the attention's last authored mark, so a line with no `at` holds it */
  private station = 1;
  private caption: HTMLDivElement | null = null;

  get live(): boolean { return this.phase !== 'idle' && this.phase !== 'done'; }
  /** how much of the agent's environment is still on the glass: 1 before she
   *  goes in, falling label by label as the filter fails, 0 once the room is
   *  hers. The session does not end — it is seen through. */
  get environmentK(): number {
    if (this.phase === 'idle' || this.phase === 'invited') return 1;
    if (this.phase === 'arrival' && !this.worldIn) {
      // R3-105: the flicker over her own room — never clear, never the hall
      const ph = (this.t % FLICKER_EVERY) / FLICKER_EVERY;
      return ph < FLICKER_OPEN ? FLICKER_K : 1;
    }
    if (this.phase === 'arrival') {
      /**
       * ⚑ THE FIGHT'S SCORE (2026-09-13, `arrival._docStruggle`). The base falls
       * a step per label, as before; over it the glass CLEARS IN FLASHES that
       * come faster and hold longer with each label — the room breaking
       * through — and snaps back as the system restores its environment. By
       * the last label the flashes are most of the time.
       */
      const total = this.comp.arrival.length;
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
    const total = this.comp.arrival.length;
    const left = this.labels.length + (this.label ? 1 : 0);
    return Math.min(1, (total - left) / Math.max(1, total - 1));
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
  /** the category of a line in the active composition, or −1 */
  private catIndex(l: BLine | null): number {
    if (!l) return -1;
    return this.comp.cats.findIndex((c) => c.lines.includes(l));
  }
  /** the category the MC is calling right now, for the stream's own title */
  private get categoryTitle(): string {
    const k = this.catIndex(this.cur);
    return k >= 0 ? this.comp.cats[k].title : '';
  }
  get invited(): boolean { return this.phase === 'invited'; }
  get phaseId(): string { return this.phase; }
  /** ⚑ S227 — the room's call is up (a probe reads it; the walker reads `hits`) */
  get callUp(): boolean { return this.calling; }
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
   * ⚑ THE INVITATION (S133). `E4Offers.onBreak` lands here now instead of on
   * `begin()`: the offers hold, and the visor shows one card — Junie, muted six
   * weeks ago, delivered anyway — with one chip. Nothing else is pressable and
   * nothing announces it. Going is hers. ⚑ S227: and it follows her Begin on the
   * session, never a clock alone (his Q7; `E4Shell.update`).
   */
  invite(): void {
    if (this.phase !== 'idle') return;
    this.comp = compose();
    markExtraPassed('commons');
    this.phase = 'invited';
    this.hits = [{ ...JOIN, id: 'commons-join' }];
    this.version++;
    playOnce('card_junie.mp3');   // the room's register, not the system's
    // the room is already audible through the wall while she decides — the one music, from here
    roomBed.set(script.room.bed, 4.0);
  }

  begin(): void {
    if (this.phase !== 'idle' && this.phase !== 'invited') return;
    if (this.phase === 'idle') this.comp = compose();
    this.hits = [];
    this.phase = 'arrival';
    this.labels = [...this.comp.arrival];
    playOnce('ui_press.mp3');
    this.nextLabel();
    // ⚑ 2026-09-13: the hall is there behind the agent's environment, seen
    //   through it in flashes as the filter fights (see `environmentK`). Since
    //   S161 it cuts in WORLD_IN_SECONDS after the press, on the first full flash,
    //   so the entrance is seen (R3-105; `update`) — ⚑ and since S227 she is cut
    //   to the spot on that same flash (app.ts, the room hook).
    this.worldIn = false;
    this.greeting = false;
    this.calling = false;
    this.holding = false;
    this.t = 0;   // the arrival's clock starts at the press, not at the card
    // the room begins to warm behind the picture, low, while the machine works
    this.light(ARRIVAL_LEVEL, 1, 0);
    /**
     * ⚑ S109 — AND THE ROOM IS FINALLY AUDIBLE, through a wall first: the bed
     * arrives with Junie's card (`invite`) while the ball is somewhere else in
     * the building; the `landing` is the same recording with the wall taken
     * away, at the drop. ⚑ AND THE 38 VOICES STAY UNVOICED (`_docVoice`,
     * `_docNoBall`). This call is a no-op after `invite`; it stays for a
     * debug begin that skipped the card.
     */
    roomBed.set(script.room.bed, 4.0);
    this.crowd(this.label?.lamps ?? 0, false);
  }
  /** the lamps and the people arrive together — the people from nine lamps on */
  private lampsShown = 0;
  /** ⚑ S227 / §4 — the room's one sign at a time: the bell's and the lantern's ends, on `clock` */
  private bellEnd = -1;
  private lanternEnd = -1;
  private lanternAt = -1;
  private crowd(n: number, bell: boolean): void {
    // ⚑ S214 — the lamps going up have a sound: glass bells. ⚑ S227 / §4 — ONCE, at the drop (it rang four
    //   times in ~22 s, stacked over the landing). The climb under the labels is silent.
    if (bell && n > this.lampsShown) {
      const a = playOnce(script.room.lampsRise);
      if (a) a.volume = Math.min(0.6, 0.25 + n / 100);
      this.bellEnd = this.clock + BELL_SECONDS;
    }
    this.lampsShown = n;
    setCommonsLamps(n);
    setCommonsFigures(n >= 9);
  }
  /** ⚑ S227 / §4 — a system sound: it plays, and the room's music ducks under it for as long */
  private sys(name: string, seconds: number): HTMLAudioElement | null {
    roomBed.duck(DUCK_DB, seconds);
    return playOnce(name);
  }
  /** her lantern's sound: never over a bell still sounding (it waits), never over itself */
  private lantern(): void {
    if (this.clock < this.lanternEnd || this.lanternAt >= 0) return;
    if (this.clock < this.bellEnd) { this.lanternAt = this.bellEnd; return; }
    const a = playOnce(script.room.herLamp);   // ⚑ S214 — the hall noticing; once per raise, never a button sound
    if (a) a.volume = 0.5;
    this.lanternEnd = this.clock + LANTERN_SECONDS;
  }

  update(dt: number): void {
    // ⚑ S209g — her lamp is in her hand for the ball itself; the room opens its arms to her while it asks (I1, I3)
    setHerLamp(this.phase === 'ball');
    inviteCommonsFigures(this.wantsHer);
    if (this.phase === 'idle' || this.phase === 'done') return;
    this.t += dt;
    this.clock += dt;
    if (this.lanternAt >= 0 && this.clock >= this.lanternAt) { this.lanternAt = -1; this.lantern(); }

    if (this.phase === 'invited') return;   // waiting on her, indefinitely
    if (this.phase === 'arrival') {
      if (!this.worldIn && this.t >= WORLD_IN_SECONDS) {
        // R3-105: the cut — the hall arrives on the first full flash; the
        // first label's own clock starts here so its flashes count from the cut.
        // ⚑ S227: the room hook (app.ts) cuts her to the spot in the same frame.
        this.worldIn = true;
        this.labelT = 0;
        setCommonsWorld(true);
        this.version++;
      }
      const b4 = this.labelT;
      this.labelT += dt;
      if (Math.floor(b4 * 10) !== Math.floor(this.labelT * 10)) this.version++;   // the flashes are drawn, so they are uploaded
      if (this.label && this.labelT >= this.label.hold) {
        if (this.labels.length > 0) { this.nextLabel(); this.crowd(this.label?.lamps ?? 0, false); }
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
        setCommonsWorld(true);
        this.ballT = 0;
        // ⚑ THE WALL COMES DOWN with the overlay. The same recording, unfiltered.
        //   ⚑ S227 / §4: here, not mid-fight, and in 1.5 s — the one crossfade.
        roomBed.set(script.room.landing, 1.5);
        // ⚑ S161 / R3-106 — THE ARRIVAL: the last of the lamps come up now, in
        //   the hall (the one bell), and the two beside her say hello.
        this.crowd(LAMP_FULL, true);
        this.greeting = true;
        greetCommonsFigures(true);
        this.queue = [...this.comp.greeting];
        this.nextLine();
      }
      return;
    }

    // the hall is up: the stream runs from here, whatever the MC is doing
    this.ballT += dt;
    this.publish();
    if (this.greeting) {
      // the greeting runs on the line clock alone; nothing of the ball's is counting yet
      this.lineClock(dt);
      return;
    }
    if (this.calling) {
      const b4 = this.callT;
      this.callT += dt;
      if (Math.floor(b4 * 10) !== Math.floor(this.callT * 10) && this.callT < 1) this.version++;
      return;   // waiting on her press, indefinitely (his Q8)
    }
    if (this.startIn >= 0) {
      this.startIn -= dt;
      if (this.startIn < 0) this.advance();
      return;
    }
    this.landingK = Math.max(0, this.landingK - dt / 2.4);
    this.intrusionClock(dt);
    if (this.holding && this.resumeIn >= 0) {
      this.resumeIn -= dt;
      if (this.resumeIn < 0) { this.holding = false; this.resumeIn = -1; this.nextLine(); }
    }

    if (this.phase === 'after') {
      // ⚑ S133: the room stays; the APPARATUS does not. A few seconds after the
      //   last line the overlay tries to update, and the era's finale takes it
      //   from there. Nobody presses anything; nothing asks her to.
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

  /** ⚑ S227 — what this surface offers right now, as an array a walker (or a person) can aim at:
   *  the call while it waits, the lamp's hint while the room asks, nothing otherwise */
  private published = '';
  private publish(): void {
    const want = this.calling ? 'call' : this.wantsHer ? 'lamp' : '';
    if (want === this.published) return;
    this.published = want;
    this.hits = want === 'call' ? [{ ...CALL_CHIP, id: 'commons-call' }]
      : want === 'lamp' ? [{ ...this.lampRect, id: 'commons-lamp' }] : [];
    this.version++;
  }

  /** the line clock: the caption is on screen, then the clip follows it. */
  private lineClock(dt: number): void {
    if (!this.cur) return;
    const before = this.lineT;
    this.lineT += dt;
    if (!this.spoke && before < CAPTION_LEAD && this.lineT >= CAPTION_LEAD) this.speak(this.cur);
    if (this.lineT < this.cur.hold) return;
    if (this.holding) return;   // the system is on the glass; the MC waits for the room's refusal
    if (this.greeting && this.queue.length === 0) { this.call(); return; }
    this.advance();
  }

  /**
   * ⚑ S227 — THE NEXT LINE, OR THE SYSTEM BETWEEN CATEGORIES. When the line that just finished ends a
   * category (or the opening) and the next begins one that an intrusion is hung on (`afterCategory` = how many
   * categories have finished), the intrusion starts here and the MC waits. Never on a clock, never mid-line.
   */
  private advance(): void {
    if (this.queue.length === 0) { this.endBall(); return; }
    const nextCat = this.catIndex(this.queue[0]);
    const curCat = this.catIndex(this.cur);
    const pending = this.comp.intrusions[this.intrusionIdx];
    if (pending && this.intrusionT < 0 && nextCat >= 0 && nextCat !== curCat && pending.afterCategory === nextCat) {
      this.startIntrusion();
      this.holding = true;
      this.resumeIn = -1;
      return;
    }
    this.nextLine();
  }

  /** ⚑ S227 — the greeting is over: the room's call goes up on the glass and waits for her (his Q8) */
  private call(): void {
    // the greeting's lines are done (the two stay leaning in until she answers — `answerCall`). Clearing the flag
    // here matters: while it stood, the line clock re-armed the call every frame and its fade never rose from 0.
    this.greeting = false;
    this.calling = true;
    this.callT = 0;
    this.version++;
    this.publish();
  }
  /** her press on the call: the turn to the stage begins, and the MC opens as she comes round */
  private answerCall(): void {
    if (!this.calling) return;
    this.calling = false;
    this.greeting = false;
    greetCommonsFigures(false);
    this.queue = [...this.comp.lines];
    this.cur = null;
    this.startIn = CALL_LEAD;
    this.version++;
    this.publish();
    turnToStage();
  }

  /** ⚑ THE CATEGORIES RUN OUT AND NOTHING ELSE HAPPENS. The light settles, the
   *  caption clears, and there is no further beat in this file — not a fade,
   *  not a prompt, not an ending. The room is still full. */
  private endBall(): void {
    this.cur = null;
    this.showCaption('');
    setCommonsShow({ performers: 0, category: -1, cheer: false });
    this.phase = 'after';
    this.afterT = 0;
    stopClip(this.reconnect); this.reconnect = null;
    this.sys('terminate_2026.mp3', 1.0);
    this.light(AFTER_LEVEL, AFTER_STATION, 0);
    this.publish();
    this.version++;
  }

  private lineT = 0;
  private afterT = 0;

  private lastCat = -1;
  private nextLine(): void {
    this.lineSeq++;
    this.cur = this.queue.shift() ?? null;
    if (this.cur?.flare) { this.landingK = 1; pulseCommonsLamps('flare'); }   // ⚑ S209g / M2 — the hall's lamps answer a landing
    this.lineAt = this.ballT;
    this.lineT = 0;
    this.spoke = false;
    if (!this.cur) return;
    const friend = this.comp.greeting.includes(this.cur);
    this.showCaption(this.cur.text, this.cur.who ?? (friend ? '' : MC_NAME));
    this.light(BALL_LEVEL, this.cur.at ?? this.station, this.cur.flare ?? 0);
    // ⚑ Phase 7 — the show: the category's performers walk while it is called; the room's arms go up on a landing.
    //   The costume is chosen by the category's place in the FULL piece, so Junie's is Junie's in both cuts.
    const k = this.catIndex(this.cur);
    const cat = k >= 0 ? this.comp.cats[k] : null;
    const full = cat ? ALL_CATS.indexOf(cat) : -1;
    if (cat && full !== this.lastCat) pulseCommonsLamps('chase');   // ⚑ S209g / M2 — a category called: a chase down the strings
    this.lastCat = cat ? full : this.lastCat;
    setCommonsShow({ performers: cat ? (cat.performers ?? 1) : 0, category: full, cheer: (this.cur.flare ?? 0) > 0 });
  }

  private nextLabel(): void {
    this.label = this.labels.shift() ?? null;
    this.labelT = 0;
    this.version++;
    // each label the filter fails — a system sound, the room ducked under it (§4). ⚑ S227: the landing no
    //   longer crossfades in here, mid-fight; the wall comes down with the overlay.
    if (this.phase === 'arrival' && this.label) this.sys('filter_deny.mp3', 0.6);
  }

  /**
   * ⚑ PEER PRESSURE (2026-09-13, `system._doc`). Twice during the ball the
   * agent comes back for her: a card on the glass — reconnecting, restoring
   * the environment — with a bar that climbs and is pushed back down by the
   * room's own count until the connection is refused. The third time it
   * terminates (see `after`). ⚑ S227: between categories (`advance`), and the
   * second asks for her lamp; refused either way.
   */
  private intrusionIdx = 0;
  private intrusionT = -1;   // <0: none running
  /** ⚑ S209g / I1 — times she raised her lamp; for the probes only, never filed */
  lampsRaised = 0;
  /** the intrusion clock at which she raised her lamp during a `needsHer` intrusion, so the bar falls from THEN */
  private herAt = -1;
  private startIntrusion(): void {
    this.intrusionT = 0;
    this.herAt = -1;
    this.version++;
    this.reconnect = playLoop('reconnect_2026.mp3');
  }
  private intrusionClock(dt: number): void {
    if (this.phase !== 'ball' || this.intrusionT < 0) return;
    const b4 = this.intrusionT;
    this.intrusionT += dt;
    if (Math.floor(b4 * 8) !== Math.floor(this.intrusionT * 8)) this.version++;
    if (this.reconnect) roomBed.duck(DUCK_DB, 0.3);   // the reconnect loop is a system sound: the room ducks while it runs
    const cur = this.comp.intrusions[this.intrusionIdx];
    if (!cur) return;
    // the clock's own refusal (the first intrusion, or the second never answered) — Q3: never depends on her
    const refuseAt = cur.needsHer ? cur.hold - 3 : 2.6;
    if (b4 < refuseAt && this.intrusionT >= refuseAt && this.herAt < 0) this.refuse();
    const done = cur.needsHer && this.herAt >= 0 ? this.intrusionT >= this.herAt + 4.5 : this.intrusionT >= cur.hold;
    if (done) { this.intrusionT = -1; this.intrusionIdx++; this.herAt = -1; this.version++; stopClip(this.reconnect); this.reconnect = null; }
  }
  private reconnect: HTMLAudioElement | null = null;
  /** the room refuses the connection: the loop stops, the refusal sounds, and the MC carries on shortly */
  private refuse(): void {
    stopClip(this.reconnect); this.reconnect = null;
    this.sys('ui_refuse.mp3', 1.2);
    if (this.holding) this.resumeIn = RESUME_AFTER_REFUSAL;
    this.version++;
  }
  /** the intrusion's bar: climbs, then is pushed back — by the clock, or by her */
  private intrusionBar(t: number, cur: Intrusion): number {
    const rise = 2.6;
    if (t < rise) return Math.min(0.86, (t / rise) * 0.86);
    if (cur.needsHer) {
      if (this.herAt < 0) {
        // holding at the top, and creeping — the clock alone lets it go only at the very end
        const late = Math.max(0, (t - cur.hold + 3) / 3);
        return late > 0 ? 0.86 * (1 - late * late) : Math.min(0.96, 0.86 + (t - rise) * 0.012);
      }
      const back = Math.min(1, (t - this.herAt) / 3.0);
      return Math.max(0, 0.9 * (1 - back * back));
    }
    const back = (t - rise) / (cur.hold - rise);
    return Math.max(0, 0.86 * (1 - back * back));
  }
  /** the second refusal can be hers: the hint ("raise your lamp") belongs on the glass, until the room refuses */
  get wantsHer(): boolean {
    const cur = this.comp.intrusions[this.intrusionIdx];
    if (this.phase !== 'ball' || this.intrusionT <= 2.0 || !cur?.needsHer || this.herAt >= 0) return false;
    return this.intrusionT < cur.hold - 3;
  }
  /** the room's count while the system is on the glass — it goes UP */
  private presentCount(t: number): number { return 41 + Math.floor(t * 1.8); }

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
   * ⚑ THE END OF THE BEAT. The room does not stop — the light goes back down
   * over the cluster's own seven seconds while the era's finale begins, so the
   * ball is still going on behind the last thing the apparatus has to say.
   */
  close(): void {
    if (this.phase === 'done') return;
    this.phase = 'done';
    this.cur = null;
    this.label = null;
    this.hits = [];
    this.published = '';
    this.calling = false;
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
  leaveWorld(): void { setCommonsWorld(false); this.clearLamps(); greetCommonsFigures(false); this.greeting = false; }

  /**
   * The press. With coordinates and the invitation up, it is the chip or
   * nothing; consumed always. In the hall a press arrives without coordinates
   * (the visor is on her face; era3Devices routes it through `wear()`), and it is
   * her one act at a time: the call while it waits, otherwise her lamp. In
   * `after` a press still ends the beat early, exactly as before.
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
    // ⚑ S227 — the room's call (his Q8): any press while it is up is the answer; there is nothing else to press
    if (this.phase === 'ball' && this.calling) { this.answerCall(); return true; }
    // ⚑ S209g / I1 (his tick, "we can try") — during the ball a press is her noise: she raises her lamp, and the
    //   hall's lamps and the two beside her answer. Never counted, never filed (respite).
    if (this.phase === 'ball') {
      if (!herLampRaised()) {
        raiseHerLamp(); pulseCommonsLamps('flare'); answerCommonsFigures(); this.lampsRaised++;
        this.lantern();
      }
      // ⚑ S227 / his Q2 — while the room asks, her lamp IS the refusal: the bar falls from now and the count
      //   includes her. Q3: without her the room refuses anyway (`intrusionClock`).
      if (this.wantsHer) { this.herAt = this.intrusionT; this.refuse(); this.publish(); }
      return true;
    }
    if (!this.returnable) return true;
    this.close();
    return true;
  }

  // ── the machine's surface, and it is the only thing this file draws ────────
  /** where the lamp's hint was last drawn, so the walker has something to aim at */
  private lampRect = { x: 206, y: 216, w: 100, h: 18 };
  /**
   * ⚑ WHAT THE VISOR SHOWS, and it is never the ball. During the arrival it is
   * L's label field over the place — the same instrument that captioned her
   * shoes, working on a room. In the hall it is clear glass with the machine's
   * own occasional failures on it — and, once, the room's call.
   */
  draw(ctx: CanvasRenderingContext2D, W: number, H: number, x: number, y: number, w: number): void {
    void x; void y; void w;
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
      let yy = INVITE.y + 48;
      for (const row of wrapText(ctx, inv.line, INVITE.w - 28)) { ctx.fillText(row, INVITE.x + 14, yy); yy += 16; }
      // ⚑ 2026-09-13: THE LINK, and what it is for — see invite._docLink
      setFont(ctx, 10);
      const lw = Math.ceil(ctx.measureText(inv.link).width) + 22;
      roundRect(ctx, INVITE.x + 14, yy + 2, lw, 18, 9, WEB.accentSoft);
      ctx.fillStyle = WEB.accentInk;
      ctx.fillText(inv.link, INVITE.x + 25, yy + 6);
      px(ctx, INVITE.x + 25, yy + 16, lw - 22, 1, WEB.accentInk);
      yy += 26;
      setFont(ctx, 9);
      ctx.fillStyle = WEB.ink;
      for (const row of wrapText(ctx, inv.note, INVITE.w - 28)) { ctx.fillText(row, INVITE.x + 14, yy); yy += 12; }
      setFont(ctx, 8);
      ctx.fillStyle = WEB.muted;
      ctx.fillText(inv.meta, INVITE.x + 14, INVITE.y + INVITE.h - 48);
      webButton(ctx, JOIN.x, JOIN.y, inv.chip, 'primary', JOIN.w);
      return;
    }
    if (this.phase === 'ball' && this.calling) this.drawCall(ctx);
    // ⚑ the system on the glass during the ball: the intrusions, and the termination
    if (this.phase === 'ball' && this.intrusionT >= 0) {
      const cur = this.comp.intrusions[this.intrusionIdx];
      if (cur) this.drawIntrusion(ctx, W, H, this.intrusionT, cur);
    }
    if (this.phase === 'after') this.drawTermination(ctx, W, H, this.afterT);
    if (this.phase === 'arrival') this.drawBreakthrough(ctx, W, H);
    if (!this.label) return;
    if (this.phase === 'arrival' || this.phase === 'off') {
      // ⚑ FRONT AND CENTRE, and wide: this is the filter failing, on the glass
      //   she is looking through.
      const fw = Math.round(W * 0.62);
      labelField(ctx, Math.round((W - fw) / 2), Math.round(H * 0.42), fw, this.label.object, this.label.text);
    }
  }

  /** ⚑ S227 — the room's call: a small light card in the room's pink, one line and one chip (his Q8) */
  private drawCall(ctx: CanvasRenderingContext2D): void {
    const k = Math.min(1, this.callT / 0.6);
    const was = ctx.globalAlpha;
    ctx.globalAlpha = was * k;
    roundRect(ctx, CALL.x, CALL.y + 2, CALL.w, CALL.h, 10, ERA4.panelEdge);
    roundRect(ctx, CALL.x, CALL.y, CALL.w, CALL.h, 10, WEB.card);
    px(ctx, CALL.x + 10, CALL.y, CALL.w - 20, 2, PLACE.textileHi);
    setFont(ctx, 10);
    ctx.fillStyle = WEB.ink;
    const lw = Math.ceil(ctx.measureText(CALL_TEXT.line).width);
    ctx.fillText(CALL_TEXT.line, CALL.x + Math.round((CALL.w - lw) / 2), CALL.y + 10);
    pill(ctx, CALL_CHIP.x, CALL_CHIP.y, CALL_CHIP.w, CALL_CHIP.h, PLACE.textileHi);
    ctx.fillStyle = PLACE.ink;
    const cw = Math.ceil(ctx.measureText(CALL_TEXT.chip).width);
    ctx.fillText(CALL_TEXT.chip, CALL_CHIP.x + Math.round((CALL_CHIP.w - cw) / 2), CALL_CHIP.y + 6);
    ctx.globalAlpha = was;
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
  private drawIntrusion(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, cur: Intrusion): void {
    const end = cur.needsHer && this.herAt >= 0 ? this.herAt + 4.5 : cur.hold;
    const fade = Math.min(1, t / 0.6, (end - t) / 0.8);
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
    const bar = this.intrusionBar(t, cur);
    const holding = cur.needsHer && this.herAt < 0 && t > 2.6;
    // ⚑ S227 / T3 — the old third stutter label is this card's status now, beside its own "Reconnecting…"
    ctx.fillText(holding && cur.status ? SYSTEM.reconnecting + '  ·  ' + cur.status : SYSTEM.reconnecting, cx + 42, cy + 24);
    const pushed = cur.needsHer ? this.herAt >= 0 || t >= cur.hold - 3 : t > 2.6;
    setFont(ctx, 9);
    ctx.fillStyle = ERA4.meta;
    ctx.fillText(holding && !cur.status ? SYSTEM.restoring + '  ·  ' + SYSTEM.holding : SYSTEM.restoring, cx + 12, cy + 46);
    pill(ctx, cx + 12, cy + 60, cw - 24, 5, ERA4.rule);
    pill(ctx, cx + 12, cy + 60, Math.round((cw - 24) * bar), 5, holding ? ERA4.l : ERA4.lDim);
    // the room pushing back: its count, going up, in the room's colour — and once her lamp is up, the count says so
    const n = this.presentCount(t);
    const present = (cur.needsHer && this.herAt >= 0 ? SYSTEM.inCrowd : SYSTEM.present).replace('{n}', String(n + (this.herAt >= 0 ? 1 : 0)));
    setFont(ctx, 9);
    ctx.fillStyle = PLACE.textileHi;
    const pw = Math.ceil(ctx.measureText(present).width);
    ctx.fillText(present, cx + cw - 12 - pw, cy + 72);
    if (pushed && bar < 0.6) {
      ctx.fillStyle = ERA4.dim;
      ctx.fillText(SYSTEM.refused, cx + 12, cy + 72);
    }
    ctx.globalAlpha = was;
    // ⚑ S227 / T7 — the hint, under the card, in the room's colour: "raise your lamp" (his Q2)
    if (this.wantsHer) {
      setFont(ctx, 10);
      const hw = Math.ceil(ctx.measureText(SYSTEM.hint).width);
      const bw = hw + 20;
      const r = { x: Math.round((W - bw) / 2), y: cy + ch + 6, w: bw, h: 20 };
      this.lampRect = r;
      roundRect(ctx, r.x, r.y, r.w, r.h, 6, ERA4.field);
      ctx.fillStyle = PLACE.textileHi;
      ctx.fillText(SYSTEM.hint, Math.round((W - hw) / 2), r.y + 5);
    }
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
   * one line, and the plan. ⚑ S227 (his Q7): it waits for her Begin — the chip
   * is offered once the plan is up (`offerBegin`) — and `begun` is the seconds
   * since that press (−1 before): one breath of grounding, then the recording,
   * and Junie's card lands on its third sentence's dash.
   */
  drawSession(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, begun = -1, offerBegin = false): void {
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
      recorded: { title: string; mark: string; lines: string[]; intro: string; introSeconds: number }; begin: string };
    const GROUND = 8;
    const item = begun < 0 ? 0 : begun < GROUND ? 1 : 2;   // ⚑ 2026-09-13: the session BEGINS (session._docBegins) — ⚑ S227: on her press
    const tx = Math.round(W * 0.56);
    this.sessionHits = [];
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
      if (offerBegin) {
        const r = webButton(ctx, tx, y + 36, SB.begin, 'primary', BEGIN_W);
        this.sessionHits = [{ ...r, id: 'session-begin' }];
      }
    } else if (item === 1) {
      // grounding: a ring that breathes, four seconds in, four out — one breath, and it is finished
      const gt = begun;
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
      const rt = begun - GROUND;
      setFont(ctx, 9);
      ctx.fillStyle = ERA4.meta;
      ctx.fillText(SB.recorded.title, tx, fy + 34);
      // S155 / R3-102: introduced as what it is, first — then the sentences
      const intro = rt < SB.recorded.introSeconds;
      const rtl = Math.max(0, rt - SB.recorded.introSeconds);
      const line = SB.recorded.lines[Math.min(SB.recorded.lines.length - 1, Math.floor(rtl / 3.4))];   // three, and the card lands on the third's dash
      setFont(ctx, intro ? 10 : 12);
      ctx.fillStyle = intro ? ERA4.meta : ERA4.textHi;
      let y = fy + 52;
      for (const row of wrapText(ctx, intro ? SB.recorded.intro : '“' + line + '”', Math.round(W * 0.38))) { ctx.fillText(row, tx, y); y += 17; }
      // a play bar, running
      const bw = Math.round(W * 0.34);
      pill(ctx, tx, y + 10, bw, 4, ERA4.rule);
      pill(ctx, tx, y + 10, Math.round(bw * Math.min(1, rt / 11)), 4, ERA4.l);
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
  /** the session's plan is all up after this long — then Begin is offered (E4Shell) */
  static readonly PLAN_SECONDS = 3 * 2.2;

  /**
   * ⚑ THE STREAM — `transjesus.str`, drawn on the window above the stage. The
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
    // ⚑ 2026-09-13 (`stream._docPanel`): a taller title bar naming the event,
    //   the category large in the lower third, the chat larger. ⚑ S227 / T9: no host line.
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
    const watching = (38 + Math.floor((Math.sin(t * 0.21) + 1) * 4.5)) + ' watching';
    setFont(ctx, 9);
    ctx.fillStyle = ERA4.textHi;
    ctx.fillText(watching, W - 8 - Math.ceil(ctx.measureText(watching).width), 8);
    // the lower third: the category, by number and title, sliding in when it changes
    const title = this.categoryTitle;
    if (title) {
      const cats = this.comp.cats;
      const idx = cats.findIndex((c) => c.title === title);
      const of = ST.categoryOf.replace('{n}', String(idx + 1)).replace('{m}', String(cats.length));
      const since = this.ballT - this.lineAt;
      const k = Math.min(1, since / 0.5);
      // ⚑ Phase 7 (the Codex pass: the long title lost its last word to the clip) — the title wraps
      //   inside the lower third, which grows upward a line at a time; nothing is clipped
      setFont(ctx, 11);
      const rows = wrapText(ctx, title, pw - 40);
      const tw = Math.min(pw - 16, Math.ceil(Math.max(...rows.map((r) => ctx.measureText(r).width))) + 24);
      const bh = 20 + rows.length * 12, by = H - 8 - bh;
      const lx = 8 - Math.round((1 - k) * (tw + 20));
      roundRect(ctx, lx, by, tw, bh, 3, ERA4.panel);
      px(ctx, lx, by, 4, bh, PLACE.textileHi);
      setFont(ctx, 8);
      ctx.fillStyle = PLACE.sunHi;
      ctx.fillText(of, lx + 12, by + 4);
      setFont(ctx, 11);
      ctx.fillStyle = ERA4.textHi;
      rows.forEach((r, i) => ctx.fillText(r, lx + 12, by + 16 + i * 12));
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
  /**
   * ⚑ Phase 7 (his: "a lot of text of the house, this needs to be inside of chat bubble text separated
   * that people can read and understand the different elements"; "who says Hi Maya?") — each line is a
   * bubble of its own with its speaker's name over it, the last three standing, the newest brightest.
   * The friends' bubbles sit to one side, the MC's across the middle. Still a subtitle: frame chrome.
   */
  private said: Array<{ who: string; text: string }> = [];
  private showCaption(text: string, who = ''): void {
    if (!text) {
      this.said = [];
      if (this.caption) this.caption.style.opacity = '0';
      return;
    }
    if (!this.caption) this.mountCaption();
    if (!this.caption) return;
    this.said.push({ who, text });
    if (this.said.length > BUBBLES) this.said.shift();
    const el = this.caption;
    el.replaceChildren();
    this.said.forEach((s, i) => {
      const newest = i === this.said.length - 1;
      const mc = s.who === MC_NAME;
      const b = document.createElement('div');
      Object.assign(b.style, {
        alignSelf: mc ? 'center' : 'flex-start', maxWidth: mc ? '100%' : '78%',
        background: BALL.captionField, color: BALL.captionInk, borderRadius: mc ? '6px' : '12px 12px 12px 3px',
        padding: '5px 12px 6px', textAlign: mc ? 'center' : 'left', opacity: newest ? '1' : '0.55',
        borderLeft: mc ? 'none' : `3px solid ${BALL.whoFriend}`
      } as CSSStyleDeclaration);
      if (s.who) {
        const n = document.createElement('div');
        n.textContent = s.who;
        Object.assign(n.style, { font: '700 10px monospace', letterSpacing: '0.08em', textTransform: 'uppercase',
          color: mc ? BALL.whoMC : BALL.whoFriend, marginBottom: '2px' } as CSSStyleDeclaration);
        b.appendChild(n);
      }
      const t = document.createElement('div');
      t.textContent = s.text;
      b.appendChild(t);
      el.appendChild(b);
    });
    el.style.opacity = '1';
  }

  private mountCaption(): void {
    if (typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.id = 'reinterp-ball-caption';
    el.setAttribute('aria-live', 'polite');
    Object.assign(el.style, {
      position: 'fixed', left: '50%', bottom: '4%', transform: 'translateX(-50%)',
      zIndex: '9', display: 'flex', flexDirection: 'column', gap: '6px', width: 'min(640px, 86vw)',
      font: '13px monospace', lineHeight: '1.45',
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
   * runs forward from the session by ordinary clicking, and none of this
   * is reachable. C6: every beat gets a panel button, because three sessions
   * have now shipped beats the project lead could not reach and concluded
   * content was missing when it wasn't.
   */
  debugJumpTo(where: 'invited' | 'arrival' | 'noCategory' | 'ball' | 'category' | 'after', index = 0): void {
    this.removeCaption();
    this.phase = 'idle';
    this.ballT = 0;
    this.calling = false;
    this.holding = false;
    this.startIn = -1;
    this.intrusionIdx = 0;
    this.intrusionT = -1;
    this.published = '';
    if (where === 'invited') { this.invite(); return; }
    this.begin();
    if (where === 'arrival') return;
    if (where === 'noCategory') {
      this.labels = [];
      this.label = this.comp.arrival[this.comp.arrival.length - 1];
      this.labelT = 0;
      this.crowd(this.label.lamps ?? 0, false);
      this.version++;
      return;
    }
    this.crowd(LAMP_FULL, false);
    setCommonsWorld(true);
    // everything below is past the point where the device comes off
    this.label = null;
    this.onDeviceOff?.();
    this.phase = 'ball';
    this.greeting = false;
    this.queue = [...this.comp.lines];
    if (where === 'category') {
      const cats = this.comp.cats;
      const first = cats[Math.max(0, Math.min(cats.length - 1, index))].lines[0].id;
      while (this.queue.length > 0 && this.queue[0].id !== first) this.queue.shift();
      // the intrusions before this category have been and gone
      while (this.comp.intrusions[this.intrusionIdx] && this.comp.intrusions[this.intrusionIdx].afterCategory <= Math.max(0, index)) this.intrusionIdx++;
    }
    if (where === 'after') {
      this.queue = [];
      this.cur = null;
      this.showCaption('');
      this.phase = 'after'; this.sys('terminate_2026.mp3', 1.0);
      this.light(AFTER_LEVEL, AFTER_STATION, 0);
      this.version++;
      return;
    }
    this.nextLine();
  }
}
