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
 await load(4);await page.evaluate(()=>window.__os.debugJump('e4Browser')); await wait(5000);fs.writeFileSync(`${out}/e4-restored.json`,JSON.stringify(await state(),null,2));await shot('maya-console');
 await page.evaluate(()=>{const b=window.__os.e4.browser;b.debugJumpTo('care');b.mode='free';b.version++;});await wait(700);fs.writeFileSync(`${out}/care-state.json`,JSON.stringify(await state(),null,2));await click('care4');assert(await page.evaluate(()=>window.__os.e4.browser.undone.has(4)));results.push(['Junie Unmute',true]);await shot('junie-unmuted');
} catch(e){results.push(['ERROR',e.stack]);await shot('probe2-failure');} finally {fs.writeFileSync(`${out}/probe-maya.json`,JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors}));process.exitCode=errors.length||results.some(r=>r[0]==='ERROR'||r[1]===false)?1:0;await browser.close();}
