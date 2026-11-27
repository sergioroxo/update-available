/** Shared menu layout; each machine supplies its palette, screen and published hits. */
import { TapePlayerApp, tapePlayerBus } from './tapePlayer';
import decisions from '../../../data/strings/cx3b.json';
import { rootCauseForEra, type RootCauseApp } from './rootCause';
import rootCopy from '../../../data/strings/rootcause.json';
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
import ACTS from '../../../data/dialog/s4_acts.json';
import { OS26 } from '../theme/era4';
import { MENU_H, appTile, edgeRR, fillRR, softShadow, fit26, type App26 } from './desk26';
const S = strings.desktop.startMenu;
/** ⚑ S417 — 2026's Menu: its own two headings (s4_acts.json screen.os.menu) */
const MENU26 = (ACTS as unknown as { screen: { os: { menu: { apps: string; whatToDo: string } } } }).screen.os.menu;
export interface StartHit extends Rect { id: string; title?: string }
type Program = { id: string; label: string };

export class StartMenuMap {
  private tapes: TapePlayerApp | null = null;
  private tapePaint = '';
  openTapes(): void { this.close(); this.tapes = new TapePlayerApp(); }
  private root: RootCauseApp | null = null;
  openRoot(era: PanelEra): void { this.close(); this.era = era; this.root = rootCauseForEra(era); this.root.onClose = () => { this.root = null; }; }
  /** S343 — the OS pauses 1997's form intermission while the game is open */
  get rootOpen(): boolean { return !!this.root; }
  private era: PanelEra = 'e1';
  menu = false;
  steps = false;
  view: 'main' | 'jump' | 'programs' = 'main';
  confirm: { era: PanelEra; label: string } | null = null;
  refused = false;
  hits: StartHit[] = [];
  get active(): boolean { return !!this.tapes || !!this.root || this.menu || this.steps || !!this.confirm || this.refused; }
  close(): void { this.tapes = null; this.root = null; this.menu = this.steps = this.refused = false; this.confirm = null; this.view = 'main'; this.hits = []; }
  update(dt: number): boolean {
    if (this.root) { this.root.update(dt); return true; }
    if (!this.tapes) return false;
    const s = tapePlayerBus.probe?.();
    const key = `${s?.inserted}|${s?.playing}|${s?.caption}|${this.tapes.selected}`;
    if (key === this.tapePaint) return false;
    this.tapePaint = key; return true;
  }
  toggle(): void { const open = !this.menu; this.close(); this.menu = open; }

  press(id: string, model: StartModel, silent: boolean): boolean {
    this.hits = [];
    if ((id === 'sm-extra:cassettes' || id === 'sm-prog:icon-tapes') && !silent && this.era === 'e1') { this.openTapes(); return true; }
    if (id.startsWith('tape-') && this.tapes) { if (id === 'tape-close') this.tapes = null; else this.tapes.press(id); return true; }
    if (id === 'sm-prog:icon-rootcause' && !silent) { this.openRoot(this.era); return true; }
    if (id.startsWith('sm-root:') && this.root && !silent) { const r = this.root.hits.find(h => h.id === id.slice(8)); if (r) this.root.handleClick(r.x + r.w / 2, r.y + r.h / 2); return true; }
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

  draw(ctx: CanvasRenderingContext2D, W: number, H: number, era: PanelEra, model: StartModel, silent: boolean, programs: Program[] = [],
    reachable: (id: string) => boolean = () => true): StartHit[] {
    this.hits = []; this.era = era;
    this.reachable = reachable;
    programs = [...programs.filter(p => p.id !== 'icon-rootcause'), { id: 'icon-rootcause', label: rootCopy.skins[era].label }];
    if (era === 'e1' && !programs.some(p => p.id === 'icon-tapes')) programs.push({ id: 'icon-tapes', label: decisions.tapes.title });
    if (this.tapes && !silent) { this.tapes.draw(ctx); this.hits = this.tapes.hits; return this.hits; }
    if (this.root && !silent) {
      ui.px(ctx, 0, 0, W, H, era === 'e3' ? aero.ERA3.glass : era === 'e4' ? OS26.wallGround : ERA1.teal);
      const scale = Math.min(W / 512, H / 384); const x = Math.round((W - 512 * scale) / 2), y = Math.round((H - 384 * scale) / 2);
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); this.root.draw(ctx); ctx.restore();
      this.hits = this.root.hits.map(r => ({ ...r, id: `sm-root:${r.id}`, x: x + r.x * scale, y: y + r.y * scale, w: r.w * scale, h: r.h * scale }));
      return this.hits;
    }
    if (this.menu) { if (era === 'e4') this.drawMenu26(ctx, W, H, model, silent, programs); else this.drawMenu(ctx, W, H, era, model, silent, programs); }
    if (this.steps && !silent) { if (era === 'e4') this.drawSteps26(ctx, W, H, model); else this.drawSteps(ctx, W, H, era, model); }
    if (this.confirm && !silent) this.drawConfirm(ctx, W, H);
    // ⚑ S428 (UiB job 38 B1; HEADSET_RUN answer b: "shut down doesn't do anything") — THE REFUSAL IS ALWAYS DRAWN, quiet scene or
    //   not: it is the frame's voice, and a refusal nobody sees is a dead button that also held the menu "active" (Lamby hidden)
    //   until the next press. (It was `this.refused && !silent`: 40a59042.)
    if (this.refused) { if (era === 'e4') this.drawRefusal26(ctx, W, H); else this.drawRefusal(ctx, W, H, era); }
    return this.hits;
  }
  /** ⚑ S417 — which of 2026's apps she may reach now (the Menu dims the rest, as the dock does) */
  private reachable: (id: string) => boolean = () => true;

  /**
   * ⚑ S417 (UiB job 34 Part A; his "It is missing the Menu button btw") — 2026's MENU, in this OS's skin: a rounded panel under
   * the menu bar's Menu button. Her apps at the top (the dock's six; one she cannot reach now is dimmed and, pressed, says why,
   * as the dock does), and L's dig ("Shall we find where it started?", the Programs entry every era's menu has); then what to
   * do now (the map's step, its hint, the next ones, all the steps); in the room; more to explore; jump to…; and at its foot
   * Shut Down… (refused, as everywhere) and Leave… (the frame's door). The same model and the same ids as every era's menu.
   */
  private drawMenu26(ctx: CanvasRenderingContext2D, W: number, H: number, model: StartModel, silent: boolean, programs: Program[]): void {
    const x = 6, y = MENU_H + 3, w = Math.min(332, W - 12), maxH = H - y - 6;
    const pad = 12, tw = w - 2 * pad;
    type Row = { kind: 'head' | 'item' | 'hint' | 'rule'; text?: string; id?: string; dim?: boolean; title?: string; strong?: boolean; drop?: number };
    const rows: Row[] = [];
    const head = (text: string): void => { rows.push({ kind: 'head', text }); };
    const item = (text: string, id: string, dim = false, title?: string, strong = false, drop = 0): void => { rows.push({ kind: 'item', text, id, dim, title, strong, drop }); };
    const apps = programs.filter((p) => p.id.startsWith('app:'));
    const others = programs.filter((p) => !p.id.startsWith('app:'));
    if (this.view === 'jump') {
      head(S.jumpTitle);
      model.jump.forEach((j) => item(`${j.current ? '▸ ' : ''}${j.label}`, `sm-jump-${j.era}`, j.current || silent, silent ? S.notNow : undefined));
      item(panelStrings.e4.close, 'sm-back');
    } else {
      // the root-cause dig (L's add-on, every era's Programs entry)
      const root = [...others, { id: 'icon-rootcause', label: rootCopy.skins.e4.label }].find((p) => p.id === 'icon-rootcause')!;
      item(`✦ ${root.label}`, `sm-prog:${root.id}`, silent, silent ? S.notNow : undefined);
      rows.push({ kind: 'rule' });
      head(MENU26.whatToDo);
      if (model.now) {
        item(model.now.label, '', false, undefined, true);
        ui.setFont(ctx, 11);
        ui.wrapText(ctx, model.now.hint, tw - 6).slice(0, 3).forEach((text) => rows.push({ kind: 'hint', text, drop: 3 }));
      }
      model.next.forEach((b) => item(`${S.next} · ${b.label}`, '', true, undefined, false, 2));
      item(S.allSteps, 'sm-allsteps', silent, silent ? S.notNow : undefined);
      if (model.room.length) { head(S.room); model.room.forEach((b) => item(b.label, '', true, undefined, false, 1)); }
      head(S.more);
      model.extras.forEach((e) => {
        const suffix = e.on ? S.on : e.passed ? S.alreadyPassed : '';
        item(`${e.label}${suffix ? ` ${suffix}` : ''}${e.place ? ` · ${e.place}` : ''}`, `sm-extra:${e.id}`, silent || (e.id !== 'cassettes' && (e.on || e.passed)), e.place || undefined);
      });
      item(silent ? `${S.jump} — ${S.notNow}` : S.jump, 'sm-jump', silent, silent ? S.notNow : undefined);
    }
    // the heights: apps 62, a head 18, an item 19, a hint 14, a rule 9; the foot 36. Rows marked `drop` go first if it is tall.
    const APPS_H = this.view === 'jump' ? 0 : 64, FOOT = 40;
    const hOf = (r: Row): number => r.kind === 'head' ? 19 : r.kind === 'item' ? 20 : r.kind === 'hint' ? 14 : 9;
    let laid = rows.slice();
    for (const level of [1, 2, 3]) {
      if (APPS_H + laid.reduce((a, r) => a + hOf(r), 0) + FOOT + 16 <= maxH) break;
      laid = laid.filter((r) => (r.drop ?? 0) !== level);
    }
    const h = Math.min(maxH, APPS_H + laid.reduce((a, r) => a + hOf(r), 0) + FOOT + 16);
    softShadow(ctx, { x, y, w, h }, 14, 1.2);
    edgeRR(ctx, x, y, w, h, 14, OS26.menuEdge, OS26.menuPanel);
    let cy = y + 10;
    // her apps: the dock's six, in a row
    if (APPS_H) {
      ui.setFont(ctx, 11); ctx.fillStyle = OS26.menuHead; ctx.fillText(MENU26.apps, x + pad, cy);
      cy += 18;
      const cell = Math.floor(tw / Math.max(1, apps.length));
      apps.forEach((a, i) => {
        const can = this.reachable(a.id);
        const cx = x + pad + i * cell, tile = 26;
        appTile(ctx, a.id.slice(4) as App26, cx + Math.round((cell - tile) / 2), cy, tile, !can);
        ui.setFont(ctx, 11); ctx.fillStyle = can ? OS26.winInk : OS26.menuQuiet;
        const lab = fit26(ctx, a.label, cell - 2), lw = Math.ceil(ctx.measureText(lab).width);
        ctx.fillText(lab, cx + Math.round((cell - lw) / 2), cy + tile + 3);
        this.hits.push({ x: cx, y: cy - 2, w: cell, h: tile + 18, id: `sm-prog:${a.id}` });
      });
      cy += APPS_H - 18;
    }
    for (const r of laid) {
      const rh = hOf(r);
      if (cy + rh > y + h - FOOT) break;
      if (r.kind === 'rule') { ui.px(ctx, x + pad, cy + 4, tw, 1, OS26.winRule); cy += rh; continue; }
      if (r.kind === 'head') { ui.setFont(ctx, 11); ctx.fillStyle = OS26.menuHead; ctx.fillText(r.text ?? '', x + pad, cy + 4); cy += rh; continue; }
      if (r.kind === 'hint') { ui.setFont(ctx, 11); ctx.fillStyle = OS26.winInk2; ctx.fillText(fit26(ctx, r.text ?? '', tw - 6), x + pad + 6, cy); cy += rh; continue; }
      const live = !!r.id && !r.dim;
      if (live) fillRR(ctx, x + pad - 5, cy - 1, tw + 10, rh - 2, 7, OS26.menuRowOn);
      ui.setFont(ctx, r.strong ? 12 : 11);
      ctx.fillStyle = r.dim ? OS26.menuQuiet : OS26.winInk;
      ctx.fillText(fit26(ctx, r.text ?? '', tw - 4), x + pad + (live ? 2 : 0), cy + 3);
      if (r.id || r.title) this.hits.push({ x: x + pad - 5, y: cy - 1, w: tw + 10, h: rh - 2, id: r.dim ? 'sm-disabled' : r.id!, title: r.title });
      cy += rh;
    }
    // the foot: Shut Down… (the machine refuses) and Leave… (the frame's door)
    const fy = y + h - FOOT + 6;
    ui.px(ctx, x + pad, fy - 6, tw, 1, OS26.winRule);
    const bw = Math.floor((tw - 8) / 2);
    edgeRR(ctx, x + pad, fy + 2, bw, 24, 12, OS26.winEdge, OS26.win);
    fillRR(ctx, x + pad + bw + 8, fy + 2, bw, 24, 12, OS26.menuButton);
    ui.setFont(ctx, 11);
    const sl = S.shutDown, ll = S.leave;
    ctx.fillStyle = OS26.winInk; ctx.fillText(sl, x + pad + Math.round((bw - ctx.measureText(sl).width) / 2), fy + 7);
    ctx.fillStyle = OS26.menuButtonInk; ctx.fillText(ll, x + pad + bw + 8 + Math.round((bw - ctx.measureText(ll).width) / 2), fy + 7);
    this.hits.push({ x: x + pad, y: fy + 2, w: bw, h: 24, id: 'sm-shut' });
    this.hits.push({ x: x + pad + bw + 8, y: fy + 2, w: bw, h: 24, id: 'sm-leave' });
  }
  /** ⚑ S417 — all the steps, in 2026's skin (a rounded sheet; 11 px and up, the headset's floor) */
  private drawSteps26(ctx: CanvasRenderingContext2D, W: number, H: number, model: StartModel): void {
    const x = 12, y = MENU_H + 6, w = Math.min(440, W - 24);
    ui.setFont(ctx, 11);
    const lines = model.steps.map((b) => ui.wrapText(ctx, `${b.label}${b.optional ? ` ${S.extra}` : ''}${b.place ? ` · ${b.place}` : ''}`, w - 50).slice(0, 2));
    const h = Math.min(H - y - 8, 84 + lines.reduce((n, a) => n + a.length * 14 + 3, 0));
    softShadow(ctx, { x, y, w, h }, 14, 1.2);
    edgeRR(ctx, x, y, w, h, 14, OS26.menuEdge, OS26.menuPanel);
    ui.setFont(ctx, 12); ctx.fillStyle = OS26.winInk; ctx.fillText(S.listTitle.e4, x + 14, y + 12);
    ui.setFont(ctx, 12); ctx.fillStyle = OS26.winInk2; ctx.fillText('✕', x + w - 22, y + 11);
    this.hits.push({ x: x + w - 30, y: y + 5, w: 24, h: 24, id: 'steps-close' });
    ui.setFont(ctx, 11); ctx.fillStyle = OS26.winInk2; ctx.fillText(S.listLead, x + 14, y + 32);
    let cy = y + 52;
    model.steps.forEach((b, i) => {
      if (cy + lines[i].length * 14 > y + h - 34) return;
      ui.setFont(ctx, 11); ctx.fillStyle = b.state === 'done' ? OS26.menuQuiet : OS26.winInk;
      ctx.fillText(b.state === 'done' ? '✓' : b.state === 'current' ? '▸' : '·', x + 14, cy);
      this.hits.push({ x: x + 10, y: cy - 2, w: w - 20, h: lines[i].length * 14 + 2, id: b.id === 'rootcause' ? 'sm-prog:icon-rootcause' : 'steps-row' });
      lines[i].forEach((line, j) => ctx.fillText(line, x + 30, cy + j * 14));
      cy += lines[i].length * 14 + 3;
    });
    const cl = panelStrings.e4.close; ui.setFont(ctx, 11);
    const cw = Math.ceil(ctx.measureText(cl).width) + 24;
    fillRR(ctx, x + w - cw - 12, y + h - 30, cw, 22, 11, OS26.menuButton);
    ctx.fillStyle = OS26.menuButtonInk; ctx.fillText(cl, x + w - cw, y + h - 26);
    this.hits.push({ x: x + w - cw - 12, y: y + h - 30, w: cw, h: 22, id: 'steps-close' });
  }
  /** ⚑ S417 — Shut Down…'s refusal, in 2026's skin (the machine's, as everywhere: one line, OK) */
  private drawRefusal26(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const w = Math.min(340, W - 24);
    ui.setFont(ctx, 12); const lines = ui.wrapText(ctx, S.shutRefused.line, w - 36), h = 82 + lines.length * 16;
    const x = Math.round((W - w) / 2), y = Math.round((H - h) / 2);
    softShadow(ctx, { x, y, w, h }, 14, 1.2);
    edgeRR(ctx, x, y, w, h, 14, OS26.menuEdge, OS26.menuPanel);
    ui.setFont(ctx, 13); ctx.fillStyle = OS26.winInk; ctx.fillText(S.shutRefused.title, x + 16, y + 14);
    ui.setFont(ctx, 12); ctx.fillStyle = OS26.winInk2; ctx.fillText('✕', x + w - 22, y + 12);
    this.hits.push({ x: x + w - 30, y: y + 6, w: 24, h: 24, id: 'shut-ok' });
    ui.setFont(ctx, 12); ctx.fillStyle = OS26.winInk; lines.forEach((line, i) => ctx.fillText(line, x + 16, y + 38 + i * 16));
    fillRR(ctx, x + w - 86, y + h - 34, 70, 24, 12, OS26.menuButton);
    ui.setFont(ctx, 12); ctx.fillStyle = OS26.menuButtonInk; ctx.fillText(S.shutRefused.ok, x + w - 51 - Math.round(ctx.measureText(S.shutRefused.ok).width / 2), y + h - 29);
    this.hits.push({ x: x + w - 86, y: y + h - 34, w: 70, h: 24, id: 'shut-ok' });
  }
  private palette(era: PanelEra) {
    return era === 'e3' ? { paper: aero.ERA3.white, edge: aero.ERA3.glassEdge, ink: aero.ERA3.ink, dim: aero.ERA3.greyDk, accent: aero.ERA3.accent }
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
    type Row = { text: string; id?: string; dim?: boolean; head?: boolean; hint?: boolean; title?: string; button?: boolean };
    let rows: Row[] = [];
    // ⚑ S428 (UiB job 38 B2; HEADSET_RUN answer b: "Leave doesn't do anything") — 2016's menu ends in a FOOT: Shut Down… and Leave…
    //   as two buttons side by side, 26 px tall, Leave… on the right (away from Start), the menu lifted FOOT_GAP clear of the Start
    //   button. They were the last two 15 px rows, 3 px above Start: a press a little low closed the menu on Start.
    const foot = era === 'e3' && this.view === 'main';
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
        // ⚑ S428 (B4) — when the step has a press she can be taken to, the menu offers it: "Take me there" does what her own press
        //   would (the notification's thread, the board, the kit)
        if (model.take) rows.push({ text: S.take, id: 'sm-take', button: true });
      }
      head(S.next); model.next.forEach(b => item(b.label, '', true));
      item(S.allSteps, 'sm-allsteps', silent, silent ? S.notNow : undefined);
      if (legacy) {
        const expanded: Row[] = [{ text: S.programs, head: true }, ...(programs.length ? programs.map(v => ({ text: v.label, id: `sm-prog:${v.id}` })) : [{ text: S.nothing, dim: true }])];
        const tailCount = (model.room.length ? model.room.length + 1 : 0) + model.extras.length + 4;
        if ((rows.length + expanded.length + tailCount) * row + 16 > H - 30) item(S.programsMore, 'sm-programs');
        else rows.push(...expanded);
      }
      // ⚑ S401 (UiB job 29 D2) — "My account · activity" left the Start menu: it is on the taskbar now, always in view
      //   (graceQueueLite.ts drawAccountButton)
      if (!legacy) item(S.programs, 'sm-programs', silent);
      if (model.room.length) { head(S.room); model.room.forEach(b => item(b.label, '')); }
      head(S.more);
      ui.setFont(ctx, 10);
      model.extras.forEach(e => {
        const suffix = e.on ? S.on : e.passed ? S.alreadyPassed : '';
        const label = `${e.label}${suffix ? ` ${suffix}` : ''}`;
        const lines = ui.wrapText(ctx, label, tw - 8);
        lines.forEach(text => item(text, `sm-extra:${e.id}`, silent || (e.id !== 'cassettes' && (e.on || e.passed)), e.place || undefined));
        if (e.place) ui.wrapText(ctx, e.place, tw - 14).forEach(text => rows.push({ text, hint: true }));
      });
      item(silent ? `${S.jump} — ${S.notNow}` : S.jump, 'sm-jump', silent, silent ? S.notNow : undefined);
      if (!foot) { item(S.shutDown, 'sm-shut'); item(S.leave, 'sm-leave'); }
    }
    // Fixed-height rows, no scrolling menus; PROGRAMS collapses above before this cap is needed.
    const FOOT_H = foot ? 40 : 0, FOOT_GAP = foot ? 10 : 0;
    const h = Math.min(H - (era === 'e4' ? 36 : 26) - FOOT_GAP - 4, rows.length * row + 12 + FOOT_H);
    const x = 3, y = era === 'e4' ? 30 : H - (era === 'e3' ? 28 : 22) - FOOT_GAP - h;
    if (era === 'e2') {
      // ⚑ S285 (headset B, 1 Nov: "I like the new bar of inspired by XP, but the start menu … is still in the old style")
      //   — 2003's menu matches its bar: a navy frame with the start button's green along the top, white rows, and the
      //   banner on a blue band (colours from the 2003 taskbar: ERA1 navy, ok, titleBlue)
      ui.px(ctx, x, y, w, h, ERA1.navy);
      ui.px(ctx, x + 2, y + 2, w - 4, h - 4, ERA1.white);
      ui.px(ctx, x + 2, y + 2, w - 4, 3, ERA1.ok);
      ui.px(ctx, x + 2, y + 5, 20, h - 7, ERA1.titleBlue);
      ctx.save(); ctx.translate(x + 7, y + h - 8); ctx.rotate(-Math.PI / 2); ui.setFont(ctx, 12); ctx.fillStyle = ERA1.white; ctx.fillText(S.banner, 0, 0); ctx.restore();
    } else if (legacy) {
      ui.bevel(ctx, x, y, w, h, true);
      ui.px(ctx, x + 3, y + 3, 20, h - 6, ERA1.navy);
      ctx.save(); ctx.translate(x + 7, y + h - 8); ctx.rotate(-Math.PI / 2); ui.setFont(ctx, 12); ctx.fillStyle = ERA1.white; ctx.fillText(S.banner, 0, 0); ctx.restore();
    } else {
      // ⚑ S429 (UiB job 38 F4; a stray mark under Shut Down… in S428's frame) — the foot's FOOT_GAP above Start was left unpainted,
      //   and the board's Lambient mark showed through it as a lone dot (its lowest pixel). The menu's paper now runs down over the gap
      //   to the taskbar, as a 2016 Start menu sits on its bar; the buttons stay where they were (Leave… 19 px above Start).
      const boxH = h + FOOT_GAP;
      ui.px(ctx, x, y, w, boxH, p.edge); ui.px(ctx, x + 1, y + 1, w - 2, boxH - (FOOT_GAP ? 1 : 2), p.paper);
      if (era === 'e3') aero.px(ctx, x + 1, y + 1, w - 2, 3, p.accent);
    }
    let cy = y + 6;
    // On a long NOW hint, tighten spacing uniformly instead of hiding any required row.
    const rh = Math.min(row, Math.floor((h - 12 - FOOT_H) / rows.length));
    rows.forEach(r => {
      if (legacy && r.id === 'sm-shut') {
        ui.px(ctx, x + tx, cy, tw, 1, ERA1.grey); ui.px(ctx, x + tx, cy + 1, tw, 1, era === 'e2' ? ERA1.silver : ERA1.white);
      }
      if (r.button) {
        // ⚑ S428 (B4) — Take me there: a small button on its own row, under the Now's hint
        ui.setFont(ctx, 9); const bw = Math.ceil(ctx.measureText(r.text).width) + 20;
        const br = { x: x + tx + 4, y: cy, w: bw, h: Math.max(12, rh - 1), id: r.id! };
        if (era === 'e3') aero.button(ctx, br.x, br.y, br.w, br.h, r.text, { size: 9, primary: true }); else this.button(ctx, era, br, r.text);
        if (era === 'e3') this.hits.push(br);
        cy += rh; return;
      }
      ui.setFont(ctx, r.head || r.hint ? 9 : 10); ctx.fillStyle = r.head ? (era === 'e2' ? ERA1.titleBlue : p.accent) : r.hint && legacy ? ERA1.greyDark : r.dim || r.hint ? p.dim : p.ink;
      let text = r.head && legacy ? r.text.toUpperCase() : r.text;
      while (ctx.measureText(text).width > tw - 4 && text.length > 3) text = text.slice(0, -2) + '…';
      ctx.fillText(text, x + tx + (r.head ? 0 : r.hint ? 10 : 4), cy + 2);
      // Disabled rows publish their title but never an actionable id.
      if (r.id || r.title) this.hits.push({ x: x + tx, y: cy, w: tw, h: rh, id: r.dim ? 'sm-disabled' : r.id!, title: r.title });
      cy += rh;
    });
    if (foot) {
      const fy = y + h - FOOT_H + 8, bh = 26, bw = Math.floor((tw - 8) / 2);
      ui.px(ctx, x + tx, fy - 6, tw, 1, p.edge);
      aero.button(ctx, x + tx, fy, bw, bh, S.shutDown, { size: 11 });
      aero.button(ctx, x + tx + bw + 8, fy, bw, bh, S.leave, { size: 11, primary: true });
      this.hits.push({ x: x + tx, y: fy, w: bw, h: bh, id: 'sm-shut' });
      this.hits.push({ x: x + tx + bw + 8, y: fy, w: bw, h: bh, id: 'sm-leave' });
    }
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
