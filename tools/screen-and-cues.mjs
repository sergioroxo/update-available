import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const phase = process.argv[2] || 'after';
const out = path.resolve('out/screen-and-cues');
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox']
});
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const measurements = [];
const views = process.argv.includes('--square') ? [[960, 960]] : [[1280, 720], [1440, 900], [390, 844]];
try {
  for (const [width, height] of views) {
    for (const era of [1, 2, 3, 4]) {
      const page = await browser.newPage();
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      const errors = [];
      page.on('pageerror', (error) => errors.push(String(error)));
      await page.goto(`http://localhost:3204/?reinterp=1&debug=1&descent=0&home=0&kiosk=0${era === 1 ? '' : `&era=${era}`}`, { waitUntil: 'networkidle2' });
      if (era === 1) {
        await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Log in') && !b.disabled));
        await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Log in')).click());
      }
      await page.waitForFunction(() => window.__app && window.__os && window.__poses);
      await page.evaluate((era) => {
        if (era === 1) window.__os.debugJump('kit');
        if (era === 2) window.__os.debugJump('e2Restorify');
        if (era === 4) window.__os.debugJump('e4Browser');
        if (era === 4) window.__os.e4.browser.debugJumpTo('search');
        const p = window.__poses().seats[era < 3 ? 'r1' : era === 3 ? 'r2' : 'r3'];
        window.__camFree(p.x, p.y, p.z, p.pitch, p.yaw);
      }, era);
      await wait(6500);
      const result = await page.evaluate(async (era) => {
        const app = window.__app;
        const Vec3 = app.root.getPosition().constructor;
        const cam = app.root.findByName('camera');
        const entity = app.root.findByName(era < 3 ? 'desktop-screen' : era === 3 ? 'era3-device-workstation' : 'era3-device-monitor');
        if (!cam?.camera || !entity) throw new Error('Missing camera or screen');
        const matrix = entity.getWorldTransform();
        const corners = [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]].map(([x, z]) => {
          const p = cam.camera.worldToScreen(matrix.transformPoint(new Vec3(x, 0, z)));
          return { x: p.x, y: p.y, z: p.z };
        });
        const w = window.innerWidth, h = window.innerHeight;
        const area = Math.abs(corners.reduce((sum, p, i) => {
          const next = corners[(i + 1) % corners.length];
          return sum + p.x * next.y - next.x * p.y;
        }, 0)) / 2;
        return {
          era, width: w, height: h, fov: cam.camera.fov,
          pose: window.__camPose(), corners,
          widthPct: (Math.max(...corners.map(p => p.x)) - Math.min(...corners.map(p => p.x))) / w * 100,
          heightPct: (Math.max(...corners.map(p => p.y)) - Math.min(...corners.map(p => p.y))) / h * 100,
          areaPct: area / (w * h) * 100,
          whole: corners.every(p => p.z > 0 && p.x >= 0 && p.x <= w && p.y >= 0 && p.y <= h)
        };
      }, era);
      measurements.push({ ...result, errors });
      await page.addStyleTag({ content: '#debug-panel, #motion-diagnostic { display: none !important; }' });
      await page.screenshot({ path: path.join(out, `${phase}-e${era}-${width}x${height}.png`) });
      console.log(`${phase} E${era} ${width}x${height}: ${result.areaPct.toFixed(2)}% area, ${result.widthPct.toFixed(1)}% width, ${result.heightPct.toFixed(1)}% height, whole=${result.whole}`);
      await page.close();
    }
  }
  fs.writeFileSync(path.join(out, `${phase}-measurements.json`), JSON.stringify(measurements, null, 2) + '\n');
} finally {
  await browser.close();
}
