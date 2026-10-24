import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
// Review probes use debug entry and callbacks; the full walk is the reachability proof.
const port=Number(process.argv[process.argv.indexOf('--port')+1]) || 3217;
const out=path.resolve('out/cx3b-decisions');fs.mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--no-sandbox'],defaultViewport:{width:1100,height:780}});
const page=await browser.newPage(); const errors=[];page.on('pageerror',e=>{errors.push(String(e));console.log('PAGE ERROR',String(e))});
await page.goto(`http://127.0.0.1:${port}/?reinterp=1&debug=1&descent=0&home=0&kiosk=0`,{waitUntil:'networkidle2'});
await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Log in')&&!b.disabled),{timeout:30000});
await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Log in')&&!b.disabled);if(b)b.click()});
await page.waitForFunction(()=>window.__os);await new Promise(r=>setTimeout(r,1500));
const save=async(name,expr)=>{const data=await page.evaluate(expr);fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(data.split(',')[1],'base64'));};
const results=await page.evaluate(async()=>{
 const os=window.__os;const state=await import('/src/state/ledger.ts');
 os.debugJump('desktop'); state.ledger.records.push('kit-inserted'); os.setup=null; os.kit=null;os.irc=null;os.toast=null;
 const {Web1997App}=await import('/src/desktop/apps/web1997.ts');
 os.web=new Web1997App();os.web.onFitIn=()=>os.onFitIn?.();os.dirty=true;os.draw();
 return {phase:os.phase,era:os.era,banner:os.web.hits.find(h=>h.id==='web-fitin'),records:state.ledger.records};
});assert.equal(results.banner.w,468);assert.equal(results.banner.h,60);
await save('01-netpilot-banner',()=>{const c=document.createElement('canvas');c.width=768;c.height=576;c.getContext('2d').drawImage(window.__os.canvas,0,0,768,576);return c.toDataURL()});
await page.evaluate(()=>{const os=window.__os;const h=os.web.hits.find(h=>h.id==='web-fitin');os.web.handleClick(h.x+2,h.y+2)});
await new Promise(r=>setTimeout(r,1800));await page.screenshot({path:path.join(out,'02-banner-handheld-room.png')});
const tapes=await page.evaluate(async()=>{
 const os=window.__os;os.web=null;os.irc=null;os.kit=null;os.openTapePlayer();os.draw();
 const played=[];
 for(const id of ['tapeA','tapeB','tapeC']){
  os.startMap.press('tape-select:'+id,{},false);os.startMap.press('tape-play',{},false);
  const s=window.__tapes();played.push(s.inserted);os.startMap.press('tape-stop',{},false);
 }
 os.startMap.press('tape-select:tapeB',{},false);os.startMap.press('tape-play',{},false);os.draw();
 return played;
});assert.deepEqual(tapes,['tapeA','tapeB','tapeC']);
await save('03-cassette-player',()=>{const c=document.createElement('canvas');c.width=768;c.height=576;c.getContext('2d').drawImage(window.__os.canvas,0,0,768,576);return c.toDataURL()});
await page.evaluate(async()=>{const os=window.__os;os.startMap.press('tape-stop',{},false);os.startMap.close();const {IrcApp}=await import('/src/desktop/apps/irc.ts');os.irc=new IrcApp();os.irc.debugHook();os.irc.dmOpen=false;os.dirty=true;os.draw()});
await save('04-irc-client',()=>{const c=document.createElement('canvas');c.width=768;c.height=576;c.getContext('2d').drawImage(window.__os.canvas,0,0,768,576);return c.toDataURL()});
const form=await page.evaluate(async()=>{
 const os=window.__os,{ledger}=await import('/src/state/ledger.ts');os.irc=null;os.kit=null;
 os.debugJump('kit');os.kit.onConnect();os.web.onJoin();ledger.records.push('rob-spoke-mother');
 os.irc.onEscalationDone();const waiting=!os.packet&&os.packetAfterForm&&!os.irc.open;
 os.openTapePlayer();const exploration=os.startMap.active;os.startMap.close();
 os.debugJump('intake');os.provotype.exit();const abandoned=!os.packet&&os.packetAfterForm;
 os.debugJump('intake');os.provotype.reachedDebrief=true;os.provotype.exit();
 const released=!!os.packet&&!os.packetAfterForm;os.packet.onAck();
 return {waiting,exploration,abandoned,released,completed:os.diaryPendingAt,now:os.t,outcomes:ledger.provotypes.slice(-2).map(p=>p.outcome)};
});assert(form.waiting&&form.exploration&&form.abandoned&&form.released);assert(form.completed>form.now);assert.deepEqual(form.outcomes,['abandoned','completed']);
const migration=await page.evaluate(async()=>{
 const {StartMenuMap}=await import('/src/desktop/apps/startMenuMap.ts');const {rootCauseForEra}=await import('/src/desktop/apps/rootCause.ts');const {ledger,wipeLedger}=await import('/src/state/ledger.ts');
 const root=rootCauseForEra('e1');root.keep({kind:'answer',text:'SEVEN-YEAR-OLDS DRAW.'});const canvas=document.createElement('canvas');canvas.width=768;canvas.height=576;
 const menus=[],shots=[];for(const era of ['e1','e2','e3','e4']){
  const m=new StartMenuMap(),model={now:null,next:[],steps:[],extras:[],room:[],jump:[]};m.menu=true;m.draw(canvas.getContext('2d'),768,576,era,model,false);m.press('sm-programs',model,false);
  const entries=m.draw(canvas.getContext('2d'),768,576,era,model,false);menus.push(entries.some(h=>h.id==='sm-prog:icon-rootcause'));
  m.press('sm-prog:icon-rootcause',model,false);m.draw(canvas.getContext('2d'),768,576,era,model,false);shots.push(canvas.toDataURL());
  if(m.root!==root)throw new Error('Root instance changed');
 }
 const kept=ledger.rootCause.kept.length;const count=ledger.records.filter(r=>r==='rootcause-installed').length;
 wipeLedger();const fresh=rootCauseForEra('e1');
 return {menus,shots,kept,count,reset:fresh!==root&&(await import('/src/state/ledger.ts')).ledger.rootCause.kept.length===0};
});assert(migration.menus.every(Boolean));assert.equal(migration.kept,1);assert.equal(migration.count,1);assert(migration.reset);
for(let i=0;i<4;i++)fs.writeFileSync(path.join(out,`05-root-era${i+1}.png`),Buffer.from(migration.shots[i].split(',')[1],'base64'));
await page.evaluate(()=>{const os=window.__os;os.diary=null;os.provotype=null;os.diaryPendingAt=Infinity;os.diaryAfterForm=false;os.debugJump('calebCommit');});
await new Promise(r=>setTimeout(r,700));
const caleb=await page.evaluate(()=>({sharedRoom:window.__os.caleb?.msgs.some(m=>m.text==='we shared a room at New Morning. i still remember you being there.')}));assert(caleb.sharedRoom);
// Owned Today screen, not a second frame list.
await page.evaluate(async()=>{const os=window.__os;os.caleb=null;os.accountability=null;os.debugJump('e2Active');os.openRestorify();os.restorify.showToday();os.toast=null;os.programSplash=null;os.draw()});
await new Promise(r=>setTimeout(r,2200));
await save('06-restorify-today',()=>{const c=document.createElement('canvas');c.width=768;c.height=576;c.getContext('2d').drawImage(window.__os.canvas,0,0,768,576);return c.toDataURL()});
// Exercise laptop routing with a real shared guide, without changing L's voiced script.
const laptop=await page.evaluate(async()=>{
 const os=window.__os;os.debugJump('e4BrowserSearch');const sh=os.e4;sh.stageNow='closed';sh.laptopLine=99;
 const g=os.lambyGuide;sh.browser.lambyGuide=g;g.tick(0,{era:'e4',map:{current:{era:'e4',beat:{id:'results'}},quiet:false},silent:false,voice:false});g.press('lg-tray');
 const c=document.createElement('canvas');c.width=224;c.height=140;sh.drawLaptop(c.getContext('2d'),224,140);
 const hits=sh.laptopHits.map(h=>h.id);const data=c.toDataURL();
 sh.browser.draw(document.createElement('canvas').getContext('2d'),512,384,true);
 const monitorHasL=sh.browser.hits.some(h=>h.id.startsWith('lg-'));
 const close=sh.laptopHits.find(h=>h.id==='lg-x');if(close)sh.pressLaptop(close.x+1,close.y+1);
 return {data,hits,monitorHasL,dismissed:!g.active};
});assert(laptop.hits.includes('lg-tray'));assert(!laptop.monitorHasL);assert(laptop.dismissed);
fs.writeFileSync(path.join(out,'07-laptop-L.png'),Buffer.from(laptop.data.split(',')[1],'base64'));
assert.equal(errors.length,0,errors.join('\n'));
fs.writeFileSync(path.join(out,'probe-results.json'),JSON.stringify({banner:results.banner,tapes,form,migration:{menus:migration.menus,kept:migration.kept,installed:migration.count,reset:migration.reset},caleb,laptop:{hits:laptop.hits,monitorHasL:laptop.monitorHasL,dismissed:laptop.dismissed},errors},null,2));
console.log('CX3b targeted probes PASS: banner geometry/handoff, all tapes, form filing gate, four-era add-on identity and ledger wipe, laptop help routing.');
await browser.close();
