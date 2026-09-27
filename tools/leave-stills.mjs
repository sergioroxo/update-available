#!/usr/bin/env node
/**
 * LEAVE STILLS — photograph the Leave page and its three hidden readings.
 *
 *     node tools/leave-stills.mjs --port 3000      # → out/leave/*.png
 *
 * ⚑ WHY (S177). Sérgio asked to SEE the hope hidden in the Leave page (the burn-in
 * paragraph, the H-O-P-E acrostic under See also, the starfield that gathers into
 * words every 30 s). The starfield only speaks for 3.5 s of every 30, so a hand
 * screenshot is a coin toss; this waits for it.
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const PORT = Number(flag('port', 3000));
const OUT = path.resolve('out/leave');
const chrome = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p)) ?? process.env.CHROME;
if (!chrome) { console.log('no Chrome found — set $CHROME'); process.exit(1); }
const puppeteer = (await import('puppeteer-core')).default;
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 860, deviceScaleFactor: 2 });
await page.goto(`http://localhost:${PORT}/?reinterp=1&era=3&debug=1&descent=0`, { waitUntil: 'networkidle2', timeout: 60000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(5000);
await page.keyboard.press('Escape');
await wait(800);
const opened = Date.now();
const ok = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent?.trim() === 'Leave');
  if (b) b.click();
  return !!b;
});
if (!ok) { console.log('no Leave button in the menu'); process.exit(1); }
await wait(1500);
fs.mkdirSync(OUT, { recursive: true });
// hide the debug HUD so the page reads as it will
await page.addStyleTag({ content: 'body > *:not(#reinterp-leave-page) { visibility: hidden !important; }' });
await page.screenshot({ path: path.join(OUT, '1-the-page.png') });
// the starfield gathers at ~23.7 s after the page opens and holds 3.5 s
await wait(Math.max(0, 25200 - (Date.now() - opened)));
const box = await page.evaluate(() => {
  const c = document.querySelector('#reinterp-leave-page canvas');
  const r = c?.closest('table')?.getBoundingClientRect();
  return r ? { x: r.x - 10, y: r.y - 10, width: r.width + 20, height: 260 } : null;
});
if (box) await page.screenshot({ path: path.join(OUT, '2-the-starfield-gathered.png'), clip: box });
await page.screenshot({ path: path.join(OUT, '2b-the-page-while-it-speaks.png') });
await page.evaluate(() => {
  const h = [...document.querySelectorAll('#reinterp-leave-page h2')].find((x) => x.textContent === 'History');
  h?.scrollIntoView({ block: 'start' });
});
await wait(400);
await page.screenshot({ path: path.join(OUT, '3-burn-in.png') });
await page.evaluate(() => {
  const h = [...document.querySelectorAll('#reinterp-leave-page h2')].find((x) => x.textContent === 'See also');
  h?.scrollIntoView({ block: 'center' });
});
await wait(400);
await page.screenshot({ path: path.join(OUT, '4-see-also-hope.png') });
await browser.close();
console.log(`wrote ${OUT}/1-the-page.png, 2-the-starfield-gathered.png, 2b-…, 3-burn-in.png, 4-see-also-hope.png`);
