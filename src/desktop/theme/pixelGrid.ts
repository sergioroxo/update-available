/**
 * ⚑ S376 (UiB job 19 Part B) — A PIXEL GRID: the small raster the redrawn pictures are painted on.
 *
 * The 1997/2003 canvases draw in logical pixels under a ×3 transform, and the pixel law (CLAUDE.md) is integer
 * positions, palette colours only, no rotation. A canvas `fill()` of a polygon or a disc anti-aliases its edge into
 * colours no palette holds; so the pictures that need curves (the profile pictures, the 2003 wallpaper, Lamby's
 * cartoon) are painted here first, one palette colour per cell, every shape decided at the cell's centre — and then
 * put on the glass in one `drawImage` with smoothing off, which under the canvas's own scale lands every cell on a
 * whole block of device pixels. The grid is built once and cached by its caller; nothing here runs per frame.
 */
export type Pt = readonly [number, number];

export class PixelGrid {
  readonly w: number;
  readonly h: number;
  private readonly cells: (string | null)[];

  constructor(w: number, h: number, ground: string | null = null) {
    this.w = w; this.h = h;
    this.cells = new Array<string | null>(w * h).fill(ground);
  }

  get(x: number, y: number): string | null {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.cells[y * this.w + x] : null;
  }

  set(x: number, y: number, c: string | null): void {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.cells[y * this.w + x] = c;
  }

  rect(x: number, y: number, w: number, h: number, c: string | null): void {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    for (let yy = Math.max(0, y); yy < Math.min(this.h, y + h); yy++) {
      for (let xx = Math.max(0, x); xx < Math.min(this.w, x + w); xx++) this.cells[yy * this.w + xx] = c;
    }
  }

  /** a filled disc (the mocks' own rule: x² + y² ≤ r² + 0.6 r, so a small disc is round, not a diamond) */
  disc(cx: number, cy: number, r: number, c: string | null): void {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) this.set(cx + x, cy + y, c);
  }

  /** an ellipse, filled (half-axes rx, ry) */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string | null): void {
    for (let y = -ry; y <= ry; y++) {
      for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx + 0.6 * rx) + (y * y) / (ry * ry + 0.6 * ry) <= 1) this.set(cx + x, cy + y, c);
    }
  }

  /** every cell whose centre is inside the polygon (even–odd, edges inclusive enough for a 1 px outline to meet) */
  polyMask(pts: readonly Pt[]): boolean[] {
    const m = new Array<boolean>(this.w * this.h).fill(false);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(this.h - 1, Math.ceil(y1)); y++) {
      for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(this.w - 1, Math.ceil(x1)); x++) {
        if (inside(pts, x + 0.5, y + 0.5) || inside(pts, x, y)) m[y * this.w + x] = true;
      }
    }
    return m;
  }

  /** fill a polygon; with `edge`, its 1 px outline too (cells of the shape that touch the outside, Win95 icon manner) */
  poly(pts: readonly Pt[], fill: string | null, edge?: string): void {
    const m = this.polyMask(pts);
    this.paintMask(m, fill, edge);
  }

  paintMask(m: boolean[], fill: string | null, edge?: string): void {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        if (!m[i]) continue;
        const rim = edge && (x === 0 || y === 0 || x === this.w - 1 || y === this.h - 1
          || !m[i - 1] || !m[i + 1] || !m[i - this.w] || !m[i + this.w]);
        if (rim) this.cells[i] = edge!;
        else if (fill !== null) this.cells[i] = fill;
      }
    }
  }

  /** a disc mask (for outlining a union of discs) */
  discMask(m: boolean[], cx: number, cy: number, r: number): void {
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        const X = Math.round(cx + x), Y = Math.round(cy + y);
        if (x * x + y * y <= r * r + r * 0.6 && X >= 0 && Y >= 0 && X < this.w && Y < this.h) m[Y * this.w + X] = true;
      }
    }
  }

  emptyMask(): boolean[] { return new Array<boolean>(this.w * this.h).fill(false); }

  /** a checkerboard of `c` over a rect: the period's one way to make a third colour out of two */
  checker(x: number, y: number, w: number, h: number, c: string, phase = 0, onlyOn?: string): void {
    for (let yy = Math.round(y); yy < Math.round(y + h); yy++) {
      for (let xx = Math.round(x); xx < Math.round(x + w); xx++) {
        if ((xx + yy + phase) % 2 !== 0) continue;
        if (onlyOn !== undefined && this.get(xx, yy) !== onlyOn) continue;
        this.set(xx, yy, c);
      }
    }
  }

  /** a 1 px line (Bresenham) */
  line(x0: number, y0: number, x1: number, y1: number, c: string): void {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /** the grid as a canvas (one cell, one pixel; empty cells transparent) — built once, drawn with smoothing off */
  toCanvas(): HTMLCanvasElement {
    const cv = document.createElement('canvas');
    cv.width = this.w; cv.height = this.h;
    const ctx = cv.getContext('2d');
    if (!ctx) return cv;
    const img = ctx.createImageData(this.w, this.h);
    const memo = new Map<string, [number, number, number]>();
    for (let i = 0; i < this.cells.length; i++) {
      const c = this.cells[i];
      if (c === null) continue;
      let rgb = memo.get(c);
      if (!rgb) { rgb = hexRgb(c); memo.set(c, rgb); }
      img.data[i * 4] = rgb[0]; img.data[i * 4 + 1] = rgb[1]; img.data[i * 4 + 2] = rgb[2]; img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }
}

/** draw a cached grid canvas at logical (x, y), one cell per logical pixel, never smoothed */
export function blitGrid(ctx: CanvasRenderingContext2D, cv: HTMLCanvasElement, x: number, y: number, w = cv.width, h = cv.height): void {
  const smooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cv, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  ctx.imageSmoothingEnabled = smooth;
}

function inside(pts: readonly Pt[], x: number, y: number): boolean {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function hexRgb(h: string): [number, number, number] {
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
