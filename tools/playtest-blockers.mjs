/** Focused mouse-only browser probes. Run with --case <name> --port 3214.
 * Review state is read only; setup via an era URL is declared in the result.
 */
import puppeteer from 'puppeteer-core';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {readVisitorState} from './harness/visitor-state.mjs';
const arg=(n,d)=>{const i=process.argv.indexOf('--'+n);return i<0?d:process.argv[i+1];};
const name=arg('case','void');const port=arg('port','3214');
const out='out/playtest-blockers';mkdirSync(out,{recursive:true});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle'],defaultViewport:{width:1280,height:900}});
const page=await browser.newPage();const events=[];const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.evaluateOnNewDocument(()=>{window.__probeTexts=[];const fill=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.__probeTexts.push(String(text));if(window.__probeTexts.length>10000)window.__probeTexts.splice(0,5000);return fill.call(this,text,...args);};});
const probe=()=>readVisitorState(page,{width:1280,height:900});
async function shot(label){await page.screenshot({path:`${out}/${name}-${label}.png`});events.push({label,state:await probe()});}
async function click(id,timeout=60000){
 await page.waitForFunction(()=>!window.__os.programSplash,{timeout:60000});
 await wait(600);
 const end=Date.now()+timeout;let state,target;
 do{state=await probe();target=state.targets.find(t=>t.id===id);if(!target)await wait(400);}while(!target&&Date.now()<end);
 if(!target)throw Error(`No visible ${id}; live: ${state.targets.map(t=>t.id)}`);
 await page.mouse.move(...target.pt);await page.mouse.down();await wait(70);await page.mouse.up();await wait(1400);
 const after=await probe();
 if(!id.startsWith('lex-') && after.screenHash===state.screenHash && after.targets.some(t=>t.id===id)) {
   const retry=after.targets.find(t=>t.id===id);await page.mouse.move(...retry.pt);await page.mouse.down();await wait(70);await page.mouse.up();await wait(1400);
 }
 events.push({press:id}); console.log('press',id);
}
try {
 await page.goto(`http://localhost:${port}/?reinterp=1&debug=1&${name==='windows'?'home=0':name.startsWith('ending')?'close=1':name==='debug'?'':`era=${name==='file'?3:2}`}&descent=0&kiosk=0&cut=speedrun`,{waitUntil:'load',timeout:180000});
 if(name==='windows') {
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>/Log in/.test(b.textContent)&&!b.disabled),{timeout:60000});
  for(const b of await page.$$('button'))if(await b.evaluate(b=>/Log in/.test(b.textContent)&&!b.disabled)){await b.click();break;}
 }
 await page.waitForFunction(()=>window.__os&&window.__app,{timeout:120000});await wait(7000);
 if(name==='ending') {
  let panelChecked=false;
  const panelPoint=()=>page.evaluate(()=>{
    const app=window.__app;let cam;app.root.forEach(e=>{if(e.camera&&e.enabled)cam=e;});
    const p=window.__closePanels().find(p=>p.era===1);if(!p)return null;
    const world=p.face<0?p.button:p;if(!world)return null;
    const V=app.root.getPosition().constructor,eye=cam.getPosition(),f=cam.forward;
    const dx=world.x-eye.x,dy=world.y-eye.y,dz=world.z-eye.z;
    const yaw=(Math.atan2(-dx,-dz)-Math.atan2(-f.x,-f.z))*180/Math.PI;
    const pitch=(Math.atan2(dy,Math.hypot(dx,dz))-Math.atan2(f.y,Math.hypot(f.x,f.z)))*180/Math.PI;
    const q=cam.camera.worldToScreen(new V(world.x,world.y,world.z));
    return {face:p.face,hidden:p.hidden,pt:[q.x,q.y],front:q.z>0,yaw:((yaw+540)%360)-180,pitch};
  });
  const pressPoint=async pt=>{await page.mouse.move(...pt);await page.mouse.down();await wait(70);await page.mouse.up();await wait(160);};
  const end=Date.now()+240000;
  while(!await page.evaluate(()=>window.__closeMonitor?.endingShowing)) {
    if(Date.now()>end)throw Error('Close did not present its Restart card');
    if(!panelChecked&&await page.evaluate(()=>window.__app.root.findByName('point-cloud')?.enabled&&!window.__camPose().driven&&!window.__closeMonitor?.on)) {
      let p=await panelPoint();
      if(p&&!p.hidden) {
        const yaw=Math.round(p.yaw/6),pitch=Math.round(p.pitch/5);
        for(let i=0;i<Math.abs(yaw);i++)await page.keyboard.press(yaw>0?'ArrowLeft':'ArrowRight');
        for(let i=0;i<Math.abs(pitch);i++)await page.keyboard.press(pitch>0?'ArrowUp':'ArrowDown');
        await wait(100);p=await panelPoint();
        await page.evaluate(()=>{window.__probeTexts=[];});await pressPoint(p.pt);
        if((await panelPoint()).face>=0) {
          for(let i=0;i<30;i++) {
            if(await page.evaluate(()=>window.__probeTexts.some(t=>t.includes('About this project')))) {await shot('about-on-1997-panel');panelChecked=true;events.push({pass:'About is inside the paged era-1 dossier panel'});break;}
            await page.evaluate(()=>{window.__probeTexts=[];});p=await panelPoint();await pressPoint(p.pt);
          }
        }
      }
    }
    const card=await page.evaluate(()=>window.__closeCard?.on);
    if(card){await page.mouse.click(640,630);await wait(900);}else await wait(500);
  }
  if(!panelChecked)throw Error('About never appeared in the 1997 panel dossier');
  await shot('restart-card');await click('close-lexicon');await shot('lexicon');
  for(const id of ['lex-words','lex-reasons','lex-yours','lex-sources']) {await click(id);await shot(id);}
  let pages=1;
  while((await probe()).targets.some(t=>t.id==='lex-next')) {await click('lex-next');pages++;if(pages>40)throw Error('Sources never end');}
  await shot('sources-last-page');if(pages<2)throw Error('Sources did not page');
  await click('lex-close');await click('close-receipt');await click('close-back',60000);await click('close-dossier');
  await wait(400);await shot('about-in-era1-dossier');
  const result=await page.$eval('#reinterp-game-menu',e=>({text:e.textContent,overflow:[...e.querySelectorAll('*')].some(n=>n.scrollWidth>n.clientWidth+2)}));
  if(!result.text.includes('About this project'))throw Error('About missing from end dossier');
  if(result.overflow)throw Error('End dossier overflows horizontally');
  events.push({pass:'retro card, receipt, four Lexicon tabs, Sources paging, About in end dossier',pages});

 } else if(name==='ending-controls') {
  const waitForCard=async()=>{
   const end=Date.now()+240000;
   while(!await page.evaluate(()=>window.__closeMonitor?.endingShowing)) {
    if(Date.now()>end)throw Error('Restart card did not arrive');
    if(await page.evaluate(()=>window.__closeCard?.on))await page.mouse.click(640,630);
    await wait(900);
   }
  };
  await waitForCard();await click('close-era-e2');await wait(4000);
  const back=await page.evaluate(()=>({era:window.__os.desktopEra,close:window.__closeMonitor.on,pose:window.__camPose()}));
  if(back.era!=='e2'||back.close)throw Error('Go back to a room failed: '+JSON.stringify(back));
  await shot('returned-to-2003');events.push({pass:'Restart card returns to the selected room',...back});
  await page.goto(`http://localhost:${port}/?reinterp=1&debug=1&close=1&descent=0&kiosk=0&cut=speedrun`,{waitUntil:'load',timeout:180000});
  await page.waitForFunction(()=>window.__os&&window.__app,{timeout:120000});
  await waitForCard();await click('close-again');await wait(4000);
  const again=await page.evaluate(()=>({era:window.__os.desktopEra,close:window.__closeMonitor.on,records:window.__ledger().records,reached:window.__ledger().reachedEras}));
  if(again.close||again.era!=='e1'||again.records.length||again.reached.join()!=='e1')throw Error('Start again failed to reset: '+JSON.stringify(again));
  await shot('start-again');events.push({pass:'Start again resets to 1997 with a fresh memory ledger',...again});
 } else if(name==='debug') {
  await page.keyboard.press('Backquote');await wait(300);
  const clickPanel=async label=>{const b=await page.$(`button[data-base-label="${label}"]`);if(!b)throw Error('Debug button missing: '+label);const toggle=(await b.evaluateHandle(b=>b.closest('section').firstElementChild)).asElement();if(await toggle.evaluate(b=>b.getAttribute('aria-expanded')==='false'))await toggle.click();await b.click();await wait(1400);};
  for(const [label,era,x] of [['E3 2016 · Room 2 (lesbian)','e3',-4.4],['E4 now · Room 3 (trans)','e4',4.4],['E2 2003 · Room 1 adult','e2',0]]) {
    await clickPanel(label);
    const actual=await page.evaluate(()=>({era:window.__os.desktopEra,pose:window.__camPose(),entrance:!!document.getElementById('restore-entrance')}));
    if(actual.era!==era||Math.abs(actual.pose.x-x)>.02||actual.pose.driven||actual.entrance)throw Error('Debug era failed: '+JSON.stringify(actual));
    await shot('era-'+era);events.push({pass:label,...actual});
  }
  for(const label of ['1 · the browser — six tabs on the monitor','S2R.3 · Caleb — chat opens']) {
    const b=await page.$(`button[data-base-label="${label}"]`);
    if(!b)throw Error('Beat button missing: '+label);await clickPanel(label);
    const era=label.startsWith('1')?'e4':'e2';
    if(await page.evaluate(()=>window.__os.desktopEra)!==era)throw Error('Beat did not bring its room');
    await shot('beat-'+(label.startsWith('1')?'browser':'caleb'));
  }
 } else if(name==='windows') {
  for(const pattern of [/^picon:/,/^pchip:/,/^pchip:/,/^pchip:/,/^pgoal:/]) {
    const end=Date.now()+30000;let id;
    do{const st=await probe();id=st.targets.find(t=>pattern.test(t.id)&&!events.some(e=>e.press===t.id))?.id;if(!id)await wait(400);}while(!id&&Date.now()<end);
    if(!id)throw Error('Profile did not offer '+pattern);await click(id);
  }
  await click('r-enter');
  if((await probe()).targets.some(t=>t.id==='startpanel-close'))await click('startpanel-close');
  await click('icon-a');
  const order=['next','step:read','done','step:pray','play','amen','step:pledge','pledge-notnow','step:connect','connect','setup-next'];
  const end=Date.now()+180000;
  while(!await page.evaluate(()=>window.__os.web?.open)) {
    if(Date.now()>end)throw Error('Connection did not reach the browser');
    const state=await probe();const id=order.find(id=>state.targets.some(t=>t.id===id));
    if(id)await click(id);else await wait(400);
  }
  await shot('netpoint-open');await click('web-close');
  if(await page.evaluate(()=>window.__os.web.open))throw Error('Netpoint X did not close');
  await shot('netpoint-closed');await click('taskbar-web');await click('web-join');
  await click('irc-close');if(await page.evaluate(()=>window.__os.irc.open))throw Error('IRC X did not close');
  await shot('irc-closed');await click('taskbar-irc');
  await click('reply:0');
  await click('irc-request-close',120000);
  if(await page.evaluate(()=>window.__os.irc.open))throw Error('Pending request X did not close IRC');
  await shot('request-closed');await click('taskbar-irc');
  await click('dm-accept');await shot('request-resumed');
  events.push({pass:'Netpoint, IRC and pending request X close; pending narrative resumes'});
 } else if(name==='file') {
  await page.keyboard.press('Escape');await wait(400);
  const copy=JSON.parse(readFileSync('data/strings/gameMenu.json','utf8'));
  const button=await page.$$('button');
  for(const b of button)if((await b.evaluate(b=>b.textContent))===copy.yourFile){await b.click();break;}
  await wait(400);await shot('visited-only');
  const text=await page.$eval('#reinterp-game-menu',e=>e.textContent);
  if(text.includes(copy.yourFileEras.e4))throw Error('Your file exposed an unvisited 2026 era');
  events.push({pass:'Your file omits unvisited 2026',text});
 } else {
 await click('startpanel-close');await click('icon-restorify');await click('checkin:steady');await click('checkin-continue');
 await click('icon-story');await click('ts-prep-done');await click('ts-agree');await click('ts-see');await click('ts-watch');
 // The story's film runs to its own end; close only when its Done appears.
 await click('ts-done',180000);await click('icon-send');await click('send-go');
 await wait(20000);await shot('send-moving');
 // A visitor can drag while travelling. This must leave a safe seat, never an in-between position.
 await page.mouse.move(950,700);await page.mouse.down();await page.mouse.move(1000,710,{steps:5});await page.mouse.up();
 await wait(1000);await shot('after-drag');
 await page.waitForFunction(()=>!window.__camPose().driven,{timeout:120000});
 await shot('landed');
 const pose=await page.evaluate(()=>window.__camPose());
 events.push({assertion:'landed at a room seat',pass:Math.min(...[0,-4.4,4.4].map(x=>Math.hypot(pose.x-x,pose.y-1.16,pose.z-0.7)))<0.12,pose});
 if(!events.at(-1).pass)throw Error('Camera stranded between room seats');
 if((await probe()).targets.some(t=>t.id==='pause-close'))await click('pause-close');
 await click('icon-messenger',120000);await shot('message-open');
 if(name==='caleb') {
  await click('chip:its-me',120000);await click('chip:try-not-to',120000);await click('chip:come',120000);
  await click('attachment',120000);await click('mp-close');await click('chip:want-you-too',120000);
  await page.waitForFunction(()=>window.__os.accountability?.alertRunning,{timeout:30000});
  await wait(5000);await shot('one-alert');
  const alert=await page.evaluate(()=>({running:window.__os.accountability.alertRunning,stamp:window.__os.accountability.stampVisible}));
  events.push({assertion:'one alert layer',...alert});
  await click('alert-dismiss');
  await page.waitForFunction(()=>!window.__os.caleb.blackingOut,{timeout:20000});
  await shot('readable-after-dismiss');
  const restored=await page.evaluate(()=>({redacted:window.__os.caleb.redaction.blackedRows,stamp:window.__os.accountability.stampVisible}));
  if(restored.redacted||restored.stamp)throw Error('Dismissal left the chat redacted');
  events.push({pass:'chat readable after alert dismissal',...restored});
 }

 }
} catch(e){await shot('failure');events.push({failure:String(e)});process.exitCode=1;} finally{writeFileSync(`${out}/${name}.json`,JSON.stringify({events,errors},null,2));await browser.close();}
