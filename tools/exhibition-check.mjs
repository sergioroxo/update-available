/** Production startup check: Home while model requests wait, then one clean handover. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const out='out/exhibition-build';fs.mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--no-sandbox','--disable-background-networking'],defaultViewport:{width:1280,height:720,deviceScaleFactor:1}});
const errors=[],external=[],models=[];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let release; const held=new Promise(r=>{release=r;});
try {
 const page=await browser.newPage();
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errors.push(m.text());});
 await page.setRequestInterception(true);
 page.on('request',async req=>{
  if(!req.url().startsWith('http://localhost:3205/')&&!/^(data|blob):/.test(req.url()))external.push(req.url());
  if(req.url().includes('/assets/models/')) {models.push(req.url());await held;}
  if(!req.isInterceptResolutionHandled())await req.continue();
 });
 await page.goto('http://localhost:3205/?reinterp=1&debug=1&descent=0&kiosk=0',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const h=document.getElementById('lambyos-home');return h&&[...h.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth);});
 await page.screenshot({path:`${out}/after-home-desktop.png`});
 await page.waitForFunction(()=>window.__modelsLoaded===undefined&&!!document.querySelector('#lambyos-home'));
 for(let i=0;!models.length&&i<120;i++)await wait(250);
 assert.ok(models.length>0,'models prepare behind Home');
 assert.equal(await page.evaluate(()=>!!window.__os),false,'fiction does not start behind Home');
 await page.click('[data-home="notice"]');await page.click('[data-home-close]');
 await wait(4100);await page.click('[data-home="computer"]');
 const login=await page.waitForFunction(()=>[...document.querySelectorAll('#lambyos-home button')].find(b=>b.textContent==='Log in'&&!b.disabled));
 await login.asElement().click();await wait(1000);
 assert.ok(await page.$('#lambyos-home'),'Home covers held model requests during entry');
 await page.screenshot({path:`${out}/after-home-loading.png`});
 release();
 await page.waitForFunction(()=>window.__os&&!document.getElementById('lambyos-home'),{timeout:120000});
 await wait(1000);await page.screenshot({path:`${out}/after-room-entrance.png`});
 assert.equal(models.length,new Set(models).size,'each model requested once across preparation and entry');
 const loaded=await page.evaluate(()=>window.__modelsLoaded);
 assert.ok(loaded.length>0);
 await page.close();
 const phone=await browser.newPage();await phone.setViewport({width:390,height:844,deviceScaleFactor:3});
 phone.on('pageerror',e=>errors.push(String(e)));
 await phone.goto('http://localhost:3205/?reinterp=1&debug=1&kiosk=0',{waitUntil:'load'});
 await phone.waitForFunction(()=>{const h=document.getElementById('lambyos-home');return h&&[...h.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth);});
 await phone.screenshot({path:`${out}/after-home-phone.png`});await phone.click('[data-home="notice"]');
 assert.ok(await phone.$('[data-home-close]'));await phone.close();
 const door=await browser.newPage();await door.goto('http://localhost:3205/?reinterp=1&debug=1&descent=0&home=0&kiosk=0',{waitUntil:'load'});
 await door.screenshot({path:`${out}/after-short-door.png`});await door.close();
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 const result={checks:['Home fully illustrated before model completion','Notice and computer card respond with model requests held','No fiction/OS before entry','Home remains during loading','One model request each across background preparation and entry','Phone viewport Home responds','Short door still available'],modelsRequested:models.length,modelsLoaded:loaded.length,errors,external};
 fs.writeFileSync(`${out}/startup-check.json`,JSON.stringify(result,null,2));console.log(result);
}finally{release();await browser.close();}
