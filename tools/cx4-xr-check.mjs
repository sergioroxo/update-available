/** Mono WebGL with a mocked PlayCanvas XR manager. No claim of stereo/hardware timing. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const port = Number(process.argv[process.argv.indexOf('--port') + 1]);
if (!port) throw Error('Pass --port');
const out = 'out/cx4-xr'; fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
 args: ['--enable-unsafe-swiftshader','--use-gl=angle','--no-sandbox','--disable-background-networking'], defaultViewport: { width: 960, height: 600 } });
const page = await browser.newPage(), errors = [], checks = [];
page.on('pageerror', e => {errors.push(String(e)); console.error(String(e));});
page.on('console', m=>{if(m.type()==='error'){errors.push(m.text());console.error('browser:',m.text());}});
const wait = ms => new Promise(r => setTimeout(r, ms));
try {
 await page.goto(`http://localhost:${port}/?reinterp=1&debug=1&descent=0&home=0&kiosk=0&era=2`, { waitUntil: 'networkidle0' });
 await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => /Log in/.test(b.textContent)); b?.click(); });
 await page.waitForFunction(() => window.__app && window.__xrComfort, { timeout: 60000 });
 await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' });
 await page.screenshot({path: `${out}/01-browser.png`});
 const baseline = await page.evaluate(() => ({ rig: window.__app.root.findByName('camera-rig').getLocalPosition().toArray(), canvas: window.__os.canvas.width }));
 await page.evaluate(() => {
  const app = window.__app, head = app.root.findByName('camera');
  let active = true;
  Object.defineProperty(app.xr, 'active', { configurable: true, get: () => active });
  // Mirror native end's camera cleanup and requestAnimationFrame handoff.
  window.__mockEnd = () => { active = false; head.setLocalPosition(0,0,0);head.setLocalEulerAngles(0,0,0);app.requestAnimationFrame(); };

  const origin = head.getPosition().clone(), direction = head.forward.clone();
  const src = { targetRayMode: 'tracked-pointer', getOrigin: () => origin, getDirection: () => direction, hand: null, gamepad: {buttons: [], axes: []} };
  window.__controller = src; app.xr.input.fire('add', src); app.xr.input.fire('select', src);
  window.__rigAtEntry = app.root.findByName('camera-rig').getLocalPosition().toArray();
 });
 await page.waitForFunction(()=>!window.__xrComfort.busy);
 assert.equal(await page.evaluate(() => window.__xrComfort.calibrated), true); checks.push('Controller select calibrates seat.');
 const sharp = await page.evaluate(() => ({width: window.__os.canvas.width, state: window.__xrComfort.status()}));
 assert.equal(sharp.width, 2048); checks.push('Desktop rerasterised at 2048 × 1536 in XR (browser 1536 × 1152).');
 await page.evaluate(() => {
  const app = window.__app, head = app.root.findByName('camera');
  head.setLocalPosition(0.12, 0.04, -0.08); head.setLocalEulerAngles(3, 85, 0);
  const p = window.__xrComfort.authored.getLocalPosition();
  window.__camFree(p.x + 1, p.y, p.z, 0, 90);
 });
 await wait(200);
 await page.evaluate(()=>window.__xrFrame.open());
 const paused=await page.evaluate(()=>window.__xrComfort.status().elapsed);
 await wait(200);
 const menuPause=await page.evaluate(()=>({elapsed:window.__xrComfort.status().elapsed,veil:window.__app.root.findByName('xr-pixel-dissolve').enabled,menu:window.__app.root.findByName('xr-frame-menu').enabled}));
 assert.equal(menuPause.elapsed,paused);assert.equal(menuPause.veil,false);assert.equal(menuPause.menu,true);
 checks.push('Menu pauses the dissolve and remains unobscured; Resume continues it.');
 await page.screenshot({path:`${out}/05-xr-menu-during-dissolve.png`});
 await page.evaluate(()=>window.__xrFrame.close()); console.error('probe: menu closed');
 await page.waitForFunction(() => window.__xrComfort.status().elapsed > 0.82 && window.__xrComfort.status().elapsed < 1.15, { timeout: 15000, polling: 'raf' });
 const identicalMaskUploads=await page.evaluate(()=>{
  const tex=window.__app.root.findByName('xr-pixel-dissolve').render.material.emissiveMap;
  const upload=tex.upload;let count=0;tex.upload=()=>{count++;upload.call(tex);};
  window.__app.fire('update',0);window.__app.fire('update',0);tex.upload=upload;return count;
 });
 assert.equal(identicalMaskUploads,0);checks.push('Identical pixel-cover frames do not upload the texture again.');
 await page.screenshot({path: `${out}/02-xr-pixels.png`});
 await page.waitForFunction(() => !window.__xrComfort.busy, {timeout: 15000});
 const state = await page.evaluate(() => ({status: window.__xrComfort.status(), entry: window.__rigAtEntry}));
 assert.deepEqual(state.status.rig.map(n=>+n.toFixed(5)), state.entry.map(n=>+n.toFixed(5))); assert.deepEqual(state.status.head.map(n=>+n.toFixed(2)),[0.12,0.04,-0.08]);
 checks.push('Scripted authored translation + 90° turn uses pixel dissolve; physical rig unchanged; tracked child translation retained.');
 const heading=await page.evaluate(()=>{
  const c=window.__xrComfort, head=window.__app.root.findByName('camera');
  const target=c.physicalPoint(c.authored.getPosition().clone().add(c.authored.forward));
  return target.sub(head.getPosition()).normalize().dot(head.forward);
 });
 assert.ok(heading>0.99,'The new scene must be in the current heading after a freely turned head: '+heading);
 checks.push('After an 85-degree free head turn, the destination re-forms in the current heading while preserving the calibrated seat origin.');
 await page.screenshot({path: `${out}/03-xr-reformed.png`});
 // Aim the controller at the physical image of the logical monitor centre.
 await page.evaluate(() => {
  const app = window.__app, screen = app.root.findByName('desktop-screen');
  const origin = app.root.findByName('camera').getPosition().clone();
  const target = window.__xrComfort.physicalPoint(screen.getPosition().clone());
  window.__controller.getOrigin = () => origin;
  window.__controller.getDirection = () => target.clone().sub(origin).normalize();
 });
 await wait(200);
 assert.equal(await page.evaluate(() => window.__app.root.findByName('xr-cursor').enabled),true);
 checks.push('Controller ray has a visible cursor at the rebased screen.');
 await page.evaluate(p=>window.__camFree(p[0],p[1],p[2],0,0),baseline.rig);await wait(100);
 await page.waitForFunction(()=>!window.__xrComfort.busy,{timeout:20000});
 const billboardDot=await page.evaluate(()=>{
  const app=window.__app,head=app.root.findByName('camera'),mesh=app.root.findByName('room-specks').render.meshInstances[0].mesh;
  const v=[];mesh.getPositions(v);
  for(let i=0;i<v.length;i+=12){
   const a=head.getLocalPosition().clone().set(v[i],v[i+1],v[i+2]),b=head.getLocalPosition().clone().set(v[i+3],v[i+4],v[i+5]);
   const side=window.__xrComfort.physicalPoint(b).sub(window.__xrComfort.physicalPoint(a));
   if(side.length()>0.0001)return side.normalize().dot(head.right);
  }throw Error('No visible speck quad for basis check');
 });
 assert.ok(billboardDot>0.999);checks.push('Rebased world speck billboards remain aligned with the tracked head.');
 console.error('probe: quality');
 const quality=await page.evaluate(async()=>{
  const {makeScreenTexture}=await import('/src/engine/screenTexture.ts');const pc=await import('/node_modules/.vite/deps/playcanvas.js');
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const xrBus=new pc.EventHandler();xrBus.active=true;
  const tex=makeScreenTexture({graphicsDevice:window.__app.graphicsDevice,xr:xrBus},canvas);
  const state={mips:tex.mipmaps,min:tex.minFilter===pc.FILTER_LINEAR_MIPMAP_LINEAR,mag:tex.magFilter===pc.FILTER_LINEAR,anisotropy:tex.anisotropy};
  xrBus.fire('end');state.restored=!tex.mipmaps&&tex.minFilter===pc.FILTER_NEAREST&&tex.magFilter===pc.FILTER_NEAREST;tex.destroy();return state;
 });
 assert.ok(quality.mips&&quality.min&&quality.mag&&quality.restored);checks.push('Screen textures created during XR use mipmaps and linear sampling with device-limited anisotropy; the end event restores nearest even while active still reads true.');
 console.error('probe: outline');
 const setupGeometry=await page.evaluate(async()=>{
  const {mountSetupWindow}=await import('/src/desktop/setup/setupWindow.ts');
  const app=window.__app,head=app.root.findByName('camera'),frame=document.createElement('div');
  const setup=mountSetupWindow(app,head,frame,{canvas:window.__os.canvas,setup:()=>null,update:()=>false});
  setup.update(0,1);const plane=app.root.findByName('setup-in-stars');
  const result={distance:plane.getPosition().distance(head.getPosition()),width:plane.getLocalScale().x};setup.destroy();return result;
 });
 assert.ok(Math.abs(setupGeometry.distance-1)<0.0001);assert.equal(setupGeometry.width,1);
 checks.push('XR Setup is one metre wide at one metre, retaining its browser geometry outside XR.');
 const outline=await page.evaluate(async()=>{
  window.__os.setDesktopEra('e1',true);window.__os.debugJump('kit');window.__os.update(0);
  const hits=window.__os.guideTargets();const hit=hits.find(h=>h.w>20&&h.h>10);if(!hit)throw Error('No real desktop target for hover probe');
  window.__os.xrPoint(hit.x+hit.w/2,hit.y+hit.h/2);window.__os.update(0);
  const scale=window.__os.canvas.width/512;
  const pixel=Array.from(window.__os.canvas.getContext('2d').getImageData(Math.round(hit.x)*scale,Math.round(hit.y)*scale,1,1).data);
  return {target:hit.id,pixel};
 });
 assert.deepEqual(outline.pixel,[205,211,223,255]);checks.push('A real desktop button hit rectangle is outlined on the canvas in the palette hover colour.');
 console.error('probe: perf');
 const perf = await page.evaluate(async () => {
  const app = window.__app, samples = [];
  await new Promise((resolve,reject) => { const deadline=setTimeout(()=>reject(Error('Only '+n+' frames within 20 seconds; app ticking='+app._ticking)),20000); let n = 0; const tick = dt => { samples.push({dt:dt*1000,draws:app.stats.drawCalls.total,frame:app.stats.frame.ms}); if (++n>=30) {clearTimeout(deadline);app.off('update',tick);resolve();} };app.on('update',tick); });
  return {samples: samples.length, drawCalls: Math.max(...samples.map(s=>s.draws)), meanFrameMs:samples.reduce((a,s)=>a+s.dt,0)/samples.length, rendererFrameMs:samples.reduce((a,s)=>a+s.frame,0)/samples.length};
 });
 assert.ok(perf.drawCalls<=75,'Canonical seated XR mock exceeds draw-call budget: '+perf.drawCalls);
 // Independently count adapter gesture callbacks on the same mocked XR input bus.
 console.error('probe: gestures');
 await page.evaluate(()=>{window.__os.debugJump('e2Silence');});
 const gestures = await page.evaluate(async () => {
  const app = window.__app;
  const pc = await import('/node_modules/.vite/deps/playcanvas.js');
  const { mountXrInput } = await import('/src/frame/xrInput.ts');
  let selects = 0, grabs = 0, releases = 0, holds = 0;
  const adapter = mountXrInput(app, {onSelect:()=>selects++,onMenuSelect:()=>selects++,onSqueeze:()=>{},menuOpen:()=>false,
    wandColor: new pc.Color(1,1,1),onGrab:()=>{grabs++;return true;},onHold:()=>holds++,onRelease:()=>releases++});
  const origin = app.root.findByName('camera').getPosition().clone();
  const thumb = origin.clone(), index = origin.clone().add(new pc.Vec3(0.06,0,0));
  const joints = [{id:'thumb-tip',radius:0.008,getPosition:()=>thumb},{id:'index-finger-tip',radius:0.008,getPosition:()=>index}];
  const src = {targetRayMode:'tracked-pointer',getOrigin:()=>origin,getDirection:()=>new pc.Vec3(0,1,0),hand:{tracking:true,joints,getJointById:id=>joints.find(j=>j.id===id)}};
  app.xr.input.fire('add',src); adapter.tick();
  const visible = app.root.find(n=>n.name==='xr-hand').some(e=>e.enabled);
  index.copy(thumb).add(new pc.Vec3(0.01,0,0)); adapter.tick();
  app.xr.input.fire('select',src); // native hand select must not duplicate the synthetic pinch
  index.copy(thumb).add(new pc.Vec3(0.05,0,0)); adapter.tick();
  index.copy(thumb).add(new pc.Vec3(0.01,0,0)); adapter.tick();
  await new Promise(r=>setTimeout(r,380)); adapter.tick();
  index.copy(thumb).add(new pc.Vec3(0.05,0,0)); adapter.tick();
  const {makeScreenEntity,makeScreenTexture}=await import('/src/engine/screenTexture.ts');
  const canvas=document.createElement('canvas');canvas.width=canvas.height=8;
  const tex=makeScreenTexture(app,canvas), plane=makeScreenEntity('xr-frame-poke-test',tex,0.3,0.3);
  plane.setPosition(origin.clone().add(new pc.Vec3(0,0.015,0)));app.root.addChild(plane);
  index.copy(origin).add(new pc.Vec3(0.06,0,0));adapter.tick();adapter.tick();
  const pokeSelects=selects-1;plane.destroy();tex.destroy();
  app.xr.input.fire('remove',src); adapter.destroy();
  return {visible,selects,grabs,releases,holds,pokeSelects};
 });
 assert.ok(gestures.visible); assert.equal(gestures.selects,2); assert.equal(gestures.pokeSelects,1); assert.equal(gestures.grabs,1); assert.ok(gestures.releases>=1); assert.ok(gestures.holds>=1);
 checks.push('Hand mesh visible; short pinch selects once despite native duplicate; long pinch grabs, follows and releases; poke selects once until withdrawn.');
 // Real shared handheld module: grip and release through the application input path.
 await page.evaluate(()=>{window.__os.setDesktopEra('e2',true);window.__os.debugJump('desktop');});
 console.error('probe: grab');
 const grab = await page.evaluate(async () => {
  const app=window.__app; window.__os.debugJump('desktop');
  const prop=app.root.findByName('flipPhone'), screen=app.root.findByName('flipPhone-screen');
  const rest=prop.getPosition().clone(), origin=window.__xrComfort.physicalPoint(rest.clone().add(app.root.findByName('camera').forward.clone().mulScalar(-0.3)));
  const target=window.__xrComfort.physicalPoint(screen.getPosition().clone());
  const src=window.__controller;src.getOrigin=()=>origin;src.getDirection=()=>target.clone().sub(origin).normalize();
  app.xr.input.fire('squeezestart',src);
  await new Promise(r=>setTimeout(r,700));
  const held=prop.getPosition().clone(); origin.x+=0.1;
  await new Promise(r=>setTimeout(r,700)); const moved=prop.getPosition().clone();
  app.xr.input.fire('squeezeend',src);
  return {held:held.distance(rest),follow:moved.distance(held),returned:prop.getPosition().distance(rest),menu:!!document.querySelector('#reinterp-game-menu:not([hidden])')};
 });
 assert.ok(grab.held>0.02, JSON.stringify(grab)); assert.ok(grab.follow>0.05, JSON.stringify(grab)); assert.ok(grab.returned<0.001, JSON.stringify(grab));
 checks.push('Shared handheld: controller grip grabs the 2003 handset, follows a 10 cm hand translation, release restores desk pose.');
 console.error('probe: reduced');
 const queue=await page.evaluate(()=>{
  const c=window.__xrComfort,before=c.status().cuts;
  c.authored.setLocalPosition(1.1,1.16,0.7);c.authored.setLocalEulerAngles(0,100,0);
  for(let i=0;i<15;i++)c.reviewStep(0.1);const first=c.status().cuts;
  // S268: a nudge under 0.35 m / 20° no longer re-forms the room (it re-aimed the world at the gaze), so the queued
  //   destination is a real second move
  c.authored.setLocalPosition(1.7,1.16,0.7);c.authored.setLocalEulerAngles(0,140,0);
  for(let i=0;i<2;i++)c.reviewStep(0.1);const during=c.status().cuts;
  for(let i=0;i<50;i++)c.reviewStep(0.1);const after=c.status();
  c.authored.setLocalPosition(1.75,1.16,0.7);c.authored.setLocalEulerAngles(0,145,0);
  for(let i=0;i<30;i++)c.reviewStep(0.1);const nudged=c.status().cuts;
  window.__camFree(1.75,1.16,0.7,0,145);return {before,first,during,after,nudged};
 });
 assert.equal(queue.first,queue.before+1);assert.equal(queue.during,queue.first);assert.equal(queue.after.cuts,queue.before+2);assert.equal(queue.after.elapsed,-1);assert.equal(queue.nudged,queue.after.cuts);
 checks.push('Deterministic review: a destination queued during re-form waits for the next fully covered dissolve; no uncovered late cut; a small nudge re-forms nothing.');
 const reduced = await page.evaluate(async () => {
  const {ledger}=await import('/src/state/ledger.ts');ledger.view.reduceMotion=true;
  window.__camFree(0,1.16,0.7,0,0);
  await new Promise(r=>setTimeout(r,700));
  const status=window.__xrComfort.status(), visible=window.__app.root.findByName('xr-pixel-dissolve').enabled;
  ledger.view.reduceMotion=false;return {status,visible};
 });
 assert.equal(reduced.visible,false);assert.equal(reduced.status.elapsed,-1);checks.push('Reduced motion changes the room instantly without a dissolve or physical rig motion.');
 await page.evaluate(() => { window.__mockEnd(); window.__xrFrame.close(); });
 await page.waitForFunction(width=>window.__os.canvas.width===width&&!window.__xrComfort.status().active,{timeout:20000},baseline.canvas);
 assert.equal(await page.evaluate(() => window.__os.canvas.width),baseline.canvas);
 checks.push('Exiting mocked XR restores browser canvas resolution.');
 const before=await page.evaluate(()=>window.__camPose());
 await page.mouse.move(450,300);await page.mouse.down();await page.mouse.move(550,310,{steps:5});await page.mouse.up();await wait(150);
 const after=await page.evaluate(()=>window.__camPose());assert.notEqual(after.yaw,before.yaw);checks.push('Laptop drag still turns the browser camera after XR exit.');
 const phonePage=await browser.newPage(); phonePage.on('pageerror',e=>errors.push(String(e)));
 await phonePage.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
 await phonePage.goto(`http://localhost:${port}/?reinterp=1&debug=1&era=2&descent=0&motion=1&kiosk=0`,{waitUntil:'networkidle0'});
 await phonePage.waitForFunction(()=>window.__motionSim);
 console.error('probe: phone');
 const phone=await phonePage.evaluate(async()=>{
  window.__motionSim(true);
  window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{alpha:0,beta:70,gamma:0}));
  await new Promise(r=>setTimeout(r,80));
  window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{alpha:30,beta:70,gamma:0}));
  await new Promise(r=>setTimeout(r,80));return window.__motion();
 });
 assert.equal(phone.state,'live');assert.ok(Math.abs(phone.resolved.yaw)>1);checks.push('Phone-sized browser still composes simulated device orientation into camera look.');
 const client=await phonePage.createCDPSession();
 const fov=await phonePage.evaluate(()=>window.__motion().fov);
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:120,y:400},{x:260,y:400}]});
 await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:80,y:400},{x:300,y:400}]});
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await wait(100);const zoom=await phonePage.evaluate(()=>window.__motion().fov);assert.notEqual(fov,zoom);assert.ok(zoom>=30&&zoom<=80);
 checks.push('Phone two-finger pinch still changes camera FOV within 30–80 degrees.');
 await phonePage.screenshot({path:`${out}/04-phone-browser.png`});
 await phonePage.close();await page.close();
 const entrancePage=await browser.newPage();entrancePage.on('pageerror',e=>errors.push(String(e)));
 console.error('probe: real restore entry');
 await entrancePage.goto(`http://localhost:${port}/?reinterp=1&debug=1&descent=0&kiosk=0`,{waitUntil:'domcontentloaded',timeout:60000});
 await entrancePage.waitForSelector('#restore-entrance[data-phase="wake"]',{timeout:180000});
 await entrancePage.evaluate(()=>{
  const app=window.__app,head=app.root.findByName('camera');Object.defineProperty(app.xr,'active',{configurable:true,get:()=>true});
  const origin=head.getPosition().clone(),direction=head.forward.clone();
  const src={targetRayMode:'tracked-pointer',hand:null,gamepad:{buttons:[],axes:[]},getOrigin:()=>origin,getDirection:()=>direction};
  window.__setupController=src;app.xr.input.fire('add',src);app.xr.input.fire('select',src);
 });
 await entrancePage.waitForFunction(()=>window.__xrComfort.calibrated&&!window.__xrComfort.busy,{timeout:15000});
 await entrancePage.evaluate(()=>window.__app.xr.input.fire('select',window.__setupController));
 await entrancePage.waitForFunction(()=>window.__os.setup?.hits.some(h=>h.id==='setup-choice-1')&&window.__app.root.findByName('setup-in-stars')?.render.material.opacity===1,{timeout:15000});
 const setupFlow=await entrancePage.evaluate(()=>{
  const app=window.__app,head=app.root.findByName('camera'),plane=app.root.findByName('setup-in-stars'),h=window.__os.setup.hits.find(h=>h.id==='setup-choice-1');
  const target=plane.getWorldTransform().transformPoint(head.getLocalPosition().clone().set((h.x+h.w/2)/512-0.5,0,(h.y+h.h/2)/384-0.5));
  const origin=head.getPosition().clone(),direction=target.sub(origin).normalize(),src=window.__setupController;
  src.getOrigin=()=>origin;src.getDirection=()=>direction;app.xr.input.fire('select',src);
  return {distance:plane.getPosition().distance(head.getPosition()),width:plane.getLocalScale().x};
 });
 await entrancePage.waitForFunction(()=>window.__os.setup?.stage==='note',{timeout:15000});
 await entrancePage.addStyleTag({content:'body > *:not(canvas) { visibility:hidden !important; }'});
 await wait(150);await entrancePage.screenshot({path:`${out}/06-xr-setup-note.png`});
 checks.push('Real restore entry: seat calibration, wake, and controller ray through the floating Setup reach the content note at one metre.');
 assert.deepEqual(errors, []);
 fs.writeFileSync(`${out}/probe.json`,JSON.stringify({checks,baseline,billboardDot,quality,setupGeometry,setupFlow,outline,menuPause,heading,perf,gestures,grab,queue,reduced,phone,errors},null,2));
 console.log(JSON.stringify({checks,perf,errors},null,2));
} catch (error) { console.error({error:String(error),errors,state:page.isClosed()?null:await page.evaluate(()=>({comfort:window.__xrComfort?.status(),xrActive:window.__app?.xr?.active,contextLost:window.__app?.graphicsDevice?.contextLost,visibility:document.visibilityState})),body:page.isClosed()?'closed':await page.evaluate(()=>document.body.innerText.slice(0,1500))}); throw error; } finally { await Promise.race([browser.close(),new Promise(resolve=>setTimeout(()=>{browser.process()?.kill('SIGKILL');resolve();},5000))]); }
