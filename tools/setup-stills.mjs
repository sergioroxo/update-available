#!/usr/bin/env node
/** Setup review at the actual seat, plus the desktop canvas. Never drives a walk. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
if (portIndex < 0) throw new Error('Pass --port explicitly');
const port = Number(args[portIndex + 1]);
const out = path.resolve('out/setup-lamblippy');
fs.mkdirSync(out, { recursive: true });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox'] });
const errors = [];
const checks = [];
const shots = [];
try {
  for (const [name, width, height] of [['laptop',1280,720], ['phone',390,844]]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: name === 'phone', hasTouch: name === 'phone' });
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warn') errors.push(m.text()); });
    await page.goto(`http://localhost:${port}/?reinterp=1&debug=1&setup=1&home=0&kiosk=0&descent=0`, { waitUntil: 'load', timeout: 180000 });
    await page.waitForFunction(() => window.__os?.setup, { timeout: 90000 });
    const shot = async label => {
      await wait(120);
      const base = `${name}-${label}`;
      await page.screenshot({ path: path.join(out, `${base}-monitor.png`) });
      const canvas = await page.evaluate(() => window.__os.canvas.toDataURL('image/png'));
      fs.writeFileSync(path.join(out, `${base}-canvas.png`), Buffer.from(canvas.split(',')[1], 'base64'));
      shots.push(base);
    };
    const press = async id => {
      await page.waitForFunction(id => window.__os.setup?.hits.some(h => h.id === id), { timeout: 10000 }, id);
      await page.evaluate(id => { const h = window.__os.setup.hits.find(h => h.id === id); window.__os.handleClick(h.x+h.w/2,h.y+h.h/2); }, id);
      await wait(100);
    };
    // Freeze each short boot state for an image; otherwise CPU load can advance between
    // the monitor screenshot and backing-canvas export. The walker never uses this.
    await page.evaluate(() => { window.__os.paused = true; window.__os.setup.bootT = 0.1; window.__os.setup.dirty = true; });
    await shot('00-boot');
    await page.evaluate(() => { window.__os.setup.bootT = 0.8; window.__os.setup.dirty = true; });
    await shot('00-boot-teal');
    await page.evaluate(() => { window.__os.paused = false; });
    await page.waitForFunction(() => window.__os.setup.stage === 'balloon-1');
    const before = await page.evaluate(() => window.__ledger());
    await shot('01-welcome'); await press('setup-choice-0');
    await shot('02-about-offer'); await press('setup-choice-0');
    await shot('02-about-window'); await press('setup-close');
    await shot('03-sound-offer'); await press('setup-choice-0');
    await shot('03-sound-window'); await press('setup-test'); await press('setup-sound-quiet');
    assert.equal(await page.evaluate(() => window.__ledger().view.captions), true);
    await shot('04-look-offer'); await press('setup-choice-0');
    await shot('04-look-window'); await press('setup-close');
    await shot('05-note-offer');
    await page.waitForFunction(() => window.__os.setup.stage === 'note');
    await shot('05-content-note'); await press('setup-close');
    await shot('06-version'); await press('setup-choice-0');
    await shot('07-advert-offer'); await press('setup-advert-play-0');
    await shot('07-advert-player');
    assert.deepEqual(await page.evaluate(() => window.__os.setup.hits.map(h => h.id)), [], 'S245: the film has no control at all (no Skip, no close)');
    await page.waitForFunction(() => window.__os.setup.film?.duration > 1);
    await page.evaluate(() => { const f = window.__os.setup.film; f.currentTime = f.duration - 0.3; });   // diagnostic seek; the walker never does
    await page.waitForFunction(() => window.__os.setup.stage === 'balloon-9', { timeout: 15000 });
    await shot('08-start-wait');
    await page.waitForFunction(() => window.__os.setup.ready, { timeout: 10000 });
    await shot('08-start-ready');
    const after = await page.evaluate(() => window.__ledger());
    const { view: v1, ...b } = before; const { view: v2, ...a } = after;
    assert.deepEqual(a,b,'Setup must file nothing, including advert Play');
    checks.push(`${name}: all guided steps, test sound, quiet captions, advert Play (film has no Skip; diagnostic seek to the end), ledger unchanged outside view`);
    await press('setup-choice-0');
    await page.waitForFunction(() => !window.__os.setup && window.__os.phase === 'r_boot');
    checks.push(`${name}: Start resolves and review route hands off to the existing 1997 opening`);
    // Separate played-advert branch. Seeking is a screenshot/branch check, never a walker shortcut.
    await page.goto(`http://localhost:${port}/?reinterp=1&debug=1&setup=1&home=0&kiosk=0&descent=0`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__os?.setup?.stage === 'balloon-1');
    await press('setup-choice-1');
    await page.waitForFunction(() => window.__os.setup.stage === 'note');
    await page.keyboard.press('Escape');
    const heldAt = await page.evaluate(() => window.__os.setup.clock);
    await wait(500);
    assert.equal(await page.evaluate(() => window.__os.setup.clock), heldAt, 'The frame menu freezes setup');
    await page.keyboard.press('Escape');
    await press('setup-close'); await press('setup-choice-0');
    const adBefore = await page.evaluate(() => window.__ledger());
    await press('setup-advert-play-0');
    await page.waitForFunction(() => window.__os.setup.film?.duration > 1);
    await page.evaluate(() => { const f = window.__os.setup.film; f.currentTime = f.duration - 0.3; });
    await page.waitForFunction(() => window.__os.setup.stage === 'balloon-9', { timeout: 15000 });
    await shot('09-after-film');
    assert.equal(await page.evaluate(() => window.__os.setup.endCard), null, 'S245: no setup end card after the film');
    assert.deepEqual(await page.evaluate(() => window.__ledger()), adBefore, 'The played film files nothing');
    checks.push(`${name}: played film → ends by itself → All set (no end card); ledger unchanged; frame menu pauses setup. Diagnostic seek to the end.`);
    await page.close();
  }
  // The experienced route reaches Start quickly: no elapsed-time shortcut may bypass the content note.
  const page = await browser.newPage();
  await page.setViewport({ width:1280,height:720 });
  await page.goto(`http://localhost:${port}/?reinterp=1&debug=1&setup=1&home=0&kiosk=0&descent=0`, { waitUntil:'load' });
  await page.waitForFunction(() => window.__os?.setup?.stage === 'balloon-1');
  const press = async id => {
    await page.waitForFunction(id => window.__os.setup?.hits.some(h => h.id === id), {}, id);
    await page.evaluate(id => { const h=window.__os.setup.hits.find(h=>h.id===id);window.__os.handleClick(h.x+h.w/2,h.y+h.h/2); },id);
  };
  await press('setup-choice-1');
  await page.waitForFunction(() => window.__os.setup.stage === 'note');
  await press('setup-close'); await press('setup-choice-1'); await press('setup-advert-play-0');
  await page.waitForFunction(() => window.__os.setup.film?.duration > 1); await page.evaluate(() => { const f = window.__os.setup.film; f.currentTime = f.duration - 0.3; });
  await page.waitForFunction(() => window.__os.setup.stage === 'balloon-9', { timeout: 15000 });
  assert.equal(await page.evaluate(() => window.__os.setup.ready),false);
  assert.equal(await page.evaluate(() => window.__os.setup.hits.some(h=>h.id==='setup-choice-0')),false);
  await wait(4200); await press('setup-choice-0');
  const cut = await page.evaluate(async () => (await import('/src/state/cut.ts')).currentCut());
  assert.equal(cut,'speedrun');
  checks.push('Experienced route: content note still opens; Start disabled after closing until four seconds; Speedrun selection survives completion.');
  await page.close();
  assert.deepEqual(errors,[]);
} finally {
  await browser.close();
  fs.writeFileSync(path.join(out,'CAPTURE.json'),JSON.stringify({port,shots,checks,errors},null,2)+'\n');
}
console.log(checks.join('\n'));
