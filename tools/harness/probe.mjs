import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'http://localhost:5173/?reinterp=1&era=3&debug=1';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--window-size=1400,900',
    '--no-sandbox'
  ],
  defaultViewport: { width: 1400, height: 900 }
});

const page = await browser.newPage();
page.on('console', (m) => console.log('[console]', m.type(), m.text().slice(0, 300)));
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 400)));

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });

await new Promise((r) => setTimeout(r, 6000));

const info = await page.evaluate(() => {
  const w = window;
  const devs = w.__era3Devices ? w.__era3Devices() : null;
  return {
    hasDevices: !!w.__era3Devices,
    devsNull: devs === null,
    devKeys: devs ? Object.keys(devs) : null,
    sizes: devs ? Object.fromEntries(Object.entries(devs).map(([k, c]) => [k, c && c.width ? `${c.width}x${c.height}` : String(c)])) : null,
    hasMove: !!w.__requestMove,
    hasQueue: !!w.__graceQueue,
    queueNull: w.__graceQueue ? w.__graceQueue() === null : null,
    vis: document.visibilityState,
    canvases: [...document.querySelectorAll('canvas')].map((c) => `${c.id||'(noid)'} ${c.width}x${c.height}`)
  };
});
console.log(JSON.stringify(info, null, 2));

await browser.close();
