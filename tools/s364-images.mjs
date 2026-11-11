#!/usr/bin/env node
/**
 * ⚑ S364 — PHOTOGRAPH THE PORTRAIT, THE FILTER AND THE MORPH, AND THE HEADSET'S TRY-ON AND RAID.
 *
 *     node tools/s364-images.mjs --port 3181 [--out out/s364-images] [--only sheets|headset] [--help]
 *
 * Sheets (tools/s364-images.html, the painters drawn into plain canvases): (a) Maya's photo and the goal picture at
 * the piece's sizes, (b) the swap filter at k = 0, 0.5, 1, (c) the morph at 0…1 and the raid's broken card, and the
 * mirror on the glass at several seconds. Headset (the real app, ?reinterp=1&era=4&debug=1): the try-on, the raid and
 * the naming with the filter dragged back, from the seat; `--help` runs the raid with Junie's 'v3:help' filed.
 * Needs a Vite dev server on --port (run it in this worktree). Writes PNGs + REPORT.md to --out.
 */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const has = (n) => argv.includes(`--${n}`);
const PORT = Number(flag('port', 3181));
const OUT = path.resolve(flag('out', 'out/s364-images'));
const ONLY = flag('only', '');
const HELP = has('help');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function main() {
  const puppeteer = (await import('puppeteer-core')).default;
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? CHROME, headless: true,
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox'], defaultViewport: { width: 1280, height: 860 } });
  const log = [];
  const errors = [];

  if (ONLY !== 'headset') {
    const page = await browser.newPage();
    page.on('pageerror', (e) => errors.push('sheet: ' + String(e).slice(0, 240)));
    await page.goto(`http://127.0.0.1:${PORT}/tools/s364-images.html`, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForFunction(() => window.__ready === true, { timeout: 30000 });
    const sheet = async (name, arg, file) => {
      await page.evaluate((n, a) => window.__sheet(n, a), name, arg);
      await wait(150);
      const el = await page.$('#c');
      await el.screenshot({ path: path.join(OUT, file) });
      log.push(`${file}  sheet ${name}${arg !== undefined ? ' ' + arg : ''}`);
      console.log(file);
    };
    await sheet('pair', undefined, 'a-photo-and-goal.png');
    await sheet('filter', undefined, 'b-swap-filter.png');
    await sheet('morph', undefined, 'c-morph.png');
    await sheet('callers', undefined, 'a2-callers.png');
    for (const t of [1, 8, 13, 18, 22, 30]) await sheet('tryon', t, `d-mirror-t${String(t).padStart(2, '0')}.png`);
    await page.close();
  }

  if (ONLY !== 'sheets') {
    const page = await browser.newPage();
    page.on('pageerror', (e) => errors.push('app: ' + String(e).slice(0, 240)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('app console: ' + m.text().slice(0, 240)); });
    await page.goto(`http://127.0.0.1:${PORT}/?reinterp=1&kiosk=0&era=4&debug=1&descent=0`, { waitUntil: 'networkidle2', timeout: 90000 });
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => (b.textContent || '').includes('Log in') && !b.disabled), { timeout: 60000 }).catch(() => {});
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Log in')); if (b) b.click(); });
    await page.waitForFunction(() => window.__os && window.__os.e4 && window.__camFree, { timeout: 60000 });
    await page.addStyleTag({ content: 'body > *:not(canvas):not(#reinterp-ball-caption) { display: none !important; }' });
    // ⚑ `--help`: file what Kettle files when Maya sends "help" to Junie (the other builder's reply); the dev server hands
    //   back the app's own ledger module, so this is the same object the shell reads
    if (HELP) await page.evaluate(async () => { const m = await import('/src/state/ledger.ts'); m.ledger.e4Space.push({ id: 'v3:help', outcome: 'pressed', witness: 'S364 review: help sent to Junie' }); });
    await page.evaluate(() => window.__os.e4.browser.debugFinishProgram?.());
    await wait(1500);
    // ⚑ from the seat: the glass is head-locked, so what it carries is the same at any bearing
    await page.evaluate(() => window.__camFree(4.6, 1.16, 0.70, -8, 270));
    await page.evaluate(() => window.__os.e4.wear());
    await wait(1500);
    const tag = HELP ? 'help-' : '';
    const shot = async (name, note) => {
      const file = `e-${tag}${name}.png`;
      await page.screenshot({ path: path.join(OUT, file) });
      const st = await page.evaluate(() => { const b = window.__os.e4.ball; return { phase: b.phaseId, hits: (b.hits || []).map((h) => h.id).join(','), filter: b.filterAmount?.toFixed?.(2), dc: window.__drawCalls }; });
      const line = `${file}  ${note} · phase ${st.phase} · filter ${st.filter} · hits [${st.hits}] · draws ${st.dc}`;
      log.push(line); console.log(line);
    };
    // the try-on, run on its own clock
    await page.evaluate(() => window.__os.e4.ball.debugJumpTo('tryon'));
    const t0 = Date.now();
    const at = async (s) => { const ms = s * 1000 - (Date.now() - t0); if (ms > 0) await wait(ms); };
    await at(1.5); await shot('tryon-01', 'try it on: her photograph in the mirror');
    await at(8); await shot('tryon-08', 'the hair, cut from the ends');
    await at(13); await shot('tryon-13', 'the jaw');
    await at(18); await shot('tryon-18', 'the jacket over her top');
    await at(25); await shot('tryon-25', 'the hands; the gloss landing');
    await at(31); await shot('tryon-31', '"You, restored. It already fits."');
    await page.waitForFunction(() => window.__os.e4.ball.invited, { timeout: 20000 }).catch(() => {});
    await wait(600); await shot('invited', "Junie's link over the morph");
    // her press: Let them in
    await page.evaluate(() => { const h = window.__os.e4.ball.hits[0]; window.__os.handleClick(h.x + h.w / 2, h.y + h.h / 2); });
    const r0 = Date.now();
    const rat = async (s) => { const ms = s * 1000 - (Date.now() - r0); if (ms > 0) await wait(ms); };
    await rat(0.45); await shot('raid-0', 'the raid: the picture lifts off the mirror');
    await rat(1.6); await shot('raid-1', HELP ? "junie's answer to her help" : 'the raid lines arrive: the gloss cracks');
    await rat(4.5); await shot('raid-2', 'the cracks spread');
    await page.waitForFunction(() => window.__os.e4.ball.phaseId === 'naming', { timeout: 30000 }).catch(() => {});
    // the naming: photograph each step, pressing her two chips as they come
    for (let i = 0; i < 40; i++) {
      await wait(1100);
      const st = await page.evaluate(() => ({ phase: window.__os.e4.ball.phaseId, hits: (window.__os.e4.ball.hits || []).map((h) => h.id) }));
      if (st.phase !== 'naming' && st.phase !== 'turnAsk') break;
      if (i % 2 === 0 || st.hits.length) await shot(`naming-${String(i).padStart(2, '0')}`, 'the naming');
      if (st.hits.some((h) => h.startsWith('naming-press-'))) {
        await page.evaluate(() => { const h = window.__os.e4.ball.hits[0]; window.__os.handleClick(h.x + h.w / 2, h.y + h.h / 2); });
        await wait(900); await shot(`naming-${String(i).padStart(2, '0')}-pressed`, 'her press drags the filter back');
      }
      if (st.phase === 'turnAsk') { await shot('turnAsk', 'her own photograph, whole; junie: look behind the stage'); break; }
    }
    await page.close();
  }

  fs.writeFileSync(path.join(OUT, `REPORT${HELP ? '-help' : ''}${ONLY ? '-' + ONLY : ''}.md`), `STATUS: generated\n\n# S364 images · ${new Date().toISOString()}\n\n${log.join('\n')}\n\n## page errors\n${errors.join('\n') || 'none'}\n`);
  console.log(`errors: ${errors.length ? errors.join('\n') : 'none'}`);
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
