import * as ui from '../theme/chrome';
import { ERA1 } from '../theme/era1';
import copy from '../../../data/strings/cx3b.json';
import type { TapeId } from '../../narrative/tapes';
export const tapePlayerBus: {
  play?: (id: TapeId) => void; stop?: () => void;
  probe?: () => { inserted: TapeId | null; playing: boolean; caption: string | null };
} = {};
export class TapePlayerApp {
  hits: { x: number; y: number; w: number; h: number; id: string }[] = [];
  selected: TapeId = tapePlayerBus.probe?.().inserted ?? 'tapeA';
  draw(ctx: CanvasRenderingContext2D): void {
    const c = ui.windowFrame(ctx, 58, 65, 396, 240, copy.tapes.title, true);
    this.hits = [{ ...c.closeBox, id: 'tape-close' }];
    ui.px(ctx, c.x, c.y, c.w, c.h, ERA1.beige);
    copy.tapes.labels.forEach((label, i) => {
      const id = ['tapeA', 'tapeB', 'tapeC'][i]; const y = c.y + 12 + i * 26;
      ui.button(ctx, c.x + 12, y, c.w - 24, 22, `${this.selected === id ? '▸ ' : ''}${label}`);
      this.hits.push({ x: c.x + 12, y, w: c.w - 24, h: 22, id: `tape-select:${id}` });
    });
    const snap = tapePlayerBus.probe?.();
    ui.px(ctx, c.x + 12, c.y + 96, c.w - 24, 78, ERA1.paper);
    ui.setFont(ctx, 11); ctx.fillStyle = ERA1.black;
    ui.wrapText(ctx, snap?.caption ?? '', c.w - 44).forEach((s, i) => ctx.fillText(s, c.x + 22, c.y + 108 + i * 15));
    for (const [id, label, x] of [['tape-play', copy.tapes.play, c.x + 12], ['tape-stop', copy.tapes.stop, c.x + 110], ['tape-close', copy.tapes.close, c.x + 268]] as const) {
      ui.button(ctx, x, c.y + 188, 88, 22, label); this.hits.push({ x, y: c.y + 188, w: 88, h: 22, id });
    }
  }
  press(id: string): void {
    if (id.startsWith('tape-select:')) this.selected = id.slice(12) as TapeId;
    if (id === 'tape-play') tapePlayerBus.play?.(this.selected);
    if (id === 'tape-stop') tapePlayerBus.stop?.();
  }
}
