#!/usr/bin/env node
/**
 * S375 (UiB job 19 Part A) — the hub, the four era websites and the sources page, photographed as pages (the viewport at
 * 2560 × 1440, and the whole page). Static files from public/sites/ and public/sources/, served by the dev server.
 *     node tools/s375-sites.mjs --port 5296 [--out out/s375/browser/sites]
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const PORT = Number(flag('port', 0)); if (!PORT) throw Error('Pass --port');
const OUT = path.resolve(flag('out', 'out/s375/browser/sites')); fs.mkdirSync(OUT, { recursive: true });
const PAGES = [['hub', '/sites/index.html'], ['1997', '/sites/1997/index.html'], ['2003', '/sites/2003/index.html'], ['2016', '/sites/2016/index.html'], ['2026', '/sites/2026/index.html'], ['sources', '/sources/index.html']];
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle'], defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 2 } });
const log = [];
try {
  for (const [id, url] of PAGES) {
    const p = await b.newPage();
    await p.goto(`http://localhost:${PORT}${url}`, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 1500));
    await p.screenshot({ path: path.join(OUT, `${id}.png`) });
    await p.screenshot({ path: path.join(OUT, `${id}-full.png`), fullPage: true });
    const h = await p.evaluate(() => document.documentElement.scrollHeight);
    log.push({ id, url, height: h });
    console.log(`${id}  ${url}  height ${h}`);
    await p.close();
  }
} finally { fs.writeFileSync(path.join(OUT, 'sites.json'), JSON.stringify(log, null, 1)); await b.close(); }
