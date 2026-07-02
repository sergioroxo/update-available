/**
 * The provotype runtime (reinterpretation build · Session R1) — the one
 * reusable grammar every provotype uses: a diegetic assistant INVITATION -> a
 * two-sentence FRAME -> an interactive VIGNETTE (click states) -> a
 * dossier-grade DEBRIEF (provenance, status + player-visible confidence). All
 * content is data-driven (`data/provotypes/*.json`); this file is only the
 * shell. Rendered on the era desktop canvas with that era's theme tokens.
 *
 * Laws honored here (CLAUDE.md · master plan R1):
 *   - Leave and Pause are live from frame one, at a FIXED position, every phase.
 *   - Click/tap only. No score, streak, timer, progress counter, or win/lose —
 *     repetition is allowed but never juiced.
 *   - `felt` lines render bare (the person's side), never joked at.
 *   - Both completion and abandonment are filed to the ledger (abandonment is
 *     not invisible); the witness line comes from data, not from here.
 *
 * NOTE: only the Era-1 theme exists in code today, so every era renders with
 * ERA1 tokens for now. When later era themes land, select tokens by `data.era`.
 */
import { ERA1 } from '../theme/era1';
import * as ui from '../theme/chrome';
import { ledger } from '../../state/ledger';
import chrome from '../../../data/strings/reinterp.json';

export interface ProvotypeSource {
  status: 'documentary' | 'contested' | 'speculative';
  confidence: string;
  text: string;
}
export interface ProvotypeState {
  prompt: string;
  buttons: string[];
  response: string;
  felt?: string;
}
export interface Provotype {
  id: string;
  era: string;
  register: string;
  failure: 'silence' | 'glitch';
  cuts: string[];
  invitation: { from?: string; lines: string[]; accept: string };
  frame: { text: string; continue: string };
  states: ProvotypeState[];
  debrief: { body: string[]; close?: string; sources: ProvotypeSource[] };
  ledgerTags: string[];
  witness?: { completed?: string; abandoned?: string };
}

type Phase = 'invitation' | 'frame' | 'vignette' | 'debrief';
interface Hit { x: number; y: number; w: number; h: number; id: string }

// window geometry — one modal on the era desktop; constant so the fixed
// Leave/Pause row never moves between phases.
const WIN = { x: 36, y: 24, w: 440, h: 300 } as const;
const ROW_Y = WIN.y + WIN.h - 28; // the fixed button row
const STATUS_COLOR: Record<ProvotypeSource['status'], string> = {
  documentary: ERA1.ok,
  contested: ERA1.olive,
  speculative: ERA1.grey
};

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

export class ProvotypeApp {
  open = true;
  dirty = true;
  /** the OS listens: the app has closed (Leave, or Close from the debrief) */
  onClose?: () => void;

  private phase: Phase = 'invitation';
  private stateIndex = 0;
  private showResponse = false;
  private reachedDebrief = false;
  private filed = false;
  private paused = false;
  private hover = '';
  private hits: Hit[] = [];

  constructor(private readonly data: Provotype) {}

  update(_dt: number): void {
    // no timers, no animation loop in R1 — the framework is click-driven.
    // (The pillow's restrained low-poly animation arrives with R2.)
  }

  // ── draw ────────────────────────────────────────────────────────────────
  draw(ctx: CanvasRenderingContext2D): void {
    this.hits = [];
    const title = chrome.windowTitle[this.phase];
    const c = ui.windowFrame(ctx, WIN.x, WIN.y, WIN.w, WIN.h, title, true);
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.paper);

    const bodyTop = c.y + 8;
    const bodyMaxW = c.w - 24;
    const bodyX = c.x + 12;

    switch (this.phase) {
      case 'invitation': this.drawInvitation(ctx, bodyX, bodyTop, bodyMaxW); break;
      case 'frame': this.drawFrame(ctx, bodyX, bodyTop, bodyMaxW); break;
      case 'vignette': this.drawVignette(ctx, bodyX, bodyTop, bodyMaxW); break;
      case 'debrief': this.drawDebrief(ctx, bodyX, bodyTop, bodyMaxW); break;
    }

    this.drawFixedRow(ctx);
    if (this.paused) this.drawPaused(ctx, c);
  }

  private drawInvitation(ctx: CanvasRenderingContext2D, x: number, top: number, maxW: number): void {
    const inv = this.data.invitation;
    let y = top;
    if (inv.from) {
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.navy;
      ctx.fillText(inv.from, x, y);
      y += 16;
    }
    ui.setFont(ctx, 11);
    ctx.fillStyle = ERA1.black;
    for (const line of inv.lines) {
      for (const w of wrap(ctx, line, maxW)) { ctx.fillText(w, x, y); y += 15; }
      y += 4;
    }
    this.primary(ctx, inv.accept);
  }

  private drawFrame(ctx: CanvasRenderingContext2D, x: number, top: number, maxW: number): void {
    ui.setFont(ctx, 11);
    ctx.fillStyle = ERA1.black;
    let y = top;
    for (const w of wrap(ctx, this.data.frame.text, maxW)) { ctx.fillText(w, x, y); y += 15; }
    this.primary(ctx, this.data.frame.continue);
  }

  private drawVignette(ctx: CanvasRenderingContext2D, x: number, top: number, maxW: number): void {
    const st = this.data.states[this.stateIndex];
    ui.setFont(ctx, 11);
    ctx.fillStyle = ERA1.black;
    let y = top;
    for (const w of wrap(ctx, st.prompt, maxW)) { ctx.fillText(w, x, y); y += 15; }
    y += 8;

    if (!this.showResponse) {
      // the choices — each click-confirm advances; no choice is "right"
      st.buttons.forEach((label, i) => {
        const bw = Math.min(220, Math.max(120, ctx.measureText(label).width + 28));
        const by = y + i * 28;
        ui.button(ctx, x, by, bw, 22, label, { hover: this.hover === `choice:${i}` });
        this.hits.push({ x, y: by, w: bw, h: 22, id: `choice:${i}` });
      });
      return;
    }

    // the system's reply — flat, unrewarding by design
    ctx.fillStyle = ERA1.greyDark;
    for (const w of wrap(ctx, st.response, maxW)) { ctx.fillText(w, x, y); y += 15; }
    if (st.felt) {
      y += 8;
      ui.setFont(ctx, 10); // the person's bare line — dim, unstyled, never juiced
      ctx.fillStyle = ERA1.grey;
      for (const w of wrap(ctx, st.felt, maxW)) { ctx.fillText(w, x, y); y += 14; }
    }
    this.primary(ctx, chrome.next);
  }

  private drawDebrief(ctx: CanvasRenderingContext2D, x: number, top: number, maxW: number): void {
    let y = top;
    ui.setFont(ctx, 10);
    ctx.fillStyle = ERA1.black;
    for (const line of this.data.debrief.body) {
      for (const w of wrap(ctx, line, maxW)) { ctx.fillText(w, x, y); y += 14; }
      y += 3;
    }
    y += 4;
    ui.px(ctx, x, y, maxW, 1, ERA1.silver);
    y += 8;
    ui.setFont(ctx, 8);
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(chrome.debriefHeading, x, y);
    y += 14;

    for (const src of this.data.debrief.sources) {
      ui.setFont(ctx, 9);
      ctx.fillStyle = STATUS_COLOR[src.status];
      ctx.fillText(src.status, x, y);
      const sw = ctx.measureText(src.status).width;
      ctx.fillStyle = ERA1.greyDark;
      ctx.fillText(`· ${src.confidence} confidence`, x + sw + 6, y);
      y += 12;
      ui.setFont(ctx, 9);
      ctx.fillStyle = ERA1.black;
      for (const w of wrap(ctx, src.text, maxW - 8)) { ctx.fillText(w, x + 8, y); y += 12; }
      y += 4;
    }
    this.primary(ctx, this.data.debrief.close ?? chrome.next);
  }

  /** the fixed care row — Leave + Pause, present every phase, never moves */
  private drawFixedRow(ctx: CanvasRenderingContext2D): void {
    ui.button(ctx, WIN.x + 8, ROW_Y, 70, 20, chrome.leave, { hover: this.hover === 'leave' });
    this.hits.push({ x: WIN.x + 8, y: ROW_Y, w: 70, h: 20, id: 'leave' });
    const pauseLabel = this.paused ? chrome.resume : chrome.pause;
    ui.button(ctx, WIN.x + 86, ROW_Y, 70, 20, pauseLabel, { hover: this.hover === 'pause' });
    this.hits.push({ x: WIN.x + 86, y: ROW_Y, w: 70, h: 20, id: 'pause' });
  }

  /** the phase's forward button, bottom-right of the fixed row */
  private primary(ctx: CanvasRenderingContext2D, label: string): void {
    if (this.paused) return;
    const w = 110;
    const x = WIN.x + WIN.w - 8 - w;
    ui.button(ctx, x, ROW_Y, w, 20, label, { hover: this.hover === 'primary' });
    this.hits.push({ x, y: ROW_Y, w, h: 20, id: 'primary' });
  }

  private drawPaused(ctx: CanvasRenderingContext2D, c: ui.ContentRect): void {
    ctx.fillStyle = 'rgba(212,208,200,0.82)'; // the era's chrome beige, veiled
    ctx.fillRect(c.x, c.y, c.w, c.h - 24);
    ui.setFont(ctx, 12);
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText(chrome.paused, c.x + 12, c.y + 12);
  }

  // ── input ─────────────────────────────────────────────────────────────
  handleMove(x: number, y: number): void {
    const hit = this.hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    const id = hit ? hit.id : '';
    if (id !== this.hover) { this.hover = id; this.dirty = true; }
  }

  handleClick(x: number, y: number): void {
    const hit = this.hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (!hit) return;
    // while paused only the care row responds
    if (this.paused) {
      if (hit.id === 'leave') this.exit();
      else if (hit.id === 'pause') { this.paused = false; this.dirty = true; }
      return;
    }
    if (hit.id === 'leave') { this.exit(); return; }
    if (hit.id === 'pause') { this.paused = true; this.dirty = true; return; }
    if (hit.id === 'primary') { this.advance(); return; }
    if (hit.id.startsWith('choice:')) { this.choose(); return; }
  }

  private choose(): void {
    // no choice is scored or "correct" — the confirm only surfaces the reply
    this.showResponse = true;
    this.dirty = true;
  }

  private advance(): void {
    switch (this.phase) {
      case 'invitation': this.phase = 'frame'; break;
      case 'frame':
        this.phase = 'vignette';
        this.stateIndex = 0;
        this.showResponse = false;
        break;
      case 'vignette':
        if (this.stateIndex < this.data.states.length - 1) {
          this.stateIndex++;
          this.showResponse = false;
        } else {
          this.phase = 'debrief';
          this.reachedDebrief = true;
        }
        break;
      case 'debrief': this.exit(); break;
    }
    this.dirty = true;
  }

  /** close back to the era desktop; file the outcome once */
  private exit(): void {
    this.file();
    this.open = false;
    this.dirty = true;
    this.onClose?.();
  }

  /** both outcomes filed to the in-memory ledger; witness copy comes from data */
  private file(): void {
    if (this.filed) return;
    this.filed = true;
    const outcome: 'completed' | 'abandoned' = this.reachedDebrief ? 'completed' : 'abandoned';
    const witness = this.data.witness?.[outcome] ?? '';
    ledger.provotypes.push({ id: this.data.id, outcome, witness });
    if (outcome === 'completed') {
      for (const tag of this.data.ledgerTags) {
        if (!ledger.tags.includes(tag)) ledger.tags.push(tag);
      }
    }
  }
}
