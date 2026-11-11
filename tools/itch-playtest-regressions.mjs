/** Targeted festival playtest regressions. Run against npm run dev on --port (5190 by default). */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const portIndex = process.argv.indexOf('--port');
const port = portIndex >= 0 ? process.argv[portIndex + 1] || '5190' : '5190';
const out = path.resolve('out/itch/regressions'); fs.mkdirSync(out,{recursive:true});
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader'],defaultViewport:{width:1280,height:720}});
const results=[];
try {
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(`http://localhost:${port}/?reinterp=1&debug=1&era=2&kiosk=0`,{waitUntil:'networkidle0'});
 await page.waitForFunction(()=>!!window.__heldDevices && !!window.__xrLayer);
 results.push(await page.evaluate(async()=>{
   const {StartPanel}=await import('/src/desktop/apps/startPanel.ts');
   const p=new StartPanel('e1',()=>false);p.tick(2,true);
   if(!p.open)throw Error('1997 arrival instructions missing');p.close();p.reopen();
   if(!p.open)throw Error('1997 instructions cannot reopen');
   const other=new StartPanel('e3',()=>false);other.tick(2,true);if(other.open)throw Error('unrequested 2016 arrival change');
   return {name:'1997 instructions',automatic:true,reopenable:true};
 }));
 results.push(await page.evaluate(async()=>{
   const {RestorifyApp}=await import('/src/desktop/apps/restorify.ts');
   const r=new RestorifyApp();const c=document.createElement('canvas');c.width=512;c.height=384;const ctx=c.getContext('2d');
   const press=id=>{r.draw(ctx);const h=r.hits.find(h=>h.id===id);if(!h)throw Error('missing '+id);r.handleClick(h.x+h.w/2,h.y+h.h/2);};
   press('today-checkin');r.draw(ctx);const chip=r.hits.find(h=>h.id.startsWith('checkin:'));if(!chip)throw Error('missing mood');
   press(chip.id);press('checkin-continue');if(!r.today||!r.open)throw Error('Today did not return');
   return {name:'Restorify Today',returnsAfterCheckin:true};
 }));
 results.push(await page.evaluate(async()=>{
   const {PhoneE3}=await import('/src/desktop/apps/phoneE3.ts');
   const {ledger}=await import('/src/state/ledger.ts');let lift=0;const p=new PhoneE3({onLift:()=>lift++,floppyOpen:()=>false});
   p.arm();p.onWorkDone();p.onWorkDone();if(p.cardOpen||lift)throw Error('work started unseen Malta sequence');
   const c=document.createElement('canvas');c.width=420;c.height=760;const ctx=c.getContext('2d');
   const press=id=>{p.draw(ctx,420,760);const h=p.rects.find(h=>h.id===id);if(!h)throw Error('missing phone '+id);p.press(h.x+h.w/2,h.y+h.h/2);};
   press('notification');p.onWorkDone();if(!p.cardOpen)throw Error('read group cannot advance');press('dismiss');
   p.onWorkDone();press('dismiss');const n=ledger.checkins.filter(x=>x.id==='e3_cascade').length;
   p.tick(100,false);if(ledger.checkins.filter(x=>x.id==='e3_cascade').length!==n)throw Error('unseen cascade filed');
   p.tick(100,true);if(ledger.checkins.filter(x=>x.id==='e3_cascade').length!==n+1)throw Error('visible cascade did not finish '+JSON.stringify({stage:p.stage,screen:p.screen,card:p.card,seen:p.groupSeen}));
   return {name:'2016 phone',workOnlyNotifies:true,unseenCascadePaused:true};
 }));
 results.push(await page.evaluate(async()=>{
   const {drawGlow}=await import('/src/witness/pathGlow.ts');const {ledger}=await import('/src/state/ledger.ts');
   const c=document.createElement('canvas');const ctx=c.getContext('2d');let rings=0;const stroke=ctx.strokeRect.bind(ctx);ctx.strokeRect=(...args)=>{rings++;stroke(...args);};
   const r={x:10,y:10,w:30,h:20};delete ledger.view.highlights;drawGlow(ctx,r,'path','#fff','#ddd');if(rings)throw Error('unrequested highlights');
   ledger.view.highlights=true;drawGlow(ctx,r,'path','#fff','#ddd');if(!rings)throw Error('requested highlights missing');delete ledger.view.highlights;
   return {name:'navigation highlights',default:'off',optional:true};
 }));
 results.push(await page.evaluate(async()=>{
   const {Clear}=await import('/src/games/clear.ts');const g=new Clear();g.tap(120,130);g.tap(80,120);
   if(!g.shots.length)throw Error('CLEAR mouse tap did not fire');
   return {name:'CLEAR input',tapFires:true};
 }));
 // The 1997 panel must be drawn by the OS, not merely have an open flag.
 await page.evaluate(()=>{const o=window.__os;o.setDesktopEra('e1',true);o.debugJump('desktop');o.update(2);o.draw();});
 assert.equal(await page.evaluate(()=>window.__os.hits.some(h=>h.id==='startpanel-close')),true);
 await page.screenshot({path:path.join(out,'1997-instructions.png')});
 results.push({name:'1997 instructions on desktop',closeControlPresent:true});
 // Verify the alert callback without skipping the redaction's completion.
 await page.evaluate(()=>{const o=window.__os;o.setDesktopEra('e2',true);o.debugJump('calebAlert');o.caleb.phase='sealed';o.accountability.onAlertDone(false);});
 const blocked=await page.evaluate(()=>({phase:window.__os.caleb.phase,offer:window.__os.netvisionOfferOpen}));
 assert.equal(blocked.phase,'sealed');assert.equal(blocked.offer,true);results.push({name:'Caleb redaction',...blocked});
 await page.evaluate(()=>{const o=window.__os;o.pureMailAt=o.t;o.update(1);});
 assert.equal(await page.evaluate(()=>window.__os.pureMailAt!==Infinity),true,'video offer must hold network failure');
 await page.evaluate(()=>window.__os.handleNetvisionOfferClick('netvision-watch'));
 assert.equal(await page.evaluate(()=>!!window.__os.netvision?.open),true,'Watch must open the video');
 await page.evaluate(()=>{const o=window.__os;o.pureMailAt=o.t;o.update(1);});
 assert.equal(await page.evaluate(()=>window.__os.pureMailAt!==Infinity),true,'video must hold the failure letter');
 await page.screenshot({path:path.join(out,'2003-video.png')});
 results.push({name:'2003 offered video',opens:true,failureWaits:true});
 // Real mouse input must reach the device carried in front of the desktop.
 await page.goto(`http://localhost:${port}/?reinterp=1&debug=1&era=2&kiosk=0`,{waitUntil:'networkidle0'});
 await page.waitForFunction(()=>!!window.__heldDevices);
 await page.evaluate(async()=>{
   const o=window.__os;o.debugJump('e2Restorify');o.restorify.open=false;
   const {ledger}=await import('/src/state/ledger.ts');ledger.checkins.push({id:'steady',witness:''});
 });
 await new Promise(r=>setTimeout(r,500));
 await page.evaluate(()=>{
   const d=window.__heldDevices;const camera=window.__app.root.findByName('camera');d.take('e2',camera);
   window.__devicePressCount=0;window.__desktopPressCount=0;
   const press=d.press.bind(d);d.press=(...args)=>{window.__devicePressCount++;return press(...args);};
   const click=window.__os.handleClick.bind(window.__os);window.__os.handleClick=(...args)=>{window.__desktopPressCount++;return click(...args);};
 });
 await new Promise(r=>setTimeout(r,800));
 await page.mouse.click(640,300);
 const input=await page.evaluate(()=>({device:window.__devicePressCount,desktop:window.__desktopPressCount,held:window.__heldDevices.held('e2')}));
 assert.equal(input.device,1);assert.equal(input.desktop,0);results.push({name:'held CLEAR real mouse',...input});
 await page.screenshot({path:path.join(out,'clear-mouse.png')});
 // Next task is a local referral, with no camera or FOV change.
 await page.evaluate(()=>{window.__heldDevices.release('e2');const o=window.__os;o.restorify.open=false;o.offerSend('s1');o.sendOffer.open=true;o.draw();});
 const pose=()=>page.evaluate(()=>{const a=window.__app;const r=a.root.findByName('camera-rig');return {p:r.getPosition().toString(),q:r.getRotation().toString(),fov:a.root.findByName('camera').camera.fov};});
 const before=await pose();
 await page.evaluate(()=>{const o=window.__os;const h=o.hits.find(h=>h.id==='send-go');if(!h)throw Error('Next task control missing');o.handleClick(h.x+h.w/2,h.y+h.h/2);});
 await new Promise(r=>setTimeout(r,300));
 assert.deepEqual(await pose(),before,'Next task must not move or zoom the camera');results.push({name:'Next task',cameraUnchanged:true});
 // Advance the Close's own clocks through its cards and monitor approach.
 await page.evaluate(()=>{
   const b=[...document.querySelectorAll('button')].find(b=>b.dataset.baseLabel==='Close · point cloud');
   if(!b)throw Error('Close review button missing');b.click();
   for(let i=0;i<2400;i++){
     if(window.__closeCard?.on){
       const c=document.querySelector('#app');
       c.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,pointerType:'mouse',clientX:640,clientY:300,button:0,buttons:1,bubbles:true}));
       c.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,pointerType:'mouse',clientX:640,clientY:300,button:0,buttons:0,bubbles:true}));
     }
     window.__app.fire('update',0.1);
   }
 });
 await new Promise(r=>setTimeout(r,700));
 const closeAudio=await page.evaluate(async()=>{
   const {roomBed}=await import('/src/audio/tapeAudio.ts');
   return {score:roomBed.current,paused:roomBed.live?.paused,volume:roomBed.live?.volume,monitor:!!window.__closeMonitor?.on,card:window.__closeCard,phase:window.__os.phase,era:window.__os.era};
 });
 await page.screenshot({path:path.join(out,'close-score.png')});
 assert.equal(closeAudio.score,'close_song.mp3');assert.equal(closeAudio.paused,false);assert(closeAudio.volume>0);assert(closeAudio.monitor);
 results.push({name:'Close score at monitor',...closeAudio});
 await page.screenshot({path:path.join(out,'close-score.png')});
 // The preference must invalidate cached monitor and phone textures on the next frame.
 await page.goto(`http://localhost:${port}/?reinterp=1&debug=1&era=4&kiosk=0`,{waitUntil:'networkidle0'});
 await page.waitForFunction(()=>!!window.__os?.e4 && !!window.__graceQueue?.());
 const refreshed=await page.evaluate(async()=>{
   const {ledger}=await import('/src/state/ledger.ts');const o=window.__os,b=o.e4.browser,g=window.__graceQueue();
   ledger.view.highlights=false;o.update(0);g.update(0);
   const before={browser:b.version,board:g.version,phone:g.phoneVersion};
   ledger.view.highlights=true;o.update(0);g.update(0);
   const after={browser:b.version,board:g.version,phone:g.phoneVersion};
   return {before,after};
 });
 for(const key of ['browser','board','phone'])assert(refreshed.after[key]>refreshed.before[key],key+' did not refresh highlights');
 results.push({name:'highlight texture refresh',...refreshed});
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
} finally {await browser.close();}
