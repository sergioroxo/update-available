#!/usr/bin/env node
/**
 * AA STILLS — the same view with the browser's anti-aliasing off and on, for his eye (S357fp, 22 Nov: "we need to try
 * and find solutions of the serrated lines").
 *
 *     node tools/aa-stills.mjs --port 5621 [--out out/aa] [--dpr 1,2] [--only e1]
 *
 * For each era: the authored seat and one room view, each shot with `?aa=0` (the old canvas) and without it (MSAA on),
 * at each device pixel ratio asked for. DPR 1 is the worst case (an ordinary external monitor, many Windows laptops):
 * nothing smaller than a pixel hides a stair-step there. Jumps are used freely: a still is not a reachability claim.
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const PORT = Number(flag('port', 5621));
const OUT = path.resolve(flag('out', 'out/aa'));
const DPRS = flag('dpr', '1,2').split(',').map(Number);
const ONLY = flag('only', '');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
/** aa0 = the old canvas; aa1 = MSAA on (the new default); mip = MSAA + the room's pictures smoothed when shrunk (`?roommips=1`) */
const VARIANTS = [['aa0', '&aa=0'], ['aa1', ''], ['mip', '&roommips=1']];
const HIDE_CHROME = 'body > *:not(canvas) { display: none !important; }';

/** the room view per era: x, y, z, pitch, yaw (the stills tool's entrance for 1997; a corner for the others) */
const ROOM = {
  1: [1.0, 2.25, 2.55, -28, 22],
  2: [1.0, 2.25, 2.55, -28, 22],
  3: [1.0, 2.25, 2.55, -28, 22],
  4: [1.0, 2.25, 2.55, -28, 22]
};

async function main() {
  const puppeteer = (await import('puppeteer-core')).default;
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: true,
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox']
  });
  fs.mkdirSync(OUT, { recursive: true });
  const log = [];
  for (const n of [1, 2, 3, 4]) {
    if (ONLY && ONLY !== `e${n}`) continue;
    for (const dpr of DPRS) for (const [vt, vq] of VARIANTS) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: dpr });
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
      const base = n === 1 ? '?reinterp=1&kiosk=0&debug=1&home=0' : `?reinterp=1&kiosk=0&era=${n}&debug=1&descent=0`;
      const q = base + vq;
      await page.goto(`http://localhost:${PORT}/${q}`, { waitUntil: n === 3 ? 'domcontentloaded' : 'networkidle2', timeout: 90000 });
      if (n === 1) {
        await page.waitForFunction(() => [...document.querySelectorAll('button')]
          .some((b) => (b.textContent || '').includes('Log in') && !b.disabled), { timeout: 30000 }).catch(() => {});
        await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Log in')); if (b) b.click(); });
      }
      await page.waitForFunction(() => window.__os && window.__camFree && typeof window.__poses === 'function', { timeout: 60000 });
      await page.addStyleTag({ content: HIDE_CHROME });
      await wait(2500);
      const settled = async (ms = 40000) => {
        const t0 = Date.now();
        while (Date.now() - t0 < ms) {
          const p = await page.evaluate(() => window.__camPose());
          if (!p.driven && !p.descent) return;
          await wait(500);
        }
      };
      const samples = await page.evaluate(() => {
        const c = document.querySelector('canvas');
        const gl = c && (c.getContext('webgl2') || c.getContext('webgl'));
        return gl ? { samples: gl.getParameter(gl.SAMPLES), aa: gl.getContextAttributes().antialias } : null;
      });
      await settled();
      const seatKey = `r${n === 3 ? 2 : n === 4 ? 3 : 1}`;
      await page.evaluate((k) => { const P = window.__poses(); const p = P.seats[k] || P.seats.r1; window.__camFree(p.x, p.y, p.z, p.pitch, p.yaw); }, seatKey);
      await wait(1500);
      const tag = `e${n}-dpr${dpr}-${vt}`;
      await page.screenshot({ path: path.join(OUT, `${tag}-seat.png`) });
      await page.evaluate((a) => window.__camFree(a[0], a[1], a[2], a[3], a[4]), ROOM[n]);
      await wait(1500);
      await page.screenshot({ path: path.join(OUT, `${tag}-room.png`) });
      const line = `${tag}  samples=${samples?.samples} antialias=${samples?.aa}${errors.length ? '  errors: ' + errors.slice(0, 2).join(' · ') : ''}`;
      console.log(line); log.push(line);
      await page.close();
    }
  }
  fs.writeFileSync(path.join(OUT, 'AA.txt'), log.join('\n') + '\n');
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
