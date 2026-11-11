/** One programme guide, four skins. Pure state machine: callers supply the map,
 * silence/voice gates and effects. No canvas, DOM, storage, timers or input choices. */
import copy from '../../data/strings/lambyGuide.json';
import decisions from '../../data/strings/cx3b.json';
import type { MapState } from '../witness/map';
export type GuideEra = 'e1' | 'e2' | 'e3' | 'e4';
export type GuideRung = 'silent' | 'cue' | 'tip' | 'show' | 'again' | 'start' | 'form' | 'personalise' | 'root' | 'harbor' | 'choice';
export interface GuideStep { tip: string; here?: string; again?: string; target: string[]; act?: string; noAgain?: boolean; once?: boolean }
export interface GuideView {
  era: GuideEra; beat: string; rung: GuideRung; hidden: boolean; text: string | null;
  targets: string[]; act?: string;
  /** ⚑ S362 / H33 — the second answer of a two-answer offer (the 'choice' rung's Family Form) */
  alt?: string;
  frame: number; time: number;
}
export interface GuideInput { era: GuideEra; map: Pick<MapState, 'current' | 'quiet'>; silent: boolean; voice: boolean;
  personaliseOffer?: string; deferredUpdate?: boolean; formAvailable?: boolean; formOpened?: boolean; formForced?: boolean; formFiled?: boolean; rootOpened?: boolean; racketDone?: boolean; robDone?: boolean; harborDue?: boolean; idleScale?: number; startTarget?: string; reducedMotion?: boolean }
interface StepMemory { dismissed: number; finished: boolean; offered: boolean }
export class LambyGuide {
  readonly view: GuideView = { era: 'e1', beat: '', rung: 'silent', hidden: true, text: null, targets: [], frame: 0, time: 0 };
  version = 0;
  private idle = 0;
  private key = '';
  private memory = new Map<string, StepMemory>();
  private counts: Record<GuideEra, number> = { e1: 0, e2: 0, e3: 0, e4: 0 };
  private formOffered = false;
  /** S281 — the intermission is over: Lamby says it is time, once ("no" is allowed; the next press opens the form) */
  private formDueOffered = false;
  private rootOffered = false;
  /** ⚑ S345 — 2003: Lamby has said to share the story on Harbor */
  private harborOffered = false;
  private formWait = 0;
  private requested = false;
  private input: GuideInput | null = null;
  private spec: GuideStep | undefined;
  constructor(private effects: { log: (outcome: 'begun' | 'dismissed', beat: string, countDismissal: boolean, acknowledged: boolean) => void;
    act: (act: string) => void }) {}
  get hasStep(): boolean { return !!this.spec || (this.input?.era === 'e1' && !!this.input.formAvailable); }
  get waiting(): boolean { return !!this.spec && !this.spec.noAgain && !this.mem().finished && this.mem().dismissed > 0 && this.canOffer(); }
  get canRequest(): boolean { return !!this.input && !this.input.silent && !this.input.map.quiet; }
  get active(): boolean { return !this.view.hidden && this.view.text !== null; }
  activity(): void { this.idle = 0; if (this.view.rung === 'cue') this.set('silent'); }
  private mem(): StepMemory {
    let m = this.memory.get(this.key);
    if (!m) { m = { dismissed: 0, finished: false, offered: false }; this.memory.set(this.key, m); }
    return m;
  }
  private set(rung: GuideRung, text: string | null = null, targets: string[] = [], act?: string, alt?: string): void {
    Object.assign(this.view, { rung, text, targets, act, alt }); this.version++;
  }
  /** the offers that are said once, ignorable, and logged by their own name (not by the era's beat) */
  private get isOffer(): boolean { const r = this.view.rung; return r === 'form' || r === 'root' || r === 'harbor' || r === 'choice'; }
  tick(dt: number, input: GuideInput): void {
    this.input = input;
    const alias: Record<string, string> = { l: 'browser', search: 'results' };   // ⚑ S293: 2026's other beats are their own ids
    const beat = input.deferredUpdate ? 'update' : input.map.current?.beat.id ?? '';
    const step = input.era === 'e2' && input.personaliseOffer ? 'personalise' : input.era === 'e4' ? alias[beat] ?? beat : input.era === 'e3' && beat === 'migrate' ? 'signin' : beat;
    const key = `${input.era}:${step}`;
    if (key !== this.key) {
      this.key = key; this.idle = 0;
      this.view.era = input.era; this.view.beat = step;
      this.spec = step === 'personalise' ? { tip: input.personaliseOffer!, target: [], act: 'open:personalise', once: true } : (copy.eras[input.era] as Record<string, GuideStep>)[step];
      this.set('silent');
    }
    const hidden = input.silent || input.map.quiet || input.map.current?.era === 'close' || input.voice;
    if (hidden !== this.view.hidden) { this.view.hidden = hidden; this.version++; }
    if (hidden) {
      if (input.silent || input.map.quiet) this.requested = false;
      this.idle = 0; if (this.view.rung === 'cue') this.set('silent'); return;
    }
    if (step === 'personalise' && !this.mem().offered && this.canOffer()) {
      this.mem().offered = true; this.offer('personalise', input.personaliseOffer!, [], 'open:personalise'); return;
    }
    if (this.requested) { this.requested = false; this.press('lg-tray'); return; }
    this.view.time += dt;
    const frame = input.reducedMotion ? 0 : Math.floor(this.view.time * 3) % 3;
    if (frame !== this.view.frame && this.view.rung !== 'silent') { this.view.frame = frame; this.version++; }
    // ⚑ S343 / T16 + T35 (his 8 Nov: "the chat with the mentor Rob, it closed itself, but then all disappeared… Lamby
    //   should say something" — and "the suggestion from Lamby to be, before you jump into the family form, do you
    //   want to play the root cause digger") — the moment Rob's chat has closed, Lamby says what is next: the game
    //   first, the form after it. Once, ignorable, inside the era's cap.
    if (input.era === 'e1' && input.robDone && input.formAvailable && !input.formOpened && !input.rootOpened && !this.rootOffered && !this.active && this.canOffer()) {
      this.rootOffered = true; this.counts.e1++; this.set('root', copy.root.next, [], 'open:rootcause'); return;
    }
    // ⚑ S345 (his 9 Nov answer 4: "after the upload, Lamby says to share it on Harbor … Lamby, not Today in
    //   Restorify") — once his story is online and not yet posted: one line, and Yes opens Harbor at the thread whose
    //   next press is Post your story. Once, ignorable, inside the era's cap.
    if (input.era === 'e2' && input.harborDue && !this.harborOffered && !this.active && this.canOffer()) {
      this.harborOffered = true; this.counts.e2++; this.set('harbor', copy.harbor.text, [], 'open:harbor'); return;
    }
    // Available form waits through free exploration; only one unsolicited offer. ⚑ S343: once the game has been
    //   played (or offered) and closed, the form is offered after a breath, not after the full tip wait.
    if (input.era === 'e1' && input.formAvailable && !input.formOpened) this.formWait += dt;
    const formAfter = input.robDone && (this.rootOffered || input.rootOpened) ? copy.timing.formAfterRootSeconds : copy.timing.tipSeconds;
    if (input.era === 'e1' && input.formAvailable && !input.formOpened && !this.formOffered && this.formWait >= formAfter * (input.idleScale ?? 1) && !this.active && this.canOffer()) {
      this.formOffered = true; this.counts.e1++;
      // ⚑ S362 / H33 (his headset, 10 Nov, 20:36: "After the digger, the message should ask whether to do Release Work or go
      //   to the form, not jump to the form") — after the game Lamby offers TWO things, not one: Release Work (the racket
      //   exercise, which the room has held all along) or Rob's Family Form. Both answers open their thing; "No thanks" and
      //   the × work and are logged like every other dismissal. Once the racket has been done the offer is just the form.
      if (input.rootOpened && !input.racketDone) this.set('choice', copy.choice.text, [], copy.choice.actRelease, copy.choice.actForm);
      else this.set('form', input.rootOpened ? copy.form.next : copy.form.text, [], copy.form.act);
      return;
    }
    // ⚑ S281 (his, 1 Nov: "a message from lamby … that it is time for you to go, and even you say no, it forces you
    //   to by always opening the file when you touch something") — said once, over anything else Lamby was saying
    if (input.era === 'e1' && input.formForced && !input.formOpened && !this.formDueOffered && this.canOffer()) {
      this.formDueOffered = true; this.counts.e1++; this.set('form', copy.form.due, [], copy.form.act); return;
    }
    // ⚑ S268 (his (C)) — Root Cause is offered once the Family Form is filed: the father questions, then the dig for
    //   "the root cause", then the racket. Ignorable, once, inside the era's cap.
    if (!this.active && input.era === 'e1' && !this.rootOffered && input.formFiled && !input.rootOpened && this.canOffer()) {
      this.rootOffered = true;
      this.spec = { tip: copy.root.text, here: copy.root.here, target: ['icon-rootcause'], act: 'open:rootcause', once: true };
      this.offer('tip', `${copy.root.text} ${decisions.helper.map}`); return;
    }
    if (this.active) {
      if (this.view.rung === 'again') {
        this.idle += dt;
        if (this.idle >= copy.timing.againSeconds * (input.idleScale ?? 1)) {
          if (input.startTarget && this.canOffer()) this.offer('start', copy.ui.startNudge, [input.startTarget], `press:${input.startTarget}`);
          this.mem().finished = true;
        }
      }
      return;
    }
    this.idle += dt;
    const m = this.mem(), s = this.spec;
    if (!s || m.finished || !this.canOffer()) return;
    const scale = input.idleScale ?? 1;
    if (m.dismissed) {
      if (s.noAgain || s.once) return;
      if (this.idle < copy.timing.againSeconds * scale) return;
      if (m.dismissed === 1 && s.again) this.offer('again', s.again);
      else if (m.dismissed === 2 && input.startTarget) this.offer('start', copy.ui.startNudge, [input.startTarget], `press:${input.startTarget}`);
      else m.finished = true;
    } else if (this.idle >= copy.timing.tipSeconds * scale && !m.offered) {
      m.offered = true; this.offer('tip', s.tip);
      if (s.once) m.finished = true;
    } else if (this.idle >= copy.timing.cueSeconds * scale && this.view.rung === 'silent') this.set('cue');
  }
  private canOffer(): boolean { return this.counts[this.view.era] < copy.timing.capPerEra; }
  private offer(rung: GuideRung, text: string, targets: string[] = [], act?: string): void {
    this.counts[this.view.era]++; this.idle = 0; this.set(rung, text, targets, act);
  }
  /** S284 — a requested answer that is not a beat: Lamby says one plain line (the visitor asked; it is not unsolicited) */
  tell(text: string): void { this.idle = 0; this.set('tip', text); }
  press(id: string): boolean {
    if (!id.startsWith('lg-') || !this.input) return false;
    // Requested help waits for the current operable voice; it never queues across a quiet scene.
    if (id === 'lg-tray' && this.input.voice && !this.input.silent && !this.input.map.quiet) { this.requested = true; return true; }
    if (this.view.hidden) return false;
    const s = this.spec, m = this.mem();
    if (id === 'lg-tray') {
      this.idle = 0;
      if (this.input.era === 'e1' && this.input.formAvailable && !this.input.formOpened) {
        if (this.input.rootOpened && !this.input.racketDone) this.set('choice', copy.choice.text, [], copy.choice.actRelease, copy.choice.actForm);   // S362 / H33
        else this.set('form', copy.form.text, [], copy.form.act);
        return true;
      }
      if (this.isOffer) return true;
      if (this.active) this.point();
      // ⚑ S271 (his 31 Oct: "You're doing fine, carry on. Thank you, Lamby. But it doesn't tell me where do I need
      //   to go") — with no beat of its own, Lamby reads the Start map's next step before it says "carry on"
      else this.set('tip', s?.tip ?? this.input.map.current?.beat.hint ?? copy.ui.nothing);
      return true;
    }
    if (!this.active) return false;
    if (id === 'lg-show') { this.effects.log('begun', this.view.beat, false, false); this.point(); }
    else if ((id === 'lg-take' && this.view.act) || (id === 'lg-alt' && this.view.alt && this.view.rung === 'choice')) {
      const alt = id === 'lg-alt';
      const act = (alt ? this.view.alt : this.view.act) as string;
      // ⚑ S362 / H33 — the two answers are logged by name: "guide requested: choice-releasework" / "choice-form"
      const beat = this.view.rung === 'choice' ? (alt ? 'choice-form' : 'choice-releasework') : this.isOffer ? this.view.rung : this.view.beat;
      this.effects.log('begun', beat, false, false);
      m.finished = true; this.set('silent'); this.idle = 0; this.effects.act(act);
    } else if (id === 'lg-later' || id === 'lg-x' || id === 'lg-ok') {
      const form = this.isOffer;
      this.effects.log('dismissed', form ? this.view.rung : this.view.beat, id !== 'lg-ok', id === 'lg-ok');
      if (this.view.rung === 'root') this.formWait = 0;   // S343: "no" to the game → the form is offered after a breath
      if (!form) {
        if (id === 'lg-ok' || this.view.rung === 'show' || this.view.rung === 'start') m.finished = true;
        else m.dismissed++;
      }
      this.set('silent'); this.idle = 0;
    } else return false;
    return true;
  }
  /** A surface supplies its published controls; a focus offer must have a live destination. */
  resolveFocusTargets(live: Set<string>): void {
    if (this.view.rung !== 'show' || !this.spec?.act?.startsWith('focus:')) return;
    const target = this.view.targets.find(id => live.has(id));
    const act = target ? `focus:${target}` : undefined;
    if (this.view.act !== act) { this.view.act = act; this.version++; }
  }
  private point(): void {
    if (this.view.rung === 'start') return;
    this.set('show', this.spec?.here ?? copy.ui.here, this.spec?.target ?? [], this.spec?.act);
  }
}
