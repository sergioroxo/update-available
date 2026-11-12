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
 * the 2003 flip phone, the 2026 console) are measured as held: in hand, from the head that took them (S374: heldDevice.ts
 * holds them at 0.5 m, grown by max(1.3, 0.42/holdDist·0.8) × 1.3 × 0.5/0.42); one left on its shelf as it would be in hand.
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
// ⚑ S374 (job 18 B2): held at 0.5 m, not 0.42, and grown 1.3 × 0.5/0.42 more in hand, so the letters grow about 30 %
const GROW = 1.3 * 0.5 / 0.42;
const HELD = { 'danielHandheld-screen': 1.3 * GROW, 'flipPhone-screen': Math.max(1.3, 0.42 / 0.19 * 0.8) * GROW, 'e_console-screen': 1.3 * GROW };
const HOLD_DIST = 0.5;
/** ⚑ S374 — surfaces measured and listed but NOT judged by the reading floor, each with its reason. The record on Daniel's
 *  back wall is the room's cold witness seen across the room (3.15 m, behind the seat: no beat asks a visitor to turn to
 *  it, CLAUDE.md R28 §1); its reading face is YOUR FILE on the monitor, which is judged. To read the wall itself at 0.8°
 *  its 8–11 px lines would need 15 px, a new layout of the whole record: listed for Sérgio, not part of job 18. */
const SCENERY = { 'witness-screen': 'the record across the room (3.15 m); its reading face is YOUR FILE on the monitor' };
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
        // ⚑ S374 — only what is drawn IN THE HEADSET counts, and each line keeps the canvas width it was drawn on. S373's
        //   first report also weighed the browser draws made before the mock (×3) against the headset canvas width (×4),
        //   which read every monitor 25 % small (1997's 10 px body as 0.60° instead of 0.81°).
        // ⚑ S374 — a game's WORLD lettering (Floppy Sheep's signs and sashes, src/desktop/apps/floppysheep.ts `scenery`) is
        //   tagged by the game itself through this hook, and listed apart from the UI the floor is about
        window.__scen = false;
        window.__txtScenery = (on) => { window.__scen = !!on; };
        const note = (canvas, em, scale, sample, scen = window.__scen) => {
          if (!canvas || !(em > 0) || !window.__app?.xr?.active) return;
          const list = window.__txt.get(canvas) ?? [];
          const cw = canvas.width;
          const key = `${em}|${scale}|${cw}|${scen ? 's' : ''}`;
          let row = list.find((x) => x.key === key);
          if (!row) { row = { key, em, scale, cw, scen, count: 0, sample: String(sample).slice(0, 36) }; list.push(row); }
          row.count++; row.fresh = true;
          window.__txt.set(canvas, list);
        };
        // ⚑ S374 — TEXT DRAWN OFF-SCREEN AND COPIED ON. The Handset Window (2016's phone, and Floppy Sheep in it) is drawn
        //   into its own canvas and copied onto the workstation with drawImage, at ×0.92–1.07; S373's tool never saw it.
        //   A copy carries the lines drawn on its source since the last copy onto the destination, scaled by the copy.
        const rawDraw = CanvasRenderingContext2D.prototype.drawImage;
        CanvasRenderingContext2D.prototype.drawImage = function (img, ...a) {
          try {
            const src = img instanceof HTMLCanvasElement ? window.__txt.get(img) : null;
            if (src && window.__app?.xr?.active) {
              const sw = a.length === 8 ? a[2] : img.width, dw = a.length === 8 ? a[6] : a.length === 4 ? a[2] : img.width;
              const k = (dw * this.getTransform().a) / sw;   // destination pixels per source pixel
              for (const r of src) if (r.fresh) { r.fresh = false; note(this.canvas, r.em, r.scale * k, `${r.sample}`, r.scen); }
            }
          } catch { /* */ }
          return rawDraw.call(this, img, ...a);
        };
        const raw = CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText = function (...args) {
          const m = this.font.match(/(\d+(?:\.\d+)?)px\s/);
          note(this.canvas, m ? Number(m[1]) : 0, this.getTransform().a, args[0]);
          return raw.apply(this, args);
        };
        // the 5×7 type: `s` dots per pixel, painted on a context whose own transform is the canvas's
        // (S374: MATCH MADE paints through its own Pen, whose `g` is the context)
        window.__f57 = (c, s, str) => { try { const x = c.canvas ? c : c.g; note(x.canvas, 10 * s, x.getTransform().a, str); } catch { /* a painter that is not a context */ } };
      });
      await p.goto(`http://localhost:${PORT}/?reinterp=1&home=0&debug=1&kiosk=0&descent=0&era=${era}`, { waitUntil: 'load', timeout: 240000 });
      await p.waitForFunction(() => window.__os || [...document.querySelectorAll('button')].some((b) => /Log in/i.test(b.textContent || '') && !b.disabled), { timeout: 180000 });
      await p.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Log in/i.test(b.textContent || ''))?.click());
      await p.waitForFunction(() => window.__os && window.__app && window.__poses, { timeout: 180000 });
      await wait(6000);
      // the mocked headset first, so everything below is drawn at its headset size
      await p.evaluate(() => { const a = window.__app; Object.defineProperty(a.xr, 'active', { configurable: true, get: () => true }); });
      await wait(1500);
      // open the typical reading surfaces of the era, one at a time, each given time to draw in the headset
      // ⚑ S374: more of each era than S373 opened (the IRC, the web, the 2003 film and chat, 2016's Handset Window with a
      //   thread, Floppy Sheep's introduction and a few seconds of play), so a surface Part B changed is a surface measured
      const ROUTE = {
        1: [['os', 'profile'], ['os', 'kit'], ['os', 'diary'], ['os', 'irc'], ['os', 'web']],
        2: [['os', 'netvision'], ['os', 'e2Restorify'], ['os', 'foundFile'], ['os', 'calebChat']],
        3: [['gq', 'consent'], ['gq', 'board'], ['gq', 'list'], ['gq', 'noa'], ['gq', 'boardDone'], ['gq', 'maltaOpen'], ['gq', 'board'], ['gq', 'floppy'], ['gq', 'floppyPlay']],
        4: [['os', 'e4Browser'], ['os', 'e4BrowserSearch'], ['os', 'e4L'], ['os', 'e4Offers'], ['os', 'e4Chips']]
      }[era] ?? [];
      // a surface counts as in front of the eye if it was switched on at ANY beat of the visit (2026's monitor goes dark
      //   when the headset is worn, and its lines were drawn while it was on)
      const markOn = () => p.evaluate((SURFACES) => {
        const a = window.__app; window.__seenOn ??= new Set();
        for (const n of SURFACES) { const e = a.root.findByName(n); if (!e) continue; let on = true; for (let x = e; x; x = x.parent) if (!x.enabled) { on = false; break; } if (on) window.__seenOn.add(n); }
      }, SURFACES);
      for (const [who, beat] of ROUTE) {
        await p.evaluate((who, beat) => {
          const os = window.__os;
          try { if (who === 'os') os.debugJump(beat); else window.__graceQueue?.()?.debugBeat(beat); } catch { /* */ }
          try { os.update(0.1); } catch { /* */ }
        }, who, beat);
        await wait(beat === 'floppyPlay' ? 4000 : 1200);
        await markOn();
      }
      await wait(1000);
      // the held device of the era, taken up and played a moment (it draws its UI as it plays)
      await p.evaluate(() => {
        const a = window.__app, d = window.__heldDevices, e = window.__os.era;
        try { window.__consoleSession?.light?.(); } catch { /* */ }                    // 2026: the console is lit
        try { d?.tick?.(0.1, e, () => true, 0); } catch { /* */ }                      // the game exists once the device is "available"
        // in a headset the app takes it with the head IN THE ROOM'S COORDINATES (app.ts logicalHead), as here
        try {
          const cam = a.root.findByName('camera'), xc = window.__xrComfort, p0 = cam.getPosition();
          const r = xc.logicalRay({ p0, p1: p0.clone().add(cam.forward) }), u = xc.logicalRay({ p0, p1: p0.clone().add(cam.up) });
          window.__lh = new cam.constructor('probe-logical-head'); window.__lh.setPosition(r.p0); window.__lh.lookAt(r.p1, u.p1.sub(u.p0).normalize());
          d?.take?.(e, window.__lh);
        } catch { /* */ }
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
          // ⚑ S374 — in hand, the distance is MEASURED (the glass's centre from the head that took it), so the report follows
          //   heldDevice.ts's hold distance instead of a copy of it; left on its shelf, the constants below stand in
          if (held) {
            if (!inHandNow) { glassW *= held; dist = HOLD_DIST; }
            else { const cam = (window.__lh ?? a.root.findByName('camera')).getPosition(); dist = Math.hypot(c.x - cam.x, c.y - cam.y, c.z - cam.z); }
          }
          let on = !!window.__seenOn?.has(n); for (let x = e; x && !on; x = x.parent) { if (!x.enabled) break; if (x === a.root) on = true; }
          surfaces.push({ name: n, active: on, held: !!held, glassW, dist, canvasW: cv.width, canvasH: cv.height,
            rows: rows.map((r) => ({ em: r.em, scale: r.scale, cw: r.cw, scen: !!r.scen, count: r.count, sample: r.sample })) });
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
  const deg = (em, scale, s, cw) => 2 * Math.atan(((em * scale) / (cw || s.canvasW) * s.glassW) / 2 / s.dist) * 180 / Math.PI;
  const table = [];
  for (const r of results) for (const s of r.surfaces) {
    const all = s.rows.map((x) => ({ ...x, deg: deg(x.em, x.scale, s, x.cw) })).sort((p, q) => p.deg - q.deg);
    const world = all.filter((x) => x.scen), items = all.filter((x) => !x.scen);
    if (!items.length) continue;
    const total = items.reduce((t, x) => t + x.count, 0);
    // the draw-weighted median: the size half of the lines are at or below
    let acc = 0, median = items[items.length - 1].deg;
    for (const x of items) { acc += x.count; if (acc >= total / 2) { median = x.deg; break; } }
    const under = items.filter((x) => x.deg < FLOOR);
    table.push({ era: r.era, surface: s.name, active: s.active, held: s.held, scenery: SCENERY[s.name] ?? null, distM: s.dist, glassM: s.glassW, canvasPx: s.canvasW,
      sizes: items.length, min: items[0].deg, median, sizesUnder: under.length, drawsUnder: under.reduce((t, x) => t + x.count, 0), draws: total,
      worst: items[0].sample, worstEm: items[0].em, worstScale: items[0].scale, errors: r.errors.length,
      world: world.length ? { sizes: world.length, min: world[0].deg, max: world[world.length - 1].deg, worst: world[0].sample } : null });
  }
  table.sort((a, b) => a.min - b.min);

  const f = (n, d = 2) => n.toFixed(d);
  const lines = [];
  lines.push(`# Text angle from the headset seat — floor ${FLOOR}°`, '',
    `Measured ${new Date().toISOString().slice(0, 16).replace('T', ' ')} by tools/text-angle.mjs (mocked headset, headless; eras ${ERAS.join(',')}). Size = the font's em in degrees; a ×s 5×7 line counts as a 10·s px font. Sorted worst first.`, '',
    '| era | surface | glass m | eye m | canvas px | sizes | min ° | median ° | sizes < floor | draws < floor | worst (em px × scale) |', '|---|---|---|---|---|---|---|---|---|---|---|');
  for (const t of table) lines.push(`| ${t.era} | ${t.surface}${t.held ? ' (held)' : ''}${t.active ? '' : ' (off, not judged)'}${t.active && t.scenery ? ` (scenery, not judged: ${t.scenery})` : ''} | ${f(t.glassM, 3)} | ${f(t.distM)} | ${t.canvasPx} | ${t.sizes} | ${f(t.min)} | ${f(t.median)} | ${t.sizesUnder}/${t.sizes} | ${t.drawsUnder}/${t.draws} | "${t.worst}" ${t.worstEm}px ×${t.worstScale} |`);
  // a surface that is switched off (another era's device, the closed menu) is listed but not judged: it is not in front of the eye
  const judged = table.filter((t) => t.active && !t.scenery);
  const failing = judged.filter((t) => t.sizesUnder > 0);
  lines.push('', failing.length
    ? `**FAIL** — ${failing.length} of ${judged.length} live surfaces have text under ${FLOOR}° (${failing.reduce((n, t) => n + t.sizesUnder, 0)} sizes). Worst: ${failing.slice(0, 3).map((t) => `${t.surface} (era ${t.era}) ${f(t.min)}°`).join(', ')}.`
    : `**PASS** — nothing under ${FLOOR}° on ${judged.length} live surfaces.`);
  const worlds = table.filter((t) => t.active && t.world);
  if (worlds.length) lines.push('', `A game's world lettering, listed and not judged (the floor is the UI's): ${worlds.map((t) => `${t.surface} (era ${t.era}) ${t.world.sizes} sizes, ${f(t.world.min)}–${f(t.world.max)}° ("${t.world.worst}")`).join('; ')}.`);
  const scenery = table.filter((t) => t.active && t.scenery);
  if (scenery.length) lines.push('', `Scenery, listed and not judged: ${scenery.map((t) => `${t.surface} (era ${t.era}) min ${f(t.min)}° — ${t.scenery}`).join('; ')}.`);
  const md = lines.join('\n') + '\n';
  console.log(md);
  if (OUT) { fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true }); fs.writeFileSync(OUT, md); }
  if (JSON_OUT) { fs.mkdirSync(path.dirname(path.resolve(JSON_OUT)), { recursive: true }); fs.writeFileSync(JSON_OUT, JSON.stringify({ floor: FLOOR, table, raw: results }, null, 2)); }
  process.exit(failing.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
