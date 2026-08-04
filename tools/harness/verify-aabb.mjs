/**
 * Ground-truth check: the live engine's own world AABB for every prop, vs what
 * tools/room-audit.mjs computes offline. Any disagreement is a bug in the tool.
 */
import puppeteer from 'puppeteer-core';
import { execSync } from 'node:child_process';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const state = process.argv[2] ?? 'r3';
const era = { r1: 1, r2: 2, r3: 3, r4: 4 }[state];
const URL = `http://localhost:5173/?reinterp=1&era=${era}&debug=1&nobatch=1&descent=0`;

const audit = JSON.parse(execSync(`node tools/room-audit.mjs --state ${state} --json`, {
  cwd: '/Users/sergiogalvaoroxo/update-available-reinterp', maxBuffer: 1 << 26
}).toString())[0];

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox'],
  defaultViewport: { width: 1280, height: 860 }
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
await page.waitForFunction(() => window.__reinterpNow !== undefined || document.querySelector('canvas'), { timeout: 30000 });
await new Promise((r) => setTimeout(r, 9000));

const live = await page.evaluate(() => {
  const root = window.__roomRoot ?? null;
  const out = {};
  const scan = (ent) => {
    let min = null, max = null;
    ent.forEach((n) => {
      const r = n.render;
      if (!r) return;
      for (const mi of r.meshInstances) {
        const a = mi.aabb;
        const c = a.center, h = a.halfExtents;
        const lo = [c.x - h.x, c.y - h.y, c.z - h.z];
        const hi = [c.x + h.x, c.y + h.y, c.z + h.z];
        if (!min) { min = lo.slice(); max = hi.slice(); }
        else for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], lo[k]); max[k] = Math.max(max[k], hi[k]); }
      }
    });
    return min ? { min, max } : null;
  };
  const app = window.__app;
  const scene = app ? app.root : null;
  if (!scene) return { error: 'no app' };
  const roomEnt = scene.findByName('era1-room');
  if (!roomEnt) return { error: 'no era1-room' };
  for (const child of roomEnt.children) {
    if (!child.enabled) continue;
    const b = scan(child);
    if (b) out[child.name] = b;
  }
  return out;
});

if (live.error) { console.log('LIVE ERROR:', live.error); await browser.close(); process.exit(1); }

let worst = 0, checked = 0, missing = [];
const rows = [];
for (const f of audit.props ?? []) { void f; }
// the audit json carries findings only; recompute boxes via a second run
const boxes = JSON.parse(execSync(`node tools/room-audit.mjs --state ${state} --boxes`, {
  cwd: '/Users/sergiogalvaoroxo/update-available-reinterp', maxBuffer: 1 << 26
}).toString());

for (const [id, b] of Object.entries(boxes)) {
  const l = live[id];
  if (!l) { missing.push(id); continue; }
  checked++;
  const d = Math.max(...[0, 1, 2].map((k) => Math.max(Math.abs(l.min[k] - b.min[k]), Math.abs(l.max[k] - b.max[k]))));
  if (d > worst) worst = d;
  if (d > 0.005) rows.push([id, d.toFixed(4), b.min.map(v => v.toFixed(3)).join(','), l.min.map(v => v.toFixed(3)).join(','), b.max.map(v => v.toFixed(3)).join(','), l.max.map(v => v.toFixed(3)).join(',')]);
}
console.log(`\nstate ${state}: compared ${checked} props · worst corner error ${worst.toFixed(5)} m`);
console.log(`props in data but not live/enabled: ${missing.length}` + (missing.length ? ' → ' + missing.slice(0, 20).join(', ') : ''));
const extra = Object.keys(live).filter((k) => !(k in boxes));
console.log(`props live but not in data: ${extra.length}` + (extra.length ? ' → ' + extra.slice(0, 20).join(', ') : ''));
if (rows.length) {
  console.log('\nDISAGREEMENTS (> 5 mm):');
  for (const r of rows) console.log(`  ${r[0].padEnd(24)} Δ${r[1]}  audit min ${r[2]} / live ${r[3]}   audit max ${r[4]} / live ${r[5]}`);
} else console.log('\nno disagreement over 5 mm.');

await browser.close();
