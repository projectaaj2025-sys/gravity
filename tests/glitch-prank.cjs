// Проверка пасхалки «Не нажимать» без браузера: NODE_PATH=/tmp/glitchtest/node_modules node tests/glitch-prank.cjs
// Нужны jsdom 31 и локальный сервер: python3 -m http.server 8123 && npm install --prefix /tmp/glitchtest jsdom@31
// В самом проекте зависимостей нет, поэтому тест запускается вручную, как tests/browser-math.cjs.
const assert = require('node:assert/strict');
const { JSDOM, VirtualConsole, requestInterceptor } = require('jsdom');

const base = (process.env.BASE_URL || 'http://127.0.0.1:8123').replace(/\/$/, '');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// Внешние шрифты интерфейса не нужны: на все запросы не к локальному серверу отвечаем пустым CSS.
const localOnly = requestInterceptor(request => request.url.startsWith(base)
 ? undefined
 : new Response('', { headers: { 'Content-Type': 'text/css' } }));

// Правила, которые делают <html> или <body> containing block для position:fixed:
// с ними оверлей пасхалки растягивается на весь документ и окно уезжает за экран.
// Смотрим на cssText: cssom в jsdom не всегда отдаёт отдельные свойства через getPropertyValue.
const TRAP_PATTERN = /(?:^|[;{\s])(filter|backdrop-filter|transform|perspective|will-change|contain|container-type)\s*:/;

function eachRule(document, handle) {
 const walk = rules => {
  for (const rule of rules) {
   if (rule.cssRules && rule.cssRules.length) { walk(rule.cssRules); continue }
   if (rule.selectorText && rule.cssText) handle(rule);
  }
 };
 for (const sheet of document.styleSheets) {
  let rules;
  try { rules = sheet.cssRules } catch (error) { continue }
  if (rules) walk(rules);
 }
}

// Селектор нацелен на сам корень, если его последнее простое соединение — html или body.
const targetsRoot = selector => selector.split(',').some(part => {
 const last = part.trim().split(/[\s>+~]+/).pop() || '';
 return /^(html|body)([.#:[][\w.:#()\-[\]="'-]*)?$/.test(last);
});

function checkNoTrapRules(document) {
 const bad = [];
 eachRule(document, rule => {
  if (!targetsRoot(rule.selectorText)) return;
  const trap = TRAP_PATTERN.exec(rule.cssText);
  if (trap) bad.push(`${rule.selectorText} { ${trap[1]} }`);
 });
 return bad;
}

// Обратная страховка: глитч страницы не должен исчезнуть вместе с фильтром на body.
function checkGlitchEffects(document) {
 const found = { split: false, shake: false, rules: 0 };
 eachRule(document, rule => {
  if (!rule.selectorText.includes('glitch-on')) return;
  found.rules += 1;
  if (TRAP_PATTERN.test(rule.cssText) || rule.cssText.includes('text-shadow')) found.split = true;
  if (rule.cssText.includes('glitch-shake')) found.shake = true;
 });
 return found;
}

async function run(reduceMotion) {
 const failures = [];
 const virtualConsole = new VirtualConsole();
 virtualConsole.on('jsdomError', error => failures.push(error.message));
 virtualConsole.on('error', (...args) => failures.push(args.join(' ')));

 const dom = await JSDOM.fromURL(`${base}/`, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  resources: { interceptors: [localOnly] },
  virtualConsole,
  beforeParse(window) {
   window.matchMedia = query => ({ matches: reduceMotion && query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {} });
   window.scrollTo = () => {};
  },
 });
 const { window } = dom;
 const { document } = window;
 const click = element => element.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
 const text = id => document.getElementById(id).textContent;
 await wait(600);

 const button = document.getElementById('glitch-button');
 assert.ok(button, 'на главной нет кнопки #glitch-button');
 assert.match(button.textContent, /Не нажимать/);
 assert.equal(button.type, 'button', 'кнопка не должна отправлять форму');
 assert.ok(button.closest('.hero-actions'), 'кнопка должна стоять рядом с другими действиями героя');

 click(button);
 await wait(150);

 const overlay = document.getElementById('glitch-overlay');
 assert.ok(overlay && !overlay.hidden, 'оверлей глитча не открылся');
 // Оверлей обязан висеть на <html>: filter/transform на body или html превращают их
 // в containing block для position:fixed, и «окно антивируса» уезжает за пределы экрана.
 assert.equal(overlay.parentElement, document.documentElement, 'оверлей должен быть потомком <html>');
 assert.equal(document.documentElement.classList.contains('glitch-lock'), true, 'прокрутка блокируется на <html>');
 assert.equal(document.body.classList.contains('glitch-lock'), false);
 assert.ok(document.documentElement.classList.contains(reduceMotion ? 'glitch-soft' : 'glitch-on'),
  `не включился ${reduceMotion ? 'мягкий' : 'глитч-'}режим`);
 assert.ok(!document.documentElement.classList.contains(reduceMotion ? 'glitch-on' : 'glitch-soft'), 'режимы не должны включаться вместе');
 assert.equal(overlay.querySelector('[role="alertdialog"]').getAttribute('aria-modal'), 'true');
 assert.match(text('glitch-title'), /Обнаружена угроза/);
 assert.match(text('glitch-progress-label'), /УДАЛЕНИЕ ФАЙЛА/);

 // Окно центрируется fixed-ом, а тряска из JS обязана сохранять это центрирование.
 const win = document.getElementById('glitch-window');
 assert.equal(window.getComputedStyle(win).position, 'fixed', 'окно должно быть fixed, а не absolute');
 if (!reduceMotion) {
  await wait(220);
  assert.match(win.style.transform || '', /translate\(-50%,\s*-50%\)/, 'тряска окна сбрасывает центрирование');
 }

 // Случайный щелчок по фону не обрывает шутку: иначе финал никто не видит.
 document.querySelector('.glitch-stage').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
 await wait(30);
 assert.equal(overlay.hidden, false, 'щелчок по фону оборвал глитч до финала');

 // А вот крестик в заголовке окна прерывает её сразу — выход всегда под рукой.
 const close = document.getElementById('glitch-close');
 assert.ok(close, 'в окне нет кнопки прерывания');
 close.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
 await wait(30);
 assert.equal(overlay.hidden, true, 'крестик не закрывает окно');
 assert.ok(!document.documentElement.classList.contains('glitch-on'), 'глитч-режим не снят после крестика');
 assert.equal(document.querySelector('.page-intro h1').textContent, 'Большие вопросы.Простые объяснения.',
  'текст не восстановился после прерывания');

 // Запускаем заново и дожидаемся финала.
 click(button);
 await wait(150);
 assert.equal(overlay.hidden, false, 'повторный запуск не сработал');
 assert.equal(document.getElementById('glitch-joke').hidden, true, 'шутка показывается только в финале');
 assert.equal(document.getElementById('glitch-ok').hidden, true, 'кнопка закрытия появляется только в финале');

 // Предупреждения сменяют друг друга, пока «сканирование» идёт.
 await wait(2400);
 assert.match(text('glitch-title'), /Сканирование памяти/);
 if (reduceMotion) {
  assert.equal(document.querySelector('.page-intro h1').textContent, 'Большие вопросы.Простые объяснения.',
   'в мягком режиме текст страницы не должен искажаться');
 } else {
  const scrambled = [...document.querySelectorAll('#app h1, #app h2, #app h3')].filter(node => /[▓▒░]/.test(node.textContent));
  assert.ok(scrambled.length > 0, 'заголовки не «повредились» во время глитча');
 }

 // Финал: глитч выключается, появляется объяснение, что это шутка.
 await wait(7500);
 assert.match(text('glitch-title'), /Всё чисто/);
 assert.match(text('glitch-progress-label'), /УГРОЗ НЕ НАЙДЕНО/);
 assert.equal(document.getElementById('glitch-joke').hidden, false, 'финальная шутка не появилась');
 assert.match(document.getElementById('glitch-joke').textContent, /Это шутка/, 'шутка должна объяснять, что вирус ненастоящий');
 assert.equal(document.getElementById('glitch-ok').hidden, false, 'нет кнопки закрытия');
 assert.ok(!document.documentElement.classList.contains('glitch-on'), 'глитч не выключился после шутки');
 assert.match(text('glitch-count'), /нажимали 2 раза/);

 // «Повреждённые» заголовки возвращаются на место.
 assert.equal(document.querySelector('.page-intro h1').textContent, 'Большие вопросы.Простые объяснения.');
 assert.equal(document.querySelector('.brand span:last-child').innerHTML, 'ГРАВИТАЦИЯ<br><b>ИНАЧЕ</b>',
  'разметка логотипа повреждена глитчем');

 click(document.getElementById('glitch-ok'));
 await wait(50);
 assert.equal(overlay.hidden, true, 'оверлей не закрылся по кнопке');
 assert.ok(!document.documentElement.classList.contains('glitch-lock'), 'прокрутка не вернулась');
 assert.equal(window.localStorage.getItem('gravity-glitch-clicks'), '2');
 assert.ok(!document.querySelectorAll('.glitch-piece').length, 'салют не убран');

 // Второй запуск: Escape прерывает шутку, счётчик растёт.
 click(button);
 await wait(150);
 assert.equal(overlay.hidden, false, 'повторный запуск не сработал');
 assert.equal(window.localStorage.getItem('gravity-glitch-clicks'), '3', 'счётчик нажатий не вырос');
 document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
 await wait(50);
 assert.equal(overlay.hidden, true, 'Escape не закрывает глитч');
 assert.equal(window.localStorage.getItem('gravity-glitch-clicks'), '3');

 assert.deepEqual(checkNoTrapRules(document), [], 'html/body получили filter или transform: оверлей уедет за экран');
 const effects = checkGlitchEffects(document);
 assert.ok(effects.rules > 0, 'стили глитч-режима не загрузились');
 assert.ok(effects.split, 'пропало RGB-расщепление страницы');
 assert.ok(effects.shake, 'пропало дрожание страницы');
 assert.deepEqual(failures, [], `ошибки страницы: ${failures.join(' | ')}`);
 window.close();
}

(async () => {
 await run(false);
 console.log('Пасхалка проверена: глитч, «повреждение» текста, уведомления и финальная шутка.');
 await run(true);
 console.log('Мягкий режим проверен: без мерцания и искажения текста, шутка на месте.');
})().catch(error => { console.error(error); process.exit(1) });
