/** Real pointer capture of the floating restore door; diagnostic seeks only for asterisk/reduced-motion checks. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const i = process.argv.indexOf('--port');
if (i < 0) throw new Error('Pass --port');
const port = Number(process.argv[i+1]);
const out = path.resolve('out/setup-in-stars');fs.mkdirSync(out,{recursive:true});
const wait = ms => new Promise(r=>setTimeout(r,ms));
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--no-sandbox']});
const errors=[], checks=[], shots=[], metrics=[];
try {
for (const [name,width,height] of [['desktop',1280,720],['phone',390,844]]) {
 const page=await browser.newPage();await page.setViewport({width,height,deviceScaleFactor:1,isMobile:name==='phone',hasTouch:name==='phone'});
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(['error','warn'].includes(m.type()))errors.push(m.text());});
 const open=async()=>{await page.goto(`http://localhost:${port}/?reinterp=1&entrance=restore&debug=1&kiosk=0`,{waitUntil:'load',timeout:180000});await page.waitForSelector('#restore-entrance[data-phase="wake"]',{timeout:180000});await page.addStyleTag({content:'#motion-diagnostic,body > [style*="z-index: 9999"] { visibility: hidden !important; }'});};
 const shot=async label=>{metrics.push({name,label,...await page.evaluate(()=>({drawCalls:window.__app.stats.drawCalls.total,uploads:window.__uploads,phase:document.getElementById('restore-entrance')?.dataset.phase,setup:window.__os.setup?.stage}))});await page.screenshot({path:path.join(out,`${name}-${label}.png`)});shots.push(`${name}-${label}.png`);console.log('captured',name,label);};
 const press=async id=>{
  await page.waitForFunction(id=>JSON.parse(document.getElementById('restore-entrance')?.dataset.setupHits||'[]').some(h=>h.id===id),{timeout:30000},id);
  const h=await page.evaluate(id=>JSON.parse(document.getElementById('restore-entrance').dataset.setupHits).find(h=>h.id===id),id);
  if(name==='phone')await page.touchscreen.tap(h.x+h.w/2,h.y+h.h/2);else await page.mouse.click(h.x+h.w/2,h.y+h.h/2);
  await wait(250);
 };
 await open();await wait(8000);await shot('00-wake');
 if(name==='phone')await page.touchscreen.tap(width/2,height/2);else await page.mouse.click(width/2,height/2);
 await page.waitForFunction(()=>window.__os?.setup?.stage==='balloon-1');await wait(1600);await shot('01-welcome');
 await press('setup-choice-0');await press('setup-choice-0');await shot('02-about');await press('setup-close');
 await press('setup-choice-0');await shot('03-sound');await press('setup-sound-quiet');
 await press('setup-choice-0');await shot('04-look');await press('setup-close');
 await page.waitForFunction(()=>window.__os.setup.stage==='note');await shot('05-content-note');
 await page.keyboard.press('Escape');const held=await page.evaluate(()=>window.__os.setup.clock);await wait(500);assert.equal(await page.evaluate(()=>window.__os.setup.clock),held);await page.keyboard.press('Escape');await wait(300);
 await press('setup-close');await shot('06-version');await press('setup-choice-0');await press('setup-advert-play-0');
 await wait(2500);await shot('07-advert-playing');
 // Save the actual setup surface too, to verify the film rather than the stars.
 fs.writeFileSync(path.join(out,`${name}-advert-canvas.png`),Buffer.from((await page.evaluate(()=>window.__os.canvas.toDataURL())).split(',')[1],'base64'));
 await press('setup-advert-skip');await page.waitForFunction(()=>window.__os.setup.ready);await shot('08-start');
 const upload=await page.evaluate(()=>window.__uploads);await wait(800);assert.equal(await page.evaluate(()=>window.__uploads),upload,'Idle setup must not upload');
 await press('setup-choice-0');await shot('09-fold');
 await page.waitForSelector('#restore-entrance[data-phase="typing"]');await wait(450);await shot('09b-status-typing');
 assert.equal(await page.evaluate(()=>window.__app.root.findByName('desktop-screen').render.meshInstances[0].visible),false,'Monitor stays hidden while the restore line types');
 await page.waitForSelector('#restore-entrance[data-phase="restore"]');await wait(3200);await shot('10-mid-restore');
 await page.waitForFunction(()=>!document.getElementById('restore-entrance'),{timeout:120000});await wait(1000);await shot('11-1997-monitor');
 checks.push(`${name}: real ${name==='phone'?'touch':'mouse'} rays through full setup, advert picture, immediate Skip, content note, paused clock, idle uploads stable, Start→restore→1997`);
 // Played advert branch, seek only for diagnostic asterisk capture.
 await open();await page.mouse.click(width/2,height/2);await page.waitForFunction(()=>window.__os?.setup?.stage==='balloon-1');
 await press('setup-choice-1');await page.waitForFunction(()=>window.__os.setup.stage==='note');await press('setup-close');await press('setup-choice-0');await press('setup-advert-play-0');
 await page.evaluate(()=>window.__os.setup.player.debugSeek(113.9));await page.waitForFunction(()=>window.__os.setup.stage==='asterisk',{timeout:15000});await shot('12-asterisk');await press('setup-close');
 await page.close();
}
assert.deepEqual(errors,[]);
} finally {await browser.close();fs.writeFileSync(path.join(out,'CAPTURE.json'),JSON.stringify({port,shots,checks,metrics,errors},null,2)+'\n');}
console.log(checks.join('\n'));
