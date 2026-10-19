/** Pure state-machine tests. Compile in memory; no browser or game-state shortcuts. */
import ts from 'typescript';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const copy = JSON.parse(fs.readFileSync('data/strings/lambyGuide.json','utf8'));
const js = ts.transpileModule(fs.readFileSync('src/narrative/lambyGuide.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText.replace(/import copy from .*?;/,`const copy = ${JSON.stringify(copy)};`);
const { LambyGuide } = await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
let logs=[],acts=[];
const make=()=>new LambyGuide({log:(...x)=>logs.push(x),act:x=>acts.push(x)});
const input=(beat='checkin',extra={})=>({era:'e2',map:{current:{era:'e2',beat:{id:beat}},quiet:false},silent:false,voice:false,idleScale:1,startTarget:'start-menu',...extra});
const g=make();g.tick(25,input());assert.equal(g.view.rung,'cue');g.activity();assert.equal(g.view.rung,'silent');g.tick(49,input());assert.equal(g.view.text,null);g.tick(1,input());assert.equal(g.view.rung,'tip');g.press('lg-later');assert.equal(logs.at(-1)[2],true);g.tick(89,input());assert.equal(g.view.text,null);g.tick(1,input());assert.equal(g.view.rung,'again');g.press('lg-later');g.tick(90,input());assert.equal(g.view.rung,'start');g.press('lg-x');g.tick(1000,input());assert.equal(g.view.text,null);
// Explicit help is still available after the last rung and the per-era cap.
for(const beat of ['story','release','tapes','online']){g.tick(50,input(beat));g.press('lg-x');}
g.tick(500,input('send'));assert.equal(g.view.text,null);assert(g.press('lg-tray'));assert.equal(g.view.rung,'tip');assert(g.press('lg-show'));assert.equal(g.view.targets[0],'icon-send');g.press('lg-take');assert.equal(acts.at(-1),'press:icon-send');
// The guide can highlight answers, but cannot accept a release or either consent for someone.
for(const [era,beat] of [['e2','release'],['e3','consent'],['e1','pledge'],['e1','channel']]){const h=make();h.tick(50,input(beat,{era,map:{current:{era,beat:{id:beat}},quiet:false}}));h.press('lg-show');assert.equal(h.view.act,undefined);assert.equal(h.press('lg-take'),false);}
// Silence wins over requested and unsolicited help, including a currently visible pointer.
const h=make();h.tick(50,input());h.press('lg-show');h.tick(0,input('checkin',{silent:true}));assert(h.view.hidden);assert(!h.active);assert(!h.press('lg-tray'));h.tick(90,input('checkin',{map:{current:{era:'e2',beat:{id:'checkin'}},quiet:true}}));assert(h.view.hidden);
const f=make(),fi=input('channel',{era:'e1',map:{current:{era:'e1',beat:{id:'channel'}},quiet:false},formAvailable:true});f.tick(0,fi);assert.equal(f.view.rung,'form');f.press('lg-take');assert.equal(acts.at(-1),'open:form');f.tick(0,{...fi,silent:true,formOpened:true});f.tick(0,fi);assert.notEqual(f.view.rung,'form');
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
