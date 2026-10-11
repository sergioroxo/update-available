/** Offline W1-B11 mesh/path audit. Always pass --port; never a runtime feature.
 * Real update callbacks run at 120 Hz of simulation time with ordinary app
 * animation paused between samples. Five actual rendered frames per leg; dense mesh-AABB checks
 * use the same clock, including the live morph. GLB POSITION accessor bounds are
 * inventoried too: architecture is authored boxes, not furniture proxy sizes.
 */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i < 0 ? d : process.argv[i + 1]; };
const port = Number(arg('port', 0));
if (!port) throw new Error('Explicit --port required');
const phase = arg('phase', 'before');
const only = arg('only', '');
const out = path.resolve('out/travel-walls', phase);
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--no-sandbox'],
 defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 } });
const results = { phase, radius: 0.06, sampleHz: 120, legs: [], errors: [], glb: {} };
for (const file of fs.readdirSync('public/assets/models').filter(f => f.endsWith('.glb'))) {
 const b = fs.readFileSync('public/assets/models/' + file);
 const j = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString());
 results.glb[file] = j.meshes.flatMap(m => m.primitives.map(p => ({ mesh: m.name,
  min: j.accessors[p.attributes.POSITION].min, max: j.accessors[p.attributes.POSITION].max })));
}
async function pageFor(era, driven = false) {
 const page = await browser.newPage();
 page.on('pageerror', e => results.errors.push(String(e)));
 page.on('console', m => { if (m.type() === 'error') results.errors.push(m.text()); });
 await page.goto(`http://localhost:${port}/?reinterp=1&debug=1&descent=${driven ? 1 : 0}&home=0&kiosk=0&era=${era}`, { waitUntil: 'networkidle2' });
 await page.waitForFunction(() => window.__os || [...document.querySelectorAll('button')].some(b=>b.textContent.includes('Log in')&&!b.disabled), {timeout:120000});
 if (!await page.evaluate(()=>!!window.__os)) await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Log in')).click());
 await page.waitForFunction(() => window.__app && window.__camPose && window.__poses && window.__os, {timeout:120000}).catch(async e=>{console.log(await page.evaluate(()=>({text:document.body.innerText,globals:Object.keys(window).filter(k=>k.startsWith('__'))})));console.log(results.errors);await browser.close();throw e;});
 await page.addStyleTag({content:'body > *:not(canvas) { display:none !important; }'});
 await page.evaluate(() => {
  window.__app.timeScale = 0;
  window.__travelSample = () => {
   const p = window.__camPose();
   const solids = [];
   window.__app.root.forEach(e => {
    if (!e.enabled || !e.render || !/(^wall(North|South|East|West)$|^ceiling$|^spineWall$|door(Front|Back|Cap|Lintel)|^[we]_(wall(Desk|L|R)|lintel)$)/i.test(e.name)) return;
    for (const mi of e.render.meshInstances) {
     // Read SOURCE mesh bounds even when a settled batch renders the source.
     // mi.aabb transforms its mesh's POSITION bounds through the real node.
     const a = mi.aabb, c = a.center, h = a.halfExtents;
     if (Math.min(h.x,h.y,h.z) < 0.00001) continue;
     const min = [c.x-h.x,c.y-h.y,c.z-h.z], max = [c.x+h.x,c.y+h.y,c.z+h.z];
     solids.push({id:e.name,min,max,opacity:mi.material.opacity});
    }
   });
   return { p, solids };
  };
 });
 return page;
}
async function capture(page, name) {
 await page.evaluate(() => window.__app.render());
 await page.screenshot({path:path.join(out,name+'.png')});
}
async function leg(page, name, seconds) {
 const record = { name, seconds, shots:[], crossings:{}, peaks:{linear:0, angular:0}, bounds:{} };
 let prev;
 for (let q = 0; q <= 4; q++) {
  const frames = q ? Math.round(seconds * 120 / 4) : 0;
  const samples = await page.evaluate(n => {
   const list = [];
   for(let i=0;i<n;i++) { window.__app.update(1/120); list.push(window.__travelSample()); }
   if (!n) list.push(window.__travelSample());
   return list;
  },frames);
  for (const {p,solids} of samples) {
   if(prev && p.seq===prev.seq && p.driven && prev.driven && p.t>prev.t) {
    const dt=p.t-prev.t;
    record.peaks.linear=Math.max(record.peaks.linear,Math.hypot(p.x-prev.x,p.y-prev.y,p.z-prev.z)/dt);
    record.peaks.angular=Math.max(record.peaks.angular,Math.hypot(p.pitch-prev.pitch,p.yaw-prev.yaw)/dt);
   }
   prev=p;
   for(const s of solids) {
    record.bounds[s.id]=s;
    if(s.opacity <= 0.001) continue;
    const v=[p.x,p.y,p.z], r=results.radius;
    // Sphere/AABB distance around the prescribed eye, rather than box padding
    const distance=Math.hypot(...v.map((x,i)=>Math.max(s.min[i]-x,0,x-s.max[i])));
    if(distance < r) {
     const c=record.crossings[s.id]??={count:0,first:{p,bounds:s},last:null};
     c.count++; c.last={p,bounds:s};
    }
   }
  }
  const last=samples.at(-1);
  const shot=name+'-'+q;
  record.shots.push({file:shot+'.png', fraction:q/4, pose:last.p});
  await capture(page,shot);
 }
 results.legs.push(record);
 console.log(name, JSON.stringify({crossings:Object.keys(record.crossings),peaks:record.peaks}));
}
if (only !== 'alternate') {
for(const [key,era] of [['e1-e2',1],['e2-e3',2],['e3-e4',3]]) {
 const page=await pageFor(era);
 const plan=await page.evaluate(k=>window.__poses().relocations[k],key);
 await page.evaluate(k=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes(k==='e1-e2'?'E1→E2':k==='e2-e3'?'E2→E3':'E3→E4')).click(),key);
 for(const l of plan.legs) {
  // E3→E4 has a real blink between rise and build; advance it separately.
  if(key==='e3-e4' && l.leg==='build') await page.evaluate(()=>{for(let i=0;i<48;i++)window.__app.update(1/120);});
  await leg(page,key+'-'+l.leg,l.seconds);
 }
 await page.close();
}
for(const [name,era,from,id,to] of [
 ['s1',2,'r1','s1',null], ['s2-after-s1',2,'r2','s2',null], ['s2-direct',2,'r1','s2',null],
 ['s3-dormant',3,'r2','s3',null], ['s4-dormant',3,'r2','s4',null],
 ['s1-return',2,'r2',null,0], ['s2-return',2,'r3',null,0],
 ['s3-return-dormant',3,'r1',null,90], ['s4-return-dormant',3,'r3',null,90]
]) {
 const page=await pageFor(era);
 await page.evaluate(f=>{const p=window.__poses().seats[f];window.__camFree(p.x,p.y,p.z,p.pitch,p.yaw);},from);
 if(id) await page.evaluate(id=>window.__os.onSendResolve(id,'visited'),id);
 else {
  // Test the actual R reset handler (baseline 2.2 s, revised 39 s).
  await page.keyboard.press('r');
 }
 const dur=await page.evaluate(()=>window.__camPose().dur);
 await leg(page,name,dur || 0.1);
 await page.close();
}
}
if (only === 'alternate') {
 for (const [key,era,from] of [
  ['e1-e2',1,'r1-turned'], ['e2-e3',2,'r2'], ['e2-e3',2,'r3'],
  ['e3-e4',3,'r1'], ['e3-e4',3,'r3']
 ]) {
  const page = await pageFor(era, true);
  const table = await page.evaluate(k => window.__poses().relocations[k], key);
  await page.evaluate(([from,to]) => {
   const p=window.__poses().seats[from];window.__camFree(p.x,p.y,p.z,p.pitch,p.yaw);
   window.__os.onEraShift(to);
  }, [from,key.slice(3)]);
  for (const l of table.legs) {
   if (l.leg !== 'rise') await page.evaluate(target => {
    for(let i=0;i<150 && window.__camPose().leg !== target;i++)window.__app.update(1/120);
   }, l.leg);
   const seconds = await page.evaluate(()=>window.__camPose().dur);
   await leg(page,`${key}-from-${from}-${l.leg}`,seconds);
  }
  await page.close();
 }
}
fs.writeFileSync(path.join(out,'measurements.json'), JSON.stringify(results,null,2));
await browser.close();
if(results.errors.length) { console.error(results.errors); process.exitCode=1; }
if(phase.startsWith('after')) {
 const failures=results.legs.filter(l=>Object.keys(l.crossings).length || l.peaks.linear>0.431 || l.peaks.angular>9.101);
 if(failures.length) {console.error('CLEARANCE/COMFORT FAILED:',failures.map(l=>l.name));process.exitCode=1;}
}
