import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const context={window:{}};vm.runInNewContext(fs.readFileSync('questions.js','utf8'),context);const qs=context.window.QUESTION_BANK;
assert.equal(qs.length,220);assert.equal(new Set(qs.map(q=>q.id)).size,220);assert.equal(new Set(qs.map(q=>q.stem)).size,220);
assert.equal(qs.filter(q=>q.exam===0).length,100);
for(let n=1;n<=4;n++){const e=qs.filter(q=>q.exam===n);assert.equal(e.length,30);assert.equal(e.filter(q=>q.type==='mc').length,15);assert.equal(e.filter(q=>q.type==='ox').length,15);assert.equal(new Set(e.map(q=>q.week)).size,6);assert.equal(new Set(e.filter(q=>q.type==='mc').map(q=>q.answer)).size,4);assert.equal(new Set(e.filter(q=>q.type==='ox').map(q=>q.answer)).size,2);}
for(const q of qs){assert(q.answer>=0&&q.answer<q.options.length);assert.equal(q.options.length,q.type==='mc'?4:2);assert.equal(new Set(q.options).size,q.options.length);assert(q.explanation&&q.source&&q.page>0);}
console.log('PASS: 220 IDs/stems; 4 x 30 (15 MC + 15 OX); 100 extras; all 6 weeks and varied answer positions per exam; valid options and sources.');
