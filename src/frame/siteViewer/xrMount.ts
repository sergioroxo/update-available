/**
 * ⚑ S291 — THE SITE VIEWER IN THE HEADSET: the same window (core.ts), drawn on an offscreen canvas and hung as one plane
 * on the frame's own layer (xrFrame.ts's 'XR Frame', drawn over the room, never hidden by a desk or a screen), about
 * 0.8 m ahead of the head and 0.9 m wide, facing it. It comes TOWARDS the visitor when it opens. The controller's ray (or
 * a fingertip) presses its buttons through the same planar hit-test the menu uses; the thumbstick scrolls it; ▲ ▼ and the
 * scroll track are plain targets for a hand. Minimise folds it to a small tab that rides the wrist (the menu tab's
 * grammar, xrFrame.ts); close removes it. Nothing here leaves the session: links are SHOWN with their address (a headset
 * cannot open a page over an immersive session), nothing is stored, nothing is requested.
 *
 * One canvas texture, uploaded only when the viewer changes (scroll, tab, hover, an image arriving); one plane for the
 * window and one small plane for the tab. ⚑ Verified by simulation in desktop Chrome only (`?debug=1` →
 * `__siteViewer.xr.review()`), never in a headset: the in-headset pass is Sérgio's.
 */
import * as pc from 'playcanvas';
import { makeScreenEntity, makeScreenTexture } from '../../engine/screenTexture';
import { hangAhead, rayOnPlane, wristWatched, type Ray } from '../xrFrame';
import { gameMenuBus } from '../../state/gameMenuBus';
import { reducedMotion } from '../../state/motion';
import { DIALOG } from '../../desktop/theme/chrome';
import { ViewerCore, type ViewerHost } from './core';
import { siteViewerBus, type ViewerTarget } from './bus';
import { viewerAudio, viewerFilm } from './audio';

/** logical px of the window; the canvas is drawn at ×1.5 (1536 × 1152) so a 22 px line is crisp at arm's length */
const LW = 1024, LH = 768, SCALE = 1.5;
/** metres: ≈ 0.9 m wide at ≈ 0.8 m — about 59° of view, the size a held tablet reads at */
const PLANE_W = 0.9, PLANE_H = PLANE_W * LH / LW;
const DIST = 0.8, DROP = 0.03, FROM_DIST = 1.5, APPROACH_MS = 420;
const TAB_W = 0.16, TAB_H = TAB_W * 64 / 256, WRIST_SCALE = 0.4;
/** thumbstick scroll: logical px per second at full deflection */
const STICK_SPEED = 900, STICK_DEAD = 0.18;
/** ⚑ S371 — the film's own canvas: the film's rect (picture + progress line, 720 × 447 logical) at about ×1.07. While a
 *  film plays, THIS is what is uploaded on each new picture (768 × 477 ≈ 1.5 MB, a fifth of the window's 1536 × 1152),
 *  never the window; the window is uploaded only when it changes, as before */
const FILM_CW = 768, FILM_CH = 477;

export interface XrViewer {
  readonly core: ViewerCore;
  readonly isOpen: boolean;
  readonly isMinimised: boolean;
  open(target: ViewerTarget): void;
  close(): void;
  /** a select: true when the viewer took it (a hit, or a miss it swallows while the window is up); also restores from the tab */
  pressRay(ray: Ray): boolean;
  /** does this fingertip segment touch the window or the tab? */
  touches(ray: Ray): boolean;
  stick(y: number): void;
  tick(ray: Ray | null, wrist: { at: pc.Vec3; palm: pc.Vec3 | null } | null): void;
  /** the menu closed from elsewhere (the grip): a viewer that came from it goes too */
  onMenuClosed(): void;
  /** ⚑ S371 review: how many times the window and the film's own rect were uploaded, and their sizes */
  filmStats(): { windowUploads: number; filmUploads: number; filmPlane: boolean; filmTexture: [number, number]; windowTexture: [number, number] };
}

export function mountSiteViewerXr(app: pc.Application, head: pc.Entity, opts: {
  /** the 'XR Frame' layer id (xrFrame.layerId) */
  layerId: number;
  suspendMenu: (on: boolean) => void;
  note: (text: string | null, seconds?: number) => void;
  minimisedNote: string;
}): XrViewer {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(LW * SCALE); canvas.height = Math.round(LH * SCALE);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  const tex = makeScreenTexture(app, canvas, 'screen');
  const plane = makeScreenEntity('xr-frame-site', tex, PLANE_W, PLANE_H, true);
  const overRoom = (e: pc.Entity): void => {
    if (e.render) e.render.layers = [opts.layerId];
    const m = e.render?.material;
    if (m instanceof pc.StandardMaterial) { m.depthTest = false; m.update(); }
  };
  overRoom(plane); plane.enabled = false; app.root.addChild(plane);

  // ⚑ S371 — THE FILM'S PLANE: a child of the window, laid exactly over the film's rect (the part of it the page shows),
  //   opaque, so it is drawn BEFORE the window in the frame layer; the window leaves that rect clear (core.ts `filmLayer`).
  //   One more draw call while a film is loaded and on screen; its texture has no mip chain and is uploaded only when the
  //   film has a new picture, or the shown part changes.
  const filmCanvas = document.createElement('canvas');
  filmCanvas.width = FILM_CW; filmCanvas.height = FILM_CH;
  const fctx = filmCanvas.getContext('2d');
  const filmTex = makeScreenTexture(app, filmCanvas, 'film');
  const filmPlane = makeScreenEntity('xr-frame-site-film', filmTex, 1, 1, false);
  overRoom(filmPlane); filmPlane.enabled = false; plane.addChild(filmPlane);
  let filmKey = '', filmSerial = -1, filmUploads = 0, windowUploads = 0;
  const syncFilm = (): void => {
    const fv = core.filmView();
    const st = fv ? viewerFilm.state(fv.file) : 'idle';
    if (!fv || st === 'idle' || !fctx) { if (filmPlane.enabled) filmPlane.enabled = false; filmKey = ''; return; }
    const key = `${fv.x}|${fv.y}|${fv.w}|${fv.h}|${st}`;
    const serial = viewerFilm.serial();
    if (key !== filmKey) {
      filmPlane.setLocalPosition((fv.x + fv.w / 2) / LW - 0.5, 0.002, (fv.y + fv.h / 2) / LH - 0.5);
      filmPlane.setLocalScale(fv.w / LW, 1, fv.h / LH);
    }
    if (key !== filmKey || serial !== filmSerial) {
      core.drawFilmInto(fctx, FILM_CW, FILM_CH);
      filmTex.upload(); filmUploads++;
      filmKey = key; filmSerial = serial;
    }
    filmPlane.enabled = true;
  };

  // the small tab (minimised): "▲ Sources", on the wrist, like the menu tab
  const tabCanvas = document.createElement('canvas');
  tabCanvas.width = 256; tabCanvas.height = 64;
  const tctx = tabCanvas.getContext('2d');
  const tabTex = makeScreenTexture(app, tabCanvas);
  const tab = makeScreenEntity('xr-frame-site-tab', tabTex, TAB_W, TAB_H, true);
  overRoom(tab); tab.enabled = false; app.root.addChild(tab);
  if (tctx) {
    tctx.fillStyle = DIALOG.panel; tctx.fillRect(0, 0, 256, 64);
    tctx.fillStyle = DIALOG.light; tctx.fillRect(0, 0, 256, 4); tctx.fillRect(0, 0, 4, 64);
    tctx.fillStyle = DIALOG.darker; tctx.fillRect(0, 60, 256, 4); tctx.fillRect(252, 0, 4, 64);
    tctx.fillStyle = DIALOG.ink; tctx.font = '700 26px "Tahoma", "Verdana", sans-serif'; tctx.textBaseline = 'middle';
    tctx.fillText('▲ Sources', 24, 33);
    tabTex.upload();
  }

  let open = false, minimised = false, dirty = false, fromMenu = false;
  let startedAt = 0;
  let cursorLogical: { x: number; y: number } | null = null;
  let lastStick = 0;
  let wristed = false;
  let closedAt = 0;

  const host: ViewerHost = {
    canOpenPage: false,
    close: () => close(),
    minimise: () => minimise(),
    // a headset cannot open a page over an immersive session: the address is on the screen, and the status bar repeats it
    openUrl: (url) => core.note(`Open this address on a phone or a computer: ${url}`, 12),
    openPage: (path) => core.note(`This is the web page version of the same site: ${path.replace(/index\.html$/, '')} (open it outside the headset).`, 12),
    audio: viewerAudio,
    film: viewerFilm,
    filmLayer: true,
    changed: () => { dirty = true; }
  };
  const core = new ViewerCore(host);
  viewerAudio.setListener(() => { dirty = true; });

  const draw = (): void => {
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    core.render(ctx, LW, LH);
    tex.upload(); windowUploads++;
    dirty = false;
    filmKey = '';   // the page moved or changed: lay the film's plane again
  };

  /** where the window hangs: re-hung at each open, then it stays where it was put (a window you can walk around) */
  const place = (dist: number): void => { hangAhead(head, plane, dist, DROP); };

  function show(target: ViewerTarget): void {
    fromMenu = gameMenuBus.isOpen;
    if (fromMenu) opts.suspendMenu(true);
    core.open(target);
    open = true; minimised = false; tab.enabled = false;
    startedAt = performance.now();
    place(reducedMotion() ? DIST : FROM_DIST);
    plane.setLocalScale(PLANE_W, 1, PLANE_H);
    plane.enabled = true;
    dirty = true; draw();
  }
  function close(): void {
    if (!open && !minimised) return;
    open = false; minimised = false; plane.enabled = false; tab.enabled = false; wristed = false;
    viewerAudio.stop(); viewerFilm.stop(); filmPlane.enabled = false;
    closedAt = performance.now();
    if (fromMenu && gameMenuBus.isOpen) opts.suspendMenu(false);
    fromMenu = false;
  }
  function minimise(): void {
    open = false; minimised = true; plane.enabled = false;
    viewerFilm.pause();   // a film waits where it was while the window is a tab
    if (fromMenu && gameMenuBus.isOpen) { fromMenu = false; opts.suspendMenu(false); gameMenuBus.close(); }
    fromMenu = false;
    opts.note(opts.minimisedNote, 10);
  }
  function restore(): void {
    open = true; minimised = false; tab.enabled = false; wristed = false;
    place(DIST); plane.setLocalScale(PLANE_W, 1, PLANE_H); plane.enabled = true; startedAt = 0; dirty = true; draw();
  }

  const hitWindow = (ray: Ray): { x: number; y: number } | null => (open && plane.enabled ? rayOnPlane(plane, ray, LW, LH) : null);
  const hitTab = (ray: Ray): boolean => minimised && tab.enabled && !!rayOnPlane(tab, ray, 256, 64);

  siteViewerBus.openXr = (t) => show(t);
  siteViewerBus.closeXr = () => close();
  siteViewerBus.xrOpen = () => open;

  return {
    core,
    get isOpen(): boolean { return open; },
    get isMinimised(): boolean { return minimised; },
    open: show,
    close,
    pressRay(ray: Ray): boolean {
      if (minimised) { if (performance.now() - closedAt > 300 && hitTab(ray)) { restore(); return true; } return false; }
      if (!open) return false;
      const p = hitWindow(ray);
      if (p) { core.move(p.x, p.y); core.press(p.x, p.y); dirty = true; }
      return true;   // a miss is swallowed while the window is up: the room behind it takes no presses
    },
    touches(ray: Ray): boolean { return !!hitWindow(ray) || hitTab(ray); },
    stick(y: number): void {
      if (!open || Math.abs(y) < STICK_DEAD) return;
      const now = performance.now(), dt = lastStick ? Math.min(0.05, (now - lastStick) / 1000) : 0.016;
      lastStick = now;
      if (core.scrollBy(y * STICK_SPEED * dt)) dirty = true;
    },
    onMenuClosed(): void { if (open && fromMenu) { fromMenu = false; close(); } },
    tick(ray: Ray | null, wrist: { at: pc.Vec3; palm: pc.Vec3 | null } | null): void {
      if (!app.xr?.active) { if (open || minimised) close(); return; }
      if (core.tickToast(performance.now())) dirty = true;
      if (minimised) {
        // the tab rides the wrist like the menu's, a little above it, small and square to the eye
        if (wrist && wristWatched(head, wrist)) {
          const at = wrist.at.clone().add(new pc.Vec3(0, 0.115, 0));
          tab.setPosition(at);
          tab.lookAt(at.clone().add(at.clone().sub(head.getPosition())));
          tab.rotateLocal(90, 0, 0);
          if (!wristed) tab.setLocalScale(TAB_W * WRIST_SCALE, 1, TAB_H * WRIST_SCALE);
          tab.enabled = true; wristed = true;
        } else if (wristed) { wristed = false; tab.enabled = false; tab.setLocalScale(TAB_W, 1, TAB_H); }
        return;
      }
      if (!open) return;
      // it comes closer: from arm's length out to reading distance, in a short ease (none under reduced motion)
      if (startedAt) {
        const k = reducedMotion() ? 1 : Math.min(1, (performance.now() - startedAt) / APPROACH_MS);
        const e = 1 - (1 - k) * (1 - k) * (1 - k);
        place(FROM_DIST + (DIST - FROM_DIST) * e);
        plane.setLocalScale(PLANE_W * (0.78 + 0.22 * e), 1, PLANE_H * (0.78 + 0.22 * e));
        if (k >= 1) startedAt = 0;
      }
      const p = ray ? hitWindow(ray) : null;
      const moved = !!p !== !!cursorLogical;
      cursorLogical = p;
      const changed = p ? core.move(p.x, p.y) : core.leave();
      if (changed || moved) dirty = true;
      if (dirty) draw();
      syncFilm();
    },
    filmStats(): { windowUploads: number; filmUploads: number; filmPlane: boolean; filmTexture: [number, number]; windowTexture: [number, number] } {
      return { windowUploads, filmUploads, filmPlane: filmPlane.enabled, filmTexture: [FILM_CW, FILM_CH], windowTexture: [canvas.width, canvas.height] };
    }
  };
}
