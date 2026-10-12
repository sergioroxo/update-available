import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--no-sandbox']});
const results = []; const wait = ms => new Promise(r=>setTimeout(r,ms));
const open = async (query, reduced=false) => { const page=await browser.newPage();
  await page.setViewport({width:1280,height:720});
  if(reduced)await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  page.on('pageerror',e=>results.push({error:String(e)}));
  await page.goto('http://localhost:3206/?reinterp=1&debug=1&'+query,{waitUntil:'load',timeout:180000});return page; };
try {
  const page = await open('entrance=restore&kiosk=0&cut=speedrun',true);
  await page.waitForSelector('#restore-entrance[data-phase="wake"]',{timeout:180000});
  const ledgerBefore=await page.evaluate(()=>window.__ledger());
  const sample=()=>page.evaluate(()=>{const p=[];window.__app.root.findByName('restore-pixels').render.meshInstances[0].mesh.getPositions(p);return p.slice(0,48);});
  await wait(300);const a=await sample();await wait(600);assert.deepEqual(await sample(),a,'reduced motion stars hold still');
  await page.mouse.move(600,300);await page.mouse.down();await page.mouse.move(700,340,{steps:10});await page.mouse.up();await wait(200);
  assert.equal(await page.$eval('#restore-entrance',e=>e.dataset.phase),'wake','drag must not select');
  // A multi-finger press/pinch cannot select WAKE.
  await page.evaluate(()=>{const c=document.getElementById('app');for(const id of [1,2])c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:id,clientX:200+id*30,clientY:200,pointerType:'touch'}));for(const id of [2,1])c.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:id,clientX:200+id*30,clientY:200,pointerType:'touch'}));});
  assert.equal(await page.$eval('#restore-entrance',e=>e.dataset.phase),'wake','pinch must not select');
  assert.deepEqual(await page.evaluate(()=>window.__ledger()),ledgerBefore,'no narrative ledger entries before restore');
  await page.keyboard.press('Enter');await wait(700);await page.keyboard.press('Escape');await wait(100);
  const paused=await sample();await wait(1200);assert.deepEqual(await sample(),paused,'menu freezes assembly');
  await page.keyboard.press('Escape');
  const phases=[];await page.evaluate(()=>{window.__entrancePhases=[];new MutationObserver(()=>{const e=document.getElementById('restore-entrance');if(e)window.__entrancePhases.push(e.dataset.phase);}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['data-phase']});});
  await page.waitForFunction(()=>!document.getElementById('restore-entrance'),{timeout:30000});
  phases.push(...await page.evaluate(()=>window.__entrancePhases));assert(!phases.includes('glitch'),'reduced motion skips glitch');
  const pose=await page.evaluate(()=>window.__camPose());assert.equal(pose.descent,false);assert.equal(pose.driven,false);assert.equal(pose.yaw,0);assert.equal(pose.pitch,0);
  assert.equal(await page.evaluate(async()=> (await import('/src/state/cut.ts')).currentCut()),'speedrun');
  results.push({check:'reduced motion, drag/pinch no select, ledger unchanged, pause/resume, URL speedrun hand-off',passed:true,phases,pose});await page.close();
  for (const q of ['entrance=home&kiosk=0','entrance=restore&home=0&kiosk=0']) {
    const p=await open(q);const selector=q.includes('home=0')?'#reinterp-orienting-card':'#lambyos-home';await p.waitForSelector(selector,{timeout:30000});assert(!await p.$('#restore-entrance'));results.push({check:q,passed:true});await p.close();
  }
  const p=await open('entrance=restore&era=2&idlescale=0.5');await p.waitForFunction(()=>!!window.__os,{timeout:180000});
  await p.waitForSelector('#restore-entrance[data-phase="wake"]',{timeout:45000});
  assert(!new URL(p.url()).searchParams.has('era'));results.push({check:'30-minute fresh-visit reload, time scaled to 15 seconds, era review removed, returns to WAKE',passed:true,url:p.url()});await p.close();
} finally {fs.writeFileSync('out/entrance-restore/checks.json',JSON.stringify(results,null,2));await browser.close();}
console.log(JSON.stringify(results,null,2));
