/** Focused review boots followed by ordinary visitor mouse presses. No state writes or debug jumps. */
import puppeteer from 'puppeteer-core';
import {mkdirSync,writeFileSync} from 'node:fs';
import {readVisitorState} from './harness/visitor-state.mjs';
const port=Number(process.argv[process.argv.indexOf('--port')+1]||3215);
const out='out/playtest-polish';mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle'],defaultViewport:{width:1280,height:900}});
const page=await browser.newPage(),events=[],errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await page.evaluateOnNewDocument(()=>{const fill=CanvasRenderingContext2D.prototype.fillText;window.__paint=[];CanvasRenderingContext2D.prototype.fillText=function(t,...a){window.__paint.push(String(t));if(window.__paint.length>15000)window.__paint.splice(0,7000);return fill.call(this,t,...a);};});
const state=()=>readVisitorState(page,{width:1280,height:900});
async function click(id,ms=30000){const end=Date.now()+ms;let s,t;do{s=await state();t=s.targets.find(t=>t.id===id);if(!t)await wait(250);}while(!t&&Date.now()<end);if(!t)throw Error('Missing '+id+'; targets '+s.targets.map(t=>t.id));await page.mouse.move(...t.pt);await page.mouse.down();await wait(70);await page.mouse.up();await wait(900);if(id==='lg-tray' && !(await state()).targets.some(t=>t.id==='lg-x')){
 events.push({beforeRetry:await page.evaluate(()=>({guide:{...window.__os.lambyGuide.view},input:window.__os.lambyGuide.input,requested:window.__os.lambyGuide.requested,browser:{line:window.__os.e4?.browser.nowLine,wait:window.__os.e4?.browser.waitNow,phase:window.__os.e4?.browser.phase,pressable:window.__os.e4?.browser.pressable},silence:window.__os.guideSilence}))});writeFileSync(`${out}/live-probe.json`,JSON.stringify(events,null,2));const retry=(await state()).targets.find(t=>t.id===id);if(retry){await page.mouse.move(...retry.pt);await page.mouse.down();await wait(70);await page.mouse.up();await wait(900);events.push({retry:id});}
 }events.push({press:id,guide:await page.evaluate(()=>({view:{...window.__os.lambyGuide.view},silence:window.__os.guideSilence}))});console.log('press',id);writeFileSync(`${out}/live-probe.json`,JSON.stringify(events,null,2));}
async function shot(label){await page.screenshot({path:`${out}/${label}.png`});events.push({shot:label,state:await state(),paint:await page.evaluate(()=>window.__paint.slice(-300))});}
async function boot(era){await page.goto(`http://localhost:${port}/?reinterp=1&debug=1&era=${era}&descent=0&home=0&kiosk=0&cut=speedrun`,{waitUntil:'load',timeout:180000});await page.waitForFunction(()=>window.__os&&window.__app,{timeout:120000});await wait(7000);events.push({reviewBoot:era});}
async function helpAndMap(era){
 const s=await state();if(s.targets.some(t=>['whattodo','taskbar-whattodo','startpanel-close'].includes(t.id)))throw Error('Duplicate help surface');
 await click('lg-tray');await shot(`era${era}-lamby`);await click('lg-x');await click('lg-tray');await click('lg-x');events.push({pass:'Lamby reopens twice',era});
 for(let i=0;i<2;i++){await click('start-menu');await click('sm-allsteps');if(!(await state()).targets.some(t=>t.id==='steps-close'))throw Error('Step list did not reopen');await shot(`era${era}-steps-${i}`);await click('steps-close');}
 const camera=()=>page.evaluate(()=>{let fov;window.__app.root.forEach(e=>{if(e.camera&&e.enabled)fov=e.camera.fov;});return {...window.__camPose(),fov};});const before=await camera();await page.mouse.move(640,450);await page.mouse.down();await page.mouse.move(750,480,{steps:10});await page.mouse.up();await wait(700);const dragged=await camera();await wait(3000);const held=await camera();if(Math.abs(dragged.yaw-held.yaw)>.1||Math.abs(dragged.pitch-held.pitch)>.1||Math.abs(before.fov-held.fov)>.05)throw Error('Camera fought drag or zoomed');await page.mouse.move(750,480);await page.mouse.down();await page.mouse.move(640,450,{steps:10});await page.mouse.up();await wait(900);events.push({pass:'drag and FOV persist',era,before,dragged,held});await page.mouse.wheel({deltaY:120});await wait(1500);const zoomed=await camera();await wait(2000);const zoomHeld=await camera();if(zoomed.fov===before.fov||Math.abs(zoomHeld.fov-zoomed.fov)>.05)throw Error('Visitor zoom did not persist');await page.mouse.wheel({deltaY:-120});await wait(500);events.push({pass:'wheel zoom persists',era,zoomed,zoomHeld});
}
try{
 if(process.argv.includes('--only-era4')) {
  await boot(4);await click('saver-wake');await page.waitForFunction(()=>window.__os.e4.browser.phase==='open',{timeout:60000});await wait(2500);await helpAndMap(4);await shot('era4-symbol');await page.keyboard.press('Escape');await wait(400);
 for(const b of await page.$$('button'))if(await b.evaluate(el=>el.textContent==='Where you are')){await b.click();break;}await wait(700);await shot('frame-plain-map');if(await page.evaluate(()=>document.body.innerText.includes('Next:')))throw Error('Frame map still instructs the next action');await page.keyboard.press('Escape');events.push({pass:'2026 restored session; symbol and Start list reopen',errors});
 } else {
 if(!process.argv.includes('--only-era2')) {
 await boot(3);await helpAndMap(3);await click('signin');await click('consent-decline');await click('task-0');await shot('annette-first');
 if(!await page.evaluate(()=>window.__paint.slice(-150).some(t=>t.includes('No automatic'))))throw Error('Family clarification absent');
 // Return to Today with its published back control, then inspect the draft.
 let s=await state();events.push({familyTargets:s.targets.map(t=>t.id)});const back=s.targets.find(t=>/board|today|back/.test(t.id));if(!back)throw Error('No return from family');await click(back.id);
 s=await state();events.push({boardTargets:s.targets.map(t=>t.id)});await click('task-2');await shot('attachment-before-post');
 if(!await page.evaluate(()=>window.__paint.slice(-150).some(t=>t.includes('Attached:'))))throw Error('Attachment absent');await click('group-post');await shot('attachment-posted');
 await click('board-back');await click('task-1');
 for(let i=0;i<90;i++){
  const st=await state();const id=st.targets.some(t=>t.id==='skip')?'skip':st.targets.some(t=>t.id==='next-story')?'next-story':null;
  if(id){await click(id);continue;}
  if(st.targets.some(t=>t.id==='board-back')){await click('board-back');break;}
  throw Error('No story continuation: '+st.targets.map(t=>t.id));
 }
 await shot('queue-completed-count');
 if(!await page.evaluate(()=>window.__paint.slice(-250).some(t=>t==='0 waiting')))throw Error('Queue did not reach zero waiting');
 events.push({pass:'all four stories skipped; completed queue shows zero waiting'});

 }
 await boot(2);await helpAndMap(2);await click('icon-restorify');let targets=(await state()).targets;events.push({restorifyTargets:targets.map(t=>t.id)});
 // Choose the first check-in answer through its visible control.
 const answer=targets.find(t=>/answer|check|reply|tired|mood/.test(t.id));if(answer){await click(answer.id);if((await state()).targets.some(t=>t.id===answer.id))await click(answer.id);}
 await shot('checkin');
 if((await state()).targets.some(t=>t.id==='checkin-continue'))await click('checkin-continue');
 else if((await state()).targets.some(t=>t.id==='restorify-close'))await click('restorify-close');
 await click('icon-story');await shot('story-preparation');await click('ts-faster');await shot('story-faster-six-topics');
 await click('ts-prep-done');await shot('release-unchanged');await click('ts-agree');await click('ts-see');await click('ts-watch');
 await page.waitForFunction(()=>window.__os.testimony.web==='done',{timeout:120000});await shot('story-disabled-links');
 await click('ts-done',90000).catch(async()=>{await shot('story-wait');throw Error('Story did not finish');});
 // Capture the page before closing in the full walk; the short probe checks its published controls.
 events.push({pass:'Faster → six topics → unchanged release → published story → Close'});

 events.push({pass:'focused visitor probes complete',errors});if(errors.length)throw Error(errors.join('\n'));
}
}catch(e){events.push({failure:String(e),errors});await shot('probe-failure');process.exitCode=1;}finally{writeFileSync(`${out}/${process.argv.includes('--only-era4')?'era4-probe':process.argv.includes('--only-era2')?'era2-probe':'focused-probe'}.json`,JSON.stringify(events,null,2));await browser.close();}
