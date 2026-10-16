import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const port = Number(process.argv[2] || 3221);
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--disable-background-networking'],defaultViewport:{width:400,height:225,deviceScaleFactor:1}});
const page = await browser.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(String(e))); const results=[]; fs.mkdirSync('out/lamby-guide/surfaces',{recursive:true});
async function load(era=2,extra='') {await page.goto(`http://127.0.0.1:${port}/?reinterp=1&kiosk=0&debug=1&descent=0&era=${era===1?2:era}${extra}`,{waitUntil:'load',timeout:120000});await page.waitForFunction(()=>window.__os&&window.__app,{timeout:120000});if(era===1&&!extra.includes('setup'))await page.evaluate(()=>{__os.setDesktopEra('e1',true);__os.debugJump('desktop');});}
async function tick(seconds) {await page.evaluate(s=>{for(let i=0;i<s*10;i++){__app.fire('update',.1);const o=__os,h=o.hits.find(h=>h.id==='wotd-ok');if(h)o.handleClick(h.x+h.w/2,h.y+h.h/2);}__os.draw();},seconds);}
async function press(id,surface='os') {const ok=await page.evaluate(({id,surface})=>{const o=surface==='queue'?__graceQueue():surface==='browser'?__os.e4.browser:__os;__os.draw();const h=(o.hits||o.rects).find(h=>h.id===id);if(!h)return false;o.handleClick(h.x+h.w/2,h.y+h.h/2);return true;},{id,surface});await tick(.1);return ok;}
async function state(){return page.evaluate(()=>({view:{...__os.lambyGuide.view},gates:__os.guideSilence,hits:__os.hits.map(h=>h.id),dismissals:__ledger().assistant.dismissals,records:__ledger().lamby,paint:__os.lambyGuidePaint,helper:document.getElementById('reinterp-helper')?.style.opacity,toast:__os.toast,pause:__os.pauseOpen}));}
async function check(name,fn){try{await fn();results.push({name,pass:true});console.log('PASS',name);}catch(e){results.push({name,pass:false,error:String(e),state:await state()});console.log('FAIL',name,String(e));}}
async function shot(name,surface='os'){
 for(const [width,height] of [[1280,720],[390,844]]){
  await page.setViewport({width,height,deviceScaleFactor:1});await tick(.2);await page.evaluate(()=>{document.querySelectorAll('pre').forEach(e=>{if(e.textContent.includes('GYRO / HORIZON'))e.style.display='none';});});await new Promise(r=>setTimeout(r,250));await page.screenshot({path:`out/lamby-guide/${name}-${width}x${height}.png`});
 }
 const data=await page.evaluate(surface=>{
  if(surface==='queue')return __era3Devices().workstation?.toDataURL?.()||null;
  if(__os.era==='e4')return __era3Devices().monitor?.toDataURL?.()||null;
  return __os.canvas.toDataURL();
 },surface);
 if(data)fs.writeFileSync(`out/lamby-guide/surfaces/${name}.png`,Buffer.from(data.split(',')[1],'base64'));
 await page.setViewport({width:400,height:225,deviceScaleFactor:1});
}
try{
 await check('idle escalation, dismissal count, Start nudge once, 50-frame exclusivity',async()=>{
  await load(2,'&idlescale=30');await tick(65);assert.equal((await state()).view.rung,'tip');
  assert(await press('lg-later'));assert.equal((await state()).dismissals,1);assert.equal((await state()).view.text,null);
  await tick(82);assert.equal((await state()).view.rung,'again');await press('lg-later');await tick(82);assert.equal((await state()).view.rung,'start');
  const samples=await page.evaluate(()=>{const out=[];for(let n=0;n<50;n++){if(n===20)__os.toast={text:__os.eraSkin().status,t:1};__app.fire('update',.1);out.push({balloon:__os.lambyGuide.active,helper:document.getElementById('reinterp-helper').style.opacity==='1',toast:!!__os.toast});}return out;});
  assert(samples.every(x=>Object.values(x).filter(Boolean).length<=1));await press('lg-ok');await tick(250);assert.equal((await state()).view.text,null);results.push({samples});
 });
 await check('Show me ring matches icon; Take me there opens Restorify',async()=>{
  await load(2,'&idlescale=30');await tick(65);assert(await press('lg-show'));await tick(.1);
  const r=await page.evaluate(()=>({ring:__os.lambyGuidePaint.rings[0],target:__os.hits.find(h=>h.id==='icon-restorify')}));assert(r.ring&&r.target);assert(Math.abs(r.ring.x-r.target.x)<=2);assert(Math.abs(r.ring.y-r.target.y)<=2);assert(Math.abs(r.ring.w-r.target.w)<=4);results.push({geometry:r});
  await shot('e2-pointer');assert(await press('lg-take'));assert(await page.evaluate(()=>!!__os.restorify?.open));assert.equal((await state()).dismissals,0);
 });
 await check('Rob mother record gives one immediate form offer; form silences guide',async()=>{
  await load(1);await page.evaluate(()=>{const o=__os;o.debugJump('desktop');o.fileFirstProfileTouch();o.insertKit();o.kit.open=false;o.kit.onConnect();o.web.onJoin();o.irc.debugHook();o.irc.beginEscalation();for(let i=0;i<2000&&!o.formAvailable;i++){o.irc.update(.1);if(o.irc.escAwaitingReply)o.irc.chooseReply(0);}o.toast=null;o.guideTipAt=-1;});
  // Same real record IRC.update files when Rob finishes the "i spoke with your mother" turn.
  await tick(.1);let s=await state();if(s.view.rung!=='form'){await tick(9);s=await state();}assert.equal(s.view.rung,'form');assert(await press('lg-take'));await tick(.1);assert(await page.evaluate(()=>__os.provotype?.id==='origin_intake_e1'));assert((await state()).view.hidden);assert(!(await state()).hits.some(h=>h.startsWith('lg-')));
  await page.evaluate(()=>{const p=__os.provotype;p.draw(__os.ctx);const h=p.hits.find(h=>h.id==='leave');if(h)p.handleClick(h.x+h.w/2,h.y+h.h/2);else p.exit();});await tick(1);assert.notEqual((await state()).view.rung,'form');
 });
 await check('felt Messenger and testimony playback hide tray, cue, balloon and pointer',async()=>{
  await load(2);await tick(8);await page.evaluate(()=>__os.debugJump('calebChat'));await tick(1);assert((await state()).view.hidden);assert(!(await state()).hits.some(h=>h.startsWith('lg-')));
  await load(2);await tick(8);await page.evaluate(()=>{__os.openTestimony();__os.testimony.debugBeat?.('tapes');});
  // A real playback state, exercised with the player's file/play controls below when available.
  await page.evaluate(()=>{const t=__os.testimony;t.stage='player';t.clip='daniel';t.playing=true;t.open=true;});await tick(.1);assert(await page.evaluate(()=>__os.testimony.playbackActive));assert((await state()).view.hidden);assert(!(await state()).hits.some(h=>h.startsWith('lg-')));
 });
 await check('1997 pointer skin and request-help logging',async()=>{
  await load(1);await page.evaluate(()=>{__os.debugJump('desktop');__os.fileFirstProfileTouch();__os.toast=null;});await tick(10);
  assert(await press('lg-tray'));assert(await press('lg-show'));await tick(.1);assert((await state()).paint.rings.some(r=>r.id==='icon-a'));await shot('e1-pointer');
 });
 await check('kit Done has pointer priority; IRC replyRects are real guide targets',async()=>{
  await load(1);await page.evaluate(()=>{__os.fileFirstProfileTouch();__os.insertKit();});await tick(4);await page.evaluate(()=>{const o=__os;for(const id of ['next','step:read','next']){o.draw();const h=o.kit.hits.find(h=>h.id===id);if(h)o.handleClick(h.x+h.w/2,h.y+h.h/2);}});await tick(10);
  assert(await press('lg-tray'));assert(await press('lg-show'));assert.equal((await state()).paint.rings[0]?.id,'done');
  await load(1);await page.evaluate(()=>{const o=__os;o.fileFirstProfileTouch();o.insertKit();o.kit.open=false;o.kit.onConnect();o.web.onJoin();for(let i=0;i<2000&&!o.irc.chanAwaitingReply;i++)o.irc.update(.1);o.draw();});await tick(10);
  assert(await press('lg-tray'));assert(await press('lg-show'));assert((await state()).paint.rings.some(r=>r.id==='reply:0'));assert.equal((await state()).view.act,undefined);
 });
 await check('2016 skin, consent remains the visitor’s choice',async()=>{
  await load(3);await page.evaluate(()=>__graceQueue().debugBeat('consent'));await tick(8);assert(await press('lg-tray','queue'));assert(await press('lg-show','queue'));await tick(.2);
  assert.equal((await state()).view.beat,'consent');assert.equal((await state()).view.act,undefined);await shot('e3-card','queue');
  const c=await page.evaluate(()=>({guide:__os.lambyGuide.view,paint:__graceQueue().lambyGuidePaint,rects:__graceQueue().rects}));results.push({consent:c});
 });
 await check('2026 GraceOS card',async()=>{
  await load(4);await tick(1);await page.evaluate(()=>{__os.e4.browser.wake();});await tick(15);
  // The restored browser says a one-time line until a press; use its real search tab to acknowledge it.
  await press('tab0','browser');await tick(.2);
  assert(await press('lg-tray','browser'));await shot('e4-card');assert(!await page.evaluate(()=>__graceQueue().rects.some(h=>h.id.startsWith('lg-'))));
 });
 await check('setup named order; WIP hides unset report; Start demo opens and closes',async()=>{
  await load(1,'&setup=1');await page.waitForFunction(()=>__os.setup?.open);const order=[];
  const setupPress=async id=>{const ok=await page.evaluate(id=>{const s=__os.setup;__os.draw();const h=s.hits.find(h=>h.id===id);if(!h)return false;s.handleClick(h.x+h.w/2,h.y+h.h/2);__os.draw();return true;},id);assert(ok,id);};
  const record=async()=>order.push(await page.evaluate(()=>__os.setup.step));await record();await setupPress('setup-choice-0');await record();assert.equal(order.at(-1),'wip');
  const text=await page.evaluate(()=>{const s=__os.setup,ctx=__os.ctx,fn=ctx.fillText,lines=[];ctx.fillText=function(t,...a){lines.push(t);return fn.call(this,t,...a);};__os.draw();ctx.fillText=fn;return lines.join(' ');});assert(!text.includes('[ADDRESS'));assert(!text.includes('Found a problem?'));await shot('setup-wip');
  await setupPress('setup-choice-0');await record();await setupPress('setup-choice-0');await setupPress('setup-close');await record();await setupPress('setup-sound-on');await record();await setupPress('setup-choice-0');await setupPress('setup-close');await record();await setupPress('setup-choice-0');await setupPress('setup-start');assert(await page.evaluate(()=>__os.setup.demoOpen));await shot('setup-start');await setupPress('setup-start-close');assert(!await page.evaluate(()=>__os.setup.demoOpen));await setupPress('setup-choice-0');await record();await tick(1);await setupPress('setup-close');await record();await setupPress('setup-choice-0');await record();
  assert.deepEqual(order,['greet','wip','whose','sound','look','start','note','version','advert']);results.push({setupOrder:order,allsetStage:'balloon-10 (human walker waits for the mandatory film)'});
 });
 await check('Credits first row is About; original paragraphs are visible',async()=>{
  await page.keyboard.press('Escape');await page.evaluate(async()=>{const {gameMenuBus}=await import('/src/state/gameMenuBus.ts');gameMenuBus.openCredits();});
  const labels=await page.$$eval('#reinterp-game-menu button',bs=>bs.map(b=>b.textContent));assert.equal(labels[0],'About this project');
  await shot('credits-about-row');await page.$eval('#reinterp-game-menu button',b=>b.click());assert((await page.$eval('#reinterp-game-menu',e=>e.textContent)).includes('More to be added soon.'));await shot('about-project');
 });
 fs.writeFileSync('out/lamby-guide/probe-results.json',JSON.stringify({results,errors},null,2));
 assert(results.every(r=>r.pass!==false));assert.deepEqual(errors,[]);
}finally{await browser.close();}
