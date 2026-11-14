#!/usr/bin/env node
/**
 * ⚑ S382 (UiB job 22 Part A, items 4–5) — RENATA'S FILM AND THE 2016 TASKBAR, PRESSED THE WAY A VISITOR PRESSES THEM.
 *
 *     node tools/s382-film-probe.mjs --port 5312 [--out out/s382-film/probe] [--mode desktop|xr|phone|all]
 *
 * Opens 2016 (`?reinterp=1&era=3&debug=1&descent=0&kiosk=0`), settles the platform on its board (setup only: the
 * consent beat is not under test), and from there presses every new or changed control at its place in the room:
 *   · desktop — a real mouse press (move, down, ~70 ms, up) at the control's projected point on the workstation plane;
 *   · xr      — an emulated immersive session (`app.xr.active`, a tracked-pointer controller); the first select
 *               calibrates the seat, then every press is the controller's ray aimed at the control and `select` fired;
 *   · phone   — an emulated touch phone (844 × 390, isMobile, hasTouch): a real touch tap at the projected point.
 * It checks: the taskbar publishes only live controls and the yellow square / circle are gone (pixels); the
 * GracePlatform button minimises the window when it is up and restores it when it is down; the title bar's minimise
 * still comes back through it; a minimised window returns by itself when the platform brings something forward and
 * after MINIMISED_RETURN_SECONDS; Start and the handset button still do what they name; Renata's job opens on her
 * film AS SENT (labelled, Play, her caption); Play plays it; correction 1 and correction 3 pressed by Apply — and
 * correction 3 makes the cut: BOTH films up, the published one pressable too; correction 7 ends the story with Vera's
 * own 2014 cut beside the films; Back opens the send page and Send works. Everything measured from the seat: each
 * control is on screen at the authored pose. Photographs at each state. Exit 1 on any failed check.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s382-film/probe'));
const MODE = flag('mode', 'all');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required'] });
const checks = [];
const check = (mode, name, ok, extra = '') => { checks.push({ mode, name, ok: !!ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'}  [${mode}] ${name}${extra ? '  ' + extra : ''}`); };
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

async function run(mode) {
  const xr = mode === 'xr', phone = mode === 'phone';
  const VW = phone ? 844 : 1280, VH = phone ? 390 : 720;
  const page = await browser.newPage();
  if (phone) await page.emulate({ userAgent: IPHONE_UA, viewport: { width: VW, height: VH, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: true } });
  else await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  let n = 0;
  const shot = async (label) => { await page.screenshot({ path: path.join(OUT, `${mode}-${String(++n).padStart(2, '0')}-${label}.png`) }); };
  await page.goto(`http://localhost:${PORT}/?reinterp=1&era=3&debug=1&descent=0&kiosk=0`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.__graceQueue?.() && window.__app && window.__camPose, { timeout: 180000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel, #motion-diagnostic { display: none !important; }' });
  await wait(4500);
  if (xr) {
    await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
    await page.evaluate(() => {
      const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
      head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
      const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
      window.__controller = src; app.xr.input.fire('add', src);
    });
    await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));   // the first select calibrates the seat
    await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
    await wait(1500);
    // the headset's ?debug=1 readout is a plate in the scene; hidden for the photographs (it is not part of the piece)
    await page.evaluate(() => { const a = window.__app; a.on('update', () => { const d = a.root.findByName('xr-debug'); if (d) d.enabled = false; }); });
  }
  // setup (not under test): the board, the shift's first conduction beats already said
  await page.evaluate(() => { const q = window.__graceQueue(); q.debugBeat('board'); q.seenTask = true; q.wotdSaid = true; q.waitSaid = true; q.lambLines = null; q.lambPriority = false; q.bump(); });
  await wait(1200);
  const q = (fn, arg) => page.evaluate(fn, arg);
  const state = () => q(() => { const g = window.__graceQueue(); return { mode: g.mode, minimised: g.minimised, page: g.veraPage, film: g.filmView, playing: g.playing, current: g.current?.()?.id ?? null, start: g.startMap.active, reading: g.mirrorReading, ids: g.rects.map((r) => r.id) }; });

  /** where a control is: its rect on the workstation canvas → the world → the screen (and the ray's target) */
  const locate = (id, nth = 0) => q(({ id, nth, VW, VH }) => {
    const g = window.__graceQueue(), app = window.__app;
    const r = g.rects.filter((k) => k.id === id)[nth]; if (!r) return null;
    const ent = app.root.findByName('era3-device-workstation'); const m = ent.getWorldTransform().data;
    const u = (r.x + r.w / 2) / 676 - 0.5, v = (r.y + r.h / 2) / 390 - 0.5;
    const w = { x: m[12] + u * m[0] + v * m[8], y: m[13] + u * m[1] + v * m[9], z: m[14] + u * m[2] + v * m[10] };
    let cam = null; app.root.forEach((e) => { if (e.camera && e.enabled) cam = e; });
    const V = app.root.getPosition().constructor;
    const p = cam.camera.worldToScreen(new V(w.x, w.y, w.z));
    const onScreen = p.z > 0 && p.x > 4 && p.y > 4 && p.x < VW - 4 && p.y < VH - 4;
    const el = onScreen ? document.elementFromPoint(p.x, p.y) : null;
    return { world: w, screen: { x: p.x, y: p.y }, onScreen, covered: el && el.tagName !== 'CANVAS' ? el.tagName + ' ' + (el.textContent || '').trim().slice(0, 30) : null, rect: { x: r.x, y: r.y, w: r.w, h: r.h } };
  }, { id, nth, VW, VH });

  /** a press as the visitor makes it; returns false (and fails a check) when the control is missing or off screen */
  const press = async (id, nth = 0, settle = 900) => {
    const at = await locate(id, nth);
    if (!at) { check(mode, `control "${id}" is published`, false); return false; }
    if (!xr && (!at.onScreen || at.covered)) { check(mode, `"${id}" is on screen from the seat`, false, JSON.stringify(at.screen) + (at.covered ? ' covered by ' + at.covered : '')); return false; }
    if (xr) {
      await page.evaluate((p) => {
        const app = window.__app, head = app.root.findByName('camera'), c = window.__xrComfort;
        const origin = head.getPosition().clone().add(head.right.clone().mulScalar(0.12)).add(head.up.clone().mulScalar(-0.25));
        const target = c.physicalPoint(origin.clone().set(p.x, p.y, p.z));
        window.__controller.getOrigin = () => origin;
        window.__controller.getDirection = () => target.clone().sub(origin).normalize();
      }, at.world);
      await wait(200);
      await page.evaluate(() => window.__app.xr.input.fire('select', window.__controller));
    } else if (phone) {
      await page.touchscreen.tap(at.screen.x, at.screen.y);
    } else {
      await page.mouse.move(at.screen.x, at.screen.y); await wait(60); await page.mouse.down(); await wait(70); await page.mouse.up();
    }
    await wait(settle);
    return true;
  };

  // ── the draw-call count from the seat (no room change in this job; canvases only) ──
  const draws = await q(async () => { const a = []; for (let i = 0; i < 20; i++) { await new Promise(requestAnimationFrame); a.push(window.__drawCalls); } return { min: Math.min(...a), max: Math.max(...a) }; });

  // ── 5 · THE TASKBAR ──
  const bar = await q(() => {
    const g = window.__graceQueue();
    const ids = [...new Set(g.rects.filter((r) => r.y + r.h / 2 > 390 - 28).map((r) => r.id))];
    const c = document.createElement('canvas'); c.width = 676; c.height = 390; const x = c.getContext('2d'); g.draw(x, 676, 390);
    const d = x.getImageData(240, 364, 47, 24).data; let amber = 0, light = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i] - 0xe0) < 24 && Math.abs(d[i + 1] - 0xa0) < 24 && Math.abs(d[i + 2] - 0x30) < 30) amber++;
      if (d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 200) light++;
    }
    return { ids, amber, light };
  });
  const LIVE = new Set(['start-menu', 'task-restore', 'lg-tray', 'mirror-restore']);
  check(mode, 'the taskbar publishes only live controls (Start, GracePlatform, Lambient, the handset)', bar.ids.every((id) => LIVE.has(id)) && bar.ids.includes('task-restore') && bar.ids.includes('start-menu'), bar.ids.join(','));
  check(mode, 'the yellow square and the circle are gone (no amber, no white disc where the launchers were)', bar.amber === 0 && bar.light === 0, `amber px ${bar.amber}, light px ${bar.light}`);
  await shot('board-taskbar');
  // Lambient's tray answers (it is a live item on the bar)
  if (bar.ids.includes('lg-tray')) {
    const before = await q(() => JSON.stringify(window.__graceQueue().lambyGuide?.view ?? null));
    await press('lg-tray');
    const after = await q(() => JSON.stringify(window.__graceQueue().lambyGuide?.view ?? null));
    check(mode, 'Lambient on the taskbar answers a press', before !== after, '');
    await q(() => { const g = window.__graceQueue(); g.lambyGuide?.press('lg-x'); g.bump(); });
    await wait(500);
  }
  // from here the guide is quieted, so no balloon sits over a control under test
  await q(() => { const g = window.__graceQueue(); g.lambyGuide = null; g.bump(); });
  await wait(500);
  // GracePlatform, pressed while the window is UP → it goes down
  await press('task-restore');
  let s = await state();
  check(mode, 'GracePlatform pressed while the window is up: the window goes down', s.minimised === true);
  await shot('minimised-by-taskbar');
  check(mode, 'minimised: the GracePlatform button is still on the bar', s.ids.includes('task-restore'));
  await press('task-restore');
  s = await state();
  check(mode, 'GracePlatform pressed while the window is down: it comes back', s.minimised === false && s.mode === 'board');
  // the title bar's minimise → back through the taskbar
  await press('win-min'); s = await state();
  const viaTitle = s.minimised;
  await press('task-restore'); s = await state();
  check(mode, "the title bar's minimise comes back through the GracePlatform button", viaTitle && !s.minimised);
  // never stranded: a beat brought forward while it is down, and the long wait
  await press('task-restore');
  const guard = await q(() => {
    const g = window.__graceQueue(); const out = { down: g.minimised };
    g.storyOffer = true; g.update(0.02); out.byBeat = !g.minimised; g.storyOffer = false; g.update(0.02);
    if (!g.minimised) g.toggleMinimised();
    for (let t = 0; t < 29; t += 0.5) g.update(0.5); out.at29 = g.minimised;
    for (let t = 0; t < 2; t += 0.5) g.update(0.5); out.at31 = !g.minimised;
    g.bump(); return out;
  });
  check(mode, 'minimised, a card the platform brings forward restores the window (simulated beat)', guard.down && guard.byBeat);
  check(mode, 'minimised and left: the window comes back by itself at 30 s (not before)', guard.at29 && guard.at31);
  await wait(600);
  // Start still opens the Start menu; the handset button still opens the handset's reading view
  await press('start-menu'); s = await state();
  check(mode, 'Start opens the Start menu', s.start === true);
  await press('start-menu'); await wait(300);
  await q(() => { const g = window.__graceQueue(); g.startMap.close(); g.bump(); }); await wait(400);
  await press('mirror-restore'); s = await state();
  check(mode, "the handset's taskbar button opens the Handset Window's reading view", s.reading === true);
  await q(() => { const g = window.__graceQueue(); g.mirrorReading = false; g.bump(); }); await wait(500);

  // ── 4 · RENATA'S FILM ──
  await press('task-0'); s = await state();
  check(mode, '"Correct a testimony" opens Renata on her film AS SENT', s.mode === 'list' && s.film === 'sent', `film ${s.film}`);
  const film = await locate('video', 0), playBtn = await locate('video', 1);
  check(mode, 'her film and its Play are published and on screen from the seat', !!film && !!playBtn && (xr || (film.onScreen && playBtn.onScreen)), film ? `film ${film.rect.w}×${film.rect.h} at ${Math.round(film.screen.x)},${Math.round(film.screen.y)}` : '');
  await shot('renata-as-sent');
  await press('video', 1); s = await state();
  check(mode, 'Play plays her film', s.playing === true);
  await wait(1500); await shot('renata-playing');
  await press('video', 0); s = await state();
  check(mode, 'pressing the film stops it', s.playing === false);
  await press('apply'); s = await state();
  check(mode, 'Apply — correction 1 ("Soften the term"): the film is still as she sent it', s.current === 3 && s.film === 'sent');
  await press('apply'); s = await state();
  check(mode, 'Apply — correction 3 ("Name the dependency, not the person") MAKES THE CUT: both films are up', s.current === 7 && s.film === 'compare', `film ${s.film}`);
  const two = await q(() => window.__graceQueue().rects.filter((r) => r.id === 'video').map((r) => ({ x: r.x, y: r.y, w: r.w, h: r.h })));
  check(mode, 'two films, the same size, one above the other (as sent, as published)', two.length === 2 && two[0].w === two[1].w && two[0].h === two[1].h && two[1].y > two[0].y, JSON.stringify(two));
  const pub = await locate('video', 1);
  check(mode, 'the published film is on screen from the seat', !!pub && (xr || pub.onScreen), pub ? `${Math.round(pub.screen.x)},${Math.round(pub.screen.y)}` : '');
  await shot('renata-the-cut');
  await press('video', 1); s = await state();
  check(mode, "pressing the platform's version plays both", s.playing === true);
  await wait(1200); await shot('renata-the-cut-playing');
  await press('video', 1);
  await press('apply'); s = await state();
  check(mode, "Apply — correction 7: the story is done, both films stay and Vera's own 2014 cut is beside them", s.film === 'compare+own' && s.current === null, `film ${s.film}`);
  await shot('renata-done');
  await press('board-back', 0, 1500); s = await state();
  check(mode, 'Back to Today opens the send page (the platform\'s version, four places)', s.page === 'send');
  await shot('send');
  await press('vera-send'); s = await state();
  check(mode, 'Send to all four works', s.ids.includes('vera-send-close'));
  await press('vera-send-close'); s = await state();
  check(mode, 'and the day goes on', s.page === null && (s.mode === 'board' || s.mode === 'done'));
  check(mode, 'no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.close();
  return { mode, draws };
}

const modes = MODE === 'all' ? ['desktop', 'xr', 'phone'] : [MODE];
const results = [];
try { for (const m of modes) results.push(await run(m)); } finally { await browser.close(); }
const failed = checks.filter((c) => !c.ok);
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ results, checks }, null, 1));
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed; draw calls at the board: ${results.map((r) => `${r.mode} ${r.draws.min}–${r.draws.max}`).join(', ')}`);
process.exit(failed.length ? 1 : 0);
