// BASE_URL=http://127.0.0.1:8000 CHROMIUM_PATH=/path/to/chromium node tests/browser-math.cjs
// Требуется playwright-core; например, NODE_PATH может указывать на внешнюю установку.
const assert = require('node:assert/strict');
const {chromium} = require('playwright-core');
const base = process.env.BASE_URL || 'http://127.0.0.1:8000';
(async () => {
 const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH, headless:true, args:['--no-sandbox','--disable-dev-shm-usage']});
 const page = await browser.newPage();
 const failures=[];
 page.on('pageerror', e=>failures.push(e.message));
 page.on('console', m=>{if(m.type()==='error' && !m.text().includes('ERR_CONNECTION_CLOSED') && !m.text().includes('ERR_BLOCKED_BY_CLIENT')) failures.push(m.text())});
 // Внешние шрифты интерфейса не нужны для проверки локального KaTeX.
 await page.route('https://fonts.googleapis.com/**', route=>route.fulfill({status:200,contentType:'text/css',body:''}));
 await page.goto(base);
 const ids=await page.evaluate(()=>chapters.flatMap(c=>c.lessons.map(l=>l.id)));
 let checkedMath=0;
 for(const width of [320,768,1280]){
  await page.setViewportSize({width,height:900});
  for(const id of ids){
   await page.goto(`${base}/#lesson/${id}`);
   await page.evaluate(()=>{
    document.querySelector('.quiz-options button').click();
    document.querySelectorAll('.practice-card').forEach(card=>{
     const input=card.querySelector('input');if(input){input.checked=true;card.requestSubmit()}
    });
   });
   const report=await page.evaluate(()=>({
    overflow:document.documentElement.scrollWidth-innerWidth,
    unrendered:[...document.querySelectorAll('[data-tex],[data-tex-display]')].filter(e=>!e.dataset.mathRendered).map(e=>e.outerHTML.slice(0,200)),
    errors:document.querySelectorAll('.katex-error').length,
    count:document.querySelectorAll('.katex').length,
    clipped:[...document.querySelectorAll('.inline-math,.inline-fraction,.formula')].filter(e=>e.clientHeight && e.scrollHeight>e.clientHeight+3).map(e=>e.dataset.tex||e.querySelector('annotation')?.textContent),
    missingMathML:[...document.querySelectorAll('.katex')].filter(e=>!e.querySelector('.katex-mathml annotation[encoding="application/x-tex"]') || !e.querySelector('.katex-html')).length,
   }));
   assert.ok(report.overflow<=0,`${width}px ${id}: горизонтальное переполнение страницы ${report.overflow}px`);
   assert.deepEqual(report.unrendered,[],`${width}px ${id}: неоформленные формулы`);
   assert.equal(report.errors,0,`${width}px ${id}: ошибка KaTeX`);
   assert.deepEqual(report.clipped,[],`${width}px ${id}: обрезанные формулы`);
   assert.equal(report.missingMathML,0,`${width}px ${id}: отсутствует MathML или HTML`);
   checkedMath+=report.count;
  }
  await page.goto(`${base}/#workbook`);
  await page.evaluate(()=>document.querySelectorAll('details').forEach(e=>e.open=true));
  const workbook=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,unrendered:document.querySelectorAll('[data-tex]:not([data-math-rendered]),[data-tex-display]:not([data-math-rendered])').length,errors:document.querySelectorAll('.katex-error').length,count:document.querySelectorAll('.katex').length,cards:document.querySelectorAll('.workbook-card').length}));
  assert.equal(workbook.cards,24);assert.ok(workbook.overflow<=0,`${width}px: переполнение задачника`);assert.equal(workbook.unrendered,0);assert.equal(workbook.errors,0);checkedMath+=workbook.count;
 }
 await page.goto(`${base}/#lesson/grad-fierz-pauli`);
 const copy=await page.evaluate(()=>{
  const formula=[...document.querySelectorAll('[data-tex-display]')].find(e=>e.dataset.texDisplay.startsWith('R^{(1)}='));
  const range=document.createRange();range.selectNodeContents(formula);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);
  const clipboard=new DataTransfer();const e=new ClipboardEvent('copy',{clipboardData:clipboard,bubbles:true,cancelable:true});document.dispatchEvent(e);
  return {text:clipboard.getData('text/plain'),prevented:e.defaultPrevented,tex:formula.dataset.texDisplay};
 });
 assert.equal(copy.prevented,true);assert.equal(copy.text,`$${copy.tex}$`);
 assert.equal(copy.tex,String.raw`R^{(1)}=\partial_\mu\partial_\nu h^{\mu\nu}-\Box h`);
 const indices=await page.evaluate(()=>{const e=[...document.querySelectorAll('[data-tex-display]')].find(e=>e.dataset.texDisplay.startsWith('R^{(1)}='));return {sup:e.querySelectorAll('math msup').length,sub:e.querySelectorAll('math msub').length}});
 assert.ok(indices.sup>=2 && indices.sub>=2,'Индексы должны быть размечены в MathML');
 // Смешанное выделение текста и формулы должно сохранить окружающий текст.
 const mixed=await page.evaluate(()=>{
  const formula=[...document.querySelectorAll('[data-tex-display]')].find(e=>e.dataset.texDisplay.startsWith('R^{(1)}='));
  const range=document.createRange();range.setStartBefore(formula.previousElementSibling);range.setEndAfter(formula);getSelection().removeAllRanges();getSelection().addRange(range);
  const clipboard=new DataTransfer();const e=new ClipboardEvent('copy',{clipboardData:clipboard,bubbles:true,cancelable:true});document.dispatchEvent(e);return clipboard.getData('text/plain');
 });
 assert.ok(mixed.includes('Линейный скаляр кривизны'));assert.ok(mixed.includes('$R^{(1)}='));
 const partial=await page.evaluate(()=>{const e=[...document.querySelectorAll('[data-tex-display]')].find(e=>e.dataset.texDisplay.startsWith('R^{(1)}='));const text=e.querySelector('.katex-html .mord').firstChild;const range=document.createRange();range.selectNodeContents(text);getSelection().removeAllRanges();getSelection().addRange(range);const clipboard=new DataTransfer();const ev=new ClipboardEvent('copy',{clipboardData:clipboard,bubbles:true,cancelable:true});document.dispatchEvent(ev);return clipboard.getData('text/plain')});
 assert.equal(partial,`$${copy.tex}$`);
 assert.deepEqual(failures,[]);
 console.log(`Проверены ${ids.length} уроков и задачник на 320/768/1280 px; ${checkedMath} формул и копирование LaTeX.`);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
