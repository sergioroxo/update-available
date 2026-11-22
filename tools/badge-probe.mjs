// S357fw probe: 2016's Messages badge counts only the dotted rows and empties as she reads them. `node tools/badge-probe.mjs <port> [outdir]`
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const PORT = process.argv[2] || 5621, OUT = process.argv[3] || 'out/badge'; fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox'] });
const page = await b.newPage(); await page.setViewport({ width: 1280, height: 720 });
const errors = []; page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
await page.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=3&debug=1&descent=0`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForFunction(() => window.__graceQueue && window.__graceQueue() && window.__era3Devices, { timeout: 90000 });
await wait(3000);
await page.evaluate(() => { const q = window.__graceQueue(); q.seenTask = true; q.debugBeat('board'); q.bump(); });
await wait(1500);
const save = async (name) => { const d = await page.evaluate(() => window.__era3Devices().workstation.toDataURL('image/png')); fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(d.split(',')[1], 'base64')); };
const state = () => page.evaluate(() => { const p = window.__graceQueue().phone; const rows = p.inboxRows(); return { badge: p.inboxBadge, dotted: rows.filter(r => !r.read).map(r => `${r.from}:${r.unread}`), undotted: rows.filter(r => r.read && r.unread).map(r => `${r.from}:${r.unread}`) }; });
await page.evaluate(() => { const p = window.__graceQueue().phone; p.screen = 'home'; p.version++; });
await wait(800); await save('badge-home-start');
const steps = [await state()];
for (let i = 0; i < 20; i++) {
  const left = await page.evaluate(() => {
    const p = window.__graceQueue().phone, r = p.inboxRows().find(x => !x.read);
    if (!r) return false;
    if (r.id.startsWith('evening:')) p.openEvening(r.id.slice(8));
    else if (r.id.startsWith('read-')) p.readMessages.add(r.id.slice(5));
    else if (r.id === 'group') p.openGroup();
    else return 'stuck:' + r.id;
    return r.from;
  });
  if (!left) break;
  steps.push({ opened: left, ...(await state()) });
  if (String(left).startsWith('stuck')) break;
}
await page.evaluate(() => { const p = window.__graceQueue().phone; p.screen = 'home'; p.version++; });
await wait(800); await save('badge-home-read');
console.log(JSON.stringify(steps, null, 1)); console.log('errors', errors);
await b.close();
