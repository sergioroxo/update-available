/** Pure state-machine tests. Compile in memory; no browser or game-state shortcuts. */
import ts from 'typescript';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const copy = JSON.parse(fs.readFileSync('data/strings/lambyGuide.json','utf8'));
const decisions = JSON.parse(fs.readFileSync('data/strings/cx3b.json','utf8'));
const js = ts.transpileModule(fs.readFileSync('src/narrative/lambyGuide.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText.replace(/import copy from .*?;/,`const copy = ${JSON.stringify(copy)};`).replace(/import decisions from .*?;/, `const decisions = ${JSON.stringify(decisions)};`);
const { LambyGuide } = await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
let logs=[],acts=[];
const make=()=>new LambyGuide({log:(...x)=>logs.push(x),act:x=>acts.push(x)});
const input=(beat='checkin',extra={})=>({era:'e2',map:{current:{era:'e2',beat:{id:beat}},quiet:false},silent:false,voice:false,idleScale:1,startTarget:'start-menu',...extra});
const g=make();g.tick(25,input());assert.equal(g.view.rung,'cue');g.activity();assert.equal(g.view.rung,'silent');g.tick(49,input());assert.equal(g.view.text,null);g.tick(1,input());assert.equal(g.view.rung,'tip');g.press('lg-later');assert.equal(logs.at(-1)[2],true);g.tick(89,input());assert.equal(g.view.text,null);g.tick(1,input());assert.equal(g.view.rung,'again');g.press('lg-later');g.tick(90,input());assert.equal(g.view.rung,'start');g.press('lg-x');g.tick(1000,input());assert.equal(g.view.text,null);
// Explicit help is still available after the last rung and the per-era cap.
for(const beat of ['story','release','tapes','online']){g.tick(50,input(beat));g.press('lg-x');}
g.tick(500,input('send'));assert.equal(g.view.text,null);assert(g.press('lg-tray'));assert.equal(g.view.rung,'tip');assert(g.press('lg-show'));assert.equal(g.view.targets[0],'icon-send');g.press('lg-take');assert.equal(acts.at(-1),'press:icon-send');
// The guide can highlight answers, but cannot accept a release or either consent for someone.
for(const [era,beat] of [['e2','release'],['e3','consent'],['e1','pledge'],['e1','channel']]){const h=make();h.tick(50,input(beat,{era,map:{current:{era,beat:{id:beat}},quiet:false}}));h.press('lg-show');if(era==='e3'&&beat==='consent'){assert.equal(h.view.act,'focus:consent-allow');h.press('lg-take');assert.equal(acts.at(-1),'focus:consent-allow');}else{assert.equal(h.view.act,undefined);assert.equal(h.press('lg-take'),false);}}
// Silence wins over requested and unsolicited help, including a currently visible pointer.
const h=make();h.tick(50,input());h.press('lg-show');h.tick(0,input('checkin',{silent:true}));assert(h.view.hidden);assert(!h.active);assert(!h.press('lg-tray'));h.tick(90,input('checkin',{map:{current:{era:'e2',beat:{id:'checkin'}},quiet:true}}));assert(h.view.hidden);
const f=make(),fi=input('channel',{era:'e1',map:{current:{era:'e1',beat:{id:'channel'}},quiet:false},formAvailable:true});f.tick(0,fi);assert.notEqual(f.view.rung,'form');f.tick(49,fi);assert.notEqual(f.view.rung,'form');f.tick(1,fi);assert.equal(f.view.rung,'form');f.press('lg-take');assert.equal(acts.at(-1),'open:form');f.tick(0,{...fi,silent:true,formOpened:true});f.tick(0,fi);assert.notEqual(f.view.rung,'form');
const v=make();v.tick(500,input('checkin',{voice:true}));assert(v.view.hidden);v.tick(49,input());assert(!v.active);v.tick(1,input());assert(v.active);
console.log('Lamby guide: escalation terminates; caps/requested help; answer protection; silence/voice gates; one-time form offer OK.');

const channel=make(),ci=input('channel',{era:'e1',map:{current:{era:'e1',beat:{id:'channel'}},quiet:false}});channel.tick(50,ci);channel.press('lg-later');channel.tick(1000,ci);assert.equal(channel.view.text,null);
const cut=make();cut.tick(50,input('cut'));assert(cut.active);cut.press('lg-later');cut.tick(1000,input('cut'));assert(!cut.active);
const rm=make();rm.tick(50,input('checkin',{reducedMotion:true}));rm.press('lg-show');for(let n=0;n<10;n++){rm.tick(.4,input('checkin',{reducedMotion:true}));assert.equal(rm.view.frame,0);}
console.log('Channel has no fourth rung; edit info appears once; reduced-motion guide does not animate.');

const unattended=make();unattended.tick(50,input());unattended.press('lg-later');unattended.tick(90,input());assert.equal(unattended.view.rung,'again');unattended.tick(90,input());assert.equal(unattended.view.rung,'start');unattended.press('lg-x');unattended.tick(1000,input());assert(!unattended.active);
console.log('An unanswered second line reaches the final Start nudge once, then stops.');

// Requested help survives an operable voice, but must not cross a felt/respite silence gate.
const queued=make();queued.tick(0,input('checkin',{voice:true}));assert(queued.press('lg-tray'));queued.tick(0,input());assert(queued.active);assert.equal(queued.view.rung,'tip');
const cancelled=make();cancelled.tick(0,input('checkin',{voice:true}));cancelled.press('lg-tray');cancelled.tick(0,input('checkin',{silent:true}));cancelled.tick(0,input());assert(!cancelled.active);
console.log('Requested help waits for one voice; a quiet scene cancels the pending request.');

const deferred=make();deferred.tick(0,input('',{era:'e1',map:{current:null,quiet:false},deferredUpdate:true}));deferred.press('lg-tray');assert.equal(deferred.view.beat,'update');assert.equal(deferred.view.text,copy.eras.e1.update.tip);console.log('Deferred update help follows actual update state after the map is ticked.');

// S268: the Root Cause offer comes once the Family Form is filed (his (C): the questionnaire → Root Cause → the racket)
const rootMap=make(), rootInput=input('rootcause',{era:'e1',map:{current:{era:'e1',beat:{id:'rootcause'}},quiet:false},formFiled:true,rootOpened:false});
rootMap.tick(0,rootInput);assert(rootMap.view.text.includes(decisions.helper.map));rootMap.press('lg-later');rootMap.tick(500,rootInput);assert(!rootMap.active);rootMap.press('lg-tray');assert(!rootMap.view.text.includes(decisions.helper.map));
console.log('Whole-map mention shares the one-time optional add-on balloon and never repeats.');

// Restorify's one-time invitation uses the existing cap and silence/voice gates.
const personaliseText=JSON.parse(fs.readFileSync('data/dialog/s2_lamby.json','utf8')).personaliseOffer;
const pi=input('story',{personaliseOffer:personaliseText});
const pg=make();pg.tick(0,{...pi,voice:true});assert(!pg.active);
pg.tick(0,{...pi,silent:true});assert(!pg.active);
pg.tick(0,pi);assert.equal(pg.view.rung,'personalise');assert.equal(pg.view.text,personaliseText);
pg.tick(0,{...pi,silent:true});assert(!pg.active);assert(!pg.press('lg-take'));
pg.tick(0,pi);pg.press('lg-later');assert.equal(logs.at(-1)[0],'dismissed');assert.equal(logs.at(-1)[1],'personalise');
pg.tick(1000,pi);assert(!pg.active);
const pc=make();pc.tick(0,pi);pc.press('lg-take');assert.equal(acts.at(-1),'open:personalise');
const capped=make();for(const beat of ['checkin','story','release','tapes','online']){capped.tick(50,input(beat));capped.press('lg-ok');}
capped.tick(0,pi);assert(!capped.active);
console.log('Restorify personalisation: one balloon; silence and voice gates; dismissal logged; navigation only; era cap respected.');

// S390: the teaching TV — Lamby offers ONCE per era to take a stalled visitor back to it: only after a tip-wait and a half
//   of quiet with nothing better to say, never over another voice, its Yes is navigation only ('open:tv'), its No is
//   logged by name, and it counts toward the era's cap.
const tvLine='The fellowship\'s tape has more parts. Shall I take you back to the TV?';
const tvIn=(extra={})=>input('nothing-here',{era:'e1',map:{current:{era:'e1',beat:{id:'nothing-here'}},quiet:false},tvOffer:tvLine,...extra});
const tv=make();tv.tick(74,tvIn());assert.notEqual(tv.view.rung,'tv');tv.tick(1,tvIn({voice:true}));assert(!tv.active);
tv.tick(80,tvIn());tv.tick(0.1,tvIn());assert.equal(tv.view.rung,'tv');assert.equal(tv.view.text,tvLine);tv.press('lg-later');assert.equal(logs.at(-1)[0],'dismissed');assert.equal(logs.at(-1)[1],'tv');
tv.tick(1000,tvIn());assert.notEqual(tv.view.rung,'tv');
const tvYes=make();tvYes.tick(80,tvIn());tvYes.tick(0.1,tvIn());tvYes.press('lg-take');assert.equal(acts.at(-1),'open:tv');tvYes.tick(1000,tvIn());assert(!tvYes.active);
const tvCap=make();for(const beat of ['kit','read','pray','pledge','connect','web','channel']){tvCap.tick(50,input(beat,{era:'e1',map:{current:{era:'e1',beat:{id:beat}},quiet:false}}));tvCap.press('lg-ok');}
tvCap.tick(500,tvIn());tvCap.tick(0.1,tvIn());assert.notEqual(tvCap.view.rung,'tv');
console.log('Teaching TV offer: once per era, after a stall, never over a voice; navigation only; dismissal logged; era cap respected.');

// S401 (job 29 D2): the person's file — Lamby points at it ONCE per era, on a stall, never over a voice or a quiet scene;
//   it points (the item is its target), Take me there presses the item (navigation: it opens, read only), × is logged by
//   name, and it counts toward the era's cap.
const fileLine='I\'ve kept everything for you, Daniel. Your file is right down here.';
const fileIn=(extra={})=>input('nothing-here',{era:'e1',map:{current:{era:'e1',beat:{id:'nothing-here'}},quiet:false},fileOffer:fileLine,fileTarget:'file-tray',...extra});
const fo=make();fo.tick(74,fileIn());assert.notEqual(fo.view.rung,'file');fo.tick(1,fileIn({voice:true}));assert(!fo.active);
fo.tick(80,fileIn({map:{current:{era:'e1',beat:{id:'nothing-here'}},quiet:true}}));assert(!fo.active);
fo.tick(80,fileIn());fo.tick(0.1,fileIn());assert.equal(fo.view.rung,'file');assert.equal(fo.view.text,fileLine);assert.deepEqual(fo.view.targets,['file-tray']);
fo.press('lg-x');assert.equal(logs.at(-1)[0],'dismissed');assert.equal(logs.at(-1)[1],'file');
fo.tick(1000,fileIn());assert.notEqual(fo.view.rung,'file');
const foYes=make();foYes.tick(80,fileIn());foYes.tick(0.1,fileIn());foYes.press('lg-take');assert.equal(acts.at(-1),'press:file-tray');foYes.tick(1000,fileIn());assert(!foYes.active);
const foCap=make();for(const beat of ['kit','read','pray','pledge','connect','web','channel']){foCap.tick(50,input(beat,{era:'e1',map:{current:{era:'e1',beat:{id:beat}},quiet:false}}));foCap.press('lg-ok');}
foCap.tick(500,fileIn());foCap.tick(0.1,fileIn());assert.notEqual(foCap.view.rung,'file');
console.log('The file: Lamby points once per era, after a stall, never over a voice or a quiet scene; Take me there presses the item; × logged; era cap respected.');

// S392: the teaching TV's CALL — when the piece takes the visitor to the TV, Lamby says where it is OVER the TV's own hold
//   (voice: true), once per era; Take me there is 'open:tv'; × is logged by name; it comes down when the call is taken down.
const callLine='Your Un-Walk kit says: watch the fellowship\'s tape before step 2. The TV is behind you. I\'ll take you there.';
const callIn=(extra={})=>input('kit',{era:'e1',map:{current:{era:'e1',beat:{id:'kit'}},quiet:false},voice:true,tvCall:callLine,...extra});
const call=make();call.tick(0.1,callIn());assert.equal(call.view.rung,'tvcall');assert(call.active);assert.equal(call.view.text,callLine);
call.press('lg-take');assert.equal(acts.at(-1),'open:tv');call.tick(0.1,callIn());assert.notEqual(call.view.rung,'tvcall');
const callX=make();callX.tick(0.1,callIn());callX.press('lg-x');assert.equal(logs.at(-1)[0],'dismissed');assert.equal(logs.at(-1)[1],'tvcall');
callX.tick(1,callIn());assert(!callX.active);
const callGone=make();callGone.tick(0.1,callIn());callGone.tick(0.1,callIn({tvCall:undefined}));assert(!callGone.active);
console.log('Teaching TV call: said over the TV\'s hold, once per era; Take me there is navigation; × logged; taken down with the moment.');

// S306: a timed surface must retain its pending action while the real guide speaks.
const waitJs = ts.transpileModule(fs.readFileSync('src/narrative/guideWait.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 }
}).outputText;
const { GuideWait } = await import('data:text/javascript;base64,' + Buffer.from(waitJs).toString('base64'));
const handoff = new GuideWait(), speaking = make();
speaking.tick(50, input());
let opened = [];
handoff.run('letter', speaking.active, () => opened.push('letter'));
handoff.tick(19, speaking.active);
assert.deepEqual(opened, []);
// A second opener gets its own full allowance, rather than inheriting the letter's elapsed wait.
handoff.run('evening', speaking.active, () => opened.push('evening'));
handoff.tick(1, speaking.active);
assert.deepEqual(opened, ['letter']);
handoff.tick(0, speaking.active);
assert.deepEqual(opened, ['letter']); // delivery happens exactly once
speaking.press('lg-x');
handoff.tick(0, speaking.active);
assert.deepEqual(opened, ['letter', 'evening']); // dismissal releases immediately
// Repeated retries neither restart the cap nor duplicate a queued forced open.
const forced = new GuideWait();
for (let second = 0; second < 20; second++) {
  forced.run('form', true, () => opened.push('form'));
  forced.tick(1, true);
}
assert.equal(opened.filter(x => x === 'form').length, 1);
forced.run('old-era', true, () => assert.fail('retired action delivered'));
forced.clear();
forced.tick(20, false);
assert(forced.ready('new-era', false));
const polling = new GuideWait();
assert(!polling.ready('checkin', true));
polling.tick(19.9, true);
assert(!polling.ready('checkin', true));
polling.tick(.1, true);
assert(polling.ready('checkin', true));
console.log('System hand-offs: per-opener 20 s cap, immediate dismissal, retained actions, retry deduplication, era/exit cancellation OK.');
