#!/usr/bin/env node
/**
 * ⚑ S382 (UiB job 22 Part A, items 4–6) — REVIEW PHOTOGRAPHS of Renata's film and the 2016 taskbar, the same framing
 * before and after the change, on both screens.
 *
 *     node tools/s382-film-photos.mjs --port 5312 --out out/s382-film/before [--mode desktop|xr|both]
 *
 * Review-only: the states are reached by the platform's own debug beats and its own controls pressed by id (the
 * visitor's presses are proved by tools/s382-film-probe.mjs, not here). For every state it writes:
 *   · <mode>-<state>.png        — the screen from the seat (the computer at 1280×720 @2x; the emulated headset)
 *   · <mode>-<state>-close.png  — a step closer (computer only), the reviewer's lean
 *   · canvas-<state>.png        — the workstation canvas itself at 2×, the platform as drawn
 *   · canvas-taskbar-*.png      — the taskbar strip at 3×
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s382-film/photos'));
const MODES = flag('mode', 'both') === 'both' ? ['desktop', 'xr'] : [flag('mode', 'desktop')];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 2 } });

/** the states, in the order the day reaches them; each is a function run in the page on the live queue */
const STATES = [
  ['board', `q.debugBeat('board');`],
  ['renata-open', `q.debugBeat('list');`],
  ['renata-playing', `q.playT = 18; q.bump();`],
  ['renata-c1', `q.playT = 0; q.debugBeat('apply');`],
  ['renata-c3', `q.debugBeat('apply');`],
  ['renata-done', `q.debugBeat('apply');`],
  ['send', `press('board-back');`],
  ['sent', `press('vera-send');`],
  ['board-after', `press('vera-send-close');`],
  ['minimised', `if (!press('task-restore') || !q.minimised) { q.minimised = true; q.bump(); }`]
];

async function run(mode) {
  const xr = mode === 'xr';
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
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
  // quiet the guide for like-for-like framing (both runs); nothing else is changed
  await page.evaluate(() => { const q = window.__graceQueue(); q.lambyGuide = null; q.seenTask = true; q.wotdSaid = true; q.waitSaid = true; });
  const seat = await page.evaluate(() => window.__camPose());
  const log = [];
  for (const [name, js] of STATES) {
    const info = await page.evaluate((js) => {
      const q = window.__graceQueue();
      const press = (id) => { const r = q.rects.find((rr) => rr.id === id); if (!r) return false; q.handleClick(r.x + r.w / 2, r.y + r.h / 2); return true; };
      // eslint-disable-next-line no-new-func
      new Function('q', 'press', js)(q, press);
      q.lambyGuide = null; q.lambLines = null; q.lambPriority = false; q.startPanel?.close?.(); q.bump();
      return { mode: q.mode, page: q.veraPage, sub: q.submission?.()?.author, current: q.current?.()?.id, minimised: q.minimised, ids: q.rects.map((r) => r.id).join(',') };
    }, js);
    await wait(name === 'renata-playing' ? 300 : 900);
    // the canvas as drawn (2×), and the taskbar strip (3×)
    const snap = await page.evaluate(() => {
      const q = window.__graceQueue(); const W = 676, H = 390;
      const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2; const x = c.getContext('2d'); x.scale(2, 2);
      q.draw(x, W, H);
      const t = document.createElement('canvas'); t.width = 676 * 3; t.height = 30 * 3; const tx = t.getContext('2d');
      tx.imageSmoothingEnabled = false; tx.drawImage(c, 0, (H - 30) * 2, W * 2, 60, 0, 0, t.width, t.height);
      return { full: c.toDataURL(), bar: t.toDataURL() };
    });
    if (!xr) {
      fs.writeFileSync(path.join(OUT, `canvas-${name}.png`), Buffer.from(snap.full.split(',')[1], 'base64'));
      fs.writeFileSync(path.join(OUT, `canvas-taskbar-${name}.png`), Buffer.from(snap.bar.split(',')[1], 'base64'));
    }
    await page.screenshot({ path: path.join(OUT, `${mode}-${name}.png`) });
    if (!xr) {
      // a step closer, toward the workstation, the reviewer's lean
      await page.evaluate((s) => {
        const a = window.__app, c = a.root.findByName('camera'), e = a.root.findByName('era3-device-workstation');
        const p = c.getPosition(), t = e.getPosition();
        const k = 0.45, x = p.x + (t.x - p.x) * k, y = p.y + (t.y - p.y) * k, z = p.z + (t.z - p.z) * k;
        window.__camFree(x, y, z, s.pitch + (s.lookPitch || 0), s.yaw + (s.lookYaw || 0));
      }, seat);
      await wait(800);
      await page.screenshot({ path: path.join(OUT, `${mode}-${name}-close.png`) });
      await page.evaluate((s) => window.__camFree(s.x ?? s.pos?.[0], s.y ?? s.pos?.[1], s.z ?? s.pos?.[2], s.pitch, s.yaw), seat).catch(() => {});
      await wait(600);
    } else {
      // the headset's lean: the same head pose through a narrower lens (aimed at the screen), for the detail
      await page.evaluate(() => {
        const a = window.__app, h = a.root.findByName('camera'), e = a.root.findByName('era3-device-workstation');
        window.__lean = { fov: h.camera.fov, rot: h.getLocalRotation().clone() };
        const c = window.__xrComfort; h.lookAt(c?.physicalPoint ? c.physicalPoint(e.getPosition().clone()) : e.getPosition()); h.camera.fov = 34;
      });
      await wait(700);
      await page.screenshot({ path: path.join(OUT, `${mode}-${name}-close.png`) });
      await page.evaluate(() => { const h = window.__app.root.findByName('camera'); h.camera.fov = window.__lean.fov; h.setLocalRotation(window.__lean.rot); });
      await wait(400);
    }
    log.push(`${mode} ${name}: ${JSON.stringify(info).slice(0, 400)}`);
    console.log(log[log.length - 1]);
  }
  fs.writeFileSync(path.join(OUT, `${mode}-log.txt`), log.join('\n') + '\n' + JSON.stringify({ seat, errors }, null, 1) + '\n');
  if (errors.length) console.log('PAGE ERRORS', errors);
  await page.close();
}
try { for (const m of MODES) await run(m); } finally { await browser.close(); }
