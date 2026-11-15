// Проверка структуры курса и LaTeX без установки зависимостей: node tests/course-integrity.cjs
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const katex = require('../assets/katex/katex.min.js');
const ctx = vm.createContext({console});
for (const file of ['content.js','ir-content.js','foundations.js','contemporary.js','derivations.js','formula-notes.js','deep-explanations.js','alekseev-expanded.js','practice.js','extra-foundations-practice.js','contemporary-practice.js','book-practice.js','alekseev-practice.js','inline-equations.js','math-render.js']) {
 vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
}
const data = vm.runInContext('({chapters, extraPractice, displayMath, inlineEquations})',ctx);
const lessons = data.chapters.flatMap(c=>c.lessons);
assert.equal(new Set(lessons.map(l=>l.id)).size,lessons.length,'Повторный id урока');
let count=0, exercises=0;
const check = (tex, context) => {try{katex.renderToString(tex,{throwOnError:true})}catch(e){throw new Error(`${context}: ${e.message}`)}};
for(const lesson of lessons){
 const blocks=[...lesson.theory.matchAll(/<div class="formula"([^>]*)>/g)];
 const legacy=blocks.filter(m=>!m[1].includes('data-tex-display'));
 const explicit=blocks.filter(m=>m[1].includes('data-tex-display'));
 assert.equal((data.displayMath[lesson.id]||[]).length,legacy.length,`${lesson.id}: неверное число старых формул`);
 for(const [i,tex] of (data.displayMath[lesson.id]||[]).entries())check(tex,`${lesson.id} #${i+1}`);
 for(const m of lesson.theory.matchAll(/data-tex(?:-display)?="([^"]+)"/g))check(m[1].replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"'),lesson.id);
 assert.equal((lesson.theory.match(/class="formula-legend"/g)||[]).length,blocks.length,`${lesson.id}: формуле нужна расшифровка`);
 const items=data.extraPractice[lesson.id]||[];assert.ok(items.length>=3,`${lesson.id}: недостаточно упражнений`);
 for(const item of items){assert.equal(item.length>=4,true);assert.ok(Number.isInteger(item[2])&&item[2]>=0&&item[2]<item[1].length);assert.ok(item[3]);}
 count+=legacy.length+explicit.length;exercises+=items.length;
}
for(const [raw,latex] of data.inlineEquations){assert.ok(raw);check(latex,`Внутритекстовое выражение ${raw}`)}
console.log(`Проверены ${lessons.length} тем, ${count} вынесенных формул, ${data.inlineEquations.length} внутритекстовых шаблонов и ${exercises} заданий.`);
