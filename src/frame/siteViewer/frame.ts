/**
 * ⚑ S291 — THE SITE VIEWER'S WINDOW AND SITE HEADERS, drawn. The window is the period OS's own (Windows 95 beige and
 * navy for 1997 and for the hub, an XP-blue frame for 2003, Aero glass for 2016, a flat app window for 2026): a title
 * bar with MINIMISE and CLOSE, a toolbar (the four years, "open as a web page"), the site itself, and a status bar.
 * Every button is a big, plain target (≥ 36 logical px, ≈ 3 cm in the headset). All colours are theme tokens (skins.ts).
 */
import { HEAD, type Os, type Skin, type View } from './skins';
import type { Rect } from './layout';
import { ERA1 } from '../../desktop/theme/era1';
import menuStrings from '../../../data/strings/gameMenu.json';

export interface Hit extends Rect { id: string; tip: string }
export interface DrawEnv { ctx: CanvasRenderingContext2D; skin: Skin; W: number; H: number; hits: Hit[]; hover: string }

const D = HEAD.dialog;
/** ⚑ S376 — the close button, the same in every year's skin so it is never hunted for: red, a white ✕, the word */
const CLOSE_RED = ERA1.warn, CLOSE_INK = ERA1.white, CLOSE_EDGE = ERA1.warnDark;
const CLOSE_LABEL = (menuStrings as { sitesCloseLabel?: string }).sitesCloseLabel ?? '';

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  if (r <= 0) { ctx.rect(x, y, w, h); return; }
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y); ctx.arcTo(x + w, y, x + w, y + h, rr); ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr); ctx.arcTo(x, y, x + w, y, rr); ctx.closePath();
}
/** the 1997 bevel: light top-left, dark bottom-right (sunk: the reverse) */
export function bevel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, sunk = false, t = 3): void {
  ctx.fillStyle = sunk ? D.darker : D.light; ctx.fillRect(x, y, w, t); ctx.fillRect(x, y, t, h);
  ctx.fillStyle = sunk ? D.light : D.darker; ctx.fillRect(x, y + h - t, w, t); ctx.fillRect(x + w - t, y, t, h);
}
const text = (ctx: CanvasRenderingContext2D, s: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'left'): void => {
  ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y); ctx.textAlign = 'left';
};
const fit = (ctx: CanvasRenderingContext2D, s: string, font: (px: number) => string, px: number, maxW: number, min = 14): number => {
  let p = px;
  for (; p > min; p--) { ctx.font = font(p); if (ctx.measureText(s).width <= maxW) break; }
  return p;
};
const ellipsis = (ctx: CanvasRenderingContext2D, s: string, maxW: number): string => {
  if (ctx.measureText(s).width <= maxW) return s;
  let t = s;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t}…`;
};

/** a press-target, in the period's own button style */
export function drawButton(e: DrawEnv, r: Rect, label: string, id: string, tip: string, opts: { active?: boolean; font?: string; style?: Os | 'tab'; ink?: string } = {}): void {
  const { ctx, skin } = e;
  const hover = e.hover === id, active = !!opts.active;
  const os = opts.style ?? skin.os;
  const font = opts.font ?? `700 19px ${skin.font}`;
  const c = skin.chrome;
  if (os === 'w95') {
    ctx.fillStyle = active ? D.light : D.panel; ctx.fillRect(r.x, r.y, r.w, r.h);
    bevel(ctx, r.x, r.y, r.w, r.h, active || hover, 3);
    const o = active || hover ? 2 : 0;
    text(ctx, label, r.x + r.w / 2 + o, r.y + r.h / 2 + o, font, opts.ink ?? D.ink, 'center');
  } else if (os === 'xp') {
    roundRect(ctx, r.x, r.y, r.w, r.h, 6);
    ctx.fillStyle = active ? c.sel : hover ? c.frameHi : c.bar; ctx.fill();
    ctx.strokeStyle = c.frameLo; ctx.lineWidth = 2; ctx.stroke();
    text(ctx, label, r.x + r.w / 2, r.y + r.h / 2, font, active ? c.selInk : opts.ink ?? c.barInk, 'center');
  } else if (os === 'aero') {
    roundRect(ctx, r.x, r.y, r.w, r.h, 6);
    ctx.fillStyle = active ? c.sel : hover ? c.frameHi : c.btn; ctx.fill();
    ctx.strokeStyle = c.frame; ctx.lineWidth = 2; ctx.stroke();
    text(ctx, label, r.x + r.w / 2, r.y + r.h / 2, font, active ? c.selInk : opts.ink ?? c.btnInk, 'center');
  } else if (os === 'app') {
    roundRect(ctx, r.x, r.y, r.w, r.h, r.h / 2);
    ctx.fillStyle = active ? c.sel : hover ? c.frameLo : c.btn; ctx.fill();
    ctx.strokeStyle = active ? c.sel : c.frameHi; ctx.lineWidth = 1.5; ctx.stroke();
    text(ctx, label, r.x + r.w / 2, r.y + r.h / 2, font, active ? c.selInk : opts.ink ?? c.btnInk, 'center');
  } else {
    text(ctx, label, r.x + r.w / 2, r.y + r.h / 2, font, opts.ink ?? skin.ink, 'center');
  }
  e.hits.push({ ...r, id, tip });
}

/** the glyphs of the window buttons are strokes, so no font can drop them */
function glyph(ctx: CanvasRenderingContext2D, kind: 'min' | 'close' | 'up' | 'down', cx: number, cy: number, color: string, s = 8): void {
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'butt';
  if (kind === 'min') { ctx.fillRect(cx - s, cy + s - 4, s * 2, 4); return; }
  if (kind === 'close') { ctx.beginPath(); ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx + s, cy + s); ctx.moveTo(cx + s, cy - s); ctx.lineTo(cx - s, cy + s); ctx.stroke(); return; }
  ctx.beginPath();
  if (kind === 'up') { ctx.moveTo(cx - s, cy + s / 2); ctx.lineTo(cx, cy - s / 2); ctx.lineTo(cx + s, cy + s / 2); } else { ctx.moveTo(cx - s, cy - s / 2); ctx.lineTo(cx, cy + s / 2); ctx.lineTo(cx + s, cy - s / 2); }
  ctx.closePath(); ctx.fill();
}

export interface Regions { toolbar: Rect; site: Rect; status: Rect }
export const TITLE_H = 44, BAR_H = 54, STATUS_H = 34;

/** the OS window: border, title bar with minimise and close. Returns the client regions. */
export function drawWindow(e: DrawEnv, title: string, years: { id: string; label: string; active: boolean; tip: string }[], canPage: boolean, pageTip: string): Regions {
  const compact = e.W < 640;
  const { ctx, skin, W, H } = e;
  const c = skin.chrome;
  const B = skin.os === 'w95' ? 6 : skin.os === 'app' ? 3 : 6;
  ctx.clearRect(0, 0, W, H);
  let tt = { x: 0, y: 0, font: '', color: '' };
  // ── frame and title bar ──
  if (skin.os === 'w95') {
    ctx.fillStyle = c.frame; ctx.fillRect(0, 0, W, H); bevel(ctx, 0, 0, W, H, false, 4);
    ctx.fillStyle = c.titleA; ctx.fillRect(B, B, W - B * 2, TITLE_H - 8);
    ctx.fillStyle = c.titleInk; ctx.fillRect(B + 8, B + 8, 18, 18); ctx.fillStyle = c.titleA; ctx.fillRect(B + 11, B + 11, 12, 12);
    tt = { x: B + 38, y: B + (TITLE_H - 8) / 2, font: `700 20px ${skin.font}`, color: c.titleInk };
  } else if (skin.os === 'xp') {
    roundRect(ctx, 0, 0, W, H, 14); ctx.fillStyle = c.frame; ctx.fill();
    const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, c.titleA); g.addColorStop(1, c.titleB);
    ctx.save(); roundRect(ctx, 0, 0, W, TITLE_H + 2, 14); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, TITLE_H + 2); ctx.restore();
    tt = { x: 18, y: TITLE_H / 2 + 1, font: `700 21px ${skin.font}`, color: c.titleInk };
  } else if (skin.os === 'aero') {
    roundRect(ctx, 0, 0, W, H, 12); ctx.fillStyle = c.frame; ctx.fill();
    const g = ctx.createLinearGradient(0, 0, 0, TITLE_H); g.addColorStop(0, c.titleA); g.addColorStop(1, c.titleB);
    ctx.save(); roundRect(ctx, 0, 0, W, TITLE_H + 2, 12); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, TITLE_H + 2); ctx.restore();
    ctx.strokeStyle = c.frameLo; ctx.lineWidth = 2; roundRect(ctx, 1, 1, W - 2, H - 2, 12); ctx.stroke();
    tt = { x: 18, y: TITLE_H / 2, font: `600 20px ${skin.font}`, color: c.titleInk };
  } else {
    roundRect(ctx, 0, 0, W, H, 18); ctx.fillStyle = c.bar; ctx.fill();
    ctx.strokeStyle = c.frameHi; ctx.lineWidth = 2; roundRect(ctx, 1, 1, W - 2, H - 2, 18); ctx.stroke();
    ctx.fillStyle = c.titleB; ctx.save(); roundRect(ctx, 0, 0, W, TITLE_H, 18); ctx.clip(); ctx.fillRect(0, 0, W, TITLE_H); ctx.restore();
    ctx.fillStyle = skin.rule; ctx.fillRect(0, TITLE_H, W, 2);
    ctx.fillStyle = skin.link; ctx.beginPath(); ctx.arc(26, TITLE_H / 2, 7, 0, Math.PI * 2); ctx.fill();
    tt = { x: 44, y: TITLE_H / 2, font: `600 20px ${skin.font}`, color: c.titleInk };
  }
  // ── minimise and close ──
  // ⚑ S376 (UiB job 19 B; his ruling on Part A, 12 Nov: the website a Close panel opens "well visible and easy to
  //   close") — the close is an obvious button now: wider, red in every year's skin, a big ✕ and the word Close
  //   (gameMenu.json `sitesCloseLabel`); Esc closes it on a computer, B / Y or a press outside it in the headset
  const bw = 46, bh = skin.os === 'w95' ? 32 : 34, by = skin.os === 'w95' ? B + 1 : (TITLE_H - bh) / 2, rx = W - B - 6;
  const cw = compact ? 64 : 124;
  const closeR = { x: rx - cw, y: by, w: cw, h: bh }, minR = { x: rx - cw - bw - 8, y: by, w: bw, h: bh };
  // the title is cut to the room before the buttons, never under them
  ctx.font = tt.font;
  text(ctx, ellipsis(ctx, title, minR.x - tt.x - 12), tt.x, tt.y, tt.font, tt.color);
  const wbtn = (r: Rect, kind: 'min' | 'close', id: string, tip: string): void => {
    const hover = e.hover === id;
    const isClose = kind === 'close';
    if (isClose) {
      roundRect(ctx, r.x, r.y, r.w, r.h, skin.os === 'w95' ? 2 : 6); ctx.fillStyle = CLOSE_RED; ctx.fill();
      ctx.strokeStyle = hover ? CLOSE_INK : CLOSE_EDGE; ctx.lineWidth = hover ? 4 : 2; ctx.stroke();
      const lab = compact ? '' : CLOSE_LABEL;
      ctx.font = `700 19px ${skin.font}`;
      const lw = lab ? ctx.measureText(lab).width + 10 : 0;
      const gx = r.x + (r.w - lw - 20) / 2 + 10;
      glyph(ctx, 'close', gx, r.y + r.h / 2, CLOSE_INK, 9);
      if (lab) text(ctx, lab, gx + 20, r.y + r.h / 2 + 1, `700 19px ${skin.font}`, CLOSE_INK);
      e.hits.push({ ...r, id, tip });
      return;
    }
    if (skin.os === 'w95') {
      ctx.fillStyle = D.panel; ctx.fillRect(r.x, r.y, r.w, r.h); bevel(ctx, r.x, r.y, r.w, r.h, hover, 3);
      glyph(ctx, kind, r.x + r.w / 2 + (hover ? 2 : 0), r.y + r.h / 2 + (hover ? 2 : 0), D.ink);
    } else if (skin.os === 'xp') {
      roundRect(ctx, r.x, r.y, r.w, r.h, 6); ctx.fillStyle = isClose ? c.close : c.btn; ctx.fill();
      ctx.strokeStyle = c.titleInk; ctx.lineWidth = hover ? 4 : 2; ctx.stroke();
      glyph(ctx, kind, r.x + r.w / 2, r.y + r.h / 2, c.titleInk);
    } else if (skin.os === 'aero') {
      roundRect(ctx, r.x, r.y, r.w, r.h, 6); ctx.fillStyle = isClose ? c.close : hover ? c.frameHi : c.btn; ctx.fill();
      ctx.strokeStyle = c.frameLo; ctx.lineWidth = hover ? 3 : 2; ctx.stroke();
      glyph(ctx, kind, r.x + r.w / 2, r.y + r.h / 2, isClose ? c.closeInk : c.btnInk);
    } else {
      roundRect(ctx, r.x, r.y, r.w, r.h, r.h / 2); ctx.fillStyle = hover ? c.sel : c.btn; ctx.fill();
      ctx.strokeStyle = c.frameHi; ctx.lineWidth = 1.5; ctx.stroke();
      glyph(ctx, kind, r.x + r.w / 2, r.y + r.h / 2, hover ? c.selInk : c.btnInk);
    }
    e.hits.push({ ...r, id, tip });
  };
  wbtn(minR, 'min', 'min', 'Minimise to a small tab');
  wbtn(closeR, 'close', 'close', 'Close');
  // ── the toolbar: back to the four years, the years, "open as a web page" ──
  const top = TITLE_H + (skin.os === 'w95' ? 0 : 2) + (skin.os === 'xp' ? 0 : 0);
  const inset = skin.os === 'w95' || skin.os === 'xp' || skin.os === 'aero' ? B : 3;
  // ⚑ S383 — on a landscape phone (W = 640, not 'compact') the year tabs and even the short "Web page ↗" cannot share a row:
  //   the button lay over the 2026 tab. When they do not fit, the page button takes a second row, as it does on a portrait phone.
  let twoRow = compact && canPage;
  if (canPage && !compact) {
    ctx.font = `700 18px ${skin.font}`;
    let xe = inset + 10;
    for (const yb of years) { ctx.font = `700 18px ${skin.font}`; xe += Math.max(yb.id === 'view:hub' ? 0 : 74, Math.ceil(ctx.measureText(yb.label).width) + 28) + 8; }
    ctx.font = `700 18px ${skin.font}`;
    if (xe + Math.ceil(ctx.measureText('Web page ↗').width) + 28 + 10 > W - inset) twoRow = true;
  }
  const barH = twoRow ? BAR_H * 2 - 6 : BAR_H;
  const bar: Rect = { x: inset, y: top, w: W - inset * 2, h: barH };
  ctx.fillStyle = c.bar; ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
  ctx.fillStyle = skin.os === 'w95' ? D.dark : skin.rule; ctx.fillRect(bar.x, bar.y + bar.h - 2, bar.w, 2);
  let x = bar.x + 10;
  const bh2 = 38, by2 = bar.y + (BAR_H - bh2) / 2 - 1;
  for (const yb of years) {
    const f = `700 ${compact ? 17 : 18}px ${skin.font}`;
    ctx.font = f;
    const label = compact && yb.id === 'view:hub' ? 'All' : yb.label;
    const w = Math.max(compact ? 58 : yb.id === 'view:hub' ? 0 : 74, Math.ceil(ctx.measureText(label).width) + (compact ? 20 : 28));
    drawButton(e, { x, y: by2, w, h: bh2 }, label, yb.id, yb.tip, { active: yb.active, font: f, style: skin.os });
    x += w + (compact ? 6 : 8);
  }
  if (canPage) {
    const f = `700 18px ${skin.font}`;
    ctx.font = f;
    const label = 'Open as a web page ↗';
    const w = Math.ceil(ctx.measureText(label).width) + 28;
    if (twoRow) drawButton(e, { x: bar.x + 10, y: by2 + BAR_H - 6, w: Math.min(w, bar.w - 20), h: bh2 }, label, 'openpage', pageTip, { font: f, style: skin.os });
    else if (x + w < bar.x + bar.w) drawButton(e, { x: bar.x + bar.w - w - 10, y: by2, w, h: bh2 }, label, 'openpage', pageTip, { font: f, style: skin.os });
    else {
      const short = 'Web page ↗';
      const w2 = Math.ceil(ctx.measureText(short).width) + 28;
      drawButton(e, { x: bar.x + bar.w - w2 - 10, y: by2, w: w2, h: bh2 }, short, 'openpage', pageTip, { font: f, style: skin.os });
    }
  }
  const statusY = H - STATUS_H - inset;
  const status: Rect = { x: inset, y: statusY, w: W - inset * 2, h: STATUS_H };
  const site: Rect = { x: inset, y: bar.y + bar.h, w: W - inset * 2, h: statusY - (bar.y + bar.h) };
  return { toolbar: bar, site, status };
}

export function drawStatus(e: DrawEnv, r: Rect, left: string, right: string): void {
  const { ctx, skin } = e;
  ctx.fillStyle = skin.chrome.bar; ctx.fillRect(r.x, r.y, r.w, r.h);
  if (skin.os === 'w95') { ctx.fillStyle = D.dark; ctx.fillRect(r.x, r.y, r.w, 2); }
  else { ctx.fillStyle = skin.rule; ctx.fillRect(r.x, r.y, r.w, 2); }
  const font = `17px ${skin.font}`;
  ctx.font = font;
  const rw = ctx.measureText(right).width;
  text(ctx, ellipsis(ctx, left, r.w - rw - 40), r.x + 14, r.y + r.h / 2 + 1, font, skin.chrome.barInk);
  text(ctx, right, r.x + r.w - 14, r.y + r.h / 2 + 1, font, skin.chrome.barInk, 'right');
}

// ── the site headers ───────────────────────────────────────────────────────────────────────────────────────────
export interface TabDef { id: string; label: string; active: boolean }
export interface HeaderInput {
  heading: string; tagline: string; siteName: string; projectLine: string; tabs: TabDef[]; glance: [string, string][];
}

/** wrapped horizontal tabs; returns the rows' total height */
function tabStrip(e: DrawEnv, x: number, y: number, w: number, tabs: TabDef[], style: 'xp' | 'aero' | 'app' | 'w95', h = 44): number {
  const { ctx, skin } = e;
  const font = `700 19px ${skin.font}`;
  ctx.font = font;
  let cx = x, cy = y, rows = 1;
  for (const t of tabs) {
    const tw = Math.ceil(ctx.measureText(t.label).width) + 30;
    if (cx + tw > x + w && cx > x) { cx = x; cy += h + 6; rows++; }
    const r = { x: cx, y: cy, w: tw, h };
    const hv = e.hover === `tab:${t.id}`;
    if (style === 'xp') {
      roundRect(ctx, r.x, r.y, r.w, r.h + 2, 9);
      ctx.fillStyle = t.active ? HEAD.y2003.white : hv ? HEAD.y2003.panelHead : HEAD.y2003.tab; ctx.fill();
      ctx.strokeStyle = HEAD.y2003.panelHead; ctx.lineWidth = 2; ctx.stroke();
      if (t.active) { ctx.fillStyle = HEAD.y2003.brand; ctx.fillRect(r.x + 4, r.y, r.w - 8, 4); }
      text(ctx, t.label, r.x + r.w / 2, r.y + r.h / 2 + 2, font, hv && !t.active ? HEAD.y2003.bannerInk : HEAD.y2003.ink, 'center');
    } else if (style === 'aero') {
      ctx.fillStyle = t.active ? HEAD.y2016.barLo : hv ? HEAD.y2016.barLo : HEAD.y2016.bar; ctx.fillRect(r.x, r.y, r.w, r.h);
      if (t.active) { ctx.fillStyle = HEAD.y2016.accentHi; ctx.fillRect(r.x, r.y + r.h - 5, r.w, 5); }
      text(ctx, t.label, r.x + r.w / 2, r.y + r.h / 2 - 1, font, HEAD.y2016.white, 'center');
    } else if (style === 'app') {
      roundRect(ctx, r.x, r.y + 2, r.w, r.h - 4, (r.h - 4) / 2);
      ctx.fillStyle = t.active ? HEAD.y2026.l : hv ? HEAD.y2026.panelHi : HEAD.y2026.panel; ctx.fill();
      ctx.strokeStyle = t.active ? HEAD.y2026.l : HEAD.y2026.edge; ctx.lineWidth = 1.5; ctx.stroke();
      text(ctx, t.label, r.x + r.w / 2, r.y + r.h / 2, font, t.active ? HEAD.y2026.field : HEAD.y2026.text, 'center');
    } else {
      drawButton(e, r, t.label, `tab:${t.id}`, t.label, { active: t.active, font, style: 'w95' });
      cx += tw + 6; continue;
    }
    e.hits.push({ ...r, id: `tab:${t.id}`, tip: t.label });
    cx += tw + (style === 'aero' ? 2 : 6);
  }
  return rows * (h + 6) - 6;
}

let tilePat: CanvasPattern | null = null;
const tile = (ctx: CanvasRenderingContext2D): CanvasPattern | null => {
  if (tilePat) return tilePat;
  const c = document.createElement('canvas'); c.width = 14; c.height = 14;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = HEAD.y1997.tile; g.beginPath(); g.arc(7, 7, 2.6, 0, Math.PI * 2); g.fill();
  tilePat = ctx.createPattern(c, 'repeat');
  return tilePat;
};

/** draws a year's site header into `r` and returns the client viewport the document scrolls in */
export function drawSiteHeader(e: DrawEnv, r: Rect, view: View, h: HeaderInput): Rect {
  const { ctx, skin } = e;
  ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
  const wide = r.w >= 860;
  let view0: Rect = { ...r };
  if (view === 'hub') {
    ctx.fillStyle = skin.pageBg; ctx.fillRect(r.x, r.y, r.w, r.h);
    view0 = { ...r };
  } else if (view === '1997') {
    const Y = HEAD.y1997;
    ctx.fillStyle = skin.pageBg; ctx.fillRect(r.x, r.y, r.w, r.h);
    const p = tile(ctx); if (p) { ctx.fillStyle = p; ctx.fillRect(r.x, r.y, r.w, r.h); }
    // the construction stripe
    ctx.fillStyle = Y.stripe; ctx.fillRect(r.x, r.y, r.w, 24);
    ctx.fillStyle = Y.stripeInk;
    for (let sx = r.x - 24; sx < r.x + r.w; sx += 40) { ctx.beginPath(); ctx.moveTo(sx, r.y + 24); ctx.lineTo(sx + 12, r.y); ctx.lineTo(sx + 24, r.y); ctx.lineTo(sx + 12, r.y + 24); ctx.closePath(); ctx.fill(); }
    ctx.font = `700 15px ${skin.font}`; const lab = 'UNDER CONSTRUCTION';
    const lw = ctx.measureText(lab).width + 28; ctx.fillStyle = Y.stripe; ctx.fillRect(r.x + (r.w - lw) / 2, r.y + 2, lw, 20);
    text(ctx, lab, r.x + r.w / 2, r.y + 12, `700 15px ${skin.font}`, Y.stripeInk, 'center');
    // the masthead: a ridge box
    const mh = 78, mx = r.x + 8, my = r.y + 30, mw = r.w - 16;
    ctx.fillStyle = Y.white; ctx.fillRect(mx, my, mw, mh);
    ctx.strokeStyle = skin.h; ctx.lineWidth = 4; ctx.strokeRect(mx + 2, my + 2, mw - 4, mh - 4);
    const hf = (px: number): string => `700 ${px}px ${skin.headFont}`;
    const hp = fit(ctx, h.heading, hf, 34, mw - 40, 20);
    text(ctx, h.heading, mx + mw / 2 + 2, my + 28 + 2, hf(hp), Y.shade, 'center');
    text(ctx, h.heading, mx + mw / 2, my + 28, hf(hp), skin.h, 'center');
    const tp = fit(ctx, h.tagline, (px) => `${px}px ${skin.font}`, 17, mw - 40, 9);
    text(ctx, h.tagline, mx + mw / 2, my + 60, `${tp}px ${skin.font}`, skin.dim, 'center');
    let y1 = my + mh + 8;
    if (wide) {
      const nw = 236, nx = r.x + 8, nh = r.y + r.h - y1 - 8;
      ctx.fillStyle = Y.tile; ctx.fillRect(nx, y1, nw, nh); bevel(ctx, nx, y1, nw, nh, false, 3);
      text(ctx, 'Contents', nx + 14, y1 + 22, `700 19px ${skin.font}`, skin.ink);
      let ty = y1 + 40;
      for (const t of h.tabs) {
        drawButton(e, { x: nx + 10, y: ty, w: nw - 20, h: 38 }, t.label, `tab:${t.id}`, t.label, { active: t.active, font: `700 17px ${skin.font}`, style: 'w95', ink: t.active ? Y.white : skin.link });
        if (t.active) { /* the pressed tab reads as a heading-coloured, sunken button */
          ctx.fillStyle = skin.h; ctx.fillRect(nx + 13, ty + 3, nw - 26, 32); text(ctx, t.label, nx + nw / 2 + 2, ty + 21, `700 17px ${skin.font}`, Y.white, 'center');
        }
        ty += 42;
      }
      // the glance, and the counter that says it does not count
      if (ty + 150 < y1 + nh) {
        ty += 8; ctx.font = `15px ${skin.font}`;
        for (const [a, b] of h.glance) { text(ctx, `${a}: ${b}`, nx + 12, ty + 8, `15px ${skin.font}`, skin.ink); ty += 22; }
        ty += 6; ctx.fillStyle = Y.black; ctx.fillRect(nx + 12, ty, nw - 24, 28);
        text(ctx, '000000', nx + nw / 2, ty + 15, `700 18px ${skin.mono}`, Y.white, 'center');
      }
      const mx2 = nx + nw + 8;
      view0 = { x: mx2, y: y1, w: r.x + r.w - 8 - mx2, h: nh };
    } else {
      const rows = tabStrip(e, r.x + 8, y1, r.w - 16, h.tabs, 'w95', 40);
      y1 += rows + 8;
      view0 = { x: r.x + 8, y: y1, w: r.w - 16, h: r.y + r.h - y1 - 8 };
    }
    ctx.fillStyle = Y.white; ctx.fillRect(view0.x, view0.y, view0.w, view0.h);
    ctx.strokeStyle = skin.h; ctx.lineWidth = 4; ctx.strokeRect(view0.x + 2, view0.y + 2, view0.w - 4, view0.h - 4);
    view0 = { x: view0.x + 4, y: view0.y + 4, w: view0.w - 8, h: view0.h - 8 };
  } else if (view === '2003') {
    const Y = HEAD.y2003;
    ctx.fillStyle = skin.pageBg; ctx.fillRect(r.x, r.y, r.w, r.h);
    const bh = 62;
    ctx.fillStyle = Y.banner; ctx.fillRect(r.x, r.y, r.w, bh); ctx.fillStyle = Y.brand; ctx.fillRect(r.x, r.y + bh - 4, r.w, 4);
    const t1 = `${h.siteName} · portal`;
    const p1 = fit(ctx, t1, (px) => `700 ${px}px ${skin.font}`, 24, r.w - 36, 13);
    ctx.font = `700 ${p1}px ${skin.font}`; const w1 = ctx.measureText(t1).width;
    text(ctx, t1, r.x + 18, r.y + 22, `700 ${p1}px ${skin.font}`, Y.bannerInk);
    const hp = fit(ctx, h.heading, (px) => `${px}px ${skin.font}`, 17, r.w - w1 - 60, 12);
    text(ctx, h.heading, r.x + 18, r.y + 46, `${hp}px ${skin.font}`, Y.bannerDim);
    let y1 = r.y + bh + 10;
    const rows = tabStrip(e, r.x + 10, y1, r.w - 20, h.tabs, 'xp', 42);
    y1 += rows + 2;
    ctx.fillStyle = Y.panelHead; ctx.fillRect(r.x + 10, y1, r.w - 20, 3);
    y1 += 3;
    ctx.fillStyle = Y.white; ctx.fillRect(r.x + 10, y1, r.w - 20, r.y + r.h - y1 - 8);
    ctx.strokeStyle = skin.rule; ctx.lineWidth = 2; ctx.strokeRect(r.x + 11, y1 + 1, r.w - 22, r.y + r.h - y1 - 10);
    view0 = { x: r.x + 12, y: y1 + 2, w: r.w - 24, h: r.y + r.h - y1 - 12 };
  } else if (view === '2016') {
    const Y = HEAD.y2016;
    ctx.fillStyle = skin.pageBg; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = Y.bar; ctx.fillRect(r.x, r.y, r.w, 82);
    text(ctx, `${h.siteName} · ${h.projectLine}`.toUpperCase(), r.x + 20, r.y + 18, `600 14px ${skin.font}`, Y.pale);
    const hp = fit(ctx, h.heading, (px) => `600 ${px}px ${skin.font}`, 30, r.w - 40, 18);
    text(ctx, h.heading, r.x + 20, r.y + 44, `600 ${hp}px ${skin.font}`, Y.white);
    const tp = fit(ctx, h.tagline, (px) => `${px}px ${skin.font}`, 17, r.w - 40, 12);
    text(ctx, h.tagline, r.x + 20, r.y + 68, `${tp}px ${skin.font}`, Y.white);
    // tab bar, full width on the header colour
    const trial = tabStrip({ ...e, hits: [] }, r.x + 8, r.y + 82, r.w - 16, h.tabs, 'aero', 44);
    ctx.fillStyle = Y.bar; ctx.fillRect(r.x, r.y + 82, r.w, trial);
    const rows = tabStrip(e, r.x + 8, r.y + 82, r.w - 16, h.tabs, 'aero', 44);
    const y1 = r.y + 82 + rows;
    ctx.fillStyle = skin.pageBg; ctx.fillRect(r.x, y1, r.w, r.y + r.h - y1);
    // the white card
    ctx.fillStyle = skin.contentBg; roundRect(ctx, r.x + 12, y1 + 12, r.w - 24, r.y + r.h - y1 - 20, 10); ctx.fill();
    ctx.strokeStyle = skin.rule; ctx.lineWidth = 2; ctx.stroke();
    view0 = { x: r.x + 14, y: y1 + 14, w: r.w - 28, h: r.y + r.h - y1 - 24 };
  } else {
    const Y = HEAD.y2026;
    ctx.fillStyle = Y.field; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = Y.l; ctx.beginPath(); ctx.arc(r.x + 28, r.y + 26, 7, 0, Math.PI * 2); ctx.fill();
    const hp = fit(ctx, h.heading, (px) => `600 ${px}px ${skin.font}`, 24, r.w - 70, 16);
    text(ctx, h.heading, r.x + 48, r.y + 26, `600 ${hp}px ${skin.font}`, Y.textHi);
    const tp = fit(ctx, h.tagline, (px) => `${px}px ${skin.font}`, 17, r.w - 40, 12);
    text(ctx, h.tagline, r.x + 20, r.y + 56, `${tp}px ${skin.font}`, Y.l);
    const rows = tabStrip(e, r.x + 14, r.y + 74, r.w - 28, h.tabs, 'app', 44);
    const y1 = r.y + 74 + rows + 10;
    ctx.fillStyle = Y.edge; ctx.fillRect(r.x, y1 - 4, r.w, 2);
    view0 = { x: r.x + 4, y: y1, w: r.w - 8, h: r.y + r.h - y1 - 4 };
  }
  ctx.restore();
  return view0;
}

// ── the scrollbar: ▲ ▼ and a track you can press ──────────────────────────────────────────────────────────────
export const SCROLL_W = 40;
export function drawScrollbar(e: DrawEnv, vp: Rect, scroll: number, maxScroll: number): { track: Rect; thumb: Rect } {
  const { ctx, skin } = e;
  const x = vp.x + vp.w - SCROLL_W, bh = 40;
  const col = { x, y: vp.y, w: SCROLL_W, h: vp.h };
  const track: Rect = { x, y: vp.y + bh, w: SCROLL_W, h: vp.h - bh * 2 };
  const ratio = maxScroll <= 0 ? 1 : vp.h / (vp.h + maxScroll);
  const th = Math.max(48, Math.round(track.h * ratio));
  const ty = track.y + (maxScroll <= 0 ? 0 : Math.round((track.h - th) * (scroll / maxScroll)));
  const thumb: Rect = { x: x + 3, y: ty, w: SCROLL_W - 6, h: th };
  if (skin.os === 'w95') {
    ctx.fillStyle = D.panel; ctx.fillRect(col.x, col.y, col.w, col.h);
    ctx.fillStyle = D.light; ctx.fillRect(track.x + 2, track.y, track.w - 4, track.h);
    if (maxScroll > 0) { ctx.fillStyle = D.panel; ctx.fillRect(thumb.x, thumb.y, thumb.w, thumb.h); bevel(ctx, thumb.x, thumb.y, thumb.w, thumb.h, false, 3); }
  } else {
    ctx.fillStyle = skin.contentBg; ctx.fillRect(col.x, col.y, col.w, col.h);
    ctx.fillStyle = skin.rule; roundRect(ctx, track.x + 12, track.y, track.w - 24, track.h, 6); ctx.fill();
    if (maxScroll > 0) { ctx.fillStyle = skin.os === 'app' ? skin.link : skin.os === 'xp' ? HEAD.y2003.panelHead : skin.chrome.sel; roundRect(ctx, thumb.x + 6, thumb.y, thumb.w - 12, thumb.h, 6); ctx.fill(); }
  }
  const arrow = (r: Rect, kind: 'up' | 'down', id: string, tip: string): void => {
    const hover = e.hover === id;
    if (skin.os === 'w95') { ctx.fillStyle = D.panel; ctx.fillRect(r.x, r.y, r.w, r.h); bevel(ctx, r.x, r.y, r.w, r.h, hover, 3); }
    else { roundRect(ctx, r.x + 2, r.y + 2, r.w - 4, r.h - 4, 6); ctx.fillStyle = hover ? skin.chrome.sel : skin.chrome.btn; ctx.fill(); ctx.strokeStyle = skin.rule; ctx.lineWidth = 2; ctx.stroke(); }
    glyph(ctx, kind, r.x + r.w / 2, r.y + r.h / 2, skin.os === 'w95' ? D.ink : hover ? skin.chrome.selInk : skin.chrome.btnInk, 8);
    e.hits.push({ ...r, id, tip });
  };
  arrow({ x, y: vp.y, w: SCROLL_W, h: bh }, 'up', 'sc:up', 'Scroll up');
  arrow({ x, y: vp.y + vp.h - bh, w: SCROLL_W, h: bh }, 'down', 'sc:down', 'Scroll down');
  e.hits.push({ ...track, id: 'sc:track', tip: 'Press above or below the handle to page' });
  return { track, thumb };
}
