/** Real room, menu, device and transition checks; all review jumps are explicitly marked. */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const port=Number(process.argv[2]||3115),out='out/codex-e3-mirror/scene';fs.mkdirSync(out,{recursive:true});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle'],defaultViewport:{width:1280,height:720,deviceScaleFactor:2}});
const data={checks:[],errors:[]},assert=(v,s)=>{if(!v)throw Error(s);data.checks.push(s);};
async function fresh(query='?reinterp=1&era=3&debug=1&descent=0&kiosk=0'){
 const p=await browser.newPage();p.on('pageerror',e=>data.errors.push(String(e)));
 await p.goto(`http://127.0.0.1:${port}/${query}`,{waitUntil:'networkidle2'});await p.waitForFunction(()=>window.__os);return p;
}
try{
 const p=await fresh();await wait(4500);
 data.seat=await p.evaluate(()=>{
  const a=window.__app,c=a.root.findByName('camera'),e=a.root.findByName('era3-device-workstation'),V=a.root.getPosition().constructor,m=e.getWorldTransform();
  const corners=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]].map(([x,z])=>c.camera.worldToScreen(m.transformPoint(new V(x,0,z)))).map(v=>({x:v.x,y:v.y,z:v.z}));
  const dist=c.getPosition().distance(e.getPosition()),worldH=Math.hypot(m.data[8],m.data[9],m.data[10]),angle=2*Math.atan(worldH/2/dist)*180/Math.PI;
  return {pose:window.__camPose(),fov:c.camera.fov,corners,monitorDegrees:angle,platformFont11Degrees:11/390*angle,mirrorFont11Degrees:11/390*angle*(331/360),draws:window.__drawCalls};
 });
 assert(data.seat.corners.every(v=>v.z>0&&v.x>=0&&v.x<=1280&&v.y>=0&&v.y<=720),'whole monitor in the authored seat view');
 await p.screenshot({path:out+'/01-seat.png'});
 // Actual ray-resolved pickup of the physical phone with a banner on it.
 const point=await p.evaluate(()=>{const a=window.__app,c=a.root.findByName('camera'),e=a.root.findByName('era3-device-phone'),s=c.camera.worldToScreen(e.getPosition());return {x:s.x,y:s.y};});
 await p.mouse.move(point.x,point.y);await p.mouse.down();await wait(80);await p.mouse.up();await wait(1000);
 data.pickup=await p.evaluate(()=>({held:window.__graceQueue().phoneInHand,banner:window.__graceQueue().phone.banner?.text,mirror:window.__graceQueue().mirrorAvailable}));
 assert(data.pickup.held&&data.pickup.mirror,'physical phone pickup keeps the mirror');await p.screenshot({path:out+'/02-pickup.png'});
 await p.keyboard.press('Escape');await p.waitForSelector('#reinterp-game-menu',{visible:true});
 const before=await p.evaluate(()=>({version:window.__graceQueue().phone.version,clock:window.__graceQueue().phone.eveningClock}));await wait(3400);
 const after=await p.evaluate(()=>({version:window.__graceQueue().phone.version,clock:window.__graceQueue().phone.eveningClock}));assert(JSON.stringify(before)===JSON.stringify(after),'menu pause holds phone state');
 await p.keyboard.press('Escape');
 // Start a real ritual from its documented review jump, then use its published controls.
 await p.evaluate(()=>window.__os.debugJump('update4'));data.transition={min:Infinity,max:0};
 let disconnectSeen=false;
 for(let i=0;i<180;i++){
  const s=await p.evaluate(()=>{const o=window.__os,u=o.updateApp,r=u?.hits?.find(r=>['update-now','eula-readon','eula-agree'].includes(r.id));if(r)u.handleClick(r.x+r.w/2,r.y+r.h/2);const q=window.__graceQueue();return {era:o.era,phase:u?.phase,disconnected:q?.phone.disconnected,notice:q?.disconnectT>=0&&q?.disconnectT<=3,draws:window.__drawCalls};});
  data.transition.min=Math.min(data.transition.min,s.draws);data.transition.max=Math.max(data.transition.max,s.draws);data.transition.last=s;
  if(s.notice&&!disconnectSeen){disconnectSeen=true;await p.screenshot({path:out+'/03-disconnection.png'});}
  if(s.era==='e4'&&i>30)break;await wait(250);
 }
 assert(data.transition.last.era==='e4','regular install reaches Era 4');assert(disconnectSeen,'disconnection notice was visible during install');
 assert(await p.evaluate(()=>window.__graceQueue().phone.disconnected),'phone stays disconnected in Era 4');await p.screenshot({path:out+'/04-e4.png'});
 const choose=async key=>{const text=JSON.parse(fs.readFileSync('data/strings/gameMenu.json','utf8'))[key];for(const b of await p.$$('#reinterp-game-menu button')){if(await b.evaluate((e,text)=>e.textContent===text,text)){await b.click();return;}}throw Error('missing menu '+key);};
 await p.keyboard.press('Escape');await p.waitForSelector('#reinterp-game-menu',{visible:true});await choose('restart');await Promise.all([p.waitForNavigation({waitUntil:'networkidle2'}),choose('restartConfirmYes')]);await p.waitForFunction(()=>window.__os);
 assert(await p.evaluate(()=>!window.__graceQueue?.()?.phone?.personalSeen),'restart clears private read state');
 await p.keyboard.press('Escape');await p.waitForSelector('#reinterp-game-menu',{visible:true});await choose('leave');await p.waitForSelector('#reinterp-leave-page',{visible:true});
 const goneText=JSON.parse(fs.readFileSync('data/strings/leavePage.json','utf8')).leaveForGood;
 for(const b of await p.$$('#reinterp-leave-page button'))if(await b.evaluate((e,t)=>e.textContent===t,goneText)){await b.click();break;}
 await wait(400);
 data.exit=await p.evaluate(()=>({left:window.__os.hasLeft,off:window.__os.isOff}));assert(data.exit.left||data.exit.off,'frame Leave exits');await p.close();
 for(const query of ['?debug=1','?reinterp=1&flat=1&debug=1&home=0']){const s=await fresh(query);assert(await s.evaluate(()=>[...document.querySelectorAll('canvas')].some(c=>c.width>0&&c.height>0)),query+' renders');await s.close();}
 assert(!data.errors.length,'no browser exceptions');fs.writeFileSync(out+'/results.json',JSON.stringify(data,null,2));console.log(JSON.stringify(data,null,2));
}finally{fs.writeFileSync(out+'/partial.json',JSON.stringify(data,null,2));await browser.close();}
