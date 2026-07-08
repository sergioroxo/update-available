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
  browser: { x: 304, y: 210, w: 76, h: 22 },
  vr: { x: 390, y: 210, w: 64, h: 22 },
  autoOn: { x: 346, y: 246, w: 40, h: 22 },
  autoOff: { x: 396, y: 246, w: 40, h: 22 },
  leave: { x: 42, y: 248, w: 72, h: 24 },
  continue: { x: 370, y: 248, w: 104, h: 24 }
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

  private drawStartupPhoto(x: number, y: number, caption: string, tint: string): void {
    const { ctx } = this;
    px(ctx, x, y, 54, 66, ERA1.paper);
    px(ctx, x + 5, y + 6, 44, 36, tint);
    px(ctx, x + 16, y + 17, 8, 10, ERA1.beige);
    px(ctx, x + 28, y + 17, 8, 10, ERA1.tooltip);
    px(ctx, x + 13, y + 28, 26, 12, ERA1.greyDark);
    px(ctx, x + 25, y - 3, 5, 5, ERA1.warn);
    setFont(ctx, 7);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(this.fitText(caption, 46), x + 5, y + 50);
  }

  private drawStartupScrap(x: number, y: number, w: number, h: number, label: string, fill: string, pinColor: string = ERA1.warn): void {
    const { ctx } = this;
    px(ctx, x, y, w, h, fill);
    px(ctx, x, y, w, 1, ERA1.olive);
    px(ctx, x, y + h - 1, w, 1, ERA1.warnDark);
    px(ctx, x + Math.round(w / 2) - 2, y - 3, 5, 5, pinColor);
    setFont(ctx, 8);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(this.fitText(label, w - 8), x + 4, y + 8);
  }

  private drawStartupBoard(): void {
    const { ctx } = this;
    const W = ERA1_CANVAS.width;
    const H = ERA1_CANVAS.height;
    px(ctx, 0, 0, W, H, '#9b6a3d');
    for (let y = 0; y < H; y += 10) {
      for (let x = (y / 10) % 2 === 0 ? 4 : 10; x < W; x += 16) px(ctx, x, y, 2, 2, '#d8bb82');
    }
    px(ctx, 6, 6, W - 12, 7, '#6f4323');
    px(ctx, 6, H - 13, W - 12, 7, '#4e2d17');
    px(ctx, 6, 6, 7, H - 12, '#8b5a32');
    px(ctx, W - 13, 6, 7, H - 12, '#4e2d17');

    this.drawStartupScrap(34, 24, 64, 28, (opening.o1_board_stickers as string[])[0], '#d8c5df', '#315db5');
    this.drawStartupScrap(390, 28, 76, 30, (opening.o1_board_stickers as string[])[1], '#b9d7a0', '#2f9c51');
    this.drawStartupScrap(414, 64, 54, 24, (opening.o1_board_stickers as string[])[2], '#efcf4a', '#2f9c51');
    this.drawStartupScrap(34, 205, 86, 30, (opening.o1_board_clippings as { title: string }[])[1].title, '#e7dcc5', '#315db5');
    this.drawStartupScrap(380, 155, 94, 34, `${(opening.o1_board_clippings as { title: string }[])[0].title}: ${(opening.o1_board_clippings as { body: string }[])[0].body}`, '#e7dcc5', '#315db5');
    this.drawStartupPhoto(38, 94, (opening.o1_board_polaroids as { caption: string }[])[0].caption, '#b88b4e');
    this.drawStartupPhoto(410, 92, (opening.o1_board_polaroids as { caption: string }[])[2].caption, '#b7c4b7');
    this.drawStartupPhoto(430, 190, (opening.o1_board_polaroids as { caption: string }[])[3].caption, '#caa08b');

    px(ctx, 124, 24, 264, 30, ERA1.paper);
    px(ctx, 130, 22, 6, 6, ERA1.grey);
    px(ctx, 374, 22, 6, 6, ERA1.grey);
    setFont(ctx, 16);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(opening.o1_disclaimer_title.toUpperCase(), 172, 34);

    px(ctx, 76, 64, 360, 112, ERA1.paper);
    px(ctx, 76, 64, 360, 1, ERA1.beige);
    px(ctx, 76, 175, 360, 1, ERA1.warnDark);
    px(ctx, 85, 61, 6, 6, ERA1.warn);
    px(ctx, 426, 61, 6, 6, '#315db5');
    setFont(ctx, 9);
    ctx.fillStyle = ERA1.black;
    let yy = 78;
    for (const line of opening.o1_disclaimer as string[]) {
      yy = this.drawWrapped(line, 94, yy, 310, 13, 3) + 4;
      if (yy > 154) break;
    }
    setFont(ctx, 8);
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText((opening.o1_board_margin_notes as string[])[0], 292, 159);

    px(ctx, 84, 182, 348, 18, '#e7d1a6');
    px(ctx, 84, 182, 4, 18, ERA1.warnDark);
    setFont(ctx, 8);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(
      this.startup.platform === 'vr' ? opening.o1_controls_vr : opening.o1_controls_browser,
      94,
      188
    );

    setFont(ctx, 10);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(opening.o1_options_title, 102, 211);
    setFont(ctx, 8);
    ctx.fillText(opening.o1_platform_label, 140, 218);
    ctx.fillText(opening.o1_autocam_label, 170, 254);
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
    px(ctx, 0, 0, W, H, ERA1.olive);
    for (let y = 0; y < H; y += 12) {
      for (let x = (y / 12) % 2 === 0 ? 0 : 6; x < W; x += 12) px(ctx, x, y, 2, 2, ERA1.beige);
    }
    px(ctx, 8, 8, W - 16, 6, ERA1.warnDark);
    px(ctx, 8, H - 14, W - 16, 6, ERA1.warnDark);
    px(ctx, 8, 8, 6, H - 16, ERA1.warnDark);
    px(ctx, W - 14, 8, 6, H - 16, ERA1.warnDark);
    px(ctx, 18, 18, W - 36, H - 36, ERA1.olive);
    for (let y = 24; y < H - 24; y += 10) {
      for (let x = 24 + ((y / 10) % 3) * 3; x < W - 24; x += 15) px(ctx, x, y, 1, 1, ERA1.tooltip);
    }
    setFont(ctx, 12);
    ctx.fillStyle = ERA1.tooltip;
    ctx.fillText(opening.o3_board_title, 28, 28);
    setFont(ctx, 8);
    ctx.fillStyle = ERA1.beige;
    ctx.fillText(opening.o3_board_hint, W - 202, H - 28);

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
