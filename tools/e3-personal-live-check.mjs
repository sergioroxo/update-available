/** Scene-level pause, restart, and GPU draw-call evidence for Brief 8. */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const out='out/codex-e3-message/live';fs.mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle'],defaultViewport:{width:1280,height:720,deviceScaleFactor:2}});
try {
 const page=await browser.newPage(), data={};
 await page.goto('http://127.0.0.1:3114/?reinterp=1&era=3&debug=1&descent=0&kiosk=0',{waitUntil:'networkidle2'});
 await page.waitForFunction(()=>window.__graceQueue?.()?.personalNotice);
 const sample=()=>page.evaluate(async()=>{const n=[];for(let i=0;i<30;i++){await new Promise(requestAnimationFrame);n.push(window.__drawCalls);}return {min:Math.min(...n),max:Math.max(...n)};});
 data.notice=await sample();
 await page.screenshot({path:out+'/notice-seat.png'});
 await page.keyboard.press('Escape');
 await page.waitForSelector('#reinterp-game-menu',{visible:true});
 data.pause=await page.evaluate(async()=>({paused:(await import('/src/state/gameMenuBus.ts')).gameMenuBus.isOpen,notice:window.__graceQueue().personalNotice}));
 await page.keyboard.press('Escape');
 data.resume=await page.evaluate(async()=>({paused:(await import('/src/state/gameMenuBus.ts')).gameMenuBus.isOpen,notice:window.__graceQueue().personalNotice}));
 const press=id=>page.evaluate(id=>{const q=window.__graceQueue(),r=q.rects.find(r=>r.id===id);if(!r)throw Error('missing '+id);q.handleClick(r.x+r.w/2,r.y+r.h/2);},id);
 await press('personal-open'); await new Promise(r=>setTimeout(r,200)); data.thread=await sample();
 await page.screenshot({path:out+'/thread-seat.png'});
 await page.keyboard.press('Escape');
 data.threadPause=await page.evaluate(async()=>({paused:(await import('/src/state/gameMenuBus.ts')).gameMenuBus.isOpen,open:window.__graceQueue().phone.personalOpen}));
 await page.keyboard.press('Escape');
 await press('personal-back'); await new Promise(r=>setTimeout(r,200)); data.dismissed=await sample();
 // A regular E3→E4 ritual, initiated through the existing review entry point.
 await page.evaluate(()=>window.__os.debugJump('update4'));
 data.transition={min:Infinity,max:0};
 for(let i=0;i<130;i++){
  const s=await page.evaluate(()=>{const os=window.__os,u=os.updateApp,r=u?.hits?.find(r=>['update-now','eula-readon','eula-agree'].includes(r.id));if(r)u.handleClick(r.x+r.w/2,r.y+r.h/2);return {era:os.era,phase:u?.phase,ids:u?.hits?.map(r=>r.id),draws:window.__drawCalls};});
  data.transition.min=Math.min(data.transition.min,s.draws);data.transition.max=Math.max(data.transition.max,s.draws);data.transition.last=s;
  if(s.era==='e4' && i>30)break;
  await new Promise(r=>setTimeout(r,250));
 }
 await page.screenshot({path:out+'/transition.png'});
 // Restart through the frame's real DOM controls.
 await page.keyboard.press('Escape');
 const choose=async key=>{const text=JSON.parse(fs.readFileSync('data/strings/gameMenu.json','utf8'))[key]; const buttons=await page.$$('#reinterp-game-menu button');for(const b of buttons){if((await b.evaluate(el=>el.textContent))===text){await b.click();return;}}throw Error('missing menu '+key+' '+text);};
 await choose('restart');
 await Promise.all([page.waitForNavigation({waitUntil:'networkidle2'}),choose('restartConfirmYes')]);
 await new Promise(r=>setTimeout(r,2000));
 await page.waitForFunction(()=>window.__os);
 data.restart={url:page.url(),oldPhoneGone:await page.evaluate(()=>!window.__graceQueue?.()?.phone?.personalSeen)};
 fs.writeFileSync(out+'/measurements.json',JSON.stringify(data,null,2));
 if(!data.threadPause.paused||!data.threadPause.open)throw Error('thread pause regression');
 if(!data.pause.paused||!data.pause.notice||data.resume.paused||!data.resume.notice||!data.restart.oldPhoneGone)throw Error('pause/restart regression');
 data.smoke=[];
 for(const query of ['?debug=1','?reinterp=1&flat=1&debug=1&home=0']) {
  const smoke=await browser.newPage(),errors=[]; smoke.on('pageerror',e=>errors.push(String(e)));
  await smoke.goto('http://127.0.0.1:3114/'+query,{waitUntil:'networkidle2'});
  await smoke.waitForFunction(()=>[...document.querySelectorAll('canvas')].some(c=>c.width>0&&c.height>0));
  if(errors.length)throw Error(errors.join('\n'));
  data.smoke.push({query,errors}); await smoke.close();
 }
 fs.writeFileSync(out+'/measurements.json',JSON.stringify(data,null,2));console.log(JSON.stringify(data,null,2));
} finally {await browser.close();}
