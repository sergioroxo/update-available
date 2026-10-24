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
 await load(1);await page.evaluate(()=>{const o=window.__os;o.debugJump('kit');o.kit.open=false;o.kit.onConnect();o.dirty=true;});await wait(1000);
 await click('web-search');assert(await page.evaluate(()=>window.__os.web.view.kind==='results'));results.push(['NetPilot Search returns pressable suggestions/results',true]);await shot('netpilot-results');
 await click('web-home');await click('web-res:root');assert(await page.evaluate(()=>window.__os.rootCause?.open));results.push(['Understanding the Root launches ROOTCAUSE.EXE',true]);await shot('root-from-netpilot');
 await page.evaluate(()=>{const o=window.__os;o.rootCause=null;o.web=null;o.debugJump('diary');});await wait(600);const st=await state();const p=st.targets.find(t=>t.id==='diary-press'||t.id==='diary');if(p)await click(p.id);else {const t=st.targets.find(t=>t.surface==='os');if(t)await click(t.id);}
 await page.evaluate(()=>window.__os.diary.press());await wait(700);await shot('diary-automatic');results.push(['Diary automatic continuation label',await page.evaluate(()=>window.__os.diary.phase==='writing')]);
 await page.evaluate(()=>{const o=window.__os;o.diary=null;o.web=null;o.kit=null;o.hasUnseenWitness=true;o.dirty=true;});await wait(9200);assert(await page.evaluate(()=>!window.__os.hasUnseenWitness));results.push(['Blue cue stops after eight seconds',true]);
 const setup=await page.evaluate(async()=>{const {LambySetup}=await import('/src/desktop/setup/setup.ts');const s=new LambySetup();const c=document.createElement('canvas');c.width=512;c.height=384;const ctx=c.getContext('2d');s.draw(ctx,512,384);const h=s.hits.find(h=>h.id==='setup-choice-0');s.handleClick(h.x+2,h.y+2);const after=s.stage;for(let i=0;i<60;i++)s.update(1);const held=s.stage;s.draw(ctx,512,384);s.handleClick(128+8,169+8);const next=s.stage;return {after,held,next};});assert(setup.after===setup.held&&setup.next!==setup.held);results.push(['Setup waits for visitor between balloons',true,setup]);
 const model=await page.evaluate(async()=>{const {buildStartModel}=await import('/src/witness/startModel.ts');const {ledger}=await import('/src/state/ledger.ts');const prev=[...ledger.records];ledger.records.push('profile-initialized','kit-inserted','kit-read','prayer-said','pledge-signed','went-online','channel-joined');const m=buildStartModel({irc:{requestPending:false,sendPending:false}},'e1');ledger.records.splice(0,ledger.records.length,...prev);return m;});assert(!model.next.some(s=>['request','image'].includes(s.id))&&!model.now.hint.includes('Accept'));results.push(['Start waits for actual Rob prompts',true,model.now]);
} catch(e){results.push(['ERROR',e.stack]);await shot('probe3-failure');} finally {fs.writeFileSync(`${out}/probe3.json`,JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors}));process.exitCode=errors.length||results.some(r=>r[0]==='ERROR'||r[1]===false)?1:0;await browser.close();}
