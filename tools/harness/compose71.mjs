import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import path from 'node:path';
const P=[
 ['shots-before/e4_look-C-cross.png','A — Room 3 from the overlook, BEFORE'],
 ['shots-after/e4_look-C-cross.png','B — AFTER: desk at its authored size, CRT off the curtain, bookcase out of the wall'],
 ['shots-after/e4_seat-r3.png','C — PROPOSAL: E4’s home seat, unchanged (the desk is 46° below frame)']
].map(([f,label])=>({label,data:'data:image/png;base64,'+fs.readFileSync(path.resolve(f)).toString('base64')}));
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox'],defaultViewport:{width:400,height:400}});
const pg=await b.newPage(); await pg.goto('about:blank');
const out=await pg.evaluate(async(panels)=>{
 const imgs=await Promise.all(panels.map(p=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=p.data;})));
 const S=0.62, BAR=30, PAD=8, GAP=8;
 const w=Math.round(imgs[0].width*S), h=Math.round(imgs[0].height*S);
 const W=PAD*2+w*imgs.length+GAP*(imgs.length-1), H=PAD*2+BAR+h;
 const c=document.createElement('canvas'); c.width=W; c.height=H;
 const x=c.getContext('2d'); x.fillStyle='#0d0f13'; x.fillRect(0,0,W,H);
 let px=PAD;
 imgs.forEach((im,i)=>{
  x.fillStyle='#15181f'; x.fillRect(px,PAD,w,BAR);
  x.fillStyle='#e8ecf4'; x.font='13px "SF Mono", Menlo, monospace'; x.textBaseline='middle';
  x.fillText(panels[i].label,px+6,PAD+BAR/2+1);
  x.drawImage(im,px,PAD+BAR,w,h); px+=w+GAP;
 });
 return c.toDataURL('image/png');
},P);
fs.writeFileSync('S71_composite.png',Buffer.from(out.split(',')[1],'base64'));
console.log('ok',fs.statSync('S71_composite.png').size);
await b.close();
