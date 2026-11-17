#!/usr/bin/env node
/**
 * ⚑ S398 (UiB job 29 A6) — 2026'S LIGHT, PHOTOGRAPHED FROM THE SEAT AT THREE MOMENTS, and Daniel's room beside it.
 *
 *     node tools/s398-light-stills.mjs --port 5291 [--out out/s398-light] [--label after] [--modes computer,headset]
 *
 * `?era=4` (2026 settled, Maya's seat); the beats the assistant's conversation marks are filed in the page's own ledger
 * (a REVIEW state, as tools/stills.mjs files them: the same module instance the build reads), and the fade is given its
 * own time to arrive (app.ts eases 0.04 a second). Three moments: before the conversation (nothing filed), mid-way (up
 * to `map`, the fade at 0.6), and by the visor (`tryon`, 1: the screen is her room's only light). At each, the room's
 * three lights are read (Maya's lamp, Room 3's fill, the screen's glow) and a photograph is taken from her seat; then
 * one from Daniel's seat (his room must keep its light). Computer 1280 × 720 at the seat; headset: the seated mock.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s398-light'));
const LABEL = flag('label', 'after');
const MODES = flag('modes', 'computer,headset').split(',');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--disable-audio-output'] });
const rows = [];
const MOMENTS = [
  { name: '1-before', beats: [], wait: 3000, note: 'before the conversation: the lamp lit' },
  { name: '2-midway', beats: ['search', 'bot', 'map'], wait: 17000, note: 'the conversation under way (search, bot, map): the lamp going' },
  { name: '3-visor', beats: ['junie', 'original', 'tryon'], wait: 12000, note: 'by the visor (tryon): the screen is her room\'s only light' }
];
for (const mode of MODES) {
  const page = await browser.newPage();
  await page.setViewport({ width: mode === 'headset' ? 1000 : 1280, height: mode === 'headset' ? 1000 : 720, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=4&debug=1&descent=0&home=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__app && window.__camPose && window.__os && window.__poses, { timeout: 180000 });
  await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
  await wait(6000);
  if (mode === 'headset') {
    await page.evaluate(() => {
      const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
      head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
      const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
      app.xr.input.fire('add', src); app.xr.input.fire('select', src);
      app.on('update', () => { const d = app.root.findByName('xr-debug'); if (d) d.enabled = false; });
    });
    await wait(4000);
  }
  // the computer: the authored seat; the headset: the calibrated head at Maya's seat, level, as it sits (left alone)
  const seatView = (k) => mode === 'headset' ? Promise.resolve() : page.evaluate((k) => {
    const s = window.__poses().seats[k]; window.__camFree(s.x, s.y, s.z, s.pitch, s.yaw);
  }, k);
  for (const m of MOMENTS) {
    await page.evaluate(async (beats) => { const L = await import('/src/state/ledger.ts'); for (const b of beats) if (!L.ledger.e4Beats.includes(b)) L.ledger.e4Beats.push(b); }, m.beats);
    await wait(m.wait);
    await seatView('r3'); await wait(900);
    const lights = await page.evaluate(() => Object.fromEntries(['lamp', 'zoneE', 'mayaGlow', 'roomFill'].map((id) => [id, +(window.__app.root.findByName(`light-${id}`)?.light?.intensity ?? -1).toFixed(3)])));
    const file = `${LABEL}-${mode}-maya-${m.name}.png`;
    await page.screenshot({ path: path.join(OUT, file) });
    rows.push({ mode, moment: m.name, note: m.note, lights, file });
    console.log(`[${mode}] ${m.name}: ${JSON.stringify(lights)} → ${file}`);
  }
  // Daniel's room, at the end of the fade: it keeps its light (the computer only: the mock head stays at Maya's seat)
  if (mode === 'headset') { await page.close(); continue; }
  await seatView('r1'); await wait(900);
  const file = `${LABEL}-${mode}-daniel-at-the-visor.png`;
  await page.screenshot({ path: path.join(OUT, file) });
  rows.push({ mode, moment: 'daniel', note: "Daniel's room, by the visor: unchanged", file });
  if (errors.length) console.log(`  page errors: ${errors.join(' | ')}`);
  await page.close();
}
fs.writeFileSync(path.join(OUT, `${LABEL}-light.json`), JSON.stringify(rows, null, 1));
await browser.close();
