import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
function harness(data=new Map(),hash='#exams'){
 const elements=new Map(),events={},el=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',hidden:true,style:{},focus(){},setSelectionRange(){}});return elements.get(id);};
 const location={get hash(){return hash;},set hash(v){hash=v.startsWith('#')?v:'#'+v;}};
 const ctx=vm.createContext({console,Date,Math,JSON,Set,Map,Object,String,Number,Array,clearTimeout,setTimeout:()=>0,location,localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},document:{querySelector:el,querySelectorAll:()=>[],addEventListener:(e,f)=>(events[e]??=[]).push(f)},window:{scrollTo(){},print(){},addEventListener(){}}});
 for(const p of ['questions.js','study-data.js','app.js','comprehensive.js','final-review.js','final-exam.js','report-papers-data.js','report-papers.js'])vm.runInContext(fs.readFileSync(p,'utf8'),ctx);
 return {data,el,location,run:s=>vm.runInContext(s,ctx),click:(action,n=0)=>events.click.forEach(fn=>fn({target:{closest:()=>({dataset:{action,n:String(n)},disabled:false})}}))};
}
const h=harness();assert.equal(h.run('BANK.length'),750);
for(let n=1;n<=8;n++)assert(h.el('#app').innerHTML.includes(`제 ${n}회 실전모의고사`),`Missing/labeled as random: ${n}`);
for(let n=5;n<=8;n++){
 h.click('paper-start',n);h.run('render()');
 assert.equal(h.run('finalExamState.current.mode'),`paper-${n}`);
 const qs=h.run('finalExamState.current.questions');assert.equal(qs.length,30);assert.equal(new Set(qs.map(q=>q.id)).size,30);assert(qs.every(q=>q.paper===n&&q.type==='mc'));
 assert.equal(new Set(qs.map(q=>q.reportTopic)).size,18);assert.equal(new Set(qs.map(q=>q.answer)).size,4);
 assert(h.el('#app').innerHTML.includes(`제 ${n}회 실전모의고사`));assert(!h.el('#app').innerHTML.includes('class="explanation'));assert(!h.el('#app').innerHTML.includes('✓ 정답'));
 h.run(`createReportPaper(${n})`);assert.equal(JSON.stringify(qs),JSON.stringify(h.run('finalExamState.current.questions')));
}
// Protect ongoing work and resume the selected fixed paper after a full reload.
h.click('fe-answer',0);h.click('paper-start',5);assert(h.el('#app').innerHTML.includes('진행 중인 시험'));assert.equal(h.run('finalExamState.current.mode'),'paper-8');
h.click('paper-replace',5);h.click('fe-answer',h.run('finalExamState.current.questions[0].answer'));h.click('fe-next');
const r=harness(h.data,'#final-exam-run');assert.equal(r.run('finalExamState.current.mode'),'paper-5');assert.equal(r.run('finalExamState.current.index'),1);assert.equal(r.run('Object.keys(finalExamState.current.answers).length'),1);
assert(r.el('#app').innerHTML.includes('제 5회 실전모의고사'));assert(!r.el('#app').innerHTML.includes('전 범위 랜덤'));
r.click('fe-submit');assert.equal(r.run('finalExamState.history[0].correct'),1);assert.equal(r.run('Object.keys(saved.wrong).filter(id=>id.startsWith("V")).length'),29);
assert(r.el('#app').innerHTML.includes('제 5회 실전모의고사 결과'));assert(r.el('#app').innerHTML.includes('data-action="paper-start" data-n="5"'));
for(const topic of r.run('FINAL_TOPICS'))assert(r.el('#app').innerHTML.includes(topic.name),`Missing topic breakdown ${topic.name}`);
r.click('paper-start',6);r.run('finalExamState.current.questions.forEach(q=>finalExamState.current.answers[q.id]=q.answer)');r.click('fe-submit');assert.equal(r.run('finalExamState.history[1].correct'),30);
r.location.hash='#exams';r.run('render()');assert(r.el('#app').innerHTML.includes('최고 100점'));assert(r.el('#app').innerHTML.includes('제 5회 실전모의고사'));
// Every variant participates in the regular wrong-note and practice pools.
r.location.hash='#wrong';r.run('render()');const collected=r.run('BANK.find(q=>saved.wrong[q.id]&&q.paper===5)');assert(collected);assert(r.el('#app').innerHTML.includes(collected.stem));
r.location.hash='#week-2';r.run('render()');assert(r.run('practice.ids.some(id=>QMAP.get(id).variant)'));
r.run("createExam(5)");assert.equal(r.run('session.ids.length'),30);assert.equal(r.run("session.ids.filter(id=>QMAP.get(id).type==='ox').length"),15);
console.log('PASS: 8 numbered exam cards; 4 fixed 30-MC papers; 18 reported topics per paper; stable question/choice order; 5th paper distinct from old random exam; replacement guard; reload resume; submit-only scoring; 29 errors collected; topic breakdown; perfect-score history; weekly and wrong-note integration.');
