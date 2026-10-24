/** One programme guide, four skins. Pure state machine: callers supply the map,
 * silence/voice gates and effects. No canvas, DOM, storage, timers or input choices. */
import copy from '../../data/strings/lambyGuide.json';
import type { MapState } from '../witness/map';
export type GuideEra = 'e1' | 'e2' | 'e3' | 'e4';
export type GuideRung = 'silent' | 'cue' | 'tip' | 'show' | 'again' | 'start' | 'form';
export interface GuideStep { tip: string; here?: string; again?: string; target: string[]; act?: string; noAgain?: boolean; once?: boolean }
export interface GuideView {
  era: GuideEra; beat: string; rung: GuideRung; hidden: boolean; text: string | null;
  targets: string[]; act?: string; frame: number; time: number;
}
export interface GuideInput { era: GuideEra; map: Pick<MapState, 'current' | 'quiet'>; silent: boolean; voice: boolean;
  deferredUpdate?: boolean; formAvailable?: boolean; formOpened?: boolean; idleScale?: number; startTarget?: string; reducedMotion?: boolean }
interface StepMemory { dismissed: number; finished: boolean; offered: boolean }
export class LambyGuide {
  readonly view: GuideView = { era: 'e1', beat: '', rung: 'silent', hidden: true, text: null, targets: [], frame: 0, time: 0 };
  version = 0;
  private idle = 0;
  private key = '';
  private memory = new Map<string, StepMemory>();
  private counts: Record<GuideEra, number> = { e1: 0, e2: 0, e3: 0, e4: 0 };
  private formOffered = false;
  private rootOffered = false;
  private requested = false;
  private input: GuideInput | null = null;
  private spec: GuideStep | undefined;
  constructor(private effects: { log: (outcome: 'begun' | 'dismissed', beat: string, countDismissal: boolean, acknowledged: boolean) => void;
    act: (act: string) => void }) {}
  get hasStep(): boolean { return !!this.spec || (this.input?.era === 'e1' && !!this.input.formAvailable); }
  get waiting(): boolean { return !!this.spec && !this.spec.noAgain && !this.mem().finished && this.mem().dismissed > 0 && this.canOffer(); }
  get active(): boolean { return !this.view.hidden && this.view.text !== null; }
  activity(): void { this.idle = 0; if (this.view.rung === 'cue') this.set('silent'); }
  private mem(): StepMemory {
    let m = this.memory.get(this.key);
    if (!m) { m = { dismissed: 0, finished: false, offered: false }; this.memory.set(this.key, m); }
    return m;
  }
  private set(rung: GuideRung, text: string | null = null, targets: string[] = [], act?: string): void {
    Object.assign(this.view, { rung, text, targets, act }); this.version++;
  }
  tick(dt: number, input: GuideInput): void {
    this.input = input;
    const alias: Record<string, string> = { l: 'browser', search: 'results', site: 'program' };
    const beat = input.deferredUpdate ? 'update' : input.map.current?.beat.id ?? '';
    const step = input.era === 'e4' ? alias[beat] ?? beat : input.era === 'e3' && beat === 'migrate' ? 'signin' : beat;
    const key = `${input.era}:${step}`;
    if (key !== this.key) {
      this.key = key; this.idle = 0;
      this.view.era = input.era; this.view.beat = step;
      this.spec = (copy.eras[input.era] as Record<string, GuideStep>)[step];
      this.set('silent');
    }
    const hidden = input.silent || input.map.quiet || input.map.current?.era === 'close' || input.voice;
    if (hidden !== this.view.hidden) { this.view.hidden = hidden; this.version++; }
    if (hidden) {
      if (input.silent || input.map.quiet) this.requested = false;
      this.idle = 0; if (this.view.rung === 'cue') this.set('silent'); return;
    }
    if (this.requested) { this.requested = false; this.press('lg-tray'); return; }
    this.view.time += dt;
    const frame = input.reducedMotion ? 0 : Math.floor(this.view.time * 3) % 3;
    if (frame !== this.view.frame && this.view.rung !== 'silent') { this.view.frame = frame; this.version++; }
    // The only immediate offer. Once surfaced, it never repeats, including after closing the form.
    if (input.era === 'e1' && input.formAvailable && !input.formOpened && !this.formOffered && this.canOffer()) {
      this.formOffered = true; this.counts.e1++; this.set('form', copy.form.text, [], copy.form.act); return;
    }
    if (!this.active && input.era === 'e1' && !this.rootOffered && step === 'read' && this.canOffer()) {
      this.rootOffered = true;
      this.spec = { tip: copy.root.text, here: copy.root.here, target: ['icon-rootcause'], act: 'open:rootcause', once: true };
      this.offer('tip', copy.root.text); return;
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
  press(id: string): boolean {
    if (!id.startsWith('lg-') || !this.input) return false;
    // Requested help waits for the current operable voice; it never queues across a quiet scene.
    if (id === 'lg-tray' && this.input.voice && !this.input.silent && !this.input.map.quiet) { this.requested = true; return true; }
    if (this.view.hidden) return false;
    const s = this.spec, m = this.mem();
    if (id === 'lg-tray') {
      this.idle = 0;
      if (this.input.era === 'e1' && this.input.formAvailable && !this.input.formOpened) { this.set('form', copy.form.text, [], copy.form.act); return true; }
      if (this.view.rung === 'form') return true;
      if (this.active) this.point();
      else this.set('tip', s?.tip ?? copy.ui.nothing);
      return true;
    }
    if (!this.active) return false;
    if (id === 'lg-show') { this.effects.log('begun', this.view.beat, false, false); this.point(); }
    else if (id === 'lg-take' && this.view.act) {
      const act = this.view.act;
      this.effects.log('begun', this.view.rung === 'form' ? 'form' : this.view.beat, false, false);
      m.finished = true; this.set('silent'); this.idle = 0; this.effects.act(act);
    } else if (id === 'lg-later' || id === 'lg-x' || id === 'lg-ok') {
      const form = this.view.rung === 'form';
      this.effects.log('dismissed', form ? 'form' : this.view.beat, id !== 'lg-ok', id === 'lg-ok');
      if (!form) {
        if (id === 'lg-ok' || this.view.rung === 'show' || this.view.rung === 'start') m.finished = true;
        else m.dismissed++;
      }
      this.set('silent'); this.idle = 0;
    } else return false;
    return true;
  }
  private point(): void {
    if (this.view.rung === 'start') return;
    this.set('show', this.spec?.here ?? copy.ui.here, this.spec?.target ?? [], this.spec?.act);
  }
}
