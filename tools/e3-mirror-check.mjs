/** Focused scene regressions for the shared phone mirror. Review jumps are not reachability evidence. */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const port=Number(process.argv[2]||3115),out='out/codex-e3-mirror';fs.mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle'],defaultViewport:{width:1280,height:720,deviceScaleFactor:2}});
const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
try {
 await page.goto(`http://127.0.0.1:${port}/?reinterp=1&era=3&debug=1&descent=0&kiosk=0`,{waitUntil:'networkidle2'});
 await page.waitForFunction(()=>window.__graceQueue?.()?.mode==='signin');
 await new Promise(r=>setTimeout(r,4500));
 const data=await page.evaluate(async()=>{
  const q=window.__graceQueue(), {ledger}=await import('/src/state/ledger.ts'),{recordCount}=await import('/src/witness/record.ts');
  const c=document.createElement('canvas');c.width=676;c.height=390;const ctx=c.getContext('2d');
  const checks=[],images={},voices=[],overflows=[];let screen='';
  const assert=(v,label)=>{if(!v)throw Error(label);checks.push(label);};
  const original=q.drawLambientLane.bind(q);q.drawLambientLane=(ctx,c,line)=>{voices.push({at:Math.round(performance.now()),screen:q.mode,line});return original(ctx,c,line);};
  const fill=ctx.fillText.bind(ctx);ctx.fillText=(text,x,y,...a)=>{if(x<484&&x+ctx.measureText(text).width>484)overflows.push({screen,text,x,y,end:x+ctx.measureText(text).width});return fill(text,x,y,...a);};
  const paint=()=>q.draw(ctx,676,390);
  const shot=name=>{screen=name;paint();images[name]=c.toDataURL();};
  const press=id=>{paint();const r=q.rects.find(r=>r.id===id);assert(r,'live '+id);q.handleClick(r.x+r.w/2,r.y+r.h/2);q.phone.tick(3.1,true);paint();};
  const ppress=id=>{q.phone.draw(document.createElement('canvas').getContext('2d'),180,360);for(let i=0;i<4&&id.startsWith('photo-')&&!q.phone.hitRects.some(r=>r.id===id);i++){const n=q.phone.hitRects.find(r=>r.id==='photos-next');if(!n)break;q.phone.press(n.x+n.w/2,n.y+n.h/2);q.phone.draw(document.createElement('canvas').getContext('2d'),180,360);}const r=q.phone.hitRects.find(r=>r.id===id);assert(r,'phone live '+id);q.handlePhoneClick(r.x+r.w/2,r.y+r.h/2);paint();};
  paint();assert(q.phone.eveningClock==='18:04','arrival clock');assert(!q.rects.some(r=>r.id.startsWith('personal-')),'notice retired');shot('01-signin');
  press('mirror-min');assert(q.mirrorMin&&!q.mirrorBox,'minimise');shot('02-minimised');press('mirror-restore');assert(!q.mirrorMin&&q.mirrorBox,'restore');
  press('mirror-enlarge');assert(q.mirrorLarge,'enlarge');shot('03-enlarged');press('mirror-enlarge');
  const before=recordCount();press('mirror:evening-banner');assert(q.phone.screen==='evening'&&q.personalQuiet,'shared thread quiet');assert(recordCount()===before,'ordinary reading files nothing');shot('04-orla-thread');
  q.phoneInHand=true;paint();assert(q.phone.screen==='evening','pickup preserves thread');q.phoneInHand=false;
  ppress('back');press('signin');shot('05-consent');press('consent-decline');shot('06-consent-reply');
  press('task-0');assert(q.mode==='board'&&q.seenTask,'first task conduction stays operable');shot('07-task-conduction');press('task-0');q.phone.tick(3.1,true);assert(q.mode==='list','task opens');assert(q.phone.eveningClock==='18:31','first job clock');shot('08-job');
  // Work through the first testimony by its own verbs.
  for(let i=0;i<30&&q.current();i++)q.apply();paint();assert(q.phone.conductingNotes,'conducted notes');shot('09-conducted-notes');q.phone.tick(1.5,true);shot('10-cursor');q.phone.tick(1.6,true);assert(!q.phone.conductingNotes&&q.phone.screen==='home','notes return home');
  q.phone.debugBeat('home');ppress('notes');shot('11-notes');ppress('back');ppress('photos');shot('12-camera-roll');ppress('photo-2');shot('13-blurred-cake');ppress('back');ppress('back');
  q.backToBoard();q.update(.01);paint();assert(q.veraPage==='send','distribution opens');shot('14-distribution');press('vera-send');assert(q.phone.eveningClock==='20:12','first Send arrival');shot('15-send');press('vera-send-close');press('update-accept');assert(q.veraPage==='record'&&q.phone.bannersHidden,'record silence');shot('16-record');press('vera-record-close');assert(q.phone.eveningClock==='21:30'&&!q.phone.bannersHidden,'second mentor');shot('17-kit');
  press('vera-kit-approve');shot('18-kit-approved');press('vera-take-down');shot('19-take-down');press('vera-kit-close');
  q.phone.arm();q.phone.banner={from:'Bea',time:'21:30',text:'Malta votes to outlaw conversion practices'};shot('20-malta');ppress('evening-banner');shot('21-article');ppress('back');q.phone.advanceNews();q.phone.tick(30,true);assert(q.phone.broken,'cascade finishes');q.update(.1);shot('22-orla-photo');
  assert(q.phone.eveningClock==='22:51','last clock');
  q.phone.debugBeat('home');ppress('photos');ppress('photo-4');shot('23-orla-photo-view');
  assert(!q.rects.some(r=>r.id==='record-chip'),'chip removed');q.phone.debugBeat('home');q.mirrorReading=false;press('start-menu');shot('24-start-account');press('account-activity');assert(q.mode==='list','Start account opens');
  // Focus answers change neither phone state nor arrivals.
  q.backToBoard();q.lambPriority=false;q.focusOffered=false;q.boardQuietT=4;q.update(.01);paint();shot('25-focus');if(q.focusOpen){press('focus-later');assert(!q.focusOpen,'focus dismissal');}
  q.disconnectPhone();paint();q.drawDisconnected(ctx,676);images['26-disconnected']=c.toDataURL();assert(q.phone.disconnected&&!q.mirrorAvailable,'phone disconnected');
  const p=document.createElement('canvas');p.width=180;p.height=360;q.phone.draw(p.getContext('2d'),180,360);images['27-dark-phone']=p.toDataURL();q.update(3.1);assert(q.disconnectT>3,'disconnection closes');
  return {checks,images,voices,overflows,readMessages:[...q.phone.readMessages],checkins:ledger.checkins};
 });
 for(const [n,img]of Object.entries(data.images))fs.writeFileSync(`${out}/${n}.png`,Buffer.from(img.split(',')[1],'base64'));delete data.images;
 await page.keyboard.press('Escape');await page.waitForSelector('#reinterp-game-menu',{visible:true});data.paused=await page.evaluate(async()=> (await import('/src/state/gameMenuBus.ts')).gameMenuBus.isOpen);await page.keyboard.press('Escape');
 data.draws=await page.evaluate(async()=>{const a=[];for(let i=0;i<20;i++){await new Promise(requestAnimationFrame);a.push(window.__drawCalls);}return {min:Math.min(...a),max:Math.max(...a)};});
 data.errors=errors;fs.writeFileSync(`${out}/focused.json`,JSON.stringify(data,null,2));console.log(JSON.stringify({...data,overflows:data.overflows.length,voices:data.voices.length},null,2));
 if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close();}
