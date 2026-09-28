import { parseItems, itemLines } from './items.js?v=26';
import { loadEntries } from './storage.js?v=26';

// Read-only list from data.js: everyone sees the same page; only the author edits the file.
export function mount({ container, item }) {
  const events = new AbortController(), { signal } = events;
  const paper = document.createElement('section'); paper.className = 'life-paper'; paper.lang = 'zh-CN';
  paper.innerHTML = `<header class="life-heading"><span class="life-owner">想做的事 · 慢慢完成</span><h1>人生清单<span aria-hidden="true">.</span></h1><span class="life-doodle" aria-hidden="true">✳</span></header><ol class="life-list" aria-label="人生清单"></ol><p class="life-empty" hidden></p><footer class="life-footer"><span class="life-count"></span><span class="life-signature" aria-hidden="true">不赶时间，一件一件来。</span></footer><div class="life-notice" hidden><p role="status"></p><button type="button" hidden>复制旧条目</button></div>`;
  container.append(paper);
  const list = paper.querySelector('ol'), empty = paper.querySelector('.life-empty'), count = paper.querySelector('.life-count');
  const notice = paper.querySelector('.life-notice'), message = notice.querySelector('p'), copy = notice.querySelector('button');
  const say = text => { message.textContent = text; notice.hidden = !text; };

  function row({ text, done }, index) {
    const li = document.createElement('li'); li.className = `life-row${done ? ' is-done' : ''}`;
    const number = document.createElement('span'); number.className = 'life-number'; number.setAttribute('aria-hidden', 'true'); number.textContent = String(index + 1).padStart(2, '0');
    const body = document.createElement('span'); body.className = 'life-item';
    const box = document.createElement('span'); box.className = 'life-checkbox'; box.setAttribute('aria-hidden', 'true'); box.textContent = '✓';
    const label = document.createElement('span'); label.className = 'life-text'; label.textContent = text;
    const state = document.createElement('span'); state.className = 'life-sr'; state.textContent = done ? '（已完成）' : '';
    body.append(box, label, state); li.append(number, body); return li;
  }

  function render(data) {
    const { items, errors } = parseItems(data);
    list.replaceChildren(...items.map(row));
    empty.hidden = items.length > 0; empty.textContent = item.emptyTitle;
    count.textContent = items.length ? `${items.filter(entry => entry.done).length} / ${items.length} 已完成` : '';
    if (errors.length) say(`有 ${errors.length} 条没显示：${errors.join('；')}。运行 node scripts/check-bucketlist.mjs 查看详情。`);
  }

  // Entries typed into earlier versions live only in this browser; offer them for data.js.
  let legacy = [];
  try { legacy = loadEntries(localStorage); } catch {}
  function offerLegacy() {
    if (!legacy.length || !notice.hidden) return;
    say(`这台浏览器里还存着 ${legacy.length} 条以前在网页上写的清单，其他人看不到。复制后粘贴进 data.js 即可公开。`);
    copy.hidden = false;
  }
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(itemLines(legacy)); say('已复制。粘贴到 dist/modules/bucketlist/data.js 的方括号里。'); copy.hidden = true; }
    catch { say(itemLines(legacy)); copy.hidden = true; }
  }, { signal });

  // A fresh URL each visit so edits to data.js show after a normal refresh.
  import(`./data.js?t=${Date.now()}`).then(module => { if (!signal.aborted) { render(module.default); offerLegacy(); } }, error => {
    if (signal.aborted) return;
    render([]); say(`data.js 读取失败（多半是少了逗号、引号或括号）。运行 node scripts/check-bucketlist.mjs 查看出错位置。${error.message ? ` ${error.message}` : ''}`);
  });
  return () => events.abort();
}
