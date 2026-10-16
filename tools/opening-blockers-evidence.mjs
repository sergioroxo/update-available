import puppeteer from 'puppeteer-core';import fs from 'node:fs';
const port=process.argv[2]||3220,dir='out/opening-blockers';
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--disable-background-networking'],defaultViewport:{width:1280,height:720,deviceScaleFactor:1}});
const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(String(e)));const results={};
const tick=s=>p.evaluate(s=>{for(let i=0;i<s*10;i++){__app.fire('update',.1);__os.draw();const h=__os.hits.find(h=>h.id==='wotd-ok');if(h)__os.handleClick(h.x+h.w/2,h.y+h.h/2)}},s);
// Render the actual desktop canvas into a nearest-neighbour evidence plate, no re-created UI.
const shot=async name=>{await p.evaluate(()=>{__os.draw();let c=document.querySelector('#evidence');if(!c){c=document.createElement('canvas');c.id='evidence';Object.assign(c.style,{position:'fixed',inset:'0',width:'100vw',height:'100vh',zIndex:'99999',imageRendering:'pixelated'});document.body.append(c)}c.width=1280;c.height=720;const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='black';g.fillRect(0,0,1280,720);g.drawImage(__os.canvas,160,0,960,720)});await p.screenshot({path:`${dir}/${name}.png`});await p.evaluate(()=>document.querySelector('#evidence')?.remove())};
try{
await p.goto(`http://127.0.0.1:${port}/?reinterp=1&debug=1&kiosk=0&era=2&descent=0`,{waitUntil:'load'});await p.waitForFunction(()=>window.__os&&window.__app);await tick(2);
await p.evaluate(()=>{const o=__os;o.openTestimony();o.testimony.open=false;o.testimony.onFile('testimony-online');o.testimony.onDone()});await tick(20);
await p.evaluate(()=>{const o=__os;o.sendOffer.open=true;o.resolveSend('declined');o.draw()});await tick(.2);results.toast=await p.evaluate(()=>({pending:__os.messagePending,act:__os.toast?.act,held:__os.sendOfferPending}));await shot('caleb-toast-2003');
// Deferred announcement while the screen is turned away; delivery itself is already complete.
results.facing=await p.evaluate(()=>{const o=__os;o.toast=null;o.messageNoticeShown=false;o.screenFacing=false;for(let i=0;i<20;i++)o.update(.1);const away={pending:o.messagePending,notice:o.messageNoticeShown};o.screenFacing=true;o.update(.1);return {away,returned:{notice:o.messageNoticeShown,act:o.toast?.act}}});
await p.evaluate(()=>{const o=__os;o.setDesktopEra('e1',true);o.toast=null;o.debugJump('desktop')});await tick(2);await shot('getting-started-1997');
await p.evaluate(()=>{const o=__os;o.startPanels.e1.close();o.insertKit();o.kit.open=false;o.kit.onConnect();o.draw()});await shot('portal-1997');
results.portal=await p.evaluate(()=>{const o=__os,h=o.web.hits.find(h=>h.id==='web-join');const before=__ledger().records.length;o.web.handleClick(h.x+h.w/2,h.y+3);return {joinRect:h,joined:!!o.irc,webMinimised:!o.web.open,recordsAdded:__ledger().records.length-before}});
await p.evaluate(()=>{const o=__os;o.irc.debugHook();o.irc.beginEscalation();for(let i=0;i<2000&&!o.formAvailable;i++){o.irc.update(.1);if(o.irc.escAwaitingReply)o.irc.chooseReply(0);}o.irc.escalating=false;o.irc.escAwaitingReply=false;o.irc.dmOpen=false;o.draw();const r=o.irc.closeRect[0];o.handleClick(r.x+r.w/2,r.y+r.h/2);o.draw()});await shot('irc-closed-1997');
results.questionGuards=await p.evaluate(()=>{const o=__os,a=o.irc;const out=[];for(const mode of ['request','send','reply','picture']){a.open=true;a.dmRequested=mode==='request';a.dmAccepted=false;a.sendOffered=mode==='send';a.sendAccepted=false;a.chanAwaitingReply=mode==='reply';o.yesOpen=mode==='picture';o.draw();a.handleClick(403,41);out.push({mode,open:a.open,closeRect:a.closeRect.length})}return out});
results.errors=errors;fs.writeFileSync(`${dir}/after/extra-checks.json`,JSON.stringify(results,null,2));console.log(results);
}finally{await b.close()}
