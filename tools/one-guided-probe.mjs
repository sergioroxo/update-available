import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const port=Number(process.argv[2]||3223), out='out/one-guided-version';
fs.mkdirSync(`${out}/surfaces`,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--disable-background-networking'],defaultViewport:{width:400,height:225,deviceScaleFactor:1}});
const page=await browser.newPage(), results=[], errors=[];
page.on('pageerror',e=>errors.push(String(e)));
async function tick(s=.1){await page.evaluate(s=>{for(let i=0;i<s*10;i++)__app.fire('update',.1);__os.draw();},s);}
async function draw(surface='os'){await page.evaluate(surface=>{const o=surface==='queue'?__graceQueue():surface==='browser'?__os.e4.browser:__os;if(surface==='os')o.draw();else{const c=document.createElement('canvas');c.width=surface==='queue'?676:710;c.height=surface==='queue'?390:384;o.draw(c.getContext('2d'),c.width,c.height);}},surface);}
async function press(id,surface='os'){
 await draw(surface);
 const r=await page.evaluate(({id,surface})=>{const o=surface==='queue'?__graceQueue():surface==='browser'?__os.e4.browser:__os,owners=surface==='os'?[o,o.restorify,o.testimony,o.provotype].filter(Boolean):[o],h=owners.flatMap(a=>a.hits||a.rects||[]).find(h=>h.id===id);if(!h)return {ok:false,hits:(o.hits||o.rects).map(h=>h.id)};o.handleClick(h.x+h.w/2,h.y+h.h/2);return {ok:true};},{id,surface});
 assert(r.ok,`${surface}:${id}: ${JSON.stringify(r)}`);await tick(.1);
}
async function load(era=2,extra=''){
 await page.goto(`http://127.0.0.1:${port}/?reinterp=1&kiosk=0&debug=1&descent=0&era=${era===1?2:era}${extra}`,{waitUntil:'load',timeout:120000});await page.waitForFunction(()=>window.__os&&window.__app,{timeout:120000});
 await page.evaluate(async()=>{window.__cut=await import('/src/state/cut.ts');window.__model=(await import('/src/witness/startModel.ts')).buildStartModel;});
 if(era===1){await press('start-menu');await press('sm-jump');await press('sm-jump-e1');await press('jump-confirm');}
 await tick(3);
}
async function shot(name,surface){
 for(const [width,height] of [[1280,720],[390,844]]){
  await page.setViewport({width,height,deviceScaleFactor:1});await tick(.1);await new Promise(r=>setTimeout(r,200));
  await page.evaluate(()=>document.querySelectorAll('pre').forEach(e=>{if(e.textContent.includes('GYRO / HORIZON'))e.style.display='none';}));
  await page.screenshot({path:`${out}/${name}-${width}x${height}.png`});
 }
 await draw(surface);
 const data=await page.evaluate(surface=>{if(surface==='os')return __os.canvas.toDataURL();const c=document.createElement('canvas');c.width=surface==='queue'?676:710;c.height=surface==='queue'?390:384;(surface==='queue'?__graceQueue():__os.e4.browser).draw(c.getContext('2d'),c.width,c.height);return c.toDataURL();},surface);
 fs.writeFileSync(`${out}/surfaces/${name}.png`,Buffer.from(data.split(',')[1],'base64'));await page.setViewport({width:400,height:225,deviceScaleFactor:1});
}
async function check(name,fn){const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7);if(only&&!name.includes(only))return;try{const detail=await fn();results.push({name,pass:true,detail});console.log('PASS',name);}catch(e){results.push({name,pass:false,error:String(e)});console.log('FAIL',name,String(e));}}
try{
 await check('default and full review cuts',async()=>{await load();assert.equal(await page.evaluate(()=>__cut.currentCut()),'speedrun');await load(2,'&cut=full');assert.equal(await page.evaluate(()=>__cut.currentCut()),'full');});
 await check('Home has no version chooser on the computer card',async()=>{
  const p=await browser.newPage();p.on('pageerror',e=>errors.push(String(e)));
  try{
   await p.goto(`http://127.0.0.1:${port}/?reinterp=1&entrance=home&kiosk=0&debug=1&descent=0`,{waitUntil:'load',timeout:120000});await p.waitForSelector('#lambyos-home',{timeout:120000});
   await p.click('[data-home="notice"]');await p.click('[data-home-close]');await p.click('[data-home="computer"]');
   const r=await p.$eval('#lambyos-home',e=>({radio:e.querySelectorAll('[name="home-cut"]').length,text:e.textContent}));assert.equal(r.radio,0);assert(!/Which version|Speedrun/i.test(r.text));
  }finally{await p.close();}
 });
 for(const [era,surface] of [[1,'os'],[2,'os'],[3,'queue'],[4,'browser']]){
  await check(`era ${era}: default panel, Lamby and Start; More to explore in both viewports`,async()=>{
   await load(era);assert.equal(await page.evaluate(()=>__cut.currentCut()),'speedrun');
   if(era===4){await page.evaluate(()=>__os.e4.browser.wake());await tick(15);}
   const state=await page.evaluate(surface=>({guide:!!__os.lambyGuide,panel:(surface==='queue'?__graceQueue().startPanel:surface==='browser'?__os.e4.browser.startPanel:__os.startPanels[__os.era]).everShown,wired:surface==='os'||(surface==='queue'?__graceQueue():__os.e4.browser).lambyGuide===__os.lambyGuide}),surface);assert(state.guide&&state.panel&&state.wired);
   await page.evaluate(surface=>(surface==='queue'?__graceQueue().startPanel:surface==='browser'?__os.e4.browser.startPanel:__os.startPanels[__os.era]).close(),surface);
   await press(era<3?'taskbar-whattodo':'whattodo',surface);
   assert(await page.evaluate(surface=>(surface==='queue'?__graceQueue().startPanel:surface==='browser'?__os.e4.browser.startPanel:__os.startPanels[__os.era]).open,surface));
   await press('startpanel-close',surface);await press('start-menu',surface);await draw(surface);
   const labels=await page.evaluate(surface=>{const o=surface==='queue'?undefined:surface==='browser'?{e4:{browser:__os.e4.browser}}:__os,era=surface==='queue'?'e3':surface==='browser'?'e4':__os.era;return __model(o,era).extras;},surface);
   assert(labels.length>0);await shot(`e${era}-more`,surface);return labels;
  });
 }
 await check('2003: Play your takes through real check-in → six prep topics → release → Daniel tape → edit',async()=>{
  await load(2);await press('start-menu');await press('sm-extra:tapes');assert(await page.evaluate(()=>__cut.extraOn('tapes')));
  if(await page.evaluate(()=>__os.startOpen))await press('start-menu'); // extra selection may close the menu
  await press('icon-restorify');await tick(8);await press('checkin:steady');await press('checkin-continue');
  await tick(2);await press('icon-story');await tick(25);
  assert.equal(await page.evaluate(()=>__os.testimony.topics),6);assert(!await page.evaluate(()=>__os.testimony.hits.some(h=>h.id==='ts-next')));
  await press('ts-prep-done');await press('ts-agree');assert.equal(await page.evaluate(()=>__os.testimony.stage),'tapes');
  assert(!await page.evaluate(()=>__ledger().records.includes('testimony-tapes')||__ledger().records.includes('testimony-cut')));
  await press('ts-file:daniel');await tick(120);await press('ts-folder');await press('ts-send');assert.equal(await page.evaluate(()=>__os.testimony.stage),'cut');
  await press('ts-nextcut');await press('ts-nextcut');await press('ts-export');await tick(10);assert(await page.evaluate(()=>__ledger().records.includes('testimony-cut')));await press('ts-continue');assert.equal(await page.evaluate(()=>__os.testimony.stage),'online');
 });
 await check('physical 400×225: Start extra → six topics → Daniel take → editor, no stage writes',async()=>{
  await page.goto(`http://127.0.0.1:${port}/?reinterp=1&kiosk=0&debug=1&descent=0&era=2`,{waitUntil:'load',timeout:120000});
  await page.waitForFunction(()=>window.__os?.startPanels.e2.everShown,{timeout:60000});
  async function physical(id){
   console.log('PHYSICAL waiting',id);
   try { await page.waitForFunction(id=>!__os.programSplash&&[__os,__os.restorify,__os.testimony].filter(Boolean).some(o=>(o.hits||[]).some(h=>h.id===id)),{timeout:60000},id); }
   catch(e){throw Error(`${id}: ${e}; `+JSON.stringify(await page.evaluate(()=>({phase:__os.phase,story:__os.testimony?.stage,restore:__os.restorify?.stage,hits:[__os,__os.restorify,__os.testimony].filter(Boolean).flatMap(o=>(o.hits||[]).map(h=>h.id))}))));}
   const pt=await page.evaluate(id=>{
    const h=[__os,__os.restorify,__os.testimony].filter(Boolean).flatMap(o=>o.hits||[]).find(h=>h.id===id);
    let cam;__app.root.forEach(e=>{if(e.camera&&e.enabled)cam=e;});const V=__app.root.getPosition().constructor;
    const p=cam.camera.worldToScreen(new V(((h.x+h.w/2)/512-.5)*.4,1.08-((h.y+h.h/2)/384-.5)*.3,0));
    const el=document.elementFromPoint(p.x,p.y);if(p.z<=0||p.x<0||p.y<0||p.x>=innerWidth||p.y>=innerHeight||el?.tagName!=='CANVAS')throw Error(`${id} not physically aimable: ${p.x},${p.y} ${el?.tagName}`);
    return [p.x,p.y];
   },id);
   await page.mouse.move(...pt);await page.mouse.down();await new Promise(r=>setTimeout(r,70));await page.mouse.up();await new Promise(r=>setTimeout(r,350));
  }
  await physical('start-menu');await physical('sm-extra:tapes');
  assert(await page.evaluate(async()=>(await import('/src/state/cut.ts')).extraOn('tapes')));
  await physical('start-menu');await physical('icon-restorify');await physical('checkin:steady');await physical('checkin-continue');await physical('icon-story');
  await physical('ts-prep-done');assert.equal(await page.evaluate(()=>__os.testimony.topics),6);await physical('ts-agree');
  assert.equal(await page.evaluate(()=>__os.testimony.stage),'tapes');assert(!await page.evaluate(()=>__ledger().records.includes('testimony-tapes')||__ledger().records.includes('testimony-cut')));
  await physical('ts-file:daniel');await page.waitForFunction(()=>!__os.testimony.playing,{timeout:180000,polling:1000});await physical('ts-folder');await physical('ts-send');
  assert.equal(await page.evaluate(()=>__os.testimony.stage),'cut');return {viewport:[400,225],topicPath:['BEFORE','WHAT I BELIEVED','TURNING POINT','WHAT CHANGED','WHERE I AM NOW','TO SOMEONE STRUGGLING'],stage:'cut',input:'mouse down/up; natural clocks'};
 });
 await check('1997: guided 0→3→5 and full 0→1→2→3→4→5; silence→close→debrief→completion',async()=>{
  const runs=[];
  for(const full of [false,true]){
   await load(1,full?'&cut=full':'');
   // The UI grammar is exercised with the unchanged form; OS availability is proven by the end-to-end walk.
   const r=await page.evaluate(async()=>{
    const {ProvotypeApp}=await import('/src/desktop/apps/provotype.ts'), data=(await import('/data/provotypes/origin_intake_e1.json')).default;
    const a=new ProvotypeApp(data),c=document.createElement('canvas');c.width=512;c.height=384;const ctx=c.getContext('2d');
    function hit(id){a.draw(ctx);const h=a.hits.find(h=>h.id===id);if(!h)throw Error(`missing ${id}: ${a.phase}/${a.stateIndex}`);a.handleClick(h.x+h.w/2,h.y+h.h/2);}
    hit('primary');hit('primary');const indices=[];
    for(let n=0;n<30&&a.phase==='vignette';n++){
     if(!indices.includes(a.stateIndex))indices.push(a.stateIndex);a.draw(ctx);
     hit(a.hits.some(h=>h.id==='choice:0')?'choice:0':'primary');
    }
    const silenceTo=a.phase;hit('primary');const debrief=a.phase;
    for(let n=0;n<30&&a.open;n++)hit('primary');
    const {beatDone}=await import('/src/witness/map.ts');return {indices,silenceTo,debrief,formDone:beatDone('formDone',__os),entry:__ledger().provotypes.at(-1),completeTag:__ledger().tags.includes('provotype:origin_intake_e1'),tags:__ledger().tags.filter(t=>t.startsWith('intake:'))};
   });assert.deepEqual(r.indices,full?[0,1,2,3,4,5]:[0,3,5]);assert.equal(r.silenceTo,'close');assert.equal(r.debrief,'debrief');assert.equal(r.entry.id,'origin_intake_e1');assert.equal(r.entry.outcome,'completed');assert(r.formDone&&r.completeTag);if(!full)assert(r.tags.every(t=>!/(father_regard|play_pattern|friendship_log)/.test(t)));runs.push(r);
  }return runs;
 });
 await check('1997 extras: every programme page; whole prayer holds Amen until the song ends',async()=>{
  await load(1);await press('start-menu');await press('sm-extra:programme');await press('sm-extra:prayer');
  const r=await page.evaluate(async()=>{
   const {KitApp,PRAYER_AT,PRAYER_LEN}=await import('/src/desktop/apps/kit.ts');const a=new KitApp(),c=document.createElement('canvas');c.width=512;c.height=384;const ctx=c.getContext('2d');
   function hit(id){a.draw(ctx);const h=a.hits.find(h=>h.id===id);if(!h)throw Error(id+': '+a.panel);a.handleClick(h.x+h.w/2,h.y+h.h/2);}
   a.update(4);hit('next');hit('step:read');const pages=[a.readPage];
   for(let n=0;n<30;n++){a.draw(ctx);if(!a.hits.some(h=>h.id==='next'))break;hit('next');pages.push(a.readPage);}hit('done');hit('step:pray');
   let t=PRAYER_AT+PRAYER_LEN-.25;a.tapeProbe=()=>({inserted:'tapeA',playing:true,elapsed:t});a.draw(ctx);const before=a.hits.some(h=>h.id==='amen');t+=.25;a.draw(ctx);const ended=a.hits.some(h=>h.id==='amen');return {pages,expected:(await import('/data/dialog/s1_kit.json')).default.read.pages.length,before,ended};
  });assert.equal(r.pages.length,r.expected);assert.deepEqual(r.pages,r.pages.map((_,i)=>i));assert(!r.before&&r.ended);
  await load(1);const late=await page.evaluate(async()=>{const {KitApp,PRAYER_AT,PRAYER_LEN}=await import('/src/desktop/apps/kit.ts');const a=new KitApp();a.tapeProbe=()=>({inserted:'tapeA',playing:false,elapsed:PRAYER_AT+PRAYER_LEN});a.update(.1);__cut.enableExtra('prayer');return {passed:__cut.extraPassed('prayer'),on:__cut.extraOn('prayer')};});assert.deepEqual(late,{passed:true,on:false});return {...r,late};
 });
 await check('2016 extras: mid-era opt-in preserves board; extra work delays phone; passed gate greys out',async()=>{
  const runs=[];
  for(const moreWork of [true,false]){
   await load(3);
   if(moreWork){await press('start-menu','queue');await press('sm-extra:work','queue');await press('start-menu','queue');}
   await press('signin','queue');await press('consent-allow','queue');await tick(2);
   const before=await page.evaluate(()=>[...__graceQueue().unlockedIds()]);
   if(moreWork){await press('start-menu','queue');await press('sm-extra:jobs','queue');await press('start-menu','queue');}
   const familyIndex=await page.evaluate(()=>__graceQueue().tasks().findIndex(t=>t.id==='family'));
   await press('task-'+familyIndex,'queue');
   for(let i=0;i<3;i++){await press('family-sel-'+i,'queue');await press('family-handle','queue');}
   await tick(5);const after=await page.evaluate(()=>({phone:__graceQueue().maltaArrived,ids:[...__graceQueue().unlockedIds()],passed:__cut.extraPassed('work')}));
   assert.deepEqual(after.ids.slice(0,before.length),before);assert.equal(after.phone,!moreWork);assert.equal(after.passed,!moreWork);
   if(!moreWork){await press('start-menu','queue');await draw('queue');const model=await page.evaluate(()=>__model(undefined,'e3').extras.find(e=>e.id==='work'));assert(model.passed&&!model.on);assert(!await page.evaluate(()=>__graceQueue().rects.some(h=>h.id==='sm-extra:work')));}
   runs.push({moreWork,before,...after});
  }return runs;
 });
 await check('passed branch cannot enable; enabled extras survive era jump, wipe on soft Restart generation',async()=>{
  await load(2);await press('start-menu');await press('sm-extra:tapes');
  await press('sm-jump');await press('sm-jump-e3');await press('jump-confirm');assert(await page.evaluate(()=>__cut.extraOn('tapes')));
  const result=await page.evaluate(async()=>{__cut.markExtraPassed('prayer');__cut.enableExtra('prayer');const refused=!__cut.extraOn('prayer');const before=__cut.extraOn('tapes');(await import('/src/state/ledger.ts')).wipeLedger();return {refused,before,after:__cut.extraOn('tapes'),passed:__cut.extraPassed('prayer')};});assert.deepEqual(result,{refused:true,before:true,after:false,passed:false});
 });
 await check('modal chain leaves a calm second; Remind me later works only once',async()=>{
  await load();const r=await page.evaluate(async()=>{
   const {UpdateApp}=await import('/src/desktop/apps/update.ts'), a=new UpdateApp('u2'),c=document.createElement('canvas');c.width=512;c.height=384;const ctx=c.getContext('2d');
   function draw(){a.draw(ctx);return a.hits.map(h=>h.id);}function hit(id){draw();const h=a.hits.find(h=>h.id===id);if(!h)throw Error(id);a.handleClick(h.x+h.w/2,h.y+h.h/2);}
   a.update(.1);hit('cascade-retry');const blank=draw();for(let i=0;i<11;i++)a.update(.1);hit('remind-later');for(let i=0;i<410;i++)a.update(.1);const returned=draw();hit('update-now');const eulaBlank=draw();for(let i=0;i<11;i++)a.update(.1);return {blank,returned,eulaBlank,eula:draw()};
  });assert.deepEqual(r.blank,[]);assert.deepEqual(r.eulaBlank,[]);assert(!r.returned.includes('remind-later'));assert(r.eula.some(id=>id.startsWith('eula-')));return r;
 });
 await check('fresh default entrance: greet → wip → whose → sound → look → start → note → advert → allset',async()=>{
  const p=await browser.newPage();p.on('pageerror',e=>errors.push(String(e)));
  try {
   await p.goto(`http://127.0.0.1:${port}/?reinterp=1&kiosk=0&debug=1`,{waitUntil:'load',timeout:120000});
   await p.waitForSelector('#restore-entrance[data-phase="wake"]',{timeout:120000});await p.mouse.click(200,112);
   const observed=[];
   async function tap(id){
    
    await p.waitForFunction(id=>JSON.parse(document.getElementById('restore-entrance')?.dataset.setupHits||'[]').some(h=>h.id===id),{timeout:30000},id);
    const r=await p.evaluate(id=>({h:JSON.parse(document.getElementById('restore-entrance').dataset.setupHits).find(h=>h.id===id&&h.x+h.w/2>=0&&h.y+h.h/2>=0&&h.x+h.w/2<innerWidth&&h.y+h.h/2<innerHeight),stage:__os.setup.step}),id);
    if(!r.h)throw Error(`No visible ${id}: `+JSON.stringify(await p.evaluate(()=>({step:__os.setup.step,hits:JSON.parse(document.getElementById('restore-entrance').dataset.setupHits)}))));
    if(!observed.includes(r.stage))observed.push(r.stage);await p.mouse.click(r.h.x+r.h.w/2,r.h.y+r.h.h/2);await new Promise(r=>setTimeout(r,350)); 
   }
   await tap('setup-choice-0');await tap('setup-choice-0');await tap('setup-choice-0');await tap('setup-close');await tap('setup-sound-on');await tap('setup-choice-0');await tap('setup-close');await tap('setup-choice-1');await tap('setup-close');await tap('setup-advert-play-0');
   await p.waitForFunction(()=>document.getElementById('restore-entrance')?.dataset.setupStage==='balloon-9',{timeout:200000,polling:1000});await tap('setup-choice-0');
   assert.deepEqual(observed,['greet','wip','whose','sound','look','start','note','advert','allset']);
   assert.equal(await p.evaluate(async()=>(await import('/src/state/cut.ts')).currentCut()),'speedrun');return observed;
  }finally{await p.close();}
 });
 const selected=process.argv.find(a=>a.startsWith('--only='))?.slice(7).replace(/[^a-z0-9]/gi,'-');
 fs.writeFileSync(`${out}/probe-results${selected?'-'+selected:''}.json`,JSON.stringify({results,errors},null,2));assert(results.every(r=>r.pass));assert.deepEqual(errors,[]);
}finally{await browser.close();}
