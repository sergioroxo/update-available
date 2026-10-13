/** Reduced-motion and accelerated idle checks of the actual restore route. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const i=process.argv.indexOf('--port');if(i<0)throw new Error('Pass --port');const port=Number(process.argv[i+1]);
const out='out/setup-in-stars';fs.mkdirSync(out,{recursive:true});const checks=[],errors=[];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--no-sandbox']});
try {
 const page=await browser.newPage();await page.setViewport({width:1280,height:720});
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(['error','warn'].includes(m.type()))errors.push(m.text());});
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 await page.goto(`http://localhost:${port}/?reinterp=1&entrance=restore&debug=1&kiosk=0`,{waitUntil:'load',timeout:180000});
 await page.waitForSelector('#restore-entrance[data-phase="wake"]',{timeout:180000});await page.mouse.click(640,360);
 const press=async id=>{await page.waitForFunction(id=>JSON.parse(document.getElementById('restore-entrance')?.dataset.setupHits||'[]').some(h=>h.id===id),{timeout:30000},id);const h=await page.evaluate(id=>JSON.parse(document.getElementById('restore-entrance').dataset.setupHits).find(h=>h.id===id),id);await page.mouse.click(h.x+h.w/2,h.y+h.h/2);await wait(300);};
 await page.waitForFunction(()=>window.__os?.setup?.stage==='balloon-1');
 const before=await page.evaluate(()=>window.__ledger());
 // A moving press is still a look: it cannot choose the welcome button.
 const h=await page.evaluate(()=>JSON.parse(document.getElementById('restore-entrance').dataset.setupHits).find(h=>h.id==='setup-choice-0'));
 await page.mouse.move(h.x+h.w/2,h.y+h.h/2);await page.mouse.down();await page.mouse.move(h.x+h.w/2+20,h.y+h.h/2,{steps:4});await page.mouse.up();
 assert.equal(await page.evaluate(()=>window.__os.setup.stage),'balloon-1');checks.push('A 20 px drag across the floating welcome does not select.');
 await press('setup-choice-1');await page.waitForFunction(()=>window.__os.setup.stage==='note');await press('setup-close');await press('setup-choice-0');await press('setup-advert-offer-skip-1');
 await page.waitForFunction(()=>window.__os.setup.ready);
 const after=await page.evaluate(()=>window.__ledger());const {view:vb,...b}=before,{view:va,...a}=after;assert.deepEqual(a,b);checks.push('Experienced setup still requires note Close; full choice and advert Skip file no input outside view preferences.');
 await page.evaluate(()=>{window.__entrancePhases=[];const e=document.getElementById('restore-entrance');new MutationObserver(()=>window.__entrancePhases.push(e.dataset.phase)).observe(e,{attributes:true,attributeFilter:['data-phase']});});
 await press('setup-choice-0');await page.waitForSelector('#restore-entrance[data-phase="restore"]');await wait(2500);await page.screenshot({path:`${out}/reduced-mid-restore.png`});
 await page.waitForFunction(()=>!document.getElementById('restore-entrance'),{timeout:30000});
 const phases=await page.evaluate(()=>window.__entrancePhases);assert.ok(!phases.includes('glitch'));assert.equal(await page.evaluate(()=>window.__os.phase),'r_boot');checks.push(`Reduced motion: ${phases.join('→')}; no glitch, seat reached and 1997 boot opened within 30 s. The instantaneous flight handover may appear as a phase but has no camera flight.`);
 // Thirty untouched minutes, at one second per minute. Real reload, no debug state mutation.
 await page.goto(`http://localhost:${port}/?reinterp=1&entrance=restore&debug=1&idlescale=1`,{waitUntil:'load',timeout:180000});await page.waitForSelector('#restore-entrance[data-phase="wake"]',{timeout:180000});await page.mouse.click(640,360);await page.waitForFunction(()=>window.__os?.setup?.stage==='balloon-1');
 const nav=page.waitForNavigation({waitUntil:'load',timeout:45000});await nav;await page.waitForSelector('#restore-entrance[data-phase="wake"]',{timeout:180000});assert.equal(await page.evaluate(()=>window.__os.setup),null);checks.push('Accelerated idle: setup reloads after 30 untouched seconds (=30 minutes at idlescale=1) into WAKE, with setup cleared.');
 assert.deepEqual(errors,[]);await page.close();
} finally {await browser.close();fs.writeFileSync(`${out}/EDGE-CHECKS.json`,JSON.stringify({port,checks,errors},null,2)+'\n');}
console.log(checks.join('\n'));
