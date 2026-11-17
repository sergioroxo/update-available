#!/usr/bin/env node
/**
 * ⚑ S401 (UiB job 29 D1 / D4) — THE ROOM TURNED ROUND, IN ALL FOUR ERAS: the research copies of the back wall (the
 * institution's corner and the record) before it goes, and the same views after.
 *
 *     node tools/s401-backwall-stills.mjs --port 5401 --label before [--out <dir>]
 *
 * Per era (`?era=N`, settled): the record is given a visit's worth of filings in the page's own ledger (a REVIEW
 * state, as tools/stills.mjs files them), while the seat faces the desk, so 1997's corner assembles in its story's
 * order exactly as play would (institution.ts applies what has arrived only while the corner is out of view); then
 * the seat is turned round (its own yaw + 180) and photographed. Three views per era: the seat facing its desk, that
 * seat turned round, and Daniel's seat turned round (Room 1's back wall, where the corner stood in every era). And the
 * draw calls, per view. Computer 1280 × 720.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const LABEL = flag('label', 'after');
const OUT = path.resolve(flag('out', `out/s401-backwall/${LABEL}`));
const ERAS = flag('eras', '1,2,3,4').split(',').map(Number);
const VIEWS = flag('views', '') ? flag('views', '').split(',') : null;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--disable-audio-output'] });

/** a visit's worth of filings for each era's list (the ids record.ts reads; the corner's 1997 beats among them) */
const FILE = {
  1: ['profile-initialized', 'kit-inserted', 'kit-read', 'went-online', 'channel-joined', 'prayer-said', 'pledge-signed',
    'ministry-index-card', 'rob-spoke-mother', 'yes-received', 'enrollment-acknowledged', 'diary-glitch'],
  2: ['forum-recommended', 'forum-rules', 'forum-posted', 'forum-applied', 'testimony-prepared', 'testimony-online'],
  3: [], 4: []
};
const SEAT = { 1: 'r1', 2: 'r1', 3: 'r2', 4: 'r3' };
const rows = [];
for (const era of ERAS) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&${era === 1 ? "reveal=1" : `era=${era}`}&debug=1&descent=0&home=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__app && window.__camPose && window.__os && window.__poses, { timeout: 180000 });
  await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
  await wait(6000);
  // the filings, while the seat faces its desk
  await page.evaluate(async (era, ids) => {
    const L = (await import('/src/state/ledger.ts')).ledger;
    for (let e = 1; e <= era; e++) if (!L.reachedEras.includes(`e${e}`)) L.reachedEras.push(`e${e}`);
    for (const id of ids) if (!L.records.includes(id)) L.records.push(id);
    if (era >= 3) for (let i = 0; i < 4; i++) L.graceQueue.push({ cardId: `s401-${i}`, outcome: i % 2 ? 'APPLY' : 'SKIP', witness: `card s401-${i} filed` });
    if (era >= 4) for (const id of ['program', 'record', 'photos', 'care']) L.e4Space.push({ id, outcome: 'filed', witness: `${id} filed` });
  }, era, ERAS.length ? [...(FILE[1] ?? []), ...(era >= 2 ? FILE[2] : [])] : []);
  const views = [
    { name: 'front', seat: SEAT[era], turn: 0 },
    { name: 'turned', seat: SEAT[era], turn: 180 },
    ...(SEAT[era] !== 'r1' ? [{ name: 'daniel-turned', seat: 'r1', turn: 180 }] : []),
    // the reviewer's eye, a pose the piece never gives: Room 1's back wall whole, from in front of Daniel's desk
    { name: 'wide', seat: 'r1', turn: 180, wide: true }
  ].filter((v) => !VIEWS || VIEWS.includes(v.name));
  for (const v of views) {
    // face the desk first (1997's corner assembles only out of view), then turn
    await page.evaluate((k) => { const s = window.__poses().seats[k]; window.__camFree(s.x, s.y, s.z, s.pitch, s.yaw); }, v.seat);
    await wait(2500);
    if (v.wide) {
      await page.evaluate(() => { window.__camFree(-0.45, 1.6, 0.55, -16, 180); const c = window.__app.root.findByName('camera'); if (c?.camera) c.camera.fov = 75; });
      await wait(2500);
    } else if (v.turn) {
      await page.evaluate((k, t) => { const s = window.__poses().seats[k]; window.__camFree(s.x, s.y, s.z, -4, s.yaw + t); }, v.seat, v.turn);
      await wait(2500);
    }
    const dc = await page.evaluate(() => ({ scene: window.__drawCalls ?? -1, raw: window.__drawCallsRaw ?? -1 }));
    const file = `${LABEL}-${era === 1 ? 1997 : era === 2 ? 2003 : era === 3 ? 2016 : 2026}-${v.name}.png`;
    await page.screenshot({ path: path.join(OUT, file) });
    if (v.wide) await page.evaluate(() => { const c = window.__app.root.findByName('camera'); if (c?.camera) c.camera.fov = 42; });
    rows.push({ era, view: v.name, seat: v.seat, drawCalls: dc, file });
    console.log(`[e${era}] ${v.name} (${v.seat}${v.turn ? ' +180°' : ''}) draw calls ${dc.scene} (raw ${dc.raw}) → ${file}`);
  }
  if (errors.length) console.log(`  page errors: ${errors.join(' | ')}`);
  await page.close();
}
fs.writeFileSync(path.join(OUT, `${LABEL}-backwall${VIEWS ? `-${VIEWS.join("-")}` : ""}.json`), JSON.stringify(rows, null, 1));
await browser.close();
