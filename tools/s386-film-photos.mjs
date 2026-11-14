#!/usr/bin/env node
/**
 * ⚑ S386 (UiB job 24 Part A2) — REVIEW PHOTOGRAPHS of Renata's film made new: the same framings as
 * tools/s382-film-photos.mjs (so the before/after pairs are like for like), every cut caught as it is made, and the
 * film's own frames for the photo page.
 *
 *     node tools/s386-film-photos.mjs --port 5341 --out out/s386/after/film [--mode desktop|xr|both]
 *
 * Review-only: states are reached by the platform's own debug beats and by setting the cut clock (`cutT`) to a moment
 * inside a cut; the visitor's presses are proved by tools/s386-film-probe.mjs, not here. For every state it writes:
 *   · <mode>-<state>.png        — the screen from the seat (the computer at 1280×720 @2x; the emulated headset)
 *   · <mode>-<state>-close.png  — a step closer (computer), or the same head through a narrower lens (headset)
 *   · canvas-<state>.png        — the workstation canvas itself at 2×
 * and frames/<n>-<label>.png — the film's own rectangle off the canvas at 3×: the sent film at seven moments (her words
 * burned in) and the published one at four.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s386/after/film'));
const MODES = flag('mode', 'both') === 'both' ? ['desktop', 'xr'] : [flag('mode', 'desktop')];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 2 } });

/** the states, in the order the day reaches them; each is run in the page on the live queue (`next()` finishes the cut
 *  being made and starts the next one; `at(k)` holds the one being made at that moment) */
const STATES = [
  ['board', `q.debugBeat('board');`],
  ['renata-open', `q.debugBeat('list'); q.playT = 6; q.playing = false;`],
  ['renata-c1-selected', `q.apply(); q.cutT = 0.5;`],
  ['renata-c1', `q.cutT = 2.1;`],
  ['renata-c1-made', `q.cutT = 99; q.update(0.001); q.playT = 2; q.playing = false;`],
  ['renata-c3-hand-selected', `q.apply(); q.cutT = 0.5;`],
  ['renata-c3-hand-leaving', `q.cutT = 1.45;`],
  ['renata-c3-crop', `q.cutT = 2.3;`],
  ['renata-c3-hand-cut', `q.cutT = 2.8;`],
  ['renata-c3-cup', `q.cutT = 99; q.update(0.001); q.cutT = 1.15;`],
  ['renata-c3-cup-cut', `q.cutT = 1.8;`],
  ['renata-c3-photo', `q.cutT = 99; q.update(0.001); q.cutT = 1.1;`],
  ['renata-c3-photo-cut', `q.cutT = 1.9;`],
  ['renata-c3-minute-selected', `q.cutT = 99; q.update(0.001); q.cutT = 0.6;`],
  ['renata-c3-minute-approach', `q.cutT = 1.5;`],
  ['renata-c3-minute-jumped', `q.cutT = 2.6;`],
  ['renata-c3-minute-closing', `q.cutT = 3.3;`],
  ['renata-c3', `q.cutT = 99; q.update(0.001); q.playT = 6; q.playing = false;`],
  ['renata-published', `q.apply(); q.playT = 4; q.playing = false;`],
  ['renata-vera-2014', `press('board-back');`],
  ['send', `press('board-back');`],
  ['sent', `press('vera-send');`],
  ['board-after', `press('vera-send-close');`]
];
/** the film's own frames for the photo page: [label, setup] — the sent film first, then the published */
const FRAMES = [
  ['sent-0m01', 0.8], ['sent-0m03', 3.4], ['sent-0m07', 7.2], ['sent-0m14', 14.2], ['sent-0m20-laugh', 20.4], ['sent-0m27', 27.1], ['sent-0m35', 35.5]
];
const PUB_FRAMES = [['published-0m02', 2.2], ['published-0m09', 9.3], ['published-0m13', 13.4], ['published-0m18', 18.6]];

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
  // a moment inside a cut is held for its photograph: the cut clock is pinned to what the state set, every frame
  await page.evaluate(() => { const a = window.__app, q = window.__graceQueue(); a.on('update', () => { if (window.__pinCut != null && q.cutQueue.length) q.cutT = window.__pinCut; }); });
  const log = [];
  for (const [name, js] of STATES) {
    const info = await page.evaluate((js) => {
      const q = window.__graceQueue();
      const press = (id) => { const r = q.rects.find((rr) => rr.id === id); if (!r) return false; q.handleClick(r.x + r.w / 2, r.y + r.h / 2); return true; };
      // eslint-disable-next-line no-new-func
      window.__pinCut = null;
      new Function('q', 'press', js)(q, press);
      if (q.cutQueue.length) window.__pinCut = q.cutT;
      q.lambyGuide = null; q.lambLines = null; q.lambPriority = false; q.startPanel?.close?.(); q.bump();
      const f = q.filmState; return { mode: q.mode, page: q.veraPage, current: q.current?.()?.id, film: f ? { view: f.view, cutting: f.cutting, sentT: f.sentT, seconds: f.seconds, subtitle: f.subtitle } : null, ids: q.rects.map((r) => r.id).join(',') };
    }, js);
    await wait(name.startsWith('renata-c') ? 250 : 900);
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
  if (!xr) {
    // the film's own frames: a fresh shift, the job open, the playhead set; then the same after every cut, published
    fs.mkdirSync(path.join(OUT, 'frames'), { recursive: true });
    const grab = async (label, js) => {
      const url = await page.evaluate((js) => {
        const q = window.__graceQueue(); window.__pinCut = null;
        new Function('q', js)(q); q.lambyGuide = null; q.lambLines = null; q.bump();
        const c = document.createElement('canvas'); c.width = 676 * 3; c.height = 390 * 3; const x = c.getContext('2d'); x.scale(3, 3); q.draw(x, 676, 390);
        const r = q.filmState.rect, o = document.createElement('canvas'); o.width = r.w * 3; o.height = (r.h + 4 + 18) * 3;
        o.getContext('2d').drawImage(c, r.x * 3, r.y * 3, r.w * 3, (r.h + 4 + 18) * 3, 0, 0, o.width, o.height);
        return o.toDataURL('image/png');
      }, js);
      fs.writeFileSync(path.join(OUT, 'frames', `${label}.png`), Buffer.from(url.split(',')[1], 'base64'));
    };
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.__graceQueue?.() && window.__app, { timeout: 180000 });
    await wait(4000);
    await page.evaluate(() => { const q = window.__graceQueue(); q.debugBeat('board'); q.seenTask = true; q.lambyGuide = null; q.debugBeat('list'); q.playing = false; });
    let k = 0;
    for (const [label, t] of FRAMES) await grab(`${String(++k).padStart(2, '0')}-${label}`, `q.playT = ${t}; q.playing = false;`);
    await grab(`${String(++k).padStart(2, '0')}-published-all-cuts`, `q.apply(); q.apply(); q.apply(); q.playing = false; q.playT = 0;`);
    for (const [label, t] of PUB_FRAMES) await grab(`${String(++k).padStart(2, '0')}-${label}`, `q.playT = ${t}; q.playing = false;`);
    console.log('frames written');
  }
  if (errors.length) console.log('PAGE ERRORS', errors);
  await page.close();
}
try { for (const m of MODES) await run(m); } finally { await browser.close(); }
