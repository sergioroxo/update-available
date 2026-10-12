/** Reproducible cold-cache production measurement. No product instrumentation. */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer, { PredefinedNetworkConditions } from 'puppeteer-core';
const phase = process.argv[2] ?? 'after';
const out = 'out/exhibition-build';
fs.mkdirSync(out, { recursive: true });
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir,e.name)) : [{ path:path.join(dir,e.name), bytes:fs.statSync(path.join(dir,e.name)).size }]); }
const all = files('dist').sort((a,b)=>b.bytes-a.bytes);
const totals = { audio:0, images:0, models:0, JS:0, other:0 };
for (const f of all) {
 const ext=path.extname(f.path);
 const type=/\.(mp3|wav|ogg)$/.test(ext)?'audio':/\.(webp|png|jpg|jpeg|svg)$/.test(ext)?'images':ext==='.glb'?'models':ext==='.js'?'JS':'other';
 totals[type]+=f.bytes;
}
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--no-sandbox'],defaultViewport:{width:1280,height:720,deviceScaleFactor:1}});
const chromeVersion=await browser.version();
const runs=[];
try {
 for(let i=0;i<3;i++) {
  const page=await browser.newPage();
  await page.setCacheEnabled(false);
  await page.emulateNetworkConditions(PredefinedNetworkConditions['Fast 4G']);
  const errors=[],external=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('request',r=>{if(!r.url().startsWith('http://localhost:3205/')&&!r.url().startsWith('data:')&&!r.url().startsWith('blob:'))external.push(r.url());});
  await page.goto('http://localhost:3205/?reinterp=1&debug=1&kiosk=0', {waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>{
   const home=document.getElementById('lambyos-home');
   return home && [...home.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth>0);
  },{timeout:120000});
  const visibleMs=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(performance.now())))));
  await page.click('[data-home="notice"]');
  const interactiveMs=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(performance.now())))));
  const cardResponded=await page.evaluate(()=>document.querySelectorAll('#lambyos-home .home-btn').length>0);
  await page.screenshot({path:`${out}/${phase}-home-notice-${i+1}.png`});
  const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>({name:r.name,start:r.startTime,end:r.responseEnd,bytes:r.transferSize})));
  runs.push({visibleMs,interactiveMs,cardResponded,errors,external,resources});
  console.log(phase,i+1,{visibleMs,interactiveMs,cardResponded,errors,external});
  await page.close();
 }
} finally { await browser.close(); }
fs.writeFileSync(`${out}/${phase}.json`,JSON.stringify({chrome:chromeVersion,rendering:'headless, SwiftShader, desktop 1280x720 DPR 1',network:PredefinedNetworkConditions['Fast 4G'],cache:'disabled, new page per trial',totals,totalBytes:all.reduce((a,f)=>a+f.bytes,0),largest30:all.slice(0,30),runs},null,2));
