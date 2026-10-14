// 回忆面板和钥匙：都是叠在画布上的普通 HTML（不是 canvas 里画的），读屏和键盘都能用。
//   · showMemory(entry, data)  镜头推近一件物件后打开，显示它装着的回忆
//   · askKey(tryPhrase)        门垫下的钥匙：输入暗号
//   · askLock(lock)            已经开着时点门垫：把小屋锁上
// 每种回忆怎么排版，写在下面的 SHOW 里（config.js 里物件的 memory 字段 → 这里的同名函数）。
import { dayCount, nextAnniversary } from './memory.js';

const el = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text != null) node.textContent = text; return node; };
const dots = date => date ? date.replaceAll('-', '.') : '';
const CLOSE = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5 5 15"/></svg>', BACK = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5"/></svg>';

// 一行一条的清单（去过的地方、一起看过的、想去的地方、小物件）。
function rows(items, empty) {
  if (!items?.length) return el('p', 'r3m-empty', empty);
  const list = el('ol', 'r3m-rows');
  for (const item of items) { const row = el('li'); if (item.date) row.append(el('time', '', dots(item.date))); row.append(el('strong', '', item.title)); if (item.note) row.append(el('span', '', item.note)); list.append(row); }
  return list;
}
const SHOW = {
  // 信：先是一叠信封，点一封展开来读，左上角的箭头回到信封。
  letters(body, data, head) {
    const letters = data.letters ?? [];
    if (!letters.length) { body.append(el('p', 'r3m-empty', '还没有信。')); return; }
    const list = el('div', 'r3m-letters');
    const open = letter => {
      const back = el('button', 'r3m-back'); back.type = 'button'; back.innerHTML = BACK; back.setAttribute('aria-label', '回到信封'); back.addEventListener('click', () => { body.replaceChildren(list); head.textContent = '信'; list.querySelector('button')?.focus(); });
      const page = el('article', 'r3m-letter'); page.append(el('h3', '', letter.title));
      for (const p of letter.paragraphs) page.append(el('p', '', p));
      page.append(el('footer', '', [letter.from, dots(letter.date)].filter(Boolean).join(' · ')));
      body.replaceChildren(back, page); head.textContent = letter.from ? `来自 ${letter.from}` : '信'; body.scrollTop = 0; back.focus();
    };
    for (const letter of letters) { const envelope = el('button', 'r3m-envelope'); envelope.type = 'button'; envelope.append(el('strong', '', letter.title), el('span', '', [letter.from && `来自 ${letter.from}`, dots(letter.date)].filter(Boolean).join(' · '))); envelope.addEventListener('click', () => open(letter)); list.append(envelope); }
    body.append(list);
  },
  // 纪念日：在一起第几天、下一个周年、一路走来的时间线。
  days(body, data) {
    const { since, timeline = [] } = data.days ?? {};
    if (since) {
      const next = nextAnniversary(since), count = el('div', 'r3m-count');
      count.append(el('small', '', 'DAY'), el('b', '', String(dayCount(since))), el('span', '', `从 ${dots(since)} 开始`));
      body.append(count, el('p', 'r3m-next', next.days === 0 ? `今天是 ${next.years} 周年` : `离 ${next.years} 周年还有 ${next.days} 天`));
    }
    body.append(rows(timeline, '时间线还是空的。'));
  },
  places: (body, data) => body.append(rows(data.places, '还没有一起去过的地方。')),
  watched: (body, data) => body.append(rows(data.watched, '还没有一起看过的。')),
  wishes: (body, data) => body.append(rows(data.wishes, '还没有想去的地方。')),
  things: (body, data) => body.append(rows(data.things, '还没有小物件。')),
  // 照片：按月份排的一格格小图（滚到才解密）；点一张放大看，左右键 / 两侧的箭头翻页，左上角回到格子。
  photos(body, data, head, { memory, panel }) {
    const photos = data.photos ?? [];
    panel.classList.add('is-wide');
    if (!photos.length) { body.append(el('p', 'r3m-empty', '还没有照片。')); return; }
    const wall = el('div', 'r3m-album'), seen = new IntersectionObserver(entries => { for (const entry of entries) if (entry.isIntersecting) { seen.unobserve(entry.target); memory.photo(entry.target.dataset.id, 't').then(url => { if (url) entry.target.style.backgroundImage = `url(${url})`; }); } }, { root: body, rootMargin: '200px' });
    let month = '', grid;
    photos.forEach((photo, index) => {
      const key = photo.date.slice(0, 7);
      if (key !== month || !grid) { month = key; wall.append(el('h3', '', key ? key.replace('-', ' · ') : '没写日期的')); grid = el('div', 'r3m-grid'); wall.append(grid); }
      const cell = el('button', 'r3m-photo'); cell.type = 'button'; cell.dataset.id = photo.id; cell.setAttribute('aria-label', photo.caption || `照片 ${dots(photo.date)}`);
      cell.addEventListener('click', () => look(index)); grid.append(cell); seen.observe(cell);
    });
    function look(index) {
      const photo = photos[index], back = el('button', 'r3m-back'), figure = el('figure', 'r3m-look'), image = el('img'), turn = step => look((index + step + photos.length) % photos.length);
      back.type = 'button'; back.innerHTML = BACK; back.setAttribute('aria-label', '回到相册');
      back.addEventListener('click', () => { body.replaceChildren(wall); head.textContent = '照片'; wall.querySelectorAll('.r3m-photo')[index]?.focus(); });
      image.alt = photo.caption || '照片'; image.style.aspectRatio = `${photo.w} / ${photo.h}`;
      memory.photo(photo.id, 't').then(url => { if (url && !image.dataset.full) image.src = url; });          // 先放小图，大图解开后换上
      memory.photo(photo.id, 'f').then(url => { if (url) { image.dataset.full = '1'; image.src = url; } });
      const caption = el('figcaption'); if (photo.caption) caption.append(el('span', '', photo.caption)); caption.append(el('time', '', dots(photo.date)));
      figure.append(image, caption);
      if (photos.length > 1) for (const [step, name, cls] of [[-1, '上一张', 'is-prev'], [1, '下一张', 'is-next']]) { const arrow = el('button', `r3m-turn ${cls}`); arrow.type = 'button'; arrow.innerHTML = BACK; arrow.setAttribute('aria-label', name); arrow.addEventListener('click', () => turn(step)); figure.append(arrow); }
      figure.tabIndex = -1; figure.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') { e.stopPropagation(); turn(-1); } else if (e.key === 'ArrowRight') { e.stopPropagation(); turn(1); } });
      body.replaceChildren(back, figure); head.textContent = `${index + 1} / ${photos.length}`; body.scrollTop = 0; figure.focus({ preventScroll: true });
    }
    body.append(wall);
  },
};

export function createPanel(host, memory) {
  let open = null;                                           // { node, done }：当前开着的那一块
  function close() { if (!open) return; const { node, done } = open; open = null; node.remove(); done?.(); }
  function show(node, done) { close(); host.append(node); open = { node, done }; requestAnimationFrame(() => node.classList.add('is-on')); }
  // Tab 不跑出面板；Esc 关闭。
  host.addEventListener('keydown', e => {
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key !== 'Tab') return;
    const stops = [...open.node.querySelectorAll('button,input,a[href]')].filter(n => !n.disabled); if (!stops.length) return;
    const first = stops[0], last = stops.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  const closer = label => { const button = el('button', 'r3m-close'); button.type = 'button'; button.innerHTML = CLOSE; button.setAttribute('aria-label', label); button.addEventListener('click', close); return button; };

  return {
    get open() { return !!open; }, close,
    showMemory(entry, data, done) {
      const panel = el('section', 'r3-panel'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', entry.label);
      const head = el('h2', '', entry.label), body = el('div', 'r3m-body'), x = closer('关上');
      panel.append(x, head, body); (SHOW[entry.memory] ?? SHOW.things)(body, data, head, { memory, panel });
      show(panel, done); x.focus({ preventScroll: true });
    },
    // tryPhrase(暗号) → Promise<boolean>。错了：纸条抖一下、清空；对了：关上（done 里接着拉回镜头）。
    askKey(tryPhrase, done) {
      const card = el('form', 'r3-key'); card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-label', '钥匙');
      card.innerHTML = '<svg class="r3-key-icon" viewBox="0 0 40 20" aria-hidden="true"><circle cx="9" cy="10" r="5.5"/><path d="M14.5 10H36M30 10v4.5M34 10v3.5"/></svg>';
      const input = el('input'); Object.assign(input, { type: 'password', autocomplete: 'off', spellcheck: false, enterKeyHint: 'go' }); input.setAttribute('aria-label', '暗号');
      card.append(input, closer('算了'));
      card.addEventListener('submit', async e => {
        e.preventDefault(); if (!input.value.trim() || card.classList.contains('is-busy')) return;
        card.classList.add('is-busy'); const right = await tryPhrase(input.value).catch(() => false); card.classList.remove('is-busy');
        if (right) { close(); return; }
        input.value = ''; card.classList.remove('is-wrong'); void card.offsetWidth; card.classList.add('is-wrong'); input.focus();
      });
      show(card, done); input.focus({ preventScroll: true });
    },
    askLock(lock, done) {
      const card = el('div', 'r3-key'); card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-label', '锁门');
      const button = el('button', 'r3-key-lock', '把小屋锁上'); button.type = 'button'; button.addEventListener('click', () => { lock(); close(); });
      card.append(button, closer('不锁')); show(card, done); button.focus({ preventScroll: true });
    },
  };
}
