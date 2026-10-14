/** Accessibility and ambient field review; era jumps here are explicitly review-only. */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const at=process.argv.indexOf('--port'), port=process.argv[at+1]; if(at<0 || port==='3000')throw Error('Pass --port, never 3000');
const out=path.resolve('out/entrance-polish'); fs.mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--no-sandbox']});
const errors=[],checks=[],metrics=[]; const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function open(query,width=1280,height=720) {
 const p=await browser.newPage();await p.setViewport({width,height,deviceScaleFactor:1});p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 if(query.includes('&motion=reduced')) { await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]); query=query.replace('&motion=reduced',''); }
 await p.goto(`http://localhost:${port}/?reinterp=1&debug=1&kiosk=0${query}`,{waitUntil:'networkidle2',timeout:180000});await p.addStyleTag({content:'#motion-diagnostic{display:none!important}'});return p;
}
async function press(p,id){await p.waitForFunction(id=>JSON.parse(document.getElementById('restore-entrance')?.dataset.setupHits||'[]').some(h=>h.id===id),{timeout:30000},id);const h=await p.evaluate(id=>JSON.parse(document.getElementById('restore-entrance').dataset.setupHits).find(h=>h.id===id),id);await p.mouse.click(h.x+h.w/2,h.y+h.h/2);await wait(250);}
async function shot(p,name){await p.screenshot({path:path.join(out,`${p.viewport().width}x${p.viewport().height}-${name}.png`)});}
const vertices=p=>p.evaluate(()=>{const a=[];window.__app.root.findByName('room-specks').render.meshInstances[0].mesh.getPositions(a);return a});
try {
 const p=await open('&motion=reduced');await p.waitForSelector('#restore-entrance[data-phase="wake"]',{timeout:180000});await p.mouse.click(640,360);await press(p,'setup-choice-1');
 await p.waitForFunction(()=>document.getElementById('restore-entrance')?.dataset.setupStage==='note',{timeout:30000});await shot(p,'device-reduced-note');
 await press(p,'setup-reduce-motion');assert.equal(await p.evaluate(()=>window.__ledger().view.reduceMotion),false);
 await press(p,'setup-reduce-motion');assert.equal(await p.evaluate(()=>window.__ledger().view.reduceMotion),true);checks.push('Session switch overrides device preference and is in ledger');
 await press(p,'setup-close');await press(p,'setup-choice-0');await press(p,'setup-advert-play-0');await p.waitForFunction(()=>window.__os.setup.film?.duration>1);await p.evaluate(()=>{const f=window.__os.setup.film;f.currentTime=f.duration-0.3});   /* S245: diagnostic seek past the mandatory film */await press(p,'setup-choice-0');
 await p.waitForSelector('#restore-entrance[data-phase="restore"]',{timeout:30000});const before=await p.evaluate(()=>window.__camPose());await wait(3000);await shot(p,'reduced-restore');const after=await p.evaluate(()=>window.__camPose());assert.deepEqual([before.x,before.y,before.z],[after.x,after.y,after.z]);assert.equal(after.driven,false);checks.push('Device reduced motion: prechecked note, no restore camera flight');
 await p.waitForFunction(()=>!document.getElementById('restore-entrance'),{timeout:60000});await wait(1000);await p.evaluate(()=>window.__camFree(0,1.2,0.7,4,115));await wait(300);const a=await vertices(p);await wait(1800);const b=await vertices(p);for (let i=0;i<a.length;i+=12) for (let axis=0;axis<3;axis++) { const center=v=>(v[i+axis]+v[i+3+axis]+v[i+6+axis]+v[i+9+axis])/4; assert.ok(Math.abs(center(a)-center(b))<1e-6,'Reduced-motion point centre stays fixed; billboard still faces the viewer'); } checks.push('Speck centres frozen when reduced');await shot(p,'reduced-specks');
 await p.close();
 for(const view of [{width:1280,height:720},{width:390,height:844}]) {
  for(const era of [1,2,3,4]) {
   const q=era===1?'&reveal=1&descent=0':`&era=${era}&descent=0`;
   const e=await open(q,view.width,view.height);await e.waitForFunction(()=>window.__camFree && window.__app.root.findByName('room-specks'),{timeout:180000});await wait(1000);
   const pose=era<3?[0,1.2,0.7,4,115]:era===3?[-4.3,1.2,0.7,4,65]:[4.3,1.2,0.7,4,245];await e.evaluate(a=>window.__camFree(...a),pose);await wait(500);await shot(e,`era-${era}-corner-specks`);
   const a=await vertices(e);await wait(1000);const b=await vertices(e);assert.notDeepEqual(a,b,'Specks drift under ordinary motion');
   const stat=await e.evaluate(()=>{const r=window.__app.root.findByName('room-specks');return {calls:window.__app.stats.drawCalls.total,meshInstances:r.render.meshInstances.length,vertices:r.render.meshInstances[0].mesh.vertexBuffer.numVertices}});assert.equal(stat.meshInstances,1);assert.equal(stat.vertices,160);metrics.push({view,era,...stat});checks.push(`${view.width}/era${era}: 40 quads in one mesh, slow drift`);await e.close();
  }
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'MOTION_AND_SPECKS.json'),JSON.stringify({checks,metrics,errors},null,2));console.log('PASS',checks);
} finally {await browser.close();}
