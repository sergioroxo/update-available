#!/usr/bin/env node
/**
 * TEXT ANGLE — how big is every piece of text, in DEGREES, from the headset seat. Fails anything under the floor.
 *
 *     node tools/text-angle.mjs --port 5294 [--eras 1,2,3,4] [--floor 0.8] [--out out/s373/text-angle.md] [--json out/x.json]
 *
 * ⚑ S373 / J18-A3 (docs/reinterp/IDEAS_XR_TEXT_2026-11-12.md, UIB_JOB_18). In the headset the text was too SMALL IN ANGLE
 * (monitors 0.70–0.81°, the small screens 0.35–0.70°, against a floor near 0.8° and comfort at 1.2–1.3°), and nothing could
 * say so without a headset. This is that check, the way tools/walk.mjs finds "unreachable": it runs the real app for each
 * era with a MOCKED headset (`app.xr.active` forced true so every canvas takes its headset size, ×4, as tools/xr-tour.mjs and
 * tools/j15-07-side-probe.mjs do), hooks every `fillText` (and the 5×7 game type, `src/room/font57.ts`, through its
 * `window.__f57` hook) to record the size of each line on each canvas, finds the entity that carries that canvas as a
 * texture, and from the entity's world size and its distance from the EYE (the seat plus xrComfort's 0.15 m lean) turns every
 * size into degrees:
 *
 *     angle = 2·atan( (px · ctxScale / canvasWidth · glassWidth) / (2 · distance) )
 *
 * where `px` is the font's EM size (the CSS font size), the unit the report and the reading studies use (a capital is about
 * 70 % of it). A 5×7 pixel type at scale s counts as a 10·s px font (7 dots = a capital). Held devices (the 1997 handheld,
 * the 2003 flip phone, the 2026 console) are measured as held: 0.42 m from the eye (heldDevice.ts XR_HOLD) with the glass
 * grown by its in-hand factor (max(1.3, 0.42/holdDist·0.8)).
 *
 * Output: a per-surface table (min / median / how many sizes and how many draws are under the floor, and the worst
 * sample), then a verdict. EXIT 1 if any surface has text under the floor. Part B of job 18 raises the sizes until it passes.
 *
 * Limits, honestly: only text drawn with fillText or the 5×7 type is seen (a sprite font or text baked into an image is not);
 * sizes are cumulative over the visit the tool makes (the jumps below), so a surface it does not open is not measured; a
 * line drawn once is weighed like a line drawn a hundred times in the table's `draws` columns but not in min/size counts.
 * The eye is the seat's, not a person's: someone sitting back sees everything smaller. Needs a Vite dev server on --port in
 * this worktree. Headless Chrome, swiftshader.
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0));
if (!PORT) { console.error('Pass --port (a Vite dev server of this worktree)'); process.exit(2); }
const ERAS = flag('eras', '1,2,3,4').split(',').map(Number);
const FLOOR = Number(flag('floor', 0.8));
const OUT = flag('out', null);
const JSON_OUT = flag('json', null);
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** the held devices: in-hand distance and the glass's growth (heldDevice.ts: XR_HOLD 0.42, bigInHand) */
const HELD = { 'danielHandheld-screen': 1.3, 'flipPhone-screen': Math.max(1.3, 0.42 / 0.19 * 0.8), 'e_console-screen': 1.3 };
const HOLD_DIST = 0.42;
const SURFACES = ['desktop-screen', 'witness-screen', 'era3-device-workstation', 'era3-device-monitor', 'era3-device-phone', 'era3-device-laptop',
  'era4-visor', 'era3-device-stream', 'era3-device-sidecard', ...Object.keys(HELD), 'close-monitor-screen'];

async function main() {
  const puppeteer = (await import('puppeteer-core')).default;
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 300000,
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--disable-background-networking'], defaultViewport: { width: 960, height: 600 } });
  const results = [];
  try {
    for (const era of ERAS) {
      const p = await browser.newPage();
      const errors = [];
      p.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
      await p.evaluateOnNewDocument(() => {
        // every fillText and every 5×7 line, per canvas: { size (px em), scale, count, sample }
        window.__txt = new WeakMap();
        const note = (canvas, em, scale, sample) => {
          if (!canvas || !(em > 0)) return;
          const list = window.__txt.get(canvas) ?? [];
          const key = `${em}|${scale}`;
          let row = list.find((x) => x.key === key);
          if (!row) { row = { key, em, scale, count: 0, sample: String(sample).slice(0, 36) }; list.push(row); }
          row.count++;
          window.__txt.set(canvas, list);
        };
        const raw = CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText = function (...args) {
          const m = this.font.match(/(\d+(?:\.\d+)?)px\s/);
          note(this.canvas, m ? Number(m[1]) : 0, this.getTransform().a, args[0]);
          return raw.apply(this, args);
        };
        // the 5×7 type: `s` dots per pixel, painted on a context whose own transform is the canvas's
        window.__f57 = (c, s, str) => { try { note(c.canvas, 10 * s, c.getTransform().a, str); } catch { /* a painter that is not a context */ } };
      });
      await p.goto(`http://localhost:${PORT}/?reinterp=1&home=0&debug=1&kiosk=0&descent=0&era=${era}`, { waitUntil: 'load', timeout: 240000 });
      await p.waitForFunction(() => window.__os || [...document.querySelectorAll('button')].some((b) => /Log in/i.test(b.textContent || '') && !b.disabled), { timeout: 180000 });
      await p.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Log in/i.test(b.textContent || ''))?.click());
      await p.waitForFunction(() => window.__os && window.__app && window.__poses, { timeout: 180000 });
      await wait(6000);
      // the mocked headset first, so everything below is drawn at its headset size
      await p.evaluate(() => { const a = window.__app; Object.defineProperty(a.xr, 'active', { configurable: true, get: () => true }); });
      await wait(1500);
      // open the typical reading surfaces of the era
      await p.evaluate((era) => {
        const os = window.__os, a = window.__app;
        const tick = () => { try { os.update(0.2); } catch { /* */ } try { a.fire('update', 0.1); } catch { /* */ } };
        try {
          if (era === 1) for (const b of ['profile', 'kit', 'diary']) { try { os.debugJump(b); tick(); } catch { /* */ } }
          if (era === 2) { try { os.debugJump('netvision'); tick(); } catch { /* */ } }
          if (era === 3) { const q = window.__graceQueue?.(); for (const b of ['consent', 'board', 'list', 'noa', 'boardDone']) { try { q?.debugBeat(b); tick(); } catch { /* */ } } }
          if (era === 4) { try { os.debugJump('e4Browser'); os.update(0.1); } catch { /* */ } }
        } catch { /* */ }
      }, era);
      await wait(2500);
      // the held device of the era, taken up and played a moment (it draws its UI as it plays)
      await p.evaluate(() => {
        const a = window.__app, d = window.__heldDevices, e = window.__os.era;
        try { window.__consoleSession?.light?.(); } catch { /* */ }                    // 2026: the console is lit
        try { d?.tick?.(0.1, e, () => true, 0); } catch { /* */ }                      // the game exists once the device is "available"
        try { d?.take?.(e, a.root.findByName('camera')); } catch { /* */ }
      });
      await wait(2500);
      // the device's own key A, a few times (title, how-to, then play), and let the game draw a few seconds of its UI
      for (let k = 0; k < 4; k++) {
        await p.evaluate(() => { const d = window.__heldDevices, e = window.__os.era; try { d?.key?.('a', e); } catch { /* */ } });
        await wait(1200);
      }
      await wait(2500);
      // the frame's own planes (menu, site viewer), when this build can open them in the mocked headset
      await p.evaluate(() => { try { window.__xrFrame?.open?.(); } catch { /* */ } try { window.__siteViewer?.open?.('hub'); } catch { /* */ } });
      await wait(2500);
      const row = await p.evaluate((era, SURFACES, HELD, HOLD_DIST) => {
        const a = window.__app;
        const poses = window.__poses();
        const seatKey = era < 3 ? 'r1' : era === 3 ? 'r2' : 'r3';
        const seat = poses.seats?.[seatKey] ?? poses[seatKey];
        const yaw = (seat.yaw ?? 0) * Math.PI / 180;
        const eye = { x: seat.x - Math.sin(yaw) * 0.15, y: seat.y, z: seat.z - Math.cos(yaw) * 0.15 };   // seat + xrComfort's lean
        const names = [...SURFACES];
        a.root.forEach((e) => { if (/^xr-frame-(menu|site)$/.test(e.name) && !names.includes(e.name)) names.push(e.name); });
        const dev = window.__era3Devices?.() ?? {};
        const canvasFor = { 'desktop-screen': window.__os.canvas, 'era3-device-workstation': dev.workstation, 'era3-device-monitor': dev.monitor,
          'era3-device-phone': dev.phone, 'era3-device-laptop': dev.laptop, 'era4-visor': dev.visor, 'era3-device-stream': dev.stream, 'era3-device-sidecard': dev.sidecard };
        const surfaces = [];
        for (const n of names) {
          const e = a.root.findByName(n);
          if (!e) continue;
          const mi = e.render?.meshInstances?.[0];
          const tex = mi?.material?.emissiveMap ?? mi?.material?.diffuseMap;
          const cv = canvasFor[n] ?? tex?.getSource?.() ?? null;
          const rows = cv && window.__txt.get(cv);
          if (!rows || !rows.length) continue;
          const m = e.getWorldTransform();
          const V = e.getPosition().constructor;
          const X = m.getX(new V()), c = e.getPosition();
          const held = HELD[n] ?? null;
          let glassW = Math.hypot(X.x, X.y, X.z), dist = Math.hypot(c.x - eye.x, c.y - eye.y, c.z - eye.z);
          // in hand the wrapper is already grown (bigInHand); a device left on its shelf is grown here, as it would be in hand
          const inHandNow = window.__heldDevices?.held?.({ danielHandheld: 'e1', flipPhone: 'e2', e_console: 'e4' }[n.replace('-screen', '')]) === true;
          if (held) { if (!inHandNow) glassW *= held; dist = HOLD_DIST; }
          let on = true; for (let x = e; x; x = x.parent) if (!x.enabled) { on = false; break; }
          surfaces.push({ name: n, active: on, held: !!held, glassW, dist, canvasW: cv.width, canvasH: cv.height,
            rows: rows.map((r) => ({ em: r.em, scale: r.scale, count: r.count, sample: r.sample })) });
        }
        return { era, seatKey, seat, eye, surfaces };
      }, era, SURFACES, HELD, HOLD_DIST);
      row.errors = errors.slice(0, 5);
      results.push(row);
      console.error(`era ${era}: ${row.surfaces.length} surfaces measured${errors.length ? `, ${errors.length} page errors` : ''}`);
      await p.close();
    }
  } finally {
    await Promise.race([browser.close(), wait(5000).then(() => browser.process()?.kill('SIGKILL'))]);
  }

  // degrees
  const deg = (em, scale, s) => 2 * Math.atan(((em * scale) / s.canvasW * s.glassW) / 2 / s.dist) * 180 / Math.PI;
  const table = [];
  for (const r of results) for (const s of r.surfaces) {
    const items = s.rows.map((x) => ({ ...x, deg: deg(x.em, x.scale, s) })).sort((p, q) => p.deg - q.deg);
    const total = items.reduce((t, x) => t + x.count, 0);
    // the draw-weighted median: the size half of the lines are at or below
    let acc = 0, median = items[items.length - 1].deg;
    for (const x of items) { acc += x.count; if (acc >= total / 2) { median = x.deg; break; } }
    const under = items.filter((x) => x.deg < FLOOR);
    table.push({ era: r.era, surface: s.name, active: s.active, held: s.held, distM: s.dist, glassM: s.glassW, canvasPx: s.canvasW,
      sizes: items.length, min: items[0].deg, median, sizesUnder: under.length, drawsUnder: under.reduce((t, x) => t + x.count, 0), draws: total,
      worst: items[0].sample, worstEm: items[0].em, worstScale: items[0].scale, errors: r.errors.length });
  }
  table.sort((a, b) => a.min - b.min);

  const f = (n, d = 2) => n.toFixed(d);
  const lines = [];
  lines.push(`# Text angle from the headset seat — floor ${FLOOR}°`, '',
    `Measured ${new Date().toISOString().slice(0, 16).replace('T', ' ')} by tools/text-angle.mjs (mocked headset, headless; eras ${ERAS.join(',')}). Size = the font's em in degrees; a ×s 5×7 line counts as a 10·s px font. Sorted worst first.`, '',
    '| era | surface | glass m | eye m | canvas px | sizes | min ° | median ° | sizes < floor | draws < floor | worst (em px × scale) |', '|---|---|---|---|---|---|---|---|---|---|---|');
  for (const t of table) lines.push(`| ${t.era} | ${t.surface}${t.held ? ' (held)' : ''}${t.active ? '' : ' (off, not judged)'} | ${f(t.glassM, 3)} | ${f(t.distM)} | ${t.canvasPx} | ${t.sizes} | ${f(t.min)} | ${f(t.median)} | ${t.sizesUnder}/${t.sizes} | ${t.drawsUnder}/${t.draws} | "${t.worst}" ${t.worstEm}px ×${t.worstScale} |`);
  // a surface that is switched off (another era's device, the closed menu) is listed but not judged: it is not in front of the eye
  const failing = table.filter((t) => t.active && t.sizesUnder > 0);
  lines.push('', failing.length
    ? `**FAIL** — ${failing.length} of ${table.filter((t) => t.active).length} live surfaces have text under ${FLOOR}° (${failing.reduce((n, t) => n + t.sizesUnder, 0)} sizes). Worst: ${failing.slice(0, 3).map((t) => `${t.surface} (era ${t.era}) ${f(t.min)}°`).join(', ')}.`
    : `**PASS** — nothing under ${FLOOR}° on ${table.filter((t) => t.active).length} live surfaces.`);
  const md = lines.join('\n') + '\n';
  console.log(md);
  if (OUT) { fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true }); fs.writeFileSync(OUT, md); }
  if (JSON_OUT) { fs.mkdirSync(path.dirname(path.resolve(JSON_OUT)), { recursive: true }); fs.writeFileSync(JSON_OUT, JSON.stringify({ floor: FLOOR, table, raw: results }, null, 2)); }
  process.exit(failing.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
