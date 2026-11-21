/** Shared XR-only target assistance. Uses the surfaces' existing hit rectangles. */
import { FRAME } from '../desktop/theme/chrome';
export interface XrRect { x: number; y: number; w: number; h: number; id?: string }
export function xrRects(root: unknown): XrRect[] { return xrRectsOwned(root).map(o => o.rect); }
/** ⚑ S358 / H01 — the same rects, each with the object that published it: the root itself, or the root's open window
 *  (the depth-1 object) it came from — so a caller can ask whether a press there would reach that window at all. */
export function xrRectsOwned(root: unknown): { rect: XrRect; owner: object }[] {
  const out: { rect: XrRect; owner: object }[] = [], visited = new Set<object>();
  let owner: object = root as object;
  function visit(value: unknown, depth: number): void {
    if (!value || typeof value !== 'object' || depth > 3 || visited.has(value)) return;
    visited.add(value);
    if (value instanceof Map) { for (const child of value.values()) visit(child, depth + 1); return; }
    const obj = value as Record<string, unknown>;
    // ⚑ P8 (headset B, 1 Nov: "invisible hit boxes", "it keeps pressing the family companion") — below the root,
    //   only a window that says it is OPEN may lend the ray its rects. A closed, finished or never-shown app keeps
    //   its last hits array; walking it made the ray outline and snap to things that were not on the screen.
    if (depth > 0 && obj.open !== true) return;
    for (const [key, child] of Object.entries(obj)) {
      if (/(hits|rects|buttons|covers)$/i.test(key) && Array.isArray(child)) {
        for (const h of child) if (h && [h.x, h.y, h.w, h.h].every(Number.isFinite) && h.w > 0 && h.h > 0) out.push({ rect: h, owner });
      } else if (!Array.isArray(child) && child && Object.getPrototypeOf(child) !== Object.prototype && !(child instanceof HTMLElement) && !(child instanceof CanvasRenderingContext2D)) {
        if (depth === 0) owner = child; visit(child, depth + 1); if (depth === 0) owner = root as object;
      }
    }
  }
  visit(root, 0); return out;
}
/**
 * ⚑ S406 / H2 (his headset run, 20 Nov: the board's cards "can be pressed" behind Lambient's balloon, "This week" and
 * Kindredraft, and their outlines were drawn through those panels and URGENT) — A PANEL ON TOP TAKES THE PRESS AND HIDES
 * WHAT IS UNDER IT. This assistance used to pick from every rect a surface published by array order alone: the last rect
 * containing the ray won, and for a near miss the nearest rect's centre. Surfaces do not agree on what that order means (the
 * desktop pushes in drawing order; 2016's board UNSHIFTS what it draws on top), and a panel's body is not a rect at all, so
 * the ray outlined and snapped to the card UNDER a panel, and the press went to that card.
 *
 * Now the surface decides. A surface may answer `resolve(x, y)`: the id its own press would act on at that point (what its
 * handleClick picks), a COVER id where the point is on a panel's body (the panel takes the press and does nothing), null for
 * nothing there, or undefined for "no opinion" (the old rule). A rect is offered only where the surface itself would press
 * it: at the ray's point, or, for a near miss, at the rect's own centre. Lamby's balloon is a cover on every surface (it lays
 * an `lg-cover` over its body after its buttons, and every surface tests its `lg-` rects first), so a surface without a
 * resolver still keeps the balloon whole. Covers are never targets and never outlined.
 */
export type XrResolve = (x: number, y: number) => string | null | undefined;
export const isCover = (id?: string | null): boolean => !!id && (id === 'lg-cover' || id.startsWith('cover:'));
const inside = (r: XrRect, x: number, y: number): boolean => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
/** every surface that draws Lamby's balloon tests its `lg-` rects before anything else: the balloon is on top */
const guideFirst = (rects: XrRect[]): XrResolve => (x, y) => rects.find(r => r.id?.startsWith('lg-') && inside(r, x, y))?.id ?? undefined;

export function xrTarget(rects: XrRect[], x: number, y: number, minimum: number, resolve?: XrResolve): XrRect | null {
  const ask = resolve ?? guideFirst(rects);
  const live = rects.filter(r => !isCover(r.id));
  const at = ask(x, y);
  if (isCover(at)) return null;   // a panel's body: it takes the press, and nothing under it is offered
  if (at) { const r = live.find(k => k.id === at && inside(k, x, y)); if (r) return r; }
  if (at === undefined) { const exact = [...live].reverse().find(r => inside(r, x, y)); if (exact) return exact; }
  const onTop = (r: XrRect): boolean => {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, c = ask(cx, cy);
    return c === undefined ? !rects.some(k => isCover(k.id) && inside(k, cx, cy)) : c === r.id;
  };
  return live.filter(r => Math.abs(x - r.x - r.w / 2) <= Math.max(minimum, r.w) / 2 && Math.abs(y - r.y - r.h / 2) <= Math.max(minimum, r.h) / 2 && onTop(r))
    .sort((a, b) => Math.hypot(x - a.x - a.w / 2, y - a.y - a.h / 2) - Math.hypot(x - b.x - b.w / 2, y - b.y - b.h / 2))[0] ?? null;
}
/** the outline of the rect the ray is on — ⚑ S406 / H2: never drawn across what lies on top of it (a panel, Lamby's balloon).
 *  Where another rect or a cover wins a press over part of it, that part is cut out of the outline. */
export function xrOutline(ctx: CanvasRenderingContext2D, rect: XrRect | null, rects: XrRect[] = [], resolve?: XrResolve): void {
  if (!rect) return;
  const ask = resolve ?? guideFirst(rects);
  const cuts: XrRect[] = [];
  for (const k of rects) {
    if (k === rect || (k.id !== undefined && k.id === rect.id)) continue;
    const x0 = Math.max(k.x, rect.x), y0 = Math.max(k.y, rect.y), x1 = Math.min(k.x + k.w, rect.x + rect.w), y1 = Math.min(k.y + k.h, rect.y + rect.h);
    if (x1 <= x0 || y1 <= y0) continue;
    const c = ask((x0 + x1) / 2, (y0 + y1) / 2);
    // the ring stands up to 3 px outside its rect: what is cut is the whole of k that lies over the ring's band
    const cx0 = Math.max(k.x, rect.x - 4), cy0 = Math.max(k.y, rect.y - 4), cx1 = Math.min(k.x + k.w, rect.x + rect.w + 4), cy1 = Math.min(k.y + k.h, rect.y + rect.h + 4);
    if ((c !== undefined && c === k.id) || (c === undefined && isCover(k.id))) cuts.push({ x: cx0, y: cy0, w: cx1 - cx0, h: cy1 - cy0 });
  }
  ctx.save();
  if (cuts.length) {
    const t = ctx.getTransform(), W = ctx.canvas.width / (t.a || 1), H = ctx.canvas.height / (t.d || 1);
    ctx.beginPath(); ctx.rect(-4, -4, W + 8, H + 8);
    for (const c of cuts) ctx.rect(c.x, c.y, c.w, c.h);
    ctx.clip('evenodd');
  }
  // ⚑ S406 / H1 (his headset run, 20 Nov: "no hover state" on the content note's and the Lexicon's buttons) — the ring was one
  //   2 px line in the frame's light grey, which vanished on every light window (the setup's beige, the content note, 1997's
  //   dialogs). It is two lines now, a dark one round a light one, so it reads on any ground, light or dark.
  const x = Math.round(rect.x), y = Math.round(rect.y), w = Math.round(rect.w), h = Math.round(rect.h);
  ctx.strokeStyle = FRAME.edge; ctx.lineWidth = 2; ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
  ctx.strokeStyle = FRAME.bright; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
  ctx.restore();
}
