#!/usr/bin/env node
/** S307: the ordinary 2016 v2 presses. Camera moves are review views only. No debug beat or ledger writes. */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const argv = process.argv.slice(2);
const flag = (k, d) => argv.includes('--' + k) ? argv[argv.indexOf('--' + k) + 1] : d;
const variant = argv.includes('--ignore-offers');
const port = flag('port', '3112'), out = path.resolve(flag('out', 'out/tour-e3-v2'));
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--no-sandbox','--disable-audio-output'],defaultViewport:{width:1440,height:1000}});
const page = await browser.newPage();
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let n=0;const frames=[];
try {
 await page.goto(`http://localhost:${port}/?reinterp=1&kiosk=0&era=3&debug=1&descent=0&home=0`,{waitUntil:'networkidle2',timeout:60000});
 await page.waitForFunction(()=>window.__graceQueue?.(),{timeout:60000});
 await page.addStyleTag({content:'body > *:not(canvas) { display:none !important; }'});
 const press=async(id,phone=false)=>{
  await page.waitForFunction((id,phone)=>{const q=window.__graceQueue();return (phone?q.phone:q).rects?.some(h=>h.id===id);},{timeout:15000},id,phone);
  await page.evaluate((id,phone)=>{const q=window.__graceQueue(),h=(phone?q.phone:q).rects.find(h=>h.id===id);if(phone)q.handlePhoneClick(h.x+h.w/2,h.y+h.h/2);else q.handleClick(h.x+h.w/2,h.y+h.h/2);},id,phone);
  await wait(400);
 };
 const shot=async(name,device='workstation')=>{
  await wait(350);const base=`${String(++n).padStart(2,'0')}-${name}`;
  await page.screenshot({path:path.join(out,base+'.png')});
  const raw=await page.evaluate(device=>{const canvases=window.__era3Devices();const c=canvases[device];return c?.toDataURL('image/png');},device);
  if(raw)fs.writeFileSync(path.join(out,base+'-surface.png'),Buffer.from(raw.split(',')[1],'base64'));
  const st=await page.evaluate(()=>{const q=window.__graceQueue();return {dc:window.__drawCalls,mode:q.mode,page:q.veraPage,phone:q.phone.screen,stage:q.phone.stage,held:q.phoneInHand,quiet:q.guideSilent,ids:q.rects.map(h=>h.id)};});
  frames.push({file:base+'.png',surface:raw?base+'-surface.png':null,...st});console.log(base,JSON.stringify(st));
 };
 const seat=await page.evaluate(()=>window.__poses().seats.r2);
 await page.evaluate(s=>window.__camFree(s.x,s.y,s.z,s.pitch,s.yaw),seat);await wait(1500);
 await shot('room');
 await page.evaluate(()=>window.__camFree(-4.4,1.5,.7,-35,90));await shot('desk-objects');
 await page.evaluate(s=>window.__camFree(s.x,s.y,s.z,s.pitch,s.yaw),seat);
 await press('signin');await shot('lambient-question');
 await press('consent-decline');await shot('today');
 await press('task-0');await shot('renata-as-sent');
 for(let i=1;i<=3;i++){await press(variant?'skip':'apply');await shot('renata-edit-'+i);}
 await press('board-back');await shot('send-four-places');
 await press('vera-send');await shot('copies-and-next-intake');
 await press('vera-send-close');await shot('kindredraft-offer');
 if (variant) { await press('task-1'); await press('board-back'); }
 else await press('update-accept');
 await shot('vera-as-published');
 const before=await page.evaluate(()=>JSON.stringify(window.__ledger()));
 await press('vera-as-sent');await shot('vera-as-sent');
 const after=await page.evaluate(()=>JSON.stringify(window.__ledger()));
 if(before!==after)throw Error('Reading Vera’s as-sent account changed the ledger');
 await press('vera-record-close');await wait(2000);await shot('phone-inbox','phone');
 await press('read-NualaMay',true);await shot('nuala-thread','phone');
 await press('back',true);await press('read-The Wicktoday',true);await shot('wick-dee','phone');
 await press('back',true);await press('read-The Wick14 March',true);await shot('wick-stamp-card','phone');
 await press('back',true);
 // Put down uses the room's published on-screen phone target through its real mouse handler.
 // The integration exposes the ordinary device click via projected targets (__walkTargets).
 await page.evaluate(()=>window.__camFree(-4.4,1.16,.7,-3,90));
 // Pressing the room outside the held phone puts it down, the same pointer route as a visitor.
 await page.mouse.click(30,500);await wait(1800);
 await shot('campaign-kit');
 if (!variant) {
  await press('vera-kit-approve');await shot('campaign-approved');
  await press('vera-take-down');await shot('take-down-retains-original');
 }
 await press('vera-kit-close');await shot('today-after-kit');
 // The festival trial pauses the cascade when its phone is put down. Pick up
 // the resting glass with an ordinary mouse press before reading the group.
 const phonePoint = await page.evaluate(() => {
  const app = window.__app, plane = app.root.findByName('era3-device-phone');
  const p = app.root.findByName('camera').camera.worldToScreen(plane.getPosition());
  return { x: p.x, y: p.y };
 });
 await page.mouse.click(phonePoint.x, phonePoint.y); await wait(1200);
 await page.waitForFunction(() => window.__graceQueue().phoneInHand);
 await press('group',true);await shot('malta-news','phone');
 await press('link',true);await shot('malta-block','phone');
 await press('dismiss',true);await shot('unanimous','phone');
 await press('link2',true);await shot('second-block','phone');
 await press('dismiss',true);await wait(5500);await shot('cascade-in-progress','phone');
 await wait(6500);await shot('outnumbered','phone');
 await page.mouse.click(30,500);await wait(1200);
 if (await page.evaluate(()=>window.__graceQueue().rects.some(h=>h.id==='pause-close'))) await press('pause-close');
 await shot('board-still-there');
 const updatePress = async id => {
  const ok = await page.evaluate(id => {
   const app = window.__os.updateApp, h = app?.hits?.find(h => h.id === id);
   if (!h) return false;
   app.handleClick(h.x + h.w / 2, h.y + h.h / 2); return true;
  }, id);
  if (!ok) throw Error('Update hit missing: ' + id);
  await wait(500);
 };
 // Read the genuine update surfaces after the cascade; no forced arm or jump.
 await page.waitForFunction(()=>window.__os.updateApp?.hits?.some(h => h.id === 'update-now' || h.id === 'cascade-retry'), {timeout:90000});
 const cascade = await page.evaluate(()=>window.__os.updateApp.hits.some(h=>h.id==='cascade-retry'));
 if (cascade) { await shot('system-break'); await updatePress('cascade-retry'); }
 await page.waitForFunction(()=>window.__os.updateApp?.hits?.some(h=>h.id==='update-now'), {timeout:30000});
 await shot('update-notification');await updatePress('update-now');await wait(1800);await shot('update-terms');
 for (let i=0;i<12;i++) {
  const ids=await page.evaluate(()=>window.__os.updateApp?.hits?.map(h=>h.id)??[]);
  if(ids.includes('eula-agree'))break;
  if(!ids.includes('eula-readon')){await wait(500);continue;}
  await updatePress('eula-readon');
 }
 await shot('update-terms-read');await updatePress('eula-agree');await wait(3000);await shot('update-changelog');
 await wait(4500);await shot('update-retained-record');
 if(errors.length)throw Error(errors.join('\n'));
 fs.writeFileSync(path.join(out,'tour.json'),JSON.stringify({variant,frames,errors},null,2)+'\n');
 console.log('Tour complete',n,'frames. Peak draws:',Math.max(...frames.map(x=>x.dc)));
} finally {await browser.close();}
