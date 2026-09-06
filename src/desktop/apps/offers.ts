/**
 * ⚑ THE OFFERS — Era 4's Stage 2c (S78). What the place sells her, and how the
 * era ends. Lines and copy: `data/dialog/s4_offers.json`. Design of record:
 * `docs/REINTERP_E4_DEEP_PASS_2026-08-05.md` §2 (the memories) and §3.4 (the
 * export), `docs/REINTERP_E4_SOURCE_PASS_2026-08-06.md` §2 (the curation law),
 * `docs/REINTERP_E4_THE_SPACE_2026-08-06.md` §2 (this is where the ads live).
 *
 * It runs after S77's conversation, over the same picture of a room, in the
 * same caption grammar — five beats and a finale:
 *
 *   1. **the memories** — her own photographs, resurfaced and ENHANCED
 *   2. the second memory, ⚑ already enhanced, whatever she did with the first
 *   3. **the wall** — four offers, put up while L talks
 *   4. **the curation** — a paid placement selected for her, and the one it left out
 *   5. **the careful pause** — the era's near-settle, with two doors
 *   6. **the finale** — glitch → the cyclorama's slits → four panels → hand off
 *
 * ⚑ SIX LAWS THIS FILE EXISTS TO KEEP:
 *
 *  1. **THE MEMORIES ARE NOT AN APP** (DEEP_PASS §2). An editor she opens is a
 *     choice, and this era's thesis is that the choice is gone. So there is no
 *     window, no toolbar and no "open": the system puts a card in front of her
 *     and the picture in it has already been improved. ⚑ **The cruelty is that
 *     it is a GOOD photo** — nothing in this file sours it, tips the player off,
 *     or lets the surface hint that something was done. The system is pleased.
 *  2. **⚑ AND IT IS OUR INVENTION.** The source pass found NO AI "true self" or
 *     pre-transition restoration tool anywhere in the record. A not-found is a
 *     finding: Ethics #13's `speculative` rating STANDS, and the dossier card in
 *     `data/provotypes/e4_offers.json` says in plain words that this is
 *     extrapolation and not documentation. It is the most vivid thing in Era 4
 *     and the least evidenced — exactly what the speculation ledger is for.
 *  3. **NO CAMERA, NO FILE INPUT, EVER.** Every photograph is a pre-authored
 *     sprite in `theme/era4.ts`, the same law the E1 Restoration Filter obeys,
 *     and a CLAUDE.md hard invariant. This file requests no permission of any
 *     kind and touches no device API.
 *  4. **UNDO EXISTS AND WORKS** — the dismissal law, unbroken since E1: the act
 *     always works, and it is always logged. ⚑ And the next memory is already
 *     enhanced. Nothing she declines is ever un-offered.
 *  5. **⚑ THE CURATION IS THE TARGET, NEVER THE SPEAKERS** (SOURCE_PASS §2). A
 *     lobbying campaign with a named author, a documented purpose and an
 *     unsupported premise is NOT the gender-exploratory clinical debate: the
 *     first is attributed, the second is the one that gets both captions
 *     unresolved. Collapsing them would hand a lobbying position the epistemic
 *     protection the piece reserves for genuine uncertainty. So the clip is
 *     rendered as *their speech*, on a card that says whose it is and that the
 *     placement was paid for; the counter-beat is a person the campaign claims
 *     to speak for; and the only thing that ever remarks on any of it is the
 *     record's own `3 of 214`.
 *  6. **⚑ THE TOUCHLESS BUDGET IS A RULE.** Every beat here advances itself.
 *     The presses this file takes are TWO of the era's three: the undo on a
 *     memory, and the careful pause's chips. There is no continue, no confirm,
 *     no menu, no skip — and **no timer on a chip**: the pause waits forever,
 *     which is only safe because BOTH its live chips advance it. If the pause
 *     ever becomes the only door, the flow itself is doing the coercing.
 *
 * REGISTER: `operable` throughout — the apparatus's own surfaces, and operable
 * surfaces may glitter, charm and play. ⚑ There is NO `felt` beat here, which is
 * how check-spec's C2 is kept while an assistant speaks at all: a `felt` beat is
 * a beat L is ABSENT from. Era 4's felt beat is the ball, and L does not enter it.
 *
 * ⚑ S79'S SEAM, AND NOT ONE THREAD OF ITS TEXTURE: `onBreak` is called once,
 * between the careful pause and the finale. Nothing is registered on it today,
 * so the finale follows immediately; when the ball exists it takes the break and
 * calls `resumeAfterBreak()` when it is over. There is no ball audio here, no
 * MC, no category line, and no placeholder for any of them — S79 inherits a
 * blank page, which is the correct inheritance.
 *
 * ⚑ NO LINE IS VOICED. Every `audio` name is a name only; the clips come after
 * the voice pass, in one batch. `tapeAudio`'s registry law means an unregistered
 * name is silently never requested — no console error, no 404, silent captions.
 */
import {
  WALL, captionBand, chip, counterCard, cyclorama, eraPanels, filingStrip, glitchBands, mediaCard, memoryCard, offerCard, photograph, type Rect
} from '../theme/era4';
import { px, setFont, wrapText } from '../theme/chrome';
import { e4Filings, ledger } from '../../state/ledger';
import { playOnce } from '../../audio/tapeAudio';
import script from '../../../data/dialog/s4_offers.json';

/** the caption's head start on the clip, in seconds — the same safety measure
 *  `lVoice.ts` keeps, for the same reason, and NOT a pacing choice. */
const CAPTION_LEAD = 0.5;
/** ⚑ S102 — a beat of air after a clip ends; `lVoice.ts`'s own CLIP_TAIL, and
 *  the same reason: the next caption must not land on the last syllable. */
const CLIP_TAIL = 0.45;
const CAPTION_WRAP = 458;
const CAPTION_MAX_ROWS = 3;
const CHIP = { x: 16, w: 306, h: 19, gap: 4 } as const;

/** where the memory card sits: high enough to clear the caption band, wide
 *  enough that the photograph is a photograph and not a thumbnail. */
const MEM = { x: 146, y: 52, w: 220 } as const;
/**
 * ⚑ S119 — the session file. It sits BELOW the memory card, not beside it: the
 * left gutter the card leaves (0..146) is 132 px wide and the longest witness
 * line in the data is about 205, so the first version painted
 * `legacy record consistency — retained` straight across her photograph. The
 * card runs y 52..228, the caption band starts around 322, and 236..291 is the
 * clear band between them.
 *
 * Under the careful pause the wall is up instead (cards at y 58..180) and the
 * chips come up from the band to about y 243, so the strip moves to 186 and
 * takes two rows rather than three.
 */
const FILED = { x: 8, y: 236, w: 340, rows: 3, pauseY: 186, pauseRows: 2 } as const;
const FILED_HEADING = 'session file';
/** the wall: four offers across the top of the place, put up while L talks */
const CARD = { y: 58, w: 120, h: 122, gap: 6 } as const;
const MEDIA = { x: 20, y: 100, w: 306, h: 124 } as const;
const COUNTER = { x: 20, y: 232, w: 306, h: 48 } as const;

/** how long each beat runs before it hands on, in seconds. Authored rather than
 *  derived, because a beat is a length of time and not a sum of holds — the
 *  quiet after the last line is part of it (ARGUMENT §5.3: silence is a texture
 *  in this era, not an absence). */
/** ⚑ `ballshots` (S119) runs 16 s against 11 s of caption, so the small grey
 *  control under the picture has real time to be found and pressed. It
 *  auto-advances like every other memory beat: after 3½ minutes of the ball,
 *  holding the player on a card until they press would be the worst possible
 *  place in the piece to start demanding presses. */
const BEAT_SECONDS = { m1: 14.4, m2: 14.6, wall: 14.0, curation: 25.0, ballshots: 16.0, pause: Infinity } as const;
/** the curation's own schedule, in seconds from the top of the beat */
const CUR = { excerpt0: 2.0, excerptGap: 3.2, counter: 13.0, after: 16.0, fade: 17.6, fadeStep: 0.5 } as const;
/** the wall goes up one card at a time while L is still talking */
const WALL_GAP = 1.1;

/** the finale's movements, in seconds. Long enough to be an image and short
 *  enough that it is a hand-off rather than an ending. */
const GLITCH_SECONDS = 1.6;
const CYC_SECONDS = 3.2;
const PANEL_SECONDS = 5.4;
const PANEL_HOLD = 2.6;
/** ⚑ the finale is STEPPED, like everything else drawn here: a continuous curve
 *  would re-upload the visor texture every frame, and the dirty-only discipline
 *  is the law the three E3 screens already obey. */
const FINALE_STEPS = 12;

interface OLine { id: string; text: string; audio?: string; hold: number }
interface OFiling { outcome: string; witness: string }
interface OChip {
  id: string; label: string; outcome?: string; witness?: string;
  gone?: boolean; alsoFiles?: OFiling[]; reply?: OLine;
}

type Stage =
  | 'idle' | 'm1' | 'm2' | 'wall' | 'curation' | 'pause'
  | 'held' | 'glitch' | 'cyclorama' | 'panels' | 'done' | 'ballshots';

type LedgerOutcome = 'surfaced' | 'undone' | 'answered' | 'corrected' | 'retained' | 'withdrawn' | 'handed';

interface Hit extends Rect { id: string }

const MEMS = script.memories.beats as unknown as Array<{
  id: string; lines: OLine[]; undo: { witness: string; reply: OLine }; witness: string;
}>;
const PAUSE_CHIPS = script.pause.chips as unknown as OChip[];
const AFTER_BALL = script.afterBall as unknown as {
  title: string; control: string; unavailable: string; lines: OLine[];
};

export class E4Offers {
  /** bumped on every change to what this surface DRAWS; `E4Shell` folds it into
   *  its own version so the room re-uploads the visor texture only then. */
  version = 0;

  /**
   * ⚑ S79'S SEAM. Called once, after the careful pause and before the finale.
   * Return `true` to take the break — the ball is the one thing in this era not
   * served through the device, so it owns the surface itself and calls
   * `resumeAfterBreak()` when it is over. Nothing registers here today and the
   * finale follows immediately, so the era is playable end to end without it.
   */
  onBreak?: () => boolean;
  /** fired at the very end of the finale. `E4Shell` wires this to `handOff()`,
   *  which is the only thing that lets the spine close the piece. */
  onHandOff?: () => void;

  private stage: Stage = 'idle';
  /** seconds since this beat began — never reset by a line */
  private stageT = 0;
  /** seconds the current caption has been up */
  private lineT = 0;
  private queue: OLine[] = [];
  private cur: OLine | null = null;
  private spoke = false;
  private hits: Hit[] = [];
  private waiting = false;
  private filed = new Set<string>();

  /** ⚑ per memory: is the system's enhancement still on? Starts true on BOTH —
   *  the second memory arrives already enhanced whatever she did with the
   *  first, and that is the beat. */
  private enhanced = [true, true];
  private undone = [false, false];
  /** ⚑ one-way, and it is the only state this beat has: once she has asked, the
   *  control reports instead of offering. There is nothing to toggle back to. */
  private ballShotPressed = false;
  private wallUp = 0;
  private excerpts = 0;
  private counterShown = false;
  private counterFade = 1;
  private afterSaid = false;
  private finaleStep = 0;

  /** the finale takes the field away from the picture of a room */
  get ownsField(): boolean {
    return this.stage === 'cyclorama' || this.stage === 'panels' || this.stage === 'done';
  }
  get live(): boolean { return this.stage !== 'idle'; }
  get stageId(): string { return this.stage; }
  get handedOver(): boolean { return this.stage === 'done'; }

  /** ⚑ the only way in, and it is `LVoice.onHandOff` — u10's second chip, "Show
   *  me the quieter month". `E4Shell` waits for L to FINISH speaking first, so
   *  two caption bands never fight over the same strip of the visor. */
  begin(): void {
    if (this.stage !== 'idle') return;
    this.enterStage('m1');
  }

  // ── the clock ────────────────────────────────────────────────────────────
  update(dt: number): void {
    if (this.stage === 'idle' || this.stage === 'done' || this.stage === 'held') return;
    this.stageT += dt;

    if (this.stage === 'glitch' || this.stage === 'cyclorama' || this.stage === 'panels') {
      this.finaleClock();
      return;
    }

    // the caption is already on screen; the clip follows it, never the reverse
    if (this.cur) {
      const before = this.lineT;
      this.lineT += dt;
      if (!this.spoke && before < CAPTION_LEAD && this.lineT >= CAPTION_LEAD) this.speak(this.cur);
      // ⚑ S102 — THE CAPTION WAITS FOR THE VOICE. Every `hold` in
      //   s4_offers.json was authored against silence; measured against the
      //   rendered batch, several of these lines run longer than the hold
      //   written for them, so without this the beat advanced mid-word and the
      //   next clip started over the top of the one still playing. The dwell is
      //   the longer of the authored reading time and the clip's own length.
      //   Same rule, same tail and same reasons as `lVoice.ts`.
      if (this.lineT >= Math.max(this.cur.hold, this.clipDwell)) this.nextLine();
    } else if (this.queue.length > 0) {
      this.nextLine();
    }

    this.beatProgress();

    if (this.waiting) return;              // ⚑ a beat with chips waits forever
    // ⚑ THE CAREFUL PAUSE is the one beat that does not run on a clock: once its
    // lines have run it opens its chips and waits, for as long as the player
    // wants, with no timer of any kind (the file header, law 6).
    if (this.stage === 'pause') { this.settlePause(); return; }
    const span = BEAT_SECONDS[this.stage as keyof typeof BEAT_SECONDS] ?? 0;
    // a beat never hands on mid-sentence, however long the sentence ran
    if (this.stageT >= span && !this.cur && this.queue.length === 0) this.advanceStage();
  }

  /** the pause's chip window: opened when its lines run out, closed by a press,
   *  and the press's reply is what actually hands the beat on. */
  private settlePause(): void {
    if (this.cur || this.queue.length > 0) return;
    if (this.pendingAdvance) { this.pendingAdvance = false; this.advanceStage(); return; }
    this.waiting = true;
    this.version++;
  }

  private nextLine(): void {
    this.cur = this.queue.shift() ?? null;
    this.lineT = 0;
    this.spoke = false;
    this.clipDwell = 0;
    this.version++;
  }

  /** the parts of a beat that keep moving while its lines are still running */
  private beatProgress(): void {
    if (this.stage === 'wall') {
      const up = Math.min(script.wall.cards.length, Math.floor(this.stageT / WALL_GAP) + 1);
      if (up !== this.wallUp) { this.wallUp = up; this.version++; }
      return;
    }
    if (this.stage !== 'curation') return;

    const total = script.curation.card.excerpts.length;
    const n = Math.max(0, Math.min(total, Math.floor((this.stageT - CUR.excerpt0) / CUR.excerptGap) + 1));
    if (n !== this.excerpts) { this.excerpts = n; this.version++; }

    if (!this.counterShown && this.stageT >= CUR.counter) {
      this.counterShown = true;
      this.version++;
    }
    // ⚑ and the system takes it away, kindly, without being asked
    if (!this.afterSaid && this.stageT >= CUR.after) {
      this.afterSaid = true;
      this.queue.push(script.curation.lineAfter as unknown as OLine);
      if (!this.cur) this.nextLine();
    }
    if (this.stageT >= CUR.fade && this.counterFade > 0) {
      const steps = Math.floor((this.stageT - CUR.fade) / CUR.fadeStep);
      const k = Math.max(0, 1 - steps / 4);
      if (k !== this.counterFade) {
        this.counterFade = k;
        this.version++;
        if (k <= 0) this.file('curation_out', 'withdrawn', script.curation.witness.withdrawn);
      }
    }
  }

  // ── the stages ───────────────────────────────────────────────────────────
  private enterStage(s: Stage): void {
    this.stage = s;
    this.stageT = 0;
    this.lineT = 0;
    this.cur = null;
    this.spoke = false;
    this.waiting = false;
    this.queue = [];
    this.version++;
    switch (s) {
      case 'm1': this.queue = [...MEMS[0].lines]; break;
      case 'm2': this.queue = [...MEMS[1].lines]; break;
      case 'ballshots': this.queue = [...AFTER_BALL.lines]; break;
      case 'wall': this.queue = [...(script.wall.lines as unknown as OLine[])]; break;
      case 'curation':
        this.queue = [...(script.curation.lines as unknown as OLine[])];
        this.excerpts = 0;
        this.counterShown = false;
        this.counterFade = 1;
        this.afterSaid = false;
        this.file('curation_in', 'surfaced', script.curation.witness.selected);
        break;
      case 'pause': this.queue = [...(script.pause.lines as unknown as OLine[])]; break;
      default: break;
    }
    if (this.queue.length > 0) this.nextLine();
  }

  private advanceStage(): void {
    switch (this.stage) {
      case 'm1':
        // ⚑ if she never touched it, the SYSTEM's own act is what files. Witness
        // symmetry does not only run toward the player (Ethics #10).
        if (!this.undone[0]) this.file(MEMS[0].id, 'surfaced', MEMS[0].witness);
        this.enterStage('m2');
        return;
      case 'm2':
        if (!this.undone[1]) this.file(MEMS[1].id, 'surfaced', MEMS[1].witness);
        this.enterStage('wall');
        return;
      case 'wall':
        this.file('wall', 'surfaced', script.wall.witness);
        this.enterStage('curation');
        return;
      case 'curation':
        this.file('curation_out', 'withdrawn', script.curation.witness.withdrawn);
        this.enterStage('pause');
        return;
      case 'pause':
        this.takeTheBreak();
        return;
      case 'ballshots':
        // ⚑ AND IT FILES NOTHING. Every other case in this switch files the
        // system's own act when she did not respond to it — that is the witness
        // symmetry Ethics #10 asks for. This one does not, and the omission is
        // the beat: `s4_ball.json`'s witness block states that the ball is the
        // one thing in thirty years that enters no record, and a LOGGED FAILURE
        // to process it would still be a record of the evening. Do not add a
        // `this.file(...)` here without reading that block first.
        this.enterStage('glitch');
        return;
      default:
        return;
    }
  }

  /**
   * ⚑ THE BREAK — S79's seam, and the whole of what this session builds of it.
   * If nothing has registered for it, the finale follows straight on, so the era
   * is playable end to end today and gains the ball without a rewrite.
   */
  private takeTheBreak(): void {
    if (this.onBreak?.() === true) { this.stage = 'held'; this.version++; return; }
    this.enterStage('glitch');
  }

  /** S79 calls this when the ball is over. */
  resumeAfterBreak(): void {
    if (this.stage !== 'held') return;
    // ⚑ S119 — L COMES BACK, AND THE FIRST THING IT DOES IS FAIL. The ball is
    // the only stretch of the era without its voice; this is the voice
    // returning to material it cannot process. Then the finale, unchanged.
    this.enterStage('ballshots');
  }

  private finaleClock(): void {
    const span = this.stage === 'glitch' ? GLITCH_SECONDS
      : this.stage === 'cyclorama' ? CYC_SECONDS : PANEL_SECONDS + PANEL_HOLD;
    const step = Math.floor((Math.min(this.stageT, span) / span) * FINALE_STEPS);
    if (step !== this.finaleStep) { this.finaleStep = step; this.version++; }
    if (this.stageT < span) return;
    if (this.stage === 'glitch') { this.finaleStep = 0; this.enterStage('cyclorama'); return; }
    if (this.stage === 'cyclorama') { this.finaleStep = 0; this.enterStage('panels'); return; }
    // ⚑ AND THE ERA HANDS OVER RATHER THAN FINISHING. `E4Shell.handOff()` is
    // what releases the spine; nothing here says a word about what comes next,
    // because the Close is not this session's to spend.
    this.file('finale', 'handed', script.finale.witness);
    this.stage = 'done';
    this.version++;
    this.onHandOff?.();
  }

  // ── the voice ────────────────────────────────────────────────────────────
  /** the clip in the air, and how long this line needs for it — see `speak` */
  private clip: HTMLAudioElement | null = null;
  private clipDwell = 0;

  private speak(l: OLine): void {
    this.spoke = true;
    this.clipDwell = 0;
    this.clip?.pause();   // whatever was still playing belongs to the last line
    this.clip = null;
    if (!l.audio || !l.text) return;
    const a = playOnce(l.audio);
    if (!a) return;
    this.clip = a;
    const measure = (): void => {
      if (this.clip !== a) return;
      if (Number.isFinite(a.duration)) this.clipDwell = CAPTION_LEAD + a.duration + CLIP_TAIL;
    };
    if (a.readyState >= 1) measure();
    else a.addEventListener('loadedmetadata', measure, { once: true });
  }

  private file(id: string, outcome: LedgerOutcome, witness: string): void {
    const key = `${id}:${outcome}`;
    if (this.filed.has(key)) return;
    this.filed.add(key);
    ledger.e4Offers.push({ id, outcome, witness });
  }

  // ── the surface ──────────────────────────────────────────────────────────
  draw(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.hits = [];
    if (this.stage === 'idle') return;

    if (this.stage === 'glitch') { glitchBands(ctx, W, H, this.finaleStep / FINALE_STEPS); return; }
    if (this.stage === 'cyclorama') { cyclorama(ctx, W, H, this.finaleStep / FINALE_STEPS); return; }
    if (this.stage === 'panels' || this.stage === 'done') {
      cyclorama(ctx, W, H, 1);
      const raw = this.stage === 'done' ? 1
        : (this.finaleStep / FINALE_STEPS) * ((PANEL_SECONDS + PANEL_HOLD) / PANEL_SECONDS);
      eraPanels(ctx, W, H, Math.min(1, raw), script.finale.years);
      return;
    }

    // ⚑ the wall stays up. Nobody takes it down: it was put there for her, and
    // it is the room she is in for the rest of the era. The curated clip is the
    // one thing that replaces it while it plays — a feed shows you one thing at
    // a time — and the wall is back underneath the careful pause.
    if (this.wallUp > 0 && this.stage !== 'curation') this.drawWall(ctx, W);
    if (this.stage === 'm1' || this.stage === 'm2') this.drawMemory(ctx);
    if (this.stage === 'ballshots') this.drawBallShot(ctx);
    if (this.stage === 'curation') this.drawCuration(ctx);

    // ⚑ S119 — THE SAME FILE L'S OWN SURFACE SHOWS, and it must be the same or
    // it is worse than nothing: it reads `ledger.l` + `ledger.e4Offers` through
    // the one selector, so the strip cannot drift from what was actually filed.
    //
    // ⚑ WHY ONLY THESE THREE STAGES. `wall` and `curation` fill the screen —
    // four 120 px cards across a 512 px canvas, and a media card at 20..326 —
    // and this file's own note says why that is right: *a feed shows you one
    // thing at a time.* The machine's notes are not on screen while it is
    // selling. The three stages that keep it are the three where something is
    // being FILED ABOUT HER and she is looking straight at it.
    if (this.stage === 'm1' || this.stage === 'm2' || this.stage === 'ballshots') {
      filingStrip(ctx, FILED.x, FILED.y, FILED.w, FILED_HEADING, e4Filings(FILED.rows));
    } else if (this.stage === 'pause') {
      filingStrip(ctx, FILED.x, FILED.pauseY, FILED.w, FILED_HEADING, e4Filings(FILED.pauseRows));
    }

    const rows = this.captionRows(ctx);
    if (rows.length > 0) captionBand(ctx, W, H, script.speaker, rows);
    const bandH = rows.length > 0 ? 16 + rows.length * 14 + 8 : 0;
    const bandTop = rows.length > 0 ? H - bandH - 10 : H - 10;

    if (this.stage === 'pause' && this.waiting) this.drawChips(ctx, bandTop);
  }

  private captionRows(ctx: CanvasRenderingContext2D): string[] {
    if (!this.cur || !this.cur.text) return [];
    setFont(ctx, 11);
    return wrapText(ctx, this.cur.text, CAPTION_WRAP).slice(0, CAPTION_MAX_ROWS);
  }

  /**
   * ⚑ THE MEMORY. Nothing here announces the enhancement; the only way to find
   * it is the small grey line under the picture, which is exactly where such a
   * line always is, in exactly the type it is always set in.
   */
  private drawMemory(ctx: CanvasRenderingContext2D): void {
    const i = this.stage === 'm1' ? 0 : 1;
    const s = script.memories;
    // ⚑ S119 — three labels, not two. Before she has ever pressed it the line
    // is the one every photo product in the world puts there (`See original`).
    // Once she has, it becomes a plain two-way toggle, and the way BACK names
    // what the system is holding: `See the version we kept`.
    const label = !this.undone[i] ? s.original : this.enhanced[i] ? s.original : s.kept;
    const r = memoryCard(ctx, MEM.x, MEM.y, MEM.w, i === 0 ? s.title : s.titleTwo, label, this.enhanced[i], i);
    // ⚑ AND IT IS ALWAYS PRESSABLE NOW. It used to disappear the moment it was
    // used, which made the one act in this beat a thing you could spend but not
    // hold. The flip costs nothing, is never refused, and never changes what is
    // filed — she can look at her own photograph for as long as she likes and
    // it is still not the one the system keeps.
    this.hits.push({ ...r, id: `undo${i}` });
  }

  /**
   * ⚑ THE BALL'S PHOTOGRAPH (S119). Same card, same geometry, same small grey
   * line in the same place as her own two memories — because the whole beat
   * depends on it being the SAME GESTURE. A player who has flipped her window
   * portrait back and forth four times reaches for this one out of habit.
   *
   * `memoryCard` is not reused: it hard-codes `photograph(..., enhanced,
   * variant)` for the memories' own two variants and returns their control
   * rect. This draws variant 2 and its own control line, and the label is the
   * one thing that ever changes.
   */
  private drawBallShot(ctx: CanvasRenderingContext2D): void {
    const pad = 12;
    const pw = MEM.w - pad * 2;
    const ph = Math.round(pw * 0.62);
    const h = pad + 14 + ph + 10 + 12 + pad - 6;
    const x = MEM.x, y = MEM.y;
    px(ctx, x, y, MEM.w, h, WALL.card);
    px(ctx, x, y, MEM.w, 1, WALL.cardHi);
    px(ctx, x, y + h - 1, MEM.w, 1, WALL.cardEdge);
    px(ctx, x, y, 1, h, WALL.cardEdge);
    px(ctx, x + MEM.w - 1, y, 1, h, WALL.cardEdge);

    setFont(ctx, 9);
    ctx.fillStyle = WALL.meta;
    ctx.fillText(AFTER_BALL.title, x + pad, y + pad - 3);

    // ⚑ the flag is passed and the picture ignores it. Both calls are identical
    // on purpose: there is no "before" here for the system to have improved on.
    photograph(ctx, x + pad, y + pad + 12, pw, ph, !this.ballShotPressed, 2);

    const label = this.ballShotPressed ? AFTER_BALL.unavailable : AFTER_BALL.control;
    const cy = y + pad + 12 + ph + 8;
    setFont(ctx, 9);
    // ⚑ and it is set in the DIMMEST type on the card either way. The failure is
    // not a warning, not an error and not coloured — it is the machine being
    // unremarkable about the one thing in thirty years it could not process.
    ctx.fillStyle = WALL.fine;
    ctx.fillText(label, x + pad, cy);
    if (!this.ballShotPressed) {
      const cw = Math.ceil(ctx.measureText(label).width);
      this.hits.push({ x: x + pad - 4, y: cy - 4, w: cw + 8, h: 16, id: 'ballshot' });
    }
  }

  private drawWall(ctx: CanvasRenderingContext2D, W: number): void {
    const cards = script.wall.cards;
    const total = cards.length * CARD.w + (cards.length - 1) * CARD.gap;
    const x0 = Math.round((W - total) / 2);
    setFont(ctx, 8);
    ctx.fillStyle = WALL.fine;
    ctx.fillText(script.wall.heading, x0, CARD.y - 11);
    cards.slice(0, this.wallUp).forEach((c, i) => {
      setFont(ctx, 9);
      const rows = wrapText(ctx, c.body, CARD.w - 20).slice(0, 4);
      offerCard(ctx, x0 + i * (CARD.w + CARD.gap), CARD.y, CARD.w, CARD.h, c, rows);
    });
  }

  private drawCuration(ctx: CanvasRenderingContext2D): void {
    const c = script.curation;
    setFont(ctx, 10);
    const rows: string[] = [];
    c.card.excerpts.slice(0, this.excerpts).forEach(e => {
      rows.push(...wrapText(ctx, e, MEDIA.w - 20).slice(0, 2));
    });
    // ⚑ six rows, because all THREE excerpts have to fit: the third is the
    // softening one, and a campaign quoted without its softening line is a
    // campaign the piece has edited into something harsher than it is.
    mediaCard(ctx, MEDIA.x, MEDIA.y, MEDIA.w, MEDIA.h, c.card.mark, c.card.meta, c.card.runtime, rows.slice(0, 6));
    if (!this.counterShown) return;
    setFont(ctx, 10);
    const crows = wrapText(ctx, c.counter.line, COUNTER.w - 20).slice(0, 2);
    counterCard(ctx, COUNTER.x, COUNTER.y, COUNTER.w, COUNTER.h,
      c.counter.meta, crows, c.counter.removed, this.counterFade);
  }

  private drawChips(ctx: CanvasRenderingContext2D, bandTop: number): void {
    let y = bandTop - 10 - PAUSE_CHIPS.length * (CHIP.h + CHIP.gap);
    for (const c of PAUSE_CHIPS) {
      chip(ctx, CHIP.x, y, CHIP.w, CHIP.h, c.label, { live: c.gone !== true });
      if (c.gone !== true) this.hits.push({ x: CHIP.x, y, w: CHIP.w, h: CHIP.h, id: c.id });
      y += CHIP.h + CHIP.gap;
    }
  }

  // ── the presses (two of the era's three) ─────────────────────────────────
  handleClick(x: number, y: number): boolean {
    const hit = this.hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (!hit) return false;
    if (hit.id === 'undo0') { this.flip(0); return true; }
    if (hit.id === 'undo1') { this.flip(1); return true; }
    // ⚑ the ball's photograph takes the press and does nothing with it — see
    // `ballShotPressed`. It is not a refusal and it is not a bug.
    if (hit.id === 'ballshot') { this.pressBallShot(); return true; }
    const c = PAUSE_CHIPS.find(k => k.id === hit.id);
    if (!c || c.gone === true) return false;
    this.pressChip(c);
    return true;
  }

  /**
   * ⚑ THE UNDO WORKS. It has worked since 1997 and it works here: the picture
   * goes back to hers, the record says she asked, and nothing argues. And the
   * next memory is already enhanced — the act always works, and it never once
   * changes what the system will do next.
   */
  /**
   * ⚑ THE PRESS THAT DOES NOTHING, AND IT IS NOT A BUG.
   *
   * She presses the same small grey line that worked twice on her own
   * photographs. The picture does not change, because `photograph()`'s
   * variant 2 does not read `enhanced` at all — there is no branch anywhere
   * that says "refuse". The pass simply has nothing to take hold of.
   *
   * The only thing that moves is the control's own label, which stops offering
   * and starts reporting: `no enhancement available`. Bland, in the machine's
   * flattest register, exactly as §2 specified. **L does not speak here** —
   * a line would be the piece explaining its own best beat.
   */
  private pressBallShot(): void {
    if (this.ballShotPressed) return;
    this.ballShotPressed = true;
    this.version++;
  }

  private flip(i: number): void {
    // ⚑ S119 — EVERY PRESS AFTER THE FIRST IS FREE, AND FILES NOTHING.
    // The first one is the ACT: the picture goes back to hers, the record says
    // she asked, and L answers. Every press after it is a person looking at
    // their own photograph twice, which is not a decision and must not be
    // recorded as one — filing it would make the strip say she withdrew the
    // enhancement nine times, which is a lie about what she did.
    if (this.undone[i]) { this.enhanced[i] = !this.enhanced[i]; this.version++; return; }
    this.enhanced[i] = false;
    this.undone[i] = true;
    this.file(MEMS[i].id, 'undone', MEMS[i].undo.witness);
    // the apology takes the caption straight away — it is an answer, not a queue
    this.queue.unshift(MEMS[i].undo.reply);
    this.nextLine();
  }

  private pressChip(c: OChip): void {
    // every answer is accepted, filed, and reinterpreted — register, never
    // branch (master plan §5b). A chip changes what the record says about her
    // and nothing else about where the conversation goes.
    if (c.witness) {
      ledger.e4Offers.push({ id: c.id, outcome: (c.outcome ?? 'answered') as LedgerOutcome, witness: c.witness });
    }
    for (const f of c.alsoFiles ?? []) {
      ledger.e4Offers.push({ id: c.id, outcome: f.outcome as LedgerOutcome, witness: f.witness });
    }
    this.waiting = false;
    if (c.reply) {
      this.queue.unshift(c.reply);
      this.nextLine();
      // ⚑ BOTH live chips advance the beat. See the file header, law 6.
      this.pendingAdvance = true;
      return;
    }
    this.advanceStage();
  }

  private pendingAdvance = false;

  // ── review (?debug=1) ────────────────────────────────────────────────────
  /**
   * Land on a beat directly. Review only — in play the whole sequence runs
   * forward from L's last chip by ordinary clicking, and nothing here is
   * reachable. C6: every beat gets a panel button, because three sessions have
   * now shipped beats the project lead could not reach and concluded content was
   * missing when it wasn't.
   */
  debugJumpTo(stage: string): void {
    const s = stage as Stage;
    if (s === 'held' || s === 'idle') return;
    this.wallUp = s === 'curation' || s === 'pause' ? script.wall.cards.length : 0;
    this.finaleStep = 0;
    this.pendingAdvance = false;
    this.enhanced = [true, true];
    this.undone = [false, false];
    this.ballShotPressed = false;
    this.enterStage(s);
  }

  /**
   * ⚑ S79 review helper: park at the BREAK, the state the offers are actually
   * in for the whole three minutes the ball runs. `debugJumpTo` refuses `held`
   * on purpose (it is not a beat you can land on and play forward), but the
   * ball's own review jumps need it, because the ball hands back by calling
   * `resumeAfterBreak()` and only a held beat can be resumed.
   */
  debugHoldForBreak(): void {
    this.wallUp = script.wall.cards.length;
    this.queue = [];
    this.cur = null;
    this.waiting = false;
    this.pendingAdvance = false;
    this.stage = 'held';
    this.version++;
  }

  /** review: skip the careful pause's lines and sit on its chips */
  debugToChips(): void {
    if (this.stage !== 'pause') this.debugJumpTo('pause');
    this.queue = [];
    this.cur = null;
    this.waiting = true;
    this.version++;
  }

  /** review: the A/B the acceptance criterion asks for — the enhanced photo
   *  beside its original, on the same card, without waiting for a press. */
  debugToggleEnhanced(): void {
    const i = this.stage === 'm2' ? 1 : 0;
    this.enhanced[i] = !this.enhanced[i];
    this.version++;
  }
}
