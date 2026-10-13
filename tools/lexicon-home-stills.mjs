#!/usr/bin/env node
/** S242: LambyOS Home (return mode) → the Lexicon's card → Sources, at two viewports: the paged canvas + the plain-text scroll box. Pass --port. */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1]);
if (!port) throw new Error('Pass --port');
const out = path.resolve('out/asterisk-sources');
fs.mkdirSync(out, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox'] });
const errors = []; const report = [];
try {
  for (const [name, width, height] of [['laptop', 1280, 720], ['phone', 390, 844]]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: name === 'phone', hasTouch: name === 'phone' });
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(`http://localhost:${port}/?reinterp=1&debug=1&setup=1&home=0&kiosk=0&descent=0`, { waitUntil: 'load', timeout: 180000 });
    await page.waitForFunction(() => window.__os?.setup, { timeout: 90000 });
    await page.evaluate(async () => {
      const m = await import('/src/desktop/home/lambyosHome.ts');
      m.mountLambyosHome(() => {}, { mode: 'return' });
    });
    await page.waitForSelector('#lambyos-home [data-home="lexicon"]', { timeout: 20000 });
    await wait(500);
    await page.evaluate(() => { document.querySelector('#lambyos-home [data-home="lexicon"]').click(); });
    await page.waitForSelector('button[data-lex="lex-sources"]', { timeout: 15000 });
    await page.evaluate(() => document.querySelector('button[data-lex="lex-sources"]').click());
    await wait(300);
    await page.screenshot({ path: path.join(out, `home-${name}-sources-1.png`) });
    await page.evaluate(() => document.querySelector('button[data-lex="lex-next"]').click());
    await wait(300);
    await page.screenshot({ path: path.join(out, `home-${name}-sources-2.png`) });
    const info = await page.evaluate(() => {
      const ul = document.querySelector('ul[aria-label]');
      const prevNext = ['lex-prev', 'lex-next'].map(id => !!document.querySelector(`button[data-lex="${id}"]`));
      return { ul: ul ? { shown: getComputedStyle(ul).display, items: ul.children.length, clientH: ul.clientHeight, scrollH: ul.scrollHeight, tab: ul.tabIndex } : null, prevNext };
    });
    report.push({ name, info });
    await page.close();
  }
} finally {
  await browser.close();
  fs.writeFileSync(path.join(out, 'HOME-CAPTURE.json'), JSON.stringify({ report, errors }, null, 2) + '\n');
}
console.log(JSON.stringify({ report, errors }, null, 1));
