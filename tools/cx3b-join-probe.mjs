/** Targeted regression probe: real DesktopOS routing after a review setup; not an entrance walk. */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const port=Number(process.argv[process.argv.indexOf('--port')+1])||3217;
const out=path.resolve('out/cx3b-decisions/join-fix');fs.mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--no-sandbox'],defaultViewport:{width:1100,height:780}});
try {
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(`http://localhost:${port}/?reinterp=1&debug=1&descent=0&home=0&kiosk=0`,{waitUntil:'networkidle2'});
 await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Log in')&&!b.disabled));
 await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Log in')&&!b.disabled).click());
 await page.waitForFunction(()=>window.__os);
 const result=await page.evaluate(async()=>{
  const os=window.__os,{ledger}=await import('/src/state/ledger.ts');
  os.debugJump('desktop');os.setup=null;os.toast=null;os.pauseOpen=null;os.wotdOpen=null;os.kit=null;
  os.insertKit();os.minimiseWindow('kit');os.kit.onConnect();os.draw();
  const press=(r)=>{if(!r)throw new Error('Missing live control');os.handleClick(r.x+r.w/2,r.y+r.h/2);os.draw()};
  const join=os.web.hits.find(h=>h.id==='web-join'),banner=os.web.hits.find(h=>h.id==='web-fitin');
  const texts=[];const fill=os.ctx.fillText.bind(os.ctx);os.ctx.fillText=(text,x,y,...rest)=>{if(String(text).includes('#stillstruggling')){const p=os.ctx.getTransform().transformPoint({x,y});texts.push({x:p.x/(os.canvas.width/512),y:p.y/(os.canvas.width/512)})}fill(text,x,y,...rest)};
  os.draw();os.ctx.fillText=fill;
  const geometry=texts.some(p=>p.x>=join.x&&p.x<=join.x+join.w&&p.y>=join.y&&p.y<=join.y+join.h)&&join.y+join.h<banner.y;
  os.pauseOpen='e1';os.draw();const covered=os.web.hits.length===0;
  press(os.hits.find(h=>h.id==='pause-close'));const pauseClosed=!os.pauseOpen;
  press(os.web.hits.find(h=>h.id==='web-close'));const closeWorks=!os.web.open;
  os.restoreWindow('web');os.draw();press(os.web.hits.find(h=>h.id==='web-join'));
  const joined=!!os.irc?.open&&!os.web.open&&ledger.records.includes('channel-joined');
  os.minimiseWindow('irc');os.restoreWindow('web');os.draw();press(os.web.hits.find(h=>h.id==='web-join'));const rejoined=!!os.irc?.open;
  os.minimiseWindow('irc');os.restoreWindow('web');os.draw();const dirty=[];for(let i=0;i<24;i++)dirty.push(os.web.update(.5));const settled=dirty.slice(-12).every(v=>!v);
  os.minimiseWindow('web');ledger.records.push('rob-spoke-mother');os.irc.onEscalationDone();os.draw();
  const formIcon=os.hits.find(h=>h.id==='icon-provotype-intake');press(formIcon);
  const controls=[];
  for(let i=0;i<250&&os.provotype;i++){
   os.provotype.update(.5);os.draw();const app=os.provotype;
   const hit=app.hits.find(h=>h.id.startsWith('choice:'))??app.hits.find(h=>h.id==='primary');
   if(hit){controls.push(hit.id);press(hit)}
  }
  const completed=ledger.provotypes.some(p=>p.id==='origin_intake_e1'&&p.outcome==='completed');
  const packetReleased=!!os.packet&&!os.packetAfterForm;
  return {geometry,join,banner,covered,pauseClosed,closeWorks,joined,rejoined,settled,dirty,formIcon:!!formIcon,completed,packetReleased,controls};
 });
 assert(result.geometry&&result.covered&&result.pauseClosed&&result.closeWorks&&result.joined&&result.rejoined&&result.settled&&result.formIcon&&result.completed&&result.packetReleased,JSON.stringify(result));
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'probe.json'),JSON.stringify({...result,errors},null,2));
 await page.evaluate(()=>{const os=window.__os;os.packet=null;os.provotype=null;os.restoreWindow('web');os.draw()});
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=768;c.height=576;c.getContext('2d').drawImage(window.__os.canvas,0,0,768,576);return c.toDataURL()});
 fs.writeFileSync(path.join(out,'netpilot.png'),Buffer.from(png.split(',')[1],'base64'));
 console.log('Join regression PASS: pause publishes no covered controls; Close and Join route through DesktopOS; channel reopens; banner settles; normal guided form completes and releases packet.');
} finally {await browser.close()}
