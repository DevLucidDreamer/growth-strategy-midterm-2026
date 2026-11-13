'use strict';

const SEMESTER_KEY = 'strategy-semester-final-v1';
const semesterTopics = SEMESTER_WEEKS.flatMap(({week, title, topics}) =>
  topics.map(topic => ({...topic, key: `${week}-${topic.key}`, week, weekTitle: title})));
const semesterBank = semesterTopics.flatMap(({week, weekTitle, title, key, questions}) =>
  questions.map(([id, page, choice, stem, explanation]) => ({
    id, week, page, topic: title, topicKey: key, stem, explanation,
    type: Array.isArray(choice) ? 'mc' : 'ox',
    options: Array.isArray(choice) ? choice : ['맞다', '틀리다'],
    answer: choice === false ? 1 : 0,
    source: `${week}주차 · ${weekTitle} · PDF ${page}쪽`,
  })));
const semesterMap = new Map(semesterBank.map(question => [question.id, question]));
const semesterFirstWeek = SEMESTER_WEEKS[0].week;
const semesterLastWeek = SEMESTER_WEEKS.at(-1).week;
const semesterScope = semesterFirstWeek === semesterLastWeek
  ? `${semesterFirstWeek}주차` : `${semesterFirstWeek}~${semesterLastWeek}주차`;
const semesterMockSize = {mc: 30, ox: 10};
const semesterCornellDownload = '<a class="btn secondary" href="output/pdf/final-cornell-notes.pdf?v=20261113-barunpen" download="기말고사 코넬 노트 9-11주차.pdf">코넬 노트 PDF 다운로드</a>';
let semesterState = {practice: {}, current: null, history: [], wrong: {}, attempts: {}};
let semesterResultIndex = 0;
let semesterRetry = null;

try {
  const data = JSON.parse(localStorage.getItem(SEMESTER_KEY) || 'null');
  if (data && typeof data === 'object') {
    for (const key of Object.keys(semesterState)) {
      if (data[key] != null) semesterState[key] = data[key];
    }
  }
} catch {}

function semesterSave() {
  try {
    localStorage.setItem(SEMESTER_KEY, JSON.stringify(semesterState));
  } catch {
    $('#storage-warning').hidden = false;
  }
}

function semesterGo(route) {
  if (location.hash === '#' + route) render();
  else location.hash = route;
}

function semesterStat(label, value, unit) {
  return `<div class="stat"><span>${label}</span><strong>${value}<span> ${unit}</span></strong></div>`;
}

function semesterDashboard() {
  const progress = semesterBank.filter(q => semesterState.attempts[q.id]).length;
  return head('', '기말고사 학습 대시보드') +
    `<section class="hero"><div>
      <h2>현재 학습 범위 · ${semesterScope}</h2>
      ${semesterLastWeek < SEMESTER_EXPECTED_LAST_WEEK ? `<p>기말 범위는 ${semesterFirstWeek}주차부터이며, ${SEMESTER_EXPECTED_LAST_WEEK}주차까지 확대될 것으로 예상됩니다.</p>` : ''}
      <div class="toolbar semester-hero-actions">
        <a class="btn light" href="#semester-study">주차별로 공부하기 →</a>
        ${semesterCornellDownload}
      </div>
    </div><div class="hero-art" aria-hidden="true">S</div></section>
    <div class="stats">
      ${semesterStat('학습한 문제', progress, `/ ${semesterBank.length}`)}
      ${semesterStat('완료한 모의고사', semesterState.history.length, '회')}
      ${semesterStat('다시 볼 오답', semesterWrongQuestions().length, '문항')}
    </div>
    <div class="quick">
      <a href="#semester-study"><strong>후기 주제와 교안 사례</strong><span>주차별 핵심 요약과 객관식·OX 문제</span></a>
      <a href="#semester-mock"><strong>40문항 실전 모의고사</strong><span>객관식 30 + OX 10 · 제출 후 채점과 해설</span></a>
    </div>`;
}

function semesterStudy() {
  const weekCards = SEMESTER_WEEKS.map(({week, title, topics}) => {
    const questions = semesterBank.filter(q => q.week === week);
    const seen = questions.filter(q => semesterState.attempts[q.id]).length;
    return `<article class="exam-card">
      <span class="tag">${questions.length}문항 · ${seen}문항 풀이</span>
      <h3>${week}주차 · ${esc(title)}</h3>
      <p>${topics.map(t => esc(t.title)).join(' · ')}</p>
      <a class="btn" href="#semester-week-${week}">요약과 문제 보기 →</a>
    </article>`;
  }).join('');
  const upcoming = semesterLastWeek < SEMESTER_EXPECTED_LAST_WEEK
    ? `<p class="notice">${semesterLastWeek + 1}~${SEMESTER_EXPECTED_LAST_WEEK}주차는 교안 추가 후 반영 예정입니다.</p>` : '';
  return head('', '주차별 요약·문제', '교안에서 확인한 후기 주제와 기업 사례를 복습하세요. 모든 해설에 PDF 쪽수를 표시했습니다.') +
    `<div class="toolbar">
      <a class="btn" href="#semester-practice-all-all">전체 문제 풀기</a>
      <a class="btn secondary" href="#semester-practice-reported-all">후기 관련 문제 풀기</a>
      ${semesterCornellDownload}
    </div>
    <div class="grid semester-week-list">${weekCards}</div>${upcoming}
    <details class="notice semester-notice">
      <summary>추가 교안에서 확인할 후기 주제</summary>
      <ul>
        <li>RE100, UNGC, PRI, ESG 실행과 문턱, 유니레버 USLP, 적도원칙</li>
        <li>새로운 경영 패러다임, 넷플릭스의 포용, 다보스 어젠다, 이해관계자 지도</li>
        <li>캐롤 피라미드의 층위, 후기의 ‘UNBC’ 표기</li>
      </ul>
    </details>`;
}

function semesterWeek(week) {
  const topics = week.topics.map(topic =>
    `<article class="concept semester-concept">
      <div class="qmeta">${topic.reported ? '<span class="tag">후기 관련</span>' : ''}<span>PDF ${esc(topic.pages)}</span></div>
      <h2>${esc(topic.title)}</h2>
      <table><tbody>${topic.notes.map(([label, note]) => `<tr><td>${esc(label)}</td><td>${esc(note)}</td></tr>`).join('')}</tbody></table>
    </article>`).join('');
  return head('', `${week.week}주차 · ${esc(week.title)}`) +
    `<div class="toolbar">
      <a class="btn secondary" href="#semester-study">← 주차 목록</a>
      <a class="btn" href="#semester-practice-${week.week}-all">${week.week}주차 문제 풀기 →</a>
    </div>${topics}`;
}

function semesterWrongQuestions() {
  return semesterBank.filter(q => semesterState.wrong[q.id]);
}

function semesterWrongPage() {
  const questions = semesterWrongQuestions();
  return head('', '기말고사 오답 다시보기', '다시 맞힌 문항은 오답 목록에서 해제됩니다.') +
    (questions.length
      ? `<button class="btn" data-action="semester-wrong-start">오답 ${questions.length}문항 다시 풀기 →</button>` +
        questions.map((q, i) => reviewCard(q, semesterState.wrong[q.id].last, i + 1)).join('')
      : '<div class="empty"><h2>다시 풀 오답이 없습니다.</h2><p><a class="btn secondary" href="#semester-study">주차별 연습으로 가기</a></p></div>');
}

function semesterRecord(question, answer) {
  const original = semesterMap.get(question.id);
  if (!original) return;
  const correct = answer === question.answer;
  semesterState.attempts[question.id] = (semesterState.attempts[question.id] || 0) + 1;
  if (correct) delete semesterState.wrong[question.id];
  else semesterState.wrong[question.id] = {
    last: answer == null ? null : original.options.indexOf(question.options[answer]),
  };
}

function semesterNewRun(questions) {
  return {questions: questions.map(feSnapshot), index: 0, answers: {}};
}

function semesterPracticeKey(scope, type) {
  return `${scope}-${type}`;
}

function semesterPracticeRoute(scope, type) {
  return 'semester-practice-' + semesterPracticeKey(scope, type);
}

function semesterPracticePool(scope, type) {
  const reportedTopics = new Set(semesterTopics.filter(t => t.reported).map(t => t.key));
  const pool = scope === 'wrong' ? semesterWrongQuestions() : semesterBank.filter(q =>
    scope === 'all' || (scope === 'reported' ? reportedTopics.has(q.topicKey) : q.week === Number(scope)));
  return pool.filter(q => type === 'all' || q.type === type);
}

function semesterPracticePage(scope, type) {
  const key = semesterPracticeKey(scope, type);
  const week = SEMESTER_WEEKS.find(item => item.week === Number(scope));
  const title = week ? `${week.week}주차 문제 풀기` : {
    all: '기말 범위 전체 풀기', reported: '후기 관련 문제 풀기', wrong: '기말고사 오답 다시 풀기',
  }[scope];
  const back = week ? `semester-week-${week.week}` : scope === 'wrong' ? 'semester-wrong' : 'semester-study';
  const toolbar = `<div class="week-tabs" aria-label="문제 유형">
    <a class="btn secondary" href="#${back}">← 돌아가기</a>
    ${[['all', '전체'], ['mc', '객관식'], ['ox', 'OX']].map(([value, label]) =>
      `<a class="btn ${type === value ? '' : 'secondary'}" href="#${semesterPracticeRoute(scope, value)}"${type === value ? ' aria-current="page"' : ''}>${label}</a>`).join('')}
  </div>`;
  const pool = semesterPracticePool(scope, type);
  let run = semesterState.practice[key];
  if (!run) {
    if (!pool.length) return head('', title) + toolbar + '<div class="empty"><h2>이 범위에 풀 문제가 없습니다.</h2></div>';
    run = semesterNewRun(shuffle(pool));
    semesterState.practice[key] = run;
    semesterSave();
  } else if (scope !== 'wrong') {
    const existing = new Set(run.questions.map(q => q.id));
    const added = pool.filter(q => !existing.has(q.id));
    if (added.length) {
      run.questions.push(...shuffle(added).map(feSnapshot));
      semesterSave();
    }
  }
  const question = run.questions[run.index];
  if (!question) {
    const correct = run.questions.filter(q => run.answers[q.id] === q.answer).length;
    return head('', title) + toolbar + `<div class="result-banner"><h2>이번 연습 완료</h2>
      <p>${run.questions.length}문항 중 ${correct}문항 정답</p>
      <div class="toolbar" style="justify-content:center">
        ${pool.length ? '<button class="btn" data-action="semester-restart">다시 섞어 풀기</button>' : ''}
        <a class="btn secondary" href="#semester-wrong">오답 목록</a>
      </div></div>`;
  }
  const answer = run.answers[question.id];
  return head('', title, '답을 고르면 정답과 해설이 표시됩니다.') + toolbar +
    `<span class="pill">${run.index + 1} / ${run.questions.length}문항</span>
    <section class="question">${qHTML(question, answer, answer != null, 'semester-answer')}
      <div class="actions">
        <button class="btn secondary" data-action="semester-restart">다시 섞기</button>
        <button class="btn" data-action="semester-next" ${answer == null ? 'disabled' : ''}>${run.index + 1 === run.questions.length ? '연습 결과 보기' : '다음 문제 →'}</button>
      </div>
    </section>`;
}

function semesterPracticeAction(action, scope, type, n) {
  const key = semesterPracticeKey(scope, type);
  if (action === 'semester-restart') {
    delete semesterState.practice[key];
  } else {
    const run = semesterState.practice[key];
    const question = run?.questions[run.index];
    if (!question || (action === 'semester-answer' && (run.answers[question.id] != null || !semesterValidAnswer(question, n)))) return;
    if (action === 'semester-answer') {
      run.answers[question.id] = n;
      semesterRecord(question, n);
    }
    if (action === 'semester-next' && run.answers[question.id] != null) run.index++;
  }
  semesterSave();
  render();
  if (action !== 'semester-answer') window.scrollTo(0, 0);
}

function semesterValidAnswer(question, n) {
  return Number.isInteger(n) && n >= 0 && n < question.options.length;
}

function semesterMockBlueprint() {
  return shuffle(Object.entries(semesterMockSize).flatMap(([type, count]) => {
    const candidates = shuffle(semesterBank.filter(q => q.type === type));
    const groupKeys = type === 'mc' ? semesterTopics.map(t => t.key) : SEMESTER_WEEKS.map(w => w.week);
    const anchors = shuffle(groupKeys.map(key =>
      candidates.find(q => (type === 'mc' ? q.topicKey : q.week) === key)).filter(Boolean)).slice(0, count);
    const used = new Set(anchors.map(q => q.id));
    return [...anchors, ...candidates.filter(q => !used.has(q.id)).slice(0, count - anchors.length)];
  }));
}

function semesterMock() {
  const run = semesterState.current;
  return head('', '기말고사 실전 모의고사', '현재 교안 범위에서 객관식 30문항과 OX 10문항을 섞어 출제합니다.') +
    `<div class="notice">제공된 과거 후기의 40문항 비율을 연습용으로 적용했습니다. 이번 학기 시험 문항 수와 시간은 확인되지 않았습니다.</div>
    <section class="random-banner"><div><h2>${semesterScope} 모의고사</h2><p>시간제한 없음 · 정답은 제출 후 공개</p></div>
      ${run ? '<a class="btn" href="#semester-mock-run">풀던 시험 이어하기 →</a>' : '<button class="btn" data-action="semester-mock-start">모의고사 시작 →</button>'}
    </section>
    <div class="section-title"><h2>최근 응시 기록</h2></div>
    ${semesterState.history.length ? semesterState.history.map((r, i) =>
      `<article class="review-card fe-history">
        <div><strong>${Math.round(r.correct / r.questions.length * 100)}점</strong> · ${r.correct}/${r.questions.length} 정답${r.retry ? ' · 오답 재시험' : ''}
          <p class="source">${new Date(r.finished).toLocaleString('ko-KR')}</p></div>
        <button class="btn secondary" data-action="semester-mock-history" data-n="${i}">결과·해설 보기</button>
      </article>`).join('') : '<div class="empty">아직 제출한 시험이 없습니다.</div>'}`;
}

function semesterMockRun() {
  const run = semesterState.current;
  if (!run) return head('', '진행 중인 기말 모의고사가 없습니다.') + '<a class="btn" href="#semester-mock">시험 선택 →</a>';
  const question = run.questions[run.index];
  const answered = Object.keys(run.answers).length;
  const total = run.questions.length;
  return head('', run.retry ? '기말 모의고사 오답 재시험' : '기말고사 실전 모의고사', `${run.index + 1} / ${total}문항 · ${answered}문항 답변 · 자동 저장`) +
    `<div class="progress semester-progress"><div style="width:${answered / total * 100}%"></div></div>
    <div class="quiz-layout">
      <section class="question fe-question">${qHTML(question, run.answers[question.id], false, 'semester-mock-answer')}
        <div class="actions">
          <button class="btn secondary" data-action="semester-mock-prev" ${run.index === 0 ? 'disabled' : ''}>← 이전</button>
          <div class="right">
            <button class="btn secondary" data-action="semester-mock-clear">선택 해제</button>
            <button class="btn" data-action="${run.index + 1 === total ? 'semester-mock-check' : 'semester-mock-next'}">${run.index + 1 === total ? '답안 확인' : '다음 →'}</button>
          </div>
        </div>
      </section>
      <div class="palette"><strong>문항 바로가기</strong><div class="nums">
        ${run.questions.map((q, i) => {
          const done = run.answers[q.id] != null;
          return `<button data-action="semester-mock-jump" data-n="${i}" class="${done ? 'done' : ''} ${i === run.index ? 'current' : ''}" aria-label="${i + 1}번 ${done ? '답변 완료' : '미응답'}">${i + 1}</button>`;
        }).join('')}
      </div><p class="source">연두색은 답변 완료 문항입니다.</p><button class="btn" data-action="semester-mock-check">답안 제출하기</button></div>
    </div>`;
}

function semesterMockCheck() {
  const run = semesterState.current;
  const answered = Object.keys(run.answers).length;
  const missing = run.questions.length - answered;
  $('#app').innerHTML = head('', '답안을 제출할까요?') +
    `<section class="question"><p>${run.questions.length}문항 중 ${answered}문항에 답했습니다.
    ${missing ? `미응답 ${missing}문항은 오답으로 처리됩니다.` : '모든 문항에 답했습니다.'}</p>
    <div class="toolbar"><button class="btn secondary" data-action="semester-mock-back">시험으로 돌아가기</button>
      <button class="btn" data-action="semester-mock-submit">제출하고 채점하기</button></div></section>`;
  window.scrollTo(0, 0);
}

function semesterMockResult() {
  const result = semesterState.history[semesterResultIndex];
  if (!result) return head('', '저장된 기말 모의고사 결과가 없습니다.') + '<a class="btn" href="#semester-mock">시험 목록</a>';
  const total = result.questions.length;
  const wrong = total - result.correct;
  const topicRows = SEMESTER_WEEKS.map(({week, title}) => {
    const questions = result.questions.filter(q => q.week === week);
    if (!questions.length) return '';
    const correct = questions.filter(q => result.answers[q.id] === q.answer).length;
    return `<tr><td>${week}주차 · ${esc(title)}</td><td>${correct} / ${questions.length}</td></tr>`;
  }).join('');
  return head('', '기말 모의고사 채점 결과') +
    `<section class="result-banner">
      <div class="result-score">${Math.round(result.correct / total * 100)}<small> / 100점</small></div>
      <p>${result.correct}문항 정답 · ${wrong}문항 오답·미응답</p>
      <div class="toolbar" style="justify-content:center">
        <button class="btn" data-action="semester-mock-retry" ${wrong ? '' : 'disabled'}>틀린 문항만 재시험</button>
        <a class="btn secondary" href="#semester-wrong">오답 목록</a>
        <a class="btn secondary" href="#semester-mock">시험 목록</a>
      </div>
    </section>
    <details class="concept fe-topic-results"><summary>주차별 정답 현황 보기</summary>
      <table><thead><tr><th>출제 주차</th><th>정답 / 출제</th></tr></thead><tbody>${topicRows}</tbody></table></details>
    <div class="section-title"><h2>전체 문항과 해설</h2></div>
    ${result.questions.map((q, i) => reviewCard(q, result.answers[q.id], i + 1, true)).join('')}`;
}

function semesterStartMock(questions, retry) {
  semesterState.current = {...semesterNewRun(questions), retry};
  semesterSave();
  semesterGo('semester-mock-run');
}

function semesterSubmitMock() {
  const run = semesterState.current;
  let correct = 0;
  for (const q of run.questions) {
    const answer = run.answers[q.id];
    if (answer === q.answer) correct++;
    semesterRecord(q, answer);
  }
  semesterState.history = [{...run, correct, finished: Date.now()}, ...semesterState.history].slice(0, 10);
  semesterState.current = null;
  semesterResultIndex = 0;
  semesterSave();
  semesterGo('semester-mock-result');
}

function semesterMockAction(action, n) {
  const run = semesterState.current;
  if (action === 'start' && !run) return semesterStartMock(semesterMockBlueprint(), false);
  if (action === 'history') {
    semesterResultIndex = n;
    return semesterGo('semester-mock-result');
  }
  if (action === 'retry') {
    const result = semesterState.history[semesterResultIndex];
    semesterRetry = result.questions.filter(q => result.answers[q.id] !== q.answer);
    if (!run) return semesterStartMock(semesterRetry, true);
    $('#app').innerHTML = head('', '진행 중인 모의고사가 있습니다.') +
      `<div class="question"><p>오답 재시험을 시작하면 현재 시험의 답안이 교체됩니다.</p>
      <div class="toolbar"><a class="btn" href="#semester-mock-run">진행 중인 시험 이어가기</a>
      <button class="btn secondary" data-action="semester-mock-replace">오답 재시험 시작</button></div></div>`;
    window.scrollTo(0, 0);
    return;
  }
  if (action === 'replace' && semesterRetry?.length) return semesterStartMock(semesterRetry, true);
  if (!run) return;
  if (action === 'check') return semesterMockCheck();
  if (action === 'back') return render();
  if (action === 'submit') return semesterSubmitMock();
  const q = run.questions[run.index];
  if (action === 'answer' && semesterValidAnswer(q, n)) run.answers[q.id] = n;
  if (action === 'clear') delete run.answers[q.id];
  if (action === 'prev') run.index = Math.max(0, run.index - 1);
  if (action === 'next') run.index = Math.min(run.questions.length - 1, run.index + 1);
  if (action === 'jump' && Number.isInteger(n) && n >= 0 && n < run.questions.length) run.index = n;
  semesterSave();
  render();
  if (['prev', 'next', 'jump'].includes(action)) window.scrollTo(0, 0);
}

const semesterPracticeMatch = /^semester-practice-(all|reported|wrong|\d+)-(all|mc|ox)$/;
const renderMidterm = render;
render = function () {
  const route = location.hash.slice(1);
  const isFinal = route.startsWith('semester-');
  $('#midterm-menu').hidden = isFinal;
  $('#semester-menu').hidden = !isFinal;
  $('#exam-scope').textContent = isFinal ? `현재 ${semesterScope} 반영` : '2~7주차 교안 기반';
  $('#study-brand').href = isFinal ? '#semester-final' : '#home';
  document.querySelectorAll('[data-exam-tab]').forEach(tab => {
    if (tab.dataset.examTab === (isFinal ? 'final' : 'midterm')) tab.setAttribute('aria-current', 'true');
    else tab.removeAttribute('aria-current');
  });
  if (!isFinal) return renderMidterm();

  const match = semesterPracticeMatch.exec(route);
  const week = SEMESTER_WEEKS.find(item => route === `semester-week-${item.week}`);
  let active = 'semester-final';
  let html;
  if (match && (['all', 'reported', 'wrong'].includes(match[1]) || SEMESTER_WEEKS.some(w => w.week === Number(match[1])))) {
    active = match[1] === 'wrong' ? 'semester-wrong' : 'semester-study';
    html = semesterPracticePage(match[1], match[2]);
  } else if (week || route === 'semester-study') {
    active = 'semester-study';
    html = week ? semesterWeek(week) : semesterStudy();
  } else if (route === 'semester-wrong') {
    active = route;
    html = semesterWrongPage();
  } else if (['semester-mock', 'semester-mock-run', 'semester-mock-result'].includes(route)) {
    active = 'semester-mock';
    html = route === 'semester-mock' ? semesterMock() : route === 'semester-mock-run' ? semesterMockRun() : semesterMockResult();
  } else {
    html = semesterDashboard();
  }
  $('#semester-wrong-count').textContent = semesterWrongQuestions().length;
  document.querySelectorAll('[data-semester-nav]').forEach(link => {
    link.classList.toggle('active', link.dataset.semesterNav === active);
  });
  $('#app').innerHTML = html;
};

document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  const route = location.hash.slice(1);
  if (!button || button.disabled || !route.startsWith('semester-')) return;
  const {action, n} = button.dataset;
  if (action === 'semester-wrong-start') {
    delete semesterState.practice['wrong-all'];
    return semesterGo('semester-practice-wrong-all');
  }
  if (action.startsWith('semester-mock-')) return semesterMockAction(action.slice('semester-mock-'.length), Number(n));
  const match = semesterPracticeMatch.exec(route);
  if (match && ['semester-answer', 'semester-next', 'semester-restart'].includes(action)) {
    semesterPracticeAction(action, match[1], match[2], Number(n));
  }
});
render();
