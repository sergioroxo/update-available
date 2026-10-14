#!/usr/bin/env node
/** S245 — the opening film in the setup: real presses through the floating door, stills of the offer, the film at three
 *  moments and the step after it, at 1280×720 and 390×844. Checks: Show me is the only button; the film publishes NO hit
 *  (no Skip, no close); Esc pauses it and resuming plays it on; mute reaches it; when it ends the setup moves on to
 *  "All set" by itself, with no end card. Seeks are DIAGNOSTIC (to reach the three moments quickly); the walker never seeks.
 *  Always pass --port. Tooling, never part of the runtime. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i < 0 ? d : process.argv[i + 1]; };
const port = arg('port'); if (!port || port === '3000') throw new Error('Pass the task port with --port (never 3000).');
const out = path.resolve(arg('out', 'out/advert-in-setup')); fs.mkdirSync(out, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: arg('chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'), headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox'] });
const errors = [], checks = [], shots = [];
try {
  for (const [name, width, height] of [['laptop', 1280, 720], ['phone', 390, 844]]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: name === 'phone', hasTouch: name === 'phone' });
    page.on('pageerror', e => errors.push(name + ': ' + String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(name + ': ' + m.text()); });
    await page.goto(`http://localhost:${port}/?reinterp=1&kiosk=0&debug=1&descent=0`, { waitUntil: 'load', timeout: 240000 });
    await page.waitForSelector('#restore-entrance[data-phase="wake"]', { timeout: 180000 });
    const shot = async label => { await wait(250); const f = `${name}-${label}.png`; await page.screenshot({ path: path.join(out, f) }); shots.push(f); };
    const hits = () => page.evaluate(() => JSON.parse(document.getElementById('restore-entrance')?.dataset.setupHits || '[]').map(h => h.id));
    const tap = async (x, y) => { if (name === 'phone') await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
    const press = async id => {
      await page.waitForFunction(id => JSON.parse(document.getElementById('restore-entrance')?.dataset.setupHits || '[]').some(h => h.id === id), { timeout: 60000 }, id);
      const h = await page.evaluate(id => JSON.parse(document.getElementById('restore-entrance').dataset.setupHits).find(h => h.id === id), id);
      await tap(h.x + h.w / 2, h.y + h.h / 2); await wait(350);
    };
    const stage = s => page.waitForFunction(s => document.getElementById('restore-entrance')?.dataset.setupStage === s, { timeout: 60000 }, s);
    await tap(width / 2, height / 2);
    // the quick path: "I know what to do" jumps to the content note; the advert must still follow the version choice
    await press('setup-choice-1'); await stage('note'); await press('setup-close');
    await stage('balloon-7'); await press('setup-choice-0');   // the full piece
    await stage('balloon-8');
    await shot('01-balloon');
    const offer = await hits();
    assert.deepEqual(offer.filter(i => i !== 'setup-dismiss'), ['setup-advert-play-0'], name + ': the offer has exactly one control: ' + offer);
    // the balloon's own x compacts it; the compact window must carry no close box (a bypass)
    if (offer.includes('setup-dismiss')) await press('setup-dismiss');   // the quick path arrives already compact
    const compact = await hits();
    assert.ok(!compact.includes('setup-compact-close'), name + ': dismissing the balloon must not offer a way past the film: ' + compact);
    await press('setup-advert-play-0');
    await stage('advert');
    await page.waitForFunction(() => window.__os.setup.film && !window.__os.setup.film.paused && window.__os.setup.film.currentTime > 1.5, { timeout: 60000 });
    await shot('02-film-t3');
    assert.deepEqual(await hits(), [], name + ': the film publishes no hit at all');
    // mute reaches it
    const muted = await page.evaluate(async () => { const m = await import('/src/audio/tapeAudio.ts'); m.setOneShotsMuted(true); const a = window.__os.setup.film.muted; m.setOneShotsMuted(false); return a; });
    assert.equal(muted, true, name + ': the frame mute must reach the film');
    // the menu holds it: Esc pauses, a second Esc resumes
    await page.keyboard.press('Escape'); await wait(600);
    const held = await page.evaluate(() => ({ paused: window.__os.setup.film.paused, t: window.__os.setup.film.currentTime }));
    assert.equal(held.paused, true, name + ': the menu must pause the film');
    await wait(1500);
    const t1 = await page.evaluate(() => window.__os.setup.film.currentTime);
    assert.ok(Math.abs(t1 - held.t) < 0.2, name + ': the film must not advance while the menu is open');
    await shot('02b-menu-open');
    await page.keyboard.press('Escape'); await wait(1800);
    const after = await page.evaluate(() => ({ paused: window.__os.setup.film.paused, t: window.__os.setup.film.currentTime }));
    assert.equal(after.paused, false, name + ': closing the menu must resume the film');
    assert.ok(after.t > held.t + 0.8, name + ': the film must carry on after the menu closes');
    checks.push(`${name}: Esc pauses the film (${held.t.toFixed(1)} s, frozen across 1.5 s), resumes after`);
    // three moments (diagnostic seeks)
    for (const [t, label] of [[30, '03-film-t30'], [60, '04-film-t60']]) {
      await page.evaluate(t => { window.__os.setup.film.currentTime = t; }, t);
      await page.waitForFunction(t => window.__os.setup.film.currentTime > t + 0.4, { timeout: 30000 }, t); await shot(label);
    }
    await page.evaluate(() => { const f = window.__os.setup.film; f.currentTime = f.duration - 0.6; });
    await page.waitForFunction(() => window.__os.setup.stage === 'balloon-9', { timeout: 30000 });
    await shot('05-after-film');
    assert.equal(await page.evaluate(() => window.__os.setup.endCard), null, name + ': no setup end card after the film');
    checks.push(`${name}: offer = one button; compact balloon has no close box; film publishes no hit; ends -> "All set", no end card`);
    await page.close();
  }
} finally { await browser.close(); }
console.log(checks.join('\n')); console.log('shots:', shots.join(' '));
if (errors.length) { console.error('console errors:\n' + [...new Set(errors)].join('\n')); process.exitCode = 1; }
