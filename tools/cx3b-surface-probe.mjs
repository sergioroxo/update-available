import puppeteer from 'puppeteer-core';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
const port=Number(process.argv[process.argv.indexOf('--port')+1]) || 3217;
const out=path.resolve('out/cx3b-decisions');
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox']});
try{
const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.goto(`http://127.0.0.1:${port}/data/strings/cx3b.json`);
const r=await p.evaluate(async()=>{
 const {E4Shell}=await import('/src/desktop/apps/space.ts');const {E4Browser}=await import('/src/desktop/apps/browser.ts');const {LambyGuide}=await import('/src/narrative/lambyGuide.ts');const {Web1997App}=await import('/src/desktop/apps/web1997.ts');
 const {StartMenuMap}=await import('/src/desktop/apps/startMenuMap.ts');const {tapePlayerBus,TapePlayerApp}=await import('/src/desktop/apps/tapePlayer.ts');
 const browser=new E4Browser();browser.debugJumpTo('search');const c=document.createElement('canvas');c.width=512;c.height=384;const ctx=c.getContext('2d');
 const acts=[];let looks=0;browser.onGuideLook=()=>looks++;
 const g=new LambyGuide({log:()=>{},act:act=>{acts.push(act);browser.pressGuideTarget(act.slice(6));}});browser.lambyGuide=g;
 const input={era:'e4',map:{current:{era:'e4',beat:{id:'results'}},quiet:false},silent:false,voice:false};g.tick(0,input);
 browser.draw(ctx,512,384,true);browser.pressLaptopGuide('lg-tray');
 const lap=document.createElement('canvas');lap.width=224;lap.height=140;let hits=[];browser.drawLaptopGuide(lap.getContext('2d'),224,140,hits);
 browser.pressLaptopGuide('lg-show');hits=[];browser.drawLaptopGuide(lap.getContext('2d'),224,140,hits);const take=hits.some(h=>h.id==='lg-take');
 const data=lap.toDataURL();browser.pressLaptopGuide('lg-take');
 const ad=new Web1997App(),adTicks=[ad.update(.1),ad.update(.39),ad.update(.01),ad.update(.1)];
 let caption='one';tapePlayerBus.probe=()=>({inserted:'tapeB',playing:true,caption});const player=new TapePlayerApp();const map=new StartMenuMap();map.openTapes();const tapeTicks=[map.update(0),map.update(.1)];caption='two';tapeTicks.push(map.update(.1));
 const mode=browser.mode;
 browser.sayLine('existing console line');g.tick(0,{...input,voice:true});hits=[];browser.drawLaptopGuide(lap.getContext('2d'),224,140,hits);const voiceTray=hits.some(h=>h.id==='lg-tray')&&!hits.some(h=>h.id==='lg-x');
 g.tick(0,{...input,silent:true});hits=[];browser.drawLaptopGuide(lap.getContext('2d'),224,140,hits);const feltSilent=hits.length===0;
 const sh=new E4Shell();sh.stageNow='closed';sh.laptopLine=99;sh.browser.sayLine('existing console line');const drawn=[];const lc=lap.getContext('2d');const fill=lc.fillText.bind(lc);lc.fillText=(text,...args)=>{drawn.push(text);fill(text,...args)};sh.drawLaptop(lc,224,140);const consolePreserved=drawn.join(' ').includes('existing console line');
 return {take,looks,acts,mode,adTicks,tapeTicks,selected:player.selected,voiceTray,feltSilent,consolePreserved,data};
});
assert(r.take);assert.equal(r.looks,1);assert.deepEqual(r.acts,['press:search-open']);assert.equal(r.mode,'typing');assert.deepEqual(r.adTicks,[false,false,true,false]);assert.deepEqual(r.tapeTicks,[true,false,true]);assert.equal(r.selected,'tapeB');assert(r.voiceTray&&r.feltSilent&&r.consolePreserved);assert.equal(errors.length,0);
fs.writeFileSync(path.join(out,'08-laptop-monitor-action.png'),Buffer.from(r.data.split(',')[1],'base64'));delete r.data;fs.writeFileSync(path.join(out,'surface-probe.json'),JSON.stringify(r,null,2));console.log('Final surface checks PASS:',JSON.stringify(r));
}finally{await b.close()}
