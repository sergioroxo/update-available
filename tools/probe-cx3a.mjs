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
 await load();
 await page.evaluate(()=>window.__os.debugJump('desktop'));await wait(1000);
 fs.writeFileSync(`${out}/initial-state.json`,JSON.stringify(await state(),null,2));
 results.push(['sensor facts',await page.evaluate(()=>({touch:navigator.maxTouchPoints,coarse:matchMedia('(pointer: coarse)').matches,buttons:[...document.querySelectorAll('button')].filter(b=>b.textContent==='Look with your device').map(b=>({style:b.getAttribute('style'),display:getComputedStyle(b).display}))}))]);
 results.push(['desktop gyro hidden',await page.evaluate(()=>[...document.querySelectorAll('button')].filter(b=>b.textContent==='Look with your device'&&getComputedStyle(b).display!=='none').length===0)]);
 await click('icon-rootcause');assert(await page.evaluate(()=>!!window.__os.rootCause?.open));results.push(['Root Cause desktop launch',true]);await shot('root-desktop');
 await click('rootcause-close');await click('start-menu');await click('sm-allsteps');await shot('start-list');await click('sm-prog:icon-rootcause');assert(await page.evaluate(()=>!!window.__os.rootCause?.open));results.push(['Root Cause ordered Start list',true]);
 await click('rootcause-close');
 await page.evaluate(()=>{window.__os.lambyGuide.press('lg-tray');window.__os.dirty=true;});await wait(200);await click('start-menu');assert(await page.evaluate(()=>window.__os.startOpen&&!window.__os.lambyGuide.active));results.push(['Start closes Lamby',true]);
 await click('start-menu');
 await page.evaluate(()=>window.__os.debugJump('profile'));await wait(600);
 const ids=(await state()).targets.map(t=>t.id);assert(ids.some(i=>i.startsWith('picon:'))&&ids.some(i=>i.startsWith('pchip:'))&&ids.some(i=>i.startsWith('pgoal:')));results.push(['single profile page',true]);await shot('profile');
 await load(2);await page.evaluate(()=>window.__os.debugJump('calebResidue'));await wait(6000);fs.writeFileSync(`${out}/residue-state.json`,JSON.stringify(await state(),null,2));
 await shot('closure');
 results.push(['closure Continue reachable',(await state()).targets.some(t=>t.id==='residue')]);
 await load(4);await shot('maya-default');
 const m=await page.evaluate(async()=>{const {mapState}=await import('/src/witness/map.ts');return mapState(window.__os).eras.slice(0,3).map(e=>({era:e.id,done:e.beats.filter(b=>b.state==='done').length}));});assert(m.every(e=>e.done===0));results.push(['unplayed eras not done',true,m]);
} catch(e){results.push(['ERROR',e.stack]);await shot('probe-failure');} finally {fs.writeFileSync(`${out}/probe.json`,JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors}));process.exitCode=errors.length||results.some(r=>r[0]==='ERROR'||r[1]===false)?1:0;await browser.close();}
