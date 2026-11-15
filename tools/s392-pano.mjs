#!/usr/bin/env node
/** ⚑ S392 (UiB job 26 Part B0) — a panorama from each seat (desktop, 1280×720): every 45° of yaw at the seat's pitch, so
 *  the TVs' new places are chosen from the room's free space.  node tools/s392-pano.mjs --port 5462 [--out out/s392/pano] [--only 1997] [--yaws 0,45,…] [--pitch -8] */
import fs from 'node:fs'; import path from 'node:path'; import puppeteer from 'puppeteer-core';
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s392/pano')); fs.mkdirSync(OUT, { recursive: true });
const ONLY = flag('only', ''); const YAWS = flag('yaws', ''); const PITCH = flag('pitch', null); const FOV = flag('fov', null);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ROOMS = [
  { id: '1997', era: 1, seat: { x: 0, y: 1.16, z: 0.7, pitch: 0, yaw: 0 } },
  { id: '2016', era: 3, seat: { x: -4.4, y: 1.16, z: 0.7, pitch: -8, yaw: 93 } },
  { id: '2026', era: 4, seat: { x: 4.6, y: 1.16, z: 0.7, pitch: -8, yaw: 270 } }];
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required', '--disable-audio-output'] });
for (const r of ROOMS) {
  if (ONLY && ONLY !== r.id) continue;
  const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  const q = r.era === 1 ? '?reinterp=1&kiosk=0&debug=1&home=0' : `?reinterp=1&era=${r.era}&debug=1&descent=0&kiosk=0`;
  await page.goto(`http://localhost:${PORT}/${q}`, { waitUntil: 'load', timeout: 180000 });
  if (r.era === 1) {
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => (b.textContent || '').includes('Log in') && !b.disabled), { timeout: 60000 }).catch(() => {});
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Log in')); if (b) b.click(); });
  }
  await page.waitForFunction(() => window.__app && window.__camPose && window.__camFree, { timeout: 180000 });
  await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
  await wait(6000);
  for (let i = 0; i < 60; i++) { const p = await page.evaluate(() => window.__camPose()); if (!p.driven && !p.descent) break; await wait(1000); }
  if (FOV) await page.evaluate((f) => { const c = window.__app.root.findByName('camera'); c.camera.fov = f; }, Number(FOV));
  const yaws = YAWS ? YAWS.split(',').map(Number) : [0, 45, 90, 135, 180, 225, 270, 315].map((d) => r.seat.yaw + d);
  for (const y of yaws) {
    await page.evaluate((s, yaw, pitch) => window.__camFree(s.x, s.y, s.z, pitch, yaw), r.seat, y, PITCH !== null ? Number(PITCH) : r.seat.pitch);
    await wait(1200);
    await page.screenshot({ path: path.join(OUT, `${r.id}-yaw${String(Math.round(((y % 360) + 360) % 360)).padStart(3, '0')}.png`) });
  }
  await page.close();
}
await browser.close(); console.log('wrote', OUT);
