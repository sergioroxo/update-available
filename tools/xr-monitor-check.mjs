/** API emulation with real WebGL framebuffers and PlayCanvas's real XR loop.
 * No headset compositor/sharpness claim. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle'],defaultViewport:{width:960,height:600}});
const report=[];
try {
 for(const flag of ['', '&quad=0','&quad=1']) {
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.text().includes('Monitor quad unavailable'))errors.push(m.text());});
  await page.evaluateOnNewDocument(()=>{
   class Space extends EventTarget {getOffsetReferenceSpace(){return this;}}
   class Layer {
    static getNativeFramebufferScaleFactor(){return 1.5;}
    constructor(s,gl,options){this.options=options;this.framebufferWidth=960;this.framebufferHeight=600;this.framebuffer=gl.createFramebuffer();
     const fb=gl.getParameter(gl.FRAMEBUFFER_BINDING),tex=gl.getParameter(gl.TEXTURE_BINDING_2D);
     gl.bindFramebuffer(gl.FRAMEBUFFER,this.framebuffer);const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,960,600,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);
     gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.bindTexture(gl.TEXTURE_2D,tex);
    }
    getViewport(view){return {x:view.eye==='left'?0:480,y:0,width:480,height:600};}
   }
   class Session extends EventTarget {
    inputSources=[];renderState={baseLayer:null};visibilityState='visible';environmentBlendMode='opaque';enabledFeatures=['layers'];supportedFrameRates=[90];frameRate=90;
    updateRenderState(next){if(next.baseLayer&&next.layers)throw Error('Both baseLayer and layers');if(next.layers)this.renderState={...this.renderState,...next,baseLayer:null};else this.renderState={...this.renderState,...next,...(next.baseLayer?{layers:undefined}:{})};}
    requestReferenceSpace(){return Promise.resolve(new Space());}
    requestAnimationFrame(cb){return window.requestAnimationFrame(t=>{if(this.ended)return;const transform=new XRRigidTransform({x:0,y:1.2,z:0});const projection=new Float32Array([1.25,0,0,0,0,1,0,0,0,0,-1.001,-1,0,0,-.10005,0]);const frame={session:this,getViewerPose:()=>({transform,views:['left','right'].map(eye=>({eye,projectionMatrix:projection,transform}))}),getPose:()=>({transform})};cb(t,frame);});}
    cancelAnimationFrame(id){window.cancelAnimationFrame(id);}
    end(){this.ended=true;this.dispatchEvent(new Event('end'));return Promise.resolve();}
   }
   class Binding {
    constructor(session,gl){this.gl=gl;}
    createQuadLayer(o){const gl=this.gl,old=gl.getParameter(gl.TEXTURE_BINDING_2D),t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,o.viewPixelWidth,o.viewPixelHeight,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.bindTexture(gl.TEXTURE_2D,old);return {...o,texture:t,needsRedraw:true,destroy(){gl.deleteTexture(t);}};}
    getSubImage(q){window.__quad=q;q.needsRedraw=false;return {colorTexture:q.texture,viewport:{x:0,y:0,width:q.viewPixelWidth,height:q.viewPixelHeight}};}
   }
   window.XRWebGLLayer=Layer;window.XRWebGLBinding=Binding;
   const xr=new EventTarget();xr.isSessionSupported=async()=>true;xr.requestSession=async(type,opts)=>{window.__sessionOptions=opts;return new Session();};Object.defineProperty(navigator,'xr',{value:xr});
  });
  await page.goto(`http://localhost:3117/?reinterp=1&home=0&debug=1&kiosk=0&descent=0${flag}`,{waitUntil:'networkidle2'});
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Log in')&&!b.disabled));
  await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Log in')).click());
  await page.waitForFunction(()=>window.__app&&window.__os&&window.__monitorQuad,{timeout:90000});
  await page.evaluate(()=>window.__os.debugJump('kit'));
  await new Promise(r=>setTimeout(r,2800));
  const cycles=[];
  for(let i=0;i<2;i++) {
   await page.evaluate(()=>{const a=window.__app;return new Promise((resolve,reject)=>a.xr.start(a.root.findByName('camera').camera,'immersive-vr','local',{optionalFeatures:location.search.includes('quad=1')?['layers']:[],callback:e=>e?reject(e):resolve()}));});
   await page.waitForFunction(()=>window.__app.xr.active&&window.__xrComfort.calibrated&&!window.__xrComfort.busy,{timeout:30000});
   await new Promise(r=>setTimeout(r,700));
   const state=await page.evaluate(()=>({quad:window.__monitorQuad.status(),plane:window.__app.root.findByName('desktop-screen').render.enabled,base:!!window.__app.xr.session.renderState.baseLayer,layers:window.__app.xr.session.renderState.layers?.length??0,size:[window.__app.graphicsDevice.width,window.__app.graphicsDevice.height],glError:window.__app.graphicsDevice.gl.getError()}));
   assert.equal(state.quad.active,flag.includes('quad=1'),JSON.stringify({flag,state,errors}));assert.equal(state.plane,!flag.includes('quad=1'));assert.deepEqual(state.size,[960,600]);assert.equal(state.glError,0);
   if(flag.includes('quad=1')) {
    const nonempty=await page.evaluate(()=>{const gl=window.__app.graphicsDevice.gl,q=window.__quad,old=gl.getParameter(gl.READ_FRAMEBUFFER_BINDING),fb=gl.createFramebuffer();try{gl.bindFramebuffer(gl.READ_FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.READ_FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,q.texture,0);const pixels=new Uint8Array(4*4*4);gl.readPixels(20,20,4,4,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return pixels.some((v,i)=>i%4===3&&v>0);}finally{gl.bindFramebuffer(gl.READ_FRAMEBUFFER,old);gl.deleteFramebuffer(fb);}});assert.ok(nonempty,'Compositor texture must contain the monitor');
   }
   // Select a real kit control with a controller ray through the normal XR input bus.
   const selected=await page.evaluate(async()=>{
    const a=window.__app,os=window.__os,c=window.__xrComfort;os.update(0);
    const hit=os.kit.hits.find(h=>!['cancel','minimise'].includes(h.id)&&h.w>30&&h.h>10);
    if(!hit)throw Error('No kit target');
    const pc=await import('/node_modules/.vite/deps/playcanvas.js');
    const p=c.physicalPoint(new pc.Vec3((hit.x+hit.w/2)/512*.4-.2,1.08+(.5-(hit.y+hit.h/2)/384)*.3,.012));
    const origin=a.root.findByName('camera').getPosition().clone(),direction=p.clone().sub(origin).normalize();
    const src={hand:null,targetRayMode:'tracked-pointer',handedness:'right',getOrigin:()=>origin,getDirection:()=>direction,getPosition:()=>origin,getRotation:()=>new pc.Quat(),gamepad:{buttons:[],axes:[]}};
    const before=JSON.stringify(os.kit);a.xr.input.fire('add',src);a.xr.input.fire('select',src);a.xr.input.fire('remove',src);return {id:hit.id,changed:JSON.stringify(os.kit)!==before};
   });assert.ok(selected.changed,JSON.stringify(selected));
   await page.evaluate(()=>new Promise(resolve=>window.__app.xr.end(()=>resolve())));
   assert.equal(await page.evaluate(()=>window.__app.root.findByName('desktop-screen').render.enabled),true);
   cycles.push({state,selected});
  }
  report.push({flag:flag||'default',cycles,errors});assert.deepEqual(errors,[]);await page.close();
 }
} finally {fs.mkdirSync('out/xr-text',{recursive:true});fs.writeFileSync('out/xr-text/xr.json',JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify(report,null,2));
