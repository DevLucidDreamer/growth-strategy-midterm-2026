/* Slide audit, detailed recall and scoped practice. Source PDFs stay local. */
'use strict';
const STUDY=window.STUDY_DATA, CONTENT=STUDY.pages.filter(p=>p.kind==='content');
const QMAP=new Map(BANK.map(q=>[q.id,q]));
let auditWeek='all',auditSearch='',auditOnly='all',cardWeek='all',cardMode='all',cardIndex=0,cardReveal=false;
let practiceType='all',practiceLevel='all',practiceOrder='source';
if(saved.practiceSettings){practiceType=saved.practiceSettings.type||'all';practiceLevel=saved.practiceSettings.level||'all';practiceOrder=saved.practiceSettings.order||'source';}
// Additive storage migration: retain every old ID and all exam progress.
saved.cardKnown=saved.cardKnown||{};saved.practiceSession=saved.practiceSession||null;
if(saved.practiceSession?.ids?.length&&saved.practiceSession.ids.every(id=>QMAP.has(id))){practice=saved.practiceSession;}
const basePersist=persist;
persist=function(){saved.practiceSession=practice.ids.length?practice:null;saved.practiceSettings={type:practiceType,level:practiceLevel,order:practiceOrder};basePersist();};
const baseRecord=record;
record=function(q,a){baseRecord(q,a);const t=saved.attempts[q.id];t.lastCorrect=a===q.answer;t.date=Date.now();};
function pageInfo(w,p){return STUDY.pages.find(s=>s.week===+w&&s.page===+p);}
function pageQuestions(p){return p.ids.map(id=>QMAP.get(id)).filter(Boolean);}
function progressFor(qs){return {seen:qs.filter(q=>saved.attempts[q.id]?.total).length,right:qs.filter(q=>saved.attempts[q.id]?.lastCorrect===true).length,total:qs.length};}
function pageMastered(p){return p.ids.length&&p.ids.every(id=>saved.attempts[id]?.lastCorrect===true);}
function weekOptions(value,all='전 범위'){return `<option value="all">${all}</option>${Object.entries(WEEKS).map(([w,v])=>`<option value="${w}" ${value===w?'selected':''}>${w}주차 · ${v.title}</option>`).join('')}`;}
function progressStrip(){const seen=CONTENT.filter(p=>p.ids.some(id=>saved.attempts[id]?.total)).length,mastered=CONTENT.filter(pageMastered).length;return `<div class="stats"><div class="stat"><span>전체 문제</span><strong>${BANK.length}<span> 문항</span></strong></div><div class="stat"><span>풀어본 내용 슬라이드</span><strong>${seen}<span> / ${CONTENT.length}쪽</span></strong></div><div class="stat"><span>모든 문항 최근 정답인 슬라이드</span><strong>${mastered}<span> / ${CONTENT.length}쪽</span></strong></div></div>`;}
home=function(){const continuing=session?.mode==='exam';return head('DETAILS MAKE THE DIFFERENCE','한 장도 놓치지 않는 시험 준비.','교안 2–7주차의 정의부터 표·숫자·인물·사례·절차까지 확인하세요.')+`<section class="hero"><div><div class="eyebrow">SLIDE BY SLIDE · UPDATED ${STUDY.updated}</div><h2>큰 개념을 넘어,<br>헷갈리는 한 줄까지.</h2><p>기존 220문항에 세부 객관식 ${STUDY.detailCount}문항,<br>문장 판단 OX ${STUDY.judgmentCount}문항을 추가했습니다.</p><a class="btn light" href="#coverage">슬라이드 전수 점검 시작　↗</a></div><div class="hero-art">${BANK.length}<small>READ. RECALL. REPEAT.</small></div></section>${progressStrip()}<div class="notice"><strong>후기를 반영한 준비 방식</strong><br>시험정보의 객관식·T/F 형식을 유지하고, PPT의 지엽적인 내용도 나온다는 사용자 전달 후기를 반영해 범위를 넓혔습니다. 슬라이드 연결은 빠진 페이지를 찾는 도구이며, 모든 문장이나 실제 출제의 완전한 대비를 보장하는 수치는 아닙니다.</div><div class="quick"><a href="#cards"><b>▣</b><strong>${STUDY.cards.length}장 암기카드</strong><span>정답을 가리고 떠올리기 · 외움/다시보기 표시</span></a><a href="#infinite"><b>∞</b><strong>전 범위 ${BANK.length}문항 연습</strong><span>미풀이·세부문제·객관식·OX 필터</span></a></div><section class="random-banner"><div><h2>지엽적 내용까지 섞은 랜덤 모의고사</h2><p class="muted">2–7주차 모두 포함 · 객관식 15 + OX 15 · 매번 새 구성</p></div><button class="btn" data-action="random-exam">랜덤 30문항 시작 →</button></section>${continuing?'<p><a class="btn secondary" href="#quiz">진행 중인 모의고사 이어하기 →</a></p>':''}<div class="section-title"><h2>기존 실전모의고사 4회</h2><a href="#exams">모의고사 전체 →</a></div>${examCards()}`;};
const baseExams=exams;
exams=function(){return baseExams()+`<section class="random-banner"><div><h2>전 범위 랜덤 모의고사</h2><p>${BANK.length}문항에서 6개 주차와 두 형식을 균형 있게 추출합니다.</p></div><button class="btn" data-action="random-exam">랜덤 30문항 시작</button></section>`;};
function randomExamIDs(){const picked=[];for(const type of ['mc','ox']){for(let w=2;w<=7;w++)picked.push(...shuffle(BANK.filter(q=>q.type===type&&q.week===w)).slice(0,2));picked.push(...shuffle(BANK.filter(q=>q.type===type&&!picked.some(p=>p.id===q.id))).slice(0,3));}return shuffle(picked).map(q=>q.id);}
const baseCreateExam=createExam;
createExam=function(n){if(n!==5)return baseCreateExam(n);session={mode:'exam',exam:5,ids:randomExamIDs(),index:0,answers:{},started:Date.now()};saveSession();goQuiz();};
const baseExplain=explain;
explain=function(q,a){return baseExplain(q,a)+`<a class="source source-link" href="#slide-${q.week}-${q.page}">이 슬라이드의 다른 암기포인트 →</a>`;};
function filterPool(filter,review=false){let qs=review?BANK.filter(q=>saved.wrong[q.id]):BANK;
 if(/^p\d+-\d+$/.test(filter)){const [,w,p]=/^p(\d+)-(\d+)$/.exec(filter),info=pageInfo(w,p);qs=info?pageQuestions(info):[];}
 else if(filter!=='all')qs=qs.filter(q=>String(q.week)===filter);
 if(!review){qs=qs.filter(q=>practiceType==='all'||q.type===practiceType);if(practiceLevel==='detail')qs=qs.filter(q=>q.detail);if(practiceLevel==='unseen')qs=qs.filter(q=>!saved.attempts[q.id]?.total);}
 return qs;
}
function orderPool(qs){return practiceOrder==='source'?[...qs].sort((a,b)=>a.week-b.week||a.page-b.page||a.id.localeCompare(b.id,undefined,{numeric:true})):shuffle(qs);}
startPractice=function(review=false,filter='all'){practice={ids:orderPool(filterPool(filter,review)).map(q=>q.id),index:0,cycle:1,answers:{},filter,review,initialized:true};persist();if(review)location.hash='review';render();};
practicePage=function(review=false,week=null,page=null){const scoped=week!==null,required=page!==null?`p${week}-${page}`:scoped?String(week):null;
 const view=review?'review':page!==null?`page-${week}-${page}`:scoped?`week-${week}`:'infinite';
 if(!practice.initialized||practice.review!==review||(required&&practice.filter!==required)||(!scoped&&!review&&(/^p/.test(practice.filter)||(practice.view&&practice.view!=='infinite')))){startPracticeState(review,required||'all');}
 practice.view=view;
 const info=page!==null?pageInfo(week,page):null;
 const title=review?'오답만 다시 풀기':page!==null?`${week}주차 ${page}쪽 · 슬라이드 연습`:scoped?`${week}주차 · ${WEEKS[week].title}`:'전 범위, 세부내용까지 연습.';
 const controls=review?'':`<div class="filter-panel"><label>주차<select id="deep-week">${weekOptions(scoped?String(week):practice.filter)}</select></label><label>유형<select id="deep-type"><option value="all">객관식 + OX</option><option value="mc" ${practiceType==='mc'?'selected':''}>객관식만</option><option value="ox" ${practiceType==='ox'?'selected':''}>OX만</option></select></label><label>문제 범위<select id="deep-level"><option value="all">전체 문제</option><option value="detail" ${practiceLevel==='detail'?'selected':''}>이번에 추가한 세부문제</option><option value="unseen" ${practiceLevel==='unseen'?'selected':''}>아직 안 푼 문제</option></select></label><label>순서<select id="deep-order"><option value="source">교안 순서</option><option value="shuffle" ${practiceOrder==='shuffle'?'selected':''}>무작위</option></select></label><button class="btn secondary" data-action="restart-pool">현재 범위 처음부터</button></div>`;
 const prefix=head('DETAILED PRACTICE',title,'정답을 선택하면 즉시 해설을 확인합니다. 범위나 유형을 바꾸면 해당 범위의 새 연습을 시작합니다.')+(scoped?`<div class="week-tabs"><a class="btn secondary" href="${page!==null?`#slide-${week}-${page}`:'#weekly'}">← ${page!==null?'슬라이드 암기포인트':'주차 목록'}</a><a class="btn secondary" href="#coverage">전수 점검표</a></div>`:'')+controls;
 if(!practice.ids.length)return prefix+`<div class="empty"><h2>이 조건에 해당하는 문제가 없습니다.</h2><p>미풀이 문제를 모두 풀었거나 유형·범위 조건에 맞는 문제가 없습니다. 필터를 바꿔 복습을 계속하세요.</p></div>`;
 const q=QMAP.get(practice.ids[practice.index]),a=practice.answers[`${practice.cycle}-${practice.index}`],reveal=a!=null;
 return prefix+`<div class="toolbar"><span class="pill">${practice.cycle}번째 바퀴 · ${practice.index+1} / ${practice.ids.length}</span><span class="muted">${q.detail?'신규 세부문제':'기존 핵심문제'} · ${esc(q.source)}</span></div><section class="question">${qHTML(q,a,reveal)}<div class="actions"><span class="muted">${esc(q.id)}</span><button class="btn" data-action="practice-next" ${reveal?'':'disabled'}>${practice.index===practice.ids.length-1?'한 바퀴 마치고 다시 →':'다음 문제 →'}</button></div></section><p class="source">최근 정답 여부와 오답이 자동 저장됩니다. 범위 안에서 중복 없이 한 바퀴 풀고, 끝나면 다시 섞습니다.</p>`;
};
function startPracticeState(review,filter){practice={ids:orderPool(filterPool(filter,review)).map(q=>q.id),index:0,cycle:1,answers:{},filter,review,initialized:true};persist();}
function coveragePage(){const list=STUDY.pages.filter(p=>(auditWeek==='all'||p.week==auditWeek)&&`${p.week}주차 ${p.page}쪽 ${p.title}`.includes(auditSearch)&&(!['unseen','unfinished'].includes(auditOnly)||p.kind==='content')&&(auditOnly!=='unseen'||!p.ids.some(id=>saved.attempts[id]?.total))&&(auditOnly!=='unfinished'||!pageMastered(p)));
 return head('SLIDE AUDIT','슬라이드 전수 점검','원본 151쪽을 페이지별로 대조했습니다. 표지·절 구분·반복 페이지도 표시해 위치를 확인할 수 있습니다.')+progressStrip()+`<div class="notice">내용 슬라이드 ${CONTENT.length}쪽에 연결된 문제를 풀며 학습 범위를 확인하세요. ‘최근 전부 정답’은 연결 문항의 최근 응답이 모두 정답이라는 뜻입니다. 기존 기록에는 최근 정답 여부가 없어 새로 풀어야 이 표시가 생깁니다. 교안의 모든 문장을 문제화했다는 의미는 아닙니다.</div><div class="filter-panel"><label>주차<select id="audit-week">${weekOptions(auditWeek)}</select></label><label>상태<select id="audit-only"><option value="all">모든 페이지</option><option value="unseen" ${auditOnly==='unseen'?'selected':''}>안 푼 내용 슬라이드</option><option value="unfinished" ${auditOnly==='unfinished'?'selected':''}>최근 전부 정답 전까지</option></select></label><label class="grow">쪽수·주제 검색<input id="audit-search" value="${esc(auditSearch)}" placeholder="예: 20쪽, VRIN, 알디"></label></div><p class="muted">${list.length}쪽 표시 · 쪽수는 PDF 페이지 순서입니다.</p><div class="audit-list">${list.map(p=>{const s=progressFor(pageQuestions(p)),aux=['cover','section'].includes(p.kind);return `<article class="audit-row ${aux?'aux':''}"><div class="page-number">${p.week}주차<strong>${p.page}<small>쪽</small></strong></div><div class="grow"><span class="tag">${aux?'구분 페이지':p.kind==='duplicate'?`${p.alias}쪽과 중복·연결`:pageMastered(p)?'최근 전부 정답':s.seen?'학습 중':'미풀이'}</span><h3>${esc(p.title)}</h3>${aux?'<p class="muted">학습 내용이 없는 구분 페이지로 문제에서 제외했습니다.</p>':`<p class="muted">연결 ${s.total}문항 · 풀어봄 ${s.seen} · 최근 정답 ${s.right}</p>`}</div>${aux?'':`<a class="btn secondary" href="#slide-${p.week}-${p.page}">암기포인트 →</a>`}</article>`;}).join('')}</div>`;
}
function slidePage(w,p){const info=pageInfo(w,p);if(!info)return head('SLIDE','해당 페이지를 찾을 수 없습니다.');const effective=info.alias||p,qs=pageQuestions(info),cards=STUDY.cards.filter(c=>c.week===w&&c.page===effective);
 return head('SLIDE RECALL',`${w}주차 ${p}쪽 · ${info.title}`,`${STUDY.names[w]} · 교안 내용을 재구성한 암기포인트입니다.`)+`<div class="week-tabs"><a class="btn secondary" href="#coverage">← 전체 점검표</a>${p>1?`<a class="btn secondary" href="#slide-${w}-${p-1}">← 앞쪽</a>`:''}${pageInfo(w,p+1)?`<a class="btn secondary" href="#slide-${w}-${p+1}">다음 쪽 →</a>`:''}${qs.length?`<a class="btn" href="#page-${w}-${p}">이 페이지 ${qs.length}문항 풀기</a>`:''}</div>${info.alias?`<div class="notice">이 페이지는 ${info.alias}쪽의 내용을 반복합니다. 반복 내용을 같은 문제와 연결했습니다.</div>`:''}${!qs.length?'<div class="notice">표지 또는 절 구분 페이지입니다. 다음 페이지로 이동하세요.</div>':''}<p class="muted">먼저 답을 떠올린 뒤 펼쳐 보세요. 실제 기출 문항이 아닌 교안 기반 예상문제입니다.</p>${cards.map(c=>`<details class="recall-row"><summary>${esc(c.stem)}</summary><strong class="recall-answer">${esc(c.answer)}</strong><p>${esc(c.explanation)}</p></details>`).join('')}${qs.filter(q=>q.type==='ox'&&q.detail).map(q=>`<details class="recall-row"><summary>OX · ${esc(q.stem)}</summary><strong class="recall-answer">${q.answer===0?'O · 맞다':'X · 틀리다'}</strong><p>${esc(q.explanation)}</p></details>`).join('')}`;
}
function activeCards(){return STUDY.cards.filter(c=>(cardWeek==='all'||String(c.week)===cardWeek)&&(cardMode!=='unknown'||!saved.cardKnown[c.id]));}
function cardsPage(){const cs=activeCards();cardIndex=Math.min(cardIndex,Math.max(0,cs.length-1));const c=cs[cardIndex];return head('ACTIVE RECALL',`${STUDY.cards.length}장으로, 세부내용 암기.`,`문제를 읽고 정답을 떠올린 뒤 확인하세요. ‘외웠어요’는 문제 채점과 별도로 저장됩니다.`)+`<div class="filter-panel"><label>주차<select id="card-week">${weekOptions(cardWeek)}</select></label><label>표시<select id="card-mode"><option value="all">모든 카드</option><option value="unknown" ${cardMode==='unknown'?'selected':''}>아직 못 외운 카드</option></select></label><span class="muted">외움 ${Object.keys(saved.cardKnown).length} / ${STUDY.cards.length}</span><button class="btn secondary" data-action="card-reset">외움 표시 초기화</button></div>${!c?'<div class="empty"><h2>선택 범위의 카드를 모두 외움으로 표시했습니다.</h2><p>모든 카드로 바꾸거나 문제 풀이로 기억을 확인하세요.</p><a class="btn" href="#infinite">문제로 확인하기 →</a></div>':`<section class="flashcard"><div class="qmeta"><span class="tag">${c.week}주차 · ${c.page}쪽</span><span>${cardIndex+1} / ${cs.length} · ${esc(c.topic)}</span></div><h2>${esc(c.stem)}</h2>${cardReveal?`<div class="flash-answer"><strong>${esc(c.answer)}</strong><p>${esc(c.explanation)}</p><a class="source-link" href="#slide-${c.week}-${c.page}">이 슬라이드 더 보기 →</a></div>`:'<p class="muted">정답을 말하거나 적은 뒤 확인하세요.</p>'}<button class="btn" data-action="card-flip">${cardReveal?'정답 다시 가리기':'정답 확인'}</button><div class="actions"><button class="btn secondary" data-action="card-prev" ${cardIndex?'':'disabled'}>← 이전</button><button class="btn secondary" data-action="card-again" ${cardReveal?'':'disabled'}>다시 볼래요</button><button class="btn" data-action="card-known" ${cardReveal?'':'disabled'}>${saved.cardKnown[c.id]?'외움 유지 · 다음':'외웠어요 · 다음'}</button><button class="btn secondary" data-action="card-next">다음 →</button></div></section>`}`;}
const baseRender=render;
render=function(){const route=location.hash.slice(1)||'home';const slide=/^slide-([2-7])-(\d+)$/.exec(route),page=/^page-([2-7])-(\d+)$/.exec(route);
 if(route==='coverage'||route==='cards'||slide||page){document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===(route==='cards'?'cards':'coverage')));$('#app').innerHTML=route==='coverage'?coveragePage():route==='cards'?cardsPage():slide?slidePage(+slide[1],+slide[2]):practicePage(false,+page[1],+page[2]);}
 else baseRender();
 // Label the randomly assembled exam without changing old scoring or storage.
 if(['quiz','result','exams'].includes(route))$('#app').innerHTML=$('#app').innerHTML.replaceAll('제 5회','전 범위 랜덤').replaceAll('MOCK EXAM 05','RANDOM EXAM');
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b||b.disabled)return;const a=b.dataset.action;
 if(a==='random-exam')return startExam(5);
 if(a==='restart-pool')return startPractice(false,practice.filter);
 if(a==='card-reset'){$('#app').innerHTML=head('RESET RECALL','외움 표시를 초기화할까요?','문제풀이·오답·모의고사 기록은 유지됩니다.')+'<button class="btn secondary" data-action="card-cancel">돌아가기</button> <button class="btn" data-action="card-confirm-reset">외움 표시만 초기화</button>';return;}
 if(a==='card-confirm-reset'){saved.cardKnown={};persist();render();return;}if(a==='card-cancel')return render();
 if(a.startsWith('card-')){const cs=activeCards(),c=cs[cardIndex];if(!c)return;
  if(a==='card-flip')cardReveal=!cardReveal;
  if(a==='card-prev'){cardIndex=Math.max(0,cardIndex-1);cardReveal=false;}
  if(a==='card-next'){cardIndex=(cardIndex+1)%cs.length;cardReveal=false;}
  if(a==='card-known'||a==='card-again'){if(a==='card-known')saved.cardKnown[c.id]=true;else delete saved.cardKnown[c.id];if(cardMode==='all'||a==='card-again')cardIndex=(cardIndex+1)%cs.length;cardReveal=false;persist();}
  render();
 }
 if(a==='practice-next'&&practiceLevel==='unseen'&&!practice.review&&practice.view!=='final'&&practice.index===0&&practice.cycle>1){startPracticeState(false,practice.filter);render();}
 if(['answer','practice-next'].includes(a))persist();
});
document.addEventListener('change',e=>{const id=e.target.id,value=e.target.value;
 if(id==='audit-week')auditWeek=value;if(id==='audit-only')auditOnly=value;
 if(id==='card-week'){cardWeek=value;cardIndex=0;cardReveal=false;}if(id==='card-mode'){cardMode=value;cardIndex=0;cardReveal=false;}
 if(id==='deep-type')practiceType=value;if(id==='deep-level')practiceLevel=value;if(id==='deep-order')practiceOrder=value;
 if(id.startsWith('deep-')){let f=id==='deep-week'?value:practice.filter;if(id==='deep-week'){startPracticeState(false,f);const target=f==='all'?'#infinite':`#week-${f}`;location.hash=target;}else startPracticeState(false,f);}
 if(/^(audit-|card-|deep-)/.test(id))render();
});
document.addEventListener('input',e=>{if(e.target.id!=='audit-search')return;const pos=e.target.selectionStart;auditSearch=e.target.value;render();$('#audit-search').focus();$('#audit-search').setSelectionRange(pos,pos);});
render();
