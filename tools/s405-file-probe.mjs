#!/usr/bin/env node
/**
 * ⚑ S405 (UiB job 31, T94) — each story's entries in its own file, photographed before and after.
 *
 *     node tools/s405-file-probe.mjs --port 5451 --ledger <WALK_….json> --label before|after [--out <dir>]
 *
 * One visit for both builds: the ledger a real walk ended with (`--ledger`, the walk report's `ledger`), poured into the
 * page's own ledger. The mothers' check-ins are filed the way the build's own familyCalls files them: bare (`p_maureen`)
 * where record.ts has no `familyCheckinId` (before S405), through it where it has (after) — so the two runs differ only
 * by the code. Then, per surface, the file as a visitor sees it:
 *   - 1997's file (the tray, `?reveal=1` + the desktop): Daniel's 1997, newest first;
 *   - 2003's "Your file (read only)" (the desktop icon, `?era=2`): Daniel's 1997 and 2003, newest first;
 *   - 2016's "My account · activity" (`?era=3`, signed in): Vera's own record;
 *   - the game menu's "Your file" (from 2016): the whole file, one heading per era — a still at each of 1997, 2003 and
 *     2016, and the page's text;
 *   - the Close's panels: the three lines per era app.ts gives them (flagged first), as text — the Close reads the file
 *     when it begins, which a review page cannot re-run on a poured ledger.
 * Writes <label>-*.png, <label>-menu-yourfile.txt and <label>-report.json (entries per era, the panels' lines, errors).
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const LABEL = flag('label', 'probe');
const OUT = path.resolve(flag('out', 'out/s405-file'));
const WALK = JSON.parse(fs.readFileSync(flag('ledger', ''), 'utf8'));
const VISIT = WALK.ledger;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, timeout: 180000,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--disable-audio-output'] });
const report = { label: LABEL, port: PORT, ledgerFrom: flag('ledger', ''), surfaces: {}, errors: [] };
const savePng = (url, file) => fs.writeFileSync(path.join(OUT, `${LABEL}-${file}`), Buffer.from(url.split(',')[1], 'base64'));

/** pour the walk's ledger into the page's own, the mothers filed as this build's familyCalls files them */
const POUR = `async (visit) => {
  const L = (await import('/src/state/ledger.ts')).ledger;
  const R = await import('/src/witness/record.ts');
  const fam = new Set(['p_maureen', 'p_annette']);
  const asBuilt = (id) => (R.familyCheckinId && fam.has(id) ? R.familyCheckinId(id) : id);
  for (const [k, v] of Object.entries(visit)) {
    if (!Array.isArray(v) || !Array.isArray(L[k])) continue;
    const rows = k === 'checkins' ? v.map((c) => ({ ...c, id: asBuilt(c.id) })) : v;
    L[k].splice(0, L[k].length, ...JSON.parse(JSON.stringify(rows)));
  }
  if (visit.guidePersonalisation) L.guidePersonalisation.personalised = !!visit.guidePersonalisation.personalised;
  const by = R.entriesByEra();
  const pick = (era) => { const es = by[era]; return [...es.filter((e) => e.flagged), ...es.filter((e) => !e.flagged)].slice(0, 3).map((e) => e.witness); };
  return {
    familyIds: L.checkins.filter((c) => /p_maureen|p_annette/.test(c.id)).map((c) => c.id),
    perEra: Object.fromEntries(Object.entries(by).map(([e, es]) => [e, es.length])),
    perEraEntries: Object.fromEntries(Object.entries(by).map(([e, es]) => [e, es.map((x) => ({ kind: x.kind, id: x.id, witness: x.witness }))])),
    closePanels: { 1: pick('e1'), 2: pick('e2'), 3: pick('e3'), 4: pick('e4') }
  };
}`;

async function boot(query) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => report.errors.push(`${query}: ${String(e).slice(0, 200)}`));
  page.on('console', (m) => { if (m.type() === 'error') report.errors.push(`${query}: ${m.text().slice(0, 200)}`); });
  await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&${query}&debug=1&descent=0&home=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__app && window.__os && window.__poses, { timeout: 180000 });
  await wait(5000);
  return page;
}

// ── 1997: the tray's file ──
{
  const page = await boot('reveal=1');
  await page.evaluate(() => window.__os.debugJump('desktop'));
  await wait(2500);
  const poured = await page.evaluate(`(${POUR})(${JSON.stringify(VISIT)})`);
  report.visit = poured;
  await wait(800);
  const hit = await page.evaluate(() => (window.__os.hits ?? []).find((h) => h.id === 'file-tray') ?? null);
  if (hit) { await page.evaluate((h) => window.__os.handleClick(h.x + h.w / 2, h.y + h.h / 2), hit); await wait(1200); }
  savePng(await page.evaluate(() => window.__os.canvas.toDataURL()), '1997-your-file.png');
  report.surfaces['1997'] = { item: 'file-tray', pressed: !!hit };
  await page.close();
}

// ── 2003: "Your file (read only)" ──
{
  const page = await boot('era=2');
  await page.evaluate(`(${POUR})(${JSON.stringify(VISIT)})`);
  await wait(1500);
  const hit = await page.evaluate(() => (window.__os.hits ?? []).find((h) => h.id === 'icon-your-file') ?? null);
  let opened = false;
  if (hit) { opened = await page.evaluate((h) => { window.__os.handleClick(h.x + h.w / 2, h.y + h.h / 2); return !!window.__os.yourFileOpen; }, hit); await wait(1200); }
  savePng(await page.evaluate(() => window.__os.canvas.toDataURL()), '2003-your-file.png');
  report.surfaces['2003'] = { item: 'icon-your-file', pressed: !!hit, opened };
  await page.close();
}

// ── 2016: "My account · activity", then the game menu's Your file ──
{
  const page = await boot('era=3');
  for (let i = 0; i < 12; i++) {
    const done = await page.evaluate(() => {
      const q = window.__graceQueue(); const r = (q.rects ?? []).find((h) => h.id === 'signin' || h.id === 'consent-allow');
      if (!r) return !['dark', 'boot', 'install', 'signin', 'consent'].includes(q.mode);
      q.handleClick(r.x + r.w / 2, r.y + r.h / 2); return false;
    });
    if (done) break;
    await wait(1500);
  }
  await page.evaluate(`(${POUR})(${JSON.stringify(VISIT)})`);
  await wait(1500);
  const shotQ = async (file) => savePng(await page.evaluate(() => { const q = window.__graceQueue(); const c = document.createElement('canvas'); c.width = 676; c.height = 390; q.draw(c.getContext('2d'), c.width, c.height); return c.toDataURL(); }), file);
  const hit = await page.evaluate(() => (window.__graceQueue().rects ?? []).find((h) => h.id === 'account-activity') ?? null);
  if (hit) { await page.evaluate((h) => window.__graceQueue().handleClick(h.x + h.w / 2, h.y + h.h / 2), hit); await wait(1500); }
  await shotQ('2016-my-account-activity.png');
  // the page's own scroll, if it has one: a second still further down
  const scrolled = await page.evaluate(() => { const q = window.__graceQueue(); const r = (q.rects ?? []).find((h) => /scroll|more|down|next/i.test(h.id)); if (!r) return null; q.handleClick(r.x + r.w / 2, r.y + r.h / 2); return r.id; });
  if (scrolled) { await wait(800); await shotQ('2016-my-account-activity-2.png'); }
  report.surfaces['2016'] = { item: 'account-activity', pressed: !!hit, secondPage: scrolled };

  // the game menu → Your file (the whole file, a heading per era)
  await page.evaluate(async () => { const { gameMenuBus } = await import('/src/state/gameMenuBus.ts'); gameMenuBus.open(); });
  await wait(800);
  const clicked = await page.evaluate(() => {
    const el = [...document.querySelectorAll('div, button, a')].find((e) => e.children.length === 0 && /^Your file — what the systems recorded/.test(e.textContent?.trim() ?? ''));
    if (!el) return false; el.click(); return true;
  });
  await wait(1000);
  const text = await page.evaluate(() => {
    const h = [...document.querySelectorAll('div')].find((e) => e.textContent?.trim() === '1997 · Daniel, sixteen');
    let p = h?.parentElement; return p ? p.innerText : document.body.innerText;
  });
  fs.writeFileSync(path.join(OUT, `${LABEL}-menu-yourfile.txt`), text);
  for (const [year, head] of [['1997', '1997 · Daniel, sixteen'], ['2003', '2003 · Daniel'], ['2016', '2016 · Vera']]) {
    const found = await page.evaluate((head) => {
      const h = [...document.querySelectorAll('div')].find((e) => e.textContent?.trim() === head);
      if (!h) return false; h.scrollIntoView({ block: 'start' }); return true;
    }, head);
    await wait(400);
    if (found) await page.screenshot({ path: path.join(OUT, `${LABEL}-menu-your-file-${year}.png`) });
    report.surfaces[`menu-${year}`] = { found };
  }
  report.surfaces.menu = { opened: clicked };
  await page.close();
}

fs.writeFileSync(path.join(OUT, `${LABEL}-report.json`), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ label: LABEL, perEra: report.visit?.perEra, familyIds: report.visit?.familyIds, surfaces: report.surfaces, errors: report.errors.length }));
await browser.close();
