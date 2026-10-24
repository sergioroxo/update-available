import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { readVisitorState } from './harness/visitor-state.mjs';
const out='out/cx3a';fs.mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--no-sandbox'],defaultViewport:{width:1280,height:720}});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const results=[];
const state=()=>readVisitorState(page,{width:1280,height:720});
async function click(id){const s=await state();const t=s.targets.find(t=>t.id===id);assert(t,`${id} missing; got ${s.targets.map(t=>t.id).join(',')}`);await page.mouse.move(t.pt[0],t.pt[1]);await page.mouse.down();await wait(80);await page.mouse.up();await wait(600);}
async function load(era=1){await page.goto(`http://localhost:3216/?reinterp=1&debug=1&descent=0&home=0&kiosk=0&era=${era}`);if(era===1){await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Log in'&&!b.disabled));const pt=await page.evaluate(()=>{const r=[...document.querySelectorAll('button')].find(b=>b.textContent==='Log in').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});await page.mouse.click(pt.x,pt.y);}await page.waitForFunction(()=>window.__os&&window.__app,{timeout:60000});await wait(2200);}
async function shot(name){await page.screenshot({path:`${out}/${name}.png`});}
try {
 await load(3);await page.evaluate(async()=>{const {ledger}=await import('/src/state/ledger.ts');ledger.records.push('e3-job-done','e3-signed-in');ledger.lamby.push({id:'e3_lambient_consent'});const q=window.__graceQueue();q.mode='board';q.phone.arm();q.pauseOpen=false;q.waitSaid=true;q.wotdSaid=true;q.bump();window.__os._toast=null;});await wait(8500);
 const q=await page.evaluate(()=>({mode:window.__graceQueue().mode,call:document.querySelector('#reinterp-call')?.textContent}));
 fs.writeFileSync(`${out}/phone-before.json`,JSON.stringify(await state(),null,2));
 if((await state()).targets.some(t=>t.id==='reinterp-call')){await click('reinterp-call');await wait(1500);assert(await page.evaluate(()=>document.querySelector('#reinterp-call').style.opacity==='0'));results.push(['Phone call disappears on pickup',true,q]);await shot('phone-picked-up');}else results.push(['Phone call not reached by fixture',false,q]);
 await load(2);await page.evaluate(()=>window.__os.debugJump('calebResidue'));await wait(7000);await shot('closure-continue');assert((await state()).targets.some(t=>t.id==='residue'));results.push(['Closure Continue visible',true]);
 await load(1);await page.evaluate(async()=>{const {ledger}=await import('/src/state/ledger.ts');ledger.records.push('profile-initialized');const o=window.__os;o.debugJump('desktop');o._toast=null;o.dirty=true;});await wait(8000);
 await click('lg-tray');const balloon=await page.evaluate(()=>({active:window.__os.lambyGuide.active,silence:window.__os.guideSilence,view:window.__os.lambyGuide.view}));results.push(['Active-balloon precondition',balloon]);
 if(balloon.active){await click('start-menu');assert(await page.evaluate(()=>window.__os.startOpen&&!window.__os.lambyGuide.active));results.push(['Start opens over an active Lamby balloon',true]);}else results.push(['Active balloon unavailable to fixture',false]);
 await load(4);await page.keyboard.down('ArrowDown');await wait(650);await page.keyboard.up('ArrowDown');await shot('maya-floor');
 results.push(['Floor static screenshot saved',true,'Actual rug view is checked separately by probe-cx3a-rug.mjs; this is not a temporal flicker assertion.']);
} catch(e){results.push(['ERROR',e.stack]);await shot('probe-final-failure');} finally {fs.writeFileSync(`${out}/probe-final.json`,JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors}));process.exitCode=errors.length||results.some(r=>r[0]==='ERROR'||r[1]===false)?1:0;await browser.close();}
