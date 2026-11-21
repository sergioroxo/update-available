/**
 * ⚑ S412 (UiB job 33 Part A; T98) — THE DIRECTOR OF 2026: thirteen beats in three acts, one company, rising harshness
 * (docs/reinterp/STORYBOARD_2026_BEATS_v3_2026-11-21.md, with his answers in its §8).
 *
 * It owns the one screen (src/desktop/apps/lScreen.ts) and plays the acts on it as scripts: each beat is a generator that
 * yields what it waits for — a number of seconds, or a condition — so the story reads top to bottom in the act's own file and
 * **every beat starts because of the one before it, never on a clock alone** (a press, a line read, a thread closed, a tape
 * set down). The visitor's choices are real presses, and every one leads into the same trap.
 *
 *   · Act I · L (beats 1–4): src/desktop/apps/e4ActOne.ts (S412).
 *   · Act II · Second Thoughts (beats 5–8): src/desktop/apps/e4ActTwo.ts (S413). Act I's last press (✚ Add to L · Not now)
 *     leads straight into it (browser.ts `beginActs`); Act II's last line ("Booked ✓ · today.") hands over to the visit as it
 *     was after the screens (the headset and Shepherd Live™'s studio) until Part C's Act III exists.
 *   · Act III · Shepherd Live™ (beats 9–10): src/desktop/apps/e4ActThree.ts (S414). Act II's last line leads straight into it;
 *     its last line (Junie's "i know. come in.") hands over to the stream (browser.ts `beginActs` → space.ts). ⚑ ONE SHEPHERD
 *     SURFACE (`shepherd`, shepherd.ts), held here, drawn wherever her door put it: the monitor (the screen's `full`) or the
 *     headset's glass (space.ts).
 *   · The stream and the end (11–13): Part D (S415).
 *
 * The director never touches the room: the room reads the contract (src/narrative/e4Beats.ts), and the Lamby set is reached
 * through the two hooks app.ts gives it (`bringTv`, `tv`).
 */
import { LScreen, type Chip } from './lScreen';
import { ShepherdSession } from './shepherd';
import { readHold } from '../readHold';
import { ledger } from '../../state/ledger';
import { playOnce } from '../../audio/tapeAudio';

/** what a beat waits for: seconds, or a condition checked every frame */
export type Wait = number | (() => boolean);
export type Beat<R = void> = Generator<Wait, R, void>;
/** a line of the AI's: plain words, or words with a rendered clip (s4_acts.json: `text`, `audio`, `seconds`) */
export type Line = string | { text: string[]; audio?: string; seconds?: number };

/** what the room tells the director about the Lamby set (app.ts) */
export interface TvNow { holding: boolean; watching: boolean }

export class E4Acts {
  readonly screen = new LScreen();
  /** ⚑ S414 — Shepherd Live™'s one surface (Act III): on the monitor in the Join-here door, on the headset's glass in Join in VR */
  readonly shepherd = new ShepherdSession();
  private shSeen = -1;
  private shOnSeen = false;
  /** ⚑ S414 — the Join-in-VR door waits for the headset to be put on (the device glows; the guide's step is the headset's) */
  headsetWait = false;
  /** the visitor's last press the script has not taken yet */
  private pressed: string | null = null;
  private gen: Beat | null = null;
  private waitLeft = 0;
  private waitFor: (() => boolean) | null = null;
  /** seconds since the acts began (the probes' clock) */
  t = 0;
  /** seconds since the visitor last pressed anything on the screen (the stall guide's clock is its own) */
  idle = 0;
  /** the beat now, for the walker, the map and the guide ('' before the acts begin) */
  beat = '';
  /** the press the story waits on now (the stall guide's ring, its "Take me there") */
  path: string[] = [];
  /** a person's own words are on the glass (a thread, an email, an original): the guide and the AI are silent */
  feltNow = false;
  /** ⚑ S413 — something else has the floor (the film's own narrator, in beat 7): the guide waits, one voice at a time */
  floor = false;
  /** the acts are over: the seam has been passed (Act I's last press) */
  done = false;
  // ── the hooks the engine and the old browser give it ──
  /** bring the Lamby set off its shelf to the side of the screen (beat 3's link); false if it could not come */
  bringTv: (() => boolean) | null = null;
  tv: (() => TvNow) | null = null;
  /** ⚑ S413 — retired: Act I's last press leads into Act II directly (browser.ts `beginActs`); kept so the seam is legible */
  onSeam: ((choice: 'add' | 'notnow') => void) | null = null;
  /** presses a page handles itself (a story opened, the original turned): the act registers them */
  private handlers = new Map<string, (id: string) => boolean>();

  constructor() {
    this.screen.onPress = (id) => this.press(id);
  }

  get version(): number { return this.screen.version; }
  get running(): boolean { return !!this.gen; }

  /** begin a script (Act I from its first beat, or a review jump into a later one) */
  start(script: Beat): void {
    this.gen = script; this.waitLeft = 0; this.waitFor = null; this.done = false;
    this.step();
  }
  /** a page's own presses: return true when taken */
  handle(prefix: string, fn: (id: string) => boolean): void { this.handlers.set(prefix, fn); }

  update(dt: number): void {
    this.t += dt;
    this.idle += dt;
    this.screen.update(dt);
    // ⚑ S414 — the session moves on its own steps; the monitor follows it only when it is the monitor's (Join here), or when it
    //   comes or goes (in the headset the monitor carries one still card): dirty only
    const sh = this.shepherd;
    sh.update(dt);
    if (sh.version !== this.shSeen) {
      this.shSeen = sh.version;
      if ((sh.on && sh.door === 'here') || sh.on !== this.shOnSeen) this.screen.touch();
      this.shOnSeen = sh.on;
    }
    if (!this.gen) return;
    if (this.waitFor) { if (!this.waitFor()) return; this.waitFor = null; }
    else if (this.waitLeft > 0) { this.waitLeft -= dt; if (this.waitLeft > 0) return; }
    this.step();
  }
  private step(): void {
    while (this.gen) {
      const r = this.gen.next();
      if (r.done) { this.gen = null; return; }
      const w = r.value;
      if (typeof w === 'number') { if (w > 0) { this.waitLeft = w; return; } }
      else if (!w()) { this.waitFor = w; return; }
    }
  }

  /** a press on the screen (from LScreen.press) */
  press(id: string): void {
    this.idle = 0;
    for (const [prefix, fn] of this.handlers) if (id === prefix || id.startsWith(prefix)) { if (fn(id)) return; }
    this.pressed = id;
  }
  /** take the visitor's last press if it is one of `ids` */
  take(ids: string[]): string | null {
    const p = this.pressed;
    if (p && ids.includes(p)) { this.pressed = null; return p; }
    return null;
  }
  clearPress(): void { this.pressed = null; }

  // ── the script's verbs ───────────────────────────────────────────────────
  /** the AI says a line (never over a person's words): a breath of dots, the words, its voice if the switch is on; then it
   *  holds for the line's reading time, or the clip's own length and a breath if that is longer (`hold: false` returns as
   *  soon as the voice has finished, for a line that offers answers) */
  *say(line: Line, opts: { hold?: boolean; fill?: Record<string, string> } = {}): Beat {
    const s = this.screen;
    yield () => !s.originalShown && !this.feltNow;
    s.setTyping(true);
    yield 0.7;
    const texts = (typeof line === 'string' ? [line] : line.text).map((t) => fillIn(t, opts.fill));
    for (const t of texts) s.say(t);
    const clip = typeof line === 'string' ? 0 : s.speak(line.audio, line.seconds);
    if (opts.hold === false) { yield clip ? clip + 0.3 : 1.0; return; }
    yield Math.max(readHold(texts), clip ? clip + 0.6 : 0);
  }
  /** answers at the foot of the AI's pane; waits for one; puts her words in her own bubble; returns the chip's id */
  *ask(chips: Chip[], help: string | null = null): Beat<string> {
    const s = this.screen;
    this.clearPress();
    s.setChips(chips, help);
    this.path = chips.map((c) => c.id);
    let got: string | null = null;
    yield () => (got = this.take(chips.map((c) => c.id))) !== null;
    s.clearChips();
    this.path = [];
    const chip = chips.find((c) => c.id === got)!;
    s.her(chip.label);
    playOnce('ui_press.mp3');
    return chip.id;
  }
  /** the AI's cursor goes to a control the page published (by its anchor id) and waits there */
  *cursorTo(anchor: string, seconds = 1.0): Beat {
    const s = this.screen;
    // the page has to have been drawn once with this anchor in it
    yield () => !!s.anchorOf(anchor);
    const r = s.anchorOf(anchor)!;
    s.moveCursor(r.x + Math.min(r.w * 0.5, 40), r.y + r.h * 0.5, seconds);
    yield () => s.cursorArrived;
  }
  *click(): Beat { this.screen.clickCursor(); yield 0.35; }
  /** file a step on the 2026 record (memory only; the Close reads it) — once per id */
  file(id: string, outcome: 'read' | 'opened' | 'answered' | 'done' | 'residue', witness: string): void {
    if (ledger.e4Space.some((e) => e.id === id)) return;
    ledger.e4Space.push({ id, outcome, witness });
  }
}

/** `{name}` in a line, filled from the act's numbers */
export function fillIn(t: string, fill?: Record<string, string>): string {
  return fill ? t.replace(/\{(\w+)\}/g, (m, k) => fill[k] ?? m) : t;
}
