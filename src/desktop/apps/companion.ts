/**
 * ⚑ S275 — THE POCKET PET: Restorify's keychain companion, 2003 (DESIGN_MISSING_YEARS_2026-10-31.md §6; his yes
 * 31 Oct — "keychain in the room and screen", "show the resets"). The 1996–2004 keychain pet, made the programme's:
 * its needs are the programme's duties (WORD = feed, FELLOWSHIP = play, CONFESS = clean; CORRECT = discipline, the
 * coach's, greyed), the daily check-in feeds it, and Lamby's face is the streak's mood, grown from the answers (no
 * settings). OPERABLE: it may charm, and it collapses — the streak breaks at Caleb's commit-press, and after the
 * intervention it goes still: "no needs recorded". It never mocks Daniel, never dies, has no timer, makes no sound.
 * One LCD canvas serves the window and the keychain on the desk (uploaded only when it is redrawn).
 */
import { ERA1 } from '../theme/era1';
import * as ui from '../theme/chrome';
import { HANDHELD as LCD } from '../theme/calendar';
import { drawLambyChar, type LambyMood } from './lambyChar';
import C from '../../../data/strings/companion.json';

interface Hit { x: number; y: number; w: number; h: number; id: string }
export type CompanionStage = 'alive' | 'broken' | 'still';

/** the LCD's own size, in pixels — a keychain's 32 × 16 dot matrix, doubled */
export const LCD_W = 64, LCD_H = 40;
const DW = 300, DH = 300;

export class CompanionApp {
  open = false;
  dirty = true;
  hits: Hit[] = [];
  /** the LCD, shared with the keychain in the room; `lcdVersion` moves when it is redrawn */
  readonly lcd = document.createElement('canvas');
  lcdVersion = 0;
  onClose?: () => void;
  private hover = '';
  private action: 'word' | 'fellowship' | 'confess' | null = null;
  private actionT = 0;
  private wordIndex = 0;
  private line = '';
  private drawnKey = '';
  private readonly sprite = document.createElement('canvas');

  constructor(private deps: { mood(): LambyMood; fed(): boolean; stage(): CompanionStage; streakDays(): number }) {
    this.lcd.width = LCD_W; this.lcd.height = LCD_H;
    this.sprite.width = 128; this.sprite.height = 128;
  }

  update(dt: number): void {
    if (this.action) { this.actionT += dt; if (this.actionT > 1.4) { this.action = null; this.actionT = 0; } this.dirty = true; }
    this.paintLcd();
  }

  /** redraw the LCD only when what it shows has changed (the law: uploads on dirty only) */
  private paintLcd(): void {
    const stage = this.deps.stage(), mood: LambyMood = stage === 'broken' ? 'sad' : stage === 'still' ? 'sterile' : this.deps.mood();
    const frame = this.action ? Math.floor(this.actionT * 6) : 0;
    const key = `${stage}|${mood}|${this.action}|${frame}|${this.deps.fed()}`;
    if (key === this.drawnKey) return;
    this.drawnKey = key; this.lcdVersion++; this.dirty = true;
    const g = this.lcd.getContext('2d'); const s = this.sprite.getContext('2d');
    if (!g || !s) return;
    g.fillStyle = LCD.screenLight; g.fillRect(0, 0, LCD_W, LCD_H);
    // Lamby, drawn at size, then posterised to the LCD's four greens — a dot-matrix pet
    s.clearRect(0, 0, 128, 128);
    const bounce = this.action === 'fellowship' ? Math.round(Math.abs(Math.sin(this.actionT * 9)) * -10) : 0;
    // the face only, larger — what a keychain's dot matrix can carry
    drawLambyChar(s, 63, 50 + bounce, { mood, action: 'idle', t: stage === 'still' ? 0 : this.actionT, moodStart: 0, scale: 0.78, headOnly: true });
    const src = s.getImageData(0, 0, 128, 128).data;
    // an LCD draws ink on a light glass: the wool (light) is the mid green, the face and hooves (dark) the darkest
    for (let y = 0; y < LCD_H; y++) for (let x = 0; x < 32; x++) {
      const sx = 32 + x * 2, sy = 8 + y * 2, o = (sy * 128 + sx) * 4;
      if (src[o + 3] < 100) continue;
      const lum = (src[o] * 0.3 + src[o + 1] * 0.59 + src[o + 2] * 0.11) / 255;
      g.fillStyle = lum > 0.75 ? LCD.screenMid : lum > 0.4 ? LCD.screenDeep : LCD.screenDark; g.fillRect(16 + x, y, 1, 1);
    }
    g.fillStyle = LCD.screenDark;
    if (stage === 'still') { g.fillRect(4, LCD_H - 6, LCD_W - 8, 1); return; }   // a flat line: no needs
    // the action's sign, in dots: a word going in, a heart, the swept marks
    if (this.action === 'word') { const k = Math.min(3, frame); g.fillRect(48 - k * 4, 18, 6, 4); }
    if (this.action === 'fellowship') { g.fillRect(52, 6, 2, 2); g.fillRect(56, 6, 2, 2); g.fillRect(51, 8, 8, 2); g.fillRect(53, 10, 4, 2); }
    if (this.action === 'confess') for (let i = 0; i < 3; i++) g.fillRect(50 + i * 4 + frame * 2, 30, 2, 2);
    // the status row: a dot per need — dark when met
    const fed = this.deps.fed() && stage === 'alive';
    for (let i = 0; i < 3; i++) { g.fillStyle = fed || i > 0 ? LCD.screenDark : LCD.screenMid; g.fillRect(4 + i * 5, 3, 3, 3); }
    if (stage === 'broken') { g.fillStyle = LCD.screenDark; g.fillRect(44, 4, 16, 1); g.fillRect(44, 8, 16, 1); }   // the struck-through count
  }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.hits = [];
    const stage = this.deps.stage();
    const dx = Math.round((W - DW) / 2) + 90, dy = Math.max(4, Math.round((H - DH) / 2) - 10);
    const c = ui.windowFrame(ctx, dx, dy, DW, DH, C.title, true);
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.beige);
    this.hits.push({ ...c.closeBox, id: 'companion-close' });
    // the streak and its resets
    ui.setFont(ctx, 12); ctx.fillStyle = stage === 'alive' ? ERA1.navy : ERA1.warnDark;
    ctx.fillText(stage === 'alive' ? C.streak.replace('{n}', String(this.deps.streakDays())) : C.brokenStreak, c.x + 10, c.y + 8);
    ui.setFont(ctx, 8); ctx.fillStyle = ERA1.greyDark; ctx.fillText(C.streakNote, c.x + 10, c.y + 26);
    // the egg: the keychain drawn as it is on the desk, the LCD inside
    const ex = c.x + 60, ey = c.y + 42, ew = 160, eh = 120;
    ui.px(ctx, ex + 20, ey, ew - 40, eh, ERA1.paper); ui.px(ctx, ex + 8, ey + 10, ew - 16, eh - 20, ERA1.paper); ui.px(ctx, ex, ey + 26, ew, eh - 52, ERA1.paper);
    ui.px(ctx, ex + 72, ey - 8, 16, 10, ERA1.grey);   // the ring
    const lx = ex + 16, ly = ey + 22, lw = ew - 32, lh = Math.round(lw * LCD_H / LCD_W);
    ui.px(ctx, lx - 3, ly - 3, lw + 6, lh + 6, ERA1.greyDark);
    const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.lcd, lx, ly, lw, lh);
    ctx.imageSmoothingEnabled = smooth;
    // the three duties and the coach's button
    const by = ey + eh + 8, alive = stage === 'alive';
    const b = (id: 'word' | 'fellowship' | 'confess', i: number): void => {
      const x = c.x + 10 + i * 94, label = C.buttons[id];
      ui.button(ctx, x, by, 88, 18, label, { hover: this.hover === `companion-${id}`, disabled: !alive });
      if (alive) this.hits.push({ x, y: by, w: 88, h: 18, id: `companion-${id}` });
    };
    b('word', 0); b('fellowship', 1); b('confess', 2);
    ui.button(ctx, c.x + 10, by + 22, 88, 18, C.buttons.correct, { disabled: true });
    ui.setFont(ctx, 8); ctx.fillStyle = ERA1.grey; ctx.fillText(C.correctNote, c.x + 104, by + 27);
    // the week: the first three days stamped by staff (the supervised period), today's by the check-in
    ui.setFont(ctx, 8); ctx.fillStyle = ERA1.greyDark; ctx.fillText(C.week, c.x + 10, by + 48);
    for (let i = 0; i < 7; i++) {
      const x = c.x + 70 + i * 22, y = by + 45, staff = i < 3, today = i === 6;
      const filled = stage === 'alive' && (!today || this.deps.fed());
      ui.px(ctx, x, y, 16, 12, stage === 'broken' ? ERA1.warn : filled ? (staff ? ERA1.greyDark : ERA1.navy) : ERA1.white);
      if (staff && stage === 'alive') { ctx.fillStyle = ERA1.white; ctx.fillText(C.staff, x + 5, y + 2); }
    }
    ctx.fillStyle = ERA1.grey; ctx.fillText(C.staffNote, c.x + 70, by + 60);
    // the line: what Lamby "feels" — the programme's reading of him
    ui.setFont(ctx, 9); ctx.fillStyle = stage === 'alive' ? ERA1.black : ERA1.warnDark;
    const mood = this.deps.mood() as keyof typeof C.moods;
    const line = stage === 'still' ? C.still : stage === 'broken' ? C.broken : this.line || (this.deps.fed() ? C.moods[mood] ?? C.moods.clinical : C.hungry);
    ui.wrapText(ctx, line, c.w - 20).slice(0, 2).forEach((l, i) => ctx.fillText(l, c.x + 10, c.y + c.h - 30 + i * 11));
  }

  handleMove(x: number, y: number): void {
    const h = [...this.hits].reverse().find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    const id = h ? h.id : '';
    if (id !== this.hover) { this.hover = id; this.dirty = true; }
  }

  handleClick(x: number, y: number): void {
    const h = [...this.hits].reverse().find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    if (!h) return;
    this.dirty = true;
    if (h.id === 'companion-close') { this.open = false; this.line = ''; this.onClose?.(); return; }
    const act = h.id.slice('companion-'.length) as 'word' | 'fellowship' | 'confess';
    this.action = act; this.actionT = 0;
    if (act === 'word') { const w = C.words[this.wordIndex++ % C.words.length]; this.line = C.fed.replace('{w}', w); }
    if (act === 'fellowship') this.line = C.played;
    if (act === 'confess') this.line = C.swept;
  }
}
