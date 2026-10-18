/** Additional visitor-path assertions for walk.mjs --blocker-probe <name>.
 * Review state is read only; all actions use the walker's real mouse presses.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
export function createBlockerProbe(name, directory) {
  mkdirSync(directory, {recursive:true});
  const events=[]; const seen=new Set(); let jumpStep=0;
  const save=()=>writeFileSync(join(directory,`${name}.json`),JSON.stringify(events,null,2));
  const capture=async(page,key,detail)=>{
    if(seen.has(key))return;seen.add(key);events.push({key,...detail});save();
    await page.screenshot({path:join(directory,`${name}-${key.replaceAll(':','-')}.png`)});
  };
  return async ({page,s,press}) => {
    const read=await page.evaluate(()=>{
      const os=window.__os, p=os.provotype, a=os.accountability, c=os.caleb;
      return {era:os.desktopEra,browser:os.e4?.browser?.phase,mode:os.e4?.browser?.programMode,
        messenger:!!os.caleb?.open,settle:os.e4?.browser?.settleT,browserTime:os.e4?.browser?.t,handedOff:os.e4?.handedOff,pose:window.__camPose(), reached:window.__ledger().reachedEras,
        records:window.__ledger().e4Space,
        dossier:p?.open&&p.phase==='debrief'?{id:p.data.id,page:p.debriefPage}:null,
        alert:a?{running:a.alertRunning,stamp:a.stampVisible,mail:a.mailOpen,redacted:c?.redaction.blackedRows??0}:null};
    });
    if(read.era==='e2'&&read.messenger&&!s.driven&&Math.hypot(read.pose.x,read.pose.y-1.16,read.pose.z-0.7)>0.12)throw Error('Messenger opened away from Daniel’s room seat');
    await capture(page,read.era+':'+read.browser+(read.era==='e4'?':'+read.mode:''),read);
    if(read.browser==='saver'&&read.settle===0)await capture(page,'2026-screensaver-visible',read);
    if(read.browser==='restoring'&&read.browserTime>2)await capture(page,'2026-restoring-visible',read);
    if(read.dossier)await capture(page,`dossier-${read.dossier.id}-${read.dossier.page}`,read);
    // Let the intervention actually redact before the reachability policy dismisses it.
    if(name==='audit' && read.alert?.running && read.alert.redacted<2) {
      await new Promise(r=>setTimeout(r,400));return {handled:true};
    }
    if(read.alert?.running&&read.alert.redacted>=2)await capture(page,'one-alert-after-redaction',read);
    if(read.alert&&!read.alert.running&&!read.alert.redacted&&!read.alert.stamp)await capture(page,'chat-readable',read);
    if((name.startsWith('visitor-jump')||name==='direct-jump')&&jumpStep<4&&s.era===(name==='direct-jump'?'e2':'e1')&&s.phase==='desktop') {
      const panel=s.targets.find(t=>t.id==='startpanel-close');
      if(name==='direct-jump'&&panel){await press(panel,s);return {handled:true};}
      const id=['start-menu','sm-jump',name==='direct-jump'?'sm-jump-e4':'sm-jump-e2','jump-confirm'][jumpStep];
      const t=s.targets.find(t=>t.id===id);
      if(t){await press(t,s);jumpStep++;events.push({press:id});save();return {handled:true};}
    }
    if(s.era==='e4'&&!s.driven) {
      if(read.handedOff&&!s.spine?.startsWith('done')&&!read.records.some(e=>e.id==='headset'))throw Error('2026 arrived already handed off');
      if(read.browser==='dormant')throw Error('2026 browser dormant on arrival');
      if(read.browser==='open'&&read.mode==='program') {
        if(!read.records.some(e=>e.id==='session'))throw Error('Restored page reached without session record');
        if(!seen.has('session-pass')){seen.add('session-pass');events.push({pass:'screensaver → restore → L'});save();}
        if(name==='arrival'||name==='visitor-jump'||name==='direct-jump')return {stop:true};
      }
    }
    return {};
  };
}
