/**
 * ⚑ S417 (UiB job 34 Part A; T101) — 2026'S DESKTOP: an invented operating system of the period, "inspired on" current Mac
 * and Windows (his 22 Nov: "It should be inspired on current software … It is missing the Menu button btw … it can even look
 * like the inside of a Claude/GPT"). The sketch he said yes to: docs/reinterp/refs/2026_os_sketches_2026-11-22.html (Act I).
 *
 *   · THE WALLPAPER: large calm shapes, soft, behind everything. Cached per skin (it never moves, so it is drawn once).
 *   · THE MENU BAR across the top: the MENU BUTTON at its left (this OS's invented mark, a sunrise, and
 *     "Menu"; it publishes the piece's `start-menu`, the same Start menu every era has), the app in front and three of its
 *     menus (decorative: they publish nothing), and on the right the status icons and the clock.
 *   · THE DOCK at the foot: her six apps (L, Kettle, Larkpost, Search, Photos, Settings), a dot under the ones that are open.
 *     An app she cannot reach is dimmed and, pressed, says why in one short line (`tip`).
 *   · WINDOWS: rounded, a soft shadow (translucent layers, no blur: cheap on a 2130-px canvas redrawn on dirty only), this
 *     OS's own two grey controls (never the red-yellow-green dots), the app's name.
 *   · NOTIFICATIONS at the top right, one at a time, in the right window's title band (never over the words she reads), one
 *     line; the slide-in steps at `ANIM_HZ` and is a cut under reduced motion.
 *
 * ⚑ THE SKIN — ONE PLACE SAYS WHICH IS ON (`Desk26.skin`): 'l' (Act I, and L back after the friends), 'secondThoughts'
 * (Act II), 'shepherd' (Act III), 'plain' (the OS with nothing in front of it). The acts set it at the moments the products
 * arrive and fall (e4ActTwo beat 5, e4ActThree's session and the Yes). Part A draws 'l' and 'plain'; the two brands look
 * like 'l' until Part B (S418) gives them their own: `registerSkin(skin, { wallpaper, menuBar, dock, window })` replaces any
 * of the four seams for that skin, and `LOOKS[skin]` holds its colour roles (OS26). Nothing else needs to change.
 *
 * The frame never plays here either: this is the system's own chrome, drawn in its own voice; nothing in it scores, rewards
 * or counts the visitor.
 */
import { setFont, px } from '../theme/chrome';
import { sansFor } from '../theme/fonts';
import { OS26, ERA4, WEB, PLACE } from '../theme/era4';
import { reducedMotion } from '../../state/motion';
import slice from '../../../data/strings/slice.json';
import ACTS from '../../../data/dialog/s4_acts.json';
/** the Menu button's word (every era's: slice.json desktop.startMenu.paperMenu) and a notification's time (s4_acts.json) */
const MENU_WORD = slice.desktop.startMenu.paperMenu;
const NOW_WORD = (ACTS as unknown as { screen: { os: { notes: { now: string } } } }).screen.os.notes.now;
/** ⚑ S418 — Second Thoughts' tile's letters (s4_acts.json screen.os.brand.st.tile) */
const BRAND_TILE = (ACTS as unknown as { screen: { os: { brand: { st: { tile: string } } } } }).screen.os.brand.st.tile;
/** ⚑ S418 — Shepherd Live™'s LIVE bug's word (s4_acts.json act3.b9.studio.live) */
const LIVE_WORD = (ACTS as unknown as { act3: { b9: { studio: { live: string } } } }).act3.b9.studio.live;

export type Skin26 = 'l' | 'secondThoughts' | 'shepherd' | 'plain';
export type App26 = 'l' | 'kettle' | 'lark' | 'search' | 'photos' | 'settings';
export const APPS26: App26[] = ['l', 'kettle', 'lark', 'search', 'photos', 'settings'];
/** ⚑ S418 — a dock tile: one of her apps, or a product that has put itself in her dock (Second Thoughts, Shepherd Live™) */
export type Tile26 = App26 | 'st' | 'shepherd';
export interface Rect26 { x: number; y: number; w: number; h: number }
export interface Hit26 extends Rect26 { id: string }

// ── the geometry (monitor px of 710 × 384) ──────────────────────────────────
/** the menu bar's height */
export const MENU_H = 22;
/** the windows' top (under the menu bar) and their margin at the screen's edges */
export const WIN_Y = 25;
export const WIN_EDGE = 6;
/** half the gap between the two windows (the AI's right edge is aiW − this, her world's left edge aiW + this) */
export const WIN_SEAM = 3;
/** a window's title bar */
export const TITLE_H = 23;
/** the dock: its height, its icons, the gap under it */
export const DOCK_H = 28;
export const DOCK_ICON = 20;
export const DOCK_FOOT = 3;
/** the windows' bottom edge */
export function winBottom(H: number): number { return H - DOCK_H - DOCK_FOOT - 2; }
/** the AI's window (L, Second Thoughts, Shepherd): from the screen's left edge to `aiW`. While it is narrow enough to stand
 *  clear of the dock (Act I's 214, L's 240 after the friends) it runs down to the screen's foot, beside the dock; as it widens
 *  past the dock's edge its foot rises to the windows' line, a step at a time with the widening */
export function aiWindow(aiW: number, W: number, H: number): Rect26 {
  const right = aiW >= W - 40 ? W - WIN_EDGE : aiW - WIN_SEAM;
  const clear = dockRect(W, H, APPS26.length).x - 6;
  const k = Math.max(0, Math.min(1, (right - (clear - 10)) / 30));
  const bottom = Math.round(H - WIN_EDGE - k * (H - WIN_EDGE - winBottom(H)));
  return { x: WIN_EDGE, y: WIN_Y, w: Math.max(0, right - WIN_EDGE), h: bottom - WIN_Y };
}
/** her world's window, on the right of the AI's (none when the AI's window has the whole screen) */
export function worldWindow(aiW: number, W: number, H: number): Rect26 {
  const x = aiW + WIN_SEAM;
  return { x, y: WIN_Y, w: aiW >= W - 40 ? 0 : Math.max(0, W - WIN_EDGE - x), h: winBottom(H) - WIN_Y };
}
/** a window's content, under its title bar */
export function contentOf(r: Rect26): Rect26 { return { x: r.x + 1, y: r.y + TITLE_H, w: Math.max(0, r.w - 2), h: Math.max(0, r.h - TITLE_H - 1) }; }

// ── colour with alpha (the same hex, translucent: frosted bars, the shadow's layers) ──
export function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
/** a rounded rectangle's path (smooth: the screens are mipmapped and trilinear, his 9 Nov exception) */
export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath(); rrPath(ctx, x, y, w, h, r);
}
/** …added to the current path (a hole, a second shape) */
export function rrPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
export function fillRR(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string): void {
  rr(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
}
export function edgeRR(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, edge: string, fill: string): void {
  rr(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
  rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, Math.max(0, r - 0.5)); ctx.strokeStyle = edge; ctx.lineWidth = 1; ctx.stroke();
}
/** the soft shadow under a window or a card: three translucent layers, no blur, drawn only OUTSIDE the shape (so it may be
 *  laid before or after what is inside it) */
export function softShadow(ctx: CanvasRenderingContext2D, r: Rect26, radius: number, strength = 1, color: string = OS26.shadow): void {
  ctx.save();
  ctx.beginPath(); ctx.rect(r.x - 12, r.y - 12, r.w + 24, r.h + 24); rrPath(ctx, r.x, r.y, r.w, r.h, radius); ctx.clip('evenodd');
  const layers: [number, number, number][] = [[4, 3, 0.05], [2, 2, 0.06], [1, 1, 0.07]];
  for (const [grow, dy, a] of layers) fillRR(ctx, r.x - grow, r.y - grow + dy, r.w + 2 * grow, r.h + 2 * grow, radius + grow, alpha(color, Math.min(1, a * strength)));
  ctx.restore();
}
/** ⚑ S418 — a glow around a shape (a brand's light, not a shadow): `layers` rings of `color`, outside the shape only */
export function glow(ctx: CanvasRenderingContext2D, r: Rect26, radius: number, color: string, a = 0.12, spread = 6): void {
  ctx.save();
  ctx.beginPath(); ctx.rect(r.x - spread - 4, r.y - spread - 4, r.w + 2 * spread + 8, r.h + 2 * spread + 8); rrPath(ctx, r.x, r.y, r.w, r.h, radius); ctx.clip('evenodd');
  for (let g = spread; g >= 1; g -= Math.max(1, Math.round(spread / 3))) fillRR(ctx, r.x - g, r.y - g, r.w + 2 * g, r.h + 2 * g, radius + g, alpha(color, a));
  ctx.restore();
}
/** fit a line to `w` px with an ellipsis */
export function fit26(ctx: CanvasRenderingContext2D, text: string, w: number): string {
  if (ctx.measureText(text).width <= w) return text;
  let n = text.length; while (n > 0 && ctx.measureText(`${text.slice(0, n).trimEnd()}…`).width > w) n--;
  return `${text.slice(0, n).trimEnd()}…`;
}

// ── THE SKINS ───────────────────────────────────────────────────────────────
/** a skin's colour roles (all OS26 / the era's blocks) */
export interface Look26 {
  ground: string; shapes: { x: number; y: number; r: number; c: string; a: number }[];
  bar: string; barAlpha: number; barInk: string; barInk2: string; barEdge: string;
  menuButton: string; menuButtonInk: string;
  dock: string; dockAlpha: number; dockEdge: string;
  // ⚑ S418 (Part B) — the rest of the chrome, per skin: the windows (body, title band, edge and its width, rule, title ink,
  //   controls), the soft shadow's colour and strength (a brand may glow instead), the AI window's own sheen and glow, the
  //   dock's dot and how far an app she cannot reach is dimmed, the wallpaper's stripes, and the menu bar's manners (the app's
  //   name in bold, the app's menus shown, a hazard line under the bar)
  win: string; winTitle: string; winEdge: string; winEdgeW: number; winRule: string; winInk: string; winInk2: string; winControl: string;
  shadow: string; shadowA: number; aiSheen: string | null; aiGlow: string | null;
  dockDot: string; dim: number;
  stripes: { c: string; a: number; w: number } | null;
  appBold: boolean; menus: boolean; barHazard: boolean;
  /** the status icons (wifi, battery, its per cent): a takeover's bar has no room for them (its claim and her way back do) */
  status: boolean;
}
const L_LOOK: Look26 = {
  ground: OS26.wallGround,
  shapes: [
    { x: 600, y: 40, r: 250, c: OS26.wallSky, a: 0.95 },
    { x: 130, y: 120, r: 230, c: OS26.wallLilac, a: 0.9 },
    { x: 40, y: 400, r: 240, c: OS26.wallPeach, a: 0.95 },
    { x: 470, y: 420, r: 220, c: OS26.wallRose, a: 0.85 },
    { x: 330, y: 230, r: 120, c: OS26.wallMint, a: 0.45 }
  ],
  bar: OS26.bar, barAlpha: 0.8, barInk: OS26.barInk, barInk2: OS26.barInk2, barEdge: OS26.barEdge,
  menuButton: OS26.menuButton, menuButtonInk: OS26.menuButtonInk,
  dock: OS26.dock, dockAlpha: 0.62, dockEdge: OS26.dockEdge,
  win: OS26.win, winTitle: OS26.winTitle, winEdge: OS26.winEdge, winEdgeW: 1, winRule: OS26.winRule, winInk: OS26.winInk, winInk2: OS26.winInk2,
  winControl: OS26.winControl, shadow: OS26.shadow, shadowA: 1, aiSheen: OS26.lSheen, aiGlow: OS26.lGlow,
  dockDot: OS26.dockDot, dim: 0.38, stripes: null, appBold: true, menus: true, barHazard: false, status: true
};
const PLAIN_LOOK: Look26 = {
  ...L_LOOK,
  ground: OS26.plainGround,
  shapes: [
    { x: 600, y: 40, r: 250, c: OS26.plainSky, a: 0.9 },
    { x: 130, y: 120, r: 230, c: OS26.plainLilac, a: 0.85 },
    { x: 40, y: 400, r: 240, c: OS26.plainPeach, a: 0.85 }
  ],
  // the OS with nothing in front of it: L's window without its sheen or its glow
  aiSheen: null, aiGlow: null, appBold: false
};
/** ⚑ S418 — SECOND THOUGHTS' TAKEOVER (Act II): the sponsored card's yellow (PLACE.sunHi) on every surface of the desktop —
 *  the menu bar, the windows' chrome, the dock's shelf — and the wallpaper gone dark under its hazard stripes */
const ST_LOOK: Look26 = {
  ground: OS26.stGround,
  shapes: [{ x: 640, y: 420, r: 300, c: PLACE.sunHi, a: 0.16 }, { x: 60, y: 30, r: 240, c: PLACE.sunHi, a: 0.1 }],
  bar: PLACE.sunHi, barAlpha: 1, barInk: OS26.stInk, barInk2: OS26.stPanel2, barEdge: OS26.stInk,
  menuButton: OS26.stInk, menuButtonInk: PLACE.sunHi,
  dock: OS26.stInk, dockAlpha: 0.94, dockEdge: PLACE.sunHi,
  win: OS26.stPanel, winTitle: PLACE.sunHi, winEdge: PLACE.sunHi, winEdgeW: 2, winRule: OS26.stInk, winInk: OS26.stInk, winInk2: OS26.stPanel2,
  winControl: OS26.stInk, shadow: PLACE.sunHi, shadowA: 2.2, aiSheen: null, aiGlow: null,
  dockDot: PLACE.sunHi, dim: 0.28, stripes: { c: PLACE.sunHi, a: 0.13, w: 22 }, appBold: true, menus: false, barHazard: true, status: false
};
/** ⚑ S418 — SHEPHERD LIVE™ (Act III): live television about her — the studio's navy and gold over the whole desktop */
const SH_LOOK: Look26 = {
  ground: OS26.shNavy,
  shapes: [{ x: 120, y: 420, r: 260, c: OS26.shGold, a: 0.18 }, { x: 600, y: 420, r: 260, c: OS26.shGold, a: 0.18 }, { x: 355, y: -60, r: 300, c: OS26.shStage, a: 0.8 }],
  bar: OS26.shPlate, barAlpha: 0.96, barInk: OS26.shGold, barInk2: OS26.shText, barEdge: OS26.shGoldLo,
  menuButton: OS26.shGold, menuButtonInk: OS26.shNavy,
  dock: OS26.shNavy2, dockAlpha: 0.94, dockEdge: OS26.shGoldLo,
  win: OS26.shNavy2, winTitle: OS26.shPlate, winEdge: OS26.shGold, winEdgeW: 1.5, winRule: OS26.shGoldLo, winInk: OS26.shGold, winInk2: OS26.shText,
  winControl: OS26.shGold, shadow: OS26.shGold, shadowA: 1.4, aiSheen: null, aiGlow: null,
  dockDot: OS26.shGold, dim: 0.26, stripes: null, appBold: true, menus: false, barHazard: false, status: true
};
/** the skins' looks (OS26; Second Thoughts' yellow is the sponsored card's, `PLACE.sunHi`) */
export const LOOKS: Record<Skin26, Look26> = { l: L_LOOK, secondThoughts: ST_LOOK, shepherd: SH_LOOK, plain: PLAIN_LOOK };

/** what a seam is handed: the screen's size, the desk's state, a way to publish a press */
export interface SeamApi { W: number; H: number; desk: Desk26; push(h: Hit26): void }
/** ⚑ THE FOUR SEAMS a skin may replace (Part B): each returns true when it drew (then the default is skipped) */
export interface SkinPainters {
  wallpaper?(ctx: CanvasRenderingContext2D, api: SeamApi): boolean;
  menuBar?(ctx: CanvasRenderingContext2D, bar: MenuBar26, api: SeamApi): boolean;
  dock?(ctx: CanvasRenderingContext2D, dock: DockApp[], api: SeamApi): boolean;
  window?(ctx: CanvasRenderingContext2D, r: Rect26, w: Window26, api: SeamApi): boolean;
}
const PAINTERS: Partial<Record<Skin26, SkinPainters>> = {};
export function registerSkin(skin: Skin26, painters: SkinPainters): void { PAINTERS[skin] = { ...PAINTERS[skin], ...painters }; }
export function look26(skin: Skin26): Look26 { return LOOKS[skin]; }

// ── THE DESK'S STATE ────────────────────────────────────────────────────────
/** a notification (⚑ S418: `tone` 'st' — the sponsored card's arrival, in Second Thoughts' own yellow) */
export interface Note26 { app: Tile26; title: string; text: string; seconds: number; tone?: 'st' }
export interface MenuBar26 { app: string; menus: string[]; status: string; date: string; menuOpen: boolean; memory?: { label: string; n: string } | null;
  /** ⚑ S418 — the brand's mark before the app's name: L's ✦, or Shepherd Live™'s red LIVE dot */
  appMark?: 'spark' | 'live' | null;
  /** ⚑ S418 — the brand's claim after the app's name (Second Thoughts': "is using your computer") */
  claim?: string | null;
  /** ⚑ S418 — a status item of the brand's, left of the clock (L's boast, with its ✦) */
  boast?: string | null;
  /** ⚑ S418 — her way back while the AI uses her computer: greyed, never pressable (job 33's banner control, moved here) */
  control?: string | null }
export interface DockApp { app: Tile26; label: string; open: boolean; reachable: boolean }
export interface Window26 { title: string; ai?: boolean; active?: boolean }

export class Desk26 {
  /** ⚑ which skin is on: the one place that says it (the acts set it; every seam reads it) */
  skin: Skin26 = 'l';
  /** the dock's one-line reason, over the icon that was pressed, for a few seconds */
  tip: { app: Tile26; text: string; t: number } | null = null;
  /** notifications: the one showing, and those waiting (one at a time) */
  note: (Note26 & { t: number; step: number }) | null = null;
  private queue: (Note26 & { waited: number })[] = [];
  /** something else has the floor (a person's words, the guide's balloon, the film): notifications wait */
  hush = false;
  version = 0;
  /** ⚑ S418 — THE FALL: when her Yes removes Second Thoughts, the show's chrome and then the yellow fall off the desktop in a
   *  few steps (≤ 3 changes a second; reduced motion: a cut). `peel` is the middle step: the plain OS with the last of the
   *  yellow torn off its menu bar and its dock */
  peel = false;
  private falling: { steps: (Skin26 | 'peel')[]; i: number; t: number; per: number } | null = null;
  setSkin(s: Skin26): void { this.falling = null; this.peel = false; if (this.skin !== s) { this.skin = s; this.version++; } }
  /** the brands fall: each step held `per` seconds (≥ 1/3 s), the last one stays */
  fall(steps: (Skin26 | 'peel')[], per = 0.4): void {
    if (reducedMotion() || steps.length < 2) { const last = steps[steps.length - 1]; this.setSkin(last === 'peel' ? 'plain' : last); return; }
    this.falling = { steps, i: -1, t: 0, per: Math.max(1 / 3, per) };
    this.stepFall();
  }
  private stepFall(): void {
    const f = this.falling; if (!f) return;
    f.i++; f.t = 0;
    const s = f.steps[f.i];
    this.peel = s === 'peel';
    this.skin = s === 'peel' ? 'plain' : s;
    this.version++;
    if (f.i >= f.steps.length - 1) this.falling = null;
  }
  notify(n: Note26): void { this.queue.push({ ...n, waited: 0 }); }
  /** a notification (or the dock's reason) is up: the guide waits for it (one voice at a time) */
  get speaking(): boolean { return !!this.note; }
  /** the clock: notifications slide in on the animation steps, hold, and go; the reason line goes after its time */
  update(dt: number, animHz: number): void {
    if (this.falling) { this.falling.t += dt; if (this.falling.t >= this.falling.per) this.stepFall(); }
    if (this.tip) { this.tip.t -= dt; if (this.tip.t <= 0) { this.tip = null; this.version++; } }
    // a notification that waited too long for the floor is dropped: its moment has passed (it never arrives out of place)
    for (const q of this.queue) q.waited += dt;
    this.queue = this.queue.filter((q) => q.waited < 14);
    if (!this.note && this.queue.length && !this.hush) { this.note = { ...this.queue.shift()!, t: 0, step: -1 }; this.version++; }
    if (this.note) {
      const n = this.note, was = n.step;
      n.t += dt;
      n.step = Math.min(SLIDE_STEPS, Math.floor(n.t * animHz));
      if (n.step !== was && was < SLIDE_STEPS) this.version++;
      if (n.t >= n.seconds) { this.note = null; this.version++; }
    }
  }
  showTip(app: Tile26, text: string): void { this.tip = { app, text, t: 3.2 }; this.version++; }
  clear(): void { this.note = null; this.queue = []; this.tip = null; this.version++; }
}
const SLIDE_STEPS = 4;

// ── THE WALLPAPER ───────────────────────────────────────────────────────────
const wallCache = new Map<string, HTMLCanvasElement>();
function paintWall(ctx: CanvasRenderingContext2D, W: number, H: number, L: Look26): void {
  ctx.fillStyle = L.ground; ctx.fillRect(0, 0, W, H);
  // ⚑ S418 — Second Thoughts' hazard stripes across the dark (the takeover's wallpaper)
  if (L.stripes) hazard(ctx, 0, 0, W, H, L.stripes.c, L.stripes.a, L.stripes.w);
  for (const s of L.shapes) {
    const g = ctx.createRadialGradient(s.x, s.y, s.r * 0.15, s.x, s.y, s.r);
    g.addColorStop(0, alpha(s.c, s.a)); g.addColorStop(0.62, alpha(s.c, s.a * 0.75)); g.addColorStop(1, alpha(s.c, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}
export function drawWallpaper(ctx: CanvasRenderingContext2D, api: SeamApi): void {
  const { W, H, desk } = api;
  if (PAINTERS[desk.skin]?.wallpaper?.(ctx, api)) return;
  const scale = Math.max(1, Math.round(ctx.getTransform().a * 100) / 100);
  const key = `${desk.skin}|${W}x${H}|${scale}`;
  let c = wallCache.get(key);
  if (!c) {
    c = document.createElement('canvas'); c.width = Math.round(W * scale); c.height = Math.round(H * scale);
    const g = c.getContext('2d'); if (g) { g.scale(scale, scale); paintWall(g, W, H, look26(desk.skin)); }
    wallCache.set(key, c);
  }
  ctx.drawImage(c, 0, 0, W, H);
}

// ── THE MENU BAR ────────────────────────────────────────────────────────────
/** this OS's invented mark: a sunrise (a half sun on its horizon; no real OS's) */
export function osMark(ctx: CanvasRenderingContext2D, x: number, y: number, d: number, ink: string): void {
  ctx.fillStyle = ink;
  ctx.beginPath(); ctx.arc(x + d / 2, y + d * 0.68, d * 0.4, Math.PI, 0); ctx.closePath(); ctx.fill();
  fillRR(ctx, x, y + d * 0.8, d, Math.max(1.5, d * 0.16), d * 0.08, ink);
}
function wifiIcon(ctx: CanvasRenderingContext2D, x: number, y: number, ink: string): void {
  ctx.strokeStyle = ink; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
  for (const r of [3, 6.5]) { ctx.beginPath(); ctx.arc(x + 7, y + 10, r, -Math.PI * 0.78, -Math.PI * 0.22); ctx.stroke(); }
  ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(x + 7, y + 10, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.lineCap = 'butt';
}
function batteryIcon(ctx: CanvasRenderingContext2D, x: number, y: number, ink: string, k: number): void {
  rr(ctx, x + 0.5, y + 0.5, 17, 9, 2.5); ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.stroke();
  fillRR(ctx, x + 2, y + 2, Math.round(14 * k), 6, 1.5, ink);
  px(ctx, x + 18, y + 3, 2, 4, ink);
}
/** the menu bar: returns the Menu button's rect (its press is the piece's `start-menu`) and where its status area begins (the
 *  Memory item, Second Thoughts', sits left of it). ⚑ S418 — each skin's bar: L's ✦ before its name and its boast at the
 *  right; Second Thoughts' yellow with its claim and the greyed way back; Shepherd Live™'s black and gold with the LIVE dot */
export function drawMenuBar(ctx: CanvasRenderingContext2D, bar: MenuBar26, api: SeamApi): { button: Rect26; statusX: number } {
  const { W, desk } = api;
  const L = look26(desk.skin);
  setFont(ctx, 11);
  const mlabel = MENU_WORD, mw = Math.ceil(ctx.measureText(mlabel).width) + 30;
  const button = { x: 5, y: 3, w: mw, h: MENU_H - 6 };
  let statusX = W;
  if (!PAINTERS[desk.skin]?.menuBar?.(ctx, bar, api)) {
    ctx.fillStyle = alpha(L.bar, L.barAlpha); ctx.fillRect(0, 0, W, MENU_H);
    px(ctx, 0, MENU_H - 1, W, 1, alpha(L.barEdge, 0.9));
    if (L.barHazard) hazard(ctx, 0, MENU_H - 3, W, 3, L.barInk, 1, 6);
    // the Menu button: dark, rounded, the mark and its word (pressed in: inverted)
    if (bar.menuOpen) edgeRR(ctx, button.x, button.y, button.w, button.h, 8, L.menuButton, L.bar);
    else fillRR(ctx, button.x, button.y, button.w, button.h, 8, L.menuButton);
    const ink = bar.menuOpen ? L.menuButton : L.menuButtonInk;
    osMark(ctx, button.x + 7, button.y + 3, 10, ink);
    setFont(ctx, 11); ctx.fillStyle = ink; ctx.fillText(mlabel, button.x + 21, button.y + 2);
    // the app in front (its brand's mark before it), its claim, and three of its menus (decorative)
    let x = button.x + button.w + 12;
    if (bar.appMark === 'spark') { sparkle(ctx, x, 5, 12, ERA4.l); sparkle(ctx, x + 10, 3, 5, OS26.lGold); x += 17; }
    if (bar.appMark === 'live') {
      setFont(ctx, 11);
      const lw = Math.ceil(ctx.measureText(LIVE_WORD).width) + 22;
      fillRR(ctx, x, 3, lw, 16, 4, OS26.shLive);
      fillRR(ctx, x + 6, 8, 6, 6, 3, OS26.shText);
      heavyText(ctx, LIVE_WORD, x + 15, 4, OS26.shText, 0.4);
      x += lw + 8;
    }
    const big = bar.claim ? 11 : 12;
    setFont(ctx, big); if (L.appBold) heavyText(ctx, bar.app, x, 12 - big + 4, L.barInk); else { ctx.fillStyle = L.barInk; ctx.fillText(bar.app, x, 4); } x += Math.ceil(ctx.measureText(bar.app).width) + 7;
    if (bar.claim) { setFont(ctx, 11); ctx.fillStyle = L.barInk; const t = `· ${bar.claim}`; ctx.fillText(t, x, 5); x += Math.ceil(ctx.measureText(t).width) + 14; }
    if (L.menus) {
      x += 4; setFont(ctx, 11);
      for (const m of bar.menus) { ctx.fillStyle = L.barInk; ctx.fillText(m, x, 5); x += Math.ceil(ctx.measureText(m).width) + 13; }
    }
    // the right: the clock, the battery, the wifi (and Memory, Second Thoughts', from beat 6: E4Browser draws it here)
    setFont(ctx, 11);
    const dw = Math.ceil(ctx.measureText(bar.date).width);
    let rx = W - 10 - dw;
    ctx.fillStyle = L.barInk; ctx.fillText(bar.date, rx, 5);
    if (L.status) {
      const sw = Math.ceil(ctx.measureText(bar.status).width);
      rx -= 12 + sw; ctx.fillStyle = L.barInk; ctx.fillText(bar.status, rx, 5);
      rx -= 26; batteryIcon(ctx, rx, 6, L.barInk, 0.82);
      rx -= 22; wifiIcon(ctx, rx, 3, L.barInk);
    }
    rx -= 10;
    // her way back while the AI uses her computer: there, and greyed (never pressable: job 33's banner control)
    if (bar.control) {
      setFont(ctx, 11);
      const cw = Math.ceil(ctx.measureText(bar.control).width) + 18, cx = rx - cw;
      fillRR(ctx, cx, 3, cw, MENU_H - 6, (MENU_H - 6) / 2, alpha(L.barInk, 0.14));
      ctx.fillStyle = alpha(L.barInk, 0.45); ctx.fillText(bar.control, cx + 9, 5);
      rx = cx - 8;
    }
    // L's boast, a status item of its own: its ✦ and its words
    if (bar.boast) {
      setFont(ctx, 11);
      const bw = Math.ceil(ctx.measureText(bar.boast).width) + 30, bx = rx - bw;
      if (bx > x + 8) {
        fillRR(ctx, bx, 3, bw, MENU_H - 6, (MENU_H - 6) / 2, alpha(ERA4.l, 0.16));
        sparkle(ctx, bx + 7, 6, 10, ERA4.l);
        ctx.fillStyle = WEB.accentInk; ctx.fillText(bar.boast, bx + 22, 5);
        rx = bx - 8;
      }
    }
    // the last of the yellow, torn off the bar as it falls (the fall's middle step)
    if (desk.peel) torn(ctx, Math.round(W * 0.58), 0, W - Math.round(W * 0.58), MENU_H, PLACE.sunHi);
    statusX = rx + 10;
  } else statusX = statusLeft(ctx, W, bar);
  api.push({ x: 0, y: 0, w: button.x + button.w + 4, h: MENU_H, id: 'start-menu' });
  return { button, statusX };
}
/** where the menu bar's status area begins (the Memory item sits left of it), for a bar with no brand items */
export function statusLeft(ctx: CanvasRenderingContext2D, W: number, bar: MenuBar26): number {
  setFont(ctx, 11);
  return W - 10 - Math.ceil(ctx.measureText(bar.date).width) - 12 - Math.ceil(ctx.measureText(bar.status).width) - 26 - 22 - 10;
}
/** ⚑ S418 — type made heavier than the 2026 face's 600 (only 400 and 600 are vendored): filled, then traced in its own ink —
 *  the brands' shouting weight (Second Thoughts' name, Shepherd's title, the stickers) */
export function heavyText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, ink: string, k = 0.7): void {
  ctx.fillStyle = ink; ctx.fillText(text, x, y);
  ctx.strokeStyle = ink; ctx.lineWidth = k; ctx.lineJoin = 'round'; ctx.strokeText(text, x, y);
}
/** ⚑ S418 — hazard stripes (Second Thoughts' motif): diagonal bands of `c` at `a` over the rect, `w` px wide */
export function hazard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string, a: number, bw: number): void {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = alpha(c, a);
  for (let k = -h; k < w + h; k += bw * 2) {
    ctx.beginPath(); ctx.moveTo(x + k, y + h); ctx.lineTo(x + k + h, y); ctx.lineTo(x + k + h + bw, y); ctx.lineTo(x + k + bw, y + h); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
/** ⚑ S418 — a strip of colour with a torn left edge (the yellow peeling off as the brands fall) */
export function torn(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string): void {
  ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + 6, y);
  const n = Math.max(2, Math.round(h / 5));
  for (let i = 1; i <= n; i++) ctx.lineTo(x + (i % 2 ? 0 : 9) + ((i * 7) % 5), y + Math.round((h * i) / n));
  ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
}

// ── THE DOCK ────────────────────────────────────────────────────────────────
/** an app's tile: its colour and its glyph (invented, plain shapes) */
export function appTile(ctx: CanvasRenderingContext2D, app: Tile26, x: number, y: number, d: number, dim: boolean | number = false): void {
  const fill = app === 'l' ? ERA4.lDim : app === 'kettle' ? OS26.appKettle : app === 'lark' ? OS26.appLark
    : app === 'search' ? OS26.appSearch : app === 'photos' ? OS26.appPhotos : app === 'st' ? PLACE.sunHi : app === 'shepherd' ? OS26.shNavy : OS26.appSettings;
  ctx.save();
  if (dim) ctx.globalAlpha = typeof dim === 'number' ? dim : 0.38;
  fillRR(ctx, x, y, d, d, Math.round(d * 0.26), fill);
  const ink = OS26.appInk, cx = x + d / 2, cy = y + d / 2, k = d / 20;
  ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.lineWidth = 1.6 * k;
  if (app === 'st') {
    // ⚑ S418 — Second Thoughts' tile: its two letters, black on its yellow, a hazard corner
    hazard(ctx, x, y + d * 0.72, d, d * 0.28, OS26.stInk, 0.9, Math.max(2, d * 0.14));
    // its letters at the reading floor's 11 px at least (S418b: text-angle counted a 20-px tile's 9 px letters)
    const fs = Math.max(11, Math.round(d * 0.46));
    ctx.font = `600 ${fs}px ${sansFor('e4')}`; ctx.textBaseline = 'top';
    const t = BRAND_TILE, tw = ctx.measureText(t).width;
    heavyText(ctx, t, Math.round(cx - tw / 2), Math.round(y + Math.max(1, d * 0.66 - fs)), OS26.stInk, 0.8 * k);
  } else if (app === 'shepherd') {
    // ⚑ S418 — Shepherd Live™'s tile: the studio's halo ring in gold over a red live dot
    ctx.strokeStyle = OS26.shGold; ctx.lineWidth = 2 * k;
    ctx.beginPath(); ctx.ellipse(cx, cy - 1 * k, 6.5 * k, 2.6 * k, 0, 0, Math.PI * 2); ctx.stroke();
    fillRR(ctx, cx - 2.5 * k, cy + 4 * k, 5 * k, 5 * k, 2.5 * k, OS26.shLive);
  } else if (app === 'l') {
    // L's sparkle (the assistant's four points)
    const r = 6.5 * k, q = r * 0.24;
    ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.quadraticCurveTo(cx + q, cy - q, cx + r, cy); ctx.quadraticCurveTo(cx + q, cy + q, cx, cy + r);
    ctx.quadraticCurveTo(cx - q, cy + q, cx - r, cy); ctx.quadraticCurveTo(cx - q, cy - q, cx, cy - r); ctx.closePath(); ctx.fill();
  } else if (app === 'kettle') {
    // a speech bubble
    fillRR(ctx, x + 4 * k, y + 5 * k, 12 * k, 8.5 * k, 3.5 * k, ink);
    ctx.beginPath(); ctx.moveTo(x + 7 * k, y + 13 * k); ctx.lineTo(x + 6 * k, y + 16 * k); ctx.lineTo(x + 10 * k, y + 13 * k); ctx.closePath(); ctx.fill();
  } else if (app === 'lark') {
    // an envelope
    rr(ctx, x + 4 * k, y + 6 * k, 12 * k, 8.5 * k, 1.5 * k); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 4.5 * k, y + 6.8 * k); ctx.lineTo(cx, y + 11 * k); ctx.lineTo(x + 15.5 * k, y + 6.8 * k); ctx.stroke();
  } else if (app === 'search') {
    // a lens
    ctx.beginPath(); ctx.arc(x + 8.8 * k, y + 8.8 * k, 4 * k, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 11.8 * k, y + 11.8 * k); ctx.lineTo(x + 15.5 * k, y + 15.5 * k); ctx.stroke();
  } else if (app === 'photos') {
    // a hill and a sun
    ctx.beginPath(); ctx.arc(x + 13 * k, y + 7 * k, 2.2 * k, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 3.5 * k, y + 15.5 * k); ctx.lineTo(x + 8.5 * k, y + 9 * k); ctx.lineTo(x + 12 * k, y + 13 * k); ctx.lineTo(x + 13.8 * k, y + 11 * k);
    ctx.lineTo(x + 16.5 * k, y + 15.5 * k); ctx.closePath(); ctx.fill();
  } else {
    // a gear
    ctx.beginPath(); ctx.arc(cx, cy, 3.4 * k, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 4.6 * k, cy + Math.sin(a) * 4.6 * k); ctx.lineTo(cx + Math.cos(a) * 6.6 * k, cy + Math.sin(a) * 6.6 * k); ctx.stroke(); }
  }
  ctx.restore();
}
/** the dock's rect for these apps */
export function dockRect(W: number, H: number, n: number): Rect26 {
  const w = n * (DOCK_ICON + 8) + 8;
  return { x: Math.round((W - w) / 2), y: H - DOCK_FOOT - DOCK_H, w, h: DOCK_H };
}
/** the dock: publishes `dock:<app>` for every icon (a reader's press: it never moves the story) */
export function drawDock(ctx: CanvasRenderingContext2D, apps: DockApp[], api: SeamApi): void {
  const { W, H, desk } = api;
  const L = look26(desk.skin);
  const r = dockRect(W, H, apps.length);
  if (!PAINTERS[desk.skin]?.dock?.(ctx, apps, api)) {
    softShadow(ctx, r, 11, 0.7 * L.shadowA, L.shadow);
    fillRR(ctx, r.x, r.y, r.w, r.h, 11, alpha(L.dock, L.dockAlpha));
    rr(ctx, r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, 10.5); ctx.strokeStyle = alpha(L.dockEdge, 0.9); ctx.lineWidth = 1; ctx.stroke();
    apps.forEach((a, i) => {
      const x = r.x + 8 + i * (DOCK_ICON + 8), y = r.y + 3;
      appTile(ctx, a.app, x, y, DOCK_ICON, !a.reachable && !a.open ? L.dim : false);
      if (a.open) fillRR(ctx, x + DOCK_ICON / 2 - 1.5, r.y + r.h - 4, 3, 3, 1.5, L.dockDot);
    });
  }
  if (desk.peel) torn(ctx, r.x + Math.round(r.w * 0.45), r.y - 2, Math.round(r.w * 0.55), 6, PLACE.sunHi);
  apps.forEach((a, i) => {
    const x = r.x + 8 + i * (DOCK_ICON + 8);
    api.push({ x: x - 4, y: r.y, w: DOCK_ICON + 8, h: r.h, id: `dock:${a.app}` });
  });
  // the reason line, over the icon she pressed (one short line; it goes after a few seconds)
  const tip = desk.tip;
  if (tip) {
    const i = apps.findIndex((a) => a.app === tip.app);
    if (i >= 0) {
      setFont(ctx, 11);
      const tw = Math.ceil(ctx.measureText(tip.text).width) + 20, th = 22;
      const cx = r.x + 8 + i * (DOCK_ICON + 8) + DOCK_ICON / 2;
      const tx = Math.max(6, Math.min(W - 6 - tw, Math.round(cx - tw / 2))), ty = r.y - th - 6;
      softShadow(ctx, { x: tx, y: ty, w: tw, h: th }, 8, 0.8);
      fillRR(ctx, tx, ty, tw, th, 8, OS26.tip);
      ctx.beginPath(); ctx.moveTo(cx - 5, ty + th); ctx.lineTo(cx, ty + th + 5); ctx.lineTo(cx + 5, ty + th); ctx.closePath(); ctx.fillStyle = OS26.tip; ctx.fill();
      setFont(ctx, 11); ctx.fillStyle = OS26.tipInk; ctx.fillText(tip.text, tx + 10, ty + 5);
    }
  }
}

// ── WINDOWS ─────────────────────────────────────────────────────────────────
/** this OS's own two controls (a fold and a close), grey glyphs in soft squares: never the traffic-light dots */
function windowControls(ctx: CanvasRenderingContext2D, x: number, y: number, ink: string = OS26.winControl): number {
  for (let i = 0; i < 2; i++) {
    const bx = x + i * 15;
    fillRR(ctx, bx, y, 12, 12, 3.5, alpha(ink, 0.18));
    ctx.strokeStyle = ink; ctx.lineWidth = 1.3; ctx.beginPath();
    if (i === 0) { ctx.moveTo(bx + 3.5, y + 6); ctx.lineTo(bx + 8.5, y + 6); }
    else { ctx.moveTo(bx + 3.8, y + 3.8); ctx.lineTo(bx + 8.2, y + 8.2); ctx.moveTo(bx + 8.2, y + 3.8); ctx.lineTo(bx + 3.8, y + 8.2); }
    ctx.stroke();
  }
  return 30;
}
export const WIN_RADIUS = 10;
/** a window: its shadow, its body, its title bar with this OS's controls and its name. Returns where the title's own
 *  content may begin (after the controls) */
export function drawWindow(ctx: CanvasRenderingContext2D, r: Rect26, w: Window26, api: SeamApi, ground?: string): number {
  if (r.w <= 0 || r.h <= 0) return r.x;
  if (PAINTERS[api.desk.skin]?.window?.(ctx, r, w, api)) return r.x + 12;
  const L = look26(api.desk.skin);
  // ⚑ S418 — the skin's chrome: L's own window glows in its mint and its title band has a sheen; Second Thoughts' yellow
  //   takes every window's title band and edge; Shepherd's are black and gold
  if (w.ai && L.aiGlow) glow(ctx, r, WIN_RADIUS, L.aiGlow, 0.1, 7);
  softShadow(ctx, r, WIN_RADIUS, L.shadowA, L.shadow);
  edgeRR(ctx, r.x, r.y, r.w, r.h, WIN_RADIUS, L.winEdge, ground ?? L.win);
  // the title bar: the top of the window, a hair darker (or the brand's), a rule under it
  ctx.save(); rr(ctx, r.x + 1, r.y + 1, r.w - 2, r.h - 2, WIN_RADIUS - 1); ctx.clip();
  if (w.ai && L.aiSheen) {
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + TITLE_H);
    g.addColorStop(0, L.aiSheen); g.addColorStop(1, L.winTitle);
    ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, TITLE_H);
    px(ctx, r.x, r.y + 1, r.w, 1, alpha(OS26.win, 0.9));
  } else px(ctx, r.x, r.y, r.w, TITLE_H, L.winTitle);
  px(ctx, r.x, r.y + TITLE_H - 1, r.w, 1, L.winRule);
  ctx.restore();
  if (L.winEdgeW > 1) { rr(ctx, r.x + 0.75, r.y + 0.75, r.w - 1.5, r.h - 1.5, WIN_RADIUS - 0.75); ctx.strokeStyle = L.winEdge; ctx.lineWidth = L.winEdgeW; ctx.stroke(); }
  const cw = windowControls(ctx, r.x + 9, r.y + 6, L.winControl);
  let x = r.x + 9 + cw + 4;
  if (w.title) { setFont(ctx, 12); ctx.fillStyle = L.winInk; ctx.fillText(fit26(ctx, w.title, r.w - (x - r.x) - 10), x, r.y + 5); x += Math.ceil(ctx.measureText(w.title).width) + 10; }
  return x;
}

// ── A NOTIFICATION ──────────────────────────────────────────────────────────
/** the one notification, in the title band of her world's window (top right), never over the words under it */
export function drawNote(ctx: CanvasRenderingContext2D, band: Rect26, desk: Desk26): void {
  const n = desk.note; if (!n || band.w < 120) return;
  setFont(ctx, 11);
  const head = `${n.title} · ${NOW_WORD}`;
  const hw = Math.ceil(ctx.measureText(head).width);
  // the window's own title keeps its place at the band's left; the notification takes the rest, up to 380 px
  const maxW = Math.max(200, Math.min(band.w - 150, 380));
  const star = n.text.endsWith(' ✦'), body = star ? n.text.slice(0, -2) : n.text;
  const text = fit26(ctx, body, maxW - 30 - hw - 18 - (star ? 16 : 0));
  const w = Math.min(maxW, 30 + hw + 10 + Math.ceil(ctx.measureText(text).width) + (star ? 16 : 0) + 12), h = TITLE_H - 2;
  const k = reducedMotion() ? 1 : Math.min(1, (n.step + 1) / (SLIDE_STEPS + 1));
  const x = Math.round(band.x + band.w - 6 - w + (1 - k) * (w * 0.6)), y = band.y + 1;
  ctx.save(); ctx.beginPath(); ctx.rect(band.x, band.y - 2, band.w, band.h + 8); ctx.clip();
  const st = n.tone === 'st';
  if (st) glow(ctx, { x, y, w, h }, 9, PLACE.sunHi, 0.22, 5);
  else if (n.app === 'l') glow(ctx, { x, y, w, h }, 9, ERA4.l, 0.12, 4);
  softShadow(ctx, { x, y, w, h }, 9, 0.9);
  edgeRR(ctx, x, y, w, h, 9, st ? OS26.stInk : OS26.noteEdge, st ? PLACE.sunHi : OS26.note);
  if (st) hazard(ctx, x + 1, y + 1, 22, h - 2, OS26.stInk, 0.9, 4);
  else appTile(ctx, n.app, x + 5, y + 3, h - 6);
  setFont(ctx, 11); ctx.fillStyle = st ? OS26.stInk : OS26.winInk2; ctx.fillText(head, x + 30, y + 4);
  ctx.fillStyle = st ? OS26.stInk : OS26.winInk; ctx.fillText(text, x + 30 + hw + 10, y + 4);
  if (star) sparkle(ctx, x + 30 + hw + 10 + Math.ceil(ctx.measureText(text).width) + 4, y + 5, 11, WEB.accent);
  ctx.restore();
}
/** ✦ drawn, never left to a font (the piece's rule for its marks) */
export function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, d: number, ink: string): void {
  const cx = x + d / 2, cy = y + d / 2, r = d / 2, k = r * 0.28;
  ctx.fillStyle = ink; ctx.beginPath();
  ctx.moveTo(cx, cy - r); ctx.lineTo(cx + k, cy - k); ctx.lineTo(cx + r, cy); ctx.lineTo(cx + k, cy + k);
  ctx.lineTo(cx, cy + r); ctx.lineTo(cx - k, cy + k); ctx.lineTo(cx - r, cy); ctx.lineTo(cx - k, cy - k); ctx.closePath(); ctx.fill();
}
/** a soft accent dot in L's mint, for the chat list's live row */
export function liveDot(ctx: CanvasRenderingContext2D, x: number, y: number): void { fillRR(ctx, x, y, 6, 6, 3, WEB.accent); }
