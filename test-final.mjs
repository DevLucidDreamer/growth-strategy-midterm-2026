import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const scripts=['questions.js','study-data.js','app.js','comprehensive.js','final-review.js'];
function harness(data=new Map(),hash='#final'){
 const elements=new Map(),events={};
 const el=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',hidden:true,style:{},focus(){},setSelectionRange(){}});return elements.get(id);};
 const location={get hash(){return hash;},set hash(v){hash=v.startsWith('#')?v:'#'+v;}};
 const ctx=vm.createContext({console,Date,Math,JSON,Set,Map,Object,String,Number,Array,clearTimeout,setTimeout:()=>0,location,localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},document:{querySelector:el,querySelectorAll:()=>[],addEventListener:(e,fn)=>(events[e]??=[]).push(fn)},window:{scrollTo(){},print(){},addEventListener(){}}});
 scripts.forEach(p=>vm.runInContext(fs.readFileSync(p,'utf8'),ctx));
 return {data,el,location,run:s=>vm.runInContext(s,ctx),click:(action,n=0)=>events.click.forEach(fn=>fn({target:{closest:()=>({dataset:{action,n:String(n)},disabled:false})}})),change:(id,value)=>events.change.forEach(fn=>fn({target:{id,value}}))};
}
const h=harness();
assert(h.el('#app').innerHTML.includes('최종점검'));assert(h.el('#app').innerHTML.includes('광의'));assert.equal(h.run('FINAL_TOPICS.length'),18);
const ids=h.run('FINAL_IDS');assert.equal(new Set(ids).size,ids.length);assert(ids.length<200&&ids.length>100);
for(const id of ['D152','D310','D207','M88'])assert(!ids.includes(id),`Outside final scope: ${id}`);
for(let scope=1;scope<=18;scope++){
 h.location.hash=`#final-practice-${scope}`;h.run('render()');
 const expected=h.run(`FINAL_TOPICS[${scope-1}].ids`),actual=h.run('practice.ids');
 assert.equal(actual.length,expected.length);assert(actual.every(id=>expected.includes(id)));
}
h.location.hash='#final-practice-all';h.run('render()');assert.equal(h.run('practice.ids.length'),ids.length);
assert(!h.el('#app').innerHTML.includes('class="explanation'));
let first=h.run('practice.ids[0]');h.click('answer',h.run(`QMAP.get('${first}').answer`));assert(h.el('#app').innerHTML.includes('정답입니다.'));
const attempts=h.run(`saved.attempts['${first}'].total`);h.click('answer',0);assert.equal(h.run(`saved.attempts['${first}'].total`),attempts);
h.click('practice-next');const index=h.run('practice.index');const restored=harness(h.data,'#final-practice-all');assert.equal(restored.run('practice.index'),index);assert.equal(restored.run('practice.ids[0]'),first);
restored.change('final-type','ox');assert(restored.run("practice.ids.every(id=>QMAP.get(id).type==='ox')"));
restored.change('final-type','mc');assert(restored.run("practice.ids.every(id=>QMAP.get(id).type==='mc')"));
restored.change('final-type','all');
// Failed final questions use the existing wrong notebook, unrelated wrong questions stay out.
restored.run("saved.wrong={D152:{count:1,last:0}};startFinal('all')");
const wrongId=restored.run('practice.ids[0]'),wrong=restored.run(`(QMAP.get('${wrongId}').answer+1)%QMAP.get('${wrongId}').options.length`);
restored.click('answer',wrong);assert(restored.run(`Boolean(saved.wrong['${wrongId}'])`));
restored.location.hash='#final-practice-wrong';restored.run('render()');assert.equal(restored.run('practice.ids.length'),1);assert.equal(restored.run('practice.ids[0]'),wrongId);
// Existing unseen setting must not reset a final-only pool on rollover.
restored.run("practiceLevel='unseen'");restored.click('answer',restored.run(`QMAP.get('${wrongId}').answer`));restored.click('practice-next');assert.equal(restored.run('practice.ids.length'),0);assert(restored.el('#app').innerHTML.includes('오답이 없습니다'));
restored.location.hash='#final-practice-all';restored.run('render()');restored.run("practiceLevel='all'");
const seen=new Set();for(let i=0;i<ids.length;i++){const id=restored.run('practice.ids[practice.index]');assert(!seen.has(id));seen.add(id);restored.click('answer',restored.run(`QMAP.get('${id}').answer`));restored.click('practice-next');}
assert.equal(restored.run('practice.cycle'),2);assert(restored.run('practice.ids.every(id=>FINAL_IDS.includes(id))'));
restored.location.hash='#infinite';restored.run('render()');assert.equal(restored.run('practice.ids.length'),630);
console.log(`PASS: 18 reported topics; ${ids.length} curated questions; no extra case/date questions; all topic routes; MC/OX filters; immediate grading; existing wrong-note integration; reload resume; final-only cycle and global-pool isolation.`);
