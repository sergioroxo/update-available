/** Run after build:itch. Serves the nested build in the itch-like sandbox, with XR denied. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'out/itch');
fs.mkdirSync(out, { recursive: true });
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.webmanifest':'application/manifest+json', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.mp3':'audio/mpeg', '.mp4':'video/mp4', '.woff2':'font/woff2', '.glb':'model/gltf-binary' };
const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1);
  if (!rel || rel.endsWith('/')) rel += 'index.html';
  let file = root;
  // Validate each segment against actual directory entries, even on case-insensitive macOS.
  try {
    for (const segment of rel.split('/')) {
      if (segment === '..' || !fs.readdirSync(file).includes(segment)) throw Error('case/path mismatch');
      file = path.join(file, segment);
    }
    const data = fs.readFileSync(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream', 'Permissions-Policy':'xr-spatial-tracking=()' });
    res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true,
    args:['--enable-unsafe-swiftshader', '--autoplay-policy=user-gesture-required'], defaultViewport:{ width:1280, height:720 } });
  const results = [];
  for (const [name, query] of [['default', ''], ['keyboard', ''], ['review-switches-blocked', '?reinterp=0&debug=1&flat=1&era=4&setup=1&lambyrig=1&home=0&cut=full']]) {
    const page = await browser.newPage();
    const errors = [], foreign = [], missing = [], requests = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('request', r => { requests.push(r.url()); if (/^https?:/.test(r.url()) && new URL(r.url()).origin !== origin) foreign.push(r.url()); });
    page.on('response', r => { if (r.status() >= 400) missing.push([r.status(), r.url()]); });
    await page.evaluateOnNewDocument(() => {
      window.__mediaAudit = [];
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        const item = { src:this.src, gesture:navigator.userActivation.hasBeenActive, played:false, error:null };
        window.__mediaAudit.push(item);
        return play.call(this).then(() => { item.played = true; }, error => { item.error = error.name; throw error; });
      };
    });
    await page.goto(`${origin}/tools/itch-iframe-test.html`, { waitUntil:'networkidle0' });
    const frame = page.frames().find(f => f.url().includes('/dist-itch/'));
    assert(frame);
    if (query) await frame.goto(`${origin}/dist-itch/${query}`, { waitUntil:'networkidle0' });
    await frame.waitForSelector('#restore-entrance[data-phase="wake"]', { timeout:60000 });
    assert.equal(await frame.evaluate(() => document.documentElement.dataset.reinterp), '1');
    assert.equal(await frame.evaluate(() => window.__mediaAudit.length), 0, 'silent before gesture');
    assert.equal(await frame.evaluate(() => ['__os','__ledger','__camProbe','__setup','__heldDevices'].filter(k => k in window).length), 0, 'no diagnostic probes');
    assert.equal(await frame.evaluate(() => [...document.querySelectorAll('button')].some(b => b.textContent === 'Enter VR' && getComputedStyle(b).display !== 'none')), false);
    await page.screenshot({ path:path.join(out, `${name}-opening.png`) });
    if (name === 'keyboard') {
      await frame.evaluate(() => { const c = document.querySelector('#app'); c.tabIndex = 0; c.focus(); });
      await page.keyboard.press('Enter');
    }
    else await page.mouse.click(640, 360);
    await frame.waitForSelector('#restore-entrance[data-phase="setup"]');
    await frame.waitForFunction(() => window.__mediaAudit.some(m => m.played || m.error), { timeout:15000 });
    const media = await frame.evaluate(() => window.__mediaAudit);
    assert(media.some(m => m.played), 'first press plays sound');
    assert(media.every(m => m.gesture), 'audio starts after the first press');
    await new Promise(resolve => setTimeout(resolve, 4000));
    await page.screenshot({ path:path.join(out, `${name}-setup.png`) });
    assert.deepEqual(errors, []); assert.deepEqual(foreign, []); assert.deepEqual(missing, []);
    results.push({ name, errors, foreign, missing, requests:requests.length, media, opening:'wake', afterPress:'setup' });
    await page.close();
  }
  // The ordinary build still requires ?reinterp=1 and still permits its review tools.
  const normal = await browser.newPage();
  await normal.goto(`${origin}/dist/`, { waitUntil:'networkidle0' });
  assert.notEqual(await normal.evaluate(() => document.documentElement.dataset.reinterp), '1');
  await normal.goto(`${origin}/dist/?reinterp=1&debug=1`, { waitUntil:'networkidle0' });
  await normal.waitForSelector('#restore-entrance[data-phase="wake"]', { timeout:60000 });
  assert.equal(await normal.evaluate(() => document.documentElement.dataset.reinterp), '1');
  assert.equal(await normal.evaluate(() => typeof window.__os), 'object');
  await normal.close();
  results.push({ name:'normal-build', defaultReinterp:false, explicitReinterp:true, debugAvailable:true });
  fs.writeFileSync(path.join(out, 'smoke.json'), JSON.stringify(results, null, 2)+'\n');
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
