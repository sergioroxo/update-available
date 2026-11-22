// S357fp probe: does 2003's residue line ever stand whole on a canvas, and how is it drawn (one fillText or many)?
import puppeteer from 'puppeteer-core';
const PORT = process.argv[2] || 5621;
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage();
await p.evaluateOnNewDocument(() => {
  const ft = CanvasRenderingContext2D.prototype.fillText;
  window.__calls = []; window.__perFrame = new Map(); window.__max = new Map();
  const fr = CanvasRenderingContext2D.prototype.fillRect, cr = CanvasRenderingContext2D.prototype.clearRect;
  const full = (ctx, x, y, w, h) => { const c = ctx.canvas, m = ctx.getTransform(); return x * m.a + m.e <= 0.5 && y * m.d + m.f <= 0.5 && (x + w) * m.a + m.e >= c.width - 0.5 && (y + h) * m.d + m.f >= c.height - 0.5; };
  const reset = (ctx) => { const k = ctx.canvas.width + 'x' + ctx.canvas.height; const n = window.__perFrame.get(ctx.canvas) || 0; window.__max.set(k, Math.max(window.__max.get(k) || 0, n)); window.__perFrame.set(ctx.canvas, 0); };
  CanvasRenderingContext2D.prototype.fillRect = function (x, y, w, h) { if (full(this, x, y, w, h)) reset(this); return fr.call(this, x, y, w, h); };
  CanvasRenderingContext2D.prototype.clearRect = function (x, y, w, h) { if (full(this, x, y, w, h)) reset(this); return cr.call(this, x, y, w, h); };
  CanvasRenderingContext2D.prototype.fillText = function (t, ...r) { window.__perFrame.set(this.canvas, (window.__perFrame.get(this.canvas) || 0) + 1); const s = String(t); if (/broken|never|was|once/i.test(s)) window.__calls.push(s); if (window.__calls.length > 4000) window.__calls.splice(0, 2000); return ft.call(this, t, ...r); };
});
await p.goto(`http://localhost:${PORT}/?reinterp=1&kiosk=0&era=2&debug=1&descent=0`, { waitUntil: 'networkidle2', timeout: 90000 });
await p.waitForFunction(() => window.__os && window.__os.debugJump, { timeout: 60000 });
const beats = await p.evaluate(() => Object.keys(window.__os).filter(k => /caleb/i.test(k)));
console.log('os keys', beats);
await p.evaluate(() => window.__os.debugJump('calebChat')); await new Promise(r => setTimeout(r, 2500));
const st = await p.evaluate(() => { const c = window.__os.caleb; return c ? { phase: c.phase, keys: Object.keys(c).slice(0, 40) } : null; });
console.log('caleb', JSON.stringify(st));
// put it in the answer phase and press the residue chip through its own method
await p.evaluate(() => { const c = window.__os.caleb; c.phase = 'answer'; c.dirty = true; window.__os.dirty = true; });
await new Promise(r => setTimeout(r, 1500));
const chip = await p.evaluate(() => window.__calls.filter(s => /broken/.test(s)).slice(-5));
console.log('chip draws', JSON.stringify(chip));
await p.evaluate(() => { window.__calls.length = 0; window.__os.caleb.commitResidue(); });
for (let i = 0; i < 12; i++) { await new Promise(r => setTimeout(r, 1500)); }
const after = await p.evaluate(() => [...new Set(window.__calls)].slice(-30));
console.log('after commit, distinct draws', JSON.stringify(after));
console.log('running count since last full clear, by canvas', JSON.stringify(await p.evaluate(() => [...window.__perFrame.entries()].filter(([, n]) => n > 0).map(([c, n]) => [c.width + 'x' + c.height, n, c === window.__os.canvas]))));
console.log('max fillText per frame, by canvas', JSON.stringify([...(await p.evaluate(() => [...window.__max.entries()]))]));
await b.close();
