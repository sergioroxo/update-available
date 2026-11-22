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
import { OS26, ERA4, WEB } from '../theme/era4';
import { reducedMotion } from '../../state/motion';

export type Skin26 = 'l' | 'secondThoughts' | 'shepherd' | 'plain';
export type App26 = 'l' | 'kettle' | 'lark' | 'search' | 'photos' | 'settings';
export const APPS26: App26[] = ['l', 'kettle', 'lark', 'search', 'photos', 'settings'];
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
export function softShadow(ctx: CanvasRenderingContext2D, r: Rect26, radius: number, strength = 1): void {
  ctx.save();
  ctx.beginPath(); ctx.rect(r.x - 12, r.y - 12, r.w + 24, r.h + 24); rrPath(ctx, r.x, r.y, r.w, r.h, radius); ctx.clip('evenodd');
  const layers: [number, number, number][] = [[4, 3, 0.05], [2, 2, 0.06], [1, 1, 0.07]];
  for (const [grow, dy, a] of layers) fillRR(ctx, r.x - grow, r.y - grow + dy, r.w + 2 * grow, r.h + 2 * grow, radius + grow, alpha(OS26.shadow, a * strength));
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
  dock: OS26.dock, dockAlpha: 0.62, dockEdge: OS26.dockEdge
};
const PLAIN_LOOK: Look26 = {
  ...L_LOOK,
  ground: OS26.plainGround,
  shapes: [
    { x: 600, y: 40, r: 250, c: OS26.plainSky, a: 0.9 },
    { x: 130, y: 120, r: 230, c: OS26.plainLilac, a: 0.85 },
    { x: 40, y: 400, r: 240, c: OS26.plainPeach, a: 0.85 }
  ]
};
/** ⚑ Part B (S418) — the brands' colour roles go here (Second Thoughts' yellow is `PLACE.sunHi`); until then, L's */
export const LOOKS: Record<Skin26, Look26> = { l: L_LOOK, secondThoughts: L_LOOK, shepherd: L_LOOK, plain: PLAIN_LOOK };

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
export interface Note26 { app: App26; title: string; text: string; seconds: number }
export interface MenuBar26 { app: string; menus: string[]; status: string; date: string; menuOpen: boolean; memory?: { label: string; n: string } | null }
export interface DockApp { app: App26; label: string; open: boolean; reachable: boolean }
export interface Window26 { title: string; ai?: boolean; active?: boolean }

export class Desk26 {
  /** ⚑ which skin is on: the one place that says it (the acts set it; every seam reads it) */
  skin: Skin26 = 'l';
  /** the dock's one-line reason, over the icon that was pressed, for a few seconds */
  tip: { app: App26; text: string; t: number } | null = null;
  /** notifications: the one showing, and those waiting (one at a time) */
  note: (Note26 & { t: number; step: number }) | null = null;
  private queue: (Note26 & { waited: number })[] = [];
  /** something else has the floor (a person's words, the guide's balloon, the film): notifications wait */
  hush = false;
  version = 0;
  setSkin(s: Skin26): void { if (this.skin !== s) { this.skin = s; this.version++; } }
  notify(n: Note26): void { this.queue.push({ ...n, waited: 0 }); }
  /** a notification (or the dock's reason) is up: the guide waits for it (one voice at a time) */
  get speaking(): boolean { return !!this.note; }
  /** the clock: notifications slide in on the animation steps, hold, and go; the reason line goes after its time */
  update(dt: number, animHz: number): void {
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
  showTip(app: App26, text: string): void { this.tip = { app, text, t: 3.2 }; this.version++; }
  clear(): void { this.note = null; this.queue = []; this.tip = null; this.version++; }
}
const SLIDE_STEPS = 4;

// ── THE WALLPAPER ───────────────────────────────────────────────────────────
const wallCache = new Map<string, HTMLCanvasElement>();
function paintWall(ctx: CanvasRenderingContext2D, W: number, H: number, L: Look26): void {
  ctx.fillStyle = L.ground; ctx.fillRect(0, 0, W, H);
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
/** the menu bar: returns the Menu button's rect (its press is the piece's `start-menu`) */
export function drawMenuBar(ctx: CanvasRenderingContext2D, bar: MenuBar26, api: SeamApi): Rect26 {
  const { W, desk } = api;
  const L = look26(desk.skin);
  setFont(ctx, 11);
  const mlabel = 'Menu', mw = Math.ceil(ctx.measureText(mlabel).width) + 30;
  const button = { x: 5, y: 3, w: mw, h: MENU_H - 6 };
  if (!PAINTERS[desk.skin]?.menuBar?.(ctx, bar, api)) {
    ctx.fillStyle = alpha(L.bar, L.barAlpha); ctx.fillRect(0, 0, W, MENU_H);
    px(ctx, 0, MENU_H - 1, W, 1, alpha(L.barEdge, 0.9));
    // the Menu button: dark, rounded, the mark and its word (pressed in: inverted)
    if (bar.menuOpen) edgeRR(ctx, button.x, button.y, button.w, button.h, 8, L.menuButton, L.bar);
    else fillRR(ctx, button.x, button.y, button.w, button.h, 8, L.menuButton);
    const ink = bar.menuOpen ? L.menuButton : L.menuButtonInk;
    osMark(ctx, button.x + 7, button.y + 3, 10, ink);
    setFont(ctx, 11); ctx.fillStyle = ink; ctx.fillText(mlabel, button.x + 21, button.y + 2);
    // the app in front, and three of its menus (decorative)
    let x = button.x + button.w + 12;
    setFont(ctx, 12); ctx.fillStyle = L.barInk; ctx.fillText(bar.app, x, 4); x += Math.ceil(ctx.measureText(bar.app).width) + 14;
    setFont(ctx, 11);
    for (const m of bar.menus) { ctx.fillStyle = L.barInk; ctx.fillText(m, x, 5); x += Math.ceil(ctx.measureText(m).width) + 13; }
    // the right: the clock, the battery, the wifi (and Memory, Second Thoughts', from beat 6: E4Browser draws it here)
    setFont(ctx, 11);
    const dw = Math.ceil(ctx.measureText(bar.date).width);
    let rx = W - 10 - dw;
    ctx.fillStyle = L.barInk; ctx.fillText(bar.date, rx, 5);
    const sw = Math.ceil(ctx.measureText(bar.status).width);
    rx -= 12 + sw; ctx.fillStyle = L.barInk; ctx.fillText(bar.status, rx, 5);
    rx -= 26; batteryIcon(ctx, rx, 6, L.barInk, 0.82);
    rx -= 22; wifiIcon(ctx, rx, 3, L.barInk);
  }
  api.push({ x: 0, y: 0, w: button.x + button.w + 4, h: MENU_H, id: 'start-menu' });
  return button;
}
/** where the menu bar's status area begins (the Memory item sits left of it) */
export function statusLeft(ctx: CanvasRenderingContext2D, W: number, bar: MenuBar26): number {
  setFont(ctx, 11);
  return W - 10 - Math.ceil(ctx.measureText(bar.date).width) - 12 - Math.ceil(ctx.measureText(bar.status).width) - 26 - 22 - 10;
}

// ── THE DOCK ────────────────────────────────────────────────────────────────
/** an app's tile: its colour and its glyph (invented, plain shapes) */
export function appTile(ctx: CanvasRenderingContext2D, app: App26, x: number, y: number, d: number, dim = false): void {
  const fill = app === 'l' ? ERA4.lDim : app === 'kettle' ? OS26.appKettle : app === 'lark' ? OS26.appLark
    : app === 'search' ? OS26.appSearch : app === 'photos' ? OS26.appPhotos : OS26.appSettings;
  ctx.save();
  if (dim) ctx.globalAlpha = 0.38;
  fillRR(ctx, x, y, d, d, Math.round(d * 0.26), fill);
  const ink = OS26.appInk, cx = x + d / 2, cy = y + d / 2, k = d / 20;
  ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.lineWidth = 1.6 * k;
  if (app === 'l') {
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
    softShadow(ctx, r, 11, 0.7);
    fillRR(ctx, r.x, r.y, r.w, r.h, 11, alpha(L.dock, L.dockAlpha));
    rr(ctx, r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, 10.5); ctx.strokeStyle = alpha(L.dockEdge, 0.9); ctx.lineWidth = 1; ctx.stroke();
    apps.forEach((a, i) => {
      const x = r.x + 8 + i * (DOCK_ICON + 8), y = r.y + 3;
      appTile(ctx, a.app, x, y, DOCK_ICON, !a.reachable && !a.open);
      if (a.open) fillRR(ctx, x + DOCK_ICON / 2 - 1.5, r.y + r.h - 4, 3, 3, 1.5, OS26.dockDot);
    });
  }
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
function windowControls(ctx: CanvasRenderingContext2D, x: number, y: number): number {
  for (let i = 0; i < 2; i++) {
    const bx = x + i * 15;
    fillRR(ctx, bx, y, 12, 12, 3.5, alpha(OS26.winControl, 0.18));
    ctx.strokeStyle = OS26.winControl; ctx.lineWidth = 1.3; ctx.beginPath();
    if (i === 0) { ctx.moveTo(bx + 3.5, y + 6); ctx.lineTo(bx + 8.5, y + 6); }
    else { ctx.moveTo(bx + 3.8, y + 3.8); ctx.lineTo(bx + 8.2, y + 8.2); ctx.moveTo(bx + 8.2, y + 3.8); ctx.lineTo(bx + 3.8, y + 8.2); }
    ctx.stroke();
  }
  return 30;
}
export const WIN_RADIUS = 10;
/** a window: its shadow, its body, its title bar with this OS's controls and its name. Returns where the title's own
 *  content may begin (after the controls) */
export function drawWindow(ctx: CanvasRenderingContext2D, r: Rect26, w: Window26, api: SeamApi, ground: string = OS26.win): number {
  if (r.w <= 0 || r.h <= 0) return r.x;
  if (PAINTERS[api.desk.skin]?.window?.(ctx, r, w, api)) return r.x + 12;
  softShadow(ctx, r, WIN_RADIUS);
  edgeRR(ctx, r.x, r.y, r.w, r.h, WIN_RADIUS, OS26.winEdge, ground);
  // the title bar: the top of the window, a hair darker, a rule under it
  ctx.save(); rr(ctx, r.x + 1, r.y + 1, r.w - 2, r.h - 2, WIN_RADIUS - 1); ctx.clip();
  px(ctx, r.x, r.y, r.w, TITLE_H, OS26.winTitle);
  px(ctx, r.x, r.y + TITLE_H - 1, r.w, 1, OS26.winRule);
  ctx.restore();
  const cw = windowControls(ctx, r.x + 9, r.y + 6);
  let x = r.x + 9 + cw + 4;
  if (w.title) { setFont(ctx, 12); ctx.fillStyle = OS26.winInk; ctx.fillText(fit26(ctx, w.title, r.w - (x - r.x) - 10), x, r.y + 5); x += Math.ceil(ctx.measureText(w.title).width) + 10; }
  return x;
}

// ── A NOTIFICATION ──────────────────────────────────────────────────────────
/** the one notification, in the title band of her world's window (top right), never over the words under it */
export function drawNote(ctx: CanvasRenderingContext2D, band: Rect26, desk: Desk26): void {
  const n = desk.note; if (!n || band.w < 120) return;
  setFont(ctx, 11);
  const head = `${n.title} · now`;
  const hw = Math.ceil(ctx.measureText(head).width);
  // the window's own title keeps its place at the band's left; the notification takes the rest, up to 380 px
  const maxW = Math.max(200, Math.min(band.w - 150, 380));
  const star = n.text.endsWith(' ✦'), body = star ? n.text.slice(0, -2) : n.text;
  const text = fit26(ctx, body, maxW - 30 - hw - 18 - (star ? 16 : 0));
  const w = Math.min(maxW, 30 + hw + 10 + Math.ceil(ctx.measureText(text).width) + (star ? 16 : 0) + 12), h = TITLE_H - 2;
  const k = reducedMotion() ? 1 : Math.min(1, (n.step + 1) / (SLIDE_STEPS + 1));
  const x = Math.round(band.x + band.w - 6 - w + (1 - k) * (w * 0.6)), y = band.y + 1;
  ctx.save(); ctx.beginPath(); ctx.rect(band.x, band.y - 2, band.w, band.h + 8); ctx.clip();
  softShadow(ctx, { x, y, w, h }, 9, 0.9);
  edgeRR(ctx, x, y, w, h, 9, OS26.noteEdge, OS26.note);
  appTile(ctx, n.app, x + 5, y + 3, h - 6);
  setFont(ctx, 11); ctx.fillStyle = OS26.winInk2; ctx.fillText(head, x + 30, y + 4);
  ctx.fillStyle = OS26.winInk; ctx.fillText(text, x + 30 + hw + 10, y + 4);
  if (star) sparkle(ctx, x + 30 + hw + 10 + Math.ceil(ctx.measureText(text).width) + 4, y + 5, 11, WEB.accent);
  ctx.restore();
}
/** ✦ drawn, never left to a font (the piece's rule for its marks) */
function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, d: number, ink: string): void {
  const cx = x + d / 2, cy = y + d / 2, r = d / 2, k = r * 0.28;
  ctx.fillStyle = ink; ctx.beginPath();
  ctx.moveTo(cx, cy - r); ctx.lineTo(cx + k, cy - k); ctx.lineTo(cx + r, cy); ctx.lineTo(cx + k, cy + k);
  ctx.lineTo(cx, cy + r); ctx.lineTo(cx - k, cy + k); ctx.lineTo(cx - r, cy); ctx.lineTo(cx - k, cy - k); ctx.closePath(); ctx.fill();
}
/** a soft accent dot in L's mint, for the chat list's live row */
export function liveDot(ctx: CanvasRenderingContext2D, x: number, y: number): void { fillRR(ctx, x, y, 6, 6, 3, WEB.accent); }
