#!/usr/bin/env node
/**
 * PLATES — the four empty rooms, photographed from the piece itself.
 *
 * The advert's 0:41–0:53 shot ("four empty rooms … each machine is on. Nobody is there.") is not redrawn: it is
 * the piece's own PlayCanvas rooms, loaded exactly as a visitor loads them (`?reinterp=1&era=N`), with the debug
 * camera (`window.__camFree`, the same hook tools/stills.mjs uses) flown on a slow push-in, one screenshot per
 * video frame. Two props are MOVED for the shot, in the live scene graph, never in data/: the 2016 phone goes
 * from Vera's desk onto her duvet, the 2026 headset from Maya's desk stand onto her made bed (the design's
 * wording). Nothing else is touched. The 2026 framing keeps the wall's party poster and party calendar OUT of
 * frame: those are Maya's respite objects, and the advert (the programme's voice) must never target through them.
 *
 *   node out/lambyos-advert/src/plates.mjs --port 3000 [--still]     (a vite dev server must be running)
 * Out: .advert-tmp/plates/e{1..4}/NNNN.png (960×540 by default), `--still` writes the first and last frame only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const PORT = Number(flag('port', 3000));
const STILL = argv.includes('--still');
const ONLY = flag('only', '');
const FPS = 30;
// the advert's VHS pass works at 960×540, so the plates need no more than that (and render ~4× faster in software GL)
const SIZE = { width: Number(flag('width', 960)), height: Number(flag('height', 540)) };
const OUT = path.join(ROOT, '.advert-tmp/plates');
const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** eye → target as the debug camera's pitch/yaw (tools/stills.mjs `aim`) */
const aim = (E, T) => {
  const dx = T[0] - E[0], dy = T[1] - E[1], dz = T[2] - E[2];
  return [E[0], E[1], E[2], Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI, Math.atan2(-dx, -dz) * 180 / Math.PI];
};

/** each room: a push-in from `from` to `to` (eye, target), and its staging */
export const ROOMS = [
  { era: 1, seconds: 4.2, from: [[1.05, 2.15, 2.5], [-0.1, 0.8, -0.1]], to: [[0.75, 1.75, 1.85], [-0.1, 0.85, -0.2]], jump: 'desktop' },
  { era: 2, seconds: 4.2, from: [[1.05, 2.15, 2.5], [-0.1, 0.8, -0.1]], to: [[0.75, 1.75, 1.85], [-0.1, 0.85, -0.2]] },
  { era: 3, seconds: 4.2, from: [[-2.55, 1.55, 0.95], [-3.95, 0.45, -0.25]], to: [[-3.15, 1.2, 0.4], [-3.9, 0.47, -0.22]], stage: 'phoneOnDuvet' },
  { era: 4, seconds: 4.2, from: [[2.75, 1.5, 0.15], [4.05, 0.5, 1.7]], to: [[3.05, 1.3, 0.55], [4.05, 0.5, 1.75]], stage: 'headsetOnBed' }
];

const STAGES = {
  // 2016: Vera's phone off the desk and onto the duvet, face up, still glowing; its cradle stays on the desk
  phoneOnDuvet: () => {
    const root = window.__app.root, E = root.constructor;
    const dev = root.findByName('w_phoneDevice'), screen = root.findByName('era3-device-phone');
    if (!dev || !screen) return 'no phone';
    // the device system re-seats the originals every frame, so the shot uses clones (same meshes, the same live
    // screen material) grouped under one pivot, and hides the originals
    const pivot = new E('advert_phoneOnDuvet');
    root.addChild(pivot);
    pivot.setPosition(dev.getPosition());
    for (const src of [dev, screen]) {
      const c = src.clone();
      pivot.addChild(c);
      c.setPosition(src.getPosition());
      c.setRotation(src.getRotation());
      src.enabled = false;
    }
    pivot.setPosition(-3.9, 0.535, -0.2);
    pivot.setEulerAngles(0, 0, 90);   // the screen faced the seat (+x); a quarter-turn lays it face up
    pivot.setLocalScale(1.25, 1.25, 1.25);
    return 'ok';
  },
  // 2026: Maya's headset off its stand and onto the made bed; the stand stays on the desk
  headsetOnBed: () => {
    const hs = window.__app.root.findByName('e_headset');
    if (!hs) return 'no e_headset';
    const c = hs.clone(); c.name = 'advert_headsetOnBed';
    window.__app.root.addChild(c);
    hs.enabled = false;
    c.setPosition(4.0, 0.56, 1.65);
    c.setEulerAngles(0, 200, 0);
    return 'ok';
  }
};

const ease = (k) => k * k * (3 - 2 * k);

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: true,
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox'],
    defaultViewport: { ...SIZE, deviceScaleFactor: 1 }
  });
  for (const room of ROOMS) {
    if (ONLY && String(room.era) !== ONLY) continue;
    const dir = path.join(OUT, `e${room.era}`);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const page = await browser.newPage();
    const q = room.era === 1 ? '?reinterp=1&kiosk=0&debug=1&home=0' : `?reinterp=1&kiosk=0&era=${room.era}&debug=1&descent=0`;
    await page.goto(`http://localhost:${PORT}/${q}`, { waitUntil: 'load', timeout: 180000 });
    if (room.era === 1) {
      await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => (b.textContent || '').includes('Log in') && !b.disabled), { timeout: 60000 }).catch(() => {});
      await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Log in')); if (b) b.click(); });
    }
    await page.waitForFunction(() => window.__os && window.__camFree && window.__app && typeof window.__poses === 'function', { timeout: 180000 });
    await page.addStyleTag({ content: 'body > *:not(canvas) { display: none !important; }' });
    for (let k = 0; k < 80; k++) { const p = await page.evaluate(() => window.__camPose()); if (!p.driven && !p.descent) break; await wait(500); }
    if (room.jump) {
      await page.evaluate((b) => window.__os.debugJump(b), room.jump); await wait(2600);
      for (let k = 0; k < 80; k++) { const p = await page.evaluate(() => window.__camPose()); if (!p.driven && !p.descent) break; await wait(500); }
    }
    if (room.stage) console.log(`  e${room.era} stage ${room.stage}:`, await page.evaluate(STAGES[room.stage]));
    await wait(1200);
    const n = Math.round(room.seconds * FPS);
    const frames = STILL ? [0, n - 1] : [...Array(n).keys()];
    for (const f of frames) {
      const k = ease(f / (n - 1));
      const E = room.from[0].map((v, i) => v + (room.to[0][i] - v) * k);
      const T = room.from[1].map((v, i) => v + (room.to[1][i] - v) * k);
      await page.evaluate((a) => window.__camFree(...a), aim(E, T));
      // two engine frames so the pose is the one drawn
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      await page.screenshot({ path: path.join(dir, `${String(f).padStart(4, '0')}.png`) });
    }
    console.log(`e${room.era}: ${frames.length} frames`);
    await page.close();
  }
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
