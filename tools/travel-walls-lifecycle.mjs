/** Offline checks for W1-B11: the eye never passes through a wall — the entrance arc and the Close's flight. (S398: the send checks are retired, see below.) */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const port=Number(process.argv[process.argv.indexOf('--port')+1]);
if (!port) throw new Error('Explicit --port required');
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle'],defaultViewport:{width:1280,height:720}});
const results={errors:[],checks:[]};
async function open(reduced=false) {
 const p=await browser.newPage();p.on('pageerror',e=>results.errors.push(String(e)));
 p.on('console',m=>{if(m.type()==='error')results.errors.push(m.text());});
 await p.goto(`http://localhost:${port}/?reinterp=1&debug=1&descent=0&home=0&kiosk=0&era=2${reduced?'&motion=reduced':''}`,{waitUntil:'networkidle2'});
 await p.waitForFunction(()=>window.__os||[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Log in')&&!b.disabled),{timeout:120000});
 if(!await p.evaluate(()=>!!window.__os))await p.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Log in')).click());
 await p.waitForFunction(()=>window.__os&&window.__app&&window.__poses,{timeout:120000});
 await p.addStyleTag({content:'body > *:not(canvas) {display:none!important;}'});
 await p.evaluate(()=>{window.__app.timeScale=0; window.__wallState=()=>Object.fromEntries(['wallWest','wallEast','wallNorth','ceiling'].map(id=>{const h=window.__app.root.findByName(id);const mi=h.render.meshInstances[0];return [id,{opacity:mi.material.opacity,depthWrite:mi.material.depthWrite,blend:mi.material.blendType,batch:h.render.batchGroupId}]}));});
 return p;
}
// ⚑ S398 (UiB job 29 A10) — the send checks are gone, and why. This probe was written for W1-B11: 2003's two sends
// (s1, s2) dollied the eye across a closed partition, and the wall it crossed had to fade alone and come back whole.
// Since 2003's referral is read at Daniel's own desk (app.ts onSendResolve: `if (os.era === 'e2')` — the send never
// moves the view), no send crosses a wall, so the send, its cancellation and its reduced-motion cut could not start:
// the probe failed on a path the piece no longer has (S396's notes). The walls the eye still passes are the entrance
// arc and the Close's flight from Maya's room, both checked below; cluster.ts's travel fade itself is unchanged.
// Extra unchanged paths: evaluate the exported entrance quadratic and the
// Close's actual lead + sweep. Scope exceeds the three era/send request.
const e=await open();
await e.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('E1→E2')).click());
await e.keyboard.press('Enter');await e.evaluate(()=>window.__app.update(1/120));
const descent=await e.evaluate(()=>{
 const d=window.__poses().descent, coll=[];
 for(let i=0;i<=1440;i++) {
  const k=i/1440,s=k*k*k*(k*(k*6-15)+10),u=1-s;
  const a=['x','y','z'].map(v=>u*u*d.from[v]+2*u*s*d.via[v]+s*s*d.to[v]);
  window.__app.root.forEach(n=>{if(!n.enabled||!n.render||!/(^wall(North|West|East)$|ceiling|spineWall|spineDoor)/.test(n.name))return;for(const mi of n.render.meshInstances){const b=mi.aabb,c=b.center,h=b.halfExtents;if(Math.min(h.x,h.y,h.z)<1e-5)continue;if(Math.hypot(...a.map((v,j)=>Math.max(Math.abs(v-[c.x,c.y,c.z][j])-[h.x,h.y,h.z][j],0)))<.06)coll.push(n.name);}});
 }
 return {from:d.from,via:d.via,to:d.to,seconds:d.seconds,crossings:[...new Set(coll)]};
});
if(descent.crossings.length)throw new Error('Unchanged entrance crosses geometry');
results.checks.push({name:'unchanged entrance arc: 1441 mesh-bound checks',...descent});
await e.close();
const c=await open();
await c.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('E3→E4')).click());
await c.keyboard.press('Enter');await c.evaluate(()=>window.__app.update(1/120));
await c.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Close · point cloud')).click());
const close=[];
for(let i=0;i<6000;i+=60){
 const r=await c.evaluate(()=>{const r=[];for(let i=0;i<60;i++){window.__app.update(1/120);const p=window.__camPose();if(!p.driven||p.dur!==26)continue;window.__app.root.forEach(n=>{if(!n.enabled||!n.render||!/(^wall(North|West|East)$|ceiling|^[we]_lintel$|doorLintel)/i.test(n.name))return;for(const mi of n.render.meshInstances){const b=mi.aabb,h=b.halfExtents,d=b.center;if(Math.min(h.x,h.y,h.z)<1e-5||mi.material.opacity===0)continue;if(Math.hypot(Math.max(Math.abs(p.x-d.x)-h.x,0),Math.max(Math.abs(p.y-d.y)-h.y,0),Math.max(Math.abs(p.z-d.z)-h.z,0))<.06)r.push({id:n.name,p});}});}return r;});
 close.push(...r);
}
if(close.length)throw new Error('Close return crosses geometry');
results.checks.push({name:'unchanged Close return: live lead/sweep callbacks and mesh bounds',crossings:close});
await c.close();
fs.writeFileSync('out/travel-walls/lifecycle.json',JSON.stringify(results,null,2));
await browser.close();
console.log(JSON.stringify({checks:results.checks.map(x=>x.name),errors:results.errors}));
if(results.errors.length)process.exitCode=1;
