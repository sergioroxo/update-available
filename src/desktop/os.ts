/**
 * The desktop OS — phase state machine for the vertical slice:
 * warning → boot → name → desktop (mIRC → DM → log toast) → [flip happens
 * in the engine] → dossier card #1. All display text from data/strings/.
 *
 * Registers: warning/left = frame (bare); name/desktop = operable;
 * the ESC pause overlay is care infrastructure and preempts everything.
 */
import { ERA1, ERA1_CANVAS, RENDER_SCALE } from './theme/era1';
import * as ui from './theme/chrome';
import { IrcApp } from './apps/irc';
import { KitApp } from './apps/kit';
import { ProvotypeApp, type Provotype } from './apps/provotype';
import { UpdateApp, type UpdateKey } from './apps/update';
import sendsData from '../../data/sends.json';
import { ledger, wipeLedger } from '../state/ledger';
import strings from '../../data/strings/slice.json';
import reinterpStrings from '../../data/strings/reinterp.json';
import opening from '../../data/strings/opening.json';
import pillowProvotypeData from '../../data/provotypes/pillow.json';
import originIntakeProvotypeData from '../../data/provotypes/origin_intake_e1.json';

// The shipped opening (warning→off→boot→splash→name→desktop) is UNTOUCHED.
// Behind ?reinterp=1 the four r_* phases REPLACE it (OPENING_AND_FLOW_SPEC
// §1, O1–O3): O1 (start screen) is a DOM overlay owned by the engine while the
// monitor sits in `r_dark`; O2 boot + O3 profile/recap render on the monitor.
type Phase =
  | 'warning' | 'off' | 'boot' | 'splash' | 'name' | 'desktop' | 'left'
  | 'r_dark' | 'r_boot' | 'r_profile' | 'r_recap';

const SPLASH_SECONDS = 4.6;        // hold the loading screen long enough to read
const BOOT_CPS = 0.030;            // seconds per char — slower BIOS crawl
const BOOT_HOLD = 4.8;             // hold completed BIOS so the install lines read
const R_BOOT_HOLD = 3.2;           // hold the LambyOS boot after the crawl completes

const WARNING_ARM_DELAY = 4; // s before CONTINUE becomes active (ethics)
// display text lives in data/ — never in code (CLAUDE.md law)
const BOOT_LINES: ReadonlyArray<string> = strings.boot.lines;

interface Hit { x: number; y: number; w: number; h: number; id: string }

interface DesktopOSOptions {
  reinterp?: boolean;
}

export class DesktopOS {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly reinterp: boolean;
  dirty = true;

  private phase: Phase = 'warning';
  private t = 0;
  private phaseT = 0;
  private hits: Hit[] = [];
  private hover = '';
  paused = false;

  // boot
  private bootChars = 0;
  private readonly bootTotal = BOOT_LINES.reduce((n, l) => n + Math.max(l.length, 1), 0);

  // name
  private nameInput = '';
  private greeting = false;

  // reinterp opening (O2/O3, ?reinterp=1 only — see the r_* phases)
  private rBootChars = 0;
  private readonly rBootTotal = (opening.o2_boot_lines as string[])
    .reduce((n, l) => n + Math.max(l.length, 1), 0);
  private profileIcon = '';
  private profileChips: string[] = [];
  private profileGoal = ''; // '' until chosen; 'declined' files as a choice too
  private profileFiled = false;

  // desktop
  kit: KitApp | null = null;
  irc: IrcApp | null = null;
  /** the reinterpretation provotype runtime — reachable behind ?reinterp=1 only */
  provotype: ProvotypeApp | null = null;
  /** the era-update ritual (spine-armed; never player-triggered) */
  updateApp: UpdateApp | null = null;
  /** a live send OFFER (master script §4) — icon + summons window on the desktop */
  private sendOffer: { id: string; open: boolean } | null = null;
  /** engine listens: the update restart landed — morph the space to `era` */
  onEraShift?: (era: string) => void;
  /** engine listens: the player answered a summons (visit dollies the camera) */
  onSendResolve?: (id: string, outcome: 'visited' | 'declined') => void;
  private toast: { text: string; t: number } | null = null;
  private kitToastShown = false;
  private behindToastShown = false;
  private behindToastAt = Infinity;
  /** engine reads this to creep the cold (witness) side into peripheral vision */
  hasUnseenWitness = false;
  dossierUnlocked = false;
  private dossierOpen = false;
  /** engine listens: pulse the flip affordance when the hook lands */
  onFlipReady?: () => void;
  /** engine listens: user chose LEAVE */
  onLeave?: () => void;
  /** engine listens: hide the physical floppy once it is in the drive */
  onKitInserted?: () => void;

  constructor(options: DesktopOSOptions = {}) {
    this.reinterp = options.reinterp === true;
    this.canvas = document.createElement('canvas');
    this.canvas.width = ERA1_CANVAS.width * RENDER_SCALE;
    this.canvas.height = ERA1_CANVAS.height * RENDER_SCALE;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.scale(RENDER_SCALE, RENDER_SCALE); // all layout stays logical
    // reinterp replaces the shipped opening: the monitor waits dark (O1 lives
    // as the engine's DOM overlay) until beginReinterpOpening() lights the boot.
    if (this.reinterp) this.phase = 'r_dark';
  }

  get inDesktop(): boolean {
    return this.phase === 'desktop';
  }

  /**
   * True while a phase is capturing typed characters (name entry / IRC). The
   * engine consults this so browser CAMERA shortcuts (R/F, §0-REV-5) never
   * steal a letter from the typing hand. The reinterp opening (O1–O3) captures
   * no text — every choice is a click — so shortcuts are free there.
   */
  get isCapturingText(): boolean {
    if (this.phase === 'name' && !this.greeting) return true;
    if (this.phase === 'desktop' && this.irc) return true;
    return false;
  }

  /** O1→O2: the engine's start screen calls this on Continue (flat calls it at
   *  start, having no O1 overlay). Lights the LambyOS boot on the monitor. */
  beginReinterpOpening(): void {
    if (!this.reinterp || this.phase !== 'r_dark') return;
    ledger.name = opening.o3_prefilled_name; // "they already know your name"
    this.setPhase('r_boot');
  }

  /** S1.0 power-on beat: the machine waits dark until the player acts */
  get isOff(): boolean {
    return this.phase === 'off';
  }

  powerOn(): void {
    if (this.phase === 'off') this.setPhase('boot');
  }

  /** S1.2 — the disk goes in (3D floppy click, or the A:\ icon) */
  insertKit(): void {
    if (this.phase !== 'desktop' || this.kit) return;
    this.kit = new KitApp();
    this.toast = null;
    if (!ledger.records.includes('kit-inserted')) ledger.records.push('kit-inserted');
    this.onKitInserted?.();
    this.kit.onConnect = () => {
      // S1.4 — the kit's last step is the channel it chose for you
      if (!ledger.records.includes('went-online')) ledger.records.push('went-online');
      this.irc = new IrcApp();
      this.irc.onHooked = () => {
        this.toast = { text: strings.desktop.logToast, t: 6 };
        this.hasUnseenWitness = true; // the cold side begins to creep in
        this.behindToastAt = this.t + 7; // a beat later: a reason to look back
        this.onFlipReady?.();
      };
    };
    this.dirty = true;
  }

  /** the player has turned to the witness side — stop nudging them back */
  markWitnessSeen(): void {
    this.hasUnseenWitness = false;
    this.behindToastAt = Infinity;
    this.dirty = true;
  }

  /** open a reinterpretation provotype (diegetic invitation lives inside it) */
  private openProvotype(data: Provotype): void {
    if (!this.reinterp || this.provotype) return;
    this.provotype = new ProvotypeApp(data);
    this.provotype.onClose = () => { this.provotype = null; this.dirty = true; };
    this.dirty = true;
  }

  /** ARM an era update (the spine calls this on a documented failure —
   *  never the player; SCRIPT_UPDATE v0.5 §1). Modal over the desktop. */
  armUpdate(key: UpdateKey): void {
    if (!this.reinterp || this.updateApp) return;
    this.updateApp = new UpdateApp(key);
    this.updateApp.onComplete = (toEra) => {
      this.updateApp = null;
      this.dirty = true;
      this.onEraShift?.(toEra);
    };
    this.dirty = true;
  }

  get updateArmed(): boolean {
    return this.updateApp !== null;
  }

  /** a SEND offer lands (script §4: a summons, not a door). An icon appears;
   *  its window carries the reason + Turn-and-look / Not-now. Both file. */
  offerSend(id: string): void {
    if (!this.reinterp || this.sendOffer) return;
    const def = (sendsData as unknown as { sends: { id: string; offer: { icon: string } }[] })
      .sends.find(s => s.id === id);
    if (!def) return;
    this.sendOffer = { id, open: false };
    this.toast = { text: def.offer.icon, t: 6 };
    this.dirty = true;
  }

  get sendOfferPending(): boolean {
    return this.sendOffer !== null;
  }

  private resolveSend(outcome: 'visited' | 'declined'): void {
    if (!this.sendOffer) return;
    const id = this.sendOffer.id;
    this.sendOffer = null;
    this.dirty = true;
    this.onSendResolve?.(id, outcome);
  }

  private drawSendOffer(W: number, H: number): void {
    if (!this.sendOffer) return;
    const def = (sendsData as unknown as {
      sends: { id: string; offer: { icon: string; lines: string[]; go: string; decline: string } }[];
    }).sends.find(s => s.id === this.sendOffer?.id);
    if (!def) return;
    if (!this.sendOffer.open) {
      this.drawIcon(10, 200, def.offer.icon, true, 'icon-send');
      return;
    }
    const dw = 300; const dh = 150;
    const dx = Math.round((W - dw) / 2); const dy = Math.round((H - dh) / 2);
    const c = ui.windowFrame(this.ctx, dx, dy, dw, dh, def.offer.icon, true);
    ui.setFont(this.ctx, 9);
    this.ctx.fillStyle = ERA1.black;
    def.offer.lines.forEach((line, i) => this.ctx.fillText(line, c.x + 10, c.y + 6 + i * 12));
    ui.button(this.ctx, c.x + c.w - 110, c.y + c.h - 26, 102, 18, def.offer.go, {});
    ui.button(this.ctx, c.x + 8, c.y + c.h - 26, 70, 18, def.offer.decline, {});
    this.hits.push({ x: c.x + c.w - 110, y: c.y + c.h - 26, w: 102, h: 18, id: 'send-go' });
    this.hits.push({ x: c.x + 8, y: c.y + c.h - 26, w: 70, h: 18, id: 'send-decline' });
  }

  private setPhase(p: Phase): void {
    this.phase = p;
    this.phaseT = 0;
    this.dirty = true;
  }

  /** the witness flip completed its return — card #1 unlocks */
  unlockDossier(): void {
    if (this.dossierUnlocked) return;
    this.dossierUnlocked = true;
    if (!ledger.dossier.includes('card1')) ledger.dossier.push('card1');
    this.toast = { text: strings.desktop.dossierUpdated, t: 4 };
    this.dirty = true;
  }

  // ── update / draw ──────────────────────────────────────────────────────
  update(dt: number): void {
    this.t += dt;
    this.phaseT += dt;
    if (this.paused) { this.draw(); return; }

    if (this.phase === 'boot') {
      const next = Math.min(Math.floor(this.phaseT / BOOT_CPS), this.bootTotal);
      if (next !== this.bootChars) this.bootChars = next;
      if (this.bootChars >= this.bootTotal && this.phaseT > BOOT_HOLD) this.setPhase('splash');
    }
    if (this.phase === 'splash' && this.phaseT >= SPLASH_SECONDS) this.setPhase('name');
    if (this.phase === 'r_boot') {
      const next = Math.min(Math.floor(this.phaseT / BOOT_CPS), this.rBootTotal);
      if (next !== this.rBootChars) this.rBootChars = next;
      if (this.rBootChars >= this.rBootTotal && this.phaseT > R_BOOT_HOLD) this.setPhase('r_profile');
    }
    if (this.phase === 'name' && this.greeting && this.phaseT > 2.8) {
      this.setPhase('desktop'); // empty desk — the kit is the only way in (S1.1)
    }
    if (this.phase === 'desktop' && !this.kit && !this.kitToastShown && this.phaseT > 6) {
      this.kitToastShown = true;
      this.toast = { text: strings.desktop.kitToast, t: 8 };
    }
    if (this.phase === 'desktop' && this.kit) this.kit.update(dt);
    if (this.phase === 'desktop' && this.irc) this.irc.update(dt);
    if (this.phase === 'desktop' && this.provotype) this.provotype.update(dt);
    if (this.phase === 'desktop' && this.updateApp) this.updateApp.update(dt);
    if (!this.behindToastShown && this.t >= this.behindToastAt) {
      this.behindToastShown = true;
      this.toast = { text: strings.desktop.behindToast, t: 7 };
    }
    if (this.toast) {
      this.toast.t -= dt;
      if (this.toast.t <= 0) this.toast = null;
    }
    this.dirty = true; // caret blink etc.; dirty-rect optimization comes later
    this.draw();
  }

  private caretOn(): boolean {
    return Math.floor(this.t * 2.2) % 2 === 0;
  }

  private draw(): void {
    const W = ERA1_CANVAS.width;
    const H = ERA1_CANVAS.height;
    this.hits = [];

    switch (this.phase) {
      case 'warning': this.drawWarning(W, H); break;
      case 'off': ui.px(this.ctx, 0, 0, W, H, ERA1.black); break;
      case 'boot': this.drawBoot(); break;
      case 'splash': this.drawSplash(W, H); break;
      case 'name': this.drawName(W, H); break;
      case 'desktop': this.drawDesktop(W, H); break;
      case 'left': this.drawLeft(W, H); break;
      case 'r_dark': ui.px(this.ctx, 0, 0, W, H, ERA1.black); break; // O1: monitor off
      case 'r_boot': this.drawReinterpBoot(W, H); break;             // O2
      case 'r_profile': this.drawReinterpProfile(W, H); break;       // O3
      case 'r_recap': this.drawReinterpRecap(W, H); break;           // O3 close
    }
    if (this.reinterp) this.drawReinterpMarker(W);
    if (this.paused) this.drawPause(W, H);
  }

  private drawReinterpMarker(W: number): void {
    const { ctx } = this;
    const x = W - 20;
    const y = 6;
    ui.px(ctx, x, y, 14, 10, ERA1.greyDark);
    ui.px(ctx, x + 1, y + 1, 12, 8, ERA1.black);
    ui.px(ctx, x + 2, y + 2, 3, 6, ERA1.warn);
    ui.px(ctx, x + 6, y + 2, 3, 6, ERA1.ok);
    ui.px(ctx, x + 10, y + 2, 2, 6, ERA1.titleBlue);
  }

  private drawSplash(W: number, H: number): void {
    const { ctx } = this;
    ui.px(ctx, 0, 0, W, H, ERA1.black);
    // four-square mark (invented, era-true) + wordmark
    const mx = Math.round(W / 2) - 50; const my = Math.round(H / 2) - 40;
    ui.px(ctx, mx, my, 14, 14, ERA1.warn);
    ui.px(ctx, mx + 16, my, 14, 14, ERA1.ok);
    ui.px(ctx, mx, my + 16, 14, 14, ERA1.titleBlue);
    ui.px(ctx, mx + 16, my + 16, 14, 14, ERA1.olive);
    ui.setFont(ctx, 16);
    ctx.fillStyle = ERA1.white;
    ctx.fillText(strings.splash.title, mx + 40, my + 2);
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.grey;
    ctx.fillText(strings.splash.subtitle, mx + 40, my + 22);
    // banded loading bar, looping
    const bw = 180; const bx = Math.round((W - bw) / 2); const by = my + 56;
    ui.px(ctx, bx - 1, by - 1, bw + 2, 12, ERA1.greyDark);
    ui.px(ctx, bx, by, bw, 10, ERA1.black);
    const off = Math.floor((this.phaseT * 60) % (bw + 30)) - 30;
    for (let i = 0; i < 5; i++) {
      const sx = off + i * 7;
      if (sx >= 0 && sx + 5 <= bw) ui.px(ctx, bx + sx, by + 1, 5, 8, ERA1.titleBlue);
    }
  }

  private drawWarning(W: number, H: number): void {
    const { ctx } = this;
    ui.px(ctx, 0, 0, W, H, ERA1.black);
    ui.setFont(ctx, 11);
    ctx.fillStyle = ERA1.silver;
    ctx.fillText(strings.warning.title, 40, 24);
    ui.setFont(ctx, 10);
    strings.warning.body.forEach((line, i) => {
      ctx.fillStyle = i > 4 ? ERA1.grey : ERA1.silver;
      ctx.fillText(line, 40, 52 + i * 14);
    });
    const armed = this.phaseT >= WARNING_ARM_DELAY;
    ui.button(ctx, 40, H - 56, 200, 20, strings.warning.continue, {
      disabled: !armed, hover: this.hover === 'continue' && armed
    });
    ui.button(ctx, 256, H - 56, 70, 20, strings.warning.leave, { hover: this.hover === 'leave' });
    if (armed) this.hits.push({ x: 40, y: H - 56, w: 200, h: 20, id: 'continue' });
    this.hits.push({ x: 256, y: H - 56, w: 70, h: 20, id: 'leave' });
    if (!armed) {
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.greyDark;
      ctx.fillText('(one moment)', 40, H - 30);
    }
  }

  private drawBoot(): void {
    const { ctx } = this;
    ui.px(ctx, 0, 0, ERA1_CANVAS.width, ERA1_CANVAS.height, ERA1.black);
    ui.setFont(ctx, 12);
    ctx.fillStyle = ERA1.silver;
    let remaining = this.bootChars;
    let y = 12;
    for (const line of BOOT_LINES) {
      if (remaining <= 0) break;
      const take = Math.min(line.length, remaining);
      ctx.fillText(line.slice(0, take), 12, y);
      remaining -= Math.max(line.length, 1);
      y += 16;
    }
    if (this.caretOn()) ui.px(ctx, 12, y, 7, 12, ERA1.silver);
  }

  private drawName(W: number, H: number): void {
    const { ctx } = this;
    ui.px(ctx, 0, 0, W, H, ERA1.tealDark);
    const dw = 280; const dh = 110;
    const dx = Math.round((W - dw) / 2); const dy = Math.round((H - dh) / 2);
    const c = ui.windowFrame(ctx, dx, dy, dw, dh, strings.name.title, true);
    ui.setFont(ctx, 11);
    ctx.fillStyle = ERA1.black;
    if (!this.greeting) {
      ctx.fillText(strings.name.prompt, c.x + 8, c.y + 6);
      ui.inputField(ctx, c.x + 8, c.y + 24, c.w - 16, 20, this.nameInput, this.caretOn());
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.grey;
      ctx.fillText(strings.name.hint, c.x + 8, c.y + 50);
      ui.button(ctx, c.x + c.w - 60, c.y + c.h - 26, 52, 18, strings.name.ok, {
        disabled: this.nameInput.trim().length === 0, hover: this.hover === 'ok'
      });
      if (this.nameInput.trim().length > 0) {
        this.hits.push({ x: c.x + c.w - 60, y: c.y + c.h - 26, w: 52, h: 18, id: 'ok' });
      }
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.greyDark;
      ctx.fillText(strings.name.footnote, 40, H - 20);
    } else {
      ui.setFont(ctx, 13);
      ctx.fillStyle = ERA1.navy;
      ctx.fillText(strings.name.greeting.replace('{name}', ledger.name), c.x + 8, c.y + 16);
      // the tell — dim, easy to miss (Storyboard A3)
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.greyDark;
      ctx.fillText(strings.name.classifying, 8, H - 14);
    }
  }

  private drawDesktop(W: number, H: number): void {
    const { ctx } = this;
    ui.px(ctx, 0, 0, W, H, ERA1.teal);
    // icons — the channel only exists once the kit has routed you there
    if (!this.kit) this.drawIcon(10, 8, strings.desktop.iconA, true, 'icon-a');
    if (this.irc) this.drawIcon(10, 8, strings.desktop.iconIrc, true, 'icon-irc');
    this.drawIcon(10, 56, strings.desktop.iconDossier, this.dossierUnlocked, 'icon-dossier');
    // reinterpretation-only: the provotype launchers (the invitation is inside each)
    if (this.reinterp && !this.provotype) {
      this.drawIcon(10, 104, reinterpStrings.launcherIcon, true, 'icon-provotype');
      this.drawIcon(10, 152, reinterpStrings.launcherIconIntake, true, 'icon-provotype-intake');
    }
    // windows
    if (this.kit?.open) this.kit.draw(ctx);
    if (this.irc?.open) this.irc.draw(ctx, this.caretOn());
    if (this.dossierOpen) this.drawDossier(W, H);
    if (this.provotype?.open) this.provotype.draw(ctx);
    this.drawSendOffer(W, H);
    // the update ritual is SYSTEM-modal — it draws over everything
    if (this.updateApp?.open && this.updateApp.visible) this.updateApp.draw(ctx);
    // taskbar
    ui.bevel(ctx, 0, H - 22, W, 22, true);
    ui.button(ctx, 3, H - 19, 50, 16, 'MENU', {});
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(strings.desktop.clock, W - 38, H - 16);
    // toast
    if (this.toast) {
      ui.setFont(ctx, 9);
      const tw = ctx.measureText(this.toast.text).width + 12;
      ui.px(ctx, W - tw - 6, H - 42, tw, 16, ERA1.tooltip);
      ui.px(ctx, W - tw - 6, H - 42, tw, 1, ERA1.black);
      ui.px(ctx, W - tw - 6, H - 42, 1, 16, ERA1.black);
      ui.px(ctx, W - tw - 6, H - 27, tw, 1, ERA1.black);
      ui.px(ctx, W - 7, H - 42, 1, 16, ERA1.black);
      ctx.fillStyle = ERA1.black;
      ctx.fillText(this.toast.text, W - tw, H - 38);
    }
  }

  private drawIcon(x: number, y: number, label: string, enabled: boolean, id: string): void {
    const { ctx } = this;
    ui.px(ctx, x + 8, y, 20, 16, enabled ? ERA1.beige : ERA1.tealDark);
    ui.px(ctx, x + 8, y, 20, 4, enabled ? ERA1.navy : ERA1.tealDark);
    ui.setFont(ctx, 9);
    ctx.fillStyle = enabled ? ERA1.white : ERA1.tealDark;
    const tw = ctx.measureText(label).width;
    ctx.fillText(label, Math.round(x + 18 - tw / 2), y + 20);
    if (enabled) this.hits.push({ x, y, w: 38, h: 32, id });
  }

  private drawDossier(W: number, H: number): void {
    const { ctx } = this;
    const dw = 330; const dh = 200;
    const dx = Math.round((W - dw) / 2); const dy = Math.round((H - dh) / 2) - 8;
    const c = ui.windowFrame(ctx, dx, dy, dw, dh, strings.dossier.title, true);
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.paper);
    ui.setFont(ctx, 9);
    const meta = [strings.dossier.tactic, strings.dossier.layer, strings.dossier.status];
    meta.forEach((m, i) => {
      ctx.fillStyle = i === 2 ? ERA1.warnDark : ERA1.greyDark;
      ctx.fillText(m, c.x + 8, c.y + 6 + i * 12);
    });
    ctx.fillStyle = ERA1.black;
    strings.dossier.body.forEach((line, i) => {
      ctx.fillText(line, c.x + 8, c.y + 48 + i * 12);
    });
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.grey;
    ctx.fillText(strings.dossier.note, c.x + 8, c.y + c.h - 28);
    ctx.fillText(strings.dossier.archive, c.x + 8, c.y + c.h - 16);
    this.hits.push({ x: c.closeBox.x, y: c.closeBox.y, w: c.closeBox.w, h: c.closeBox.h, id: 'dossier-close' });
  }

  private drawPause(W: number, H: number): void {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(0, 0, W, H);
    ui.setFont(ctx, 13);
    ctx.fillStyle = ERA1.silver;
    ctx.fillText(strings.pause.title, Math.round(W / 2 - 24), 90);
    ui.button(ctx, Math.round(W / 2 - 80), 130, 70, 20, strings.pause.resume, { hover: this.hover === 'resume' });
    ui.button(ctx, Math.round(W / 2 + 10), 130, 70, 20, strings.pause.leave, { hover: this.hover === 'pleave' });
    this.hits.push({ x: Math.round(W / 2 - 80), y: 130, w: 70, h: 20, id: 'resume' });
    this.hits.push({ x: Math.round(W / 2 + 10), y: 130, w: 70, h: 20, id: 'pleave' });
  }

  private drawLeft(W: number, H: number): void {
    const { ctx } = this;
    ui.px(ctx, 0, 0, W, H, ERA1.black);
    ui.setFont(ctx, 11);
    ctx.fillStyle = ERA1.silver;
    strings.left.body.forEach((line, i) => {
      ctx.fillText(line, 40, Math.round(H / 2) - 20 + i * 16);
    });
  }

  // ── reinterp opening (O2/O3) ────────────────────────────────────────────
  /** a small Leave, drawn from the first frame of every opening beat (rail) */
  private drawOpeningLeave(W: number, H: number): void {
    ui.button(this.ctx, W - 70, H - 26, 60, 18, opening.o1_leave, { hover: this.hover === 'r-leave' });
    this.hits.push({ x: W - 70, y: H - 26, w: 60, h: 18, id: 'r-leave' });
  }

  /** O2 — the LambyOS boot: this computer was made FOR you (spec §1 O2) */
  private drawReinterpBoot(W: number, H: number): void {
    const { ctx } = this;
    ui.px(ctx, 0, 0, W, H, ERA1.black);
    ui.setFont(ctx, 12);
    let remaining = this.rBootChars;
    let y = 22;
    for (const line of opening.o2_boot_lines as string[]) {
      if (remaining <= 0) break;
      const take = Math.min(line.length, remaining);
      ctx.fillStyle = ERA1.silver;
      ctx.fillText(line.slice(0, take), 22, y);
      remaining -= Math.max(line.length, 1);
      y += 18;
    }
    if (this.caretOn() && this.rBootChars < this.rBootTotal) ui.px(ctx, 22, y, 7, 12, ERA1.silver);
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.grey;
    ctx.fillText(opening.o2_boot_footer, 22, H - 30);
    this.drawOpeningLeave(W, H);
  }

  /** small pixel objects for the profile grid — era-true, none are people */
  private drawProfileIcon(x: number, y: number, id: string): void {
    const p = (dx: number, dy: number, w: number, h: number, c: string): void =>
      ui.px(this.ctx, x + dx, y + dy, w, h, c);
    switch (id) {
      case 'star':
        p(10, 2, 4, 20, ERA1.tooltip); p(2, 10, 20, 4, ERA1.tooltip);
        p(5, 5, 3, 3, ERA1.tooltip); p(16, 5, 3, 3, ERA1.tooltip);
        p(5, 16, 3, 3, ERA1.tooltip); p(16, 16, 3, 3, ERA1.tooltip); break;
      case 'tape':
        p(2, 6, 20, 12, ERA1.beige); p(2, 6, 20, 2, ERA1.navy);
        p(6, 11, 4, 4, ERA1.black); p(14, 11, 4, 4, ERA1.black); break;
      case 'flower':
        p(10, 4, 4, 4, ERA1.warn); p(10, 16, 4, 4, ERA1.warn);
        p(4, 10, 4, 4, ERA1.warn); p(16, 10, 4, 4, ERA1.warn);
        p(10, 10, 4, 4, ERA1.tooltip); p(11, 16, 2, 6, ERA1.olive); break;
      case 'bird':
        p(6, 9, 12, 6, ERA1.titleBlue); p(13, 6, 6, 5, ERA1.titleBlue);
        p(18, 8, 4, 2, ERA1.warn); p(8, 10, 6, 3, ERA1.navy); p(2, 10, 5, 3, ERA1.titleBlue); break;
      case 'heart':
        p(5, 6, 6, 6, ERA1.warn); p(13, 6, 6, 6, ERA1.warn);
        p(6, 10, 12, 4, ERA1.warn); p(8, 13, 8, 3, ERA1.warn); p(10, 16, 4, 2, ERA1.warn); break;
      case 'moon': // a C-shaped crescent (open to the right)
        p(9, 2, 7, 3, ERA1.tooltip); p(6, 4, 4, 4, ERA1.tooltip);
        p(5, 8, 4, 6, ERA1.tooltip); p(6, 14, 4, 4, ERA1.tooltip);
        p(9, 17, 7, 3, ERA1.tooltip); break;
      default:
        p(4, 4, 16, 16, ERA1.silver);
    }
  }

  /** O3 — profile creation: name pre-filled, pick icon + 3 chips + 1 goal */
  private drawReinterpProfile(W: number, H: number): void {
    const { ctx } = this;
    ui.px(ctx, 0, 0, W, H, ERA1.teal);
    const wx = 26, wy = 12, ww = 460, wh = 360;
    const c = ui.windowFrame(ctx, wx, wy, ww, wh, opening.o3_window_title, true);
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.beige);
    const L = c.x + 8;

    // name — already filled in (they know it)
    ui.setFont(ctx, 13);
    ctx.fillStyle = ERA1.navy;
    ctx.fillText(`${opening.o3_name_label} ${ledger.name}`, L, c.y + 6);
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.grey;
    ctx.fillText(`(${opening.o3_name_note})`, L, c.y + 24);

    // icon grid
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(opening.o3_icon_prompt, L, c.y + 40);
    const icons = opening.o3_icons as { id: string; label: string }[];
    const cellW = 70, iconRowY = c.y + 54;
    icons.forEach((ic, i) => {
      const cellX = L + i * cellW;
      const boxX = cellX + 12, boxY = iconRowY, boxS = 40;
      ui.bevel(ctx, boxX, boxY, boxS, boxS, true);
      ui.px(ctx, boxX + 2, boxY + 2, boxS - 4, boxS - 4, ERA1.paper);
      this.drawProfileIcon(boxX + 8, boxY + 6, ic.id);
      if (this.profileIcon === ic.id) { // selection ring
        ui.px(ctx, boxX - 1, boxY - 1, boxS + 2, 2, ERA1.navy);
        ui.px(ctx, boxX - 1, boxY + boxS - 1, boxS + 2, 2, ERA1.navy);
        ui.px(ctx, boxX - 1, boxY - 1, 2, boxS + 2, ERA1.navy);
        ui.px(ctx, boxX + boxS - 1, boxY - 1, 2, boxS + 2, ERA1.navy);
      }
      this.hits.push({ x: boxX, y: boxY, w: boxS, h: boxS, id: `picon:${ic.id}` });
    });

    // chips — pick three
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(opening.o3_chip_prompt, L, c.y + 108);
    ui.setFont(ctx, 9);
    ctx.fillStyle = this.profileChips.length === 3 ? ERA1.ok : ERA1.grey;
    ctx.fillText(`(${opening.o3_chip_count}: ${this.profileChips.length}/3)`, L + 210, c.y + 108);
    const chips = opening.o3_chips as { id: string; label: string }[];
    const chipW = 142, chipH = 18, chipGap = 6;
    chips.forEach((ch, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const x = L + col * (chipW + chipGap);
      const y = c.y + 124 + row * (chipH + 4);
      const on = this.profileChips.includes(ch.id);
      ui.bevel(ctx, x, y, chipW, chipH, !on); // selected → sunken
      ui.setFont(ctx, 10);
      ctx.fillStyle = on ? ERA1.navy : ERA1.black;
      ctx.fillText(ch.label, x + 6, y + 4);
      this.hits.push({ x, y, w: chipW, h: chipH, id: `pchip:${ch.id}` });
    });

    // goal — insisted; no neutral option; declining files too
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(opening.o3_goal_prompt, L, c.y + 176);
    const goals = opening.o3_goals as { id: string; label: string }[];
    goals.forEach((g, i) => {
      const y = c.y + 192 + i * 18;
      const on = this.profileGoal === g.id;
      ui.px(ctx, L + 1, y + 1, 10, 10, ERA1.white);
      ui.px(ctx, L + 1, y + 1, 10, 1, ERA1.grey);
      ui.px(ctx, L + 1, y + 1, 1, 10, ERA1.grey);
      if (on) ui.px(ctx, L + 3, y + 3, 6, 6, ERA1.navy);
      ui.setFont(ctx, 10);
      ctx.fillStyle = ERA1.black;
      ctx.fillText(g.label, L + 18, y + 1);
      this.hits.push({ x: L, y, w: 260, h: 14, id: `pgoal:${g.id}` });
    });
    const declineY = c.y + 192 + goals.length * 18 + 2;
    ui.setFont(ctx, 9);
    ctx.fillStyle = this.profileGoal === 'declined' ? ERA1.navy : ERA1.grey;
    ctx.fillText(`— ${opening.o3_goal_decline}`, L + 18, declineY);
    this.hits.push({ x: L + 12, y: declineY - 2, w: 200, h: 14, id: 'pgoal:declined' });

    // confirm / leave
    const armed = this.profileIcon !== '' && this.profileChips.length === 3 && this.profileGoal !== '';
    ui.button(ctx, c.x + c.w - 92, c.y + c.h - 26, 84, 20, opening.o3_continue, {
      disabled: !armed, hover: this.hover === 'r-continue' && armed
    });
    if (armed) this.hits.push({ x: c.x + c.w - 92, y: c.y + c.h - 26, w: 84, h: 20, id: 'r-continue' });
    ui.button(ctx, c.x, c.y + c.h - 26, 64, 20, opening.o3_leave, { hover: this.hover === 'r-leave' });
    this.hits.push({ x: c.x, y: c.y + c.h - 26, w: 64, h: 20, id: 'r-leave' });
  }

  /** O3 close — the picks come back RE-CAPTIONED in the system's categories */
  private drawReinterpRecap(W: number, H: number): void {
    const { ctx } = this;
    ui.px(ctx, 0, 0, W, H, ERA1.teal);
    const wx = 46, wy = 20, ww = 420, wh = 344;
    const c = ui.windowFrame(ctx, wx, wy, ww, wh, opening.o3_recap_title, true);
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.paper);
    const L = c.x + 10;
    ui.setFont(ctx, 11);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(opening.o3_recap_intro, L, c.y + 8);

    const recap = opening.recaptions as {
      icon: Record<string, string>; chip: Record<string, string>; goal: Record<string, string>;
    };
    let y = c.y + 34;
    const section = (label: string): void => {
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.warnDark;
      ctx.fillText(label.toUpperCase(), L, y);
      y += 12;
    };
    const row = (line: string): void => {
      ui.setFont(ctx, 11);
      ctx.fillStyle = ERA1.black;
      ctx.fillText(`· ${line}`, L + 6, y);
      y += 16;
    };

    section(opening.o3_recap_icon_label);
    row(recap.icon[this.profileIcon] ?? this.profileIcon);
    y += 4;
    section(opening.o3_recap_chips_label);
    for (const ch of this.profileChips) row(recap.chip[ch] ?? ch);
    y += 4;
    section(opening.o3_recap_goal_label);
    row(recap.goal[this.profileGoal] ?? this.profileGoal);

    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.grey;
    ctx.fillText(opening.o3_recap_footer, L, c.y + c.h - 44);

    ui.button(ctx, c.x + c.w - 84, c.y + c.h - 26, 76, 20, opening.o3_recap_continue, {
      hover: this.hover === 'r-enter'
    });
    this.hits.push({ x: c.x + c.w - 84, y: c.y + c.h - 26, w: 76, h: 20, id: 'r-enter' });
    ui.button(ctx, c.x, c.y + c.h - 26, 64, 20, opening.o3_leave, { hover: this.hover === 'r-leave' });
    this.hits.push({ x: c.x, y: c.y + c.h - 26, w: 64, h: 20, id: 'r-leave' });
  }

  /** click routing for the reinterp opening beats (O2/O3) */
  private handleOpeningClick(id: string): void {
    if (id === 'r-leave') { this.leave(); return; }
    if (this.phase === 'r_boot') { this.setPhase('r_profile'); return; } // any click skips the crawl
    if (this.phase === 'r_profile') {
      if (id.startsWith('picon:')) { this.profileIcon = id.slice(6); this.dirty = true; return; }
      if (id.startsWith('pchip:')) {
        const c = id.slice(6);
        const i = this.profileChips.indexOf(c);
        if (i >= 0) this.profileChips.splice(i, 1);
        else if (this.profileChips.length < 3) this.profileChips.push(c);
        this.dirty = true; return;
      }
      if (id.startsWith('pgoal:')) { this.profileGoal = id.slice(6); this.dirty = true; return; }
      if (id === 'r-continue') this.commitProfile();
      return;
    }
    if (this.phase === 'r_recap' && id === 'r-enter') this.setPhase('desktop'); // identical routing
  }

  /** file the picks to the in-memory ledger, then show the re-captioning */
  private commitProfile(): void {
    if (this.profileIcon === '' || this.profileChips.length !== 3 || this.profileGoal === '') return;
    if (!this.profileFiled) {
      ledger.tags.push(`profile:icon:${this.profileIcon}`);
      for (const c of this.profileChips) ledger.tags.push(`profile:chip:${c}`);
      ledger.tags.push(`profile:goal:${this.profileGoal}`);
      this.profileFiled = true;
    }
    this.setPhase('r_recap');
  }

  // ── debug: jump between reinterp beats (dev panel; gated by ?debug=1) ────
  // Ported from the shipped build's debugJump grammar, scoped to the beats
  // this worktree's OS actually has. Never reachable without the flag.
  debugJump(beat: string): void {
    this.paused = false;
    switch (beat) {
      case 'off': this.setPhase('off'); break;
      case 'boot':
        ledger.name = opening.o3_prefilled_name;
        this.rBootChars = 0;
        this.setPhase('r_boot');
        break;
      case 'profile': this.setPhase('r_profile'); break;
      case 'recap': {
        // the recap needs picks on file — fill from the real option sets
        const icons = opening.o3_icons as { id: string }[];
        const chips = opening.o3_chips as { id: string }[];
        const goals = opening.o3_goals as { id: string }[];
        if (this.profileIcon === '') this.profileIcon = icons[0]?.id ?? 'icon';
        while (this.profileChips.length < 3 && chips[this.profileChips.length]) {
          this.profileChips.push(chips[this.profileChips.length].id);
        }
        if (this.profileGoal === '') this.profileGoal = goals[0]?.id ?? 'declined';
        this.setPhase('r_recap');
        break;
      }
      case 'desktop': this.setPhase('desktop'); break;
      case 'kit': this.setPhase('desktop'); if (!this.kit) this.insertKit(); break;
      case 'pillow':
        this.setPhase('desktop');
        this.openProvotype(pillowProvotypeData as unknown as Provotype);
        break;
      case 'intake':
        this.setPhase('desktop');
        this.openProvotype(originIntakeProvotypeData as unknown as Provotype);
        break;
      case 'update2': this.setPhase('desktop'); this.armUpdate('u2'); break;
      case 'update3': this.setPhase('desktop'); this.armUpdate('u3'); break;
      case 'update4': this.setPhase('desktop'); this.armUpdate('u4'); break;
      case 'closeUpdate': this.setPhase('desktop'); this.armUpdate('close'); break;
      case 'send-s1': this.setPhase('desktop'); this.offerSend('s1'); break;
      case 'send-s2': this.setPhase('desktop'); this.offerSend('s2'); break;
      case 'send-s3': this.setPhase('desktop'); this.offerSend('s3'); break;
      case 'send-s4': this.setPhase('desktop'); this.offerSend('s4'); break;
    }
    this.dirty = true;
  }

  // ── input ──────────────────────────────────────────────────────────────
  handleMove(x: number, y: number): void {
    if (this.phase === 'desktop' && this.provotype?.open) { this.provotype.handleMove(x, y); return; }
    const hit = this.hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    const id = hit ? hit.id : '';
    if (id !== this.hover) { this.hover = id; this.dirty = true; }
  }

  handleClick(x: number, y: number): void {
    const hit = this.hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (this.paused) {
      if (hit?.id === 'resume') this.paused = false;
      if (hit?.id === 'pleave') this.leave();
      this.dirty = true;
      return;
    }
    if (this.phase === 'off') { // any click on the dark glass = the switch
      this.powerOn();
      return;
    }
    // reinterp opening beats (O2/O3) own the monitor's clicks
    if (this.phase === 'r_boot' || this.phase === 'r_profile' || this.phase === 'r_recap') {
      this.handleOpeningClick(hit ? hit.id : '');
      return;
    }
    // the update ritual is SYSTEM-modal while visible — it owns every click
    if (this.phase === 'desktop' && this.updateApp?.open && this.updateApp.visible) {
      this.updateApp.handleClick(x, y);
      this.dirty = true;
      return;
    }
    // the provotype is modal while open — it owns the desktop's clicks
    if (this.phase === 'desktop' && this.provotype?.open) { this.provotype.handleClick(x, y); return; }
    if (hit) {
      switch (hit.id) {
        case 'continue': this.setPhase('off'); break;
        case 'leave': this.leave(); break;
        case 'ok': this.confirmName(); break;
        case 'icon-a': this.insertKit(); break;
        case 'icon-irc': if (this.irc) this.irc.open = true; break;
        case 'icon-dossier': this.dossierOpen = true; break;
        case 'dossier-close': this.dossierOpen = false; break;
        case 'icon-provotype': this.openProvotype(pillowProvotypeData as unknown as Provotype); break;
        case 'icon-provotype-intake': this.openProvotype(originIntakeProvotypeData as unknown as Provotype); break;
        case 'icon-send': if (this.sendOffer) { this.sendOffer.open = true; this.toast = null; } break;
        case 'send-go': this.resolveSend('visited'); break;
        case 'send-decline': this.resolveSend('declined'); break;
      }
      this.dirty = true;
      return;
    }
    if (this.phase === 'desktop' && this.kit?.open) { this.kit.handleClick(x, y); return; }
    if (this.phase === 'desktop' && this.irc?.open) this.irc.handleClick(x, y);
  }

  handleKey(key: string): boolean {
    if (key === 'Escape') {
      if (this.phase === 'desktop' || this.phase === 'name'
          || this.phase === 'r_boot' || this.phase === 'r_profile' || this.phase === 'r_recap') {
        this.paused = !this.paused;
        this.dirty = true;
        return true;
      }
      return false;
    }
    if (this.paused) return true;

    if (this.phase === 'r_boot' && key === 'Enter') { this.setPhase('r_profile'); return true; }

    if (this.phase === 'warning' && key === 'Enter' && this.phaseT >= WARNING_ARM_DELAY) {
      this.setPhase('off');
      return true;
    }
    if (this.phase === 'off' && key === 'Enter') {
      this.powerOn();
      return true;
    }
    if (this.phase === 'splash' && key === 'Enter') { // skippable
      this.setPhase('name');
      return true;
    }
    if (this.phase === 'name' && !this.greeting) {
      if (key === 'Enter') { this.confirmName(); return true; }
      if (key === 'Backspace') { this.nameInput = this.nameInput.slice(0, -1); this.dirty = true; return true; }
      if (key.length === 1 && this.nameInput.length < 24) { this.nameInput += key; this.dirty = true; return true; }
    }
    if (this.phase === 'desktop' && this.kit?.open) {
      if (key === 'Enter') { this.kit.advance(); return true; }
      return key.length === 1; // reading, not typing — swallow strays
    }
    if (this.phase === 'desktop' && this.irc) {
      if (key === 'Enter') { this.irc.submit(); return true; }
      if (key === 'Backspace') { this.irc.backspace(); return true; }
      if (key.toLowerCase() === 'd' && this.dossierUnlocked && this.irc.userMessageCount === 0) {
        // 'd' opens the dossier only when not mid-typing — typing wins
      }
      if (key.length === 1) { this.irc.typeChar(key); return true; }
    }
    return false;
  }

  private confirmName(): void {
    const trimmed = this.nameInput.trim();
    if (!trimmed) return;
    ledger.name = trimmed; // memory only — see ledger.ts invariants
    this.greeting = true;
    this.phaseT = 0;
    this.dirty = true;
  }

  private leave(): void {
    wipeLedger();
    this.paused = false;
    this.setPhase('left');
    this.onLeave?.();
  }

  /** external Leave — the reinterp O1 start-screen overlay lives outside the
   *  monitor canvas, so it drives the wipe/exit through here (rail: Leave
   *  works from the disclaimer onward). */
  leaveNow(): void { this.leave(); }
}
