// Проверка структуры курса и LaTeX без установки зависимостей: node tests/course-integrity.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const katex = require('../assets/katex/katex.min.js');
const ctx = vm.createContext({console});
for (const file of ['content.js','ir-content.js','foundations.js','contemporary.js','derivations.js','formula-notes.js','deep-explanations.js','alekseev-expanded.js','graduate-theory.js','practice.js','extra-foundations-practice.js','contemporary-practice.js','book-practice.js','alekseev-practice.js','graduate-practice.js','workbook.js','graduate-workbook.js','inline-equations.js','math-render.js']) {
 vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
}
const data = vm.runInContext('({chapters, extraPractice, displayMath, inlineEquations, workbookTasks})',ctx);
const lessons = data.chapters.flatMap(c=>c.lessons);
assert.equal(new Set(lessons.map(l=>l.id)).size,lessons.length,'Повторный id урока');
let count=0, exercises=0;
const check = (tex, context) => {try{katex.renderToString(tex,{throwOnError:true})}catch(e){throw new Error(`${context}: ${e.message}`)}};
const checkMarkup = (html, context) => {
 for(const m of html.matchAll(/data-tex(?:-display)?="([^"]+)"/g))check(m[1].replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"'),context);
};
for(const lesson of lessons){
 const blocks=[...lesson.theory.matchAll(/<div class="formula"([^>]*)>/g)];
 const legacy=blocks.filter(m=>!m[1].includes('data-tex-display'));
 const explicit=blocks.filter(m=>m[1].includes('data-tex-display'));
 assert.equal((data.displayMath[lesson.id]||[]).length,legacy.length,`${lesson.id}: неверное число старых формул`);
 for(const [i,tex] of (data.displayMath[lesson.id]||[]).entries())check(tex,`${lesson.id} #${i+1}`);
 checkMarkup([lesson.theory,lesson.q,...lesson.options,lesson.explain].join(' '), lesson.id);
 assert.equal((lesson.theory.match(/class="formula-legend"/g)||[]).length,blocks.length,`${lesson.id}: формуле нужна расшифровка`);
 const items=data.extraPractice[lesson.id]||[];assert.ok(items.length>=3,`${lesson.id}: недостаточно упражнений`);
 for(const item of items){assert.equal(item.length>=4,true);assert.ok(Number.isInteger(item[2])&&item[2]>=0&&item[2]<item[1].length);assert.ok(item[3]);checkMarkup([item[0],...item[1],item[3]].join(' '),`${lesson.id}: упражнение`);}
 count+=legacy.length+explicit.length;exercises+=items.length;
}
for(const [raw,latex] of data.inlineEquations){assert.ok(raw);check(latex,`Внутритекстовое выражение ${raw}`)}
assert.equal(new Set(data.workbookTasks.map(t=>t.id)).size,data.workbookTasks.length,'Повторный id задачи');
for(const task of data.workbookTasks){
 assert.ok(task.title&&task.source&&task.topic&&task.hint&&task.symbols&&task.steps.length>=2,`Неполная задача ${task.id}`);
 assert.ok(lessons.some(l=>l.id===task.lesson),`Нет связанной темы для ${task.id}`);
 checkMarkup([task.question,task.symbols,task.hint,...task.steps].join(' '),`Задачник ${task.id}`);
}
// В обеих версиях спорная формула записана без сокращённого квадратного символа.
const expandedRicci=String.raw`R^{(1)}=\partial_\mu\partial_\nu h^{\mu\nu}-\eta^{\mu\nu}\partial_\mu\partial_\nu h`;
assert.ok(lessons.find(l=>l.id==='grad-fierz-pauli').theory.includes(expandedRicci));
assert.ok(data.workbookTasks.find(t=>t.id==='grad-fp-constraint').steps.some(s=>s.includes(expandedRicci)));
console.log(`Задачник: проверены ${data.workbookTasks.length} задач с подсказками, решениями и формулами.`);
console.log(`Проверены ${lessons.length} тем, ${count} вынесенных формул, ${data.inlineEquations.length} внутритекстовых шаблонов и ${exercises} заданий.`);
