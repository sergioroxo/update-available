#!/usr/bin/env node
/**
 * S377 (UiB job 19 Part C, review #5) — NOTHING BETWEEN YOU AND THE MACHINE, measured on the screen.
 *
 *     node tools/s377-close-check.mjs --port 5299 [--mode xr] [--out out/s377/close-check]
 *
 * R4-15 (his, S174): "nothing between you and it — no stars, labels, link lines or panels on the line from your eye to
 * the machine, far or near". It regressed (VISUAL_REVIEW_2026-11-12 #5): while the 1997 panel is read the dark machine
 * already stands in the sky, and the sight-line was only kept once it was LIT; and at the Restart card a label 30 cm
 * from the eye lay across the bezel because the cull tested its centre against a fixed margin.
 *
 * This plays the Close as close-order-probe.mjs does (era 4, `__enterClose()`, a press per message card) and, at two
 * moments — the panels open (the machine dark in the sky) and the Restart card up — projects every label quad that is
 * drawn (`__closeLabels()`, its `folded` flag) and the machine's world box (`__closeMonitor.bounds`) through the live
 * camera into SCREEN pixels, and counts the drawn labels whose rectangle meets the machine's and that stand in front of
 * it. That is a different calculation from the cloud's own (which works in the glass plane from the eye), so it can
 * catch the cloud being wrong. It also photographs both moments.
 * Exit 1 when any drawn label crosses the machine. Links and stars are judged on the photographs.
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const XR = flag('mode', 'desktop') === 'xr';
const OUT = path.resolve(flag('out', 'out/s377/close-check'));
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const puppeteer = (await import('puppeteer-core')).default;
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox'], defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 2 } });
const tag = XR ? 'xr' : 'desktop';
let bad = 0;
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=4&debug=1&home=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__os && window.__camPose && window.__app && window.__enterClose, { timeout: 120000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel { display: none !important; }' });
  if (XR) {
    await page.evaluate(() => { const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true }); head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90; });
    await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
  }
  await wait(6000);
  /** in the page: every drawn label whose screen rectangle meets the machine's and that is nearer than its glass */
  const measure = () => page.evaluate(() => {
    const app = window.__app, cam = app.root.findByName('camera'), c = cam.camera, cm = window.__closeMonitor;
    const V = cam.getPosition().constructor;
    const b = cm.bounds; if (!b) return { error: 'no __closeMonitor.bounds' };
    const scr = (x, y, z) => c.worldToScreen(new V(x, y, z));
    const rect = (pts) => { const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y); return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }; };
    const corners = []; for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) corners.push(scr(x, y, z));
    const m = rect(corners);
    const eye = cam.getPosition(), fwd = cam.forward;
    const depth = (x, y, z) => (x - eye.x) * fwd.x + (y - eye.y) * fwd.y + (z - eye.z) * fwd.z;
    const glassDepth = depth((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, b.max.z);
    const right = cam.right, up = cam.up;
    const labels = window.__closeLabels();
    const hits = [], fadedHits = [];
    for (const L of labels) {
      if (L.folded) continue;   // folded off the sight-line
      const d = depth(L.x, L.y, L.z);
      if (d <= 0.05 || d >= glassDepth) continue;   // behind the eye, or behind the glass (the body hides it)
      const hw = L.hw, hh = L.hh;
      const q = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, k]) => scr(L.x + right.x * hw * a + up.x * hh * k, L.y + right.y * hw * a + up.y * hh * k, L.z + right.z * hw * a + up.z * hh * k));
      const r = rect(q);
      // a label faded out with the sky (the Restart card) is not drawn; it is counted apart, so the fold is still judged on its own
      if (r.x1 >= m.x0 && r.x0 <= m.x1 && r.y1 >= m.y0 && r.y0 <= m.y1) (L.receded >= 0.99 ? fadedHits : hits).push({ text: L.text, d: +d.toFixed(2), rect: [r.x0, r.y0, r.x1, r.y1].map(Math.round) });
    }
    return { machine: [m.x0, m.y0, m.x1, m.y1].map(Math.round), glassDepth: +glassDepth.toFixed(2), drawn: labels.filter((l) => !l.folded).length, folded: labels.filter((l) => l.folded).length, receded: labels[0]?.receded ?? 0, near: !!cm.near, hits, fadedHits, state: window.__closeState() };
  });
  await page.evaluate(() => window.__enterClose());
  const t0 = Date.now();
  let pressed = -1, panelsDone = false;
  const report = {};
  while ((Date.now() - t0) / 1000 < 420) {
    const st = await page.evaluate(() => window.__closeState());
    if (st.stage === 'message' && st.card !== pressed) {
      await wait(1500);
      if (XR) await page.evaluate(() => window.__app.root.findByName('camera').setLocalEulerAngles(0, 0, 0));
      await page.mouse.click(640, 360); pressed = st.card; await wait(900); continue;
    }
    if (st.panels && (st.stage === 'open' || st.stage === 'settled') && !panelsDone) {
      panelsDone = true; await wait(12000);
      // the 1997 panel, read from the seat, with the dark machine in the sky under it (the review's f070 frame)
      const q = (await page.evaluate(() => window.__closePanels())).find((x) => x.era === 1);
      if (q && !XR) await page.evaluate((tg) => { const E = window.__camPose(); const dx = tg.x - E.x, dy = tg.y - 0.25 - E.y, dz = tg.z - E.z; window.__camFree(E.x, E.y, E.z, Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI, Math.atan2(-dx, -dz) * 180 / Math.PI); }, q);
      await wait(1500);
      report.panels = await measure();
      await page.screenshot({ path: path.join(OUT, `${tag}-panels.png`) });
      if (!XR) await page.evaluate(() => { const E = window.__camPose(); const g = window.__closeMonitor.glass; const dx = g.x - E.x, dy = g.y - E.y, dz = g.z - E.z; window.__camFree(E.x, E.y, E.z, Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI, Math.atan2(-dx, -dz) * 180 / Math.PI); });
      await wait(1500);
      report.machine = await measure();
      await page.screenshot({ path: path.join(OUT, `${tag}-machine.png`) });
      continue;
    }
    if (!st.stage && st.monitor) {
      // the card lights far, then the piece brings the eye to it (app.ts: CLOSE_LIBRARY_APPROACH_SECONDS); both are measured
      await wait(2500);
      report.cardFar = await measure();
      await page.screenshot({ path: path.join(OUT, `${tag}-card-far.png`) });
      await page.waitForFunction(() => window.__closeMonitor?.near, { timeout: 60000 }).catch(() => {});
      await wait(2500);   // and the recede has run (1.2 s)
      report.card = await measure();
      await page.screenshot({ path: path.join(OUT, `${tag}-card.png`) });
      break;
    }
    await wait(1200);
  }
  for (const [k, r] of Object.entries(report)) {
    const n = r.hits?.length ?? -1;
    if (n !== 0) bad++;
    console.log(`${tag} ${k}: ${r.error ?? `${r.near ? "eye at the glass, " : ""}labels receded ${(+r.receded).toFixed(2)}; ${r.drawn} labels drawn, ${r.folded} folded; ${n} drawn label(s) cross the machine ${JSON.stringify(r.machine)}${n ? ' — ' + r.hits.map((h) => `"${h.text}" at ${h.d} m`).join(', ') : ''}`}`);
  }
  if (!report.card) { console.log(`${tag}: the Restart card was not reached`); bad++; }
  if (errors.length) console.log(`page errors: ${errors.slice(0, 3).join(' · ')}`);
  fs.writeFileSync(path.join(OUT, `${tag}-report.json`), JSON.stringify(report, null, 1));
} finally {
  await Promise.race([browser.close(), wait(5000)]);
}
process.exit(bad ? 1 : 0);
