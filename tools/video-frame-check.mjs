import fs from 'node:fs';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage(); await page.goto('http://localhost:3117/?reinterp=1&home=0');
 const results=await page.evaluate(async(includeBefore)=>{
  const out={};
  for(const name of (includeBefore ? ['netvisionBefore','netvision'] : ['netvision'])) {
   const {NetVisionPlayerApp}=await import(`/src/desktop/apps/${name}.ts`);
   const film=new NetVisionPlayerApp({fileToLedger:false});
   const c=document.createElement('canvas');c.width=2048;c.height=1536;const ctx=c.getContext('2d');ctx.scale(4,4);
   let dirty=0, paints=0, random=0; const raw=Math.random;Math.random=()=>{random++;return raw();};
   const start=performance.now();
   for(let i=0;i<180;i++){film.dirty=false;film.update(1/90);if(film.dirty)dirty++;film.draw(ctx);paints++;}
   const ms=performance.now()-start;
   // Hold tape time: simulated hand/hover paints may not change film pixels.
   film.draw(ctx);const before=ctx.getImageData(0,0,c.width,c.height).data;
   for(let i=0;i<10;i++){film.handleMove(100+i,100);film.draw(ctx);}
   const after=ctx.getImageData(0,0,c.width,c.height).data;let changed=0;
   for(let i=0;i<before.length;i++)if(before[i]!==after[i])changed++;
   Math.random=raw;out[name]={dirty,paints,random,ms:+ms.toFixed(1),changedChannelsAtFixedTime:changed};
  }return out;
 }, process.argv.includes('--before'));
 fs.mkdirSync('out/xr-text',{recursive:true});fs.writeFileSync(process.argv.includes('--before') ? 'out/xr-text/video.json' : 'out/xr-text/video-after.json',JSON.stringify(results,null,2));console.log(results);
 assert.equal(results.netvision.changedChannelsAtFixedTime,0);assert.ok(results.netvision.dirty<=61);
} finally {await browser.close();}
