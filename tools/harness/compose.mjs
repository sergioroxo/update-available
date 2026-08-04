/**
 * Compose the four S70 captures into one labelled sheet, in the same manner as
 * S69_noa_video_ungraded_vs_graded.png: black strip, monospace label, panels
 * side by side at 1:1 pixels (no scaling — these are pixel-art surfaces).
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SHOTS = path.resolve('shots');

const PANELS = [
  ['1_thread_picker', 'A — the thread, and the template picker'],
  ['2_route', 'B — the reply that ROUTES (follow-up assigned)'],
  ['3_propagation', 'C — the propagation (your sentence, returned)'],
  ['4_floppysheep', 'D — FloppySheep, running']
].map(([f, label]) => ({
  label,
  data: 'data:image/png;base64,' + fs.readFileSync(path.join(SHOTS, `${f}.png`)).toString('base64')
}));

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ['--no-sandbox'], defaultViewport: { width: 400, height: 400 }
});
const page = await browser.newPage();
await page.goto('about:blank');

const out = await page.evaluate(async (panels) => {
  const imgs = await Promise.all(panels.map(p => new Promise((res, rej) => {
    const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = p.data;
  })));
  const BAR = 30, PAD = 8, GAP = 8;
  const h = Math.max(...imgs.map(i => i.height));
  const W = PAD * 2 + imgs.reduce((a, i) => a + i.width, 0) + GAP * (imgs.length - 1);
  const H = PAD + BAR + h + PAD;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#0d0f13';
  ctx.fillRect(0, 0, W, H);
  let x = PAD;
  imgs.forEach((im, i) => {
    ctx.fillStyle = '#15181f';
    ctx.fillRect(x, PAD, im.width, BAR);
    ctx.fillStyle = '#e8ecf4';
    ctx.font = '15px "SF Mono", Menlo, monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(panels[i].label, x + 6, PAD + BAR / 2 + 1);
    ctx.drawImage(im, x, PAD + BAR);
    x += im.width + GAP;
  });
  return c.toDataURL('image/png');
}, PANELS);

const file = path.join(SHOTS, 'S70_composite.png');
fs.writeFileSync(file, Buffer.from(out.split(',')[1], 'base64'));
console.log('wrote', file, fs.statSync(file).size, 'bytes');
await browser.close();
