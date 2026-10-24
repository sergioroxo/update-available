/** Shared menu layout; each machine supplies its palette, screen and published hits. */
import * as ui from '../theme/chrome';
import { ERA1 } from '../theme/era1';
import * as aero from '../theme/era3';
import { CHROME } from '../theme/era4';
import { gameMenuBus } from '../../state/gameMenuBus';
import type { PanelEra, Rect } from './startPanel';
import type { StartModel } from '../../witness/startModel';
import strings from '../../../data/strings/slice.json';
import { enableExtra } from '../../state/cut';
import panelStrings from '../../../data/strings/startPanel.json';
const S = strings.desktop.startMenu;
export interface StartHit extends Rect { id: string; title?: string }
type Program = { id: string; label: string };

export class StartMenuMap {
  menu = false;
  steps = false;
  view: 'main' | 'jump' | 'programs' = 'main';
  confirm: { era: PanelEra; label: string } | null = null;
  refused = false;
  hits: StartHit[] = [];
  get active(): boolean { return this.menu || this.steps || !!this.confirm || this.refused; }
  close(): void { this.menu = this.steps = this.refused = false; this.confirm = null; this.view = 'main'; this.hits = []; }
  toggle(): void { const open = !this.menu; this.close(); this.menu = open; }

  press(id: string, model: StartModel, silent: boolean): boolean {
    this.hits = [];
    if (id === 'steps-row') { this.close(); return true; }
    if (id === 'steps-close') { this.steps = false; return true; }
    if (id === 'jump-stay') { this.confirm = null; return true; }
    if (id === 'jump-confirm') {
      if (this.confirm && !silent) { const era = this.confirm.era; this.close(); gameMenuBus.jumpToEra?.(era); }
      return true;
    }
    if (id.startsWith('sm-extra:')) {
      const extra = model.extras.find(e => e.id === id.slice(9));
      if (!silent && extra && !extra.on && !extra.passed) enableExtra(extra.id);
      this.menu = true;
      return true;
    }
    if (id === 'sm-whattodo') { this.menu = false; this.steps = !silent; return true; }
    if (id === 'sm-allsteps') { this.menu = false; this.steps = !silent; return true; }
    if (id === 'sm-jump') { if (!silent) { this.menu = true; this.view = 'jump'; } return true; }
    if (id === 'sm-programs') { this.menu = true; this.view = 'programs'; return true; }
    if (id === 'sm-back') { this.view = 'main'; return true; }
    if (id.startsWith('sm-jump-')) {
      const row = model.jump.find(j => j.era === id.slice(8));
      if (row && !row.current && !silent) { this.menu = false; this.confirm = { era: row.era, label: row.label }; }
      return true;
    }
    if (id === 'shut-ok') { this.refused = false; return true; }
    return false;
  }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number, era: PanelEra, model: StartModel, silent: boolean, programs: Program[] = []): StartHit[] {
    this.hits = [];
    if (this.menu) this.drawMenu(ctx, W, H, era, model, silent, programs);
    if (this.steps && !silent) this.drawSteps(ctx, W, H, era, model);
    if (this.confirm && !silent) this.drawConfirm(ctx, W, H);
    if (this.refused && !silent) this.drawRefusal(ctx, W, H, era);
    return this.hits;
  }
  private palette(era: PanelEra) {
    return era === 'e3' ? { paper: aero.ERA3.white, edge: aero.ERA3.glassEdge, ink: aero.ERA3.ink, dim: aero.ERA3.grey, accent: aero.ERA3.accent }
      : era === 'e4' ? { paper: CHROME.field, edge: CHROME.fieldEdge, ink: CHROME.ink, dim: CHROME.hint, accent: CHROME.accent }
      : { paper: ERA1.silver, edge: ERA1.grey, ink: ERA1.black, dim: ERA1.grey, accent: ERA1.navy };
  }
  private button(ctx: CanvasRenderingContext2D, era: PanelEra, r: StartHit, label: string): void {
    if (era === 'e1' || era === 'e2') ui.button(ctx, r.x, r.y, r.w, r.h, label);
    else if (era === 'e3') aero.button(ctx, r.x, r.y, r.w, r.h, label, { size: 9 });
    else { ui.px(ctx, r.x, r.y, r.w, r.h, CHROME.button); ui.setFont(ctx, 9); ctx.fillStyle = CHROME.buttonInk; ctx.fillText(label, r.x + 8, r.y + 5); }
    this.hits.push(r);
  }
  private drawMenu(ctx: CanvasRenderingContext2D, W: number, H: number, era: PanelEra, model: StartModel, silent: boolean, programs: Program[]): void {
    const legacy = era === 'e1' || era === 'e2', p = this.palette(era);
    const w = Math.min(legacy ? 236 : 300, W - 8), tx = legacy ? 30 : 12, tw = w - tx - 8, row = 15;
    type Row = { text: string; id?: string; dim?: boolean; head?: boolean; hint?: boolean; title?: string };
    let rows: Row[] = [];
    const item = (text: string, id: string, dim = false, title?: string) => rows.push({ text, id, dim, title });
    const head = (text: string) => rows.push({ text, head: true });
    if (this.view === 'jump') {
      head(S.jumpTitle);
      model.jump.forEach(j => item(`${j.current ? '▸ ' : ''}${j.label}`, `sm-jump-${j.era}`, j.current || silent, silent ? S.notNow : undefined));
      item(panelStrings[era].close, 'sm-back');
    } else if (this.view === 'programs') {
      head(S.programs); programs.forEach(v => item(v.label, `sm-prog:${v.id}`));
      if (!programs.length) item(S.nothing, 'sm-none', true);
      item(panelStrings[era].close, 'sm-back');
    } else {
      head(S.now);
      if (model.now) {
        item(model.now.label, ''); ui.setFont(ctx, 9);
        ui.wrapText(ctx, model.now.hint, tw - 10).forEach(text => rows.push({ text, hint: true }));
      }
      head(S.next); model.next.forEach(b => item(b.label, '', true));
      item(S.allSteps, 'sm-allsteps', silent, silent ? S.notNow : undefined);
      if (legacy) {
        const expanded: Row[] = [{ text: S.programs, head: true }, ...(programs.length ? programs.map(v => ({ text: v.label, id: `sm-prog:${v.id}` })) : [{ text: S.nothing, dim: true }])];
        const tailCount = (model.room.length ? model.room.length + 1 : 0) + model.extras.length + 4;
        if ((rows.length + expanded.length + tailCount) * row + 16 > H - 30) item(S.programsMore, 'sm-programs');
        else rows.push(...expanded);
      }
      if (model.room.length) { head(S.room); model.room.forEach(b => item(b.label, '')); }
      head(S.more);
      ui.setFont(ctx, 10);
      model.extras.forEach(e => {
        const suffix = e.on ? S.on : e.passed ? S.alreadyPassed : '';
        const label = `${e.label}${suffix ? ` ${suffix}` : ''}`;
        const lines = ui.wrapText(ctx, label, tw - 8);
        lines.forEach(text => item(text, `sm-extra:${e.id}`, silent || e.on || e.passed, e.place || undefined));
        if (e.place) ui.wrapText(ctx, e.place, tw - 14).forEach(text => rows.push({ text, hint: true }));
      });
      item(silent ? `${S.jump} — ${S.notNow}` : S.jump, 'sm-jump', silent, silent ? S.notNow : undefined);
      item(S.shutDown, 'sm-shut'); item(S.leave, 'sm-leave');
    }
    // Fixed-height rows, no scrolling menus; PROGRAMS collapses above before this cap is needed.
    const h = Math.min(H - (era === 'e4' ? 36 : 26), rows.length * row + 12);
    const x = 3, y = era === 'e4' ? 30 : H - (era === 'e3' ? 28 : 22) - h;
    if (legacy) {
      ui.bevel(ctx, x, y, w, h, true);
      ui.px(ctx, x + 3, y + 3, 20, h - 6, ERA1.navy);
      ctx.save(); ctx.translate(x + 7, y + h - 8); ctx.rotate(-Math.PI / 2); ui.setFont(ctx, 12); ctx.fillStyle = ERA1.white; ctx.fillText(S.banner, 0, 0); ctx.restore();
    } else {
      ui.px(ctx, x, y, w, h, p.edge); ui.px(ctx, x + 1, y + 1, w - 2, h - 2, p.paper);
      if (era === 'e3') aero.px(ctx, x + 1, y + 1, w - 2, 3, p.accent);
    }
    let cy = y + 6;
    // On a long NOW hint, tighten spacing uniformly instead of hiding any required row.
    const rh = Math.min(row, Math.floor((h - 12) / rows.length));
    rows.forEach(r => {
      if (legacy && r.id === 'sm-shut') {
        ui.px(ctx, x + tx, cy, tw, 1, ERA1.grey); ui.px(ctx, x + tx, cy + 1, tw, 1, ERA1.white);
      }
      ui.setFont(ctx, r.head || r.hint ? 9 : 10); ctx.fillStyle = r.head ? p.accent : r.hint && legacy ? ERA1.greyDark : r.dim || r.hint ? p.dim : p.ink;
      let text = r.head && legacy ? r.text.toUpperCase() : r.text;
      while (ctx.measureText(text).width > tw - 4 && text.length > 3) text = text.slice(0, -2) + '…';
      ctx.fillText(text, x + tx + (r.head ? 0 : r.hint ? 10 : 4), cy + 2);
      // Disabled rows publish their title but never an actionable id.
      if (r.id || r.title) this.hits.push({ x: x + tx, y: cy, w: tw, h: rh, id: r.dim ? 'sm-disabled' : r.id!, title: r.title });
      cy += rh;
    });
  }
  private drawSteps(ctx: CanvasRenderingContext2D, W: number, H: number, era: PanelEra, model: StartModel): void {
    const p = this.palette(era), w = W - 24, x = 12, y = 6;
    ui.setFont(ctx, 9);
    const lines = model.steps.map(b => ui.wrapText(ctx, `${b.label}${b.optional ? ` ${S.extra}` : ''}${b.place ? ` · ${b.place}` : ''}`, w - 40));
    const h = Math.min(H - 34, 72 + lines.reduce((n, a) => n + a.length * 11 + 2, 0));
    let top = y + 30;
    if (era === 'e1' || era === 'e2') {
      const c = ui.windowFrame(ctx, x, y, w, h, S.listTitle[era], true);
      ui.px(ctx, c.x, c.y, c.w, c.h, era === 'e1' ? ERA1.beige : ERA1.paper);
      this.hits.push({ ...c.closeBox, id: 'steps-close' }); top = c.y + 7;
    } else {
      ui.px(ctx, x, y, w, h, p.edge); ui.px(ctx, x + 1, y + 1, w - 2, h - 2, p.paper);
      if (era === 'e3') aero.px(ctx, x + 1, y + 1, w - 2, 3, p.accent);
      ui.setFont(ctx, 10); ctx.fillStyle = p.ink; ctx.fillText(S.listTitle[era], x + 10, y + 10);
      ui.setFont(ctx, 10); ctx.fillStyle = p.ink; ctx.fillText('×', x + w - 18, y + 8);
      this.hits.push({ x: x + w - 23, y: y + 5, w: 18, h: 18, id: 'steps-close' });
    }
    ui.setFont(ctx, 9); ctx.fillStyle = p.ink; ctx.fillText(S.listLead, x + 12, top);
    let cy = top + 17;
    model.steps.forEach((b, i) => {
      ctx.fillStyle = b.state === 'done' ? p.dim : p.ink;
      ctx.fillText(b.state === 'done' ? '✓' : b.state === 'current' ? '▸' : '·', x + 12, cy);
      this.hits.push({ x: x + 10, y: cy - 2, w: w - 20, h: lines[i].length * 11 + 2, id: b.id === 'rootcause' ? 'sm-prog:icon-rootcause' : 'steps-row' });
      lines[i].forEach((line, j) => ctx.fillText(line, x + 26, cy + j * 11));
      cy += lines[i].length * 11 + 2;
    });
    this.button(ctx, era, { x: x + w - 72, y: y + h - 24, w: 62, h: 18, id: 'steps-close' }, panelStrings[era].close);
  }
  private drawConfirm(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    this.frameDialog(ctx, W, H, S.confirmTitle.replace('{era}', this.confirm!.label), S.confirmBody, true);
  }
  /** The refusal is the machine's; unlike the frame confirmation it wears that machine's chrome. */
  private drawRefusal(ctx: CanvasRenderingContext2D, W: number, H: number, era: PanelEra): void {
    if (era === 'e1' || era === 'e2') { this.frameDialog(ctx, W, H, S.shutRefused.title, S.shutRefused.line, false); return; }
    const p = this.palette(era), w = Math.min(340, W - 24);
    ui.setFont(ctx, 10); const lines = ui.wrapText(ctx, S.shutRefused.line, w - 32), h = 74 + lines.length * 13;
    const x = Math.round((W - w) / 2), y = Math.round((H - h) / 2);
    ui.px(ctx, x, y, w, h, p.edge); ui.px(ctx, x + 1, y + 1, w - 2, h - 2, p.paper);
    if (era === 'e3') aero.px(ctx, x + 1, y + 1, w - 2, 3, p.accent);
    ui.setFont(ctx, 10); ctx.fillStyle = p.ink; ctx.fillText(S.shutRefused.title, x + 12, y + 10);
    ctx.fillText('×', x + w - 18, y + 8); this.hits.push({ x: x + w - 23, y: y + 5, w: 18, h: 18, id: 'shut-ok' });
    lines.forEach((line, i) => ctx.fillText(line, x + 12, y + 32 + i * 13));
    this.button(ctx, era, { x: x + w - 82, y: y + h - 28, w: 70, h: 20, id: 'shut-ok' }, S.shutRefused.ok);
  }
  private frameDialog(ctx: CanvasRenderingContext2D, W: number, H: number, title: string, body: string, confirm: boolean): void {
    const w = Math.min(340, W - 24); ui.setFont(ctx, 10);
    const lines = ui.wrapText(ctx, body, w - 32), h = 74 + lines.length * 13;
    const x = Math.round((W - w) / 2), y = Math.round((H - h) / 2);
    const c = ui.windowFrame(ctx, x, y, w, h, title, true);
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.beige);
    this.hits.push({ ...c.closeBox, id: confirm ? 'jump-stay' : 'shut-ok' });
    ui.setFont(ctx, 10); ctx.fillStyle = ERA1.black; lines.forEach((line, i) => ctx.fillText(line, c.x + 12, c.y + 10 + i * 13));
    if (confirm) this.button(ctx, 'e1', { x: x + w - 180, y: y + h - 28, w: 70, h: 20, id: 'jump-confirm' }, S.confirmYes);
    this.button(ctx, 'e1', { x: x + w - 102, y: y + h - 28, w: 90, h: 20, id: confirm ? 'jump-stay' : 'shut-ok' }, confirm ? S.confirmNo : S.shutRefused.ok);
  }
}
