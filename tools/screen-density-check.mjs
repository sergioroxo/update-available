import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle'],defaultViewport:{width:960,height:600}});
const rows=[];
try{for(const era of [1,2,3,4]){
 const p=await browser.newPage();await p.evaluateOnNewDocument(()=>{window.__fonts=new WeakMap();const raw=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(...args){const n=Number(this.font.match(/([\d.]+)px/)?.[1]);const a=window.__fonts.get(this.canvas)??[];if(n&&!a.some(x=>x.size===n)){a.push({size:n,sample:String(args[0]).slice(0,80)});window.__fonts.set(this.canvas,a);}return raw.apply(this,args);};});
 await p.goto(`http://localhost:3117/?reinterp=1&home=0&debug=1&kiosk=0&descent=0&era=${era}`,{waitUntil:'networkidle2',timeout:120000});
 await p.waitForFunction(()=>window.__os||[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Log in')&&!b.disabled),{timeout:90000});await p.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Log in'))?.click());await p.waitForFunction(()=>window.__os&&window.__era3Devices?.(),{timeout:90000});
 await new Promise(r=>setTimeout(r,2000));
 const row=await p.evaluate(async era=>{
 const os=window.__os,a=window.__app,pc=await import('/node_modules/.vite/deps/playcanvas.js');
 if(era===1){for(const b of ['profile','kit','diary']){os.debugJump(b);os.update(.2);}os.diary=null;os.yesOpen=true;os.update(0);}
 if(era===2){os.debugJump('netvision');if(!os.netvision)os.openNetVision();for(const t of [0,20,45,80,100,110]){os.netvision.debugSeek(t);os.update(0);}}
 if(era===3)for(const b of ['consent','board','list','noa','boardDone']){window.__graceQueue().debugBeat(b);a.fire('update',.1);}
 if(era===4){os.debugJump('e4Browser');os.update(.1); const c=window.__era3Devices().monitor;for(const b of ['search','feed','care','clinic','news']){os.e4.browser.debugJumpTo(b);os.e4.drawBrowser(c.getContext('2d'),710,384);}os.debugJump('e4Place');os.update(.1);a.fire('update',.1);}
 const canvases={desktop:os.canvas,...window.__era3Devices()};const names={desktop:'desktop-screen',workstation:'era3-device-workstation',phone:'era3-device-phone',monitor:'era3-device-monitor',laptop:'era3-device-laptop',visor:'era4-visor',stream:'era3-device-stream'};
 const eye=window.__poses().seats[era<3?'r1':era===3?'r2':'r3'];const vEye=new pc.Vec3(eye.x,eye.y,eye.z);
 const angle=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a.sub(vEye).normalize().dot(b.sub(vEye).normalize()))))*180/Math.PI;
 const result = {era,eye,screens:Object.entries(canvases).map(([name,c])=>{
 const e=a.root.findByName(names[name]);if(!e)return {name,missing:true};const tex=e.render.material.emissiveMap;
 const m=e.getWorldTransform(),centre=e.getPosition(),size=e.getLocalScale();
 const h=angle(m.transformPoint(new pc.Vec3(-.5,0,0)),m.transformPoint(new pc.Vec3(.5,0,0)));
 const v=angle(m.transformPoint(new pc.Vec3(0,0,-.5)),m.transformPoint(new pc.Vec3(0,0,.5)));
 return {name,enabled:e.enabled,width:c.width,height:c.height,glass:[size.x,size.z],metres:centre.distance(vEye),degrees:[h,v],texelsPerDegree:[c.width/h,c.height/v],mips:tex.mipmaps,min:tex.minFilter,mag:tex.magFilter,fonts:[...(window.__fonts.get(c)??[]),...(name==='desktop'&&os.netvision?.picture ? window.__fonts.get(os.netvision.picture)??[]:[])].sort((a,b)=>a.size-b.size)};
 })};
 Object.defineProperty(a.xr,'active',{configurable:true,get:()=>true});os.update(0);a.fire('update',0);
 for(const s of result.screens){const c=canvases[s.name];s.xrPixels=c?[c.width,c.height]:null;}
 return result;},era);rows.push(row);await p.close();
}}finally{fs.mkdirSync('out/xr-text',{recursive:true});fs.writeFileSync('out/xr-text/density.json',JSON.stringify(rows,null,2));await browser.close();}console.log(JSON.stringify(rows,null,2));
