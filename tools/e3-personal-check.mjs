/** Focused review of the shared, read-only phone. Requires the local Vite server. */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const increment = process.argv[2] || 'core';
const out = path.resolve('out/codex-e3-message', increment);
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle'], defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 2 } });
try {
 const page = await browser.newPage();
 const errors = []; page.on('pageerror', e => errors.push(String(e)));
 await page.goto('http://127.0.0.1:3114/?reinterp=1&era=3&debug=1&descent=0&kiosk=0', { waitUntil: 'networkidle2' });
 await page.waitForFunction(() => window.__graceQueue?.());
 await page.screenshot({path:path.join(out,'00-room.png')});
 const result = await page.evaluate(async increment => {
  const { GraceQueueLite } = await import('/src/room/graceQueueLite.ts');
  const { ledger } = await import('/src/state/ledger.ts');
  const { veraDay } = await import('/src/state/veraDay.ts');
  const { recordCount } = await import('/src/witness/record.ts');
  const { mapState } = await import('/src/witness/map.ts');
  const checks = [], photos = {};
  const assert = (v, label) => { if (!v) throw Error(label); checks.push(label); };
  const canvas = document.createElement('canvas'); canvas.width=676; canvas.height=390;
  const ctx = canvas.getContext('2d');
  const pc = document.createElement('canvas'); pc.width=180; pc.height=360; const pctx=pc.getContext('2d');
  const fresh = () => { const q=new GraceQueueLite({onLight(){}}); q.settleArrival(); return q; };
  const paint = q => q.draw(ctx,676,390);
  const phone = q => q.drawPhone(pctx,180,360);
  const press = (q,id) => { paint(q); const r=q.rects.find(r=>r.id===id); assert(r, 'live '+id); q.handleClick(r.x+r.w/2,r.y+r.h/2); };
  const ppress = (q,id) => { phone(q); const r=q.phone.rects.find(r=>r.id===id); assert(r,'phone live '+id); q.handlePhoneClick(r.x+r.w/2,r.y+r.h/2); };
  let q=new GraceQueueLite({onLight(){}}); q.beginArrival(); q.update(120);
  assert(q.mode==='signin' && q.personalNotice,'normal arrival arms notice');
  q=fresh(); paint(q); phone(q);
  photos['01-notice']=canvas.toDataURL(); photos['02-lock']=pc.toDataURL();
  assert(q.personalQuiet && q.guideSilent,'notice silences guide');
  assert(q.phoneVersion>0,'phone dirtied with notice');
  assert(!q.rects.some(r=>r.id.startsWith('lg-')),'no guide controls');
  q.handleClick(0,100); assert(q.personalNotice,'miss retains notice');
  const before=JSON.stringify(ledger.checkins), count=recordCount();
  press(q,'personal-open'); paint(q); photos['03-thread']=canvas.toDataURL();
  assert(q.phone.personalOpen && q.phone.personalSeen && veraDay.personalMessageSeen,'desktop opens shared phone thread');
  assert(JSON.stringify(ledger.checkins)===before && recordCount()===count,'personal thread files nothing, including witness pulse');
  assert(mapState(window.__os).eras.find(e=>e.id==='e3').beats.find(b=>b.beat.id==='personal-message').state==='done','map reads memory');
  press(q,'signin'); assert(q.mode==='consent' && !q.phone.personalOpen && !q.personalQuiet,'sign in passes through thread on same release');
  for (const answer of [true,false]) { q=fresh(); press(q,'signin'); assert(q.mode==='consent' && !q.personalNotice,'sign in with notice'); q.decideConsent(answer); assert(q.mode==='board','consent '+answer); }
  q=fresh(); press(q,'personal-dismiss'); assert(!q.personalQuiet && !q.phone.personalSeen,'dismiss keeps phone unread'); q.settleArrival(); assert(!q.personalNotice,'notice never repeats');
  q=fresh(); press(q,'start-menu'); assert(!q.personalNotice && q.startMap.active,'Start clears notice');
  q=fresh(); press(q,'win-min'); assert(q.minimised && !q.personalNotice,'minimise clears notice');
  q=fresh(); q.phoneInHand=true; q.update(0); assert(!q.personalNotice,'pickup clears notice'); ppress(q,'personal-notification'); assert(q.phone.personalSeen,'phone opens same thread');
  q.closeForEraJump(); assert(!q.personalQuiet && !q.phone.personalOpen,'exit closes thread');
  q=fresh(); assert(!q.phone.personalSeen && q.personalNotice,'restart fresh instance');
  ppress(q,'personal-notification'); ppress(q,'back');
  const seen=[]; for(let i=0;i<4;i++){phone(q);seen.push(...q.phone.rects.map(r=>r.id)); assert(q.phone.rects.some(r=>r.id==='group'),'required group remains on inbox page '+i); const next=q.phone.rects.find(r=>r.id==='inbox-next');if(!next)break; q.handlePhoneClick(next.x+5,next.y+5);}
  assert(seen.includes('read-NualaMay'),'all backlog reachable');
  if(increment!=='core') { q=fresh(); q.phone.presentInbox(); phone(q); photos['04-groups']=pc.toDataURL(); }
  if(['b','c'].includes(increment)) { q=fresh(); q.phone.debugBeat('home'); ppress(q,'notes'); phone(q);photos['05-notes']=pc.toDataURL(); assert(q.phone.quietReading,'notes felt'); }
  if(increment==='c') { q=fresh(); q.phone.debugBeat('home'); ppress(q,'photos'); phone(q);photos['06-roll']=pc.toDataURL(); for(let i=0;i<4;i++){ppress(q,'photo-'+i);phone(q);photos['07-photo-'+i]=pc.toDataURL();ppress(q,'back');} }
  // Independent Malta/cascade path, following the phone's real controls.
  q=fresh(); q.phone.arm(); ppress(q,'notification'); ppress(q,'link'); ppress(q,'dismiss'); ppress(q,'link2'); ppress(q,'dismiss'); q.phone.tick(20,true); assert(q.phone.broken,'Malta and cascade still finish');
  return {checks,photos};
 },increment);
 for(const [name,url] of Object.entries(result.photos)) fs.writeFileSync(path.join(out,name+'.png'), Buffer.from(url.split(',')[1],'base64'));
 if(errors.length)throw Error(errors.join('\n'));
 fs.writeFileSync(path.join(out,'checks.json'), JSON.stringify(result.checks,null,2));
 console.log(`${increment}: ${result.checks.length} checks; ${Object.keys(result.photos).length+1} photographs in ${out}`);
} finally {await browser.close();}
