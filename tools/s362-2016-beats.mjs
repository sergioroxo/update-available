/**
 * S362 (UiB job 13 Part C) — review photographs of the 2016 beats H28, H41, H42, H43, H45.
 * Usage: node tools/s362-2016-beats.mjs <port> <tag>      (tag: before | after)
 * Each scenario reloads the page, drives the live GraceQueueLite through debug beats / its own public state, and draws
 * the workstation (676x390 at 2x) or the phone (180x360 at 3x) into an offscreen canvas. Missing features are skipped, so the
 * same script photographs the build before a change.
 */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const port = process.argv[2] || 3203, tag = process.argv[3] || 'after';
const OUT = process.env.S362_OUT || '/Users/sergiogalvaoroxo/update-available-uib/out/s362/2016';
fs.mkdirSync(OUT, { recursive: true });
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required'] });
const save = (n, u) => { fs.writeFileSync(`${OUT}/${n}-${tag}.png`, Buffer.from(u.split(',')[1], 'base64')); console.log(n); };
async function scenario(name, fn, arg) {
  const p = await b.newPage();
  p.on('pageerror', e => console.log('PAGEERROR', name, e.message));
  try {
    await p.goto(`http://localhost:${port}/?reinterp=1&debug=1&kiosk=0&era=3`, { waitUntil: 'networkidle2' });
    await p.waitForFunction(() => window.__graceQueue?.());
    await new Promise(r => setTimeout(r, 3500));
    const shots = await p.evaluate(fn, arg);
    for (const [n, u] of Object.entries(shots || {})) save(n, u);
  } catch (e) { console.log('SKIP', name, e.message.split('\n')[0]); } finally { await p.close(); }
}
const PRE = `
  const q = window.__graceQueue(); const ph = q.phone;
  const mk = (w, h, s) => { const c = document.createElement('canvas'); c.width = w * s; c.height = h * s; const x = c.getContext('2d'); x.scale(s, s); return [c, x]; };
  const mon = () => { const [c, x] = mk(676, 390, 2); q.draw(x, 676, 390); return c.toDataURL(); };
  const dev = () => { const [c, x] = mk(180, 360, 3); ph.draw(x, 180, 360); return c.toDataURL(); };
  const tick = (sec) => { for (let i = 0; i < sec * 20; i++) { ph.atRest = true; ph.tick(0.05, true); } };
  q.lambyGuide = null; q.pauseOpen = false; q.seenTask = true; q.debugBeat('board'); q.mode = 'board'; q.veraPage = null; ph.atRest = true; ph.bannersHidden = false;
`;
// page.evaluate needs a function: the scenario body is wrapped as one (with PRE in front)
const ev = (body) => `() => { ${PRE} const out = {}; ${body}; return out; }`;
const S = (body) => new Function(`return ${ev(body)}`)();

await scenario('family', S(`
  const s = q.surfaces.get('family'); q.mode = 'list'; q.openSurface = s; out['family-calls-open'] = mon();
`));
await scenario('kit', S(`
  if ('kitPopin' in q) { q.kitPopin = true; q.kitPopinT = 0.1; out['kit-urgent-popin'] = mon(); q.kitPopinT = 0.6; out['kit-urgent-popin-b'] = mon(); }
  else { q.veraPage = 'kit'; out['kit-urgent-popin'] = mon(); }
`));
await scenario('kindredraft', S(`
  q.storyOffer = true;
  if ('storyOfferT' in q) { q.storyOfferT = 1.8; out['kindredraft-draft-typing'] = mon(); q.storyOfferT = 6; out['kindredraft-draft-full'] = mon(); }
  else out['kindredraft-draft-typing'] = mon();
`));
await scenario('malta', S(`
  ph.debugBeat('news'); ph.pressControl('reply-bea'); tick(2.4);
  q.mirrorLarge = false; q.veraPage = 'removals'; q.removalsShown = true;
  out['malta-platform-alert'] = mon(); tick(5.2); out['malta-platform-removing'] = mon();
`));
await scenario('news', S(`
  ph.startNews(); q.mirrorLarge = true; q.mirrorMin = false; q.cascadeConduct = true; q.mirrorReading = true; ph.showGroup();
  tick(1.0); out['news-1-bea'] = mon(); tick(5.4); out['news-2-article-on-glass'] = mon(); tick(7.0); out['news-3-back-on-thread'] = mon();
`));
await scenario('photos', S(`
  ph.arrive('arrival'); tick(0.2); ph.pressControl('evening:Orla'); out['orla-thread-photos-label'] = dev();
  ph.pressControl('open-photos'); out['orla-photo-message-opens-photos'] = dev();
  ph.pressControl('photo-1'); out['orla-photo-one'] = dev();
  ph.pressControl('back'); ph.pressControl('back'); out['orla-back-in-thread'] = dev();
`));
await scenario('mam', S(`
  ph.arrive('decision'); tick(0.2); ph.debugBeat('home'); out['mam-1-banner'] = dev();
  tick(ph.debugState().bannerAge < 1 ? 9.2 : 4.2); out['mam-2-notes-typing'] = dev(); tick(3); out['mam-3-notes-typing-more'] = dev(); tick(3.5); out['mam-4-notes-held'] = dev();
`));
await b.close();
