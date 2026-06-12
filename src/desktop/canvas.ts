/**
 * The desktop — ONE offscreen 2D canvas that is the piece's entire UI
 * surface (BUILDING_GUIDE §0). It renders era-styled "apps" and is mapped
 * as a texture onto the in-world monitor. Pixel discipline: integer
 * positions only; palette imported from theme/, never invented.
 *
 * Scaffold state: a cold BIOS boot sequence + blinking cursor.
 * Tone: plausible, institutional, boring — NOT campy (register law).
 */
import { ERA1, ERA1_CANVAS } from './theme/era1';

const BOOT_LINES: ReadonlyArray<string> = [
  'PHASE/2 SYSTEMS BIOS  v1.97',
  'COPYRIGHT (C) 1994-97',
  '',
  '640K BASE MEMORY ............ OK',
  'EXTENDED MEMORY ............. OK',
  'KEYBOARD .................... DETECTED',
  'MODEM ....................... DETECTED',
  'PROFILE SERVICES ............ STANDBY',
  'CLASSIFICATION .............. STANDBY',
  '',
  'BOOT RECORD FOUND.',
  'LOADING.'
];

const CHAR_INTERVAL = 0.018; // s per character (typewriter)
const LINE_PAUSE = 0.12;

export class DesktopCanvas {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private elapsed = 0;
  private charsShown = 0;
  private readonly totalChars: number;
  /** true when the backing canvas changed and the GPU texture must re-upload */
  dirty = true;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = ERA1_CANVAS.width;
    this.canvas.height = ERA1_CANVAS.height;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.totalChars = BOOT_LINES.reduce((n, l) => n + Math.max(l.length, 1), 0);
  }

  update(dt: number): void {
    this.elapsed += dt;
    const budget = Math.floor(this.elapsed / CHAR_INTERVAL);
    const next = Math.min(budget, this.totalChars);
    if (next !== this.charsShown) {
      this.charsShown = next;
      this.dirty = true;
    }
    // cursor blink keeps the screen alive after boot completes
    this.dirty = true;
    this.draw();
  }

  private draw(): void {
    const { ctx } = this;
    const W = this.canvas.width;
    const H = this.canvas.height;

    ctx.fillStyle = ERA1.black;
    ctx.fillRect(0, 0, W, H);

    ctx.font = '12px monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = ERA1.silver;

    let remaining = this.charsShown;
    let y = 12;
    for (const line of BOOT_LINES) {
      if (remaining <= 0) break;
      const take = Math.min(line.length, remaining);
      ctx.fillText(line.slice(0, take), 12, y);
      remaining -= Math.max(line.length, 1);
      y += 16;
      void LINE_PAUSE; // pacing refinement comes with the real boot scene
    }

    // blinking block cursor on the current line
    const blinkOn = Math.floor(this.elapsed * 2.2) % 2 === 0;
    if (blinkOn) {
      ctx.fillStyle = ERA1.silver;
      ctx.fillRect(12 + this.cursorCol() * 7, this.cursorRow() * 16 + 12, 7, 12);
    }

    // build tag, dim, bottom-right — dev scaffolding, removed for release
    ctx.fillStyle = ERA1.greyDark;
    ctx.fillText('v0.1.0-scaffold', W - 110, H - 18);
  }

  private cursorRow(): number {
    let remaining = this.charsShown;
    let row = 0;
    for (const line of BOOT_LINES) {
      const cost = Math.max(line.length, 1);
      if (remaining < cost) return row;
      remaining -= cost;
      row++;
    }
    return BOOT_LINES.length;
  }

  private cursorCol(): number {
    let remaining = this.charsShown;
    for (const line of BOOT_LINES) {
      const cost = Math.max(line.length, 1);
      if (remaining < cost) return remaining;
      remaining -= cost;
    }
    return 0;
  }
}
