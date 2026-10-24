#!/usr/bin/env node
/**
 * SUPPORT STILLS — open the game menu's Support row, photograph the page at 1280x720 and 390x844,
 * and prove the page makes no network request of its own.
 *
 *     node tools/support-stills.mjs --port 3132      # -> out/support/*.png
 *
 * (S258.) Requests made after the menu's Support row is pressed are logged; any one is a failure.
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const PORT = Number(flag('port', 3132));
const OUT = path.resolve('out/support');
const chrome = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p)) ?? process.env.CHROME;
if (!chrome) { console.log('no Chrome found — set $CHROME'); process.exit(1); }
const puppeteer = (await import('puppeteer-core')).default;
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox'] });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
let failed = false;
for (const [tag, w, h] of [['1280x720', 1280, 720], ['390x844', 390, 844]]) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0`, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(2500);
  let after = false; const late = [];
  page.on('request', (r) => { if (after) late.push(r.url()); });
  await page.keyboard.press('Escape');
  await wait(600);
  const rowsBefore = await page.evaluate(() => [...document.querySelectorAll('#reinterp-game-menu button')].map((b) => b.textContent.trim()));
  console.log(tag, 'menu rows:', JSON.stringify(rowsBefore));
  after = true;
  await page.evaluate(() => [...document.querySelectorAll('#reinterp-game-menu button')].find((b) => b.textContent.trim() === 'Support')?.click());
  await wait(500);
  const info = await page.evaluate(() => {
    const m = document.querySelector('#reinterp-game-menu');
    return { title: m.firstElementChild.firstElementChild.textContent, backs: [...m.querySelectorAll('button')].map((b) => b.textContent.trim()) };
  });
  console.log(tag, 'title:', info.title, '| buttons:', JSON.stringify(info.backs));
  await page.screenshot({ path: path.join(OUT, `support-${tag}.png`) });
  await page.evaluate(() => { const p = document.querySelector('#reinterp-game-menu').firstElementChild.lastElementChild; p.scrollTop = p.scrollHeight; });
  await wait(200);
  await page.screenshot({ path: path.join(OUT, `support-${tag}-end.png`) });
  await page.evaluate(() => [...document.querySelectorAll('#reinterp-game-menu button')].find((b) => b.textContent.trim() === 'Back to menu')?.click());
  await wait(300);
  const back = await page.evaluate(() => document.querySelector('#reinterp-game-menu').firstElementChild.firstElementChild.textContent);
  console.log(tag, 'after Back to menu, title:', back);
  await page.keyboard.press('Escape'); await wait(500);
  const closed = await page.evaluate(() => getComputedStyle(document.querySelector('#reinterp-game-menu')).display);
  console.log(tag, 'menu closed with Esc, display:', closed);
  console.log(tag, 'requests after Support was pressed:', late.length, late.join(' '));
  if (late.length || info.title !== 'If this touched something for you' || back !== 'Menu' || closed !== 'none') failed = true;
  await page.close();
}
await browser.close();
console.log(failed ? 'FAIL' : 'OK', `-> ${OUT}`);
process.exit(failed ? 1 : 0);
