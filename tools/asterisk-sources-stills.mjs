#!/usr/bin/env node
/** S242 review stills: the advert's end card (noise, gather, scroll, reduced motion) and the Lexicon's paged Sources tab.
 *  Pass --port. Diagnostic only: the seek and the frame times are set, never a walker shortcut. */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
if (portIndex < 0) throw new Error('Pass --port explicitly');
const port = Number(args[portIndex + 1]);
const out = path.resolve('out/asterisk-sources');
fs.mkdirSync(out, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox'] });
const errors = [];
const shots = [];
const url = `http://localhost:${port}/?reinterp=1&debug=1&setup=1&home=0&kiosk=0&descent=0`;
try {
  for (const [name, width, height, reduced] of [['laptop', 1280, 720, false], ['phone', 390, 844, false], ['laptop-reduced', 1280, 720, true]]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: name === 'phone', hasTouch: name === 'phone' });
    if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(url, { waitUntil: 'load', timeout: 180000 });
    await page.waitForFunction(() => window.__os?.setup?.stage === 'balloon-1', { timeout: 90000 });
    const press = async id => {
      await page.waitForFunction(id => window.__os.setup?.hits.some(h => h.id === id), { timeout: 10000 }, id);
      await page.evaluate(id => { const h = window.__os.setup.hits.find(h => h.id === id); window.__os.handleClick(h.x + h.w / 2, h.y + h.h / 2); }, id);
      await wait(100);
    };
    await press('setup-choice-1');
    await page.waitForFunction(() => window.__os.setup.stage === 'note');
    await press('setup-close'); await press('setup-choice-0'); await press('setup-advert-play-0');
    await page.evaluate(() => window.__os.setup.player.debugSeek(113.9));
    await page.waitForFunction(() => window.__os.setup.stage === 'asterisk', { timeout: 15000 });
    await page.evaluate(() => { window.__os.paused = true; });
    const frames = reduced ? [['settled', 9]] : [['1-noise', 0.5], ['2-gathering', 1.9], ['3-gathered', 3.4], ['4-scroll', 8], ['5-scroll-late', 15]];
    for (const [label, t] of frames) {
      await page.evaluate(t => { const s = window.__os.setup; s.endCard.t = t; s.dirty = true; }, t);
      await wait(250);
      const base = `${name}-${label}`;
      await page.screenshot({ path: path.join(out, `${base}-monitor.png`) });
      const canvas = await page.evaluate(() => window.__os.canvas.toDataURL('image/png'));
      fs.writeFileSync(path.join(out, `${base}-canvas.png`), Buffer.from(canvas.split(',')[1], 'base64'));
      shots.push(base);
    }
    if (!reduced) {
      const ids = await page.evaluate(() => window.__os.setup.hits.map(h => h.id));
      await page.evaluate(() => { window.__os.paused = false; });
      if (JSON.stringify(ids) !== '["setup-close"]') errors.push('asterisk hits: ' + ids);
      await press('setup-close');
      const stage = await page.evaluate(() => window.__os.setup.stage);
      if (stage !== 'balloon-8') errors.push('after close stage ' + stage);
    }
    await page.close();
  }
  // the Lexicon's Sources tab: the face both surfaces draw, paged
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(url, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.__os?.setup, { timeout: 90000 });
  const pngs = await page.evaluate(async () => {
    const { Lexicon, LEXICON_SOURCES } = await import('/src/room/lexicon.ts');
    const W = 512, H = 384, S = 3;
    const cv = document.createElement('canvas'); cv.width = W * S; cv.height = H * S;
    const ctx = cv.getContext('2d'); ctx.setTransform(S, 0, 0, S, 0, 0); ctx.imageSmoothingEnabled = false;
    const book = new Lexicon(); const hits = [];
    const result = { n: LEXICON_SOURCES.length, pages: [], log: [] };
    book.press('lex-sources'); book.draw(ctx, W, H, hits);
    for (let i = 0; i < 40; i++) {
      result.pages.push(cv.toDataURL('image/png'));
      const ids = hits.map(h => h.id);
      result.log.push(ids.join(','));
      if (!ids.includes('lex-next')) break;
      book.press('lex-next'); book.draw(ctx, W, H, hits);
    }
    return result;
  });
  fs.writeFileSync(path.join(out, 'LEXICON.json'), JSON.stringify({ links: pngs.n, pages: pngs.pages.length, hitsPerPage: pngs.log }, null, 1));
  pngs.pages.forEach((d, i) => { if (i < 2 || i === pngs.pages.length - 1) { fs.writeFileSync(path.join(out, `sources-page-${i + 1}.png`), Buffer.from(d.split(',')[1], 'base64')); shots.push(`sources-page-${i + 1}`); } });
  await page.close();
} finally {
  await browser.close();
  fs.writeFileSync(path.join(out, 'CAPTURE.json'), JSON.stringify({ port, shots, errors }, null, 2) + '\n');
}
console.log(JSON.stringify({ shots, errors }, null, 1));
