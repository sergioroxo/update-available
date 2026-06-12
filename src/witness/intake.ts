/**
 * The witness side — the INTAKE RECORD, computed live from the ledger
 * (SCRIPT_UPDATE v0.3 Part V / v0.5: every field traceable to something the
 * player actually did). Register law: this surface is SHARP and cold —
 * surveillance is high-definition. It never responds to input.
 */
import { ERA1_CANVAS } from '../desktop/theme/era1';
import { px, setFont } from '../desktop/theme/chrome';
import { ledger } from '../state/ledger';
import strings from '../../data/strings/slice.json';

const INK = '#aabbcc';
const DIM = '#556677';
const PANEL = '#0d0d1a';
const FIELD = '#0a0a15';
const LINE = '#222244';

export class WitnessCanvas {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private t = 0;
  /** message count is sampled at flip time so the record reads as "filed" */
  messagesOnFile = 0;
  dirty = true;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = ERA1_CANVAS.width;
    this.canvas.height = ERA1_CANVAS.height;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }

  update(dt: number): void {
    this.t += dt;
    this.dirty = true;
    this.draw();
  }

  private field(label: string, value: string, y: number, valueColor = INK): void {
    const { ctx } = this;
    setFont(ctx, 9);
    ctx.fillStyle = DIM;
    ctx.fillText(label, 28, y + 3);
    const vx = 170;
    const vw = this.canvas.width - vx - 28;
    px(ctx, vx, y, vw, 16, FIELD);
    px(ctx, vx, y, vw, 1, LINE);
    px(ctx, vx, y, 1, 16, LINE);
    px(ctx, vx, y + 15, vw, 1, LINE);
    px(ctx, vx + vw - 1, y, 1, 16, LINE);
    setFont(ctx, 10);
    ctx.fillStyle = valueColor;
    ctx.fillText(value, vx + 6, y + 3);
  }

  private draw(): void {
    const { ctx } = this;
    const W = this.canvas.width;
    const H = this.canvas.height;
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
    this.field(s.channelLog, s.messagesLogged.replace('{n}', String(this.messagesOnFile)), 84);
    this.field(s.tags, ledger.tags.join(', ') || '—', 106, ledger.tags.length ? '#cc8855' : INK);
    this.field(s.status, s.statusValue, 128, '#cc8855');

    // the index card — the name copied into the era's filing artifact
    const cx = 28; const cy = 158; const cw = 200; const ch = 64;
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
    const bx = W - 140; const by = 180;
    px(ctx, bx, by, 110, 22, '#15151f');
    px(ctx, bx, by, 110, 1, LINE);
    px(ctx, bx, by, 1, 22, LINE);
    setFont(ctx, 9);
    ctx.fillStyle = '#333344';
    ctx.fillText(s.file, bx + 22, by + 6);

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
