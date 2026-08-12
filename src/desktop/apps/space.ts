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
import { homeEnvironment, standby, visorEdge, ERA4, PLACE } from '../theme/era4';
import { setFont, px } from '../theme/chrome';
import { ledger } from '../../state/ledger';
import space from '../../../data/dialog/s4_space.json';
import { LVoice } from './lVoice';
import { E4Offers } from './offers';
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

type Stage = 'closed' | 'worn';

/**
 * The era's shell. One instance, made by `DesktopOS` when the era becomes `e4`
 * and published on the bridge below so the ROOM (`src/room/era3Devices.ts`) and
 * the flat review tool can reach the same object — the mount points differ,
 * the surface does not.
 */
export class E4Shell {
  private stageNow: Stage = 'closed';
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
  }

  get stage(): Stage { return this.stageNow; }
  get worn(): boolean { return this.stageNow === 'worn'; }
  /** the spine holds its breath while this is false — see os.ts's
   *  `sendOfferPending`. S79's ball is what eventually sets it. */
  get handedOffToClose(): boolean { return this.handedOff; }

  update(dt: number): void {
    this.t += dt;
    const step = Math.floor(((this.t % PULSE_SECONDS) / PULSE_SECONDS) * PULSE_STEPS);
    if (step !== this.pulseStep) { this.pulseStep = step; this.version++; }
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
  }

  /**
   * ⚑ THE ONE TOUCH. Sérgio, 2026-08-06: *"the putting on is a 'touching' it,
   * no need to make the movement to put it on."* So there is no donning
   * animation and no second confirmation — the device is touched and it is on.
   * Files once, like every other act in the piece.
   */
  wear(): void {
    if (this.stageNow === 'worn') return;
    this.stageNow = 'worn';
    this.t = 0;
    this.version++;
    ledger.e4Space.push({ id: 'headset', outcome: 'worn', witness: space.witness.worn });
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
  handOff(): void {
    if (this.handedOff) return;
    this.handedOff = true;
    this.version++;
  }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    if (!this.worn) {
      // ⚑ drawn LARGE and simple: this same canvas is textured onto a 9 cm
      // visor across the room, and it is also the whole of `?flat=1`'s screen.
      // The grammar is S2R.0's waiting screen — dark glass, one dim line.
      const pulse = Math.abs(this.pulseStep / (PULSE_STEPS - 1) - 0.5) * 2;
      standby(ctx, W, H, pulse, space.standbyLabel);
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
 * monitor) and the last update ritual (which lands on Vera's laptop, because
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
  /** the update ritual currently armed, if any (u4 draws on the laptop) */
  update(): UpdateApp | null;
  /** the era's shell — null until the era is `e4` */
  shell(): E4Shell | null;
  /** ⚑ THE TRIGGER: E3's work is finished and the platform announces its own
   *  end. Called by the room when the correction list is exhausted; a no-op if
   *  a ritual is already running or the era has moved on. Never the player's
   *  press: the notice is the system reporting a failure of its own. */
  armFinal(): void;
}

let bridge: E4Bridge | null = null;

export function setE4Bridge(b: E4Bridge | null): void { bridge = b; }
export function e4Bridge(): E4Bridge | null { return bridge; }

/**
 * ⚑ IS THERE A ROOM? `src/room/era3Devices.ts` claims this when it builds, so
 * it is true in the 3D engine and false under `?flat=1`, which has no room and
 * no laptop to composite anything onto.
 *
 * One thing turns on it: WHERE THE LAST UPDATE DRAWS. In the room it draws on
 * Vera's laptop, and Daniel's Era-3 monitor stays dead exactly as S61 left it.
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
