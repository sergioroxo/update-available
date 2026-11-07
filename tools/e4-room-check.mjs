// Diagnostic state checks; reachability is established separately by tools/walk.mjs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle']});
try {
 const page = await browser.newPage(); await page.setViewport({width:1280,height:860});
 const errors=[]; page.on('pageerror', e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:3116/?reinterp=1&era=4&debug=1&descent=0&kiosk=0',{waitUntil:'networkidle2',timeout:60000});
 await page.waitForFunction(()=>window.__os?.e4 && window.__app,{timeout:60000});
 await new Promise(r=>setTimeout(r,3000));
 await page.evaluate(async()=>{
  window.roomChecks = { beats: await import('/src/narrative/e4Beats.ts'), state: await import('/src/state/ledger.ts'), Messenger: (await import('/src/desktop/apps/messenger.ts')).E4Messenger };
  window.__os.e4.browser.phase='dormant';
 });
 const wait = () => new Promise(r=>setTimeout(r,350));
 const snapshot=()=>page.evaluate(()=>{
  const root=window.__app.root;
  const names=['maya-pot','maya-leaves','maya-pride','maya-friends','system-default-portrait','news-strips','clinic-ticket'];
  return Object.fromEntries(names.map(n=>{const e=root.findByName(n);return [n,{scale:e.getLocalScale().toArray(),drawn:e.render.meshInstances.some(m=>m.visible)}]}));
 });
 const mark=async(id)=>{await page.evaluate(id=>window.roomChecks.beats.markE4(id),id);await wait();};
 await wait(); const initial=await snapshot();
 assert.equal(initial['maya-pot'].drawn,true);assert.equal(initial['system-default-portrait'].drawn,false);
 const materialBefore=await page.evaluate(()=>window.__app.root.findByName('maya-pink-throw').render.material.diffuse.toString());
 await mark('newyou'); await mark('link');
 await page.evaluate(()=>{window.__os.e4.browser.newsOpened=4;}); await wait();
 assert.equal((await snapshot())['news-strips'].drawn,true);
 await mark('number');let s=await snapshot();assert.equal(s['maya-pot'].drawn,false);assert.equal(s['maya-leaves'].drawn,false);assert.equal(s['clinic-ticket'].drawn,true);
 const before=s['clinic-ticket'].scale;
 await page.evaluate(()=>window.__os.e4.browser.clinicNumber+=3);await wait();s=await snapshot();assert.ok(s['clinic-ticket'].scale[0]>before[0]);
 await mark('meridian');assert.equal((await snapshot())['maya-pride'].drawn,false);
 await mark('left');s=await snapshot();assert.equal(s['maya-friends'].drawn,false);assert.equal(s['system-default-portrait'].drawn,true);
 await page.evaluate(()=>window.__camFree(4.4,1.16,.84,0,215));await wait();
 await page.screenshot({path:'out/e4-room-readable.png'});
 await mark('original');
 const chat=await page.evaluate(()=>{
  const {state,Messenger}=window.roomChecks;
  state.ledger.e4Space.push({id:'v3:mute',outcome:'answered',witness:''});
  const muted=new Messenger();muted.houseMuted=true;const counts=[];
  for(let i=0;i<5;i++){muted.updateEvening(7);counts.push(muted.eveningShown-muted.eveningRead);}
  const preview=muted.preview('house').text;
  const hidden=muted.messages('house').some(m=>m.text?.includes('corner slice'));
  muted.pressEvening('row-house');const lines=[];
  for(let i=0;i<3;i++){lines.push(...muted.messages('house').map(m=>m.text));muted.pressEvening('evening-next');}
  const normal=new Messenger();normal.view='house';for(let i=0;i<5;i++)normal.updateEvening(7);
  return {counts,hidden,preview,lines:[...new Set(lines)],normalShown:normal.eveningShown,normalRead:normal.eveningRead};
 });
 assert.deepEqual(chat.counts,[1,2,3,4,5]);assert.equal(chat.hidden,false);assert.equal(chat.preview,'muted');assert.equal(chat.lines.length,5);assert.equal(chat.normalShown,5);assert.equal(chat.normalRead,5);
 await mark('terminated');s=await snapshot();
 assert.equal(s['maya-pot'].drawn,true);assert.equal(s['maya-pride'].drawn,true);assert.equal(s['maya-friends'].drawn,true);assert.equal(s['system-default-portrait'].drawn,false);assert.equal(s['news-strips'].drawn,false);assert.equal(s['clinic-ticket'].drawn,false);
 assert.equal(await page.evaluate(()=>window.__app.root.findByName('maya-pink-throw').render.material.diffuse.toString()),materialBefore);
 // A wipe changes generation without touching the beat module's version; room consumers must still restore.
 await page.evaluate(()=>window.roomChecks.state.wipeLedger());await wait();s=await snapshot();assert.equal(s['maya-pot'].drawn,true);assert.equal(s['system-default-portrait'].drawn,false);
 assert.equal(errors.length,0,errors.join('\n'));
 const result={initial,restored:s,chat,errors};fs.writeFileSync('out/e4-room-check.json',JSON.stringify(result,null,2));
 console.log('PASS: real renderer culls removed props, ticket grows, both chat choices preserve five messages, termination restores, ledger generation reapplies.');
} finally {await browser.close();}
