import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--no-sandbox']});
const results=[];const wait=ms=>new Promise(r=>setTimeout(r,ms));
try {
  for(const input of ['keyboard','simulated-xr-select']) {
    const p=await browser.newPage();await p.evaluateOnNewDocument(()=>{window.__testPlays=[];const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.__testPlays.push(this.src);return play.call(this);};});
    await p.goto('http://localhost:3206/?reinterp=1&entrance=restore&debug=1',{waitUntil:'load',timeout:180000});await p.waitForSelector('#restore-entrance[data-phase="wake"]',{timeout:180000});await wait(600);
    if(input==='keyboard') await p.keyboard.press('Enter');
    else {
      await p.evaluate(()=>window.__app.xr.input.fire('select',{targetRayMode:'gaze'}));
      assert.equal(await p.$eval('#restore-entrance',e=>e.dataset.phase),'wake');
      await p.evaluate(()=>{const V=window.__app.root.getPosition().constructor;window.__app.xr.input.fire('select',{targetRayMode:'tracked-pointer',getOrigin:()=>new V(0,1,0),getDirection:()=>new V(0,0,-1)});});
    }
    assert.equal(await p.$eval('#restore-entrance',e=>e.dataset.phase),'restore');
    const plays=await p.evaluate(()=>window.__testPlays);assert(plays.some(s=>s.includes('descent_score')),'entry starts the existing bed/score on this input');
    const idle=await p.evaluate(()=>window.__attract.idleMs());assert(idle<400,'XR and keyboard input reset the exhibition idle clock');
    results.push({input,passed:true,plays,idle,hardware:'browser simulation; no headset'});await p.close();
  }
} finally {fs.writeFileSync('out/entrance-restore/input-checks.json',JSON.stringify(results,null,2));await browser.close();}
console.log(JSON.stringify(results,null,2));
