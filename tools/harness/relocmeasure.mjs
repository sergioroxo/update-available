/**
 * Fly each relocation and measure: peak draw calls (the Quest ≤60 budget),
 * and every PlayCanvas ASSERT the run emits (the eight terminalFrame ones).
 */
import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox'],
  defaultViewport: { width: 1280, height: 860 }
});
const page = await browser.newPage();
const asserts = [];
page.on('console', (m) => { const t = m.text(); if (/ASSERT|Invalid batch/i.test(t)) asserts.push(t.slice(0, 120)); });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));

await page.goto('http://localhost:5173/?reinterp=1&era=2&debug=1&descent=0', { waitUntil: 'networkidle2', timeout: 60000 });
await page.waitForFunction(() => window.__app !== undefined, { timeout: 30000 });
await new Promise((r) => setTimeout(r, 7000));

async function fly(label, from, to, seconds) {
  asserts.length = 0;
  // drive the real path through the debug panel's own relocate handler
  const found = await page.evaluate((a) => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find((x) => x.textContent.includes(a));
    if (b) { b.click(); return b.textContent.trim(); }
    return null;
  }, label);
  if (!found) { console.log(`button "${label}" not found`); return; }
  const samples = [];
  const t0 = Date.now();
  while (Date.now() - t0 < seconds * 1000) {
    samples.push(await page.evaluate(() => window.__drawCalls ?? 0));
    await new Promise((r) => setTimeout(r, 120));
  }
  const peak = Math.max(...samples);
  const over = samples.filter((v) => v > 60).length;
  console.log(`${from}→${to}: peak ${peak} draw calls · ${over}/${samples.length} samples over 60 · asserts this leg: ${asserts.length}`);
  if (asserts.length) console.log('   e.g. ' + asserts[0]);
}

await fly('2 · E2→E3', 'E2', 'E3', 32);
await new Promise((r) => setTimeout(r, 2000));
await fly('3 · E3→E4', 'E3', 'E4', 45);

await browser.close();
