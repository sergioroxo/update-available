/**
 * The witness side — the INTAKE RECORD, computed live from the ledger
 * (SCRIPT_UPDATE v0.3 Part V / v0.5: every field traceable to something the
 * player actually did). Register law: this surface is SHARP and cold —
 * surveillance is high-definition. It never responds to input.
 */
import { ERA1, ERA1_CANVAS, RENDER_SCALE } from '../desktop/theme/era1';
import { px, setFont } from '../desktop/theme/chrome';
import { ledger } from '../state/ledger';
import strings from '../../data/strings/slice.json';
import opening from '../../data/strings/opening.json';

const INK = '#aabbcc';
const DIM = '#556677';
const PANEL = '#0d0d1a';
const FIELD = '#0a0a15';
const LINE = '#222244';
const HARDEN_SECONDS = 2.2;

interface OpeningProfileSnapshot {
  active: boolean;
  icon: string;
  chips: string[];
  goal: string;
  filed: boolean;
}

export interface StartupBoardChoices {
  platform: 'browser' | 'vr';
  autoCam: boolean;
}

type StartupBoardAction = 'continue' | 'leave' | 'handled' | null;

const STARTUP_HITS = {
  browser: { x: 258, y: 216, w: 84, h: 22 },
  vr: { x: 354, y: 216, w: 68, h: 22 },
  autoOn: { x: 318, y: 238, w: 44, h: 22 },
  autoOff: { x: 374, y: 238, w: 44, h: 22 },
  leave: { x: 44, y: 260, w: 72, h: 22 },
  continue: { x: 384, y: 260, w: 94, h: 22 }
} as const;

export class WitnessCanvas {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private t = 0;
  /** message count is sampled at flip time so the record reads as "filed" */
  messagesOnFile = 0;
  dirty = true;
  private openingProfile: OpeningProfileSnapshot = { active: false, icon: '', chips: [], goal: '', filed: false };
  private hardenT = HARDEN_SECONDS;
  private startup = {
    active: false,
    armed: false,
    platform: 'browser' as 'browser' | 'vr',
    autoCam: false
  };

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = ERA1_CANVAS.width * RENDER_SCALE;
    this.canvas.height = ERA1_CANVAS.height * RENDER_SCALE;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.scale(RENDER_SCALE, RENDER_SCALE); // layout stays logical
  }

  setOpeningProfile(profile: OpeningProfileSnapshot): void {
    const wasFiled = this.openingProfile.filed;
    this.openingProfile = {
      active: profile.active,
      icon: profile.icon,
      chips: [...profile.chips],
      goal: profile.goal,
      filed: profile.filed
    };
    if (!wasFiled && profile.filed) this.hardenT = 0;
    this.dirty = true;
  }

  setStartupBoard(active: boolean, armed: boolean): void {
    this.startup.active = active;
    this.startup.armed = armed;
    this.dirty = true;
  }

  startupChoices(): StartupBoardChoices {
    return { platform: this.startup.platform, autoCam: this.startup.autoCam };
  }

  handleStartupClick(x: number, y: number): StartupBoardAction {
    if (!this.startup.active) return null;
    const inBox = (b: { x: number; y: number; w: number; h: number }): boolean =>
      x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
    if (inBox(STARTUP_HITS.browser)) this.startup.platform = 'browser';
    else if (inBox(STARTUP_HITS.vr)) this.startup.platform = 'vr';
    else if (inBox(STARTUP_HITS.autoOn)) this.startup.autoCam = true;
    else if (inBox(STARTUP_HITS.autoOff)) this.startup.autoCam = false;
    else if (inBox(STARTUP_HITS.leave)) return 'leave';
    else if (inBox(STARTUP_HITS.continue) && this.startup.armed) return 'continue';
    else return null;
    this.dirty = true;
    return 'handled';
  }

  update(dt: number): void {
    this.t += dt;
    this.dirty = true;
    if (this.hardenT < HARDEN_SECONDS) this.hardenT = Math.min(HARDEN_SECONDS, this.hardenT + dt);
    const profileLines = this.profileRecaptionLines();
    // R26: the same rear-wall surface begins as the warm O3 cork board, then
    // hardens into the cold record. Once filed, the existing intake content
    // remains the authority; profile clicks merely add traceable filed lines.
    if (this.startup.active) {
      this.drawStartupBoard();
    } else if (this.openingProfile.active && !this.openingProfile.filed) {
      this.drawCorkBoard();
    } else if (this.hardenT < HARDEN_SECONDS) {
      this.drawHardening();
    } else if (
      ledger.records.includes('kit-inserted') || ledger.provotypes.length > 0
      || ledger.sends.length > 0 || profileLines.length > 0
    ) {
      this.draw();
    } else {
      this.drawDormant();
    }
  }

  /** before activation: a dark wall, barely breathing — not yet a system */
  private drawDormant(): void {
    const { ctx } = this;
    const W = ERA1_CANVAS.width;
    const H = ERA1_CANVAS.height;
    px(ctx, 0, 0, W, H, '#05050a');
    const pulse = Math.floor(this.t * 0.8) % 2 === 0;
    setFont(ctx, 10);
    ctx.fillStyle = pulse ? '#15151f' : '#1d1d2c';
    ctx.fillText(strings.witness.dormant, Math.round(W / 2) - 10, Math.round(H / 2) - 5);
  }

  private field(label: string, value: string, y: number, valueColor = INK): void {
    const { ctx } = this;
    setFont(ctx, 9);
    ctx.fillStyle = DIM;
    ctx.fillText(label, 28, y + 3);
    const vx = 170;
    const vw = ERA1_CANVAS.width - vx - 28;
    px(ctx, vx, y, vw, 16, FIELD);
    px(ctx, vx, y, vw, 1, LINE);
    px(ctx, vx, y, 1, 16, LINE);
    px(ctx, vx, y + 15, vw, 1, LINE);
    px(ctx, vx + vw - 1, y, 1, 16, LINE);
    setFont(ctx, 10);
    ctx.fillStyle = valueColor;
    ctx.fillText(this.fitText(value, vw - 12), vx + 6, y + 3);
  }

  private fitText(value: string, maxWidth: number): string {
    const { ctx } = this;
    if (ctx.measureText(value).width <= maxWidth) return value;
    let out = value;
    while (out.length > 3 && ctx.measureText(`${out}...`).width > maxWidth) out = out.slice(0, -1);
    return `${out}...`;
  }

  private optionLabel(kind: 'icon' | 'chip' | 'goal', id: string): string {
    if (id === 'declined') return opening.o3_goal_decline;
    const key = kind === 'icon' ? 'o3_icons' : kind === 'chip' ? 'o3_chips' : 'o3_goals';
    const found = (opening[key] as { id: string; label: string }[]).find(o => o.id === id);
    return found?.label ?? id;
  }

  private profileRecaptionLines(): string[] {
    const recap = opening.recaptions as {
      icon: Record<string, string>; chip: Record<string, string>; goal: Record<string, string>;
    };
    const lines: string[] = [];
    for (const tag of ledger.tags) {
      if (tag.startsWith('profile:icon:')) {
        const id = tag.slice('profile:icon:'.length);
        lines.push(recap.icon[id] ?? id);
      } else if (tag.startsWith('profile:chip:')) {
        const id = tag.slice('profile:chip:'.length);
        lines.push(recap.chip[id] ?? id);
      } else if (tag.startsWith('profile:goal:')) {
        const id = tag.slice('profile:goal:'.length);
        lines.push(recap.goal[id] ?? id);
      }
    }
    return lines;
  }

  private tagsValue(): string {
    const profileLines = this.profileRecaptionLines();
    const other = ledger.tags.filter(t => !t.startsWith('profile:'));
    const parts = [...profileLines, ...other];
    return parts.join(', ') || '—';
  }

  private endingRecordLines(): string[] {
    const e = strings.witness.endingRecords;
    const lines: string[] = [];
    if (ledger.records.includes('enrollment-acknowledged')) lines.push(e.enrollment);
    if (ledger.records.includes('diary-committed')) lines.push(e.diary);
    if (ledger.records.includes('deletion-failed')) lines.push(e.deletion);
    if (ledger.records.includes('diary-glitch')) lines.push(e.glitch);
    return lines;
  }

  private drawPinnedNote(x: number, y: number, w: number, h: number, title: string, body: string, filled: boolean): void {
    const { ctx } = this;
    px(ctx, x, y, w, h, filled ? ERA1.paper : ERA1.beige);
    px(ctx, x, y, w, 1, ERA1.warnDark);
    px(ctx, x, y, 1, h, ERA1.warnDark);
    px(ctx, x, y + h - 1, w, 1, ERA1.olive);
    px(ctx, x + w - 1, y, 1, h, ERA1.olive);
    px(ctx, x + Math.round(w / 2) - 2, y - 3, 5, 5, filled ? ERA1.warn : ERA1.grey);
    setFont(ctx, 8);
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(title, x + 6, y + 6);
    setFont(ctx, 10);
    ctx.fillStyle = filled ? ERA1.black : ERA1.grey;
    ctx.fillText(body || opening.o3_board_empty, x + 6, y + 22);
  }

  private drawWrapped(text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 8): number {
    const { ctx } = this;
    const words = text.split(' ');
    let line = '';
    let yy = y;
    let lines = 0;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, yy);
        yy += lineHeight;
        lines++;
        line = word;
        if (lines >= maxLines) return yy;
      } else {
        line = test;
      }
    }
    if (line && lines < maxLines) {
      ctx.fillText(line, x, yy);
      yy += lineHeight;
    }
    return yy;
  }

  private drawStartupButton(label: string, box: { x: number; y: number; w: number; h: number }, active: boolean, enabled = true): void {
    const { ctx } = this;
    const bg = !enabled ? ERA1.grey : active ? ERA1.warn : ERA1.paper;
    px(ctx, box.x, box.y, box.w, box.h, bg);
    px(ctx, box.x, box.y, box.w, 1, ERA1.warnDark);
    px(ctx, box.x, box.y, 1, box.h, ERA1.warnDark);
    px(ctx, box.x, box.y + box.h - 1, box.w, 1, ERA1.olive);
    px(ctx, box.x + box.w - 1, box.y, 1, box.h, ERA1.olive);
    setFont(ctx, label.length > 10 ? 8 : 9);
    ctx.fillStyle = enabled ? ERA1.black : ERA1.greyDark;
    const tw = ctx.measureText(label).width;
    ctx.fillText(label, box.x + Math.max(4, Math.round((box.w - tw) / 2)), box.y + 7);
  }

  private drawStartupBoard(): void {
    const { ctx } = this;
    const W = ERA1_CANVAS.width;
    const H = ERA1_CANVAS.height;
    ctx.clearRect(0, 0, W, H);

    px(ctx, 142, 18, 228, 30, ERA1.paper);
    px(ctx, 150, 16, 6, 6, '#d0a315');
    px(ctx, 356, 16, 6, 6, '#d0a315');
    setFont(ctx, 16);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(opening.o1_disclaimer_title.toUpperCase(), 172, 34);
    setFont(ctx, 7);
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(opening.o1_board_logo_edge, 314, 12);

    px(ctx, 58, 58, 396, 124, '#f3ead3');
    px(ctx, 58, 58, 396, 1, ERA1.beige);
    px(ctx, 58, 181, 396, 1, ERA1.warnDark);
    px(ctx, 67, 55, 6, 6, ERA1.warn);
    px(ctx, 444, 55, 6, 6, '#315db5');
    setFont(ctx, 9);
    ctx.fillStyle = ERA1.black;
    let yy = 72;
    for (const line of opening.o1_disclaimer as string[]) {
      yy = this.drawWrapped(line, 74, yy, 352, 13, 3) + 4;
      if (yy > 160) break;
    }
    setFont(ctx, 8);
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText((opening.o1_board_margin_notes as string[])[0], 304, 164);

    px(ctx, 58, 188, 396, 16, '#e7d1a6');
    px(ctx, 58, 188, 4, 16, ERA1.warnDark);
    setFont(ctx, 8);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(
      this.startup.platform === 'vr' ? opening.o1_controls_vr : opening.o1_controls_browser,
      70,
      193
    );

    setFont(ctx, 10);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(opening.o1_options_title, 58, 207);
    px(ctx, 58, 219, 396, 1, '#bca36e');
    px(ctx, 58, 228, 396, 54, 'rgba(239, 226, 191, 0.82)');
    setFont(ctx, 8);
    ctx.fillText(opening.o1_platform_label, 74, 222);
    ctx.fillText(opening.o1_autocam_label, 74, 244);
    this.drawStartupButton(opening.o1_platform_browser, STARTUP_HITS.browser, this.startup.platform === 'browser');
    this.drawStartupButton(opening.o1_platform_vr, STARTUP_HITS.vr, this.startup.platform === 'vr');
    this.drawStartupButton(opening.o1_autocam_on, STARTUP_HITS.autoOn, this.startup.autoCam);
    this.drawStartupButton(opening.o1_autocam_off, STARTUP_HITS.autoOff, !this.startup.autoCam);
    this.drawStartupButton(opening.o1_leave, STARTUP_HITS.leave, false);
    this.drawStartupButton(opening.o1_continue, STARTUP_HITS.continue, true, this.startup.armed);
    if (!this.startup.armed) {
      setFont(ctx, 7);
      ctx.fillStyle = ERA1.greyDark;
      ctx.fillText(`(${opening.o1_wait})`, STARTUP_HITS.continue.x + 30, STARTUP_HITS.continue.y - 8);
    }
  }

  private drawCorkBoard(): void {
    const { ctx } = this;
    const W = ERA1_CANVAS.width;
    const H = ERA1_CANVAS.height;
    ctx.clearRect(0, 0, W, H);

    px(ctx, 22, 16, 154, 26, ERA1.paper);
    px(ctx, 30, 13, 5, 5, '#d0a315');
    setFont(ctx, 12);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(opening.o3_board_title, 34, 28);

    px(ctx, W - 198, H - 40, 174, 20, '#e7d1a6');
    px(ctx, W - 190, H - 43, 5, 5, '#315db5');
    setFont(ctx, 8);
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(opening.o3_board_hint, W - 190, H - 32);

    this.drawPinnedNote(
      42, 62, 136, 64,
      opening.o3_board_icon_label,
      this.optionLabel('icon', this.openingProfile.icon),
      this.openingProfile.icon !== ''
    );
    const chips = this.openingProfile.chips.map(c => this.optionLabel('chip', c));
    for (let i = 0; i < 3; i++) {
      this.drawPinnedNote(
        220, 56 + i * 74, 190, 56,
        `${opening.o3_board_chip_label} ${i + 1}`,
        chips[i] ?? '',
        chips[i] !== undefined
      );
    }
    this.drawPinnedNote(
      66, 188, 150, 72,
      opening.o3_board_goal_label,
      this.openingProfile.goal ? this.optionLabel('goal', this.openingProfile.goal) : '',
      this.openingProfile.goal !== ''
    );
  }

  private drawHardening(): void {
    this.drawCorkBoard();
    const { ctx } = this;
    const W = ERA1_CANVAS.width;
    const H = ERA1_CANVAS.height;
    const k = this.hardenT / HARDEN_SECONDS;
    const bands = Math.floor(k * 9);
    for (let i = 0; i < bands; i++) {
      const y = 18 + i * 34;
      px(ctx, 22, y, W - 44, 18, PANEL);
      px(ctx, 22, y + 18, W - 44, 1, LINE);
    }
    setFont(ctx, 10);
    ctx.fillStyle = k > 0.45 ? INK : ERA1.warnDark;
    ctx.fillText(opening.o3_board_hardening, 28, H - 50);
  }

  private draw(): void {
    const { ctx } = this;
    const W = ERA1_CANVAS.width;
    const H = ERA1_CANVAS.height;
    const s = strings.witness;

    px(ctx, 0, 0, W, H, '#05050a');
    // header
    px(ctx, 0, 0, W, 24, PANEL);
    px(ctx, 0, 24, W, 1, LINE);
    setFont(ctx, 11);
    ctx.fillStyle = INK;
    ctx.fillText(s.header, 16, 5);
    setFont(ctx, 8);
    ctx.fillStyle = DIM;
    ctx.fillText(s.subheader, W - 190, 8);

    // computed fields — only things the player actually did
    this.field(s.subject, ledger.name, 40);
    this.field(s.source, s.sourceValue, 62);
    this.field(
      s.trustedContact,
      ledger.tags.includes('pastoral-referral') ? s.trustedMade : s.trustedAssigned,
      84,
      ledger.tags.includes('pastoral-referral') ? '#cc8855' : INK
    );
    this.field(
      s.channelLog,
      ledger.records.includes('went-online')
        ? s.messagesLogged.replace('{n}', String(this.messagesOnFile))
        : s.notOnline,
      106
    );
    this.field(s.tags, this.tagsValue(), 128, ledger.tags.length ? '#cc8855' : INK);
    this.field(s.status, s.statusValue, 150, '#cc8855');

    // the index card — the name copied into the era's filing artifact
    const cx = 28; const cy = 190; const cw = 200; const ch = 64;
    px(ctx, cx, cy, cw, ch, '#15151f');
    px(ctx, cx, cy, cw, 1, LINE);
    px(ctx, cx, cy, 1, ch, LINE);
    px(ctx, cx, cy + ch - 1, cw, 1, LINE);
    px(ctx, cx + cw - 1, cy, 1, ch, LINE);
    for (let i = 1; i < 4; i++) px(ctx, cx + 8, cy + 14 + i * 12, cw - 16, 1, '#1d1d2c');
    setFont(ctx, 10);
    ctx.fillStyle = INK;
    ctx.fillText(ledger.name, cx + 10, cy + 16);
    setFont(ctx, 8);
    ctx.fillStyle = DIM;
    ctx.fillText('index · era 1 · drawer 12', cx + 10, cy + 44);

    // dead FILE button — no raised bevel; it looks inert because it is
    const bx = W - 140; const by = 212;
    px(ctx, bx, by, 110, 22, '#15151f');
    px(ctx, bx, by, 110, 1, LINE);
    px(ctx, bx, by, 1, 22, LINE);
    setFont(ctx, 9);
    ctx.fillStyle = '#333344';
    ctx.fillText(s.file, bx + 22, by + 6);

    // reinterpretation session log — one cold line per provotype filed, and
    // one per SEND event (offered/visited/declined all appear — declining is
    // never invisible, Ethics #10; the cross-reference lines MESH into the
    // same record, ◆N2). Copy comes from each item's own data (resolved at
    // file time), never composed here. Baseline never populates either.
    const profileLines = this.profileRecaptionLines();
    const endingLines = this.endingRecordLines();
    if (profileLines.length > 0 || ledger.provotypes.length > 0 || ledger.sends.length > 0 || endingLines.length > 0) {
      setFont(ctx, 8);
      ctx.fillStyle = DIM;
      ctx.fillText(s.sessionLog, 28, 262);
      setFont(ctx, 9);
      const lines: { text: string; color: string }[] = [
        ...profileLines.map(text => ({ text, color: INK })),
        ...ledger.provotypes.map(p => ({
          text: p.witness || `${p.id}: ${p.outcome}`,
          color: p.outcome === 'abandoned' ? '#cc8855' : INK
        })),
        ...ledger.sends.map(sd => ({
          text: sd.witness || `${sd.id}: ${sd.outcome}`,
          color: sd.outcome === 'declined' ? '#cc8855' : INK
        })),
        ...endingLines.map(text => ({ text, color: '#cc8855' }))
      ];
      lines.forEach((l, i) => {
        ctx.fillStyle = l.color;
        ctx.fillText(l.text, 28, 276 + i * 12);
      });
    }

    // footer
    px(ctx, 0, H - 22, W, 22, PANEL);
    px(ctx, 0, H - 22, W, 1, LINE);
    setFont(ctx, 8);
    ctx.fillStyle = DIM;
    ctx.fillText(s.footer, 16, H - 16);
    const pulse = Math.floor(this.t * 1.5) % 2 === 0;
    if (pulse) {
      ctx.fillStyle = '#445566';
      ctx.fillText(s.hint, W - 180, H - 16);
    }
  }
}
