/** Home's XR renderer. The DOM remains the controller: every ray select clicks
 * the same object/button/input. No gate, cut or handover decisions live here.
 * Existing licensed Home layers are preloaded once; a single nearest-filtered
 * quad is uploaded only after art/state/hover changes. No gaze selection. */
import * as pc from 'playcanvas';
import type { AppShell } from '../../engine/app';
import { makeScreenEntity, makeScreenTexture } from '../../engine/screenTexture';
import { mountXrInput } from '../../frame/xrInput';
import type { Ray } from '../../frame/xrFrame';
import { gameMenuBus } from '../../state/gameMenuBus';
import { noteHumanInput, registerXrSession } from '../../frame/attract';
import { DIALOG, FRAME } from '../theme/chrome';
import { HOME } from '../theme/home';
import copy from '../../../data/strings/home.json';
import {
  ROOM, DECOR, TAB_ORDER, visualRect, hitRect, layerSize, layerUrl,
  bubbleRect, handRect, HAND_PIVOT, padlockAnchor, type HomeObject, type Rect
} from './homeArt';

interface State {
  armed: boolean; entered: boolean; isReturn: boolean;
  clockQuarter: number; month: number; bubble: string; noticeSeen: boolean;
}
interface Hit extends Rect { id: string; label?: string; act(): void }
export interface HomeXr { invalidate(): void; destroy(): void }
const W = ROOM.laptop.w, H = ROOM.laptop.h;
const WIDTH = 2.4, DIST = 2.2;

export function mountHomeXr(shell: AppShell, opts: {
  root: HTMLElement; veil: HTMLElement;
  state(): State; press(k: HomeObject): void; dismiss(): void;
  onImmersive(active: boolean): void;
}): HomeXr {
  const { app, camera } = shell;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const tex = makeScreenTexture(app, canvas);
  const plane = makeScreenEntity('lambyos-home-xr', tex, WIDTH, WIDTH * H / W);
  // Render after the loading room with fresh depth. The window can never be
  // occluded by room geometry, but a controller wand in front remains visible.
  const layer = new pc.Layer({ name: 'Home XR', clearDepthBuffer: true });
  app.scene.layers.pushOpaque(layer);
  camera.camera!.layers = [...camera.camera!.layers, layer.id];
  plane.render!.layers = [layer.id];
  const mat = plane.render!.material as pc.StandardMaterial;
  plane.enabled = false;
  app.root.addChild(plane);
  let disposed = false, dirty = true, active = false, review = false;
  let page = 0, uploads = 0;
  let hover: string | null = null;
  let hits: Hit[] = [];
  let lastCard: Element | null = null;
  const art = new Map<string, HTMLImageElement>();
  const names = ['room', ...DECOR, 'door', 'notice', 'plaque', 'lexicon', 'remote', 'switch',
    'computer', 'tablet', 'headset', 'clock', 'calendar', 'lamby', 'lamby-wave',
    'clock-hour-hand', 'clock-minute-hand', 'speech-bubble'];
  // Both Lamby poses and both hands load now, never as a later state transition.
  const ready = Promise.all(names.map((name) => new Promise<void>((resolve) => {
    const img = new Image(); art.set(name, img);
    img.onload = () => { dirty = true; resolve(); };
    img.onerror = () => { console.error(`[home-xr] missing art: ${name}`); resolve(); };
    img.src = layerUrl(name, 'laptop', true);
  })));

  const invalidate = (): void => { dirty = true; };
  const menu = document.getElementById('reinterp-game-menu');
  const observer = new MutationObserver(invalidate);
  observer.observe(document.body, { childList: true });
  observer.observe(opts.root, { subtree: true, childList: true, characterData: true, attributes: true });
  if (menu) observer.observe(menu, { subtree: true, childList: true, characterData: true, attributes: true });
  opts.root.addEventListener('change', invalidate);
  menu?.addEventListener('change', invalidate);
  const unsubscribe = gameMenuBus.onChange(() => { page = 0; dirty = true; hang(); });

  function hang(): void {
    const pos = camera.getPosition();
    plane.setPosition(pos.clone().add(camera.forward.clone().mulScalar(DIST)));
    plane.setRotation(camera.getRotation());
    plane.rotateLocal(90, 0, 0); // plane primitive's +Y faces the viewer
  }
  function point(ray: Ray): { x: number; y: number } | null {
    const d = ray.p1.clone().sub(ray.p0), n = plane.up;
    const denominator = d.dot(n);
    if (Math.abs(denominator) < 1e-6) return null;
    const t = plane.getPosition().clone().sub(ray.p0).dot(n) / denominator;
    if (t < 0 || t > 1) return null;
    const p = plane.getWorldTransform().clone().invert().transformPoint(d.mulScalar(t).add(ray.p0));
    const u = p.x + 0.5, v = p.z + 0.5;
    return u >= 0 && u <= 1 && v >= 0 && v <= 1 ? { x: Math.round(u * W), y: Math.round(v * H) } : null;
  }
  function selected(ray: Ray): boolean {
    if (!plane.enabled) return false;
    if (dirty) draw();
    const p = point(ray);
    const hit = p && [...hits].reverse().find((h) => p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h);
    if (hit) { noteHumanInput(); hit.act(); dirty = true; }
    return !!p;
  }
  const input = mountXrInput(app, {
    onSelect: selected, onMenuSelect: selected,
    onSqueeze: () => { noteHumanInput(); gameMenuBus.toggle(); },
    menuOpen: () => gameMenuBus.isOpen,
    wandColor: new pc.Color().fromString(FRAME.ink), layers: [layer.id]
  });
  registerXrSession({ active: () => !!app.xr?.active, end: () => { if (app.xr?.active) app.xr.end(); } });

  function font(size = 44, bold = false): void {
    ctx.font = `${bold ? '700 ' : ''}${size}px Arial, sans-serif`;
    ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  }
  function wrap(text: string, width: number, size = 44): string[] {
    font(size);
    const lines: string[] = [];
    for (const para of text.split('\n')) {
      let line = '';
      for (const token of para.trim().split(/\s+/)) {
        // Long printed addresses are reading too: wrap them without dropping text.
        const parts: string[] = []; let part = '';
        for (const letter of token) {
          if (part && ctx.measureText(part + letter).width > width) { parts.push(part); part = letter; }
          else part += letter;
        }
        if (part) parts.push(part);
        for (const word of parts) {
          const next = line ? `${line} ${word}` : word;
          if (line && ctx.measureText(next).width > width) { lines.push(line); line = word; }
          else line = next;
        }
      }
      if (line) lines.push(line);
    }
    return lines;
  }
  function box(r: Rect, label: string, id: string, act: () => void, disabled = false, checked = false): void {
    ctx.fillStyle = hover === id ? HOME.paper : DIALOG.panel;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = DIALOG.dark; ctx.lineWidth = 4;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    font(40); ctx.fillStyle = disabled ? DIALOG.faint : DIALOG.ink;
    wrap(`${checked ? '● ' : ''}${label}`, r.w - 48, 40).forEach((l, i) => ctx.fillText(l, r.x + 24, r.y + 20 + i * 48));
    if (!disabled) hits.push({ ...r, id, label, act });
  }
  function image(name: string, r: Rect, flip = false, angle = 0, pivot = [0.5, 0.5]): void {
    const i = art.get(name);
    if (!i?.complete || !i.naturalWidth) return;
    const size = layerSize(name, 'laptop');
    const x = Math.round(r.x + r.w / 2 - size.w / 2), y = Math.round(r.y + r.h / 2 - size.h / 2);
    ctx.save();
    if (angle) {
      ctx.translate(Math.round(x + size.w * pivot[0]), Math.round(y + size.h * pivot[1]));
      ctx.rotate(angle * Math.PI / 180);
      ctx.translate(-Math.round(size.w * pivot[0]), -Math.round(size.h * pivot[1]));
    } else { ctx.translate(x + (flip ? size.w : 0), y); if (flip) ctx.scale(-1, 1); }
    ctx.drawImage(i, 0, 0, size.w, size.h); ctx.restore();
  }

  /** Render the live card's plain text and controls. Click closures reference
   * the original DOM elements, including disabled Enter and radio change.
   * Long reading is paginated, so no content or Leave is clipped in XR. */
  function card(source: HTMLElement): void {
    type Row = { label: string; control?: HTMLElement; checked?: boolean; height: number };
    const rows: Row[] = [];
    function visit(el: HTMLElement): void {
      if (el.style.display === 'none' || el.hidden || el.getAttribute('aria-hidden') === 'true') return;
      if (el instanceof HTMLButtonElement || el instanceof HTMLAnchorElement || el.tagName === 'LABEL') {
        const rb = el.querySelector<HTMLInputElement>('input');
        const label = el.textContent?.trim() || el.getAttribute('aria-label') || '';
        if (label) rows.push({ label, control: rb ?? el, checked: rb?.checked, height: Math.max(96, wrap(label, 1696, 40).length * 48 + 40) });
        return;
      }
      if (el instanceof HTMLInputElement) {
        const label = el.getAttribute('aria-label') ?? '';
        if (label) rows.push({ label, control: el, checked: el.checked, height: 96 });
        return;
      }
      if (el.children.length === 0) {
        const label = el.textContent?.trim();
        if (label) rows.push({ label, height: wrap(label, 1744).length * 54 + 22 });
        return;
      }
      // Include text nodes beside inline controls, without duplicating nested text.
      for (const child of el.childNodes) {
        if (child instanceof HTMLElement) visit(child);
        else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
          const label = child.textContent.trim(); rows.push({ label, height: wrap(label, 1744).length * 54 + 22 });
        }
      }
    }
    visit(source);
    const pages: Row[][] = [[]]; let used = 0;
    for (const r of rows) {
      if (used + r.height > 1570 && pages[pages.length - 1].length) { pages.push([]); used = 0; }
      pages[pages.length - 1].push(r); used += r.height;
    }
    page = Math.min(page, pages.length - 1);
    const x = 1000, width = 1840;
    const height = Math.min(1820, pages[page].reduce((sum, r) => sum + r.height, 0) + 100 + (pages.length > 1 ? 126 : 0));
    const y0 = Math.round((H - height) / 2), navigationY = y0 + height - 120;
    ctx.fillStyle = DIALOG.panel; ctx.fillRect(x, y0, width, height);
    ctx.strokeStyle = DIALOG.dark; ctx.lineWidth = 6; ctx.strokeRect(x, y0, width, height);
    let y = y0 + 38;
    pages[page].forEach((row, i) => {
      if (row.control) {
        const el = row.control;
        const disabled = (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) && el.disabled;
        box({ x: x + 48, y, w: width - 96, h: row.height - 12 }, row.label, `card-${page}-${i}`, () => { el.click(); invalidate(); }, disabled, row.checked);
      } else {
        font(); ctx.fillStyle = DIALOG.ink;
        wrap(row.label, width - 96).forEach((l, j) => ctx.fillText(l, x + 48, y + j * 54));
      }
      y += row.height;
    });
    if (page > 0) box({ x: x + 48, y: navigationY, w: 820, h: 94 }, copy.xr.previous, 'previous', () => { page--; invalidate(); });
    if (page + 1 < pages.length) box({ x: x + 972, y: navigationY, w: 820, h: 94 }, copy.xr.next, 'next', () => { page++; invalidate(); });
  }

  function draw(): void {
    hits = [];
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = HOME.ink; ctx.fillRect(0, 0, W, H);
    const room = art.get('room');
    if (room?.complete && room.naturalWidth) ctx.drawImage(room, 0, 0, W, H);
    const s = opts.state();
    for (const name of DECOR) image(name, visualRect(name, 'laptop')!);
    for (const k of TAB_ORDER) {
      if (k !== 'armchair') {
        const name = k === 'lamby' ? s.armed ? 'lamby-wave' : 'lamby' : k;
        ctx.save();
        if (k === 'lexicon' && !s.isReturn) ctx.filter = 'grayscale(.75) brightness(.9)';
        image(name, visualRect(k, 'laptop')!, k === 'lamby');
        ctx.restore();
      }
    }
    if (!s.noticeSeen && !s.isReturn) {
      const r = visualRect('notice', 'laptop')!;
      ctx.strokeStyle = HOME.accent; ctx.lineWidth = 8; ctx.strokeRect(r.x, r.y, r.w, r.h);
    }
    image('clock-hour-hand', handRect('hour', 'laptop'), false, s.clockQuarter * 90, HAND_PIVOT);
    image('clock-minute-hand', handRect('minute', 'laptop'), false, ((s.clockQuarter + 1) % 4) * 90, HAND_PIVOT);
    const cal = visualRect('calendar', 'laptop')!;
    font(48, true); ctx.fillStyle = HOME.ink; ctx.textAlign = 'center';
    ctx.fillText(copy.calendar.months[s.month], Math.round(cal.x + cal.w / 2), cal.y + 94); ctx.textAlign = 'left';
    // Same z order as the DOM: chair over Lamby, Lamby over the door.
    const order = ['door', ...TAB_ORDER.filter((k) => !['door', 'lamby', 'armchair'].includes(k)), 'lamby', 'armchair'] as HomeObject[];
    if (!s.entered) for (const k of order) hits.push({ ...hitRect(k, 'laptop'), id: k, act: () => opts.press(k) });
    for (const k of ['notice', 'computer', 'tablet', 'headset'] as const) {
      const r = hitRect(k, 'laptop'); font(40, true);
      const label = copy.labels[k], tw = Math.ceil(ctx.measureText(label).width) + 32;
      const lr = { x: Math.round(r.x + (r.w - tw) / 2), y: k === 'notice' ? r.y + r.h - 64 : r.y + r.h + 12, w: tw, h: 64 };
      ctx.fillStyle = DIALOG.panel; ctx.fillRect(lr.x, lr.y, lr.w, lr.h);
      ctx.fillStyle = DIALOG.ink; ctx.fillText(label, lr.x + 16, lr.y + 10);
      if (!s.entered) hits.push({ ...lr, id: k, act: () => opts.press(k) });
      if (k !== 'notice' && !s.armed && !s.isReturn) {
        const v = visualRect(k, 'laptop')!, [ax, ay] = padlockAnchor(k);
        const x = Math.round(v.x + v.w * ax), y = Math.round(v.y + v.h * ay);
        ctx.strokeStyle = HOME.paper; ctx.lineWidth = 12; ctx.strokeRect(x + 12, y, 38, 38);
        ctx.fillStyle = HOME.accent; ctx.fillRect(x, y + 30, 64, 48);
        ctx.fillStyle = HOME.ink; ctx.fillRect(x + 28, y + 46, 8, 20);
      }
    }
    const source = document.getElementById('reinterp-leave-page') ?? (gameMenuBus.isOpen && menu ? menu : opts.veil.style.display !== 'none' ? opts.veil.firstElementChild as HTMLElement | null : null);
    if (source !== lastCard) { page = 0; lastCard = source; if (source) { observer.observe(source, { subtree: true, childList: true, characterData: true, attributes: true }); hang(); } }
    if (source) {
      hits = []; ctx.fillStyle = `rgba(${DIALOG.veilRGB}, 0.65)`; ctx.fillRect(0, 0, W, H); card(source);
    } else if (s.bubble) {
      const r = bubbleRect('laptop'), lines = wrap(s.bubble, r.w - 240, 44);
      const height = Math.max(r.h, lines.length * 54 + 120);
      const i = art.get('speech-bubble');
      if (i?.complete && i.naturalWidth) { ctx.save(); ctx.translate(r.x + r.w, r.y); ctx.scale(-1, 1); ctx.drawImage(i, 0, 0, r.w, height); ctx.restore(); }
      font(44, true); ctx.fillStyle = HOME.ink;
      lines.forEach((l, n) => ctx.fillText(l, r.x + 100, r.y + 44 + n * 54));
      font(44, true); ctx.fillText('×', r.x + r.w - 72, r.y + 44);
      hits.push({ x: r.x + r.w - 100, y: r.y, w: 100, h: 96, id: 'dismiss', act: opts.dismiss });
    }
    if (s.entered && !source) {
      font(48); const label = copy.xr.loading, tw = Math.ceil(ctx.measureText(label).width) + 80;
      ctx.fillStyle = DIALOG.panel; ctx.fillRect(Math.round((W - tw) / 2), H - 140, tw, 100);
      ctx.fillStyle = DIALOG.ink; ctx.fillText(label, Math.round((W - tw) / 2) + 40, H - 114);
    }
    const h = hits.find((h) => h.id === hover);
    if (h) { ctx.strokeStyle = HOME.accent; ctx.lineWidth = 8; ctx.strokeRect(h.x, h.y, h.w, h.h); }
    tex.upload(); uploads++; dirty = false;
  }
  function tick(): void {
    const immersive = !!app.xr?.active;
    if (immersive !== active) {
      active = immersive; opts.onImmersive(active); hang(); dirty = true;
    }
    plane.enabled = active || review;
    if (!plane.enabled) return;
    // Loading remains at the eye through the engine's first authored pose.
    // Placement changes never upload the texture or select anything.
    if (opts.state().entered) hang();
    input.tick();
    const ray = input.ray(), p = ray && point(ray);
    const next = p ? [...hits].reverse().find((h) => p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h)?.id ?? null : null;
    if (next !== hover) { hover = next; dirty = true; }
    if (dirty) draw();
  }
  app.on('prerender', tick);
  // Review hook exercises the real texture, plane intersections and shared DOM
  // callbacks. It does not assert that an emulated ray is a physical headset.
  if (new URLSearchParams(window.location.search).get('debug') === '1') {
    (window as unknown as { __homeXr: unknown }).__homeXr = {
      canvas, ready, app,
      show: () => { review = true; hang(); dirty = true; },
      ray: (p0: number[], p1: number[]) => selected({ p0: new pc.Vec3(...p0), p1: new pc.Vec3(...p1) }),
      target: (id: string) => {
        if (dirty) draw(); const h = hits.find((h) => h.id === id); if (!h) return null;
        const local = new pc.Vec3((h.x + h.w / 2) / W - 0.5, 0, (h.y + h.h / 2) / H - 0.5);
        return plane.getWorldTransform().transformPoint(local).toArray();
      },
      status: () => ({ active, uploads, hits: hits.map(({ act: _, ...h }) => h), width: WIDTH, distance: DIST, state: opts.state() })
    };
  }
  return {
    invalidate,
    destroy(): void {
      if (disposed) return; disposed = true;
      app.off('prerender', tick); observer.disconnect(); unsubscribe();
      opts.root.removeEventListener('change', invalidate); menu?.removeEventListener('change', invalidate);
      input.destroy(); plane.destroy(); mat.destroy(); tex.destroy();
      camera.camera!.layers = camera.camera!.layers.filter((id) => id !== layer.id);
      app.scene.layers.remove(layer);
      if (new URLSearchParams(window.location.search).get('debug') === '1') delete (window as unknown as { __homeXr?: unknown }).__homeXr;
    }
  };
}
