import fs from 'node:fs';
import {reportQuestions} from './build-report-papers.mjs';
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
// Keep every original question ID, choice order and answer intact for saved learners.
const readRows=file=>fs.readFileSync(file,'utf8').trim().split(/\r?\n/).filter(Boolean).map((line,i)=>{
 const fields=line.split('|');if(fields.length!==6)throw Error(`${file}:${i+1}: expected 6 fields`);return fields;
});
const details=readRows('details.txt');
details.forEach(([w,p,topic,stem,raw,explanation],i)=>{
 const opts=raw.split('/');if(opts.length!==4||new Set(opts).size!==4)throw Error(`Invalid choices D${i+1}`);
 const rotate=(i*7+Math.floor(i/4))%4,options=[...opts.slice(rotate),...opts.slice(0,rotate)];
 questions.push({id:`D${i+1}`,week:+w,page:+p,topic,stem,options,answer:options.indexOf(opts[0]),explanation,source:`${w}주차 · ${names[w]} · ${p}쪽`,type:'mc',exam:0,detail:true});
});
readRows('judgments.txt').forEach(([w,p,topic,yes,no,explanation],i)=>{
 const truth=i%2===0;
 questions.push({id:`J${i+1}`,week:+w,page:+p,topic,stem:truth?yes:no,options:['O · 맞다','X · 틀리다'],answer:truth?0:1,explanation:`${truth?'옳은 설명이다.':`틀린 설명이다. ${yes}`} ${explanation}`,source:`${w}주차 · ${names[w]} · ${p}쪽`,type:'ox',exam:0,detail:true});
});
questions.push(...reportQuestions);
// Interleave topics and formats reproducibly within each fixed mock exam.
questions.sort((a,b)=>a.exam-b.exam || ((+a.id.slice(1)*37+(a.type==='ox'?17:0))%127)-((+b.id.slice(1)*37+(b.type==='ox'?17:0))%127));
fs.writeFileSync('questions.js','window.QUESTION_BANK = '+JSON.stringify(questions,null,2)+';\n');
const covers={2:[1,19],3:[1,7],4:[1,12],5:[1,14],6:[1,13],7:[1,15]};
const sections={2:[],3:[2,14],4:[3,13],5:[2,7,22],6:[2,8],7:[2,7,16]};
const duplicates={'2-14':13,'6-4':3,'7-18':17};
const counts={2:33,3:17,4:21,5:30,6:27,7:23};
const cards=[...rows,...details].map(([w,p,topic,stem,raw,explanation],i)=>({id:i<rows.length?`B${i+1}`:`D${i-rows.length+1}`,week:+w,page:+p,topic,stem,answer:raw.split('/')[0],explanation,questionId:i<rows.length?`M${i+1}`:`D${i-rows.length+1}`}));
cards.push(...reportQuestions.map(q=>({id:q.id,week:q.week,page:q.page,topic:q.topic,stem:q.stem,answer:q.options[q.answer],explanation:q.explanation,questionId:q.id})));
const pages=Object.entries(counts).flatMap(([week,total])=>Array.from({length:total},(_,i)=>{
 const page=i+1,alias=duplicates[`${week}-${page}`],qs=questions.filter(q=>q.week===+week&&q.page===(alias||page));
 const kind=covers[week].includes(page)?'cover':sections[week].includes(page)?'section':alias?'duplicate':'content';
 if(kind==='content'&&!qs.length)throw Error(`Uncovered content slide: ${week}-${page}`);
 return {week:+week,page,alias,kind,title:kind==='cover'?'강의 표지':kind==='section'?'절 구분 표지':[...new Set(qs.map(q=>q.topic))].join(' · '),ids:qs.map(q=>q.id)};
}));
fs.writeFileSync('study-data.js','window.STUDY_DATA = '+JSON.stringify({updated:'2026-10-20',names,pages,cards,detailCount:details.length,judgmentCount:readRows('judgments.txt').length,variantCount:reportQuestions.length})+';\n');
console.log(JSON.stringify({total:questions.length,extra:questions.filter(q=>!q.exam).length,exams:[1,2,3,4,5,6,7,8].map(n=>({exam:n,total:questions.filter(q=>q.exam===n).length,mc:questions.filter(q=>q.exam===n&&q.type==='mc').length}))}));
