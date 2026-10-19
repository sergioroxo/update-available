/** Short opening probe: real projected setup presses, ending at the Start/Lamby lesson. */
import puppeteer from 'puppeteer-core';
import {mkdirSync,writeFileSync} from 'node:fs';
const port=Number(process.argv[process.argv.indexOf('--port')+1]||3215),out='out/playtest-polish';mkdirSync(out,{recursive:true});
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle'],defaultViewport:{width:1280,height:900}});
const p=await b.newPage(),events=[],errors=[];p.on('pageerror',e=>errors.push(String(e)));const wait=ms=>new Promise(r=>setTimeout(r,ms));
try{
 await p.goto(`http://localhost:${port}/?reinterp=1&debug=1&descent=0&kiosk=0`,{waitUntil:'load',timeout:180000});
 await p.waitForSelector('#restore-entrance[data-phase="wake"]',{timeout:180000});await p.mouse.click(640,450);
 async function press(id){await p.waitForFunction(id=>JSON.parse(document.getElementById('restore-entrance')?.dataset.setupHits||'[]').some(h=>h.id===id),{timeout:30000},id);const h=await p.evaluate(id=>JSON.parse(document.getElementById('restore-entrance').dataset.setupHits).find(h=>h.id===id),id);await p.mouse.click(h.x+h.w/2,h.y+h.h/2);await wait(400);events.push({press:id});}
 for(const id of ['setup-choice-0','setup-choice-0','setup-choice-0','setup-close','setup-test','setup-sound-on','setup-choice-0'])await press(id);
 await p.screenshot({path:`${out}/setup-how-to-look.png`});await press('setup-close');await wait(700);await p.screenshot({path:`${out}/setup-lamby-and-start.png`});await press('setup-choice-0');await press('setup-start');await p.screenshot({path:`${out}/setup-start-list.png`});
 events.push({pass:'Start and Lamby lesson reached by normal setup path',errors});if(errors.length)throw Error(errors.join('\n'));
}catch(e){events.push({failure:String(e),errors});process.exitCode=1;}finally{writeFileSync(`${out}/setup-probe.json`,JSON.stringify(events,null,2));await b.close();}
