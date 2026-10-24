import puppeteer from 'puppeteer-core';import fs from 'node:fs';import assert from 'node:assert/strict';
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--no-sandbox'],defaultViewport:{width:1280,height:720}});
const page=await browser.newPage();const wait=ms=>new Promise(r=>setTimeout(r,ms));const steps=[];
try{
 await page.goto('http://localhost:3216/?reinterp=1&kiosk=0&debug=1');await page.waitForSelector('#restore-entrance[data-phase="wake"]',{timeout:90000});await page.mouse.click(640,360);
 async function press(id){await page.waitForFunction(id=>JSON.parse(document.querySelector('#restore-entrance')?.dataset.setupHits||'[]').some(h=>h.id===id),{timeout:30000},id);const h=await page.evaluate(id=>JSON.parse(document.querySelector('#restore-entrance').dataset.setupHits).find(h=>h.id===id),id);await page.mouse.click(h.x+h.w/2,h.y+h.h/2);await wait(350);steps.push({id,stage:await page.evaluate(()=>document.querySelector('#restore-entrance')?.dataset.setupStage)});}
 for(const id of ['setup-choice-0','setup-choice-0','setup-choice-0','setup-close','setup-test','setup-sound-on','setup-choice-0','setup-close','setup-choice-0','setup-start','setup-choice-0'])await press(id);
 await page.waitForFunction(()=>document.querySelector('#restore-entrance')?.dataset.setupStage==='note');await press('setup-close');
 await page.waitForFunction(()=>JSON.parse(document.querySelector('#restore-entrance')?.dataset.setupHits||'[]').some(h=>h.id==='setup-advert-play-0'));
 assert(steps.some(s=>s.stage==='session'));steps.push({result:'PASS: complete visitor setup clicks reach the mandatory advert offer; no film bypassed'});await page.screenshot({path:'out/cx3a/setup-ready.png'});
}catch(e){steps.push({ERROR:e.stack});await page.screenshot({path:'out/cx3a/setup-failure.png'});}finally{fs.writeFileSync('out/cx3a/setup-probe.json',JSON.stringify(steps,null,2));console.log(JSON.stringify(steps));process.exitCode=steps.some(s=>s.ERROR)?1:0;await browser.close();}
