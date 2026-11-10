#!/usr/bin/env node
/**
 * THE NAMING'S TAGS, MEASURED FROM THE SEAT (S355, UiB job 11 Part B).
 *
 *     node tools/commons-tag-legibility.mjs --port 3354 [--out out/s355/legibility.json]
 *
 * The tags are the only words the stream's lesson rides on, so they are measured, not eyeballed. A companion to
 * `tools/screen-density-check.mjs` (Codex, 8 Nov), whose table had the Commons stream as "not sampled". This lands
 * on the naming (`__os.debugJump('e4Naming')`), waits for tags to be stamped, and reports for each surface that
 * carries a tag — the GLASS (the visor: the tags above the host's caption band) and the SCREEN (the stream's plane:
 * the same words in the chat column) —
 *   · the tag's font size in canvas px (read from the real fillText calls while the tags draw),
 *   · the surface's angular size and source texels per degree from the eye,
 *   · the ANGULAR HEIGHT of the tag's font (px × degrees per px),
 * at the browser seat (the Commons spot) and at the headset seat (XR forced active, the head leaned 0.15 m forward,
 * as Codex's report did). PASS: ≥ 0.5° (Codex's 12-px reading minimum on the 2026 monitor); aim 0.65°.
 *
 * Geometry, not optics: degrees are from the eye point to the plane's corners; a real headset's lenses, its
 * display pixels per degree and the wearer's eyes are not in it. It cannot replace his look in the Quest.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const PORT = Number(flag('port', 3000));
const OUT = path.resolve(flag('out', 'out/s355/legibility.json'));
const PASS = 0.5, AIM = 0.65, LEAN = 0.15;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle'], defaultViewport: { width: 1280, height: 720 } });
let report;
try {
  const page = await browser.newPage();
  // every fillText's font size, per canvas, with the text it drew (so a tag's size is read, not assumed)
  await page.evaluateOnNewDocument(() => {
    window.__drawn = new WeakMap();
    const raw = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...a) {
      const n = Number(this.font.match(/([\d.]+)px/)?.[1]);
      const m = window.__drawn.get(this.canvas) ?? new Map();
      if (n) m.set(String(a[0]), n);
      window.__drawn.set(this.canvas, m);
      return raw.apply(this, a);
    };
  });
  await page.goto(`http://127.0.0.1:${PORT}/?reinterp=1&kiosk=0&era=4&debug=1&descent=0`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__os && window.__camFree && window.__camPose, { timeout: 90000 });
  await wait(6000);
  await page.evaluate(() => window.__os.debugJump('e4Naming'));
  await page.waitForFunction(() => window.__os.e4.ball.tagsShown >= 3, { timeout: 30000 });
  await page.evaluate(() => window.__camFree(5.2, 1.16, 0.7, 1, 270));
  await wait(1500);
  report = await page.evaluate(async ({ LEAN }) => {
    const pc = await import('/node_modules/.vite/deps/playcanvas.js');
    const a = window.__app, os = window.__os, ball = os.e4.ball;
    const tagTexts = (await import('/data/dialog/s4_ball.json')).default.naming.rows.map((r) => r.tag);
    const devices = window.__era3Devices();
    const surfaces = { glass: { entity: 'era4-visor', canvas: os.canvas, logicalH: 384 }, screen: { entity: 'era3-device-stream', canvas: devices.stream, logicalH: 198 } };
    const measure = (xr) => {
      let cam = null; a.root.forEach((e) => { if (e.camera && e.enabled) cam = e; });
      const eye = cam.getPosition().clone();
      if (xr) eye.x += LEAN;   // the XR seat leans toward the stage (+x is forward at the spot)
      const ang = (p, q) => Math.acos(Math.max(-1, Math.min(1, p.clone().sub(eye).normalize().dot(q.clone().sub(eye).normalize())))) * 180 / Math.PI;
      const out = {};
      for (const [name, s] of Object.entries(surfaces)) {
        const e = a.root.findByName(s.entity);
        if (!e || !e.enabled) { out[name] = { missing: true }; continue; }
        const m = e.getWorldTransform();
        const v = ang(m.transformPoint(new pc.Vec3(0, 0, -0.5)), m.transformPoint(new pc.Vec3(0, 0, 0.5)));
        const h = ang(m.transformPoint(new pc.Vec3(-0.5, 0, 0)), m.transformPoint(new pc.Vec3(0.5, 0, 0)));
        const drawn = window.__drawn.get(s.canvas) ?? new Map();
        // the canvas is drawn at a device scale: its fillText sizes are in LOGICAL px (the shell sets the transform)
        const sizes = tagTexts.map((t) => drawn.get(t)).filter(Boolean);
        const px = sizes.length ? Math.min(...sizes) : null;
        const degPerPx = v / s.logicalH;
        out[name] = { degrees: [+h.toFixed(2), +v.toFixed(2)], metres: +e.getPosition().distance(eye).toFixed(3),
          texelsPerDegreeV: +(s.canvas.height / v).toFixed(1), tagFontPx: px, tagDegrees: px ? +(px * degPerPx).toFixed(3) : null };
      }
      return out;
    };
    const browserSeat = measure(false);
    try { Object.defineProperty(a.xr, 'active', { configurable: true, get: () => true }); } catch { /* already */ }
    os.update(0); a.fire('update', 0.016);
    const headsetSeat = measure(true);
    return { at: new Date().toISOString(), phase: ball.phase, tagsShown: ball.tagsShown, browserSeat, headsetSeat };
  }, { LEAN });
  for (const seat of ['browserSeat', 'headsetSeat']) for (const s of Object.values(report[seat])) {
    if (s.tagDegrees != null) s.verdict = s.tagDegrees >= AIM ? 'pass (aim met)' : s.tagDegrees >= PASS ? 'pass' : 'FAIL';
  }
  report.pass = PASS; report.aim = AIM; report.lean = LEAN;
} finally {
  await browser.close();
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
