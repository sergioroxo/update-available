#!/usr/bin/env node
/**
 * ⚑ S403 (UiB job 30 Part B) — REVIEW PHOTOGRAPHS of 2016's second pass, before and after, from the seat:
 * the board, "Answer the mothers" (was "Return the family calls"), the end of Renata's editor and its send (was the
 * "Ready to share" page), and "Take my story down". The same framings as tools/s386-film-photos.mjs (the computer at
 * 1280×720 @2x from the seat and a step closer; the emulated headset and the same head through a narrower lens), so a
 * before/after pair is like for like.
 *
 *     node tools/s403-2016-stills.mjs --port 5482 --out out/s403/after [--mode desktop|xr|both]
 *
 * It runs against either build (the job 29 B one has no editor send, three mothers and a fourth reply; it takes what
 * the build has): each state presses the build's own hit rects where a press exists, and sets the platform's state
 * directly only to open a page (Review-only; the visitor's path is proved by tools/walk.mjs). For every state:
 *   · <mode>-<state>.png, <mode>-<state>-close.png — from the seat, and closer
 *   · canvas-<state>.png — the workstation canvas itself at 2×
 * and states.txt — what each state held (mode, page, the live ids).
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s403/after'));
const MODES = flag('mode', 'both') === 'both' ? ['desktop', 'xr'] : [flag('mode', 'desktop')];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 2 } });

/** each state's setup runs in the page with `q` (the live queue) and `press(id)` (a click at the centre of a live rect) */
const STATES = [
  ['board', `q.debugBeat('board'); q.mode = 'board'; q.veraPage = null; q.openSurface = null;`],
  // the family job, opened on its first message (before: Ruth; after: Maureen)
  ['mothers-open', `q.mode = 'list'; q.veraPage = null; q.openSurface = q.surfaces.get('family');`],
  // the last mother (Annette), the one no template answers
  ['mothers-annette', `const ids = q.rects.map((r) => r.id).filter((id) => id.startsWith('family-sel-')).sort(); press(ids[ids.length - 1]);`],
  // Renata's editor: her three rules applied, the cuts made, the published version on screen
  ['editor-done', `q.openSurface = null; q.mode = 'board'; q.debugBeat('list'); q.apply(); q.apply(); q.apply(); q.snapCuts(); q.playT = 4; q.playing = false;`],
  // her own 2014 cut, the editor's last screen (the film has ended)
  ['editor-own', `q.ownCutShown = true; q.playing = false;`],
  // the send offered: after, the editor's own "Send to all four" (already on editor-own); before, Back to today opens
  //   the "Ready to share" page (One story, four places)
  ['send-offered', `if (!q.rects.some((r) => r.id === 'vera-send')) { press('board-back'); q.update(0.05); }`],
  // Send to all four, pressed: the receipt (after: in the editor, on her own cut; before: on the page)
  ['sent', `press('vera-send');`],
  // the receipt on the published version (after only; before, the page is still up and this repeats it)
  ['sent-published', `if (q.mode === 'list') { q.ownCutShown = false; q.playT = 4; q.playing = false; }`],
  // "Take my story down": the kit, then its four, two and one copies
  ['takedown', `q.openSurface = null; q.mode = 'board'; q.veraPage = 'kit'; q.kitApproved = false; q.takenDown = true;`],
  // every mother answered (last: it finishes a job; a review state, the job's own debug beat sends the first reply to each)
  ['mothers-done', `q.takenDown = false; q.veraPage = null; q.storyDone = false; q.mode = 'list'; q.openSurface = q.surfaces.get('family'); q.openSurface.debugBeat('done');`]
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
    await page.evaluate(() => { const a = window.__app; a.on('update', () => { const d = a.root.findByName('xr-debug'); if (d) d.enabled = false; }); });
  }
  // quiet the guide for like-for-like framing (both builds); nothing else is changed
  await page.evaluate(() => { const q = window.__graceQueue(); q.lambyGuide = null; q.seenTask = true; q.wotdSaid = true; q.waitSaid = true; });
  const seat = await page.evaluate(() => window.__camPose());
  const log = [];
  for (const [name, js] of STATES) {
    const info = await page.evaluate((js) => {
      const q = window.__graceQueue();
      // the rects of the last frame drawn: draw once so a press aims at what is on the screen now
      const W = 676, H = 390, c0 = document.createElement('canvas'); c0.width = W; c0.height = H;
      const redraw = () => q.draw(c0.getContext('2d'), W, H);
      const press = (id) => { redraw(); const r = q.rects.find((rr) => rr.id === id); if (!r) return false; q.handleClick(r.x + r.w / 2, r.y + r.h / 2); redraw(); return true; };
      redraw();
      // eslint-disable-next-line no-new-func
      new Function('q', 'press', js)(q, press);
      q.lambyGuide = null; q.lambLines = null; q.lambPriority = false; q.startPanel?.close?.(); q.bump(); redraw();
      return { mode: q.mode, page: q.veraPage, surface: q.openSurface?.id ?? null, storyDone: q.storyDone, own: q.ownCutShown, ids: q.rects.map((r) => r.id).filter((id) => !/^(start-menu|win-min|task-restore|record-chip|mirror)/.test(id)).join(',') };
    }, js);
    await wait(900);
    const snap = await page.evaluate(() => {
      const q = window.__graceQueue(); const W = 676, H = 390;
      const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2; const x = c.getContext('2d'); x.scale(2, 2);
      q.draw(x, W, H);
      return c.toDataURL();
    });
    if (!xr) fs.writeFileSync(path.join(OUT, `canvas-${name}.png`), Buffer.from(snap.split(',')[1], 'base64'));
    await page.screenshot({ path: path.join(OUT, `${mode}-${name}.png`) });
    if (!xr) {
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
    log.push(`${mode} ${name}: ${JSON.stringify(info)}`);
    console.log(log[log.length - 1].slice(0, 300));
  }
  fs.writeFileSync(path.join(OUT, `${mode}-states.txt`), log.join('\n') + '\n' + JSON.stringify({ seat, errors }, null, 1) + '\n');
  if (errors.length) console.log('PAGE ERRORS', errors);
  await page.close();
}
try { for (const m of MODES) await run(m); } finally { await browser.close(); }
