/**
 * mIRC beat (scene s1_1, register: operable) — the safest room he's found,
 * and the surface where belonging becomes a data point. Script lives in
 * data/dialog/s1_irc.json; this file is mechanics only.
 */
import { ERA1 } from '../theme/era1';
import * as ui from '../theme/chrome';
import { ledger } from '../../state/ledger';
import dialog from '../../../data/dialog/s1_irc.json';

interface Line { from: string; text: string }

const AMBIENT_INTERVAL = 3.2; // s between scripted channel lines
const DM_DELAY = 3.5; // s after the 2nd user message

export class IrcApp {
  open = true;
  dmOpen = false;
  focus: 'channel' | 'dm' = 'channel';

  private log: Line[] = [];
  private dmLog: Line[] = [];
  private input = '';
  private dmInput = '';
  private t = 0;
  private nextAmbientAt = 1.2;
  private ambientIdx = 0;
  private userMessages = 0;
  private dmAt = Infinity;
  private dmIdx = 0;
  private nextDmLineAt = 0;
  private dmReplied = false;
  /** fires once when the DM script has fully played (→ log toast, flip pulse) */
  onHooked?: () => void;
  private hooked = false;
  dirty = true;

  private fill(text: string): string {
    return text.replace('{name}', ledger.name);
  }

  update(dt: number): void {
    this.t += dt;
    // ambient channel chatter
    if (this.ambientIdx < dialog.ambient.length && this.t >= this.nextAmbientAt) {
      this.log.push(dialog.ambient[this.ambientIdx]);
      this.ambientIdx++;
      this.nextAmbientAt = this.t + AMBIENT_INTERVAL + Math.random() * 1.5;
      this.dirty = true;
    }
    // the DM arrives, line by line
    if (this.t >= this.dmAt && this.dmIdx < dialog.dm.length && this.t >= this.nextDmLineAt) {
      if (!this.dmOpen) { this.dmOpen = true; this.focus = 'dm'; }
      this.dmLog.push({ from: 'MentorRob', text: this.fill(dialog.dm[this.dmIdx]) });
      this.dmIdx++;
      this.nextDmLineAt = this.t + 2.4;
      this.dirty = true;
      if (this.dmIdx === dialog.dm.length && !this.hooked) {
        this.hooked = true;
        // the private thing becomes a record — the slice's first ledger sting
        if (!ledger.records.includes('mirc-log')) ledger.records.push('mirc-log');
        if (!ledger.tags.includes('pastoral-referral')) ledger.tags.push('pastoral-referral');
        this.onHooked?.();
      }
    }
  }

  /** user pressed Enter in whichever window has focus */
  submit(): void {
    if (this.focus === 'channel' && this.input.trim()) {
      this.log.push({ from: ledger.name, text: this.input.trim() });
      this.input = '';
      this.userMessages++;
      if (this.userMessages === 1) {
        this.log.push({ from: dialog.welcome.from, text: this.fill(dialog.welcome.text) });
      } else if (this.userMessages === 2) {
        this.log.push({ from: dialog.secondReply.from, text: this.fill(dialog.secondReply.text) });
        this.dmAt = this.t + DM_DELAY;
        this.nextDmLineAt = this.t + DM_DELAY;
      }
      this.dirty = true;
    } else if (this.focus === 'dm' && this.dmInput.trim()) {
      this.dmLog.push({ from: ledger.name, text: this.dmInput.trim() });
      this.dmInput = '';
      if (!this.dmReplied && this.hooked) {
        this.dmReplied = true;
        this.dmLog.push({ from: 'MentorRob', text: dialog.dmReply });
      }
      this.dirty = true;
    }
  }

  typeChar(ch: string): void {
    if (this.focus === 'channel' && this.input.length < 60) this.input += ch;
    else if (this.focus === 'dm' && this.dmInput.length < 60) this.dmInput += ch;
    this.dirty = true;
  }

  backspace(): void {
    if (this.focus === 'channel') this.input = this.input.slice(0, -1);
    else this.dmInput = this.dmInput.slice(0, -1);
    this.dirty = true;
  }

  get userMessageCount(): number {
    return this.userMessages;
  }

  /** clip to the column — never let a line run under the user list */
  private clipped(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
    if (ctx.measureText(text).width <= maxW) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t + '…';
  }

  // ── drawing ────────────────────────────────────────────────────────────
  draw(ctx: CanvasRenderingContext2D, caretOn: boolean): void {
    // channel window (4:3 era canvas — 512×384)
    const c = ui.windowFrame(ctx, 14, 30, 400, 290, `${dialog.channel} — IRC`, this.focus === 'channel');
    ui.px(ctx, c.x, c.y, c.w, c.h - 22, ERA1.black);
    // user list strip
    const listW = 78;
    ui.px(ctx, c.x + c.w - listW, c.y, listW, c.h - 22, ERA1.tealDark);
    ui.setFont(ctx, 9);
    ctx.fillStyle = ERA1.silver;
    [...dialog.users, ledger.name].forEach((u, i) => {
      ctx.fillText(u.slice(0, 11), c.x + c.w - listW + 4, c.y + 4 + i * 11);
    });
    // log (last N lines)
    const logW = c.w - listW - 6;
    const maxLines = 18;
    const shown = this.log.slice(-maxLines);
    ui.setFont(ctx, 9);
    shown.forEach((l, i) => {
      const y = c.y + 4 + i * 12;
      ctx.fillStyle = l.from === ledger.name ? ERA1.tooltip : ERA1.ok;
      const prefix = `<${l.from}> `;
      ctx.fillText(prefix, c.x + 4, y);
      ctx.fillStyle = ERA1.silver;
      const px = ctx.measureText(prefix).width;
      ctx.fillText(this.clipped(ctx, l.text, logW - 8 - px), c.x + 4 + px, y);
    });
    // input bar
    ui.inputField(ctx, c.x, c.y + c.h - 20, c.w, 18, this.input, caretOn && this.focus === 'channel');

    // DM window, overlapping — intimacy arrives on top of community
    if (this.dmOpen) {
      const d = ui.windowFrame(ctx, 170, 140, 300, 170, dialog.dmTitle, this.focus === 'dm');
      ui.px(ctx, d.x, d.y, d.w, d.h - 22, ERA1.paper);
      ui.setFont(ctx, 9);
      const dmShown = this.dmLog.slice(-9);
      dmShown.forEach((l, i) => {
        const y = d.y + 4 + i * 12;
        ctx.fillStyle = l.from === ledger.name ? ERA1.navy : ERA1.warnDark;
        const prefix = `${l.from}: `;
        ctx.fillText(prefix, d.x + 4, y);
        ctx.fillStyle = ERA1.black;
        const px = ctx.measureText(prefix).width;
        ctx.fillText(this.clipped(ctx, l.text, d.w - 12 - px), d.x + 4 + px, y);
      });
      ui.inputField(ctx, d.x, d.y + d.h - 20, d.w, 18, this.dmInput, caretOn && this.focus === 'dm');
    }
  }

  /** crude hit-test: clicking the lower window region switches focus */
  handleClick(x: number, y: number): void {
    if (this.dmOpen && x >= 170 && x <= 470 && y >= 140 && y <= 310) this.focus = 'dm';
    else if (x >= 14 && x <= 414 && y >= 30 && y <= 320) this.focus = 'channel';
    this.dirty = true;
  }
}
