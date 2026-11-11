/**
 * ⚑ THE FRAME'S XR FACE — the game menu, the map and the helper's line as a
 * plane in the room, for the headset (S147, 2026-09-16).
 *
 * docs/reinterp/THE_WITNESS_SYSTEM_PLAN_2026-09-16.md §5 named the gap: the
 * frame (src/desktop/gameMenu.ts, src/frame/helper.ts) is DOM, and in an
 * immersive session DOM does not exist — a player in the headset had no menu,
 * no map, no hint, and (until xrInput.ts, the same session) no way to press
 * anything at all. This is the frame drawn the only way the headset can show
 * it: an offscreen canvas textured onto a plane that appears in front of the
 * head when the menu opens (the grip squeeze — xrInput.ts) and a second, small
 * plate for the helper's line. Same pipeline as every screen in the piece
 * (engine/screenTexture.ts), uploads on dirty only.
 *
 * FRAME VOICE, kept: plain type, plain rules, no sound, nothing moves except
 * the cursor. It shares the DOM menu's state through `gameMenuBus` (open /
 * closed, the map's source, Leave) so the engine pauses the same way for both
 * faces; it keeps its own `view`, as the DOM does. It files nothing.
 *
 * What it does NOT carry, on purpose: the unvoiced-name setting and Credits.
 * Both are read before the headset goes on (the pre-fiction panel is DOM too)
 * and both are long reading; the plane carries what a seated player in the
 * headset needs mid-piece — resume, where you are, controls, restart, leave.
 *
 * ⚑ Verified in the desktop review only (`?debug=1` → `__xrFrame.open()`
 * places the plane in front of the desktop camera) — the sandbox has no
 * headset. The in-headset pass is still Sérgio's.
 */
import * as pc from 'playcanvas';
import { makeScreenTexture, makeScreenEntity } from '../engine/screenTexture';
import { gameMenuBus } from '../state/gameMenuBus';
import type { MapState } from '../witness/map';
import copy from '../../data/strings/gameMenu.json';
import mapCopy from '../../data/strings/map.json';
import { DIALOG, FRAME } from '../desktop/theme/chrome';
import { ERA1 } from '../desktop/theme/era1';
const FRAME_EDGE = FRAME.edge, FRAME_BRIGHT = FRAME.bright, FRAME_DIM = FRAME.dim, FRAME_FAINT = FRAME.faint;

export interface Ray { p0: pc.Vec3; p1: pc.Vec3 }

type View = 'main' | 'map' | 'controls' | 'restartConfirm' | 'jumpConfirm';
interface Hit { x: number; y: number; w: number; h: number; id: string }

const W = 1024, H = 768;
/** metres: the plane's size and where it hangs from the head */
// ⚑ closer than any screen in the piece: the seat is 0.7 m from Room 1's monitor
//   and a plane hung further out sat BEHIND it (the first desktop review showed
//   nothing at all). 0.62 m is a tablet held up; 0.62 m wide is ~53° of view.
const PLANE_W = 0.62, PLANE_H = PLANE_W * H / W;
const PLANE_DIST = 0.62, PLANE_DROP = 0.04;
const HINT_W = 0.5, HINT_H = HINT_W * 136 / 1024;
// S270h: lower, at keyboard height — at 0.2 the (now yellow) plate hid the monitor's bottom edge
const HINT_DIST = 0.6, HINT_DROP = 0.3;
/** ⚑ S209 / A22 — the menu tab: small, low, a little to the side; the headset's second way to the menu */
// ⚑ S270c (his: "the menu button is running away from me") — it re-hung itself past ~52° off the gaze while it sits
//   ~34° to the right, so a small turn moved it; now it stays until it is well out of view (~75°), and is a third bigger
const TAB_W = 0.16, TAB_H = TAB_W * 64 / 256;
/** S271 — on the wrist the tab is a watch face: about 6 cm wide */
const WRIST_SCALE = 0.4;
/**
 * ⚑ S345 / T29 — THE POINTER'S NAME TAG. What the ray is on was named on the helper's plate, a 50 cm yellow bar hung
 * 60 cm out at keyboard height — between the hands and everything they reach for (his 8 Nov headset: "the box crosses
 * over my line of interaction, so it feels like I'm touching a button"). His answer 20: "The pointer's box can stay,
 * smaller, and visibly connected to the ray." Now it is a small tag pinned at the ray's end: its corner touches the mark
 * where the ray lands (xrInput.ts), ~1.7° tall at any distance, beside the point and never over it. The helper's own
 * lines keep the plate.
 */
const TAG_CW = 1024, TAG_CH = 96, TAG_H = 0.03, TAG_GAP = 0.008;

export interface XrFrame {
  readonly layerId: number;
  /** once per frame; `ray` is the controller's, for the cursor */
  tick(ray: Ray | null, wrist?: { at: pc.Vec3; palm: pc.Vec3 | null } | null): void;
  /** the menu opened: hang the plane in front of the head */
  open(): void;
  close(): void;
  /** a select while the menu is open — true if the plane took it */
  press(ray: Ray): boolean;
  /** the helper's line, or null */
  setHint(text: string | null): void;
  /** ⚑ S345 / T29 — the name of what the ray is on, pinned at the ray's end (physical). `from` is the ray's origin: the
   *  tag hangs on the far side of the point from it, so the ray never runs through its own name */
  setAim(text: string | null, end: { point: pc.Vec3 } | null, from?: pc.Vec3 | null): void;
  /** ⚑ S359 / H51 — the grip icon beside a holdable thing the ray is on (null: none). `extent` = its half-size, m. */
  setGrip(at: pc.Vec3 | null, extent?: number): void;
  /** S270g — a line that wins over the helper's for `seconds` (the table match, its result) */
  notice(text: string | null, seconds?: number): void;
  /** ⚑ S361 / H50 — the Close's message, one card at a time, on its own plate in front of the eyes (null: down). The
   *  helper's plate holds two lines and was redrawn by the helper every frame, so in the headset the cards never
   *  showed ("where are the message parts?"). */
  setCard(card: { text: string; by?: string; foot?: string } | null): void;
  /** ⚑ S209 / A22 — a select on the ≡ Menu tab opens the menu (true if the tab took it) */
  pressTab(ray: Ray): boolean;
  /** S270f — does this fingertip segment touch the tab (menu closed) or the menu plane (open)? */
  touches(ray: Ray): boolean;
  readonly isOpen: boolean;
  /** S291 — hide the menu plane while the site viewer is up (the menu stays open underneath, the piece stays held) */
  suspend(on: boolean): void;
  /** ?debug=1 review: where a ray lands on the menu plane, in canvas px */
  debugHit(ray: Ray): { x: number; y: number } | null;
}


/** ⚑ S291 — shared with the site viewer (siteViewer/xrMount.ts): hang a plane `dist` ahead of the head at eye height minus
 *  `drop`, facing it (the plane primitive faces +Y; stood up, its face must point back at the head) */
export function hangAhead(head: pc.Entity, e: pc.Entity, dist: number, drop: number): void {
  const pos = head.getPosition();
  const fwd = head.forward.clone();
  fwd.y = 0;
  if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1);
  fwd.normalize();
  e.setPosition(new pc.Vec3(pos.x + fwd.x * dist, pos.y - drop, pos.z + fwd.z * dist));
  e.setEulerAngles(90, Math.atan2(-fwd.x, -fwd.z) * 180 / Math.PI, 0);
}

/** where a ray meets a stood-up plane, as canvas px — or null */
export function rayOnPlane(e: pc.Entity, ray: Ray, cw: number, ch: number): { x: number; y: number } | null {
  const n = e.up;            // the plane's normal (local +Y)
  const P = e.getPosition();
  const d = new pc.Vec3().sub2(ray.p1, ray.p0);
  const denom = d.dot(n);
  if (Math.abs(denom) < 1e-6) return null;
  const t = new pc.Vec3().sub2(P, ray.p0).dot(n) / denom;
  if (t < 0 || t > 1) return null;
  const hit = new pc.Vec3().copy(d).mulScalar(t).add(ray.p0);
  const local = new pc.Vec3();
  e.getWorldTransform().clone().invert().transformPoint(hit, local);
  const u = local.x + 0.5, v = local.z + 0.5;
  if (u < 0 || u > 1 || v < 0 || v > 1) return null;
  return { x: u * cw, y: v * ch };
}

/** ⚑ S291 — the watch gesture, shared: a hand's palm turned to the eyes (within ~50 deg), or a controller raised within
 *  55 cm and looked at (within ~30 deg of the gaze) */
export function wristWatched(head: pc.Entity, w: { at: pc.Vec3; palm: pc.Vec3 | null }): boolean {
  const to = head.getPosition().clone().sub(w.at), dist = to.length();
  if (dist > 0.55 || dist < 1e-4) return false;
  to.mulScalar(1 / dist);
  if (w.palm) return w.palm.dot(to) > Math.cos(50 * Math.PI / 180);
  return head.forward.dot(to.mulScalar(-1)) > Math.cos(30 * Math.PI / 180);
}

export function mountXrFrame(app: pc.Application, head: pc.Entity, opts: {
  /** the frame's Leave, exactly as the DOM menu does it */
  onLeave: () => void;
  /** Restart, confirmed */
  onRestart: () => void;
  onRecentre: () => void;
  /** S270g / VR-04 — Match my table */
  onDesk?: () => void;
  /** S291 — the menu's Sources row: open the site viewer */
  onSources?: () => void;
}): XrFrame {
  const layer = new pc.Layer({ name: 'XR Frame', clearDepthBuffer: true });
  app.scene.layers.pushOpaque(layer); app.scene.layers.pushTransparent(layer);
  head.camera!.layers = [...head.camera!.layers, layer.id];
  // ── the menu plane ──
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  const tex = makeScreenTexture(app, canvas);
  const plane = makeScreenEntity('xr-frame-menu', tex, PLANE_W, PLANE_H, true);
  // the frame draws OVER the room: never hidden by a desk, a wall or a screen
  const overRoom = (e: pc.Entity): void => {
    if (e.render) e.render.layers = [layer.id];
    const m = e.render?.material;
    if (m instanceof pc.StandardMaterial) { m.depthTest = false; m.update(); }
  };
  overRoom(plane);
  plane.enabled = false;
  app.root.addChild(plane);

  // ── the helper's plate ──
  const hintCanvas = document.createElement('canvas');
  hintCanvas.width = 1024; hintCanvas.height = 136;
  const hctx = hintCanvas.getContext('2d');
  if (!hctx) throw new Error('2D context unavailable');
  const hintTex = makeScreenTexture(app, hintCanvas);
  const hintPlane = makeScreenEntity('xr-frame-hint', hintTex, HINT_W, HINT_H, true);
  overRoom(hintPlane);
  hintPlane.enabled = false;
  app.root.addChild(hintPlane);

  // ── ⚑ S361 / H50 — the Close's message card: frame voice (the game menu's glass and greys), no sound ──
  const CARD_CW = 1024, CARD_CH = 560, CARD_W = 0.84, CARD_H = CARD_W * CARD_CH / CARD_CW;
  const CARD_DIST = 1.15, CARD_DROP = -0.02;   // ~40° wide at 1.15 m, its middle a little above the eyes (the stars are up there)
  const cardCanvas = document.createElement('canvas');
  cardCanvas.width = CARD_CW; cardCanvas.height = CARD_CH;
  const cardCtx = cardCanvas.getContext('2d');
  if (!cardCtx) throw new Error('2D context unavailable');
  const cardTex = makeScreenTexture(app, cardCanvas);
  const cardPlane = makeScreenEntity('xr-close-card', cardTex, CARD_W, CARD_H, true);
  overRoom(cardPlane);
  cardPlane.enabled = false;
  app.root.addChild(cardPlane);
  const drawCard = (c: { text: string; by?: string; foot?: string }): void => {
    const g = cardCtx;
    g.clearRect(0, 0, CARD_CW, CARD_CH);
    g.fillStyle = FRAME.glass; g.fillRect(0, 0, CARD_CW, CARD_CH);
    g.strokeStyle = FRAME_EDGE; g.lineWidth = 3; g.strokeRect(1.5, 1.5, CARD_CW - 3, CARD_CH - 3);
    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    const wrap = (text: string, font: string, maxW: number): string[] => {
      g.font = font;
      const out: string[] = []; let line = '';
      for (const w of text.split(' ')) {
        const t = line ? `${line} ${w}` : w;
        if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
      }
      if (line) out.push(line);
      return out;
    };
    // the largest type that fits: 40 px down to 30 px
    let size = 40, lines: string[] = [];
    for (; size >= 30; size -= 2) {
      lines = wrap(c.text, `${size}px "Tahoma", "Verdana", sans-serif`, CARD_CW - 112);
      if (lines.length * size * 1.42 + (c.by ? 50 : 0) + 70 <= CARD_CH - 60) break;
    }
    const lh = Math.round(size * 1.42);
    const block = lines.length * lh + (c.by ? 50 : 0);
    let y = Math.max(64, Math.round((CARD_CH - 64 - block) / 2) + size);
    g.font = `${size}px "Tahoma", "Verdana", sans-serif`; g.fillStyle = FRAME_BRIGHT;
    for (const l of lines) { g.fillText(l, 56, y); y += lh; }
    if (c.by) { g.font = `28px "Tahoma", "Verdana", sans-serif`; g.fillStyle = FRAME_DIM; g.fillText(c.by, 56, y + 6); }
    if (c.foot) {
      g.font = `24px "Tahoma", "Verdana", sans-serif`; g.fillStyle = FRAME_FAINT; g.textAlign = 'center';
      g.fillText(c.foot, CARD_CW / 2, CARD_CH - 30); g.textAlign = 'left';
    }
    cardTex.upload();
  };
  let cardKey: string | null = null;

  // ── S345 / T29 — the pointer's name tag ──
  const tagCanvas = document.createElement('canvas');
  tagCanvas.width = TAG_CW; tagCanvas.height = TAG_CH;
  const tagCtx = tagCanvas.getContext('2d');
  if (!tagCtx) throw new Error('2D context unavailable');
  const tagTex = makeScreenTexture(app, tagCanvas);
  const tagPlane = makeScreenEntity('xr-aim-tag', tagTex, TAG_H * TAG_CW / TAG_CH, TAG_H, true);
  overRoom(tagPlane);
  tagPlane.enabled = false;
  app.root.addChild(tagPlane);
  let tagText: string | null = null;
  const drawTag = (text: string): void => {
    const g = tagCtx;
    g.clearRect(0, 0, TAG_CW, TAG_CH);
    g.font = `40px "Tahoma", "Verdana", sans-serif`; g.textBaseline = 'middle';
    let t = text;
    while (t.length > 4 && g.measureText(t).width > TAG_CW - 40) t = t.slice(0, -2);
    if (t !== text) t = t.slice(0, -1) + '…';
    const w = Math.min(TAG_CW, Math.ceil(g.measureText(t).width) + 36);
    // the 1997 tooltip, as the plate was: pale yellow, a black line, black type
    g.fillStyle = ERA1.tooltip; g.fillRect(0, 0, w, TAG_CH);
    g.strokeStyle = ERA1.black; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, TAG_CH - 4);
    g.fillStyle = ERA1.black; g.fillText(t, 18, TAG_CH / 2 + 2);
    tagTex.upload();
  };

  // ── ⚑ S359 / H51 (his 10 Nov answer: "when the controller points at the handheld, an icon appears beside it that
  //   shows it can be held and moved") — the GRIP ICON: a hand closing on a handle, in the frame's own tooltip idiom
  //   (the 1997 tooltip: pale yellow, a black line), drawn ONCE (no per-frame upload), one plane = one draw call. It
  //   hangs at the device's left (the name tag takes its upper right), turned square to the eye, and shows only
  //   while the ray is on a device that can be picked up — never on a look, gone once it is held. ──
  const GRIP_PX = 96, GRIP_SIZE = 0.05;   // the icon's side: 5 cm at a metre (≈ 2.9°), scaled with distance like the tag
  const gripCanvas = document.createElement('canvas');
  gripCanvas.width = GRIP_PX; gripCanvas.height = GRIP_PX;
  const gctx = gripCanvas.getContext('2d');
  if (!gctx) throw new Error('2D context unavailable');
  {
    const g = gctx, u = GRIP_PX / 24;   // a 24-cell glyph, integer cells
    const cell = (x: number, y: number, w: number, h: number): void => g.fillRect(Math.round(x * u), Math.round(y * u), Math.round(w * u), Math.round(h * u));
    g.imageSmoothingEnabled = false;
    g.fillStyle = ERA1.tooltip; g.fillRect(0, 0, GRIP_PX, GRIP_PX);
    g.fillStyle = ERA1.black;
    cell(0, 0, 24, 1); cell(0, 23, 24, 1); cell(0, 0, 1, 24); cell(23, 0, 1, 24);   // the tooltip's black line
    cell(10, 3, 4, 18);   // the handle (a controller's grip, upright)
    g.fillStyle = ERA1.tooltip; cell(11, 4, 2, 16);
    g.fillStyle = ERA1.black;
    for (let i = 0; i < 4; i++) { cell(6, 6 + i * 3.5, 9, 2.5); }   // four fingers closed round it
    cell(5, 6, 2, 14);    // the back of the hand
    cell(14, 7, 4, 3);    // the thumb over the top
    cell(17, 13, 3, 1); cell(19, 12, 1, 3);   // a small arrow: it moves with the hand
  }
  const gripTex = makeScreenTexture(app, gripCanvas);
  gripTex.upload();
  const gripPlane = makeScreenEntity('xr-grip-icon', gripTex, GRIP_SIZE, GRIP_SIZE, true);
  overRoom(gripPlane);
  gripPlane.enabled = false;
  app.root.addChild(gripPlane);

  let view: View = 'main';
  let jumpTarget: { era: 'e1' | 'e2' | 'e3' | 'e4'; label: string } | null = null;
  let hits: Hit[] = [];
  let cursor: { x: number; y: number } | null = null;
  let hover: string | null = null;
  let dirty = true;
  let open = false;
  let suspended = false;
  let hint: string | null = null;

  /** hang a plane `dist` ahead of the head at eye height minus `drop`, facing it */
  const hang = (e: pc.Entity, dist: number, drop: number): void => hangAhead(head, e, dist, drop);

  /** where a ray meets a stood-up plane, as canvas px — or null */
  const planeHit = (e: pc.Entity, ray: Ray, w: number, h: number, cw: number, ch: number): { x: number; y: number } | null => {
    void w; void h;
    return rayOnPlane(e, ray, cw, ch);
  };

  // ── drawing ──
  // ⚑ S270f (the report's 3.5b: "XR menu is the old dark plate, not the Win95 dialog style") — the headset's menu is
  //   the browser's Esc dialog, drawn: a beige panel, a navy title bar, raised buttons that sink under the cursor. The
  //   frame stays functional and undecorated; only its chrome matches the menu it is a copy of.
  const UI = '"Tahoma", "Verdana", sans-serif';
  const uiFont = (px: number, bold = false): void => { ctx.font = `${bold ? '700 ' : ''}${px}px ${UI}`; ctx.textBaseline = 'top'; };
  const bevel = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, sunk = false, t = 3): void => {
    g.fillStyle = sunk ? DIALOG.darker : DIALOG.light; g.fillRect(x, y, w, t); g.fillRect(x, y, t, h);
    g.fillStyle = sunk ? DIALOG.light : DIALOG.darker; g.fillRect(x, y + h - t, w, t); g.fillRect(x + w - t, y, t, h);
  };
  const rowH = 64;   // nine rows clear the footer; each target is 52 px high (~3 cm at 0.62 m)
  const drawRow = (label: string, id: string, y: number, emphasis = false): number => {
    const x = 64, w = W - 128, h = rowH - 12;
    const on = hover === id;
    ctx.fillStyle = DIALOG.panel; ctx.fillRect(x, y, w, h);
    bevel(ctx, x, y, w, h, on);
    if (emphasis) { ctx.strokeStyle = DIALOG.ink; ctx.lineWidth = 2; ctx.strokeRect(x - 3, y - 3, w + 6, h + 6); }
    uiFont(30, emphasis); ctx.fillStyle = DIALOG.ink;
    ctx.fillText(label, x + 24 + (on ? 2 : 0), y + 16 + (on ? 2 : 0));
    hits.push({ x, y, w, h, id });
    return y + rowH;
  };
  const wrap = (text: string, px: number, maxW: number): string[] => {
    uiFont(px);
    const out: string[] = []; let line = '';
    for (const word of text.split(' ')) {
      const t = line ? `${line} ${word}` : word;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = word; } else line = t;
    }
    if (line) out.push(line);
    return out;
  };

  const draw = (): void => {
    hits = [];
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = DIALOG.panel; ctx.fillRect(0, 0, W, H);
    bevel(ctx, 0, 0, W, H, false, 4);
    // the title bar carries the view's title; the body starts under it
    const title = view === 'main' ? copy.title : view === 'controls' ? copy.controlsTitle : view === 'restartConfirm' ? copy.restartConfirmTitle
      : view === 'jumpConfirm' ? copy.jumpConfirmTitle.replace('{era}', jumpTarget?.label ?? '') : mapCopy.title;
    ctx.fillStyle = DIALOG.titleBar; ctx.fillRect(8, 8, W - 16, 48);
    uiFont(26, true); ctx.fillStyle = DIALOG.titleInk; ctx.fillText(title, 24, 18);
    let y = 84;
    if (view === 'main') {
      y = drawRow(copy.resume, 'resume', y, true);
      if (gameMenuBus.mapSource) y = drawRow(mapCopy.row, 'map', y);
      y = drawRow(copy.recentre, 'recentre', y);
      y = drawRow(copy.xrDesk, 'desk', y);   // S270g / VR-04
      y = drawRow(copy.sitesRow, 'sources', y);   // S291
      y = drawRow(copy.controls, 'controls', y);
      y = drawRow(copy.restart, 'restart', y);
      y = drawRow(copy.leave, 'leave', y);
      ctx.fillStyle = DIALOG.dim;
      wrap(copy.xrHow, 19, W - 128).forEach((l, i) => ctx.fillText(l, 64, H - 70 + i * 24));
    } else if (view === 'controls') {
      for (const line of copy.controlsHeadsetLines) {
        for (const l of wrap(line, 22, W - 128)) { ctx.fillStyle = DIALOG.ink; ctx.fillText(l, 64, y); y += 30; }
        y += 8;
      }
      drawRow(copy.back, 'back', H - 44 - rowH);
    } else if (view === 'restartConfirm') {
      for (const l of wrap(copy.restartConfirmBody, 22, W - 128)) { ctx.fillStyle = DIALOG.ink; ctx.fillText(l, 64, y); y += 30; }
      y += 24;
      y = drawRow(copy.restartConfirmYes, 'restart-yes', y);
      drawRow(copy.restartConfirmNo, 'back', y);
    } else if (view === 'jumpConfirm') {
      for (const l of wrap(copy.jumpConfirmBody, 22, W - 128)) { ctx.fillStyle = DIALOG.ink; ctx.fillText(l, 64, y); y += 30; }
      y += 24;
      y = drawRow(copy.jumpConfirmYes, 'jump-yes', y);
      drawRow(copy.jumpConfirmNo, 'map', y);
    } else if (view === 'map') {
      const st: MapState | null = gameMenuBus.mapSource ? gameMenuBus.mapSource() : null;
      y -= 8;
      if (st) {
        const cols = st.eras.length;
        const colW = Math.floor((W - 128 - (cols - 1) * 16) / cols);
        let ahead = false;
        st.eras.forEach((era, i) => {
          const x = 64 + i * (colW + 16);
          ctx.fillStyle = era.here ? DIALOG.titleBar : DIALOG.dark;
          ctx.fillRect(x, y, colW, era.here ? 4 : 2);
          let cy = y + 16;
          // ⚑ S271 (his 31 Oct: "we need to know if there's a way to jump… on the headset") — the browser map's
          //   "Go here", here too: a button at the head of each year's column, then the same confirm
          if (era.id !== 'close' && gameMenuBus.jumpToEra) {
            const id = `go-${era.id}`, on = hover === id, bh = 40;
            ctx.fillStyle = DIALOG.panel; ctx.fillRect(x, cy, colW, bh); bevel(ctx, x, cy, colW, bh, on);
            uiFont(18, true); ctx.fillStyle = DIALOG.ink; ctx.fillText(copy.goHere, x + 12 + (on ? 1 : 0), cy + 10 + (on ? 1 : 0));
            hits.push({ x, y: cy, w: colW, h: bh, id });
            cy += bh + 12;
          }
          const isAhead = ahead;
          if (era.here) ahead = true;
          uiFont(19, true); ctx.fillStyle = isAhead ? DIALOG.faint : era.here ? DIALOG.titleBar : DIALOG.ink;
          for (const l of wrap(era.label, 19, colW)) { ctx.fillText(l, x, cy); cy += 24; }
          uiFont(16);
          if (era.here) { ctx.fillStyle = DIALOG.titleBar; ctx.fillText(mapCopy.hereLabel, x, cy); cy += 24; }
          if (isAhead) {
            ctx.fillStyle = DIALOG.faint;
            ctx.fillText(era.id === 'close' ? mapCopy.aheadLabel : mapCopy.aheadCount.replace('{n}', String(era.beats.length)), x, cy);
            return;
          }
          for (const b of era.beats) {
            const mark = b.state === 'done' ? '✓' : b.state === 'current' ? '▸' : b.beat.optional ? '○' : '·';
            ctx.fillStyle = b.state === 'current' ? DIALOG.titleBar : b.state === 'done' ? DIALOG.ink : DIALOG.dim;
            const lines = wrap(`${mark} ${b.beat.label}`, 16, colW);
            for (const l of lines) { ctx.fillText(l, x, cy); cy += 21; }
          }
          if (era.id !== 'close') {
            const done = era.beats.filter((b) => b.state === 'done').length;
            ctx.fillStyle = DIALOG.dim;
            ctx.fillText(mapCopy.progress.replace('{d}', String(done)).replace('{n}', String(era.beats.length)), x, cy + 6);
          }
        });
      }
      let ry = H - 44 - rowH * 2;
      ry = drawRow(copy.resume, 'resume', ry, true);
      drawRow(copy.back, 'back', ry);
    }
    // the cursor: a ring where the controller's ray meets the plane
    if (cursor) {
      ctx.strokeStyle = DIALOG.ink; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cursor.x, cursor.y, 9, 0, Math.PI * 2); ctx.stroke();
    }
    tex.upload();
    dirty = false;
  };

  const drawHint = (): void => {
    hctx.clearRect(0, 0, 1024, 136);
    if (!hint) { hintTex.upload(); return; }
    // a 1997 tooltip: pale yellow, a black line, black type — dark-on-light reads best in a headset
    hctx.fillStyle = ERA1.tooltip; hctx.fillRect(0, 0, 1024, 136);
    hctx.strokeStyle = ERA1.black; hctx.lineWidth = 3; hctx.strokeRect(1.5, 1.5, 1021, 133);
    hctx.font = `26px "Tahoma", "Verdana", sans-serif`; hctx.textBaseline = 'middle'; hctx.fillStyle = ERA1.black;
    hctx.textAlign = 'center';
    // two lines at most; a hint that needs a third is cut with a mark, not clipped
    const lines: string[] = []; let line = '';
    for (const word of hint.split(' ')) {
      const t = line ? `${line} ${word}` : word;
      if (hctx.measureText(t).width > 980 && line) { lines.push(line); line = word; } else line = t;
    }
    if (line) lines.push(line);
    if (lines.length > 2) { lines.length = 2; lines[1] = lines[1].slice(0, -1) + '…'; }
    lines.forEach((l, i) => hctx.fillText(l, 512, lines.length === 1 ? 68 : 46 + i * 44));
    hctx.textAlign = 'left';
    hintTex.upload();
  };

  // ── ⚑ S209 / A22 (REVIEW_ROUND_5, PLATFORM-03) — THE MENU TAB. The grip squeeze was the only way to the menu, and
  //   Vision Pro (pinch only) and some hand-tracking have no squeeze: no Resume, no Leave. A small plate, frame voice,
  //   hangs low and to the side of the gaze whenever the menu is closed; the same select as everything else opens the
  //   menu. It re-hangs when the head has turned well away from it. Never gaze: looking at it does nothing.
  const tabCanvas = document.createElement('canvas');
  tabCanvas.width = 256; tabCanvas.height = 64;
  const tctx = tabCanvas.getContext('2d');
  const tabTex = makeScreenTexture(app, tabCanvas);
  const tabPlane = makeScreenEntity('xr-frame-tab', tabTex, TAB_W, TAB_H, true);
  overRoom(tabPlane);
  tabPlane.enabled = false;
  app.root.addChild(tabPlane);
  if (tctx) {
    tctx.fillStyle = DIALOG.panel; tctx.fillRect(0, 0, 256, 64);
    bevel(tctx, 0, 0, 256, 64, false, 4);
    tctx.fillStyle = DIALOG.ink; tctx.font = '700 28px "Tahoma", "Verdana", sans-serif'; tctx.textBaseline = 'middle';
    tctx.fillText(`\u2261 ${copy.menuTab}`, 28, 33);
    tabTex.upload();
  }
  let closedAt = 0, onWrist = false, noticeText: string | null = null, noticeUntil = 0;
  const watching = (w: { at: pc.Vec3; palm: pc.Vec3 | null }): boolean => wristWatched(head, w);

  const act = (id: string): void => {
    if (id.startsWith('go-')) {
      const era = gameMenuBus.mapSource?.().eras.find((e) => `go-${e.id}` === id);
      if (era && era.id !== 'close') { jumpTarget = { era: era.id, label: era.label }; view = 'jumpConfirm'; dirty = true; }
      return;
    }
    if (id === 'jump-yes') { const t = jumpTarget; jumpTarget = null; view = 'main'; if (t) gameMenuBus.jumpToEra?.(t.era); return; }
    switch (id) {
      case 'recentre': opts.onRecentre(); gameMenuBus.close(); return;
      case 'desk': gameMenuBus.close(); opts.onDesk?.(); return;
      case 'sources': opts.onSources?.(); return;
      case 'resume': gameMenuBus.close(); gameMenuBus.showHint?.(); return;
      case 'map': view = 'map'; break;
      case 'controls': view = 'controls'; break;
      case 'restart': view = 'restartConfirm'; break;
      case 'restart-yes': opts.onRestart(); return;
      case 'leave': gameMenuBus.close(); opts.onLeave(); return;
      case 'back': view = 'main'; break;
      default: return;
    }
    dirty = true;
  };

  return {
    layerId: layer.id,
    get isOpen(): boolean { return open; },
    suspend(on: boolean): void { suspended = on; plane.enabled = open && !on; if (!on) dirty = true; },
    open(): void {
      open = true; suspended = false; view = 'main'; hover = null; cursor = null;
      tabPlane.enabled = false; tagPlane.enabled = false;
      hang(plane, PLANE_DIST, PLANE_DROP);
      plane.enabled = true;
      hintPlane.enabled = false;
      cardPlane.enabled = false;   // S361: the Close's card waits under the menu
      dirty = true;
      draw();
    },
    close(): void {
      open = false; suspended = false;
      plane.enabled = false;
      if (cardKey) { hang(cardPlane, CARD_DIST, CARD_DROP); cardPlane.enabled = true; }
      closedAt = performance.now();
    },
    touches(ray: Ray): boolean {
      if (suspended) return false;
      if (open) return !!planeHit(plane, ray, PLANE_W, PLANE_H, W, H);
      return tabPlane.enabled && !!planeHit(tabPlane, ray, TAB_W, TAB_H, 256, 64);
    },
    pressTab(ray: Ray): boolean {
      // the press that closed the menu (Resume, Recentre) must not land on the tab and open it again
      if (open || !tabPlane.enabled || performance.now() - closedAt < 700) return false;
      if (!planeHit(tabPlane, ray, TAB_W, TAB_H, 256, 64)) return false;
      gameMenuBus.open();
      return true;
    },
    press(ray: Ray): boolean {
      if (!open || suspended) return false;
      const p = planeHit(plane, ray, PLANE_W, PLANE_H, W, H);
      if (!p) return false;
      const h = hits.find((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
      if (h) act(h.id);
      return true;
    },
    notice(text: string | null, seconds = 6): void {
      noticeUntil = text ? performance.now() + seconds * 1000 : 0;
      noticeText = null; this.setHint(text); noticeText = text;
    },
    setCard(card: { text: string; by?: string; foot?: string } | null): void {
      const key = card ? `${card.text}|${card.by ?? ''}|${card.foot ?? ''}` : null;
      if (key === cardKey) return;
      cardKey = key;
      if (!card) { cardPlane.enabled = false; return; }
      drawCard(card);
      hang(cardPlane, CARD_DIST, CARD_DROP);   // each card hangs where the eyes are when it comes
      cardPlane.enabled = true;
    },
    setHint(text: string | null): void {
      if (noticeText && performance.now() < noticeUntil) text = noticeText;
      else noticeText = null;
      if (text === hint) return;
      hint = text;
      if (hint && !open) { hang(hintPlane, HINT_DIST, HINT_DROP); hintPlane.enabled = true; }
      else hintPlane.enabled = false;
      drawHint();
    },
    setAim(text: string | null, end: { point: pc.Vec3 } | null, from?: pc.Vec3 | null): void {
      if (!text || !end || open || !app.xr?.active) { tagPlane.enabled = false; return; }
      if (text !== tagText) { tagText = text; drawTag(text); }
      const eye = head.getPosition(), at = end.point;
      const d = Math.max(0.25, at.distance(eye));
      const h = TAG_H * d, w = h * TAG_CW / TAG_CH, gap = TAG_GAP * d;
      tagPlane.setLocalScale(w, 1, h);
      // turned square to the eye (its face +Y back at the eye, its −Z up the view), its near corner at the point
      tagPlane.setPosition(at);
      tagPlane.lookAt(at.clone().add(at.clone().sub(eye)), head.up);   // the head's up: level in the view, never rolled
      tagPlane.rotateLocal(90, 0, 0);
      const right = tagPlane.right.clone(), up = tagPlane.forward.clone();
      const below = !!from && from.clone().sub(at).dot(up) > 0;   // a ray from above (rare) hangs it underneath
      tagPlane.setPosition(at.clone().add(right.mulScalar(gap + w / 2)).add(up.mulScalar((below ? -1 : 1) * (gap + h / 2))));
      tagPlane.enabled = true;
    },
    setGrip(at: pc.Vec3 | null, extent = 0.12): void {
      if (!at || open || !app.xr?.active) { gripPlane.enabled = false; return; }
      const eye = head.getPosition();
      const d = Math.max(0.25, at.distance(eye));
      const side = GRIP_SIZE * d, gap = TAG_GAP * d;
      gripPlane.setLocalScale(side, 1, side);
      gripPlane.setPosition(at);
      gripPlane.lookAt(at.clone().add(at.clone().sub(eye)), head.up);   // square to the eye, never rolled
      gripPlane.rotateLocal(90, 0, 0);
      const left = gripPlane.right.clone().mulScalar(-(extent + gap + side / 2));
      gripPlane.setPosition(at.clone().add(left));
      gripPlane.enabled = true;
    },
    debugHit(ray: Ray): { x: number; y: number } | null { return planeHit(plane, ray, PLANE_W, PLANE_H, W, H); },
    tick(ray: Ray | null, wrist?: { at: pc.Vec3; palm: pc.Vec3 | null } | null): void {
      if (!open) {
        // the tab: shown while immersive and closed; re-hung when the head has turned away from it
        const immersive = !!app.xr?.active;
        if (!immersive) { tabPlane.enabled = false; return; }
        // ⚑ S270f (his: "the menu button is running away from me… it overlaps the laptop" — the tour put it on 2026's
        //   laptop) — with a left hand or controller in view, the tab rides above the left wrist, facing the head:
        //   it never covers the room and it is always where the hand is. Without one it hangs low on the right.
        // ⚑ S271 (his 31 Oct: the wrist tab "comes up huge and sideways"; "if I use this hand… it changes this screen")
        //   — it rode the left wrist all the time, 16 cm wide, so a left hand reaching for the screen carried it into
        //   the press. Now it is a watch: it shows only when the wrist is turned to the face (a hand's palm towards the
        //   eyes, or a controller raised and looked at), small, and square to the eye.
        if (wrist && watching(wrist)) {
          const at = wrist.at.clone().add(new pc.Vec3(0, 0.06, 0));
          tabPlane.setPosition(at);
          tabPlane.lookAt(at.clone().add(at.clone().sub(head.getPosition())));   // −Z away from the eye; +Y (the face) back at it
          tabPlane.rotateLocal(90, 0, 0);
          if (!onWrist) tabPlane.setLocalScale(TAB_W * WRIST_SCALE, 1, TAB_H * WRIST_SCALE);
          tabPlane.enabled = true; onWrist = true;
          return;
        }
        if (onWrist) { onWrist = false; tabPlane.setLocalScale(TAB_W, 1, TAB_H); }
        // ⚑ P8 (headset B, 1 Nov: the tab "in front of the screen… on a different layer perspective", in 2003, 2016 and
        //   2026, after four placements) — the floating tab is gone. The menu is the watch (above), the controller
        //   raised and looked at, or Esc: nothing of the frame hangs in the room any more.
        tabPlane.enabled = false;
        return;
      }
      if (suspended) return;
      const p = ray ? planeHit(plane, ray, PLANE_W, PLANE_H, W, H) : null;
      const h = p ? hits.find((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h)?.id ?? null : null;
      const moved = !!p !== !!cursor || (p && cursor && (Math.abs(p.x - cursor.x) > 2 || Math.abs(p.y - cursor.y) > 2));
      if (h !== hover) { hover = h; dirty = true; }
      if (moved) { cursor = p; dirty = true; }
      if (dirty) draw();
    }
  };
}
