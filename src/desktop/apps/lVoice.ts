/**
 * ⚑ L — Era 4's voice (S77, Stage 2b).
 * Lines: `data/dialog/s4_l.json`. Design of record:
 * `docs/REINTERP_E4_AUDIO_FIRST_DESIGN_2026-07-12.md` §2 (the conversation
 * mechanic) and `docs/REINTERP_E4_THE_ARGUMENT_2026-08-05.md` §4.1–4.3.
 *
 * Three eras had a thing you opened. This era has a thing that is already
 * talking — the application layer is gone and the OS is the assistant
 * (Lamby → Lambient → **L**, the dispersal finishing as a file designation).
 * So this module holds no window, no title bar and no close box: it draws a
 * caption band, some chips, and one label field, over the picture of a room
 * that `apps/space.ts` is already drawing.
 *
 * ⚑ FOUR LAWS THIS FILE EXISTS TO KEEP:
 *
 *  1. **L MUST SOUND GOOD** (ARGUMENT §4.1). A voice that reads as sinister
 *     lets the real thing off the hook — the player concludes *I would notice*,
 *     and they would not. Every line in the data is warm, competent, unhurried
 *     and genuinely pleasant, and nothing in this file adds a sting to it: no
 *     shake, no red, no alarm colour, no sound cue, no delay for effect. The
 *     mint that `theme/era4.ts` draws it in is the same decision.
 *  2. **⚑ SUBTITLES ON EVERY SPOKEN LINE, AND THE CAPTION GOES FIRST**
 *     (§4.2). Accessibility, straightforwardly — and safety, which matters more
 *     here than anywhere else in the piece: a caption read half a second before
 *     the audio lands is the only warning an audio beat can give. See
 *     `CAPTION_LEAD`: the band is drawn the instant a line begins and the clip
 *     is asked for afterwards, never the other way round.
 *  3. **⚑ THE TOUCHLESS BUDGET IS A RULE** (`REINTERP_E4_THE_DEVICE`, Stage 0
 *     §5): if a beat can advance itself, it does. Lines advance on their own
 *     `hold`; the ONLY press this module takes is a chip, which is not
 *     navigation — it is being talked to. There is no continue, no confirm, no
 *     menu, no skip, and no timer anywhere: a unit with chips waits forever.
 *  4. **THE SHRINKING CHOICE IS NEVER ANNOUNCED** (§2). A foreclosed chip is
 *     drawn, greyed and unpressable, and nothing anywhere remarks on it. The
 *     narrowing is only legible in retrospect if what is no longer offered
 *     stays on screen.
 *
 * REGISTER: `operable` throughout, and ⚑ there is NO `felt` beat here — which
 * is the only way check-spec's C2 can be kept while an assistant speaks at all:
 * a `felt` beat is a beat L is ABSENT from. When S78/S79 build one, L does not
 * enter it.
 *
 * ⚑ NO LINE IS VOICED. `playOnce` is wired and every line names a file, but no
 * clip has been rendered: audio comes after Sérgio's voice pass, in one batch
 * (`data/audio/tts_manifest.json`'s `l_era4_voice`). Until then the audio
 * registry's own law (`src/audio/tapeAudio.ts`) means an unregistered name is
 * never requested — no console error, no 404, silent captions.
 */
import { captionBand, chip, labelField } from '../theme/era4';
import { setFont, wrapText } from '../theme/chrome';
import { ledger } from '../../state/ledger';
import { playOnce } from '../../audio/tapeAudio';
import script from '../../../data/dialog/s4_l.json';

/** ⚑ the caption's head start on the clip, in seconds (ARGUMENT §4.2). The one
 *  number in this file that is a safety measure rather than a pacing choice. */
const CAPTION_LEAD = 0.5;
/** the beat of quiet between one unit finishing and the next beginning. L fills
 *  quiet — that is what it does — so this is short on purpose. */
const UNIT_GAP = 1.2;
/** how long a chip's own reply sits before the conversation moves on, on top of
 *  the reply line's authored `hold`. */
const REPLY_TAIL = 0.4;

const CAPTION_WRAP = 458;   // inside captionBand's 22 px left inset at font 11
const CAPTION_MAX_ROWS = 4;
const LABEL = { x: 262, y: 44, w: 234 } as const;
const CHIP = { x: 16, w: 306, h: 19, gap: 4 } as const;

interface LLabel { object: string; text: string; uncertain?: boolean; witness?: string }
interface LLine {
  id: string;
  text: string;
  /** ⚑ the caption used when the frame's unvoiced opt-out is on: it still shows
   *  that the system used a name Maya does not use, and the audio does not say
   *  it. See `caption()` and `speak()` below. */
  textUnvoiced?: string;
  audio?: string;
  hold: number;
  label?: LLabel;
  deadname?: boolean;
}
interface LFiling { outcome: string; witness: string }
interface LChip {
  id: string;
  label: string;
  outcome?: string;
  witness?: string;
  /** foreclosed: drawn, greyed, never pressable, never removed */
  gone?: boolean;
  /** what the record files UNDERNEATH the answer — the retention that the
   *  apology never changes (`legacy record consistency — retained`) */
  alsoFiles?: LFiling[];
  reply?: LLine;
  /** the unit stays open after the reply (the correction, said again) */
  stays?: boolean;
  /** ⚑ S78's seam: this chip ends S77's thread and hands the era on */
  handOff?: boolean;
}
interface LUnit { id: string; lines: LLine[]; chips?: LChip[] }

const UNITS = script.units as unknown as LUnit[];

type Phase = 'speaking' | 'waiting' | 'replying' | 'gap' | 'done';
interface Hit { x: number; y: number; w: number; h: number; id: string }

export class LVoice {
  /** bumped on every change to what this surface DRAWS. `E4Shell` folds it into
   *  its own version so the room re-uploads the visor texture only then. */
  version = 0;
  /** ⚑ S78's seam, and the only way out of this module: the last chip of the
   *  last unit fires it. S77 deliberately does not resolve the conversation —
   *  E4 sets the Close up and must not spend it. */
  onHandOff?: () => void;

  private unit = 0;
  private line = 0;
  private t = 0;
  private phase: Phase = 'speaking';
  private spoke = false;
  private reply: LLine | null = null;
  private label: LLabel | null = null;
  private hits: Hit[] = [];
  private started = false;
  /** ids already filed, so a `stays` chip pressed twice does not double-file a
   *  label's catalogue line (the answers themselves DO file every time — saying
   *  it again is an act, and the record never leaves an act silent). */
  private labelsFiled = new Set<string>();

  /** L begins a moment after the device goes on: no greeting screen, no
   *  onboarding, no "let's get started". You put it on and it is already there. */
  begin(): void {
    if (this.started) return;
    this.started = true;
    this.t = 0;
    this.phase = 'speaking';
    this.enterLine();
  }

  get live(): boolean { return this.started; }
  get unitId(): string { return UNITS[this.unit]?.id ?? ''; }
  /**
   * ⚑ S78 needs this and S77 did not have it. `onHandOff` fires the INSTANT the
   * last chip is pressed — before its reply has been spoken — because the seam
   * is the press, not the silence after it. But the offers draw their own
   * caption band on the same strip of the visor, so starting them on the press
   * would put two speakers on screen at once. `E4Shell` waits for this instead.
   */
  get finished(): boolean { return this.phase === 'done'; }

  // ── the clock ────────────────────────────────────────────────────────────
  update(dt: number): void {
    if (!this.started || this.phase === 'done' || this.phase === 'waiting') return;
    const before = this.t;
    this.t += dt;
    // ⚑ the beat of quiet between units, run on the app's own clock like
    // everything else here — never a wall timer, so Esc/pause stops it dead and
    // a paused conversation cannot advance behind the menu.
    if (this.phase === 'gap') {
      if (this.t >= UNIT_GAP) this.nextUnit();
      return;
    }
    const cur = this.phase === 'replying' ? this.reply : this.current;
    if (!cur) return;
    // ⚑ the caption is already on screen; the clip follows it. Never the other
    // way round, and never in the same frame.
    if (!this.spoke && before < CAPTION_LEAD && this.t >= CAPTION_LEAD) this.speak(cur);
    const dwell = cur.hold + (this.phase === 'replying' ? REPLY_TAIL : 0);
    if (this.t < dwell) return;
    if (this.phase === 'replying') { this.afterReply(); return; }
    this.advanceLine();
  }

  private get current(): LLine | null {
    return UNITS[this.unit]?.lines[this.line] ?? null;
  }

  private enterLine(): void {
    this.t = 0;
    this.spoke = false;
    const cur = this.current;
    if (cur?.label) {
      this.label = cur.label;
      if (cur.label.witness && !this.labelsFiled.has(cur.id)) {
        this.labelsFiled.add(cur.id);
        // ⚑ the system's own act, filed in the system's own register: it
        // catalogued her things and nobody asked it to. Witness symmetry does
        // not only run toward the player.
        ledger.l.push({ id: cur.id, outcome: 'captioned', witness: cur.label.witness });
      }
    }
    this.version++;
  }

  private advanceLine(): void {
    const unit = UNITS[this.unit];
    if (!unit) { this.phase = 'done'; return; }
    if (this.line + 1 < unit.lines.length) {
      this.line++;
      this.enterLine();
      return;
    }
    if (unit.chips && unit.chips.length > 0) {
      this.phase = 'waiting';
      this.t = 0;
      this.version++;
      return;
    }
    this.nextUnit();
  }

  private nextUnit(): void {
    if (this.unit + 1 >= UNITS.length) { this.phase = 'done'; this.version++; return; }
    this.unit++;
    this.line = 0;
    this.label = null;   // a new subject clears the last thing it labelled
    this.phase = 'speaking';
    this.enterLine();
  }

  private afterReply(): void {
    this.reply = null;
    if (this.holdOpen) { this.holdOpen = false; this.phase = 'waiting'; this.t = 0; this.version++; return; }
    this.phase = 'gap';
    this.t = 0;
    this.version++;
  }

  private holdOpen = false;

  // ── the voice ────────────────────────────────────────────────────────────
  /**
   * ⚑ THE UNVOICED OPT-OUT, honoured here and nowhere else in the audio path.
   * With it on, a line flagged `deadname` is NOT spoken — the caption still
   * shows that the system used a name Maya does not use (see `caption()`), so
   * the beat survives and the ambush does not. The opt-out lives in the GAME
   * MENU, never in the fiction: an opt-out the system grants you is not an
   * opt-out (08 §8 decision 10, Sérgio).
   */
  private speak(l: LLine): void {
    this.spoke = true;
    if (!l.audio || !l.text) return;
    if (l.deadname && ledger.view.unvoicedName) return;
    playOnce(l.audio);
  }

  /**
   * The caption text for a line: the unvoiced variant when the opt-out is on,
   * and `{name}` resolved from `ledger.name` — the ONE place the name comes
   * from. This branch prefills it at the opening ("we filled this in for you"),
   * so the record is holding the name it assigned thirty years ago and the
   * player never gambled anything to get here.
   */
  private caption(l: LLine): string {
    const raw = l.deadname && ledger.view.unvoicedName && l.textUnvoiced ? l.textUnvoiced : l.text;
    return raw.replace('{name}', ledger.name);
  }

  // ── the surface ──────────────────────────────────────────────────────────
  draw(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.hits = [];
    if (!this.started) return;

    if (this.label) {
      labelField(ctx, LABEL.x, LABEL.y, LABEL.w, this.label.object, this.label.text, this.label.uncertain === true);
    }

    // ⚑ THE CAPTION STAYS UP WHILE THE CHIPS DO. Found by looking at it: the
    // band used to clear the moment a unit started waiting, so the player was
    // answering a question that was no longer on screen — which breaks the one
    // thing the captions are FOR (§4.2: they are the era's witness surface, and
    // a caption you cannot re-read is not one). The `gap` between units draws
    // nothing, because that beat is the quiet.
    const shown = this.phase === 'replying'
      ? this.reply
      : (this.phase === 'gap' || this.phase === 'done' ? null : this.current);
    // ⚑ an EMPTY line is a held silence with the label still up (u3's fourth
    // line — the instrument having run out and stopped). It draws no band at
    // all: silence in this era is a texture, not an absence, and a caption
    // saying "…" would be the piece narrating it.
    let rows: string[] = [];
    if (shown && shown.text) {
      setFont(ctx, 11);
      rows = wrapText(ctx, this.caption(shown), CAPTION_WRAP).slice(0, CAPTION_MAX_ROWS);
      captionBand(ctx, W, H, script.speaker, rows);
    }
    const bandH = rows.length > 0 ? 16 + rows.length * 14 + 8 : 0;
    const bandTop = rows.length > 0 ? H - bandH - 10 : H - 10;

    if (this.phase !== 'waiting') return;
    const chips = UNITS[this.unit]?.chips ?? [];
    let y = bandTop - 10 - chips.length * (CHIP.h + CHIP.gap);
    for (const c of chips) {
      chip(ctx, CHIP.x, y, CHIP.w, CHIP.h, c.label, { live: c.gone !== true });
      if (c.gone !== true) this.hits.push({ x: CHIP.x, y, w: CHIP.w, h: CHIP.h, id: c.id });
      y += CHIP.h + CHIP.gap;
    }
  }

  /** the era's one press. Returns true if a chip took it. */
  handleClick(x: number, y: number): boolean {
    if (!this.started || this.phase !== 'waiting') return false;
    const hit = this.hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (!hit) return false;
    const c = (UNITS[this.unit]?.chips ?? []).find(k => k.id === hit.id);
    if (!c || c.gone === true) return false;
    this.press(c);
    return true;
  }

  private press(c: LChip): void {
    // every answer is accepted, filed, and reinterpreted — register, never
    // branch (master plan §5b). A chip changes what the record says about her
    // and nothing else about where the conversation goes.
    if (c.witness) {
      ledger.l.push({ id: c.id, outcome: (c.outcome ?? 'answered') as LedgerOutcome, witness: c.witness });
    }
    for (const f of c.alsoFiles ?? []) {
      ledger.l.push({ id: c.id, outcome: f.outcome as LedgerOutcome, witness: f.witness });
    }
    if (c.handOff) this.onHandOff?.();
    this.holdOpen = c.stays === true;
    if (c.reply) {
      this.reply = c.reply;
      this.phase = 'replying';
      this.t = 0;
      this.spoke = false;
      this.version++;
      return;
    }
    this.afterReply();
  }

  // ── review (?debug=1) ────────────────────────────────────────────────────
  /**
   * Land on a unit by id, with the record filed as if the units before it had
   * played. Review only — in play the conversation runs forward by ordinary
   * clicking from the moment the device goes on. C6: every beat here has a
   * panel button, because three previous sessions shipped beats Sérgio could
   * not reach and concluded content was missing when it wasn't.
   */
  debugJumpTo(unitId: string): void {
    const i = UNITS.findIndex(u => u.id === unitId);
    if (i < 0) return;
    this.started = true;
    this.unit = i;
    this.line = 0;
    this.reply = null;
    this.holdOpen = false;
    this.label = null;
    this.phase = 'speaking';
    this.enterLine();
  }

  /**
   * ⚑ S78 review helper: put the conversation where it is when the offers run —
   * finished. L has said its last line and the band is empty, which is the only
   * honest backdrop for reviewing an offers beat: in play L never speaks over
   * them, so a review jump must not either.
   */
  debugFinish(): void {
    this.started = true;
    this.unit = UNITS.length - 1;
    this.line = 0;
    this.reply = null;
    this.holdOpen = false;
    this.label = null;
    this.phase = 'done';
    this.version++;
  }

  /** review: skip the current unit's lines and sit on its chips */
  debugToChips(): void {
    const unit = UNITS[this.unit];
    if (!unit?.chips?.length) return;
    this.line = unit.lines.length - 1;
    this.phase = 'waiting';
    this.t = 0;
    this.version++;
  }
}

type LedgerOutcome = 'answered' | 'silent' | 'corrected' | 'captioned' | 'retained';
