import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const port = Number(process.argv[2] || 3222);
const out = 'out/start-menu-map'; fs.mkdirSync(`${out}/surfaces`, { recursive: true });
const browser = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--disable-background-networking'], defaultViewport:{width:400,height:225,deviceScaleFactor:1} });
const page = await browser.newPage(), results = [], errors = [];
page.on('pageerror', e => errors.push(String(e)));
async function load(era=2, extra='') {
 await page.goto(`http://127.0.0.1:${port}/?reinterp=1&kiosk=0&debug=1&descent=0&era=${era===1?2:era}${extra}`, {waitUntil:'load',timeout:120000});
 await page.waitForFunction(()=>window.__os&&window.__app,{timeout:120000});
 await page.evaluate(async era => { const m = await import('/src/witness/startModel.ts'); window.__startModel = m.buildStartModel; window.__menuBus = (await import('/src/state/gameMenuBus.ts')).gameMenuBus;
 if(era===1) __menuBus.jumpToEra('e1'); }, era);
 await tick(1);
}
async function tick(s=.1) { await page.evaluate(s=>{for(let i=0;i<s*10;i++)__app.fire('update',.1); __os.draw();},s); }
async function press(id, surface='os') {
 const state = await page.evaluate(({id,surface})=>{const o=surface==='queue'?__graceQueue():surface==='browser'?__os.e4.browser:__os; __os.draw(); if(surface==='queue'){const c=document.createElement('canvas');c.width=676;c.height=390;o.draw(c.getContext('2d'),676,390);}if(surface==='browser'){const c=document.createElement('canvas');c.width=710;c.height=384;o.draw(c.getContext('2d'),710,384);}
 const hits=o.hits||o.rects; const h=hits.find(h=>h.id===id); if(!h)return {ok:false,hits:hits.map(h=>h.id)};o.handleClick(h.x+Math.floor(h.w/2),h.y+Math.floor(h.h/2));return {ok:true};},{id,surface});
 assert(state.ok, `${surface}:${id}: ${JSON.stringify(state)}`);await tick(.1);
}
async function check(name,fn){try{await fn();results.push({name,pass:true});console.log('PASS',name);}catch(e){results.push({name,pass:false,error:String(e)});console.log('FAIL',name,String(e));}}
async function shot(name,surface='os') {
 for(const [width,height] of [[1280,720],[390,844]]){
  await page.setViewport({width,height,deviceScaleFactor:1}); await tick(.1); await new Promise(r=>setTimeout(r,120));
  await page.evaluate(()=>document.querySelectorAll('pre').forEach(e=>{if(e.textContent.includes('GYRO / HORIZON'))e.style.display='none';}));
  await page.screenshot({path:`${out}/${name}-${width}x${height}.png`});
 }
 const data=await page.evaluate(surface=>{let c;if(surface==='os')c=__os.canvas;else {c=document.createElement('canvas');c.width=surface==='queue'?676:710;c.height=surface==='queue'?390:384;(surface==='queue'?__graceQueue():__os.e4.browser).draw(c.getContext('2d'),c.width,c.height);}return c.toDataURL();},surface);
 fs.writeFileSync(`${out}/surfaces/${name}.png`,Buffer.from(data.split(',')[1],'base64'));
 await page.setViewport({width:400,height:225,deviceScaleFactor:1});
}
async function model(surface='os'){return page.evaluate(surface=>__startModel(surface==='browser'?{e4:{browser:__os.e4.browser}}:surface==='queue'?undefined:__os,surface==='queue'?'e3':surface==='browser'?'e4':__os.era),surface);}
try {
 await check('2003 full list: 17 ordered rows, map ticks update through debug beat',async()=>{
  await load(2);await press('start-menu'); const hits=await page.evaluate(()=>__os.startHits.map(h=>h.id));assert(hits.includes('sm-allsteps')&&hits.includes('sm-jump'));
  await press('sm-allsteps');let m=await model();assert.equal(m.steps.length,17);assert.equal(m.steps[0].id,'assistant');await shot('e2-allsteps');
  await press('steps-close');
  // The existing Caleb debug route files the earlier main-path prerequisites.
  await page.evaluate(()=>__os.debugJump('calebChat'));await tick(.1);m=await model();assert(m.steps.find(b=>b.id==='checkin').state==='done');
 });
 await check('2003 What to do reopens, also after Caleb clears the desk',async()=>{
  await load(2);await tick(3);await press('startpanel-close');assert(!await page.evaluate(()=>__os.startPanels.e2.open));
  await press('taskbar-whattodo');assert(await page.evaluate(()=>__os.startPanels.e2.open));await page.evaluate(()=>__os.clearDeskForCaleb());await tick(.1);assert(!await page.evaluate(()=>__os.startPanels.e2.open));
  await press('taskbar-whattodo');assert(await page.evaluate(()=>__os.startPanels.e2.open));await shot('e2-whattodo');
 });
 await check('2003 → 2016 → 1997 through menus; cancel preserves records and era',async()=>{
  await load(2);await press('start-menu');await shot('e2-menu');await press('sm-jump');await press('sm-jump-e3');await shot('e2-confirm');
  const before=await page.evaluate(()=>JSON.stringify(__ledger().records));await press('jump-stay');assert.equal(await page.evaluate(()=>JSON.stringify(__ledger().records)),before);assert.equal(await page.evaluate(()=>__os.era),'e2');
  await press('start-menu');await press('sm-jump');await press('sm-jump-e3');
  const result=await page.evaluate(()=>{const before=JSON.stringify(__ledger().records);const h=__os.hits.find(h=>h.id==='jump-confirm');__os.handleClick(h.x+h.w/2,h.y+h.h/2);return {before,after:JSON.stringify(__ledger().records),era:__os.era,step:__spine().step};});assert.equal(result.before,result.after);assert.equal(result.era,'e3');assert.equal(result.step,'e3');await tick(.1);
  await press('start-menu','queue');await press('sm-jump','queue');await press('sm-jump-e1','queue');await press('jump-confirm','queue');assert.equal(await page.evaluate(()=>__os.era),'e1');assert.equal(await page.evaluate(()=>__spine().step),'e1');
 });
 for(const [era,surface] of [[1,'os'],[2,'os'],[3,'queue'],[4,'browser']]) {
  await check(`era ${era}: menu, list, confirm and help at both viewports`,async()=>{
   await load(era);if(era===4){await page.evaluate(()=>__os.e4.browser.wake());await tick(15);}
   await press('start-menu',surface);await shot(`e${era}-menu`,surface);const m=await model(surface);assert(m.next.length<=2);results.push({era,model:m});
   await press('sm-allsteps',surface);await shot(`e${era}-allsteps`,surface);await press('steps-close',surface);
   await press('start-menu',surface);await press('sm-jump',surface);await press(era===4?'sm-jump-e1':'sm-jump-e4',surface);await shot(`e${era}-confirm`,surface);await press('jump-stay',surface);
   await page.evaluate(surface=>{const p=surface==='queue'?__graceQueue().startPanel:surface==='browser'?__os.e4.browser.startPanel:__os.startPanels[__os.era];p.close();},surface);
   await press(era<=2?'taskbar-whattodo':'whattodo',surface);await shot(`e${era}-whattodo`,surface);
   assert(await page.evaluate(surface=>(surface==='queue'?__graceQueue().startPanel:surface==='browser'?__os.e4.browser.startPanel:__os.startPanels[__os.era]).open,surface));
  });
 }
 await check('felt Messenger dims machine Jump; frame Go here works and Esc closes',async()=>{
  await load(2);await page.evaluate(()=>__os.debugJump('calebChat'));await tick(.1);await press('start-menu');
  assert(await page.evaluate(()=>__os.startHits.some(h=>h.title==='Not during this scene')));assert(!await page.evaluate(()=>__os.startHits.some(h=>h.id==='sm-jump')));
  await page.keyboard.press('Escape');await page.evaluate(()=>{const b=[...document.querySelectorAll('#reinterp-game-menu button')].find(b=>b.textContent.includes('Where you are'));if(!b)throw Error('map row missing');b.click();});
  await page.$eval('[data-action="go-here-e4"]',b=>b.click());let text=await page.$eval('#reinterp-game-menu',e=>e.textContent);assert(text.includes('Jump to 2026 · Maya?'));await shot('frame-confirm');
  await page.evaluate(()=>[...document.querySelectorAll('#reinterp-game-menu button')].find(b=>b.textContent==='Jump').click());await tick(.1);assert.equal(await page.evaluate(()=>__os.era),'e4');assert.equal(await page.evaluate(()=>__spine().step),'e4');
  await page.keyboard.press('Escape');assert.equal(await page.$eval('#reinterp-game-menu',e=>e.style.display),'flex');await page.keyboard.press('Escape');await page.waitForFunction(()=>document.getElementById('reinterp-game-menu').style.display==='none');
 });
 await check('2016 board strip reopens from ? and Start; both close controls are published',async()=>{
  await load(3);await press('signin','queue');await press('consent-allow','queue');await tick(.2);
  await page.evaluate(()=>__graceQueue().startPanel.close());await press('whattodo','queue');
  assert(await page.evaluate(()=>__graceQueue().rects.filter(r=>r.id==='startpanel-close').length===2));await shot('e3-strip','queue');
  await press('startpanel-close','queue');await press('start-menu','queue');await press('sm-whattodo','queue');assert(await page.evaluate(()=>__graceQueue().startPanel.open));
 });
 await check('frame Go here from mid-1997; navigation files nothing and leaves the cut alone',async()=>{
  await load(1,'&cut=speedrun');await page.evaluate(()=>__os.debugJump('kit'));await tick(.1);await page.keyboard.press('Escape');
  await page.evaluate(()=>[...document.querySelectorAll('#reinterp-game-menu button')].find(b=>b.textContent.includes('Where you are')).click());await page.$eval('[data-action="go-here-e4"]',b=>b.click());
  const result=await page.evaluate(()=>{const before=JSON.stringify(__ledger());[...document.querySelectorAll('#reinterp-game-menu button')].find(b=>b.textContent==='Jump').click();return {before,after:JSON.stringify(__ledger()),era:__os.era,step:__spine().step};});
  assert.equal(result.era,'e4');assert.equal(result.step,'e4');assert.equal(result.before,result.after);assert.equal(await page.evaluate(async()=> (await import('/src/state/cut.ts')).currentCut()),'speedrun');
 });
 await check('menu jumps out of 2026 never complete the Commons or add arrival records',async()=>{
  await load(4);await page.evaluate(()=>__os.e4.browser.wake());await tick(15);await press('start-menu','browser');await press('sm-jump','browser');await press('sm-jump-e3','browser');
  const result=await page.evaluate(()=>{const before=JSON.stringify(__ledger());const b=__os.e4.browser,h=b.hits.find(h=>h.id==='jump-confirm');b.handleClick(h.x+h.w/2,h.y+h.h/2);return {before,after:JSON.stringify(__ledger())};});assert.equal(result.before,result.after);await tick(.3);assert.equal(result.before,await page.evaluate(()=>JSON.stringify(__ledger())));
 });
 await check('list rendering ticks and current marker match the map, before and after progress',async()=>{
  await load(2);const read=()=>page.evaluate(()=>{const o=__os, model=__startModel(o,o.era),texts=[],fn=o.ctx.fillText;o.ctx.fillText=function(t,...args){texts.push(t);return fn.call(this,t,...args);};o.dirty=true;o.draw();o.ctx.fillText=fn;return {ticks:texts.filter(t=>t==='✓').length,current:texts.filter(t=>t==='▸').length,model};});
  await press('start-menu');await press('sm-allsteps');let r=await read();assert.equal(r.ticks,r.model.steps.filter(b=>b.state==='done').length);assert.equal(r.current,1);
  await press('steps-close');await page.evaluate(()=>{__os.debugJump('calebChat');__menuBus.jumpToEra('e2');});await tick(.1);await press('start-menu');await press('sm-allsteps');r=await read();assert(r.ticks>1);assert.equal(r.ticks,r.model.steps.filter(b=>b.state==='done').length);
 });
 await check('crowded 2003 Start collapses Programs into a plain sub-list',async()=>{
  await load(2);const r=await page.evaluate(()=>{
   const o=__os,nav=o.startMap,m=__startModel(o,'e2'),programs=Array.from({length:15},(_,i)=>({id:'probe-'+i,label:'Program '+(i+1)}));nav.menu=true;
   const collapse=nav.draw(o.ctx,512,384,'e2',m,false,programs).find(h=>h.id==='sm-programs');
   if(!collapse)return {collapsed:false};nav.press(collapse.id,m,false);
   const rows=nav.draw(o.ctx,512,384,'e2',m,false,programs).filter(h=>h.id.startsWith('sm-prog:'));
   return {collapsed:true,view:nav.view,rows:rows.length};
  });assert(r.collapsed);assert.equal(r.view,'programs');assert.equal(r.rows,15);
 });
 await check('machine maps still name their era after the Close was previously completed',async()=>{
  await load(4);await page.evaluate(()=>{__ledger().updates.push({toEra:0,remindLaterCount:0,eulaScrollPct:1});__menuBus.jumpToEra('e3');});await tick(.1);
  const m=await model('queue');assert(m.steps.find(b=>b.id==='phone').place.includes('the phone on its stand, left of the monitor'));assert(m.now);assert.equal(m.now.id,'migrate');assert.equal(await page.evaluate(()=>__menuBus.mapSource().eras.find(e=>e.here).id),'e3');
 });
 for(const [era,surface] of [[3,'queue'],[4,'browser']]){
  await check(`era ${era}: existing Lamby Start nudge points to and opens the new menu`,async()=>{
   await load(era,'&idlescale=30');
   if(era===3){await page.evaluate(()=>__graceQueue().debugBeat('consent'));await tick(8);}
   else {await page.evaluate(()=>__os.e4.browser.wake());await tick(15);await press('tab0','browser');await tick(35);await page.evaluate(()=>__os.e4.browser.handleClick(1,200));await tick(.1);}
   await tick(65);assert.equal(await page.evaluate(()=>__os.lambyGuide.view.rung),'tip');await press('lg-later',surface);await tick(82);assert.equal(await page.evaluate(()=>__os.lambyGuide.view.rung),'again');await press('lg-later',surface);await tick(82);
   assert.equal(await page.evaluate(()=>__os.lambyGuide.view.rung),'start');
   const rings=await page.evaluate(surface=>(surface==='queue'?__graceQueue():__os.e4.browser).lambyGuidePaint.rings,surface);assert(rings.some(r=>r.id==='start-menu'));
   await shot(`e${era}-guide-start`,surface);await press('lg-take',surface);assert(await page.evaluate(surface=>(surface==='queue'?__graceQueue():__os.e4.browser).startMap.menu,surface));
  });
  await check(`era ${era}: Shut Down refusal stays in the machine's own chrome`,async()=>{
   await load(era);if(era===4){await page.evaluate(()=>__os.e4.browser.wake());await tick(15);}
   await press('start-menu',surface);await press('sm-shut',surface);await shot(`e${era}-refused`,surface);await press('shut-ok',surface);assert(!await page.evaluate(surface=>(surface==='queue'?__graceQueue():__os.e4.browser).startMap.refused,surface));
  });
 }
 await check('2016 required notice covers the full list and retains its one-press close',async()=>{
  await load(3);await press('signin','queue');await press('consent-allow','queue');await press('start-menu','queue');await press('sm-allsteps','queue');await page.evaluate(()=>{const q=__graceQueue();q.pauseOpen=true;q.pauseLines=['Probe notice'];q.bump();});await tick(.1);
  await page.evaluate(()=>{const c=document.createElement('canvas');c.width=676;c.height=390;__graceQueue().draw(c.getContext('2d'),676,390);});assert(!await page.evaluate(()=>__graceQueue().rects.some(r=>r.id==='steps-close')));await press('pause-close','queue');assert(!await page.evaluate(()=>__graceQueue().pauseOpen));
 });
 await check('taskbar help remains one press away while the Start menu is open in every era',async()=>{
  for(const [era,surface] of [[1,'os'],[2,'os'],[3,'queue'],[4,'browser']]){
   await load(era);if(era===4){await page.evaluate(()=>__os.e4.browser.wake());await tick(15);}
   await page.evaluate(surface=>(surface==='queue'?__graceQueue().startPanel:surface==='browser'?__os.e4.browser.startPanel:__os.startPanels[__os.era]).close(),surface);
   await press('start-menu',surface);await press(era<3?'taskbar-whattodo':'whattodo',surface);
   assert(await page.evaluate(surface=>(surface==='queue'?__graceQueue().startPanel:surface==='browser'?__os.e4.browser.startPanel:__os.startPanels[__os.era]).open,surface));
   assert(!await page.evaluate(surface=>surface==='os'?__os.startOpen:(surface==='queue'?__graceQueue():__os.e4.browser).startMap.menu,surface));
  }
 });
 await check('Speedrun uses its own work label and excludes skipped testimony player/edit',async()=>{await load(2,'&cut=speedrun');let m=await model();assert.equal(m.steps.length,15);assert(!m.steps.some(b=>['tapes','cut'].includes(b.id)));m=await page.evaluate(()=>__startModel(undefined,'e3'));assert.equal(m.steps.find(b=>b.id==='work').label,'One piece of work');});
 fs.writeFileSync(`${out}/probe-results.json`,JSON.stringify({results,errors},null,2));assert(results.every(r=>r.pass!==false));assert.deepEqual(errors,[]);
}finally{await browser.close();}
