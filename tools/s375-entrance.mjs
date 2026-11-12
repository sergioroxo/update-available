#!/usr/bin/env node
/**
 * S375 (UiB job 19 Part A) — the ENTRANCE as the walk plays it, photographed at 2560 × 1440: the front door (DOM), the wake,
 * the floating Lamblippy Setup in the stars, every choice, the opening film, the arrival in Daniel's room. Real mouse
 * presses on the entrance's published setup hits (the walk's own sequence, tools/walk.mjs), a frame after each press.
 *     node tools/s375-entrance.mjs --port 5296 [--out out/s375/browser/entrance]
 * Browser only: the entrance's setup is a quad in the stars; the headset has its own entry (a review of it is out of reach of the mock).
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s375/browser/entrance')); fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, protocolTimeout: 300000, args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'], defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 2 } });
const log = []; let n = 0;
try {
  const page = await b.newPage();
  const shot = async (name, note) => { const f = `${String(++n).padStart(2, '0')}-${name}.png`; await page.screenshot({ path: path.join(OUT, f) }); log.push({ file: f, note }); console.log(f, note); };
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&debug=1&cut=speedrun`, { waitUntil: 'load', timeout: 240000 });
  await wait(1500); await shot('door-arriving', 'the page opening: the entrance before it is ready');
  await page.waitForSelector('#restore-entrance[data-phase="wake"]', { timeout: 180000 });
  await wait(1200); await shot('wake', 'the entrance waiting to be woken (the title over the stars)');
  await page.mouse.click(640, 360); await wait(2500); await shot('after-wake', 'the first press: the stars arrive');
  const press = async (id, note) => {
    await page.waitForFunction((id) => JSON.parse(document.getElementById('restore-entrance')?.dataset.setupHits || '[]').some((h) => h.id === id), { timeout: 40000 }, id);
    const h = await page.evaluate((id) => JSON.parse(document.getElementById('restore-entrance').dataset.setupHits).find((h) => h.id === id), id);
    await wait(900); await shot(`setup-${id}`, `${note}: the control "${id}" about to be pressed`);
    await page.mouse.click(h.x + h.w / 2, h.y + h.h / 2); await wait(700);
  };
  const seq = [['setup-choice-0', 'greeting'], ['setup-choice-0', 'Got it'], ['setup-choice-0', 'Whose session'], ['setup-close', 'the first window'], ['setup-test', 'the chime test'], ['setup-sound-on', 'sound on'], ['setup-choice-0', 'how to look'], ['setup-close', 'the second window'], ['setup-choice-0', 'start the lesson'], ['setup-start', 'Show me']];
  for (const [id, note] of seq) { try { await press(id, note); } catch (e) { console.log('  ⚠', id, String(e).slice(0, 80)); } }
  try { await press('setup-choice-0', 'Got it'); await page.waitForFunction(() => document.getElementById('restore-entrance')?.dataset.setupStage === 'note', { timeout: 30000 }); await wait(800); await shot('setup-note', 'the note before the gate'); await press('setup-close', 'the only gate'); } catch (e) { console.log('  ⚠ gate', String(e).slice(0, 80)); }
  try {
    await press('setup-advert-play-0', 'the advert');
    for (const s of [6, 20, 45, 70, 90]) { await wait((s - (s === 6 ? 0 : [6, 20, 45, 70, 90][[6, 20, 45, 70, 90].indexOf(s) - 1])) * 1000); await shot(`film-${s}s`, `the opening film, ${s} s in`); }
  } catch (e) { console.log('  ⚠ film', String(e).slice(0, 80)); }
  let last = '';
  for (let i = 0; i < 80; i++) {
    const st = await page.evaluate(() => ({ stage: document.getElementById('restore-entrance')?.dataset.setupStage ?? null, phase: window.__os?.phase ?? null }));
    const key = JSON.stringify(st);
    if (key !== last) { last = key; await wait(900); await shot(`state-${st.stage ?? 'gone'}-${st.phase ?? 'x'}`, `the entrance state ${key}`); }
    if (st.phase === 'r_boot' || st.phase === 'r_profile') break;
    await wait(2000);
    // an end-of-film "All set" control, if there is one, is the walk's next press
    const next = await page.evaluate(() => JSON.parse(document.getElementById('restore-entrance')?.dataset.setupHits || '[]').map((h) => h.id));
    const id = next.find((x) => /^setup-(choice-0|start|close|done|go)/.test(x));
    if (id) { try { await press(id, 'the end of the setup'); } catch { /* the entrance has gone */ } }
  }
  await wait(2500); await shot('arrival-boot', "Daniel's room: the machine's first screen");
} finally { fs.writeFileSync(path.join(OUT, 'entrance.json'), JSON.stringify(log, null, 1)); await b.close(); }
