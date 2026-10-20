import fs from 'node:fs';
const names={2:'기업과 경영',3:'전략적 기업경영',4:'기업 외부환경 분석',5:'기업 내부환경 분석',6:'시장경쟁전략',7:'시장성장전략'};
const topics=['경영의 정의·광의와 협의','기업 형태·소유권 이전','POLC·지휘의 구분','리더십·권력','인간 욕구 순서','2요인 이론','사명·비전','기업 수준 전략','To-be 이미지','일반환경·산업환경','공급자 협상력','유형·무형자원','가치사슬 구분','알디 전략','시장경쟁전략','마일스·스노우','기업성장·수직통합','가치중립 동기'];
const descriptions={5:['족보 기본 변형','정의·순서·분류를 다른 표현으로 확인합니다.'],6:['사례 적용','족보 개념을 짧은 기업·조직 사례에 적용합니다.'],7:['개념 구별','옳지 않은 설명과 뒤바뀐 분류를 구별합니다.'],8:['종합 점검','유사 개념과 사례의 연결을 마지막으로 점검합니다.']};
const rows=fs.readFileSync('report-papers.txt','utf8').trim().split(/\r?\n/).filter(Boolean).map((s,i)=>{const cells=s.split('|');if(cells.length!==7)throw Error(`report-papers.txt:${i+1}: expected 7 fields`);return cells;});
export const reportQuestions=[];
export const reportPapers=[5,6,7,8].map(number=>{
 const entries=rows.filter(r=>+r[0]===number);if(entries.length!==30)throw Error(`Paper ${number}: expected 30`);
 const questions=entries.map(([p,t,w,page,stem,raw,explanation],i)=>{
  const opts=raw.replaceAll(' / ',' · ').replaceAll('A/S','A·S').split('/');if(opts.length!==4||new Set(opts).size!==4)throw Error(`Paper ${p} question ${i+1}: invalid choices`);
  const rotate=(number+i)%4,options=[...opts.slice(rotate),...opts.slice(0,rotate)],supplement=+t===1&&explanation.includes('보충');
  return {id:`V${(number-5)*30+i+1}`,week:+w,page:+page,topic:topics[+t-1],reportTopic:t,paper:number,type:'mc',exam:number,variant:true,stem,options,answer:options.indexOf(opts[0]),explanation,source:`${w}주차 · ${names[w]} · ${page}쪽${supplement?' · 광의·협의의 구체적 정의는 보충 설명':''}`};
 });
 if(new Set(questions.map(q=>q.reportTopic)).size!==18)throw Error(`Paper ${number}: missing reported topic`);
 reportQuestions.push(...questions);
 return {number,title:descriptions[number][0],description:descriptions[number][1],ids:questions.map(q=>q.id)};
});
if(new Set(reportQuestions.map(q=>q.stem)).size!==120)throw Error('Repeated variant stems');
fs.writeFileSync('report-papers-data.js','window.REPORT_PAPERS = '+JSON.stringify(reportPapers,null,2)+';\n');
