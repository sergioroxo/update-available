#!/usr/bin/env node
/**
 * ⚑ S409 (UiB job 32 Part D) — the Close's cards, one still per card, on the computer and in the headset mock.
 *
 *     node tools/s409-cards-stills.mjs --port 5491 [--out <dir>] [--modes desktop,xr] [--label after]
 *
 * The review route (`?close=1`) runs the ending on Daniel's CRT and then the Close's message; each card is shot once it
 * is up (`window.__closeCard.i`), then turned with a press anywhere, as tools/walk.mjs turns it. Headset: the seated mock
 * of tools/s404-crt-probe.mjs (xr.active forced, the head at the rig, 90° view), the press fired as a controller select.
 * Writes C-3_card<n>_<label>[_xr].png and cards.json (each card's text as shown, its foot, whether it fits its frame).
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s409-cards'));
const MODES = flag('modes', 'desktop,xr').split(',');
const LABEL = flag('label', 'after');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, timeout: 180000,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--disable-audio-output'] });
const rows = [];
for (const mode of MODES) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&close=1&debug=1&descent=0&home=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__app && window.__os, { timeout: 180000 });
  await wait(5000);
  if (mode === 'xr') {
    await page.evaluate(() => {
      const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true });
      head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90;
      const src = { targetRayMode: 'tracked-pointer', getOrigin: () => head.getPosition().clone(), getDirection: () => head.forward.clone(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
      window.__s409src = src;
      app.xr.input.fire('add', src); app.xr.input.fire('select', src);
      app.on('update', () => { const d = app.root.findByName('xr-debug'); if (d) d.enabled = false; });
    });
    await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
    await wait(3000);
  }
  const seen = [];
  for (let i = 0; i < 12; i++) {
    const s = Date.now();
    let at = -1;
    while (Date.now() - s < 180000) { at = await page.evaluate(() => (window.__closeCard?.on ? window.__closeCard.i : -1)); if (at >= 0 && !seen.includes(at)) break; await wait(150); }
    if (at < 0 || seen.includes(at)) break;
    await wait(1200);
    seen.push(at);
    const name = `C-3_card${at + 1}_${LABEL}${mode === 'xr' ? '_xr' : ''}.png`;
    await page.screenshot({ path: path.join(OUT, name) });
    // the card as the computer shows it: its text, its foot, and whether its box overflows the window
    const card = await page.evaluate(() => {
      const el = [...document.body.children].find((e) => e.tagName === 'DIV' && e.children.length >= 2 && /press to continue|Credits/.test(e.lastElementChild?.textContent ?? ''));
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { text: el.firstElementChild.textContent, foot: el.lastElementChild.textContent, box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
        fits: r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth && el.scrollHeight <= el.clientHeight + 1 };
    });
    rows.push({ mode, i: at, name, card });
    if (mode === 'xr') await page.evaluate(() => { const app = window.__app; app.xr.input.fire('select', window.__s409src); });
    else { await page.mouse.move(640, 500); await page.mouse.down(); await wait(70); await page.mouse.up(); }
    await wait(900);
  }
  rows.push({ mode, cardsSeen: seen.length, errors });
  console.log(JSON.stringify({ mode, cardsSeen: seen, errors: errors.length }));
  await page.close();
}
fs.writeFileSync(path.join(OUT, 'cards.json'), JSON.stringify(rows, null, 1));
await browser.close();
