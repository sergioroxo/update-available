#!/usr/bin/env node
/**
 * ⚑ S423 (UiB job 35 Part C, 16-21 / 16-23) — THE 2016 → 2026 FLIGHT, FRAME BY FRAME, IN THE THREE LOOKS.
 *
 *     node tools/s423-flight-probe.mjs --port 5641 --out out/s423/flight-after [--modes desktop,phone,xr] [--every 250]
 *                                      [--head 15,-5] [--keep all|none]
 *
 * Opens 2016 (`?era=3`), sits in Vera's chair (where 2016 really ends), and fires the change through the real hook
 * (`__os.onEraShift('e4')`, the restart's end: u4's flight starts there, not on I Agree), then photographs the view
 * every `--every` ms from the rise to the landing (+3 s), with each frame's leg, place, facing and draw calls. In the page
 * a frame sampler keeps the draw calls of EVERY frame (the peak, and the leg and moment it fell in), so the peak is not
 * left to the screenshots' cadence.
 *   · desktop: 1280 × 720; phone: 844 × 390 landscape, touch + mobile UA (the gyro look is the same camera, the rig flies
 *     the computer's legs); xr: the seated headset mock (jobs 33–34: `app.xr.active` forced, the head 1.2 m over the rig,
 *     fov 90, a controller added and selected, `xr-debug` hidden), the head held at `--head yaw,pitch` (his head at the
 *     void frame, 222224: about 13° left, level).
 *   · per frame, the WHITE FRACTION: the share of pixels with every channel ≥ 236 (the room has no white surface large
 *     enough to fill 1 % of a view; the screens are dark in the flight). The frame with the most is named in the report.
 *   · when a frame is ≥ 0.5 % white, the props of the cascade that are FLASHING at that moment (their emissive ≥ 0.9 in
 *     every channel) are listed with their box size and where they fall on the screen: the "white void" hunt.
 * Writes <out>/<mode>/f###.jpg, <out>/report.json and one line per mode to stdout. Measurement only.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s423/flight'));
const MODES = flag('modes', 'desktop,phone,xr').split(',');
const EVERY = Number(flag('every', 250));
const [HEAD_YAW, HEAD_PITCH] = flag('head', '15,-5').split(',').map(Number);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, protocolTimeout: 600000,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--disable-audio-output'] });

async function run(mode) {
  const dir = path.join(OUT, mode); fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.jpg')) fs.rmSync(path.join(dir, f));
  const page = await browser.newPage();
  const VW = mode === 'phone' ? 844 : mode === 'xr' ? 1000 : 1280, VH = mode === 'phone' ? 390 : mode === 'xr' ? 1000 : 720;
  if (mode === 'phone') await page.emulate({ userAgent: IPHONE_UA, viewport: { width: VW, height: VH, deviceScaleFactor: 1, isMobile: true, hasTouch: true, isLandscape: true } });
  else await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 240)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 240)); });
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=3&debug=1&home=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__os && window.__camPose && window.__app && window.__xrComfort && window.__seatCut, { timeout: 180000 });
  await page.addStyleTag({ content: 'body > *:not(canvas) { display: none !important; }' });
  for (let i = 0; i < 60; i++) { const p = await page.evaluate(() => window.__camPose()); if (!p.driven && !p.descent) break; await wait(1000); }
  await wait(2000);
  // 2016 ends in Vera's chair (the review jump lands in Daniel's)
  await page.evaluate(() => window.__seatCut(90)); await wait(2500);
  if (mode === 'xr') {
    await page.evaluate(() => {
      const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
      head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
      const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
      window.__controller = src; app.xr.input.fire('add', src); app.xr.input.fire('select', src);
      app.on('update', () => { const d = app.root.findByName('xr-debug'); if (d) d.enabled = false; });
    });
    await page.waitForFunction(() => window.__xrComfort.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
    await wait(2500);
    await page.evaluate((y, p) => window.__app.root.findByName('camera').setLocalEulerAngles(p, y, 0), HEAD_YAW, HEAD_PITCH);
    await wait(800);
  }
  // the frame sampler: every frame's draw calls, and the peak's moment
  await page.evaluate(() => {
    const app = window.__app;
    const S = window.__s423 = { on: false, t0: 0, frames: 0, max: 0, at: null, perLeg: {} };
    app.on('frameend', () => {
      if (!S.on) return;
      const d = window.__drawCalls ?? 0, p = window.__camPose();
      S.frames++;
      const leg = p.leg ?? 'landed';
      S.perLeg[leg] = Math.max(S.perLeg[leg] ?? 0, d);
      if (d > S.max) { S.max = d; S.at = { t: +((performance.now() - S.t0) / 1000).toFixed(2), leg, x: +p.x.toFixed(2), z: +p.z.toFixed(2), yaw: Math.round(p.yaw) }; }
    });
    // the props flashing now (the cascade's glitch writes emissive = colour + f): id, box size, where on the screen
    window.__s423flash = () => {
      const cam = app.root.findByName('camera'), V = cam.getPosition().constructor, out = [];
      const W = app.graphicsDevice.clientRect.width, H = app.graphicsDevice.clientRect.height;
      app.root.forEach((n) => {
        const r = n.render; if (!r?.enabled || !n.enabled) return;
        for (const mi of r.meshInstances ?? []) {
          const e = mi.material?.emissive; if (!e || Math.min(e.r, e.g, e.b) < 0.9) continue;
          const b = mi.aabb, c = b.center, h = b.halfExtents;
          const pts = []; for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
            const w = new V(c.x + sx * h.x, c.y + sy * h.y, c.z + sz * h.z);
            const ph = app.xr.active ? window.__xrComfort.physicalPoint(w.clone()) : w;
            const s = cam.camera.worldToScreen(ph, new V()); if (s.z > 0) pts.push(s);
          }
          if (!pts.length) continue;
          const x0 = Math.min(...pts.map((s) => s.x)), x1 = Math.max(...pts.map((s) => s.x)), y0 = Math.min(...pts.map((s) => s.y)), y1 = Math.max(...pts.map((s) => s.y));
          if (x1 < 0 || y1 < 0 || x0 > W || y0 > H) continue;
          out.push({ name: n.name, size: [+(2 * h.x).toFixed(2), +(2 * h.y).toFixed(2), +(2 * h.z).toFixed(2)], emissive: [+e.r.toFixed(2), +e.g.toFixed(2), +e.b.toFixed(2)],
            screen: [Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1)] });
        }
      });
      return out;
    };
  });
  const whiteOf = (b64) => page.evaluate(async (b) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/jpeg;base64,${b}`)).blob());
    const c = document.createElement('canvas'); c.width = 160; c.height = Math.round(160 * bmp.height / bmp.width); const g = c.getContext('2d'); g.drawImage(bmp, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height).data; let w = 0, s = 0;
    for (let i = 0; i < d.length; i += 4) { if (d[i] >= 236 && d[i + 1] >= 236 && d[i + 2] >= 236) w++; s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; }
    return { white: +(100 * w / (d.length / 4)).toFixed(2), lum: Math.round(s / (d.length / 4)) };
  }, b64);
  await page.evaluate(() => { window.__s423.t0 = performance.now(); window.__s423.on = true; window.__os.onEraShift('e4'); });
  const t0 = Date.now(); const frames = []; let landedAt = -1, i = 0, nextAt = 0;
  while ((Date.now() - t0) / 1000 < 120) {
    const now = Date.now(); if (now - t0 < nextAt) { await wait(nextAt - (now - t0)); }
    nextAt += EVERY;
    const p = await page.evaluate(() => { const p = window.__camPose(); return { leg: p.leg, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), pitch: Math.round(p.pitch), yaw: Math.round(p.yaw), morph: !!p.morph, xrBusy: !!p.xrBusy, xrFollow: !!p.xrFollow, draws: window.__drawCalls ?? 0, era: window.__os.era }; });
    const t = +((Date.now() - t0) / 1000).toFixed(2);
    const b64 = await page.screenshot({ type: 'jpeg', quality: 72, encoding: 'base64' });
    const file = path.join(dir, `f${String(i++).padStart(3, '0')}.jpg`); fs.writeFileSync(file, Buffer.from(b64, 'base64'));
    const w = await whiteOf(b64);
    const row = { t, file: path.basename(file), ...p, ...w };
    if (w.white >= 0.5) row.flashing = await page.evaluate(() => window.__s423flash());
    frames.push(row);
    if (landedAt < 0 && !p.leg && t > 3) landedAt = t;
    if (landedAt >= 0 && t > landedAt + 3) break;
  }
  const S = await page.evaluate(() => { window.__s423.on = false; return window.__s423; });
  const whitest = frames.reduce((a, f) => (f.white > a.white ? f : a), frames[0]);
  const res = { mode, every: EVERY, head: mode === 'xr' ? [HEAD_YAW, HEAD_PITCH] : null, landedAt, frames: frames.length, framesRendered: S.frames,
    peakDraws: S.max, peakAt: S.at, peakPerLeg: S.perLeg, legs: [...new Set(frames.map((f) => f.leg ?? 'landed'))],
    coverFrames: frames.filter((f) => f.leg && (f.morph || f.xrBusy)).length, followFrames: frames.filter((f) => f.leg && f.xrFollow).length,
    whitest: whitest ? { t: whitest.t, file: whitest.file, white: whitest.white, leg: whitest.leg, flashing: whitest.flashing ?? [] } : null,
    whiteFrames: frames.filter((f) => f.white >= 0.5).map((f) => ({ t: f.t, file: f.file, white: f.white, leg: f.leg, yaw: f.yaw })),
    errors: errors.slice(0, 8), rows: frames };
  console.log(`${mode}: landed ${landedAt}s · ${frames.length} stills · peak draws ${S.max} @ ${JSON.stringify(S.at)} · per leg ${JSON.stringify(S.perLeg)} · cover frames ${res.coverFrames} · follow ${res.followFrames} · whitest ${whitest?.white}% @ ${whitest?.t}s (${whitest?.leg}) · white frames ${res.whiteFrames.length} · errors ${errors.length}`);
  await page.close();
  return res;
}

const report = { port: PORT, at: new Date().toISOString(), results: [] };
try {
  for (const m of MODES) {
    try { report.results.push(await run(m)); } catch (e) { console.log(`${m}: FAILED ${String(e).slice(0, 300)}`); report.results.push({ mode: m, failed: String(e).slice(0, 300) }); }
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
  }
} finally {
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
  await Promise.race([browser.close(), wait(5000)]);
  fs.writeFileSync(path.join(OUT, 'probe.done'), 'done\n');
}
