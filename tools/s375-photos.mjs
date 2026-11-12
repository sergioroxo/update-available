#!/usr/bin/env node
/**
 * S375 (UiB job 19 Part A) — THE SWEEP. Every surface in tools/harness/s375-surfaces.mjs, from the seat, 2560 × 1440,
 * in the browser (drag-to-look) or through the emulated headset (tools/harness/xr-mock.mjs). Photography only: it changes
 * nothing the player sees and judges nothing.
 *
 *     node tools/s375-photos.mjs --port 5296 --mode browser [--eras 1,2,3,4,close] [--only e3-] [--out out/s375]
 *     node tools/s375-photos.mjs --port 5296 --mode xr
 *
 * Per era page it takes: the room's five views (front / left / back / right / desk, from the seat), then each surface by
 * its REVIEW ROUTE (a debug beat or a state set on the live object; never a reachability claim: tools/s375-index.mjs
 * decides `walk` vs `review-route` from what the walk drew). In the browser pass it also saves the clean canvas of each
 * screen (the sharp 2D art, no room around it) and runs the flow sampler to record which texts each surface drew.
 * The Close is a timed run from __enterClose().
 *
 * Out: <out>/<mode>/sweep/<id>.png (+ <id>.canvas-<name>.png), sweep.json, flow/samples.jsonl (browser).
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { SURFACES, SEAT, SEAT_YAW, ROOM_VIEWS } from './harness/s375-surfaces.mjs';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const MODE = flag('mode', 'browser'); const XR = MODE === 'xr';
const ERAS = flag('eras', '1,2,3,4,close').split(',');
const ONLY = flag('only', '');
const OUT = path.resolve(flag('out', 'out/s375'), MODE, 'sweep');
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const HIDE = 'body > *:not(canvas) { visibility:hidden !important; }';
const sheetPath = path.join(OUT, 'sweep.json');
const sheet = fs.existsSync(sheetPath) ? JSON.parse(fs.readFileSync(sheetPath, 'utf8')) : {};
const save = () => fs.writeFileSync(sheetPath, JSON.stringify(sheet, null, 1));

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, protocolTimeout: 300000,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox', '--disable-background-networking'],
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 2 }
});

async function openEra(n, tag = 0) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  let flow = null;
  if (!XR) { const { installFlowSampler } = await import('./harness/flow-sampler.mjs'); fs.mkdirSync(path.join(OUT, 'flow'), { recursive: true }); flow = await installFlowSampler(page, { dir: path.join(OUT, 'flow', `e${n}${ONLY ? '-' + ONLY : ''}${tag ? '-r' + tag : ''}`) }); }
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=${n}&debug=1&descent=0&home=0`, { waitUntil: 'load', timeout: 240000 });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => /Log in/i.test(b.textContent || '') && !b.disabled) || (window.__os && window.__camFree), { timeout: 180000 });
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Log in/i.test(x.textContent || '')); b?.click(); });
  await page.waitForFunction(() => window.__os && window.__camFree && window.__poses && window.__app, { timeout: 180000 });
  await wait(9000);
  await page.addStyleTag({ content: HIDE });
  if (XR) { const { installXrMock } = await import('./harness/xr-mock.mjs'); await installXrMock(page, n); }
  return { page, errors, flow };
}

const cam = (page, p) => page.evaluate((a) => window.__camFree(...a), p);

/** look at a named entity from the seat (browser: step in to `d` m and aim; headset: turn the head from the seat) */
async function aimAt(page, e, name, d = 0.6) {
  const ok = await page.evaluate((a) => {
    const [seat, name, d, xr] = a;
    let ent = null;
    const walk = (e) => { if (ent || !e.enabled) return; if ((e.name || '') === name || (e.name || '') === 'era3-device-' + name) { ent = e; return; } e.children.forEach(walk); };
    walk(window.__app.root);
    if (!ent) return false;
    const t = ent.getPosition();
    const eye = { x: seat[0], y: seat[1] + 0.05, z: seat[2] };
    let dx = t.x - eye.x, dy = t.y - eye.y, dz = t.z - eye.z;
    const len = Math.hypot(dx, dy, dz);
    const pos = xr ? eye : { x: t.x - dx / len * d, y: t.y - dy / len * d, z: t.z - dz / len * d };
    dx = t.x - pos.x; dy = t.y - pos.y; dz = t.z - pos.z;
    window.__camFree(pos.x, pos.y, pos.z, Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI, Math.atan2(-dx, -dz) * 180 / Math.PI);
    return true;
  }, [SEAT[e], name, d, XR]);
  return ok;
}

async function canvases(page, names) {
  return page.evaluate((names) => {
    const all = window.__era3Devices ? window.__era3Devices() : {};
    const out = {};
    for (const n of names) {
      const c = n === 'os' ? window.__os.canvas : all[n];
      if (!c || !c.width) continue;
      const ctx = c.getContext('2d'); if (!ctx) continue;
      let flat = true;
      try { const w = Math.min(c.width, 64), h = Math.min(c.height, 36), d = ctx.getImageData(0, 0, c.width, c.height);
        const first = [d.data[0], d.data[1], d.data[2]];
        for (let y = 0; y < c.height && flat; y += Math.max(1, (c.height / h) | 0)) for (let x = 0; x < c.width; x += Math.max(1, (c.width / w) | 0)) { const i = (y * c.width + x) * 4; if (d.data[i] !== first[0] || d.data[i + 1] !== first[1] || d.data[i + 2] !== first[2]) { flat = false; break; } } } catch { flat = false; }
      if (flat) continue;
      out[n] = c.toDataURL('image/png');
    }
    return out;
  }, names);
}

async function step(page, e, st) {
  if (st.jump) await page.evaluate((b) => window.__os.debugJump(b), st.jump);
  else if (st.q) await page.evaluate((b) => window.__graceQueue().debugBeat(b), st.q);
  else if (st.eval) {
    let code = st.eval;
    // the mock headset has no hand to grip a device: take it as the flat screen does (the device is brought to the eye), then
    // hand the headset flag back, so the photograph is the device held up in front of the head
    if (XR && code.includes('heldDevices.take')) code = `const __a = window.__app, __d = Object.getOwnPropertyDescriptor(__a.xr, 'active'); Object.defineProperty(__a.xr, 'active', { configurable: true, get: () => false }); try { ${code} } finally { Object.defineProperty(__a.xr, 'active', __d); }`;
    await page.evaluate((c) => (0, eval)('(async()=>{' + c + '})()'), code);
  }
  else if (st.cam) await cam(page, st.cam);
  else if (st.wait) { await wait(st.wait); return; }
  await wait(300);
}

async function releaseDevice(page, era) {
  await page.evaluate((era) => {
    const app = window.__app, was = Object.getOwnPropertyDescriptor(app.xr, 'active');
    if (window.__xrMock) Object.defineProperty(app.xr, 'active', { configurable: true, get: () => false });
    try { window.__heldDevices.release(era); } catch (e) { /* none */ }
    if (window.__xrMock && was) Object.defineProperty(app.xr, 'active', was);
  }, era);
}

async function surfaceShot(ctxo, s, suffix = '', label = null) {
  const { page, flow } = ctxo;
  const id = s.id + suffix;
  const file = `${id}.png`;
  await page.screenshot({ path: path.join(OUT, file) });
  const rec = { id: s.id, e: s.e, era: s.era, what: s.what, where: s.where, mode: MODE, file, retired: !!s.retired, label };
  if (!XR && s.canv?.length) {
    const cv = await canvases(page, s.canv);
    rec.canvases = {};
    for (const [n, url] of Object.entries(cv)) { const f = `${id}.canvas-${n}.png`; fs.writeFileSync(path.join(OUT, f), Buffer.from(url.split(',')[1], 'base64')); rec.canvases[n] = f; }
  }
  if (flow) { await flow.flush(); flow.note('surface', { target: id, era: `e${s.e}` }); }
  sheet[id] = rec; save();
  console.log(`${id}  ${s.what}${rec.canvases ? '  [' + Object.keys(rec.canvases).join(',') + ']' : ''}`);
}

let reopen = 0;
async function runEra(n) {
  let ctxo = await openEra(n);
  let { page, errors, flow } = ctxo;
  const mine = SURFACES.filter((s) => s.e === n && (!ONLY || s.id.startsWith(ONLY)));
  // the room's five views, at a representative settled state of the era
  const baseline = { 1: ['jump', 'desktop'], 2: ['jump', 'e2Restorify'], 3: ['q', 'board'], 4: ['jump', 'e4Browser'] }[n];
  if (!ONLY || 'room'.startsWith(ONLY) || `e${n}-room`.startsWith(ONLY)) {
    await step(page, n, { [baseline[0]]: baseline[1] }); await wait(4500);
    const seat = SEAT[n], yaw0 = SEAT_YAW[n];
    for (const [name, dyaw, pitch] of ROOM_VIEWS) {
      await cam(page, [seat[0], seat[1], seat[2], pitch === 0 ? seat[3] : pitch, yaw0 + dyaw]); await wait(1100);
      await surfaceShot(ctxo, { id: `e${n}-room-${name}`, e: n, era: ['', '1997', '2003', '2016', '2026'][n], what: `The room from the seat, looking ${name}`, where: 'the player turns to look', canv: [] });
    }
  }
  for (const s of mine) {
    try {
      if (s.fresh) {   // a page of its own: some beats leave the platform in a stage that covers the next beat's screen
        if (flow) await flow.close();
        await page.close();
        ctxo = await openEra(n, ++reopen); ({ page, errors, flow } = ctxo);
      }
      if (XR && s.restProp) {   // the mock headset has no hand to grip a device: photograph it at rest where it is picked up from (once per device)
        if (/-(play|lit)$/.test(s.id)) continue;
        if (!await aimAt(page, n, s.restProp, 0.5)) await cam(page, SEAT[n]);
        await wait(1100);
        await surfaceShot(ctxo, s, '', 'at rest: the mock headset has no hand to grip it');
        continue;
      }
      for (const st of s.steps) await step(page, n, st);
      if (s.aim) { if (!await aimAt(page, n, s.aim)) { console.log(`  (no ${s.aim} entity: seat view)`); await cam(page, SEAT[n]); } }
      else await cam(page, SEAT[n]);
      await wait(1100);
      await surfaceShot(ctxo, s);
      if (s.aim) {   // and the workstation / desk frame too, so the surface is also seen in its room
        await cam(page, SEAT[n]); await wait(900);
        await surfaceShot(ctxo, s, '--seat', 'the seat frame');
      }
      if (s.release) await releaseDevice(page, s.release);
    } catch (err) { console.log(`  ⚠ ${s.id}: ${String(err).slice(0, 160)}`); }
  }
  if (errors.length) console.log(`  page errors: ${errors.slice(0, 3).join(' · ')}`);
  if (flow) await flow.close();
  await page.close();
}

async function runClose() {
  // the Close from the stars up: `__enterClose()` (a review route), then played as a visitor plays it: a press anywhere turns
  // each message card; the four panels (aimed from Daniel's seat, a press on a face turns it to its dossier); the Restart card
  // on Daniel's monitor, and its Receipt. The timed frames of the flight are taken as the run goes.
  const ctxo = await openEra(4);
  const { page, flow } = ctxo;
  await page.evaluate(() => window.__enterClose());
  const T0 = Date.now();
  const stamps = [4, 12, 22, 34, 48, 62, 78, 94, 110];
  let si = 0, pressed = -1, panelsDone = false, cardDone = false;
  const state = () => page.evaluate(() => window.__closeState());
  while ((Date.now() - T0) / 1000 < 560 && !cardDone) {
    const st = await state(); const sec = (Date.now() - T0) / 1000;
    if (!argv.includes('--tail') && si < stamps.length && sec >= stamps[si]) { await surfaceShot(ctxo, { id: `close-t${String(stamps[si]).padStart(3, '0')}`, e: 4, era: 'close', what: `The Close, ${stamps[si]} s after it begins`, where: 'the end of the piece', canv: [] }); si++; continue; }
    if (st.stage === 'message' && st.card !== pressed) {
      await wait(2200);
      await surfaceShot(ctxo, { id: `close-card-${st.card + 1}`, e: 4, era: 'close', what: `The Close: message card ${st.card + 1}`, where: 'the Close, a press anywhere turns the card', canv: [] });
      await page.mouse.click(640, 360); pressed = st.card; await wait(900); continue;
    }
    if (st.panels && (st.stage === 'open' || st.stage === 'settled') && !panelsDone) {
      panelsDone = true; await wait(12000);   // the panels finish opening
      if (XR) await page.evaluate(() => { if (window.__xrMock) window.__xrMock.seatYaw = 0; });
      for (const [era, tag] of [[1, '1997'], [2, '2003'], [3, '2016'], [4, '2026']]) {
        const q = (await page.evaluate(() => window.__closePanels())).find((x) => x.era === era);
        if (!q || q.hidden) { console.log(`  the ${tag} panel is folded: no frame`); continue; }
        const aim = () => page.evaluate((tg) => { const E = { x: 0, y: 1.16, z: 0.7 }; const dx = tg.x - E.x, dy = tg.y - E.y, dz = tg.z - E.z; window.__camFree(E.x, E.y, E.z, Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI, Math.atan2(-dx, -dz) * 180 / Math.PI); }, q);
        await aim(); await wait(900);
        await surfaceShot(ctxo, { id: `close-panel-${tag}`, e: 4, era: 'close', what: `The ${tag} panel: its room, and its Sources button in that room's OS`, where: 'the Close\'s four panels', canv: [] });
        if (!XR) {
          await page.mouse.move(640, 360); await page.mouse.down(); await wait(70); await page.mouse.up();
          await aim(); await wait(1300);
          await surfaceShot(ctxo, { id: `close-dossier-${tag}`, e: 4, era: 'close', what: `The ${tag} room's dossier, on its own panel, in its own OS`, where: 'a press on the panel', canv: [] });
        }
      }
      continue;
    }
    if (!st.stage && st.monitor) {
      await wait(2500);
      await surfaceShot(ctxo, { id: 'close-card', e: 4, era: 'close', what: 'The Restart card on Daniel\'s monitor: four rooms, Receipt, Start again, The dossier', where: 'the end of the piece', canv: [] });
      const ok = await page.evaluate(() => { const cm = window.__closeMonitor; const h = (cm.hits || []).find((r) => r.id === 'close-receipt'); if (h) cm.press(h.x + h.w / 2, h.y + h.h / 2); return !!h; });
      if (ok) { await wait(1500); await surfaceShot(ctxo, { id: 'close-receipt', e: 4, era: 'close', what: 'The receipt: every update stacked, each FAILED', where: 'from the Restart card', canv: [] }); }
      cardDone = true; break;
    }
    await wait(1400);
  }
  if (!cardDone) console.log('  the Close did not reach the Restart card within the run');
  if (flow) await flow.close();
  await page.close();
}

try {
  for (const e of ERAS) {
    if (e === 'close') { if (!ONLY || 'close'.startsWith(ONLY)) await runClose(); }
    else await runEra(Number(e));
  }
} finally {
  save();
  await Promise.race([browser.close(), wait(5000).then(() => browser.process()?.kill('SIGKILL'))]);
}
