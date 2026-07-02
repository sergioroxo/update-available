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
import { ledger, wipeLedger } from '../state/ledger';
import strings from '../../data/strings/slice.json';

type Phase = 'warning' | 'off' | 'boot' | 'splash' | 'name' | 'desktop' | 'left';

const SPLASH_SECONDS = 4.6;        // hold the loading screen long enough to read
const BOOT_CPS = 0.030;            // seconds per char — slower BIOS crawl
const BOOT_HOLD = 4.8;             // hold completed BIOS so the install lines read

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

  // desktop
  kit: KitApp | null = null;
  irc: IrcApp | null = null;
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
  }

  get inDesktop(): boolean {
    return this.phase === 'desktop';
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
    if (this.phase === 'name' && this.greeting && this.phaseT > 2.8) {
      this.setPhase('desktop'); // empty desk — the kit is the only way in (S1.1)
    }
    if (this.phase === 'desktop' && !this.kit && !this.kitToastShown && this.phaseT > 6) {
      this.kitToastShown = true;
      this.toast = { text: strings.desktop.kitToast, t: 8 };
    }
    if (this.phase === 'desktop' && this.kit) this.kit.update(dt);
    if (this.phase === 'desktop' && this.irc) this.irc.update(dt);
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
    // windows
    if (this.kit?.open) this.kit.draw(ctx);
    if (this.irc?.open) this.irc.draw(ctx, this.caretOn());
    if (this.dossierOpen) this.drawDossier(W, H);
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

  // ── input ──────────────────────────────────────────────────────────────
  handleMove(x: number, y: number): void {
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
    if (hit) {
      switch (hit.id) {
        case 'continue': this.setPhase('off'); break;
        case 'leave': this.leave(); break;
        case 'ok': this.confirmName(); break;
        case 'icon-a': this.insertKit(); break;
        case 'icon-irc': if (this.irc) this.irc.open = true; break;
        case 'icon-dossier': this.dossierOpen = true; break;
        case 'dossier-close': this.dossierOpen = false; break;
      }
      this.dirty = true;
      return;
    }
    if (this.phase === 'desktop' && this.kit?.open) { this.kit.handleClick(x, y); return; }
    if (this.phase === 'desktop' && this.irc?.open) this.irc.handleClick(x, y);
  }

  handleKey(key: string): boolean {
    if (key === 'Escape') {
      if (this.phase === 'desktop' || this.phase === 'name') {
        this.paused = !this.paused;
        this.dirty = true;
        return true;
      }
      return false;
    }
    if (this.paused) return true;

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
}
