import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const data=new Map(),elements=new Map(),events={},windowEvents={};
const element=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',hidden:true,style:{},focus(){},setSelectionRange(){}});return elements.get(id);};
let hash='';
const location={get hash(){return hash;},set hash(v){hash=v.startsWith('#')?v:'#'+v;}};
const ctx=vm.createContext({console,Date,Math,JSON,Set,Object,String,Number,Array,clearTimeout,setTimeout:()=>0,location,localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},document:{querySelector:element,querySelectorAll:()=>[],addEventListener:(event,fn)=>events[event]=fn},window:{scrollTo(){},print(){},addEventListener:(event,fn)=>windowEvents[event]=fn}});
vm.runInContext(fs.readFileSync('questions.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('app.js','utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
const click=(action,n)=>events.click({target:{closest:()=>({dataset:{action,n:String(n)},disabled:false})}});
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
for(let i=0;i<220;i++){const id=run('practice.ids[practice.index]');assert(!seen.has(id));seen.add(id);const a=run('BANK.find(q=>q.id===practice.ids[practice.index]).answer');click('answer',a);const before=run('saved.practice.answered');click('answer',a);assert.equal(run('saved.practice.answered'),before);click('practice-next');}
assert.equal(seen.size,220);assert.equal(run('practice.cycle'),2);assert.equal(run('practice.index'),0);assert.equal(run('new Set(practice.ids).size'),220);
run("startPractice(false,'5')");assert(run('practice.ids.every(id=>BANK.find(q=>q.id===id).week===5)'));
console.log('PASS: hidden exam answers; stored progress; scoring including unanswered; 20 wrong retries; 220-question no-repeat cycle; reshuffle rollover; duplicate answer prevention; week filter.');
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
assert.equal(weekTotal,220);
console.log('PASS: weekly selection, all 6 route pools totaling 220 questions, immediate grading and weekly-only shuffle rollover.');
