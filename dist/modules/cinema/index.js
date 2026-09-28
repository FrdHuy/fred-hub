import { parseFilms, filmMeta, starCells, viewFilms, TYPES, ORDERS } from './films.js?v=30';
import { pose } from './flow.js?v=30';

const poster = name => new URL(`./posters/${name}`, import.meta.url).href;
const pad = number => String(number).padStart(2, '0');
const svg = body => `<svg viewBox="0 0 40 32" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
// Hand-drawn line art: a jewel case with a disc slipping out, a loose cross, and two slider strokes.
// A single disc: outer rim, a faint groove, the hub ring and the hole.
const CASE_ICON = svg('<circle cx="20" cy="16" r="12.5"/><path d="M11.6 11.2c1.6-2.9 4.4-4.8 7.6-5.2" opacity=".55"/><circle cx="20" cy="16" r="4.2"/><circle cx="20" cy="16" r="1.4"/>');
const CLOSE_ICON = svg('<path d="M12.2 7.6c5.2 5.3 10.4 11 15.9 16.6"/><path d="M27.4 7.2c-5.6 5.4-10.6 11.2-15.6 17.2"/>');
const SORT_ICON = svg('<path d="M7.2 11.1c8.4-.3 17-.2 25.6.2"/><path d="M7.4 21.2c8.5.2 17 .1 25.4-.3"/><circle cx="15.4" cy="11.2" r="2.6" fill="#0f0d0c"/><circle cx="25.2" cy="21" r="2.6" fill="#0f0d0c"/>');

export function mount({ container, item }) {
  const events = new AbortController(), { signal } = events;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
  const play = (element, frames, options) => motion.matches ? Promise.resolve() : element.animate(frames, options).finished.catch(() => {});
  let films = [], view = [], current = -1, aim = -1, opened = -1, busy = false, frame = 0;
  const choice = { type: '', order: 'added' };

  const hall = document.createElement('section'); hall.className = 'cinema'; hall.lang = 'zh-CN';
  hall.innerHTML = `<div class="cinema-bg" aria-hidden="true"><div class="cinema-ambient"></div><div class="cinema-grain"></div></div>
<h1 class="cinema-sr">观影记录</h1><p class="cinema-tally">${CASE_ICON}<span></span></p>
<div class="cinema-tools"><button class="cinema-sort-toggle" type="button" aria-label="筛选与排序" aria-expanded="false">${SORT_ICON}</button>
<div class="cinema-sort" hidden><div role="group" aria-label="类型" data-key="type"></div><div role="group" aria-label="排序" data-key="order"></div></div></div>
<div class="cinema-rack" role="listbox" aria-orientation="horizontal" aria-label="片单：左右方向键挑选，回车打开"></div>
<div class="cinema-detail" role="region" aria-label="影片详情" hidden><button class="cinema-close" type="button" aria-label="收起详情">${CLOSE_ICON}</button>
<div class="cinema-art"><div class="cinema-flight"><span class="cinema-detail-disc"><i></i></span><span class="cinema-detail-cover"></span></div></div><div class="cinema-info"></div></div>
<p class="cinema-notice" role="status"></p><i class="cinema-probe" style="width:var(--w)"></i><i class="cinema-probe" style="width:var(--slot)"></i><i class="cinema-probe" style="width:var(--d)"></i>
<p class="cinema-credit">Data &amp; posters · <a href="https://www.themoviedb.org/" target="_blank" rel="noopener">TMDB</a>. This product uses the TMDB API but is not endorsed or certified by TMDB.</p>`;
  container.append(hall);
  const $ = selector => hall.querySelector(selector);
  const rack = $('.cinema-rack'), ambient = $('.cinema-ambient'), detail = $('.cinema-detail'), notice = $('.cinema-notice');
  const flight = $('.cinema-flight'), detailCover = $('.cinema-detail-cover'), detailDisc = $('.cinema-detail-disc'), info = $('.cinema-info'), close = $('.cinema-close');
  const sortToggle = $('.cinema-sort-toggle'), sortPanel = $('.cinema-sort');

  function blank() { const disc = document.createElement('span'); disc.className = 'cinema-blank'; disc.innerHTML = '<i></i>'; return disc; }
  function cover(film) {
    if (!film.poster) return blank();
    const image = new Image(); image.alt = ''; image.decoding = 'async'; image.draggable = false; image.src = poster(film.poster);
    image.addEventListener('error', () => image.replaceWith(blank()), { once: true, signal });
    return image;
  }
  // Both side faces carry the printed spine, so cases read well tilting either way.
  function spine(film, index, side) {
    const face = document.createElement('span'); face.className = `cinema-face cinema-spine cinema-spine--${side}`;
    if (film.poster) face.style.setProperty('--poster', `url("${poster(film.poster)}")`); else face.classList.add('is-blank');
    const code = document.createElement('small'); code.textContent = pad(index + 1);
    const title = document.createElement('b'); title.textContent = film.title;
    const year = document.createElement('small'); year.textContent = film.year ?? '';
    face.append(code, title, year); return face;
  }

  function caseFor({ film, index }, position) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'cinema-case';
    button.setAttribute('role', 'option'); button.setAttribute('aria-selected', 'false'); button.tabIndex = -1;
    button.setAttribute('aria-label', [film.title, film.year].filter(Boolean).join('，'));
    button.style.setProperty('--i', Math.min(position, 12));
    const lift = document.createElement('span'); lift.className = 'cinema-lift';
    const box = document.createElement('span'); box.className = 'cinema-box';
    const front = document.createElement('span'); front.className = 'cinema-face cinema-front'; front.append(cover(film));
    const back = document.createElement('span'); back.className = 'cinema-face cinema-back';
    const mirror = document.createElement('span'); mirror.className = 'cinema-face cinema-mirror';
    if (film.poster) mirror.style.setProperty('--poster', `url("${poster(film.poster)}")`);
    box.append(back, spine(film, index, 'left'), spine(film, index, 'right'), front, mirror); lift.append(box); button.append(lift);
    button.addEventListener('click', () => { if (dragged) return; position === current ? openDetail(position) : centre(position); }, { signal });
    return button;
  }

  const size = () => { const [w, slot, d] = [...hall.querySelectorAll('.cinema-probe')].map(probe => probe.offsetWidth); return { w, d, pitch: slot + (parseFloat(getComputedStyle(rack).columnGap) || 0) }; };
  function centre(position, behavior = motion.matches ? 'auto' : 'smooth') {
    aim = position;
    rack.scrollTo({ left: position * size().pitch, behavior });
  }

  // Cover-flow: each case turns by its distance from the middle, recomputed as the rack scrolls.
  function layout() {
    frame = 0;
    const { w, d, pitch } = size(), middle = rack.scrollLeft;
    let nearest = -1, best = Infinity;
    [...rack.children].forEach((element, position) => {
      const offset = (position * pitch - middle) / pitch, distance = Math.abs(offset), { x, z, turn } = pose(offset, w, d);
      if (distance < best) { best = distance; nearest = position; }
      // The case element stays in its scroll slot; only the box moves to its shelf position.
      element.style.setProperty('--x', `${x - offset * pitch}px`);
      element.style.setProperty('--z', `${z}px`);
      element.style.setProperty('--turn', `${turn}deg`);
      element.style.perspectiveOrigin = `calc(50% - ${offset * pitch}px) 50%`;
      element.style.zIndex = String(100 - Math.round(distance * 4));
    });
    if (nearest === aim) aim = -1;
    if (nearest !== current && nearest >= 0) pick(nearest);
  }
  const queue = () => { if (!frame) frame = requestAnimationFrame(layout); };

  let tint = 0;
  function pick(position) {
    current = position;
    [...rack.children].forEach((element, i) => { element.setAttribute('aria-selected', String(i === position)); element.tabIndex = i === position ? 0 : -1; });
    clearTimeout(tint); timers.delete(tint);
    // Ambient colour follows only once scrolling settles, so fast browsing stays calm.
    tint = later(() => { const film = view[position]?.film; ambient.style.backgroundImage = film?.poster ? `url("${poster(film.poster)}")` : 'none'; hall.classList.add('has-pick'); }, 220);
  }

  function fillInfo(film, index) {
    info.replaceChildren();
    const reel = document.createElement('p'); reel.className = 'cinema-reel'; reel.textContent = `No. ${pad(index + 1)}`;
    const title = document.createElement('h2'); title.className = 'cinema-title'; title.setAttribute('aria-label', film.title);
    Array.from(film.title).forEach((char, i) => { const span = document.createElement('span'); span.textContent = char; span.setAttribute('aria-hidden', 'true'); span.style.setProperty('--i', Math.min(i, 14)); title.append(span); });
    info.append(reel, title);
    let step = Math.min(Array.from(film.title).length, 14);
    const line = (className, text) => { const p = document.createElement('p'); p.className = className; p.textContent = text; p.style.setProperty('--i', ++step); info.append(p); };
    if (film.original) line('cinema-original', film.original);
    const meta = filmMeta(film); if (meta) line('cinema-meta', meta);
    if (film.rating !== undefined) {
      const stars = document.createElement('p'); stars.className = 'cinema-stars'; stars.setAttribute('aria-label', `评分 ${film.rating} / 5`);
      starCells(film.rating).forEach(fill => { const star = document.createElement('span'); star.setAttribute('aria-hidden', 'true'); star.textContent = '★'; star.style.setProperty('--fill', `${fill * 100}%`); star.style.setProperty('--i', ++step); stars.append(star); });
      info.append(stars);
    }
  }

  const flip = (from, to) => `translate(${from.left - to.left}px,${from.top - to.top}px) scale(${from.width / to.width})`;
  const slide = () => `translateX(${detailDisc.offsetWidth * .5}px)`;
  const settle = () => detail.getAnimations({ subtree: true }).forEach(animation => { if (animation instanceof CSSAnimation) return; animation.cancel(); });

  // Cover and disc travel together; the disc only slides out once the cover has landed.
  async function openDetail(position) {
    if (busy) return; busy = true; opened = position;
    const { film, index } = view[position], front = rack.children[position].querySelector('.cinema-front');
    detailCover.replaceChildren(cover(film)); fillInfo(film, index);
    detail.hidden = false; detail.classList.add('is-rolling', 'is-playing');
    const from = front.getBoundingClientRect(), to = flight.getBoundingClientRect();
    front.style.visibility = 'hidden'; close.focus({ preventScroll: true });
    await Promise.all([
      play(detail, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' }),
      play(flight, [{ transform: flip(from, to) }, { transform: 'none' }], { duration: 680, easing: 'cubic-bezier(.22,.75,.2,1)' }),
      play(detailDisc, [{ transform: 'none' }, { transform: 'none', offset: .45 }, { transform: slide() }], { duration: 1150, easing: 'cubic-bezier(.3,.7,.2,1)' }),
    ]);
    if (signal.aborted) return;
    detail.classList.add('is-out'); busy = false;
  }
  async function closeDetail() {
    if (busy || opened < 0) return; busy = true;
    const position = opened, front = rack.children[position].querySelector('.cinema-front');
    // Pause the spin where it is (no snap back to 0°), tuck the disc in, then fly home.
    detail.classList.remove('is-playing', 'is-rolling');
    await Promise.all([
      play(info, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }),
      play(detailDisc, [{ transform: slide() }, { transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }),
    ]);
    if (signal.aborted) return;
    detail.classList.remove('is-out');
    const to = front.getBoundingClientRect(), from = flight.getBoundingClientRect();
    await Promise.all([
      play(flight, [{ transform: 'none' }, { transform: flip(to, from) }], { duration: 520, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' }),
      play(detail, [{ opacity: 1 }, { opacity: 1, offset: .55 }, { opacity: 0 }], { duration: 520, fill: 'forwards' }),
    ]);
    if (signal.aborted) return;
    front.style.visibility = ''; detail.hidden = true; settle();
    opened = -1; busy = false; rack.children[position].focus({ preventScroll: true });
  }

  close.addEventListener('click', closeDetail, { signal });
  detail.addEventListener('click', e => { if (e.target === detail) closeDetail(); }, { signal });
  // Esc closes the innermost layer first; main.js only sees it when nothing is open.
  hall.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (opened >= 0) { e.stopPropagation(); closeDetail(); }
    else if (!sortPanel.hidden) { e.stopPropagation(); toggleSort(false); sortToggle.focus(); }
  }, { signal });
  rack.addEventListener('keydown', e => {
    // Consecutive presses add up even while the previous scroll is still travelling.
    const from = aim >= 0 ? aim : current, target = { ArrowLeft: from - 1, ArrowRight: from + 1, Home: 0, End: view.length - 1 }[e.key];
    if (target === undefined) return;
    e.preventDefault(); const next = Math.max(0, Math.min(view.length - 1, target));
    centre(next); rack.children[next]?.focus({ preventScroll: true });
  }, { signal });
  rack.addEventListener('scroll', queue, { passive: true, signal });
  addEventListener('resize', queue, { signal });

  // Vertical wheel and mouse drag also browse sideways; snapping settles on the nearest case.
  rack.addEventListener('wheel', e => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    e.preventDefault(); aim = -1; rack.scrollBy({ left: e.deltaY, behavior: 'auto' });
  }, { passive: false, signal });
  let drag = null, dragged = false;
  rack.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button !== 0) return; drag = { x: e.clientX, left: rack.scrollLeft }; dragged = false; aim = -1; }, { signal });
  addEventListener('pointermove', e => {
    if (!drag) return;
    if (!dragged && Math.abs(e.clientX - drag.x) > 5) { dragged = true; rack.classList.add('is-dragging'); }
    if (dragged) rack.scrollLeft = drag.left - (e.clientX - drag.x);
  }, { signal });
  addEventListener('pointerup', () => {
    if (!drag) return; drag = null;
    if (dragged) { rack.classList.remove('is-dragging'); centre(current); }
    later(() => { dragged = false; }, 0);
  }, { signal });

  // Filter / sort: one line-art toggle, two quiet rows of words.
  function options(group, entries) {
    group.replaceChildren(...entries.map(([value, label]) => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.dataset.value = value;
      button.setAttribute('aria-pressed', String(choice[group.dataset.key] === value)); return button;
    }));
  }
  function toggleSort(open = sortPanel.hidden) {
    sortPanel.hidden = !open; sortToggle.setAttribute('aria-expanded', String(open));
    if (open) play(sortPanel, [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'ease-out' });
  }
  sortToggle.addEventListener('click', () => toggleSort(), { signal });
  sortPanel.addEventListener('click', e => {
    const button = e.target.closest('button[data-value]'); if (!button) return;
    const key = button.parentElement.dataset.key; choice[key] = button.dataset.value;
    button.parentElement.querySelectorAll('button').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    sortToggle.classList.toggle('is-active', choice.type !== '' || choice.order !== 'added');
    arrange();
  }, { signal });
  document.addEventListener('pointerdown', e => { if (!sortPanel.hidden && !e.target.closest('.cinema-tools')) toggleSort(false); }, { signal });

  function arrange() {
    view = viewFilms(films, choice); current = -1; aim = -1;
    $('.cinema-tally span').textContent = view.length;
    $('.cinema-tally').setAttribute('aria-label', `共 ${view.length} 部`);
    rack.replaceChildren(...view.map(caseFor));
    rack.scrollLeft = 0; layout();
  }

  function render(data) {
    const parsed = parseFilms(data); films = parsed.films;
    if (parsed.errors.length) notice.textContent = `有 ${parsed.errors.length} 条没显示：${parsed.errors.join('；')}。运行 node scripts/check-cinema.mjs 查看详情。`;
    options($('[data-key=type]'), [['', '全部'], ...TYPES.map(type => [type, type])]);
    options($('[data-key=order]'), Object.entries(ORDERS));
    if (!films.length) {
      hall.classList.add('is-empty'); $('.cinema-tools').hidden = true; $('.cinema-tally span').textContent = 0;
      const empty = document.createElement('p'); empty.className = 'cinema-empty'; empty.textContent = item.emptyTitle;
      rack.replaceWith(empty); return;
    }
    arrange();
  }

  // A fresh URL each visit so edits to data.js show after a normal refresh.
  import(`./data.js?t=${Date.now()}`).then(module => { if (!signal.aborted) render(module.default); }, error => {
    if (signal.aborted) return;
    notice.textContent = `data.js 读取失败（多半是少了逗号、引号或括号）。运行 node scripts/check-cinema.mjs 查看出错位置。${error.message ? ` ${error.message}` : ''}`;
    render([]);
  });

  return () => {
    events.abort(); cancelAnimationFrame(frame);
    timers.forEach(clearTimeout); timers.clear();
    hall.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
  };
}
