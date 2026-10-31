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
import { DIALOG } from '../desktop/theme/chrome';
import { ERA1 } from '../desktop/theme/era1';

export interface Ray { p0: pc.Vec3; p1: pc.Vec3 }

type View = 'main' | 'map' | 'controls' | 'restartConfirm';
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
const TAB_W = 0.16, TAB_H = TAB_W * 64 / 256, TAB_DIST = 0.6, TAB_DROP = 0.36, TAB_TURN = 1.3;

export interface XrFrame {
  readonly layerId: number;
  /** once per frame; `ray` is the controller's, for the cursor */
  tick(ray: Ray | null, wrist?: pc.Vec3 | null): void;
  /** the menu opened: hang the plane in front of the head */
  open(): void;
  close(): void;
  /** a select while the menu is open — true if the plane took it */
  press(ray: Ray): boolean;
  /** the helper's line, or null */
  setHint(text: string | null): void;
  /** S270g — a line that wins over the helper's for `seconds` (the table match, its result) */
  notice(text: string | null, seconds?: number): void;
  /** ⚑ S209 / A22 — a select on the ≡ Menu tab opens the menu (true if the tab took it) */
  pressTab(ray: Ray): boolean;
  /** S270f — does this fingertip segment touch the tab (menu closed) or the menu plane (open)? */
  touches(ray: Ray): boolean;
  readonly isOpen: boolean;
  /** ?debug=1 review: where a ray lands on the menu plane, in canvas px */
  debugHit(ray: Ray): { x: number; y: number } | null;
}

export function mountXrFrame(app: pc.Application, head: pc.Entity, opts: {
  /** the frame's Leave, exactly as the DOM menu does it */
  onLeave: () => void;
  /** Restart, confirmed */
  onRestart: () => void;
  onRecentre: () => void;
  /** S270g / VR-04 — Match my table */
  onDesk?: () => void;
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

  let view: View = 'main';
  let hits: Hit[] = [];
  let cursor: { x: number; y: number } | null = null;
  let hover: string | null = null;
  let dirty = true;
  let open = false;
  let hint: string | null = null;

  /** hang a plane `dist` ahead of the head at eye height minus `drop`, facing it */
  const hang = (e: pc.Entity, dist: number, drop: number): void => {
    const pos = head.getPosition();
    const fwd = head.forward.clone();
    fwd.y = 0;
    if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1);
    fwd.normalize();
    const at = new pc.Vec3(pos.x + fwd.x * dist, pos.y - drop, pos.z + fwd.z * dist);
    e.setPosition(at);
    // the plane primitive faces +Y; stood up, its face must point back at the head
    const yaw = Math.atan2(-fwd.x, -fwd.z) * 180 / Math.PI;
    e.setEulerAngles(90, yaw, 0);
  };

  /** where a ray meets a stood-up plane, as canvas px — or null */
  const planeHit = (e: pc.Entity, ray: Ray, w: number, h: number, cw: number, ch: number): { x: number; y: number } | null => {
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
    // local x/z are in the plane's own units (scaled by the entity's scale → already ±0.5 after the inverse)
    const u = local.x + 0.5, v = local.z + 0.5;
    if (u < 0 || u > 1 || v < 0 || v > 1) return null;
    void w; void h;
    return { x: u * cw, y: v * ch };
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
  const rowH = 76;   // big targets: a pinch at arm's length (~6 cm a button at 0.62 m)
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
    const title = view === 'main' ? copy.title : view === 'controls' ? copy.controlsTitle : view === 'restartConfirm' ? copy.restartConfirmTitle : mapCopy.title;
    ctx.fillStyle = DIALOG.titleBar; ctx.fillRect(8, 8, W - 16, 48);
    uiFont(26, true); ctx.fillStyle = DIALOG.titleInk; ctx.fillText(title, 24, 18);
    let y = 84;
    if (view === 'main') {
      y = drawRow(copy.resume, 'resume', y, true);
      if (gameMenuBus.mapSource) y = drawRow(mapCopy.row, 'map', y);
      y = drawRow(copy.recentre, 'recentre', y);
      y = drawRow(copy.xrDesk, 'desk', y);   // S270g / VR-04
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
  const hangTab = (): void => {
    hang(tabPlane, TAB_DIST, TAB_DROP);
    // ⚑ S268 (his: "The floating menu button just sits in front of the screen") — well to the right and low, clear of
    //   the monitor (about ±20° of the seat's gaze): ~34° right, ~30° down
    const fwd = head.forward.clone(); fwd.y = 0; if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1); fwd.normalize();
    const right = new pc.Vec3(-fwd.z, 0, fwd.x);
    tabPlane.setPosition(tabPlane.getPosition().add(right.mulScalar(0.62)));   // S270f: clear of 2026's laptop (the tour)
    // ⚑ S270d (his: "the menu button is always kind of lopsided… pointed more to the left") — moved aside, it still
    //   faced the old gaze, ~34° askew; turn it to face the head from where it now hangs
    const d = tabPlane.getPosition().clone().sub(head.getPosition()); d.y = 0; d.normalize();
    tabPlane.setEulerAngles(90, Math.atan2(-d.x, -d.z) * 180 / Math.PI, 0);
  };
  const tabOffAxis = (): boolean => {
    const fwd = head.forward.clone(); fwd.y = 0; if (fwd.lengthSq() < 1e-4) return false; fwd.normalize();
    const to = tabPlane.getPosition().clone().sub(head.getPosition()); to.y = 0; to.normalize();
    return fwd.dot(to) < Math.cos(TAB_TURN);
  };

  const act = (id: string): void => {
    switch (id) {
      case 'recentre': opts.onRecentre(); gameMenuBus.close(); return;
      case 'desk': gameMenuBus.close(); opts.onDesk?.(); return;
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
    open(): void {
      open = true; view = 'main'; hover = null; cursor = null;
      tabPlane.enabled = false;
      hang(plane, PLANE_DIST, PLANE_DROP);
      plane.enabled = true;
      hintPlane.enabled = false;
      dirty = true;
      draw();
    },
    close(): void {
      open = false;
      plane.enabled = false;
      closedAt = performance.now();
    },
    touches(ray: Ray): boolean {
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
      if (!open) return false;
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
    setHint(text: string | null): void {
      if (noticeText && performance.now() < noticeUntil) text = noticeText;
      else noticeText = null;
      if (text === hint) return;
      hint = text;
      if (hint && !open) { hang(hintPlane, HINT_DIST, HINT_DROP); hintPlane.enabled = true; }
      else hintPlane.enabled = false;
      drawHint();
    },
    debugHit(ray: Ray): { x: number; y: number } | null { return planeHit(plane, ray, PLANE_W, PLANE_H, W, H); },
    tick(ray: Ray | null, wrist?: pc.Vec3 | null): void {
      if (!open) {
        // the tab: shown while immersive and closed; re-hung when the head has turned away from it
        const immersive = !!app.xr?.active;
        if (!immersive) { tabPlane.enabled = false; return; }
        // ⚑ S270f (his: "the menu button is running away from me… it overlaps the laptop" — the tour put it on 2026's
        //   laptop) — with a left hand or controller in view, the tab rides above the left wrist, facing the head:
        //   it never covers the room and it is always where the hand is. Without one it hangs low on the right.
        if (wrist) {
          const at = wrist.clone().add(new pc.Vec3(0, 0.07, 0));
          const d = at.clone().sub(head.getPosition()); d.y = 0;
          if (d.lengthSq() > 1e-6) { d.normalize(); tabPlane.setPosition(at); tabPlane.setEulerAngles(90, Math.atan2(-d.x, -d.z) * 180 / Math.PI, 0); }
          tabPlane.enabled = true; onWrist = true;
          return;
        }
        if (onWrist) { onWrist = false; tabPlane.enabled = false; }
        if (!tabPlane.enabled || tabOffAxis()) { hangTab(); tabPlane.enabled = true; }
        return;
      }
      const p = ray ? planeHit(plane, ray, PLANE_W, PLANE_H, W, H) : null;
      const h = p ? hits.find((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h)?.id ?? null : null;
      const moved = !!p !== !!cursor || (p && cursor && (Math.abs(p.x - cursor.x) > 2 || Math.abs(p.y - cursor.y) > 2));
      if (h !== hover) { hover = h; dirty = true; }
      if (moved) { cursor = p; dirty = true; }
      if (dirty) draw();
    }
  };
}
