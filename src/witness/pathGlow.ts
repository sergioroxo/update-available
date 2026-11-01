/**
 * ⚑ S281 — ONE GLOW LOGIC FOR THE WHOLE PIECE (his, 1 Nov: "FloppySheep and the message app should slightly glow
 * differently so we can understand where we need to go, that is a logic that should be around the whole experience").
 * Two glows and only two (DESIGN_S280_GLOW_SITES_VERA_FADES_2026-11-01.md §1):
 *   · `path` — the next thing the story needs: the map's current beat, read through the same target ids Lamby's
 *     "Show me" points at (data/strings/lambyGuide.json), so the glow and Lamby never disagree;
 *   · `may`  — something optional and free: the surface names its own (FloppySheep, the "1997" folder, the games).
 * Never on a felt or respite surface (the map's `quiet`), never during the Close. Static rings, drawn with the page:
 * no animation, so no texture uploads of its own (CLAUDE.md: uploads on dirty only).
 */
import guide from '../../data/strings/lambyGuide.json';
import { mapState } from './map';
import type { DesktopOS } from '../desktop/os';

type Steps = Record<string, { target?: string[] }>;
const ERAS = guide.eras as unknown as Record<string, { steps?: Steps }>;

/** the hit ids the story is waiting on now, for this era's surfaces (empty in a quiet scene) */
export function pathTargets(os: DesktopOS, era: string): Set<string> {
  const st = mapState(os);
  if (st.quiet || !st.current || st.current.era !== era) return new Set();
  return new Set(ERAS[era]?.steps?.[st.current.beat.id]?.target ?? []);
}

/** the same, for a surface that has no os of its own: the Start model's current beat id, read through Lamby's targets */
export function stepTargets(era: string, beatId: string | undefined | null): Set<string> {
  return new Set(beatId ? ERAS[era]?.steps?.[beatId]?.target ?? [] : []);
}

export type GlowKind = 'path' | 'may';

/** a soft ring around a rect: `path` warm and 2 px, `may` cool and 1 px, a little further out */
export function drawGlow(ctx: CanvasRenderingContext2D, r: { x: number; y: number; w: number; h: number }, kind: GlowKind, warm: string, cool: string): void {
  ctx.save();
  const pad = kind === 'path' ? 2 : 3;
  ctx.strokeStyle = kind === 'path' ? warm : cool;
  ctx.globalAlpha = kind === 'path' ? 0.9 : 0.55;
  ctx.lineWidth = kind === 'path' ? 2 : 1;
  ctx.strokeRect(Math.round(r.x - pad) + 0.5, Math.round(r.y - pad) + 0.5, Math.round(r.w + pad * 2) - 1, Math.round(r.h + pad * 2) - 1);
  // the path has a halo (a second, fainter ring); "you may" is one quiet line and nothing more
  if (kind === 'path') {
    ctx.globalAlpha *= 0.35;
    ctx.strokeRect(Math.round(r.x - pad - 2) + 0.5, Math.round(r.y - pad - 2) + 0.5, Math.round(r.w + pad * 2 + 4) - 1, Math.round(r.h + pad * 2 + 4) - 1);
  }
  ctx.restore();
}
