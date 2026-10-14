// 回忆面板和钥匙：都是叠在画布上的普通 HTML（不是 canvas 里画的），读屏和键盘都能用。
//   · showMemory(entry, data)  镜头推近一件物件后打开，显示它装着的回忆；连着线时可以添加、修改、删除
//   · askKey(tryPhrase)        门垫下的钥匙：输入暗号
//   · askLock(lock)            已经开着时点门垫：把小屋锁上
// 每种回忆怎么排版，写在下面的 SHOW 里（config.js 里物件的 memory 字段 → 这里的同名函数）。
import { dayCount, nextAnniversary } from './memory.js';
import { STAGE_NAME, SPECIES, wateredBy, water, recall, progressOf, speciesFor, plant as sow, cut, unseenFor, markSeen, bloomColor } from './growth.js';
import { toParagraphs } from './edits.js';

const el = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text != null) node.textContent = text; return node; };
const dots = date => date ? date.replaceAll('-', '.') : '';
const CLOSE = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5 5 15"/></svg>', BACK = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5"/></svg>';

const PEN = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 15.5l1-3.6 7.6-7.6a1.8 1.8 0 0 1 2.6 2.6l-7.6 7.6zM11.8 5.6l2.6 2.6"/></svg>';
const PLUS = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4.5v11M4.5 10h11"/></svg>';
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const iconButton = (className, icon, label, onClick) => { const button = el('button', className); button.type = 'button'; button.innerHTML = icon; button.setAttribute('aria-label', label); button.title = label; button.addEventListener('click', onClick); return button; };
const backButton = (label, onClick) => iconButton('r3m-back', BACK, label, onClick);

// 编辑：把面板的正文换成一张小表单。fields：[{ name, kind: 'date' | 'text' | 'long' | 'pick', hint, options? }]。
// 保存 → onSave(值)；删除要点两下（第一下变成「再点一下删除」）；左上角的箭头不保存直接回去。
function editor(ctx, title, fields, value, { onSave, onDelete }) {
  const form = el('form', 'r3m-form'), inputs = {};
  ctx.head.textContent = title;
  for (const field of fields) {
    let input;
    if (field.kind === 'long') { input = el('textarea'); input.rows = field.rows ?? 4; }
    else if (field.kind === 'pick') { input = el('select'); for (const option of field.options) input.append(Object.assign(el('option', '', option), { value: option })); }
    else { input = el('input'); input.type = field.kind === 'date' ? 'date' : 'text'; }
    input.name = field.name; input.value = value[field.name] ?? ''; input.placeholder = field.hint ?? ''; input.setAttribute('aria-label', field.hint ?? field.name);
    if (field.required) input.required = true;
    inputs[field.name] = input; form.append(input);
  }
  const row = el('div', 'r3m-form-row'), save = el('button', 'r3m-save', '保存'), note = el('span', 'r3m-form-note');
  save.type = 'submit'; row.append(save, note);
  if (onDelete) { const drop = el('button', 'r3m-drop', '删除'); drop.type = 'button'; drop.addEventListener('click', async () => { if (!drop.classList.contains('is-sure')) { drop.classList.add('is-sure'); drop.textContent = '再点一下删除'; return; } drop.disabled = true; try { await onDelete(); ctx.render(); } catch { note.textContent = '没删成，再试一次'; drop.disabled = false; } }); row.append(drop); }
  form.append(row);
  form.addEventListener('submit', async e => {
    e.preventDefault(); save.disabled = true; note.textContent = '';
    const values = Object.fromEntries(Object.entries(inputs).map(([name, input]) => [name, input.value.trim()]));
    try { await onSave(values); ctx.render(); } catch { note.textContent = '没存上，再试一次'; save.disabled = false; }
  });
  ctx.body.replaceChildren(backButton('不改了', () => ctx.render()), form); ctx.body.scrollTop = 0;
  Object.values(inputs)[0]?.focus();
}
// 能改的时候（连着线、知道自己是谁），面板右上角多一个「+」。
function adder(ctx, label, onClick) { if (ctx.edit) ctx.panel.append(iconButton('r3m-add', PLUS, label, onClick)); }
const LINE = [{ name: 'date', kind: 'date', hint: '日期（可以不写）' }, { name: 'title', hint: '写点什么', required: true }, { name: 'note', kind: 'long', hint: '再说一句（可以不写）', rows: 3 }];

// 一行一条的清单（时间线、去过的地方、一起看过的、想去的地方、小物件）。能改的时候每一行点开就是编辑。
function rows(ctx, name, items, empty, title) {
  const edit = item => editor(ctx, item ? '改一下' : title, LINE, item ?? { date: name === 'timeline' || name === 'places' ? today() : '' }, { onSave: values => ctx.memory.save(name, { ...item, ...values }), onDelete: item && (() => ctx.memory.remove(name, item.id)) });
  adder(ctx, title, () => edit());
  if (!items?.length) return el('p', 'r3m-empty', empty);
  const list = el('ol', 'r3m-rows');
  for (const item of items) {
    const row = el('li'), inner = ctx.edit ? el('button', 'r3m-row') : row;
    if (item.date) inner.append(el('time', '', dots(item.date))); inner.append(el('strong', '', item.title)); if (item.note) inner.append(el('span', '', item.note));
    if (ctx.edit) { inner.type = 'button'; inner.addEventListener('click', () => edit(item)); row.append(inner); }
    list.append(row);
  }
  return list;
}
const SHOW = {
  // 信：先是一叠信封，点一封展开来读，左上角的箭头回到信封；能改的时候读信页右上角有一支笔。
  letters(ctx) {
    const { body, head, memory } = ctx, letters = memory.data.letters ?? [], people = memory.data.people ?? [];
    const write = letter => editor(ctx, letter ? '改这封信' : '写一封信', [
      { name: 'title', hint: '标题', required: true }, { name: 'from', kind: 'pick', options: people }, { name: 'date', kind: 'date', hint: '日期' }, { name: 'text', kind: 'long', hint: '正文（空一行分段）', rows: 9, required: true },
    ], letter ? { ...letter, text: letter.paragraphs.join('\n\n') } : { from: memory.me, date: today() }, {
      onSave: ({ text, ...values }) => memory.save('letters', { ...letter, ...values, paragraphs: toParagraphs(text) }),
      onDelete: letter && (() => memory.remove('letters', letter.id)),
    });
    adder(ctx, '写一封信', () => write());
    if (!letters.length) { body.append(el('p', 'r3m-empty', '还没有信。')); return; }
    const list = el('div', 'r3m-letters');
    const open = letter => {
      const page = el('article', 'r3m-letter'); page.append(el('h3', '', letter.title));
      for (const p of letter.paragraphs) page.append(el('p', '', p));
      page.append(el('footer', '', [letter.from, dots(letter.date)].filter(Boolean).join(' · ')));
      const tools = el('div', 'r3m-tools'); tools.append(backButton('回到信封', () => ctx.render()));
      if (ctx.edit) tools.append(iconButton('r3m-pen', PEN, '改这封信', () => write(letter)));
      body.replaceChildren(tools, page); head.textContent = letter.from ? `来自 ${letter.from}` : '信'; body.scrollTop = 0; tools.firstChild.focus();
    };
    for (const letter of letters) { const envelope = el('button', 'r3m-envelope'); envelope.type = 'button'; envelope.append(el('strong', '', letter.title), el('span', '', [letter.from && `来自 ${letter.from}`, dots(letter.date)].filter(Boolean).join(' · '))); envelope.addEventListener('click', () => open(letter)); list.append(envelope); }
    body.append(list);
  },
  // 纪念日：在一起第几天（能改的时候点数字改日子）、下一个周年、一路走来的时间线。
  days(ctx) {
    const { body, memory } = ctx, { since, timeline = [] } = memory.data.days ?? {};
    const setSince = () => editor(ctx, '在一起的那天', [{ name: 'since', kind: 'date', hint: '在一起的那天', required: true }], { since }, { onSave: ({ since: next }) => memory.change(state => { (state.days ??= {}).since = next; return state; }) });
    if (since) {
      const next = nextAnniversary(since), count = el(ctx.edit ? 'button' : 'div', 'r3m-count');
      count.append(el('small', '', 'DAY'), el('b', '', String(dayCount(since))), el('span', '', `从 ${dots(since)} 开始`));
      if (ctx.edit) { count.type = 'button'; count.setAttribute('aria-label', `在一起第 ${dayCount(since)} 天，改日子`); count.addEventListener('click', setSince); }
      body.append(count, el('p', 'r3m-next', next.days === 0 ? `今天是 ${next.years} 周年` : `离 ${next.years} 周年还有 ${next.days} 天`));
    } else if (ctx.edit) { const start = el('button', 'r3m-row', '写下在一起的那天'); start.type = 'button'; start.addEventListener('click', setSince); body.append(start); }
    body.append(rows(ctx, 'timeline', timeline, '时间线还是空的。', '时间线上加一件事'));
  },
  places: ctx => ctx.body.append(rows(ctx, 'places', ctx.memory.data.places, '还没有一起去过的地方。', '加一个去过的地方')),
  watched: ctx => ctx.body.append(rows(ctx, 'watched', ctx.memory.data.watched, '还没有一起看过的。', '加一部一起看过的')),
  wishes: ctx => ctx.body.append(rows(ctx, 'wishes', ctx.memory.data.wishes, '还没有想去的地方。', '加一个想去的地方')),
  things: ctx => ctx.body.append(rows(ctx, 'things', ctx.memory.data.things, '还没有小物件。', '加一件小物件')),
  // 花瓶：你们互相送的花，新的在前；打开时把送给自己、还没看过的标成看过。
  bouquets(ctx) {
    const { body, memory } = ctx, all = memory.data.bouquets ?? [], fresh = new Set(unseenFor(memory.data, memory.me).map(b => b.id));
    if (fresh.size && ctx.edit) memory.change(state => markSeen(state, memory.me)).catch(() => {});
    if (!all.length) { body.append(el('p', 'r3m-empty', '还没有人送过花。开了花的，可以剪一束送给对方。')); return; }
    const list = el('ol', 'r3m-rows r3m-bouquets');
    for (const b of all) {
      const row = el('li', fresh.has(b.id) ? 'is-new' : ''), dot = el('i'); dot.style.background = b.color;
      row.append(el('time', '', dots(b.date)), Object.assign(el('strong'), { textContent: `${b.from} 送给 ${b.to}` }), el('span', '', [`${SPECIES[b.species] ?? ''}${b.flower && b.flower !== SPECIES[b.species] ? ` · ${b.flower}` : ''}`, b.note].filter(Boolean).join(' — ')));
      row.querySelector('strong').prepend(dot); list.append(row);
    }
    body.append(list);
  },
  // 照片：按月份排的一格格小图（滚到才解密）；点一张放大看，左右键 / 两侧的箭头翻页。
  // 能改的时候：右上角「+」从这台设备选照片放进来；看大图时右上角的笔可以改那句话、日期，或者删掉。
  photos(ctx) {
    const { body, head, memory, panel } = ctx, photos = memory.data.photos ?? [];
    panel.classList.add('is-wide');
    if (ctx.edit) {
      const picker = Object.assign(el('input'), { type: 'file', accept: 'image/*', multiple: true, hidden: true });
      picker.addEventListener('change', async () => {
        const files = [...picker.files]; if (!files.length) return;
        const status = el('p', 'r3m-uploading'); body.prepend(status);
        try { const added = await memory.addPhotos(files, (i, n) => { status.textContent = `正在放进相册 ${i} / ${n}`; }); ctx.render(); if (added < files.length) ctx.body.prepend(el('p', 'r3m-uploading', `有 ${files.length - added} 张这个浏览器读不了（比如 HEIC），换成 JPG 再试`)); }
        catch { status.textContent = '没放进去，再试一次'; }
      });
      panel.append(picker); adder(ctx, '放几张照片进来', () => picker.click());
    }
    if (!photos.length) { body.append(el('p', 'r3m-empty', '还没有照片。')); return; }
    const wall = el('div', 'r3m-album'), seen = new IntersectionObserver(entries => { for (const entry of entries) if (entry.isIntersecting) { seen.unobserve(entry.target); memory.photo(entry.target.dataset.id, 't').then(url => { if (url) entry.target.style.backgroundImage = `url(${url})`; }); } }, { root: body, rootMargin: '200px' });
    let month = '', grid;
    photos.forEach((photo, index) => {
      const key = (photo.date ?? '').slice(0, 7);
      if (key !== month || !grid) { month = key; wall.append(el('h3', '', key ? key.replace('-', ' · ') : '没写日期的')); grid = el('div', 'r3m-grid'); wall.append(grid); }
      const cell = el('button', 'r3m-photo'); cell.type = 'button'; cell.dataset.id = photo.id; cell.setAttribute('aria-label', photo.caption || `照片 ${dots(photo.date)}`);
      cell.addEventListener('click', () => look(index)); grid.append(cell); seen.observe(cell);
    });
    function look(index) {
      const photo = photos[index], figure = el('figure', 'r3m-look'), image = el('img'), turn = step => look((index + step + photos.length) % photos.length);
      const tools = el('div', 'r3m-tools'); tools.append(backButton('回到相册', () => ctx.render()));
      if (ctx.edit) tools.append(iconButton('r3m-pen', PEN, '改这张', () => editor(ctx, '改这张照片', [{ name: 'caption', hint: '一句话（可以不写）' }, { name: 'date', kind: 'date', hint: '日期' }], photo, { onSave: values => memory.save('photos', { ...photo, ...values }), onDelete: () => memory.removePhoto(photo) })));
      image.alt = photo.caption || '照片'; image.style.aspectRatio = `${photo.w} / ${photo.h}`;
      memory.photo(photo.id, 't').then(url => { if (url && !image.dataset.full) image.src = url; });          // 先放小图，大图解开后换上
      memory.photo(photo.id, 'f').then(url => { if (url) { image.dataset.full = '1'; image.src = url; } });
      const caption = el('figcaption'); if (photo.caption) caption.append(el('span', '', photo.caption)); caption.append(el('time', '', dots(photo.date)));
      figure.append(image, caption);
      if (photos.length > 1) for (const [step, name, cls] of [[-1, '上一张', 'is-prev'], [1, '下一张', 'is-next']]) { const arrow = el('button', `r3m-turn ${cls}`); arrow.type = 'button'; arrow.innerHTML = BACK; arrow.setAttribute('aria-label', name); arrow.addEventListener('click', () => turn(step)); figure.append(arrow); }
      figure.tabIndex = -1; figure.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') { e.stopPropagation(); turn(-1); } else if (e.key === 'ArrowRight') { e.stopPropagation(); turn(1); } });
      body.replaceChildren(tools, figure); head.textContent = `${index + 1} / ${photos.length}`; body.scrollTop = 0; figure.focus({ preventScroll: true });
    }
    body.append(wall);
  },
};

export function createPanel(host, memory) {
  let open = null;                                           // { node, done }：当前开着的那一块
  function close() { if (!open) return; const { node, done } = open; open = null; node.remove(); done?.(); }
  function show(node, done) { close(); host.append(node); open = { node, done }; requestAnimationFrame(() => node.classList.add('is-on')); }
  // Tab 不跑出面板；Esc 关闭。
  // 听整个页面的按键：存完 / 删完之后焦点可能落在页面上，Esc 也要能关。
  document.addEventListener('keydown', e => {
    if (!open || host.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key !== 'Tab') return;
    const stops = [...open.node.querySelectorAll('button,input:not([hidden]),select,textarea,a[href]')].filter(n => !n.disabled); if (!stops.length) return;
    const first = stops[0], last = stops.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  const closer = label => { const button = el('button', 'r3m-close'); button.type = 'button'; button.innerHTML = CLOSE; button.setAttribute('aria-label', label); button.addEventListener('click', close); return button; };

  return {
    get open() { return !!open; }, close,
    // 一件物件装着的回忆。ctx.render() 按最新的内容重画（存完、删完、从编辑返回时）。
    showMemory(entry, data, done) {
      const panel = el('section', 'r3-panel'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', entry.label);
      const head = el('h2'), body = el('div', 'r3m-body'), x = closer('关上');
      const ctx = { memory, panel, head, body, get edit() { return memory.online && !!memory.me; }, render() {
        panel.querySelectorAll('.r3m-add,input[type=file]').forEach(node => node.remove()); panel.classList.remove('is-wide');
        head.textContent = entry.label; body.replaceChildren(); (SHOW[entry.memory] ?? SHOW.things)(ctx);
        if (!panel.contains(document.activeElement)) x.focus({ preventScroll: true });       // 刚才按的按钮没了：焦点回到关闭键
      } };
      panel.append(x, head, body); ctx.render();
      show(panel, done); x.focus({ preventScroll: true });
    },
    // 一株植物的小纸牌：名字、第几天、当时的一句话；可以浇水（每株每天一次），浇完带出一段回忆。
    showPlant(plant, data, onWater, done) {
      const who = memory.me;
      const panel = el('section', 'r3-panel is-plant'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', plant.title);
      const head = el('h2', '', plant.title), body = el('div', 'r3m-body'), x = closer('关上');
      const kind = plant.stage === 'tree' ? '' : plant.memorial ? `纪念花 · ${SPECIES[plant.species]}` : `${SPECIES[plant.species]} · ${plant.rebloomIn ? `${plant.rebloomIn} 天后再开` : STAGE_NAME[plant.stage]}${plant.by ? ` · ${plant.by} 种的` : ''}`;
      body.append(el('p', 'r3m-plant', [`第 ${plant.days} 天`, dots(plant.date), kind].filter(Boolean).join('  ·  ')));
      if (plant.note) body.append(el('p', 'r3m-note', plant.note));
      if (plant.memorial) { panel.append(x, head, body); show(panel, done); x.focus({ preventScroll: true }); return; }        // 纪念花：只看，不参与养成
      // 今天谁浇过：每个人一个小水滴，浇过的是实心的。
      const today = el('p', 'r3m-today'), paintToday = () => { today.replaceChildren(...(memory.data?.people ?? []).map(name => { const mark = el('span', wateredBy(memory.data, plant.id).includes(name) ? 'is-done' : '', name); return mark; })); };
      paintToday(); body.append(today);
      const slot = el('div', 'r3m-water'); body.append(slot);
      // 浇水带出的那段回忆：一张照片、信里的一段，或者时间线上的一件事。
      const remember = () => {
        const found = recall(data, plant.id), card = el('div', 'r3m-recall'); slot.replaceChildren(card);
        if (!found) { card.append(el('p', '', '它喝饱了。')); return; }
        if (found.kind === 'photo') { const image = el('img'); image.alt = found.photo.caption || '照片'; image.style.aspectRatio = `${found.photo.w} / ${found.photo.h}`; memory.photo(found.photo.id, 't').then(url => { if (url) image.src = url; }); card.append(image, el('p', '', [found.photo.caption, dots(found.photo.date)].filter(Boolean).join(' · '))); }
        else if (found.kind === 'letter') card.append(el('blockquote', '', found.text), el('p', '', [found.from && `来自 ${found.from}`, dots(found.date)].filter(Boolean).join(' · ')));
        else card.append(el('strong', '', found.title), el('p', '', [found.note, dots(found.date)].filter(Boolean).join(' · ')));
      };
      if (!memory.online) slot.append(el('p', 'r3m-offline', '现在连不上小屋，浇水要等一会儿。'));
      else if (!who) slot.append(el('p', 'r3m-offline', '先在门垫那里说一下你是谁。'));
      else if (wateredBy(memory.data, plant.id).includes(who)) remember();
      else { const can = el('button', 'r3m-can'); can.type = 'button'; can.innerHTML = '<svg viewBox="0 0 28 20" aria-hidden="true"><path d="M8 7.5h10v9.5H8zM18 9.5l6.5-4.5M24.5 5l1.8 1.8M8 9.5H5.2a2.6 2.6 0 0 0 0 5.2H8M10.5 7.5a2.6 2.6 0 0 1 5 0"/></svg><span>浇水</span>'; can.addEventListener('click', async () => { can.disabled = true; try { await memory.change(state => water(state, plant.id, who)); onWater?.(); paintToday(); remember(); x.focus(); } catch { can.disabled = false; } }); slot.append(can); }
      // 开着的、亲手种的花：剪一束送给对方（写一句话）。
      const other = (memory.data?.people ?? []).find(name => name !== who);
      if (plant.stage === 'bloom' && !plant.memorial && plant.id !== 'tree' && memory.online && who && other) {
        const give = el('button', 'r3m-give', `剪一束送给 ${other}`); give.type = 'button';
        give.addEventListener('click', () => {
          const form = el('form', 'r3m-form'), words = el('input'); Object.assign(words, { type: 'text', placeholder: `想对 ${other} 说的话（可以不写）` }); words.setAttribute('aria-label', '附一句话');
          const send = el('button', 'r3m-save', '送出去'); send.type = 'submit'; form.append(words, send); give.replaceWith(form); words.focus();
          form.addEventListener('submit', async e => { e.preventDefault(); send.disabled = true; try { await memory.change(state => cut(state, plant.id, who, other, words.value.trim()) ?? state); onWater?.('cut'); form.replaceWith(el('p', 'r3m-note', `放进屋里的花瓶了，${other} 下次来会看到。`)); } catch { send.disabled = false; } });
        });
        body.append(give);
      }
      panel.append(x, head, body); show(panel, done); x.focus({ preventScroll: true });
    },
    // 花园木牌：等级和经验、心意、种子、下一样解锁的东西；有种子有空坑时可以种一株。
    showGarden(done) {
      const panel = el('section', 'r3-panel is-plant'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', '花园');
      const head = el('h2'), body = el('div', 'r3m-body'), x = closer('关上');
      const render = () => {
        const data = memory.data, p = progressOf(data), who = memory.me;
        head.textContent = `花园 · ${p.level} 级`; body.replaceChildren();
        const bar = el('div', 'r3m-xp'), fill = el('i'); fill.style.width = `${Math.min(100, (p.xp - p.from) / (p.to - p.from) * 100).toFixed(1)}%`; bar.append(fill);
        body.append(bar, el('p', 'r3m-plant', `${p.xp - p.from} / ${p.to - p.from}  ·  ${p.next ? `下一级：${p.next[3]}` : '全部解锁了'}`));
        const stats = el('div', 'r3m-stats');
        for (const [n, label] of [[p.heart, '心意'], [p.seeds, '种子'], [p.free, '空坑']]) { const cell = el('div'); cell.append(el('b', '', String(n)), el('span', '', label)); stats.append(cell); }
        body.append(stats);
        if (!memory.online || !who) { body.append(el('p', 'r3m-offline', memory.online ? '先在门垫那里说一下你是谁。' : '现在连不上小屋，种花要等一会儿。')); return; }
        if (p.seeds < 1 || p.free < 1) { body.append(el('p', 'r3m-note', p.seeds < 1 ? '种子用完了。浇水攒心意、升级，都会得到新的种子。' : '花圃种满了。升级会解锁新的花圃。')); return; }
        const start = el('button', 'r3m-give', '种一株'); start.type = 'button'; body.append(start);
        start.addEventListener('click', () => {
          const form = el('form', 'r3m-form'), chips = el('div', 'r3m-chips'), words = el('input'); let chosen = '';
          for (const key of speciesFor(p.level)) { const chip = el('button', 'r3m-chip', SPECIES[key]); chip.type = 'button'; const dot = el('i'); dot.style.background = bloomColor(key, key); chip.prepend(dot); chip.addEventListener('click', () => { chosen = key; chips.querySelectorAll('.r3m-chip').forEach(c => c.classList.toggle('is-on', c === chip)); }); chips.append(chip); }
          Object.assign(words, { type: 'text', placeholder: '种下这株时想说的话', required: true }); words.setAttribute('aria-label', '想说的话');
          const sowIt = el('button', 'r3m-save', '种下'), note = el('span', 'r3m-form-note'), row = el('div', 'r3m-form-row'); sowIt.type = 'submit'; row.append(sowIt, note);
          form.append(chips, words, row); start.replaceWith(form); chips.querySelector('button').click(); words.focus();
          form.addEventListener('submit', async e => {
            e.preventDefault(); sowIt.disabled = true;
            try { await memory.change(state => sow(state, { species: chosen, title: words.value.trim() }, who) ?? state); render(); body.prepend(el('p', 'r3m-note', '种下了。去花圃里看看它吧。')); }
            catch { note.textContent = '没种上，再试一次'; sowIt.disabled = false; }
          });
        });
      };
      render(); panel.append(x, head, body); show(panel, done); x.focus({ preventScroll: true });
    },
    // 角落里的一张小纸条：升级了、有人送花了……几秒后自己消失。action：{ label, run } 一个按钮。
    notice(text, action) {
      host.querySelector('.r3-notice')?.remove();
      const card = el('div', 'r3-notice'); card.setAttribute('role', 'status'); card.append(el('span', '', text));
      if (action) { const go = el('button', '', action.label); go.type = 'button'; go.addEventListener('click', () => { card.remove(); action.run(); }); card.append(go); }
      host.append(card); requestAnimationFrame(() => card.classList.add('is-on'));
      setTimeout(() => { card.classList.remove('is-on'); setTimeout(() => card.remove(), 400); }, action ? 9000 : 5000);
    },
    // tryPhrase(暗号) → Promise<boolean>。错了：纸条抖一下、清空；对了：关上（done 里接着拉回镜头）。
    askKey(tryPhrase, done) {
      const card = el('form', 'r3-key'); card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-label', '钥匙');
      card.innerHTML = '<svg class="r3-key-icon" viewBox="0 0 40 20" aria-hidden="true"><circle cx="9" cy="10" r="5.5"/><path d="M14.5 10H36M30 10v4.5M34 10v3.5"/></svg>';
      const input = el('input'); Object.assign(input, { type: 'password', autocomplete: 'off', spellcheck: false, enterKeyHint: 'go' }); input.setAttribute('aria-label', '暗号');
      card.append(input, closer('算了'));
      card.addEventListener('submit', async e => {
        e.preventDefault(); if (!input.value.trim() || card.classList.contains('is-busy')) return;
        card.classList.add('is-busy'); const right = await tryPhrase(input.value).catch(error => { console.error('room: 开锁出错', error); return false; }); card.classList.remove('is-busy');
        if (right) { close(); return; }
        input.value = ''; card.classList.remove('is-wrong'); void card.offsetWidth; card.classList.add('is-wrong'); input.focus();
      });
      show(card, done); input.focus({ preventScroll: true });
    },
    askLock(lock, done) {
      const card = el('div', 'r3-key'); card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-label', '锁门');
      const button = el('button', 'r3-key-lock', '把小屋锁上'); button.type = 'button'; button.addEventListener('click', () => { lock(); close(); });
      card.append(button);
      if (memory.me) { const swap = el('button', 'r3-key-lock is-quiet', `我不是 ${memory.me}`); swap.type = 'button'; swap.addEventListener('click', () => { memory.me = ''; close(); }); card.append(swap); }
      card.append(closer('不锁')); show(card, done); button.focus({ preventScroll: true });
    },
    // 我是谁：每台设备选一次。
    askWho(names, done) {
      const card = el('div', 'r3-key r3-who'); card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-label', '我是谁');
      card.append(el('span', 'r3-who-ask', '我是'));
      for (const name of names) { const pick = el('button', 'r3-key-lock', name); pick.type = 'button'; pick.addEventListener('click', () => { memory.me = name; close(); }); card.append(pick); }
      show(card, done); card.querySelector('button').focus({ preventScroll: true });
    },
  };
}
