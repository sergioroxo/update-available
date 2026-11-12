#!/usr/bin/env node
/**
 * THE CLOSE IN HIS ORDER — PROBE (S361, UiB job 13 Part B, H50).
 *
 *     node tools/close-order-probe.mjs --port 3191 --out out/s361/close            # desktop + emulated headset
 *     node tools/close-order-probe.mjs --port 3191 --out out/s361/close --mode xr
 *
 * Opens 2026 at Maya's desk (`?era=4`), fires the Close through the debug hook (`__enterClose`, the same function the
 * glitch's hand-off calls), and photographs it to the Restart page, pressing each message card as a visitor would
 * (one tap in the middle of the view). Each row: the Close's stage, the card, whether the panels are up, the bed, the
 * camera, whether the room is glitching, and which <audio> are really playing (Chrome runs with
 * --autoplay-policy=no-user-gesture-required and window.Audio is wrapped — memory: headless sound).
 * His order, checked in the report: flight (with the glitch) → Daniel's seat → up → messages with NO panels → the
 * panels → (the song under all of it) → the gaze taken to the computer's panel → a press on it → the Restart page.
 * ⚑ S378 (UiB job 20 Part A): the Restart card on Daniel's far glass is gone; the computer is the fifth panel, and its
 * page in the site viewer is the end (`ended` = the turn to the panel done; then one real press on its Open button).
 * ⚑ S380 (UiB job 21 Part A): the computer panel is Daniel's low-poly CRT now (src/room/closeCrt.ts); it is published
 * the same way (`__closePanels()` machine, its Open button on the glass), so nothing here changed.
 * Writes report.json and sheet-<mode>.png (one tile per step).
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const PORT = Number(flag('port', 3191));
const OUT = flag('out', 'out/s361/close');
const MODE = flag('mode', '');
const HOST = flag('host', 'localhost');
const FAST = argv.includes('--fast');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const puppeteer = (await import('puppeteer-core')).default;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: Number(flag('width', 960)), height: Number(flag('height', 540)), deviceScaleFactor: Number(flag('dsf', 1)) } });   // S375: --width 1280 --height 720 --dsf 2 for the photography run
fs.mkdirSync(OUT, { recursive: true });

async function run(mode) {
  const xr = mode === 'xr';
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.evaluateOnNewDocument(() => {
    const A = window.Audio; window.__audios = [];
    window.Audio = function (...a) { const el = new A(...a); window.__audios.push(el); return el; };
    window.Audio.prototype = A.prototype;
  });
  // --fast: the review route (?close=1 — the Close from Daniel's seat, no flight), to the second card only
  const url = FAST ? `http://${HOST}:${PORT}/?reinterp=1&kiosk=0&close=1&debug=1&home=0` : `http://${HOST}:${PORT}/?reinterp=1&kiosk=0&era=4&debug=1&home=0`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__os && window.__camPose && window.__app && window.__enterClose, { timeout: 90000 });
  await page.addStyleTag({ content: '#debug-panel, .debug-panel { display: none !important; }' });
  if (xr) {
    await page.evaluate(() => { const app = window.__app, head = app.root.findByName('camera');
      Object.defineProperty(app.xr, 'active', { configurable: true, get: () => true }); head.setLocalPosition(0, 1.2, 0); head.setLocalEulerAngles(0, 0, 0); head.camera.fov = 90; });
    await page.waitForFunction(() => window.__xrComfort?.calibrated && !window.__xrComfort.busy, { timeout: 30000 }).catch(() => {});
  }
  if (!FAST) await wait(6000);
  const frames = [];
  let i = 0;
  const shot = async (note) => {
    const st = await page.evaluate(() => {
      const p = window.__camPose(), c = window.__closeState();
      const playing = (window.__audios || []).filter((a) => !a.paused && !a.ended && a.volume > 0.01).map((a) => decodeURIComponent((a.src || '').split('/').pop()));
      return { ...c, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), pitch: Math.round(p.pitch), yaw: Math.round(p.yaw), xrFollow: p.xrFollow, xrBusy: p.xrBusy, playing };
    });
    const file = path.join(OUT, `${mode}-f${String(i++).padStart(3, '0')}.png`);
    await page.screenshot({ path: file });
    frames.push({ t: +((Date.now() - t0) / 1000).toFixed(1), note: note ?? null, file, ...st });
    return st;
  };
  const t0 = Date.now();
  if (!FAST) await page.evaluate(() => window.__enterClose());
  let pressed = -1;
  while ((Date.now() - t0) / 1000 < 420) {
    const st = await shot();
    if (st.stage === 'message' && st.card !== pressed) {
      await wait(2500);
      await shot(`card ${st.card + 1}`);
      if (xr) await page.evaluate(() => { const app = window.__app, head = app.root.findByName('camera'); head.setLocalEulerAngles(0, 0, 0); });
      await page.mouse.click(480, 270);   // a press anywhere turns the card
      pressed = st.card;
      if (FAST && pressed >= 1) break;
      await wait(900);
      continue;
    }
    if (st.ended && frames.filter((f) => f.ended).length > 2) {
      // ⚑ S378 — the end: press the computer's panel (its Open button, projected through the live camera), as a visitor
      if (xr) {
        await page.evaluate(() => {
          const app = window.__app, head = app.root.findByName('camera'), c = window.__xrComfort;
          const mp = window.__closePanels().find((p) => p.machine); if (!mp) return;
          const origin = head.getPosition().clone(), target = c.physicalPoint(head.getPosition().clone().set(mp.x, mp.y, mp.z));
          const src = { targetRayMode: 'tracked-pointer', getOrigin: () => origin, getDirection: () => target.clone().sub(origin).normalize(), hand: null, gamepad: { buttons: [], axes: [0, 0, 0, 0] } };
          app.xr.input.fire('add', src); app.xr.input.fire('select', src); app.xr.input.fire('select', src);
        });
      } else {
        const pt = await page.evaluate(() => {
          const app = window.__app, cam = app.root.findByName('camera'), V = cam.getPosition().constructor;
          const mp = window.__closePanels().find((p) => p.machine); if (!mp) return null;
          const b = mp.button || mp; const q = cam.camera.worldToScreen(new V(b.x, b.y, b.z)); return q.z > 0 ? [q.x, q.y] : null;
        });
        if (pt) await page.mouse.click(pt[0], pt[1]);
      }
      await wait(1800);
      await shot('the Restart page');
      break;
    }
    await wait(1400);
  }
  // in the headset, one look up at the top of the rise (what the stars look like from the risen seat) is not needed by
  // the story; it is a photograph only
  const stages = [...new Set(frames.map((f) => f.stage))];
  const firstPanels = frames.find((f) => f.panels);
  const lastCard = [...frames].reverse().find((f) => f.stage === 'message');
  const res = {
    mode, stages,
    panelsBeforeMessages: frames.some((f) => f.panels && (f.stage === 'travel' || f.stage === 'lookUp' || f.stage === 'hold' || f.stage === 'message')),
    firstPanelsAt: firstPanels ? { t: firstPanels.t, stage: firstPanels.stage } : null,
    lastCardAt: lastCard ? lastCard.t : null,
    glitchFrames: frames.filter((f) => f.glitching && f.stage === 'travel').length,
    songFrames: frames.filter((f) => f.bed === 'close_song.mp3').length, frames: frames.length,
    songPlayingFrom: (frames.find((f) => f.playing.includes('close_song.mp3')) || {}).t ?? null,
    songAudibleAtEnd: frames[frames.length - 1]?.playing.includes('close_song.mp3') ?? false,
    reachedEnd: frames.some((f) => f.ended),
    reachedRestartPage: frames.some((f) => f.page === 'machine'),
    errors: errors.slice(0, 6),
    rows: frames.map(({ file, ...r }) => ({ ...r, file: path.basename(file) }))
  };
  // the sheet: the first frame of each stage, every card, two of the flight, two of the panels opening, the card
  const pick = [];
  const add = (f) => { if (f && !pick.includes(f)) pick.push(f); };
  const travel = frames.filter((f) => f.stage === 'travel');
  add(frames[0]); add(travel[0]); add(travel[Math.floor(travel.length / 3)]); add(travel[Math.floor(2 * travel.length / 3)]);
  add(frames.find((f) => f.stage === 'lookUp')); add([...frames].reverse().find((f) => f.stage === 'lookUp'));
  add(frames.find((f) => f.stage === 'hold'));
  for (const f of frames.filter((x) => x.note && x.note.startsWith('card'))) add(f);
  const open = frames.filter((f) => f.stage === 'open');
  add(open[0]); add(open[Math.floor(open.length / 2)]); add(open[open.length - 1]);
  add(frames.find((f) => f.stage === 'settled')); add(frames[frames.length - 1]);
  const tiles = pick.filter(Boolean).map((f) => ({ src: `data:image/png;base64,${fs.readFileSync(f.file).toString('base64')}`,
    label: `${f.t.toFixed(0)} s · ${f.stage ?? 'card'}${f.note ? ' · ' + f.note : ''}${f.panels ? ' · panels' : ''}${f.glitching ? ' · glitch' : ''} · ${f.bed ?? '—'}` }));
  const sheet = await page.evaluate(async (tl, title) => {
    const W = 480, H = 270, cols = 3, rows = Math.ceil(tl.length / cols);
    const c = document.createElement('canvas'); c.width = W * cols; c.height = H * rows + 34; const g = c.getContext('2d');
    g.fillStyle = '#111'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#fff'; g.font = 'bold 18px sans-serif'; g.fillText(title, 10, 23);
    for (let k = 0; k < tl.length; k++) {
      const im = await createImageBitmap(await (await fetch(tl[k].src)).blob());
      const x = (k % cols) * W, y = 34 + Math.floor(k / cols) * H;
      g.drawImage(im, x, y, W, H);
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x, y + H - 22, W, 22);
      g.fillStyle = '#fff'; g.font = '13px sans-serif'; g.fillText(tl[k].label, x + 6, y + H - 7);
    }
    return c.toDataURL('image/png').split(',')[1];
  }, tiles, `The Close in his order · ${xr ? 'emulated headset' : 'computer'}`);
  fs.writeFileSync(path.join(OUT, `sheet-${mode}.png`), Buffer.from(sheet, 'base64'));
  const keep = new Set(pick.filter(Boolean).map((f) => f.file));
  for (const f of frames) if (!keep.has(f.file)) fs.rmSync(f.file, { force: true });
  await page.close();
  return res;
}

const report = { port: PORT, results: [] };
try {
  for (const mode of ['desktop', 'xr']) {
    if (MODE && MODE !== mode) continue;
    const r = await run(mode);
    report.results.push(r);
    console.log(`${mode}: stages ${r.stages.join(' → ')}; panels before the messages ${r.panelsBeforeMessages}; first panels ${JSON.stringify(r.firstPanelsAt)} (last card at ${r.lastCardAt} s); glitch frames in the flight ${r.glitchFrames}; song bed ${r.songFrames}/${r.frames} frames, playing from ${r.songPlayingFrom} s, at the end ${r.songAudibleAtEnd}; the end ${r.reachedEnd}; the Restart page ${r.reachedRestartPage}; errors ${r.errors.length}`);
  }
} finally {
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  await Promise.race([browser.close(), wait(5000)]);
}
