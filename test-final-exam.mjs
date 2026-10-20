import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
function harness(data=new Map(),hash='#final-exam'){
 const elements=new Map(),events={},el=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',hidden:true,style:{},focus(){},setSelectionRange(){}});return elements.get(id);};
 const location={get hash(){return hash;},set hash(v){hash=v.startsWith('#')?v:'#'+v;}};
 const ctx=vm.createContext({console,Date,Math,JSON,Set,Map,Object,String,Number,Array,clearTimeout,setTimeout:()=>0,location,localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},document:{querySelector:el,querySelectorAll:()=>[],addEventListener:(e,f)=>(events[e]??=[]).push(f)},window:{scrollTo(){},print(){},addEventListener(){}}});
 for(const p of ['questions.js','study-data.js','app.js','comprehensive.js','final-review.js','final-exam.js'])vm.runInContext(fs.readFileSync(p,'utf8'),ctx);
 return {data,el,location,run:s=>vm.runInContext(s,ctx),click:(action,n=0)=>events.click.forEach(fn=>fn({target:{closest:()=>({dataset:{action,n:String(n)},disabled:false})}}))};
}
const h=harness();assert(h.el('#app').innerHTML.includes('최종 실전 모의고사'));assert.equal(h.run('BANK.length'),750);
for(const mode of ['mc','mixed'])for(let i=0;i<100;i++){
 const qs=h.run(`feBlueprint('${mode}')`);assert.equal(qs.length,30);assert.equal(new Set(qs.map(q=>q.id)).size,30);
 assert.equal(qs.filter(q=>q.type==='mc').length,mode==='mc'?30:24);assert.equal(qs.filter(q=>q.type==='ox').length,mode==='mc'?0:6);
 const topics=h.run('FE_TOPIC_IDS');for(const ids of topics)assert(qs.some(q=>ids.includes(q.id)));
 for(const id of ['M7','M8','M5','M15','M36','D41','FE1','FE2','FE3'])assert(qs.some(q=>q.id===id));
 assert(qs.every(q=>h.run('FINAL_IDS').includes(q.id)||q.id.startsWith('FE')));
}
h.click('fe-start',0);h.run('render()');assert.equal(h.location.hash,'#final-exam-run');
assert(!h.el('#app').innerHTML.includes('class="explanation'));assert(!h.el('#app').innerHTML.includes('✓ 정답'));
h.click('fe-answer',1);assert.equal(h.run('Object.keys(finalExamState.current.answers).length'),1);assert.equal(h.run('Object.keys(saved.attempts).length'),0);
h.click('fe-flag');h.click('fe-next');assert.equal(h.run('finalExamState.current.index'),1);
const restored=harness(h.data,'#final-exam-run');assert.equal(restored.run('finalExamState.current.index'),1);assert.equal(restored.run('Object.keys(finalExamState.current.flags).length'),1);assert.equal(restored.run('Object.keys(finalExamState.current.answers).length'),1);
assert.equal(JSON.stringify(restored.run('finalExamState.current.questions')),JSON.stringify(h.run('finalExamState.current.questions')));
restored.run('finalExamState.current.index=0');restored.click('fe-clear');assert.equal(restored.run('Object.keys(finalExamState.current.answers).length'),0);
restored.click('fe-answer',0);restored.location.hash='#final-exam';restored.run('render()');restored.click('fe-start',1);assert(restored.el('#app').innerHTML.includes('진행 중인 최종 시험'));assert.equal(restored.run('finalExamState.current.mode'),'mc');
restored.click('fe-replace',1);assert.equal(restored.run('finalExamState.current.mode'),'mixed');
// Controlled scoring: 10 correct, 10 wrong, 10 unanswered; no answer leakage before submit.
restored.run('finalExamState.current.questions.forEach((q,i)=>{if(i<10)finalExamState.current.answers[q.id]=q.answer;else if(i<20)finalExamState.current.answers[q.id]=(q.answer+1)%q.options.length;});render()');
assert(!restored.el('#app').innerHTML.includes('class="explanation'));restored.click('fe-submit-check');assert(restored.el('#app').innerHTML.includes('미응답 10문항'));
restored.click('fe-back');assert(restored.el('#app').innerHTML.includes('정답은 제출 후 공개'));restored.click('fe-submit');
assert.equal(restored.run('finalExamState.history[0].correct'),10);assert.equal(restored.run('finalExamState.current'),null);assert(restored.el('#app').innerHTML.includes('정답입니다.'));assert(restored.el('#app').innerHTML.includes('주제별 정답 현황'));
for(const q of restored.run('finalExamState.history[0].questions').slice(0,10))if(!q.id.startsWith('FE'))assert(restored.run(`saved.attempts['${q.id}'].lastCorrect`),`Answer remapping failed for ${q.id}`);
assert(restored.run("Object.keys(saved.wrong).every(id=>!id.startsWith('FE'))"));
restored.click('fe-submit');assert.equal(restored.run('finalExamState.history.length'),1);
const reportReload=harness(restored.data,'#final-exam-result');assert(reportReload.el('#app').innerHTML.includes('33'));assert.equal(reportReload.run('finalExamState.history.length'),1);
reportReload.click('fe-retry');assert.equal(reportReload.run('finalExamState.current.questions.length'),20);assert.equal(reportReload.run('finalExamState.current.mode'),'retry');
reportReload.run('finalExamState.current.questions.forEach(q=>finalExamState.current.answers[q.id]=q.answer)');reportReload.click('fe-submit');assert.equal(reportReload.run('finalExamState.history[1].correct'),20);assert(reportReload.el('#app').innerHTML.includes('100'));
reportReload.click('fe-history',0);assert(reportReload.el('#app').innerHTML.includes('20문항 오답'));
reportReload.run("feCreate('mc')");reportReload.click('fe-answer',0);reportReload.click('fe-history',0);reportReload.click('fe-retry');assert(reportReload.el('#app').innerHTML.includes('진행 중인 최종 시험'));assert.equal(reportReload.run('finalExamState.current.mode'),'mc');reportReload.click('fe-replace',2);assert.equal(reportReload.run('finalExamState.current.questions.length'),20);assert.equal(reportReload.run('finalExamState.current.mode'),'retry');
reportReload.run("for(let i=0;i<12;i++){feCreate('mc');feSubmit()}");assert.equal(reportReload.run('finalExamState.history.length'),10);
console.log('PASS: 200 topic-balanced blueprints; 30 MC / 24+6 mixed; mandatory reported examples; answer secrecy; navigation/flags; reload-stable shuffled choices; replacement guard; scoring/unanswered; original-answer remapping; history persistence; wrong-only retest; 10-record limit; existing 750 bank unchanged.');
