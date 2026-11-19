/* Пасхалка «Не нажимать»: шуточный глитч и липовое уведомление о вирусе.
   Ничего не скачивается, не устанавливается и не ломается — только анимация и шутка в конце.
   Кнопка #glitch-button живёт в шапке героя на главной; обработчик вешается один раз при загрузке. */
(function () {
 const CHARS = '▓▒░#@$%&*!?<>+/\\|=~^01АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ∆∑∞';
 const WORDS = ['GRAVITY.EXE', 'NEWTON.DLL', 'EINSTEIN.SYS', 'G_CONST.BIN', 'SPACETIME.DAT', 'MOND.INI'];
 const ALERTS = [
  { title: 'Обнаружена угроза', text: 'Троян <b>WIN32/GRAVITY.B</b> пытается отменить всемирное тяготение.' },
  { title: 'Сканирование памяти', text: 'Найдено <b>198 анонимных гравитонов</b>. Карантин недоступен.' },
  { title: 'Сбой пространства-времени', text: 'Метрика <b>g&#956;&#957;</b> повреждена: 41% секторов читаются как сюрреализм.' },
  { title: 'Последнее предупреждение', text: 'Вселенная будет перезагружена в <b>постоянной Планка</b>. Сохраните любопытство.' },
 ];
 const RUNTIME = 9000;      // сколько длится глитч, мс
 const FINISH_DELAY = 5200; // пауза перед автозакрытием финальной шутки, мс
 const CLICK_KEY = 'gravity-glitch-clicks';

 let timers = [], victims = [], bars = [], pieces = [], raf = 0, running = false, finished = false, lastFocused = null;

 const byId = id => document.getElementById(id); // свой хелпер: пасхалка не зависит от app.js
 const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
 const root = () => document.documentElement;
 const later = (fn, ms) => timers.push(setTimeout(fn, ms));
 const every = (fn, ms) => timers.push(setInterval(fn, ms));

 function clicks() { return Number(localStorage.getItem(CLICK_KEY) || 0) }
 function countClick() {
  const total = clicks() + 1;
  try { localStorage.setItem(CLICK_KEY, String(total)) } catch (error) { /* приватный режим — шутка работает и без счётчика */ }
  return total;
 }
 function times(total) { return total === 1 ? 'раз' : total >= 2 && total <= 4 ? 'раза' : 'раз' }

 /* --- разметка оверлея ------------------------------------------------- */
 function markup() {
  const overlay = document.createElement('div');
  overlay.className = 'glitch-overlay';
  overlay.id = 'glitch-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `<div class="glitch-stage" aria-hidden="true">
   <div class="glitch-scan"></div><div class="glitch-noise"></div><div class="glitch-bars"></div>
   <div class="glitch-ascii" aria-hidden="true"></div></div>
  <div class="glitch-window" id="glitch-window" role="alertdialog" aria-modal="true" tabindex="-1" aria-labelledby="glitch-title" aria-describedby="glitch-text">
   <div class="glitch-bar"><span class="glitch-bar-icon">☣</span><span id="glitch-window-name">Центр защиты — Гравитация иначе</span><span class="glitch-bar-fake">—&nbsp;□&nbsp;✕</span></div>
   <div class="glitch-body">
    <div class="glitch-face" id="glitch-face" aria-hidden="true">☣</div>
    <div class="glitch-copy">
     <h2 id="glitch-title">Обнаружена угроза</h2>
     <p id="glitch-text">Троян WIN32/GRAVITY.B пытается отменить всемирное тяготение.</p>
     <div class="glitch-progress" aria-hidden="true"><i id="glitch-progress-bar"></i></div>
     <p class="glitch-progress-label" id="glitch-progress-label" aria-hidden="true">УДАЛЕНИЕ ФАЙЛА G_CONST.BIN… 0%</p>
     <p class="glitch-joke" id="glitch-joke" hidden>Это шутка для любознательных. На сайте нет и не может быть вирусов: он статический, ничего не скачивает и не выполняет на вашем устройстве. G = 6,674 × 10⁻¹¹ на месте.</p>
    </div>
   </div>
   <div class="glitch-actions"><button type="button" class="glitch-ok" id="glitch-ok" hidden>Хорошо, отпустили ✓</button><span class="glitch-count" id="glitch-count" hidden></span></div>
  </div>`;
  document.body.appendChild(overlay);
  const box = overlay.querySelector('.glitch-bars');
  bars = [0, 1, 2].map(() => {
   const item = document.createElement('i');
   box.appendChild(item);
   return item;
  });
  return overlay;
 }

 /* --- мелкие эффекты --------------------------------------------------- */
 function setAlert(index, state) {
  const entry = ALERTS[index] || ALERTS[0];
  byId('glitch-window-name').textContent = state === 'done' ? 'Проверка завершена — Гравитация иначе' : 'Центр защиты — Гравитация иначе';
  byId('glitch-title').textContent = state === 'done' ? 'Всё чисто!' : entry.title;
  byId('glitch-face').textContent = state === 'done' ? '✳' : '☣';
  byId('glitch-face').dataset.state = state === 'done' ? 'done' : 'alert';
  byId('glitch-text').innerHTML = state === 'done'
   ? 'Ни одного вируса не пострадало. Гравитационная постоянная на месте, курс физики цел.'
   : entry.text;
 }

 function scramble() {
  victims.forEach(item => {
   item.node.textContent = item.text.replace(/\S/g, ch => Math.random() < 0.42 ? CHARS[Math.floor(Math.random() * CHARS.length)] : ch);
  });
  const ascii = document.querySelector('.glitch-ascii');
  if (ascii) ascii.textContent = Array.from({ length: 7 }, () => Array.from({ length: 58 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')).join('\n');
 }
 function restoreText() { victims.forEach(item => { item.node.innerHTML = item.original }); victims = [] }
 function jitterBars() { bars.forEach(bar => { bar.style.transform = `translate3d(${(Math.random() * 26 - 13).toFixed(1)}vw, ${(Math.random() * 100).toFixed(0)}vh, 0) scaleX(${(0.4 + Math.random()).toFixed(2)})`; bar.style.opacity = (0.25 + Math.random() * 0.6).toFixed(2) }) }
 function shakeWindow() { const win = byId('glitch-window'); if (win) win.style.transform = `translate(${(Math.random() * 12 - 6).toFixed(1)}px, ${(Math.random() * 9 - 4.5).toFixed(1)}px)` }

 /* --- финальный салют из символов -------------------------------------- */
 function confetti() {
  const host = byId('glitch-overlay');
  pieces = Array.from({ length: 22 }, () => {
   const piece = document.createElement('i');
   piece.className = 'glitch-piece';
   piece.textContent = ['✳', '☣', '✓', '∞', 'G'][Math.floor(Math.random() * 5)];
   piece.style.left = `${46 + Math.random() * 8}vw`;
   piece.style.top = `${44 + Math.random() * 8}vh`;
   piece.style.color = ['#e8c39a', '#9ad0b0', '#e4a294', '#cfe0d4'][Math.floor(Math.random() * 4)];
   host.appendChild(piece);
   return { node: piece, x: 0, y: 0, vx: (Math.random() - 0.5) * 9, vy: -5 - Math.random() * 7, a: 1 };
  });
  const step = () => {
   let alive = false;
   pieces.forEach(piece => {
    piece.vy += 0.32; piece.x += piece.vx; piece.y += piece.vy; piece.a -= 0.014;
    if (piece.a > 0) alive = true;
    piece.node.style.transform = `translate(${piece.x.toFixed(1)}px, ${piece.y.toFixed(1)}px) rotate(${(piece.x * 3).toFixed(0)}deg)`;
    piece.node.style.opacity = Math.max(piece.a, 0).toFixed(2);
   });
   raf = alive ? requestAnimationFrame(step) : 0;
  };
  raf = requestAnimationFrame(step);
 }

 function resetWindow() {
  const win = byId('glitch-window');
  if (!win) return;
  win.style.transform = '';
  byId('glitch-ok').hidden = true;
  byId('glitch-joke').hidden = true;
  byId('glitch-count').hidden = true;
  byId('glitch-progress-bar').style.width = '0%';
  byId('glitch-face').dataset.state = 'alert';
  byId('glitch-overlay').classList.remove('is-done');
 }

 function stop() {
  timers.forEach(clearTimeout); timers.forEach(clearInterval); timers = [];
  if (raf) cancelAnimationFrame(raf);
  raf = 0; running = false; finished = false;
  restoreText();
  pieces.forEach(piece => piece.node.remove()); pieces = [];
  root().classList.remove('glitch-on', 'glitch-soft');
  document.body.classList.remove('glitch-lock');
  const overlay = byId('glitch-overlay');
  if (overlay) overlay.hidden = true;
  if (lastFocused && lastFocused.isConnected) lastFocused.focus();
  lastFocused = null;
 }

 function finish(total) {
  if (finished) return;
  finished = true;
  timers.forEach(clearTimeout); timers.forEach(clearInterval); timers = [];
  restoreText();
  root().classList.remove('glitch-on', 'glitch-soft');
  document.body.classList.remove('glitch-lock');
  const win = byId('glitch-window');
  byId('glitch-overlay').classList.add('is-done'); // шум и полосы гаснут вместе с «угрозой»
  if (win) win.style.transform = '';
  byId('glitch-progress-bar').style.width = '100%';
  byId('glitch-progress-label').textContent = 'ПРОВЕРКА ЗАВЕРШЕНА · УГРОЗ НЕ НАЙДЕНО';
  setAlert(0, 'done');
  byId('glitch-joke').hidden = false;
  byId('glitch-ok').hidden = false;
  const count = byId('glitch-count');
  count.hidden = false;
  count.textContent = `Кнопку нажимали ${total} ${times(total)}. Любопытство — тоже сила природы.`;
  byId('glitch-ok').focus();
  confetti();
  later(stop, FINISH_DELAY);
 }

 function start() {
  if (running || finished) return;
  const overlay = byId('glitch-overlay') || markup();
  const total = countClick();
  running = true;
  lastFocused = document.activeElement;
  resetWindow();
  setAlert(0, 'alert');
  overlay.hidden = false;
  document.body.classList.add('glitch-lock');
  root().classList.add(reduceMotion() ? 'glitch-soft' : 'glitch-on');

  if (!reduceMotion()) {
   // Берём только «листовые» заголовки без вложенных тегов: замена текста не должна ломать разметку.
   victims = [...document.querySelectorAll('#app h1, #app h2, #app h3, .brand span:last-child')]
    .filter(node => !node.children.length && node.textContent.trim() && !node.closest('.glitch-overlay'))
    .slice(0, 12)
    .map(node => ({ node, original: node.innerHTML, text: node.textContent }));
   scramble(); jitterBars();
   every(scramble, 130);
   every(jitterBars, 165);
   every(shakeWindow, 95);
  }
  // Предупреждения сменяются в обоих режимах: в мягком это единственная «анимация».
  ALERTS.slice(1).forEach((entry, index) => later(() => setAlert(index + 1, 'alert'), (index + 1) * 2100));

  const startedAt = Date.now();
  const tick = () => {
   const ratio = Math.min((Date.now() - startedAt) / RUNTIME, 1);
   byId('glitch-progress-bar').style.width = `${(ratio * 100).toFixed(0)}%`;
   byId('glitch-progress-label').textContent = `УДАЛЕНИЕ ФАЙЛА ${WORDS[Math.min(Math.floor(ratio * WORDS.length), WORDS.length - 1)]}… ${(ratio * 100).toFixed(0)}%`;
   if (ratio >= 1) finish(total);
  };
  every(tick, 110);
  later(() => finish(total), RUNTIME + 500); // страховка, если интервал собьётся
 }

 function onKeydown(event) {
  const overlay = byId('glitch-overlay');
  if (!overlay || overlay.hidden) return;
  if (event.key === 'Escape') { event.preventDefault(); stop(); return }
  if (event.key !== 'Tab') return;
  event.preventDefault(); // фокус не уходит на страницу под оверлеем
  const focusable = [...overlay.querySelectorAll('button:not([hidden])')];
  if (!focusable.length) { byId('glitch-window').focus(); return }
  const index = focusable.indexOf(document.activeElement);
  focusable[(index + 1) % focusable.length].focus();
 }

 document.addEventListener('click', event => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  if (target.closest('#glitch-button')) { event.preventDefault(); start(); return }
  if (target.closest('#glitch-ok')) { stop(); return }
  const overlay = byId('glitch-overlay');
  if (overlay && !overlay.hidden && target === overlay.querySelector('.glitch-stage')) stop();
 });
 document.addEventListener('keydown', onKeydown);
})();
