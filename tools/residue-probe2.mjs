// S357fp — the walker's own census hook (tools/walk.mjs, with the drawImage frame start), run on 2003's residue beat:
// does __textNow hold Daniel's line and Caleb's answer whole on the monitor canvas?
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const PORT = process.argv[2] || 5621;
const src = fs.readFileSync(new URL('./walk.mjs', import.meta.url), 'utf8');
const a = src.indexOf('  await page.evaluateOnNewDocument(() => {\n    const per = new Map();');
const b = src.indexOf('  });', a) + 5;
const hook = src.slice(a, b);
const b2 = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle'], defaultViewport: { width: 1280, height: 720 } });
const page = await b2.newPage();
await new Function('page', `return (async () => { ${hook} })();`)(page);
await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=2&debug=1&descent=0`, { waitUntil: 'networkidle2', timeout: 90000 });
await page.waitForFunction(() => window.__os && window.__os.debugJump, { timeout: 60000 });
await page.evaluate(() => window.__os.debugJump('calebChat')); await new Promise(r => setTimeout(r, 2500));
await page.evaluate(() => { const c = window.__os.caleb; c.phase = 'answer'; c.dirty = true; window.__os.dirty = true; });
await new Promise(r => setTimeout(r, 1500));
const mon = async () => (await page.evaluate(() => window.__textNow())).find(c => c.size === '1536x1152');
const m1 = await mon();
console.log('chip on monitor:', !!m1 && m1.text.replace(/ \| /g, ' ').includes('Then it was never me that was broken…'), '| fragments now:', m1 ? m1.text.split(' | ').length : 0);
await page.evaluate(() => window.__os.caleb.commitResidue());
let met = false;
for (let i = 0; i < 20 && !met; i++) { await new Promise(r => setTimeout(r, 1000)); const m = await mon(); met = !!m && m.text.replace(/ \| /g, ' ').includes('it never was, d. not once.'); }
console.log("Caleb's answer on monitor:", met);
await b2.close();
