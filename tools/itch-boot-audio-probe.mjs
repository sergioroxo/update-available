/** Diagnostic opening check: seek only the setup film, then run the real entrance clock.
 * Mock XR checks ordering, not headset latency. No production shortcuts are added. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const i = process.argv.indexOf('--port'), port = i < 0 ? '5191' : process.argv[i + 1];
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox'], defaultViewport: { width: 1280, height: 720 } });
fs.mkdirSync('out/itch', { recursive: true });
const results = [];
const wait = ms => new Promise(r => setTimeout(r, ms));
try {
  for (const mockedXr of [false, true]) {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.evaluateOnNewDocument(() => {
      window.__bootTiming = { cues: [], restoreAt: null };
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (...args) {
        if (this.src.endsWith('/boot_1997_machine.mp3')) {
          const cue = { requestedAt: performance.now(), phase: document.getElementById('restore-entrance')?.dataset.phase };
          window.__bootTiming.cues.push(cue);
          this.addEventListener('playing', () => { cue.playingAt = performance.now(); }, { once: true });
        }
        return play.apply(this, args);
      };
      new MutationObserver(() => {
        if (window.__bootTiming.restoreAt === null && document.getElementById('restore-entrance')?.dataset.phase === 'restore')
          window.__bootTiming.restoreAt = performance.now();
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-phase'] });
    });
    await page.goto(`http://localhost:${port}/?reinterp=1&debug=1&kiosk=0`, { waitUntil: 'networkidle2' });
    const stage = name => page.waitForFunction(n => document.getElementById('restore-entrance')?.dataset.setupStage === n, { timeout: 45000 }, name);
    const press = async id => {
      await page.waitForFunction(id => JSON.parse(document.getElementById('restore-entrance')?.dataset.setupHits || '[]').some(h => h.id === id), { timeout: 45000 }, id);
      const h = await page.evaluate(id => JSON.parse(document.getElementById('restore-entrance').dataset.setupHits).find(h => h.id === id), id);
      await page.mouse.click(h.x + h.w / 2, h.y + h.h / 2); await wait(250);
    };
    await page.waitForSelector('#restore-entrance[data-phase="wake"]'); await page.mouse.click(640, 360);
    // Take the setup's ordinary dismissal route; the care note remains mandatory.
    await press('setup-choice-1'); await stage('note'); await wait(500); await press('setup-close');
    await press('setup-advert-play-0'); await stage('advert');
    await page.waitForFunction(() => window.__os.setup.film?.duration > 1);
    await page.evaluate(() => { const f = window.__os.setup.film; f.currentTime = f.duration - 0.3; });
    await stage('balloon-9'); await wait(4500);
    if (mockedXr) await page.evaluate(() => Object.defineProperty(window.__app.xr, 'active', { configurable: true, get: () => true }));
    await press('setup-choice-0');
    await page.waitForFunction(() => window.__bootTiming.restoreAt !== null, { timeout: 15000 });
    // A menu hold must freeze both entrance and cue, without losing the cue.
    if (mockedXr) {
      await page.evaluate(async () => (await import('/src/state/gameMenuBus.ts')).gameMenuBus.open());
      await wait(1500);
      assert.equal(await page.evaluate(() => window.__bootTiming.cues.length), 0, 'cue ran behind paused menu');
      await page.evaluate(async () => (await import('/src/state/gameMenuBus.ts')).gameMenuBus.close());
    }
    await page.waitForFunction(() => window.__bootTiming.cues.some(c => c.playingAt), { timeout: 12000 });
    await wait(500);
    const timing = await page.evaluate(() => window.__bootTiming);
    assert.equal(timing.cues.length, 1, 'machine cue must fire once');
    assert.equal(timing.cues[0].phase, 'restore', 'machine must start during the room restoration');
    const delay = (timing.cues[0].requestedAt - timing.restoreAt) / 1000;
    assert(delay >= 3.5 && delay < (mockedXr ? 7 : 5.5), 'unexpected cue delay: ' + delay);
    assert.deepEqual(errors, []);
    results.push({ mockedXr, menuHoldSeconds: mockedXr ? 1.5 : 0, delaySeconds: delay, ...timing, errors });
    await page.screenshot({ path: `out/itch/boot-audio-${mockedXr ? 'mock-xr' : 'browser'}.png` });
    await page.close();
  }
  fs.writeFileSync('out/itch/boot-audio.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
