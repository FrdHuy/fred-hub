import { parseItems, itemLines } from './items.js?v=27';
import { loadEntries } from './storage.js?v=27';
import { chineseNumber } from './fortune.js?v=27';
import { sealSvg } from './cover.js?v=27';

// A hand scroll read right to left: one column per wish, a cinnabar seal on the ones already done.
export function mount({ container, item }) {
  const events = new AbortController(), { signal } = events;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const scroll = document.createElement('section'); scroll.className = 'life-scroll'; scroll.lang = 'zh-CN';
  scroll.innerHTML = `<h1 class="life-sr">人生清单</h1><span class="life-rod" aria-hidden="true"></span><div class="life-sheet" tabindex="0" aria-label="人生清单，横向滚动阅读"><ol class="life-columns"></ol></div><span class="life-rod" aria-hidden="true"></span>`;
  const notice = document.createElement('div'); notice.className = 'life-notice'; notice.hidden = true;
  notice.innerHTML = '<p role="status"></p><button type="button" hidden>复制旧条目</button>';
  container.append(scroll, notice);
  const sheet = scroll.querySelector('.life-sheet'), columns = scroll.querySelector('.life-columns');
  const message = notice.querySelector('p'), copy = notice.querySelector('button');
  const say = text => { message.textContent = text; notice.hidden = !text; };

  function column(className, parts, order) {
    const li = document.createElement('li'); li.className = `life-col ${className}`; li.style.setProperty('--o', order);
    li.append(...parts); return li;
  }
  function span(className, text) { const element = document.createElement('span'); element.className = className; element.textContent = text; return element; }

  function render(data) {
    const { items, errors } = parseItems(data), done = items.filter(entry => entry.done).length;
    const title = column('life-col--title', [span('life-title', '人生清单'), span('life-subtitle', '想做的事 · 慢慢完成')], 0);
    title.setAttribute('aria-hidden', 'true');
    const wishes = items.map((entry, index) => {
      const parts = [span('life-wish', entry.text), span('life-no', chineseNumber(index + 1))];
      if (entry.done) { const seal = document.createElement('span'); seal.className = 'life-seal'; seal.innerHTML = sealSvg('已成'); parts.push(seal, span('life-sr', '（已成）')); }
      return column(entry.done ? 'is-done' : '', parts, index + 1);
    });
    if (!items.length) wishes.push(column('life-col--empty', [span('life-wish', item.emptyTitle)], 1));
    const tally = items.length ? `已成${chineseNumber(done)}件 · 共${chineseNumber(items.length)}件` : '';
    const end = column('life-col--end', [span('life-tally', tally), span('life-sign', '不赶时间，一件一件来。')], wishes.length + 1);
    // Faint empty columns fill the rest of the paper: room for wishes not yet written.
    const blank = document.createElement('li'); blank.className = 'life-blank'; blank.setAttribute('aria-hidden', 'true');
    columns.replaceChildren(title, ...wishes, end, blank);
    if (errors.length) say(`有 ${errors.length} 条没显示：${errors.join('；')}。运行 node scripts/check-bucketlist.mjs 查看详情。`);
    // The left roller starts at the right edge and rolls out with the paper.
    if (!motion.matches) { scroll.style.setProperty('--span', `${sheet.clientWidth}px`); scroll.classList.add('is-unrolling'); }
  }

  // Vertical wheel and mouse drag both move along the scroll (right-to-left reading).
  sheet.addEventListener('wheel', e => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || sheet.scrollWidth <= sheet.clientWidth) return;
    e.preventDefault(); sheet.scrollBy({ left: -e.deltaY, behavior: 'auto' });
  }, { passive: false, signal });
  let drag = null;
  sheet.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button === 0) drag = { x: e.clientX, left: sheet.scrollLeft }; }, { signal });
  addEventListener('pointermove', e => { if (drag) { sheet.scrollLeft = drag.left - (e.clientX - drag.x); sheet.classList.add('is-dragging'); } }, { signal });
  addEventListener('pointerup', () => { drag = null; sheet.classList.remove('is-dragging'); }, { signal });

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
    render(module.default);
    if (legacy.length && notice.hidden) { say(`这台浏览器里还存着 ${legacy.length} 条以前在网页上写的清单，其他人看不到。复制后粘贴进 data.js 即可公开。`); copy.hidden = false; }
  }, error => {
    if (signal.aborted) return;
    render([]); say(`data.js 读取失败（多半是少了逗号、引号或括号）。运行 node scripts/check-bucketlist.mjs 查看出错位置。${error.message ? ` ${error.message}` : ''}`);
  });
  return () => events.abort();
}
