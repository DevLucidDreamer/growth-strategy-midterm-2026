import fs from 'node:fs';
const rows=fs.readFileSync('facts.txt','utf8').trim().split(/\r?\n/).map(x=>x.split('|'));
// Keep the high-priority value-chain classification in the mock exams.
rows.splice(33,0,rows.pop());
if(rows.length!==110) throw Error(`Expected 110 concept pairs, got ${rows.length}`);
const names={2:'기업과 경영',3:'전략적 기업경영',4:'기업 외부환경 분석',5:'기업 내부환경 분석',6:'시장경쟁전략',7:'시장성장전략'};
let questions=[];
rows.forEach(([week,page,topic,stem,raw,explanation],i)=>{
 const opts=raw.split('/');
 const exam=i<60?(i%4)+1:0;
 const common={week:+week,page:+page,topic,explanation,source:`${week}주차 · ${names[week]} · ${page}쪽`};
 const rotate=(Math.floor(i/4)+i)%4;const choices=[...opts.slice(rotate),...opts.slice(0,rotate)];
 questions.push({...common,id:`M${i+1}`,type:'mc',exam,stem,options:choices,answer:choices.indexOf(opts[0])});
 const truth=(Math.floor(i/4)+Math.floor(i/7))%2===0;const proposed=opts[truth?0:1];
 questions.push({...common,id:`T${i+1}`,type:'ox',exam:i<60?(exam%4)+1:0,stem:`다음 문답의 답변은 옳다.\n질문: ${stem}\n답변: ${proposed}`,options:['O · 맞다','X · 틀리다'],answer:truth?0:1,explanation:`${truth?'올바른 답변이다.':`틀린 답변이다. 올바른 답은 ‘${opts[0]}’이다.`} ${explanation}`});
});
// Interleave topics and formats reproducibly within each fixed mock exam.
questions.sort((a,b)=>a.exam-b.exam || ((+a.id.slice(1)*37+(a.type==='ox'?17:0))%127)-((+b.id.slice(1)*37+(b.type==='ox'?17:0))%127));
fs.writeFileSync('questions.js','window.QUESTION_BANK = '+JSON.stringify(questions,null,2)+';\n');
console.log(JSON.stringify({total:questions.length,extra:questions.filter(q=>!q.exam).length,exams:[1,2,3,4].map(n=>({exam:n,total:questions.filter(q=>q.exam===n).length,mc:questions.filter(q=>q.exam===n&&q.type==='mc').length}))}));
