/** Shared XR-only target assistance. Uses the surfaces' existing hit rectangles. */
import { FRAME } from '../desktop/theme/chrome';
export interface XrRect { x: number; y: number; w: number; h: number; id?: string }
export function xrRects(root: unknown): XrRect[] {
  const out: XrRect[] = [], visited = new Set<object>();
  function visit(value: unknown, depth: number): void {
    if (!value || typeof value !== 'object' || depth > 3 || visited.has(value)) return;
    visited.add(value);
    if (value instanceof Map) { for (const child of value.values()) visit(child, depth + 1); return; }
    const obj = value as Record<string, unknown>;
    if (obj.open === false) return;
    for (const [key, child] of Object.entries(obj)) {
      if (/(hits|rects|buttons)$/i.test(key) && Array.isArray(child)) {
        for (const h of child) if (h && [h.x, h.y, h.w, h.h].every(Number.isFinite) && h.w > 0 && h.h > 0) out.push(h);
      } else if (!Array.isArray(child) && child && Object.getPrototypeOf(child) !== Object.prototype && !(child instanceof HTMLElement) && !(child instanceof CanvasRenderingContext2D)) visit(child, depth + 1);
    }
  }
  visit(root, 0); return out;
}
export function xrTarget(rects: XrRect[], x: number, y: number, minimum: number): XrRect | null {
  const exact = [...rects].reverse().find(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  if (exact) return exact;
  return rects.filter(r => Math.abs(x - r.x - r.w / 2) <= Math.max(minimum, r.w) / 2 && Math.abs(y - r.y - r.h / 2) <= Math.max(minimum, r.h) / 2)
    .sort((a, b) => Math.hypot(x - a.x - a.w / 2, y - a.y - a.h / 2) - Math.hypot(x - b.x - b.w / 2, y - b.y - b.h / 2))[0] ?? null;
}
export function xrOutline(ctx: CanvasRenderingContext2D, rect: XrRect | null): void {
  if (!rect) return;
  ctx.save(); ctx.strokeStyle = FRAME.ink; ctx.lineWidth = 2;
  ctx.strokeRect(Math.round(rect.x), Math.round(rect.y), Math.round(rect.w), Math.round(rect.h)); ctx.restore();
}
