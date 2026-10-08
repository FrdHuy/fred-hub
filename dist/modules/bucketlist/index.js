import { parseItems, itemLines } from './items.js?v=51';
import { loadEntries } from './storage.js?v=51';
import { lampStates, litCount, markCount, yearSpan, knobSteps, pad, SLOTS } from './panel.js?v=51';
import { play as sound } from '../../sound.js?v=51';
import notes from '../stories/data.js?v=51';
import { noteForItem } from '../stories/notes.js?v=51';
import { collectionPath } from '../../router.js';

const DETENT = 24;
// Each odometer drum is a strip of 0–9 that rolls to the current digit.
const digitsStrip = `<span class="deck-strip">${[...'0123456789'].map(d => `<span>${d}</span>`).join('')}</span>`;

// Inside the Life List: the full deck. Readout + 100 lamps + year odometer, selector knob and a PRINT key.
export function mount({ container, item, route }) {
  const events = new AbortController(), { signal } = events;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const now = new Date().getFullYear();
  let items = [], year = now, span = [now - 1, now], index = 0;

  const deck = document.createElement('section'); deck.className = 'deck'; deck.lang = 'zh-CN';
  deck.innerHTML = `<h1 class="deck-sr">人生清单</h1><span class="screw"></span><span class="screw"></span><span class="screw"></span><span class="screw"></span>
<div class="deck-readout" aria-live="polite"><p class="deck-no"></p><p class="deck-text"></p><p class="deck-state"></p><p class="deck-count"></p></div>
<div class="deck-field" role="listbox" aria-label="人生清单：方向键逐件浏览"></div>
<div class="deck-controls">
<div class="deck-control"><div class="deck-odometer" role="spinbutton" tabindex="0" aria-label="回看年份，上下拨动">${`<span class="deck-drum">${digitsStrip}</span>`.repeat(4)}</div><span class="deck-label">YEAR</span></div>
<div class="deck-control"><div class="deck-knob" role="slider" tabindex="0" aria-label="选择旋钮，左右转动逐件浏览"><span class="deck-knob-skirt"></span><span class="deck-knob-cap"></span><span class="deck-knob-mark"></span></div><span class="deck-label">SELECT</span></div>
<div class="deck-control"><button class="deck-print" type="button" aria-label="打印完整清单"><span>PRINT</span></button><span class="deck-label">&nbsp;</span></div>
</div>
<span class="deck-silk" aria-hidden="true">LIFE LIST · Nº 100 · FRED <b>●</b></span>`;
  const slot = document.createElement('div'); slot.className = 'deck-slot'; slot.setAttribute('aria-hidden', 'true');
  const receipt = document.createElement('div'); receipt.className = 'deck-receipt'; receipt.hidden = true; receipt.setAttribute('aria-hidden', 'true');
  const full = document.createElement('ol'); full.className = 'deck-sr';
  const notice = document.createElement('div'); notice.className = 'deck-notice'; notice.hidden = true;
  notice.innerHTML = '<p role="status"></p><button type="button" hidden>复制旧条目</button>';
  container.append(deck, slot, receipt, full, notice);
  const $ = selector => deck.querySelector(selector);
  const field = $('.deck-field'), odometer = $('.deck-odometer'), knob = $('.deck-knob'), printKey = $('.deck-print');
  const readout = { no: $('.deck-no'), text: $('.deck-text'), state: $('.deck-state'), count: $('.deck-count') };
  const message = notice.querySelector('p'), copy = notice.querySelector('button');
  const say = text => { message.textContent = text; notice.hidden = !text; };

  function stateOf(i) {
    const entry = items[i];
    if (!entry) return '';
    if (entry.milestone) return entry.year <= year ? `◎ MILESTONE · ${entry.year}` : `○ LATER · ${entry.year}`;
    if (!entry.done) return '○ SOMEDAY';
    if ((entry.year ?? now) > year) return `○ NOT YET · ${entry.year ?? now}`;
    return `● DONE${entry.year ? ` · ${entry.year}` : ''}`;
  }
  function show() {
    const entry = items[index];
    readout.no.textContent = entry ? `Nº ${pad(index + 1)}` : 'Nº ---';
    readout.text.textContent = entry ? entry.text : '尚未写下第一件事';
    const state = stateOf(index), mark = document.createElement('b'); mark.textContent = state.slice(0, 1);
    readout.state.replaceChildren(mark, state.slice(1));
    readout.state.classList.toggle('is-lit', state.startsWith('●'));
    readout.state.classList.toggle('is-mark', state.startsWith('◎'));
    // A chapter written in 手记 about this item: the readout offers it.
    const note = entry && noteForItem(Array.isArray(notes) ? notes : [], entry.text);
    if (note) { const link = document.createElement('a'); link.className = 'deck-read'; link.href = collectionPath('stories', note.id); link.textContent = 'READ →'; readout.state.append(link); }
  }
  function render() {
    const states = lampStates(items, year, now);
    [...field.children].forEach((lamp, i) => { lamp.classList.toggle('is-done', states[i] === 'done'); lamp.classList.toggle('is-todo', states[i] === 'todo'); lamp.classList.toggle('is-mark', states[i] === 'mark'); });
    const marks = markCount(states);
    readout.count.textContent = `${year} · ${pad(litCount(states))}/${SLOTS}${marks ? ` · ◎ ${pad(marks, 2)}` : ''}`;
    [...odometer.children].forEach((drum, i) => drum.style.setProperty('--d', String(year)[i]));
    odometer.setAttribute('aria-valuenow', year); odometer.setAttribute('aria-valuetext', `${year} 年，已完成 ${litCount(states)} 件`);
    show();
  }
  function select(i, { focus = false } = {}) {
    if (!items.length) return;
    i = Math.max(0, Math.min(items.length - 1, i));
    const lamps = [...field.children];
    lamps[index]?.classList.remove('is-sel'); lamps[index]?.setAttribute('aria-selected', 'false'); if (lamps[index]) lamps[index].tabIndex = -1;
    if (i !== index) sound('tick');
    index = i;
    lamps[i].classList.add('is-sel'); lamps[i].setAttribute('aria-selected', 'true'); lamps[i].tabIndex = 0;
    if (focus) lamps[i].focus({ preventScroll: true });
    knob.style.setProperty('--angle', `${i * DETENT}deg`);
    knob.setAttribute('aria-valuenow', i + 1); knob.setAttribute('aria-valuetext', `第 ${i + 1} 件：${items[i].text}`);
    show();
  }
  // At either end the drums nudge and settle back, so a stop feels like a stop.
  function setYear(next) {
    const clamped = Math.max(span[0], Math.min(span[1], next));
    if (clamped === year) {
      if (next !== year && !motion.matches) odometer.animate([{ translate: '0 0' }, { translate: `0 ${next > year ? -3 : 3}px` }, { translate: '0 0' }], { duration: 180, easing: 'ease-out' });
      return false;
    }
    sound('tick');
    year = clamped; render(); return true;
  }

  function build(data) {
    const parsed = parseItems(data); items = parsed.items.slice(0, SLOTS);
    span = yearSpan(items, now); year = now;
    odometer.setAttribute('aria-valuemin', span[0]); odometer.setAttribute('aria-valuemax', span[1]);
    knob.setAttribute('aria-valuemin', 1); knob.setAttribute('aria-valuemax', Math.max(1, items.length));
    field.replaceChildren(...Array.from({ length: SLOTS }, (_, i) => {
      const entry = items[i];
      if (!entry) { const empty = document.createElement('span'); empty.className = 'deck-lamp is-empty'; empty.style.setProperty('--n', i); return empty; }
      const lamp = document.createElement('button'); lamp.type = 'button'; lamp.className = 'deck-lamp'; lamp.tabIndex = -1;
      lamp.setAttribute('role', 'option'); lamp.setAttribute('aria-selected', 'false'); lamp.style.setProperty('--n', i);
      lamp.setAttribute('aria-label', `${pad(i + 1)} ${entry.text}${entry.milestone ? `，人生大事件 ${entry.year}` : entry.done ? `，已完成${entry.year ? ` ${entry.year}` : ''}` : ''}`);
      lamp.addEventListener('click', () => select(i), { signal });
      lamp.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') select(i); }, { signal });
      return lamp;
    }));
    full.replaceChildren(...items.map(entry => { const li = document.createElement('li'); li.textContent = `${entry.text}${entry.milestone ? `（人生大事件 ${entry.year}）` : entry.done ? `（已完成${entry.year ? ` ${entry.year}` : ''}）` : ''}`; return li; }));
    // #/collection/bucketlist/<item text> (links from 手记) selects that lamp.
    const wanted = route ? items.findIndex(entry => entry.text === route) : -1;
    render(); if (items.length) select(Math.max(0, wanted)); else show();
    if (parsed.errors.length) say(`有 ${parsed.errors.length} 条没显示：${parsed.errors.join('；')}。运行 node scripts/check-bucketlist.mjs 查看详情。`);
    if (!motion.matches) deck.classList.add('is-booting');
  }

  // Lamp grid keys: ←/→ one, ↑/↓ a row, Home/End.
  field.addEventListener('keydown', e => {
    const move = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -10, ArrowDown: 10 }[e.key];
    if (move !== undefined) { e.preventDefault(); select(index + move, { focus: true }); }
    else if (e.key === 'Home') { e.preventDefault(); select(0, { focus: true }); }
    else if (e.key === 'End') { e.preventDefault(); select(items.length - 1, { focus: true }); }
  }, { signal });

  // Selector knob: turn it; every detent clicks to the next wish.
  let grab = null;
  const tick = () => { if (!motion.matches) knob.animate([{ scale: '1' }, { scale: '.96' }, { scale: '1' }], { duration: 110 }); };
  knob.addEventListener('pointerdown', e => {
    if (e.button !== 0) return; e.preventDefault(); knob.setPointerCapture(e.pointerId);
    const box = knob.getBoundingClientRect(), cx = box.left + box.width / 2, cy = box.top + box.height / 2;
    grab = { cx, cy, last: Math.atan2(e.clientY - cy, e.clientX - cx), turned: 0, applied: 0 };
    knob.classList.add('is-held');
  }, { signal });
  knob.addEventListener('pointermove', e => {
    if (!grab) return;
    const angle = Math.atan2(e.clientY - grab.cy, e.clientX - grab.cx);
    let delta = angle - grab.last; if (delta > Math.PI) delta -= 2 * Math.PI; if (delta < -Math.PI) delta += 2 * Math.PI;
    grab.last = angle; grab.turned += delta * 180 / Math.PI;
    const steps = knobSteps(grab.turned, DETENT);
    if (steps !== grab.applied) { const before = index; select(index + steps - grab.applied); grab.applied = steps; if (index !== before) tick(); }
    // Between detents the cap follows the hand a little, then springs into the notch on release.
    knob.style.setProperty('--drag', `${Math.max(-DETENT * .45, Math.min(DETENT * .45, grab.turned - grab.applied * DETENT))}deg`);
  }, { signal });
  const letGo = () => { if (!grab) return; grab = null; knob.classList.remove('is-held'); knob.style.setProperty('--drag', '0deg'); };
  knob.addEventListener('pointerup', letGo, { signal }); knob.addEventListener('pointercancel', letGo, { signal });
  knob.addEventListener('keydown', e => {
    const move = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[e.key];
    if (move !== undefined) { e.preventDefault(); select(index + move); tick(); }
  }, { signal });
  knob.addEventListener('wheel', e => { e.preventDefault(); select(index + Math.sign(e.deltaY || e.deltaX)); tick(); }, { passive: false, signal });

  // Year odometer: drag the drums up/down (one year per notch), wheel or ↑/↓.
  let roll = null;
  odometer.addEventListener('pointerdown', e => { if (e.button !== 0) return; e.preventDefault(); odometer.setPointerCapture(e.pointerId); roll = { y: e.clientY, applied: 0 }; odometer.classList.add('is-held'); }, { signal });
  odometer.addEventListener('pointermove', e => {
    if (!roll) return;
    const steps = Math.trunc((roll.y - e.clientY) / 16);
    if (steps !== roll.applied) { setYear(year + steps - roll.applied); roll.applied = steps; }
  }, { signal });
  const stopRoll = () => { roll = null; odometer.classList.remove('is-held'); };
  odometer.addEventListener('pointerup', stopRoll, { signal }); odometer.addEventListener('pointercancel', stopRoll, { signal });
  odometer.addEventListener('wheel', e => { e.preventDefault(); setYear(year - Math.sign(e.deltaY)); }, { passive: false, signal });
  odometer.addEventListener('keydown', e => {
    const move = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
    if (move !== undefined) { e.preventDefault(); setYear(year + move); }
    else if (e.key === 'Home') { e.preventDefault(); setYear(span[0]); }
    else if (e.key === 'End') { e.preventDefault(); setYear(span[1]); }
  }, { signal });

  // PRINT: the key goes down and a thermal receipt feeds out of the slot, line by line.
  let printing = null;
  printKey.addEventListener('click', () => {
    sound('key'); sound('print');
    const states = lampStates(items, year, now);
    const paper = document.createElement('div'); paper.className = 'deck-paper';
    const line = (className, cells) => { const row = document.createElement('div'); row.className = className; cells.forEach(text => { const cell = document.createElement('span'); cell.textContent = text; row.append(cell); }); paper.append(row); };
    line('deck-head', ['LIFE LIST · PRINTOUT', String(year)]);
    if (!items.length) line('deck-row', ['---', '尚未落笔', '○', '']);
    const mark = { done: '●', mark: '◎' };
    items.forEach((entry, i) => line(`deck-row${states[i] === 'done' ? ' is-done' : ''}${states[i] === 'mark' ? ' is-mark' : ''}`, [pad(i + 1), entry.text, mark[states[i]] ?? '○', mark[states[i]] ? String(entry.year ?? '') : '']));
    line('deck-foot', [`${pad(litCount(states))}/${SLOTS} COMPLETE${markCount(states) ? ` · ◎ ${pad(markCount(states), 2)}` : ''}`, 'FRED']);
    receipt.replaceChildren(paper); receipt.hidden = false;
    printing?.cancel();
    if (motion.matches) return;
    const lines = Math.max(4, items.length + 3);
    slot.classList.add('is-feeding');
    printing = receipt.animate([{ clipPath: 'inset(0 0 100% 0)', translate: '0 -10px' }, { clipPath: 'inset(0 0 0 0)', translate: '0 0' }], { duration: Math.min(2600, 280 + lines * 90), easing: `steps(${lines}, end)` });
    printing.finished.then(() => slot.classList.remove('is-feeding'), () => slot.classList.remove('is-feeding'));
  }, { signal });

  // Entries typed into earlier versions live only in this browser; offer them for data.js.
  let legacy = [];
  try { legacy = loadEntries(localStorage); } catch {}
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(itemLines(legacy)); say('已复制。粘贴到 dist/modules/bucketlist/data.js 的方括号里。'); }
    catch { say(itemLines(legacy)); }
    copy.hidden = true;
  }, { signal });

  // A fresh URL each visit so edits to data.js show after a normal refresh.
  import(`./data.js?t=${Date.now()}`).then(module => {
    if (signal.aborted) return;
    build(module.default);
    if (legacy.length && notice.hidden) { say(`这台浏览器里还存着 ${legacy.length} 条以前在网页上写的清单，其他人看不到。复制后粘贴进 data.js 即可公开。`); copy.hidden = false; }
  }, error => {
    if (signal.aborted) return;
    build([]); say(`data.js 读取失败（多半是少了逗号、引号或括号）。运行 node scripts/check-bucketlist.mjs 查看出错位置。${error.message ? ` ${error.message}` : ''}`);
  });

  return () => { events.abort(); printing?.cancel(); };
}
