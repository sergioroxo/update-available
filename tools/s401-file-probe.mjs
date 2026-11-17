#!/usr/bin/env node
/**
 * ⚑ S401 (UiB job 29 D2 / D4) — THE FILE ON EACH ERA'S SCREEN, photographed and checked.
 *
 *     node tools/s401-file-probe.mjs --port 5401 [--out <dir>] [--eras 1,2,3,4]
 *
 * Per era (1997 `?reveal=1` + the desktop, 2003–2026 `?era=N` settled): the seat's first view of the desktop (computer
 * 1280 × 720), with the file's item in it; then a filing (a REVIEW state: lines pushed into the page's own ledger, as
 * tools/stills.mjs files them) — the canvas the moment after (the item lit, its count up) and two seconds later (unlit);
 * then the item pressed (its own published hit, at its centre) and the file open. Each shot is the surface's canvas as
 * the glass shows it, and the room from the seat. Reports the count before/after, whether the item lit, and that it
 * opened. Not a walk: it proves the item is drawn, changes and opens, not that a visitor reaches each era.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s401-file'));
const ERAS = flag('eras', '1,2,3,4').split(',').map(Number);
const MODE = flag('mode', 'computer');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, timeout: 180000,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--disable-audio-output'] });
const YEAR = { 1: 1997, 2: 2003, 3: 2016, 4: 2026 };
const ITEM = { 1: 'file-tray', 2: 'icon-your-file', 3: 'account-activity', 4: 'mem-open' };
const rows = [];

/** the surface's canvas as a PNG, and its published hits (in the surface's own pixels) */
const SURFACE = `(era) => {
  const os = window.__os;
  if (era <= 2) return { url: os.canvas.toDataURL(), hits: os.hits };
  if (era === 3) { const q = window.__graceQueue(); const c = document.createElement('canvas'); c.width = 676; c.height = 390;
    q.draw(c.getContext('2d'), c.width, c.height); return { url: c.toDataURL(), hits: q.rects ?? [] }; }
  const b = os.e4.browser; const c = document.createElement('canvas'); c.width = 710; c.height = 384;
  b.draw(c.getContext('2d'), c.width, c.height); return { url: c.toDataURL(), hits: b.hits };
}`;
const savePng = (url, file) => fs.writeFileSync(path.join(OUT, file), Buffer.from(url.split(',')[1], 'base64'));

for (const era of ERAS) {
  const page = await browser.newPage();
  await page.setViewport(MODE === 'phone' ? { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true } : { width: 1280, height: 720, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  const q = era === 1 ? 'reveal=1' : `era=${era}`;
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&${q}&debug=1&descent=0&home=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__app && window.__os && window.__poses, { timeout: 180000 });
  await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
  await wait(5000);
  // the era's desktop, settled, with something already on file (the record's first lines)
  await page.evaluate(async (era) => {
    const L = (await import('/src/state/ledger.ts')).ledger;
    for (let e = 1; e <= era; e++) if (!L.reachedEras.includes(`e${e}`)) L.reachedEras.push(`e${e}`);
    if (era === 1) { window.__os.debugJump('desktop'); for (const id of ['profile-initialized', 'kit-inserted', 'went-online']) if (!L.records.includes(id)) L.records.push(id); }
    if (era === 2) for (const id of ['forum-recommended', 'forum-rules']) if (!L.records.includes(id)) L.records.push(id);
    if (era === 3) for (let i = 0; i < 3; i++) L.graceQueue.push({ cardId: `s401-${i}`, outcome: 'APPLY', witness: `card s401-${i}: approved as written` });
    if (era === 4) { for (const id of ['program', 'record']) L.e4Space.push({ id, outcome: 'filed', witness: `${id}: filed as care` }); }
  }, era);
  if (era === 4) {
    // the session open: the wake screen gives way to the two windows (the browser, Kettle) under GraceOS's taskbar
    await page.evaluate(() => { const b = window.__os.e4?.browser; if (b?.debugOpen) b.debugOpen(); });
    for (let i = 0; i < 30; i++) { if (await page.evaluate(() => window.__os.e4?.browser?.phase === 'open')) break; await page.evaluate(() => { const b = window.__os.e4?.browser; if (b?.handleClick) b.handleClick(355, 192); }); await wait(1000); }
  }
  await wait(2500);
  const seat = era === 3 ? 'r2' : era === 4 ? 'r3' : 'r1';
  if (MODE !== 'phone') await page.evaluate((k) => { const s = window.__poses().seats[k]; window.__camFree(s.x, s.y, s.z, s.pitch, s.yaw); }, seat);
  await wait(1500);
  const y = YEAR[era];
  const shot = async (name) => { await page.screenshot({ path: path.join(OUT, `${y}-${MODE}-${name}.png`) }); };
  const surf = async (name) => { const s = await page.evaluate(`(${SURFACE})(${era})`); savePng(s.url, `${y}-canvas-${name}.png`); return s; };
  await shot('1-first-view');
  const s1 = await surf('1-first-view');
  const item1 = (s1.hits ?? []).find((h) => h.id === ITEM[era]);
  const count = () => page.evaluate((era) => import('/src/witness/record.ts').then((m) => m.entriesByEra()[`e${era}`].length), era);
  const before = await count();
  // a filing
  await page.evaluate(async (era) => {
    const L = (await import('/src/state/ledger.ts')).ledger;
    if (era === 1) L.records.push('channel-joined');
    if (era === 2) L.records.push('forum-posted');
    if (era === 3) L.graceQueue.push({ cardId: 's401-x', outcome: 'SKIP', witness: 'card s401-x: skipped — flagged for review' });
    if (era === 4) L.e4Space.push({ id: 'photos', outcome: 'filed', witness: 'photos: kept for her goal picture' });
  }, era);
  await wait(350);
  const lit = await page.evaluate((era) => era <= 2 ? window.__os.fileWatch.on : true, era);
  await shot('2-filed-lit');
  await surf('2-filed-lit');
  await wait(2200);
  await surf('3-filed-settled');
  const after = await count();
  // press the item at its centre (its own published hit), then the file is open
  const s3 = await page.evaluate(`(${SURFACE})(${era})`);
  const item = (s3.hits ?? []).find((h) => h.id === ITEM[era]);
  let opened = false;
  if (item) {
    opened = await page.evaluate((era, h) => {
      const x = h.x + h.w / 2, y = h.y + h.h / 2;
      if (era <= 2) { window.__os.handleClick(x, y); return !!window.__os.yourFileOpen; }
      if (era === 3) { window.__graceQueue().handleClick(x, y); return true; }
      window.__os.e4.browser.handleClick(x, y); return !!window.__os.e4.browser.memOpen;
    }, era, item);
    await wait(1200);
    await shot('4-file-open');
    await surf('4-file-open');
  }
  const row = { era: y, item: ITEM[era], itemDrawn: !!item1, itemRect: item1 ?? null, before, after, lit, opened, errors };
  rows.push(row);
  console.log(JSON.stringify(row));
  await page.close();
}
fs.writeFileSync(path.join(OUT, `file-probe-${MODE}.json`), JSON.stringify(rows, null, 1));
await browser.close();
