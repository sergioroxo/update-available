/** The programme's Library fills Daniel's glass. The backdrop covers it; independent
 * object layers stay inside the frame, at one scale and with their floor anchors kept.
 * All layers load with the room. No ledger writes; the readers own their existing text. */
import layout from './libraryLayout.json';
import copy from '../../../data/strings/home.json';
import card from '../../../data/strings/close_restart.json';
import lex from '../../../data/strings/lexicon.json';
import { ERA1 } from '../theme/era1';
import { px, setFont, wrapText } from '../theme/chrome';

export type LibraryHit = {
  x: number; y: number; w: number; h: number; id: string;
  /** Names survive when the illustrated object has no visible label. */
  label?: string; ariaLabel?: string;
};
const rows = layout.objects.filter(o => o.tabOrder !== null).sort((a, b) => a.tabOrder! - b.tabOrder!);
const assetName = (file: string): string => `library/lib_${file.split('/').pop()!.replace('.png', '.webp')}`;
const files = new Set([layout.backdrop, ...layout.objects.flatMap(o => Object.values(o.assets))]);

export class Library {
  private images = new Map<string, HTMLImageElement>();
  private bubble: string | null = copy.return.lamby.greet;
  private chatter = 0;
  private focus = -1;
  private keyboardActivation = false;
  private focusName = document.createElement('div');

  get ready(): boolean { return [...this.images.values()].every(i => i.complete && i.naturalWidth > 0); }
  constructor(redraw: () => void) {
    // The canvas's keyboard focus has an audible name as well as its painted outline.
    this.focusName.id = 'library-focus-name';
    this.focusName.setAttribute('role', 'status');
    this.focusName.setAttribute('aria-live', 'polite');
    Object.assign(this.focusName.style, {
      position: 'fixed', width: '1px', height: '1px', overflow: 'hidden', clipPath: 'inset(50%)'
    });
    document.body.appendChild(this.focusName);
    for (const file of files) {
      const image = new Image();
      this.images.set(file, image);
      image.onload = redraw;
      image.src = assetName(file);
    }
  }
  pointerPress(): boolean {
    if (this.keyboardActivation) return false;
    const cleared = this.focus >= 0;
    this.focus = -1;
    this.focusName.textContent = '';
    return cleared;
  }
  press(id: string): boolean {
    if (id === 'library-dismiss') { this.bubble = null; return true; }
    if (id === 'library-lamby') {
      const lines = [copy.return.lamby.greet, ...copy.return.lamby.chatter, copy.return.lamby.lexicon];
      this.bubble = lines[++this.chatter % lines.length]; return true;
    }
    return false;
  }
  key(key: string, shift: boolean, hits: LibraryHit[], press: (x: number, y: number) => boolean): boolean {
    if (key === 'Tab') {
      this.focus = this.focus < 0 ? (shift ? hits.length - 1 : 0)
        : (this.focus + (shift ? -1 : 1) + hits.length) % hits.length;
      this.focusName.textContent = hits[this.focus]?.ariaLabel ?? '';
      return true;
    }
    if ((key === 'Enter' || key === ' ') && hits[this.focus]) {
      const h = hits[this.focus];
      this.keyboardActivation = true;
      try { press(h.x + h.w / 2, h.y + h.h / 2); }
      finally { this.keyboardActivation = false; }
      return true;
    }
    return false;
  }
  draw(ctx: CanvasRenderingContext2D, W: number, H: number, hits: LibraryHit[]): void {
    hits.length = 0;
    px(ctx, 0, 0, W, H, ERA1.black);
    const cover = Math.max(W / layout.canvas.width, H / layout.canvas.height);
    const bw = Math.ceil(layout.canvas.width * cover), bh = Math.ceil(layout.canvas.height * cover);
    const bx = Math.round((W - bw) / 2), by = Math.round((H - bh) / 2);
    // Refit the foreground separately: no door/computer is lost to the backdrop's side crop.
    const scale = Math.min(W / layout.canvas.width, H / layout.canvas.height);
    const rect = (a: number[]): number[] => {
      const w = Math.round(a[2] * scale), h = Math.round(a[3] * scale);
      return [Math.round(a[0] * W / layout.canvas.width),
        Math.round(by + (a[1] + a[3]) * cover) - h, w, h];
    };
    const draw = (file: string, a: number[], mirrored = false): void => {
      const image = this.images.get(file);
      if (!image?.complete || !image.naturalWidth) return;
      const [x, y, w, h] = a;
      if (!mirrored) { ctx.drawImage(image, x, y, w, h); return; }
      ctx.save(); ctx.translate(x + w, y); ctx.scale(-1, 1);
      ctx.drawImage(image, 0, 0, w, h); ctx.restore();
    };
    ctx.imageSmoothingEnabled = false;
    draw(layout.backdrop, [bx, by, bw, bh]);
    for (const o of [...layout.objects].sort((a, b) => a.zIndex - b.zIndex)) {
      if (o.id === 'speech-bubble') continue;
      draw(Object.values(o.assets)[0], rect(o.rectangle));
    }
    const label = (text: string, hit: LibraryHit): void => {
      setFont(ctx, 8);
      const w = Math.ceil(ctx.measureText(text).width) + 8;
      const x = Math.max(0, Math.min(W - w, Math.round(hit.x + (hit.w - w) / 2)));
      const y = Math.max(0, Math.min(H - 12, hit.y + hit.h - 12));
      px(ctx, x, y, w, 12, ERA1.navy);
      ctx.fillStyle = ERA1.white; ctx.fillText(text, x + 4, y + 2);
    };
    for (const [i, o] of rows.entries()) {
      const [x, y, w, h] = rect(o.rectangle);
      const id = o.id === 'start-again' ? 'bell' : o.id;
      const era = ['1997', '2003', '2016', '2026'].indexOf(o.id.replace('era-', ''));
      const name = era >= 0 ? card.eras[era].label : o.id === 'lexicon' ? lex.title
        : o.id === 'receipt' ? card.receipt.button : o.id === 'plaque' ? copy.plaque.title
        : o.id === 'start-again' ? copy.return.again.button : o.id === 'door' ? copy.door.title : copy.objects.lamby;
      const hit = { x, y, w, h, id: `library-${id}`, label: name, ariaLabel: name };
      hits.push(hit);
      if (era >= 0) label(copy.return.library.eras[era], hit);
      else if (o.id === 'lexicon' || this.focus === i) label(name, hit);
    }
    if (this.bubble) {
      setFont(ctx, 8);
      const lines = wrapText(ctx, this.bubble, 136);
      const textW = Math.ceil(Math.max(...lines.map(line => ctx.measureText(line).width)));
      const w = textW + 44, h = lines.length * 10 + 24;
      const lamby = hits.find(hit => hit.id === 'library-lamby')!;
      // Above Lamby, with the supplied tail mirrored toward the lamb. Entirely above the receipt/mascot.
      const x = Math.min(W - w - 6, Math.round(lamby.x + lamby.w / 2 - w + 24));
      const y = lamby.y - h - 8;
      const file = layout.objects.find(o => o.id === 'speech-bubble')!.assets['speech-bubble']!;
      draw(file, [x, y, w, h], true);
      ctx.fillStyle = ERA1.black;
      lines.forEach((line, i) => ctx.fillText(line, x + 16, y + 8 + i * 10));
      ctx.fillText(copy.return.library.dismissMark, x + w - 24, y + 8);
      const hit = { x, y, w, h, id: 'library-dismiss', label: copy.lamby.dismiss, ariaLabel: copy.lamby.dismiss };
      hits.push(hit);
      if (this.focus === hits.length - 1) label(copy.lamby.dismiss, hit);
    }
    const focused = hits[this.focus];
    if (focused) {
      ctx.strokeStyle = ERA1.white; ctx.lineWidth = 2;
      ctx.strokeRect(focused.x + 1, focused.y + 1, focused.w - 2, focused.h - 2);
    }
  }
}
