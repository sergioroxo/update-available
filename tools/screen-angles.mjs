#!/usr/bin/env node
/**
 * SCREEN ANGLES (S346) — Daniel's monitor photographed at 0°, 30° and 60° off its axis, for the "straight lines at
 * any angle" change (screens sampled with mips + anisotropy; the room keeps FILTER_NEAREST).
 *
 *     node tools/screen-angles.mjs --port 3171 --out out/s346/after
 *     node tools/screen-angles.mjs --port 3172 --out out/s346/before     # a build from before the change
 *
 * Opens 1997 at Profile setup ("Welcome back, Daniel"), puts the camera 0.7 m from the glass at each angle with
 * `__camFree` (review only, `?debug=1`), and writes one full frame and one crop of the glass per angle. It also
 * reports the monitor texture's sampler and counts `generateMipmap` calls against screen uploads for three seconds,
 * so "the mip chain is rebuilt on each upload" is measured rather than assumed.
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const PORT = Number(flag('port', 3171));
const OUT = flag('out', 'out/s346/after');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const puppeteer = (await import('puppeteer-core')).default;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox'], defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 } });
fs.mkdirSync(OUT, { recursive: true });
const report = { port: PORT, shots: [] };
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  // count every generateMipmap the engine issues (installed before the app makes its context)
  await page.evaluateOnNewDocument(() => {
    window.__mipGens = 0;
    for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
      if (!C) continue;
      const g = C.prototype.generateMipmap;
      C.prototype.generateMipmap = function (...a) { window.__mipGens++; return g.apply(this, a); };
    }
  });
  await page.goto(`http://127.0.0.1:${PORT}/?reinterp=1&kiosk=0&debug=1&home=0`, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => (b.textContent || '').includes('Log in') && !b.disabled), { timeout: 60000 }).catch(() => {});
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Log in')); if (b) b.click(); });
  await page.waitForFunction(() => window.__os && window.__camFree && window.__camPose, { timeout: 60000 });
  await page.addStyleTag({ content: 'body > *:not(canvas) { display: none !important; }' });
  // let the descent land, then go to Profile setup
  const t0 = Date.now();
  while (Date.now() - t0 < 40000) { const p = await page.evaluate(() => window.__camPose()); if (!p.driven && !p.descent) break; await wait(500); }
  await page.evaluate(() => window.__os.debugJump('profile'));
  await wait(2500);
  report.sampler = await page.evaluate(() => {
    const app = window.__app, e = app.root.findByName('desktop-screen'), t = e?.render?.material?.emissiveMap;
    return t ? { minFilter: t.minFilter, magFilter: t.magFilter, mipmaps: t.mipmaps, anisotropy: t.anisotropy, size: [t.width, t.height], deviceMaxAniso: app.graphicsDevice.maxAnisotropy } : null;
  });
  const before = await page.evaluate(() => ({ g: window.__mipGens, u: window.__uploads ?? null }));
  await wait(3000);
  const after = await page.evaluate(() => ({ g: window.__mipGens, u: window.__uploads ?? null }));
  report.mips = { generateMipmapCalls: after.g - before.g, screenUploads: after.u !== null && before.u !== null ? after.u - before.u : null };
  const D = 0.7, Y = 1.09;
  for (const deg of [0, 30, 60]) {
    const r = deg * Math.PI / 180;
    await page.evaluate((a) => window.__camFree(a[0], a[1], a[2], a[3], a[4]), [D * Math.sin(r), Y, D * Math.cos(r), -1, deg]);
    await wait(900);
    const full = path.join(OUT, `monitor-${deg}.png`);
    await page.screenshot({ path: full });
    // the glass, by projecting its corners (SCREEN = 0.4 × 0.3 m at (0, 1.08, 0))
    const box = await page.evaluate(() => {
      const app = window.__app, cam = app.root.findByName('camera').camera, V = app.root.getPosition().constructor;
      const pts = [[-0.2, 0.93], [0.2, 0.93], [-0.2, 1.23], [0.2, 1.23]].map(([x, y]) => cam.worldToScreen(new V(x, y, 0.001)));
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    });
    const pad = 12, clip = { x: Math.max(0, Math.floor(box.x - pad)), y: Math.max(0, Math.floor(box.y - pad)) };
    clip.width = Math.min(1280 - clip.x, Math.ceil(box.w + 2 * pad)); clip.height = Math.min(720 - clip.y, Math.ceil(box.h + 2 * pad));
    const crop = path.join(OUT, `monitor-${deg}-glass.png`);
    await page.screenshot({ path: crop, clip });
    report.shots.push({ deg, full, crop, clip });
  }
  report.errors = errors.slice(0, 6);
} finally {
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await Promise.race([browser.close(), wait(5000)]);
}
