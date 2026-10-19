/** Visitor-path observations/interventions for --polish-probe. All actions go through walk's real mouse. */
import {mkdirSync,writeFileSync} from 'node:fs';
export function createPolishProbe(out){
 mkdirSync(out,{recursive:true});const events=[],seen=new Set();let helpStep=0,channelStep=0,deferStep=0;
 const save=()=>writeFileSync(`${out}/walk-probe.json`,JSON.stringify(events,null,2));
 async function capture(page,key,detail){if(seen.has(key))return;seen.add(key);events.push({key,...detail});save();await page.screenshot({path:`${out}/walk-${key}.png`});}
 return async({page,s,press})=>{
  const r=await page.evaluate(()=>{const o=window.__os,q=window.__graceQueue?.(),t=o.testimony;return {guide:{...o.lambyGuide.view},form:o.formAvailable,diary:o.diary?.open,callVisible:document.getElementById('reinterp-call')?.style.pointerEvents==='auto',helper:document.getElementById('reinterp-helper')?.textContent,story:t?.open?{stage:t.stage,topics:t.topics,web:t.web}:null,era:o.desktopEra,phase:o.phase,e2Stage:o.e2Stage,update:o.updateApp?.phase,toast:o.toast,clock:o.t,bed:performance.getEntriesByType('resource').filter(e=>e.name.includes('bed_2003')).length};});
  if(r.guide.text&&!r.guide.hidden&&r.callVisible)throw Error('Call overlaps Lamby');
  if(s.targets.some(t=>['whattodo','taskbar-whattodo','startpanel-close'].includes(t.id)))throw Error('Retired guidance surface is actionable');
  if(r.era==='e2'&&r.e2Stage==='silence'&&!s.driven&&!seen.has('e2-screen-to-continue')) {
   await capture(page,'e2-screen-to-continue',r);
   const pixel=()=>page.evaluate(()=>{const c=window.__os.canvas;return [...c.getContext('2d').getImageData(c.width-18,c.height-16,1,1).data];});
   const before=await pixel();let after=before;const end=Date.now()+1800;
   while(before.join()===after.join()&&Date.now()<end){await new Promise(r=>setTimeout(r,100));after=await pixel();}
   if(before.join()===after.join())throw Error('Reboot pilot did not pulse');
   events.push({pass:'2003 blue pilot changes colour on dirty uploads',before,after});save();await page.screenshot({path:`${out}/walk-e2-pilot-second-state.png`});
  }
  if(r.toast?.t>7 && r.era==='e1')await capture(page,'e1-held-overlay',r);
  if(s.driven)return {};
  if(s.era==='e1'&&s.phase==='desktop'&&helpStep<9){
   const ids=['lg-tray','lg-x','lg-tray','lg-x','start-menu','sm-allsteps','steps-close','start-menu','start-menu'];
   const id=ids[helpStep],t=s.targets.find(t=>t.id===id);
   if(t){await press(t,s);helpStep++;events.push({press:id});save();if(helpStep===1)await capture(page,'e1-lamby',r);if(helpStep===6)await capture(page,'e1-start-list',r);return {handled:true};}
  }
  if(s.era==='e1'&&r.guide.beat==='channel'&&!r.guide.hidden&&channelStep<2){
   const id=channelStep===0?'lg-tray':'lg-x',t=s.targets.find(t=>t.id===id);
   if(t){await press(t,s);channelStep++;if(channelStep===1)await capture(page,'irc-watch-guidance',r);return {handled:true};}
  }
  if(s.era==='e1'&&deferStep===0&&s.targets.some(t=>t.id==='remind-later')) {
   await press(s.targets.find(t=>t.id==='remind-later'),s);deferStep=1;events.push({press:'remind-later'});save();return {handled:true};
  }
  if(s.era==='e1'&&r.update==='reminded'&&deferStep>0&&deferStep<3) {
   const id=deferStep===1?'lg-tray':'lg-x',t=s.targets.find(t=>t.id===id);
   if(t&&!r.guide.hidden){await press(t,s);deferStep++;if(deferStep===2)await capture(page,'deferred-update-help',r);return {handled:true};}
   await new Promise(r=>setTimeout(r,300));return {handled:true};
  }
  if(r.guide.rung==='form'&&!r.guide.hidden){await capture(page,'form-offer',r);const t=s.targets.find(t=>t.id==='lg-take');if(t){await press(t,s);events.push({press:'lg-take',reason:'Family Form offer'});save();return {handled:true};}}
  if(r.story?.stage==='prep'&&s.targets.some(t=>t.id==='ts-faster')&&!seen.has('story-faster')){await capture(page,'story-faster',r);await press(s.targets.find(t=>t.id==='ts-faster'),s);await capture(page,'story-six-topics',r);return {handled:true};}
  if(r.story?.stage==='online'&&r.story.web==='done')await capture(page,'story-disabled-links',r);
  if(r.diary)await capture(page,'diary',r);
  if(s.era==='e2'&&s.phase==='desktop'&&!r.guide.hidden)await capture(page,'e2-guide',r);
  if(s.era==='e4'&&s.targets.some(t=>t.id==='lg-tray'))await capture(page,'e4-symbol',r);
  return {};
 };
}
