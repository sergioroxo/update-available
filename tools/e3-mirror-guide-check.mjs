/** Requested guide controls on live platform rectangles; review fixtures, not a walk. */
import fs from 'node:fs';import puppeteer from 'puppeteer-core';
const port=Number(process.argv[2]||3115),out='out/codex-e3-mirror';fs.mkdirSync(out,{recursive:true});
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle']});
try{const p=await b.newPage();await p.goto(`http://localhost:${port}/?reinterp=1&era=3&debug=1&descent=0&kiosk=0`,{waitUntil:'networkidle2'});await p.waitForFunction(()=>window.__graceQueue?.());await new Promise(r=>setTimeout(r,4500));
 const result=await p.evaluate(async()=>{
  const {LambyGuide}=await import('/src/narrative/lambyGuide.ts'),{ledger}=await import('/src/state/ledger.ts'),copy=(await import('/data/strings/lambyGuide.json')).default;
  const q=window.__graceQueue(),c=document.createElement('canvas');c.width=676;c.height=390;const ctx=c.getContext('2d'),checks=[],log=[],images={};
  const ok=(v,s)=>{if(!v)throw Error(s);checks.push(s);};
  const paint=()=>q.draw(ctx,676,390);
  for(const step of ['signin','consent','work','pipeline','vera-install','vera-install-receipt','vera-kit','phone']){
   const beat=step==='vera-install-receipt'?'vera-install':step;
   q.veraPage=step==='pipeline'||step==='vera-install-receipt'?'send':step==='vera-kit'||step==='phone'?'kit':null;q.mode=step==='signin'?'signin':step==='consent'?'consent':'board';q.storyOffer=step==='vera-install';q.sendReceipt=step==='vera-install-receipt';q.kitApproved=false;q.lambPriority=false;q.lambLines=null;q.wickConducting=false;q.mirrorReading=false;q.phone.closePersonalThread();q.phoneInHand=false;q.startMap.close();q.pauseOpen=false;
   const g=new LambyGuide({log:(outcome,beat)=>log.push({seconds:performance.now()/1000,screen:step,voice:'guide',outcome,beat}),act:a=>{ok(a.startsWith('focus:'),'navigation only '+step);ok(q.focusGuideTarget(a.slice(6)),'focus live '+step);}});q.lambyGuide=g;
   const input={era:'e3',map:{current:{era:'e3',beat:{id:beat}},quiet:false},silent:false,voice:false};g.tick(0,input);g.press('lg-tray');paint();log.push({seconds:performance.now()/1000,screen:step,voice:'guide',line:g.view.text});g.press('lg-show');paint();
   const target=step==='vera-install-receipt'?'vera-send-close':copy.eras.e3[step].act.slice(6);ok(q.rects.some(r=>r.id===target),'published '+step+' '+target);ok(q.rects.some(r=>r.id==='lg-take'),'Take me there '+step);
   const before=JSON.stringify(ledger.lamby)+JSON.stringify(ledger.graceQueue)+JSON.stringify(ledger.era3Jobs),mode=q.mode,consent=q.consent;
   g.press('lg-take');ok(before===JSON.stringify(ledger.lamby)+JSON.stringify(ledger.graceQueue)+JSON.stringify(ledger.era3Jobs),'no answer filed '+step);ok(q.mode===mode&&q.consent===consent,'answer unchanged '+step);paint();images['guide-'+step]=c.toDataURL();
   g.press('lg-tray');g.press('lg-x');ok(!g.active,'dismiss '+step);
  }
  q.mode='board';q.veraPage=null;q.storyOffer=false;q.pauseShown=true;q.wotdSaid=true;q.waitSaid=true;q.focusOffered=true;
  const g=q.lambyGuide,input={era:'e3',map:{current:{era:'e3',beat:{id:'work'}},quiet:false},silent:false,voice:false};g.tick(0,input);g.press('lg-tray');q.lambSay(['Apply what fits. Skip what does not.']);g.tick(0,{...input,voice:q.guideVoice});paint();ok(g.view.hidden&&q.guideVoice,'lane has sole voice');q.update(11);ok(!q.guideVoice,'lane releases after bounded hold');g.tick(0,input);ok(!g.view.hidden,'guide resumes after lane');
  for(const flag of ['felt','respite']){g.tick(0,{...input,silent:true});ok(!g.active&&!g.press('lg-tray'),'quiet '+flag);}
  const cap=new LambyGuide({log(){},act(){}});for(const step of ['signin','consent','work','pipeline','vera-install','vera-install-receipt','vera-kit','phone']){cap.tick(500,{...input,map:{current:{era:'e3',beat:{id:step}},quiet:false}});if(cap.active)cap.press('lg-x');}ok(cap.counts.e3<=5,'unsolicited cap five');cap.press('lg-tray');ok(cap.active,'requested help uncapped');
  // The mirror's game Back is a real phone-owned control.
  q.lambyGuide=null;q.floppy.openGame();paint();const r=q.rects.find(r=>r.id==='mirror:back');ok(r,'mirror game Back published');q.handleClick(r.x+r.w/2,r.y+r.h/2);ok(!q.floppy.open,'mirror game Back works');
  return {checks,log,images};
 });for(const[n,u]of Object.entries(result.images))fs.writeFileSync(`${out}/${n}.png`,Buffer.from(u.split(',')[1],'base64'));delete result.images;fs.writeFileSync(`${out}/guide-check.json`,JSON.stringify(result,null,2));console.log(`${result.checks.length} guide checks passed`);
 await p.reload({waitUntil:'networkidle2'});await p.waitForFunction(()=>window.__graceQueue?.()?.mode==='signin');await new Promise(r=>setTimeout(r,4500));
 for(const id of ['lg-tray','lg-show','lg-take']){await p.waitForFunction(id=>{const o=window.__os;return !o.guideSilence.silent&&!o.guideSilence.voice&&window.__graceQueue().rects.some(r=>r.id===id);},{timeout:20000},id);await p.evaluate(id=>{const q=window.__graceQueue(),r=q.rects.find(r=>r.id===id);if(!r)throw Error('engine guide missing '+id);q.handleClick(r.x+r.w/2,r.y+r.h/2);},id);await new Promise(r=>setTimeout(r,150));}
 await new Promise(r=>setTimeout(r,2000));const engine=await p.evaluate(()=>({mode:window.__graceQueue().mode,target:window.__graceQueue().guideFocus?.id,pose:window.__camPose()}));
 if(engine.mode!=='signin'||engine.target!=='signin')throw Error('real engine focus did not preserve sign-in');
 await p.screenshot({path:out+'/guide-real-engine.png'});fs.writeFileSync(out+'/guide-real-engine.json',JSON.stringify(engine,null,2));console.log('Real engine Take me there focuses sign-in without pressing it.');
}finally{await b.close();}
