/** CX5 control: does the mocked-XR harness itself stop presenting frames? Jumps to Era 2 (no entrance, no setup),
 *  mocks app.xr.active as cx4-xr-check does, and reports whether requestAnimationFrame still fires over 20 s.
 *  node tools/cx5-mock-stall.mjs --port 3000 [--no-mock] */
import puppeteer from 'puppeteer-core';
const port = Number(process.argv[process.argv.indexOf('--port') + 1]);
const mock = !process.argv.includes('--no-mock');
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, protocolTimeout: 120000,
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-background-networking'], defaultViewport: { width: 960, height: 600 } });
const page = await browser.newPage(), errors = [];
page.on('pageerror', e => errors.push(String(e.stack || e)));
const wait = ms => new Promise(r => setTimeout(r, ms));
try {
  await page.goto(`http://localhost:${port}/?reinterp=1&debug=1&descent=0&home=0&kiosk=0&era=2`, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => /Log in/.test(b.textContent)); b?.click(); });
  await page.waitForFunction(() => window.__app && window.__xrComfort, { timeout: 60000 });
  if (mock) await page.evaluate(() => Object.defineProperty(window.__app.xr, 'active', { configurable: true, get: () => true }));
  for (let i = 0; i < 10; i++) {
    await wait(2000);
    const s = await page.evaluate(async () => ({ frame: window.__app.frame, phase: window.__os.phase, uploads: window.__uploads, draws: window.__drawCalls,
      raf: await Promise.race([new Promise(r => requestAnimationFrame(() => r('fired'))), new Promise(r => setTimeout(() => r('NO rAF'), 2000))]) }));
    console.log(i * 3 + 3, 's', JSON.stringify(s));
  }
  console.log('errors', errors.slice(0, 3));
} finally { await Promise.race([browser.close(), new Promise(r => setTimeout(() => { browser.process()?.kill('SIGKILL'); r(); }, 5000))]); }
