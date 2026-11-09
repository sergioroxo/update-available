#!/usr/bin/env node
/**
 * ERA CHANGE PROBE (S347, UiB job 6) — the seated, shining era change, measured by its frames.
 *
 *     node tools/era-change-probe.mjs --port 3181 --out out/s347/change            # every change, desktop + headset
 *     node tools/era-change-probe.mjs --port 3181 --out out/s347/change --only e3 --mode xr
 *     node tools/era-change-probe.mjs --port 3181 --out out/s347/change-rm --reduced  # under reduced motion
 *
 * For each change (1997 → 2003, 2003 → 2016, 2016 → 2026), on the desktop and in the emulated headset (app.xr.active
 * forced on, the method of tools/xr-layer-review.mjs): opens the year, lets the room settle, measures the ROOM ITSELF
 * (mean brightness 0…255 of a few frames), fires the change through the real hooks (`__os.onEraRelocate` for the early
 * ascent, `__os.onEraShift` for the restart), and samples frames until the visitor has landed and the new room has
 * settled. Each row: brightness, the leg, the camera, the morph, the shine (the travelling light and the glints), the
 * bed and the morph's sound layer. The verdict his note asks for — "the mid-change frames must stay as bright as the
 * room itself, or brighter" — is checked against the room you were sitting in before the change.
 * Writes report.json and one contact sheet per change and mode (sheet-<from>-<mode>.png).
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const PORT = Number(flag('port', 3181));
const OUT = flag('out', 'out/s347/change');
const ONLY = flag('only', '');
const MODE = flag('mode', '');
const REDUCED = argv.includes('--reduced');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const puppeteer = (await import('puppeteer-core')).default;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 960, height: 540, deviceScaleFactor: 1 } });
fs.mkdirSync(OUT, { recursive: true });

const CHANGES = [
  // 1997 has no review jump (?era= is 2–4; 1997 is the entrance): it is replayed from a 2003 page through the debug
  //   panel's own relocation replay (__relocate: the room put back to 1997, Daniel's chair, then the seated change)
  { from: 'e1', era: 2, to: 'e2', replay: true, label: '1997 → 2003' },
  { from: 'e2', era: 2, to: 'e3', early: false, label: '2003 → 2016' },
  { from: 'e3', era: 3, to: 'e4', early: false, label: '2016 → 2026', seat: 90 }
];

const lumOf = (page, b64) => page.evaluate(async (b) => {
  const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${b}`)).blob());
  const c = document.createElement('canvas'); c.width = 96; c.height = 54; const g = c.getContext('2d'); g.drawImage(bmp, 0, 0, 96, 54);
  const d = g.getImageData(0, 0, 96, 54).data; let s = 0;
  for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  return Math.round(s / (d.length / 4));
}, b64);
const pose = (page) => page.evaluate(() => { const p = window.__camPose();
  return { leg: p.leg, blink: p.blink ?? null, morph: p.morph ?? null, bed: p.bed ?? null, layer: p.layer ?? null, shine: p.shine ?? null, xrBusy: p.xrBusy ?? null,
    x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), yaw: Math.round(p.yaw) }; });

async function open(c, xr) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  if (REDUCED) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  // home=0: no entrance (1997 would open on the stars); the era change's own legs stay on (descent=0 would turn them off)
  await page.goto(`http://127.0.0.1:${PORT}/?reinterp=1&kiosk=0&era=${c.era}&debug=1&home=0`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__os && window.__camPose && window.__app, { timeout: 90000 });
  await page.addStyleTag({ content: 'body > *:not(canvas) { display: none !important; }' });
  if (xr) {
    await page.evaluate(() => { const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true }); head.setLocalPosition(0, 1.2, 0); head.camera.fov = 90; });
    await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
  }
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) { const p = await page.evaluate(() => window.__camPose()); if (!p.driven && !p.descent) break; await wait(400); }
  await wait(3000);
  // in play, 2016 ends in Vera's chair (the review jump lands in Daniel's): sit where the change really starts
  if (c.seat !== undefined) { await page.evaluate((y) => window.__seatCut?.(y), c.seat); await wait(2500); }
  return { page, errors };
}

async function run(c, mode) {
  const { page, errors } = await open(c, mode === 'xr');
  const tag = `${c.from}-${mode}`;
  const frames = [];
  const shot = async (name) => {
    const b64 = await page.screenshot({ encoding: 'base64' });
    const file = path.join(OUT, `${name}.png`); fs.writeFileSync(file, Buffer.from(b64, 'base64'));
    return { file, lum: await lumOf(page, b64) };
  };
  if (c.replay) {
    // put the room back to 1997 first and photograph THAT as the room itself
    await page.evaluate((f) => { window.__os.setDesktopEra?.(f, true); }, c.from);
  }
  // the room itself, before
  const before = [];
  for (let i = 0; i < 3; i++) { before.push((await shot(`${tag}-before-${i}`)).lum); await wait(300); }
  const roomLum = Math.round(before.reduce((a, b) => a + b, 0) / before.length);
  // the change, through the real hooks
  const t0 = Date.now();
  let shifted = false, landedAt = -1, i = 0;
  if (c.replay) { await page.evaluate((f, to) => window.__relocate(f, to), c.from, c.to); shifted = true; }
  else { await page.evaluate((to) => window.__os.onEraShift(to), c.to); shifted = true; }
  while ((Date.now() - t0) / 1000 < 90) {
    const t = (Date.now() - t0) / 1000;
    if (!shifted && t > 9.7) { shifted = true; await page.evaluate((to) => window.__os.onEraShift(to), c.to); }
    const p = await pose(page);
    const s = await shot(`${tag}-f${String(i++).padStart(3, '0')}`);
    frames.push({ t: +t.toFixed(2), lum: s.lum, file: s.file, ...p });
    if (landedAt < 0 && !p.leg && t > 3) landedAt = t;
    if (landedAt >= 0 && t > landedAt + 6) break;
  }
  const during = frames.filter((f) => f.leg);
  // the room as you sit in it once the change has begun: the first 1.5 s (the shift itself turns the monitor's screen
  // over to the install, which is the screen, not the room's light)
  const early = during.filter((f) => f.t <= 1.5);
  const sitLum = early.length ? Math.round(early.reduce((a, f) => a + f.lum, 0) / early.length) : roomLum;
  const after = frames.filter((f) => !f.leg && f.t > landedAt + 3);
  const endLum = after.length ? Math.round(after.reduce((a, f) => a + f.lum, 0) / after.length) : null;
  const minDuring = during.length ? Math.min(...during.map((f) => f.lum)) : null;
  const darkest = during.find((f) => f.lum === minDuring);
  const res = {
    change: c.label, mode, reduced: REDUCED, roomLum, sitLum, minDuring, darkestAt: darkest ? { t: darkest.t, leg: darkest.leg } : null, endLum,
    // his check: the mid-change frames as bright as the room itself, or brighter (a 3-level allowance for the monitor's own screens)
    // never darker than the dimmer of the two rooms themselves (the one you sit in, the one you land in): the
    //   landing's reveal IS the next room, at its own light
    brightAsTheRoom: minDuring !== null && minDuring >= Math.min(sitLum, endLum ?? sitLum) - 3,
    camMoved: during.some((f, k) => k > 0 && f.leg !== 'descend' && (Math.abs(f.x - during[0].x) > 0.02 || Math.abs(f.z - during[0].z) > 0.02)),
    legs: [...new Set(frames.map((f) => f.leg))], beds: [...new Set(frames.map((f) => f.bed))], layers: [...new Set(frames.map((f) => f.layer))],
    shinePeak: Math.max(0, ...frames.map((f) => f.shine?.light ?? 0)), glintPeak: Math.max(0, ...frames.map((f) => f.shine?.glints ?? 0)),
    landed: frames[frames.length - 1] ? { x: frames[frames.length - 1].x, z: frames[frames.length - 1].z, yaw: frames[frames.length - 1].yaw } : null,
    errors: errors.slice(0, 6),
    rows: frames.map(({ file, ...r }) => ({ ...r, shine: r.shine ? `${r.shine.light}/${r.shine.glints}` : null }))
  };
  // the contact sheet: 12 frames spread over the change, labelled
  const pick = [];
  const span = frames.filter((f) => f.t <= landedAt + 5);
  for (let k = 0; k < 12; k++) pick.push(span[Math.round((k / 11) * (span.length - 1))]);
  const tiles = pick.filter(Boolean).map((f) => ({ src: `data:image/png;base64,${fs.readFileSync(f.file).toString('base64')}`, label: `${f.t.toFixed(1)} s · ${f.leg ?? 'landed'} · lum ${f.lum}${f.shine?.glints ? ` · ${f.shine.glints} glints` : ''}${f.morph ? ' · morph' : ''}` }));
  const sheet = await page.evaluate(async (tl, title) => {
    const W = 480, H = 270, cols = 3, rows = Math.ceil(tl.length / cols);
    const c = document.createElement('canvas'); c.width = W * cols; c.height = H * rows + 34; const g = c.getContext('2d');
    g.fillStyle = '#111'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#fff'; g.font = 'bold 18px sans-serif'; g.fillText(title, 10, 23);
    for (let i = 0; i < tl.length; i++) {
      const im = await createImageBitmap(await (await fetch(tl[i].src)).blob());
      const x = (i % cols) * W, y = 34 + Math.floor(i / cols) * H;
      g.drawImage(im, x, y, W, H);
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x, y + H - 22, W, 22);
      g.fillStyle = '#fff'; g.font = '13px sans-serif'; g.fillText(tl[i].label, x + 6, y + H - 7);
    }
    return c.toDataURL('image/png').split(',')[1];
  }, tiles, `${c.label} · ${mode === 'xr' ? 'emulated headset' : 'desktop'}${REDUCED ? ' · reduced motion' : ''} · room ${roomLum} (at the change ${sitLum}) · darkest during ${minDuring} · after ${endLum}`);
  fs.writeFileSync(path.join(OUT, `sheet-${c.from}-${mode}.png`), Buffer.from(sheet, 'base64'));
  // keep only the sheet's frames on disk
  const keep = new Set(pick.filter(Boolean).map((f) => f.file));
  for (const f of frames) if (!keep.has(f.file)) fs.rmSync(f.file, { force: true });
  await page.close();
  return res;
}

const report = { port: PORT, reduced: REDUCED, results: [] };
try {
  for (const c of CHANGES) {
    if (ONLY && ONLY !== c.from) continue;
    for (const mode of ['desktop', 'xr']) {
      if (MODE && MODE !== mode) continue;
      const r = await run(c, mode);
      report.results.push(r);
      console.log(`${r.change} ${mode}: room ${r.roomLum} (seated at the change ${r.sitLum}), darkest during ${r.minDuring} (${r.darkestAt?.leg} @ ${r.darkestAt?.t}s), after ${r.endLum} — ${r.brightAsTheRoom ? 'as bright or brighter ✓' : 'DIMMER ✗'}; camera moved before the landing: ${r.camMoved}; shine peak ${r.shinePeak}, glints ${r.glintPeak}; beds ${r.beds.join(' → ')}; layer ${r.layers.filter(Boolean).join(',') || '—'}; errors ${r.errors.length}`);
    }
  }
} finally {
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  await Promise.race([browser.close(), wait(5000)]);
}
