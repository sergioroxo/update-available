/** The programme's Library, fitted into Daniel's 4:3 glass without stretching the 16:9 art.
 * All layers load with the room, before the Close. No ledger writes; the existing readers own their text. */
import layout from './libraryLayout.json';
import copy from '../../../data/strings/home.json';
import card from '../../../data/strings/close_restart.json';
import lex from '../../../data/strings/lexicon.json';
import { ERA1 } from '../theme/era1';
import { px, setFont, wrapText } from '../theme/chrome';
export type LibraryHit = { x: number; y: number; w: number; h: number; id: string };
const rows = layout.objects.filter(o => o.tabOrder !== null).sort((a,b) => a.tabOrder! - b.tabOrder!);
const assetName = (file: string): string => `library/lib_${file.split('/').pop()!.replace('.png', '.webp')}`;
const files = new Set([layout.backdrop, ...layout.objects.flatMap(o => Object.values(o.assets))]);
export class Library {
  private images = new Map<string, HTMLImageElement>();
  private bubble: string | null = copy.return.lamby.greet;
  private chatter = 0;
  private focus = -1;
  get ready(): boolean { return [...this.images.values()].every(i => i.complete && i.naturalWidth > 0); }
  constructor(redraw: () => void) {
    for (const file of files) {
      const image = new Image();
      this.images.set(file, image);
      image.onload = redraw;
      image.src = assetName(file);
    }
  }
  press(id: string): boolean {
    if (id === 'library-dismiss') { this.bubble = null; return true; }
    if (id === 'library-lamby') {
      const lines = [copy.return.lamby.greet, ...copy.return.lamby.chatter, copy.return.lamby.lexicon];
      this.bubble = lines[++this.chatter % lines.length]; return true;
    }
    return false;
  }
  key(key: string, shift: boolean, hits: LibraryHit[], press: (x:number,y:number) => boolean): boolean {
    if (key === 'Tab') { this.focus = this.focus < 0 ? (shift ? hits.length-1 : 0) : (this.focus + (shift ? -1 : 1) + hits.length) % hits.length; return true; }
    if ((key === 'Enter' || key === ' ') && hits[this.focus]) {
      const h = hits[this.focus]; press(h.x+h.w/2,h.y+h.h/2); return true;
    }
    return false;
  }
  draw(ctx: CanvasRenderingContext2D, W: number, H: number, hits: LibraryHit[]): void {
    hits.length = 0;
    px(ctx,0,0,W,H,ERA1.black);
    const scale = W / layout.canvas.width, height = Math.round(layout.canvas.height * scale);
    const top = Math.round((H-height)/2);
    const rect = (a:number[]): number[] => [Math.round(a[0]*scale),top+Math.round(a[1]*scale),Math.round(a[2]*scale),Math.round(a[3]*scale)];
    const draw = (file:string, a:number[]): void => {
      const image = this.images.get(file);
      if (image?.complete && image.naturalWidth) { const [x,y,w,h]=a; ctx.drawImage(image,x,y,w,h); }
    };
    ctx.imageSmoothingEnabled = false;
    draw(layout.backdrop,[0,top,W,height]);
    for (const o of [...layout.objects].sort((a,b)=>a.zIndex-b.zIndex)) {
      if (o.id === 'speech-bubble') continue;
      draw(Object.values(o.assets)[0],rect(o.rectangle));
    }
    setFont(ctx,10); ctx.fillStyle=ERA1.silver;
    ctx.fillText(copy.return.library.title,12,16);
    for (const o of rows) {
      const [x,y,w,h] = rect(o.rectangle);
      const id = o.id === 'start-again' ? 'bell' : o.id;
      hits.push({x,y,w,h,id:`library-${id}`});
      const era = ['1997','2003','2016','2026'].indexOf(o.id.replace('era-',''));
      const label = era >= 0 ? card.eras[era].label : o.id === 'lexicon' ? lex.title : o.id === 'receipt' ? card.receipt.button : o.id === 'plaque' ? copy.plaque.title : o.id === 'start-again' ? copy.return.again.button : o.id === 'door' ? copy.door.title : copy.objects.lamby;
      setFont(ctx,8);
      const lw = Math.ceil(ctx.measureText(label).width)+8;
      const lx = Math.max(0,Math.min(W-lw,Math.round(x+(w-lw)/2))), ly = y+h-12;
      px(ctx,lx,ly,lw,12,ERA1.navy); ctx.fillStyle=ERA1.white; ctx.fillText(label,lx+4,ly+2);
    }
    if (this.bubble) {
      // The supplied empty bubble expands to hold its own words. Dismiss is always live.
      draw(layout.objects.find(o=>o.id==='speech-bubble')!.assets['speech-bubble']!,[302,top+92,194,58]);
      setFont(ctx,8); ctx.fillStyle=ERA1.black;
      wrapText(ctx,this.bubble,160).forEach((line,i)=>ctx.fillText(line,316,top+100+i*10));
      const h={x:390,y:top+134,w:100,h:16,id:'library-dismiss'};
      px(ctx,h.x,h.y,h.w,h.h,ERA1.navy); ctx.fillStyle=ERA1.white; ctx.fillText(copy.lamby.dismiss,h.x+5,h.y+4); hits.push(h);
    }
    const f=hits[this.focus];
    if (f) { ctx.strokeStyle=ERA1.white; ctx.lineWidth=2; ctx.strokeRect(f.x+1,f.y+1,f.w-2,f.h-2); }
  }
}
