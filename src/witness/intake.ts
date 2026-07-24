/**
 * The witness side — the INTAKE RECORD, computed live from the ledger
 * (SCRIPT_UPDATE v0.3 Part V / v0.5: every field traceable to something the
 * player actually did). Register law: this surface is SHARP and cold —
 * surveillance is high-definition. It never responds to input.
 */
import { ERA1, ERA1_CANVAS, RENDER_SCALE } from '../desktop/theme/era1';
import { px, setFont } from '../desktop/theme/chrome';
import { COLD_BOARD, FLAG, RECORD } from '../desktop/theme/witness';
import { ledger } from '../state/ledger';
import strings from '../../data/strings/slice.json';
import opening from '../../data/strings/opening.json';

// Local aliases onto the witness palette (src/desktop/theme/witness.ts).
const INK = RECORD.ink;
const DIM = RECORD.dim;
const PANEL = RECORD.panel;
const FIELD = RECORD.field;
const LINE = RECORD.line;
const HARDEN_SECONDS = 2.2;

interface OpeningProfileSnapshot {
  active: boolean;
  stage: 'inactive' | 'boot' | 'profile' | 'recap';
  icon: string;
  chips: string[];
  goal: string;
  filed: boolean;
}

export class WitnessCanvas {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private t = 0;
  /** message count is sampled at flip time so the record reads as "filed" */
  messagesOnFile = 0;
  dirty = true;
  private openingProfile: OpeningProfileSnapshot = {
    active: false,
    stage: 'inactive',
    icon: '',
    chips: [],
    goal: '',
    filed: false
  };
  private hardenT = HARDEN_SECONDS;

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
      stage: profile.stage,
      icon: profile.icon,
      chips: [...profile.chips],
      goal: profile.goal,
      filed: profile.filed
    };
    if (!wasFiled && profile.filed) this.hardenT = 0;
    this.dirty = true;
  }

  update(dt: number): void {
    this.t += dt;
    this.dirty = true;
    if (this.hardenT < HARDEN_SECONDS) this.hardenT = Math.min(HARDEN_SECONDS, this.hardenT + dt);
    const profileLines = this.profileRecaptionLines();
    // R26: the same rear-wall surface begins as the warm O3 cork board, then
    // hardens into the cold record. Once filed, the existing intake content
    // remains the authority; profile clicks merely add traceable filed lines.
    // (R28 §4/D48, S40: the "Start-up options" onboarding panel that used to
    // render here first — drawStartupBoard/setStartupBoard/handleStartupClick
    // — is retired; the DOM pre-fiction orienting card is the disclaimer/
    // controls surface now. This board starts at drawDormant() and only wakes
    // once the O3 profile pinning begins.)
    if (this.openingProfile.active && !this.openingProfile.filed) {
      this.drawCorkBoard();
    } else if (this.hardenT < HARDEN_SECONDS) {
      this.drawHardening();
    } else if (
      ledger.records.includes('kit-inserted') || ledger.provotypes.length > 0
      || ledger.sends.length > 0 || profileLines.length > 0
      || ledger.guidance.length > 0 || ledger.records.includes('profile-initialized')
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
    px(ctx, 0, 0, W, H, RECORD.voidBg);
    const pulse = Math.floor(this.t * 0.8) % 2 === 0;
    setFont(ctx, 10);
    ctx.fillStyle = pulse ? RECORD.pulseOn : RECORD.pulseOff;
    ctx.fillText(strings.witness.dormant, Math.round(W / 2) - 10, Math.round(H / 2) - 5);
  }

  private field(label: string, value: string, y: number, valueColor: string = INK): void {
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
    px(ctx, x + 2, y + 3, w, h, 'rgba(0, 0, 0, 0.22)');
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

  private drawCorkBoard(): void {
    const { ctx } = this;
    const W = ERA1_CANVAS.width;
    const H = ERA1_CANVAS.height;
    ctx.clearRect(0, 0, W, H);

    px(ctx, 25, 19, 154, 26, 'rgba(0, 0, 0, 0.16)');
    px(ctx, 22, 16, 154, 26, ERA1.paper);
    px(ctx, 30, 13, 5, 5, COLD_BOARD.pinGold);
    setFont(ctx, 12);
    ctx.fillStyle = ERA1.black;
    ctx.fillText(opening.o3_board_title, 34, 28);

    px(ctx, W - 195, H - 37, 174, 20, 'rgba(0, 0, 0, 0.14)');
    px(ctx, W - 198, H - 40, 174, 20, COLD_BOARD.strip);
    px(ctx, W - 190, H - 43, 5, 5, COLD_BOARD.pinBlue);
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

    px(ctx, 0, 0, W, H, RECORD.voidBg);
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
      ledger.tags.includes('pastoral-referral') ? FLAG : INK
    );
    this.field(
      s.channelLog,
      ledger.records.includes('went-online')
        ? s.messagesLogged.replace('{n}', String(this.messagesOnFile))
        : s.notOnline,
      106
    );
    this.field(s.tags, this.tagsValue(), 128, ledger.tags.length ? FLAG : INK);
    this.field(s.status, s.statusValue, 150, FLAG);

    // the index card — the name copied into the era's filing artifact
    const cx = 28; const cy = 190; const cw = 200; const ch = 64;
    px(ctx, cx, cy, cw, ch, RECORD.pulseOn);
    px(ctx, cx, cy, cw, 1, LINE);
    px(ctx, cx, cy, 1, ch, LINE);
    px(ctx, cx, cy + ch - 1, cw, 1, LINE);
    px(ctx, cx + cw - 1, cy, 1, ch, LINE);
    for (let i = 1; i < 4; i++) px(ctx, cx + 8, cy + 14 + i * 12, cw - 16, 1, RECORD.pulseOff);
    setFont(ctx, 10);
    ctx.fillStyle = INK;
    ctx.fillText(ledger.name, cx + 10, cy + 16);
    setFont(ctx, 8);
    ctx.fillStyle = DIM;
    ctx.fillText('index · era 1 · drawer 12', cx + 10, cy + 44);

    // dead FILE button — no raised bevel; it looks inert because it is
    const bx = W - 140; const by = 212;
    px(ctx, bx, by, 110, 22, RECORD.pulseOn);
    px(ctx, bx, by, 110, 1, LINE);
    px(ctx, bx, by, 1, 22, LINE);
    setFont(ctx, 9);
    ctx.fillStyle = RECORD.cardLine;
    ctx.fillText(s.file, bx + 22, by + 6);

    // reinterpretation session log — one cold line per provotype filed, and
    // one per SEND event (offered/visited/declined all appear — declining is
    // never invisible, Ethics #10; the cross-reference lines MESH into the
    // same record, ◆N2). Copy comes from each item's own data (resolved at
    // file time), never composed here. Baseline never populates either.
    const profileLines = this.profileRecaptionLines();
    const endingLines = this.endingRecordLines();
    // R28-2a: guidance responses appear like every other filed thing —
    // followed in ink, declined in the same amber as abandoned/declined
    // elsewhere (witness symmetry: ignoring guidance is never invisible).
    // The first-touch line (FIND #5) leads the log: it was filed first.
    const firstTouchLines = ledger.records.includes('profile-initialized')
      ? [opening.witness_profile_init]
      : [];
    if (profileLines.length > 0 || ledger.provotypes.length > 0 || ledger.sends.length > 0
        || endingLines.length > 0 || ledger.guidance.length > 0 || ledger.belongings.length > 0
        || ledger.lamby.length > 0 || ledger.checkins.length > 0 || ledger.media.length > 0
        || ledger.era3Arrival.length > 0 || ledger.graceQueue.length > 0
        || firstTouchLines.length > 0) {
      setFont(ctx, 8);
      ctx.fillStyle = DIM;
      ctx.fillText(s.sessionLog, 28, 262);
      setFont(ctx, 9);
      const pinned: { text: string; color: string }[] =
        firstTouchLines.map(text => ({ text, color: DIM }));
      const lines: { text: string; color: string }[] = [
        ...profileLines.map(text => ({ text, color: INK })),
        ...ledger.provotypes.map(p => ({
          text: p.witness || `${p.id}: ${p.outcome}`,
          color: p.outcome === 'abandoned' ? FLAG : INK
        })),
        ...ledger.sends.map(sd => ({
          text: sd.witness || `${sd.id}: ${sd.outcome}`,
          color: sd.outcome === 'declined' ? FLAG : INK
        })),
        ...ledger.guidance.map(g => ({
          text: g.witness || `${g.id}: ${g.outcome}`,
          color: g.outcome === 'declined' ? FLAG : INK
        })),
        // R28-2c: the belongings beat — one line per kept item, or one
        // "processed" line on the Update-Now-direct path. Un-kept eligible
        // items file nothing (silence is the record's answer), so there is
        // no un-kept branch to render here.
        ...ledger.belongings.map(b => ({ text: b.witness || `${b.id}: ${b.outcome}`, color: INK })),
        // S2R.0/S2R.1 (Session 34): the return press + Lamby's debut outcome —
        // dismissed renders in the same amber as other declined/abandoned
        // lines (witness symmetry: dismissing the assistant is never invisible).
        ...ledger.lamby.map(l => ({
          text: l.witness || `${l.id}: ${l.outcome}`,
          color: l.outcome === 'dismissed' ? FLAG : INK
        })),
        // S2R.2: every Daily Realignment chip files its own tag — none is a
        // branch, so all render the same ink (register, not judgement).
        ...ledger.checkins.map(c => ({ text: c.witness || `${c.id}`, color: INK })),
        // S2R.4 (Session 35): the NetVision Player offer + outcome — declining
        // the offer and skipping the video both render in the same amber as
        // other declined/abandoned lines (witness symmetry: either response
        // is data); watching to THE BREAK renders in ink like everything else.
        ...ledger.media.map(m => ({
          text: m.witness || `${m.id}: ${m.outcome}`,
          color: (m.outcome === 'declined' || m.outcome === 'skipped') ? FLAG : INK
        })),
        // S3R.0 (Session 37): the three-screen room's arrival, once — Lambient's
        // fragments settling visibly across every device (register, not a
        // choice, so it always renders in the same ink as an ordinary filing).
        ...ledger.era3Arrival.map(a => ({ text: a.witness, color: INK })),
        // S3R.1/S3R.5 (Session 38): the GraceQueue moderation record — every
        // card action files, witness-symmetrically. 'approved'/'reviewed'
        // (compliance with the system's suggestion) render in ink; 'stood'
        // (the player declined the suggestion — including Mira's "I won't
        // bury her story.") renders in the same amber as every other
        // refusal/deviation line here (the record marks noncompliance, it
        // never hides it). No counts, no scores — just the lines.
        ...ledger.graceQueue.map(g => ({
          text: g.witness || `card ${g.cardId}: ${g.outcome}`,
          color: g.outcome === 'stood' ? FLAG : INK
        })),
        ...endingLines.map(text => ({ text, color: FLAG }))
      ];
      // the well between the log heading and the footer holds ~7 rows. The
      // FIRST filing stays pinned at the top for the whole session (FIND #5:
      // the record never forgets your first click); the rest shows the most
      // recent filings (the CLASSIFICATION field still carries the profile).
      const shown = [...pinned, ...lines.slice(-(7 - pinned.length))];
      shown.forEach((l, i) => {
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
      ctx.fillStyle = RECORD.footer;
      ctx.fillText(s.hint, W - 180, H - 16);
    }
  }
}
