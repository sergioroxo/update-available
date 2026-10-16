import puppeteer from 'puppeteer-core';import fs from 'node:fs';
const port=process.argv[2]||3222,phase=process.argv[3]||'before',dir=`out/opening-blockers/${phase}`;fs.mkdirSync(dir,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--disable-background-networking'],defaultViewport:{width:1280,height:720,deviceScaleFactor:1}});
const wait=ms=>new Promise(r=>setTimeout(r,ms));const results=[];
try{for(const route of ['idle','menu','startAgain']){
 console.log('route',route);const p=await browser.newPage();let errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto(`http://127.0.0.1:${port}/?reinterp=1&debug=1&kiosk=1&idlescale=4&era=2&cut=speedrun#home-armed`,{waitUntil:'load',timeout:120000});await p.waitForFunction(()=>window.__os,{timeout:120000});
 await p.evaluate(()=>document.addEventListener('pointerdown',()=>document.documentElement.requestFullscreen().catch(()=>{}),{once:true}));await p.mouse.click(10,10);await wait(300);
 console.log('loaded',p.url());const initial=await p.evaluate(()=>!!document.fullscreenElement);let attract=null;
 if(route==='idle'||route==='startAgain'){
 await p.waitForFunction(()=>window.__attract.state()==='attract',{timeout:30000});attract=await p.evaluate(()=>!!document.fullscreenElement);
 }
 console.log('attract',attract);const nav=p.waitForNavigation({waitUntil:'load',timeout:90000});
 if(route==='menu'){
 await p.keyboard.press('Escape');await p.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Restart')?.click());await wait(100);await p.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Yes, restart')?.click());
 }else if(route==='startAgain'){
 await p.mouse.click(10,10);await wait(100);await p.click('[data-attract-act="start"]');
 }
 await nav;console.log('reloaded',p.url());await p.waitForFunction(()=>window.__os,{timeout:120000});await wait(500);
 const reloaded=await p.evaluate(()=>({url:location.href,fullscreen:!!document.fullscreenElement,wake:document.querySelector('#restore-entrance')?.getAttribute('data-phase')}));
 if(route==='startAgain')await p.keyboard.press('Enter');else await p.mouse.click(640,360);await wait(500);const pressed=await p.evaluate(()=>({url:location.href,fullscreen:!!document.fullscreenElement}));
 results.push({route,initial,attract,reloaded,pressed,errors,pass:initial&&(attract===null||attract)&&!new URL(pressed.url).searchParams.has('era')&&!pressed.url.includes('#home-armed')&&!new URL(pressed.url).searchParams.has('fs')&&pressed.fullscreen});console.log(JSON.stringify(results.at(-1)));await p.close();
}}finally{fs.writeFileSync(`${dir}/02-fullscreen.json`,JSON.stringify(results.filter(x=>x.route==='idle'),null,2));fs.writeFileSync(`${dir}/03-restart.json`,JSON.stringify(results.filter(x=>x.route!=='idle'),null,2));await browser.close();}
