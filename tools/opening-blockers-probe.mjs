import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const port=Number(process.argv[2]||3222), phase=process.argv[3]||'before';
const dir=`out/opening-blockers/${phase}`;fs.mkdirSync(dir,{recursive:true});
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--disable-background-networking'],defaultViewport:{width:400,height:225,deviceScaleFactor:1}});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const page=await browser.newPage();let errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
async function load(era=2,cut='') {errors=[];await page.goto(`http://127.0.0.1:${port}/?reinterp=1&kiosk=0&debug=1&descent=0&era=${era}${cut?'&cut='+cut:''}`,{waitUntil:'load',timeout:120000});await page.waitForFunction(()=>window.__os&&window.__app,{timeout:120000});}
async function tick(seconds) {await page.evaluate(s=>{for(let i=0;i<s*10;i++){window.__app.fire('update',0.1);const o=window.__os;o.draw();const h=o.hits.find(x=>x.id==='wotd-ok');if(h)o.handleClick(h.x+h.w/2,h.y+h.h/2);}},seconds);}
async function press(id,index=0){return page.evaluate(({id,index})=>{const o=window.__os;o.draw();const h=o.hits.filter(x=>x.id===id)[index];if(!h)return false;o.handleClick(h.x+h.w/2,h.y+h.h/2);return true;},{id,index});}
const rows=[];
try {
for(const cut of ['', 'speedrun'])for(const variant of ['open','X','Close'])for(const answer of ['decline','go']) {
 await load(2,cut);await tick(3);
 const start=await page.evaluate(()=>({stage:__os.e2Stage,panel:__os.startPanels.e2.open,hits:__os.hits.map(h=>h.id)}));
 if(variant!=='open')await press('startpanel-close',variant==='Close'?1:0);
 await page.evaluate(()=>{const o=__os;o.openTestimony();o.testimony.open=false;o.testimony.onFile('testimony-online');o.testimony.onDone();});
 await tick(20);
 const s1=await page.evaluate(()=>__os.sendOffer?.id);if(s1==='s1'){await press('icon-send');await press('send-'+answer);}
 await tick(20);
 // A visited summons takes the camera away: inspect that it waits, then return the reviewer to the monitor.
 const away=await page.evaluate(()=>({facing:__os.screenFacing,pending:__os.messagePending,toast:__os.toast?.act}));
 if(answer==='go') {await tick(50);await page.keyboard.press('r');await tick(50);await page.evaluate(()=>{__os.screenFacing=true;});await tick(1);}
 const landed=await page.evaluate(()=>({pending:__os.messagePending,toast:__os.toast?.act,icon:__os.hits.some(h=>h.id==='icon-messenger'),notice:__os.messageNoticeShown,sends:__ledger().sends}));
 if(!await press('toast-act'))await press('icon-messenger');await tick(1);
 const opened=await page.evaluate(()=>({caleb:!!__os.caleb,ledger:__ledger().caleb}));
 rows.push({cut:cut||'full',variant,answer,start,s1,away,landed,opened,errors:[...errors],pass:landed.pending&&(landed.toast==='message-open'||landed.icon)&&opened.caleb&&opened.ledger.some(x=>JSON.stringify(x).includes('opened'))});
 console.log(JSON.stringify(rows.at(-1)));
}
fs.writeFileSync(`${dir}/01-caleb.json`,JSON.stringify(rows,null,2));
await load(2);await page.evaluate(()=>__os.debugJump('desktop')); // prepare Era 1 through the same OS shortcut as the walker
await page.evaluate(()=>{__os.setDesktopEra('e1',true);__os.debugJump('desktop');});
await tick(1.4);const early=await page.evaluate(()=>({open:__os.startPanels.e1.open,calm:__os.startPanelCalm()}));await tick(.3);const card=await page.evaluate(()=>({open:__os.startPanels.e1.open,calm:__os.startPanelCalm(),everShown:__os.startPanels.e1.everShown}));
await page.setViewport({width:1280,height:720,deviceScaleFactor:1});await page.screenshot({path:`${dir}/getting-started.png`});
fs.writeFileSync(`${dir}/05-invitation.json`,JSON.stringify({early,card,portalStart:await page.evaluate(async()=> (await import('/data/dialog/s1_browser.json')).default.portal.start||null)},null,2));
await page.evaluate(()=>{const o=__os;o.startPanels.e1.close();o.insertKit();o.kit.open=false;o.kit.onConnect();o.web.onJoin();o.irc.debugHook();o.irc.beginEscalation();for(let i=0;i<2000&&!o.formAvailable;i++){o.irc.update(.1);if(o.irc.escAwaitingReply)o.irc.chooseReply(0);}o.irc.escalating=false;o.irc.escAwaitingReply=false;o.irc.dmOpen=false;o.dirty=true;o.draw();});
const beforeIrc=await page.evaluate(()=>({open:__os.irc.open,closeRect:__os.irc.closeRect||null,form:__os.formAvailable,lines:__os.irc.channel.done.length}));
await page.evaluate(()=>{const o=__os,r=o.irc.closeRect?.[0]||{x:397,y:34,w:14,h:14};o.handleClick(r.x+r.w/2,r.y+r.h/2);o.dirty=true;o.draw();});
const closed=await page.evaluate(()=>({open:__os.irc.open,formIcon:__os.hits.some(h=>h.id==='icon-provotype-intake'),hits:__os.hits.map(h=>h.id),minimised:[...__os.minimised]}));
await page.screenshot({path:`${dir}/irc-closed.png`});
const formPressed=await press('icon-provotype-intake');const formOpen=await page.evaluate(()=>!!__os.provotype?.open);
await page.evaluate(()=>{if(__os.provotype)__os.provotype.open=false;__os.draw();});await press('icon-irc');
const restored=await page.evaluate(()=>({open:__os.irc.open,lines:__os.irc.channel.done.length}));
fs.writeFileSync(`${dir}/04-irc.json`,JSON.stringify({beforeIrc,closed,formPressed,formOpen,restored,errors},null,2));
} finally {await browser.close();}
