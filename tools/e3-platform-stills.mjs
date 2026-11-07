/** Review-only photographs of every platform surface at its mirror width. */
import fs from 'node:fs';import puppeteer from 'puppeteer-core';
const port=process.argv[2]||3115,out='out/codex-e3-mirror/platform';fs.mkdirSync(out,{recursive:true});
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle']});
try{const p=await b.newPage();await p.goto(`http://localhost:${port}/?reinterp=1&era=3&debug=1&descent=0&kiosk=0`,{waitUntil:'networkidle2'});await p.waitForFunction(()=>window.__graceQueue?.());await new Promise(r=>setTimeout(r,4500));
const images=await p.evaluate(()=>{const q=window.__graceQueue(),c=document.createElement('canvas');c.width=676;c.height=390;const ctx=c.getContext('2d'),images={};const shot=n=>{q.draw(ctx,676,390);images[n]=c.toDataURL();};q.lambyGuide=null;q.veraPage=null;q.mode='board';q.seenTask=true;q.pauseOpen=false;
 for(const[id,s]of q.surfaces){q.veraPage=null;q.mode='list';q.openSurface=s;shot('job-'+id);}
 q.openSurface=null;
 for(let i=0;i<4;i++){q.mode='list';q.subIdx=i;q.storyDone=false;shot('testimony-'+i);}
 for(const page of ['send','record','kit']){q.mode='board';q.veraPage=page;q.recordSent=page==='record';q.recordPage=0;shot(page+'-0');if(page==='record'){for(let i=1;i<3;i++){q.recordPage=i;shot(page+'-'+i);}}}
 return images;});for(const[n,u]of Object.entries(images))fs.writeFileSync(`${out}/${n}.png`,Buffer.from(u.split(',')[1],'base64'));console.log(Object.keys(images).join(', '));
}finally{await b.close();}
