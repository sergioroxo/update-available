#!/usr/bin/env node
/**
 * ERA MORPH PROBE (S346, T08) — proves "no fade to black" by measuring the frames, not by reading the code.
 *
 *     node tools/era-morph-probe.mjs --port 3171 --out out/s346/morph            # desktop + emulated headset
 *     node tools/era-morph-probe.mjs --port 3172 --out out/s346/morph-before     # a build from before
 *
 * Desktop: in 2016, a seat jump (the blink) and the 2016 → 2026 change of era through the real early-relocation
 * hook (`__os.onEraRelocate`), sampled every 250 ms: each frame's mean brightness, the leg, the blink, whether the
 * morph is up, and which bed is playing. Headset: the same change of era with `app.xr.active` forced on (the method of
 * tools/xr-layer-review.mjs): the visitor must stay in the chair while the room changes, then land through one morph.
 * Writes report.json and photographs of the covers.
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const PORT = Number(flag('port', 3171));
const OUT = flag('out', 'out/s346/morph');
const ONLY = flag('only', '');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const puppeteer = (await import('puppeteer-core')).default;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 960, height: 540, deviceScaleFactor: 1 } });
fs.mkdirSync(OUT, { recursive: true });
const report = { port: PORT };

/** mean brightness 0…255 of a screenshot, decoded in the page */
const frame = async (page, name) => {
  const b64 = await page.screenshot({ encoding: 'base64' });
  if (name) fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(b64, 'base64'));
  return page.evaluate(async (b) => {
    const blob = await (await fetch(`data:image/png;base64,${b}`)).blob();
    const bmp = await createImageBitmap(blob), c = document.createElement('canvas');
    c.width = 96; c.height = 54; const g = c.getContext('2d'); g.drawImage(bmp, 0, 0, 96, 54);
    const d = g.getImageData(0, 0, 96, 54).data; let s = 0;
    for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    return Math.round(s / (d.length / 4));
  }, b64);
};
const pose = (page) => page.evaluate(() => { const p = window.__camPose(); return { leg: p.leg, blink: p.blink ?? null, morph: p.morph ?? null, bed: p.bed ?? null, xrBusy: p.xrBusy ?? null, x: +p.x.toFixed(2), z: +p.z.toFixed(2), yaw: Math.round(p.yaw) }; });

async function open(xrMock) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(`http://127.0.0.1:${PORT}/?reinterp=1&kiosk=0&era=3&debug=1`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__os && window.__camPose && window.__app, { timeout: 90000 });
  await page.addStyleTag({ content: 'body > *:not(canvas) { display: none !important; }' });
  if (xrMock) {
    await page.evaluate(() => { const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true }); head.setLocalPosition(0, 1.2, 0); head.camera.fov = 90; });
    await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
  }
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) { const p = await page.evaluate(() => window.__camPose()); if (!p.driven && !p.descent) break; await wait(400); }
  await wait(4000);
  return { page, errors };
}

/** sample a change of era for up to `seconds`, photographing the covers */
async function sampleEraChange(page, tag, seconds) {
  const rows = [];
  await page.evaluate(() => window.__os.onEraRelocate('e4'));
  const t0 = Date.now();
  let shotBlink = 0, shotMorph = 0, shiftDone = false, lastLeg = 'start';
  while ((Date.now() - t0) / 1000 < seconds) {
    const t = (Date.now() - t0) / 1000;
    const p = await pose(page);
    // the restart lands mid-change in play; here it is fired by hand once the rise is over
    if (!shiftDone && t > 9) { shiftDone = true; await page.evaluate(() => window.__os.onEraShift('e4')); }
    let name = null;
    if (p.morph && (p.blink || p.xrBusy) && shotMorph < 6) name = `${tag}-cover-${++shotMorph}`;
    else if (p.leg !== lastLeg) name = `${tag}-leg-${p.leg ?? 'landed'}`;
    lastLeg = p.leg;
    const lum = await frame(page, name);
    rows.push({ t: +t.toFixed(2), lum, ...p, ...(name ? { shot: name } : {}) });
    if (shotBlink === 0 && p.blink) shotBlink = 1;
    if (!p.leg && t > 12) { await wait(1500); rows.push({ t: +((Date.now() - t0) / 1000).toFixed(2), lum: await frame(page, `${tag}-landed`), ...(await pose(page)) }); break; }
  }
  return rows;
}

try {
  if (!ONLY || ONLY === 'desktop') {
    const { page, errors } = await open(false);
    // 1 · a seat jump, sampled as fast as the screenshots go
    const nodes = await page.evaluate(() => window.__movementNodes?.() ?? []);
    const jump = [];
    if (nodes.length) {
      await page.evaluate((n) => window.__requestMove(n), nodes[0]);
      const t0 = Date.now();
      for (let i = 0; i < 8; i++) { const p = await pose(page); jump.push({ t: (Date.now() - t0) / 1000, lum: await frame(page, i < 4 ? `desk-jump-${i}` : null), ...p }); }
    }
    report.desktopJump = { node: nodes[0] ?? null, rows: jump };
    await wait(2000);
    await page.evaluate(() => window.__os.debugJump && null);
    const back = await page.evaluate(() => window.__movementNodes?.() ?? []);
    const home = back.find((n) => /r2|vera|seat2|west/i.test(n));
    if (home) { await page.evaluate((n) => window.__requestMove(n), home); await wait(2500); }
    report.desktopStart = await pose(page);
    // 2 · the change of era, 2016 → 2026
    report.desktop = await sampleEraChange(page, 'desk', 75);
    report.desktopErrors = errors.slice(0, 6);
    await page.close();
  }
  if (!ONLY || ONLY === 'xr') {
    const { page, errors } = await open(true);
    report.xr = await sampleEraChange(page, 'xr', 60);
    report.xrErrors = errors.slice(0, 6);
    await page.close();
  }
} finally {
  const sum = (rows) => rows && rows.length ? { frames: rows.length, minLum: Math.min(...rows.map((r) => r.lum)), legs: [...new Set(rows.map((r) => r.leg))], beds: [...new Set(rows.map((r) => r.bed))], morphFrames: rows.filter((r) => r.morph).length, end: rows[rows.length - 1] } : null;
  report.summary = { desktopJump: sum(report.desktopJump?.rows), desktop: sum(report.desktop), xr: sum(report.xr) };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary, null, 2));
  await Promise.race([browser.close(), wait(5000)]);
}
