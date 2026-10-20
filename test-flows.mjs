import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const data=new Map(),elements=new Map(),events={},windowEvents={};
const element=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',hidden:true,style:{},focus(){},setSelectionRange(){}});return elements.get(id);};
let hash='';
const location={get hash(){return hash;},set hash(v){hash=v.startsWith('#')?v:'#'+v;}};
const ctx=vm.createContext({console,Date,Math,JSON,Set,Object,String,Number,Array,clearTimeout,setTimeout:()=>0,location,localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},document:{querySelector:element,querySelectorAll:()=>[],addEventListener:(event,fn)=>(events[event]??=[]).push(fn)},window:{scrollTo(){},print(){},addEventListener:(event,fn)=>windowEvents[event]=fn}});
vm.runInContext(fs.readFileSync('questions.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('study-data.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('app.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('comprehensive.js','utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
const click=(action,n)=>events.click.forEach(fn=>fn({target:{closest:()=>({dataset:{action,n:String(n)},disabled:false})}}));
run('createExam(1)');run('render()');assert(element('#app').innerHTML.includes('第')===false);
click('answer',0);assert(!element('#app').innerHTML.includes('class="explanation'));
const snapshot=JSON.parse(data.get('strategy-study-v1'));assert.equal(Object.keys(snapshot.session.answers).length,1);
// Submit a controlled mix: first 10 right, next 10 wrong, last 10 unanswered.
run('session.answers={};session.ids.forEach((id,i)=>{const q=BANK.find(q=>q.id===id);if(i<10)session.answers[id]=q.answer;else if(i<20)session.answers[id]=(q.answer+1)%q.options.length;});submit();render();');
assert.equal(run('result.correct'),10);assert.equal(run('Object.keys(saved.wrong).length'),20);assert.equal(run('saved.history.length'),1);assert.equal(run('saved.session'),null);
// Correct retries remove saved errors.
run('startPractice(true)');location.hash='#review';run('render()');
for(let i=0;i<20;i++){const a=run('BANK.find(q=>q.id===practice.ids[practice.index]).answer');click('answer',a);assert(element('#app').innerHTML.includes('정답입니다.'));click('practice-next');}
assert.equal(run('Object.keys(saved.wrong).length'),0);
// Complete a full shuffled bank, ensuring unique questions and safe next cycle.
location.hash='#infinite';run('startPractice(false)');const seen=new Set();
for(let i=0;i<750;i++){const id=run('practice.ids[practice.index]');assert(!seen.has(id));seen.add(id);const a=run('BANK.find(q=>q.id===practice.ids[practice.index]).answer');click('answer',a);const before=run('saved.practice.answered');click('answer',a);assert.equal(run('saved.practice.answered'),before);click('practice-next');}
assert.equal(seen.size,750);assert.equal(run('practice.cycle'),2);assert.equal(run('practice.index'),0);assert.equal(run('new Set(practice.ids).size'),750);
run("startPractice(false,'5')");assert(run('practice.ids.every(id=>BANK.find(q=>q.id===id).week===5)'));
console.log('PASS: hidden exam answers; stored progress; scoring including unanswered; 20 wrong retries; 750-question no-repeat cycle; reshuffle rollover; duplicate answer prevention; week filter.');
// Weekly routes must isolate all six pools, score immediately and retain their pool after rollover.
location.hash='#weekly';run('render()');
for(let w=2;w<=7;w++)assert(element('#app').innerHTML.includes(`href="#week-${w}"`));
let weekTotal=0;
for(let w=2;w<=7;w++){
 location.hash=`#week-${w}`;run('render()');
 assert.equal(run('practice.filter'),String(w));
 assert(run(`practice.ids.every(id=>BANK.find(q=>q.id===id).week===${w})`));
 assert(!element('#app').innerHTML.includes('id="week-filter"'));
 const count=run('practice.ids.length');weekTotal+=count;
 const seenWeek=new Set();
 for(let i=0;i<count;i++){
  const id=run('practice.ids[practice.index]');assert(!seenWeek.has(id));seenWeek.add(id);
  click('answer',run('BANK.find(q=>q.id===practice.ids[practice.index]).answer'));
  assert(element('#app').innerHTML.includes('정답입니다.'));
  click('practice-next');
 }
 assert.equal(run('practice.cycle'),2);
 assert(run(`practice.ids.every(id=>BANK.find(q=>q.id===id).week===${w})`));
}
assert.equal(weekTotal,750);
console.log('PASS: weekly selection, all 6 route pools totaling 750 questions, immediate grading and weekly-only shuffle rollover.');

// New audit, recall and filter behavior, including preserved legacy progress.
location.hash='#coverage';run('render()');assert(element('#app').innerHTML.includes('151쪽'));
assert.equal(run('CONTENT.length'),124);
location.hash='#slide-5-20';run('render()');assert(element('#app').innerHTML.includes('일시적 경쟁우위'));
location.hash='#page-5-20';run('render()');assert(run('practice.ids.every(id=>QMAP.get(id).week===5&&QMAP.get(id).page===20)'));
location.hash='#week-6';run("practiceType='ox';practiceLevel='detail';startPractice(false,'6')");
assert(run("practice.ids.every(id=>QMAP.get(id).type==='ox'&&QMAP.get(id).detail&&QMAP.get(id).week===6)"));
location.hash='#week-3';run("saved.attempts={};practiceType='all';practiceLevel='unseen';startPractice(false,'3')");
assert(run('practice.ids.length>0'));const unseenId=run('practice.ids[0]');
location.hash='#week-3';click('answer',run('QMAP.get(practice.ids[0]).answer'));
run("startPractice(false,'3')");assert(!run('practice.ids').includes(unseenId));
run("practiceLevel='all';practiceType='all'");
for(let i=0;i<100;i++){
 const ids=run('randomExamIDs()'),questions=run('BANK').filter(q=>ids.includes(q.id));
 assert.equal(new Set(ids).size,30);assert.equal(questions.filter(q=>q.type==='mc').length,15);assert.equal(questions.filter(q=>q.type==='ox').length,15);
 for(let w=2;w<=7;w++)for(const t of ['mc','ox'])assert(questions.filter(q=>q.week===w&&q.type===t).length>=2);
}
location.hash='#cards';run('render()');assert(element('#app').innerHTML.includes('561장'));
assert(!element('#app').innerHTML.includes('flash-answer'));click('card-flip');assert(element('#app').innerHTML.includes('flash-answer'));
click('card-known');assert.equal(run('Object.keys(saved.cardKnown).length'),1);
run("cardMode='unknown'");assert.equal(run('activeCards().length'),560);
click('card-reset');assert.equal(run('Object.keys(saved.cardKnown).length'),1);click('card-confirm-reset');assert.equal(run('Object.keys(saved.cardKnown).length'),0);
run('saved.attempts={};saved.wrong={};practiceLevel="all";startPracticeState(false,"p5-20")');
location.hash='#page-5-20';run('render()');
const pageSize=run('practice.ids.length');for(let i=0;i<pageSize;i++){click('answer',run('QMAP.get(practice.ids[practice.index]).answer'));click('practice-next');}
assert(run('pageMastered(pageInfo(5,20))'));
assert.equal(JSON.parse(data.get('strategy-study-v1')).practiceSession.ids.length,pageSize);
console.log('PASS: slide-specific pools, 124 content-page audit, detailed OX and unseen filters, 100 balanced random exams, recall reveal/known/reset, mastery state, persisted practice.');
run("saved.cardKnown.B1=true;practiceOrder='shuffle';persist()");
const reloaded=vm.createContext({console,Date,Math,JSON,Set,Object,String,Number,Array,clearTimeout,setTimeout:()=>0,location,localStorage:ctx.localStorage,document:ctx.document,window:{scrollTo(){},print(){},addEventListener(){}}});
for(const file of ['questions.js','study-data.js','app.js','comprehensive.js'])vm.runInContext(fs.readFileSync(file,'utf8'),reloaded);
assert.equal(vm.runInContext('saved.cardKnown.B1',reloaded),true);
assert.equal(vm.runInContext('practice.ids.length',reloaded),pageSize);
assert.equal(vm.runInContext('practiceOrder',reloaded),'shuffle');
assert(vm.runInContext('pageMastered(pageInfo(5,20))',reloaded));
console.log('PASS: full page reload retains recall marks, practice pool, filter settings, latest-answer mastery and old records.');
