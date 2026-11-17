/**
 * ⚑ S400 — FLOPPYSHEEP (2016) on the 2016 era website (public/sites/2016/game.js, built by tools/build-site-games.mjs).
 * Until today the game was not on the 2016 site at all; only its song was (the Media tab).
 *
 * The game is the room's own class (src/desktop/apps/floppysheep.ts), unchanged: the same `FloppySheep` Vera's phone
 * holds, drawn here on a canvas the shape of her phone's glass (1:2, so its world is the same 300 × 600). Unlike the
 * three DeviceGames it draws with the whole Canvas 2D (curves, its platform's type), so its canvas is the glass's real
 * size × the screen's pixel ratio, and it is redrawn whenever its own `version` moves (30 a second while it runs, as on
 * the phone). Its type is the 2016 platform face, Roboto, the project's own copy (assets/fonts/), declared by the page;
 * nothing draws until it has loaded (or after a short wait, the fallback face).
 *
 * Its Back arrow returns to the phone's home screen: one icon, the game's own (drawFloppyIcon). A tap on it opens the
 * game again. Its song is the site's own file (playOnce → assets/audio/floppysheep_song.mp3, after a press).
 */
import { FloppySheep, drawFloppyIcon, FLOPPY_LABEL } from '../desktop/apps/floppysheep';
import { ERA3, FLOPPY } from '../desktop/theme/era3';
import { sansFor } from '../desktop/theme/fonts';
import { findMount, runClock, wireInput } from './shell';

const m = findMount('floppysheep');
if (m) {
  const { glass } = m;
  const game = new FloppySheep();
  game.openGame();
  const ctx = glass.getContext('2d');
  /** the home screen's one icon, in the canvas's own pixels (set on each draw) */
  let icon = { x: 0, y: 0, s: 0 };
  let shown = -1, sized = '';
  let ready = false;

  const size = (): boolean => {
    const r = glass.getBoundingClientRect();
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = Math.max(150, Math.round(r.width * dpr)), h = w * 2;
    const key = `${w}x${h}`;
    if (key === sized) return false;
    sized = key; glass.width = w; glass.height = h;
    return true;
  };

  const home = (c: CanvasRenderingContext2D, W: number, H: number): void => {
    const k = W / 300;
    c.fillStyle = ERA3.ink; c.fillRect(0, 0, W, H);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, FLOPPY.sky); g.addColorStop(1, FLOPPY.skyLow);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const s = Math.round(84 * k), x = Math.round((W - s) / 2), y = Math.round(H * 0.36);
    icon = { x, y, s };
    c.save();
    const r = Math.round(s * 0.24);
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + s, y, x + s, y + s, r); c.arcTo(x + s, y + s, x, y + s, r);
    c.arcTo(x, y + s, x, y, r); c.arcTo(x, y, x + s, y, r); c.closePath(); c.clip();
    drawFloppyIcon(c, x, y, s);
    c.restore();
    c.font = `600 ${Math.round(15 * k)}px ${sansFor('e3')}`;
    c.fillStyle = ERA3.ink; c.textAlign = 'center'; c.textBaseline = 'top';
    c.fillText(FLOPPY_LABEL, W / 2, y + s + Math.round(10 * k));
    c.textAlign = 'start'; c.textBaseline = 'alphabetic';
  };

  const draw = (force = false): void => {
    if (!ctx || !ready) return;
    const resized = size();
    const v = game.open ? game.version : -2;
    if (!force && !resized && v === shown) return;
    shown = v;
    if (game.open) game.draw(ctx, glass.width, glass.height);
    else home(ctx, glass.width, glass.height);
  };

  wireInput(m, {
    tap: (x, y) => {
      if (game.open) { game.tap(x, y); draw(); return; }
      if (x >= icon.x && x < icon.x + icon.s && y >= icon.y && y < icon.y + icon.s + glass.width * 0.1) { game.openGame(); draw(true); }
    },
    // the phone has no keys; on a page the keyboard's A (Space, Z) is a tap on the glass, so a laptop can play too
    key: (k) => { if (game.open && (k === 'a' || k === 'b' || k === 'up')) { game.tap(glass.width / 2, glass.height / 2); draw(); } }
  });

  // the phone's own button: home, as the Back arrow is (the song stops with the game)
  m.root.querySelector<HTMLButtonElement>('button[data-home]')?.addEventListener('click', () => { if (game.open) { game.closeGame(); draw(true); } });

  const fonts = document.fonts;
  const face = sansFor('e3');
  const wait = fonts?.load ? Promise.all([fonts.load(`400 12px ${face}`), fonts.load(`700 12px ${face}`)]).then(() => undefined) : Promise.resolve();
  void Promise.race([wait.catch(() => undefined), new Promise<void>((r) => setTimeout(r, 2500))]).then(() => {
    ready = true;
    draw(true);
    runClock(glass, (dt) => { game.update(dt); draw(); });
    m.root.classList.add('live');
  });
  window.addEventListener('resize', () => draw(true));
}
