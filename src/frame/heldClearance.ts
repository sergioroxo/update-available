/**
 * ⚑ S396 (UiB job 28, the follow-up to his "FIX first" of 15 Nov: "Did you notice that in Headset the white bar is in front
 * of the buttons?") — WHILE ANYTHING IS HELD, NOTHING OF THE FRAME COVERS IT. In the headset job 27 put every plate and
 * notice down while a device is held (xrFrame.setHeld). On the computer and the phone the page layer has its own strips —
 * the sound-caption / sentence strip at the foot, the controls reminder, the call button, the mover's hint, the year
 * counter — and on a phone a held Lamby set fills the height, so the strip sat over its keys (the B6 photos:
 * `after-phone-2016-held-paused`, "[music: the platform's calm loop]" over ⏮ ▶ ❚❚ ⏭).
 *
 * So, each frame while something is held on a flat screen, every listed element whose own place would meet the held
 * device's face (its glass and its keys, as screen rects, app.ts) is placed where it clears it: the top edge first (inside
 * the safe-area inset), then the foot, then the wider side column (its text wraps to the column), stacked if more than one
 * moves; an element no margin can hold is hidden while the device is held (nothing may cover it). An element that clears
 * it where it is stays there — and a moved element also keeps clear of everything of the page layer that shows and stays
 * (the look, menu and turn buttons, any other fixed element; the ?debug=1 panel excepted), so no two of them meet. Put down, every element goes back exactly
 * where it was (its own inline styles are restored). Positions only: the elements' own code keeps their words and their
 * fades. Presses on the device are never taken: these strips are `pointer-events: none`, and the call button, the one
 * pressable notice, is moved off the device like the rest.
 */
export interface ScreenRect { x0: number; y0: number; x1: number; y1: number }

const PROPS = ['left', 'right', 'top', 'bottom', 'transform', 'maxWidth', 'visibility', 'textAlign', 'boxSizing'] as const;
type Saved = Record<(typeof PROPS)[number], string>;

export interface HeldClearance {
  /** once per frame on a flat screen: the held device's face rects (CSS px), or null when nothing is held */
  tick(face: ScreenRect[] | null): void;
  /** the review aid: what is held, and where each element is (the probe) */
  debug(): { held: boolean; face: ScreenRect | null; elements: { id: string; visible: boolean; rect: ScreenRect; placed: string; tried: string[] }[] };
}

const GAP = 6, MARGIN = 6, MIN_COL = 110;

export function mountHeldClearance(elements: () => { id: string; el: HTMLElement | null }[]): HeldClearance {
  const saved = new Map<HTMLElement, Saved>();
  const placed = new Map<HTMLElement, string>();
  const trace = new Map<HTMLElement, string[]>();
  let held = false;
  let faceU: ScreenRect | null = null;
  // the safe-area insets, read once from a probe element (env() is only readable through layout)
  let safe: { t: number; b: number; l: number; r: number } | null = null;
  const insets = (): { t: number; b: number; l: number; r: number } => {
    if (safe) return safe;
    const p = document.createElement('div');
    Object.assign(p.style, { position: 'fixed', visibility: 'hidden', pointerEvents: 'none',
      paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)' } as CSSStyleDeclaration);
    document.body.appendChild(p);
    const cs = getComputedStyle(p);
    safe = { t: parseFloat(cs.paddingTop) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0, r: parseFloat(cs.paddingRight) || 0 };
    p.remove();
    return safe;
  };
  const restore = (): void => {
    for (const [el, s] of saved) for (const k of PROPS) el.style[k] = s[k];
    saved.clear(); placed.clear();
  };
  const hits = (a: DOMRect, b: ScreenRect): boolean => a.width > 0 && a.height > 0 && a.left < b.x1 && a.right > b.x0 && a.top < b.y1 && a.bottom > b.y0;
  const shownNow = (el: HTMLElement): boolean => {
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && parseFloat(cs.opacity) > 0.01;
  };

  return {
    tick(face) {
      if (!face || !face.length) { if (held) { held = false; faceU = null; restore(); } return; }
      held = true;
      const W = window.innerWidth, H = window.innerHeight, s = insets();
      const u: ScreenRect = { x0: Math.min(...face.map((r) => r.x0)) - MARGIN, y0: Math.min(...face.map((r) => r.y0)) - MARGIN,
        x1: Math.max(...face.map((r) => r.x1)) + MARGIN, y1: Math.max(...face.map((r) => r.y1)) + MARGIN };
      faceU = u;
      const list = elements().filter((x): x is { id: string; el: HTMLElement } => !!x.el && x.el.isConnected);
      const listed = new Set(list.map((x) => x.el));
      // pass 1 · every listed element back at its own place: what clears the face stays, the rest moves
      const movers: HTMLElement[] = [];
      for (const { el } of list) {
        if (!saved.has(el)) {
          const o = {} as Saved;
          for (const k of PROPS) o[k] = el.style[k];
          saved.set(el, o);
        }
        const o = saved.get(el)!;
        for (const k of PROPS) el.style[k] = o[k];
        trace.set(el, []);
        if (hits(el.getBoundingClientRect(), u)) movers.push(el); else placed.set(el, 'own');
      }
      // ⚑ what a moved element must also keep clear of: everything of the page layer that shows and stays — the listed
      //   elements that stayed, and any other fixed element of the page (the debug panel, ?debug=1 only, is left out) —
      //   and, as they are placed, the moved elements that show (9fc983b7: the reminder was placed under the look button)
      const obstacles: ScreenRect[] = [];
      const add = (r: DOMRect): void => { if (r.width > 0 && r.height > 0) obstacles.push({ x0: r.left, y0: r.top, x1: r.right, y1: r.bottom }); };
      for (const { el } of list) if (!movers.includes(el) && shownNow(el)) add(el.getBoundingClientRect());
      for (const el of Array.from(document.body.children) as HTMLElement[]) {
        if (listed.has(el) || el.tagName === 'CANVAS' || el.tagName === 'SCRIPT' || el.dataset?.debugUi) continue;
        const cs = getComputedStyle(el);
        if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) <= 0.01) continue;
        const r = el.getBoundingClientRect();
        if (r.width * r.height > W * H * 0.6) continue;   // a whole-screen layer (a veil): not something to stack round
        add(r);
      }
      const blocker = (r: DOMRect): ScreenRect | undefined => obstacles.find((o) => hits(r, o));
      const fullW = Math.min(W - s.l - s.r - GAP * 2, 560);
      const leftW = u.x0 - s.l - GAP * 2, rightW = W - s.r - u.x1 - GAP * 2;
      // pass 2 · each mover: the top edge, the foot, the wider side column, the other; inside each, past what is in the way
      for (const el of movers) {
        const o = saved.get(el)!, tr = trace.get(el)!;
        const set = (v: Partial<Saved>): DOMRect => { for (const k of PROPS) el.style[k] = (v[k] ?? (k === 'boxSizing' && v.visibility !== 'hidden' ? 'border-box' : o[k])); const b = el.getBoundingClientRect(); tr.push(`${Math.round(b.left)},${Math.round(b.top)},${Math.round(b.right)},${Math.round(b.bottom)}`); return b; };
        const mw = (px: number): string => `${Math.max(60, Math.floor(px))}px`;
        // (an element not showing now is placed, so it never fades in over the device, but takes no room from one that is)
        const vis = shownNow(el);
        const accept = (r: DOMRect, where: string): boolean => { if (vis) add(r); placed.set(el, where); return true; };
        const tryTop = (): boolean => {
          let y = s.t + GAP;
          for (let n = 0; n < 12; n++) {
            const r = set({ left: '50%', right: 'auto', bottom: 'auto', top: `${y}px`, transform: 'translateX(-50%)', maxWidth: mw(fullW), visibility: '' });
            if (r.bottom > u.y0 || hits(r, u)) return false;
            const b = blocker(r); if (!b) return accept(r, 'top');
            y = b.y1 + GAP;
          }
          return false;
        };
        const tryFoot = (): boolean => {
          let off = s.b + GAP;
          for (let n = 0; n < 12; n++) {
            const r = set({ left: '50%', right: 'auto', top: 'auto', bottom: `${off}px`, transform: 'translateX(-50%)', maxWidth: mw(fullW), visibility: '' });
            if (r.top < u.y1 || hits(r, u)) return false;
            const b = blocker(r); if (!b) return accept(r, 'bottom');
            off = H - b.y0 + GAP;
          }
          return false;
        };
        const tryCol = (side: 'left' | 'right', w: number): boolean => {
          if (w < MIN_COL) return false;
          let y = s.t + GAP;
          for (let n = 0; n < 12; n++) {
            const r = side === 'left'
              ? set({ left: `${s.l + GAP}px`, right: 'auto', top: `${y}px`, bottom: 'auto', transform: 'none', maxWidth: mw(w), textAlign: 'left', visibility: '' })
              : set({ left: 'auto', right: `${s.r + GAP}px`, top: `${y}px`, bottom: 'auto', transform: 'none', maxWidth: mw(w), textAlign: 'left', visibility: '' });
            if (r.bottom > H - s.b || hits(r, u)) return false;
            const b = blocker(r); if (!b) return accept(r, side);
            y = b.y1 + GAP;
          }
          return false;
        };
        const cols = ([['left', leftW], ['right', rightW]] as ['left' | 'right', number][]).sort((a, b) => b[1] - a[1]);
        if (tryTop() || tryFoot() || tryCol(cols[0][0], cols[0][1]) || tryCol(cols[1][0], cols[1][1])) continue;
        // nowhere clears it: hidden while the device is held (nothing may cover it)
        set({ visibility: 'hidden' });
        placed.set(el, 'hidden');
      }
    },
    debug() {
      return { held, face: faceU, elements: elements().filter((x) => x.el && x.el.isConnected).map(({ id, el }) => {
        const r = el!.getBoundingClientRect();
        return { id, visible: shownNow(el!) && getComputedStyle(el!).visibility !== 'hidden', rect: { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom }, placed: placed.get(el!) ?? 'own', tried: trace.get(el!) ?? [] };
      }) };
    }
  };
}
