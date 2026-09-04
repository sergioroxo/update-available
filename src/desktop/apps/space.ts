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
import { homeEnvironment, standby, visorField, visorEdge, glitchBands, ERA4, PLACE } from '../theme/era4';
import { setFont, px } from '../theme/chrome';
import { ledger } from '../../state/ledger';
import space from '../../../data/dialog/s4_space.json';
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
const GLITCH_SECONDS = 1.2;
const GLITCH_STEPS = 12;

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
const LAPTOP_W = 224;
const LAPTOP_H = 140;

export class E4Shell {
  private stageNow: Stage = 'laptop';
  /** which of the laptop's lines is showing; past the last one, L is done there */
  private laptopLine = 0;
  private laptopV = 0;
  private t = 0;
  private pulseStep = 0;
  /** −1…+1, quantised to LOOK_STEPS — how far the picture has leaned */
  private look = 0;
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
  private offersPending = false;
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
    this.offers.onBreak = () => { this.ball.begin(); return true; };
    // the device leaves her face. Nothing narrates it, and nothing needs to:
    // the picture ends and the room is there. ⚑ The turn works from here.
    this.ball.onDeviceOff = () => { this.stageNow = 'ball'; this.version++; };
    // …and she puts it back on, which is the only way the ball ends.
    this.ball.onOver = () => { this.putOn(); this.offers.resumeAfterBreak(); };
  }

  get stage(): Stage { return this.stageNow; }
  get worn(): boolean { return this.stageNow === 'worn'; }
  /** ⚑ still ON HER FACE, worn or failing. The room pins the visor plane to the
   *  camera while this is true, so the glitch plays where the picture was and
   *  the device eases back to the desk only once it is over. */
  get pinned(): boolean { return this.stageNow === 'worn' || this.stageNow === 'glitch'; }

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
    if (this.offersPending && this.voice.finished && !this.offers.live) {
      this.offersPending = false;
      this.offers.begin();
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
    this.putOn();
  }

  /** where the restart sits on the laptop's canvas; one place, so the draw and
   *  the hit test cannot drift apart the way `kit.ts`'s did */
  private closeButtonRect(W: number, H: number): { x: number; y: number; w: number; h: number } {
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
  get laptopVersion(): number { return this.laptopV; }

  /** ⚑ ONE LINE AT A TIME, ON PRESS. Chips are the headset's grammar and the era
   *  spends three presses in total, so the laptop reads like every other notice
   *  in this piece: a line, and something to press to see the next one. The last
   *  press does not open anything — it simply stops, and the device across the
   *  desk is lit from then on. */
  pressLaptop(x?: number, y?: number): void {
    // ⚑ after the hand-off the laptop is the CLOSE's surface, not L's
    if (this.handedOff) {
      if (x === undefined || y === undefined) return;
      const r = this.closeButtonRect(LAPTOP_W, LAPTOP_H);
      if (x < r.x || x > r.x + r.w || y < r.y - 4 || y > r.y + r.h) return;
      ledger.e4Space.push({ id: 'laptop', outcome: 'read', witness: space.corrupt.witness });
      this.onCloseRequest?.();
      return;
    }
    if (this.stageNow !== 'laptop') return;
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

  drawLaptop(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    px(ctx, 0, 0, W, H, ERA4.field);
    this.laptopHits = [];
    if (this.handedOff) {
      this.laptopBar(ctx, W, space.corrupt.sub);
      setFont(ctx, 11);
      ctx.fillStyle = ERA4.textHi;
      ctx.fillText(space.corrupt.line, 12, LAPTOP_BAR + 5);
      // ⚑ 8 px, not 9, and tighter rows: everything on this card has to clear
      //   the button above, which has to clear the frame's own bottom edge.
      setFont(ctx, 8);
      ctx.fillStyle = ERA4.dim;
      let ny = LAPTOP_BAR + 20;
      for (const row of wrapLaptop(ctx, space.corrupt.note, W - 24)) { ctx.fillText(row, 12, ny); ny += 10; }
      // ⚑ THE ASK, IN THE CLOSE UPDATE'S OWN WORDS, on a card — a notice on her
      //   machine with a single thing to press, exactly like the four before it.
      const r = this.closeButtonRect(W, H);
      px(ctx, 8, r.y - 6, W - 16, r.h + 12, ERA4.panel);
      px(ctx, 8, r.y - 6, W - 16, 1, ERA4.rule);
      setFont(ctx, 10);
      ctx.fillStyle = ERA4.textHi;
      ctx.fillText(space.corrupt.ask, 14, r.y + 3);
      px(ctx, r.x, r.y, r.w, r.h, ERA4.field);
      px(ctx, r.x, r.y, r.w, 1, ERA4.l);
      const tw = ctx.measureText(space.corrupt.button).width;
      ctx.fillText(space.corrupt.button, r.x + Math.round((r.w - tw) / 2), r.y + 4);
      // ⚑ registered where it is DRAWN, from the same rect the hit test uses, so
      //   the two cannot drift apart the way kit.ts's did.
      this.laptopHits.push({ ...r, id: 'close-restart' });
      return;
    }
    const done = this.laptopLine >= space.laptop.lines.length;
    // ⚑ while L is still talking on the lid, the whole lid is the control — three
    //   presses, one per line. Publishing it is what let a click-only run find
    //   Era 4's opening at all (A-5: the walker could not see this surface).
    if (!done) this.laptopHits.push({ x: 0, y: 0, w: W, h: H, id: 'laptop-next' });
    this.laptopBar(ctx, W, done ? space.laptop.readyHint : '');
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

  private putOn(): void {
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
    // ⚑ and L is already talking. No greeting screen, no onboarding, no
    // application to open: the OS IS the assistant from here on.
    this.voice.begin();
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
    this.glitchT = 0;
    this.glitchStep = -1;
    this.version++;
  }

  /** the far side of the glitch: the device stops, and the laptop takes over */
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
    this.laptopV++;
    this.version++;
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
      if (this.offers.ownsField) this.offers.draw(ctx, W, H);
      else homeEnvironment(ctx, W, H, this.look);
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
      if (this.ball.returnable) {
        const pulse = Math.abs(this.pulseStep / (PULSE_STEPS - 1) - 0.5) * 2;
        standby(ctx, W, H, pulse, space.standbyLabel);
      } else {
        visorField(ctx, W, H);
      }
      this.ball.draw(ctx, W, H, LABEL.x, LABEL.y, LABEL.w);
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
    if (this.offers.ownsField) { this.offers.draw(ctx, W, H); return; }
    homeEnvironment(ctx, W, H, this.look);
    // The environment's own name, the size a headset prints it. ⚑ `arranged for
    // you` is the ENTIRE addressing this session carries — the faintest sense
    // that the place is aimed at somebody. The ads, the store and the "for you"
    // wall are S78's.
    //
    // ⚑ MOVED TOP-LEFT BY S77, and it is a composition fix rather than a change
    // of mind. S76 printed it bottom-left, which was right in a place where
    // nothing else spoke; L's caption band now lives along the bottom edge for
    // most of the era and the tag was simply underneath it, invisible. Top-left
    // also gives the surface an honest hierarchy: the environment's name and
    // the system's label field along the top, the voice and your answers along
    // the bottom.
    setFont(ctx, 10);
    ctx.fillStyle = PLACE.ink;
    ctx.fillText(space.tag, 16, 16);
    setFont(ctx, 8);
    ctx.fillStyle = PLACE.floorLo;
    ctx.fillText(space.tagSub, 16, 30);
    px(ctx, 16, 41, 34, 1, PLACE.ink);
    // ⚑ L draws INSIDE the visor's edge, not outside it: the caption band, the
    // chips and the label field are things the device is showing her, so the
    // vignette closes over them exactly as it closes over the room.
    this.voice.draw(ctx, W, H);
    // ⚑ and S78's offers over the same picture, in the same grammar: the cards
    // are things the place is showing her, so they sit inside the visor's edge
    // exactly as the captions do.
    this.offers.draw(ctx, W, H);
    // ⚑ S79's arrival: the machine hears the ball and starts labelling it, in
    // its own label field, while L itself says nothing at all from here to the
    // end of the era. This is the last thing this surface ever shows her.
    this.ball.draw(ctx, W, H, LABEL.x, LABEL.y, LABEL.w);
    visorEdge(ctx, W, H);
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
    if (this.stageNow === 'ball') return this.ball.handleClick();
    if (this.worn) {
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
