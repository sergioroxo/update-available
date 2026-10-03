/**
 * ⚑ THE PLACE — Era 4's shell (S76, Stage 2a).
 * Design of record: `docs/REINTERP_E4_THE_SPACE_2026-08-06.md`.
 *
 * A monitor is a surface you look AT. A headset is a space you are IN. Three
 * eras put the apparatus on a thing in the room; the fourth puts you inside it.
 * So the visor does not open a rectangle — it opens a PLACE: a home
 * environment, the pleasant default room every headset ships with, ⚑ a room
 * that is not hers, that millions have an identical copy of, designed to feel
 * like somewhere.
 *
 * ⚑ AND IT IS DRAWN ON THE CANVAS, which is the era's whole argument. It adds
 * no geometry. It is flat, and it is a picture pretending to be a room, and it
 * always will be: **the apparatus can only ever show you a picture of a room.**
 * The project's hardest constraint — one 2D surface, `?flat=1`, the Quest
 * budget — stops being a limit the era works around and becomes the thing the
 * era says.
 *
 * ⚑ THREE LAWS THIS FILE EXISTS TO KEEP, none of them negotiable:
 *
 *  1. **It must be genuinely nice.** Warmer, brighter and quieter than the room
 *     she is sitting in, and the relief must land honestly — no irony, no
 *     warning, no sting (THE_SPACE §4.1). Nothing here is drawn to tip the
 *     player off. That is the trap and the tell.
 *  2. **⚑ THE TURN DOES NOT WORK.** The piece has taught one bodily gesture for
 *     thirty years of story: you never walk, you turn, and turning away has
 *     always worked. A thing on your face comes with you. The picture is
 *     mounted to the head (`src/room/era3Devices.ts` pins the plane to the
 *     camera every frame) and it answers a turn with `setLook` — a bounded,
 *     stepped parallax that goes nowhere. There is no away. **NOBODY EXPLAINS
 *     THIS.** No line, no cue, no glitch, no assistant remark, and no entry in
 *     this file that hints at it. The player discovers it by doing the thing
 *     they have always done.
 *  3. **There is no desktop.** E1, E2 and E3 all had one — icons, a taskbar, a
 *     thing you opened. E4 has none: you put it on and the OS is the assistant.
 *     `src/desktop/os.ts` draws THIS instead of a desktop from `e4` on, and it
 *     draws no chrome around it at all.
 *
 * REGISTER: `operable` throughout — the apparatus's own surface, and operable
 * surfaces may charm. ⚑ It is NOT `respite`: a respite scene is never a trap
 * and is never revealed as fake (Ethics #8), and this place is the trap.
 * ⚑ L IS ABSENT from this module by construction — it imports no voice, holds
 * no lines, and speaks nothing. L arrives inside the update (the `report` block
 * in `data/strings/updates.json`) and conducts from S77 on.
 *
 * ⚑ SEAMS LEFT NAMED, AND NOTHING ELSE BUILT: `handleClick` returns false while
 * worn (S77's chips land there), `handOff()` is unwired (S79's ball ends the
 * era and gives the spine its bare final restart back), and there is no ball
 * texture anywhere in this session — not started, not stubbed.
 *
 * ⚑ S77 TOOK THE FIRST OF THOSE SEAMS: `LVoice` (`apps/lVoice.ts`) now begins
 * the moment the device goes on, draws over this picture, and takes the era's
 * one press. This file still holds no line and speaks nothing — the voice is
 * its own module and its own data file, so the place and the thing talking in
 * it stay separable. `handOff()` is STILL unwired and there is STILL no ball
 * texture: S77 built nothing of S79's.
 *
 * INPUT BUDGET (`REINTERP_E4_THE_DEVICE_2026-08-05.md`, Stage 0 §5): the whole
 * era spends three presses — a chip, the memories undo, the turn. This session
 * spends the update's one "I Agree" and the ONE TOUCH on the headset. There is
 * nothing else to press here, and adding a "continue" would break the rule.
 */
import { meetWord } from '../../room/lexicon';
import closeMessage from '../../../data/strings/close_message.json';
import { visorField, visorEdge, glitchBands, ERA4 } from '../theme/era4';
import { E4Browser, FAIL } from './browser';
import { setFont, px } from '../theme/chrome';
import { ledger } from '../../state/ledger';
import { playOnce, playLoop, stopClip, roomBed } from '../../audio/tapeAudio';
import space from '../../../data/dialog/s4_space.json';
import ballScript from '../../../data/dialog/s4_ball.json';
import updates from '../../../data/strings/updates.json';
import { LVoice } from './lVoice';
import { E4Offers } from './offers';
import { E4Ball } from './ball';
import type { UpdateApp } from './update';

/** the parallax is quantised so a drag cannot re-upload the visor texture on
 *  every frame: −1…+1 in eight steps, and a full turn costs eight redraws.
 *  Hard steps are also the house style — see the theme's own pixel discipline. */
const LOOK_STEPS = 8;
/** degrees of turn that reach the parallax bound. Beyond this the picture has
 *  nothing further to give, which is the point of it. */
const LOOK_RANGE_DEG = 40;
/** a real turn, for the record: a quarter of the way round. */
const TURN_FILED_DEG = 45;
/** the standby light breathes on a five-second cycle, in six steps */
const PULSE_SECONDS = 5;
const PULSE_STEPS = 6;
/** ⚑ where L's label field sits, kept in step with `lVoice.ts`'s own LABEL:
 *  the ball's arrival draws the machine's failures in the SAME instrument, in
 *  the same place, because it is the same instrument doing the same job on a
 *  room instead of a pair of shoes. */
const LABEL = { x: 262, y: 44, w: 234 } as const;
/**
 * ⚑ THE GLITCH (Stage 4 of `docs/REINTERP_E4_BUILD_PLAN_2026-08-05.md`, spec'd
 * 2026-09-01 and built 2026-09-02). Sérgio: *"i would envision the glitch
 * happening on the VR headset, the headset would go back to the desk
 * automagically and the screen on the Laptop would have a message there."*
 *
 * ⚑ IT IS THE PICTURE FAILING, NOT L. L does not distort, stutter or turn
 * menacing — the era's law is that the voice stays polite to the very end, and
 * a voice that breaks here would let the apparatus off by making it sound
 * damaged. What comes apart is the ROOM THAT WAS ARRANGED FOR YOU. The
 * instrument keeps working; it is simply no longer showing you anywhere.
 *
 * ⚑ Length and silence are MY call, logged for Sérgio to overrule (the spec
 * left both open): 1.2 s, and L says nothing. She has already said everything,
 * and a line here would be the piece explaining its own ending.
 *
 * Quantised like every other moving thing on this surface, so a failing picture
 * costs twelve texture uploads and not one per frame.
 */
/** ⚑ 2026-09-12: 1.2 s → 3.2 s. Sérgio: the Close "has to be with the glitch,
 *  and it has to be much slower." The tear is the last thing she sees on the
 *  glass, and at 1.2 s it was a flicker between the world and the desk. */
const GLITCH_SECONDS = 3.2;

const GLITCH_STEPS = 16;

/**
 * ⚑ `ball` IS THE THIRD STAGE, ADDED BY S79, and it is not a cosmetic state:
 * `worn` is false in it, which is the entire mechanism of the era's last beat.
 * `src/room/era3Devices.ts` pins the visor plane to the camera every frame
 * while the shell says `worn`, and eases it back to its stand when it stops —
 * so dropping out of `worn` is what takes the picture off the player's face,
 * and the turn works again without one line of that file changing.
 */
/**
 * ⚑ `laptop` ADDED 2026-09-01 and it is now where the era STARTS.
 * Sérgio: *"we should have a Laptop in 2026, and that can start as our starting
 * point of interaction for ERA-4 and L will tell us to move to VR."* Until now
 * you arrived in 2026 and the only object in the room was a headset on a dock —
 * no machine, no reason, a device simply waiting to be worn. Now the update has
 * landed on her computer, exactly as every other update in this piece has, and
 * it is the computer that sends her to the headset. `closed` is what it means
 * afterwards: L has finished on the laptop and the device across the desk is
 * lit and waiting.
 */
type Stage = 'laptop' | 'closed' | 'worn' | 'ball' | 'glitch';

/**
 * The era's shell. One instance, made by `DesktopOS` when the era becomes `e4`
 * and published on the bridge below so the ROOM (`src/room/era3Devices.ts`) and
 * the flat review tool can reach the same object — the mount points differ,
 * the surface does not.
 */
/** the laptop's screen is small and its lines are short; this is all the
 *  wrapping it needs, and it keeps `theme/chrome`'s import surface unchanged */
function wrapLaptop(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? line + ' ' + word : word;
    if (ctx.measureText(next).width > max && line) { out.push(line); line = word; } else line = next;
  }
  if (line) out.push(line);
  return out;
}

/** the laptop screen's logical size — kept in step with `LOGICAL.laptop` in
 *  era3Devices.ts, which is where the canvas is actually made */
const LAPTOP_BAR = 13;
/**
 * ⚑ S123 TRIED 224x140 → 320x200 AND PUT IT BACK THE SAME HOUR. The lid was
 * going to carry Era 4's browser, and then Sérgio ruled the better shape:
 * a laptop DOCKED TO A MONITOR, so the browser gets a real surface and the
 * headset moves to the periphery. The lid is a second screen again, and its
 * size is load-bearing for something else: `drawCloseMirror` scales the OS
 * canvas onto it, and the walk's ritual sweep only knows three planes
 * (Era 1's monitor, `era4-visor`, `era3-device-workstation`) — none of them
 * this one. Resizing it lost the Close.
 */
export const LAPTOP_W = 224;
export const LAPTOP_H = 140;

export class E4Shell {
  /** ⚑ S130 — the era opens with the device READY, not with L on the laptop. */
  private stageNow: Stage = 'closed';
  /** which of the laptop's lines is showing; past the last one, L is done there */
  /**
   * ⚑ S130 — STARTS AT 3, WHICH IS "ALREADY READ".
   *
   * The era used to open on the laptop with three of L's lines and three
   * presses: *"Hi Maya. I'm L. I came with the update."* That is now a
   * CONTINUITY ERROR as well as a redundancy — the browser's transcript says L
   * arrived fourteen months ago, so it cannot also be introducing itself today.
   * The lines stay in `s4_space.json` (they are good, and they are the record
   * of what the era used to be) and nothing plays them.
   *
   * The era opens instead on what is already on the desk: the browser on the
   * monitor, the file on the laptop, and the headset waiting. Nothing has to be
   * pressed to begin, and nothing has to be read at all.
   */
  private laptopLine = 3;
  private laptopV = 0;
  private t = 0;
  private pulseStep = 0;
  /** −1…+1, quantised to LOOK_STEPS — how far the picture has leaned */
  private look = 0;
  /** the head's lean, −1..1 — read by the review probe now that nothing draws it */
  get lookK(): number { return this.look; }
  private lookStep = 0;
  private turnFiled = false;
  private handedOff = false;
  /** ⚑ S77 — L. Made with the shell (so a `?debug=1` jump can reach a unit
   *  before the device is even worn) but it does not START until the one touch:
   *  the era's grammar is that you put it on and it is already talking, which
   *  only reads if it was NOT talking a moment earlier. */
  readonly voice = new LVoice();
  private voiceVersion = 0;
  /** ⚑ S78 — THE OFFERS. Made with the shell for the same reason `voice` is (a
   *  `?debug=1` jump must be able to reach a beat before the device is worn),
   *  and started only when L has finished its last line. */
  readonly offers = new E4Offers();
  private offersVersion = 0;
  /** L's last chip fired its hand-off; the offers begin when L stops talking */
  /** the offers' old gate — retired 2026-09-12, kept so the seam is legible */
  private offersPending = false;
  get offersRetired(): boolean { return !this.offersPending; }
  /** seconds since the device went on — the correction session's clock */
  private sessionT = 0;
  private breath: HTMLAudioElement | null = null;
  private hiss: HTMLAudioElement | null = null;
  /** ⚑ S79 — THE BALL. Made with the shell for the same reason the two above
   *  are (a `?debug=1` jump must reach it before the device is even worn), and
   *  started only by `E4Offers.onBreak` — the seam S78 left named and empty. */
  readonly ball = new E4Ball();
  private ballVersion = 0;
  /** ⚑ the record files the wearing ONCE. She puts the device back on after the
   *  ball to let the era finish, and that second act is not filed: an identical
   *  second line in the witness record would read as the ball having been filed,
   *  and the ball files nothing (`data/dialog/s4_ball.json`'s `witness` block). */
  private wornFiled = false;
  /** the glitch's own clock and its quantised step; see GLITCH_SECONDS */
  private glitchT = 0;
  private glitchStep = -1;
  /**
   * ⚑ S104 — THE LAST PRESS IN THE PIECE, PUBLISHED. The Close's Restart button
   * was computed inline in `closeButtonRect` and registered nowhere, so no
   * click-only run could ever finish the work: `tools/walk.mjs` presses planes at
   * their centre, and the centre of this lid is not the button. An unpublished
   * rect is also an unauditable one — it is exactly how `kit.ts` drew NEXT 60 px
   * wide and click-tested it at 100 for months.
   *
   * Named `laptopHits` and not `hits` on purpose: these are in the LAPTOP's
   * logical space (224 × 140), not the visor's 512 × 384, and a reader that
   * confuses the two would aim confidently at the wrong surface — which is the
   * whole story of A-1.
   */
  laptopHits: { x: number; y: number; w: number; h: number; id: string }[] = [];
  /** bumped on any change to what this surface DRAWS; the room compares it to
   *  decide when to re-upload the visor texture (dirty discipline, the law
   *  era3Devices' three screens already obey). */
  version = 0;

  constructor() {
    // ⚑ THE TWO SEAMS, JOINED (S78). S76 left `handOff()` unwired and S77 left
    // `onHandOff` leading nowhere; this is where they meet, and the chain is:
    // L's last chip → the offers → the finale → `handOff()` → the spine closes
    // the piece. ⚑ The BALL's seam is inside the offers (`E4Offers.onBreak`) and
    // nothing is registered on it, so the finale follows the careful pause
    // directly today. When S79 exists it takes the break and the rest is
    // unchanged.
    this.voice.onHandOff = () => { this.offersPending = true; };
    this.offers.onHandOff = () => this.handOff();
    // ⚑ S79 TAKES THE BREAK. `onBreak` returning true holds the offers at
    // `held` — the finale does not follow the careful pause any more; the ball
    // does, and the finale waits for `resumeAfterBreak()`. The chain is
    // unchanged either side of it, exactly as S78 designed the seam.
    // ⚑ S133 — THE BREAK IS AN INVITATION NOW, not an arrival. The offers hold,
    // the visor shows Junie's card, and nothing moves until she presses Go in.
    this.offers.onBreak = () => { this.ball.invite(); return true; };
    // ⚑ and the press is FILED, by this surface and not by the ball: the
    // apparatus can record her leaving; it cannot record where. (Law 4 of
    // ball.ts holds — that file still imports no ledger.)
    this.ball.onJoin = () => {
      ledger.e4Space.push({ id: 'commons', outcome: 'joined', witness: ballScript.commons.witness });
    };
    // ⚑ S133 — THE DEVICE STAYS ON (Sérgio: "Stay-on!"). The overlay drops and
    // the shared space opens over her room; `pinned` keeps the visor on her
    // face through the whole beat, and the turn works because the lamps are
    // everywhere, not because the picture is gone.
    this.ball.onDeviceOff = () => { this.stageNow = 'ball'; this.version++; };
    // …and it ends on its own: the apparatus fails next.
    // ⚑ 2026-09-12 — the Commons over → the update fails. No offers' finale
    //   between them any more: the glass glitches where the room was, the
    //   device stops, and the laptop holds the Close. "She wasn't supposed to
    //   see it."
    this.ball.onOver = () => { this.stageNow = 'worn'; this.version++; this.handOff(); };
  }

  get stage(): Stage { return this.stageNow; }
  get worn(): boolean { return this.stageNow === 'worn'; }
  /** ⚑ still ON HER FACE, worn or failing. The room pins the visor plane to the
   *  camera while this is true, so the glitch plays where the picture was and
   *  the device eases back to the desk only once it is over. */
  get pinned(): boolean {
    return this.stageNow === 'worn' || this.stageNow === 'glitch' || this.stageNow === 'ball';
  }

  /**
   * ⚑ THE DEVICE IS ASKING TO BE PICKED UP (S103b), and until now nobody could
   * tell — including the player.
   *
   * `draw()`'s ball branch has always put a lit "Ready to wear" on the visor the
   * moment the categories run out: the comment there says the affordance and its
   * availability arrive together, which is exactly right. But S101's per-frame
   * plane gate switched the plane off for the whole of stage `ball`, so that
   * standby has never been drawn onto anything. The one prompt this beat has was
   * invisible for its entire existence.
   *
   * ⚑ And the same invisibility is what stopped the click-only walk. S104 made
   * the hand-back reachable by a proximity SPHERE around the headset prop, which
   * is right for a person — you press a headset on a stand, not a rectangle —
   * but a sphere publishes no target, the plane was off, and `walk.mjs` excludes
   * props. So the press that ends the piece could not be found by the only tool
   * that can prove the piece ends. Turning the plane back on when it has
   * something to say fixes the player's problem and the auditor's with one
   * condition, which is the right shape: the affordance IS the target.
   */
  get deviceReturnable(): boolean {
    return this.stageNow === 'ball' && this.ball.returnable;
  }
  /** the spine holds its breath while this is false — see os.ts's
   *  `sendOfferPending`. S79's ball is what eventually sets it. */
  get handedOffToClose(): boolean { return this.handedOff; }

  update(dt: number): void {
    this.browser.update(dt);
    this.t += dt;
    const step = Math.floor(((this.t % PULSE_SECONDS) / PULSE_SECONDS) * PULSE_STEPS);
    if (step !== this.pulseStep) { this.pulseStep = step; this.version++; }
    // ⚑ THE GLITCH RUNS ALONE. Nothing else on this surface updates while the
    // picture is failing — L has finished, the offers have finished, and the
    // ball is long over — so the clock below is the only thing moving, and when
    // it runs out the device stops being worn.
    if (this.stageNow === 'glitch') {
      this.glitchT += dt;
      const g = Math.min(GLITCH_STEPS, Math.floor((this.glitchT / GLITCH_SECONDS) * GLITCH_STEPS));
      if (g !== this.glitchStep) { this.glitchStep = g; this.version++; }
      if (this.glitchT >= GLITCH_SECONDS) this.finishHandOff();
      return;
    }
    // L keeps its own version so the caption band's changes reach the visor
    // texture through the SAME dirty-only upload discipline the three E3
    // screens obey — a talking assistant must not become a per-frame upload.
    this.voice.update(dt);
    if (this.voice.version !== this.voiceVersion) {
      this.voiceVersion = this.voice.version;
      this.version++;
    }
    // ⚑ S78 — THE HAND-OFF FROM L. `LVoice.onHandOff` fires on the press of
    // u10's second chip ("Show me the quieter month"); the offers wait until L
    // has actually finished speaking, so the visor never carries two caption
    // bands at once. Nothing is announced in between: L says it will only put
    // up the ones it thinks she would want, and then it does.
    // ⚑ S130 — `voice.finished` is still the gate and it is true from the start
    //   now that the conversation is retired: the voice never begins, so it is
    //   never mid-sentence, and the offers open on the frame after the device
    //   goes on. The condition is kept rather than deleted because the offers
    //   must still never open over a caption band, and if L's voice ever comes
    //   back to this era for any reason this is the line that protects it.
    // ⚑ 2026-09-12 — THE SESSION THAT NEVER BEGINS. The device is on, the
    //   agent's environment is on the glass, its bar is filling — and at
    //   `session.seconds` what arrives is not the session but Junie's card.
    if (this.stageNow === 'worn' && !this.ball.live) {
      const before = this.sessionT;
      this.sessionT += dt;
      if (Math.floor(before * 4) !== Math.floor(this.sessionT * 4)) this.version++;
      // ⚑ 2026-09-13: the session is HEARD — grounding breathes (a loop), the
      //   "recording" plays with nobody in it, and both stop when the card lands
      const S = ballScript.session as { seconds: number };
      // S149 — the session is the only sound on the glass: the room's bed goes as it begins (R3-103)
      if (before < S.seconds && this.sessionT >= S.seconds) { roomBed.set(null, 3.0); this.breath = playLoop('session_breath.mp3'); }
      if (before < S.seconds + 8 && this.sessionT >= S.seconds + 8) {
        stopClip(this.breath); this.breath = null;
        this.hiss = playOnce('playback_hiss.mp3');
        if (this.hiss) this.hiss.volume = 0.5;   // S155 / R3-102: under the introduction, not over it
      }
      if (this.sessionT >= space.sessionSeconds) {
        stopClip(this.breath); this.breath = null; stopClip(this.hiss); this.hiss = null;
        this.ball.invite();
      }
    }
    this.offers.update(dt);
    if (this.offers.version !== this.offersVersion) {
      this.offersVersion = this.offers.version;
      this.version++;
    }
    // ⚑ S79 — THE BALL, on the same clock and the same dirty-only discipline.
    // It draws almost nothing (the machine's own failures, on a stand across
    // the room), so this bumps the visor's version a handful of times in three
    // minutes — the light and the sound are not on this surface at all.
    if (this.failT >= 0 && this.failT < FAIL.off + 0.5) {
      const b4 = this.failT;
      this.failT += dt;
      if (Math.floor(b4 * 12) !== Math.floor(this.failT * 12)) { this.laptopV++; this.version++; }
    }
    if (!this.readyHeard && this.deviceReady && !this.handedOff) { this.readyHeard = true; playOnce('ready_e4.mp3'); }
    this.ball.update(dt);
    if (this.ball.version !== this.ballVersion) {
      this.ballVersion = this.ball.version;
      this.version++;
    }
  }

  /**
   * ⚑ THE ONE TOUCH. Sérgio, 2026-08-06: *"the putting on is a 'touching' it,
   * no need to make the movement to put it on."* So there is no donning
   * animation and no second confirmation — the device is touched and it is on.
   * Files once, like every other act in the piece.
   *
   * ⚑ AND IT IS THE ONE DOOR, WHICH S79 FOUND OUT THE HARD WAY. The ROOM's own
   * picking (`src/room/era3Devices.ts`'s `handleWorkstationPointer`) calls this
   * DIRECTLY when the shell is not worn — it does not go through
   * `handleClick` — so a guard placed on the canvas path alone would have left
   * a press on the headset able to put the device back on in the middle of the
   * ball, which is the one thing the beat must not allow. Measured with a real
   * pointer press from Maya's seat before it was fixed. The guard lives here,
   * at the door every route passes through, and the actual wearing moved into
   * `putOn` below so the ball's own hand-back does not come back through it.
   */
  wear(): void {
    if (this.stageNow === 'ball') { this.ball.handleClick(); return; }
    // ⚑ the headset is not a door until L has finished on the laptop. The room
    //   picks this prop directly (era3Devices' handleWorkstationPointer calls
    //   `wear()` without going through handleClick), so the guard belongs here,
    //   at the door every route passes through — the same lesson S79 learned
    //   about the ball.
    if (this.stageNow === 'laptop') return;
    // ⚑ and it is not a door while it is failing, either. Nothing the player
    //   does causes the glitch and nothing they do interrupts it.
    if (this.stageNow === 'glitch') return;
    // ⚑ 2026-09-12 — and not until the program's steps are done. Pure rails,
    //   his ruling: the headset is step five, and step five is not offered
    //   before steps one to four. `deviceReady` is the same test, for the glow.
    if (this.stageNow === 'closed' && !this.browser.programDone) return;
    this.putOn();
  }
  /** the device is asking to be picked up: on the stand, and the program done */
  get deviceReady(): boolean { return this.stageNow === 'closed' && this.browser.programDone; }
  private readyHeard = false;

  /** where the restart sits on the laptop's canvas; one place, so the draw and
   *  the hit test cannot drift apart the way `kit.ts`'s did */
  closeButtonRect(W: number, H: number): { x: number; y: number; w: number; h: number } {
    // ⚑ sized to the LABEL, not to a guess. The first pass hardcoded 104 px for a
    //   string that did not fit it, and the text ran off the end of its own button.
    const w = 78; const h = 16;
    /**
     * ⚑ AND IT LIVES IN THE TOP HALF OF THE LID, BECAUSE THAT IS ALL THERE IS.
     *
     * This used to sit at `H - h - 10` — pinned to the bottom edge, the obvious
     * place for a dialog's button and, here, off the bottom of the world. S107
     * measured the lid from the seat this era is played from: **only the top
     * ~51% of it is inside the frame**, the rest falls past the edge. The walk
     * then measured the consequence, eight runs in a row, and named it exactly:
     *
     *     laptop:close-restart — off-screen at 630,901   (frame is 860 tall)
     *
     * Forty-one pixels below the bottom of the screen. **The last press in the
     * piece could not be reached by a player**, and the four runs that stalled
     * in front of it were right to.
     *
     * ⚑ It is the same fault S107 found one beat earlier with "press to
     * continue", in this same method's file, which I fixed by moving the text up
     * — while adding this button at the bottom edge in the same session. A
     * measurement about a surface applies to everything drawn on it, not just to
     * the thing that prompted the measurement.
     */
    return { x: W - w - 12, y: Math.round(H * 0.36), w, h };
  }

  /** the laptop's own version, so its screen re-uploads only when its line moves */
  get laptopVersion(): number {
    // ⚑ the browser's version only joins the lid's while it is actually on the
    //   lid. Adding it unconditionally re-uploaded the canvas twice a second
    //   forever, because the cursor blinks even after the browser has stood
    //   down — S105's dirty-only discipline broken by a getter.
    // ⚑ the console reads the browser's state, so the lid follows its version
    return this.laptopV + this.browser.version;
  }

  /** ⚑ S123's interim flag — the browser briefly lived on the lid. It does not
   *  any more (S124 gave it the monitor); kept only so the old review route
   *  still lands somewhere rather than silently doing nothing. */
  browserOwnsLid = false;

  /** ⚑ S124 — the monitor's own surface and its own version. */
  drawBrowser(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    // ⚑ the browser is pressable only while the device is still on the stand —
    //   from the moment it is worn the room sends every press to the picture in
    //   front of her face, so publishing tab rects here would advertise six
    //   controls nothing can reach. See `E4Browser.draw`'s note.
    // ⚑ 2026-09-13: and not once the device has stopped — the walk pressed four
    //   tabs during the Close's lead, on a browser the era had already left.
    this.browser.draw(ctx, W, H, this.stageNow === 'closed' && !this.handedOff);
  }
  /** ⚑ the stage is part of the version: the monitor must repaint (and
   *  republish, or not) the frame the device goes on or comes off */
  get browserVersion(): number {
    return this.browser.version + (this.stageNow === 'closed' && !this.handedOff ? 0 : 100000);
  }
  /** the monitor is a real screen in the room, so its presses are real presses */
  pressBrowser(x: number, y: number): boolean { return this.browser.handleClick(x, y); }

  /** ⚑ ONE LINE AT A TIME, ON PRESS. Chips are the headset's grammar and the era
   *  spends three presses in total, so the laptop reads like every other notice
   *  in this piece: a line, and something to press to see the next one. The last
   *  press does not open anything — it simply stops, and the device across the
   *  desk is lit from then on. */
  pressLaptop(x?: number, y?: number): void {
    // ⚑ after the hand-off the laptop is the CLOSE's surface, not L's
    // ⚑ after the hand-off the laptop reports and offers nothing: the Close has
    //   already begun (`finishHandOff`). A press here is a press on a report.
    if (this.handedOff) return;
    if (this.stageNow !== 'laptop') return;
    // ⚑ S123 — while the browser owns the lid, a press is a TAB, not the next
    //   line. The laptop beat has not begun yet and must not be advanced by
    //   somebody reading a browser.
    // ⚑ a proximity press arrives with no coordinates (the room can press this
    //   prop without aiming at a rectangle — S104's lesson). With none, the
    //   browser cannot resolve a tab, so the press is simply eaten: reading is
    //   not a beat that advances on being touched.
    if (this.browserOwnsLid) {
      if (x !== undefined && y !== undefined) this.browser.handleClick(x, y);
      return;
    }
    this.laptopLine += 1;
    this.laptopV++;
    this.version++;
    if (this.laptopLine >= space.laptop.lines.length) {
      this.stageNow = 'closed';
      this.t = 0;
      ledger.e4Space.push({ id: 'laptop', outcome: 'read', witness: space.laptop.witness });
    }
  }

  /**
   * The laptop's screen. Three states and no more: L talking, L finished, and —
   * once the shell has handed the piece to the Close — the machine still on with
   * nothing left to draw. ⚑ THAT LAST ONE IS THE CONNECTION TO THE END Sérgio
   * asked for: the laptop opened the era and is still lit when the era is over.
   * It does not return to a desktop or a login, because nothing was ever
   * switched off — which is the quietest way this piece has of saying it.
   */
  /**
   * ⚑ THE MIRROR. The laptop shows what is inside the headset, the way SteamVR
   * and Meta's desktop app both do, with one thin bar to say so. Nothing is
   * re-composed and nothing is editorialised: it is the same canvas the visor
   * wears, scaled to the lid. ⚑ It is drawn UNDER the bar, so the bar never
   * covers the picture's own captions.
   */
  drawLaptopMirror(ctx: CanvasRenderingContext2D, W: number, H: number,
    src: CanvasImageSource): void {
    px(ctx, 0, 0, W, H, ERA4.field);
    ctx.drawImage(src, 0, LAPTOP_BAR, W, H - LAPTOP_BAR);
    this.laptopBar(ctx, W, space.laptop.mirrorLabel);
  }

  /** ⚑ THE SAME MIRROR, AFTER THE DEVICE HAS STOPPED (S101). The close ritual is
   *  drawn on the OS canvas and the visor plane is gone by then, so the lid shows
   *  it — but the bar must not still say the headset is mirroring, because the
   *  headset is on the desk and that is the whole point of the beat. */
  drawCloseMirror(ctx: CanvasRenderingContext2D, W: number, H: number,
    src: CanvasImageSource): void {
    px(ctx, 0, 0, W, H, ERA4.field);
    ctx.drawImage(src, 0, LAPTOP_BAR, W, H - LAPTOP_BAR);
    this.laptopBar(ctx, W, space.corrupt.sub);
  }

  /** ⚑ ONE BAR, THREE STATES. The lid carries L's arrival, the headset mirror and
   *  the Close, and without a shared piece of chrome those read as three unrelated
   *  screens rather than one machine doing three things. A status strip is all a
   *  224 × 140 surface can afford, and all it needs. */
  private laptopBar(ctx: CanvasRenderingContext2D, W: number, right: string): void {
    px(ctx, 0, 0, W, LAPTOP_BAR, ERA4.panel);
    px(ctx, 0, LAPTOP_BAR, W, 1, ERA4.rule);
    setFont(ctx, 8);
    ctx.fillStyle = ERA4.dim;
    ctx.fillText(space.laptop.bar, 6, 3);
    const rw = ctx.measureText(right).width;
    ctx.fillText(right, W - rw - 6, 3);
  }

  /** ⚑ S123 — the browser. It owns the lid from the era's first frame until the
   *  laptop beat takes over, and it is where E+B puts the whole era. */
  readonly browser = new E4Browser();
  /** the flight has landed: the settle, then the boot, then the session */
  beginSession(settleSeconds = 0): void { this.browser.beginSession(settleSeconds); }

  drawLaptop(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    // ⚑ S123 — THE BROWSER IS BUILT AND IT DOES NOT LIVE HERE.
    //   It owned the lid for one session and cost the piece its ending: the
    //   walk reached `e4_armed` and stalled, because the lid is also where the
    //   Close's ritual is mirrored and the walker's sweep does not know that
    //   plane. Reverted rather than debugged, on the standing rule that the
    //   piece stays playable end to end — and because the lid was never the
    //   right home. Sérgio, 2026-09-07: the laptop docks to a MONITOR, the
    //   browser goes there, and the headset moves to the periphery.
    //   ⚑ `?debug=1`'s `e4Browser` routes still reach it, so the boot and the
    //   chrome are reviewable while the monitor is built.
    if (this.browserOwnsLid) {
      this.laptopHits = [];
      this.browser.draw(ctx, W, H);
      return;
    }
    px(ctx, 0, 0, W, H, ERA4.field);
    this.laptopHits = [];
    if (this.handedOff) {
      /**
       * ⚑ THE MACHINE'S REPORT OF ITS OWN DEFEAT (2026-09-12). The `Restart`
       * card that sat here is gone from the path (the Close begins with the
       * glitch — `finishHandOff`); what the lid says now is the title, in the
       * words `data/strings/updates.json`'s close ritual has always carried on
       * its dark beat — a beat that played on the visor, which by then is on
       * its stand with its glass off. So the sentence moves to the one screen
       * still lit on the desk, and stays there until the room goes. Nothing on
       * it is pressable. The `closeButtonRect` code is kept, unused.
       */
      if (this.failT >= FAIL.off) { px(ctx, 0, 0, W, H, ERA4.field); return; }   // off
      this.laptopBar(ctx, W, space.corrupt.sub);
      // ⚑ 2026-09-13: LARGE, and in the top half — only the lid's top ~51% is
      //   in the seat's frame (S107), and at 14 px the title was a whisper
      setFont(ctx, 20);
      ctx.fillStyle = ERA4.textHi;
      let ny = LAPTOP_BAR + 14;
      for (const row of wrapLaptop(ctx, updates.close.restarting, W - 20)) { ctx.fillText(row, 10, ny); ny += 24; }
      setFont(ctx, 9);
      ctx.fillStyle = ERA4.dim;
      for (const row of wrapLaptop(ctx, space.corrupt.note, W - 20)) { ctx.fillText(row, 10, ny); ny += 12; }
      // ⚑ S209 / P7-48 (his) — the machine's last word, in L's own colour: it is not over, it is only deferred
      ny += 6;
      setFont(ctx, 11);
      ctx.fillStyle = ERA4.l;
      for (const row of wrapLaptop(ctx, closeMessage.laptopLine, W - 20)) { ctx.fillText(row, 10, ny); ny += 14; }
      if (this.failT >= FAIL.bands) {
        // the bands tear it, and the light goes out of it
        const k = Math.min(1, (this.failT - FAIL.bands) / (FAIL.off - FAIL.bands));
        glitchBands(ctx, W, H, k);
        const was = ctx.globalAlpha;
        ctx.globalAlpha = k * k;
        px(ctx, 0, 0, W, H, ERA4.field);
        ctx.globalAlpha = was;
      }
      return;
    }
    const done = this.laptopLine >= space.laptop.lines.length;
    // ⚑ while L is still talking on the lid, the whole lid is the control — three
    //   presses, one per line. Publishing it is what let a click-only run find
    //   Era 4's opening at all (A-5: the walker could not see this surface).
    if (!done) this.laptopHits.push({ x: 0, y: 0, w: W, h: H, id: 'laptop-next' });
    /**
     * ⚑ 2026-09-12 — L'S CONSOLE. Sérgio: "the laptop doesn't make sense being
     * mirrored"; "we need some guidance on what to do, so maybe the laptop should
     * have an 'L' the agent living there giving you info." So the lid is where
     * the guide lives: the mark in the bar (L, and then the agent that took L's
     * place), one line saying what to do next, in the machine's voice. Nothing
     * on it is pressable. When the device is worn it says so and nothing else.
     */
    if (done) {
      const line = this.worn || this.stageNow === 'ball' ? this.browser.consoleLineWorn : this.browser.consoleLine;
      this.laptopBar(ctx, W, this.browser.consoleMark);
      setFont(ctx, 11);
      ctx.fillStyle = ERA4.textHi;
      let y = LAPTOP_BAR + 18;
      for (const row of wrapLaptop(ctx, line, W - 24)) { ctx.fillText(row, 12, y); y += 16; }
      return;
    }
    this.laptopBar(ctx, W, '');
    if (!done) {
      setFont(ctx, 11);
      ctx.fillStyle = ERA4.textHi;
      const line = space.laptop.lines[this.laptopLine];
      let y = LAPTOP_BAR + 18;
      for (const row of wrapLaptop(ctx, line, W - 24)) { ctx.fillText(row, 12, y); y += 16; }
      /**
       * ⚑ THE PROMPT SITS UNDER THE LINE, NOT AT THE BOTTOM OF THE LID (S107).
       *
       * It was drawn at `H - 12` — twelve pixels off the bottom edge — and S107
       * measured what that means from the seat the era is played from: the
       * laptop's readable panel runs to −22.7° against a 21° half-frame, so its
       * bottom **1.7° is outside the view**. Photographed both ways in one page
       * load: at rest the lid shows *"Hi Maya. I'm L. I came with the update."*
       * and nothing else. **Era 4's only instruction was off-screen at Era 4's
       * seat**, which is this project's oldest bug wearing a new hat — content
       * that exists and cannot be reached.
       *
       * ⚑ Moving the text is the fix that costs nothing else. The alternatives
       * S107 measured all move the CAMERA — and a rig pitch is a world tilt in
       * XR and gyro, where the rig holds the authored pose and the head turns
       * the child camera. Tilting the horizon of a headset build by 3° to make
       * a caption fit is the wrong end of the problem. The seat is still worth
       * re-measuring (it is Sérgio's ruling, and S107 put the numbers in front
       * of him), but the era does not have to stay unplayable while he decides.
       */
      setFont(ctx, 9);
      ctx.fillStyle = ERA4.dim;
      ctx.fillText(space.laptop.hint, 12, y + 6);
    }
  }

  /**
   * ⚑ S119 REVIEW ROUTE — AND IT CLOSED A BUG THAT HAD BROKEN EVERY E4 BUTTON.
   *
   * `os.ts`'s `e4Place` calls `wear()`, and on 2026-09-01 the era gained its
   * laptop opening — after which `wear()` correctly refuses while
   * `stageNow === 'laptop'`, because the headset is not a door until L has
   * finished on the machine. **The debug route was never updated**, so from
   * that day every one of the twenty-odd E4 panel buttons landed on the laptop
   * and sat there: the voice never ticked, the offers never drew, and a
   * reviewer pressing "THE DEADNAME" got Maya's closed laptop.
   *
   * ⚑ Trap 0 in `00_WHERE_THINGS_STAND` exactly — *a fix can open the hole it
   * is closing* — and trap "content that exists cannot be met": nothing caught
   * it, because `tools/walk.mjs` plays the era LINEARLY and therefore reads the
   * three laptop lines the way a player does. Only the panel was broken, and
   * the panel is the only surface with no automated reader.
   *
   * This is the laptop beat consumed as read, which is what every jump past it
   * means: it files exactly what pressing through the three lines files, so a
   * jumped review and a played one leave the same record.
   */
  /** ⚑ review only (2026-09-12): the device has stopped and the laptop holds
   *  the Close — the state the era is in when `enterClose` fires in play. The
   *  panel's Close button calls this first so a review that starts mid-era does
   *  not carry a worn visor into the journey back to Daniel's room. In play it
   *  is a no-op: `finishHandOff` has already run. */
  debugStopDevice(): void {
    if (this.handedOff) return;
    this.ball.close();
    this.ball.leaveWorld();
    this.handedOff = true;
    this.stageNow = 'closed';
    this.laptopV++;
    this.version++;
  }

  debugSkipLaptop(): void {
    // ⚑ 2026-09-12: every jump past the browser also lands past the program
    this.browser.debugFinishProgram();
    if (this.stageNow !== 'laptop') return;
    this.laptopLine = space.laptop.lines.length;
    this.laptopV++;
    this.stageNow = 'closed';
    this.t = 0;
    ledger.e4Space.push({ id: 'laptop', outcome: 'read', witness: space.laptop.witness });
    this.version++;
  }

  private putOn(): void {
    playOnce('wear_2026.mp3');
    if (this.stageNow === 'worn') return;
    this.stageNow = 'worn';
    this.t = 0;
    this.version++;
    // ⚑ ONCE, and see `wornFiled`: the second wearing is the player putting it
    // back on after the ball, and the ball files nothing.
    if (!this.wornFiled) {
      this.wornFiled = true;
      ledger.e4Space.push({ id: 'headset', outcome: 'worn', witness: space.witness.worn });
    }
    /**
     * ⚑ S130 — L'S TEN UNITS ARE RETIRED, AND WEARING THE DEVICE NOW OPENS THE
     * OFFERS DIRECTLY.
     *
     * The conversation used to start here: `voice.begin()`, ten units, and
     * u10's second chip handed over to the offers. All of it is gone, replaced
     * by the browser's `chat` tab — fourteen months of the same relationship,
     * read backwards, with the menu her replies were chosen from still under
     * them. That is not a summary of the units; it is the thing the units were
     * dramatising, stated as evidence instead of performed live.
     *
     * ⚑ WHAT EACH UNIT BECAME, so none of it is quietly lost:
     *   u1  L introduces itself      → the transcript's first entry, dated
     *   u2  it captions her things   → RETIRED (see the note below)
     *   u3  the hoodie, three guesses→ `record`: one line item, held for review
     *   u4  the name, first          → the transcript, 11 months ago
     *   u6  the name, second         → the transcript, 4 months ago
     *   u7–u9 the chips shrink       → the transcript's menus: 3, 3, 2, 2, 1
     *   u10 the return, and handoff  → the transcript's last entry, and THIS
     *
     * ⚑ THE ONE REAL LOSS IS u2 — L captioning her footwear, her sketchbook and
     * her photograph out loud, unasked. It has no home in a browser and it is
     * not worth inventing one: it was the weakest of the three caption beats
     * (its own review found it explaining its own observation) and the hoodie,
     * which is the beat that matters, survives. Recorded as a deliberate cut,
     * not an oversight.
     *
     * ⚑ AND L STILL SPEAKS. It speaks in the past, in the transcript, and it
     * speaks in the sell — the offers' own lines are untouched. What is gone is
     * the middle, and the middle is now hers to read or not.
     */
    // ⚑ 2026-09-12: the offers do not open any more. The correction session
    //   runs on `sessionT`, and Junie's card arrives when it is up.
    this.sessionT = 0;
  }

  /**
   * The room reports how far the head has turned since the device went on.
   * ⚑ The picture leans, in steps, and stops. It never reveals anything that
   * was not already on it: turn all the way round and it is the same window.
   * The record files the turn ONCE, flatly, and says nothing about it — the
   * line is `orientation: changed — view unchanged`, which is the whole beat
   * written in the register's own administrative voice and nowhere else.
   */
  setLook(deltaDeg: number): void {
    if (!this.worn) return;
    const raw = Math.max(-1, Math.min(1, deltaDeg / LOOK_RANGE_DEG));
    const step = Math.round(raw * LOOK_STEPS);
    if (step !== this.lookStep) {
      this.lookStep = step;
      this.look = step / LOOK_STEPS;
      this.version++;
    }
    if (!this.turnFiled && Math.abs(deltaDeg) >= TURN_FILED_DEG) {
      this.turnFiled = true;
      ledger.e4Space.push({ id: 'turn', outcome: 'turned', witness: space.witness.turned });
    }
  }

  /**
   * ⚑ WIRED BY S78. It was S76's named seam and S77 left it alone; the FINALE
   * calls it now (`E4Offers.onHandOff`), which is what actually lets the spine
   * close the piece — before this, `e4HoldsTheSpine` held forever and the era
   * had no end. ⚑ S79's ball goes BEFORE the finale, in `E4Offers.onBreak`, so
   * nothing here has to change when it lands.
   */
  /** the laptop's restart button asks for the Close; `os.ts` wires it */
  onCloseRequest?: () => void;

  handOff(): void {
    if (this.handedOff || this.stageNow === 'glitch') return;
    /**
     * ⚑ THE GLITCH GOES HERE, BETWEEN THE FINALE AND THE DESK (build plan
     * Stage 4). Until now the picture simply ended and the headset was back on
     * its stand; the moment between was the thing Sérgio asked for and the
     * thing that was missing. The device stays on her face for GLITCH_SECONDS
     * while the place comes apart, and only then does `worn` drop.
     */
    this.stageNow = 'glitch';
    playOnce('glitch_e4_end.mp3');
    this.glitchT = 0;
    this.glitchStep = -1;
    this.version++;
  }

  /** the far side of the glitch: the device stops, and the laptop takes over */
  /** ⚑ 2026-09-13: where she is standing in the hall — the room tells the shell
   *  on every seat cut (`app.ts`), and the ball reads it for the second refusal */
  /** ⚑ S209g / I1 — a press in the hall during the ball raises her lamp (ball.handleClick); false outside it */
  pressHall(): boolean {
    if (this.stageNow !== 'ball' || this.ball.phaseId !== 'ball') return false;
    this.ball.handleClick();
    return true;
  }
  setSeat(nodeId: string | null): void { this.ball.inCrowd = nodeId === 'commons-crowd'; this.ball.atSeat = nodeId === null; }
  /** ⚑ 2026-09-13: seconds since the device stopped — the failure SPREADS to
   *  both screens on the desk (the laptop here, the browser in `E4Browser`):
   *  the sentence, then the bands, then off. See `FAIL`. */
  private failT = -1;
  get failSeconds(): number { return this.failT; }
  private finishHandOff(): void {
    if (this.handedOff) return;
    this.handedOff = true;
    /**
     * ⚑ THE DEVICE COMES OFF BY ITSELF (Sérgio, 2026-09-01: "the headset would go
     * back to the desk automagically"). Dropping `worn` here is what does it —
     * `era3Devices` eases the visor back to its rest pose on the desk the moment
     * this is false, so the picture leaves her face and the room comes back with
     * the laptop still lit in it.
     *
     * ⚑ And that is the beat, not a convenience. Every other act in this era is
     * hers: the press on the laptop, the touch on the headset, the turn. The last
     * one is not. Nobody takes it off — it stops.
     */
    this.stageNow = 'closed';
    this.ball.clearLamps();   // the era is over; the lamps go with the picture
    this.laptopV++;
    this.version++;
    this.failT = 0;
    playOnce('set_down_e4.mp3');   // the desk, not the device: it stops
    // ⚑ 2026-09-12: and the world goes with the device — the room comes back
    this.ball.leaveWorld();
    // ⚑ 2026-09-13: and the monitor learns it — the agent's page cannot be reached
    this.browser.fail();
    /**
     * ⚑ AND THE CLOSE BEGINS HERE, NOT ON A PRESS (2026-09-12). Sérgio: *"The
     * stars cannot go down while you are still playing; it has to be with the
     * glitch."* The laptop used to carry a `Restart` card after this and the
     * Close waited on it — one more press, on a machine that had just failed
     * her. Now the device stopping IS the failure being reported: the same
     * update door as the four before it (`os.ts` arms `close` and accepts it on
     * the spot), and the laptop says the one sentence the machine has left.
     * Nobody presses anything; the journey to Daniel's room starts by itself.
     */
    ledger.e4Space.push({ id: 'laptop', outcome: 'read', witness: space.corrupt.witness });
    meetWord('contagion');   // S209 / P7-47 — the reason the session gave for ending her
    this.onCloseRequest?.();
  }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    // ⚑ S88 — ONCE HANDED OFF, THIS SURFACE GOES QUIET. `handOff()` fires only
    // after the finale's own panels/cyclorama sequence has fully played
    // (`E4Offers.finaleClock`), and the instant it does, `os.ts` un-gates the
    // spine (`e4HoldsTheSpine`) and arms the `close` update on the SAME frame
    // if its 22s hold has already elapsed — which it always has by here. That
    // update's "Restart as you are." card is deliberately a SMALL bare modal
    // (`update.ts`'s `notify`/`bare` branch), not a full-screen takeover, and
    // `os.ts` draws it on this exact canvas immediately after this method
    // returns. Without this guard, `this.offers.ownsField` stays true forever
    // (`stage === 'done'` included), so every frame kept painting the four
    // year-panels UNDER the restart card — precisely the composite
    // `theme/era4.ts`'s `eraPanels()` doc forbids in so many words ("no
    // `Restart as you are.`... not this session's"). A plain field is the
    // honest state once the era has nothing left to say: `ERA4.field` is the
    // same base the cyclorama itself fills, so the restart card still lands
    // on the finale's own palette, just without its imagery.
    if (this.handedOff) { px(ctx, 0, 0, W, H, ERA4.field); return; }
    /**
     * ⚑ THE GLITCH — the place coming apart while the voice does not.
     *
     * It draws the picture that was there a moment ago and then fails it: the
     * install's own band-tear (`theme/era4.ts`'s `glitchBands`, written for the
     * transitions and never used here) over the finale's field, and the light
     * going out of it. There is no red, no alarm, no error glyph and no sound
     * of damage — tone dial ≤ +1, ERA4's own palette, exactly as the build plan
     * specifies. ⚑ Nothing captions it. The player is not told what happened,
     * because the apparatus never once told her the truth about what it was
     * doing and it is not going to start on the way out.
     */
    if (this.stageNow === 'glitch') {
      const k = Math.max(0, Math.min(1, (this.glitchStep + 1) / GLITCH_STEPS));
      // ⚑ 2026-09-12: the glitch tears the CLEAR GLASS — the room she was not
      //   supposed to see is still there behind the bands as the picture fails
      ctx.clearRect(0, 0, W, H);
      glitchBands(ctx, W, H, k);
      // the light leaving, in the field's own colour — a picture stopping, not
      // a screen breaking
      const was = ctx.globalAlpha;
      ctx.globalAlpha = k * k;
      px(ctx, 0, 0, W, H, ERA4.field);
      ctx.globalAlpha = was;
      visorEdge(ctx, W, H);
      return;
    }
    // ⚑ THE BALL HAS NO SCREEN IN IT. The device is on its stand across the
    // room and this is all that is on it: dark glass, the standby light it has
    // always shown when it is not being worn, and — occasionally, and only if
    // the player turns back to look — the machine still trying to caption what
    // it can hear. Nothing of the ball is drawn anywhere, ever.
    // ⚑ AND THE STANDBY WAITS FOR THE CATEGORIES TO BE OVER. While the ball is
    // running the device is simply dark: a lit "Ready to wear" across the room
    // is the closest thing this beat could have to a prompt, and the press it
    // advertises does nothing until the ball has run out anyway. So the
    // affordance and its availability arrive together, and until then there is
    // nothing in the room that wants anything.
    if (this.stageNow === 'ball') {
      /**
       * ⚑ S133 — THE GLASS IS CLEAR. The device is on her face and the shared
       * space is the room she can see through it: nothing is drawn here but
       * the overlay's own occasional failures (the stutter) and the visor's
       * edge. The old branch painted a dark field and a standby prompt onto a
       * headset on a stand; there is no stand in this beat any more.
       */
      ctx.clearRect(0, 0, W, H);
      this.ball.draw(ctx, W, H, LABEL.x, LABEL.y, LABEL.w);
      visorEdge(ctx, W, H, 0.35);
      return;
    }
    // the era has not begun until L has finished on the laptop: the device is
    // dark, not inviting, and `wear()` refuses anyway
    if (this.stageNow === 'laptop') { visorField(ctx, W, H); return; }
    if (!this.worn) {
      /**
       * ⚑ READY = A GLOW, NOT A SCREEN. Sérgio asked to "make the VR headset
       * glow", and the reason the old standby could not is that it was a legible
       * waiting screen — dark glass with a line of text — rendered onto a face
       * a few centimetres across at a metre away. At that size text is noise and
       * dark glass is a black rectangle stuck to a headset. What reads at that
       * size is LIGHT: the lens lit and breathing, and the words moved to the
       * laptop, which is where the era does its reading now.
       * ⚑ The plane is disabled entirely except when worn or ready (era3Devices'
       * setEra), so this is only ever drawn when the device is actually waiting.
       */
      /**
       * ⚑ S104 — AND NOW IT IS ACTUALLY A GLOW. S101 ruled "ready is a glow, not
       * a screen" and then painted `ERA4.field` across the whole canvas with a
       * lit rectangle on top — which, on a plane nine centimetres across at a
       * metre, is a BLACK SLAB with a green pill on it. That is the "black screen
       * on top of the VR headset" Sérgio has now reported twice, surviving a fix
       * that was aimed at the words rather than at the darkness.
       *
       * The plane is alpha-blended from this canvas (`makeScreenEntity`'s
       * `transparent`), so clearing it means there is NOTHING on the headset's
       * face — and the only thing drawn is light, breathing, falling off at the
       * edges. The device is a model with a lit lens, which is what it is.
       */
      const pulse = Math.abs(this.pulseStep / (PULSE_STEPS - 1) - 0.5) * 2;
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2;
      const cy = H / 2;
      const rw = Math.min(W, H) * (0.34 + 0.05 * pulse);
      const rh = rw * 0.46;
      // six nested bands, brightest in the middle: a soft falloff in a palette
      // that has no gradients — the same trick the era's own theme uses
      const was = ctx.globalAlpha;
      for (let i = 6; i >= 1; i--) {
        // ⚑ the first pass of this was 0.10 and read as NOTHING at a metre — the
        //   opposite failure to the black slab and just as useless. A lens that
        //   is lit has to be legible as lit from where the player is sitting.
        ctx.globalAlpha = (0.34 + 0.16 * pulse) * (1 - (i - 1) / 7);
        const k = i / 6;
        px(ctx, Math.round(cx - rw * k), Math.round(cy - rh * k),
           Math.round(rw * 2 * k), Math.round(rh * 2 * k), ERA4.l);
      }
      ctx.globalAlpha = was;
      return;
    }
    // ⚑ THE FINALE TAKES THE FIELD. Everywhere else the offers draw OVER the
    // picture of a room, exactly as L's captions do; from the cyclorama on there
    // is no room left to draw under them, which is the point of that image.
    /**
     * ⚑ 2026-09-12 — THE CORRECTION SESSION, and the offers are gone from here.
     * Sérgio: "cut the offers entirely — we are taken to a correction system,
     * but Junie's invitation inside of the VR world takes us to a place we
     * didn't know." So the glass shows the agent's own environment (`E4Ball.
     * drawSession`), and over it, when it comes, the card; then the filter,
     * front and centre, as the space is entered. The Sunroom, its tag, L's
     * caption band and the wall of offers no longer draw — the code stays,
     * nothing calls it.
     */
    // ⚑ and it DISSOLVES as the filter fails: each label the overlay cannot
    //   make stick takes a share of the environment with it, and the room she
    //   was not supposed to see comes through the glass a step at a time
    const k = this.ball.environmentK;
    ctx.clearRect(0, 0, W, H);
    if (k > 0) {
      const was = ctx.globalAlpha;
      ctx.globalAlpha = k;
      this.ball.drawSession(ctx, W, H, this.sessionT);
      ctx.globalAlpha = was;
    }
    this.ball.draw(ctx, W, H, LABEL.x, LABEL.y, LABEL.w);
    visorEdge(ctx, W, H, this.ball.live ? 0.35 + 0.65 * k : 1);
  }

  /**
   * The presses this surface takes, and there are only ever two kinds.
   * CLOSED: any press on the dark glass is THE ONE TOUCH (S1.0's power-press
   * grammar, and S2R.0's return press).
   * WORN: ⚑ L's chips, and nothing else. A press that lands on no chip is
   * still CONSUMED — the picture is in front of her face, so a press cannot
   * fall through the place onto the room behind it — and consuming a press is
   * not the same as acting on one: there is no continue, no confirm and no
   * dismiss anywhere in this era.
   */
  handleClick(x: number, y: number): boolean {
    // ⚑ THE BALL TAKES NO INPUT AT ALL until its categories have run out, and
    // then it takes exactly one: the same one touch on the same device that
    // began the era. A press before that is consumed and does nothing, so a
    // stray click cannot cut the piece's only respite short — and nothing
    // announces the difference, because nothing in this era ever does.
    if (this.stageNow === 'ball') return this.ball.handleClick(x, y);
    if (this.worn) {
      // ⚑ S133: while the invitation is up it owns the press — one chip, or
      //   nothing, consumed either way, exactly as L's chips were.
      if (this.ball.invited) return this.ball.handleClick(x, y);
      // ⚑ the offers get first refusal, because by the time they are on screen L
      // has finished and its chips are gone. Two of the era's three presses land
      // here — the memories undo and the careful pause — and everything else on
      // this surface is still consumed and still does nothing.
      if (!this.offers.handleClick(x, y)) this.voice.handleClick(x, y);
      return true;
    }
    this.wear();
    return true;
  }
}

/**
 * ⚑ THE BRIDGE, and why it exists rather than a constructor argument.
 *
 * Two things in this era live in the ROOM but are owned by the OS: the visor
 * plane (which draws `DesktopOS`'s canvas, mounted on the headset instead of a
 * monitor) and the last update ritual (which lands on Vera's workstation, because
 * that is the screen the player is actually looking at when E3 ends — see
 * `data/dialog/s4_update.json`'s `_docWhere`). `src/engine/app.ts` builds
 * `era3Devices` BEFORE it builds the OS and was outside this session's file
 * fence, so neither could be handed to the other directly.
 *
 * This is the same module-level-hook pattern `cluster.ts`'s `setEra3Lift` uses,
 * and for the same reason: the two halves of one beat sit either side of a file
 * fence. It is read lazily, so build order does not matter.
 */
export interface E4Bridge {
  /** ⚑ the piece's ONE UI surface. The room textures this same canvas onto the
   *  visor instead of a monitor — same pixels, same FILTER_NEAREST, same
   *  `?flat=1`. Only the mount point changed, which is exactly the argument the
   *  piece has been making since 1997: same machine, new casing. */
  canvas(): HTMLCanvasElement;
  /** the update ritual currently armed, if any (u4 draws on the workstation) */
  update(): UpdateApp | null;
  /** the era's shell — null until the era is `e4` */
  shell(): E4Shell | null;
  /** ⚑ THE TRIGGER: E3's work is finished and the platform announces its own
   *  end. Called by the room when the correction list is exhausted; a no-op if
   *  a ritual is already running or the era has moved on. Never the player's
   *  press: the notice is the system reporting a failure of its own. */
  armFinal(): void;
  /** ⚑ S87 — the era-3 send offer (s3/s4). Daniel's monitor is dead for the
   *  whole of E3 (S61) and stays that way, so the offer needs a live screen
   *  to draw on at all; the workstation composites it exactly the way it already
   *  composites `update()`. See `DesktopOS.drawSendOfferExternal`'s own
   *  comment for the s3/s4 comfort-safety gate (08_STATUS_REGISTER §17). */
  sendOfferActive(): boolean;
  sendOfferVersion(): number;
  drawSendOfferExternal(ctx: CanvasRenderingContext2D): void;
  handleSendOfferExternalClick(x: number, y: number): boolean;
}

let bridge: E4Bridge | null = null;

export function setE4Bridge(b: E4Bridge | null): void { bridge = b; }
export function e4Bridge(): E4Bridge | null { return bridge; }

/**
 * ⚑ IS THERE A ROOM? `src/room/era3Devices.ts` claims this when it builds, so
 * it is true in the 3D engine and false under `?flat=1`, which has no room and
 * no workstation to composite anything onto.
 *
 * One thing turns on it: WHERE THE LAST UPDATE DRAWS. In the room it draws on
 * Vera's workstation, and Daniel's Era-3 monitor stays dead exactly as S61 left it.
 * In flat there is only the one canvas, so the ritual draws there — otherwise
 * `?flat=1` would black out the notice and Era 4 would be unreachable in the
 * canvas-only review route, which is the one thing that review route exists to prevent.
 */
let roomMounted = false;
export function claimRoomMount(): void { roomMounted = true; }
export function roomIsMounted(): boolean { return roomMounted; }

/** the visor's resting field colour, so the room can clear to it before the
 *  first draw lands (one import site, no second copy of the palette) */
export const VISOR_FIELD = ERA4.field;
