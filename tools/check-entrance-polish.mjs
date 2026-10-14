/** Real presses through both front doors; same room appearance and review stills.
 * Always pass --port. This is tooling, never part of the runtime. */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const arg = (name, fallback) => { const i = process.argv.indexOf('--' + name); return i < 0 ? fallback : process.argv[i + 1]; };
const terminalPlan = JSON.parse(fs.readFileSync(new URL('../data/strings/institution.json',import.meta.url))).steps.e1[0];
const cursorX = Math.min(59,2 + terminalPlan.next.length * 4);
const port = arg('port'); if (!port || port === '3000') throw new Error('Pass the task port with --port (never 3000).');
const out = path.resolve(arg('out', 'out/entrance-polish')); fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: arg('chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'), headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox'] });
const errors = [], checks = [], shots = [], metrics = {}, wait = ms => new Promise(r => setTimeout(r, ms));
async function pageFor(view, query) {
  const p = await browser.newPage(); await p.setViewport({ ...view, deviceScaleFactor: 1 });
  p.on('pageerror', e => errors.push(String(e))); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(`http://localhost:${port}/?reinterp=1&kiosk=0&debug=1${query}`, { waitUntil: 'networkidle2', timeout: 180000 });
  await p.addStyleTag({content:'#motion-diagnostic{display:none!important}'}); return p;
}
async function shot(p, name) {
  const f = `${p.viewport().width}x${p.viewport().height}-${name}.png`;
  await p.screenshot({ path: path.join(out, f) }); shots.push(f); metrics[f] = await p.evaluate(()=>({drawCalls:window.__app?.stats.drawCalls.total,pose:window.__camPose?.()})); console.log(f);
}
async function press(p, id) {
  await p.waitForFunction(id => JSON.parse(document.getElementById('restore-entrance')?.dataset.setupHits || '[]').some(h => h.id === id), { timeout: 45000 }, id);
  const h = await p.evaluate(id => JSON.parse(document.getElementById('restore-entrance').dataset.setupHits).find(h => h.id === id), id);
  await p.mouse.click(h.x + h.w / 2, h.y + h.h / 2); await wait(250);
}
async function stage(p, name) { await p.waitForFunction(name => document.getElementById('restore-entrance')?.dataset.setupStage === name, { timeout: 30000 }, name); }
async function props(p, door) {
  const appearance = await p.evaluate(cursorX => {
    const a = window.__roomAppearance();
    for (const [id, nodes] of Object.entries(a)) {
      let i = 0;
      window.__app.root.findByName(id).forEach(e => {
        nodes[i++].texturePixels = (e.render?.meshInstances ?? []).map(mi => [mi.material.diffuseMap,mi.material.emissiveMap,mi.material.opacityMap].map(t => {
          const source = t?.getSource();
          if (!(source instanceof HTMLCanvasElement)) return null;
          const bytes = source.getContext('2d')?.getImageData(0,0,source.width,source.height).data;
          let hash = 2166136261; if (bytes) for (let j=0;j<bytes.length;j++) {
            // Independent visits have independent caret phases. Mask ONLY its 3×1 pixels.
            const pixel=Math.floor(j/4), x=pixel%source.width, y=Math.floor(pixel/source.width);
            if(id==='inst_terminalScreen' && y===32 && x>=cursorX && x<cursorX+3) continue;
            hash = Math.imul(hash ^ bytes[j],16777619) >>> 0;
          }
          return hash;
        }));
      });
    }
    return a;
  }, cursorX);
  fs.writeFileSync(path.join(out, `appearance-${door}.json`), JSON.stringify(appearance, null, 2)); return appearance;
}
async function closeups(p, tag) {
  // Review poses, not reachability claims. Aim at actual prop centres.
  for (const [id, name] of [['tennisRacketModel','racket'],['danielHandheld','gameboy']]) {
    const pose = await p.evaluate(id => {
      const e = window.__app.root.findByName(id), q = e.getPosition();
      const eye = { x: q.x + 0.25, y: q.y + 0.55, z: q.z + 0.6 };
      const target = { x: q.x, y: q.y + (id === 'danielHandheld' ? 0.035 : 0.018), z: q.z };
      const dx = target.x - eye.x, dy = target.y - eye.y, dz = target.z - eye.z;
      return [eye.x,eye.y,eye.z,Math.atan2(dy,Math.hypot(dx,dz))*180/Math.PI,Math.atan2(-dx,-dz)*180/Math.PI];
    },id);
    await p.evaluate(a => window.__camFree(...a), pose); await wait(600); await shot(p, `${name}-${tag}`);
  }
}
try {
  const appearance = {};
  for (const view of [{width:1280,height:720},{width:390,height:844}]) {
    const p = await pageFor(view, ''); await p.waitForSelector('#restore-entrance[data-phase="wake"]',{timeout:180000}); await wait(8500);
    await shot(p,'wake-title'); await p.mouse.click(view.width/2,view.height/2); await wait(340); await shot(p,'arrival-star');
    await wait(900); await shot(p,'window-unfold'); await stage(p,'balloon-1'); await wait(1600); await shot(p,'setup-hi');
    assert(await p.evaluate(async()=>{const a=await import('/src/audio/tapeAudio.ts');return a.playingNow().includes('lambyos_home_loop.mp3')}), 'Wake press starts Home loop');
    checks.push(`${view.width}: audio loop playing after wake press`);
    await press(p,'setup-choice-0'); await shot(p,'about-intro'); await press(p,'setup-choice-0'); await stage(p,'about'); await shot(p,'about');
    if(view.width < 600) { for(let i=0;i<3;i++){ const next=await p.evaluate(()=>JSON.parse(document.getElementById('restore-entrance')?.dataset.setupHits||'[]').some(h=>h.id==='setup-about-next')); if(!next)break; await press(p,'setup-about-next'); await shot(p,'about-page-'+(i+2)); } }
    await press(p,'setup-close');
    await stage(p,'balloon-3'); await shot(p,'session-intro'); await press(p,'setup-choice-0'); await stage(p,'session'); await shot(p,'whose-session'); await press(p,'setup-close');
    await stage(p,'balloon-4'); await shot(p,'sound-balloon'); await press(p,'setup-test'); await stage(p,'balloon-4'); checks.push(`${view.width}: test chime leaves sound balloon in place`);
    await press(p,'setup-sound-on'); await press(p,'setup-choice-0'); await stage(p,'look'); await shot(p,'how-to-look'); await press(p,'setup-close');
    await stage(p,'note'); await shot(p,'content-note'); await press(p,'setup-reduce-motion'); await shot(p,'reduce-motion-checked');
    assert(await p.evaluate(async()=> (await import('/src/state/motion.ts')).reducedMotion()),'Checkbox applies');
    await press(p,'setup-reduce-motion'); await press(p,'setup-close'); await stage(p,'balloon-7'); await shot(p,'version'); await press(p,'setup-choice-0'); await stage(p,'balloon-8'); await shot(p,'advert-intro');
    await press(p,'setup-advert-play-0'); await stage(p,'advert'); await shot(p,'advert-player'); await p.waitForFunction(()=>window.__os.setup.film?.duration>1); await p.evaluate(()=>{const f=window.__os.setup.film;f.currentTime=f.duration-0.3}); await stage(p,'balloon-9');   /* S245: no Skip; diagnostic seek to the end */ await shot(p,'start');
    await press(p,'setup-choice-0'); await wait(380); await shot(p,'fold-window'); await wait(630); await shot(p,'fold-star');
    await p.waitForSelector('#restore-entrance[data-phase="restore"]',{timeout:30000}); await wait(900); await shot(p,'stars-to-pixels'); await wait(2000); await shot(p,'pixels-to-room'); await wait(2300); await shot(p,'room-resolve-flight');
    await p.waitForFunction(()=> !document.getElementById('restore-entrance'), {timeout:120000}); await wait(1200);
    await p.evaluate(()=>{ document.querySelectorAll('[id^="debug"]').forEach(e=>e.style.display='none'); });
    await shot(p,'room-specks');
    await p.evaluate(()=>window.__camFree(1.0,2.25,2.55,-28,22)); await wait(500); await shot(p,'room-wide-specks');
    if (view.width===1280) appearance.restore = await props(p,'restore');
    await closeups(p,'restore'); await p.close();
    const h=await pageFor(view,'&entrance=home'); await h.waitForSelector('#lambyos-home',{timeout:180000});
    await h.click('[data-home="notice"]'); await h.click('[data-home-close]'); await h.click('[data-home="computer"]');
    await h.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>/Log in/.test(b.textContent)&&!b.disabled),{timeout:180000});
    await h.evaluate(()=>[...document.querySelectorAll('button')].find(b=>/Log in/.test(b.textContent)&&!b.disabled).click());
    await h.waitForFunction(()=>window.__roomAppearance && window.__camPose && !window.__camPose().driven && !window.__camPose().descent,{timeout:120000}); await wait(1200);
    if(view.width===1280) appearance.home=await props(h,'home'); await closeups(h,'home'); await h.close();
  }
  const differences = Object.keys(appearance.home).filter(id => JSON.stringify(appearance.home[id]) !== JSON.stringify(appearance.restore[id]));
  fs.writeFileSync(path.join(out,'PROP_COMPARISON.json'),JSON.stringify({compared:Object.keys(appearance.home).length,differences,checks,errors,shots,metrics,caretMask:{prop:'inst_terminalScreen',x:cursorX,y:32,width:3,height:1,reason:'independent blink phases; every other texture pixel is compared'}},null,2));
  assert.deepEqual(differences, [], 'Every prop transform/material matches Home'); assert.deepEqual(errors, [], 'Browser console clean');
  console.log('PASS: all props identical; sound in place; checkbox applies; console clean');
} finally { await browser.close(); }
