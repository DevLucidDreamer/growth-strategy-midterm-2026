import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const context={window:{}};vm.runInNewContext(fs.readFileSync('questions.js','utf8'),context);const qs=context.window.QUESTION_BANK;
assert.equal(qs.length,630);assert.equal(new Set(qs.map(q=>q.id)).size,630);assert.equal(new Set(qs.map(q=>q.stem)).size,630);
assert.equal(qs.filter(q=>q.exam===0).length,510);
for(let n=1;n<=4;n++){const e=qs.filter(q=>q.exam===n);assert.equal(e.length,30);assert.equal(e.filter(q=>q.type==='mc').length,15);assert.equal(e.filter(q=>q.type==='ox').length,15);assert.equal(new Set(e.map(q=>q.week)).size,6);assert.equal(new Set(e.filter(q=>q.type==='mc').map(q=>q.answer)).size,4);assert.equal(new Set(e.filter(q=>q.type==='ox').map(q=>q.answer)).size,2);}
for(const q of qs){assert(q.answer>=0&&q.answer<q.options.length);assert.equal(q.options.length,q.type==='mc'?4:2);assert.equal(new Set(q.options).size,q.options.length);assert(q.explanation&&q.source&&q.page>0);}
vm.runInNewContext(fs.readFileSync('study-data.js','utf8'),context);const study=context.window.STUDY_DATA;
assert.equal(study.pages.length,151);assert.equal(study.cards.length,441);
for(const page of study.pages){if(page.kind==='content')assert(page.ids.length>0,`No questions ${page.week}-${page.page}`);for(const id of page.ids){const q=qs.find(q=>q.id===id);assert(q);assert.equal(q.week,page.week);assert.equal(q.page,page.alias||page.page);}}
for(const q of qs){assert(study.pages.some(p=>p.week===q.week&&p.page===q.page&&p.kind==='content'));}
assert.equal(qs.filter(q=>q.id.startsWith('D')).length,331);assert.equal(qs.filter(q=>q.id.startsWith('J')).length,79);
const prior={window:{}};vm.runInNewContext(execFileSync('git',['show','HEAD:questions.js'],{encoding:'utf8'}),prior);
for(const q of prior.window.QUESTION_BANK.filter(q=>/^[MT]\d+$/.test(q.id)))assert.deepEqual(JSON.parse(JSON.stringify(qs.find(n=>n.id===q.id))),JSON.parse(JSON.stringify(q)),`Legacy question changed: ${q.id}`);
console.log(`PASS: 630 unique IDs/stems; 4 x 30 balanced exams; 510 extras; 151 source pages audited, ${study.pages.filter(p=>p.kind==='content').length} content pages covered; 441 cards; valid options and sources.`);
